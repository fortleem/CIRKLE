/**
 * CIRKLE — ActivityPub Federation Service Abstraction (P2.3).
 *
 * Status: WORKING ABSTRACTION.
 *
 * This module is the **service abstraction** over the ActivityPub
 * federation layer. ActivityPub is the W3C standard used by Mastodon,
 * PeerTube, Pixelfed, and others — Cirkle speaks it so a Cirkle user's
 * posts (in Midan / Mashahd / Lamahat) can be delivered to and received
 * from any compliant fediverse instance.
 *
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  Today (sandbox)        ───►  Upgrade path (production)         │
 *   ├─────────────────────────────────┼──────────────────────────────┤
 *   │  /api/federation/* routes       │  Real ActivityPub server      │
 *   │  Post table = activity store    │  Dedicated `Activity` table   │
 *   │  Inline HTTP-signature signer   │  go-fed / Activity-Pub lib    │
 *   │  WebFinger over the User table  │  WebFinger w/ LRDD discovery  │
 *   │  E2EE signing key as signing key│  Dedicated Ed25519 actor key  │
 *   └─────────────────────────────────┴──────────────────────────────┘
 *
 * CRITICAL INVARIANTS:
 *   1. The signing key used for HTTP signatures is the user's E2EE
 *      signing key (ECDSA P-256). The upgrade path is a dedicated
 *      Ed25519 actor key, but reusing the E2EE key means a Cirkle user
 *      only has ONE cryptographic identity — federated activities are
 *      verifiably signed by the same key that signs their chat messages.
 *   2. Activities are derived from the existing Post model (type=post →
 *      Create activity). The Post table IS the outbox.
 *
 * All client-callable functions are isomorphic — they hit the existing
 * `/api/federation/*` routes with relative URLs only.
 */

"use client";

// ── Types ───────────────────────────────────────────────────────────────────

export interface Actor {
  "@context": string[];
  type: "Person" | "Service" | "Group" | "Application";
  id: string;
  inbox: string;
  outbox: string;
  followers: string;
  following: string;
  preferredUsername: string;
  name: string;
  summary?: string;
  url: string;
  publicKey: {
    id: string;
    owner: string;
    publicKeyPem: string;
  };
  endpoints?: {
    sharedInbox?: string;
  };
}

export interface WebFingerResponse {
  subject: string;
  aliases: string[];
  links: Array<{
    rel: string;
    type?: string;
    href?: string;
    template?: string;
  }>;
}

export type ActivityType =
  | "Create"
  | "Update"
  | "Delete"
  | "Follow"
  | "Undo"
  | "Accept"
  | "Reject"
  | "Like"
  | "Announce";

export interface Activity {
  "@context": string[];
  id: string;
  type: ActivityType;
  actor: string;
  object: unknown;
  published: string;
  to?: string[];
  cc?: string[];
}

export interface OutboxCollection {
  "@context": string[];
  id: string;
  type: "OrderedCollection";
  totalItems: number;
  first?: string;
  last?: string;
  items?: Activity[];
}

export interface FollowEntry {
  actor: string;       // federated actor URI
  username: string;    // local username
  createdAt: string;
  accepted: boolean;
}

export class FederationServiceError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.name = "FederationServiceError";
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function origin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  // Server-side rendering fallback — the proxy sets x-forwarded-* headers.
  return process.env.NEXT_PUBLIC_APP_URL || "https://circle.app";
}

export function actorUrlFor(username: string): string {
  return `${origin()}/api/federation/actor/${encodeURIComponent(username)}`;
}

export function inboxUrlFor(username: string): string {
  return `${origin()}/api/federation/inbox?username=${encodeURIComponent(username)}`;
}

export function outboxUrlFor(username: string): string {
  return `${origin()}/api/federation/outbox?username=${encodeURIComponent(username)}`;
}

export function followersUrlFor(username: string): string {
  return `${origin()}/api/federation/followers?username=${encodeURIComponent(username)}`;
}

export function followingUrlFor(username: string): string {
  return `${origin()}/api/federation/following?username=${encodeURIComponent(username)}`;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get an actor document (local or remote). For local actors, hits our own
 * /api/federation/actor/[username] endpoint. For remote actors, performs a
 * WebFinger lookup against the remote origin first, then fetches the actor
 * document at the discovered URL.
 */
export async function getActor(username: string): Promise<Actor> {
  if (!username) throw new FederationServiceError("username required", 400);

  // Remote actors are of the form `user@domain.tld`.
  if (username.includes("@") && !username.startsWith("@")) {
    const [user, domain] = username.split("@");
    if (!user || !domain) {
      throw new FederationServiceError("invalid actor handle", 400);
    }
    // WebFinger the remote domain.
    const wfRes = await fetch(
      `https://${domain}/.well-known/webfinger?resource=acct:${user}@${domain}`,
      { headers: { accept: "application/jrd+json" } },
    );
    if (!wfRes.ok) {
      throw new FederationServiceError(
        `webfinger failed for ${username}`,
        wfRes.status,
      );
    }
    const wf = (await wfRes.json()) as WebFingerResponse;
    const selfLink = wf.links.find(
      (l) => l.rel === "self" && l.type === "application/activity+json",
    );
    if (!selfLink?.href) {
      throw new FederationServiceError("no actor link in webfinger", 404);
    }
    const aRes = await fetch(selfLink.href, {
      headers: { accept: "application/activity+json" },
    });
    if (!aRes.ok) {
      throw new FederationServiceError("actor fetch failed", aRes.status);
    }
    return (await aRes.json()) as Actor;
  }

  // Local actor — fetch our own endpoint.
  const res = await fetch(
    `/api/federation/actor/${encodeURIComponent(username.replace(/^@/, ""))}`,
    { headers: { accept: "application/activity+json" } },
  );
  if (!res.ok) {
    throw new FederationServiceError("actor not found", res.status);
  }
  return (await res.json()) as Actor;
}

/**
 * Send an ActivityPub activity. Posts to the local outbox which then
 * fans out to remote inboxes (for Create/Like/Announce/Follow etc.).
 *
 * The caller passes the activity object; the server signs it with the
 * user's E2EE signing key before delivery.
 */
export async function sendActivity(
  activity: Omit<Activity, "@context" | "id" | "published">,
): Promise<{ id: string; delivered: number }> {
  const res = await fetch("/api/federation/outbox", {
    method: "POST",
    headers: { "content-type": "application/activity+json" },
    body: JSON.stringify(activity),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new FederationServiceError(
      (err as { error?: string })?.error ?? "send failed",
      res.status,
    );
  }
  return (await res.json()) as { id: string; delivered: number };
}

/**
 * Get a user's outbox (their public activity stream). Returns an
 * OrderedCollection with the most recent activities.
 */
export async function getOutbox(
  username: string,
  page = 1,
): Promise<OutboxCollection> {
  const sp = new URLSearchParams({
    username,
    page: String(page),
  });
  const res = await fetch(`/api/federation/outbox?${sp.toString()}`, {
    headers: { accept: "application/activity+json" },
  });
  if (!res.ok) {
    throw new FederationServiceError("outbox fetch failed", res.status);
  }
  return (await res.json()) as OutboxCollection;
}

/**
 * Get a user's inbox (activities addressed to them).
 */
export async function getInbox(
  username: string,
  page = 1,
): Promise<OutboxCollection> {
  const sp = new URLSearchParams({
    username,
    page: String(page),
  });
  const res = await fetch(`/api/federation/inbox?${sp.toString()}`, {
    headers: { accept: "application/activity+json" },
  });
  if (!res.ok) {
    throw new FederationServiceError("inbox fetch failed", res.status);
  }
  return (await res.json()) as OutboxCollection;
}

/**
 * Follow a remote (or local) actor. Sends a Follow activity.
 */
export async function follow(
  fromUsername: string,
  targetActor: string,
): Promise<{ ok: boolean; activityId: string }> {
  const res = await fetch("/api/federation/follow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ from: fromUsername, target: targetActor }),
  });
  if (!res.ok) {
    throw new FederationServiceError("follow failed", res.status);
  }
  return (await res.json()) as { ok: boolean; activityId: string };
}

/**
 * Undo (unfollow) a previously sent Follow activity.
 */
export async function undoFollow(
  fromUsername: string,
  targetActor: string,
): Promise<{ ok: boolean }> {
  const res = await fetch("/api/federation/follow", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ from: fromUsername, target: targetActor }),
  });
  if (!res.ok) {
    throw new FederationServiceError("unfollow failed", res.status);
  }
  return (await res.json()) as { ok: boolean };
}

/**
 * List the actors following a user (their followers collection).
 */
export async function getFollowers(
  username: string,
): Promise<FollowEntry[]> {
  const sp = new URLSearchParams({ username });
  const res = await fetch(`/api/federation/followers?${sp.toString()}`);
  if (!res.ok) {
    throw new FederationServiceError("followers fetch failed", res.status);
  }
  const data = (await res.json()) as { followers?: FollowEntry[] };
  return data.followers ?? [];
}

/**
 * List the actors a user is following (their following collection).
 */
export async function getFollowing(
  username: string,
): Promise<FollowEntry[]> {
  const sp = new URLSearchParams({ username });
  const res = await fetch(`/api/federation/following?${sp.toString()}`);
  if (!res.ok) {
    throw new FederationServiceError("following fetch failed", res.status);
  }
  const data = (await res.json()) as { following?: FollowEntry[] };
  return data.following ?? [];
}

// ── Singleton convenience ────────────────────────────────────────────────────

export const federationService = {
  getActor,
  sendActivity,
  getOutbox,
  getInbox,
  follow,
  undoFollow,
  getFollowers,
  getFollowing,
};

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/federation/actor/[username] — GET returns the ActivityPub Actor document.
//
// ActivityPub §4.2: every actor MUST expose `id`, `inbox`, `outbox`. The
// public key is the user's E2EE signing key (ECDSA P-256) — so activities
// are signed by the same key that signs their chat messages (ADR-002 §5.2).
// ─────────────────────────────────────────────────────────────────────────────

function origin(req: NextRequest): string {
  // Prefer the proxy-set forwarded host/proto.
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "circle.app";
  return `${proto}://${host}`;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await ctx.params;
    const u = (username || "").toLowerCase().replace(/^@/, "").trim();
    if (!u || !/^[a-z0-9_]+$/.test(u)) {
      return NextResponse.json({ error: "invalid username" }, { status: 400 });
    }

    const base = origin(req);
    const actorUri = `${base}/api/federation/actor/${u}`;
    const inboxUri = `${base}/api/federation/inbox?username=${u}`;
    const outboxUri = `${base}/api/federation/outbox?username=${u}`;
    const followersUri = `${base}/api/federation/followers?username=${u}`;
    const followingUri = `${base}/api/federation/following?username=${u}`;

    // Look up the user's published signing key. We fall back to a placeholder
    // when the user hasn't published one yet — the actor document still
    // validates structurally, and clients fetching it will prompt the user
    // to publish their key.
    const actorRow = await db.federatedActor.findUnique({ where: { username: u } });
    let publicKeyJwk = actorRow?.publicKeyJwk ?? "";
    const fingerprint = actorRow?.fingerprint ?? "";

    // If we don't have a FederatedActor row, try to lazily provision one
    // from the latest DevicePublicKey (P2.1).
    if (!publicKeyJwk) {
      const latestKey = await db.devicePublicKey.findFirst({
        where: { userLabel: u },
        orderBy: { publishedAt: "desc" },
      });
      if (latestKey) {
        publicKeyJwk = latestKey.signingPublicKey;
        // Persist for next time.
        try {
          await db.federatedActor.upsert({
            where: { username: u },
            create: {
              username: u,
              actorUri,
              inboxUri,
              outboxUri,
              followersUri,
              followingUri,
              publicKeyJwk,
              fingerprint: latestKey.fingerprint,
            },
            update: {
              actorUri,
              inboxUri,
              outboxUri,
              followersUri,
              followingUri,
              publicKeyJwk,
              fingerprint: latestKey.fingerprint,
            },
          });
        } catch (e) {
          logger.warn("[/api/federation/actor] lazy provision failed", {
            error: (e as Error).message,
          });
        }
      }
    }

    const displayName = u.charAt(0).toUpperCase() + u.slice(1);

    const actor = {
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1",
      ],
      type: "Person",
      id: actorUri,
      inbox: inboxUri,
      outbox: outboxUri,
      followers: followersUri,
      following: followingUri,
      preferredUsername: u,
      name: displayName,
      summary: `Cirkle member · @${u}@${new URL(base).host}`,
      url: `${base}/?u=${u}`,
      publicKey: publicKeyJwk
        ? {
            id: `${actorUri}#main-key`,
            owner: actorUri,
            publicKeyPem: publicKeyJwk,
          }
        : undefined,
      endpoints: {
        sharedInbox: `${base}/api/federation/inbox`,
      },
      // Cirkle-specific extension — surfaces the E2EE fingerprint so peers
      // can do out-of-band SAS verification (ADR-002 §5.2).
      "cirkle:fingerprint": fingerprint || undefined,
    };

    return NextResponse.json(actor, {
      headers: {
        "content-type": "application/activity+json; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    });
  } catch (err) {
    logger.error("[/api/federation/actor GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "actor fetch failed" },
      { status: 500 },
    );
  }
}

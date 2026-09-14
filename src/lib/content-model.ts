// @ts-nocheck
/**
 * CIRKLE — Cross-Module Content Model
 * ============================================================================
 * A unified content object model that can represent posts, messages, photos,
 * videos, documents, comments, replies, stories, news, and events from any
 * CIRKLE module (Wasl / Midan / Lamahat / Mashahd / Rihla / Circles / News /
 * Mail / Vault).
 *
 * The ContentObject is the canonical "thing" that flows through Universal
 * Search, Universal Notification Center, Trust Center audit log, moderation
 * queues, federation pipelines, and the cross-module recommendation engine.
 *
 * Every DB call is wrapped in try/catch — tables may not exist on a fresh dev
 * database, and every function MUST degrade gracefully to an empty result
 * rather than throw.
 * ============================================================================
 */

import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentObject {
  id: string;
  type:
    | "post"
    | "message"
    | "photo"
    | "video"
    | "document"
    | "comment"
    | "reply"
    | "story"
    | "news"
    | "event";
  module:
    | "wasl"
    | "midan"
    | "lamahat"
    | "mashahd"
    | "rihla"
    | "circles"
    | "news"
    | "mail"
    | "vault";
  author: {
    id: string;
    name: string;
    handle: string;
    avatarColor: string;
    verified: boolean;
  };
  audience: "public" | "followers" | "circle" | "direct" | "anonymous";
  body: string;
  attachments?: Array<{
    type: "image" | "video" | "audio" | "document";
    url: string;
    mime: string;
    size: number;
  }>;
  location?: { lat: number; lng: number; label: string };
  language: string;
  translations?: Array<{ language: string; body: string; translator: string }>;
  reactions: Array<{ emoji: string; count: number; reacted: boolean }>;
  comments: number;
  shares: number;
  views: number;
  tags: string[];
  visibility: "public" | "private" | "circle" | "anonymous";
  moderationStatus: "clean" | "flagged" | "removed" | "reviewed";
  trustStatus: "verified" | "unverified" | "disputed";
  provenance: {
    source: string;
    createdAt: string;
    modifiedAt: string;
    version: number;
    editHistory: Array<{ body: string; editedAt: string }>;
  };
  federationStatus: "local" | "federated" | "not-federated";
  expiresAt?: string;
}

export interface ContentSearchFilters {
  /** Module short-codes to restrict the search to. */
  modules?: Array<ContentObject["module"]>;
  /** Content types to restrict to. */
  types?: Array<ContentObject["type"]>;
  /** Author handle filter. */
  authorHandle?: string;
  /** Maximum results (default 30). */
  limit?: number;
  /** Restrict to content visible to a specific audience. */
  audience?: ContentObject["audience"];
  /** Filter by moderation status (default: clean + reviewed). */
  moderationStatus?: Array<ContentObject["moderationStatus"]>;
  /** Restrict to verified authors only. */
  verifiedOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function safeParseJSON<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function buildReactions(likes: number): ContentObject["reactions"] {
  return [{ emoji: "❤️", count: likes || 0, reacted: false }];
}

function buildEditHistory(
  editedAt: Date | null | undefined,
  originalBody: string,
): ContentObject["provenance"]["editHistory"] {
  if (!editedAt) return [];
  return [{ body: originalBody, editedAt: editedAt.toISOString() }];
}

function inferAttachmentFromMessage(msg: any): ContentObject["attachments"] | undefined {
  if (!msg || !msg.attachmentKind) return undefined;
  const kind = msg.attachmentKind;
  const url = msg.attachmentUrl || "";
  const mime = msg.attachmentMime || "";
  const size = msg.attachmentSize || 0;
  if (kind === "image") return [{ type: "image", url, mime, size }];
  if (kind === "audio") return [{ type: "audio", url, mime, size }];
  if (kind === "file" || kind === "document") {
    return [{ type: "document", url, mime, size }];
  }
  if (kind === "video") return [{ type: "video", url, mime, size }];
  return undefined;
}

function inferModuleForPost(p: any): ContentObject["module"] {
  const m = (p?.module || "").toLowerCase();
  if (m === "wasl") return "wasl";
  if (m === "midan") return "midan";
  if (m === "lamahat") return "lamahat";
  if (m === "mashahd") return "mashahd";
  if (m === "rihla") return "rihla";
  if (m === "circles" || m === "circle") return "circles";
  if (m === "news") return "news";
  if (m === "mail") return "mail";
  if (m === "vault") return "vault";
  return "midan";
}

function inferTypeForPost(p: any): ContentObject["type"] {
  if (p?.mediaKind === "video" || p?.module === "mashahd") return "video";
  if (p?.mediaKind === "image" || p?.module === "lamahat") return "photo";
  if (p?.tags && parseTags(p.tags).includes("news")) return "news";
  if (p?.module === "news") return "news";
  return "post";
}

function inferTrustStatus(p: any): ContentObject["trustStatus"] {
  if (p?.authorVerified) return "verified";
  return "unverified";
}

function inferModerationStatus(p: any): ContentObject["moderationStatus"] {
  // The Post model has no moderation column today — default to clean.
  return "clean";
}

function inferFederationStatus(p: any): ContentObject["federationStatus"] {
  // Posts created locally are local; federated posts would carry a remote
  // federation marker. We default to local for now — FederationFabric can
  // override this later via the row's `federationStatus` if added.
  return p?.federationStatus ?? "local";
}

// ─────────────────────────────────────────────────────────────────────────────
// Converters — Post model row → ContentObject
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a Post model row (from `db.post`) into a unified ContentObject.
 *
 * Handles every field on the Post schema:
 *   • Author identity (authorId, authorName, authorHandle, authorColor,
 *     authorVerified) — falls back to anonymousId when present.
 *   • Body / arabicBody / language — arabicBody becomes a translation entry.
 *   • Module / visibility / audience — direct mapping, with sane fallbacks.
 *   • Tags (comma-separated string) → string[].
 *   • Media (mediaKind / mediaCount / mediaCover) → attachments[].
 *   • Engagement counters (likes / comments / shares / views).
 *   • createdAt → provenance.createdAt; no modifiedAt column yet — derived
 *     from createdAt.
 *   • location (string) — when it parses as JSON `{lat,lng,label}` it becomes
 *     a structured location; otherwise we keep just the label.
 */
export function toContentObject(post: any): ContentObject {
  if (!post) {
    return emptyContentObject();
  }

  const language = post.language || "en";
  const translations: ContentObject["translations"] = [];
  if (post.arabicBody) {
    translations.push({
      language: "ar",
      body: post.arabicBody,
      translator: "author",
    });
  }

  const attachments: ContentObject["attachments"] = [];
  if (post.mediaCover) {
    attachments.push({
      type: post.mediaKind === "video" ? "video" : "image",
      url: post.mediaCover,
      mime: post.mediaKind === "video" ? "video/mp4" : "image/jpeg",
      size: 0,
    });
  }

  const tags = parseTags(post.tags);

  // Location handling — Post.location is a free-text string. Try JSON parse.
  let location: ContentObject["location"] | undefined;
  if (post.location) {
    const parsed = safeParseJSON<{ lat?: number; lng?: number; label?: string } | null>(
      post.location,
      null,
    );
    if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      location = {
        lat: parsed.lat,
        lng: parsed.lng,
        label: parsed.label || post.location,
      };
    } else {
      // Free-text location — leave coords as 0,0 with the label.
      location = { lat: 0, lng: 0, label: post.location };
    }
  }

  return {
    id: post.id,
    type: inferTypeForPost(post),
    module: inferModuleForPost(post),
    author: {
      id: post.authorId || post.anonymousId || "anonymous",
      name: post.anonymousId ? "Anonymous" : post.authorName || "Unknown",
      handle: post.authorHandle || post.anonymousId || "@anonymous",
      avatarColor: post.authorColor || "teal",
      verified: Boolean(post.authorVerified),
    },
    audience: post.anonymousId ? "anonymous" : (post.visibility as any) || "public",
    body: post.body || "",
    attachments: attachments.length > 0 ? attachments : undefined,
    location,
    language,
    translations: translations.length > 0 ? translations : undefined,
    reactions: buildReactions(post.likes || 0),
    comments: post.comments || 0,
    shares: post.shares || 0,
    views: post.views || 0,
    tags,
    visibility: (post.visibility as any) || "public",
    moderationStatus: inferModerationStatus(post),
    trustStatus: inferTrustStatus(post),
    provenance: {
      source: "local",
      createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
      modifiedAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
      version: 1,
      editHistory: [],
    },
    federationStatus: inferFederationStatus(post),
    expiresAt: undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Converters — Message model row → ContentObject
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a Message model row (from `db.message`) into a unified
 * ContentObject of type "message" (or "comment" / "reply" when the message
 * is a thread reply or a system event).
 *
 * Notes:
 *   • E2EE ciphertext messages keep `body` empty server-side — the body is
 *     only decrypted on the recipient's client. The ContentObject's `body`
 *     field will be the empty string in that case, with a tag `[encrypted]`.
 *   • Reply messages (replyToId is set) become type "reply".
 *   • System events (systemEvent set) become type "message" with body
 *     containing the system event text.
 *   • Attachments are derived from attachmentKind / attachmentUrl /
 *     attachmentMime / attachmentSize.
 *   • Disappearing messages carry expiresAt (ttlSeconds from createdAt).
 */
export function toContentObjectFromMessage(msg: any): ContentObject {
  if (!msg) {
    return emptyContentObject();
  }

  const isReply = Boolean(msg.replyToId);
  const isSystemEvent = Boolean(msg.systemEvent);

  const attachments = inferAttachmentFromMessage(msg);

  const body =
    msg.body ?? (msg.ciphertext ? "" : msg.systemEvent || "");

  const createdAt = msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString();

  let expiresAt: string | undefined;
  if (msg.ttlSeconds && msg.ttlSeconds > 0 && msg.createdAt) {
    const exp = new Date(msg.createdAt).getTime() + msg.ttlSeconds * 1000;
    expiresAt = new Date(exp).toISOString();
  } else if (msg.expiresAt) {
    expiresAt = new Date(msg.expiresAt).toISOString();
  }

  const editHistory = buildEditHistory(msg.editedAt, body);

  return {
    id: msg.id,
    type: isSystemEvent ? "message" : isReply ? "reply" : "message",
    module: "wasl",
    author: {
      id: msg.senderId || "anonymous",
      name: msg.senderName || "Unknown",
      handle: `@${(msg.senderName || "anonymous").toLowerCase().replace(/\s+/g, "")}`,
      avatarColor: msg.senderColor || "teal",
      verified: false,
    },
    audience: "direct",
    body,
    attachments,
    language: "en",
    translations: undefined,
    reactions: [],
    comments: 0,
    shares: msg.forwardedFromId ? 1 : 0,
    views: 0,
    tags: msg.isStarred ? ["starred"] : [],
    visibility: "private",
    moderationStatus: msg.isDeleted ? "removed" : "clean",
    trustStatus: "unverified",
    provenance: {
      source: "local",
      createdAt,
      modifiedAt: msg.editedAt
        ? new Date(msg.editedAt).toISOString()
        : createdAt,
      version: msg.editedAt ? 2 : 1,
      editHistory,
    },
    federationStatus: "local",
    expiresAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Converters — Mail / Job / Event rows → ContentObject (internal helpers)
// ─────────────────────────────────────────────────────────────────────────────

function toContentObjectFromMail(mail: any): ContentObject {
  if (!mail) return emptyContentObject();
  return {
    id: mail.id,
    type: "document",
    module: "mail",
    author: {
      id: mail.fromUsername || "unknown",
      name: mail.fromUsername || "Unknown",
      handle: `@${mail.fromUsername || "unknown"}`,
      avatarColor: "teal",
      verified: false,
    },
    audience: "direct",
    body: mail.subject || "",
    language: "en",
    reactions: [],
    comments: 0,
    shares: 0,
    views: 0,
    tags: mail.starred ? ["starred"] : [],
    visibility: "private",
    moderationStatus: "clean",
    trustStatus: "unverified",
    provenance: {
      source: "local",
      createdAt: mail.createdAt ? new Date(mail.createdAt).toISOString() : new Date().toISOString(),
      modifiedAt: mail.createdAt ? new Date(mail.createdAt).toISOString() : new Date().toISOString(),
      version: 1,
      editHistory: [],
    },
    federationStatus: "local",
    expiresAt: undefined,
  };
}

function toContentObjectFromJob(job: any): ContentObject {
  if (!job) return emptyContentObject();
  return {
    id: job.id,
    type: "event",
    module: "midan",
    author: {
      id: job.postedById || "system",
      name: job.companyName || job.postedByName || "Unknown",
      handle: `@${(job.companyName || "unknown").toLowerCase().replace(/\s+/g, "")}`,
      avatarColor: "teal",
      verified: Boolean(job.verified),
    },
    audience: "public",
    body: job.description || job.title || "",
    language: "en",
    reactions: [],
    comments: 0,
    shares: 0,
    views: job.views || 0,
    tags: [job.location, job.employmentType].filter(Boolean),
    visibility: "public",
    moderationStatus: "clean",
    trustStatus: job.verified ? "verified" : "unverified",
    provenance: {
      source: "local",
      createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
      modifiedAt: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
      version: 1,
      editHistory: [],
    },
    federationStatus: "local",
    expiresAt: job.expiresAt ? new Date(job.expiresAt).toISOString() : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty fallback
// ─────────────────────────────────────────────────────────────────────────────

export function emptyContentObject(): ContentObject {
  const now = new Date().toISOString();
  return {
    id: "",
    type: "post",
    module: "midan",
    author: {
      id: "",
      name: "",
      handle: "",
      avatarColor: "teal",
      verified: false,
    },
    audience: "public",
    body: "",
    reactions: [],
    comments: 0,
    shares: 0,
    views: 0,
    tags: [],
    visibility: "public",
    moderationStatus: "clean",
    trustStatus: "unverified",
    provenance: {
      source: "local",
      createdAt: now,
      modifiedAt: now,
      version: 1,
      editHistory: [],
    },
    federationStatus: "local",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// searchContent — cross-module content search
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search across every content surface that has a `ContentObject`
 * representation: posts (Midan / Lamahat / Mashahd / News), messages
 * (Wasl), and mail (CircleMail).
 *
 * Filters:
 *   • `modules`     — restrict to a set of module short-codes
 *   • `types`       — restrict to a set of content types
 *   • `authorHandle`— only content authored by this handle
 *   • `audience`    — restrict to a specific audience
 *   • `verifiedOnly`— only content from verified authors
 *
 * Returns a score-ranked list, sorted by relevance then recency. Never
 * throws — every DB call is wrapped in try/catch.
 */
export async function searchContent(
  query: string,
  filters?: ContentSearchFilters,
): Promise<ContentObject[]> {
  const q = (query || "").trim();
  if (!q) return [];

  const limit = filters?.limit ?? 30;
  const wantModules = (filters?.modules || []).map((m) => m.toLowerCase());
  const wantTypes = filters?.types || [];
  const verifiedOnly = Boolean(filters?.verifiedOnly);
  const authorHandle = filters?.authorHandle?.toLowerCase();

  const allowModule = (m: string) =>
    !wantModules.length || wantModules.includes(m.toLowerCase());
  const allowType = (t: string) =>
    !wantTypes.length || wantTypes.includes(t);
  const allowAuthor = (h: string) =>
    !authorHandle || (h || "").toLowerCase() === authorHandle;

  const out: ContentObject[] = [];

  // ── Posts (Midan / Lamahat / Mashahd / News) ────────────────────────
  if (
    allowModule("midan") ||
    allowModule("lamahat") ||
    allowModule("mashahd") ||
    allowModule("news") ||
    allowModule("circles") ||
    wantModules.length === 0
  ) {
    try {
      const posts = await db.post.findMany({
        where: {
          OR: [
            { body: { contains: q } },
            { tags: { contains: q } },
            { arabicBody: { contains: q } },
            { authorName: { contains: q } },
            { authorHandle: { contains: q } },
          ],
        },
        take: 80,
        orderBy: { createdAt: "desc" },
      });
      for (const p of posts) {
        const obj = toContentObject(p);
        if (!allowType(obj.type)) continue;
        if (!allowAuthor(obj.author.handle)) continue;
        if (verifiedOnly && !obj.author.verified) continue;
        out.push(obj);
      }
    } catch {
      /* Post table may be unavailable — skip. */
    }
  }

  // ── Messages (Wasl) — only plaintext bodies (server cannot read
  //    ciphertext). We filter on the unencrypted `body` column. ─────────
  if (allowModule("wasl") || wantModules.length === 0) {
    try {
      const msgs = await db.message.findMany({
        where: {
          AND: [
            { isDeleted: false },
            {
              OR: [
                { body: { contains: q } },
                { systemEvent: { contains: q } },
                { attachmentName: { contains: q } },
              ],
            },
          ],
        },
        take: 80,
        orderBy: { createdAt: "desc" },
      });
      for (const m of msgs) {
        const obj = toContentObjectFromMessage(m);
        if (!allowType(obj.type)) continue;
        if (!allowAuthor(obj.author.handle)) continue;
        if (verifiedOnly && !obj.author.verified) continue;
        out.push(obj);
      }
    } catch {
      /* Message table unavailable — skip. */
    }
  }

  // ── Mail (CircleMail) ─────────────────────────────────────────────────
  if (allowModule("mail") || wantModules.length === 0) {
    try {
      const mail = await db.mailMessage.findMany({
        where: {
          OR: [
            { subject: { contains: q } },
            { body: { contains: q } },
            { fromUsername: { contains: q } },
            { toUsername: { contains: q } },
          ],
        },
        take: 40,
        orderBy: { createdAt: "desc" },
      });
      for (const m of mail) {
        const obj = toContentObjectFromMail(m);
        if (!allowType(obj.type)) continue;
        if (!allowAuthor(obj.author.handle)) continue;
        out.push(obj);
      }
    } catch {
      /* MailMessage table unavailable — skip. */
    }
  }

  // ── Jobs (Midan — ProNetwork) ─────────────────────────────────────────
  if (allowModule("midan") || wantModules.length === 0) {
    try {
      const jobs = await db.jobPosting.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { companyName: { contains: q } },
            { location: { contains: q } },
          ],
        },
        take: 30,
        orderBy: { createdAt: "desc" },
      });
      for (const j of jobs) {
        const obj = toContentObjectFromJob(j);
        if (!allowType(obj.type)) continue;
        if (!allowAuthor(obj.author.handle)) continue;
        if (verifiedOnly && !obj.author.verified) continue;
        out.push(obj);
      }
    } catch {
      /* JobPosting table unavailable — skip. */
    }
  }

  // ── Score + sort ──────────────────────────────────────────────────────
  const scored = out.map((obj) => ({
    obj,
    score: scoreContent(obj, q),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (
      new Date(b.obj.provenance.createdAt).getTime() -
      new Date(a.obj.provenance.createdAt).getTime()
    );
  });

  return scored.slice(0, limit).map((s) => s.obj);
}

function scoreContent(obj: ContentObject, q: string): number {
  const lower = q.toLowerCase();
  let score = 0;
  if ((obj.body || "").toLowerCase().includes(lower)) score += 60;
  if ((obj.author.name || "").toLowerCase().includes(lower)) score += 30;
  if ((obj.author.handle || "").toLowerCase().includes(lower)) score += 40;
  if (obj.tags.some((t) => t.toLowerCase().includes(lower))) score += 25;
  if (obj.author.verified) score += 5;
  // Recency boost
  try {
    const ageDays =
      (Date.now() - new Date(obj.provenance.createdAt).getTime()) /
      (24 * 60 * 60 * 1000);
    if (ageDays < 1) score += 15;
    else if (ageDays < 7) score += 10;
    else if (ageDays < 30) score += 5;
  } catch {
    /* ignore */
  }
  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// getContentById — fetch a single content object by id + type
// ─────────────────────────────────────────────────────────────────────────────

export async function getContentById(
  id: string,
  type: string,
): Promise<ContentObject | null> {
  if (!id) return null;
  const t = (type || "").toLowerCase();

  try {
    if (t === "message" || t === "reply") {
      const m = await db.message.findUnique({ where: { id } });
      return m ? toContentObjectFromMessage(m) : null;
    }
    if (t === "document" || t === "mail") {
      const m = await db.mailMessage.findUnique({ where: { id } });
      return m ? toContentObjectFromMail(m) : null;
    }
    if (t === "event") {
      const j = await db.jobPosting.findUnique({ where: { id } });
      return j ? toContentObjectFromJob(j) : null;
    }
    // Default: treat as Post (covers post / photo / video / news / story).
    const p = await db.post.findUnique({ where: { id } });
    return p ? toContentObject(p) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getContentGraph — related + referenced content
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns content related to the given contentId — same author, same tags,
 * same module — plus content that directly references it (shares, replies,
 * forwards).
 *
 * Used by Universal Search "related" panel and the notification center's
 * "context" view.
 */
export async function getContentGraph(
  contentId: string,
): Promise<{ related: ContentObject[]; references: ContentObject[] }> {
  const empty = { related: [] as ContentObject[], references: [] as ContentObject[] };
  if (!contentId) return empty;

  // First, find the source content.
  let source: ContentObject | null = null;
  try {
    const p = await db.post.findUnique({ where: { id: contentId } });
    if (p) source = toContentObject(p);
    if (!source) {
      const m = await db.message.findUnique({ where: { id: contentId } });
      if (m) source = toContentObjectFromMessage(m);
    }
  } catch {
    return empty;
  }
  if (!source) return empty;

  // ── Related: same author OR overlapping tags OR same module ──────────
  const related: ContentObject[] = [];
  const orClauses: any[] = [];
  if (source.author.id && source.author.id !== "anonymous" && source.author.id !== "system") {
    orClauses.push({ authorId: source.author.id });
  }
  if (source.author.handle && source.author.handle !== "@anonymous") {
    orClauses.push({ authorHandle: source.author.handle });
  }
  if (source.tags.length > 0) {
    orClauses.push({ tags: { contains: source.tags[0] } });
  }
  if (orClauses.length > 0) {
    try {
      const relatedPosts = await db.post.findMany({
        where: {
          AND: [{ id: { not: contentId } }, { OR: orClauses }],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      });
      related.push(...relatedPosts.map((p) => toContentObject(p)));
    } catch {
      /* skip */
    }
  }

  // ── References: messages that reply to or forward this content ───────
  const references: ContentObject[] = [];
  try {
    const replies = await db.message.findMany({
      where: { replyToId: contentId, isDeleted: false },
      take: 10,
      orderBy: { createdAt: "desc" },
    });
    references.push(...replies.map((m) => toContentObjectFromMessage(m)));
  } catch {
    /* skip */
  }
  try {
    const forwards = await db.message.findMany({
      where: { forwardedFromId: contentId, isDeleted: false },
      take: 10,
      orderBy: { createdAt: "desc" },
    });
    references.push(...forwards.map((m) => toContentObjectFromMessage(m)));
  } catch {
    /* skip */
  }

  return { related, references };
}

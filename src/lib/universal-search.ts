// @ts-nocheck
/**
 * Universal Search — cross-module search primitive for CIRKLE.
 *
 * Searches across every major content surface in the platform:
 *   • Posts          (Midan / Lamahat / Mashahd / Circle posts)
 *   • Messages       (Wasl message bodies — only decrypted / plaintext)
 *   • Conversations  (Wasl chat names)
 *   • Users          (display name + circle id handle)
 *   • Circle Groups  (community names)
 *   • Services       (government Service Directory entries)
 *   • Photo Albums    (Lamahat PhotoCollection titles)
 *   • Events         (CircleEvent titles)
 *   • Videos         (Mashahd posts with mediaKind=video)
 *
 * Every DB call is wrapped in try/catch — tables may not exist on a
 * fresh dev database, and the function MUST degrade gracefully to an
 * empty array rather than throw.
 *
 * Module filtering: `options.modules` is a string array of module
 * short-codes (wasl | midan | lamahat | mashahd | rihla | circles |
 * news | federation). When omitted, every surface is searched.
 *
 * Permissions: conversations are only returned when the caller is a
 * member (matched via `ConversationMember.displayName` against the
 * supplied `userId` / current username). All other surfaces are
 * globally searchable — they were authored publicly.
 */

import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type SearchResultType =
  | "post"
  | "message"
  | "conversation"
  | "user"
  | "circle"
  | "photo"
  | "video"
  | "news"
  | "service"
  | "document"
  | "place"
  | "event";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  snippet: string;
  /** CIRKLE module short-code (wasl | midan | lamahat | mashahd | rihla | circles | news | federation). */
  module: string;
  url?: string;
  /** Relevance score 0..100 — higher is more relevant. */
  score: number;
  metadata?: Record<string, any>;
}

export interface UniversalSearchOptions {
  /** Module short-codes to search within. Omit = search everything. */
  modules?: string[];
  /** Maximum number of results to return (default 20). */
  limit?: number;
  /**
   * The current user identifier. Used for permission filtering on
   * conversations (only return conversations this user is a member of).
   * Accepts either a User.id or a Cirkle username handle.
   */
  userId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise a raw query into a lowercase trimmed string. */
function normalise(q: string): string {
  return (q || "").trim().toLowerCase();
}

/**
 * Score a candidate match against the query.
 *   - exact match         → 100
 *   - prefix match        → 80
 *   - word-boundary match → 70
 *   - contains match      → 55
 *   - no match             → 0
 */
function scoreMatch(haystack: string, query: string): number {
  if (!haystack || !query) return 0;
  const h = haystack.toLowerCase();
  const q = query.toLowerCase();
  if (h === q) return 100;
  if (h.startsWith(q)) return 80;
  // Word-boundary detection — \b on the haystack split.
  const wordBoundary = new RegExp(`\\b${escapeRegExp(q)}`, "i");
  if (wordBoundary.test(h)) return 70;
  if (h.includes(q)) return 55;
  return 0;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a 200-char snippet around the first match of the query. */
function buildSnippet(text: string, query: string, max = 200): string {
  if (!text) return "";
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) {
    return text.length > max ? text.slice(0, max) + "…" : text;
  }
  const start = Math.max(0, idx - Math.floor((max - query.length) / 2));
  const end = Math.min(text.length, start + max);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return prefix + text.slice(start, end) + suffix;
}

/** Recency boost — newer results get up to +15 added to their score. */
function recencyBoost(isoTs: string | Date | null | undefined): number {
  if (!isoTs) return 0;
  try {
    const ts = new Date(isoTs as any).getTime();
    if (isNaN(ts)) return 0;
    const ageDays = (Date.now() - ts) / (24 * 60 * 60 * 1000);
    if (ageDays < 1) return 15;
    if (ageDays < 7) return 10;
    if (ageDays < 30) return 5;
    return 0;
  } catch {
    return 0;
  }
}

/** True when the supplied module filter list either is absent or contains `m`. */
function moduleAllowed(m: string, modules?: string[]): boolean {
  if (!modules || modules.length === 0) return true;
  return modules.some((x) => x.toLowerCase() === m.toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-surface searchers — each returns SearchResult[] and never throws.
// ─────────────────────────────────────────────────────────────────────────────

async function searchPosts(query: string, modules?: string[]): Promise<SearchResult[]> {
  // Posts cover: midan (square posts), lamahat (photo posts),
  // mashahd (video posts), circle (community posts), news (tagged).
  const allowedModules = ["midan", "lamahat", "mashahd", "rihla", "circles", "news"];
  const wantModules = (modules || []).map((m) => m.toLowerCase());
  const effective = wantModules.length === 0 ? allowedModules : wantModules.filter((m) => allowedModules.includes(m));
  if (effective.length === 0) return [];

  try {
    // Posts do not have an `isDeleted` column — the schema only exposes
    // `createdAt`, `module`, `body`, `tags`, `mediaKind`, etc. The query
    // below is intentionally permissive: deleted posts are filtered at
    // the application layer if needed (none currently).
    //
    // SQLite's `contains` is already case-insensitive for ASCII; we do
    // NOT use `mode: "insensitive"` (that's Postgres-only).
    //
    // Note: when no module filter is supplied we search across ALL
    // allowed modules — posts whose `module` column is NULL are simply
    // not matched by the IN clause and will be skipped. This is by
    // design: such legacy posts are rare and we prefer a precise query
    // over a `WHERE module IS NULL OR module IN (...)` construct that
    // Prisma/SQLite rejects on certain null comparisons.
    const orClauses: any[] = [{ module: { in: effective } }];
    const posts = await db.post.findMany({
      where: {
        AND: [
          { OR: orClauses },
          {
            OR: [
              { body: { contains: query } },
              { tags: { contains: query } },
            ],
          },
        ],
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    return posts
      .map((p): SearchResult => {
        const isVideo = (p.module === "mashahd") || (p.mediaKind === "video");
        const isPhoto = (p.module === "lamahat") || (p.mediaKind === "image");
        const isNews = p.tags?.toLowerCase().includes("news") || p.module === "news";
        const type: SearchResultType = isVideo ? "video" : isPhoto ? "photo" : isNews ? "news" : "post";
        const titleScore = scoreMatch(p.authorName || "", query);
        const bodyScore = scoreMatch(p.body || "", query);
        const tagScore = p.tags ? scoreMatch(p.tags, query) : 0;
        const baseScore = Math.max(titleScore, bodyScore, tagScore);
        const score = baseScore + recencyBoost(p.createdAt) * (baseScore > 0 ? 1 : 0.3);
        const moduleLabel = p.module || "midan";
        return {
          id: p.id,
          type,
          title: p.authorName
            ? `${p.authorName}${p.authorVerified ? " ✓" : ""}`
            : "Anonymous post",
          snippet: buildSnippet(p.body || "", query),
          module: moduleLabel,
          url: `/${moduleLabel}`,
          score: Math.min(100, Math.round(score)),
          metadata: {
            authorHandle: p.authorHandle,
            authorInitials: p.authorInitials,
            authorColor: p.authorColor,
            authorVerified: p.authorVerified,
            module: p.module,
            visibility: p.visibility,
            tags: p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
            mediaKind: p.mediaKind ?? null,
            likes: p.likes,
            comments: p.comments,
            shares: p.shares,
            views: p.views,
            createdAt: p.createdAt,
          },
        };
      })
      .filter((r) => r.score > 0);
  } catch {
    return [];
  }
}

async function searchMessages(query: string, userId?: string): Promise<SearchResult[]> {
  try {
    // Only non-encrypted (plaintext) messages — server never sees E2EE
    // ciphertext content, so those cannot be searched server-side.
    // SQLite's `contains` is already case-insensitive for ASCII; we do
    // NOT use `mode: "insensitive"` (that's Postgres-only).
    let where: any = {
      AND: [
        { isDeleted: false },
        { encrypted: false },
        { body: { contains: query } },
      ],
    };

    // Permission gate: when a userId is provided, restrict to messages
    // in conversations the user is a member of.
    if (userId) {
      try {
        const memberships = await db.conversationMember.findMany({
          where: {
            OR: [{ userId }, { displayName: { contains: userId } }],
          },
          select: { conversationId: true },
        });
        const conversationIds = memberships.map((m) => m.conversationId);
        if (conversationIds.length === 0) return [];
        where = {
          AND: [...where.AND, { conversationId: { in: conversationIds } }],
        };
      } catch {
        // conversationMember table may not exist — return no messages
        // rather than leak other users' messages.
        return [];
      }
    }

    const messages = await db.message.findMany({
      where,
      take: 30,
      orderBy: { createdAt: "desc" },
    });

    return messages
      .map((m): SearchResult => {
        const bodyScore = scoreMatch(m.body || "", query);
        const score = bodyScore + recencyBoost(m.createdAt);
        return {
          id: m.id,
          type: "message",
          title: m.senderName || "Unknown sender",
          snippet: buildSnippet(m.body || "", query),
          module: "wasl",
          url: "/wasl",
          score: Math.min(100, Math.round(score)),
          metadata: {
            conversationId: m.conversationId,
            senderInitials: m.senderInitials,
            senderColor: m.senderColor,
            createdAt: m.createdAt,
          },
        };
      })
      .filter((r) => r.score > 0);
  } catch {
    return [];
  }
}

async function searchConversations(query: string, userId?: string): Promise<SearchResult[]> {
  try {
    let where: any = {
      OR: [
        { name: { contains: query } },
        ...(query ? [] : []),
      ],
    };

    // Permission: only return conversations the caller is a member of.
    if (userId) {
      try {
        const memberships = await db.conversationMember.findMany({
          where: {
            OR: [{ userId }, { displayName: { contains: userId } }],
          },
          select: { conversationId: true },
        });
        const conversationIds = memberships.map((m) => m.conversationId);
        if (conversationIds.length === 0) return [];
        where = {
          AND: [{ id: { in: conversationIds } }, where],
        };
      } catch {
        return [];
      }
    }

    const conversations = await db.conversation.findMany({
      where,
      take: 20,
      orderBy: { updatedAt: "desc" },
    });

    return conversations
      .map((c): SearchResult => {
        const nameScore = scoreMatch(c.name || "", query);
        const score = nameScore + recencyBoost(c.updatedAt);
        return {
          id: c.id,
          type: "conversation",
          title: c.name || "Untitled conversation",
          snippet:
            c.type === "group"
              ? "Group chat"
              : c.type === "channel"
              ? "Channel"
              : "Direct conversation",
          module: "wasl",
          url: "/wasl",
          score: Math.min(100, Math.round(score)),
          metadata: {
            type: c.type,
            encrypted: c.encrypted,
            avatarColor: c.avatarColor,
            updatedAt: c.updatedAt,
          },
        };
      })
      .filter((r) => r.score > 0);
  } catch {
    return [];
  }
}

async function searchUsers(query: string): Promise<SearchResult[]> {
  try {
    const users = await db.user.findMany({
      where: {
        OR: [
          { displayName: { contains: query } },
          { circleId: { contains: query } },
          { arabicName: { contains: query } },
        ],
      },
      take: 20,
    });

    return users
      .map((u): SearchResult => {
        const nameScore = scoreMatch(u.displayName || "", query);
        const handleScore = scoreMatch(u.circleId || "", query);
        const arabicScore = u.arabicName ? scoreMatch(u.arabicName, query) : 0;
        const baseScore = Math.max(nameScore, handleScore, arabicScore);
        const score = baseScore + recencyBoost(u.joinedAt) * 0.3;
        return {
          id: u.id,
          type: "user",
          title: u.displayName + (u.verified ? " ✓" : ""),
          snippet: `@${u.circleId} · ${u.region}`,
          module: "federation",
          url: `/profile?u=${encodeURIComponent(u.circleId)}`,
          score: Math.min(100, Math.round(score)),
          metadata: {
            circleId: u.circleId,
            region: u.region,
            verified: u.verified,
            avatarColor: u.avatarColor,
            joinedAt: u.joinedAt,
          },
        };
      })
      .filter((r) => r.score > 0);
  } catch {
    return [];
  }
}

async function searchCircles(query: string): Promise<SearchResult[]> {
  try {
    const circles = await db.circleGroup.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      },
      take: 20,
    });

    return circles
      .map((c): SearchResult => {
        const nameScore = scoreMatch(c.name || "", query);
        const descScore = scoreMatch(c.description || "", query);
        const baseScore = Math.max(nameScore, descScore * 0.8);
        const score = baseScore + recencyBoost(c.createdAt) * 0.5;
        return {
          id: c.id,
          type: "circle",
          title: c.name,
          snippet: c.description || `${c.category} · ${c.mode}`,
          module: "circles",
          url: "/circles",
          score: Math.min(100, Math.round(score)),
          metadata: {
            mode: c.mode,
            category: c.category,
            avatarColor: c.avatarColor,
            avatarInitials: c.avatarInitials,
            ownerLabel: c.ownerLabel,
            createdAt: c.createdAt,
          },
        };
      })
      .filter((r) => r.score > 0);
  } catch {
    return [];
  }
}

async function searchServices(query: string): Promise<SearchResult[]> {
  try {
    const entries = await db.serviceDirectoryEntry.findMany({
      where: {
        OR: [
          { serviceName: { contains: query } },
          { responsibleInstitution: { contains: query } },
          { department: { contains: query } },
          { channel: { contains: query } },
        ],
      },
      take: 20,
    });

    return entries
      .map((s): SearchResult => {
        const nameScore = scoreMatch(s.serviceName || "", query);
        const instScore = scoreMatch(s.responsibleInstitution || "", query);
        const baseScore = Math.max(nameScore, instScore * 0.85);
        const score = baseScore + recencyBoost(s.lastVerified) * 0.2;
        return {
          id: s.id,
          type: "service",
          title: s.serviceName,
          snippet: `${s.responsibleInstitution}${s.department ? " · " + s.department : ""}`,
          module: "midan",
          url: "/midan",
          score: Math.min(100, Math.round(score)),
          metadata: {
            serviceId: s.serviceId,
            channel: s.channel,
            status: s.status,
            category: s.category,
            geographicCoverage: s.geographicCoverage,
            lastVerified: s.lastVerified,
          },
        };
      })
      .filter((r) => r.score > 0);
  } catch {
    return [];
  }
}

async function searchPhotoCollections(query: string): Promise<SearchResult[]> {
  try {
    const collections = await db.photoCollection.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { category: { contains: query } },
        ],
      },
      take: 20,
    });

    return collections
      .map((c): SearchResult => {
        const titleScore = scoreMatch(c.title || "", query);
        const descScore = c.description ? scoreMatch(c.description, query) : 0;
        const catScore = c.category ? scoreMatch(c.category, query) : 0;
        const baseScore = Math.max(titleScore, descScore * 0.8, catScore * 0.7);
        const score = baseScore + recencyBoost(c.createdAt) * 0.4;
        return {
          id: c.id,
          type: "photo",
          title: c.title,
          snippet: c.description || `${c.kind} · ${c.visibility}`,
          module: "lamahat",
          url: "/lamahat",
          score: Math.min(100, Math.round(score)),
          metadata: {
            kind: c.kind,
            visibility: c.visibility,
            category: c.category,
            ownerLabel: c.ownerLabel,
            cover: c.cover,
            createdAt: c.createdAt,
          },
        };
      })
      .filter((r) => r.score > 0);
  } catch {
    return [];
  }
}

async function searchEvents(query: string): Promise<SearchResult[]> {
  try {
    const events = await db.circleEvent.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { location: { contains: query } },
        ],
      },
      take: 20,
    });

    return events
      .map((e): SearchResult => {
        const titleScore = scoreMatch(e.title || "", query);
        const descScore = e.description ? scoreMatch(e.description, query) : 0;
        const locScore = e.location ? scoreMatch(e.location, query) : 0;
        const baseScore = Math.max(titleScore, descScore * 0.8, locScore * 0.85);
        const score = baseScore + recencyBoost(e.startsAt) * 0.6;
        return {
          id: e.id,
          type: "event",
          title: e.title,
          snippet: e.description || (e.location ? `📍 ${e.location}` : "Circle event"),
          module: "circles",
          url: "/circles",
          score: Math.min(100, Math.round(score)),
          metadata: {
            circleId: e.circleId,
            createdBy: e.createdBy,
            location: e.location,
            startsAt: e.startsAt,
            endsAt: e.endsAt,
          },
        };
      })
      .filter((r) => r.score > 0);
  } catch {
    return [];
  }
}

async function searchDocuments(query: string, userId?: string): Promise<SearchResult[]> {
  try {
    const where: any = {
      OR: [
        { contentType: { contains: query } },
      ],
    };
    // If a userLabel is supplied, restrict to that user's stash.
    if (userId) where.userLabel = userId;

    const items = await db.offlineStashItem.findMany({
      where,
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    return items
      .map((d): SearchResult => {
        const typeScore = scoreMatch(d.contentType || "", query);
        const score = typeScore + recencyBoost(d.createdAt) * 0.5;
        return {
          id: d.id,
          type: "document",
          title: `${d.contentType} stash`,
          snippet: `Saved ${d.contentType} · ${d.userLabel}`,
          module: "lamahat",
          url: "/lamahat",
          score: Math.min(100, Math.round(score)),
          metadata: {
            userLabel: d.userLabel,
            contentType: d.contentType,
            contentId: d.contentId,
            createdAt: d.createdAt,
          },
        };
      })
      .filter((r) => r.score > 0);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a universal search across every CIRKLE content surface.
 *
 * Returns a flat, score-sorted list of `SearchResult`. Never throws —
 * if every DB call fails (e.g. fresh dev DB without migrations), the
 * function resolves to an empty array.
 */
export async function universalSearch(
  query: string,
  options?: UniversalSearchOptions,
): Promise<SearchResult[]> {
  const q = normalise(query);
  if (q.length < 1) return [];

  const modules = options?.modules;
  const limit = Math.max(1, Math.min(100, options?.limit ?? 20));
  const userId = options?.userId;

  // Run every searcher in parallel — each is internally resilient.
  const tasks: Promise<SearchResult[]>[] = [];

  // Posts also cover videos/photos/news → checked inside the searcher
  // by post.module and post.mediaKind, so they respect the module filter.
  if (moduleAllowed("midan", modules) || moduleAllowed("lamahat", modules) ||
      moduleAllowed("mashahd", modules) || moduleAllowed("circles", modules) ||
      moduleAllowed("rihla", modules) || moduleAllowed("news", modules) ||
      !modules || modules.length === 0) {
    tasks.push(searchPosts(q, modules));
  }

  if (moduleAllowed("wasl", modules) || !modules || modules.length === 0) {
    tasks.push(searchMessages(q, userId));
    tasks.push(searchConversations(q, userId));
  }

  if (moduleAllowed("federation", modules) || !modules || modules.length === 0) {
    tasks.push(searchUsers(q));
  }

  if (moduleAllowed("circles", modules) || !modules || modules.length === 0) {
    tasks.push(searchCircles(q));
    tasks.push(searchEvents(q));
  }

  if (moduleAllowed("midan", modules) || !modules || modules.length === 0) {
    tasks.push(searchServices(q));
  }

  if (moduleAllowed("lamahat", modules) || !modules || modules.length === 0) {
    tasks.push(searchPhotoCollections(q));
    tasks.push(searchDocuments(q, userId));
  }

  const settled = await Promise.allSettled(tasks);
  const all: SearchResult[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") {
      for (const item of r.value) all.push(item);
    }
  }

  // Sort by score desc, then alphabetically by title for stable ordering.
  all.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title);
  });

  return all.slice(0, limit);
}

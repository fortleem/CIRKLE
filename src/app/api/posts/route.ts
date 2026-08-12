import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/circle/seed";
import { getRegionForCountry } from "@/lib/regions";
import type { Post } from "@/lib/circle/types";
import { rankFeedForUser, trackInteraction } from "@/lib/feed-algorithm";
import { validateBody, z } from "@/lib/api-validation";
import { withRateLimit } from "@/lib/api-rate-limit";

/** Resolve the serving region from the country header set by the proxy. */
function regionFor(req: NextRequest): string {
  return getRegionForCountry(req.headers.get("x-cirkle-country")).code;
}

function toPostShape(p: {
  id: string;
  authorId: string | null;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorHandle: string;
  authorVerified: boolean;
  body: string;
  arabicBody: string | null;
  visibility: string;
  module: string;
  location: string | null;
  language: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  tags: string | null;
  mediaKind: string | null;
  mediaCount: number | null;
  mediaCover: string | null;
  createdAt: Date;
}): Post {
  return {
    id: p.id,
    authorId: p.authorId ?? "",
    authorName: p.authorName,
    authorInitials: p.authorInitials,
    authorColor: p.authorColor,
    authorHandle: p.authorHandle,
    authorVerified: p.authorVerified,
    body: p.body,
    arabicBody: p.arabicBody ?? undefined,
    timestamp: p.createdAt.toISOString(),
    visibility: p.visibility as Post["visibility"],
    module: p.module as Post["module"],
    media: p.mediaKind
      ? {
          kind: p.mediaKind as Post["media"] extends { kind: infer K } ? K : never,
          count: p.mediaCount ?? undefined,
          cover: p.mediaCover ?? undefined,
        }
      : null,
    location: p.location ?? undefined,
    language: p.language,
    stats: {
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      views: p.views,
    },
    tags: p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
  };
}

/**
 * GET /api/posts?module=midan|lamahat|mashahd&algo=true&username=<handle>
 * Returns posts filtered by module, newest first. Default: all.
 *
 * When `algo=true` and `username` is provided, posts are re-ranked by the
 * algorithmic feed (follow graph + engagement + recency + diversity) and a
 * "view" interaction is recorded for each post served to that user.
 *
 * Single-post tracking mode:
 *   GET /api/posts?id=<postId>&username=<handle>&track=view|dwell[&dwellMs=…]
 * Records one interaction and returns `{ ok: true }`. Used by the
 * IntersectionObserver in midan-screen to fire per-post view/dwell events.
 */
export async function GET(req: NextRequest) {
  try {
    // ensureSeeded removed — no mock data();

    const moduleFilter = req.nextUrl.searchParams.get("module");
    const algo = req.nextUrl.searchParams.get("algo") === "true";
    const username = (req.nextUrl.searchParams.get("username") || "").trim().toLowerCase().replace(/^@/, "");
    const limitParam = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 100 ? limitParam : 20;

    // ── Single-post interaction tracking (beacon-friendly) ──────────────
    // The Midan IntersectionObserver calls this with `id` + `track=view|dwell`
    // + `username`. We record the interaction and return early.
    const trackPostId = req.nextUrl.searchParams.get("id");
    const trackType = req.nextUrl.searchParams.get("track");
    if (trackPostId && trackType && username) {
      const validTypes = ["view", "like", "comment", "share", "dwell"];
      if (validTypes.includes(trackType)) {
        const dwellMsRaw = req.nextUrl.searchParams.get("dwellMs");
        const dwellMs = dwellMsRaw ? Number(dwellMsRaw) : undefined;
        await trackInteraction(
          username,
          trackPostId,
          trackType,
          Number.isFinite(dwellMs) ? dwellMs : undefined,
        ).catch((err: unknown) => {
          logger.warn("[/api/posts GET] trackInteraction failed", { error: (err as Error).message });
        });
        return NextResponse.json({ ok: true, tracked: trackType, postId: trackPostId });
      }
    }

    const where = moduleFilter ? { module: moduleFilter } : {};

    const rows = await db.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Algorithmic ranking — only kicks in when both algo=true AND a username
    // is supplied. Otherwise we fall back to the default newest-first order.
    if (algo && username) {
      try {
        const ranked = await rankFeedForUser(username, rows as any[], limit);
        const shaped = ranked.map(toPostShape);
        return NextResponse.json(shaped, {
          headers: { "X-Data-Region": regionFor(req) },
        });
      } catch (rankErr) {
        logger.warn("[/api/posts GET] algo ranking failed, falling back to recency", {
          error: (rankErr as Error).message,
        });
      }
    }

    // Non-algo path — if a username is supplied, track a view for each post
    // served (best-effort, doesn't block the response).
    if (username && rows.length) {
      Promise.all(
        rows.slice(0, limit).map((p) =>
          trackInteraction(username, p.id, "view").catch(() => {}),
        ),
      ).catch(() => {});
    }

    return NextResponse.json(
      rows.slice(0, algo ? limit : undefined).map(toPostShape),
      { headers: { "X-Data-Region": regionFor(req) } },
    );
  } catch (err) {
    logger.error("[/api/posts GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load posts" },
      { status: 500 },
    );
  }
}

/**
 * Zod schema for `POST /api/posts`. Mirrors the inline type the handler
 * previously accepted. `body` and `content` are both optional here — the
 * handler still enforces "at least one of body/content must be non-empty"
 * because the existing UX allows `content` as an alias for `body`.
 */
const postCreateSchema = z.object({
  body: z.string().max(20_000).optional(),
  content: z.string().max(20_000).optional(),
  module: z.enum(["midan", "lamahat", "mashahd", "circle"]).optional(),
  authorName: z.string().max(100).optional(),
  author: z.string().max(100).optional(),
  authorHandle: z.string().max(100).optional(),
  authorId: z.string().max(100).optional(),
  authorInitials: z.string().max(10).optional(),
  authorColor: z.string().max(30).optional(),
  authorVerified: z.boolean().optional(),
  visibility: z.enum(["public", "followers", "circle", "anonymous"]).optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
  mediaKind: z.string().max(60).optional(),
  // P1.6 — Anonymous Midan. When `anonymousId` is present, the post
  // is stored under the pseudonymous identity. The server never
  // receives the real user's identity, and there is NO mapping
  // table linking `anonymousId` back to a real user — the mapping
  // lives exclusively in the authoring device's localStorage.
  anonymousId: z.string().max(100).optional(),
});

/** Inner post-creation handler — body already validated by zod. */
const createPost = validateBody(
  postCreateSchema,
  async (req: NextRequest, body: z.infer<typeof postCreateSchema>) => {
    try {
      const postBody = body.body ?? body.content;
      if (!postBody || typeof postBody !== "string" || !postBody.trim()) {
        return NextResponse.json({ error: "body is required" }, { status: 400 });
      }

      const validModules = ["midan", "lamahat", "mashahd", "circle"];
      const moduleValue =
        body.module && validModules.includes(body.module) ? body.module : "midan";

      const validVis = ["public", "followers", "circle", "anonymous"];
      // When anonymousId is present, force visibility to "anonymous" so
      // downstream consumers (feed, search, moderation) can mark the
      // post accordingly. The privacy covenant is unaffected — the API
      // only ever sees the pseudonymous identity.
      const visibility =
        body.anonymousId
          ? "anonymous"
          : body.visibility && validVis.includes(body.visibility)
            ? body.visibility
            : "public";

      // P1.6 — Privacy covenant: when anonymousId is present, the server
      // stores ONLY the pseudonymous identity. The real user's User row is
      // NOT linked — `authorId` is null so the FK to User is never
      // exercised. The pseudonymous identity lives in `anonymousId` +
      // `authorHandle` + `authorName`, none of which can be mapped back
      // to a real user (the mapping lives exclusively on the authoring
      // device's localStorage).
      const isAnonymous = !!body.anonymousId;
      const created = await db.post.create({
        data: {
          // null authorId when anonymous (no User FK linkage) OR when no
          // authorId was provided — avoids FK violations when the
          // supplied authorId doesn't match a real User row.
          authorId: isAnonymous ? null : (body.authorId ?? null),
          anonymousId: isAnonymous ? body.anonymousId! : null,
          authorName: isAnonymous ? (body.authorName ?? "Anonymous") : (body.authorName ?? body.author ?? "Anonymous"),
          authorHandle: isAnonymous ? (body.authorHandle ?? "anonymous") : (body.authorHandle ?? "anonymous"),
          authorInitials: body.authorInitials ?? "A",
          authorColor: isAnonymous ? (body.authorColor ?? "steel") : (body.authorColor ?? "teal"),
          authorVerified: false, // Anonymous posts are never verified by design.
          body: postBody.trim(),
          module: moduleValue,
          visibility,
          language: "en",
          tags: body.tags?.length ? body.tags.join(",") : null,
          mediaKind: body.mediaKind ?? null,
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0,
        },
      });

      return NextResponse.json(toPostShape(created), {
        status: 201,
        headers: { "X-Data-Region": regionFor(req) },
      });
    } catch (err) {
      logger.error("[/api/posts POST] error", { error: (err as Error).message });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "failed to create post" },
        { status: 500 },
      );
    }
  },
);

/**
 * POST /api/posts
 * Body: {body?, content?, module?, authorName?, author?, authorHandle?, visibility?, tags?, mediaKind?}
 *   - `body` is the canonical field for the post text.
 *   - `content` is accepted as a convenience alias for `body`.
 *   - `author` is accepted as a convenience alias for `authorName`.
 * Creates with author defaults from CURRENT_USER. No counters incremented.
 *
 * The handler is wrapped with `withRateLimit` (10 req/min — anti-spam) and
 * the post-creation path is additionally wrapped with `validateBody` so a
 * malformed payload returns 400 before any DB write. sendBeacon tracking
 * POSTs (empty body + tracking query params) bypass validation since they
 * don't carry a JSON body.
 */
export const POST = withRateLimit(
  async (req: NextRequest) => {
    // ── sendBeacon tracking support ────────────────────────────────────
    // navigator.sendBeacon() sends a POST with an empty body. The tracking
    // params (id, username, track, dwellMs) are in the URL query string.
    const trackPostId = req.nextUrl.searchParams.get("id");
    const trackType = req.nextUrl.searchParams.get("track");
    const trackUsername = (req.nextUrl.searchParams.get("username") || "").trim().toLowerCase().replace(/^@/, "");
    if (trackPostId && trackType && trackUsername) {
      const validTypes = ["view", "like", "comment", "share", "dwell"];
      if (validTypes.includes(trackType)) {
        const dwellMsRaw = req.nextUrl.searchParams.get("dwellMs");
        const dwellMs = dwellMsRaw ? Number(dwellMsRaw) : undefined;
        await trackInteraction(
          trackUsername,
          trackPostId,
          trackType,
          Number.isFinite(dwellMs) ? dwellMs : undefined,
        ).catch((err: unknown) => {
          logger.warn("[/api/posts POST] trackInteraction failed", { error: (err as Error).message });
        });
        return NextResponse.json({ ok: true }, { status: 200 });
      }
    }

    // ── Post creation (validated) ──────────────────────────────────────
    return createPost(req);
  },
  { maxRequests: 10, windowMs: 60_000 },
);

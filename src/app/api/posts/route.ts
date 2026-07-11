import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/circle/seed";
import { getRegionForCountry } from "@/lib/regions";
import type { Post } from "@/lib/circle/types";
import { rankFeedForUser, trackInteraction } from "@/lib/feed-algorithm";

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
 * POST /api/posts
 * Body: {body?, content?, module?, authorName?, author?, authorHandle?, visibility?, tags?, mediaKind?}
 *   - `body` is the canonical field for the post text.
 *   - `content` is accepted as a convenience alias for `body`.
 *   - `author` is accepted as a convenience alias for `authorName`.
 * Creates with author defaults from CURRENT_USER. No counters incremented.
 */
export async function POST(req: NextRequest) {
  try {
    // ensureSeeded removed — no mock data();

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

    const body = (await req.json().catch(() => null)) as {
      body?: string;
      content?: string;
      module?: string;
      authorName?: string;
      author?: string;
      authorHandle?: string;
      authorId?: string;
      authorInitials?: string;
      authorColor?: string;
      authorVerified?: boolean;
      visibility?: string;
      tags?: string[];
      mediaKind?: string;
    } | null;

    const postBody = body?.body ?? body?.content;
    if (!postBody || typeof postBody !== "string" || !postBody.trim()) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    const validModules = ["midan", "lamahat", "mashahd", "circle"];
    const moduleValue =
      body!.module && validModules.includes(body!.module) ? body!.module : "midan";

    const validVis = ["public", "followers", "circle", "anonymous"];
    const visibility =
      body!.visibility && validVis.includes(body!.visibility) ? body!.visibility : "public";

    const created = await db.post.create({
      data: {
        authorId: body!.authorId ?? "u_current",
        authorName: body!.authorName ?? body!.author ?? "Anonymous",
        authorHandle: body!.authorHandle ?? "anonymous",
        authorInitials: body!.authorInitials ?? "A",
        authorColor: body!.authorColor ?? "teal",
        authorVerified: body!.authorVerified ?? false,
        body: postBody.trim(),
        module: moduleValue,
        visibility,
        language: "en",
        tags: body!.tags?.length ? body!.tags.join(",") : null,
        mediaKind: body!.mediaKind ?? null,
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
}

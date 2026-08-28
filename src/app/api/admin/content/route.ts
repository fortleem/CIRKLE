// @ts-nocheck
/**
 * GET /api/admin/content
 * ============================================================================
 * Content moderation data for the admin panel.
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAdmin` clearance on the session. Returns 401 / 403 otherwise.
 *
 * Query params:
 *   ?take=50   — number of posts to return (max 200, default 50)
 *   ?skip=0    — pagination offset
 *   ?module=   — filter by module (midan|lamahat|mashahd|circle)
 *   ?vis=      — filter by visibility (public|followers|circle|anonymous)
 *   ?anon=1    — only anonymous posts
 *
 * Returns:
 *   { total, posts: [...], byModule: [...], byVisibility: [...],
 *     engagement: {...}, topTags: [...] }
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // ── P0 FIX: auth-gate ─────────────────────────────────────────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") || "50")));
  const skip = Math.max(0, Number(url.searchParams.get("skip") || "0"));
  const moduleFilter = url.searchParams.get("module")?.trim() || "";
  const visFilter = url.searchParams.get("vis")?.trim() || "";
  const anonOnly = url.searchParams.get("anon") === "1";

  const where: any = {};
  if (moduleFilter) where.module = moduleFilter;
  if (visFilter) where.visibility = visFilter;
  if (anonOnly) where.NOT = { anonymousId: null };

  try {
    const [
      total,
      posts,
      byModule,
      byVisibility,
      anonCount,
      engagementAgg,
      recent24h,
      recent7d,
    ] = await Promise.all([
      db.post.count({ where }),
      db.post.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          authorName: true,
          authorHandle: true,
          authorVerified: true,
          body: true,
          module: true,
          visibility: true,
          anonymousId: true,
          language: true,
          likes: true,
          comments: true,
          shares: true,
          views: true,
          tags: true,
          mediaKind: true,
          createdAt: true,
        },
      }),
      db.post.groupBy({
        by: ["module"],
        _count: { _all: true },
        orderBy: { _count: { module: "desc" } },
      }),
      db.post.groupBy({
        by: ["visibility"],
        _count: { _all: true },
        orderBy: { _count: { visibility: "desc" } },
      }),
      db.post.count({ where: { NOT: { anonymousId: null } } }),
      db.post.aggregate({
        _sum: { likes: true, comments: true, shares: true, views: true },
        _avg: { likes: true, comments: true },
      }),
      db.post.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      db.post.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    // ── Top tags (parse comma-separated tags field) ─────────────────────────
    const tagCounts: Record<string, number> = {};
    const sample = await db.post.findMany({
      where: { NOT: { tags: null } },
      select: { tags: true },
      take: 500,
    });
    for (const p of sample) {
      if (!p.tags) continue;
      for (const t of p.tags.split(",")) {
        const tag = t.trim().toLowerCase();
        if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json(
      {
        total,
        anonymousTotal: anonCount,
        recent24h,
        recent7d,
        returned: posts.length,
        take,
        skip,
        posts: posts.map(p => ({
          ...p,
          createdAt: p.createdAt?.toISOString?.() || p.createdAt,
          bodyPreview: (p.body || "").slice(0, 180),
        })),
        byModule: byModule.map(m => ({ module: m.module, count: m._count?._all || 0 })),
        byVisibility: byVisibility.map(v => ({ visibility: v.visibility, count: v._count?._all || 0 })),
        engagement: {
          totalLikes: engagementAgg._sum?.likes || 0,
          totalComments: engagementAgg._sum?.comments || 0,
          totalShares: engagementAgg._sum?.shares || 0,
          totalViews: engagementAgg._sum?.views || 0,
          avgLikes: Math.round(engagementAgg._avg?.likes || 0),
          avgComments: Math.round(engagementAgg._avg?.comments || 0),
        },
        topTags,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_fetch_content", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

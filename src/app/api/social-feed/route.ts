import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeDbQuery } from "@/lib/db-safe";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

    // Try DB query — degrade gracefully if not available
    const posts = await safeDbQuery(() => db.post.findMany({
      where: { visibility: "public", ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      select: {
        id: true, authorName: true, authorInitials: true, authorColor: true,
        authorHandle: true, authorVerified: true, body: true, module: true,
        location: true, likes: true, comments: true, shares: true, views: true,
        tags: true, mediaKind: true, mediaCount: true, mediaCover: true, createdAt: true,
      },
    }));

    if (!posts) {
      return NextResponse.json({
        posts: [], hasMore: false, nextCursor: null,
        sidebar: { topSharers: [], trendingTags: [] },
        brainAI: { orchestrated: false, provider: "cirkle-brain" },
        message: "Database not available — showing empty feed",
      });
    }

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    const topSharers = await safeDbQuery(() => db.post.groupBy({
      by: ["authorName", "authorInitials", "authorColor", "authorHandle", "authorVerified"],
      where: { visibility: "public" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }));

    return NextResponse.json({
      posts: items,
      hasMore,
      nextCursor,
      sidebar: {
        topSharers: (topSharers || []).map((s) => ({
          name: s.authorName, initials: s.authorInitials, color: s.authorColor,
          handle: s.authorHandle, verified: s.authorVerified, postCount: s._count.id,
        })),
        trendingTags: [],
      },
      brainAI: { orchestrated: true, provider: "cirkle-brain" },
    });
  } catch (err) {
    return NextResponse.json({
      posts: [], hasMore: false, nextCursor: null,
      sidebar: { topSharers: [], trendingTags: [] },
      brainAI: { orchestrated: false, provider: "cirkle-brain" },
      error: String(err).slice(0, 200),
    });
  }
}

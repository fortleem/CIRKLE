import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Follow graph — POST to follow, DELETE to unfollow, GET to list.
// Edges are directed (follower → following). A user can't follow themselves.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * GET /api/follow?username=<handle>&direction=follower|following
 *   - direction=following (default): people the user follows
 *   - direction=follower: people who follow the user
 *
 * Returns: { direction, username, count, edges: [{ other, createdAt }] }
 */
export async function GET(req: NextRequest) {
  try {
    const username = normalizeUsername(req.nextUrl.searchParams.get("username"));
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }
    const direction = req.nextUrl.searchParams.get("direction") === "follower" ? "follower" : "following";

    if (direction === "following") {
      const rows = await db.follow.findMany({
        where: { follower: username },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({
        direction,
        username,
        count: rows.length,
        edges: rows.map((r) => ({ other: r.following, createdAt: r.createdAt.toISOString() })),
      });
    }

    const rows = await db.follow.findMany({
      where: { following: username },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      direction,
      username,
      count: rows.length,
      edges: rows.map((r) => ({ other: r.follower, createdAt: r.createdAt.toISOString() })),
    });
  } catch (err) {
    logger.error("[/api/follow GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load follow graph" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/follow
 * Body: { follower: string, following: string }
 * Idempotent — re-following an existing edge is a no-op (returns 200).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const follower = normalizeUsername(body.follower);
    const following = normalizeUsername(body.following);
    if (!follower) return NextResponse.json({ error: "follower is required" }, { status: 400 });
    if (!following) return NextResponse.json({ error: "following is required" }, { status: 400 });
    if (follower === following) {
      return NextResponse.json({ error: "cannot follow yourself" }, { status: 400 });
    }

    const edge = await db.follow.upsert({
      where: { follower_following: { follower, following } },
      create: { follower, following },
      update: {},
    });

    return NextResponse.json(
      {
        ok: true,
        edge: {
          follower: edge.follower,
          following: edge.following,
          createdAt: edge.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error("[/api/follow POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to follow" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/follow?follower=<handle>&following=<handle>
 * Idempotent — unfollowing a non-existent edge is a no-op.
 */
export async function DELETE(req: NextRequest) {
  try {
    const follower = normalizeUsername(req.nextUrl.searchParams.get("follower"));
    const following = normalizeUsername(req.nextUrl.searchParams.get("following"));
    if (!follower || !following) {
      return NextResponse.json({ error: "follower and following are required" }, { status: 400 });
    }

    await db.follow.deleteMany({ where: { follower, following } });
    return NextResponse.json({ ok: true, follower, following });
  } catch (err) {
    logger.error("[/api/follow DELETE] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to unfollow" },
      { status: 500 },
    );
  }
}

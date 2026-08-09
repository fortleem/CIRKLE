// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/circles/[id]
 * Returns a single Circle with:
 *   • Full metadata (mode, category, settings, owner, etc.)
 *   • Member roster (handle + role + joinedAt)
 *   • Recent posts in the Circle's `circle` module feed (last 20)
 *   • Upcoming events (best-effort; none yet)
 *   • Settings parsed into a friendly object
 *
 * The detail overlay (src/components/overlays/circle-detail.tsx) consumes
 * this shape directly.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const circle = await db.circleGroup.findUnique({
      where: { id },
      include: {
        members: { orderBy: { joinedAt: "asc" } },
        _count: { select: { members: true } },
      },
    });

    if (!circle) {
      return NextResponse.json({ error: "circle not found" }, { status: 404 });
    }

    // Recent posts in the Circle module feed (best-effort — null when
    // the Post table isn't reachable).
    let recentPosts: any[] = [];
    try {
      recentPosts = await db.post.findMany({
        where: { module: "circle" },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    } catch {
      /* fail open */
    }

    // Settings flag string → friendly object.
    const flags = circle.settings.split(/\s+/).filter(Boolean);
    const settings = {
      joinApprovalRequired: flags.includes("joinApprovalRequired"),
      membersCanPost: flags.includes("membersCanPost"),
      membersCanShareMedia: flags.includes("membersCanShareMedia"),
      membersCanInvite: flags.includes("membersCanInvite"),
      membersCanCreateEvents: flags.includes("membersCanCreateEvents"),
    };

    return NextResponse.json(
      {
        id: circle.id,
        name: circle.name,
        description: circle.description,
        mode: circle.mode,
        category: circle.category,
        avatarColor: circle.avatarColor,
        avatarInitials: circle.avatarInitials,
        encrypted: circle.encrypted,
        ownerLabel: circle.ownerLabel,
        settings,
        members: circle.members.map((m) => ({
          userLabel: m.userLabel,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        })),
        memberCount: circle._count.members,
        online: 0,
        recentPosts: recentPosts.map((p) => ({
          id: p.id,
          authorHandle: p.authorHandle,
          authorName: p.authorName,
          authorInitials: p.authorInitials,
          authorColor: p.authorColor,
          body: p.body,
          createdAt: p.createdAt.toISOString(),
          likes: p.likes,
          comments: p.comments,
          shares: p.shares,
          visibility: p.visibility,
        })),
        events: [],
        createdAt: circle.createdAt.toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    logger.error("[/api/circles/[id] GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load circle" },
      { status: 500 },
    );
  }
}

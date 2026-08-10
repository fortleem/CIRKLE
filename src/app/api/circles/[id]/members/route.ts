// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/circles/[id]/members
 * Returns the full member roster for the circle with role + join date.
 *
 * Response shape: { members: [{ userLabel, role, joinedAt }] }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const circle = await db.circleGroup.findUnique({
      where: { id },
      select: { id: true, ownerLabel: true },
    });
    if (!circle) return NextResponse.json({ error: "circle not found" }, { status: 404 });

    const members = await db.circleMember.findMany({
      where: { circleId: id },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    return NextResponse.json(
      {
        ownerLabel: circle.ownerLabel,
        members: members.map((m) => ({
          id: m.id,
          userLabel: m.userLabel,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
          isOwner: m.userLabel === circle.ownerLabel,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    logger.error("[/api/circles/[id]/members GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load members" },
      { status: 500 },
    );
  }
}

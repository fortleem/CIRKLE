// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordCircleAudit } from "@/lib/circle-audit";

/**
 * POST /api/circles/[id]/join-requests
 * Body: { user, note? }
 *
 * Creates a join request for a private circle. Public circles should
 * use the direct-join path (POST /api/circles/[id]/members) instead.
 *
 * Returns 409 if the user already has a pending request or is already
 * a member.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const circle = await db.circleGroup.findUnique({ where: { id } });
    if (!circle) return NextResponse.json({ error: "circle not found" }, { status: 404 });

    const body = (await req.json().catch(() => null)) as {
      user?: string;
      note?: string;
    } | null;

    const user = (body?.user ?? "").trim().toLowerCase().replace(/^@/, "");
    if (!user) {
      return NextResponse.json({ error: "user is required" }, { status: 400 });
    }

    // Already a member?
    const existingMember = await db.circleMember.findUnique({
      where: { circleId_userLabel: { circleId: id, userLabel: user } },
    });
    if (existingMember) {
      return NextResponse.json({ error: "already a member" }, { status: 409 });
    }

    // Pending request?
    const existing = await db.circleJoinRequest.findUnique({
      where: { circleId_userLabel: { circleId: id, userLabel: user } },
    });
    if (existing && existing.status === "pending") {
      return NextResponse.json({ error: "join request already pending" }, { status: 409 });
    }

    const created = await db.circleJoinRequest.create({
      data: {
        circleId: id,
        userLabel: user,
        note: (body?.note ?? "").trim().slice(0, 280),
        status: "pending",
      },
    });

    return NextResponse.json(
      { id: created.id, status: created.status, createdAt: created.createdAt.toISOString() },
      { status: 201 },
    );
  } catch (err) {
    logger.error("[/api/circles/[id]/join-requests POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create join request" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/circles/[id]/join-requests?reviewer=<handle>
 * Lists pending join requests. Only the owner/admin can view.
 *
 * Returns the pending requests (newest first) when the reviewer is
 * authorized; otherwise 403.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const reviewer = req.nextUrl.searchParams.get("reviewer")?.trim().toLowerCase().replace(/^@/, "") || "";
    if (!reviewer) {
      return NextResponse.json({ error: "reviewer is required" }, { status: 400 });
    }

    const membership = await db.circleMember.findUnique({
      where: { circleId_userLabel: { circleId: id, userLabel: reviewer } },
    });
    if (!membership) {
      return NextResponse.json({ error: "reviewer is not a member" }, { status: 403 });
    }
    const privileged = membership.role === "owner" || membership.role === "admin";
    if (!privileged) {
      return NextResponse.json({ error: "only owners and admins can view join requests" }, { status: 403 });
    }

    const requests = await db.circleJoinRequest.findMany({
      where: { circleId: id, status: "pending" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        requests: requests.map((r) => ({
          id: r.id,
          userLabel: r.userLabel,
          note: r.note,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    logger.error("[/api/circles/[id]/join-requests GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load join requests" },
      { status: 500 },
    );
  }
}

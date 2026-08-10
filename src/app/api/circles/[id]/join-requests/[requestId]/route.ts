// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordCircleAudit } from "@/lib/circle-audit";

/**
 * PATCH /api/circles/[id]/join-requests/[requestId]
 * Body: { decision: "approved" | "denied", reviewer, role? }
 *
 * Approves or denies a pending join request. On approval, the user is
 * added to the circle as a member with the given role (default
 * "member"). Records a `join_request_approved` or `join_request_denied`
 * audit entry.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> },
) {
  try {
    const { id, requestId } = await params;
    if (!id || !requestId) {
      return NextResponse.json({ error: "id and requestId are required" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as {
      decision?: string;
      reviewer?: string;
      role?: string;
    } | null;

    const decision = body?.decision ?? "";
    if (decision !== "approved" && decision !== "denied") {
      return NextResponse.json({ error: "decision must be 'approved' or 'denied'" }, { status: 400 });
    }
    const reviewer = (body?.reviewer ?? "").trim().toLowerCase().replace(/^@/, "");
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
      return NextResponse.json({ error: "only owners and admins can review join requests" }, { status: 403 });
    }

    const request = await db.circleJoinRequest.findUnique({ where: { id: requestId } });
    if (!request || request.circleId !== id) {
      return NextResponse.json({ error: "join request not found" }, { status: 404 });
    }
    if (request.status !== "pending") {
      return NextResponse.json({ error: `request already ${request.status}` }, { status: 409 });
    }

    await db.$transaction(async (tx) => {
      await tx.circleJoinRequest.update({
        where: { id: requestId },
        data: { status: decision, reviewedBy: reviewer, reviewedAt: new Date() },
      });

      if (decision === "approved") {
        const validRoles = ["member", "moderator"];
        const role = body?.role && validRoles.includes(body.role) ? body.role : "member";
        // Upsert the membership (in case they were invited previously
        // and then left — we re-add them).
        await tx.circleMember.upsert({
          where: { circleId_userLabel: { circleId: id, userLabel: request.userLabel } },
          create: { circleId: id, userLabel: request.userLabel, role },
          update: { role },
        });
      }
    });

    await recordCircleAudit({
      circleId: id,
      action: decision === "approved" ? "join_request_approved" : "join_request_denied",
      actor: reviewer,
      target: request.userLabel,
      summary:
        decision === "approved"
          ? `@${request.userLabel}'s join request was approved by @${reviewer}`
          : `@${request.userLabel}'s join request was denied by @${reviewer}`,
    });

    return NextResponse.json({ ok: true, status: decision });
  } catch (err) {
    logger.error("[/api/circles/[id]/join-requests/[requestId] PATCH] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to review join request" },
      { status: 500 },
    );
  }
}

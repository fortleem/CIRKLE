// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordCircleAudit } from "@/lib/circle-audit";

const VALID_ROLES = ["owner", "admin", "moderator", "member"];

/**
 * PATCH /api/circles/[id]/members/[memberId]
 * Body: { role, actor }
 *   role: "owner" | "admin" | "moderator" | "member"
 *   actor: username of the admin performing the change
 *
 * Changes the role of a member. Only owners (and owners+admins when
 * promoting to moderator/member) may change roles. The owner role
 * cannot be transferred via this endpoint (use a separate transfer
 * ownership flow).
 *
 * For audit, the `actor` field is required and recorded as the
 * action's performer.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  try {
    const { id, memberId } = await params;
    if (!id || !memberId) {
      return NextResponse.json({ error: "id and memberId are required" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as {
      role?: string;
      actor?: string;
    } | null;

    const role = body?.role ?? "";
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
    }
    const actor = (body?.actor ?? "").trim().toLowerCase().replace(/^@/, "");
    if (!actor) {
      return NextResponse.json({ error: "actor is required" }, { status: 400 });
    }

    const circle = await db.circleGroup.findUnique({ where: { id } });
    if (!circle) return NextResponse.json({ error: "circle not found" }, { status: 404 });

    // Find the target membership. memberId can be either the row id OR
    // the userLabel (we accept both for caller convenience).
    const target = await db.circleMember.findFirst({
      where: { OR: [{ id: memberId }, { circleId: id, userLabel: memberId.toLowerCase().replace(/^@/, "") }] },
    });
    if (!target || target.circleId !== id) {
      return NextResponse.json({ error: "member not found" }, { status: 404 });
    }

    // Actor must be a member of the circle.
    const actorMembership = await db.circleMember.findUnique({
      where: { circleId_userLabel: { circleId: id, userLabel: actor } },
    });
    if (!actorMembership) {
      return NextResponse.json({ error: "actor is not a member" }, { status: 403 });
    }

    // Permission matrix:
    //   - owner can change anyone's role (except their own owner role)
    //   - admin can promote/demote moderator <-> member (NOT to admin/owner)
    //   - moderator/member cannot change roles
    const isOwner = actorMembership.role === "owner";
    const isAdmin = actorMembership.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "only owners and admins can change roles" }, { status: 403 });
    }
    // Cannot transfer owner role via PATCH.
    if (role === "owner") {
      return NextResponse.json({ error: "owner role cannot be assigned via PATCH" }, { status: 400 });
    }
    if (target.role === "owner") {
      return NextResponse.json({ error: "cannot change the owner's role" }, { status: 400 });
    }
    // Admins can only manage moderator <-> member, not other admins.
    if (isAdmin && (role === "admin" || target.role === "admin")) {
      return NextResponse.json({ error: "admins cannot manage admin role" }, { status: 403 });
    }

    if (target.role === role) {
      return NextResponse.json({ ok: true, role: target.role, unchanged: true });
    }

    const updated = await db.circleMember.update({
      where: { id: target.id },
      data: { role },
    });

    await recordCircleAudit({
      circleId: id,
      action: "role_changed",
      actor,
      target: target.userLabel,
      summary: `Role changed from "${target.role}" to "${role}" for @${target.userLabel}`,
    });

    return NextResponse.json(
      { ok: true, role: updated.role, userLabel: updated.userLabel },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    logger.error("[/api/circles/[id]/members/[memberId] PATCH] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update member" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/circles/[id]/members/[memberId]?actor=<handle>
 * Removes a member from the circle. The owner cannot be removed.
 *
 * The actor must be an owner or admin (or the member themselves
 * leaving voluntarily — when actor === memberId).
 *
 * Records a `member_left` or `member_removed` audit entry.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  try {
    const { id, memberId } = await params;
    if (!id || !memberId) {
      return NextResponse.json({ error: "id and memberId are required" }, { status: 400 });
    }

    const actor = req.nextUrl.searchParams.get("actor")?.trim().toLowerCase().replace(/^@/, "") || "";
    if (!actor) {
      return NextResponse.json({ error: "actor is required (query param)" }, { status: 400 });
    }

    const target = await db.circleMember.findFirst({
      where: { OR: [{ id: memberId }, { circleId: id, userLabel: memberId.toLowerCase().replace(/^@/, "") }] },
    });
    if (!target || target.circleId !== id) {
      return NextResponse.json({ error: "member not found" }, { status: 404 });
    }
    if (target.role === "owner") {
      return NextResponse.json({ error: "cannot remove the owner" }, { status: 400 });
    }

    const selfRemoval = actor === target.userLabel;
    if (!selfRemoval) {
      const actorMembership = await db.circleMember.findUnique({
        where: { circleId_userLabel: { circleId: id, userLabel: actor } },
      });
      if (!actorMembership) {
        return NextResponse.json({ error: "actor is not a member" }, { status: 403 });
      }
      const isOwner = actorMembership.role === "owner";
      const isAdmin = actorMembership.role === "admin";
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "only owners and admins can remove members" }, { status: 403 });
      }
      // Admins cannot remove other admins — only owners can.
      if (isAdmin && target.role === "admin") {
        return NextResponse.json({ error: "admins cannot remove other admins" }, { status: 403 });
      }
    }

    await db.circleMember.delete({ where: { id: target.id } });

    await recordCircleAudit({
      circleId: id,
      action: selfRemoval ? "member_left" : "member_removed",
      actor,
      target: target.userLabel,
      summary: selfRemoval
        ? `@${target.userLabel} left the circle`
        : `@${target.userLabel} was removed by @${actor}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[/api/circles/[id]/members/[memberId] DELETE] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to remove member" },
      { status: 500 },
    );
  }
}

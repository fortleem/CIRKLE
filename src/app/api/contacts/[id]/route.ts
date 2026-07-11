// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * PATCH /api/contacts/[id]
 * Updates the status of a connection (active | blocked | muted).
 * Query: ?userId=...  (the caller, must be the follower)
 * Body: { status: "active" | "blocked" | "muted" }
 *
 * DELETE /api/contacts/[id]
 * Removes the contact (deletes the Connection row).
 * Query: ?userId=...  (the caller, must be the follower)
 */

const ALLOWED_STATUSES = new Set(["active", "blocked", "muted"]);

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId query param is required" },
        { status: 400 },
      );
    }
    const body = (await req.json().catch(() => ({}))) as { status?: string };
    const status = body.status?.trim();
    if (!status || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "status must be one of: active, blocked, muted" },
        { status: 400 },
      );
    }

    // Only the follower can mutate their own connection.
    const existing = await db.appConnection.findUnique({
      where: { id },
      select: { followerId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "connection not found" },
        { status: 404 },
      );
    }
    // The userId may be the follower's username or DB id — accept both.
    const isOwner =
      existing.followerId === userId ||
      existing.followerId === `u_${userId.toLowerCase().replace(/^@/, "")}`;
    if (!isOwner) {
      // Also try by circleId lookup for the caller.
      const caller = await db.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { circleId: userId },
            { circleId: { contains: userId } },
          ],
        },
        select: { id: true },
      });
      if (!caller || caller.id !== existing.followerId) {
        return NextResponse.json(
          { error: "only the follower can modify this connection" },
          { status: 403 },
        );
      }
    }

    const updated = await db.appConnection.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      updatedAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error("[/api/contacts/:id PATCH] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update contact" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId query param is required" },
        { status: 400 },
      );
    }

    const existing = await db.appConnection.findUnique({
      where: { id },
      select: { followerId: true },
    });
    if (!existing) {
      // Idempotent delete — return 200 with `{ ok: true, deleted: false }`.
      return NextResponse.json({ ok: true, deleted: false });
    }
    const isOwner =
      existing.followerId === userId ||
      existing.followerId === `u_${userId.toLowerCase().replace(/^@/, "")}`;
    if (!isOwner) {
      const caller = await db.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { circleId: userId },
            { circleId: { contains: userId } },
          ],
        },
        select: { id: true },
      });
      if (!caller || caller.id !== existing.followerId) {
        return NextResponse.json(
          { error: "only the follower can remove this connection" },
          { status: 403 },
        );
      }
    }

    await db.appConnection.delete({ where: { id } });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (err) {
    logger.error("[/api/contacts/:id DELETE] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to remove contact" },
      { status: 500 },
    );
  }
}

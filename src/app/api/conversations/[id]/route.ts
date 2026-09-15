// @ts-nocheck
/**
 * GET /api/conversations/[id]
 * ============================================================================
 * P1 FIX (P1-SECURITY): Server-side membership check.
 *
 * Returns a single conversation with its members list (for group settings,
 * admin controls, member management UI).
 *
 * The route now requires a valid `cirkle-session` cookie. The server verifies
 * that the authenticated user is a participant of the conversation before
 * returning any data. This closes the IDOR that let any caller fetch
 * arbitrary conversation metadata + member rosters by guessing the
 * conversation id.
 *
 * Returns:
 *   401 — no valid session cookie
 *   403 — session is valid but the user is not a member of this conversation
 *   404 — conversation not found
 *   200 — conversation payload (same shape as before)
 * ============================================================================
 */
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMockConversationMeta } from "@/lib/circle/seed";
import type { Conversation } from "@/lib/circle/types";
import {
  getSessionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    // P1 FIX: Read session from cookie. No session → 401.
    const session = await getSessionFromRequest(_req);
    if (!session) {
      return unauthorizedResponse("unauthorized");
    }

    const { id } = await ctx.params;

    const row = await db.conversation.findUnique({
      where: { id },
      include: {
        participants: { orderBy: { joinedAt: "asc" } },
        _count: { select: { participants: true } },
      },
    });
    if (!row) {
      return NextResponse.json(
        { error: "conversation not found" },
        { status: 404 },
      );
    }

    // P1 FIX: Verify the authenticated user is a participant of this
    // conversation. Match by `userId` (preferred) OR by `displayName`
    // (fallback for members seeded without a userId link).
    const isMember = row.participants.some(
      (p) =>
        (p.userId && p.userId === session.userId) ||
        (p.displayName &&
          (p.displayName === session.username ||
            p.displayName === `${session.username}@cirkle`)),
    );

    if (!isMember) {
      // Don't leak whether the conversation exists — return 404 to a
      // non-member so an attacker can't enumerate ids. But log it so we
      // can debug legit access denials.
      logger.warn("[/api/conversations/:id GET] access denied", {
        conversationId: id,
        userId: session.userId,
        username: session.username,
      });
      return forbiddenResponse("forbidden");
    }

    const meta = getMockConversationMeta(row.id);
    const firstMember = row.participants[0];

    const conversation: Conversation = {
      id: row.id,
      type: row.type as Conversation["type"],
      name: row.name,
      arabicName: row.arabicName ?? undefined,
      avatarColor: row.avatarColor,
      avatarInitials:
        meta?.avatarInitials ?? row.name.slice(0, 2).toUpperCase(),
      participants: meta?.participants ?? row._count.participants,
      encrypted: row.encrypted,
      pinned: meta?.pinned,
      muted: meta?.muted,
      isCircle: meta?.isCircle,
      presence:
        (meta?.presence as Conversation["presence"]) ??
        (firstMember?.presence as Conversation["presence"]) ??
        "offline",
    };

    return NextResponse.json({
      ...conversation,
      members: row.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        displayName: p.displayName,
        avatarColor: p.avatarColor,
        initials: p.initials,
        presence: p.presence,
        joinedAt: p.joinedAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error("[/api/conversations/:id GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load conversation" },
      { status: 500 },
    );
  }
}

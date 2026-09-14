import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded, getMockConversationMeta } from "@/lib/circle/seed";
import type { Conversation } from "@/lib/circle/types";

/**
 * GET /api/conversations/[id]
 * Returns a single conversation with its members list (for group settings,
 * admin controls, member management UI).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    // ensureSeeded removed — no mock data();
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

    const meta = getMockConversationMeta(row.id);
    const firstMember = row.participants[0];

    const conversation: Conversation = {
      id: row.id,
      type: row.type as Conversation["type"],
      name: row.name,
      arabicName: row.arabicName ?? undefined,
      avatarColor: row.avatarColor,
      avatarInitials: meta?.avatarInitials ?? row.name.slice(0, 2).toUpperCase(),
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

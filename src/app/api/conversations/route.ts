import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded, getMockConversationMeta } from "@/lib/circle/seed";
import { getRegionForCountry } from "@/lib/regions";
import type { Conversation } from "@/lib/circle/types";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * GET /api/conversations
 * Returns all conversations with last-message preview + unread count.
 * Shape: Conversation[] from types.ts.
 */
export async function GET(req: NextRequest) {
  try {
    // // ensureSeeded removed — no mock data();
    const regionCode = getRegionForCountry(
      req.headers.get("x-cirkle-country"),
    ).code;

    const rows = await db.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { participants: true } },
        participants: { take: 1, orderBy: { joinedAt: "asc" } },
      },
    });

    const convIds = rows.map((r) => r.id);

    // Pull the latest message per conversation in one query.
    const lastMessages = await db.message.findMany({
      where: { conversationId: { in: convIds } },
      orderBy: [{ conversationId: "asc" }, { createdAt: "desc" }],
    });
    const lastByConv = new Map<string, (typeof lastMessages)[number]>();
    for (const m of lastMessages) {
      if (!lastByConv.has(m.conversationId)) lastByConv.set(m.conversationId, m);
    }

    // Unread counts (any status other than "read").
    const unreadByConv = new Map<string, number>();
    if (convIds.length > 0) {
      const grouped = await db.message.groupBy({
        by: ["conversationId"],
        where: {
          conversationId: { in: convIds },
          status: { not: "read" },
        },
        _count: { _all: true },
      });
      for (const g of grouped) {
        unreadByConv.set(g.conversationId, g._count._all);
      }
    }

    const out: Conversation[] = rows.map((row) => {
      const meta = getMockConversationMeta(row.id);
      const last = lastByConv.get(row.id);
      const firstMember = row.participants[0];
      return {
        id: row.id,
        type: row.type as Conversation["type"],
        name: row.name,
        arabicName: row.arabicName ?? undefined,
        avatarColor: row.avatarColor,
        avatarInitials: meta?.avatarInitials ?? initialsFromName(row.name),
        participants: meta?.participants ?? row._count.participants,
        lastMessage: last?.body,
        lastSender: last?.senderName,
        lastTimestamp: last?.createdAt.toISOString(),
        unread: unreadByConv.get(row.id) ?? 0,
        encrypted: row.encrypted,
        pinned: meta?.pinned,
        muted: meta?.muted,
        isCircle: meta?.isCircle,
        presence:
          (meta?.presence as Conversation["presence"]) ??
          (firstMember?.presence as Conversation["presence"]) ??
          "offline",
      };
    });

    // Pinned float to top, then by lastTimestamp desc.
    out.sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      const ta = a.lastTimestamp ? Date.parse(a.lastTimestamp) : 0;
      const tb = b.lastTimestamp ? Date.parse(b.lastTimestamp) : 0;
      return tb - ta;
    });

    return NextResponse.json(out, {
      headers: { "X-Data-Region": regionCode },
    });
  } catch (err) {
    logger.error("[/api/conversations] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load conversations" },
      { status: 500 },
    );
  }
}

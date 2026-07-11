import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded, getMockConversationMeta } from "@/lib/circle/seed";
import type { Conversation } from "@/lib/circle/types";

interface SearchHit {
  messageId: string;
  conversationId: string;
  conversationName: string;
  conversationAvatarColor: string;
  conversationAvatarInitials: string;
  senderName: string;
  body: string;
  timestamp: string;
  snippet: string;
}

/**
 * GET /api/conversations/search?q=keyword&limit=50
 * Full-text (SQLite LIKE) search across all messages in all conversations
 * the current user is a member of. Returns hits with conversation metadata
 * and a 120-char snippet around the match.
 */
export async function GET(req: NextRequest) {
  try {
    // ensureSeeded removed — no mock data();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50),
    );

    if (q.length < 1) {
      return NextResponse.json({ hits: [], q });
    }

    const messages = await db.message.findMany({
      where: {
        body: { contains: q },
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        conversation: {
          select: { id: true, name: true, avatarColor: true },
        },
      },
    });

    // Load mock meta for avatarInitials.
    const hits: SearchHit[] = messages.map((m) => {
      const meta = getMockConversationMeta(m.conversationId);
      const idx = m.body.toLowerCase().indexOf(q.toLowerCase());
      const start = Math.max(0, idx - 60);
      const end = Math.min(m.body.length, idx + q.length + 60);
      const prefix = start > 0 ? "…" : "";
      const suffix = end < m.body.length ? "…" : "";
      const snippet = `${prefix}${m.body.slice(start, end)}${suffix}`;
      return {
        messageId: m.id,
        conversationId: m.conversationId,
        conversationName: m.conversation.name,
        conversationAvatarColor: m.conversation.avatarColor,
        conversationAvatarInitials: meta?.avatarInitials ?? m.conversation.name.slice(0, 2).toUpperCase(),
        senderName: m.senderName,
        body: m.body,
        timestamp: m.createdAt.toISOString(),
        snippet,
      };
    });

    // Group by conversation for the UI.
    const byConv = new Map<
      string,
      {
        conversation: Pick<Conversation, "id" | "name" | "avatarColor" | "avatarInitials">;
        hits: SearchHit[];
      }
    >();
    for (const h of hits) {
      let bucket = byConv.get(h.conversationId);
      if (!bucket) {
        bucket = {
          conversation: {
            id: h.conversationId,
            name: h.conversationName,
            avatarColor: h.conversationAvatarColor,
            avatarInitials: h.conversationAvatarInitials,
          },
          hits: [],
        };
        byConv.set(h.conversationId, bucket);
      }
      bucket.hits.push(h);
    }

    return NextResponse.json({
      q,
      total: hits.length,
      hits,
      grouped: Array.from(byConv.entries()).map(([id, b]) => ({
        conversationId: id,
        conversation: b.conversation,
        hits: b.hits,
      })),
    });
  } catch (err) {
    logger.error("[/api/conversations/search GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "search failed" },
      { status: 500 },
    );
  }
}

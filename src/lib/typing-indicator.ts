// @ts-nocheck
/**
 * typing-indicator.ts — B8 (part 2) Typing Indicators.
 *
 * Server-only library for tracking who is currently typing in each
 * conversation. A typing event is valid for `TYPING_TTL_MS` (3 seconds);
 * rows older than that are considered stale and excluded from
 * `getTypingUsers`. Stale rows are also opportunistically pruned on read.
 *
 * Backs:
 *   • POST /api/conversations/[id]/typing   (setTyping)
 *   • GET  /api/conversations/[id]/typing   (getTypingUsers)
 *
 * Storage: Prisma `TypingIndicator` (SQLite). @@unique([conversationId,
 * userId]) guarantees one indicator per user per conversation.
 */
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/** How long a typing event is considered "live". */
export const TYPING_TTL_MS = 3000;

export interface TypingUser {
  userId: string;
  conversationId: string;
  lastSeen: string;
  /** Milliseconds since lastSeen — useful for rendering "X is typing…". */
  ageMs: number;
}

function rowToTyping(row: {
  userId: string;
  conversationId: string;
  lastSeen: Date;
}, now: number): TypingUser {
  return {
    userId: row.userId,
    conversationId: row.conversationId,
    lastSeen: row.lastSeen.toISOString(),
    ageMs: now - row.lastSeen.getTime(),
  };
}

/**
 * Record that `userId` is typing in `conversationId` right now. Upserts the
 * indicator — sets lastSeen = new Date(). The TTL is enforced on read.
 */
export async function setTyping(
  conversationId: string,
  userId: string,
): Promise<{ ok: true }> {
  if (!conversationId) throw new Error("conversationId is required.");
  if (!userId) throw new Error("userId is required.");

  const existing = await db.typingIndicator.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });

  if (existing) {
    await db.typingIndicator.update({
      where: { id: existing.id },
      data: { lastSeen: new Date() },
    });
  } else {
    await db.typingIndicator.create({
      data: { conversationId, userId },
    });
  }

  logger.info("[typing-indicator] set", { conversationId, userId });
  return { ok: true };
}

/**
 * List the users currently typing in a conversation (i.e., whose lastSeen
 * is within TYPING_TTL_MS of now). Stale rows are pruned as a side effect
 * to keep the table from growing without bound.
 */
export async function getTypingUsers(conversationId: string): Promise<TypingUser[]> {
  if (!conversationId) throw new Error("conversationId is required.");
  const now = Date.now();
  const cutoff = new Date(now - TYPING_TTL_MS);

  const rows = await db.typingIndicator.findMany({
    where: { conversationId, lastSeen: { gt: cutoff } },
    orderBy: { lastSeen: "desc" },
  });

  // Opportunistic cleanup: delete rows older than 60s in this conversation.
  // Cheap enough to run on every read; keeps the table small.
  try {
    const staleCutoff = new Date(now - 60_000);
    await db.typingIndicator.deleteMany({
      where: { conversationId, lastSeen: { lt: staleCutoff } },
    });
  } catch {
    // Non-fatal — continue.
  }

  return rows.map((r) => rowToTyping(r, now));
}

/**
 * Clear a user's typing indicator (e.g., when they navigate away or send
 * the message). Optional — the indicator will auto-expire anyway.
 */
export async function clearTyping(
  conversationId: string,
  userId: string,
): Promise<{ cleared: boolean }> {
  if (!conversationId || !userId) return { cleared: false };
  const existing = await db.typingIndicator.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });
  if (!existing) return { cleared: false };
  await db.typingIndicator.delete({ where: { id: existing.id } });
  return { cleared: true };
}

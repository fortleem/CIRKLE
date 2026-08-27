// @ts-nocheck
/**
 * message-reactions.ts — B3 Message Reactions.
 *
 * Server-only library for adding/removing emoji reactions on chat messages.
 * Backs:
 *   • POST   /api/messages/[id]/reactions      (addReaction)
 *   • DELETE /api/messages/[id]/reactions      (removeReaction)
 *   • GET    /api/messages/[id]/reactions      (getReactionsForMessage)
 *
 * Storage: Prisma `MessageReaction` (SQLite). One row per (message, user,
 * emoji) tuple — enforced by @@unique. Toggling is handled by the API layer
 * (POST = add or no-op, DELETE = remove).
 *
 * Reaction palette (8 emojis) — keep in sync with the overlay picker.
 */
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/** The 8 supported reaction emojis. */
export const REACTION_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
  "🔥",
  "👏",
] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export function isValidEmoji(emoji: string): boolean {
  return (REACTION_EMOJIS as readonly string[]).includes(emoji);
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
}

function rowToReaction(row: {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}): Reaction {
  return {
    id: row.id,
    messageId: row.messageId,
    userId: row.userId,
    emoji: row.emoji,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Add a reaction. Idempotent: if (messageId, userId, emoji) already exists,
 * the existing row is returned without creating a duplicate (the
 * @@unique constraint is enforced at the DB layer too).
 */
export async function addReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<Reaction> {
  if (!messageId) throw new Error("messageId is required.");
  if (!userId) throw new Error("userId is required.");
  if (!isValidEmoji(emoji)) {
    throw new Error(`Unsupported emoji. Allowed: ${REACTION_EMOJIS.join(" ")}`);
  }

  const existing = await db.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
  });
  if (existing) {
    logger.info("[message-reactions] duplicate add", { messageId, userId, emoji });
    return rowToReaction(existing);
  }

  const row = await db.messageReaction.create({
    data: { messageId, userId, emoji },
  });
  logger.info("[message-reactions] added", { messageId, userId, emoji });
  return rowToReaction(row);
}

/**
 * Remove a reaction. No-op if it didn't exist.
 */
export async function removeReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<{ removed: boolean }> {
  if (!messageId || !userId) throw new Error("messageId and userId are required.");
  if (!isValidEmoji(emoji)) {
    throw new Error(`Unsupported emoji. Allowed: ${REACTION_EMOJIS.join(" ")}`);
  }

  const existing = await db.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
  });
  if (!existing) return { removed: false };

  await db.messageReaction.delete({ where: { id: existing.id } });
  logger.info("[message-reactions] removed", { messageId, userId, emoji });
  return { removed: true };
}

/**
 * List all reactions for a single message, newest first.
 */
export async function getReactionsForMessage(messageId: string): Promise<Reaction[]> {
  if (!messageId) throw new Error("messageId is required.");
  const rows = await db.messageReaction.findMany({
    where: { messageId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(rowToReaction);
}

/**
 * Fetch reactions for many messages at once (used by the Wasl screen to
 * hydrate reactions on a list of messages without N+1 queries).
 */
export async function getReactionsForMessages(
  messageIds: string[],
): Promise<Record<string, Reaction[]>> {
  if (!messageIds || messageIds.length === 0) return {};
  const rows = await db.messageReaction.findMany({
    where: { messageId: { in: messageIds } },
    orderBy: { createdAt: "asc" },
  });
  const out: Record<string, Reaction[]> = {};
  for (const row of rows) {
    const arr = out[row.messageId] ?? [];
    arr.push(rowToReaction(row));
    out[row.messageId] = arr;
  }
  return out;
}

/**
 * Group reactions on a message by emoji. Useful for rendering compact
 * "👍 3  ❤️ 2" chips under a message bubble.
 */
export async function getReactionGroupsForMessage(
  messageId: string,
): Promise<ReactionGroup[]> {
  const reactions = await getReactionsForMessage(messageId);
  const groups = new Map<string, ReactionGroup>();
  for (const r of reactions) {
    const g = groups.get(r.emoji) ?? { emoji: r.emoji, count: 0, userIds: [] };
    g.count += 1;
    g.userIds.push(r.userId);
    groups.set(r.emoji, g);
  }
  // Sort by count desc, then by emoji order in REACTION_EMOJIS.
  return Array.from(groups.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return (
      REACTION_EMOJIS.indexOf(a.emoji as ReactionEmoji) -
      REACTION_EMOJIS.indexOf(b.emoji as ReactionEmoji)
    );
  });
}

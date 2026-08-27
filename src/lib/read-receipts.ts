// @ts-nocheck
/**
 * read-receipts.ts — B8 (part 1) Read Receipts.
 *
 * Server-only library for tracking the latest message each user has read in
 * a conversation. One row per (conversation, reader) — upserted on every
 * `markAsRead`. Unread count is derived by counting messages in the
 * conversation with createdAt > last-read-at.
 *
 * Backs:
 *   • POST /api/conversations/[id]/read   (markAsRead)
 *   • GET  /api/conversations/[id]/read   (getReadReceipts)
 *
 * Storage: Prisma `ReadReceipt` (SQLite). @@unique([conversationId, readerId])
 * guarantees one receipt per reader per conversation.
 */
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface ReadReceipt {
  id: string;
  conversationId: string;
  messageId: string;
  readerId: string;
  readAt: string;
}

function rowToReceipt(row: {
  id: string;
  conversationId: string;
  messageId: string;
  readerId: string;
  readAt: Date;
}): ReadReceipt {
  return {
    id: row.id,
    conversationId: row.conversationId,
    messageId: row.messageId,
    readerId: row.readerId,
    readAt: row.readAt.toISOString(),
  };
}

/**
 * Mark a conversation as read up to (and including) `messageId` for the
 * given reader. Upserts the receipt — if a receipt already exists, it's
 * updated to point at the new messageId with a fresh readAt.
 */
export async function markAsRead(
  conversationId: string,
  readerId: string,
  messageId: string,
): Promise<ReadReceipt> {
  if (!conversationId) throw new Error("conversationId is required.");
  if (!readerId) throw new Error("readerId is required.");
  if (!messageId) throw new Error("messageId is required.");

  // Verify the message belongs to this conversation — prevents callers from
  // fabricating a messageId that doesn't belong here.
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) throw new Error("Message not found.");
  if (message.conversationId !== conversationId) {
    throw new Error("Message does not belong to this conversation.");
  }

  const existing = await db.readReceipt.findUnique({
    where: {
      conversationId_readerId: { conversationId, readerId },
    },
  });

  if (existing) {
    const updated = await db.readReceipt.update({
      where: { id: existing.id },
      data: { messageId, readAt: new Date() },
    });
    logger.info("[read-receipts] updated", { conversationId, readerId, messageId });
    return rowToReceipt(updated);
  }

  const row = await db.readReceipt.create({
    data: { conversationId, readerId, messageId },
  });
  logger.info("[read-receipts] created", { conversationId, readerId, messageId });
  return rowToReceipt(row);
}

/**
 * List every reader's latest-read message in a conversation.
 */
export async function getReadReceipts(conversationId: string): Promise<ReadReceipt[]> {
  if (!conversationId) throw new Error("conversationId is required.");
  const rows = await db.readReceipt.findMany({
    where: { conversationId },
    orderBy: { readAt: "desc" },
  });
  return rows.map(rowToReceipt);
}

/**
 * Count unread messages in a conversation for a reader. Unread = messages
 * with createdAt > the reader's last-read message createdAt. Returns 0 if
 * the reader has no receipt (treats everything as unread in that case).
 */
export async function getUnreadCount(
  conversationId: string,
  readerId: string,
): Promise<number> {
  if (!conversationId || !readerId) return 0;

  const receipt = await db.readReceipt.findUnique({
    where: {
      conversationId_readerId: { conversationId, readerId },
    },
  });

  if (!receipt) {
    // No receipt — every message in the conversation is unread.
    return db.message.count({ where: { conversationId } });
  }

  // Find the readAt of the last-read message — we use the receipt's
  // messageId.createdAt as the cutoff (more reliable than readAt which can
  // drift if the device clock is off).
  const lastRead = await db.message.findUnique({
    where: { id: receipt.messageId },
    select: { createdAt: true },
  });
  const cutoff = lastRead?.createdAt ?? receipt.readAt;

  return db.message.count({
    where: {
      conversationId,
      createdAt: { gt: cutoff },
    },
  });
}

/**
 * Bulk unread counts for many conversations of one reader. Returns a map
 * of conversationId → unread count. Conversations with no receipt count
 * every message as unread.
 */
export async function getUnreadCountsForReader(
  conversationIds: string[],
  readerId: string,
): Promise<Record<string, number>> {
  if (!conversationIds || conversationIds.length === 0) return {};
  if (!readerId) {
    return Object.fromEntries(conversationIds.map((id) => [id, 0]));
  }

  const receipts = await db.readReceipt.findMany({
    where: { conversationId: { in: conversationIds }, readerId },
  });

  const out: Record<string, number> = {};
  for (const convId of conversationIds) {
    const r = receipts.find((x) => x.conversationId === convId);
    if (!r) {
      const n = await db.message.count({ where: { conversationId: convId } });
      out[convId] = n;
    } else {
      const lastRead = await db.message.findUnique({
        where: { id: r.messageId },
        select: { createdAt: true },
      });
      const cutoff = lastRead?.createdAt ?? r.readAt;
      const n = await db.message.count({
        where: { conversationId: convId, createdAt: { gt: cutoff } },
      });
      out[convId] = n;
    }
  }
  return out;
}

// @ts-nocheck
/**
 * reply-thread.ts — B7 Reply Threading.
 *
 * Server-only library for linking a reply message to its parent. The reply
 * itself is a normal Message row (created via the existing Wasl message
 * flow); this library records the parent↔reply edge in a `MessageReply`
 * table so threads can be reconstructed.
 *
 * Backs:
 *   • GET /api/messages/[id]/thread   (getThreadReplies)
 *
 * Storage: Prisma `MessageReply` (SQLite). @@index([parentMessageId]) for
 * fast thread fetches.
 */
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/** Max chain walk when computing thread depth (prevents infinite loops). */
export const MAX_DEPTH_WALK = 50;

export interface ThreadReply {
  id: string;
  parentMessageId: string;
  replyMessageId: string;
  createdAt: string;
  /** Convenience: the reply message's body/createdAt, joined in by the lib. */
  replyMessage?: {
    id: string;
    body: string | null;
    senderName: string;
    senderInitials: string;
    senderColor: string;
    createdAt: string;
  } | null;
}

function rowToReply(row: {
  id: string;
  parentMessageId: string;
  replyMessageId: string;
  createdAt: Date;
}): ThreadReply {
  return {
    id: row.id,
    parentMessageId: row.parentMessageId,
    replyMessageId: row.replyMessageId,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Link a reply message to its parent. Idempotent — if the (parent, reply)
 * edge already exists, returns the existing row.
 *
 * Call this AFTER creating the reply Message row, using the new message's
 * id as `replyMessageId`.
 */
export async function createReply(
  parentMessageId: string,
  replyMessageId: string,
): Promise<ThreadReply> {
  if (!parentMessageId) throw new Error("parentMessageId is required.");
  if (!replyMessageId) throw new Error("replyMessageId is required.");
  if (parentMessageId === replyMessageId) {
    throw new Error("A message cannot be a reply to itself.");
  }

  const parent = await db.message.findUnique({ where: { id: parentMessageId } });
  if (!parent) throw new Error("Parent message not found.");
  const reply = await db.message.findUnique({ where: { id: replyMessageId } });
  if (!reply) throw new Error("Reply message not found.");
  if (parent.conversationId !== reply.conversationId) {
    throw new Error("Parent and reply must be in the same conversation.");
  }

  const existing = await db.messageReply.findFirst({
    where: { parentMessageId, replyMessageId },
  });
  if (existing) return rowToReply(existing);

  const row = await db.messageReply.create({
    data: { parentMessageId, replyMessageId },
  });
  logger.info("[reply-thread] linked", { parentMessageId, replyMessageId });
  return rowToReply(row);
}

/**
 * List every reply attached to a parent message, oldest first. Each reply
 * is enriched with the reply message's body + sender metadata so the
 * overlay can render the thread without N+1 queries.
 */
export async function getThreadReplies(parentMessageId: string): Promise<ThreadReply[]> {
  if (!parentMessageId) throw new Error("parentMessageId is required.");
  const rows = await db.messageReply.findMany({
    where: { parentMessageId },
    orderBy: { createdAt: "asc" },
  });
  if (rows.length === 0) return [];

  const replyIds = rows.map((r) => r.replyMessageId);
  const messages = await db.message.findMany({
    where: { id: { in: replyIds } },
  });
  const byId = new Map(messages.map((m) => [m.id, m]));

  return rows.map((r) => {
    const reply = byId.get(r.replyMessageId);
    return {
      ...rowToReply(r),
      replyMessage: reply
        ? {
            id: reply.id,
            body: reply.body,
            senderName: reply.senderName,
            senderInitials: reply.senderInitials,
            senderColor: reply.senderColor,
            createdAt: reply.createdAt.toISOString(),
          }
        : null,
    };
  });
}

/**
 * Count the number of direct replies attached to a parent. Used to render
 * "5 replies" chips under a message bubble without fetching every body.
 */
export async function getThreadReplyCount(parentMessageId: string): Promise<number> {
  if (!parentMessageId) return 0;
  return db.messageReply.count({ where: { parentMessageId } });
}

/**
 * Walk up the chain: given a message, return the depth of the thread it
 * belongs to. A top-level message (no parent) has depth 0. A reply to a
 * top-level message has depth 1. A reply to that reply has depth 2.
 *
 * Capped at MAX_DEPTH_WALK to prevent infinite loops if the data has a
 * cycle (shouldn't happen given createReply's same-conversation check, but
 * defensive).
 */
export async function getThreadDepth(messageId: string): Promise<number> {
  if (!messageId) return 0;
  let depth = 0;
  let cursor: string | null = messageId;
  const seen = new Set<string>();

  while (depth < MAX_DEPTH_WALK) {
    if (!cursor || seen.has(cursor)) break;
    seen.add(cursor);
    const edge = await db.messageReply.findFirst({
      where: { replyMessageId: cursor },
      select: { parentMessageId: true },
    });
    if (!edge) break;
    depth += 1;
    cursor = edge.parentMessageId;
  }
  return depth;
}

/**
 * Get the root (top-most ancestor) message of the thread that `messageId`
 * belongs to. Returns null if `messageId` is itself a root (depth 0).
 */
export async function getThreadRoot(messageId: string): Promise<string | null> {
  if (!messageId) return null;
  let cursor: string | null = messageId;
  let root: string | null = null;
  const seen = new Set<string>();
  for (let i = 0; i < MAX_DEPTH_WALK; i++) {
    if (!cursor || seen.has(cursor)) break;
    seen.add(cursor);
    const edge = await db.messageReply.findFirst({
      where: { replyMessageId: cursor },
      select: { parentMessageId: true },
    });
    if (!edge) {
      root = cursor;
      break;
    }
    cursor = edge.parentMessageId;
  }
  return root === messageId ? null : root;
}

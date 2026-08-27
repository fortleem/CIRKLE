// @ts-nocheck
/**
 * message-editing.ts — B4 Message Editing with History.
 *
 * Server-only library for editing a chat message's body while preserving
 * the previous body versions in a `MessageEditHistory` audit table.
 *
 * Backs:
 *   • POST /api/messages/[id]/edit   (editMessage)
 *   • GET  /api/messages/[id]/edit   (getEditHistory)
 *
 * Edit window: 15 minutes from when the message was originally created.
 * After that, `canEdit()` returns false and the API refuses the edit.
 *
 * Storage: Prisma `Message` (existing model) for the live body +
 * `MessageEditHistory` for the audit trail (one row per previous body).
 */
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/** Minutes after creation during which a message is still editable. */
export const EDIT_WINDOW_MINUTES = 15;

/** Maximum body length (matches Wasl composer cap). */
export const MAX_BODY_LENGTH = 4096;

export interface EditHistoryEntry {
  id: string;
  messageId: string;
  oldBody: string;
  editedAt: string;
}

export interface EditResult {
  messageId: string;
  newBody: string;
  version: number;
  editedAt: string;
}

function rowToHistory(row: {
  id: string;
  messageId: string;
  oldBody: string;
  editedAt: Date;
}): EditHistoryEntry {
  return {
    id: row.id,
    messageId: row.messageId,
    oldBody: row.oldBody,
    editedAt: row.editedAt.toISOString(),
  };
}

/**
 * Can the given user edit the given message right now?
 *  - The user must be the sender (senderId === userId).
 *  - The message must be within EDIT_WINDOW_MINUTES of its createdAt.
 *
 * Pass the message's `createdAt` Date to avoid re-querying when the caller
 * already has the row.
 */
export function canEdit(
  message: { senderId: string | null; createdAt: Date } | null,
  userId: string,
  now: Date = new Date(),
): boolean {
  if (!message) return false;
  if (!message.senderId || message.senderId !== userId) return false;
  const ageMs = now.getTime() - message.createdAt.getTime();
  return ageMs <= EDIT_WINDOW_MINUTES * 60 * 1000;
}

/**
 * Edit a message. Saves the current body to MessageEditHistory, then
 * overwrites the live body with `newBody`. Returns the new version number
 * (1 = first edit, 2 = second edit, …) and ISO timestamp.
 *
 * Throws if:
 *  - messageId / userId / newBody missing
 *  - message not found
 *  - user is not the sender
 *  - edit window expired
 *  - newBody is empty or exceeds MAX_BODY_LENGTH
 */
export async function editMessage(
  messageId: string,
  userId: string,
  newBody: string,
): Promise<EditResult> {
  if (!messageId) throw new Error("messageId is required.");
  if (!userId) throw new Error("userId is required.");
  const body = (newBody ?? "").trim();
  if (!body) throw new Error("newBody cannot be empty.");
  if (body.length > MAX_BODY_LENGTH) {
    throw new Error(`newBody exceeds ${MAX_BODY_LENGTH} characters.`);
  }

  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) throw new Error("Message not found.");
  if (!canEdit(message, userId)) {
    if (message.senderId !== userId) {
      throw new Error("You can only edit your own messages.");
    }
    throw new Error(
      `Edit window expired. Messages can only be edited within ${EDIT_WINDOW_MINUTES} minutes of sending.`,
    );
  }

  // Snapshot the previous body (may be null for media-only messages).
  const previousBody = message.body ?? "";

  // Push the previous body to history, then overwrite.
  await db.messageEditHistory.create({
    data: { messageId, oldBody: previousBody },
  });

  const updated = await db.message.update({
    where: { id: messageId },
    data: { body },
  });

  // Version = number of history rows after this edit.
  const version = await db.messageEditHistory.count({
    where: { messageId },
  });

  logger.info("[message-editing] edited", { messageId, userId, version });
  return {
    messageId,
    newBody: body,
    version,
    editedAt: updated.updatedAt.toISOString(),
  };
}

/**
 * List the edit history for a message (oldest first — i.e., previous body
 * versions in the order they were replaced).
 */
export async function getEditHistory(messageId: string): Promise<EditHistoryEntry[]> {
  if (!messageId) throw new Error("messageId is required.");
  const rows = await db.messageEditHistory.findMany({
    where: { messageId },
    orderBy: { editedAt: "asc" },
  });
  return rows.map(rowToHistory);
}

/**
 * Convenience: fetch the message + its edit history in one call. Useful for
 * the overlay which shows both the current body and the history timeline.
 */
export async function getMessageWithHistory(messageId: string): Promise<{
  messageId: string;
  currentBody: string | null;
  createdAt: string;
  history: EditHistoryEntry[];
}> {
  if (!messageId) throw new Error("messageId is required.");
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) throw new Error("Message not found.");
  const history = await getEditHistory(messageId);
  return {
    messageId,
    currentBody: message.body,
    createdAt: message.createdAt.toISOString(),
    history,
  };
}

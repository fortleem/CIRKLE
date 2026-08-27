// @ts-nocheck
/**
 * Saved Messages Channel (F2) — personal "Saved" channel.
 *
 * Any user can save any message (from any conversation) into a personal
 * "Saved" channel. Saves can include an optional note. Saved messages
 * support search + filter.
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, find, remove, nowISO } from "@/lib/feature-store";

export interface SavedMessage {
  id: string;
  userId: string;
  messageId: string;
  conversationId: string;
  note: string | null;
  createdAt: string;
}

const STORE = "savedMessage";

export interface SaveInput {
  userId: string;
  messageId: string;
  conversationId: string;
  note?: string;
}

export async function saveMessage(input: SaveInput): Promise<SavedMessage> {
  const userId = (input.userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!userId) throw new Error("userId is required");
  const messageId = (input.messageId || "").trim();
  if (!messageId) throw new Error("messageId is required");
  const conversationId = (input.conversationId || "").trim();
  if (!conversationId) throw new Error("conversationId is required");
  // Idempotent: if already saved, just update the note
  const existing = find<SavedMessage>(
    STORE,
    (s) => s.userId === userId && s.messageId === messageId,
  )[0];
  if (existing) {
    const note = input.note ? input.note.trim().slice(0, 280) : existing.note;
    return { ...existing, note };
  }
  const rec: SavedMessage = {
    id: `saved_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    userId,
    messageId,
    conversationId,
    note: input.note ? input.note.trim().slice(0, 280) : null,
    createdAt: nowISO(),
  };
  put(STORE, rec);
  return rec;
}

export async function unsaveMessage(userId: string, messageId: string): Promise<boolean> {
  const uid = (userId || "").trim().toLowerCase().replace(/^@/, "");
  const existing = find<SavedMessage>(
    STORE,
    (s) => s.userId === uid && s.messageId === messageId,
  )[0];
  if (!existing) return false;
  return remove(STORE, existing.id);
}

export async function unsaveById(id: string): Promise<boolean> {
  return remove(STORE, id);
}

export interface SavedMessageFilter {
  query?: string;
  conversationId?: string;
  limit?: number;
}

export async function getSavedMessages(
  userId: string,
  filter: SavedMessageFilter = {},
): Promise<SavedMessage[]> {
  const uid = (userId || "").trim().toLowerCase().replace(/^@/, "");
  let rows = find<SavedMessage>(STORE, (s) => s.userId === uid);
  if (filter.conversationId) {
    rows = rows.filter((s) => s.conversationId === filter.conversationId);
  }
  if (filter.query) {
    const q = filter.query.toLowerCase();
    rows = rows.filter(
      (s) =>
        (s.note ?? "").toLowerCase().includes(q) ||
        s.messageId.toLowerCase().includes(q) ||
        s.conversationId.toLowerCase().includes(q),
    );
  }
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const limit = Math.max(1, Math.min(filter.limit ?? 100, 500));
  return rows.slice(0, limit);
}

export async function getSavedCount(userId: string): Promise<number> {
  const uid = (userId || "").trim().toLowerCase().replace(/^@/, "");
  return find<SavedMessage>(STORE, (s) => s.userId === uid).length;
}

export async function isSaved(userId: string, messageId: string): Promise<boolean> {
  const uid = (userId || "").trim().toLowerCase().replace(/^@/, "");
  const mid = (messageId || "").trim();
  return find<SavedMessage>(STORE, (s) => s.userId === uid && s.messageId === mid).length > 0;
}

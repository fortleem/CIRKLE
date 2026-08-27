// @ts-nocheck
/**
 * Pinned Messages (F3) — pin important messages in a conversation.
 *
 * Pinning a message stores it in a per-conversation pinned list. Pinned
 * messages are typically rendered at the top of the chat view.
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, find, remove, nowISO } from "@/lib/feature-store";

export interface PinnedMessage {
  id: string;
  conversationId: string;
  messageId: string;
  pinnedBy: string;
  pinnedAt: string;
}

const STORE = "pinnedMessage";

export interface PinInput {
  conversationId: string;
  messageId: string;
  pinnedBy: string;
}

export async function pinMessage(input: PinInput): Promise<PinnedMessage> {
  const conversationId = (input.conversationId || "").trim();
  if (!conversationId) throw new Error("conversationId is required");
  const messageId = (input.messageId || "").trim();
  if (!messageId) throw new Error("messageId is required");
  const pinnedBy = (input.pinnedBy || "").trim().toLowerCase().replace(/^@/, "");
  if (!pinnedBy) throw new Error("pinnedBy is required");
  // Idempotent: if already pinned, return the existing record
  const existing = find<PinnedMessage>(
    STORE,
    (p) => p.conversationId === conversationId && p.messageId === messageId,
  )[0];
  if (existing) return existing;
  // Cap: only 5 pinned messages per conversation
  const convPins = await getPinnedMessages(conversationId);
  if (convPins.length >= 5) {
    throw new Error("a conversation can have at most 5 pinned messages");
  }
  const rec: PinnedMessage = {
    id: `pin_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    conversationId,
    messageId,
    pinnedBy,
    pinnedAt: nowISO(),
  };
  put(STORE, rec);
  return rec;
}

export async function unpinMessage(
  conversationId: string,
  messageId: string,
): Promise<boolean> {
  const existing = find<PinnedMessage>(
    STORE,
    (p) => p.conversationId === conversationId && p.messageId === messageId,
  )[0];
  if (!existing) return false;
  return remove(STORE, existing.id);
}

export async function unpinById(id: string): Promise<boolean> {
  return remove(STORE, id);
}

export async function getPinnedMessages(conversationId: string): Promise<PinnedMessage[]> {
  const cid = (conversationId || "").trim();
  return find<PinnedMessage>(STORE, (p) => p.conversationId === cid)
    .sort((a, b) => (a.pinnedAt < b.pinnedAt ? 1 : -1));
}

export async function isPinned(conversationId: string, messageId: string): Promise<boolean> {
  const cid = (conversationId || "").trim();
  const mid = (messageId || "").trim();
  return find<PinnedMessage>(STORE, (p) => p.conversationId === cid && p.messageId === mid).length > 0;
}

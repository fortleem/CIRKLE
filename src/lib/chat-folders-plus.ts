// @ts-nocheck
/**
 * Chat Folders — PLUS (F1+).
 *
 * Polish layer on top of `chat-folders.ts`.
 * Adds: nested folders (parent/child, max depth 2), smart filters
 * (auto-folder by unread count / mention count / message type),
 * folder sharing (read-only share URL), and bulk move operations.
 *
 * Storage: in-memory feature-store (Prisma schema frozen for this task).
 */
import "server-only";
import { get, put, find, findOne, all, remove, update, nowISO } from "@/lib/feature-store";
import {
  createFolder as baseCreateFolder,
  getFolders as baseGetFolders,
  addConversationToFolder as baseAdd,
  type ChatFolder,
} from "@/lib/chat-folders";

/** A nested folder entry — extends the flat `ChatFolder` with optional parent. */
export interface NestedFolder extends ChatFolder {
  parentId: string | null;
  childrenIds: string[];
}

/** Smart-filter rule that auto-assigns conversations to folders. */
export interface FolderSmartFilter {
  id: string;
  folderId: string;
  userId: string;
  rule: "unread_gt" | "mention_eq" | "type_eq" | "last_activity_within";
  param: string; // e.g. "5" for unread_gt:5, "mention" for mention_eq, "group" for type_eq
  createdAt: string;
}

/** A shared folder link (read-only). */
export interface SharedFolderLink {
  id: string;
  folderId: string;
  ownerId: string;
  shareCode: string;
  viewCount: number;
  expiresAt: string | null;
  createdAt: string;
}

const NESTED = "chatFolderNested";
const FILTERS = "chatFolderSmartFilter";
const SHARES = "chatFolderShareLink";

const MAX_DEPTH = 2;

function normalizeUser(u: string): string {
  return (u || "").trim().toLowerCase().replace(/^@/, "");
}

export interface CreateNestedFolderInput {
  userId: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
}

/** Creates a folder — uses the base impl, then layers nesting metadata. */
export async function createNestedFolder(input: CreateNestedFolderInput): Promise<NestedFolder> {
  const userId = normalizeUser(input.userId);
  if (!userId) throw new Error("userId is required");
  const name = (input.name || "").trim();
  if (!name) throw new Error("folder name is required");
  // Check parent validity
  let parentId: string | null = null;
  if (input.parentId) {
    const parent = get<NestedFolder>(NESTED, input.parentId);
    if (!parent) throw new Error("parent folder not found");
    if (parent.userId !== userId) throw new Error("parent folder does not belong to user");
    // Compute depth
    const depth = await folderDepth(input.parentId);
    if (depth + 1 >= MAX_DEPTH) {
      throw new Error(`max folder depth is ${MAX_DEPTH}`);
    }
    parentId = parent.id;
  }
  // Use base impl
  const base = await baseCreateFolder({ userId, name, icon: input.icon, color: input.color });
  const nested: NestedFolder = {
    ...base,
    parentId,
    childrenIds: [],
  };
  put(NESTED, nested);
  // Link to parent
  if (parentId) {
    const parent = get<NestedFolder>(NESTED, parentId);
    if (parent) {
      update<NestedFolder>(NESTED, parentId, { childrenIds: [...parent.childrenIds, nested.id] });
    }
  }
  return nested;
}

export async function folderDepth(folderId: string): Promise<number> {
  let depth = 0;
  let cur = get<NestedFolder>(NESTED, folderId);
  while (cur?.parentId) {
    depth += 1;
    cur = get<NestedFolder>(NESTED, cur.parentId);
    if (depth > 10) break; // safety
  }
  return depth;
}

export async function getNestedFolders(userId: string): Promise<NestedFolder[]> {
  const uid = normalizeUser(userId);
  if (!uid) return [];
  // Also reconcile with the base store — any folders in the base store but not
  // in the nested store get a "promoted" entry.
  const baseFolders = await baseGetFolders(uid);
  for (const bf of baseFolders) {
    if (!get<NestedFolder>(NESTED, bf.id)) {
      put<NestedFolder>(NESTED, { ...bf, parentId: null, childrenIds: [] });
    }
  }
  return find<NestedFolder>(NESTED, (f) => f.userId === uid).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getFolderTree(userId: string): Promise<Array<NestedFolder & { children: NestedFolder[] }>> {
  const all = await getNestedFolders(userId);
  const roots = all.filter((f) => !f.parentId);
  return roots.map((r) => ({
    ...r,
    children: all.filter((c) => c.parentId === r.id),
  }));
}

export async function moveFolder(folderId: string, newParentId: string | null): Promise<NestedFolder | null> {
  const cur = get<NestedFolder>(NESTED, folderId);
  if (!cur) return null;
  if (newParentId === folderId) throw new Error("cannot move folder into itself");
  if (newParentId) {
    // Detect cycles
    let p: NestedFolder | null = get<NestedFolder>(NESTED, newParentId);
    while (p) {
      if (p.id === folderId) throw new Error("cycle detected");
      p = p.parentId ? get<NestedFolder>(NESTED, p.parentId) : null;
    }
    const depth = await folderDepth(newParentId);
    if (depth + 1 >= MAX_DEPTH) throw new Error(`max folder depth is ${MAX_DEPTH}`);
    // Remove from old parent
    if (cur.parentId) {
      const oldParent = get<NestedFolder>(NESTED, cur.parentId);
      if (oldParent) {
        update<NestedFolder>(NESTED, oldParent.id, {
          childrenIds: oldParent.childrenIds.filter((c) => c !== folderId),
        });
      }
    }
    // Add to new parent
    const newParent = get<NestedFolder>(NESTED, newParentId);
    if (newParent) {
      update<NestedFolder>(NESTED, newParent.id, {
        childrenIds: [...newParent.childrenIds, folderId],
      });
    }
  } else {
    if (cur.parentId) {
      const oldParent = get<NestedFolder>(NESTED, cur.parentId);
      if (oldParent) {
        update<NestedFolder>(NESTED, oldParent.id, {
          childrenIds: oldParent.childrenIds.filter((c) => c !== folderId),
        });
      }
    }
  }
  return update<NestedFolder>(NESTED, folderId, { parentId: newParentId });
}

/** Smart-filter rule — auto-assigns conversations matching the rule. */
export interface CreateSmartFilterInput {
  folderId: string;
  userId: string;
  rule: FolderSmartFilter["rule"];
  param: string;
}

export async function createSmartFilter(input: CreateSmartFilterInput): Promise<FolderSmartFilter> {
  const folder = get<NestedFolder>(NESTED, input.folderId);
  if (!folder) throw new Error("folder not found");
  const uid = normalizeUser(input.userId);
  if (folder.userId !== uid) throw new Error("folder does not belong to user");
  // Idempotent
  const existing = findOne<FolderSmartFilter>(
    FILTERS,
    (f) => f.folderId === input.folderId && f.rule === input.rule && f.param === input.param,
  );
  if (existing) return existing;
  const filter: FolderSmartFilter = {
    id: `sf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    folderId: input.folderId,
    userId: uid,
    rule: input.rule,
    param: input.param,
    createdAt: nowISO(),
  };
  put(FILTERS, filter);
  return filter;
}

export async function listSmartFilters(userId: string): Promise<FolderSmartFilter[]> {
  const uid = normalizeUser(userId);
  if (!uid) return [];
  return find<FolderSmartFilter>(FILTERS, (f) => f.userId === uid);
}

export async function listSmartFiltersForFolder(folderId: string): Promise<FolderSmartFilter[]> {
  return find<FolderSmartFilter>(FILTERS, (f) => f.folderId === folderId);
}

export async function deleteSmartFilter(filterId: string): Promise<boolean> {
  return remove(FILTERS, filterId);
}

/** Apply smart filters to a list of conversations — returns the folder assignments. */
export interface ConversationSignal {
  conversationId: string;
  unreadCount: number;
  mentionCount: number;
  type: "direct" | "group" | "channel";
  lastActivityAt: string;
}

export async function applySmartFilters(
  userId: string,
  signals: ConversationSignal[],
): Promise<{ folderId: string; conversationIds: string[] }[]> {
  const filters = await listSmartFilters(userId);
  const result: { folderId: string; conversationIds: string[] }[] = [];
  for (const filter of filters) {
    const matched = signals.filter((s) => {
      switch (filter.rule) {
        case "unread_gt":
          return s.unreadCount > parseInt(filter.param, 10) || 0;
        case "mention_eq":
          return s.mentionCount > 0;
        case "type_eq":
          return s.type === filter.param;
        case "last_activity_within": {
          const hoursAgo = parseInt(filter.param, 10) || 24;
          const cutoff = Date.now() - hoursAgo * 60 * 60 * 1000;
          return new Date(s.lastActivityAt).getTime() >= cutoff;
        }
        default:
          return false;
      }
    });
    if (matched.length > 0) {
      for (const m of matched) {
        await baseAdd(filter.folderId, m.conversationId, userId);
      }
      result.push({ folderId: filter.folderId, conversationIds: matched.map((m) => m.conversationId) });
    }
  }
  return result;
}

/** Folder sharing — read-only public link. */
export async function createShareLink(input: {
  folderId: string;
  ownerId: string;
  expiresInHours?: number;
}): Promise<SharedFolderLink> {
  const folder = get<NestedFolder>(NESTED, input.folderId);
  if (!folder) throw new Error("folder not found");
  const owner = normalizeUser(input.ownerId);
  if (folder.userId !== owner) throw new Error("folder does not belong to user");
  // Idempotent — return existing if any
  const existing = findOne<SharedFolderLink>(SHARES, (s) => s.folderId === input.folderId && s.expiresAt === null);
  if (existing) return existing;
  const share: SharedFolderLink = {
    id: `share_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    folderId: input.folderId,
    ownerId: owner,
    shareCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
    viewCount: 0,
    expiresAt: input.expiresInHours
      ? new Date(Date.now() + input.expiresInHours * 3600_000).toISOString()
      : null,
    createdAt: nowISO(),
  };
  put(SHARES, share);
  return share;
}

export async function getShareLink(shareCode: string): Promise<SharedFolderLink | null> {
  const link = findOne<SharedFolderLink>(SHARES, (s) => s.shareCode.toUpperCase() === shareCode.toUpperCase());
  if (!link) return null;
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) return null;
  // Bump view count
  return update<SharedFolderLink>(SHARES, link.id, { viewCount: link.viewCount + 1 });
}

export async function listShareLinks(ownerId: string): Promise<SharedFolderLink[]> {
  const uid = normalizeUser(ownerId);
  if (!uid) return [];
  return find<SharedFolderLink>(SHARES, (s) => s.ownerId === uid)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function revokeShareLink(shareId: string): Promise<boolean> {
  return remove(SHARES, shareId);
}

/** Bulk move — assign multiple conversations to a folder at once. */
export async function bulkAssignConversations(
  folderId: string,
  conversationIds: string[],
  userId: string,
): Promise<{ assigned: number; skipped: number }> {
  let assigned = 0;
  let skipped = 0;
  for (const cid of conversationIds) {
    try {
      await baseAdd(folderId, cid, userId);
      assigned += 1;
    } catch {
      skipped += 1;
    }
  }
  return { assigned, skipped };
}

/** Folder stats — total conversations, last activity, share count. */
export interface FolderStats {
  folderId: string;
  conversationCount: number;
  shareCount: number;
  smartFilterCount: number;
  childFolderCount: number;
}

export async function getFolderStats(folderId: string, userId: string): Promise<FolderStats> {
  const uid = normalizeUser(userId);
  const folder = get<NestedFolder>(NESTED, folderId);
  if (!folder || folder.userId !== uid) {
    return { folderId, conversationCount: 0, shareCount: 0, smartFilterCount: 0, childFolderCount: 0 };
  }
  // Conversation count requires walking assignments
  const baseFolders = await baseGetFolders(uid);
  // We can't directly query assignments here without importing the base
  // assignment query — use the exported helper from base lib
  const { getConversationsInFolder } = await import("@/lib/chat-folders");
  const convs = await getConversationsInFolder(folderId);
  const shares = find<SharedFolderLink>(SHARES, (s) => s.folderId === folderId);
  const filters = find<FolderSmartFilter>(FILTERS, (f) => f.folderId === folderId);
  return {
    folderId,
    conversationCount: convs.length,
    shareCount: shares.length,
    smartFilterCount: filters.length,
    childFolderCount: folder.childrenIds.length,
  };
}

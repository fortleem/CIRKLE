// @ts-nocheck
/**
 * Chat Folders (F1) — user-level folder organization for chats.
 *
 * Each user can create folders (e.g. "Work", "Family", "Crypto") and
 * assign conversations into them. Folders have an icon, color, and sort
 * order. A conversation can belong to multiple folders (m:n).
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, find, all, remove, update, nowISO } from "@/lib/feature-store";

export interface ChatFolder {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface FolderAssignment {
  id: string;
  folderId: string;
  conversationId: string;
  userId: string; // denormalized for fast user-scoped queries
  addedAt: string;
}

const FOLDERS = "chatFolder";
const ASSIGNS = "chatFolderAssignment";

export const FOLDER_COLORS = [
  "teal", "amber", "rose", "violet", "emerald", "sky", "orange", "pink",
] as const;

export const FOLDER_ICONS = [
  "📁", "💼", "👨‍👩‍👧", "🎓", "💰", "🎮", "❤️", "🏠", "🚀", "⭐", "🔒", "📌",
] as const;

export interface CreateFolderInput {
  userId: string;
  name: string;
  icon?: string;
  color?: string;
}

export async function createFolder(input: CreateFolderInput): Promise<ChatFolder> {
  const userId = (input.userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!userId) throw new Error("userId is required");
  const name = (input.name || "").trim();
  if (name.length < 1) throw new Error("folder name must be at least 1 character");
  if (name.length > 40) throw new Error("folder name must be at most 40 characters");
  const userFolders = await getFolders(userId);
  if (userFolders.length >= 20) {
    throw new Error("maximum of 20 folders per user");
  }
  const folder: ChatFolder = {
    id: `fld_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    userId,
    name,
    icon: input.icon || "📁",
    color: input.color || "teal",
    sortOrder: userFolders.length,
    createdAt: nowISO(),
  };
  put(FOLDERS, folder);
  return folder;
}

export async function getFolders(userId: string): Promise<ChatFolder[]> {
  const id = (userId || "").trim().toLowerCase().replace(/^@/, "");
  return find<ChatFolder>(FOLDERS, (f) => f.userId === id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function addConversationToFolder(
  folderId: string,
  conversationId: string,
  userId: string,
): Promise<FolderAssignment> {
  const folder = get<ChatFolder>(FOLDERS, folderId);
  if (!folder) throw new Error(`folder ${folderId} not found`);
  const uid = (userId || "").trim().toLowerCase().replace(/^@/, "");
  if (folder.userId !== uid) throw new Error("folder does not belong to user");
  const cid = (conversationId || "").trim();
  if (!cid) throw new Error("conversationId is required");
  // Idempotent on (folderId, conversationId)
  const existing = find<FolderAssignment>(
    ASSIGNS,
    (a) => a.folderId === folderId && a.conversationId === cid,
  )[0];
  if (existing) return existing;
  const assignment: FolderAssignment = {
    id: `asg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    folderId,
    conversationId: cid,
    userId: uid,
    addedAt: nowISO(),
  };
  put(ASSIGNS, assignment);
  return assignment;
}

export async function removeConversationFromFolder(
  folderId: string,
  conversationId: string,
): Promise<boolean> {
  const existing = find<FolderAssignment>(
    ASSIGNS,
    (a) => a.folderId === folderId && a.conversationId === conversationId,
  )[0];
  if (!existing) return false;
  return remove(ASSIGNS, existing.id);
}

export async function getConversationsInFolder(folderId: string): Promise<string[]> {
  return find<FolderAssignment>(ASSIGNS, (a) => a.folderId === folderId)
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
    .map((a) => a.conversationId);
}

export async function getFolderAssignments(userId: string): Promise<FolderAssignment[]> {
  const id = (userId || "").trim().toLowerCase().replace(/^@/, "");
  return find<FolderAssignment>(ASSIGNS, (a) => a.userId === id);
}

export async function deleteFolder(folderId: string): Promise<boolean> {
  const folder = get<ChatFolder>(FOLDERS, folderId);
  if (!folder) return false;
  // Cascade-delete assignments
  const assigns = find<FolderAssignment>(ASSIGNS, (a) => a.folderId === folderId);
  for (const a of assigns) remove(ASSIGNS, a.id);
  return remove(FOLDERS, folderId);
}

export async function renameFolder(folderId: string, name: string): Promise<ChatFolder | null> {
  return update<ChatFolder>(FOLDERS, folderId, { name: (name || "").trim().slice(0, 40) });
}

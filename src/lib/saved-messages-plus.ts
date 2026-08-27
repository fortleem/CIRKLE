// @ts-nocheck
/**
 * Saved Messages — PLUS (F2+).
 *
 * Polish layer on top of `saved-messages.ts`.
 * Adds: collections (organize saves into themed groups), tags (multi-tag
 * per save), color-coded labels, export to Markdown / JSON, and
 * "favorites" (a special collection for quick access).
 *
 * Storage: in-memory feature-store (Prisma schema frozen for this task).
 */
import "server-only";
import { get, put, find, findOne, all, remove, update, nowISO } from "@/lib/feature-store";
import { saveMessage as baseSave, getSavedMessages as baseGet } from "@/lib/saved-messages";

export interface SavedCollection {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  color: string;
  isFavorites: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface SavedTag {
  id: string;
  userId: string;
  label: string;
  color: string;
  createdAt: string;
}

export interface SavedMessageMeta {
  id: string;
  userId: string;
  savedMessageId: string;
  collectionId: string | null;
  tagIds: string[];
  labelColor: string;
  isFavorite: boolean;
  updatedAt: string;
}

const COLLECTIONS = "savedMessageCollection";
const TAGS = "savedMessageTag";
const META = "savedMessageMeta";

function normalizeUser(u: string): string {
  return (u || "").trim().toLowerCase().replace(/^@/, "");
}

const LABEL_COLORS = ["#94a3b8", "#14b8a6", "#f59e0b", "#f43f5e", "#8b5cf6", "#10b981", "#0ea5e9", "#f97316"];

// ---------- Collections ----------

export async function createCollection(input: {
  userId: string;
  name: string;
  emoji?: string;
  color?: string;
}): Promise<SavedCollection> {
  const uid = normalizeUser(input.userId);
  if (!uid) throw new Error("userId is required");
  const name = (input.name || "").trim();
  if (!name) throw new Error("name is required");
  const userCollections = await listCollections(uid);
  if (userCollections.length >= 30) throw new Error("max 30 collections per user");
  const collection: SavedCollection = {
    id: `col_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    name,
    emoji: input.emoji || "📁",
    color: input.color || LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)],
    isFavorites: false,
    sortOrder: userCollections.length,
    createdAt: nowISO(),
  };
  put(COLLECTIONS, collection);
  return collection;
}

/** Get or create the implicit "Favorites" collection for a user. */
export async function getOrCreateFavoritesCollection(userId: string): Promise<SavedCollection> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  const existing = findOne<SavedCollection>(COLLECTIONS, (c) => c.userId === uid && c.isFavorites);
  if (existing) return existing;
  const fav: SavedCollection = {
    id: `col_fav_${uid}`,
    userId: uid,
    name: "Favorites",
    emoji: "⭐",
    color: "#f59e0b",
    isFavorites: true,
    sortOrder: -1,
    createdAt: nowISO(),
  };
  put(COLLECTIONS, fav);
  return fav;
}

export async function listCollections(userId: string): Promise<SavedCollection[]> {
  const uid = normalizeUser(userId);
  if (!uid) return [];
  return find<SavedCollection>(COLLECTIONS, (c) => c.userId === uid)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function deleteCollection(collectionId: string): Promise<boolean> {
  const col = get<SavedCollection>(COLLECTIONS, collectionId);
  if (!col) return false;
  if (col.isFavorites) throw new Error("cannot delete the Favorites collection");
  // Detach all metas
  const metas = find<SavedMessageMeta>(META, (m) => m.collectionId === collectionId);
  for (const m of metas) update<SavedMessageMeta>(META, m.id, { collectionId: null });
  return remove(COLLECTIONS, collectionId);
}

// ---------- Tags ----------

export async function createTag(input: { userId: string; label: string; color?: string }): Promise<SavedTag> {
  const uid = normalizeUser(input.userId);
  if (!uid) throw new Error("userId is required");
  const label = (input.label || "").trim();
  if (!label) throw new Error("label is required");
  // Idempotent
  const existing = findOne<SavedTag>(TAGS, (t) => t.userId === uid && t.label.toLowerCase() === label.toLowerCase());
  if (existing) return existing;
  const tag: SavedTag = {
    id: `tag_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    label,
    color: input.color || LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)],
    createdAt: nowISO(),
  };
  put(TAGS, tag);
  return tag;
}

export async function listTags(userId: string): Promise<SavedTag[]> {
  const uid = normalizeUser(userId);
  if (!uid) return [];
  return find<SavedTag>(TAGS, (t) => t.userId === uid)
    .sort((a, b) => (a.label < b.label ? -1 : 1));
}

export async function deleteTag(tagId: string): Promise<boolean> {
  // Detach from all metas
  const metas = find<SavedMessageMeta>(META, (m) => m.tagIds.includes(tagId));
  for (const m of metas) {
    update<SavedMessageMeta>(META, m.id, { tagIds: m.tagIds.filter((t) => t !== tagId) });
  }
  return remove(TAGS, tagId);
}

// ---------- Message metadata ----------

export async function getMeta(userId: string, savedMessageId: string): Promise<SavedMessageMeta | null> {
  const uid = normalizeUser(userId);
  if (!uid) return null;
  return findOne<SavedMessageMeta>(META, (m) => m.userId === uid && m.savedMessageId === savedMessageId) ?? null;
}

export async function assignToCollection(
  userId: string,
  savedMessageId: string,
  collectionId: string | null,
): Promise<SavedMessageMeta> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  const meta = (await getMeta(uid, savedMessageId)) ?? {
    id: `meta_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    savedMessageId,
    collectionId: null,
    tagIds: [],
    labelColor: "#94a3b8",
    isFavorite: false,
    updatedAt: nowISO(),
  };
  const next = { ...meta, collectionId, updatedAt: nowISO() };
  put(META, next);
  return next;
}

export async function applyTags(
  userId: string,
  savedMessageId: string,
  tagIds: string[],
): Promise<SavedMessageMeta> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  const meta = (await getMeta(uid, savedMessageId)) ?? {
    id: `meta_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    savedMessageId,
    collectionId: null,
    tagIds: [],
    labelColor: "#94a3b8",
    isFavorite: false,
    updatedAt: nowISO(),
  };
  const next = { ...meta, tagIds: Array.from(new Set(tagIds)), updatedAt: nowISO() };
  put(META, next);
  return next;
}

export async function toggleFavorite(
  userId: string,
  savedMessageId: string,
): Promise<SavedMessageMeta> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  const meta = (await getMeta(uid, savedMessageId)) ?? {
    id: `meta_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    savedMessageId,
    collectionId: null,
    tagIds: [],
    labelColor: "#94a3b8",
    isFavorite: false,
    updatedAt: nowISO(),
  };
  const next = { ...meta, isFavorite: !meta.isFavorite, updatedAt: nowISO() };
  put(META, next);
  return next;
}

export async function setColorLabel(
  userId: string,
  savedMessageId: string,
  color: string,
): Promise<SavedMessageMeta> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  const meta = (await getMeta(uid, savedMessageId)) ?? {
    id: `meta_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    savedMessageId,
    collectionId: null,
    tagIds: [],
    labelColor: "#94a3b8",
    isFavorite: false,
    updatedAt: nowISO(),
  };
  const next = { ...meta, labelColor: color, updatedAt: nowISO() };
  put(META, next);
  return next;
}

export interface FilterOptions {
  collectionId?: string;
  tagIds?: string[];
  favoritesOnly?: boolean;
  color?: string;
}

export async function listWithMeta(userId: string, filter?: FilterOptions): Promise<
  Array<{
    saved: {
      id: string;
      userId: string;
      messageId: string;
      conversationId: string;
      note: string | null;
      createdAt: string;
    };
    meta: SavedMessageMeta | null;
  }>
> {
  const uid = normalizeUser(userId);
  if (!uid) return [];
  const saved = await baseGet(uid, {});
  const metas = find<SavedMessageMeta>(META, (m) => m.userId === uid);
  const metaBySaved = new Map(metas.map((m) => [m.savedMessageId, m]));
  let items = saved.map((s) => ({ saved: s, meta: metaBySaved.get(s.id) ?? null }));
  if (filter?.collectionId) {
    items = items.filter((i) => i.meta?.collectionId === filter.collectionId);
  }
  if (filter?.tagIds && filter.tagIds.length > 0) {
    items = items.filter((i) => filter.tagIds!.some((t) => i.meta?.tagIds.includes(t)));
  }
  if (filter?.favoritesOnly) {
    items = items.filter((i) => i.meta?.isFavorite);
  }
  if (filter?.color) {
    items = items.filter((i) => i.meta?.labelColor === filter.color);
  }
  return items;
}

// ---------- Export ----------

export interface ExportPayload {
  userId: string;
  exportedAt: string;
  version: string;
  collections: SavedCollection[];
  tags: SavedTag[];
  messages: Array<{
    saved: {
      id: string;
      userId: string;
      messageId: string;
      conversationId: string;
      note: string | null;
      createdAt: string;
    };
    meta: SavedMessageMeta | null;
  }>;
}

export async function exportAll(userId: string): Promise<ExportPayload> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  const [collections, tags, messages] = await Promise.all([
    listCollections(uid),
    listTags(uid),
    listWithMeta(uid),
  ]);
  return {
    userId: uid,
    exportedAt: nowISO(),
    version: "1.0",
    collections,
    tags,
    messages,
  };
}

export function toMarkdown(payload: ExportPayload): string {
  const lines: string[] = [
    `# Cirkle Saved Messages — ${payload.userId}`,
    "",
    `Exported: ${payload.exportedAt}`,
    "",
    `Collections: ${payload.collections.length}`,
    `Tags: ${payload.tags.length}`,
    `Saved messages: ${payload.messages.length}`,
    "",
    "---",
    "",
  ];
  for (const m of payload.messages) {
    lines.push(`## ${m.saved.messageId} — ${new Date(m.saved.createdAt).toLocaleString()}`);
    lines.push(`- Conversation: \`${m.saved.conversationId}\``);
    if (m.saved.note) lines.push(`- Note: ${m.saved.note}`);
    if (m.meta?.isFavorite) lines.push(`- ⭐ Favorite`);
    if (m.meta?.collectionId) {
      const c = payload.collections.find((x) => x.id === m.meta!.collectionId);
      if (c) lines.push(`- Collection: ${c.emoji} ${c.name}`);
    }
    if (m.meta && m.meta.tagIds.length > 0) {
      const tags = m.meta.tagIds
        .map((t) => payload.tags.find((x) => x.id === t))
        .filter(Boolean)
        .map((t) => `#${(t as SavedTag).label}`)
        .join(" ");
      lines.push(`- Tags: ${tags}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

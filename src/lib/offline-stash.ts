/**
 * Offline content stash service (Blueprint §8.9 / §26).
 *
 * CIRKLE is a web-first PWA built for regions with intermittent
 * connectivity. When a user taps "Save for offline" on a post,
 * article, video, wiki page, or arbitrary URL, the client stashes a
 * snapshot locally (IndexedDB) and asks the server to remember a
 * pointer + the snapshot. On reconnect, pending items sync up; on
 * subsequent devices, the user can pull their stash back down.
 *
 * Privacy posture (§30.4 / §26 data minimisation):
 *   - The stash is keyed on the user's handle (`userLabel`) — no
 *     additional tracking id.
 *   - `metadata` is a free-form JSON blob the CLIENT controls — the
 *     server stores it opaquely and never parses it for analytics.
 *   - `expiresAt` enforces a retention window. Expired rows MAY be
 *     purged lazily on read (`pruneExpiredForUser`) or by a periodic
 *     maintenance sweep (`pruneExpired`).
 *
 * Upgrade path: in production, the snapshot body + mediaUrl would be
 * backed by content-addressable storage (IPFS / S3) and the row would
 * store only the CAS hash. The shapes here are forward-compatible —
 * `contentHash` already plays that role for dedup.
 */

import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

export const STASH_CONTENT_TYPES = [
  "post",
  "article",
  "video",
  "audio",
  "wiki",
  "url",
  "lamahat",
  "midan",
] as const;
export type StashContentType = (typeof STASH_CONTENT_TYPES)[number];

export const STASH_SYNC_STATUSES = ["pending", "synced", "failed", "stale"] as const;
export type StashSyncStatus = (typeof STASH_SYNC_STATUSES)[number];

export interface AddToStashOpts {
  userLabel: string;
  contentType: string;
  contentId?: string | null;
  title?: string | null;
  body?: string | null;
  mediaUrl?: string | null;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  contentHash?: string | null;
  sizeBytes?: number | null;
  /** TTL in days. Default 30. Set to 0 for no expiry. */
  ttlDays?: number | null;
}

export interface StashItem {
  id: string;
  userLabel: string;
  contentType: string;
  contentId: string | null;
  title: string | null;
  body: string | null;
  mediaUrl: string | null;
  sourceUrl: string | null;
  metadata: Record<string, unknown> | null;
  syncStatus: string;
  contentHash: string | null;
  sizeBytes: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
}

export interface ListStashOpts {
  contentType?: string;
  syncStatus?: string;
  limit?: number;
  /** Numeric offset for pagination (0-based). */
  cursor?: number;
}

export interface StashSummary {
  totalItems: number;
  totalSizeBytes: number;
  byContentType: Record<string, number>;
  bySyncStatus: Record<string, number>;
  pendingSync: number;
}

// Maximum body size we'll persist server-side (≈ 512 KiB of UTF-8).
const MAX_BODY_BYTES = 512 * 1024;
const MAX_TITLE_LEN = 280;
const MAX_URL_LEN = 1024;
const DEFAULT_TTL_DAYS = 30;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normaliseHandle(h: string): string {
  return (h || "").trim().toLowerCase().replace(/^@/, "");
}

function coerceContentType(input: string): StashContentType {
  const v = (input || "").trim().toLowerCase();
  if (STASH_CONTENT_TYPES.includes(v as StashContentType)) {
    return v as StashContentType;
  }
  // Unknown content types collapse to "url" — preserves the stash
  // without rejecting the call. The original type is preserved in
  // metadata if the client wants it.
  return "url";
}

function coerceSyncStatus(input: string): StashSyncStatus {
  const v = (input || "").trim().toLowerCase();
  if (STASH_SYNC_STATUSES.includes(v as StashSyncStatus)) {
    return v as StashSyncStatus;
  }
  return "pending";
}

function truncate(s: string | null | undefined, max: number): string | null {
  if (s == null) return null;
  const t = String(s);
  if (t.length <= max) return t;
  return t.slice(0, max);
}

function coerceUrl(s: string | null | undefined): string | null {
  if (s == null || s === "") return null;
  const t = String(s).trim();
  if (!/^https?:\/\//i.test(t)) return null;
  return truncate(t, MAX_URL_LEN);
}

function computeExpiry(ttlDays: number | null | undefined): Date | null {
  if (ttlDays == null) ttlDays = DEFAULT_TTL_DAYS;
  if (ttlDays <= 0) return null;
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}

function rowToItem(row: {
  id: string;
  userLabel: string;
  contentType: string;
  contentId: string | null;
  title: string | null;
  body: string | null;
  mediaUrl: string | null;
  sourceUrl: string | null;
  metadata: string | null;
  syncStatus: string;
  contentHash: string | null;
  sizeBytes: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date | null;
}): StashItem {
  let metadata: Record<string, unknown> | null = null;
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata) as Record<string, unknown>;
    } catch {
      metadata = null;
    }
  }
  return {
    id: row.id,
    userLabel: row.userLabel,
    contentType: row.contentType,
    contentId: row.contentId,
    title: row.title,
    body: row.body,
    mediaUrl: row.mediaUrl,
    sourceUrl: row.sourceUrl,
    metadata,
    syncStatus: row.syncStatus,
    contentHash: row.contentHash,
    sizeBytes: row.sizeBytes,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adds an item to the user's offline stash. Idempotent per
 * (userLabel, contentType, contentHash) — if a stash row with the
 * same content hash already exists, it is updated in place (refreshing
 * the snapshot, bumping `updatedAt`, and resetting the TTL).
 *
 * If no `contentHash` is supplied, the row is always created (no dedup).
 */
export async function addToStash(opts: AddToStashOpts): Promise<StashItem> {
  const userLabel = normaliseHandle(opts.userLabel);
  if (!userLabel) throw new Error("userLabel is required");

  const contentType = coerceContentType(opts.contentType);
  const contentId = opts.contentId ? truncate(String(opts.contentId), 140) : null;
  const title = opts.title ? truncate(String(opts.title), MAX_TITLE_LEN) : null;
  const body = opts.body != null ? truncate(String(opts.body), MAX_BODY_BYTES) : null;
  const mediaUrl = coerceUrl(opts.mediaUrl);
  const sourceUrl = coerceUrl(opts.sourceUrl);
  const contentHash = opts.contentHash ? truncate(String(opts.contentHash), 80) : null;
  const sizeBytes =
    Number.isFinite(opts.sizeBytes) && (opts.sizeBytes ?? 0) >= 0
      ? Math.min(Math.floor(opts.sizeBytes as number), Number.MAX_SAFE_INTEGER)
      : 0;

  let metadataStr: string | null = null;
  if (opts.metadata != null) {
    try {
      metadataStr = JSON.stringify(opts.metadata).slice(0, 16 * 1024); // 16 KiB cap
    } catch {
      metadataStr = null;
    }
  }

  const expiresAt = computeExpiry(opts.ttlDays);

  // Idempotent upsert on (userLabel, contentType, contentHash) when a
  // hash is provided. SQLite Prisma doesn't support upsert with a
  // composite unique constraint containing a nullable column, so we
  // do a manual lookup-then-create/update.
  if (contentHash) {
    const existing = await db.offlineStashItem.findUnique({
      where: {
        userLabel_contentType_contentHash: {
          userLabel,
          contentType,
          contentHash,
        },
      },
    });
    if (existing) {
      const updated = await db.offlineStashItem.update({
        where: { id: existing.id },
        data: {
          contentId: contentId ?? existing.contentId,
          title: title ?? existing.title,
          body: body ?? existing.body,
          mediaUrl: mediaUrl ?? existing.mediaUrl,
          sourceUrl: sourceUrl ?? existing.sourceUrl,
          metadata: metadataStr ?? existing.metadata,
          sizeBytes,
          syncStatus: "synced",
          lastSyncedAt: new Date(),
          expiresAt,
        },
      });
      return rowToItem(updated);
    }
  }

  const row = await db.offlineStashItem.create({
    data: {
      userLabel,
      contentType,
      contentId,
      title,
      body,
      mediaUrl,
      sourceUrl,
      metadata: metadataStr,
      contentHash,
      sizeBytes,
      syncStatus: "synced", // server has the snapshot now
      lastSyncedAt: new Date(),
      expiresAt,
    },
  });
  return rowToItem(row);
}

/**
 * Lists the user's stashed items, newest first. Optionally filtered
 * by contentType or syncStatus. Offset pagination via `cursor` (the
 * numeric offset of the next page, 0-based).
 *
 * Expired items are filtered out — they SHOULD be lazily purged by
 * `pruneExpiredForUser` instead of being returned to the client.
 */
export async function listStash(
  userLabel: string,
  opts: ListStashOpts = {},
): Promise<{ items: StashItem[]; nextCursor: number | null }> {
  const handle = normaliseHandle(userLabel);
  if (!handle) return { items: [], nextCursor: null };

  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const rawOffset = typeof opts.cursor === "number" ? opts.cursor : Number(opts.cursor);
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;

  const where: {
    userLabel: string;
    contentType?: string;
    syncStatus?: string;
    OR?: Array<{ expiresAt: { gt: Date } } | { expiresAt: null }>;
  } = {
    userLabel: handle,
  };
  if (opts.contentType) where.contentType = coerceContentType(opts.contentType);
  if (opts.syncStatus) where.syncStatus = coerceSyncStatus(opts.syncStatus);

  // Exclude expired rows.
  const now = new Date();
  where.OR = [{ expiresAt: { gt: now } }, { expiresAt: null }];

  const rows = await db.offlineStashItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    skip: offset,
  });

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const items = slice.map(rowToItem);
  const nextCursor = hasMore ? offset + limit : null;
  return { items, nextCursor };
}

/**
 * Returns a single stash item — but only if it belongs to `userLabel`
 * and hasn't expired.
 */
export async function getStashItem(
  userLabel: string,
  itemId: string,
): Promise<StashItem | null> {
  const handle = normaliseHandle(userLabel);
  if (!handle || !itemId) return null;
  const row = await db.offlineStashItem.findUnique({ where: { id: itemId } });
  if (!row || row.userLabel !== handle) return null;
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return null;
  return rowToItem(row);
}

/**
 * Deletes a stash item. Returns true if a row was deleted, false if
 * not found / not owned by the caller.
 */
export async function removeFromStash(
  userLabel: string,
  itemId: string,
): Promise<boolean> {
  const handle = normaliseHandle(userLabel);
  if (!handle || !itemId) return false;
  const row = await db.offlineStashItem.findUnique({ where: { id: itemId } });
  if (!row || row.userLabel !== handle) return false;
  await db.offlineStashItem.delete({ where: { id: itemId } });
  return true;
}

/**
 * Marks a stash item as synced (server has acknowledged the snapshot).
 * Used by the client after a successful upload to clear the "pending"
 * badge.
 */
export async function markSynced(
  userLabel: string,
  itemId: string,
): Promise<StashItem | null> {
  const handle = normaliseHandle(userLabel);
  if (!handle || !itemId) return null;
  const row = await db.offlineStashItem.findUnique({ where: { id: itemId } });
  if (!row || row.userLabel !== handle) return null;
  const updated = await db.offlineStashItem.update({
    where: { id: itemId },
    data: {
      syncStatus: "synced",
      lastSyncedAt: new Date(),
    },
  });
  return rowToItem(updated);
}

/**
 * Returns a summary of the user's stash — total items, total bytes,
 * counts by content type + sync status, and the number of items
 * pending sync. Used by the offline-settings UI to show storage
 * budget usage (§26).
 */
export async function getStashSummary(userLabel: string): Promise<StashSummary> {
  const handle = normaliseHandle(userLabel);
  if (!handle) {
    return {
      totalItems: 0,
      totalSizeBytes: 0,
      byContentType: {},
      bySyncStatus: {},
      pendingSync: 0,
    };
  }
  const now = new Date();
  const rows = await db.offlineStashItem.findMany({
    where: {
      userLabel: handle,
      OR: [{ expiresAt: { gt: now } }, { expiresAt: null }],
    },
    select: {
      contentType: true,
      syncStatus: true,
      sizeBytes: true,
    },
  });

  let totalSizeBytes = 0;
  const byContentType: Record<string, number> = {};
  const bySyncStatus: Record<string, number> = {};
  for (const r of rows) {
    totalSizeBytes += r.sizeBytes;
    byContentType[r.contentType] = (byContentType[r.contentType] ?? 0) + 1;
    bySyncStatus[r.syncStatus] = (bySyncStatus[r.syncStatus] ?? 0) + 1;
  }
  return {
    totalItems: rows.length,
    totalSizeBytes,
    byContentType,
    bySyncStatus,
    pendingSync: bySyncStatus["pending"] ?? 0,
  };
}

/**
 * Purges expired rows for a single user. Called lazily on read paths
 * (best-effort) — failures are swallowed so the read still succeeds.
 *
 * Returns the number of rows deleted.
 */
export async function pruneExpiredForUser(userLabel: string): Promise<number> {
  const handle = normaliseHandle(userLabel);
  if (!handle) return 0;
  try {
    const result = await db.offlineStashItem.deleteMany({
      where: {
        userLabel: handle,
        expiresAt: { lte: new Date() },
      },
    });
    return result.count ?? 0;
  } catch (err) {
    logger.warn("[offline-stash] pruneExpiredForUser failed", {
      userLabel: handle,
      error: (err as Error).message,
    });
    return 0;
  }
}

/**
 * Purges ALL expired rows. Intended to be called by a periodic
 * maintenance task (cron / scheduled function). Returns the count.
 */
export async function pruneExpired(): Promise<number> {
  try {
    const result = await db.offlineStashItem.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    return result.count ?? 0;
  } catch (err) {
    logger.warn("[offline-stash] pruneExpired failed", { error: (err as Error).message });
    return 0;
  }
}

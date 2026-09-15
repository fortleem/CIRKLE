// @ts-nocheck
/**
 * CIRKLE — Data Retention Cleanup (Production Recommendation §3 / §26)
 * ============================================================================
 *
 * Best-effort retention enforcement for ephemeral rows whose `expiresAt`
 * column has passed. Designed to be invoked by an external cron
 * scheduler (Vercel Cron, systemd timer, k8s CronJob) hitting
 * `/api/cron/retention`. Idempotent and safe to re-run.
 *
 * Functions:
 *   • `cleanupExpiredMessages()` — delete `Message` rows whose
 *     `expiresAt < now()`. Disappearing / TTL messages use this column.
 *   • `cleanupExpiredStories()` — delete expired story rows. CIRKLE has
 *     no dedicated `Story` model; stories live as `Post` rows tagged
 *     with `module="stories"` (and historically `module="lamahat"`).
 *     The Post table has no `expiresAt` column today, so the cleanup
 *     is a no-op until the schema adds one. Wrapped in try/catch so
 *     the cron route never 500s on a schema mismatch.
 *   • `runRetentionCleanup()` — runs both in parallel and returns a
 *     summary `{ messages, stories }` of deleted row counts.
 *
 * Each helper swallows schema-mismatch errors (e.g. when a table is
 * missing `expiresAt` entirely) and returns `{ deleted: 0 }` so the
 * scheduler can keep ticking without manual intervention.
 * ============================================================================
 */
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface RetentionResult {
  deleted: number;
}

/**
 * Delete `Message` rows whose `expiresAt` is in the past.
 *
 * The Message model has a nullable `expiresAt` column (used by
 * disappearing messages). Rows with `expiresAt IS NULL` (the default)
 * are NOT touched — only rows whose TTL has elapsed.
 *
 * @returns `{ deleted }` — the number of rows removed. Returns
 *   `{ deleted: 0 }` when the column / table is unavailable.
 */
export async function cleanupExpiredMessages(): Promise<RetentionResult> {
  try {
    const result = await (db.message as any).deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    const deleted = typeof result?.count === "number" ? result.count : 0;
    if (deleted > 0) {
      logger.info("[data-retention] deleted expired messages", { deleted });
    }
    return { deleted };
  } catch (err) {
    // Schema mismatch (no `expiresAt` column) or DB unavailable — log
    // and fail open so the cron route doesn't 500.
    logger.warn("[data-retention] message cleanup skipped", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { deleted: 0 };
  }
}

/**
 * Delete expired story rows.
 *
 * CIRKLE currently stores stories as `Post` rows tagged
 * `module="stories"` (or `module="lamahat"` for the Arabic-only
 * "moments" surface). The Post table has no `expiresAt` column today,
 * so this helper is a forward-compatible no-op until the schema adds
 * one. When the column lands, the query below will start deleting
 * without a code change.
 *
 * @returns `{ deleted }` — the number of rows removed. Returns
 *   `{ deleted: 0 }` when the column / table is unavailable or no
 *   stories have expired.
 */
export async function cleanupExpiredStories(): Promise<RetentionResult> {
  // Prefer a dedicated Story model when one exists in the future.
  try {
    if ((db as any).story && typeof (db as any).story.deleteMany === "function") {
      const result = await (db as any).story.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      const deleted = typeof result?.count === "number" ? result.count : 0;
      if (deleted > 0) {
        logger.info("[data-retention] deleted expired stories (Story model)", { deleted });
      }
      return { deleted };
    }
  } catch (err) {
    logger.warn("[data-retention] Story-model cleanup skipped", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fall back to Post rows that look like stories (module=stories|lamahat)
  // AND have an `expiresAt` column in the past. Today Post has no such
  // column, so this branch returns 0 — kept here so the day the column
  // arrives, retention kicks in without a deploy of new code.
  try {
    const result = await (db.post as any).deleteMany({
      where: {
        module: { in: ["stories", "lamahat"] },
        expiresAt: { lt: new Date() },
      },
    });
    const deleted = typeof result?.count === "number" ? result.count : 0;
    if (deleted > 0) {
      logger.info("[data-retention] deleted expired stories (Post model)", { deleted });
    }
    return { deleted };
  } catch (err) {
    logger.warn("[data-retention] post-story cleanup skipped", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { deleted: 0 };
  }
}

/**
 * Run the full retention sweep — both messages and stories — in parallel.
 *
 * Used by `/api/cron/retention`. Safe to call repeatedly; each call only
 * deletes rows that have actually expired since the previous run.
 *
 * @returns `{ messages, stories }` — the count of rows deleted by each
 *   helper. Both are 0 when there's nothing to clean.
 */
export async function runRetentionCleanup(): Promise<{
  messages: number;
  stories: number;
}> {
  const [messagesResult, storiesResult] = await Promise.all([
    cleanupExpiredMessages(),
    cleanupExpiredStories(),
  ]);
  return {
    messages: messagesResult.deleted,
    stories: storiesResult.deleted,
  };
}

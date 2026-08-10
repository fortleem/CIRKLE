/**
 * Moderation queue service (Blueprint §8.8).
 *
 * Records flagged content for human review. The on-device NSFW model
 * (ADR-003) is deferred — this service ships the queue + workflow now:
 *   1. Anyone can flag content (`flagContent`).
 *   2. Moderators work through the queue (`getModerationQueue`).
 *   3. A moderator reviews each flag (`reviewContent`) — decision is one
 *      of `approve` (keep), `remove` (delete), `blur` (overlay).
 *   4. The author can appeal a removal/blur (`appealDecision`).
 *
 * Privacy posture: flags record only the flagger's username, the
 * content id, and the reason. No additional user data is collected.
 */

import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ModerationReason =
  | "nsfw"
  | "spam"
  | "harassment"
  | "violence"
  | "illegal"
  | "other";

export type ModerationStatus =
  | "pending"
  | "approved"
  | "removed"
  | "blurred"
  | "dismissed";

export type ModerationDecision =
  | "approve"
  | "remove"
  | "blur"
  | "dismiss";

export interface ModerationFlagRow {
  id: string;
  contentId: string;
  contentType: string;
  flaggedBy: string;
  reason: string;
  note: string | null;
  status: ModerationStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationQueueItem extends ModerationFlagRow {
  /** Optional snippet of the flagged content (best-effort). */
  contentSnippet: string | null;
}

export interface ModerationAppealRow {
  id: string;
  flagId: string;
  appellant: string;
  reason: string;
  status: string;
  decisionNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}

const VALID_REASONS: ModerationReason[] = [
  "nsfw", "spam", "harassment", "violence", "illegal", "other",
];
const VALID_DECISIONS: ModerationDecision[] = [
  "approve", "remove", "blur", "dismiss",
];

const DECISION_TO_STATUS: Record<ModerationDecision, ModerationStatus> = {
  approve: "approved",
  remove: "removed",
  blur: "blurred",
  dismiss: "dismissed",
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function toFlagRow(r: any): ModerationFlagRow {
  return {
    id: r.id,
    contentId: r.contentId,
    contentType: r.contentType,
    flaggedBy: r.flaggedBy,
    reason: r.reason,
    note: r.note,
    status: r.status as ModerationStatus,
    reviewedBy: r.reviewedBy,
    reviewNote: r.reviewNote,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flags a piece of content for review.
 *
 * `flaggedBy` is the username of the flagger (or "system" for auto-
 * flagged content). One pending flag per (contentId, flaggedBy) is
 * allowed — duplicate pending flags from the same user are silently
 * ignored (return the existing flag).
 */
export async function flagContent(opts: {
  contentId: string;
  contentType?: string;
  reason: ModerationReason | string;
  note?: string | null;
  flaggedBy?: string;
}): Promise<{ id: string; status: ModerationStatus; createdAt: string }> {
  const contentId = (opts.contentId || "").trim();
  if (!contentId) throw new Error("contentId is required");
  const contentType = (opts.contentType || "post").trim().slice(0, 20);
  const reason = (opts.reason || "other").toLowerCase();
  if (!VALID_REASONS.includes(reason as ModerationReason)) {
    throw new Error(`reason must be one of: ${VALID_REASONS.join(", ")}`);
  }
  const flaggedBy = (opts.flaggedBy || "system").trim().toLowerCase().replace(/^@/, "");
  const note = opts.note ? opts.note.trim().slice(0, 600) : null;

  // Idempotent: if there's already a pending flag from this flagger
  // for this content, return it.
  const existing = await db.moderationFlag.findFirst({
    where: { contentId, flaggedBy, status: "pending" },
  });
  if (existing) {
    return { id: existing.id, status: "pending", createdAt: existing.createdAt.toISOString() };
  }

  const row = await db.moderationFlag.create({
    data: {
      contentId,
      contentType,
      flaggedBy,
      reason,
      note,
      status: "pending",
    },
  });
  logger.info("[moderation] content flagged", {
    id: row.id,
    contentId,
    contentType,
    reason,
    flaggedBy,
  });
  return { id: row.id, status: "pending", createdAt: row.createdAt.toISOString() };
}

/**
 * Returns the moderation queue, optionally filtered by status.
 *
 * Default status filter is "pending". Moderators can also pull
 * "approved" / "removed" / "blurred" to see recent decisions.
 */
export async function getModerationQueue(
  status: ModerationStatus | "all" = "pending",
  limit = 50,
): Promise<ModerationQueueItem[]> {
  const take = Math.max(1, Math.min(200, limit));
  const where = status === "all" ? {} : { status };
  const rows = await db.moderationFlag.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
  });

  // Best-effort: fetch the content snippet for posts. We do this in
  // parallel for all rows — if the Post table isn't reachable, we
  // just return null snippets.
  const snippets = new Map<string, string | null>();
  await Promise.all(
    rows
      .filter((r) => r.contentType === "post")
      .map(async (r) => {
        try {
          const p = await db.post.findUnique({
            where: { id: r.contentId },
            select: { body: true },
          });
          snippets.set(r.contentId, p?.body?.slice(0, 280) ?? null);
        } catch {
          snippets.set(r.contentId, null);
        }
      }),
  );

  return rows.map((r) => ({
    ...toFlagRow(r),
    contentSnippet: snippets.get(r.contentId) ?? null,
  }));
}

/**
 * Reviews a flagged item: approve / remove / blur / dismiss.
 *
 * The moderator's username is recorded as `reviewedBy`. The flag's
 * status is updated to the corresponding decision status.
 *
 * Note: this does NOT mutate the underlying content (e.g. delete the
 * Post) — that's a separate concern handled by the content's owner
 * API. This service only records the moderation decision.
 */
export async function reviewContent(opts: {
  flagId: string;
  decision: ModerationDecision | string;
  reviewer: string;
  note?: string | null;
}): Promise<ModerationFlagRow> {
  if (!opts.flagId) throw new Error("flagId is required");
  const decision = (opts.decision || "").toLowerCase();
  if (!VALID_DECISIONS.includes(decision as ModerationDecision)) {
    throw new Error(`decision must be one of: ${VALID_DECISIONS.join(", ")}`);
  }
  const reviewer = (opts.reviewer || "").trim().toLowerCase().replace(/^@/, "");
  if (!reviewer) throw new Error("reviewer is required");
  const note = opts.note ? opts.note.trim().slice(0, 600) : null;

  const existing = await db.moderationFlag.findUnique({ where: { id: opts.flagId } });
  if (!existing) throw new Error("flag not found");
  if (existing.status !== "pending") {
    throw new Error(`flag already reviewed as ${existing.status}`);
  }

  const updated = await db.moderationFlag.update({
    where: { id: opts.flagId },
    data: {
      status: DECISION_TO_STATUS[decision as ModerationDecision],
      reviewedBy: reviewer,
      reviewNote: note,
      reviewedAt: new Date(),
    },
  });
  logger.info("[moderation] flag reviewed", {
    id: opts.flagId,
    decision,
    reviewer,
  });
  return toFlagRow(updated);
}

/**
 * Files an appeal against a moderation decision. Only flags with
 * status "removed" or "blurred" can be appealed.
 *
 * The appellant should be the content's author (the caller is
 * responsible for verifying this — the service itself doesn't check
 * authorship).
 */
export async function appealDecision(opts: {
  flagId: string;
  appellant: string;
  reason: string;
}): Promise<{ id: string; status: string; createdAt: string }> {
  if (!opts.flagId) throw new Error("flagId is required");
  const appellant = (opts.appellant || "").trim().toLowerCase().replace(/^@/, "");
  if (!appellant) throw new Error("appellant is required");
  const reason = (opts.reason || "").trim();
  if (reason.length < 10 || reason.length > 1000) {
    throw new Error("reason must be 10-1000 chars");
  }

  const flag = await db.moderationFlag.findUnique({ where: { id: opts.flagId } });
  if (!flag) throw new Error("flag not found");
  if (flag.status !== "removed" && flag.status !== "blurred") {
    throw new Error(`only removed/blurred decisions can be appealed (current: ${flag.status})`);
  }

  // Idempotent: one open appeal per flag.
  const existingOpen = await db.moderationActionAppeal.findFirst({
    where: { flagId: opts.flagId, status: "open" },
  });
  if (existingOpen) {
    return { id: existingOpen.id, status: "open", createdAt: existingOpen.createdAt.toISOString() };
  }

  const row = await db.moderationActionAppeal.create({
    data: {
      flagId: opts.flagId,
      appellant,
      reason,
      status: "open",
    },
  });
  logger.info("[moderation] appeal filed", { id: row.id, flagId: opts.flagId, appellant });
  return { id: row.id, status: "open", createdAt: row.createdAt.toISOString() };
}

/**
 * Lists appeals (for moderator review). Default status filter is "open".
 */
export async function getAppeals(
  status: string = "open",
  limit = 50,
): Promise<ModerationAppealRow[]> {
  const take = Math.max(1, Math.min(200, limit));
  const where = status === "all" ? {} : { status };
  const rows = await db.moderationActionAppeal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((r) => ({
    id: r.id,
    flagId: r.flagId,
    appellant: r.appellant,
    reason: r.reason,
    status: r.status,
    decisionNote: r.decisionNote,
    decidedBy: r.decidedBy,
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Resolves an appeal: uphold (keep the moderation decision) or
 * overturn (reverse the decision).
 */
export async function resolveAppeal(opts: {
  appealId: string;
  decision: "uphold" | "overturn";
  reviewer: string;
  note?: string | null;
}): Promise<ModerationAppealRow> {
  if (!opts.appealId) throw new Error("appealId is required");
  if (opts.decision !== "uphold" && opts.decision !== "overturn") {
    throw new Error("decision must be 'uphold' or 'overturn'");
  }
  const reviewer = (opts.reviewer || "").trim().toLowerCase().replace(/^@/, "");
  if (!reviewer) throw new Error("reviewer is required");
  const note = opts.note ? opts.note.trim().slice(0, 600) : null;

  const existing = await db.moderationActionAppeal.findUnique({ where: { id: opts.appealId } });
  if (!existing) throw new Error("appeal not found");
  if (existing.status !== "open") {
    throw new Error(`appeal already ${existing.status}`);
  }

  const newStatus = opts.decision === "uphold" ? "upheld" : "overturned";

  const updated = await db.$transaction(async (tx) => {
    const appeal = await tx.moderationActionAppeal.update({
      where: { id: opts.appealId },
      data: {
        status: newStatus,
        decisionNote: note,
        decidedBy: reviewer,
        decidedAt: new Date(),
      },
    });
    // If overturned, flip the flag back to "approved".
    if (opts.decision === "overturn") {
      await tx.moderationFlag.update({
        where: { id: existing.flagId },
        data: {
          status: "approved",
          reviewNote: `Overturned on appeal by @${reviewer}${note ? `: ${note}` : ""}`,
        },
      });
    }
    return appeal;
  });

  return {
    id: updated.id,
    flagId: updated.flagId,
    appellant: updated.appellant,
    reason: updated.reason,
    status: updated.status,
    decisionNote: updated.decisionNote,
    decidedBy: updated.decidedBy,
    decidedAt: updated.decidedAt ? updated.decidedAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
  };
}

/**
 * Returns the moderation state for a single content id — used by the
 * UI to render the "blur" overlay or "removed" placeholder.
 */
export async function getContentModerationState(contentId: string): Promise<{
  status: ModerationStatus | "none";
  flagId: string | null;
}> {
  if (!contentId) return { status: "none", flagId: null };
  const flag = await db.moderationFlag.findFirst({
    where: { contentId, status: { in: ["pending", "blurred", "removed"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!flag) return { status: "none", flagId: null };
  return { status: flag.status as ModerationStatus, flagId: flag.id };
}

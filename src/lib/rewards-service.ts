/**
 * Performance-based creator rewards — Blueprint §7.3.7.
 *
 * CIRKLE pays creators a share of an ad-revenue-backed reward pool each
 * period (monthly by default), proportional to weighted engagement on
 * their posts. The model is intentionally simple + transparent:
 *
 *   1. Aggregate engagement per creator for the period (views, likes,
 *      comments, shares) from the Post table.
 *   2. Compute a weighted score:
 *        score = views + (likes * 5) + (comments * 10) + (shares * 20)
 *   3. Rank creators by score.
 *   4. Distribute the pool proportionally: share = score / totalScore.
 *   5. Record a CreatorReward row per creator (status="computed").
 *   6. `distributeRewards` flips rows to status="distributed" with a
 *      payment reference (Commit hash, bank transfer id, etc.).
 *
 * Privacy posture (§30.4): the service is server-only (DB-touching).
 * The leaderboard is PUBLIC — creator handles + scores are visible to
 * all users (transparency). Payout amounts are also public (transparency
 * on revenue share). The underlying engagement metrics (per-post views
 * etc.) remain private — only the aggregated score is published.
 */

import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatorEngagement {
  username: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  /** Weighted engagement score. */
  score: number;
  /** Rank (1 = top creator). */
  rank: number;
  /** Share of the reward pool (0..1). */
  share: number;
  /** Payout amount in `currency`. */
  amount: number;
}

export interface RewardLeaderboard {
  period: string;
  poolSize: number;
  currency: string;
  totalCreators: number;
  totalScore: number;
  generatedAt: string;
  topCreators: CreatorEngagement[];
}

export interface RewardEntry {
  id: string;
  username: string;
  period: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    score: number;
    rank: number;
  };
  score: number;
  rank: number;
  share: number;
  amount: number;
  currency: string;
  poolSize: number;
  status: "computed" | "distributed" | "failed";
  distributedAt: string | null;
  paymentRef: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Weight multipliers for the engagement score. */
const WEIGHTS = { views: 1, likes: 5, comments: 10, shares: 20 } as const;

/**
 * Compute the weighted engagement score.
 *
 *   score = views + (likes * 5) + (comments * 10) + (shares * 20)
 *
 * Weights reflect that a comment takes more effort than a like, and a
 * share (repost) takes more effort + extends reach further than a
 * comment. Views are weighted 1:1 because they're already the largest
 * number — weighting them higher would drown out the quality signals.
 */
export function computeScore(views: number, likes: number, comments: number, shares: number): number {
  const v = Math.max(0, Math.floor(views || 0));
  const l = Math.max(0, Math.floor(likes || 0));
  const c = Math.max(0, Math.floor(comments || 0));
  const s = Math.max(0, Math.floor(shares || 0));
  return v * WEIGHTS.views + l * WEIGHTS.likes + c * WEIGHTS.comments + s * WEIGHTS.shares;
}

/**
 * Returns the current period key ("YYYY-MM") for a given date.
 * Defaults to the current month.
 */
export function currentPeriod(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Parse a period key into a [start, end) UTC date range.
 * Accepts "YYYY-MM" (monthly) or "YYYY-Www" (ISO weekly).
 */
function periodRange(period: string): { start: Date; end: Date } {
  const monthly = period.match(/^(\d{4})-(\d{2})$/);
  if (monthly) {
    const y = parseInt(monthly[1], 10);
    const m = parseInt(monthly[2], 10);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    return { start, end };
  }
  const weekly = period.match(/^(\d{4})-W(\d{2})$/);
  if (weekly) {
    const y = parseInt(weekly[1], 10);
    const w = parseInt(weekly[2], 10);
    // ISO week: find the Monday of week 1, then add (w-1) weeks.
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
    const start = new Date(week1Monday);
    start.setUTCDate(week1Monday.getUTCDate() + (w - 1) * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);
    return { start, end };
  }
  throw new Error(`Invalid period key: "${period}". Expected "YYYY-MM" or "YYYY-Www".`);
}

function toIso(d: Date): string {
  return d.toISOString();
}

function serializeReward(row: {
  id: string;
  username: string;
  period: string;
  metrics: string;
  score: number;
  rank: number;
  share: number;
  amount: number;
  currency: string;
  poolSize: number;
  status: string;
  distributedAt: Date | null;
  paymentRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}): RewardEntry {
  let metrics: RewardEntry["metrics"] = {
    views: 0, likes: 0, comments: 0, shares: 0, score: 0, rank: 0,
  };
  try {
    const parsed = JSON.parse(row.metrics || "{}");
    if (parsed && typeof parsed === "object") {
      metrics = {
        views: Number(parsed.views) || 0,
        likes: Number(parsed.likes) || 0,
        comments: Number(parsed.comments) || 0,
        shares: Number(parsed.shares) || 0,
        score: Number(parsed.score) || 0,
        rank: Number(parsed.rank) || 0,
      };
    }
  } catch {
    /* keep defaults */
  }
  return {
    id: row.id,
    username: row.username,
    period: row.period,
    metrics,
    score: row.score,
    rank: row.rank,
    share: row.share,
    amount: row.amount,
    currency: row.currency,
    poolSize: row.poolSize,
    status: row.status as RewardEntry["status"],
    distributedAt: row.distributedAt ? toIso(row.distributedAt) : null,
    paymentRef: row.paymentRef,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate per-creator engagement for a period.
 *
 * Pulls all posts whose `createdAt` falls inside the period window,
 * groups by `authorHandle`, and sums the engagement stats. Returns an
 * array of `{ username, views, likes, comments, shares, score }`.
 *
 * Posts without an author handle are skipped (system / anonymous).
 */
export async function aggregateEngagement(period: string): Promise<
  Array<{ username: string; views: number; likes: number; comments: number; shares: number; score: number }>
> {
  const { start, end } = periodRange(period);

  // Pull only the columns we need — the post body is excluded so the
  // aggregation is cheap even for large periods.
  const posts = await db.post.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      authorHandle: { not: null },
    },
    select: {
      authorHandle: true,
      views: true,
      likes: true,
      comments: true,
      shares: true,
    },
  });

  const byCreator = new Map<string, { views: number; likes: number; comments: number; shares: number }>();
  for (const p of posts) {
    const handle = (p.authorHandle || "").trim().toLowerCase().replace(/^@/, "");
    if (!handle) continue;

    const prev = byCreator.get(handle) ?? { views: 0, likes: 0, comments: 0, shares: 0 };
    prev.views += Number(p.views) || 0;
    prev.likes += Number(p.likes) || 0;
    prev.comments += Number(p.comments) || 0;
    prev.shares += Number(p.shares) || 0;
    byCreator.set(handle, prev);
  }

  const rows: Array<{ username: string; views: number; likes: number; comments: number; shares: number; score: number }> = [];
  for (const [username, e] of byCreator) {
    rows.push({
      username,
      views: e.views,
      likes: e.likes,
      comments: e.comments,
      shares: e.shares,
      score: computeScore(e.views, e.likes, e.comments, e.shares),
    });
  }
  // Sort by score desc so rank assignment is stable.
  rows.sort((a, b) => b.score - a.score);
  return rows;
}

/**
 * Calculate the reward for a single creator in a period.
 *
 * This is a read-only computation: it aggregates engagement, ranks the
 * creator, and returns the proportional share + payout amount. It does
 * NOT write to the database. Use `distributeRewards` to persist the
 * computation.
 *
 * Params:
 *   • `userId`     — the creator handle (lowercase, no @).
 *   • `period`     — "YYYY-MM" or "YYYY-Www" (defaults to current month).
 *   • `poolSize`   — total reward pool for the period (default 0).
 *   • `currency`   — ISO-4217 currency code (default "USD").
 *
 * Returns null if the creator has no engagement in the period.
 */
export async function calculateReward(
  userId: string,
  period: string = currentPeriod(),
  poolSize: number = 0,
  currency: string = "USD",
): Promise<CreatorEngagement | null> {
  const handle = (userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!handle) return null;

  const leaderboard = await aggregateEngagement(period);
  const totalScore = leaderboard.reduce((s, r) => s + r.score, 0);
  const entry = leaderboard.find((r) => r.username === handle);
  if (!entry || entry.score === 0) return null;

  const rank = leaderboard.findIndex((r) => r.username === handle) + 1;
  const share = totalScore > 0 ? entry.score / totalScore : 0;
  const amount = Math.round(poolSize * share * 100) / 100;

  return {
    username: handle,
    views: entry.views,
    likes: entry.likes,
    comments: entry.comments,
    shares: entry.shares,
    score: entry.score,
    rank,
    share,
    amount,
  };
}

/**
 * Return the reward leaderboard for a period (top N creators by score).
 *
 * This is the public leaderboard shown in the rewards UI. It reads
 * from the persisted `CreatorReward` rows (computed via
 * `distributeRewards`). If the period hasn't been computed yet, it
 * falls back to a live computation (without persisting).
 *
 * Params:
 *   • `period`  — "YYYY-MM" (default current month).
 *   • `limit`   — top-N (default 50, max 200).
 */
export async function getRewardLeaderboard(
  period: string = currentPeriod(),
  limit: number = 50,
): Promise<RewardLeaderboard> {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit || 50)));

  // Try persisted rows first.
  const persisted = await db.creatorReward.findMany({
    where: { period },
    orderBy: { rank: "asc" },
    take: safeLimit,
  });

  if (persisted.length > 0) {
    const poolSize = persisted[0].poolSize;
    const currency = persisted[0].currency;
    const totalScore = persisted.reduce((s, r) => s + r.score, 0);
    return {
      period,
      poolSize,
      currency,
      totalCreators: persisted.length,
      totalScore,
      generatedAt: toIso(persisted[0].updatedAt),
      topCreators: persisted.map((r) => {
        let metrics: Record<string, number> = {};
        try {
          const parsed = JSON.parse(r.metrics || "{}");
          if (parsed && typeof parsed === "object") {
            metrics = parsed as Record<string, number>;
          }
        } catch {
          /* keep empty */
        }
        return {
          username: r.username,
          views: Number(metrics.views) || 0,
          likes: Number(metrics.likes) || 0,
          comments: Number(metrics.comments) || 0,
          shares: Number(metrics.shares) || 0,
          score: r.score,
          rank: r.rank,
          share: r.share,
          amount: r.amount,
        };
      }),
    };
  }

  // Fallback: live computation (no DB write).
  const rows = await aggregateEngagement(period);
  const top = rows.slice(0, safeLimit);
  const totalScore = rows.reduce((s, r) => s + r.score, 0);
  return {
    period,
    poolSize: 0,
    currency: "USD",
    totalCreators: rows.length,
    totalScore,
    generatedAt: toIso(new Date()),
    topCreators: top.map((r, idx) => ({
      username: r.username,
      views: r.views,
      likes: r.likes,
      comments: r.comments,
      shares: r.shares,
      score: r.score,
      rank: idx + 1,
      share: totalScore > 0 ? r.score / totalScore : 0,
      amount: 0,
    })),
  };
}

/**
 * Distribute the reward pool for a period.
 *
 * Aggregates engagement, computes each creator's share, and upserts a
 * `CreatorReward` row per qualifying creator. Rows are created with
 * `status="computed"` first (so the leaderboard is visible), then
 * flipped to `status="distributed"` with a `paymentRef`.
 *
 * Params:
 *   • `period`     — "YYYY-MM" (default current month).
 *   • `poolSize`   — total pool to distribute (default 0 — computes
 *                    the leaderboard without a payout).
 *   • `currency`   — ISO-4217 currency code.
 *   • `paymentRef` — optional payment reference (Commit hash, bank
 *                    transfer id, etc.). When provided, rows are
 *                    immediately marked `distributed`.
 *   • `minScore`   — minimum score to qualify (default 1 — filters out
 *                    creators with no engagement).
 *
 * Returns the count of rewards created + the leaderboard.
 */
export async function distributeRewards(opts: {
  period?: string;
  poolSize?: number;
  currency?: string;
  paymentRef?: string;
  minScore?: number;
}): Promise<{ count: number; leaderboard: CreatorEngagement[] }> {
  const period = opts.period || currentPeriod();
  const poolSize = Math.max(0, Number(opts.poolSize ?? 0));
  const currency = (opts.currency || "USD").toUpperCase();
  const paymentRef = opts.paymentRef?.trim() || null;
  const minScore = Math.max(0, Number(opts.minScore ?? 1));

  const rows = await aggregateEngagement(period);
  const qualifying = rows.filter((r) => r.score >= minScore);
  const totalScore = qualifying.reduce((s, r) => s + r.score, 0);

  const distributedAt = paymentRef ? new Date() : null;
  const status = paymentRef ? "distributed" : "computed";

  let count = 0;
  const leaderboard: CreatorEngagement[] = [];

  // Upsert each creator's reward row. We do this sequentially (not
  // in a transaction) so a single failure doesn't roll back the whole
  // batch — partial distribution is better than no distribution.
  for (let i = 0; i < qualifying.length; i++) {
    const r = qualifying[i];
    const rank = i + 1;
    const share = totalScore > 0 ? r.score / totalScore : 0;
    const amount = Math.round(poolSize * share * 100) / 100;
    const metrics = JSON.stringify({
      views: r.views,
      likes: r.likes,
      comments: r.comments,
      shares: r.shares,
      score: r.score,
      rank,
    });

    try {
      await db.creatorReward.upsert({
        where: { username_period: { username: r.username, period } },
        create: {
          username: r.username,
          period,
          metrics,
          score: r.score,
          rank,
          share,
          amount,
          currency,
          poolSize,
          status,
          distributedAt,
          paymentRef,
        },
        update: {
          metrics,
          score: r.score,
          rank,
          share,
          amount,
          currency,
          poolSize,
          status,
          ...(distributedAt ? { distributedAt } : {}),
          ...(paymentRef ? { paymentRef } : {}),
        },
      });
      count++;
      leaderboard.push({
        username: r.username,
        views: r.views,
        likes: r.likes,
        comments: r.comments,
        shares: r.shares,
        score: r.score,
        rank,
        share,
        amount,
      });
    } catch (err) {
      logger.warn("[rewards] upsert failed", {
        username: r.username,
        period,
        error: (err as Error).message,
      });
    }
  }

  logger.info("[rewards] distribution complete", {
    period,
    poolSize,
    currency,
    count,
    status,
  });

  return { count, leaderboard };
}

/**
 * Return a single creator's reward for a period (null if no row exists).
 */
export async function getCreatorReward(
  userId: string,
  period: string = currentPeriod(),
): Promise<RewardEntry | null> {
  const handle = (userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!handle) return null;
  const row = await db.creatorReward.findUnique({
    where: { username_period: { username: handle, period } },
  });
  return row ? serializeReward(row) : null;
}

/**
 * Return all rewards for a creator (across all periods).
 */
export async function listCreatorRewards(
  userId: string,
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ rewards: RewardEntry[]; nextCursor: string | null }> {
  const handle = (userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!handle) return { rewards: [], nextCursor: null };
  const limit = Math.max(1, Math.min(100, Math.floor(opts.limit ?? 50)));
  const cursor = opts.cursor || undefined;

  const rows = await db.creatorReward.findMany({
    where: { username: handle },
    orderBy: { period: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = rows.length > limit ? rows[limit - 1].id : null;
  const slice = rows.length > limit ? rows.slice(0, limit) : rows;
  return { rewards: slice.map(serializeReward), nextCursor };
}

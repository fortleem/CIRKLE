import "server-only";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Algorithmic feed ranking for the Midan.
//
// Inputs: a username + a pool of candidate posts (already filtered by module).
// Output: a re-ranked, deduplicated, diversity-capped list of posts.
//
// Ranking signals (weighted):
//   1. Recency — exponential decay over 72h (max +30)
//   2. Social graph — posts from followed authors get +40
//   3. Engagement — likes (+1) / comments (+3) / shares (+5), capped at +50
//   4. Personal AI (DNA/Mood/Topic DNA) — placeholder hook, +0..+25
//   5. Trending velocity — high engagement in the last 6h gets +0..+20
//   6. Author diversity — max 3 posts per author in the final 20
//
// All DB access is via `import { db } from "@/lib/db"`. This module is
// server-only — the algorithm never runs in the browser.
// ─────────────────────────────────────────────────────────────────────────────

export interface FeedRankingSignal {
  postId: string;
  score: number;
  reasons: string[];
}

export interface RankedPost {
  post: any;
  score: number;
  reasons: string[];
}

// Post shape we accept — flexible so we can rank both Prisma rows and
// already-shaped API post objects.
interface RankablePost {
  id: string;
  authorHandle?: string;
  authorName?: string;
  createdAt: string | Date;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  body?: string;
  tags?: string | string[] | null;
  [key: string]: unknown;
}

const MAX_PER_AUTHOR = 3;
const RECENCY_DECAY_HOURS = 72;
const TRENDING_WINDOW_HOURS = 6;

/**
 * Rank posts for a user based on:
 *   1. Recency (newer = higher)
 *   2. Social graph (posts from followed users +2x boost)
 *   3. Engagement (likes/comments/shares weighted)
 *   4. Personal AI (DNA/Mood/Topic DNA match — if consent; placeholder)
 *   5. Diversity (don't show 5 posts from same author)
 *   6. Trending (high velocity posts get boost)
 *
 * Side-effects: tracks a "view" interaction for each post returned (idempotent
 * via the @@unique constraint on [username, postId, type]).
 */
export async function rankFeedForUser(
  username: string,
  posts: RankablePost[],
  limit: number = 20,
): Promise<any[]> {
  if (!posts.length) return [];

  // 1. Get user's follows.
  const follows = await db.follow
    .findMany({
      where: { follower: username },
      select: { following: true },
    })
    .catch((err: unknown) => {
      logger.warn("[feed-algorithm] follow lookup failed", { error: (err as Error).message });
      return [] as { following: string }[];
    });
  const followingSet = new Set(
    follows.map((f) => f.following.replace(/^@/, "").toLowerCase()),
  );

  // 2. Get user's interactions (for personalization + dedup).
  const interactions = await db.postInteraction
    .findMany({
      where: { username },
      take: 100,
      orderBy: { createdAt: "desc" },
    })
    .catch((err: unknown) => {
      logger.warn("[feed-algorithm] interaction lookup failed", { error: (err as Error).message });
      return [] as { postId: string; type: string }[];
    });

  // Build a set of post IDs the user has already engaged with, so we can
  // lightly down-rank them (don't hide entirely — they may have new comments).
  const engaged = new Map<string, Set<string>>();
  for (const it of interactions) {
    const set = engaged.get(it.postId) ?? new Set<string>();
    set.add(it.type);
    engaged.set(it.postId, set);
  }

  // 3. Score each post.
  const now = Date.now();
  const trendingCutoff = now - TRENDING_WINDOW_HOURS * 3600_000;

  const scored: RankedPost[] = posts.map((post) => {
    let score = 0;
    const reasons: string[] = [];

    // (1) Recency — exponential decay over 72h.
    const createdMs = post.createdAt instanceof Date ? post.createdAt.getTime() : new Date(post.createdAt).getTime();
    const ageHours = Math.max(0, (now - createdMs) / 3_600_000);
    const recencyScore = Math.exp(-ageHours / RECENCY_DECAY_HOURS);
    score += recencyScore * 30;
    if (recencyScore > 0.5) reasons.push("recent");

    // (2) Social graph boost.
    const authorHandle = (post.authorHandle || "").replace(/^@/, "").toLowerCase();
    if (authorHandle && followingSet.has(authorHandle)) {
      score += 40;
      reasons.push("following");
    }

    // (3) Engagement.
    const likes = Number(post.likes ?? 0) || 0;
    const comments = Number(post.comments ?? 0) || 0;
    const shares = Number(post.shares ?? 0) || 0;
    const engagement = likes * 1 + comments * 3 + shares * 5;
    const engagementScore = Math.min(engagement, 50);
    score += engagementScore;
    if (engagement > 20) reasons.push("popular");

    // (4) Personal AI hook — placeholder.
    // A real impl would call personal-ai.ts to get the user's DNA/Mood vector
    // and the post's Topic DNA, then compute cosine similarity. Left as a
    // stub so we don't pull in the consent-gated AI module here.
    // if (consentGiven) score += matchScore * 25;

    // (5) Trending velocity — if a post was created in the last 6h AND has
    // high engagement, give it a small boost.
    if (createdMs >= trendingCutoff && engagement > 50) {
      const trendBoost = Math.min(20, engagement / 10);
      score += trendBoost;
      reasons.push("trending");
    }

    // (6) Light down-rank for already-engaged posts (don't hide entirely).
    const engagementTypes = engaged.get(post.id);
    if (engagementTypes && engagementTypes.has("like")) {
      score *= 0.85;
      reasons.push("seen-like");
    }

    return { post, score, reasons };
  });

  // 4. Sort by score, desc.
  scored.sort((a, b) => b.score - a.score);

  // 5. Diversity: cap per-author in the final list.
  const result: any[] = [];
  const authorCount = new Map<string, number>();
  for (const s of scored) {
    const author = (s.post.authorHandle || s.post.authorName || "").toString();
    const count = authorCount.get(author) || 0;
    if (count < MAX_PER_AUTHOR) {
      result.push(s.post);
      authorCount.set(author, count + 1);
      if (result.length >= limit) break;
    }
  }

  // 6. Track a "view" interaction for each post served (best-effort, don't
  //    block the response on failure). Idempotent via the unique constraint.
  trackViewsBulk(username, result.map((p) => p.id)).catch((err: unknown) => {
    logger.warn("[feed-algorithm] view tracking failed", { error: (err as Error).message });
  });

  return result;
}

/**
 * Track a single interaction. Called from API routes (e.g. /api/posts/react,
 * /api/posts/comment) — upserts on [username, postId, type] so we never
 * double-count.
 */
export async function trackInteraction(
  username: string,
  postId: string,
  type: string,
  dwellMs?: number,
): Promise<void> {
  await db.postInteraction.upsert({
    where: { username_postId_type: { username, postId, type } },
    create: { username, postId, type, dwellMs },
    update: dwellMs ? { dwellMs } : {},
  });
}

/**
 * Bulk-track view interactions without throwing. Used by `rankFeedForUser`.
 */
async function trackViewsBulk(username: string, postIds: string[]): Promise<void> {
  if (!postIds.length) return;
  await Promise.all(
    postIds.map((postId) =>
      db.postInteraction.upsert({
        where: { username_postId_type: { username, postId, type: "view" } },
        create: { username, postId, type: "view" },
        update: {},
      }),
    ),
  );
}

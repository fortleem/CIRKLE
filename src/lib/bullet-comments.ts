/**
 * Bullet Comments / Danmaku — Blueprint §26.10.
 *
 * Server-only library for Bilibili-style scrolling comments overlaid on
 * video. Backs:
 *   • GET  /api/posts/[id]/bullets       (list, optional `?at=<seconds>`)
 *   • POST /api/posts/[id]/bullets       (post a bullet)
 *
 * Storage: Prisma `BulletComment` (SQLite). Each bullet carries a video
 * `timestamp` (seconds) so the player can render bullets at the right
 * moment. The `@@index([postId, timestamp])` makes range scans by video
 * position cheap.
 */
import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface BulletComment {
  id: string;
  postId: string;
  username: string;
  text: string;
  color: string;
  timestamp: number; // video timestamp in seconds
  createdAt: string;
}

export interface PostBulletInput {
  postId: string;
  username: string;
  text: string;
  color?: string;
  timestamp: number;
}

const ALLOWED_COLORS = new Set([
  "white",
  "yellow",
  "cyan",
  "red",
  "green",
  "magenta",
  "gold",
  "rose",
]);

function sanitizeColor(c: string | undefined): string {
  if (!c) return "white";
  const lc = c.toLowerCase();
  return ALLOWED_COLORS.has(lc) ? lc : "white";
}

/**
 * Post a new bullet comment anchored to a video timestamp.
 */
export async function postBullet(input: PostBulletInput): Promise<BulletComment> {
  const postId = input.postId.trim();
  if (!postId) throw new Error("postId is required.");
  const username = input.username.trim().toLowerCase();
  if (!username) throw new Error("username is required.");
  const text = input.text.trim();
  if (text.length < 1 || text.length > 140) {
    throw new Error("Bullet text must be 1–140 characters.");
  }
  const ts =
    typeof input.timestamp === "number" && isFinite(input.timestamp) && input.timestamp >= 0
      ? Math.floor(input.timestamp * 10) / 10
      : 0;

  const row = await db.bulletComment.create({
    data: {
      postId,
      username,
      text,
      color: sanitizeColor(input.color),
      timestamp: ts,
    },
  });
  logger.info("[bullets] posted", { id: row.id, postId, ts });
  return {
    id: row.id,
    postId: row.postId,
    username: row.username,
    text: row.text,
    color: row.color,
    timestamp: row.timestamp,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Get all bullets for a post, optionally filtered by video timestamp.
 *
 * If `at` is provided, only bullets with `timestamp <= at` are returned
 * (so the player can fetch a prefix of the timeline as the video plays).
 */
export async function getBullets(
  postId: string,
  at?: number,
): Promise<BulletComment[]> {
  const where: { postId: string; timestamp?: { lte: number } } = { postId };
  if (typeof at === "number" && isFinite(at)) {
    where.timestamp = { lte: at };
  }
  const rows = await db.bulletComment.findMany({
    where,
    orderBy: { timestamp: "asc" },
    take: 500, // safety cap — a video rarely has more
  });
  return rows.map((r) => ({
    id: r.id,
    postId: r.postId,
    username: r.username,
    text: r.text,
    color: r.color,
    timestamp: r.timestamp,
    createdAt: r.createdAt.toISOString(),
  }));
}

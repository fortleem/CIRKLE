/**
 * Polls & Quizzes — Blueprint §9.3, §10.5.2.
 *
 * Server-only library for creating time-boxed polls, recording one-vote-per-
 * user ballots, and aggregating live results. Backs:
 *   • POST /api/polls            (create)
 *   • GET  /api/polls            (list)
 *   • POST /api/polls/[id]/vote  (cast a vote)
 *   • GET  /api/polls/[id]/results (live tally)
 *
 * Storage: Prisma `Poll` + `PollVote` (SQLite). The `options` column is a
 * JSON array of `{ id, text }`; vote counts are computed on demand from the
 * `PollVote` rows so a recount never drifts.
 */
import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: string;
  question: string;
  options: (PollOption & { votes: number })[];
  createdBy: string;
  duration: number; // seconds
  createdAt: string;
  expiresAt: string;
  postId?: string | null;
  totalVotes: number;
  hasVoted?: string | null; // optionId the requesting user voted for, if any
  expired: boolean;
}

/** Allowed poll durations in seconds (1h / 6h / 24h / 3d / 7d). */
export const POLL_DURATIONS: Record<string, number> = {
  "1h": 60 * 60,
  "6h": 6 * 60 * 60,
  "24h": 24 * 60 * 60,
  "3d": 3 * 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
};

export interface CreatePollInput {
  question: string;
  options: string[]; // 2–6 plain-text option labels
  createdBy: string;
  duration: number; // seconds
  postId?: string | null;
}

function genId(): string {
  // Short, URL-safe option IDs. cuid() is overkill for an array index.
  return Math.random().toString(36).slice(2, 8);
}

function rowToPoll(
  row: {
    id: string;
    question: string;
    options: string;
    createdBy: string;
    duration: number;
    createdAt: Date;
    expiresAt: Date;
    postId: string | null;
    votes: { optionId: string }[];
  },
  viewer?: string,
): Poll {
  const options: PollOption[] = (() => {
    try {
      const parsed = JSON.parse(row.options) as PollOption[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const tally = new Map<string, number>();
  for (const v of row.votes) {
    tally.set(v.optionId, (tally.get(v.optionId) ?? 0) + 1);
  }
  let hasVoted: string | null = null;
  if (viewer) {
    const mine = row.votes.find(
      // PollVote rows already filtered to viewer by caller when needed; if
      // not filtered, we can't tell who voted — so the caller passes a
      // pre-filtered `votes` array. For safety we leave hasVoted null here
      // when no filter was applied (no `viewer` passed).
      () => false,
    );
    void mine;
    hasVoted = null;
  }
  const totalVotes = row.votes.length;
  const now = Date.now();
  return {
    id: row.id,
    question: row.question,
    options: options.map((o) => ({
      id: o.id,
      text: o.text,
      votes: tally.get(o.id) ?? 0,
    })),
    createdBy: row.createdBy,
    duration: row.duration,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    postId: row.postId,
    totalVotes,
    hasVoted,
    expired: row.expiresAt.getTime() <= now,
  };
}

/**
 * Create a new poll. `options` must contain 2–6 non-empty labels; the
 * duration must be one of `POLL_DURATIONS` (or any positive integer seconds).
 */
export async function createPoll(input: CreatePollInput): Promise<Poll> {
  const question = input.question.trim();
  if (question.length < 3 || question.length > 280) {
    throw new Error("Poll question must be 3–280 characters.");
  }
  const labels = input.options.map((o) => o.trim()).filter((o) => o.length > 0);
  if (labels.length < 2 || labels.length > 6) {
    throw new Error("A poll must have 2–6 options.");
  }
  if (labels.some((l) => l.length > 80)) {
    throw new Error("Each option must be 80 characters or fewer.");
  }
  const createdBy = input.createdBy.trim().toLowerCase();
  if (!createdBy) throw new Error("createdBy is required.");

  const duration =
    typeof input.duration === "number" && input.duration > 0
      ? Math.min(input.duration, 30 * 24 * 60 * 60) // cap at 30 days
      : POLL_DURATIONS["24h"];

  const options: PollOption[] = labels.map((text) => ({ id: genId(), text }));
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + duration * 1000);

  const row = await db.poll.create({
    data: {
      question,
      options: JSON.stringify(options),
      createdBy,
      duration,
      createdAt,
      expiresAt,
      postId: input.postId ?? null,
    },
    include: { votes: true },
  });

  logger.info("[polls] created", { id: row.id, createdBy, options: options.length });
  return rowToPoll(row);
}

/**
 * List polls created by a user, newest first.
 */
export async function listPollsByUser(username: string): Promise<Poll[]> {
  const rows = await db.poll.findMany({
    where: { createdBy: username.toLowerCase() },
    orderBy: { createdAt: "desc" },
    include: { votes: true },
  });
  return rows.map((r) => rowToPoll(r));
}

/**
 * Cast a vote. One vote per user per poll — attempting to vote again throws.
 * Voting on an expired poll throws.
 */
export async function votePoll(
  pollId: string,
  optionId: string,
  username: string,
): Promise<void> {
  const user = username.trim().toLowerCase();
  if (!user) throw new Error("username is required.");

  const poll = await db.poll.findUnique({ where: { id: pollId } });
  if (!poll) throw new Error("Poll not found.");
  if (poll.expiresAt.getTime() <= Date.now()) {
    throw new Error("This poll has closed.");
  }
  const options: PollOption[] = (() => {
    try {
      const parsed = JSON.parse(poll.options) as PollOption[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  if (!options.some((o) => o.id === optionId)) {
    throw new Error("Invalid option.");
  }

  // Enforce one-vote-per-user via the @@unique([pollId, username]) constraint.
  // A Prisma P2002 on create means the user already voted.
  try {
    await db.pollVote.create({
      data: { pollId, username: user, optionId },
    });
    logger.info("[polls] vote cast", { pollId, optionId, user });
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message ?? "";
    if (msg.includes("Unique constraint") || msg.includes("already voted")) {
      throw new Error("You have already voted in this poll.");
    }
    throw err;
  }
}

/**
 * Get live poll results including the requesting user's vote (if any).
 */
export async function getPollResults(
  pollId: string,
  viewer?: string,
): Promise<Poll> {
  const row = await db.poll.findUnique({
    where: { id: pollId },
    include: { votes: true },
  });
  if (!row) throw new Error("Poll not found.");
  const poll = rowToPoll(row);
  if (viewer) {
    const mine = row.votes.find((v) => v.username === viewer.toLowerCase());
    poll.hasVoted = mine?.optionId ?? null;
  }
  return poll;
}

// @ts-nocheck
/**
 * Chat Polls (B12) — conversation-scoped polls & quizzes for group chats.
 *
 * Distinct from the existing `polls.ts` (which is global, username-scoped).
 * Chat polls are scoped to a `conversationId` — useful for group decisions
 * like "where should we iftar?" or "what time for the call?".
 *
 * Supports 2–6 options, single- or multi-choice, and anonymous voting.
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, find, all, update, parseArray, stringifyArray, nowISO } from "@/lib/feature-store";

export interface ChatPollOption {
  id: string;
  text: string;
  votes: string[]; // array of voterIds — for anonymous polls we store a hash
}

export interface ChatPoll {
  id: string;
  conversationId: string;
  question: string;
  options: string; // JSON: ChatPollOption[]
  multiChoice: boolean;
  anonymous: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ChatPollVote {
  id: string;
  pollId: string;
  voterId: string;
  optionId: string;
  votedAt: string;
}

const POLLS = "chatPoll";
const VOTES = "chatPollVote";

function genOptId(): string {
  return Math.random().toString(36).slice(2, 8);
}

export interface CreatePollInput {
  conversationId: string;
  question: string;
  options: string[];
  multiChoice?: boolean;
  anonymous?: boolean;
  createdBy: string;
}

export async function createPoll(input: CreatePollInput): Promise<ChatPoll> {
  const conversationId = (input.conversationId || "").trim();
  if (!conversationId) throw new Error("conversationId is required");
  const question = (input.question || "").trim();
  if (question.length < 3) throw new Error("question must be at least 3 characters");
  if (question.length > 280) throw new Error("question must be at most 280 characters");
  const labels = (input.options ?? []).map((o) => o.trim()).filter(Boolean);
  if (labels.length < 2 || labels.length > 6) {
    throw new Error("a poll must have 2–6 options");
  }
  if (labels.some((l) => l.length > 80)) {
    throw new Error("each option must be at most 80 characters");
  }
  const createdBy = (input.createdBy || "").trim().toLowerCase().replace(/^@/, "");
  if (!createdBy) throw new Error("createdBy is required");
  const opts: ChatPollOption[] = labels.map((text) => ({ id: genOptId(), text, votes: [] }));
  const poll: ChatPoll = {
    id: `cp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    conversationId,
    question,
    options: stringifyArray(opts),
    multiChoice: !!input.multiChoice,
    anonymous: !!input.anonymous,
    createdBy,
    createdAt: nowISO(),
  };
  put(POLLS, poll);
  return poll;
}

export interface VoteInput {
  pollId: string;
  optionIds: string[]; // 1 for single-choice, 1–6 for multi
  voterId: string;
}

export interface VoteResult {
  poll: ChatPoll;
  options: (ChatPollOption & { votes: number })[];
  totalVotes: number;
  voterChoice: string[];
}

function hashVoter(voterId: string, pollId: string): string {
  // Simple deterministic hash for anonymous mode — not cryptographically secure.
  let h = 0;
  const s = `${voterId}|${pollId}`;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return `anon_${(h >>> 0).toString(36)}`;
}

export async function votePoll(input: VoteInput): Promise<VoteResult> {
  const poll = get<ChatPoll>(POLLS, input.pollId);
  if (!poll) throw new Error(`poll ${input.pollId} not found`);
  const voterId = (input.voterId || "").trim().toLowerCase().replace(/^@/, "");
  if (!voterId) throw new Error("voterId is required");
  const optionIds = (input.optionIds ?? []).filter((id) => typeof id === "string" && id.length > 0);
  if (optionIds.length === 0) throw new Error("at least one optionId is required");
  if (!poll.multiChoice && optionIds.length > 1) {
    throw new Error("single-choice poll — only one option allowed");
  }
  const opts: ChatPollOption[] = parseArray<ChatPollOption>(poll.options);
  for (const oid of optionIds) {
    if (!opts.some((o) => o.id === oid)) {
      throw new Error(`option ${oid} does not exist on poll ${poll.id}`);
    }
  }
  // Remove any prior votes by this voter (single-choice enforced by unique constraint)
  const prior = find<ChatPollVote>(VOTES, (v) => v.pollId === poll.id && v.voterId === voterId);
  for (const v of prior) {
    // Remove voterId from option.votes
    const o = opts.find((o) => o.id === v.optionId);
    if (o) {
      o.votes = o.votes.filter((id) => id !== voterId && id !== hashVoter(voterId, poll.id));
    }
  }
  const recordedVoter = poll.anonymous ? hashVoter(voterId, poll.id) : voterId;
  for (const oid of optionIds) {
    const o = opts.find((o) => o.id === oid)!;
    if (!o.votes.includes(recordedVoter)) o.votes.push(recordedVoter);
    // Persist a vote row (for audit / dedup)
    const vote: ChatPollVote = {
      id: `cpv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      pollId: poll.id,
      voterId,
      optionId: oid,
      votedAt: nowISO(),
    };
    put(VOTES, vote);
  }
  const updated = update<ChatPoll>(POLLS, poll.id, { options: stringifyArray(opts) })!;
  return getPollResults(poll.id, voterId);
}

export async function getPollResults(
  pollId: string,
  voterId?: string,
): Promise<VoteResult> {
  const poll = get<ChatPoll>(POLLS, pollId);
  if (!poll) throw new Error(`poll ${pollId} not found`);
  const opts: ChatPollOption[] = parseArray<ChatPollOption>(poll.options);
  const voter = voterId ? voterId.trim().toLowerCase().replace(/^@/, "") : "";
  const recordedVoter = poll.anonymous && voter ? hashVoter(voter, poll.id) : voter;
  const voterChoice = opts.filter((o) => o.votes.includes(recordedVoter)).map((o) => o.id);
  return {
    poll,
    options: opts.map((o) => ({ ...o, votes: o.votes.length })),
    totalVotes: opts.reduce((s, o) => s + o.votes.length, 0),
    voterChoice,
  };
}

export async function listPollsInConversation(conversationId: string): Promise<ChatPoll[]> {
  const cid = (conversationId || "").trim();
  return find<ChatPoll>(POLLS, (p) => p.conversationId === cid)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listPollsByCreator(createdBy: string): Promise<ChatPoll[]> {
  const id = (createdBy || "").trim().toLowerCase().replace(/^@/, "");
  return find<ChatPoll>(POLLS, (p) => p.createdBy === id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function parseOptions(poll: ChatPoll): ChatPollOption[] {
  return parseArray<ChatPollOption>(poll.options);
}

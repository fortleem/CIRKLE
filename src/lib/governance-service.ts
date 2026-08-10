/**
 * CIRKLE — Community Governance Service (P2.4).
 *
 * Status: WORKING ABSTRACTION.
 *
 * Server-only library that implements the community governance pillar:
 * proposals + voting + moderation appeals + jury votes. Lives behind the
 * `/api/governance/*` routes which the existing `governance-center.tsx`
 * overlay consumes.
 *
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  Today (sandbox)        ───►  Upgrade path (production)         │
 *   ├─────────────────────────────────┼──────────────────────────────┤
 *   │  Prisma GovernanceProposal      │  Snapshotable on-chain DAO     │
 *   │  One-vote-per-username          │  One-vote-per-Circle-Verify ID │
 *   │  Simple yes/no/abstain          │  Quadratic + conviction voting │
 *   │  Manual jury selection          │  Sortition-based jury (RNG)    │
 *   │  E2EE signature (optional)      │  Mandatory on-chain signature  │
 *   └─────────────────────────────────┴──────────────────────────────┘
 *
 * Covenant (Blueprint §Covenant):
 *   • One human, one vote (enforced by Circle Verify — one account per human).
 *   • All proposals + votes are public on the Cirkle ledger.
 *   • The council is a rotating set of verified members; the jury for each
 *     appeal is randomly selected from the council.
 */

import "server-only";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ── Types ───────────────────────────────────────────────────────────────────

export type ProposalType = "covenant" | "treasury" | "feature" | "moderation" | "other";
export type ProposalStatus = "voting" | "passed" | "rejected" | "closed";
export type VoteChoice = "yes" | "no" | "abstain";
export type AppealVoteChoice = "uphold" | "overturn";
export type AppealStatus = "open" | "upheld" | "overturned" | "closed";

export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: ProposalType;
  author: string;
  status: ProposalStatus;
  closesAt: string;
  yes: number;
  no: number;
  abstain: number;
  createdAt: string;
  updatedAt: string;
}

export interface Appeal {
  id: string;
  contentId: string;
  contentType: string;
  appellant: string;
  reason: string;
  originalAction: string;
  status: AppealStatus;
  upholdVotes: number;
  overturnVotes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CouncilMember {
  username: string;
  role: "council" | "moderator" | "steward";
  since: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const VALID_PROPOSAL_TYPES: readonly ProposalType[] = [
  "covenant", "treasury", "feature", "moderation", "other",
];
const VALID_VOTES: readonly VoteChoice[] = ["yes", "no", "abstain"];
const VALID_APPEAL_VOTES: readonly AppealVoteChoice[] = ["uphold", "overturn"];

function rowToProposal(r: {
  id: string;
  title: string;
  description: string;
  type: string;
  author: string;
  status: string;
  closesAt: Date;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  createdAt: Date;
  updatedAt: Date;
}): Proposal {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: (VALID_PROPOSAL_TYPES as readonly string[]).includes(r.type)
      ? (r.type as ProposalType)
      : "other",
    author: r.author,
    status: r.status as ProposalStatus,
    closesAt: r.closesAt.toISOString(),
    yes: r.yesVotes,
    no: r.noVotes,
    abstain: r.abstainVotes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function rowToAppeal(r: {
  id: string;
  contentId: string;
  contentType: string;
  appellant: string;
  reason: string;
  originalAction: string;
  status: string;
  upholdVotes: number;
  overturnVotes: number;
  createdAt: Date;
  updatedAt: Date;
}): Appeal {
  return {
    id: r.id,
    contentId: r.contentId,
    contentType: r.contentType,
    appellant: r.appellant,
    reason: r.reason,
    originalAction: r.originalAction,
    status: r.status as AppealStatus,
    upholdVotes: r.upholdVotes,
    overturnVotes: r.overturnVotes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function normalizeUsername(raw: string): string {
  return (raw || "").trim().toLowerCase().replace(/^@/, "");
}

const COUNCIL_SEED: CouncilMember[] = [
  { username: "layla", role: "council", since: "2024-01-01T00:00:00.000Z" },
  { username: "khalid", role: "moderator", since: "2024-01-01T00:00:00.000Z" },
  { username: "amira", role: "steward", since: "2024-02-01T00:00:00.000Z" },
  { username: "yusuf", role: "council", since: "2024-03-01T00:00:00.000Z" },
  { username: "nora", role: "council", since: "2024-04-01T00:00:00.000Z" },
];

// ── Public API: Proposals ───────────────────────────────────────────────────

/**
 * Create a new proposal. The proposer is the author. The proposal is open
 * for voting until `closesAt` (default 7 days from now).
 */
export async function createProposal(
  title: string,
  description: string,
  type: ProposalType | string,
  author: string,
  closesAt?: Date,
): Promise<Proposal> {
  const t = (title || "").trim();
  if (!t) throw new Error("title is required");
  if (t.length > 200) throw new Error("title too long (200 chars max)");
  const d = (description || "").trim().slice(0, 5000);
  const a = normalizeUsername(author);
  if (!a) throw new Error("author is required");
  const pt: ProposalType = (VALID_PROPOSAL_TYPES as readonly string[]).includes(type)
    ? (type as ProposalType)
    : "other";
  const close = closesAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const row = await db.governanceProposal.create({
    data: {
      title: t,
      description: d,
      type: pt,
      author: a,
      status: "voting",
      closesAt: close,
      yesVotes: 0,
      noVotes: 0,
      abstainVotes: 0,
    },
  });
  logger.info("[governance] proposal created", { id: row.id, author: a, type: pt });
  return rowToProposal(row);
}

/**
 * Vote on a proposal. One vote per user (enforced by @@unique). Switching
 * a vote is allowed — the previous vote's counter is decremented and the
 * new vote's counter is incremented in a single transaction.
 *
 * The optional `signature` is an E2EE signature over `${proposalId}|${vote}`
 * proving the vote came from the holder of the voter's signing key (ADR-002).
 */
export async function vote(
  proposalId: string,
  voter: string,
  choice: VoteChoice,
  signature?: string,
): Promise<{ ok: boolean; tally: { yes: number; no: number; abstain: number } }> {
  if (!proposalId) throw new Error("proposalId is required");
  const v = normalizeUsername(voter);
  if (!v) throw new Error("voter is required");
  if (!(VALID_VOTES as readonly string[]).includes(choice)) {
    throw new Error("invalid vote choice");
  }

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.governanceVote.findUnique({
      where: { proposalId_voter: { proposalId, voter: v } },
    });
    if (existing) {
      if (existing.vote === choice) {
        return { changed: false };
      }
      // Decrement the old vote counter.
      const oldField =
        existing.vote === "yes" ? "yesVotes"
        : existing.vote === "no" ? "noVotes"
        : "abstainVotes";
      const newField =
        choice === "yes" ? "yesVotes"
        : choice === "no" ? "noVotes"
        : "abstainVotes";
      await tx.governanceProposal.update({
        where: { id: proposalId },
        data: { [oldField]: { decrement: 1 }, [newField]: { increment: 1 } },
      });
      await tx.governanceVote.update({
        where: { id: existing.id },
        data: { vote: choice, signature: signature ?? existing.signature },
      });
      return { changed: true };
    }
    // No prior vote — record + increment.
    const field =
      choice === "yes" ? "yesVotes"
      : choice === "no" ? "noVotes"
      : "abstainVotes";
    await tx.governanceProposal.update({
      where: { id: proposalId },
      data: { [field]: { increment: 1 } },
    });
    await tx.governanceVote.create({
      data: { proposalId, voter: v, vote: choice, signature },
    });
    return { changed: true };
  });

  void result; // tally is refetched below for correctness

  const p = await db.governanceProposal.findUnique({ where: { id: proposalId } });
  return {
    ok: true,
    tally: {
      yes: p?.yesVotes ?? 0,
      no: p?.noVotes ?? 0,
      abstain: p?.abstainVotes ?? 0,
    },
  };
}

/**
 * List proposals, optionally filtered by status. Newest first.
 */
export async function getProposals(
  status?: ProposalStatus,
  type?: ProposalType,
  limit = 50,
): Promise<Proposal[]> {
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  const rows = await db.governanceProposal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
  return rows.map(rowToProposal);
}

/**
 * Get a single proposal by id.
 */
export async function getProposal(id: string): Promise<Proposal | null> {
  if (!id) return null;
  const row = await db.governanceProposal.findUnique({ where: { id } });
  return row ? rowToProposal(row) : null;
}

// ── Public API: Appeals ─────────────────────────────────────────────────────

export async function createAppeal(
  contentId: string,
  contentType: string,
  appellant: string,
  reason: string,
  originalAction = "auto-removed",
): Promise<Appeal> {
  const cid = (contentId || "").trim();
  if (!cid) throw new Error("contentId is required");
  const a = normalizeUsername(appellant);
  if (!a) throw new Error("appellant is required");
  const r = (reason || "").trim().slice(0, 5000);
  if (!r) throw new Error("reason is required");
  const ct = ["post", "comment", "account"].includes(contentType) ? contentType : "post";

  const row = await db.moderationAppeal.create({
    data: {
      contentId: cid,
      contentType: ct,
      appellant: a,
      reason: r,
      originalAction,
      status: "open",
      upholdVotes: 0,
      overturnVotes: 0,
    },
  });
  logger.info("[governance] appeal created", { id: row.id, appellant: a });
  return rowToAppeal(row);
}

export async function voteOnAppeal(
  appealId: string,
  voter: string,
  choice: AppealVoteChoice,
  signature?: string,
): Promise<{ ok: boolean; tally: { uphold: number; overturn: number } }> {
  if (!appealId) throw new Error("appealId is required");
  const v = normalizeUsername(voter);
  if (!v) throw new Error("voter is required");
  if (!(VALID_APPEAL_VOTES as readonly string[]).includes(choice)) {
    throw new Error("invalid appeal vote choice");
  }

  await db.$transaction(async (tx) => {
    const existing = await tx.appealVote.findUnique({
      where: { appealId_voter: { appealId, voter: v } },
    });
    if (existing) {
      if (existing.vote === choice) return;
      const oldField = existing.vote === "uphold" ? "upholdVotes" : "overturnVotes";
      const newField = choice === "uphold" ? "upholdVotes" : "overturnVotes";
      await tx.moderationAppeal.update({
        where: { id: appealId },
        data: { [oldField]: { decrement: 1 }, [newField]: { increment: 1 } },
      });
      await tx.appealVote.update({
        where: { id: existing.id },
        data: { vote: choice, signature: signature ?? existing.signature },
      });
      return;
    }
    const field = choice === "uphold" ? "upholdVotes" : "overturnVotes";
    await tx.moderationAppeal.update({
      where: { id: appealId },
      data: { [field]: { increment: 1 } },
    });
    await tx.appealVote.create({
      data: { appealId, voter: v, vote: choice, signature },
    });
  });

  const a = await db.moderationAppeal.findUnique({ where: { id: appealId } });
  return {
    ok: true,
    tally: { uphold: a?.upholdVotes ?? 0, overturn: a?.overturnVotes ?? 0 },
  };
}

export async function getAppeals(
  status?: AppealStatus,
  limit = 50,
): Promise<Appeal[]> {
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const rows = await db.moderationAppeal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
  return rows.map(rowToAppeal);
}

// ── Public API: Council ─────────────────────────────────────────────────────

/**
 * Return the current council members. Today this is a static seed list —
 * the upgrade path is sortition-based selection from verified members.
 */
export async function getCouncilMembers(): Promise<CouncilMember[]> {
  return COUNCIL_SEED;
}

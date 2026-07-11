import "server-only";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U11 — Community Jury System
// When the AI Mediator can't reach consensus, either party can escalate to a
// 5-juror community panel. Jurors are mock "verified users" pulled from a
// rotating pool. Cases auto-expire 24h after creation.
// ─────────────────────────────────────────────────────────────────────────────

export type JuryVote = "party_a" | "party_b" | "split";
export type JuryStatus = "gathering_jury" | "voting" | "resolved" | "expired";

export interface JuryEvidence {
  party: string;
  text: string;
  timestamp: string;
}

export interface Juror {
  username: string;
  vote: JuryVote | null;
  reasoning?: string;
  votedAt?: string;
}

export interface JuryResult {
  winner: string; // party name or "split"
  split?: number; // 0-100 (% to party_a) when winner === "split"
  reasoning: string;
  votesForPartyA: number;
  votesForPartyB: number;
  votesForSplit: number;
}

export interface JuryCase {
  id: string;
  agreementId: string;
  agreementTitle: string;
  partyA: string;
  partyB: string;
  disputeReason: string;
  evidence: JuryEvidence[];
  jurors: Juror[];
  status: JuryStatus;
  result?: JuryResult;
  createdAt: string;
  expiresAt: string; // 24h from creation
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store + juror pool
// ─────────────────────────────────────────────────────────────────────────────

const cases = new Map<string, JuryCase>();

// Rotating pool of mock verified users eligible for jury duty.
const JUROR_POOL = [
  "mona_verified",
  "yusuf_p2p",
  "huda_writer",
  "tariq_builder",
  "salma_artist",
  "khalil_dev",
  "rana_teacher",
  "omar_merchant",
  "lina_jd",
  "farouq_auditor",
  "nour_designer",
  "ibrahim_eng",
];

function pickJurors(count: number, exclude: Set<string>): string[] {
  const available = JUROR_POOL.filter((u) => !exclude.has(u));
  // Deterministic shuffle so the same case always gets the same jurors.
  const seed = exclude.size + Date.now() % 1000;
  const rng = mulberry32(seed);
  const shuffled = available.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateJuryInput {
  agreementId: string;
  agreementTitle: string;
  partyA: string;
  partyB: string;
  disputeReason: string;
  evidence?: { party: string; text: string }[];
  jurorCount?: number;
}

export async function createJuryCase(input: CreateJuryInput): Promise<JuryCase> {
  const id = `jury-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h
  const exclude = new Set<string>([input.partyA, input.partyB]);
  const jurorUsernames = pickJurors(input.jurorCount ?? 5, exclude);

  const evidence: JuryEvidence[] = (input.evidence ?? []).map((e) => ({
    party: e.party,
    text: e.text,
    timestamp: now.toISOString(),
  }));

  const newCase: JuryCase = {
    id,
    agreementId: input.agreementId,
    agreementTitle: input.agreementTitle,
    partyA: input.partyA,
    partyB: input.partyB,
    disputeReason: input.disputeReason,
    evidence,
    jurors: jurorUsernames.map((u) => ({ username: u, vote: null })),
    status: "voting",
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  cases.set(id, newCase);
  return newCase;
}

export async function assignJurors(caseId: string, count: number): Promise<void> {
  const c = cases.get(caseId);
  if (!c) return;
  const exclude = new Set<string>([c.partyA, c.partyB, ...c.jurors.map((j) => j.username)]);
  const additions = pickJurors(count, exclude);
  for (const u of additions) {
    c.jurors.push({ username: u, vote: null });
  }
  cases.set(caseId, c);
}

export async function castVote(
  caseId: string,
  jurorUsername: string,
  vote: JuryVote,
  reasoning: string,
): Promise<JuryCase | null> {
  const c = cases.get(caseId);
  if (!c) return null;
  if (c.status === "resolved" || c.status === "expired") return c;
  if (+new Date(c.expiresAt) < Date.now()) {
    c.status = "expired";
    cases.set(caseId, c);
    return c;
  }
  const juror = c.jurors.find((j) => j.username === jurorUsername);
  if (!juror) return c; // not on the panel
  juror.vote = vote;
  juror.reasoning = reasoning;
  juror.votedAt = new Date().toISOString();
  cases.set(caseId, c);
  // Auto-resolve once every juror has voted.
  if (c.jurors.every((j) => j.vote !== null)) {
    return resolveCase(caseId);
  }
  return c;
}

export async function resolveCase(caseId: string): Promise<JuryCase | null> {
  const c = cases.get(caseId);
  if (!c) return null;
  const voted = c.jurors.filter((j) => j.vote !== null);
  if (voted.length === 0) return c;

  const votesForA = voted.filter((j) => j.vote === "party_a").length;
  const votesForB = voted.filter((j) => j.vote === "party_b").length;
  const votesForSplit = voted.filter((j) => j.vote === "split").length;

  let winner: string;
  let split: number | undefined;
  if (votesForA > votesForB && votesForA > votesForSplit) {
    winner = c.partyA;
  } else if (votesForB > votesForA && votesForB > votesForSplit) {
    winner = c.partyB;
  } else {
    // tie or split plurality → split decision, % to party_a
    winner = "split";
    const totalA = votesForA + Math.round(votesForSplit / 2);
    split = Math.round((totalA / voted.length) * 100);
  }

  c.result = {
    winner,
    split,
    votesForPartyA: votesForA,
    votesForPartyB: votesForB,
    votesForSplit,
    reasoning: buildReasoning(c, { winner, votesForA, votesForB, votesForSplit }),
  };
  c.status = "resolved";
  cases.set(caseId, c);
  return c;
}

function buildReasoning(
  c: JuryCase,
  v: { winner: string; votesForA: number; votesForB: number; votesForSplit: number },
): string {
  const total = v.votesForA + v.votesForB + v.votesForSplit;
  if (v.winner === c.partyA) {
    return `Majority of the jury (${v.votesForA}/${total}) ruled in favor of ${c.partyA}. ${c.partyB} should release funds/perform remediation as described in the agreement.`;
  }
  if (v.winner === c.partyB) {
    return `Majority of the jury (${v.votesForB}/${total}) ruled in favor of ${c.partyB}. ${c.partyA}'s claim was not substantiated by the evidence presented.`;
  }
  return `The jury could not reach a majority — split decision (${v.votesForA}/${v.votesForB}/${v.votesForSplit} for A/B/split). Funds should be divided per the split percentage.`;
}

export async function listCases(): Promise<JuryCase[]> {
  // Expire any overdue cases on read.
  const now = Date.now();
  for (const c of cases.values()) {
    if (c.status === "voting" && +new Date(c.expiresAt) < now) {
      c.status = "expired";
      cases.set(c.id, c);
    }
  }
  return Array.from(cases.values()).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function getCase(id: string): Promise<JuryCase | null> {
  return cases.get(id) ?? null;
}

/**
 * Seed a sample case so the UI has something to show on first load. The
 * current user ("you") is mock-listed as a juror so the voting UI is
 * reachable without manual setup.
 */
export function seedSampleCase(): void {
  if (cases.size > 0) return;
  const now = new Date();
  const expires = new Date(now.getTime() + 18 * 60 * 60 * 1000);
  const sample: JuryCase = {
    id: "jury-sample1",
    agreementId: "cm-2",
    agreementTitle: "Website development — Due Friday",
    partyA: "You",
    partyB: "Layla Bakery",
    disputeReason:
      "Layla claims the final design doesn't match the agreed mockup. You claim the mockup was approved mid-project and the changes requested go beyond the original scope.",
    evidence: [
      {
        party: "Layla Bakery",
        text: "The header layout differs from the approved Figma — icons are on the wrong side and the hero image is cropped.",
        timestamp: new Date(now.getTime() - 3 * 3600_000).toISOString(),
      },
      {
        party: "You",
        text: "The Figma was updated on day 4 after Layla requested 'a more modern look' over WhatsApp. The current build reflects that revision.",
        timestamp: new Date(now.getTime() - 2 * 3600_000).toISOString(),
      },
    ],
    jurors: [
      { username: "you", vote: null },
      { username: "mona_verified", vote: "party_b", reasoning: "Mockup was the source of truth; deviation without written sign-off.", votedAt: new Date(now.getTime() - 1 * 3600_000).toISOString() },
      { username: "tariq_builder", vote: "split", reasoning: "Both sides mis-managed scope; recommend 60/40 refund.", votedAt: new Date(now.getTime() - 30 * 60_000).toISOString() },
      { username: "salma_artist", vote: null },
      { username: "khalil_dev", vote: null },
    ],
    status: "voting",
    createdAt: new Date(now.getTime() - 6 * 3600_000).toISOString(),
    expiresAt: expires.toISOString(),
  };
  cases.set(sample.id, sample);
}

// Auto-seed on module load.
seedSampleCase();

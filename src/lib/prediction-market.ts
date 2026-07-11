/**
 * Cirkle Oracle — Prediction Markets
 *
 * Extends the existing `predictPrice` in `cirkle-brain.ts` into a full
 * prediction-market layer. Markets use an automated market maker based on
 * the Logarithmic Market Scoring Rule (LMSR):
 *
 *   cost(q)     = b * ln(Σ e^(qi / b))          — total cost of inventory vector q
 *   price(qi)   = e^(qi / b) / Σ e^(qj / b)     — instantaneous price of outcome i = probability
 *
 * where `b` is the liquidity parameter (default 100). Buying Δ shares of
 * outcome i costs:
 *
 *   cost = b * ln( e^((qi + Δ) / b) + Σ_{j≠i} e^(qj / b) )
 *        - b * ln( e^(qi / b)         + Σ_{j≠i} e^(qj / b) )
 *
 * All math runs on the server (this module is server-only) using the
 * standard `Math.exp`/`Math.log` functions — no external deps.
 */

import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────

export type MarketCategory =
  | "news"
  | "sports"
  | "politics"
  | "crypto"
  | "travel"
  | "weather"
  | "visa"
  | "social";

export interface MarketOutcome {
  id: string;
  label: string;
  /** Current share count for this outcome (LMSR inventory). */
  shares: number;
  /** Current probability (0-1) — derived from shares via LMSR price formula. */
  probability: number;
}

export interface PredictionMarket {
  id: string;
  question: string;
  category: MarketCategory;
  resolutionDate: string;
  outcomes: MarketOutcome[];
  totalVolume: number;
  resolved: boolean;
  resolutionOutcome?: string;
  /** LMSR liquidity parameter `b`. */
  liquidityParam: number;
  createdAt: string;
  createdBy: string;
}

export interface PredictionBet {
  id: string;
  marketId: string;
  username: string;
  outcomeId: string;
  shares: number;
  amount: number;
  currency: string;
  createdAt: string;
  /** Snapshot of the question + outcome label at bet time, for nice UI. */
  question?: string;
  outcomeLabel?: string;
  /** Populated when the market is resolved. */
  resolved?: boolean;
  won?: boolean;
  payout?: number;
}

export interface CreateMarketOptions {
  question: string;
  category: MarketCategory;
  resolutionDate: string; // ISO
  outcomes: { id: string; label: string }[];
  createdBy: string;
  liquidityParam?: number;
}

export interface PlaceBetOptions {
  marketId: string;
  outcomeId: string;
  username: string;
  amount: number;
  currency?: string;
}

// ── LMSR math ────────────────────────────────────────────────────────────

/** Default liquidity parameter `b`. Higher = more liquidity, less slippage. */
export const DEFAULT_LIQUIDITY = 100;

/**
 * Compute LMSR cost of an inventory vector.
 *   cost(q) = b * ln(Σ e^(qi / b))
 *
 * Numerically stabilised via log-sum-exp so we don't overflow on large
 * inventories.
 */
export function lmsrCost(shares: number[], b: number): number {
  if (shares.length === 0) return 0;
  if (b <= 0) return 0;
  const scaled = shares.map((s) => s / b);
  const max = Math.max(...scaled);
  // log-sum-exp: ln(Σ e^xi) = max + ln(Σ e^(xi - max))
  const sumExp = scaled.reduce((acc, x) => acc + Math.exp(x - max), 0);
  return b * (max + Math.log(sumExp));
}

/**
 * Compute LMSR price (probability) of each outcome.
 *   price(qi) = e^(qi / b) / Σ e^(qj / b)
 *
 * Returns an array of probabilities that always sum to 1 (within FP
 * tolerance).
 */
export function lmsrPrices(shares: number[], b: number): number[] {
  if (shares.length === 0) return [];
  if (b <= 0) return shares.map(() => 1 / shares.length);
  const exps = shares.map((s) => Math.exp(s / b));
  const sum = exps.reduce((a, b2) => a + b2, 0);
  if (sum === 0) return shares.map(() => 1 / shares.length);
  return exps.map((e) => e / sum);
}

/**
 * Cost to buy `delta` shares of outcome `i`, given the current inventory
 * vector `q`. The buyer pays the *change* in LMSR cost.
 *
 *   cost = lmsrCost(q with qi → qi + delta) − lmsrCost(q)
 *
 * `delta` may be negative (selling) — the cost will be negative, i.e. the
 * seller receives proceeds.
 */
export function lmsrBuyCost(
  shares: number[],
  b: number,
  outcomeIndex: number,
  delta: number,
): number {
  if (outcomeIndex < 0 || outcomeIndex >= shares.length) return 0;
  const before = lmsrCost(shares, b);
  const after = lmsrCost(
    shares.map((s, i) => (i === outcomeIndex ? s + delta : s)),
    b,
  );
  return after - before;
}

// ── Helpers ──────────────────────────────────────────────────────────────

const VALID_CATEGORIES: MarketCategory[] = [
  "news",
  "sports",
  "politics",
  "crypto",
  "travel",
  "weather",
  "visa",
  "social",
];

function rowToMarket(row: {
  id: string;
  question: string;
  category: string;
  resolutionDate: Date;
  outcomes: string;
  totalVolume: number;
  resolved: boolean;
  resolutionOutcome: string | null;
  liquidityParam: number;
  createdAt: Date;
  createdBy: string;
}): PredictionMarket {
  let outcomes: MarketOutcome[] = [];
  try {
    const parsed = JSON.parse(row.outcomes) as MarketOutcome[];
    if (Array.isArray(parsed)) outcomes = parsed;
  } catch {
    outcomes = [];
  }
  // Re-derive probabilities from shares so they're always consistent.
  const probs = lmsrPrices(
    outcomes.map((o) => o.shares),
    row.liquidityParam,
  );
  const outcomesWithProbs: MarketOutcome[] = outcomes.map((o, i) => ({
    ...o,
    probability: probs[i] ?? 0,
  }));
  return {
    id: row.id,
    question: row.question,
    category: row.category as MarketCategory,
    resolutionDate: row.resolutionDate.toISOString(),
    outcomes: outcomesWithProbs,
    totalVolume: row.totalVolume,
    resolved: row.resolved,
    resolutionOutcome: row.resolutionOutcome ?? undefined,
    liquidityParam: row.liquidityParam,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
  };
}

function rowToBet(
  row: {
    id: string;
    marketId: string;
    username: string;
    outcomeId: string;
    shares: number;
    amount: number;
    currency: string;
    createdAt: Date;
  },
  market?: { question: string; outcomes: MarketOutcome[]; resolved: boolean; resolutionOutcome: string | null },
): PredictionBet {
  const outcomeLabel = market?.outcomes.find((o) => o.id === row.outcomeId)?.label;
  const won =
    market?.resolved === true
      ? market.resolutionOutcome === row.outcomeId
      : undefined;
  const payout =
    market?.resolved === true && won === true ? row.shares : undefined;
  return {
    id: row.id,
    marketId: row.marketId,
    username: row.username,
    outcomeId: row.outcomeId,
    shares: row.shares,
    amount: row.amount,
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
    question: market?.question,
    outcomeLabel,
    resolved: market?.resolved,
    won,
    payout,
  };
}

// ── Seed (lazy, like the rest of Cirkle) ─────────────────────────────────

let seedPromise: Promise<void> | null = null;

async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const count = await db.predictionMarket.count();
    if (count > 0) return;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const seeds: CreateMarketOptions[] = [
      {
        question: "Will Bitcoin close above $100,000 by end of month?",
        category: "crypto",
        resolutionDate: new Date(now + 12 * day).toISOString(),
        outcomes: [
          { id: "yes", label: "Yes — above $100k" },
          { id: "no", label: "No — below $100k" },
        ],
        createdBy: "cirkle-oracle",
      },
      {
        question: "Will Egypt's national team reach the AFCON 2026 final?",
        category: "sports",
        resolutionDate: new Date(now + 30 * day).toISOString(),
        outcomes: [
          { id: "yes", label: "Yes — Pharaohs in the final" },
          { id: "no", label: "No — eliminated before final" },
        ],
        createdBy: "cirkle-oracle",
      },
      {
        question: "Will Saudi Arabia announce NEOM phase 1 completion date this quarter?",
        category: "news",
        resolutionDate: new Date(now + 60 * day).toISOString(),
        outcomes: [
          { id: "yes", label: "Yes — official date announced" },
          { id: "no", label: "No — delayed or no announcement" },
        ],
        createdBy: "cirkle-oracle",
      },
      {
        question: "Will the UAE introduce a new 5-year multiple-entry visa this year?",
        category: "visa",
        resolutionDate: new Date(now + 90 * day).toISOString(),
        outcomes: [
          { id: "yes", label: "Yes — new visa launched" },
          { id: "no", label: "No — no change" },
        ],
        createdBy: "cirkle-oracle",
      },
      {
        question: "Will Istanbul see more than 30°C next weekend?",
        category: "weather",
        resolutionDate: new Date(now + 7 * day).toISOString(),
        outcomes: [
          { id: "yes", label: "Yes — heatwave ≥ 30°C" },
          { id: "no", label: "No — stays below 30°C" },
        ],
        createdBy: "cirkle-oracle",
      },
      {
        question: "Will flight prices CAI → IST drop more than 10% next week?",
        category: "travel",
        resolutionDate: new Date(now + 7 * day).toISOString(),
        outcomes: [
          { id: "yes", label: "Yes — prices drop ≥ 10%" },
          { id: "no", label: "No — prices hold or rise" },
        ],
        createdBy: "cirkle-oracle",
      },
    ];
    for (const s of seeds) {
      await createMarket(s);
    }
  })();
  return seedPromise;
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Create a new prediction market. Outcomes start at equal share counts (0),
 * so all probabilities begin at 1/N.
 */
export async function createMarket(opts: CreateMarketOptions): Promise<PredictionMarket> {
  const question = opts.question.trim();
  if (!question) throw new Error("Question is required");
  if (question.length > 280) throw new Error("Question must be 280 characters or fewer");
  if (!VALID_CATEGORIES.includes(opts.category)) {
    throw new Error(`Invalid category. Valid: ${VALID_CATEGORIES.join(", ")}`);
  }
  if (!Array.isArray(opts.outcomes) || opts.outcomes.length < 2) {
    throw new Error("At least 2 outcomes are required");
  }
  if (opts.outcomes.length > 8) {
    throw new Error("At most 8 outcomes are supported");
  }
  const resolutionDate = new Date(opts.resolutionDate);
  if (Number.isNaN(resolutionDate.getTime())) {
    throw new Error("Invalid resolutionDate");
  }
  if (resolutionDate.getTime() <= Date.now()) {
    throw new Error("resolutionDate must be in the future");
  }

  const liquidity = opts.liquidityParam ?? DEFAULT_LIQUIDITY;
  if (liquidity <= 0) throw new Error("liquidityParam must be positive");

  // Normalise outcome ids + deduplicate.
  const seen = new Set<string>();
  const outcomes: MarketOutcome[] = [];
  for (const o of opts.outcomes) {
    const id = (o.id || o.label).trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
    if (!id) throw new Error("Outcome id is required");
    if (seen.has(id)) throw new Error(`Duplicate outcome id: ${id}`);
    seen.add(id);
    outcomes.push({ id, label: o.label.trim() || id, shares: 0, probability: 1 / opts.outcomes.length });
  }

  const row = await db.predictionMarket.create({
    data: {
      question,
      category: opts.category,
      resolutionDate,
      outcomes: JSON.stringify(outcomes),
      totalVolume: 0,
      resolved: false,
      liquidityParam: liquidity,
      createdBy: opts.createdBy.trim() || "anonymous",
    },
  });
  return rowToMarket(row);
}

/**
 * List markets, optionally filtered by category or resolution state.
 * Always sorts by createdAt desc.
 */
export async function getMarkets(filter?: {
  category?: MarketCategory;
  resolved?: boolean;
}): Promise<PredictionMarket[]> {
  await ensureSeeded();
  const where: { category?: string; resolved?: boolean } = {};
  if (filter?.category && VALID_CATEGORIES.includes(filter.category)) {
    where.category = filter.category;
  }
  if (typeof filter?.resolved === "boolean") {
    where.resolved = filter.resolved;
  }
  const rows = await db.predictionMarket.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(rowToMarket);
}

/** Single market by id (with derived probabilities). */
export async function getMarket(marketId: string): Promise<PredictionMarket | null> {
  await ensureSeeded();
  const row = await db.predictionMarket.findUnique({ where: { id: marketId } });
  return row ? rowToMarket(row) : null;
}

/**
 * Place a bet on a market outcome.
 *
 * Uses LMSR to compute the share count the buyer receives for their
 * `amount` of currency. We approximate by iteratively stepping Δ shares
 * until the cumulative cost matches the amount (greedy — fast + tight).
 *
 * Returns the new share count + new probability for the chosen outcome.
 */
export async function placeBet(
  opts: PlaceBetOptions,
): Promise<{ shares: number; newProbability: number; market: PredictionMarket }> {
  await ensureSeeded();

  if (!opts.marketId) throw new Error("marketId is required");
  if (!opts.outcomeId) throw new Error("outcomeId is required");
  if (!opts.username) throw new Error("username is required");
  if (!Number.isFinite(opts.amount) || opts.amount <= 0) {
    throw new Error("amount must be a positive number");
  }

  const row = await db.predictionMarket.findUnique({ where: { id: opts.marketId } });
  if (!row) throw new Error("Market not found");
  if (row.resolved) throw new Error("Market already resolved");

  let outcomes: MarketOutcome[] = [];
  try {
    outcomes = JSON.parse(row.outcomes) as MarketOutcome[];
  } catch {
    throw new Error("Market outcome data corrupted");
  }
  const outcomeIdx = outcomes.findIndex((o) => o.id === opts.outcomeId);
  if (outcomeIdx < 0) throw new Error("Outcome not found in this market");

  const b = row.liquidityParam;
  const shares = outcomes.map((o) => o.shares);

  // Greedy step search for Δ such that LMSR buy cost ≈ amount.
  // Start with a coarse estimate (price ≈ current prob, Δ ≈ amount / price),
  // then refine with a binary search for precision.
  const currentPrices = lmsrPrices(shares, b);
  const approxPrice = Math.max(0.01, currentPrices[outcomeIdx]);
  let delta = opts.amount / approxPrice;

  // Refine: adjust delta so buy cost matches amount within 0.1%.
  let lo = delta * 0.5;
  let hi = delta * 2;
  for (let iter = 0; iter < 24; iter++) {
    const cost = lmsrBuyCost(shares, b, outcomeIdx, delta);
    if (Math.abs(cost - opts.amount) / opts.amount < 0.001) break;
    if (cost < opts.amount) lo = delta;
    else hi = delta;
    delta = (lo + hi) / 2;
  }

  // Clamp to non-negative share delta (the buyer can't short).
  if (delta <= 0) throw new Error("Could not compute a valid share count");

  const finalShares = shares.map((s, i) => (i === outcomeIdx ? s + delta : s));
  const finalPrices = lmsrPrices(finalShares, b);

  // Persist the new inventory + bet record + volume bump.
  const newOutcomes: MarketOutcome[] = outcomes.map((o, i) => ({
    ...o,
    shares: finalShares[i],
    probability: finalPrices[i],
  }));

  await db.$transaction([
    db.predictionMarket.update({
      where: { id: row.id },
      data: {
        outcomes: JSON.stringify(newOutcomes),
        totalVolume: { increment: opts.amount },
      },
    }),
    db.predictionBet.create({
      data: {
        marketId: row.id,
        username: opts.username.trim(),
        outcomeId: opts.outcomeId,
        shares: delta,
        amount: opts.amount,
        currency: opts.currency?.trim() || "EGP",
      },
    }),
  ]);

  const updated = await db.predictionMarket.findUnique({ where: { id: row.id } });
  return {
    shares: delta,
    newProbability: finalPrices[outcomeIdx],
    market: updated ? rowToMarket(updated) : rowToMarket(row),
  };
}

/**
 * Resolve a market: set `resolved = true` and store the winning outcome id.
 * All bets on the winning outcome win 1 unit per share (parimutuel-ish);
 * bets on other outcomes lose their stake.
 *
 * In a production system this would be triggered by an oracle or trusted
 * resolver; here it's exposed via the admin API for demo purposes.
 */
export async function resolveMarket(
  marketId: string,
  winningOutcomeId: string,
): Promise<PredictionMarket> {
  await ensureSeeded();

  const row = await db.predictionMarket.findUnique({ where: { id: marketId } });
  if (!row) throw new Error("Market not found");
  if (row.resolved) throw new Error("Market already resolved");

  let outcomes: MarketOutcome[] = [];
  try {
    outcomes = JSON.parse(row.outcomes) as MarketOutcome[];
  } catch {
    throw new Error("Market outcome data corrupted");
  }
  if (!outcomes.some((o) => o.id === winningOutcomeId)) {
    throw new Error("winningOutcomeId not found in this market");
  }

  const updated = await db.predictionMarket.update({
    where: { id: marketId },
    data: {
      resolved: true,
      resolutionOutcome: winningOutcomeId,
    },
  });

  logger.info("[prediction-market] resolved", {
    marketId,
    winningOutcomeId,
    totalVolume: row.totalVolume,
  });

  return rowToMarket(updated);
}

/**
 * Get every bet placed by a user. Each bet is enriched with the market's
 * question, outcome label, resolution state, win/loss, and payout.
 */
export async function getUserBets(username: string): Promise<PredictionBet[]> {
  await ensureSeeded();
  if (!username) return [];
  const bets = await db.predictionBet.findMany({
    where: { username },
    orderBy: { createdAt: "desc" },
  });
  if (bets.length === 0) return [];

  // Fetch all the markets in one query for efficiency.
  const marketIds = Array.from(new Set(bets.map((b) => b.marketId)));
  const markets = await db.predictionMarket.findMany({
    where: { id: { in: marketIds } },
  });
  const marketById = new Map(markets.map((m) => [m.id, m]));

  return bets.map((b) => {
    const m = marketById.get(b.marketId);
    let outcomes: MarketOutcome[] = [];
    if (m) {
      try {
        outcomes = JSON.parse(m.outcomes) as MarketOutcome[];
      } catch {
        outcomes = [];
      }
    }
    return rowToBet(b, m
      ? {
          question: m.question,
          outcomes,
          resolved: m.resolved,
          resolutionOutcome: m.resolutionOutcome,
        }
      : undefined);
  });
}

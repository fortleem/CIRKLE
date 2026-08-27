// @ts-nocheck
/**
 * AI Friendship Health Meter (Tier E, E7).
 *
 * Analyzes the health of a friendship/contact relationship based on:
 *   • message frequency (messages per week over last 90 days)
 *   • sentiment of recent messages (positive/neutral/negative ratio)
 *   • response time trends (median response time, getting faster/slower)
 *
 * Returns a 0-100 score + trend (up/stable/down) + alerts
 * ("You haven't talked to X in 2 weeks").
 *
 * Uses `aiComplete` for sentiment analysis of recent messages. Pure module —
 * imported by `/api/ai/friendship-health`.
 */
import { aiComplete, extractJSON } from "@/lib/ai";
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────

export interface FriendshipInput {
  contactId: string;
  contactName?: string;
  /** Recent messages (oldest first). Each entry has body + direction + at. */
  messages?: Array<{
    body: string;
    direction: "in" | "out";
    at: string;
  }>;
  /** Optional locale hint. */
  locale?: "en" | "ar";
}

export type Trend = "up" | "stable" | "down";

export interface FriendshipHealthResult {
  contactId: string;
  contactName: string;
  /** 0-100 health score (higher = healthier). */
  score: number;
  /** Trend over the last 30 days. */
  trend: Trend;
  /** Per-signal breakdown. */
  breakdown: {
    frequency: number;       // 0-100
    sentiment: number;       // 0-100
    responsiveness: number;  // 0-100
    recency: number;        // 0-100
  };
  /** Human-readable alerts (e.g. "You haven't talked in 14 days"). */
  alerts: string[];
  /** Sentiment label distribution (only when AI ran). */
  sentimentDistribution?: { positive: number; neutral: number; negative: number };
  /** Provider that produced the sentiment. */
  provider: string;
  /** Elapsed ms. */
  elapsedMs: number;
  /** True when AI failed and we used heuristic-only scoring. */
  fallback: boolean;
}

// ── Heuristic scoring (deterministic) ────────────────────────────────────

const DAY_MS = 86_400_000;

function daysSinceLastMessage(messages: FriendshipInput["messages"]): number | null {
  if (!messages || messages.length === 0) return null;
  const last = messages[messages.length - 1]!;
  try {
    const lastMs = new Date(last.at).getTime();
    return Math.max(0, Math.floor((Date.now() - lastMs) / DAY_MS));
  } catch {
    return null;
  }
}

function weeklyFrequency(messages: FriendshipInput["messages"], windowDays = 90): number {
  if (!messages || messages.length === 0) return 0;
  const cutoff = Date.now() - windowDays * DAY_MS;
  let count = 0;
  for (const m of messages) {
    try {
      if (new Date(m.at).getTime() >= cutoff) count++;
    } catch {
      // skip bad timestamps
    }
  }
  return count / (windowDays / 7);
}

function medianResponseHours(messages: FriendshipInput["messages"]): number | null {
  if (!messages || messages.length < 4) return null;
  // Walk pairs: in→out or out→in gaps.
  const gaps: number[] = [];
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1]!;
    const curr = messages[i]!;
    if (prev.direction === curr.direction) continue;
    try {
      const gapH = (new Date(curr.at).getTime() - new Date(prev.at).getTime()) / 3600_000;
      if (gapH >= 0 && gapH <= 720) gaps.push(gapH); // ignore gaps > 30 days
    } catch {
      // skip
    }
  }
  if (gaps.length < 2) return null;
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 === 0 ? (gaps[mid - 1]! + gaps[mid]!) / 2 : gaps[mid]!;
}

function computeTrend(messages: FriendshipInput["messages"]): Trend {
  if (!messages || messages.length < 6) return "stable";
  // Compare message density in the last 14 days vs the previous 14 days.
  const cutoff = Date.now() - 28 * DAY_MS;
  const mid = Date.now() - 14 * DAY_MS;
  let recent = 0;
  let prev = 0;
  for (const m of messages) {
    try {
      const t = new Date(m.at).getTime();
      if (t < cutoff) continue;
      if (t >= mid) recent++;
      else prev++;
    } catch {
      // skip
    }
  }
  if (recent === 0 && prev === 0) return "stable";
  if (recent > prev * 1.2) return "up";
  if (recent < prev * 0.8) return "down";
  return "stable";
}

/**
 * Computes a heuristic 0-100 health score + breakdown without AI.
 * Used as the fallback when AI sentiment fails, AND as the base score that
 * AI sentiment nudges up/down.
 */
export function heuristicHealth(input: FriendshipInput): Omit<FriendshipHealthResult, "provider" | "elapsedMs" | "fallback" | "sentimentDistribution"> {
  const messages = input.messages ?? [];
  const contactName = input.contactName ?? "this contact";

  // ── Frequency (0-100): 5+ msgs/week = 100, 0 msgs/week = 0 ──
  const freq = weeklyFrequency(messages, 90);
  const frequency = Math.min(100, Math.round(freq * 20));

  // ── Recency (0-100): today = 100, 30+ days = 0 ──
  const daysSince = daysSinceLastMessage(messages);
  let recency = 0;
  if (daysSince === null) {
    recency = 0;
  } else {
    recency = Math.max(0, Math.round(100 - (daysSince / 30) * 100));
  }

  // ── Responsiveness (0-100): median response time ──
  // 0h = 100 (instant), 24h = 50, 72h+ = 0
  const median = medianResponseHours(messages);
  let responsiveness = 50;
  if (median === null) {
    responsiveness = 50; // neutral when not enough data
  } else if (median <= 1) {
    responsiveness = 100;
  } else if (median <= 6) {
    responsiveness = 85;
  } else if (median <= 24) {
    responsiveness = 65;
  } else if (median <= 72) {
    responsiveness = 40;
  } else {
    responsiveness = 15;
  }

  // ── Sentiment (0-100): default neutral 60; AI refines later ──
  const sentiment = 60;

  // Weighted overall score:
  //   recency 30%, frequency 25%, responsiveness 25%, sentiment 20%
  const score = Math.round(
    recency * 0.30 + frequency * 0.25 + responsiveness * 0.25 + sentiment * 0.20,
  );

  const trend = computeTrend(messages);

  // ── Alerts ──
  const alerts: string[] = [];
  if (daysSince !== null && daysSince >= 14) {
    alerts.push(`You haven't talked to ${contactName} in ${daysSince} days.`);
  } else if (daysSince !== null && daysSince >= 7) {
    alerts.push(`It's been ${daysSince} days — consider reaching out.`);
  }
  if (trend === "down") {
    alerts.push(`Conversation frequency is dropping.`);
  }
  if (median !== null && median > 48) {
    alerts.push(`Response times have slowed (median ${Math.round(median)}h).`);
  }
  if (freq < 0.5 && messages.length > 0) {
    alerts.push(`You average less than 1 message per week.`);
  }
  if (alerts.length === 0 && score >= 70) {
    alerts.push(`Healthy connection — keep it up!`);
  }

  return {
    contactId: input.contactId,
    contactName,
    score,
    trend,
    breakdown: { frequency, sentiment, responsiveness, recency },
    alerts,
  };
}

// ── AI sentiment enrichment ──────────────────────────────────────────────

interface SentimentResult {
  positive: number;
  neutral: number;
  negative: number;
}

/**
 * Runs AI sentiment analysis on the last 20 messages. Returns the
 * distribution (counts) plus a derived 0-100 sentiment score
 * (positive=100, neutral=60, negative=10). Returns null on failure.
 */
export async function analyzeSentiment(messages: Array<{ body: string }>): Promise<SentimentResult | null> {
  if (messages.length === 0) return null;
  const sample = messages.slice(-20).map((m) => m.body).filter((b) => b && b.length > 0);
  if (sample.length === 0) return null;

  const sys = [
    "You are Cirkle Sentiment — label the sentiment of each message.",
    "Return STRICT JSON: {\"labels\":[\"positive\",\"neutral\",...]}",
    "Labels: positive | neutral | negative",
    "Rules:",
    "  • positive — warm, grateful, friendly, agreement",
    "  • negative — cold, hostile, disagreement, complaint",
    "  • neutral  — factual, informational, brief",
    "  • One label per message, in the same order as the input.",
  ].join("\n");
  const usr = JSON.stringify(sample);

  try {
    const raw = await aiComplete(sys, usr, 600, false, ["groq", "openrouter"]);
    if (!raw) return null;
    const parsed = extractJSON<{ labels?: string[] }>(raw);
    if (!Array.isArray(parsed?.labels)) return null;
    const dist: SentimentResult = { positive: 0, neutral: 0, negative: 0 };
    for (const l of parsed!.labels!) {
      const s = (l ?? "").toLowerCase();
      if (s === "positive") dist.positive++;
      else if (s === "negative") dist.negative++;
      else dist.neutral++;
    }
    return dist;
  } catch (err) {
    logger.warn("[friendship-health] sentiment AI failed", {
      error: (err as Error).message,
    });
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Computes the friendship health score for a contact. Optionally enriches
 * sentiment via AI when messages are supplied.
 */
export async function getFriendshipHealth(input: FriendshipInput): Promise<FriendshipHealthResult> {
  const startedAt = Date.now();
  const base = heuristicHealth(input);
  const messages = input.messages ?? [];

  let provider = "heuristic";
  let fallback = true;
  let sentimentDistribution: SentimentResult | undefined;
  let sentimentScore = base.breakdown.sentiment;

  if (messages.length > 0) {
    const dist = await analyzeSentiment(messages);
    if (dist) {
      provider = "ai";
      fallback = false;
      sentimentDistribution = dist;
      const total = dist.positive + dist.neutral + dist.negative;
      if (total > 0) {
        // Weighted: positive=100, neutral=60, negative=10
        sentimentScore = Math.round(
          (dist.positive * 100 + dist.neutral * 60 + dist.negative * 10) / total,
        );
      }
    }
  }

  // Recompute score with refined sentiment.
  const score = Math.round(
    base.breakdown.recency * 0.30 +
      base.breakdown.frequency * 0.25 +
      base.breakdown.responsiveness * 0.25 +
      sentimentScore * 0.20,
  );

  // Add an alert if sentiment is poor.
  const alerts = [...base.alerts];
  if (sentimentDistribution && sentimentDistribution.negative > sentimentDistribution.positive) {
    alerts.push("Recent sentiment is negative — consider checking in.");
  }

  return {
    ...base,
    score,
    breakdown: { ...base.breakdown, sentiment: sentimentScore },
    alerts,
    sentimentDistribution,
    provider,
    elapsedMs: Date.now() - startedAt,
    fallback,
  };
}

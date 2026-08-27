// @ts-nocheck
/**
 * Smart Notifications with AI Priority (Tier E, E4).
 *
 * Ranks notifications into 4 priority bands (urgent / important / normal /
 * low) using a deterministic heuristic + AI sentiment boost. Exposes:
 *
 *   • rankNotification(n)       — assign a priority band to a single notif
 *   • shouldDeliverImmediately(n) — true for urgent/important notifications
 *   • getNotificationPriority(n) — string label for UI badges
 *
 * Pure module — imported by `/api/notifications/ranked`.
 */
import { aiComplete, extractJSON } from "@/lib/ai";
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────

export type Priority = "urgent" | "important" | "normal" | "low";

export interface NotificationInput {
  id: string;
  /** Source module. */
  source: "wasl" | "midan" | "circle" | "shield" | "system" | "lamahat" | "mashahd" | "commit";
  /** Type of event (e.g. "dm", "mention", "like", "event", "alert"). */
  type: string;
  /** Notification title (already-localized). */
  title: string;
  /** Optional preview / sub-text. */
  preview?: string;
  /** ISO timestamp. */
  at: string;
  /** Number of underlying events (for grouping). */
  count?: number;
  /** True when the sender is verified. */
  verified?: boolean;
  /** True when the notification explicitly mentions @you. */
  mentionsYou?: boolean;
  /** True when the notification contains a question. */
  isQuestion?: boolean;
}

export interface RankedNotification extends NotificationInput {
  priority: Priority;
  /** 0-100 score (higher = more important). */
  score: number;
  /** Heuristic reasons for the priority (1-3 short strings). */
  reasons: string[];
  /** True when the notification should bypass quiet hours / batching. */
  immediate: boolean;
  /** AI sentiment label (positive/neutral/negative) — null when not run. */
  sentiment?: "positive" | "neutral" | "negative" | null;
}

// ── Heuristic scorer (deterministic, no AI) ──────────────────────────────

/**
 * Assigns a 0-100 score to a notification based on heuristics:
 *   • source        — shield=+30, wasl=+20, circle=+15, midan=+10, system=+5
 *   • type          — alert=+25, dm=+20, mention=+15, event=+10, like=+5
 *   • mentionsYou   — +20
 *   • isQuestion    — +15
 *   • verified      — +5
 *   • count > 1     — +Math.min(count, 5) * 2
 *   • recency       — newer = higher (linear decay over 24h)
 */
export function scoreNotification(n: NotificationInput): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Source weight
  const sourceWeight: Record<NotificationInput["source"], number> = {
    shield: 30, wasl: 20, circle: 15, midan: 10, mashahd: 8, commit: 12, lamahat: 6, system: 5,
  };
  score += sourceWeight[n.source] ?? 5;
  if (n.source === "shield") reasons.push("safety source");

  // Type weight
  const typeLower = (n.type ?? "").toLowerCase();
  if (/alert|panic|emergency/.test(typeLower)) {
    score += 25;
    reasons.push("alert type");
  } else if (/^dm$|message/.test(typeLower)) {
    score += 20;
    reasons.push("direct message");
  } else if (/mention/.test(typeLower)) {
    score += 15;
    reasons.push("mention");
  } else if (/event|invite|calendar/.test(typeLower)) {
    score += 10;
    reasons.push("event");
  } else if (/like|react|heart/.test(typeLower)) {
    score += 5;
  } else if (/follow|connect/.test(typeLower)) {
    score += 8;
  }

  // Mentions you
  if (n.mentionsYou) {
    score += 20;
    reasons.push("@-mentions you");
  }

  // Question
  if (n.isQuestion) {
    score += 15;
    reasons.push("asks a question");
  }

  // Verified sender
  if (n.verified) {
    score += 5;
    reasons.push("verified sender");
  }

  // Count
  const count = Math.max(1, n.count ?? 1);
  if (count > 1) {
    score += Math.min(count, 5) * 2;
    reasons.push(`${count} events`);
  }

  // Recency: linear decay over 24h. Newer = up to +10; older than 24h = 0.
  try {
    const ageHrs = (Date.now() - new Date(n.at).getTime()) / 3600_000;
    if (ageHrs >= 0 && ageHrs <= 24) {
      const recency = Math.round((1 - ageHrs / 24) * 10);
      score += recency;
      if (recency >= 7) reasons.push("very recent");
    }
  } catch {
    // ignore bad timestamps
  }

  // Title contains urgency cues
  const titleLower = (n.title ?? "").toLowerCase();
  if (/urgent|asap|important|now/.test(titleLower)) {
    score += 15;
    reasons.push("marked urgent");
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

/**
 * Maps a 0-100 score to a priority band.
 */
export function scoreToPriority(score: number): Priority {
  if (score >= 70) return "urgent";
  if (score >= 50) return "important";
  if (score >= 30) return "normal";
  return "low";
}

/**
 * Ranks a single notification. Optionally enriches sentiment via AI when
 * `useAi` is true.
 */
export function rankNotification(n: NotificationInput, useAi = false): RankedNotification {
  const { score, reasons } = scoreNotification(n);
  const priority = scoreToPriority(score);
  return {
    ...n,
    priority,
    score,
    reasons,
    immediate: priority === "urgent" || priority === "important",
    sentiment: useAi ? null : null, // populated by rankWithSentiment below
  };
}

/**
 * True when a notification should bypass quiet hours / batching (urgent +
 * important notifications only, plus shield alerts regardless of score).
 */
export function shouldDeliverImmediately(n: NotificationInput): boolean {
  const { score } = scoreNotification(n);
  const priority = scoreToPriority(score);
  return priority === "urgent" || priority === "important" || n.source === "shield";
}

/**
 * Human-readable priority label for UI badges.
 */
export function getNotificationPriority(n: NotificationInput): Priority {
  return scoreToPriority(scoreNotification(n).score);
}

// ── AI sentiment enrichment (optional) ──────────────────────────────────

/**
 * Optionally enriches a list of notifications with AI sentiment. The AI is
 * asked to label each notification's title+preview as positive/neutral/negative.
 * Negative sentiment bumps the score up by 5 (so a "low" can become "normal"
 * if the content is concerning).
 *
 * Falls back gracefully if AI is unavailable — sentiment stays null.
 */
export async function rankWithSentiment(
  notifications: NotificationInput[],
): Promise<RankedNotification[]> {
  if (notifications.length === 0) return [];

  const ranked = notifications.map((n) => rankNotification(n));
  if (ranked.length > 20) {
    // Don't send more than 20 to the AI — keep latency low.
    return ranked;
  }

  const sys = [
    "You are Cirkle Notification Sentiment — label the sentiment of each notification.",
    "Return STRICT JSON: {\"results\":[{\"id\":\"...\",\"sentiment\":\"positive|neutral|negative\"}]}",
    "Sentiment rules:",
    "  • positive — likes, follows, thank-yous, compliments",
    "  • negative — reports of abuse, conflict, threats, bad news",
    "  • neutral  — system updates, factual pings",
  ].join("\n");

  const usr = JSON.stringify(
    ranked.map((n) => ({
      id: n.id,
      title: n.title,
      preview: n.preview ?? "",
    })),
  );

  try {
    const raw = await aiComplete(sys, usr, 600, false, ["groq", "openrouter"]);
    if (!raw) return ranked;
    const parsed = extractJSON<{ results?: Array<{ id?: string; sentiment?: string }> }>(raw);
    if (!parsed?.results) return ranked;
    const map = new Map(parsed.results.map((r) => [r.id, (r.sentiment ?? "neutral").toLowerCase()]));
    return ranked.map((n) => {
      const s = map.get(n.id);
      if (s !== "positive" && s !== "neutral" && s !== "negative") return n;
      let score = n.score;
      let priority = n.priority;
      if (s === "negative") {
        score = Math.min(100, score + 5);
        priority = scoreToPriority(score);
      }
      return {
        ...n,
        sentiment: s,
        score,
        priority,
        immediate: priority === "urgent" || priority === "important" || n.source === "shield",
      };
    });
  } catch (err) {
    logger.warn("[smart-notifications] AI sentiment failed", {
      error: (err as Error).message,
    });
    return ranked;
  }
}

// ── Grouping helper ─────────────────────────────────────────────────────

export interface GroupedNotifications {
  urgent: RankedNotification[];
  important: RankedNotification[];
  normal: RankedNotification[];
  low: RankedNotification[];
}

export function groupByPriority(items: RankedNotification[]): GroupedNotifications {
  const out: GroupedNotifications = { urgent: [], important: [], normal: [], low: [] };
  for (const n of items) out[n.priority].push(n);
  // Sort each band by score desc, then by date desc.
  const sortFn = (a: RankedNotification, b: RankedNotification) =>
    b.score - a.score || new Date(b.at).getTime() - new Date(a.at).getTime();
  out.urgent.sort(sortFn);
  out.important.sort(sortFn);
  out.normal.sort(sortFn);
  out.low.sort(sortFn);
  return out;
}

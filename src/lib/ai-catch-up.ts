// @ts-nocheck
/**
 * AI "Catch Up" (Tier E, E3) — summarizes what you missed across ALL modules
 * (Wasl unread, Midan mentions, Circle activity) into a single "While you
 * were away…" briefing.
 *
 * Uses `aiComplete` to produce a friendly, scannable summary. The raw input
 * signals (unread counts, mention counts, recent activity) are produced by
 * `gatherCatchUpSignals()` which hits internal endpoints in parallel.
 *
 * Pure module — imported by `/api/ai/catch-up`.
 */
import { aiComplete, extractJSON } from "@/lib/ai";
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────

export interface CatchUpSignals {
  /** Wasl unread DMs/group messages (count). */
  waslUnread: number;
  /** Wasl conversation names with unread messages + last snippet (max 5). */
  waslHighlights: { name: string; snippet: string; at: string }[];
  /** Midan mentions of the user (count). */
  midanMentions: number;
  /** Midan trending hashtags (top 3). */
  midanTrending: string[];
  /** Circle activity: new events / proposals / pacts (count). */
  circleActivity: number;
  /** Lamahat new photos from friends (count). */
  lamahatNew: number;
  /** Timestamp the catch-up was generated for (ISO). */
  asOf: string;
  /** Optional locale hint. */
  locale?: "en" | "ar";
}

export interface CatchUpCard {
  module: "wasl" | "midan" | "circle" | "lamahat";
  title: string;
  body: string;
  /** Emoji used by the UI tile. */
  emoji: string;
  /** Tailwind tint class for the card. */
  tint: string;
}

export interface CatchUpResult {
  /** Friendly 1-2 sentence summary that opens the briefing. */
  headline: string;
  /** Per-module cards. */
  cards: CatchUpCard[];
  /** Suggested next action ("Open Wasl", "Reply to @sara", etc.). */
  suggestedAction: string;
  /** Provider that produced the summary. */
  provider: string;
  /** Elapsed ms. */
  elapsedMs: number;
  /** True when the AI failed and we returned a heuristic summary. */
  fallback: boolean;
  /** Echo of the input signals. */
  signals: CatchUpSignals;
}

// ── Signal gatherer ─────────────────────────────────────────────────────

/**
 * Gathers catch-up signals from internal endpoints in parallel. Failures
 * degrade gracefully (the failed signal becomes 0 / []).
 *
 * Endpoints used:
 *   • /api/conversations?unread=true  → Wasl unread
 *   • /api/social-feed?filter=mentions → Midan mentions
 *   • /api/circles/events?since=…     → Circle activity
 *   • /api/posts?module=lamahat&since=… → Lamahat new
 */
export async function gatherCatchUpSignals(opts?: {
  username?: string;
  sinceHours?: number;
  locale?: "en" | "ar";
}): Promise<CatchUpSignals> {
  const username = opts?.username ?? "anonymous";
  const sinceHours = opts?.sinceHours ?? 24;
  const locale = opts?.locale ?? "en";
  const sinceIso = new Date(Date.now() - sinceHours * 3600_000).toISOString();

  const fetchJson = async (url: string, timeoutMs = 4000): Promise<Record<string, unknown> | null> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { "x-cirkle-username": username },
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok) return null;
      return (await res.json().catch(() => null)) as Record<string, unknown> | null;
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  };

  const [waslRes, midanRes, circleRes, lamahatRes] = await Promise.all([
    fetchJson(`/api/conversations?unread=true&since=${encodeURIComponent(sinceIso)}`),
    fetchJson(`/api/social-feed?filter=mentions&since=${encodeURIComponent(sinceIso)}`),
    fetchJson(`/api/circles/events?since=${encodeURIComponent(sinceIso)}`),
    fetchJson(`/api/posts?module=lamahat&since=${encodeURIComponent(sinceIso)}`),
  ]);

  const waslUnread =
    (waslRes?.unreadCount as number) ??
    (Array.isArray(waslRes?.conversations) ? (waslRes!.conversations as unknown[]).length : 0) ??
    0;
  const waslHighlightsRaw = Array.isArray(waslRes?.conversations)
    ? (waslRes!.conversations as Array<Record<string, unknown>>).slice(0, 5)
    : [];
  const waslHighlights = waslHighlightsRaw.map((c) => ({
    name: (c.name as string) ?? "Conversation",
    snippet: (c.lastMessage as string) ?? "",
    at: (c.lastMessageAt as string) ?? new Date().toISOString(),
  }));

  const midanMentions = (midanRes?.mentionsCount as number) ?? 0;
  const midanTrending = Array.isArray(midanRes?.trending)
    ? (midanRes!.trending as string[]).slice(0, 3)
    : [];

  const circleActivity =
    (circleRes?.newCount as number) ??
    (Array.isArray(circleRes?.events) ? (circleRes!.events as unknown[]).length : 0) ??
    0;

  const lamahatNew =
    (lamahatRes?.newCount as number) ??
    (Array.isArray(lamahatRes?.posts) ? (lamahatRes!.posts as unknown[]).length : 0) ??
    0;

  return {
    waslUnread,
    waslHighlights,
    midanMentions,
    midanTrending,
    circleActivity,
    lamahatNew,
    asOf: new Date().toISOString(),
    locale,
  };
}

// ── Heuristic summary (fallback) ─────────────────────────────────────────

function heuristicSummary(s: CatchUpSignals): { headline: string; cards: CatchUpCard[]; suggestedAction: string } {
  const cards: CatchUpCard[] = [];
  if (s.waslUnread > 0) {
    const top = s.waslHighlights[0];
    cards.push({
      module: "wasl",
      title: `${s.waslUnread} unread in Wasl`,
      body: top
        ? `${top.name}: "${top.snippet.slice(0, 120)}"`
        : "Tap to open your conversations.",
      emoji: "💬",
      tint: "from-emerald-500/15 to-transparent border-emerald-500/30",
    });
  }
  if (s.midanMentions > 0) {
    cards.push({
      module: "midan",
      title: `${s.midanMentions} mention${s.midanMentions > 1 ? "s" : ""} on Midan`,
      body: s.midanTrending.length
        ? `Trending: ${s.midanTrending.join(", ")}`
        : "See who's talking about you.",
      emoji: "📢",
      tint: "from-amber-500/15 to-transparent border-amber-500/30",
    });
  }
  if (s.circleActivity > 0) {
    cards.push({
      module: "circle",
      title: `${s.circleActivity} new Circle update${s.circleActivity > 1 ? "s" : ""}`,
      body: "New events, proposals, or pacts since you were away.",
      emoji: "🌀",
      tint: "from-sky-500/15 to-transparent border-sky-500/30",
    });
  }
  if (s.lamahatNew > 0) {
    cards.push({
      module: "lamahat",
      title: `${s.lamahatNew} new photo${s.lamahatNew > 1 ? "s" : ""} from friends`,
      body: "Catch up on Lamahat moments.",
      emoji: "📸",
      tint: "from-rose-500/15 to-transparent border-rose-500/30",
    });
  }
  if (cards.length === 0) {
    cards.push({
      module: "midan",
      title: "You're all caught up ✨",
      body: "Nothing new since you were away. Take a breath.",
      emoji: "🌿",
      tint: "from-emerald-500/10 to-transparent border-emerald-500/20",
    });
  }
  const top = cards[0];
  const headline =
    cards.length === 1 && cards[0]!.title.startsWith("You're all caught up")
      ? "While you were away… nothing piled up. 🌿"
      : `While you were away, ${cards.length} thing${cards.length > 1 ? "s" : ""} happened across Cirkle.`;
  const suggestedAction = top?.module === "wasl"
    ? "Open Wasl"
    : top?.module === "midan"
      ? "Open Midan"
      : top?.module === "circle"
        ? "Open Circle"
        : "Open Lamahat";
  return { headline, cards, suggestedAction };
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Generates a personalized "While you were away…" summary across all modules.
 * Uses `aiComplete` to draft a friendly headline + per-module bodies, but
 * always falls back to the heuristic summary so the cards are non-empty.
 */
export async function generateCatchUp(opts?: {
  username?: string;
  sinceHours?: number;
  locale?: "en" | "ar";
}): Promise<CatchUpResult> {
  const startedAt = Date.now();
  const signals = await gatherCatchUpSignals(opts);
  const heuristic = heuristicSummary(signals);

  const sys = [
    "You are Cirkle Catch Up — a friendly, low-key briefing generator.",
    "Tone: warm, concise, scannable. No exclamation marks.",
    `Locale: ${signals.locale === "ar" ? "Arabic (Egyptian)" : "English"}.`,
    "Return STRICT JSON:",
    '{"headline": "...", "cards": [{"module": "wasl|midan|circle|lamahat", "title": "...", "body": "..."}], "suggestedAction": "..."}',
    "Rules:",
    "  • headline ≤ 120 chars, mentions total signal count.",
    "  • 1 card per module that has activity (skip empty modules).",
    "  • each card body ≤ 160 chars.",
    "  • suggestedAction: a 2-4 word action label.",
  ].join("\n");

  const usr = JSON.stringify({
    waslUnread: signals.waslUnread,
    waslHighlights: signals.waslHighlights,
    midanMentions: signals.midanMentions,
    midanTrending: signals.midanTrending,
    circleActivity: signals.circleActivity,
    lamahatNew: signals.lamahatNew,
  });

  let provider = "none";
  let fallback = false;
  let headline = heuristic.headline;
  let cards = heuristic.cards;
  let suggestedAction = heuristic.suggestedAction;

  try {
    const raw = await aiComplete(sys, usr, 800, false, ["groq", "openrouter", "openai"]);
    if (raw) {
      provider = "ai";
      const parsed = extractJSON<{
        headline?: string;
        cards?: Array<{ module?: string; title?: string; body?: string }>;
        suggestedAction?: string;
      }>(raw);
      if (parsed?.headline && typeof parsed.headline === "string") {
        headline = parsed.headline.slice(0, 200);
      }
      if (Array.isArray(parsed?.cards) && parsed!.cards!.length > 0) {
        const emojiFor: Record<string, string> = { wasl: "💬", midan: "📢", circle: "🌀", lamahat: "📸" };
        const tintFor: Record<string, string> = {
          wasl: "from-emerald-500/15 to-transparent border-emerald-500/30",
          midan: "from-amber-500/15 to-transparent border-amber-500/30",
          circle: "from-sky-500/15 to-transparent border-sky-500/30",
          lamahat: "from-rose-500/15 to-transparent border-rose-500/30",
        };
        cards = parsed!.cards!.slice(0, 4).map((c) => {
          const m = (c.module as string) ?? "midan";
          return {
            module: (m as CatchUpCard["module"]) ?? "midan",
            title: (c.title ?? "Update").slice(0, 100),
            body: (c.body ?? "").slice(0, 200),
            emoji: emojiFor[m] ?? "✨",
            tint: tintFor[m] ?? "from-emerald-500/15 to-transparent border-emerald-500/30",
          };
        });
        // If AI returned no cards but we have signals, fall back.
        if (cards.length === 0) {
          fallback = true;
          cards = heuristic.cards;
        }
      }
      if (parsed?.suggestedAction && typeof parsed.suggestedAction === "string") {
        suggestedAction = parsed.suggestedAction.slice(0, 60);
      }
    } else {
      fallback = true;
    }
  } catch (err) {
    fallback = true;
    logger.warn("[ai-catch-up] AI failed", { error: (err as Error).message });
  }

  return {
    headline,
    cards,
    suggestedAction,
    provider,
    elapsedMs: Date.now() - startedAt,
    fallback,
    signals,
  };
}

// @ts-nocheck
/**
 * AI Conversation Starters (Tier E, E6).
 *
 * Generates 3 tappable conversation starter chips based on the shared history
 * between the user and a contact. Uses `aiComplete` (Groq preferred for speed).
 *
 * Pure module — imported by `/api/ai/conversation-starters`.
 */
import { aiComplete, extractJSON } from "@/lib/ai";
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────

export interface StarterInput {
  /** The conversationId (used to fetch recent history). */
  conversationId: string;
  /** Optional contact display name. */
  contactName?: string;
  /** Recent message bodies (max 12) for context. */
  recentMessages?: string[];
  /** Shared interests / topics (max 5). */
  sharedInterests?: string[];
  /** Optional locale hint. */
  locale?: "en" | "ar";
}

export interface StarterResult {
  conversationId: string;
  starters: string[];
  /** Provider that produced the starters. */
  provider: string;
  /** Elapsed ms. */
  elapsedMs: number;
  /** True when the AI failed and we returned curated fallbacks. */
  fallback: boolean;
}

// ── Curated fallbacks ────────────────────────────────────────────────────

const FALLBACK_EN = [
  "How's your week been so far?",
  "Saw something that made me think of you — what's new?",
  "Coffee sometime this week?",
];

const FALLBACK_AR = [
  "إزاي أسبوعك لحد دلوقتي؟",
  "شفت حاجة فكرتني بيكي — أخبارك إيه؟",
  "نشرب قهوة النهارده؟",
];

/**
 * Heuristic starters — picks 3 fallback starters that are appropriate for the
 * locale. Used when the AI fails or returns no usable result.
 */
function heuristicStarters(locale: "en" | "ar"): string[] {
  return locale === "ar" ? FALLBACK_AR : FALLBACK_EN;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Generates 3 conversation starter chips based on the shared history.
 *
 * The AI is asked to return STRICT JSON: `{ "starters": ["...", "...", "..."] }`
 * so we can parse reliably. Each starter must be ≤ 80 chars and feel natural.
 */
export async function getStarters(input: StarterInput): Promise<StarterResult> {
  const startedAt = Date.now();
  const locale = input.locale ?? "en";
  const conversationId = input.conversationId;
  const contactName = input.contactName?.trim() || "your contact";
  const recent = (input.recentMessages ?? []).slice(-12);
  const interests = (input.sharedInterests ?? []).slice(0, 5);

  const sys = [
    "You are Cirkle Conversation Starters — suggest 3 natural opening lines to revive a chat.",
    `Locale: ${locale === "ar" ? "Arabic (Egyptian)" : "English"}.`,
    "Constraints:",
    "  • Exactly 3 starters, each ≤ 80 chars.",
    "  • Reference shared history / interests when relevant, but never invent facts.",
    "  • One should be warm/check-in, one should reference a shared interest,",
    "    one should propose a plan (coffee / call / etc.).",
    "  • No emoji spam (one max per starter). No quotation marks. No numbering.",
    "  • Return STRICT JSON: {\"starters\": [\"...\", \"...\", \"...\"]}",
  ].join("\n");

  const usr = JSON.stringify({
    contactName,
    sharedInterests: interests,
    recentMessages: recent,
  });

  let provider = "none";
  let fallback = false;
  let starters: string[] = [];

  try {
    const raw = await aiComplete(sys, usr, 500, false, ["groq", "openrouter", "openai"]);
    if (raw) {
      provider = "ai";
      const parsed = extractJSON<{ starters?: string[] }>(raw);
      if (parsed?.starters && Array.isArray(parsed.starters)) {
        starters = parsed.starters
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .slice(0, 3)
          .map((s) => s.trim().replace(/^["'\d.\-)\s]+/, "").replace(/["']$/, ""))
          .map((s) => (s.length > 100 ? `${s.slice(0, 97)}…` : s));
      } else {
        // Try line-based fallback parse.
        const lines = raw
          .split(/\n+/)
          .map((l) => l.replace(/^[-•*\d.)\s]+/, "").replace(/^["']|["']$/g, "").trim())
          .filter((l) => l.length > 0 && l.length <= 100)
          .slice(0, 3);
        if (lines.length >= 3) starters = lines;
      }
    }
  } catch (err) {
    logger.warn("[conversation-starters] AI failed", { error: (err as Error).message });
  }

  if (starters.length < 3) {
    fallback = true;
    starters = heuristicStarters(locale);
  }

  return {
    conversationId,
    starters: starters.slice(0, 3),
    provider,
    elapsedMs: Date.now() - startedAt,
    fallback,
  };
}

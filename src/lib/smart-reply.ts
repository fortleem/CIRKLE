// @ts-nocheck
/**
 * Smart Reply (Tier A, A1) — generates 3 short quick-reply chips based on the
 * last received message in a Wasl conversation.
 *
 * Uses `aiComplete` from `@/lib/ai` with the Groq provider (fastest). Falls
 * back to a small library of curated replies on any error or empty result so
 * the chips always render something useful.
 *
 * Pure module — safe to import from server routes + client overlays (the
 * `aiComplete` call itself is server-only; this file is intended to be invoked
 * from an API route, not directly from the client).
 */
import { aiComplete, extractJSON } from "@/lib/ai";
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────

export interface SmartReplyInput {
  /** The last received message text. */
  message: string;
  /** Optional sender display name (for tone context). */
  senderName?: string;
  /** Optional conversationId — used purely for logging / correlation. */
  conversationId?: string;
  /** Optional locale hint ("en" | "ar" — default "en"). */
  locale?: "en" | "ar";
}

export interface SmartReplyResult {
  /** 3 short reply strings (≤ 60 chars each). */
  replies: string[];
  /** Provider that produced the result. */
  provider: string;
  /** Elapsed time in ms. */
  elapsedMs: number;
  /** True when the AI failed and we returned curated fallbacks. */
  fallback: boolean;
}

// ── Curated fallbacks ────────────────────────────────────────────────────

const FALLBACK_EN: string[] = [
  "Sounds good! 👍",
  "On my way!",
  "Got it, thanks.",
];

const FALLBACK_AR: string[] = [
  "تمام! 👍",
  "أنا في الطريق!",
  "تم، شكراً.",
];

/**
 * Heuristic fallback that picks 3 replies based on simple keyword detection.
 * Used when the AI providers all fail. Stays deterministic + fast.
 */
function heuristicReplies(message: string, locale: "en" | "ar"): string[] {
  const m = (message || "").toLowerCase();
  if (locale === "ar") {
    if (/شكر|متشكر|thank/.test(m)) return ["العفو 🌷", "لا شكر على واجب", "أي وقت!"];
    if (/متى|وقت|الساعة/.test(m)) return ["الساعة ٧ مساءً", "أي وقت يناسبك", "غداً؟"];
    if (/في الطريق| Coming| coming/.test(m)) return ["تمام بانتظارك", "هستنى 👀", "خلصنا تقريباً"];
    return FALLBACK_AR;
  }
  if (/thank/.test(m)) return ["You're welcome 🌷", "Anytime!", "My pleasure"];
  if (/when|what time/.test(m)) return ["7 PM works for me", "Whenever you're free", "Tomorrow?"];
  if (/on my way|omw|coming/.test(m)) return ["Great, see you soon", "Waiting 👀", "Almost there?"];
  return FALLBACK_EN;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Generate 3 short quick-reply chips for the last received message.
 *
 * The AI is asked to return strict JSON: `{ "replies": ["...", "...", "..."] }`
 * so we can parse reliably. If parsing fails OR the AI returns nothing, we
 * fall through to the heuristic replies.
 */
export async function getSmartReplies(input: SmartReplyInput): Promise<SmartReplyResult> {
  const startedAt = Date.now();
  const locale = input.locale ?? "en";
  const message = (input.message ?? "").trim();
  const sender = input.senderName?.trim() || "the sender";

  // Truncate very long messages to keep the prompt small + fast.
  const trimmed = message.length > 500 ? `${message.slice(0, 497)}…` : message;

  const sys = [
    "You are Cirkle Smart Reply — a quick-reply generator for the Wasl chat module.",
    `Locale: ${locale === "ar" ? "Arabic (Egyptian dialect preferred)" : "English"}.`,
    "Reply constraints:",
    "  • Exactly 3 short replies, each ≤ 60 characters.",
    "  • One reply should acknowledge/affirm, one should move the conversation forward,",
    "    and one should be playful/warm.",
    "  • No quotation marks, no numbering, no emoji spam (one emoji max per reply).",
    "  • Do NOT include the sender's name unless it's a greeting.",
    "  • Return STRICT JSON: {\"replies\": [\"...\", \"...\", \"...\"]}",
  ].join("\n");

  const usr = `Last message from ${sender}:\n"""${trimmed}"""`;

  let provider = "none";
  let fallback = false;
  let replies: string[] = [];

  try {
    const raw = await aiComplete(sys, usr, 400, false, ["groq", "openrouter"]);
    if (raw) {
      provider = "groq";
      const parsed = extractJSON<{ replies?: string[] }>(raw);
      if (parsed?.replies && Array.isArray(parsed.replies) && parsed.replies.length >= 3) {
        replies = parsed.replies
          .filter((r) => typeof r === "string" && r.trim().length > 0)
          .slice(0, 3)
          .map((r) => r.trim().replace(/^["'\d.\-)\s]+/, "").replace(/["']$/, ""))
          .map((r) => (r.length > 80 ? `${r.slice(0, 77)}…` : r));
      } else {
        // Couldn't parse JSON — try a line-based fallback parse.
        const lines = raw
          .split(/\n+/)
          .map((l) => l.replace(/^[-•*\d.)\s]+/, "").replace(/^["']|["']$/g, "").trim())
          .filter((l) => l.length > 0 && l.length <= 80)
          .slice(0, 3);
        if (lines.length >= 3) replies = lines;
      }
    }
  } catch (err) {
    logger.warn("[smart-reply] AI failed", { error: (err as Error).message });
  }

  if (replies.length < 3) {
    fallback = true;
    replies = heuristicReplies(message, locale);
  }

  return {
    replies: replies.slice(0, 3),
    provider,
    elapsedMs: Date.now() - startedAt,
    fallback,
  };
}

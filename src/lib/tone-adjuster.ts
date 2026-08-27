// @ts-nocheck
/**
 * AI Tone Adjustment (Tier E, E5).
 *
 * Rewrites a piece of text in one of 5 tones: formal / friendly / apologetic /
 * assertive / diplomatic. Preserves the original meaning, names, dates, and
 * amounts. Uses `aiComplete` (Groq preferred for speed).
 *
 * Pure module — imported by `/api/ai/tone-adjust`.
 */
import { aiComplete } from "@/lib/ai";
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────

export type Tone = "formal" | "friendly" | "apologetic" | "assertive" | "diplomatic";

export interface ToneAdjustInput {
  text: string;
  tone: Tone;
  /** Optional recipient display name (for tone calibration). */
  recipientName?: string;
  /** Optional locale hint. */
  locale?: "en" | "ar";
}

export interface ToneAdjustResult {
  original: string;
  tone: Tone;
  rewritten: string;
  /** Provider that produced the rewrite. */
  provider: string;
  /** Elapsed ms. */
  elapsedMs: number;
  /** True when the AI failed and we returned the original text unchanged. */
  fallback: boolean;
}

// ── Tone metadata ────────────────────────────────────────────────────────

export interface ToneMeta {
  id: Tone;
  label: string;
  emoji: string;
  description: string;
  /** Tailwind tint class for the chip. */
  tint: string;
}

export const TONES: ToneMeta[] = [
  { id: "formal", label: "Formal", emoji: "🎩", description: "Polished, professional, slightly reserved", tint: "bg-slate-500/15 border-slate-500/30 text-slate-100" },
  { id: "friendly", label: "Friendly", emoji: "👋", description: "Warm, casual, human", tint: "bg-emerald-500/15 border-emerald-500/30 text-emerald-100" },
  { id: "apologetic", label: "Apologetic", emoji: "🙏", description: "Sincere, accountable, soft", tint: "bg-rose-500/15 border-rose-500/30 text-rose-100" },
  { id: "assertive", label: "Assertive", emoji: "⚡", description: "Direct, clear, confident", tint: "bg-amber-500/15 border-amber-500/30 text-amber-100" },
  { id: "diplomatic", label: "Diplomatic", emoji: "🤝", description: "Tactful, balanced, neutral", tint: "bg-sky-500/15 border-sky-500/30 text-sky-100" },
];

const TONE_PROMPTS: Record<Tone, string> = {
  formal: "Rewrite in a formal, professional tone suitable for a workplace message. Use complete sentences, avoid contractions, and address the recipient respectfully.",
  friendly: "Rewrite in a warm, friendly tone — like texting a close colleague. Keep it casual but respectful.",
  apologetic: "Rewrite in a sincere, apologetic tone. Acknowledge any inconvenience without being over-the-top. Use 'I' statements.",
  assertive: "Rewrite in a direct, assertive tone. State expectations clearly. Be confident, not aggressive.",
  diplomatic: "Rewrite in a diplomatic tone that respects all parties. Acknowledge different perspectives. Avoid absolutes.",
};

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Rewrites `text` in the requested tone. Always returns a string — on AI
 * failure, the original text is returned with `fallback: true`.
 *
 * Constraints applied to every rewrite:
 *   • Preserve names, dates, amounts, links, and code verbatim.
 *   • Preserve the original meaning.
 *   • Match the locale (Arabic rewrites stay in Arabic; English stays English).
 *   • Cap output at 3× the input length (max 2,000 chars).
 */
export async function adjustTone(input: ToneAdjustInput): Promise<ToneAdjustResult> {
  const startedAt = Date.now();
  const text = (input.text ?? "").trim();
  const tone = input.tone;
  const locale = input.locale ?? "en";

  if (!text) {
    return {
      original: "",
      tone,
      rewritten: "",
      provider: "none",
      elapsedMs: 0,
      fallback: true,
    };
  }

  const capped = text.length > 2_000 ? `${text.slice(0, 1_997)}…` : text;

  const sys = [
    "You are Cirkle Tone Adjuster — a multilingual tone rewriter.",
    `Tone: ${tone}. ${TONE_PROMPTS[tone]}`,
    `Locale: ${locale === "ar" ? "Arabic" : "English"} — keep the rewrite in the same language as the input.`,
    "Hard constraints:",
    "  • Preserve names, dates, amounts, links, and code verbatim.",
    "  • Preserve the original meaning (do not invent facts).",
    "  • Return ONLY the rewritten text — no explanations, no quotes.",
    "  • Max length: 3× the input length (cap 2,000 chars).",
  ].join("\n");

  const usr = input.recipientName
    ? `Recipient: ${input.recipientName}\nOriginal:\n"""${capped}"""`
    : `Original:\n"""${capped}"""`;

  let provider = "none";
  let fallback = false;
  let rewritten = text;

  try {
    const raw = await aiComplete(sys, usr, 800, false, ["groq", "openrouter", "openai"]);
    if (raw) {
      provider = "ai";
      // Strip leading/trailing quotes + numbering the model sometimes adds.
      let cleaned = raw.trim()
        .replace(/^["'`]+|["'`]+$/g, "")
        .replace(/^(Sure[,!]?|Here'?s?|Rewritten?:?)\s*/i, "")
        .trim();
      // Cap at 2,000 chars.
      if (cleaned.length > 2_000) cleaned = `${cleaned.slice(0, 1_997)}…`;
      if (cleaned.length > 0) rewritten = cleaned;
    } else {
      fallback = true;
    }
  } catch (err) {
    fallback = true;
    logger.warn("[tone-adjuster] AI failed", { error: (err as Error).message, tone });
  }

  return {
    original: text,
    tone,
    rewritten,
    provider,
    elapsedMs: Date.now() - startedAt,
    fallback,
  };
}

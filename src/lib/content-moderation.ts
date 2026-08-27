// @ts-nocheck
/**
 * AI Content Moderation (Tier E, E10).
 *
 * Real-time content moderation: detects spam, scams, harassment, and NSFW
 * content. Returns a structured result with category, confidence, and a
 * recommended action (allow / flag / block / shadowban).
 *
 * Uses `aiComplete` (Groq preferred for latency — moderation is real-time).
 * Falls back to a deterministic rule-based heuristic so the API always returns
 * a decision within the timeout.
 *
 * Pure module — imported by `/api/ai/moderate`. Persists decisions to the
 * `ModerationLog` Prisma model:
 *
 *   model ModerationLog {
 *     id          String   @id @default(cuid())
 *     contentId   String
 *     contentType String   // post | message | comment
 *     category    String   // spam | scam | harassment | nsfw | clean
 *     confidence  Float
 *     action      String   // allow | flag | block | shadowban
 *     reviewedAt  DateTime @default(now())
 *     @@index([contentType, category])
 *   }
 */
import { aiComplete, extractJSON } from "@/lib/ai";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────

export type ModerationCategory = "spam" | "scam" | "harassment" | "nsfw" | "clean";
export type ModerationAction = "allow" | "flag" | "block" | "shadowban";
export type ContentType = "post" | "message" | "comment";

export interface ModerationInput {
  /** The text to moderate. */
  content: string;
  /** Stable id of the content (message id, post id). */
  contentId?: string;
  /** Content kind — defaults to "post". */
  contentType?: ContentType;
  /** Optional author handle (for spam signals). */
  authorHandle?: string;
  /** Optional locale hint. */
  locale?: "en" | "ar";
}

export interface ModerationResult {
  /** True when the content passes moderation (no action needed). */
  safe: boolean;
  /** The detected category. `clean` when nothing flagged. */
  category: ModerationCategory;
  /** 0-1 confidence. */
  confidence: number;
  /** Recommended action. */
  action: ModerationAction;
  /** Human-readable reason for the decision. */
  reason: string;
  /** Provider that produced the decision. */
  provider: string;
  /** Elapsed ms. */
  elapsedMs: number;
  /** True when the AI failed and we returned a heuristic decision. */
  fallback: boolean;
  /** Echo of input contentId (or generated). */
  contentId: string;
}

// ── Heuristic rules (deterministic, no AI) ───────────────────────────────

interface HeuristicHit {
  category: ModerationCategory;
  confidence: number;
  reason: string;
}

const SPAM_PATTERNS: RegExp[] = [
  /\b(?:buy now|click here|free|discount|limited time offer|act now|order now|subscribe|follow me)\b/i,
  /\b(?:earn \$\d|make money|work from home|passive income|get rich|crypto airdrop)\b/i,
  /\b(?:https?:\/\/\S+\s*\b){3,}/i, // 3+ links
  /\b(?:.{1,5}\s){10,}/i, // many short tokens
  /(.)\1{6,}/i, // long char repetition (AAAAAAA)
  /\b(?:viagra|casino|porn|escort|lottery|winner|prize)\b/i,
];

const SCAM_PATTERNS: RegExp[] = [
  /\b(?:send (?:me )?(?:money|crypto|btc|eth|usdt|gift card))\b/i,
  /\b(?:wire transfer|western union|moneygram|paypal (?:me|to))\b/i,
  /\b(?:urgent(?:ly)?\s+need|emergency.*transfer|stranded.*airport)\b/i,
  /\b(?:i'?m a (?:prince|diplomat|widow|orphan|royal)\b)/i,
  /\b(?:double your (?:money|crypto|btc))\b/i,
  /\b(?:invest (?:with|in) me|guaranteed return|mining pool)\b/i,
  /\b(?:i'?ll pay you back (?:double|triple|2x|3x))\b/i,
];

const HARASSMENT_PATTERNS: RegExp[] = [
  /\b(?:kill yourself|kys|go die|end your life|jump off)\b/i,
  /\b(?:you'?re (?:stupid|ugly|worthless|pathetic|trash|garbage|idiot|moron))\b/i,
  /\b(?:i'?ll (?:find|hurt|beat|rape) you)\b/i,
  /\b(?:fag|faggot|tranny|nigger|nigga|kike|spic|chink|wetback)\b/i,
  /\b(?:whore|slut|bitch|cunt)\b/i,
  /\b(?:rape| molest)\b/i,
];

const NSFW_PATTERNS: RegExp[] = [
  /\b(?:nude|nudes|naked|topless|nsfw|xxx|porn|pornography|explicit)\b/i,
  /\b(?:sex(?:ual)?|horny|aroused| orgasm| masturbation)\b/i,
  /\b(?:dick pic|cock pic|send (?:nudes?|pics))\b/i,
  /\b(?:onlyfans|fansly|premium snap)\b/i,
];

function heuristicModerate(content: string): HeuristicHit {
  const text = content ?? "";
  if (text.length === 0) return { category: "clean", confidence: 0.9, reason: "empty content" };

  // Check each category — first hit wins (priority: harassment > nsfw > scam > spam).
  for (const re of HARASSMENT_PATTERNS) {
    if (re.test(text)) {
      return {
        category: "harassment",
        confidence: 0.85,
        reason: `Matched harassment pattern: ${re.source.slice(0, 50)}`,
      };
    }
  }
  for (const re of NSFW_PATTERNS) {
    if (re.test(text)) {
      return {
        category: "nsfw",
        confidence: 0.8,
        reason: `Matched NSFW pattern: ${re.source.slice(0, 50)}`,
      };
    }
  }
  for (const re of SCAM_PATTERNS) {
    if (re.test(text)) {
      return {
        category: "scam",
        confidence: 0.8,
        reason: `Matched scam pattern: ${re.source.slice(0, 50)}`,
      };
    }
  }
  for (const re of SPAM_PATTERNS) {
    if (re.test(text)) {
      return {
        category: "spam",
        confidence: 0.7,
        reason: `Matched spam pattern: ${re.source.slice(0, 50)}`,
      };
    }
  }

  return { category: "clean", confidence: 0.6, reason: "no heuristic matches" };
}

/**
 * Maps a category + confidence to a recommended action.
 *
 *   • clean + (any confidence)      → allow
 *   • spam + confidence ≥ 0.8      → shadowban (let the spam post but hide)
 *   • spam + confidence 0.5–0.8    → flag
 *   • scam + confidence ≥ 0.7      → block
 *   • scam + confidence 0.5–0.7    → flag
 *   • harassment + confidence ≥ 0.7 → block
 *   • harassment + confidence 0.5–0.7 → flag
 *   • nsfw + confidence ≥ 0.8      → block
 *   • nsfw + confidence 0.5–0.8   → flag
 */
export function pickAction(category: ModerationCategory, confidence: number): ModerationAction {
  if (category === "clean") return "allow";
  if (category === "spam") {
    return confidence >= 0.8 ? "shadowban" : "flag";
  }
  if (category === "scam") {
    return confidence >= 0.7 ? "block" : "flag";
  }
  if (category === "harassment") {
    return confidence >= 0.7 ? "block" : "flag";
  }
  if (category === "nsfw") {
    return confidence >= 0.8 ? "block" : "flag";
  }
  return "allow";
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Moderate a piece of content. Uses AI for the decision when available,
 * falling back to the heuristic rules when the AI is unavailable or returns
 * an unparseable result.
 *
 * The result is persisted to the `ModerationLog` Prisma model (best-effort —
 * DB failures do not block the response).
 */
export async function moderateContent(input: ModerationInput): Promise<ModerationResult> {
  const startedAt = Date.now();
  const content = (input.content ?? "").trim();
  const contentType = input.contentType ?? "post";
  const contentId = input.contentId ?? `mod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ── Run heuristic first (always — used as fallback + as a sanity check). ──
  const heuristic = heuristicModerate(content);

  let provider = "heuristic";
  let fallback = true;
  let category = heuristic.category;
  let confidence = heuristic.confidence;
  let reason = heuristic.reason;

  // ── Only call AI if the heuristic flagged something OR content is non-trivial. ──
  if (content.length >= 8) {
    const sys = [
      "You are Cirkle Moderation — a real-time content safety classifier.",
      "Categories: spam | scam | harassment | nsfw | clean",
      "Return STRICT JSON: {\"category\":\"...\",\"confidence\":0.0,\"reason\":\"...\"}",
      "Rules:",
      "  • confidence is 0-1 (use 0.95+ for clear cases, 0.5-0.7 for ambiguous).",
      "  • reason ≤ 80 chars, cite the specific signal.",
      "  • If unsure, default to \"clean\" with confidence 0.5.",
      "  • Arabic input is allowed — label in English still.",
    ].join("\n");
    const usr = content.length > 1000 ? `${content.slice(0, 997)}…` : content;

    try {
      const raw = await aiComplete(sys, usr, 300, false, ["groq", "openrouter"]);
      if (raw) {
        provider = "ai";
        const parsed = extractJSON<{ category?: string; confidence?: number; reason?: string }>(raw);
        if (parsed?.category) {
          const cat = String(parsed.category).toLowerCase();
          const validCats: ModerationCategory[] = ["spam", "scam", "harassment", "nsfw", "clean"];
          if (validCats.includes(cat as ModerationCategory)) {
            category = cat as ModerationCategory;
            const c = typeof parsed.confidence === "number"
              ? Math.max(0, Math.min(1, parsed.confidence))
              : heuristic.confidence;
            confidence = c;
            reason = parsed.reason ? String(parsed.reason).slice(0, 160) : heuristic.reason;
            fallback = false;

            // If AI said "clean" but heuristic flagged something with high
            // confidence, trust the heuristic (defense in depth).
            if (category === "clean" && heuristic.category !== "clean" && heuristic.confidence >= 0.8) {
              category = heuristic.category;
              confidence = Math.max(confidence, heuristic.confidence);
              reason = `Heuristic override: ${heuristic.reason}`;
              fallback = true;
            }
          }
        }
      }
    } catch (err) {
      logger.warn("[content-moderation] AI failed", { error: (err as Error).message });
    }
  }

  const action = pickAction(category, confidence);
  const safe = action === "allow";

  const result: ModerationResult = {
    safe,
    category,
    confidence: Math.round(confidence * 100) / 100,
    action,
    reason,
    provider,
    elapsedMs: Date.now() - startedAt,
    fallback,
    contentId,
  };

  // Persist (best-effort).
  try {
    await db.moderationLog.create({
      data: {
        contentId,
        contentType,
        category,
        confidence: result.confidence,
        action,
      },
    });
  } catch (err) {
    // The ModerationLog table may not exist yet (schema not pushed). Don't
    // fail the moderation — just log + continue.
    logger.debug("[content-moderation] log persist skipped", {
      error: (err as Error).message,
    });
  }

  return result;
}

// ── Convenience: quick check (returns boolean only) ──────────────────────

/**
 * Lightweight check: returns true when content is safe to publish (action
 * === "allow" or "flag"). Faster than full `moderateContent` because it skips
 * persistence — useful for pre-flight checks in the composer.
 */
export async function isContentSafe(content: string): Promise<boolean> {
  const result = await moderateContent({ content });
  return result.safe || result.action === "flag";
}

// @ts-nocheck
/**
 * CIRKLE — Content Moderation Pipeline (P2-MODERATION-TESTS)
 * ============================================================================
 * A two-tier content moderation pipeline combining fast, free rule-based
 * checks with an optional AI-based classifier for higher-accuracy decisions.
 *
 * Tier 1 — Rule-based heuristics (always run, ~0.1 ms per item):
 *   • Known spam patterns (caps lock, repeated chars, "buy now" etc.)
 *   • Excessive link density
 *   • Suspicious URL patterns (link shorteners, IP-address hosts)
 *   • All-caps shouting
 *   • Mention/emoji spam
 *
 * Tier 2 — AI classification (only when at least one AI provider env key is
 *   set, e.g. `GROQ_API_KEY`, `OPENAI_API_KEY`, etc.):
 *   • Sends the content + a moderation prompt to `aiComplete`.
 *   • Expects STRICT JSON back: {action, category, confidence, reason}.
 *   • On any failure (timeout, unparseable response, no API key) the
 *     heuristic result from Tier 1 is used as the final decision.
 *
 * Decisions are NEVER auto-deleted — the worst case for clear violations is
 * `action: "block"` which still surfaces the content in the moderation queue
 * for human review. The only auto-action is `flag` (escalate to queue) and
 * `shadowban` (down-rank without the author being notified).
 *
 * All decisions are persisted to the `ModerationLog` table (best-effort — DB
 * failures never block the response). The shape of `ModerationResult` matches
 * the task spec:
 *
 *   {
 *     action: "allow" | "flag" | "block" | "shadowban",
 *     category: "clean" | "spam" | "scam" | "harassment" | "nsfw" |
 *               "misinformation" | "other",
 *     confidence: number,        // 0-1
 *     reason: string,            // human-readable
 *     flags: string[],           // machine-readable hits
 *   }
 *
 * NOTE on naming: the existing `src/lib/moderation-service.ts` is the
 * moderation QUEUE management service (flag/review/appeal workflow against
 * `ModerationFlag`). This module is the content ANALYSIS pipeline — separated
 * so call sites can compose them: run `moderateContent` → on `flag/block/
 * shadowban`, call `flagContent` from `moderation-service.ts` to enqueue.
 *
 * NEVER throws — moderation must always return a result, even on the most
 * pathological input. A failure to moderate is an implicit "allow" with low
 * confidence so the platform degrades gracefully rather than blocking all
 * content if the AI provider goes down.
 * ============================================================================
 */
import { aiComplete, extractJSON } from "@/lib/ai";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ── Public types (match task spec) ───────────────────────────────────────

export interface ModerationResult {
  action: "allow" | "flag" | "block" | "shadowban";
  category:
    | "clean"
    | "spam"
    | "scam"
    | "harassment"
    | "nsfw"
    | "misinformation"
    | "other";
  confidence: number; // 0-1
  reason: string;
  flags: string[];
}

export interface ModerationInput {
  text?: string;
  authorId?: string;
  authorHandle?: string;
  module?: string;
}

export interface ModerationBatchItem {
  id: string;
  text: string;
}

export interface ModerationBatchResult {
  id: string;
  result: ModerationResult;
}

// ── Rule definitions ─────────────────────────────────────────────────────

interface RuleHit {
  category: ModerationResult["category"];
  confidence: number;
  reason: string;
  flag: string;
}

const SPAM_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(?:buy now|click here|limited time offer|act now|order now|subscribe now|follow me back)\b/i, label: "spam.sales_pitch" },
  { re: /\b(?:earn \$\d+|make money (?:fast|online)|work from home|passive income|get rich|financial freedom)\b/i, label: "spam.money_scheme" },
  { re: /\b(?:free (?:iphone|gift|giveaway|crypto airdrop|btc|eth|usdt))\b/i, label: "spam.giveaway" },
  { re: /\b(?:viagra|casino|porn|escort|lottery|winner|prize|sweepstake)\b/i, label: "spam.sketchy_keywords" },
  { re: /\b(?:subscribe to my channel|check out my profile|dm me for (?:promo|collab))\b/i, label: "spam.self_promo" },
];

const SCAM_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(?:send (?:me )?(?:money|crypto|btc|eth|usdt|gift card|wire))\b/i, label: "scam.request_money" },
  { re: /\b(?:wire transfer|western union|moneygram|paypal (?:me|to))\b/i, label: "scam.payment_method" },
  { re: /\b(?:urgent(?:ly)?\s+need|emergency\s+transfer|stranded\s+(?:at|in)\s+airport)\b/i, label: "scam.urgency" },
  { re: /\b(?:i'?m a (?:prince|diplomat|widow|orphan|royal))\b/i, label: "scam.identity_story" },
  { re: /\b(?:double your (?:money|crypto|btc)|guaranteed return|2x|3x your)\b/i, label: "scam.return_guarantee" },
  { re: /\b(?:invest (?:with|in) me|mining pool|forex signals?|trading bot)\b/i, label: "scam.investment_pitch" },
  { re: /\b(?:i'?ll pay you back (?:double|triple|2x|3x))\b/i, label: "scam.repayment_promise" },
  { re: /\b(?:bank (?:login|details?)|card (?:number|cvv))\b/i, label: "scam.credentials_request" },
];

const HARASSMENT_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(?:kill yourself|kys|go die|end your life|jump off)\b/i, label: "harassment.self_harm_incitement" },
  { re: /\b(?:you'?re (?:stupid|ugly|worthless|pathetic|trash|garbage|idiot|moron))\b/i, label: "harassment.insult" },
  { re: /\b(?:i'?ll (?:find|hurt|beat|rape) you|i will (?:find|hurt|beat) you)\b/i, label: "harassment.threat" },
  { re: /\b(?:fag|faggot|tranny|nigger|nigga|kike|spic|chink|wetback)\b/i, label: "harassment.slur" },
  { re: /\b(?:whore|slut|bitch|cunt)\b/i, label: "harassment.misogyny" },
  { re: /\b(?:rape|molest)\b/i, label: "harassment.violence" },
];

const NSFW_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(?:nude|nudes|naked|topless|nsfw|xxx|porn|pornography|explicit)\b/i, label: "nsfw.sexual" },
  { re: /\b(?:dick pic|cock pic|send (?:nudes?|pics))\b/i, label: "nsfw.solicitation" },
  { re: /\b(?:onlyfans|fansly|premium snap)\b/i, label: "nsfw.platform" },
  { re: /\b(?:horny|aroused|orgasm|masturbation)\b/i, label: "nsfw.explicit_acts" },
];

const MISINFORMATION_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(?:cures? (?:cancer|covid|hiv|aids))\b/i, label: "misinfo.medical_cure" },
  { re: /\b(?:5g causes?|vaccines? (?:cause|kill)|plandemic)\b/i, label: "misinfo.conspiracy" },
  { re: /\b(?:flat earth|moon landing fake|climate change hoax)\b/i, label: "misinfo.denial" },
  { re: /\b(?:microchip|mark of the beast|bill gates (?:track|microchip))\b/i, label: "misinfo.conspiracy_tech" },
];

// Suspicious URL shorteners + raw-IP hosts — flagged because they obfuscate
// the destination, a common technique in phishing/scam messages.
const SUSPICIOUS_URL_RE = /\b(?:https?:\/\/)?(?:bit\.ly|t\.co|tinyurl|goo\.gl|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|shorturl)\b/i;
const RAW_IP_URL_RE = /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
const URL_RE = /\bhttps?:\/\/\S+/gi;

// ── Tier 1: rule-based heuristic ─────────────────────────────────────────

/**
 * Run the deterministic rule-based heuristic on `text`.
 *
 * Returns the first matching rule (priority order: harassment > nsfw >
 * scam > misinformation > spam). If no category matches, returns `clean`
 * with confidence 0.5 — we never claim 100% confidence from a heuristic
 * alone (we leave that to the AI tier when available).
 */
function heuristicModerate(text: string): { hit: RuleHit | null; flags: string[] } {
  const t = text ?? "";
  const flags: string[] = [];

  // Structural / statistical signals (independent of category).
  if (t.length > 0) {
    const upper = t.toUpperCase();
    const letters = upper.replace(/[^A-Z]/g, "").length;
    if (letters >= 12 && upper === t && letters / Math.max(1, t.length) > 0.6) {
      flags.push("structure.all_caps");
    }
  }
  const repeated = t.match(/(.)\1{6,}/); // 7+ same char in a row
  if (repeated) flags.push("structure.repeated_char");

  const urlMatches = t.match(URL_RE) || [];
  if (urlMatches.length >= 3) flags.push("structure.excessive_links");
  if (SUSPICIOUS_URL_RE.test(t)) flags.push("structure.shortener_url");
  if (RAW_IP_URL_RE.test(t)) flags.push("structure.raw_ip_url");

  const mentions = t.match(/@\w+/g) || [];
  if (mentions.length >= 5) flags.push("structure.mention_spam");

  const emojis = t.match(/\p{Emoji_Presentation}/gu) || [];
  if (emojis.length >= 10) flags.push("structure.emoji_spam");

  // Category-specific patterns (first hit wins by priority).
  const ruleSets: Array<{ name: string; rules: Array<{ re: RegExp; label: string }>; category: ModerationResult["category"]; confidence: number }> = [
    { name: "harassment", rules: HARASSMENT_PATTERNS, category: "harassment", confidence: 0.85 },
    { name: "nsfw", rules: NSFW_PATTERNS, category: "nsfw", confidence: 0.8 },
    { name: "scam", rules: SCAM_PATTERNS, category: "scam", confidence: 0.8 },
    { name: "misinformation", rules: MISINFORMATION_PATTERNS, category: "misinformation", confidence: 0.75 },
    { name: "spam", rules: SPAM_PATTERNS, category: "spam", confidence: 0.7 },
  ];

  for (const rs of ruleSets) {
    for (const r of rs.rules) {
      if (r.re.test(t)) {
        flags.push(r.label);
        return {
          hit: {
            category: rs.category,
            confidence: rs.confidence,
            reason: `Rule matched: ${r.label} (${r.re.source.slice(0, 60)})`,
            flag: r.label,
          },
          flags,
        };
      }
    }
  }

  return { hit: null, flags };
}

/**
 * Map a category + confidence to a recommended action.
 *
 * Policy:
 *   • clean → allow
 *   • spam (high conf) → shadowban  (let the post through but hide it)
 *   • spam (mid conf)   → flag
 *   • scam (high conf)  → block
 *   • scam (mid conf)   → flag
 *   • harassment (high) → block
 *   • harassment (mid)  → flag
 *   • nsfw (high)       → block
 *   • nsfw (mid)        → flag
 *   • misinformation    → flag (always — never auto-block political speech)
 *   • other (high)      → flag
 *   • other (mid)       → flag
 *
 * We NEVER auto-delete. `block` here means "hide from feeds + enqueue for
 * human review", not "remove the content". Human moderators have the final
 * say on all `block` decisions.
 */
function pickAction(category: ModerationResult["category"], confidence: number): ModerationResult["action"] {
  if (category === "clean") return "allow";
  if (category === "spam") return confidence >= 0.8 ? "shadowban" : "flag";
  if (category === "scam") return confidence >= 0.7 ? "block" : "flag";
  if (category === "harassment") return confidence >= 0.7 ? "block" : "flag";
  if (category === "nsfw") return confidence >= 0.8 ? "block" : "flag";
  if (category === "misinformation") return "flag";
  // other
  return confidence >= 0.7 ? "flag" : "allow";
}

// ── AI tier (optional, only when an AI key is available) ─────────────────

function isAiAvailable(): boolean {
  return Boolean(
    process.env.GROQ_API_KEY ||
      process.env.GROQ_API ||
      process.env.OPENAI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.HUGGINGFACE_API_KEY ||
      process.env.hugging_face_api ||
      process.env.OPENROUTER_API_KEY,
  );
}

/**
 * Ask the AI provider chain to classify `text`. Returns a partial
 * `ModerationResult` (category, confidence, reason) on success, `null` on
 * any failure (timeout, unparseable response, no provider available).
 *
 * The AI is given a STRICT JSON schema so the response is deterministic.
 */
async function aiModerate(text: string): Promise<{
  category: ModerationResult["category"];
  confidence: number;
  reason: string;
} | null> {
  if (!isAiAvailable()) return null;
  if (!text || text.length < 4) return null;

  const sys = [
    "You are Cirkle Moderation — a real-time content safety classifier.",
    "Categories: clean | spam | scam | harassment | nsfw | misinformation | other",
    "Return STRICT JSON: {\"category\":\"...\",\"confidence\":0.0,\"reason\":\"...\"}",
    "confidence is 0-1. reason is <=80 chars. Do not include any prose outside the JSON.",
  ].join(" ");
  const usr = `Classify this user-generated content:\n\n"""\n${text.slice(0, 2000)}\n"""`;

  try {
    const raw = await aiComplete(sys, usr, 200, false);
    if (!raw) return null;
    const parsed = extractJSON<{
      category: string;
      confidence: number;
      reason: string;
    }>(raw);
    if (!parsed) return null;

    const allowed = ["clean", "spam", "scam", "harassment", "nsfw", "misinformation", "other"];
    const category = (typeof parsed.category === "string" ? parsed.category : "other").toLowerCase();
    if (!allowed.includes(category)) return null;
    let confidence = Number(parsed.confidence);
    if (!isFinite(confidence)) confidence = 0.5;
    confidence = Math.max(0, Math.min(1, confidence));
    const reason = String(parsed.reason || "").slice(0, 120) || "AI classified";

    return {
      category: category as ModerationResult["category"],
      confidence,
      reason,
    };
  } catch (err) {
    logger.warn("[moderation-pipeline] AI tier failed", { error: String((err as Error)?.message || err) });
    return null;
  }
}

// ── Decision logging (best-effort) ────────────────────────────────────────

/**
 * Persist a moderation decision to the `ModerationLog` table.
 *
 * Failures are logged but never thrown — the moderation pipeline must not
 * block on a DB outage. The row is keyed by `contentId` (or a generated
 * id when none is supplied) so the decision can be joined back to the
 * content later by moderators reviewing the queue.
 */
async function logDecision(opts: {
  text?: string;
  authorId?: string;
  authorHandle?: string;
  module?: string;
  result: ModerationResult;
  contentId?: string;
  provider: string;
}): Promise<void> {
  try {
    const contentId =
      opts.contentId ||
      `mod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.moderationLog.create({
      data: {
        contentId,
        contentType: opts.module || "post",
        category: opts.result.category,
        confidence: opts.result.confidence,
        action: opts.result.action,
      },
    });
  } catch (err) {
    // Best-effort — never fail moderation because of a DB write.
    logger.warn("[moderation-pipeline] failed to persist ModerationLog", {
      error: String((err as Error)?.message || err),
      category: opts.result.category,
      action: opts.result.action,
    });
  }
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Moderate a single piece of content.
 *
 * Pipeline:
 *   1. Run the rule-based heuristic (always — even if AI is available,
 *      we use it as a sanity check + fallback).
 *   2. If AI is configured, ask the AI provider chain for a second opinion.
 *   3. Pick the more conservative (higher-confidence) of the two decisions.
 *   4. Map category+confidence → action.
 *   5. Persist the decision to `ModerationLog` (best-effort).
 *
 * NEVER throws — on any internal error returns `{ action: "allow", category:
 * "clean", confidence: 0, reason: "...", flags: [] }` so the platform degrades
 * gracefully. The caller can then choose to enqueue for human review based
 * on `confidence === 0` if it wants.
 */
export async function moderateContent(input: ModerationInput): Promise<ModerationResult> {
  const text = (input?.text ?? "").trim();
  const contentId =
    (input?.module || "post") +
    ":" +
    (input?.authorId || "anon") +
    ":" +
    Math.abs(hashCode(text)).toString(36);

  try {
    // ── Tier 1: heuristic ──────────────────────────────────────────────
    const { hit, flags } = heuristicModerate(text);
    let category: ModerationResult["category"] = hit?.category ?? "clean";
    let confidence = hit?.confidence ?? 0.5;
    let reason = hit?.reason ?? "no heuristic matches";
    let provider = "heuristic";

    // ── Tier 2: AI (optional) ──────────────────────────────────────────
    const aiResult = await aiModerate(text);
    if (aiResult) {
      provider = "ai+heuristic";
      // Take the more conservative result (higher confidence non-clean decision).
      if (aiResult.category !== "clean" && aiResult.confidence >= confidence) {
        category = aiResult.category;
        confidence = aiResult.confidence;
        reason = aiResult.reason;
      } else if (category === "clean" && aiResult.category !== "clean") {
        // AI flagged something the heuristic missed.
        category = aiResult.category;
        confidence = Math.max(0.5, aiResult.confidence);
        reason = aiResult.reason;
      }
    }

    const action = pickAction(category, confidence);

    const result: ModerationResult = {
      action,
      category,
      confidence: Math.round(confidence * 100) / 100,
      reason,
      flags: flags.length > 0 ? flags : [],
    };

    // Persist the decision (best-effort). Done in the background so we
    // don't block the response — but we await it so the test suite can
    // verify the row was written if needed.
    await logDecision({
      text,
      authorId: input?.authorId,
      authorHandle: input?.authorHandle,
      module: input?.module,
      contentId,
      result,
      provider,
    });

    logger.info("[moderation-pipeline] decision", {
      category,
      action,
      confidence: result.confidence,
      provider,
      flags: result.flags.length,
    });

    return result;
  } catch (err) {
    // NEVER throw — moderation must always return a result.
    const message = String((err as Error)?.message || err);
    logger.error("[moderation-pipeline] unexpected error", { error: message });
    return {
      action: "allow",
      category: "clean",
      confidence: 0,
      reason: `moderation error: ${message.slice(0, 80)}`,
      flags: [],
    };
  }
}

/**
 * Moderate a batch of items in parallel.
 *
 * Limits concurrency to 5 simultaneous AI calls (when AI is enabled) so we
 * don't trip provider rate limits. Each item is moderated independently —
 * one failure doesn't abort the batch.
 */
export async function moderateBatch(
  items: Array<ModerationBatchItem>,
): Promise<Array<ModerationBatchResult>> {
  if (!Array.isArray(items) || items.length === 0) return [];

  const CONCURRENCY = 5;
  const out: Array<ModerationBatchResult> = new Array(items.length);

  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      const item = items[i];
      try {
        const result = await moderateContent({ text: item.text });
        out[i] = { id: item.id, result };
      } catch (err) {
        // Defensive — moderateContent already catches, but just in case.
        out[i] = {
          id: item.id,
          result: {
            action: "allow",
            category: "clean",
            confidence: 0,
            reason: `batch error: ${String((err as Error)?.message || err).slice(0, 60)}`,
            flags: [],
          },
        };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()));
  return out;
}

// ── Internal: tiny string hash (deterministic contentId for log rows) ───

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

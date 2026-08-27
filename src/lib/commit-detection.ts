/**
 * Commit AI Auto-Detection
 * ============================================================================
 * When a user presses "Commit" in a chat, this AI auto-detects what type of
 * commit it is based on the message content:
 *   - "price"     — a price quote or offer (e.g. "$500 for the laptop")
 *   - "commodity" — a commodity trade (e.g. "100 tons of wheat at $X/ton")
 *   - "agreement" — a general agreement or contract terms
 *   - "all"       — multiple categories detected
 *
 * Also extracts: amount, currency, commodity (if any), parties, deadline.
 */

import "server-only";
import { aiComplete } from "@/lib/ai";
import { logger } from "@/lib/logger";

export type CommitDetectedType = "price" | "commodity" | "agreement" | "all";

export interface CommitDetection {
  /** Primary detected type. */
  type: CommitDetectedType;
  /** All detected types (for "all" category). */
  detectedTypes: CommitDetectedType[];
  /** Extracted amount, if any. */
  amount?: number;
  /** Extracted currency code (USD, EGP, SAR, etc.). */
  currency?: string;
  /** Extracted commodity name, if any (e.g. "wheat", "gold", "oil"). */
  commodity?: string;
  /** Extracted quantity, if any (e.g. "100 tons"). */
  quantity?: string;
  /** Extracted parties (names/handles). */
  parties: string[];
  /** Extracted deadline, if any. */
  deadline?: string;
  /** Key terms extracted from the message. */
  keyTerms: string[];
  /** AI confidence score (0-1). */
  confidence: number;
  /** Short rationale for the detection. */
  rationale: string;
}

/**
 * Auto-detect the commit type from a message or conversation snippet.
 */
export async function detectCommitType(
  text: string,
  context?: { senderName?: string; recipientName?: string },
): Promise<CommitDetection> {
  if (!text || text.trim().length < 5) {
    return {
      type: "agreement",
      detectedTypes: ["agreement"],
      parties: [],
      keyTerms: [],
      confidence: 0.3,
      rationale: "Too little content to detect a specific type — defaulting to agreement.",
    };
  }

  const prompt = `Analyze the following message and detect what type of business commitment it represents.

Types to detect:
- "price": A price quote, offer, or payment amount (e.g. "I'll sell it for $500", "the price is 10,000 EGP")
- "commodity": A commodity trade involving goods (e.g. "100 tons of wheat", "5 barrels of oil", "buying 50kg of rice")
- "agreement": A general agreement, contract terms, or commitment (e.g. "I agree to deliver by Friday", "we'll partner on this project")
- "all": If multiple types are detected (e.g. a price + a commodity + delivery terms)

Also extract:
- amount (number only, no currency)
- currency (ISO code: USD, EGP, SAR, AED, etc.)
- commodity (name of the physical good, if any)
- quantity (e.g. "100 tons", "50 kg", "5 barrels")
- parties (names or handles of the people involved)
- deadline (any mentioned time/date for delivery or completion)
- keyTerms (important terms or conditions mentioned)
- confidence (0.0 to 1.0 — how confident you are in the detection)
- rationale (one sentence explaining why you chose this type)

Return ONLY a JSON object with this shape (no markdown, no explanation):
{
  "type": "price" | "commodity" | "agreement" | "all",
  "detectedTypes": ["price", ...],
  "amount": 500,
  "currency": "USD",
  "commodity": "wheat",
  "quantity": "100 tons",
  "parties": ["Ahmed", "Sara"],
  "deadline": "Friday",
  "keyTerms": ["delivery included", "payment on receipt"],
  "confidence": 0.85,
  "rationale": "Message contains a price quote with a currency and delivery terms."
}

${context?.senderName ? `Sender: ${context.senderName}` : ""}
${context?.recipientName ? `Recipient: ${context.recipientName}` : ""}

Message to analyze:
"""
${text}
"""`;

  try {
    const result = await aiComplete({
      prompt,
      systemPrompt:
        "You are a business document analysis AI. You detect commitment types and extract structured data from messages. Always respond with valid JSON only — no markdown, no explanation.",
      maxTokens: 600,
      temperature: 0.1,
    });

    let jsonText = result.text.trim();
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(jsonText);

    return {
      type: (parsed.type as CommitDetectedType) || "agreement",
      detectedTypes: Array.isArray(parsed.detectedTypes)
        ? parsed.detectedTypes
        : [parsed.type || "agreement"],
      amount: typeof parsed.amount === "number" ? parsed.amount : undefined,
      currency: typeof parsed.currency === "string" ? parsed.currency.toUpperCase() : undefined,
      commodity: typeof parsed.commodity === "string" ? parsed.commodity : undefined,
      quantity: typeof parsed.quantity === "string" ? parsed.quantity : undefined,
      parties: Array.isArray(parsed.parties) ? parsed.parties.map(String) : [],
      deadline: typeof parsed.deadline === "string" ? parsed.deadline : undefined,
      keyTerms: Array.isArray(parsed.keyTerms) ? parsed.keyTerms.map(String).slice(0, 10) : [],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      rationale: typeof parsed.rationale === "string" ? parsed.rationale : "",
    };
  } catch (err) {
    logger.warn("[commit-detection] AI failed, returning fallback:", err);
    return detectCommitTypeFallback(text);
  }
}

/**
 * Simple regex-based fallback detection (no AI call).
 */
function detectCommitTypeFallback(text: string): CommitDetection {
  const detectedTypes: CommitDetectedType[] = [];
  const keyTerms: string[] = [];

  // ── Price detection ─────────────────────────────────────────────────────
  const priceMatch = text.match(
    /(?:\$|USD|EGP|SAR|AED|EUR|GBP|JPy|KRW|CNY|INR|PKR|TRY)\s?\d{1,3}(?:[,.]?\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[,.]?\d{3})*(?:[.,]\d{2})?\s?(?:USD|EGP|SAR|AED|EUR|GBP|dollars?|pounds?|riyals?|dirhams?)/i,
  );
  if (priceMatch) {
    detectedTypes.push("price");
    keyTerms.push(`Price: ${priceMatch[0]}`);
  }

  // ── Commodity detection ────────────────────────────────────────────────
  const commodityMatch = text.match(
    /(\d+(?:\.\d+)?)\s*(tons?|kg|kilograms?|lbs?|pounds?|barrels?|boxes?|cartons?|pieces?|units?)\s+(?:of\s+)?([\w\s]+)/i,
  );
  if (commodityMatch) {
    detectedTypes.push("commodity");
    keyTerms.push(`Quantity: ${commodityMatch[1]} ${commodityMatch[2]} of ${commodityMatch[3]}`);
  }

  // ── Agreement detection (keywords) ─────────────────────────────────────
  const agreementKeywords = /\b(agree|agree|commit|promise|deal|contract|terms|deliver|deliver|deadline|by friday|by monday|next week|partner|sign|accept|confirm)\b/i;
  if (agreementKeywords.test(text)) {
    detectedTypes.push("agreement");
  }

  // ── Determine primary type ────────────────────────────────────────────
  let primaryType: CommitDetectedType = "agreement";
  if (detectedTypes.length >= 2) {
    primaryType = "all";
  } else if (detectedTypes.length === 1) {
    primaryType = detectedTypes[0];
  }

  return {
    type: primaryType,
    detectedTypes: detectedTypes.length > 0 ? detectedTypes : ["agreement"],
    parties: [],
    keyTerms,
    confidence: 0.4,
    rationale: "Fallback regex-based detection (AI unavailable).",
  };
}

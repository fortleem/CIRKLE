import "server-only";
import { aiComplete, extractJSON } from "@/lib/ai";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U12 — AI Import
// Accepts pasted agreement text (plain text, pasted PDF text, or DocuSign
// export) and extracts a structured agreement via the multi-provider AI
// chain. Falls back to a regex-based extractor if every AI provider fails
// so the import flow always returns something usable.
// ─────────────────────────────────────────────────────────────────────────────

export type CommitType = "price" | "work" | "service" | "rental" | "group_buy";

export interface ExtractedAgreement {
  title: string;
  description: string;
  type: CommitType;
  amount: number;
  currency: string;
  deadline: string; // ISO yyyy-mm-dd
  counterpartyName: string;
  conditions: string[];
  escrowContractHolder: string | null;
  confidence: number; // 0-1
  source: "ai" | "heuristic";
}

const VALID_TYPES: CommitType[] = ["price", "work", "service", "rental", "group_buy"];

const SYS_PROMPT = `You are CirkleCommit's import engine. You receive raw agreement text (plain text, pasted PDF text, or a DocuSign export). Extract the structured agreement and return STRICT JSON only — no prose, no markdown fences.

JSON shape:
{
  "title": string (<=80 chars, descriptive),
  "description": string (<=400 chars, neutral summary),
  "type": "price" | "work" | "service" | "rental" | "group_buy",
  "amount": number (0 if unknown),
  "currency": "SAR" | "AED" | "EGP" | "USD" | "EUR" | "USDC",
  "deadline": "YYYY-MM-DD" or "" if unknown,
  "counterpartyName": string (the other party — NOT "You"),
  "conditions": string[] (each condition as a short clause, max 10),
  "escrowContractHolder": string | null (party name who holds escrow, or null if none),
  "confidence": number (0-1)
}

Rules:
- Pick the type that best matches the agreement's primary intent.
- If a field can't be determined, use "" or 0 — never fabricate.
- Conditions should be the actual obligations, not section headings.
- Respond with JSON only.`;

export async function extractAgreementFromText(
  text: string,
): Promise<ExtractedAgreement> {
  const trimmed = text.trim();
  if (!trimmed) {
    return heuristicExtract("");
  }

  // Try the AI chain first. 600 tokens is plenty for the JSON above.
  const raw = await aiComplete(SYS_PROMPT, trimmed, 700);
  if (raw) {
    const parsed = extractJSON<Partial<ExtractedAgreement>>(raw);
    if (parsed && parsed.title) {
      return normalizeAIResult(parsed);
    }
  }

  // Fallback: heuristic extraction.
  return heuristicExtract(trimmed);
}

function normalizeAIResult(p: Partial<ExtractedAgreement>): ExtractedAgreement {
  const type = VALID_TYPES.includes(p.type as CommitType) ? (p.type as CommitType) : "service";
  const amount = typeof p.amount === "number" && p.amount >= 0 ? p.amount : 0;
  const currency = p.currency || "SAR";
  const deadline = normalizeDeadline(p.deadline || "");
  const conditions = Array.isArray(p.conditions)
    ? p.conditions.filter((c): c is string => typeof c === "string" && c.trim().length > 0).slice(0, 10)
    : [];
  const escrowHolder =
    typeof p.escrowContractHolder === "string" && p.escrowContractHolder.trim()
      ? p.escrowContractHolder.trim()
      : null;
  const confidence = typeof p.confidence === "number" ? Math.max(0, Math.min(1, p.confidence)) : 0.7;

  return {
    title: (p.title || "Imported agreement").slice(0, 80),
    description: (p.description || "").slice(0, 400),
    type,
    amount,
    currency,
    deadline,
    counterpartyName: (p.counterpartyName || "Counterparty").slice(0, 60),
    conditions,
    escrowContractHolder: escrowHolder,
    confidence,
    source: "ai",
  };
}

function normalizeDeadline(s: string): string {
  if (!s) return "";
  // Accept YYYY-MM-DD directly.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// Heuristic fallback — runs entirely on regex patterns, no AI needed.
// ─────────────────────────────────────────────────────────────────────────────

function heuristicExtract(text: string): ExtractedAgreement {
  if (!text) {
    return {
      title: "",
      description: "",
      type: "service",
      amount: 0,
      currency: "SAR",
      deadline: "",
      counterpartyName: "Counterparty",
      conditions: [],
      escrowContractHolder: null,
      confidence: 0,
      source: "heuristic",
    };
  }

  // Title: first non-empty line, trimmed.
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const title = (lines[0] || "Imported agreement").slice(0, 80);

  // Amount + currency: "<number> <CURRENCY>" or "<CURRENCY> <number>"
  const currencyRe = /(SAR|AED|EGP|USD|EUR|USDC)/i;
  const amountRe = /(?:^|[^\d])(\d{1,3}(?:[,\d]{0,9})(?:\.\d{1,2})?)\s*(SAR|AED|EGP|USD|EUR|USDC)|(SAR|AED|EGP|USD|EUR|USDC)\s*(\d{1,3}(?:[,\d]{0,9})(?:\.\d{1,2})?)/i;
  let amount = 0;
  let currency = "SAR";
  const amtMatch = text.match(amountRe);
  if (amtMatch) {
    const numStr = (amtMatch[1] || amtMatch[4] || "0").replace(/,/g, "");
    amount = parseFloat(numStr) || 0;
    currency = (amtMatch[2] || amtMatch[3] || "SAR").toUpperCase();
  } else {
    const cm = text.match(currencyRe);
    if (cm) currency = cm[1].toUpperCase();
  }

  // Deadline: any date-like string.
  const dateRe = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\s+\w{3,9}\s+\d{4})/;
  const dMatch = text.match(dateRe);
  const deadline = dMatch ? normalizeDeadline(dMatch[1]) : "";

  // Type: keyword match.
  const lower = text.toLowerCase();
  let type: CommitType = "service";
  if (/(rent|lease|tenant|landlord)/.test(lower)) type = "rental";
  else if (/(buy|purchase|sell|sale|price)/.test(lower)) type = "price";
  else if (/(group buy|joint purchase|collective)/.test(lower)) type = "group_buy";
  else if (/(work|deliverable|freelance|contractor|scope of work)/.test(lower)) type = "work";

  // Counterparty: look for "between X and Y" or "Party: X".
  let counterpartyName = "Counterparty";
  const betweenMatch = text.match(/between\s+([^,\n]+?)\s+and\s+([^,\n]+)/i);
  if (betweenMatch) {
    // Pick whichever side isn't "you"
    const a = betweenMatch[1].trim();
    const b = betweenMatch[2].trim();
    counterpartyName = /you/i.test(a) ? b : a;
  } else {
    const partyMatch = text.match(/(?:party|client|vendor|seller|buyer|contractor)\s*[:\-]\s*([A-Z][\w\s]{1,40})/);
    if (partyMatch) counterpartyName = partyMatch[1].trim();
  }
  counterpartyName = counterpartyName.slice(0, 60);

  // Conditions: lines starting with a bullet, number, or "shall/condition".
  const conditions = lines
    .filter((l) => /^([-•*]|\d+[.)]|condition|shall|obligation)/i.test(l))
    .map((l) => l.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
    .filter((l) => l.length > 3 && l.length < 200)
    .slice(0, 10);

  // Escrow holder: detect "escrow" mention.
  let escrowContractHolder: string | null = null;
  if (/\bescrow\b/i.test(text)) {
    escrowContractHolder = counterpartyName !== "Counterparty" ? counterpartyName : "Escrow Agent";
  }

  return {
    title,
    description: lines.slice(1, 4).join(" ").slice(0, 400),
    type,
    amount,
    currency,
    deadline,
    counterpartyName,
    conditions: conditions.length > 0 ? conditions : ["Payment on completion"],
    escrowContractHolder,
    confidence: 0.4,
    source: "heuristic",
  };
}

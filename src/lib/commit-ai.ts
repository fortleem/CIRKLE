import "server-only";

import { aiComplete } from "@/lib/ai";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit AI — U1 Fairness Audit + U2 AI Mediator
//
// Both functions route through the shared multi-provider `aiComplete` chain
// (Groq → OpenAI → HuggingFace → ZAI). Failures degrade gracefully — the
// caller always receives a usable, well-typed result so the overlay UX never
// breaks when a provider is rate-limited or down.
// ─────────────────────────────────────────────────────────────────────────────

export interface FairnessIssue {
  clause: string;
  severity: "warning" | "info" | "good";
  message: string;
  suggestion?: string;
}

export interface FairnessAnalysis {
  score: number; // 0-100
  issues: FairnessIssue[];
  marketRange?: string;
  summary: string;
}

export interface MediationOption {
  id: string;
  title: string;
  description: string;
  legalBasis: string;
  recommendation: "accept" | "negotiate" | "reject";
}

export interface MediationResult {
  summary: string;
  disputedClause: string;
  options: MediationOption[];
  aiRecommendation: string;
  escalateToProfessional: boolean;
  professionalType?: "lawyer" | "accountant";
}

/**
 * Defensive JSON extractor — providers occasionally wrap JSON in markdown
 * fences or prepend conversational text. We slice from the first `{` to the
 * matching last `}` and try `JSON.parse`. Returns `null` on any failure so
 * the caller can fall back to a sensible default.
 */
function safeJSON<T>(raw: string): T | null {
  if (!raw) return null;
  const trimmed = raw.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(trimmed.slice(first, last + 1)) as T;
  } catch {
    return null;
  }
}

/**
 * U1 — Analyzes agreement text in real-time for fairness issues.
 * Uses Cirkle Brain AI to detect: ambiguous clauses, unfair terms,
 * missing protections, above-market pricing, missing cancellation, etc.
 *
 * Returns a 0-100 score plus a list of clause-level issues. Each issue
 * carries a severity (warning/info/good) and an optional `suggestion`
 * that the UI can one-tap insert into the agreement description.
 */
export async function analyzeFairness(opts: {
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  type: string;
  country: string;
}): Promise<FairnessAnalysis> {
  const sys = `You are the CirkleCommit AI Fairness Auditor. Analyze agreements for fairness issues. Return JSON: {"score": 0-100, "issues": [{"clause": "text", "severity": "warning|info|good", "message": "explanation", "suggestion": "how to fix"}], "marketRange": "estimated market range", "summary": "1-sentence summary"}. Check for: ambiguous language, missing cancellation, unfair payment terms, above-market pricing, missing liability cap, missing dispute clause, one-sided terms. Country: ${opts.country}.`;

  const usr = `Agreement type: ${opts.type}\nTitle: ${opts.title}\nDescription: ${opts.description}\nAmount: ${opts.amount || "N/A"} ${opts.currency || ""}`;

  try {
    const raw = await aiComplete(sys, usr, 800);
    if (!raw) return { score: 50, issues: [], summary: "Analysis unavailable" };
    const parsed = safeJSON<{
      score?: number;
      issues?: FairnessIssue[];
      marketRange?: string;
      summary?: string;
    }>(raw);
    if (!parsed) {
      return { score: 50, issues: [], summary: "Analysis unavailable" };
    }
    return {
      score: typeof parsed.score === "number"
        ? Math.max(0, Math.min(100, Math.round(parsed.score)))
        : 50,
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 12) : [],
      marketRange: typeof parsed.marketRange === "string" ? parsed.marketRange : undefined,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  } catch {
    return { score: 50, issues: [], summary: "Analysis failed" };
  }
}

/**
 * U2 — AI Mediator: analyzes a dispute and proposes 3 resolution options.
 * If the dispute is complex (legal/financial), recommends escalation to a
 * third-party lawyer or accountant from the Cirkle Professional Network.
 *
 * The returned options each carry a `recommendation` (accept/negotiate/reject)
 * plus the `legalBasis` so the UI can show precedent/statutory grounding.
 * `escalateToProfessional` flips the overlay into the "Connect with a
 * verified professional" mode (dispatches the `circle:pro-network` event).
 */
export async function mediateDispute(opts: {
  agreementTitle: string;
  agreementDescription: string;
  disputeReason: string;
  partyA: string;
  partyB: string;
  country: string;
}): Promise<MediationResult> {
  const sys = `You are the CirkleCommit AI Mediator. Analyze the dispute and propose 3 resolution options. If the dispute involves complex legal or financial issues, set escalateToProfessional=true and professionalType. Return JSON: {"summary": "...", "disputedClause": "...", "options": [{"id": "1", "title": "...", "description": "...", "legalBasis": "...", "recommendation": "accept|negotiate|reject"}], "aiRecommendation": "...", "escalateToProfessional": false, "professionalType": "lawyer|accountant"}. Country: ${opts.country}.`;

  const usr = `Agreement: ${opts.agreementTitle}\nDescription: ${opts.agreementDescription}\nDispute reason: ${opts.disputeReason}\nParty A: ${opts.partyA}\nParty B: ${opts.partyB}`;

  const fallback: MediationResult = {
    summary: "Mediation unavailable",
    disputedClause: "",
    options: [],
    aiRecommendation: "",
    escalateToProfessional: false,
  };

  try {
    const raw = await aiComplete(sys, usr, 1000);
    if (!raw) return fallback;
    const parsed = safeJSON<MediationResult>(raw);
    if (!parsed) return fallback;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      disputedClause: typeof parsed.disputedClause === "string" ? parsed.disputedClause : "",
      options: Array.isArray(parsed.options) ? parsed.options.slice(0, 3) : [],
      aiRecommendation: typeof parsed.aiRecommendation === "string" ? parsed.aiRecommendation : "",
      escalateToProfessional: Boolean(parsed.escalateToProfessional),
      professionalType: parsed.professionalType === "lawyer" || parsed.professionalType === "accountant"
        ? parsed.professionalType
        : undefined,
    };
  } catch {
    return { ...fallback, summary: "Mediation failed" };
  }
}

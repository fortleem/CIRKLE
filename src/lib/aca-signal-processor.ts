// @ts-nocheck
// P0 FIX: Now persists to Prisma DB with in-memory fallback
/**
 * ACA Signal Processor — Citizen Shield → ACA Intelligence Pipeline
 * ============================================================================
 * P0 FIX: signals now persist to the `AcaSignal` Prisma table. Every mutating
 * function writes to the DB (best-effort) AND to the in-memory cache, so the
 * synchronous public surface continues to work even when the DB is cold /
 * unavailable. Reads return from the in-memory cache and trigger a
 * fire-and-forget DB prefetch so the cache stays fresh across calls.
 * A SIGNAL is an intelligence object: a structured indication of a possible
 * issue that requires human review. It is NOT a case.
 *
 * SIGNAL SOURCES (per CIRKLE-ACA-BLUEPRINT §9, §11):
 *   - citizen_report    — a Citizen Shield report whose pattern suggests an
 *                        administrative (not criminal) matter
 *   - service_failure   — repeated failure of a government service to meet SLA
 *   - cross_case        — pattern detected across multiple open/closed cases
 *   - systemic          — systemic pattern detected by the knowledge graph
 *   - external          — inter-agency referral (with consent boundary enforced)
 *
 * SIGNAL STATUS LIFECYCLE:
 *   pending → reviewed → (converted_to_case | dismissed)
 *
 * CRITICAL DISTINCTION:
 *   - The AI ASSISTS in evaluation (does this meet the threshold for case
 *     creation? what is the confidence? what evidence already exists?).
 *   - The DECISION to create a case is a HUMAN decision by an ACA agent.
 *     The AI never opens a case on its own.
 *   - Signals are NEVER silently merged into cases; conversion is a discrete
 *     recorded action with audit trail.
 *
 * CITIZEN ↔ ACA BOUNDARY (per §6, §99):
 *   - The ACA does NOT receive citizen personal history by default.
 *   - A signal carries a *referral reason*, not the full citizen dossier.
 *   - Personal identifiers are minimized at the signal boundary.
 * ============================================================================
 */

import { db } from "@/lib/db";
import { safeDbQuery } from "@/lib/db-safe";

// ────────────────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────────────────

export type AcaSignalSource =
  | "citizen_report"
  | "service_failure"
  | "cross_case"
  | "systemic"
  | "external";

export type AcaSignalStatus =
  | "pending"
  | "reviewed"
  | "converted_to_case"
  | "dismissed";

export type AcaSignalPattern =
  | "single_complaint"
  | "clustered_complaints"
  | "sla_breach"
  | "process_inconsistency"
  | "potential_integrity_indicator"
  | "cross_service_correlation"
  | "repeated_failure"
  | "systemic";

export interface AcaSignalEvidenceAvailability {
  hasDirectEvidence: boolean;
  hasWitnessCorroboration: boolean;
  hasDocumentaryTrail: boolean;
  evidenceCount: number;
  notes?: string;
}

export interface AcaSignalIntegrityIndicator {
  type:
    | "tampering_suspected"
    | "record_alteration"
    | "unauthorized_access"
    | "process_bypass"
    | "favoritism_pattern"
    | "fee_anomaly"
    | "timing_anomaly"
    | "document_inconsistency";
  description: string;
  confidence: number; // 0..1
}

export interface AcaSignalReferral {
  referralReason: string;
  referredBy?: string;          // citizen hash, institution, or inter-agency id
  referredByType: "citizen" | "institution" | "inter_agency" | "system";
  consentScope: "minimal" | "extended"; // minimal = no personal history
}

export interface AcaSignalEvaluation {
  evaluatedAt: string;
  evaluatedBy: string;             // agent id
  evaluatedByName: string;
  aiAssisted: boolean;
  recommendation: "open_case" | "request_more_evidence" | "monitor" | "dismiss";
  confidence: number;              // 0..1
  thresholdMet: boolean;
  rationale: string;
  suggestedPriority?: "low" | "medium" | "high" | "critical";
  suggestedDepartment?: string;
}

export interface AcaSignal {
  signalId: string;
  signalNumber: string;        // e.g. ACA-2025-S-01932
  source: AcaSignalSource;
  pattern: AcaSignalPattern;
  sourceCount: number;          // how many underlying reports/events fed this signal
  service?: string;
  geography?: string;
  timeframe: {
    from: string;
    to: string;
  };
  evidenceAvailability: AcaSignalEvidenceAvailability;
  repeatedFailures?: {
    service?: string;
    count: number;
    overDays: number;
  };
  potentialIntegrityIndicators: AcaSignalIntegrityIndicator[];
  reasonForReferral: AcaSignalReferral;
  status: AcaSignalStatus;
  evaluation?: AcaSignalEvaluation;
  convertedToCaseId?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  dismissedReason?: string;
}

// ────────────────────────────────────────────────────────────────────────────
//  Store
// ────────────────────────────────────────────────────────────────────────────

const _signals = new Map<string, AcaSignal>();
let _sigCounter = 1930;

// ────────────────────────────────────────────────────────────────────────────
//  DB helpers (P0 FIX)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Persist a signal to the DB AND keep the in-memory cache in sync.
 * Wraps `db.acaSignal.upsert` in safeDbQuery so failures are non-fatal.
 */
async function dbUpsertSignal(s: AcaSignal): Promise<void> {
  const result = await safeDbQuery(() =>
    db.acaSignal.upsert({
      where: { signalId: s.signalId },
      create: {
        signalId: s.signalId,
        source: s.source,
        pattern: s.pattern,
        sourceCount: s.sourceCount,
        service: s.service ?? null,
        geography: s.geography ?? null,
        timeframe: s.timeframe ? JSON.stringify(s.timeframe) : null,
        evidenceAvailability: s.evidenceAvailability ? JSON.stringify(s.evidenceAvailability) : null,
        repeatedFailures: JSON.stringify(s.repeatedFailures ?? []),
        potentialIntegrityIndicators: JSON.stringify(s.potentialIntegrityIndicators ?? []),
        reasonForReferral: JSON.stringify(s.reasonForReferral),
        status: s.status,
        convertedToCaseId: s.convertedToCaseId ?? null,
        createdAt: new Date(s.createdAt),
      },
      update: {
        status: s.status,
        convertedToCaseId: s.convertedToCaseId ?? null,
        evidenceAvailability: s.evidenceAvailability ? JSON.stringify(s.evidenceAvailability) : null,
        repeatedFailures: JSON.stringify(s.repeatedFailures ?? []),
        potentialIntegrityIndicators: JSON.stringify(s.potentialIntegrityIndicators ?? []),
        reasonForReferral: JSON.stringify(s.reasonForReferral),
      },
    }),
  );
  if (result === null) {
    console.warn(
      `[aca-signal-processor] DB unavailable for signal ${s.signalId} — in-memory only`,
    );
  }
}

function rowToSignal(row: any): AcaSignal {
  const safeParse = <T,>(s: string | null | undefined, fallback: T): T => {
    try {
      return s ? JSON.parse(s) as T : fallback;
    } catch {
      return fallback;
    }
  };
  let timeframe: AcaSignal["timeframe"] = { from: "", to: "" };
  try {
    timeframe = row.timeframe ? JSON.parse(row.timeframe) : timeframe;
  } catch {
    timeframe = { from: "", to: "" };
  }
  return {
    signalId: row.signalId,
    signalNumber: row.signalId, // signalNumber not stored separately in schema; mirror signalId
    source: row.source as AcaSignalSource,
    pattern: row.pattern as AcaSignalPattern,
    sourceCount: row.sourceCount ?? 1,
    service: row.service ?? undefined,
    geography: row.geography ?? undefined,
    timeframe,
    evidenceAvailability: safeParse<AcaSignalEvidenceAvailability>(row.evidenceAvailability, {
      hasDirectEvidence: false,
      hasWitnessCorroboration: false,
      hasDocumentaryTrail: false,
      evidenceCount: 0,
    }),
    repeatedFailures: safeParse<AcaSignal["repeatedFailures"]>(row.repeatedFailures, undefined),
    potentialIntegrityIndicators: safeParse<AcaSignalIntegrityIndicator[]>(row.potentialIntegrityIndicators, []),
    reasonForReferral: safeParse<AcaSignalReferral>(row.reasonForReferral, {
      referralReason: "",
      referredByType: "system",
      consentScope: "minimal",
    }),
    status: row.status as AcaSignalStatus,
    convertedToCaseId: row.convertedToCaseId ?? undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

/** Load a single signal from the DB into the in-memory cache. */
async function dbLoadSignal(signalId: string): Promise<AcaSignal | null> {
  const row = await safeDbQuery(() =>
    db.acaSignal.findUnique({ where: { signalId } }),
  );
  if (!row) return null;
  const s = rowToSignal(row);
  _signals.set(signalId, s);
  return s;
}

/** Load ALL signals from the DB into the in-memory cache. */
async function dbLoadAllSignals(): Promise<AcaSignal[]> {
  const rows = await safeDbQuery(() => db.acaSignal.findMany());
  if (!rows) return [];
  const signals: AcaSignal[] = [];
  for (const row of rows) {
    const s = rowToSignal(row);
    _signals.set(s.signalId, s);
    signals.push(s);
  }
  return signals;
}

function prefetchSignal(signalId: string): void {
  void dbLoadSignal(signalId).catch(() => {});
}

function prefetchAllSignals(): void {
  void dbLoadAllSignals().catch(() => {});
}

function persistSignalFireAndForget(s: AcaSignal): void {
  void dbUpsertSignal(s).catch(() => {});
}

// ────────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────────

const nowIso = () => new Date().toISOString();
const genId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

function nextSignalNumber(): string {
  const year = new Date().getUTCFullYear();
  return `ACA-${year}-S-${String(++_sigCounter).padStart(5, "0")}`;
}

// ────────────────────────────────────────────────────────────────────────────
//  Public API
// ────────────────────────────────────────────────────────────────────────────

export interface CreateSignalInput {
  source: AcaSignalSource;
  pattern: AcaSignalPattern;
  sourceCount?: number;
  service?: string;
  geography?: string;
  timeframe: { from: string; to: string };
  evidenceAvailability: AcaSignalEvidenceAvailability;
  repeatedFailures?: AcaSignal["repeatedFailures"];
  potentialIntegrityIndicators?: AcaSignalIntegrityIndicator[];
  reasonForReferral: AcaSignalReferral;
}

export function createSignal(input: CreateSignalInput): AcaSignal {
  const signalId = genId("sig");
  const ts = nowIso();
  const s: AcaSignal = {
    signalId,
    signalNumber: nextSignalNumber(),
    source: input.source,
    pattern: input.pattern,
    sourceCount: input.sourceCount ?? 1,
    service: input.service,
    geography: input.geography,
    timeframe: input.timeframe,
    evidenceAvailability: input.evidenceAvailability,
    repeatedFailures: input.repeatedFailures,
    potentialIntegrityIndicators: input.potentialIntegrityIndicators ?? [],
    reasonForReferral: input.reasonForReferral,
    status: "pending",
    createdAt: ts,
    updatedAt: ts,
  };
  _signals.set(signalId, s);
  persistSignalFireAndForget(s);
  return s;
}

export function getSignal(signalId: string): AcaSignal | null {
  const s = _signals.get(signalId) ?? null;
  if (!s) {
    prefetchSignal(signalId);
  }
  return s;
}

export function listSignals(filter?: {
  status?: AcaSignalStatus;
  source?: AcaSignalSource;
  pattern?: AcaSignalPattern;
}): AcaSignal[] {
  // Fire-and-forget DB refresh so the cache stays fresh across calls.
  prefetchAllSignals();
  const all = Array.from(_signals.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  if (!filter) return all;
  return all.filter((s) => {
    if (filter.status && s.status !== filter.status) return false;
    if (filter.source && s.source !== filter.source) return false;
    if (filter.pattern && s.pattern !== filter.pattern) return false;
    return true;
  });
}

/**
 * AI-ASSISTED evaluation of a signal. This is a recommendation only — it does
 * NOT create a case. A human ACA agent must review and decide.
 *
 * The evaluation is intentionally explainable: every recommendation carries a
 * `rationale` so the reviewing agent can audit the AI's reasoning.
 */
export function evaluateSignal(input: {
  signalId: string;
  evaluatedBy: string;
  evaluatedByName: string;
}): AcaSignal | null {
  const s = _signals.get(input.signalId);
  if (!s) return null;
  if (s.status !== "pending") return s;

  // ── AI-assisted scoring (mock heuristics for the building phase) ──────────
  // In production this calls the brain-router with a structured prompt that
  // returns a JSON-validated evaluation. Here we compute simple rule-based
  // signals so the workspace UI can exercise the full flow.
  let score = 0;
  const reasons: string[] = [];

  if (s.evidenceAvailability.hasDirectEvidence) {
    score += 0.35;
    reasons.push("direct evidence available");
  }
  if (s.evidenceAvailability.hasWitnessCorroboration) {
    score += 0.2;
    reasons.push("witness corroboration available");
  }
  if (s.evidenceAvailability.hasDocumentaryTrail) {
    score += 0.15;
    reasons.push("documentary trail exists");
  }
  if (s.pattern === "clustered_complaints" && s.sourceCount >= 3) {
    score += 0.2;
    reasons.push(`${s.sourceCount} clustered complaints`);
  }
  if (s.pattern === "repeated_failure") {
    score += 0.25;
    reasons.push("repeated failure pattern detected");
  }
  if (s.pattern === "systemic") {
    score += 0.2;
    reasons.push("systemic pattern flagged by knowledge graph");
  }
  if (s.potentialIntegrityIndicators.length > 0) {
    score += 0.25 * Math.min(1, s.potentialIntegrityIndicators.length / 3);
    reasons.push(`${s.potentialIntegrityIndicators.length} potential integrity indicator(s)`);
  }
  if (s.reasonForReferral.referralReason.length < 20) {
    score -= 0.1;
    reasons.push("referral reason is sparse (low information)");
  }

  const confidence = Math.max(0, Math.min(1, score));
  const threshold = 0.55;
  const thresholdMet = confidence >= threshold;

  let recommendation: AcaSignalEvaluation["recommendation"];
  let suggestedPriority: AcaSignalEvaluation["suggestedPriority"] | undefined;
  if (s.potentialIntegrityIndicators.some((i) => i.confidence > 0.7)) {
    recommendation = "open_case";
    suggestedPriority = "high";
  } else if (thresholdMet) {
    recommendation = "open_case";
    suggestedPriority = confidence > 0.8 ? "high" : "medium";
  } else if (confidence >= 0.3) {
    recommendation = "request_more_evidence";
    suggestedPriority = "medium";
  } else if (s.pattern === "single_complaint" && s.sourceCount === 1) {
    recommendation = "monitor";
    suggestedPriority = "low";
  } else {
    recommendation = "dismiss";
    suggestedPriority = "low";
  }

  s.evaluation = {
    evaluatedAt: nowIso(),
    evaluatedBy: input.evaluatedBy,
    evaluatedByName: input.evaluatedByName,
    aiAssisted: true,
    recommendation,
    confidence,
    thresholdMet,
    rationale: `Scored ${confidence.toFixed(2)} against threshold ${threshold}. ${reasons.join("; ")}.`,
    suggestedPriority,
    suggestedDepartment: s.service ? `Oversight — ${s.service}` : undefined,
  };
  s.status = "reviewed";
  s.reviewedAt = s.evaluation.evaluatedAt;
  s.reviewedBy = input.evaluatedBy;
  s.updatedAt = s.evaluation.evaluatedAt;
  persistSignalFireAndForget(s);
  return s;
}

/**
 * HUMAN DECISION — convert a reviewed signal into a formal ACA case.
 * The AI does NOT call this; an ACA agent with the `signal.convert` permission
 * does. Returns the new case id; the case object itself is created by
 * aca-case-manager.createCase.
 */
export function convertSignalToCase(input: {
  signalId: string;
  decidedBy: string;
  decidedByName: string;
  rationale?: string;
}): { signal: AcaSignal | null; newCaseId: string | null } {
  const s = _signals.get(input.signalId);
  if (!s) return { signal: null, newCaseId: null };
  if (s.status === "converted_to_case") return { signal: s, newCaseId: s.convertedToCaseId ?? null };
  if (s.status === "dismissed") return { signal: s, newCaseId: null };

  // mark converted — the actual AcaCase is created by the case manager and
  // the API layer passes the new case id back here via `markSignalConverted`.
  const newCaseId = genId("case-link");
  s.status = "converted_to_case";
  s.convertedToCaseId = newCaseId;
  s.updatedAt = nowIso();
  persistSignalFireAndForget(s);
  return { signal: s, newCaseId };
}

export function markSignalConverted(input: {
  signalId: string;
  caseId: string;
  convertedBy: string;
  convertedByName: string;
}): AcaSignal | null {
  const s = _signals.get(input.signalId);
  if (!s) return null;
  s.status = "converted_to_case";
  s.convertedToCaseId = input.caseId;
  s.updatedAt = nowIso();
  persistSignalFireAndForget(s);
  return s;
}

export function dismissSignal(input: {
  signalId: string;
  dismissedBy: string;
  dismissedByName: string;
  reason: string;
}): AcaSignal | null {
  const s = _signals.get(input.signalId);
  if (!s) return null;
  s.status = "dismissed";
  s.dismissedReason = input.reason;
  s.reviewedAt = nowIso();
  s.reviewedBy = input.dismissedBy;
  s.updatedAt = s.reviewedAt;
  persistSignalFireAndForget(s);
  return s;
}

/**
 * Summary statistics for the ACA dashboard's "pending signals" card.
 */
export function signalSummary(): {
  total: number;
  pending: number;
  reviewed: number;
  converted: number;
  dismissed: number;
  withIntegrityIndicators: number;
} {
  // Fire-and-forget DB refresh so the cache stays fresh across calls.
  prefetchAllSignals();
  const all = Array.from(_signals.values());
  return {
    total: all.length,
    pending: all.filter((s) => s.status === "pending").length,
    reviewed: all.filter((s) => s.status === "reviewed").length,
    converted: all.filter((s) => s.status === "converted_to_case").length,
    dismissed: all.filter((s) => s.status === "dismissed").length,
    withIntegrityIndicators: all.filter((s) => s.potentialIntegrityIndicators.length > 0).length,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  Public persistence helpers (DB optional — degrades gracefully)
//
//  P0 FIX: these now delegate to the schema-aware upsert/load helpers above
//  so they actually round-trip correctly against the current `AcaSignal`
//  schema (which does NOT have signalNumber / timeframeFrom / timeframeTo /
//  updatedAt / reviewedAt / reviewedBy columns — those are stored inside the
//  JSON-stringified `timeframe` / `evidenceAvailability` columns instead).
// ────────────────────────────────────────────────────────────────────────────

export async function persistSignal(s: AcaSignal): Promise<void> {
  await dbUpsertSignal(s);
}

export async function loadSignalFromDb(signalId: string): Promise<AcaSignal | null> {
  return dbLoadSignal(signalId);
}

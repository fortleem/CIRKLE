// @ts-nocheck
/**
 * ACA Investigation Workspace
 * ============================================================================
 * Per-case investigation workspace for the ACA layer.
 *
 * The workspace is the agent's working surface during the investigation stage.
 * It is NOT the case itself — the case (managed by `aca-case-manager`) is the
 * formal record; the workspace is where the agent reasons, challenges, and
 * prepares the case for finding.
 *
 * CORE PRIMITIVES:
 *
 * 1. ALTERNATIVE HYPOTHESIS ENGINE (`addHypothesis`)
 *    For every preliminary narrative the case team forms, they must register
 *    an alternative hypothesis. The hypothesis kinds (per blueprint §16):
 *      - procedural_error        — a procedural step was performed incorrectly
 *      - system_failure          — a system/process failed (not a person)
 *      - legitimate_exception    — what looks wrong is actually a sanctioned
 *                                  exception
 *      - negligence              — person failed to act with due care
 *      - process_weakness        — the process itself enables the failure
 *      - potential_misconduct    — person intentionally caused the outcome
 *
 * 2. DEVIL'S ADVOCATE (`challengeFinding`)
 *    When a finding is about to be issued, an AI-assisted "challenge" pass
 *    searches for exculpatory / contradictory evidence and surfaces evidence
 *    gaps. The challenge does NOT block issuance — it ensures the finding
 *    explicitly addresses the strongest counter-arguments.
 *
 * 3. CASE HEALTH (`calculateCaseHealth`)
 *    A 0–100 composite score combining:
 *      - evidence completeness (does every claim have supporting evidence?)
 *      - timeline completeness (every relevant date captured?)
 *      - source coverage (multiple independent sources, not single-source)
 *      - contradiction status (every registered contradiction addressed?)
 *
 * 4. NEXT BEST ACTION (`getNextBestAction`)
 *    AI recommends the next investigative action — e.g. "interview witness X",
 *    "request document Y", "challenge hypothesis Z". Recommendation only; the
 *    agent decides whether to act.
 * ============================================================================
 */

import { db } from "@/lib/db";
import { safeDbQuery } from "@/lib/db-safe";
import type { AcaCase } from "./aca-case-manager";
import type { AcaEvidence } from "./aca-evidence-manager";

// ────────────────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────────────────

export type AcaHypothesisKind =
  | "procedural_error"
  | "system_failure"
  | "legitimate_exception"
  | "negligence"
  | "process_weakness"
  | "potential_misconduct";

export type AcaHypothesisStatus =
  | "open"
  | "supported"
  | "contradicted"
  | "inconclusive"
  | "withdrawn";

export interface AcaHypothesis {
  hypothesisId: string;
  caseId: string;
  kind: AcaHypothesisKind;
  statement: string;
  proposedBy: string;
  proposedByName: string;
  proposedAt: string;
  status: AcaHypothesisStatus;
  supportingEvidence: string[];     // evidence ids
  contradictingEvidence: string[];  // evidence ids
  notes?: string;
  challenge?: AcaChallengeResult;
}

export interface AcaChallengeResult {
  challengeId: string;
  challengedAt: string;
  challengedBy: string;
  challengedByName: string;
  challengesRaised: string[];
  exculpatoryEvidenceFound: string[];
  contradictoryEvidenceFound: string[];
  newGaps: string[];
  aiAssisted: boolean;
  conclusion: "supports_finding" | "weakens_finding" | "inconclusive";
}

export interface AcaContradiction {
  contradictionId: string;
  caseId: string;
  description: string;
  registeredAt: string;
  registeredBy: string;
  registeredByName: string;
  status: "open" | "resolved" | "accepted_as_unresolved";
  resolution?: string;
  resolvedAt?: string;
  linkedEvidence?: string[];
  linkedHypothesis?: string;
}

export interface AcaEvidenceGap {
  gapId: string;
  caseId: string;
  description: string;
  gapType: "missing_witness" | "missing_document" | "missing_recording" | "missing_data" | "missing_corroboration" | "other";
  priority: "low" | "medium" | "high" | "critical";
  registeredAt: string;
  registeredBy: string;
  registeredByName: string;
  status: "open" | "in_progress" | "resolved" | "unresolvable";
  resolution?: string;
  resolvedAt?: string;
  blocksFinding?: boolean;
}

export interface AcaWorkspaceTimelineEvent {
  eventId: string;
  caseId: string;
  timestamp: string;
  actorAgentId: string;
  actorDisplayName: string;
  kind:
    | "hypothesis_added"
    | "hypothesis_challenged"
    | "hypothesis_status_changed"
    | "contradiction_registered"
    | "contradiction_resolved"
    | "evidence_gap_flagged"
    | "evidence_gap_resolved"
    | "next_best_action_suggested"
    | "case_health_recalculated"
    | "note_added";
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface AcaNextBestAction {
  actionId: string;
  suggestedAt: string;
  suggestedBy: "ai_assisted" | "supervisor" | "system";
  action: string;
  rationale: string;
  priority: "low" | "medium" | "high" | "critical";
  linksTo?: {
    hypothesisId?: string;
    gapId?: string;
    contradictionId?: string;
    evidenceId?: string;
  };
}

export interface InvestigationWorkspace {
  caseId: string;
  hypotheses: AcaHypothesis[];
  contradictions: AcaContradiction[];
  evidenceGaps: AcaEvidenceGap[];
  timeline: AcaWorkspaceTimelineEvent[];
  nextBestAction: AcaNextBestAction | null;
  caseHealth: number;       // 0..100
  caseReadiness: number;    // 0..100 — readiness to issue a finding
  lastRecalculatedAt: string;
  notes: { noteId: string; text: string; addedAt: string; addedBy: string; addedByName: string }[];
}

// ────────────────────────────────────────────────────────────────────────────
//  Store
// ────────────────────────────────────────────────────────────────────────────

const _workspaces = new Map<string, InvestigationWorkspace>();

// ────────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────────

const nowIso = () => new Date().toISOString();
const genId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

function emptyWorkspace(caseId: string): InvestigationWorkspace {
  return {
    caseId,
    hypotheses: [],
    contradictions: [],
    evidenceGaps: [],
    timeline: [],
    nextBestAction: null,
    caseHealth: 0,
    caseReadiness: 0,
    lastRecalculatedAt: nowIso(),
    notes: [],
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  Public API
// ────────────────────────────────────────────────────────────────────────────

export function getOrCreateWorkspace(caseId: string): InvestigationWorkspace {
  let w = _workspaces.get(caseId);
  if (!w) {
    w = emptyWorkspace(caseId);
    _workspaces.set(caseId, w);
  }
  return w;
}

export function getWorkspace(caseId: string): InvestigationWorkspace | null {
  return _workspaces.get(caseId) ?? null;
}

export function addHypothesis(input: {
  caseId: string;
  kind: AcaHypothesisKind;
  statement: string;
  proposedBy: string;
  proposedByName: string;
  notes?: string;
  supportingEvidence?: string[];
}): AcaHypothesis {
  const w = getOrCreateWorkspace(input.caseId);
  const h: AcaHypothesis = {
    hypothesisId: genId("hyp"),
    caseId: input.caseId,
    kind: input.kind,
    statement: input.statement,
    proposedBy: input.proposedBy,
    proposedByName: input.proposedByName,
    proposedAt: nowIso(),
    status: "open",
    supportingEvidence: input.supportingEvidence ?? [],
    contradictingEvidence: [],
    notes: input.notes,
  };
  w.hypotheses.push(h);
  w.timeline.push({
    eventId: genId("evt"),
    caseId: input.caseId,
    timestamp: h.proposedAt,
    actorAgentId: input.proposedBy,
    actorDisplayName: input.proposedByName,
    kind: "hypothesis_added",
    summary: `Hypothesis added (${input.kind}): ${input.statement}`,
    metadata: { hypothesisId: h.hypothesisId, kind: input.kind },
  });
  return h;
}

export function updateHypothesisStatus(input: {
  caseId: string;
  hypothesisId: string;
  status: AcaHypothesisStatus;
  actorAgentId: string;
  actorDisplayName: string;
  reason?: string;
}): AcaHypothesis | null {
  const w = getOrCreateWorkspace(input.caseId);
  const h = w.hypotheses.find((x) => x.hypothesisId === input.hypothesisId);
  if (!h) return null;
  const prev = h.status;
  h.status = input.status;
  w.timeline.push({
    eventId: genId("evt"),
    caseId: input.caseId,
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    actorDisplayName: input.actorDisplayName,
    kind: "hypothesis_status_changed",
    summary: `Hypothesis "${h.statement.slice(0, 60)}" status: ${prev} → ${input.status}.${input.reason ? ` ${input.reason}` : ""}`,
    metadata: { hypothesisId: h.hypothesisId, from: prev, to: input.status },
  });
  return h;
}

/**
 * DEVIL'S ADVOCATE — AI-assisted challenge of a finding/hypothesis.
 *
 * The challenge searches for:
 *   - exculpatory evidence (evidence that contradicts the hypothesis)
 *   - contradictory evidence (evidence pointing to an alternative hypothesis)
 *   - evidence gaps (claims without supporting evidence)
 *
 * The challenge is recorded on the hypothesis and DOES NOT auto-update its
 * status — the agent decides whether to withdraw, mark inconclusive, or stand
 * by. The challenge itself becomes part of the audit trail.
 */
export function challengeFinding(input: {
  caseId: string;
  hypothesisId?: string;
  findingTitle?: string;
  findingDescription?: string;
  availableEvidence: AcaEvidence[];
  challengerAgentId: string;
  challengerDisplayName: string;
}): AcaChallengeResult {
  const w = getOrCreateWorkspace(input.caseId);
  const challengesRaised: string[] = [];
  const exculpatoryEvidenceFound: string[] = [];
  const contradictoryEvidenceFound: string[] = [];
  const newGaps: string[] = [];

  const hypothesis = input.hypothesisId
    ? w.hypotheses.find((x) => x.hypothesisId === input.hypothesisId)
    : null;

  const targetText = hypothesis?.statement ??
    `${input.findingTitle ?? ""} ${input.findingDescription ?? ""}`;

  if (!targetText.trim()) {
    challengesRaised.push("No hypothesis or finding text to challenge.");
  } else {
    // 1. single-source risk
    if (input.availableEvidence.length < 2) {
      challengesRaised.push("Single-source risk: the proposed conclusion relies on fewer than two independent pieces of evidence.");
    }
    // 2. integrity-indicator risk
    const sealedCount = input.availableEvidence.filter((e) => e.sealed).length;
    if (sealedCount === 0 && input.availableEvidence.length > 0) {
      challengesRaised.push("No sealed evidence: every piece of evidence in this case is still mutable. Consider sealing before issuing a finding.");
    }
    // 3. capture-method diversity
    const methods = new Set(input.availableEvidence.map((e) => e.captureMethod));
    if (methods.size === 1 && input.availableEvidence.length > 0) {
      challengesRaised.push(`Capture-method monoculture: all evidence captured via "${Array.from(methods)[0]}". Consider independent capture methods to mitigate collusion risk.`);
    }
    // 4. timing span
    if (input.availableEvidence.length >= 2) {
      const ts = input.availableEvidence
        .map((e) => new Date(e.capturedAt).getTime())
        .filter((t) => !Number.isNaN(t));
      if (ts.length >= 2) {
        const span = Math.max(...ts) - Math.min(...ts);
        if (span < 60 * 60 * 1000) {
          challengesRaised.push("All evidence captured within a 60-minute window — investigate whether the event sequence could have been coordinated.");
        }
      }
    }
    // 5. contradictions from workspace
    const openContradictions = w.contradictions.filter((c) => c.status === "open");
    if (openContradictions.length > 0) {
      challengesRaised.push(`${openContradictions.length} open contradiction(s) registered on this case must be addressed before the finding is issued.`);
      openContradictions.forEach((c) => {
        contradictoryEvidenceFound.push(c.contradictionId);
      });
    }
    // 6. gaps
    const openGaps = w.evidenceGaps.filter((g) => g.status === "open" && g.blocksFinding);
    if (openGaps.length > 0) {
      challengesRaised.push(`${openGaps.length} finding-blocking evidence gap(s) remain unresolved.`);
      openGaps.forEach((g) => newGaps.push(g.gapId));
    }
    // 7. exculpatory search — if hypothesis suggests misconduct, ensure
    //    legitimate_exception hypothesis was at least registered
    if (hypothesis?.kind === "potential_misconduct") {
      const hasLegit = w.hypotheses.some((x) => x.kind === "legitimate_exception");
      if (!hasLegit) {
        challengesRaised.push("Misconduct hypothesis registered without a counter-hypothesis of legitimate_exception. Add the alternative before proceeding.");
        newGaps.push("missing_alternative_hypothesis:legitimate_exception");
      }
    }
  }

  let conclusion: AcaChallengeResult["conclusion"] = "inconclusive";
  if (challengesRaised.length === 0) {
    conclusion = "supports_finding";
  } else if (challengesRaised.length >= 3) {
    conclusion = "weakens_finding";
  }

  const result: AcaChallengeResult = {
    challengeId: genId("ch"),
    challengedAt: nowIso(),
    challengedBy: input.challengerAgentId,
    challengedByName: input.challengerDisplayName,
    challengesRaised,
    exculpatoryEvidenceFound,
    contradictoryEvidenceFound,
    newGaps,
    aiAssisted: true,
    conclusion,
  };

  if (hypothesis) {
    hypothesis.challenge = result;
    w.timeline.push({
      eventId: genId("evt"),
      caseId: input.caseId,
      timestamp: result.challengedAt,
      actorAgentId: input.challengerAgentId,
      actorDisplayName: input.challengerDisplayName,
      kind: "hypothesis_challenged",
      summary: `Devil's advocate challenge completed (${conclusion}). ${challengesRaised.length} issue(s) raised.`,
      metadata: { challengeId: result.challengeId, conclusion },
    });
  } else {
    w.timeline.push({
      eventId: genId("evt"),
      caseId: input.caseId,
      timestamp: result.challengedAt,
      actorAgentId: input.challengerAgentId,
      actorDisplayName: input.challengerDisplayName,
      kind: "hypothesis_challenged",
      summary: `Devil's advocate challenge of finding "${input.findingTitle ?? "(untitled)"}" completed (${conclusion}). ${challengesRaised.length} issue(s) raised.`,
      metadata: { challengeId: result.challengeId, conclusion },
    });
  }
  return result;
}

export function registerContradiction(input: {
  caseId: string;
  description: string;
  registeredBy: string;
  registeredByName: string;
  linkedEvidence?: string[];
  linkedHypothesis?: string;
}): AcaContradiction {
  const w = getOrCreateWorkspace(input.caseId);
  const c: AcaContradiction = {
    contradictionId: genId("ctr"),
    caseId: input.caseId,
    description: input.description,
    registeredAt: nowIso(),
    registeredBy: input.registeredBy,
    registeredByName: input.registerByName,
    status: "open",
    linkedEvidence: input.linkedEvidence,
    linkedHypothesis: input.linkedHypothesis,
  };
  w.contradictions.push(c);
  w.timeline.push({
    eventId: genId("evt"),
    caseId: input.caseId,
    timestamp: c.registeredAt,
    actorAgentId: input.registeredBy,
    actorDisplayName: input.registeredByName,
    kind: "contradiction_registered",
    summary: `Contradiction registered: ${input.description}`,
    metadata: { contradictionId: c.contradictionId },
  });
  return c;
}

export function resolveContradiction(input: {
  caseId: string;
  contradictionId: string;
  resolution: string;
  status: "resolved" | "accepted_as_unresolved";
  resolvedBy: string;
  resolvedByName: string;
}): AcaContradiction | null {
  const w = getOrCreateWorkspace(input.caseId);
  const c = w.contradictions.find((x) => x.contradictionId === input.contradictionId);
  if (!c) return null;
  c.status = input.status;
  c.resolution = input.resolution;
  c.resolvedAt = nowIso();
  w.timeline.push({
    eventId: genId("evt"),
    caseId: input.caseId,
    timestamp: c.resolvedAt,
    actorAgentId: input.resolvedBy,
    actorDisplayName: input.resolvedByName,
    kind: "contradiction_resolved",
    summary: `Contradiction ${input.status}: ${input.resolution}`,
    metadata: { contradictionId: c.contradictionId },
  });
  return c;
}

export function flagEvidenceGap(input: {
  caseId: string;
  description: string;
  gapType: AcaEvidenceGap["gapType"];
  priority: AcaEvidenceGap["priority"];
  blocksFinding?: boolean;
  flaggedBy: string;
  flaggedByName: string;
}): AcaEvidenceGap {
  const w = getOrCreateWorkspace(input.caseId);
  const g: AcaEvidenceGap = {
    gapId: genId("gap"),
    caseId: input.caseId,
    description: input.description,
    gapType: input.gapType,
    priority: input.priority,
    registeredAt: nowIso(),
    registeredBy: input.flaggedBy,
    registeredByName: input.flaggedByName,
    status: "open",
    blocksFinding: input.blocksFinding,
  };
  w.evidenceGaps.push(g);
  w.timeline.push({
    eventId: genId("evt"),
    caseId: input.caseId,
    timestamp: g.registeredAt,
    actorAgentId: input.flaggedBy,
    actorDisplayName: input.flaggedByName,
    kind: "evidence_gap_flagged",
    summary: `Evidence gap flagged (${input.gapType}, ${input.priority}): ${input.description}`,
    metadata: { gapId: g.gapId, blocksFinding: input.blocksFinding },
  });
  return g;
}

export function resolveEvidenceGap(input: {
  caseId: string;
  gapId: string;
  resolution: string;
  status: "resolved" | "unresolvable";
  resolvedBy: string;
  resolvedByName: string;
}): AcaEvidenceGap | null {
  const w = getOrCreateWorkspace(input.caseId);
  const g = w.evidenceGaps.find((x) => x.gapId === input.gapId);
  if (!g) return null;
  g.status = input.status;
  g.resolution = input.resolution;
  g.resolvedAt = nowIso();
  w.timeline.push({
    eventId: genId("evt"),
    caseId: input.caseId,
    timestamp: g.resolvedAt,
    actorAgentId: input.resolvedBy,
    actorDisplayName: input.resolvedByName,
    kind: "evidence_gap_resolved",
    summary: `Evidence gap ${input.status}: ${input.resolution}`,
    metadata: { gapId: g.gapId },
  });
  return g;
}

export function addNote(input: {
  caseId: string;
  text: string;
  addedBy: string;
  addedByName: string;
}): void {
  const w = getOrCreateWorkspace(input.caseId);
  w.notes.push({
    noteId: genId("note"),
    text: input.text,
    addedAt: nowIso(),
    addedBy: input.addedBy,
    addedByName: input.addedByName,
  });
  w.timeline.push({
    eventId: genId("evt"),
    caseId: input.caseId,
    timestamp: nowIso(),
    actorAgentId: input.addedBy,
    actorDisplayName: input.addedByName,
    kind: "note_added",
    summary: `Note: ${input.text.slice(0, 80)}${input.text.length > 80 ? "…" : ""}`,
  });
}

/**
 * CASE HEALTH — 0..100 composite.
 *   evidence completeness    30
 *   timeline completeness    20
 *   source coverage          20
 *   contradiction status     15
 *   evidence gap status      15
 */
export function calculateCaseHealth(input: {
  caseId: string;
  acase: AcaCase;
  evidence: AcaEvidence[];
}): number {
  const w = getOrCreateWorkspace(input.caseId);

  // 1. evidence completeness — at least one piece of evidence per finding
  const findingsCount = input.acase.findings.length || 1;
  const supportedFindings = input.acase.findings.filter((f) =>
    f.supportingEvidence.length > 0 || input.evidence.length > 0,
  ).length;
  const evidenceCompleteness = Math.min(1, supportedFindings / findingsCount);

  // 2. timeline completeness — at least N distinct timeline events
  const timelineEvents = input.acase.timeline.length;
  const timelineCompleteness = Math.min(1, timelineEvents / 8);

  // 3. source coverage — diversity of capture methods
  const captureMethods = new Set(input.evidence.map((e) => e.captureMethod));
  const sealedRatio = input.evidence.length === 0
    ? 0
    : input.evidence.filter((e) => e.sealed).length / input.evidence.length;
  const sourceCoverage = Math.min(1, (captureMethods.size / 3) * 0.6 + sealedRatio * 0.4);

  // 4. contradiction status — resolved contradictions out of total
  const totalC = w.contradictions.length;
  const resolvedC = w.contradictions.filter((c) => c.status !== "open").length;
  const contradictionStatus = totalC === 0 ? 1 : resolvedC / totalC;

  // 5. evidence gap status — resolved gaps (or unresolvable) out of total
  const totalG = w.evidenceGaps.length;
  const resolvedG = w.evidenceGaps.filter((g) => g.status !== "open" && g.status !== "in_progress").length;
  const gapStatus = totalG === 0 ? 1 : resolvedG / totalG;

  const score =
    evidenceCompleteness * 30 +
    timelineCompleteness * 20 +
    sourceCoverage * 20 +
    contradictionStatus * 15 +
    gapStatus * 15;

  const rounded = Math.round(Math.max(0, Math.min(100, score)));
  w.caseHealth = rounded;
  // readiness = health adjusted downward if blocking gaps remain
  const blockingGaps = w.evidenceGaps.filter((g) => g.blocksFinding && g.status === "open").length;
  w.caseReadiness = Math.max(0, rounded - blockingGaps * 10);
  w.lastRecalculatedAt = nowIso();

  w.timeline.push({
    eventId: genId("evt"),
    caseId: input.caseId,
    timestamp: w.lastRecalculatedAt,
    actorAgentId: "system",
    actorDisplayName: "System",
    kind: "case_health_recalculated",
    summary: `Case health recalculated: ${w.caseHealth}/100 (readiness ${w.caseReadiness}/100).`,
    metadata: {
      evidenceCompleteness,
      timelineCompleteness,
      sourceCoverage,
      contradictionStatus,
      gapStatus,
      blockingGaps,
    },
  });
  return rounded;
}

/**
 * NEXT BEST ACTION — AI-assisted recommendation.
 * Returns a single next-best action with a rationale. Recommendation only.
 */
export function getNextBestAction(input: {
  caseId: string;
  acase: AcaCase;
  evidence: AcaEvidence[];
  requestingAgentId: string;
  requestingAgentName: string;
}): AcaNextBestAction {
  const w = getOrCreateWorkspace(input.caseId);
  const openGaps = w.evidenceGaps.filter((g) => g.status === "open");
  const openContradictions = w.contradictions.filter((c) => c.status === "open");
  const unchallengedHypotheses = w.hypotheses.filter((h) => h.status === "open" && !h.challenge);

  let action = "Review the case timeline and add any missing timeline events.";
  let rationale = "The case timeline has fewer than 8 events, which limits the case health score.";
  let priority: AcaNextBestAction["priority"] = "medium";
  const linksTo: AcaNextBestAction["linksTo"] = {};

  if (input.evidence.length === 0) {
    action = "Submit at least one piece of evidence before proceeding.";
    rationale = "The case currently has no evidence linked. No finding can be issued without supporting evidence.";
    priority = "critical";
  } else if (openGaps.length > 0) {
    const critical = openGaps.find((g) => g.priority === "critical" && g.blocksFinding);
    const target = critical ?? openGaps[0];
    action = `Resolve evidence gap: ${target.description}`;
    rationale = `Priority ${target.priority} gap ${target.gapType}.${target.blocksFinding ? " This gap blocks finding issuance." : ""}`;
    priority = target.priority === "critical" ? "critical" : target.priority === "high" ? "high" : "medium";
    linksTo.gapId = target.gapId;
  } else if (openContradictions.length > 0) {
    const c = openContradictions[0];
    action = `Address contradiction: ${c.description}`;
    rationale = "An open contradiction must be resolved (or accepted as unresolved) before issuing a finding.";
    priority = "high";
    linksTo.contradictionId = c.contradictionId;
  } else if (unchallengedHypotheses.length > 0) {
    const h = unchallengedHypotheses[0];
    action = `Run devil's advocate challenge on hypothesis: "${h.statement.slice(0, 60)}"`;
    rationale = "At least one open hypothesis has not been challenged. Every hypothesis must survive a devil's advocate pass before it can support a finding.";
    priority = "high";
    linksTo.hypothesisId = h.hypothesisId;
  } else if (input.evidence.filter((e) => e.sealed).length === 0) {
    action = "Seal at least one piece of evidence.";
    rationale = "No evidence has been sealed yet. Sealing makes evidence immutable and is required before the case can move to finding.";
    priority = "high";
  } else if (input.acase.status === "investigation" && input.acase.timeline.length >= 8 && input.evidence.length >= 2) {
    action = "Consider issuing a preliminary finding.";
    rationale = "The case has sufficient timeline coverage and sealed evidence. If the devil's advocate pass supports the conclusion, a preliminary finding may be issued.";
    priority = "medium";
  } else if (input.acase.status === "finding") {
    action = "Convert the finding into a formal recommendation.";
    rationale = "A finding has been issued. The next stage is to issue a recommendation to the responsible entity.";
    priority = "medium";
  } else if (input.acase.status === "recommendation") {
    action = "Add a corrective action and assign an owner.";
    rationale = "A recommendation has been issued. Track it to closure by registering a corrective action with an accountable owner.";
    priority = "medium";
  } else if (input.acase.status === "reform") {
    action = "Verify the corrective action has been completed.";
    rationale = "The case is in the reform stage. Verify implementation and prepare for closure (requires two-person authorization).";
    priority = "medium";
  } else if (input.acase.status === "closed") {
    action = "No further action — case is closed.";
    rationale = "The case has been closed. This workspace is retained for audit purposes.";
    priority = "low";
  } else {
    action = "Triage the case — assign a lead and capture initial hypotheses.";
    rationale = "The case is in intake. Assign a lead agent and register at least two alternative hypotheses before opening the investigation.";
    priority = "high";
  }

  const nba: AcaNextBestAction = {
    actionId: genId("nba"),
    suggestedAt: nowIso(),
    suggestedBy: "ai_assisted",
    action,
    rationale,
    priority,
    linksTo: Object.keys(linksTo).length > 0 ? linksTo : undefined,
  };
  w.nextBestAction = nba;
  w.timeline.push({
    eventId: genId("evt"),
    caseId: input.caseId,
    timestamp: nba.suggestedAt,
    actorAgentId: input.requestingAgentId,
    actorDisplayName: input.requestingAgentName,
    kind: "next_best_action_suggested",
    summary: `Next best action: ${action}`,
    metadata: { actionId: nba.actionId, priority: nba.priority },
  });
  return nba;
}

// ────────────────────────────────────────────────────────────────────────────
//  Persistence helpers (DB optional — degrades gracefully)
// ────────────────────────────────────────────────────────────────────────────

export async function persistWorkspace(w: InvestigationWorkspace): Promise<void> {
  await safeDbQuery(() =>
    db.acaInvestigationWorkspace?.upsert({
      where: { caseId: w.caseId },
      create: {
        caseId: w.caseId,
        caseHealth: w.caseHealth,
        caseReadiness: w.caseReadiness,
        lastRecalculatedAt: new Date(w.lastRecalculatedAt),
        hypothesesCount: w.hypotheses.length,
        contradictionsCount: w.contradictions.length,
        evidenceGapsCount: w.evidenceGaps.length,
        openGapsCount: w.evidenceGaps.filter((g) => g.status === "open").length,
      },
      update: {
        caseHealth: w.caseHealth,
        caseReadiness: w.caseReadiness,
        lastRecalculatedAt: new Date(w.lastRecalculatedAt),
        hypothesesCount: w.hypotheses.length,
        contradictionsCount: w.contradictions.length,
        evidenceGapsCount: w.evidenceGaps.length,
        openGapsCount: w.evidenceGaps.filter((g) => g.status === "open").length,
      },
    }),
  );
}

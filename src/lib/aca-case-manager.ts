// @ts-nocheck
/**
 * ACA Case Manager
 * ============================================================================
 * Formal case lifecycle for the Administrative Control Authority (ACA) layer.
 *
 * CASE ≠ SIGNAL (per CIRKLE-ACA-BLUEPRINT §1.2):
 *   - A SIGNAL is intelligence — a possible issue requiring review.
 *     Signals are produced by the Citizen Shield → ACA pipeline, inter-agency
 *     referrals, systemic-pattern detectors, and external sources.
 *   - A CASE is a formal ACA matter — opened only by a deliberate human
 *     decision (signal conversion) when the signal meets the threshold for
 *     case creation.
 *
 * CASE LIFECYCLE:
 *   signal → intake → investigation → review → finding → recommendation →
 *     reform → closed
 *
 * ACCESS CONTROL (case-based):
 *   - An agent sees only the cases assigned to them (or their department if
 *     they hold a department-scope permission).
 *   - Sensitive actions (case closure, evidence export, status rollback past
 *     the finding stage) REQUIRE TWO-PERSON AUTHORIZATION — a primary action
 *     plus a confirming action by a different agent with the appropriate
 *     permission.
 *
 * AUDIT:
 *   - Every status change, assignment, evidence link, finding, recommendation,
 *     corrective action, and closure is appended to `auditTrail` and to the
 *     case-level `timeline`.
 * ============================================================================
 */

import { db } from "@/lib/db";
import { safeDbQuery } from "@/lib/db-safe";

// ────────────────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────────────────

export type AcaCaseStatus =
  | "signal"          // not yet opened (shouldn't appear on AcaCase — see AcaSignal)
  | "intake"          // case opened, awaiting triage
  | "investigation"   // active investigation
  | "review"          // under supervisory review
  | "finding"         // preliminary finding issued
  | "recommendation"  // formal recommendation issued
  | "reform"          // reform / corrective action being tracked to closure
  | "closed";         // case closed (with or without finding)

export type AcaCasePriority = "low" | "medium" | "high" | "critical";

export type AcaTimelineEventKind =
  | "case_opened"
  | "status_changed"
  | "agent_assigned"
  | "agent_unassigned"
  | "evidence_added"
  | "evidence_sealed"
  | "evidence_derived"
  | "finding_issued"
  | "recommendation_issued"
  | "corrective_action_added"
  | "corrective_action_closed"
  | "hypothesis_added"
  | "hypothesis_challenged"
  | "evidence_gap_flagged"
  | "evidence_gap_resolved"
  | "two_person_initiated"
  | "two_person_confirmed"
  | "two_person_denied"
  | "case_closed"
  | "case_reopened"
  | "note_added";

export interface AcaTimelineEvent {
  eventId: string;
  caseId: string;
  kind: AcaTimelineEventKind;
  timestamp: string;     // ISO
  actorAgentId: string;
  actorDisplayName: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface AcaEvidenceRef {
  evidenceId: string;
  label: string;
  type: "video" | "audio" | "photo" | "document" | "digital";
  sealed: boolean;
  addedAt: string;
}

export interface AcaFinding {
  findingId: string;
  title: string;
  description: string;
  severity: "informational" | "minor" | "major" | "critical";
  issuedAt: string;
  issuedBy: string;
  issuedByName: string;
  supportingEvidence: string[];   // evidence ids
  challengedBy?: string;          // challenge entry id
}

export interface AcaRecommendation {
  recommendationId: string;
  title: string;
  description: string;
  targetEntity?: string;     // institution / department / system
  targetService?: string;
  dueDate?: string;
  issuedAt: string;
  issuedBy: string;
  status: "open" | "accepted" | "rejected" | "implemented" | "overdue";
}

export interface AcaCorrectiveAction {
  actionId: string;
  title: string;
  owner: string;          // entity / department responsible
  dueDate?: string;
  status: "pending" | "in_progress" | "completed" | "overdue" | "cancelled";
  linkedRecommendationId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  verificationNotes?: string;
}

export interface AcaAuditEntry {
  auditId: string;
  caseId: string;
  timestamp: string;
  actorAgentId: string;
  action: string;
  before?: string;
  after?: string;
  result: "success" | "denied" | "error";
  twoPersonPartnerAgentId?: string;  // set when the entry is part of two-person auth
}

export interface AcaCase {
  caseId: string;
  caseNumber: string;            // human-readable e.g. ACA-2025-C-00482
  title: string;
  description: string;
  status: AcaCaseStatus;
  priority: AcaCasePriority;
  assignedAgent: string | null;   // lead agent id
  assignedAgentName: string | null;
  supportingAgents: string[];
  createdFromSignal?: string;    // signal id, if converted
  relatedCases: string[];
  timeline: AcaTimelineEvent[];
  evidence: AcaEvidenceRef[];
  findings: AcaFinding[];
  recommendations: AcaRecommendation[];
  correctiveActions: AcaCorrectiveAction[];
  auditTrail: AcaAuditEntry[];
  department: string;
  service?: string;
  geography?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedBy?: string;
  closureReason?: string;
  twoPersonState?: {
    pendingAction: string;
    initiatedBy: string;
    initiatedAt: string;
    targetAction: string;
    confirmedBy?: string;
    confirmedAt?: string;
    deniedBy?: string;
    deniedAt?: string;
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────────

const nowIso = () => new Date().toISOString();
const genId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

const CASE_NUMBER_COUNTER_KEY = "aca:case:number";

function nextCaseNumber(): string {
  const year = new Date().getUTCFullYear();
  const counter = safeCounterIncrement(CASE_NUMBER_COUNTER_KEY);
  return `ACA-${year}-C-${String(counter).padStart(5, "0")}`;
}

// tiny in-process counter — DB-backed in production (sequence table)
let _caseCounter = 480;
function safeCounterIncrement(_key: string): number {
  return ++_caseCounter;
}

// ────────────────────────────────────────────────────────────────────────────
//  Two-person authorization
// ────────────────────────────────────────────────────────────────────────────

export type TwoPersonAction =
  | "case.close"
  | "case.reopen"
  | "evidence.export"
  | "case.rollback_to_investigation";

const TWO_PERSON_ACTIONS: TwoPersonAction[] = [
  "case.close",
  "case.reopen",
  "evidence.export",
  "case.rollback_to_investigation",
];

export function requiresTwoPerson(action: string): action is TwoPersonAction {
  return (TWO_PERSON_ACTIONS as string[]).includes(action);
}

// ────────────────────────────────────────────────────────────────────────────
//  Store (in-process cache for the building phase)
// ────────────────────────────────────────────────────────────────────────────

const _cases = new Map<string, AcaCase>();

// ────────────────────────────────────────────────────────────────────────────
//  Public API
// ────────────────────────────────────────────────────────────────────────────

export interface CreateCaseInput {
  title: string;
  description: string;
  priority?: AcaCasePriority;
  assignedAgent?: string;
  assignedAgentName?: string;
  supportingAgents?: string[];
  createdFromSignal?: string;
  department: string;
  service?: string;
  geography?: string;
  creatorAgentId: string;
  creatorDisplayName: string;
}

export function createCase(input: CreateCaseInput): AcaCase {
  const caseId = genId("case");
  const caseNumber = nextCaseNumber();
  const ts = nowIso();

  const c: AcaCase = {
    caseId,
    caseNumber,
    title: input.title,
    description: input.description,
    status: "intake",
    priority: input.priority ?? "medium",
    assignedAgent: input.assignedAgent ?? null,
    assignedAgentName: input.assignedAgentName ?? null,
    supportingAgents: input.supportingAgents ?? [],
    createdFromSignal: input.createdFromSignal,
    relatedCases: [],
    timeline: [{
      eventId: genId("evt"),
      caseId,
      kind: "case_opened",
      timestamp: ts,
      actorAgentId: input.creatorAgentId,
      actorDisplayName: input.creatorDisplayName,
      summary: `Case opened from ${input.createdFromSignal ? "converted signal" : "intake"}.`,
      metadata: input.createdFromSignal
        ? { sourceSignalId: input.createdFromSignal }
        : undefined,
    }],
    evidence: [],
    findings: [],
    recommendations: [],
    correctiveActions: [],
    auditTrail: [{
      auditId: genId("aud"),
      caseId,
      timestamp: ts,
      actorAgentId: input.creatorAgentId,
      action: "case.create",
      result: "success",
    }],
    department: input.department,
    service: input.service,
    geography: input.geography,
    createdAt: ts,
    updatedAt: ts,
  };
  _cases.set(caseId, c);
  return c;
}

export function getCase(caseId: string): AcaCase | null {
  return _cases.get(caseId) ?? null;
}

export function listCasesForAgent(agentId: string, opts?: { department?: string; departmentScope?: boolean }): AcaCase[] {
  const all = Array.from(_cases.values());
  return all.filter((c) => {
    if (c.assignedAgent === agentId) return true;
    if (c.supportingAgents.includes(agentId)) return true;
    if (opts?.departmentScope && opts.department && c.department === opts.department) {
      return true;
    }
    return false;
  });
}

export function listAllCases(): AcaCase[] {
  return Array.from(_cases.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function updateCaseStatus(input: {
  caseId: string;
  newStatus: AcaCaseStatus;
  actorAgentId: string;
  actorDisplayName: string;
  reason?: string;
}): AcaCase | null {
  const c = _cases.get(input.caseId);
  if (!c) return null;

  const prev = c.status;
  if (prev === input.newStatus) return c;

  // closure / reopen require two-person initiation
  if (requiresTwoPerson(`case.${input.newStatus === "closed" ? "close" : input.newStatus === "investigation" ? "rollback_to_investigation" : "noop"}`)) {
    // The caller must first initiate two-person; here we record the initiation
    // but do NOT transition yet.
    c.twoPersonState = {
      pendingAction: `case.${input.newStatus}`,
      initiatedBy: input.actorAgentId,
      initiatedAt: nowIso(),
      targetAction: input.newStatus,
    };
    c.auditTrail.push({
      auditId: genId("aud"),
      caseId: c.caseId,
      timestamp: nowIso(),
      actorAgentId: input.actorAgentId,
      action: "two_person.initiated",
      before: prev,
      after: input.newStatus,
      result: "success",
    });
    c.timeline.push({
      eventId: genId("evt"),
      caseId: c.caseId,
      kind: "two_person_initiated",
      timestamp: nowIso(),
      actorAgentId: input.actorAgentId,
      actorDisplayName: input.actorDisplayName,
      summary: `Two-person authorization requested for transition to "${input.newStatus}".`,
      metadata: { from: prev, to: input.newStatus },
    });
    c.updatedAt = nowIso();
    return c;
  }

  c.status = input.newStatus;
  c.timeline.push({
    eventId: genId("evt"),
    caseId: c.caseId,
    kind: "status_changed",
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    actorDisplayName: input.actorDisplayName,
    summary: `Status changed from "${prev}" to "${input.newStatus}".${input.reason ? ` Reason: ${input.reason}` : ""}`,
    metadata: { from: prev, to: input.newStatus },
  });
  c.auditTrail.push({
    auditId: genId("aud"),
    caseId: c.caseId,
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    action: "case.status_change",
    before: prev,
    after: input.newStatus,
    result: "success",
  });
  c.updatedAt = nowIso();
  return c;
}

export function assignAgent(input: {
  caseId: string;
  agentId: string;
  agentName: string;
  role: "lead" | "support" | "reviewer" | "supervisor";
  actorAgentId: string;
  actorDisplayName: string;
}): AcaCase | null {
  const c = _cases.get(input.caseId);
  if (!c) return null;

  if (input.role === "lead") {
    if (c.assignedAgent && c.assignedAgent !== input.agentId) {
      // demote previous lead to support
      if (!c.supportingAgents.includes(c.assignedAgent)) {
        c.supportingAgents.push(c.assignedAgent);
      }
      c.timeline.push({
        eventId: genId("evt"),
        caseId: c.caseId,
        kind: "agent_unassigned",
        timestamp: nowIso(),
        actorAgentId: input.actorAgentId,
        actorDisplayName: input.actorDisplayName,
        summary: `Previous lead ${c.assignedAgentName} demoted to support.`,
      });
    }
    c.assignedAgent = input.agentId;
    c.assignedAgentName = input.agentName;
  } else {
    if (!c.supportingAgents.includes(input.agentId)) {
      c.supportingAgents.push(input.agentId);
    }
  }
  c.timeline.push({
    eventId: genId("evt"),
    caseId: c.caseId,
    kind: "agent_assigned",
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    actorDisplayName: input.actorDisplayName,
    summary: `Agent ${input.agentName} assigned as ${input.role}.`,
    metadata: { role: input.role, agentId: input.agentId },
  });
  c.auditTrail.push({
    auditId: genId("aud"),
    caseId: c.caseId,
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    action: `case.assign.${input.role}`,
    after: input.agentId,
    result: "success",
  });
  c.updatedAt = nowIso();
  return c;
}

export function addEvidence(input: {
  caseId: string;
  evidenceId: string;
  label: string;
  type: "video" | "audio" | "photo" | "document" | "digital";
  sealed?: boolean;
  actorAgentId: string;
  actorDisplayName: string;
}): AcaCase | null {
  const c = _cases.get(input.caseId);
  if (!c) return null;
  c.evidence.push({
    evidenceId: input.evidenceId,
    label: input.label,
    type: input.type,
    sealed: input.sealed ?? false,
    addedAt: nowIso(),
  });
  c.timeline.push({
    eventId: genId("evt"),
    caseId: c.caseId,
    kind: input.sealed ? "evidence_sealed" : "evidence_added",
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    actorDisplayName: input.actorDisplayName,
    summary: `Evidence "${input.label}" (${input.type}) added.${input.sealed ? " Sealed — immutable." : ""}`,
    metadata: { evidenceId: input.evidenceId, type: input.type, sealed: input.sealed },
  });
  c.auditTrail.push({
    auditId: genId("aud"),
    caseId: c.caseId,
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    action: "case.evidence.add",
    after: input.evidenceId,
    result: "success",
  });
  c.updatedAt = nowIso();
  return c;
}

export function addFinding(input: {
  caseId: string;
  title: string;
  description: string;
  severity: AcaFinding["severity"];
  supportingEvidence?: string[];
  actorAgentId: string;
  actorDisplayName: string;
}): AcaCase | null {
  const c = _cases.get(input.caseId);
  if (!c) return null;
  const finding: AcaFinding = {
    findingId: genId("fnd"),
    title: input.title,
    description: input.description,
    severity: input.severity,
    issuedAt: nowIso(),
    issuedBy: input.actorAgentId,
    issuedByName: input.actorDisplayName,
    supportingEvidence: input.supportingEvidence ?? [],
  };
  c.findings.push(finding);
  c.timeline.push({
    eventId: genId("evt"),
    caseId: c.caseId,
    kind: "finding_issued",
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    actorDisplayName: input.actorDisplayName,
    summary: `Finding issued: "${input.title}" (${input.severity}).`,
    metadata: { findingId: finding.findingId },
  });
  if (c.status === "investigation" || c.status === "intake") {
    c.status = "finding";
  }
  c.auditTrail.push({
    auditId: genId("aud"),
    caseId: c.caseId,
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    action: "case.finding.issue",
    after: finding.findingId,
    result: "success",
  });
  c.updatedAt = nowIso();
  return c;
}

export function addRecommendation(input: {
  caseId: string;
  title: string;
  description: string;
  targetEntity?: string;
  targetService?: string;
  dueDate?: string;
  actorAgentId: string;
  actorDisplayName: string;
}): AcaCase | null {
  const c = _cases.get(input.caseId);
  if (!c) return null;
  const rec: AcaRecommendation = {
    recommendationId: genId("rec"),
    title: input.title,
    description: input.description,
    targetEntity: input.targetEntity,
    targetService: input.targetService,
    dueDate: input.dueDate,
    issuedAt: nowIso(),
    issuedBy: input.actorAgentId,
    status: "open",
  };
  c.recommendations.push(rec);
  c.timeline.push({
    eventId: genId("evt"),
    caseId: c.caseId,
    kind: "recommendation_issued",
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    actorDisplayName: input.actorDisplayName,
    summary: `Recommendation issued: "${input.title}".`,
    metadata: { recommendationId: rec.recommendationId },
  });
  if (c.status === "finding") c.status = "recommendation";
  c.auditTrail.push({
    auditId: genId("aud"),
    caseId: c.caseId,
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    action: "case.recommendation.issue",
    after: rec.recommendationId,
    result: "success",
  });
  c.updatedAt = nowIso();
  return c;
}

export function addCorrectiveAction(input: {
  caseId: string;
  title: string;
  owner: string;
  dueDate?: string;
  linkedRecommendationId?: string;
  actorAgentId: string;
  actorDisplayName: string;
}): AcaCase | null {
  const c = _cases.get(input.caseId);
  if (!c) return null;
  const a: AcaCorrectiveAction = {
    actionId: genId("ca"),
    title: input.title,
    owner: input.owner,
    dueDate: input.dueDate,
    status: "pending",
    linkedRecommendationId: input.linkedRecommendationId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  c.correctiveActions.push(a);
  c.timeline.push({
    eventId: genId("evt"),
    caseId: c.caseId,
    kind: "corrective_action_added",
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    actorDisplayName: input.actorDisplayName,
    summary: `Corrective action added: "${input.title}" (owner: ${input.owner}).`,
    metadata: { actionId: a.actionId },
  });
  if (c.status === "recommendation") c.status = "reform";
  c.auditTrail.push({
    auditId: genId("aud"),
    caseId: c.caseId,
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    action: "case.corrective_action.add",
    after: a.actionId,
    result: "success",
  });
  c.updatedAt = nowIso();
  return c;
}

export function initiateClosure(input: {
  caseId: string;
  reason: string;
  actorAgentId: string;
  actorDisplayName: string;
}): AcaCase | null {
  const c = _cases.get(input.caseId);
  if (!c) return null;
  c.twoPersonState = {
    pendingAction: "case.close",
    initiatedBy: input.actorAgentId,
    initiatedAt: nowIso(),
    targetAction: "closed",
  };
  c.auditTrail.push({
    auditId: genId("aud"),
    caseId: c.caseId,
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    action: "case.close.initiated",
    before: c.status,
    after: "closed",
    result: "success",
  });
  c.timeline.push({
    eventId: genId("evt"),
    caseId: c.caseId,
    kind: "two_person_initiated",
    timestamp: nowIso(),
    actorAgentId: input.actorAgentId,
    actorDisplayName: input.actorDisplayName,
    summary: `Closure requested by ${input.actorDisplayName}. Awaiting confirming officer.`,
    metadata: { reason: input.reason },
  });
  c.updatedAt = nowIso();
  return c;
}

export function confirmClosure(input: {
  caseId: string;
  confirmingAgentId: string;
  confirmingAgentName: string;
  reason: string;
}): AcaCase | null {
  const c = _cases.get(input.caseId);
  if (!c) return null;
  if (!c.twoPersonState || c.twoPersonState.pendingAction !== "case.close") return null;
  if (c.twoPersonState.initiatedBy === input.confirmingAgentId) {
    return null; // cannot self-confirm
  }
  c.status = "closed";
  c.closedAt = nowIso();
  c.closedBy = input.confirmingAgentId;
  c.closureReason = input.reason;
  c.twoPersonState.confirmedBy = input.confirmingAgentId;
  c.twoPersonState.confirmedAt = nowIso();
  c.timeline.push({
    eventId: genId("evt"),
    caseId: c.caseId,
    kind: "case_closed",
    timestamp: nowIso(),
    actorAgentId: input.confirmingAgentId,
    actorDisplayName: input.confirmingAgentName,
    summary: `Case closed. Reason: ${input.reason}. Confirmed by ${input.confirmingAgentName}.`,
  });
  c.auditTrail.push({
    auditId: genId("aud"),
    caseId: c.caseId,
    timestamp: nowIso(),
    actorAgentId: input.confirmingAgentId,
    action: "case.close.confirmed",
    before: "recommendation",
    after: "closed",
    result: "success",
    twoPersonPartnerAgentId: c.twoPersonState.initiatedBy,
  });
  c.updatedAt = nowIso();
  return c;
}

export function closeCase(input: {
  caseId: string;
  reason: string;
  initiatedBy: string;
  initiatedByName: string;
  confirmedBy?: string;
  confirmedByName?: string;
}): AcaCase | null {
  // Convenience wrapper: if `confirmedBy` provided and != `initiatedBy`, do the
  // full closure in one step. Otherwise, initiate two-person authorization.
  const c = _cases.get(input.caseId);
  if (!c) return null;
  const initiated = initiateClosure({
    caseId: input.caseId,
    reason: input.reason,
    actorAgentId: input.initiatedBy,
    actorDisplayName: input.initiatedByName,
  });
  if (!initiated) return null;
  if (input.confirmedBy && input.confirmedByName && input.confirmedBy !== input.initiatedBy) {
    return confirmClosure({
      caseId: input.caseId,
      confirmingAgentId: input.confirmedBy,
      confirmingAgentName: input.confirmedByName,
      reason: input.reason,
    });
  }
  return initiated;
}

export function relateCases(caseIdA: string, caseIdB: string): boolean {
  const a = _cases.get(caseIdA);
  const b = _cases.get(caseIdB);
  if (!a || !b) return false;
  if (!a.relatedCases.includes(caseIdB)) a.relatedCases.push(caseIdB);
  if (!b.relatedCases.includes(caseIdA)) b.relatedCases.push(caseIdA);
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
//  Persistence helpers (DB optional — degrades gracefully)
// ────────────────────────────────────────────────────────────────────────────

export async function persistCase(c: AcaCase): Promise<void> {
  await safeDbQuery(() =>
    db.acaCase?.upsert({
      where: { caseId: c.caseId },
      create: {
        caseId: c.caseId,
        caseNumber: c.caseNumber,
        title: c.title,
        description: c.description,
        status: c.status,
        priority: c.priority,
        assignedAgent: c.assignedAgent ?? null,
        department: c.department,
        service: c.service ?? null,
        geography: c.geography ?? null,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      },
      update: {
        status: c.status,
        priority: c.priority,
        assignedAgent: c.assignedAgent ?? null,
        updatedAt: new Date(c.updatedAt),
        closedAt: c.closedAt ? new Date(c.closedAt) : null,
      },
    }),
  );
}

export async function loadCaseFromDb(caseId: string): Promise<AcaCase | null> {
  const row = await safeDbQuery(() =>
    db.acaCase?.findUnique({ where: { caseId } }),
  );
  if (!row) return null;
  return {
    caseId: row.caseId,
    caseNumber: row.caseNumber,
    title: row.title,
    description: row.description,
    status: row.status as AcaCaseStatus,
    priority: row.priority as AcaCasePriority,
    assignedAgent: row.assignedAgent ?? null,
    assignedAgentName: null,
    supportingAgents: [],
    relatedCases: [],
    timeline: [],
    evidence: [],
    findings: [],
    recommendations: [],
    correctiveActions: [],
    auditTrail: [],
    department: row.department,
    service: row.service ?? undefined,
    geography: row.geography ?? undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    closedAt: row.closedAt instanceof Date ? row.closedAt.toISOString() : undefined,
  };
}

// @ts-nocheck
/**
 * AI Data Access Broker — Zero-Trust AI (§113)
 *
 * Blueprint rule:
 *   • AI CANNOT access the unrestricted ACA / institutional database.
 *   • Every AI access request must go through this broker.
 *   • The broker evaluates: institution, policy, case, clearance, purpose,
 *     requested data — and returns ONLY the authorized scope.
 *   • Every AI access is fully logged: model, version, policy, source records,
 *     retrieval set, timestamp, output, reviewer.
 *
 * This implements PART LXIII (AI Data Firewall) and PART LXIV (Government Data
 * Clean Room): the broker is the only doorway between any AI capability and
 * any institutional record.
 */

import { createHash } from "crypto";
import { safeDbQuery } from "@/lib/db-safe";
import { evaluatePolicy, getActiveRules } from "@/lib/policy-engine";

// ── Types ─────────────────────────────────────────────────────────────────

export interface AIAccessRequest {
  requestId: string;
  institution: string; // "aca" | "police" | "ems" | "courts" | ...
  aiModel: string; // model identifier
  modelVersion?: string;
  purpose: string; // "summarize", "translate", "redact", "transcribe", ...
  requestedData: string[]; // list of resource ids / scopes requested
  policy: string; // policy rule id under which the request is made
  authorizedScope: string[]; // filled by broker after evaluation
  caseRef?: string; // case id
  clearance?: string; // clearance level asserted by AI
  timestamp: string; // ISO
  requesterId: string;
}

export interface AIAccessDecision {
  request: AIAccessRequest;
  decision: "allow" | "deny" | "require_approval" | "escalate";
  authorizedScope: string[];
  deniedScope: string[];
  reason: string;
  evaluatedAt: string;
  policyEvaluations: Array<{
    ruleId: string;
    decision: string;
    reason: string;
  }>;
}

export interface AIAccessLogEntry {
  logId: string;
  requestId: string;
  institution: string;
  model: string;
  modelVersion?: string;
  policy: string;
  sourceRecords: string[];
  retrievalSet: string[];
  timestamp: string;
  output?: string;
  outputHash?: string;
  reviewer?: string;
  decision: "allow" | "deny" | "require_approval" | "escalate";
  purpose: string;
  caseRef?: string;
}

// ── In-memory stores ──────────────────────────────────────────────────────

const accessLog: AIAccessLogEntry[] = [];
const pendingApprovals: Map<string, AIAccessDecision> = new Map();

// Default institutional scoping rules — what categories of data each
// institution's AI may touch. Real per-institution policy is enforced through
// the PolicyEngine (PART LXXXIX — no hard-coded government assumptions).
const DEFAULT_INSTITUTIONAL_SCOPE: Record<
  string,
  { allowedCategories: string[]; requiresCaseRef: boolean }
> = {
  aca: {
    allowedCategories: [
      "evidence:metadata",
      "evidence:transcript",
      "evidence:redacted",
      "case:summary",
    ],
    requiresCaseRef: true,
  },
  police: {
    allowedCategories: ["evidence:metadata", "case:summary", "witness:statement"],
    requiresCaseRef: true,
  },
  courts: {
    allowedCategories: ["evidence:sealed", "case:docket"],
    requiresCaseRef: true,
  },
  ems: {
    allowedCategories: ["incident:summary"],
    requiresCaseRef: false,
  },
};

// Prohibited AI purposes — the broker NEVER authorizes these.
const PROHIBITED_PURPOSES = new Set([
  "declare_guilt",
  "impose_discipline",
  "unmask_identity",
  "destroy_evidence",
  "close_investigation",
  "authoritative_finding",
]);

function hash(input: string): string {
  return "sha256:" + createHash("sha256").update(input, "utf8").digest("hex");
}

function genRequestId(): string {
  return `AI-REQ-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Submit an AI access request. The broker evaluates it and returns the
 * authorized scope — the ONLY data the AI is permitted to access.
 */
export async function requestAccess(
  input: Omit<
    AIAccessRequest,
    "requestId" | "timestamp" | "authorizedScope"
  > & { requestId?: string; timestamp?: string },
): Promise<AIAccessDecision> {
  const requestId = input.requestId ?? genRequestId();
  const timestamp = input.timestamp ?? new Date().toISOString();

  const request: AIAccessRequest = {
    requestId,
    institution: input.institution,
    aiModel: input.aiModel,
    modelVersion: input.modelVersion,
    purpose: input.purpose,
    requestedData: input.requestedData,
    policy: input.policy,
    authorizedScope: [], // filled below
    caseRef: input.caseRef,
    clearance: input.clearance,
    timestamp,
    requesterId: input.requesterId,
  };

  return evaluateRequest(request);
}

/**
 * Evaluate a request — checks institution, policy, case, clearance, purpose,
 * and requested data. Returns the authorized scope only.
 */
export async function evaluateRequest(
  request: AIAccessRequest,
): Promise<AIAccessDecision> {
  const evaluatedAt = new Date().toISOString();
  const deniedScope: string[] = [];
  const authorizedScope: string[] = [];
  const policyEvaluations: AIAccessDecision["policyEvaluations"] = [];

  // 1. Prohibited purpose check — always deny.
  if (PROHIBITED_PURPOSES.has(request.purpose)) {
    const decision: AIAccessDecision = {
      request: { ...request, authorizedScope: [] },
      decision: "deny",
      authorizedScope: [],
      deniedScope: request.requestedData,
      reason: `Purpose "${request.purpose}" is prohibited — AI cannot independently declare guilt, impose discipline, unmask identities, destroy evidence, or close sensitive investigations (PART LXXXII).`,
      evaluatedAt,
      policyEvaluations,
    };
    logAccess(decision);
    return decision;
  }

  // 2. Institutional scope check.
  const scope = DEFAULT_INSTITUTIONAL_SCOPE[request.institution];
  if (!scope) {
    const decision: AIAccessDecision = {
      request: { ...request, authorizedScope: [] },
      decision: "deny",
      authorizedScope: [],
      deniedScope: request.requestedData,
      reason: `Institution "${request.institution}" is not registered with the broker. No AI access permitted.`,
      evaluatedAt,
      policyEvaluations,
    };
    logAccess(decision);
    return decision;
  }

  // 3. Case reference requirement.
  if (scope.requiresCaseRef && !request.caseRef) {
    const decision: AIAccessDecision = {
      request: { ...request, authorizedScope: [] },
      decision: "require_approval",
      authorizedScope: [],
      deniedScope: request.requestedData,
      reason: `Institution ${request.institution} requires an open case reference for AI access. No case provided.`,
      evaluatedAt,
      policyEvaluations,
    };
    logAccess(decision);
    pendingApprovals.set(request.requestId, decision);
    return decision;
  }

  // 4. Per-requested-data filter — only categories the institution may touch
  //    are authorized. Anything else is denied with a per-record reason.
  for (const resource of request.requestedData) {
    const category = extractCategory(resource);
    const allowed = scope.allowedCategories.some((c) =>
      category.startsWith(c.split(":")[0]),
    );
    if (allowed) {
      authorizedScope.push(resource);
    } else {
      deniedScope.push(resource);
    }
  }

  // 5. Policy engine evaluation — run active rules for the institution
  //    against the request. If any rule denies, escalate.
  let escalated = false;
  try {
    const activeRules = await getActiveRules({
      institution: request.institution,
      category: "ai",
    });
    for (const rule of activeRules) {
      const evaluation = await evaluatePolicy(rule.ruleId, {
        institution: request.institution,
        purpose: request.purpose,
        caseRef: request.caseRef,
        aiModel: request.aiModel,
        requestedData: request.requestedData,
      });
      policyEvaluations.push({
        ruleId: rule.ruleId,
        decision: evaluation.decision,
        reason: evaluation.reason,
      });
      if (evaluation.decision === "deny") {
        escalated = true;
        break;
      }
      if (evaluation.decision === "require_approval" || evaluation.decision === "escalate") {
        escalated = true;
      }
    }
  } catch {
    // Policy engine unavailable — fail CLOSED (no AI access without policy).
    const decision: AIAccessDecision = {
      request: { ...request, authorizedScope: [] },
      decision: "deny",
      authorizedScope: [],
      deniedScope: request.requestedData,
      reason: "Policy engine unavailable — failing closed. No AI access granted.",
      evaluatedAt,
      policyEvaluations,
    };
    logAccess(decision);
    return decision;
  }

  // 6. Final decision.
  let decision: AIAccessDecision;
  if (escalated) {
    decision = {
      request: { ...request, authorizedScope },
      decision: "escalate",
      authorizedScope: [], // escalated scope is NOT released until human approves
      deniedScope: [...deniedScope, ...authorizedScope],
      reason:
        "Active policy rule requires escalation. Authorized scope withheld pending human review.",
      evaluatedAt,
      policyEvaluations,
    };
    pendingApprovals.set(request.requestId, decision);
  } else if (authorizedScope.length === 0) {
    decision = {
      request: { ...request, authorizedScope: [] },
      decision: "deny",
      authorizedScope: [],
      deniedScope: request.requestedData,
      reason: "No requested data falls within the institution's authorized scope.",
      evaluatedAt,
      policyEvaluations,
    };
  } else {
    decision = {
      request: { ...request, authorizedScope },
      decision: "allow",
      authorizedScope,
      deniedScope,
      reason: `Authorized scope released for purpose "${request.purpose}" under policy ${request.policy}.`,
      evaluatedAt,
      policyEvaluations,
    };
  }

  logAccess(decision);
  return decision;
}

function extractCategory(resource: string): string {
  // resource format: "<category>:<id>" e.g. "evidence:metadata:EV-ACA-0001"
  const parts = resource.split(":");
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
  return parts[0] ?? "";
}

/**
 * Get ONLY the authorized scope for a previously-evaluated request. AI
 * consumers call this after requestAccess to retrieve the records they may
 * actually read.
 */
export function getAuthorizedScope(requestId: string): string[] {
  // Find the latest log entry for this request.
  for (let i = accessLog.length - 1; i >= 0; i--) {
    if (accessLog[i].requestId === requestId) {
      return accessLog[i].retrievalSet;
    }
  }
  return [];
}

/**
 * Record the output produced by the AI for a given request. Used for
 * reproducibility (§115) and source-citation enforcement (§116).
 */
export function recordAIOutput(
  requestId: string,
  output: string,
  reviewer?: string,
): void {
  const logId = `AI-LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const existing = accessLog.find((l) => l.requestId === requestId);
  if (!existing) {
    accessLog.push({
      logId,
      requestId,
      institution: "unknown",
      model: "unknown",
      policy: "unknown",
      sourceRecords: [],
      retrievalSet: [],
      timestamp: new Date().toISOString(),
      output,
      outputHash: hash(output),
      reviewer,
      decision: "allow",
      purpose: "post-hoc-record",
    });
    return;
  }
  existing.output = output;
  existing.outputHash = hash(output);
  existing.reviewer = reviewer ?? existing.reviewer;
}

/**
 * List recent AI access log entries.
 */
export function listAccessLog(limit = 50): AIAccessLogEntry[] {
  return accessLog.slice(-limit).reverse();
}

export function listPendingApprovals(): AIAccessDecision[] {
  return Array.from(pendingApprovals.values());
}

export function approvePendingRequest(
  requestId: string,
  approver: string,
): AIAccessDecision | undefined {
  const pending = pendingApprovals.get(requestId);
  if (!pending) return undefined;
  pending.decision = "allow";
  pending.reason += ` Approved by ${approver} on ${new Date().toISOString()}.`;
  pendingApprovals.delete(requestId);
  logAccess(pending);
  return pending;
}

// ── Internal: log every access to in-memory + best-effort AuditRecord ──────

function logAccess(decision: AIAccessDecision): void {
  const logId = `AI-LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entry: AIAccessLogEntry = {
    logId,
    requestId: decision.request.requestId,
    institution: decision.request.institution,
    model: decision.request.aiModel,
    modelVersion: decision.request.modelVersion,
    policy: decision.request.policy,
    sourceRecords: decision.request.requestedData,
    retrievalSet: decision.authorizedScope,
    timestamp: decision.evaluatedAt,
    decision: decision.decision,
    purpose: decision.request.purpose,
    caseRef: decision.request.caseRef,
  };
  accessLog.push(entry);

  void safeDbQuery(async () => {
    const { db } = await import("@/lib/db");
    const prev = await db.auditRecord.findFirst({
      where: { target: "ai-broker" },
      orderBy: { timestamp: "desc" },
    });
    const previousHash = prev?.hash ?? "genesis";
    const entryHash = hash(logId + decision.request.requestId + decision.evaluatedAt + previousHash);
    await db.auditRecord.create({
      data: {
        auditId: logId,
        eventType: `ai:access:${decision.decision}`,
        target: "ai-broker",
        decision: decision.decision,
        description: `AI ${decision.request.aiModel} (${decision.request.institution}) — ${decision.decision}`,
        data: entry as any,
        hash: entryHash,
        previousHash,
      },
    });
  });
}

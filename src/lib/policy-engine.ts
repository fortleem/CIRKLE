// @ts-nocheck
/**
 * Policy Engine — PART LXXXIX
 *
 * Blueprint rule:
 *   • Everything government-facing is policy-configurable: institution, region,
 *     service, law, authority, access, retention, escalation, emergency,
 *     disclosure, AI, evidence.
 *   • No hard-coded government assumptions — every rule is configuration with
 *     explicit authorization.
 *   • `evaluatePolicy()` returns a decision: allow | deny | require_approval |
 *     escalate.
 *
 * Policy rules are evaluated by the AI Data Access Broker, the evidence
 * immutability layer, and any institutional workflow that needs an
 * authoritative decision before acting.
 */

import { createHash } from "crypto";
import { safeDbQuery } from "@/lib/db-safe";

// ── Types ─────────────────────────────────────────────────────────────────

export type PolicyCategory =
  | "access"
  | "retention"
  | "escalation"
  | "emergency"
  | "disclosure"
  | "ai"
  | "evidence";

export type PolicyAction =
  | "allow"
  | "deny"
  | "require_approval"
  | "escalate"
  | "redact"
  | "anonymize"
  | "log_only";

export interface PolicyRule {
  ruleId: string;
  institution: string; // "aca" | "police" | "courts" | "global" | ...
  region?: string; // optional regional scope
  service?: string; // optional service scope (e.g. "evidence", "casework")
  name: string;
  description?: string;
  category: PolicyCategory;
  condition: {
    field: string; // e.g. "purpose", "clearance", "caseRef", "aiModel"
    op: "eq" | "neq" | "in" | "not_in" | "exists" | "missing";
    value?: unknown;
  };
  action: PolicyAction;
  authority?: string; // who issued / authorized this rule
  effectiveDate: string; // ISO
  expiryDate?: string;
  status: "active" | "superseded" | "retired" | "draft";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PolicyEvaluation {
  ruleId: string;
  input: Record<string, unknown>;
  decision: PolicyAction;
  reason: string;
  evaluatedAt: string;
  matchedRule?: PolicyRule;
}

// ── In-memory store ───────────────────────────────────────────────────────

const rules = new Map<string, PolicyRule>();

// Seed a set of canonical rules so the engine is non-trivial on first load.
const SEED_RULES: Array<Omit<PolicyRule, "createdAt" | "updatedAt" | "createdBy">> = [
  {
    ruleId: "POL-ACA-001",
    institution: "aca",
    name: "AI may not declare guilt",
    description:
      "AI evidence analysis must NEVER produce a finding of guilt. All findings require human case-officer review.",
    category: "ai",
    condition: { field: "purpose", op: "eq", value: "declare_guilt" },
    action: "deny",
    authority: "ACA Oversight Council",
    effectiveDate: "2024-01-01T00:00:00.000Z",
    status: "active",
  },
  {
    ruleId: "POL-ACA-002",
    institution: "aca",
    name: "AI may not unmask protected identities",
    description:
      "AI may not independently unmask protected witness / informant identities (§CVI).",
    category: "ai",
    condition: { field: "purpose", op: "eq", value: "unmask_identity" },
    action: "deny",
    authority: "ACA Oversight Council",
    effectiveDate: "2024-01-01T00:00:00.000Z",
    status: "active",
  },
  {
    ruleId: "POL-ACA-003",
    institution: "aca",
    name: "Sealed evidence cannot be deleted",
    description:
      "Any request to delete / overwrite sealed evidence is denied (§61).",
    category: "evidence",
    condition: { field: "action", op: "eq", value: "delete_sealed" },
    action: "deny",
    authority: "ACA Evidence Integrity Office",
    effectiveDate: "2024-01-01T00:00:00.000Z",
    status: "active",
  },
  {
    ruleId: "POL-ACA-004",
    institution: "aca",
    name: "AI transcription requires case-officer approval",
    description:
      "AI transcription of evidence audio requires case-officer approval before being released to analysis.",
    category: "ai",
    condition: { field: "purpose", op: "eq", value: "transcribe" },
    action: "require_approval",
    authority: "ACA Case Operations",
    effectiveDate: "2024-01-01T00:00:00.000Z",
    status: "active",
  },
  {
    ruleId: "POL-ACA-005",
    institution: "aca",
    name: "Cross-institution disclosure requires escalation",
    description:
      "Any disclosure of ACA evidence to another institution requires escalation to the Disclosure Authority.",
    category: "disclosure",
    condition: { field: "purpose", op: "eq", value: "cross_institution_disclosure" },
    action: "escalate",
    authority: "ACA Disclosure Authority",
    effectiveDate: "2024-01-01T00:00:00.000Z",
    status: "active",
  },
  {
    ruleId: "POL-ACA-006",
    institution: "aca",
    name: "Emergency override — supervisor break-glass",
    description:
      "Emergency override permitted for sworn supervisors; logged and post-reviewed.",
    category: "emergency",
    condition: { field: "clearance", op: "eq", value: "supervisor" },
    action: "allow",
    authority: "ACA Director",
    effectiveDate: "2024-01-01T00:00:00.000Z",
    status: "active",
  },
  {
    ruleId: "POL-GLOBAL-001",
    institution: "global",
    name: "Default deny — no rule matched",
    description:
      "Default-deny posture: any action without an explicit allow rule is denied.",
    category: "access",
    condition: { field: "*", op: "exists" },
    action: "deny",
    authority: "Platform Security",
    effectiveDate: "2024-01-01T00:00:00.000Z",
    status: "active",
  },
  {
    ruleId: "POL-ACA-007",
    institution: "aca",
    name: "Retention: 7-year sealed evidence retention",
    description:
      "Sealed ACA evidence must be retained for a minimum of 7 years from seal date.",
    category: "retention",
    condition: { field: "evidence.vault", op: "eq", value: "preservation" },
    action: "allow",
    authority: "ACA Records Office",
    effectiveDate: "2024-01-01T00:00:00.000Z",
    status: "active",
  },
];

function seedIfEmpty() {
  if (rules.size > 0) return;
  const now = new Date().toISOString();
  for (const r of SEED_RULES) {
    rules.set(r.ruleId, {
      ...r,
      createdAt: now,
      updatedAt: now,
      createdBy: "system-seed",
    });
  }
}

function hash(input: string): string {
  return "sha256:" + createHash("sha256").update(input, "utf8").digest("hex");
}

function genRuleId(): string {
  return `POL-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

// ── Public API ────────────────────────────────────────────────────────────

export interface CreateRuleInput {
  institution: string;
  region?: string;
  service?: string;
  name: string;
  description?: string;
  category: PolicyCategory;
  condition: PolicyRule["condition"];
  action: PolicyAction;
  authority?: string;
  effectiveDate?: string;
  expiryDate?: string;
  createdBy: string;
}

export async function createRule(input: CreateRuleInput): Promise<PolicyRule> {
  seedIfEmpty();
  const now = new Date().toISOString();
  const rule: PolicyRule = {
    ruleId: genRuleId(),
    institution: input.institution,
    region: input.region,
    service: input.service,
    name: input.name,
    description: input.description,
    category: input.category,
    condition: input.condition,
    action: input.action,
    authority: input.authority,
    effectiveDate: input.effectiveDate ?? now,
    expiryDate: input.expiryDate,
    status: "active",
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  };
  rules.set(rule.ruleId, rule);

  void safeDbQuery(async () => {
    const { db } = await import("@/lib/db");
    const prev = await db.auditRecord.findFirst({
      where: { target: "policy-engine" },
      orderBy: { timestamp: "desc" },
    });
    const previousHash = prev?.hash ?? "genesis";
    const entryHash = hash(rule.ruleId + "create" + now + previousHash);
    await db.auditRecord.create({
      data: {
        auditId: `policy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        eventType: "policy:rule:created",
        target: "policy-engine",
        decision: rule.action,
        description: `Policy rule created: ${rule.name} (${rule.ruleId})`,
        data: rule as any,
        hash: entryHash,
        previousHash,
      },
    });
  });

  return rule;
}

/**
 * Evaluate a single policy rule against an input. Returns the decision.
 */
export async function evaluatePolicy(
  ruleId: string,
  input: Record<string, unknown>,
): Promise<PolicyEvaluation> {
  seedIfEmpty();
  const rule = rules.get(ruleId);
  const evaluatedAt = new Date().toISOString();
  if (!rule) {
    return {
      ruleId,
      input,
      decision: "deny",
      reason: `Rule not found: ${ruleId}. Default-deny.`,
      evaluatedAt,
    };
  }
  if (rule.status !== "active") {
    return {
      ruleId,
      input,
      decision: "deny",
      reason: `Rule ${rule.ruleId} is not active (status=${rule.status}).`,
      evaluatedAt,
      matchedRule: rule,
    };
  }
  // Check effective / expiry dates.
  const now = Date.now();
  const eff = new Date(rule.effectiveDate).getTime();
  if (now < eff) {
    return {
      ruleId,
      input,
      decision: "deny",
      reason: `Rule ${rule.ruleId} not yet effective (effective ${rule.effectiveDate}).`,
      evaluatedAt,
      matchedRule: rule,
    };
  }
  if (rule.expiryDate && now > new Date(rule.expiryDate).getTime()) {
    return {
      ruleId,
      input,
      decision: "deny",
      reason: `Rule ${rule.ruleId} expired (${rule.expiryDate}).`,
      evaluatedAt,
      matchedRule: rule,
    };
  }

  const matched = matchCondition(rule.condition, input);
  if (matched) {
    return {
      ruleId,
      input,
      decision: rule.action,
      reason: `Matched rule "${rule.name}" — action: ${rule.action}.`,
      evaluatedAt,
      matchedRule: rule,
    };
  }
  return {
    ruleId,
    input,
    decision: "allow", // not matched => rule does not constrain this input
    reason: `Input did not match condition for rule "${rule.name}".`,
    evaluatedAt,
    matchedRule: rule,
  };
}

function matchCondition(
  cond: PolicyRule["condition"],
  input: Record<string, unknown>,
): boolean {
  if (cond.field === "*") {
    return cond.op === "exists"; // wildcard — matches if input has any field
  }
  const value = input[cond.field];
  switch (cond.op) {
    case "eq":
      return value === cond.value;
    case "neq":
      return value !== cond.value;
    case "in":
      return Array.isArray(cond.value) && cond.value.includes(value);
    case "not_in":
      return Array.isArray(cond.value) && !cond.value.includes(value);
    case "exists":
      return value !== undefined && value !== null;
    case "missing":
      return value === undefined || value === null;
    default:
      return false;
  }
}

/**
 * Evaluate ALL active rules for a given institution / category against an
 * input. Returns the most restrictive decision (deny > escalate >
 * require_approval > allow).
 *
 * This is the canonical "policy decision" used by the broker and other
 * institutional callers.
 */
export async function evaluatePolicySet(
  input: Record<string, unknown> & { institution?: string; category?: PolicyCategory },
): Promise<{
  decision: PolicyAction;
  reason: string;
  evaluations: PolicyEvaluation[];
  evaluatedAt: string;
}> {
  seedIfEmpty();
  const evaluatedAt = new Date().toISOString();
  const evaluations: PolicyEvaluation[] = [];
  const precedence: Record<PolicyAction, number> = {
    deny: 0,
    escalate: 1,
    require_approval: 2,
    redact: 3,
    anonymize: 4,
    log_only: 5,
    allow: 6,
  };
  let finalDecision: PolicyAction = "allow";
  let finalReason = "No active rule constrained this input — default allow.";
  for (const rule of rules.values()) {
    if (rule.status !== "active") continue;
    if (input.institution && rule.institution !== "global" && rule.institution !== input.institution) {
      continue;
    }
    if (input.category && rule.category !== input.category) continue;
    const ev = await evaluatePolicy(rule.ruleId, input);
    // Only count matched rules (decision != "allow" because rule didn't match).
    if (ev.matchedRule && ev.decision !== "allow") {
      evaluations.push(ev);
      if (precedence[ev.decision] < precedence[finalDecision]) {
        finalDecision = ev.decision;
        finalReason = ev.reason;
      }
    } else if (ev.matchedRule && ev.decision === "allow") {
      // matched but allow
      evaluations.push(ev);
    }
  }
  return { decision: finalDecision, reason: finalReason, evaluations, evaluatedAt };
}

export async function getActiveRules(filter?: {
  institution?: string;
  category?: PolicyCategory;
}): Promise<PolicyRule[]> {
  seedIfEmpty();
  let list = Array.from(rules.values()).filter((r) => r.status === "active");
  if (filter?.institution) {
    list = list.filter(
      (r) => r.institution === filter.institution || r.institution === "global",
    );
  }
  if (filter?.category) {
    list = list.filter((r) => r.category === filter.category);
  }
  return list;
}

export function listAllRules(): PolicyRule[] {
  seedIfEmpty();
  return Array.from(rules.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function updateRule(
  ruleId: string,
  patch: Partial<PolicyRule>,
  updatedBy: string,
): Promise<PolicyRule> {
  seedIfEmpty();
  const existing = rules.get(ruleId);
  if (!existing) {
    throw new Error(`Policy rule not found: ${ruleId}`);
  }
  const updated: PolicyRule = {
    ...existing,
    ...patch,
    ruleId: existing.ruleId, // immutable
    createdAt: existing.createdAt, // immutable
    createdBy: existing.createdBy, // immutable
    updatedAt: new Date().toISOString(),
  };
  rules.set(ruleId, updated);

  void safeDbQuery(async () => {
    const { db } = await import("@/lib/db");
    const prev = await db.auditRecord.findFirst({
      where: { target: "policy-engine" },
      orderBy: { timestamp: "desc" },
    });
    const previousHash = prev?.hash ?? "genesis";
    const entryHash = hash(ruleId + "update" + updated.updatedAt + previousHash);
    await db.auditRecord.create({
      data: {
        auditId: `policy-update-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        eventType: "policy:rule:updated",
        target: "policy-engine",
        decision: "ok",
        description: `Policy rule ${ruleId} updated by ${updatedBy}`,
        data: { patch, updatedBy } as any,
        hash: entryHash,
        previousHash,
      },
    });
  });

  return updated;
}

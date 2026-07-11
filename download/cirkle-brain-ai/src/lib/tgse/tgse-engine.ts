/**
 * CIRKLE Brain AI — Trust, Governance & Safety Engine (TGSE)
 * ============================================================================
 *
 * Phase 9 — Trust, Governance & Safety Engine
 *
 * TGSE is the constitutional guardian of CIRKLE Brain AI. It validates,
 * governs, authorizes, monitors, and audits every AI-generated output.
 *
 * TGSE does NOT reason, recommend, orchestrate, or execute. It ensures every
 * AI action is safe, trusted, governed, explainable, auditable,
 * permission-aware, privacy-preserving, policy-compliant, region-aware,
 * enterprise-ready, and human-supervised where required.
 *
 * Governance domains: CRIE, IRDE, UOB, TEE, LIEE, CIE.
 * ============================================================================
 */

import type { GovernanceDecision, GovernanceDecisionType, GovernanceTarget, TGSEStatus } from "./types";
import { TGSE_SCHEMA_VERSION } from "./types";
import { globalPolicyEngine } from "./policy-engine";
import { globalTrustEngine } from "./trust-engine";
import { globalComplianceEngine } from "./compliance-engine";
import { globalAISafetyFramework } from "./ai-safety";
import { globalRiskAssessmentEngine } from "./risk-engine";
import { globalHumanApprovalFramework } from "./approval-framework";
import { globalExplainabilityEngine } from "./explainability";
import { globalAuditEngine } from "./audit-engine";
import { seedPolicies, seedComplianceProfiles, seedTrustScores } from "./seed-data";

let seeded = false;

export function seedTGSE(): void {
  if (seeded) return;
  for (const p of seedPolicies) globalPolicyEngine.register(p);
  for (const c of seedComplianceProfiles) globalComplianceEngine.register(c);
  for (const t of seedTrustScores) globalTrustEngine.set(t);
  seeded = true;
}

export function ensureTGSESeeded(): void {
  if (!seeded) seedTGSE();
}

// ── TGSE Engine ──────────────────────────────────────────────────────────

export class TGSEEngine {
  /**
   * Validate an AI action through the full governance pipeline:
   *   1. Policy evaluation
   *   2. Permission validation
   *   3. Risk assessment
   *   4. AI safety checks
   *   5. Compliance verification
   *   6. Trust score check
   *   7. Human approval (if required)
   *   8. Explainability generation
   *   9. Audit recording
   */
  validate(params: {
    target: GovernanceTarget;
    action: string;
    country?: string;
    userPermissions: string[];
    consentScope: string[];
    amount?: number;
    confidence?: number;
    capabilityId?: string;
    trustEntityId?: string;
    trustEntityType?: import("./types").TrustEntityType;
    text?: string;
    workflow?: { steps: { capabilityId: string; inputs: Record<string, unknown> }[] };
    outputData?: Record<string, unknown>;
    inputData?: Record<string, unknown>;
    requestedPermissions?: string[];
    impact?: "low" | "medium" | "high" | "critical";
    actionContext?: Record<string, unknown>;
  }): GovernanceDecision {
    ensureTGSESeeded();
    const { target, action, country, userPermissions, consentScope } = params;
    const now = new Date().toISOString();

    // 1. Policy evaluation.
    const policyResult = globalPolicyEngine.evaluate(target, {
      country,
      userPermissions,
      consentScope,
      amount: params.amount,
      trustScore: params.trustEntityId && params.trustEntityType
        ? globalTrustEngine.get(params.trustEntityType, params.trustEntityId)?.score
        : undefined,
      riskLevel: undefined, // filled after risk assessment
    });

    // 2. Permission validation.
    const permissionsChecked = (params.requestedPermissions || []).map((p) => ({
      permission: p,
      satisfied: userPermissions.includes(p),
    }));

    // 3. Risk assessment.
    const riskAssessment = globalRiskAssessmentEngine.assess(target, {
      amount: params.amount,
      country,
      consentGranted: consentScope.length > 0,
      confidence: params.confidence,
      capabilityId: params.capabilityId,
      userPermissions,
      requestedPermissions: params.requestedPermissions,
      impact: params.impact,
    });

    // 4. AI safety checks.
    const safetyResults = globalAISafetyFramework.check({
      text: params.text,
      workflow: params.workflow,
      confidence: params.confidence,
      capabilityId: params.capabilityId,
      requestedPermissions: params.requestedPermissions,
      userPermissions,
      outputData: params.outputData,
      inputData: params.inputData,
      impact: params.impact,
    });

    // 5. Compliance verification.
    const complianceResults = globalComplianceEngine.evaluate(target, {
      country,
      action,
      data: { ...params.actionContext, consentGranted: consentScope.length > 0 },
    });

    // 6. Trust score check (if entity specified).
    let trustOk = true;
    if (params.trustEntityId && params.trustEntityType) {
      trustOk = globalTrustEngine.isTrusted(params.trustEntityType, params.trustEntityId, 50);
    }

    // 7. Determine decision.
    let decision: GovernanceDecisionType = "approve";
    let requiresHumanApproval = false;
    let approvalRequestId: string | undefined;

    // Block if any safety check failed critically.
    const criticalSafetyFail = safetyResults.some((s) => !s.passed && s.recommendedAction === "block");
    if (criticalSafetyFail) {
      decision = "deny";
    } else if (policyResult.enforcement === "block" && !policyResult.passed) {
      decision = "deny";
    } else if (!riskAssessment.safeToProceed) {
      decision = "deny";
    } else if (!trustOk) {
      decision = "warn";
    } else if (policyResult.enforcement === "require-approval" && !policyResult.passed) {
      decision = "require-approval";
      requiresHumanApproval = true;
    } else if (safetyResults.some((s) => s.recommendedAction === "require-approval")) {
      decision = "require-approval";
      requiresHumanApproval = true;
    } else if (riskAssessment.overallLevel === "high" || params.impact === "critical") {
      decision = "require-approval";
      requiresHumanApproval = true;
    } else if (policyResult.enforcement === "warn" && !policyResult.passed) {
      decision = "warn";
    }

    // Create approval request if needed.
    if (requiresHumanApproval) {
      const trigger = this.deriveApprovalTrigger(params, riskAssessment.overallLevel);
      const approval = globalHumanApprovalFramework.request({
        trigger,
        target,
        actionContext: params.actionContext || {},
        requiredApproverRole: params.impact === "critical" ? "executive" : "admin",
        escalationChain: params.impact === "critical" ? ["admin", "executive"] : [],
        expiresInSeconds: 86400, // 24h
      });
      approvalRequestId = approval.requestId;
    }

    // 8. Explainability.
    const explanation = globalExplainabilityEngine.explain({
      decision,
      target,
      policyResult,
      riskAssessment,
      safetyResults,
      complianceResults,
      approvalRequest: approvalRequestId ? globalHumanApprovalFramework.get(approvalRequestId) || undefined : undefined,
      permissionsChecked,
    });

    // 9. Audit.
    globalAuditEngine.record({
      eventType: "governance-decision",
      target,
      decision,
      description: `Governance decision for ${target}: ${decision} — ${explanation.summary}`,
      data: {
        action,
        country,
        policyResult: { passed: policyResult.passed, violations: policyResult.violations },
        riskLevel: riskAssessment.overallLevel,
        safetyFailures: safetyResults.filter((s) => !s.passed).map((s) => s.checkType),
        complianceViolations: complianceResults.filter((c) => !c.compliant).map((c) => c.profileId),
        approvalRequestId,
      },
    });

    return {
      decisionId: `gov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      target,
      decision,
      timestamp: now,
      policiesEvaluated: policyResult.policiesEvaluated,
      permissionsChecked,
      risksIdentified: riskAssessment.risks.map((r) => ({ type: r.type, level: r.level, description: r.description })),
      requiresHumanApproval,
      approvalRequestId,
      explanation,
      confidence: decision === "approve" ? 0.9 : decision === "deny" ? 0.95 : 0.7,
      actionContext: params.actionContext || {},
    };
  }

  private deriveApprovalTrigger(
    params: { amount?: number; target: GovernanceTarget; impact?: string },
    riskLevel: string,
  ): import("./types").ApprovalTrigger {
    if (params.amount && params.amount > 10000) return "high-value-payment";
    if (params.target === "tee" && riskLevel === "high") return "high-risk-ai-action";
    if (params.impact === "critical") return "high-risk-ai-action";
    return "policy-required";
  }

  // ── Sub-engine accessors ──────────────────────────────────────────────

  get policy() { ensureTGSESeeded(); return globalPolicyEngine; }
  get trust() { ensureTGSESeeded(); return globalTrustEngine; }
  get compliance() { ensureTGSESeeded(); return globalComplianceEngine; }
  get safety() { return globalAISafetyFramework; }
  get risk() { return globalRiskAssessmentEngine; }
  get approval() { return globalHumanApprovalFramework; }
  get explainability() { return globalExplainabilityEngine; }
  get audit() { return globalAuditEngine; }

  /**
   * TGSE status + observability.
   */
  status(): TGSEStatus {
    ensureTGSESeeded();
    return {
      phase: "9",
      name: "Trust, Governance & Safety Engine",
      status: "operational",
      policiesActive: globalPolicyEngine.getStats().active,
      complianceProfiles: globalComplianceEngine.getStats().active,
      trustEntities: globalTrustEngine.getStats().total,
      auditRecords: globalAuditEngine.getStats().total,
      pendingApprovals: globalHumanApprovalFramework.getStats().pending,
      governanceDecisions: globalAuditEngine.getByEvent("governance-decision").length,
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalTGSEEngine = new TGSEEngine();

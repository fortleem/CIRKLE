/**
 * CIRKLE Brain AI — TGSE Explainability Engine
 * ============================================================================
 * Generates structured explanations describing:
 *   - Why an action was approved
 *   - Why an action was denied
 *   - Which policies were evaluated
 *   - Which permissions were required
 *   - Which risks were identified
 *   - Which approvals were required
 * ============================================================================
 */

import type { GovernanceExplanation, GovernanceDecisionType } from "./types";
import type { PolicyEvaluationResult } from "./policy-engine";
import type { RiskAssessment } from "./types";
import type { SafetyCheckResult } from "./types";
import type { ComplianceResult } from "./types";
import type { ApprovalRequest } from "./types";

export class ExplainabilityEngine {
  explain(params: {
    decision: GovernanceDecisionType;
    target: string;
    policyResult?: PolicyEvaluationResult;
    riskAssessment?: RiskAssessment;
    safetyResults?: SafetyCheckResult[];
    complianceResults?: ComplianceResult[];
    approvalRequest?: ApprovalRequest;
    permissionsChecked?: { permission: string; satisfied: boolean }[];
  }): GovernanceExplanation {
    const { decision, target } = params;
    const policyReasons: string[] = [];
    const permissionReasons: string[] = [];
    const riskReasons: string[] = [];
    const approvalReasons: string[] = [];

    // Policy reasons.
    if (params.policyResult) {
      if (params.policyResult.passed) {
        policyReasons.push(`All ${params.policyResult.policiesEvaluated.length} applicable policies passed`);
      } else {
        policyReasons.push(`${params.policyResult.violations.length} policy violation(s): ${params.policyResult.violations.join("; ")}`);
      }
    }

    // Permission reasons.
    if (params.permissionsChecked) {
      const failed = params.permissionsChecked.filter((p) => !p.satisfied);
      if (failed.length === 0) {
        permissionReasons.push(`All ${params.permissionsChecked.length} required permissions satisfied`);
      } else {
        permissionReasons.push(`Missing permissions: ${failed.map((p) => p.permission).join(", ")}`);
      }
    }

    // Risk reasons.
    if (params.riskAssessment) {
      if (params.riskAssessment.risks.length === 0) {
        riskReasons.push(`No risks identified (overall: ${params.riskAssessment.overallLevel})`);
      } else {
        riskReasons.push(`Overall risk: ${params.riskAssessment.overallLevel}`);
        for (const r of params.riskAssessment.risks) {
          riskReasons.push(`${r.type} (${r.level}): ${r.description}`);
        }
      }
    }

    // Safety reasons.
    if (params.safetyResults) {
      const failed = params.safetyResults.filter((s) => !s.passed);
      if (failed.length > 0) {
        riskReasons.push(`Safety checks failed: ${failed.map((s) => s.checkType).join(", ")}`);
      }
    }

    // Compliance reasons.
    if (params.complianceResults) {
      const nonCompliant = params.complianceResults.filter((c) => !c.compliant);
      if (nonCompliant.length > 0) {
        riskReasons.push(`Compliance violations: ${nonCompliant.map((c) => c.profileId).join(", ")}`);
      }
    }

    // Approval reasons.
    if (params.approvalRequest) {
      approvalReasons.push(`Approval required (trigger: ${params.approvalRequest.trigger}, role: ${params.approvalRequest.requiredApproverRole})`);
    }

    // Summary.
    const summaryParts: string[] = [];
    switch (decision) {
      case "approve":
        summaryParts.push(`Action approved for ${target}`);
        break;
      case "deny":
        summaryParts.push(`Action denied for ${target}`);
        break;
      case "require-approval":
        summaryParts.push(`Action requires human approval for ${target}`);
        break;
      case "warn":
        summaryParts.push(`Action approved with warnings for ${target}`);
        break;
      case "defer":
        summaryParts.push(`Action deferred for ${target} (insufficient information)`);
        break;
    }
    if (policyReasons.length > 0) summaryParts.push(policyReasons[0]);
    if (riskReasons.length > 0) summaryParts.push(riskReasons[0]);

    return {
      summary: summaryParts.join(". "),
      policyReasons,
      permissionReasons,
      riskReasons,
      approvalReasons,
    };
  }
}

export const globalExplainabilityEngine = new ExplainabilityEngine();

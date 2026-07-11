/**
 * CIRKLE Brain AI — UOB Explainability Engine
 * ============================================================================
 *
 * Phase 5 — Universal Orchestration Brain — Pipeline Stage 16
 *
 * Generates the Explainability Package — 3-level explanations for every plan:
 *   - Plan-level: why this plan?
 *   - Step-level: why each step?
 *   - Decision-level: why alternatives/fallbacks?
 *
 * Per Phase 5 Design Spec §12, every plan must explain:
 *   - Why modules were chosen
 *   - Why dependencies exist
 *   - Why execution order was chosen
 *   - Why parallelization was applied
 *   - Why fallback strategies were created
 *   - Why alternatives were rejected
 *   - Confidence in the plan
 *
 * Explanations reference provenance: CRIE constraints, registry permissions,
 * graph edges, IRDE candidates. This makes plans auditable.
 * ============================================================================
 */

import type {
  Goal,
  SubGoal,
  SelectedCapability,
  ResolvedDependency,
  MissingCapability,
  AlternativeConsidered,
  PlannedPermission,
  PlanStep,
  ConditionalBranch,
  CompensationAction,
  ExplainabilityPackage,
} from "./types";

// ── Explainability Engine ─────────────────────────────────────────────────

export class ExplainabilityEngine {
  /**
   * Generate the complete Explainability Package.
   */
  explain(params: {
    goals: Goal[];
    subGoals: SubGoal[];
    selected: SelectedCapability[];
    resolved: ResolvedDependency[];
    missing: MissingCapability[];
    alternatives: AlternativeConsidered[];
    permissions: PlannedPermission[];
    steps: PlanStep[];
    branches: ConditionalBranch[];
    compensation: CompensationAction[];
    intentType: string;
  }): ExplainabilityPackage {
    const planSummary = this.generatePlanSummary(params);
    const stepExplanations = this.generateStepExplanations(params);
    const decisionExplanations = this.generateDecisionExplanations(params);
    const confidence = this.computeConfidence(params);
    const limitations = this.generateLimitations(params);

    return {
      planSummary,
      stepExplanations,
      decisionExplanations,
      confidence,
      limitations,
    };
  }

  // ── Plan-level explanation ────────────────────────────────────────────

  private generatePlanSummary(params: {
    goals: Goal[];
    steps: PlanStep[];
    intentType: string;
    missing: MissingCapability[];
  }): string {
    const { goals, steps, intentType, missing } = params;
    const goalText = goals.length === 1 ? goals[0].statement : `${goals.length} goals`;
    const stepCount = steps.length;
    const parallelGroups = new Set(steps.filter((s) => s.parallelGroupId).map((s) => s.parallelGroupId)).size;
    const fallbackCount = steps.filter((s) => s.isFallback).length;
    const optionalCount = steps.filter((s) => s.isOptional).length;

    let summary = `This plan addresses "${goalText}" (intent: ${intentType}) in ${stepCount} step(s).`;
    if (parallelGroups > 0) summary += ` ${parallelGroups} parallel group(s) identified for concurrent execution.`;
    if (fallbackCount > 0) summary += ` ${fallbackCount} fallback step(s) included for resilience.`;
    if (optionalCount > 0) summary += ` ${optionalCount} optional enhancement step(s) included.`;
    if (missing.length > 0) {
      summary += ` ${missing.length} capability gap(s) detected — the plan is degraded but functional.`;
    } else {
      summary += ` All sub-goals have matching capabilities — the plan is complete.`;
    }
    return summary;
  }

  // ── Step-level explanations ───────────────────────────────────────────

  private generateStepExplanations(params: {
    steps: PlanStep[];
    selected: SelectedCapability[];
    resolved: ResolvedDependency[];
    permissions: PlannedPermission[];
  }): Record<string, string> {
    const { steps, selected, resolved, permissions } = params;
    const explanations: Record<string, string> = {};

    for (const step of steps) {
      const parts: string[] = [];

      // Why this capability?
      const sel = selected.find((s) => s.capabilityId === step.capabilityId);
      if (sel) parts.push(sel.selectionReason);

      // Why this order?
      if (step.dependsOn.length > 0) {
        parts.push(`Ordered after: ${step.dependsOn.join(", ")} (sequential dependency).`);
      } else {
        parts.push(`No prerequisites — may execute immediately.`);
      }

      // Why parallel?
      if (step.parallelGroupId) {
        parts.push(`Part of parallel group "${step.parallelGroupId}" — may run concurrently with siblings.`);
      }

      // Why confirmation?
      if (step.requiresConfirmation) {
        parts.push(`Requires user confirmation (sensitive operation).`);
      }

      // Why optional?
      if (step.isOptional) {
        parts.push(`Optional enhancement — failure does not abort the plan.`);
      }

      // Why fallback?
      if (step.isFallback && step.fallbackFor) {
        parts.push(`Fallback for "${step.fallbackFor}" — executes only if the primary fails.`);
      }

      // Permission context.
      const perm = permissions.find((p) => p.capabilityId === step.capabilityId);
      if (perm && perm.permission !== "(none)") {
        if (perm.status === "consent-required") {
          parts.push(`Requires consent "${perm.consentPurpose}" (not yet granted).`);
        } else if (perm.status === "satisfied") {
          parts.push(`Permission "${perm.permission}" satisfied.`);
        }
      }

      // Dependency context.
      const deps = resolved.filter((r) => r.dependentCapabilityId === step.capabilityId);
      if (deps.length > 0) {
        const depSummary = deps.map((d) => `${d.dependencyCapabilityId} (${d.status})`).join(", ");
        parts.push(`Dependencies: ${depSummary}.`);
      }

      explanations[step.stepId] = parts.join(" ");
    }

    return explanations;
  }

  // ── Decision-level explanations ───────────────────────────────────────

  private generateDecisionExplanations(params: {
    alternatives: AlternativeConsidered[];
    missing: MissingCapability[];
    compensation: CompensationAction[];
    branches: ConditionalBranch[];
  }): string[] {
    const decisions: string[] = [];

    // Alternative/fallback decisions.
    for (const alt of params.alternatives) {
      if (alt.chosen) {
        decisions.push(`Alternative chosen: "${alt.alternativeCapabilityId}" substitutes for "${alt.forCapabilityId}". Reason: ${alt.reason}`);
      } else {
        decisions.push(`Alternative rejected: "${alt.alternativeCapabilityId}" was considered for "${alt.forCapabilityId}". Reason: ${alt.reason}`);
      }
    }

    // Missing capability decisions (honest orchestration).
    for (const missing of params.missing) {
      decisions.push(
        `Capability gap: no capability addresses sub-goal "${missing.description}". Handling strategy: ${missing.handlingStrategy}. Suggested future capability: ${missing.suggestedId}.`,
      );
    }

    // Compensation decisions.
    for (const comp of params.compensation) {
      decisions.push(`Compensation planned: if step "${comp.forStepId}" fails, invoke "${comp.compensationCapabilityId}". Reason: ${comp.reason}`);
    }

    // Conditional branch decisions.
    for (const branch of params.branches) {
      decisions.push(`Conditional branch "${branch.branchId}": ${branch.explanation}`);
    }

    return decisions;
  }

  // ── Confidence computation ────────────────────────────────────────────

  private computeConfidence(params: {
    steps: PlanStep[];
    missing: MissingCapability[];
    resolved: ResolvedDependency[];
    permissions: PlannedPermission[];
  }): number {
    let confidence = 0.9; // start high

    // Missing capabilities reduce confidence.
    const requiredMissing = params.missing.filter((m) => m.handlingStrategy === "degraded-plan").length;
    confidence -= requiredMissing * 0.15;

    // Unresolvable dependencies reduce confidence.
    const unresolvable = params.resolved.filter((r) => r.status === "unresolvable").length;
    confidence -= unresolvable * 0.1;

    // Missing permissions reduce confidence.
    const missingPerms = params.permissions.filter((p) => p.status === "missing").length;
    confidence -= missingPerms * 0.1;

    // Consent-required (not yet granted) slightly reduces confidence.
    const consentRequired = params.permissions.filter((p) => p.status === "consent-required").length;
    confidence -= consentRequired * 0.05;

    // Fallback steps slightly reduce confidence (indicates degraded plan).
    const fallbackSteps = params.steps.filter((s) => s.isFallback).length;
    confidence -= fallbackSteps * 0.05;

    return Math.max(0.1, Math.min(0.98, confidence));
  }

  // ── Limitations (honest gaps) ─────────────────────────────────────────

  private generateLimitations(params: {
    missing: MissingCapability[];
    resolved: ResolvedDependency[];
    permissions: PlannedPermission[];
  }): string[] {
    const limitations: string[] = [];

    for (const missing of params.missing) {
      limitations.push(`Cannot fully address: ${missing.description}. Suggested capability: ${missing.suggestedId}.`);
    }

    for (const dep of params.resolved) {
      if (dep.status === "unresolvable") {
        limitations.push(`Dependency "${dep.dependencyCapabilityId}" for "${dep.dependentCapabilityId}" is unresolvable.`);
      }
    }

    for (const perm of params.permissions) {
      if (perm.status === "missing") {
        limitations.push(`User lacks permission "${perm.permission}" for capability "${perm.capabilityId}".`);
      }
    }

    return limitations;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalExplainabilityEngine = new ExplainabilityEngine();

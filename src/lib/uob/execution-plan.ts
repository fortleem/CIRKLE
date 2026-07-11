/**
 * CIRKLE Brain AI — UOB Execution Plan Assembler
 * ============================================================================
 *
 * Phase 5 — Universal Orchestration Brain — Pipeline Stage 15
 *
 * Assembles the final Execution Plan from all pipeline stage outputs.
 *
 * The Execution Plan is UOB's SOLE OUTPUT. It is a declarative description
 * of what the platform should do. It contains NO executable code, NO API
 * calls, NO side effects.
 *
 * Schema per Phase 5 Design Spec §11.
 * ============================================================================
 */

import { globalCapabilityRegistry } from "@/lib/cognitive/capability-registry";
import { ensureCapabilitiesSeeded } from "@/lib/cognitive/capability-seed";
import { deriveWorkspace, estimateComplexity } from "./heuristics";
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
  RollbackCheckpoint,
  ExecutionGraph,
  ExplainabilityPackage,
  ExecutionPlan,
  GoalAnalysisResult,
  CapabilityDiscoveryResult,
  DependencyResolutionResult,
  PermissionPlanningResult,
  WorkflowPlanningResult,
} from "./types";
import { UOB_SCHEMA_VERSION } from "./types";

// ── Execution Plan Assembler ──────────────────────────────────────────────

export class ExecutionPlanAssembler {
  /**
   * Assemble the final Execution Plan from all pipeline stage outputs.
   */
  assemble(params: {
    goals: Goal[];
    subGoals: SubGoal[];
    discovery: CapabilityDiscoveryResult;
    deps: DependencyResolutionResult;
    permissions: PermissionPlanningResult;
    workflow: WorkflowPlanningResult;
    graph: ExecutionGraph;
    explainability: ExplainabilityPackage;
    correlationId: string;
    goalSummary: string;
    intentType: string;
  }): ExecutionPlan {
    ensureCapabilitiesSeeded();

    const {
      goals,
      subGoals,
      discovery,
      deps,
      permissions,
      workflow,
      graph,
      explainability,
      correlationId,
      goalSummary,
      intentType,
    } = params;

    // ── Required modules + capabilities ────────────────────────────────
    const requiredCapabilities = new Set<string>();
    const requiredModules = new Set<string>();
    for (const sel of discovery.selected) {
      requiredCapabilities.add(sel.capabilityId);
      const cap = globalCapabilityRegistry.lookup(sel.capabilityId);
      if (cap) requiredModules.add(cap.ownerModule);
    }
    // Also include modules from compensation actions.
    for (const comp of workflow.compensationActions) {
      const cap = globalCapabilityRegistry.lookup(comp.compensationCapabilityId);
      if (cap) requiredModules.add(cap.ownerModule);
    }

    // ── Workspace ───────────────────────────────────────────────────────
    const workspace = deriveWorkspace(intentType, Array.from(requiredCapabilities));

    // ── Unfulfillable sub-goals (honest orchestration) ──────────────────
    const unfulfillableSubGoals: string[] = [];
    for (const missing of discovery.missing) {
      const sg = subGoals.find((s) => s.id === missing.subGoalId);
      if (sg && sg.required) {
        unfulfillableSubGoals.push(`${sg.statement} (missing capability: ${missing.suggestedId})`);
      }
    }
    for (const capId of deps.unresolvable) {
      unfulfillableSubGoals.push(`Capability "${capId}" unresolvable (no alternative or fallback)`);
    }

    // ── Is complete? ────────────────────────────────────────────────────
    const isComplete = unfulfillableSubGoals.length === 0 && deps.unresolvable.length === 0;

    // ── Complexity ──────────────────────────────────────────────────────
    const complexityEstimate = estimateComplexity(
      workflow.steps.length,
      Object.keys(workflow.parallelGroups).length,
      workflow.conditionalBranches.length,
      workflow.compensationActions.length,
    );

    // ── Confidence ──────────────────────────────────────────────────────
    // Confidence is derived from: completeness, permission satisfaction,
    // and the explainability package's confidence.
    let confidence = explainability.confidence;
    if (!isComplete) confidence *= 0.5; // incomplete plans lose half confidence
    const missingPerms = permissions.planned.filter((p) => p.status === "missing").length;
    if (missingPerms > 0) confidence *= 0.7;
    confidence = Math.max(0, Math.min(1, confidence));

    return {
      planId: `plan_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      goalSummary,
      workspace,
      correlationId,
      createdAt: new Date().toISOString(),
      schemaVersion: UOB_SCHEMA_VERSION,

      goals,
      subGoals,

      selectedCapabilities: discovery.selected,
      requiredModules: Array.from(requiredModules),
      requiredCapabilities: Array.from(requiredCapabilities),

      resolvedDependencies: deps.resolved,
      missingCapabilities: discovery.missing,
      alternativesConsidered: deps.alternativesConsidered,

      plannedPermissions: permissions.planned,
      effectivePermissions: permissions.effectivePermissions,
      consentRequired: permissions.consentRequired,

      steps: workflow.steps,
      conditionalBranches: workflow.conditionalBranches,
      compensationActions: workflow.compensationActions,
      rollbackCheckpoints: workflow.rollbackCheckpoints,

      executionGraph: graph,

      explainability,

      confidence,
      complexityEstimate,
      isComplete,
      unfulfillableSubGoals,
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalExecutionPlanAssembler = new ExecutionPlanAssembler();

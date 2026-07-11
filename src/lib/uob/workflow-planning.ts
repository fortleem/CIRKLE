/**
 * CIRKLE Brain AI — UOB Workflow Planning Engine
 * ============================================================================
 *
 * Phase 5 — Universal Orchestration Brain — Pipeline Stages 7-13
 *
 * Constraint Validation + Workflow Planning + Parallelization Analysis +
 * Sequential Ordering + Alternative Planning + Fallback Planning +
 * Compensation Planning.
 *
 * Generates the complete workflow structure:
 *   - Ordered steps (sequential dependencies)
 *   - Parallel groups (independent steps)
 *   - Conditional branches (if/else paths)
 *   - Optional branches (enhancements)
 *   - Retry strategy (max attempts per step)
 *   - Compensation strategy (rollback on failure)
 *   - Rollback checkpoints (snapshot points)
 *   - Preconditions + postconditions + success conditions
 *
 * This planning is ARCHITECTURAL ONLY. No execution occurs. UOB produces
 * a declarative workflow; the future Trusted Execution Engine (Phase 6)
 * interprets it.
 * ============================================================================
 */

import { globalCapabilityRegistry } from "@/lib/cognitive/capability-registry";
import { ensureCapabilitiesSeeded } from "@/lib/cognitive/capability-seed";
import type { SharedContext } from "@/lib/cognitive/shared-context";
import { ORDERING_RULES, COMPENSATION_RULES, CONFIRMATION_REQUIRED_CAPABILITIES, NO_CONFIRMATION_CAPABILITIES, defaultMaxRetries } from "./heuristics";
import type {
  SelectedCapability,
  ResolvedDependency,
  PlannedPermission,
  SubGoal,
  WorkflowPlanningResult,
  PlanStep,
  ConditionalBranch,
  CompensationAction,
  RollbackCheckpoint,
} from "./types";

// ── Workflow Planning Engine ──────────────────────────────────────────────

export class WorkflowPlanningEngine {
  /**
   * Generate the complete workflow structure from selected capabilities.
   *
   * Stages performed:
   *   7. Constraint Validation — map CRIE constraints to step preconditions.
   *   8. Workflow Planning — create steps for each selected capability.
   *   9. Parallelization Analysis — group independent steps.
   *  10. Sequential Ordering — topological sort over ORDERING_RULES.
   *  11. Alternative Planning — add fallback steps for unavailable caps.
   *  12. Fallback Planning — mark degraded steps.
   *  13. Compensation Planning — add compensation actions for sensitive steps.
   */
  plan(
    selected: SelectedCapability[],
    resolved: ResolvedDependency[],
    permissions: PlannedPermission[],
    subGoals: SubGoal[],
    context: SharedContext,
  ): WorkflowPlanningResult {
    ensureCapabilitiesSeeded();

    const steps: PlanStep[] = [];
    const conditionalBranches: ConditionalBranch[] = [];
    const compensationActions: CompensationAction[] = [];
    const rollbackCheckpoints: RollbackCheckpoint[] = [];
    const parallelGroups: Record<string, string[]> = {};

    // ── Stage 8: Create a step for each selected capability ─────────────
    const stepByCapability = new Map<string, string>();
    let stepIdx = 0;

    for (const sel of selected) {
      const cap = globalCapabilityRegistry.lookup(sel.capabilityId);
      if (!cap) continue;

      const stepId = `step-${++stepIdx}`;
      stepByCapability.set(sel.capabilityId, stepId);

      const permEntry = permissions.find((p) => p.capabilityId === sel.capabilityId);
      const requiresConfirmation =
        permEntry?.requiresConfirmation ||
        CONFIRMATION_REQUIRED_CAPABILITIES.has(sel.capabilityId);

      const isFallback = sel.role === "fallback" || sel.role === "alternative";
      const isOptional = subGoals.find((sg) => sg.id === sel.subGoalId)?.required === false;

      const inputs = this.deriveInputs(cap.id, context);

      steps.push({
        stepId,
        capabilityId: cap.id,
        capabilityVersion: cap.version,
        module: cap.ownerModule,
        inputs,
        dependsOn: [], // filled by ordering stage
        permission: cap.permissions[0],
        consentRequired: permEntry?.consentPurpose,
        requiresConfirmation,
        isOptional: Boolean(isOptional),
        isFallback,
        fallbackFor: sel.replacesCapabilityId,
        isCompensation: false,
        preconditions: this.derivePreconditions(cap.id, context),
        postconditions: this.derivePostconditions(cap.id),
        successCondition: `${cap.id} returned successfully`,
        maxRetries: defaultMaxRetries(cap.id),
        status: "planned",
        explanation: sel.selectionReason,
      });
    }

    // ── Stage 10: Sequential Ordering via ORDERING_RULES ───────────────
    // Apply ordering rules: if rule says "before" comes before "after",
    // add a dependsOn edge.
    for (const rule of ORDERING_RULES) {
      const beforeStepId = stepByCapability.get(rule.before);
      const afterStepId = stepByCapability.get(rule.after);
      if (beforeStepId && afterStepId) {
        const afterStep = steps.find((s) => s.stepId === afterStepId);
        if (afterStep && !afterStep.dependsOn.includes(beforeStepId)) {
          afterStep.dependsOn.push(beforeStepId);
        }
      }
    }

    // Also add dependsOn for registry-declared dependencies.
    for (const sel of selected) {
      const cap = globalCapabilityRegistry.lookup(sel.capabilityId);
      if (!cap) continue;
      const stepId = stepByCapability.get(sel.capabilityId);
      if (!stepId) continue;
      const step = steps.find((s) => s.stepId === stepId);
      if (!step) continue;

      for (const depId of cap.dependencies) {
        const depStepId = stepByCapability.get(depId);
        if (depStepId && !step.dependsOn.includes(depStepId)) {
          step.dependsOn.push(depStepId);
        }
      }
    }

    // ── Stage 9: Parallelization Analysis ──────────────────────────────
    // Steps with no dependsOn (or whose deps are all complete) can run in
    // parallel. Group them by "level" (topological depth).
    const levels = this.computeLevels(steps);
    for (const [level, stepIds] of Object.entries(levels)) {
      if (stepIds.length > 1) {
        const groupId = `parallel-${level}`;
        parallelGroups[groupId] = stepIds;
        for (const sid of stepIds) {
          const step = steps.find((s) => s.stepId === sid);
          if (step) step.parallelGroupId = groupId;
        }
      }
    }

    // ── Stage 11-12: Alternative + Fallback Planning ───────────────────
    // For steps that are fallbacks, mark them and link to the original.
    for (const step of steps) {
      if (step.isFallback && step.fallbackFor) {
        const originalStepId = stepByCapability.get(step.fallbackFor);
        if (originalStepId) {
          // Add a conditional branch: if original succeeds, skip fallback.
          conditionalBranches.push({
            branchId: `branch-${step.stepId}`,
            condition: `${originalStepId}.status === "failed"`,
            trueSteps: [step.stepId],
            falseSteps: [],
            explanation: `Fallback "${step.capabilityId}" runs only if "${step.fallbackFor}" fails.`,
          });
        }
      }
    }

    // ── Stage 13: Compensation Planning ────────────────────────────────
    // For sensitive steps, add compensation actions.
    for (const step of steps) {
      const compRule = COMPENSATION_RULES.find((r) => r.forCapability === step.capabilityId);
      if (compRule) {
        compensationActions.push({
          forStepId: step.stepId,
          compensationCapabilityId: compRule.compensationCapability,
          reason: compRule.reason,
        });

        // Add a rollback checkpoint after the step.
        rollbackCheckpoints.push({
          checkpointId: `checkpoint-${step.stepId}`,
          afterStepId: step.stepId,
          snapshotScope: `state-before-${step.capabilityId}`,
        });
      }
    }

    return {
      steps,
      conditionalBranches,
      compensationActions,
      rollbackCheckpoints,
      parallelGroups,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /**
   * Derive input values for a capability from the Shared Context.
   * This is a heuristic mapping; the Execution Engine will refine at runtime.
   */
  private deriveInputs(capabilityId: string, context: SharedContext): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};

    // Location-derived inputs.
    if (context.geographic?.location) {
      inputs.lat = context.geographic.location.lat;
      inputs.lng = context.geographic.location.lng;
      inputs.city = context.geographic.location.city;
      inputs.country = context.geographic.location.country;
    }

    // User-derived inputs.
    if (context.user?.identity?.username) {
      inputs.username = context.user.identity.username;
    }

    // Capability-specific inputs.
    if (capabilityId === "travel.check-visa" && context.geographic?.location?.country) {
      inputs.passport = context.geographic.location.country; // assume user's current country = passport (heuristic)
    }
    if (capabilityId === "travel.generate-itinerary") {
      inputs.days = 3; // default 3-day itinerary
    }

    return inputs;
  }

  /**
   * Derive preconditions for a capability. Maps CRIE constraints to
   * declarative preconditions evaluated by the Execution Engine.
   */
  private derivePreconditions(capabilityId: string, context: SharedContext): string[] {
    const preconditions: string[] = [];
    const constraints = context.reasoning?.constraints || [];

    if (constraints.includes("nearby_only") && capabilityId.startsWith("maps.")) {
      preconditions.push("searchRadius <= 2000m");
    }
    if (constraints.includes("walking_distance") && capabilityId.startsWith("maps.")) {
      preconditions.push("result.walkTimeMin <= 15");
    }
    if (constraints.includes("budget_conscious") && capabilityId.startsWith("pay.")) {
      preconditions.push("amount within user budget");
    }

    return preconditions;
  }

  /**
   * Derive postconditions for a capability.
   */
  private derivePostconditions(capabilityId: string): string[] {
    const postconditions: string[] = [];
    if (capabilityId.startsWith("pay.")) {
      postconditions.push("transaction recorded");
      postconditions.push("balance updated");
    }
    if (capabilityId.startsWith("commit.")) {
      postconditions.push("agreement persisted");
    }
    if (capabilityId.startsWith("shield.")) {
      postconditions.push("case number generated");
    }
    return postconditions;
  }

  /**
   * Compute topological levels for parallelization.
   * Level 0 = no dependencies. Level N = max(deps' levels) + 1.
   */
  private computeLevels(steps: PlanStep[]): Record<number, string[]> {
    const levels: Record<number, string[]> = {};
    const stepLevel = new Map<string, number>();
    const stepMap = new Map(steps.map((s) => [s.stepId, s]));

    // Iterative level computation (handles DAGs).
    let changed = true;
    while (changed) {
      changed = false;
      for (const step of steps) {
        let level = 0;
        for (const depId of step.dependsOn) {
          const depLevel = stepLevel.get(depId);
          if (depLevel === undefined) {
            level = -1; // dep not yet computed; skip
            break;
          }
          level = Math.max(level, depLevel + 1);
        }
        if (level >= 0 && stepLevel.get(step.stepId) !== level) {
          stepLevel.set(step.stepId, level);
          changed = true;
        }
      }
    }

    for (const [stepId, level] of stepLevel) {
      if (!levels[level]) levels[level] = [];
      levels[level].push(stepId);
    }

    return levels;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalWorkflowPlanningEngine = new WorkflowPlanningEngine();

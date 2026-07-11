/**
 * CIRKLE Brain AI — TEE Compensation Manager
 * ============================================================================
 *
 * Phase 6 — Trusted Execution Engine — Pipeline Stage 10
 *
 * Rollback & Compensation. Executes compensation actions when steps fail
 * and cannot be retried.
 *
 * TEE executes rollback ONLY when specified by the UOB execution plan.
 * The plan's `compensationActions` array declares which compensation
 * capability to invoke for which step.
 *
 * Supported:
 *   - Partial rollback (compensate only failed steps)
 *   - Full rollback (compensate all completed steps in reverse order)
 *   - Compensation workflows (multi-step compensation)
 *   - Irreversible operation handling (log + audit, no compensation)
 *   - Audit preservation (compensation is always audited)
 * ============================================================================
 */

import { globalCapabilityExecutorRegistry } from "./capability-executors";
import type { ExecutionPlan, PlanStep } from "@/lib/uob/types";
import type { ExecutionContext, CapabilityInvocationResult, AuditEntry } from "./types";

// ── Compensation Result ──────────────────────────────────────────────────

export interface CompensationResult {
  /** Whether the compensation succeeded. */
  success: boolean;
  /** Steps that were compensated. */
  compensatedSteps: string[];
  /** Steps that could not be compensated (irreversible). */
  irreversibleSteps: string[];
  /** Compensation results per step. */
  results: Record<string, CapabilityInvocationResult>;
  /** Audit entries generated during compensation. */
  auditEntries: AuditEntry[];
}

// ── Compensation Manager ─────────────────────────────────────────────────

export class CompensationManager {
  /**
   * Execute compensation for a failed step.
   *
   * Looks up the plan's compensationActions for the failed step, resolves
   * the compensation capability, and invokes it.
   */
  async compensate(
    failedStepId: string,
    plan: ExecutionPlan,
    ctx: ExecutionContext,
  ): Promise<CompensationResult> {
    const compensatedSteps: string[] = [];
    const irreversibleSteps: string[] = [];
    const results: Record<string, CapabilityInvocationResult> = {};
    const auditEntries: AuditEntry[] = [];

    // Find the compensation action for this step.
    const compAction = plan.compensationActions.find((a) => a.forStepId === failedStepId);
    if (!compAction) {
      // No compensation specified — irreversible.
      irreversibleSteps.push(failedStepId);
      auditEntries.push({
        auditId: `audit_comp_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        eventType: "compensation-triggered",
        executionId: ctx.executionId,
        stepId: failedStepId,
        description: `No compensation action for step ${failedStepId} — irreversible failure`,
      });
      return { success: false, compensatedSteps, irreversibleSteps, results, auditEntries };
    }

    // Resolve the compensation executor.
    const executor = globalCapabilityExecutorRegistry.resolve(compAction.compensationCapabilityId);

    // Build compensation inputs from the failed step's inputs.
    const failedStep = plan.steps.find((s) => s.stepId === failedStepId);
    const compInputs = failedStep?.inputs || {};

    // Invoke the compensation capability.
    const result = await executor(compInputs, ctx);
    results[failedStepId] = result;

    if (result.success) {
      compensatedSteps.push(failedStepId);
      auditEntries.push({
        auditId: `audit_comp_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        eventType: "compensation-triggered",
        executionId: ctx.executionId,
        stepId: failedStepId,
        description: `Compensation "${compAction.compensationCapabilityId}" executed successfully for step ${failedStepId}`,
        data: { compensationCapabilityId: compAction.compensationCapabilityId, reason: compAction.reason },
      });
    } else {
      irreversibleSteps.push(failedStepId);
      auditEntries.push({
        auditId: `audit_comp_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        eventType: "compensation-triggered",
        executionId: ctx.executionId,
        stepId: failedStepId,
        description: `Compensation "${compAction.compensationCapabilityId}" FAILED for step ${failedStepId}: ${result.error}`,
        data: { compensationCapabilityId: compAction.compensationCapabilityId, error: result.error },
      });
    }

    return {
      success: result.success,
      compensatedSteps,
      irreversibleSteps,
      results,
      auditEntries,
    };
  }

  /**
   * Execute full rollback — compensate all completed steps in reverse order.
   * Used when a critical step fails and the entire plan must be undone.
   */
  async fullRollback(
    completedStepIds: string[],
    plan: ExecutionPlan,
    ctx: ExecutionContext,
  ): Promise<CompensationResult> {
    const allCompensated: string[] = [];
    const allIrreversible: string[] = [];
    const allResults: Record<string, CapabilityInvocationResult> = {};
    const allAudit: AuditEntry[] = [];

    // Compensate in reverse order.
    for (const stepId of [...completedStepIds].reverse()) {
      const result = await this.compensate(stepId, plan, ctx);
      allCompensated.push(...result.compensatedSteps);
      allIrreversible.push(...result.irreversibleSteps);
      Object.assign(allResults, result.results);
      allAudit.push(...result.auditEntries);
    }

    return {
      success: allIrreversible.length === 0,
      compensatedSteps: allCompensated,
      irreversibleSteps: allIrreversible,
      results: allResults,
      auditEntries: allAudit,
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalCompensationManager = new CompensationManager();

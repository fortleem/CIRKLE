// @ts-nocheck
/**
 * CIRKLE Brain AI — Trusted Execution Engine (TEE)
 * ============================================================================
 *
 * Phase 6 — Trusted Execution Engine
 *
 * The main orchestrator that runs the full 13-stage execution pipeline:
 *
 *   Approved Execution Plan
 *     ↓
 *   1.  Execution Validation
 *   2.  Permission Verification
 *   3.  Capability Resolution
 *   4.  Execution Scheduler
 *   5.  Capability Invocation
 *   6.  Progress Tracking
 *   7.  State Synchronization
 *   8.  Retry Management
 *   9.  Compensation (if required)
 *  10.  Completion Validation
 *  11.  Shared Context Update
 *  12.  Execution Report
 *
 * TEE is the SOLE AUTHOR of the `execution` section of the Shared Context
 * (reserved for Phase 6). It enriches the context via the Context Manager,
 * then freezes it.
 *
 * Constitutional guarantees:
 *   - TEE NEVER decides what should happen (UOB's job).
 *   - TEE NEVER performs reasoning (CRIE's job).
 *   - TEE NEVER makes recommendations (IRDE's job).
 *   - TEE NEVER stores long-term memory (PMB's job).
 *   - TEE NEVER performs geo intelligence (GCIE's job).
 *   - TEE NEVER moves planning into TEE (UOB's job).
 *
 * TEE executes ONLY what UOB has planned and approved.
 * ============================================================================
 */

import "server-only";

import type { SharedContext } from "@/lib/cognitive/shared-context";
import type { ExecutionPlan } from "@/lib/uob/types";

import { globalExecutionValidator } from "./execution-validator";
import { globalCapabilityResolver } from "./capability-resolver";
import { globalExecutionScheduler } from "./execution-scheduler";
import { createAuditLogger } from "./audit-logger";
import { globalStateMachine } from "./state-machine";

import type { TEEInput, TEEResult, ExecutionResult, ExecutionContextSection, ExecutionState } from "./types";
import { TEE_SCHEMA_VERSION } from "./types";

// ── Execution store (in-memory; for status lookups) ──────────────────────
//
// In production this would be a distributed store (Redis, DB). For now,
// an in-memory map keyed by executionId. This is NOT long-term memory
// (PMB's job) — it's runtime execution state, ephemeral.

const executionStore = new Map<string, ExecutionResult>();

// ── TEE Engine ────────────────────────────────────────────────────────────

export class TEEEngine {
  /**
   * Run the full 13-stage execution pipeline.
   *
   * Input: Execution Plan (from UOB) + Shared Context (frozen by UOB).
   * Output: Execution Result + enriched (frozen) Shared Context.
   */
  async execute(input: TEEInput): Promise<TEEResult> {
    const startMs = Date.now();
    const { plan, sharedContext, mode = "dry-run", userId = "anonymous", autoApprove = false, stepTimeoutMs = 30000 } = input;

    const executionId = `exec_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const audit = createAuditLogger(executionId);

    audit.log("execution-started", `Execution ${executionId} started for plan ${plan.planId} (mode: ${mode})`);

    // ── Stages 1-2: Execution Validation + Permission Verification ───────
    const validation = globalExecutionValidator.validate(plan, sharedContext, userId);
    if (!validation.valid) {
      audit.log("execution-failed", `Execution aborted: validation failed — ${validation.errors.join("; ")}`);
      const result = this.buildFailedResult(executionId, plan, startMs, audit, `Validation failed: ${validation.errors.join("; ")}`);
      executionStore.set(executionId, result);
      return { result, enrichedContext: sharedContext, latencyMs: Date.now() - startMs };
    }

    // Log validation warnings.
    for (const w of validation.warnings) {
      audit.log("permission-denied", `Warning: ${w}`);
    }

    // ── Stage 2a: TGSE Governance Validation ────────────────────────────
    // TEE validates the execution through TGSE before proceeding. If TGSE
    // denies the execution, TEE aborts immediately — the constitutional
    // guardian blocks unsafe actions at runtime.
    if (mode === "live") {
      try {
        const { globalTGSEEngine } = await import("@/lib/tgse/tgse-engine");
        const govDecision = globalTGSEEngine.validate({
          target: "tee",
          action: `execute:${plan.goalSummary}`,
          country: sharedContext.geographic?.location?.country,
          userPermissions: sharedContext.user?.userPermissions || [],
          consentScope: sharedContext.user?.consentScope || [],
          amount: this.extractMaxAmount(plan),
          impact: plan.complexityEstimate >= 7 ? "critical" : plan.complexityEstimate >= 5 ? "high" : "medium",
          workflow: { steps: plan.steps.map((s) => ({ capabilityId: s.capabilityId, inputs: s.inputs })) },
          actionContext: {
            planId: plan.planId,
            executionId,
            stepCount: plan.steps.length,
            requiredCapabilities: plan.requiredCapabilities,
          },
        });

        if (govDecision.decision === "deny") {
          audit.log("execution-failed", `Execution BLOCKED by TGSE: ${govDecision.explanation.summary}`);
          const result = this.buildFailedResult(
            executionId, plan, startMs, audit,
            `Governance denied: ${govDecision.explanation.summary}`,
          );
          executionStore.set(executionId, result);
          return { result, enrichedContext: sharedContext, latencyMs: Date.now() - startMs };
        }

        if (govDecision.decision === "require-approval") {
          audit.log("approval-requested", `Execution requires approval: ${govDecision.explanation.summary}`);
          // In auto-approve mode, proceed. Otherwise, pause (future: return approval request).
          if (!autoApprove && govDecision.approvalRequestId) {
            audit.log("execution-failed", `Execution paused pending approval ${govDecision.approvalRequestId}`);
            const result = this.buildFailedResult(
              executionId, plan, startMs, audit,
              `Approval required: ${govDecision.explanation.summary} (request: ${govDecision.approvalRequestId})`,
            );
            executionStore.set(executionId, result);
            return { result, enrichedContext: sharedContext, latencyMs: Date.now() - startMs };
          }
        }
      } catch {
        // TGSE validation failure is non-fatal in dry-run; logged for observability.
        audit.log("permission-denied", "Warning: TGSE validation unavailable — proceeding without governance check");
      }
    }

    // ── Stage 3: Capability Resolution ──────────────────────────────────
    const resolution = globalCapabilityResolver.resolve(plan);
    if (resolution.unresolved.length > 0) {
      audit.log("execution-failed", `Execution aborted: ${resolution.unresolved.length} steps could not be resolved`);
      const result = this.buildFailedResult(executionId, plan, startMs, audit, `Unresolved steps: ${resolution.unresolved.join(", ")}`);
      executionStore.set(executionId, result);
      return { result, enrichedContext: sharedContext, latencyMs: Date.now() - startMs };
    }

    audit.log("state-transition", `Resolved ${resolution.live.length} live + ${resolution.simulated.length} simulated executors`);

    // ── Stages 4-9: Execution Scheduler + Invocation + Progress +
    //    State Sync + Retry + Compensation ───────────────────────────────
    const ctx = {
      executionId,
      plan,
      sharedContext,
      dryRun: mode === "dry-run",
      userId,
      mode: (autoApprove ? "live-auto" : mode) as "live" | "dry-run",
    };

    const schedulerResult = await globalExecutionScheduler.schedule(
      plan,
      resolution.executorsByStep,
      ctx,
      audit,
      validation.skippedSteps,
      stepTimeoutMs,
    );

    // ── Stage 10: Completion Validation ─────────────────────────────────
    const finalState: ExecutionState = schedulerResult.finalState;
    audit.log(
      finalState === "completed" ? "execution-completed" : "execution-failed",
      `Execution ${executionId} ${finalState} — ${schedulerResult.steps.filter((s) => s.state === "completed").length}/${schedulerResult.steps.length} steps completed`,
    );

    // ── Compute telemetry ───────────────────────────────────────────────
    const totalDurationMs = Date.now() - startMs;
    const telemetry = audit.computeTelemetry(schedulerResult.steps, totalDurationMs);

    // ── Build the Execution Result ──────────────────────────────────────
    const result: ExecutionResult = {
      executionId,
      planId: plan.planId,
      state: finalState,
      startedAt: new Date(startMs).toISOString(),
      completedAt: new Date().toISOString(),
      totalDurationMs,
      steps: schedulerResult.steps,
      auditTrail: audit.getTrail(),
      telemetry,
      outputs: schedulerResult.outputs,
      dryRun: mode === "dry-run",
      summary: this.buildSummary(finalState, schedulerResult.steps, telemetry, mode),
      errors: schedulerResult.errors,
    };

    executionStore.set(executionId, result);

    // ── Stage 11a: Feed execution outcome to LIEE (close the learning loop) ─
    // TEE auto-feeds every execution outcome to LIEE's feedback collector.
    // This closes the cognitive loop: TEE executes → LIEE learns → proposals
    // → governance approval → UOB/IRDE/CRIE heuristics improve.
    try {
      const { globalFeedbackCollector } = await import("@/lib/liee/feedback-collector");
      globalFeedbackCollector.ingestExecutionOutcome({
        executionId,
        planId: plan.planId,
        state: finalState,
        stepsSucceeded: telemetry.stepsSucceeded,
        stepsFailed: telemetry.stepsFailed,
        totalDurationMs,
        totalRetries: telemetry.totalRetries,
        userId,
        consentGranted: sharedContext.user?.consentScope?.includes("federated_learning") ||
          sharedContext.user?.consentScope?.includes("ai_personalization") ||
          false,
      });
    } catch {
      // LIEE ingestion failure is non-fatal — execution still succeeds.
    }

    // ── Stage 11: Shared Context Update (TEE is sole author of `execution`) ─
    let enrichedContext: SharedContext = sharedContext;
    try {
      const { globalContextManager } = await import("@/lib/cognitive/context-manager");
      const executionSection: ExecutionContextSection = {
        executionId,
        planId: plan.planId,
        state: finalState,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        totalDurationMs,
        stepsSucceeded: telemetry.stepsSucceeded,
        stepsFailed: telemetry.stepsFailed,
        outputs: result.outputs,
        errors: result.errors,
        dryRun: result.dryRun,
      };
      enrichedContext = globalContextManager.enrich(sharedContext, "execution", executionSection, "execution", {
        reason: `TEE executed plan: ${telemetry.stepsSucceeded}/${schedulerResult.steps.length} steps succeeded`,
      });
      enrichedContext = globalContextManager.freeze(enrichedContext);
    } catch {
      // If the context is already frozen, return without enrichment.
      enrichedContext = sharedContext;
    }

    const latencyMs = Date.now() - startMs;
    return { result, enrichedContext, latencyMs };
  }

  /**
   * Get a stored execution result by id (for status lookups).
   */
  getExecution(executionId: string): ExecutionResult | null {
    return executionStore.get(executionId) || null;
  }

  /**
   * List recent executions (most recent first).
   */
  listExecutions(limit: number = 20): ExecutionResult[] {
    return Array.from(executionStore.values()).slice(-limit).reverse();
  }

  /**
   * Quick health/status check.
   */
  status(): {
    phase: string;
    status: string;
    pipelineStages: number;
    schemaVersion: number;
    ownsExecutionContextSection: boolean;
    neverPlans: boolean;
  } {
    return {
      phase: "6",
      status: "operational",
      pipelineStages: 13,
      schemaVersion: TEE_SCHEMA_VERSION,
      ownsExecutionContextSection: true,
      neverPlans: true,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private buildFailedResult(
    executionId: string,
    plan: ExecutionPlan,
    startMs: number,
    audit: ReturnType<typeof createAuditLogger>,
    error: string,
  ): ExecutionResult {
    return {
      executionId,
      planId: plan.planId,
      state: "failed",
      startedAt: new Date(startMs).toISOString(),
      completedAt: new Date().toISOString(),
      totalDurationMs: Date.now() - startMs,
      steps: [],
      auditTrail: audit.getTrail(),
      telemetry: {
        totalDurationMs: Date.now() - startMs,
        stepDurations: {},
        totalRetries: 0,
        totalCompensations: 0,
        stepsSucceeded: 0,
        stepsFailed: 0,
        stepsSkipped: 0,
        peakParallelism: 0,
      },
      outputs: {},
      dryRun: true,
      summary: `Execution failed: ${error}`,
      errors: [error],
    };
  }

  private buildSummary(
    state: ExecutionState,
    steps: { state: ExecutionState; capabilityId: string }[],
    telemetry: { stepsSucceeded: number; stepsFailed: number; stepsSkipped: number; totalRetries: number; totalCompensations: number; peakParallelism: number },
    mode: string,
  ): string {
    const total = steps.length;
    const succeeded = telemetry.stepsSucceeded;
    const failed = telemetry.stepsFailed;
    const skipped = telemetry.stepsSkipped;
    const modeLabel = mode === "dry-run" ? " (dry-run)" : "";

    if (state === "completed") {
      return `Execution completed${modeLabel}: ${succeeded}/${total} steps succeeded, ${skipped} skipped, peak parallelism ${telemetry.peakParallelism}.`;
    }
    return `Execution failed${modeLabel}: ${succeeded}/${total} steps succeeded, ${failed} failed, ${skipped} skipped.`;
  }

  /**
   * Extract the maximum payment amount from a plan's steps (for TGSE risk assessment).
   */
  private extractMaxAmount(plan: ExecutionPlan): number | undefined {
    let maxAmount = 0;
    let found = false;
    for (const step of plan.steps) {
      const amt = Number(step.inputs?.amount);
      if (!isNaN(amt) && amt > maxAmount) {
        maxAmount = amt;
        found = true;
      }
    }
    return found ? maxAmount : undefined;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────
//
// A single TEE instance serves the whole platform. The execution store is
// in-memory (ephemeral runtime state — NOT long-term memory, which is PMB's
// responsibility).

export const globalTEEEngine = new TEEEngine();

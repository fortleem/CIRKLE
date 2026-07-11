// @ts-nocheck
/**
 * CIRKLE Brain AI — TEE Capability Resolver
 * ============================================================================
 *
 * Phase 6 — Trusted Execution Engine — Pipeline Stage 3
 *
 * Capability Resolution. TEE resolves the execution endpoint for each
 * capability via the Capability Registry + the Capability Executor Registry.
 *
 * TEE NEVER hardcodes module implementations. It resolves executors
 * dynamically:
 *   1. Check the Capability Registry for the capability metadata.
 *   2. Resolve the executor from the Capability Executor Registry.
 *   3. If no live executor exists, fall back to the simulator (dry-run).
 *
 * This stage produces a resolved-execution map: stepId → executor function.
 * ============================================================================
 */

import { globalCapabilityRegistry, ensureCapabilitiesSeeded } from "@/lib/cognitive/capability-registry";
import { ensureCapabilitiesSeeded as ensureSeed } from "@/lib/cognitive/capability-seed";
import { globalCapabilityExecutorRegistry } from "./capability-executors";
import type { ExecutionPlan } from "@/lib/uob/types";
import type { CapabilityExecutor } from "./types";

// ── Resolution Result ────────────────────────────────────────────────────

export interface ResolutionResult {
  /** stepId → resolved executor. */
  executorsByStep: Record<string, CapabilityExecutor>;
  /** Steps that could not be resolved (no capability in registry). */
  unresolved: string[];
  /** Steps that will use a simulated executor (no live executor available). */
  simulated: string[];
  /** Steps that will use a live executor. */
  live: string[];
}

// ── Capability Resolver ──────────────────────────────────────────────────

export class CapabilityResolver {
  /**
   * Resolve executors for every step in the plan.
   */
  resolve(plan: ExecutionPlan): ResolutionResult {
    ensureSeed();
    const executorsByStep: Record<string, CapabilityExecutor> = {};
    const unresolved: string[] = [];
    const simulated: string[] = [];
    const live: string[] = [];

    for (const step of plan.steps) {
      // Check the Capability Registry for the capability metadata.
      const cap = globalCapabilityRegistry.lookup(step.capabilityId);
      if (!cap) {
        unresolved.push(step.stepId);
        continue;
      }

      // Resolve the executor from the Capability Executor Registry.
      const executor = globalCapabilityExecutorRegistry.resolve(step.capabilityId);
      executorsByStep[step.stepId] = executor;

      // Track whether this is a live or simulated executor.
      if (globalCapabilityExecutorRegistry.hasLiveExecutor(step.capabilityId)) {
        live.push(step.stepId);
      } else {
        simulated.push(step.stepId);
      }
    }

    return { executorsByStep, unresolved, simulated, live };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalCapabilityResolver = new CapabilityResolver();

/**
 * CIRKLE Brain AI — TEE Retry Manager
 * ============================================================================
 *
 * Phase 6 — Trusted Execution Engine — Pipeline Stage 9
 *
 * Retry Management. Handles failed capability invocations according to
 * configurable retry policies.
 *
 * Supported strategies (per Phase 6 spec):
 *   - immediate: retry immediately
 *   - exponential-backoff: retry with increasing delay
 *   - limited: retry up to N times
 *   - alternative-capability: retry with an alternative capability
 *   - manual-intervention: pause for human intervention
 *   - permanent-failure: no retry
 *
 * The Retry Manager is invoked by the Execution Scheduler when a step fails.
 * It decides whether to retry, wait, or give up.
 * ============================================================================
 */

import type { RetryPolicy, CapabilityInvocationResult, CapabilityExecutor, ExecutionContext } from "./types";
import { DEFAULT_RETRY_POLICY } from "./types";

// ── Retry Decision ───────────────────────────────────────────────────────

export type RetryDecision =
  | { action: "retry"; delayMs: number; attempt: number }
  | { action: "give-up"; reason: string }
  | { action: "manual-intervention"; reason: string };

// ── Retry Manager ────────────────────────────────────────────────────────

export class RetryManager {
  /**
   * Decide whether to retry a failed invocation.
   */
  decide(policy: RetryPolicy, attempt: number, lastError: string): RetryDecision {
    // Permanent failure — no retry.
    if (policy.strategy === "permanent-failure") {
      return { action: "give-up", reason: `Permanent failure policy: ${lastError}` };
    }

    // Manual intervention — pause.
    if (policy.strategy === "manual-intervention") {
      return { action: "manual-intervention", reason: `Manual intervention required: ${lastError}` };
    }

    // Check max attempts.
    if (attempt >= policy.maxAttempts) {
      return { action: "give-up", reason: `Max attempts (${policy.maxAttempts}) reached: ${lastError}` };
    }

    // Determine delay.
    let delayMs = 0;
    if (policy.strategy === "immediate") {
      delayMs = 0;
    } else if (policy.strategy === "exponential-backoff") {
      delayMs = Math.min(policy.baseDelayMs * Math.pow(2, attempt - 1), policy.maxDelayMs);
    } else if (policy.strategy === "limited") {
      delayMs = policy.baseDelayMs;
    } else if (policy.strategy === "alternative-capability") {
      // Alternative capability retry is handled by the scheduler (it swaps the executor).
      delayMs = 0;
    }

    return { action: "retry", delayMs, attempt: attempt + 1 };
  }

  /**
   * Execute a capability with retry. Returns the final result (success or
   * permanent failure).
   */
  async executeWithRetry(
    executor: CapabilityExecutor,
    inputs: Record<string, unknown>,
    ctx: ExecutionContext,
    policy: RetryPolicy = DEFAULT_RETRY_POLICY,
    stepTimeoutMs: number = 30000,
  ): Promise<CapabilityInvocationResult & { attempts: number }> {
    let attempt = 1;
    let lastResult: CapabilityInvocationResult | null = null;

    while (true) {
      // Execute with timeout.
      lastResult = await this.invokeWithTimeout(executor, inputs, ctx, stepTimeoutMs);

      if (lastResult.success) {
        return { ...lastResult, attempts: attempt };
      }

      // Decide whether to retry.
      const decision = this.decide(policy, attempt, lastResult.error || "unknown error");

      if (decision.action === "give-up") {
        return { ...lastResult, attempts: attempt };
      }

      if (decision.action === "manual-intervention") {
        // Return the failure; the scheduler will pause the execution.
        return { ...lastResult, attempts: attempt };
      }

      // Wait before retrying.
      if (decision.delayMs > 0) {
        await this.sleep(decision.delayMs);
      }

      attempt = decision.attempt;
    }
  }

  /**
   * Invoke a capability with a timeout.
   */
  private async invokeWithTimeout(
    executor: CapabilityExecutor,
    inputs: Record<string, unknown>,
    ctx: ExecutionContext,
    timeoutMs: number,
  ): Promise<CapabilityInvocationResult> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          success: false,
          error: `Step timed out after ${timeoutMs}ms`,
          latencyMs: timeoutMs,
          executor: "timeout",
          dryRun: ctx.dryRun,
        });
      }, timeoutMs);

      executor(inputs, ctx)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          resolve({
            success: false,
            error: String(err).slice(0, 200),
            latencyMs: 0,
            executor: "error",
            dryRun: ctx.dryRun,
          });
        });
    });
  }

  /**
   * Sleep helper.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalRetryManager = new RetryManager();

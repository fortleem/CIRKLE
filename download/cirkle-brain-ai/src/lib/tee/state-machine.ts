/**
 * CIRKLE Brain AI — TEE Runtime State Machine
 * ============================================================================
 *
 * Phase 6 — Trusted Execution Engine
 *
 * Enforces deterministic, auditable state transitions for executions and
 * individual steps.
 *
 * State diagram (per Phase 6 spec):
 *
 *   pending → running → waiting → running → completed
 *                   ↘                ↗
 *                    ↘ paused → running
 *                     ↘
 *                      retrying → running
 *                        ↓
 *                      compensating → completed / failed
 *
 * Terminal states: completed, failed, cancelled, (timed-out → failed)
 *
 * Every transition is validated against VALID_TRANSITIONS. Invalid
 * transitions throw — this is a Constitutional guard ensuring runtime
 * determinism.
 * ============================================================================
 */

import { type ExecutionState, VALID_TRANSITIONS } from "./types";

// ── State Machine ────────────────────────────────────────────────────────

export class RuntimeStateMachine {
  /**
   * Check whether a transition is valid.
   */
  canTransition(from: ExecutionState, to: ExecutionState): boolean {
    const allowed = VALID_TRANSITIONS[from];
    return allowed.includes(to);
  }

  /**
   * Execute a transition. Throws if the transition is invalid.
   * Returns the new state.
   */
  transition(from: ExecutionState, to: ExecutionState): ExecutionState {
    if (!this.canTransition(from, to)) {
      throw new Error(
        `[TEE] Invalid state transition: ${from} → ${to}. ` +
          `Valid transitions from ${from}: [${VALID_TRANSITIONS[from].join(", ")}]`,
      );
    }
    // Terminal states cannot transition.
    if (VALID_TRANSITIONS[to].length === 0) {
      // transitioning TO a terminal state is fine; we just can't leave it.
    }
    return to;
  }

  /**
   * Check whether a state is terminal (no further transitions possible).
   */
  isTerminal(state: ExecutionState): boolean {
    return VALID_TRANSITIONS[state].length === 0;
  }

  /**
   * Check whether a state is active (execution is in progress, not terminal).
   */
  isActive(state: ExecutionState): boolean {
    return !this.isTerminal(state) && state !== "pending";
  }

  /**
   * Check whether a state represents a failure.
   */
  isFailure(state: ExecutionState): boolean {
    return state === "failed" || state === "cancelled" || state === "timed-out";
  }

  /**
   * Check whether a state represents success.
   */
  isSuccess(state: ExecutionState): boolean {
    return state === "completed";
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalStateMachine = new RuntimeStateMachine();

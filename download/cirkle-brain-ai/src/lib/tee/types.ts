/**
 * CIRKLE Brain AI — Trusted Execution Engine (TEE) Types
 * ============================================================================
 *
 * Phase 6 — Trusted Execution Engine
 *
 * This module defines the complete type system for the TEE — the runtime
 * component that executes Execution Plans produced by UOB (Phase 5).
 *
 * Constitutional role (per Phase 6 spec):
 *   - TEE OWNS execution lifecycle, runtime state, capability invocation,
 *     scheduling, retry, rollback, compensation, monitoring, auditing.
 *   - TEE NEVER owns reasoning, recommendations, goal decomposition,
 *     workflow planning, capability discovery, long-term memory, geo
 *     intelligence, or user preference management.
 *   - TEE NEVER decides what should happen — it only performs what UOB
 *     has already planned and approved.
 *
 * The TEE consumes UOB's Execution Plan + the Shared Context and produces
 * an Execution Result. It writes ONLY to the `execution` section of the
 * Shared Context (reserved for Phase 6). It NEVER modifies user memory,
 * reasoning context, or recommendation context.
 * ============================================================================
 */

import type { ExecutionPlan, PlanStep } from "@/lib/uob/types";

// ── Runtime Execution State ──────────────────────────────────────────────

/**
 * The runtime state of an execution (or an individual step).
 * Transitions are deterministic and auditable (per state-machine.ts).
 */
export type ExecutionState =
  | "pending" // created, not yet started
  | "running" // actively executing
  | "waiting" // paused at a human-approval checkpoint
  | "paused" // manually paused
  | "retrying" // a step failed and is being retried
  | "compensating" // executing compensation actions after a failure
  | "completed" // all steps succeeded
  | "failed" // one or more steps failed unrecoverably
  | "cancelled" // cancelled by user or system
  | "timed-out"; // a step exceeded its timeout

/**
 * Valid state transitions. Enforced by the state machine.
 */
export const VALID_TRANSITIONS: Readonly<Record<ExecutionState, ExecutionState[]>> = Object.freeze({
  pending: ["running", "cancelled"],
  running: ["waiting", "paused", "retrying", "compensating", "completed", "failed", "cancelled", "timed-out"],
  waiting: ["running", "cancelled", "timed-out"],
  paused: ["running", "cancelled"],
  retrying: ["running", "compensating", "failed", "cancelled", "timed-out"],
  compensating: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
  "timed-out": ["failed", "cancelled"],
});

// ── Runtime Step ─────────────────────────────────────────────────────────

/**
 * A step with runtime state — the execution-time view of a PlanStep.
 */
export interface RuntimeStep {
  /** Links to the PlanStep.stepId. */
  stepId: string;
  /** The capability being invoked. */
  capabilityId: string;
  /** Current runtime state. */
  state: ExecutionState;
  /** Attempt number (1 = first try, 2 = first retry, etc.). */
  attempt: number;
  /** Max retries allowed. */
  maxRetries: number;
  /** When this step started (ISO-8601). */
  startedAt?: string;
  /** When this step completed (ISO-8601). */
  completedAt?: string;
  /** The result of the capability invocation (if completed). */
  result?: CapabilityInvocationResult;
  /** Error message (if failed). */
  error?: string;
  /** Whether this step required human approval. */
  awaitingApproval?: boolean;
}

// ── Capability Invocation ────────────────────────────────────────────────

/**
 * The result of invoking a single capability.
 */
export interface CapabilityInvocationResult {
  /** Whether the invocation succeeded. */
  success: boolean;
  /** The output data returned by the capability. */
  output?: unknown;
  /** Error message (if failed). */
  error?: string;
  /** Latency in milliseconds. */
  latencyMs: number;
  /** The executor that handled this invocation (e.g. "api", "internal", "simulated"). */
  executor: string;
  /** Whether this was a dry-run (no side effects). */
  dryRun: boolean;
}

/**
 * A standardized capability executor function. TEE invokes capabilities
 * through this interface — never hardcoding module implementations.
 *
 * Each executor receives the planned inputs + execution context and returns
 * a CapabilityInvocationResult. Executors are registered in the
 * CapabilityExecutorRegistry (capability-executors.ts).
 */
export type CapabilityExecutor = (
  inputs: Record<string, unknown>,
  ctx: ExecutionContext,
) => Promise<CapabilityInvocationResult>;

// ── Execution Context ────────────────────────────────────────────────────

/**
 * Runtime context for an execution. Passed to every capability executor.
 */
export interface ExecutionContext {
  /** The execution id. */
  executionId: string;
  /** The UOB plan being executed. */
  plan: ExecutionPlan;
  /** The Shared Context (frozen by UOB; TEE reads but does not modify prior sections). */
  sharedContext: import("@/lib/cognitive/shared-context").SharedContext;
  /** Whether this is a dry-run (no side effects). */
  dryRun: boolean;
  /** The user executing the plan (for permission checks). */
  userId: string;
  /** Execution mode. */
  mode: "live" | "dry-run";
}

// ── Retry Policy ─────────────────────────────────────────────────────────

export type RetryStrategy =
  | "immediate" // retry immediately
  | "exponential-backoff" // retry with increasing delay
  | "limited" // retry up to N times
  | "alternative-capability" // retry with an alternative capability
  | "manual-intervention" // pause for human intervention
  | "permanent-failure"; // no retry

export interface RetryPolicy {
  strategy: RetryStrategy;
  maxAttempts: number;
  /** Base delay in ms (for exponential backoff). */
  baseDelayMs: number;
  /** Max delay in ms (for exponential backoff). */
  maxDelayMs: number;
  /** Alternative capability to try (for "alternative-capability" strategy). */
  alternativeCapabilityId?: string;
}

// ── Audit & Telemetry ────────────────────────────────────────────────────

export type AuditEventType =
  | "execution-started"
  | "execution-completed"
  | "execution-failed"
  | "execution-cancelled"
  | "step-started"
  | "step-completed"
  | "step-failed"
  | "step-retried"
  | "step-skipped"
  | "compensation-triggered"
  | "rollback-triggered"
  | "permission-denied"
  | "approval-requested"
  | "approval-received"
  | "state-transition"
  | "timeout";

export interface AuditEntry {
  /** Unique audit entry id. */
  auditId: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** The type of event. */
  eventType: AuditEventType;
  /** The execution id this entry belongs to. */
  executionId: string;
  /** The step id this entry relates to (if applicable). */
  stepId?: string;
  /** Human-readable description. */
  description: string;
  /** Additional structured data. */
  data?: Record<string, unknown>;
}

export interface ExecutionTelemetry {
  /** Total execution duration in ms. */
  totalDurationMs: number;
  /** Per-step durations: stepId → ms. */
  stepDurations: Record<string, number>;
  /** Number of retries across all steps. */
  totalRetries: number;
  /** Number of compensations triggered. */
  totalCompensations: number;
  /** Number of steps that succeeded. */
  stepsSucceeded: number;
  /** Number of steps that failed. */
  stepsFailed: number;
  /** Number of steps skipped (optional/conditional). */
  stepsSkipped: number;
  /** Peak parallelism achieved. */
  peakParallelism: number;
}

// ── Execution Result ─────────────────────────────────────────────────────

/**
 * The result of executing an Execution Plan. TEE's sole output.
 */
export interface ExecutionResult {
  /** Unique execution id. */
  executionId: string;
  /** The plan id that was executed. */
  planId: string;
  /** Final state. */
  state: ExecutionState;
  /** When execution started. */
  startedAt: string;
  /** When execution completed. */
  completedAt?: string;
  /** Total duration in ms. */
  totalDurationMs: number;
  /** Per-step runtime state. */
  steps: RuntimeStep[];
  /** Audit trail. */
  auditTrail: AuditEntry[];
  /** Telemetry. */
  telemetry: ExecutionTelemetry;
  /** The outputs of each step (stepId → output). */
  outputs: Record<string, unknown>;
  /** Whether the execution was a dry-run. */
  dryRun: boolean;
  /** Summary message. */
  summary: string;
  /** Errors (if any). */
  errors: string[];
}

// ── Execution Context Section (TEE's contribution to Shared Context) ─────

/**
 * The shape of the `execution` section TEE writes to the Shared Context.
 * TEE is the SOLE AUTHOR of this section (Phase 4.5 ownership guard).
 */
export interface ExecutionContextSection {
  executionId: string;
  planId: string;
  state: ExecutionState;
  startedAt: string;
  completedAt?: string;
  totalDurationMs: number;
  stepsSucceeded: number;
  stepsFailed: number;
  outputs: Record<string, unknown>;
  errors: string[];
  dryRun: boolean;
}

// ── TEE Engine input ─────────────────────────────────────────────────────

export interface TEEInput {
  /** The Execution Plan produced by UOB. */
  plan: ExecutionPlan;
  /** The Shared Context (frozen by UOB). */
  sharedContext: import("@/lib/cognitive/shared-context").SharedContext;
  /** Execution mode: "live" (real invocation) or "dry-run" (simulated, no side effects). */
  mode?: "live" | "dry-run";
  /** User id executing the plan. */
  userId?: string;
  /** Whether to auto-approve human-approval checkpoints (for testing). */
  autoApprove?: boolean;
  /** Step timeout in ms (default 30000). */
  stepTimeoutMs?: number;
}

// ── TEE Engine output ────────────────────────────────────────────────────

export interface TEEResult {
  /** The execution result. */
  result: ExecutionResult;
  /** The Shared Context enriched with the execution section (frozen). */
  enrichedContext: import("@/lib/cognitive/shared-context").SharedContext;
  /** Execution latency in ms. */
  latencyMs: number;
}

// ── Schema version ───────────────────────────────────────────────────────

export const TEE_SCHEMA_VERSION = 1;

// ── Default retry policy ─────────────────────────────────────────────────

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  strategy: "exponential-backoff",
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
};

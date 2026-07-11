/**
 * CIRKLE Brain AI — Trusted Execution Engine (TEE) — Public API
 * ============================================================================
 *
 * Phase 6 barrel. Re-exports the TEE engine + all runtime sub-engines +
 * the complete type system.
 *
 * Import convention:
 *   import { globalTEEEngine, type ExecutionResult } from "@/lib/tee";
 * ============================================================================
 */

export { TEEEngine, globalTEEEngine } from "./tee-engine";

export { RuntimeStateMachine, globalStateMachine } from "./state-machine";
export { CapabilityExecutorRegistry, globalCapabilityExecutorRegistry } from "./capability-executors";
export { ExecutionValidator, globalExecutionValidator } from "./execution-validator";
export { CapabilityResolver, globalCapabilityResolver } from "./capability-resolver";
export { ExecutionScheduler, globalExecutionScheduler } from "./execution-scheduler";
export { RetryManager, globalRetryManager } from "./retry-manager";
export { CompensationManager, globalCompensationManager } from "./compensation-manager";
export { AuditLogger, createAuditLogger } from "./audit-logger";

export {
  TEE_SCHEMA_VERSION,
  DEFAULT_RETRY_POLICY,
  VALID_TRANSITIONS,
  type ExecutionState,
  type RuntimeStep,
  type CapabilityInvocationResult,
  type CapabilityExecutor,
  type ExecutionContext,
  type RetryPolicy,
  type RetryStrategy,
  type AuditEntry,
  type AuditEventType,
  type ExecutionTelemetry,
  type ExecutionResult,
  type ExecutionContextSection,
  type TEEInput,
  type TEEResult,
} from "./types";

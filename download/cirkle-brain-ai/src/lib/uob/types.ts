/**
 * CIRKLE Brain AI — Universal Orchestration Brain (UOB) Types
 * ============================================================================
 *
 * Phase 5 — Universal Orchestration Brain
 *
 * This module defines the complete type system for the UOB. It is the
 * foundation upon which all planning engines build.
 *
 * Constitutional role (per Phase 5 Design Specification, docs/phase-5-uob-specification.md):
 *   - UOB owns Platform Understanding + Workflow Planning.
 *   - UOB NEVER executes, NEVER calls platform APIs, NEVER modifies persistent
 *     data, NEVER stores long-term memory.
 *   - UOB produces Execution Plans; a future Trusted Execution Engine (Phase 6)
 *     consumes them.
 *
 * These types are PURE DATA STRUCTURES. They contain no executable logic.
 * An Execution Plan is a declarative description of WHAT should happen,
 * never HOW it happens.
 * ============================================================================
 */

// ── Goals ────────────────────────────────────────────────────────────────

/**
 * A user goal derived from CRIE's intent analysis. UOB does NOT re-derive
 * intent — it consumes CRIE's output and decomposes it into sub-goals.
 */
export interface Goal {
  /** Unique id within this planning session. */
  id: string;
  /** The goal statement (derived from CRIE intent + user request). */
  statement: string;
  /** CRIE's intent type (e.g. "plan", "recommend", "book", "communicate"). */
  intentType: string;
  /** Priority: 1 = highest. Lower numbers run first in multi-goal plans. */
  priority: number;
  /** Whether this goal is optional (failure does not abort the plan). */
  isOptional: boolean;
  /** Sub-goal ids that this goal depends on (must complete first). */
  dependsOn: string[];
  /** The originating request text. */
  sourceRequest: string;
}

/**
 * A sub-goal is a finer-grained objective that maps to one or more
 * capabilities. UOB decomposes goals into sub-goals during Goal Analysis.
 */
export interface SubGoal {
  id: string;
  parentId: string; // the Goal this came from
  statement: string;
  /** The capability category that addresses this sub-goal (e.g. "payments"). */
  category: string;
  /** Whether this sub-goal is required (vs. an enhancement). */
  required: boolean;
  /** Constraints carried from CRIE (e.g. "budget_conscious"). */
  constraints: string[];
}

// ── Capability Selection ─────────────────────────────────────────────────

/**
 * A capability that UOB has selected for a sub-goal, with the reasoning
 * for its selection.
 */
export interface SelectedCapability {
  /** Capability id from the registry (e.g. "pay.transfer-money"). */
  capabilityId: string;
  /** Sub-goal id this capability addresses. */
  subGoalId: string;
  /** Why this capability was chosen. */
  selectionReason: string;
  /** Whether this is a primary or fallback selection. */
  role: "primary" | "fallback" | "alternative";
  /** The id this capability is an alternative/fallback for, if applicable. */
  replacesCapabilityId?: string;
}

// ── Dependency Resolution ────────────────────────────────────────────────

export type DependencyStatus =
  | "resolved" // dependency is available
  | "missing" // not registered
  | "unavailable" // registered but disabled/maintenance
  | "alternative-found" // an alternative was substituted
  | "fallback-found" // a degraded fallback was substituted
  | "unresolvable"; // no alternative or fallback exists

export interface ResolvedDependency {
  /** The capability that has the dependency. */
  dependentCapabilityId: string;
  /** The required dependency capability id. */
  dependencyCapabilityId: string;
  status: DependencyStatus;
  /** If alternative/fallback found, the substituted capability id. */
  substitutedCapabilityId?: string;
  /** Why this status (for explainability). */
  reason: string;
}

// ── Permission Planning ──────────────────────────────────────────────────

export type PermissionStatus =
  | "satisfied" // user has the permission
  | "missing" // user lacks the permission
  | "consent-required" // consent purpose must be granted
  | "consent-denied" // consent explicitly denied
  | "enterprise-required" // enterprise/org permission needed (future)
  | "government-required" // government permission needed (future)
  | "unknown"; // cannot be determined at plan time

export interface PlannedPermission {
  capabilityId: string;
  /** Permission token (e.g. "pay:send"). */
  permission: string;
  status: PermissionStatus;
  /** Consent purpose if this is a consent-gated permission. */
  consentPurpose?: string;
  /** Whether the user must confirm before this step executes. */
  requiresConfirmation: boolean;
  reason: string;
}

// ── Workflow Planning ────────────────────────────────────────────────────

export type StepStatus = "planned" | "skipped" | "failed-planning";

/**
 * A single step in an Execution Plan. Steps are declarative — they describe
 * WHAT capability to invoke, with WHAT inputs, in WHAT order. They contain
 * NO executable logic.
 */
export interface PlanStep {
  /** Unique step id (e.g. "step-1"). */
  stepId: string;
  /** Capability to invoke. */
  capabilityId: string;
  /** Capability semver. */
  capabilityVersion: string;
  /** Owning module. */
  module: string;
  /** Input values derived from the Shared Context. */
  inputs: Record<string, unknown>;
  /** Step ids that must complete before this step (sequential deps). */
  dependsOn: string[];
  /** Parallel group id (steps in the same group may run concurrently). */
  parallelGroupId?: string;
  /** Permission token required. */
  permission?: string;
  /** Consent purpose required, if gated. */
  consentRequired?: string;
  /** Whether user confirmation is required before execution. */
  requiresConfirmation: boolean;
  /** Whether this step is an optional enhancement. */
  isOptional: boolean;
  /** Whether this is a fallback step. */
  isFallback: boolean;
  /** If a fallback, the step id this replaces. */
  fallbackFor?: string;
  /** Whether this is a compensation step (rollback). */
  isCompensation: boolean;
  /** If compensation, the step id this compensates for. */
  compensatesFor?: string;
  /** Preconditions that must hold before execution. */
  preconditions: string[];
  /** Postconditions that will hold after successful execution. */
  postconditions: string[];
  /** Success condition (evaluated by the Execution Engine). */
  successCondition: string;
  /** Retry strategy (max attempts). */
  maxRetries: number;
  /** Current status (always "planned" at UOB output time). */
  status: StepStatus;
  /** Why this step is in the plan. */
  explanation: string;
}

/**
 * A conditional branch in the workflow. The condition is evaluated by the
 * Execution Engine (Phase 6); UOB only declares the branches.
 */
export interface ConditionalBranch {
  branchId: string;
  /** The condition expression (declarative, evaluated at execution time). */
  condition: string;
  /** Step ids to execute if the condition is true. */
  trueSteps: string[];
  /** Step ids to execute if the condition is false. */
  falseSteps: string[];
  /** Why this branch exists. */
  explanation: string;
}

/**
 * A compensation action — what to do if a step fails and cannot be retried.
 * This is architectural rollback planning, NOT execution.
 */
export interface CompensationAction {
  /** The step this compensation applies to. */
  forStepId: string;
  /** The compensation capability to invoke on failure. */
  compensationCapabilityId: string;
  /** Why this compensation. */
  reason: string;
}

/**
 * A rollback checkpoint — a point in the plan where the Execution Engine
 * can snapshot state for potential rollback.
 */
export interface RollbackCheckpoint {
  checkpointId: string;
  /** The step after which this checkpoint is taken. */
  afterStepId: string;
  /** What state to snapshot. */
  snapshotScope: string;
}

// ── Execution Graph ──────────────────────────────────────────────────────

/**
 * A node in the execution graph — corresponds to a capability invocation.
 */
export interface GraphNode {
  nodeId: string;
  stepId: string; // links back to PlanStep
  capabilityId: string;
  module: string;
}

/**
 * A directed edge in the execution graph.
 */
export interface GraphEdge {
  fromNodeId: string;
  toNodeId: string;
  /** Edge type: "depends-on" (sequential), "parallel" (concurrent), "conditional" (branch). */
  type: "depends-on" | "parallel" | "conditional";
  /** For conditional edges, the branch id. */
  branchId?: string;
}

/**
 * A synchronization point where parallel branches converge.
 */
export interface SyncPoint {
  syncPointId: string;
  /** Node ids that must all complete before the plan continues. */
  waitForNodeIds: string[];
  /** The node that runs after synchronization. */
  nextNodeId?: string;
}

/**
 * The directed execution graph. Deterministic and serializable.
 */
export interface ExecutionGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  syncPoints: SyncPoint[];
  /** Entry node id (the first node). */
  entryNodeId: string;
  /** Terminal node ids (final nodes in any path). */
  terminalNodeIds: string[];
}

// ── Alternatives & Fallbacks ─────────────────────────────────────────────

export interface AlternativeConsidered {
  /** The capability that was unavailable or rejected. */
  forCapabilityId: string;
  /** The alternative considered. */
  alternativeCapabilityId: string;
  /** Whether this alternative was chosen. */
  chosen: boolean;
  /** Why chosen or rejected. */
  reason: string;
}

export interface MissingCapability {
  /** Suggested capability id that doesn't exist yet. */
  suggestedId: string;
  /** The sub-goal it would have addressed. */
  subGoalId: string;
  /** What it would have solved. */
  description: string;
  /** How UOB handled the gap (degraded plan, fallback, etc.). */
  handlingStrategy: string;
}

// ── Explainability ───────────────────────────────────────────────────────

export interface ExplainabilityPackage {
  /** Plan-level summary (why this plan). */
  planSummary: string;
  /** Step-level explanations (why each step). */
  stepExplanations: Record<string, string>;
  /** Decision-level explanations (why alternatives/fallbacks). */
  decisionExplanations: string[];
  /** Confidence in the plan (0-1). */
  confidence: number;
  /** What the plan cannot do (honest gaps). */
  limitations: string[];
}

// ── The Execution Plan (UOB's sole output) ───────────────────────────────

/**
 * The Execution Plan — UOB's sole output. A declarative description of
 * what the platform should do to fulfill a user goal.
 *
 * CRITICAL: This plan contains NO executable code. It is a pure data
 * structure consumed by the future Trusted Execution Engine (Phase 6).
 */
export interface ExecutionPlan {
  /** Unique plan id. */
  planId: string;
  /** The user's goal summary. */
  goalSummary: string;
  /** Derived workspace (e.g. "travel", "payments"). */
  workspace: string;
  /** Links to the Shared Context request id. */
  correlationId: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** UOB schema version. */
  schemaVersion: number;

  // ── Goals & sub-goals ──────────────────────────────────────────────
  goals: Goal[];
  subGoals: SubGoal[];

  // ── Capabilities ───────────────────────────────────────────────────
  selectedCapabilities: SelectedCapability[];
  requiredModules: string[];
  requiredCapabilities: string[];

  // ── Dependency resolution ──────────────────────────────────────────
  resolvedDependencies: ResolvedDependency[];
  missingCapabilities: MissingCapability[];
  alternativesConsidered: AlternativeConsidered[];

  // ── Permissions ────────────────────────────────────────────────────
  plannedPermissions: PlannedPermission[];
  effectivePermissions: string[];
  consentRequired: string[];

  // ── Workflow ───────────────────────────────────────────────────────
  steps: PlanStep[];
  conditionalBranches: ConditionalBranch[];
  compensationActions: CompensationAction[];
  rollbackCheckpoints: RollbackCheckpoint[];

  // ── Graph ──────────────────────────────────────────────────────────
  executionGraph: ExecutionGraph;

  // ── Explainability ─────────────────────────────────────────────────
  explainability: ExplainabilityPackage;

  // ── Plan metadata ──────────────────────────────────────────────────
  /** UOB's confidence in the plan (0-1). */
  confidence: number;
  /** Estimated complexity (1-10). */
  complexityEstimate: number;
  /** Whether the plan is fully resolvable (no missing capabilities). */
  isComplete: boolean;
  /** Sub-goals that could not be fulfilled (honest orchestration). */
  unfulfillableSubGoals: string[];
}

// ── Pipeline stages (intermediate artifacts) ─────────────────────────────

/**
 * The output of Goal Analysis (stage 1-2). UOB does NOT re-derive intent;
 * it decomposes CRIE's intent into goals + sub-goals.
 */
export interface GoalAnalysisResult {
  goals: Goal[];
  subGoals: SubGoal[];
  /** Whether multiple independent goals were detected. */
  isMultiGoal: boolean;
}

/**
 * The output of Capability Discovery (stage 3-4).
 */
export interface CapabilityDiscoveryResult {
  /** Sub-goal id → discovered capability ids. */
  candidatesBySubGoal: Record<string, string[]>;
  /** Capabilities that were selected for each sub-goal. */
  selected: SelectedCapability[];
  /** Capabilities that could not be found (gap detection). */
  missing: MissingCapability[];
}

/**
 * The output of Dependency Resolution (stage 5).
 */
export interface DependencyResolutionResult {
  resolved: ResolvedDependency[];
  alternativesConsidered: AlternativeConsidered[];
  /** Capabilities whose deps are fully unresolvable. */
  unresolvable: string[];
}

/**
 * The output of Permission Planning (stage 6).
 */
export interface PermissionPlanningResult {
  planned: PlannedPermission[];
  effectivePermissions: string[];
  consentRequired: string[];
  /** Step ids that require user confirmation. */
  confirmationRequiredSteps: string[];
}

/**
 * The output of Workflow Planning (stages 8-13).
 */
export interface WorkflowPlanningResult {
  steps: PlanStep[];
  conditionalBranches: ConditionalBranch[];
  compensationActions: CompensationAction[];
  rollbackCheckpoints: RollbackCheckpoint[];
  /** Parallel groups: group id → step ids. */
  parallelGroups: Record<string, string[]>;
}

// ── UOB Engine input ─────────────────────────────────────────────────────

/**
 * Input to the UOB planning pipeline. UOB consumes the Shared Context
 * (with all prior phase enrichments) + optional explicit candidates.
 */
export interface UOBInput {
  /** The Shared Context (must have at least request + reasoning sections). */
  context: import("@/lib/cognitive/shared-context").SharedContext;
  /** Optional explicit goal override (otherwise derived from CRIE intent). */
  explicitGoal?: string;
  /** Optional pre-selected candidates (from IRDE). */
  candidates?: import("@/lib/irde-engine").CandidateEntity[];
  /** Optional workspace hint (e.g. "travel"). */
  workspaceHint?: string;
}

// ── Platform Context (UOB's contribution to the Shared Context) ──────────

/**
 * The shape of the `platform` section UOB writes to the Shared Context.
 * UOB is the SOLE AUTHOR of this section (Phase 4.5 ownership guard).
 * This is the structured form; the Shared Context stores it as
 * `PlatformContext = Record<string, unknown>` for forward compatibility.
 */
export interface PlatformContext {
  requiredModules: string[];
  requiredCapabilities: string[];
  resolvedDependencies: ResolvedDependency[];
  effectivePermissions: string[];
  executionPlan: {
    planId: string;
    goalSummary: string;
    workspace: string;
    stepCount: number;
    confidence: number;
    isComplete: boolean;
    unfulfillableSubGoals: string[];
  };
  alternatives: AlternativeConsidered[];
  missingCapabilities: MissingCapability[];
  workspace: string;
}

// ── UOB Engine output ────────────────────────────────────────────────────

export interface UOBResult {
  /** The finalized Execution Plan. */
  plan: ExecutionPlan;
  /** The Shared Context enriched with the platform section (frozen). */
  enrichedContext: import("@/lib/cognitive/shared-context").SharedContext;
  /** Planning latency in ms. */
  latencyMs: number;
}

// ── Schema version ───────────────────────────────────────────────────────

export const UOB_SCHEMA_VERSION = 1;

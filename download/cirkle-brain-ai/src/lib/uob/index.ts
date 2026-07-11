/**
 * CIRKLE Brain AI — Universal Orchestration Brain (UOB) — Public API
 * ============================================================================
 *
 * Phase 5 barrel. Re-exports the UOB engine + all planning sub-engines +
 * the complete type system.
 *
 * Import convention:
 *   import { globalUOBEngine, type ExecutionPlan } from "@/lib/uob";
 * ============================================================================
 */

export { UOBEngine, globalUOBEngine } from "./uob-engine";

export { GoalDecompositionEngine, globalGoalDecompositionEngine } from "./goal-decomposition";
export { CapabilityDiscoveryEngine, globalCapabilityDiscoveryEngine } from "./capability-discovery";
export { DependencyResolutionEngine, globalDependencyResolutionEngine } from "./dependency-resolution";
export { PermissionPlanningEngine, globalPermissionPlanningEngine } from "./permission-planning";
export { WorkflowPlanningEngine, globalWorkflowPlanningEngine } from "./workflow-planning";
export { ExecutionGraphGenerator, globalExecutionGraphGenerator } from "./execution-graph";
export { ExecutionPlanAssembler, globalExecutionPlanAssembler } from "./execution-plan";
export { ExplainabilityEngine, globalExplainabilityEngine } from "./explainability";

export {
  UOB_SCHEMA_VERSION,
  type Goal,
  type SubGoal,
  type SelectedCapability,
  type ResolvedDependency,
  type DependencyStatus,
  type PlannedPermission,
  type PermissionStatus,
  type PlanStep,
  type StepStatus,
  type ConditionalBranch,
  type CompensationAction,
  type RollbackCheckpoint,
  type GraphNode,
  type GraphEdge,
  type SyncPoint,
  type ExecutionGraph,
  type AlternativeConsidered,
  type MissingCapability,
  type ExplainabilityPackage,
  type ExecutionPlan,
  type GoalAnalysisResult,
  type CapabilityDiscoveryResult,
  type DependencyResolutionResult,
  type PermissionPlanningResult,
  type WorkflowPlanningResult,
  type UOBInput,
  type UOBResult,
  type PlatformContext,
} from "./types";

export {
  ORDERING_RULES,
  ALTERNATIVE_RULES,
  COMPENSATION_RULES,
  CONFIRMATION_REQUIRED_CAPABILITIES,
  NO_CONFIRMATION_CAPABILITIES,
  SENSITIVE_PERMISSIONS,
  deriveWorkspace,
  defaultMaxRetries,
  estimateComplexity,
} from "./heuristics";

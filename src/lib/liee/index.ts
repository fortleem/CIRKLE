/**
 * CIRKLE Brain AI — Learning & Intelligence Evolution Engine (LIEE) — Public API
 * ============================================================================
 *
 * Phase 7 barrel. Re-exports the LIEE engine + all sub-engines + the
 * complete type system.
 *
 * Import convention:
 *   import { globalLIEEEngine, type OptimizationProposal } from "@/lib/liee";
 * ============================================================================
 */

export { LIEEEngine, globalLIEEEngine } from "./liee-engine";

export { FeedbackCollector, globalFeedbackCollector } from "./feedback-collector";
export { PatternDetector, globalPatternDetector } from "./pattern-detector";
export { ProposalEngine, globalProposalEngine } from "./proposal-engine";
export { EvaluationFramework, globalEvaluationFramework } from "./evaluation";
export { GovernanceFramework, globalGovernanceFramework } from "./governance";

export {
  LIEE_SCHEMA_VERSION,
  type FeedbackSignal,
  type FeedbackPipeline,
  type FeedbackValence,
  type LearningPattern,
  type PatternType,
  type OptimizationProposal,
  type ProposalTarget,
  type ProposalStatus,
  type ProposalImpact,
  type EvaluationResult,
  type ProposalGovernance,
  type GovernanceAuditEntry,
  type LearningContextSection,
  type LIEEInput,
  type LIEEResult,
} from "./types";

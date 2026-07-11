/**
 * CIRKLE Brain AI — Learning & Intelligence Evolution Engine (LIEE) Types
 * ============================================================================
 *
 * Phase 7 — Learning & Intelligence Evolution Engine
 *
 * This module defines the complete type system for LIEE — the final
 * intelligence phase that closes the cognitive loop by transforming
 * operational experience into governed improvement proposals.
 *
 * Constitutional role (per Phase 7 spec):
 *   - LIEE OWNS feedback collection, learning pipelines, pattern detection,
 *     performance analytics, optimization proposals, evaluation, governance.
 *   - LIEE NEVER owns user memory (PMB), runtime reasoning (CRIE),
 *     recommendation generation (IRDE), orchestration planning (UOB),
 *     workflow execution (TEE), or world intelligence (GCIE).
 *   - LIEE PROPOSES improvements; it NEVER automatically applies them.
 *     Human approval is required before deployment.
 *
 * LIEE consumes the `learning` section of the Shared Context (reserved
 * since Phase 4.5) + execution outcomes from TEE + feedback from all
 * phases. It writes learning insights + proposals back to the `learning`
 * section.
 * ============================================================================
 */

// ── Feedback Signals ─────────────────────────────────────────────────────

export type FeedbackPipeline =
  | "explicit" // user ratings, thumbs up/down
  | "implicit" // accept/reject/ignore without explicit rating
  | "behavioral" // navigation patterns, search behavior
  | "operational" // execution telemetry, latency, errors
  | "execution" // TEE execution outcomes (success/failure/retry)
  | "satisfaction"; // post-interaction satisfaction indicators

export type FeedbackValence = "positive" | "negative" | "neutral";

export interface FeedbackSignal {
  /** Unique feedback id. */
  feedbackId: string;
  /** Which pipeline produced this signal. */
  pipeline: FeedbackPipeline;
  /** The source phase (gcie, pmb, crie, irde, uob, tee, user). */
  sourcePhase: string;
  /** The user this feedback relates to (anonymized/aggregated where required). */
  userId?: string;
  /** The entity this feedback is about (capability id, plan id, recommendation id, etc.). */
  targetEntityId?: string;
  /** The target type. */
  targetType: "recommendation" | "capability" | "plan" | "step" | "workflow" | "search" | "navigation" | "provider";
  /** Positive/negative/neutral. */
  valence: FeedbackValence;
  /** Normalized score 0-1 (1 = best). */
  normalizedScore: number;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Raw signal data (before normalization). */
  raw: Record<string, unknown>;
  /** Consent state at collection time. */
  consentGranted: boolean;
}

// ── Learning Patterns ────────────────────────────────────────────────────

export type PatternType =
  | "frequent-workflow" // commonly used workflow sequences
  | "common-failure" // repeated execution failures
  | "clarification-repeat" // repeated clarification requests
  | "high-performing-strategy" // orchestration strategies that perform well
  | "usage-trend" // emerging platform usage trends
  | "capability-adoption" // capability adoption patterns
  | "preference-evolution" // user preference changes over time
  | "latency-pattern" // latency patterns by capability/time
  | "provider-performance"; // AI provider performance patterns

export interface LearningPattern {
  /** Unique pattern id. */
  patternId: string;
  /** The pattern type. */
  type: PatternType;
  /** Human-readable description. */
  description: string;
  /** The signal ids that support this pattern. */
  supportingSignals: string[];
  /** How many times this pattern was observed. */
  frequency: number;
  /** Confidence in the pattern (0-1). */
  confidence: number;
  /** When first observed. */
  firstObserved: string;
  /** When last observed. */
  lastObserved: string;
  /** Pattern-specific data. */
  data: Record<string, unknown>;
  /** Whether this pattern is explainable + traceable. */
  explainable: boolean;
}

// ── Optimization Proposals ───────────────────────────────────────────────

export type ProposalTarget =
  | "crie-heuristics" // CRIE intent detection / constraint analysis
  | "irde-weighting" // IRDE factor weights
  | "uob-planning" // UOB planning heuristics / ordering rules
  | "capability-prioritization" // Capability Registry priority
  | "execution-policy" // TEE retry / timeout / compensation policies
  | "provider-selection" // AI provider routing
  | "search-refinement" // search behavior
  | "latency-optimization" // performance tuning
  | "ux-optimization"; // user experience

export type ProposalStatus =
  | "proposed" // created, awaiting review
  | "under-review" // being evaluated
  | "approved" // approved for deployment
  | "rejected" // rejected
  | "deployed" // deployed to production
  | "rolled-back"; // deployed then reverted

export type ProposalImpact = "low" | "medium" | "high" | "critical";

export interface OptimizationProposal {
  /** Unique proposal id. */
  proposalId: string;
  /** The target phase/area this proposal improves. */
  target: ProposalTarget;
  /** Human-readable title. */
  title: string;
  /** Detailed description of the proposed change. */
  description: string;
  /** The patterns that motivate this proposal. */
  motivatedByPatterns: string[];
  /** The expected improvement. */
  expectedImprovement: string;
  /** Estimated impact level. */
  impact: ProposalImpact;
  /** Current status. */
  status: ProposalStatus;
  /** The proposed change (structured, for review). */
  proposedChange: Record<string, unknown>;
  /** Evaluation results (if evaluated). */
  evaluation?: EvaluationResult;
  /** Governance metadata. */
  governance: ProposalGovernance;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-update timestamp. */
  updatedAt: string;
}

// ── Evaluation ───────────────────────────────────────────────────────────

export interface EvaluationResult {
  /** The metric being evaluated. */
  metric: string;
  /** Baseline value (before the change). */
  baseline: number;
  /** Expected value (after the change). */
  expected: number;
  /** Confidence in the evaluation (0-1). */
  confidence: number;
  /** The evaluation method used. */
  method: "a-b-comparison" | "statistical" | "heuristic" | "simulation";
  /** Whether the proposal is safe to roll out. */
  safeToRollOut: boolean;
  /** Risks identified. */
  risks: string[];
  /** Rollout recommendation. */
  rolloutRecommendation: "immediate" | "gradual" | "canary" | "hold" | "reject";
  /** Evaluation notes. */
  notes: string;
}

// ── Governance ───────────────────────────────────────────────────────────

export interface ProposalGovernance {
  /** Whether this proposal requires human approval (always true for significant changes). */
  requiresHumanApproval: boolean;
  /** The reviewer who approved/rejected (if any). */
  reviewer?: string;
  /** Approval/rejection timestamp. */
  reviewedAt?: string;
  /** Review notes. */
  reviewNotes?: string;
  /** Whether the change is reversible. */
  reversible: boolean;
  /** The version of the proposal (incremented on updates). */
  version: number;
  /** Audit trail of governance events. */
  auditTrail: GovernanceAuditEntry[];
}

export interface GovernanceAuditEntry {
  timestamp: string;
  event: "created" | "reviewed" | "approved" | "rejected" | "deployed" | "rolled-back" | "updated";
  actor: string;
  notes?: string;
}

// ── Learning Context Section (LIEE's contribution to Shared Context) ─────

/**
 * The shape of the `learning` section LIEE writes to the Shared Context.
 * LIEE is the SOLE AUTHOR of this section (Phase 4.5 ownership guard).
 */
export interface LearningContextSection {
  feedbackCount: number;
  patternsDetected: number;
  proposalsPending: number;
  proposalsDeployed: number;
  topPatterns: { patternId: string; type: PatternType; description: string; confidence: number }[];
  recentProposals: { proposalId: string; title: string; status: ProposalStatus; target: ProposalTarget }[];
  learningEnabled: boolean;
}

// ── LIEE Engine input ────────────────────────────────────────────────────

export interface LIEEInput {
  /** The Shared Context (with execution section from TEE, if available). */
  sharedContext: import("@/lib/cognitive/shared-context").SharedContext;
  /** Optional explicit feedback signal to ingest. */
  feedback?: FeedbackSignal;
  /** Whether to run pattern detection. */
  detectPatterns?: boolean;
  /** Whether to generate proposals. */
  generateProposals?: boolean;
  /** Whether learning is enabled (consent-gated). */
  learningEnabled?: boolean;
}

// ── LIEE Engine output ───────────────────────────────────────────────────

export interface LIEEResult {
  /** Feedback signals currently stored. */
  feedbackCount: number;
  /** Patterns detected in this run. */
  patternsDetected: LearningPattern[];
  /** Proposals generated in this run. */
  proposalsGenerated: OptimizationProposal[];
  /** The Shared Context enriched with the learning section. */
  enrichedContext: import("@/lib/cognitive/shared-context").SharedContext;
  /** Latency in ms. */
  latencyMs: number;
}

// ── Schema version ───────────────────────────────────────────────────────

export const LIEE_SCHEMA_VERSION = 1;

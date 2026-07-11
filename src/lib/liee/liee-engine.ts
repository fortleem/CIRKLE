// @ts-nocheck
/**
 * CIRKLE Brain AI — Learning & Intelligence Evolution Engine (LIEE)
 * ============================================================================
 *
 * Phase 7 — Learning & Intelligence Evolution Engine
 *
 * The main orchestrator that runs the full learning pipeline:
 *
 *   1. Feedback Collection (6 pipelines: explicit, implicit, behavioral,
 *      operational, execution, satisfaction)
 *   2. Signal Normalization (0-1 score + valence per pipeline)
 *   3. Pattern Detection (9 pattern types: frequent-workflow, common-failure,
 *      clarification-repeat, high-performing-strategy, usage-trend,
 *      capability-adoption, preference-evolution, latency-pattern,
 *      provider-performance)
 *   4. Optimization Proposal Generation (9 targets: crie-heuristics,
 *      irde-weighting, uob-planning, capability-prioritization,
 *      execution-policy, provider-selection, search-refinement,
 *      latency-optimization, ux-optimization)
 *   5. Proposal Evaluation (baseline vs expected + safe-rollout recommendation)
 *   6. Governance (propose → review → approve/reject → deploy → rollback)
 *   7. Shared Context Update (LIEE writes the `learning` section)
 *
 * LIEE is the SOLE AUTHOR of the `learning` section of the Shared Context
 * (reserved since Phase 4.5). It enriches the context via the Context
 * Manager, then freezes it.
 *
 * Constitutional guarantees:
 *   - LIEE NEVER makes runtime decisions.
 *   - LIEE NEVER executes workflows.
 *   - LIEE NEVER replaces existing intelligence phases.
 *   - LIEE PROPOSES improvements; it NEVER automatically applies them.
 *   - Human approval is required before any proposal is deployed.
 *
 * LIEE consumes execution outcomes from TEE + feedback from all phases.
 * It produces insights + proposals without altering ownership boundaries.
 * ============================================================================
 */

import "server-only";

import type { SharedContext } from "@/lib/cognitive/shared-context";
import type { ExecutionResult } from "@/lib/tee/types";

import { globalFeedbackCollector } from "./feedback-collector";
import { globalPatternDetector } from "./pattern-detector";
import { globalProposalEngine } from "./proposal-engine";
import { globalEvaluationFramework } from "./evaluation";

import type {
  LIEEInput,
  LIEEResult,
  LearningPattern,
  OptimizationProposal,
  LearningContextSection,
  FeedbackSignal,
} from "./types";
import { LIEE_SCHEMA_VERSION } from "./types";

// ── LIEE Engine ──────────────────────────────────────────────────────────

export class LIEEEngine {
  /**
   * Run the full learning pipeline.
   *
   * Input: Shared Context + optional explicit feedback signal + flags.
   * Output: patterns + proposals + enriched Shared Context.
   */
  async learn(input: LIEEInput): Promise<LIEEResult> {
    const startMs = Date.now();
    const { sharedContext, feedback, detectPatterns = true, generateProposals = true, learningEnabled = true } = input;

    // ── Stage 1: Feedback Collection ────────────────────────────────────
    // Ingest explicit feedback if provided.
    if (feedback && learningEnabled) {
      globalFeedbackCollector.ingest({
        pipeline: feedback.pipeline,
        sourcePhase: feedback.sourcePhase,
        userId: feedback.userId,
        targetEntityId: feedback.targetEntityId,
        targetType: feedback.targetType,
        raw: feedback.raw,
        consentGranted: feedback.consentGranted,
      });
    }

    // ── Stage 2: Ingest execution outcomes from TEE (if present) ────────
    const executionSection = sharedContext.execution as { executionId?: string; planId?: string; state?: string; stepsSucceeded?: number; stepsFailed?: number; totalDurationMs?: number } | undefined;
    if (executionSection && executionSection.executionId && learningEnabled) {
      // Check consent before ingesting.
      const consentScope = sharedContext.user?.consentScope || [];
      const consentGranted = consentScope.includes("federated_learning") || consentScope.includes("ai_personalization");
      globalFeedbackCollector.ingestExecutionOutcome({
        executionId: executionSection.executionId,
        planId: executionSection.planId || "",
        state: executionSection.state || "unknown",
        stepsSucceeded: executionSection.stepsSucceeded || 0,
        stepsFailed: executionSection.stepsFailed || 0,
        totalDurationMs: executionSection.totalDurationMs || 0,
        totalRetries: 0,
        consentGranted,
      });
    }

    let patternsDetected: LearningPattern[] = [];
    let proposalsGenerated: OptimizationProposal[] = [];

    if (learningEnabled) {
      // ── Stage 3: Pattern Detection ────────────────────────────────────
      if (detectPatterns) {
        const signals = globalFeedbackCollector.getSignals();
        patternsDetected = globalPatternDetector.detect(signals);
      }

      // ── Stage 4-5: Proposal Generation + Evaluation ───────────────────
      if (generateProposals && patternsDetected.length > 0) {
        proposalsGenerated = globalProposalEngine.generate(patternsDetected);

        // Evaluate each proposal.
        for (const proposal of proposalsGenerated) {
          proposal.evaluation = globalEvaluationFramework.evaluate(proposal);
        }
      }
    }

    // ── Stage 6: Shared Context Update (LIEE is sole author of `learning`) ─
    let enrichedContext: SharedContext = sharedContext;
    try {
      const { globalContextManager } = await import("@/lib/cognitive/context-manager");
      const learningSection: LearningContextSection = {
        feedbackCount: globalFeedbackCollector.getStats().total,
        patternsDetected: patternsDetected.length,
        proposalsPending: globalProposalEngine.getProposalsByStatus("proposed").length + globalProposalEngine.getProposalsByStatus("under-review").length,
        proposalsDeployed: globalProposalEngine.getProposalsByStatus("deployed").length,
        topPatterns: patternsDetected.slice(0, 5).map((p) => ({
          patternId: p.patternId,
          type: p.type,
          description: p.description,
          confidence: p.confidence,
        })),
        recentProposals: proposalsGenerated.slice(0, 5).map((p) => ({
          proposalId: p.proposalId,
          title: p.title,
          status: p.status,
          target: p.target,
        })),
        learningEnabled,
      };
      enrichedContext = globalContextManager.enrich(sharedContext, "learning", learningSection, "learning", {
        reason: `LIEE: ${patternsDetected.length} patterns, ${proposalsGenerated.length} proposals`,
      });
      enrichedContext = globalContextManager.freeze(enrichedContext);
    } catch {
      // If the context is already frozen, return without enrichment.
      enrichedContext = sharedContext;
    }

    const latencyMs = Date.now() - startMs;

    return {
      feedbackCount: globalFeedbackCollector.getStats().total,
      patternsDetected,
      proposalsGenerated,
      enrichedContext,
      latencyMs,
    };
  }

  /**
   * Quick health/status check.
   */
  status(): {
    phase: string;
    status: string;
    schemaVersion: number;
    ownsLearningContextSection: boolean;
    neverAppliesProposals: boolean;
  } {
    return {
      phase: "7",
      status: "operational",
      schemaVersion: LIEE_SCHEMA_VERSION,
      ownsLearningContextSection: true,
      neverAppliesProposals: true,
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalLIEEEngine = new LIEEEngine();

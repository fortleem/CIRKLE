/**
 * CIRKLE Brain AI — LIEE Evaluation Framework
 * ============================================================================
 *
 * Phase 7 — Learning & Intelligence Evolution Engine
 *
 * Evaluates optimization proposals before deployment. Produces safe-rollout
 * recommendations using A/B comparison, statistical analysis, heuristics,
 * or simulation.
 *
 * Evaluation outputs:
 *   - Baseline vs expected metric values
 *   - Confidence in the evaluation
 *   - Identified risks
 *   - Safe-rollout recommendation: immediate / gradual / canary / hold / reject
 *
 * LIEE never auto-deploys. The evaluation informs the human reviewer's
 * decision; it does not replace it.
 * ============================================================================
 */

import type { OptimizationProposal, EvaluationResult, ProposalImpact } from "./types";

// ── Evaluation Framework ─────────────────────────────────────────────────

export class EvaluationFramework {
  /**
   * Evaluate a proposal. Returns an EvaluationResult with a safe-rollout
   * recommendation.
   */
  evaluate(proposal: OptimizationProposal, baselineMetrics?: Record<string, number>): EvaluationResult {
    const metric = this.deriveMetric(proposal);
    const baseline = baselineMetrics?.[metric] ?? this.estimateBaseline(proposal);
    const expected = this.estimateExpected(proposal, baseline);
    const confidence = this.estimateConfidence(proposal);
    const risks = this.identifyRisks(proposal);
    const safeToRollOut = confidence >= 0.6 && risks.length === 0;

    let rolloutRecommendation: EvaluationResult["rolloutRecommendation"];
    if (!safeToRollOut) {
      rolloutRecommendation = risks.some((r) => r.includes("critical")) ? "reject" : "hold";
    } else if (proposal.impact === "critical") {
      rolloutRecommendation = "canary";
    } else if (proposal.impact === "high") {
      rolloutRecommendation = "gradual";
    } else {
      rolloutRecommendation = "immediate";
    }

    return {
      metric,
      baseline,
      expected,
      confidence,
      method: "heuristic",
      safeToRollOut,
      risks,
      rolloutRecommendation,
      notes: `Evaluated ${proposal.target} proposal "${proposal.title}". Impact: ${proposal.impact}.`,
    };
  }

  /**
   * Derive the metric name for a proposal target.
   */
  private deriveMetric(proposal: OptimizationProposal): string {
    const metricMap: Record<string, string> = {
      "crie-heuristics": "intent-accuracy",
      "irde-weighting": "recommendation-acceptance-rate",
      "uob-planning": "plan-completeness",
      "capability-prioritization": "discovery-latency",
      "execution-policy": "execution-success-rate",
      "provider-selection": "provider-reliability-score",
      "search-refinement": "search-relevance-score",
      "latency-optimization": "average-latency-ms",
      "ux-optimization": "satisfaction-score",
    };
    return metricMap[proposal.target] || "improvement-score";
  }

  /**
   * Estimate the baseline value for the metric.
   */
  private estimateBaseline(proposal: OptimizationProposal): number {
    const baselineMap: Record<string, number> = {
      "intent-accuracy": 0.7,
      "recommendation-acceptance-rate": 0.5,
      "plan-completeness": 0.85,
      "discovery-latency": 500,
      "execution-success-rate": 0.9,
      "provider-reliability-score": 0.75,
      "search-relevance-score": 0.6,
      "average-latency-ms": 1500,
      "satisfaction-score": 3.5,
      "improvement-score": 0.5,
    };
    return baselineMap[this.deriveMetric(proposal)] ?? 0.5;
  }

  /**
   * Estimate the expected value after applying the proposal.
   */
  private estimateExpected(proposal: OptimizationProposal, baseline: number): number {
    const impactMultiplier: Record<ProposalImpact, number> = {
      low: 1.05,
      medium: 1.15,
      high: 1.3,
      critical: 1.5,
    };
    const multiplier = impactMultiplier[proposal.impact];
    // For latency metrics, lower is better.
    if (this.deriveMetric(proposal).includes("latency")) {
      return baseline / multiplier;
    }
    return baseline * multiplier;
  }

  /**
   * Estimate confidence in the evaluation based on the proposal's supporting
   * patterns.
   */
  private estimateConfidence(proposal: OptimizationProposal): number {
    // More supporting patterns = higher confidence.
    const patternCount = proposal.motivatedByPatterns.length;
    return Math.min(0.95, 0.4 + patternCount * 0.15);
  }

  /**
   * Identify risks in the proposal.
   */
  private identifyRisks(proposal: OptimizationProposal): string[] {
    const risks: string[] = [];

    // High-impact changes carry more risk.
    if (proposal.impact === "critical") {
      risks.push("critical-impact: changes affect core platform behavior");
    }

    // Proposals that aren't reversible are risky.
    if (!proposal.governance.reversible) {
      risks.push("irreversible: change cannot be rolled back");
    }

    // Proposals targeting execution policy affect TEE reliability.
    if (proposal.target === "execution-policy") {
      risks.push("execution-affecting: may change TEE retry/compensation behavior");
    }

    // Proposals targeting CRIE affect intent detection for ALL users.
    if (proposal.target === "crie-heuristics") {
      risks.push("global-impact: affects intent detection for all users");
    }

    return risks;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalEvaluationFramework = new EvaluationFramework();

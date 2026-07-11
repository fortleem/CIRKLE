// @ts-nocheck
/**
 * CIRKLE Brain AI — LIEE Optimization Proposal Engine
 * ============================================================================
 *
 * Phase 7 — Learning & Intelligence Evolution Engine
 *
 * Generates governed optimization proposals from detected patterns.
 *
 * CRITICAL CONSTITUTIONAL RULE: LIEE PROPOSES improvements; it NEVER
 * automatically applies them. Human approval is required before deployment.
 *
 * Proposals target:
 *   - CRIE heuristics (intent detection, constraint analysis)
 *   - IRDE weighting (factor weights per domain)
 *   - UOB planning (ordering rules, fallback strategies)
 *   - Capability prioritization (registry priority)
 *   - Execution policies (TEE retry, timeout, compensation)
 *   - Provider selection (AI provider routing)
 *   - Search refinement, latency optimization, UX optimization
 *
 * Each proposal includes:
 *   - The patterns that motivate it
 *   - The expected improvement
 *   - The proposed change (structured, for review)
 *   - Governance metadata (requires human approval, reversible, versioned)
 * ============================================================================
 */

import type { LearningPattern, OptimizationProposal, ProposalTarget, ProposalImpact } from "./types";

// ── Proposal Engine ──────────────────────────────────────────────────────

export class ProposalEngine {
  private proposals: OptimizationProposal[] = [];

  /**
   * Generate proposals from detected patterns.
   * Each pattern may generate 0 or 1 proposals.
   */
  generate(patterns: LearningPattern[]): OptimizationProposal[] {
    const newProposals: OptimizationProposal[] = [];

    for (const pattern of patterns) {
      const proposal = this.patternToProposal(pattern);
      if (proposal) {
        newProposals.push(proposal);
        this.proposals.push(proposal);
      }
    }

    return newProposals;
  }

  /**
   * Convert a pattern into an optimization proposal.
   * Returns null if the pattern doesn't warrant a proposal.
   */
  private patternToProposal(pattern: LearningPattern): OptimizationProposal | null {
    const now = new Date().toISOString();

    switch (pattern.type) {
      case "common-failure": {
        const target = pattern.data.target as string;
        return {
          proposalId: `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          target: "execution-policy",
          title: `Add fallback for frequently-failing capability "${target}"`,
          description: `Capability "${target}" has failed ${pattern.frequency} times. Consider adding an alternative capability or fallback in the UOB execution plan.`,
          motivatedByPatterns: [pattern.patternId],
          expectedImprovement: `Reduce execution failures by ${Math.round(pattern.frequency * 10)}% for workflows involving "${target}".`,
          impact: pattern.frequency >= 5 ? "high" : "medium",
          status: "proposed",
          proposedChange: {
            type: "add-fallback",
            capabilityId: target,
            suggestedAlternative: "See ALTERNATIVE_RULES in heuristics.ts",
            trigger: `failure-rate > ${(pattern.frequency * 0.1).toFixed(2)}`,
          },
          governance: {
            requiresHumanApproval: true,
            reversible: true,
            version: 1,
            auditTrail: [{ timestamp: now, event: "created", actor: "liee", notes: "Auto-generated from failure pattern" }],
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      case "clarification-repeat": {
        const subject = pattern.data.subject as string;
        return {
          proposalId: `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          target: "crie-heuristics",
          title: `Improve intent detection for "${subject}"`,
          description: `Users repeatedly request clarification about "${subject}" (${pattern.frequency} times). CRIE's intent detection should be refined to recognize this pattern without clarification.`,
          motivatedByPatterns: [pattern.patternId],
          expectedImprovement: `Reduce clarification requests for "${subject}" by 50-70%.`,
          impact: pattern.frequency >= 5 ? "high" : "medium",
          status: "proposed",
          proposedChange: {
            type: "add-intent-keyword",
            subject,
            suggestedKeywords: [subject.toLowerCase()],
            targetIntent: "answer",
          },
          governance: {
            requiresHumanApproval: true,
            reversible: true,
            version: 1,
            auditTrail: [{ timestamp: now, event: "created", actor: "liee", notes: "Auto-generated from clarification pattern" }],
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      case "latency-pattern": {
        const capId = pattern.data.capabilityId as string;
        const avgLatency = pattern.data.averageLatencyMs as number;
        return {
          proposalId: `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          target: "latency-optimization",
          title: `Optimize latency for "${capId}"`,
          description: `Capability "${capId}" has average latency ${Math.round(avgLatency)}ms (avg score: ${pattern.data.averageScore?.toFixed(2)}). Consider caching, provider switching, or timeout adjustment.`,
          motivatedByPatterns: [pattern.patternId],
          expectedImprovement: `Reduce average latency by 30-50% for "${capId}".`,
          impact: avgLatency > 3000 ? "high" : "medium",
          status: "proposed",
          proposedChange: {
            type: "latency-optimization",
            capabilityId: capId,
            currentLatencyMs: avgLatency,
            suggestedActions: ["cache-results", "switch-provider", "adjust-timeout"],
          },
          governance: {
            requiresHumanApproval: true,
            reversible: true,
            version: 1,
            auditTrail: [{ timestamp: now, event: "created", actor: "liee", notes: "Auto-generated from latency pattern" }],
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      case "high-performing-strategy": {
        const workspace = pattern.data.workspace as string;
        const avgScore = pattern.data.averageScore as number;
        return {
          proposalId: `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          target: "uob-planning",
          title: `Promote high-performing "${workspace}" orchestration strategy`,
          description: `Workspace "${workspace}" has ${pattern.frequency} successful executions with avg score ${avgScore.toFixed(2)}. Consider promoting this strategy in UOB planning heuristics.`,
          motivatedByPatterns: [pattern.patternId],
          expectedImprovement: `Improve overall execution success rate for "${workspace}" workflows by 10-20%.`,
          impact: "medium",
          status: "proposed",
          proposedChange: {
            type: "promote-strategy",
            workspace,
            averageScore: avgScore,
            suggestedAction: "Boost priority of this workspace's ordering rules",
          },
          governance: {
            requiresHumanApproval: true,
            reversible: true,
            version: 1,
            auditTrail: [{ timestamp: now, event: "created", actor: "liee", notes: "Auto-generated from high-performance pattern" }],
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      case "capability-adoption": {
        const capId = pattern.data.capabilityId as string;
        const usageCount = pattern.data.usageCount as number;
        return {
          proposalId: `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          target: "capability-prioritization",
          title: `Prioritize high-adoption capability "${capId}"`,
          description: `Capability "${capId}" is used ${usageCount} times. Consider prioritizing it in capability discovery + UOB selection heuristics.`,
          motivatedByPatterns: [pattern.patternId],
          expectedImprovement: `Faster discovery + selection of "${capId}" for common workflows.`,
          impact: usageCount >= 10 ? "medium" : "low",
          status: "proposed",
          proposedChange: {
            type: "boost-priority",
            capabilityId: capId,
            usageCount,
          },
          governance: {
            requiresHumanApproval: true,
            reversible: true,
            version: 1,
            auditTrail: [{ timestamp: now, event: "created", actor: "liee", notes: "Auto-generated from adoption pattern" }],
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      case "provider-performance": {
        const provider = pattern.data.provider as string;
        const avgScore = pattern.data.averageScore as number;
        if (avgScore < 0.4) {
          return {
            proposalId: `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            target: "provider-selection",
            title: `Demote low-performing provider "${provider}"`,
            description: `Provider "${provider}" has average performance score ${avgScore.toFixed(2)}. Consider demoting it in the provider router priority.`,
            motivatedByPatterns: [pattern.patternId],
            expectedImprovement: `Improve AI response quality by routing away from "${provider}".`,
            impact: avgScore < 0.3 ? "high" : "medium",
            status: "proposed",
            proposedChange: {
              type: "demote-provider",
              provider,
              currentScore: avgScore,
              suggestedAction: "Lower priority in Provider Router",
            },
            governance: {
              requiresHumanApproval: true,
              reversible: true,
              version: 1,
              auditTrail: [{ timestamp: now, event: "created", actor: "liee", notes: "Auto-generated from provider performance pattern" }],
            },
            createdAt: now,
            updatedAt: now,
          };
        }
        return null;
      }

      case "frequent-workflow": {
        const sequence = pattern.data.sequence as string;
        return {
          proposalId: `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          target: "uob-planning",
          title: `Create template for frequent workflow: ${sequence}`,
          description: `Workflow sequence "${sequence}" is used ${pattern.frequency} times. Consider creating a pre-built planning template to reduce planning latency.`,
          motivatedByPatterns: [pattern.patternId],
          expectedImprovement: `Reduce planning latency by 50%+ for this common workflow.`,
          impact: pattern.frequency >= 5 ? "medium" : "low",
          status: "proposed",
          proposedChange: {
            type: "create-template",
            sequence,
            frequency: pattern.frequency,
          },
          governance: {
            requiresHumanApproval: true,
            reversible: true,
            version: 1,
            auditTrail: [{ timestamp: now, event: "created", actor: "liee", notes: "Auto-generated from frequent workflow pattern" }],
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      default:
        return null;
    }
  }

  /**
   * Get all proposals.
   */
  getProposals(): OptimizationProposal[] {
    return [...this.proposals];
  }

  /**
   * Get proposals by status.
   */
  getProposalsByStatus(status: OptimizationProposal["status"]): OptimizationProposal[] {
    return this.proposals.filter((p) => p.status === status);
  }

  /**
   * Get proposals by target.
   */
  getProposalsByTarget(target: ProposalTarget): OptimizationProposal[] {
    return this.proposals.filter((p) => p.target === target);
  }

  /**
   * Get proposal statistics.
   */
  getStats(): {
    total: number;
    byStatus: Record<string, number>;
    byTarget: Record<string, number>;
    byImpact: Record<string, number>;
  } {
    const byStatus: Record<string, number> = {};
    const byTarget: Record<string, number> = {};
    const byImpact: Record<string, number> = {};
    for (const p of this.proposals) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      byTarget[p.target] = (byTarget[p.target] || 0) + 1;
      byImpact[p.impact] = (byImpact[p.impact] || 0) + 1;
    }
    return { total: this.proposals.length, byStatus, byTarget, byImpact };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalProposalEngine = new ProposalEngine();

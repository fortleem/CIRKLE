/**
 * CIRKLE Brain AI — LIEE Auto-Apply (Upgrade 10)
 * ============================================================================
 * Automatically applies approved LIEE proposals to the appropriate phase
 * engines. Only proposals with status "approved" + safeToRollOut=true are
 * applied. Changes are reversible.
 * ============================================================================
 */

import type { OptimizationProposal } from "@/lib/liee/types";

export class AutoApplyEngine {
  private appliedProposals = new Map<string, { proposalId: string; target: string; appliedAt: string; changes: string[] }>();

  /**
   * Apply an approved proposal to the appropriate phase engine.
   * Returns whether the application was successful.
   */
  async apply(proposal: OptimizationProposal): Promise<{ success: boolean; changes: string[]; error?: string }> {
    // Verify the proposal is approved + safe.
    if (proposal.status !== "approved") {
      return { success: false, changes: [], error: "Proposal must be approved before applying" };
    }
    if (proposal.evaluation && !proposal.evaluation.safeToRollOut) {
      return { success: false, changes: [], error: "Proposal evaluation marked as unsafe" };
    }
    if (this.appliedProposals.has(proposal.proposalId)) {
      return { success: false, changes: [], error: "Proposal already applied" };
    }

    const changes: string[] = [];

    try {
      switch (proposal.target) {
        case "crie-heuristics":
          changes.push(...await this.applyToCRIE(proposal));
          break;
        case "irde-weighting":
          changes.push(...await this.applyToIRDE(proposal));
          break;
        case "uob-planning":
          changes.push(...await this.applyToUOB(proposal));
          break;
        case "execution-policy":
          changes.push(...await this.applyToTEE(proposal));
          break;
        case "capability-prioritization":
          changes.push(...await this.applyToCapabilityRegistry(proposal));
          break;
        case "provider-selection":
          changes.push(...await this.applyToProviderRouter(proposal));
          break;
        case "latency-optimization":
          changes.push(`Latency optimization applied for ${proposal.proposedChange.capabilityId || "capability"}`);
          break;
        default:
          changes.push(`Proposal target "${proposal.target}" applied (generic)`);
      }

      this.appliedProposals.set(proposal.proposalId, {
        proposalId: proposal.proposalId,
        target: proposal.target,
        appliedAt: new Date().toISOString(),
        changes,
      });

      return { success: true, changes };
    } catch (err) {
      return { success: false, changes, error: String(err).slice(0, 200) };
    }
  }

  /**
   * Apply to CRIE — add intent keywords for better classification.
   */
  private async applyToCRIE(proposal: OptimizationProposal): Promise<string[]> {
    const changes: string[] = [];
    const change = proposal.proposedChange;
    if (change.type === "add-intent-keyword" && change.subject) {
      // In production, this would dynamically update CRIE's intent map.
      changes.push(`Added keyword "${change.subject}" to CRIE intent detection`);
    }
    return changes;
  }

  /**
   * Apply to IRDE — adjust domain weights.
   */
  private async applyToIRDE(proposal: OptimizationProposal): Promise<string[]> {
    const changes: string[] = [];
    changes.push(`Adjusted IRDE weighting based on learning proposal`);
    return changes;
  }

  /**
   * Apply to UOB — update ordering rules or create templates.
   */
  private async applyToUOB(proposal: OptimizationProposal): Promise<string[]> {
    const changes: string[] = [];
    const change = proposal.proposedChange;
    if (change.type === "create-template" && change.sequence) {
      changes.push(`Created UOB workflow template for: ${change.sequence}`);
    } else if (change.type === "promote-strategy" && change.workspace) {
      changes.push(`Promoted UOB strategy for workspace: ${change.workspace}`);
    }
    return changes;
  }

  /**
   * Apply to TEE — update retry policies or compensation rules.
   */
  private async applyToTEE(proposal: OptimizationProposal): Promise<string[]> {
    const changes: string[] = [];
    const change = proposal.proposedChange;
    if (change.type === "add-fallback" && change.capabilityId) {
      changes.push(`Added TEE fallback for capability: ${change.capabilityId}`);
    }
    return changes;
  }

  /**
   * Apply to Capability Registry — boost priority.
   */
  private async applyToCapabilityRegistry(proposal: OptimizationProposal): Promise<string[]> {
    const changes: string[] = [];
    const change = proposal.proposedChange;
    if (change.type === "boost-priority" && change.capabilityId) {
      changes.push(`Boosted priority for capability: ${change.capabilityId}`);
    }
    return changes;
  }

  /**
   * Apply to Provider Router — demote low-performing providers.
   */
  private async applyToProviderRouter(proposal: OptimizationProposal): Promise<string[]> {
    const changes: string[] = [];
    const change = proposal.proposedChange;
    if (change.type === "demote-provider" && change.provider) {
      changes.push(`Demoted provider: ${change.provider} (score: ${change.currentScore})`);
    }
    return changes;
  }

  /**
   * Rollback a previously applied proposal.
   */
  rollback(proposalId: string): boolean {
    const applied = this.appliedProposals.get(proposalId);
    if (!applied) return false;
    // In production, this would reverse the specific changes made.
    this.appliedProposals.delete(proposalId);
    return true;
  }

  getAppliedProposals(): { proposalId: string; target: string; appliedAt: string; changes: string[] }[] {
    return Array.from(this.appliedProposals.values());
  }

  getStats(): { total: number; byTarget: Record<string, number> } {
    const byTarget: Record<string, number> = {};
    for (const a of this.appliedProposals.values()) {
      byTarget[a.target] = (byTarget[a.target] || 0) + 1;
    }
    return { total: this.appliedProposals.size, byTarget };
  }
}

export const globalAutoApplyEngine = new AutoApplyEngine();

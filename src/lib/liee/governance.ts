/**
 * CIRKLE Brain AI — LIEE Governance Framework
 * ============================================================================
 *
 * Phase 7 — Learning & Intelligence Evolution Engine
 *
 * Ensures all learning outcomes are:
 *   - Explainable (every proposal has a description + motivation)
 *   - Auditable (every governance event is recorded)
 *   - Versioned (proposals have versions; updates increment)
 *   - Reviewable (human reviewers approve/reject)
 *   - Reversible (proposals can be rolled back)
 *   - Policy-compliant (consent + privacy respected)
 *
 * CRITICAL: LIEE PROPOSES but NEVER APPLIES. Human approval is required
 * before any proposal is deployed. This is the Constitutional governance
 * guard.
 * ============================================================================
 */

import type { OptimizationProposal, GovernanceAuditEntry } from "./types";

// ── Governance Framework ─────────────────────────────────────────────────

export class GovernanceFramework {
  /**
   * Submit a proposal for review (transitions to "under-review").
   */
  submitForReview(proposal: OptimizationProposal, reviewer?: string): OptimizationProposal {
    if (proposal.status !== "proposed") {
      throw new Error(`[LIEE Governance] Cannot submit proposal ${proposal.proposalId}: status is ${proposal.status}, expected "proposed"`);
    }
    const entry: GovernanceAuditEntry = {
      timestamp: new Date().toISOString(),
      event: "reviewed",
      actor: reviewer || "system",
      notes: "Submitted for review",
    };
    return {
      ...proposal,
      status: "under-review",
      governance: {
        ...proposal.governance,
        reviewer,
        auditTrail: [...proposal.governance.auditTrail, entry],
      },
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Approve a proposal (transitions to "approved").
   * Requires a human reviewer.
   */
  approve(proposal: OptimizationProposal, reviewer: string, notes?: string): OptimizationProposal {
    if (proposal.status !== "under-review" && proposal.status !== "proposed") {
      throw new Error(`[LIEE Governance] Cannot approve proposal ${proposal.proposalId}: status is ${proposal.status}`);
    }
    if (!reviewer || reviewer === "system") {
      throw new Error("[LIEE Governance] Human reviewer required for approval");
    }
    const entry: GovernanceAuditEntry = {
      timestamp: new Date().toISOString(),
      event: "approved",
      actor: reviewer,
      notes,
    };
    return {
      ...proposal,
      status: "approved",
      governance: {
        ...proposal.governance,
        reviewer,
        reviewedAt: entry.timestamp,
        reviewNotes: notes,
        auditTrail: [...proposal.governance.auditTrail, entry],
      },
      updatedAt: entry.timestamp,
    };
  }

  /**
   * Reject a proposal (transitions to "rejected").
   */
  reject(proposal: OptimizationProposal, reviewer: string, notes?: string): OptimizationProposal {
    if (proposal.status !== "under-review" && proposal.status !== "proposed") {
      throw new Error(`[LIEE Governance] Cannot reject proposal ${proposal.proposalId}: status is ${proposal.status}`);
    }
    const entry: GovernanceAuditEntry = {
      timestamp: new Date().toISOString(),
      event: "rejected",
      actor: reviewer,
      notes,
    };
    return {
      ...proposal,
      status: "rejected",
      governance: {
        ...proposal.governance,
        reviewer,
        reviewedAt: entry.timestamp,
        reviewNotes: notes,
        auditTrail: [...proposal.governance.auditTrail, entry],
      },
      updatedAt: entry.timestamp,
    };
  }

  /**
   * Deploy an approved proposal (transitions to "deployed").
   * In this implementation, deployment is a metadata change only — the
   * actual heuristic update is applied by the owning phase (CRIE/IRDE/UOB/TEE)
   * after the human reviewer triggers it. LIEE never applies the change itself.
   */
  deploy(proposal: OptimizationProposal, reviewer: string): OptimizationProposal {
    if (proposal.status !== "approved") {
      throw new Error(`[LIEE Governance] Cannot deploy proposal ${proposal.proposalId}: status is ${proposal.status}, expected "approved"`);
    }
    const entry: GovernanceAuditEntry = {
      timestamp: new Date().toISOString(),
      event: "deployed",
      actor: reviewer,
      notes: "Proposal deployed (metadata only; owning phase applies the change)",
    };
    return {
      ...proposal,
      status: "deployed",
      governance: {
        ...proposal.governance,
        auditTrail: [...proposal.governance.auditTrail, entry],
      },
      updatedAt: entry.timestamp,
    };
  }

  /**
   * Roll back a deployed proposal (transitions to "rolled-back").
   */
  rollback(proposal: OptimizationProposal, reviewer: string, reason: string): OptimizationProposal {
    if (proposal.status !== "deployed") {
      throw new Error(`[LIEE Governance] Cannot roll back proposal ${proposal.proposalId}: status is ${proposal.status}, expected "deployed"`);
    }
    if (!proposal.governance.reversible) {
      throw new Error(`[LIEE Governance] Cannot roll back proposal ${proposal.proposalId}: marked irreversible`);
    }
    const entry: GovernanceAuditEntry = {
      timestamp: new Date().toISOString(),
      event: "rolled-back",
      actor: reviewer,
      notes: reason,
    };
    return {
      ...proposal,
      status: "rolled-back",
      governance: {
        ...proposal.governance,
        auditTrail: [...proposal.governance.auditTrail, entry],
      },
      updatedAt: entry.timestamp,
    };
  }

  /**
   * Check whether a proposal is ready for deployment (approved + evaluated + safe).
   */
  isReadyForDeployment(proposal: OptimizationProposal): boolean {
    return (
      proposal.status === "approved" &&
      proposal.evaluation?.safeToRollOut === true &&
      proposal.governance.requiresHumanApproval === true &&
      proposal.governance.reviewer !== undefined
    );
  }

  /**
   * Get the full audit trail for a proposal.
   */
  getAuditTrail(proposal: OptimizationProposal): GovernanceAuditEntry[] {
    return [...proposal.governance.auditTrail];
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalGovernanceFramework = new GovernanceFramework();

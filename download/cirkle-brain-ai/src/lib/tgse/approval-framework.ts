/**
 * CIRKLE Brain AI — TGSE Human Approval Framework
 * ============================================================================
 * Configurable approval workflows for high-value payments, government
 * submissions, legal document signing, enterprise approvals, sensitive data
 * access, high-risk AI actions. Execution pauses until approval is received.
 * ============================================================================
 */

import type { ApprovalRequest, ApprovalStatus, ApprovalTrigger, GovernanceTarget } from "./types";

export class HumanApprovalFramework {
  private requests = new Map<string, ApprovalRequest>();

  /**
   * Create an approval request. The action is paused until this is decided.
   */
  request(params: {
    trigger: ApprovalTrigger;
    target: GovernanceTarget;
    actionContext: Record<string, unknown>;
    requiredApproverRole: string;
    escalationChain?: string[];
    expiresInSeconds?: number;
  }): ApprovalRequest {
    const now = new Date();
    const expiresAt = params.expiresInSeconds
      ? new Date(now.getTime() + params.expiresInSeconds * 1000).toISOString()
      : undefined;

    const request: ApprovalRequest = {
      requestId: `approval_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      trigger: params.trigger,
      target: params.target,
      actionContext: params.actionContext,
      requiredApproverRole: params.requiredApproverRole,
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt,
      escalationChain: params.escalationChain || [],
    };

    this.requests.set(request.requestId, request);
    return request;
  }

  /**
   * Approve a request.
   */
  approve(requestId: string, approver: string, notes?: string): ApprovalRequest | null {
    const req = this.requests.get(requestId);
    if (!req || req.status !== "pending") return null;
    req.status = "approved";
    req.approver = approver;
    req.decidedAt = new Date().toISOString();
    req.notes = notes;
    return req;
  }

  /**
   * Reject a request.
   */
  reject(requestId: string, approver: string, notes?: string): ApprovalRequest | null {
    const req = this.requests.get(requestId);
    if (!req || req.status !== "pending") return null;
    req.status = "rejected";
    req.approver = approver;
    req.decidedAt = new Date().toISOString();
    req.notes = notes;
    return req;
  }

  /**
   * Escalate a pending request to the next role in the escalation chain.
   */
  escalate(requestId: string): ApprovalRequest | null {
    const req = this.requests.get(requestId);
    if (!req || req.status !== "pending") return null;
    if (req.escalationChain.length === 0) return null;
    req.requiredApproverRole = req.escalationChain[0];
    req.escalationChain = req.escalationChain.slice(1);
    req.status = "escalated";
    return req;
  }

  /**
   * Check for expired requests and mark them.
   */
  expireStale(): number {
    const now = new Date();
    let expired = 0;
    for (const req of this.requests.values()) {
      if (req.status === "pending" && req.expiresAt && new Date(req.expiresAt) < now) {
        req.status = "expired";
        expired++;
      }
    }
    return expired;
  }

  get(requestId: string): ApprovalRequest | null {
    return this.requests.get(requestId) || null;
  }

  listPending(): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.status === "pending" || r.status === "escalated");
  }

  listByTarget(target: GovernanceTarget): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.target === target);
  }

  getStats(): { total: number; pending: number; approved: number; rejected: number; expired: number; escalated: number } {
    const stats = { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0, escalated: 0 };
    for (const r of this.requests.values()) {
      stats.total++;
      stats[r.status as keyof Omit<typeof stats, "total">]++;
    }
    return stats;
  }
}

export const globalHumanApprovalFramework = new HumanApprovalFramework();

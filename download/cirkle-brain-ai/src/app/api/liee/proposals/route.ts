/**
 * GET /api/liee/proposals
 *
 * List optimization proposals. Supports filtering by status + target.
 *
 * POST /api/liee/proposals
 *
 * Governance actions on proposals: submit, approve, reject, deploy, rollback.
 * Body: { action, proposalId, reviewer?, notes? }
 */
import { NextRequest, NextResponse } from "next/server";
import { globalProposalEngine, globalGovernanceFramework, type ProposalStatus, type ProposalTarget } from "@/lib/liee";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as ProposalStatus | null;
  const target = searchParams.get("target") as ProposalTarget | null;

  let proposals = globalProposalEngine.getProposals();
  if (status) proposals = proposals.filter((p) => p.status === status);
  if (target) proposals = proposals.filter((p) => p.target === target);

  return NextResponse.json({
    count: proposals.length,
    proposals: proposals.map((p) => ({
      proposalId: p.proposalId,
      title: p.title,
      description: p.description,
      target: p.target,
      impact: p.impact,
      status: p.status,
      expectedImprovement: p.expectedImprovement,
      motivatedByPatterns: p.motivatedByPatterns,
      evaluation: p.evaluation,
      governance: {
        requiresHumanApproval: p.governance.requiresHumanApproval,
        reviewer: p.governance.reviewer,
        reviewedAt: p.governance.reviewedAt,
        reversible: p.governance.reversible,
        version: p.governance.version,
        auditTrailCount: p.governance.auditTrail.length,
      },
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as string;
    const proposalId = body.proposalId as string;
    const reviewer = body.reviewer as string;
    const notes = body.notes as string | undefined;

    if (!action || !proposalId) {
      return NextResponse.json({ error: "action and proposalId are required" }, { status: 400 });
    }

    const proposal = globalProposalEngine.getProposals().find((p) => p.proposalId === proposalId);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found", proposalId }, { status: 404 });
    }

    let updated;
    switch (action) {
      case "submit":
        updated = globalGovernanceFramework.submitForReview(proposal, reviewer);
        break;
      case "approve":
        if (!reviewer || reviewer === "system") {
          return NextResponse.json({ error: "Human reviewer required for approval" }, { status: 400 });
        }
        updated = globalGovernanceFramework.approve(proposal, reviewer, notes);
        break;
      case "reject":
        updated = globalGovernanceFramework.reject(proposal, reviewer || "system", notes);
        break;
      case "deploy":
        if (!reviewer || reviewer === "system") {
          return NextResponse.json({ error: "Human reviewer required for deployment" }, { status: 400 });
        }
        updated = globalGovernanceFramework.deploy(proposal, reviewer);
        break;
      case "rollback":
        if (!reviewer) {
          return NextResponse.json({ error: "Reviewer required for rollback" }, { status: 400 });
        }
        updated = globalGovernanceFramework.rollback(proposal, reviewer, notes || "No reason provided");
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Update the proposal in the engine (replace the old one).
    const allProposals = globalProposalEngine.getProposals();
    const idx = allProposals.findIndex((p) => p.proposalId === proposalId);
    if (idx >= 0) {
      allProposals[idx] = updated;
    }

    return NextResponse.json({
      proposalId: updated.proposalId,
      status: updated.status,
      governance: {
        reviewer: updated.governance.reviewer,
        reviewedAt: updated.governance.reviewedAt,
        auditTrail: updated.governance.auditTrail,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Governance action failed", detail: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}

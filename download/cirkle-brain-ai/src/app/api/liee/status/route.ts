import { NextResponse } from "next/server";

export async function GET() {
  const { globalLIEEEngine } = await import("@/lib/liee");
  const { globalFeedbackCollector } = await import("@/lib/liee/feedback-collector");
  const { globalProposalEngine } = await import("@/lib/liee/proposal-engine");

  const lieeStatus = globalLIEEEngine.status();
  const feedbackStats = await globalFeedbackCollector.getStats();
  const proposalStats = globalProposalEngine.getStats();

  return NextResponse.json(
    {
      ...lieeStatus,
      name: "Learning & Intelligence Evolution Engine",
      cognitiveMaturityLevel: 7,
      cognitiveMaturityName: "Adaptive Intelligence",
      learningPipeline: [
        "Feedback Collection (6 pipelines)",
        "Signal Normalization",
        "Pattern Detection (9 pattern types)",
        "Optimization Proposal Generation (9 targets)",
        "Proposal Evaluation",
        "Governance (propose → review → approve/reject → deploy → rollback)",
        "Shared Context Update",
      ],
      feedbackPipelines: ["explicit", "implicit", "behavioral", "operational", "execution", "satisfaction"],
      patternTypes: ["frequent-workflow", "common-failure", "clarification-repeat", "high-performing-strategy", "usage-trend", "capability-adoption", "preference-evolution", "latency-pattern", "provider-performance"],
      proposalTargets: ["crie-heuristics", "irde-weighting", "uob-planning", "capability-prioritization", "execution-policy", "provider-selection", "search-refinement", "latency-optimization", "ux-optimization"],
      ownsLearningContextSection: true,
      neverAppliesProposals: true,
      feedbackStats,
      proposalStats,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}

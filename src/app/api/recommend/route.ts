import { NextRequest, NextResponse } from "next/server";
import { globalIRDE, type CandidateEntity, type RecommendationContext, type RecommendationDomain, type FeedbackType } from "@/lib/irde-engine";

/**
 * POST /api/recommend
 *
 * The Intelligent Recommendation & Decision Engine (IRDE) endpoint.
 * Receives candidates from GCIE + context from CRIE → returns scored, explainable recommendations.
 *
 * Body:
 *   { action: "recommend", candidates, context, limit }
 *   { action: "feedback", userId, entityId, domain, type, rating? }
 *   { action: "alternatives", rejected, candidates, context, limit }
 *   { action: "stats", userId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "recommend";

    if (action === "recommend") {
      const { candidates, context, limit } = body;
      if (!candidates || !Array.isArray(candidates) || !context) {
        return NextResponse.json({ error: "candidates array and context required" }, { status: 400 });
      }
      const recommendations = globalIRDE.recommend(
        candidates as CandidateEntity[],
        context as RecommendationContext,
        limit || 5,
      );
      return NextResponse.json({ recommendations, count: recommendations.length });
    }

    if (action === "feedback") {
      const { userId, entityId, domain, type, rating } = body;
      if (!userId || !entityId || !type) {
        return NextResponse.json({ error: "userId, entityId, type required" }, { status: 400 });
      }
      globalIRDE.recordFeedback({
        userId, entityId,
        domain: domain || "general",
        type: type as FeedbackType,
        rating: rating || undefined,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true, stats: globalIRDE.getStats(userId) });
    }

    if (action === "alternatives") {
      const { rejected, candidates, context, limit } = body;
      if (!rejected || !candidates || !context) {
        return NextResponse.json({ error: "rejected, candidates, context required" }, { status: 400 });
      }
      const alternatives = globalIRDE.generateAlternatives(
        rejected as CandidateEntity,
        candidates as CandidateEntity[],
        context as RecommendationContext,
        limit || 3,
      );
      return NextResponse.json({ alternatives, count: alternatives.length });
    }

    if (action === "stats") {
      const { userId } = body;
      return NextResponse.json(globalIRDE.getStats(userId || "anonymous"));
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[IRDE] Error:", String(err).slice(0, 200));
    return NextResponse.json({ error: "Recommendation failed", detail: String(err).slice(0, 200) }, { status: 500 });
  }
}

/**
 * POST /api/liee/feedback
 *
 * Submit feedback to LIEE. Supports explicit, implicit, behavioral, and
 * satisfaction feedback. Execution + operational feedback is auto-collected
 * from TEE execution outcomes via the LIEE engine.
 *
 * Body:
 *   {
 *     pipeline: "explicit" | "implicit" | "behavioral" | "satisfaction",
 *     sourcePhase: string,
 *     userId?: string,
 *     targetEntityId?: string,
 *     targetType: "recommendation" | "capability" | "plan" | "step" | "workflow" | "search" | "navigation" | "provider",
 *     raw: { ... },  // pipeline-specific raw data
 *     consentGranted: boolean,
 *     sharedContext?: SharedContext,  // optional, for learning context update
 *     detectPatterns?: boolean,
 *     generateProposals?: boolean
 *   }
 *
 * Returns: { feedbackId, feedbackStats, patternsDetected?, proposalsGenerated? }
 */
import { NextRequest, NextResponse } from "next/server";
import { globalLIEEEngine, globalFeedbackCollector, type FeedbackPipeline, type FeedbackSignal } from "@/lib/liee";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const pipeline = body.pipeline as FeedbackPipeline;
    if (!pipeline) {
      return NextResponse.json({ error: "pipeline is required" }, { status: 400 });
    }

    // Build the feedback signal.
    const feedback: FeedbackSignal = {
      feedbackId: `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      pipeline,
      sourcePhase: body.sourcePhase || "user",
      userId: body.userId,
      targetEntityId: body.targetEntityId,
      targetType: body.targetType || "recommendation",
      valence: "neutral",
      normalizedScore: 0.5,
      timestamp: new Date().toISOString(),
      raw: body.raw || {},
      consentGranted: body.consentGranted !== false,
    };

    // Run LIEE (ingest feedback + detect patterns + generate proposals).
    const result = await globalLIEEEngine.learn({
      sharedContext: body.sharedContext || {
        metadata: {
          schemaVersion: 1,
          version: 1,
          correlation: { requestId: `liee_${Date.now().toString(36)}` },
          provenance: [],
          confidence: 0.5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          frozen: false,
        },
        request: {
          originalRequest: "(feedback ingestion)",
          normalizedRequest: "feedback",
          language: "en",
          receivedAt: new Date().toISOString(),
        },
      },
      feedback,
      detectPatterns: body.detectPatterns !== false,
      generateProposals: body.generateProposals !== false,
      learningEnabled: body.consentGranted !== false,
    });

    return NextResponse.json({
      feedbackId: feedback.feedbackId,
      feedbackStats: await globalFeedbackCollector.getStats(),
      patternsDetected: result.patternsDetected.length,
      patterns: result.patternsDetected.slice(0, 10).map((p) => ({
        patternId: p.patternId,
        type: p.type,
        description: p.description,
        frequency: p.frequency,
        confidence: p.confidence,
      })),
      proposalsGenerated: result.proposalsGenerated.length,
      proposals: result.proposalsGenerated.slice(0, 10).map((p) => ({
        proposalId: p.proposalId,
        title: p.title,
        target: p.target,
        impact: p.impact,
        status: p.status,
        safeToRollOut: p.evaluation?.safeToRollOut,
        rolloutRecommendation: p.evaluation?.rolloutRecommendation,
      })),
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "LIEE feedback ingestion failed", detail: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}

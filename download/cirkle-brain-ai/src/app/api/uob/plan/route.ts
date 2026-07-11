/**
 * POST /api/uob/plan
 *
 * Generate an Execution Plan from a user goal.
 *
 * UOB consumes the Shared Context (with prior phase enrichments from
 * GCIE/PMB/CRIE/IRDE) and produces a complete, explainable Execution Plan.
 * The plan is declarative — it contains NO executable code.
 *
 * Body:
 *   {
 *     query: string,              // the user's goal
 *     language?: string,          // default "en"
 *     surface?: string,           // "chat" | "api" | ...
 *     featureTag?: string,        // e.g. "[travel:plan]"
 *     username?: string,
 *     country?: string,
 *     city?: string,
 *     lat?: number, lng?: number,
 *     explicitGoal?: string,      // override the derived goal
 *     candidates?: CandidateEntity[],  // from IRDE (optional)
 *     skipPhases?: string[],      // skip GCIE/PMB/CRIE/IRDE in context prep
 *   }
 *
 * Returns: UOBResult { plan, enrichedContext, latencyMs }
 */
import { NextRequest, NextResponse } from "next/server";
import { globalUOBEngine, type UOBInput } from "@/lib/uob";
import {
  globalContextManager,
  ensureCapabilitiesSeeded,
  runCognitivePipeline,
} from "@/lib/cognitive";
import { globalCRIE } from "@/lib/crie-engine";
import type { CandidateEntity } from "@/lib/irde-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query;
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query (string) is required" }, { status: 400 });
    }

    ensureCapabilitiesSeeded();

    // ── Build the Shared Context via the cognitive pipeline ─────────────
    // This runs GCIE → PMB → CRIE → Cross-Eval → IRDE to produce an
    // enriched context, which UOB then consumes.
    const skip = Array.isArray(body.skipPhases) ? body.skipPhases : [];
    const pipelineResult = await runCognitivePipeline({
      query,
      language: body.language || "en",
      surface: body.surface || "api",
      featureTag: body.featureTag,
      username: body.username,
      country: body.country,
      city: body.city,
      lat: body.lat,
      lng: body.lng,
      candidates: body.candidates as CandidateEntity[] | undefined,
      skip: skip as never,
    });

    // The pipeline already froze the context. UOB needs a non-frozen context
    // to enrich, so we re-create a fresh context with the same prior-phase
    // enrichments and run UOB on it. (The pipeline's freeze is for the
    // pre-UOB view; UOB produces its own frozen context with the platform
    // section.)
    let ctx = globalContextManager.create({
      request: query,
      language: body.language || "en",
      surface: body.surface || "api",
      featureTag: body.featureTag,
    });

    // Re-apply CRIE intent (needed for goal decomposition).
    try {
      const intent = globalCRIE.understandIntent(query, []);
      ctx = globalContextManager.enrich(ctx, "reasoning", {
        intent: intent.primary,
        intentType: intent.primary,
        urgency: intent.urgency,
        constraints: [...intent.constraints, ...intent.hiddenConstraints],
        clarifications: intent.secondary ? [intent.secondary] : [],
        confidence: intent.confidence,
        assumptions: [],
        decisionType: intent.expectedOutput,
      }, "crie", { reason: "CRIE intent for UOB planning" });
    } catch {
      /* non-fatal */
    }

    // Re-apply geographic context if available.
    if (pipelineResult.context.geographic) {
      try {
        ctx = globalContextManager.enrich(ctx, "geographic", pipelineResult.context.geographic, "gcie", { reason: "GCIE context from pipeline" });
      } catch {
        /* non-fatal */
      }
    }

    // Re-apply user context if available.
    if (pipelineResult.context.user) {
      try {
        ctx = globalContextManager.enrich(ctx, "user", pipelineResult.context.user, "pmb", { reason: "PMB context from pipeline" });
      } catch {
        /* non-fatal */
      }
    }

    // Re-apply recommendation context if available.
    if (pipelineResult.context.recommendation) {
      try {
        ctx = globalContextManager.enrich(ctx, "recommendation", pipelineResult.context.recommendation, "irde", { reason: "IRDE context from pipeline" });
      } catch {
        /* non-fatal */
      }
    }

    // ── Run UOB ──────────────────────────────────────────────────────────
    const uobInput: UOBInput = {
      context: ctx,
      explicitGoal: body.explicitGoal,
      candidates: body.candidates,
      workspaceHint: body.workspaceHint,
    };

    const result = await globalUOBEngine.plan(uobInput);

    return NextResponse.json({
      plan: result.plan,
      latencyMs: result.latencyMs,
      // Include a compact debug view of the enriched context (not the full
      // context — that's available via /api/cognitive/context).
      contextDebug: globalContextManager.debug(result.enrichedContext),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "UOB planning failed", detail: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tee/execute
 *
 * Execute an Execution Plan produced by UOB.
 *
 * TEE consumes the plan + Shared Context and executes it safely. In
 * "dry-run" mode (default), capabilities are simulated with no side effects.
 * In "live" mode, real platform services are invoked.
 *
 * Two invocation modes:
 *   1. Provide a pre-generated plan + context (advanced):
 *      { plan, sharedContext, mode?, userId?, autoApprove? }
 *
 *   2. Provide a goal query (simple — TEE runs UOB first, then executes):
 *      { query, language?, country?, city?, lat?, lng?, mode?, userId? }
 *
 * Returns: TEEResult { result, enrichedContext, latencyMs }
 *
 * NOTE: Heavy modules (UOB engine, cognitive pipeline, CRIE) are loaded
 * lazily via dynamic import() ONLY in "query" mode, to keep the initial
 * route compilation lightweight and avoid OOM in memory-constrained
 * environments.
 */
import { NextRequest, NextResponse } from "next/server";
import { globalTEEEngine, type TEEInput } from "@/lib/tee";
import type { ExecutionPlan } from "@/lib/uob/types";
import type { SharedContext } from "@/lib/cognitive/shared-context";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let plan: ExecutionPlan;
    let sharedContext: SharedContext;

    // ── Mode 1: pre-generated plan ──────────────────────────────────────
    if (body.plan && body.sharedContext) {
      plan = body.plan as ExecutionPlan;
      sharedContext = body.sharedContext as SharedContext;
    }
    // ── Mode 2: run UOB first, then execute ─────────────────────────────
    else if (body.query) {
      // Lazy-load heavy modules only when needed.
      const { globalUOBEngine } = await import("@/lib/uob");
      const { globalContextManager, ensureCapabilitiesSeeded, runCognitivePipeline } = await import("@/lib/cognitive");
      const { globalCRIE } = await import("@/lib/crie-engine");

      ensureCapabilitiesSeeded();
      const query = String(body.query);

      // Build the Shared Context via the cognitive pipeline.
      const pipelineResult = await runCognitivePipeline({
        query,
        language: body.language || "en",
        surface: body.surface || "api",
        username: body.username,
        country: body.country,
        city: body.city,
        lat: body.lat,
        lng: body.lng,
      });

      // Re-create a non-frozen context with the pipeline's enrichments.
      let ctx = globalContextManager.create({
        request: query,
        language: body.language || "en",
        surface: body.surface || "api",
      });

      // Re-apply CRIE intent.
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
        }, "crie", { reason: "CRIE intent for UOB+TEE" });
      } catch {
        /* non-fatal */
      }

      // Re-apply geographic context.
      if (pipelineResult.context.geographic) {
        try {
          ctx = globalContextManager.enrich(ctx, "geographic", pipelineResult.context.geographic, "gcie", { reason: "GCIE context" });
        } catch { /* non-fatal */ }
      }

      // Run UOB to generate the plan.
      const uobResult = await globalUOBEngine.plan({ context: ctx });
      plan = uobResult.plan;
      sharedContext = uobResult.enrichedContext;
    } else {
      return NextResponse.json(
        { error: "Either { plan, sharedContext } or { query } is required" },
        { status: 400 },
      );
    }

    // ── Run TEE ──────────────────────────────────────────────────────────
    const teeInput: TEEInput = {
      plan,
      sharedContext,
      mode: body.mode || "dry-run",
      userId: body.userId,
      autoApprove: body.autoApprove,
      stepTimeoutMs: body.stepTimeoutMs,
    };

    const result = await globalTEEEngine.execute(teeInput);

    // Return a compact view (the full audit trail can be large).
    return NextResponse.json({
      result: {
        executionId: result.result.executionId,
        planId: result.result.planId,
        state: result.result.state,
        startedAt: result.result.startedAt,
        completedAt: result.result.completedAt,
        totalDurationMs: result.result.totalDurationMs,
        dryRun: result.result.dryRun,
        summary: result.result.summary,
        errors: result.result.errors,
        steps: result.result.steps.map((s) => ({
          stepId: s.stepId,
          capabilityId: s.capabilityId,
          state: s.state,
          attempts: s.attempt,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          error: s.error,
          resultSuccess: s.result?.success,
          resultExecutor: s.result?.executor,
          resultLatencyMs: s.result?.latencyMs,
          resultOutput: s.result?.output,
        })),
        telemetry: result.result.telemetry,
        auditTrailCount: result.result.auditTrail.length,
      },
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "TEE execution failed", detail: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cognitive/context
 *
 * Context Manager API. Supports the full Shared Context lifecycle for
 * diagnostics, replay, and the optional Cognitive Pipeline.
 *
 * Body actions:
 *   { action: "create", request, language?, surface?, featureTag?, sessionId? }
 *     → { context }  (fresh, version 1)
 *
 *   { action: "enrich", context, section, contribution, owner, mode?, reason? }
 *     → { context, validation }  (ownership-enforced, immutable)
 *
 *   { action: "validate", context }
 *     → { validation }
 *
 *   { action: "freeze", context }
 *     → { context }  (frozen, terminal)
 *
 *   { action: "trace", context }
 *     → { trace }
 *
 *   { action: "debug", context }
 *     → { debug }
 *
 *   { action: "pipeline", query, language?, username?, country?, city?, lat?, lng?, candidates?, limit?, skip? }
 *     → { context, trace, debug, topRecommendation?, relevantCapabilities? }
 *     Runs the full Cognitive Pipeline (create → GCIE → PMB → CRIE → Cross-Eval → IRDE → freeze)
 *     and returns the enriched Shared Context + provenance trail. This is the
 *     primary observability + replay endpoint for Phase 4.5.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  globalContextManager,
  ensureCapabilitiesSeeded,
  runCognitivePipeline,
  type SharedContext,
  type ContextSectionKey,
  type ContextSectionOwner,
} from "@/lib/cognitive";
import type { CandidateEntity } from "@/lib/irde-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "pipeline";

    if (action === "create") {
      const ctx = globalContextManager.create({
        request: body.request,
        language: body.language,
        surface: body.surface,
        featureTag: body.featureTag,
        sessionId: body.sessionId,
      });
      return NextResponse.json({ context: ctx });
    }

    if (action === "enrich") {
      const ctx = body.context as SharedContext;
      if (!ctx) return NextResponse.json({ error: "context required" }, { status: 400 });
      try {
        const next = globalContextManager.enrich(
          ctx,
          body.section as ContextSectionKey,
          body.contribution,
          body.owner as ContextSectionOwner,
          { mode: body.mode, reason: body.reason },
        );
        return NextResponse.json({ context: next, validation: globalContextManager.validate(next) });
      } catch (err) {
        return NextResponse.json({ error: "Enrichment failed", detail: String(err).slice(0, 200) }, { status: 422 });
      }
    }

    if (action === "validate") {
      return NextResponse.json({ validation: globalContextManager.validate(body.context as SharedContext) });
    }

    if (action === "freeze") {
      return NextResponse.json({ context: globalContextManager.freeze(body.context as SharedContext) });
    }

    if (action === "trace") {
      return NextResponse.json({ trace: globalContextManager.trace(body.context as SharedContext) });
    }

    if (action === "debug") {
      return NextResponse.json({ debug: globalContextManager.debug(body.context as SharedContext) });
    }

    if (action === "pipeline") {
      ensureCapabilitiesSeeded();
      const result = await runCognitivePipeline({
        query: body.query,
        language: body.language,
        surface: body.surface || "api",
        featureTag: body.featureTag,
        username: body.username,
        country: body.country,
        city: body.city,
        lat: body.lat,
        lng: body.lng,
        candidates: body.candidates as CandidateEntity[] | undefined,
        limit: body.limit,
        skip: body.skip,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Cognitive context API failed", detail: String(err).slice(0, 200) }, { status: 500 });
  }
}

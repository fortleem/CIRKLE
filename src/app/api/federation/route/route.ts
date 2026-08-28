// @ts-nocheck
/**
 * POST /api/federation/route
 * ============================================================================
 * Smart Citizen Routing endpoint.
 *
 * Body:
 *   { text, tags?, locationHint?, urgency?, preselectedInstitutionId? }
 *
 * Returns a RoutingDecision. This endpoint never performs a dispatch —
 * it produces the decision (pathway, target institution, official
 * channel, SLA target, escalation tier, alternates). Dispatch / referral
 * is the responsibility of the receiving institution's adapter or, in
 * the absence of an active adapter, of the citizen using the surfaced
 * official channel (Level 0 fallback).
 *
 * Critical invariants enforced here (and in the router):
 *   • Emergency pathway NEVER routes to ACA.
 *   • Integrity pathway routes to ACA as a Signal, NEVER as a Case.
 *   • Service pathway routes to the responsible government service.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { routeRequest } from "@/lib/federation-router";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

async function routeRequestHandler(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
      return NextResponse.json({ error: "missing_text" }, { status: 400 });
    }
    const allowedUrgency = new Set(["low", "medium", "high", "critical"]);
    const urgency = body.urgency && allowedUrgency.has(body.urgency) ? body.urgency : undefined;

    const decision = await routeRequest({
      text: body.text,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      locationHint: typeof body.locationHint === "string" ? body.locationHint : undefined,
      urgency,
      preselectedInstitutionId:
        typeof body.preselectedInstitutionId === "string"
          ? body.preselectedInstitutionId
          : undefined,
    });

    return NextResponse.json(
      { decision },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_route_request", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

// P1 FIX: Rate-limited to prevent abuse (smart citizen routing — 30 req/min)
export const POST = withRateLimit(routeRequestHandler, {
  maxRequests: 30,
  windowMs: 60_000,
  keyBy: "ip",
});

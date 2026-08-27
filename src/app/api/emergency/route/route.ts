// @ts-nocheck
/**
 * POST /api/emergency/route
 * ============================================================================
 * Smart Citizen Routing — Chapter XXI. Takes a citizen's free-text "I need
 * help" submission and returns the routing decision: pathway (emergency |
 * service | integrity), target institution, official channel, SLA, escalation
 * path, routing reason, and fallback channels.
 *
 * Sovereign rules:
 *   1. No fabricated dispatch — this route returns a DECISION, not a
 *      dispatch. The citizen must explicitly proceed to /api/emergency/packet
 *      to actually send.
 *   2. No silent cross-institutional sharing — the decision is shown to the
 *      citizen before anything is sent.
 *   3. No autonomous Signal-to-Case conversion — when pathway is INTEGRITY,
 *      the target is "ACA Signal intake (reviewable intelligence object —
 *      NOT a case)".
 *   4. No replacement of existing sovereign systems — every officialChannel
 *      is an integration target, marked "Pending verification" until the
 *      institution's registry entry is confirmed.
 *
 * Body:  { text, country?, city?, location?, emergencyTypeHint?, integrityRequested? }
 * Returns:  { ok, result: RoutingResult }
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { routeCitizenRequest } from "@/lib/smart-routing-engine";
import { aiComplete } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "text_required", message: "A non-empty 'text' field is required." },
        { status: 400 },
      );
    }
    if (text.length > 4000) {
      return NextResponse.json(
        { ok: false, error: "text_too_long", message: "Text must be at most 4000 characters." },
        { status: 400 },
      );
    }

    const result = await routeCitizenRequest(
      {
        text,
        country: typeof body.country === "string" ? body.country : undefined,
        city: typeof body.city === "string" ? body.city : undefined,
        location:
          body.location && typeof body.location.lat === "number" && typeof body.location.lng === "number"
            ? {
                lat: body.location.lat,
                lng: body.location.lng,
                accuracy: typeof body.location.accuracy === "number" ? body.location.accuracy : undefined,
              }
            : undefined,
        emergencyTypeHint: body.emergencyTypeHint,
        integrityRequested: Boolean(body.integrityRequested),
      },
      // AI is consulted only as a tiebreaker — see smart-routing-engine.ts.
      aiComplete,
    );

    return NextResponse.json(
      { ok: true, result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "routing_failed", details: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      endpoint: "/api/emergency/route",
      method: "POST",
      description:
        "Smart Citizen Routing — classify a citizen submission into emergency / service / integrity lane and return the routing decision.",
      body: {
        text: "string (required, max 4000 chars) — the citizen's free-text 'I need help' submission.",
        country: "string? — ISO country code, defaults to EG.",
        city: "string? — city name.",
        location: "{ lat: number, lng: number, accuracy?: number }? — only when citizen consents.",
        emergencyTypeHint: "'police'|'medical'|'fire'|'traffic'|'other'? — citizen-selected emergency type.",
        integrityRequested: "boolean? — citizen explicitly requested the integrity lane.",
      },
      returns: {
        ok: "boolean",
        result:
          "RoutingResult — pathway, targetInstitution, officialChannel, sla, escalation, routingReason, fallbackChannels[], classifiedBy, degraded, emergencyType?",
      },
      rules: [
        "No fabricated dispatch — this endpoint returns a DECISION, not a dispatch.",
        "Emergencies NEVER route to ACA. ACA is the integrity lane only.",
        "Integrity lane produces a reviewable ACA Signal — NOT an ACA Case.",
        "Every officialChannel is an integration target, marked 'Pending verification' until the institution's registry entry is confirmed.",
      ],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

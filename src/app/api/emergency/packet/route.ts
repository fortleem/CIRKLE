// @ts-nocheck
/**
 * POST /api/emergency/packet
 * ============================================================================
 * Build + send an emergency packet — Chapter XXV (Emergency Packet) and
 * Chapter XXIII (National Emergency Integration).
 *
 * Constructs the minimum-necessary-information packet from citizen input,
 * routes it to the correct sovereign emergency service based on incident
 * type, and attempts delivery via the fallback hierarchy.
 *
 * Rule 1 (No fabricated dispatch): the returned EmergencyRoute reflects
 * ONLY what the responder has actually returned. If the primary channel is
 * unavailable (integration Pending verification — Chapter LXXXIX), the
 * fallback chain is exercised. The OFFLINE_QUEUE fallback ALWAYS records
 * the packet — even when delivery fails, the report is never silently lost.
 *
 * Body:
 *   { type, citizenDescription, location?, personsAffected?, hazards?, media?, callbackInfo?, safeEvidenceMode?, minInfoOnly? }
 *
 * Returns:
 *   { ok, route: EmergencyRoute }
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { routeEmergency } from "@/lib/emergency-router";
import type { EmergencyType } from "@/lib/smart-routing-engine";
import { DeliveryStatus } from "@/lib/emergency-fallback";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VALID_TYPES: EmergencyType[] = ["police", "medical", "fire", "traffic", "other"];

// In-memory store of recent emergency routes — used by GET /api/emergency/status/[id].
// (Production wires a Prisma model — see the summary file.)
const ROUTE_STORE: Record<string, Awaited<ReturnType<typeof routeEmergency>>> = {};

async function emergencyPacketHandler(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = String(body.type || "").toLowerCase() as EmergencyType;
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { ok: false, error: "invalid_type", message: "type must be one of: police, medical, fire, traffic, other." },
        { status: 400 },
      );
    }
    const citizenDescription = typeof body.citizenDescription === "string" ? body.citizenDescription.trim() : "";
    if (!citizenDescription) {
      return NextResponse.json(
        { ok: false, error: "description_required", message: "citizenDescription is required." },
        { status: 400 },
      );
    }
    if (citizenDescription.length > 2000) {
      return NextResponse.json(
        { ok: false, error: "description_too_long", message: "citizenDescription must be at most 2000 chars." },
        { status: 400 },
      );
    }

    const route = await routeEmergency({
      type,
      citizenDescription,
      location:
        body.location && typeof body.location.lat === "number" && typeof body.location.lng === "number"
          ? {
              lat: body.location.lat,
              lng: body.location.lng,
              accuracy: typeof body.location.accuracy === "number" ? body.location.accuracy : undefined,
              address: typeof body.location.address === "string" ? body.location.address : undefined,
              routeAccess: body.location.routeAccess,
            }
          : undefined,
      personsAffected: typeof body.personsAffected === "number" ? body.personsAffected : undefined,
      hazards: Array.isArray(body.hazards) ? body.hazards.filter((h: any) => typeof h === "string") : undefined,
      media: Array.isArray(body.media)
        ? body.media
            .filter((m: any) => m && typeof m.hash === "string")
            .map((m: any) => ({ kind: m.kind || "image", hash: String(m.hash) }))
        : undefined,
      callbackInfo: body.callbackInfo
        ? {
            phone: typeof body.callbackInfo.phone === "string" ? body.callbackInfo.phone : undefined,
            trustedContact: typeof body.callbackInfo.trustedContact === "string" ? body.callbackInfo.trustedContact : undefined,
            consentToCallback: Boolean(body.callbackInfo.consentToCallback),
          }
        : undefined,
      safeEvidenceMode: Boolean(body.safeEvidenceMode),
      minInfoOnly: body.minInfoOnly === false ? false : true,
    });

    // Persist the route so the citizen can poll status.
    ROUTE_STORE[route.emergencyId] = route;

    // HTTP status code reflects the dispatch outcome — 202 when the packet
    // was recorded but not confirmed (offline queue / status unavailable),
    // 200 when actually transmitted/acknowledged, 503 when hard-failed.
    let httpStatus = 200;
    if (
      route.status === DeliveryStatus.TRANSMITTED ||
      route.status === DeliveryStatus.ACKNOWLEDGED
    ) {
      httpStatus = 200;
    } else if (
      route.status === DeliveryStatus.STATUS_UNAVAILABLE ||
      route.status === DeliveryStatus.FALLBACK_USED
    ) {
      httpStatus = 202; // Accepted — packet recorded, delivery pending.
    } else if (route.status === DeliveryStatus.FAILED) {
      httpStatus = 503;
    }

    return NextResponse.json(
      { ok: true, route },
      { status: httpStatus, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "packet_failed", details: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}

async function emergencyPacketGetHandler(req: NextRequest) {
  return NextResponse.json(
    {
      ok: true,
      endpoint: "/api/emergency/packet",
      method: "POST",
      description:
        "Build and send an emergency packet to the correct sovereign emergency service. Implements the fallback hierarchy (Chapter XXIV) and the no-fabricated-dispatch rule (Chapter XXII §1).",
      body: {
        type: "'police'|'medical'|'fire'|'traffic'|'other' (required)",
        citizenDescription: "string (required, max 2000 chars)",
        location: "{ lat, lng, accuracy?, address?, routeAccess? }? — only when citizen consents",
        personsAffected: "number? — best estimate",
        hazards: "string[]? — visible hazards at the scene",
        media: "{ kind: 'image'|'audio'|'video', hash: string }[]? — SHA-256 hashes only, never raw media",
        callbackInfo: "{ phone?, trustedContact?, consentToCallback? }? — omitted in minInfoOnly mode",
        safeEvidenceMode: "boolean? — citizen is reporting from a safe distance",
        minInfoOnly: "boolean (default true) — when false, the full packet (media/callback/hazards) is sent",
      },
      returns: {
        ok: "boolean",
        route: "EmergencyRoute — emergencyId, type, targetInstitution, targetChannel, packet, status, fallbackUsed, statusNote, timestamp",
      },
      httpStatus: {
        200: "Packet transmitted or acknowledged by the responder.",
        202: "Packet recorded (offline queue / status unavailable) — delivery pending. NEVER fabricated.",
        503: "Hard failure — packet could not be sent or recorded.",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Exported for the status route — allows cross-route access in dev mode.
// (Production replaces ROUTE_STORE with a Prisma model — see summary.)
;(globalThis as any).__CIRKLE_EMERGENCY_ROUTE_STORE__ = ROUTE_STORE;

// P1 FIX: Rate-limited to prevent abuse (emergency packet submission — 10 req/min)
export const POST = withRateLimit(emergencyPacketHandler, {
  maxRequests: 10,
  windowMs: 60_000,
  keyBy: "ip",
});

// P1 FIX: Rate-limited to prevent abuse (emergency packet metadata — 10 req/min)
export const GET = withRateLimit(emergencyPacketGetHandler, {
  maxRequests: 10,
  windowMs: 60_000,
  keyBy: "ip",
});

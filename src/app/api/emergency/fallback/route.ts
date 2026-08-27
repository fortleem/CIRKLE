// @ts-nocheck
/**
 * POST /api/emergency/fallback
 * ============================================================================
 * Trigger a fallback method manually — Chapter XXIV (Emergency Fallback
 * Hierarchy). Used by the citizen UI when the primary delivery method
 * failed and the citizen wants to explicitly retry via the next fallback
 * level (SMS data, telephone, or offline queue).
 *
 * Rule 1 (No fabricated dispatch): the fallback attempt NEVER fabricates a
 * successful dispatch. If the fallback method cannot confirm delivery, it
 * returns STATUS_UNAVAILABLE or FAILED — never TRANSMITTED. The OFFLINE_QUEUE
 * fallback is the only level that may "succeed" without a live responder
 * confirmation: it records the packet for later retransmission and returns
 * FALLBACK_USED (NOT TRANSMITTED) — the citizen sees that their report is
 * recorded, NOT that it has been dispatched.
 *
 * Body:  { emergencyId, level }
 * Returns:  { ok, result: DeliveryAttemptResult, level }
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import {
  attemptDelivery,
  FallbackLevel,
  DeliveryStatus,
  FallbackLabel,
} from "@/lib/emergency-fallback";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VALID_LEVELS = new Set<string>(Object.values(FallbackLevel));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const emergencyId = typeof body.emergencyId === "string" ? body.emergencyId.trim() : "";
    const level = String(body.level || "").toUpperCase() as FallbackLevel;

    if (!emergencyId) {
      return NextResponse.json(
        { ok: false, error: "emergency_id_required", message: "emergencyId is required." },
        { status: 400 },
      );
    }
    if (!VALID_LEVELS.has(level)) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_level",
          message: `level must be one of: ${Object.values(FallbackLevel).join(", ")}.`,
        },
        { status: 400 },
      );
    }

    // Look up the original route (and its packet) from the in-memory store.
    const routeStore = (globalThis as any).__CIRKLE_EMERGENCY_ROUTE_STORE__ || {};
    const route = routeStore[emergencyId];
    if (!route) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_found",
          message:
            "No emergency route found for that emergencyId. The route may have expired from the in-memory store (production persists via the EmergencyRoute Prisma model).",
        },
        { status: 404 },
      );
    }

    const result = await attemptDelivery(level, route.targetChannel, route.packet);

    // Update the stored route's status if the fallback succeeded (Rule 1:
    // only update when the responder actually returned a higher status).
    if (
      result.status === DeliveryStatus.TRANSMITTED ||
      result.status === DeliveryStatus.ACKNOWLEDGED ||
      result.status === DeliveryStatus.FALLBACK_USED
    ) {
      route.status = result.status;
      route.fallbackUsed = level;
      route.statusNote = `${route.statusNote}\n\n[Manual fallback ${new Date().toISOString()}] ${FallbackLabel[level]}: ${result.note}`;
    }

    return NextResponse.json(
      { ok: true, emergencyId, level, label: FallbackLabel[level], result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "fallback_failed", details: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      endpoint: "/api/emergency/fallback",
      method: "POST",
      description:
        "Trigger an emergency fallback method manually. Implements the fallback hierarchy (Chapter XXIV) and the no-fabricated-dispatch rule (Chapter XXII §1).",
      body: {
        emergencyId: "string (required) — the id returned by POST /api/emergency/packet",
        level: "'DIGITAL_CHANNEL'|'ALTERNATIVE_DIGITAL'|'SMS_DATA'|'TELEPHONE'|'OFFLINE_QUEUE' (required)",
      },
      returns: {
        ok: "boolean",
        level: "FallbackLevel — the level that was attempted",
        label: "string — human-readable label",
        result: "DeliveryAttemptResult — { status, fallbackUsed, note }",
      },
      hierarchy: [
        "1. DIGITAL_CHANNEL — primary official digital channel",
        "2. ALTERNATIVE_DIGITAL — alternative official digital channel",
        "3. SMS_DATA — SMS data to the emergency gateway",
        "4. TELEPHONE — voice call to the emergency line",
        "5. OFFLINE_QUEUE — packet recorded locally for retransmission",
      ],
      rules: [
        "NEVER fabricates a successful dispatch.",
        "OFFLINE_QUEUE returns FALLBACK_USED (NOT TRANSMITTED) — the citizen sees their report is recorded, NOT delivered.",
      ],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

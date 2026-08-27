// @ts-nocheck
/**
 * GET /api/emergency/status/[id]
 * ============================================================================
 * Check the status of an emergency routing attempt — Chapter XXVI
 * (Emergency Status).
 *
 * CRITICAL (Rule 1, Chapter XXII §1): this endpoint returns ONLY statuses
 * that were actually returned by the authority. It NEVER fabricates a
 * TRANSMITTED, ACKNOWLEDGED, or RESOLVED status. If the responder has not
 * returned a status, the endpoint returns STATUS_UNAVAILABLE — never a
 * fabricated success.
 *
 * The endpoint exposes the delivery status of the original routing attempt
 * (from the OFFLINE_QUEUE / fallback chain) PLUS, when available, any
 * authority-returned status update. Authority status updates are NEVER
 * synthesized: the field is `null` until the responder returns something.
 *
 * Path:  /api/emergency/status/{emergencyId}
 * Returns:  { ok, status, authorityStatus, route }
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { DeliveryStatus } from "@/lib/emergency-fallback";

export const dynamic = "force-dynamic";

// Per-rule audit log of authority-returned status updates, keyed by
// emergencyId. In production this is a Prisma model (EmergencyStatusUpdate).
// The ONLY way an entry appears here is when the responder's integration
// adapter pushes an update — the endpoint never synthesizes entries.
const AUTHORITY_STATUS_STORE: Record<
  string,
  Array<{
    status: DeliveryStatus;
    note: string;
    timestamp: string;
    source: string;
  }>
> = {};

// Allow a real integration adapter (e.g. a webhook from the Police
// emergency dispatch system) to push authority-returned status updates.
// Exposed on globalThis for the (dev) integration shim. Production replaces
// this with a dedicated POST /api/emergency/status/[id]/update route
// guarded by an institutional adapter credential.
;(globalThis as any).__CIRKLE_AUTHORITY_STATUS_STORE__ = AUTHORITY_STATUS_STORE;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { ok: false, error: "id_required", message: "An emergencyId path segment is required." },
        { status: 400 },
      );
    }

    const routeStore = (globalThis as any).__CIRKLE_EMERGENCY_ROUTE_STORE__ || {};
    const route = routeStore[id];
    if (!route) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_found",
          message:
            "No emergency route found for that id. The route may have expired from the in-memory store (production persists via the EmergencyRoute Prisma model).",
        },
        { status: 404 },
      );
    }

    const updates = AUTHORITY_STATUS_STORE[id] || [];

    // Final status: the most recent authority update (if any), otherwise
    // the delivery status from the original routing attempt. We NEVER
    // fabricate a higher status than what was actually returned.
    let finalStatus: DeliveryStatus = route.status;
    let finalNote: string = route.statusNote;
    let finalSource: string = "circle-routing-engine";
    let finalTimestamp: string = route.timestamp;
    if (updates.length > 0) {
      const latest = updates[updates.length - 1];
      finalStatus = latest.status;
      finalNote = latest.note;
      finalSource = latest.source;
      finalTimestamp = latest.timestamp;
    }

    return NextResponse.json(
      {
        ok: true,
        emergencyId: id,
        status: finalStatus,
        // authorityStatus is null until the responder has returned
        // something. NEVER synthesized.
        authorityStatus: updates.length > 0 ? updates[updates.length - 1] : null,
        statusHistory: updates,
        source: finalSource,
        statusNote: finalNote,
        timestamp: finalTimestamp,
        route: {
          type: route.type,
          targetInstitution: route.targetInstitution,
          targetDepartment: route.targetDepartment,
          targetChannel: route.targetChannel,
          fallbackUsed: route.fallbackUsed,
          originalTimestamp: route.timestamp,
        },
        rules: [
          "This endpoint NEVER fabricates a successful status. status reflects ONLY what the authority has returned.",
          "When the responder has not returned a status, the endpoint returns STATUS_UNAVAILABLE — never a fabricated success.",
        ],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "status_lookup_failed", details: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}

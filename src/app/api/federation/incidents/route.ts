// @ts-nocheck
/**
 * GET  /api/federation/incidents
 * POST /api/federation/incidents
 * ============================================================================
 * Federated Incident Reference — list + create.
 *
 * GET: returns all federated incidents, most-recent first.
 *
 * POST body:
 *   {
 *     incidentType,
 *     coordinatedBy,
 *     initialCaseRef?: { institutionId, caseId, caseType, caseStatus },
 *     correlationId?,
 *     openingNote?
 *   }
 *
 * Creates a federated incident. The federated incident is a *reference*
 * object — it does NOT contain case files. Each participating
 * institution retains its own case under its own namespace. The
 * federated incident only stores references + a unified correlation
 * timeline.
 *
 * Federation ≠ Centralization.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import {
  createFederatedIncident,
  listFederatedIncidents,
  type FederatedIncidentType,
} from "@/lib/federated-incident";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set<FederatedIncidentType>([
  "multi_agency_emergency",
  "mass_casualty",
  "public_safety",
  "disaster_response",
  "cross_jurisdiction_investigation",
  "other",
]);

export async function GET() {
  try {
    const incidents = await listFederatedIncidents();
    return NextResponse.json(
      { total: incidents.length, incidents },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_list_federated_incidents", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    if (!body.incidentType || !ALLOWED_TYPES.has(body.incidentType)) {
      return NextResponse.json(
        { error: "invalid_incidentType", allowed: Array.from(ALLOWED_TYPES) },
        { status: 400 },
      );
    }
    if (!body.coordinatedBy || typeof body.coordinatedBy !== "string") {
      return NextResponse.json({ error: "missing_coordinatedBy" }, { status: 400 });
    }

    let initialCaseRef: any = undefined;
    if (body.initialCaseRef && typeof body.initialCaseRef === "object") {
      const r = body.initialCaseRef;
      if (!r.institutionId || !r.caseId || !r.caseType) {
        return NextResponse.json(
          { error: "invalid_initialCaseRef" },
          { status: 400 },
        );
      }
      const allowedCaseStatus = new Set(["open", "in_progress", "closed", "unknown"]);
      initialCaseRef = {
        institutionId: r.institutionId,
        caseId: r.caseId,
        caseType: r.caseType,
        caseStatus: allowedCaseStatus.has(r.caseStatus) ? r.caseStatus : "unknown",
      };
    }

    const incident = await createFederatedIncident({
      incidentType: body.incidentType,
      coordinatedBy: body.coordinatedBy,
      initialCaseRef,
      correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
      openingNote: typeof body.openingNote === "string" ? body.openingNote : undefined,
    });

    return NextResponse.json({ incident }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_create_federated_incident", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

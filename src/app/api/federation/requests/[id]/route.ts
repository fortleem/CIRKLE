// @ts-nocheck
/**
 * GET  /api/federation/requests/[id]
 * PATCH /api/federation/requests/[id]
 * ============================================================================
 * Inter-Agency Request detail + response.
 *
 * PATCH body — submit-or-respond semantics:
 *
 *   To submit a draft to the receiving institution:
 *     { submit: true }
 *
 *   To respond (receiving institution):
 *     {
 *       status: "received"|"in_review"|"partially_fulfilled"|"fulfilled"|"denied"|"withdrawn"|"expired",
 *       fulfilledRecords?: [{ kind, justification }],
 *       notes?: string,
 *       respondedBy?: string,
 *       denialReason?: string
 *     }
 *
 * The response is appended to the request's `response` field; it does
 * NOT overwrite the request. Provenance of the response is preserved by
 * `respondedAt` + `respondedBy`.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import {
  respondToRequest,
  submitRequest,
  trackRequest,
  type RequestStatus,
} from "@/lib/inter-agency-exchange";

export const dynamic = "force-dynamic";

const ALLOWED_RESPONSE_STATUSES = new Set<RequestStatus>([
  "received", "in_review", "partially_fulfilled",
  "fulfilled", "denied", "withdrawn", "expired",
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }
    const request = await trackRequest(id);
    if (!request) {
      return NextResponse.json({ error: "request_not_found" }, { status: 404 });
    }
    return NextResponse.json(
      { request },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_fetch_request", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    // Submit-a-draft path.
    if (body.submit === true) {
      const request = await submitRequest(id);
      if (!request) {
        return NextResponse.json({ error: "request_not_found" }, { status: 404 });
      }
      return NextResponse.json({ request });
    }

    // Respond path.
    if (!body.status || !ALLOWED_RESPONSE_STATUSES.has(body.status as RequestStatus)) {
      return NextResponse.json(
        { error: "invalid_status", allowed: Array.from(ALLOWED_RESPONSE_STATUSES) },
        { status: 400 },
      );
    }
    let fulfilledRecords: any = undefined;
    if (Array.isArray(body.fulfilledRecords)) {
      fulfilledRecords = body.fulfilledRecords.filter(
        (r: any) => r && typeof r.kind === "string" && typeof r.justification === "string",
      );
    }

    const request = await respondToRequest(id, {
      status: body.status,
      fulfilledRecords,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      respondedBy: typeof body.respondedBy === "string" ? body.respondedBy : undefined,
      denialReason: typeof body.denialReason === "string" ? body.denialReason : undefined,
    });
    if (!request) {
      return NextResponse.json({ error: "request_not_found" }, { status: 404 });
    }
    return NextResponse.json({ request });
  } catch (err) {
    const msg = String(err?.message || err).slice(0, 240);
    if (msg.startsWith("invalid_response_status")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json(
      { error: "failed_to_respond_to_request", details: msg },
      { status: 500 },
    );
  }
}

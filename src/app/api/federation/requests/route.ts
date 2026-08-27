// @ts-nocheck
/**
 * GET  /api/federation/requests
 * POST /api/federation/requests
 * ============================================================================
 * Inter-Agency Exchange Requests — list + create.
 *
 * GET query params:
 *   ?requestingInstitution=
 *   ?receivingInstitution=
 *   ?status=
 *
 * POST body:
 *   {
 *     requestingInstitution, receivingInstitution,
 *     case: { caseId, caseType, institutionNamespace },
 *     purpose, requestedRecords: [{ kind, justification, from?, to?, recordId? }],
 *     legalAuthority, deadline,
 *     confidentiality?, retention?, exportRestriction?
 *   }
 *
 * Creates a *draft* request. The request is not visible to the receiving
 * institution until /api/federation/requests/[id] PATCH transitions it
 * to `submitted`. The minimum-necessary principle is enforced:
 *   • requestedRecords must enumerate at least one record
 *   • each record must carry a meaningful justification (>= 8 chars)
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import {
  createRequest,
  listRequests,
  type RequestStatus,
  type ConfidentialityTier,
} from "@/lib/inter-agency-exchange";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set<RequestStatus>([
  "draft", "submitted", "received", "in_review",
  "partially_fulfilled", "fulfilled", "denied",
  "withdrawn", "expired",
]);
const ALLOWED_CONF = new Set<ConfidentialityTier>([
  "public", "restricted", "confidential", "secret",
]);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const requestingInstitution = url.searchParams.get("requestingInstitution")?.trim() || "";
    const receivingInstitution = url.searchParams.get("receivingInstitution")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";

    const filter: any = {};
    if (requestingInstitution) filter.requestingInstitution = requestingInstitution;
    if (receivingInstitution) filter.receivingInstitution = receivingInstitution;
    if (status && ALLOWED_STATUSES.has(status as RequestStatus)) filter.status = status;

    const requests = await listRequests(filter);
    return NextResponse.json(
      { total: requests.length, requests },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_list_requests", details: String(err).slice(0, 200) },
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
    if (!body.requestingInstitution || typeof body.requestingInstitution !== "string") {
      return NextResponse.json({ error: "missing_requestingInstitution" }, { status: 400 });
    }
    if (!body.receivingInstitution || typeof body.receivingInstitution !== "string") {
      return NextResponse.json({ error: "missing_receivingInstitution" }, { status: 400 });
    }
    if (body.requestingInstitution === body.receivingInstitution) {
      return NextResponse.json(
        { error: "self_request_not_allowed" },
        { status: 400 },
      );
    }
    if (!body.case || typeof body.case !== "object" || !body.case.caseId || !body.case.caseType || !body.case.institutionNamespace) {
      return NextResponse.json({ error: "missing_or_invalid_case" }, { status: 400 });
    }
    if (!Array.isArray(body.requestedRecords) || body.requestedRecords.length === 0) {
      return NextResponse.json(
        { error: "minimum_necessary_violation: requestedRecords must enumerate at least one record" },
        { status: 400 },
      );
    }
    for (const r of body.requestedRecords) {
      if (!r || typeof r.kind !== "string" || typeof r.justification !== "string" || r.justification.trim().length < 8) {
        return NextResponse.json(
          { error: `minimum_necessary_violation: record kind "${r?.kind || "?"}" lacks a meaningful justification (>= 8 chars)` },
          { status: 400 },
        );
      }
    }
    if (!body.legalAuthority || typeof body.legalAuthority !== "string") {
      return NextResponse.json({ error: "missing_legalAuthority" }, { status: 400 });
    }
    if (!body.deadline || typeof body.deadline !== "string") {
      return NextResponse.json({ error: "missing_deadline" }, { status: 400 });
    }

    const request = await createRequest({
      requestingInstitution: body.requestingInstitution,
      receivingInstitution: body.receivingInstitution,
      caseId: body.case.caseId,
      caseType: body.case.caseType,
      institutionNamespace: body.case.institutionNamespace,
      purpose: typeof body.purpose === "string" ? body.purpose : "",
      requestedRecords: body.requestedRecords,
      legalAuthority: body.legalAuthority,
      deadline: body.deadline,
      confidentiality: body.confidentiality && ALLOWED_CONF.has(body.confidentiality)
        ? body.confidentiality
        : "restricted",
      retention: typeof body.retention === "string" ? body.retention : "until_case_close",
      exportRestriction: typeof body.exportRestriction === "boolean" ? body.exportRestriction : true,
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    const msg = String(err?.message || err).slice(0, 240);
    if (msg.startsWith("minimum_necessary_violation")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json(
      { error: "failed_to_create_request", details: msg },
      { status: 500 },
    );
  }
}

// @ts-nocheck
/**
 * GET  /api/federation/referrals
 * POST /api/federation/referrals
 * ============================================================================
 * Inter-Agency Referral list + create.
 *
 * GET query params:
 *   ?fromInstitution=   — filter by originating institution id
 *   ?toInstitution=     — filter by receiving institution id
 *   ?status=            — filter by ReferralStatus
 *
 * POST body:
 *   { fromInstitution, toInstitution, citizenSubmission, fromCaseId?, purpose }
 *
 * Creates a referral record with a fresh correlationId. No records are
 * transferred at creation time — record transfer happens via a separate
 * InterAgencyRequest. Each institution retains its own case under its
 * own namespace; the referral only carries the correlation identifier.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import {
  createReferral,
  listReferrals,
  type ReferralStatus,
} from "@/lib/inter-agency-exchange";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set<ReferralStatus>([
  "pending", "acknowledged", "responded", "completed", "rejected", "failed",
]);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const fromInstitution = url.searchParams.get("fromInstitution")?.trim() || "";
    const toInstitution = url.searchParams.get("toInstitution")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";

    const filter: any = {};
    if (fromInstitution) filter.fromInstitution = fromInstitution;
    if (toInstitution) filter.toInstitution = toInstitution;
    if (status && ALLOWED_STATUSES.has(status as ReferralStatus)) filter.status = status;

    const referrals = await listReferrals(filter);
    return NextResponse.json(
      { total: referrals.length, referrals },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_list_referrals", details: String(err).slice(0, 200) },
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
    if (!body.fromInstitution || typeof body.fromInstitution !== "string") {
      return NextResponse.json({ error: "missing_fromInstitution" }, { status: 400 });
    }
    if (!body.toInstitution || typeof body.toInstitution !== "string") {
      return NextResponse.json({ error: "missing_toInstitution" }, { status: 400 });
    }
    if (!body.citizenSubmission || typeof body.citizenSubmission !== "string") {
      return NextResponse.json({ error: "missing_citizenSubmission" }, { status: 400 });
    }
    if (!body.purpose || typeof body.purpose !== "string" || body.purpose.trim().length < 4) {
      return NextResponse.json({ error: "missing_or_invalid_purpose" }, { status: 400 });
    }

    const referral = await createReferral({
      fromInstitution: body.fromInstitution,
      toInstitution: body.toInstitution,
      citizenSubmission: body.citizenSubmission,
      fromCaseId: typeof body.fromCaseId === "string" ? body.fromCaseId : undefined,
      purpose: body.purpose,
    });

    return NextResponse.json({ referral }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_create_referral", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

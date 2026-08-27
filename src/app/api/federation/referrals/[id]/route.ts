// @ts-nocheck
/**
 * GET  /api/federation/referrals/[id]
 * PATCH /api/federation/referrals/[id]
 * ============================================================================
 * Referral detail + status update.
 *
 * PATCH body:
 *   { status?, toCaseId?, actor, institution, action, detail? }
 *
 * The PATCH transitions the referral status and appends a provenance
 * entry. The `toCaseId` may be set ONLY when the receiving institution
 * has opened its own case — never before. The `actor` and `institution`
 * fields are mandatory so the provenance chain can be reconstructed
 * from the referral record alone (Rule 2 — no silent cross-institutional
 * sharing).
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import {
  trackReferral,
  updateReferral,
  type ReferralStatus,
} from "@/lib/inter-agency-exchange";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set<ReferralStatus>([
  "pending", "acknowledged", "responded", "completed", "rejected", "failed",
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
    const referral = await trackReferral(id);
    if (!referral) {
      return NextResponse.json({ error: "referral_not_found" }, { status: 404 });
    }
    return NextResponse.json(
      { referral },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_fetch_referral", details: String(err).slice(0, 200) },
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
    if (!body.actor || typeof body.actor !== "string") {
      return NextResponse.json({ error: "missing_actor" }, { status: 400 });
    }
    if (!body.institution || typeof body.institution !== "string") {
      return NextResponse.json({ error: "missing_institution" }, { status: 400 });
    }
    if (!body.action || typeof body.action !== "string") {
      return NextResponse.json({ error: "missing_action" }, { status: 400 });
    }

    const status =
      body.status && ALLOWED_STATUSES.has(body.status as ReferralStatus)
        ? (body.status as ReferralStatus)
        : undefined;
    const toCaseId =
      typeof body.toCaseId === "string" ? body.toCaseId : undefined;

    const referral = await updateReferral(id, {
      status,
      toCaseId,
      actor: body.actor,
      institution: body.institution,
      action: body.action,
      detail: typeof body.detail === "string" ? body.detail : undefined,
    });
    if (!referral) {
      return NextResponse.json({ error: "referral_not_found" }, { status: 404 });
    }
    return NextResponse.json({ referral });
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_update_referral", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

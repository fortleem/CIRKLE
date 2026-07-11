import { NextRequest, NextResponse } from "next/server";
import { mediateDispute } from "@/lib/commit-ai";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/commit/mediate
// U2 — AI Mediator for pre-dispute resolution. Called from the CirkleCommit
// detail view when a user files a dispute. Returns a MediationResult with
// 3 resolution options, an AI recommendation, and (when the dispute is
// legally/financially complex) an escalation flag + professionalType that
// the overlay uses to surface the "Connect with a verified professional"
// CTA (dispatches the `circle:pro-network` event).
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const agreementTitle = typeof body?.agreementTitle === "string" ? body.agreementTitle : "";
    const agreementDescription =
      typeof body?.agreementDescription === "string" ? body.agreementDescription : "";
    const disputeReason = typeof body?.disputeReason === "string" ? body.disputeReason : "";
    const partyA = typeof body?.partyA === "string" ? body.partyA : "Party A";
    const partyB = typeof body?.partyB === "string" ? body.partyB : "Party B";
    const country = typeof body?.country === "string" ? body.country : "SA";

    if (!disputeReason.trim()) {
      return NextResponse.json(
        { error: "Dispute reason is required" },
        { status: 400 },
      );
    }

    const result = await mediateDispute({
      agreementTitle,
      agreementDescription,
      disputeReason,
      partyA,
      partyB,
      country,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        summary: "Mediation failed",
        disputedClause: "",
        options: [],
        aiRecommendation: "",
        escalateToProfessional: false,
        error: String(err),
      },
      { status: 500 },
    );
  }
}

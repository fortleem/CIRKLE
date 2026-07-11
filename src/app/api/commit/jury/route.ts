import { NextRequest, NextResponse } from "next/server";
import { createJuryCase, listCases } from "@/lib/commit-jury";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U11 — Community Jury API
//   GET  → list all jury cases (newest first)
//   POST → create a new jury case from a failed mediation
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const cases = await listCases();
  return NextResponse.json({
    cases,
    summary: {
      total: cases.length,
      voting: cases.filter((c) => c.status === "voting").length,
      resolved: cases.filter((c) => c.status === "resolved").length,
      expired: cases.filter((c) => c.status === "expired").length,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      agreementId,
      agreementTitle,
      partyA = "You",
      partyB = "Counterparty",
      disputeReason,
      evidence = [],
      jurorCount = 5,
    } = body as Record<string, unknown>;

    if (typeof agreementId !== "string" || !agreementId.trim()) {
      return NextResponse.json({ error: "agreementId is required" }, { status: 400 });
    }
    if (typeof disputeReason !== "string" || !disputeReason.trim()) {
      return NextResponse.json({ error: "disputeReason is required" }, { status: 400 });
    }

    const safeEvidence = Array.isArray(evidence)
      ? evidence
          .filter(
            (e): e is { party: string; text: string } =>
              !!e && typeof e === "object" && typeof (e as Record<string, unknown>).party === "string" && typeof (e as Record<string, unknown>).text === "string",
          )
          .map((e) => ({ party: e.party, text: e.text }))
      : [];

    const newCase = await createJuryCase({
      agreementId,
      agreementTitle: typeof agreementTitle === "string" ? agreementTitle : "Agreement",
      partyA: typeof partyA === "string" ? partyA : "You",
      partyB: typeof partyB === "string" ? partyB : "Counterparty",
      disputeReason,
      evidence: safeEvidence,
      jurorCount: typeof jurorCount === "number" ? jurorCount : 5,
    });

    return NextResponse.json({ ok: true, case: newCase }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create jury case", details: String(err) }, { status: 500 });
  }
}

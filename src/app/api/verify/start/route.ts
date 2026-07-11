import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER } from "@/lib/circle/mock-data";

/**
 * GET /api/verify/start
 * Returns the current user's verification status (non-destructive read).
 * The actual 4-step flow is triggered by POST.
 */
export async function GET() {
  try {
    let existing: { type: string; label: string; status: string; attestor: string; issuedAt: Date }[] = [];
    try {
      existing = await db.verifyClaim.findMany({
        where: { userLabel: CURRENT_USER.displayName },
        orderBy: { issuedAt: "desc" },
      });
    } catch {
      /* non-fatal — fall through with empty list */
    }
    return NextResponse.json({
      ok: true,
      user: CURRENT_USER.displayName,
      status: existing.length ? "verified" : "unverified",
      claims: existing.length,
      flow: ["scan_id", "liveness", "face_match", "attestation"],
      hint: "POST to /api/verify/start with {documentType} to run the 4-step verification flow.",
    });
  } catch (err) {
    logger.error("[/api/verify/start GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "verify status failed" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/verify/start
 * Body: {documentType}
 * Simulates the 4-step Circle Verify flow (scan ID → liveness → face
 * match → attestation). No real biometrics — just a fake delay and a
 * success response with a freshly issued claim.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { documentType?: string };
    const documentType = body.documentType ?? "national_id";

    // Fake the 4-step flow latency.
    await new Promise((r) => setTimeout(r, 800));

    const claim = {
      id: `vc_${Date.now()}`,
      type: "unique_human" as const,
      label:
        documentType === "passport"
          ? "Passport verified (unique human)"
          : "National ID verified (unique human)",
      issuedAt: new Date().toISOString(),
      status: "verified" as const,
      attestor: "Circle Verify (on-device)",
    };

    // Persist the claim so it shows up in subsequent GET /api/verify/claims.
    try {
      await db.verifyClaim.create({
        data: {
          id: claim.id,
          userLabel: CURRENT_USER.displayName,
          type: claim.type,
          label: claim.label,
          status: claim.status,
          attestor: claim.attestor,
          issuedAt: new Date(claim.issuedAt),
        },
      });
    } catch {
      /* non-fatal: the mock fallback returns the same shape */
    }

    return NextResponse.json({
      step: "attestation",
      ok: true,
      claim,
      steps: [
        { step: "scan_id", ok: true },
        { step: "liveness", ok: true },
        { step: "face_match", ok: true },
        { step: "attestation", ok: true },
      ],
    });
  } catch (err) {
    logger.error("[/api/verify/start] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "verify failed" },
      { status: 500 },
    );
  }
}

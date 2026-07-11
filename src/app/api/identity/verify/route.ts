import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  verifyAttestation,
  verifyExportedJWT,
  type Attestation,
  type ClaimType,
} from "@/lib/identity";

/**
 * POST /api/identity/verify
 *
 * Public endpoint for third parties to verify a Cirkle attestation.
 * Accepts two request shapes:
 *
 *   1. **Inline attestation**:
 *      { attestation: Attestation }
 *      Verifies the HMAC signature + DB existence + status + expiry.
 *
 *   2. **Exported JWT** (OIDC-style):
 *      { jwt: string }
 *      Verifies the JWT signature + looks up the underlying claim in
 *      the DB. Returns the decoded payload (no username).
 *
 * Either way, the response never reveals the underlying PII (DOB,
 * passport number, device id) — only the claimType + claimValue +
 * nullifier.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { attestation, jwt } = body as { attestation?: Attestation; jwt?: string };

    if (jwt && typeof jwt === "string") {
      const result = await verifyExportedJWT(jwt);
      if (!result.ok) {
        return NextResponse.json({ ok: false, valid: false, error: result.error }, { status: 200 });
      }
      return NextResponse.json({ ok: true, valid: true, payload: result.payload }, { status: 200 });
    }

    if (!attestation) {
      return NextResponse.json(
        { error: "Provide either `attestation` (inline) or `jwt` (exported)." },
        { status: 400 },
      );
    }

    // Basic shape check before handing off to the verify lib.
    const required = ["id", "claimType", "claimValue", "subject", "attestedAt", "attester", "signature", "nullifier"];
    for (const k of required) {
      if (!(k in attestation)) {
        return NextResponse.json({ ok: false, valid: false, error: `Missing field: ${k}` }, { status: 400 });
      }
    }

    const validClaimTypes: ClaimType[] = ["over_18", "nationality", "professional", "unique_human"];
    if (!validClaimTypes.includes(attestation.claimType as ClaimType)) {
      return NextResponse.json(
        { ok: false, valid: false, error: `Invalid claimType: ${attestation.claimType}` },
        { status: 400 },
      );
    }

    const valid = await verifyAttestation(attestation);
    return NextResponse.json(
      {
        ok: true,
        valid,
        // Echo back ONLY the public fields — never the subject username
        // (third parties get the nullifier instead).
        claim: valid
          ? {
              claimType: attestation.claimType,
              claimValue: attestation.claimValue,
              nullifier: attestation.nullifier,
              attester: attestation.attester,
              attestedAt: attestation.attestedAt,
            }
          : null,
      },
      { status: 200 },
    );
  } catch (err) {
    logger.error("[/api/identity/verify] error", { error: (err as Error).message });
    return NextResponse.json(
      { ok: false, valid: false, error: err instanceof Error ? err.message : "verification failed" },
      { status: 500 },
    );
  }
}

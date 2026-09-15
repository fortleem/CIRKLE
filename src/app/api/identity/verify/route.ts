// @ts-nocheck
// P1 FIX: Rate-limited (10/min — posts preset) + Zod-validated body.
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  verifyAttestation,
  verifyExportedJWT,
  type Attestation,
  type ClaimType,
} from "@/lib/identity";
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/api-rate-limit";
import { validateBody, z } from "@/lib/api-validation";

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
 *
 * P1 FIX — wrapped with `withRateLimit` (10 req/min — posts preset, anti-
 * abuse on the public verifier) and `validateBody` so malformed JWTs /
 * attestations return 400 before any verification work runs.
 */

const CLAIM_TYPES: [ClaimType, ...ClaimType[]] = [
  "over_18",
  "nationality",
  "professional",
  "unique_human",
];

/**
 * Zod schema for `POST /api/identity/verify`.
 *
 * The endpoint accepts one of two mutually-exclusive payloads:
 *   - `jwt` (string) for the OIDC-style exported-JWT flow.
 *   - `attestation` (object) for the inline-attestation flow.
 *
 * `attestation` shape mirrors `Attestation` from `@/lib/identity`:
 *   id, claimType, claimValue, subject, attestedAt, attester, signature,
 *   nullifier, status (all required strings) + optional expiresAt.
 */
const identityVerifySchema = z
  .object({
    jwt: z.string().min(10).max(20_000).optional(),
    attestation: z
      .object({
        id: z.string().min(1).max(256),
        claimType: z.enum(CLAIM_TYPES),
        claimValue: z.string().min(1).max(512),
        subject: z.string().min(1).max(256),
        attestedAt: z.string().min(1).max(64),
        attester: z.string().min(1).max(256),
        signature: z.string().min(1).max(512),
        nullifier: z.string().min(1).max(512),
        status: z.enum(["verified", "pending", "revoked"]),
        expiresAt: z.string().max(64).nullable().optional(),
      })
      .optional(),
  })
  .refine((b) => Boolean(b.jwt) || Boolean(b.attestation), {
    message: "Provide either `attestation` (inline) or `jwt` (exported).",
    path: ["attestation"],
  });

export const POST = withRateLimit(
  validateBody(identityVerifySchema, async (req, body) => {
    try {
      if (body.jwt && typeof body.jwt === "string") {
        const result = await verifyExportedJWT(body.jwt);
        if (!result.ok) {
          return NextResponse.json({ ok: false, valid: false, error: result.error }, { status: 200 });
        }
        return NextResponse.json({ ok: true, valid: true, payload: result.payload }, { status: 200 });
      }

      // attestation is guaranteed to exist by the `.refine` above, but TS
      // narrowing through refine isn't safe — re-check explicitly.
      const attestation = body.attestation as Attestation | undefined;
      if (!attestation) {
        return NextResponse.json(
          { error: "Provide either `attestation` (inline) or `jwt` (exported)." },
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
  }),
  RATE_LIMIT_PRESETS.posts,
);

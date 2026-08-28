// @ts-nocheck
/**
 * POST /api/auth/passkey/verify-registration
 * ============================================================================
 * Verifies a WebAuthn registration attestation returned by the browser,
 * stores the credential in the passkey service's in-memory store, and
 * returns the newly-stored credential metadata.
 *
 * Request body (JSON):
 *   {
 *     attestation: RegistrationResponseJSON,  // from startRegistration()
 *     deviceName?: string                     // "MacBook Air", "iPhone 15", ...
 *   }
 *
 * Response:
 *   200 `{ success, credential: PasskeyCredential }`
 *   400 `{ success: false, error: "..." }` — bad input
 *   401 `{ success: false, error: "unauthorized" }` — no session
 *   500 `{ success: false, error: "verify_registration_failed", details? }`
 *
 * Auth: the caller MUST be authenticated (the credential is bound to the
 * authenticated user's `userId` — we never trust a client-supplied
 * userId for registration, only for authentication).
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import { verifyRegistration } from "@/lib/passkey-service";

export const dynamic = "force-dynamic";

interface VerifyRegistrationBody {
  attestation?: any;
  deviceName?: string;
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    let body: VerifyRegistrationBody;
    try {
      body = (await req.json()) as VerifyRegistrationBody;
    } catch {
      return NextResponse.json(
        { success: false, error: "invalid_json" },
        { status: 400 },
      );
    }

    if (!body || !body.attestation) {
      return NextResponse.json(
        { success: false, error: "attestation is required" },
        { status: 400 },
      );
    }

    const deviceName =
      typeof body.deviceName === "string" && body.deviceName.trim().length > 0
        ? body.deviceName.trim()
        : "Unnamed device";

    const result = await verifyRegistration(
      body.attestation,
      session.userId,
      deviceName,
    );
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      credential: result.credential,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: "verify_registration_failed",
        details: String((err as Error)?.message || err),
      },
      { status: 500 },
    );
  }
}

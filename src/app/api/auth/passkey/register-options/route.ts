// @ts-nocheck
/**
 * GET /api/auth/passkey/register-options
 * ============================================================================
 * Returns WebAuthn registration options for the *authenticated* user.
 *
 * The caller must already have a `cirkle-session` cookie — passkey
 * registration is an "add a device to an existing account" flow, not a
 * "create an account" flow. (Anonymous sign-up via passkey is a
 * separate, follow-up feature; we deliberately gate it behind auth here
 * so the in-memory store always has a valid `userId` to key on.)
 *
 * Response: 200 `{ options: PublicKeyCredentialCreationOptionsJSON }`
 *           401 `{ error: "unauthorized" }` — caller has no session.
 *           500 `{ error: "registration_options_failed", details? }`
 *
 * Client side: feed the returned `options` directly into
 * `@simplewebauthn/browser`'s `startRegistration(options)`.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import { generateRegistrationOptions } from "@/lib/passkey-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    const result = await generateRegistrationOptions(
      session.userId,
      session.username,
    );
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, options: result.options });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: "registration_options_failed",
        details: String((err as Error)?.message || err),
      },
      { status: 500 },
    );
  }
}

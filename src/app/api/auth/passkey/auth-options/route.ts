// @ts-nocheck
/**
 * GET /api/auth/passkey/auth-options
 * ============================================================================
 * Returns WebAuthn authentication options (the "login challenge").
 *
 * ⚠️ This endpoint is intentionally **NOT** authenticated — it's the
 * challenge that an *un-authenticated* browser fetches to start the
 * passkey login flow. The response includes the list of allowed
 * credentials for the user (so the authenticator knows which key to use),
 * OR an empty list (discoverable-credential / resident-key mode).
 *
 * Query params:
 *   ?userId=<id>     Optional. Restrict the allowed-credentials list to
 *                    a known user. If omitted, the browser will prompt
 *                    the user to pick a passkey (discoverable flow).
 *
 * Response:
 *   200 `{ success, options: PublicKeyCredentialRequestOptionsJSON }`
 *   500 `{ success: false, error: "auth_options_failed" }`
 *
 * Client side: feed the returned `options` directly into
 * `@simplewebauthn/browser`'s `startAuthentication(options)`.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@/lib/passkey-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Parse the optional userId hint from the query string. We deliberately
    // do NOT verify the hint — the subsequent verify-auth step binds the
    // assertion to the actual credential ID, so a wrong userId hint can't
    // mint a session for a different user.
    const url = new URL(req.url, "http://localhost");
    const userIdHint = url.searchParams.get("userId") || undefined;

    const result = await generateAuthenticationOptions(userIdHint);
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
        error: "auth_options_failed",
        details: String((err as Error)?.message || err),
      },
      { status: 500 },
    );
  }
}

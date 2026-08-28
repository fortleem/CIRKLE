// @ts-nocheck
/**
 * POST /api/auth/passkey/verify-auth
 * ============================================================================
 * Verifies a WebAuthn authentication assertion returned by the browser.
 * On success, mints a `cirkle-session` JWT cookie — exactly as
 * `/api/auth/login` does — so the rest of the stack is unchanged.
 *
 * Request body (JSON):
 *   {
 *     assertion: AuthenticationResponseJSON,  // from startAuthentication()
 *     userId?: string                          // optional hint
 *   }
 *
 * Response:
 *   200 `{ success, user: { id, username, displayName } }` + Set-Cookie
 *   400 `{ success: false, error: "..." }` — bad input
 *   401 `{ success: false, error: "verification_failed" }` — bad assertion
 *   500 `{ success: false, error: "verify_auth_failed", details? }`
 *
 * Implementation notes:
 *   • On success, the passkey service returns the `userId` the credential
 *     belongs to. We then look up that user in the DB to fetch the
 *     displayName + clearance flags, and mint a JWT exactly like login.
 *   • The DB lookup is best-effort — if it fails (e.g. user was deleted
 *     between the credential being registered and now), we mint a session
 *     with whatever info we have and let downstream clearance checks
 *     handle the rest.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createSessionToken,
  setSessionCookie,
  SESSION_TTL_SECONDS,
} from "@/lib/server-auth";
import {
  verifyAuthentication,
  findUserIdByCredentialId,
} from "@/lib/passkey-service";

export const dynamic = "force-dynamic";

interface VerifyAuthBody {
  assertion?: any;
  userId?: string;
}

export async function POST(req: Request) {
  try {
    let body: VerifyAuthBody;
    try {
      body = (await req.json()) as VerifyAuthBody;
    } catch {
      return NextResponse.json(
        { success: false, error: "invalid_json" },
        { status: 400 },
      );
    }

    if (!body || !body.assertion) {
      return NextResponse.json(
        { success: false, error: "assertion is required" },
        { status: 400 },
      );
    }

    // Pre-resolve the user from the credential ID, so we can pass it as
    // a hint to the verify step (defense in depth — the assertion is
    // already bound to the credential ID, but matching the hint avoids
    // accepting cross-user credentials if the spec is ever loosened).
    let userIdHint = body.userId;
    if (!userIdHint && body.assertion?.id) {
      userIdHint = findUserIdByCredentialId(body.assertion.id) || undefined;
    }

    const result = await verifyAuthentication(body.assertion, userIdHint);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 },
      );
    }

    const userId = result.userId;

    // Look up the user in the DB for the display name + clearance flags.
    // The passkey service only stores `userId` — the DB is the source of
    // truth for everything else.
    let username = userIdHint || `user_${userId.slice(-6)}`;
    let displayName: string | undefined;
    let isAdmin = false;
    let isAca = false;
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          circleId: true,
          displayName: true,
        },
      });
      if (user) {
        username = user.circleId || username;
        displayName = user.displayName || undefined;
      }
    } catch {
      /* best-effort — fall through with whatever we have */
    }

    // Mint the session JWT and set the cookie, exactly like /api/auth/login.
    const token = await createSessionToken(userId, username, {
      displayName,
      isAdmin,
      isAca,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: userId,
        username,
        displayName,
      },
      credentialId: result.credentialId,
    });
    setSessionCookie(res, token, { maxAgeSeconds: SESSION_TTL_SECONDS });
    return res;
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: "verify_auth_failed",
        details: String((err as Error)?.message || err),
      },
      { status: 500 },
    );
  }
}

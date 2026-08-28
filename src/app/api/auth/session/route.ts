// @ts-nocheck
/**
 * GET    /api/auth/session  — returns the current session user (or 401).
 * DELETE /api/auth/session  — clears the session cookie (logout).
 * ============================================================================
 * The GET response shape mirrors the login response so the client can use
 * the same hydration code path on cold-load.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import {
  getSessionFromRequest,
  clearSessionCookie,
} from "@/lib/server-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET — return the currently logged-in user, derived from the
 * `cirkle-session` cookie. The displayName is refreshed from the DB so a
 * user who updates their profile name sees the new value without re-issuing
 * the JWT.
 */
export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { success: false, authenticated: false, error: "no_session" },
      { status: 401 },
    );
  }

  // Best-effort: refresh displayName from the DB so the client sees the
  // most recent value. Failures fall back to the value baked into the JWT.
  let displayName = session.displayName;
  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { displayName: true },
    });
    if (user?.displayName) displayName = user.displayName;
  } catch {
    /* DB may not be reachable; keep JWT displayName */
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    user: {
      id: session.userId,
      username: session.username,
      displayName: displayName ?? session.username,
      isAdmin: session.isAdmin === true,
      isAca: session.isAca === true,
    },
    expiresAt: session.expiresAt
      ? new Date(session.expiresAt).toISOString()
      : null,
  });
}

/**
 * DELETE — logout. Clears the `cirkle-session` cookie.
 */
export async function DELETE(req: Request) {
  const session = await getSessionFromRequest(req);
  // We clear the cookie regardless of whether the session was valid, so a
  // stale/malformed cookie left over in the browser is also removed.
  const res = NextResponse.json({
    success: true,
    loggedOut: true,
    hadSession: Boolean(session),
  });
  clearSessionCookie(res);
  return res;
}

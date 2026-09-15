// @ts-nocheck
/**
 * GET  /api/auth/session  — return the current session (or 401 if logged out)
 * DELETE /api/auth/session — clear the session cookie (logout)
 * ============================================================================
 * P1 FIX (P1-SECURITY): Stateful session introspection + logout.
 *
 * GET returns the verified session payload (userId, username, displayName,
 * isAdmin, isAca, expiresAt) so the client can hydrate its auth store from a
 * single server-issued source of truth. Returns 401 when no valid session
 * cookie is present — the client should treat that as "logged out".
 *
 * DELETE clears the `cirkle-session` cookie. Always returns 200 (idempotent —
 * deleting an already-absent session is a no-op).
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getSessionFromRequest,
  clearSessionCookie,
} from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, authenticated: false, error: "no_session" },
      { status: 401 },
    );
  }
  return NextResponse.json({
    ok: true,
    authenticated: true,
    session: {
      userId: session.userId,
      username: session.username,
      displayName: session.displayName ?? null,
      isAdmin: session.isAdmin === true,
      isAca: session.isAca === true,
      expiresAt: session.expiresAt,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({
    ok: true,
    loggedOut: true,
  });
  clearSessionCookie(res);
  return res;
}

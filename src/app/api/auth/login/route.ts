// @ts-nocheck
/**
 * POST /api/auth/login
 * ============================================================================
 * P1 FIX (P1-SECURITY): Server-side login.
 *
 * Verifies credentials against the in-memory `server-credentials` store (bcrypt
 * hashes written by /api/auth/register), then issues a `cirkle-session` JWT
 * cookie (httpOnly, secure in prod, sameSite=strict, 7-day TTL).
 *
 * Body: { username: string, password: string }
 *
 * Returns 200 { ok, user: { username, displayName, isAdmin } } on success.
 * Returns 401 { ok: false, error } on bad credentials.
 * Returns 400 { ok: false, error } on missing fields.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, normalizeUsername } from "@/lib/server-credentials";
import {
  createSessionToken,
  setSessionCookie,
  SESSION_TTL_SECONDS,
} from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "invalid body" },
        { status: 400 },
      );
    }

    const usernameRaw = String(body?.username || "").trim();
    const password = String(body?.password || "");
    if (!usernameRaw || !password) {
      return NextResponse.json(
        { ok: false, error: "username and password are required" },
        { status: 400 },
      );
    }

    const username = normalizeUsername(usernameRaw);
    if (!username) {
      return NextResponse.json(
        { ok: false, error: "invalid username" },
        { status: 400 },
      );
    }

    // P1 FIX: Verify password server-side against the bcrypt hash in the
    // server-credentials store. Never trust a client-side hash again.
    const result = await verifyPassword(username, password);
    if (!result.ok || !result.credential) {
      return NextResponse.json(
        { ok: false, error: "Invalid username or password." },
        { status: 401 },
      );
    }

    const cred = result.credential;
    const token = await createSessionToken(cred.userId, cred.username, {
      displayName: cred.displayName,
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: cred.userId,
        username: cred.username,
        displayName: cred.displayName,
      },
      expiresIn: SESSION_TTL_SECONDS,
    });
    setSessionCookie(res, token);
    return res;
  } catch (err) {
    console.error("[/api/auth/login] fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Login failed.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

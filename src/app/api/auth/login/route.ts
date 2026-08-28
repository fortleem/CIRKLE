// @ts-nocheck
/**
 * POST /api/auth/login
 * ============================================================================
 * Server-side login — verifies credentials and issues a `cirkle-session`
 * httpOnly JWT cookie.
 *
 * Body: { username, password }
 * Returns: { success, user: { id, username, displayName } }
 *
 * Resolution order for credential verification:
 *   1. In-memory credential store (`src/lib/server-credentials.ts`) — used by
 *      users created via /api/auth/register.
 *   2. Existing User rows in the DB with a matching `circleId`/`displayName`
 *      — for users created by mock seed before P0. These users have no
 *      server-side password hash, so login against them is rejected unless
 *      `CIRKLE_DEV_TRUST_SEEDED_USERS=1` is set (very permissive dev mode —
 *      should NOT be enabled in production).
 *
 * Cookie: `cirkle-session` — httpOnly, secure (prod), sameSite=strict, 7d TTL.
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
  verifyPassword,
  normalizeUsername,
} from "@/lib/server-credentials";

export const dynamic = "force-dynamic";

interface LoginBody {
  username?: string;
  password?: string;
}

export async function POST(req: Request) {
  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const username = normalizeUsername(body.username || "");
  const password = body.password || "";

  if (!username) {
    return NextResponse.json(
      { success: false, error: "username is required" },
      { status: 400 },
    );
  }
  if (!password) {
    return NextResponse.json(
      { success: false, error: "password is required" },
      { status: 400 },
    );
  }

  // ── 1) Try the credential store first (P0 path — real server-side bcrypt). ──
  const result = await verifyPassword(username, password);
  if (result.ok && result.credential) {
    const cred = result.credential;
    const token = await createSessionToken(cred.userId, cred.username, {
      displayName: cred.displayName,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: cred.userId,
        username: cred.username,
        displayName: cred.displayName,
      },
    });
    setSessionCookie(res, token, { maxAgeSeconds: SESSION_TTL_SECONDS });
    return res;
  }

  // ── 2) Fallback: look up a seeded User row. ─────────────────────────────────
  // The pre-P0 architecture populated `db.user` via mock seed (no server-side
  // password hash). To keep login functional for seeded users in dev, we
  // optionally accept ANY password when CIRKLE_DEV_TRUST_SEEDED_USERS=1.
  //
  // In production this env var MUST be unset — seeded users should be deleted
  // or given real credential entries via /api/auth/register.
  try {
    const seededUser = await db.user.findFirst({
      where: {
        OR: [
          { circleId: { contains: username } },
          { displayName: { contains: username } },
        ],
      },
      select: { id: true, circleId: true, displayName: true },
    });

    if (seededUser) {
      const trustSeeded = process.env.CIRKLE_DEV_TRUST_SEEDED_USERS === "1";
      if (!trustSeeded) {
        // Seeded users have no password — refuse to log them in. The caller
        // must register via /api/auth/register to establish a real credential.
        return NextResponse.json(
          {
            success: false,
            error:
              "This account was created by seed data and has no server-side password. " +
              "Please register via /api/auth/register or set CIRKLE_DEV_TRUST_SEEDED_USERS=1 in dev.",
          },
          { status: 401 },
        );
      }

      const token = await createSessionToken(
        seededUser.id,
        username,
        { displayName: seededUser.displayName },
      );
      const res = NextResponse.json({
        success: true,
        user: {
          id: seededUser.id,
          username,
          displayName: seededUser.displayName,
        },
        devMode: true,
        notice:
          "CIRKLE_DEV_TRUST_SEEDED_USERS is on — password was not verified against a hash.",
      });
      setSessionCookie(res, token, { maxAgeSeconds: SESSION_TTL_SECONDS });
      return res;
    }
  } catch {
    /* DB may not be reachable — fall through to 401 */
  }

  return NextResponse.json(
    { success: false, error: "Invalid username or password." },
    { status: 401 },
  );
}

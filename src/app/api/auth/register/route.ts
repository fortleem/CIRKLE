// @ts-nocheck
/**
 * POST /api/auth/register
 * ============================================================================
 * P1 FIX (P1-SECURITY): Server-side registration.
 *
 * Creates a new User row in the database and stores a bcrypt-hashed password
 * in the in-memory `server-credentials` store (the pre-existing User Prisma
 * model has no `passwordHash` column — see server-credentials.ts for the
 * stop-gap rationale). Then issues a `cirkle-session` JWT cookie.
 *
 * Body: {
 *   username: string,       // 3–20 chars: [a-z0-9_]
 *   displayName: string,
 *   password: string,       // min 6 chars
 *   email?: string,
 *   country?: string,       // ISO 3166-1 alpha-2 (default "EG")
 *   region?: string,
 *   avatarColor?: string,
 *   arabicName?: string,
 * }
 *
 * Returns 200 { ok, user: { id, username, displayName } } on success.
 * Returns 400 { ok: false, error } on validation failure.
 * Returns 409 { ok: false, error } if username is already taken.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  storeCredential,
  normalizeUsername,
  getCredential,
} from "@/lib/server-credentials";
import {
  createSessionToken,
  setSessionCookie,
  SESSION_TTL_SECONDS,
} from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const AVATAR_COLORS = new Set(["gold", "teal", "rose", "steel", "charcoal"]);

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
    const displayName = String(body?.displayName || "").trim();
    const password = String(body?.password || "");
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const country =
      typeof body?.country === "string" && body.country.length === 2
        ? body.country.toUpperCase()
        : "EG";
    const region =
      typeof body?.region === "string" ? body.region.trim().toUpperCase() : "";
    const avatarColor =
      typeof body?.avatarColor === "string" &&
      AVATAR_COLORS.has(body.avatarColor)
        ? body.avatarColor
        : "teal";
    const arabicName =
      typeof body?.arabicName === "string" && body.arabicName.trim()
        ? body.arabicName.trim()
        : null;

    if (!USERNAME_RE.test(normalizeUsername(usernameRaw))) {
      return NextResponse.json(
        {
          ok: false,
          error: "Username must be 3–20 chars: letters, numbers, underscore.",
        },
        { status: 400 },
      );
    }
    const username = normalizeUsername(usernameRaw)!;
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }
    if (!displayName) {
      return NextResponse.json(
        { ok: false, error: "Display name is required." },
        { status: 400 },
      );
    }

    // P1 FIX: Reject if username already exists in EITHER the DB or the
    // server-credentials store (covers the case where the DB row was wiped
    // but the credential is still in memory).
    const existingCred = getCredential(username);
    const existingUser = await db.user
      .findUnique({ where: { circleId: username }, select: { id: true } })
      .catch(() => null);
    if (existingCred || existingUser) {
      return NextResponse.json(
        { ok: false, error: `@${username} is already taken.` },
        { status: 409 },
      );
    }

    // Create the User row. `circleId` is the Cirkle-wide unique handle
    // (= username). We do NOT store the password on the User row — that
    // lives only in the in-memory credentials store (P0 stop-gap).
    const user = await db.user.create({
      data: {
        circleId: username,
        displayName,
        arabicName,
        avatarColor,
        region: region || country,
        verified: false,
      },
    });

    // Hash the password and store it in the credentials map.
    const cred = await storeCredential({
      userId: user.id,
      username,
      displayName,
      password,
    });

    // Issue the session JWT cookie.
    const token = await createSessionToken(user.id, username, {
      displayName,
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: cred.username,
        displayName: cred.displayName,
      },
      expiresIn: SESSION_TTL_SECONDS,
    });
    setSessionCookie(res, token);
    return res;
  } catch (err) {
    console.error("[/api/auth/register] fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Registration failed.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

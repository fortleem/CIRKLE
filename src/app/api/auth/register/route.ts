// @ts-nocheck
/**
 * POST /api/auth/register
 * ============================================================================
 * Server-side registration — creates a `User` row in the database, stores a
 * bcrypt-hashed password in the server credential store, and issues a
 * `cirkle-session` httpOnly JWT cookie.
 *
 * Body: { username, displayName, password, dob, country }
 *
 * Returns: { success, user: { id, username, displayName } }
 *
 * Password hashing: bcrypt (10 rounds) via `src/lib/server-credentials.ts`.
 *
 * Username validation: 3–20 chars, lowercase letters / digits / underscore
 * (mirrors the client-side `auth-store.ts` regex).
 *
 * Age gate: same band rules as the client store — COPPA blocks <13, parental
 * email required for 13–15. The parental email is recorded but (in dev) no
 * email is actually sent.
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
  storeCredential,
  normalizeUsername,
  getCredential,
} from "@/lib/server-credentials";

export const dynamic = "force-dynamic";

interface RegisterBody {
  username?: string;
  displayName?: string;
  password?: string;
  dob?: string;
  country?: string;
  email?: string;
  bio?: string;
  parentalEmail?: string;
}

const AVATAR_COLORS = ["gold", "teal", "rose", "steel"];

function pickAvatarColor(username: string): string {
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function computeAge(dob: string): number | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export async function POST(req: Request) {
  let body: RegisterBody;
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const username = normalizeUsername(body.username || "");
  const displayName = (body.displayName || "").trim();
  const password = body.password || "";
  const dob = (body.dob || "").trim();
  const country = (body.country || "").trim().toUpperCase().slice(0, 2) || "EG";
  const email = (body.email || "").trim() || undefined;
  const bio = (body.bio || "").trim() || undefined;
  const parentalEmail = (body.parentalEmail || "").trim() || undefined;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      {
        success: false,
        error: "Username must be 3–20 chars: lowercase letters, numbers, underscore.",
      },
      { status: 400 },
    );
  }
  if (!displayName) {
    return NextResponse.json(
      { success: false, error: "Display name is required." },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { success: false, error: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }

  // ── Age gate (COPPA + parental consent) ────────────────────────────────────
  const age = computeAge(dob);
  if (age === null) {
    return NextResponse.json(
      { success: false, error: "Please enter a valid date of birth." },
      { status: 400 },
    );
  }
  if (age < 13) {
    return NextResponse.json(
      {
        success: false,
        error: "We're sorry, but Cirkle is not available for users under 13. (COPPA)",
      },
      { status: 400 },
    );
  }
  if (age < 16 && !parentalEmail) {
    return NextResponse.json(
      {
        success: false,
        error: "A parent or guardian's email is required for users under 16.",
      },
      { status: 400 },
    );
  }

  // ── Uniqueness check: server credential store ───────────────────────────────
  if (getCredential(username)) {
    return NextResponse.json(
      { success: false, error: `@${username} is already taken.` },
      { status: 409 },
    );
  }

  // ── Uniqueness check: User table (circleId / displayName collision) ────────
  try {
    const existing = await db.user.findFirst({
      where: {
        OR: [{ circleId: username }, { circleId: `${username}@cirkle` }],
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `@${username} is already taken.` },
        { status: 409 },
      );
    }
  } catch {
    // DB not reachable — refuse registration to avoid creating orphan
    // credentials that can't be linked to a User row.
    return NextResponse.json(
      {
        success: false,
        error: "Database is not reachable. Please try again later.",
      },
      { status: 503 },
    );
  }

  // ── Create the User row in the DB ──────────────────────────────────────────
  const user = await db.user.create({
    data: {
      circleId: `${username}@cirkle`,
      displayName,
      avatarColor: pickAvatarColor(username),
      verified: false,
      region: country,
    },
    select: { id: true, circleId: true, displayName: true },
  });

  // ── Store the bcrypt password hash ─────────────────────────────────────────
  await storeCredential({
    userId: user.id,
    username,
    displayName,
    password,
  });

  // ── Issue the session JWT + cookie ──────────────────────────────────────────
  const token = await createSessionToken(user.id, username, {
    displayName,
  });

  const res = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username,
      displayName,
    },
  });
  setSessionCookie(res, token, { maxAgeSeconds: SESSION_TTL_SECONDS });
  return res;
}

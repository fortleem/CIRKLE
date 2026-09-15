// @ts-nocheck
/**
 * GET /api/auth/me
 * ============================================================================
 * P1 FIX (P1-SECURITY): Current user profile.
 *
 * Reads the session from the `cirkle-session` cookie. If no valid session,
 * returns 401. Otherwise returns the User row from the DB (joined with the
 * session-derived clearance flags) so the client can render the user's own
 * profile card with server-authoritative data.
 *
 * Returns 200 { ok, user: { id, username, displayName, isAdmin, ... } }
 * Returns 401 { ok: false, error: "unauthorized" } when not logged in.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    // P1 FIX: Look up the user from the DB by the session's userId (the JWT
    // `sub`). This is the authoritative server-side identity record.
    const user = await db.user
      .findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          circleId: true,
          displayName: true,
          arabicName: true,
          avatarColor: true,
          verified: true,
          region: true,
          joinedAt: true,
          createdAt: true,
        },
      })
      .catch(() => null);

    if (!user) {
      // Session is valid but the user was deleted out-of-band. Force logout.
      return NextResponse.json(
        { ok: false, error: "user_not_found" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: session.username,
        circleId: user.circleId,
        displayName: user.displayName,
        arabicName: user.arabicName ?? null,
        avatarColor: user.avatarColor,
        verified: user.verified,
        region: user.region,
        joinedAt: user.joinedAt?.toISOString?.() ?? user.joinedAt,
        // P1 stop-gap clearance flags (env-driven, see server-auth.ts).
        isAdmin: session.isAdmin === true,
        isAca: session.isAca === true,
      },
    });
  } catch (err) {
    console.error("[/api/auth/me] fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "failed_to_fetch_profile",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

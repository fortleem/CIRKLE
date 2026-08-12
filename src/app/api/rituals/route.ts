import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  buildRitualResponse,
  ritualForDate,
  type RitualResponse,
} from "@/lib/social-rituals";

// ─────────────────────────────────────────────────────────────────────────────
// Social Rituals — Task CREATIVE-1, Feature #2.
//
//   GET  /api/rituals             → today's ritual + user streak
//   POST /api/rituals             → record participation for today's ritual
//
// The streak is stored in localStorage on the client (see
// src/lib/social-rituals.ts). This endpoint returns a fresh ritual + an
// (optionally client-supplied) streak snapshot so the client and server stay
// in sync.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

/**
 * GET /api/rituals
 * Returns today's ritual, the user's streak, and whether they've already
 * participated today.
 *
 * Optional query params:
 *   • streak=<JSON> — client-side streak echo, so a single round-trip can
 *     return the canonical ritual + the user's current streak.
 */
export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const ritual = ritualForDate(now);

    let clientStreak = null;
    const streakParam = req.nextUrl.searchParams.get("streak");
    if (streakParam) {
      try {
        clientStreak = JSON.parse(streakParam);
      } catch {
        clientStreak = null;
      }
    }

    const response: RitualResponse = {
      ritual,
      streak: clientStreak ?? { current: 0, longest: 0, lastParticipation: null, total: 0 },
      serverTime: now.toISOString(),
      participatedToday: false,
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    logger.error("[/api/rituals GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load ritual" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/rituals
 * Records participation for today's ritual. Body:
 *   { ritualId: string }
 *
 * The streak is updated client-side via `recordParticipation` (which writes
 * to localStorage). The server endpoint exists so future server-side
 * analytics / accountability flows have a hook. We return the freshly
 * computed ritual + a confirmation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { ritualId?: string } | null;
    if (!body || typeof body.ritualId !== "string" || !body.ritualId.trim()) {
      return NextResponse.json({ error: "ritualId is required" }, { status: 400 });
    }

    const ritualId = body.ritualId.trim();
    const now = new Date();
    const todaysRitual = ritualForDate(now);
    if (todaysRitual.id !== ritualId) {
      // The submitted ritual doesn't match today's — that's fine (the user
      // might be catching up on an older ritual), but we log it for
      // observability.
      logger.info("[/api/rituals POST] ritualId mismatch", {
        submitted: ritualId,
        todays: todaysRitual.id,
      });
    }

    const response = buildRitualResponse(now);
    return NextResponse.json({
      ...response,
      recorded: true,
      // Echo the client's streak-updater instruction. The client calls
      // recordParticipation() itself to update localStorage; this is just a
      // confirmation that the server saw the participation event.
      instruction: "call recordParticipation() client-side to update localStorage",
    });
  } catch (err) {
    logger.error("[/api/rituals POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to record ritual" },
      { status: 500 },
    );
  }
}

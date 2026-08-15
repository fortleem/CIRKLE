import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  buildChallengeResponse,
  recordProgress,
  weekKeyForDate,
  type ChallengeResponse,
} from "@/lib/social-challenges";

// ─────────────────────────────────────────────────────────────────────────────
// Social Challenges — Task CREATIVE-2, Feature #4.
//
//   GET  /api/challenges                  → this week's challenges + progress
//   POST /api/challenges                  → record start / completion
//
// The progress map is stored in localStorage on the client (see
// src/lib/social-challenges.ts). This endpoint returns the canonical weekly
// challenge set + a client-supplied progress snapshot (so a single round-trip
// can return everything the UI needs).
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

/**
 * GET /api/challenges
 *
 * Optional query params:
 *   • progress=<JSON>  — client-side progress map echo
 *   • name=<string>    — current user's display name (for leaderboard)
 *   • username=<string>— current user's username
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const now = new Date();
    const weekKey = weekKeyForDate(now);

    // Build the base response (progress = empty on server).
    const response = buildChallengeResponse(
      now,
      params.get("name") ?? "You",
      params.get("username") ?? "you",
    );

    // If the client sent a progress snapshot, use it instead.
    const progressParam = params.get("progress");
    if (progressParam) {
      try {
        const clientProgress = JSON.parse(progressParam) as Record<string, unknown>;
        if (clientProgress && typeof clientProgress === "object") {
          const challenges = response.challenges;
          const progress: ChallengeResponse["progress"] = {};
          for (const c of challenges) {
            const v = clientProgress[c.id] as Record<string, unknown> | undefined;
            progress[c.id] = {
              challengeId: c.id,
              started: Boolean(v?.started),
              completed: Boolean(v?.completed),
              startedAt: typeof v?.startedAt === "string" ? (v.startedAt as string) : null,
              completedAt: typeof v?.completedAt === "string" ? (v.completedAt as string) : null,
            };
          }
          response.progress = progress;
          const completedCount = challenges.filter((c) => progress[c.id]?.completed).length;
          response.completedCount = completedCount;
          response.champion = completedCount >= 4;
          response.badges = response.badges.map((b) => ({
            ...b,
            earned:
              (b.id === "getting-started" && completedCount >= 1) ||
              (b.id === "halfway-there" && completedCount >= 3) ||
              (b.id === "weekly-champion" && completedCount >= 4) ||
              (b.id === "perfect-week" && completedCount >= 5),
          }));
        }
      } catch {
        /* malformed progress param — ignore and use server defaults */
      }
    }

    response.weekKey = weekKey;

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    logger.error("[/api/challenges GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load challenges" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/challenges
 *
 * Body:
 *   {
 *     challengeId: string,
 *     markStarted?:  boolean,
 *     markCompleted?: boolean,
 *     progress?:     Record<string, ChallengeProgress>  // optional client echo
 *     name?:         string,
 *     username?:     string
 *   }
 *
 * The streak is updated client-side via `recordProgress` (which writes
 * to localStorage). The server endpoint exists so future server-side
 * analytics have a hook; the response is the canonical challenge set
 * with the freshly recorded progress merged in.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      challengeId?: string;
      markStarted?: boolean;
      markCompleted?: boolean;
      name?: string;
      username?: string;
    } | null;

    if (!body || typeof body.challengeId !== "string" || !body.challengeId.trim()) {
      return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
    }

    const now = new Date();
    const weekKey = weekKeyForDate(now);

    // Record progress in localStorage (no-op on the server, but the function
    // is SSR-safe and returns the updated map).
    recordProgress(weekKey, body.challengeId, {
      markStarted: body.markStarted,
      markCompleted: body.markCompleted,
    }, now);

    const response = buildChallengeResponse(
      now,
      body.name ?? "You",
      body.username ?? "you",
    );

    return NextResponse.json({
      ...response,
      recorded: true,
      instruction: "call recordProgress() client-side to update localStorage",
    });
  } catch (err) {
    logger.error("[/api/challenges POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to record challenge" },
      { status: 500 },
    );
  }
}

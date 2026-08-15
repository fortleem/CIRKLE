import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  buildMoodResponse,
  defaultSignalForNow,
  detectMood,
  getMoodFeed,
  getMoodTheme,
  type Mood,
  type MoodSignal,
  type MoodResponse,
} from "@/lib/mood-engine";

// ─────────────────────────────────────────────────────────────────────────────
// Mood-Based Feed Adaptation — Task CREATIVE-2, Feature #3.
//
//   GET  /api/mood                  → current mood + feed config + theme
//   GET  /api/mood?signal=<JSON>    → mood derived from a client-supplied signal
//   GET  /api/mood?mood=energetic   → mood + feed config for a fixed mood
//
// The signal is collected client-side (passively — no explicit user input)
// and POSTed/queried here. Detection is a pure heuristic; no external AI.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

const VALID_MOODS: Mood[] = ["energetic", "relaxed", "social", "focused", "bored"];

function parseSignalParam(raw: string | null): Partial<MoodSignal> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || !parsed) return null;
    return parsed as Partial<MoodSignal>;
  } catch {
    return null;
  }
}

/**
 * GET /api/mood
 *
 * Query params (all optional):
 *   • signal=<JSON>  — a MoodSignal object (or partial) the client collected.
 *   • mood=<id>      — force a specific mood (skips detection).
 *
 * Response: MoodResponse
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const now = new Date();

    // 1. If the client forced a mood, skip detection.
    const forcedMood = params.get("mood") as Mood | null;
    if (forcedMood && VALID_MOODS.includes(forcedMood)) {
      const response: MoodResponse = {
        mood: forcedMood,
        feed: getMoodFeed(forcedMood),
        theme: getMoodTheme(forcedMood),
        at: now.toISOString(),
        confidence: 1,
      };
      return NextResponse.json(response, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    // 2. Try to read a client-supplied signal.
    const signalOverride = parseSignalParam(params.get("signal"));
    const base = defaultSignalForNow(now);
    const signal: MoodSignal = { ...base, ...(signalOverride ?? {}) };

    // Clamp numeric inputs to sensible ranges so a malformed client payload
    // can't skew detection catastrophically.
    signal.timeOfDay = Math.max(0, Math.min(23, Math.trunc(signal.timeOfDay ?? base.timeOfDay)));
    signal.minutesSinceLastActive = Math.max(0, signal.minutesSinceLastActive ?? base.minutesSinceLastActive);
    signal.messagingActivity = Math.max(0, signal.messagingActivity ?? base.messagingActivity);
    signal.longFormReadCount = Math.max(0, signal.longFormReadCount ?? base.longFormReadCount);
    signal.avgScrollVelocity = Math.max(0, signal.avgScrollVelocity ?? base.avgScrollVelocity);
    signal.recentEngagement = Math.max(0, signal.recentEngagement ?? base.recentEngagement);

    const response = buildMoodResponse(signal, now);
    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    logger.error("[/api/mood GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to detect mood" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/mood
 *
 * Body: MoodSignal
 * Returns: MoodResponse — same as GET /api/mood but with a posted signal.
 *
 * Useful when the client has accumulated a richer signal than can fit in a
 * query string and wants the canonical detection result.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Partial<MoodSignal> | null;
    if (!body) {
      return NextResponse.json({ error: "expected MoodSignal JSON body" }, { status: 400 });
    }
    const now = new Date();
    const base = defaultSignalForNow(now);
    const signal: MoodSignal = { ...base, ...body };
    signal.timeOfDay = Math.max(0, Math.min(23, Math.trunc(signal.timeOfDay ?? base.timeOfDay)));
    signal.minutesSinceLastActive = Math.max(0, signal.minutesSinceLastActive ?? base.minutesSinceLastActive);
    signal.messagingActivity = Math.max(0, signal.messagingActivity ?? base.messagingActivity);
    signal.longFormReadCount = Math.max(0, signal.longFormReadCount ?? base.longFormReadCount);
    signal.avgScrollVelocity = Math.max(0, signal.avgScrollVelocity ?? base.avgScrollVelocity);
    signal.recentEngagement = Math.max(0, signal.recentEngagement ?? base.recentEngagement);

    const { mood } = detectMood(signal);
    const response: MoodResponse = {
      mood,
      feed: getMoodFeed(mood),
      theme: getMoodTheme(mood),
      at: now.toISOString(),
      confidence: buildMoodResponse(signal, now).confidence,
    };
    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    logger.error("[/api/mood POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to detect mood" },
      { status: 500 },
    );
  }
}

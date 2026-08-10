/**
 * GET  /api/rewards              — list rewards for a creator OR leaderboard for a period.
 * POST /api/rewards              — distribute the reward pool for a period (admin).
 *
 * Query params (GET):
 *   • `username`      — when set, returns the creator's rewards across all
 *                       periods (most-recent first).
 *   • `period`        — "YYYY-MM" (default: current month). Ignored when
 *                       `username` is set.
 *   • `limit`         — top-N or per-creator limit (default 50, max 200).
 *
 * Body (POST):
 *   • `period`        — "YYYY-MM" (default: current month).
 *   • `poolSize`      — total pool to distribute (default 0).
 *   • `currency`      — ISO-4217 currency code (default "USD").
 *   • `paymentRef`    — optional payment reference. When provided, rows
 *                       are immediately marked `distributed`.
 *   • `minScore`      — minimum score to qualify (default 1).
 *
 * Privacy posture (§30.4): the leaderboard is PUBLIC (transparency on
 * revenue share). Per-creator reward history requires the creator's own
 * handle — there's no admin "list all payouts" endpoint here.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  calculateReward,
  currentPeriod,
  distributeRewards,
  getCreatorReward,
  getRewardLeaderboard,
  listCreatorRewards,
} from "@/lib/rewards-service";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const username = (sp.get("username") || "").trim().toLowerCase().replace(/^@/, "");
    const period = sp.get("period") || currentPeriod();
    const limit = Math.max(1, Math.min(200, Number(sp.get("limit")) || 50));

    // Per-creator history.
    if (username) {
      // Single-period lookup.
      if (sp.get("period")) {
        const reward = await getCreatorReward(username, period);
        return NextResponse.json({ reward }, { headers: { "Cache-Control": "no-store" } });
      }
      // All-period history.
      const { rewards, nextCursor } = await listCreatorRewards(username, { limit });
      return NextResponse.json({ rewards, nextCursor }, { headers: { "Cache-Control": "no-store" } });
    }

    // Public leaderboard.
    const leaderboard = await getRewardLeaderboard(period, limit);
    return NextResponse.json(leaderboard, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch (err) {
    logger.error("[/api/rewards GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch rewards" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const period = typeof body.period === "string" && body.period.trim()
      ? body.period.trim()
      : currentPeriod();
    const poolSize = Number(body.poolSize ?? 0);
    if (!isFinite(poolSize) || poolSize < 0) {
      return NextResponse.json({ error: "poolSize must be a non-negative number" }, { status: 400 });
    }
    const currency = typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().toUpperCase()
      : "USD";
    const paymentRef = typeof body.paymentRef === "string" ? body.paymentRef.trim() : undefined;
    const minScore = Number(body.minScore ?? 1);
    if (!isFinite(minScore) || minScore < 0) {
      return NextResponse.json({ error: "minScore must be a non-negative number" }, { status: 400 });
    }

    // Optional: compute a single creator's reward (without persisting).
    if (typeof body.username === "string" && body.username.trim()) {
      const username = body.username.trim().toLowerCase().replace(/^@/, "");
      const reward = await calculateReward(username, period, poolSize, currency);
      return NextResponse.json({ reward }, { headers: { "Cache-Control": "no-store" } });
    }

    const result = await distributeRewards({
      period,
      poolSize,
      currency,
      paymentRef,
      minScore,
    });

    return NextResponse.json(
      { ok: true, period, count: result.count, leaderboard: result.leaderboard },
      { status: 201 },
    );
  } catch (err) {
    logger.error("[/api/rewards POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to distribute rewards" },
      { status: 500 },
    );
  }
}

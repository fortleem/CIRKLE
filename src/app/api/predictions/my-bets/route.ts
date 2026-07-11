import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getUserBets } from "@/lib/prediction-market";

/**
 * GET /api/predictions/my-bets?username=<username>
 *
 * Returns every bet placed by the user, enriched with market question,
 * outcome label, resolution state, win/loss, and payout.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = (searchParams.get("username") || "").trim();

    if (!username) {
      return NextResponse.json(
        { error: "username query param is required" },
        { status: 400 },
      );
    }

    const bets = await getUserBets(username);
    return NextResponse.json({ bets });
  } catch (err) {
    logger.error("[/api/predictions/my-bets] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load bets" },
      { status: 500 },
    );
  }
}

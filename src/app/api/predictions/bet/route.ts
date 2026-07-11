import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { placeBet } from "@/lib/prediction-market";

/**
 * POST /api/predictions/bet
 * Body: { marketId, outcomeId, username, amount, currency? }
 *
 * Buys `amount` worth of shares in the chosen outcome using LMSR pricing.
 * Returns the share count purchased + new probability for the outcome.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      marketId?: string;
      outcomeId?: string;
      username?: string;
      amount?: number;
      currency?: string;
    } | null;

    if (!body?.marketId) {
      return NextResponse.json({ error: "marketId is required" }, { status: 400 });
    }
    if (!body.outcomeId) {
      return NextResponse.json({ error: "outcomeId is required" }, { status: 400 });
    }
    if (!body.username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 },
      );
    }

    const result = await placeBet({
      marketId: body.marketId,
      outcomeId: body.outcomeId,
      username: body.username,
      amount,
      currency: body.currency,
    });

    return NextResponse.json(
      {
        shares: result.shares,
        newProbability: result.newProbability,
        market: result.market,
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error("[/api/predictions/bet] error", {
      error: (err as Error).message,
    });
    const status =
      err instanceof Error &&
      /not found|already resolved|invalid|required/i.test(err.message)
        ? 400
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to place bet" },
      { status },
    );
  }
}

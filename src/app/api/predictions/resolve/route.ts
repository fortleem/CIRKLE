import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { resolveMarket } from "@/lib/prediction-market";

/**
 * POST /api/predictions/resolve
 * Body: { marketId, winningOutcomeId }
 *
 * Marks the market resolved with the given winning outcome. In production
 * this would be triggered by a trusted oracle; here it's exposed for the
 * demo so the UI can show resolved markets + payouts.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      marketId?: string;
      winningOutcomeId?: string;
    } | null;

    if (!body?.marketId) {
      return NextResponse.json({ error: "marketId is required" }, { status: 400 });
    }
    if (!body.winningOutcomeId) {
      return NextResponse.json(
        { error: "winningOutcomeId is required" },
        { status: 400 },
      );
    }

    const market = await resolveMarket(body.marketId, body.winningOutcomeId);
    return NextResponse.json({ market });
  } catch (err) {
    logger.error("[/api/predictions/resolve] error", {
      error: (err as Error).message,
    });
    const status =
      err instanceof Error && /not found|already resolved|invalid/i.test(err.message)
        ? 400
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to resolve market" },
      { status },
    );
  }
}

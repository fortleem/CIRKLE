// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getCreatorEarnings } from "@/lib/tipping-service";

/**
 * GET /api/tip/earnings?creator=<handle>
 * Returns the aggregated earnings for the given creator.
 */
export async function GET(req: NextRequest) {
  try {
    const creator = req.nextUrl.searchParams.get("creator")?.trim().toLowerCase().replace(/^@/, "");
    if (!creator) {
      return NextResponse.json({ error: "creator is required" }, { status: 400 });
    }
    const earnings = await getCreatorEarnings(creator);
    return NextResponse.json(earnings, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error("[/api/tip/earnings GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load earnings" },
      { status: 500 },
    );
  }
}

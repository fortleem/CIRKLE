// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getCreatorAffiliateEarnings } from "@/lib/affiliate-service";

/**
 * GET /api/affiliate/earnings?affiliate=<handle>
 * Returns the affiliate earnings summary for the given creator.
 */
export async function GET(req: NextRequest) {
  try {
    const affiliate = req.nextUrl.searchParams.get("affiliate")?.trim().toLowerCase().replace(/^@/, "");
    if (!affiliate) {
      return NextResponse.json({ error: "affiliate is required" }, { status: 400 });
    }
    const earnings = await getCreatorAffiliateEarnings(affiliate);
    return NextResponse.json(earnings, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error("[/api/affiliate/earnings GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load affiliate earnings" },
      { status: 500 },
    );
  }
}

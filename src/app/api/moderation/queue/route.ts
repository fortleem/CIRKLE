// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getModerationQueue } from "@/lib/moderation-service";

/**
 * GET /api/moderation/queue?status=pending&limit=50
 * Returns the moderation queue for moderator review.
 *
 * Status filter: "pending" (default), "approved", "removed", "blurred",
 * "dismissed", or "all".
 */
export async function GET(req: NextRequest) {
  try {
    const status = (req.nextUrl.searchParams.get("status") || "pending") as any;
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "50");
    const limit = isFinite(limitRaw) ? limitRaw : 50;
    const items = await getModerationQueue(status, limit);
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error("[/api/moderation/queue GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load queue" },
      { status: 500 },
    );
  }
}

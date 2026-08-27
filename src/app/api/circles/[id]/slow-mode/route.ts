// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getSlowMode, setSlowMode, canSendMessage, recordMessageSent, SLOW_MODE_INTERVALS } from "@/lib/slow-mode";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/circles/[id]/slow-mode?userId=...
 * Returns the slow-mode setting + whether the user can send a message.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const userId = req.nextUrl.searchParams.get("userId") || undefined;
    const [settings, can] = await Promise.all([
      getSlowMode(id),
      userId ? canSendMessage(id, userId) : Promise.resolve({ canSend: true, retryAfterSec: 0, intervalSec: 0 }),
    ]);
    return NextResponse.json({ settings, canSend: can, intervals: SLOW_MODE_INTERVALS });
  } catch (err) {
    logger.error("[/api/circles/[id]/slow-mode GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch slow-mode" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/circles/[id]/slow-mode
 * Body: { intervalSec, setBy } OR { userId, action: 'record' }
 * - With action='record': records that the user sent a message (updates cooldown).
 * - Otherwise: sets the slow-mode interval.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    if (typeof body.action === "string" && body.action === "record") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const rec = await recordMessageSent(id, userId);
      return NextResponse.json({ record: rec });
    }
    const settings = await setSlowMode(
      id,
      typeof body.intervalSec === "number" ? body.intervalSec : 0,
      typeof body.setBy === "string" ? body.setBy : "",
    );
    logger.info("[/api/circles/[id]/slow-mode POST] updated", { circleId: id, intervalSec: settings.intervalSec });
    return NextResponse.json({ settings });
  } catch (err) {
    logger.error("[/api/circles/[id]/slow-mode POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update slow-mode" },
      { status: 500 },
    );
  }
}

// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { subscribeToCreator } from "@/lib/creator-subscriptions";
import { logger } from "@/lib/logger";

/**
 * POST /api/subscriptions/subscribe
 * Body: { tierId, subscriberId, months? }
 * Subscribes a user to a creator's tier.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const sub = await subscribeToCreator({
      tierId: typeof body.tierId === "string" ? body.tierId : "",
      subscriberId: typeof body.subscriberId === "string" ? body.subscriberId : "",
      months: typeof body.months === "number" ? body.months : 1,
    });
    logger.info("[/api/subscriptions/subscribe POST] subscribed", {
      id: sub.id,
      tierId: sub.tierId,
      subscriberId: sub.subscriberId,
    });
    return NextResponse.json({ subscription: sub }, { status: 201 });
  } catch (err) {
    logger.error("[/api/subscriptions/subscribe POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to subscribe" },
      { status: 500 },
    );
  }
}

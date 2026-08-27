// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { isPremiumUser, getActiveSubscription, getPremiumFeatures, subscribeToPremium, cancelPremium } from "@/lib/premium-ai";
import { logger } from "@/lib/logger";

/**
 * GET /api/premium/status?userId=...
 * Returns the user's premium subscription status + the list of premium features.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || "";
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const subscription = await getActiveSubscription(userId);
    const isPremium = await isPremiumUser(userId);
    const features = getPremiumFeatures();
    return NextResponse.json({
      isPremium,
      subscription,
      features,
      priceMonthly: 3,
      priceYearly: 30,
    });
  } catch (err) {
    logger.error("[/api/premium/status GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch premium status" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/premium/status
 * Body: { userId, action: 'subscribe'|'cancel', plan?: 'monthly'|'yearly' }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const userId = typeof body.userId === "string" ? body.userId : "";
    const action = typeof body.action === "string" ? body.action : "";
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    if (action === "subscribe") {
      const plan = body.plan === "yearly" ? "yearly" : "monthly";
      const sub = await subscribeToPremium({ userId, plan });
      logger.info("[/api/premium/status POST] subscribed", { id: sub.id, userId, plan });
      return NextResponse.json({ subscription: sub }, { status: 201 });
    }
    if (action === "cancel") {
      const sub = await cancelPremium(userId);
      return NextResponse.json({ subscription: sub });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    logger.error("[/api/premium/status POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update premium" },
      { status: 500 },
    );
  }
}

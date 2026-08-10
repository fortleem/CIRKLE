// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { trackClick, trackPurchase } from "@/lib/affiliate-service";

/**
 * POST /api/affiliate/track
 * Body: {
 *   event: "click" | "purchase",
 *   affiliateId, productId?, orderId?, amount?, currency?, commissionRate?,
 *   country?, referrer?
 * }
 *
 * Records either an affiliate click or a purchase. The `event` field
 * selects which kind of tracking to record.
 *
 * For clicks: requires `affiliateId` (the creator handle).
 * For purchases: requires `affiliateId` + `orderId` + `amount`.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      event?: string;
      affiliateId?: string;
      productId?: string;
      orderId?: string;
      amount?: number;
      currency?: string;
      commissionRate?: number;
      country?: string;
      referrer?: string;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    const event = (body.event || "").toLowerCase();
    if (event !== "click" && event !== "purchase") {
      return NextResponse.json({ error: "event must be 'click' or 'purchase'" }, { status: 400 });
    }

    if (event === "click") {
      const result = await trackClick({
        affiliateId: body.affiliateId || "",
        productId: body.productId,
        country: body.country,
        referrer: body.referrer,
      });
      return NextResponse.json(result, { status: 201 });
    }

    // purchase
    const result = await trackPurchase({
      affiliateId: body.affiliateId || "",
      orderId: body.orderId || "",
      amount: Number(body.amount),
      currency: body.currency,
      commissionRate: body.commissionRate,
      productId: body.productId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to track affiliate event";
    logger.error("[/api/affiliate/track POST] error", { error: msg });
    const status = msg.includes("required") || msg.includes("must be") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

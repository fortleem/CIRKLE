// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { calculateMerchantFee, isMerchantPayment } from "@/lib/merchant-fees";
import { logger } from "@/lib/logger";

/**
 * GET /api/payments/merchant-fee?amount=1000&recipientHandle=acme.cirkle&currency=USD
 * Calculates the 1.5% merchant fee if the recipient is a verified merchant.
 */
export async function GET(req: NextRequest) {
  try {
    const amountStr = req.nextUrl.searchParams.get("amount") || "0";
    const recipientHandle = req.nextUrl.searchParams.get("recipientHandle") || "";
    const currency = req.nextUrl.searchParams.get("currency") || "USD";
    const amount = parseFloat(amountStr);
    if (!isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 });
    }
    const calc = calculateMerchantFee(amount, recipientHandle, currency);
    const merchant = isMerchantPayment(recipientHandle);
    return NextResponse.json({ calculation: calc, isMerchant: merchant });
  } catch (err) {
    logger.error("[/api/payments/merchant-fee GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to calculate merchant fee" },
      { status: 500 },
    );
  }
}

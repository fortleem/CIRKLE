// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { calculateEscrowFee, processEscrowPayment } from "@/lib/escrow-fees";
import { logger } from "@/lib/logger";

/**
 * GET /api/commit/escrow-fee?amount=1000&currency=USD
 * Calculates the 1% escrow fee for a given amount.
 */
export async function GET(req: NextRequest) {
  try {
    const amountStr = req.nextUrl.searchParams.get("amount") || "0";
    const currency = req.nextUrl.searchParams.get("currency") || "USD";
    const amount = parseFloat(amountStr);
    if (!isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 });
    }
    const calc = calculateEscrowFee(amount, currency);
    return NextResponse.json({ calculation: calc });
  } catch (err) {
    logger.error("[/api/commit/escrow-fee GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to calculate escrow fee" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/commit/escrow-fee
 * Body: { amount, currency?, fromUser, toUser, commitId }
 * Holds funds in escrow.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const result = await processEscrowPayment({
      amount: typeof body.amount === "number" ? body.amount : 0,
      currency: typeof body.currency === "string" ? body.currency : "USD",
      fromUser: typeof body.fromUser === "string" ? body.fromUser : "",
      toUser: typeof body.toUser === "string" ? body.toUser : "",
      commitId: typeof body.commitId === "string" ? body.commitId : "",
    });
    logger.info("[/api/commit/escrow-fee POST] escrow held", { id: result.escrowId, amount: result.amount });
    return NextResponse.json({ escrow: result }, { status: 201 });
  } catch (err) {
    logger.error("[/api/commit/escrow-fee POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to process escrow" },
      { status: 500 },
    );
  }
}

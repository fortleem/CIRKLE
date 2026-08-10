// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { processTip } from "@/lib/tipping-service";

/**
 * POST /api/tip
 * Body: {
 *   fromUser, toCreator, amount, method,
 *   country?, currency?, message?
 * }
 *
 * Processes a creator tip. Returns the recorded tip with status
 * (completed in the sandbox; pending in a real processor upgrade).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      fromUser?: string;
      toCreator?: string;
      amount?: number;
      method?: string;
      country?: string;
      currency?: string;
      message?: string;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const result = await processTip({
      fromUser: body.fromUser || "",
      toCreator: body.toCreator || "",
      amount: Number(body.amount),
      method: body.method || "",
      country: body.country,
      currency: body.currency,
      message: body.message,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to process tip";
    logger.error("[/api/tip POST] error", { error: msg });
    // Validation errors → 400; everything else → 500.
    const status =
      msg.includes("required") ||
      msg.includes("must be") ||
      msg.includes("cannot tip yourself") ||
      msg.includes("unknown") ||
      msg.includes("not available") ||
      msg.includes("exceeds")
        ? 400
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

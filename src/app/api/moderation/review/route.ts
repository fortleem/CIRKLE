// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { reviewContent } from "@/lib/moderation-service";

/**
 * POST /api/moderation/review
 * Body: { flagId, decision, reviewer, note? }
 *   decision: "approve" | "remove" | "blur" | "dismiss"
 *
 * Reviews a flagged item. The moderator's username is recorded.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      flagId?: string;
      decision?: string;
      reviewer?: string;
      note?: string | null;
    } | null;

    if (!body?.flagId) {
      return NextResponse.json({ error: "flagId is required" }, { status: 400 });
    }

    const result = await reviewContent({
      flagId: body.flagId,
      decision: body.decision || "",
      reviewer: body.reviewer || "",
      note: body.note,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to review content";
    logger.error("[/api/moderation/review POST] error", { error: msg });
    const status = msg.includes("required") || msg.includes("must be") || msg.includes("already") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

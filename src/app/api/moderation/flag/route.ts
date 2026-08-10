// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { flagContent } from "@/lib/moderation-service";

/**
 * POST /api/moderation/flag
 * Body: { contentId, contentType?, reason, note?, flaggedBy? }
 *
 * Flags a piece of content for human review. Idempotent per
 * (contentId, flaggedBy) — duplicate pending flags return the
 * existing flag id.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      contentId?: string;
      contentType?: string;
      reason?: string;
      note?: string | null;
      flaggedBy?: string;
    } | null;

    if (!body?.contentId) {
      return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    }

    const result = await flagContent({
      contentId: body.contentId,
      contentType: body.contentType,
      reason: body.reason || "other",
      note: body.note,
      flaggedBy: body.flaggedBy,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to flag content";
    logger.error("[/api/moderation/flag POST] error", { error: msg });
    const status = msg.includes("required") || msg.includes("must be") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

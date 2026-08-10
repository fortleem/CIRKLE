// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { appealDecision, getAppeals, resolveAppeal } from "@/lib/moderation-service";

/**
 * POST /api/moderation/appeal
 * Body: { flagId, appellant, reason }              — file an appeal
 *       { appealId, decision, reviewer, note? }    — resolve an appeal
 *
 * The two operations are distinguished by which fields are present.
 * Filing requires `flagId` + `appellant` + `reason`. Resolving
 * requires `appealId` + `decision` + `reviewer`.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      // File
      flagId?: string;
      appellant?: string;
      reason?: string;
      // Resolve
      appealId?: string;
      decision?: "uphold" | "overturn";
      reviewer?: string;
      note?: string | null;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    // Resolve path.
    if (body.appealId && body.decision && body.reviewer) {
      const result = await resolveAppeal({
        appealId: body.appealId,
        decision: body.decision,
        reviewer: body.reviewer,
        note: body.note,
      });
      return NextResponse.json(result);
    }

    // File path.
    if (body.flagId && body.appellant && body.reason) {
      const result = await appealDecision({
        flagId: body.flagId,
        appellant: body.appellant,
        reason: body.reason,
      });
      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json(
      { error: "either (flagId, appellant, reason) or (appealId, decision, reviewer) is required" },
      { status: 400 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to file/resolve appeal";
    logger.error("[/api/moderation/appeal POST] error", { error: msg });
    const status = msg.includes("required") || msg.includes("must be") || msg.includes("already") || msg.includes("only") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * GET /api/moderation/appeal?status=open&limit=50
 * Returns appeals for moderator review.
 */
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || "open";
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "50");
    const limit = isFinite(limitRaw) ? limitRaw : 50;
    const items = await getAppeals(status, limit);
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error("[/api/moderation/appeal GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load appeals" },
      { status: 500 },
    );
  }
}

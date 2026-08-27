// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { searchMessages } from "@/lib/message-search";
import { logger } from "@/lib/logger";

/**
 * GET /api/search/messages?userId=...&query=...&fromDate=...&toDate=...&sender=...&fileType=...&conversationId=...&limit=50&offset=0
 * Global message search with filters.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || "";
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const query = req.nextUrl.searchParams.get("query") || undefined;
    const fromDate = req.nextUrl.searchParams.get("fromDate") || undefined;
    const toDate = req.nextUrl.searchParams.get("toDate") || undefined;
    const sender = req.nextUrl.searchParams.get("sender") || undefined;
    const fileType = req.nextUrl.searchParams.get("fileType") || undefined;
    const conversationId = req.nextUrl.searchParams.get("conversationId") || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10) || 50;
    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0", 10) || 0;
    const result = await searchMessages({
      userId,
      query,
      fromDate,
      toDate,
      sender,
      fileType,
      conversationId,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (err) {
    logger.error("[/api/search/messages GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to search messages" },
      { status: 500 },
    );
  }
}

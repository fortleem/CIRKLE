// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { saveMessage, unsaveMessage, unsaveById, getSavedMessages, getSavedCount } from "@/lib/saved-messages";
import { logger } from "@/lib/logger";

/**
 * GET /api/saved-messages?userId=...&query=...&conversationId=...&limit=100
 * Lists the user's saved messages with optional search + filter.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || "";
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const query = req.nextUrl.searchParams.get("query") || undefined;
    const conversationId = req.nextUrl.searchParams.get("conversationId") || undefined;
    const limitStr = req.nextUrl.searchParams.get("limit") || "100";
    const limit = parseInt(limitStr, 10) || 100;
    const [messages, count] = await Promise.all([
      getSavedMessages(userId, { query, conversationId, limit }),
      getSavedCount(userId),
    ]);
    return NextResponse.json({ messages, total: count });
  } catch (err) {
    logger.error("[/api/saved-messages GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list saved messages" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/saved-messages
 * Body: { userId, messageId, conversationId, note? }
 * Saves a message into the user's Saved channel.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const rec = await saveMessage({
      userId: typeof body.userId === "string" ? body.userId : "",
      messageId: typeof body.messageId === "string" ? body.messageId : "",
      conversationId: typeof body.conversationId === "string" ? body.conversationId : "",
      note: typeof body.note === "string" ? body.note : undefined,
    });
    return NextResponse.json({ saved: rec }, { status: 201 });
  } catch (err) {
    logger.error("[/api/saved-messages POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to save message" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/saved-messages?id=... OR ?userId=...&messageId=...
 * Un-saves a message.
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id") || "";
    const userId = req.nextUrl.searchParams.get("userId") || "";
    const messageId = req.nextUrl.searchParams.get("messageId") || "";
    let ok: boolean;
    if (id) {
      ok = await unsaveById(id);
    } else {
      ok = await unsaveMessage(userId, messageId);
    }
    return NextResponse.json({ removed: ok });
  } catch (err) {
    logger.error("[/api/saved-messages DELETE]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to unsave message" },
      { status: 500 },
    );
  }
}

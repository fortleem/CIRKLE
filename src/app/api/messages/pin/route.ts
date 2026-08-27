// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { pinMessage, unpinMessage, getPinnedMessages, unpinById } from "@/lib/pinned-messages";
import { logger } from "@/lib/logger";

/**
 * GET /api/messages/pin?conversationId=...
 * Returns the pinned messages for a conversation (newest first).
 */
export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get("conversationId") || "";
    if (!conversationId) return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    const pinned = await getPinnedMessages(conversationId);
    return NextResponse.json({ pinned });
  } catch (err) {
    logger.error("[/api/messages/pin GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list pinned messages" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/messages/pin
 * Body: { conversationId, messageId, pinnedBy }
 * Pins a message in a conversation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const pinned = await pinMessage({
      conversationId: typeof body.conversationId === "string" ? body.conversationId : "",
      messageId: typeof body.messageId === "string" ? body.messageId : "",
      pinnedBy: typeof body.pinnedBy === "string" ? body.pinnedBy : "",
    });
    logger.info("[/api/messages/pin POST] pinned", { id: pinned.id, conversationId: pinned.conversationId });
    return NextResponse.json({ pinned }, { status: 201 });
  } catch (err) {
    logger.error("[/api/messages/pin POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to pin message" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/messages/pin?id=... OR ?conversationId=...&messageId=...
 * Unpins a message.
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id") || "";
    const conversationId = req.nextUrl.searchParams.get("conversationId") || "";
    const messageId = req.nextUrl.searchParams.get("messageId") || "";
    let ok: boolean;
    if (id) {
      ok = await unpinById(id);
    } else {
      ok = await unpinMessage(conversationId, messageId);
    }
    return NextResponse.json({ removed: ok });
  } catch (err) {
    logger.error("[/api/messages/pin DELETE]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to unpin message" },
      { status: 500 },
    );
  }
}

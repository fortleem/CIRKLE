// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  markAsRead,
  getReadReceipts,
  getUnreadCount,
} from "@/lib/read-receipts";

/**
 * /api/conversations/[id]/read
 *
 *   POST { readerId, messageId }  → mark conversation as read up to messageId
 *   GET  ?readerId=...           → receipts list + (optional) unread count
 *
 * Path param `id` is the Conversation.id.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: conversationId } = await params;
    const { readerId, messageId } = await req.json();
    if (!readerId || !messageId) {
      return NextResponse.json(
        { error: "readerId and messageId are required." },
        { status: 400 },
      );
    }
    const receipt = await markAsRead(conversationId, readerId, messageId);
    const unreadCount = await getUnreadCount(conversationId, readerId);
    return NextResponse.json({ ok: true, receipt, unreadCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "markAsRead failed";
    const status = /not found|does not belong/i.test(msg) ? 404 : /required/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: conversationId } = await params;
    const { searchParams } = new URL(req.url);
    const readerId = searchParams.get("readerId") ?? undefined;

    const receipts = await getReadReceipts(conversationId);
    const unreadCount = readerId
      ? await getUnreadCount(conversationId, readerId)
      : null;
    return NextResponse.json({ conversationId, receipts, unreadCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

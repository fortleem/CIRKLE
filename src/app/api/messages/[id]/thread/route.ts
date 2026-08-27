// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getThreadReplies, getThreadDepth, getThreadReplyCount } from "@/lib/reply-thread";

/**
 * /api/messages/[id]/thread
 *
 *   GET  → list replies attached to the message (with reply message bodies)
 *
 * Path param `id` is the parent Message.id.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: parentMessageId } = await params;
    const [replies, depth, count] = await Promise.all([
      getThreadReplies(parentMessageId),
      getThreadDepth(parentMessageId),
      getThreadReplyCount(parentMessageId),
    ]);
    return NextResponse.json({
      parentMessageId,
      depth,
      count,
      replies,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { editMessage, getEditHistory, getMessageWithHistory } from "@/lib/message-editing";

/**
 * /api/messages/[id]/edit
 *
 *   POST { userId, newBody }  → edit the message (within the 15-min window)
 *   GET                      → fetch edit history (with current body)
 *
 * Path param `id` is the Message.id. The POST body must contain the acting
 * user's id (server-side trust boundary — Wasl passes the current user's
 * circle id).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;
    const { userId, newBody } = await req.json();
    if (!userId || !newBody) {
      return NextResponse.json(
        { error: "userId and newBody are required." },
        { status: 400 },
      );
    }
    const result = await editMessage(messageId, userId, newBody);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "editMessage failed";
    const status = /not found/i.test(msg)
      ? 404
      : /window expired|own messages|required|exceeds/i.test(msg)
        ? 400
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;
    // Prefer the richer payload (current body + history); fall back to
    // history-only if the message itself was deleted but history remains.
    try {
      const payload = await getMessageWithHistory(messageId);
      return NextResponse.json(payload);
    } catch {
      const history = await getEditHistory(messageId);
      return NextResponse.json({ messageId, currentBody: null, history });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

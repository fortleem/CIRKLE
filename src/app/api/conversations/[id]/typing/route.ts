// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { setTyping, getTypingUsers, clearTyping } from "@/lib/typing-indicator";

/**
 * /api/conversations/[id]/typing
 *
 *   POST  { userId, action? }   → set typing (action: "set" | "clear", default "set")
 *   GET                         → list currently-typing users
 *
 * Path param `id` is the Conversation.id.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: conversationId } = await params;
    const { userId, action } = await req.json();
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required." },
        { status: 400 },
      );
    }
    if (action === "clear") {
      const result = await clearTyping(conversationId, userId);
      return NextResponse.json({ ok: true, ...result });
    }
    await setTyping(conversationId, userId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "setTyping failed";
    const status = /required/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: conversationId } = await params;
    const typing = await getTypingUsers(conversationId);
    return NextResponse.json({ conversationId, typing });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

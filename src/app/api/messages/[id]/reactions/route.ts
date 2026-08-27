// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  addReaction,
  removeReaction,
  getReactionsForMessage,
  REACTION_EMOJIS,
} from "@/lib/message-reactions";

/**
 * /api/messages/[id]/reactions
 *
 *   POST   { emoji, userId }            → add a reaction (idempotent)
 *   DELETE { emoji, userId }            → remove a reaction (no-op if absent)
 *   GET                                → list reactions on the message
 *
 * Path param `id` is the Message.id.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;
    const { emoji, userId } = await req.json();
    if (!emoji || !userId) {
      return NextResponse.json(
        { error: "emoji and userId are required." },
        { status: 400 },
      );
    }
    if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
      return NextResponse.json(
        { error: `Unsupported emoji. Allowed: ${REACTION_EMOJIS.join(" ")}` },
        { status: 400 },
      );
    }
    const reaction = await addReaction(messageId, userId, emoji);
    return NextResponse.json({ ok: true, action: "added", reaction });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "addReaction failed";
    const status = /not found/i.test(msg) ? 404 : /required|Invalid|Unsupported/.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;
    const { searchParams } = new URL(req.url);
    const emoji = searchParams.get("emoji") ?? undefined;
    const userId = searchParams.get("userId") ?? undefined;
    if (!emoji || !userId) {
      return NextResponse.json(
        { error: "emoji and userId query params are required." },
        { status: 400 },
      );
    }
    const result = await removeReaction(messageId, userId, emoji);
    return NextResponse.json({ ok: true, action: "removed", ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "removeReaction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;
    const reactions = await getReactionsForMessage(messageId);
    return NextResponse.json({ messageId, reactions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

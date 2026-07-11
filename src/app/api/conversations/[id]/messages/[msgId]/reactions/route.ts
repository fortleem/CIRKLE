import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; msgId: string }> }) {
  try {
    const { id, msgId } = await params;
    const { emoji, displayName } = await req.json();
    if (!emoji || !displayName) return NextResponse.json({ error: "emoji and displayName required" }, { status: 400 });
    const existing = await db.message.findUnique({ where: { id: msgId } });
    if (!existing) return NextResponse.json({ error: "message not found" }, { status: 404 });
    const existingReaction = await db.reaction.findUnique({
      where: { messageId_displayName_emoji: { messageId: msgId, displayName, emoji } },
    });
    if (existingReaction) {
      await db.reaction.delete({ where: { id: existingReaction.id } });
      return NextResponse.json({ ok: true, action: "removed" });
    }
    const reaction = await db.reaction.create({ data: { messageId: msgId, displayName, emoji } });
    return NextResponse.json({ ok: true, action: "added", reaction });
  } catch { return NextResponse.json({ error: "reaction failed" }, { status: 500 }); }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; msgId: string }> }) {
  try {
    const { id, msgId } = await params;
    const reactions = await db.reaction.findMany({ where: { messageId: msgId } });
    return NextResponse.json(reactions);
  } catch { return NextResponse.json({ error: "fetch failed" }, { status: 500 }); }
}

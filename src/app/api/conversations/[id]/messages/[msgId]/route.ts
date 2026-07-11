import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; msgId: string }> }) {
  try {
    const { id, msgId } = await params;
    const { body } = await req.json();
    if (!body) return NextResponse.json({ error: "body required" }, { status: 400 });
    const existing = await db.message.findUnique({ where: { id: msgId } });
    if (!existing) return NextResponse.json({ error: "message not found" }, { status: 404 });
    const ageMs = Date.now() - existing.createdAt.getTime();
    if (ageMs > 15 * 60 * 1000) return NextResponse.json({ error: "edit window expired" }, { status: 403 });
    const updated = await db.message.update({ where: { id: msgId }, data: { body, editedAt: new Date() } });
    return NextResponse.json(updated);
  } catch { return NextResponse.json({ error: "edit failed" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; msgId: string }> }) {
  try {
    const { id, msgId } = await params;
    const scope = new URL(req.url).searchParams.get("scope") || "me";
    const existing = await db.message.findUnique({ where: { id: msgId } });
    if (!existing) return NextResponse.json({ error: "message not found" }, { status: 404 });
    await db.message.update({ where: { id: msgId }, data: { isDeleted: true, deletedAt: new Date(), body: scope === "everyone" ? "message deleted" : existing.body } });
    return NextResponse.json({ ok: true, scope });
  } catch { return NextResponse.json({ error: "delete failed" }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; msgId: string }> }) {
  try {
    const { id, msgId } = await params;
    const { action } = await req.json();
    const existing = await db.message.findUnique({ where: { id: msgId } });
    if (!existing) return NextResponse.json({ error: "message not found" }, { status: 404 });
    const data: Record<string, unknown> = {};
    if (action === "star") { data.isStarred = !existing.isStarred; data.starredAt = !existing.isStarred ? new Date() : null; }
    if (action === "pin") { data.isPinned = !existing.isPinned; }
    const updated = await db.message.update({ where: { id: msgId }, data });
    return NextResponse.json(updated);
  } catch { return NextResponse.json({ error: "action failed" }, { status: 500 }); }
}

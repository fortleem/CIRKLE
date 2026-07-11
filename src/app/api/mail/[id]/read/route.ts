import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { markRead, toggleStar, trashMessage } from "@/lib/circle-mail";

// ─────────────────────────────────────────────────────────────────────────────
// /api/mail/[id]/read — PATCH to mark read/unread.
//   PATCH /api/mail/[id]/read  body: { read: boolean }    → mark read/unread
//   PATCH /api/mail/[id]/read  body: { action: "star" }   → toggle star
//   PATCH /api/mail/[id]/read  body: { action: "trash" }  → move to/from trash
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    if (body.action === "star") {
      const message = await toggleStar(id);
      if (!message) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, message });
    }

    if (body.action === "trash") {
      const message = await trashMessage(id);
      if (!message) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, message });
    }

    // Default: toggle the read flag.
    const read = body.read === true || body.read === false ? body.read : true;
    const message = await markRead(id, read as boolean);
    if (!message) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message });
  } catch (err) {
    logger.error("[/api/mail/[id]/read PATCH] error", {
      error: (err as Error).message,
    });
    const status = (err as Error).message.includes("required") ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update message" },
      { status },
    );
  }
}

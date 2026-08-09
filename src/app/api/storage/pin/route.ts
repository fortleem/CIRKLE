import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/storage/pin — POST pin or unpin a CID.
//   body: { cid, action: "pin"|"unpin" }
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      cid?: string;
      action?: string;
    } | null;
    if (!body?.cid || !body.action) {
      return NextResponse.json({ error: "cid and action required" }, { status: 400 });
    }
    if (body.action !== "pin" && body.action !== "unpin") {
      return NextResponse.json({ error: "invalid action" }, { status: 400 });
    }
    const pinned = body.action === "pin";
    const existing = await db.storagePin.findUnique({ where: { cid: body.cid } });
    if (!existing) {
      // Allow pinning a CID we don't have bytes for — the pin record is
      // the intent to keep the blob; the bytes may arrive later.
      const created = await db.storagePin.create({
        data: {
          cid: body.cid,
          filename: "unknown",
          mimeType: "application/octet-stream",
          size: 0,
          storageTier: "client",
          pinned,
        },
      });
      return NextResponse.json({ ok: true, pinned: created.pinned });
    }
    const updated = await db.storagePin.update({
      where: { cid: body.cid },
      data: { pinned },
    });
    return NextResponse.json({ ok: true, pinned: updated.pinned });
  } catch (err) {
    logger.error("[/api/storage/pin POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "pin failed" },
      { status: 500 },
    );
  }
}

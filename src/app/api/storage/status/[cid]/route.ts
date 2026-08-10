import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/storage/status/[cid] — GET check upload/pin status of a CID.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ cid: string }> },
) {
  try {
    const { cid } = await ctx.params;
    if (!cid || !/^z[0-9a-f]+$/.test(cid)) {
      return NextResponse.json({ error: "invalid cid" }, { status: 400 });
    }
    const pin = await db.storagePin.findUnique({ where: { cid } });
    if (!pin) {
      return NextResponse.json({
        cid,
        pinned: false,
        storageTier: "none",
        size: 0,
        filename: "",
        available: false,
      });
    }
    return NextResponse.json({
      cid: pin.cid,
      pinned: pin.pinned,
      storageTier: pin.storageTier,
      size: pin.size,
      filename: pin.filename,
      available: pin.storageTier === "local" || pin.storageTier === "ipfs",
    });
  } catch (err) {
    logger.error("[/api/storage/status GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "status failed" },
      { status: 500 },
    );
  }
}

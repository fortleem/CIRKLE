import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/storage/pinned — GET list all pinned CIDs (server-side).
//   GET /api/storage/pinned?username=layla
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const username = sp.get("username") || undefined;
    const where = username ? { uploadedBy: username, pinned: true } : { pinned: true };
    const rows = await db.storagePin.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const pinned = rows.map((r) => ({
      cid: r.cid,
      filename: r.filename,
      size: r.size,
      mimeType: r.mimeType,
      storageTier: r.storageTier,
      pinned: r.pinned,
      uploadedBy: r.uploadedBy,
      createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json({ pinned });
  } catch (err) {
    logger.error("[/api/storage/pinned GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 500 },
    );
  }
}

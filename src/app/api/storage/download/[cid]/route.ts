import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { promises as fs } from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// /api/storage/download/[cid] — GET download a file by CID.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_DIR = path.join(process.cwd(), "db", "storage");

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
    if (!pin || pin.storageTier !== "local" || !pin.filePath) {
      return NextResponse.json(
        { error: "not found on server", hint: "client-tier blobs live in localStorage" },
        { status: 404 },
      );
    }
    const absPath = path.join(process.cwd(), pin.filePath);
    try {
      const buf = await fs.readFile(absPath);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "content-type": pin.mimeType || "application/octet-stream",
          "content-length": String(buf.length),
          "content-disposition": `attachment; filename="${pin.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      // File missing from disk — fall back to checking the canonical path.
      try {
        const buf = await fs.readFile(path.join(STORAGE_DIR, cid));
        return new NextResponse(buf, {
          status: 200,
          headers: {
            "content-type": pin.mimeType || "application/octet-stream",
            "content-length": String(buf.length),
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      } catch {
        return NextResponse.json({ error: "blob missing" }, { status: 410 });
      }
    }
  } catch (err) {
    logger.error("[/api/storage/download GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "download failed" },
      { status: 500 },
    );
  }
}

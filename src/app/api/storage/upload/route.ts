import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────
// /api/storage/upload — POST upload a file (multipart/form-data OR JSON
// for the client-tier pin announcement).
//
//   POST /api/storage/upload
//     Content-Type: multipart/form-data
//     body: file=<blob>, uploadedBy=<username?>
//
//   POST /api/storage/upload
//     Content-Type: application/json
//     body: { cid, filename, mimeType, size, storageTier: "client", uploadedBy? }
//
// The server stores the file under db/storage/{cid} and records a
// StoragePin row. For client-tier uploads, no file is written — we just
// record the pin so other clients can discover the CID.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_DIR = path.join(process.cwd(), "db", "storage");

async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch {
    // best-effort
  }
}

async function sha256Hex(buf: Buffer): Promise<string> {
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  return `z${hash}`;
}

export async function POST(req: NextRequest) {
  try {
    await ensureStorageDir();
    const ct = req.headers.get("content-type") || "";

    // ── JSON pin announcement (client tier) ────────────────────────────
    if (ct.includes("application/json")) {
      const body = (await req.json().catch(() => null)) as {
        cid?: string;
        filename?: string;
        mimeType?: string;
        size?: number;
        storageTier?: string;
        uploadedBy?: string;
      } | null;
      if (!body?.cid) {
        return NextResponse.json({ error: "cid required" }, { status: 400 });
      }
      const pin = await db.storagePin.upsert({
        where: { cid: body.cid },
        create: {
          cid: body.cid,
          filename: body.filename || "client-pin",
          mimeType: body.mimeType || "application/octet-stream",
          size: Number(body.size) || 0,
          storageTier: "client",
          filePath: null,
          uploadedBy: body.uploadedBy || null,
          pinned: true,
        },
        update: { pinned: true },
      });
      return NextResponse.json({
        cid: pin.cid,
        size: pin.size,
        filename: pin.filename,
        mimeType: pin.mimeType,
        storageTier: pin.storageTier,
      });
    }

    // ── multipart/form-data upload ─────────────────────────────────────
    const form = await req.formData();
    const file = form.get("file");
    const uploadedBy = (form.get("uploadedBy") as string | null) || null;
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file field required" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const cid = await sha256Hex(buf);
    const filePath = path.join(STORAGE_DIR, cid);
    await fs.writeFile(filePath, buf);

    const pin = await db.storagePin.upsert({
      where: { cid },
      create: {
        cid,
        filename: file.name || "upload.bin",
        mimeType: file.type || "application/octet-stream",
        size: buf.length,
        storageTier: "local",
        filePath: `db/storage/${cid}`,
        uploadedBy,
        pinned: true,
      },
      update: { pinned: true, size: buf.length },
    });

    logger.info("[/api/storage/upload] stored", { cid, size: buf.length });

    return NextResponse.json({
      cid: pin.cid,
      size: pin.size,
      filename: pin.filename,
      mimeType: pin.mimeType,
      storageTier: pin.storageTier,
    }, { status: 201 });
  } catch (err) {
    logger.error("[/api/storage/upload POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upload failed" },
      { status: 500 },
    );
  }
}

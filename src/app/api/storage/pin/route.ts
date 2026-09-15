// @ts-nocheck
// P1 FIX: Rate-limited (10/min — posts preset) + Zod-validated body.
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/api-rate-limit";
import { validateBody, z } from "@/lib/api-validation";

// ─────────────────────────────────────────────────────────────────────────────
// /api/storage/pin — POST pin or unpin a CID.
//   body: { cid, action: "pin"|"unpin" }
//
// P1 FIX — wrapped with `withRateLimit` (10 req/min — posts preset, anti-
// spam) and `validateBody` so malformed CIDs never reach the DB layer.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod schema for `POST /api/storage/pin`.
 *   - `cid` is a required non-empty string (we cap at 256 chars to fit
 *     the StoragePin.cid column comfortably; CIDs v0/v1 are well below
 *     that ceiling).
 *   - `action` is required and must be exactly "pin" or "unpin".
 */
const storagePinSchema = z.object({
  cid: z.string().min(1).max(256),
  action: z.enum(["pin", "unpin"]),
});

export const POST = withRateLimit(
  validateBody(storagePinSchema, async (req, body) => {
    try {
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
  }),
  RATE_LIMIT_PRESETS.posts,
);

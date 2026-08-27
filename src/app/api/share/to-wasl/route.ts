// @ts-nocheck
/**
 * POST /api/share/to-wasl
 *   Body: ShareSource (wasl | rihla | lamahat | midan | mashahd → wasl)
 *   Returns: ShareTargetResult — typically a draft payload (the actual chat
 *   message POST happens client-side after the user picks a conversation).
 *
 * A3/A4/A7/A8 share-to-Wasl: turns a piece of content from another module
 * into a Wasl chat message draft that the host (Wasl screen) can dispatch.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  dispatchShare,
  type ShareSource,
} from "@/lib/share-targets";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as ShareSource | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    if (!body.body || (typeof body.body === "string" && body.body.trim().length === 0)) {
      if (!(body.media && body.media.length > 0)) {
        return NextResponse.json(
          { error: "body.body or body.media is required" },
          { status: 400 },
        );
      }
    }
    if (body.body && body.body.length > 20_000) {
      return NextResponse.json({ error: "body too long (max 20,000 chars)" }, { status: 400 });
    }
    const result = await dispatchShare(body, "wasl");
    logger.info("[/api/share/to-wasl] dispatched", {
      sourceModule: body.module,
      ok: result.ok,
      elapsedMs: result.elapsedMs,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    logger.error("[/api/share/to-wasl POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to share to wasl" },
      { status: 500 },
    );
  }
}

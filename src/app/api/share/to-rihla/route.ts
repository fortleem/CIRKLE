// @ts-nocheck
/**
 * POST /api/share/to-rihla
 *   Body: { source: ShareSource }
 *   Returns: ShareTargetResult
 *
 * A7 share-to-Rihla: turns a piece of content (typically a Wasl message or
 * Midan post that mentions a place/venue) into a Rihla itinerary draft.
 *
 * Rihla doesn't have a public create endpoint in this scope, so we return a
 * draft payload that the host Rihla screen can pick up and add to a new or
 * existing itinerary.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { dispatchShare, type ShareSource } from "@/lib/share-targets";

export const dynamic = "force-dynamic";

interface RequestBody {
  source: ShareSource;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as RequestBody | null;
    if (!body?.source) {
      return NextResponse.json({ error: "source is required" }, { status: 400 });
    }
    const source = body.source;
    if (!source.body || source.body.trim().length === 0) {
      return NextResponse.json({ error: "source.body is required" }, { status: 400 });
    }
    const result = await dispatchShare(source, "rihla");
    logger.info("[/api/share/to-rihla] dispatched", {
      sourceModule: source.module,
      ok: result.ok,
      elapsedMs: result.elapsedMs,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    logger.error("[/api/share/to-rihla POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to share to rihla" },
      { status: 500 },
    );
  }
}

// @ts-nocheck
/**
 * POST /api/share/to-midan
 *   Body: { source: ShareSource, username?: string }
 *   Returns: ShareTargetResult
 *
 * A4 share-to-Midan: turns a Wasl message / Lamahat photo / Rihla itinerary
 * into a Midan post and POSTs it to /api/posts.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { dispatchShare, type ShareSource } from "@/lib/share-targets";

export const dynamic = "force-dynamic";

interface RequestBody {
  source: ShareSource;
  username?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as RequestBody | null;
    if (!body?.source) {
      return NextResponse.json({ error: "source is required" }, { status: 400 });
    }
    const source = body.source;
    if (!source.body && !(source.media && source.media.length > 0)) {
      return NextResponse.json(
        { error: "source.body or source.media is required" },
        { status: 400 },
      );
    }
    if (source.body && source.body.length > 20_000) {
      return NextResponse.json({ error: "source.body too long" }, { status: 400 });
    }
    const username =
      (body.username ?? req.headers.get("x-cirkle-username") ?? "anonymous")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/^@/, "");
    const result = await dispatchShare(source, "midan", username);
    logger.info("[/api/share/to-midan] dispatched", {
      sourceModule: source.module,
      ok: result.ok,
      id: result.id,
      elapsedMs: result.elapsedMs,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    logger.error("[/api/share/to-midan POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to share to midan" },
      { status: 500 },
    );
  }
}

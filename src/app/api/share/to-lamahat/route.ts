// @ts-nocheck
/**
 * POST /api/share/to-lamahat
 *   Body: { source: ShareSource, username?: string }
 *   Returns: ShareTargetResult
 *
 * A8 share-to-Lamahat: turns a piece of content (typically a Wasl message or
 * Midan post) into a Lamahat photo moment and POSTs it to /api/posts with
 * module:"lamahat".
 *
 * Lamahat is photo-first: if the source has no media, we record a draft
 * (text-only) and the user can attach a photo on the client side.
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
    const username =
      (body.username ?? req.headers.get("x-cirkle-username") ?? "anonymous")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/^@/, "");
    const result = await dispatchShare({ ...source, module: source.module ?? "midan" }, "lamahat", username);
    logger.info("[/api/share/to-lamahat] dispatched", {
      sourceModule: source.module,
      ok: result.ok,
      id: result.id,
      elapsedMs: result.elapsedMs,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    logger.error("[/api/share/to-lamahat POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to share to lamahat" },
      { status: 500 },
    );
  }
}

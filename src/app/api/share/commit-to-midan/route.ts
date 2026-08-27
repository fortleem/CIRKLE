// @ts-nocheck
/**
 * POST /api/share/commit-to-midan
 *   Body: { source: ShareSource, username?: string }
 *   Returns: ShareTargetResult
 *
 * A9 — announces a Commit on Midan without exposing private terms (amounts,
 * dates, emails, phone numbers are stripped before publishing). The post is
 * tagged with `commit`, `cirkle-pact`, `verified` so it surfaces in Midan
 * search for commitment announcements.
 *
 * Delegates the actual DB write to `/api/posts` (module: "midan").
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
    if (!source.body || source.body.trim().length === 0) {
      return NextResponse.json({ error: "source.body is required" }, { status: 400 });
    }
    if (source.body.length > 5_000) {
      return NextResponse.json({ error: "source.body too long (max 5,000 chars)" }, { status: 400 });
    }
    const username =
      (body.username ?? req.headers.get("x-cirkle-username") ?? "anonymous")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/^@/, "");
    const result = await dispatchShare(source, "commit", username);
    logger.info("[/api/share/commit-to-midan] dispatched", {
      sourceModule: source.module,
      ok: result.ok,
      id: result.id,
      elapsedMs: result.elapsedMs,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    logger.error("[/api/share/commit-to-midan POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to share commit to midan" },
      { status: 500 },
    );
  }
}

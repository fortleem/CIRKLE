// @ts-nocheck
/**
 * POST /api/share/to-citizen-shield
 *   Body: { source: ShareSource }
 *   Returns: ShareTargetResult
 *
 * A5 — creates a draft ShieldReport from a Wasl chat message. Pre-fills:
 *   • category (heuristic from message content)
 *   • title (clipped body)
 *   • description (full body + sender info)
 *   • evidenceHashes (any attached media URLs)
 *   • privacyLevel = "protected" (user can downgrade to anonymous later)
 *
 * Delegates the actual DB write to the existing `/api/shield/report` endpoint.
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
    if (source.body.length > 10_000) {
      return NextResponse.json({ error: "source.body too long (max 10,000 chars)" }, { status: 400 });
    }
    const result = await dispatchShare(source, "citizen-shield");
    logger.info("[/api/share/to-citizen-shield] dispatched", {
      sourceModule: source.module,
      ok: result.ok,
      id: result.id,
      elapsedMs: result.elapsedMs,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    logger.error("[/api/share/to-citizen-shield POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to share to citizen shield" },
      { status: 500 },
    );
  }
}

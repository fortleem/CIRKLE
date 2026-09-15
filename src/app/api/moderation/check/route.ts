// @ts-nocheck
/**
 * POST /api/moderation/check
 * ============================================================================
 * Run a single piece of text through the content moderation pipeline
 * (`src/lib/moderation-pipeline.ts`) and return the resulting
 * `ModerationResult`.
 *
 * Rate limited to 20 requests / minute per client IP (anti-abuse + cost
 * control — the AI tier makes external API calls).
 *
 * Body: { text: string, authorId?: string, authorHandle?: string, module?: string }
 * Returns 200 { ok: true, result: ModerationResult } on success.
 * Returns 400 { ok: false, error } on missing `text`.
 * Returns 429 { error: "rate_limit_exceeded" } when over the limit.
 *
 * Public endpoint — does NOT require auth. The pipeline is read-only (no
 * content creation), so anyone can use it to pre-check a draft before
 * posting. Moderation decisions ARE persisted to `ModerationLog` for
 * auditing, but no user content is stored.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-rate-limit";
import { moderateContent } from "@/lib/moderation-pipeline";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest): Promise<Response> {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid JSON body" },
      { status: 400 },
    );
  }

  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json(
      { ok: false, error: "text is required" },
      { status: 400 },
    );
  }
  if (text.length > 5000) {
    return NextResponse.json(
      { ok: false, error: "text must be <= 5000 chars" },
      { status: 400 },
    );
  }

  try {
    const result = await moderateContent({
      text,
      authorId: typeof body?.authorId === "string" ? body.authorId : undefined,
      authorHandle: typeof body?.authorHandle === "string" ? body.authorHandle : undefined,
      module: typeof body?.module === "string" ? body.module : undefined,
    });
    return NextResponse.json(
      { ok: true, result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    logger.error("[/api/moderation/check] error", {
      error: (err as Error)?.message,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "moderation failed",
        message: String((err as Error)?.message || err).slice(0, 200),
      },
      { status: 500 },
    );
  }
}

// 20 req/min per IP — matches the AI tier cost-control budget.
export const POST = withRateLimit(handler, {
  maxRequests: 20,
  windowMs: 60_000,
  keyBy: "ip",
  scope: "moderation/check",
});

// @ts-nocheck
/**
 * POST /api/ai/tone-adjust
 *   Body: { text: string, tone: "formal"|"friendly"|"apologetic"|"assertive"|"diplomatic", recipientName?: string, locale?: "en"|"ar" }
 *   Returns: ToneAdjustResult
 *
 * E5 — AI tone adjustment.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { adjustTone, type Tone } from "@/lib/tone-adjuster";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

const VALID_TONES: Tone[] = ["formal", "friendly", "apologetic", "assertive", "diplomatic"];

export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = (await req.json().catch(() => ({}))) as {
        text?: string;
        tone?: string;
        recipientName?: string;
        locale?: "en" | "ar";
      };

      const text = (body.text ?? "").trim();
      if (!text) {
        return NextResponse.json({ error: "text is required" }, { status: 400 });
      }
      if (text.length > 5_000) {
        return NextResponse.json({ error: "text too long (max 5,000 chars)" }, { status: 400 });
      }

      const tone = (body.tone ?? "").toLowerCase() as Tone;
      if (!VALID_TONES.includes(tone)) {
        return NextResponse.json(
          { error: `tone must be one of: ${VALID_TONES.join(", ")}` },
          { status: 400 },
        );
      }

      const result = await adjustTone({
        text,
        tone,
        recipientName: body.recipientName,
        locale: body.locale === "ar" ? "ar" : "en",
      });

      logger.info("[/api/ai/tone-adjust] ok", {
        tone,
        len: text.length,
        rewrittenLen: result.rewritten.length,
        fallback: result.fallback,
        elapsedMs: result.elapsedMs,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (err) {
      logger.error("[/api/ai/tone-adjust POST] error", {
        error: (err as Error).message,
      });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "failed to adjust tone" },
        { status: 500 },
      );
    }
  },
  { maxRequests: 30, windowMs: 60_000 },
);

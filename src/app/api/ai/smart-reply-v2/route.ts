// @ts-nocheck
/**
 * POST /api/ai/smart-reply-v2
 *   Body: { message: string, senderName?: string, conversationId?: string, locale?: "en"|"ar" }
 *   Returns: { replies: string[], provider: string, elapsedMs: number, fallback: boolean }
 *
 * Wraps `getSmartReplies()` with rate-limiting + JSON validation. Always
 * returns 200 with at least 3 fallback replies so the UI never breaks.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSmartReplies } from "@/lib/smart-reply";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

const FALLBACK_REPLIES = ["Sounds good! 👍", "On my way!", "Got it, thanks."];

export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = (await req.json().catch(() => ({}))) as {
        message?: string;
        senderName?: string;
        conversationId?: string;
        locale?: "en" | "ar";
      };

      const message = (body.message ?? "").trim();
      if (!message) {
        return NextResponse.json(
          { error: "message is required" },
          { status: 400 },
        );
      }
      if (message.length > 5_000) {
        return NextResponse.json(
          { error: "message too long (max 5,000 chars)" },
          { status: 400 },
        );
      }

      const result = await getSmartReplies({
        message,
        senderName: body.senderName,
        conversationId: body.conversationId,
        locale: body.locale === "ar" ? "ar" : "en",
      });

      return NextResponse.json(result, { status: 200 });
    } catch (err) {
      logger.error("[/api/ai/smart-reply-v2 POST] error", {
        error: (err as Error).message,
      });
      return NextResponse.json(
        {
          replies: FALLBACK_REPLIES,
          provider: "fallback",
          elapsedMs: 0,
          fallback: true,
        },
        { status: 200 },
      );
    }
  },
  { maxRequests: 30, windowMs: 60_000 },
);

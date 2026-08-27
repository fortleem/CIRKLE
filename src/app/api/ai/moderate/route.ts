// @ts-nocheck
/**
 * POST /api/ai/moderate
 *   Body: { content: string, contentId?: string, contentType?: "post"|"message"|"comment", authorHandle?: string, locale?: "en"|"ar" }
 *   Returns: ModerationResult { safe, category, confidence, action, reason, provider, elapsedMs, fallback, contentId }
 *
 * E10 — real-time AI content moderation. Persists each decision to the
 * `ModerationLog` Prisma model (best-effort — DB failures don't break the
 * response).
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { moderateContent, type ContentType } from "@/lib/content-moderation";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

const VALID_CONTENT_TYPES: ContentType[] = ["post", "message", "comment"];

export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = (await req.json().catch(() => ({}))) as {
        content?: string;
        contentId?: string;
        contentType?: string;
        authorHandle?: string;
        locale?: "en" | "ar";
      };

      const content = (body.content ?? "").trim();
      if (!content) {
        return NextResponse.json({ error: "content is required" }, { status: 400 });
      }
      if (content.length > 10_000) {
        return NextResponse.json({ error: "content too long (max 10,000 chars)" }, { status: 400 });
      }

      const contentType = VALID_CONTENT_TYPES.includes(body.contentType as ContentType)
        ? (body.contentType as ContentType)
        : "post";

      const result = await moderateContent({
        content,
        contentId: body.contentId,
        contentType,
        authorHandle: body.authorHandle,
        locale: body.locale === "ar" ? "ar" : "en",
      });

      logger.info("[/api/ai/moderate] decision", {
        contentId: result.contentId,
        contentType,
        category: result.category,
        confidence: result.confidence,
        action: result.action,
        fallback: result.fallback,
        elapsedMs: result.elapsedMs,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (err) {
      logger.error("[/api/ai/moderate POST] error", {
        error: (err as Error).message,
      });
      // Fail-safe: when moderation itself errors, we default to "flag" rather
      // than block — better to let a human review than to silently break.
      return NextResponse.json(
        {
          safe: false,
          category: "clean",
          confidence: 0,
          action: "flag",
          reason: "moderation error — flagged for review",
          provider: "error",
          elapsedMs: 0,
          fallback: true,
          contentId: `err-${Date.now()}`,
        },
        { status: 200 },
      );
    }
  },
  { maxRequests: 60, windowMs: 60_000 },
);

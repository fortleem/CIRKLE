// @ts-nocheck
/**
 * GET /api/ai/catch-up
 *   Query: ?username=…&sinceHours=24&locale=en
 *   Returns: CatchUpResult
 *
 * E3 — personalized "While you were away…" summary across all modules.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generateCatchUp } from "@/lib/ai-catch-up";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(
  async (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const username =
        (url.searchParams.get("username") ?? req.headers.get("x-cirkle-username") ?? "anonymous")
          .toString()
          .trim()
          .toLowerCase()
          .replace(/^@/, "");
      const sinceHoursRaw = parseInt(url.searchParams.get("sinceHours") ?? "24", 10);
      const sinceHours = Number.isFinite(sinceHoursRaw) && sinceHoursRaw > 0 && sinceHoursRaw <= 168 ? sinceHoursRaw : 24;
      const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";

      const result = await generateCatchUp({ username, sinceHours, locale });
      logger.info("[/api/ai/catch-up] generated", {
        username,
        cards: result.cards.length,
        fallback: result.fallback,
        elapsedMs: result.elapsedMs,
      });
      return NextResponse.json(result, { status: 200 });
    } catch (err) {
      logger.error("[/api/ai/catch-up GET] error", {
        error: (err as Error).message,
      });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "failed to generate catch-up" },
        { status: 500 },
      );
    }
  },
  { maxRequests: 30, windowMs: 60_000 },
);

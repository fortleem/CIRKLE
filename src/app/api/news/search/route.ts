// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-rate-limit";
import { validateBody, z } from "@/lib/api-validation";

/**
 * GET /api/news/search?q=...
 * Existing news search entry-point used by `home-screen.tsx`. Now wrapped
 * with `withRateLimit` (30 req/min — anti-abuse on ai-generated search).
 */
export const GET = withRateLimit(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    if (!q) return NextResponse.json({ articles: [] });
    try {
      const { generateNewsViaAI } = await import("@/lib/news-fallback");
      const country = searchParams.get("country") || "EG";
      const articles = await generateNewsViaAI(country, undefined, q);
      return NextResponse.json({ articles });
    } catch {
      return NextResponse.json({ articles: [] });
    }
  },
  { maxRequests: 30, windowMs: 60_000 },
);

/**
 * Body schema for `POST /api/news/search`. `q` is required and capped at
 * 200 chars to match the underlying AI generator's input budget. `country`
 * defaults to "EG" inside the handler when omitted.
 */
const newsSearchSchema = z.object({
  q: z.string().min(1).max(200),
  country: z.string().min(2).max(2).optional(),
  category: z.string().max(40).optional(),
});

/**
 * POST /api/news/search
 * Body: {q, country?, category?}
 *
 * Validated POST alternative to the GET entry-point. Returns
 * `{ articles: [...] }`. Useful for callers that want structured body
 * validation rather than query-string params (and is the form the
 * production-readiness task brief explicitly calls out).
 */
export const POST = withRateLimit(
  validateBody(newsSearchSchema, async (_req, body) => {
    try {
      const { generateNewsViaAI } = await import("@/lib/news-fallback");
      const articles = await generateNewsViaAI(
        body.country ?? "EG",
        undefined,
        body.q,
      );
      return NextResponse.json({ articles });
    } catch {
      return NextResponse.json({ articles: [] });
    }
  }),
  { maxRequests: 30, windowMs: 60_000 },
);

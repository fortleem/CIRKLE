// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { universalSearch, type SearchResult } from "@/lib/universal-search";
import { logger } from "@/lib/logger";

/**
 * GET /api/search?q=<query>&modules=wasl,midan&limit=20
 *
 * Universal cross-module search across every CIRKLE content surface.
 * Returns `{ query, modules, count, results }`.
 *
 * Query params:
 *   - q        (required) — search query string
 *   - modules  (optional) — comma-separated module short-codes:
 *                            wasl | midan | lamahat | mashahd | rihla |
 *                            circles | news | federation
 *   - limit    (optional) — max results, 1..100, default 20
 *   - userId   (optional) — current user identifier (User.id or handle),
 *                            used for permission-gating Wasl conversations
 *                            and messages.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const modulesParam = searchParams.get("modules");
    const modules = modulesParam
      ? modulesParam
          .split(",")
          .map((m) => m.trim().toLowerCase())
          .filter(Boolean)
      : undefined;
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(limitParam) ? limitParam : 20;
    const userId = searchParams.get("userId") || undefined;

    if (!q) {
      return NextResponse.json({
        query: "",
        modules: modules ?? [],
        count: 0,
        results: [] as SearchResult[],
      });
    }

    const results = await universalSearch(q, { modules, limit, userId });

    return NextResponse.json({
      query: q,
      modules: modules ?? [],
      count: results.length,
      results,
    });
  } catch (err) {
    logger.error("[/api/search] GET error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "search failed",
        results: [],
        count: 0,
      },
      { status: 500 },
    );
  }
}

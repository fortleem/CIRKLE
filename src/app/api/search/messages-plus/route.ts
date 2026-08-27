// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  searchWithRanking, parseQuery,
  getSearchHistory, clearSearchHistory,
  saveSearch, listSavedSearches, deleteSavedSearch,
  suggestQueries, getSearchStats,
} from "@/lib/message-search-plus";
import { logger } from "@/lib/logger";

/**
 * GET /api/search/messages-plus
 *   ?userId=...&q=...&conversationId=...&limit=...  → ranked search
 *   ?userId=...&history=1                            → search history
 *   ?userId=...&saved=1                              → saved searches
 *   ?userId=...&suggest=prefix                       → query suggestions
 *   ?userId=...&stats=1                              → search stats
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const userId = sp.get("userId") || "";
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    if (sp.get("history") === "1") {
      const limit = parseInt(sp.get("limit") || "20", 10) || 20;
      const history = await getSearchHistory(userId, limit);
      return NextResponse.json({ history });
    }
    if (sp.get("saved") === "1") {
      const saved = await listSavedSearches(userId);
      return NextResponse.json({ saved });
    }
    if (sp.has("suggest")) {
      const prefix = sp.get("suggest") || "";
      const suggestions = await suggestQueries(userId, prefix);
      return NextResponse.json({ suggestions });
    }
    if (sp.get("stats") === "1") {
      const stats = await getSearchStats(userId);
      return NextResponse.json({ stats });
    }

    const q = sp.get("q") || "";
    const conversationId = sp.get("conversationId") || undefined;
    const limit = parseInt(sp.get("limit") || "50", 10) || 50;
    if (!q) return NextResponse.json({ error: "q is required" }, { status: 400 });
    const result = await searchWithRanking({ userId, rawQuery: q, conversationId, limit });
    return NextResponse.json(result);
  } catch (err) {
    logger.error("[/api/search/messages-plus GET]", { error: (err as Error).message });
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to search" }, { status: 500 });
  }
}

/**
 * POST /api/search/messages-plus
 *   { action: 'search', userId, q, conversationId?, limit? }
 *   { action: 'save',     userId, name, q }
 *   { action: 'deleteSaved', searchId }
 *   { action: 'clearHistory', userId }
 *   { action: 'parse', q }  → returns parsed query (no execution)
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "parse") {
      const q = typeof body.q === "string" ? body.q : "";
      return NextResponse.json({ parsed: parseQuery(q) });
    }
    if (action === "search") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const q = typeof body.q === "string" ? body.q : "";
      const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
      const limit = typeof body.limit === "number" ? body.limit : 50;
      if (!userId || !q) return NextResponse.json({ error: "userId + q required" }, { status: 400 });
      const result = await searchWithRanking({ userId, rawQuery: q, conversationId, limit });
      return NextResponse.json(result);
    }
    if (action === "save") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const name = typeof body.name === "string" ? body.name : "";
      const q = typeof body.q === "string" ? body.q : "";
      if (!userId || !name || !q) {
        return NextResponse.json({ error: "userId + name + q required" }, { status: 400 });
      }
      const saved = await saveSearch(userId, name, q);
      return NextResponse.json({ saved }, { status: 201 });
    }
    if (action === "deleteSaved") {
      const sid = typeof body.searchId === "string" ? body.searchId : "";
      if (!sid) return NextResponse.json({ error: "searchId required" }, { status: 400 });
      const ok = await deleteSavedSearch(sid);
      return NextResponse.json({ deleted: ok });
    }
    if (action === "clearHistory") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const count = await clearSearchHistory(userId);
      return NextResponse.json({ cleared: count });
    }

    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    logger.error("[/api/search/messages-plus POST]", { error: (err as Error).message });
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to mutate" }, { status: 500 });
  }
}

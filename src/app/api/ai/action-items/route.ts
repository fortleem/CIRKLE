// @ts-nocheck
/**
 * POST /api/ai/action-items
 *   Body: { conversationId, messages?, locale? }
 *   Returns: ExtractResult
 *
 * GET /api/ai/action-items
 *   Query: ?conversationId=…&pendingOnly=true&dueBefore=ISO&limit=50
 *   Returns: { items: ActionItem[] }
 *
 * E8 — AI action item extraction + listing.
 *
 * POST scans messages and persists extracted items to the `ActionItem` table.
 * GET lists pending items.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  extractActionItems,
  listActionItems,
  markActionItemDone,
} from "@/lib/action-items";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

interface PostBody {
  conversationId?: string;
  messages?: Array<{ id: string; body: string; senderName?: string; at?: string }>;
  locale?: "en" | "ar";
}

async function fetchMessages(conversationId: string, username: string): Promise<Array<{ id: string; body: string; senderName?: string; at?: string }>> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages?limit=50`,
      {
        headers: { "x-cirkle-username": username },
        signal: ctrl.signal,
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const data = (await res.json().catch(() => null)) as { messages?: Array<{ id?: string; body?: string; senderName?: string; createdAt?: string }> } | null;
    if (!data?.messages) return [];
    return data.messages
      .map((m) => ({
        id: m.id ?? Math.random().toString(36).slice(2),
        body: m.body ?? "",
        senderName: m.senderName,
        at: m.createdAt,
      }))
      .filter((m) => m.body.length > 0);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = (await req.json().catch(() => ({}))) as PostBody;
      if (!body.conversationId) {
        return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
      }

      const username = (req.headers.get("x-cirkle-username") ?? "anonymous")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/^@/, "");

      let messages = Array.isArray(body.messages) ? body.messages : undefined;
      if (!messages) {
        messages = await fetchMessages(body.conversationId, username);
      }

      const result = await extractActionItems({
        conversationId: body.conversationId,
        messages,
        locale: body.locale === "ar" ? "ar" : "en",
      });

      logger.info("[/api/ai/action-items POST] ok", {
        conversationId: body.conversationId,
        extracted: result.items.length,
        fallback: result.fallback,
        elapsedMs: result.elapsedMs,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (err) {
      logger.error("[/api/ai/action-items POST] error", {
        error: (err as Error).message,
      });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "failed to extract action items" },
        { status: 500 },
      );
    }
  },
  { maxRequests: 20, windowMs: 60_000 },
);

export const GET = withRateLimit(
  async (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const conversationId = url.searchParams.get("conversationId") ?? undefined;
      const pendingOnly = url.searchParams.get("pendingOnly") === "true";
      const dueBefore = url.searchParams.get("dueBefore") ?? undefined;
      const limitRaw = parseInt(url.searchParams.get("limit") ?? "50", 10);
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 100 ? limitRaw : 50;

      const items = await listActionItems({ conversationId, pendingOnly, dueBefore, limit });
      return NextResponse.json({ items }, { status: 200 });
    } catch (err) {
      logger.error("[/api/ai/action-items GET] error", {
        error: (err as Error).message,
      });
      return NextResponse.json({ items: [] }, { status: 200 });
    }
  },
  { maxRequests: 60, windowMs: 60_000 },
);

/**
 * PATCH /api/ai/action-items
 *   Body: { id, done? }   (done defaults to true)
 *   Returns: { id, done } | { error }
 */
export const PATCH = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = (await req.json().catch(() => ({}))) as { id?: string; done?: boolean };
      if (!body.id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }
      const result = await markActionItemDone(body.id);
      if (!result) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      return NextResponse.json(result, { status: 200 });
    } catch (err) {
      logger.error("[/api/ai/action-items PATCH] error", {
        error: (err as Error).message,
      });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "failed to update action item" },
        { status: 500 },
      );
    }
  },
  { maxRequests: 60, windowMs: 60_000 },
);

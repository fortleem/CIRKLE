// @ts-nocheck
/**
 * POST /api/ai/conversation-starters
 *   Body: { conversationId, contactName?, recentMessages?, sharedInterests?, locale? }
 *   Returns: StarterResult
 *
 * E6 — generates 3 conversation starter chips.
 *
 * If `recentMessages` is not supplied, the route fetches the last 12 messages
 * from `/api/conversations/[id]/messages` (4s timeout) so callers can omit it.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getStarters } from "@/lib/conversation-starters";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

interface RequestBody {
  conversationId?: string;
  contactName?: string;
  recentMessages?: string[];
  sharedInterests?: string[];
  locale?: "en" | "ar";
}

async function fetchRecentMessages(conversationId: string, username: string): Promise<string[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages?limit=12`,
      {
        headers: { "x-cirkle-username": username },
        signal: ctrl.signal,
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const data = (await res.json().catch(() => null)) as { messages?: Array<{ body?: string }> } | null;
    if (!data?.messages) return [];
    return data.messages
      .map((m) => m.body ?? "")
      .filter((b): b is string => typeof b === "string" && b.length > 0);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = (await req.json().catch(() => ({}))) as RequestBody;
      if (!body.conversationId || typeof body.conversationId !== "string") {
        return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
      }

      const username = (req.headers.get("x-cirkle-username") ?? "anonymous")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/^@/, "");

      let recentMessages = Array.isArray(body.recentMessages) ? body.recentMessages : undefined;
      if (!recentMessages) {
        recentMessages = await fetchRecentMessages(body.conversationId, username);
      }

      const result = await getStarters({
        conversationId: body.conversationId,
        contactName: body.contactName,
        recentMessages,
        sharedInterests: body.sharedInterests,
        locale: body.locale === "ar" ? "ar" : "en",
      });

      logger.info("[/api/ai/conversation-starters] ok", {
        conversationId: body.conversationId,
        count: result.starters.length,
        fallback: result.fallback,
        elapsedMs: result.elapsedMs,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (err) {
      logger.error("[/api/ai/conversation-starters POST] error", {
        error: (err as Error).message,
      });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "failed to generate starters" },
        { status: 500 },
      );
    }
  },
  { maxRequests: 30, windowMs: 60_000 },
);

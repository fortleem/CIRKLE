// @ts-nocheck
/**
 * GET /api/ai/friendship-health
 *   Query: ?contactId=…&contactName=…&locale=en
 *   Returns: FriendshipHealthResult
 *
 * E7 — friendship health meter.
 *
 * If `messages` is not supplied in the query, the route fetches recent
 * messages from `/api/conversations/[id]/messages` (4s timeout) where the
 * conversation id is derived from the contact's handle (best-effort — falls
 * back to no messages).
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getFriendshipHealth } from "@/lib/friendship-health";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

interface RawMsg {
  body?: string;
  senderName?: string;
  senderId?: string;
  createdAt?: string;
}

async function fetchMessages(contactId: string, username: string): Promise<Array<{ body: string; direction: "in" | "out"; at: string }>> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    // Best-effort: assume contactId maps to a conversation id.
    const res = await fetch(
      `/api/conversations/${encodeURIComponent(contactId)}/messages?limit=100`,
      {
        headers: { "x-cirkle-username": username },
        signal: ctrl.signal,
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const data = (await res.json().catch(() => null)) as { messages?: RawMsg[] } | null;
    if (!data?.messages) return [];
    return data.messages
      .map((m) => ({
        body: m.body ?? "",
        direction: ((m.senderId ?? m.senderName ?? "") === username ? "out" : "in") as "in" | "out",
        at: m.createdAt ?? new Date().toISOString(),
      }))
      .filter((m) => m.body.length > 0);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

export const GET = withRateLimit(
  async (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const contactId = url.searchParams.get("contactId");
      if (!contactId) {
        return NextResponse.json({ error: "contactId is required" }, { status: 400 });
      }
      const contactName = url.searchParams.get("contactName") ?? undefined;
      const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";
      const username = (req.headers.get("x-cirkle-username") ?? "anonymous")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/^@/, "");

      const messages = await fetchMessages(contactId, username);

      const result = await getFriendshipHealth({
        contactId,
        contactName,
        messages,
        locale,
      });

      logger.info("[/api/ai/friendship-health] ok", {
        contactId,
        score: result.score,
        trend: result.trend,
        alerts: result.alerts.length,
        fallback: result.fallback,
        elapsedMs: result.elapsedMs,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (err) {
      logger.error("[/api/ai/friendship-health GET] error", {
        error: (err as Error).message,
      });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "failed to compute friendship health" },
        { status: 500 },
      );
    }
  },
  { maxRequests: 30, windowMs: 60_000 },
);

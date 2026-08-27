// @ts-nocheck
/**
 * GET /api/notifications/ranked
 *   Query: ?username=…&limit=20
 *   Returns: { groups: GroupedNotifications, count, generatedAt, fallback }
 *
 * E4 — pulls notifications from the existing notification sources, ranks them
 * by AI priority, groups them by priority band, and returns the grouped
 * payload for the smart-notifications-v2 overlay.
 *
 * Notifications are gathered from internal endpoints in parallel:
 *   • /api/conversations?unread=true  → Wasl DMs
 *   • /api/social-feed?filter=mentions → Midan mentions
 *   • /api/circles/events             → Circle events
 *   • /api/shield/panic?status=pending → Shield alerts
 *
 * Failures degrade gracefully — the missing module contributes 0 notifications.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  rankWithSentiment,
  groupByPriority,
  type NotificationInput,
  type RankedNotification,
} from "@/lib/smart-notifications";
import { withRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

interface RawConv {
  id: string;
  name?: string;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageAt?: string;
}
interface RawPost { id: string; author?: string; body?: string; createdAt?: string; }
interface RawEvent { id: string; title?: string; at?: string; }

async function fetchJson(url: string, username: string, timeoutMs = 4000): Promise<Record<string, unknown> | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "x-cirkle-username": username },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as Record<string, unknown> | null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function toNotifs(
  wasl: Record<string, unknown> | null,
  midan: Record<string, unknown> | null,
  circle: Record<string, unknown> | null,
  shield: Record<string, unknown> | null,
): NotificationInput[] {
  const out: NotificationInput[] = [];
  const now = new Date().toISOString();

  // Wasl unread
  const waslConvs = Array.isArray(wasl?.conversations)
    ? (wasl!.conversations as RawConv[])
    : [];
  for (const c of waslConvs) {
    if (!c.unreadCount || c.unreadCount < 1) continue;
    out.push({
      id: `wasl-${c.id}`,
      source: "wasl",
      type: "dm",
      title: `${c.unreadCount} unread in ${c.name ?? "conversation"}`,
      preview: c.lastMessage ?? "",
      at: c.lastMessageAt ?? now,
      count: c.unreadCount,
      mentionsYou: /@\w+/.test(c.lastMessage ?? ""),
      isQuestion: /\?$|^(do|did|are|is|can|will|when|where|why|how)\b/i.test(c.lastMessage ?? ""),
    });
  }

  // Midan mentions
  const midanPosts = Array.isArray(midan?.mentions)
    ? (midan!.mentions as RawPost[])
    : Array.isArray(midan?.posts)
      ? (midan!.posts as RawPost[])
      : [];
  for (const p of midanPosts) {
    out.push({
      id: `midan-${p.id}`,
      source: "midan",
      type: "mention",
      title: `@${p.author ?? "user"} mentioned you`,
      preview: (p.body ?? "").slice(0, 160),
      at: p.createdAt ?? now,
      count: 1,
      mentionsYou: true,
    });
  }

  // Circle events
  const events = Array.isArray(circle?.events)
    ? (circle!.events as RawEvent[])
    : [];
  for (const e of events) {
    out.push({
      id: `circle-${e.id}`,
      source: "circle",
      type: "event",
      title: e.title ?? "New Circle event",
      preview: "Upcoming event in your Circle",
      at: e.at ?? now,
      count: 1,
    });
  }

  // Shield alerts
  const alerts = Array.isArray(shield?.alerts)
    ? (shield!.alerts as Array<Record<string, unknown>>)
    : [];
  for (const a of alerts) {
    out.push({
      id: `shield-${a.id ?? Math.random().toString(36).slice(2)}`,
      source: "shield",
      type: "alert",
      title: (a.title as string) ?? "Shield alert",
      preview: (a.preview as string) ?? "Check Citizen Shield for details",
      at: (a.at as string) ?? now,
      count: 1,
    });
  }

  return out;
}

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
      const limitRaw = parseInt(url.searchParams.get("limit") ?? "30", 10);
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 100 ? limitRaw : 30;

      const [wasl, midan, circle, shield] = await Promise.all([
        fetchJson(`/api/conversations?unread=true`, username),
        fetchJson(`/api/social-feed?filter=mentions`, username),
        fetchJson(`/api/circles/events`, username),
        fetchJson(`/api/shield/panic?status=pending`, username),
      ]);

      const notifs = toNotifs(wasl, midan, circle, shield).slice(0, limit);
      const ranked: RankedNotification[] = await rankWithSentiment(notifs);
      const groups = groupByPriority(ranked);
      const count = ranked.length;

      logger.info("[/api/notifications/ranked] generated", {
        username,
        count,
        urgent: groups.urgent.length,
        important: groups.important.length,
        normal: groups.normal.length,
        low: groups.low.length,
      });

      return NextResponse.json({
        groups,
        count,
        generatedAt: new Date().toISOString(),
        fallback: false,
      }, { status: 200 });
    } catch (err) {
      logger.error("[/api/notifications/ranked GET] error", {
        error: (err as Error).message,
      });
      return NextResponse.json(
        {
          groups: { urgent: [], important: [], normal: [], low: [] },
          count: 0,
          generatedAt: new Date().toISOString(),
          fallback: true,
          error: err instanceof Error ? err.message : "failed to rank notifications",
        },
        { status: 200 },
      );
    }
  },
  { maxRequests: 30, windowMs: 60_000 },
);

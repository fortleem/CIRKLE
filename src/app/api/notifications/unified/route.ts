// @ts-nocheck
/**
 * GET  /api/notifications/unified?userId=…&priority=…&limit=…
 * POST /api/notifications/unified   body: { action: "mark_read" | "mark_all_read", id? }
 *
 * Returns the unified notification list (merged across all CIRKLE sources)
 * and supports marking notifications as read.
 *
 * Uses the comprehensive rate-limit presets from `@/lib/rate-limit-all` so
 * read operations are bounded at PUBLIC (60/min) and writes at SENSITIVE
 * (10/min) to prevent mark-as-read spam abuse.
 */
import { NextRequest, NextResponse } from "next/server";
import { withRateLimitAll, RATE_LIMIT_PRESETS_ALL } from "@/lib/rate-limit-all";
import {
  getUnifiedNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getNotificationsByPriority,
  groupNotifications,
  type UnifiedNotification,
  type NotificationPriority,
} from "@/lib/notification-center";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// ── GET ──────────────────────────────────────────────────────────────────────

async function handleGet(req: NextRequest): Promise<Response> {
  try {
    const url = new URL(req.url);
    const userId =
      url.searchParams.get("userId") ??
      req.headers.get("x-cirkle-user-id") ??
      undefined;
    const priority = url.searchParams.get("priority") ?? undefined;
    const limitRaw = parseInt(url.searchParams.get("limit") ?? "100", 10);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 500 ? limitRaw : 100;
    const group = url.searchParams.get("group") === "true";

    let notifs: UnifiedNotification[];
    if (priority) {
      notifs = await getNotificationsByPriority(priority);
    } else {
      notifs = await getUnifiedNotifications(userId);
    }

    const sliced = notifs.slice(0, limit);
    const unreadCount = sliced.filter((n) => !n.read).length;

    if (group) {
      return NextResponse.json(
        {
          count: sliced.length,
          unreadCount,
          groups: groupNotifications(sliced),
          generatedAt: new Date().toISOString(),
          source: "db",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        count: sliced.length,
        unreadCount,
        notifications: sliced,
        generatedAt: new Date().toISOString(),
        source: "db",
      },
      { status: 200 },
    );
  } catch (err) {
    logger.error("unified-notifications GET failed", { error: String(err) });
    return NextResponse.json(
      {
        error: "internal_error",
        message: "failed to load unified notifications",
        notifications: [],
        count: 0,
        unreadCount: 0,
        source: "fallback",
      },
      { status: 200 }, // 200 + empty list — client always gets a payload
    );
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

interface PostBody {
  action: "mark_read" | "mark_all_read" | "get_unread_count";
  id?: string;
  priority?: string;
}

async function handlePost(req: NextRequest): Promise<Response> {
  try {
    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "request body must be valid JSON" },
        { status: 400 },
      );
    }

    if (body.action === "mark_read") {
      if (!body.id) {
        return NextResponse.json(
          { error: "missing_id", message: "id is required for mark_read" },
          { status: 400 },
        );
      }
      await markAsRead(body.id);
      return NextResponse.json(
        { ok: true, id: body.id, markedAt: new Date().toISOString() },
        { status: 200 },
      );
    }

    if (body.action === "mark_all_read") {
      await markAllAsRead();
      const unread = await getUnreadCount();
      return NextResponse.json(
        { ok: true, remainingUnread: unread, markedAt: new Date().toISOString() },
        { status: 200 },
      );
    }

    if (body.action === "get_unread_count") {
      const count = await getUnreadCount();
      return NextResponse.json({ unreadCount: count }, { status: 200 });
    }

    return NextResponse.json(
      {
        error: "invalid_action",
        message: "action must be mark_read | mark_all_read | get_unread_count",
      },
      { status: 400 },
    );
  } catch (err) {
    logger.error("unified-notifications POST failed", { error: String(err) });
    return NextResponse.json(
      { error: "internal_error", message: "failed to process notification action" },
      { status: 500 },
    );
  }
}

// ── Wire up rate limiting ────────────────────────────────────────────────────

export const GET = withRateLimitAll(handleGet, {
  ...RATE_LIMIT_PRESETS_ALL.PUBLIC,
  scope: "/api/notifications/unified:get",
});

export const POST = withRateLimitAll(handlePost, {
  ...RATE_LIMIT_PRESETS_ALL.SENSITIVE,
  scope: "/api/notifications/unified:post",
});

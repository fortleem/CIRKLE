// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import {
  addToStash,
  getStashItem,
  getStashSummary,
  listStash,
  markSynced,
  pruneExpiredForUser,
  removeFromStash,
  STASH_CONTENT_TYPES,
  STASH_SYNC_STATUSES,
} from "@/lib/offline-stash";

/**
 * GET /api/stash?user=<handle>
 *   Optional: ?contentType=post&syncStatus=synced&limit=50&cursor=0&summary=1
 *
 * Lists the user's stashed items (newest first). When `?summary=1` is
 * set, returns a storage-budget summary instead of the item list.
 *
 * Expired rows are excluded from the response and lazily purged
 * best-effort on each GET.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const user = (sp.get("user") || "").trim().toLowerCase().replace(/^@/, "");
    if (!user) {
      return NextResponse.json({ error: "user is required" }, { status: 400 });
    }

    // Lazy purge expired rows for this user (best-effort).
    await pruneExpiredForUser(user).catch(() => {});

    if (sp.get("summary") === "1") {
      const summary = await getStashSummary(user);
      return NextResponse.json(summary, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const contentType = sp.get("contentType") || undefined;
    if (contentType && !STASH_CONTENT_TYPES.includes(contentType as never)) {
      return NextResponse.json(
        { error: `contentType must be one of: ${STASH_CONTENT_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    const syncStatus = sp.get("syncStatus") || undefined;
    if (syncStatus && !STASH_SYNC_STATUSES.includes(syncStatus as never)) {
      return NextResponse.json(
        { error: `syncStatus must be one of: ${STASH_SYNC_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const limit = sp.has("limit") ? Math.max(1, Math.min(200, Number(sp.get("limit")) || 50)) : 50;
    const cursor = sp.has("cursor") ? Number(sp.get("cursor")) : 0;

    const result = await listStash(user, { contentType, syncStatus, limit, cursor });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to list stash";
    logger.error("[/api/stash GET] error", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/stash
 * Body: {
 *   user, contentType, contentId?, title?, body?, mediaUrl?,
 *   sourceUrl?, metadata?, contentHash?, sizeBytes?, ttlDays?
 * }
 *
 * Adds a new stash item (or refreshes an existing one if the
 * contentHash matches). Returns the stashed item with its server id.
 *
 * The `user` field is the caller's handle. In a future auth upgrade,
 * this would come from the session instead of the body.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      user?: string;
      contentType?: string;
      contentId?: string;
      title?: string;
      body?: string;
      mediaUrl?: string;
      sourceUrl?: string;
      metadata?: Record<string, unknown> | null;
      contentHash?: string;
      sizeBytes?: number;
      ttlDays?: number;
      action?: string; // "add" | "synced" — default "add"
      itemId?: string; // for action="synced"
    } | null;

    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    const user = (body.user || "").trim().toLowerCase().replace(/^@/, "");
    if (!user) {
      return NextResponse.json({ error: "user is required" }, { status: 400 });
    }

    // Sub-action: mark an existing item as synced (after a deferred
    // upload completes).
    if (body.action === "synced") {
      if (!body.itemId) {
        return NextResponse.json({ error: "itemId is required for action=synced" }, { status: 400 });
      }
      const item = await markSynced(user, body.itemId);
      if (!item) {
        return NextResponse.json({ error: "stash item not found" }, { status: 404 });
      }
      return NextResponse.json(item, { status: 200 });
    }

    if (!body.contentType) {
      return NextResponse.json({ error: "contentType is required" }, { status: 400 });
    }

    const item = await addToStash({
      userLabel: user,
      contentType: body.contentType,
      contentId: body.contentId,
      title: body.title,
      body: body.body,
      mediaUrl: body.mediaUrl,
      sourceUrl: body.sourceUrl,
      metadata: body.metadata,
      contentHash: body.contentHash,
      sizeBytes: body.sizeBytes != null ? Number(body.sizeBytes) : 0,
      ttlDays: body.ttlDays != null ? Number(body.ttlDays) : undefined,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to add stash item";
    logger.error("[/api/stash POST] error", { error: msg });
    const status = msg.includes("required") || msg.includes("must be") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * DELETE /api/stash?user=<handle>&id=<itemId>
 *
 * Removes a single stash item. Only the owner can delete their own
 * stashed items — a mismatched `user` returns 404 (not 403) to avoid
 * leaking the existence of an item.
 */
export async function DELETE(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const user = (sp.get("user") || "").trim().toLowerCase().replace(/^@/, "");
    const id = (sp.get("id") || "").trim();
    if (!user) {
      return NextResponse.json({ error: "user is required" }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Verify ownership before delete — returns 404 for non-owned items.
    const existing = await getStashItem(user, id);
    if (!existing) {
      return NextResponse.json({ error: "stash item not found" }, { status: 404 });
    }

    const ok = await removeFromStash(user, id);
    if (!ok) {
      return NextResponse.json({ error: "stash item not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to delete stash item";
    logger.error("[/api/stash DELETE] error", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

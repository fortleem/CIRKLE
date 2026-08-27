// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  startSharingLocation,
  stopSharingLocation,
  getSharedLocations,
  updateLocation,
} from "@/lib/live-location";
import { logger } from "@/lib/logger";

/**
 * GET /api/location/share?conversationId=...
 * Returns all active location shares in a conversation.
 */
export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get("conversationId") || "";
    if (!conversationId) return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    const shares = await getSharedLocations(conversationId);
    return NextResponse.json({ shares });
  } catch (err) {
    logger.error("[/api/location/share GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list shares" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/location/share
 * Body: { conversationId, userId, lat, lng, accuracy?, durationSec?, shareId? }
 * - With shareId: updates an existing share's location.
 * - Without: starts a new share.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    if (typeof body.shareId === "string" && body.shareId) {
      const updated = await updateLocation(
        body.shareId,
        typeof body.lat === "number" ? body.lat : 0,
        typeof body.lng === "number" ? body.lng : 0,
        typeof body.accuracy === "number" ? body.accuracy : undefined,
      );
      if (!updated) return NextResponse.json({ error: "share not found or expired" }, { status: 404 });
      return NextResponse.json({ share: updated });
    }
    const share = await startSharingLocation({
      conversationId: typeof body.conversationId === "string" ? body.conversationId : "",
      userId: typeof body.userId === "string" ? body.userId : "",
      lat: typeof body.lat === "number" ? body.lat : 0,
      lng: typeof body.lng === "number" ? body.lng : 0,
      accuracy: typeof body.accuracy === "number" ? body.accuracy : undefined,
      durationSec: typeof body.durationSec === "number" ? body.durationSec : undefined,
    });
    logger.info("[/api/location/share POST] started", { id: share.id, conversationId: share.conversationId });
    return NextResponse.json({ share }, { status: 201 });
  } catch (err) {
    logger.error("[/api/location/share POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to share location" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/location/share?conversationId=...&userId=...
 * Stops sharing location.
 */
export async function DELETE(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get("conversationId") || "";
    const userId = req.nextUrl.searchParams.get("userId") || "";
    if (!conversationId || !userId) {
      return NextResponse.json({ error: "conversationId and userId are required" }, { status: 400 });
    }
    const count = await stopSharingLocation(conversationId, userId);
    return NextResponse.json({ stopped: count });
  } catch (err) {
    logger.error("[/api/location/share DELETE]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to stop sharing" },
      { status: 500 },
    );
  }
}

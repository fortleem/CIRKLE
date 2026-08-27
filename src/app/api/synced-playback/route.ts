// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  startSyncedPlayback,
  syncPlaybackTime,
  joinPlayback,
  getPlayback,
  getPlaybackByConversation,
} from "@/lib/synced-playback";
import { logger } from "@/lib/logger";

/**
 * GET /api/synced-playback?playbackId=... OR ?conversationId=...
 * Returns the current playback state.
 */
export async function GET(req: NextRequest) {
  try {
    const playbackId = req.nextUrl.searchParams.get("playbackId") || "";
    const conversationId = req.nextUrl.searchParams.get("conversationId") || "";
    if (playbackId) {
      const playback = await getPlayback(playbackId);
      if (!playback) return NextResponse.json({ error: "playback not found" }, { status: 404 });
      return NextResponse.json({ playback });
    }
    if (conversationId) {
      const playbacks = await getPlaybackByConversation(conversationId);
      return NextResponse.json({ playbacks });
    }
    return NextResponse.json({ error: "playbackId or conversationId is required" }, { status: 400 });
  } catch (err) {
    logger.error("[/api/synced-playback GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch playback" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/synced-playback
 * Body: { action: 'start'|'sync'|'join', videoId?, conversationId?, startedBy?, playbackId?, state?, currentTimeSec?, userId? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const action = typeof body.action === "string" ? body.action : "start";
    if (action === "start") {
      const playback = await startSyncedPlayback({
        videoId: typeof body.videoId === "string" ? body.videoId : "",
        conversationId: typeof body.conversationId === "string" ? body.conversationId : "",
        startedBy: typeof body.startedBy === "string" ? body.startedBy : "",
      });
      logger.info("[/api/synced-playback POST] started", { id: playback.id });
      return NextResponse.json({ playback }, { status: 201 });
    }
    if (action === "sync") {
      const playback = await syncPlaybackTime({
        playbackId: typeof body.playbackId === "string" ? body.playbackId : "",
        state: typeof body.state === "string" ? (body.state as any) : undefined,
        currentTimeSec: typeof body.currentTimeSec === "number" ? body.currentTimeSec : undefined,
        userId: typeof body.userId === "string" ? body.userId : "",
      });
      if (!playback) return NextResponse.json({ error: "playback not found" }, { status: 404 });
      return NextResponse.json({ playback });
    }
    if (action === "join") {
      const playback = await joinPlayback(
        typeof body.playbackId === "string" ? body.playbackId : "",
        typeof body.userId === "string" ? body.userId : "",
      );
      if (!playback) return NextResponse.json({ error: "playback not found" }, { status: 404 });
      return NextResponse.json({ playback });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    logger.error("[/api/synced-playback POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update playback" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/video/upload — POST register a video for transcoding + initial seed.
//
// Called by video-service.uploadVideo AFTER the Post row + StoragePin have
// been created. This endpoint:
//   1. Records an initial VideoSeed row for the uploader (they're a seeder).
//   2. Creates a VideoTranscode row in "pending" status.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      videoId?: string;
      cid?: string;
      filename?: string;
      mimeType?: string;
      size?: number;
      author?: string;
    } | null;
    if (!body?.videoId) {
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    }

    // Record the uploader as an initial seeder.
    const seeder = await db.videoSeed.upsert({
      where: { videoId_deviceId: { videoId: body.videoId, deviceId: `uploader-${body.author || "anon"}` } },
      create: {
        videoId: body.videoId,
        deviceId: `uploader-${body.author || "anon"}`,
        username: body.author,
        status: "active",
        chunks: "ffff",
      },
      update: { status: "active", lastSeen: new Date() },
    });

    // Create a transcode job (stub — real FFmpeg pipeline is the upgrade path).
    const transcode = await db.videoTranscode.upsert({
      where: { id: `t-${body.videoId}` },
      create: {
        id: `t-${body.videoId}`,
        videoId: body.videoId,
        status: "pending",
        progress: 0,
      },
      update: {},
    });

    // Mark as "ready" immediately in the sandbox — no real transcoding
    // happens. The upgrade path kicks off an FFmpeg job here.
    await db.videoTranscode.update({
      where: { id: transcode.id },
      data: { status: "ready", progress: 100, renditions: JSON.stringify([
        { resolution: "source", bitrate: 0, url: `/api/storage/download/${body.cid || ""}` },
      ]) },
    });

    return NextResponse.json({
      ok: true,
      videoId: body.videoId,
      seederId: seeder.deviceId,
      transcodeId: transcode.id,
    }, { status: 201 });
  } catch (err) {
    logger.error("[/api/video/upload POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "video upload failed" },
      { status: 500 },
    );
  }
}

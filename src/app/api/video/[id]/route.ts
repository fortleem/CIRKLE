import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/video/[id] — GET returns a single video's metadata + streaming URL.
//                    DELETE removes a video (cascades to seeds + transcodes).
// ─────────────────────────────────────────────────────────────────────────────

function origin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "circle.app";
  return `${proto}://${host}`;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const post = await db.post.findUnique({ where: { id } });
    if (!post || post.module !== "mashahd" || post.mediaKind !== "video") {
      return NextResponse.json({ error: "video not found" }, { status: 404 });
    }
    const seeders = await db.videoSeed.count({
      where: { videoId: id, status: "active" },
    });
    const transcode = await db.videoTranscode.findUnique({
      where: { id: `t-${id}` },
    });
    const base = origin(req);
    const [title, ...rest] = (post.body || "").split("\n\n");
    return NextResponse.json({
      id: post.id,
      title,
      description: rest.join("\n\n"),
      author: post.authorName,
      duration: 0,
      size: 0,
      mimeType: "video/mp4",
      streamingUrl: `${base}/api/video/${post.id}`,
      thumbnailUrl: post.mediaCover || undefined,
      views: post.views,
      likes: post.likes,
      seeders,
      transcodeStatus: transcode?.status ?? "not_required",
      createdAt: post.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error("[/api/video/[id] GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "video fetch failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    // Cascade — seeds + transcodes are deleted via the Post cascade OR
    // explicitly here.
    await db.videoSeed.deleteMany({ where: { videoId: id } });
    await db.videoTranscode.deleteMany({ where: { videoId: id } });
    await db.post.delete({ where: { id } }).catch(() => {
      // post may already be gone
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[/api/video/[id] DELETE] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "delete failed" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/video/[id]/seeders — GET list active seeders for a video.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const rows = await db.videoSeed.findMany({
      where: { videoId: id, status: { in: ["active", "idle"] } },
      orderBy: { lastSeen: "desc" },
      take: 100,
    });
    const seeders = rows.map((r) => ({
      deviceId: r.deviceId,
      username: r.username,
      status: r.status as "active" | "idle" | "closed",
      chunks: r.chunks,
      lastSeen: r.lastSeen.toISOString(),
    }));
    return NextResponse.json({ videoId: id, seeders });
  } catch (err) {
    logger.error("[/api/video/[id]/seeders GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "seeders fetch failed" },
      { status: 500 },
    );
  }
}

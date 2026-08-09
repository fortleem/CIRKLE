import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/video/[id]/transcode — GET transcode status for a video.
//                              PATCH update transcode status (admin/webhook).
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
    const tc = await db.videoTranscode.findUnique({ where: { id: `t-${id}` } });
    if (!tc) {
      return NextResponse.json({
        status: "not_required",
        progress: 0,
      });
    }
    return NextResponse.json({
      status: tc.status,
      progress: tc.progress,
      renditions: tc.renditions ? JSON.parse(tc.renditions) : undefined,
      error: tc.error || undefined,
    });
  } catch (err) {
    logger.error("[/api/video/[id]/transcode GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "transcode fetch failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const body = (await req.json().catch(() => null)) as {
      status?: string;
      progress?: number;
      renditions?: unknown;
      error?: string;
    } | null;
    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    const tc = await db.videoTranscode.upsert({
      where: { id: `t-${id}` },
      create: {
        id: `t-${id}`,
        videoId: id,
        status: body.status || "processing",
        progress: body.progress ?? 0,
        renditions: body.renditions ? JSON.stringify(body.renditions) : null,
        error: body.error || null,
      },
      update: {
        status: body.status ?? undefined,
        progress: body.progress ?? undefined,
        renditions: body.renditions ? JSON.stringify(body.renditions) : undefined,
        error: body.error ?? undefined,
      },
    });
    return NextResponse.json({ ok: true, transcode: tc });
  } catch (err) {
    logger.error("[/api/video/[id]/transcode PATCH] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "transcode update failed" },
      { status: 500 },
    );
  }
}

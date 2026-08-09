import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/video/[id]/seed — POST register a seeder, DELETE unregister.
//   POST   body: { deviceId, username?, status? }
//   DELETE body: { deviceId }
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const body = (await req.json().catch(() => null)) as {
      deviceId?: string;
      username?: string;
      status?: string;
    } | null;
    if (!body?.deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }
    const status = ["active", "idle", "closed"].includes(body.status || "")
      ? (body.status as string)
      : "active";
    const seed = await db.videoSeed.upsert({
      where: { videoId_deviceId: { videoId: id, deviceId: body.deviceId } },
      create: {
        videoId: id,
        deviceId: body.deviceId,
        username: body.username,
        status,
        chunks: "ffff",
        lastSeen: new Date(),
      },
      update: { status, lastSeen: new Date(), username: body.username ?? undefined },
    });
    return NextResponse.json({ ok: true, seeder: seed });
  } catch (err) {
    logger.error("[/api/video/[id]/seed POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "seed failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const body = (await req.json().catch(() => null)) as {
      deviceId?: string;
    } | null;
    if (!body?.deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }
    // Mark as closed rather than deleting — preserves audit trail.
    const updated = await db.videoSeed.updateMany({
      where: { videoId: id, deviceId: body.deviceId },
      data: { status: "closed", lastSeen: new Date() },
    });
    return NextResponse.json({ ok: true, closed: updated.count });
  } catch (err) {
    logger.error("[/api/video/[id]/seed DELETE] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unseed failed" },
      { status: 500 },
    );
  }
}

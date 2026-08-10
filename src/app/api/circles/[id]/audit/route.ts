// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/circles/[id]/audit?limit=50
 * Returns the audit log for the circle (newest first). Any member can
 * view the audit log — it's a transparency feature, not an admin-only
 * view. Limit defaults to 50, max 200.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const circle = await db.circleGroup.findUnique({ where: { id }, select: { id: true } });
    if (!circle) return NextResponse.json({ error: "circle not found" }, { status: 404 });

    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "50");
    const limit = Math.max(1, Math.min(200, isFinite(limitRaw) ? limitRaw : 50));

    const entries = await db.circleAuditLog.findMany({
      where: { circleId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(
      {
        entries: entries.map((e) => ({
          id: e.id,
          action: e.action,
          actor: e.actor,
          target: e.target,
          summary: e.summary,
          createdAt: e.createdAt.toISOString(),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    logger.error("[/api/circles/[id]/audit GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load audit log" },
      { status: 500 },
    );
  }
}

// @ts-nocheck
/**
 * GET /api/admin/circles
 * ============================================================================
 * Circle groups management data for the admin panel.
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAdmin` clearance on the session. Returns 401 / 403 otherwise.
 *
 * Query params:
 *   ?take=50    — number of circles to return (max 200, default 50)
 *   ?skip=0     — pagination offset
 *   ?category=  — filter by category (Social, Professional, Hobby, etc.)
 *   ?mode=      — filter by mode (private, public, anonymous)
 *
 * Returns:
 *   { total, circles: [...], byCategory: [...], byMode: [...],
 *     totalMembers, encryptedCount, ownerTop: [...] }
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // ── P0 FIX: auth-gate ─────────────────────────────────────────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") || "50")));
  const skip = Math.max(0, Number(url.searchParams.get("skip") || "0"));
  const category = url.searchParams.get("category")?.trim() || "";
  const mode = url.searchParams.get("mode")?.trim() || "";

  const where: any = {};
  if (category) where.category = category;
  if (mode) where.mode = mode;

  try {
    const [
      total,
      circles,
      byCategory,
      byMode,
      totalMembers,
      encryptedCount,
      recent7d,
      ownerTopRaw,
    ] = await Promise.all([
      db.circleGroup.count({ where }),
      db.circleGroup.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          mode: true,
          category: true,
          avatarColor: true,
          avatarInitials: true,
          encrypted: true,
          ownerLabel: true,
          settings: true,
          createdAt: true,
        },
      }),
      db.circleGroup.groupBy({
        by: ["category"],
        _count: { _all: true },
        orderBy: { _count: { category: "desc" } },
      }),
      db.circleGroup.groupBy({
        by: ["mode"],
        _count: { _all: true },
        orderBy: { _count: { mode: "desc" } },
      }),
      db.circleMember.count(),
      db.circleGroup.count({ where: { encrypted: true } }),
      db.circleGroup.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      db.circleGroup.groupBy({
        by: ["ownerLabel"],
        _count: { _all: true },
        orderBy: { _count: { ownerLabel: "desc" } },
        take: 10,
      }),
    ]);

    // ── Member count per circle (top 10 by membership) ─────────────────────
    const topCircleIds = await db.circleMember.groupBy({
      by: ["circleId"],
      _count: { _all: true },
      orderBy: { _count: { circleId: "desc" } },
      take: 10,
    });

    let topCirclesByMembers: any[] = [];
    if (topCircleIds.length > 0) {
      const circleDetails = await db.circleGroup.findMany({
        where: { id: { in: topCircleIds.map(t => t.circleId) } },
        select: { id: true, name: true, category: true, mode: true },
      });
      topCirclesByMembers = topCircleIds.map(t => {
        const detail = circleDetails.find(c => c.id === t.circleId);
        return {
          circleId: t.circleId,
          name: detail?.name || "(deleted)",
          category: detail?.category || "",
          mode: detail?.mode || "",
          memberCount: t._count?._all || 0,
        };
      });
    }

    return NextResponse.json(
      {
        total,
        encryptedCount,
        recent7d,
        totalMembers,
        returned: circles.length,
        take,
        skip,
        circles: circles.map(c => ({
          ...c,
          createdAt: c.createdAt?.toISOString?.() || c.createdAt,
          settingsList: c.settings ? c.settings.split(" ").filter(Boolean) : [],
        })),
        byCategory: byCategory.map(c => ({ category: c.category, count: c._count?._all || 0 })),
        byMode: byMode.map(m => ({ mode: m.mode, count: m._count?._all || 0 })),
        topOwners: ownerTopRaw.map(o => ({ owner: o.ownerLabel, count: o._count?._all || 0 })),
        topCirclesByMembers,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_fetch_circles", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

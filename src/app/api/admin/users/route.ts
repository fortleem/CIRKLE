// @ts-nocheck
/**
 * GET /api/admin/users
 * ============================================================================
 * User management data for the admin panel.
 *
 * Query params:
 *   ?take=50   — number of users to return (max 200, default 50)
 *   ?skip=0    — pagination offset
 *   ?q=        — search by displayName or circleId (case-insensitive)
 *   ?region=   — filter by region (e.g. EG, SA)
 *   ?verified= — "true" / "false" to filter verified status
 *
 * Returns:
 *   { total, users: [...], byRegion: [...], byAvatarColor: [...] }
 *
 * NOTE: Not auth-gated during the admin panel building phase.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") || "50")));
  const skip = Math.max(0, Number(url.searchParams.get("skip") || "0"));
  const q = url.searchParams.get("q")?.trim() || "";
  const region = url.searchParams.get("region")?.trim().toUpperCase() || "";
  const verifiedParam = url.searchParams.get("verified");

  const where: any = {};
  if (q) {
    where.OR = [
      { displayName: { contains: q } },
      { circleId: { contains: q } },
      { arabicName: { contains: q } },
    ];
  }
  if (region) where.region = region;
  if (verifiedParam === "true") where.verified = true;
  if (verifiedParam === "false") where.verified = false;

  try {
    const [total, users, byRegion, byAvatarColor, verifiedCount, recent7d] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          circleId: true,
          displayName: true,
          arabicName: true,
          avatarColor: true,
          verified: true,
          region: true,
          joinedAt: true,
          createdAt: true,
        },
      }),
      db.user.groupBy({
        by: ["region"],
        _count: { _all: true },
        orderBy: { _count: { region: "desc" } },
        take: 20,
      }),
      db.user.groupBy({
        by: ["avatarColor"],
        _count: { _all: true },
        orderBy: { _count: { avatarColor: "desc" } },
      }),
      db.user.count({ where: { verified: true } }),
      db.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return NextResponse.json(
      {
        total,
        verifiedCount,
        recentSignups7d: recent7d,
        returned: users.length,
        take,
        skip,
        users: users.map(u => ({
          ...u,
          joinedAt: u.joinedAt?.toISOString?.() || u.joinedAt,
          createdAt: u.createdAt?.toISOString?.() || u.createdAt,
        })),
        byRegion: byRegion.map(r => ({ region: r.region, count: r._count?._all || 0 })),
        byAvatarColor: byAvatarColor.map(c => ({ color: c.avatarColor, count: c._count?._all || 0 })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_fetch_users", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

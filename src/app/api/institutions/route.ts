// @ts-nocheck
/**
 * GET /api/institutions
 * ============================================================================
 * List all institutions (admin view) or filter by founder.
 *
 * Query params:
 *   ?founderHandle=  — filter by founder's personal @cirkle handle
 *   ?country=         — filter by country
 *   ?verificationStatus=  — filter by status (pending, under_review, verified, rejected)
 *
 * Returns:
 *   { total, institutions: [...] }
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const founderHandle = url.searchParams.get("founderHandle")?.trim() || "";
    const country = url.searchParams.get("country")?.trim().toUpperCase() || "";
    const verificationStatus = url.searchParams.get("verificationStatus")?.trim() || "";

    const where: any = {};
    if (country) where.country = country;
    if (verificationStatus) where.verificationStatus = verificationStatus;
    if (founderHandle) {
      const founder = await db.user.findFirst({
        where: { circleId: founderHandle },
        select: { id: true },
      });
      if (founder) {
        where.founderId = founder.id;
      } else {
        return NextResponse.json({ total: 0, institutions: [] });
      }
    }

    const [total, institutions] = await Promise.all([
      db.institution.count({ where }),
      db.institution.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          name: true,
          handle: true,
          country: true,
          companyType: true,
          industry: true,
          emails: true,
          verificationStatus: true,
          registrationNumber: true,
          taxId: true,
          avatarColor: true,
          avatarInitials: true,
          createdAt: true,
          founder: { select: { id: true, displayName: true, circleId: true } },
        },
      }),
    ]);

    return NextResponse.json(
      {
        total,
        institutions: institutions.map(i => ({
          ...i,
          emails: safeParseArray(i.emails),
          createdAt: i.createdAt?.toISOString?.() || i.createdAt,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_fetch_institutions", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

function safeParseArray(s: string): string[] {
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

// @ts-nocheck
/**
 * GET /api/federation/notifications
 * ============================================================================
 * R6: Inter-agency referral notifications.
 * Returns pending notifications for inter-agency referrals and requests.
 *
 * Query params:
 *   ?institution=  — filter by institution (e.g. "aca", "police")
 *
 * Returns:
 *   { notifications: [...], totalUnread }
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const institution = url.searchParams.get("institution")?.trim() || "";

    const notifications: any[] = [];

    // Fetch pending inter-agency referrals
    try {
      const referralWhere: any = { status: "pending" };
      if (institution) referralWhere.toInstitution = institution;

      const referrals = await db.interAgencyReferral.findMany({
        where: referralWhere,
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          referralId: true,
          fromInstitution: true,
          toInstitution: true,
          purpose: true,
          status: true,
          createdAt: true,
        },
      });

      for (const r of referrals) {
        notifications.push({
          id: r.referralId,
          type: "referral_received",
          title: `New referral from ${r.fromInstitution}`,
          description: r.purpose,
          institution: r.toInstitution,
          status: r.status,
          timestamp: r.createdAt?.toISOString?.() || r.createdAt,
          action: "review_referral",
        });
      }
    } catch { /* table may not exist */ }

    // Fetch pending inter-agency requests
    try {
      const requestWhere: any = { status: "pending" };
      if (institution) requestWhere.receivingInstitution = institution;

      const requests = await db.interAgencyRequest?.findMany?.({
        where: requestWhere,
        take: 20,
        orderBy: { createdAt: "desc" },
      }) || [];

      for (const r of requests) {
        notifications.push({
          id: r.requestId || r.id,
          type: "request_received",
          title: `Information request from ${r.requestingInstitution || "unknown"}`,
          description: r.purpose || "",
          institution: r.receivingInstitution,
          status: r.status,
          timestamp: r.createdAt?.toISOString?.() || r.createdAt,
          action: "respond_to_request",
        });
      }
    } catch { /* table may not exist */ }

    // Sort by timestamp (newest first)
    notifications.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

    return NextResponse.json(
      {
        notifications: notifications.slice(0, 50),
        total: notifications.length,
        unread: notifications.filter(n => n.status === "pending").length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { notifications: [], total: 0, unread: 0, error: String(err).slice(0, 200) },
      { status: 200 },
    );
  }
}

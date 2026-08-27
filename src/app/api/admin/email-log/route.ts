// @ts-nocheck
/**
 * GET /api/admin/email-log
 * ============================================================================
 * Returns the email sending log (audit trail). Used by the admin panel.
 *
 * Query params:
 *   ?take=50     — max 200, default 50
 *   ?skip=0
 *   ?type=       — filter by type (commit_confirmation, institution_invite, etc.)
 *   ?status=     — filter by status (sent, failed, queued)
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") || "50")));
    const skip = Math.max(0, Number(url.searchParams.get("skip") || "0"));
    const type = url.searchParams.get("type")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [total, emails, byStatus, byType] = await Promise.all([
      db.emailLog.count({ where }),
      db.emailLog.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          toEmail: true,
          toName: true,
          fromEmail: true,
          subject: true,
          status: true,
          error: true,
          relatedId: true,
          smtpResponse: true,
          sentAt: true,
          createdAt: true,
        },
      }),
      db.emailLog.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      db.emailLog.groupBy({
        by: ["type"],
        _count: { _all: true },
        orderBy: { _count: { type: "desc" } },
      }),
    ]);

    return NextResponse.json(
      {
        total,
        returned: emails.length,
        take,
        skip,
        emails: emails.map(e => ({
          ...e,
          sentAt: e.sentAt?.toISOString?.() || e.sentAt,
          createdAt: e.createdAt?.toISOString?.() || e.createdAt,
        })),
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count?._all || 0 })),
        byType: byType.map(t => ({ type: t.type, count: t._count?._all || 0 })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_fetch_email_log", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

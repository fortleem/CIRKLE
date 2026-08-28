// @ts-nocheck
/**
 * GET /api/admin/payments
 * ============================================================================
 * Payment / transaction monitoring data for the admin panel.
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAdmin` clearance on the session. Returns 401 / 403 otherwise.
 *
 * Query params:
 *   ?take=50     — number of transactions to return (max 200, default 50)
 *   ?skip=0      — pagination offset
 *   ?status=     — filter by status (settled, pending, failed)
 *   ?method=     — filter by method (fawry, vodafone-cash, instapay, etc.)
 *   ?direction=  — filter by direction (in, out)
 *
 * Returns:
 *   { total, transactions: [...], byStatus: [...], byMethod: [...],
 *     byCurrency: [...], volume30d, avgTx30d, failedCount, pendingCount }
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
  const status = url.searchParams.get("status")?.trim() || "";
  const method = url.searchParams.get("method")?.trim() || "";
  const direction = url.searchParams.get("direction")?.trim() || "";

  const where: any = {};
  if (status) where.status = status;
  if (method) where.method = method;
  if (direction) where.direction = direction;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      transactions,
      byStatus,
      byMethod,
      byCurrency,
      byDirection,
      volume30dAgg,
      failedCount,
      pendingCount,
      recent24h,
    ] = await Promise.all([
      db.transaction.count({ where }),
      db.transaction.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userLabel: true,
          direction: true,
          counterparty: true,
          amount: true,
          currency: true,
          method: true,
          memo: true,
          status: true,
          fee: true,
          createdAt: true,
        },
      }),
      db.transaction.groupBy({
        by: ["status"],
        _count: { _all: true },
        orderBy: { _count: { status: "desc" } },
      }),
      db.transaction.groupBy({
        by: ["method"],
        _count: { _all: true },
        orderBy: { _count: { method: "desc" } },
      }),
      db.transaction.groupBy({
        by: ["currency"],
        _count: { _all: true },
        orderBy: { _count: { currency: "desc" } },
      }),
      db.transaction.groupBy({
        by: ["direction"],
        _count: { _all: true },
      }),
      db.transaction.aggregate({
        where: { status: "settled", createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      db.transaction.count({ where: { status: "failed" } }),
      db.transaction.count({ where: { status: "pending" } }),
      db.transaction.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return NextResponse.json(
      {
        total,
        failedCount,
        pendingCount,
        recent24h,
        volume30d: volume30dAgg._sum?.amount || 0,
        avgTx30d: volume30dAgg._avg?.amount || 0,
        returned: transactions.length,
        take,
        skip,
        transactions: transactions.map(t => ({
          ...t,
          createdAt: t.createdAt?.toISOString?.() || t.createdAt,
        })),
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count?._all || 0 })),
        byMethod: byMethod.map(m => ({ method: m.method, count: m._count?._all || 0 })),
        byCurrency: byCurrency.map(c => ({ currency: c.currency, count: c._count?._all || 0 })),
        byDirection: byDirection.map(d => ({ direction: d.direction, count: d._count?._all || 0 })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_fetch_payments", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

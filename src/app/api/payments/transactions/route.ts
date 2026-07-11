import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/circle/seed";
import { getRegionForCountry } from "@/lib/regions";
import type { Transaction } from "@/lib/circle/types";

function toTxShape(t: {
  id: string;
  direction: string;
  counterparty: string;
  counterpartyInitials: string;
  counterpartyColor: string;
  amount: number;
  currency: string;
  method: string;
  memo: string | null;
  status: string;
  fee: number;
  createdAt: Date;
}): Transaction {
  return {
    id: t.id,
    direction: t.direction as Transaction["direction"],
    counterparty: t.counterparty,
    counterpartyInitials: t.counterpartyInitials,
    counterpartyColor: t.counterpartyColor,
    amount: t.amount,
    currency: t.currency,
    method: t.method as Transaction["method"],
    memo: t.memo ?? undefined,
    timestamp: t.createdAt.toISOString(),
    status: t.status as Transaction["status"],
    fee: t.fee,
  };
}

/**
 * GET /api/payments/transactions
 * Returns all transactions, newest first.
 */
export async function GET(req: NextRequest) {
  try {
    // ensureSeeded removed — no mock data();

    const rows = await db.transaction.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(rows.map(toTxShape), {
      headers: {
        "X-Data-Region": getRegionForCountry(
          req.headers.get("x-cirkle-country"),
        ).code,
      },
    });
  } catch (err) {
    logger.error("[/api/payments/transactions] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load transactions" },
      { status: 500 },
    );
  }
}

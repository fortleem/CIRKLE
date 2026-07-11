import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/circle/seed";
import { CURRENT_USER } from "@/lib/circle/mock-data";
import { getRegionForCountry } from "@/lib/regions";
import type { Transaction } from "@/lib/circle/types";

const VALID_METHODS = [
  "fawry",
  "vodafone-cash",
  "instapay",
  "wechat",
  "alipay",
  "upi",
  "usdc",
  "qr",
] as const;

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
 * POST /api/payments/send
 * Body: {counterparty?, to?, amount, currency?, method?, memo?}
 *   - `counterparty` is the canonical recipient name.
 *   - `to` is accepted as a convenience alias for `counterparty`.
 * Creates a Transaction with direction "out", fee 0, status "settled",
 * counterpartyInitials = first 2 letters, counterpartyColor = "teal".
 */
export async function POST(req: NextRequest) {
  try {
    // ensureSeeded removed — no mock data();

    const body = (await req.json().catch(() => null)) as {
      counterparty?: string;
      to?: string;
      amount?: number;
      currency?: string;
      method?: string;
      memo?: string;
    } | null;

    const counterpartyRaw = body?.counterparty ?? body?.to;
    if (!counterpartyRaw || typeof counterpartyRaw !== "string") {
      return NextResponse.json({ error: "counterparty is required" }, { status: 400 });
    }
    const amount = Number(body!.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }
    const method = (VALID_METHODS as readonly string[]).includes(body!.method ?? "")
      ? body!.method!
      : "qr";
    const currency = body!.currency?.trim() || "EGP";
    const counterparty = counterpartyRaw.trim();

    const created = await db.transaction.create({
      data: {
        userLabel: CURRENT_USER.displayName,
        direction: "out",
        counterparty,
        counterpartyInitials: counterparty.slice(0, 2).toUpperCase(),
        counterpartyColor: "teal",
        amount,
        currency,
        method,
        memo: body!.memo?.trim() || null,
        status: "settled",
        fee: 0,
      },
    });

    return NextResponse.json(toTxShape(created), {
      status: 201,
      headers: {
        "X-Data-Region": getRegionForCountry(
          req.headers.get("x-cirkle-country"),
        ).code,
      },
    });
  } catch (err) {
    logger.error("[/api/payments/send] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to send payment" },
      { status: 500 },
    );
  }
}

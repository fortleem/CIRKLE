import { NextRequest, NextResponse } from "next/server";
import {
  generateInvoice,
  listInvoices,
  markInvoicePaid,
  AD_CURRENCIES,
} from "@/lib/ad-engine";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ads/invoice?advertiser=<name>
// Returns all invoices for the advertiser.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const advertiser = req.nextUrl.searchParams.get("advertiser");
    if (!advertiser) {
      return NextResponse.json({ error: "advertiser is required" }, { status: 400 });
    }
    const invoices = await listInvoices(advertiser);
    return NextResponse.json({ invoices });
  } catch (err) {
    logger.error("[/api/ads/invoice GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list invoices" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ads/invoice
// Body (generate):  { advertiser, campaignIds: string[], currency?: string }
// Body (mark paid): { invoiceId: string, action: "mark-paid" }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    // Mark-paid path
    if (body.action === "mark-paid") {
      if (typeof body.invoiceId !== "string" || !body.invoiceId) {
        return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
      }
      const invoice = await markInvoicePaid(body.invoiceId);
      if (!invoice) return NextResponse.json({ error: "invoice not found" }, { status: 404 });
      return NextResponse.json({ ok: true, invoice });
    }

    // Generate path
    const advertiser = typeof body.advertiser === "string" ? body.advertiser : "";
    const campaignIds = Array.isArray(body.campaignIds)
      ? body.campaignIds.filter((x): x is string => typeof x === "string")
      : [];
    const currency =
      typeof body.currency === "string" && (AD_CURRENCIES as readonly string[]).includes(body.currency)
        ? body.currency
        : "USD";

    if (!advertiser) return NextResponse.json({ error: "advertiser is required" }, { status: 400 });
    if (campaignIds.length === 0) {
      return NextResponse.json({ error: "campaignIds must be a non-empty array" }, { status: 400 });
    }

    const invoice = await generateInvoice(advertiser, campaignIds, currency);
    return NextResponse.json({ ok: true, invoice }, { status: 201 });
  } catch (err) {
    logger.error("[/api/ads/invoice POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to generate invoice" },
      { status: 500 },
    );
  }
}

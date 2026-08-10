/**
 * Affiliate tracking service (Blueprint §7.3.2).
 *
 * Creators on Cirkle can share affiliate links to products/services.
 * When a viewer clicks the link, we record an `AffiliateClick`. When
 * the viewer completes a purchase, the merchant notifies Cirkle (via
 * webhook or server-to-server call) and we record an `AffiliateSale`
 * with the commission owed to the creator.
 *
 * Privacy posture: clicks store only the clicker's country code (no
 * user id) — sufficient for analytics without profiling. Sales store
 * only the merchant's opaque order id and the commission — never the
 * buyer's personal data.
 *
 * Upgrade path: in production, this service talks to a real affiliate
 * network (Impact, Awin, PartnerStack, etc.) via their API. The
 * function shapes here are designed to be swap-in compatible.
 */

import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackClickOpts {
  affiliateId: string;
  productId?: string | null;
  country?: string | null;
  referrer?: string | null;
}

export interface TrackPurchaseOpts {
  affiliateId: string;
  orderId: string;
  amount: number;
  currency?: string;
  commissionRate?: number;
  productId?: string | null;
}

export interface AffiliateEarnings {
  affiliateId: string;
  totalClicks: number;
  totalSales: number;
  totalGmv: number; // gross merchandise volume
  totalCommission: number;
  pendingCommission: number;
  confirmedCommission: number;
  paidCommission: number;
  recentSales: Array<{
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    commission: number;
    status: string;
    createdAt: string;
  }>;
  recentClicks: number; // clicks in the last 7 days
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records an affiliate link click. Idempotent per (affiliateId,
 * productId, ip fingerprint) within a short window — but since we
 * don't track IPs, we just record every click and dedupe in analytics.
 */
export async function trackClick(opts: TrackClickOpts): Promise<{ id: string; createdAt: string }> {
  const affiliateId = (opts.affiliateId || "").trim().toLowerCase().replace(/^@/, "");
  if (!affiliateId) throw new Error("affiliateId is required");
  const row = await db.affiliateClick.create({
    data: {
      affiliateId,
      productId: opts.productId?.trim().slice(0, 140) || null,
      country: opts.country?.trim().slice(0, 2).toUpperCase() || null,
      referrer: opts.referrer?.trim().slice(0, 280) || null,
    },
  });
  return { id: row.id, createdAt: row.createdAt.toISOString() };
}

/**
 * Records a purchase attributed to an affiliate. The commission is
 * calculated as `amount * commissionRate` (default 5%).
 *
 * Idempotent on (affiliateId, orderId) — duplicate notifications from
 * the merchant network are silently ignored.
 */
export async function trackPurchase(opts: TrackPurchaseOpts): Promise<{
  id: string;
  commission: number;
  status: string;
  createdAt: string;
}> {
  const affiliateId = (opts.affiliateId || "").trim().toLowerCase().replace(/^@/, "");
  if (!affiliateId) throw new Error("affiliateId is required");
  if (!opts.orderId) throw new Error("orderId is required");
  if (!isFinite(opts.amount) || opts.amount < 0) {
    throw new Error("amount must be ≥ 0");
  }
  const currency = (opts.currency || "USD").toUpperCase().slice(0, 3);
  const commissionRate = isFinite(opts.commissionRate) && opts.commissionRate >= 0 && opts.commissionRate <= 1
    ? opts.commissionRate
    : 0.05;
  const commission = Math.round(opts.amount * commissionRate * 100) / 100;

  // Upsert — if (affiliateId, orderId) already exists, return the
  // existing row instead of creating a duplicate.
  const existing = await db.affiliateSale.findUnique({
    where: { affiliateId_orderId: { affiliateId, orderId: opts.orderId } },
  });
  if (existing) {
    return {
      id: existing.id,
      commission: existing.commission,
      status: existing.status,
      createdAt: existing.createdAt.toISOString(),
    };
  }

  const row = await db.affiliateSale.create({
    data: {
      affiliateId,
      orderId: opts.orderId,
      amount: opts.amount,
      currency,
      commissionRate,
      commission,
      status: "pending",
    },
  });
  logger.info("[affiliate] purchase tracked", {
    id: row.id,
    affiliateId,
    orderId: opts.orderId,
    amount: opts.amount,
    commission,
  });
  return {
    id: row.id,
    commission,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Returns the affiliate earnings summary for a creator.
 *
 * Aggregates all clicks + sales attributed to the creator, broken down
 * by status (pending / confirmed / paid) so the creator can see what's
 * been earned vs. what's already been paid out.
 */
export async function getCreatorAffiliateEarnings(userId: string): Promise<AffiliateEarnings> {
  const affiliateId = (userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!affiliateId) {
    return emptyEarnings("");
  }

  const [clicks, sales] = await Promise.all([
    db.affiliateClick.findMany({
      where: { affiliateId },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    db.affiliateSale.findMany({
      where: { affiliateId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  let totalGmv = 0;
  let totalCommission = 0;
  let pendingCommission = 0;
  let confirmedCommission = 0;
  let paidCommission = 0;
  for (const s of sales) {
    totalGmv += s.amount;
    totalCommission += s.commission;
    if (s.status === "pending") pendingCommission += s.commission;
    else if (s.status === "confirmed") confirmedCommission += s.commission;
    else if (s.status === "paid") paidCommission += s.commission;
  }

  // Recent clicks = clicks in the last 7 days.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentClicks = clicks.filter((c) => c.createdAt >= weekAgo).length;

  return {
    affiliateId,
    totalClicks: clicks.length,
    totalSales: sales.length,
    totalGmv: Math.round(totalGmv * 100) / 100,
    totalCommission: Math.round(totalCommission * 100) / 100,
    pendingCommission: Math.round(pendingCommission * 100) / 100,
    confirmedCommission: Math.round(confirmedCommission * 100) / 100,
    paidCommission: Math.round(paidCommission * 100) / 100,
    recentSales: sales.slice(0, 20).map((s) => ({
      id: s.id,
      orderId: s.orderId,
      amount: s.amount,
      currency: s.currency,
      commission: s.commission,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
    })),
    recentClicks,
  };
}

function emptyEarnings(affiliateId: string): AffiliateEarnings {
  return {
    affiliateId,
    totalClicks: 0,
    totalSales: 0,
    totalGmv: 0,
    totalCommission: 0,
    pendingCommission: 0,
    confirmedCommission: 0,
    paidCommission: 0,
    recentSales: [],
    recentClicks: 0,
  };
}

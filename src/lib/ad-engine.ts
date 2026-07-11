/**
 * Local Ads Server — Blueprint §7.3.1, §30.
 *
 * Cirkle's ONLY revenue model. Non-targeted local ads paid via corporate
 * invoice. This module is the server-only engine that:
 *   • Creates ad campaigns scoped by country / city / category.
 *   • Serves a single active campaign for a given (country, city?, category?)
 *     tuple — NO user profiling, NO cookies, NO behavioural tracking.
 *   • Tracks impressions + clicks.
 *   • Settles campaign budget on a CPM basis (spent += cpm / 1000 per impression).
 *   • Aggregates advertiser stats.
 *   • Generates invoices for settled campaign spend.
 *
 * Privacy posture (§30.4): the serveAd() function receives ONLY the viewer's
 * country + city + the requested content category. No user ID, no session ID,
 * no browsing history. This is the blueprint's "local context, not personal
 * context" ad model.
 */

import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AdCampaign {
  id: string;
  advertiser: string;
  title: string;
  body: string;
  cta: string;
  url: string;
  targetCountry: string;
  targetCity: string | null;
  category: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  cpm: number;
  startDate: string; // ISO
  endDate: string;   // ISO
  status: string;
  createdAt: string; // ISO
}

export interface AdvertiserStats {
  impressions: number;
  clicks: number;
  spent: number;
  ctr: number; // clicks / impressions, 0 if no impressions
  budget: number;
  remaining: number;
  campaigns: number;
}

export interface AdInvoice {
  id: string;
  advertiser: string;
  amount: number;
  currency: string;
  status: string;
  campaigns: string[];
  createdAt: string;
  paidAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export const AD_CATEGORIES = [
  "news",
  "sports",
  "tech",
  "education",
  "retail",
  "food",
  "travel",
] as const;
export type AdCategory = (typeof AD_CATEGORIES)[number];

export const AD_CURRENCIES = ["USD", "SAR", "AED", "EGP", "EUR", "GBP"] as const;

function isAdCategory(c: string): c is AdCategory {
  return (AD_CATEGORIES as readonly string[]).includes(c);
}

function normalizeAdvertiser(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s.length > 128) return null;
  return s;
}

function toIso(d: Date): string {
  return d.toISOString();
}

function serializeCampaign(row: {
  id: string;
  advertiser: string;
  title: string;
  body: string;
  cta: string;
  url: string;
  targetCountry: string;
  targetCity: string | null;
  category: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  cpm: number;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
}): AdCampaign {
  return {
    id: row.id,
    advertiser: row.advertiser,
    title: row.title,
    body: row.body,
    cta: row.cta,
    url: row.url,
    targetCountry: row.targetCountry,
    targetCity: row.targetCity,
    category: row.category,
    budget: row.budget,
    spent: row.spent,
    impressions: row.impressions,
    clicks: row.clicks,
    cpm: row.cpm,
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    status: row.status,
    createdAt: toIso(row.createdAt),
  };
}

function serializeInvoice(row: {
  id: string;
  advertiser: string;
  amount: number;
  currency: string;
  status: string;
  campaigns: string;
  createdAt: Date;
  paidAt: Date | null;
}): AdInvoice {
  let campaignIds: string[] = [];
  try {
    const parsed = JSON.parse(row.campaigns || "[]");
    if (Array.isArray(parsed)) {
      campaignIds = parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    campaignIds = [];
  }
  return {
    id: row.id,
    advertiser: row.advertiser,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    campaigns: campaignIds,
    createdAt: toIso(row.createdAt),
    paidAt: row.paidAt ? toIso(row.paidAt) : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core engine
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateCampaignOpts {
  advertiser: string;
  title: string;
  body: string;
  cta: string;
  url: string;
  targetCountry: string;
  targetCity?: string | null;
  category: string;
  budget: number;
  cpm: number;
  startDate: Date | string;
  endDate: Date | string;
}

/**
 * Create a new ad campaign.
 * Validates input, normalizes the country code (uppercase), and inserts.
 */
export async function createCampaign(opts: CreateCampaignOpts): Promise<AdCampaign> {
  const advertiser = normalizeAdvertiser(opts.advertiser);
  if (!advertiser) throw new Error("advertiser is required");

  if (typeof opts.title !== "string" || !opts.title.trim() || opts.title.length > 140) {
    throw new Error("title is required (≤140 chars)");
  }
  if (typeof opts.body !== "string" || !opts.body.trim() || opts.body.length > 600) {
    throw new Error("body is required (≤600 chars)");
  }
  if (typeof opts.cta !== "string" || !opts.cta.trim() || opts.cta.length > 32) {
    throw new Error("cta is required (≤32 chars)");
  }
  if (typeof opts.url !== "string" || !/^https?:\/\//i.test(opts.url)) {
    throw new Error("url must be a valid http(s) URL");
  }
  if (typeof opts.targetCountry !== "string" || opts.targetCountry.length < 2 || opts.targetCountry.length > 3) {
    throw new Error("targetCountry must be a 2-3 letter country code");
  }
  if (opts.targetCity != null) {
    if (typeof opts.targetCity !== "string" || opts.targetCity.length > 64) {
      throw new Error("targetCity must be a string (≤64 chars)");
    }
  }
  if (!isAdCategory(opts.category)) {
    throw new Error(`category must be one of: ${AD_CATEGORIES.join(", ")}`);
  }
  const budget = Number(opts.budget);
  if (!isFinite(budget) || budget <= 0) {
    throw new Error("budget must be > 0");
  }
  const cpm = Number(opts.cpm);
  if (!isFinite(cpm) || cpm < 0) {
    throw new Error("cpm must be ≥ 0");
  }

  const startDate = opts.startDate instanceof Date ? opts.startDate : new Date(opts.startDate);
  const endDate = opts.endDate instanceof Date ? opts.endDate : new Date(opts.endDate);
  if (!isFinite(startDate.getTime())) throw new Error("startDate is invalid");
  if (!isFinite(endDate.getTime())) throw new Error("endDate is invalid");
  if (endDate <= startDate) throw new Error("endDate must be after startDate");

  const row = await db.adCampaign.create({
    data: {
      advertiser,
      title: opts.title.trim(),
      body: opts.body.trim(),
      cta: opts.cta.trim(),
      url: opts.url.trim(),
      targetCountry: opts.targetCountry.toUpperCase(),
      targetCity: opts.targetCity ? opts.targetCity.trim() : null,
      category: opts.category,
      budget,
      cpm,
      startDate,
      endDate,
      status: "active",
    },
  });
  logger.info("[ad-engine] campaign created", { id: row.id, advertiser });
  return serializeCampaign(row);
}

/**
 * Serve one ad for the given (country, city?, category?) tuple.
 *
 * Privacy-first: this function uses ONLY the supplied local context. No user
 * ID, no session, no behaviour. Picks the highest-CPM eligible active
 * campaign that still has budget remaining within its flight window.
 *
 * Returns null if no eligible campaign is found.
 */
export async function serveAd(
  country: string,
  city?: string,
  category?: string,
): Promise<AdCampaign | null> {
  if (typeof country !== "string" || country.length < 2) return null;
  const cc = country.toUpperCase();

  const now = new Date();
  // Pull eligible candidates in DB. We can't do "spent < budget" in SQLite
  // via Prisma elegantly without a raw query, but Prisma supports `where`
  // with computed comparisons via the `lt` filter on a column vs a column
  // — which SQLite does NOT support. So we fetch all eligible rows and
  // filter in JS. Advertiser volume is small enough that this is fine.
  const candidates = await db.adCampaign.findMany({
    where: {
      targetCountry: cc,
      status: "active",
      startDate: { lte: now },
      endDate: { gte: now },
      ...(category ? { category } : {}),
    },
  });

  // Filter by remaining budget + city match (city is null = nationwide).
  const eligible = candidates.filter((c) => {
    if (c.spent >= c.budget) return false;
    if (c.targetCity && city && c.targetCity.toLowerCase() !== city.toLowerCase()) return false;
    return true;
  });
  if (eligible.length === 0) return null;

  // Pick highest CPM (max revenue per impression). Ties broken by createdAt.
  eligible.sort((a, b) => {
    if (b.cpm !== a.cpm) return b.cpm - a.cpm;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return serializeCampaign(eligible[0]);
}

/**
 * Track an impression. Atomically:
 *   • increments `impressions`
 *   • adds cpm/1000 to `spent`
 *   • if spent >= budget, marks campaign `exhausted`
 *
 * Best-effort: a failure to record an impression MUST NOT bubble up to the
 * viewer's request — ads are best-effort revenue, never a blocker for UX.
 */
export async function trackImpression(adId: string): Promise<void> {
  if (typeof adId !== "string" || !adId) return;
  try {
    const campaign = await db.adCampaign.findUnique({ where: { id: adId } });
    if (!campaign) return;
    if (campaign.status !== "active") return;

    const inc = campaign.cpm / 1000;
    const newSpent = campaign.spent + inc;
    const newStatus = newSpent >= campaign.budget ? "exhausted" : campaign.status;

    await db.adCampaign.update({
      where: { id: adId },
      data: {
        impressions: { increment: 1 },
        spent: newSpent,
        status: newStatus,
      },
    });
  } catch (err) {
    logger.warn("[ad-engine] trackImpression failed", { adId, error: (err as Error).message });
  }
}

/**
 * Track a click. Atomically increments `clicks`. Clicks are free (revenue
 * model is CPM, not CPC), so we don't touch `spent` here.
 */
export async function trackClick(adId: string): Promise<void> {
  if (typeof adId !== "string" || !adId) return;
  try {
    const campaign = await db.adCampaign.findUnique({ where: { id: adId } });
    if (!campaign) return;
    await db.adCampaign.update({
      where: { id: adId },
      data: { clicks: { increment: 1 } },
    });
  } catch (err) {
    logger.warn("[ad-engine] trackClick failed", { adId, error: (err as Error).message });
  }
}

/**
 * Aggregate stats for an advertiser across all their campaigns.
 */
export async function getAdvertiserStats(advertiser: string): Promise<AdvertiserStats> {
  const a = normalizeAdvertiser(advertiser);
  if (!a) {
    return { impressions: 0, clicks: 0, spent: 0, ctr: 0, budget: 0, remaining: 0, campaigns: 0 };
  }
  const rows = await db.adCampaign.findMany({ where: { advertiser: a } });
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const spent = rows.reduce((s, r) => s + r.spent, 0);
  const budget = rows.reduce((s, r) => s + r.budget, 0);
  return {
    impressions,
    clicks,
    spent,
    ctr: impressions > 0 ? clicks / impressions : 0,
    budget,
    remaining: Math.max(0, budget - spent),
    campaigns: rows.length,
  };
}

/**
 * List all campaigns owned by an advertiser.
 */
export async function listCampaigns(advertiser: string): Promise<AdCampaign[]> {
  const a = normalizeAdvertiser(advertiser);
  if (!a) return [];
  const rows = await db.adCampaign.findMany({
    where: { advertiser: a },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeCampaign);
}

/**
 * Generate an invoice for an advertiser covering a list of campaign IDs.
 * The invoice amount = sum of `spent` across the campaigns.
 *
 * Status starts as `pending` — the advertiser pays via corporate invoice
 * (bank transfer) and an admin flips it to `paid` later.
 */
export async function generateInvoice(
  advertiser: string,
  campaignIds: string[],
  currency = "USD",
): Promise<AdInvoice> {
  const a = normalizeAdvertiser(advertiser);
  if (!a) throw new Error("advertiser is required");
  if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
    throw new Error("campaignIds must be a non-empty array");
  }
  if (!(AD_CURRENCIES as readonly string[]).includes(currency)) {
    throw new Error(`currency must be one of: ${AD_CURRENCIES.join(", ")}`);
  }

  // Verify ownership + sum spent.
  const rows = await db.adCampaign.findMany({
    where: { id: { in: campaignIds }, advertiser: a },
  });
  if (rows.length === 0) throw new Error("no matching campaigns found for advertiser");
  const amount = rows.reduce((s, r) => s + r.spent, 0);

  const invoice = await db.adInvoice.create({
    data: {
      advertiser: a,
      amount,
      currency,
      status: "pending",
      campaigns: JSON.stringify(rows.map((r) => r.id)),
    },
  });
  logger.info("[ad-engine] invoice generated", { id: invoice.id, advertiser: a, amount });
  return serializeInvoice(invoice);
}

/**
 * Mark an invoice as paid (admin operation).
 */
export async function markInvoicePaid(invoiceId: string): Promise<AdInvoice | null> {
  if (typeof invoiceId !== "string" || !invoiceId) return null;
  const row = await db.adInvoice.update({
    where: { id: invoiceId },
    data: { status: "paid", paidAt: new Date() },
  });
  return serializeInvoice(row);
}

/**
 * List invoices for an advertiser.
 */
export async function listInvoices(advertiser: string): Promise<AdInvoice[]> {
  const a = normalizeAdvertiser(advertiser);
  if (!a) return [];
  const rows = await db.adInvoice.findMany({
    where: { advertiser: a },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeInvoice);
}

/**
 * Sponsored hashtag service (Blueprint §7.3.5).
 *
 * A paid-for promoted hashtag shown in the Midan trending rail. The
 * sponsor pays a CPM (cost per mille) for impressions in their target
 * country (and optionally a specific city). Non-targeted at the user
 * level — only city/country context is used (Blueprint §30.4).
 *
 * Disclosure: every sponsored hashtag is labelled "Sponsored" in the
 * UI and carries the advertiser's name. There is no behavioural
 * targeting — the same hashtag is shown to every viewer in the
 * target region.
 */

import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SponsoredHashtag {
  id: string;
  tag: string;
  advertiser: string;
  targetCountry: string;
  targetCity: string | null;
  category: string | null;
  headline: string;
  url: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
}

export interface SponsoredHashtagForViewer {
  id: string;
  tag: string;
  advertiser: string;
  category: string | null;
  headline: string;
  url: string;
  /** Always true — surfaced for the disclosure badge in the UI. */
  sponsored: true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function serialize(row: {
  id: string;
  tag: string;
  advertiser: string;
  targetCountry: string;
  targetCity: string | null;
  category: string | null;
  headline: string;
  url: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
}): SponsoredHashtag {
  return {
    id: row.id,
    tag: row.tag,
    advertiser: row.advertiser,
    targetCountry: row.targetCountry,
    targetCity: row.targetCity,
    category: row.category,
    headline: row.headline,
    url: row.url,
    budget: row.budget,
    spent: row.spent,
    impressions: row.impressions,
    clicks: row.clicks,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the active sponsored hashtags for the viewer's country (and
 * optionally city). Picks highest-budget eligible campaigns first.
 *
 * Privacy-first: only `country` and `city` are read — no user id, no
 * session, no behaviour.
 */
export async function getSponsoredHashtags(
  country: string,
  city?: string | null,
): Promise<SponsoredHashtagForViewer[]> {
  if (typeof country !== "string" || country.length < 2) return [];
  const cc = country.toUpperCase();
  const now = new Date();

  const candidates = await db.sponsoredHashtag.findMany({
    where: {
      targetCountry: cc,
      status: "active",
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  // Filter by remaining budget + city match (null = nationwide).
  const eligible = candidates.filter((c) => {
    if (c.spent >= c.budget) return false;
    if (c.targetCity && city && c.targetCity.toLowerCase() !== city.toLowerCase()) return false;
    return true;
  });

  // Highest budget first (deterministic ordering).
  eligible.sort((a, b) => b.budget - a.budget || a.createdAt.getTime() - b.createdAt.getTime());

  return eligible.slice(0, 5).map((c) => ({
    id: c.id,
    tag: c.tag,
    advertiser: c.advertiser,
    category: c.category,
    headline: c.headline,
    url: c.url,
    sponsored: true as const,
  }));
}

/**
 * Tracks an impression for a sponsored hashtag. Best-effort: failures
 * are swallowed (never block UX on ad tracking).
 *
 * Settlement: increments `impressions` and adds `cpm/1000` to `spent`.
 * When `spent >= budget`, marks the campaign as `exhausted`.
 */
export async function trackSponsoredImpression(id: string, cpm = 2): Promise<void> {
  if (typeof id !== "string" || !id) return;
  try {
    const row = await db.sponsoredHashtag.findUnique({ where: { id } });
    if (!row) return;
    if (row.status !== "active") return;
    const inc = cpm / 1000;
    const newSpent = row.spent + inc;
    const newStatus = newSpent >= row.budget ? "exhausted" : row.status;
    await db.sponsoredHashtag.update({
      where: { id },
      data: {
        impressions: { increment: 1 },
        spent: newSpent,
        status: newStatus,
      },
    });
  } catch (err) {
    logger.warn("[sponsored] trackImpression failed", { id, error: (err as Error).message });
  }
}

/**
 * Tracks a click on a sponsored hashtag. Best-effort.
 */
export async function trackSponsoredClick(id: string): Promise<void> {
  if (typeof id !== "string" || !id) return;
  try {
    await db.sponsoredHashtag.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
  } catch (err) {
    logger.warn("[sponsored] trackClick failed", { id, error: (err as Error).message });
  }
}

/**
 * Creates a new sponsored hashtag campaign (admin / advertiser tool).
 */
export async function createSponsoredHashtag(opts: {
  tag: string;
  advertiser: string;
  targetCountry: string;
  targetCity?: string | null;
  category?: string | null;
  headline: string;
  url: string;
  budget: number;
  startDate: Date | string;
  endDate: Date | string;
}): Promise<SponsoredHashtag> {
  const tag = (opts.tag || "").trim().replace(/^#/, "").slice(0, 60);
  if (!tag) throw new Error("tag is required");
  const advertiser = (opts.advertiser || "").trim().slice(0, 128);
  if (!advertiser) throw new Error("advertiser is required");
  const targetCountry = (opts.targetCountry || "").trim().toUpperCase();
  if (targetCountry.length < 2 || targetCountry.length > 3) {
    throw new Error("targetCountry must be 2-3 letters");
  }
  if (!opts.url || !/^https?:\/\//i.test(opts.url)) {
    throw new Error("url must be a valid http(s) URL");
  }
  if (typeof opts.budget !== "number" || opts.budget <= 0) {
    throw new Error("budget must be > 0");
  }
  const startDate = opts.startDate instanceof Date ? opts.startDate : new Date(opts.startDate);
  const endDate = opts.endDate instanceof Date ? opts.endDate : new Date(opts.endDate);
  if (!isFinite(startDate.getTime())) throw new Error("startDate is invalid");
  if (!isFinite(endDate.getTime())) throw new Error("endDate is invalid");
  if (endDate <= startDate) throw new Error("endDate must be after startDate");

  const row = await db.sponsoredHashtag.create({
    data: {
      tag,
      advertiser,
      targetCountry,
      targetCity: opts.targetCity?.trim().slice(0, 64) || null,
      category: opts.category?.trim().slice(0, 40) || null,
      headline: (opts.headline || "").trim().slice(0, 140),
      url: opts.url.trim(),
      budget: opts.budget,
      startDate,
      endDate,
      status: "active",
    },
  });
  return serialize(row);
}

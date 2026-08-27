// @ts-nocheck
/**
 * Commit Templates — PLUS (D2+).
 *
 * Revenue layer built on top of `commit-templates.ts`.
 * Adds: premium templates with preview-then-pay gating, user ratings &
 * reviews, template bundles (multi-template discount), bestseller rank,
 * and a creator revenue share (70/30 split with the marketplace).
 *
 * Storage: in-memory feature-store (Prisma schema frozen for this task).
 */
import "server-only";
import { get, put, find, findOne, all, remove, update, nowISO } from "@/lib/feature-store";
import type { TemplateCategory } from "@/lib/commit-templates";

/** A premium template entry — extends the curated free template registry. */
export interface PremiumTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  emoji: string;
  body: string;
  priceUsd: number;
  creatorId: string;
  creatorSharePct: number; // default 70
  bestseller: boolean;
  downloads: number;
  ratingSum: number;
  ratingCount: number;
  previewLines: number; // how many body lines are visible to non-buyers
  publishedAt: string;
  createdAt: string;
}

export interface TemplatePurchase {
  id: string;
  templateId: string;
  userId: string;
  priceUsd: number;
  creatorPayout: number;
  platformFee: number;
  currency: string;
  status: "captured" | "refunded";
  reference: string;
  purchasedAt: string;
}

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface TemplateBundle {
  id: string;
  name: string;
  description: string;
  templateIds: string[];
  priceUsd: number; // typically < sum of individual prices
  emoji: string;
  createdAt: string;
}

const TEMPLATES = "premiumCommitTemplate";
const PURCHASES = "premiumCommitTemplatePurchase";
const REVIEWS = "premiumCommitTemplateReview";
const BUNDLES = "premiumCommitTemplateBundle";

function normalizeUser(u: string): string {
  return (u || "").trim().toLowerCase().replace(/^@/, "");
}

/** Seed a small catalogue of premium templates on first access. */
function ensureSeed() {
  if (all<PremiumTemplate>(TEMPLATES).length > 0) return;
  const seed: Array<Omit<PremiumTemplate, "id" | "createdAt" | "publishedAt" | "downloads" | "ratingSum" | "ratingCount">> = [
    {
      name: "Master Service Agreement (Enterprise)",
      category: "service",
      description: "Enterprise-grade MSA with SLA, indemnity, and IP assignment clauses.",
      emoji: "🏢",
      body: "MASTER SERVICE AGREEMENT\n\nThis Master Service Agreement (\"Agreement\") is entered into on {{date}} between {{provider}} (\"Provider\") and {{client}} (\"Client\").\n\n1. SERVICES\nProvider shall perform the services described in each Statement of Work.\n\n2. TERM\nThis Agreement shall remain in effect for 12 months unless terminated earlier.\n\n3. PAYMENT\nClient shall pay Provider within 30 days of invoice receipt.\n\n4. SLA\nProvider commits to 99.9% uptime with credited remedies for downtime.\n\n5. INTELLECTUAL PROPERTY\nAll work product is assigned to Client upon full payment.\n\n6. INDEMNIFICATION\nProvider indemnifies Client against third-party IP claims.\n\n7. GOVERNING LAW\n{{jurisdiction}}",
      priceUsd: 9.99,
      creatorId: "cirkle-legal",
      creatorSharePct: 70,
      bestseller: true,
      previewLines: 6,
    },
    {
      name: "Equity Partnership Agreement",
      category: "partnership",
      description: "Detailed equity split with vesting, cliffs, and buyout provisions.",
      emoji: "🤝",
      body: "EQUITY PARTNERSHIP AGREEMENT\n\nBetween {{partner_a}} and {{partner_b}} effective {{date}}.\n\n1. EQUITY SPLIT\nPartner A: {{pct_a}}%, Partner B: {{pct_b}}%\n\n2. VESTING\n4-year vesting with 1-year cliff.\n\n3. CAPITAL CONTRIBUTIONS\nInitial contributions documented in Schedule A.\n\n4. BUYOUT\nRight of first refusal at fair market value.\n\n5. DISSOLUTION\nOrderly wind-down procedures per Schedule B.\n\n6. GOVERNING LAW\n{{jurisdiction}}",
      priceUsd: 14.99,
      creatorId: "cirkle-legal",
      creatorSharePct: 70,
      bestseller: true,
      previewLines: 5,
    },
    {
      name: "Executive Employment Contract",
      category: "employment",
      description: "C-suite employment with non-compete, bonus structure, and severance.",
      emoji: "👔",
      body: "EXECUTIVE EMPLOYMENT CONTRACT\n\nBetween {{company}} (\"Employer\") and {{executive}} (\"Executive\").\n\n1. POSITION & DUTIES\nTitle: {{title}}. Reports to: Board of Directors.\n\n2. COMPENSATION\nBase: {{base_salary}}. Annual bonus up to 40% of base.\n\n3. EQUITY\nRestricted stock units vesting over 4 years.\n\n4. NON-COMPETE\n12-month post-termination non-compete in {{territory}}.\n\n5. SEVERANCE\n6 months base salary + COBRA if terminated without cause.\n\n6. GOVERNING LAW\n{{jurisdiction}}",
      priceUsd: 19.99,
      creatorId: "cirkle-legal",
      creatorSharePct: 70,
      bestseller: false,
      previewLines: 5,
    },
    {
      name: "Commercial Lease (Long-Form)",
      category: "rental",
      description: "Triple-net commercial lease with renewal options and TI allowance.",
      emoji: "🏬",
      body: "COMMERCIAL LEASE AGREEMENT\n\nLandlord: {{landlord}}. Tenant: {{tenant}}. Premises: {{address}}.\n\n1. TERM\n{{term_years}} years commencing {{start_date}}.\n\n2. RENT\nBase rent: {{monthly_rent}}/month with 3% annual escalations.\n\n3. TRIPLE NET\nTenant pays pro-rata share of taxes, insurance, and CAM.\n\n4. RENEWAL OPTIONS\nTwo 5-year renewal options at fair market value.\n\n5. TI ALLOWANCE\nLandlord provides {{ti_allowance}} for tenant improvements.\n\n6. GOVERNING LAW\n{{jurisdiction}}",
      priceUsd: 12.99,
      creatorId: "cirkle-legal",
      creatorSharePct: 70,
      bestseller: false,
      previewLines: 5,
    },
    {
      name: "Cross-Border NDA (Bilingual)",
      category: "nda",
      description: "Bilingual mutual NDA with arbitration clause in both languages.",
      emoji: "🌍",
      body: "MUTUAL NON-DISCLOSURE AGREEMENT / AGREEMENT DE NON-DIVULGATION MUTUEL\n\nBetween {{party_a}} and {{party_b}} effective {{date}}.\n\n1. CONFIDENTIAL INFORMATION\nDefined broadly to include trade secrets, customer data, and IP.\n\n2. OBLIGATIONS\nRecipient shall not disclose for 5 years from disclosure.\n\n3. EXCLUSIONS\nStandard exclusions for publicly-known or independently-developed info.\n\n4. ARBITRATION\nDisputes resolved via ICC arbitration in {{seat}}.\n\n5. GOVERNING LAW\n{{jurisdiction}}",
      priceUsd: 7.99,
      creatorId: "cirkle-legal",
      creatorSharePct: 70,
      bestseller: true,
      previewLines: 5,
    },
  ];
  for (const t of seed) {
    const rec: PremiumTemplate = {
      ...t,
      id: `ptpl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      downloads: 0,
      ratingSum: 0,
      ratingCount: 0,
      publishedAt: nowISO(),
      createdAt: nowISO(),
    };
    put(TEMPLATES, rec);
  }
}

export async function listPremiumTemplates(filter?: {
  category?: TemplateCategory;
  bestsellerOnly?: boolean;
}): Promise<PremiumTemplate[]> {
  ensureSeed();
  let items = all<PremiumTemplate>(TEMPLATES);
  if (filter?.category) items = items.filter((t) => t.category === filter.category);
  if (filter?.bestsellerOnly) items = items.filter((t) => t.bestseller);
  return items.sort((a, b) => b.downloads - a.downloads || b.ratingCount - a.ratingCount);
}

export async function getPremiumTemplate(id: string): Promise<PremiumTemplate | null> {
  ensureSeed();
  return get<PremiumTemplate>(TEMPLATES, id);
}

/** Returns the template body — only the first N lines if not purchased. */
export async function getTemplatePreview(
  templateId: string,
  userId: string,
): Promise<{ template: PremiumTemplate; body: string; fullAccess: boolean }> {
  const t = await getPremiumTemplate(templateId);
  if (!t) throw new Error("template not found");
  const owned = await hasPurchased(templateId, userId);
  const lines = t.body.split("\n");
  const body = owned ? t.body : lines.slice(0, t.previewLines).join("\n") + "\n\n[... Purchase to view full template ...]";
  return { template: t, body, fullAccess: owned };
}

export async function hasPurchased(templateId: string, userId: string): Promise<boolean> {
  const uid = normalizeUser(userId);
  if (!uid) return false;
  return (
    findOne<TemplatePurchase>(PURCHASES, (p) => p.templateId === templateId && p.userId === uid && p.status === "captured") !== null
  );
}

export interface PurchaseInput {
  templateId: string;
  userId: string;
  method?: "card" | "wallet" | "bank_transfer";
}

export async function purchaseTemplate(input: PurchaseInput): Promise<TemplatePurchase> {
  const t = await getPremiumTemplate(input.templateId);
  if (!t) throw new Error("template not found");
  const uid = normalizeUser(input.userId);
  if (!uid) throw new Error("userId is required");
  // Idempotent — return existing purchase if already owned
  const existing = findOne<TemplatePurchase>(
    PURCHASES,
    (p) => p.templateId === t.id && p.userId === uid && p.status === "captured",
  );
  if (existing) return existing;
  const creatorPayout = Math.round(t.priceUsd * (t.creatorSharePct / 100) * 100) / 100;
  const platformFee = Math.round((t.priceUsd - creatorPayout) * 100) / 100;
  const purchase: TemplatePurchase = {
    id: `purch_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    templateId: t.id,
    userId: uid,
    priceUsd: t.priceUsd,
    creatorPayout,
    platformFee,
    currency: "USD",
    status: "captured",
    reference: `REF-TPL-${Date.now().toString(36).toUpperCase()}`,
    purchasedAt: nowISO(),
  };
  put(PURCHASES, purchase);
  // Bump download count
  update<PremiumTemplate>(TEMPLATES, t.id, { downloads: t.downloads + 1 });
  return purchase;
}

export async function refundPurchase(purchaseId: string): Promise<TemplatePurchase | null> {
  const cur = get<TemplatePurchase>(PURCHASES, purchaseId);
  if (!cur) return null;
  // Decrement download count on refund
  const t = get<PremiumTemplate>(TEMPLATES, cur.templateId);
  if (t && t.downloads > 0) {
    update<PremiumTemplate>(TEMPLATES, t.id, { downloads: t.downloads - 1 });
  }
  return update<TemplatePurchase>(PURCHASES, purchaseId, { status: "refunded" });
}

export async function listUserPurchases(userId: string): Promise<TemplatePurchase[]> {
  const uid = normalizeUser(userId);
  if (!uid) return [];
  return find<TemplatePurchase>(PURCHASES, (p) => p.userId === uid)
    .sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : -1));
}

export async function rateTemplate(
  templateId: string,
  userId: string,
  rating: number,
  comment: string,
): Promise<TemplateReview> {
  if (rating < 1 || rating > 5) throw new Error("rating must be 1-5");
  const t = await getPremiumTemplate(templateId);
  if (!t) throw new Error("template not found");
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  // One review per user per template
  const existing = findOne<TemplateReview>(REVIEWS, (r) => r.templateId === templateId && r.userId === uid);
  if (existing) {
    // Recompute rating delta
    const oldRating = existing.rating;
    const delta = rating - oldRating;
    update<PremiumTemplate>(TEMPLATES, templateId, {
      ratingSum: t.ratingSum + delta,
    });
    return update<TemplateReview>(REVIEWS, existing.id, { rating, comment }) as TemplateReview;
  }
  const review: TemplateReview = {
    id: `rev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    templateId,
    userId: uid,
    rating,
    comment,
    createdAt: nowISO(),
  };
  put(REVIEWS, review);
  update<PremiumTemplate>(TEMPLATES, templateId, {
    ratingSum: t.ratingSum + rating,
    ratingCount: t.ratingCount + 1,
  });
  return review;
}

export async function listReviews(templateId: string): Promise<TemplateReview[]> {
  return find<TemplateReview>(REVIEWS, (r) => r.templateId === templateId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getRating(templateId: string): Promise<{ avg: number; count: number }> {
  const t = get<PremiumTemplate>(TEMPLATES, templateId);
  if (!t || t.ratingCount === 0) return { avg: 0, count: 0 };
  return { avg: Math.round((t.ratingSum / t.ratingCount) * 10) / 10, count: t.ratingCount };
}

/** Bundles — buy multiple templates at a discount. */
export async function createBundle(input: {
  name: string;
  description: string;
  templateIds: string[];
  priceUsd: number;
  emoji?: string;
}): Promise<TemplateBundle> {
  if (input.templateIds.length < 2) throw new Error("bundle must contain at least 2 templates");
  const bundle: TemplateBundle = {
    id: `bndl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: input.name,
    description: input.description,
    templateIds: input.templateIds,
    priceUsd: input.priceUsd,
    emoji: input.emoji || "📦",
    createdAt: nowISO(),
  };
  put(BUNDLES, bundle);
  return bundle;
}

export async function listBundles(): Promise<Array<TemplateBundle & { savings: number }>> {
  ensureSeed();
  const bundles = all<TemplateBundle>(BUNDLES);
  return bundles.map((b) => {
    const items = b.templateIds
      .map((id) => get<PremiumTemplate>(TEMPLATES, id))
      .filter((t): t is PremiumTemplate => t !== null);
    const sum = items.reduce((acc, t) => acc + t.priceUsd, 0);
    return { ...b, savings: Math.round((sum - b.priceUsd) * 100) / 100 };
  });
}

/** Revenue share roll-up for a creator. */
export async function getCreatorRevenue(creatorId: string): Promise<{
  totalRevenue: number;
  totalPayout: number;
  totalPlatformFee: number;
  totalDownloads: number;
  totalRefunds: number;
}> {
  const cid = normalizeUser(creatorId);
  const templates = find<PremiumTemplate>(TEMPLATES, (t) => t.creatorId === cid);
  const templateIds = new Set(templates.map((t) => t.id));
  const purchases = all<TemplatePurchase>(PURCHASES).filter((p) => templateIds.has(p.templateId));
  let totalRevenue = 0;
  let totalPayout = 0;
  let totalPlatformFee = 0;
  let totalRefunds = 0;
  const totalDownloads = templates.reduce((acc, t) => acc + t.downloads, 0);
  for (const p of purchases) {
    if (p.status === "captured") {
      totalRevenue += p.priceUsd;
      totalPayout += p.creatorPayout;
      totalPlatformFee += p.platformFee;
    } else if (p.status === "refunded") {
      totalRefunds += p.priceUsd;
    }
  }
  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalPayout: Math.round(totalPayout * 100) / 100,
    totalPlatformFee: Math.round(totalPlatformFee * 100) / 100,
    totalDownloads,
    totalRefunds: Math.round(totalRefunds * 100) / 100,
  };
}

// @ts-nocheck
/**
 * Sponsored Midan Posts (D3) — transparent, opt-in sponsored content.
 *
 * Advertisers create sponsored posts with targeting (countries + interests)
 * and a budget. Posts are clearly labeled "Sponsored" in the feed.
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, find, all, update, parseArray, stringifyArray, nowISO } from "@/lib/feature-store";

export type SponsoredStatus = "pending" | "active" | "paused" | "ended";

export interface SponsoredPost {
  id: string;
  advertiserId: string;
  body: string;
  targetCountries: string; // JSON array
  targetInterests: string; // JSON array
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  status: SponsoredStatus;
  createdAt: string;
}

const STORE = "sponsoredPost";

export interface CreateSponsoredInput {
  advertiserId: string;
  body: string;
  targetCountries?: string[];
  targetInterests?: string[];
  budget: number;
  currency?: string;
}

export async function createSponsoredPost(input: CreateSponsoredInput): Promise<SponsoredPost> {
  const advertiserId = (input.advertiserId || "").trim();
  if (!advertiserId) throw new Error("advertiserId is required");
  const body = (input.body || "").trim();
  if (body.length < 3) throw new Error("body must be at least 3 characters");
  if (body.length > 500) throw new Error("body must be at most 500 characters");
  if (!isFinite(input.budget) || input.budget < 1) {
    throw new Error("budget must be at least 1");
  }
  const record: SponsoredPost = {
    id: `sp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    advertiserId,
    body,
    targetCountries: stringifyArray((input.targetCountries ?? []).map((c) => c.toUpperCase().slice(0, 2))),
    targetInterests: stringifyArray((input.targetInterests ?? []).map((s) => s.trim().toLowerCase().slice(0, 40))),
    budget: input.budget,
    spent: 0,
    impressions: 0,
    clicks: 0,
    status: "pending",
    createdAt: nowISO(),
  };
  put(STORE, record);
  return record;
}

export interface SponsoredFeedOpts {
  viewerCountry?: string;
  viewerInterests?: string[];
  limit?: number;
}

export async function getSponsoredFeed(opts: SponsoredFeedOpts = {}): Promise<SponsoredPost[]> {
  const country = (opts.viewerCountry || "").toUpperCase().slice(0, 2);
  const interests = (opts.viewerInterests ?? []).map((i) => i.toLowerCase().trim());
  const candidates = find<SponsoredPost>(STORE, (p) => p.status === "active");
  const matched = candidates.filter((p) => {
    const targetCountries = parseArray<string>(p.targetCountries);
    const targetInterests = parseArray<string>(p.targetInterests);
    const countryMatch = targetCountries.length === 0 || targetCountries.includes(country);
    const interestMatch =
      targetInterests.length === 0 ||
      targetInterests.some((i) => interests.includes(i));
    return countryMatch && interestMatch;
  });
  // Sort by spend capacity (remaining budget) desc
  matched.sort((a, b) => b.budget - b.spent - (a.budget - a.spent));
  const limit = Math.max(1, Math.min(opts.limit ?? 5, 20));
  return matched.slice(0, limit);
}

export function isSponsored(post: { id: string } | null | undefined): boolean {
  if (!post) return false;
  return get<SponsoredPost>(STORE, post.id) !== null;
}

/** Record an impression and increment spend (CPC=0.05, CPM=2). */
export async function recordImpression(id: string, cpm = 2): Promise<SponsoredPost | null> {
  const cur = get<SponsoredPost>(STORE, id);
  if (!cur || cur.status !== "active") return null;
  const inc = cpm / 1000;
  const newSpent = Math.min(cur.budget, cur.spent + inc);
  const newImpressions = cur.impressions + 1;
  const ended = newSpent >= cur.budget;
  return update<SponsoredPost>(STORE, id, {
    impressions: newImpressions,
    spent: Math.round(newSpent * 100) / 100,
    status: ended ? "ended" : "active",
  });
}

/** Record a click — CPC model. */
export async function recordClick(id: string, cpc = 0.05): Promise<SponsoredPost | null> {
  const cur = get<SponsoredPost>(STORE, id);
  if (!cur || cur.status !== "active") return null;
  const newSpent = Math.min(cur.budget, cur.spent + cpc);
  const ended = newSpent >= cur.budget;
  return update<SponsoredPost>(STORE, id, {
    clicks: cur.clicks + 1,
    spent: Math.round(newSpent * 100) / 100,
    status: ended ? "ended" : "active",
  });
}

/** Activate a pending sponsored post (admin/manual approval). */
export async function activatePost(id: string): Promise<SponsoredPost | null> {
  return update<SponsoredPost>(STORE, id, { status: "active" });
}

export async function listAllSponsored(): Promise<SponsoredPost[]> {
  return all<SponsoredPost>(STORE);
}

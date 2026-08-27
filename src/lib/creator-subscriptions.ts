// @ts-nocheck
/**
 * Creator Subscriptions (D4).
 *
 * Creators define subscription tiers (Silver, Gold, Inner Circle…). Users
 * subscribe to a tier — the creator gets monthly revenue. Includes a
 * creator dashboard view showing tiers + subscribers + revenue.
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, find, all, update, parseArray, stringifyArray, nowISO } from "@/lib/feature-store";

export interface CreatorSubscriptionTier {
  id: string;
  creatorId: string;
  name: string;
  price: number;
  currency: string;
  perks: string; // JSON array
  subscriberCount: number;
  createdAt: string;
}

export type SubscriptionStatus = "active" | "cancelled" | "expired";

export interface CreatorSubscription {
  id: string;
  tierId: string;
  subscriberId: string;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string | null;
}

const TIERS = "creatorSubscriptionTier";
const SUBS = "creatorSubscription";

export interface CreateTierInput {
  creatorId: string;
  name: string;
  price: number;
  currency?: string;
  perks?: string[];
}

export async function createSubscriptionTier(input: CreateTierInput): Promise<CreatorSubscriptionTier> {
  const creatorId = (input.creatorId || "").trim().toLowerCase().replace(/^@/, "");
  if (!creatorId) throw new Error("creatorId is required");
  const name = (input.name || "").trim();
  if (name.length < 2) throw new Error("tier name must be at least 2 characters");
  if (name.length > 40) throw new Error("tier name must be at most 40 characters");
  if (!isFinite(input.price) || input.price < 0) throw new Error("price must be >= 0");
  if (input.price > 10000) throw new Error("price exceeds the per-tier cap of 10000");
  const tier: CreatorSubscriptionTier = {
    id: `tier_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    creatorId,
    name,
    price: Math.round(input.price * 100) / 100,
    currency: (input.currency || "USD").toUpperCase().slice(0, 3),
    perks: stringifyArray((input.perks ?? []).map((p) => p.trim().slice(0, 120)).filter(Boolean)),
    subscriberCount: 0,
    createdAt: nowISO(),
  };
  put(TIERS, tier);
  return tier;
}

export interface SubscribeInput {
  tierId: string;
  subscriberId: string;
  months?: number;
}

export async function subscribeToCreator(input: SubscribeInput): Promise<CreatorSubscription> {
  const tier = get<CreatorSubscriptionTier>(TIERS, input.tierId);
  if (!tier) throw new Error(`tier ${input.tierId} not found`);
  const subscriberId = (input.subscriberId || "").trim().toLowerCase().replace(/^@/, "");
  if (!subscriberId) throw new Error("subscriberId is required");
  if (subscriberId === tier.creatorId) throw new Error("creators cannot subscribe to their own tier");
  // Cancel any existing active subscription to this tier by the same user
  const existing = findOneSubscription(tier.id, subscriberId);
  if (existing && existing.status === "active") {
    throw new Error("user already actively subscribed to this tier");
  }
  const months = Math.max(1, Math.min(input.months ?? 1, 12));
  const startedAt = nowISO();
  const expiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
  const sub: CreatorSubscription = {
    id: `sub_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    tierId: tier.id,
    subscriberId,
    status: "active",
    startedAt,
    expiresAt,
  };
  put(SUBS, sub);
  // Increment tier's subscriberCount
  update<CreatorSubscriptionTier>(TIERS, tier.id, { subscriberCount: tier.subscriberCount + 1 });
  return sub;
}

function findOneSubscription(tierId: string, subscriberId: string): CreatorSubscription | null {
  return find<CreatorSubscription>(SUBS, (s) => s.tierId === tierId && s.subscriberId === subscriberId)[0] ?? null;
}

export async function getSubscriberCount(tierId: string): Promise<number> {
  const tier = get<CreatorSubscriptionTier>(TIERS, tierId);
  return tier?.subscriberCount ?? 0;
}

export async function listTiersByCreator(creatorId: string): Promise<CreatorSubscriptionTier[]> {
  const id = (creatorId || "").trim().toLowerCase().replace(/^@/, "");
  return find<CreatorSubscriptionTier>(TIERS, (t) => t.creatorId === id)
    .sort((a, b) => a.price - b.price);
}

export async function listSubscriptionsByCreator(creatorId: string): Promise<CreatorSubscription[]> {
  const id = (creatorId || "").trim().toLowerCase().replace(/^@/, "");
  const tiers = find<CreatorSubscriptionTier>(TIERS, (t) => t.creatorId === id);
  const tierIds = new Set(tiers.map((t) => t.id));
  return find<CreatorSubscription>(SUBS, (s) => tierIds.has(s.tierId))
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export interface CreatorRevenue {
  creatorId: string;
  totalSubscribers: number;
  totalActiveSubs: number;
  monthlyRecurring: number;
  currency: string;
  tiers: Array<{ tier: CreatorSubscriptionTier; subs: CreatorSubscription[]; monthly: number }>;
}

export async function getCreatorRevenue(creatorId: string): Promise<CreatorRevenue> {
  const tiers = await listTiersByCreator(creatorId);
  const subs = await listSubscriptionsByCreator(creatorId);
  const active = subs.filter((s) => s.status === "active");
  let monthlyRecurring = 0;
  const tierRows = tiers.map((tier) => {
    const tierSubs = subs.filter((s) => s.tierId === tier.id);
    const tierActive = tierSubs.filter((s) => s.status === "active");
    const monthly = tierActive.length * tier.price;
    monthlyRecurring += monthly;
    return { tier, subs: tierSubs, monthly };
  });
  return {
    creatorId: (creatorId || "").trim().toLowerCase().replace(/^@/, ""),
    totalSubscribers: subs.length,
    totalActiveSubs: active.length,
    monthlyRecurring: Math.round(monthlyRecurring * 100) / 100,
    currency: tiers[0]?.currency ?? "USD",
    tiers: tierRows,
  };
}

export function tierPerks(tier: CreatorSubscriptionTier): string[] {
  return parseArray<string>(tier.perks);
}

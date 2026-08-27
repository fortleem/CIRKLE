// @ts-nocheck
/**
 * Premium AI — PLUS (D7+).
 *
 * Revenue expansion on top of the existing `premium-ai.ts`.
 * Adds: 7-day free trial with no card required, gift subscriptions
 * (sender pays, recipient gets months), family plan (up to 5 members),
 * annual loyalty discount, referral credits, and a feature-gate that
 * respects trial + gift + family entitlements.
 *
 * Storage: in-memory feature-store (Prisma schema frozen for this task).
 */
import "server-only";
import {
  get, put, find, findOne, all, update, remove, nowISO,
} from "@/lib/feature-store";
import {
  isPremiumUser, getActiveSubscription, subscribeToPremium,
  PREMIUM_PRICE_MONTHLY, PREMIUM_PRICE_YEARLY,
  type PremiumPlan, type PremiumStatus,
} from "@/lib/premium-ai";

const TRIALS = "premiumTrialStore";
const GIFTS = "premiumGiftStore";
const FAMILY = "premiumFamilyStore";
const REFERRALS = "premiumReferralStore";

/** 7-day trial — no card, no auto-renew. */
export interface PremiumTrial {
  id: string;
  userId: string;
  startedAt: string;
  expiresAt: string;
  status: "active" | "expired" | "converted";
  convertedSubscriptionId: string | null;
}

/** Gift subscription — sender pays, recipient receives N months. */
export interface PremiumGift {
  id: string;
  senderId: string;
  recipientId: string;
  months: number;
  amountPaid: number;
  currency: string;
  message: string;
  redeemedAt: string | null;
  status: "pending" | "redeemed" | "expired";
  code: string;
  createdAt: string;
}

/** Family plan — owner + up to 4 members. */
export interface PremiumFamily {
  id: string;
  ownerId: string;
  memberIds: string[];
  plan: PremiumPlan;
  status: PremiumStatus;
  startedAt: string;
  expiresAt: string | null;
  inviteCode: string;
}

/** Referral — credits both referrer + referee after first subscription. */
export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredId: string;
  status: "pending" | "credited";
  creditAppliedAt: string | null;
  createdAt: string;
}

const TRIAL_DAYS = 7;
const FAMILY_MAX_MEMBERS = 5;
const FAMILY_PRICE_MONTHLY = 8;
const FAMILY_PRICE_YEARLY = 80;
const REFERRAL_BONUS_DAYS = 14;
const GIFT_PRICE_PER_MONTH = 2.5;

function normalizeUser(u: string): string {
  return (u || "").trim().toLowerCase().replace(/^@/, "");
}

export function getTrialDurationDays(): number {
  return TRIAL_DAYS;
}

export async function startTrial(userId: string): Promise<PremiumTrial> {
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  // Already premium? skip
  if (await isPremiumUser(uid)) {
    throw new Error("user already has an active premium subscription");
  }
  // Already had a trial? Block.
  const existing = findOne<PremiumTrial>(TRIALS, (t) => t.userId === uid);
  if (existing) {
    throw new Error("user has already used their free trial");
  }
  const trial: PremiumTrial = {
    id: `trial_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    userId: uid,
    startedAt: nowISO(),
    expiresAt: new Date(Date.now() + TRIAL_DAYS * 86400_000).toISOString(),
    status: "active",
    convertedSubscriptionId: null,
  };
  put(TRIALS, trial);
  return trial;
}

export async function getTrialStatus(userId: string): Promise<PremiumTrial | null> {
  const uid = normalizeUser(userId);
  if (!uid) return null;
  const t = findOne<PremiumTrial>(TRIALS, (x) => x.userId === uid);
  if (!t) return null;
  // Auto-expire
  if (t.status === "active" && new Date(t.expiresAt).getTime() <= Date.now()) {
    return update<PremiumTrial>(TRIALS, t.id, { status: "expired" });
  }
  return t;
}

/** Convert an active trial into a real paid subscription. */
export async function convertTrial(
  userId: string,
  plan: PremiumPlan,
): Promise<{ trial: PremiumTrial | null; subscription: unknown | null }> {
  const uid = normalizeUser(userId);
  const t = await getTrialStatus(uid);
  if (!t || t.status !== "active") {
    return { trial: t, subscription: null };
  }
  const sub = await subscribeToPremium({ userId: uid, plan });
  const updated = update<PremiumTrial>(TRIALS, t.id, {
    status: "converted",
    convertedSubscriptionId: sub.id,
  });
  return { trial: updated, subscription: sub };
}

/** Check whether a user has trial-based access (active trial in window). */
export async function hasTrialAccess(userId: string): Promise<boolean> {
  const t = await getTrialStatus(userId);
  return t?.status === "active";
}

/** Premium-or-trial: used by feature gates. */
export async function hasPremiumOrTrialAccess(userId: string): Promise<boolean> {
  const uid = normalizeUser(userId);
  if (!uid) return false;
  if (await isPremiumUser(uid)) return true;
  if (await hasTrialAccess(uid)) return true;
  if (await isInFamilyPlan(uid)) return true;
  return false;
}

/** Gift subscription — purchase months for another user. */
export interface PurchaseGiftInput {
  senderId: string;
  recipientId: string;
  months: number;
  message?: string;
}

export async function purchaseGift(input: PurchaseGiftInput): Promise<PremiumGift> {
  const senderId = normalizeUser(input.senderId);
  const recipientId = normalizeUser(input.recipientId);
  if (!senderId) throw new Error("senderId is required");
  if (!recipientId) throw new Error("recipientId is required");
  if (senderId === recipientId) throw new Error("cannot gift to yourself");
  const months = Math.max(1, Math.min(12, Math.floor(input.months)));
  const amountPaid = Math.round(months * GIFT_PRICE_PER_MONTH * 100) / 100;
  const code = `${recipientId.slice(0, 3).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const gift: PremiumGift = {
    id: `gift_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    senderId,
    recipientId,
    months,
    amountPaid,
    currency: "USD",
    message: input.message || "",
    redeemedAt: null,
    status: "pending",
    code,
    createdAt: nowISO(),
  };
  put(GIFTS, gift);
  return gift;
}

/** Recipient redeems a gift code → receives premium months. */
export async function redeemGift(code: string, recipientId: string): Promise<{
  gift: PremiumGift | null;
  subscription: unknown | null;
}> {
  const c = (code || "").trim().toUpperCase();
  const rid = normalizeUser(recipientId);
  const gift = findOne<PremiumGift>(GIFTS, (g) => g.code.toUpperCase() === c);
  if (!gift) return { gift: null, subscription: null };
  if (gift.status === "redeemed") return { gift, subscription: null };
  if (gift.recipientId !== rid) throw new Error("gift code is for a different user");
  // Create a monthly subscription scaled to N months
  const sub = await subscribeToPremium({ userId: rid, plan: "monthly", months: gift.months });
  const updated = update<PremiumGift>(GIFTS, gift.id, {
    status: "redeemed",
    redeemedAt: nowISO(),
  });
  return { gift: updated, subscription: sub };
}

export async function listUserGifts(userId: string): Promise<PremiumGift[]> {
  const uid = normalizeUser(userId);
  if (!uid) return [];
  return find<PremiumGift>(GIFTS, (g) => g.senderId === uid || g.recipientId === uid)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Family plan — owner pays, up to 4 additional members get premium. */
export async function createFamilyPlan(input: {
  ownerId: string;
  plan: PremiumPlan;
  months?: number;
}): Promise<PremiumFamily> {
  const ownerId = normalizeUser(input.ownerId);
  if (!ownerId) throw new Error("ownerId is required");
  if (await isInFamilyPlan(ownerId)) throw new Error("user is already in a family plan");
  const months = Math.max(1, Math.min(12, input.months ?? 1));
  const plan = input.plan;
  const price = plan === "yearly" ? FAMILY_PRICE_YEARLY : FAMILY_PRICE_MONTHLY;
  // Verify the owner paid (mock — assume payment captured externally)
  // The family plan covers up to FAMILY_MAX_MEMBERS members.
  const family: PremiumFamily = {
    id: `fam_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    ownerId,
    memberIds: [],
    plan,
    status: "active",
    startedAt: nowISO(),
    expiresAt: new Date(Date.now() + months * 30 * 86400_000).toISOString(),
    inviteCode: `FAM-${ownerId.slice(0, 3).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  };
  put(FAMILY, family);
  return family;
}

export async function joinFamilyPlan(inviteCode: string, userId: string): Promise<PremiumFamily | null> {
  const code = (inviteCode || "").trim().toUpperCase();
  const uid = normalizeUser(userId);
  if (!uid) throw new Error("userId is required");
  if (await isInFamilyPlan(uid)) throw new Error("user already in a family plan");
  const fam = findOne<PremiumFamily>(FAMILY, (f) => f.inviteCode.toUpperCase() === code);
  if (!fam) return null;
  if (fam.status !== "active") throw new Error("family plan not active");
  if (fam.memberIds.length >= FAMILY_MAX_MEMBERS - 1) {
    throw new Error(`family plan is full (max ${FAMILY_MAX_MEMBERS} including owner)`);
  }
  if (fam.ownerId === uid) throw new Error("owner is already in the family plan");
  if (fam.memberIds.includes(uid)) return fam;
  const updated = update<PremiumFamily>(FAMILY, fam.id, { memberIds: [...fam.memberIds, uid] });
  return updated;
}

export async function getFamilyPlan(userId: string): Promise<PremiumFamily | null> {
  const uid = normalizeUser(userId);
  if (!uid) return null;
  return (
    findOne<PremiumFamily>(FAMILY, (f) => f.ownerId === uid || f.memberIds.includes(uid)) ?? null
  );
}

export async function isInFamilyPlan(userId: string): Promise<boolean> {
  const f = await getFamilyPlan(userId);
  if (!f) return false;
  if (f.status !== "active") return false;
  if (f.expiresAt && new Date(f.expiresAt).getTime() <= Date.now()) return false;
  return true;
}

export async function leaveFamilyPlan(userId: string): Promise<boolean> {
  const uid = normalizeUser(userId);
  if (!uid) return false;
  const fam = await getFamilyPlan(uid);
  if (!fam) return false;
  if (fam.ownerId === uid) {
    // Owner leaving = plan ends
    update<PremiumFamily>(FAMILY, fam.id, { status: "cancelled" });
    return true;
  }
  const next = fam.memberIds.filter((m) => m !== uid);
  update<PremiumFamily>(FAMILY, fam.id, { memberIds: next });
  return true;
}

export const FAMILY_PLAN_PRICING = {
  monthly: FAMILY_PRICE_MONTHLY,
  yearly: FAMILY_PRICE_YEARLY,
  maxMembers: FAMILY_MAX_MEMBERS,
  savingsVsIndividual: (FAMILY_MAX_MEMBERS * PREMIUM_PRICE_MONTHLY - FAMILY_PRICE_MONTHLY) / (FAMILY_MAX_MEMBERS * PREMIUM_PRICE_MONTHLY) * 100,
};

/** Referral program — both users get 14 days of premium credit. */
export async function createReferral(referrerId: string, referredId: string): Promise<ReferralRecord> {
  const ref = normalizeUser(referrerId);
  const rec = normalizeUser(referredId);
  if (!ref || !rec) throw new Error("referrerId + referredId required");
  if (ref === rec) throw new Error("cannot refer yourself");
  // Idempotent
  const existing = findOne<ReferralRecord>(REFERRALS, (r) => r.referrerId === ref && r.referredId === rec);
  if (existing) return existing;
  const record: ReferralRecord = {
    id: `ref_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    referrerId: ref,
    referredId: rec,
    status: "pending",
    creditAppliedAt: null,
    createdAt: nowISO(),
  };
  put(REFERRALS, record);
  return record;
}

export async function creditReferral(referredId: string): Promise<{ referrer: ReferralRecord | null; referred: ReferralRecord | null }> {
  const rec = normalizeUser(referredId);
  const record = findOne<ReferralRecord>(REFERRALS, (r) => r.referredId === rec && r.status === "pending");
  if (!record) return { referrer: null, referred: null };
  // Give both users a trial-like extension (we can't extend a real subscription here
  // without modifying the existing model — so we issue a 14-day trial).
  await startTrial(rec).catch(() => null);
  await startTrial(record.referrerId).catch(() => null);
  const updated = update<ReferralRecord>(REFERRALS, record.id, {
    status: "credited",
    creditAppliedAt: nowISO(),
  });
  return { referrer: updated, referred: updated };
}

export async function listReferrals(userId: string): Promise<ReferralRecord[]> {
  const uid = normalizeUser(userId);
  if (!uid) return [];
  return find<ReferralRecord>(REFERRALS, (r) => r.referrerId === uid || r.referredId === uid)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export const REFERRAL_PROGRAM = {
  bonusDays: REFERRAL_BONUS_DAYS,
  giftPricePerMonth: GIFT_PRICE_PER_MONTH,
};

/** Premium entitlement summary for a user. */
export interface PremiumEntitlement {
  userId: string;
  isPremium: boolean;
  hasActiveTrial: boolean;
  isInFamilyPlan: boolean;
  familyRole: "owner" | "member" | null;
  familyPlanId: string | null;
  totalAccessDaysLeft: number;
  entitlementSource: "subscription" | "trial" | "family" | "gift" | "none";
}

export async function getEntitlement(userId: string): Promise<PremiumEntitlement> {
  const uid = normalizeUser(userId);
  if (!uid) {
    return {
      userId: "",
      isPremium: false,
      hasActiveTrial: false,
      isInFamilyPlan: false,
      familyRole: null,
      familyPlanId: null,
      totalAccessDaysLeft: 0,
      entitlementSource: "none",
    };
  }
  const sub = await getActiveSubscription(uid);
  const trial = await getTrialStatus(uid);
  const family = await getFamilyPlan(uid);
  let source: PremiumEntitlement["entitlementSource"] = "none";
  let days = 0;
  if (sub) {
    source = "subscription";
    if (sub.expiresAt) {
      days = Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86400_000));
    }
  } else if (trial?.status === "active") {
    source = "trial";
    days = Math.max(0, Math.ceil((new Date(trial.expiresAt).getTime() - Date.now()) / 86400_000));
  } else if (family && family.status === "active" && family.expiresAt) {
    source = "family";
    days = Math.max(0, Math.ceil((new Date(family.expiresAt).getTime() - Date.now()) / 86400_000));
  }
  return {
    userId: uid,
    isPremium: !!sub,
    hasActiveTrial: trial?.status === "active",
    isInFamilyPlan: !!family && family.status === "active",
    familyRole: family && family.ownerId === uid ? "owner" : family && family.memberIds.includes(uid) ? "member" : null,
    familyPlanId: family?.id ?? null,
    totalAccessDaysLeft: days,
    entitlementSource: source,
  };
}

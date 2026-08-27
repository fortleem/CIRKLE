// @ts-nocheck
/**
 * Verified Institution Badge — PLUS (D1+).
 *
 * Revenue + polish layer built on top of the existing `verified-badge.ts`.
 * Adds: annual renewal flow, tier upgrade with prorated pricing, payment
 * ledger tracking every fee transaction, downloadable certificate, public
 * verification URL, and an analytics roll-up for the institution dashboard.
 *
 * Storage: in-memory feature-store (Prisma schema frozen for this task).
 * Upgrade path: replace `feature-store` calls with `db.institutionVerification.*`
 * + `db.institutionPaymentLedger.*` once the schema is unfrozen.
 */
import "server-only";
import {
  get, put, find, findOne, update, all, remove, nowISO,
} from "@/lib/feature-store";
import { TIER_PRICING, type BadgeTier, type InstitutionVerification } from "@/lib/verified-badge";

/** Payment ledger entry — every fee transaction (initial / renewal / upgrade). */
export interface VerificationPayment {
  id: string;
  verificationId: string;
  institutionId: string;
  kind: "initial" | "renewal" | "upgrade";
  amount: number;
  currency: string;
  tier: BadgeTier;
  status: "pending" | "captured" | "refunded" | "failed";
  method: "card" | "wallet" | "bank_transfer";
  reference: string;
  capturedAt: string | null;
  createdAt: string;
}

/** Public certificate issued once verification is approved. */
export interface VerificationCertificate {
  id: string;
  verificationId: string;
  institutionId: string;
  tier: BadgeTier;
  serialNumber: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  publicUrl: string;
}

const LEDGER = "institutionPaymentLedger";
const CERTS = "institutionVerificationCertificate";

/** Pricing helpers — renewal is 80% of the initial fee, upgrade is prorated. */
export function renewalFee(tier: BadgeTier): number {
  return Math.round(TIER_PRICING[tier].fee * 0.8);
}

export function upgradeFee(fromTier: BadgeTier, toTier: BadgeTier): number {
  if (fromTier === toTier) return 0;
  const order: BadgeTier[] = ["basic", "silver", "gold"];
  const fromIdx = order.indexOf(fromTier);
  const toIdx = order.indexOf(toTier);
  if (toIdx <= fromIdx) return 0;
  const diff = TIER_PRICING[toTier].fee - TIER_PRICING[fromTier].fee;
  // Prorate: 60% of the difference (assumes ~mid-cycle upgrade)
  return Math.round(diff * 0.6);
}

export interface RecordPaymentInput {
  verificationId: string;
  institutionId: string;
  kind: "initial" | "renewal" | "upgrade";
  tier: BadgeTier;
  amount: number;
  currency?: string;
  method?: "card" | "wallet" | "bank_transfer";
  reference?: string;
}

export async function recordPayment(
  input: RecordPaymentInput,
): Promise<VerificationPayment> {
  const vid = (input.verificationId || "").trim();
  if (!vid) throw new Error("verificationId is required");
  const iid = (input.institutionId || "").trim();
  if (!iid) throw new Error("institutionId is required");
  if (input.amount < 0) throw new Error("amount must be >= 0");
  const payment: VerificationPayment = {
    id: `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    verificationId: vid,
    institutionId: iid,
    kind: input.kind,
    amount: input.amount,
    currency: input.currency || "USD",
    tier: input.tier,
    status: "captured",
    method: input.method || "card",
    reference: input.reference || `REF-${Date.now().toString(36).toUpperCase()}`,
    capturedAt: nowISO(),
    createdAt: nowISO(),
  };
  put(LEDGER, payment);
  return payment;
}

export async function refundPayment(paymentId: string): Promise<VerificationPayment | null> {
  const cur = get<VerificationPayment>(LEDGER, paymentId);
  if (!cur) return null;
  return update<VerificationPayment>(LEDGER, paymentId, {
    status: "refunded",
    capturedAt: null,
  });
}

export async function getPaymentLedger(institutionId: string): Promise<VerificationPayment[]> {
  const iid = (institutionId || "").trim();
  if (!iid) return [];
  return find<VerificationPayment>(LEDGER, (p) => p.institutionId === iid)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Renew an approved verification for another 365 days. Captures renewal fee. */
export async function renewVerification(
  verificationId: string,
  method: "card" | "wallet" | "bank_transfer" = "card",
): Promise<{ verification: InstitutionVerification | null; payment: VerificationPayment }> {
  const existing = findOne<InstitutionVerification>(
    "institutionVerification",
    (v) => v.id === verificationId,
  );
  if (!existing) {
    return { verification: null, payment: recordPaymentStub(verificationId, "renewal") };
  }
  if (existing.status !== "approved") {
    throw new Error(`cannot renew: verification status is ${existing.status}`);
  }
  const fee = renewalFee(existing.tier);
  const payment = await recordPayment({
    verificationId: existing.id,
    institutionId: existing.institutionId,
    kind: "renewal",
    tier: existing.tier,
    amount: fee,
    currency: existing.currency,
    method,
  });
  const newExpiry = new Date(
    Math.max(
      Date.now(),
      existing.expiresAt ? new Date(existing.expiresAt).getTime() : 0,
    ) + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updated = update<InstitutionVerification>(
    "institutionVerification",
    existing.id,
    { expiresAt: newExpiry },
  );
  return { verification: updated, payment };
}

/** Upgrade a verified institution to a higher tier (basic → silver → gold). */
export async function upgradeTier(
  verificationId: string,
  newTier: BadgeTier,
  method: "card" | "wallet" | "bank_transfer" = "card",
): Promise<{ verification: InstitutionVerification | null; payment: VerificationPayment | null }> {
  const existing = findOne<InstitutionVerification>(
    "institutionVerification",
    (v) => v.id === verificationId,
  );
  if (!existing) throw new Error("verification not found");
  if (existing.status !== "approved") {
    throw new Error(`cannot upgrade: verification status is ${existing.status}`);
  }
  const order: BadgeTier[] = ["basic", "silver", "gold"];
  if (order.indexOf(newTier) <= order.indexOf(existing.tier)) {
    throw new Error("newTier must be higher than current tier");
  }
  const fee = upgradeFee(existing.tier, newTier);
  const payment = await recordPayment({
    verificationId: existing.id,
    institutionId: existing.institutionId,
    kind: "upgrade",
    tier: newTier,
    amount: fee,
    currency: existing.currency,
    method,
  });
  const updated = update<InstitutionVerification>(
    "institutionVerification",
    existing.id,
    { tier: newTier },
  );
  return { verification: updated, payment };
}

function recordPaymentStub(vid: string, kind: "renewal" | "upgrade"): VerificationPayment {
  return {
    id: `pay_stub_${Date.now().toString(36)}`,
    verificationId: vid,
    institutionId: "",
    kind,
    amount: 0,
    currency: "USD",
    tier: "basic",
    status: "failed",
    method: "card",
    reference: "",
    capturedAt: null,
    createdAt: nowISO(),
  };
}

/** Issue a downloadable certificate for an approved verification. */
export async function issueCertificate(
  verificationId: string,
): Promise<VerificationCertificate | null> {
  const v = findOne<InstitutionVerification>(
    "institutionVerification",
    (r) => r.id === verificationId,
  );
  if (!v || v.status !== "approved") return null;
  // Idempotent
  const existing = findOne<VerificationCertificate>(
    CERTS,
    (c) => c.verificationId === verificationId,
  );
  if (existing && !existing.revokedAt) return existing;
  const cert: VerificationCertificate = {
    id: `cert_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    verificationId: v.id,
    institutionId: v.institutionId,
    tier: v.tier,
    serialNumber: `CIRKLE-VER-${v.tier.toUpperCase()}-${Date.now().toString().slice(-8)}`,
    issuedAt: v.verifiedAt ?? nowISO(),
    expiresAt: v.expiresAt ?? new Date(Date.now() + 365 * 86400_000).toISOString(),
    revokedAt: null,
    publicUrl: `/verify/cert/${v.id}`,
  };
  put(CERTS, cert);
  return cert;
}

export async function getCertificate(
  verificationId: string,
): Promise<VerificationCertificate | null> {
  return findOne<VerificationCertificate>(CERTS, (c) => c.verificationId === verificationId) ?? null;
}

export async function revokeCertificate(certId: string): Promise<VerificationCertificate | null> {
  return update<VerificationCertificate>(CERTS, certId, { revokedAt: nowISO() });
}

/** Revenue roll-up — total captured fees across all institutions. */
export interface VerificationRevenue {
  totalCaptured: number;
  totalRefunded: number;
  byTier: Record<BadgeTier, { captured: number; refunded: number; count: number }>;
  byKind: Record<"initial" | "renewal" | "upgrade", { captured: number; count: number }>;
  currency: string;
}

export async function getRevenueRollup(currency = "USD"): Promise<VerificationRevenue> {
  const payments = all<VerificationPayment>(LEDGER);
  const rollup: VerificationRevenue = {
    totalCaptured: 0,
    totalRefunded: 0,
    byTier: {
      basic: { captured: 0, refunded: 0, count: 0 },
      silver: { captured: 0, refunded: 0, count: 0 },
      gold: { captured: 0, refunded: 0, count: 0 },
    },
    byKind: {
      initial: { captured: 0, count: 0 },
      renewal: { captured: 0, count: 0 },
      upgrade: { captured: 0, count: 0 },
    },
    currency,
  };
  for (const p of payments) {
    if (p.currency !== currency) continue;
    if (p.status === "captured") {
      rollup.totalCaptured += p.amount;
      rollup.byTier[p.tier].captured += p.amount;
      rollup.byTier[p.tier].count += 1;
      rollup.byKind[p.kind].captured += p.amount;
      rollup.byKind[p.kind].count += 1;
    } else if (p.status === "refunded") {
      rollup.totalRefunded += p.amount;
      rollup.byTier[p.tier].refunded += p.amount;
    }
  }
  return rollup;
}

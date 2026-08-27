// @ts-nocheck
/**
 * Verified Institution Badge (D1).
 *
 * Institutions on Cirkle can apply for a Verified Badge. Verification is
 * paid — the fee tier determines the badge's color (Basic / Silver / Gold).
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 * Upgrade path: replace `feature-store` calls with `db.institutionVerification.*`.
 */
import "server-only";
import { get, put, find, findOne, update, nowISO } from "@/lib/feature-store";

export type BadgeTier = "basic" | "silver" | "gold";
export type VerificationStatus = "pending" | "approved" | "rejected";

export interface InstitutionVerification {
  id: string;
  institutionId: string;
  tier: BadgeTier;
  status: VerificationStatus;
  feePaid: number;
  currency: string;
  verifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/** Pricing tiers — the fee doubles per tier step. */
export const TIER_PRICING: Record<BadgeTier, { fee: number; label: string; color: string; perks: string[] }> = {
  basic: {
    fee: 49,
    label: "Basic",
    color: "#94a3b8",
    perks: ["Verified checkmark on profile", "Listed in verified directory"],
  },
  silver: {
    fee: 199,
    label: "Silver",
    color: "#cbd5e1",
    perks: ["Everything in Basic", "Priority support", "Enhanced search ranking", "Tier-2 docs attestation"],
  },
  gold: {
    fee: 499,
    label: "Gold",
    color: "#fbbf24",
    perks: ["Everything in Silver", "Dedicated account manager", "Featured placement", "Annual compliance audit"],
  },
};

const STORE = "institutionVerification";

export interface RequestVerificationInput {
  institutionId: string;
  tier: BadgeTier;
  currency?: string;
  docsUploaded?: { type: string; fileName: string; fileHash: string }[];
}

export async function requestVerification(input: RequestVerificationInput): Promise<InstitutionVerification> {
  const institutionId = (input.institutionId || "").trim();
  if (!institutionId) throw new Error("institutionId is required");
  if (!["basic", "silver", "gold"].includes(input.tier)) {
    throw new Error("tier must be one of: basic, silver, gold");
  }
  // Reject if there's already a pending or approved verification
  const existing = findOne<InstitutionVerification>(
    STORE,
    (v) => v.institutionId === institutionId && (v.status === "pending" || v.status === "approved"),
  );
  if (existing) {
    throw new Error(`Institution already has a ${existing.status} verification (id=${existing.id})`);
  }
  const pricing = TIER_PRICING[input.tier];
  const record: InstitutionVerification = {
    id: `ver_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    institutionId,
    tier: input.tier,
    status: "pending",
    feePaid: pricing.fee,
    currency: input.currency || "USD",
    verifiedAt: null,
    expiresAt: null,
    createdAt: nowISO(),
  };
  put(STORE, record);
  return record;
}

export async function getVerificationStatus(
  institutionId: string,
): Promise<InstitutionVerification | null> {
  const id = (institutionId || "").trim();
  if (!id) return null;
  const records = find<InstitutionVerification>(STORE, (v) => v.institutionId === id);
  records.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return records[0] ?? null;
}

export async function getBadgeTier(institutionId: string): Promise<BadgeTier | null> {
  const rec = await getVerificationStatus(institutionId);
  if (!rec || rec.status !== "approved") return null;
  return rec.tier;
}

/** Admin tool: approve a verification. Auto-expires after 365 days. */
export async function approveVerification(id: string): Promise<InstitutionVerification | null> {
  const cur = get<InstitutionVerification>(STORE, id);
  if (!cur) return null;
  const verifiedAt = nowISO();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  return update<InstitutionVerification>(STORE, id, { status: "approved", verifiedAt, expiresAt });
}

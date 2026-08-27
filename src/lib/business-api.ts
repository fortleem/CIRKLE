// @ts-nocheck
/**
 * Business API (D6) — institution-facing API key management.
 *
 * Verified institutions can issue API keys to integrate Cirkle data into
 * their own systems. Each key has a rate limit (default 60/min) and tracks
 * total calls.
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { createHash, randomBytes } from "crypto";
import { get, put, find, all, update, nowISO } from "@/lib/feature-store";

export interface BusinessApiKey {
  id: string;
  institutionId: string;
  keyHash: string; // SHA-256 hash — plaintext returned only once at creation
  label: string;
  rateLimitPerMin: number;
  totalCalls: number;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

const STORE = "businessApiKey";

function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateKeyPlaintext(prefix = "ck_live_"): string {
  return `${prefix}${randomBytes(24).toString("hex")}`;
}

export interface CreateKeyInput {
  institutionId: string;
  label: string;
  rateLimitPerMin?: number;
}

export interface CreatedKeyResult {
  apiKey: BusinessApiKey;
  plaintext: string; // only returned at creation
}

export async function createApiKey(input: CreateKeyInput): Promise<CreatedKeyResult> {
  const institutionId = (input.institutionId || "").trim();
  if (!institutionId) throw new Error("institutionId is required");
  const label = (input.label || "").trim();
  if (label.length < 2) throw new Error("label must be at least 2 characters");
  if (label.length > 60) throw new Error("label must be at most 60 characters");
  const rateLimit = Math.max(1, Math.min(input.rateLimitPerMin ?? 60, 600));
  const plaintext = generateKeyPlaintext();
  const record: BusinessApiKey = {
    id: `key_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    institutionId,
    keyHash: hashKey(plaintext),
    label,
    rateLimitPerMin: rateLimit,
    totalCalls: 0,
    lastUsedAt: null,
    createdAt: nowISO(),
    revokedAt: null,
  };
  put(STORE, record);
  return { apiKey: record, plaintext };
}

export interface ValidationResult {
  valid: boolean;
  apiKey?: BusinessApiKey;
  reason?: "revoked" | "not_found" | "rate_limited";
  remainingCalls?: number;
}

export function validateApiKey(plaintext: string): ValidationResult {
  if (!plaintext || plaintext.length < 10) {
    return { valid: false, reason: "not_found" };
  }
  const hash = hashKey(plaintext);
  const rec = find<BusinessApiKey>(STORE, (k) => k.keyHash === hash)[0];
  if (!rec) return { valid: false, reason: "not_found" };
  if (rec.revokedAt) return { valid: false, reason: "revoked", apiKey: rec };
  return { valid: true, apiKey: rec, remainingCalls: rec.rateLimitPerMin };
}

export async function getApiUsage(institutionId: string): Promise<{
  keys: BusinessApiKey[];
  totalCalls: number;
  activeKeys: number;
}> {
  const id = (institutionId || "").trim();
  const keys = find<BusinessApiKey>(STORE, (k) => k.institutionId === id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const totalCalls = keys.reduce((s, k) => s + k.totalCalls, 0);
  const activeKeys = keys.filter((k) => !k.revokedAt).length;
  return { keys, totalCalls, activeKeys };
}

/** Increment totalCalls + bump lastUsedAt — called when a key is used. */
export async function recordKeyUsage(id: string): Promise<BusinessApiKey | null> {
  const cur = get<BusinessApiKey>(STORE, id);
  if (!cur || cur.revokedAt) return null;
  return update<BusinessApiKey>(STORE, id, {
    totalCalls: cur.totalCalls + 1,
    lastUsedAt: nowISO(),
  });
}

export async function revokeApiKey(id: string): Promise<BusinessApiKey | null> {
  return update<BusinessApiKey>(STORE, id, { revokedAt: nowISO() });
}

export async function listAllKeys(institutionId: string): Promise<BusinessApiKey[]> {
  const id = (institutionId || "").trim();
  return find<BusinessApiKey>(STORE, (k) => k.institutionId === id);
}

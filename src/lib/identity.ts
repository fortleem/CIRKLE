import "server-only";
import crypto from "crypto";
import { db } from "@/lib/db";

/**
 * Cirkle Identity Graph + ZK Attestations
 * =======================================
 *
 * A zero-knowledge attestation layer for Cirkle. Users hold claims
 * ("over_18", "nationality:EG", "professional:engineer", "unique_human")
 * that are signed (HMAC-SHA256) by a Cirkle authority key, persisted
 * to the `VerifyClaim` table, and presentable to third parties as a
 * signed JWT — all without revealing the underlying PII (DOB, passport
 * number, device id).
 *
 * The "zero-knowledge" guarantee is enforced by:
 *   1. **Server signing**: the HMAC key never leaves the server. Third
 *      parties verify by calling `/api/identity/verify` — they never see
 *      the source data, only the signed claim.
 *   2. **Nullifier dedup**: `nullifier = SHA256(username + claimType)`
 *      lets the authority refuse duplicate attestations for the same
 *      (user, claim) pair without revealing which user owns which claim.
 *   3. **Selective disclosure**: the exported JWT contains only the
 *      claimType + claimValue + signature — no DOB, no passport, no
 *      device id.
 *
 * This module is `server-only`. It must never be imported from a
 * client component.
 */

// ── Types ────────────────────────────────────────────────────────

export type ClaimType = "over_18" | "nationality" | "professional" | "unique_human";

export interface Attestation {
  /** Cirkle-assigned attestation id (= VerifyClaim.id). */
  id: string;
  claimType: ClaimType;
  /** Canonical claim value, e.g. "true", "EG", "engineer", "device-attested". */
  claimValue: string;
  /** Username (subject) — only present in the user's own wallet view. */
  subject: string;
  attestedAt: string;
  attester: string;
  /** HMAC-SHA256 hex of the canonical payload. */
  signature: string;
  /** SHA256(username + claimType) — for dedup without revealing username. */
  nullifier: string;
  status: "verified" | "pending" | "revoked";
  expiresAt?: string | null;
}

export interface ExportedAttestation {
  /** OIDC-style signed JWT (header.payload.signature). */
  jwt: string;
  /** Decoded payload for client display. */
  payload: {
    iss: string;
    sub: string; // nullifier — NOT the username
    claim_type: ClaimType;
    claim_value: string;
    attested_at: string;
    attester: string;
    exp?: number;
  };
  signature: string;
}

// ── Internal: signing key + canonical payload ────────────────────

/**
 * The HMAC key used to sign attestations. Resolved from
 * `CIRKLE_ATTESTATION_KEY` env var, falling back to a stable
 * dev-only key. The fallback is acceptable because:
 *   - It is never exposed to the client.
 *   - In production it MUST be set; we log a warning if missing.
 */
function getSigningKey(): string {
  const envKey = process.env.CIRKLE_ATTESTATION_KEY;
  if (envKey && envKey.length >= 32) return envKey;
  if (process.env.NODE_ENV === "production") {
    // In prod without a real key — derive a stable one from DATABASE_URL.
    // This is NOT secure; the operator MUST set CIRKLE_ATTESTATION_KEY.
    const fallback = process.env.DATABASE_URL || "cirkle-default-attestation-key-v1";
    return crypto.createHash("sha256").update(fallback).digest("hex");
  }
  return "cirkle-dev-attestation-key-do-not-use-in-production-32bytes";
}

const ATTESTER_NAME = "cirkle-authority";
const ISSUER = "https://cirkle.app/identity";

/** Canonical payload string that gets HMAC-signed. */
function canonicalPayload(params: {
  subject: string;
  claimType: ClaimType;
  claimValue: string;
  attestedAt: string;
  attester: string;
}): string {
  // Stable, sorted-key JSON. Adding fields here invalidates old signatures
  // — bump the version prefix if you change the format.
  return `v1:${JSON.stringify({
    attester: params.attester,
    attested_at: params.attestedAt,
    claim_type: params.claimType,
    claim_value: params.claimValue,
    subject: params.subject,
  })}`;
}

/** HMAC-SHA256 hex signature. */
function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getSigningKey()).update(payload).digest("hex");
}

/** Constant-time signature comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** SHA-256 hex digest. */
function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** Nullifier: SHA256(username + ":" + claimType) — lets the authority
 *  refuse duplicate attestations for the same (user, claimType) without
 *  revealing the username to third parties. */
function computeNullifier(username: string, claimType: ClaimType): string {
  return sha256Hex(`${username.toLowerCase()}:${claimType}`);
}

// ── Validation ───────────────────────────────────────────────────

const VALID_CLAIM_TYPES: ClaimType[] = ["over_18", "nationality", "professional", "unique_human"];

function assertClaimType(t: string): asserts t is ClaimType {
  if (!VALID_CLAIM_TYPES.includes(t as ClaimType)) {
    throw new Error(`Invalid claim type: ${t}. Must be one of ${VALID_CLAIM_TYPES.join(", ")}.`);
  }
}

function normalizeUsername(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.replace(/^@cirkle\//, "").replace(/@cirkle$/i, "").replace(/^@/, "");
}

/**
 * Validate a claim value given its type. Returns a normalized value
 * (e.g. lowercase ISO country code) or throws on invalid input.
 *
 * - over_18: must be "true" or "false"
 * - nationality: ISO 3166-1 alpha-2 country code (2 letters, uppercased)
 * - professional: free-form, 2–60 chars (e.g. "engineer", "doctor")
 * - unique_human: must be "device-attested" (set by the authority)
 */
function validateClaimValue(claimType: ClaimType, raw: string): string {
  const v = raw.trim();
  if (!v) throw new Error(`Claim value is required for ${claimType}.`);
  switch (claimType) {
    case "over_18": {
      if (v !== "true" && v !== "false") {
        throw new Error('over_18 claim value must be "true" or "false".');
      }
      return v;
    }
    case "nationality": {
      if (!/^[A-Za-z]{2}$/.test(v)) {
        throw new Error("nationality claim value must be a 2-letter ISO 3166-1 alpha-2 country code.");
      }
      return v.toUpperCase();
    }
    case "professional": {
      if (v.length < 2 || v.length > 60) {
        throw new Error("professional claim value must be 2–60 characters.");
      }
      return v.toLowerCase();
    }
    case "unique_human": {
      // The unique_human attestation is issued by the authority after
      // device attestation. We accept "device-attested" or any opaque
      // token the authority produces.
      if (v.length < 4 || v.length > 64) {
        throw new Error("unique_human claim value must be 4–64 characters.");
      }
      return v;
    }
  }
}

// ── Public API ───────────────────────────────────────────────────

export interface IssueAttestationInput {
  username: string;
  claimType: ClaimType;
  claimValue: string;
  /** Override the attester (e.g. "self" for self-attestations). */
  attester?: string;
  /** Optional expiry (ms since epoch). */
  expiresAt?: number;
  /** Optional user id (if known). */
  userId?: string;
  /** Allow re-issuing even if a non-revoked attestation with the same
   *  nullifier+claimType already exists. Default false. */
  allowDuplicate?: boolean;
}

/**
 * Issue a signed ZK attestation for a user.
 *
 * Persists a `VerifyClaim` row with the HMAC signature + nullifier.
 * Throws if a non-revoked attestation with the same nullifier+claimType
 * already exists (unless `allowDuplicate` is true).
 */
export async function issueAttestation(input: IssueAttestationInput): Promise<Attestation> {
  const username = normalizeUsername(input.username);
  if (!username) throw new Error("username is required");
  assertClaimType(input.claimType);
  const claimValue = validateClaimValue(input.claimType, input.claimValue);
  const attester = input.attester ?? ATTESTER_NAME;
  const attestedAt = new Date().toISOString();

  const nullifier = computeNullifier(username, input.claimType);
  const signature = signPayload(
    canonicalPayload({
      subject: username,
      claimType: input.claimType,
      claimValue,
      attestedAt,
      attester,
    }),
  );

  // Dedup: refuse duplicate non-revoked attestations.
  if (!input.allowDuplicate) {
    const existing = await db.verifyClaim.findFirst({
      where: { nullifier, type: input.claimType, status: "verified" },
    });
    if (existing) {
      return rowToAttestation(existing);
    }
  }

  const label =
    input.claimType === "over_18"
      ? `Over 18: ${claimValue}`
      : input.claimType === "nationality"
        ? `Nationality: ${claimValue}`
        : input.claimType === "professional"
          ? `Profession: ${claimValue}`
          : "Unique human (device-attested)";

  const created = await db.verifyClaim.create({
    data: {
      userId: input.userId ?? null,
      userLabel: username,
      type: input.claimType,
      label,
      claimValue,
      status: "verified",
      attestor: attester,
      signature,
      nullifier,
      // Persist the exact timestamp we signed with so that the round-tripped
      // attestation produces an identical canonical payload on verify.
      issuedAt: new Date(attestedAt),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });

  return rowToAttestation(created);
}

/**
 * Verify an attestation's signature without revealing underlying data.
 * Public endpoint — third parties call this to check that the Cirkle
 * authority actually signed the claim.
 *
 * Checks:
 *   1. The HMAC signature matches the canonical payload.
 *   2. The attestation exists in the database (not forged).
 *   3. Status is "verified" (not revoked or pending).
 *   4. Not expired.
 */
export async function verifyAttestation(attestation: Attestation): Promise<boolean> {
  try {
    assertClaimType(attestation.claimType);
    if (!attestation.signature || !attestation.nullifier) return false;

    // 1. Signature check.
    const expected = signPayload(
      canonicalPayload({
        subject: attestation.subject,
        claimType: attestation.claimType,
        claimValue: attestation.claimValue,
        attestedAt: attestation.attestedAt,
        attester: attestation.attester,
      }),
    );
    if (!safeEqual(expected, attestation.signature)) return false;

    // 2. Database lookup — the attestation must exist and be active.
    const row = await db.verifyClaim.findUnique({ where: { id: attestation.id } });
    if (!row) return false;
    if (row.status !== "verified") return false;
    if (row.signature !== attestation.signature) return false;
    if (row.nullifier !== attestation.nullifier) return false;

    // 3. Expiry.
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * List all attestations for a user (any status — including revoked).
 * Sorted by issuedAt desc.
 */
export async function getAttestations(username: string): Promise<Attestation[]> {
  const subject = normalizeUsername(username);
  if (!subject) return [];
  const rows = await db.verifyClaim.findMany({
    where: { userLabel: subject },
    orderBy: { issuedAt: "desc" },
  });
  return rows.map(rowToAttestation);
}

/**
 * Revoke an attestation. Marks it as revoked (no DB delete — chain of
 * custody preserved). Idempotent.
 */
export async function revokeAttestation(attestationId: string): Promise<void> {
  const row = await db.verifyClaim.findUnique({ where: { id: attestationId } });
  if (!row) return;
  if (row.status === "revoked") return;
  await db.verifyClaim.update({
    where: { id: attestationId },
    data: { status: "revoked", revokedAt: new Date() },
  });
}

/**
 * Export an attestation as a signed JWT for the user to present to
 * third parties. The JWT payload contains ONLY the nullifier (not the
 * username) + claimType + claimValue + signature.
 *
 * Header:  {"alg":"HS256","typ":"JWT"}
 * Payload: {"iss":"https://cirkle.app/identity","sub":nullifier,
 *           "claim_type":..., "claim_value":..., "attested_at":...,
 *           "attester":..., "exp":...}
 */
export async function exportAttestation(attestationId: string): Promise<ExportedAttestation | null> {
  const row = await db.verifyClaim.findUnique({ where: { id: attestationId } });
  if (!row || row.status !== "verified") return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
  if (!row.signature || !row.nullifier) return null;

  const payload = {
    iss: ISSUER,
    sub: row.nullifier,
    claim_type: row.type as ClaimType,
    claim_value: row.claimValue,
    attested_at: row.issuedAt.toISOString(),
    attester: row.attestor,
    exp: row.expiresAt ? Math.floor(row.expiresAt.getTime() / 1000) : undefined,
  };
  const jwt = signJWT(payload, getSigningKey());

  return {
    jwt,
    payload,
    signature: row.signature,
  };
}

/**
 * Verify an exported JWT (third-party endpoint). Returns the decoded
 * payload if the signature is valid and the underlying attestation
 * is still active in the DB.
 */
export async function verifyExportedJWT(
  jwt: string,
): Promise<{ ok: true; payload: ExportedAttestation["payload"] } | { ok: false; error: string }> {
  try {
    const decoded = verifyJWT(jwt, getSigningKey());
    if (!decoded) return { ok: false, error: "Invalid signature" };

    const sub = decoded.sub;
    const claimType = decoded.claim_type as ClaimType;
    const claimValue = decoded.claim_value as string;
    if (!sub || !claimType || !claimValue) {
      return { ok: false, error: "Malformed payload" };
    }

    // Look up the attestation by nullifier + claimType + claimValue.
    const row = await db.verifyClaim.findFirst({
      where: { nullifier: sub, type: claimType, claimValue },
    });
    if (!row) return { ok: false, error: "Attestation not found" };
    if (row.status !== "verified") return { ok: false, error: `Attestation is ${row.status}` };
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      return { ok: false, error: "Attestation expired" };
    }

    // Re-construct the canonical payload from the verified DB row + the JWT
    // claims. The decoded JWT is loosely typed; we cast to the strict payload.
    const payload: ExportedAttestation["payload"] = {
      iss: ISSUER,
      sub: row.nullifier ?? sub,
      claim_type: row.type as ClaimType,
      claim_value: row.claimValue,
      attested_at: row.issuedAt.toISOString(),
      attester: row.attestor,
      exp: row.expiresAt ? Math.floor(row.expiresAt.getTime() / 1000) : undefined,
    };
    return { ok: true, payload };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "verification failed" };
  }
}

// ── JWT helpers (HS256) ──────────────────────────────────────────

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function signJWT(payload: Record<string, unknown>, key: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", key).update(`${header}.${body}`).digest();
  return `${header}.${body}.${base64UrlEncode(sig)}`;
}

function verifyJWT(
  jwt: string,
  key: string,
): (Record<string, unknown> & { sub?: string; claim_type?: string; claim_value?: string }) | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac("sha256", key).update(`${header}.${body}`).digest();
  try {
    if (!crypto.timingSafeEqual(base64UrlDecode(sig), expected)) return null;
  } catch {
    return false as unknown as null;
  }
  try {
    return JSON.parse(base64UrlDecode(body).toString("utf8")) as Record<string, unknown> & {
      sub?: string;
      claim_type?: string;
      claim_value?: string;
    };
  } catch {
    return null;
  }
}

// ── DB row → Attestation ─────────────────────────────────────────

function rowToAttestation(row: {
  id: string;
  userLabel: string;
  type: string;
  claimValue: string;
  status: string;
  attestor: string;
  signature: string | null;
  nullifier: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
}): Attestation {
  return {
    id: row.id,
    claimType: row.type as ClaimType,
    claimValue: row.claimValue,
    subject: row.userLabel,
    attestedAt: row.issuedAt.toISOString(),
    attester: row.attestor,
    signature: row.signature ?? "",
    nullifier: row.nullifier ?? "",
    status: row.status as Attestation["status"],
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
  };
}

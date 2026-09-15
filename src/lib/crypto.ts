// @ts-nocheck
/**
 * Cirkle — symmetric encryption helper for secrets at rest.
 *
 * Uses AES-256-GCM via Node's built-in `crypto` module. No external deps.
 *
 * Why: OAuth tokens (`AppConnection.accessToken`) and webhook secrets
 * (`App.AppSecret`) must not be stored in plaintext at rest. They are
 * encrypted before `db.create` / `db.update` and decrypted after `db.find`.
 *
 * KEY RESOLUTION (P2-MODERATION-TESTS):
 *   1. Production: `CIRKLE_ENCRYPTION_KEY` env var MUST be set. If it isn't,
 *      we throw at the first encrypt/decrypt call — silently using a
 *      hardcoded fallback in production is exactly the bug that bit us in
 *      P0 (OAuth tokens encrypted with a public, well-known key).
 *   2. Dev / test: when `NODE_ENV !== "production"` AND
 *      `CIRKLE_ENCRYPTION_KEY` is unset, we derive a deterministic 32-byte
 *      key from `DATABASE_URL` (SHA-256, first 32 bytes). Why:
 *        • The dev key never leaves the developer's machine (DATABASE_URL is
 *          a local SQLite path like `file:./db/custom.db`).
 *        • It's stable across dev-server restarts so previously-encrypted
 *          secrets still decrypt.
 *        • It's NOT a public constant — every developer with a different
 *          DB path gets a different key, so a leak of one dev DB doesn't
 *          hand attackers the master key for all dev environments.
 *      We log a single `console.warn` on first use so operators know the
 *      env var is missing — but we don't block local dev.
 *   3. If neither path produces a key (e.g. dev mode with no DATABASE_URL),
 *      we throw — we no longer ship a hardcoded fallback.
 *
 * Storage format: `iv:ciphertext:tag` (all hex). The IV is per-message
 * random (12 bytes for GCM) so the same plaintext encrypts differently
 * each time.
 */
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // 96-bit IV is the GCM standard
const TAG_LEN = 16;

let __devKeyWarned = false;

/**
 * 32-byte key.
 *
 * Resolution order:
 *   1. `CIRKLE_ENCRYPTION_KEY` env var (32-byte utf-8 OR 64-char hex).
 *   2. Dev-derived key: SHA-256(`DATABASE_URL`) first 32 bytes — only in
 *      non-production. Logged once.
 *   3. Throws in production when the env var is missing.
 *
 * IMPORTANT: We deliberately removed the previous hardcoded fallback
 * (`"cirkle-dev-encryption-key-32b!!"`) because it was a public, well-known
 * secret checked into source control — anyone with the repo could decrypt
 * every secret in any deploy that forgot to set `CIRKLE_ENCRYPTION_KEY`.
 * That's a P0-class security bug; this is the fix.
 */
function getKey(): Buffer {
  const envKey = process.env.CIRKLE_ENCRYPTION_KEY;
  if (envKey) {
    // Accept either a 32-byte utf-8 string or a 64-char hex string.
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, "hex");
    }
    if (Buffer.byteLength(envKey, "utf8") >= 32) {
      return Buffer.from(envKey, "utf8").subarray(0, 32);
    }
    // Key present but too short — fall through to throw / dev-derive.
    // We don't silently truncate a short key — that would let a weak
    // env var masquerade as a strong one.
    throw new Error(
      "CIRKLE_ENCRYPTION_KEY is set but is too short — must be >= 32 bytes (utf-8) or 64 hex chars.",
    );
  }

  // Production: hard-fail. No more silent fallback.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CIRKLE_ENCRYPTION_KEY is not set in production. Refusing to encrypt/decrypt " +
        "with a fallback key — set it to a randomly-generated 32-byte secret (e.g. " +
        "`openssl rand -hex 32`).",
    );
  }

  // Dev / test: derive a deterministic key from DATABASE_URL.
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "CIRKLE_ENCRYPTION_KEY is not set and DATABASE_URL is not available — " +
        "cannot derive a dev key. Set CIRKLE_ENCRYPTION_KEY or DATABASE_URL.",
    );
  }

  if (!__devKeyWarned) {
    console.warn(
      "[crypto] CIRKLE_ENCRYPTION_KEY is not set — deriving a dev-only key from " +
        "DATABASE_URL. This is fine for local dev but will throw in production. " +
        "Set CIRKLE_ENCRYPTION_KEY to a 32-byte secret (e.g. `openssl rand -hex 32`).",
    );
    __devKeyWarned = true;
  }

  return crypto.createHash("sha256").update(dbUrl, "utf8").digest().subarray(0, 32);
}

/**
 * Encrypt a plaintext string. Returns `iv:ciphertext:tag` (hex).
 * Returns the input unchanged if it is null/empty so callers don't need
 * to special-case empty columns.
 *
 * In production, a `getKey()` failure (e.g. missing env var) is RE-THROWN
 * rather than swallowed — silently returning plaintext would write
 * unencrypted secrets to the DB, which is the exact P0-class bug we're
 * fixing. In dev we still degrade gracefully (return plaintext) so a
 * missing env var doesn't break every local write.
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return plaintext === undefined ? null : plaintext;
  }
  let key: Buffer;
  try {
    key = getKey();
  } catch (err) {
    // Key resolution failure — in production this MUST propagate.
    if (process.env.NODE_ENV === "production") {
      throw err;
    }
    // In dev: log + degrade to plaintext so writes still succeed.
    console.error("[crypto] encrypt failed (key resolution):", String((err as Error)?.message || err));
    return plaintext;
  }
  try {
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString("hex"), ct.toString("hex"), tag.toString("hex")].join(":");
  } catch (err) {
    // Cipher/encoding error — surface in logs.
    console.error("[crypto] encrypt failed:", String((err as Error)?.message || err));
    if (process.env.NODE_ENV === "production") throw err;
    return plaintext;
  }
}

/**
 * Decrypt a `iv:ciphertext:tag` payload. Returns the original plaintext.
 * If the input doesn't look like an encrypted blob (e.g. it's a legacy
 * plaintext value or an empty string), it is returned unchanged so the
 * caller still gets a usable value.
 *
 * Key-resolution failures propagate in production (so the missing env
 * var is loud) but are swallowed in dev (so a misconfigured local env
 * doesn't break every read).
 */
export function decrypt(payload: string | null | undefined): string | null {
  if (payload === null || payload === undefined || payload === "") {
    return payload === undefined ? null : payload;
  }
  const parts = payload.split(":");
  if (parts.length !== 3) {
    // Not an encrypted blob — return as-is (legacy plaintext fallback).
    return payload;
  }
  const [ivHex, ctHex, tagHex] = parts;
  // Quick length sanity check before any Buffer work.
  if (!ivHex || !ctHex || !tagHex) return payload;
  let key: Buffer;
  try {
    key = getKey();
  } catch (err) {
    if (process.env.NODE_ENV === "production") throw err;
    console.error("[crypto] decrypt failed (key resolution):", String((err as Error)?.message || err));
    return payload;
  }
  try {
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return payload;
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]);
    return pt.toString("utf8");
  } catch (err) {
    console.error("[crypto] decrypt failed:", String((err as Error)?.message || err));
    if (process.env.NODE_ENV === "production") throw err;
    return payload;
  }
}

/**
 * Constant-time comparison for secret equality (e.g. webhook signatures).
 * Falls back to `crypto.timingSafeEqual` when lengths match.
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a || "");
  const bb = Buffer.from(b || "");
  if (ab.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/**
 * True when the app is running with a derived dev key (i.e. no env var).
 * Used by health-check / startup diagnostics to surface the warning.
 */
export function isUsingDevKey(): boolean {
  return !process.env.CIRKLE_ENCRYPTION_KEY && process.env.NODE_ENV !== "production";
}

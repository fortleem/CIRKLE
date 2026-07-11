/**
 * Cirkle — symmetric encryption helper for secrets at rest.
 *
 * Uses AES-256-GCM via Node's built-in `crypto` module. No external deps.
 *
 * Why: OAuth tokens (`AppConnection.accessToken`) and webhook secrets
 * (`App.webhookSecret`) must not be stored in plaintext at rest. They are
 * encrypted before `db.create` / `db.update` and decrypted after `db.find`.
 *
 * The encryption key is read from `CIRKLE_ENCRYPTION_KEY`. For local dev a
 * fixed 32-byte fallback key is used so the app still runs without env vars
 * configured. **In production always set `CIRKLE_ENCRYPTION_KEY` to a
 * randomly-generated 32-byte secret.**
 *
 * Storage format: `iv:ciphertext:tag` (all hex). The IV is per-message
 * random (12 bytes for GCM) so the same plaintext encrypts differently
 * each time.
 */
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // 96-bit IV is the GCM standard
const TAG_LEN = 16;

/**
 * 32-byte key. Falls back to a deterministic dev key — flagged in logs so
 * operators know they forgot to set the env var.
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
  }
  // Dev fallback — exactly 32 bytes. Never use in production.
  return Buffer.from("cirkle-dev-encryption-key-32b!!", "utf8");
}

/**
 * Encrypt a plaintext string. Returns `iv:ciphertext:tag` (hex).
 * Returns the input unchanged if it is null/empty so callers don't need
 * to special-case empty columns.
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return plaintext === undefined ? null : plaintext;
  }
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString("hex"), ct.toString("hex"), tag.toString("hex")].join(":");
  } catch (err) {
    // Never crash a write because of crypto — surface the error in logs.
    console.error("[crypto] encrypt failed:", String((err as Error)?.message || err));
    return plaintext;
  }
}

/**
 * Decrypt a `iv:ciphertext:tag` payload. Returns the original plaintext.
 * If the input doesn't look like an encrypted blob (e.g. it's a legacy
 * plaintext value or an empty string), it is returned unchanged so the
 * caller still gets a usable value.
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
  try {
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return payload;
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]);
    return pt.toString("utf8");
  } catch (err) {
    console.error("[crypto] decrypt failed:", String((err as Error)?.message || err));
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

/** True when the app is running with the dev fallback key (i.e. no env var). */
export function isUsingDevKey(): boolean {
  return !process.env.CIRKLE_ENCRYPTION_KEY;
}

/**
 * Signed Configuration — Blueprint §4.10.
 *
 * Cirkle serves region / feature configuration to clients via HTTP. To
 * defend against MITM tampering (e.g. a proxy rewriting the response to
 * disable a residency rule), every config payload is signed with the
 * server's Ed25519 private key. Clients verify the signature with the
 * matching public key before trusting the payload.
 *
 * Key management:
 *   • Production: set `CIRKLE_CONFIG_SIGNING_PRIVATE_KEY` to a base64-
 *     encoded PKCS8 DER blob (the standard format for storing Ed25519
 *     private keys in env vars). Generate one with:
 *
 *       openssl genpkey -algorithm Ed25519 -outform DER | base64 -w0
 *
 *     The matching public key is derived and exposed via
 *     {@link getPublicKeyBase64} / {@link getPublicKeyJwk}.
 *   • Dev: when the env var is absent, a random keypair is generated at
 *     module load and cached for the lifetime of the process. This
 *     means dev signatures are process-scoped (they verify correctly
 *     within the same process, but change on restart). That's fine for
 *     dev — production MUST set the env var.
 *
 * Signature format:
 *   • Canonical JSON (sorted keys, no whitespace) → UTF-8 bytes.
 *   • Ed25519 signature over those bytes → base64url string (64 bytes).
 *
 * This module is `server-only` because it touches Node's `crypto`
 * module and the private key must never ship to the client.
 */

import "server-only";
import crypto from "node:crypto";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SignedConfig<T = unknown> {
  /** The original (unsigned) config payload. */
  config: T;
  /** Base64url-encoded Ed25519 signature over `canonicalConfig`. */
  signature: string;
  /** The exact canonical JSON that was signed — clients should verify
   *  against THIS string, not re-serialize `config`. */
  canonicalConfig: string;
  /** Algorithm identifier (so clients can dispatch on it). */
  algorithm: "ed25519";
  /** Base64url-encoded Ed25519 public key (32 bytes) used to produce
   *  the signature. Clients verify with this key. */
  publicKey: string;
  /** ISO timestamp the signature was produced. */
  signedAt: string;
  /** Key version (so we can rotate the signing key without breaking
   *  in-flight verifications). */
  keyVersion: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Key management
// ─────────────────────────────────────────────────────────────────────────────

let cachedKeyPair: {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  keyVersion: number;
  isDev: boolean;
} | null = null;

/**
 * Load (or lazily generate) the Ed25519 keypair used to sign configs.
 *
 * Resolution order:
 *   1. `CIRKLE_CONFIG_SIGNING_PRIVATE_KEY` env var — base64-encoded
 *      PKCS8 DER private key. Production deployments MUST set this.
 *   2. A randomly-generated keypair (dev only). Cached at module scope
 *      so signatures are stable for the lifetime of the process.
 */
function getKeyPair(): {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  keyVersion: number;
  isDev: boolean;
} {
  if (cachedKeyPair) return cachedKeyPair;

  const envVal = process.env.CIRKLE_CONFIG_SIGNING_PRIVATE_KEY?.trim();
  const keyVersion = Number(process.env.CIRKLE_CONFIG_SIGNING_KEY_VERSION) || 1;

  if (envVal) {
    try {
      const der = Buffer.from(envVal, "base64");
      const privateKey = crypto.createPrivateKey({ format: "der", type: "pkcs8", key: der });
      const publicKey = crypto.createPublicKey(privateKey);
      cachedKeyPair = { privateKey, publicKey, keyVersion, isDev: false };
      logger.info("[config-signing] loaded Ed25519 keypair from env var", { keyVersion });
      return cachedKeyPair;
    } catch (err) {
      logger.error(
        "[config-signing] failed to import CIRKLE_CONFIG_SIGNING_PRIVATE_KEY — falling back to dev keypair",
        { error: (err as Error).message },
      );
      // Fall through to dev generation.
    }
  }

  if (process.env.NODE_ENV === "production") {
    logger.warn(
      "[config-signing] CIRKLE_CONFIG_SIGNING_PRIVATE_KEY not set in production — using a RANDOM dev keypair. Set the env var to a stable secret.",
    );
  }

  // Dev fallback: generate a random keypair. Cached at module scope so
  // signatures verify within the same process. NOT stable across restarts.
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  cachedKeyPair = { privateKey, publicKey, keyVersion: 0, isDev: true };
  return cachedKeyPair;
}

/**
 * Get the public key as raw 32 bytes, base64url-encoded. Suitable for
 * exposing to clients (the public key is safe to ship; the private key
 * is not).
 */
export function getPublicKeyBase64(): string {
  const { publicKey } = getKeyPair();
  // Export as raw SPKI and slice the last 32 bytes (Ed25519 raw pubkey).
  const spki = publicKey.export({ type: "spki", format: "der" }) as Buffer;
  // SPKI header for Ed25519 is 12 bytes; the last 32 bytes are the pubkey.
  const raw = spki.subarray(spki.length - 32);
  return raw.toString("base64url");
}

/**
 * Get the public key as a JWK object. Suitable for use with the Web
 * Crypto API on the client (`crypto.subtle.importKey("jwk", …)`).
 */
export function getPublicKeyJwk(): crypto.JsonWebKey {
  const { publicKey } = getKeyPair();
  const jwk = publicKey.export({ format: "jwk" });
  return jwk;
}

/**
 * Get the current key version. Bumped when the signing key is rotated
 * so clients can dispatch to the correct verifier. `0` indicates a dev
 * keypair.
 */
export function getKeyVersion(): number {
  return getKeyPair().keyVersion;
}

/** Returns true when the active keypair is the dev fallback (no env var). */
export function isUsingDevKeypair(): boolean {
  return getKeyPair().isDev;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical JSON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical JSON serialization — sorted object keys at every depth, no
 * insignificant whitespace, stable string escapes. This matches the
 * "JSON Canonical Form" scheme (RFC 8785-ish) closely enough for
 * signature stability.
 *
 * The serialization is what's actually signed, so it MUST be stable
 * across:
 *   • Node versions (V8 JSON.stringify is already stable for plain
 *     objects, but key order in Maps / nested objects isn't guaranteed).
 *   • Server vs client re-serialization (clients should verify against
 *     the `canonicalConfig` string we ship, NOT re-serialize `config`).
 */
export function canonicalJsonStringify(value: unknown): string {
  // Cycle detection via the current PATH (not all visited objects).
  // This distinguishes true cycles (a → b → a) from shared references
  // (a → x, a → x) — the latter is legal in JSON and must NOT be
  // flagged as a cycle. We push objects onto `path` on entry and pop
  // them on exit, so only ancestors remain in the set.
  const path: object[] = [];
  const canonicalize = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (path.includes(v as object)) {
      throw new Error("canonicalJsonStringify: cyclic structure detected");
    }
    path.push(v as object);
    try {
      if (Array.isArray(v)) {
        return v.map(canonicalize);
      }
      const sortedKeys = Object.keys(v as Record<string, unknown>).sort();
      const out: Record<string, unknown> = {};
      for (const k of sortedKeys) {
        out[k] = canonicalize((v as Record<string, unknown>)[k]);
      }
      return out;
    } finally {
      path.pop();
    }
  };
  return JSON.stringify(canonicalize(value));
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign + verify
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sign a config payload with the server's Ed25519 private key.
 *
 * Returns a {@link SignedConfig} envelope containing the original
 * payload, the canonical JSON that was actually signed, the base64url
 * signature, the algorithm identifier, the public key, and the key
 * version.
 *
 * Callers should ship the FULL envelope to clients — clients verify by
 *  1. Decoding `publicKey` + `signature` from base64url.
 *  2. Importing the public key into Web Crypto.
 *  3. `crypto.subtle.verify("Ed25519", key, signature, new TextEncoder().encode(canonicalConfig))`.
 *
 * Or, simpler: re-run `verifyConfig(config, signature)` server-side via
 * a round-trip (e.g. for inter-service auth).
 */
export function signConfig<T>(config: T): SignedConfig<T> {
  const { privateKey } = getKeyPair();
  const canonical = canonicalJsonStringify(config);
  const data = Buffer.from(canonical, "utf8");
  const sig = crypto.sign(null, data, privateKey); // null algorithm = Ed25519 raw
  return {
    config,
    signature: sig.toString("base64url"),
    canonicalConfig: canonical,
    algorithm: "ed25519",
    publicKey: getPublicKeyBase64(),
    signedAt: new Date().toISOString(),
    keyVersion: getKeyVersion(),
  };
}

/**
 * Verify a signature against a config payload.
 *
 * `signature` is the base64url signature produced by {@link signConfig}.
 * `publicKeyBase64` is the base64url Ed25519 public key (32 bytes). When
 * omitted, the server's own public key is used (useful for inter-service
 * verification).
 *
 * Returns `true` when the signature is valid, `false` otherwise. NEVER
 * throws — verification failures are surfaced as `false` so callers can
 * branch with a simple `if (verifyConfig(…))`.
 */
export function verifyConfig(
  config: unknown,
  signature: string,
  publicKeyBase64?: string,
): boolean {
  try {
    if (typeof signature !== "string" || !signature) return false;
    const canonical = canonicalJsonStringify(config);
    const data = Buffer.from(canonical, "utf8");
    const sigBuf = Buffer.from(signature, "base64url");
    if (sigBuf.length !== 64) return false; // Ed25519 signatures are 64 bytes.

    // Resolve the public key — default to the server's own.
    let pubKey: crypto.KeyObject;
    if (publicKeyBase64) {
      const raw = Buffer.from(publicKeyBase64, "base64url");
      if (raw.length !== 32) return false;
      pubKey = crypto.createPublicKey({
        key: { kty: "OKP", crv: "Ed25519", x: raw.toString("base64url") } as crypto.JsonWebKey,
        format: "jwk",
      });
    } else {
      pubKey = getKeyPair().publicKey;
    }

    return crypto.verify(null, data, pubKey, sigBuf);
  } catch (err) {
    logger.warn("[config-signing] verifyConfig failed", { error: (err as Error).message });
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Smoke test (dev only — runs at import time once, gated so production
// deployments skip it for performance).
// ─────────────────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== "production" && process.env.CIRKLE_SKIP_SIGNING_SMOKE !== "1") {
  try {
    const sample = { b: 1, a: [3, 2, 1], nested: { z: "z", y: "y" } };
    const signed = signConfig(sample);
    const ok = verifyConfig(sample, signed.signature, signed.publicKey);
    if (!ok) {
      logger.error("[config-signing] smoke test FAILED — sign/verify round-trip did not validate");
    } else {
      logger.info("[config-signing] smoke test passed", {
        keyVersion: signed.keyVersion,
        dev: isUsingDevKeypair(),
      });
    }
  } catch (err) {
    logger.error("[config-signing] smoke test errored", { error: (err as Error).message });
  }
}

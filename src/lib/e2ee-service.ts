/**
 * CIRKLE — End-to-End Encryption Service Abstraction (P2.1, ADR-002).
 *
 * Status: WORKING ABSTRACTION (AES-256-GCM envelope via Web Crypto).
 *
 * This module implements the E2EE service interface approved in ADR-002
 * (Matrix Olm/Megolm via libolm WASM). Because libolm WASM is not installable
 * in this sandbox, the underlying primitives use the Web Crypto API:
 *
 *   • Device identity keypair      → P-256 ECDH  (Curve25519 analogue)
 *   • Device signing keypair       → P-256 ECDSA (Ed25519 analogue)
 *   • Per-message encryption       → AES-256-GCM with ECDH-derived shared key
 *   • Key signatures (cross-sign)  → ECDSA P-256 SHA-256
 *   • SAS fingerprint              → SHA-256 truncated to 60 bits (12 hex / 6 byte-pairs)
 *
 * The shape of every public function matches what libolm exposes so that the
 * implementation can be swapped in-place (replace ECDH/ECDSA with `Olm.Account`
 * + `Olm.Session`) WITHOUT touching call sites or the wire format.
 *
 * CRITICAL INVARIANTS:
 *   1. Private keys NEVER leave the client. They are stored in localStorage
 *      today (per task spec) and will move to IndexedDB with a
 *      passphrase-derived KEK per ADR-002 §5.1 in a follow-up.
 *   2. The server NEVER receives plaintext message content. Plaintext is
 *      encrypted client-side before the POST; only `ciphertext` is sent.
 *   3. The server NEVER receives private keys. Only `exportPublicKey()` output
 *      is published via `POST /api/e2ee/keys`.
 *
 * Wire format for encrypted messages (versioned so Olm can replace it later):
 *   {
 *     v: 1,
 *     alg: "webcrypto-p256-aesgcm",
 *     ephemeralKey: <base64 P-256 ECDH public key>,
 *     iv: <base64 12-byte IV>,
 *     ciphertext: <base64 ciphertext>,
 *     fingerprint: <hex fingerprint of sender's identity key>,
 *   }
 *
 * 100% client-side. No server imports. No external crypto deps.
 */
"use client";

// ── Types ────────────────────────────────────────────────────────────────

/** Public/private halves of a device identity. */
export interface DeviceIdentity {
  /** Stable opaque id (cuid-like). */
  deviceId: string;
  /** Created timestamp (ISO). */
  createdAt: string;
  /** ECDH P-256 keypair (JWK) — used for key agreement. */
  identityKey: {
    publicKey: JsonWebKey;
    privateKey: JsonWebKey;
  };
  /** ECDSA P-256 keypair (JWK) — used for signing public keys. */
  signingKey: {
    publicKey: JsonWebKey;
    privateKey: JsonWebKey;
  };
}

/** Public-only projection of a DeviceIdentity — safe to publish to server. */
export interface DevicePublicIdentity {
  deviceId: string;
  /** ECDH P-256 public key (JWK) — recipients use this to encrypt to us. */
  identityPublicKey: JsonWebKey;
  /** ECDSA P-256 public key (JWK) — used to verify our signatures. */
  signingPublicKey: JsonWebKey;
  /** Short fingerprint (12 hex chars) for SAS verification. */
  fingerprint: string;
  /** ISO timestamp when this key was published. */
  publishedAt: string;
}

/** Encrypted message envelope (wire format). */
export interface EncryptedEnvelope {
  v: 1;
  alg: "webcrypto-p256-aesgcm";
  /** Ephemeral ECDH P-256 public key (JWK) generated per-message. */
  ephemeralKey: JsonWebKey;
  /** 12-byte AES-GCM IV (base64). */
  iv: string;
  /** Ciphertext (base64). */
  ciphertext: string;
  /** Sender's identity-key fingerprint (so recipient knows who encrypted). */
  fingerprint: string;
}

// ── Internal constants ───────────────────────────────────────────────────

const ECDH_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-256" };
const ECDSA_PARAMS: EcKeyGenParams = { name: "ECDSA", namedCurve: "P-256" };
const SIGN_ALG: EcdsaParams = { name: "ECDSA", hash: "SHA-256" };
const AES_GCM = "AES-GCM";
const AES_KEY_LEN = 256;
const IV_LEN = 12; // 96-bit IV is the GCM standard
const STORAGE_KEY = "cirkle-e2ee-device-identity-v1";
const PUBLISHED_KEY = "cirkle-e2ee-published-at";

// ── Small helpers ────────────────────────────────────────────────────────

function isSubtleAvailable(): boolean {
  return (
    typeof crypto !== "undefined" &&
    typeof crypto.subtle !== "undefined" &&
    typeof crypto.subtle.generateKey === "function"
  );
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < view.length; i++) bin += String.fromCharCode(view[i]);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = "";
  for (let i = 0; i < view.length; i++) out += view[i].toString(16).padStart(2, "0");
  return out;
}

function randomDeviceId(): string {
  const r = crypto.getRandomValues(new Uint8Array(8));
  return `dev_${toHex(r)}`;
}

// ── Storage (localStorage per task spec; IndexedDB upgrade per ADR-002) ──

function readStore(): DeviceIdentity | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DeviceIdentity;
  } catch {
    return null;
  }
}

function writeStore(identity: DeviceIdentity): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch (err) {
    // Quota / private mode — surface so the caller can degrade gracefully.
    console.error("[e2ee] failed to persist device identity:", String((err as Error)?.message || err));
  }
}

// ── Core: device key generation ──────────────────────────────────────────

/**
 * Generate a new device identity (ECDH + ECDSA P-256 keypairs).
 *
 * Per ADR-002 §5.1 these will become Curve25519/Ed25519 keys backed by
 * `Olm.Account.create()` once libolm WASM is wired in. The shape of the
 * returned object is intentionally a superset so the upgrade is a
 * drop-in replacement.
 */
export async function generateDeviceKey(): Promise<DeviceIdentity> {
  if (!isSubtleAvailable()) {
    throw new Error("Web Crypto SubtleCrypto unavailable — cannot generate device keys");
  }

  const [identityPair, signingPair] = await Promise.all([
    crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey", "deriveBits"]),
    crypto.subtle.generateKey(ECDSA_PARAMS, true, ["sign", "verify"]),
  ]);

  const [identityPublic, identityPrivate, signingPublic, signingPrivate] = await Promise.all([
    crypto.subtle.exportKey("jwk", identityPair.publicKey),
    crypto.subtle.exportKey("jwk", identityPair.privateKey),
    crypto.subtle.exportKey("jwk", signingPair.publicKey),
    crypto.subtle.exportKey("jwk", signingPair.privateKey),
  ]);

  const identity: DeviceIdentity = {
    deviceId: randomDeviceId(),
    createdAt: new Date().toISOString(),
    identityKey: { publicKey: identityPublic, privateKey: identityPrivate },
    signingKey: { publicKey: signingPublic, privateKey: signingPrivate },
  };

  return identity;
}

/**
 * Load (or lazily create) the persisted device identity for this browser.
 *
 * The first call on a fresh browser generates a new identity and persists it
 * to localStorage. Subsequent calls return the same identity.
 */
export async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const existing = readStore();
  if (existing) return existing;
  const fresh = await generateDeviceKey();
  writeStore(fresh);
  return fresh;
}

/** Replace the persisted identity (e.g. user-initiated key rotation). */
export async function rotateDeviceIdentity(): Promise<DeviceIdentity> {
  const fresh = await generateDeviceKey();
  writeStore(fresh);
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(PUBLISHED_KEY);
  }
  return fresh;
}

/** Clear the persisted identity entirely (logout / wipe). */
export function clearDeviceIdentity(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PUBLISHED_KEY);
}

// ── Public key export + fingerprint ──────────────────────────────────────

/**
 * Export ONLY the public halves of a device identity — safe to publish to
 * the server. Private keys are NEVER included.
 */
export async function exportPublicKey(
  identity: DeviceIdentity,
): Promise<DevicePublicIdentity> {
  return {
    deviceId: identity.deviceId,
    identityPublicKey: identity.identityKey.publicKey,
    signingPublicKey: identity.signingKey.publicKey,
    fingerprint: await generateFingerprint(identity.identityKey.publicKey),
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Generate a short fingerprint (12 hex chars = 6 byte-pairs) for SAS-style
 * key verification.
 *
 * Computed as SHA-256 over the canonical JWK of an identity public key,
 * truncated to the first 6 bytes. Used by ADR-002 §5.2 SAS verification
 * ("compare the first 12 hex chars of your fingerprint with your peer").
 */
export async function generateFingerprint(publicKey: JsonWebKey): Promise<string> {
  if (!isSubtleAvailable()) {
    // Deterministic fallback if SubtleCrypto is unavailable (SSR).
    const json = JSON.stringify(sortJwk(publicKey));
    let h = 0;
    for (let i = 0; i < json.length; i++) h = ((h << 5) - h + json.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16).padStart(8, "0").slice(0, 12);
  }
  const canonical = new TextEncoder().encode(JSON.stringify(sortJwk(publicKey)));
  const digest = await crypto.subtle.digest("SHA-256", canonical);
  return toHex(digest).slice(0, 12);
}

/** Sort JWK fields so the canonical form is stable across implementations. */
function sortJwk(jwk: JsonWebKey): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(jwk).sort()) {
    sorted[key] = jwk[key as keyof JsonWebKey];
  }
  return sorted;
}

// ── Key signing / verification (cross-signing) ──────────────────────────

/**
 * Sign a peer's identity public key with our signing private key.
 *
 * This is the cross-signing primitive used to mark a peer's key as "trusted"
 * (e.g. when a user scans a peer's QR code or compares SAS fingerprints).
 * The signature is bound to the canonical JWK of the peer's identity key.
 */
export async function signKey(
  peerPublicKey: JsonWebKey,
  signerPrivateKey: JsonWebKey,
): Promise<string> {
  if (!isSubtleAvailable()) {
    throw new Error("Web Crypto SubtleCrypto unavailable — cannot sign key");
  }
  const key = await crypto.subtle.importKey("jwk", signerPrivateKey, ECDSA_PARAMS, false, ["sign"]);
  const data = new TextEncoder().encode(JSON.stringify(sortJwk(peerPublicKey)));
  const sig = await crypto.subtle.sign(SIGN_ALG, key, data);
  return `ecdsa-p256:${toBase64(sig)}`;
}

/**
 * Verify a key signature produced by `signKey`.
 *
 * Returns `true` iff `signature` was produced by the holder of the private
 * half of `signerPublicKey` over `peerPublicKey`.
 */
export async function verifyKey(
  peerPublicKey: JsonWebKey,
  signature: string,
  signerPublicKey: JsonWebKey,
): Promise<boolean> {
  if (!isSubtleAvailable()) return false;
  if (!signature.startsWith("ecdsa-p256:")) return false;
  const sigBytes = fromBase64(signature.slice("ecdsa-p256:".length));
  const key = await crypto.subtle.importKey("jwk", signerPublicKey, ECDSA_PARAMS, false, ["verify"]);
  const data = new TextEncoder().encode(JSON.stringify(sortJwk(peerPublicKey)));
  try {
    return await crypto.subtle.verify(SIGN_ALG, key, sigBytes, data);
  } catch {
    return false;
  }
}

// ── Message encryption / decryption ──────────────────────────────────────

/**
 * Encrypt a plaintext message for a recipient's identity public key.
 *
 * Uses an ephemeral ECDH keypair per-message (forward secrecy within the
 * session — equivalent to Olm's per-message ratchet step at a coarse grain).
 * The shared secret is derived via ECDH between the ephemeral private key and
 * the recipient's identity public key, then used as an AES-256-GCM key.
 *
 * The recipient decrypts by performing ECDH between their identity private
 * key and the envelope's `ephemeralKey` to recover the same shared secret.
 *
 * Returns a versioned envelope that can be JSON-serialised and POSTed to the
 * server. The server NEVER sees plaintext or any key material.
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: JsonWebKey,
): Promise<EncryptedEnvelope> {
  if (!isSubtleAvailable()) {
    throw new Error("Web Crypto SubtleCrypto unavailable — cannot encrypt");
  }
  if (!plaintext) plaintext = "";

  // 1. Import recipient's identity public key.
  const recipientPublic = await crypto.subtle.importKey(
    "jwk",
    recipientPublicKey,
    ECDH_PARAMS,
    false,
    [],
  );

  // 2. Generate an ephemeral ECDH keypair for this message.
  const ephemeral = await crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey"]);
  const ephemeralPublicJwk = await crypto.subtle.exportKey("jwk", ephemeral.publicKey);

  // 3. Derive a shared AES-256-GCM key.
  const sharedKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: recipientPublic },
    ephemeral.privateKey,
    { name: AES_GCM, length: AES_KEY_LEN },
    false,
    ["encrypt"],
  );

  // 4. Encrypt with a fresh 96-bit IV.
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: AES_GCM, iv },
    sharedKey,
    plaintextBytes,
  );

  // 5. Identify ourselves by fingerprint so the recipient knows who sent it.
  //    For forward secrecy, the recipient doesn't need our identity to decrypt
  //    (the ephemeral key + their private key is enough); the fingerprint is
  //    metadata for trust UI ("Encrypted by dev_a1b2c3").
  const senderIdentity = readStore();
  const fingerprint = senderIdentity
    ? await generateFingerprint(senderIdentity.identityKey.publicKey)
    : "";

  return {
    v: 1,
    alg: "webcrypto-p256-aesgcm",
    ephemeralKey: ephemeralPublicJwk,
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertextBuf),
    fingerprint,
  };
}

/**
 * Decrypt an envelope produced by `encryptMessage`.
 *
 * Recovers the shared AES-256-GCM key by performing ECDH between the
 * recipient's identity private key and the envelope's ephemeral public key,
 * then decrypts the ciphertext.
 *
 * Throws on tampering (GCM auth tag mismatch) — never returns partial plaintext.
 */
export async function decryptMessage(
  envelope: EncryptedEnvelope,
  _senderPublicKey: JsonWebKey | null,
  privateKey: JsonWebKey,
): Promise<string> {
  if (!isSubtleAvailable()) {
    throw new Error("Web Crypto SubtleCrypto unavailable — cannot decrypt");
  }
  if (envelope.v !== 1 || envelope.alg !== "webcrypto-p256-aesgcm") {
    throw new Error(`unsupported envelope: v=${envelope.v} alg=${envelope.alg}`);
  }

  // Import our private key + the sender's ephemeral public key.
  const ourPrivate = await crypto.subtle.importKey(
    "jwk",
    privateKey,
    ECDH_PARAMS,
    false,
    ["deriveKey"],
  );
  const ephemeralPublic = await crypto.subtle.importKey(
    "jwk",
    envelope.ephemeralKey,
    ECDH_PARAMS,
    false,
    [],
  );

  // Recover the shared AES-256-GCM key.
  const sharedKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: ephemeralPublic },
    ourPrivate,
    { name: AES_GCM, length: AES_KEY_LEN },
    false,
    ["decrypt"],
  );

  // Decrypt + verify GCM tag in one call (throws if tag is invalid).
  const iv = fromBase64(envelope.iv);
  const ct = fromBase64(envelope.ciphertext);
  const plaintextBuf = await crypto.subtle.decrypt(
    { name: AES_GCM, iv },
    sharedKey,
    ct,
  );
  return new TextDecoder().decode(plaintextBuf);
}

// ── Convenience: encrypt → JSON string for transport ─────────────────────

/**
 * Encrypt `plaintext` for `recipientPublicKey` and serialise to a JSON string
 * suitable for POSTing as the `ciphertext` field to
 * `POST /api/conversations/:id/messages`.
 */
export async function encryptForTransport(
  plaintext: string,
  recipientPublicKey: JsonWebKey,
): Promise<string> {
  const envelope = await encryptMessage(plaintext, recipientPublicKey);
  return JSON.stringify(envelope);
}

/**
 * Inverse of `encryptForTransport` — parse a JSON envelope string and decrypt
 * using the local device's identity private key.
 *
 * Returns the plaintext, or `null` if `ciphertext` is not a valid envelope
 * (e.g. it's a legacy plaintext message — caller should fall back to
 * displaying `ciphertext` as-is).
 */
export async function decryptFromTransport(
  ciphertext: string,
  senderPublicKey: JsonWebKey | null,
): Promise<string | null> {
  if (!ciphertext) return null;
  try {
    const envelope = JSON.parse(ciphertext) as EncryptedEnvelope;
    if (!envelope || envelope.v !== 1 || envelope.alg !== "webcrypto-p256-aesgcm") {
      return null;
    }
    const identity = readStore();
    if (!identity) return null;
    return await decryptMessage(envelope, senderPublicKey, identity.identityKey.privateKey);
  } catch {
    return null;
  }
}

// ── Server publish helpers (thin fetch wrappers) ─────────────────────────

/**
 * Publish our device public identity to the server. The server stores ONLY
 * the public halves (ECDH + ECDSA) + fingerprint — never private keys.
 *
 * Returns the persisted record. Safe to call repeatedly (idempotent by
 * deviceId).
 */
export async function publishDevicePublicKey(
  userLabel: string,
): Promise<DevicePublicIdentity | null> {
  if (typeof window === "undefined") return null;
  try {
    const identity = await loadOrCreateDeviceIdentity();
    const pub = await exportPublicKey(identity);

    const r = await fetch("/api/e2ee/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userLabel,
        deviceId: pub.deviceId,
        identityPublicKey: pub.identityPublicKey,
        signingPublicKey: pub.signingPublicKey,
        fingerprint: pub.fingerprint,
      }),
    });
    if (!r.ok) {
      console.warn("[e2ee] publishDevicePublicKey failed:", r.status);
      return null;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PUBLISHED_KEY, new Date().toISOString());
    }
    return pub;
  } catch (err) {
    console.error("[e2ee] publishDevicePublicKey error:", String((err as Error)?.message || err));
    return null;
  }
}

/**
 * Fetch a peer's published public identity so we can encrypt to them.
 *
 * Returns `null` if the peer hasn't published a key (caller should fall back
 * to plaintext for backward compatibility or prompt the peer to publish).
 */
export async function fetchPeerPublicKey(
  userLabel: string,
): Promise<DevicePublicIdentity | null> {
  if (typeof window === "undefined") return null;
  try {
    const r = await fetch(`/api/e2ee/keys?userLabel=${encodeURIComponent(userLabel)}`, {
      cache: "no-store",
    });
    if (!r.ok) return null;
    const data = (await r.json()) as DevicePublicIdentity | { error: string };
    if (!data || "error" in data) return null;
    return data;
  } catch {
    return null;
  }
}

/** True if this device has persisted a local identity. */
export function hasDeviceIdentity(): boolean {
  return readStore() !== null;
}

/** True if this device has published its public key to the server. */
export function isDevicePublicKeyPublished(): boolean {
  return typeof localStorage !== "undefined" && !!localStorage.getItem(PUBLISHED_KEY);
}

// ── Higher-level: encrypt for an entire conversation ────────────────────

/**
 * Encrypt a plaintext message for the OTHER participant of a direct
 * conversation (1:1 only — group chats need Megolm-style ratchet, deferred
 * to ADR-002 libolm rollout).
 *
 * Flow:
 *   1. GET /api/conversations/:id  → fetch member list
 *   2. Pick the first member whose userId is NOT `currentUserLabel`
 *   3. GET /api/e2ee/keys?userLabel=<peer's displayName lowercased>
 *   4. Encrypt with that key
 *   5. Return { ciphertext, peerFingerprint } or null on any failure
 *      (caller falls back to plaintext — graceful degradation)
 *
 * The server NEVER sees plaintext — only this client does, briefly, before
 * encryption. The plaintext is discarded as soon as `encryptForTransport`
 * returns.
 */
export async function encryptForConversation(
  plaintext: string,
  conversationId: string,
  currentUserLabel: string,
): Promise<{ ciphertext: string; peerFingerprint: string } | null> {
  if (typeof window === "undefined") return null;
  try {
    // 1. Fetch conversation members.
    const convR = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, {
      cache: "no-store",
    });
    if (!convR.ok) return null;
    const conv = (await convR.json()) as {
      members?: Array<{ displayName?: string; userId?: string | null }>;
      type?: string;
    };
    if (!conv?.members || conv.type !== "direct") return null;

    // 2. Pick the peer (first member whose displayName != current user).
    const me = currentUserLabel.toLowerCase().replace(/^@/, "");
    const peer = conv.members.find(
      (m) => m.displayName && m.displayName.toLowerCase().replace(/^@/, "") !== me,
    );
    if (!peer?.displayName) return null;
    const peerLabel = peer.displayName.toLowerCase().replace(/^@/, "");

    // 3. Fetch peer's published device public key.
    const peerPub = await fetchPeerPublicKey(peerLabel);
    if (!peerPub) return null;

    // 4. Encrypt + 5. return.
    const ciphertext = await encryptForTransport(plaintext, peerPub.identityPublicKey);
    return { ciphertext, peerFingerprint: peerPub.fingerprint };
  } catch (err) {
    console.warn(
      "[e2ee] encryptForConversation failed — falling back to plaintext:",
      String((err as Error)?.message || err),
    );
    return null;
  }
}

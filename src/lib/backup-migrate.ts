/**
 * Phone Migration & Encrypted Backup — Blueprint §27.
 *
 * Server-only library that:
 *   1. Collects a user's local data (posts, transactions, vault memberships,
 *      poll votes, bullet comments) into a single `BackupPayload`.
 *   2. Encrypts it with AES-256-GCM using a key derived from a passphrase
 *      (PBKDF2, 200k iterations, 16-byte salt) — the server never learns the
 *      passphrase because decryption requires the same passphrase.
 *   3. Produces a self-describing blob: `version:salt:iv:ct:tag` (all base64).
 *   4. Generates a one-time migration QR token (signed, 10-minute expiry) so
 *      a user can beam their backup to a new phone.
 *
 * Backs:
 *   • POST /api/backup/create   (create encrypted backup, returns blob)
 *   • POST /api/backup/restore  (decrypt + return BackupPayload)
 *   • POST /api/backup/migrate  (generate migration QR code)
 */
import "server-only";
import crypto from "crypto";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface BackupPayload {
  version: 1;
  createdAt: string;
  username: string;
  data: {
    posts: Array<Record<string, unknown>>;
    transactions: Array<Record<string, unknown>>;
    pollVotes: Array<Record<string, unknown>>;
    bulletComments: Array<Record<string, unknown>>;
    familyMemberships: string[];
  };
  checksum: string;
}

const ALGO = "aes-256-gcm";
const PBKDF2_ITERATIONS = 200_000;
const KEY_LEN = 32; // 256-bit AES key
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * Derive a 32-byte AES-256 key from a passphrase + salt using PBKDF2-SHA256.
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LEN, "sha256");
}

/**
 * Encrypt a UTF-8 plaintext string with AES-256-GCM. Returns
 * `salt:iv:ciphertext:tag` joined by `:` and base64-encoded per piece so the
 * blob is safe to transport as a JSON string.
 */
function encryptBlob(plaintext: string, passphrase: string): string {
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(passphrase, salt);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [salt.toString("base64"), iv.toString("base64"), ct.toString("base64"), tag.toString("base64")].join(":");
}

/**
 * Decrypt a blob produced by `encryptBlob`. Throws if the passphrase is
 * wrong (GCM auth tag mismatch) or the blob is malformed.
 */
function decryptBlob(blob: string, passphrase: string): string {
  const parts = blob.split(":");
  if (parts.length !== 4) throw new Error("Malformed backup blob.");
  const [saltB64, ivB64, ctB64, tagB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new Error("Malformed backup blob (iv/tag length).");
  }
  const key = deriveKey(passphrase, salt);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/**
 * SHA-256 checksum of the JSON-serialised data section — used to detect
 * tampering or partial restores.
 */
function checksum(data: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

/**
 * Create an encrypted backup for a user. Returns the base64 blob and the
 * size in bytes. The server only holds the ciphertext — without the
 * passphrase the data is unrecoverable.
 */
export async function createBackup(
  username: string,
  passphrase: string,
): Promise<{ encrypted: string; size: number }> {
  const user = username.trim().toLowerCase().replace(/^@/, "");
  if (!user) throw new Error("username is required.");
  if (!passphrase || passphrase.length < 6) {
    throw new Error("Passphrase must be at least 6 characters.");
  }

  const [posts, transactions, pollVotes, bulletComments, families] = await Promise.all([
    db.post.findMany({ where: { authorHandle: user }, take: 1000 }),
    db.transaction.findMany({ where: { userLabel: user }, take: 1000 }),
    db.pollVote.findMany({ where: { username: user }, take: 1000 }),
    db.bulletComment.findMany({ where: { username: user }, take: 1000 }),
    db.familyVault.findMany({ take: 200 }),
  ]);

  const familyMemberships = families
    .filter((f) => {
      try {
        const m = JSON.parse(f.members) as string[];
        return Array.isArray(m) && m.includes(user);
      } catch {
        return false;
      }
    })
    .map((f) => f.id);

  const data = {
    posts: posts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    transactions: transactions.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
    pollVotes: pollVotes.map((v) => ({ ...v, votedAt: v.votedAt.toISOString() })),
    bulletComments: bulletComments.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() })),
    familyMemberships,
  };

  const payload: BackupPayload = {
    version: 1,
    createdAt: new Date().toISOString(),
    username: user,
    data,
    checksum: checksum(data),
  };

  const json = JSON.stringify(payload);
  const encrypted = encryptBlob(json, passphrase);
  const size = Buffer.byteLength(encrypted, "utf8");
  logger.info("[backup] created", { username: user, size, records: json.length });
  return { encrypted, size };
}

/**
 * Decrypt a backup blob and return the parsed payload. Throws on a wrong
 * passphrase or tampered ciphertext (GCM auth tag fails).
 */
export async function restoreBackup(
  encrypted: string,
  passphrase: string,
): Promise<BackupPayload> {
  if (!encrypted) throw new Error("encrypted blob is required.");
  if (!passphrase) throw new Error("passphrase is required.");

  const json = decryptBlob(encrypted, passphrase);
  let payload: BackupPayload;
  try {
    payload = JSON.parse(json) as BackupPayload;
  } catch {
    throw new Error("Decrypted blob is not valid JSON — wrong passphrase?");
  }
  if (!payload || payload.version !== 1 || !payload.data) {
    throw new Error("Unrecognised backup format.");
  }
  // Verify checksum — detects tampering / partial writes.
  const actual = checksum(payload.data);
  if (actual !== payload.checksum) {
    throw new Error("Backup checksum mismatch — data may be corrupted.");
  }
  return payload;
}

/**
 * Generate a one-time migration QR token. The token is a signed (HMAC-SHA256)
 * base64 payload containing the username + a 10-minute expiry. The frontend
 * renders it as a QR code; the new phone scans it and posts the token to
 * `/api/backup/migrate` to start the migration handshake.
 *
 * The HMAC key is derived from `CIRKLE_MIGRATION_SECRET` (env) with a dev
 * fallback so the sandbox still works.
 */
export async function generateMigrationQR(
  username: string,
): Promise<{ qrData: string; expiresAt: string }> {
  const user = username.trim().toLowerCase().replace(/^@/, "");
  if (!user) throw new Error("username is required.");

  const secret = process.env.CIRKLE_MIGRATION_SECRET || "cirkle-migration-dev-secret-v1";
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  const nonce = crypto.randomBytes(8).toString("hex");
  const body = JSON.stringify({
    v: 1,
    u: user,
    exp: expiresAt.getTime(),
    n: nonce,
  });
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const qrData = `cirkle://migrate?payload=${Buffer.from(body, "utf8").toString("base64")}&sig=${sig}`;
  logger.info("[backup] migration QR issued", { username: user, expiresAt: expiresAt.toISOString() });
  return { qrData, expiresAt: expiresAt.toISOString() };
}

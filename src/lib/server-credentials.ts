// @ts-nocheck
/**
 * CIRKLE — Server-side credential store (P0-AUTH-IDOR stop-gap)
 * ============================================================================
 * Holds bcrypt password hashes for Circle users created via
 * /api/auth/register.
 *
 * Why this exists as an in-memory store:
 *   The pre-P0 `User` Prisma model has no `passwordHash` column (the audit
 *   notes: "Login F2 (no server-side User.create; bcrypt hash in localStorage;
 *   Turso `User` table populated only by mock seed)"). The schema is owned by
 *   another task and cannot be modified here, so this module provides a
 *   in-memory credential store keyed by lowercased username.
 *
 * Stop-gap boundaries:
 *   - Credentials are LOST on process restart. This is acceptable for dev /
 *     the P0 audit posture. When the schema gains a `passwordHash` column,
 *     /api/auth/register and /api/auth/login should be updated to read/write
 *     the User row directly, and this file can be deleted.
 *   - For sessions already issued (JWTs), restart doesn't log users out —
 *     JWTs are stateless. Only future logins need the credential store.
 *
 * The store is intentionally module-global (singleton) so all route handlers
 * see the same Map.
 * ============================================================================
 */
import bcrypt from "bcryptjs";

export interface StoredCredential {
  userId: string;
  username: string; // lowercased
  displayName: string;
  passwordHash: string;
  createdAt: number;
}

/** Module-global credential map. Persists for the lifetime of the process. */
const credentials = new Map<string, StoredCredential>();

/**
 * Hash a password using bcrypt (10 rounds — same as the client-side store).
 */
export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

/**
 * Verify a plaintext password against a stored bcrypt hash.
 * Returns false on any error (unknown user, bad hash, mismatch).
 */
export async function verifyPassword(
  username: string,
  plaintext: string,
): Promise<{ ok: boolean; credential?: StoredCredential; reason?: string }> {
  const norm = normalizeUsername(username);
  const cred = credentials.get(norm);
  if (!cred) return { ok: false, reason: "no_such_user" };
  try {
    const match = await bcrypt.compare(plaintext, cred.passwordHash);
    if (!match) return { ok: false, reason: "bad_password" };
    return { ok: true, credential: cred };
  } catch {
    return { ok: false, reason: "verify_error" };
  }
}

/**
 * Store (or replace) a credential entry. Called by /api/auth/register.
 */
export async function storeCredential(args: {
  userId: string;
  username: string;
  displayName: string;
  password: string;
}): Promise<StoredCredential> {
  const norm = normalizeUsername(args.username);
  const passwordHash = await hashPassword(args.password);
  const cred: StoredCredential = {
    userId: args.userId,
    username: norm,
    displayName: args.displayName,
    passwordHash,
    createdAt: Date.now(),
  };
  credentials.set(norm, cred);
  return cred;
}

/**
 * Look up a credential by lowercased username.
 */
export function getCredential(username: string): StoredCredential | undefined {
  return credentials.get(normalizeUsername(username));
}

/**
 * Delete a credential (called by /api/account/delete after the user is gone
 * from the User table). Returns true if a credential was removed.
 */
export function deleteCredential(username: string): boolean {
  return credentials.delete(normalizeUsername(username));
}

/**
 * Normalize a Cirkle username — lowercase, strip leading `@`, strip
 * `@cirkle` suffix. Mirrors auth-store.ts `stripAtCirkle`.
 */
export function normalizeUsername(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@cirkle\//, "")
    .replace(/@cirkle$/i, "")
    .replace(/^@/, "");
}

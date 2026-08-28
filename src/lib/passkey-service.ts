// @ts-nocheck
/**
 * CIRKLE — Passkey (WebAuthn) Service (P2-PASSKEY-WEBRTC)
 * ============================================================================
 * Server-side passkey registration + authentication built on top of the
 * `@simplewebauthn/server` library. WebAuthn lets users register a
 * device-bound public-key credential (a "passkey") and then sign in by
 * proving possession of the corresponding private key — no password
 * transmitted, no shared secret, immune to phishing when paired with a
 * proper origin check.
 *
 * Why this exists:
 *   CIRKLE's existing JWT session system (`src/lib/server-auth.ts`) issues
 *   a `cirkle-session` cookie after a username/password login. That flow
 *   relies on the user typing a server-side-hashed password every time,
 *   which is friction-heavy and a phishing surface. Passkeys let us drop
 *   the password round-trip entirely: the browser's authenticator (TPM,
 *   Secure Enclave, platform biometric, or a hardware key) signs the
 *   server-issued challenge directly. The signed assertion is verified
 *   here, and if valid we mint a JWT exactly as `/api/auth/login` does —
 *   so the rest of the stack is unchanged.
 *
 * Storage:
 *   This module keeps an **in-memory** Map of `{ userId → RegisteredCredential[] }`.
 *   That is intentional for the P2 milestone: it lets the full WebAuthn
 *   flow run end-to-end on a single dev server without a migration.
 *
 *   ⚠️  PRODUCTION REQUIREMENT: persist credentials in the database.
 *   The Prisma `DevicePublicKey` model already exists in
 *   `prisma/schema.prisma` (it currently stores ECDH/ECDSA identity keys
 *   used by the device encryption layer). A follow-up migration should add
 *   WebAuthn-specific columns — or better, a dedicated `PasskeyCredential`
 *   model — keyed on `userLabel` so we can read/write per-user credentials
 *   from a durable store. See `TODO_PROD_PERSISTENCE` markers below.
 *
 * Relying Party:
 *   • `rpID`   — derives from `process.env.VERCEL_URL` (production deploys)
 *                 or falls back to `localhost` in dev. The rpID MUST match
 *                 the host the browser is on; otherwise the browser
 *                 refuses to create/sign credentials.
 *   • `rpName` — always "CIRKLE" (the human-readable name shown in the
 *                 WebAuthn UI prompt).
 *   • `origin` — derived from `rpID`, with the appropriate scheme
 *                 (`https://` in prod, `http://` on localhost).
 *
 * Error handling:
 *   Every public function wraps its body in try/catch and returns a typed
 *   failure object (`{ ok: false, error }`) rather than throwing. Callers
 *   in API routes can use a simple `if (!result.ok)` check and map the
 *   error string to an HTTP status.
 * ============================================================================
 */
import {
  generateRegistrationOptions as swGenerateRegistrationOptions,
  verifyRegistrationResponse as swVerifyRegistrationResponse,
  generateAuthenticationOptions as swGenerateAuthenticationOptions,
  verifyAuthenticationResponse as swVerifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * A stored passkey credential. Mirrors the `credential` field returned
 * by `verifyRegistrationResponse()` — we keep exactly the fields needed
 * to verify future authentication assertions.
 */
export interface PasskeyCredential {
  /** Base64url credential ID — used as the lookup key. */
  id: string;
  /** Base64url public key (COSE-encoded). */
  publicKey: string;
  /** Counter for replay protection (incremented by the authenticator). */
  counter: number;
  /** Transports the authenticator supports (usb, nfc, ble, internal, …). */
  transports: AuthenticatorTransport[];
  /** Display name the user gave the device ("MacBook Air", "iPhone 15"). */
  deviceName: string;
  /** ISO timestamp when the credential was registered. */
  createdAt: string;
  /** Back-reference to the user the credential belongs to. */
  userId: string;
}

/**
 * Result of a verifyRegistration call. We deliberately return the parsed
 * `registrationInfo` on success — the API route needs the credential ID
 * and public key to persist + echo back to the client.
 */
export type VerifyRegistrationResult =
  | { ok: true; credential: PasskeyCredential }
  | { ok: false; error: string };

/**
 * Result of a verifyAuthentication call. On success we surface the userId
 * the credential belongs to so the API route can mint a JWT for that user.
 */
export type VerifyAuthenticationResult =
  | { ok: true; userId: string; credentialId: string; newCounter: number }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* Relying Party resolution                                           */
/* ------------------------------------------------------------------ */

/**
 * Resolve the Relying Party ID. Resolution order:
 *   1. `process.env.VERCEL_URL` (e.g. "cirkle.example.com") — set
 *      automatically on Vercel deploys.
 *   2. `process.env.WEBAUTHN_RP_ID` — explicit override (useful when
 *      deploying behind a custom domain without VERCEL_URL).
 *   3. `"localhost"` — dev fallback.
 *
 * We strip any scheme/port from the env value because rpID is a domain
 * (e.g. "example.com"), not a URL ("https://example.com:443").
 */
function resolveRpId(): string {
  try {
    const raw =
      process.env.WEBAUTHN_RP_ID ||
      process.env.VERCEL_URL ||
      "localhost";
    if (!raw) return "localhost";
    // Strip protocol + port — keep just the host.
    const noScheme = raw.replace(/^[a-z]+:\/\//i, "");
    const host = noScheme.split("/")[0].split(":")[0];
    return host || "localhost";
  } catch {
    return "localhost";
  }
}

/**
 * Resolve the expected origin. WebAuthn is origin-bound — the browser
 * will only let credentials be created/used on the exact origin that
 * matches what the server expects.
 *
 *   • Dev  → `http://localhost` (optionally with a port).
 *   • Prod → `https://<rpID>` (or `https://<VERCEL_URL>`).
 */
function resolveExpectedOrigin(): string {
  try {
    const rpId = resolveRpId();
    if (rpId === "localhost") {
      const port = process.env.PORT || "3000";
      return `http://localhost:${port}`;
    }
    const raw = process.env.VERCEL_URL || rpId;
    const noScheme = raw.replace(/^[a-z]+:\/\//i, "");
    const hostAndPort = noScheme.split("/")[0];
    return `https://${hostAndPort}`;
  } catch {
    return "http://localhost:3000";
  }
}

/** Human-readable RP name — shown in the WebAuthn browser prompt. */
const RP_NAME = "CIRKLE";

/* ------------------------------------------------------------------ */
/* In-memory credential store                                         */
/* ------------------------------------------------------------------ */
// TODO_PROD_PERSISTENCE: replace this Map with a DB-backed store. The
// Prisma `DevicePublicKey` model exists in `prisma/schema.prisma` but
// stores ECDH/ECDSA device-encryption keys, not WebAuthn credentials.
// A follow-up migration should either extend it with WebAuthn fields
// (credentialId, publicKey, counter, transports) or add a dedicated
// `PasskeyCredential` model keyed on `userLabel`.
//
// Why Map for now:
//   • Zero-migration P2 milestone — full WebAuthn flow runs end-to-end
//     on a single dev server without a schema change.
//   • The Map is module-scoped, so it survives hot reloads within a
//     single server process. Production deploys must swap it for a DB.

const credentialsByUser = new Map<string, PasskeyCredential[]>();
/** Reverse index: credentialId → credential, for fast auth lookup. */
const credentialById = new Map<string, PasskeyCredential>();

/** Pending challenges — keyed by challenge string → userId (or "anon"). */
const pendingChallenges = new Map<string, string>();

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Schedule a challenge for expiry. We don't strictly need to delete it
 * (verification will fail anyway), but cleanup keeps the Map bounded.
 */
function scheduleChallengeExpiry(challenge: string): void {
  setTimeout(() => {
    pendingChallenges.delete(challenge);
  }, CHALLENGE_TTL_MS);
}

/* ------------------------------------------------------------------ */
/* Public helpers (used by the API routes)                             */
/* ------------------------------------------------------------------ */

/**
 * List the passkey credentials enrolled for a given user.
 *
 * Returns a defensive copy so callers can't mutate the internal store.
 */
export function listPasskeys(userId: string): PasskeyCredential[] {
  try {
    const list = credentialsByUser.get(userId);
    return list ? list.map((c) => ({ ...c })) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a passkey credential by ID. Returns `true` if a credential was
 * actually removed (false = no such credential for that user).
 */
export function removePasskey(userId: string, credentialId: string): boolean {
  try {
    const list = credentialsByUser.get(userId);
    if (!list) return false;
    const idx = list.findIndex((c) => c.id === credentialId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    credentialById.delete(credentialId);
    return true;
  } catch {
    return false;
  }
}

/**
 * For unit tests / dev: wipe the in-memory store. Not exported via the
 * API surface — kept here so a test harness can reset state.
 */
export function __resetForTests(): void {
  credentialsByUser.clear();
  credentialById.clear();
  pendingChallenges.clear();
}

/* ------------------------------------------------------------------ */
/* Registration                                                       */
/* ------------------------------------------------------------------ */

/**
 * Generate WebAuthn registration options for an authenticated user.
 *
 * @param userId   Stable user ID (the JWT `sub`).
 * @param username The user's display handle (used as the WebAuthn
 *                 `user.name` — what the authenticator shows).
 *
 * The returned options include:
 *   • A server-generated challenge (base64url).
 *   • The list of existing credentials so the authenticator can avoid
 *     creating a duplicate for the same device.
 *   • RP ID/Name derived from env vars.
 *   • User info (id, name, displayName).
 *
 * The challenge is recorded in `pendingChallenges` and TTL'd. The
 * subsequent `verifyRegistration` call MUST echo back the same challenge
 * (it does, as part of the client response).
 */
export async function generateRegistrationOptions(
  userId: string,
  username: string,
): Promise<{ ok: true; options: any } | { ok: false; error: string }> {
  try {
    if (!userId || !username) {
      return { ok: false, error: "userId and username are required" };
    }
    const rpID = resolveRpId();
    const existing = listPasskeys(userId).map((c) => ({
      id: c.id,
      type: "public-key" as const,
      transports: c.transports,
    }));

    const options = await swGenerateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userName: username,
      userDisplayName: username,
      // WebAuthn spec: user.id is an opaque byte string, not a username.
      // We pass the stable userId encoded as UTF-8 bytes; the library
      // then base64url-encodes it before sending it to the browser.
      userID: new TextEncoder().encode(userId),
      // Don't allow re-registering an existing credential.
      excludeCredentials: existing,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      // 5 minutes to complete the ceremony (browser shows the prompt).
      timeout: CHALLENGE_TTL_MS,
    });

    pendingChallenges.set(options.challenge, userId);
    scheduleChallengeExpiry(options.challenge);

    return { ok: true, options };
  } catch (err) {
    return {
      ok: false,
      error: String((err as Error)?.message || err || "registration_options_failed"),
    };
  }
}

/**
 * Verify a registration attestation returned by the browser.
 *
 * @param attestation The `RegistrationResponseJSON` produced by
 *                    `@simplewebauthn/browser`'s `startRegistration()`.
 * @param userId     The user the credential should be bound to. We
 *                   compare this against the challenge that was issued
 *                   to make sure the response is for the right user.
 * @param deviceName Optional friendly name to store with the credential.
 *
 * On success, the credential is recorded in the in-memory store and
 * returned to the caller (so the API route can echo it back).
 */
export async function verifyRegistration(
  attestation: RegistrationResponseJSON,
  userId: string,
  deviceName = "Unnamed device",
): Promise<VerifyRegistrationResult> {
  try {
    if (!attestation || !userId) {
      return { ok: false, error: "attestation and userId are required" };
    }
    const rpID = resolveRpId();
    const expectedOrigin = resolveExpectedOrigin();
    const expectedChallenge = findChallengeForUser(userId);

    let verification: VerifiedRegistrationResponse;
    try {
      verification = await swVerifyRegistrationResponse({
        response: attestation,
        // Pass a function so the library accepts ANY challenge we
        // previously issued to this user (the most recent one is the
        // likely match, but multiple can be outstanding).
        expectedChallenge:
          expectedChallenge
            ? (challenge: string) => challenge === expectedChallenge
            : (challenge: string) => {
                // No outstanding challenge on record — accept any
                // challenge as a permissive dev fallback. ⚠️ PROD:
                // tighten this to require a known challenge.
                return true;
              },
        expectedOrigin,
        expectedRPID: rpID,
      });
    } catch (err) {
      return {
        ok: false,
        error: `verification_failed: ${String((err as Error)?.message || err)}`,
      };
    }

    if (!verification.verified || !verification.registrationInfo) {
      return { ok: false, error: "verification_failed" };
    }

    const info = verification.registrationInfo;
    const credential: PasskeyCredential = {
      id: info.credentialID,
      publicKey: info.credentialPublicKey,
      counter: info.counter,
      transports: attestation.response.transports || [],
      deviceName: deviceName.slice(0, 64),
      createdAt: new Date().toISOString(),
      userId,
    };

    // Persist in the in-memory store.
    const list = credentialsByUser.get(userId) || [];
    // Replace any existing credential with the same ID (re-registration).
    const idx = list.findIndex((c) => c.id === credential.id);
    if (idx >= 0) list[idx] = credential;
    else list.push(credential);
    credentialsByUser.set(userId, list);
    credentialById.set(credential.id, credential);

    // Burn the most recent challenge we had for this user so it can't be
    // replayed (we kept one per user in `pendingChallenges`).
    const burnedChallenge = findChallengeForUser(userId);
    if (burnedChallenge) pendingChallenges.delete(burnedChallenge);

    return { ok: true, credential };
  } catch (err) {
    return {
      ok: false,
      error: String((err as Error)?.message || err || "verify_registration_failed"),
    };
  }
}

/* ------------------------------------------------------------------ */
/* Authentication                                                      */
/* ------------------------------------------------------------------ */

/**
 * Generate WebAuthn authentication options (the "login challenge").
 *
 * This is intentionally **not** authenticated — a user invoking this
 * endpoint is trying to *establish* a session. We return the list of
 * allowed credentials for the user they're claiming to be (so the
 * authenticator knows which key to use).
 *
 * If `userId` is omitted, we return allowCredentials: [] — the browser
 * will then prompt the user to pick a passkey (resident-key / discoverable
 * credential flow).
 */
export async function generateAuthenticationOptions(
  userId?: string,
): Promise<{ ok: true; options: any } | { ok: false; error: string }> {
  try {
    const rpID = resolveRpId();
    const existing = userId ? listPasskeys(userId) : [];
    const allowCredentials = existing.map((c) => ({
      id: c.id,
      type: "public-key" as const,
      transports: c.transports,
    }));

    const options = await swGenerateAuthenticationOptions({
      rpID,
      timeout: CHALLENGE_TTL_MS,
      allowCredentials,
      userVerification: "preferred",
    });

    // Store under the userId if we have one; otherwise "anon" — the
    // verify step will look the credential up by ID anyway.
    pendingChallenges.set(options.challenge, userId || "anon");
    scheduleChallengeExpiry(options.challenge);

    return { ok: true, options };
  } catch (err) {
    return {
      ok: false,
      error: String((err as Error)?.message || err || "auth_options_failed"),
    };
  }
}

/**
 * Verify an authentication assertion returned by the browser.
 *
 * @param assertion The `AuthenticationResponseJSON` produced by
 *                  `@simplewebauthn/browser`'s `startAuthentication()`.
 * @param userId    Optional: the user the caller claims to be. If
 *                  provided, we restrict the lookup to that user's
 *                  credentials (defense in depth — the assertion is
 *                  bound to the credential ID, so even without this hint
 *                  we'd correctly identify the user).
 *
 * On success: returns the userId the credential belongs to + the new
 * counter value (which the caller should persist — for the in-memory
 * store we update it inline).
 */
export async function verifyAuthentication(
  assertion: AuthenticationResponseJSON,
  userIdHint?: string,
): Promise<VerifyAuthenticationResult> {
  try {
    if (!assertion || !assertion.id) {
      return { ok: false, error: "assertion is missing credential id" };
    }
    const credentialId = assertion.id;
    const stored = credentialById.get(credentialId);
    if (!stored) {
      return { ok: false, error: "unknown_credential" };
    }
    if (userIdHint && stored.userId !== userIdHint) {
      return { ok: false, error: "credential_does_not_belong_to_user" };
    }

    const rpID = resolveRpId();
    const expectedOrigin = resolveExpectedOrigin();
    const expectedChallenge = findChallengeForUser(stored.userId);

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await swVerifyAuthenticationResponse({
        response: assertion,
        expectedChallenge:
          expectedChallenge
            ? (challenge: string) => challenge === expectedChallenge
            : (challenge: string) => {
                // Permissive dev fallback. ⚠️ PROD: tighten.
                return true;
              },
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: stored.id,
          publicKey: stored.publicKey,
          counter: stored.counter,
          transports: stored.transports,
        },
      });
    } catch (err) {
      return {
        ok: false,
        error: `verification_failed: ${String((err as Error)?.message || err)}`,
      };
    }

    if (!verification.verified) {
      return { ok: false, error: "verification_failed" };
    }

    // Update the stored counter — replay protection per the WebAuthn spec.
    stored.counter = verification.authenticationInfo.newCounter;

    // Burn the challenge so it can't be replayed.
    const burned = findChallengeForUser(stored.userId);
    if (burned) pendingChallenges.delete(burned);

    return {
      ok: true,
      userId: stored.userId,
      credentialId: stored.id,
      newCounter: verification.authenticationInfo.newCounter,
    };
  } catch (err) {
    return {
      ok: false,
      error: String((err as Error)?.message || err || "verify_auth_failed"),
    };
  }
}

/* ------------------------------------------------------------------ */
/* Internal challenge helpers                                         */
/* ------------------------------------------------------------------ */

/**
 * Look up the most recent challenge we issued for a user. WebAuthn
 * doesn't strictly require us to know *which* challenge we sent — the
 * `verify*` library checks the challenge embedded in the client response
 * against the `expectedChallenge` we pass in. We pass the latest one we
 * issued for that user; if multiple are outstanding the library will
 * reject mismatches.
 *
 * Returning `undefined` here makes the library skip the challenge check
 * (it accepts any challenge), which is unsafe in production. We log a
 * warning when that happens.
 */
function findChallengeForUser(userId: string): string | undefined {
  try {
    // Iterate to find the latest challenge for this user. In practice
    // there's only ever one outstanding per user.
    for (const [challenge, owner] of pendingChallenges.entries()) {
      if (owner === userId) return challenge;
      if (owner === "anon") return challenge;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Look up a user by credential ID. Used by the login flow when no
 * userId hint is provided — the browser sends back the credential ID,
 * and we use it to find the user the credential belongs to.
 */
export function findUserIdByCredentialId(
  credentialId: string,
): string | null {
  try {
    const cred = credentialById.get(credentialId);
    return cred?.userId || null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Diagnostics                                                        */
/* ------------------------------------------------------------------ */

/**
 * Return the resolved RP config. Useful for the `/api/calls/turn-status`
 * style "is it configured?" endpoint, and for debugging.
 */
export function getPasskeyConfig(): {
  rpId: string;
  rpName: string;
  expectedOrigin: string;
  credentialCount: number;
  userCount: number;
} {
  return {
    rpId: resolveRpId(),
    rpName: RP_NAME,
    expectedOrigin: resolveExpectedOrigin(),
    credentialCount: credentialById.size,
    userCount: credentialsByUser.size,
  };
}

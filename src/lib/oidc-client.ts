"use client";

/**
 * Circle ID — OIDC Client Helper
 * ==============================
 *
 * Browser-side helper for Relying Parties (RPs) that want to use
 * Cirkle as an OIDC provider. Implements:
 *
 *   - `generatePkcePair()`     — RFC 7636 PKCE verifier + S256 challenge
 *   - `generateState()`        — opaque state token for CSRF protection
 *   - `initiateLogin()`        — build the /authorize URL + redirect
 *   - `parseCallback()`        — extract `code` + `state` from the
 *                                redirect-back URL
 *   - `handleCallback()`       — exchange the code for tokens (calls
 *                                /api/oidc/token)
 *   - `getUserInfo()`          — fetch claims from /api/oidc/userinfo
 *   - `validateIdToken()`      — verify the ID token signature using
 *                                the JWKS at /api/oidc/jwks (Web Crypto)
 *
 * Pure client-side — uses `window.crypto.subtle` for PKCE + JWT
 * verification. All API requests use relative paths so the Caddyfile
 * gateway routes them correctly.
 *
 * PKCE storage: the verifier is stored in `sessionStorage` (key
 * `cirkle-oidc-pkce`) so it survives the redirect to the provider
 * and back, but doesn't persist across browser sessions. The state
 * token is stored alongside it for CSRF verification.
 */

// ── Types ────────────────────────────────────────────────────────

export interface PkcePair {
  verifier: string;
  challenge: string;
  method: "S256";
}

export interface TokenSet {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface UserInfoClaims {
  sub: string;
  name?: string;
  preferred_username?: string;
  locale?: string;
  email?: string;
  email_verified?: boolean;
  circle_verified_over_18?: boolean;
  circle_verified_nationality?: string;
}

export interface IdTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  auth_time?: number;
  nonce?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  circle_verified_over_18?: boolean;
  circle_verified_nationality?: string;
  [key: string]: unknown;
}

export interface InitiateLoginOptions {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  nonce?: string;
  /** If omitted, a fresh PKCE pair is generated and the verifier is
   *  stored in sessionStorage for `handleCallback` to retrieve. */
  codeVerifier?: string;
  codeChallenge?: string;
  codeChallengeMethod?: "S256";
}

export interface InitiateLoginResult {
  redirectUrl: string;
  state: string;
  codeVerifier: string;
}

export interface HandleCallbackOptions {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret?: string;
  codeVerifier?: string;
  state?: string;
  /** Expected state value (for CSRF verification). If provided and
   *  mismatched, the call fails. */
  expectedState?: string;
}

export type HandleCallbackResult =
  | { ok: true; tokens: TokenSet }
  | { ok: false; error: string };

export interface ValidateIdTokenResult {
  ok: boolean;
  payload?: IdTokenPayload;
  error?: string;
}

// ── PKCE + state helpers (Web Crypto) ────────────────────────────

const PKCE_STORAGE_KEY = "cirkle-oidc-pkce";
const STATE_STORAGE_KEY = "cirkle-oidc-state";

function base64UrlEncode(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const binary = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Generate an RFC 7636 PKCE pair (verifier + S256 challenge). The
 * verifier is 43-128 chars of unreserved URI characters; we use 32
 * random bytes base64url-encoded (= 43 chars).
 */
export async function generatePkcePair(): Promise<PkcePair> {
  const verifier = base64UrlEncode(randomBytes(32));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(digest);
  return { verifier, challenge, method: "S256" };
}

/** Generate an opaque state token (16 random bytes, base64url). */
export function generateState(): string {
  return base64UrlEncode(randomBytes(16));
}

/** Generate an opaque nonce (16 random bytes, base64url). */
export function generateNonce(): string {
  return base64UrlEncode(randomBytes(16));
}

function storePkce(verifier: string, state: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify({ verifier, state }));
  } catch {
    /* private mode / quota — ignore */
  }
}

function loadPkce(): { verifier: string; state: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PKCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { verifier: string; state: string };
    if (typeof parsed.verifier === "string" && typeof parsed.state === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function clearPkce(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PKCE_STORAGE_KEY);
    sessionStorage.removeItem(STATE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ── initiateLogin ────────────────────────────────────────────────

/**
 * Build the /authorize URL and return it (the caller can either
 * `window.location.href = redirectUrl` themselves, or use the
 * `<a href>` pattern). PKCE verifier + state are stashed in
 * sessionStorage for `handleCallback` to retrieve.
 *
 * If `codeVerifier` / `codeChallenge` are omitted, a fresh PKCE pair
 * is generated. If `state` is omitted, a fresh one is generated.
 */
export async function initiateLogin(
  opts: InitiateLoginOptions,
): Promise<InitiateLoginResult> {
  const scope = opts.scope ?? "openid profile email";
  const state = opts.state ?? generateState();

  let codeVerifier = opts.codeVerifier;
  let codeChallenge = opts.codeChallenge;
  if (!codeVerifier || !codeChallenge) {
    const pair = await generatePkcePair();
    codeVerifier = pair.verifier;
    codeChallenge = pair.challenge;
  }
  storePkce(codeVerifier, state);

  const url = new URL("/api/oidc/authorize", window.location.origin);
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", opts.codeChallengeMethod ?? "S256");
  if (opts.nonce) url.searchParams.set("nonce", opts.nonce);

  return { redirectUrl: url.toString(), state, codeVerifier };
}

/**
 * Convenience wrapper — initiates the login flow AND immediately
 * redirects the browser to the provider. Returns the state so the
 * caller can verify it later (it's also in sessionStorage).
 */
export async function startLoginRedirect(
  opts: InitiateLoginOptions,
): Promise<{ state: string }> {
  const { redirectUrl, state } = await initiateLogin(opts);
  window.location.href = redirectUrl;
  return { state };
}

// ── parseCallback ────────────────────────────────────────────────

export interface ParsedCallback {
  ok: boolean;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

/**
 * Parse the redirect-back URL (the URL the RP was sent back to after
 * the user authorized at the provider). Defaults to
 * `window.location.href` if no URL is provided.
 *
 * Returns `{ ok: true, code, state }` on success or
 * `{ ok: false, error, errorDescription }` if the provider redirected
 * with an OAuth2 error.
 */
export function parseCallback(url?: string): ParsedCallback {
  const href = url ?? (typeof window !== "undefined" ? window.location.href : "");
  if (!href) return { ok: false, error: "no_url" };
  try {
    const u = new URL(href);
    const error = u.searchParams.get("error");
    if (error) {
      return {
        ok: false,
        error,
        errorDescription: u.searchParams.get("error_description") ?? undefined,
      };
    }
    const code = u.searchParams.get("code") ?? undefined;
    const state = u.searchParams.get("state") ?? undefined;
    if (!code) return { ok: false, error: "missing_code" };
    return { ok: true, code, state };
  } catch {
    return { ok: false, error: "invalid_url" };
  }
}

// ── handleCallback ───────────────────────────────────────────────

/**
 * Exchange the authorization code for tokens. If `codeVerifier` /
 * `expectedState` are not provided, they're pulled from sessionStorage
 * (where `initiateLogin` stashed them).
 *
 * Calls POST /api/oidc/token (relative path — gateway routes to the
 * Cirkle app on port 3000).
 */
export async function handleCallback(
  opts: HandleCallbackOptions,
): Promise<HandleCallbackResult> {
  // CSRF: verify state if expected.
  let codeVerifier = opts.codeVerifier;
  const expectedState = opts.expectedState;
  if (!codeVerifier || expectedState === undefined) {
    const stored = loadPkce();
    if (!codeVerifier && stored) codeVerifier = stored.verifier;
    if (expectedState === undefined && stored) {
      if (opts.state && stored.state !== opts.state) {
        return { ok: false, error: "state_mismatch" };
      }
    }
  }
  if (expectedState !== undefined && opts.state !== expectedState) {
    return { ok: false, error: "state_mismatch" };
  }
  if (!codeVerifier) {
    return { ok: false, error: "missing_code_verifier" };
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    client_id: opts.clientId,
    code_verifier: codeVerifier,
  });
  if (opts.clientSecret) body.set("client_secret", opts.clientSecret);

  try {
    const res = await fetch("/api/oidc/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const json = (await res.json().catch(() => null)) as
      | (TokenSet & { error?: string; error_description?: string })
      | null;
    if (!res.ok || !json || json.error) {
      return {
        ok: false,
        error: json?.error ?? `http_${res.status}`,
      };
    }
    clearPkce();
    return {
      ok: true,
      tokens: {
        access_token: json.access_token,
        id_token: json.id_token,
        token_type: json.token_type,
        expires_in: json.expires_in,
        scope: json.scope,
        ...(json.refresh_token ? { refresh_token: json.refresh_token } : {}),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "network_error",
    };
  }
}

// ── getUserInfo ──────────────────────────────────────────────────

export type GetUserInfoResult =
  | { ok: true; claims: UserInfoClaims }
  | { ok: false; error: string };

/**
 * Fetch the userinfo claims for the given access token. Calls
 * GET /api/oidc/userinfo with `Authorization: Bearer <token>`.
 */
export async function getUserInfo(
  accessToken: string,
): Promise<GetUserInfoResult> {
  try {
    const res = await fetch("/api/oidc/userinfo", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json().catch(() => null)) as
      | (UserInfoClaims & { error?: string })
      | null;
    if (!res.ok || !json || json.error || !json.sub) {
      return { ok: false, error: (json?.error as string) ?? `http_${res.status}` };
    }
    return { ok: true, claims: json };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "network_error",
    };
  }
}

// ── validateIdToken ──────────────────────────────────────────────

interface JwkKey {
  kty: string;
  n: string;
  e: string;
  kid?: string;
  use?: string;
  alg?: string;
}

interface DecodedJwt {
  header: { alg: string; typ: string; kid?: string };
  payload: IdTokenPayload;
  signature: Uint8Array;
  signingInput: Uint8Array;
}

function decodeJwtParts(jwt: string): DecodedJwt | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(parts[0])),
    ) as DecodedJwt["header"];
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(parts[1])),
    ) as IdTokenPayload;
    const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlDecode(parts[2]);
    return { header, payload, signature, signingInput };
  } catch {
    return null;
  }
}

async function fetchJwks(): Promise<JwkKey[]> {
  const res = await fetch("/api/oidc/jwks", { cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as { keys?: JwkKey[] } | null;
  return json?.keys ?? [];
}

async function importRsaPublicKey(jwk: JwkKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

/**
 * Validate an ID token issued by Cirkle:
 *   1. Decode the JWT (header / payload / signature).
 *   2. Fetch the JWKS and find the key matching the JWT's `kid`.
 *   3. Verify the RS256 signature using Web Crypto.
 *   4. Check `iss`, `exp`, and (optionally) `aud`.
 *
 * Returns `{ ok: true, payload }` on success or
 * `{ ok: false, error }` on any failure.
 */
export async function validateIdToken(
  idToken: string,
  expectedAudience?: string,
): Promise<ValidateIdTokenResult> {
  const decoded = decodeJwtParts(idToken);
  if (!decoded) return { ok: false, error: "malformed_jwt" };
  const { header, payload, signature, signingInput } = decoded;

  if (header.alg !== "RS256") {
    return { ok: false, error: `unsupported_alg:${header.alg}` };
  }

  const keys = await fetchJwks();
  const key = header.kid
    ? keys.find((k) => k.kid === header.kid)
    : keys[0];
  if (!key) return { ok: false, error: "no_matching_jwk" };

  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await importRsaPublicKey(key);
  } catch {
    return { ok: false, error: "jwk_import_failed" };
  }

  let verified: boolean;
  try {
    verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      signature,
      signingInput,
    );
  } catch {
    return { ok: false, error: "signature_verify_failed" };
  }
  if (!verified) return { ok: false, error: "invalid_signature" };

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) {
    return { ok: false, error: "token_expired" };
  }
  // Issuer check — accept either the configured issuer or same-origin.
  const expectedIssuer =
    typeof window !== "undefined"
      ? new URL("/api/oidc", window.location.origin).origin
      : undefined;
  if (
    typeof payload.iss === "string" &&
    expectedIssuer &&
    !payload.iss.startsWith(expectedIssuer)
  ) {
    // The OIDC_ISSUER constant in the provider defaults to
    // https://cirkle.app — accept it as a known-good issuer.
    if (!payload.iss.includes("cirkle.app")) {
      return { ok: false, error: "invalid_issuer" };
    }
  }
  if (expectedAudience && payload.aud !== expectedAudience) {
    return { ok: false, error: "invalid_audience" };
  }

  return { ok: true, payload };
}

// ── Convenience: full client-side OIDC session helper ────────────

export interface OidcSession {
  tokens: TokenSet;
  idTokenPayload: IdTokenPayload;
  userInfo: UserInfoClaims;
  expiresAt: number; // ms since epoch
}

export interface CompleteLoginOptions {
  clientId: string;
  redirectUri: string;
  clientSecret?: string;
  /** Skip the /authorize redirect and just exchange a code that's
   *  already in the URL (e.g. after the RP was redirected back). */
  code?: string;
  state?: string;
  expectedState?: string;
}

/**
 * High-level convenience: given a `code` (from the redirect-back URL)
 * + the same `clientId` / `redirectUri` used at `initiateLogin`, do
 * the full callback dance:
 *   1. Exchange the code for tokens.
 *   2. Validate the id_token.
 *   3. Fetch userinfo.
 *
 * Returns a fully-formed `OidcSession` ready to drop into your app's
 * state. PKCE verifier + state are auto-loaded from sessionStorage.
 */
export async function completeLogin(
  opts: CompleteLoginOptions,
): Promise<
  | { ok: true; session: OidcSession }
  | { ok: false; error: string }
> {
  const code = opts.code;
  if (!code) return { ok: false, error: "missing_code" };

  const tokenResult = await handleCallback({
    code,
    redirectUri: opts.redirectUri,
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
    state: opts.state,
    expectedState: opts.expectedState,
  });
  if (!tokenResult.ok) return tokenResult;

  const validateResult = await validateIdToken(
    tokenResult.tokens.id_token,
    opts.clientId,
  );
  if (!validateResult.ok || !validateResult.payload) {
    return { ok: false, error: validateResult.error ?? "invalid_id_token" };
  }

  const userInfoResult = await getUserInfo(tokenResult.tokens.access_token);
  if (!userInfoResult.ok) return userInfoResult;

  const expiresAt = Date.now() + tokenResult.tokens.expires_in * 1000;
  return {
    ok: true,
    session: {
      tokens: tokenResult.tokens,
      idTokenPayload: validateResult.payload,
      userInfo: userInfoResult.claims,
      expiresAt,
    },
  };
}

// ── Token storage helpers (optional — opt in) ───────────────────

const SESSION_STORAGE_KEY = "cirkle-oidc-session";

export function persistSession(session: OidcSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function loadPersistedSession(): OidcSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OidcSession;
    if (parsed?.tokens?.access_token && parsed?.tokens?.id_token) {
      // Check expiry — return null if expired.
      if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPersistedSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

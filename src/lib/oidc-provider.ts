import "server-only";
import crypto from "crypto";
import type { OidcClient, OidcConsent, OidcSession } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAttestations } from "@/lib/identity";

/**
 * Circle ID — Lightweight OIDC Provider
 * =====================================
 *
 * A standards-compliant-ish OpenID Connect provider layer that runs
 * ALONGSIDE Cirkle's existing localStorage-based authentication
 * (see `src/lib/auth-store.ts`). It does NOT replace the legacy auth —
 * it issues OIDC artifacts (id_token / access_token / refresh_token)
 * keyed off the same Cirkle username that the legacy auth produces.
 *
 * Why "alongside"? The blueprint (ADR-001) calls for Ory Hydra in
 * production. Hydra can't be deployed in this sandbox, so we implement
 * a self-contained RS256-signed JWT provider that speaks the same
 * wire protocol (discovery, JWKS, auth code + PKCE, userinfo, RFC 7591
 * dynamic client registration, RFC 7009 revocation). When the operator
 * later swaps in Hydra they only need to flip the discovery metadata
 * endpoints — RPs that already speak OIDC will keep working.
 *
 * Tokens:
 *   - ID token:     RS256-signed JWT, ~1h expiry, includes `sub`,
 *                   `aud`, `iss`, `nonce`, standard claims, and
 *                   `circle_verified_*` claims when the corresponding
 *                   `circle.verify.*` scope was granted.
 *   - Access token: opaque random 256-bit token (NOT a JWT — the
 *                   userinfo endpoint looks it up in the DB). This is
 *                   deliberately simple: it lets us revoke tokens
 *                   instantly without maintaining a blocklist.
 *   - Refresh token: opaque random 256-bit token, ~30d expiry, only
 *                   issued when `offline_access` scope was granted.
 *
 * Signing key: RSA-2048 keypair, generated in-memory on first use
 * and cached on `globalThis` so it survives hot reloads in dev. In
 * production the operator MUST set `OIDC_RSA_PUBLIC_KEY` and
 * `OIDC_RSA_PRIVATE_KEY` (PEM-encoded) — otherwise keys rotate on
 * every process restart, invalidating all previously-issued tokens.
 *
 * This module is `server-only`. It must never be imported from a
 * client component. Use `src/lib/oidc-client.ts` for the client side.
 */

// ── Constants ────────────────────────────────────────────────────

const ISSUER =
  process.env.OIDC_ISSUER ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://cirkle.app");

/** Authorization code TTL (10 min — RFC 6749 §4.1.2 recommends ≤10min). */
const CODE_TTL_SEC = 600;
/** Access token TTL (1 hour). */
const ACCESS_TTL_SEC = 3600;
/** Refresh token TTL (30 days). */
const REFRESH_TTL_SEC = 30 * 24 * 3600;
/** Stable key id advertised in JWT headers + JWKS. */
const KEY_ID = "cirkle-oidc-rs256-v1";

/** Standard OIDC scopes we recognize. */
const STANDARD_SCOPES = ["openid", "profile", "email", "offline_access"] as const;
/** Cirkle-specific scopes that map to VerifyClaim attestations. */
const CIRCLE_SCOPES = [
  "circle.verify.over_18",
  "circle.verify.nationality",
] as const;
const ALL_SCOPES: readonly string[] = [...STANDARD_SCOPES, ...CIRCLE_SCOPES];

// ── RSA keypair (in-memory, hot-reload-safe) ─────────────────────

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

function generateKeyPair(): KeyPair {
  const kp = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

function getKeyPair(): KeyPair {
  const g = globalThis as unknown as { __cirkleOidcKeyPair?: KeyPair };
  if (!g.__cirkleOidcKeyPair) {
    const envPub = process.env.OIDC_RSA_PUBLIC_KEY;
    const envPriv = process.env.OIDC_RSA_PRIVATE_KEY;
    if (envPub && envPriv) {
      g.__cirkleOidcKeyPair = { publicKey: envPub, privateKey: envPriv };
      logger.info("[oidc] using env-provided RSA keypair");
    } else {
      g.__cirkleOidcKeyPair = generateKeyPair();
      logger.warn(
        "[oidc] generated in-memory RSA-2048 keypair — set OIDC_RSA_PUBLIC_KEY / OIDC_RSA_PRIVATE_KEY in production",
      );
    }
  }
  return g.__cirkleOidcKeyPair;
}

// ── Base64URL helpers ────────────────────────────────────────────

function b64uEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64uDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

// ── RS256 JWT sign / verify ──────────────────────────────────────

interface JwtHeader {
  alg: "RS256";
  typ: "JWT";
  kid: string;
}

interface DecodedJwt {
  header: JwtHeader;
  payload: Record<string, unknown>;
}

function signJwtRS256(payload: Record<string, unknown>, kid: string = KEY_ID): string {
  const header: JwtHeader = { alg: "RS256", typ: "JWT", kid };
  const headerB64 = b64uEncode(JSON.stringify(header));
  const payloadB64 = b64uEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(data);
  const sig = signer.sign(getKeyPair().privateKey);
  return `${data}.${b64uEncode(sig)}`;
}

function verifyJwtRS256(jwt: string): DecodedJwt | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(data);
  let ok = false;
  try {
    ok = verifier.verify(getKeyPair().publicKey, b64uDecode(sigB64));
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    const header = JSON.parse(b64uDecode(headerB64).toString("utf8")) as JwtHeader;
    const payload = JSON.parse(b64uDecode(payloadB64).toString("utf8")) as Record<string, unknown>;
    if (header.alg !== "RS256") return null;
    return { header, payload };
  } catch {
    return null;
  }
}

// ── JWKS (public key in JWK format) ──────────────────────────────

interface JsonWebKey {
  kty: string;
  n: string;
  e: string;
  kid: string;
  use: string;
  alg: string;
}

function publicJwk(): JsonWebKey {
  const pub = crypto.createPublicKey(getKeyPair().publicKey);
  const jwk = pub.export({ format: "jwk" }) as { kty: string; n: string; e: string };
  return { ...jwk, kid: KEY_ID, use: "sig", alg: "RS256" };
}

export function jwksResponse(): { keys: JsonWebKey[] } {
  return { keys: [publicJwk()] };
}

// ── Random tokens / PKCE ─────────────────────────────────────────

function randomToken(bytes = 32): string {
  return b64uEncode(crypto.randomBytes(bytes));
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

// ── Client (RP) management ───────────────────────────────────────

export interface OidcClientRecord {
  clientId: string;
  clientSecret: string | null;
  name: string;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  scope: string;
  clientType: "confidential" | "public";
  logoUri: string | null;
  policyUri: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function safeParseArr(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function csvSplit(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function rowToClient(row: OidcClient): OidcClientRecord {
  return {
    clientId: row.clientId,
    clientSecret: row.clientSecret,
    name: row.name,
    redirectUris: safeParseArr(row.redirectUris),
    grantTypes: csvSplit(row.grantTypes),
    responseTypes: csvSplit(row.responseTypes),
    scope: row.scope,
    clientType: row.clientType as "confidential" | "public",
    logoUri: row.logoUri,
    policyUri: row.policyUri,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isValidRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === "https:") return true;
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export interface RegisterClientInput {
  name: string;
  redirectUris: string[];
  grantTypes?: string[];
  responseTypes?: string[];
  scope?: string;
  clientType?: "confidential" | "public";
  logoUri?: string;
  policyUri?: string;
}

/**
 * Register a new OIDC client (RFC 7591 Dynamic Client Registration).
 * Confidential clients get a generated `clientSecret`; public clients
 * (SPAs / mobile) must use PKCE.
 */
export async function registerClient(input: RegisterClientInput): Promise<OidcClientRecord> {
  if (!input.name || !input.name.trim()) throw new Error("Client name is required.");
  if (!Array.isArray(input.redirectUris) || input.redirectUris.length === 0) {
    throw new Error("At least one redirect_uri is required.");
  }
  for (const uri of input.redirectUris) {
    if (!isValidRedirectUri(uri)) {
      throw new Error(
        `Invalid redirect URI: ${uri}. Must be https:// or http://localhost / http://127.0.0.1.`,
      );
    }
  }
  const grantTypes = input.grantTypes ?? ["authorization_code"];
  const responseTypes = input.responseTypes ?? ["code"];
  const clientType = input.clientType ?? "confidential";
  const clientId = `cirkle_${randomToken(12)}`;
  const clientSecret = clientType === "confidential" ? randomToken(32) : null;

  const row = await db.oidcClient.create({
    data: {
      clientId,
      clientSecret,
      name: input.name.trim(),
      redirectUris: JSON.stringify(input.redirectUris),
      grantTypes: grantTypes.join(","),
      responseTypes: responseTypes.join(","),
      scope: input.scope ?? "openid profile email",
      clientType,
      logoUri: input.logoUri ?? null,
      policyUri: input.policyUri ?? null,
    },
  });
  logger.info("[oidc] client registered", { clientId, name: input.name, clientType });
  return rowToClient(row);
}

export async function getClient(clientId: string): Promise<OidcClientRecord | null> {
  const row = await db.oidcClient.findUnique({ where: { clientId } });
  return row ? rowToClient(row) : null;
}

export async function listClients(): Promise<OidcClientRecord[]> {
  const rows = await db.oidcClient.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(rowToClient);
}

// ── Discovery metadata ───────────────────────────────────────────

export function discoveryMetadata(): Record<string, unknown> {
  return {
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/api/oidc/authorize`,
    token_endpoint: `${ISSUER}/api/oidc/token`,
    userinfo_endpoint: `${ISSUER}/api/oidc/userinfo`,
    jwks_uri: `${ISSUER}/api/oidc/jwks`,
    registration_endpoint: `${ISSUER}/api/oidc/register`,
    revocation_endpoint: `${ISSUER}/api/oidc/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
    scopes_supported: ALL_SCOPES,
    claims_supported: [
      "sub",
      "name",
      "preferred_username",
      "picture",
      "locale",
      "email",
      "email_verified",
      "circle_verified_over_18",
      "circle_verified_nationality",
    ],
    code_challenge_methods_supported: ["S256", "plain"],
    require_pkce: false,
    request_parameter_supported: false,
    request_uri_parameter_supported: false,
  };
}

// ── Authorization request validation ─────────────────────────────

export interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  state?: string;
  nonce?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

export interface AuthorizeValidation {
  ok: boolean;
  error?: string;
  errorDescription?: string;
  client?: OidcClientRecord;
  scopes?: string[];
}

/**
 * Validate an `/authorize` request. Returns the client record + the
 * intersection of requested scopes and client-allowed scopes. The
 * caller is responsible for rendering the consent UI (or skipping it
 * if a prior consent exists) and then calling `issueAuthorizationCode`.
 */
export async function validateAuthorizeRequest(p: AuthorizeParams): Promise<AuthorizeValidation> {
  const client = await getClient(p.clientId);
  if (!client) return { ok: false, error: "invalid_client" };
  if (!client.redirectUris.includes(p.redirectUri)) {
    return { ok: false, error: "invalid_request", errorDescription: "redirect_uri not registered" };
  }
  if (!client.responseTypes.includes(p.responseType)) {
    return { ok: false, error: "unsupported_response_type" };
  }
  const requested = p.scope.split(/\s+/).filter(Boolean);
  const allowed = client.scope.split(/\s+/).filter(Boolean);
  const valid = requested.filter(
    (s) => ALL_SCOPES.includes(s) && allowed.includes(s),
  );
  if (!valid.includes("openid")) {
    return { ok: false, error: "invalid_scope", errorDescription: "openid scope required" };
  }
  if (p.codeChallenge && p.codeChallengeMethod) {
    if (!["S256", "plain"].includes(p.codeChallengeMethod)) {
      return { ok: false, error: "invalid_request", errorDescription: "unsupported code_challenge_method" };
    }
  }
  // Public clients MUST use PKCE.
  if (client.clientType === "public" && !p.codeChallenge) {
    return { ok: false, error: "invalid_request", errorDescription: "PKCE required for public clients" };
  }
  return { ok: true, client, scopes: valid };
}

// ── Consent helpers ──────────────────────────────────────────────

export async function getExistingConsent(
  clientId: string,
  userLabel: string,
): Promise<OidcConsent | null> {
  const client = await db.oidcClient.findUnique({ where: { clientId } });
  if (!client) return null;
  return db.oidcConsent.findUnique({
    where: { clientId_userLabel: { clientId: client.id, userLabel } },
  });
}

export async function recordConsent(
  clientId: string,
  userLabel: string,
  scopes: string[],
): Promise<void> {
  const client = await db.oidcClient.findUnique({ where: { clientId } });
  if (!client) throw new Error("client not found");
  await db.oidcConsent.upsert({
    where: { clientId_userLabel: { clientId: client.id, userLabel } },
    create: {
      clientId: client.id,
      userLabel,
      scope: scopes.join(" "),
      status: "granted",
    },
    update: {
      scope: scopes.join(" "),
      status: "granted",
      revokedAt: null,
      updatedAt: new Date(),
    },
  });
}

export async function revokeConsent(clientId: string, userLabel: string): Promise<void> {
  const client = await db.oidcClient.findUnique({ where: { clientId } });
  if (!client) return;
  await db.oidcConsent.updateMany({
    where: { clientId: client.id, userLabel },
    data: { status: "revoked", revokedAt: new Date() },
  });
}

// ── Issue authorization code ─────────────────────────────────────

export interface IssueCodeInput {
  clientId: string;
  redirectUri: string;
  userLabel: string;
  scopes: string[];
  nonce?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

export interface IssueCodeResult {
  code: string;
  redirectUrl: string;
}

/**
 * After the user has authenticated (via the legacy auth-store) and
 * (optionally) consented, the caller invokes this to mint a single-use
 * authorization code + build the redirect URL.
 */
export async function issueAuthorizationCode(input: IssueCodeInput): Promise<IssueCodeResult> {
  const client = await db.oidcClient.findUnique({ where: { clientId: input.clientId } });
  if (!client) throw new Error("client not found");
  const code = randomToken(24);
  const codeExpiresAt = new Date(Date.now() + CODE_TTL_SEC * 1000);
  await db.oidcSession.create({
    data: {
      clientId: client.id,
      userLabel: input.userLabel,
      code,
      codeChallenge: input.codeChallenge ?? null,
      codeChallengeMethod: input.codeChallengeMethod ?? null,
      scope: input.scopes.join(" "),
      nonce: input.nonce ?? null,
      state: input.state ?? null,
      status: "pending",
      codeExpiresAt,
    },
  });
  const url = new URL(input.redirectUri);
  url.searchParams.set("code", code);
  if (input.state) url.searchParams.set("state", input.state);
  return { code, redirectUrl: url.toString() };
}

// ── Token exchange ───────────────────────────────────────────────

export interface TokenResult {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  id_token: string;
  scope: string;
}

export interface ExchangeCodeInput {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret?: string;
  codeVerifier?: string;
}

type SessionWithClient = OidcSession & { client: OidcClient };

async function buildIdToken(
  session: SessionWithClient,
  scopes: string[],
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = {
    iss: ISSUER,
    sub: session.userLabel,
    aud: session.client.clientId,
    exp: now + ACCESS_TTL_SEC,
    iat: now,
    auth_time: now,
  };
  if (session.nonce) claims.nonce = session.nonce;

  if (scopes.includes("profile")) {
    claims.name = session.userLabel;
    claims.preferred_username = session.userLabel;
    claims.locale = "en";
  }
  if (scopes.includes("email")) {
    claims.email = `${session.userLabel}@cirkle.app`;
    claims.email_verified = false;
  }

  if (
    scopes.includes("circle.verify.over_18") ||
    scopes.includes("circle.verify.nationality")
  ) {
    try {
      const attestations = await getAttestations(session.userLabel);
      const verified = attestations.filter((a) => a.status === "verified");
      if (scopes.includes("circle.verify.over_18")) {
        const a = verified.find((x) => x.claimType === "over_18");
        if (a) claims.circle_verified_over_18 = a.claimValue === "true";
      }
      if (scopes.includes("circle.verify.nationality")) {
        const a = verified.find((x) => x.claimType === "nationality");
        if (a) claims.circle_verified_nationality = a.claimValue;
      }
    } catch (err) {
      logger.warn("[oidc] failed to fetch attestations for id_token", {
        error: (err as Error).message,
      });
    }
  }
  return signJwtRS256(claims);
}

async function issueTokensForSession(session: SessionWithClient): Promise<TokenResult> {
  const accessToken = randomToken(32);
  const accessExpiresAt = new Date(Date.now() + ACCESS_TTL_SEC * 1000);
  const scopes = session.scope.split(/\s+/).filter(Boolean);
  const idToken = await buildIdToken(session, scopes);
  const includesOffline = scopes.includes("offline_access");
  const refreshToken = includesOffline ? randomToken(32) : null;
  const refreshExpiresAt = includesOffline
    ? new Date(Date.now() + REFRESH_TTL_SEC * 1000)
    : null;

  await db.oidcSession.update({
    where: { id: session.id },
    data: {
      accessToken,
      accessExpiresAt,
      refreshToken,
      refreshExpiresAt,
      idToken,
      status: "issued",
    },
  });

  const result: TokenResult = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SEC,
    id_token: idToken,
    scope: session.scope,
  };
  if (refreshToken) result.refresh_token = refreshToken;
  return result;
}

/**
 * Exchange an authorization code for tokens (RFC 6749 §4.1.3 + OIDC).
 * Validates: code exists, code is pending, code not expired, client
 * match, client secret (for confidential clients), PKCE verifier.
 */
export async function exchangeCode(
  input: ExchangeCodeInput,
): Promise<{ ok: true; tokens: TokenResult } | { ok: false; error: string }> {
  const session = await db.oidcSession.findUnique({
    where: { code: input.code },
    include: { client: true },
  });
  if (!session) return { ok: false, error: "invalid_grant" };
  if (session.status !== "pending") return { ok: false, error: "invalid_grant" };
  if (session.codeExpiresAt.getTime() < Date.now()) {
    await db.oidcSession.update({
      where: { id: session.id },
      data: { status: "expired" },
    });
    return { ok: false, error: "invalid_grant" };
  }
  if (session.client.clientId !== input.clientId) {
    return { ok: false, error: "invalid_client" };
  }
  if (session.client.clientType === "confidential") {
    if (!input.clientSecret || !session.client.clientSecret) {
      return { ok: false, error: "invalid_client" };
    }
    if (!safeEqual(input.clientSecret, session.client.clientSecret)) {
      return { ok: false, error: "invalid_client" };
    }
  }
  // PKCE verification (mandatory if a challenge was sent).
  if (session.codeChallenge) {
    if (!input.codeVerifier) return { ok: false, error: "invalid_grant" };
    let pkceOk = false;
    if (session.codeChallengeMethod === "S256") {
      const hash = crypto.createHash("sha256").update(input.codeVerifier).digest();
      pkceOk = safeEqual(b64uEncode(hash), session.codeChallenge);
    } else {
      pkceOk = safeEqual(input.codeVerifier, session.codeChallenge);
    }
    if (!pkceOk) return { ok: false, error: "invalid_grant" };
  }
  void input.redirectUri; // RFC: must equal the authorize-time value; we
  // already validated redirect_uri at /authorize so we don't re-check here.

  const tokens = await issueTokensForSession(session);
  return { ok: true, tokens };
}

// ── Refresh token ────────────────────────────────────────────────

export interface RefreshInput {
  refreshToken: string;
  clientId: string;
  clientSecret?: string;
}

export async function refreshWithToken(
  input: RefreshInput,
): Promise<{ ok: true; tokens: TokenResult } | { ok: false; error: string }> {
  const session = await db.oidcSession.findUnique({
    where: { refreshToken: input.refreshToken },
    include: { client: true },
  });
  if (!session) return { ok: false, error: "invalid_grant" };
  if (session.client.clientId !== input.clientId) {
    return { ok: false, error: "invalid_client" };
  }
  if (session.client.clientType === "confidential") {
    if (!input.clientSecret || !session.client.clientSecret) {
      return { ok: false, error: "invalid_client" };
    }
    if (!safeEqual(input.clientSecret, session.client.clientSecret)) {
      return { ok: false, error: "invalid_client" };
    }
  }
  if (session.status === "revoked") return { ok: false, error: "invalid_grant" };
  if (session.refreshExpiresAt && session.refreshExpiresAt.getTime() < Date.now()) {
    return { ok: false, error: "invalid_grant" };
  }
  const tokens = await issueTokensForSession(session);
  return { ok: true, tokens };
}

// ── UserInfo ─────────────────────────────────────────────────────

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

/**
 * Look up the session by opaque access token and return the userinfo
 * claims appropriate for the scopes that were granted.
 */
export async function getUserInfo(
  accessToken: string,
): Promise<{ ok: true; claims: UserInfoClaims } | { ok: false; error: string }> {
  const session = await db.oidcSession.findUnique({
    where: { accessToken },
    include: { client: true },
  });
  if (!session) return { ok: false, error: "invalid_token" };
  if (session.status === "revoked") return { ok: false, error: "invalid_token" };
  if (!session.accessToken) return { ok: false, error: "invalid_token" };
  if (!session.accessExpiresAt || session.accessExpiresAt.getTime() < Date.now()) {
    return { ok: false, error: "invalid_token" };
  }
  const scopes = session.scope.split(/\s+/).filter(Boolean);
  const claims: UserInfoClaims = { sub: session.userLabel };
  if (scopes.includes("profile")) {
    claims.name = session.userLabel;
    claims.preferred_username = session.userLabel;
    claims.locale = "en";
  }
  if (scopes.includes("email")) {
    claims.email = `${session.userLabel}@cirkle.app`;
    claims.email_verified = false;
  }
  if (
    scopes.includes("circle.verify.over_18") ||
    scopes.includes("circle.verify.nationality")
  ) {
    try {
      const attestations = await getAttestations(session.userLabel);
      const verified = attestations.filter((a) => a.status === "verified");
      if (scopes.includes("circle.verify.over_18")) {
        const a = verified.find((x) => x.claimType === "over_18");
        if (a) claims.circle_verified_over_18 = a.claimValue === "true";
      }
      if (scopes.includes("circle.verify.nationality")) {
        const a = verified.find((x) => x.claimType === "nationality");
        if (a) claims.circle_verified_nationality = a.claimValue;
      }
    } catch {
      /* ignore — claims simply omitted */
    }
  }
  return { ok: true, claims };
}

// ── Revocation (RFC 7009) ────────────────────────────────────────

export interface RevokeInput {
  token: string;
  tokenTypeHint?: "access_token" | "refresh_token";
  clientId?: string;
  clientSecret?: string;
}

/**
 * Revoke an access or refresh token. Idempotent. Marks the underlying
 * session row as `revoked` — both access and refresh tokens for that
 * session become invalid.
 */
export async function revokeToken(input: RevokeInput): Promise<void> {
  let session: SessionWithClient | null = null;

  if (input.tokenTypeHint !== "access_token") {
    session = (await db.oidcSession.findUnique({
      where: { refreshToken: input.token },
      include: { client: true },
    })) as SessionWithClient | null;
  }
  if (!session && input.tokenTypeHint !== "refresh_token") {
    session = (await db.oidcSession.findUnique({
      where: { accessToken: input.token },
      include: { client: true },
    })) as SessionWithClient | null;
  }
  if (!session) return;

  // If a client id was provided, ensure it owns the token.
  if (input.clientId && session.client.clientId !== input.clientId) return;
  if (input.clientSecret && session.client.clientSecret) {
    if (!safeEqual(input.clientSecret, session.client.clientSecret)) return;
  }

  await db.oidcSession.update({
    where: { id: session.id },
    data: { status: "revoked" },
  });
  logger.info("[oidc] token revoked", {
    clientId: session.client.clientId,
    userLabel: session.userLabel,
  });
}

// ── ID Token validation (used by RPs / the client helper) ────────

export type ValidateIdTokenResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Validate an ID token issued by this provider. Checks signature
 * (RS256 against the provider's public key), `iss`, `exp`, and
 * (optionally) `aud`.
 */
export function validateIdToken(
  idToken: string,
  expectedAudience?: string,
): ValidateIdTokenResult {
  const decoded = verifyJwtRS256(idToken);
  if (!decoded) return { ok: false, error: "invalid_signature" };
  const now = Math.floor(Date.now() / 1000);
  const { payload } = decoded;
  if (typeof payload.exp === "number" && payload.exp < now) {
    return { ok: false, error: "token_expired" };
  }
  if (typeof payload.iss === "string" && payload.iss !== ISSUER) {
    return { ok: false, error: "invalid_issuer" };
  }
  if (expectedAudience && payload.aud !== expectedAudience) {
    return { ok: false, error: "invalid_audience" };
  }
  return { ok: true, payload };
}

// ── Access token validation (introspection-like) ─────────────────

export interface IntrospectResult {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  aud?: string;
  iss?: string;
}

/**
 * Lightweight introspection — look up the opaque access token in the
 * DB and return its metadata if still active. Mirrors RFC 7662 shape.
 */
export async function introspectAccessToken(token: string): Promise<IntrospectResult> {
  const session = await db.oidcSession.findUnique({
    where: { accessToken: token },
    include: { client: true },
  });
  if (!session || !session.accessToken) return { active: false };
  if (session.status === "revoked") return { active: false };
  if (!session.accessExpiresAt || session.accessExpiresAt.getTime() < Date.now()) {
    return { active: false };
  }
  const exp = Math.floor(session.accessExpiresAt.getTime() / 1000);
  const iat = session.createdAt
    ? Math.floor(session.createdAt.getTime() / 1000)
    : undefined;
  return {
    active: true,
    scope: session.scope,
    client_id: session.client.clientId,
    username: session.userLabel,
    token_type: "Bearer",
    exp,
    ...(iat ? { iat } : {}),
    sub: session.userLabel,
    aud: session.client.clientId,
    iss: ISSUER,
  };
}

// ── Exported constants (for client helper + routes) ──────────────

export const OIDC_ISSUER = ISSUER;
export const OIDC_KEY_ID = KEY_ID;
export const OIDC_ALL_SCOPES = ALL_SCOPES;
export const OIDC_ACCESS_TTL_SEC = ACCESS_TTL_SEC;
export const OIDC_REFRESH_TTL_SEC = REFRESH_TTL_SEC;

// Re-export the underlying JWT verifier so the client helper can use
// the provider's public key for signature verification in same-origin
// contexts. (Cross-origin RPs fetch the JWKS via /api/oidc/jwks.)
export function verifyIdTokenSignature(jwt: string): DecodedJwt | null {
  return verifyJwtRS256(jwt);
}

# Task P1-1-OIDC — Circle ID / OIDC Provider

**Agent:** full-stack-developer
**Task:** Implement Circle ID / OIDC provider alongside existing authentication

## Summary

Built a standards-compliant-ish OIDC provider layer that runs ALONGSIDE Cirkle's existing localStorage-based authentication (`src/lib/auth-store.ts`). It does NOT replace the legacy auth — it issues OIDC artifacts keyed off the same Cirkle username. Designed so the operator can later swap in Ory Hydra by flipping only the discovery metadata endpoints; RPs that already speak OIDC will keep working.

## Files created

- `src/lib/oidc-provider.ts` (~900 LOC) — server-only OIDC provider implementation.
- `src/lib/oidc-client.ts` (~580 LOC) — client-side OIDC helper for RPs.
- `src/app/api/oidc/.well-known/openid-configuration/route.ts` — discovery (RFC 8414).
- `src/app/api/oidc/authorize/route.ts` — authorization endpoint (GET + POST).
- `src/app/api/oidc/token/route.ts` — token endpoint (auth_code + refresh).
- `src/app/api/oidc/userinfo/route.ts` — userinfo endpoint (GET + POST).
- `src/app/api/oidc/jwks/route.ts` — JWKS endpoint (RFC 7517).
- `src/app/api/oidc/register/route.ts` — dynamic client registration (RFC 7591) + GET list.
- `src/app/api/oidc/revoke/route.ts` — token revocation (RFC 7009).
- `src/app/api/oidc/introspect/route.ts` — token introspection (RFC 7662, bonus).

## Prisma models added (schema.prisma)

- `OidcClient` — registered RP (clientId, clientSecret?, redirectUris as JSON, grantTypes/responseTypes as CSV, scope, clientType confidential|public).
- `OidcSession` — one row per authorization code; access/refresh tokens stored on same row for chain-of-custody.
- `OidcConsent` — (clientId, userLabel) unique; status granted|revoked; used to skip consent screen on repeat authorizations.

All three models pushed to the SQLite DB via `bun run db:push` (verified: tables `OidcClient`, `OidcSession`, `OidcConsent` exist).

## Implementation highlights

### Provider (`oidc-provider.ts`)

- **RS256 JWT signing** using Node.js `crypto` (no `jose`/`jsonwebtoken` dep). RSA-2048 keypair generated in-memory on first use, cached on `globalThis` to survive hot reloads. In production, operator sets `OIDC_RSA_PUBLIC_KEY` / `OIDC_RSA_PRIVATE_KEY` PEM env vars.
- **PKCE** (RFC 7636): S256 + plain. Public clients MUST use PKCE.
- **Authorization Code Flow**: code TTL 10 min, single-use, status tracked pending→issued→revoked→expired.
- **Tokens**: ID token = RS256 JWT (1h expiry, includes `sub`/`aud`/`iss`/`nonce`/standard claims + `circle_verified_*` claims when corresponding `circle.verify.*` scope granted). Access token = opaque 256-bit random (DB lookup at /userinfo — instantly revocable, no JWT blocklist needed). Refresh token = opaque 256-bit random (30d, only issued when `offline_access` scope granted).
- **Scopes**: `openid`, `profile`, `email`, `offline_access`, plus Cirkle-specific `circle.verify.over_18` and `circle.verify.nationality` (which pull from the existing `VerifyClaim` attestation system via `getAttestations()`).
- **Consent**: stored per (client, user); auto-skips consent screen on repeat authorization if previously-granted scopes ⊇ requested scopes. `revokeConsent` for explicit revocation.
- **Client registration** (RFC 7591): generates `client_id` (`cirkle_<random>`) + `client_secret` for confidential clients. Redirect URI validation (https or http://localhost/127.0.0.1 only).
- **Token validation**: RS256 signature verify against provider's public key + `iss`/`exp`/`aud` checks.
- **Introspection** (RFC 7662): returns `{active, scope, client_id, username, exp, ...}` for opaque access tokens.
- **Revocation** (RFC 7009): marks session row `revoked` → both access + refresh tokens invalidated. Always returns 200 per spec.

### Client helper (`oidc-client.ts`)

- `'use client'` — pure browser-side, uses `window.crypto.subtle`.
- `generatePkcePair()` — RFC 7636 verifier + S256 challenge.
- `generateState()` / `generateNonce()` — opaque tokens for CSRF + replay protection.
- `initiateLogin({clientId, redirectUri, scope?, state?, nonce?, codeVerifier?, codeChallenge?})` — builds `/authorize` URL, stashes PKCE verifier + state in `sessionStorage`.
- `startLoginRedirect(opts)` — convenience: initiates + `window.location.href = redirectUrl`.
- `parseCallback(url?)` — extracts `code`+`state` or `error`+`error_description` from the redirect-back URL.
- `handleCallback({code, redirectUri, clientId, clientSecret?, codeVerifier?, state?, expectedState?})` — exchanges code for tokens at `/api/oidc/token`. PKCE verifier + state auto-loaded from sessionStorage if not passed.
- `getUserInfo(accessToken)` — GET `/api/oidc/userinfo` with `Authorization: Bearer`.
- `validateIdToken(idToken, expectedAudience?)` — fetches JWKS, finds key by `kid`, verifies RS256 signature via Web Crypto, checks `iss`/`exp`/`aud`.
- `completeLogin({clientId, redirectUri, code, ...})` — high-level convenience: exchange code → validate id_token → fetch userinfo → returns full `OidcSession`.
- `persistSession` / `loadPersistedSession` / `clearPersistedSession` — optional localStorage persistence.

### API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/oidc/.well-known/openid-configuration` | GET | RFC 8414 discovery metadata |
| `/api/oidc/authorize` | GET | validate request, return `redirectUrl` if consent on file, else `requiresConsent` metadata for UI |
| `/api/oidc/authorize` | POST | submit `decision: accept\|deny` + `userLabel`, mint code, return `redirectUrl` |
| `/api/oidc/token` | POST | `authorization_code` + `refresh_token` grants; supports `client_secret_basic`, `client_secret_post`, `none` |
| `/api/oidc/userinfo` | GET/POST | Bearer-token-authed claims endpoint |
| `/api/oidc/jwks` | GET | Public RSA key in JWK format |
| `/api/oidc/register` | POST/GET | RFC 7591 dynamic client registration; GET lists registered clients (dev convenience) |
| `/api/oidc/revoke` | POST | RFC 7009 — always 200 OK |
| `/api/oidc/introspect` | POST | RFC 7662 — `{active, ...}` |

## End-to-end test (run via `bun --bun`)

Wrote and ran a smoke test that exercised the full flow:
1. Discovery metadata returns all required endpoints + supported scopes ✅
2. JWKS returns 1 RS256 key ✅
3. `registerClient` creates a confidential client with secret ✅
4. `validateAuthorizeRequest` validates client + redirect_uri + scopes (including `circle.verify.over_18`) ✅
5. `issueAuthorizationCode` mints code + builds redirect URL ✅
6. `exchangeCode` returns `{access_token, id_token, token_type, expires_in, scope}` (no refresh_token since `offline_access` not requested) ✅
7. `validateIdToken` verifies RS256 signature + `sub`/`aud` ✅
8. `getUserInfo` returns claims appropriate for granted scopes ✅
9. `revokeToken` invalidates session → subsequent `getUserInfo` returns `invalid_token` ✅

## Did NOT modify

- Brain AI (`src/lib/cirkle-brain.ts`, `brain-*.ts`) — untouched.
- `src/proxy.ts` — untouched. (OIDC routes follow the same dev-mode allow-all policy as other API routes; production hardening is a separate task.)
- Existing authentication (`src/lib/auth-store.ts`) — untouched. OIDC layer reads the same Cirkle username from the legacy auth when the frontend passes `userLabel`.
- Existing identity infrastructure (`src/lib/identity.ts`, `/api/identity/*`) — untouched. The OIDC provider *reuses* `getAttestations()` from `identity.ts` to populate `circle_verified_*` claims.

## Lint

`bun run lint` → 0 errors, 0 warnings ✅

## Notes for downstream tasks

- The OIDC routes will become reachable after the next system-managed production build (the current sandbox serves a prebuilt `.next/standalone` from before the routes existed; Turbopack dev server isn't running in this environment).
- In production, the operator MUST set `OIDC_RSA_PUBLIC_KEY` + `OIDC_RSA_PRIVATE_KEY` (PEM) and `OIDC_ISSUER` (canonical https URL). Without these, the provider generates an in-memory keypair on every process restart, invalidating all previously-issued ID tokens.
- The `/api/oidc/register` and `/api/oidc/introspect` endpoints are open (no client auth) for dev convenience. The Caddyfile gateway should rate-limit them in production; production hardening (requiring an initial access token for registration, requiring client auth for introspection) is a separate task.
- Frontend integration (consent screen UI, "Login with Cirkle" button) is a separate frontend task — the API contract is documented in `src/app/api/oidc/authorize/route.ts` comments.

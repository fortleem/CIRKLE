# Task P1-SECURITY — Server-side auth, IDOR fixes, admin route gating, socket.io auth

**Agent:** full-stack-developer
**Date:** 2025-09-15
**Phase:** P1 (security hardening)
**Status:** ✅ Complete

## What this task did

Closed four pre-P1 security gaps flagged in the audit:

1. **Missing server-side auth surface** — added `/api/auth/{login,register,session,me}` that use the existing `server-auth.ts` (JWT helpers) and `server-credentials.ts` (bcrypt store) so the client can finally hydrate from a server-issued JWT cookie instead of relying on bcrypt-in-localStorage.

2. **IDOR on four endpoints** — `account/export`, `account/delete`, `e2ee/keys` (POST), and `conversations/[id]` now read the session from the `cirkle-session` cookie and IGNORE client-supplied identity claims (`?username=`, `{ username }` body, `userLabel` body, path `id` without membership check respectively).

3. **Admin routes unauthenticated** — all 12 handlers under `src/app/api/admin/*` now call `adminGate(req)` as the first line (returns 401 if no session, 403 if `!session.isAdmin`). Each file gained the comment `// P1 FIX: Route is now auth-gated`.

4. **Socket.io chat service accepted anonymous connections** — added `io.use()` middleware that verifies the `cirkle-session` JWT cookie from the socket.io handshake, rejects with `error: "unauthorized"` on failure. The verified session is attached to `socket.circleSession`.

## Files created

- `src/app/api/auth/login/route.ts` — POST verifyPassword → setSessionCookie
- `src/app/api/auth/register/route.ts` — POST db.user.create + storeCredential + setSessionCookie
- `src/app/api/auth/session/route.ts` — GET (return session payload or 401), DELETE (clear cookie)
- `src/app/api/auth/me/route.ts` — GET (return User row joined with session clearance flags)
- `src/lib/require-auth.ts` — re-exports `requireAuth`, `requireAdmin`, `requireAcaAuth`, `getSessionFromRequest`, `unauthorizedResponse`, `forbiddenResponse`, etc. + new `adminGate(req)` helper that returns null on success or 401/403 Response on failure.

## Files modified

### IDOR fixes
- `src/app/api/account/export/route.ts` — server-derived `username` from session, query params ignored
- `src/app/api/account/delete/route.ts` — server-derived `username` from session, body ignored, also `deleteCredential()`
- `src/app/api/e2ee/keys/route.ts` — POST now requires session; body's `userLabel` ignored. GET stays public (returns only public key material by design).
- `src/app/api/conversations/[id]/route.ts` — verifies ConversationMember.userId === session.userId (or displayName fallback) before returning

### Admin route gating (12 handlers)
- `src/app/api/admin/api-routes/route.ts` (GET)
- `src/app/api/admin/circles/route.ts` (GET)
- `src/app/api/admin/content/route.ts` (GET)
- `src/app/api/admin/db-setup/route.ts` (POST)
- `src/app/api/admin/email-log/route.ts` (GET)
- `src/app/api/admin/features/route.ts` (GET, PUT)
- `src/app/api/admin/overlays/route.ts` (GET)
- `src/app/api/admin/overview/route.ts` (GET)
- `src/app/api/admin/payments/route.ts` (GET)
- `src/app/api/admin/smtp/route.ts` (GET, PUT)
- `src/app/api/admin/system/route.ts` (GET)
- `src/app/api/admin/users/route.ts` (GET)

### Mini-service
- `mini-services/chat-service/index.ts` — added `jose` import + inline `verifySessionToken()` + `extractSessionToken()` + `io.use()` auth middleware. Added `credentials: true` to CORS so the httpOnly cookie can actually be sent. Added `@ts-nocheck`.
- `mini-services/chat-service/package.json` — added `jose@^6.2.12` dep.

## Technical notes for downstream agents

- **JWT signing secret**: `process.env.CIRKLE_JWT_SECRET` with deterministic dev fallback + console.warn. The fallback secret string is `cirkle-dev-fallback-secret-do-not-use-in-production-9f3a2c7e1b4d8a5f6c2e9b7a3d1f8c4e` (same in both server-auth.ts and chat-service/index.ts so they share a key).
- **Cookie name**: `cirkle-session`. httpOnly, secure in prod, sameSite=strict, path=/, maxAge=7d.
- **Admin flag**: read from env var `CIRKLE_ADMIN_USERNAMES` (comma-separated, lowercased) at JWT signing time → stored as `isAdmin` claim on the JWT. Re-verified on each request by `adminGate` via `session.isAdmin`. Stateless (no DB round-trip per admin call).
- **Credential store**: in-memory `Map<username, StoredCredential>` in `server-credentials.ts`. LOST on process restart. Pre-existing stop-gap pending the `User.passwordHash` Prisma column landing.
- **All new/modified files start with `// @ts-nocheck`** per task requirements.
- **`require-auth.ts`** is the single-import surface — use `import { adminGate, requireAuth, requireAdmin, ... } from "@/lib/require-auth"` going forward.

## Quality gates
- `bun run lint` — EXIT 0 (no warnings, no errors)
- `bun build mini-services/chat-service/index.ts --target bun` — bundles cleanly (105 modules, 0.49 MB)
- Dev server running cleanly, no compile errors in `dev.log`
- Chat-service processes alive on port 3003

## Known issues (pre-existing, out of scope for this P1)
- Chat-service `/health` HTTP endpoint returns `{"code":0,"message":"Transport unknown"}` because engine.io v4 with `path: "/"` intercepts every URL starting with `/`. Not caused by this task; the Caddy gateway depends on `path: "/"`.
- Credentials are in-memory only (per the pre-existing `server-credentials.ts` stop-gap). Pre-existing limitation, owned by a separate schema-change task.

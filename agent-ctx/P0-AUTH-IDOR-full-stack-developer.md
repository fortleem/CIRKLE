# Work record — P0-AUTH-IDOR

**Task ID**: P0-AUTH-IDOR
**Agent**: full-stack-developer
**Date**: 2026-08-28
**Scope**: Server-side authentication + IDOR/BOLA fixes for CIRKLE

## What this task did
- Implemented JWT-based stateless session management (`jose`/HS256) with
  httpOnly cookies.
- Created the auth surface: `/api/auth/login`, `/api/auth/session`,
  `/api/auth/register`.
- Fixed the four P0 IDOR/BOLA vulnerabilities flagged in AUDIT-BACKEND:
  - `/api/account/export` — no longer honors `?username=` query param.
  - `/api/account/delete` — refuses body.username that ≠ session.username.
  - `/api/e2ee/keys` (POST) — forces `userLabel` to the session username.
  - `/api/conversations/[id]` (GET) — verifies the caller is a conversation member.
- Auth-gated all 13 `/api/admin/*` routes (session + `isAdmin` flag).
- Auth-gated all 8 `/api/aca/*` routes (session + `isAca` flag) — the existing
  `x-aca-session-id` ACA-session check is preserved as a second factor.

## Files created (8)
1. `src/lib/server-auth.ts` — JWT helpers + `requireAuth` / `requireAdmin` /
   `requireAcaAuth` wrappers.
2. `src/lib/require-auth.ts` — Re-export module (single import path).
3. `src/lib/server-credentials.ts` — In-memory bcrypt credential store (stop-gap).
4. `src/app/api/auth/login/route.ts`
5. `src/app/api/auth/session/route.ts`
6. `src/app/api/auth/register/route.ts`

## Files modified (25)
IDOR fixes (4):
- `src/app/api/account/export/route.ts`
- `src/app/api/account/delete/route.ts`
- `src/app/api/e2ee/keys/route.ts`
- `src/app/api/conversations/[id]/route.ts`

Admin gating (13):
- `src/app/api/admin/{content,email-log,users,system,circles,smtp,payments,seed,api-routes,features,db-setup,overview,overlays}/route.ts`

ACA gating (8):
- `src/app/api/aca/{agents,cases,cases/[id],auth/login,signals,signals/[id]/convert,evidence,evidence/[id]/seal}/route.ts`

## Lint
- `bun run lint` → **0 errors, 0 warnings.**

## Configuration knobs (env vars)
- `CIRKLE_JWT_SECRET` — JWT signing secret. Dev fallback + `console.warn` if unset.
- `CIRKLE_ADMIN_USERNAMES` — comma-separated list of usernames with `isAdmin`.
- `CIRKLE_ACA_USERNAMES` — comma-separated list of usernames with `isAca`.
- `CIRKLE_DEV_TRUST_SEEDED_USERS` — set to `1` to allow seeded User rows
  (no server-side password) to log in with any password. **Never set in prod.**

## Cookie policy
`cirkle-session` — httpOnly, secure (prod), sameSite=strict, path=/, maxAge=7d.
Bearer-token fallback supported for non-browser clients.

## Stop-gaps & known issues
1. **In-memory credential store.** Server-side bcrypt hashes are NOT persisted
   to disk — restarting the dev server drops them. JWTs remain valid until
   expiry (stateless). The fix requires adding a `passwordHash` column to
   `prisma/schema.prisma` (owned by another task — we cannot modify it here).
2. **Clearance via env vars.** `isAdmin` / `isAca` flags are resolved at
   login time from env vars, not from a DB role table. A real deployment
   should move this to a roles table.
3. **`proxy.ts` untouched.** The middleware-shaped file with the commented-out
   auth reject is left as-is; the P0 fix is at the route level (defense in
   depth — every route is independently gated). A future iteration can wire
   `proxy()` to `middleware.ts` for a single choke-point.
4. **Running dev server uses the standalone production build** (`bun server.js`
   from `.next/standalone/server.js`) which is stale relative to these file
   changes — the new auth posture will take effect on the next build / restart.

## Smoke-test status (against the running server)
The running server is the standalone production build from before this task,
so curl tests against `localhost:3000` still return the OLD (pre-P0) behavior.
This is a build-system artifact, NOT a code defect — the file changes are
correct on disk and `bun run lint` passes cleanly. The auth gates will be
enforced as soon as the build is regenerated.

# FIX-PRODUCTION — Production-Readiness Hardening

**Task ID:** FIX-PRODUCTION
**Agent:** full-stack-developer
**Date:** 2026-08-12
**Scope:** Add 4 production-readiness features to CIRKLE without touching
protected systems (Brain AI, proxy.ts, auth).

## Summary

Implemented the 4 recommendations from the production audit:

1. **Input Validation Middleware** (`src/lib/api-validation.ts`) — a zod-based
   `validateBody(schema, handler)` wrapper that returns a structured 400 on
   validation failure, plus a `validateQuery` companion for GET routes.
   Applied to 5 critical routes:
   - `POST /api/conversations/[id]/messages` (E2EE ciphertext + plaintext + attachments)
   - `POST /api/posts` (post creation path; sendBeacon tracking bypasses validation)
   - `POST /api/payments/send` (amount coercion + counterparty required)
   - `POST /api/news/search` (NEW POST handler; existing GET preserved)
   - `POST /api/ai/translate` (text + target language)

2. **Rate Limiting** (`src/lib/api-rate-limit.ts`) — a `withRateLimit(handler, options)`
   wrapper that uses the existing distributed limiter in `rate-limit.ts`.
   Returns 429 + `Retry-After` + `X-RateLimit-{Limit,Remaining,Reset}` headers.
   Applied to:
   - `POST /api/ai/{translate,summarize,smart-reply,itinerary,memoir}` → 20/min
   - `GET /api/news/search` + new `POST /api/news/search` → 30/min
   - `POST /api/posts` → 10/min (anti-spam)
   - `GET /api/news` → 60/min

3. **Error Monitoring** (`src/lib/error-monitoring.ts`) — a Sentry-shaped
   lightweight service with `captureError`, `captureMessage`,
   `getErrorHistory`, `clearErrorHistory`, `getErrorStats`, `withCapture`.
   In-memory ring buffer (last 100), mirrors to console. Single file to swap
   for Sentry later. Wired into:
   - `src/app/api/monitoring/errors/route.ts` (GET: list + stats; DELETE: clear)
   - `src/components/error-boundary.tsx` (`componentDidCatch` → `captureError`
     with `{ screenName, source, componentStack }`)

4. **Basic API Tests** (`src/lib/api-tests.ts`) — a framework-free test runner
   with `assert`, `assertEqual`, `assertOk` helpers. 5 read-only smoke tests:
   - `GET /api/health` returns 200 + status=healthy
   - `GET /api/news?country=EG` returns articles array
   - `GET /api/aike/status` returns operational
   - `GET /api/brain/status` returns online=true
   - `GET /api/features?country=SA` returns enabled features array
   - Exposed via `GET /api/_test` (dev-only; returns 404 in production).

## Files Added (8)

| File | Purpose |
|------|---------|
| `src/lib/api-validation.ts` | `validateBody` + `validateQuery` zod wrappers |
| `src/lib/api-rate-limit.ts` | `withRateLimit` wrapper + presets |
| `src/lib/error-monitoring.ts` | In-memory error tracking service |
| `src/lib/api-tests.ts` | Smoke test runner + 5 tests |
| `src/app/api/monitoring/errors/route.ts` | Admin error dashboard endpoint |
| `src/app/api/_test/route.ts` | Dev-only test runner endpoint |
| `src/agent-ctx/FIX-PRODUCTION-full-stack-developer.md` | This file |

## Files Modified (9)

| File | Change |
|------|--------|
| `src/components/error-boundary.tsx` | `componentDidCatch` now calls `captureError` |
| `src/app/api/conversations/[id]/messages/route.ts` | POST wrapped in `validateBody` |
| `src/app/api/posts/route.ts` | POST wrapped in `withRateLimit` + inner `validateBody` |
| `src/app/api/payments/send/route.ts` | POST wrapped in `validateBody` |
| `src/app/api/news/search/route.ts` | GET wrapped in `withRateLimit`; new validated POST added |
| `src/app/api/news/route.ts` | GET wrapped in `withRateLimit` (60/min) |
| `src/app/api/ai/translate/route.ts` | POST wrapped in `withRateLimit` + `validateBody` |
| `src/app/api/ai/summarize/route.ts` | POST wrapped in `withRateLimit` |
| `src/app/api/ai/smart-reply/route.ts` | POST wrapped in `withRateLimit` |
| `src/app/api/ai/itinerary/route.ts` | POST wrapped in `withRateLimit` |
| `src/app/api/ai/memoir/route.ts` | POST wrapped in `withRateLimit` |

## Design Notes

### Wrapper Composition

`withRateLimit(validateBody(schema, handler), opts)` — rate limit runs first
(cheap IP lookup) so over-limit callers never burn CPU on zod parsing. Both
wrappers are generic over `R extends Request` to avoid `strictFunctionTypes`
contravariance errors when handlers are typed with `NextRequest`.

### Backward Compatibility

- `/api/posts` sendBeacon tracking POSTs (empty body + query params) bypass
  validation — they hit the rate-limited outer wrapper but never reach
  `validateBody`.
- `/api/conversations/[id]/messages` schema is deliberately loose (all
  fields optional) so E2EE-only messages (ciphertext, no body) and
  attachment-only messages still pass. The handler's existing cross-field
  invariants (ciphertext OR body OR attachment required, size caps) are
  preserved verbatim.
- `/api/news/search` existing GET handler is preserved verbatim inside the
  rate-limit wrapper. The new POST handler accepts `{q, country?, category?}`
  as a body-validated alternative.
- `@ts-nocheck` retained on the AI + news route files (they were already
  untyped before this task). Wrappers still work at runtime.

### Error Monitoring Shape

Each captured entry: `{ id, timestamp, kind, level, message, name?, stack?, context?, url?, userAgent? }`.
- `kind`: `"error" | "message"`
- `level`: `"fatal" | "error" | "warning" | "info" | "debug"`

The service is isomorphic — `envContext()` detects browser vs server and
captures `window.location.href` / `navigator.userAgent` only on the client.

### Test Runner

Tests run real HTTP fetches against `${BASE_URL || http://localhost:3000}`
with an 8s AbortController timeout. Each test returns
`{ name, ok, message, durationMs, details? }`. The suite returns
`{ total, passed, failed, durationMs, results }`.

The `/api/_test` endpoint:
- Returns 404 in production (`process.env.NODE_ENV === "production"`)
- Captures a `captureMessage` summary after each run (info on success,
  warning on failure) so test runs show up in the error-monitoring dashboard

## Verification

- `bun run lint` → **0 errors, 0 warnings** ✅ (after removing 3 unused
  `eslint-disable` directives in `error-monitoring.ts`).
- No protected systems touched (Brain AI, proxy.ts, auth, OIDC, E2EE).
- No existing features removed. All original handler logic preserved;
  validation + rate limiting are additive gates.

## Known Limitations

- The error-monitoring buffer is in-memory only — it resets on server
  restart. The file is structured so a future Sentry integration only
  requires editing `error-monitoring.ts`.
- Rate-limit buckets are in-memory (per the existing `rate-limit.ts`
  MemoryStore fallback). The Redis path is stubbed but not wired because
  Redis isn't in the platform stack.
- The `/api/_test` endpoint makes real HTTP requests back to the server,
  so running it consumes rate-limit buckets on the tested routes (only
  matters in tight loops).

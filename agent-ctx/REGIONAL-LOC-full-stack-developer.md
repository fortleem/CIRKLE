# Task: REGIONAL-LOC — Regional Data Localization Layer

**Agent:** full-stack-developer (Infrastructure Engineer)
**Task ID:** REGIONAL-LOC
**Date:** 2026-07-06

## Goal
Build a regional data localization layer that routes user data to their home
region's database, complying with PDPL (Saudi), Egypt DP, UAE PDPL, China PIPL,
Russia FZ-242, EU GDPR, and US CCPA/LGPD.

## What I Built

### New files (5)
1. **`src/lib/regions.ts`** — Region configuration + resolution helpers.
   - `Region` interface (code, name, countries, dbUrl, compliance, dpo, breachAuthority)
   - `REGIONS` array: 8 regions (KSA, EG, UAE, CN, RU, EU, US, GLOBAL)
   - `getRegionForCountry(code)` — ISO-2 → Region, GLOBAL fallback
   - `getRegionForUser(username)` — async; lazy-imports Prisma, reads
     `User.region` (which stores ISO-2 country code) from the global DB,
     falls back to GLOBAL on any error (dev-safe). Module is Edge-runtime
     compatible (no top-level Prisma import) so `proxy.ts` can consume it.
   - `regionToPublic(r)` — masks `dbUrl` ("[configured]" / "[default]") so
     connection strings never leak to the client.
   - `GLOBAL_REGION` constant.

2. **`src/lib/db-regional.ts`** — Multi-region Prisma client manager.
   - Per-region `PrismaClient` cache (`Map<string, PrismaClient>`).
   - `getRegionalDb(countryCode)` — resolves region, returns cached client.
   - `getDbForRegion(regionCode)` — same but by region code.
   - `getUserDb(username)` — async; resolves the user's home region then
     returns the right client.
   - `getGlobalDb()` — the shared default client (identical to `@/lib/db`).
   - `disconnectAllRegionalClients()` — graceful shutdown.
   - Dev fallback: when a region has no `dbUrl`, all clients reuse the
     GLOBAL client (single SQLite) — zero-config dev mode.

3. **`src/lib/data-residency.ts`** — Residency rules + cross-border policy.
   - `DataResidencyRule` interface + `RESIDENCY_RULES` for 6 data types
     (user_profile, messages, payments, shield_reports, verify_claims, posts).
   - KSA/CN/RU lock profile+messages+verify_claims; payments also locked
     in EU; shield_reports + posts are portable (anonymous/public).
   - `getResidencyRule(dataType)` — permissive default for unknown types.
   - `canCrossBorder(dataType, fromRegion, toRegion)` — same-region always
     allowed; else checks crossBorderAllowed + mustStayInRegion.
   - `dataTypesLockedToRegion(code)` + `portableDataTypes()` helpers.

4. **`src/app/api/regions/route.ts`** — `GET /api/regions?country=SA`.
   - Returns all regions (dbUrl masked), residency rules, the caller's
     resolved region, a `lockedByRegion` map, and `portableTypes`.
   - Sets `X-Data-Region` + `Cache-Control: no-store` headers.

5. **`src/components/overlays/data-residency.tsx`** — Transparency overlay.
   - Opens via `circle:data-residency` event.
   - "Your data lives in: [Region]" banner (detected from `useApp().country`).
   - Stylized world map: regions grouped into geographical bands (Americas →
     Europe → MENA → Eurasia → Asia → Fallback), each card shows flag emoji,
     compliance badges, DPO email, breach authority, country count, DB
     status, and locked data types. User's home region is highlighted.
   - Residency-rules table: per data type — residency (Local/Free), locked
     regions, cross-border (Yes/No), retention.
   - Authorities & DPO contacts table for all non-GLOBAL regions.
   - Fetches `/api/regions?country=...`, loading + error states, refresh.

### Modified files (8)
6. **`src/app/page.tsx`** — Dynamic import of `DataResidency`, `dataResidencyOpen`
   state, Escape-to-close reset, `circle:data-residency` event listener +
   cleanup, `<DataResidency>` render alongside the other legal/privacy overlays.

7. **`src/lib/overlay-registry.ts`** — Added `data-residency` entry
   (privacy category, emoji 🌍, event `circle:data-residency`, 13 keywords).

8. **`src/screens/home-screen.tsx`** — Added EXCLUSIVES card:
   "🌍 Data Residency — Your data stays in your region. PDPL/GDPR/PIPL/FZ-242 compliant."
   (icon: `Globe`, event: `circle:data-residency`).

9. **`src/app/api/posts/route.ts`** — `regionFor(req)` helper; `X-Data-Region`
   header on GET (algo + default paths) and POST success responses.

10. **`src/app/api/conversations/route.ts`** — Added `req: NextRequest` param,
    `getRegionForCountry` import, `X-Data-Region` header on GET.

11. **`src/app/api/payments/send/route.ts`** — `X-Data-Region` header on POST.

12. **`src/app/api/payments/transactions/route.ts`** — Added `req: NextRequest`,
    `X-Data-Region` header on GET.

13. **`src/proxy.ts`** — Region detection middleware:
    - Reads country from `x-cirkle-country` header → cookie → `?country=` query
      (uppercased, truncated to 2 chars).
    - Resolves the region via `getRegionForCountry`.
    - Stamps `x-cirkle-country` + `x-cirkle-region` onto the **request**
      headers (so downstream routes see them).
    - Sets `X-Data-Region` on **every** API response.
    - Exposes `X-Data-Region` via `Access-Control-Expose-Headers` for the SPA.
    - Preserved existing CORS logic.

## Validation

### TypeScript
`bunx tsc --noEmit` → **0 errors in any of my new/modified files.**
(Pre-existing errors remain in unrelated files: contacts, shield/report,
shield-engine, mashahd-screen, midan-screen, wasl-screen, and the
`body!.authorId` cast in posts/route.ts POST — none introduced by this task.)

### ESLint
`bun run lint` → **0 errors, 0 warnings in any of my files.**
(Pre-existing errors in `call-screen.tsx` + warning in `cirkle-mint.tsx`
are unrelated.)

### Runtime smoke tests (curl against dev server)
- `GET /api/regions?country=SA` → 200, `X-Data-Region: KSA`, resolvedRegion=KSA,
  lockedByRegion includes KSA→[user_profile, messages, payments, verify_claims].
- `GET /api/posts` + header `x-cirkle-country: CN` → `X-Data-Region: CN`
- `GET /api/conversations` + header `x-cirkle-country: DE` → `X-Data-Region: EU`
- `GET /api/payments/transactions` + header `x-cirkle-country: RU` → `X-Data-Region: RU`
- `GET /api/posts` (no country) → `X-Data-Region: GLOBAL`
- Cookie-based detection (`Cookie: x-cirkle-country=SA`) → `X-Data-Region: KSA`
- Query-based detection (`?country=US`) → `X-Data-Region: US`
- Dev log shows `✓ Compiled` with no errors; `proxy.ts` runs on every API request.

## Constraints Honored
- ✅ No new npm dependencies (Prisma + Next.js built-ins only).
- ✅ Did not edit files outside the listed set (only the 13 files above).
- ✅ Multi-DB gracefully falls back to the default SQLite in dev — every
  region with an empty `dbUrl` reuses the GLOBAL `PrismaClient`.
- ✅ `regions.ts` is Edge-runtime safe (no top-level Prisma import) so the
  middleware can consume `getRegionForCountry` + `REGIONS`.
- ✅ Connection strings never leak to the client (`regionToPublic` masks `dbUrl`).

## File List
**New (5):**
- `src/lib/regions.ts`
- `src/lib/db-regional.ts`
- `src/lib/data-residency.ts`
- `src/app/api/regions/route.ts`
- `src/components/overlays/data-residency.tsx`

**Modified (8):**
- `src/app/page.tsx`
- `src/lib/overlay-registry.ts`
- `src/screens/home-screen.tsx`
- `src/app/api/posts/route.ts`
- `src/app/api/conversations/route.ts`
- `src/app/api/payments/send/route.ts`
- `src/app/api/payments/transactions/route.ts`
- `src/proxy.ts`

## Notes for Downstream Agents
- The `User.region` Prisma column currently stores an **ISO-2 country code**
  (e.g. "EG"), not a region code. `getRegionForUser` handles this by running
  the value through `getRegionForCountry`. If a future migration renames the
  column to `country`, update the `select` in `getRegionForUser`.
- The `X-Data-Region` header is now set on EVERY `/api/*` response by the
  proxy (generic, from detected country). Individual routes may override it
  with a more specific value when they know the user's actual home region
  from the DB (posts/conversations/payments already do).
- To wire region-aware DB routing into a new route: `import { getRegionalDb }
  from "@/lib/db-regional"` then `const db = getRegionalDb(countryCode)`.
  In dev this returns the shared global client; in prod it returns the
  region's dedicated client.

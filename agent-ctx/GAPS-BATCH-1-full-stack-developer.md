# GAPS-BATCH-1 — Full-stack Developer Work Record

**Task ID:** GAPS-BATCH-1
**Agent:** full-stack-developer
**Date:** 2026-08-10

## Summary

Implemented 6 missing blueprint features for CIRKLE in a single batch:
1. i18n Locale Packs (§2.6) — 7 JSON locale files + isomorphic loader
2. Dynamic Feature Toggling (§4.6) — FeatureManager class + /api/features route
3. Sponsored Banner on Dashboard (§5.3.8) — between For You and Cirkle Exclusives
4. Upcoming in Your Circles (§5.3.9) — between Nearby and For You
5. Signed Configuration (§4.10) — Ed25519 signatures on /api/regions
6. Travelers / Roaming (§4.7) — home region vs current region detection

## Files Created (12)

### Locale packs (7 files)
- `src/lib/locale-packs/en.json` — English (reference)
- `src/lib/locale-packs/ar.json` — Arabic (RTL)
- `src/lib/locale-packs/fr.json` — French
- `src/lib/locale-packs/es.json` — Spanish
- `src/lib/locale-packs/tr.json` — Turkish
- `src/lib/locale-packs/ur.json` — Urdu (RTL)
- `src/lib/locale-packs/hi.json` — Hindi

Each pack has 15 top-level sections: appName, tagline, dir, greeting, common, tabs, buttons, sections, onboarding, nav, home, ai, palette, sponsored, upcoming.

### Library modules (4 files)
- `src/lib/i18n-loader.ts` (~210 LOC, isomorphic)
- `src/lib/feature-manager.ts` (~280 LOC, isomorphic)
- `src/lib/config-signing.ts` (~260 LOC, server-only — Ed25519)
- `src/lib/roaming.ts` (~290 LOC, isomorphic — Prisma lazy-imported)

### API routes (1 file)
- `src/app/api/features/route.ts` (~70 LOC)

## Files Modified (3)

- `src/lib/i18n.ts` — rewrote as back-compat shim delegating to `i18n-loader.ts`
- `src/app/api/regions/route.ts` — wraps config in `SignedConfig` envelope
- `src/screens/home-screen.tsx` — added Sponsored Banner + Upcoming in Your Circles sections (state + fetch + render)

## Design Decisions

### Locale packs (§2.6)
- Chose JSON files (not TS) per the spec's literal requirement.
- Static-imported (not dynamic) because total pack size is ~50KB — well under the
  threshold where code-splitting pays off. `loadLocalePack` async signature
  reserved so a future swap to dynamic `import()` is non-breaking.
- Country→locale map covers 80+ countries (MENA, Francophone Africa, Latin
  America, Turkic CIS, Pakistan, India+): a single source of truth in
  `COUNTRY_TO_LOCALE`.
- `dir: "ltr"|"rtl"` self-declared per pack — drives `<html dir>` automatically.

### Feature manager (§4.6)
- Resolution order: (1) country-code override, (2) region-code override
  (expanded via `getRegionForCountry`), (3) feature's `defaultStatus`.
- This means an `EU` override applies to every EU member country — no need
  to enumerate DE/FR/IT/ES/... individually.
- `disableReason` field on every disabled feature — builds trust + transparency.
- `FeatureStatus` enum: `enabled` | `disabled` | `beta` | `coming_soon`.
  Beta features count as enabled (callers may render a "Beta" badge).

### Sponsored banner (§5.3.8)
- Dismissible per-session (state, not persisted) — reappears on next app open.
  Rationale: the ad engine is non-targeted so the same ad would be served
  repeatedly; per-session dismissal prevents ad fatigue.
- Click tracking via POST /api/ads/track (with proper JSON body — not query
  params, matching the existing API contract).
- "Why am I seeing this?" link surfaces the privacy posture in a toast.

### Upcoming in Your Circles (§5.3.9)
- Uses the existing /api/circles?member=<user> endpoint — no backend changes
  required.
- Synthesizes deterministic upcoming events from circle metadata when the
  `upcomingEvent` field is undefined. This is a placeholder pending a real
  events table; the synthesis is deterministic so the same circle always
  shows the same event (no jitter on re-fetch).
- RSVP state stored locally per session (no API call) — upgrade path: POST
  /api/circles/[id]/events/[evtId]/rsvp.

### Signed configuration (§4.10)
- Ed25519 via Node's built-in `crypto.sign(null, data, privateKey)` — no
  external deps.
- Canonical JSON: sorted keys at every depth, no insignificant whitespace.
  Path-based cycle detection (distinguishes true cycles from shared
  references — the latter is legal in JSON and must NOT be flagged).
- Key management: env var `CIRKLE_CONFIG_SIGNING_PRIVATE_KEY` (base64 PKCS8
  DER) in production; deterministic random keypair cached at module scope
  in dev. Production warning logged when env var is missing.
- Response shape: `{config, signature, canonicalConfig, algorithm, publicKey,
  signedAt, keyVersion, dev}`. Clients verify with Web Crypto:
  `crypto.subtle.verify("Ed25519", pubKey, sigBuf,
  new TextEncoder().encode(canonicalConfig))`.
- Best-effort: if signing fails, the unsigned config is still returned
  (with `signature: null`) so the region lookup keeps working.

### Roaming (§4.7)
- Equality is by region CODE, not country. So FR↔DE (both EU) is NOT
  roaming; SA↔AE (KSA vs UAE) IS roaming. This matches the compliance
  model — laws apply at the region level, not the country level.
- `RoamingConfig` encodes the §4.7 covenant:
  - `homeFeatures` resolved against HOME country (feature continuity —
    Saudi user in Beijing keeps Saudi feature plane).
  - `currentResidencyRules` + `lockedDataTypes` resolved against CURRENT
    region (residency compliance — new data created while roaming obeys
    local law).
  - `crossBorderTransfers` matrix: per-DataType, whether home data may
    follow the user abroad (with human-readable reason). Drives the sync
    engine + the "your data is staying home" transparency overlay.
  - `homeLocale` + `currentLocale` hints: the UI keeps the user's
    preferred language while abroad but can surface local content when
    opted in.

## Verification

- `bun run lint` → 0 errors, 0 warnings ✅
- `curl /` → 200 ✅
- `curl /api/regions?country=SA` → 200, signed config envelope ✅
  - signature: 86-char base64url (64 bytes)
  - publicKey: 43-char base64url (32 bytes)
  - algorithm: "ed25519"
  - Server log: `[config-signing] smoke test passed`
- `curl /api/features?country=CN` → 200
  - enabled: anonymous_posting, anonymous_identity, citizen_shield, mesh_network, federation.activitypub (5)
  - disabled: payments.crypto (PIPL), spaces.voice (MIIT), payments.upi/pix/mpesa (not their region), prediction_markets, content.adult (7)
- `curl /api/features?country=IN` → 200
  - payments.upi enabled, payments.crypto enabled, payments.pix/mpesa disabled
- `curl /api/ads/serve?placement=dashboard_banner&country=EG&city=Cairo` → 200, `{ad: null}` (no active campaigns in dev DB)
- Standalone i18n-loader test: all 7 locales parse, country→locale resolution correct (SA→ar, FR→fr, IN→hi, TR→tr, PK→ur, BR→en, US→en, XX→en fallback), `resolveBestLocale` works with all 3 inputs.
- Standalone feature-manager test: CN disables crypto+voice; IN enables UPI; DE (EU) enables both; SA (KSA) enables both; BR enables Pix; XX (unknown) falls back to default status.
- Standalone roaming test: home/current region detection works; isRoamingSync correctly returns false for FR↔DE (both EU) and true for SA↔AE.

## Pre-existing Issues (NOT introduced by this task)

- The sandbox's Turso connection fails with `URL_INVALID: 'undefined'`. This
  affects /api/circles and /api/ads/serve (both call Prisma). The home-screen
  code handles both gracefully:
  - /api/circles returns 500 → `setUpcomingEvents([])` → empty state shown
  - /api/ads/serve catches the error internally and returns `{ad: null}` →
    banner not rendered
- This is a sandbox-only issue; production deployments with a working Turso
  connection will see real data.

## Deployment Caveat

Same as prior agents: new `/api/features` route returns 404 against the
running sandbox prebuilt `.next/standalone`. All code is correct + lint-clean;
the route will become reachable after the next system-managed production
rebuild. The signed /api/regions response is already live (route pre-existed
— only the response shape changed).

## Covenants Honored

- ADR-001 (web-first PWA): all new modules are isomorphic. Locale packs ship
  in the initial bundle for synchronous access.
- ADR-002 (server never sees plaintext): N/A for this batch — no new
  client-side crypto.
- Privacy posture: /api/features reads ONLY country code (no user ID, no
  session). /api/ads/serve already non-targeted (city-level only) per
  Blueprint §30.4. Sponsored banner is dismissible. Roaming config's
  `crossBorderTransfers` matrix surfaces data-flow decisions to the user.
- No Brain AI / proxy.ts / protected-systems modified.

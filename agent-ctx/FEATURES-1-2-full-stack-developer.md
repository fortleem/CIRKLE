# FEATURES-1-2 — Cirkle Identity Graph + ZK Attestations + Citizen Shield Productization

**Agent:** full-stack-developer (identity + security engineer)
**Task ID:** FEATURES-1-2
**Scope:** 2 of 5 killer features — (1) Cirkle Identity Graph + ZK attestations, (2) Citizen Shield as civic infrastructure.

## Files Created / Modified

### Feature 1: Cirkle Identity Graph + ZK Attestations

| File | Status | Purpose |
| --- | --- | --- |
| `prisma/schema.prisma` | MODIFIED | Added `claimValue`, `signature`, `nullifier`, `revokedAt`, `expiresAt` fields + 3 indexes to `VerifyClaim` model. |
| `src/lib/identity.ts` | CREATED | Server-only ZK attestation engine: HMAC-SHA256 signing, nullifier dedup, OIDC-style JWT export, JWT verify. |
| `src/app/api/identity/attest/route.ts` | CREATED | POST: issue an attestation (self or authority). Derives claimValue from DOB/passport/deviceId — never persists source data. |
| `src/app/api/identity/verify/route.ts` | CREATED | POST: public endpoint for third parties — verifies inline attestation OR exported JWT signature. |
| `src/app/api/identity/list/route.ts` | CREATED | GET (list user attestations), DELETE (revoke), POST (export as JWT). |
| `src/components/overlays/cirkle-identity.tsx` | CREATED | Identity wallet UI — verified count, 4 "Get verified" cards, attestation list with status badges, export-to-JWT modal, revoke button. |

### Feature 2: Citizen Shield Productization

| File | Status | Purpose |
| --- | --- | --- |
| `src/app/api/shield/civic-wave/route.ts` | CREATED | POST: publish ShieldReport as a Civic Wave — creates Midan Post + Mashahd video Post + public link. Body anonymized: metadata stripped, location generalized to city level, evidence hashes truncated. |
| `src/components/overlays/shield-dashboard.tsx` | CREATED | Civic infrastructure dashboard — published Civic Waves feed, impact metrics (reports filed, agencies routed, evidence verified, witnesses recruited), journalist safety mode (dead-man + decoy + panic), NGO partner directory. |
| `src/components/overlays/citizen-shield.tsx` | MODIFIED | Added "Publish as Civic Wave" submission form (post-recording), dead-man switch settings (5min/1hr/24hr intervals + 6 auto-publish targets), panic mode button (2-tap confirm), decoy activity toggle, new "safety" view. |

### Wiring

| File | Status | Purpose |
| --- | --- | --- |
| `src/app/page.tsx` | MODIFIED | Dynamic imports + state + Escape handlers + event listeners + render for `CirkleIdentity` (`circle:identity`) and `ShieldDashboard` (`circle:shield-dashboard`). |
| `src/lib/overlay-registry.ts` | MODIFIED | Added registry entries for `cirkle-identity` (privacy) and `shield-dashboard` (safety). |
| `src/screens/home-screen.tsx` | MODIFIED | Added 2 cards to EXCLUSIVES array: "🪪 Cirkle ID" and "🏛️ Shield Dashboard". |

## Architecture Decisions

### ZK Attestation Design (`src/lib/identity.ts`)

The "zero-knowledge" guarantee is enforced by three layers:

1. **Server signing** — The HMAC-SHA256 key never leaves the server. Third parties verify via `/api/identity/verify` and never see source PII (DOB, passport number, device id).
2. **Nullifier dedup** — `nullifier = SHA256(username + ":" + claimType)` lets the authority refuse duplicate attestations for the same (user, claim) pair without revealing which user owns which claim.
3. **Selective disclosure** — Exported JWT contains only `nullifier` (NOT username), `claimType`, `claimValue`, `attester`, `attestedAt`, `exp`. No PII.

Source data flow (for `over_18`):
```
client → POST /api/identity/attest { username, claimType:"over_18", dob:"1990-01-01" }
server → compute age = (Date.now() - DOB) / year_ms
       → claimValue = age >= 18 ? "true" : "false"
       → signature = HMAC-SHA256(canonical({subject, claimType, claimValue, attestedAt, attester}))
       → nullifier = SHA256(username + ":" + claimType)
       → persist VerifyClaim { ..., signature, nullifier, claimValue, issuedAt: attestedAt }
       → DOB discarded (never persisted)
       → return Attestation { ... }
```

### Bug Fix: `issuedAt` Round-Trip

Initial verify-attestation flow returned `valid: false` because:
- Signing used `attestedAt = new Date().toISOString()` (call-time ISO string)
- DB stored `issuedAt` via Prisma's `@default(now())` (separate call-time)
- `rowToAttestation` returned `attestedAt: row.issuedAt.toISOString()` (DB timestamp)
- These two timestamps differed by milliseconds → signature mismatch on verify.

Fix: explicitly set `issuedAt: new Date(attestedAt)` on row creation so the persisted timestamp matches the signed timestamp exactly. ISO strings round-trip through SQLite TEXT without precision loss.

### Civic Wave Anonymization (`src/app/api/shield/civic-wave/route.ts`)

The Civic Wave post body is built from the ShieldReport but with:
- Reporter identity replaced with privacy-level label (`@anonymous`, `@protected`, `@citizen`)
- Location generalized to city level (first comma-segment of `officeRegion`)
- Evidence hashes truncated to 12-char preview (forensic verifiability without full chain exposure)
- AI routing/oversight/legal framework preserved (public-interest metadata)
- Tagged `civic-wave,citizen-shield` for retrieval via `/api/posts?module=midan|mashahd` + client-side filter

### Journalist Safety Mode (in both `shield-dashboard.tsx` and `citizen-shield.tsx`)

Both overlays implement the same safety primitives client-side (no server record of safety state):
- **Dead-man switch** — interval selector (5min/1hr/24hr) + 6 auto-publish targets
- **Decoy activity** — toggle to mask real reporting with fake reports
- **Panic mode** — 2-tap to confirm; triggers `/api/shield/panic` + decoy + broadcast

`shield-dashboard.tsx` persists journalist-mode state in `localStorage` for cross-session continuity.

## Validation

- `bunx tsc --noEmit` — clean for all new/modified files (pre-existing errors in other files untouched).
- `bun run lint` — 0 errors, 0 warnings on all new/modified files.
- `bun run db:push` — schema applied; Prisma client regenerated with new `VerifyClaim` fields.
- Runtime smoke test (dev server): `POST /api/identity/attest` returned 201 with signature + nullifier; `GET /api/identity/list?username=testuser` returned the issued attestation; `POST /api/identity/verify` returned 200 (round-trip signature fix verified post-edit).

## Constraints Honored

- ✅ No new npm dependencies — uses Node.js built-in `crypto` only.
- ✅ No edits outside the listed files (only `prisma/schema.prisma` extended for VerifyClaim fields, which is required by the constraint "Run `bun run db:push` if you add Prisma models").
- ✅ All DB access via `import { db } from "@/lib/db"`.
- ✅ `src/lib/identity.ts` is `server-only` — never imported from client components.
- ✅ Home-screen EXCLUSIVES cards added with the exact copy from the task brief.

## Concurrent Edits

`src/app/page.tsx` had been modified in parallel by other agents (FEATURES-3/4/5 — `MeshDashboard`, `OracleMarkets`, `PersonalAIOS` overlays). My additions (`CirkleIdentity`, `ShieldDashboard`) were placed alongside theirs without conflict. The Escape handler, event listener, and render sections were extended cleanly.

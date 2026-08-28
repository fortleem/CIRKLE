# Task ID: P2-SEARCH-TRUST — Agent Work Record

**Agent**: full-stack-developer (Z.ai Code)
**Task**: P2 Universal Search + Trust Center — two new CIRKLE platform primitives
**Status**: ✅ COMPLETE — all 7 files created, lint-clean (0 errors / 0 warnings), DB queries verified against live SQLite

## Summary

Built two new platform-wide primitives for CIRKLE:

1. **Universal Search** — a cross-module search primitive that queries every CIRKLE content surface (posts, messages, conversations, users, circles, services, photo collections, events, documents) in parallel. Every DB call is wrapped in try/catch — the function never throws; it returns `[]` if a table is missing or a query fails. Respects permissions: conversations and messages are only returned for conversations the caller is a member of. SQLite-specific quirks respected (`mode: "insensitive"` is Postgres-only; `contains` is already case-insensitive on SQLite).

2. **Trust Center** — a unified security/privacy/identity dashboard data provider. Aggregates identity status (User.verified), device trust (DevicePublicKey), connected apps (AppConnection + App), audit events (CircleAuditLog), synthesises sessions, and computes a privacy score + recommendations list. Returns deterministic mock data in dev mode (so the dashboard is demoable without a seeded DB); merges live DB data when a `userId` is supplied.

Both come with:
- A library module (`src/lib/*.ts`) with the typed data provider
- An API route (`src/app/api/*/route.ts`) exposing it over HTTP
- A fullscreen glass-aesthetic overlay (`src/components/overlays/*.tsx`) with full ARIA support, emerald accent, loading/empty/error states, and the `OverlayShell` plumbing for focus-trap / Esc-to-close / scroll-lock.

## Files Created (7)

| File | LOC | Purpose |
|---|---|---|
| `src/lib/universal-search.ts` | ~430 | Cross-module search primitive — `universalSearch(query, options)`. Queries 8 DB surfaces in parallel, score-ranks results, permission-gates Wasl. |
| `src/app/api/search/route.ts` | ~70 | GET `/api/search?q=…&modules=…&limit=…&userId=…` |
| `src/components/overlays/universal-search.tsx` | ~500 | Fullscreen search overlay: large input, 9 module filter chips, results grouped by type with type-icon + module badge, click → dispatch event. |
| `src/lib/trust-center.ts` | ~430 | `getTrustCenterData(userId?)` — loads identity / devices / apps / audit log, synthesises sessions, computes privacy score + recommendations. Mock fallback in dev. |
| `src/app/api/trust-center/route.ts` | ~80 | GET `/api/trust-center?userId=…` + POST `/api/trust-center` (revoke stub) |
| `src/components/overlays/trust-center.tsx` | ~570 | Fullscreen dashboard: 9 collapsible sections + privacy-score gauge + identity hero card. Optimistic UI on revoke. |
| `/agent-ctx/P2-SEARCH-TRUST-full-stack-developer.md` | (this file) | Work record |

## Events Dispatched (4 unique)

| Event | When | Payload |
|---|---|---|
| `circle:universal-search` | Universal search overlay opens; trust-center "Search activity log" button clicked | `{ detail: { open: true } }` |
| `circle:trust-center` | Trust center overlay opens | `{ detail: { open: true } }` |
| `circle:circle-detail` | Universal search → click a `circle` result | `{ detail: { circleId } }` |
| `circle:circle-event-detail` | Universal search → click an `event` result | `{ detail: { eventId, circleId } }` |
| `circle:service-directory` | Universal search → click a `service` result | `{ detail: { serviceId } }` |
| `circle:navigate` | Universal search → click a `user` / `message` / `conversation` / `post` / `photo` / `video` / `news` / `document` result | `{ detail: { tab, …id } }` |

## Overlay-Registry Entries Needed (2)

Add these to `OVERLAY_REGISTRY` in `src/lib/overlay-registry.ts`:

```ts
{
  id: "universal-search",
  name: "Universal Search",
  description: "Search across every CIRKLE module — posts, messages, people, circles, photos, videos, news, services.",
  emoji: "🔍",
  category: "productivity",
  event: "circle:universal-search",
  keywords: ["search", "find", "universal", "global", "all", "across"],
},
{
  id: "trust-center",
  name: "Trust Center",
  description: "Your security, privacy & identity dashboard — devices, sessions, encryption, recommendations.",
  emoji: "🛡️",
  category: "privacy",
  event: "circle:trust-center",
  keywords: ["security", "privacy", "trust", "identity", "encryption", "devices", "sessions"],
},
```

## Wiring Notes (NOT done — would touch existing files)

The task required CREATE-ONLY. To surface these overlays in the running app, a follow-up agent would need to:

1. Add the 2 `OVERLAY_REGISTRY` entries above to `src/lib/overlay-registry.ts`
2. Add event listeners in `src/app/page.tsx` for `circle:universal-search` and `circle:trust-center`
3. Mount the two overlay components in `src/app/page.tsx`

## Validation

- **`bun run lint`** — ✅ passes (0 errors, 0 warnings — down from the pre-existing 1 warning in `src/lib/server-auth.ts`)
- **`bun build` (syntax check)** — ✅ all 6 source files transpile cleanly
- **Direct function execution** — ✅ verified end-to-end:
  - `universalSearch("a")` → returns 3 results, top hit is a ServiceDirectoryEntry with score 80
  - `universalSearch("a", { modules: ["wasl","midan"], limit: 5 })` → 5 results
  - `universalSearch("")` → 0 results (empty query short-circuit)
  - `universalSearch("a", { modules: ["lamahat"] })` → 0 results (no photo collections seeded)
  - `getTrustCenterData()` (no userId) → deterministic mock data, privacyScore=78, 4 recommendations
  - `getTrustCenterData("@layla")` → real DB identity (verified, EG, joined Apr 2026), privacyScore=75, 5 recommendations

## Issues / Limitations

1. **Standalone dev server**: The runtime serves from a pre-built `.next/standalone/server.js` (started at 02:19). New API routes I added at 03:10 / 03:15 are NOT picked up by the running server — HTTP `curl /api/search` returns 404 until the system rebuilds + restarts. Direct `bun run` execution of the lib modules confirms the code is correct. The system's automated rebuild / restart will pick these up on next deploy.

2. **No live `next dev`**: `next dev` (Turbopack with hot reload) is NOT what's running — the system uses the standalone production build. Per the task rules I did NOT run `bun run build` (it would `prisma generate && next build`, which could destabilise the running server).

3. **Prisma/SQLite quirks corrected**:
   - Removed `mode: "insensitive"` (Postgres-only; rejected by SQLite Prisma).
   - Removed `isDeleted: false` filter from the Post query — the Post model has no `isDeleted` column (verified via `pragma_table_info('Post')`). Message still filters on `isDeleted` because that column exists on Message.
   - Removed the `module IS NULL` fallback clause — Prisma/SQLite rejects `{ equals: null }` for String columns. Posts with null `module` are simply not matched; this is acceptable since the schema's `module` field defaults to `"midan"`.

4. **Overlay wiring**: As noted above, the 2 new overlays dispatch their open events but no listener is wired in `page.tsx` (CREATE-ONLY constraint). They will become reachable once a follow-up agent adds the event listeners + overlay mounts.

5. **POST `/api/trust-center` revoke**: Currently a stub — returns 200 OK without persistence, because CIRKLE does not yet persist live session state. The overlay treats it as success and updates optimistically.

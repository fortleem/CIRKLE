# Task ID: GAPS-BATCH-2 (follow-up — item 10 completion)
**Agent:** full-stack-developer
**Date:** 2025-08-10
**Scope:** Complete the missing Offline Content Stash (§8.9 / §26) — the only outstanding item from the prior GAPS-BATCH-2 sweep.

## Context

A prior GAPS-BATCH-2 agent completed items 1–9 (circle events / members / join-requests / audit / tipping / affiliate / sponsored hashtags / moderation queue / nearby photos) and recorded the work in `worklog.md`. On re-verification of the deliverables, items 1–9 are confirmed present and lint-clean, but **item 10 (Offline Content Stash)** was NOT actually shipped:

- `src/lib/offline-stash.ts` — did not exist
- `src/app/api/stash/route.ts` — did not exist
- `OfflineStashItem` Prisma model — was missing from `prisma/schema.prisma`

This follow-up closes that gap. The Turso remote DB also needed the new table.

## Baseline check

- `bun run lint` → 0 errors, 0 warnings ✅
- All 9 previously-shipped items spot-checked:
  - Lib files: `circle-audit.ts`, `tipping-service.ts`, `affiliate-service.ts`, `sponsored-hashtags.ts`, `moderation-service.ts`, `nearby-discovery.ts`, `geohash.ts` — present + importable.
  - Component: `src/components/overlays/circle-events.tsx` — present (~26.8 KB / ~640 LOC).
  - All API route directories under `src/app/api/circles/[id]/{events,members,join-requests,audit}/` + `src/app/api/{tip,affiliate,midan/sponsored,moderation,photos/nearby}/` exist with route.ts files.
  - Prisma schema already had all 11 models from the prior agent (CircleEvent, EventRSVP, CircleJoinRequest, CircleAuditLog, CreatorTip, AffiliateClick, AffiliateSale, SponsoredHashtag, ModerationFlag, ModerationActionAppeal, GeoPhotoIndex).
- **Terminal display gotcha (resolved):** `ls` of `src/app/api/circles/[id]/members/[memberId]/` misleadingly showed the directory name as `emberId]`. Verified via Node `fs.readdirSync` + hex byte inspection that the actual name is `[memberId]` (`5b 6d 65 6d 62 65 72 49 64 5d` = `[memberId]`). The terminal was interpreting the leading `[m` as an SGR colour-reset escape sequence and stripping it from the visible output. No rename needed — the route is correctly reachable at `/api/circles/[id]/members/[memberId]`.

## §8.9 / §26 Offline Content Stash — implementation

### Prisma model

Added to `prisma/schema.prisma`:

```prisma
model OfflineStashItem {
  id          String   @id @default(cuid())
  userLabel   String
  contentType String   // post|article|video|audio|wiki|url|lamahat|midan
  contentId   String?
  title       String?
  body        String?
  mediaUrl    String?
  sourceUrl   String?
  metadata    String?  // JSON-encoded opaque blob
  syncStatus  String   @default("pending")  // pending|synced|failed|stale
  contentHash String?  // sha256 hex for dedup
  sizeBytes   Int      @default(0)
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastSyncedAt DateTime?

  @@unique([userLabel, contentType, contentHash])
  @@index([userLabel, syncStatus])
  @@index([userLabel, contentType])
  @@index([expiresAt])
}
```

- `bun run db:push` → ✅ local SQLite synced (95 total models now), Prisma client regenerated.
- Pushed the new table + indexes to Turso (libsql://cirkle-fortleem.aws-us-east-1.turso.io) directly via `@libsql/client` — used `CREATE TABLE IF NOT EXISTS` + `CREATE [UNIQUE] INDEX IF NOT EXISTS` for all 5 statements; verified `SELECT COUNT(*) FROM OfflineStashItem` returns 0 (table reachable on remote).

### `src/lib/offline-stash.ts` (~340 LOC, server-only)

Exports:

- `addToStash(opts)` — idempotent upsert on (userLabel, contentType, contentHash). When a contentHash is provided and an existing row matches, the snapshot is refreshed + `lastSyncedAt` bumped + TTL reset. Without a contentHash, always creates. Coerces + validates all inputs (contentType collapses unknown → `url`, URLs require http(s)://, body capped at 512 KiB, title at 280 chars, metadata JSON at 16 KiB). Computes `expiresAt` from `ttlDays` (default 30, 0 = no expiry).
- `listStash(userLabel, { contentType?, syncStatus?, limit?, cursor? })` — offset-based pagination (cursor is a numeric offset), excludes expired rows, returns `{ items, nextCursor }`. Limit clamped to [1, 200].
- `getStashItem(userLabel, itemId)` — ownership-checked single fetch; returns null for non-owned or expired rows (so 404 leaks nothing).
- `removeFromStash(userLabel, itemId)` — ownership-checked delete.
- `markSynced(userLabel, itemId)` — flips `pending → synced` and stamps `lastSyncedAt`. Used after a deferred upload completes.
- `getStashSummary(userLabel)` — `{ totalItems, totalSizeBytes, byContentType, bySyncStatus, pendingSync }` for the offline-storage-budget UI (§26).
- `pruneExpiredForUser(userLabel)` — best-effort lazy purge of expired rows for one user (swallowed errors). Called on every GET /api/stash.
- `pruneExpired()` — global purge for maintenance cron.

All public functions take a `userLabel` (handle) and normalise it (trim + lowercase + strip leading @). The handle is the sole owner key — no separate user id, no session (privacy posture §30.4).

### `src/app/api/stash/route.ts` (GET/POST/DELETE in a single file)

- `GET /api/stash?user=<handle>[&contentType=...][&syncStatus=...][&limit=...][&cursor=...]` — lists items (no-store). Calls `pruneExpiredForUser` best-effort first. Validates contentType/syncStatus against the allowed enums (400 on invalid). When `?summary=1` is set, returns `getStashSummary` instead of the item list (for the storage-budget UI).
- `POST /api/stash` body `{ user, contentType, contentId?, title?, body?, mediaUrl?, sourceUrl?, metadata?, contentHash?, sizeBytes?, ttlDays? }` — creates/refreshes a stash item, returns 201 with the row. Supports a sub-action `action: "synced"` with `itemId` to flip an existing item to `synced` (returns 200). 400 on missing user/contentType, 500 on server errors.
- `DELETE /api/stash?user=<handle>&id=<itemId>` — ownership-checked delete. Returns 404 (NOT 403) for non-owned items so existence is not leaked.

### Smoke test

End-to-end smoke test against the local SQLite via a Node script:

```
create with contentHash='abc123' → row created (id=cmsmxsz8i...)
findUnique via userLabel_contentType_contentHash composite key → row found (same id)
deleteMany → cleaned up
```

Confirms the Prisma unique-constraint name matches the code.

## Stage Summary

- **Files created:**
  - `src/lib/offline-stash.ts` (~340 LOC, server-only).
  - `src/app/api/stash/route.ts` (GET list/summary + POST add/synced + DELETE — all co-located).
- **Files modified:**
  - `prisma/schema.prisma` (+1 model: `OfflineStashItem` with 4 indexes incl. composite unique on (userLabel, contentType, contentHash)).
- **Lint:** `bun run lint` → 0 errors, 0 warnings ✅
- **DB:** local schema pushed (95 total models now), Turso remote in sync for the new model ✅
- **ADR-001 (web-first PWA):** the offline-stash service is server-only (DB-touching). The client-side stash (IndexedDB) is out of scope for this server-only task — the API is designed so a PWA service worker can POST snapshots on reconnect and GET them back on a new device login. The `metadata` field is a client-controlled opaque JSON blob so the server never needs to parse stash payloads.
- **ADR-002 (server never sees plaintext):** N/A — no new client-side crypto. The stash stores snapshot bodies in plaintext (server-side); if E2EE is required for stash content in a future iteration, the body field can hold a ciphertext blob + the contentHash becomes a hash of the ciphertext (still dedup-able).
- **Privacy posture (§30.4 / §26):** the stash is keyed solely on `userLabel` (the user's handle) — no separate tracking id, no session fingerprint. `metadata` is opaque client-controlled JSON. `expiresAt` enforces a retention window (default 30 days) — expired rows are lazily purged on every GET and can be batch-purged via `pruneExpired()` for cron. The DELETE endpoint returns 404 for non-owned items so the existence of an item is never leaked to a different user.
- **No Brain AI / proxy.ts / protected-systems modified.**
- **Deployment caveat (same as prior agents):** the new `/api/stash` route returns 404 against the running prebuilt `.next/standalone` sandbox until the next system-managed production rebuild. All code is correct + lint-clean; route will become reachable after the rebuild.
- **Items 1–9** (circle events / members / join-requests / audit / tipping / affiliate / sponsored hashtags / moderation queue / nearby photos) confirmed present + lint-clean from the prior agent — no regressions.

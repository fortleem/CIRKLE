# Task ID: ADMIN-PANEL-UI — CIRKLE Platform Admin Panel Overlay

Agent: general-purpose
Started: 2026-08-12

## Goal
Build a single fullscreen overlay component (`src/components/overlays/admin-panel.tsx`)
that provides complete administration for the entire CIRKLE super app. 12 sections,
grouped sidebar, glass aesthetic, emerald accent, no-auth building-phase banner.

## Inputs verified
- `src/lib/admin-tabs.ts` — 12 sections + 3 groups (operations / intelligence /
  infrastructure), each with id/label/icon/endpoint/group.
- `src/components/ui/overlay-shell.tsx` — `OverlayShell({ open, onClose, variant,
  maxWidth, ariaLabel, titleId, className, children })`. Owns focus-trap, Esc, body
  scroll lock. We'll use `variant="fullscreen"`.
- Existing API endpoints (verified 200s in dev.log):
  - `/api/admin/overview`  → platform/health/brain/aike/counts/topRegions/topModules/errors/env
  - `/api/admin/users`     → { total, users:[…], byRegion:[…], byAvatarColor:[…] }
  - `/api/admin/content`   → { total, posts:[…], byModule, byVisibility, engagement, topTags }
  - `/api/admin/circles`   → { total, circles:[…], byCategory, byMode, topOwners, topCirclesByMembers }
  - `/api/brain/status`    → { online, providers[], features[], actions[], knowledgeGraph }
  - `/api/aike/status`     → { status, phase, orchestrator:{…}, eventLearning, … }
  - `/api/news/orchestrator-status` → { pipeline[8], countriesSupported:246, webSearch, webScraping }
  - `/api/admin/payments`  → { total, transactions:[…], byStatus, byMethod, byCurrency, byDirection }
  - `/api/admin/overlays`  → { totalOverlays, totalCommands, byCategory, byEventPrefix, primaryTabs, secondaryTabs, overlays[] }
  - `/api/admin/api-routes`→ { totalRoutes, byFolder, rateLimitPresets, validationWrapped }
  - `/api/monitoring/errors` → { stats:{ total, byLevel, byKind }, errors:[…], count }
  - `/api/admin/system`    → { env, database, git, backups, package, runtime, branchProtection, adrs, … }
- UI primitives that exist & will be reused: `Button`, `Input`, `Badge`,
  `ScrollArea`, `Card`, `Tabs`. Custom helpers (`AdminCard`, `StatCard`,
  `BarRow`, `LoadingSkeleton`, `ErrorCard`, `LevelBadge`) defined locally.

## Architecture decisions
- One file, ~1400 lines, `@ts-nocheck` + `"use client"` at top (matches the rest
  of `src/components/overlays/*.tsx`).
- `useAdminData<T>(endpoint, autoRefreshMs?)` hook: returns
  `{ data, loading, error, refresh, lastUpdated, elapsedMs }`. Uses
  `AbortController` with 8s timeout. `refresh()` increments an internal
  `refreshKey` state to trigger re-fetch.
- Sidebar: `role="tablist"` with roving tabindex (arrow-key navigation).
- Mobile (<768px): horizontal scrollable icon strip at the top.
- Sticky top bar: title + amber "DEV MODE — NO AUTH" badge + refresh + auto-
  refresh toggle (30s) + close.
- Sticky footer: last-refresh timestamp + elapsed ms + version note.
- Section transitions: `motion.div` `initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}`.
- Glass: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl`.
- Accent: emerald — `bg-emerald-500/15 text-emerald-300 border-emerald-500/30`.

## Output
- `/home/z/my-project/src/components/overlays/admin-panel.tsx`

## Pre-flight
- Baseline lint verified clean (next step after writing).

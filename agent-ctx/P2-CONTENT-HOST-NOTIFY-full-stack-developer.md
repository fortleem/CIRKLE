# Task ID: P2-CONTENT-HOST-NOTIFY — Agent Work Record

**Agent**: full-stack-developer (Z.ai Code)
**Task**: P2 Cross-module Content Model + Registry-driven Overlay Host + Universal Notification Center + Rate Limit Expansion
**Status**: ✅ COMPLETE — 6 files created, lint-clean (0 errors / 0 warnings), all DB calls wrapped in try/catch

## Summary

Built four platform-wide primitives for CIRKLE:

1. **Cross-Module Content Model** — a unified `ContentObject` interface representing posts, messages, photos, videos, documents, comments, replies, stories, news, and events from any CIRKLE module (Wasl / Midan / Lamahat / Mashahd / Rihla / Circles / News / Mail / Vault). Includes converters for the existing Post, Message, MailMessage, and JobPosting Prisma models, plus `searchContent` (cross-module search), `getContentById`, and `getContentGraph` (related + referenced content).

2. **Registry-Driven Overlay Host** — `createOverlayHost()` factory that collapses the current 154 `useState` hooks + 151 `addEventListener` calls + ~150 mount points in `page.tsx` into a single `Map<string, boolean>` for open/close state, ONE `useEffect` registering all event listeners, and ONE dynamic-import render loop. Includes a `fromRegistry(OVERLAY_REGISTRY)` convenience helper.

3. **Universal Notification Center** — a unified notification system merging 13 sources: Wasl unread messages, Wasl missed calls, Midan mentions/replies, new followers, CircleMail unread, pending transactions, job applications, inter-agency referrals, AI action approvals, data-subject requests, AI incidents, ACA case updates, and Shield reports. Sorted by priority (urgent > important > normal > low) then recency.

4. **Rate Limit Expansion** — comprehensive presets (AUTH 5/min, DESTRUCTIVE 3/min, SENSITIVE 10/min, STANDARD 30/min, PUBLIC 60/min) with `withRateLimitAll`, `applyRateLimitToRoute`, `checkRateLimit`, `presetForRoute`, and `RECOMMENDED_ROUTES_TO_WRAP` (20 specific routes that should adopt the wrapper).

Both the notification center and rate-limit-expansion ship with a wire-ready API route at `/api/notifications/unified`.

## Files Created (6)

| File | LOC | Purpose |
|---|---|---|
| `src/lib/content-model.ts` | ~580 | Unified `ContentObject` model + `toContentObject` (Post) / `toContentObjectFromMessage` (Message) / converters for Mail + Job + internal helpers. `searchContent`, `getContentById`, `getContentGraph` all wrap DB calls in try/catch. |
| `src/lib/overlay-host.tsx` | ~385 | `createOverlayHost(config)` factory — single state Map, single useEffect registering all listeners, dynamic-import rendering of only the open overlay. Includes `fromRegistry` helper. |
| `src/lib/notification-center.ts` | ~510 | `getUnifiedNotifications(userId?)`, `markAsRead`, `markAllAsRead`, `getUnreadCount`, `getNotificationsByPriority`, `groupNotifications`. 13 source fetchers, each try/catch-wrapped. |
| `src/lib/rate-limit-all.ts` | ~270 | `RATE_LIMIT_PRESETS_ALL` (5 presets), `withRateLimitAll`, `applyRateLimitToRoute`, `checkRateLimit`, `presetForRoute`, `ROUTE_PRESET_MAP` (regex → preset), `RECOMMENDED_ROUTES_TO_WRAP` (20 routes). |
| `src/app/api/notifications/unified/route.ts` | ~155 | GET (rate-limited PUBLIC 60/min) returns `{ notifications, count, unreadCount }`; POST (rate-limited SENSITIVE 10/min) supports `mark_read` / `mark_all_read` / `get_unread_count`. |
| `src/components/overlays/unified-notification-center.tsx` | ~525 | Fullscreen overlay: priority-grouped feed (Urgent/Important/Normal/Low), 8 filter chips (All/Messages/Mentions/Calls/Follows/Payments/Referrals/AI Tasks/Security), search box, mark-as-read (single + all), action buttons → `circle:navigate`. |

## Events Dispatched (2 unique)

| Event | When | Payload |
|---|---|---|
| `circle:unified-notifications` | Overlay opens | `{ detail: { open: true } }` |
| `circle:navigate` | Notification action button clicked | `{ detail: { tab, notificationId, module } }` |

## Overlay-Registry Entries Needed (1 — not added per CREATE-ONLY rule)

Add this to `OVERLAY_REGISTRY` in `src/lib/overlay-registry.ts`:

```ts
{
  id: "unified-notification-center",
  name: "Notifications",
  description: "Unified notification center — merges every source (messages, calls, mentions, follows, payments, AI approvals, shield alerts) into a priority-grouped feed.",
  emoji: "🔔",
  category: "productivity",
  event: "circle:unified-notifications",
  keywords: ["notification", "unread", "alert", "message", "mention", "call", "follow", "payment", "shield", "ai", "referral"],
}
```

## Lint

`bun run lint` → 0 errors / 0 warnings ✅

## Issues / Deviations

1. **`overlay-host.tsx` instead of `overlay-host.ts`**: the brief specified `.ts`, but the file contains JSX (it returns a React component + an error fallback with inline JSX). ESLint rejects JSX in `.ts` files (`Parsing error: Type expected`). Renamed to `.tsx` — this is the idiomatic React convention and does not affect any imports (Next.js / TS resolve both extensions transparently). The exported API (`createOverlayHost`, `fromRegistry`, `OverlayHostAPI`) is unchanged.

2. **Notification read-state**: CIRKLE has no `Notification` model in Prisma. Read-state is tracked in an in-memory `Set<string>` in `notification-center.ts` for the lifetime of the process. For `message:*` and `mail:*` IDs, `markAsRead` also persists back to the source `Message.status='read'` / `MailMessage.read=true` columns. Other ID prefixes (`call`, `follow`, `referral`, `ai_task`, `security`, etc.) remain in-memory only — a future `Notification` Prisma model would persist them.

3. **`rate-limit-all.ts` route recommendations**: `RECOMMENDED_ROUTES_TO_WRAP` lists 20 specific routes that should adopt the wrapper. The actual wrapping of those existing routes is NOT done per CREATE-ONLY — follow-up agent should add `applyRateLimitToRoute(handler, "PRESET")` to each.

4. **Wiring into `page.tsx`** (event listener for `circle:unified-notifications` + mount point for the new overlay) NOT done — per CREATE-ONLY constraint. Follow-up agent should add 1 listener + 1 mount point, OR migrate `page.tsx` to use `createOverlayHost` and remove ~150 manual wirings at once.

5. **OverlayHost is built but not wired**: `createOverlayHost` is ready to consume `OVERLAY_REGISTRY` via `fromRegistry(OVERLAY_REGISTRY)`. A follow-up migration of `page.tsx` would replace the existing 154 useState + 151 addEventListener with a single `<host.OverlayHost />` mount. This is a substantial refactor (would touch ~1000 lines of `page.tsx`) and is intentionally left for a dedicated migration task.

## Direct execution validation

- `toContentObject(post)` — accepts any Post model row, normalizes module/type/audience/visibility, parses tags + location + media → attachments. Returns empty fallback for null input.
- `toContentObjectFromMessage(msg)` — handles E2EE ciphertext (body=empty), reply messages (type="reply"), system events, attachments, disappearing TTL → `expiresAt`.
- `searchContent("test", { modules: ["midan"] })` — runs queries against Post/Message/MailMessage/JobPosting in parallel, score-ranks by body / author / tags + recency boost, sorts, slices to limit. Each surface wrapped in try/catch → empty contribution if table unavailable.
- `getUnifiedNotifications()` — Promise.all over 13 fetchers, merges + sorts by priority weight then timestamp desc. Never throws.
- `RATE_LIMIT_PRESETS_ALL.AUTH.maxRequests === 5`, `DESTRUCTIVE === 3`, `SENSITIVE === 10`, `STANDARD === 30`, `PUBLIC === 60` — all match the brief exactly.
- `withRateLimitAll(handler, "PUBLIC")` — produces a wrapper that delegates to the existing `withRateLimit` with the preset's `maxRequests`/`windowMs`/`keyBy`/`scope`.

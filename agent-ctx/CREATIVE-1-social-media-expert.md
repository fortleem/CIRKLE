# CREATIVE-1 — Smart Social Features

**Agent:** social media expert
**Task ID:** CREATIVE-1
**Date:** 2025-01-24

## Summary

Implemented 5 creative social media features for CIRKLE, all wired into the existing overlay dispatch system. Lint passes with 0 errors / 0 warnings.

## Files Added (7)

- `src/lib/cross-module-share.ts` — Cross-Module Sharing Hub library. Pure (no React / no DB). Exports `shareToModules`, `getShareSuggestions`, `transformForModule`, `executeCrossModuleShare`, `MODULE_META`, `ModuleId`, `ShareContent`, `ModuleSharePayload`, `ShareResult`, `ShareResponse`, `ModuleSuggestion`.
- `src/lib/social-rituals.ts` — Social Rituals library. Pure. 28 bilingual (Arabic + English) daily prompts across morning/afternoon/evening/weekend slots, deterministic per-day rotation that never repeats within a week, localStorage-backed streak tracking with idempotent same-day re-do handling. Exports `RITUALS`, `slotForDate`, `ritualForDate`, `loadStreak`, `saveStreak`, `recordParticipation`, `hasParticipatedToday`, `buildRitualResponse`, `emptyStreak`, plus types.
- `src/app/api/rituals/route.ts` — `GET /api/rituals` returns today's ritual + user streak snapshot; `POST /api/rituals` records participation (server-side hook for future analytics; client updates localStorage via `recordParticipation`).
- `src/app/api/share/cross-module/route.ts` — `POST /api/share/cross-module` accepts `{ content, modules, username? }`, validates inputs, dispatches to per-module endpoints in parallel via `executeCrossModuleShare`, returns per-module results + AI suggestions + elapsed time. `GET` returns module metadata + sample suggestions for UI rendering.
- `src/components/overlays/smart-compose.tsx` — Smart Compose overlay (Feature #1). Unified composer handling Text Post / Photo / Video / Poll / Thread formats. AI Content Coach with 1–10 quality score, contextual suggestions ("Try adding a photo — posts with images get 3× more engagement", "Your post is great for Midan but consider shortening for Wasl", "Best time to post: 7–9 PM in your timezone"). Cross-module selector (Midan + Lamahat + Mashahd + Wasl simultaneously). Privacy selector (Public / Friends / Private / Anonymous). AI hashtag + emoji suggestions. Character count with optimal-length indicator. Draft save (localStorage). Schedule for later (datetime picker). Dispatches `circle:smart-compose`.
- `src/components/overlays/social-analytics.tsx` — Personal Analytics Dashboard (Feature #3). This-week stats (posts, likes, comments, new followers) with up/down deltas. Best posting time card. Top performing post card. CSS-bar follower-growth chart (7 days, animated). Module breakdown bars (Midan / Lamahat / Mashahd / Wasl engagement %). Audience insights (top countries + age ranges). AI Insight card with "Open Smart Compose" CTA. Dispatches `circle:social-analytics`.
- `src/components/overlays/smart-notifications.tsx` — Smart Notification Center (Feature #4). AI-grouped notifications by intent ("3 people liked your post" instead of individual). Priority levels: Urgent (red bar + badge), Important (amber bar + badge), Normal (muted). Smart snooze: "Snooze similar notifications for 1 hour" — snoozes by `groupKey` so similar events collapse. Batch actions: "Mark all as read" + "Clear all". Filter by type: All / Social / Messages / News / System. Collapsible preferences panel with per-type toggles (Switch). Settings deep-link. Dispatches `circle:smart-notifications`.

## Files Modified (3)

- `src/app/page.tsx`:
  • 3 new dynamic imports (SmartCompose, SocialAnalytics, SmartNotifications) — `ssr: false`.
  • 3 new useState flags.
  • Escape-key handler closes the 3 new overlays.
  • 3 new event listeners (`circle:smart-compose`, `circle:social-analytics`, `circle:smart-notifications`) added alongside existing listeners, with matching cleanup in the same effect.
  • 3 new overlay renders inserted after `<ComparisonView />`.
- `src/lib/overlay-registry.ts`:
  • 3 new entries appended to `OVERLAY_REGISTRY` so they surface in both the OverlayBrowser grid and the ⌘K CommandPalette. All 3 categorised as `social`.
  • Updated header comment + 3 in-file doc references from "65 overlays" → "68 overlays" so the doc strings stay accurate.
- `src/screens/home-screen.tsx`:
  • Updated the "All Features" tile from "65" → "68" (two places: the badge count + the description line) so the home-screen tile matches the actual registry length.

## Cross-Module Sharing Hub Design Notes

- `shareToModules(content, modules[])` (client-side helper in `cross-module-share.ts`) POSTs to `/api/share/cross-module` with a relative URL so Caddy can route it. Returns a `ShareResponse` with per-module results.
- Per-module transformers (Midan, Lamahat, Mashahd, Wasl) produce format-appropriate payloads:
  • Midan: full text + hashtags + first photo as media attachment
  • Lamahat: photo + 140-char caption
  • Mashahd: video + 80-char title + 500-char description
  • Wasl: 220-char summary + link (no hashtags, since hashtags are Midan-only)
- `getShareSuggestions(content)` is a pure heuristic (no external AI call) — runs synchronously so the UI can show suggestions while the user is still typing. Rules:
  • video present → Mashahd ≥ 0.95
  • ≥1 photo present → Lamahat ≥ 0.9 ("photos get 3× more engagement on Lamahat than as Midan attachments")
  • text > 80 chars → Midan ≥ 0.8 (long-form belongs in the square)
  • hashtags present → Midan += 0.2
  • link present → Wasl += 0.4 ("links spark conversation in Wasl chats")
  • text < 80 chars → Wasl += 0.3 (quick shares = chat)
- `executeCrossModuleShare` (server-side, used by the API route) dispatches to each module's native API in parallel via `Promise.all`. Failures in any single module do NOT abort the others — per-module results are collected. Wasl returns a draft ID (it can't post a message without a conversation ID — the UI uses the result to pre-fill a chat). 8s per-module timeout via AbortController.

## Social Rituals Design Notes

- 7 rituals per slot × 4 slots = 28 total. Pool index is `((dayOfYear + year × 7) % pool.length + pool.length) % pool.length` so:
  • Same calendar day → same ritual (deterministic across reloads)
  • Consecutive days within a week → different rituals (pool has 7 entries, index advances by 1/day)
  • Across years → wraps naturally
- Slot determination: hour 5–11:59 → morning, 12–16:59 → afternoon, 17–4:59 → evening. Friday + Saturday (Arab weekend) override to `weekend` slot.
- Streak logic in `recordParticipation`:
  • lastParticipation === yesterday → current += 1
  • lastParticipation === today → unchanged (idempotent same-day re-do, only increments total)
  • otherwise → current = 1 (reset)
  • longest = max(longest, current); total += 1 every participation
- Participation key `cirkle-ritual-participated-YYYY-MM-DD` ensures the same ritual can't be double-counted on the same day even if the user clicks "Participate" multiple times.

## Smart Compose AI Coach

Heuristic quality score (1–10) computed via `computeCoach()`:
- Length: 30–200 chars → +3 (optimal range); 200–280 → +2; >280 → +1 + warning ("consider shortening for Wasl"); <30 → +0 + tip
- Media: photo/video attached → +2; text-only with no media → tip ("Try adding a photo — posts with images get 3× more engagement")
- Hashtags: present → +1; absent → tip ("Add 2–3 hashtags to help people discover your post")
- Cross-module: ≥2 modules selected → +1 + info ("Cross-posting to N modules — your reach is amplified"); single Midan → tip ("consider also sharing to Lamahat if it has a photo")
- Best time: live hour-of-day check → "Right now — this is peak engagement time!" / "7–9 PM in your timezone" / "Late night — your post may get fewer views. Try scheduling for 7–9 PM."
- Score is clamped to [1, 10].

## Smart Notifications Design

- `groupKey` field on every notification enables "snooze similar" — snoozing one notification hides all notifications with the same groupKey for 1 hour.
- Visible list is computed via `useMemo` from `notifications × prefs × filter × snooze state`. Snooze is checked against `Date.now()` so snoozed items reappear automatically after their window expires (the component re-renders on the next interaction).
- Priority bar: left-edge colored bar (red/amber/muted) + optional "URGENT" / "IMPORTANT" pill badge.
- Filter tabs show per-type counts so the user can see at a glance which channel has pending items.
- Mobile-friendly: batch actions ("Mark all" + "Clear") appear in a separate row on small screens.

## Lint

`bun run lint` → 0 errors, 0 warnings ✅.

The only lint issue encountered during development was `react-hooks/set-state-in-effect` on the initial `SocialAnalytics` draft (synchronous `setLoading(true)` inside the effect body). Fixed by switching to a derived `loading = open && !data` state and a `refreshTick` counter that re-triggers the effect — both `setData` calls now live inside the async `setTimeout` callback, so no synchronous setState-in-effect occurs.

## Adherence to Constraints

- ✅ No modifications to Brain AI (`src/lib/brain-*.ts`, `src/app/api/brain/*`), `proxy.ts`, OIDC, E2EE, auth, or any DB schema.
- ✅ No existing features removed.
- ✅ Used existing Tailwind classes + glass design system (`glass-strong`, `bg-gradient-gold`, `shadow-float`, `text-charcoal`) + Lucide icons throughout.
- ✅ Used Framer Motion for all animations (`motion.div`, `AnimatePresence`, spring transitions, layout animations on notification list).
- ✅ Used existing UI components: `OverlayShell`, `Button`, `Input`, `Label`, `Textarea`, `Switch`.
- ✅ Used `useAuth` for the username (consistent with `PollCreator` and other overlays).
- ✅ All API requests use relative paths (`/api/share/cross-module`, `/api/rituals`).
- ✅ Responsive design — mobile-first grid layouts (`grid-cols-2 sm:grid-cols-4`), mobile-specific batch-action row in Smart Notifications.
- ✅ Accessibility — `aria-label`, `aria-pressed`, `aria-modal` (via OverlayShell), focus trap, Esc-to-close (via OverlayShell), keyboard navigation.
- ✅ All 3 new overlays are registered in `overlay-registry.ts` so they appear in both the OverlayBrowser grid and the ⌘K CommandPalette.

## How to Trigger

- `window.dispatchEvent(new CustomEvent("circle:smart-compose"))` — opens Smart Compose
- `window.dispatchEvent(new CustomEvent("circle:social-analytics"))` — opens Social Analytics
- `window.dispatchEvent(new CustomEvent("circle:smart-notifications"))` — opens Smart Notifications

All 3 are also reachable via the ⌘K CommandPalette and the "All Features" overlay browser tile on the home screen.

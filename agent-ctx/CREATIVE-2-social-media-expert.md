# CREATIVE-2 — More Creative Social Features

**Agent:** social media expert
**Task ID:** CREATIVE-2

## Summary

Implemented 5 more creative social media features for CIRKLE — visual connection graph, cross-module content calendar, mood-based feed adaptation, weekly community challenges, and AI-powered content discovery. Lint: 0 errors / 0 warnings. No protected systems touched. No existing features removed.

Baseline verified before starting (`bun run lint` → 0 errors). Final `bun run lint` → 0 errors.

## Files Added (7)

- `src/lib/mood-engine.ts` — Mood-Based Feed Adaptation (pure lib). 5 moods (energetic, relaxed, social, focused, bored) detected via a pure heuristic from `MoodSignal` (time of day, minutes since last active, messaging activity, long-form reads, scroll velocity, recent engagement, weather). `detectMood`, `getMoodFeed`, `getMoodTheme`, `buildMoodResponse`, `defaultSignalForNow`. Each mood returns a feed config with module weights + filters (preferShortForm / boostTrending / boostDiscover) and a theme accent (gold-bright / teal-soft / rose-warm / charcoal-deep / gold-warm). Detection is passive — no explicit user input.
- `src/lib/social-challenges.ts` — Weekly Community Challenges (pure lib). 5 challenges per week, one per module (Wasl, Midan, Lamahat, Mashahd, Rihla) — 25-challenge library. Deterministic per-ISO-week rotation via `weekKeyForDate` + seed = year*100 + week + per-module offset, so no challenge repeats week-to-week. localStorage-backed progress tracking (`loadProgress`, `saveProgress`, `recordProgress`) with start + completion timestamps. Badge system: Getting Started (1+), Halfway There (3+), Weekly Champion (4+), Perfect Week (5/5). Deterministic per-week leaderboard with the current user inserted at the correct rank by completed-count. `buildChallengeResponse` produces the full API payload.
- `src/app/api/mood/route.ts` — `GET /api/mood?signal=<JSON>` derives mood from a client-supplied signal; `GET /api/mood?mood=energetic` forces a fixed mood; `POST /api/mood` accepts a richer `MoodSignal` body. All numeric inputs clamped to sensible ranges. No-store cache headers.
- `src/app/api/challenges/route.ts` — `GET /api/challenges` returns this week's 5 challenges + progress + leaderboard + badges; `POST /api/challenges` records start/completion for a single challenge. Client progress is echoed via the `progress` query param so a single round-trip returns everything the UI needs.
- `src/components/overlays/connection-graph.tsx` — Connection Graph (Feature #1). Interactive SVG network graph with 10 nodes (user center + friends + creators + circles) and 18 edges (follow / mutual-circle / shared-interest, color + dash-coded). Node radius scales with interaction frequency (8–36px). Node color = module (Wasl=teal, Midan=gold, Lamahat=rose, Mashahd=steel, self=charcoal). Pointer-drag pan + wheel-zoom + dedicated zoom in/out/reset controls. Click a node → contact card slides in with mutual circles, shared interests, location, follow + message actions. AI-suggested connections panel with reason strings ("In 2 of your circles · Same city (Cairo)"). Legend strip. Dispatches `circle:connection-graph`.
- `src/components/overlays/content-calendar.tsx` — Content Calendar (Feature #2). Monthly calendar grid (Mon–Sun) showing color-coded scheduled posts per module (Midan=primary, Lamahat=rose, Mashahd=teal, Wasl=amber). Drag-and-drop reschedule (HTML5 DnD — drag an item chip onto any day cell). Best-time indicators (gold dots at 08:00, 12:00, 17:30, 19:00, 20:00, 21:00). Streak tracker: current / longest / days-since-last-post cards. AI hint banner ("You haven't posted in 3 days. Try sharing something in Midan."). Schedule-new sheet with module picker, time picker (with optimal-window hint), title + notes fields. localStorage persistence. Seed items on first open so the calendar isn't empty. Dispatches `circle:content-calendar`.
- `src/components/overlays/content-discovery.tsx` — AI Content Discovery (Feature #5). Two tabs: "For You mix" (single blended carousel across all modules) and "Browse sections". Five sections, each a horizontal-scroll carousel with left/right scroll buttons: Trending in your city, Because you engaged with…, New creators to discover, Hidden gems (quality-scored 89–96, low-view), Nostalgia (your posts from 1 year ago today). "Surprise me" button → AI picks a random high-quality post and shows it in a spotlight view with rationale. Per-card actions: Save (bookmark), Share (Web Share API with clipboard fallback), Follow. Discovery cards carry author avatar, module strip, engagement counts (formatted K/M), time-ago, optional city + seed-topic + quality-score badges. Dispatches `circle:content-discovery`.

## Files Modified (3)

- `src/app/page.tsx`:
  • 3 new dynamic imports (ConnectionGraph, ContentCalendar, ContentDiscovery) — `ssr: false`.
  • 3 new useState flags.
  • Escape-key handler closes the 3 new overlays.
  • 3 new event listeners (`circle:connection-graph`, `circle:content-calendar`, `circle:content-discovery`) added alongside existing listeners, with matching cleanup in the same effect.
  • 3 new overlay renders inserted after the CREATIVE-1 trio.
- `src/lib/overlay-registry.ts`:
  • 3 new entries appended to `OVERLAY_REGISTRY` so they surface in both the OverlayBrowser grid and the ⌘K CommandPalette. Connection-graph + content-discovery categorised as `social`; content-calendar categorised as `productivity`.
  • Updated header comment + 3 in-file doc references from "68 overlays" → "71 overlays" so the doc strings stay accurate.
- `src/screens/home-screen.tsx`:
  • Updated the "All Features" tile from "68" → "71" (two places: the badge count + the description line) so the home-screen tile matches the actual registry length.

## Design Notes

### Mood Engine design
- 5 candidate moods scored in parallel; the winner takes the slot. Confidence = max(0.5, 0.5 + margin/6) — even a perfect tie returns 0.5 confidence since the tiebreaker is deterministic by CANDIDATES order (energetic > relaxed > social > focused > bored).
- Each mood has 4 module buckets with weights summing to 1.0 — so the feed algorithm can directly draw from each bucket proportional to weight, with the per-bucket `filter` string passed through to the existing feed layer.
- The signal is collected passively on the client (no UI prompt). The server endpoint accepts either a query-string `?signal=<JSON>` or a POST body, and falls back to a `defaultSignalForNow` derived purely from the current hour if no signal is supplied.

### Social Challenges design
- ISO 8601 week key (`YYYY-Www`) computed via the standard Thursday-based algorithm — same key for the same Mon–Sun week anywhere in the world.
- Pool rotation uses a `seed = year*100 + weekNum` plus a per-module offset (`i*7`) so the same week doesn't always pick index 0 from every pool, and a 5-pool library means no challenge repeats within a 5-week window per module.
- `recordProgress` is idempotent — calling it twice with `markCompleted=true` keeps the original `completedAt`. `startedAt` only set on the first `markStarted` call.
- Leaderboard is deterministic per week key (hash → seed → completed counts) so the same week always returns the same names in the same order; the current user is inserted at the correct rank by their `completedCount`. Ties share a rank (standard competition ranking).

### Connection Graph design
- Pure SVG (no D3, no third-party graph lib). Nodes positioned in normalized [-1, 1] space → mapped to a 600×600 viewBox with 60px padding. Node radius = `8 + (weight/100) * 28` (range 8–36px).
- Pan via pointer-drag on the SVG background; node clicks stopPropagation so they don't initiate pan. Zoom via wheel (bounded 0.5–2.5×). Dedicated zoom in/out/reset buttons for accessibility (keyboard users can't wheel).
- Edges have three kinds with distinct colors + dash patterns: follow (solid slate), mutual-circle (dashed teal), shared-interest (dotted rose). Selected node highlights all connected edges (full opacity + thicker stroke).
- Suggestions panel is the default right-pane content; clicking a node replaces it with a contact card (animated slide-in). The card adapts: friends get a follow/message CTA, circles get an "Open circle" CTA (dispatches `circle:circle-detail`), self shows a static summary.

### Content Calendar design
- Streak is computed from the items set — walking backwards from today (or yesterday if today is empty) counting consecutive days with at least one scheduled item. Longest streak walks the sorted dates forward, tracking the longest consecutive run.
- AI hint has three states: ≥3 days idle ("You haven't posted in N days…"), 0 streak with no idle ("Kick off your streak today…"), ≥5 streak ("🔥 N-day streak! Keep it going…"). All three are bilingual-ready (the hint strings are English-only for now; Arabic variants can be added in a follow-up via the existing i18n pack).
- Drag-and-drop uses native HTML5 DnD (`draggable` + `onDragStart`/`onDragOver`/`onDrop`). The dragged chip shows a grip-handle affordance that brightens on hover. Drop targets are the day cells — drop fires `moveItem` which persists the new date.
- Schedule-new sheet is a modal layered on top of the OverlayShell (absolute positioned, backdrop blur). Click-outside dismisses; stopPropagation on the inner card prevents the click-outside handler from firing when interacting with the form.

### Content Discovery design
- All sections are static module-level arrays (no per-render allocation) so the carousels don't re-trigger React renders. The For-You mix is a curated blend across sections (TRENDING[1] → HIDDEN_GEMS[0] → BECAUSE[2] → NEW[0] → …).
- "Surprise me" picks a random card from the deduped superset of all sections (excluding self-authored), shows it in a spotlight view with a rationale banner, and the user can either go back to discovery or click another "Surprise me" for a fresh roll.
- Per-card state (saved / followed) is tracked in two Sets at the parent level so the state survives carousel re-renders. Toasts confirm every save/follow/share action.

## Constraints respected

- No Brain AI (`src/lib/brain-*.ts`, `src/app/api/brain/*`), `proxy.ts`, OIDC, E2EE, auth, DB schema, or any existing client screen touched. No existing features removed.
- Used existing Tailwind classes + glass design system + Lucide icons + Framer Motion + `OverlayShell` / `Button` / `Input` / `Label` / `Textarea` + `CircleAvatar` (existing brand component).
- All 3 new overlays are registered in `overlay-registry.ts` so they surface in both the OverlayBrowser grid and the ⌘K CommandPalette.
- All API requests use relative paths only.
- Mobile-first responsive: connection-graph uses a 1-column → 2-column grid below md; content-calendar grid is always 7 columns but cells shrink to `min-h-[78px]`; content-discovery carousels scroll horizontally with snap-x.
- Accessibility: ARIA labels on all icon-only buttons, `aria-pressed` on toggle buttons, `aria-label` on the SVG graph, role="button" + tabIndex=0 + keyboard handler (Enter/Space) on SVG nodes, focus trap + Esc-to-close via `OverlayShell`.
- Loading states use the derived-state pattern (open && !hydrated) so no `setState` calls happen synchronously in effects — the `react-hooks/set-state-in-effect` rule passes clean.

## Lint

`bun run lint` → 0 errors / 0 warnings ✅.

TypeScript: 0 new errors introduced. Pre-existing errors in `i18n-loader.ts`, `news-service.ts`, `oidc-client.ts`, `rewards-service.ts`, `storage-service.ts` are unrelated to this task and were not touched.

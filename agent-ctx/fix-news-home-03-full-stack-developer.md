# fix-news-home-03 — Fix & enrich the Official Updates / news rail on the Cirkle home page

**Agent:** full-stack-developer
**Task ID:** fix-news-home-03
**Scope:** Ensure the home screen's "Official Updates" section renders real, working news sources with the full enriched field set (name, arabicName, handle, category, latestUpdate, subs, verified), at least 3–5 sources, an emergency channel with red highlighting, and an "All channels" link to the Official module.

## Files modified
- `src/lib/ai.ts` — enriched `OfficialUpdate` interface, `generateFeed()` AI prompt + mapping, new `arabicNameFor()` helper + `ARABIC_SOURCE_NAMES` lookup, new `buildFallbackOfficialUpdates()` helper (5 sources incl. 1 emergency).
- `src/screens/home-screen.tsx` — widened `FeedData.officialUpdates` type, rebuilt fallback data, fully rebuilt the Official Updates section UI (avatar + arabicName + category badge + handle + subs + latest update + Subscribe; emergency red treatment; "All channels" header link; max-height scroll).
- Screenshot: `agent-ctx/fix-news-home-03-official-updates.png`

## Work Log

1. Read `/home/z/my-project/worklog.md` for context, plus `src/screens/home-screen.tsx`, `src/app/api/news/route.ts`, `src/lib/ai.ts`, `src/lib/countries.ts`, `src/app/page.tsx`, `src/lib/tabs.ts`, `src/app/globals.css`. Confirmed the live home screen is `src/screens/home-screen.tsx` (rendered for the `home` tab in `src/app/page.tsx`); the `/api/news` route wraps `generateFeed()` and returns `sources: feed.officialUpdates`.
2. Verified the existing `/api/news?country=SA` endpoint against the dev server (port 3000): it was already returning 3 sources but with the OLD field shape (`name, handle, subs, type, last, official`) — missing `arabicName`, `category`, `latestUpdate`, `verified`, and any emergency-channel concept. Only 3 sources, no emergency channel, no "All channels" link.
3. **`src/lib/ai.ts`** — rewrote the `OfficialUpdate` interface to the new schema:
   ```ts
   { id, name, arabicName, handle, category: "government"|"media"|"business"|"emergency",
     latestUpdate, subs, verified, isEmergency }
   ```
   - Added `ARABIC_SOURCE_NAMES` lookup (20+ well-known sources: Saudi Ministry of Health → وزارة الصحة السعودية, Saudi Press Agency → وكالة الأنباء السعودية, Al Arabiya → العربية, BBC Arabic → بي بي سي عربي, Reuters → رويترز, Aramco Newsroom → أرامكو, Riyadh Season → موسم الرياض, Civil Defense → الدفاع المدني, …) plus `arabicNameFor(name, category)` with per-category Arabic fallbacks so every channel always renders an Arabic name.
   - Updated the `generateFeed()` AI prompt to request **5** `officialUpdates` with the full new field set, to use REAL well-known sources for the country (passes the country's `newsSources` list as hints), and to always include **1 emergency channel** (`isEmergency:true`, `category:"emergency"`). Bumped `max_tokens` 1500→1800 to fit the larger payload.
   - Rewrote the officialUpdates mapping to read both new (`category`, `latestUpdate`, `arabicName`, `verified`, `isEmergency`) and legacy (`type`, `last`, `official`) fields with graceful defaults, force `category="emergency"` when `isEmergency` is set, and fill `arabicName` via `arabicNameFor()` when the AI omits it.
   - Added `buildFallbackOfficialUpdates(country)` helper: takes up to 4 of the country's real `newsSources` + always appends one **emergency channel** (`{country.name} Civil Defense`, `@civildefense`, `category:"emergency"`, `isEmergency:true`, "ACTIVE ALERT — follow official safety instructions. Emergency line: 999 / 911."), each with realistic per-category `latestUpdate` text. Returns 5 sources. Wired into `fallbackFeed()` (replacing the old 3-source `slice(0,3)` line).
4. **`src/app/api/news/route.ts`** — no change needed; it already returns `sources: feed.officialUpdates`, which now carries the enriched shape.
5. **`src/screens/home-screen.tsx`** — widened the local `FeedData.officialUpdates` element type to accept both new (`arabicName`, `category`, `latestUpdate`, `verified`, `isEmergency`) and legacy (`type`, `last`, `official`) fields so the UI is resilient to either payload. Updated the catch-path fallback object to emit 5 sources (4 real country sources + 1 emergency Civil Defense channel). Rebuilt the Official Updates section:
   - Custom header row: `SectionHeader(icon=BadgeCheck, "Official Updates")` on the left + an "All channels →" button on the right that dispatches `window.dispatchEvent(new CustomEvent("circle:hub"))` (the same hub-overlay navigation used elsewhere on the home screen, since there is no dedicated "Official" tab — the Circle Hub overlay is the module launcher).
   - Loading state: 5 skeleton rows (`h-20`) instead of 3.
   - Empty state: friendly "No official channels available right now." glass card.
   - Each source card (`motion.div`, fade+slide-in): red left accent bar + `border-accent/50 bg-accent/5` for emergency channels; avatar tile (first letter on `bg-gradient-hero`, or `AlertTriangle` icon on `bg-accent/20 text-accent` for emergency); name + `BadgeCheck` verified icon + arabicName (RTL, `dir="rtl"`); category badge (`Government`/`Media`/`Business`/`EMERGENCY` — emergency uses `bg-accent/15 text-accent`, others use `bg-secondary/15 text-secondary`) + handle + "· X subscribers"; 2-line clamp latest-update text (accent-colored for emergency); Subscribe pill (accent-filled for emergency, secondary-tinted otherwise) firing `toast.success`.
   - List container: `max-h-[28rem] overflow-y-auto` so 5+ sources don't blow out the page (global webkit scrollbar styling already in `globals.css`).
6. Ran `bun run lint` → **0 errors, 0 warnings**.
7. Tested `GET http://localhost:3000/api/news?country=SA` (direct, bypassing the 81 gateway which 502s on the ~28–40s AI latency): returns 5 enriched sources — Saudi Ministry of Health (government, وزارة الصحة السعودية, 2.1M, verified), Saudi Press Agency (media, وكالة الأنباء السعودية, 1.8M), Riyadh Season (business, موسم الرياض, 1.5M), Saudi Civil Defense (emergency, الدفاع المدني السعودي, 980K, isEmergency:true, heat-warning update), Aramco Newsroom (business, غرفة أرامكو الإخبارية, 1.2M). All required fields present.
8. Verified in `agent-browser` (1440×900, port 81, seeded a demo account in `localStorage["cirkle-auth"]` to bypass the splash/login gate). After the ~40s `/api/feed` round-trip the Official Updates section rendered with 5 live AI-generated channels:
   - Saudi Ministry of Health — Government · @SaudiMOH · 2.1M subscribers
   - Saudi Press Agency — Media · @SPAenglish · 1.8M subscribers
   - Aramco Newsroom — Business · @Aramco · 956K subscribers
   - Riyadh Season — @RiyadhSeason · 1.5M subscribers
   - **Saudi Civil Defense — EMERGENCY badge · @SaudiCivilDefense · 890K subscribers · "HEAT ALERT: Temperatures expected to reach 45°C this week…"** (red accent treatment, AlertTriangle avatar)
   - "All channels" header button present (ref=e45).
   - Screenshot saved to `agent-ctx/fix-news-home-03-official-updates.png`.
   - `agent-browser errors` → empty (no console errors).

## Stage Summary
- `/api/news?country=SA` now returns 5 enriched, real news sources with the full field set (`name, arabicName, handle, category, latestUpdate, subs, verified`) plus an `isEmergency` flag, including one emergency channel (Saudi Civil Defense) — both for the AI path and the no-AI fallback.
- The home screen's Official Updates section now renders: avatar, name + verified check, Arabic name (RTL), category badge, handle, subscriber count, 2-line latest update, and a Subscribe button per channel; 5 sources in a max-height scroll rail; emergency channels get a red left bar, red border, red EMERGENCY badge, AlertTriangle avatar, and accent-colored update text; an "All channels →" link in the header opens the Circle Hub (module launcher).
- `bun run lint` → 0 errors. Live browser verification → 5 sources + emergency channel + All channels link all rendering, no console errors. Dev log shows `GET /api/feed?country=SA&city=Riyadh 200` (the home screen's actual data path) succeeding alongside `GET /api/news 200`.

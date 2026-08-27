# Task ID: UI-FIXES-1 — Critical UI/UX fixes for CIRKLE

**Agent**: full-stack-developer
**Task**: Implement 3 P0 UI/UX fixes — reduce home dashboard density (18→6 sections), reduce registration from 6 to 3 steps, reduce dock from 8 to 5 primary + More sheet.
**Baseline**: `bun run lint` → 0 errors, 0 warnings ✅ (verified before starting)
**Final**: `bun run lint` → 0 errors, 0 warnings ✅ · `curl http://localhost:3000/` → HTTP 200 ✅

---

## 1. Home dashboard density reduction (P0 ✅)

**Files created:**
- `src/lib/dashboard-prefs.ts` (~245 LOC) — `useDashboardPrefs` hook + types + defaults.
  - `SectionKey` union (26 sections: dailyBrief / trendingBar / stories / priorityShares / sectionNav / aiAsk / featured / foryou / quickActions / jumpBar / shield / sponsored / exclusives / todays / news / official / foryouAi / miniApps / spaces / upcoming / nearby / trending / socialFeed / workspace / mailStrip / covenant).
  - `DEFAULT_PREFS` — only 5 sections visible by default (foryou, shield, news, sponsored-when-ad-served, + greeting/dock always render outside prefs).
  - `DEFAULT_COLLAPSED` — News starts collapsed (header + 2 articles only).
  - `SECTION_META` — labels + descriptions for the Customize sheet, grouped by column (main / side).
  - Persists to `localStorage["cirkle-dashboard-layout"]` (matches the spec key exactly).
  - Lazy `useState` initializer reads localStorage on first render (avoids `setState`-in-effect lint rule + flash-of-default-content).
- `src/components/shell/customize-dashboard-sheet.tsx` (~160 LOC) — bottom-sheet UI.
  - `CustomizeDashboardSheet` — opens from the header's SlidersHorizontal button. Renders two groups (Main feed / Sidebar) of `Switch` rows. Reset-to-defaults button restores the 5-section baseline.
  - `CollapseChevron` — small inline chevron button used by sections with custom headers (Mini apps, Social Feed) that don't use `SectionHeader`.

**Files modified:**
- `src/screens/home-screen.tsx` (~2661 → ~2845 LOC):
  - Added imports: `useDashboardPrefs`, `CustomizeDashboardSheet`, `CollapseChevron`, `SlidersHorizontal` icon.
  - Added `useDashboardPrefs()` hook call + `customizeOpen` state + `showMoreForYou` state.
  - Added "Customize dashboard" button (SlidersHorizontal icon) next to the Brain AI button in the greeting header.
  - Extended `SectionHeader` to accept `collapsed?: boolean` + `onToggleCollapse?: () => void`. When both are provided, renders a chevron at the right edge + makes the whole header clickable + adds keyboard activation (Enter/Space).
  - Wrapped every major section in `{prefs.SECTION_KEY && (<section>...</section>)}` so each can be toggled off via the Customize sheet.
  - Added `{!collapsed.SECTION_KEY && (...)}` body wrappers for sections with collapsible bodies.
  - **For You feed**: `slice(0, 8)` → `slice(0, showMoreForYou ? 8 : 3)` + added "Show N more posts" button. Spec called for 3 posts by default + Show more.
  - **News section**: when collapsed, hides search/subtitle/category-tabs/controls but KEEPS the article list (slice 6 → `collapsed.news ? 2 : 6`). Shows an "Expand for N more articles" button under the 2 articles. Spec called for "header + 2 articles, expand for more".
  - Mounted `<CustomizeDashboardSheet>` once at the end of the sidebar column so the header button can open it.

**What did NOT change**: every section's internal markup is preserved verbatim — only the outer wrapper + header chevron were added. No features removed, no styling touched, no logic changed. The existing `showAllSections` mobile-progressive-disclosure toggle (an empty wrapper) is left untouched.

## 2. Registration: 6 steps → 3 steps (P0 ✅)

**Files modified:**
- `src/lib/auth-store.ts`:
  - `AuthUser.accountStatus` extended to `"active" | "pending_parental" | "pending_age_verification"`.
  - `RegisterData.dob` is now optional (was required) — when omitted at registration, account is created as `pending_age_verification` and the gate runs later from Profile settings.
  - `register()` — age gate logic moved inside `if (data.dob)` block. Empty DOB → `accountStatus: "pending_age_verification"` (no error). Existing teen/child/adult branches unchanged when DOB is provided.
  - **NEW** `updateProfile(patch)` method — patches displayName/email/dob/parentalEmail/bio/country. Re-runs the age gate when DOB changes:
    - `child` (<13) → blocked (COPPA).
    - `teen` (13–15) → requires parental email (existing on file or in the same patch); sets `pending_parental`.
    - `adult` → promotes from `pending_age_verification` → `active`.
    - `unknown`/invalid → returns error.
  - Persists the patched user back to localStorage (preserves `passwordHash`).
- `src/components/auth/auth-screen.tsx`:
  - `REGISTER_STEPS` reduced from `["Username", "Display name", "Password", "Date of birth", "Email", "Region"]` to `["Identity", "Password", "Region"]`.
  - Removed `Calendar`, `Baby` from lucide imports (no longer used since DOB step is gone).
  - Removed `ageBand`, `computeAge` imports (no longer used in the auth screen).
  - Combined Step 1 (Identity) shows both username + display name on one screen, with the existing handle preview + avatar preview.
  - Step 2 = Password (unchanged from old step 3).
  - Step 3 = Region (unchanged from old step 6, including AutoDetectCountry + CountryPicker + review summary). Review summary now shows "Birthday: Set later in Profile" and "Email: Optional · Profile" so the user knows where to find them.
  - `next()` validation updated: step 0 validates both username + display name; step 1 validates password; step 2 submits.
  - Success bloom now adds a tip: "Tip: add your birthday & email from Profile → Settings to unlock age-gated features and password recovery."
  - "Step X of Y" counter still reads from `REGISTER_STEPS.length` — now shows "1 of 3", "2 of 3", "3 of 3".
  - "Already have an account? Sign in" link preserved at the bottom of every step.
- `src/components/overlays/settings-panel.tsx`:
  - Added a new `ProfileAccountSection` component rendered at the top of the Settings panel.
  - Fields: Display name (Input), Birthday (date Input), Recovery email (optional, Input). Each shows a "Set" badge when the user has a value.
  - Inline age-gate preview: when typing a new DOB, shows COPPA/teen/adult feedback inline (mirrors the old registration UX).
  - Pending banners: if `accountStatus === "pending_age_verification"`, shows a gold callout prompting the user to add a birthday. If `pending_parental`, shows an accent callout explaining consent is pending.
  - Uses the `key` prop remount trick (`key={username|dob|email|displayName|parentalEmail}`) to reset local form state after a save — avoids the `setState`-in-effect lint rule.

## 3. Dock: 8 tabs → 5 primary + More sheet (P0 ✅)

**Files modified:**
- `src/lib/tabs.ts` (complete rewrite, ~55 LOC):
  - `TABS` array extended with `tier: "primary" | "secondary"` + `subtitle` fields.
  - Primary (5): Home, Wasl, Midan, Pay, Profile.
  - Secondary (3): Mashahd (Video), Lamahat (Photos), Rihla (Travel).
  - Exported `PRIMARY_TABS`, `SECONDARY_TABS`, `MORE_TAB_ICON` (= LayoutGrid) helpers.
  - Added `getTab(id)` lookup.
  - `TabId` type unchanged so consumers (`page.tsx`, `circle-hub.tsx`, `first-launch-tour.tsx`) are unaffected. `page.tsx` uses its own inline `TAB_IDS` constant, so no consumer breaks.
- `src/components/shell/dock.tsx` (complete rewrite, ~565 LOC):
  - Renders 5 primary tabs + 1 "More" button (LayoutGrid icon + small dot indicator).
  - More button opens a `Sheet` (side="bottom") with a 3-column grid of the 3 secondary tabs. Each shows icon + label + subtitle ("Video" / "Photos" / "Travel") + a "Recent" badge if recently used.
  - Tracks recently-used secondary tabs in `recent[]` state, persisted to `localStorage["cirkle-dock-recent"]`. Recorded via `recordSecondaryTab(id)` called from the More-sheet onClick (NOT an effect) — avoids the `setState`-in-effect lint rule.
  - Loaded lazily via `useState(() => ...)` initializer — no extra mount effect.
  - When `active` is a secondary tab, the More button shows an active highlight (gradient pill) + the active tab's label, so the user always has a visual anchor for "where am I?".
  - Arrow-key navigation in the dock now treats More as the last entry in the roving tabindex (ArrowRight on Profile → opens More sheet).
  - Arrow-key navigation INSIDE the More sheet cycles through the 3 secondary tabs.
  - Existing radial menu (long-press / right-click) preserved verbatim for primary tabs. `RADIAL_ACTIONS` record still has all 8 entries (the 3 secondary ones are simply never triggered from the dock, since those tabs aren't dock buttons anymore — but the data is preserved for any future iteration).
  - Escape / scroll / resize close handlers preserved.
  - Unread-badge logic for Wasl preserved.

## Lint + runtime status
- `bun run lint` → **0 errors, 0 warnings** ✅ (verified after all 3 fixes)
- `curl http://localhost:3000/` → **HTTP 200** ✅
- `dev.log` final lines: `GET / 200 in 703ms (compile: 130ms, render: 573ms)` ✅ (the earlier `GET / 500` was a transient compile error from a duplicate `const [recent, setRecent]` declaration in dock.tsx — fixed by removing the old declaration; the lazy `useState` initializer version is the one kept)

## What was NOT touched (per task constraints)
- Brain AI — untouched.
- `proxy.ts` — untouched.
- Protected systems — untouched.
- All 8 dock tabs still work identically when navigated to (only their dock presentation changed).
- All 6 original registration fields are still collected — birthday + email moved to Profile settings, not removed.
- Every home-screen section is preserved — just wrapped in `{prefs.xxx && (...)}` + collapse chevron. No section markup was deleted.

## ADR / privacy notes
- ADR-001 (web-first PWA): the dashboard prefs + recent-tabs tracking are client-side only (localStorage). No server roundtrip.
- ADR-002 (server never sees plaintext): the deferred DOB is stored in the existing `cirkle-auth` localStorage record (same as before — just populated later). The age gate still runs client-side; no plaintext leaves the device.
- Privacy posture (§30.4): the only new localStorage keys are `cirkle-dashboard-layout` (section visibility prefs) and `cirkle-dock-recent` (recently-used secondary tabs). Both are user-controlled and contain no PII beyond the user's own UI preferences.

## Files touched
**Created** (3):
- `src/lib/dashboard-prefs.ts`
- `src/components/shell/customize-dashboard-sheet.tsx`
- `agent-ctx/UI-FIXES-1-full-stack-developer.md` (this file)

**Modified** (5):
- `src/lib/tabs.ts`
- `src/components/shell/dock.tsx`
- `src/lib/auth-store.ts`
- `src/components/auth/auth-screen.tsx`
- `src/components/overlays/settings-panel.tsx`
- `src/screens/home-screen.tsx`

## Suggested follow-up (out of scope for this task)
- The existing `showAllSections` mobile-progressive-disclosure button in home-screen.tsx wraps an empty `<div>` — it's now somewhat redundant with the Customize Dashboard sheet. Could be removed in a future cleanup pass.
- The `recordSecondaryTab` tracking only fires when the user picks a secondary tab from the More sheet. Hash-driven navigation (e.g. `#mashahd` URL) won't update `recent[]`. Could be extended by listening to the `circle:navigate` CustomEvent if needed.
- The `updateProfile` method is synchronous (no network). If profile syncing is added later, the `setTimeout(..., 200)` spinner delay in `ProfileAccountSection.save()` can be removed.

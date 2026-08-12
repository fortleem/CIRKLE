# Task ID: FIX-QUICK — Agent Work Record

**Agent:** full-stack-developer
**Task:** Fix 3 quick UI issues — (1) Dock 5+More structure, (2) Error Boundaries on all 8 screens, (3) Profile empty-state CTAs + Getting Started checklist + Suggested people.
**Status:** ✅ Complete · `bun run lint` → 0 errors, 0 warnings
**Prior context read:** `/home/z/my-project/worklog.md` (last 50 lines — GAPS-BATCH-2 follow-up was the prior task; OfflineStashItem service shipped; no conflicts with FIX-QUICK scope).

---

## Files Modified

| File | Change | LOC delta |
|---|---|---|
| `src/components/shell/dock.tsx` | Rewrote dock body: 5 PRIMARY_TABS + 1 More button (Sheet-backed). Preserved radial menu / long-press / keyboard nav / ARIA. | +190 |
| `src/app/page.tsx` | Wrapped all 8 screens in `ErrorBoundary` via the `screens` map. | +43 |
| `src/screens/profile-screen.tsx` | Added empty-state CTAs (header chips + posts-grid), Getting Started checklist (localStorage), Suggested People section. | +340 |

No files created. No DB schema changes. No API routes added. No Brain AI / proxy.ts / protected-systems touched.

---

## Task 1 — Dock 5+More structure

**Before:** Dock rendered all 8 `TABS` flat — 8 buttons in a horizontal scroll strip.

**After:** Dock renders 5 PRIMARY_TABS (Home, Wasl, Midan, Pay, Profile) + 1 "More" button. The More button opens a bottom `Sheet` listing the 3 SECONDARY_TABS (Mashahd, Lamahat, Rihla) with icon + label + subtitle + description + "Recent" badge.

### Key implementation points

- Imports changed from `TABS` to `PRIMARY_TABS`, `SECONDARY_TABS`, `MORE_TAB_ICON`, `isSecondaryTab`, `type TabId`.
- Added `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` imports from `@/components/ui/sheet`.
- Recently-used tracking at `localStorage["cirkle-dock-recent"]` (max 3 entries, filtered to secondary TabIds):
  - `readRecent()` / `writeRecent()` / `pushRecent(id)` helpers.
  - State hydrated via lazy `useState(() => readRecent())` initialiser (avoids the `react-hooks/set-state-in-effect` lint error).
  - `pushRecent()` called on every `pickSecondary()`; state refreshed from `readRecent()` after the write.
  - Small secondary-color dot indicator on the More button when there are recently-used secondary tabs and the More button isn't currently active.
- Active-pill animation: the shared `motion.span layoutId="dock-pill"` is rendered on either the active primary tab OR the More button (when `isSecondaryTab(active)`), so the pill smoothly animates between primary tabs and the More button. When the More button is active, its label expands to show the current secondary tab's localized name.
- Keyboard nav (`onKeyDown` on the `<nav>`): the dock is now 6 slots (5 primary + 1 More). Added `getDockIdx(active)` helper that maps a secondary-tab active state to the More button's position (index = `PRIMARY_TABS.length`). ArrowLeft/Right/Home/End move focus between the 6 buttons; when the next index is a primary tab, `onChange` is called (preserving the previous auto-switch behavior); when the next index is the More button, only focus moves — Enter/Space on the button opens the Sheet via its `onClick`.
- Preserved verbatim: `RADIAL_ACTIONS` map (still keyed by all 8 TabIds), long-press timer (500ms), move-threshold (10px), `clampAnchor`, right-click context menu, scroll-aware glass opacity, unread-conversations polling for the Wasl badge, ARIA `role="tablist"` / `role="tab"` / `aria-selected` / roving `tabIndex`, focus-visible ring.
- Added ARIA on the More button: `aria-haspopup="dialog"` + `aria-expanded={moreOpen}`.
- Sheet secondary-tab buttons also use `role="tab"` + `aria-selected` for consistency with the dock tablist semantics. Sheet closes on selection, on Escape (Radix built-in), and on overlay tap (Radix built-in).
- Bottom safe area respected: `pb-[max(1rem,env(safe-area-inset-bottom))]` on the Sheet body.

---

## Task 2 — Error Boundaries on all 8 screens

**Before:** `screens` map was a flat `Record<TabId, () => ReactElement>`:
```ts
const screens: Record<TabId, () => ReactElement> = {
  home: HomeScreen, wasl: WaslScreen, mashahd: MashahdScreen, lamahat: LamahatScreen,
  midan: MidanScreen, rihla: RihlaScreen, pay: PayScreen, profile: ProfileScreen,
};
```

**After:** Each entry is an arrow-function wrapper that renders the screen inside `<ErrorBoundary screenName="...">`:
```tsx
const screens: Record<TabId, () => ReactElement> = {
  home: () => (<ErrorBoundary screenName="home"><HomeScreen /></ErrorBoundary>),
  wasl: () => (<ErrorBoundary screenName="wasl"><WaslScreen /></ErrorBoundary>),
  // … 6 more …
};
```

### Why this approach

- The render site (`<Screen />` at `src/app/page.tsx:913`) is unchanged — `Screen = screens[tab]` returns the wrapper function, which when invoked returns the ErrorBoundary-wrapped screen.
- Each of the 8 screens gets its own boundary instance with a correct `screenName` for debugging.
- The parent `motion.main key={tab}` already remounts on tab switch — so the boundary's error state automatically resets when navigating away and back. No extra `key` plumbing needed.
- The `ErrorBoundary` class component (already shipped by a prior task) shows a bilingual retry + go-home fallback and dispatches `circle:navigate` on home. No changes to the boundary itself were needed.

---

## Task 3 — Profile empty-state CTAs + Getting Started + Suggested people

### New module-level helpers + constants

- `CHECKLIST_KEY = "cirkle-profile-checklist"` (localStorage key).
- `ChecklistItemId` = `"account" | "photo" | "post" | "circle" | "invite"`.
- `CHECKLIST_ITEMS` array — 5 items with `icon`, `label`, `hint`, optional `defaultDone`:
  1. ✅ Account created (default done)
  2. ☐ Add a profile photo (`Camera`)
  3. ☐ Make your first post (`FileText`)
  4. ☐ Join a Circle (`Users`)
  5. ☐ Invite a friend (`UserPlus`)
- `readChecklist()` / `writeChecklist()` — SSR-safe localStorage helpers; fallback = `{ account: true, others: false }`.
- `SUGGESTED_PEOPLE` array — 3 mock people:
  - Layla Hassan (@layla) — Photographer, rose→pink gradient.
  - Omar Khalil (@omar) — Travel writer, teal→emerald gradient.
  - Noor Abed (@noor) — Foodie, amber→orange gradient.

### New component state + handlers

- `checklist` — `useState(() => readChecklist())` (lazy init).
- `followed` — `useState<Set<string>>(() => new Set())`.
- `postsCount` — `useState<number>(0)` (default 0 = new user).
- `markChecklistItem(id)` — idempotent setState + persist.
- `toggleChecklistItem(id)` — manual toggle for rows.
- `onInviteFriends()` — `circle:contact-qr` event + mark invite + toast.
- `onDiscoverPeople()` — `circle:hub` event + toast.
- `onCreateFirstPost()` — `circle:composer` event (kind: post) + mark post + set `postsCount = MOCK_POSTS.length` to reveal the grid as a "what your feed will look like" preview.
- `onJoinCircle()` — `circle:hub` event + mark circle + toast.
- `onFollowPerson(person)` — toggle followed Set + toast on follow.

### Header CTAs (replaced inline "0 followers / 0 following / tier")

The previous inline stat row was:
```tsx
<span><b>0</b> followers</span>
<span><b>0</b> following</span>
<span><b>Verified/New</b> tier</span>
```

Now it's three compact CTA chips (white-on-dark glass style to fit the hero gradient):
1. **"Be the first to invite friends"** chip + `Invite` link → `onInviteFriends()`.
2. **"Discover people to follow"** chip + `Explore` link → `onDiscoverPeople()`.
3. Tier badge chip ("Verified" or "New") — preserves the existing tier display.

### New "Getting Started" section (placed after Activity Stats grid, before Quick Actions)

- Header with `Sparkles` icon, "Getting Started" title, `completedCount/total` counter on the right.
- Gold progress bar (`bg-gradient-gold`) showing completion percentage.
- `<ul>` of 5 checklist rows — each row is a `<button>`:
  - Left: 24px circle. Done → `Check` icon (gold gradient). Not done → item's icon (muted, bordered).
  - Middle: label (strikethrough + muted when done) + hint subtitle.
  - Right (only when not done): small action chip — "Upload" / "Post" / "Join" / "Invite" — that dispatches the corresponding handler. Account row has no action chip.
  - Tap on the row itself toggles the done state (manual override).
- Footer: "Progress saved on this device · Tap any row to toggle" or "All done — you're a Cirkle pro!" when 5/5.
- ARIA: `aria-pressed`, `aria-label` on each row; action chips have `role="button"` + `tabIndex={0}` + `onKeyDown` for Enter/Space.

### New "Suggested for You" section (placed after Getting Started)

- Header with `Users` icon.
- 3 mock person rows — each: gradient avatar with initials, name + verified badge, @handle, one-line bio, Follow / Following toggle button (gold gradient when not following, muted glass when following).
- ARIA: `aria-pressed` + `aria-label`.
- "Explore more people" button at the bottom → `onDiscoverPeople()`.

### Posts grid — empty-state CTA

The Recent Posts section now conditionally renders:
- When `postsCount === 0` (new-user default): centered empty-state CTA card — `FileText` icon in a tinted square, "Create your first post" title, descriptive subtitle, gold "Post" button (with `PenLine` icon) → `onCreateFirstPost()`. Below the button is a faded 3-cell dashed-border preview hint (text/photo/video icons + placeholder bars) so the user can see what the grid will look like.
- When `postsCount > 0`: existing 3-column `MOCK_POSTS` grid + color legend. The "View all" button only renders when `postsCount > 0`.

### Preserved (untouched)

Cover photo banner, avatar, verified/privacy badges, Stats grid (Trust score / Workspaces / Verified items), Activity Stats 4-column grid (Posts / Followers / Following / Circles), Quick Actions row, Achievement Badges, Brain AI banner, all 4 grouped settings cards (Account / Appearance / Privacy & Data / About), Region sheet, Detail sheet, Sign-out sheet, Account-deletion AlertDialog. None of the existing onClick handlers were modified.

---

## Verification

```bash
$ bun run lint
$ eslint .
# (no output = 0 errors, 0 warnings)
```

Baseline lint before any changes: 0 errors. Final lint after all 3 tasks: 0 errors.

## localStorage keys added

- `cirkle-dock-recent` — JSON array of secondary TabIds, max 3, most-recent-first.
- `cirkle-profile-checklist` — JSON object `{ account, photo, post, circle, invite }` of booleans.

Both are SSR-safe (guard `typeof window === "undefined"`) and gracefully no-op when storage is unavailable.

## A11y checklist

- [x] New buttons have `aria-label` / `aria-pressed` / `aria-haspopup` / `aria-expanded` as appropriate.
- [x] Custom interactive chips use `role="button"` + `tabIndex={0}` + `onKeyDown` for Enter/Space.
- [x] Roving `tabIndex` preserved on dock tablist.
- [x] Focus-visible rings on all new interactive elements.
- [x] Sheet respects bottom safe-area inset.
- [x] Screen-reader text on the More button's recent dot (`aria-hidden` since it's decorative).

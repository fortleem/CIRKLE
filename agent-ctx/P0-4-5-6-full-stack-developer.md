---
Task ID: P0-4-5-6
Agent: full-stack-developer
Task: P0.4 What's New + P0.5 Tablet responsive + P0.6 Accessibility

Work Log:

**P0.4 — Feature Discoverability ("What's New")**
- Read worklog.md tail (P0-2-LAMAHAT, P0-3-ONBOARDING context) — codebase is Next.js 16 PWA, 8 screens + 96 overlays + 173 routes + 67 models.
- Read /home/z/my-project/src/lib/overlay-registry.ts (990 LOC) — confirmed OVERLAY_REGISTRY has 65 entries with id/name/description/emoji/category/event/keywords; CATEGORY_META has 9 categories (safety/social/media/ai/travel/finance/privacy/productivity/health).
- Read /home/z/my-project/src/components/ui/overlay-shell.tsx (215 LOC) — verified OverlayShell provides backdrop, focus trap, Esc-to-close, body scroll lock, aria-modal; supports variant="sheet" with maxWidth prop.
- Created /home/z/my-project/src/components/overlays/whats-new.tsx (~300 LOC):
  - Exports: WhatsNew (component), WHATS_NEW_SEEN_KEY = "cirkle-whats-new-seen", WHATS_NEW_EVENT = "circle:whats-new".
  - Uses OverlayShell (variant="sheet", maxWidth="md:max-w-3xl") so backdrop/focus-trap/Esc/scroll-lock are inherited — no duplicated plumbing.
  - Sources every feature from OVERLAY_REGISTRY (live registry, not hardcoded) — automatically picks up new overlays.
  - localStorage `cirkle-whats-new-seen` stores a JSON map of seen overlay IDs.
  - Shows "NEW" badge (gold pill) on every unseen overlay; unseen features sorted to top, then grouped by category, then registry order.
  - Re-hydrates seen map from localStorage every time the overlay opens (so newly-seen IDs from a parallel tab are reflected).
  - Search input filters across name + description + emoji + category + keywords (case-insensitive).
  - Category chips: All + 9 categories with aria-pressed state; "New only · N" toggle filters to unseen only.
  - "Mark all N seen" + "Reset" footer buttons for power users.
  - Each card dispatches its `circle:*` event AND marks itself seen immediately; closes overlay after launch.
  - AnimatePresence + motion.section per category for stagger entrance.
  - Used prevOpen derived-state pattern (same as FirstLaunchTour / LamahatViewer) to avoid react-hooks/set-state-in-effect lint error.
  - Static Tailwind classes (no dynamic class interpolation); focus-visible:ring-2 on every interactive element.
  - aria-labels: "Open <name>, new feature" on cards; "Close What's New" on X button; "Search features" on input; "Reset seen features — show all as new" + "Mark all N new features as seen" on footer buttons.
- Integrated into /home/z/my-project/src/app/page.tsx:
  - Imported WhatsNew, added whatsNewOpen state, registered `circle:whats-new` event listener (addEventListener + matching removeEventListener in cleanup), rendered `<WhatsNew>` after the legal overlays.
- Wired entry points in /home/z/my-project/src/components/shell/top-bar.tsx:
  - Added a new Sparkles icon button (top bar, between Search and Languages) that dispatches `circle:whats-new`. Includes a pulsing accent dot indicator + focus-visible ring.
  - Re-purposed the existing Bell button (previously had no onClick) to also open What's New — gives users two obvious entry points.
- Verified EXCLUSIVES array in home-screen.tsx also lists features — but the What's New overlay intentionally sources from OVERLAY_REGISTRY (the canonical registry) rather than the home-screen list, since the registry is the single source of truth also consumed by OverlayBrowser + CommandPalette.

**P0.5 — Tablet / Responsive Remediation**
- Audited every screen + key overlays for `grid grid-cols-{n}` patterns missing `md:` / `lg:` breakpoints.
- Audited `flex flex-col` patterns for missing `md:flex-row` upgrades.
- Audited overlay widths for missing `md:max-w-*` caps.
- Audited text sizes for missing `md:text-*` scaling.
- Applied surgical fixes (additive only — never broke existing mobile layouts):
  1. **home-screen.tsx EXCLUSIVES grid**: `grid-cols-1 sm:grid-cols-2` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (was orphaning cards on 1024px+ screens).
  2. **pay-screen.tsx header**: `flex items-start justify-between` → `flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3`; title `text-4xl` → `text-4xl md:text-5xl`; subtitle `text-xs` → `text-xs md:text-sm`; Cirkle ID badge gets `self-start sm:self-auto` so it doesn't stretch full-width on mobile.
  3. **pay-screen.tsx spending analytics**: wrapped the 7-day bar chart + category donut in a new parent `grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3` so they sit side-by-side on 1024px+ screens (was stacked on every size).
  4. **pay-screen.tsx quick-stats row**: `gap-2` → `gap-2 md:gap-3`.
  5. **pay-screen.tsx section headers**: "Spending analytics" + "Recent activity" `text-xl` → `text-xl md:text-2xl`.
  6. **mashahd-screen.tsx trending hashtags**: `grid-cols-2 sm:grid-cols-3` → `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` (uses the 1024px breakpoint that was previously orphaned).
  7. **governance-center.tsx overlay**: `fixed bottom-0 inset-x-0 … rounded-t-[28px] … flex flex-col` → added `md:max-w-2xl md:mx-auto md:inset-y-[4vh] md:bottom-auto md:rounded-3xl` so on tablet+ it becomes a centered floating dialog instead of a full-width bottom sheet.
  8. **ai-orb.tsx**: `bottom-24 right-4` → `bottom-24 right-4 md:bottom-28` (aligns with the existing FAB `md:bottom-28`).
  9. **pay-screen.tsx download-receipt button**: added `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
- Verified mashahd-screen.tsx already had solid responsive grids (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for video grids, `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` for thumbnails).
- Verified wasl-screen.tsx already had appropriate mobile-first layouts — only needed focus-visible additions (handled in P0.6).
- Verified the 9 sheet-style overlays (ai-director, ai-mediator, ai-recap, chat-maze, circle-lens, color-story, debate-arena, echo-breaker, echo-remix) already have `max-w-2xl mx-auto` — no width changes needed.
- Did NOT touch any mobile-only 2-col grids inside small sheet content (e.g. receipt-split's tip buttons, time-capsule's quick-select) — these are intentionally 2-col because they live inside a 6vh-tall sheet.

**P0.6 — Accessibility Baseline**
- Created /home/z/my-project/src/lib/accessibility.ts (~580 LOC, new file):
  - `ARIA_LABELS` constant: 26 shared label strings (close, openAI, scanAndPay, etc.) — centralised so translations can be added later.
  - `ARIA_ROLES` constant: 23 WAI-ARIA role shortcuts.
  - `ARIA_DESCRIPTIONS` constant: 5 long-form descriptions for screen-reader-only context.
  - `FOCUSABLE_SELECTOR` + `getFocusable(container)` — same selector used by OverlayShell, exposed for reuse.
  - `useFocusTrap(active, opts)` hook: ref-callback-based focus trap. Saves previous focus, focuses first focusable child on activation, cycles Tab/Shift+Tab within container, restores focus on deactivation, optional onEscape handler. SSR-safe (returns early on server).
  - `useRovingTabindex({count, orientation, initial, loop, onActivate})` hook: returns `{ activeIndex, setActiveIndex, onKeyDown, tabIndexFor }`. Implements ArrowLeft/Right/Up/Down + Home/End navigation, optional Enter/Space activation, optional looping. For toolbars/tabs/docks.
  - `announce(message, {assertive})` helper: lazily creates a shared visually-hidden aria-live region on first call, sets polite/assertive mode, clears + re-sets text to force re-announcement.
  - `checkAccessibility(root?)` runtime audit function: walks the DOM for 6 common WCAG issues — (1) buttons without accessible name, (2) images without alt, (3) inputs without labels, (4) role="button" without keyboard handler, (5) duplicate IDs, (6) anchors without href. Returns `AccessibilityReport` with issues[] + passed flag. Logs to console.warn/error in dev. Safe to call on server (returns empty report). Does NOT check color contrast (requires computed styles — left to axe-core / DevTools).
  - `isActivationKey(e)` helper: returns true for Enter / Space.
  - `arrowDelta(e, orientation)` helper: returns -1/0/+1 for arrow keys in given orientation.
  - `SR_ONLY_STYLE` constant: CSSProperties object for programmatic sr-only DOM nodes.
  - `makeAriaId(prefix)` helper: generates stable unique IDs (uses crypto.randomUUID when available, falls back to counter+timestamp).
- Applied accessibility fixes to key components:
  1. **dock.tsx** — Added `role="tablist"`, `aria-label="Primary navigation"`, `aria-orientation="horizontal"` on the `<nav>`; each tab button gets `role="tab"`, `aria-selected={isActive}`, `tabIndex={isActive ? 0 : -1}` (roving-tabindex pattern); added `onKeyDown` handler with ArrowLeft/Right/Home/End navigation that updates active tab AND moves DOM focus to the newly active button; added `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` on every tab; `aria-hidden` on the Icon; `aria-label="${badge} unread"` on the unread badge. Radial menu: added `onKeyDown` with arrow-key navigation between `role="menuitem"` buttons; `tabIndex={i === 0 ? 0 : -1}` roving-tabindex; `aria-hidden` on center dot + ActionIcon; `focus-visible:ring-2` on each menu item.
  2. **top-bar.tsx** — Added `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` to every button (Search, Sparkles/What's-New, Languages, Mail, Settings, Theme, Bell). Re-labeled "Language" → "Switch language", "Theme" → "Toggle theme". `aria-hidden` on decorative dots. Min 44×44 touch targets preserved.
  3. **ai-orb.tsx** — `aria-label="AI Assistant"` → `aria-label="Open AI Assistant"`; added `md:bottom-28` + `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full`.
  4. **floating-insight-bar.tsx** — Main button gets `aria-label="${insight.text}. Open ${insight.overlay || "Cirkle Brain AI"}"` (was unlabeled); `aria-hidden` on emoji + "Open" chevron + X icon; added Space to the dismiss button's onKeyDown (was Enter-only); `focus-visible:ring-2` on both the main button and the dismiss control.
  5. **page.tsx** — Added `<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed …">Skip to main content</a>` link as the first focusable element after the aurora background. The `<motion.main>` gets `id="main-content" tabIndex={-1} focus:outline-none` so the skip target is focusable + scrollable-into-view. FAB Plus icon gets `aria-hidden`; FAB button gets `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
  6. **home-screen.tsx** — Added `aria-label="More options for post by ${p.handle}"` + `focus-visible:ring-2` to the previously-unlabeled 3-dot "more" post button; `aria-hidden` on its SVG icon. Added `aria-label="Jump to ${label} section"` + `focus-visible:ring-2` to the 9 sticky jump-to chips.
  7. **wasl-screen.tsx** — Bulk-added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to all 3 icon-only `w-9 h-9` buttons (Search, Starred, MoreVertical); added `aria-hidden` to the Search icon.
  8. **mashahd-screen.tsx** — Bulk-added `focus-visible:ring-2` to all 6 close buttons across the player / creator-sheet / share-sheet / comments / live-overlay / playlists overlays; `aria-hidden` on all 6 X icons.
  9. **pay-screen.tsx** — NFC button: `aria-label="NFC"` → `aria-label="Tap to pay via NFC — coming soon"` + `focus-visible:ring-2` + `aria-hidden` on Nfc icon. "See all" transactions button: added `aria-label="See all transactions — coming soon"` + `focus-visible:ring-2`. Download-receipt button: added `aria-label="Download transaction receipt"` + `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
  10. **overlay-browser.tsx** — Close button: added `focus-visible:ring-2`. `aria-hidden` on Search icon, Brain icon, both Sparkles icons (decorative — text is already labeled).
- Did NOT modify Brain AI, proxy.ts, or any protected system. The accessibility.ts module is a leaf utility consumed only by components that opt in.
- Lint: passes (0 errors, 0 warnings) after fixing the initial react-hooks/set-state-in-effect error in whats-new.tsx (refactored useEffect → prevOpen derived-state pattern) and removing an unused eslint-disable directive in accessibility.ts.

Stage Summary:

**Files created:**
- /home/z/my-project/src/lib/accessibility.ts (~580 LOC) — accessibility toolkit: ARIA_LABELS/ROLES/DESCRIPTIONS constants, useFocusTrap hook, useRovingTabindex hook, announce() helper, checkAccessibility() audit, keyboard nav helpers, makeAriaId().
- /home/z/my-project/src/components/overlays/whats-new.tsx (~300 LOC) — feature discoverability overlay sourced from OVERLAY_REGISTRY with NEW badges, search, category filter, "new only" toggle, mark-all-seen / reset, localStorage tracking.

**Files modified:**
- /home/z/my-project/src/app/page.tsx — imported WhatsNew, added whatsNewOpen state, registered `circle:whats-new` event listener + cleanup, rendered `<WhatsNew>` after legal overlays; added `<a href="#main-content">` skip link + `id="main-content" tabIndex={-1}` on `<motion.main>`; added `focus-visible:ring-2` + `aria-hidden` to FAB.
- /home/z/my-project/src/components/shell/top-bar.tsx — added Sparkles "What's New" icon button; wired Bell button to dispatch `circle:whats-new`; added `focus-visible:ring-2` + improved aria-labels on all 8 top-bar buttons; `aria-hidden` on decorative dots.
- /home/z/my-project/src/components/shell/dock.tsx — `role="tablist"` + `aria-orientation` on `<nav>`; `role="tab"` + `aria-selected` + `tabIndex` roving-tabindex on each tab button; ArrowLeft/Right/Home/End keyboard navigation that moves both selection AND DOM focus; `aria-hidden` on Icons; `aria-label` on unread badge; radial menu gets arrow-key navigation + `tabIndex` roving + `focus-visible:ring-2` + `aria-hidden` on decorative elements.
- /home/z/my-project/src/components/shell/ai-orb.tsx — `md:bottom-28` + `focus-visible:ring-2` + improved aria-label.
- /home/z/my-project/src/components/shell/floating-insight-bar.tsx — aria-label on main button; `aria-hidden` on decorative emoji/icons; Space key support on dismiss; `focus-visible:ring-2`.
- /home/z/my-project/src/components/overlays/overlay-browser.tsx — `focus-visible:ring-2` on close button; `aria-hidden` on 4 decorative icons.
- /home/z/my-project/src/components/overlays/governance-center.tsx — overlay width responsive: `md:max-w-2xl md:mx-auto md:inset-y-[4vh] md:bottom-auto md:rounded-3xl` (sheet → centered dialog on tablet+).
- /home/z/my-project/src/screens/home-screen.tsx — EXCLUSIVES grid `lg:grid-cols-3`; jump-to chips get `aria-label` + `focus-visible:ring-2`; "more" post button gets `aria-label` + `focus-visible:ring-2` + `aria-hidden` on SVG.
- /home/z/my-project/src/screens/pay-screen.tsx — header `flex-col sm:flex-row` + text scaling; 7-day chart + donut wrapped in `lg:grid-cols-2`; section header text scaling; quick-stats gap scaling; NFC + See-all + Download-receipt buttons get aria-labels + focus-visible + aria-hidden on icons.
- /home/z/my-project/src/screens/mashahd-screen.tsx — trending hashtags `lg:grid-cols-4`; 6 close buttons get `focus-visible:ring-2`; 6 X icons get `aria-hidden`.
- /home/z/my-project/src/screens/wasl-screen.tsx — 3 icon-only buttons get `focus-visible:ring-2`; Search icon gets `aria-hidden`.

**Lint:** passes (0 errors, 0 warnings).
**HTTP check:** `curl http://localhost:3000/` returns 200 OK after changes.
**No new dependencies added.**
**No Prisma schema changes.**
**No new API routes.**
**No Brain AI / proxy.ts / protected system modifications.**

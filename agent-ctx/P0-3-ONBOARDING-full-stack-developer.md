# P0-3-ONBOARDING — First-Launch Onboarding Walkthrough

**Agent:** full-stack-developer
**Task ID:** P0-3-ONBOARDING
**Status:** ✅ Complete
**Lint:** 0 errors, 0 warnings

## What Was Built

An interactive, skippable, accessible first-launch tour for CIRKLE that walks new users through all 8 tabs + 4 flagship features in 12 steps. Persists completion/skip state in localStorage so it only appears once per device.

## Files

| File | Action | LOC |
|------|--------|-----|
| `src/components/first-launch-tour.tsx` | **Created** | 588 |
| `src/app/page.tsx` | Modified | +33 net |

## Tour Steps (12)

1. Welcome to CIRKLE (overview, gold accent)
2. Home Dashboard (tab: home, gold) — composer, trending, feed
3. Wasl — Chat (tab: wasl, teal) — E2EE, privacy
4. Mashahd — Video (tab: mashahd, rose) — ad-free, P2P
5. Lamahat — Photos (tab: lamahat, gold) — stories, collections
6. Midan — Square (tab: midan, accent) — microblogging
7. Rihla — Travel (tab: rihla, teal) — destinations, deals
8. Cirkle Pay — Payments (tab: pay, gold) — 0% fees, non-custodial
9. Profile (tab: profile, rose) — verified human, privacy badges
10. Citizen Shield (accent) — government accountability
11. Brain AI (teal) — 9-phase cognitive architecture
12. You're all set! (gold) — completion

## Key Implementation Details

### Visual Highlight (Overlay + Cutout)
- Semi-transparent backdrop: `bg-charcoal/75 backdrop-blur-sm`
- Cutout via giant box-shadow on the glass-strong card:
  `boxShadow: 0 0 0 100vmax hsl(var(--charcoal) / 0.55), 0 25px 60px -15px hsl(var(--charcoal) / 0.6), 0 0 80px -10px {accent-glow}`
- The card stays bright while the rest of the screen is dimmed
- Animated decorative glow behind card matches step accent color

### Persistence
- localStorage key: `cirkle-onboarding-completed` (exported as `TOUR_STORAGE_KEY`)
- Values: `"completed"` (user reached last step) or `"skipped"` (user pressed Skip/Esc)
- Checked in page.tsx useEffect after `authHydrated + isAuthenticated + !showSplash + !showOnboarding` (700ms delay so main UI settles first)
- localStorage errors silently caught (private mode / quota)

### Accessibility
- `role="dialog"`, `aria-modal="true"`
- `aria-labelledby` → step title, `aria-describedby` → step description
- sr-only live region (`aria-live="polite"`, `aria-atomic="true"`) announces "Step X of 12. {srLabel}"
- `aria-current="step"` on active progress dot
- Focus trap: Tab cycles within the card (first↔last element wrap)
- Auto-focus on Next button when step changes (deferred 80ms)
- Body scroll lock while open
- Keyboard nav:
  - `Escape` → skip tour
  - `ArrowRight` / `Enter` → next step (Enter on Skip button preserved)
  - `ArrowLeft` → previous step
  - `Tab` / `Shift+Tab` → focus trap cycle

### Responsive
- Mobile (`<sm`): card bottom-anchored, `p-3`, body `flex-col`
- Tablet/Desktop (`sm+`): card centered, `p-6`, body `flex-row`, `max-w-lg`
- Font sizes scale with `sm:` breakpoint (`text-xl` → `sm:text-2xl`)
- Touch targets ≥44px (Next button `px-6 py-2.5`, dots `h-1.5 w-1.5` but clickable area is the button wrapper)

### Framer Motion
- Outer `AnimatePresence` for overlay fade (250ms)
- Inner `AnimatePresence mode="popLayout"` with `custom={direction}` for slide left/right + scale transitions (320ms, ease [0.16, 1, 0.3, 1])
- Top progress bar animates width (400ms)
- Step icon scales in (400ms, 50ms delay)
- Decorative glow animates opacity + scale (600ms)

### Tab Navigation Integration
- When a step has `tab` property, useEffect calls `onNavigateTab?.(step.tab)` → page.tsx `setTab(t)` → updates both React state and URL hash so back button works
- User sees the actual screen for each tab behind the spotlight during the tour

### State Reset Pattern (Lint Fix)
- Initial implementation used `useEffect` to reset `stepIndex` when `open` changes → triggered `react-hooks/set-state-in-effect` lint error
- Fixed via "derived-state-with-prevKey" pattern (same as LamahatViewer per P0-2-LAMAHAT worklog):
  ```tsx
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) { setStepIndex(0); setDirection(1); }
  }
  ```

### Tailwind Class Strategy
- All accent-tinted class strings stored in static lookup objects (`ACCENT_TEXT`, `ACCENT_GRADIENT`, `ACCENT_GLOW`, `ACCENT_DOT`, `ACCENT_TIP_BOX`) so Tailwind JIT can detect them
- No dynamic class interpolation (which JIT would purge)

## Integration in page.tsx

```tsx
// Import
import { FirstLaunchTour, TOUR_STORAGE_KEY } from "@/components/first-launch-tour";

// State
const [showTour, setShowTour] = useState(false);

// Trigger (after auth + splash + intro onboarding)
useEffect(() => {
  if (!authHydrated || !isAuthenticated || showSplash || showOnboarding) return;
  let done: string | null = null;
  try { done = localStorage.getItem(TOUR_STORAGE_KEY); } catch { done = null; }
  if (!done) {
    const t = setTimeout(() => setShowTour(true), 700);
    return () => clearTimeout(t);
  }
}, [authHydrated, isAuthenticated, showSplash, showOnboarding]);

// Persist completion/skip
const closeTour = useCallback((completed: boolean) => {
  setShowTour(false);
  try { localStorage.setItem(TOUR_STORAGE_KEY, completed ? "completed" : "skipped"); } catch {}
}, []);

// Render (after CookieConsentBanner + Composer + intro Onboarding)
<FirstLaunchTour
  open={showTour}
  onNavigateTab={setTab}
  onComplete={() => closeTour(true)}
  onSkip={() => closeTour(false)}
/>
```

## Constraints Honored

- ✅ Did NOT modify Brain AI, proxy.ts, or any protected systems
- ✅ Used existing shadcn/ui patterns + Tailwind classes
- ✅ Used lucide-react icons (no new icon library)
- ✅ Used Framer Motion (already in stack)
- ✅ Used `glass-strong` class for tooltip card
- ✅ Used existing design tokens (gold/rose/teal/accent/charcoal/cream)
- ✅ No new dependencies installed
- ✅ No Prisma schema changes
- ✅ No new API routes
- ✅ Mobile/tablet/desktop responsive
- ✅ Keyboard nav + focus traps + sr-only labels

## Lint Result

```
$ bun run lint
$ eslint .
(0 errors, 0 warnings)
```

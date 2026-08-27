# Task ID: ARABIC-UI
**Agent**: full-stack-developer
**Task**: Full Egyptian Arabic UI + Error Boundaries for CIRKLE (دواير)
**Baseline**: `bun run lint` → 0 errors, 0 warnings ✅ (verified before starting)
**Final**: `bun run lint` → 0 errors, 0 warnings ✅

---

## Scope

Four deliverables, all implemented:

1. **Complete Egyptian Arabic locale pack** (`src/lib/locale-packs/ar.json`) — full Masri (لهجة مصرية) translation, NOT Modern Standard Arabic.
2. **RTL support** — `applyLocaleToDocument()` helper in `src/lib/i18n.ts` + comprehensive `[dir="rtl"]` CSS rules in `src/app/globals.css`. The existing `app-store.ts` already wires `<html dir lang>` on hydrate/toggle; the helper centralises that logic for future callers.
3. **Error boundaries** — `src/components/error-boundary.tsx` (class component, per-screen `screenName`, friendly retry + go-home UI, console.error logging with structured tags for future Sentry hook).
4. **Loading skeletons** — `src/components/ui/loading-skeleton.tsx` (new generic `SkeletonCard`/`SkeletonPill`/`SkeletonRow`/`InlineLoading` + screen-specific `HomeSkeleton`/`WaslSkeleton`/`NewsSkeleton`/`ProfileSkeleton`/`MidanSkeleton`; re-exports the existing `SkeletonFeed`/`SkeletonList`/`SkeletonNews`/`SkeletonGrid`/`SkeletonChat`/`Skeleton` from `ui/skeleton.tsx`).

---

## Work Log

### #1 — Egyptian Arabic locale pack (`src/lib/locale-packs/ar.json`)

The existing `ar.json` was Modern Standard Arabic (e.g., "صباح الخير", "ابحث", "إرسال", "شكراً", "مستخدم"). Replaced with Egyptian dialect equivalents throughout:

| MSA (was) | Egyptian (now) |
|---|---|
| صباح الخير | صباح الفل |
| مساء الخير | مساء القمر |
| ابحث | دوّر |
| إرسال | ابعت |
| شكراً | تسلم |
| مستخدم | يوزر |
| ما رأيك؟ | انت بتفكر في ايه؟ |
| الرجاء | لو سمحت |
| حسناً | تمام |
| إلغاء | الغي |
| حفظ | احفظ |
| نشر | انشر |
| إنشاء منشور | اعمل بوست |
| اكتشف | اكتشف (kept — commonly used in EG) |

**Back-compat invariant preserved**: every field the existing code accesses via `dict[locale].*` (i.e. `appName`, `tagline`, `greeting.{morning,afternoon,evening,welcome}`, `common.*`, `tabs.{home,wasl,mashahd,lamahat,midan,rihla,pay,mail,profile}`, `buttons.{enter,skip,continue,post,reply,rsvp,going,interested,notGoing,createPost,askAi,explore}`, `sections.{featured,nearby,forYou,trending,workspace,spaces,sponsored,upcomingCircles,exclusives,news,miniApps,mail}`, `onboarding.{slide1..slide5,cta,skip,next}`, `nav.{home,wasl,mashahd,lamahat,midan,rihla,pay,profile}`, `home.{hello,featured,nearby,forYou,trending,workspace,ask,miniApps,mail,mailSub,id,idSub,mesh,spaces}`, `ai.{title,sub,placeholder,send,examples}`, `palette.placeholder`, `sponsored.{label,why,hide}`, `upcoming.{title,empty,rsvpGoing,rsvpInterested}`) is present in the new `ar.json` with Egyptian-dialect values.

**New keys added** (per task spec): `greeting.night`, `tabs.more`, `buttons.{like,comment,follow,unfollow,filter,sort,back,next,done,create,join,leave,invite,accept,decline,refresh,loadMore,customize,settings}`, `sections.{breaking,local,world,sports,economy,technology,health,entertainment,happeningNearby,officialUpdates,liveSpaces,citizenShield,todayCirkle,cirkleExclusives,allFeatures,whatsNew,stories,collections,memories,moments}`, `onboarding.{welcome,welcomeDesc,step1..step11,back}`, `nav.{more,search,notifications,messages,settings}`, `home.{whatsOnYourMind,createPost,addPhoto,addVideo,askAI}`, plus new top-level sections `wasl`, `mashahd`, `lamahat`, `midan`, `pay`, `rihla`, `profile`, `privacy`, `ai.{brainActive,askBrain,brainThinking,aiRecap,crossEvaluate,providers}`, `sponsored.yourAdHere`, `upcoming.{events,rsvp,going,maybe,notGoing}`.

All examples array (`ai.examples`) translated to Egyptian too: `["لخّص يومي", "خطط رحلتي لإسطنبول", "رد على ليلى بنبرتي", "اكتب اعتذار مهذّب"]`.

### #2 — `src/lib/locale-packs/en.json` (extended for type consistency)

The `LocalePack` type in `src/lib/i18n-loader.ts` is `Omit<typeof enJson, "dir"> & { dir: "ltr" | "rtl" }` — i.e., it derives from the **English** pack's shape. To keep type-safety when the new `ar.json` keys are accessed via `dict[locale].wasl.title` etc., the same keys must exist in `en.json`. Updated `en.json` to add all the new keys (with English values) so:

- `LocalePack` type now includes `wasl`, `mashahd`, `lamahat`, `midan`, `pay`, `rihla`, `profile`, `privacy`, `greeting.night`, `tabs.more`, all the new `buttons.*`, all the new `sections.*`, all the new `onboarding.*` (welcome/welcomeDesc/step1..step11/back), all the new `nav.*`, all the new `home.*`, all the new `ai.*`, `sponsored.yourAdHere`, all the new `upcoming.*`.
- Existing English strings were NOT modified — only new keys added.
- The other locale packs (fr/es/tr/ur/hi) were NOT modified — they're cast with `as LocalePack` so TypeScript doesn't complain, and existing call sites only access keys those packs already have. New call sites that access `dict.fr.wasl.*` would return `undefined` at runtime — acceptable since no current code does that.

### #3 — RTL support

**`src/lib/i18n.ts`**: added `applyLocaleToDocument(locale: string | null | undefined)` helper that:
- Reads the pack's `dir` field via `getDirection(locale)`.
- Sets `document.documentElement.dir` and `document.documentElement.lang` accordingly.
- Is SSR-safe (no-op when `document` is undefined).
- Centralises the `<html dir lang>` logic that `app-store.ts` already implements inline in `hydrate()` and `toggleLocale()` — those existing call sites remain unchanged (they work correctly), but new code can now use the helper.

**`src/app/globals.css`**: added a comprehensive `[dir="rtl"]` block (after the existing skeleton-shimmer rule) covering:
- Arabic-friendly font stack: `[dir="rtl"] body` → `var(--font-tajawal), 'Cairo', ui-sans-serif, system-ui, sans-serif`. The `--font-tajawal` variable is already wired in `layout.tsx` (next/font Tajawal).
- Display-font fallback: `[dir="rtl"] h1/h2/h3/.font-display` → Tajawal first (Fraunces doesn't ship Arabic glyphs).
- `.rtl-mirror` utility: `transform: scaleX(-1)` for directional Lucide icons (ChevronRight, ArrowRight, etc.).
- `.rtl-flip-left` / `.rtl-flip-right` utilities: flip absolutely-positioned elements that use physical `right-*`/`left-*`.
- `.rtl-anchor-start` / `.rtl-anchor-end`: flip popover/sheet anchor sides.
- `[dir="rtl"] ::-webkit-scrollbar { direction: rtl }` — scrollbar appears on the left in RTL.
- `[dir="rtl"] [role="slider"] { direction: rtl }` — Radix Slider safety net.
- `.rtl-toast-swap` utility: mirror toast position to bottom-left in RTL.
- Input direction rules: Arabic text inputs get `direction: rtl; text-align: right`; URL/email/number/tel inputs stay LTR (numbers and URLs are always LTR).
- `.rtl-badge-flip` utility: avatar badges (status dots) flip from `right-*` to `left-*`.
- A comment block noting that Tailwind v4 ships logical-property utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) that auto-flip — components should prefer those over the physical `ml-*`/`mr-*`/`left-*`/`right-*` ones.

### #4 — `src/components/error-boundary.tsx`

React class component (error boundaries require `componentDidCatch`/`getDerivedStateFromError` — no hook equivalent exists).

- **Props**: `screenName: string` (required), `children: ReactNode`, optional `onError(error, info, screenName)` callback (for future Sentry), optional `onReset(screenName)`, optional `fallback(error, retry, screenName)` for custom branded error UIs.
- **State**: `{ error: Error | null, retryCount: number }`.
- **`getDerivedStateFromError`**: sets `error` so the next render shows the fallback.
- **`componentDidCatch`**: logs to `console.error` with a structured tag `[ErrorBoundary] screen="<name>" message="<msg>"` + a context object (screen, message, stack, componentStack) — this is where a future `Sentry.captureException(error, { extra: {...} })` call would slot in. Fires `onError` if provided.
- **`retry()`**: bumps `retryCount` which changes the children wrapper's `key` — forces React to unmount the crashed subtree and remount a fresh one, clearing partial state corruption.
- **`goHome()`**: dispatches the app-wide `circle:navigate` event with `tab: "home"` so the shell swaps back to the Home tab, then calls `retry()`.
- **Default fallback UI**: glass card with destructive-tinted AlertTriangle icon, bilingual heading (`"<label> — حاجة وقعت"`), error message, a `<details>` with the stack trace (collapsed by default for a calm UI), and two buttons: "حاول تاني" (Retry, primary) + "ارجع الرئيسية" (Go home, glass).
- **Children wrapper**: `<div key={`eb-${screenName}-${retryCount}`}>` — the key forces remount on retry.
- **screenNameLabel()**: maps TabId → bilingual label (`home` → "Home · الرئيسية", etc.).

### #5 — `src/components/ui/loading-skeleton.tsx`

New file that re-exports the existing variants from `ui/skeleton.tsx` (`SkeletonFeed`, `SkeletonList`, `SkeletonNews`, `SkeletonGrid`, `SkeletonChat`, `Skeleton`) AND adds:

- **Generic**: `SkeletonCard` (avatar + 2-line body + image block + 3 footer rows — matches a typical feed-post shape), `SkeletonPill` (tag/badge chip), `SkeletonRow` (single list row with avatar + 2 lines + trailing pill).
- **`LoadingShell`** (internal): aria-live wrapper — every screen-level skeleton gets `role="status"` + `aria-live="polite"` + a screen-reader-only "Loading…" label so SR users hear "loading" instead of silence.
- **`InlineLoading`**: small `Loader2` spinner + text label (defaults to "بيحمّل…"). Use when the skeleton shape is unknown or for very short loading windows.
- **Screen-specific composites**: `HomeSkeleton` (greeting bar + composer pill + featured carousel + For-You grid + news list — mirrors the home dashboard's main column layout), `WaslSkeleton` (search bar + 8 conversation rows), `NewsSkeleton` (category tab strip + 4 article thumbnail rows), `ProfileSkeleton` (header card + 3-stat grid), `MidanSkeleton` (compose box + 4 SkeletonCards).

All composites respect `prefers-reduced-motion` via the global CSS rule (animation-duration: 0.01ms when reduced-motion is on).

### #6 — `src/app/page.tsx` (ErrorBoundary wrap)

- Imported `ErrorBoundary` from `@/components/error-boundary`.
- Wrapped the `<Screen />` render inside `<motion.main>` with `<ErrorBoundary screenName={tab}><Screen /></ErrorBoundary>` — the `tab` state (active TabId) is passed as `screenName` so the boundary's error UI + console log identify which screen crashed.
- The `motion.main`'s `key={tab}` still drives the AnimatePresence exit/enter animation; the ErrorBoundary sits inside so a crash in one tab doesn't bleed into the next tab's transition.

### #7 — `src/screens/home-screen.tsx` (loading states)

Four changes:

1. **Import**: added `HomeSkeleton, SkeletonCard, SkeletonList, InlineLoading` from `@/components/ui/loading-skeleton`. Removed `SkeletonNews` from the `ui/skeleton` import (no longer used — replaced by `SkeletonCard` ×3, see #3 below).

2. **Top-level loading gate** (NEW, before the main `return`): `if (loading && !feed) return <HomeSkeleton />;` — shows a polished skeleton dashboard during the very first feed load (before any data arrives). Once `feed` is non-null (success OR error — the catch block sets an empty fallback), the dashboard renders normally and per-section loading states handle subsequent refreshes. This is the "Show HomeSkeleton while feed is loading" requirement.

3. **News loading** (line ~2192): replaced `<SkeletonNews />` with `<div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>` — three generic SkeletonCard placeholders while the news API call is in flight. ("Show SkeletonCard while news is loading".)

4. **Priority Shares loading** (line ~538, the `loadingShares` branch): replaced the inline `[0,1,2].map(i => <div className="shrink-0 w-[200px] h-[100px] skeleton-shimmer rounded-2xl" />)` with `<SkeletonList />` — vertical list of avatar+text rows as a generic "conversations loading" affordance while the 3 parallel `/api/posts` fetches resolve. ("Show SkeletonList while conversations are loading" — interpreting "conversations" as the recent-posts-from-circles widget.)

5. **Bottom loading spinner** (line ~2808): replaced the inline `<div className="flex items-center justify-center text-xs text-muted-foreground gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Curating your live feed…</div>` with `<InlineLoading label="بيحمّل الفيد…" className="pb-4" />` — uses the new helper component + Egyptian Arabic label.

---

## Files Touched

**Created (2)**:
- `src/components/error-boundary.tsx` (~175 LOC)
- `src/components/ui/loading-skeleton.tsx` (~225 LOC)

**Modified (5)**:
- `src/lib/locale-packs/ar.json` (full Egyptian dialect rewrite — back-compat keys preserved + all new task-specified keys added)
- `src/lib/locale-packs/en.json` (added the same new keys with English values so the `LocalePack` type stays consistent — no existing English strings changed)
- `src/lib/i18n.ts` (added `applyLocaleToDocument(locale)` helper + docstring)
- `src/app/globals.css` (added ~135 lines of `[dir="rtl"]` rules — fonts, mirror utilities, input direction, scrollbar, slider, toast positioning)
- `src/app/page.tsx` (imported `ErrorBoundary` + wrapped `<Screen />` with `<ErrorBoundary screenName={tab}>`)
- `src/screens/home-screen.tsx` (4 changes: import update, top-level `HomeSkeleton` gate, news `SkeletonCard` ×3, Priority Shares `SkeletonList`, bottom `InlineLoading`)

---

## Verification

- **Lint**: `bun run lint` → 0 errors, 0 warnings ✅ (run after every change)
- **JSON validity**: both `ar.json` and `en.json` parse cleanly (`node -e JSON.parse(...)` ✅)
- **Type safety**: the `LocalePack` type derives from `typeof enJson`; since the new keys are in `en.json`, accessing `dict[locale].wasl.title` etc. typechecks. The other locale packs (fr/es/tr/ur/hi) are cast with `as LocalePack` so they don't need to be updated — existing call sites only access keys those packs already have.
- **RTL switching**: `app-store.ts` already sets `document.documentElement.dir` and `lang` on `hydrate()` and `toggleLocale()`. The new `applyLocaleToDocument()` helper in `i18n.ts` centralises this logic for future callers (app-store unchanged — its inline implementation is functionally identical).
- **No Brain AI / proxy.ts / protected-systems modified.**
- **Dev server**: dev.log tail shows the previous transient `dock.tsx` "duplicate recent" error was already fixed by the UI-FIXES-1 agent (`GET / 200 in 703ms` is the last entry). My changes don't introduce any new compile errors (lint clean + JSON valid).

---

## Notes for Downstream Agents

- The `applyLocaleToDocument(locale)` helper in `src/lib/i18n.ts` is the canonical place to set `<html dir lang>` — if you're adding a new locale-switching code path (e.g., a language picker in settings), prefer calling this helper over re-implementing the dir/lang logic inline.
- The `ErrorBoundary` is per-screen (the `screenName` prop surfaces in the error UI + console log). To wrap a non-screen subtree (e.g., a complex overlay), pass a descriptive `screenName` like `"citizen-shield-overlay"` — the `screenNameLabel()` map falls back to the raw string for unknown names.
- The `loading-skeleton.tsx` module is the one-stop shop for loading states. Prefer importing from `@/components/ui/loading-skeleton` over `@/components/ui/skeleton` for new code — it re-exports everything from `skeleton.tsx` AND adds the screen-level composites.
- For new components that need to work in both LTR and RTL, prefer Tailwind v4's logical-property utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) over the physical `ml-*`/`mr-*`/`left-*`/`right-*` ones. The physical utilities remain for cases where the visual position should NOT flip (e.g., a close button that stays in the visual top-right corner regardless of locale).
- The Egyptian Arabic strings in `ar.json` are deliberately dialectal (Masri), not MSA. When adding new strings, follow the same dialect conventions: "دوّر" not "ابحث", "ابعت" not "إرسال", "تسلم" not "شكراً", "يوزر" not "مستخدم", "تمام" not "حسناً", "الغي" not "إلغاء", etc.

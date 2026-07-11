# Task: rihla-screen-data-planes-02

**Agent:** full-stack-developer
**Task:** Build the Visa-Free Destination Explorer overlay (`src/components/overlays/visa-explorer.tsx`) and the regional payment/service data plane configs (`src/lib/regional-payments.ts`). Do NOT modify `src/screens/rihla-screen.tsx` or `src/app/page.tsx`.

## Context reviewed

- `worklog.md` — most recent task was `rihla-screen-backend-01` which shipped 7 Rihla API routes including `/api/visa/free-destinations`.
- `src/screens/rihla-screen.tsx` (559 lines) — existing Rihla UI: rose-tinted palette, Sheet-based panels, `useApp().country` for active passport, sonner toasts.
- `src/app/api/visa/free-destinations/route.ts` — confirmed the actual response contract: bucketed `{ passport, generatedAt, visaFree[], visaOnArrival[], eVisa[], embassyRequired[] }` with slim entries (`{ code, name, flag, arabicName?, maxStayDays?, notes?, eVisaUrl? }`). No `visaType` / `processingTime` / `fee` fields.
- `src/lib/visa-service.ts` — visa-type-aware processing time + fee heuristics that I mirrored in the overlay's `normalizeDestination` defaults.
- `src/components/overlays/cirkle-mood.tsx`, `cirkle-pact.tsx`, `cirkle-shield.tsx` — absorbed the established overlay conventions (z-[150] full-screen, derived-state `prevOpen` pattern, layoutId pill tabs, brand-only palette).
- `src/lib/tabs.ts` — confirmed `rihla` is a valid `TabId` for the `circle:navigate` dispatch.

## Files produced

### 1. `src/lib/regional-payments.ts` (~140 lines)

Pure data file (no `"use client"`, no `"server-only"` — browser-safe).

- `RegionalPayment` interface: `{ id, name, webhook?, checkoutUrl?, widget?, type, icon, description }`
- `RegionalService` interface: `{ id, name, widget, type, icon, description }`
- `RegionalPaymentType` union: `bank_transfer | mobile_wallet | cash_voucher | digital_wallet | card | qr | crypto`
- `RegionalServiceType` union: `maps | marketplace | local_services`
- `EGYPT_PAYMENTS`: `instapay` (⚡ bank_transfer), `vodafoneCash` (📱 mobile_wallet), `fawry` (🏪 cash_voucher) — with webhook + checkoutUrl.
- `CHINA_PAYMENTS`: `alipay` (💳 digital_wallet, H5 widget), `wechatPay` (💬 digital_wallet, H5 widget).
- `CHINA_SERVICES`: `amap` (🗺️ maps, 高德地图), `taobao` (🛍️ marketplace, 淘宝), `meituan` (🍜 local_services, 美团).
- `getRegionalPayments(countryCode)`, `getRegionalServices(countryCode)`, `getRegionalPayment(countryCode, id)` — country codes `.toUpperCase()`-normalised, empty-array fallback for unsupported countries.

### 2. `src/components/overlays/visa-explorer.tsx` (~820 lines)

Full-screen overlay (`fixed inset-0 z-[150] bg-background flex flex-col`).

- **Props**: `{ open, onClose, passportCountry }` — `"use client"`.
- **Imports**: `motion, AnimatePresence` (framer-motion); `X, Search, Plane, FileCheck, Clock, Globe, ChevronRight` (lucide-react); `toast` (sonner); `cn` (`@/lib/utils`); `useEffect, useMemo, useState` (react). All used.
- **Header**: passport flag pill with `bg-gradient-mesh` glow + gold ring, "Where can your passport take you?" headline, subtitle with passport country name + total easy-access destination count, close X.
- **Search bar**: `Search` icon, search input with focus-ring, clear-X when query non-empty. Filters within active tab by name / ISO code / Arabic name.
- **Three tabs** (layoutId pill switcher): Visa Free (emerald) / On Arrival (gold gradient) / E-Visa (rose). Live count badges. Mobile collapses to short labels.
- **Fetch**: `GET /api/visa/free-destinations?passport=${encodeURIComponent(passportCountry.toUpperCase())}`. Tolerates three response shapes: live bucketed `{ visaFree, visaOnArrival, eVisa }`, bare flat array, `{ destinations: [...] }` envelope.
- **`normalizeDestination(raw, fallbackType)`**: defaults `visaType` from the bucket the entry came from, synthesises sensible `processingTime`/`fee` defaults (matching `visa-service.ts` heuristics) so the detail card always has meaningful values even though the live API omits those fields.
- **Loading**: 9-up shimmer skeleton grid (`SkeletonCard` with `animate-pulse` placeholders).
- **Country grid**: 1 col mobile / 2 col sm / 3 col lg. Cards show flag, name, Arabic name (RTL `font-arabic`), visa-type chip, "Up to {stay}" counter, animated `ChevronRight`. Staggered spring-in (capped at 0.32s), `whileHover={{ y: -2 }}`.
- **Detail panel** (`DetailPanel`, slides in from right at `z-30` over the body): hero flag tile with visa-type-tinted radial gradient + grid overlay, visa-type chip + max-stay inline badge, 3-up fact grid (Max stay / Processing / Fee) with brand-color icons, notes panel with gold→rose gradient wash, e-visa portal link card (teal-tinted) when `eVisaUrl` present, **"Explore {country} on Rihla"** gold-gradient CTA → `window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: "rihla" } }))` + sonner toast + `onClose()`.
- **Footer**: "Powered by Orizon Visa API" covenant note.
- **Empty state**: "No matches" card with clear-search button.
- **Error state**: soft-fail to built-in `SA_FALLBACK` dataset (33 curated SA destinations across all three visa types) + error footnote + `toast.info("Showing cached visa data")`. Overlay stays demoable with no backend.
- **State reset**: derived-state `prevOpen` + `prevPassport` pattern (setState during render, not in effect body) → satisfies `react-hooks/set-state-in-effect` lint rule. Loading primed in derived-state block; `useEffect` only does the fetch.

## Lint cycle

1. First `bun run lint` → 1 error: `react-hooks/set-state-in-effect` on `setLoading(true)` + `setError(null)` calls in the effect body.
2. Refactored to derived-state `prevOpen` + `prevPassport` pattern (matching `cirkle-shield.tsx`).
3. Second `bun run lint` → **clean**: 0 errors, 0 warnings on new files. (1 pre-existing warning in `src/screens/rihla-screen.tsx:475` is outside this task's scope — I was explicitly forbidden to modify that file.)

## Verification

- `curl http://127.0.0.1:3000/api/visa/free-destinations?passport=SA` → returns expected bucketed JSON with `visaFree[0] = { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", arabicName: "الإمارات", maxStayDays: 90, notes: "GCC citizens can travel freely…" }`. Overlay's `flattenResponse` + `normalizeDestination` pipeline consumes this cleanly.
- `dev.log` shows `✓ Compiled in 708ms` with no `Failed to compile` / `Module not found` errors after the files were added.
- No existing files modified (per task constraint).

## Files NOT modified (per task constraint)

- `src/screens/rihla-screen.tsx` — main agent will wire the overlay in.
- `src/app/page.tsx` — main agent will add the `circle:visa-explorer` event listener (mirroring `cirkle-dna` / `cirkle-pact`).

## Ready for the main agent

- Mount `<VisaExplorer open={visaOpen} onClose={() => setVisaOpen(false)} passportCountry={country} />` somewhere in the tree (likely `page.tsx` alongside the other overlays).
- Add a `circle:visa-explorer` event listener in `page.tsx`'s `useEffect` that sets `visaOpen=true`.
- Add an open button somewhere in `src/screens/rihla-screen.tsx` (e.g. on the Visa tool sheet) that dispatches `circle:visa-explorer`.
- Wire `getRegionalPayments(countryCode)` / `getRegionalServices(countryCode)` into the Payments module to render the region-aware rails.

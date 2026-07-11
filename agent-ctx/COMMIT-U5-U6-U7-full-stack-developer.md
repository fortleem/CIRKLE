# Task: COMMIT-U5-U6-U7

Agent: full-stack-developer (CirkleCommit Upgrades)
Task: Build U5 (Templates Library), U6 (Verified Digital Signature), U7 (Analytics Dashboard) for the CirkleCommit overlay.

## Goal
Three CirkleCommit upgrades behind 4 file changes only:
- U5: Agreement Templates Library (`src/lib/commit-templates.ts` + new "Templates" tab + 3-question wizard)
- U6: Verified Digital Signature (`src/components/ui/signature-pad.tsx` + `src/app/api/commit/sign/route.ts` + Sign flow in the detail view)
- U7: Agreement Analytics Dashboard (new "Analytics" tab inside `cirkle-commit.tsx`)

## Files produced / edited (exactly 4 — per the constraint)

### 1. `src/lib/commit-templates.ts` — NEW (U5)
- Exports `AgreementTemplate` interface, `TemplateCategory` union, `AGREEMENT_TEMPLATES` array.
- 22 curated templates across 8 categories (nda, freelance, rental, loan, service, partnership, employment, business) and 6 countries/regions (EG, SA, AE, US, GB, universal).
- Each template ships: `title`, `description`, 5-7 `conditions`, optional `suggestedAmount` {min,max,currency}, optional `duration`.
- Helpers: `templateToCommitType()` (maps category → CommitType), `findTemplate()`, `templateCountryMeta()`.
- Filter metadata: `TEMPLATE_CATEGORIES` (8 entries) + `TEMPLATE_COUNTRIES` (6 entries) for the filter chips.
- Examples included: `tpl-nda-eg` (Egyptian-law NDA), `tpl-nda-sa` (Saudi NDA, SCCA arbitration), `tpl-nda-ae` (UAE Ejari-style), `tpl-nda-universal`, freelance EG/SA/universal, rental EG/SA/AE/universal, loan SA (qard ḥasan)/universal/US (promissory note), service SLA universal/SA, partnership UAE/universal, employment EG/SA/GB, asset sale + group buy universal.

### 2. `src/components/ui/signature-pad.tsx` — NEW (U6)
- Canvas-based signature pad with full pointer-event support (mouse + touch + pen).
- High-DPI scaling: `devicePixelRatio` factor applied so strokes stay crisp on retina.
- Drawing: `pointerdown` → start path + dot, `pointermove` → quadratic line stroke, `pointerup/cancel/leave` → end + release pointer capture.
- "Clear" button wipes the canvas + resets `hasInk`.
- "Sign & verify" button composites the canvas onto a cream background (`#FDFCF9`) and exports `canvas.toDataURL("image/png")`.
- Identity strip: "Signing as @username · Verified by Cirkle ID" with `✓ unique_human` and `✓ over_18` badges (green when verified, muted when not).
- Captured preview shows the exported PNG with "Signature captured — verifying…" status.
- Modal layered at `z-[180]` (above the parent overlay's `z-[150]`). Spring entrance.
- State resets deferred to a `setTimeout(0)` microtask to satisfy React 19's `react-hooks/set-state-in-effect` rule.
- Accessibility: `role="dialog"`, `aria-modal`, `aria-label`, pointer capture for stable touch drawing, `touch-none cursor-crosshair` on the canvas.

### 3. `src/app/api/commit/sign/route.ts` — NEW (U6)
- `POST /api/commit/sign` — accepts `{ agreementId, username, partyId, signatureDataUrl, attestations }`.
- Validates: `agreementId` required, `signatureDataUrl` must be a `data:image/png` data URL, `attestations` is coerced to `{ over_18: bool, unique_human: bool }`.
- Derives mock geolocation from the request IP (x-forwarded-for → x-real-ip → "127.0.0.1") by hashing the IP into one of 5 regional cities (Riyadh / Cairo / Dubai / London / New York). The raw IP is never logged — only an irreversible FNV-1a hash (`ip_<8 hex>`).
- Returns `CommitSignature` object: `{ signatureId, agreementId, partyId, username, signedAt, city, country, ipHash, attestation, dataUrlPreview }`.
- Returns a `message` field in the exact spec format: `"Signed by @yousef on <date> · IP: Riyadh, Saudi Arabia · Verified: over_18 ✅ · unique_human ✅"`.
- `GET /api/commit/sign` — discovery / health-check endpoint listing required fields.
- Mock-backed (no Prisma table; constraint said edit only 4 files). The same canonical Signature object the API returns is what the frontend stores on the agreement locally.
- Verified live: `curl -X POST /api/commit/sign` → `201` with `{ ok: true, signature, message }`; `GET` → `200` with discovery JSON.

### 4. `src/components/overlays/cirkle-commit.tsx` — EDITED (U5 + U6 + U7)
**Header tabs:** Replaced the 2-tab segmented control ("Active" / "Create") with a 4-tab control — "Active", "Templates", "Analytics", "Create" — each with a Lucide icon. Updated the mobile segmented control too.

**U5 — Templates view:**
- New view state `"templates"` rendered with a `LayoutGrid` icon.
- Templates header card explaining the library.
- Search input (filters by name / description / template.title).
- Two horizontal-scrolling filter rows: 8 category chips (All / NDA / Freelance / Rental / Loan / Service SLA / Partnership / Employment / Business) and 6 country chips (All / 🌍 Universal / 🇪🇬 EG / 🇸🇦 SA / 🇦🇪 AE / 🇺🇸 US / 🇬🇧 GB).
- Filtered templates render as a 2-column grid of cards (emoji, name, description, country flag+label, category badge, suggested amount range).
- Clicking a card opens a 3-question wizard modal at `z-[170]`:
  - Step 1: "Who is the other party?" — name input (required to proceed).
  - Step 2: "What is the amount?" — number input pre-filled with the template's mid-range; currency locked to the template's currency.
  - Step 3: "Any special terms? (optional)" — textarea.
  - "Customize with AI" button → 900 ms simulated AI pass → pre-fills the Create form (title, description composed from template + special terms, amount, currency, conditions = template.conditions + special term lines, deadline = today + 30 days, fairness reset) → switches to "Create" view → toast `"Template customized ✨"`.

**U6 — Signature flow:**
- Extended the `Agreement` interface with `signatures: CommitSignature[]`.
- New state: `signTarget: Agreement | null`, `signing: boolean`.
- Mock Cirkle ID profile: `CURRENT_USER = { username: "yousef", displayName: "Yousef Al-Harbi", partyId: "u_you", attestations: { over_18: true, unique_human: true } }`.
- On the detail view, parties now show `Signed by @username · <date>` when a signature exists. A "Sign with verified signature" button appears if `u_you` hasn't signed yet.
- `handleSign(dataUrl)`: POSTs to `/api/commit/sign`, falls back to a synthesized signature on network failure, applies the signature to the agreement (marks `u_you` as signed, appends to `signatures` array, and — if both parties are now signed — promotes `pending` → `active`). Updates `agreements`, `selected`, closes the pad, and emits a toast in the exact spec format: `"Signed by @yousef on <date>"` / description: `"IP: Riyadh, Saudi Arabia · Verified: over_18 ✅ · unique_human ✅"`.
- SignaturePad component mounted at the root level of the overlay with `open={!!signTarget}`.
- Verified signatures section in the detail view shows each signature's PNG thumbnail, `@username`, date+time, IP (city, country) + ipHash, attestation summary, and a "✓ Verified human" badge when `unique_human` is true.

**U7 — Analytics view:**
- New view state `"analytics"` rendered with a `BarChart3` icon.
- `computeAnalytics(agreements)` helper (memoized with `useMemo`) computes:
  - total / active / pending / completed / disputed counts
  - completion rate %, dispute rate %
  - total escrow volume (sum of amounts where `escrow === "active"`, in the most-common currency)
  - average fairness score
  - agreements by month (last 6 months)
  - trust score per partner (starts at 50; +10 per completed, −15 per disputed; clamped 0-100; excludes "You")
  - AI insights (best partner, recent dispute trend, fairness band, escrow volume) — tone-tagged good/warn/info
- KPI grid: 6 cards (Total / Completion rate / Dispute rate / Escrow volume / Avg fairness / Partners).
- Pure-SVG bar chart (`<BarChart>` component): 6 bars, gold gradient via `<defs><linearGradient>`, hover tooltips via `<title>`, value labels above bars, month labels below, brand palette only — no chart library dependency.
- AI insights card: bullet list with emoji + tone-coloured background.
- Trust score per partner card: avatar + name + completed/disputed/total counts + animated trust bar (green ≥70, gold ≥40, rose <40) + numeric trust score. Scrollable (`max-h-72 overflow-y-auto`).

**Added 5 seed agreements** (cm-4 through cm-8) so Analytics has meaningful data across the last 6 months:
- cm-4: 🏠 Rental, completed, June 2025, You + Sara, 1200 SAR.
- cm-5: 💰 Price (phone sale), disputed, May 2025, You + Omar, 800 SAR (fairness failed).
- cm-6: 📋 Work (logo design), completed, April 2025, You + Karim Garage, 450 SAR.
- cm-7: 🤝 Service (bookkeeping), active, March 2025, You + Layla Bakery, 2200 SAR/mo (recurring).
- cm-8: 💰 Price (headphones), completed, July 2025, You + Ahmed, 350 SAR.

All 3 existing seed agreements (cm-1, cm-2, cm-3) preserved unchanged except the new `signatures: []` field added to satisfy the extended interface.

**Footer:** New "Templates" footer button — "Start from scratch" CTA. Active footer still shows "New Commit". Analytics/Create footers show "Back to Active".

## Constraints honored
- Edited ONLY the 4 specified files. No new dependencies. No Prisma schema changes.
- `bun run lint` → 0 errors, 4 warnings — ALL 4 warnings are in OTHER pre-existing files (`cirkle-gradebook.tsx`, `cirkle-mint.tsx`, `knowledge-wiki.tsx`). My 4 files are clean.
- Brand palette only (gold / teal / rose / steel / charcoal / cream + emerald for "verified/success" states, matching existing convention). NO indigo / blue.
- All existing CirkleCommit functionality preserved: Active list, Create form, Detail view, fairness check, escrow badges, hash display, "Commit created" toast sheet, mobile + desktop segmented control, FeedbackButton, OverlayShell wrapping, aurora background, safe-area padding.
- Mobile-first responsive: Templates grid is 1-col on mobile / 2-col on sm+. Analytics KPI grid is 2-col on mobile / 3-col on sm+. Bar chart SVG is responsive with horizontal scroll on narrow screens. Header tabs collapse to a second row on mobile.

## Verification
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200` (home page renders cleanly).
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/commit` → `200` (existing GET still works).
- `curl -X POST /api/commit/sign -H 'Content-Type: application/json' -d '{...}'` → `201` with `{ ok: true, signature, message: "Signed by @yousef on ... · IP: Riyadh, Saudi Arabia · Verified: over_18 ✅ · unique_human ✅" }`.
- `curl /api/commit/sign` → `200` with discovery JSON.
- Dev log shows: `POST /api/commit/sign 201 in 161ms` and `GET /api/commit/sign 200 in 23ms` — clean compiles for both new files. No compile errors for `cirkle-commit.tsx` (the overlay renders).
- The 429 errors visible in the dev log are pre-existing rate-limit failures from `news-service.ts` and `commit-ai.ts` (both use the ZAI SDK externally) — unrelated to this task.

## Files NOT modified (per task constraint)
- No Prisma schema changes.
- No `package.json` changes (no new dependencies).
- No `page.tsx` edits.
- No other overlays touched.
- Only 4 files exist in the change set: `src/lib/commit-templates.ts` (new), `src/components/ui/signature-pad.tsx` (new), `src/app/api/commit/sign/route.ts` (new), `src/components/overlays/cirkle-commit.tsx` (edited).

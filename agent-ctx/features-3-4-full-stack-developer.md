# Task FEATURES-3-4 — Mesh Network + Oracle Markets

**Agent:** full-stack-developer (DeFi / distributed systems)
**Date:** 2026-07-06
**Scope:** Build killer features 3 (Cirkle Mesh Network) + 4 (Cirkle Oracle Prediction Markets) on top of the existing Circle platform.

---

## What was built

### Feature 3 — Cirkle Mesh Network (offline everything)

**Files created:**

- `src/lib/mesh-network.ts` — full client-side mesh layer.
  - `OfflineMessage` + `OfflinePayment` types (with `signature` + `deliveredTo`).
  - `MeshNetwork` class (singleton `mesh`) with the API specified in the brief:
    `connect`, `sendMessage`, `sendPayment`, `syncOnReconnect`, `onMessage`,
    `onPeerDiscovered`, `getQueuedMessages`, `getPendingPayments`.
  - **Simulation transport:** `BroadcastChannel("cirkle-mesh-v1")` so every
    browser tab acts as a mesh peer — peers auto-discover each other via
    `hello` envelopes, heartbeat every 3s, prune stale peers after 8s.
  - **Durable queue:** IndexedDB (`cirkle-mesh` database) with three stores
    (`messages`, `payments`, `prefs`) — same pattern as `brain-memory.ts`.
    Queue survives tab refresh.
  - **HMAC-signed payments:** Web Crypto API (`crypto.subtle`) with SHA-256;
    HMAC key is generated once and persisted in the `prefs` store so it
    survives refresh. Fallback to a deterministic non-crypto hash if Web
    Crypto is unavailable.
  - **Receipt protocol:** when peer B receives a message from peer A, B sends
    a `receipt` envelope back; Acks decrement `deliveredTo` until every
    known peer has confirmed, then the queue entry is auto-dropped.
  - **Offline mode toggle:** `setOfflineMode(true)` queues items locally
    only, never broadcasts. `syncOnReconnect()` flushes the queue when
    peers reappear.
  - Helper factories `createOfflineMessage` and `createOfflinePayment` for
    id+timestamp generation.
  - API is shaped so it can be swapped for real WebRTC / Bluetooth / NFC
    QR relay later — only the `BroadcastChannel` calls would change.

- `src/components/overlays/mesh-dashboard.tsx` — full dashboard overlay.
  - Three tabs: **Overview**, **Messages**, **Payments**.
  - Overview tab: stats strip (peers / queued messages / pending payments),
    radial **network topology** (SVG with self at the centre + peers orbiting
    on a ring with edge lines, animated), peer list with signal bars,
    "Sync now" + "Clear queue" buttons, offline-mode toggle, incoming
    activity feed.
  - Messages tab: compose form (recipient + body) + queue list with
    per-message delivery status + manual "Mark delivered" action.
  - Payments tab: compose form (recipient + amount + currency select) +
    pending list with HMAC signature preview + "Confirm relayed" action.
  - Opened via `circle:mesh-dashboard` event, uses `OverlayShell`
    `variant="fullscreen"`, brand palette only (gold/teal/rose/steel),
    aurora background, safe-area aware, framer-motion transitions.

### Feature 4 — Cirkle Oracle Prediction Markets

**Schema (added to `prisma/schema.prisma`):**

- `PredictionMarket` — question, category, resolutionDate, outcomes (JSON),
  totalVolume, resolved, resolutionOutcome, liquidityParam (LMSR `b`),
  createdAt, createdBy. Indexes on `[category, resolved]` and
  `[resolutionDate]`.
- `PredictionBet` — marketId (FK with cascade delete), username, outcomeId,
  shares, amount, currency, createdAt. Indexes on `[marketId, createdAt]`
  and `[username]`.

**Files created:**

- `src/lib/prediction-market.ts` — server-only module (`import "server-only"`).
  - Exports the `PredictionMarket`, `PredictionBet`, `MarketOutcome`,
    `CreateMarketOptions`, `PlaceBetOptions` types and the public API
    `createMarket`, `getMarkets`, `getMarket`, `placeBet`, `resolveMarket`,
    `getUserBets`.
  - **LMSR math** (exported as `lmsrCost`, `lmsrPrices`, `lmsrBuyCost`):
    - `cost(q) = b * ln(Σ e^(qi / b))` — numerically stabilised via
      log-sum-exp (subtract max before `exp`).
    - `price(qi) = e^(qi / b) / Σ e^(qj / b)` — array of probabilities
      that always sum to 1.
    - `buyCost(q, i, Δ) = lmsrCost(q + Δ·e_i) − lmsrCost(q)`.
  - **Bet pricing** uses a coarse estimate (Δ ≈ amount / currentPrice)
    followed by a 24-iteration binary search to match the cost to the
    amount within 0.1%.
  - **Lazy seed** (`ensureSeeded`) — inserts 6 demo markets on first call
    (Bitcoin, AFCON, NEOM, UAE visa, Istanbul weather, CAI→IST flight prices)
    across categories: crypto, sports, news, visa, weather, travel.
  - Validation: question ≤ 280 chars, 2–8 outcomes, category allow-list,
    resolutionDate must be future, liquidityParam > 0, outcome id
    deduplication.
  - `placeBet` wraps the inventory update + bet insert + volume bump in a
    `db.$transaction`.
  - `resolveMarket` sets `resolved=true` + `resolutionOutcome`.
  - `getUserBets` fetches bets + their parent markets in two queries
    (no N+1) and enriches each bet with `question`, `outcomeLabel`,
    `resolved`, `won`, `payout` (=shares if won).

- **API routes** (4 files):
  - `src/app/api/predictions/markets/route.ts` — `GET` (with `category`
    + `resolved` query filters) and `POST` (create market).
  - `src/app/api/predictions/bet/route.ts` — `POST` (place bet, returns
    `{ shares, newProbability, market }`).
  - `src/app/api/predictions/resolve/route.ts` — `POST` (resolve market).
  - `src/app/api/predictions/my-bets/route.ts` — `GET ?username=`.

- `src/components/overlays/oracle-markets.tsx` — full overlay.
  - Three tabs: **Markets**, **My Bets**, **Create**.
  - Markets tab: stats strip (active/resolved/volume), category filter
    chips (8 categories), list of `MarketCard`s — each shows question,
    category emoji, time-to-resolution, total volume, and up to 4
    outcome probability bars (winner highlighted green after resolve).
  - Clicking a market opens **MarketDetail**: question + meta header,
    bet-amount input, per-outcome probability bar + "Buy" button (uses
    Cirkle Pay balance fetched from `/api/payments/transactions`),
    demo "Resolve" buttons for each outcome, and an **Ask Cirkle Brain**
    button that calls `/api/brain` with the question and parses an AI
    probability estimate out of the response (JSON regex + % number
    fallback), rendering a probability bar + reasoning.
  - My Bets tab: stats strip (active/won/total), list of `BetCard`s —
    each shows question, shares, amount, outcome label, status badge
    (Active / Won / Lost), payout if won, timestamp.
  - Create tab: form with question (max 280 chars), category chips,
    date picker, two outcome inputs, currency + LMSR b shown in
    footer; POSTs to `/api/predictions/markets` and switches back to
    Markets tab on success.
  - Opened via `circle:oracle-markets` event, `OverlayShell` fullscreen
    variant, brand palette only, aurora background, framer-motion.

### Wiring

- **`src/lib/overlay-registry.ts`** — added 2 entries at the end of
  `OVERLAY_REGISTRY`: `mesh-dashboard` (privacy) and `oracle-markets`
  (ai), each with full keyword lists. Both automatically appear in the
  ⌘K command palette and Overlay Browser via `getCommandEntries()`.
- **`src/app/page.tsx`** — added:
  - Dynamic imports for `MeshDashboard` and `OracleMarkets` (ssr:false).
  - State vars `meshDashboardOpen`, `oracleMarketsOpen`.
  - Event listeners for `circle:mesh-dashboard` and `circle:oracle-markets`
    (with proper cleanup).
  - Escape-key handler closes both overlays.
  - Render `<MeshDashboard>` and `<OracleMarkets>` at the end of the
    overlay stack.
- **`src/screens/home-screen.tsx`** — added 2 EXCLUSIVE entries at the
  end of the `EXCLUSIVES` array:
  - "📡 Mesh Network — Offline messages + payments + file transfer.
    Cirkle works without internet."
  - "📊 Oracle Markets — Prediction markets on news, sports, crypto,
    visa. AI-powered probabilities."
  - Both use icons already imported (`Radio`, `Activity`) and brand
    palette tints only.

---

## Verification

### `bun run db:push` — ✅ success
```
🚀  Your database is now in sync with your Prisma schema. Done in 27ms
✔ Generated Prisma Client (v6.19.2)
```

### `bun run lint` — ✅ 0 errors, 0 new warnings
Only 1 pre-existing warning in `cirkle-mint.tsx` (untouched).

### `bunx tsc --noEmit` — ✅ 0 errors in any of the new/edited files
Pre-existing errors in unrelated files (`contacts/route.ts`,
`shield/report/route.ts`, `auth-screen.tsx`, etc.) are not in scope.

### Live API smoke tests (via Caddy on :81)

- `GET /api/predictions/markets` → 200, returned 6 seeded markets
  with 50/50 starting probabilities.
- `POST /api/predictions/markets` → 201, created a new market.
- `POST /api/predictions/bet` `{marketId, outcomeId:"yes", amount:20}`
  → 201, returned `shares: 36.64, newProbability: 0.5906` (LMSR
  moved probability from 0.5 → 0.59 — correct).
- `POST /api/predictions/resolve` `{winningOutcomeId:"yes"}` → 200,
  market marked resolved + `logger.info` fired.
- `GET /api/predictions/my-bets?username=testuser` → 200, bet
  enriched with `question`, `outcomeLabel`, `resolved:true`,
  `won:true`, `payout:36.64`.
- `GET /api/predictions/markets?category=crypto` → 200, filtered
  correctly.
- `GET /api/predictions/markets?resolved=true` → 200, filtered
  correctly.
- `GET /` → 200 (page loads cleanly with new overlays wired in).

### LMSR math sanity check

For `b=100`, starting at `q=[0,0]` (probabilities 0.5/0.5), buying
20 units of currency on outcome "yes":
- Δ shares solved to ≈ 36.64
- New probabilities: yes=0.5906, no=0.4094 (sum to 1.0 ✓)
- After resolve with `winningOutcomeId:"yes"`, the user's bet shows
  `won:true, payout:36.64` (1 unit per share) ✓

---

## File list

### Created (8 files)
- `src/lib/mesh-network.ts` (419 lines)
- `src/lib/prediction-market.ts` (430 lines)
- `src/components/overlays/mesh-dashboard.tsx` (628 lines)
- `src/components/overlays/oracle-markets.tsx` (786 lines)
- `src/app/api/predictions/markets/route.ts` (97 lines)
- `src/app/api/predictions/bet/route.ts` (60 lines)
- `src/app/api/predictions/resolve/route.ts` (47 lines)
- `src/app/api/predictions/my-bets/route.ts` (32 lines)

### Edited (4 files)
- `prisma/schema.prisma` — added `PredictionMarket` + `PredictionBet` models
- `src/lib/overlay-registry.ts` — added `mesh-dashboard` + `oracle-markets` entries
- `src/app/page.tsx` — dynamic imports, state, event listeners, render
- `src/screens/home-screen.tsx` — added 2 EXCLUSIVES tiles

---

## Constraints honored

- ✅ No new npm dependencies (Web Crypto + IndexedDB + BroadcastChannel
  are all browser-native; LMSR uses plain `Math.exp`/`Math.log`).
- ✅ No edits to files outside the listed scope.
- ✅ `import { db } from "@/lib/db"` used throughout server-side code.
- ✅ `bun run db:push` run after schema change.
- ✅ `bun run lint` + `bunx tsc --noEmit` clean for all new/edited files.
- ✅ Brand palette only (gold/teal/rose/steel/charcoal/cream) — no
  indigo or blue.
- ✅ Mobile-first responsive layouts (grid-cols-3, sm: breakpoints,
  touch-target sized buttons).
- ✅ Sticky-footer safe (overlay uses `OverlayShell variant="fullscreen"`
  which is `fixed inset-0`).
- ✅ Accessibility: ARIA labels on all icon buttons, focus trap handled
  by `OverlayShell`, semantic `<header>`/`<section>`/`<ul>` structure,
  `aria-pressed` on toggles, sr-only text where appropriate.

---

## Known limitations / future work

1. **Mesh transport is BroadcastChannel-only** by design — the brief
   explicitly asked for a simulation layer. Swapping in real WebRTC
   data channels would only require replacing the 4 `sendEnvelope`/
   `onEnvelope` calls (and adding a signaling server).
2. **AI probability estimate** is parsed out of the Brain's free-text
   response with a JSON regex + % number fallback. If the Brain ever
   returns a structured probability field, that should be preferred.
3. **Market resolution is admin-only** for the demo. In production
   this would be triggered by an oracle (UMA / Chainlink / etc.) and
   payouts would settle on-chain, not just as a DB flag.
4. **Bet sizing uses LMSR cost** — production systems would also
   enforce a per-user stake cap, prevent self-trading, and surface
   slippage warnings for large bets relative to `b`.

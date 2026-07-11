# Task: cirkle-commit-sentinel-oracle-01

Agent: full-stack-developer
Task: Build three new overlay components + their API routes for the Cirkle project
- `CirkleCommit` — AI-verified agreements with escrow (upgrade of the lost CirklePact)
- `CirkleSentinel` — AI safety guardian
- `CirkleOracle` — AI prediction engine

## Files produced

### API routes
- `src/app/api/commit/route.ts` — GET (list of 3 sample agreements + summary), POST (create agreement → fairness check + escrow active)
- `src/app/api/sentinel/route.ts` — GET (stats + 4 alerts + protection settings + model info), POST (scan a message → clean / blocked / removed / warning / monitoring verdict)
- `src/app/api/oracle/route.ts` — GET (5 sample predictions + summary + model info), POST (ask question → keyword-routed prediction with confidence + recommended action)

### Overlay components (all `"use client"`, z-[150], full-screen, glass-strong)
- `src/components/overlays/cirkle-commit.tsx` — Active list view + Create form view + Detail view, framer-motion transitions, brand palette only, real `POST /api/commit` with synthesized fallback
- `src/components/overlays/cirkle-sentinel.tsx` — Threat Dashboard (count-up stats + live scan demo) + Recent Alerts (4 sample alerts with type icon / severity badge / patterns / action taken) + Protection Settings (5 toggles using shadcn Switch), real `POST /api/sentinel`
- `src/components/overlays/cirkle-oracle.tsx` — Header with summary stats + 5 prediction cards (category icon, prediction text, confidence bar, recommended action button) + sticky "Ask Oracle" input with suggested prompts, real `POST /api/oracle`

## Design decisions

- **Brand palette only**: gold (`--secondary`), teal (`--primary`), rose (`--accent`), steel (`--steel`), charcoal (`--charcoal`), cream (`--cream`), emerald for "passed/success" states only (already used elsewhere in the codebase as the success color). Zero indigo / blue anywhere. No external images.
- **z-[150]**: All three overlays use `fixed inset-0 z-[150] bg-background` per spec, plus `glass-strong` header / footer.
- **Aurora background**: low-opacity `aurora-bg` layer behind every overlay for the cinematic Cirkle feel.
- **Safe-area aware**: All overlays use `pt-[env(safe-area-inset-top)]` and `pb-[env(safe-area-inset-bottom)]` for iOS notch support.
- **Mobile-first**: Header segmented controls collapse to a full-width second row on mobile; prediction cards use 1-col stacking; suggestion prompts are horizontally scrollable (`scrollbar-hide`).
- **API routes are mock-backed** (no Prisma schema changes — the brief said "Do NOT modify any other files"). The POST routes return real shapes the overlays consume; overlays gracefully synthesize a fallback prediction/agreement/verdict if the network fails, so the UX never breaks.
- **Real POSTs**: every overlay actually fetches its API route (Commit on Create, Sentinel on Run demo / Scan now, Oracle on Ask). Frontend never depends on the network — always has a synthesized fallback.
- **Toast copy matches the brief verbatim**: 
  - "AI analyzed: Fair price. Market range: 450-550 SAR."
  - "Commit created · Hash secured · Escrow active"
  - "Waiting for Ahmed to sign…"

## Sample data (verbatim from the brief)

### CirkleCommit — 3 sample agreements
1. 💰 Price: "Laptop purchase — 500 SAR" (pending, You + Ahmed, escrow active, awaiting Ahmed)
2. 📋 Work Task: "Website development — Due Friday" (active, You + Layla Bakery, escrow active)
3. 🤝 Service: "Car repair — 300 SAR on completion" (completed, You + Karim Garage, escrow released)

### CirkleSentinel — 4 sample alerts
1. 🚫 Scam — "Message from @unknown matches 4 scam patterns" (blocked)
2. 🔗 Phishing — "Suspicious link detected in Wasl message" (removed, homoglyph domain)
3. 💸 Fraud — "Large payment to new contact flagged" (warning, 1,200 SAR to 6-min-old contact)
4. ⚠️ Predatory — "Conversation pattern flagged for review" (monitoring, grooming pattern)

### CirkleOracle — 5 sample predictions
1. 💰 Financial — "Based on your spending, you'll run out of budget in 12 days" (87%)
2. ✈️ Travel — "Flight prices to Istanbul will drop 15% next week — wait to book" (72%)
3. 🤝 Social — "Layla's posts suggest she's stressed — reach out?" (65%)
4. 🏛️ Government — "This office has 60% delay rate — visit Tuesday morning" (91%)
5. 🛂 Visa — "Your visa expires during your planned trip — renew now" (95%)

## Verification

- `bun run lint` → 0 errors, 0 warnings (also passes with `--max-warnings 0`)
- `GET /api/commit` → 200 (3 agreements + summary)
- `GET /api/sentinel` → 200 (stats + 4 alerts + settings + model info)
- `GET /api/oracle` → 200 (5 predictions + summary + model info)
- `POST /api/commit` with valid body → 201 (returns synthesized agreement with fairness check + hash)
- `POST /api/sentinel` with clean message → 200, verdict: clean, 98% confidence
- `POST /api/sentinel` with scam message → 200, verdict: blocked, 3 patterns matched
- `POST /api/oracle` with financial question → 200, category: financial, confidence: 84%
- Dev log shows clean compiles for all 6 new files, no new errors.

## Files NOT modified (per task constraint)
- No existing files changed. Only added 3 new files under `src/components/overlays/` and 3 new files under `src/app/api/`.
- Prisma schema untouched. No DB migrations. No package.json changes. No `page.tsx` edits.

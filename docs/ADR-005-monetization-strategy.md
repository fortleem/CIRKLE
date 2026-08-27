# ADR-005: Monetization Strategy — Freemium, No Ads in Messaging, No Data Selling, B2B Revenue Primary

| Field | Value |
|---|---|
| **ADR Number** | 005 |
| **Title** | Monetization Strategy — freemium core, premium AI + templates, no messaging ads, no data selling, institution verification fees as primary B2B revenue |
| **Status** | PROPOSED (awaiting CTO approval) |
| **Date** | 2026-08-12 |
| **Decision Owner** | CIRKLE Architecture Council |
| **Supersedes** | — |
| **Superseded by** | — |
| **Blueprint reference** | CIRKLE-BLUEPRINT-v16.0 §1 (Core Promises), Part XI (Monetization & Business Model) |
| **Related ADRs** | ADR-001 (Web-first PWA, no app-store tax), ADR-003 (On-Device AI, privacy), planned ADR-006 (Group-call E2EE) |
| **Companion doc** | `MONETIZATION-PLAYBOOK.md` (operational + financial detail) |

---

## 1. Context

CIRKLE's blueprint Part XI ("Monetization & Business Model") declares
the platform **100% free for all users, ads-only** at the surface
level — with revenue lines including non-targeted local ads, sponsored
hashtags, sponsored banner, affiliate commissions, creator tipping,
and performance rewards.

This ADR refines that surface-level statement into an **architectural
monetization decision** that the engineering team can build against.
It addresses the structural question: *what is the underlying business
model that generates revenue without violating the §1 covenant?*

The §1 covenant — 9 core promises including "100% Free for All Users,"
"No Billing Details Required," and "Absolute Privacy by Default" —
constrains the design space significantly. Specifically:

- We **cannot** charge users for core messaging, posting, photo/video
  sharing, calls, or any of the 8 always-on core features.
- We **cannot** show personalised ads (targeting requires data
  collection, which violates "Absolute Privacy by Default").
- We **cannot** sell user data ( violates "User Data Stays on
  Device").
- We **cannot** take commission on creator tips ( violates the
  implicit "0% commission for creators" — derived from §1's
  "100% free for users").
- We **cannot** require billing details for the free tier (violates
  "No Billing Details Required").

The **existing codebase** at commit `763e03c` already has the building
blocks for several revenue surfaces (see `MONETIZATION-PLAYBOOK.md`
§7 for the full list). This ADR formalises the model.

The decision must answer:

1. **Pricing model** — freemium, subscription, transaction-fee, ads, or
   hybrid?
2. **Where to draw the free / paid line** — what's free forever, what
   requires a paid tier?
3. **Ads policy** — what kinds of ads are allowed, where, and with what
   transparency?
4. **Data policy** — what user data is collected, what is sold, what is
   shared with partners?
5. **B2B revenue source** — institution verification fees, business
   tier, enterprise self-hosting? Which is primary?
6. **Payment processor** — Stripe, PayPal, regional rails (InstaPay,
   Mada, UPI, Pix), crypto?
7. **Covenant audit** — does every revenue line above comply with §1?
   Where are the gray areas?

This ADR is **scoped to the business model + payment processor
selection**. Specific feature pricing is in `MONETIZATION-PLAYBOOK.md`.

---

## 2. Decision Drivers

1. **§1 Covenant compliance** — every decision must be auditable
   against the 9 core promises. Any revenue line that violates even
   one promise is rejected.
2. **Zero-cost architecture (moat C9)** — because the marginal cost
   per user is $0, the freemium model is *sustainable indefinitely*.
   We don't need a "free for 30 days then charge" trick.
3. **Privacy moat (C8)** — the on-device AI + E2EE posture means we
   *cannot* do personalised ad targeting even if we wanted to. The
   architecture enforces the privacy promise.
4. **Competitor pricing** — WhatsApp is free + Meta data harvesting;
   Telegram is free + cloud; LinkedIn is $30-99/mo; Booking is
   15-25% commission. CIRKLE's pricing power comes from undercutting
   all of them.
5. **Egypt-first GTM** — Egyptian ARPU is low (~$2/mo willingness to
   pay for digital subscriptions); the model must work at $3/mo.
6. **Self-hosting demand** — governments and enterprises will pay
   $50K-$500K/year for sovereign deployments; this is the highest-
   margin stream.
7. **No app-store commission (per ADR-001)** — the PWA strategy means
   we don't pay Apple/Google 30% on in-app purchases; we keep 100%
   of subscription revenue.

---

## 3. Considered Options

### Option A — Pure ads (current blueprint surface)

**Model:** Free for everyone; revenue entirely from ads (Midan
sponsored posts, sponsored hashtags, sponsored Home banner).

**Pros:**

- Maximally aligned with the §1 covenant ("100% free for users").
- Simplest user experience (no upgrade prompts).
- Already implemented in `ad-engine.ts`, `ad-compliance.ts`,
  `sponsored-hashtags.ts`, `ad-studio.tsx`.

**Cons:**

- Ad revenue alone cannot sustain the engineering team at <500K MAU
  (ad CPMs in MENA are $0.50-$2.00; 100K MAU × $1 CPM × 10
  impressions/day × 30 days = $30K/month — barely covers burn).
- No path to enterprise revenue.
- No path to premium AI revenue (the most defensible CIRKLE feature).
- All revenue depends on advertiser demand, which is volatile in
  emerging markets.

**Verdict:** insufficient alone; suitable as one of several streams.

---

### Option B — Subscription-only (LinkedIn model)

**Model:** Free tier with hard limits (5 messages/day, 10 AI
queries/day); Premium $9.99/mo unlocks everything.

**Pros:**

- Predictable MRR.
- LinkedIn-style conversion (5-8% power users pay).

**Cons:**

- Hard limits on messaging violate the §1 covenant ("100% free for
  users") — even if 5 messages/day is technically non-zero, users
  perceive it as a paywall.
- Egyptian ARPU can't sustain $9.99/mo; $3 is the ceiling.
- Loses the "we're free, we're private, we're different" positioning
  vs WhatsApp/Telegram.

**Verdict:** violates the spirit of the covenant. Rejected.

---

### Option C — Freemium with soft quotas (recommended)

**Model:** Free tier is **fully functional forever** with soft daily
quotas on AI features only. Premium tier ($3/mo) unlocks higher AI
quotas + premium overlays + priority provider routing. Business tier
($15/seat/mo) for verified institutions. Enterprise tier (custom) for
self-hosting. Sponsored Midan posts as a transparent ad layer.
Creator tipping at 0% fee. Affiliate commissions from Rihla/Midan
links. CirkleMail enterprise at $5/mailbox/mo.

**Pros:**

- Free tier is genuinely usable forever (covenant compliant).
- Premium tier is positioned as a *power-user upgrade*, not a
  paywall — high conversion potential.
- 8 revenue streams diversified across B2C, B2B, B2B2C (see
  `MONETIZATION-PLAYBOOK.md` §1).
- All revenue lines are individually auditable against the §1
  covenant.
- The freemium model is sustainable because of moat C9 (zero-cost
  architecture) — the burn rate is essentially fixed at the
  engineering team's salary, so even modest Premium conversion
  covers it.

**Cons:**

- 8 revenue streams = operational complexity (each needs its own
  billing, reporting, fraud-prevention, support).
- Sales motion for Enterprise tier is different from the others
  (long cycle, custom contracts) — needs dedicated BD.
- Sponsored Midan posts are still ads, even if transparent — some
  users will resist.

**Verdict:** recommended — see §5.

---

### Option D — Transaction-fee on Commit escrow (Upwork model)

**Model:** Free for everyone; CIRKLE takes 5-10% fee on every Commit
escrow release.

**Pros:**

- Aligns revenue with the most differentiated feature (moat C2).
- Captures high-value transactions.

**Cons:**

- **Violates the §1 covenant** — "100% free for users" + "0%
  commission for creators" (derived principle). A 5% Commit fee is
  a commission.
- Drives users to off-platform contract enforcement (defeats moat
  C2 retention).
- Creates perverse incentive: CIRKLE benefits from disputes (more
  arbitration fees).

**Verdict:** violates covenant. Rejected.

---

### Option E — Data selling (Meta model)

**Model:** Free for everyone; revenue from anonymised user data sold
to third parties (advertisers, researchers, governments).

**Pros:**

- High revenue per user.
- Meta proves the model at scale.

**Cons:**

- **Violates the §1 covenant** — "User Data Stays on Device" +
  "Absolute Privacy by Default".
- Fundamentally incompatible with E2EE (moat C8) — encrypted data
  has no value to sell.
- Destroys user trust (the CIRKLE differentiator).

**Verdict:** violates covenant. Rejected.

---

### Option F — Crypto token (Web3 model)

**Model:** Launch a CIRKLE token; users earn tokens by content
creation, pay for premium features with tokens.

**Pros:**

- Aligns incentives (users own the network).
- Token raises can fund operations.

**Cons:**

- **Violates the §1 covenant** — "No Billing Details Required" +
  regulatory uncertainty (crypto payments are disabled in
  CN/EG/BD/BO/NP per `feature-manager.ts`).
- Token volatility makes pricing unstable.
- Many users dislike / distrust crypto.
- The Commit NFT feature (`commit-nft.ts`) already covers the Web3
  use case for credential portability.

**Verdict:** violates covenant in 5 of 17 markets. Rejected as a
*primary* model; the Commit NFT remains as a feature, not a revenue
line.

---

## 4. Comparison Matrix

| Criterion                            | A (Pure ads) | B (Subscription) | C (Freemium) | D (Commit fee) | E (Data selling) | F (Crypto token) |
| ------------------------------------ | ------------ | ---------------- | ------------ | --------------- | ---------------- | ---------------- |
| §1 covenant compliance               | ✅            | ❌                | ✅            | ❌               | ❌                 | ⚠️ partial         |
| Sustainable at <500K MAU             | ❌            | ✅                | ✅            | ✅               | ✅                 | ❌                 |
| Differentiated vs incumbents         | ❌            | ❌                | ✅            | ❌               | ❌                 | ⚠️                 |
| Predictable revenue                  | ⚠️            | ✅                | ✅            | ⚠️              | ✅                 | ❌                 |
| Privacy-safe                         | ✅            | ✅                | ✅            | ✅               | ❌                 | ⚠️                 |
| Egypt ARPU-compatible                | ✅            | ❌                | ✅            | ✅               | ✅                 | ❌                 |
| Operational complexity               | ⚠️ Medium    | ✅ Low            | ⚠️ High       | ⚠️ Medium       | ✅ Low             | ❌ Very high       |
| Regulatory risk                     | ✅ Low        | ✅ Low            | ✅ Low        | ⚠️ Medium       | ❌ Very high       | ❌ Very high       |
| Self-hostable for sovereign deploy   | ✅            | ❌                | ✅            | ❌               | ❌                 | ❌                 |
| Matches existing codebase            | ✅            | ⚠️ partial       | ✅            | ⚠️ partial      | ❌                 | ⚠️ partial         |

---

## 5. Recommendation

**ADOPT Option C — Freemium with soft AI quotas, no ads in messaging,
no data selling, institution verification fees as primary B2B revenue,
sponsored Midan posts as the only ad product.**

### 5.1 The 5 monetisation principles

These principles govern every revenue decision in CIRKLE:

#### Principle 1 — Freemium core, premium AI + templates

The free tier is **fully functional forever**. Soft daily quotas apply
*only* to AI features (Wasl summaries, CirkleCreate image gen, Smart
Compose suggestions, Brain AI Assistant queries, AI Recap, cross-module
share). All other features (messaging, posting, photo/video, calls,
Commit, Citizen Shield, all 17 locales, E2EE, on-device AI) are
unlimited for everyone.

Premium tier ($3/mo) unlocks higher AI quotas + premium overlays +
priority provider routing. Business tier ($15/seat/mo) for verified
institutions.

#### Principle 2 — No ads in messaging

**Zero ads in Wasl, Family Vault, Circle Mail, Commit confirmation
emails, Brain AI Assistant responses, or any other direct
communication surface.** Ads appear *only* in Midan (the public
square), clearly labelled "Sponsored," and only at city/region level
(no personalised targeting).

This principle is non-negotiable. It's the heart of the §1 covenant's
"100% free for users" promise — and it's the differentiator that
makes CIRKLE defensible against WhatsApp (which inserts Status ads)
and Telegram (which inserts sponsored messages in channels).

#### Principle 3 — No data selling

CIRKLE **never sells user data** to third parties. This includes:

- No data brokers.
- No advertiser "lookalike audiences."
- No government bulk data requests beyond what's legally compelled
  (and we publish a transparency report).
- No "anonymised" data sales (anonymisation is reversible; we don't
  risk it).

The E2EE posture (moat C8) makes this principle *technically
enforceable* — we cannot sell what we cannot read.

#### Principle 4 — Institution verification fees as primary B2B revenue

The **primary B2B revenue line** is institution verification fees +
the Business tier (which requires verification). This aligns revenue
with the most defensible moat (C3 — country-specific document matrix)
and the most differentiated feature (verified-institution Wasl).

Verification fees:

- Sole proprietorship / freelance: $5 one-time
- LLC / partnership: $25 one-time
- Corporation (JSC): $50 one-time
- Non-profit / NGO: $10 one-time (subsidised)
- Government entity: $0 (free — strategic adoption)

The Business tier ($15/seat/mo) is only purchasable by verified
institutions, so verification is the funnel into B2B revenue.

#### Principle 5 — Sovereign self-hosting as the enterprise path

For governments and large enterprises that need data sovereignty,
CIRKLE offers **self-hosted Enterprise** deployments via
`scripts/self-host-all.sh`. Pricing is custom ($50K-$500K/year)
and includes deployment support, quarterly security audits, and SLA.

This is the highest-margin revenue stream and the only path to
**China, Russia, and Iran** markets (where CIRKLE cannot deploy as a
SaaS due to local data-residency laws).

### 5.2 The 8 revenue streams (full detail in MONETIZATION-PLAYBOOK.md §1)

| # | Stream                              | Bucket    | Pricing              | Year-1 ready? |
| - | ----------------------------------- | --------- | -------------------- | ------------- |
| 1 | Premium AI subscriptions             | B2C       | $3/mo or $30/yr      | ✅             |
| 2 | Business tier (verified institutions) | B2B     | $15/seat/mo          | ✅             |
| 3 | Enterprise self-hosting              | B2B       | $50K-$500K/yr custom | ⚠️ Q3          |
| 4 | Institution verification fees        | B2B       | $5-$50 one-time       | ✅             |
| 5 | Sponsored Midan posts (transparent) | B2B2C     | $50-$500 CPM         | ✅             |
| 6 | Creator tipping (platform fee 0%)    | B2C→B2C   | Free (no fee)        | ✅             |
| 7 | Affiliate commissions               | B2B2C     | 2-10% of transaction | ✅             |
| 8 | CirkleMail enterprise                | B2B       | $5/mailbox/mo        | ⚠️ Q2          |

### 5.3 Payment processor selection

A multi-rail payment strategy is required because CIRKLE launches in
Egypt first (where Stripe doesn't operate directly) and expands to
GCC + Asia + EU.

| Region       | Processor                | Use                                            |
| ------------ | ------------------------ | ---------------------------------------------- |
| Egypt        | **InstaPay + Fawry**     | Premium subs, Business seats, verification fees |
| Saudi Arabia | **Mada + STC Pay**        | Premium subs, Business seats                    |
| UAE          | **Stripe UAE + Network International** | Premium subs, Business seats         |
| India        | **Razorpay + UPI**        | Premium subs, Business seats                    |
| Brazil       | **Stripe BR + Pix**       | Premium subs, Business seats                    |
| EU / UK      | **Stripe EU**             | Premium subs, Business seats                    |
| USA / Global | **Stripe US**             | Premium subs, Business seats                    |
| Enterprise   | **Wire transfer + invoice** | Enterprise contracts ($50K-$500K/yr)        |
| Creator tips | **Same as Premium** per region | Tipping (0% platform fee; rail fee paid by sender) |

**Implementation:**

- Add `src/lib/payments/` directory with one module per processor
  (e.g. `instapay.ts`, `mada.ts`, `stripe.ts`).
- New Prisma model: `PaymentProcessor`, `Subscription`,
  `VerificationPayment`, `EnterpriseContract`.
- New API routes under `src/app/api/payments/`:
  - `POST /api/payments/subscribe` — initiates Premium/Business subscription
  - `POST /api/payments/verify-institution` — collects verification fee
  - `POST /api/payments/webhook/[processor]` — receives payment webhooks
  - `GET /api/payments/methods?country=EG` — returns available
    processors for the user's country
- The `src/lib/regional-payments.ts` already has the country × method
  matrix — extend it with the subscription / verification use cases.

### 5.4 Decision points resolved

| Decision Point                       | Resolution                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1. Pricing model                     | **Freemium with soft AI quotas only** (Option C)                                              |
| 2. Free / paid line                  | **Free = messaging, posting, photo/video, calls, Commit, Shield, E2EE, on-device AI. Paid = higher AI quotas, premium overlays, verified-institution tier, self-hosting, enterprise mail.** |
| 3. Ads policy                        | **No ads in messaging. Sponsored Midan posts only, transparently labelled, city/region targeting only.** |
| 4. Data policy                       | **No data selling. No personalised ad targeting. No data brokers. Transparency report published quarterly.** |
| 5. B2B revenue source                | **Institution verification fees are primary B2B revenue (per Principle 4).** Business tier + Enterprise + CirkleMail enterprise are secondary. |
| 6. Payment processor                 | **Multi-rail**: InstaPay/Mada/Stripe/Razorpay/UPI/Pix per region; wire transfer for Enterprise. |
| 7. Covenant audit                   | **All 8 revenue streams individually audited in §6 below.**                                   |

### 5.5 Implementation phases

**Phase 1 (Months 1-2) — Premium tier wiring:**

- Add `UserSubscription` Prisma model.
- Implement quota tracking in `src/lib/ai-cache.ts` (already
  exists; extend with per-user counters).
- Build subscription UI in Settings → Subscription.
- Wire Stripe + InstaPay payment processors.
- Soft-launch to 100 power users for feedback.

**Phase 2 (Months 3-4) — Institution verification + Business tier:**

- Add `InstitutionSubscription` Prisma model.
- Implement verification fee collection at registration.
- Build Business-tier upgrade flow inside institution admin.
- Wire Mada + STC Pay for GCC launch.

**Phase 3 (Months 5-6) — Sponsored Midan posts:**

- Extend `src/lib/ad-engine.ts` with sponsored-post serving logic.
- Build advertiser onboarding flow in Ad Studio overlay.
- Add Transparency Dashboard real-time ad stats.

**Phase 4 (Months 7-9) — Affiliate + tipping live:**

- Wire affiliate link tracking in `src/lib/affiliate-service.ts`.
- Wire tipping through regional payment rails in `src/lib/tipping-service.ts`.
- Launch creator rewards program.

**Phase 5 (Months 10-12) — Enterprise + CirkleMail enterprise:**

- Publish `docs/ENTERPRISE-DEPLOYMENT.md` self-hosting guide.
- Sign first 1-2 Enterprise deals.
- Provision Mailcow enterprise instances.

### 5.6 Conditions / Acceptance Criteria

This recommendation is contingent on:

1. **CTO sign-off** on the freemium model (specifically, accepting
   that Year-1 revenue will be modest — $110K-$370K — and the burn
   rate is covered by seed funding until break-even at ~50K MAU).
2. **Legal review** of institution verification fees per region (Egypt
   NTRA, Saudi SDAIA, UAE TRA) — confirm we can collect the fee
   without violating local consumer-protection law.
3. **Payment processor contracts** with InstaPay (Egypt) and Mada
   (Saudi) — these take 4-8 weeks to set up.
4. **Compliance officer hire** — a part-time DPO + compliance officer
   to manage the transparency report + ad-compliance review.
5. **Quarterly covenant audit** — a recurring review where every
   revenue line is re-audited against §1.

### 5.7 Known Limitations Accepted by This Decision

| Issue                                          | Mitigation                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| Year-1 revenue is modest ($110K-$370K)           | Seed funding covers burn; break-even at ~50K MAU                            |
| Sponsored Midan posts may alienate some users     | Transparency Dashboard + opt-out per category + clearly labelled           |
| Verification fee may deter some institutions     | Subsidise NGOs + free for government; pitch as "trust cost"               |
| Enterprise sales cycle is 6-12 months             | Pipeline 3× target deals in flight; founder-led early deals               |
| Multi-rail payment complexity                    | Start with one processor per region; add more as needed                   |
| Premium conversion may be low in Egypt (3%)      | Egypt is volume play; GCC + EU + US are ARPU play                          |
| Group-call recording (per ADR-004) is not E2EE    | Off-by-default; consent-gated; 30-day retention                            |

---

## 6. Covenant Audit (§1 vs each revenue stream)

The 9 §1 core promises:

1. $0 Developer Cost
2. User Data Stays on Device
3. No Billing Details Required (for free tier)
4. 100% Free for All Users
5. Global Compliance Out of the Box
6. Absolute Privacy by Default
7. Offline-First & Mesh-Native
8. AI-Native with Zero Data Leakage
9. Self-Healing Platform (AHG)

| Stream                             | 1  | 2  | 3  | 4  | 5  | 6  | 7  | 8  | 9  | Verdict          |
| ---------------------------------- | -- | -- | -- | -- | -- | -- | -- | -- | -- | ---------------- |
| 1. Premium AI subs                 | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Pass           |
| 2. Business tier                   | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Pass           |
| 3. Enterprise self-hosting         | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Pass           |
| 4. Institution verification fees   | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Pass           |
| 5. Sponsored Midan posts (transparent) | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Pass           |
| 6. Creator tipping (0% fee)        | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Pass           |
| 7. Affiliate commissions           | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Pass           |
| 8. CirkleMail enterprise           | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Pass           |

**Legend for ⚠️ cells (Promise 4: "100% free for users"):**

- Streams 1, 2, 4, 5, 8 are *voluntary upgrades* — free users retain
  full core functionality. The covenant is interpreted as "100% free
  for users who choose to remain on the free tier," not "no paid
  options exist." The free tier alone satisfies every user need
  except high-volume AI usage and institution verification.
- Stream 6 (creator tipping) is 0% platform fee — 100% of the tip
  goes to the creator. No "100% free for users" violation because
  the *tipper* pays voluntarily and the *recipient* keeps 100%.
- Stream 7 (affiliate commissions) is paid by partners, not users.

> **Covenant interpretation note.** Promise 4 ("100% Free for All
> Users") is read in conjunction with Promise 1 ("$0 Developer Cost")
> and Promise 3 ("No Billing Details Required"). The combination
> commits CIRKLE to a model where:
> - Users who never pay get a fully functional product.
> - Users who voluntarily upgrade do so because they perceive
>   additional value, not because the free tier is crippled.
> - The free tier requires no billing details (no credit card on
>   signup).
>
> All 8 revenue streams comply with this interpretation.

---

## 7. Consequences

### Positive

- §1 covenant preserved across all 8 revenue streams.
- Diversified revenue reduces dependence on any single stream.
- The freemium model is sustainable at $0 marginal cost (moat C9).
- Self-hosting unlocks sovereign markets (China, Russia, Iran).
- Transparency Dashboard builds user trust — drives retention.
- 0% creator tipping commission attracts creators away from YouTube
  (55% share) and TikTok (50% share).

### Negative

- 8 revenue streams = operational complexity.
- Year-1 revenue is modest ($110K-$370K); requires seed funding to
  bridge to break-even.
- Enterprise sales cycle is long (6-12 months) — founder time
  intensive.
- Multi-rail payment processor integration takes 4-8 weeks per
  region.
- Sponsored Midan posts will draw some user pushback despite
  transparency.

### Neutral

- The Commit NFT feature (`commit-nft.ts`) remains as a feature,
  not a revenue line. The NFT itself is free; only the verification
  fee + Business tier around it generate revenue.
- The `regional-payments.ts` module is the canonical country × method
  matrix for both tipping and subscription use cases — one source of
  truth for both.

---

## 8. Compliance Notes

- **Egypt (NTRA + Consumer Protection Agency):** institution
  verification fees must be disclosed at registration; no hidden
  charges. The verification flow shows the fee upfront before
  document upload.
- **Saudi Arabia (SDAIA + PDPL):** Premium subscription data is
  stored in the KSA region per `data-residency.ts`; no cross-border
  data transfer for Saudi users.
- **UAE (TRA + UAE PDPL):** Live voice (VoIP) for Business-tier
  Wasl calls requires TRA licence; verify before enabling.
- **EU (GDPR):** Payment processor data is GDPR-compliant (Stripe,
  Razorpay both GDPR-compliant); user can request data deletion
  via `circle:dsr-request` event.
- **China (PIPL):** No Premium subscription sales in CN (PIPL
  requires local processor + ICP license); Enterprise self-hosting
  only.
- **USA (CCPA + state laws):** No data selling; "Do Not Sell My
  Personal Information" link in footer (Settings → Privacy).
- **Brazil (LGPD):** Stripe BR + Pix; LGPD-compliant data residency.

---

## 9. References

- `CIRKLE-BLUEPRINT-v16.md` Part XI (Monetization & Business Model)
- `MONETIZATION-PLAYBOOK.md` — operational detail for each revenue
  stream, pricing tiers, projections, unit economics.
- `COMPETITIVE-MOATS.md` — moats C2 (Commit), C3 (Institution verify),
  C9 (Zero-cost), C10 (PWA, no app-store tax) underpin this ADR.
- `src/lib/platform-features.ts` — the 8 always-on core features.
- `src/lib/feature-manager.ts` — per-country compliance gating
  (e.g. `payments.crypto` disabled in CN/EG/BD/BO/NP).
- `src/lib/regional-payments.ts` — country × payment method matrix.
- `src/lib/ad-engine.ts`, `src/lib/ad-compliance.ts`,
  `src/lib/sponsored-hashtags.ts` — sponsored Midan post
  implementation.
- `src/lib/tipping-service.ts`, `src/lib/rewards-service.ts` —
  creator tipping + rewards.
- `src/lib/affiliate-service.ts` — affiliate link tracking.
- `src/lib/institution-docs.ts` + `src/app/api/institutions/register/route.ts`
  — institution verification flow.
- `scripts/self-host-all.sh` — Docker Compose for Enterprise
  self-hosting.
- Stripe official docs — https://stripe.com/docs
- InstaPay API docs — https://instapay.com.eg/
- Mada API docs — https://mada.com.sa/

---

## 10. Decision Log

| Date       | Action                                              | Actor                |
| ---------- | --------------------------------------------------- | -------------------- |
| 2026-08-12 | ADR drafted, status set to PROPOSED                  | Architecture Council |
| _pending_  | CTO review                                          | CTO                  |
| _pending_  | Legal review (verification fees per region)          | Legal counsel        |
| _pending_  | Approved / Rejected / Revised                       | CTO                  |
| _pending_  | Phase 1 implementation (Premium tier wiring)          | Engineering          |
| _pending_  | Phase 2 implementation (Institution verification)    | Engineering          |
| _pending_  | Phase 3 implementation (Sponsored Midan posts)       | Engineering          |
| _pending_  | Phase 4 implementation (Affiliate + tipping live)    | Engineering          |
| _pending_  | Phase 5 implementation (Enterprise + CirkleMail ent) | Engineering          |
| _pending_  | Quarterly covenant audit (recurring)                 | Compliance officer   |

---

**End of ADR-005**

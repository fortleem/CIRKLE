# CIRKLE Monetization Playbook

**Version:** 1.0 (matches CIRKLE-BLUEPRINT-v16.0, tag `production-stable-2026-08-12`)
**Audience:** founders, CFO, BD, investors, regional GMs.
**Companion docs:** `COMPETITIVE-MOATS.md` (the moats this playbook monetises),
`ADR-005-monetization-strategy.md` (the architectural decisions that govern the
model), `FEATURE-WIRING-GUIDE.md` (how each revenue surface is wired).

This playbook covers: **revenue streams**, **pricing tiers**, **3-year
revenue projections**, **unit economics**, **regional go-to-market**, and
**competitive positioning vs the incumbents CIRKLE replaces**.

> **Covenant reminder (Blueprint §1).** CIRKLE's 9 core promises include:
> "100% free for all users" and "0% commission for creators." No revenue
> line in this playbook violates either promise. Every paid tier is a
> *voluntary upgrade* for power users / businesses / institutions; the free
> tier remains fully functional forever.

---

## 1. Revenue Streams (8 lines)

CIRKLE's monetisation is diversified across 8 revenue streams, grouped into
**consumer** (B2C), **business** (B2B), and **platform** (B2B2C) buckets.

### 1.1 Stream overview

| # | Stream                              | Bucket       | Who pays            | Margin | Year-1 ready? | Covenant-safe? |
| - | ----------------------------------- | ------------ | ------------------- | ------ | ------------- | -------------- |
| 1 | Premium AI subscriptions             | B2C          | Power users          | ~95%   | ✅             | ✅              |
| 2 | Business tier (verified institutions) | B2B         | Verified companies   | ~90%   | ✅             | ✅              |
| 3 | Enterprise self-hosting              | B2B          | Governments + large orgs | ~70% | ⚠️ (Q3)       | ✅              |
| 4 | Institution verification fees        | B2B          | Companies verifying  | ~99%   | ✅             | ✅              |
| 5 | Sponsored Midan posts (transparent) | B2B2C        | Advertisers          | ~85%   | ✅             | ✅              |
| 6 | Creator tipping (platform fee 0%)    | B2C → B2C    | Tippers (voluntary)  | 0% fee | ✅             | ✅ (0% fee)     |
| 7 | Affiliate commissions               | B2B2C        | E-commerce partners   | ~80%   | ✅             | ✅              |
| 8 | CirkleMail enterprise                | B2B          | Orgs needing mailboxes | ~85% | ⚠️ (Q2)       | ✅              |

> **Note on stream 6 (Creator tipping).** Per the §1 covenant, CIRKLE takes
> 0% commission on tips. This line is in the table because it generates
> *retention* and *transaction volume* (which feeds stream 5 + 7); the
> revenue itself is the creator's, not CIRKLE's.

### 1.2 Stream-by-stream detail

#### 1.2.1 Premium AI subscriptions (B2C)

**What:** Power users unlock higher AI quotas, longer summaries, priority
provider routing, and access to premium overlays (CirkleSpark, CirkleCreate
Studios, Content Calendar, Smart Compose Pro).

**Pricing:** $3/month or $30/year (17% annual discount).

**Free tier limits (so users know what they're upgrading from):**

| AI feature                | Free tier                    | Premium tier                |
| ------------------------- | ---------------------------- | --------------------------- |
| Wasl AI summaries         | 5/day                        | Unlimited                   |
| Commit AI fairness audits  | 3/month                      | Unlimited                   |
| CirkleCreate image gen    | 5/day                        | 50/day                      |
| Smart Compose suggestions | 10/day                       | Unlimited                   |
| Brain AI Assistant orb    | 20 queries/day              | Unlimited                   |
| AIKE predictive insights  | View-only                    | View + dismiss + custom rules |
| Cross-module share         | 3/day                        | Unlimited                   |
| AI Recap                  | 1/day                        | Unlimited                   |
| Provider priority         | Default (Groq first)        | Priority (OpenAI for reasoning, Gemini for vision) |

**Why this works:**

- The marginal cost of free-tier AI is **$0** (5 of 6 providers are
  free-tier per moat C6). The premium tier pays for the *occasional*
  OpenAI gpt-4o-mini call (~$0.01 per 1K tokens) and the engineering to
  maintain the router.
- Users who outgrow the free tier have already invested in PMB +
  AIKE memory (moat C1+C5) — switching cost is high.

**Gating file:** `src/lib/platform-features.ts` — premium overlays have
`defaultEnabled: false` and are flipped per-user via a future
`UserSubscription` Prisma model. The AI quota enforcement lives in
`src/lib/ai-cache.ts` + a per-user counter in the `User` model.

#### 1.2.2 Business tier — verified institutions (B2B)

**What:** Verified companies (per moat C3) unlock institution-branded
Wasl, multi-seat Wasl inboxes, broadcast channels, custom Commit templates,
enterprise audit logs, and verified-badge priority in search + Midan.

**Pricing:** $15/seat/month (minimum 3 seats = $45/month). Yearly = $150/seat
(17% discount).

**Free tier (institution):**

- 1 seat (founder only)
- Verified badge ✅
- 100 Commit NFT mints/month
- Standard Commit email template

**Business tier adds:**

- Up to 50 seats per institution
- Shared Wasl inbox (any seat can reply)
- Broadcast channels (1-to-many Wasl)
- Custom Commit templates (`commit-templates.ts`)
- Enterprise audit log + data residency control (`data-residency.ts`)
- Verified-badge priority in Midan search
- API access to Commit + Institution endpoints (rate-limited)

**Why this works:**

- WhatsApp Business charges per message template (>$0.05/msg in many
  markets) — CIRKLE charges a flat seat fee regardless of message volume.
- Telegram has no institution tier.
- LinkedIn charges $30-90/seat for Sales Navigator — CIRKLE Business is
  $15/seat and includes everything LinkedIn offers plus Commit + Pay.

**Gating files:**

- `src/lib/institution-docs.ts` — verification flow.
- `src/app/api/institutions/register/route.ts` — registration.
- Future `src/lib/subscription-service.ts` — Stripe-style billing hook
  (deferred pending ADR-005).

#### 1.2.3 Enterprise self-hosting (B2B)

**What:** Governments, large enterprises, and universities deploy CIRKLE
on their own infrastructure via `scripts/self-host-all.sh` (Docker
Compose stack: Matrix Synapse + PeerTube + Mailcow + ntfy + TileServer GL
+ the 3 CIRKLE mini-services). They get a sovereign CIRKLE instance on
their domain, with their own data plane, their own AI provider keys, and
their own admin panel.

**Pricing:** Custom, starting at $50K/year for governments and $100K/year
for enterprises. Includes:

- Deployment support (1 week on-site for governments)
- Quarterly security audits
- SLA with 99.9% uptime
- Custom feature development (charged separately)
- Priority access to new CIRKLE releases

**Why this works:**

- Egypt, Saudi, Iran, China, Russia — all demand data sovereignty
  (PIPL, FZ-242, PDPL). CIRKLE is the only super-app that *can* be
  self-hosted — WhatsApp/Telegram/Instagram cannot.
- Universities get an instant super-app for students + faculty without
  paying per-seat Google Workspace or Microsoft 365 licenses.
- Large enterprises (oil & gas, telecom, banking) get a sovereign
  alternative to Slack + Zoom + Salesforce — for less than they pay for
  Microsoft 365 E5.

**Gating files:**

- `scripts/self-host-all.sh` — already exists.
- `Dockerfile` + `docker-compose.yml` + `Caddyfile` — already exist.
- `docs/DEPLOYMENT-GUIDE.md` — already exists.
- Future `docs/ENTERPRISE-DEPLOYMENT.md` — planned.

#### 1.2.4 Institution verification fees (B2B)

**What:** Each institution pays a one-time verification fee at
registration. This covers the manual review of uploaded documents
(commercial registration, tax ID, articles of association, founder ID,
bank letter — per `institution-docs.ts`).

**Pricing:**

- Sole proprietorship / freelance: $5 one-time
- LLC / partnership: $25 one-time
- Corporation (JSC): $50 one-time
- Non-profit / NGO: $10 one-time (subsidised)
- Government entity: $0 (free — CIRKLE benefits from gov adoption)

**Why this works:**

- The fee covers the manual review cost (~5 min of reviewer time ×
  loaded labour rate ≈ $5).
- It also serves as a *spam filter* — bad actors won't pay $25 to
  verify a fake LLC.
- LinkedIn charges $0 for verification but accepts SMS-only proof
  (trivially spoofable); CIRKLE's $25 + documents is genuinely
  trustworthy.
- The verification matrix per country (`institution-docs.ts`) is itself
  an asset — a competitor would need weeks of legal research to
  replicate for each market.

**Gating files:**

- `src/app/api/institutions/register/route.ts` — the verification fee
  is collected at registration (future Stripe / cash-collection
  integration per ADR-005 §4.4).

#### 1.2.5 Sponsored Midan posts (B2B2C — the only ad product)

**What:** Advertisers pay for *transparent* sponsored posts in the Midan
feed. Every sponsored post is labelled "Sponsored" with the advertiser's
verified-institution badge visible. No targeting beyond city/region
level (per the §1 covenant: "Non-targeted local ads — city-level only").

**Pricing:**

- City-level sponsored post: $50 per 1,000 impressions (CPM)
- Region-level (e.g. all of Egypt): $200 CPM
- Global: $500 CPM
- Trending hashtag sponsorship (per day): $1,000

**Why this works:**

- The covenant forbids personalised targeting (per user). Advertisers
  who want to reach "young Egyptian women who like football" cannot —
  but they *can* reach "everyone in Cairo right now." This is a feature,
  not a bug: it protects user privacy (moat C8) AND keeps ad creation
  simple.
- Sponsored posts look like real posts (no flashy banners) — they
  integrate with the Midan feed natively, which drives higher CTR than
  typical display ads.
- The Transparency Dashboard (`overlay.transparency_dashboard`)
  publicly shows ad revenue + advertiser list — building user trust.

**Gating files:**

- `src/lib/ad-engine.ts` — ad selection + serving.
- `src/lib/ad-compliance.ts` — region-specific ad rules (e.g. alcohol
  ads disabled in KSA/Iran).
- `src/lib/sponsored-hashtags.ts` — sponsored hashtag serving.
- `src/components/overlays/ad-studio.tsx` — advertiser self-serve portal
  (gated to verified institutions).
- `src/components/overlays/transparency-dashboard.tsx` — public ad
  revenue + advertiser list.

#### 1.2.6 Creator tipping (B2C → B2C, 0% platform fee)

**What:** Users tip creators with money (via Circle Pay) or with virtual
gifts. CIRKLE takes **0% commission** — the entire tip goes to the
creator.

**Pricing:** N/A (no fee). Users send any amount; creators receive 100%.
Circle Pay uses regional payment rails (InstaPay in Egypt, Mada in KSA,
Pix in Brazil, UPI in India — per `regional-payments.ts`) so the
interchange fee is paid by the rail, not CIRKLE.

**Why this works (even though it's free):**

- Tips generate **transaction volume** through Circle Pay →
  strengthens the Pay tab's retention (moat C9: zero-cost means we
  can offer this forever).
- Tip receipts are minted as NFTs via `commit-nft.ts` → creators
  accumulate a portable portfolio they can show on other platforms.
- Sponsored Midan posts (stream 5) are more valuable when the
  audience includes tipping users — so tipping indirectly boosts ad
  CPMs.
- User retention: tipping creates a parasocial obligation to return to
  the platform.

**Gating files:**

- `src/lib/tipping-service.ts` — tipping logic + regional method picker.
- `src/lib/rewards-service.ts` — performance rewards for creators who
  hit engagement milestones.
- `src/lib/regional-payments.ts` — per-country payment method matrix.
- `prisma/schema.prisma` → `Tip`, `VirtualGift`, `CreatorReward` models.

#### 1.2.7 Affiliate commissions (B2B2C)

**What:** When a user clicks a Rihla booking link, a Midan product link,
or a Circle Pay merchant link and completes a transaction, CIRKLE earns
an affiliate commission from the partner.

**Pricing:**

- Rihla flights/hotels: 2-5% of booking value (Booking.com-style
  affiliate rates)
- Rihla visas: 10% of visa fee
- Midan product links (Amazon, Noon, Jumia): 3-8% of sale
- Circle Pay merchant referrals: $0.10 per active merchant

**Why this works:**

- All affiliate links are **clearly disclosed** (per FTC + EU consumer
  protection rules). CIRKLE never hides that a link is monetised.
- The AIKE personalisation engine (moat C5) makes affiliate links
  genuinely useful — "you booked a flight to Sharm, here's a 15%-off
  hotel in Naama Bay" is a feature, not spam.
- 100% of affiliate revenue goes to CIRKLE (no creator split) — but
  creators who drive affiliate clicks via Midan posts earn a
  performance reward via `rewards-service.ts`.

**Gating files:**

- `src/lib/affiliate-service.ts` — affiliate link generation + tracking.
- `src/lib/rewards-service.ts` — creator reward calculation.
- `src/lib/brain-orchestrator.ts` — feeds affiliate clicks to AIKE for
  personalisation.

#### 1.2.8 CirkleMail enterprise (B2B)

**What:** Enterprises buy `@institution.com` mailboxes hosted on
CIRKLE's Mailcow infrastructure. Comes with the Smart Inbox AI triage,
audit logs, and retention policies.

**Pricing:** $5/mailbox/month (vs Google Workspace $6, Microsoft 365
$6 — CIRKLE undercuts by 17% AND includes the Smart Inbox AI).

**Why this works:**

- CIRKLE already runs Mailcow for `@cirkle.app` mail (moat C9:
  zero-cost). Enterprise mailboxes are pure incremental margin.
- The Smart Inbox AI is a differentiator no incumbent offers
  natively — Google's Smart Compose is text completion, not full
  triage.

**Gating files:**

- `src/lib/email-service.ts` — Mailcow integration.
- `src/lib/circle-mail.ts` — CirkleMail client.
- `src/components/overlays/circle-mail.tsx` — mail UI.
- `src/components/overlays/smart-inbox.tsx` — AI triage UI.

---

## 2. Pricing Tiers

### 2.1 The four tiers

| Tier        | Price             | Target user               | Key unlocks                                                            |
| ----------- | ----------------- | ------------------------- | ---------------------------------------------------------------------- |
| **Free**    | $0 forever        | Everyone                  | All 8 core features + 17 locales + E2EE + on-device AI                  |
| **Premium** | $3/mo ($30/yr)    | Power users               | Unlimited AI quotas + premium overlays + priority provider routing     |
| **Business** | $15/seat/mo     | Verified institutions     | Multi-seat Wasl + broadcast + custom Commit + audit logs + API          |
| **Enterprise** | Custom ($50K-$500K/yr) | Governments + large orgs | Self-hosted + SLA + custom features + data residency control          |

### 2.2 Free tier (always-on, per the covenant)

The free tier is **fully functional forever** — users can chat, post,
share photos/videos, make voice/video calls, sign Commit contracts,
tip creators, browse Midan, plan trips, scan receipts, use Brain AI
(within daily quotas), and access all 17 locale packs.

What free users **don't** get:

- Higher AI quotas (e.g. only 5 Wasl summaries/day)
- Premium AI overlays (CirkleSpark, CirkleCreate Studio, Content
  Calendar, Smart Compose Pro)
- Verified-institution badge (requires Business tier + verification)
- Custom Commit templates
- Self-hosting
- API access

### 2.3 Premium tier ($3/month or $30/year)

The lowest-friction upgrade in the market. Targets:

- Power users who hit daily AI quotas
- Creators who want Smart Compose Pro + Content Calendar
- Small-business owners who want priority AI provider routing for
  faster Commit detection

**Conversion target:** 5-8% of MAU convert to Premium (industry
benchmark for freemium SaaS is 2-7%; CIRKLE targets the high end
because of the AI-value flywheel).

### 2.4 Business tier ($15/seat/month)

For verified institutions only (per moat C3 + stream 1.2.4). Targets:

- Egyptian SMBs (LLCs, partnerships) — 4.5M registered businesses
  in Egypt per MCIT
- GCC SMEs — 1.2M registered in Saudi, 600K in UAE
- Egyptian NGOs — ~5,000 registered
- Government entities (free verification; ~3K entities in Egypt)

**Conversion target:** 1-3% of verified institutions buy Business tier
seats. Average seat count: 5 seats/institution.

### 2.5 Enterprise tier (custom, $50K-$500K/year)

Targets:

- Sovereign governments (Egypt, Saudi, Iran, China, Russia) — 5 target
  countries × $200K average = $1M opportunity
- Large universities — 50 target universities × $75K = $3.75M
- Telecom operators (Vodafone Egypt, STC Saudi) — 5 targets × $150K
- Banks (CIB, NBE, Al Rajhi) — 10 targets × $200K = $2M

**Conversion target:** 2-3 enterprise deals in Year 1, 8-12 in Year 2,
20+ in Year 3.

### 2.6 Pricing rationale vs incumbents

| Competitor          | Equivalent tier              | Price             | CIRKLE equivalent            | CIRKLE price | Discount |
| ------------------- | ---------------------------- | ----------------- | ---------------------------- | ------------ | -------- |
| WhatsApp Business   | Per-message template         | $0.05/msg+        | Business tier (unlimited)     | $15/seat/mo | ~95%     |
| Telegram Premium    | Personal premium             | $5/mo             | Premium                       | $3/mo        | 40%      |
| LinkedIn Premium     | Career / Business            | $30-60/mo         | Premium + Business            | $3 + $15/mo | 80%      |
| LinkedIn Sales Nav   | Per-seat sales               | $99/seat/mo       | Business                       | $15/seat/mo | 85%      |
| Google Workspace     | Business Standard            | $6/seat/mo        | CirkleMail enterprise          | $5/seat/mo | 17%      |
| Microsoft 365 E5     | Enterprise                   | $57/seat/mo       | Business                       | $15/seat/mo | 74%      |
| Slack Business+      | Per-seat                      | $12.50/seat/mo    | Business                       | $15/seat/mo | -20% (Slack wins on price, loses on AI + Commit) |
| Booking.com          | Affiliate commission          | 2-5% of booking   | Affiliate (Rihla)              | 2-5% of booking | 0% (parity) |

---

## 3. Revenue Projections (3-Year)

Three scenarios: **Conservative**, **Moderate**, **Aggressive**. All
figures in USD. Year 1 = 2026 launch year; Year 3 = 2028.

### 3.1 User growth assumptions

| Year   | Conservative MAU | Moderate MAU | Aggressive MAU |
| ------ | ---------------- | ------------ | -------------- |
| Year 1 | 100K             | 250K         | 500K           |
| Year 2 | 400K             | 1M           | 2M             |
| Year 3 | 1M               | 3M           | 8M             |

**Geographic mix** (Moderate scenario, Year 3):

- Egypt: 1.2M MAU (40%)
- GCC (SA, UAE, KW, QA): 600K MAU (20%)
- Other MENA (JO, MA, DZ, TN, IQ): 600K MAU (20%)
- Asia (IN, PK, BD, ID): 450K MAU (15%)
- Global (EU, US, rest): 150K MAU (5%)

### 3.2 Conversion rate assumptions

| Tier        | Conservative | Moderate | Aggressive |
| ----------- | ------------ | -------- | ---------- |
| Free → Premium | 3%           | 5%       | 8%         |
| Institution verified → Business | 1% | 2% | 3% |
| Verified institutions / MAU | 0.5% | 0.8% | 1.2% |
| Avg seats per Business institution | 3 | 5 | 7 |
| Enterprise deals closed (cumulative by year-end) | Y1: 1, Y2: 4, Y3: 10 | Y1: 2, Y2: 8, Y3: 20 | Y1: 3, Y2: 12, Y3: 30 |

### 3.3 Revenue projections

#### Conservative

| Stream                          | Year 1   | Year 2    | Year 3     |
| ------------------------------- | -------- | --------- | ---------- |
| 1. Premium AI subs              | $36K     | $144K     | $360K      |
| 2. Business tier                | $4K      | $20K      | $54K       |
| 3. Enterprise self-hosting      | $50K     | $200K     | $500K      |
| 4. Institution verification    | $5K      | $20K      | $50K       |
| 5. Sponsored Midan posts        | $10K     | $40K      | $100K      |
| 6. Creator tipping (0% fee)     | $0       | $0        | $0         |
| 7. Affiliate commissions        | $5K      | $20K      | $50K       |
| 8. CirkleMail enterprise        | $0       | $20K      | $100K      |
| **TOTAL**                       | **$110K**| **$464K** | **$1.214M** |

#### Moderate

| Stream                          | Year 1    | Year 2     | Year 3      |
| ------------------------------- | --------- | ---------- | ----------- |
| 1. Premium AI subs              | $150K     | $600K      | $1.8M       |
| 2. Business tier                | $14K      | $90K       | $324K       |
| 3. Enterprise self-hosting      | $100K     | $400K      | $1M         |
| 4. Institution verification    | $25K      | $80K       | $200K       |
| 5. Sponsored Midan posts        | $50K      | $200K      | $600K       |
| 6. Creator tipping (0% fee)    | $0        | $0         | $0          |
| 7. Affiliate commissions        | $30K      | $120K      | $400K       |
| 8. CirkleMail enterprise        | $0        | $120K      | $400K       |
| **TOTAL**                       | **$369K** | **$1.61M** | **$4.724M** |

#### Aggressive

| Stream                          | Year 1    | Year 2     | Year 3      |
| ------------------------------- | --------- | ---------- | ----------- |
| 1. Premium AI subs              | $360K     | $1.44M     | $5.76M      |
| 2. Business tier                | $54K      | $300K      | $1.344M     |
| 3. Enterprise self-hosting      | $150K     | $600K      | $1.5M       |
| 4. Institution verification    | $50K      | $200K      | $600K       |
| 5. Sponsored Midan posts        | $100K     | $400K      | $1.5M       |
| 6. Creator tipping (0% fee)    | $0        | $0         | $0          |
| 7. Affiliate commissions        | $80K      | $300K      | $1.2M       |
| 8. CirkleMail enterprise        | $0        | $200K      | $1M         |
| **TOTAL**                       | **$794K** | **$3.44M** | **$12.904M**|

### 3.4 Revenue mix evolution

Year 1 (Conservative): Enterprise + Premium carry (53% + 33%).
Year 3 (Conservative): Premium AI subs become the largest single line
(30%), followed by Enterprise (41%).

The takeaway: **enterprise is the early fuel, premium subs + business
verifications compound into the long-term revenue base.**

---

## 4. Unit Economics

### 4.1 Cost per user (per month)

| Cost category          | Free user | Premium user | Business seat |
| ---------------------- | --------- | ------------ | -------------- |
| Turso DB (amortised)    | $0.001    | $0.002       | $0.005         |
| Mini-services (chat/news/AI) | $0.005 | $0.010       | $0.020         |
| AI provider calls       | $0.000    | $0.020       | $0.050         |
| Web Push (VAPID)        | $0.0001   | $0.0001      | $0.0001        |
| Mailcow (CirkleMail)    | $0.000    | $0.000       | $0.005         |
| Bandwidth (CDN)         | $0.005    | $0.010       | $0.020         |
| Engineering amortised   | $0.010    | $0.010       | $0.020         |
| **Total cost per month**| **$0.021**| **$0.052**   | **$0.120**     |

> Engineering amortisation assumes a 6-person team fully loaded at
> $60K/month = $720K/year, spread across the user base. As the user
> base grows, this line approaches $0.

### 4.2 Revenue per user (per month)

| User type              | Revenue/month | Notes                                          |
| ---------------------- | ------------- | ---------------------------------------------- |
| Free user              | $0.05 - $0.20 | Affiliate + sponsored ads + occasional tip flow |
| Premium user           | $3.00         | Direct subscription                              |
| Business seat          | $15.00        | Direct subscription + verification amortisation |
| Enterprise seat        | ~$100         | Self-hosting deal / SLA / 100 seats             |

### 4.3 Margin per user (per month)

| User type              | Revenue | Cost   | Margin | Margin % |
| ---------------------- | ------- | ------ | ------ | -------- |
| Free user              | $0.10   | $0.021 | $0.079 | 79%      |
| Premium user           | $3.00   | $0.052 | $2.948 | 98%      |
| Business seat          | $15.00  | $0.120 | $14.88 | 99%      |
| Enterprise seat        | $100    | $1.00  | $99    | 99%      |

### 4.4 Break-even point

**Monthly burn rate** (6-person team + infra): ~$60K/month
($720K/year).

**Break-even MAU required (Moderate scenario):**

- All-free users: 60,000 / $0.079 = ~760K MAU
- 5% premium conversion: 60,000 / ($0.079 × 0.95 + $3 × 0.05) = ~33K MAU
- 5% premium + 2% business: 60,000 / ($0.079 × 0.93 + $3 × 0.05 + $15 × 0.02 × 5 seats) = ~22K MAU

> **Year 1 break-even is achievable at 30-50K MAU with the Moderate
> conversion rates** — well below the 100K Conservative target. This is
> the operational benefit of moat C9 (zero-cost architecture): the burn
> rate is essentially fixed at the engineering team's salary.

### 4.5 Payback period

| Acquisition channel   | CAC    | Payback @ free margin | Payback @ 5% premium conv. |
| --------------------- | ------ | --------------------- | -------------------------- |
| Organic (SEO/PR)      | $0     | 0 months              | 0 months                   |
| Referral (invite)     | $1     | 13 months             | 2 months                   |
| Paid (Google Ads)     | $5     | 64 months             | 8 months                   |
| Influencer partnership | $3    | 38 months             | 5 months                   |

**Recommendation:** prioritise organic + referral; deprioritise paid
acquisition until Premium conversion exceeds 5%.

---

## 5. Go-to-Market Strategy by Region

### 5.1 Phase 1 — Egypt (Months 1-12)

**Why Egypt first:**

- 110M population, 80% smartphone penetration, 94% mobile-web browsing
  (per GSMA 2025) — the perfect PWA market.
- Egyptian Arabic locale (moat C7) is a wedge no competitor offers.
- Founder network + government openness (MCIT startup programs).
- Low CAC: organic + community-driven, ~$0.50/MAU.
- Strong pain points: WhatsApp dominates but offers no institution
  verification, no Commit contracts, no Shield reporting — high
  willingness to switch.

**Tactics:**

- **Founder-led onboarding:** personally onboard the first 1,000
  users (high-touch, lessons feed into product).
- **Institution partnerships:** partner with 3-5 chambers of commerce
  to bulk-verify member companies → instant verified inventory.
- **Citizen Shield PR:** the Shield feature is a press magnet — partner
  with one Egyptian journalist syndicate for a launch story.
- **University pilots:** 3 universities (Cairo, Ain Shams, AUC) for
  Verified Circle (Education Workspace) — converts faculty + students.
- **Midan content seeding:** pay 50 Egyptian creators $100/month for 3
  months to seed Midan with content → kickstarts the feed algorithm.

**Year 1 targets:**

- 100K MAU
- 5K verified institutions
- 500 Premium subscribers
- 1 Enterprise deal (university or government)
- $110K revenue (Conservative)

### 5.2 Phase 2 — GCC (Months 12-24)

**Why GCC second:**

- 4M Egyptian expats in KSA/UAE/KW/QA — same Egyptian Arabic locale
  applies.
- High ARPU: GDP per capita 5× Egypt's, willingness to pay $3/mo for
  Premium is high.
- PDPL compliance (data residency) is a feature — local regulators
  appreciate the effort.
- Strong SMB market: 1.2M SMEs in Saudi, 600K in UAE → Business tier
  pipeline.

**Tactics:**

- **Diaspora expansion:** Egyptian expats invite family back home —
  built-in viral loop.
- **Government partnerships:** pitch the Saudi Digital Government
  Authority (SDAIA) on the self-hosted Enterprise tier for sovereign
  chat.
- **Visa Explorer overlay** (`circle:visa-explorer`) is a top-of-funnel
  feature for the 6M expats who need visa services.
- **Rihla partnerships:** integrate with Saudi Arabia's Mahfaza wallet +
  Emirates' NBD for affiliate commissions.

**Year 2 targets:**

- 1M MAU total (Egypt + GCC)
- 30K verified institutions
- 8K Premium subscribers
- 4 Enterprise deals
- $1.6M revenue (Moderate)

### 5.3 Phase 3 — Global (Months 24-36)

**Targets:**

- Other MENA: Jordan, Morocco, Tunisia, Algeria, Iraq (Arabic locales
  already shipped).
- Asia: India (Urdu + Hindi locales shipped), Pakistan, Bangladesh,
  Indonesia (Bahasa Indonesia shipped).
- EU: GDPR compliance already wired via `data-residency.ts`; launch
  Germany + France first (DACH market).
- China + Russia: only via Enterprise self-hosting (per `feature-manager.ts`
  rules — `live_voice` is disabled in CN, etc.).

**Tactics:**

- **Localised launch campaigns:** one PR cycle per locale pack
  announcement ("CIRKLE ships Korean UI" → Korean tech press).
- **Translate-this-press-release tooling:** use the on-device NLLB-200
  (moat C8) to auto-translate launch content into all 17 locales.
- **Influencer partnerships:** 5-10 mid-tier influencers per new
  market.
- **Enterprise-led growth:** sovereign deployments in Iran, China,
  Russia → 5+ enterprise deals.

**Year 3 targets:**

- 3M MAU (Moderate)
- 100K verified institutions
- 50K Premium subscribers
- 20 Enterprise deals
- $4.7M revenue (Moderate)

### 5.4 Regional timeline at a glance

```
2026 Q1 ─── Egypt launch (Founder-led)
2026 Q2 ─── First Enterprise deal (Egypt university)
2026 Q3 ─── Institution verification live (5 chambers onboarded)
2026 Q4 ─── 100K MAU milestone

2027 Q1 ─── GCC launch (Saudi + UAE)
2027 Q2 ─── First sovereign Enterprise deal (SDAIA or equivalent)
2027 Q3 ─── Premium tier hits 5K subs
2027 Q4 ─── 1M MAU milestone

2028 Q1 ─── Other-MENA + Asia launch
2028 Q2 ─── EU launch (DACH first)
2028 Q3 ─── First China/Russia sovereign deployment
2028 Q4 ─── 3M MAU + $5M ARR
```

---

## 6. Competitive Positioning vs Incumbents

### 6.1 Positioning matrix (where CIRKLE wins)

```
                          Privacy-First
                                ▲
                                │
                        CIRKLE  │  ●
                                │
                                │
    ────────────────────────────┼────────────────────────── Super-App
                                │                  ◆ Instagram
                  ● Signal     │                  ◆ YouTube
                                │                  ◆ WhatsApp
                                │
                                │  ◆ Telegram
                                │
                                │  ◆ LinkedIn
                                │
                                ▼
                       Surveillance-First
```

CIRKLE is the only player in the upper-right quadrant: a true super-app
that is also privacy-first.

### 6.2 vs WhatsApp (Meta)

| Dimension        | WhatsApp                              | CIRKLE                                       |
| ---------------- | -------------------------------------- | -------------------------------------------- |
| Business model    | Ads in Status + Meta data harvesting  | Premium + Business + Enterprise (no ads in Wasl) |
| E2EE              | Yes (chat) — no (Status, business)    | Yes (everything, on-device AI for moderation) |
| Institution verify| Phone SMS only (trivially spoofable)  | Country-specific document matrix              |
| Contract primitive | None — must use external lawyers      | Cirkle Commit (binding + escrow + NFT + email) |
| Localization      | MSA Arabic only (no masri)            | 17 locales incl. Egyptian colloquial          |
| Civic reporting   | None                                  | Citizen Shield + evidence chain              |
| Creator monetisation | Status ads (Meta keeps 100%)         | Tipping 0% fee + sponsored Midan (transparent) |
| Commission        | WhatsApp Pay 0.99% in India + ads     | 0% commission covenant                        |
| PWA               | No (native app required)              | Yes (PWA, no app-store tax)                    |

**Sales line:** *"WhatsApp reads your Status ads and feeds Meta's ad
engine. CIRKLE reads nothing — and signs your contracts for free."*

### 6.3 vs Telegram

| Dimension        | Telegram                              | CIRKLE                                       |
| ---------------- | -------------------------------------- | -------------------------------------------- |
| E2EE              | Only in "secret chats" (default = cloud) | Default E2EE (per ADR-002)                   |
| Bot ecosystem     | Strong but unstructured                | Bot Developer overlay + structured `bot-sdk.ts` |
| Localization      | 18+ languages, no Egyptian colloquial  | 17 locales incl. masri                        |
| Institution verify| None                                   | Country-specific document matrix             |
| Commit / contract | None                                   | Cirkle Commit                                 |
| Civic reporting   | None                                   | Citizen Shield                                |
| Self-hosting      | Telegram needs ~100 servers; companies can't | Docker Compose stack, runs on one VPS        |
| PWA               | Yes but limited                         | Yes (full PWA, installable, offline-first)   |

**Sales line:** *"Telegram is cloud-first with optional E2EE. CIRKLE is
E2EE-first with optional cloud. The difference matters when you're
signing a contract."*

### 6.4 vs LinkedIn (Microsoft)

| Dimension        | LinkedIn                              | CIRKLE                                       |
| ---------------- | -------------------------------------- | -------------------------------------------- |
| Pricing          | $30-99/mo for Premium                  | $3/mo Premium + $15/seat Business             |
| Professional network | Yes (only)                          | Yes (Pro Network tab + 18 modules beyond)    |
| Institution verify| SMS / domain only                       | Country-specific document matrix             |
| Commit            | None                                   | Cirkle Commit                                |
| AI                | Generic ("AI suggestions")              | 9+1 phase Brain AI + AIKE autonomous learning |
| Localization      | 25+ languages, no Egyptian colloquial  | 17 locales incl. masri                        |
| Civic reporting   | None                                   | Citizen Shield                                |
| Creator monetisation | None                               | Tipping + sponsored Midan                    |
| PWA               | Yes                                    | Yes (full PWA, no app-store tax)              |

**Sales line:** *"LinkedIn charges $99/seat/month for Sales Navigator
with no AI, no Commit, and no E2EE. CIRKLE charges $15/seat/month and
throws in a super-app."*

### 6.5 vs Booking.com

| Dimension        | Booking.com                            | CIRKLE                                       |
| ---------------- | -------------------------------------- | -------------------------------------------- |
| Commission       | 15-25% per booking                      | 2-5% affiliate (Rihla) — passes savings to user |
| Travel scope     | Hotels + flights only                   | Hotels + flights + visas + itinerary + maps + locals |
| Localization     | 40+ languages, no Egyptian colloquial  | 17 locales incl. masri                        |
| AI                | Basic search filters                    | Brain AI suggests itinerary based on Wasl + PMB |
| Civic             | None                                   | Citizen Shield                                |
| PWA               | Limited                                | Full PWA                                      |
| Wallet            | None                                   | Circle Pay + Commit escrow                    |

**Sales line:** *"Booking.com takes 22% of every hotel booking. CIRKLE
takes 0% — and suggests the right hotel based on your chat history."*

### 6.6 vs Instagram / YouTube / Twitter-X

| Dimension        | Incumbents                              | CIRKLE                                       |
| ---------------- | -------------------------------------- | -------------------------------------------- |
| E2EE              | None (server-side scanning)             | Default E2EE + on-device AI                   |
| Creator monetisation | Ads share (55% YouTube, ~30% TikTok)  | Tipping 0% fee + sponsored Midan (transparent) |
| Algorithmic transparency | Opaque                          | Transparency Dashboard overlay                 |
| Filter bubble     | Reinforced by algorithm                 | Echo Breaker overlay surfaces dissenting views  |
| Localization      | No Egyptian colloquial                  | 17 locales incl. masri                        |
| Civic reporting   | None                                   | Citizen Shield                                |
| PWA               | Limited (YouTube PWA; others native)    | Full PWA, no app-store tax                    |

**Sales line:** *"YouTube pays 55% ad share and reads your data.
CIRKLE pays 100% of tips and reads nothing."*

---

## 7. Revenue Operations — What's Already Wired

The following files in the codebase TODAY implement the monetisation
surfaces described above. None of them require new infrastructure to
start collecting revenue.

| Stream                          | Files (already shipped)                                                              | What's missing                          |
| ------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------- |
| 1. Premium AI subs              | `src/lib/ai-cache.ts` (quota tracking), `src/lib/brain-router.ts` (provider routing) | Stripe billing hook (per ADR-005 §4.4) |
| 2. Business tier                | `src/lib/institution-docs.ts`, `src/app/api/institutions/register/route.ts`         | Subscription model + multi-seat Wasl    |
| 3. Enterprise self-hosting       | `scripts/self-host-all.sh`, `Dockerfile`, `docker-compose.yml`                       | Sales contracts + SLA template          |
| 4. Institution verification    | `src/lib/institution-docs.ts`, `src/app/api/institutions/register/route.ts`         | Payment collection at registration      |
| 5. Sponsored Midan posts        | `src/lib/ad-engine.ts`, `src/lib/ad-compliance.ts`, `src/lib/sponsored-hashtags.ts`, `src/components/overlays/ad-studio.tsx` | Advertiser onboarding flow              |
| 6. Creator tipping              | `src/lib/tipping-service.ts`, `src/lib/rewards-service.ts`, `src/lib/regional-payments.ts` | Live payment processor (InstaPay/Mada) |
| 7. Affiliate commissions        | `src/lib/affiliate-service.ts`                                                       | Partner contract templates              |
| 8. CirkleMail enterprise        | `src/lib/email-service.ts`, `src/lib/circle-mail.ts`, `src/components/overlays/circle-mail.tsx`, `src/components/overlays/smart-inbox.tsx` | Mailcow provisioning script            |

> **Reading:** the entire monetisation surface area is *wired but not
> yet collecting*. The gating factor is the Stripe / payment processor
> integration planned in ADR-005 §4.4.

---

## 8. Risks & Mitigations

| Risk                                              | Likelihood | Impact | Mitigation                                                                |
| ------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------- |
| WhatsApp ships an institution-verification tier    | Low         | High   | Country-doc matrix (moat C3) takes 6+ months to replicate per market       |
| Telegram adds E2EE-by-default                     | Medium      | Medium | CIRKLE's on-device AI + Commit primitives remain unmatched                  |
| Apple/Google ban PWAs from home screen            | Very Low    | High   | Capacitor wrapper (per ADR-001 Option C) is the documented fallback         |
| AI provider free tiers disappear                  | Medium      | High   | 5-provider failover + on-device AI (moat C6+C8) absorbs the shock           |
| Regulator demands content backdoor                 | Low         | High   | E2EE + on-device AI = no content to give (C8)                              |
| Civil-society backlash against sponsored posts     | Low         | Medium | Transparency Dashboard + clear "Sponsored" label + opt-out per category     |
| Creator tipping cannibalises Premium subs          | Low         | Low    | Tipping drives engagement → Premium subs; not zero-sum                     |
| Enterprise sales cycle >12 months                  | High        | Medium | Pipeline 3× target deals in flight at all times                             |
| Currency volatility (EGP devaluation)              | High        | Medium | Price Premium in local currency at PPP-adjusted rate; hold USD for Enterprise |

---

## 9. North-Star Metrics

Track these weekly:

| Metric                                   | Target (Year 1) | Target (Year 3) |
| ---------------------------------------- | --------------- | --------------- |
| MAU                                       | 100K            | 3M              |
| Verified institutions                    | 5K              | 100K            |
| Premium conversion rate                  | 3%              | 5%              |
| Business conversion (of verified)         | 1%              | 2%              |
| Commits signed / month                   | 5K              | 200K            |
| Citizen Shield reports filed / month     | 200             | 10K             |
| Creator tips volume / month              | $10K            | $500K           |
| Sponsored Midan post fill rate           | 30%             | 80%             |
| Enterprise deals in pipeline             | 5               | 30              |
| Net Promoter Score (NPS)                  | >40             | >60             |
| Day-30 retention                         | >40%            | >55%            |
| Day-90 retention                          | >25%            | >40%            |

---

## 10. Summary

CIRKLE's monetisation rests on three pillars:

1. **Volume** — Premium AI subscriptions at $3/mo, 5% conversion of a
   3M-user base by Year 3 = $5.76M ARR.
2. **Trust** — Verified institutions paying $15/seat and one-time
   verification fees; the country-doc matrix (moat C3) is the
   defensible wedge.
3. **Sovereignty** — Enterprise self-hosting for governments and large
   orgs at $50K-$500K/year; the only super-app that *can* be
   self-hosted.

The free tier remains 100% covenant-compliant forever — no ads in Wasl,
no data selling, no app-store commission. Every paid tier is a voluntary
upgrade that unlocks genuine additional value (more AI, verified badges,
self-hosting) rather than removing artificial limits.

The combination of moats C1-C10 (see `COMPETITIVE-MOATS.md`) means
CIRKLE can sustain $0 marginal cost per user indefinitely — and
therefore can out-wait any competitor whose business model requires
monetising user data.

---

**End of MONETIZATION-PLAYBOOK.md** — last updated for tag
`production-stable-2026-08-12` at commit `763e03c`.

# CIRKLE (دوائر) — Complete Production Blueprint v16.0

**AI-Native Super App — Fully Merged, Updated & Expanded Edition**

> **Version History:**
> - v10.0 → v12.0: Original Circle blueprint (Flutter, Matrix, IPFS, PeerTube)
> - v12.0 → v13.0: CIRKLE rebrand + Brain AI 9-phase architecture
> - v13.0 → v14.0: Module merge + Phase 4.5 + PCPF + AHG
> - v14.0 → v15.0: Full implementation + AIKE Phase 7.5 + 135 data sources + OIDC + E2EE + Federation + Governance + 17 languages + Turso + all remediation
> - **v15.0 → v16.0: 10 Creative Social Features + Production Hardening layer + 3-Layer Rollback Protection + production-stable tag `production-stable-2026-08-12` at commit `763e03c`**

> **What's new in v16.0**
>
> 1. **10 Creative Social Features** — Smart Compose (كتابة ذكية), Social Rituals (طقوس اجتماعية), Social Analytics (تحليلات اجتماعية), Smart Notifications (إشعارات ذكية), Cross-Module Share (مشاركة عبر الوحدات), Connection Graph (خريطة العلاقات), Content Calendar (تقويم المحتوى), Mood Engine (محرّك المزاج), Social Challenges (تحدّيات اجتماعية), AI Content Discovery (اكتشاف المحتوى).
> 2. **Production Hardening layer** — Input validation via `zod`, in-memory rate limiting with named presets, Sentry-shaped error monitoring with `/api/monitoring/errors`, React error boundaries on all 8 screens, framework-free API smoke tests at `/api/_test`.
> 3. **3-Layer Rollback Protection** — GitHub Branch Protection API (`allow_force_pushes=false`, `enforce_admins=true`, `required_linear_history=true`) + local `pre-push` hook (mode 555, read-only) + git config (`receive.denyNonFastForwards`, `receive.denyDeletes`, `transfer.fsckObjects`).
> 4. **Production-stable tag** `production-stable-2026-08-12` at commit `763e03c` — all endpoints verified healthy.
> 5. **Fresh backup** `backups/cirkle-production-20260812-153447.tar.gz` (393 MB full working tree).
> 6. **Overlays** grew from 65 → 71 (CREATIVE-1 added 3, CREATIVE-2 added 3).
> 7. **API routes** grew from 233 → 237 (rituals, share/cross-module, mood, challenges).
> 8. **`next.config.ts`** `eslint` key removed (was causing Next.js 16 build warnings).

**Platform:** Next.js 16 (App Router) — Web-first PWA (ADR-001)
**Database:** Turso (libsql, edge-replicated SQLite) — 97 models
**AI:** CIRKLE Brain AI — 9+1 phases + 135 external data sources
**Languages:** 17 locale packs (Egyptian Arabic, Formal Arabic, English, French, Spanish, Turkish, Urdu, Hindi, Chinese, Japanese, Italian, German, Russian, Portuguese, Indonesian, Korean, Persian)

---

## Table of Contents

**Part I: Executive Vision & Core Commitments**
**Part II: CIRKLE Brain AI — 9+1 Phase Cognitive Architecture**
- Chapter 1: Constitutional Foundation
- Chapter 2: Phase 1 — GCIE
- Chapter 3: Phase 2 — PMB
- Chapter 4: Phase 3 — CRIE
- Chapter 5: Phase 4 — IRDE
- Chapter 6: Phase 4.5 — Shared Cognitive Foundation
- Chapter 7: Phase 5 — UOB
- Chapter 8: Phase 6 — TEE
- Chapter 9: Phase 7 — LIEE
- **Chapter 10: Phase 7.5 — AIKE (NEW — Autonomous Intelligence & Knowledge Engine)**
- Chapter 11: Phase 8 — CIE
- Chapter 12: Phase 9 — TGSE

**Part III: Platform Extension Frameworks**
- Chapter 13: PCPF
- Chapter 14: AHG
- Chapter 15: Open Mini App Platform

**Part IV: Platform Modules & Features**
- Chapter 16: Home Dashboard
- Chapter 17: Wasl (Chat)
- Chapter 18: Mashahd (Video)
- Chapter 19: Lamahat (Photos)
- Chapter 20: Midan (Square)
- Chapter 21: The Circle (Groups)
- Chapter 22: Official Channels
- Chapter 23: Educational Workspaces
- Chapter 24: Creator Channels
- Chapter 25: Professional Network
- Chapter 26: Circle Pay
- Chapter 27: Circle Travel (Rihla)
- Chapter 28: Circle Mail
- Chapter 29: Circle ID (OIDC)
- Chapter 30: Social Feed
- Chapter 31: Unique Features
- Chapter 32: Citizen Shield (EXPANDED)

**Part V: Zero-Cost Architecture & Infrastructure**
- Chapter 33: Zero-Cost Technical Architecture
- Chapter 34: Local Mesh Offline Network
- Chapter 35: Circle Verify
- Chapter 36: AI Safety & Moderation
- Chapter 37: Self-Learning AI Core
- Chapter 38: Zero-Cost Mapping Stack
- Chapter 39: Universal Translation Layer
- Chapter 40: Data Backup & Recovery
- Chapter 41: Privacy, Consent & Identity
- Chapter 42: Community Governance

**Part VI: News & Intelligence (NEW)**
- Chapter 43: News Orchestrator — 5-Source Pipeline
- Chapter 44: External Data Source Registry — 135 Sources

**Part VII: Internationalization (NEW)**
- Chapter 45: 17-Language Locale System

**Part VIII: Security & Trust (EXPANDED)**
- Chapter 46: E2EE Service Abstraction
- Chapter 47: OIDC Provider
- Chapter 48: Anonymous Identity System

**Part IX: Creative Social Features (10 modules) [NEW in v16.0]**
- Chapter 49: Smart Compose (كتابة ذكية)
- Chapter 50: Social Rituals (طقوس اجتماعية)
- Chapter 51: Social Analytics (تحليلات اجتماعية)
- Chapter 52: Smart Notifications (إشعارات ذكية)
- Chapter 53: Cross-Module Sharing Hub (مشاركة عبر الوحدات)
- Chapter 54: Connection Graph (خريطة العلاقات)
- Chapter 55: Content Calendar (تقويم المحتوى)
- Chapter 56: Mood Engine (محرّك المزاج)
- Chapter 57: Social Challenges (تحدّيات اجتماعية)
- Chapter 58: AI Content Discovery (اكتشاف المحتوى)

**Part X: Production Hardening & Rollback Protection [NEW in v16.0]**
- Chapter 59: Input Validation (zod)
- Chapter 60: Rate Limiting
- Chapter 61: Error Monitoring
- Chapter 62: Error Boundaries
- Chapter 63: API Smoke Tests
- Chapter 64: 3-Layer Rollback Protection

**Part XI: Monetization & Business Model**
**Part XII: Technology Stack & Infrastructure**
**Part XIII: Deployment & Self-Hosting**
**Part XIV: Gap Analysis Summary (v12.0 → v16.0)**
**Appendices**

---

# Part I: Executive Vision & Core Commitments

## 1.1 Overview

CIRKLE (Arabic: Dawayer دوائر) is a privacy-first, AI-native social operating system that replaces a dozen standalone apps — WhatsApp, YouTube, Instagram, Twitter/X, LinkedIn, Facebook, Booking.com, Gmail, Google Maps, and more — with a single, open-source, offline-first web application powered by a proprietary 9+1 phase AI Operating System called CIRKLE Brain AI.

## 1.2 Platform Statistics (v16.0)

| Metric | v15.0 | v16.0 | Delta |
|---|---|---|---|
| API Routes | 233 | **237** | +4 |
| Prisma Models | 97 | **97** | — |
| Lib Modules | 254 | **262** | +8 |
| Screens | 8 | **8** | — |
| Overlays | 65 | **71** | +6 |
| Mini-Services | 3 | **3** | — |
| AI Phases | 9 + 4.5 + 7.5 | **9 + 4.5 + 7.5** | — |
| AIKE Modules | 22 + 15 trainers | **22 + 15 trainers** | — |
| External Data Sources | 135 | **135** | — |
| Locale Packs | 17 | **17** | — |
| Registered Capabilities | 45+ | **45+** | — |
| Countries Modeled | 246 | **246** | — |
| Database | Turso (libsql) | **Turso (libsql)** | — |
| ADRs | 3 | **3** | — |
| Docs | 12 | **13** | +1 |
| Backups | 1 | **2** | +1 |
| Lint Errors | 0 | **0** | — |
| Commit | 0a676ed | **763e03c** | rolled forward |
| Production-stable Tag | — | **production-stable-2026-08-12** | NEW |

> **Note on the overlays / API-route restatement:** the v15.0 doc stated "103 overlays / 231 API routes", but the actual `overlay-registry.ts` baseline at the v15 cut was 65 overlays and the route count was 233. v16.0 restates the v15.0 column to those true baselines so the +6 / +4 deltas reflect the real work shipped under CREATIVE-1 + CREATIVE-2 (3+3 overlays) and the four new creative-social API routes (rituals, share/cross-module, mood, challenges).

## 1.3 Core Promises (Unchanged from v12.0)

1. $0 Developer Cost
2. User Data Stays on Device
3. No Billing Details Required
4. 100% Free for All Users
5. Global Compliance Out of the Box
6. Absolute Privacy by Default
7. Offline-First & Mesh-Native
8. AI-Native with Zero Data Leakage
9. Self-Healing Platform (AHG)

---

# Part II: CIRKLE Brain AI — 9+1 Phase Cognitive Architecture

## Pipeline

```
User Goal → GCIE → PMB → CRIE → IRDE → Phase 4.5 → UOB → TEE → LIEE
At every stage: TGSE validates + governs + audits
Throughout: CIE supplies ecosystem knowledge
NEW: AIKE (Phase 7.5) — autonomous learning + knowledge graph + world state
Extension: PCPF enables modular capability packs
Self-healing: AHG auto-diagnoses and fixes
```

## Chapter 2: Phase 1 — GCIE (Geo-Context Intelligence Engine)
- File: `src/lib/location-intelligence.ts` (626 lines)
- Owns: Places, Events, Weather, Traffic, Nearby Search
- Providers: OSM (free, no API key)
- Knowledge Graph: 246 countries, 1766 payment methods, 1200 news sources

## Chapter 3: Phase 2 — PMB (Personal Memory Brain)
- File: `src/lib/personal-memory-brain.ts` (463 lines)
- 13 memory categories, 4 privacy levels, 5-stage lifecycle
- Memory graph (GraphNode + GraphEdge)

## Chapter 4: Phase 3 — CRIE (Context & Reasoning Intelligence Engine)
- File: `src/lib/crie-engine.ts` (649 lines)
- 15 intent types, 5 decision types, UnifiedContext fusion

## Chapter 5: Phase 4 — IRDE (Intelligent Recommendation & Decision Engine)
- File: `src/lib/irde-engine.ts` (593 lines)
- 12+ scoring factors, 6 domains, 9 feedback types

## Chapter 6: Phase 4.5 — Shared Cognitive Foundation
- 6 modules: shared-context, context-manager, capability-registry, capability-seed, cognitive-pipeline, index
- 11 context sections, 10 lifecycle APIs, 45+ registered capabilities

## Chapter 7: Phase 5 — UOB (Universal Orchestration Brain)
- 12 modules, 16-stage planning pipeline
- Wired: UOB→TGSE (governance), UOB→CIE (country filtering)

## Chapter 8: Phase 6 — TEE (Trusted Execution Engine)
- 11 modules, 13-stage execution pipeline, 10-state FSM
- Wired: TEE→TGSE (runtime governance), TEE→LIEE (learning loop closed)
- 5 live executors + 37 simulated executors

## Chapter 9: Phase 7 — LIEE (Learning & Intelligence Evolution Engine)
- 9 modules, 7-stage learning pipeline
- 6 feedback pipelines, 9 pattern types, 9 proposal targets
- Governance: propose → review → approve → deploy → rollback
- Auto-Apply: approved proposals can auto-apply to phase engines

## Chapter 10: Phase 7.5 — AIKE (Autonomous Intelligence & Knowledge Engine) **[NEW — NOT IN v12/v14]**

### Overview
AIKE sits between LIEE (Phase 7) and CIE (Phase 8). It transforms the Brain from a reactive assistant into a continuously self-learning digital ecosystem.

### 20 Core Modules (`src/lib/autonomous-intelligence/`)

| Module | Purpose |
|---|---|
| knowledge-graph.ts | Global KG: 24 node types, 26 edge types |
| knowledge-acquisition.ts | Discovers from 17 trusted source types |
| knowledge-gap-detector.ts | Detects gaps from low-confidence responses |
| knowledge-validator.ts | Multi-source validation, never trusts one source |
| knowledge-freshness.ts | TTL-based expiration + auto-refresh |
| trust-ranking.ts | Source authority scoring (0-100) |
| event-learning-engine.ts | Consumes every platform event (30+ event types) |
| experience-replay.ts | Learns user JOURNEYS (not clicks) |
| cross-module-intelligence.ts | Flight booked → predict hotels, weather, transport |
| prediction-engine.ts | Predicts next destination, restaurant, payment, etc. |
| semantic-memory-builder.ts | Concept hierarchies + 64-dim embeddings |
| domain-learning-engine.ts | Coordinates 15 domain trainers |
| world-state-engine.ts | 19 world metrics (weather, traffic, currency...) |
| research-scheduler.ts | Autonomous priority-queue research |
| capability-learning.ts | Discovers new APIs, models, integrations |
| provider-learning.ts | Evaluates 5 AI providers, auto-routes to best |
| learning-orchestrator.ts | Master orchestrator (runs continuously) |
| training-pipeline.ts | Nightly 14-step training pipeline |
| model-evaluator.ts | Accuracy/precision/recall/F1 evaluation |
| knowledge-compression.ts | Archives old facts, merges similar nodes |

### 15 Domain Trainers (`src/lib/autonomous-intelligence/trainers/`)

travel, payments, messaging, feed, maps, shopping, government, health, jobs, creator, circle, mail, identity, education, media

Each trainer maintains: facts, patterns, recommendation model, prediction model, ranking, confidence, freshness.

### AIKE Data Sources (135 configs across 22 categories)

1. World Knowledge (Wikipedia, Wikidata, DBpedia, Common Crawl, OpenAlex, Internet Archive)
2. Places & Geographic (OSM Planet, GeoNames, Natural Earth, OpenAddresses, Overpass)
3. Travel (IATA, GTFS, Wikivoyage, OpenFlights, OpenTripMap)
4. Events (Eventbrite, Meetup, OpenAgenda, gov portals)
5. Restaurant (OSM, OpenMenu, OpenFoodFacts)
6. Weather (Open-Meteo, NOAA, ECMWF, NASA Earth Data)
7. Traffic (OSRM, Valhalla, OpenRouteService, OpenTraffic)
8. Local Business (OpenCorporates, Google schemas, registries)
9. AI Safety (Civil Comments, Jigsaw, HateXplain, Detoxify, LAION, OpenAI)
10. Image Understanding (LAION, COCO, Open Images, LVIS, Visual Genome, Conceptual Captions)
11. OCR (IAM, SynthText, DocLayNet, RVL-CDIP)
12. Face Recognition (VGGFace2, MS1M, CASIA, InsightFace — privacy-gated)
13. Voice (Mozilla Common Voice, LibriSpeech, VoxCeleb, FLEURS)
14. Translation (NLLB, OPUS, CCMatrix, FLORES, MADLAD)
15. Search (MS MARCO, BEIR, MTEB, Natural Questions, HotpotQA)
16. Recommendation (MovieLens, Amazon Reviews, GoodBooks, LastFM, RetailRocket)
17. Knowledge Graph (Wikidata, ConceptNet, WordNet, YAGO, Schema.org, Freebase)
18. Government Data (data.gov, data.europa.eu, data.gov.uk, data.gov.eg + 246 countries)
19. Research Papers (arXiv, Semantic Scholar, OpenAlex, CrossRef, PubMed, Papers With Code)
20. Software Knowledge (GitHub, GitLab, HuggingFace, PyPI, npm, Rust Crates, Docker Hub, K8s, Flutter, Matrix, ActivityPub)
21. AI Models (CLIP, Whisper, SAM, Qwen, Llama, Gemma, Phi, Mistral, ONNX, sentence-transformers)
22. Documentation Library (Matrix, ActivityPub, OIDC, OSM, Flutter, Dart, PostgreSQL, SQLite, IPFS, libp2p, PeerTube, Mailcow, NTFY, ONNX, K8s, Docker, OpenAPI, GraphQL)

## Chapter 11: Phase 8 — CIE (Capability Intelligence Engine)
- 12 modules, 246 countries, 1766 payment methods, 8 government services, 12 partners

## Chapter 12: Phase 9 — TGSE (Trust, Governance & Safety Engine)
- 12 modules, 9-stage validation pipeline, 10 policies, 4 compliance profiles
- 8 AI safety checks, 7 risk types × 5 levels, 10 trust-scored entities

---

# Part III: Platform Extension Frameworks

## Chapter 13: PCPF (Platform Capability Pack Framework)
- 10 modules, 3 sample packs (travel, payments, government)
- Pack lifecycle: install → upgrade → deprecate → rollback → remove

## Chapter 14: AHG (Account Health Guardian)
- 5 modules, 11 problem types, auto-diagnosis + auto-fix with consent

## Chapter 15: Open Mini App Platform
- `/api/mini-apps/register` + `/api/mini-apps/list`
- 6 built-in apps + open registration

---

# Part IV: Platform Modules & Features

## Chapter 16: Home Dashboard **[UPDATED]**
- Collapsible sections (26 toggleable via Customize Dashboard)
- Default visible: 5-6 sections (greeting, composer, For You, Citizen Shield, News)
- Facebook-style composer ("What's on your mind?")
- Trending Now section (Twitter-style)
- Sponsored Banner (city-level, non-targeted)
- Upcoming in Your Circles
- Error boundaries per screen
- Loading skeletons (HomeSkeleton, WaslSkeleton, NewsSkeleton)
- 3-step registration (was 6 in v12)
- 5-tab dock + More sheet (was 8 tabs)

## Chapter 17: Wasl (Chat) **[UPDATED]**
- 3,510 lines — most polished screen
- Conversation previews with last message + unread badges
- Typing indicators, message status (sent/delivered/read)
- E2EE service abstraction (`src/lib/e2ee-service.ts`)
- Server stores ONLY ciphertext (body=null, ciphertext=blob)
- Device key publishing via `/api/e2ee/keys`
- Ghost Mode, screenshot protection, forwarding consent
- Socket.io mini-service (port 3003)

## Chapter 18: Mashahd (Video)
- 2,381 lines, YouTube-competitive
- Thumbnail grid with view counts, duration, like ratio
- Live badge, watch progress bar
- P2P video abstraction (`src/lib/video-service.ts`)
- Bullet comments (Danmaku), watch parties

## Chapter 19: Lamahat (Photos) **[EXPANDED]**
- 1,748 lines (was 433 in v14)
- Stories (ephemeral 24h + full-screen viewer)
- Collections (curated albums)
- Memories ("On this day")
- Improved Discovery (search + sort + 7 filters)
- Masonry grid with featured cards + infinite scroll
- Moments (permanent posts with engagement)
- Nearby photo discovery (geohash-based)

## Chapter 20: Midan (Square) **[EXPANDED]**
- 1,811 lines, Twitter-competitive
- Compose CTA ("What's happening?")
- Trending Now rail, enhanced post cards
- Anonymous posting (`src/lib/anonymous-identity.ts`)
  - Per-Circle pseudonyms, no server-side identity mapping
  - API sets authorId=null
- Privacy controls: hide online, block screenshots, reply controls
- Sponsored hashtags (city-level)

## Chapter 21: The Circle (Groups) **[EXPANDED]**
- Circle creation wizard (5-step: Basics → Visibility → Category → Invite → Settings)
- Circle detail (4 tabs: Feed, Members, Events, Settings)
- Events calendar with RSVP
- Member directory with role management
- Join requests (private circles)
- Audit log
- Prisma: CircleGroup, CircleMember, CircleEvent, EventRSVP, CircleJoinRequest, CircleAuditLog

## Chapter 22: Official Channels
- Government, Business, NGO, Media, Emergency types
- 4 emergency alert levels
- Push notifications

## Chapter 23: Educational Workspaces
- Multi-audience rooms (students, parents, staff)
- Assignments, grades, attendance
- CSV upload + auto-provisioning

## Chapter 24: Creator Channels
- Subscriptions, playlists, live streaming
- Tips & virtual gifts (non-custodial)
- Tipping service (`src/lib/tipping-service.ts`) — country-aware methods
- Affiliate tracking (`src/lib/affiliate-service.ts`)

## Chapter 25: Professional Network
- Job postings (free for employers)
- Salary insights, endorsements
- "Open to Work" badge

## Chapter 26: Circle Pay **[EXPANDED]**
- 1,074 lines, PayPal-competitive
- 3D tilt balance card
- Spending chart (7-day CSS bar chart)
- Category donut (CSS conic-gradient)
- Quick stats (This Week / This Month / Total Saved)
- Smart AI insight (tone-adaptive, week-over-week comparison)
- Enhanced transaction cards
- QR code payments, NFC tap-to-pay
- Country-aware payment methods

## Chapter 27: Circle Travel (Rihla)
- 3,334 lines, Booking-competitive
- Destination cards with prices + ratings
- Hot deals with live countdown
- Trending destinations (region-aware)
- AI Travel Insights (Brain AI)
- Flight/hotel search, itinerary builder
- Document vault, expense tracker, cultural intel

## Chapter 28: Circle Mail **[UPDATED]**
- Mail service abstraction (`src/lib/mail-service.ts`)
- Spam classification (keyword filter, ONNX upgrade path)
- 5 folders: Inbox, Sent, Drafts, Spam, Trash
- Search + pagination

## Chapter 29: Circle ID (OIDC) **[NEW — NOT IN v12/v14]**
- `src/lib/oidc-provider.ts` (900 lines) — standards-compliant OIDC
- `src/lib/oidc-client.ts` (580 lines) — browser-side RP helper
- Authorization Code Flow + PKCE
- JWKS endpoint, discovery endpoint
- RS256-signed ID tokens
- Scopes: openid, profile, email, circle.verify.over_18, circle.verify.nationality
- Dynamic client registration (RFC 7591)
- Token revocation (RFC 7009), introspection (RFC 7662)
- Consent management
- 8 API routes + 3 Prisma models (OidcClient, OidcSession, OidcConsent)

---

# Part V: Zero-Cost Architecture & Infrastructure

## Chapter 33: Zero-Cost Technical Architecture **[UPDATED]**
- Platform: Next.js 16 (App Router, Turbopack) — Web-first PWA (ADR-001)
- Database: Turso (libsql, edge-replicated SQLite) — 97 models
- AI Providers: 5 (Groq, Gemini, OpenRouter, HuggingFace, OpenAI) — ZAI removed
- Real-time: Socket.io mini-services (ports 3001, 3003, 3004)
- Deployment: Vercel + GitHub + Turso
- **v16.0 note:** `next.config.ts` `eslint` key removed (was emitting Next.js 16 build warnings during the production deploy). Lint still runs via `bun run lint` in CI.

## Chapter 34: Local Mesh Offline Network **[UPDATED]**
- `src/lib/mesh-network.ts` — WebRTC DataChannel transport (per ADR-001)
- Uses chat-service (port 3003) as signaling relay
- All payloads encrypted via E2EE
- IndexedDB queue for offline delivery
- Server is opinion-free: only relays opaque SDP/ICE blobs

## Chapter 35: Circle Verify
- Scan ID, liveness detection, face matching, attestation
- 6 verifiable claims (over 18, over 21, nationality, unique person, professional licence, student)

## Chapter 36: AI Safety & Moderation **[UPDATED]**
- Moderation queue (`src/lib/moderation-service.ts`)
- Flag → review → approve/remove/blur → appeal
- On-device NSFW deferred (ADR-003 — ONNX Runtime Web approved)
- Prisma: ModerationFlag, ModerationAppeal

## Chapter 37: Self-Learning AI Core **[UPDATED]**
- LIEE (Phase 7) + AIKE (Phase 7.5) replace the v12 self-learning section
- 6 feedback pipelines, 9 pattern types, auto-apply with governance

## Chapter 38: Zero-Cost Mapping Stack
- OSM providers, geocoding, routing
- Self-hosted TileServer GL deferred (P2.8)

## Chapter 39: Universal Translation Layer **[UPDATED]**
- `src/lib/translation-service.ts` — service abstraction
- Provider chain: on-device (ONNX NLLB-200 stub) → server → fallback
- RTL detection, batch translation, 10-min cache
- 17 locale packs with full RTL support

## Chapter 40: Data Backup & Recovery **[UPDATED]**
- IPFS storage abstraction (`src/lib/storage-service.ts`)
- CID generation (SHA-256), pin/unpin
- Small files → localStorage, large → server
- Offline content stash (`src/lib/offline-stash.ts`)
- Family Vault (real AES-256-GCM + PBKDF2)
- Decentralised ticketing (real Ed25519 signing)

## Chapter 41: Privacy, Consent & Identity **[UPDATED]**
- E2EE service (`src/lib/e2ee-service.ts`) — P-256 ECDH + AES-256-GCM
- Server NEVER receives plaintext message content
- Anonymous identity (`src/lib/anonymous-identity.ts`) — per-Circle pseudonyms
- Consent management (8 granular purposes)
- Privacy dashboard, DSR, data export, account deletion

## Chapter 42: Community Governance **[UPDATED]**
- `src/lib/governance-service.ts` — proposals, voting, appeals, jury
- 4 Prisma models: GovernanceProposal, GovernanceVote, ModerationAppeal, AppealVote
- Wired to governance-center.tsx overlay

---

# Part VI: News & Intelligence **[NEW — NOT IN v12/v14]**

## Chapter 43: News Orchestrator — 5-Source Pipeline

`src/lib/news-orchestrator.ts`

Pipeline (8 stages):
1. Check cache (10-min TTL)
2. Run all 5 sources IN PARALLEL:
   - Tier 0: Google News RSS — FREE, no API key, 246 countries, real article URLs
   - Tier 1: OpenRouter (`:online`) — web search
   - Tier 2: Gemini (grounding) — Google Search
   - Tier 3: Groq — fast Arabic + English generation
   - Tier 4: HuggingFace — fallback generation
3. Web scraping: fetch + parse article content from URLs
4. Merge + deduplicate
5. Enrich with scraped content
6. Cache results
7. Return articles

Features:
- 246 countries supported
- Web search (Google RSS + OpenRouter `:online`)
- Web scraping (fetch URL + extract title/content)
- Cross-evaluation: all providers run in parallel
- Static fallback when all providers fail
- Arabic + English support
- Category-aware (breaking, local, world, sports, economy, tech, health, entertainment)

## Chapter 44: External Data Source Registry — 135 Sources

`src/lib/autonomous-intelligence/data-sources/`

- 25 TypeScript files
- 135 data source configs across 22 categories
- Knowledge Source Registry with trust scoring, availability tracking
- Integrates with AIKE trust-ranking + knowledge-acquisition + research-scheduler
- API: `/api/aike/sources` — registry stats + source queries

---

# Part VII: Internationalization **[NEW — NOT IN v12/v14]**

## Chapter 45: 17-Language Locale System

`src/lib/locale-packs/` + `src/lib/i18n-loader.ts`

| # | Language | Code | dir | Countries |
|---|---|---|---|---|
| 1 | Egyptian Arabic | ar | rtl | Egypt ONLY |
| 2 | Formal Arabic (MSA) | ar-formal | rtl | SA, AE, QA, KW, OM, BH, YE, IQ, JO, LB, SY, PS, LY, TN, DZ, MA, MR, SD, SS, DJ, SO, KM, EH |
| 3 | English | en | ltr | US, UK, AU, NZ, IE, ZA, NG, KE, GH, UG, TZ, ZW, ZM, BW, GM, SL, LR, NA, MW, LS, SZ, BB, JM, TT, BS, BZ, GY, IS, MT, PH |
| 4 | French | fr | ltr | FR, BE, LU, MC, CD, CG, CI, BF, ML, SN, GN, BJ, TG, NE, CM, GA, TD, CF, BI, RW, MG, VU, CA, CH, HT |
| 5 | Spanish | es | ltr | ES, MX, AR, CO, CL, PE, VE, UY, PY, BO, CR, CU, DO, EC, SV, GT, HN, NI, PA, PR, GQ |
| 6 | Turkish | tr | ltr | TR, CY, AZ, TM, UZ, KZ, KG |
| 7 | Urdu | ur | rtl | PK |
| 8 | Hindi | hi | ltr | IN, NP, FJ |
| 9 | Chinese | zh | ltr | CN, HK, TW, SG, MO |
| 10 | Japanese | ja | ltr | JP |
| 11 | Italian | it | ltr | IT, SM, VA |
| 12 | German | de | ltr | DE, AT, LI |
| 13 | Russian | ru | ltr | RU, BY |
| 14 | Portuguese | pt | ltr | BR, PT, AO, MZ, GW, TL, CV, ST |
| 15 | Indonesian | id | ltr | ID |
| 16 | Korean | ko | ltr | KR, KP |
| 17 | Persian | fa | rtl | IR, AF, TJ |

Country mapping rules:
- Egypt (EG) → ar (Egyptian colloquial: صباح الفل، دوّر، ابعت)
- All other Arab countries → ar-formal (MSA: صباح الخير، ابحث، إرسال)
- Accept-Language: ar-EG → ar, ar-SA → ar-formal
- RTL: ar, ar-formal, ur, fa (4 RTL languages)
- Each pack: 317 keys across 21 sections

---

# Part VIII: Security & Trust **[EXPANDED]**

## Chapter 46: E2EE Service Abstraction **[NEW]**
- `src/lib/e2ee-service.ts` (640 lines)
- P-256 ECDH + AES-256-GCM (forward secrecy within session)
- Server stores ONLY ciphertext (body=null on Message model)
- Device key publishing via `/api/e2ee/keys` (public keys only)
- Upgrade path: libolm WASM (ADR-002 approved)
- Wire format: `EncryptedEnvelope { v:1, alg:"webcrypto-p256-aesgcm" }`

## Chapter 47: OIDC Provider **[NEW]**
- Full OIDC implementation (see Chapter 29)
- Runs alongside existing auth (no big-bang migration)
- RS256 JWT signing, PKCE, dynamic client registration

## Chapter 48: Anonymous Identity System **[NEW]**
- `src/lib/anonymous-identity.ts` (265 lines)
- Per-Circle pseudonym generation (localStorage only)
- Format: `anonymous-{word}-{number}` (e.g., "anonymous-falcon-42")
- No server-side identity mapping
- API accepts anonymousId, sets authorId=null

---

# Part IX: Creative Social Features (10 modules) **[NEW in v16.0]**

> The 10 features in this Part were shipped under task IDs **CREATIVE-1** (Smart Compose, Social Rituals, Social Analytics, Smart Notifications, Cross-Module Share) and **CREATIVE-2** (Connection Graph, Content Calendar, Mood Engine, Social Challenges, AI Content Discovery). All 10 are additive — no existing features were removed, no protected systems (Brain AI, `proxy.ts`, OIDC, E2EE, auth, Prisma schema) were touched. All overlays are registered in `src/lib/overlay-registry.ts` so they surface in both the OverlayBrowser grid and the ⌘K CommandPalette.

## Chapter 49: Smart Compose (كتابة ذكية) **[NEW]**

- **Files:** `src/components/overlays/smart-compose.tsx` (overlay); dispatches `circle:smart-compose`.
- **Pain solved:** Composers in every module (Midan/Lamahat/Mashahd/Wasl) used to be siloed. Users had to retype the same idea into 4 different surfaces to cross-post. Quality was a guessing game; nobody knew whether a post would land until they hit publish.
- **What it does:** A single unified composer that supports Text / Photo / Video / Poll / Thread modes. An AI Content Coach gives a 1–10 quality score plus contextual tips ("add a hook", "trim to 220 chars for Wasl"). A cross-module selector lets the user pick which of Midan / Lamahat / Mashahd / Wasl to publish to in one flow. A privacy selector (public / friends / private / anonymous) is wired through to every target module. AI suggests hashtags and emojis. Char-count + optimal-length indicator per selected module. Drafts persist to localStorage. A "Schedule for later" picker queues the post for the optimal time slot.
- **Key design decisions:**
  - AI Content Coach is a pure heuristic (length, structure, media, hashtags) — no external LLM call, so it works offline.
  - Cross-module publish fans out via the Cross-Module Sharing Hub (Chapter 53) — one dispatch, per-module transformers.
  - Privacy selector reuses the same `privacy` union that existing /api/posts accepts, so the server contract is unchanged.
  - Draft key is namespaced per module target so a half-finished Midan draft doesn't leak into a Wasl draft.
- **Accessibility & privacy:** Full focus-trap inside `OverlayShell`, Esc-to-close, ARIA labels on every mode toggle. Drafts are local-only — never uploaded. Scheduled posts stay in localStorage until the scheduled time, at which point the publish fires through the normal per-module create endpoints.

## Chapter 50: Social Rituals (طقوس اجتماعية) **[NEW]**

- **Files:** `src/lib/social-rituals.ts` (pure lib); `src/app/api/rituals/route.ts` (GET today's ritual + streak; POST records participation).
- **Pain solved:** New users had no "reason" to open the app on day 3. Existing engagement loops were all reactive (reply to a notification). There was no proactive daily nudge.
- **What it does:** 28 bilingual (Arabic + English) daily prompts spread across four time-of-day slots — morning (5–11:59), afternoon (12–16:59), evening (17–4:59), and weekend (Friday + Saturday, the Arab weekend). Each ritual has a `suggestedMedia` hint (photo / video / text). A streak counter tracks consecutive-day participation, longest streak, and total participation count — all in localStorage.
- **Key design decisions:**
  - 7 rituals per slot × 4 slots = 28 total. Pool index = `((dayOfYear + year × 7) % pool.length + pool.length) % pool.length` → deterministic per-day, no repeats within a single calendar week, wraps cleanly across years.
  - Slot detection is local-server-time based; Friday + Saturday override to `weekend` to match the Arab work week.
  - Streak logic is idempotent: same-day participation never increments the counter twice. Yesterday's participation → `current += 1`; today's → unchanged; otherwise reset to 1. `longest = max(longest, current)`; `total += 1` every participation.
  - The server returns `serverTime` so the client can compute "time until next ritual" without clock-skew bugs.
- **Accessibility & privacy:** Arabic + English prompts are stored verbatim in the lib, not generated — so they work offline and never leak the user's identity to an LLM. Participation records never leave the device (localStorage only).

## Chapter 51: Social Analytics (تحليلات اجتماعية) **[NEW]**

- **Files:** `src/components/overlays/social-analytics.tsx`; dispatches `circle:social-analytics`.
- **Pain solved:** Creators had no visibility into which posts landed, when to post, or which module was their strongest. Third-party analytics tools cost money and require API access.
- **What it does:** Personal engagement dashboard. Weekly stats with week-over-week deltas (followers, impressions, engagement rate, reach). Best posting time (computed from the user's own post history). Top post card. CSS-bar growth chart (no chart library — pure divs with `width: %`). Module breakdown bars (Midan / Lamahat / Mashahd / Wasl). Audience insights (top countries + age brackets). AI Insight card with one actionable tip per week.
- **Key design decisions:**
  - Pure CSS bars instead of Recharts/Chart.js — keeps the overlay bundle small and avoids a hydration mismatch risk on the chart axis.
  - Growth chart is rendered as 7 vertical bars (one per day of the week) with the highest day normalised to 100% — readable at a glance, no axis labels needed.
  - "Best posting time" is computed from the user's actual post engagement (hourly bucket → median engagement), not from a global average — so it adapts to each creator's audience.
  - AI Insight card is a templated string (no LLM call) — fast, free, offline-friendly.
- **Accessibility & privacy:** All stats are mock-seeded from the user's own posts + follow graph — no third-party analytics SDK, no cross-site tracking. Bars have `role="img"` + `aria-label` with the absolute numbers.

## Chapter 52: Smart Notifications (إشعارات ذكية) **[NEW]**

- **Files:** `src/components/overlays/smart-notifications.tsx`; dispatches `circle:smart-notifications`.
- **Pain solved:** Notification fatigue. The raw notification stream was a flat chronological list — 50 unread items, no prioritisation, no way to snooze a whole thread.
- **What it does:** AI-grouped notifications by intent (e.g., "3 people replied to your Midan post", "2 new circle invites"). Three priority levels — Urgent (red), Important (gold), Normal (slate). Smart snooze by `groupKey` (1-hour default). Batch actions (mark all read, clear all in a group). Filter by type (mentions / follows / replies / likes / system). Per-type preferences panel (toggle each category on/off).
- **Key design decisions:**
  - Grouping key (`groupKey`) is derived from `{type, targetId}` — so all "likes on post X" collapse into one row regardless of who liked.
  - Snooze stores `snoozedUntil: ISO` per `groupKey` in component state + localStorage — a snoozed group hides until the timer expires, then re-surfaces with the new count.
  - Batch actions use a single mutation, not per-item — so marking 50 notifications read is one round-trip, not 50.
  - Per-type prefs persist to localStorage so the user's "mute all likes" choice survives a reload.
- **Accessibility & privacy:** Snooze + filter buttons all have `aria-pressed` reflecting their state. Mobile-specific batch-action row collapses below the filter bar on narrow viewports. No notification content ever leaves the device — grouping is done client-side from the existing `/api/notifications` payload.

## Chapter 53: Cross-Module Sharing Hub (مشاركة عبر الوحدات) **[NEW]**

- **Files:** `src/lib/cross-module-share.ts` (pure lib); `src/app/api/share/cross-module/route.ts` (POST validates + dispatches to per-module endpoints in parallel).
- **Pain solved:** Cross-posting was manual. A user who shot a video had to open Mashahd, paste the title, then open Midan, type a caption, then open Wasl, summarise — three flows for one piece of content.
- **What it does:** One POST to `/api/share/cross-module` with a `ShareContent` payload (text, photos, video, caption, hashtags, link, privacy) fans out to any subset of Midan / Lamahat / Mashahd / Wasl. Per-module transformers produce format-appropriate payloads (Midan: full text + hashtags + first photo; Lamahat: photo + 140-char caption; Mashahd: video + 80-char title + 500-char description; Wasl: 220-char summary + link, no hashtags). A heuristic suggests the best-fit modules (`getShareSuggestions`). `executeCrossModuleShare` dispatches to per-module APIs in parallel via `Promise.all`; per-module failures do NOT abort the others. 8-second per-module AbortController timeout.
- **Key design decisions:**
  - `getShareSuggestions` is a pure heuristic (no external AI call) — video → Mashahd ≥ 0.95; photo → Lamahat ≥ 0.9; long text → Midan ≥ 0.8; hashtags boost Midan; link + short text boosts Wasl. Runs synchronously.
  - Per-module timeouts are independent — a slow Mashahd upload doesn't block the Midan post from succeeding.
  - The response echoes the suggestions so the UI can show "we suggested Mashahd + Lamahat because you uploaded a video" even if the user overrode the suggestion.
  - `MODULE_META` constant maps each module to its create endpoint, so adding a new module is a one-line change.
- **Accessibility & privacy:** The hub never uploads content to a third party — it only routes to CIRKLE's own per-module endpoints. Privacy level (`public` / `friends` / `private` / `anonymous`) is passed through verbatim to every target module.

## Chapter 54: Connection Graph (خريطة العلاقات) **[NEW]**

- **Files:** `src/components/overlays/connection-graph.tsx`; dispatches `circle:connection-graph`.
- **Pain solved:** The follow graph was invisible. Users couldn't see who their mutuals were, which circles overlapped, or which creators they engaged with most. Suggested-connections algorithms on other platforms are opaque.
- **What it does:** Interactive SVG network graph with 10 nodes (the user at center + friends + creators + circles) and 18 edges (follow = solid slate, mutual-circle = dashed teal, shared-interest = dotted rose). Node radius scales with interaction frequency (8–36 px). Node color = module (Wasl=teal, Midan=gold, Lamahat=rose, Mashahd=steel, self=charcoal). Pointer-drag pan, wheel-zoom (bounded 0.5×–2.5×), dedicated zoom in/out/reset buttons for keyboard users. Click a node → contact card slides in with mutual circles, shared interests, location, follow + message CTAs. AI-suggested connections panel with reason strings ("In 2 of your circles · Same city (Cairo)"). Legend strip.
- **Key design decisions:**
  - Pure SVG (no D3, no third-party graph lib) — keeps the bundle small and the render deterministic.
  - Nodes positioned in normalised `[-1, 1]` space → mapped to a 600×600 viewBox with 60 px padding. This decouples layout math from render size.
  - Node radius = `8 + (weight / 100) * 28` — bounded so a high-frequency contact doesn't dwarf the rest of the graph.
  - Selected node highlights all connected edges (full opacity + thicker stroke); unconnected edges dim to 25% opacity. This makes "who is this person connected to" instantly readable.
- **Accessibility & privacy:** SVG nodes have `role="button"` + `tabIndex="0"` + Enter/Space handler, so keyboard users can traverse the graph. The graph is rendered from the user's own follow graph + interaction counts (already on-device) — no new data collection.

## Chapter 55: Content Calendar (تقويم المحتوى) **[NEW]**

- **Files:** `src/components/overlays/content-calendar.tsx`; dispatches `circle:content-calendar`.
- **Pain solved:** Posting was reactive — "post when I feel like it" — with no visibility into cadence, no best-time guidance, and no way to plan a week ahead without a separate calendar app.
- **What it does:** Monthly calendar grid (Mon–Sun) showing color-coded scheduled posts per module. Drag-and-drop reschedule (native HTML5 DnD — drop targets are day cells). Best-time indicators (gold dots at 08:00 / 12:00 / 17:30 / 19:00 / 20:00 / 21:00). Streak tracker: current / longest / days-since-last-post cards. AI hint banner ("You haven't posted in 3 days. Try sharing something in Midan."). Schedule-new sheet with module picker + time picker (with optimal-window hint) + title + notes. localStorage persistence; seed items on first open.
- **Key design decisions:**
  - Streak is computed from the items set, not from a separate counter — so dragging an item to a new day automatically updates the streak. Walk backwards from today (or yesterday if today is empty) counting consecutive days with at least one scheduled item. Longest streak walks the sorted dates forward.
  - AI hint has three states: ≥3 days idle, 0 streak with no idle, ≥5 streak — each with a different bilingual message.
  - Drag-and-drop uses native HTML5 DnD, not a JS library — keeps the bundle small and works on touch via the browser's polyfill.
  - Schedule-new sheet is a modal layered on top of `OverlayShell`. Click-outside dismisses; `stopPropagation` on the inner card prevents the dismiss handler from firing when interacting with the form.
- **Accessibility & privacy:** All scheduled items are stored locally — never uploaded. The calendar never sends a notification on its own; it's a planning surface, not a scheduler daemon. Drag-and-drop has keyboard equivalents (arrow keys to move, Enter to drop).

## Chapter 56: Mood Engine (محرّك المزاج) **[NEW]**

- **Files:** `src/lib/mood-engine.ts` (pure lib); `src/app/api/mood/route.ts` (GET derives mood from a client-supplied `MoodSignal`; POST accepts a richer signal body).
- **Pain solved:** Every feed was the same regardless of whether the user was killing time on the bus vs. winding down before bed. Algorithmic feeds on other platforms are opaque and ignore user state.
- **What it does:** Passively detects the user's current mood from observable signals — time of day, minutes since last active, messaging activity, long-form reads, scroll velocity, recent engagement, optional weather — and returns a feed config + a UI accent recommendation. Five moods: `energetic`, `relaxed`, `social`, `focused`, `bored`. Each mood returns a feed config with 4 module buckets + weights (summing to 1.0) + a per-bucket `filter` string passed through to the existing feed layer, plus flags for `preferShortForm` / `boostTrending` / `boostDiscover`. Each mood also returns a UI accent recommendation (`gold-bright`, `teal-soft`, `rose-warm`, `charcoal-deep`, `gold-warm`) with hex + gradient classes.
- **Key design decisions:**
  - 5 candidate moods scored in parallel; the highest-scoring candidate wins. Confidence = `max(0.5, 0.5 + margin/6)` — even a perfect tie returns 0.5 confidence since the tiebreaker is deterministic by CANDIDATES order (`energetic > relaxed > social > focused > bored`).
  - The signal is collected passively on the client (no UI prompt). The server endpoint accepts either a query-string `?signal=<JSON>` or a POST body, and falls back to `defaultSignalForNow` derived purely from the current hour if no signal is supplied.
  - All numeric inputs are clamped server-side so a malicious payload can't skew detection.
  - Each mood's 4 module buckets have weights summing to exactly 1.0 — so the feed algorithm can directly draw from each bucket proportional to weight, with the per-bucket `filter` string passed through verbatim.
- **Accessibility & privacy:** Mood detection is fully passive — no explicit user input, no survey. The signal never includes message content or post content, only aggregate counts + timing. The `weather` field is optional and user-supplied (or omitted).

## Chapter 57: Social Challenges (تحدّيات اجتماعية) **[NEW]**

- **Files:** `src/lib/social-challenges.ts` (pure lib); `src/app/api/challenges/route.ts` (GET this week's 5 challenges + progress + leaderboard + badges; POST records start/completion for a single challenge).
- **Pain solved:** Engagement dropped off after the first week. There was no recurring "event" that brought users back. Existing gamification (badges, streaks) was per-module, not cross-module.
- **What it does:** 25-challenge library (5 per module × 5 modules: Wasl / Midan / Lamahat / Mashahd / Rihla). Each challenge has a type (`photo` / `text` / `video` / `message` / `plan`), bilingual title + hint, an emoji, and an estimated completion time. Deterministic per-ISO-week rotation via `weekKeyForDate` + `seed = year * 100 + weekNum + per-module offset` → no challenge repeats within a 5-week window per module. localStorage-backed progress tracking (`recordProgress` is idempotent — calling it twice with `markCompleted=true` keeps the original `completedAt`). Four-tier badge system: Getting Started (1+), Halfway There (3+), Weekly Champion (4+), Perfect Week (5/5). Deterministic per-week leaderboard with the current user inserted at the correct rank by completed count; ties share a rank (standard competition ranking).
- **Key design decisions:**
  - ISO 8601 week key (`YYYY-Www`) computed via the standard Thursday-based algorithm — same key for the same Mon–Sun week anywhere in the world.
  - Pool rotation uses `seed = year * 100 + weekNum` plus a per-module offset (`i * 7`) so the same week doesn't always pick index 0 from every pool, and a 5-pool library means no challenge repeats within a 5-week window per module.
  - `recordProgress` is idempotent — calling it twice with `markCompleted=true` keeps the original `completedAt`. `startedAt` only set on the first `markStarted` call.
  - Leaderboard is deterministic per week key (hash → seed → completed counts) so the same week always returns the same names in the same order; the current user is inserted at the correct rank by their `completedCount`. Ties share a rank (standard competition ranking).
- **Accessibility & privacy:** Progress + leaderboard rankings are computed deterministically from the week key — no server-side per-user tracking of "who is winning". The leaderboard is a stylised roster of community members, not a real-time ranking of personal data.

## Chapter 58: AI Content Discovery (اكتشاف المحتوى) **[NEW]**

- **Files:** `src/components/overlays/content-discovery.tsx`; dispatches `circle:content-discovery`.
- **Pain solved:** Users ran out of content. The For-You feed was a single stream; there was no way to browse by intent ("show me new creators", "show me hidden gems", "show me what I posted a year ago").
- **What it does:** Two tabs: "For You mix" (single blended carousel across all modules) + "Browse sections" (5 carousels: Trending in your city / Because you engaged with… / New creators / Hidden gems [quality-scored 89–96, low-view] / Nostalgia [your posts from 1 year ago today]). "Surprise me" button → AI picks a random high-quality post in a spotlight view with a rationale banner. Per-card actions: Save / Share (Web Share API + clipboard fallback) / Follow. Discovery cards carry author avatar, module strip, engagement counts (K/M formatted), time-ago, optional city + seed-topic + quality-score badges.
- **Key design decisions:**
  - All sections are static module-level arrays (no per-render allocation) so the carousels don't re-trigger React renders.
  - The For-You mix is a curated blend across sections — picked at module-load time, then stable for the session.
  - "Surprise me" picks a random card from the deduped superset of all sections (excluding self-authored), shows it in a spotlight view with a rationale banner, and the user can either go back to discovery or click another "Surprise me" for a fresh roll.
  - Per-card state (saved / followed) is tracked in two `Set`s at the parent level so the state survives carousel re-renders. Toasts confirm every save / follow / share action.
- **Accessibility & privacy:** Carousels are horizontal scroll regions with `role="region"` + `aria-label`. The "Surprise me" button has `aria-live="polite"` so screen readers announce the new spotlight card. The Web Share API is used where available (mobile), with a clipboard fallback for desktop. No tracking pixels, no third-party recommendation SDK.

---

# Part X: Production Hardening & Rollback Protection **[NEW in v16.0]**

> This Part documents the production-readiness layer shipped under task ID **FIX-PRODUCTION** and the 3-layer rollback protection verified on 2026-08-12. The hardening layer is purely additive — every gate (validation, rate limit, error capture) wraps the existing handler logic without removing or rewriting it. Full details live in `/ROLLBACK_PROTECTION.md`.

## Chapter 59: Input Validation (zod) **[NEW]**

- **File:** `src/lib/api-validation.ts` (135 lines).
- **Surface:** `validateBody<T, R extends Request, Args>(schema, handler)` wraps an API route handler with zod body validation. On invalid JSON → 400 `{error:"invalid_json"}`. On validation failure → 400 `{error:"validation_failed", issues:[{path, message, code}]}`. On success → delegates to `handler(req, parsedData, ...rest)`. `validateQuery<T, R, Args>` does the same for URL search params (coerces all values to strings; use `z.coerce.number()` for non-string fields). Re-exports `z` from zod so callers can `import { validateBody, z } from "@/lib/api-validation"`. Generic over `R extends Request` so handlers typed with `NextRequest` compose without `strictFunctionTypes` contravariance errors. `ValidationIssue` + `ValidationFailure` exported types for client-side error rendering.
- **Applied to 5 critical routes:**
  1. `POST /api/conversations/[id]/messages` — schema mirrors the existing `PostBody` interface (all optional fields so E2EE-only / attachment-only / system-event-only messages still pass). Existing cross-field invariants (ciphertext OR body OR attachment required, 8 MB ciphertext cap, `replyToId` existence check, TTL ceiling) preserved verbatim. Handler signature changed from `(req, ctx)` to `validateBody(schema, async (req, body, ctx) => ...)`. `req.json()` call removed.
  2. `POST /api/posts` — `postCreateSchema` validates body / content / module / author* / visibility / tags / mediaKind / anonymousId with sensible max-length caps. `sendBeacon` tracking POSTs (empty body + tracking query params) bypass validation by checking query params first inside the rate-limited outer wrapper, then delegating to `validateBody`-wrapped `createPost` for the post-creation path. Original P1.6 anonymous-privacy covenant (no User FK linkage when `anonymousId` present) preserved.
  3. `POST /api/payments/send` — `paymentSendSchema` validates amount (coerced to number, positive, ≤1B), counterparty / to (1–100 chars), currency (1–10 chars), method (enum of 8 valid methods), memo (≤500 chars). Handler still re-checks amount positivity as defence in depth.
  4. `POST /api/news/search` — NEW POST handler added alongside the existing GET. `newsSearchSchema` validates `q` (1–200 chars, required), optional `country` (2 chars), optional `category` (≤40 chars). Existing GET preserved inside its own rate-limit wrapper.
  5. `POST /api/ai/translate` — `translateSchema` validates `text` (1–10k chars, required), optional `from` / `to` / `targetLang` (2–20 chars). Existing 200 ms delay + `aiComplete` 5-provider chain + fallback-to-input behaviour preserved.

## Chapter 60: Rate Limiting **[NEW]**

- **File:** `src/lib/api-rate-limit.ts` (129 lines).
- **Surface:** `withRateLimit<R extends Request, Args>(handler, options)` applies rate limiting before the handler runs. On limit exceeded → 429 `{error:"rate_limit_exceeded", retryAfter}` + `Retry-After` + `X-RateLimit-{Limit, Remaining, Reset}` headers. On success → calls handler and attaches the same headers to the response. `RateLimitOptions`: `{maxRequests, windowMs, keyBy?: "ip" | "userId", scope?}`. `keyBy:"userId"` reads `x-cirkle-user-id` header (set by authenticated proxy in prod) and falls back to IP when missing. `RATE_LIMIT_PRESETS` — convenience constants for `ai` (20/min), `newsSearch` (30/min), `posts` (10/min), `news` (60/min). Uses the existing `rateLimit`, `getClientIP`, `getRateLimitHeaders` functions from `src/lib/rate-limit.ts` — no new limiter implementation.
- **Applied to 4 endpoint groups:**
  - `POST /api/ai/{translate, summarize, smart-reply, itinerary, memoir}` — 20 req/min (AI is expensive). All 5 routes wrapped. Existing fallbacks (`FALLBACK_SUMMARY`, `FALLBACK_REPLIES`, `FALLBACK_MEMOIR`) preserved.
  - `GET /api/news/search` + new `POST /api/news/search` — 30 req/min.
  - `POST /api/posts` — 10 req/min (anti-spam). Wraps the combined tracking + `createPost` handler.
  - `GET /api/news` — 60 req/min. Existing orchestrator + `news-fallback` chain preserved.
- **Composition order:** `withRateLimit(validateBody(schema, handler), opts)` — rate limit runs first (cheap IP lookup) so over-limit callers never burn CPU on zod parsing.

## Chapter 61: Error Monitoring **[NEW]**

- **File:** `src/lib/error-monitoring.ts` (223 lines) + `src/app/api/monitoring/errors/route.ts`.
- **Surface:**
  - `captureError(error, context?)` — normalises any thrown value (Error / string / object) into `{message, name, stack}`, captures with `{id, timestamp, kind:"error", level:"error", message, name?, stack?, context?, url?, userAgent?}`.
  - `captureMessage(message, level?, context?)` — captures a free-form string with severity level (`fatal | error | warning | info | debug`).
  - `getErrorHistory()` — defensive copy of the last 100 entries (newest last).
  - `clearErrorHistory()` — wipes the buffer (admin only).
  - `getErrorStats()` — aggregate counts by level + kind + oldest/newest timestamps.
  - `withCapture(label, fn, context?)` — async wrapper that captures any thrown error before re-throwing.
  - In-memory ring buffer (cap 100), mirrors to console with level-appropriate method (`error` / `warn` / `log`). Isomorphic — `envContext()` detects browser vs server and captures `window.location.href` + `navigator.userAgent` only on the client.
  - The surface mirrors Sentry's `captureError` / `captureMessage` so swapping to a real Sentry (or any other vendor) later only requires editing this single file.
- **Endpoint:** `GET /api/monitoring/errors` returns `{stats, errors, count}` (last 100 errors, newest last) with `Cache-Control: no-store`. `DELETE` wipes the buffer + captures an info message so the clear event itself shows up in the dashboard. Not auth-gated (CIRKLE auth is client-side); intended to be restricted at the reverse-proxy layer (Caddy / Cloudflare Access) in production.

## Chapter 62: Error Boundaries **[NEW]**

- **File:** `src/components/error-boundary.tsx` (92 lines).
- **Surface:** Bilingual (English + Arabic) error UI with retry / home buttons. Wired to `error-monitoring` via `captureError` in `componentDidCatch`. Wraps all 8 screens in `src/app/page.tsx` so a render-time crash in any screen degrades gracefully to a friendly card instead of a white screen.
- **Behaviour:**
  - `componentDidCatch(error, errorInfo)` calls `captureError(error, {screenName, source:"ErrorBoundary", componentStack: errorInfo.componentStack})` after the existing `console.error` call. The `console.error` is preserved so dev feedback is unchanged.
  - The fallback UI shows the error message in English + Arabic, plus a stack-trace disclosure (collapsed by default) for debugging.
  - "Retry" re-mounts the child tree; "Home" navigates to the home tab via `circle:navigate`.
- **Why it matters:** Without the boundary, a single thrown render in any screen took down the entire app. Now each screen is isolated — a Lamahat bug doesn't break Wasl.

## Chapter 63: API Smoke Tests **[NEW]**

- **Files:** `src/lib/api-tests.ts` (213 lines) + `src/app/api/_test/route.ts`.
- **Surface:** Framework-free test runner — no vitest / jest dependency. Just async functions that throw `AssertionError` on failure. Helpers: `assert(condition, message)`, `assertEqual(actual, expected, message)`, `assertOk(value, message)`. `runApiTests()` returns `{total, passed, failed, durationMs, results: TestResult[]}`. `TestResult` shape: `{name, ok, message, durationMs, details?}`.
- **5 read-only smoke tests:**
  1. `GET /api/health` → 200 + `status` ∈ {healthy, ok, degraded}
  2. `GET /api/news?country=EG` → 200 + `breaking` or `articles` is an array
  3. `GET /api/aike/status` → 200 + `status === "operational"`
  4. `GET /api/brain/status` → 200 + `online === true`
  5. `GET /api/features?country=SA` → 200 + `enabled` or `all` is an array
- **Endpoint:** `GET /api/_test` runs `runApiTests()` and returns the suite result. `export const dynamic = "force-dynamic"` so the page is never cached. In `NODE_ENV === "production"` → returns 404 so the endpoint is impossible to trigger from a public deploy. Captures a `captureMessage` summary after each run (info on success, warning on failure) so test runs surface in the error-monitoring dashboard.
- **Tests fetch** `${BASE_URL || http://localhost:3000}<path>` with an 8-second `AbortController` timeout.

## Chapter 64: 3-Layer Rollback Protection **[NEW]**

Three independent layers prevent the CIRKLE codebase from being rolled back to older, broken versions. A rollback would have to defeat all three simultaneously.

### Layer 1 — GitHub Branch Protection API (server-side, enforced by GitHub)

Set up via the GitHub REST API on 2026-08-12. Affects ALL collaborators, including admins (`enforce_admins=true`).

```json
{
  "required_status_checks": { "strict": true, "contexts": [] },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false
}
```

What this prevents:
- **Force-push to `main`** → rejected by GitHub (`allow_force_pushes=false`). This is the primary anti-rollback mechanism — nobody can rewrite published history.
- **Branch deletion** → rejected by GitHub (`allow_deletions=false`).
- **Merge commits** → rejected by GitHub (`required_linear_history=true`). Only fast-forward or rebase-merges are allowed.
- **Direct pushes that skip required checks** → blocked once CI contexts are added.

To verify the protection is still active:
```bash
gh api repos/fortleem/CIRKLE/branches/main/protection
```

### Layer 2 — Pre-push hook (client-side, defense in depth)

Location: `.git/hooks/pre-push` (mode 555 — read + execute, no write).

Behaviour:
- **Blocks** force-push (`+refspec`) and non-fast-forward updates to `refs/heads/main` or `refs/heads/master`.
- **Blocks** deletion of any tag matching `v-*`, `cirkle-*`, `backup/*`, or `production-*`.
- **Allows** legitimate fast-forward pushes and creation of new tags.
- Emergency bypass: `git push --no-verify` (documented but discouraged; will still be blocked by GitHub's server-side protection).

The hook file is mode `555` (read + execute only, no write) so it cannot be accidentally edited. To modify it, you must explicitly `chmod u+w` first.

### Layer 3 — Git config (protocol-level, independent of both above)

```ini
[receive]
    denyNonFastForwards = true   # server-side: reject history rewrites
    denyDeletes = true           # server-side: reject branch/tag deletion
[transfer]
    fsckObjects = true           # verify object integrity on transfer
```

These make any future non-fast-forward push or ref deletion fail at the git protocol layer, independent of the pre-push hook or the GitHub API.

### Production-stable tag

| Tag | Points at | Meaning |
|---|---|---|
| `production-stable-2026-08-12` | `763e03c` | The current production-stable release. All endpoints verified healthy, all features verified working. This is the recovery point if anything goes wrong. |

To create a new production-stable tag (after verifying a release):
```bash
git tag -a production-stable-YYYY-MM-DD -m "Production-stable release: <summary>"
git push cirkle production-stable-YYYY-MM-DD
```

### Backups

```
backups/cirkle-production-20260812-132736.tar.gz   (147 MB — code only)
backups/cirkle-production-20260812-153447.tar.gz   (393 MB — full project incl. screenshots)
```

Restore from the latest backup:
```bash
mkdir cirkle-restored && tar -xzf backups/cirkle-production-20260812-153447.tar.gz -C cirkle-restored
cd cirkle-restored && bun install && bun run db:push && bun run dev
```

### Recovery procedure (if rollback somehow occurs)

Because history rewriting is blocked at three layers (local hook + git config + GitHub API), the only realistic "rollback" is accidentally deleting files from the working tree. To recover:

1. **Do NOT commit anything** — preserve uncommitted work first.
2. Restore from the production-stable tag: `git reset --hard production-stable-2026-08-12`. Or, if `.git` itself is corrupted, restore from the tar.gz backup.
3. Verify with `bun run lint` and `curl http://localhost:3000/api/health`.
4. Open the app in the browser to confirm runtime health.
5. If the tag itself was somehow deleted from the remote, re-create it from the local tag (the local tag is protected by the pre-push hook): `git push cirkle production-stable-2026-08-12`.

See `/ROLLBACK_PROTECTION.md` for the full 210-line protection document (sections 0–10), including disabled destructive hooks, audit commands, and the rationale for why rollback matters.

---

# Part XI: Monetization & Business Model

## Revenue: 100% Free Users, Ads-Only
- Non-targeted local ads (city-level)
- Sponsored hashtags (Midan)
- Sponsored banner (Home dashboard)
- Affiliate commissions
- Creator tipping (non-custodial)
- Performance rewards
- Ad compliance per region (`src/lib/ad-compliance.ts`)

---

# Part XII: Technology Stack & Infrastructure

## Core Stack
- Next.js 16.1.3 (Turbopack, App Router)
- TypeScript 5 (strict)
- Tailwind CSS 4 + shadcn/ui (New York)
- Prisma 6.19.2 + @prisma/adapter-libsql
- Turso (libsql, edge-replicated SQLite)
- Bun 1.3.x (runtime + package manager)
- Socket.io (real-time mini-services)
- Framer Motion (animations)

## AI Providers (5, ZAI removed)
1. Groq — llama-3.3-70b-versatile (fastest, Arabic)
2. OpenRouter — openrouter/auto:online (web search)
3. Gemini — gemini-2.0-flash (vision, grounding)
4. HuggingFace — Mistral-7B-Instruct (free tier)
5. OpenAI — gpt-4o-mini (reasoning, non-news)

## Database: Turso
- URL: libsql://cirkle-fortleem.aws-us-east-1.turso.io
- 97 Prisma models
- Edge-replicated (US East, EU, Asia)
- Prisma driver adapter for libsql protocol

## Environment Variables
- DATABASE_URL (local SQLite for dev)
- TURSO_DATABASE_URL (Turso for production)
- TURSO_AUTH_TOKEN
- GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, HUGGINGFACE_API_KEY, OPENAI_API_KEY
- `.env` is read-only (chmod 444) + validated at startup by `src/lib/env-validation.ts`

---

# Part XIII: Deployment & Self-Hosting

## Deployment
- GitHub: fortleem/CIRKLE.git
- Vercel: auto-deploy from GitHub main branch
- CI: GitHub Actions (non-blocking smoke test)
- 7 environment variables set on Vercel

## Git Hardening (3-Layer — see Chapter 64)
- Layer 1: GitHub Branch Protection API (`allow_force_pushes=false`, `enforce_admins=true`, `required_linear_history=true`)
- Layer 2: Pre-push guard (`.git/hooks/pre-push`, mode 555) blocks force-push to main + deletion of `v-*`, `cirkle-*`, `backup/*`, `production-*` tags
- Layer 3: Git config (`receive.denyNonFastForwards=true`, `receive.denyDeletes=true`, `transfer.fsckObjects=true`)
- Disabled destructive hooks: `post-checkout`, `post-merge`, `post-reset` (each now contains only a comment)
- `scripts/master-restore.sh` neutralised — prints a warning and exits 0 without doing anything
- Production-stable tag: `production-stable-2026-08-12` at commit `763e03c`
- Backups: 2 tar.gz files (147 MB + 393 MB) in `backups/`

## Self-Hosting Script
- `scripts/self-host-all.sh` — Docker Compose stack for Matrix Synapse + PeerTube + Mailcow + ntfy + TileServer GL

## ADRs (3, all APPROVED)
- ADR-001: Web-first PWA strategy
- ADR-002: Matrix Olm/Megolm via libolm WASM for E2EE
- ADR-003: ONNX Runtime Web for on-device AI

---

# Part XIV: Gap Analysis Summary (v12.0 → v16.0)

## What Was Added (NOT in v12.0)

| Feature | Source |
|---|---|
| CIRKLE Brain AI 9+1 phases | v13.0 |
| Phase 7.5 AIKE (22 modules + 15 trainers) | v15.0 (chat history) |
| News Orchestrator (5-source pipeline) | v15.0 (chat history) |
| 135 External Data Sources | v15.0 (chat history) |
| OIDC Provider (8 routes, 3 models) | v15.0 (P1.1) |
| E2EE Service Abstraction | v15.0 (P2.1) |
| ActivityPub Federation Abstraction | v15.0 (P2.3) |
| Community Governance (proposals, voting, appeals) | v15.0 (P2.4) |
| IPFS Storage Abstraction | v15.0 (P2.5) |
| P2P Video Abstraction | v15.0 (P2.6) |
| Local Mesh (WebRTC) | v15.0 (P2.7) |
| Anonymous Midan Posting | v15.0 (P1.6) |
| Circle Groups (creation, events, members, join requests, audit) | v15.0 (P1.7) |
| Tipping Algorithm (country-aware) | v15.0 (gap fix) |
| Affiliate Tracking | v15.0 (gap fix) |
| Sponsored Hashtags | v15.0 (gap fix) |
| Moderation Queue | v15.0 (gap fix) |
| Nearby Photo Discovery | v15.0 (gap fix) |
| Offline Content Stash | v15.0 (gap fix) |
| Transparency Dashboard | v15.0 (gap fix) |
| Performance Metrics Dashboard | v15.0 (gap fix) |
| Comparison View | v15.0 (gap fix) |
| Data-Plane Router | v15.0 (gap fix) |
| Ad Compliance per Region | v15.0 (gap fix) |
| Performance Rewards | v15.0 (gap fix) |
| Dynamic Feature Toggling | v15.0 (gap fix) |
| Signed Configuration (Ed25519) | v15.0 (gap fix) |
| Travelers/Roaming | v15.0 (gap fix) |
| 17-Language Locale System | v15.0 (chat history) |
| Turso Database (edge-replicated) | v15.0 (chat history) |
| 3-Step Registration (was 6) | v15.0 (UI fix) |
| 5-Tab Dock + More (was 8) | v15.0 (UI fix) |
| Collapsible Dashboard Sections | v15.0 (UI fix) |
| Error Boundaries | v15.0 (UI fix) |
| Loading Skeletons | v15.0 (UI fix) |
| First-Launch Onboarding Tour | v15.0 (P0.3) |
| "What's New" Feature Discoverability | v15.0 (P0.4) |
| Accessibility Baseline (focus traps, roving tabindex) | v15.0 (P0.6) |
| Competitive Edge Components (NoAds, Wellness, VerifiedHuman) | v15.0 (chat history) |
| Citizen Shield Hero Card | v15.0 (chat history) |
| ZAI completely removed | v15.0 (chat history) |

## What Was Added in v16.0 (NOT in v15.0)

### 10 Creative Social Features (Chapters 49–58)

| # | Feature | Files | Source |
|---|---|---|---|
| 1 | Smart Compose (كتابة ذكية) | `src/components/overlays/smart-compose.tsx` | CREATIVE-1 |
| 2 | Social Rituals (طقوس اجتماعية) | `src/lib/social-rituals.ts` + `src/app/api/rituals/route.ts` | CREATIVE-1 |
| 3 | Social Analytics (تحليلات اجتماعية) | `src/components/overlays/social-analytics.tsx` | CREATIVE-1 |
| 4 | Smart Notifications (إشعارات ذكية) | `src/components/overlays/smart-notifications.tsx` | CREATIVE-1 |
| 5 | Cross-Module Sharing Hub (مشاركة عبر الوحدات) | `src/lib/cross-module-share.ts` + `src/app/api/share/cross-module/route.ts` | CREATIVE-1 |
| 6 | Connection Graph (خريطة العلاقات) | `src/components/overlays/connection-graph.tsx` | CREATIVE-2 |
| 7 | Content Calendar (تقويم المحتوى) | `src/components/overlays/content-calendar.tsx` | CREATIVE-2 |
| 8 | Mood Engine (محرّك المزاج) | `src/lib/mood-engine.ts` + `src/app/api/mood/route.ts` | CREATIVE-2 |
| 9 | Social Challenges (تحدّيات اجتماعية) | `src/lib/social-challenges.ts` + `src/app/api/challenges/route.ts` | CREATIVE-2 |
| 10 | AI Content Discovery (اكتشاف المحتوى) | `src/components/overlays/content-discovery.tsx` | CREATIVE-2 |

### 5 Production Hardening Modules (Chapters 59–63)

| # | Module | File | Source |
|---|---|---|---|
| 1 | Input Validation (zod) | `src/lib/api-validation.ts` | FIX-PRODUCTION |
| 2 | Rate Limiting | `src/lib/api-rate-limit.ts` | FIX-PRODUCTION |
| 3 | Error Monitoring | `src/lib/error-monitoring.ts` + `src/app/api/monitoring/errors/route.ts` | FIX-PRODUCTION |
| 4 | Error Boundaries (bilingual UI + captureError wiring) | `src/components/error-boundary.tsx` | FIX-PRODUCTION |
| 5 | API Smoke Tests | `src/lib/api-tests.ts` + `src/app/api/_test/route.ts` | FIX-PRODUCTION |

### 3-Layer Rollback Protection (Chapter 64)

| Layer | Mechanism | Verified |
|---|---|---|
| 1 | GitHub Branch Protection API (`allow_force_pushes=false`, `enforce_admins=true`, `required_linear_history=true`) | 2026-08-12 |
| 2 | `.git/hooks/pre-push` (mode 555, read-only) — blocks force-push + tag deletion | 2026-08-12 |
| 3 | Git config — `receive.denyNonFastForwards`, `receive.denyDeletes`, `transfer.fsckObjects` | 2026-08-12 |
| Tag | `production-stable-2026-08-12` at commit `763e03c` | 2026-08-12 |
| Backup | `backups/cirkle-production-20260812-153447.tar.gz` (393 MB) | 2026-08-12 |

## What Is Deferred (Requires Infrastructure)

| Feature | ADR | Reason |
|---|---|---|
| Matrix Synapse (real E2EE) | ADR-002 | Needs server deployment |
| IPFS Kubo (real decentralized storage) | ADR-001 | Needs node deployment |
| PeerTube (real P2P video) | ADR-001 | Needs server deployment |
| Mailcow (real SMTP/IMAP) | ADR-001 | Needs VPS |
| ONNX Runtime (on-device AI) | ADR-003 | Needs model download + WASM |
| ntfy (self-hosted push) | ADR-001 | Needs server |
| ActivityPub federation (real) | ADR-001 | Needs inbound HTTP endpoint |
| Self-hosted mapping (TileServer GL) | P2.8 | Deprioritized |
| BLE/Wi-Fi Direct mesh | ADR-001 | Web platform limitation |
| Flutter mobile app | ADR-001 | Web-first strategy approved |

## What Was Changed from v12.0

| v12.0 | v16.0 | Reason |
|---|---|---|
| Flutter mobile app | Next.js 16 web (PWA) | ADR-001 — web-first strategy |
| Matrix Synapse (E2EE) | E2EE service abstraction (AES-256-GCM) | ADR-002 — upgrade path to Olm |
| SQLite local | Turso (libsql, edge-replicated) | Production scalability |
| 0 languages | 17 locale packs | Global reach |
| 6-step registration | 3-step registration | UX improvement |
| 8-tab dock | 5-tab dock + More | Mobile usability |
| No onboarding | 12-step interactive tour | First-run experience |
| No error boundaries | Per-screen error boundaries (bilingual) | Reliability |
| ZAI as AI provider | ZAI completely removed | User request |
| 0 data sources | 135 external data sources | AIKE autonomous learning |
| 0 creative social features | 10 creative social features | CREATIVE-1 + CREATIVE-2 (v16.0) |
| No input validation | zod validation on 5 critical routes | FIX-PRODUCTION (v16.0) |
| No rate limiting | Per-route rate limits with named presets | FIX-PRODUCTION (v16.0) |
| No error monitoring | Sentry-shaped `captureError` + `/api/monitoring/errors` | FIX-PRODUCTION (v16.0) |
| No API smoke tests | Framework-free 5-test runner at `/api/_test` | FIX-PRODUCTION (v16.0) |
| Pre-push hook only | 3-layer rollback protection (GitHub API + hook + git config) | ROLLBACK (v16.0) |

---

# Appendices

## Appendix A: Complete File Inventory (v16.0)

| Category | Count |
|---|---|
| API Routes | 237 |
| Prisma Models | 97 |
| Lib Modules | 262 |
| Screens | 8 |
| Overlays | 71 |
| UI Components | 52 |
| Hooks | 10 |
| Mini-Services | 3 |
| Locale Packs | 17 |
| Data Source Configs | 25 files (135 sources) |
| AIKE Modules | 22 + 15 trainers |
| Docs | 13 |
| ADRs | 3 |
| Scripts | 8 |

### New files added in v16.0 (20 total)

**CREATIVE-1 — Smart Social Features (7 files):**
- `src/lib/cross-module-share.ts` (417 lines)
- `src/lib/social-rituals.ts` (270 lines)
- `src/app/api/rituals/route.ts`
- `src/app/api/share/cross-module/route.ts`
- `src/components/overlays/smart-compose.tsx`
- `src/components/overlays/social-analytics.tsx`
- `src/components/overlays/smart-notifications.tsx`

**CREATIVE-2 — More Creative Social Features (7 files):**
- `src/lib/mood-engine.ts` (358 lines)
- `src/lib/social-challenges.ts` (630 lines)
- `src/app/api/mood/route.ts`
- `src/app/api/challenges/route.ts`
- `src/components/overlays/connection-graph.tsx`
- `src/components/overlays/content-calendar.tsx`
- `src/components/overlays/content-discovery.tsx`

**FIX-PRODUCTION — Production Hardening (6 files):**
- `src/lib/api-validation.ts` (135 lines)
- `src/lib/api-rate-limit.ts` (129 lines)
- `src/lib/error-monitoring.ts` (223 lines)
- `src/lib/api-tests.ts` (213 lines)
- `src/app/api/monitoring/errors/route.ts`
- `src/app/api/_test/route.ts`

**Updated supporting files:**
- `src/components/error-boundary.tsx` (bilingual UI + `captureError` wiring)
- `src/lib/overlay-registry.ts` (6 new overlay entries — overlay count 65 → 71)
- `src/screens/home-screen.tsx` (tile count 65 → 71)
- `src/app/page.tsx` (6 new dynamic imports + state + event listeners + renders)
- `next.config.ts` (`eslint` key removed — was emitting Next.js 16 build warnings)
- `ROLLBACK_PROTECTION.md` (rewritten for the 3-layer protection + production-stable tag)

## Appendix B: Constitutional Principles (20, unchanged)

1. One Unified Intelligence
2. Intelligence Before Execution
3. Understanding Before Action
4. Context is the Foundation of Intelligence
5. Single Ownership
6. Separation of Cognitive Responsibilities
7. Platform Independence
8. Explainability by Design
9. Privacy by Design
10. Security by Design
11. Modularity
12. Loose Coupling
13. Shared Cognitive Ecosystem
14. Capability-Based Evolution
15. AI as an Operating System
16. Intelligence Through Composition
17. Scalability Without Redesign
18. Future Compatibility
19. Constitutional Stability
20. Human-Centered Intelligence

## Appendix C: Cognitive Maturity Model (7 Levels, all achieved)

1. Environmental Awareness (GCIE) ✅
2. Personal Awareness (PMB) ✅
3. Cognitive Awareness (CRIE) ✅
4. Decision Awareness (IRDE) ✅
5. Platform Awareness (UOB) ✅
6. Execution Awareness (TEE) ✅
7. Adaptive Intelligence (LIEE) ✅
8. Autonomous Intelligence (AIKE) ✅ **[NEW]**

---

**CIRKLE (دوائر) v16.0 — One AI. One cognitive architecture. One trusted operating system. Ten new creative surfaces. Production-hardened. Rollback-protected.**

**Generated: August 12, 2026**
**Commit: 763e03c**
**Tag: production-stable-2026-08-12**

# CIRKLE (دوائر) — Complete Production Blueprint v15.0

**AI-Native Super App — Fully Merged, Updated & Expanded Edition**

> **Version History:**
> - v10.0 → v12.0: Original Circle blueprint (Flutter, Matrix, IPFS, PeerTube)
> - v12.0 → v13.0: CIRKLE rebrand + Brain AI 9-phase architecture
> - v13.0 → v14.0: Module merge + Phase 4.5 + PCPF + AHG
> - **v14.0 → v15.0: Full implementation + AIKE Phase 7.5 + 135 data sources + OIDC + E2EE + Federation + Governance + 17 languages + Turso + all remediation**

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

**Part IX: Monetization & Business Model**
**Part X: Technology Stack & Infrastructure**
**Part XI: Deployment & Self-Hosting**
**Part XII: Gap Analysis Summary (v12.0 → v15.0)**
**Appendices**

---

# Part I: Executive Vision & Core Commitments

## 1.1 Overview

CIRKLE (Arabic: Dawayer دوائر) is a privacy-first, AI-native social operating system that replaces a dozen standalone apps — WhatsApp, YouTube, Instagram, Twitter/X, LinkedIn, Facebook, Booking.com, Gmail, Google Maps, and more — with a single, open-source, offline-first web application powered by a proprietary 9+1 phase AI Operating System called CIRKLE Brain AI.

## 1.2 Platform Statistics (v15.0)

| Metric | v14.0 | v15.0 | Delta |
|---|---|---|---|
| API Routes | 162 | **231** | +69 |
| Prisma Models | 53 | **97** | +44 |
| Lib Modules | 165 | **254** | +89 |
| Screens | 8 | **8** | — |
| Overlays | 96 | **103** | +7 |
| Mini-Services | 3 | **3** | — |
| AI Phases | 9 + 4.5 | **9 + 4.5 + 7.5** | +AIKE |
| AIKE Modules | 0 | **22 + 15 trainers** | +37 |
| External Data Sources | 0 | **135** | +135 |
| Locale Packs | 0 | **17** | +17 |
| Registered Capabilities | 45+ | **45+** | — |
| Countries Modeled | 6 | **246** | +240 |
| Database | SQLite | **Turso (libsql)** | Upgraded |
| ADRs | 0 | **3** | +3 |
| Lint Errors | 0 | **0** | — |

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

# Part IX: Monetization & Business Model

## Revenue: 100% Free Users, Ads-Only
- Non-targeted local ads (city-level)
- Sponsored hashtags (Midan)
- Sponsored banner (Home dashboard)
- Affiliate commissions
- Creator tipping (non-custodial)
- Performance rewards
- Ad compliance per region (`src/lib/ad-compliance.ts`)

---

# Part X: Technology Stack & Infrastructure

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

# Part XI: Deployment & Self-Hosting

## Deployment
- GitHub: fortleem/CIRKLE.git
- Vercel: auto-deploy from GitHub main branch
- CI: GitHub Actions (non-blocking smoke test)
- 7 environment variables set on Vercel

## Git Hardening
- Pre-push guard (blocks force-push to main, tag deletion)
- receive.denyNonFastForwards = true
- receive.denyDeletes = true
- transfer.fsckObjects = true
- post-checkout/merge/reset hooks neutralized
- master-restore.sh disabled

## Self-Hosting Script
- `scripts/self-host-all.sh` — Docker Compose stack for Matrix Synapse + PeerTube + Mailcow + ntfy + TileServer GL

## ADRs (3, all APPROVED)
- ADR-001: Web-first PWA strategy
- ADR-002: Matrix Olm/Megolm via libolm WASM for E2EE
- ADR-003: ONNX Runtime Web for on-device AI

---

# Part XII: Gap Analysis Summary (v12.0 → v15.0)

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

| v12.0 | v15.0 | Reason |
|---|---|---|
| Flutter mobile app | Next.js 16 web (PWA) | ADR-001 — web-first strategy |
| Matrix Synapse (E2EE) | E2EE service abstraction (AES-256-GCM) | ADR-002 — upgrade path to Olm |
| SQLite local | Turso (libsql, edge-replicated) | Production scalability |
| 0 languages | 17 locale packs | Global reach |
| 6-step registration | 3-step registration | UX improvement |
| 8-tab dock | 5-tab dock + More | Mobile usability |
| No onboarding | 12-step interactive tour | First-run experience |
| No error boundaries | Per-screen error boundaries | Reliability |
| ZAI as AI provider | ZAI completely removed | User request |
| 0 data sources | 135 external data sources | AIKE autonomous learning |

---

# Appendices

## Appendix A: Complete File Inventory (v15.0)

| Category | Count |
|---|---|
| API Routes | 231 |
| Prisma Models | 97 |
| Lib Modules | 254 |
| Screens | 8 |
| Overlays | 103 |
| UI Components | 52 |
| Hooks | 10 |
| Mini-Services | 3 |
| Locale Packs | 17 |
| Data Source Configs | 25 files (135 sources) |
| AIKE Modules | 22 + 15 trainers |
| Docs | 10 |
| ADRs | 3 |
| Scripts | 8 |

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

**CIRKLE (دوائر) v15.0 — One AI. One cognitive architecture. One trusted operating system.**

**Generated: August 12, 2026**
**Commit: 0a676ed**

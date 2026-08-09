# CIRKLE — Blueprint Compliance Matrix

| Field | Value |
|---|---|
| **Document** | Blueprint Compliance Matrix |
| **Blueprint** | CIRCLE BLUEPRINT v12.0 (with v13 addenda) |
| **Codebase** | HEAD `be6755e` (audited baseline `cf1845b`) |
| **Version** | 1.0 |
| **Date** | 2026-08-09 |
| **Status** | Living document — updated each release |
| **Owner** | CIRKLE Architecture Council |
| **Sources** | `worklog.md` tasks AUDIT-BLUEPRINT-1 (Parts 1-10) and AUDIT-BLUEPRINT-2 (Parts 11-36) |
| **Related** | `ADR-001-platform-strategy.md`, `CIRKLE-DEPENDENCY-MATRIX.md`, `DEFERRED_FEATURES.md` |

---

## 1. Purpose

This document is the **authoritative compliance matrix** mapping every major
section of the CIRCLE BLUEPRINT v12.0 to the actual CIRKLE codebase. It is
derived directly from the gap analyses performed in tasks AUDIT-BLUEPRINT-1
(Parts 1-10, 97 sub-sections audited) and AUDIT-BLUEPRINT-2 (Parts 11-36,
145 sub-sections audited), totalling **242 sub-sections** audited.

For each section it records:

- **Section** — the blueprint part and sub-section number.
- **Requirement** — the blueprint's stated requirement (abbreviated).
- **Current State** — what the codebase actually does today.
- **Evidence** — file path(s) where the implementation lives, or `—` if missing.
- **Status** — one of: `IMPLEMENTED` / `PARTIAL` / `MISSING` / `BLOCKED` / `DEFERRED`.
- **Gap** — the specific shortfall between requirement and current state.
- **Planned Phase** — the planned sprint/phase to address it.

---

## 2. Status Legend

| Status | Meaning |
|---|---|
| **IMPLEMENTED** | Requirement fully met in production code. |
| **PARTIAL** | UI or backend exists but missing wiring, full feature set, or production-quality implementation. |
| **MISSING** | No implementation exists. |
| **BLOCKED** | Implementation blocked on a dependency (e.g., ADR approval, federated back-end). |
| **DEFERRED** | Intentionally deferred per `DEFERRED_FEATURES.md`, pending ADR-001 approval. |

---

## 3. Summary Statistics

| Bucket | Parts 1-10 | Parts 11-36 | **Total** | % |
|---|---|---|---|---|
| IMPLEMENTED | 9 | 18 | **27** | 11.2% |
| PARTIAL | 41 | 60 | **101** | 41.7% |
| MISSING | 47 | 67 | **114** | 47.1% |
| BLOCKED | 0 | 0 | **0** | 0% |
| DEFERRED | 0 | 0 | **0** | 0% |
| **Total audited** | 97 | 145 | **242** | 100% |

> **Note on DEFERRED vs MISSING:** Every MISSING item below is a candidate
> for the DEFERRED_FEATURES.md list. The eight features explicitly listed in
> DEFERRED_FEATURES.md are additionally tagged `DEFERRED` in the
> "Planned Phase" column to make their deferral explicit. The "Status"
> column reflects current code state (which is MISSING for all deferred
> items) — the "Planned Phase" column reflects the planning intent.

---

## 4. Compliance Matrix — Parts 1-10 (Executive, Brand, Architecture, DRE, Home, Wasl, Mashahd, Lamahat, Midan, Circle Groups)

| Section | Requirement | Current State | Evidence | Status | Gap | Planned Phase |
|---|---|---|---|---|---|---|
| 1.1-1.4 | Core covenant (free forever, on-device data, no billing, federation, P2P, on-device AI) | Covenant stated in onboarding/home footer; P2P/federation not wired | `src/screens/home-screen.tsx`, `src/components/onboarding.tsx` | PARTIAL | No public cost-analysis dashboard; federation/P2P conceptual only | Phase 6 (post-launch) |
| 1.5 | Target audience & use-case matrix per segment | Onboarding slides reference pain points; no segment-tailored flows | `src/components/onboarding.tsx` | PARTIAL | No per-segment UX branching | Phase 4 |
| 1.6 | Quantitative goals (Year-1 Egypt MAU/cost/P2P %) | None | — | MISSING | No telemetry dashboard | Phase 3 |
| 1.7 | Comparison with incumbents (FB/WhatsApp/TikTok) | None | — | MISSING | No comparison view | Phase 6 |
| 1.8 | Long-term vision (DAO, mesh internet, SSI) | None | — | MISSING | Governance UI is decorative | Phase 9 |
| 2.1-2.3 | Dynamic naming matrix (7 langs + 2 EN) | Only EN + AR implemented | `src/lib/i18n.ts` | PARTIAL | Missing zh-CN, fr, es, de, it, en-BRAND, en-US | Phase 4 |
| 2.4 | Visual identity (colors, fonts, logo) | Brand tokens + logo live | `src/app/globals.css`, `src/components/brand/circle-logo.tsx` | IMPLEMENTED | Fraunces+Inter+Tajawal used instead of Cormorant+Cairo (functional equivalent) | — |
| 2.5 | Domains & subdomains (circle.app, dawayer.app, /wasl, /mashahd) | Single-route app | — | MISSING | No module-level URL routing | Phase 6 |
| 2.6 | In-app dynamic labels JSON (per-locale packs) | Labels hardcoded in i18n.ts | — | MISSING | No JSON locale packs | Phase 4 |
| 2.7-2.9 | Brand voice & app-store localization | None | — | MISSING | No localization pipeline | Phase 4 |
| 3.1 | Tech stack (Flutter/Matrix/Ory/ActivityPub/PeerTube/IPFS/ntfy/TileServer/Mailcow) | Next.js 16 + React + Prisma; no Flutter, no Matrix/Ory/ActivityPub/PeerTube/IPFS/ntfy/TileServer/Mailcow | `package.json` | PARTIAL | Major architectural divergence from blueprint — see ADR-001 | ADR-001 dependent |
| 3.2 | Personal-mode E2EE (Olm/Megolm + Drift SQLite + Matrix federation) | Messages stored in Postgres; `encrypted: true` flag is decorative | `src/app/api/conversations/**` | MISSING — DEFERRED | No Olm/Megolm, no Matrix SDK, no federation | Deferred (ADR-001) |
| 3.3 | Local DB schema (Drift SQLite) | Prisma schema with Message/VerifyClaim/Backup models — server-side, not local Drift | `prisma/schema.prisma` | PARTIAL | Server-side Prisma, not on-device Drift | Phase 5 |
| 3.4 | Work Mode installer (one-click Docker Matrix) | UI present; no installer, no Matrix backend | `src/components/overlays/work-mode.tsx` | PARTIAL | Demo data only | Phase 7 |
| 3.5 | Public content via IPFS/PeerTube | Mashahd uploads go to `/api/posts`; no IPFS/PeerTube | — | MISSING — DEFERRED | No IPFS CID, no PeerTube inbox | Deferred (ADR-001) |
| 3.6 | Zero-cost AI (HF + GROQ + ONNX on-device) | Multi-provider server-side chain (Groq/OpenAI/HF/Gemini/OpenRouter) | `src/lib/ai.ts` | PARTIAL | All server-side; no on-device ONNX runtime | Deferred (ADR-001) |
| 3.7 | ntfy push (no Firebase) | `push-notifications.ts` uses browser Notifications API | `src/lib/push-notifications.ts` | MISSING — DEFERRED | No ntfy client/server | Deferred (ADR-001) |
| 3.8 | Zero-cost mapping stack (TileServer GL + Nominatim + OSRM + offline packs) | Public OSM endpoints used | `src/lib/osm.ts`, `src/lib/cirkle-maps.ts`, `src/app/api/maps/**` | PARTIAL — DEFERRED | No self-hosted TileServer/Nominatim/OSRM; no offline packs | Deferred (ADR-001) |
| 3.9 | Mailcow @circle.app email | Internal message store only | `src/app/api/mail/**`, `src/lib/circle-mail.ts` | MISSING — DEFERRED | No Mailcow, no real SMTP/IMAP | Deferred (ADR-001) |
| 3.10 | Cost analysis dashboard (public cost-per-user) | None | — | MISSING | No transparency page | Phase 6 |
| 3.11 | Self-hosting unified script (self-host-all.sh) | Only platform-restore/backup scripts | `scripts/*.sh` | MISSING | No Matrix/PeerTube/Mailcow compose stack | Phase 8 |
| 4.1-4.3 | DRE config delivery (signed JSON via config.circle.app) | `/api/regions?country=…` returns region + compliance + DPO | `src/app/api/regions/route.ts`, `src/lib/regions.ts` | PARTIAL | No signed JSON, no IP auto-detect, no feature/payment_methods/cultural_events fields | Phase 4 |
| 4.2 | Six global data planes (Global/China/Russia/Iran/Vietnam/EU) | 8 regions defined (KSA, EG, UAE, CN, RU, EU, US, GLOBAL) | `src/lib/regions.ts` | PARTIAL | Iran and Vietnam missing; extra KSA/EG/UAE/US added | Phase 5 |
| 4.4 | Data-plane routing logic (Flutter DataPlaneRouter) | None | — | MISSING | No homeserver/PeerTube/ntfy URL routing per plane | Phase 5 |
| 4.5.1 | China plane compliance (CTID, keyword filter, ICP, ModelScope) | None | — | MISSING | No CTID, no keyword filter, no Alibaba routing | Deferred (ADR-001) |
| 4.5.2 | Russia plane (VPN detection, Mir/SBP, Roskomnadzor) | None | — | MISSING | No VPN detection, no Mir/SBP | Phase 6 |
| 4.5.3 | EU GDPR plane (right-to-deletion, export, 30-day retention, consent) | DSR/delete/export endpoints exist | `src/app/api/account/{dsr,delete,export,consent-fix}/route.ts` | PARTIAL | No automatic 30-day retention; no consent dialog framework | Phase 4 |
| 4.6 | Dynamic feature toggling (FeatureManager client) | None | — | MISSING | Features globally on/off regardless of region | Phase 4 |
| 4.7 | Travelers / roaming users (home plane preserved abroad) | None | — | MISSING | Region fixed at registration | Phase 6 |
| 4.8 | Configuration caching & fallback (24h client cache) | Graceful fallback to GLOBAL exists | `src/proxy.ts`, `src/lib/db-regional.ts` | PARTIAL | No client-side 24h cache | Phase 4 |
| 4.9 | Zero-implementation cost for new regions (pure config) | New region = array entry in regions.ts | `src/lib/regions.ts` | PARTIAL | Requires code change, not pure config | Phase 5 |
| 4.10 | Signed configuration (Ed25519) | None | — | MISSING | No signature on /api/regions response | Phase 4 |
| 4.11 | Advertiser compliance per region | Ad engine exists; no per-region rules | `src/app/api/ads/**` | MISSING | No per-region ad review rules | Phase 5 |
| 5.1-5.2 | Home dashboard 8 sections + reorder/hide | All sections render; no reorder/hide | `src/screens/home-screen.tsx` | PARTIAL | Customization (5.6) missing | Phase 4 |
| 5.3.1 | Top carousel (emergency/PSA/featured) | Carousel with emergency styling; emergencies from feed API not ntfy push | home-screen L1306 | PARTIAL | No ntfy-pushed emergencies | Phase 4 |
| 5.3.2 | Quick actions (Scan to Pay / New Post / Go Live / Create Circle) | Different labels (Scan&Pay / Post / Ask AI / News / Featured / City Pulse) | home-screen L1503 | PARTIAL | Missing Go Live + Create Circle; no 8-action picker | Phase 4 |
| 5.3.3 | Happening Nearby (coarse-loc events, 15-min refresh, RSVP) | Section present; uses city from app store | home-screen L2189, `/api/nearby/route.ts` | PARTIAL | No geohash-level-5 privacy surface | Phase 4 |
| 5.3.4 | For You (on-device matrix factorization 64-dim SGD) | Server-side IRDE scoring + server-side feed-algorithm | `src/lib/irde-engine.ts`, `src/lib/feed-algorithm.ts`, `src/lib/personal-ai.ts` | MISSING | Not on-device matrix factorization; personal-AI is lexical recall | Deferred (ADR-001) |
| 5.3.5 | Trending in [City] (ActivityPub hashtag aggregation, 1h refresh) | UI present; static fallback hashtags | home-screen L2212, midan-screen L142 | PARTIAL | No ActivityPub feed aggregation | Deferred (ADR-001) |
| 5.3.6 | Official Updates (real-time channel push) | Section renders; data from generated feed | home-screen L2046, `/api/feed/route.ts` | PARTIAL | Not real Official Channels subscriptions | Phase 4 |
| 5.3.7 | Your Workspaces (real-time workspace notifications) | Hardcoded single demo card | home-screen L2253 | PARTIAL | No real workspace integration | Phase 6 |
| 5.3.8 | Sponsored Banner (city-level non-targeted ad, 7-day local) | None | — | MISSING | Ad serve API exists but not rendered on dashboard | Phase 4 |
| 5.3.9 | Upcoming in Your Circles | None | — | MISSING | No section; circle events not surfaced | Phase 4 (blocked on §10) |
| 5.4 | Dashboard layout (Flutter ListView code) | N/A — codebase is React/Next.js | — | MISSING | Architecture divergence — see ADR-001 | ADR-001 dependent |
| 5.5 | Offline & caching (local SQLite, offline indicators) | News has cache + offline indicator; feed/nearby/official do not | `src/hooks/use-news-socket.ts`, `src/hooks/use-online-status.ts` | PARTIAL | Selective offline support | Phase 5 |
| 5.6 | Customization & accessibility (reorder, high-contrast, reduced-motion) | Accessibility toggles present; section reorder/hide missing | `src/stores/circle-store.ts` | PARTIAL | Reorder/hide missing | Phase 4 |
| 5.7-5.8 | User journey + performance metrics (TTI<2s targets) | None | — | MISSING | No performance dashboard | Phase 6 |
| 6.1 | Wasl overview (E2EE, federation, mesh, all platforms) | Full chat UI; no real E2EE/federation/mesh | `src/screens/wasl-screen.tsx` (3487 LOC) | PARTIAL | Federation/mesh conceptual only | Deferred (ADR-001) |
| 6.2 | Authentication (email, Telegram, carrier OTP) | Email + password + display name + country | `src/components/auth/auth-screen.tsx`, `src/lib/auth-store.ts` | PARTIAL | No Telegram or carrier OTP login | Phase 5 |
| 6.3 | Privacy controls (screenshot consent, Ghost Mode, dual identities, anti-trace) | Ghost Mode, screenshot-consent dialog, block-screenshots, allow-forwarding | wasl-screen L933, 949, 1030, 3270-3289 | PARTIAL | No dual identities; no anti-trace metadata stripping | Phase 5 |
| 6.4 | Work Mode (Wasl Maktab self-hosted Matrix) | UI exists; no installer, no admin bot, no retention/export | `src/components/overlays/work-mode.tsx` | PARTIAL | Demo data only | Phase 7 |
| 6.5 | Custom GIFs & stickers | Picker exists; no custom pack upload, no sticker store | `src/components/overlays/gif-picker.tsx` | PARTIAL | Pack management missing | Phase 5 |
| 6.6 | Voice & video calls (VoIP, group calls) | WebRTC call manager + call screen + incoming-call listener | `src/lib/call-manager.ts`, `src/components/overlays/call-screen.tsx`, `/api/calls/route.ts` | PARTIAL | Group-call multiparty status unclear | Phase 5 |
| 6.7 | Broadcast channels (one-to-many) | Creation UI exists; no subscriber push/federation | `src/components/overlays/broadcast-channel.tsx`, wasl-screen L361, L1862 | PARTIAL | Federation missing | Deferred (ADR-001) |
| 6.8 | E2EE details (Olm/Megolm) | `encrypted: boolean` flag only | — | MISSING — DEFERRED | No Olm/Megolm library | Deferred (ADR-001) |
| 6.9 | Offline & mesh messaging (BLE + WiFi Direct + libp2p) | Mesh-presence UI + badge; mesh-network lib is stub | `src/lib/mesh-network.ts`, `src/components/overlays/mesh-presence.tsx`, `src/components/shell/mesh-badge.tsx` | PARTIAL — DEFERRED | No real BLE/WiFi Direct/libp2p | Deferred (ADR-001) |
| 6.10 | Broadcast channels technical impl (Matrix room m.broadcast) | None | — | MISSING — DEFERRED | No Matrix rooms; broadcast is just a chat conversation flag | Deferred (ADR-001) |
| 7.1 | Mashahd overview (P2P video, 0% creator fees) | Full video UI; no P2P distribution, no fee processing | `src/screens/mashahd-screen.tsx` (2381 LOC) | PARTIAL | Distribution model conceptual | Deferred (ADR-001) |
| 7.2-7.3.1 | Non-targeted local video ads (CPM) | Ad API exists for home banner; no in-video CPM insertion | `/api/ads/serve/route.ts` | MISSING | No in-video ad insertion | Phase 5 |
| 7.3.2 | Affiliate commissions | None | — | MISSING | No affiliate link tracking | Phase 6 |
| 7.3.3 | Optional premium creator features (subscription) | Subscribe API exists; no real payment capture | `/api/creator/subscribe/route.ts` | PARTIAL | Ledger only | Phase 5 (blocked on §19) |
| 7.3.5 | Sponsored hashtags & trends (city-level) | None | — | MISSING | No sponsored hashtag surface | Phase 5 |
| 7.3.6 | API access for third-party apps (freemium dev API) | OpenAPI doc exists; no API key issuance, no rate tiers | `src/lib/openapi-docs.ts` | PARTIAL | Docs only | Phase 5 |
| 7.3.7 | Performance-based rewards | None | — | MISSING | No reward pool | Phase 7 |
| 7.3.8 | Non-custodial tipping & virtual gifts | Support ledger records amount + message; no MoonPay, no gifts | `/api/creator/support/route.ts`, mashahd-screen L1808 | PARTIAL | Basic ledger; no real wallet | Phase 5 (blocked on §16, §19) |
| 7.3.9 | Channel memberships (paid subscriptions) | Schema supports tiers; no payment gateway, no auto-renewal | `/api/creator/subscribe/route.ts` | PARTIAL | No billing engine | Phase 5 |
| 7.3.10 | Zero-cost creator income (donations, NFTs, merch) | NFT mint overlay exists; no merch | `/api/commit/mint-nft/route.ts`, `src/components/overlays/cirkle-mint.tsx` | PARTIAL | No merch integration | Phase 7 |
| 7.4 | Tipping algorithm (decision tree, widget selection per country, MoonPay KYC) | None | — | MISSING | No algorithm; basic "Support" button only | Phase 5 (blocked on §16, §19) |
| 7.5 | Compliance & legal (KYC/AML, MTL, tax withholding, age) | None | — | MISSING | No KYC/AML, no MTL, no age-gate | Phase 5 (blocked on §16) |
| 8.1-8.2 | Lamahat overview & feed types (Following, For You, Nearby, Tagged) | Tabs: Feed / Reels / Saved / Tagged | `src/screens/lamahat-screen.tsx` (433 LOC) | PARTIAL | No Nearby tab, no Following tab | Phase 4 |
| 8.3 | Post creation (HEIC/WebP/RAW + IPFS CID + ActivityPub Create) | Composer posts to /api/posts; no IPFS, no ActivityPub, no HEIC/RAW | `src/components/overlays/composer.tsx` | MISSING — DEFERRED | Composer is basic; no federation | Deferred (ADR-001) |
| 8.4 | Nearby discovery (privacy-preserving geohash) | None | — | MISSING | No nearby-photo discovery | Phase 5 |
| 8.5 | Visual search (on-device CLIP) | None | — | MISSING | No CLIP model, no visual search UI | Deferred (ADR-001) |
| 8.6.1 | Stories (ephemeral, 24h) | Story rings render; no 24h expiry, no per-story privacy | lamahat-screen L252, `universal-story.tsx`, `mosaic-stories.tsx`, `living-photos.tsx` | PARTIAL | No expiry enforcement | Phase 4 |
| 8.6.2 | Moments (permanent albums) | None | — | MISSING | No permanent album surface | Phase 5 |
| 8.6.3 | Collections (user-curated) | None | — | MISSING | No collection creation UI | Phase 5 |
| 8.7 | Privacy & consent for photos (face-tag consent, blur, screenshot block) | Privacy Shield has content blur; no face-tag consent, no per-photo privacy | `src/components/overlays/privacy-shield.tsx`, `photo-genealogy.tsx` | PARTIAL | Manual blur only | Phase 5 |
| 8.8 | Moderation & NSFW handling (on-device NSFW blur, appeals) | None | — | MISSING | No NSFW model, no moderation queue | Phase 3 (critical) |
| 8.9 | Offline & syncing (local stash + later sync) | None | — | MISSING | No offline photo sync | Phase 5 |
| 8.10 | Zero-cost architecture specifics (IPFS + on-device AI) | None | — | MISSING — DEFERRED | See 8.3/8.5/8.8 | Deferred (ADR-001) |
| 9.1-9.2 | Midan overview & feeds (For You, Following, Public, Hashtag) | Filters: For you / Following / Saudi / Tech / Sports / Culture | `src/screens/midan-screen.tsx` (1454 LOC) | PARTIAL | No hashtag-only feed, no public timeline | Phase 4 |
| 9.3 | Post features (text, media, polls, threads, reposts, quotes) | Posts, polls, reposts, comments exist | midan-screen, `/api/posts/**`, `/api/polls/**`, `poll-creator.tsx` | PARTIAL | No threads, no quote-posts | Phase 4 |
| 9.4 | Anonymous posting | Backend supports visibility=anonymous; no UI toggle | `/api/posts/route.ts` L221, `src/lib/circle/types.ts` | PARTIAL | UI toggle missing in composer | Phase 4 |
| 9.5 | Federation (ActivityPub, Mastodon follow/boost) | None | — | MISSING — DEFERRED | No ActivityPub outbox/inbox | Deferred (ADR-001) |
| 9.6 | Trending & hashtags (velocity + city aggregation) | Trending velocity boost in feed-algorithm; hashtag-trending page is static | midan-screen L142, `src/lib/feed-algorithm.ts` | PARTIAL | Static fallback data | Phase 4 |
| 9.7 | Moderation & reporting (flag, jury appeal) | Jury system exists for CirkleCommit only, not Midan posts | `src/lib/commit-jury.ts`, `/api/commit/jury/**`, `/api/shield/report/route.ts` | PARTIAL | No Midan-specific moderation queue | Phase 3 |
| 9.8 | Privacy controls (Midan-specific: hide online, block screenshots of public posts) | None | — | MISSING | Inherits Wasl ghost mode only | Phase 5 |
| 9.9 | On-device personalization for For You (matrix factorization reuse) | None | — | MISSING — DEFERRED | Server-side IRDE/feed-algorithm | Deferred (ADR-001) |
| 9.11 | Zero-cost architecture (ActivityPub federation, IPFS media) | None | — | MISSING — DEFERRED | No federation, no IPFS | Deferred (ADR-001) |
| 9.13 | Compliance & data planes (per-plane Midan moderation) | None | — | MISSING | No region-specific content filtering | Phase 6 |
| 10.1 | The Circle overview (group system replacing FB Groups) | Type + read-only API + feature-directory overlay | `src/lib/circle/types.ts`, `/api/circles/route.ts`, `src/components/overlays/circle-hub.tsx` | PARTIAL | No actual group creation/management flow | Phase 3 (critical) |
| 10.2 | Creating a Circle (name, description, mode, category, invite) | None | — | MISSING | No create-circle overlay/screen; /api/circles is GET-only | Phase 3 (critical) |
| 10.3 | Roles & permissions (6-role RBAC) | Role type exists | `src/lib/circle/types.ts` | PARTIAL | No role assignment UI, no permission enforcement | Phase 3 |
| 10.4 | Circle modes (private/public/anonymous) | Type defined | types.ts | PARTIAL | No mode selection UI | Phase 3 |
| 10.5.1 | Events calendar (Circle events with RSVP) | None | — | MISSING | `upcomingEvent` field exists; no calendar UI | Phase 4 |
| 10.5.2 | Polls (Circle-specific) | Polls exist but are global, not scoped to a Circle | `/api/polls/**`, `poll-creator.tsx` | PARTIAL | No Circle-scoping | Phase 4 |
| 10.5.3 | File sharing (IPFS-based shared folder) | None | — | MISSING — DEFERRED | No file-sharing surface | Deferred (ADR-001) |
| 10.5.4 | Watch together (synced video) | Co-watch overlay exists; sync logic is demo only | `src/components/overlays/co-watch.tsx`, mashahd-screen L589 | PARTIAL | Demo only | Phase 5 |
| 10.5.5 | Knowledge wiki (collaborative Markdown) | Wiki overlay exists; not scoped to a Circle | `src/lib/knowledge-wiki.ts`, `src/components/overlays/knowledge-wiki.tsx`, `/api/wiki/pages/**` | PARTIAL | Global pages only | Phase 4 |
| 10.5.6 | Member directory (members list with roles) | None | — | MISSING | No Circle-level member directory | Phase 3 |
| 10.5.7 | Join requests (for private circles) | None | — | MISSING | No join-request surface | Phase 3 |
| 10.5.8 | Audit log (Circle action log) | None | — | MISSING | `work-mode.tsx` has audit log for Workspace, not Circle | Phase 5 |
| 10.6 | Privacy & security (E2EE for private circles) | None | — | MISSING — DEFERRED | `encrypted: boolean` flag only | Deferred (ADR-001) |
| 10.7 | Integration with other modules | Module map exists; no real cross-link | `src/lib/circle/modules.ts` | PARTIAL | No real integration | Phase 5 |
| 10.8 | Zero-cost architecture (Matrix rooms, IPFS files) | None | — | MISSING — DEFERRED | See Part 3 | Deferred (ADR-001) |
| 10.10 | Comparison with competitors (FB Groups, Discord, Telegram) | None | — | MISSING | No comparison view | Phase 6 |
| 10.11 | Compliance & data planes (per-plane Circle rules) | None | — | MISSING | No region-aware Circle rules | Phase 6 |

---

## 5. Compliance Matrix — Parts 11-36 (Official Channels, Education, Creator Channels, Pro Network, Mesh, Verify, AI Safety, Self-Learning AI, Payments, Mail, OIDC, Travel, Maps, Translation, Mini Apps, Unique Features, Backup, Privacy, Governance, Monetization, Tech Stack, AI Catalogue, Deployment, Roadmap)

| Section | Requirement | Current State | Evidence | Status | Gap | Planned Phase |
|---|---|---|---|---|---|---|
| 11.1 | Official Channels: 5 types (Gov/Biz/NGO/Media/Emergency) | "BroadcastChannel" creator with 8 categories incl. Government/Emergency | `src/components/overlays/broadcast-channel.tsx` | PARTIAL | No per-type verification flow | Phase 4 |
| 11.2 | Verification process (domain/registration/manual) | None | — | MISSING | No verification pipeline for channel owners | Phase 4 |
| 11.3 | Emergency alerts 4 levels + bypassDND | None | — | MISSING | No alert-level enum, no bypassDND; `use-news-socket.ts` only surfaces toast | Phase 4 |
| 11.4 | Directory & discovery with on-device recommendations | Lists in-session channels; no persistent directory, no recommendation model | `src/components/overlays/broadcast-channel.tsx` | PARTIAL | No persistent directory | Phase 4 |
| 11.5 | Data plane compliance (CN/RU/EU) | Data-residency rules for 6 data types; no channel-specific routing | `src/lib/data-residency.ts` | PARTIAL | No channel-specific routing | Phase 6 |
| 12.1 | Educational Workspaces (Matrix-based, self-hosted) | Local Prisma-backed gradebook, NOT Matrix | `src/lib/education.ts`, `src/components/overlays/cirkle-gradebook.tsx`, `src/app/api/edu/*` | PARTIAL | No self-hosted Wasl Maktab installer | Phase 7 |
| 12.2 | Multi-audience management (students/parents/teachers/admins) | Teacher + students only | `src/lib/education.ts` | PARTIAL | No parent role, no admin role | Phase 5 |
| 12.3 | CSV bulk upload + auto-provisioning | None | — | MISSING | No CSV wizard | Phase 5 |
| 12.4.1 | Assignments + submissions (m.assignment Matrix event) | DB rows for Assignment + Submission; not Matrix events | `src/app/api/edu/assignments/[id]/submit/route.ts` | PARTIAL | Not Matrix events | Phase 7 |
| 12.4.2 | Grade publishing (private 1:1, anonymised class) | Grades stored on Submission.grade | `src/app/api/edu/grades/route.ts` | PARTIAL | No anonymised class broadcast | Phase 5 |
| 12.4.3 | Attendance tracking | Per-student per-day unique record | `src/app/api/edu/attendance/route.ts`, `src/lib/education.ts` | IMPLEMENTED | — | — |
| 12.4.4 | Parent-teacher conferences (auto E2EE 1:1 chat) | None | — | MISSING | No signup-sheet → private chat flow | Phase 5 (blocked on §3.2) |
| 12.4.5 | Fee payment (non-custodial widget) | None | — | MISSING | No school fee collection widget | Phase 5 (blocked on §19) |
| 12.4.6 | Permission slips (digital consent) | None | — | MISSING | No digital consent form / poll | Phase 5 |
| 12.6 | COPPA / GDPR-K compliance for minors | None | — | MISSING | No parental consent gate, no minor-mode processing limits | Phase 5 |
| 12.10 | Workspace Manager audit log + retention policies | None | — | MISSING | No admin audit log, no retention policy engine | Phase 6 |
| 13.1 | Creator Channels: 100% free, PeerTube-backed | Monetization dashboard exists; no PeerTube, no federation, no IPFS | `src/components/overlays/creator-studio.tsx`, `src/app/api/creator/*` | PARTIAL — DEFERRED | No PeerTube node | Deferred (ADR-001) |
| 13.2 | Channel creation (<30s, self-service) | None | — | MISSING | No "Create Channel" flow in Profile | Phase 4 |
| 13.3 | Channel trailer, playlists, community posts | None | — | MISSING | — | Phase 5 |
| 13.4 | Live streaming + P2P | None | — | MISSING — DEFERRED | No live streaming, no WebTorrent | Deferred (ADR-001) |
| 13.5 | Memberships + recurring revenue | Subscribe endpoint exists; no recurring billing, no tier gating | `src/app/api/creator/subscribe/route.ts` | PARTIAL | No billing engine | Phase 5 |
| 13.6 | Analytics (views, subs, geography) | Earnings tracked; no view analytics, no geographic breakdown | `src/app/api/creator/earnings/route.ts` | PARTIAL | No view analytics | Phase 5 |
| 14.1 | Pro Network: separate professional profile | Headline, summary, skills, experience, education, availability | `src/lib/pro-network.ts`, `src/components/overlays/pro-network.tsx`, `src/app/api/pro/profile/route.ts` | IMPLEMENTED | — | — |
| 14.2 | Free job postings (Matrix messages) | DB-backed postings/applications; not Matrix messages | `src/app/api/jobs/route.ts`, `src/app/api/jobs/[id]/apply/route.ts` | PARTIAL | Not Matrix | Phase 7 |
| 14.3 | Connections + endorsements (signed) | Endorsements stored; not cryptographically signed, no spam-limited graph | `src/app/api/pro/endorse/route.ts` | PARTIAL | Not signed | Phase 5 |
| 14.4 | Anonymous salary insights (city aggregates) | p25/p50/p75 percentiles from posted salaries | `src/app/api/pro/salary/route.ts` | IMPLEMENTED | — | — |
| 14.5 | Job alerts + saved searches (on-device matching) | None | — | MISSING | No alert subscription, no saved search | Phase 5 |
| 14.6 | Company pages (integrated with Official Channels) | None | — | MISSING | — | Phase 6 |
| 15.1 | Local Mesh: BLE discovery + WiFi Direct transport | Uses `BroadcastChannel` API (browser tabs as mock peers); no BLE, no WiFi Direct, no libp2p | `src/lib/mesh-network.ts`, `src/components/overlays/mesh-dashboard.tsx` | PARTIAL — DEFERRED | No real mesh transport | Deferred (ADR-001/002) |
| 15.2 | Noise protocol E2EE | None | — | MISSING — DEFERRED | No Noise handshake; messages plaintext in IndexedDB | Deferred (ADR-001/002) |
| 15.3 | IPFS over libp2p file sharing | None | — | MISSING — DEFERRED | No IPFS in mesh layer | Deferred (ADR-001) |
| 15.4 | Emergency SOS broadcast (mesh + cellular relay) | None | — | MISSING — DEFERRED | No SOS button in mesh-dashboard | Deferred (ADR-001/002) |
| 15.5 | Group chats via flooding (≤50 participants) | 1:1 message queue only; no group fan-out | `src/lib/mesh-network.ts` | PARTIAL — DEFERRED | No group fan-out | Deferred (ADR-001/002) |
| 15.6 | Power optimisation (intermittent scan) | None | — | MISSING — DEFERRED | — | Deferred (ADR-002) |
| 16.1 | Circle Verify: on-device ID scan (OCR + MRZ) | POST fakes 4-step flow with 800ms delay; no real Tesseract/ML-Kit OCR, no MRZ parsing | `src/app/api/verify/start/route.ts` | PARTIAL | Mocked flow | Phase 5 |
| 16.2 | Liveness detection (MobileNetV2 ONNX, 15MB) | None | — | MISSING — DEFERRED | No ONNX runtime, no liveness model | Deferred (ADR-001) |
| 16.3 | Face matching (FaceNet/MobileFaceNet, 5MB) | None | — | MISSING — DEFERRED | No face embedding extraction | Deferred (ADR-001) |
| 16.4 | Signed attestation (Matrix device key, Ed25519) | HMAC-SHA256 signed by server key (not user device key); stored in Prisma not Matrix account data | `src/lib/identity.ts` | PARTIAL | Not user device key | Phase 5 |
| 16.5 | Uniqueness hash (salted SHA256) | `nullifier = SHA256(username + claimType)` — username-based, NOT ID-number + device-salt; reversible if username known | `src/lib/identity.ts` | PARTIAL | Reversible; not unique per identity | Phase 5 (critical) |
| 16.6 | Community-run uniqueness server | None | — | MISSING | All attestations issued by single cirkle-authority server key | Phase 7 |
| 16.7 | Community jury fallback (3 random verified users) | Jury system exists for CirkleCommit, NOT for Circle Verify edge cases | `src/lib/commit-jury.ts` | PARTIAL | Wrong scope | Phase 6 |
| 16.8 | Verifiable claims (over_18, nationality, professional, student) | 4 claim types: over_18, nationality, professional, unique_human | `src/lib/identity.ts` | PARTIAL | Missing student_status, over_21, government_issued_id | Phase 5 |
| 16.9 | China CTID integration (realname) | None | — | MISSING | — | Phase 8 (blocked on §4.5.1) |
| 16.10 | Salt recovery via Trusted Circle | None | — | MISSING — DEFERRED | No recovery flow (Part 27 dependency) | Deferred (ADR-001) |
| 17.1 | On-device NSFW detection (Falconsai/nsfw_image_detection ONNX, 350MB) | None | — | MISSING — DEFERRED | No ONNX runtime, no NSFW model; `privacy-shield.tsx` blurs UI but does not detect content | Deferred (ADR-001) |
| 17.2 | Server-side violence detection (KoalaAI/Moderation) | None | — | MISSING | No HuggingFace inference calls | Phase 3 (critical) |
| 17.3 | Server-side toxic comment detection (unitary/toxic-bert) | None | — | MISSING | No toxicity classifier | Phase 3 (critical) |
| 17.4 | On-device deepfake detection (dima806/deepfake_vs_real_image_detection) | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 17.5 | Threat assessment (custom DistilBERT + GROQ) | None | — | MISSING | No threat classifier, no GROQ integration | Phase 3 (critical) |
| 17.6 | Age-based blocking logic (under16/under18/adult) | None | — | MISSING | No age-gating in moderation pipeline | Phase 3 |
| 17.7 | Appeals system (community jury, 48h) | Jury system exists for agreements, NOT for moderation appeals | `src/lib/commit-jury.ts` | PARTIAL | Wrong scope | Phase 3 |
| 17.8 | China data plane: keyword filter + ModelScope + realname | None | — | MISSING | No keyword filter, no ModelScope swap | Phase 8 (blocked on §4.5.1) |
| 17.9 | Content actions (blur/block/flag/notify) | Manual privacy-shield toggle only | `src/components/overlays/privacy-shield.tsx` | PARTIAL | No automated action pipeline | Phase 3 |
| 18.1 | On-device training: matrix factorisation (64-dim, SGD) | None | — | MISSING — DEFERRED | `feed-algorithm.ts` is server-side Prisma SQL; no on-device SGD | Deferred (ADR-001) |
| 18.2 | Smart reply fine-tuning (DistilGPT2, last-layer PEFT) | None | — | MISSING — DEFERRED | `/api/ai/smart-reply` calls generic `aiComplete()`; no fine-tuning | Deferred (ADR-001) |
| 18.3 | Spam filter (LR + TF-IDF, online learning) | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 18.4 | Travel preferences (LightGBM) | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 18.5 | Search ranking (RankNet pairwise) | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 18.6 | Federated learning (FedAvg, secure aggregation, DP ε=1.0) | Server-side in-memory aggregation; consent-gated; **no DP noise, no secure aggregation, no real client-side weight computation** | `src/lib/brain-federated.ts` | PARTIAL — DEFERRED | No DP, no secure aggregation | Deferred (ADR-001) |
| 18.7 | Model distribution via IPFS / static CDN | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 18.8 | Item embeddings weekly update (10MB JSON from cdn.circle.app) | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 18.9 | Privacy dashboard (installed models, training history, reset, opt-out) | None | — | MISSING — DEFERRED | No model-management UI | Deferred (ADR-001) |
| 19.1 | Non-custodial payments (no billing details collected) | App stores no card numbers; transactions are mock DB rows | `src/lib/regional-payments.ts`, `src/screens/pay-screen.tsx`, `src/app/api/payments/send/route.ts` | PARTIAL | Mock transactions, not real on-chain/bank transfers | Phase 5 |
| 19.2 | QR code unified standard per country | QR scan UI exists; no unified QR parser, no per-country standard | `src/screens/pay-screen.tsx` | PARTIAL | No parser | Phase 5 |
| 19.3 | NFC tap-to-pay (offline) | NFC icon-only; no `nfc_manager` integration | `src/screens/pay-screen.tsx` | MISSING — DEFERRED | No NFC integration | Deferred (ADR-002) |
| 19.4 | CBDC support (digital yuan, digital rupee, digital euro) | None | — | MISSING | — | Phase 8 |
| 19.5 | Crypto / stablecoin non-custodial (USDC/USDT/cNGN/MMXN) | Only "USDC" string in mesh-dashboard option; no wallet, no on-chain send | — | MISSING | No wallet integration | Phase 8 |
| 19.6 | Provider-agnostic payment router (Fawry/Vodafone/InstaPay/UPI/Pix/WeChat/Alipay) | Returns regional provider list with `checkoutUrl` links — redirect to external site | `src/lib/regional-payments.ts` | PARTIAL | No in-app widget | Phase 5 |
| 19.7 | Non-custodial creator tipping + virtual gifts | Support endpoint records tips as DB rows; no non-custodial wallet, no virtual gifts | `src/app/api/creator/support/route.ts` | PARTIAL | Ledger only | Phase 5 (blocked on §16) |
| 19.8 | Corporate/advertiser invoice-based payments | CPM-based campaigns, spend tracking, invoice generation | `src/lib/ad-engine.ts`, `src/app/api/ads/invoice/route.ts` | IMPLEMENTED | — | — |
| 19.9 | Cross-plane payment federation (CN/RU/EU/IR/VN routing) | None | — | MISSING | — | Phase 8 |
| 19.10 | Referral fee tracking from payment providers | None | — | MISSING | — | Phase 6 |
| 20.1 | Circle Mail @circle.app (5GB free, no billing) | Internal username→username only — explicitly "no SMTP, no external delivery" | `src/lib/circle-mail.ts`, `src/components/overlays/circle-mail.tsx`, `src/app/api/mail/{send,inbox,[id]/read}` | PARTIAL — DEFERRED | Not real email | Deferred (ADR-001) |
| 20.2 | IMAP/SMTP/webmail | None | — | MISSING — DEFERRED | No IMAP, no SMTP, no webmail client | Deferred (ADR-001) |
| 20.3 | Mailcow self-hosted deployment | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 20.4 | Spam filtering (on-device AI) | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 20.5 | Push notifications for new mail | None | — | MISSING — DEFERRED | No mail push channel | Deferred (ADR-001) |
| 20.6 | Integration with Wasl/Lamahat/Mashahd/Circle ID/Circle Payments | AI triage button calls /api/ai/summarize; no other integrations | `src/lib/circle-mail.ts` | PARTIAL — DEFERRED | No cross-module integration | Deferred (ADR-001) |
| 21.1 | Circle ID OIDC provider (Ory Hydra) | None | — | MISSING — DEFERRED | No Ory Hydra, no /.well-known/openid-configuration, no /oauth/authorize | Deferred (ADR-001) |
| 21.2 | Authorization Code Flow + PKCE + Refresh tokens | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 21.3 | Developer portal (self-service registration) | Bot API key system; not OIDC client registration | `src/components/overlays/bot-developer.tsx`, `src/app/api/bots/route.ts` | PARTIAL — DEFERRED | Not OIDC client registration | Deferred (ADR-001) |
| 21.4 | Granular consent per scope | Generic consent store; not OIDC scope-based | `src/lib/consent.ts` | PARTIAL — DEFERRED | Not scope-based | Deferred (ADR-001) |
| 21.5 | Verified claims exposed as OIDC scopes | Custom JWT export, NOT OIDC standard claims | `src/lib/identity.ts` | PARTIAL — DEFERRED | Not OIDC standard | Deferred (ADR-001) |
| 21.6 | Discovery endpoint + standard scopes (openid/profile/email) | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 22.1 | Circle Travel (Rihla): hotels/flights/trains/activities booking | Full search + saved trips | `src/screens/rihla-screen.tsx` (1500+ LOC), `src/app/api/{hotels,flights,airports}/search/route.ts` | IMPLEMENTED | — | — |
| 22.2 | AI itinerary builder (on-device) | Server-side `aiComplete()`; not on-device | `src/app/api/ai/itinerary/route.ts` | PARTIAL | Not on-device | Phase 5 |
| 22.3 | Travel document vault (encrypted, offline) | UI only; no encryption, no offline persistence | `src/screens/rihla-screen.tsx` (Wallet section) | PARTIAL | UI only | Phase 5 |
| 22.4 | Emergency SOS (mesh + cellular, auto-translate) | None | — | MISSING — DEFERRED | No SOS button; `cirkle-shield` is unrelated safety feature | Deferred (ADR-001/002) |
| 22.5 | Receipt scanner + expense tracker (on-device OCR) | UI exists; no real OCR (PaddleOCR) | `src/components/overlays/receipt-split.tsx`, `src/screens/rihla-screen.tsx` | PARTIAL | No real OCR | Phase 5 |
| 22.6 | Cultural interpreter (local dashboard) | Static tips; not AI-driven | `src/screens/rihla-screen.tsx` | PARTIAL | Static | Phase 5 |
| 22.7 | Lost & found mesh network | None | — | MISSING — DEFERRED | — | Deferred (ADR-001/002) |
| 22.8 | Medical card (lock screen QR) | None | — | MISSING | — | Phase 6 |
| 22.9 | Offline maps + routing | Uses live OSM/OSRM; no offline tile/region pack | `src/lib/cirkle-maps.ts`, `src/components/overlays/cirkle-maps.tsx` | PARTIAL — DEFERRED | No offline packs | Deferred (ADR-001) |
| 23.1 | TileServer GL (self-hosted tiles) | None | — | MISSING — DEFERRED | Uses public OSM embed iframe; no self-hosted tiles | Deferred (ADR-001) |
| 23.2 | Nominatim (self-hosted geocoding) | Uses public nominatim.openstreetmap.org (rate-limited); not self-hosted | `src/lib/cirkle-maps.ts`, `src/app/api/maps/geocode/route.ts` | PARTIAL — DEFERRED | Not self-hosted | Deferred (ADR-001) |
| 23.3 | OSRM (self-hosted routing) | Uses public router.project-osrm.org; not self-hosted | `src/lib/cirkle-maps.ts`, `src/app/api/maps/route/route.ts` | PARTIAL — DEFERRED | Not self-hosted | Deferred (ADR-001) |
| 23.4 | Overpass API (POI search) | Uses public overpass-api.de; not self-hosted | `src/lib/cirkle-maps.ts` | PARTIAL — DEFERRED | Not self-hosted | Deferred (ADR-001) |
| 23.5 | Offline region packs (MBTiles on device) | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 23.6 | Community node deployment script | None | — | MISSING — DEFERRED | No deploy-maps-complete.sh | Deferred (ADR-001) |
| 23.7 | Privacy (no tracking, no location history) | "no tracking, no telemetry, no API keys" — descriptive User-Agent only | `src/lib/cirkle-maps.ts` | IMPLEMENTED | — | — |
| 24.1 | NLLB-200 on-device (200 languages, 900MB ONNX) | None | — | MISSING — DEFERRED | `/api/ai/translate` calls generic `aiComplete()`; no NLLB model | Deferred (ADR-001) |
| 24.2 | Whisper STT on-device (150MB) | None | — | MISSING — DEFERRED | `whisper-mode.tsx` overlay is about ephemeral messages, NOT OpenAI Whisper STT | Deferred (ADR-001) |
| 24.3 | Piper TTS on-device (50MB) | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 24.4 | Real-time speech-to-speech pipeline | None | — | MISSING — DEFERRED | `live-translate.tsx` shows hardcoded mock utterances; no real STT/TTS pipeline | Deferred (ADR-001) |
| 24.5 | Image translation (OCR) | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 24.6 | On-device vs server routing | None | — | MISSING — DEFERRED | All translation goes through /api/ai/translate server endpoint | Deferred (ADR-001) |
| 24.7 | Integration with Wasl/Mashahd/Lamahat/Midan/Rihla/Mail | Single translate endpoint; no per-module integration | `src/app/api/ai/translate/route.ts` | PARTIAL — DEFERRED | No per-module integration | Deferred (ADR-001) |
| 25.1 | Open, permissionless Mini App publishing | Bot/Mini App registration exists; no approval workflow | `src/app/api/mini-apps/{list,register}/route.ts`, `src/app/api/bots/route.ts` | PARTIAL | No approval workflow | Phase 5 |
| 25.2 | Sandboxed WebView isolation | None | — | MISSING | No WebView container; mini-apps are external `widget` URLs | Phase 6 (blocked on ADR-002) |
| 25.3 | Granular permissions (no cross-app tracking) | Bot SDK has scopes; no sandboxed enforcement | `src/lib/bot-sdk.ts` | PARTIAL | No sandboxed enforcement | Phase 6 |
| 25.4 | Universal App Hub (geo-regional alternatives: Uber→Didi→Snapp!) | Static per-country service list; no automatic geo-routing engine | `src/components/overlays/overlay-browser.tsx`, `src/lib/regional-payments.ts` | PARTIAL | No auto-routing | Phase 5 |
| 25.5 | Developer SDK + documentation | Client SDK exists; no public docs site | `src/lib/bot-sdk.ts` | PARTIAL | No public docs | Phase 5 |
| 25.6 | 0% commission | No commission logic anywhere | — | IMPLEMENTED | — | — |
| 25.7 | Example Mini Apps (Uber/Didi/Meituan stubs) | None | — | MISSING | Only service URL links in `regional-payments.ts` | Phase 5 |
| 26.1 | Smart Post Router (auto cross-post Wasl/Lamahat/Midan/Mashahd) | None | — | MISSING | Only `brain-orchestrator.ts` references the name as a "pending" step | Phase 5 |
| 26.2 | Personal AI Memoir (encrypted life journal, time capsules) | API endpoint returns generated text; time-capsule is separate scheduling UI; no encrypted journal persistence, no auto-generation from activity | `src/app/api/ai/memoir/route.ts`, `src/components/overlays/time-capsule.tsx` | PARTIAL | No encrypted journal persistence | Phase 5 |
| 26.3 | Knowledge Circles (group wikis on IPFS) | Versioned pages with ipfsHash field (placeholder); stored in Prisma, not real IPFS | `src/lib/knowledge-wiki.ts`, `src/components/overlays/knowledge-wiki.tsx`, `src/app/api/wiki/pages/[slug]/{,history}/route.ts` | IMPLEMENTED | ipfsHash field is placeholder | Phase 6 |
| 26.4 | Offline Content Stash (save anything for offline) | None | — | MISSING | — | Phase 5 |
| 26.5 | Decentralised Ticketing (Ed25519-signed, fraud-proof) | Real Ed25519 signing; keypair persisted in `db/ticket-keys.json` | `src/lib/ticketing.ts`, `src/components/overlays/ticket-mint.tsx`, `src/app/api/tickets/{issue,verify,my}/route.ts` | IMPLEMENTED | — | — |
| 26.6 | Family Vault (encrypted, cloud-free album) | Real AES-256-GCM + PBKDF2 (200k iter) client-side encryption; server stores ciphertext only | `src/lib/family-vault.ts`, `src/components/overlays/family-vault.tsx`, `src/app/api/vault{,/family}/route.ts` | IMPLEMENTED | — | — |
| 26.7 | Anonymous Help Circles (pseudonymous support groups) | None | — | MISSING — DEFERRED | No anonymous-circle UI; ghost-mode is app-wide, not per-circle | Deferred (ADR-001) |
| 26.8 | Echoes (Duets — reaction video overlays) | UI mockup with style picker; no actual duet/overlay video rendering | `src/components/overlays/echo-remix.tsx` | PARTIAL | Mockup only | Phase 6 |
| 26.9 | Bullet Comments (Danmaku) | Per-video-timestamp bullets with color, speed control | `src/lib/bullet-comments.ts`, `src/components/overlays/bullet-comments.tsx`, `src/app/api/posts/[id]/bullets/route.ts` | IMPLEMENTED | — | — |
| 26.10 | Smart Notifications (on-device clustering + digest) | None | — | MISSING | `smart-inbox.tsx` is a static categorization UI; no clustering engine | Phase 5 |
| 27.1 | Method 1: Encrypted local backup (AES-256-GCM + PBKDF2) | Real AES-256-GCM, 200k PBKDF2 iterations, salt+IV+tag blob | `src/lib/backup-migrate.ts`, `src/components/overlays/phone-migrate.tsx`, `src/app/api/backup/create/route.ts` | IMPLEMENTED | — | — |
| 27.2 | Method 2: Passphrase-protected IPFS backup | None | — | MISSING — DEFERRED | No IPFS upload | Deferred (ADR-001) |
| 27.3 | Method 3: M-of-N Trusted Circle Recovery | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 27.4 | Method 4: Matrix Key Backup (E2EE recovery) | None | — | MISSING — DEFERRED | No Matrix integration | Deferred (ADR-001) |
| 27.5 | Phone migration QR token (10-min signed) | Generates signed migration token | `src/lib/backup-migrate.ts`, `src/app/api/backup/migrate/route.ts` | IMPLEMENTED | — | — |
| 27.6 | Backup content: posts, transactions, vault memberships, poll votes, bullets | 5 data types included; missing messages, mail, identity attestations | `src/lib/backup-migrate.ts` (BackupPayload) | PARTIAL | Missing 3 data types | Phase 5 |
| 27.7 | Salt recovery via Trusted Circle | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 28.1 | Privacy Dashboard (score, risk simulation, self-audit, export, delete) | DSR (5 types) + export + delete; **no privacy score, no risk simulation, no self-audit report** | `src/components/overlays/privacy-shield.tsx`, `src/components/overlays/dsr-request.tsx`, `src/app/api/account/{dsr,export,delete}/route.ts` | PARTIAL | No privacy score / risk simulation | Phase 4 |
| 28.2 | Dual Identity (public vs private persona, linkable at user discretion) | Single ghost-mode toggle; no separate public/private persona management | `src/lib/app-store.ts` (ghostMode) | PARTIAL | No dual persona | Phase 5 |
| 28.3 | Screenshot & forwarding consent (per-message, per-contact, watermarking) | "Require screenshot consent" toggle per-conversation; **no actual screenshot detection, no watermarking, no per-message granularity** | `src/screens/wasl-screen.tsx:3282` | PARTIAL | No detection / watermarking | Phase 5 |
| 28.4 | Data minimisation (location never sent to servers) | Rules defined; no enforcement layer | `src/lib/data-residency.ts` | PARTIAL | No enforcement | Phase 4 |
| 28.5 | Retention policies (auto-delete after period) | None | — | MISSING | — | Phase 5 |
| 28.6 | Granular consent management (per-permission, per-app, revocable) | Generic consent store with `hasConsent()`/`setConsent()`; not per-app UI | `src/lib/consent.ts` | PARTIAL | Not per-app UI | Phase 5 |
| 28.7 | Transparency (public moderation logs, algorithmic explanations) | None | — | MISSING | No public log, no algorithmic explanation layer | Phase 6 |
| 28.8 | Annual audits | None | — | MISSING | — | Phase 7 |
| 29.1 | Community Council (elected, policy decisions) | None | — | MISSING | `governance-center.tsx` has empty `proposals: Proposal[] = []` array | Phase 6 |
| 29.2 | Technical Steering Committee (contributor-weighted vote) | None | — | MISSING | — | Phase 6 |
| 29.3 | Moderation Jury (random verified users, 48h) | Jury system exists for CirkleCommit only, NOT for content moderation | `src/lib/commit-jury.ts` | PARTIAL | Wrong scope | Phase 3 |
| 29.4 | Public moderation log (anonymised) | None | — | MISSING | — | Phase 6 |
| 29.5 | Financial transparency (treasury, monthly burn, audit trail) | **Static hardcoded FINANCES array** with mock numbers ("SAR 4,820 treasury", "218 contributors"); no real ledger | `src/components/overlays/governance-center.tsx` | PARTIAL | Mock numbers | Phase 6 |
| 29.6 | Future DAO (non-transferable reputation tokens) | None | — | MISSING | — | Phase 9 |
| 29.7 | Voting infrastructure (one person, one vote) | None | — | MISSING | — | Phase 6 |
| 30.1 | 100% free users (no subscriptions, no IAP, no paywalls) | No billing UI anywhere; users never see a payment form | — | IMPLEMENTED | — | — |
| 30.2 | Ad placements: Dashboard, Midan, search (NOT in private chats/videos) | Ad serve engine exists; placement enforcement not coded | `src/lib/ad-engine.ts`, `src/app/api/ads/serve/route.ts` | PARTIAL | No placement enforcement | Phase 4 |
| 30.3 | Advertiser self-serve portal | Campaign creation UI; no real advertiser onboarding | `src/components/overlays/ad-studio.tsx`, `src/app/api/ads/campaigns/route.ts` | PARTIAL | No onboarding flow | Phase 5 |
| 30.4 | Non-targeted, local ads (city-level, no profiling, no retargeting) | serveAd receives only country+city+category; no user ID, no cookies | `src/lib/ad-engine.ts` | IMPLEMENTED | — | — |
| 30.5 | Revenue projections (Year 1 Egypt) | None | — | MISSING | No projection dashboard | Phase 6 |
| 30.6 | Referral + affiliate revenue tracking | None | — | MISSING | — | Phase 6 |
| 30.7 | Legal compliance (GDPR/CCPA, ad labeling) | Legal docs present; no ad-label UI | `src/components/overlays/privacy-policy.tsx`, `src/components/overlays/terms-of-service.tsx` | PARTIAL | No ad-label UI | Phase 4 |
| 30.8 | Zero-cost ad infrastructure (community node, static JSON, IPFS) | Prisma-backed; not static JSON, not IPFS | `src/lib/ad-engine.ts` | PARTIAL — DEFERRED | Not static/IPFS | Deferred (ADR-001) |
| 30.9 | Invoice-based corporate payments (no user billing) | Invoice generation with settled campaign spend | `src/lib/ad-engine.ts`, `src/app/api/ads/invoice/route.ts` | IMPLEMENTED | — | — |
| 31.1 | Flutter dependencies (pubspec.yaml) | Project is Next.js 16 + React + TypeScript (not Flutter) | — | MISSING | Architecture divergence — see ADR-001 | ADR-001 dependent |
| 31.2 | Backend services (Matrix Synapse, Ory Hydra, PeerTube, ntfy, MinIO, IPFS Kubo, TileServer GL, Nominatim, OSRM, Mailcow) | None of these Docker services are deployed; everything is a single Next.js app + Prisma/SQLite | — | MISSING — DEFERRED | All deferred pending ADR-001 | Deferred (ADR-001) |
| 32.1 | Zero-cost AI model catalogue (NSFW, violence, toxic, deepfake, NLLB, DistilGPT2, BART, OCR, liveness, face, Whisper, Piper, vit-gpt2, SmolLM2) | No ONNX runtime, no model download manager; models only described in `autonomous-intelligence/data-sources/ai-models.ts` as DataSourceConfig metadata | — | MISSING — DEFERRED | Models described but not loaded | Deferred (ADR-001) |
| 32.2 | Model download strategy (Wi-Fi-only, cache, monthly updates, user delete) | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 33.1 | Wasl Maktab one-click installer | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 33.2 | Community PeerTube node deployment | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 33.3 | Mailcow deployment | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 33.4 | Map server (TileServer GL + Nominatim + OSRM) deployment | None | — | MISSING — DEFERRED | — | Deferred (ADR-001) |
| 33.5 | China data plane (Alibaba Cloud, CTID, ModelScope) | None | — | MISSING | — | Phase 8 |
| 34.1 | Phased roadmap (9 phases) | Phases 4.5 and 5 documented; Phases 1-3, 6-9 not | `docs/phase-4.5-architecture.md`, `docs/phase-5-uob-specification.md` | PARTIAL | Phases 1-3, 6-9 undocumented | Phase 1 |
| 35.1 | User journey examples (9 personas) | None | — | MISSING | Documentation only | Phase 6 |
| 36.1 | Gap analysis v10→v12 (25 features added) | Documentation only | — | MISSING | Maps directly to this audit | — |

---

## 6. Top Priority Gaps

### Tier 1 — Critical for Year-1 Egypt Launch

| # | Section | Why Critical |
|---|---|---|
| 1 | §8.8 / §17.1-17.9 — AI Safety & Moderation | **No content moderation pipeline exists at all.** Legal exposure for CSAM/terror content. |
| 2 | §10.1-10.7 — Circle Groups creation + RBAC | Biggest feature gap; types exist but no user-facing flow. |
| 3 | §16.5 — Uniqueness hash | Current nullifier is reversible (username-based); Sybil attack vector. |
| 4 | §19.6 — Real payment provider integration | Transactions are mock DB rows; users may believe payments are real. |
| 5 | §11.3 — Emergency alerts (4 levels + bypassDND) | Core safety feature for Egyptian government partnership. |

### Tier 2 — Identity & Safety Backbone

| # | Section | Why Important |
|---|---|---|
| 6 | §16.4 — Ed25519 device attestation | Currently HMAC-SHA256 signed by server key; not user-controlled. |
| 7 | §16.7 — Community jury for Verify edge cases | Currently scoped to CirkleCommit only. |
| 8 | §17.7 — Moderation appeals jury | Currently scoped to CirkleCommit only. |
| 9 | §28.1 — Privacy score + risk simulation | DSR exists but no privacy dashboard. |
| 10 | §29.3 — Moderation jury (48h random verified) | Currently scoped to CirkleCommit only. |

### Tier 3 — Strategic Differentiators

| # | Section | Why Important |
|---|---|---|
| 11 | §22.5 — Receipt scanner OCR | Travel use-case differentiator. |
| 12 | §26.1 — Smart Post Router | Cross-module engagement multiplier. |
| 13 | §26.10 — Smart Notifications clustering | Notification hygiene. |
| 14 | §26.4 — Offline Content Stash | Connectivity-resilience differentiator. |
| 15 | §25.4 — Universal App Hub auto-routing | Geo-aware alternatives for travelers. |

---

## 7. Architectural Divergences from Blueprint v12.0

| # | Divergence | Impact | Resolution |
|---|---|---|---|
| 1 | **Next.js 16 + React** instead of Flutter | Codebase is web, not native | ADR-001 (this doc set) |
| 2 | **No Matrix/ActivityPub/IPFS/PeerTube/Mailcow/ntfy** | All P2P/federation infrastructure is conceptual | Deferred (ADR-001) |
| 3 | **No on-device ONNX runtime** | Blueprint specifies 14 on-device models (~5 GB); none loaded | Deferred (ADR-001) |
| 4 | **No real E2EE** (Olm/Megolm) | `encrypted: boolean` flag is decorative | Deferred (ADR-001) |
| 5 | **Custom JWT attestation replaces Ory Hydra** | `identity.ts` issues HMAC-signed JWTs (not Ed25519 device keys); attestation storage is Prisma, not Matrix account data | Deferred (ADR-001) |
| 6 | **Single-region deployment** | No China (Alibaba + CTID + ModelScope), no Russia, no Iran, no Vietnam, no EU data planes deployed | Phase 5-8 |
| 7 | **Translation/Moderation/AI via generic `aiComplete()`** | No model-specific routing, no on-device fallback, no privacy-preserving local inference | Deferred (ADR-001) |
| 8 | **Codebase over-invested in Brain AI cognitive architecture** (TGSE/CIE/TEE/LIEE/UOB/AHG/IRDE/CRIE/PCPF) — NOT in blueprint | Significant effort spent on architecture beyond blueprint scope | Document in ADR-003 |

---

## 8. Change Log

| Date | Change | Author |
|---|---|---|
| 2026-08-09 | Initial matrix from AUDIT-BLUEPRINT-1 + AUDIT-BLUEPRINT-2 results | Architecture Council |

---

**End of CIRKLE-BLUEPRINT-COMPLIANCE.md**

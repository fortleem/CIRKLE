# CIRKLE — Feature Dependency Matrix

| Field | Value |
|---|---|
| **Document** | Feature Dependency Matrix |
| **Version** | 1.0 |
| **Date** | 2026-08-09 |
| **Status** | Living document — updated as features ship |
| **Owner** | CIRKLE Architecture Council |
| **Related** | `ADR-001-platform-strategy.md`, `CIRKLE-BLUEPRINT-COMPLIANCE.md`, `DEFERRED_FEATURES.md` |
| **Audit baseline** | Codebase HEAD `be6755e` |

---

## 1. Purpose

This document captures the **dependency relationships** between the major
feature pillars of CIRKLE. For each feature it lists:

- **Depends On** — upstream features or infrastructure that must exist first.
- **Blocks** — downstream features that cannot ship until this one ships.
- **Security Risk** — the security exposure if this feature is mis-implemented
  or shipped without its dependencies.
- **Architecture Risk** — the architectural exposure (technical debt, platform
  incompatibility, performance risk) introduced by this feature.

The matrix is the authoritative reference for sprint planning, deferral
decisions, and risk acceptance.

---

## 2. Legend

- **SEC risk levels:** 🟢 Low · 🟡 Medium · 🟠 High · 🔴 Critical
- **ARCH risk levels:** 🟢 Low · 🟡 Medium · 🟠 High · 🔴 Critical
- **State:** ✅ Implemented · ⚠️ Partial · ❌ Missing · ⏸️ Deferred (see DEFERRED_FEATURES.md)

---

## 3. Dependency Matrix

| # | Feature | State | Depends On | Blocks | Security Risk | Architecture Risk |
|---|---|---|---|---|---|---|
| 1 | **Circle ID (Custom JWT attestation)** | ⚠️ Partial | Auth store, Prisma `VerifyClaim` model | Circle Verify (§16), Circle ID OIDC (§21), Creator Tipping KYC, Governance voting | 🟠 High — HMAC-SHA256 signed by *server* key, not user device key; nullifier derived from username (reversible); no Ed25519 device attestation | 🟡 Medium — replaces Ory Hydra from blueprint; works for now but blocks federation with other OIDC consumers |
| 2 | **Circle ID OIDC (Ory Hydra)** | ❌ Missing → ⏸️ Deferred | Circle ID attestation, consent framework | Sign-in-with-Cirkle for third-party apps, Bot developer portal OAuth, Cross-plane federation login | 🟠 High — without standard OIDC, third-party apps must trust custom JWT; no PKCE/refresh-token flow | 🟡 Medium — deploy Ory Hydra as a sidecar; ~2 weeks eng |
| 3 | **E2EE Messaging (Olm/Megolm)** | ❌ Missing → ⏸️ Deferred | Web Crypto (✅), Identity attestation, device key management | Wasl Work Mode (§6.4), Circle Group private mode (§10.6), Mail E2EE (§20), Backup Method 4 Matrix Key Backup (§27.4) | 🔴 Critical — current `encrypted: boolean` flag is decorative; messages stored plaintext in Postgres; admin/DBA can read all DMs | 🟠 High — Olm/Megolm port to WASM or libolm binding required; Megolm group ratchet is non-trivial |
| 4 | **Circle Mail (internal-only mock)** | ⚠️ Partial | Prisma `MailMessage` model, AI summarize endpoint | Mailcow real email (§20.3), Mail push notifications, Cross-module mail integration | 🟡 Medium — internal-only, no SMTP exposure; but mail contents are unencrypted at rest | 🟡 Medium — Mailcow deployment is ~1 week but defers pending ADR-001 |
| 5 | **Circle Mail (Mailcow @circle.app)** | ❌ Missing → ⏸️ Deferred | Mailcow Docker stack, DNS MX records, postmaster@circle.app | External email delivery, third-party services that require email verification, Push for new mail | 🟠 High — Mailcow is a full SMTP server; spam/abuse vector; needs outbound rate limiting, DKIM/SPF/DMARC | 🟠 High — operating a public mail server is high-touch (deliverability, IP reputation, abuse handling) |
| 6 | **Universal Translation Layer** | ⚠️ Partial | `/api/ai/translate` server endpoint (✅) | Real-time speech translation (§24.4), Image OCR translation (§24.5), Cultural interpreter (§22.6) | 🟢 Low — server-side translation reveals message content to LLM provider | 🟠 High — NLLB-200 (900 MB) on-device is infeasible on iOS Safari without WebGPU; server fallback required |
| 7 | **On-Device Translation (NLLB-200 ONNX)** | ❌ Missing → ⏸️ Deferred | WebGPU or native wrapper, ONNX Runtime Web, model download manager | Privacy-preserving translation (§24.6), off-grid translation, Midan/Mashahd caption translation | 🟢 Low — on-device is more private than server | 🔴 Critical — 900 MB model is too large for WASM on iOS; WebGPU still in development on Safari; defers pending ADR-001 |
| 8 | **AI Safety & Content Moderation** | ❌ Missing | NSFW/violence/toxic/deepfake ONNX models, appeals jury | Mashahd upload moderation, Lamahat photo moderation, Midan post moderation, Creator Channel compliance | 🔴 Critical — **no content moderation pipeline exists at all**; platform is legally exposed for CSAM/terror content in all jurisdictions | 🟠 High — must build pipeline with on-device NSFW (privacy) + server-side violence/toxic (capability) + appeals jury |
| 9 | **Moderation Appeals Jury** | ⚠️ Partial | `commit-jury.ts` exists for CirkleCommit disputes | Content moderation appeals (§17.7), Community governance (§29.3) | 🟢 Low — jury system is transparency-positive | 🟡 Medium — extend existing jury from "agreement disputes" to "content moderation appeals"; new schema + UI |
| 10 | **Circle Groups (creation + RBAC)** | ⚠️ Partial | Prisma `CircleGroup` model, role enum defined | Circle Events Calendar, Member Directory, Join Requests, Audit Log, Circle-scoped Polls/Wiki/Co-watch | 🟡 Medium — no role enforcement means any member can do anything | 🟠 High — biggest feature gap (blueprint Part 10); types exist but no creation flow, no permission checks |
| 11 | **Circle Group E2EE (private circles)** | ❌ Missing | E2EE Messaging (Olm/Megolm) | Private circle file sharing, anonymous help circles | 🔴 Critical — private circles store plaintext in Postgres | 🟠 High — blocked on E2EE dependency |
| 12 | **Local Mesh (BLE + Wi-Fi Direct)** | ⚠️ Partial → ⏸️ Deferred | Web Bluetooth (Android Chrome only) OR native wrapper (ADR-002) | Off-grid messaging, Emergency SOS mesh relay, Lost & found mesh, Anonymous Help Circles | 🟠 High — current `mesh-network.ts` uses `BroadcastChannel` (browser tabs only); no real P2P | 🔴 Critical — Web Bluetooth has no iOS Safari support; Wi-Fi Direct is impossible in browsers; defers pending ADR-002 native wrapper |
| 13 | **Mesh E2EE (Noise protocol)** | ❌ Missing → ⏸️ Deferred | Local Mesh transport, Web Crypto | Secure off-grid messaging, anonymous mesh SOS | 🔴 Critical — without Noise handshake, mesh messages are plaintext in IndexedDB | 🟠 High — Noise Protocol Framework port to WASM |
| 14 | **IPFS / libp2p Storage** | ❌ Missing → ⏸️ Deferred | IPFS Kubo node, helia (JS IPFS) or native binding | Public Mashahd video distribution, Lamahat photo IPFS CIDs, Knowledge Circle wikis, Backup Method 2 (passphrase IPFS) | 🟡 Medium — IPFS public gateway exposes content to anyone with CID | 🟠 High — operating an IPFS pinning service has bandwidth/storage cost; needs ADR-003 (federated back-end) |
| 15 | **ActivityPub Federation (Midan)** | ❌ Missing → ⏸️ Deferred | ActivityPub outbox/inbox, signed HTTP signatures, actor key management | Mastodon interop, cross-instance follow/boost, federated trending hashtags | 🟠 High — ActivityPub servers can spam/federate illegal content; needs allow-list moderation | 🟠 High — full ActivityPub server implementation is ~1 month; defer pending ADR-003 |
| 16 | **PeerTube (Mashahd P2P video)** | ❌ Missing → ⏸️ Deferred | PeerTube instance, WebTorrent, ActivityPub for video federation | Mashahd 0% creator fees (real P2P distribution), federated video comments, channel memberships | 🟡 Medium — WebTorrent exposes user IP to peers; needs WebRTC privacy controls | 🟠 High — operating a PeerTube instance has storage/bandwidth cost; defer pending ADR-003 |
| 17 | **Self-hosted Mapping (TileServer GL + Nominatim + OSRM)** | ⚠️ Partial → ⏸️ Deferred | Public OSM endpoints work today (rate-limited) | Offline region packs, self-hostable community node deployment, Rihla offline maps, Mesh map sync | 🟢 Low — maps are public data; no PII | 🟡 Medium — operating 4 self-hosted services (tiles/geocode/route/POI) is ~2 weeks eng + ongoing infra cost |
| 18 | **Offline Map Region Packs (MBTiles)** | ❌ Missing | Self-hosted mapping stack | Offline routing, Rihla offline maps, Mesh map sync | 🟢 Low | 🟡 Medium — MBTiles generation pipeline + Service Worker cache strategy |
| 19 | **Circle Verify (on-device biometrics)** | ⚠️ Partial → ⏸️ Deferred | `/api/verify/start` 4-step mock exists | Creator KYC, governance voting eligibility, age-gated content, China CTID compliance | 🔴 Critical — current nullifier is `SHA256(username + claimType)` (reversible); uniqueness is not enforced; one user can register multiple accounts | 🟠 High — needs OCR (Tesseract WASM), liveness (MobileNetV2 ONNX), face match (FaceNet ONNX), Ed25519 device attestation |
| 20 | **Circle Payments (non-custodial)** | ⚠️ Partial | Prisma `Payment` model, `regional-payments.ts` provider router | Creator tipping, channel memberships, paid subscriptions, school fee payment | 🟠 High — transactions are mock DB rows, not real on-chain/bank transfers; users may believe payments are real | 🟡 Medium — integrate real payment providers (Fawry/Vodafone/InstaPay) via redirect; CBDC/crypto deferred |
| 21 | **Creator Tipping (MoonPay KYC + virtual gifts)** | ❌ Missing | Circle Payments, Circle Verify (KYC), Tipping algorithm (§7.4) | Mashahd creator income, Lamahat photo tips, Midan post tips | 🟠 High — without KYC, tipping is a money-laundering vector | 🟠 High — MoonPay integration + per-country widget selection decision tree is non-trivial |
| 22 | **NFC Tap-to-Pay (offline)** | ❌ Missing → ⏸️ Deferred | Native wrapper (ADR-002), NFC hardware, secure element | Offline payments, transit card integration, contactless identity | 🟠 High — NFC payment without secure element is insecure | 🔴 Critical — Web NFC has no iOS Safari support; defers pending ADR-002 |
| 23 | **CBDC / Stablecoin Support** | ❌ Missing → ⏸️ Deferred | Non-custodial wallet, on-chain send/receive, gas fee handling | Cross-plane payment federation, crypto creator payouts | 🔴 Critical — crypto custody is high-risk; non-custodial wallet UX is hard (seed phrase recovery) | 🔴 Critical — full wallet integration is multi-month; defer pending regulatory clarity |
| 24 | **Self-Learning AI (on-device training)** | ❌ Missing | WebGPU or ONNX Runtime Web training, IndexedDB weight storage | On-device matrix factorization (For You feed), DistilGPT2 smart reply fine-tuning, LR spam filter, LightGBM travel prefs, RankNet search ranking | 🟢 Low — on-device training is privacy-positive | 🔴 Critical — on-device SGD training in WASM is slow without WebGPU; federated learning aggregation server already exists (`brain-federated.ts`) but no real client training |
| 25 | **Federated Learning (FedAvg + DP)** | ⚠️ Partial | `brain-federated.ts` server aggregation, consent framework | Cross-device model training without centralizing data | 🟡 Medium — current implementation has no DP noise (ε=∞); re-identification risk | 🟠 High — secure aggregation protocol + DP noise injection is non-trivial |
| 26 | **Backup (local encrypted)** | ✅ Implemented | Web Crypto AES-256-GCM, PBKDF2 200k | Phone migration QR, salt recovery | 🟢 Low — already real; `backup-migrate.ts` is production-quality | 🟢 Low |
| 27 | **Backup (IPFS passphrase)** | ❌ Missing → ⏸️ Deferred | IPFS node, passphrase KDF | Cross-device restore without server trust | 🟡 Medium — IPFS public gateway exposes ciphertext (but it's encrypted) | 🟡 Medium — blocked on IPFS dependency |
| 28 | **Backup (M-of-N Trusted Circle Recovery)** | ❌ Missing → ⏸️ Deferred | Shamir's Secret Sharing, Trusted Circle UI | Salt recovery (§16.10), key recovery | 🟠 High — Shamir implementation must be constant-time | 🟠 High — UX design for "trusted circle" is non-trivial |
| 29 | **Backup (Matrix Key Backup)** | ❌ Missing → ⏸️ Deferred | E2EE Messaging (Olm/Megolm), Matrix server | Account recovery via homeserver | 🟡 Medium | 🟠 High — blocked on Matrix dependency |
| 30 | **Community Governance (Council + TSC + DAO)** | ⚠️ Partial | `governance-center.tsx` UI shell, Circle Verify (one-person-one-vote) | Public moderation log, financial transparency, future DAO reputation tokens | 🟠 High — without verified identity, voting can be Sybil-attacked | 🟡 Medium — proposals array is empty; static mock finances; ~2 weeks eng to wire up real voting |
| 31 | **Public Moderation Log** | ❌ Missing | Community Governance, moderation jury | Transparency report, algorithmic explanation | 🟢 Low — transparency-positive | 🟡 Medium — anonymization of log entries is non-trivial |
| 32 | **Mini Apps / Bot Platform** | ⚠️ Partial | `bot-sdk.ts`, `/api/bots`, `/api/mini-apps` | Universal App Hub, third-party developer ecosystem, 0% commission marketplace | 🟠 High — mini-apps run as external URLs; no sandboxing; XSS/phishing risk | 🟠 High — sandboxed WebView isolation for mini-apps is non-trivial |
| 33 | **Mini App Sandboxed WebView** | ❌ Missing | Native wrapper (ADR-002) or strict CSP iframe sandbox | Mini App permission enforcement, no cross-app tracking | 🟠 High — without sandbox, mini-apps can access parent app's storage | 🟠 High — defer pending ADR-002 |
| 34 | **Pro Network** | ✅ Implemented | Prisma `ProProfile` model, 4 API routes | Company pages, job alerts, salary insights (✅ already shipped) | 🟢 Low | 🟢 Low |
| 35 | **Educational Workspaces** | ⚠️ Partial | Prisma `Class`/`Assignment`/`Submission`/`Attendance` models, 4 API routes | Parent-teacher conferences, fee payment, permission slips, COPPA/GDPR-K | 🟡 Medium — no parent role, no minor-mode processing limits | 🟡 Medium — Matrix-based workspace was blueprint; current DB-backed works but no E2EE for grades |
| 36 | **Family Vault** | ✅ Implemented | Web Crypto AES-256-GCM, PBKDF2 200k, IndexedDB | Encrypted photo album, cloud-free storage | 🟢 Low — production-quality real crypto | 🟢 Low |
| 37 | **Decentralised Ticketing (Ed25519)** | ✅ Implemented | `tweetnacl` Ed25519, `db/ticket-keys.json` keypair | Event tickets, fraud-proof verification | 🟢 Low | 🟢 Low |
| 38 | **Bullet Comments (Danmaku)** | ✅ Implemented | Prisma `Bullet` model, video timestamp sync | Mashahd video engagement | 🟢 Low | 🟢 Low |
| 39 | **Knowledge Wiki** | ⚠️ Partial | Prisma `WikiPage` model, version history | Knowledge Circles (Circle-scoped wikis), IPFS-hosted wiki pages | 🟢 Low | 🟡 Medium — global pages only, not scoped to a Circle |
| 40 | **Smart Post Router** | ❌ Missing | Brain Orchestrator, multi-module post composer | Auto cross-post Wasl/Lamahat/Midan/Mashahd | 🟢 Low | 🟡 Medium — `brain-orchestrator.ts` already references it as pending |
| 41 | **Personal AI Memoir** | ⚠️ Partial | `/api/ai/memoir`, time-capsule overlay | Encrypted life journal, auto-generated memoir from activity | 🟡 Medium — memoir content is sensitive; no encrypted persistence | 🟡 Medium — separate from time-capsule scheduling |
| 42 | **Anonymous Help Circles** | ❌ Missing | Circle Groups, ghost-mode per-circle, E2EE | Pseudonymous support groups, mental health circles | 🟠 High — anonymity + E2EE is a CSAM risk vector | 🟡 Medium — blocked on Circle Groups + E2EE |
| 43 | **Smart Notifications (on-device clustering)** | ❌ Missing | Notification service, on-device clustering algorithm | Digest notifications, focus mode | 🟢 Low | 🟡 Medium — `smart-inbox.tsx` is static; needs clustering engine |
| 44 | **Prediction Markets (Cirkle Oracle)** | ✅ Implemented | LMSR automated market maker, Prisma `Market` model | Governance decisions, event forecasting | 🟡 Medium — real-money prediction markets may violate gambling laws | 🟢 Low |
| 45 | **Ad Engine (non-targeted, local)** | ✅ Implemented | `ad-engine.ts`, Prisma `Campaign` model, CPM calculation | Mashahd in-video ads, Midan sponsored trends, dashboard sponsored banner | 🟢 Low — already privacy-preserving (no user ID, no cookies) | 🟢 Low |
| 46 | **Cross-Plane Payment Federation** | ❌ Missing | Circle Payments, regional providers per plane (Mir/SBP for RU, WeChat/Alipay for CN, UPI for IN, Pix for BR) | Cross-region creator payouts, traveler payment roaming | 🟠 High — each region has different AML/KYC requirements | 🔴 Critical — full cross-plane payment federation is multi-month; defer pending ADR-003 |
| 47 | **Data Plane Routing (DRE)** | ⚠️ Partial | `regions.ts` 8-region config, `/api/regions` endpoint | China CTID compliance, Russia VPN detection, EU GDPR retention, Iran/Vietnam planes | 🟠 High — without signed config, plane routing is spoofable | 🟠 High — 2 of 6 planes missing (Iran, Vietnam); no signed Ed25519 config; no FeatureManager client class |
| 48 | **Signed Configuration (Ed25519)** | ❌ Missing | Ed25519 keypair, config signing pipeline | Tamper-proof DRE config, client-side verification | 🟠 High — current `/api/regions` response is unsigned; MITM could route to wrong plane | 🟡 Medium — ~3 days eng |
| 49 | **Travelers / Roaming Users** | ❌ Missing | DRE FeatureManager, signed config, home-plane preservation logic | Cross-region travelers keep home data plane | 🟡 Medium | 🟡 Medium — blocked on DRE FeatureManager |
| 50 | **i18n (7 languages + 2 EN)** | ⚠️ Partial | `i18n.ts` (en + ar only) | Per-region module names, App Store localization, brand voice consistency | 🟢 Low | 🟡 Medium — needs zh-CN, fr, es, de, it, en-BRAND, en-US locale packs |
| 51 | **Push Notifications (ntfy-equivalent)** | ⚠️ Partial | `push-notifications.ts` (browser Notifications API) | Mail push, emergency alerts bypassDND, news breaking alerts | 🟡 Medium — no ntfy self-hosted server; relies on browser Notifications (no bypassDND) | 🟡 Medium — Web Push API + VAPID is the web-friendly path; ntfy server is the blueprint path; defer ntfy pending ADR-003 |
| 52 | **Work Mode (Wasl Maktab)** | ⚠️ Partial | `work-mode.tsx` UI, retention controls, audit log | Self-hosted Matrix installer, admin bot | 🟠 High — workspaces are not E2EE; admin can read all workspace messages | 🟠 High — blocked on E2EE + Matrix installer |
| 53 | **Universal App Hub (geo-regional alternatives)** | ⚠️ Partial | `regional-payments.ts` static service list, `overlay-browser.tsx` | Automatic geo-routing (Uber→Didi→Snapp!) | 🟢 Low | 🟡 Medium — needs geo-detection + service availability check |
| 54 | **Sponsored Hashtags & Trends (city-level)** | ❌ Missing | Ad Engine, trending algorithm | City-level paid trends in Midan | 🟡 Medium — must be clearly labeled as sponsored | 🟡 Medium — needs disclosure UI |
| 55 | **CTID Integration (China realname)** | ❌ Missing | China data plane deployment, CTID API access | China plane compliance | 🔴 Critical — without CTID, China launch is illegal | 🔴 Critical — defers China launch entirely; defer pending ADR-003 |
| 56 | **CTID / ModelScope / Alibaba Cloud (China plane)** | ❌ Missing | China data plane deployment | China launch | 🔴 Critical | 🔴 Critical — defer pending ADR-003 |

---

## 4. Critical Path Analysis

The **critical path** to Year-1 Egypt launch (per ADR-001) runs through:

```
ADR-001 (Platform Strategy) ── approved ──┐
                                          ├──► Year-1 Egypt launch
Circle ID attestation (✅ partial) ───────┤
                                          │
E2EE Messaging (⏸️ deferred) ──► NOT on critical path (use server-side TLS)
                                          │
AI Safety & Moderation (❌ missing) ──► ON critical path (legal exposure)
                                          │
Circle Groups creation (❌ missing) ──► ON critical path (blueprint §10)
                                          │
i18n (en + ar) ── sufficient for Egypt
                                          │
Ad Engine (✅) ── sufficient
                                          │
Circle Payments (⚠️ partial) ──► ON critical path (regional provider integration)
```

**Three blockers** for Year-1 Egypt launch:
1. **AI Safety & Moderation** (#8) — legal exposure without it.
2. **Circle Groups creation** (#10) — biggest feature gap.
3. **Circle Payments regional provider integration** (#20) — mock today.

**Five deferred pending ADR-001 approval** (see DEFERRED_FEATURES.md):
1. Matrix/Synapse E2EE (#3)
2. ActivityPub federation (#15)
3. IPFS storage (#14)
4. PeerTube video (#16)
5. Local Mesh BLE/Wi-Fi Direct (#12)
6. Self-hosted mapping (#17)
7. Mailcow real email (#5)
8. ONNX on-device AI (#7, #19, #24)

---

## 5. Cross-Feature Risk Summary

### 5.1 Features that amplify each other's risk

- **E2EE (#3) × Local Mesh (#12)**: mesh without E2EE is a privacy disaster;
  E2EE without mesh is fine. → Defer both together pending ADR-002.
- **Circle Groups (#10) × E2EE (#3)**: private circles without E2EE is
  deceptive advertising. → Do not enable "private circle" mode in UI until
  E2EE ships.
- **Circle Verify (#19) × Creator Tipping KYC (#21)**: tipping without KYC
  is a money-laundering vector. → Disable tipping UI until KYC ships.
- **Mini Apps (#32) × Sandboxed WebView (#33)**: mini-apps without sandboxing
  is an XSS vector. → Disable third-party mini-apps until sandbox ships.
- **Cross-Plane Federation (#46) × DRE Signed Config (#48)**: cross-plane
  routing without signed config is spoofable. → Block cross-plane payments
  until signed config ships.

### 5.2 Features with mitigations already in place

- **Family Vault (#36)** — real AES-256-GCM, no federation, no external
  exposure. ✅ Safe to ship as-is.
- **Decentralised Ticketing (#37)** — real Ed25519 signing, offline-verifiable.
  ✅ Safe to ship as-is.
- **Local Backup (#26)** — real AES-256-GCM, no server trust. ✅ Safe to ship
  as-is.
- **Ad Engine (#45)** — non-targeted, no user ID, no cookies. ✅ Safe to ship
  as-is.

---

## 6. Change Log

| Date | Change | Author |
|---|---|---|
| 2026-08-09 | Initial matrix created from AUDIT-BLUEPRINT-1 + AUDIT-BLUEPRINT-2 results | Architecture Council |

---

**End of CIRKLE-DEPENDENCY-MATRIX.md**

# CIRKLE — Deferred Features List

| Field | Value |
|---|---|
| **Document** | Deferred Features List |
| **Version** | 1.0 |
| **Date** | 2026-08-09 |
| **Status** | Pending CTO approval (linked to ADR-001) |
| **Owner** | CIRKLE Architecture Council |
| **Related** | `ADR-001-platform-strategy.md`, `CIRKLE-DEPENDENCY-MATRIX.md`, `CIRKLE-BLUEPRINT-COMPLIANCE.md` |
| **Audit baseline** | Codebase HEAD `be6755e` |

---

## 1. Purpose

This document is the canonical list of features that are **intentionally
deferred** pending CTO approval of ADR-001 (Platform Strategy). Each entry
records:

- **Feature** — the deferred feature name.
- **Blueprint reference** — the CIRCLE BLUEPRINT v12.0 section that specifies it.
- **Current status** — what exists in the codebase today (if anything).
- **Reason deferred** — why we are not building it now.
- **Dependencies** — what must be in place before we can build it.
- **Security risk** — the security exposure created by the deferral.
- **Estimated effort** — engineering effort to ship (post-deferral).
- **Strategic value** — what CIRKLE gains by eventually shipping it.
- **Approval status** — who needs to approve un-deferral.

The deferral is **not** a cancellation. It is an explicit acknowledgement that
these features are not on the Year-1 Egypt launch critical path, and that
building them now would jeopardize the launch timeline without proportional
user value.

---

## 2. Approval Gate

All eight features below are **blocked on CTO sign-off of ADR-001** (Platform
Strategy). Until ADR-001 is approved:

- Engineering must not begin implementation of any deferred feature.
- Product must not promise any deferred feature in marketing materials.
- Documentation must clearly mark these features as "Planned — pending
  architecture decision."

If CTO approves ADR-001 (Web-first PWA), the deferred features enter a
**post-Year-1 backlog** and are reprioritized quarterly.

If CTO rejects ADR-001 and chooses Option B (Flutter migration), the
deferred features become part of the migration scope and this list is
superseded.

---

## 3. Deferred Features Matrix

### 3.1 Matrix/Synapse E2EE Messaging

| Field | Value |
|---|---|
| **Feature** | Matrix/Synapse E2EE Messaging (Olm/Megolm double-ratchet) |
| **Blueprint reference** | §3.2 (Personal-mode E2EE), §6.8 (Wasl E2EE details), §6.10 (Broadcast channels via Matrix rooms), §10.6 (Private circles E2EE), §27.4 (Matrix Key Backup) |
| **Current status** | PARTIAL — `encrypted: boolean` flag in Prisma Message model is decorative; messages stored plaintext in Postgres; admin/DBA can read all DMs. |
| **Reason deferred** | (a) Olm/Megolm port to WASM or libolm binding is non-trivial (~4-6 weeks eng). (b) Operating a Matrix Synapse homeserver is high-touch (federation spam, server-to-server auth, moderation). (c) Web Crypto already provides AES-256-GCM (proven in `family-vault.ts`); a simpler session-key E2EE could be built without full Matrix. (d) Year-1 Egypt launch does not require E2EE — TLS-in-transit is sufficient for launch; E2EE-at-rest can ship later. |
| **Dependencies** | ADR-001 approval; ADR-003 (Federated Back-end) for Synapse deployment; libolm WASM bindings or @matrix-org/olm package; device key management UI. |
| **Security risk** | 🔴 **Critical** — without E2EE, admin/DBA can read all DMs. Currently mitigated by: (a) single-admin trust model, (b) post-launch RBAC for DB access, (c) Family Vault already provides real E2EE for the most sensitive content (photos). Mitigation acceptable for Year-1 launch; not acceptable long-term. |
| **Estimated effort** | 4-6 weeks (Olm/Megolm integration + device key management UI + cross-device sync + verification emoji/QR flow). +2 weeks for Synapse deployment if pursuing Matrix path. |
| **Strategic value** | High — E2EE is a blueprint cornerstone ("on-device data" covenant); without it, CIRKLE cannot truthfully claim "private messaging." Reputational risk if mischaracterized in marketing. |
| **Approval status** | Pending CTO approval of ADR-001. |

---

### 3.2 ActivityPub Federation (Midan / Mashahd)

| Field | Value |
|---|---|
| **Feature** | ActivityPub Federation — Midan posts and Mashahd videos federated with Mastodon/PeerTube instances |
| **Blueprint reference** | §3.5 (Public content via IPFS/PeerTube), §9.5 (Midan federation), §9.11 (Zero-cost architecture), §13.1 (Creator Channels PeerTube-backed), §13.4 (Live streaming + P2P) |
| **Current status** | MISSING — no ActivityPub outbox/inbox; no signed HTTP signatures; no actor key management; Mashahd uploads go to `/api/posts` (internal only). |
| **Reason deferred** | (a) Full ActivityPub server implementation is ~1 month eng. (b) Federation opens CIRKLE to spam/illegal content from remote instances — needs allow-list moderation, which doesn't exist yet. (c) Year-1 Egypt launch doesn't need federation — local-only network is sufficient for MAU goals. (d) Federation is a scaling/cost-reduction feature, not a user-facing feature for launch. |
| **Dependencies** | ADR-001 approval; ADR-003 (Federated Back-end); ActivityPub outbox/inbox schema; actor Ed25519 key management; allow-list moderation queue; ActivityPub client SDK. |
| **Security risk** | 🟠 **High** — without federation, CIRKLE is a closed silo (privacy-positive but limits reach). Federation, once enabled, exposes CIRKLE to: (a) federated CSAM/terror content, (b) spam waves from compromised remote instances, (c) server-to-server auth attacks. Mitigation: ship with strict allow-list (no open federation) initially. |
| **Estimated effort** | 4-6 weeks (ActivityPub server + actor key management + federation moderation queue + Mastodon interop testing). |
| **Strategic value** | Medium — federation is the blueprint's scaling mechanism; without it, CIRKLE bears 100% of infrastructure cost. Long-term essential; short-term optional. |
| **Approval status** | Pending CTO approval of ADR-001. |

---

### 3.3 IPFS / libp2p Storage

| Field | Value |
|---|---|
| **Feature** | IPFS / libp2p storage for public content (Mashahd videos, Lamahat photos, Knowledge Wiki pages, backups) |
| **Blueprint reference** | §3.5 (Public content via IPFS/PeerTube), §10.5.3 (Circle file sharing IPFS), §15.3 (Mesh IPFS over libp2p), §26.3 (Knowledge Circles IPFS), §27.2 (Backup IPFS passphrase), §30.8 (Zero-cost ad infra IPFS) |
| **Current status** | MISSING — `ipfsHash` field exists on WikiPage model as placeholder; no IPFS Kubo node, no `helia` (JS IPFS) integration, no pinning service. |
| **Reason deferred** | (a) Operating an IPFS pinning service has real bandwidth/storage cost (contrary to "zero-cost" framing — IPFS is only zero-cost if peers pin for free, which doesn't happen at launch scale). (b) IPFS public gateway exposes content to anyone with CID — not appropriate for private/unlisted content. (c) Year-1 Egypt launch can use Prisma/SQLite + S3-compatible blob storage; IPFS is a long-term cost-reduction play. |
| **Dependencies** | ADR-001 approval; ADR-003 (Federated Back-end); IPFS Kubo deployment; `helia` integration for client-side pinning; pinning service operator. |
| **Security risk** | 🟡 **Medium** — IPFS public gateway exposes content with CID. Mitigation: encrypt-then-pin for private content (Family Vault pattern). Without IPFS, CIRKLE bears full storage cost but has tighter access control. |
| **Estimated effort** | 3-4 weeks (Kubo deployment + helia integration + pinning strategy + gateway CDN). |
| **Strategic value** | Medium — cost reduction at scale; without it, CIRKLE pays for all blob storage. Long-term essential for "zero-cost" covenant; short-term acceptable to use S3-compatible storage. |
| **Approval status** | Pending CTO approval of ADR-001. |

---

### 3.4 PeerTube (Mashahd P2P Video)

| Field | Value |
|---|---|
| **Feature** | PeerTube instance for Mashahd — P2P video distribution via WebTorrent, federated with other PeerTube instances |
| **Blueprint reference** | §3.5 (Public content via IPFS/PeerTube), §7.1 (Mashahd P2P, 0% creator fees), §13.1 (Creator Channels PeerTube-backed), §13.4 (Live streaming + P2P) |
| **Current status** | MISSING — Mashahd uploads go to `/api/posts`; no PeerTube instance, no WebTorrent, no federation. |
| **Reason deferred** | (a) PeerTube instance operation is high-touch (storage, transcoding, federation moderation). (b) WebTorrent in browser works but exposes user IP to peers — privacy concern without WebRTC proxy. (c) Year-1 Egypt launch can use HTTP video streaming (already works); P2P distribution is a bandwidth-cost-reduction play. (d) Creator monetization ledger (`/api/creator/earnings`) already exists; real video distribution can be retrofitted without disrupting creator income tracking. |
| **Dependencies** | ADR-001 approval; ADR-003 (Federated Back-end); PeerTube Docker deployment; transcoding pipeline; WebTorrent client integration; CDN fallback for non-P2P-capable clients. |
| **Security risk** | 🟡 **Medium** — WebTorrent exposes user IP to peers. Mitigation: WebRTC privacy controls (TURN server proxy for sensitive clients). |
| **Estimated effort** | 4-6 weeks (PeerTube deployment + transcoding + WebTorrent client + CDN fallback + creator migration). |
| **Strategic value** | Medium — bandwidth cost reduction at scale; without it, CIRKLE pays for all video bandwidth. Long-term essential for "0% creator fees" economics; short-term acceptable to use HTTP streaming. |
| **Approval status** | Pending CTO approval of ADR-001. |

---

### 3.5 Local Mesh (BLE / Wi-Fi Direct)

| Field | Value |
|---|---|
| **Feature** | Local Mesh — off-grid peer discovery via BLE GATT + transport via Wi-Fi Direct + libp2p relay |
| **Blueprint reference** | §15.1 (BLE discovery + WiFi Direct transport), §15.2 (Noise protocol E2EE), §15.3 (IPFS over libp2p), §15.4 (Emergency SOS mesh relay), §15.5 (Group chats via flooding), §15.6 (Power optimisation), §22.4 (Travel Emergency SOS), §22.7 (Lost & found mesh) |
| **Current status** | PARTIAL — `src/lib/mesh-network.ts` uses `BroadcastChannel` API (browser tabs as mock peers); `mesh-presence.tsx` and `mesh-badge.tsx` are UI shells; no real BLE, no Wi-Fi Direct, no libp2p. |
| **Reason deferred** | (a) **Web Bluetooth has no iOS Safari support** — mesh via BLE is impossible on iPhone in a pure web app. (b) **Wi-Fi Direct is impossible in browsers** — no API exists. (c) A native wrapper (Capacitor/Tauri Mobile) is required to access BLE + Wi-Fi Direct — this is ADR-002 (not yet written). (d) Year-1 Egypt launch can ship without mesh; online-only messaging works for the dominant use case. |
| **Dependencies** | ADR-001 approval; **ADR-002 (Native Wrapper for Mesh/Biometrics) — not yet drafted**; Capacitor or Tauri Mobile wrapper; `flutter_blue_plus`-equivalent JS plugin (e.g., `@capacitor-community/bluetooth-le`); `nearby_connections` equivalent (Android-only); Noise Protocol Framework port to WASM. |
| **Security risk** | 🟠 **High** — without real mesh, the "off-grid messaging" feature is misleading. Mitigation: remove "Local Mesh" from all marketing materials until ADR-002 ships; relabel current `mesh-presence.tsx` as "Same-device Multi-tab Sync (preview)." |
| **Estimated effort** | 6-8 weeks (native wrapper + BLE plugin + Wi-Fi Direct plugin + Noise protocol + group fan-out + power optimisation + emergency SOS). |
| **Strategic value** | High — mesh is the blueprint's privacy cornerstone (off-grid messaging for protests, disasters, low-connectivity rural Egypt). Long-term essential for "P2P" covenant; short-term not on critical path. |
| **Approval status** | Pending CTO approval of ADR-001 + drafting of ADR-002. |

---

### 3.6 Self-hosted Mapping (TileServer GL + Nominatim + OSRM)

| Field | Value |
|---|---|
| **Feature** | Self-hosted mapping stack — TileServer GL (raster tiles), Nominatim (geocoding), OSRM (routing), Overpass (POI), MBTiles (offline region packs) |
| **Blueprint reference** | §3.8 (Zero-cost mapping stack), §22.9 (Offline maps + routing), §23.1-23.7 (Map stack components), §33.4 (Map server deployment script) |
| **Current status** | PARTIAL — `src/lib/osm.ts`, `src/lib/cirkle-maps.ts`, `src/app/api/maps/{route,geocode,reverse}/route.ts` all use public OSM endpoints (nominatim.openstreetmap.org, router.project-osrm.org, overpass-api.de). No self-hosted services, no offline packs, no deployment script. |
| **Reason deferred** | (a) Public OSM endpoints work today (rate-limited but acceptable for Year-1 launch volume). (b) Operating 4 self-hosted services (tiles/geocode/route/POI) is ~2 weeks eng + ongoing infra cost (tile storage ~50 GB, daily OSM diff updates). (c) Offline MBTiles region packs require a generation pipeline + Service Worker cache strategy — non-trivial. (d) Year-1 Egypt launch doesn't need offline maps; online routing works for the dominant use case. |
| **Dependencies** | ADR-001 approval; ADR-003 (Federated Back-end) for infrastructure; TileServer GL Docker deployment; Nominatim Docker deployment; OSRM Docker deployment; OSM planet extract for Egypt; MBTiles generation pipeline; Service Worker offline cache strategy. |
| **Security risk** | 🟢 **Low** — maps are public data; no PII. Current public-endpoint usage has no privacy risk beyond IP logging by OSM servers (mitigated by descriptive User-Agent and rate-limiting). |
| **Estimated effort** | 2-3 weeks (4 Docker services + Egypt OSM extract + MBTiles pipeline + Service Worker cache). |
| **Strategic value** | Medium — eliminates rate-limit risk on public OSM endpoints; enables offline maps for rural/low-connectivity users. Long-term essential for "zero-cost" covenant; short-term acceptable to use public endpoints. |
| **Approval status** | Pending CTO approval of ADR-001. |

---

### 3.7 Mailcow @circle.app Real Email

| Field | Value |
|---|---|
| **Feature** | Mailcow-dockerized deployment — Postfix + Dovecot + SOGo + 5 GB mailbox per user @circle.app |
| **Blueprint reference** | §3.9 (Mailcow @circle.app), §20.1-20.6 (Circle Mail full spec), §33.3 (Mailcow deployment) |
| **Current status** | PARTIAL — `src/lib/circle-mail.ts` is internal-only (username→username); `src/app/api/mail/{inbox,send}/route.ts` explicitly comments "no SMTP, no external delivery." MailMessage Prisma model exists but is not real email. |
| **Reason deferred** | (a) Operating a public mail server is high-touch — deliverability, IP reputation, DKIM/SPF/DMARC config, outbound spam rate limiting, abuse handling. (b) Mailcow requires ~4 GB RAM + 20 GB storage minimum + ongoing security patches. (c) Year-1 Egypt launch doesn't need real email — internal messaging covers the dominant use case; users can use their existing email for external communication. (d) External email delivery creates new abuse vectors (spam from @circle.app accounts would damage the domain reputation). |
| **Dependencies** | ADR-001 approval; ADR-003 (Federated Back-end) for infrastructure; Mailcow Docker stack; DNS MX records for circle.app; DKIM/SPF/DMARC config; outbound rate limiting; abuse monitoring. |
| **Security risk** | 🟠 **High** — operating a public SMTP server is a high-risk undertaking. Spam/abuse from @circle.app accounts would damage deliverability for all users. Mitigation: ship with strict outbound rate limits (50 emails/day/user) + automated spam filtering + DMARC quarantine policy. |
| **Estimated effort** | 2-3 weeks (Mailcow deployment + DNS config + DKIM/SPF/DMARC + rate limiting + abuse monitoring + client UI for IMAP/SMTP access). |
| **Strategic value** | Medium — enables "Sign in with Cirkle" for third-party services that require email verification; without it, CIRKLE users must use a separate email for external services. Long-term essential for the "Circle ID as primary identity" vision; short-term acceptable to use internal messaging. |
| **Approval status** | Pending CTO approval of ADR-001. |

---

### 3.8 ONNX On-Device AI (14 models)

| Field | Value |
|---|---|
| **Feature** | ONNX Runtime on-device AI — 14 models totaling ~5 GB: NSFW detection (350 MB), violence, toxic comment, deepfake, NLLB-200 (900 MB), DistilGPT2 smart reply, BART summarization, OCR, liveness (MobileNetV2 15 MB), face match (FaceNet 5 MB), Whisper STT (150 MB), Piper TTS (50 MB), vit-gpt2 image caption, SmolLM2 |
| **Blueprint reference** | §3.6 (Zero-cost AI), §16.2 (Liveness), §16.3 (Face match), §17.1-17.9 (AI Safety & Moderation models), §18.1-18.9 (Self-Learning AI models), §24.1-24.7 (Translation models), §32.1-32.2 (AI model catalogue + download strategy) |
| **Current status** | MISSING — no ONNX runtime, no model download manager; models only described in `src/lib/autonomous-intelligence/data-sources/ai-models.ts` as DataSourceConfig metadata. All AI runs through `src/lib/ai.ts` generic `aiComplete()` server-side call. |
| **Reason deferred** | (a) **WebGPU on Safari is still in development** — large models (NLLB-200 900 MB, Whisper 150 MB) will be too slow via WASM-only on iOS. (b) **5 GB of model downloads per user** is significant bandwidth cost; needs Wi-Fi-only download strategy + user consent + per-model opt-out + delete. (c) Some models (NSFW, deepfake) are better suited to server-side inference for the launch period (no user-bandwidth cost, faster model updates). (d) Year-1 Egypt launch can use server-side AI via existing `/api/ai/*` endpoints; on-device AI is a privacy-resilience play, not a launch blocker. |
| **Dependencies** | ADR-001 approval; ONNX Runtime Web integration (`onnxruntime-web`); WebGPU capability detection; WASM fallback for Safari; model download manager with Wi-Fi-only + consent + opt-out; per-model storage management UI (Privacy Dashboard §28.9); CDN for model distribution (cdn.circle.app or IPFS). |
| **Security risk** | 🟢 **Low (privacy-positive)** — on-device AI is *more* private than server-side. Deferral means current AI calls reveal message content to LLM providers (Groq/OpenAI/HF/Gemini/OpenRouter). Mitigation: existing `ai-cache.ts` deduplicates calls; consent framework (`consent.ts`) gates Brain AI features. |
| **Estimated effort** | 8-12 weeks (ONNX runtime integration + 14 model adapters + download manager + Privacy Dashboard UI + per-model testing matrix across WebGPU/WASM/Safari/Chrome). |
| **Strategic value** | High — on-device AI is the blueprint's privacy cornerstone ("on-device data" covenant); without it, AI features reveal user content to third-party LLM providers. Long-term essential; short-term acceptable to use server-side AI with clear privacy disclosure. |
| **Approval status** | Pending CTO approval of ADR-001. |

---

## 4. Summary Table

| # | Feature | Blueprint | Current | Reason | Effort | Risk | Value | Approval |
|---|---|---|---|---|---|---|---|---|
| 3.1 | Matrix/Synapse E2EE | §3.2, §6.8, §10.6, §27.4 | PARTIAL (flag only) | libolm WASM + Synapse ops | 4-6 wk | 🔴 Critical | High | Pending ADR-001 |
| 3.2 | ActivityPub Federation | §3.5, §9.5, §13.1 | MISSING | Spam/abuse moderation | 4-6 wk | 🟠 High | Medium | Pending ADR-001 |
| 3.3 | IPFS / libp2p Storage | §3.5, §10.5.3, §15.3, §26.3, §27.2 | MISSING (placeholder field) | Pinning service ops | 3-4 wk | 🟡 Medium | Medium | Pending ADR-001 |
| 3.4 | PeerTube (Mashahd P2P) | §3.5, §7.1, §13.1, §13.4 | MISSING | Bandwidth/storage ops | 4-6 wk | 🟡 Medium | Medium | Pending ADR-001 |
| 3.5 | Local Mesh (BLE/Wi-Fi Direct) | §15.1-15.6, §22.4, §22.7 | PARTIAL (BroadcastChannel mock) | Web Bluetooth no iOS Safari | 6-8 wk | 🟠 High | High | Pending ADR-001 + ADR-002 |
| 3.6 | Self-hosted Mapping | §3.8, §22.9, §23.1-23.7, §33.4 | PARTIAL (public OSM endpoints) | 4 Docker services ops | 2-3 wk | 🟢 Low | Medium | Pending ADR-001 |
| 3.7 | Mailcow Real Email | §3.9, §20.1-20.6, §33.3 | PARTIAL (internal-only mock) | Public SMTP ops risk | 2-3 wk | 🟠 High | Medium | Pending ADR-001 |
| 3.8 | ONNX On-Device AI (14 models) | §3.6, §16.2, §16.3, §17.1-17.9, §18.1-18.9, §24.1-24.7, §32.1-32.2 | MISSING (metadata only) | 5 GB models + WebGPU Safari | 8-12 wk | 🟢 Low | High | Pending ADR-001 |

**Total estimated effort (post-approval):** 33-48 weeks of engineering.
**Approval gate:** CTO sign-off on ADR-001 (Platform Strategy).

---

## 5. Un-Deferral Process

To remove a feature from this list and begin implementation:

1. **CTO approves ADR-001** (or relevant ADR for the feature's dependency).
2. Engineering files a **revised ADR** (e.g., ADR-003 — Federated Back-end) for
   any feature requiring infrastructure decisions beyond the platform choice.
3. Product files a **feature spec** with user stories, acceptance criteria,
   and success metrics.
4. Security files a **threat model** for the feature, including the mitigations
   listed in this document.
5. Architecture Council reviews and approves the spec + threat model.
6. Feature enters the next sprint planning cycle.

---

## 6. Risks of Deferral

The deferrals above introduce the following **aggregate** risks:

1. **Marketing honesty risk.** If marketing materials reference "Mesh,"
   "E2EE," "Federation," or "On-device AI" before the features ship, CIRKLE
   is making false claims. Mitigation: all marketing copy must reference the
   `CIRKLE-BLUEPRINT-COMPLIANCE.md` status of each feature.
2. **Covenant drift.** The blueprint's "zero-cost, on-device, P2P, federated"
   covenant is partially unmet by these deferrals. Mitigation: ADR-001
   explicitly accepts these deferrals as a pragmatic Year-1 trade-off;
   long-term roadmap must address them.
3. **Technical debt accumulation.** Each deferred feature has a placeholder
   or stub in the codebase (e.g., `encrypted: boolean` flag, `ipfsHash` field,
   `mesh-network.ts` BroadcastChannel mock). These stubs must be clearly
   marked as "placeholder pending [feature]" to avoid confusion. Mitigation:
   the `CIRKLE-DEPENDENCY-MATRIX.md` and this document are the authoritative
   references for what is stub vs. real.
4. **User expectation management.** Users who see a `mesh-presence.tsx` overlay
   may believe mesh works. Mitigation: relabel UI shells as "Preview" or
   "Coming soon — pending architecture decision (ADR-001)."

---

## 7. Change Log

| Date | Change | Author |
|---|---|---|
| 2026-08-09 | Initial deferred features list created for ADR-001 | Architecture Council |

---

**End of DEFERRED_FEATURES.md**

# ADR-004: WebRTC Architecture — P2P for 1:1, SFU for Group, Signaling via WebSocket Mini-Service

| Field | Value |
|---|---|
| **ADR Number** | 004 |
| **Title** | WebRTC Architecture — P2P for 1:1 calls, SFU for group calls, coturn for TURN, signaling mini-service |
| **Status** | PROPOSED (awaiting CTO approval) |
| **Date** | 2026-08-12 |
| **Decision Owner** | CIRKLE Architecture Council |
| **Supersedes** | — |
| **Superseded by** | — |
| **Blueprint reference** | CIRKLE-BLUEPRINT-v16.0 §17 (Wasl), §15 (Local Mesh), §8 (WebRTC table in ADR-001) |
| **Related ADRs** | ADR-001 (Web-first PWA), ADR-002 (E2EE), ADR-003 (On-Device AI) |

---

## 1. Context

CIRKLE's Wasl (Chat) screen ships voice and video calls today via
`src/lib/call-manager.ts`. The current implementation is a thin
client-side singleton that wraps:

- `getUserMedia` + `RTCPeerConnection` for the audio/video pipeline,
- Socket.IO signaling via the existing `chat-service` mini-service on
  port 3003 (events: `call:offer`, `call:answer`, `call:ice`,
  `call:end`, `call:reject`, `call:incoming`),
- STUN-only ICE configuration using Google's public STUN servers
  (`stun:stun.l.google.com:19302`, `stun:stun1.l.google.com:19302`).

The implementation handles **1:1 calls** correctly today: P2P media
flows directly between the two peers (DTLS-SRTP-encrypted end-to-end),
the Socket.IO server only relays signaling, and the `CallSession` Prisma
table stores only metadata (caller, callee, status, timestamps) — SDP
and ICE candidates are never persisted.

**What's missing** — three concrete gaps:

1. **Group calls.** Mesh topology (every peer connects to every other)
  works for ≤4 participants but degrades quadratically; CIRKLE needs
  an SFU (Selective Forwarding Unit) for 5+ participant calls. Today
  the codebase has no SFU.
2. **TURN relay for NAT traversal failures.** ~15-20% of calls fail
  behind symmetric NATs (carrier-grade NAT, enterprise firewalls) when
  STUN alone cannot establish a P2P path. Today these calls simply
  fail with `"Failed to negotiate call. WebRTC may be unavailable."`
  (`call-manager.ts` line ~430). Google's public STUN does not include
  TURN.
3. **Signaling mini-service.** Call signaling currently piggybacks on
  the `chat-service` mini-service (port 3003), which is fine for
  correctness but couples call-scaling to chat-scaling. A dedicated
  `call-signaling` mini-service would let CIRKLE scale calls
  independently.

This ADR closes those three gaps.

The decision must answer:

1. **SFU choice** — self-host Janus, mediasoup, Jitsi Videobridge, or
   LiveKit? Or roll our own?
2. **TURN choice** — self-host `coturn` (free), use Twilio's TURN API
   (paid but zero-ops), or use a free public TURN (Google's STUN/TURN
   is restricted)?
3. **Signaling mini-service** — extract `call:*` events from
   `chat-service` into a dedicated `call-signaling-service` on port
   3006? Or leave coupled?
4. **Topology** — pure P2P for 1:1, SFU for groups? Or SFU for
   everything (simpler, more expensive)?
5. **E2EE for group calls** — SFU breaks true E2EE (the SFU sees
   decrypted media). Insertable streams / SFrame for true E2EE?
6. **Mobile support** — iOS Safari WebRTC support is solid (since iOS
   11) but has quirks (e.g. no Simulcast on iOS Safari <16).
7. **Recording** — do we record calls? For Commit evidence? For
   moderation? If yes, where?

This ADR is **scoped to the WebRTC media + signaling topology**.
E2EE for group calls is deferred to a future ADR-006.

---

## 2. Decision Drivers

1. **Privacy covenant (Blueprint §1, §28).** Calls MUST be end-to-end
   encrypted. 1:1 calls already are (DTLS-SRTP). Group calls via SFU
   are not E2EE by default — must use Insertable Streams or accept
   "transport-encrypted only" for groups (decision point 5).
2. **Zero-cost covenant (Blueprint §1).** TURN servers and SFUs cost
   money to run. Self-hosted `coturn` and `mediasoup`/`Janus` are
   free software but require a VPS. Twilio TURN and LiveKit Cloud are
   paid SaaS — violates the covenant.
3. **Reliability.** ~15-20% of calls fail without TURN today. TURN is
   required for a production-grade call experience.
4. **Group size target.** Blueprint §17 targets ≤50 participant group
   calls (large Circle group video). Mesh is infeasible past 6 peers;
   SFU is required.
5. **Existing investment.** `call-manager.ts` already implements the
   P2P path correctly; the SFU path should reuse the same client
   API surface so the Wasl UI doesn't change.
6. **Single-region deployment initially.** Egypt launch means
   Cairo-region VPS for TURN + SFU is sufficient; multi-region can be
   deferred.
7. **PWA constraint (ADR-001).** Everything must work in the browser;
   no native plugins.

---

## 3. Considered Options

### Option A — Status Quo + Google STUN only (current)

**Stack:** P2P via `RTCPeerConnection`, signaling via `chat-service`
socket on 3003, STUN = Google public.

**Pros:**

- $0 infra cost.
- Already works for ~80% of 1:1 calls.
- No new service to deploy.

**Cons:**

- 15-20% of 1:1 calls fail (symmetric NAT).
- No group calls past 4 participants.
- Google STUN has no SLA and could be deprecated.
- Couples call-scaling to chat-scaling.

**Verdict:** insufficient for production.

---

### Option B — P2P for 1:1 + self-hosted coturn for TURN + mesh for groups (≤4)

**Stack:** As Option A + self-hosted `coturn` on a Cairo VPS for TURN
relay; group calls up to 4 peers use mesh topology.

**Pros:**

- $5-20/month for coturn VPS.
- Solves the 80% reliability gap.
- No new architectural complexity.

**Cons:**

- Mesh breaks past 4 peers — caps group calls at 4.
- No path to large group calls (50+ participants).
- Mesh wastes bandwidth (every peer sends to every other).

**Verdict:** acceptable for Year-1 if group calls are capped at 4.

---

### Option C — P2P for 1:1 + self-hosted coturn + self-hosted mediasoup SFU for groups (≤50)

**Stack:**

- 1:1 calls: P2P via `RTCPeerConnection` (DTLS-SRTP, E2EE).
- TURN: self-hosted `coturn` on Cairo VPS (port 3478 UDP/TCP, 5349 TLS).
- Group calls (5-50 participants): SFU via self-hosted `mediasoup` (Node.js + Rust worker).
- Signaling: dedicated `call-signaling-service` on port 3006 (Socket.IO).

**Pros:**

- Scales to 50 participants per call.
- $0 software cost; ~$50/month VPS for mediasoup + coturn.
- mediasoup is Node-native — fits the Bun/Next.js stack.
- E2EE preserved for 1:1 (DTLS-SRTP).
- Group calls are transport-encrypted (TLS between client and SFU) but
  not E2EE — acceptable trade-off for groups (decision point 5).

**Cons:**

- mediasoup is a library, not a server — we must write the SFU app
  (~500 LOC).
- One new VPS to manage (or co-locate with the existing
  mini-services host).
- Simulcast support requires browser-side encoding of 3 spatial
  layers (Chrome/Edge yes, Safari 16+ yes, older Safari no).
- Group calls are not E2EE (the SFU decrypts media to forward it).
  Insertable Streams / SFrame could fix this — deferred to ADR-006.

**Verdict:** recommended — see §5.

---

### Option D — Janus + coturn (full-featured SFU)

**Stack:** As Option C but with Janus instead of mediasoup.

**Pros:**

- Full-featured (recording, SIP gateway, video room, audio room).
- Mature (since 2014).
- C-based — fast.

**Cons:**

- C-based — heavier to deploy (Docker image is 1GB+).
- Less idiomatic to the Bun/Node.js stack.
- More features than CIRKLE needs today (SIP gateway, etc.).

**Verdict:** overkill for Year-1.

---

### Option E — Jitsi Videobridge + coturn

**Stack:** Jitsi Videobridge (Java) + Jitsi Meet frontend + coturn.

**Pros:**

- Drop-in (Jitsi Meet is a full app).
- Battle-tested (used by 8x8, etc.).

**Cons:**

- Java — heavier than Node.js.
- Jitsi Meet frontend conflicts with CIRKLE's Next.js UI (two frontends).
- The "drop-in" UX doesn't fit the CIRKLE unified-shell design.

**Verdict:** not suitable for the unified UX.

---

### Option F — LiveKit Cloud (SaaS) + LiveKit SFU

**Stack:** LiveKit Cloud (managed SFU + TURN) + LiveKit client SDK.

**Pros:**

- Zero ops.
- SDK is excellent (React hooks, typed).
- Built-in recording, simulcast, E2EE (via SFrame).

**Cons:**

- **Paid SaaS — violates the §1 Zero-Cost covenant.**
- Vendor lock-in.
- Data leaves CIRKLE's infra.

**Verdict:** violates covenant. Rejected.

---

### Option G — Twilio TURN + self-hosted mediasoup

**Stack:** Twilio's TURN API (paid, metered) + self-hosted mediasoup.

**Pros:**

- Twilio TURN is rock-solid and globally distributed.
- No coturn ops.

**Cons:**

- **Paid — violates the §1 Zero-Cost covenant** ($0.001/minute per
  relayed GB).
- Twilio knows who called whom (metadata leak).

**Verdict:** violates covenant. Rejected.

---

## 4. Comparison Matrix

| Criterion                          | A (Status Quo) | B (+coturn, mesh≤4) | C (P2P+coturn+mediasoup) | D (Janus) | E (Jitsi) | F (LiveKit Cloud) | G (Twilio TURN + mediasoup) |
|---|---|---|---|---|---|---|---|
| Zero-cost covenant                | ✅              | ✅                   | ✅                        | ✅         | ✅         | ❌                 | ❌                            |
| 1:1 reliability                   | ⚠️ 80%         | ✅ 95%+              | ✅ 95%+                   | ✅ 95%+    | ✅ 95%+    | ✅ 99%+            | ✅ 99%+                        |
| Group calls (5-50)                | ❌              | ❌                   | ✅                        | ✅         | ✅         | ✅                  | ✅                             |
| E2EE 1:1 (DTLS-SRTP)              | ✅              | ✅                   | ✅                        | ✅         | ✅         | ✅                  | ✅                             |
| E2EE group (Insertable Streams)  | n/a             | n/a                  | ⚠️ (deferred to ADR-006) | ❌         | ❌         | ✅                  | ⚠️ (deferred)                  |
| Stack fit (Bun/Node.js)           | ✅              | ✅                   | ✅                        | ❌         | ❌         | ✅                  | ✅                             |
| Engineering effort                | 0               | ~1 day               | ~1 week                  | ~2 weeks  | ~1 week    | ~1 day             | ~1 week                        |
| Infra cost (per month, 1 region)  | $0              | $5-20                | $50-100                  | $50-100   | $50-100    | $0 (in LiveKit bill) | $50 + metered Twilio         |
| Vendor lock-in                    | ✅ none        | ✅ none              | ✅ none                   | ✅ none   | ⚠️ partial | ❌ high             | ⚠️ partial (Twilio TURN)       |
| Simulcast support                 | n/a             | n/a                  | ✅ Chrome/Safari 16+      | ✅         | ✅         | ✅                  | ✅                             |
| Recording support                 | ❌              | ❌                   | ✅ (mediasoup observer)   | ✅         | ✅         | ✅                  | ✅                             |
| Fits unified-shell UX             | ✅              | ✅                   | ✅                        | ⚠️ partial | ❌         | ⚠️ partial          | ✅                             |

---

## 5. Recommendation

**ADOPT Option C — P2P for 1:1 + self-hosted coturn for TURN +
self-hosted mediasoup SFU for groups + dedicated signaling
mini-service on port 3006.**

### 5.1 Rationale

1. **Covenant compliance.** Option C is the only recommended option
   that satisfies both the privacy covenant (E2EE for 1:1 via
   DTLS-SRTP) AND the zero-cost covenant (no paid SaaS, no metered
   API).
2. **Pragmatic scalability.** 1:1 calls (the majority of Wasl traffic)
   stay P2P — zero marginal cost. Group calls scale to 50 participants
   via SFU on a single VPS. Year-1 Egypt traffic doesn't need more.
3. **Stack fit.** mediasoup is Node-native; the SFU app can be a ~500
   LOC Bun service in `mini-services/call-signaling-service/`,
   consistent with the existing 3 mini-services (chat / news /
   ai-realtime).
4. **E2EE preserved where it matters most.** 1:1 calls (which include
   sensitive Commit-related conversations and Shield reporter
   interviews) are E2EE by default. Group calls are transport-encrypted
   (TLS to SFU) — acceptable trade-off for groups; full E2EE for groups
   is deferred to ADR-006 (Insertable Streams + SFrame).
5. **Future-proof.** mediasoup supports Insertable Streams, so we can
   upgrade group calls to true E2EE without re-architecting.
6. **Self-hostable.** A government or enterprise deploying CIRKLE via
   `scripts/self-host-all.sh` gets the call stack for free (Docker
   image already exists for coturn + mediasoup).

### 5.2 Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CIRKLE Web Client (PWA)                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  src/lib/call-manager.ts (extended)                              │ │
│  │   • 1:1 path: RTCPeerConnection + DTLS-SRTP (E2EE)              │ │
│  │   • Group path: mediasoup-client (transports, producers,         │ │
│  │     consumers)                                                  │ │
│  │   • Signaling: Socket.IO to call-signaling-service:3006           │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────┬───────────────────────────────────┬───────────────────┘
                 │                                   │
                 │  WebSocket (signaling)            │  UDP/TCP (media)
                 │                                   │
                 ▼                                   ▼
┌────────────────────────────────────┐  ┌────────────────────────────────┐
│  call-signaling-service            │  │  mediasoup SFU                  │
│  (mini-services/call-signaling-    │  │  (Rust worker + Node.js router) │
│  service/index.ts, port 3006)      │  │  port 40000-49999 UDP (RTP/RTCP)│
│                                    │  │  port 4000-4999 TCP (fallback)  │
│  Events:                           │  └────────────────────────────────┘
│    call:offer / call:answer         │
│    call:ice                          │
│    call:mediasoup:rtpCapabilities   │
│    call:mediasoup:createTransport    │
│    call:mediasoup:connectTransport   │
│    call:mediasoup:produce            │
│    call:mediasoup:consume            │
└────────────────┬────────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│  coturn TURN server                 │
│  (Docker, port 3478 UDP/TCP,       │
│   port 5349 TLS)                    │
│                                    │
│  Used when STUN fails              │
│  (symmetric NAT, enterprise firewall)│
└────────────────────────────────────┘
```

### 5.3 Decision points resolved

| Decision Point                                    | Resolution                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| 1. SFU choice                                      | **mediasoup** (Node-native, supports Insertable Streams later)  |
| 2. TURN choice                                     | **Self-hosted coturn** (free, Docker, Cairo-region VPS)         |
| 3. Signaling mini-service                          | **Yes — extract `call:*` events into `call-signaling-service` on port 3006** |
| 4. Topology                                        | **P2P for 1:1, SFU for groups** (mesh never used)               |
| 5. E2EE for group calls                            | **Deferred to ADR-006** (Insertable Streams + SFrame); group calls today are transport-encrypted only |
| 6. Mobile support                                  | **iOS Safari 16+ required** for Simulcast; older Safari falls back to single-layer encoding |
| 7. Recording                                       | **Off by default; on-demand per call** via mediasoup observer; only enabled if both participants consent (or for Enterprise-tier moderation with policy notice) |

### 5.4 Mini-service specification — `call-signaling-service`

A new Socket.IO mini-service on port 3006 (alongside the existing
`chat-service:3003`, `news-service:3004`, `ai-realtime:3005`).

**File:** `mini-services/call-signaling-service/index.ts` (~500 LOC).

**Responsibilities:**

1. Relay `call:offer`, `call:answer`, `call:ice`, `call:end`,
   `call:reject`, `call:incoming` events (today these live in
   `chat-service`; this ADR moves them).
2. Mediate mediasoup signaling: `rtpCapabilities`, `createTransport`,
   `connectTransport`, `produce`, `consume`, `resumeConsumer`.
3. Manage call rooms: `room:create`, `room:join`, `room:leave`,
   `room:lock`, `room:kick`.
4. Track active call sessions (caller, callee, status, startedAt) —
   metadata only, no media, no SDP/ICE persisted.
5. Emit call lifecycle events to the Next.js REST API so the
   `CallSession` Prisma table stays consistent.

**Socket events** (full list):

| Direction         | Event                                | Payload                                          |
| ----------------- | ------------------------------------ | ------------------------------------------------ |
| Server → Client   | `call:incoming`                      | `{ callId, caller, type, room? }`                |
| Server → Client   | `call:participantJoined`             | `{ callId, participant }`                        |
| Server → Client   | `call:participantLeft`               | `{ callId, participant }`                        |
| Server → Client   | `call:newProducer`                   | `{ callId, producerId, kind }`                   |
| Server → Client   | `call:ended`                         | `{ callId, reason }`                             |
| Client → Server   | `call:offer`                          | `{ callId, callee, type, sdp }`                  |
| Client → Server   | `call:answer`                         | `{ callId, sdp }`                                |
| Client → Server   | `call:ice`                            | `{ callId, candidate }`                          |
| Client → Server   | `call:end`                           | `{ callId }`                                     |
| Client → Server   | `call:reject`                        | `{ callId, reason }`                             |
| Client → Server   | `call:mediasoup:rtpCapabilities`     | `{ callId, rtpCapabilities }`                    |
| Client → Server   | `call:mediasoup:createTransport`     | `{ callId, direction, options }`                 |
| Client → Server   | `call:mediasoup:connectTransport`    | `{ callId, transportId, dtlsParameters }`        |
| Client → Server   | `call:mediasoup:produce`             | `{ callId, transportId, kind, rtpParameters }`   |
| Client → Server   | `call:mediasoup:consume`             | `{ callId, producerId, rtpCapabilities }`         |
| Client → Server   | `call:mediasoup:resumeConsumer`      | `{ callId, consumerId }`                          |
| Client → Server   | `room:join`                          | `{ callId, userId }`                             |
| Client → Server   | `room:leave`                         | `{ callId }`                                     |

**Caddy gateway:** forward `?XTransformPort=3006` to the new service
(add to `Caddyfile`).

**Deployment artifact:** add to `scripts/self-host-all.sh` and
`docker-compose.yml` as a new service. Co-locate with the existing
`chat-service` on the same VPS.

### 5.5 Implementation phases

**Phase 1 (Week 1) — TURN reliability for 1:1:**

- Provision Cairo-region VPS.
- Deploy coturn via Docker (image `coturn/coturn:latest`).
- Update `ICE_SERVERS` in `src/lib/call-manager.ts` to include
  TURN URLs with shared secret (HMAC-SHA1 auth).
- Verify 1:1 call success rate improves from 80% to 95%+.

**Phase 2 (Week 2-3) — Signaling mini-service extraction:**

- Create `mini-services/call-signaling-service/`.
- Move `call:offer/answer/ice/end/reject/incoming` handlers from
  `chat-service` to `call-signaling-service`.
- Update `call-manager.ts` to connect to port 3006 instead of 3003
  for call events.
- Add `call-signaling-service` to `scripts/self-host-all.sh` and
  `docker-compose.yml`.
- Add `XTransformPort: 3006` to `Caddyfile` gateway.

**Phase 3 (Week 3-4) — mediasoup SFU:**

- Add `mediasoup` Node.js dependency.
- Implement SFU router/room logic in `call-signaling-service`.
- Update `call-manager.ts` to detect call participant count: if 2 →
  P2P path; if >2 → mediasoup path.
- Add mediasoup Docker image to `docker-compose.yml`.
- Test 5-participant, 10-participant, 25-participant, 50-participant
  calls.

**Phase 4 (Week 5) — UI + recording:**

- Update `src/components/overlays/call-screen.tsx` to render
  multi-participant grid (vs. the current 1:1 layout).
- Add "Record call" toggle (off by default; both parties must
  consent).
- Wire mediasoup observer to capture recording streams.

**Phase 5 (Week 6) — Simulcast + adaptive bitrate:**

- Enable simulcast encoding for Chrome / Safari 16+.
- Add adaptive bitrate layer selection in the SFU (forward low-res
  to mobile, high-res to desktop).

### 5.6 Conditions / Acceptance Criteria

This recommendation is contingent on:

1. **CTO sign-off** on the group-call E2EE trade-off (deferred to
   ADR-006).
2. **VPS provisioning** — a Cairo-region VPS with at least 4 vCPU
   and 8GB RAM for coturn + mediasoup (estimated $50/month).
3. **Bandwidth budget** — mediasoup at 50 participants × 2.5 Mbps =
   125 Mbps uplink; the VPS must support this.
4. **Compliance check** — Egypt NTRA may require VoIP licence for
   certain group-call features; verify before enabling >4 participant
   calls for Egyptian users (per `feature-manager.ts` rule
   `live_voice`).

### 5.7 Known Limitations Accepted by This Decision

| Issue                                         | Mitigation                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| Group calls not E2EE                          | ADR-006 (planned) — Insertable Streams + SFrame                            |
| mediasoup is a library, not a server          | ~500 LOC SFU app to be maintained by CIRKLE team                          |
| iOS Safari <16 lacks Simulcast                | Single-layer encoding fallback (lower quality but functional)             |
| Self-hosted TURN ops burden                   | Single Docker container; minimal maintenance                              |
| Recording stored on SFU (not E2EE)            | Off-by-default; consent-gated; deleted after 30 days by default           |
| 50-participant cap                            | Sufficient for Year-1; large-scale (webinars, 1000+) deferred              |
| mediasoup observer recording is not E2EE      | Per-call consent prompt; recording file encrypted at rest with the call ID |

---

## 6. Consequences

### Positive

- 1:1 call reliability improves from ~80% to ~95%+.
- Group calls become possible (5-50 participants) for the first time.
- E2EE preserved for all 1:1 calls (the high-sensitivity case).
- Signaling mini-service decouples call scaling from chat scaling.
- Fully self-hostable — sovereign deployments get the call stack for
  free.
- Recording support unlocks Commit evidence chains (moat C2+C4) and
  Enterprise moderation use cases.

### Negative

- One new VPS to manage (~$50/month in Cairo region).
- ~500 LOC SFU app to maintain (small but non-zero ongoing cost).
- Group calls not E2EE — ADR-006 needed for true end-to-end group
  encryption.
- Simulcast quirks on older Safari versions.
- Recording file storage adds disk requirement on SFU (estimate
  100 MB/hour per recorded call).

### Neutral

- The `chat-service` mini-service loses the `call:*` event handlers
  — it becomes purely a chat message + presence relay (cleaner
  responsibility separation).
- The `call-manager.ts` client API is unchanged for 1:1 calls; only
  the group-call code path is new.

---

## 7. Compliance Notes

- **Egypt (NTRA):** VoIP requires licence for commercial use; CIRKLE
  is non-commercial for end users per the §1 covenant. Verify the
  exact licence scope before scaling past 4-participant group calls
  for Egyptian users. The `feature-manager.ts` rule `live_voice` is
  the gate.
- **UAE (TRA):** VoIP requires licence; the `feature-manager.ts`
  rule already disables `live_voice` in UAE. CIRKLE routes through
  licensed partners (Botim/ToTok equivalent) — to be negotiated.
- **China (MIIT):** VoIP requires licence; `live_voice` disabled.
  P2P calls may be permitted for personal use — verify.
- **GDPR (EU):** Recording requires explicit consent per Article 7.
  The recording toggle is off by default; both participants must
  consent. Recording file metadata includes consent timestamps.
- **PIPL (China):** TURN/mediasoup VPS must be in-region (CN); use
  the `data-residency.ts` rules to route calls through the CN
  region for Chinese users.

---

## 8. References

- `src/lib/call-manager.ts` (current 1:1 P2P implementation)
- `mini-services/chat-service/index.ts` (current signaling host)
- `Caddyfile` (gateway routing rules)
- `scripts/self-host-all.sh` (Docker Compose stack)
- `docker-compose.yml` (deployment artifacts)
- ADR-001 §3 (WebRTC table — "Stable, all browsers incl. iOS Safari")
- ADR-002 §5 (DTLS-SRTP — call E2EE)
- mediasoup official docs — https://mediasoup.org/documentation/
- coturn official docs — https://github.com/coturn/coturn
- WebRTC Insertable Streams spec — https://w3.org/TR/webrtc-encoded-transform/
- SFrame spec (draft) — https://datatracker.ietf.org/doc/draft-omara-sframe/

---

## 9. Decision Log

| Date       | Action                                              | Actor                |
| ---------- | --------------------------------------------------- | -------------------- |
| 2026-08-12 | ADR drafted, status set to PROPOSED                  | Architecture Council |
| _pending_  | CTO review                                          | CTO                  |
| _pending_  | Approved / Rejected / Revised                       | CTO                  |
| _pending_  | Phase 1 implementation (coturn deploy)               | Engineering          |
| _pending_  | Phase 2 implementation (signaling mini-service)      | Engineering          |
| _pending_  | Phase 3 implementation (mediasoup SFU)               | Engineering          |
| _pending_  | ADR-006 draft (group-call E2EE via Insertable Streams)| Architecture Council |

---

**End of ADR-004**

# ADR-001: Platform Strategy for CIRKLE Super-App

| Field | Value |
|---|---|
| **ADR Number** | 001 |
| **Title** | Platform Strategy — Web-first PWA vs Flutter + Next.js |
| **Status** | PROPOSED (awaiting CTO approval) |
| **Date** | 2026-08-09 |
| **Decision Owner** | CIRKLE Architecture Council |
| **Supersedes** | — |
| **Superseded by** | — |
| **Blueprint reference** | CIRCLE BLUEPRINT v12.0 / v13, §3 (Zero-Cost Architecture), §31 (Tech Stack) |
| **Related ADRs** | (none yet) |

---

## 1. Context

CIRKLE is an ambitious "zero-cost super-app" targeting Egypt first, then the
MENA region, then global multi-plane deployment (China / Russia / Iran / Vietnam
/ EU). The CIRCLE BLUEPRINT v12.0 specifies a Flutter front-end backed by a
federated open-source stack (Matrix Synapse, Ory Hydra, ActivityPub, PeerTube,
IPFS/Kubo, ntfy, TileServer GL, Mailcow, ONNX runtime).

The **existing codebase** at HEAD `be6755e` is, however, a **Next.js 16 +
React 19 + TypeScript + Tailwind v4 + shadcn/ui + Prisma/SQLite** web
application with ~8 screens, 96 overlays, 173 API routes, 67 Prisma models and
227 lib modules — a substantial, working investment that does **not** match the
Flutter/blueprint stack.

This ADR records the decision of whether to:

- **Continue on the current web stack** and grow it toward PWA / installable
  app status (Option A), or
- **Adopt the blueprint's Flutter + federated back-end** stack and migrate
  (Option B), or
- **Pursue some hybrid** (Option C).

The decision has cascading consequences for: real-time chat E2EE (Olm/Megolm),
BLE/Wi-Fi Direct mesh, on-device ONNX models (~5 GB across NSFW / NLLB-200 /
Whisper / Piper / FaceNet / liveness), OIDC identity (Ory Hydra), self-hosted
mapping, and Mailcow email — all of which are deferred pending this ADR (see
`DEFERRED_FEATURES.md`).

---

## 2. Decision Drivers

1. **Existing investment** — 8 screens + 96 overlays + 227 lib modules + 173
   routes already built and deployed on Next.js. Migrating to Flutter would
   discard 6+ months of UI work and ~12k LOC of cognitive-AI architecture
   (TGSE / CIE / TEE / LIEE / UOB / AHG / IRDE / CRIE / PCPF) that already
   **exceeds** the blueprint's AI specifications.
2. **Zero-cost covenant** — the blueprint mandates $0 infrastructure for end
   users. Both options must satisfy this; the question is *operating* cost for
   the foundation, not user cost.
3. **Regional compliance** — China (CTID, ModelScope), Russia (Mir/SBP,
   Roskomnadzor), Iran, Vietnam, EU (GDPR). A web stack can serve all five
   planes from a single codebase with conditional feature flags; native apps
   require per-store approval cycles (especially China MIIT / App Store China).
4. **On-device AI** — the blueprint lists 14 ONNX models totaling ~5 GB. Web
   Assembly (WASM) + WebGPU now make this *possible* in-browser, but native
   Flutter still has a 2-3× performance advantage on the largest models
   (NLLB-200 900 MB, Whisper 150 MB).
5. **Mesh / P2P** — BLE + Wi-Fi Direct for off-grid messaging. Browsers cannot
   access BLE peripherals reliably (Web Bluetooth is Chrome-only, no iOS
   Safari support). Flutter can use `flutter_blue_plus` + `nearby_connections`.
6. **Time-to-market** — Egypt launch is the Year-1 milestone. Web/PWA can ship
   to production today; Flutter migration is estimated 4-6 months minimum.
7. **Maintenance cost** — one web team vs separate iOS/Android/Web teams.
8. **App Store friction** — Apple's 30% cut on in-app tipping/subscriptions
   would violate the "100% free for users, 0% commission for creators"
   covenant. PWA bypasses this entirely.

---

## 3. Considered Options

### Option A — Web-first PWA (continuation of current Next.js stack)

**Stack:** Next.js 16 + React 19 + Tailwind v4 + shadcn/ui + Prisma + SQLite
(Postgres in prod), delivered as a **Progressive Web App** installable on iOS
and Android home screens. Real-time via existing Socket.IO mini-services on
ports 3003 (chat), news-service, ai-realtime.

**Web APIs to evaluate:**

| Web API | Status (2026) | Used for in CIRKLE | Verdict |
|---|---|---|---|
| **Service Workers + Cache API** | Stable, all browsers | Offline feed, mail, vault | ✅ Adopt — already partially used by news cache |
| **Web App Manifest** | Stable | Installable PWA, splash, icons | ✅ Adopt — `src/app/manifest.ts` already exists |
| **Web Bluetooth (BLE GATT)** | Chrome/Edge/Android Chrome only; **NO iOS Safari** | Local Mesh peer discovery | ⚠️ Degraded — works on Android Chrome, not iOS |
| **WebRTC** | Stable, all browsers incl. iOS Safari | Voice/video calls, P2P file transfer | ✅ Adopt — `call-manager.ts` already uses it |
| **WebGPU** | Chrome/Edge stable; Firefox/Safari in development | ONNX Runtime Web GPU backend for on-device AI | ⚠️ Degraded on Safari; WASM fallback exists |
| **WebAssembly (WASM)** | Universal | ONNX Runtime Web (CPU), Tesseract OCR, Whisper.cpp | ✅ Adopt — universal fallback for on-device AI |
| **Background Sync / Periodic Sync** | Chrome only | Background mail sync, news prefetch | ⚠️ Degraded on iOS |
| **Push API (Web Push)** | Stable, all browsers incl. iOS 16.4+ | ntfy-equivalent push without Firebase | ✅ Adopt — replaces ntfy requirement |
| **Web NFC** | Android Chrome only | Tap-to-pay, contact exchange | ⚠️ Android-only |
| **IndexedDB** | Universal | Local E2EE message store, on-device matrix factorization | ✅ Adopt — already used by `personal-ai.ts` |
| **Web Crypto (SubtleCrypto)** | Universal | Olm-equivalent E2EE, AES-256-GCM, Ed25519 | ✅ Adopt — already used by `family-vault.ts`, `ticketing.ts` |
| **Web Transport / QUIC** | Chrome only | Low-latency mesh relay | ❌ Skip — too narrow |
| **BroadcastChannel API** | Universal (cross-tab only) | Same-device mesh mock | ✅ Already used by `mesh-network.ts` |

**Pros:**
- Preserves 100% of existing investment — no migration cost.
- Single codebase for all 5 data planes — feature-flag driven via existing
  `src/lib/regions.ts` and `data-residency.ts`.
- Bypasses App Store / Play Store commission — preserves "0% commission"
  covenant.
- Ships immediately to Egypt — no MIIT / Apple review cycle.
- On-device AI viable via WASM + WebGPU (slower than native but acceptable
  for the 8 models under 200 MB; the 900 MB NLLB-200 will need server-side
  fallback on Safari/iOS).
- E2EE viable via Web Crypto — `family-vault.ts` already proves the pattern
  works (real AES-256-GCM + PBKDF2 200k).
- Push viable via Web Push API (no Firebase, no ntfy server required).

**Cons:**
- **BLE mesh impossible on iOS Safari.** Local Mesh (blueprint §15) will be
  Android-Chrome-only until Web Bluetooth ships on iOS (no announced date).
- **WebGPU on-device AI degraded on Safari.** NLLB-200 (900 MB) and Whisper
  (150 MB) may be too slow without GPU acceleration; will need server fallback.
- **No background BLE scanning.** Mesh emergency SOS won't work in background
  on any browser.
- **Web Bluetooth requires HTTPS + user-gesture + explicit pairing** — not
  seamless peer discovery.
- **No real Wi-Fi Direct access** from any browser. Wi-Fi Direct mesh
  (blueprint §15.1) is impossible on the web platform.
- **App Store discoverability** is weaker than native apps.

**Mitigations:**
- Use WebRTC data channels as the mesh transport (works on all browsers);
  reserve BLE for future native wrapper.
- Ship a thin **Tauri or Capacitor** wrapper for Android to enable BLE/Wi-Fi
  Direct only when needed — same codebase, native shims for mesh only.
- For on-device AI, use a tiered strategy: WebGPU > WASM > server fallback
  based on `navigator.gpu` capability detection.
- For Push, use the existing Web Push API + a tiny self-hosted VAPID key
  server (no Firebase dependency).

---

### Option B — Flutter front-end + Next.js marketing/admin site (blueprint's stack)

**Stack:** Flutter 3.x for the mobile/desktop app + Next.js 16 retained only
for the marketing site, advertiser portal, and developer docs. Federated
back-end: Matrix Synapse (chat), Ory Hydra (OIDC), PeerTube (video),
Mailcow (mail), IPFS Kubo (storage), TileServer GL + Nominatim + OSRM (maps),
ntfy (push), self-hosted ONNX runtime (server-side with on-device mirror via
`tflite_flutter`).

**Native capabilities gained:**

| Capability | Flutter package | Blueprint ref |
|---|---|---|
| BLE peripheral discovery | `flutter_blue_plus` | §15.1 Local Mesh |
| Wi-Fi Direct / Nearby | `nearby_connections` (Android) / `MultipeerConnectivity` (iOS) | §15.1 |
| Native camera (HEIC/RAW) | `camera` + `image` | §8.3 Lamahat |
| On-device ONNX inference | `tflite_flutter` or `onnxruntime` Flutter bindings | §17, §24 |
| Foreground service / background BLE | `flutter_foreground_task` | §15.4 Emergency SOS |
| Native biometrics (Face ID / fingerprint) | `local_auth` | §16 Circle Verify |
| Native NFC (tap-to-pay) | `nfc_manager` | §19.3 |
| Native push (no Firebase via ntfy) | `flutter_local_notifications` + ntfy client | §3.7 |
| SQLite via `drift` (matches blueprint §3.3) | `drift` | §3.3 |

**Pros:**
- Matches blueprint exactly — no architectural divergence.
- BLE/Wi-Fi Direct mesh becomes real (the blueprint's privacy cornerstone).
- On-device AI works at full performance — all 14 ONNX models loadable.
- Native biometrics for Circle Verify (liveness + face match).
- App Store / Play Store discoverability.

**Cons:**
- **Discards 8 screens + 96 overlays + 227 lib modules of Next.js code** —
  estimated 4-6 months of full-time re-implementation. The cognitive-AI
  architecture (TGSE / CIE / TEE / LIEE / UOB / AHG / IRDE / CRIE / PCPF /
  autonomous-intelligence / brain-*) which is **beyond** the blueprint and
  powers the current Brain AI overlays, would need to be re-implemented in
  Dart or split into a back-end service.
- **Two teams** required: Flutter (mobile) + Next.js (web/admin) — doubles
  maintenance.
- **App Store commission problem** — Apple takes 30% on tipping, subscriptions,
  and "digital services." This conflicts with the §30 covenant ("100% free for
  users, 0% commission for creators"). Workaround: redirect to web for payment
  (clunky UX) or use Apple's "Reader App" / "External Link" entitlements (legal
  gray area, requires Apple approval per app).
- **China MIIT review** for App Store China is 4-12 weeks; web deployment is
  instant behind the GFW with the proper ICP license.
- **WebRTC still needed** for cross-platform calls — Flutter's WebRTC plugin
  (`flutter_webrtc`) is less mature than the browser's native WebRTC.
- **Doubling of infrastructure** — federated back-end still needs to be built
  regardless; Flutter doesn't reduce that work.

---

### Option C — Hybrid: Web-first PWA + thin native shim for mesh/biometrics only

**Stack:** Continue with Next.js 16 PWA as the primary surface. Ship a thin
**Capacitor** (or **Tauri Mobile** when stable) wrapper that exposes native
BLE, Wi-Fi Direct, biometrics, NFC, and foreground-service plugins to the web
view via a JavaScript bridge. The wrapper ships to App Store / Play Store with
minimal review friction because the UI is just a web view.

**Pros:**
- Preserves 100% of existing Next.js investment.
- Adds native BLE / Wi-Fi Direct / biometrics / NFC for the small subset of
  features that genuinely need them (Mesh §15, Verify §16, Payments NFC §19.3).
- Single codebase, single team — the wrapper is ~200 LOC of plugin glue.
- App Store / Play Store discoverability maintained.
- Web view performance in 2026 (especially with WKWebView's Nitro engine on
  iOS and Chromium WebView on Android) is within 5-10% of native for the
  UI-heavy use cases CIRKLE has.
- Migration is incremental — start as PWA-only, add the wrapper when Mesh/Verify
  ship.

**Cons:**
- Two shipping surfaces (web + wrapped app) require two CI pipelines.
- App Store may reject "wrapper" apps that are "just a website" — must
  demonstrate native-feature usage (BLE, biometrics) to pass review.
- Web view rendering quirks (especially older Android WebView versions) require
  testing matrix.
- Plugin ecosystem for Capacitor is mature but not as deep as native Flutter.
- Still subject to Apple's 30% commission if any in-app payment triggers it
  (same problem as Option B).

---

## 4. Comparison Matrix

| Criterion | Option A (PWA) | Option B (Flutter) | Option C (Hybrid) |
|---|---|---|---|
| Existing investment retained | ✅ 100% | ❌ 0% (full rewrite) | ✅ 100% |
| Time-to-market Egypt | ✅ Days | ❌ 4-6 months | ⚠️ 2-4 weeks (web first) |
| BLE mesh | ⚠️ Android-Chrome only | ✅ Full | ✅ Full (via plugin) |
| Wi-Fi Direct mesh | ❌ Impossible | ✅ Full | ✅ Full (via plugin) |
| On-device ONNX (large models) | ⚠️ WebGPU/WASM, slow on iOS | ✅ Native perf | ⚠️ Same as PWA (web view) |
| Native biometrics | ❌ Web Authn only | ✅ Face ID / fingerprint | ✅ Via plugin |
| E2EE (Olm-equivalent) | ✅ Web Crypto | ✅ Native crypto | ✅ Web Crypto |
| App Store discoverability | ❌ None | ✅ Yes | ✅ Yes |
| App Store 30% commission risk | ✅ Bypassed | ❌ Risk to covenant | ⚠️ Risk if payments in-app |
| China MIIT review cycle | ✅ Bypassed (web) | ❌ 4-12 weeks | ⚠️ Wrapper still reviewed |
| Single team / single codebase | ✅ Yes | ❌ Two teams | ✅ Yes |
| Federated back-end still required? | ✅ Yes (independent) | ✅ Yes | ✅ Yes |
| Maintenance complexity | ✅ Low | ❌ High | ⚠️ Medium |
| On-device AI on iOS Safari | ❌ No WebGPU | ✅ Native | ❌ Same as PWA |
| Push without Firebase/ntfy | ✅ Web Push | ⚠️ Self-hosted ntfy | ✅ Web Push + native |
| Covenant compliance (0% commission) | ✅ Yes | ❌ At risk | ⚠️ At risk |
| Cost to ship Year-1 Egypt | ✅ $0 incremental | ❌ 4-6 mo eng | ⚠️ 2-4 wk eng |

---

## 5. Recommendation

**ADOPT Option A — Web-first PWA strategy** as the primary platform decision,
with explicit deferral of the features that genuinely require native BLE /
Wi-Fi Direct / native biometrics (Local Mesh §15, parts of Circle Verify §16)
until either:

(a) the Web Bluetooth / Web NFC standards mature on iOS Safari, **or**
(b) a separate downstream ADR (ADR-002 — Native Wrapper for Mesh/Biometrics)
    approves a thin Capacitor wrapper for those specific features only.

### Rationale

1. **Pragmatic respect for sunk cost.** The codebase already exceeds the
   blueprint on cognitive-AI architecture and matches it on UI completeness
   for the top-5 modules (Home, Wasl, Mashahd, Midan, Lamahat). A Flutter
   rewrite would discard the differentiating AI work (TGSE/CIE/TEE/LIEE/UOB)
   that has no blueprint equivalent — work that took 3+ months of focused
   engineering.

2. **Covenant preservation.** The "0% commission" covenant is fundamentally
   incompatible with App Store / Play Store in-app-payment rules. Option A
   keeps CIRKLE entirely outside those rules. Option B/C would require either
   accepting 30% commission (covenant violation) or building a clunky
   "redirect-to-web-for-payment" UX that confuses users.

3. **Web platform is "good enough" for 80% of blueprint features.** Of the
   145 sub-sections audited in Parts 11-36, only **3** genuinely require native
   capabilities that the web cannot provide:
   - §15.1 BLE/Wi-Fi Direct mesh (deferred — see DEFERRED_FEATURES.md)
   - §16.2 Liveness ONNX model on iOS (workable via WebGPU on Android/Chrome)
   - §19.3 NFC tap-to-pay offline (Android-Chrome has Web NFC; iOS deferred)
   
   Everything else — E2EE (Web Crypto), on-device translation (WASM NLLB),
   voice calls (WebRTC), local AI training (WASM matrix factorization),
   offline maps (Service Worker cache), push (Web Push API), backup
   (IndexedDB + AES-256-GCM already proven in `family-vault.ts`) — is
   achievable on the web platform today.

4. **Time-to-market for Egypt Year-1.** The Year-1 quantitative goals
   (blueprint §1.6) are best served by shipping now on web rather than
   rewriting for 4-6 months. Web traffic converts well in Egypt (94% mobile
   web browsing, per GSMA 2025) and PWA install prompts are well-supported
   on Android Chrome (the dominant browser).

5. **All five data planes served from one codebase.** Web platform is the
   only realistic option for serving China (behind GFW), Russia, Iran, and
   Vietnam from a single deployment with conditional feature flags. Native
   apps require per-store approval in each country, especially China MIIT.

6. **Federated back-end is independent of this decision.** Whether CIRKLE
   eventually deploys Matrix Synapse, Ory Hydra, PeerTube, Mailcow, etc. is
   a separate infrastructure decision (ADR-003 — Federated Back-end, planned).
   The web client can talk to those services via standard HTTP/WebSocket
   regardless of front-end framework.

### Conditions / Acceptance Criteria

This recommendation is contingent on:

1. **CTO sign-off** on accepting the iOS-Safari limitations for BLE mesh and
   WebGPU on-device AI (see "Known Limitations" below).
2. **CTO sign-off** on deferring Local Mesh §15 to a future ADR-002 (native
   wrapper) rather than blocking Year-1 launch on it.
3. **Adoption of the deferred features list** (`DEFERRED_FEATURES.md`) as the
   canonical "out-of-scope for Year-1" reference.
4. **Quarterly review** of Web Bluetooth / WebGPU adoption on iOS Safari —
   if Apple ships either by 2027-Q2, escalate ADR-002 to consider whether
   the native wrapper is still needed.

### Known Limitations Accepted by This Decision

| Blueprint feature | Web limitation | Mitigation |
|---|---|---|
| §15.1 BLE mesh | No iOS Safari support | Defer mesh to ADR-002; use WebRTC data channels for online peer relay |
| §15.1 Wi-Fi Direct mesh | No browser support | Defer to ADR-002 |
| §15.4 Background emergency SOS | No background BLE on any browser | Defer to ADR-002 |
| §16.2 Liveness ONNX on iOS | No WebGPU on Safari | Server-side fallback via existing `/api/verify/start` |
| §16.3 Face match ONNX on iOS | Same as above | Server-side fallback |
| §17.1 NSFW detection on iOS | Same as above | Server-side fallback (acceptable trade-off for NSFW) |
| §19.3 NFC tap-to-pay | iOS Safari blocks Web NFC | QR-code fallback (already in pay-screen) |
| §24.1 NLLB-200 on iOS (900 MB) | No WebGPU; WASM too slow | Server-side translation via `/api/ai/translate` (already exists) |

---

## 6. Consequences

### Positive

- Year-1 Egypt launch ships **immediately** on existing codebase.
- All deferred features (Matrix, OIDC, IPFS, PeerTube, Mailcow, ONNX,
  BLE mesh) are properly documented as deferred rather than silently
  unbuilt — improves planning transparency.
- Federated back-end can be added incrementally without touching the
  front-end decision.
- App Store / Play Store commission risk is eliminated.
- Single team can maintain the entire surface.

### Negative

- iOS users get a degraded mesh / on-device-AI experience until either
  Safari ships Web Bluetooth/WebGPU or ADR-002 approves a native wrapper.
- App Store discoverability is weaker than native competitors.
- The "Thin native wrapper" question (ADR-002) remains open and must be
  resolved before Local Mesh §15 can ship.

### Neutral

- The `download/cirkle-brain-ai/` Flutter project (a parallel exploration)
  remains as reference material but is **not** the production codebase. It
  can be revisited if ADR-001 is later superseded.

---

## 7. Compliance Notes

- This ADR does **not** violate any covenant in blueprint §1 (Zero-Cost
  Principles): users remain 100% free, no billing details collected, no
  App Store commission paid.
- This ADR does **not** preclude future federation — it only concerns the
  client platform. Federation is decided in ADR-003 (planned).
- This ADR **does** defer the following blueprint sections pending ADR-002:
  §15 (Local Mesh), parts of §16 (Circle Verify biometrics), parts of §17
  (on-device NSFW on iOS), parts of §24 (on-device NLLB on iOS). See
  `DEFERRED_FEATURES.md` for the full deferral list.

---

## 8. References

- `CIRCLE BLUEPRINT v12.0` §3 (Zero-Cost Architecture), §31 (Tech Stack)
- `worklog.md` Task AUDIT-BLUEPRINT-1 (Parts 1-10 gap analysis)
- `worklog.md` Task AUDIT-BLUEPRINT-2 (Parts 11-36 gap analysis)
- `docs/CIRKLE-BLUEPRINT-COMPLIANCE.md` — full compliance matrix
- `docs/DEFERRED_FEATURES.md` — deferred features list
- `docs/CIRKLE-DEPENDENCY-MATRIX.md` — feature dependency graph
- MDN Web Docs — Web Bluetooth, WebGPU, WebAssembly, Service Workers, Web Push
- Apple WebKit Status — Web Bluetooth (Not Planned), WebGPU (In Development)

---

## 9. Decision Log

| Date | Action | Actor |
|---|---|---|
| 2026-08-09 | ADR drafted, status set to PROPOSED | Architecture Council |
| _pending_ | CTO review | CTO |
| _pending_ | Approved / Rejected / Revised | CTO |

---

**End of ADR-001**

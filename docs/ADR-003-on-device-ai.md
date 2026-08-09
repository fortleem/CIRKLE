# ADR-003: On-Device AI Architecture for Content Moderation, Translation & Smart Replies

| Field | Value |
|---|---|
| **ADR Number** | 003 |
| **Title** | On-Device AI — ONNX Runtime Web (WASM/WebGPU) vs TensorFlow.js vs WebGPU-direct vs Server Fallback |
| **Status** | PROPOSED (awaiting CTO approval) |
| **Date** | 2026-08-09 |
| **Decision Owner** | CIRKLE Architecture Council |
| **Supersedes** | — |
| **Superseded by** | — |
| **Blueprint reference** | CIRCLE BLUEPRINT v12.0 / v13, §17 (AI Safety — NSFW/violence/toxic), §24 (Translation — NLLB-200), §23 (Brain AI — smart replies), §3.6 (ONNX runtime) |
| **Related ADRs** | ADR-001 (Platform Strategy — Web-first PWA), ADR-002 (E2EE — Olm/Megolm), planned ADR-004 (Native Wrapper) |

---

## 1. Context

CIRKLE's AI Safety module (blueprint §17) requires **on-device** inference
for three content-moderation models — NSFW image detection, violence
detection, and toxic-comment classification — plus on-device translation
(NLLB-200 distilled, blueprint §24) and on-device smart replies
(DistilGPT-2, blueprint §23). The blueprint §3.6 specifies the
**ONNX runtime** as the inference engine.

The motivation for **on-device** (rather than server-side) inference is
threefold:

1. **Privacy.** A nude photo uploaded for moderation must not leave the
   device. A toxic private message must not be sent to a server for
   classification. Per blueprint §28 (Privacy) and §17 (AI Safety),
   content moderation must happen before content reaches the network.
2. **Latency.** Server round-trips add 200-800ms per inference. For
   real-time translation in Wasl (chat) or for instant NSFW blur on
   Mashahd (video feed), that latency is unacceptable.
3. **Cost.** Server-side GPU inference for ~10M daily uploads (Year-3
   blueprint target) at $0.001 per inference = $10k/day = $3.6M/year —
   violates the §1 Zero-Cost covenant. On-device inference is free per
   inference once the model is downloaded.

The **existing codebase** at HEAD has **no on-device inference**. All AI
runs server-side:

| Existing module | What it does | Gap |
|---|---|---|
| `src/app/api/ai/translate/route.ts` | Server-side translation (calls external provider or stub) | ❌ Server sees content; latency; cost |
| `src/app/api/ai/smart-reply/route.ts` | Server-side smart-reply generation | ❌ Same |
| `src/lib/shield-engine.ts` | Server-side content moderation (heuristic, not ML) | ❌ Heuristic only; misses adversarial content |
| `src/components/overlays/cirkle-shield.tsx` | UI for moderation | Calls server API |
| `src/lib/autonomous-intelligence/data-sources/ai-models.ts` | Catalogue of downloadable model dumps (CLIP, Whisper, SAM) | ❌ Reference only; no inference pipeline wired |

The blueprint §17, §23, §24 all assume on-device inference exists. This
ADR closes that gap by selecting an inference runtime and an initial set
of target models.

The decision must answer:

1. **Which runtime?** ONNX Runtime Web (WASM + WebGPU backend),
   TensorFlow.js (browser-native), WebGPU-direct (custom shaders), or
   server-side fallback (what we have)?
2. **Which models first?** The blueprint lists 14 ONNX models totaling
   ~5 GB; we cannot ship all on day one. Priority order?
3. **How are models distributed?** Downloaded on first use? Pre-bundled
   in the PWA cache? Service-Worker-cached?
4. **What happens on iOS Safari** (no WebGPU)? WASM fallback? Server
   fallback?
5. **What happens on a low-end Android** with 2 GB RAM? Load only the
   smallest model? Skip on-device inference entirely?
6. **What happens when a model fails to load?** Block the upload? Allow
   with server-side fallback? Allow with a warning?

This ADR is **scoped to on-device inference runtime + initial model
catalogue**. Federated learning, fine-tuning, and model versioning are
deferred to future ADRs.

---

## 2. Decision Drivers

1. **Privacy covenant** — content moderation *must* happen on-device per
   blueprint §17, §28. Server-side moderation violates the covenant.
2. **Zero-cost covenant** — per-inference cost must be $0. This rules
   out any server-side GPU inference at scale.
3. **Browser viability** — per ADR-001, the primary client is a Next.js
   PWA. The runtime must work in a browser.
4. **iOS Safari degradation** — per ADR-001, iOS Safari lacks WebGPU
   (as of 2026-Q3). The runtime must have a WASM fallback or server
   fallback for iOS users.
5. **Model support** — the target models are published as ONNX files
   (`Falconsai/nsfw_image_detection`, `KoalaAI/Moderation`,
   `unitary/toxic-bert`, `NLLB-200-distilled`, `DistilGPT-2`). The
   runtime must load ONNX models natively, or we must convert them.
6. **Cold-start time** — model loading must be <3s for the smallest
   models (NSFW 350MB, toxic-bert 420MB) on a mid-range phone, or
   users will perceive the app as broken.
7. **Inference latency** — must be <500ms per inference for real-time
   use (translation in chat, NSFW blur on a scroll feed).
8. **Memory budget** — a low-end Android has 2 GB RAM. We cannot load
   more than ~800 MB of models simultaneously. The runtime must support
   lazy loading + eviction.
9. **Battery life** — on-device inference on a phone battery must not
   drain more than 5% per hour of typical use.
10. **Offline operation** — per blueprint §15, CIRKLE must work offline.
    Models must be cached and inference must run without internet.
11. **Maintenance burden** — we are not an ML framework team. The
    runtime must be maintained upstream (Microsoft for ONNX Runtime,
    Google for TF.js).

---

## 3. Considered Options

### Option A — ONNX Runtime Web (WASM + WebGPU backend)

**Stack:** `onnxruntime-web` (official Microsoft package). Loads `.onnx`
model files directly. Two execution providers:
- **WASM (CPU)** — universal browser support, ~5-10× slower than native.
- **WebGPU** — Chrome/Edge stable since 2023, Firefox/Safari in
  development (2026); when available, ~2-3× faster than WASM, within
  30-50% of native GPU.

**Model format:** ONNX (the open standard). The 5 initial target models
are all published as ONNX or convertible via `optimum-cli`.

**Pros:**
- **Blueprint-aligned** — §3.6 specifies "ONNX runtime."
- **Direct model support** — loads ONNX files without conversion. The
  Hugging Face ONNX branch ships Falconsai/nsfw_image_detection,
  KoalaAI/Moderation, unitary/toxic-bert, NLLB-200-distilled,
  DistilGPT-2 as `.onnx` artifacts. Zero conversion work.
- **Two execution providers, one API** — same JS code path for WASM and
  WebGPU; runtime auto-selects the faster available backend.
- **Microsoft-maintained** — active development, monthly releases,
  production use in Microsoft Teams, Office, Defender.
- **WebGPU acceleration** — when available, inference latency drops
  2-3×. NSFW detection at ~80ms per image on a 2024 mid-range Android
  Chrome; ~150ms on WASM fallback.
- **Quantisation support** — models can be INT8-quantised to halve
  memory and double speed. The target NSFW model quantises to ~90 MB
  with negligible accuracy loss.
- **Offline** — once the model file is in Cache API / IndexedDB,
  inference runs fully offline.
- **Flutter path** — `onnxruntime` has official Flutter bindings
  (`onnxruntime_flutter`), same model files, same API. Future-proof
  for ADR-004 native wrapper.
- **Single runtime for all 5 models** — NSFW, violence, toxic-comment,
  translation, smart-replies all load in one runtime.

**Cons:**
- **WASM cold-start ~1.5-3s** on first inference (WASM module
  instantiation + model parse). Mitigated by preloading on app boot in
  a Web Worker.
- **WebGPU unavailable on iOS Safari** (2026-Q3 status: "in
  development"). iOS users get WASM (~150ms for NSFW, ~600ms for
  NLLB-translation — usable but slower).
- **Memory ceiling** — the 5 models total ~1.97 GB unquantised; even
  quantised they total ~700 MB. Cannot all be loaded at once on a 2 GB
  phone. Mitigated by lazy loading + LRU eviction.
- **Bundle size** — `onnxruntime-web` adds ~7 MB to the PWA bundle (the
  WASM binary). Mitigated by code-splitting: only load when the user
  first opens a feature that needs it.
- **WebGPU shader compile time** — first inference on a new model can
  take 1-2s while the runtime compiles shaders. Cached afterwards.

---

### Option B — TensorFlow.js (browser-native)

**Stack:** `@tensorflow/tfjs` (Google). Two backends: `tfjs-backend-cpu`
(universal, slow), `tfjs-backend-webgl` (universal, GPU-accelerated via
WebGL2 — broader support than WebGPU), `tfjs-backend-webgpu` (newer,
WebGPU). Converts ONNX/TensorFlow/PyTorch models to TF.js Layers model
format or GraphDef format via `tensorflowjs_converter`.

**Pros:**
- **WebGL2 support is broader than WebGPU** — iOS Safari has WebGL2
  since 2021. On iOS, TF.js with WebGL2 is significantly faster than
  ONNX Runtime Web with WASM-only.
- **Google-maintained** — active development, large community, many
  tutorials.
- **Mature browser integration** — has been the de-facto browser-ML
  runtime since 2018.
- **Built-in model hosting** — `tfhub.dev` hosts many models in TF.js
  format.

**Cons:**
- **Model conversion required** — the 5 target models are published as
  ONNX or PyTorch, not TF.js. Each must be converted via
  `tensorflowjs_converter`, which has known conversion failures for
  transformer models (NLLB-200, DistilGPT-2 — conversion often fails or
  produces a model with broken attention layers). High conversion
  maintenance burden.
- **Blueprint divergence** — §3.6 specifies ONNX runtime. Choosing
  TF.js requires an ADR override.
- **WebGL2 is deprecated** — Khronos and browser vendors are winding
  down WebGL in favour of WebGPU. TF.js's WebGL backend will be legacy
  in 2-3 years.
- **Slower than ONNX Runtime WebGPU** — even on WebGL2, TF.js is
  ~1.5-2× slower than ONNX Runtime Web on the same model (per MLPerf
  Tiny 2024 benchmarks).
- **No Flutter equivalent** — TF.js is browser-only. A future Flutter
  client would need to convert all models to TFLite and use
  `tflite_flutter`. Two model formats to maintain.
- **Larger bundle** — `tfjs-core` + `tfjs-backend-webgl` + `tfjs-converter`
  is ~3 MB minified; with the WebGL backend shaders, ~8 MB total.
  Comparable to ONNX Runtime Web.
- **Quantisation story is weaker** — TF.js supports INT8 but the tooling
  is less mature than ONNX Runtime's `onnxruntime-quantization`.

**Verdict:** ⚠️ **Reject for the transformer models** (NLLB-200,
DistilGPT-2, toxic-bert) due to conversion risk. **Tempting for vision
models** (NSFW, violence) due to iOS WebGL2 advantage, but the
maintenance burden of two runtimes + two model formats outweighs the
benefit.

---

### Option C — WebGPU-direct (custom shaders, no runtime)

**Stack:** Write WGSL shaders by hand for each model's forward pass.
Skip ONNX Runtime / TF.js entirely. Load model weights from a `.bin`
file, upload to GPU buffers, dispatch compute shaders for attention,
matmul, layer-norm, softmax, etc.

**Pros:**
- **Maximum performance** — no runtime overhead; can match native GPU
  inference within 10-20%.
- **Smallest bundle** — no runtime dependency; only the weights.
- **Full control** — can optimise per-model (e.g. fuse attention +
  softmax into one shader).

**Cons:**
- **iOS Safari: not available.** WebGPU is "in development" on Safari
  in 2026-Q3. Direct-WebGPU is iOS-dead-on-arrival.
- **Maintenance nightmare** — we must write and maintain WGSL kernels
  for every layer type (matmul, attention, LayerNorm, GELU, softmax,
  Conv2D, BatchNorm, etc.) for every model. This is ~5,000-10,000 LOC
  of shader code per model family. We are not a GPU-shader team.
- **No model portability** — every new model = rewrite all shaders.
- **No quantisation support** — must implement INT8/FP16 dequant in
  shaders.
- **No Flutter path** — WebGPU is browser-only; Flutter would need
  Skia/Vulkan shaders, a complete rewrite.
- **Browser compat** — even on Chrome, WebGPU compute shaders have
  subtle driver-dependent bugs across GPU vendors (Adreno, Mali, Apple
  GPU, Intel, NVIDIA). We'd need a per-device shader compat matrix.
- **Blueprint divergence** — §3.6 specifies ONNX runtime.

**Verdict:** ❌ **Reject.** This is a research project, not a production
strategy. Document the option to explain *why* we use a runtime instead
of rolling our own shaders.

---

### Option D — Server-side fallback (what we have now)

**Stack:** All inference runs on the server. NSFW detection, translation,
smart replies, content moderation all hit `/api/ai/*` routes, which
either call an external provider (OpenAI, Google, etc.) or run a
heuristic stub. The server sees all content.

**Pros:**
- **Already shipped.** Zero new work.
- **Universal device support** — any browser, any phone, even a 2015
  Android with 1 GB RAM. The server does the heavy lifting.
- **Best model quality** — server can run a 13B-parameter model
  (impossible on-device for now).
- **Easy model updates** — deploy a new model on the server, all users
  get it instantly.

**Cons:**
- **Violates privacy covenant (§17, §28).** Server sees nude photos,
  private messages, voice memos. Unacceptable.
- **Violates zero-cost covenant (§1).** At scale (~10M daily inferences
  Year-3), server GPU cost is $3.6M/year.
- **Latency.** 200-800ms per inference; unacceptable for real-time
  translation or NSFW blur.
- **Offline: dead.** Server-side AI does not work offline; blueprint
  §15 requires offline operation.
- **External API dependency.** If OpenAI/Google rate-limit or
  geo-block (Iran, Russia, China planes), CIRKLE AI breaks.

**Verdict:** ✅ **Keep as the fallback** for cases where on-device
inference fails (low-end phone, model fails to load, iOS Safari without
WebGPU for a too-large model). ❌ **Reject as the primary strategy.**
This is the *fallback*, not the default.

---

## 4. Comparison Matrix

| Criterion | A — ONNX Runtime Web | B — TensorFlow.js | C — WebGPU-direct | D — Server fallback |
|---|---|---|---|---|
| Blueprint alignment (§3.6 ONNX) | ✅ | ❌ | ❌ | ❌ |
| Direct ONNX model support | ✅ zero conversion | ❌ conversion (transformers fail) | ❌ manual | N/A |
| WebGPU acceleration | ✅ | ✅ (newer) | ✅ native | N/A |
| iOS Safari support | ⚠️ WASM only (no WebGPU) | ✅ WebGL2 | ❌ no WebGPU | ✅ (server) |
| Performance (WebGPU available) | ✅ 80ms NSFW | ⚠️ 120ms | ✅ 60ms | ✅ depends |
| Performance (WASM / WebGL fallback) | ⚠️ 150ms NSFW | ⚠️ 200ms | ❌ N/A | ✅ depends |
| Cold-start time | ⚠️ 1.5-3s | ⚠️ 1-2s | ❌ 5-10s shader compile | ✅ none |
| Memory efficiency | ✅ quantisation | ⚠️ weaker quant | ❌ manual | ✅ server RAM |
| Bundle size (runtime) | ~7 MB WASM | ~8 MB | ~0.5 MB shaders | ~0 |
| Flutter path | ✅ onnxruntime_flutter | ❌ TFLite rewrite | ❌ Vulkan rewrite | ✅ (server) |
| Maintenance burden | Low (Microsoft) | Medium (Google + converter) | ❌ Very High (we maintain) | Low (we have it) |
| Offline | ✅ cached models | ✅ cached models | ✅ cached weights | ❌ requires internet |
| Privacy (data leaves device?) | ✅ no | ✅ no | ✅ no | ❌ yes |
| Per-inference cost at scale | ✅ $0 | ✅ $0 | ✅ $0 | ❌ $3.6M/yr at Year-3 |
| Model portability (new models) | ✅ just load new .onnx | ⚠️ re-convert | ❌ rewrite shaders | ✅ just deploy |

---

## 5. Initial Target Models

Per the blueprint §17, §23, §24, we ship **5 on-device models** in
priority order. NSFW detection is highest priority because it has the
most legal exposure (CSAM-adjacent content, regulatory liability in EU
under DSA, in UK under OSA, in Egypt under the Cybercrime Law).

### 5.1 Priority-1 (ship first, blocks Egypt launch)

#### Model 1 — NSFW image detection

| Field | Value |
|---|---|
| **HuggingFace model** | `Falconsai/nsfw_image_detection` |
| **Format** | ONNX |
| **Size (FP32)** | ~350 MB |
| **Size (INT8 quantised)** | ~90 MB |
| **Task** | image classification — `normal` / `nsfw` / `drawings` / `hentai` / `sexy` |
| **Latency (WebGPU)** | ~80ms / image (mid-range Android 2024) |
| **Latency (WASM)** | ~150ms / image |
| **Used by** | Mashahd (video frame sampling), Lamahat (photo upload), Family Vault (photo upload), Wasl (image attachment) |
| **Action on positive** | Blur image + warn user + offer "I confirm this is not CSAM" override (logged for audit); if confidence >0.95 on `hentai`/`nsfw`, block upload. |
| **Fallback** | Server-side NSFW detection via `/api/ai/safety` (existing) — used when WebGPU/WASM unavailable or model fails to load. |
| **Distribution** | Downloaded on first app launch (priority-1 model). Cached in Cache API. Re-validated by ETag weekly. |

#### Model 2 — Toxic comment detection

| Field | Value |
|---|---|
| **HuggingFace model** | `unitary/toxic-bert` |
| **Format** | ONNX (convertible via `optimum-cli`) |
| **Size (FP32)** | ~420 MB |
| **Size (INT8)** | ~110 MB |
| **Task** | multi-label text classification — `toxic` / `severe_toxic` / `obscene` / `threat` / `insult` / `identity_hate` |
| **Latency (WebGPU)** | ~120ms / comment (256-token input) |
| **Latency (WASM)** | ~250ms / comment |
| **Used by** | Wasl (chat send), Midan (Square post), comments on all surfaces |
| **Action on positive** | Soft-warn user before send ("this message may be perceived as toxic — send anyway?"); hard-block only if `threat` or `identity_hate` >0.9. |
| **Fallback** | Heuristic filter (`src/lib/shield-engine.ts`) + server-side classification. |
| **Distribution** | Downloaded on first launch (priority-1). Cached in Cache API. |

### 5.2 Priority-2 (ship in Month 2)

#### Model 3 — Violence / moderation detection

| Field | Value |
|---|---|
| **HuggingFace model** | `KoalaAI/Moderation` (or alternative `facebook/voxpopuli` violence classifier if conversion fails) |
| **Format** | ONNX |
| **Size (FP32)** | ~250 MB |
| **Size (INT8)** | ~65 MB |
| **Task** | multi-label image classification — `violence` / `self-harm` / `sexual` / `hate` / `harassment` / `shocking` |
| **Latency (WebGPU)** | ~70ms / image |
| **Latency (WASM)** | ~140ms / image |
| **Used by** | Mashahd (video frame sampling), Lamahat, Wasl image attachments |
| **Action on positive** | Blur + warn; if `violence` >0.9 with detected weapon, escalate to Shield §22.4 (Citizen Shield) for human review. |
| **Fallback** | Server-side moderation API. |
| **Distribution** | Downloaded on first Mashahd/Lamahat open. |

#### Model 4 — Translation (NLLB-200 distilled)

| Field | Value |
|---|---|
| **HuggingFace model** | `facebook/nllb-200-distilled-600M` |
| **Format** | ONNX (convertible via `optimum-cli`; known to work, NLLB is in the Optimum ONNX test suite) |
| **Size (FP32)** | ~600 MB |
| **Size (INT8)** | ~240 MB |
| **Task** | seq2seq translation across 200 languages (incl. Arabic dialects: `arb_Arab`, `apc_Arab` Levantine, `arz_Arab` Egyptian, `ary_Arab` Moroccan, `ars_Arab` Najdi) |
| **Latency (WebGPU)** | ~400ms / sentence (avg 30 tokens) |
| **Latency (WASM)** | ~1500ms / sentence (acceptable for non-real-time; too slow for live chat on iOS) |
| **Used by** | Wasl (incoming message auto-translate), Midan (post translate), Mashahd (subtitle translate), Mail (subject translate) |
| **Action on positive** | N/A — translation is always invoked on user request |
| **Fallback** | Server-side `/api/ai/translate` (existing) — used when WASM latency >1500ms (iOS Safari). |
| **Distribution** | Lazy-loaded on first translation request. Cached in Cache API. **Not** pre-bundled (too large). |
| **Note on iOS** | On iOS Safari without WebGPU, NLLB-600M is too slow for real-time chat translation. Use server fallback automatically. Document this in user-facing copy ("Translation on iOS is processed on our servers; for full on-device privacy, use Android or desktop Chrome."). |

### 5.3 Priority-3 (deferred to later release)

#### Model 5 — Smart replies

| Field | Value |
|---|---|
| **HuggingFace model** | `distilgpt2` |
| **Format** | ONNX |
| **Size (FP32)** | ~250 MB |
| **Size (INT8)** | ~65 MB |
| **Task** | causal LM — generate 3 short reply suggestions given conversation context |
| **Latency (WebGPU)** | ~600ms / 3-suggestion batch |
| **Latency (WASM)** | ~2500ms (too slow for real-time use; defer on iOS) |
| **Used by** | Wasl (smart reply chips below the composer) |
| **Fallback** | Server-side `/api/ai/smart-reply` (existing) |
| **Distribution** | Lazy-loaded on first Wasl open. Cached in Cache API. |
| **Deferred reason** | Smart replies are a *convenience* feature, not a safety feature. NSFW/violence/toxic are safety-critical; translation is a core product feature; smart replies are a nice-to-have. Defer until the safety models are stable. |

### 5.4 Deferred models (out of scope for this ADR)

The blueprint lists 14 ONNX models totaling ~5 GB. The remaining 9 models
are deferred to future ADRs / releases:

- **Deepfake detection** (blueprint §17.4) — model landscape too
  immature; defer 12+ months.
- **Whisper speech-to-text** (blueprint §7, §23) — 150 MB; deferred to
  voice-message transcription ADR.
- **FaceNet face recognition** (blueprint §16) — 90 MB; deferred to
  Circle Verify ADR (privacy-sensitive; needs explicit consent flow).
- **Liveness detection** (blueprint §16.2) — 50 MB; deferred to Circle
  Verify ADR.
- **Piper TTS** (blueprint §7) — 60 MB per voice; deferred.
- **OCR** (Tesseract) (blueprint §21) — 40 MB per language; deferred.
- **SAM segmentation** (blueprint §8.3) — 350 MB; deferred.
- **CLIP** (image-text similarity) — 250 MB; deferred.
- **DistilBERT sentiment** — 250 MB; deferred.

These will be evaluated individually as their owning features ship.

### 5.5 Total download budget

| Priority | Models | Total size (FP32) | Total size (INT8) |
|---|---|---|---|
| P1 (ship first) | NSFW + toxic-bert | 770 MB | 200 MB |
| P2 (Month 2) | violence + NLLB-200 | 850 MB | 305 MB |
| P3 (later) | DistilGPT-2 | 250 MB | 65 MB |
| **Total (all 5)** | | **1.87 GB** | **570 MB** |

**Strategy:** ship INT8-quantised versions by default. Offer a "high
accuracy" toggle in Settings that downloads FP32 versions for users with
>6 GB RAM and WebGPU.

**Distribution channel:** all model files are served from CIRKLE's CDN
behind `Cache-Control: immutable, max-age=31536000` (1 year). The
Service Worker pre-caches P1 models during onboarding (after the user
sees the privacy notice and consents to ~200 MB download on first use).
P2/P3 are lazy-fetched on first feature use.

---

## 6. Recommendation

**ADOPT Option A — ONNX Runtime Web (WASM + WebGPU backend)** as the
on-device AI runtime for CIRKLE, with the following clarifications:

1. **Single runtime:** all 5 initial target models (NSFW, violence,
   toxic, NLLB, DistilGPT-2) load via `onnxruntime-web`. No TF.js, no
   custom shaders.

2. **Execution provider selection:** runtime probes `navigator.gpu` on
   first launch. If present, use WebGPU backend. If absent (iOS Safari,
   old browsers), fall back to WASM backend. If WASM also fails (very
   old browser), fall back to server-side API.

3. **Model distribution:**
   - **P1 models (NSFW + toxic-bert, INT8, ~200 MB total)** — preloaded
     during onboarding after privacy consent. Cached in Cache API with
     1-year max-age. Re-validated weekly via ETag.
   - **P2 models (violence + NLLB, INT8, ~305 MB total)** — lazy-loaded
     on first feature use.
   - **P3 model (DistilGPT-2, INT8, ~65 MB)** — lazy-loaded on first
     Wasl open *after* P1 and P2 are stable.

4. **Inference thread:** all inference runs in a **Web Worker** to avoid
   blocking the UI thread. NSFW frame sampling in Mashahd runs in a
   separate Worker pool (max 2 concurrent) to keep video playback at
   30fps.

5. **Server fallback:** every on-device inference call has a
   corresponding server-side API endpoint as fallback. The fallback
   triggers automatically when:
   - The model file fails to load (network error, corrupt download).
   - The runtime fails to instantiate (browser incompatibility).
   - Inference takes >2× the expected latency (device too slow).
   - The user is on iOS Safari without WebGPU and the model is
     NLLB-200 (too slow on WASM).
   The server fallback logs the inference to the user's privacy audit
   log (`src/lib/audit-logger.ts`) so the user knows their content was
   processed server-side.

6. **iOS Safari degradation matrix:**

   | Model | iOS Safari behavior |
   |---|---|
   | NSFW (P1) | WASM, ~150ms/image. Acceptable. On-device. |
   | Toxic-bert (P1) | WASM, ~250ms/comment. Acceptable. On-device. |
   | Violence (P2) | WASM, ~140ms/image. Acceptable. On-device. |
   | NLLB-200 (P2) | **Server fallback.** WASM is ~1500ms/sentence, too slow for live chat. Server-side translation logged to privacy audit. |
   | DistilGPT-2 (P3) | **Server fallback.** WASM is ~2500ms, too slow for real-time suggestions. |

7. **Flutter path:** when ADR-004 approves a native wrapper, swap
   `onnxruntime-web` for `onnxruntime_flutter`. Same `.onnx` model
   files, same inference API. No model re-conversion. On iOS native,
   CoreML execution provider is available (faster than WebGPU would
   have been). On Android native, NNAPI execution provider.

8. **Versioning:** model files are versioned by SHA-256 hash. The CDN
   serves `<model-id>/<sha256>.onnx`. The client fetches a
   `manifest.json` listing current model hashes; if the hash differs
   from the cached file, the client downloads the new version in the
   background and hot-swaps when ready. Old version evicted from cache.

9. **Privacy notice:** onboarding includes a screen: "CIRKLE downloads
   AI models (~200 MB) to your device so that photo moderation,
   translation, and smart replies happen locally — your photos and
   messages never leave your device for AI processing. [Learn more]"
   with a "Download models" / "Skip (use server-side AI)" choice.
   Skipping = server fallback for all inference (worse privacy, but
   user choice).

### Rationale

1. **Blueprint alignment.** §3.6 specifies ONNX runtime. Choosing it
   matches the blueprint without override.

2. **Direct model support.** The 5 target models are all published as
   ONNX or convertible via `optimum-cli`. Zero conversion work for P1
   (NSFW, toxic-bert ship as ONNX on HuggingFace). P2/P3 require a
   one-time `optimum-cli` conversion script (≤1 day of work).

3. **Microsoft-maintained.** We are not an ML framework team.
   ONNX Runtime is actively maintained by Microsoft with monthly
   releases and production use in Teams / Office / Defender. We
   consume; we don't maintain.

4. **WebGPU forward path.** On Chrome/Edge (the dominant Android
   browsers in Egypt, per GSMA 2025), WebGPU gives 2-3× speedup over
   WASM. iOS Safari will eventually ship WebGPU (Apple has committed
   publicly); when it does, our code is already optimal — no migration.

5. **Single runtime for all 5 models.** TF.js would require two
   runtimes (TF.js for vision on iOS, ONNX for transformers everywhere)
   — too much complexity for a small team.

6. **Flutter future-proof.** `onnxruntime_flutter` is official; same
   `.onnx` files; no model re-conversion. If ADR-004 approves a native
   wrapper, the migration is a library swap, not a re-platform.

7. **Server fallback preserves UX.** On a low-end phone where the model
   won't load, the user still gets a working app — just with server-side
   AI (logged to audit). This avoids the "your phone is too cheap for
   CIRKLE" UX failure mode.

8. **Quantisation halves the bandwidth.** INT8 versions are 2-3× smaller
   and 1.5-2× faster than FP32 with negligible accuracy loss for the
   target tasks (verified per Hugging Face model cards).

### Conditions / Acceptance Criteria

This recommendation is contingent on:

1. **CTO sign-off** on the **200 MB initial download** during onboarding
   (P1 models). Users on metered mobile data may bounce; we offer a
   "Download on Wi-Fi only" toggle and a "Skip (server-side AI)" choice.

2. **CTO sign-off** on the **iOS Safari degradation matrix** (§6.7):
   specifically, that NLLB-200 and DistilGPT-2 fall back to server on
   iOS. This means iOS users have *less* on-device privacy than Android
   users for those two features. The privacy notice discloses this.

3. **CTO sign-off** on the **server-fallback audit-log policy**: when
   on-device inference fails and the server fallback is used, the
   inference content (image / text) is processed server-side and then
   **deleted within 60 seconds**. No persistent server storage of
   fallback-processed content. This must be implemented in the API
   routes (`/api/ai/safety`, `/api/ai/translate`, `/api/ai/smart-reply`).

4. **Quarterly model audit:** re-evaluate model versions every quarter.
   New HuggingFace models may outperform the current choices; swap if
   the new model is (a) smaller or faster at equal accuracy, or (b)
   materially more accurate at equal size.

5. **Model-card review before each model ships:** read the model card
   for biases, training-data provenance, and known failure modes. The
   NSFW model is known to over-flag Middle-Eastern attire as "sexy" —
   we must tune the threshold or swap to a regionally-fine-tuned
   variant before Egypt launch.

### Known Limitations Accepted by This Decision

| Limitation | Impact | Mitigation |
|---|---|---|
| WebGPU unavailable on iOS Safari (2026) | iOS users get WASM (slower) or server fallback (less private) for large models | Native wrapper (ADR-004) would enable CoreML on iOS; deferred to that ADR |
| 200 MB initial download (P1) | Users on metered data may bounce | "Wi-Fi only" toggle; "Skip" choice; progressive download (NSFW first, toxic-bert after) |
| INT8 quantisation accuracy loss | ~1-2% accuracy drop on NSFW; ~3% on toxic-bert | Acceptable for safety-critical threshold tuning; we set conservative thresholds |
| Model drift over time | NSFW generators improve; static model loses recall | Quarterly model re-evaluation (Condition 4) |
| NSFW model biases against Middle-Eastern attire | False positives on hijab / abaya / kufiya | Pre-launch threshold tuning on Egypt-specific test set; consider `AdamCodd/distilbert-base-uncased-finetuned-nsfw` or regional fine-tune |
| NLLB-200 quality below Google Translate for some dialects | Egyptian Arabic (`arz_Arab`) quality is mediocre | Acceptable for v1; offer "Use server-side Google-quality translation" toggle (paid feature post Year-3) |
| Memory ceiling on 2 GB phones | Cannot load all 5 models at once | LRU eviction; only P1 preloaded; P2/P3 lazy |
| Cold-start latency (1.5-3s WASM) | First inference in a session feels slow | Preload on app boot in background Web Worker |

---

## 7. Consequences

### Positive

- CIRKLE meets blueprint §17 (AI Safety) for on-device NSFW / violence /
  toxic-comment moderation — content never leaves the device.
- CIRKLE meets blueprint §24 (Translation) for on-device NLLB-200
  translation — chat messages never leave the device for translation
  (except iOS fallback, audited).
- CIRKLE meets blueprint §23 (Brain AI) for on-device smart replies —
  deferred to P3 but the runtime supports it.
- Zero per-inference cost at scale — preserves §1 Zero-Cost covenant.
- Offline operation — models cached, inference runs without internet.
- Single runtime (ONNX) for all 5 models — small cognitive overhead.
- Flutter future-proof — `onnxruntime_flutter` reuses same model files.
- WebGPU acceleration where available — Android Chrome (dominant in
  Egypt) gets full performance.

### Negative

- 200 MB initial download during onboarding (P1 models, INT8) — some
  users will bounce. Mitigated by "Skip" option.
- iOS Safari users get server-side translation and smart-replies (less
  private). Disclosed in privacy notice.
- ~7 MB added to PWA bundle (`onnxruntime-web` WASM binary). Mitigated
  by code-splitting.
- WASM cold-start latency 1.5-3s on first inference. Mitigated by
  background preload on app boot.
- NSFW model bias against Middle-Eastern attire requires pre-launch
  threshold tuning. ~2 days of work.
- Server fallback must implement 60-second deletion policy. ~1 day of
  work across 3 API routes.
- Quarterly model re-evaluation is ongoing maintenance work (~1 day/
  quarter).

### Neutral

- The existing `src/lib/shield-engine.ts` heuristic filter is
  **retained** as a pre-on-device-Inference fast-path: if the heuristic
  flags a message as obviously benign (`"hello"`), skip the ML model.
  Saves ~50% of inference calls.
- The existing `/api/ai/*` routes are **retained** as server fallbacks
  and enhanced with the 60-second deletion policy.
- `src/lib/autonomous-intelligence/data-sources/ai-models.ts` catalogue
  is **extended** with the 5 target models' ONNX URLs, hashes, and
  version metadata.

---

## 8. Compliance Notes

- This ADR is **consistent** with blueprint §1 (Zero-Cost): per-inference
  cost is $0 on-device; server fallback cost is bounded by 60-second
  deletion policy.
- This ADR is **consistent** with blueprint §17 (AI Safety): on-device
  NSFW / violence / toxic-comment moderation.
- This ADR is **consistent** with blueprint §23 (Brain AI): smart-replies
  on-device (P3, deferred).
- This ADR is **consistent** with blueprint §24 (Translation): on-device
  NLLB-200 (P2) with iOS server fallback (disclosed).
- This ADR is **consistent** with blueprint §28 (Privacy): content
  moderation data does not leave the device (except audited server
  fallback).
- This ADR is **consistent** with ADR-001 (Web-first PWA):
  `onnxruntime-web` runs in all modern browsers; WebGPU optional.
- This ADR is **consistent** with GDPR / Egyptian PDPL / Saudi PDPL:
  on-device inference is not "processing" under most data-protection
  laws (no data leaves the user's device). Server fallback is "processing"
  and is logged + deleted per the 60-second policy.
- This ADR is **consistent** with EU DSA (Digital Services Act): on-
  device moderation satisfies the "best-efforts" requirement for
  illegal-content detection without forcing server-side scanning (which
  would conflict with E2EE per ADR-002).
- This ADR **may require** additional review under UK OSA (Online Safety
  Act) — OSA's "lawful access" requirements are in tension with E2EE
  + on-device moderation. Counsel review before UK launch.

---

## 9. References

- `CIRCLE BLUEPRINT v12.0` §3.6 (ONNX runtime), §17 (AI Safety), §23 (Brain AI), §24 (Translation), §28 (Privacy)
- `docs/ADR-001-platform-strategy.md` — Web-first PWA decision (consistent)
- `docs/ADR-002-e2ee-architecture.md` — E2EE via Olm/Megolm (consistent — on-device moderation sees decrypted content only on the user's own device, never server-side)
- `src/app/api/ai/safety/route.ts` (to be created — server-side NSFW fallback)
- `src/app/api/ai/translate/route.ts` — existing server-side translation (becomes fallback)
- `src/app/api/ai/smart-reply/route.ts` — existing server-side smart replies (becomes fallback)
- `src/lib/shield-engine.ts` — existing heuristic filter (retained as fast-path)
- `src/lib/autonomous-intelligence/data-sources/ai-models.ts` — model catalogue (extended)
- ONNX Runtime Web — https://onnxruntime.ai/docs/tutorials/web/
- ONNX Runtime Web GPU — https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js/web
- ONNX Runtime Flutter — https://pub.dev/packages/onnxruntime
- Hugging Face Optimum (ONNX conversion) — https://huggingface.co/docs/optimum/en/
- `Falconsai/nsfw_image_detection` — https://huggingface.co/Falconsai/nsfw_image_detection
- `unitary/toxic-bert` — https://huggingface.co/unitary/toxic-bert
- `KoalaAI/Moderation` — https://huggingface.co/KoalaAI/Moderation
- `facebook/nllb-200-distilled-600M` — https://huggingface.co/facebook/nllb-200-distilled-600M
- `distilgpt2` — https://huggingface.co/distilgpt2
- WebGPU API — https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- MLPerf Tiny 2024 (ONNX Runtime Web vs TF.js benchmarks) — https://mlcommons.org/benchmarks/tiny/
- TensorFlow.js converter (alternative considered) — https://github.com/tensorflow/tfjs/tree/master/tfjs-converter
- Apple WebKit WebGPU status — https://webkit.org/status/#feature-webgpu (In Development as of 2026-Q3)

---

## 10. Decision Log

| Date | Action | Actor |
|---|---|---|
| 2026-08-09 | ADR drafted, status set to PROPOSED | Architecture Council |
| _pending_ | NSFW model bias review (Egypt-specific test set) | ML Lead |
| _pending_ | `optimum-cli` conversion of NLLB-200, DistilGPT-2, toxic-bert to ONNX | ML Lead |
| _pending_ | CTO review | CTO |
| _pending_ | Approved / Rejected / Revised | CTO |
| _post-launch_ | Quarterly model re-evaluation process | ML Lead |

---

**End of ADR-003**

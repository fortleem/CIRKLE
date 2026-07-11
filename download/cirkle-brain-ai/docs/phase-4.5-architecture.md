# CIRKLE Brain AI — Phase 4.5: Shared Cognitive Foundation

**Version:** 1.0
**Status:** Operational
**Prerequisite for:** Phase 5 (Universal Orchestration Brain)
**Constitutional alignment:** Volume 0, Chapters 1–4

---

## 1. Purpose

Phase 4.5 introduces two new **Shared Cognitive Services** that prepare CIRKLE Brain AI for Phase 5 (UOB) without touching any existing phase:

1. **Context Manager** — owns the Shared Context Object lifecycle.
2. **Capability Registry** — describes platform capabilities independently from modules.

These are **architectural infrastructure**, NOT intelligence phases. They follow the Part 7 directive: *lightweight, extensible frameworks with clear contracts and extension points. Avoid overengineering.*

---

## 2. Enterprise Architecture (Updated)

```
Presentation Layer
        |
Cognitive Intelligence Layer
   GCIE -> PMB -> CRIE -> IRDE -> (future UOB) -> (future Execution) -> (future Learning)
        |
   +================================================+
   |  Shared Context Object                         |
   |  (flows through every intelligence phase)      |
   +================================================+
        |
   +================================================+
   |  Shared Cognitive Services   << NEW Phase 4.5  |
   |  - Context Manager                             |
   |  - Capability Registry                         |
   +================================================+
        |
   +================================================+
   |  Shared Platform Services                      |
   |  Cross-Eval - Knowledge Graph - AI Gateway     |
   |  Provider Router - Prompt Registry - Model     |
   |  Registry - Observability - Policy Engine      |
   +================================================+
        |
Platform Capability Layer  (described by the Capability Registry)
Platform Module Layer      (Pay, Travel, Feed, News, ...)
Infrastructure Layer       (Next.js, TypeScript, Prisma, SQLite, Cache, Proxy)
```

---

## 3. Deliverables Map

| Deliverable (Part 7) | Artifact |
|---|---|
| Enterprise architecture update | Section 2 above + this doc |
| Context Manager architecture | `src/lib/cognitive/context-manager.ts` |
| Context lifecycle | `ContextManager.create -> enrich -> validate -> freeze` |
| Shared Context schema | `src/lib/cognitive/shared-context.ts` |
| Context interfaces | `SharedContext`, `ContextSectionKey`, `SECTION_OWNERSHIP` |
| Context middleware | `enrich()` ownership gate + immutability |
| Context APIs | 10 lifecycle methods + `POST /api/cognitive/context` |
| Capability Registry architecture | `src/lib/cognitive/capability-registry.ts` |
| Registry interfaces | `Capability`, `CapabilityContract`, `CapabilityCategory` |
| Registration APIs | `register`, `registerAlias`, `update`, `remove` |
| Discovery APIs | `lookup`, `search`, `discoverAvailable`, `listCategories` |
| Dependency resolution | `resolveDependencies` (transitive closure + cycle detect) |
| TypeScript type definitions | all `*.ts` files (strict mode) |
| Integration with existing phases | `cognitive-pipeline.ts` calls phases read-only |
| Developer documentation | this file + inline JSDoc in every module |
| Migration guide | `phase-4.5-migration-guide.md` (no breaking changes) |

Unit/integration tests: per project convention, verification is done via lint (0 errors) + live API smoke tests (all endpoints 200, ownership + freeze guards return 422 as designed).

---

## 4. Shared Context Object

### 4.1 Sections & Ownership

| Section | Owner | Populated by |
|---|---|---|
| `metadata` | system | Context Manager |
| `request` | system | Context Manager (create) |
| `session` | system | Context Manager (create) |
| `geographic` | gcie | GCIE (Phase 1) |
| `user` | pmb | PMB (Phase 2) |
| `reasoning` | crie | CRIE (Phase 3) |
| `validation` | cross-eval | Cross-Evaluation Engine |
| `recommendation` | irde | IRDE (Phase 4) |
| `platform` | uob | reserved (Phase 5) |
| `execution` | execution | reserved (Phase 6) |
| `learning` | learning | reserved (Phase 7) |
| `extensions` | any | future-proof escape hatch |

### 4.2 Lifecycle Guarantees

- **Immutable**: `enrich()` and `freeze()` return NEW versioned snapshots. Inputs are never mutated.
- **Ownership-enforced**: only the declared owner may enrich a section. Violations throw.
- **Append-only within a request**: re-enriching by the same owner merges; cross-owner writes are rejected.
- **Provenance-first**: every operation appends a `ProvenanceEntry` (source, timestamp, version, operation, reason).
- **Correlation IDs**: every context carries a `requestId` + optional `correlationId`/`sessionId`/`parentRequestId` for distributed tracing.
- **Freezable**: `freeze()` makes a context terminal (read-only). Subsequent enrich throws.
- **Serializable**: `serialize()`/`deserialize()` for replay and cross-process transport.

### 4.3 Lifecycle APIs

```typescript
const ctx = globalContextManager.create({ request, language, surface });
const v2  = globalContextManager.enrich(ctx, "geographic", geoData, "gcie", { reason });
const ok  = globalContextManager.validate(v2);          // { valid, errors, warnings }
const v3  = globalContextManager.freeze(v2);            // terminal
const copy= globalContextManager.clone(v2);             // branch
const str = globalContextManager.serialize(v2);         // JSON
const back= globalContextManager.deserialize(str);      // round-trip
const tr  = globalContextManager.trace(v2);             // provenance trail
const dbg = globalContextManager.debug(v2);             // compact summary
```

---

## 5. Capability Registry

### 5.1 Design

The registry describes **what the platform can do**, not how. The future UOB reasons over capabilities (e.g. "Search Flights"), not modules (e.g. "Travel Module").

### 5.2 Seeded Capabilities (37 total)

| Module | Capabilities |
|---|---|
| pay (5) | transfer-money, merchant-payment, split-bill, qr-payment, currency-exchange |
| rihla (4) | search-flights, search-hotels, generate-itinerary, check-visa |
| news (3) | search, headlines, recommend |
| feed (2) | generate, trending |
| midan (3) | create-post, like-post, comment |
| mashahd (3) | upload-video, like-video, smart-reply |
| lamahd (1) | share-photo |
| commit (3) | analyze-fairness, mediate-dispute, create-agreement |
| shield (3) | file-report, submit-evidence, panic |
| profile (2) | update, view |
| wasl (4) | send-message, smart-reply, translate, summarize |
| maps (2) | search-nearby, get-weather |
| irde/brain (2) | ai.recommend, ai.cross-evaluate |

**Categories (13):** payments, travel, commerce, communication, news, entertainment, maps, identity, business, government, social, ai, utilities, security.

### 5.3 Registry APIs

```typescript
globalCapabilityRegistry.register(cap);
globalCapabilityRegistry.registerAlias("send-money", "pay.transfer-money");
globalCapabilityRegistry.update("pay.transfer-money", { status: "maintenance" });
globalCapabilityRegistry.remove("pay.transfer-money");
globalCapabilityRegistry.lookup("pay.transfer-money");    // by id or alias
globalCapabilityRegistry.search({ category: "payments", availableOnly: true });
globalCapabilityRegistry.listCategories();
globalCapabilityRegistry.resolveDependencies("pay.split-bill"); // transitive
globalCapabilityRegistry.validateContracts("pay.transfer-money");
globalCapabilityRegistry.discoverAvailable({ category: "travel" });
globalCapabilityRegistry.stats();                          // totals by category/module
```

---

## 6. Cognitive Pipeline (Optional)

`runCognitivePipeline()` is a NEW optional orchestrator that demonstrates the Shared Context flowing through phases **without modifying them**:

```
create -> GCIE(enrich) -> PMB(enrich) -> CRIE(enrich) -> Cross-Eval(enrich) -> IRDE(enrich) -> freeze
```

Each step:
1. Calls the phase's EXISTING public API (no modifications -- backward compatible).
2. Enriches the Shared Context with the phase's output (ownership-enforced).
3. Wrapped in try/catch -- a single phase failure does NOT abort the pipeline.

**Verified end-to-end**: a coffee-shop recommendation request produced a version-6 context with 6 provenance entries, 4 enriched sections, top recommendation "Brew & Co" (score 75, confidence 0.85, explanation attached).

The pipeline is a **precursor to UOB**. UOB (Phase 5) will replace this lightweight orchestrator with full platform-aware orchestration. The Shared Context contract established here is the stable foundation UOB builds on.

---

## 7. API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/cognitive/status` | Health + observability (cacheable) |
| GET | `/api/cognitive/capabilities` | Search/lookup capabilities |
| POST | `/api/cognitive/context` | Full context lifecycle + pipeline |

### Context API actions

| Action | Body | Returns |
|---|---|---|
| `create` | `{action, request, language?, surface?, featureTag?, sessionId?}` | `{context}` |
| `enrich` | `{action, context, section, contribution, owner, mode?, reason?}` | `{context, validation}` (422 on ownership/freeze violation) |
| `validate` | `{action, context}` | `{validation}` |
| `freeze` | `{action, context}` | `{context}` (terminal) |
| `trace` | `{action, context}` | `{trace}` (provenance trail) |
| `debug` | `{action, context}` | `{debug}` (compact summary) |
| `pipeline` | `{action, query, ...phaseInputs}` | full `CognitivePipelineResult` |

---

## 8. Constitutional Compliance

| Principle | How Phase 4.5 honors it |
|---|---|
| Single Ownership (Ch.2 §2.6) | Each context section has exactly one owner; registry owns only metadata |
| Intelligence Before Execution (Ch.3 §3.8) | Neither service is intelligent; neither executes |
| Separation of Responsibilities (Ch.2 §2.7) | New "Shared Cognitive Services" layer is distinct from phases + platform services |
| Loose Coupling (Ch.2 §2.13) | Phases communicate via Shared Context, not internals |
| Modularity (Ch.2 §2.12) | Existing phases unmodified; new layer is additive |
| Explainability (Ch.3 §3.11) | Provenance trail + trace + debug on every context |
| Privacy (Ch.3 §3.12) | UserContext carries `consentScope`; PMB enrichment respects consent |
| Platform Independence (Ch.2 §2.8) | Pure TypeScript, no vendor coupling |
| Evolution Without Redesign (Ch.3 §3.16) | Reserved sections + extensions escape hatch for future phases |

---

## 9. Success Criteria (Part 7) -- Verification

| Criterion | Status | Evidence |
|---|---|---|
| All existing AI phases function without modification | PASS | IRDE 200, Brain status 200, home 200 -- all unchanged |
| Shared Context Object is the single source of truth during processing | PASS | Pipeline returns one versioned context |
| Every phase enriches, never overwrites | PASS | Ownership gate returns 422 on cross-owner write |
| Capability Registry enables UOB to reason over capabilities | PASS | 37 capabilities across 13 categories, lookup/search/deps APIs |
| No responsibilities duplicated | PASS | Manager owns lifecycle only; registry owns metadata only |
| No existing APIs broken | PASS | `/api/recommend`, `/api/brain/*` all 200 |
| Modular, explainable, secure, privacy-preserving, scalable | PASS | Immutable + provenance + ownership + consent-aware |
| Prepared for Phase 5 (UOB) without redesign | PASS | Reserved `platform` section + capability registry ready |

---

## 10. File Inventory

```
src/lib/cognitive/
  +- shared-context.ts       # Schema + types + validator (11 sections)
  +- context-manager.ts      # ContextManager class + globalContextManager
  +- capability-registry.ts  # CapabilityRegistry class + globalCapabilityRegistry
  +- capability-seed.ts      # 37 real capabilities + 8 aliases
  +- cognitive-pipeline.ts   # Optional orchestrator (phases unmodified)
  +- index.ts                # Public API barrel

src/app/api/cognitive/
  +- status/route.ts         # GET health/observability
  +- capabilities/route.ts   # GET search/lookup/deps
  +- context/route.ts        # POST full lifecycle + pipeline

docs/
  +- phase-4.5-architecture.md     # this file
  +- phase-4.5-migration-guide.md
```

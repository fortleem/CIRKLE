# CIRKLE Brain AI — Phase 5 Design Specification
## Universal Orchestration Brain (UOB)
### Enterprise Architecture Blueprint — Version 1.0

**Status:** Constitutional Design Document (Design Only — No Implementation)
**Prerequisite:** Phase 4.5 Shared Cognitive Foundation (Context Manager + Capability Registry) — COMPLETE
**Governs:** All future UOB implementation
**Derivation:** CIRKLE Super App Blueprint (the source of truth)

---

> **IMPORTANT:** This is a design specification only. It contains no code, no APIs, no database schemas, no UI, and no infrastructure. It is the constitutional design document that will govern all future UOB implementation. Every responsibility herein maps to actual CIRKLE platform capabilities — no generic AI architecture.

---

## Table of Contents

1. Mission
2. Constitutional Responsibilities
3. Platform Understanding Model
4. Capability Graph
5. Workflow Planning
6. Planning Intelligence
7. Permission Model
8. Dependency Resolution
9. Context Integration
10. Capability Registry Integration
11. Output — The Execution Plan
12. Explainability
13. Scalability
14. Security
15. Privacy
16. Extensibility
17. Metrics
18. Success Criteria

---

## 1. Mission

### 1.1 Why UOB Exists

CIRKLE Brain AI, through Phases 1–4, can understand the world (GCIE), understand the user (PMB), reason about intent (CRIE), and choose the best recommendation (IRDE). What it cannot yet do is **understand the CIRKLE platform itself** — the modules, capabilities, dependencies, permissions, and workflows that make up the ecosystem the AI serves.

The Universal Orchestration Brain exists to close this gap.

UOB is the intelligence phase that **understands how the CIRKLE platform works** and **transforms user goals into executable orchestration plans**. It is the bridge between cognition (what the user wants, what the world offers, what CRIE reasoned, what IRDE ranked) and action (what the platform must do to fulfill the goal).

### 1.2 Role Within CIRKLE Brain AI

UOB occupies **Cognitive Maturity Level 5 — Platform Awareness** (per Volume 0, Chapter 3, §3.18). It is the phase that knows:

- What the platform **can** do (capabilities)
- What the platform **requires** to do something (dependencies, permissions)
- What the platform **should** do for a given goal (workflow planning)
- What the platform **cannot** do (missing capabilities, fallbacks)

UOB **thinks**. It does not **do**. It produces plans; a future Execution Engine (Phase 6) executes them. This separation is constitutionally mandated (Volume 0, Ch.3 §3.8: "CIRKLE Brain AI thinks. Execution systems act.").

### 1.3 What UOB Replaces

UOB replaces the lightweight, optional Cognitive Pipeline introduced in Phase 4.5 with a full platform-aware orchestrator. The Shared Context contract established in Phase 4.5 is the stable foundation UOB builds on — **no redesign of prior phases is required**.

### 1.4 Mission Statement

> The Universal Orchestration Brain transforms user goals into explainable, platform-aware, permission-respecting, dependency-resolved orchestration plans — without executing them — enabling CIRKLE Brain AI to coordinate the entire CIRKLE ecosystem as one intelligent platform.

---

## 2. Constitutional Responsibilities

### 2.1 What UOB OWNS

UOB owns exactly **two responsibilities**, neither of which is owned by any other phase or service:

| Responsibility | Description |
|---|---|
| **Platform Understanding** | Maintaining a real-time cognitive model of what the CIRKLE platform can do — modules, capabilities, dependencies, permissions, availability, relationships, boundaries. |
| **Workflow Planning** | Transforming a user goal (expressed as intent + context + recommendation) into an ordered, explainable Execution Plan composed of capability invocations. |

UOB is the **only** phase permitted to:
- Author the `platform` section of the Shared Context Object (reserved for UOB in Phase 4.5).
- Produce an Execution Plan.
- Reason about platform capability composition (which capabilities combine to fulfill a goal).
- Resolve cross-module dependencies for a given goal.
- Select fallback paths when capabilities are unavailable.

### 2.2 What UOB NEVER Owns

To preserve Single Ownership (Volume 0, Ch.2 §2.6), UOB explicitly does NOT own the following — each is owned by another component:

| Not UOB's Responsibility | Owner | Boundary |
|---|---|---|
| World understanding (places, weather, events, traffic) | **GCIE** | UOB consumes GCIE's geographic context; it never queries maps or weather providers directly. |
| User memory, preferences, identity history | **PMB** | UOB reads user context from the Shared Context; it never stores personal memory. |
| Intent understanding, reasoning, constraints, clarifications | **CRIE** | UOB receives CRIE's intent + reasoning graph; it never re-interprets the user's request. |
| Recommendation ranking, candidate scoring | **IRDE** | UOB receives IRDE's ranked candidates; it never re-scores recommendations. |
| Multi-provider consensus, knowledge validation | **Cross-Evaluation Engine** | UOB consumes validation context; it never calls AI providers for validation. |
| Shared Context lifecycle (create, enrich, freeze, version, provenance) | **Context Manager** | UOB calls the Context Manager to read/enrich; it never mutates context directly. |
| Capability metadata (registration, discovery, schema) | **Capability Registry** | UOB queries the registry; it never stores capability definitions. |
| Executing capabilities (calling pay APIs, making bookings, sending messages) | **Future Execution Engine (Phase 6)** | UOB produces plans; it never invokes platform modules. |
| Improving intelligence over time (weight updates, federated learning) | **Future Learning Engine (Phase 7)** | UOB emits plan outcomes for learning; it never trains models. |
| Business logic within a capability | **The owning platform module** | UOB knows *that* `pay.transfer-money` exists; it does not know *how* a payment is processed. |

### 2.3 Non-Overlap Guarantees

UOB's design enforces these non-overlap invariants:

1. **No reasoning duplication**: UOB does not re-reason intent. If CRIE says the intent is "plan a trip", UOB plans the trip; it does not re-classify.
2. **No ranking duplication**: UOB does not re-rank IRDE's candidates. If IRDE ranked 5 hotels, UOB plans the booking flow; it does not pick a different hotel.
3. **No memory writes**: UOB never persists personal data. It reads PMB context; it never writes to PMB.
4. **No geo queries**: UOB never calls OSM/Google/weather providers. It reads GCIE's geographic context.
5. **No execution**: UOB never calls `pay.transfer-money`. It produces a plan step that *describes* calling it; the Execution Engine performs the call.
6. **No capability redefinition**: UOB never redefines what a capability is. It queries the Capability Registry.

These invariants are constitutional. Any future UOB evolution that violates them requires formal architectural review (Volume 0, Ch.2 §2.20).

---

## 3. Platform Understanding Model

### 3.1 What UOB Understands About the Platform

UOB maintains a cognitive model of the CIRKLE platform derived from the Capability Registry (Phase 4.5). The model covers:

| Domain | What UOB Understands | Source |
|---|---|---|
| **Platform Modules** | The 11 current modules (pay, rihla, news, feed, midan, mashahd, lamahd, commit, shield, profile, wasl) + maps + brain | Capability Registry `ownerModule` field |
| **Platform Capabilities** | 37 current capabilities (e.g., `pay.transfer-money`, `travel.search-flights`) | Capability Registry |
| **Capability Relationships** | Dependencies (`pay.split-bill` depends on `pay.transfer-money`), alternatives, fallbacks | Capability Registry `dependencies` + UOB's Capability Graph (§4) |
| **Dependencies** | Transitive capability dependencies | Capability Registry `resolveDependencies` |
| **Permissions** | 14 permission tokens (e.g., `pay:send`, `midan:write`, `shield:panic`) | Capability Registry `permissions` field |
| **Feature Availability** | Whether a capability is `available`, `beta`, `deprecated`, or `internal` | Capability Registry `availability` + `status` |
| **Module Boundaries** | Which module owns which capability; cross-module calls require explicit dependency declaration | Capability Registry `ownerModule` |
| **Mini Apps** | Future mini-apps that expose capabilities through the registry | Capability Registry (future registrations) |
| **Workspaces** | The Travel Workspace and Business Workspace as capability groupings | UOB Workspace Catalog (derived from registry categories) |
| **Government Services** | Visa checks (`travel.check-visa`), citizen reporting (`shield.file-report`, `shield.submit-evidence`, `shield.panic`) | Capability Registry `category: government` + `category: security` |
| **Third-party Integrations** | Future third-party capabilities registered with `availability: "internal"` or a future `source: "third-party"` tag | Capability Registry (extensible) |
| **Future Plugins** | Plugin capabilities registered dynamically | Capability Registry `register()` API |

### 3.2 Module Understanding (the 11 modules)

UOB understands each module not as a black box, but as a **set of exposed capabilities**. The module's internal implementation is invisible to UOB (Loose Coupling, Ch.2 §2.13).

| Module | Capabilities UOB Sees | Workspace |
|---|---|---|
| pay | transfer-money, merchant-payment, split-bill, qr-payment, currency-exchange | Payments / Business |
| rihla | search-flights, search-hotels, generate-itinerary, check-visa | Travel Workspace |
| news | search, headlines, recommend | Home / News |
| feed | generate, trending | Home |
| midan | create-post, like-post, comment | Social / Midan |
| mashahd | upload-video, like-video, smart-reply | Entertainment |
| lamahd | share-photo | Social / Lamahd |
| commit | analyze-fairness, mediate-dispute, create-agreement | Business / Commit |
| shield | file-report, submit-evidence, panic | Safety / Shield |
| profile | update, view | Identity |
| wasl | send-message, smart-reply, translate, summarize | Communication |
| maps | search-nearby, get-weather | Maps / Utilities |
| irde/brain | ai.recommend, ai.cross-evaluate | AI (cross-cutting) |

### 3.3 Workspace Abstraction

UOB groups capabilities into **workspaces** — cognitive groupings that reflect how users think about tasks, not how modules are organized in code:

- **Travel Workspace**: `travel.*` + `maps.search-nearby` + `maps.get-weather` + `pay.currency-exchange` + `news.search` (destination research)
- **Business Workspace**: `commit.*` + `profile.*` + `pay.merchant-payment` + `pay.split-bill`
- **Safety Workspace**: `shield.*` + `wasl.send-message` (alert contacts)
- **Social Workspace**: `midan.*` + `lamahd.share-photo` + `mashahd.upload-video`
- **Communications Workspace**: `wasl.*` + `midan.comment` + `mashahd.smart-reply`
- **Payments Workspace**: `pay.*` + `commit.create-agreement` (payment commitments)
- **Identity Workspace**: `profile.*` + `shield.file-report` (verified reporting)
- **Information Workspace**: `news.*` + `feed.*` + `ai.cross-evaluate`

Workspaces are **derived views**, not a new data structure. UOB computes them from registry categories + module ownership. This keeps the model lightweight (Phase 4.5 Part 7 directive).

### 3.4 Government Services Understanding

CIRKLE serves users across countries (currently 246 in the Knowledge Graph). Government services are capabilities, not special cases:

- **Visa services**: `travel.check-visa` (passport + destination → requirements)
- **Civic reporting**: `shield.file-report`, `shield.submit-evidence`, `shield.panic`
- **Future government capabilities**: registered via the Capability Registry with `category: "government"`, country-specific availability tags, and permission tokens like `gov:eg:submit`

UOB does NOT hardcode country logic. It reads the `availability` + `permissions` + `tags` fields to determine whether a government capability is available for the user's country (from GCIE geographic context).

### 3.5 Module Boundary Enforcement

UOB respects module boundaries strictly. A workflow that needs both `pay.transfer-money` and `wasl.send-message` (e.g., "send money then notify the recipient") is planned as **two capability invocations on two modules** — UOB never merges them into a single cross-module call. The Execution Engine (Phase 6) will execute them in sequence with the Shared Context carrying state forward.

---

## 4. Capability Graph

### 4.1 Purpose

UOB maintains an in-memory **Capability Graph** — a cognitive model derived from the Capability Registry that captures relationships between capabilities beyond simple dependencies. This graph is what allows UOB to find alternative paths, detect missing prerequisites, and compose workflows.

### 4.2 Graph Structure

The Capability Graph is a directed, typed graph:

```
Node  := Capability (id, name, category, ownerModule, availability, status)
Edge  := Typed relationship between two capabilities
```

### 4.3 Edge Types

| Edge Type | Meaning | Example | Source |
|---|---|---|---|
| **`requires`** | Target must succeed before source can be invoked | `pay.split-bill` → `pay.transfer-money` | Capability Registry `dependencies` |
| **`prerequisite`** | Target must be available (not necessarily invoked) before source | `shield.submit-evidence` → `shield.file-report` | UOB inferred from workflow semantics |
| **`alternative`** | Target can substitute for source if source unavailable | `pay.qr-payment` ⇄ `pay.merchant-payment` | UOB Alternative Map (same category + overlapping permissions) |
| **`fallback`** | Target is a degraded but functional substitute | `ai.cross-evaluate` → `news.search` (when AI providers down) | UOB Fallback Map |
| **`composes`** | Source + target are commonly used together in a workflow | `travel.search-flights` → `travel.search-hotels` | UOB Workflow Patterns (learned, Phase 7) |
| **`enables`** | Target's output unlocks source's use | `travel.check-visa` enables `travel.search-flights` (visa-free → proceed) | UOB Semantic Rules |

### 4.4 Nodes

Each node in the graph is a capability from the registry, augmented at load time with:

- **Transitive dependency set** (computed via `resolveDependencies`)
- **Permission set** (union of own + transitive dependency permissions)
- **Availability state** (live — updated by registry events or health checks)
- **Workspace membership** (derived from category + module)
- **Alternative set** (capabilities with same category + overlapping input contract)
- **Fallback set** (capabilities that provide degraded service)

### 4.5 Optional Paths & Fallback Paths

For any goal, UOB may find multiple viable paths through the graph:

**Optional paths** — capabilities that enhance but are not required:
- Goal: "Plan a trip to Istanbul"
- Required path: `travel.check-visa` → `travel.search-flights` → `travel.search-hotels` → `travel.generate-itinerary`
- Optional enhancement: `pay.currency-exchange` (set an FX alert), `news.search` (destination research), `maps.get-weather` (pack appropriately)

**Fallback paths** — when a required capability is unavailable:
- If `travel.search-flights` is in maintenance → fallback to `news.search` (find flight deals articles) + manual booking guidance via `wasl.send-message` (notify the user)
- If `ai.cross-evaluate` providers are down → fallback to `news.search` + `knowledge-graph` direct lookup
- If `pay.transfer-money` is rate-limited → fallback to `pay.qr-payment` (different code path) or defer the step

### 4.6 Graph Construction

The Capability Graph is **constructed at UOB initialization** from the Capability Registry and **refreshed** when:
- A capability is registered/updated/removed (registry event)
- A capability's `status` changes to `disabled` or `maintenance`
- A health check (future) reports a capability as unavailable

The graph is **read-only during planning**. UOB never mutates it; it only traverses. Mutation is the registry's responsibility.

### 4.7 Graph Size & Complexity

At current scale (37 capabilities), the graph is trivial. At target scale (1,000+ capabilities per §13), the graph will be partitioned by category + workspace to keep traversal sub-linear. UOB will not attempt global graph algorithms; it will use workspace-scoped subgraph traversal.

---

## 5. Workflow Planning

### 5.1 How UOB Converts Goals Into Plans

A **goal** arrives at UOB as a Shared Context with:
- `request.originalRequest` (the user's words)
- `reasoning.intent` + `reasoning.intentType` (from CRIE)
- `reasoning.constraints` (from CRIE)
- `user.goals` + `user.preferences` (from PMB)
- `geographic.location` + `geographic.weather` (from GCIE)
- `recommendation.rankedCandidates` (from IRDE, if applicable)

UOB produces an **Execution Plan** (defined in §11). The transformation follows these stages (detailed in §6):

1. **Goal Decomposition** — break the goal into sub-goals.
2. **Capability Matching** — find capabilities that address each sub-goal.
3. **Dependency Resolution** — resolve required + transitive dependencies.
4. **Permission Verification** — check the user has permissions + consent for each capability.
5. **Path Selection** — choose the best path (required vs. optional, primary vs. fallback).
6. **Ordering** — sequence steps respecting `requires` + `prerequisite` edges.
7. **Parallelization** — identify steps that can run concurrently.
8. **Plan Finalization** — emit the plan with explanations.

### 5.2 Concrete Workflow Examples (Mapped to Real CIRKLE Capabilities)

#### 5.2.1 Travel — "Plan my trip to Istanbul"

| Step | Capability | Module | Depends On | Permission |
|---|---|---|---|---|
| 1 | `travel.check-visa` (passport=EG, destination=TR) | rihla | — | — |
| 2 | `travel.search-flights` (from=CAI, to=IST, date=…) | rihla | step 1 (visa-free confirmed) | — |
| 3 | `travel.search-hotels` (destination=IST, checkIn=…, checkOut=…) | rihla | — | — |
| 4 | `maps.get-weather` (lat=IST, lng=IST) | maps | — | — |
| 5 | `travel.generate-itinerary` (destination=IST, days=3) | rihla | steps 3, 4 | `ai:generate` |
| 6 (optional) | `pay.currency-exchange` (from=EGP, to=TRY) | pay | — | — |
| 7 (optional) | `news.search` (query="Istanbul travel") | news | — | — |

**Parallelism**: steps 2, 3, 4, 6, 7 can run in parallel after step 1.
**Fallback**: if `travel.search-flights` is down → defer step 2, continue with hotel + itinerary, notify user to book flights manually.

#### 5.2.2 Restaurant — "Find a good restaurant nearby for tonight"

| Step | Capability | Module | Depends On | Permission |
|---|---|---|---|---|
| 1 | `maps.search-nearby` (lat, lng, type=restaurant) | maps | — | — |
| 2 | `maps.get-weather` (lat, lng) | maps | — | — |
| 3 | `ai.recommend` (candidates=step 1 results, context=weather+preferences) | irde | steps 1, 2 | `ai:recommend` |

**Gap flagged**: CIRKLE currently has no `restaurant.reserve` capability. UOB will detect this gap and either (a) emit a plan step marked `requires_future_capability: "restaurant.reserve"` or (b) fall back to `wasl.send-message` (draft a message to the restaurant) / `midan.create-post` (ask friends for recommendations). This is **honest orchestration** — UOB does not pretend the platform can do what it cannot.

#### 5.2.3 Shopping — "Help me buy a gift under $50"

**Gap flagged**: CIRKLE currently has no commerce/catalog capabilities. UOB will detect this and produce a **degraded plan**:
- `news.search` (query="gift ideas under $50") — research
- `ai.cross-evaluate` (query="best gifts under $50") — AI suggestion
- `pay.transfer-money` or `pay.qr-payment` — payment once the user picks a gift externally

This is the correct UOB behavior: **do not invent capabilities; produce the best plan with what exists and clearly mark gaps**.

#### 5.2.4 Business Formation — "Start a partnership agreement with Ahmed"

| Step | Capability | Module | Depends On | Permission |
|---|---|---|---|---|
| 1 | `commit.create-agreement` (terms=…, parties=[user, Ahmed]) | commit | — | `commit:write` |
| 2 | `commit.analyze-fairness` (agreementText=…) | commit | step 1 | `ai:analyze` |
| 3 | `wasl.send-message` (to=Ahmed, body="Review the agreement") | wasl | step 1 | `wasl:write` |
| 4 (if dispute) | `commit.mediate-dispute` (disputeId=…) | commit | step 1 | `ai:mediate` |

#### 5.2.5 Payments — "Split the dinner bill with 3 friends"

| Step | Capability | Module | Depends On | Permission |
|---|---|---|---|---|
| 1 | `pay.split-bill` (total=…, participants=[…]) | pay | — | `pay:send` |
| 2 | `pay.transfer-money` (to=friend1, amount=share) | pay | step 1 | `pay:send` |
| 3 | `pay.transfer-money` (to=friend2, amount=share) | pay | step 1 | `pay:send` |
| 4 | `pay.transfer-money` (to=friend3, amount=share) | pay | step 1 | `pay:send` |
| 5 (optional) | `wasl.send-message` (to=friend, body="Sent you $X") | wasl | step 2-4 | `wasl:write` |

**Parallelism**: steps 2, 3, 4 can run in parallel.
**Fallback**: if a friend's payment fails → `commit.create-agreement` (formalize the debt) + `wasl.send-message` (notify).

#### 5.2.6 Government Services — "Check if I need a visa for Japan and file a report about a scam"

Two independent goals — UOB plans them as **parallel sub-plans**:

**Sub-plan A (visa):**
| Step | Capability | Module |
|---|---|---|
| A1 | `travel.check-visa` (passport=EG, destination=JP) | rihla |

**Sub-plan B (report):**
| Step | Capability | Module | Permission |
|---|---|---|---|
| B1 | `shield.file-report` (category=fraud, title=…, description=…) | shield | `shield:write` |
| B2 | `shield.submit-evidence` (caseNumber=B1, evidenceHash=…) | shield | `shield:write` |

#### 5.2.7 Entertainment — "Upload my video and get AI reply suggestions for comments"

| Step | Capability | Module | Permission |
|---|---|---|---|
| 1 | `mashahd.upload-video` (title=…, mediaId=…) | mashahd | `mashahd:write` |
| 2 | `mashahd.smart-reply` (comment=…) | mashahd | `ai:generate` |

#### 5.2.8 Content Publishing — "Share my trip photos and post about it"

| Step | Capability | Module | Permission |
|---|---|---|---|
| 1 | `lamahd.share-photo` (mediaId=…, caption=…) | lamahd | `lamahd:write` |
| 2 | `midan.create-post` (body="Amazing trip!", module=midan) | midan | `midan:write` |
| 3 (optional) | `mashahd.upload-video` (if user has video) | mashahd | `mashahd:write` |

**Parallelism**: steps 1, 2 can run in parallel.

#### 5.2.9 Professional Networking — "Look up Ahmed's profile and update mine"

| Step | Capability | Module | Permission |
|---|---|---|---|
| 1 | `profile.view` (username=Ahmed) | profile | — |
| 2 | `profile.update` (displayName=…, bio=…) | profile | `profile:write` |

#### 5.2.10 Learning — "Teach me about Egyptian history"

**Gap flagged**: CIRKLE currently has no dedicated learning capabilities. UOB produces a degraded plan:
- `news.search` (query="Egyptian history") — articles
- `ai.cross-evaluate` (query="Explain ancient Egyptian history") — AI explanation
- `wasl.summarize` (text=…) — summarize long articles

This gap is recorded for future Learning Architecture (Phase 7) consideration.

---

## 6. Planning Intelligence

### 6.1 Planning Stages

UOB's planning pipeline has 8 stages, each producing an intermediate artifact:

| Stage | Input | Output | Intelligence |
|---|---|---|---|
| 1. Goal Decomposition | Intent + constraints from CRIE | List of sub-goals | Heuristic: intent type → sub-goal template |
| 2. Capability Matching | Sub-goals + Capability Graph | Candidate capabilities per sub-goal | Graph traversal (workspace-scoped) |
| 3. Dependency Resolution | Candidate capabilities | Resolved dependency sets | `resolveDependencies` transitive closure |
| 4. Permission Verification | Resolved sets + user permissions + consent | Verified or rejected capabilities | Permission + consent gate |
| 5. Path Selection | Verified capabilities + alternatives + fallbacks | Chosen primary path + fallback path | Optimization (§6.4) |
| 6. Ordering | Chosen path | Sequenced steps | Topological sort over `requires` edges |
| 7. Parallelization | Sequenced steps | Parallel groups | Independence analysis |
| 8. Plan Finalization | Parallel groups | Execution Plan | Explainability annotation |

### 6.2 Planning Heuristics

UOB uses heuristics — NOT machine learning (learning is Phase 7's responsibility). Heuristics are deterministic, auditable, and explainable:

| Heuristic | Rule |
|---|---|
| **Visa before flights** | If a goal involves international travel, `travel.check-visa` is ordered before `travel.search-flights` |
| **Weather before itinerary** | `maps.get-weather` precedes `travel.generate-itinerary` (weather affects packing + outdoor plans) |
| **Fairness before signing** | `commit.analyze-fairness` precedes finalizing `commit.create-agreement` |
| **Evidence after report** | `shield.submit-evidence` follows `shield.file-report` (needs the case number) |
| **Notify after action** | `wasl.send-message` follows the action it notifies about |
| **Cheap before expensive** | Prefer capabilities with no `permissions` required over those with permissions (lower friction) |
| **Available over beta** | Prefer `availability: "available"` over `"beta"` |

### 6.3 Constraint Handling

CRIE provides constraints in the `reasoning.constraints` field. UOB maps each constraint to a planning rule:

| Constraint (from CRIE) | UOB Planning Rule |
|---|---|
| `budget_conscious` | Prefer `pay.currency-exchange` over paid travel agents; flag expensive hotels |
| `nearby_only` | Scope `maps.search-nearby` to small radius |
| `walking_distance` | Filter capabilities by walkability |
| `time_limited` | Minimize plan step count; prefer parallel paths |
| `dietary_restriction` | Flag restaurant capabilities (future) for filtering |
| `lunch_time` / `dinner_time` | Bias restaurant plans toward dining capabilities |
| `weekend_behavior` | Allow leisure capabilities (entertainment, travel) to surface |

### 6.4 Optimization

UOB optimizes plans across three axes (lexicographic priority):

1. **Completeness** — a plan that fulfills all sub-goals beats a partial plan. Always.
2. **Permission minimalism** — a plan requiring fewer/less-sensitive permissions beats one requiring more. (Privacy-preserving by default.)
3. **Step efficiency** — among complete, permission-minimal plans, prefer fewer steps + more parallelism.

UOB does NOT optimize for speed (latency is the Execution Engine's concern) or cost (no paid capability tiers exist today).

### 6.5 Parallel Planning

Two forms of parallelism:

- **Intra-plan parallelism**: steps within one plan that have no `requires` dependency between them run in parallel. Example: flight search + hotel search + weather lookup (§5.2.1).
- **Inter-plan parallelism**: when a user goal decomposes into independent sub-goals (§5.2.6: visa + report), UOB produces independent sub-plans that the Execution Engine may run concurrently.

### 6.6 Sequential Planning

Steps connected by `requires` or `prerequisite` edges are sequential. UOB performs a topological sort over the dependency DAG to produce the canonical order. Cycles in the DAG are constitutionally impossible (the Capability Registry's `resolveDependencies` has cycle detection from Phase 4.5).

### 6.7 Multi-Goal Planning

When a user request contains multiple goals (e.g., "check my visa for Japan and file a fraud report"), UOB:

1. Detects multiple intents (from CRIE's `secondary` intent field, or explicit "and" conjunctions).
2. Decomposes into independent sub-goals.
3. Plans each sub-goal separately.
4. Merges into a single Execution Plan with parallel sub-plan branches.
5. Detects cross-sub-plan dependencies (rare) and serializes them.

### 6.8 Fallback Planning

When a capability is unavailable (`status: "disabled"`, `availability: "deprecated"`, or runtime health check failure), UOB:

1. Checks the Capability Graph for `alternative` edges (same category, overlapping contract).
2. If no alternative, checks for `fallback` edges (degraded service).
3. If no fallback, marks the sub-goal as `unfulfillable` and continues planning the rest.
4. Emits a clear explanation: "Step X cannot be completed because capability Y is unavailable; alternative Z will be used" or "Step X cannot be completed; no alternative exists."

UOB never silently drops a step. Honesty over completeness.

---

## 7. Permission Model

### 7.1 Permission Layers

UOB's permission model has 5 layers, checked in order (fail-fast):

| Layer | Source | Example |
|---|---|---|
| **Capability Permissions** | Capability Registry `permissions` field | `pay:send`, `midan:write`, `shield:panic` |
| **Module Permissions** | Derived from module-level access controls (future) | `pay:enabled`, `shield:unlocked` |
| **User Permissions** | PMB `userPermissions` field | User's role (citizen, merchant, official) |
| **Consent** | Consent Management Service (`consent.ts`) | `ai_personalization`, `federated_learning`, `shield_anon` |
| **Enterprise/Government Permissions** | Country + role-based (future) | `gov:eg:submit`, `enterprise:admin` |

### 7.2 Permission Resolution

For each capability in a plan, UOB computes the **effective permission set** = (capability permissions) ∪ (transitive dependency permissions). The user must hold ALL permissions in this set (AND logic). Consent must be granted for any consent-gated capability.

### 7.3 Permission Tokens in Use (Current Platform)

The 14 permission tokens currently defined in the Capability Registry:

| Token | Capabilities Requiring It |
|---|---|
| `pay:send` | transfer-money, merchant-payment, split-bill, qr-payment |
| `midan:write` | create-post, comment |
| `mashahd:write` | upload-video |
| `lamahd:write` | share-photo |
| `commit:write` | create-agreement |
| `shield:write` | file-report, submit-evidence |
| `shield:panic` | panic (emergency — highest sensitivity) |
| `profile:write` | update |
| `wasl:write` | send-message |
| `ai:generate` | generate-itinerary, mashahd.smart-reply, wasl.smart-reply, wasl.translate, wasl.summarize |
| `ai:analyze` | analyze-fairness |
| `ai:mediate` | mediate-dispute |
| `ai:recommend` | ai.recommend |
| `ai:personalization` | news.recommend |

### 7.4 Security Boundaries

- **`shield:panic`** is the highest-sensitivity token. UOB will never include `shield.panic` in a plan without an explicit user confirmation step (the plan emits a `requires_confirmation: true` flag on that step).
- **`pay:send`** capabilities always require user confirmation in the plan (money movement is never auto-executed).
- **`commit:write`** (agreements) requires confirmation.
- Read-only capabilities (`profile.view`, `news.search`, `maps.*`) never require confirmation.

### 7.5 Consent Integration

UOB reads consent state from the Consent Management Service (`consent.ts`). If a capability requires consent that is not granted:

- UOB does NOT drop the step silently.
- UOB marks the step `consent_required: "<purpose>"` and emits a plan that includes a consent-prompt step before the gated capability.
- The Execution Engine (Phase 6) will surface the consent prompt to the user; if denied, the step is skipped with an explanation.

This honors Volume 0, Ch.3 §3.12: "Privacy governs both storage AND reasoning." UOB plans only with information the user has authorized.

### 7.6 Enterprise & Government Permissions

Future enterprise and government capabilities will carry permission tokens like `enterprise:admin`, `gov:eg:submit`. UOB resolves these against the user's `userPermissions` (from PMB). Country-specific government capabilities are filtered by the user's geographic context (from GCIE) — a `gov:sa:submit` capability is only available if `geographic.location.country === "SA"`.

---

## 8. Dependency Resolution

### 8.1 Dependency Types

| Type | Resolution |
|---|---|
| **Required** | The capability's `dependencies` array (from the registry). Must be present + available. |
| **Transitive** | Resolved via `resolveDependencies` (Phase 4.5). Computed once, cached. |
| **Optional** | Capabilities that enhance but are not required. Surfaced as optional plan steps. |
| **Missing** | A required dependency that is not registered or unavailable. Triggers fallback. |
| **Unavailable** | A registered capability currently in `disabled` or `maintenance` status. Triggers fallback. |
| **Alternative** | A capability with an `alternative` edge to the unavailable one. |
| **Fallback** | A capability with a `fallback` edge providing degraded service. |

### 8.2 Resolution Algorithm

```
resolveDependenciesFor(capabilityId):
  1. Look up capability in registry
  2. If not found → mark MISSING, return
  3. If status !== "active" or availability !== "available" → mark UNAVAILABLE, return
  4. For each dep in capability.dependencies:
       resolveDependenciesFor(dep)
  5. If any required dep is MISSING or UNAVAILABLE:
       - Check for alternative edge → if found, resolve alternative instead
       - Else check for fallback edge → if found, mark step as DEGRADED
       - Else mark this capability as UNFULFILLABLE
  6. Return resolved dependency set
```

### 8.3 Alternative Routes

When a primary path is blocked, UOB searches the Capability Graph for alternative routes:

- **Same-category alternatives**: `pay.qr-payment` is an alternative to `pay.merchant-payment` (both are payments, both require `pay:send`, overlapping input contracts).
- **Cross-category fallbacks**: `news.search` is a fallback for `ai.cross-evaluate` when AI providers are down (different category, degraded service).

UOB records which alternative was chosen and why, in the plan's explanation (§12).

### 8.4 Missing Capabilities (Honest Orchestration)

When a sub-goal has no matching capability (e.g., restaurant reservation, shopping catalog, learning), UOB:

1. Marks the sub-goal as `unfulfillable`.
2. Records the missing capability in the plan as `missing_capability: "<suggested_id>"` (e.g., `restaurant.reserve`).
3. Produces the best degraded plan with existing capabilities.
4. Emits a clear explanation: "CIRKLE cannot currently reserve restaurants. I've found nearby restaurants and can draft a message to call them."

This is constitutionally required honesty. UOB never pretends the platform can do what it cannot.

---

## 9. Context Integration

### 9.1 What UOB Reads from the Shared Context

UOB is a **consumer** of context produced by earlier phases. It reads:

| Section | Fields UOB Reads | How UOB Uses Them |
|---|---|---|
| `request` | `originalRequest`, `featureTag`, `surface` | Correlation, feature attribution |
| `session` | `sessionId`, `device`, `locale`, `timezone` | Plan localization (e.g., date/time formatting) |
| `geographic` | `location.country`, `location.city`, `weather` | Filter government capabilities by country; weather affects outdoor plans |
| `user` | `identity.username`, `preferences`, `goals`, `userPermissions`, `consentScope` | Permission verification, personalization of optional steps, consent gating |
| `reasoning` | `intent`, `intentType`, `urgency`, `constraints`, `clarifications`, `confidence` | Goal decomposition, constraint mapping (§6.3), urgency-based step minimization |
| `validation` | `validationConfidence`, `discrepancies` | If validation confidence is low, UOB may add a confirmation step |
| `recommendation` | `rankedCandidates`, `recommendationRationale` | If IRDE ranked candidates, UOB plans actions on the top candidate |

### 9.2 What UOB Contributes to the Shared Context

UOB is the **sole author** of the `platform` section (reserved for UOB in Phase 4.5). It enriches:

```
platform: {
  requiredModules: ["rihla", "pay", "maps"],          // modules the plan touches
  requiredCapabilities: ["travel.check-visa", ...],     // capabilities the plan invokes
  dependencies: { ... },                                // resolved dependency graph
  permissions: ["pay:send", "ai:generate"],             // effective permission set
  executionPlan: { ... },                               // the plan (§11)
  alternatives: [ ... ],                                // fallback paths considered
  missingCapabilities: [ ... ],                         // gaps detected
  workspace: "travel",                                  // derived workspace
}
```

UOB calls `globalContextManager.enrich(ctx, "platform", platformData, "uob", { reason })`. The Context Manager enforces that only `"uob"` may write this section (Phase 4.5 ownership guard).

### 9.3 Context Flow

```
[GCIE enrich] → [PMB enrich] → [CRIE enrich] → [Cross-Eval enrich] → [IRDE enrich] → [UOB enrich] → freeze
                                                                                  ↑
                                                                          reads all prior sections
                                                                          writes "platform" section only
```

UOB is the **terminal intelligence phase** in the current pipeline. After UOB enriches the `platform` section, the Context Manager freezes the context. The frozen context (with the Execution Plan) is the input to the future Execution Engine (Phase 6).

### 9.4 Context Provenance

Because UOB writes through the Context Manager, every plan enrichment gets a provenance entry: `{ source: "uob", operation: "enrich", reason: "Planned trip to Istanbul" }`. This makes every plan auditable and replayable (Volume 0, Ch.3 §3.11).

---

## 10. Capability Registry Integration

### 10.1 Discovery Strategy

UOB does NOT duplicate the Capability Registry. It queries it via the established Phase 4.5 APIs:

| UOB Need | Registry API |
|---|---|
| Find capabilities for a goal | `search({ text, category, availableOnly: true })` |
| Look up a specific capability | `lookup(id)` (supports aliases) |
| Resolve dependencies | `resolveDependencies(id)` |
| Validate a contract | `validateContracts(id)` |
| List categories | `listCategories()` |
| Discover available capabilities | `discoverAvailable({ category })` |
| Registry health | `stats()` |

### 10.2 Lookup Strategy

UOB uses a **three-tier lookup**:

1. **Alias lookup** — natural-language names ("send-money" → `pay.transfer-money`).
2. **Exact id lookup** — canonical ids.
3. **Search** — text/category search for discovery.

### 10.3 Caching

UOB maintains a **read-through cache** of the Capability Graph (§4) with invalidation on registry events:

- **Cache hit**: graph traversal uses cached nodes/edges.
- **Cache miss**: query the registry, build the node, cache it.
- **Invalidation**: on `register`, `update`, `remove` events (future — the registry will emit events), invalidate affected nodes + their transitive dependents.

The cache is **per-UOB-instance** (in-memory). At current scale (37 capabilities), the cache is effectively the whole graph. At target scale (1,000+), the cache is workspace-scoped.

### 10.4 Versioning

Capabilities carry `version` (semver). UOB's plans reference capabilities by `id` + `version`. If a capability's contract changes incompatibly (major version bump), UOB detects the mismatch and re-plans. This is forward-compatible with the future plugin ecosystem (§16).

### 10.5 No Registry Mutation

UOB NEVER calls `register`, `update`, or `remove` on the Capability Registry. The registry is a read-only input to UOB. This preserves Single Ownership (the registry owns its metadata; UOB owns plans).

---

## 11. Output — The Execution Plan

### 11.1 What the Plan Contains

The Execution Plan is UOB's sole output. It is a **declarative description** of what should happen — never an imperative execution. The plan contains:

```
ExecutionPlan {
  planId: string                          // unique id for this plan
  goal: string                            // the user's goal (from CRIE intent)
  workspace: string                       // derived workspace (travel, pay, ...)
  correlationId: string                   // links to Shared Context requestId

  steps: PlanStep[]                       // ordered + grouped steps

  requiredModules: string[]               // modules the plan touches
  requiredCapabilities: string[]          // capabilities the plan invokes
  effectivePermissions: string[]          // union of all step permissions
  consentRequired: string[]               // consent purposes needed

  alternativesConsidered: Alternative[]   // fallback paths evaluated
  missingCapabilities: MissingCap[]       // gaps detected (honest orchestration)
  unfulfillableSubGoals: string[]         // sub-goals with no capability

  explanation: string                     // human-readable summary
  confidence: number                      // 0-1 UOB's confidence in the plan
  createdAt: string                       // ISO-8601
  frozenContextRef: string                // reference to the frozen Shared Context
}

PlanStep {
  stepId: string
  capabilityId: string                    // e.g. "travel.search-flights"
  capabilityVersion: string               // semver
  module: string                          // e.g. "rihla"
  inputs: Record<string, unknown>         // input values (from context)
  dependsOn: string[]                     // stepIds this step depends on
  parallelGroup?: number                  // steps in the same group run in parallel
  permission: string                      // permission token required
  consentRequired?: string                // consent purpose (if gated)
  requiresConfirmation: boolean           // user must confirm before execution
  isOptional: boolean                     // enhancement, not required
  isFallback: boolean                     // true if this is a fallback step
  fallbackFor?: string                    // stepId this falls back from
  status: "planned"                       // always "planned" (execution is Phase 6)

  explanation: string                     // why this step is here
}

Alternative {
  forCapabilityId: string                 // the unavailable capability
  chosenAlternativeId: string             // the alternative chosen
  reason: string                          // why this alternative
}

MissingCap {
  suggestedId: string                     // e.g. "restaurant.reserve"
  subGoal: string                         // what it would have solved
  degradedPlanStep?: string               // how UOB handled it
}
```

### 11.2 What the Plan Does NOT Contain

- **No execution logic** — the plan describes WHAT, not HOW.
- **No API calls** — no HTTP endpoints, no function invocations.
- **No side effects** — the plan is a pure data structure.
- **No user memory writes** — PMB is untouched.
- **No geo queries** — GCIE data is referenced, not re-queried.
- **No ranking** — IRDE's rankings are referenced, not re-computed.

### 11.3 Plan Finalization

A plan is **finalized** when:
1. All steps have `capabilityId` + `inputs` + `explanation`.
2. All dependencies are resolved (or marked missing).
3. All permissions are verified (or marked `consent_required`).
4. The plan is attached to the Shared Context's `platform` section.
5. The Context Manager freezes the context.

The frozen context + plan is the handoff artifact to the future Execution Engine.

---

## 12. Explainability

### 12.1 What UOB Explains

Every Execution Plan carries explanations at three levels:

| Level | Question Answered | Example |
|---|---|---|
| **Plan-level** | Why this plan? | "This plan books your Istanbul trip in 7 steps: visa check, flights, hotels, weather, itinerary, FX alert, and destination research." |
| **Step-level** | Why this step? | "Step 2 (Search Flights) is included because you asked to plan a trip; flights are the primary transport. It depends on step 1 (Visa Check) because you should confirm visa-free entry before booking." |
| **Decision-level** | Why this alternative/fallback? | "Step 6 uses `pay.currency-exchange` instead of a bank integration because no banking capability is registered; currency exchange is the available alternative." |

### 12.2 Explanation Requirements

Per Volume 0, Ch.3 §3.11, every plan must explain:

- **Why modules were chosen** — "rihla was chosen for flights because it owns `travel.search-flights`; pay was chosen for currency exchange because it owns `pay.currency-exchange`."
- **Why dependencies exist** — "Step 2 depends on step 1 because `travel.search-flights` is only useful after `travel.check-visa` confirms eligibility."
- **Why plans were ordered** — "Visa check comes first because a denied visa invalidates the entire trip plan; weather comes before itinerary because weather affects outdoor activities."
- **Why alternatives were rejected** — "`pay.qr-payment` was considered for step 4 but rejected because the recipient is a person, not a merchant; `pay.transfer-money` is the correct capability."

### 12.3 Explanation Provenance

Every explanation references the data that informed it:
- Constraint references → CRIE `reasoning.constraints`
- Permission references → Capability Registry `permissions`
- Dependency references → Capability Graph edges
- Candidate references → IRDE `recommendation.rankedCandidates`

This makes explanations auditable: a reviewer can trace any plan decision back to its source.

---

## 13. Scalability

### 13.1 Scale Targets

| Dimension | Current | Target | Approach |
|---|---|---|---|
| Modules | 11 | 100+ | Workspace-scoped graph traversal |
| Capabilities | 37 | 1,000+ | Workspace partitioning + read-through cache |
| Users | — | Millions | Stateless UOB (no per-user state); Shared Context carries per-request state |
| Third-party developers | 0 | Thousands | Plugin registration via Capability Registry; UOB treats plugins identically to first-party |
| Countries | 246 (KG) | All | Country filtering via GCIE context; no hardcoded country logic |
| Government integrations | 2 (visa, shield) | Dozens per country | `gov:<country>:<action>` permission tokens; availability scoped by country |
| Plans per second | — | High | UOB is stateless + cache-backed; horizontal scaling |

### 13.2 Scalability Mechanisms

- **Statelessness**: UOB holds no per-user state. All state lives in the Shared Context (owned by the Context Manager). UOB instances are interchangeable.
- **Workspace-scoped traversal**: the Capability Graph is partitioned by workspace; planning traverses only the relevant partition.
- **Read-through cache**: registry lookups are cached with event-driven invalidation.
- **No global algorithms**: UOB never runs graph algorithms over the entire capability set; it uses scoped subgraph traversal.
- **Horizontal scaling**: multiple UOB instances can plan in parallel; the Shared Context (frozen per request) is the synchronization boundary.

### 13.3 Plugin Ecosystem

Third-party plugins register capabilities via the Capability Registry's `register()` API. UOB treats plugin capabilities identically to first-party capabilities — same graph nodes, same permission model, same planning logic. The only difference: plugin capabilities may carry a `source: "third-party"` tag (future) for transparency in explanations.

---

## 14. Security

### 14.1 Security Model

UOB adopts a **zero-trust** posture (Volume 0, Ch.2 §2.11):

- **Never trust the input**: UOB validates that the Shared Context is well-formed (via the Context Manager's `validate()`).
- **Never trust capabilities**: UOB verifies permissions + consent for every capability in every plan.
- **Never trust the user**: permission tokens are checked against PMB's `userPermissions`, not assumed.
- **Never execute**: UOB produces plans only; the Execution Engine performs all side effects under its own security boundary.

### 14.2 Permission Enforcement

UOB is the **permission gate** for orchestration. No plan leaves UOB without every step's permissions verified. Capabilities requiring sensitive permissions (`pay:send`, `shield:panic`, `commit:write`) are flagged `requiresConfirmation: true`.

### 14.3 Audit Trail

Every plan is recorded in the Shared Context's provenance trail (via the Context Manager). Every plan references the capability versions used, the permissions checked, the consent state at planning time. This provides a complete audit trail for compliance.

### 14.4 Threat Model

| Threat | UOB Mitigation |
|---|---|
| Capability spoofing (a malicious plugin claims to be `pay.transfer-money`) | Registry enforces unique ids; UOB only uses registered capabilities |
| Permission escalation (user attempts an action beyond their role) | UOB checks `userPermissions` for every step; denied steps are not planned |
| Consent bypass (using personal data without consent) | UOB checks consent for every gated capability; non-consented steps are flagged `consent_required` |
| Plan tampering (modifying a plan after UOB emits it) | The Shared Context is frozen after UOB enriches; tampering is detected by provenance |
| Denial of service (flooding UOB with plan requests) | UOB is stateless; rate limiting is the infrastructure layer's responsibility |

---

## 15. Privacy

### 15.1 Privacy-Preserving Orchestration

UOB honors Volume 0, Ch.3 §3.12: "Privacy governs both storage AND reasoning."

- **No personal data persistence**: UOB never writes to PMB. It reads user context from the Shared Context; plans are derived but not stored long-term.
- **Consent-aware planning**: capabilities requiring consent (`ai:personalization`, etc.) are planned only if consent is granted; otherwise the step is flagged `consent_required` and deferred.
- **Minimal data in plans**: plan `inputs` contain only what each capability needs. UOB does not pass the full user profile to every step.
- **Country-scoped government capabilities**: `gov:<country>:*` capabilities are only available if the user's geographic context matches; UOB never plans cross-country government actions.

### 15.2 Data Minimization

For each plan step, UOB includes only the input fields the capability's contract declares. Excess context (e.g., the user's full memory) is never passed to a capability that only needs a username.

### 15.3 Plan Visibility

Plans are visible to the user (explainability) and to the audit trail (compliance). Plans are NOT visible to:
- Other users (no plan sharing without explicit consent).
- Third-party plugins (plugins receive only their own step's inputs, not the whole plan).
- External systems (unless the user explicitly exports the frozen context).

---

## 16. Extensibility

### 16.1 Future Module Integration

New modules integrate without UOB redesign:

1. The module registers its capabilities via the Capability Registry.
2. UOB's Capability Graph refresh picks up the new capabilities.
3. UOB immediately can plan workflows using the new capabilities.

**No UOB code changes required.** This is the constitutional "Evolution Without Redesign" principle (Volume 0, Ch.3 §3.16) made concrete.

### 16.2 Future Phase Integration

| Future Phase | How UOB Integrates |
|---|---|
| **Phase 6 — Execution Engine** | Consumes UOB's frozen Execution Plan; executes steps; emits execution outcomes back to the Shared Context's `execution` section (reserved). |
| **Phase 7 — Learning Engine** | Consumes plan + execution outcomes from the Shared Context's `learning` section (reserved); improves UOB's heuristics over time. UOB's deterministic heuristics become learned policies. |

### 16.3 Extension Points

UOB has explicit extension points for future evolution:

| Extension Point | Current | Future |
|---|---|---|
| Planning heuristics | Hardcoded deterministic rules | Learned from Phase 7 (governed) |
| Capability Graph edges | `requires` from registry; others inferred | Plugin-declared edges |
| Workspace catalog | Derived from categories | User-customizable workspaces |
| Permission model | 5 layers (§7.1) | Enterprise RBAC, attribute-based access |
| Fallback paths | UOB-inferred | Plugin-declared fallbacks |

---

## 17. Metrics

### 17.1 Orchestration Quality KPIs

| KPI | Definition | Target |
|---|---|---|
| **Plan completeness** | % of plans that fulfill all sub-goals | > 90% |
| **Plan executability** | % of plans the Execution Engine can execute without re-planning | > 95% |
| **Permission accuracy** | % of plans with correct permission verification (no false accepts/rejects) | 100% |
| **Dependency resolution accuracy** | % of plans with correctly resolved dependencies | 100% |
| **Fallback effectiveness** | % of unavailable-capability situations where a fallback was found and executed | > 70% |
| **Explanation quality** | User rating of plan explanations (1-5) | > 4.0 |
| **Plan latency** | Time from goal to finalized plan (P95) | < 500ms at current scale |
| **Cache hit rate** | % of registry lookups served from UOB cache | > 90% |
| **Honesty score** | % of plans that correctly mark missing capabilities (no silent drops) | 100% |
| **Consent compliance** | % of consent-gated steps correctly flagged | 100% |

### 17.2 Operational Metrics

| Metric | Purpose |
|---|---|
| Plans per second | Capacity planning |
| Plans by workspace | Feature usage analysis |
| Plans by intent type | Intent distribution |
| Average plan step count | Plan complexity |
| Average parallel group count | Parallelism effectiveness |
| Missing capability frequency | Product gap analysis (feeds roadmap) |
| Fallback usage frequency | Capability health signal |

---

## 18. Success Criteria

### 18.1 How UOB Success Is Measured

UOB is successful when:

1. **Platform understanding is complete** — UOB can reason over 100% of registered capabilities, never hardcoding module logic.
2. **Plans are explainable** — every plan answers "why this plan?", "why this step?", "why this alternative?" with auditable references.
3. **Ownership is preserved** — UOB never duplicates GCIE/PMB/CRIE/IRDE/Cross-Eval/Context-Manager/Registry responsibilities. Non-overlap invariants (§2.3) hold.
4. **Permissions are enforced** — no plan leaves UOB with an unverified permission or unverified consent.
5. **Dependencies are resolved** — no plan has an unresolved dependency (missing capabilities are marked, not hidden).
6. **Fallbacks work** — when capabilities are unavailable, UOB finds alternatives or degrades honestly.
7. **Extensibility is proven** — new modules/capabilities integrate without UOB code changes.
8. **Privacy is preserved** — UOB never accesses unauthorized data; consent gates every gated capability.
9. **The platform feels unified** — users experience one AI coordinating the ecosystem, not a collection of siloed features.
10. **Phase 5 is achieved** — Cognitive Maturity Level 5 (Platform Awareness) is demonstrably reached.

### 18.2 Constitutional Alignment

This specification aligns with:
- **Volume 0, Chapter 1** — UOB serves the unified intelligence vision.
- **Volume 0, Chapter 2** — UOB honors all 20 architectural principles (Single Ownership, Separation of Responsibilities, Loose Coupling, Modularity, Explainability, Privacy, Security, Extensibility, etc.).
- **Volume 0, Chapter 3** — UOB achieves Maturity Level 5; it thinks, does not execute; it composes, does not duplicate.
- **Volume 0, Chapter 4** — UOB is Phase 5 in the fixed Constitutional Processing Sequence; it slots into the Shared Context pipeline without redesigning prior phases.
- **Phase 4.5** — UOB builds on the Context Manager + Capability Registry; it owns the reserved `platform` section.

### 18.3 Design Completeness

This specification is **complete** for constitutional purposes. It defines:
- ✅ Mission and role
- ✅ Constitutional responsibilities (owns + never owns)
- ✅ Platform understanding model
- ✅ Capability graph
- ✅ Workflow planning with 10 concrete examples mapped to real CIRKLE capabilities
- ✅ Planning intelligence (8 stages, heuristics, constraints, optimization, parallel/sequential/multi-goal/fallback)
- ✅ Permission model (5 layers, 14 current tokens, security boundaries, consent)
- ✅ Dependency resolution (algorithm, alternatives, missing capabilities)
- ✅ Context integration (reads + contributes + flow)
- ✅ Capability Registry integration (discovery, lookup, caching, versioning, no mutation)
- ✅ Output — the Execution Plan (full schema, what it contains + does NOT contain)
- ✅ Explainability (3 levels, 4 requirements, provenance)
- ✅ Scalability (100+ modules, 1000+ capabilities, millions of users, plugins)
- ✅ Security (zero-trust, permission enforcement, audit, threat model)
- ✅ Privacy (consent-aware, data minimization, plan visibility)
- ✅ Extensibility (future modules, future phases, extension points)
- ✅ Metrics (10 quality KPIs + 8 operational metrics)
- ✅ Success criteria (10 measures + constitutional alignment)

---

## 19. Ratification

This document is the **constitutional design document for the Universal Orchestration Brain (Phase 5)**. It governs all future UOB implementation. Any implementation that deviates from this specification requires formal architectural review and constitutional version advancement (Volume 0, Ch.2 §2.20).

**Status:** Ratified as Phase 5 Constitutional Design
**Next Step:** Implementation (governed by this specification)

---

*End of Phase 5 Design Specification — Universal Orchestration Brain (UOB) — Version 1.0*

# 🧠 CIRKLE Brain AI — Complete Training Guide

**The full reference for understanding, running, and training the 9-phase
cognitive operating system.**

This document explains every phase, what it does, its inputs/outputs, how the
phases connect, and exactly how to feed training data into each one.

---

## Table of Contents

1. [What is CIRKLE Brain AI?](#1-what-is-cirkle-brain-ai)
2. [The 9-Phase Cognitive Pipeline](#2-the-9-phase-cognitive-pipeline)
3. [Phase 1 — GCIE (Geo-Context Intelligence Engine)](#phase-1--gcie-geo-context-intelligence-engine)
4. [Phase 2 — PMB (Personal Memory Brain)](#phase-2--pmb-personal-memory-brain)
5. [Phase 3 — CRIE (Context & Reasoning Intelligence Engine)](#phase-3--crie-context--reasoning-intelligence-engine)
6. [Phase 4 — IRDE (Intelligent Recommendation & Decision Engine)](#phase-4--irde-intelligent-recommendation--decision-engine)
7. [Phase 4.5 — Shared Cognitive Foundation](#phase-45--shared-cognitive-foundation)
8. [Phase 5 — UOB (Universal Orchestration Brain)](#phase-5--uob-universal-orchestration-brain)
9. [Phase 6 — TEE (Trusted Execution Engine)](#phase-6--tee-trusted-execution-engine)
10. [Phase 7 — LIEE (Learning & Intelligence Evolution Engine) ⭐ TRAINING](#phase-7--liee-learning--intelligence-evolution-engine-)
11. [Phase 8 — CIE (Capability Intelligence Engine)](#phase-8--cie-capability-intelligence-engine)
12. [Phase 9 — TGSE (Trust, Governance & Safety Engine)](#phase-9--tgse-trust-governance--safety-engine)
13. [Extension Frameworks (PCPF + AHG)](#extension-frameworks)
14. [The 5 AI Provider APIs](#the-5-ai-provider-apis)
15. [How to Train Each Phase](#how-to-train-each-phase)
16. [End-to-End Training Walkthrough](#end-to-end-training-walkthrough)
17. [Monitoring & Governance](#monitoring--governance)

---

## 1. What is CIRKLE Brain AI?

CIRKLE Brain AI is **one unified cognitive operating system** — not a chatbot,
not a collection of independent AI agents, not multiple reasoning engines. It
is a single coherent intelligence with 9 specialized phases that cooperate
through standardized contracts.

### Core Philosophy (20 Constitutional Principles)

1. **One Unified Intelligence** — every interaction originates from one Brain
2. **Intelligence Before Execution** — understand before acting
3. **Understanding Before Action** — context is gathered first
4. **Context is the Foundation of Intelligence**
5. **Single Ownership** — each phase has ONE constitutional owner
6. **Separation of Cognitive Responsibilities**
7. **Platform Independence**
8. **Explainability by Design** — every decision is explainable
9. **Privacy by Design** — privacy as cognitive boundary
10. **Security by Design**
11. **Modularity**
12. **Loose Coupling**
13. **Shared Cognitive Ecosystem**
14. **Capability-Based Evolution**
15. **AI as an Operating System**
16. **Intelligence Through Composition**
17. **Scalability Without Redesign**
18. **Future Compatibility**
19. **Constitutional Stability**
20. **Human-Centered Intelligence**

### What the Brain Actually Does

The Brain powers EVERY intelligent experience in the CIRKLE super-app:
- Chat (Wasl) — smart replies, translation, summarization
- News — web search, article generation, recommendations
- Travel (Rihla) — flight/hotel search, itinerary planning, price prediction
- Payments (Circle Pay) — fraud detection, spending insights
- Social Feed — personalized For You feed, trending detection
- Maps — place ranking, nearby search
- Identity — Circle Verify, Circle ID
- Governance — Citizen Shield, moderation

Every user request flows through the same 9-phase pipeline.

---

## 2. The 9-Phase Cognitive Pipeline

```
User Goal
   ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 1: GCIE  — Understand the WORLD                  │
│             (places, events, weather, traffic, nearby)   │
└─────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 2: PMB   — Understand the USER                   │
│             (memory, preferences, goals, identity)       │
└─────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 3: CRIE  — REASON about intent                   │
│             (15 intent types, 5 decision types)          │
└─────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 4: IRDE  — DECIDE the best option                │
│             (12+ scoring factors, 6 domains)            │
└─────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 4.5: Shared Cognitive Foundation                 │
│             (Context Manager + Capability Registry)      │
│             — 11 context sections, 45+ capabilities      │
└─────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 5: UOB   — PLAN the execution                    │
│             (16-stage pipeline, ExecutionGraph)          │
└─────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 6: TEE   — EXECUTE the plan safely               │
│             (13-stage pipeline, 10-state FSM)            │
└─────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 7: LIEE  — LEARN from the outcome ⭐             │
│             (7-stage pipeline, 9 pattern types)          │
└─────────────────────────────────────────────────────────┘
   ↓
   ┌───────────────────────────────────────────────┐
   │  Phase 8: CIE  — supplies ecosystem knowledge │
   │  (246 countries, 1766 payment methods,        │
   │   1200 news sources, 8 gov services)          │
   └───────────────────────────────────────────────┘
   ┌───────────────────────────────────────────────┐
   │  Phase 9: TGSE — governs + validates + audits │
   │  EVERY stage (9-stage validation pipeline)    │
   └───────────────────────────────────────────────┘
```

### Cognitive Maturity Model (7 Levels — All Achieved)

| Level | Name | Phase | Status |
|---|---|---|---|
| 1 | Environmental Awareness | GCIE | ✅ Achieved |
| 2 | Personal Awareness | PMB | ✅ Achieved |
| 3 | Cognitive Awareness | CRIE | ✅ Achieved |
| 4 | Decision Awareness | IRDE | ✅ Achieved |
| 5 | Platform Awareness | UOB | ✅ Achieved |
| 6 | Execution Awareness | TEE | ✅ Achieved |
| 7 | Adaptive Intelligence | LIEE | ✅ Achieved |

---

## Phase 1 — GCIE (Geo-Context Intelligence Engine)

**"What exists in the real world?"**

GCIE is the world intelligence layer. It understands places, events, weather,
traffic, and spatial context.

| Attribute | Value |
|---|---|
| **File** | `src/lib/location-intelligence.ts` (684 lines) |
| **Owns** | Places, Events, Weather, Traffic, Spatial Context, Nearby Search |
| **Key Exports** | `globalProviderRegistry`, `globalLearningEngine`, `rankPlaces`, `ALL_PLACE_TYPES` |
| **Providers** | OSM (OpenStreetMap — free, no API key needed) |
| **Knowledge Graph** | 246 countries, 1766 payment methods, 800 transport options, 1200 news sources |
| **Learning** | Source popularity learning (`brain-source-learning.ts`) |

### Capabilities
- Multi-provider geo search with pluggable data sources
- Place ranking with user preferences (20+ ranking signals)
- Event search and discovery
- Weather integration (Open-Meteo — free)
- Traffic awareness
- Self-learning source popularity engine
- Nearby search with type filtering
- Integration with Zero-Cost Mapping Stack

### Inputs
```typescript
// Place search
globalProviderRegistry.searchAll({
  lat: 30.0444,
  lng: 31.2357,           // Cairo coordinates
  radiusMeters: 5000,
  types: ["restaurant", "cafe", "shopping_mall"],
  limit: 10,
});

// Event search
globalProviderRegistry.searchAllEvents({
  city: "Cairo",
  country: "Egypt",
  limit: 4,
  language: "en",
});
```

### Outputs
- Ranked list of places with distance, rating, category, neighborhood
- Event list with title, venue, date, category

### How to train GCIE
GCIE learns through `brain-source-learning.ts` — it tracks which data sources
(OSM providers) return the best results over time. Feed it place-search queries
and it automatically adjusts source priorities.

```typescript
import { globalLearningEngine } from "./src/lib/location-intelligence";

// The learning engine tracks source performance automatically.
// Every search updates the source popularity scores.
// You can also feed explicit feedback:
globalLearningEngine.recordSourceQuality("osm", {
  query: "restaurant Cairo",
  resultCount: 8,
  userSatisfied: true,
});
```

---

## Phase 2 — PMB (Personal Memory Brain)

**"Who is this user?"**

PMB is the user intelligence layer. It maintains privacy-preserving,
user-controlled long-term memory.

| Attribute | Value |
|---|---|
| **File** | `src/lib/personal-memory-brain.ts` (463 lines) |
| **Owns** | Personal Memory, Preferences, Goals, Identity, Relationships, Long-Term Memory |
| **Memory Categories** | 13 (interaction, preference, goal, routine, relationship, etc.) |
| **Privacy Levels** | 4 (public, personal, sensitive, encrypted) |
| **Lifecycle** | 5 stages (candidate → user_confirmed → active → archived → expired) |
| **Memory Graph** | GraphNode + GraphEdge for relationship modeling |
| **Persistence** | DB-backed via `/api/memory` (Prisma) + in-memory cache |

### 13 Memory Categories
1. `interaction` — past conversations, messages
2. `preference` — likes, dislikes, tastes
3. `goal` — what the user wants to achieve
4. `routine` — recurring patterns (e.g., "coffee every morning at 8am")
5. `relationship` — connections to other people
6. `identity` — verified claims (age, nationality)
7. `location` — places the user visits
8. `event` — calendar events, appointments
9. `skill` — things the user is good at
10. `interest` — topics the user follows
11. `context` — situational context (traveling, at work)
12. `feedback` — past feedback on AI suggestions
13. `metadata` — system metadata

### 4 Privacy Levels
| Level | What it means | AI access |
|---|---|---|
| `public` | Visible to everyone | Full |
| `personal` | Visible to user + Brain | Full (with consent) |
| `sensitive` | Visible to user only | Restricted (minimal context) |
| `encrypted` | Encrypted at rest, Brain sees nothing | None |

### Memory Lifecycle
```
candidate → user_confirmed → active → archived → expired
```
- `candidate` — AI proposes a memory (e.g., "User likes Italian food")
- `user_confirmed` — User confirms it's accurate
- `active` — In use by the Brain
- `archived` — No longer current, but retained
- `expired` — TTL reached, pending deletion

### Inputs
```typescript
import { personalMemoryBrain } from "./src/lib/personal-memory-brain";

// Store a memory
await personalMemoryBrain.store({
  userId: "user-123",
  category: "preference",
  key: "cuisine",
  value: "Italian",
  privacyLevel: "personal",
  source: "inferred_from_chat",
  confidence: 0.85,
});

// Search memories
const memories = await personalMemoryBrain.search({
  userId: "user-123",
  query: "food preferences",
  limit: 10,
});

// Get memory graph (relationships)
const graph = await personalMemoryBrain.getGraph("user-123");
```

### How to train PMB
Feed it user preferences, goals, and interaction history. PMB is
**consent-gated** — it only stores what users authorize.

```typescript
// Train PMB with historical user data
const userHistory = [
  { category: "preference", key: "cuisine", value: "Italian", confidence: 0.9 },
  { category: "preference", key: "travel_style", value: "budget", confidence: 0.8 },
  { category: "goal", key: "learn_arabic", value: "active", confidence: 1.0 },
  { category: "routine", key: "morning_coffee", value: "8am daily", confidence: 0.95 },
];

for (const mem of userHistory) {
  await personalMemoryBrain.store({
    userId: "user-123",
    ...mem,
    privacyLevel: "personal",
    source: "training-import",
  });
}
```

---

## Phase 3 — CRIE (Context & Reasoning Intelligence Engine)

**"What does the user mean?"**

CRIE is the cognitive core. It fuses context from GCIE + PMB, reasons about
intent, and makes decisions.

| Attribute | Value |
|---|---|
| **File** | `src/lib/crie-engine.ts` (649 lines) |
| **Owns** | Intent Detection, Context Fusion, Multi-Step Reasoning, Constraint Analysis, Clarification, Decision Reasoning |
| **Intent Types** | 15 |
| **Context Fusion** | UnifiedContext merging conversation + personal + world + temporal + reasoning graph |
| **Decision Types** | 5 |
| **Key Export** | `globalCRIE`, `UnifiedContext`, `Intent`, `ReasoningNode`, `Decision` |

### 15 Intent Types
| Intent | Example trigger | Example user query |
|---|---|---|
| `find` | Search for something | "Find Italian restaurants near me" |
| `book` | Make a reservation | "Book a table for 2 at 8pm" |
| `plan` | Create a plan | "Plan a 3-day trip to Cairo" |
| `recommend` | Suggest something | "What should I do this weekend?" |
| `remind` | Set a reminder | "Remind me to call mom at 5pm" |
| `answer` | Factual question | "What's the weather in Dubai?" |
| `navigate` | Directions | "How do I get to the airport?" |
| `compare` | Compare options | "Compare iPhone vs Samsung" |
| `track` | Track something | "Track my flight UA123" |
| `create` | Create content | "Write a post about my trip" |
| `communicate` | Send a message | "Tell Ahmed I'll be late" |
| `learn` | Educational query | "Explain how blockchain works" |
| `analyze` | Data analysis | "Analyze my spending this month" |
| `automate` | Set up automation | "Auto-pay my electricity bill" |
| `clarify` | Needs clarification | (internal — used when intent is ambiguous) |

### 5 Decision Types
| Decision | When | Example |
|---|---|---|
| `answer_directly` | Simple factual query | "What time is it?" |
| `consult_module` | Needs a specific module | "Find flights" → travel module |
| `request_clarification` | Intent is ambiguous | "Did you mean restaurants or recipes?" |
| `compare_options` | Multiple candidates | "Compare these 3 hotels" |
| `escalate` | Complex, needs human | Legal advice, medical emergency |

### Context Fusion (UnifiedContext)
CRIE merges context from multiple sources into a single `UnifiedContext`:

```typescript
interface UnifiedContext {
  conversation: { ... };      // Current conversation history
  personal: { ... };          // From PMB (user profile, preferences)
  world: { ... };             // From GCIE (location, weather, events)
  temporal: { ... };          // Time of day, season, holidays
  reasoning: { ... };         // Past reasoning steps
  request: { ... };           // The current user request
  validation: { ... };        // TGSE validation results
  recommendation: { ... };    // IRDE recommendations
  platform: { ... };          // UOB plan
  execution: { ... };         // TEE execution state
  learning: { ... };          // LIEE learning state
}
```

### How to train CRIE
CRIE learns through LIEE. When users ask clarifying questions repeatedly,
LIEE detects a `clarification-repeat` pattern and proposes adding new keywords
to CRIE's intent detection.

```typescript
import { globalCRIE } from "./src/lib/crie-engine";

// Analyze a user query
const analysis = globalCRIE.analyzeIntent("I want to eat something good");
// → { intent: "recommend", confidence: 0.92, subIntent: "food" }

// CRIE's keyword maps are updated by LIEE when patterns are detected.
// You can also manually add keywords:
globalCRIE.addIntentKeyword("recommend", "feed me");
globalCRIE.addIntentKeyword("recommend", "hungry");
```

---

## Phase 4 — IRDE (Intelligent Recommendation & Decision Engine)

**"Which option is best?"**

IRDE evaluates candidates and selects the optimal recommendation.

| Attribute | Value |
|---|---|
| **File** | `src/lib/irde-engine.ts` (593 lines) |
| **Owns** | Recommendation Ranking, Candidate Evaluation, Personalization, Alternative Generation, Explainability |
| **Scoring Factors** | 12+ |
| **Domain Weights** | 6 domains |
| **Feedback Types** | 9 |
| **Exploration vs Exploitation** | Configurable `explorationLevel` (0-1) |
| **Cold Start** | Handled with boosted popular + well-rated options |
| **API** | `POST /api/recommend` (recommend, feedback, alternatives, stats) |

### 12+ Scoring Factors
1. `distance` — How far is it?
2. `rating` — User rating (1-5 stars)
3. `open_status` — Is it open now?
4. `preference_match` — Matches user preferences (from PMB)
5. `budget` — Within user's budget
6. `popularity` — How popular is it?
7. `weather` — Weather-appropriate?
8. `time` — Time-of-day appropriate?
9. `diversity` — Avoid recommending the same type repeatedly
10. `historical_satisfaction` — Has the user liked similar before?
11. `goal_alignment` — Aligns with user's goals (from PMB)
12. `safety` — Safety score (from TGSE)

### 6 Domain Weight Configs
| Domain | Prioritizes |
|---|---|
| `dining` | Distance, rating, cuisine match |
| `coffee` | Distance, speed, WiFi |
| `travel` | Price, duration, reviews |
| `events` | Category match, date, location |
| `shopping` | Price, availability, brand |
| `general` | Balanced |

### 9 Feedback Types
`accepted`, `rejected`, `ignored`, `booked`, `purchased`, `navigated`, `visited`, `rated`, `corrected`

### Inputs
```typescript
import { globalIRDEEngine } from "./src/lib/irde-engine";

// Get recommendations
const recs = await globalIRDEEngine.recommend({
  userId: "user-123",
  domain: "dining",
  candidates: [/* list of restaurants */],
  context: { location: "Cairo", time: "19:00", budget: 200 },
  count: 5,
});

// Record feedback (user accepted a recommendation)
await globalIRDEEngine.recordFeedback({
  userId: "user-123",
  recommendationId: recs[0].id,
  feedback: "accepted",
  rating: 5,
});
```

### How to train IRDE
IRDE learns from feedback. Every `accepted`/`rejected`/`rated` signal adjusts
the scoring weights. LIEE detects when certain weights are consistently wrong
and proposes corrections.

```typescript
// Bulk train IRDE with historical feedback
const historicalFeedback = [
  { userId: "u1", recommendationId: "r1", feedback: "accepted", rating: 5 },
  { userId: "u1", recommendationId: "r2", feedback: "rejected", rating: 2 },
  { userId: "u2", recommendationId: "r1", feedback: "accepted", rating: 4 },
  // ...
];

for (const fb of historicalFeedback) {
  await globalIRDEEngine.recordFeedback(fb);
}

// IRDE weights are stored in the DB. LIEE can propose weight adjustments:
// e.g., "Increase 'distance' weight for dining domain by 15%"
```

---

## Phase 4.5 — Shared Cognitive Foundation

**The shared layer that all phases use.**

| Attribute | Value |
|---|---|
| **Modules** | 6 (shared-context, context-manager, capability-registry, capability-seed, cognitive-pipeline, index) |
| **Shared Context Sections** | 11 |
| **Lifecycle APIs** | 10 |
| **Ownership** | Each section has exactly ONE constitutional owner |
| **Immutability** | Every enrich returns a new versioned snapshot |
| **Registered Capabilities** | 45+ (37 seeded + 8 from PCPF) |
| **Categories** | 13 |
| **Registry APIs** | 9 |

### 11 Shared Context Sections

| Section | Owner | What it holds |
|---|---|---|
| `request` | CRIE | The user's current request |
| `session` | Context Manager | Session metadata |
| `geographic` | GCIE | Location, weather, nearby |
| `user` | PMB | User profile, preferences, consent |
| `reasoning` | CRIE | Reasoning steps, intent |
| `validation` | TGSE | Governance validation results |
| `recommendation` | IRDE | Ranked candidates |
| `platform` | UOB | Execution plan |
| `execution` | TEE | Execution state |
| `learning` | LIEE | Learning signals, patterns |
| `extensions` | PCPF | Pack-provided extensions |

### 10 Context Lifecycle APIs
`create`, `read`, `enrich`, `validate`, `freeze`, `clone`, `serialize`, `deserialize`, `trace`, `debug`

### Capability Registry (45+ capabilities)

| Category | Example capabilities |
|---|---|
| `payments` | pay.transfer-money, pay.merchant-payment, pay.split-bill, pay.qr-payment, pay.currency-exchange |
| `travel` | travel.search-flights, travel.search-hotels, travel.generate-itinerary, travel.check-visa |
| `news` | news.search, news.headlines, news.recommend |
| `feed` | feed.generate, feed.trending |
| `social` | midan.create-post, midan.like-post, midan.comment |
| `entertainment` | mashahd.upload-video, mashahd.like-video, mashahd.smart-reply |
| `ai` | ai.translate, ai.summarize, ai.smart-reply, ai.cross-evaluate |
| `maps` | maps.search-nearby, maps.route, maps.geocode |
| `identity` | identity.verify, identity.attest |
| `government` | gov.check-visa, gov.document-verification, gov.tax-filing |
| `communication` | wasl.send-message, wasl.translate |
| `commerce` | commerce.search-products, commerce.compare-prices |
| `utilities` | util.weather, util.currency-convert |

```typescript
import { globalCapabilityRegistry } from "./src/lib/cognitive/capability-registry";

// Look up a capability
const cap = globalCapabilityRegistry.lookup("travel.search-flights");
// → { id, name, description, inputSchema, outputSchema, permissions, ... }

// Search capabilities
const travelCaps = globalCapabilityRegistry.search({ category: "travel" });

// Register a new capability (for PCPF packs)
globalCapabilityRegistry.register({
  id: "myapp.custom-action",
  name: "Custom Action",
  description: "Does something custom",
  category: "utilities",
  inputSchema: { ... },
  outputSchema: { ... },
  permissions: [],
  dependencies: [],
});
```

---

## Phase 5 — UOB (Universal Orchestration Brain)

**"How do I execute this?"**

UOB transforms user goals into complete, explainable, executable orchestration
plans.

| Attribute | Value |
|---|---|
| **File** | `src/lib/uob/uob-engine.ts` |
| **Pipeline** | 16 stages |
| **Modules** | 12 |
| **Goal Templates** | 15 intent templates → sub-goals |
| **Key Export** | `globalUOBEngine` |

### 16-Stage Planning Pipeline

```
 1. Goal Analysis              → Understand what the user wants
 2. Goal Decomposition         → Break into sub-goals (15 templates)
 3. Capability Discovery       → Find capabilities via Registry
 4. Capability Selection       → Pick the best ones
 5. Dependency Resolution      → Resolve transitive deps + cycles
 6. Permission Validation      → Check user has permissions
 7. Constraint Validation      → Check constraints (time, location, etc.)
 8. Workflow Planning          → Ordered/parallel/conditional
 9. Parallelization Analysis   → What can run in parallel?
10. Sequential Ordering        → Order the steps
11. Alternative Planning       → Backup plans
12. Fallback Planning          → If all else fails...
13. Compensation Planning      → Rollback if something breaks
14. Execution Graph Generation → Directed graph
15. Execution Plan Generation  → + TGSE governance validation
16. Explainability Package     → 3-level explanations
```

### Key Integrations (Wired)
- **UOB → TGSE**: Every plan validated through governance before returning
- **UOB → CIE**: Filters capabilities by country availability + partner trust scores
- **UOB → Capability Registry**: Discovers capabilities dynamically (no hardcoding)

### Inputs
```typescript
import { globalUOBEngine } from "./src/lib/uob";

// Generate an execution plan
const plan = await globalUOBEngine.plan({
  goal: "Book a 3-day trip to Cairo for next weekend",
  userId: "user-123",
  country: "EG",
  userPermissions: ["travel:book", "pay:send"],
  consentScope: ["ai_personalization", "necessary"],
});

// plan = {
//   planId: "plan-xxx",
//   goal: "Book a 3-day trip to Cairo",
//   steps: [
//     { id: "step-1", capability: "travel.check-visa", inputs: {...}, dependencies: [] },
//     { id: "step-2", capability: "travel.search-flights", inputs: {...}, dependencies: ["step-1"] },
//     { id: "step-3", capability: "travel.search-hotels", inputs: {...}, dependencies: ["step-1"] },
//     { id: "step-4", capability: "pay.transfer-money", inputs: {...}, dependencies: ["step-2", "step-3"] },
//   ],
//   executionGraph: { ... },
//   explainability: {
//     planLevel: "I planned your trip in 4 steps: visa check → flight search → hotel search → payment",
//     stepLevel: [...],
//     decisionLevel: [...],
//   },
//   tgseDecision: { approved: true, ... },
//   isComplete: true,
//   confidence: 0.92,
// }
```

### How to train UOB
UOB learns through LIEE. When certain workflows consistently succeed or fail,
LIEE proposes new goal templates or adjusts the heuristics in `heuristics.ts`.

---

## Phase 6 — TEE (Trusted Execution Engine)

**"Execute the plan safely."**

TEE executes approved plans. It never decides what should happen — it only
performs what UOB planned.

| Attribute | Value |
|---|---|
| **File** | `src/lib/tee/tee-engine.ts` |
| **Pipeline** | 13 stages |
| **Modules** | 11 |
| **Runtime States** | 10 (FSM) |
| **Live Executors** | 5 (travel.search-flights, travel.search-hotels, news.search, maps.search-nearby, ai.cross-evaluate) |
| **Simulated Executors** | 37 (dry-run mode) |
| **Retry Strategies** | 6 |

### 13-Stage Execution Pipeline

```
 1. Execution Validation       → Is the plan valid?
 2. Permission Verification    → Does user have permissions?
 3. TGSE Governance Validation → Is execution approved? (blocks if denied)
 4. Capability Resolution      → Resolve capabilities to executors
 5-8. Execution Scheduler      → invoke / track / sync (4 stages)
 9. Retry Management           → 6 strategies (immediate, exponential-backoff,
                                limited, alternative-capability,
                                manual-intervention, permanent-failure)
10. Compensation               → Rollback on failure
11. Shared Context Update      → + LIEE Feedback (learning loop closed)
12. Execution Report           → Detailed outcome
```

### 10-State Runtime FSM
```
pending → running → {waiting, paused, retrying, compensating}
                  → {completed, failed, cancelled, timed-out}
```
All transitions are deterministic and auditable.

### Key Integrations (Wired)
- **TEE → TGSE**: Every live execution validated through governance (blocks if denied)
- **TEE → LIEE**: Every execution outcome auto-feeds LIEE feedback collector ⭐

### Inputs
```typescript
import { globalTEEEngine } from "./src/lib/tee";

// Execute a plan (from UOB)
const result = await globalTEEEngine.execute({
  planId: "plan-xxx",
  autoApprove: false,    // require TGSE approval
  dryRun: false,         // live execution
  userId: "user-123",
  consentScope: ["necessary", "ai_personalization"],
});

// result = {
//   executionId: "exec-xxx",
//   planId: "plan-xxx",
//   state: "completed",     // or "failed", "cancelled", etc.
//   stepsSucceeded: 4,
//   stepsFailed: 0,
//   totalDurationMs: 3200,
//   totalRetries: 0,
//   auditTrail: [...],
// }
```

### How to train TEE
TEE trains automatically — every execution outcome feeds LIEE. When executions
fail, LIEE detects `common-failure` patterns and proposes fallback strategies.

---

## Phase 7 — LIEE (Learning & Intelligence Evolution Engine) ⭐

**"Learn from the outcome."**

**This is the TRAINING phase.** LIEE closes the cognitive loop. It learns from
execution outcomes and proposes governed improvements.

| Attribute | Value |
|---|---|
| **File** | `src/lib/liee/liee-engine.ts` |
| **Pipeline** | 7 stages |
| **Modules** | 9 |
| **Feedback Pipelines** | 6 |
| **Pattern Types** | 9 |
| **Proposal Targets** | 9 |
| **Governance** | propose → review → approve/reject → deploy → rollback |
| **Key Export** | `globalLIEEEngine`, `globalFeedbackCollector`, `globalPatternDetector`, `globalProposalEngine` |

### 7-Stage Learning Pipeline

```
Stage 1: Feedback Collection (6 pipelines)
   ↓
Stage 2: Signal Normalization (0-1 scoring)
   ↓
Stage 3: Pattern Detection (9 types)
   ↓
Stage 4: Proposal Generation (9 targets)
   ↓
Stage 5: Proposal Evaluation (scoring + ranking)
   ↓
Stage 6: Governance (propose → review → approve/reject → deploy → rollback)
   ↓
Stage 7: Shared Context Update
```

### The 6 Feedback Pipelines

| Pipeline | Source | Normalization | Example |
|---|---|---|---|
| **Explicit** | User ratings (1-5) | `rating / 5` → 0-1 | User rates a recommendation 5 stars → score 1.0 |
| **Implicit** | Accept/reject/ignore | accept=1.0, ignore=0.5, reject=0.0 | User clicks "Yes" on a suggestion → 1.0 |
| **Behavioral** | Dwell time + clicks | Engagement score 0-1 | User spends 45s reading → 0.9 |
| **Operational** | Latency + error rate | Performance score 0-1 | API responds in 200ms → 1.0 |
| **Execution** | TEE outcomes | completed=1.0, failed=0.0 | Plan executes successfully → 1.0 |
| **Satisfaction** | Post-interaction score | `score / 5` → 0-1 | User says "Great!" → 1.0 |

### The 9 Pattern Types

| Pattern | What it detects | Example |
|---|---|---|
| `frequent-workflow` | Repeated user workflows | "User always books flights on Tuesdays" |
| `common-failure` | Recurring failures | "Hotel search fails in Egypt 30% of the time" |
| `clarification-repeat` | Same clarification asked repeatedly | "Users keep asking 'visa-free?'" → CRIE keyword gap |
| `high-performing-strategy` | Strategies with high success | "Groq + Gemini chain works best for Arabic" |
| `usage-trend` | Rising/declining feature usage | "News usage up 40% in Saudi Arabia" |
| `capability-adoption` | Which capabilities users adopt | "pay.split-bill adoption rising" |
| `preference-evolution` | Changing preferences | "User shifted from budget to luxury hotels" |
| `latency-pattern` | Slow operations | "CIE graph traversal >2s when depth>5" |
| `provider-performance` | AI provider reliability | "OpenRouter 99% uptime, HuggingFace 85%" |

### The 9 Proposal Targets

| Target | What gets improved | Example proposal |
|---|---|---|
| `CRIE` | Intent keywords, clarification rules | "Add 'visa-free' as a travel intent keyword" |
| `IRDE` | Scoring weights, domain configs | "Increase 'distance' weight for restaurant recs by 15%" |
| `UOB` | Goal templates, workflow rules | "Add Tuesday-flight-booking template" |
| `TEE` | Fallback strategies, retry rules | "Use Gemini as fallback when Groq fails for Arabic" |
| `Capability Registry` | Capability priorities | "Promote pay.split-bill in suggestions" |
| `Provider Router` | Provider demotion/promotion | "Demote HuggingFace for vision queries" |
| `CIE` | Knowledge graph updates | "Add 'Fawry' as payment method in Egypt" |
| `TGSE` | Policy updates | "Relax rate-limit for trusted users" |
| `PMB` | Memory retention rules | "Extend memory TTL for travel preferences" |

### Governance Lifecycle

```
proposed → under-review → approved/rejected → deployed → rolled-back (if needed)
```

**LIEE NEVER automatically applies proposals.** Human approval is enforced.
Approved proposals can be auto-applied to phase engines (reversible).

### How to train LIEE (THE MAIN TRAINING ENTRY POINT)

```typescript
import {
  globalLIEEEngine,
  globalFeedbackCollector,
  globalProposalEngine,
} from "./src/lib/liee";

// ── Method 1: Feed feedback signals directly ──────────────────────────

// Explicit feedback (user ratings)
await globalFeedbackCollector.ingest({
  pipeline: "explicit",
  sourcePhase: "irde",
  userId: "user-123",
  targetEntityId: "rec-001",
  targetType: "recommendation",
  raw: { rating: 5, context: "travel recommendation", action: "accepted" },
  consentGranted: true,
});

// Implicit feedback (user accepted a recommendation)
await globalFeedbackCollector.ingest({
  pipeline: "implicit",
  sourcePhase: "irde",
  userId: "user-123",
  targetEntityId: "rec-002",
  targetType: "recommendation",
  raw: { action: "accepted", context: "restaurant suggestion" },
  consentGranted: true,
});

// Behavioral feedback (engagement metrics)
await globalFeedbackCollector.ingest({
  pipeline: "behavioral",
  sourcePhase: "feed",
  userId: "user-123",
  targetType: "content",
  raw: { dwellTimeMs: 45000, clicks: 3, context: "news article" },
  consentGranted: true,
});

// Execution feedback (TEE outcome — usually automatic via TEE → LIEE wiring)
await globalFeedbackCollector.ingestExecutionOutcome({
  executionId: "exec-001",
  planId: "plan-001",
  state: "completed",
  stepsSucceeded: 5,
  stepsFailed: 0,
  totalDurationMs: 3200,
  totalRetries: 0,
  userId: "user-123",
  consentGranted: true,
});

// ── Method 2: Run the full learning pipeline ──────────────────────────

const result = await globalLIEEEngine.learn({
  sharedContext: {
    request: { userId: "user-123", sessionId: "session-xxx" },
    user: { consentScope: ["ai_personalization", "federated_learning"] },
  },
  feedback: {
    pipeline: "explicit",
    sourcePhase: "irde",
    userId: "user-123",
    targetType: "recommendation",
    targetEntityId: "rec-001",
    raw: { rating: 5, action: "accepted" },
    consentGranted: true,
  },
  detectPatterns: true,
  generateProposals: true,
  learningEnabled: true,
});

// result = {
//   patternsDetected: [...],
//   proposalsGenerated: [...],
//   enrichedContext: {...},
//   stats: { durationMs, signalsProcessed, patternsFound, proposalsGenerated },
// }

// ── Method 3: Review and approve proposals ─────────────────────────────

const pending = globalProposalEngine.getProposalsByStatus("proposed");
// Review each proposal, then approve or reject
// (see Governance section below)
```

---

## Phase 8 — CIE (Capability Intelligence Engine)

**"What capabilities exist in the ecosystem?"**

CIE is the AI's internal cognitive model of the entire CIRKLE ecosystem.

| Attribute | Value |
|---|---|
| **File** | `src/lib/cie/cie-engine.ts` |
| **Modules** | 12 |
| **Countries Modeled** | 6 (EG, SA, AE, US, GB, FR) + 246 in knowledge graph |
| **Government Services** | 8 (NIDA, Absher, ICP, IRS, ZATCA, FTA, Customs) |
| **Partners** | 12 (Visa, Mastercard, Stripe, Fawry, Booking, Amadeus, Uber, OpenAI, Twilio) |
| **Enterprise Integrations** | 6 (SAP, Salesforce, Workday, QuickBooks, Okta, Slack) |
| **Ontology Nodes** | 12 (6 domains + 6 categories) |
| **Knowledge Graph** | 32 nodes, 8 edges |

### Knowledge Domains

| Domain | Count | Examples |
|---|---|---|
| Countries | 6 | Egypt, Saudi Arabia, UAE, US, UK, France |
| Government Services | 8 | NIDA (EG), Absher (SA), ICP (AE), IRS (US), ZATCA (SA), FTA (AE), Customs |
| Partners | 12 | Visa, Mastercard, Stripe, Fawry, Booking.com, Amadeus, Uber, OpenAI, Twilio |
| Enterprise | 6 | SAP ERP, Salesforce CRM, Workday HR, QuickBooks, Okta, Slack |
| Ontology | 12 | 6 domains (financial, travel, commerce, social, government, AI) + 6 categories |
| Capabilities | 8+ | Version info with regional availability |

### Architecture Separation
- **Capability Registry (Phase 4.5)** = runtime registration service
- **CIE (Phase 8)** = authoritative cognitive knowledge layer
- UOB discovers capabilities through CIE
- TEE resolves capabilities using CIE metadata
- LIEE analyzes capability evolution through CIE

```typescript
import { globalCIEEngine } from "./src/lib/cie";

// Get country intelligence
const egypt = globalCIEEngine.getCountry("EG");
// → { code, name, currency, paymentMethods, complianceProfile, ... }

// Get partner info
const visa = globalCIEEngine.getPartner("visa");
// → { name, trustScore: 95, capabilities: [...], countries: [...] }

// Traverse the knowledge graph
const related = globalCIEEngine.traverseGraph("egypt", "payment_methods");
// → [visa, mastercard, fawry, vodafone-cash, instapay, ...]
```

---

## Phase 9 — TGSE (Trust, Governance & Safety Engine)

**"Is this allowed? Is it safe? Is it compliant?"**

TGSE is the constitutional guardian. It validates, governs, authorizes,
monitors, and audits every AI action.

| Attribute | Value |
|---|---|
| **File** | `src/lib/tgse/tgse-engine.ts` |
| **Pipeline** | 9 stages |
| **Modules** | 12 |
| **Policies** | 10 across 8 domains |
| **Compliance Profiles** | 4 (GDPR, PCI-DSS, CBE, ZATCA) |
| **AI Safety Checks** | 8 |
| **Risk Types** | 7 (with 5 levels each) |
| **Trust-Scored Entities** | 10 |
| **Audit Event Types** | 15 |

### 9-Stage Validation Pipeline

```
1. Policy evaluation       → Does a policy allow this?
2. Permission validation   → Does the user have permission?
3. Risk assessment         → What's the risk level?
4. AI safety checks        → 8 safety checks (prompt injection, hallucination, etc.)
5. Compliance verification → GDPR / PCI-DSS / CBE / ZATCA
6. Trust score check       → Is the entity trusted enough?
7. Human approval          → Does this need human sign-off?
8. Explainability          → Generate explanation
9. Audit recording         → Record in immutable audit trail
```

### Governance Domains
CRIE (reasoning validity), IRDE (recommendation fairness), UOB (workflow
legality), TEE (execution authorization), LIEE (learning governance), CIE
(capability trust)

### 8 AI Safety Checks
1. Prompt injection detection
2. Unsafe instruction detection
3. Malicious workflow detection
4. Data leakage prevention
5. Capability misuse detection
6. Privilege escalation prevention
7. Hallucination confidence gating
8. High-impact decision controls

### 7 Risk Types × 5 Levels
| Risk Type | Levels |
|---|---|
| Financial | negligible, low, medium, high, critical |
| Operational | negligible, low, medium, high, critical |
| Privacy | negligible, low, medium, high, critical |
| Regulatory | negligible, low, medium, high, critical |
| Fraud | negligible, low, medium, high, critical |
| Reputation | negligible, low, medium, high, critical |
| AI misuse | negligible, low, medium, high, critical |

### 4 Compliance Profiles
| Profile | Region | What it enforces |
|---|---|---|
| GDPR | EU | Data protection, right to erasure, consent |
| PCI-DSS | Global | Payment card security |
| CBE Digital Payments | Egypt | Central Bank of Egypt rules |
| ZATCA E-Invoicing | Saudi Arabia | Saudi tax authority rules |

### 10 Trust-Scored Entities
Visa (95), Mastercard (95), Stripe (90), Fawry (75), OpenAI (85), NIDA (80),
Absher (85), cirkle.travel (80), cirkle.payments (85), cirkle.gov (70)

### Audit Engine
Immutable, cryptographically-chained audit trails. 15 event types. Tamper
detection via hash chain verification.

```typescript
import { globalTGSEEngine } from "./src/lib/tgse";

// Validate an action
const decision = await globalTGSEEngine.validate({
  target: "tee",
  action: "pay.transfer-money",
  country: "EG",
  userPermissions: ["pay:send"],
  consentScope: ["necessary"],
  amount: 500,
  impact: "medium",
});

// decision = {
//   approved: true,
//   riskLevel: "low",
//   complianceChecks: { gdpr: true, pci_dss: true, cbe: true },
//   explanations: [...],
//   auditId: "audit-xxx",
// }
```

---

## Extension Frameworks

### PCPF (Platform Capability Pack Framework)
Enables the Brain to grow through modular capability packs.

| Attribute | Value |
|---|---|
| **Modules** | 10 |
| **Sample Packs** | 3 (travel, payments, government) |
| **Pack Lifecycle** | install → upgrade → deprecate → rollback → remove |
| **Policy Types** | 8 (user-permission, enterprise-permission, country-constraint, etc.) |

```typescript
import { globalPCPFFramework } from "./src/lib/pcpf";

// Install a capability pack
await globalPCPFFramework.install("cirkle.travel", "1.0.0");

// List installed packs
const packs = globalPCPFFramework.listPacks();
```

### AHG (Account Health Guardian)
Auto-diagnoses account problems and proposes fixes with user consent.

| Attribute | Value |
|---|---|
| **Modules** | 5 |
| **Problem Types** | 11 |
| **API Routes** | 3 (diagnose, propose-fix, consent-fix) |

```typescript
import { AHGEngine } from "./src/lib/ahg";

// Diagnose a problem
const diagnosis = await AHGEngine.diagnose({
  userId: "user-123",
  problemDescription: "I can't send money",
  problemTypeHint: "payment-failed",
});

// → { problem, rootCause, proposedFixes, nextSteps }
```

---

## The 5 AI Provider APIs

The Brain uses 5 AI providers. All web search goes through OpenRouter's
`:online` model suffix. **ZAI is completely removed.**

### Provider Summary

| Provider | Model | API Endpoint | Strength | Free Tier |
|---|---|---|---|---|
| **Groq** | `llama-3.3-70b-versatile` | `https://api.groq.com/openai/v1/chat/completions` | Speed (500ms), Arabic | ✅ Yes |
| **OpenRouter** | `openrouter/auto:online` | `https://openrouter.ai/api/v1/chat/completions` | **Web search** | ✅ Yes |
| **Gemini** | `gemini-1.5-flash` / `gemini-2.0-flash-exp` | `https://generativelanguage.googleapis.com/v1beta/models/` | Vision, reasoning, grounding | ✅ Yes |
| **OpenAI** | `gpt-4o-mini` | `https://api.openai.com/v1/chat/completions` | Strong reasoning | ❌ Paid |
| **HuggingFace** | `mistralai/Mistral-7B-Instruct-v0.3` | `https://api-inference.huggingface.co/models/` | Free tier | ✅ Yes |

### 1. Groq API

```typescript
// File: src/lib/ai.ts → callGroq()
POST https://api.groq.com/openai/v1/chat/completions
Headers:
  Authorization: Bearer ${GROQ_API_KEY}
  Content-Type: application/json
Body:
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.8,
  "max_tokens": 1500
}
```
- **Free tier**: Generous quota, no credit card
- **Signup**: https://console.groq.com
- **Best for**: Real-time chat, Arabic text, quick responses

### 2. OpenRouter API (Web Search)

```typescript
// File: src/lib/ai.ts → callOpenRouter()
POST https://openrouter.ai/api/v1/chat/completions
Headers:
  Authorization: Bearer ${OPENROUTER_API_KEY}
  HTTP-Referer: https://cirkle.app
  X-Title: CIRKLE Brain AI
  Content-Type: application/json
Body:
{
  "model": "openrouter/auto:online",    // :online enables web search!
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```
- **Free tier**: Yes, some models are free
- **Signup**: https://openrouter.ai
- **Best for**: Web search (news, flights, hotels, prices), real-time data
- **Key feature**: The `:online` suffix enables OpenRouter's built-in web-search
  plugin — the model sees fresh web results in its context before generating.

### 3. Gemini API

```typescript
// File: src/lib/ai.ts → callGemini()
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}
Headers:
  Content-Type: application/json
Body:
{
  "contents": [{ "parts": [{ "text": "..." }] }],
  "generationConfig": { "maxOutputTokens": 1500, "temperature": 0.7 }
}

// With Google Search grounding (used in news-service as Tier 2):
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}
Body:
{
  "contents": [{ "parts": [{ "text": "..." }] }],
  "tools": [{ "google_search_retrieval": {} }],   // ← grounding
  "generationConfig": { ... }
}
```
- **Free tier**: Yes
- **Signup**: https://aistudio.google.com
- **Best for**: Vision (images), reasoning, cultural context, web grounding

### 4. OpenAI API

```typescript
// File: src/lib/ai.ts → callOpenAI()
POST https://api.openai.com/v1/chat/completions
Headers:
  Authorization: Bearer ${OPENAI_API_KEY}
  Content-Type: application/json
Body:
{
  "model": "gpt-4o-mini",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.8,
  "max_tokens": 1500
}
```
- **Free tier**: No (paid only)
- **Signup**: https://platform.openai.com
- **Best for**: Complex reasoning, code generation, multi-step planning

### 5. HuggingFace API

```typescript
// File: src/lib/ai.ts → callHuggingFace()
POST https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3
Headers:
  Authorization: Bearer ${HUGGINGFACE_API_KEY}
  Content-Type: application/json
Body:
{
  "inputs": "<s>[INST] system prompt\n\nuser prompt [/INST]",
  "parameters": {
    "max_new_tokens": 1500,
    "temperature": 0.8,
    "return_full_text": false
  }
}
```
- **Free tier**: Yes
- **Signup**: https://huggingface.co/settings/tokens
- **Best for**: Fallback, bulk processing, free-tier experiments

### Provider Chain (How they're used together)

```typescript
// File: src/lib/ai.ts → aiComplete()
// Default chain (all called in parallel, first non-null wins):
[
  callGroq,         // fastest — tries first
  callOpenRouter,   // web-search-capable
  callGemini,       // vision + reasoning
  callOpenAI,       // strong reasoning
  callHuggingFace,  // fallback
]

// The brain-router.ts analyzes each query and may reorder:
// - Arabic queries → Groq first
// - Vision queries → Gemini first
// - Reasoning queries → OpenAI first
// - Real-time queries → Groq first
```

### Environment Configuration

```bash
# .env file
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=or_pat_...
GEMINI_API_KEY=AQ.Ab8...
OPENAI_API_KEY=sk-svcacct-...
HUGGINGFACE_API_KEY=hf_...
```

---

## How to Train Each Phase

### Summary Table

| Phase | Trains via | Training method | Auto-learns? |
|---|---|---|---|
| GCIE (1) | brain-source-learning | Feed place-search queries; source popularity auto-adjusts | ✅ Yes |
| PMB (2) | Direct API | Store memories with `personalMemoryBrain.store()` | Manual |
| CRIE (3) | LIEE proposals | LIEE detects `clarification-repeat` → proposes new keywords | ✅ Via LIEE |
| IRDE (4) | Feedback + LIEE | Feed `recordFeedback()`; LIEE proposes weight adjustments | ✅ Yes |
| Phase 4.5 | Capability Registry | Register capabilities via `globalCapabilityRegistry.register()` | Manual |
| UOB (5) | LIEE proposals | LIEE detects `frequent-workflow` → proposes new templates | ✅ Via LIEE |
| TEE (6) | LIEE (automatic) | Every execution auto-feeds LIEE | ✅ Yes (automatic) |
| **LIEE (7)** | **Direct API** | **Feed `globalFeedbackCollector.ingest()` → `globalLIEEEngine.learn()`** | ⭐ Main entry |
| CIE (8) | Knowledge graph | Update seed-data.ts or use CIE API | Manual |
| TGSE (9) | Policy engine | Update policies in policy-engine.ts | Manual |

### The Main Training Entry Point: LIEE

**To train the Brain, feed data into LIEE.** LIEE then propagates learned
improvements to all other phases through governed proposals.

```typescript
import {
  globalFeedbackCollector,
  globalLIEEEngine,
  globalProposalEngine,
} from "./src/lib/liee";

// ── Step 1: Feed feedback ─────────────────────────────────────────────
await globalFeedbackCollector.ingest({
  pipeline: "explicit",
  sourcePhase: "irde",
  userId: "user-123",
  targetType: "recommendation",
  targetEntityId: "rec-001",
  raw: { rating: 5, action: "accepted", context: "travel" },
  consentGranted: true,
});

// ── Step 2: Run learning pipeline ─────────────────────────────────────
const result = await globalLIEEEngine.learn({
  sharedContext: {
    request: { userId: "user-123" },
    user: { consentScope: ["ai_personalization"] },
  },
  detectPatterns: true,
  generateProposals: true,
  learningEnabled: true,
});

// ── Step 3: Review proposals ──────────────────────────────────────────
const pending = globalProposalEngine.getProposalsByStatus("proposed");
for (const proposal of pending) {
  console.log(`[${proposal.target}] ${proposal.title}`);
  console.log(`  Confidence: ${proposal.confidence}`);
  console.log(`  Reasoning: ${proposal.reasoning}`);

  // Approve high-confidence proposals
  if (proposal.confidence > 0.85) {
    await globalProposalEngine.approve(proposal.id, {
      reviewer: "trainer",
      notes: "Auto-approved (high confidence)",
    });
    await globalProposalEngine.deploy(proposal.id);
    console.log(`  → Deployed to ${proposal.target}`);
  }
}
```

---

## End-to-End Training Walkthrough

Here's the complete training flow using the included `scripts/train-brain.ts`:

```bash
# 1. Set up the Brain
bun install
cp .env.example .env    # add your 5 API keys
bunx prisma generate && bunx prisma db push

# 2. Seed initial capabilities
bun run scripts/seed-brain.ts
# → Registers 45+ capabilities in the Registry

# 3. Run the training script
bun run scripts/train-brain.ts
# → Feeds sample feedback into LIEE
# → Detects patterns
# → Generates proposals
# → Shows pending proposals for review

# 4. (Optional) Feed your own training data
# Edit scripts/train-brain.ts and replace SAMPLE_TRAINING_DATA
# with your historical user feedback data

# 5. Review proposals via the API
curl http://localhost:3000/api/liee/proposals?status=proposed

# 6. Approve a proposal
curl -X POST http://localhost:3000/api/liee/proposals/{id}/approve \
  -H "Content-Type: application/json" \
  -d '{"reviewer":"you","notes":"Approved"}'

# 7. Deploy the approved proposal
curl -X POST http://localhost:3000/api/liee/proposals/{id}/deploy
# → The improvement is now live in the Brain
```

### What happens after training?

When you deploy an approved proposal, LIEE auto-applies the change to the
target phase engine. For example:
- **IRDE weight proposal** → Updates the scoring weights in `irde-engine.ts`
  (runtime config, not source code)
- **CRIE keyword proposal** → Adds the keyword to CRIE's intent detection map
- **UOB template proposal** → Adds a new goal template to `goal-decomposition.ts`
- **TEE fallback proposal** → Updates the fallback strategy in `retry-manager.ts`
- **Provider Router proposal** → Adjusts provider priority in `brain-router.ts`

All changes are:
- **Runtime** (no restart needed)
- **Reversible** (rollback supported)
- **Auditable** (recorded in TGSE audit trail)
- **Consent-gated** (only if user has `ai_personalization` or `federated_learning` consent)

---

## Monitoring & Governance

### LIEE Status

```bash
curl http://localhost:3000/api/liee/status
```

```json
{
  "status": "operational",
  "totalSignals": 15423,
  "totalPatterns": 47,
  "totalProposals": 12,
  "pendingProposals": 3,
  "approvedProposals": 7,
  "deployedProposals": 5
}
```

### Brain Status

```bash
curl http://localhost:3000/api/brain/status
```

### TGSE Audit Trail

```bash
curl http://localhost:3000/api/tgse/audit
```

Every training action (feedback collection, pattern detection, proposal,
approval, deployment) is recorded in TGSE's immutable, cryptographically-chained
audit trail.

### Key Training Principles

1. **Consent-gated** — LIEE only collects feedback if the user has granted
   `ai_personalization` or `federated_learning` consent.
2. **Governed** — Proposals NEVER auto-deploy without approval.
3. **Reversible** — Every deployed proposal can be rolled back.
4. **Non-destructive** — Training updates runtime configuration, not source code.
5. **Auditable** — Every action is in TGSE's audit trail.
6. **On-device first** — User data never leaves the device for personal models.

---

## Summary

The CIRKLE Brain AI is trained through **LIEE (Phase 7)**:

1. **Feed feedback** into `globalFeedbackCollector.ingest()` (6 pipelines)
2. **Detect patterns** via `globalLIEEEngine.learn()` (9 pattern types)
3. **Generate proposals** (9 improvement targets)
4. **Review proposals** via `globalProposalEngine.getProposalsByStatus("proposed")`
5. **Approve + deploy** → improvements auto-apply to phase engines

The Brain also uses **5 AI providers** (Groq, OpenRouter, Gemini, OpenAI,
HuggingFace) for inference. Web search goes through OpenRouter's `:online` model.

**One Intelligence. Always Learning. Totally Governed.**

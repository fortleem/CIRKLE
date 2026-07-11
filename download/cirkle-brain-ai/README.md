# 🧠 CIRKLE Brain AI — Standalone Package

**The 9-phase cognitive operating system that powers the CIRKLE super app.**

This is the complete, self-contained CIRKLE Brain AI extracted from the CIRKLE
super-app codebase. It is a unified cognitive architecture — not a chatbot, not
a collection of agents — that orchestrates every intelligent experience through
9 specialized phases plus a shared cognitive foundation.

> **Status:** Production-ready v14.0 · **ZAI-free** · **5 AI providers** · **0 lint errors**

---

## 📦 What's Inside

```
cirkle-brain-ai/
├── src/
│   ├── lib/
│   │   ├── ai.ts                          # 5-provider chain (Groq/Gemini/OpenAI/HF/OpenRouter)
│   │   ├── ai-cache.ts                    # Response caching
│   │   ├── ai-feed.ts                     # AI-orchestrated feed generation
│   │   ├── ai-persistence.ts              # DB-backed AI state persistence
│   │   ├── cirkle-brain.ts                # Web search via OpenRouter (:online)
│   │   ├── circuit-breaker.ts             # Provider fail-over protection
│   │   ├── brain-router.ts                # Query-aware provider selection
│   │   ├── brain-orchestrator.ts          # Main orchestration entry point
│   │   ├── brain-reasoning.ts             # Multi-step reasoning engine
│   │   ├── brain-cross-evaluation.ts      # 5-provider consensus
│   │   ├── brain-memory.ts                # Working memory
│   │   ├── brain-federated.ts             # Federated learning coordination
│   │   ├── brain-proactive.ts             # Proactive suggestions
│   │   ├── brain-knowledge.ts             # Knowledge retrieval
│   │   ├── brain-source-learning.ts       # Source popularity learning
│   │   ├── brain-universal.ts             # Universal Brain entry
│   │   ├── brain-personalize.ts           # Prompt personalization
│   │   ├── personal-ai.ts                 # Per-user AI instance
│   │   ├── personal-memory-brain.ts       # PMB — Phase 2 (user intelligence)
│   │   ├── crie-engine.ts                 # Phase 3 — Context & Reasoning
│   │   ├── irde-engine.ts                 # Phase 4 — Recommendation & Decision
│   │   ├── location-intelligence.ts       # Phase 1 — GCIE (Geo-Context)
│   │   ├── cognitive/                     # Phase 4.5 — Shared Foundation (6 modules)
│   │   │   ├── shared-context.ts          #   11-section immutable context
│   │   │   ├── context-manager.ts         #   Lifecycle API (10 operations)
│   │   │   ├── capability-registry.ts     #   45+ registered capabilities
│   │   │   ├── capability-seed.ts         #   Seed data
│   │   │   ├── cognitive-pipeline.ts      #   Pipeline coordinator
│   │   │   └── index.ts                   #   Public API barrel
│   │   ├── uob/                           # Phase 5 — Universal Orchestration (12 modules)
│   │   │   ├── uob-engine.ts              #   16-stage planning pipeline
│   │   │   ├── goal-decomposition.ts      #   15 intent templates
│   │   │   ├── capability-discovery.ts    #   Dynamic registry queries
│   │   │   ├── dependency-resolution.ts   #   Transitive deps + cycle detection
│   │   │   ├── permission-planning.ts     #   5-layer permission model
│   │   │   ├── workflow-planning.ts       #   Ordered/parallel/conditional
│   │   │   ├── execution-graph.ts         #   Directed deterministic graph
│   │   │   ├── execution-plan.ts          #   Full plan assembly
│   │   │   ├── explainability.ts          #   3-level explanations
│   │   │   ├── heuristics.ts              #   10 ordering + 5 alt + 4 comp rules
│   │   │   ├── types.ts                   #   ExecutionPlan, PlanStep, Goal
│   │   │   └── index.ts
│   │   ├── tee/                           # Phase 6 — Trusted Execution (11 modules)
│   │   │   ├── tee-engine.ts              #   13-stage execution pipeline
│   │   │   ├── state-machine.ts           #   10-state runtime FSM
│   │   │   ├── capability-resolver.ts     #   Dynamic capability resolution
│   │   │   ├── capability-executors.ts    #   5 live + 37 simulated executors
│   │   │   ├── execution-scheduler.ts     #   invoke/track/sync
│   │   │   ├── execution-validator.ts     #   Pre-execution validation
│   │   │   ├── retry-manager.ts           #   6 retry strategies
│   │   │   ├── compensation-manager.ts    #   Rollback on failure
│   │   │   ├── audit-logger.ts            #   Immutable audit trail
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── liee/                          # Phase 7 — Learning & Evolution (9 modules) ⭐ TRAINING
│   │   │   ├── liee-engine.ts             #   7-stage learning pipeline
│   │   │   ├── feedback-collector.ts      #   6 feedback pipelines
│   │   │   ├── pattern-detector.ts        #   9 pattern types
│   │   │   ├── proposal-engine.ts         #   9 improvement targets
│   │   │   ├── evaluation.ts              #   Proposal scoring
│   │   │   ├── governance.ts              #   propose → review → approve → deploy
│   │   │   ├── auto-apply.ts              #   Apply approved proposals to engines
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── cie/                           # Phase 8 — Capability Intelligence (12 modules)
│   │   │   ├── cie-engine.ts              #   Ecosystem knowledge engine
│   │   │   ├── country-intelligence.ts    #   6 countries + 246 in KG
│   │   │   ├── government-intelligence.ts #   8 gov services (NIDA, Absher, ICP...)
│   │   │   ├── partner-intelligence.ts    #   12 partners (Visa, Stripe, OpenAI...)
│   │   │   ├── enterprise-intelligence.ts #   6 enterprise (SAP, Salesforce...)
│   │   │   ├── knowledge-graph.ts         #   32 nodes, 8 edges
│   │   │   ├── capability-ontology.ts     #   12 ontology nodes
│   │   │   ├── discovery-service.ts       #   Capability discovery
│   │   │   ├── versioning.ts              #   Capability version tracking
│   │   │   ├── seed-data.ts               #   Seed data
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── tgse/                          # Phase 9 — Trust, Governance & Safety (12 modules)
│   │   │   ├── tgse-engine.ts             #   9-stage validation pipeline
│   │   │   ├── policy-engine.ts           #   10 policies across 8 domains
│   │   │   ├── trust-engine.ts            #   10 trust-scored entities
│   │   │   ├── risk-engine.ts             #   7 risk types, 5 levels
│   │   │   ├── compliance-engine.ts       #   4 profiles (GDPR, PCI-DSS, CBE, ZATCA)
│   │   │   ├── ai-safety.ts               #   8 AI safety checks
│   │   │   ├── audit-engine.ts            #   Cryptographically-chained audit
│   │   │   ├── approval-framework.ts      #   Human approval workflows
│   │   │   ├── explainability.ts          #   Decision explanations
│   │   │   ├── types.ts
│   │   │   ├── seed-data.ts
│   │   │   └── index.ts
│   │   ├── pcpf/                          # Platform Capability Pack Framework (10 modules)
│   │   ├── ahg/                           # Account Health Guardian (5 modules)
│   │   ├── consent.ts                     # 8-purpose consent management
│   │   ├── rate-limit.ts                  # Distributed rate limiting
│   │   ├── monitoring.ts                  # Observability
│   │   ├── logger.ts                      # Structured logging
│   │   ├── crypto.ts                      # Encryption utilities
│   │   ├── identity.ts                    # Identity management
│   │   ├── data-residency.ts              # Regional data planes
│   │   ├── regions.ts                     # Region configuration
│   │   ├── countries.ts                   # 246-country knowledge base
│   │   ├── egypt-knowledge.ts             # Egypt-specific knowledge
│   │   ├── tenant-context.ts              # Multi-tenant isolation
│   │   ├── db.ts, db-init.ts, db-safe.ts, db-regional.ts  # Database layer
│   │   ├── validation.ts                  # Input validation
│   │   ├── env.ts                         # Environment config
│   │   ├── tabs.ts, auth-store.ts         # State management
│   │   └── ...
│   ├── app/api/                           # 40+ API routes
│   │   ├── brain/                         # Cross-evaluate, status, reasoning
│   │   ├── cognitive/                     # Context lifecycle, capabilities
│   │   ├── uob/                           # Plan generation
│   │   ├── tee/                           # Execution
│   │   ├── liee/                          # Feedback, patterns, proposals
│   │   ├── cie/                           # Discovery, graph, countries
│   │   ├── tgse/                          # Validation, audit, approvals
│   │   ├── pcpf/                          # Packs, install
│   │   ├── account/                       # AHG diagnose, propose-fix, consent-fix
│   │   ├── ai/                            # Summarize, translate, smart-reply, itinerary
│   │   └── orchestrator/                  # Main orchestration endpoint
│   └── hooks/                             # React hooks for Brain integration
│       ├── use-brain-insight.ts           # Real-time Brain insights
│       ├── use-brain-learning.ts          # Learning state
│       ├── use-personal-ai.ts             # Personal AI instance
│       └── ...
├── prisma/
│   └── schema.prisma                      # 53 database models
├── mini-services/                         # Real-time services
│   ├── chat-service/                      # Socket.io chat (port 3003)
│   ├── news-service/                      # News via OpenRouter web search (port 3004)
│   └── ai-realtime/                       # AI progress streaming (port 3001)
├── docs/
│   ├── phase-4.5-architecture.md          # Shared cognitive foundation spec
│   ├── phase-5-uob-specification.md       # UOB 16-stage spec
│   ├── phase-4.5-migration-guide.md       # Migration guide
│   └── TRAINING.md                        # ⭐ How to train/fine-tune the Brain
├── scripts/
│   └── seed-brain.ts                      # Seed the Brain with initial data
├── .env.example                           # 5 API provider keys template
├── package.json                           # Dependencies
└── README.md                              # This file
```

---

## 🏗️ The 9-Phase Cognitive Architecture

The CIRKLE Brain AI is **one unified intelligence** with 9 specialized phases.
Each phase has a single constitutional owner. The cognitive pipeline flows:

```
User Goal
   ↓
GCIE (Phase 1) — Understand the world (places, events, weather, traffic)
   ↓
PMB  (Phase 2) — Understand the user (memory, preferences, goals, identity)
   ↓
CRIE (Phase 3) — Reason about intent (15 intent types, 5 decision types)
   ↓
IRDE (Phase 4) — Decide best option (12+ scoring factors, 6 domains)
   ↓
Phase 4.5 — Shared Cognitive Foundation (Context Manager + Capability Registry)
   ↓
UOB  (Phase 5) — Plan execution (16-stage pipeline, ExecutionGraph)
   ↓
TEE  (Phase 6) — Execute plan safely (13-stage pipeline, 10-state FSM)
   ↓
LIEE (Phase 7) — Learn from outcome (7-stage pipeline, 9 pattern types) ⭐
   ↓
TGSE (Phase 9) — Governs + validates + audits EVERY stage (9-stage validation)
   ↓
CIE  (Phase 8) — Supplies ecosystem knowledge (246 countries, 1766 payment methods)
```

### Key principle
**Intelligence Before Execution.** The Brain always understands context and
reasons about intent BEFORE taking action. It never executes without a plan,
and every plan is governance-validated before execution.

---

## 🤖 The 5 AI Providers (ZAI removed)

The Brain uses 5 AI providers in a priority chain. All web search goes through
OpenRouter's `:online` model suffix (live web data, no ZAI, no Webz.io).

| Provider | Model | Strength | Use Case |
|---|---|---|---|
| **Groq** | `llama-3.3-70b-versatile` | Speed (500ms), Arabic | Real-time chat, quick responses |
| **OpenRouter** | `openrouter/auto:online` | **Web search** | News, flights, hotels, price trends |
| **Gemini** | `gemini-1.5-flash` / `gemini-2.0-flash-exp` | Vision, reasoning, grounding | Multimodal, cultural context |
| **OpenAI** | `gpt-4o-mini` | Strong reasoning | Complex planning, code |
| **HuggingFace** | `Mistral-7B-Instruct-v0.3` | Free tier | Fallback, bulk processing |

The `brain-router.ts` analyzes each query (complexity, capabilities, privacy,
latency) and routes to the best provider. All providers are called in parallel;
the first non-null response wins.

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
cd cirkle-brain-ai
bun install                    # or npm install
```

### 2. Configure AI providers

```bash
cp .env.example .env
# Edit .env and add your 5 API keys:
#   GROQ_API_KEY=          (free tier: https://console.groq.com)
#   OPENROUTER_API_KEY=    (free tier: https://openrouter.ai)
#   GEMINI_API_KEY=        (free tier: https://aistudio.google.com)
#   OPENAI_API_KEY=        (paid: https://platform.openai.com)
#   HUGGINGFACE_API_KEY=   (free tier: https://huggingface.co/settings/tokens)
```

### 3. Set up the database

```bash
# The Brain uses SQLite via Prisma (zero-config)
bunx prisma generate
bunx prisma db push
```

### 4. Start the Brain

```bash
# Option A: Use as a library
import { askBrain } from "./src/lib/brain-orchestrator";
const answer = await askBrain("Plan a 3-day trip to Cairo", { userId: "user1" });

# Option B: Start the API server (if integrating the routes)
bun run dev    # starts Next.js on port 3000

# Option C: Start the mini-services
cd mini-services/chat-service && bun run dev    # port 3003
cd mini-services/news-service && bun run dev    # port 3004
cd mini-services/ai-realtime && bun run dev     # port 3001
```

### 5. Verify

```bash
curl http://localhost:3000/api/brain/status
# → { "status": "ok", "providers": ["groq","openrouter","gemini","openai","huggingface"] }
```

---

## 🎓 Training the Brain

**See [`docs/TRAINING.md`](docs/TRAINING.md) for the complete training guide.**

The Brain "trains" through **LIEE (Phase 7 — Learning & Intelligence Evolution Engine)**.
LIEE is not a neural network you backprop through. It is a **closed-loop learning
pipeline** that:

1. **Collects feedback** from 6 pipelines (explicit, implicit, behavioral,
   operational, execution, satisfaction)
2. **Detects patterns** (9 types: frequent-workflow, common-failure,
   high-performing-strategy, usage-trend, etc.)
3. **Generates proposals** for improving the other phases (CRIE keywords,
   IRDE weights, UOB templates, TEE fallbacks, etc.)
4. **Governs proposals** through a human-in-the-loop approval workflow
5. **Auto-applies approved proposals** to the phase engines (reversible)

### Quick training example

```typescript
import { globalLIEEEngine } from "./src/lib/liee";

// Feed a user's feedback into LIEE
await globalLIEEEngine.collectFeedback({
  pipeline: "explicit",
  userId: "user-123",
  signal: { rating: 5, context: "travel recommendation", action: "accepted" },
  timestamp: new Date().toISOString(),
});

// Detect patterns from accumulated feedback
const patterns = await globalLIEEEngine.detectPatterns({ userId: "user-123" });

// Generate improvement proposals
const proposals = await globalLIEEEngine.generateProposals(patterns);

// Proposals go through governance review → approval → auto-apply
// Approved proposals update IRDE weights, CRIE keywords, UOB templates, etc.
```

---

## 📊 Architecture Stats

| Metric | Count |
|---|---|
| AI Phases | 9 + Phase 4.5 Shared Cognitive Foundation |
| Lib Modules | 162 TypeScript files |
| API Routes | 40+ Brain-specific routes |
| Prisma Models | 53 |
| Registered Capabilities | 45+ (37 seeded + 8 from PCPF) |
| Cognitive Maturity Levels | 7 (all achieved) |
| Constitutional Principles | 20 |
| AI Safety Checks | 8 |
| Risk Types | 7 (with 5 levels each) |
| Compliance Profiles | 4 (GDPR, PCI-DSS, CBE, ZATCA) |
| Trust-Scored Entities | 10 |
| Feedback Pipelines | 6 |
| Pattern Types | 9 |
| LLM Providers | 5 (Groq, OpenRouter, Gemini, OpenAI, HuggingFace) |
| Countries in Knowledge Graph | 246 |
| Payment Methods Tracked | 1766 |
| News Sources | 1200 |
| Government Services | 8 (NIDA, Absher, ICP, IRS, ZATCA, FTA, Customs) |
| Enterprise Integrations | 6 (SAP, Salesforce, Workday, QuickBooks, Okta, Slack) |

---

## 🔗 Key Entry Points

| What | Where |
|---|---|
| Main orchestration | `src/lib/brain-orchestrator.ts` → `askBrain()` |
| Universal Brain | `src/lib/brain-universal.ts` → `universalBrain()` |
| Cross-evaluation (5-provider consensus) | `src/lib/brain-cross-evaluation.ts` |
| Provider chain | `src/lib/ai.ts` → `aiComplete()` |
| Web search | `src/lib/cirkle-brain.ts` → `searchNews()`, `searchFlights()` |
| Query routing | `src/lib/brain-router.ts` → `getProviderPriority()` |
| Personal memory | `src/lib/personal-memory-brain.ts` |
| Learning (training) | `src/lib/liee/liee-engine.ts` → `globalLIEEEngine` |
| Governance | `src/lib/tgse/tgse-engine.ts` → `globalTGSEEngine` |
| Orchestration planning | `src/lib/uob/uob-engine.ts` → `globalUOBEngine` |
| Execution | `src/lib/tee/tee-engine.ts` → `globalTEEEngine` |

---

## 📜 License

Apache 2.0 — Same as the CIRKLE platform. Open source, free forever.

---

## 🆘 Support

- **Blueprint:** See the full CIRKLE BLUEPRINT v14.0 for the complete specification
- **Training guide:** [`docs/TRAINING.md`](docs/TRAINING.md)
- **Architecture docs:** [`docs/`](docs/)

---

**CIRKLE Brain AI — One Intelligence. Many Capabilities. Total Governance.**

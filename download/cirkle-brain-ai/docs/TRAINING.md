# 🎓 Training the CIRKLE Brain AI

This guide explains how to "train" the CIRKLE Brain AI. The Brain is **not a
single neural network** — it is a cognitive architecture with 9 phases. Training
happens through **LIEE (Phase 7 — Learning & Intelligence Evolution Engine)**,
which is a closed-loop learning pipeline, plus optional fine-tuning of the
on-device models referenced in the blueprint.

---

## Table of Contents
1. [How the Brain Learns (LIEE)](#1-how-the-brain-learns-liee)
2. [Feeding Data into LIEE](#2-feeding-data-into-liee)
3. [Pattern Detection](#3-pattern-detection)
4. [Proposal Generation & Governance](#4-proposal-generation--governance)
5. [Auto-Apply to Phase Engines](#5-auto-apply-to-phase-engines)
6. [Fine-Tuning On-Device Models](#6-fine-tuning-on-device-models)
7. [Federated Learning](#7-federated-learning)
8. [Training End-to-End Example](#8-training-end-to-end-example)
9. [Monitoring Training Progress](#9-monitoring-training-progress)

---

## 1. How the Brain Learns (LIEE)

LIEE is Phase 7 of the cognitive architecture. It closes the learning loop:
every execution outcome (from TEE) feeds back into LIEE, which detects patterns
and proposes governed improvements to the other phases.

### The 7-Stage Learning Pipeline

```
Stage 1: Feedback Collection (6 pipelines)
   ↓
Stage 2: Signal Normalization (0-1 scoring)
   ↓
Stage 3: Pattern Detection (9 pattern types)
   ↓
Stage 4: Proposal Generation (9 improvement targets)
   ↓
Stage 5: Proposal Evaluation (scoring + ranking)
   ↓
Stage 6: Governance (propose → review → approve/reject → deploy → rollback)
   ↓
Stage 7: Shared Context Update
```

### The 6 Feedback Pipelines

| Pipeline | Source | Normalization |
|---|---|---|
| **Explicit** | User ratings (1-5 stars) | `rating / 5` → 0-1 score |
| **Implicit** | Accept/reject/ignore | accept=1.0, ignore=0.5, reject=0.0 |
| **Behavioral** | Dwell time + clicks | Engagement score 0-1 |
| **Operational** | Latency + error rate | Performance score 0-1 |
| **Execution** | TEE outcomes | completed=1.0, failed=0.0 |
| **Satisfaction** | Post-interaction score | `score / 5` → 0-1 |

Every TEE execution automatically feeds LIEE's Execution + Operational pipelines
(wired in `tee-engine.ts` Stage 11a). The learning loop is **closed by default**.

---

## 2. Feeding Data into LIEE

### Method A: Programmatic feedback (recommended for training)

```typescript
import { globalLIEEEngine } from "./src/lib/liee";

// Feed explicit user feedback
await globalLIEEEngine.collectFeedback({
  pipeline: "explicit",
  userId: "user-123",
  signal: {
    rating: 5,
    context: "travel recommendation to Cairo",
    action: "accepted",
    itemId: "rec-001",
  },
  timestamp: new Date().toISOString(),
});

// Feed implicit feedback (user accepted a recommendation)
await globalLIEEEngine.collectFeedback({
  pipeline: "implicit",
  userId: "user-123",
  signal: { action: "accepted", context: "restaurant suggestion" },
  timestamp: new Date().toISOString(),
});

// Feed behavioral feedback (how long user engaged)
await globalLIEEEngine.collectFeedback({
  pipeline: "behavioral",
  userId: "user-123",
  signal: { dwellTimeMs: 45000, clicks: 3, context: "news article" },
  timestamp: new Date().toISOString(),
});

// Feed execution feedback (TEE outcome — usually automatic)
await globalLIEEEngine.collectFeedback({
  pipeline: "execution",
  userId: "user-123",
  signal: {
    executionId: "exec-001",
    state: "completed",
    stepsSucceeded: 5,
    stepsFailed: 0,
    durationMs: 3200,
  },
  timestamp: new Date().toISOString(),
});
```

### Method B: Bulk training data import

Create a training data file and feed it in a loop:

```typescript
// scripts/train-brain.ts
import { globalLIEEEngine } from "../src/lib/liee";
import trainingData from "./training-data.json";

async function train() {
  console.log(`Training Brain with ${trainingData.length} samples...`);

  for (const sample of trainingData) {
    await globalLIEEEngine.collectFeedback({
      pipeline: sample.pipeline,        // "explicit" | "implicit" | "behavioral" | ...
      userId: sample.userId,
      signal: sample.signal,
      timestamp: sample.timestamp,
    });
  }

  console.log("Training data ingested. Now detecting patterns...");
  const patterns = await globalLIEEEngine.detectPatterns({});
  console.log(`Detected ${patterns.length} patterns.`);

  const proposals = await globalLIEEEngine.generateProposals(patterns);
  console.log(`Generated ${proposals.length} improvement proposals.`);
}

train().catch(console.error);
```

### Method C: Via the API

```bash
# Feed feedback via the LIEE API
curl -X POST http://localhost:3000/api/liee/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline": "explicit",
    "userId": "user-123",
    "signal": { "rating": 5, "context": "travel", "action": "accepted" }
  }'

# Check detected patterns
curl http://localhost:3000/api/liee/patterns

# Check generated proposals
curl http://localhost:3000/api/liee/proposals
```

---

## 3. Pattern Detection

LIEE detects **9 pattern types** from accumulated feedback:

| Pattern Type | What It Detects | Example |
|---|---|---|
| `frequent-workflow` | Repeated user workflows | "User always books flights on Tuesdays" |
| `common-failure` | Recurring failures | "Hotel search fails in Egypt 30% of the time" |
| `clarification-repeat` | Same clarification asked repeatedly | "Users keep asking 'visa-free?'" → CRIE keyword gap |
| `high-performing-strategy` | Strategies with high success rate | "Groq + Gemini chain works best for Arabic" |
| `usage-trend` | Rising/declining feature usage | "News usage up 40% in Saudi Arabia" |
| `capability-adoption` | Which capabilities users adopt | "pay.split-bill adoption rising" |
| `preference-evolution` | Changing user preferences | "User shifted from budget to luxury hotels" |
| `latency-pattern` | Slow operations | "CIE graph traversal >2s when depth>5" |
| `provider-performance` | AI provider reliability | "OpenRouter 99% uptime, HuggingFace 85%" |

### Triggering pattern detection

```typescript
import { globalLIEEEngine } from "./src/lib/liee";

// Detect patterns for all users
const allPatterns = await globalLIEEEngine.detectPatterns({});

// Detect patterns for a specific user
const userPatterns = await globalLIEEEngine.detectPatterns({ userId: "user-123" });

// Filter by pattern type
const failures = await globalLIEEEngine.detectPatterns({ type: "common-failure" });
```

---

## 4. Proposal Generation & Governance

When LIEE detects a pattern, it generates a **proposal** to improve one of the
phase engines. Proposals are governed through a human-in-the-loop workflow.

### The 9 Proposal Targets

| Target | What Gets Improved | Example Proposal |
|---|---|---|
| `CRIE` | Intent keywords, clarification rules | "Add 'visa-free' as a travel intent keyword" |
| `IRDE` | Scoring weights, domain configs | "Increase 'distance' weight for restaurant recs" |
| `UOB` | Goal templates, workflow rules | "Add Tuesday-flight-booking template" |
| `TEE` | Fallback strategies, retry rules | "Use Gemini as fallback when Groq fails for Arabic" |
| `Capability Registry` | Capability priorities | "Promote pay.split-bill in suggestions" |
| `Provider Router` | Provider demotion/promotion | "Demote HuggingFace for vision queries" |
| `CIE` | Knowledge graph updates | "Add 'Fawry' as payment method in Egypt" |
| `TGSE` | Policy updates | "Relax rate-limit for trusted users" |
| `PMB` | Memory retention rules | "Extend memory TTL for travel preferences" |

### Governance lifecycle

```
proposed → under-review → approved/rejected → deployed → rolled-back (if needed)
```

**LIEE NEVER automatically applies proposals.** Human approval is enforced.

```typescript
import { globalLIEEEngine } from "./src/lib/liee";

// Get pending proposals
const pending = await globalLIEEEngine.getProposals({ status: "proposed" });

// Review a proposal
const proposal = pending[0];
console.log(`Proposal: ${proposal.title}`);
console.log(`Target: ${proposal.target}`);
console.log(`Confidence: ${proposal.confidence}`);
console.log(`Reasoning: ${proposal.reasoning}`);

// Approve and deploy
await globalLIEEEngine.approveProposal(proposal.id, {
  reviewer: "cto@cirkle.app",
  notes: "Looks good — deploy to staging",
});

// Or reject
await globalLIEEEngine.rejectProposal(proposal.id, {
  reviewer: "cto@cirkle.app",
  reason: "Need more data before deploying",
});
```

---

## 5. Auto-Apply to Phase Engines

When a proposal is approved, LIEE can **auto-apply** it to the target phase
engine. This is reversible — every auto-apply records a rollback point.

```typescript
import { globalLIEEEngine } from "./src/lib/liee";

// After approval, deploy the proposal
await globalLIEEEngine.deployProposal(proposal.id);

// LIEE applies the change to the target engine:
// - CRIE proposals → updates keyword maps in crie-engine.ts
// - IRDE proposals → updates scoring weights in irde-engine.ts
// - UOB proposals → updates goal templates in uob/goal-decomposition.ts
// - TEE proposals → updates fallback strategies in tee/retry-manager.ts
// - Provider Router → updates provider priority in brain-router.ts
// - etc.

// If something breaks, rollback
await globalLIEEEngine.rollbackProposal(proposal.id);
```

### What auto-apply actually changes

Auto-apply modifies **runtime configuration** (in-memory + DB-persisted), not
source code. For example:
- IRDE weight changes update a DB row that `irde-engine.ts` reads at runtime
- CRIE keyword additions update an in-memory map that `crie-engine.ts` consults
- UOB template additions update the `goal-decomposition.ts` template registry

This means you can train the Brain **without restarting** — changes take effect
immediately and are reversible.

---

## 6. Fine-Tuning On-Device Models

The blueprint (Chapter 35) specifies several on-device models that CAN be
fine-tuned locally. These are separate from the LLM providers (Groq/Gemini/etc.)
and run entirely on the user's device.

### On-Device Training Tasks

| Task | Model Architecture | Training Data | Update Frequency |
|---|---|---|---|
| **Recommendations (feed)** | Matrix factorization (user vector 64 dim) | Likes, shares, watch time, RSVPs | Weekly (idle + charging) |
| **Smart replies** | DistilGPT-2 (fine-tuned) | User's own chat responses | Daily (small batch) |
| **Spam filter** | Logistic regression with TF-IDF | Reported messages, marked spam | Real-time (online learning) |
| **Travel preferences** | LightGBM (small tree ensemble) | Bookings, searches, price clicks | Monthly |
| **Search ranking** | RankNet (pairwise) | Click-through data | Weekly |

### Fine-tuning smart replies (example)

```typescript
// The blueprint specifies DistilGPT-2 for smart replies.
// To fine-tune it on a user's chat history:

import { PersonalAI } from "./src/lib/personal-ai";

const personalAI = new PersonalAI({ userId: "user-123" });

// Collect the user's chat responses as training data
const trainingData = await personalAI.collectChatResponses({
  minResponses: 50,          // need at least 50 responses
  excludeGroupChats: true,   // focus on 1:1 conversations
});

// Fine-tune the on-device DistilGPT-2 (runs locally, no data leaves device)
if (trainingData.length >= 50) {
  await personalAI.fineTuneSmartReplyModel(trainingData);
  console.log("Smart reply model fine-tuned for user-123");
}

// The fine-tuned model is used for future smart-reply suggestions
const suggestions = await personalAI.generateSmartReplies("See you tomorrow!");
```

### Federated learning (optional)

Users can opt into federated learning to improve global models without sharing
raw data:

```typescript
import { BrainFederated } from "./src/lib/brain-federated";

const federated = new BrainFederated();

// User opts in (consent required)
await federated.optIn({
  userId: "user-123",
  models: ["smart-reply", "spam-filter"],
});

// The federated coordinator:
// 1. Trains locally on device
// 2. Computes gradient update (change in weights)
// 3. Encrypts the gradient update
// 4. Sends encrypted update to federation server
// 5. Server aggregates updates (FedAvg)
// 6. Distributes global model to all devices
```

---

## 7. Federated Learning

The `brain-federated.ts` module coordinates federated learning across devices.

```typescript
import { BrainFederated } from "./src/lib/brain-federated";

const federated = new BrainFederated();

// Start a federated training round
await federated.startRound({
  model: "smart-reply",
  minParticipants: 100,
  rounds: 10,
  learningRate: 0.001,
});

// Monitor round progress
const status = await federated.getRoundStatus();
console.log(`Round ${status.round}: ${status.participants} participants,
  ${status.updatesReceived} updates received,
  accuracy: ${status.globalAccuracy}`);
```

---

## 8. Training End-to-End Example

Here's a complete training script that:
1. Feeds historical user feedback into LIEE
2. Detects patterns
3. Generates proposals
4. Auto-approves high-confidence proposals
5. Deploys them

```typescript
// scripts/train-brain.ts
import { globalLIEEEngine } from "../src/lib/liee";
import { globalIRDEEngine } from "../src/lib/irde-engine";
import { globalCRIEEngine } from "../src/lib/crie-engine";
import historicalData from "./historical-feedback.json";

async function trainBrain() {
  console.log("=== CIRKLE Brain AI Training ===");
  console.log(`Loading ${historicalData.length} feedback samples...`);

  // ── Stage 1: Feed all historical feedback ──────────────────────────
  for (const sample of historicalData) {
    await globalLIEEEngine.collectFeedback({
      pipeline: sample.pipeline,
      userId: sample.userId,
      signal: sample.signal,
      timestamp: sample.timestamp,
    });
  }
  console.log(`✓ Fed ${historicalData.length} samples into LIEE`);

  // ── Stage 2: Detect patterns ───────────────────────────────────────
  const patterns = await globalLIEEEngine.detectPatterns({});
  console.log(`✓ Detected ${patterns.length} patterns:`);
  patterns.forEach(p => console.log(`   - [${p.type}] ${p.description} (confidence: ${p.confidence})`));

  // ── Stage 3: Generate proposals ────────────────────────────────────
  const proposals = await globalLIEEEngine.generateProposals(patterns);
  console.log(`✓ Generated ${proposals.length} improvement proposals:`);
  proposals.forEach(p => console.log(`   - [${p.target}] ${p.title} (confidence: ${p.confidence})`));

  // ── Stage 4: Auto-approve high-confidence proposals ────────────────
  const HIGH_CONFIDENCE_THRESHOLD = 0.85;
  for (const proposal of proposals) {
    if (proposal.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
      console.log(`✓ Auto-approving: ${proposal.title}`);
      await globalLIEEEngine.approveProposal(proposal.id, {
        reviewer: "auto-trainer",
        notes: `Auto-approved (confidence ${proposal.confidence} >= ${HIGH_CONFIDENCE_THRESHOLD})`,
      });
      await globalLIEEEngine.deployProposal(proposal.id);
      console.log(`  → Deployed to ${proposal.target}`);
    } else {
      console.log(`⊘ Skipping (confidence ${proposal.confidence} < ${HIGH_CONFIDENCE_THRESHOLD}): ${proposal.title}`);
    }
  }

  // ── Stage 5: Verify the Brain learned ──────────────────────────────
  const lieeStatus = await globalLIEEEngine.status();
  console.log("\n=== Training Complete ===");
  console.log(`Total feedback signals: ${lieeStatus.totalSignals}`);
  console.log(`Patterns detected: ${lieeStatus.totalPatterns}`);
  console.log(`Proposals generated: ${lieeStatus.totalProposals}`);
  console.log(`Proposals deployed: ${lieeStatus.totalDeployed}`);
  console.log(`IRDE weights updated: ${await globalIRDEEngine.getWeightCount()}`);
  console.log(`CRIE keywords updated: ${await globalCRIEEngine.getKeywordCount()}`);
}

trainBrain().catch(console.error);
```

Run it:

```bash
bun run scripts/train-brain.ts
```

---

## 9. Monitoring Training Progress

### LIEE Status API

```bash
curl http://localhost:3000/api/liee/status
```

```json
{
  "status": "ok",
  "totalSignals": 15423,
  "totalPatterns": 47,
  "totalProposals": 12,
  "pendingProposals": 3,
  "approvedProposals": 7,
  "deployedProposals": 5,
  "rolledBackProposals": 1,
  "autoApplyEnabled": true,
  "pipelines": {
    "explicit": 3200,
    "implicit": 5400,
    "behavioral": 4200,
    "operational": 1800,
    "execution": 723,
    "satisfaction": 100
  }
}
```

### View detected patterns

```bash
curl http://localhost:3000/api/liee/patterns
```

### View pending proposals

```bash
curl http://localhost:3000/api/liee/proposals?status=proposed
```

### Approve a proposal

```bash
curl -X POST http://localhost:3000/api/liee/proposals/proposal-123/approve \
  -H "Content-Type: application/json" \
  -d '{ "reviewer": "cto@cirkle.app", "notes": "Approved" }'
```

---

## Key Training Principles

1. **Consent-gated** — LIEE only collects feedback if the user has granted
   `ai_personalization` or `federated_learning` consent (checked via `consent.ts`).

2. **Governed** — Proposals NEVER auto-deploy without approval (unless you
   explicitly configure auto-approval with a high-confidence threshold).

3. **Reversible** — Every deployed proposal can be rolled back. LIEE records
   the previous state before applying any change.

4. **Non-destructive** — Training updates runtime configuration, not source
   code. The original phase engines remain intact.

5. **Auditable** — Every training action (feedback collection, pattern
   detection, proposal, approval, deployment) is recorded in TGSE's audit
   trail (`audit-engine.ts`).

6. **On-device first** — User data never leaves the device for personal
   models. Federated learning sends only encrypted gradient updates.

---

## Summary

The CIRKLE Brain AI is "trained" through:
1. **LIEE** — Feed feedback → detect patterns → generate proposals → approve → deploy
2. **On-device fine-tuning** — Fine-tune DistilGPT-2, matrix factorization, etc. locally
3. **Federated learning** — Optional, consent-gated, encrypted gradient sharing

The Brain is designed to **learn continuously from production traffic** without
manual retraining. Every user interaction makes it smarter — safely, governed,
and reversibly.

**One Intelligence. Always Learning. Totally Governed.**

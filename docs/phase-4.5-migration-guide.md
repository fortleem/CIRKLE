# Phase 4.5 Migration Guide

**Goal:** Confirm that Phase 4.5 (Shared Cognitive Foundation) introduces **zero breaking changes** and existing code continues to work unchanged.

---

## 1. What Changed

### Added (new — additive only)
- `src/lib/cognitive/` — 6 new files (Context Manager, Capability Registry, Shared Context schema, seed, pipeline, barrel)
- `src/app/api/cognitive/` — 3 new API routes (status, capabilities, context)
- `docs/phase-4.5-architecture.md` — architecture documentation

### Modified
- **Nothing.** No existing file was modified. Zero.

### Removed
- **Nothing.**

---

## 2. Backward Compatibility Verification

All pre-existing entry points were smoke-tested AFTER the Phase 4.5 addition and remain fully operational:

| Endpoint / Surface | Before Phase 4.5 | After Phase 4.5 | Status |
|---|---|---|---|
| `GET /` (home screen) | 200 | 200 | Unchanged |
| `POST /api/recommend` (IRDE) | 200 | 200 | Unchanged |
| `GET /api/brain/status` | 200 | 200 | Unchanged |
| `POST /api/ai-ask` (Wasl chat) | 200 | 200 | Unchanged |
| `POST /api/flights/search` | 200 | 200 | Unchanged |
| `GET /api/news` | 200 | 200 | Unchanged |

**Lint:** 0 errors (4 pre-existing warnings in unrelated overlay files, untouched by this phase).

---

## 3. What Existing Code Does NOT Need To Do

- Existing phases (GCIE, PMB, CRIE, IRDE) do **not** need to call the Context Manager. Their public APIs are unchanged.
- Existing screens and overlays do **not** need to use the Capability Registry. They keep working as-is.
- Existing `askBrain()` entry points (orchestrator + universal) do **not** need to migrate. They remain the primary path today.

**Phase 4.5 is purely additive.** Nothing is deprecated. Nothing is removed.

---

## 4. What New Code SHOULD Do (Forward-Looking)

New features that want to participate in the Shared Context flow SHOULD prefer the Context Manager:

### 4.1 For new orchestration / cross-phase workflows

```typescript
import { globalContextManager, runCognitivePipeline } from "@/lib/cognitive";

// Option A: full pipeline (recommended for new context-first flows)
const result = await runCognitivePipeline({
  query: "recommend a coffee shop",
  lat: 30.04, lng: 31.24, city: "Cairo", country: "EG",
  candidates: [...],
});

// Option B: manual lifecycle (for fine-grained control)
let ctx = globalContextManager.create({ request, language: "en" });
ctx = globalContextManager.enrich(ctx, "geographic", geoData, "gcie", { reason: "..." });
ctx = globalContextManager.freeze(ctx);
```

### 4.2 For capability discovery (so UOB can reason over your feature)

```typescript
import { globalCapabilityRegistry } from "@/lib/cognitive";

// Register a new capability when you add a platform feature
globalCapabilityRegistry.register({
  id: "myfeature.do-thing",
  name: "Do Thing",
  description: "Does a thing",
  category: "utilities",
  ownerModule: "myfeature",
  contract: { input: { x: { type: "string", required: true } }, output: { result: { type: "string" } } },
  permissions: ["myfeature:write"],
  dependencies: [],
  availability: "available",
  status: "active",
  version: "1.0.0",
  tags: ["thing"],
});
```

### 4.3 Ownership rules (CRITICAL)

When enriching a Shared Context, you MUST claim the correct owner:

| Section | Claimed owner |
|---|---|
| `geographic` | `"gcie"` |
| `user` | `"pmb"` |
| `reasoning` | `"crie"` |
| `validation` | `"cross-eval"` |
| `recommendation` | `"irde"` |
| `platform` | `"uob"` (reserved) |
| `request` / `session` / `metadata` | `"system"` (Context Manager only) |

Claiming the wrong owner throws an ownership-violation error (HTTP 422). This is by design — it enforces Single Ownership (Ch.2 §2.6).

---

## 5. Migration Path for Future Phases

### Phase 5 (UOB)
UOB will:
1. Be formally designated as the orchestration phase.
2. Replace the lightweight `runCognitivePipeline()` with a full platform-aware orchestrator.
3. Consume the Capability Registry to reason over what the platform can do.
4. Enrich the reserved `platform` section of the Shared Context.
5. Bind the existing feature-specific pipelines (chat, recommend, cross-eval) into the mandatory single lifecycle (Ch.4 §4.4).

UOB does NOT need to redesign any existing phase — the Shared Context contract is already in place.

### Phase 6 (Execution Engine)
Will enrich the reserved `execution` section. The Context Manager's `freeze()` + `serialize()` already support handing a frozen context to an executor.

### Phase 7 (Learning Architecture)
Will enrich the reserved `learning` section. The provenance trail (already recorded) is the raw material for governed learning.

---

## 6. Rollback

If Phase 4.5 ever needs to be rolled back:
1. Delete `src/lib/cognitive/` and `src/app/api/cognitive/`.
2. No other file references these modules (they are purely additive).
3. No database migration is required (no Prisma changes).

Rollback is safe and complete. Nothing depends on Phase 4.5 yet — it is a foundation for the future, not a dependency of the present.

---

## 7. Summary

| Question | Answer |
|---|---|
| Are any existing APIs broken? | **No.** |
| Are any existing phases modified? | **No.** |
| Are any responsibilities duplicated? | **No.** |
| Is this backward compatible? | **Yes — purely additive.** |
| Is the platform prepared for Phase 5 (UOB)? | **Yes.** |

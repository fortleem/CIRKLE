# ACA-SOVEREIGN-IMPL — Work Record

**Task ID**: ACA-SOVEREIGN-IMPL
**Agent**: full-stack-developer (ACA Sovereign Layer)
**Started**: 2025-Q4 building phase
**Status**: In progress

## Scope
Build the confidential institutional layer for CIRKLE — the ACA (Administrative
Control Authority) Sovereign Environment — invisible to ordinary citizens.

This layer is **separate** from the public Circle product:
- Separate ACA agent identity model (NOT created from regular Circle accounts)
- Separate ACA login (separate from Circle auth)
- Separate case/signal/evidence pipeline (a "signal" is intelligence, a "case"
  is a formal ACA matter — they are NOT the same)
- Immutable evidence (sealed evidence can never be modified)
- Two-person authorization for sensitive actions
- Dark institutional aesthetic (charcoal/slate, NOT the public gold/teal theme)

## Files Created

### Lib modules (5)
- `src/lib/aca-agent-store.ts` — ACA agent identity + session management
- `src/lib/aca-case-manager.ts` — Case lifecycle (signal → intake → investigation → finding → recommendation → reform → closed)
- `src/lib/aca-evidence-manager.ts` — Evidence integrity + immutability (seal → immutable)
- `src/lib/aca-signal-processor.ts` — Citizen Shield → ACA Signal pipeline (signal ≠ case)
- `src/lib/aca-investigation-workspace.ts` — Hypotheses, contradictions, evidence gaps, case health, next best action

### API routes (8)
- `src/app/api/aca/auth/login/route.ts` — POST: ACA login (agentId + credentials + MFA)
- `src/app/api/aca/agents/route.ts` — GET (admin only) / POST (provision new agent)
- `src/app/api/aca/cases/route.ts` — GET (assigned cases) / POST (create from signal)
- `src/app/api/aca/cases/[id]/route.ts` — GET detail / PATCH status / DELETE close (two-person)
- `src/app/api/aca/evidence/route.ts` — POST submit / GET list for case
- `src/app/api/aca/evidence/[id]/seal/route.ts` — POST seal (immutable)
- `src/app/api/aca/signals/route.ts` — GET list / POST create (from Citizen Shield or inter-agency)
- `src/app/api/aca/signals/[id]/convert/route.ts` — POST convert signal → formal case (human decision)

### Overlay components (3)
- `src/components/overlays/aca-login.tsx` — Fullscreen institutional login (dark charcoal)
- `src/components/overlays/aca-dashboard.tsx` — Command center (4 key questions + summary cards)
- `src/components/overlays/aca-case-detail.tsx` — Case management with 17 tabs

## Prisma Models Needed (NOT created — schema is read-only)

```
model AcaAgent { ... }       // ACA-issued institutional identity
model AcaCase { ... }         // formal ACA matter
model AcaSignal { ... }        // intelligence object (≠ case)
model AcaEvidence { ... }      // immutable evidence with chain of custody
model AcaEvidenceDerived { ... }  // derived copies linked to sealed originals
model AcaTimelineEvent { ... } // case timeline events
model AcaFinding { ... }        // case findings
model AcaRecommendation { ... }  // reform recommendations
model AcaCorrectiveAction { ... }  // corrective actions tracked to closure
model AcaAuditTrail { ... }     // append-only audit log
model AcaAssignment { ... }     // case-agent assignments (case-based access control)
model AcaHypothesis { ... }     // alternative hypothesis engine entries
model AcaContradiction { ... }  // exculpatory/contradictory evidence markers
model AcaEvidenceGap { ... }    // missing evidence the case still needs
model AcaSession { ... }        // short-lived session tokens
model AcaDevice { ... }         // agent-issued hardware
model AcaCertification { ... } // agent certifications
```

All DB-touching code wraps queries in try/catch and degrades gracefully —
the tables do not exist yet during the building phase, and the sovereign
schema file is intentionally untouched.

## Events Dispatched (NOT yet wired in page.tsx — file is read-only)

| Event | Source overlay | Target overlay |
|---|---|---|
| `circle:aca-login` | (admin panel — TODO) | opens `aca-login` |
| `circle:aca-dashboard` | `aca-login` (on successful auth) | opens `aca-dashboard` |
| `circle:aca-case-detail` | `aca-dashboard` (on case selection) | opens `aca-case-detail` |

The overlay components accept `{ open, onClose }` props and are mounted by the
host shell — wiring must be added by a follow-up task that owns `page.tsx`.

## Overlay-registry entries needed

```ts
{ id: "aca-login",       name: "ACA Login",          category: "safety",      event: "circle:aca-login",       emoji: "🔐" },
{ id: "aca-dashboard",   name: "ACA Command Center",  category: "safety",      event: "circle:aca-dashboard",    emoji: "🏛️" },
{ id: "aca-case-detail", name: "ACA Case Detail",     category: "safety",      event: "circle:aca-case-detail",  emoji: "📁" },
```

(All marked category "safety" — they are NOT in the public overlay browser; the
admin panel is the only entry point and the ACA category should be a separate,
non-surfaced registry once page.tsx ownership is granted.)

## Status
- Lib modules: in progress
- API routes: pending
- Overlays: pending
- Lint: pending

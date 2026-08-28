# P0-EVIDENCE-PERSIST — Persist ACA evidence to Prisma DB

**Task ID**: P0-EVIDENCE-PERSIST
**Agent**: full-stack-developer
**Date**: 2026-08-28

## Scope

Rewire the four ACA in-memory stores to persist to Prisma DB with graceful
in-memory fallback. Synchronous public APIs preserved so callers don't break.

## Files modified

| File | Lines changed | What |
|------|---------------|------|
| `src/lib/evidence-immutability.ts` | full rewrite | DB persistence for `AcaEvidence`, `EvidenceChainOfCustody`, `EvidenceAccessLog` + async variants |
| `src/lib/aca-case-manager.ts` | targeted edits | `dbUpsertCase` helper + `persistCaseFireAndForget` calls on every mutating function + `prefetchCase` on reads |
| `src/lib/aca-signal-processor.ts` | targeted edits | `dbUpsertSignal` helper + `persistSignalFireAndForget` calls + fixed broken `persistSignal`/`loadSignalFromDb` |
| `src/lib/aca-agent-store.ts` | targeted edits | `dbUpsertAgent` helper + `persistAgentFireAndForget` calls + new `listAgents` / `listAgentsAsync` exports + fixed broken `persistAgent`/`loadAgentFromDb` |

## Design pattern

```
┌─────────────────────────────────────────────────────────────┐
│ Sync mutating function (e.g. createCase)                    │
│                                                             │
│  1. Update in-memory cache immediately (sync).              │
│  2. Fire-and-forget DB write: void persistX(c).catch(()=>{}).│
│  3. Return the in-memory object (sync).                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Sync read function (e.g. getCase)                           │
│                                                             │
│  1. Read from in-memory cache (sync).                       │
│  2. On miss, fire-and-forget DB prefetch:                   │
│     void dbLoadX(id).catch(()=>{})                          │
│     (populates cache for the NEXT call).                    │
│  3. Return current cache value (sync, may be null).         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Async mutating function (e.g. sealEvidence)                  │
│                                                             │
│  1. Update in-memory cache.                                 │
│  2. Await DB write (so caller sees durable state on return).│
│  3. Return the in-memory object.                            │
└─────────────────────────────────────────────────────────────┘
```

## Critical bug fixed

The pre-existing `persistCase`, `persistSignal`, and `persistAgent` exports
were ALL broken — they referenced columns that don't exist in the current
Prisma schema (`title`, `description`, `department`, `service`, `geography`
on `AcaCase`; `signalNumber`, `timeframeFrom`, `timeframeTo`, `updatedAt`,
`reviewedAt`, `reviewedBy` on `AcaSignal`; `displayName`, `createdBy` on
`AcaAgent`). Because they were wrapped in `safeDbQuery`, the Prisma errors
were silently swallowed and the helpers were effectively no-ops.

The new `dbUpsertX` helpers use only schema-aware columns and pack the
extra fields into the JSON-string columns that DO exist in the schema
(`timeline`, `evidence`, `findings`, etc. on `AcaCase`; `timeframe`,
`evidenceAvailability`, `repeatedFailures`,
`potentialIntegrityIndicators`, `reasonForReferral` on `AcaSignal`;
`assignments`, `devices`, `certifications`, `permissions`, `auditHistory`
on `AcaAgent`).

## Schema field mapping (AcaEvidence)

| ImmutableEvidence field | DB column | Strategy |
|------------------------|-----------|----------|
| evidenceId | evidenceId | direct |
| type | type | direct |
| originalHash | integrityHash | direct (renamed) |
| sealed | sealed | direct |
| sealedAt | sealedAt | direct |
| sealedBy | sealedBy | direct |
| deviceIdentity | deviceIdentity | direct |
| captureTimestamp | capturedAt | direct (renamed) |
| location (object) | location (JSON string) | JSON.stringify |
| assignmentId | assignmentId | direct |
| agentId | capturedBy | direct (renamed) |
| title, payloadRef, mime, payloadBytes, derivedFrom, derivationKind, vault, metadata, cryptographicSignature | derivedCopies (JSON string) | pack/unpack |

## Verification

```
$ bun run lint
$ eslint .
/home/z/my-project/src/lib/server-auth.ts
  66:5  warning  Unused eslint-disable directive
✖ 1 problem (0 errors, 1 warning)
```
(1 unrelated warning in a file not modified by this task.)

```
$ bun build src/lib/evidence-immutability.ts --no-bundle --outfile /dev/null
Transpiled file in 5ms
$ bun build src/lib/aca-case-manager.ts --no-bundle --outfile /dev/null
Transpiled file in 1ms
$ bun build src/lib/aca-signal-processor.ts --no-bundle --outfile /dev/null
Transpiled file in 1ms
$ bun build src/lib/aca-agent-store.ts --no-bundle --outfile /dev/null
Transpiled file in 1ms
```

All four modules load successfully at runtime via `bun -e "import('@/lib/...')"`.

Smoke test of the evidence-immutability flow:
- sealEvidence → sealed: true, integrity verified
- recordAccess → access log entry created
- getChainOfCustody → 4 chain entries, 2 access log entries
- createDerivedCopy → derivedFrom set correctly, vault: operational
- attemptModifySealed → throws FORBIDDEN as expected
- assertMutable → throws "sealed and immutable" as expected

Smoke test of case/signal/agent flows:
- createCase → case created, listAllCases returns it
- updateCaseStatus → two-person state set (intentional)
- createSignal → signal created, listSignals returns it
- evaluateSignal → status: reviewed, recommendation: monitor
- createAcaAgent → agent created, listAgents returns it

API endpoints verified:
- `GET /api/aca/signals` → 200, empty on fresh DB
- `GET /api/aca/cases` → 200, empty on fresh DB
- `GET /api/aca/agents` → 200, empty on fresh DB

## Constraints honored

- ✅ No edits to `src/app/page.tsx`
- ✅ No edits to `src/lib/overlay-registry.ts`
- ✅ No edits to `prisma/schema.prisma`
- ✅ No edits to `src/screens/*`
- ✅ `@ts-nocheck` at top of every modified file
- ✅ `// P0 FIX: Now persists to Prisma DB with in-memory fallback` comment at top of each file
- ✅ All DB calls wrapped in try/catch via `safeDbQuery`
- ✅ All function signatures preserved
- ✅ `db` imported from `@/lib/db`

## Followups for future tasks

1. Add a session blacklist table so `validateAcaSession` doesn't have to be
   fail-open across processes (currently sessions are in-memory only, so a
   session revoked in process A is still valid in process B until expiry).
2. Add a `sealedByName` / `displayName` column to the schema so the
   human-readable names survive DB round-trips (currently the in-memory
   cache tracks them but the DB doesn't).
3. Add a `signalNumber` column to `AcaSignal` so the human-readable signal
   number survives DB round-trips.
4. Consider adding a sequence counter table so `nextCaseNumber` /
   `nextSignalNumber` are DB-backed (currently they use in-process counters
   that reset on restart — could collide across processes).

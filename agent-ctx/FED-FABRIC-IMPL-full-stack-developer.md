# FED-FABRIC-IMPL — Federated Government Fabric

**Task ID:** `FED-FABRIC-IMPL`
**Agent:** full-stack-developer
**Date:** $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Summary

Implemented the **Federated Government Fabric for CIRKLE** — the routing,
inter-agency exchange, and institution registry layer that sits between the
Citizen Shield and Egypt's sovereign government institutions.

Built strictly under the architectural constraints of:
- `docs/CIRCLE-FEDERATED-GOVERNMENT-ARCHITECTURE.md` (Parts I–XX, esp. PART
  IV, XIV, XVI, XVII, XVIII, XX)
- `docs/CIRCLE-EMERGENCY-SERVICE-ROUTING.md` (Parts XXI–L, esp. PART XXII,
  XXIX, XXXI, XXXII, XXXIII, XXXIV, XL, XLIII, XLVIII)
- The four non-negotiable rules (no fabricated dispatch; no silent
  cross-institutional sharing; no autonomous Signal-to-Case conversion; no
  replacement of existing sovereign systems).

## Files Created (16)

### Lib modules (5)
1. `src/lib/institution-registry.ts` — Government Institution Registry
   with the 5-level integration model (Level 0 Directory → Level 4
   Federated Intelligence). Institutions are sovereign security +
   operational domains; Circle only stores descriptors, never case files.
2. `src/lib/federation-router.ts` — Smart citizen routing engine. Three
   pathways: `emergency` (Police/EMS/Fire/Traffic — NEVER ACA),
   `service` (responsible government service), `integrity` (ACA as a
   Signal, NEVER a Case).
3. `src/lib/inter-agency-exchange.ts` — Inter-Agency Exchange Fabric.
   Implements `InterAgencyRequest` (information requests) +
   `InterAgencyReferral` (case-linkage correlation). Enforces
   minimum-necessary principle + no-shared-case-by-default.
4. `src/lib/service-directory.ts` — Citizen Service Directory. Verified
   entries with freshness windows; observational outage reporting that
   never silently rewrites official status.
5. `src/lib/federated-incident.ts` — Federated Incident Reference.
   Links multiple institutions' independent cases WITHOUT merging them.
   Federation ≠ Centralization.

### API routes (8)
6. `src/app/api/federation/institutions/route.ts` — GET list / POST register.
7. `src/app/api/federation/route/route.ts` — POST route citizen request → RoutingDecision.
8. `src/app/api/federation/referrals/route.ts` — GET list / POST create referral.
9. `src/app/api/federation/referrals/[id]/route.ts` — GET detail / PATCH update status.
10. `src/app/api/federation/service-directory/route.ts` — GET search / POST add service.
11. `src/app/api/federation/incidents/route.ts` — GET list / POST create federated incident.
12. `src/app/api/federation/requests/route.ts` — GET list / POST create inter-agency request.
13. `src/app/api/federation/requests/[id]/route.ts` — GET detail / PATCH submit / respond.

### Overlay components (3)
14. `src/components/overlays/government-institution-registry.tsx` —
    Institutional dark theme admin overlay. Card grid + register form.
    Dispatches `circle:institution-registry`.
15. `src/components/overlays/inter-agency-referral.tsx` —
    Institutional dark theme admin overlay. Referral list + new-referral
    form. Dispatches `circle:inter-agency-referral`.
16. `src/components/overlays/service-directory.tsx` —
    Glass aesthetic citizen-facing overlay. Search + filter + report
    outage. Dispatches `circle:service-directory`.

## Prisma Models Needed

The lib modules read/write through `db` with try/catch fallback to an
in-memory store, so the fabric functions even before migration. The
following models should be added to `prisma/schema.prisma` and pushed
via `bun run db:push` to enable persistence:

```prisma
model GovernmentInstitution {
  institutionId       String   @id @unique
  name                String
  authority           String
  type                String
  services            String   // JSON-encoded string[]
  officialChannels    String   // JSON-encoded OfficialChannel[]
  integrations        String   // JSON-encoded InstitutionIntegration[]
  status              String   @default("pending_verification")
  dataClassification  String   @default("public")
  lastVerification    DateTime @default(now())
  effectiveDate       DateTime @default(now())
  country             String?
  jurisdiction        String?
  notes               String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([type])
  @@index([status])
  @@index([country])
}

model InterAgencyRequest {
  requestId            String   @id @unique
  requestingInstitution String
  receivingInstitution String
  caseId               String
  caseType             String
  caseNamespace        String
  purpose              String
  requestedRecords     String   // JSON-encoded RequestedRecord[]
  legalAuthority       String
  deadline             String
  confidentiality      String   @default("restricted")
  retention            String   @default("until_case_close")
  exportRestriction    Boolean  @default(true)
  responseJson         String?  // JSON-encoded response object
  status               String   @default("draft")
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([requestingInstitution])
  @@index([receivingInstitution])
  @@index([status])
}

model InterAgencyReferral {
  referralId        String   @id @unique
  fromInstitution   String
  toInstitution     String
  citizenSubmission String
  correlationId     String
  fromCaseId        String?
  toCaseId          String?
  purpose           String
  status            String   @default("pending")
  provenance        String   // JSON-encoded ProvenanceEntry[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([fromInstitution])
  @@index([toInstitution])
  @@index([status])
  @@index([correlationId])
}

model ServiceDirectoryEntry {
  serviceId              String   @id @unique
  serviceName            String
  responsibleInstitution String
  department             String
  channel                String
  contactInfo            String   // JSON-encoded ServiceContactInfo
  hours                  String   // JSON-encoded ServiceHours
  geographicCoverage     String   @default("National")
  accessibility          String   // JSON-encoded string[]
  languages              String   // JSON-encoded string[]
  category               String?
  lastVerified           DateTime @default(now())
  status                 String   @default("available")
  notes                  String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@index([responsibleInstitution])
  @@index([category])
  @@index([channel])
  @@index([status])
}

model FederatedIncident {
  federatedId                String   @id @unique
  incidentType               String
  participatingInstitutions  String   // JSON-encoded string[]
  institutionCaseRefs        String   // JSON-encoded InstitutionCaseRef[]
  timeline                   String   // JSON-encoded FederatedTimelineEntry[]
  status                     String   @default("active")
  coordinatedBy              String
  correlationId              String
  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt
  closedAt                   DateTime?

  @@index([status])
  @@index([coordinatedBy])
  @@index([correlationId])
}
```

## Events Dispatched

The three overlay components dispatch the following `window` `CustomEvent`s
on open (so the host page — `src/app/page.tsx` — can react, log analytics,
or surface co-banners). The page must `addEventListener` for these to wire
the overlays into the shell:

| Event                                | Source component                              | Payload                              |
|--------------------------------------|-----------------------------------------------|--------------------------------------|
| `circle:institution-registry`       | `government-institution-registry.tsx`         | `{ open: true, at: ISO }`            |
| `circle:inter-agency-referral`       | `inter-agency-referral.tsx`                   | `{ open: true, at: ISO }`            |
| `circle:service-directory`           | `service-directory.tsx`                       | `{ open: true, at: ISO }`            |

## Overlay-Registry Entries Needed

The following entries should be appended to `OVERLAY_REGISTRY` in
`src/lib/overlay-registry.ts` so the overlays appear in the Overlay
Browser + Command Palette. (NOT done by this task — file-ownership rules
forbid modifying existing files.)

```ts
{
  id: "government-institution-registry",
  name: "Government Institution Registry",
  description: "Sovereign institution directory + 5-level integration descriptors.",
  emoji: "🏛️",
  category: "safety",            // or new "government" category
  event: "circle:institution-registry",
  keywords: ["institution", "government", "federation", "aca", "police", "ems"],
},
{
  id: "inter-agency-referral",
  name: "Inter-Agency Referral",
  description: "Track + create cross-institution referrals without merging cases.",
  emoji: "🔁",
  category: "safety",
  event: "circle:inter-agency-referral",
  keywords: ["referral", "inter-agency", "exchange", "federation"],
},
{
  id: "service-directory",
  name: "Citizen Service Directory",
  description: "Searchable directory of official government services.",
  emoji: "📋",
  category: "safety",
  event: "circle:service-directory",
  keywords: ["service", "directory", "citizen", "government", "official"],
},
```

## Invariants Enforced

1. **Emergency pathway never routes to ACA.** `federation-router.ts`
   `detectEmergency()` only matches Police/EMS/Fire/Traffic lexicons.
2. **Integrity pathway routes to ACA as a Signal, NEVER as a Case.** The
   routing reason text explicitly states PART XXXVIII enforcement.
3. **No shared government case by default.** `InterAgencyReferral`
   carries a `correlationId` (NOT a case id); each institution opens its
   own case under its own namespace via `toCaseId`.
4. **Minimum-necessary principle.** `createRequest()` rejects empty
   `requestedRecords` or records without an 8+ character justification.
5. **No fabricated dispatch.** All SLA targets are flagged `enforced:
   false` (Level 0) unless an active integration is declared — the
   citizen is told to use the official channel directly.
6. **Freshness windows.** Institutions > 180 days since last
   verification are reported as `stale`; services > 90 days as
   `degraded` — regardless of stored status.
7. **Federation ≠ Centralization.** `FederatedIncident` stores only
   references; closing requires every participating institution's case
   to be closed (each institution closes its own case under its own
   process).

## Lint

`bun run lint` — see final report. All files begin with `@ts-nocheck` as
required by the task brief.

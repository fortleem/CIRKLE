# EMERGENCY-ROUTING-IMPL — Emergency Routing & Smart Citizen Routing

**Task ID:** EMERGENCY-ROUTING-IMPL
**Agent:** full-stack-developer
**Date:** 2026-08-27
**Status:** ✅ Complete

## Scope

Implements Part XXI (Smart Citizen Routing), Chapters XXII–XXVIII (Emergency
path / integration / fallback hierarchy / packet / status / silent emergency /
citizen safety), and the service-outage portion of Chapter XXX (Multi-Agency
Referral) for the CIRKLE platform.

The implementation follows the four non-negotiable rules:

1. **No fabricated dispatch.** Every delivery status reflects ONLY what the
   responder has actually returned. The OFFLINE_QUEUE fallback records the
   packet and returns `FALLBACK_USED` (NOT `TRANSMITTED`).
2. **No silent cross-institutional sharing.** Routing decisions are shown to
   the citizen before anything is sent. Each institution receives only what
   it is authorized to receive, in its own case namespace.
3. **No autonomous Signal-to-Case conversion.** The integrity lane routes to
   "ACA Signal intake — reviewable intelligence object — NOT a case".
4. **No replacement of existing sovereign systems.** Every `officialChannel`
   is an integration target marked "Pending verification" per Chapter LXXXIX.

## Files created

### Lib modules (4)

1. `src/lib/smart-routing-engine.ts`
   - `RoutingResult` interface (pathway, category, targetInstitution,
     targetDepartment, officialChannel, sla, escalation, routingReason,
     fallbackChannels[], classifiedBy, timestamp, emergencyType?, degraded?).
   - `routeCitizenRequest()` — three-pathway classifier (HELP / SERVICE /
     INTEGRITY). Keyword floor + AI tiebreaker. AI never overrides an
     emergency keyword match.
   - `quickClassify()` — synchronous keyword-only classifier.
   - Emergency target registry: Police / EMS / Civil Protection / Traffic.
     NEVER ACA. Integrity target registry: ACA Signal intake (NOT a case).

2. `src/lib/emergency-router.ts`
   - `EmergencyRoute` interface (emergencyId, type, targetInstitution,
     targetChannel, packet, status, fallbackUsed, statusNote, timestamp).
   - `routeEmergency()` — routes a confirmed emergency packet to the
     correct sovereign emergency service based on incident type. Walks the
     fallback hierarchy when primary delivery fails. Never fabricates.
   - `previewEmergencyRoute()` — preview where an emergency will be routed.

3. `src/lib/emergency-packet.ts`
   - `EmergencyPacket` interface (incidentType, location, personsAffected,
     hazards, citizenDescription, media[], callbackInfo, timestamp,
     minInfoOnly).
   - `buildPacket()` — constructs the minimum-necessary-info packet.
     Sanitizes/truncates fields. Strips media/callback in minInfoOnly mode.
   - `validatePacket()` — checks required fields. Location is OPTIONAL
     (silent-emergency mode, Chapter XXVII).
   - `summarizePacket()` — redacted human-readable summary for the UI.

4. `src/lib/emergency-fallback.ts`
   - `FallbackLevel` enum (DIGITAL_CHANNEL → ALTERNATIVE_DIGITAL →
     SMS_DATA → TELEPHONE → OFFLINE_QUEUE).
   - `DeliveryStatus` enum (TRANSMITTED, ACKNOWLEDGED,
     STATUS_UNAVAILABLE, FAILED, FALLBACK_USED).
   - `getFallback()` / `getFallbackChain()` — return next fallback level.
   - `attemptDelivery()` — simulates delivery per level. NEVER fabricates
     success on electronic channels (returns STATUS_UNAVAILABLE because
     integrations are "Pending verification"). OFFLINE_QUEUE returns
     FALLBACK_USED (NOT TRANSMITTED) — the citizen sees their report is
     recorded, NOT delivered.
   - Helpers: `isSuccessfulDispatch`, `isRecordedOnly`, `isFailed`.

### API routes (6)

5. `src/app/api/emergency/route/route.ts`
   - POST: route a citizen request → returns `RoutingResult` with
     pathway + target institution.
   - GET: self-documenting endpoint card.

6. `src/app/api/emergency/packet/route.ts`
   - POST: build + send emergency packet. Returns delivery status.
     HTTP 200/202/503 reflects dispatch outcome. NEVER fabricates.
   - GET: self-documenting endpoint card.

7. `src/app/api/emergency/status/[id]/route.ts`
   - GET: check emergency status. Returns ONLY statuses actually returned
     by the authority. `authorityStatus` is `null` until the responder
     returns something. NEVER synthesized.

8. `src/app/api/emergency/fallback/route.ts`
   - POST: trigger a fallback method manually. Updates stored route status
     only when the responder actually returned a higher status.
   - GET: self-documenting endpoint card.

9. `src/app/api/services/outage/route.ts`
   - POST: report a service outage. Best-effort duplicate detection — when
     a similar recent report exists, the citizen "adds voice" rather than
     creates a duplicate.
   - GET: list recent outages (filter by service, outageType, since).

10. `src/app/api/services/health/route.ts`
    - GET: government digital health radar. Aggregates outage data into
      per-service health (healthy / degraded / down / unknown). NEVER
      contacts the institution; NEVER fabricates statuses. Each entry
      carries `integration: "Pending verification"`.

### Overlay components (3)

11. `src/components/overlays/smart-routing.tsx`
    - Citizen-facing "I need help" interface.
    - Text input + AI classification into EMERGENCY (red) / SERVICE (blue)
      / INTEGRITY (amber).
    - Shows routing decision BEFORE sending.
    - "Proceed" button dispatches `circle:smart-routing`.
    - Three color-coded pathway cards + legend.
    - Safety-first banner, GPS detect (8s timeout, 44px touch targets),
      full ARIA.

12. `src/components/overlays/emergency-routing.tsx`
    - Emergency type selector: Police / Medical / Fire / Traffic / Other.
    - GPS auto-detect (8s timeout).
    - Emergency packet builder (shows what info will be sent).
    - SAFE-EVIDENCE MODE toggle + minimum-info-only toggle.
    - Safety guidance banner: "Do not endanger yourself to gather evidence".
    - Send button → shows delivery status (NEVER fabricated).
    - Fallback indicator + manual fallback retry buttons.
    - Dispatches `circle:emergency-routing`.

13. `src/components/overlays/service-outage-report.tsx`
    - Form: select service + outage type + description + city + GPS.
    - Auto-detects user location.
    - Shows similar recent reports (to avoid duplicates).
    - Status tracking after submission (recorded ID, reports count,
      first/last reported timestamps).
    - Dispatches `circle:service-outage-report`.

## Prisma models needed (NEW)

These models are required for production persistence. They are NOT added to
`prisma/schema.prisma` (the task explicitly forbids modifying existing
files). A follow-up task should append the following to the schema:

```prisma
/// Smart Citizen Routing decisions — Chapter XXI. Persisted for audit
/// and for the citizen's status-tracking UI.
model SmartRoutingDecision {
  id              String   @id @default(cuid())
  text            String   // citizen free-text input (truncated to 4000)
  pathway         String   // "emergency" | "service" | "integrity"
  category        String   // sub-category within the lane
  emergencyType   String?  // police|medical|fire|traffic|other — when pathway === "emergency"
  targetInstitution String
  targetDepartment String
  officialChannel String
  sla             String
  escalation      String
  routingReason   String
  fallbackChannels String  // JSON-encoded string[]
  classifiedBy    String   // "keyword" | "ai" | "hybrid"
  degraded        Boolean  @default(false)
  country         String?
  city            String?
  lat             Float?
  lng             Float?
  createdAt       DateTime @default(now())

  @@index([pathway])
  @@index([createdAt])
}

/// Emergency routing attempts — Chapters XXII–XXVIII. The minimum-necessary-
/// info packet + delivery status. NEVER fabricated: status reflects ONLY
/// what the responder actually returned.
model EmergencyRoute {
  id              String   @id @default(cuid())
  emergencyId     String   @unique // emr_xxx
  type            String   // police|medical|fire|traffic|other
  targetInstitution String
  targetDepartment String
  targetChannel   String
  packet          String   // JSON-encoded EmergencyPacket (min-info only)
  status          String   // TRANSMITTED|ACKNOWLEDGED|STATUS_UNAVAILABLE|FAILED|FALLBACK_USED
  fallbackUsed    String?  // FallbackLevel enum value
  statusNote      String
  minInfoOnly     Boolean  @default(true)
  safeEvidenceMode Boolean @default(true)
  country         String?
  city            String?
  lat             Float?
  lng             Float?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  statusUpdates   EmergencyStatusUpdate[]

  @@index([type])
  @@index([status])
  @@index([createdAt])
}

/// Authority-returned status updates for an EmergencyRoute. Entries appear
/// ONLY when a real responder integration pushes an update — NEVER
/// synthesized by the platform (Rule 1).
model EmergencyStatusUpdate {
  id              String   @id @default(cuid())
  emergencyId     String
  route           EmergencyRoute @relation(fields: [emergencyId], references: [emergencyId], onDelete: Cascade)
  status          String   // DeliveryStatus enum value
  note            String
  source          String   // responder integration identifier
  createdAt       DateTime @default(now())

  @@index([emergencyId])
}

/// Service outage reports — Chapter XXX §30.6. Aggregated into the
/// government digital health radar by /api/services/health.
model ServiceOutage {
  id              String   @id @default(cuid())
  outageId        String   @unique // out_xxx
  service         String   // eta|nafeza|civil_registry|...
  outageType      String   // portal_down|transaction_failure|...
  description     String?
  country         String?
  city            String?
  lat             Float?
  lng             Float?
  status          String   @default("open") // open|confirmed|resolved
  reports         Int      @default(1)
  firstReported   DateTime @default(now())
  lastReported    DateTime @default(now())

  @@index([service, outageType])
  @@index([status])
  @@index([lastReported])
}
```

## Events dispatched

All events are dispatched via `window.dispatchEvent(new CustomEvent(...))`
from the client overlays. They follow the project's `circle:*` naming
convention. The home page (`src/app/page.tsx`) can subscribe to these to
open the next overlay in the routing flow (e.g. when `circle:smart-routing`
fires with `pathway === "emergency"`, the home page can open the
emergency-routing overlay).

| Event | Dispatcher | Payload |
|---|---|---|
| `circle:smart-routing` | `smart-routing.tsx` (on Proceed) | `{ pathway, category, targetInstitution, targetDepartment, officialChannel, sla, timestamp, emergencyType?, location? }` |
| `circle:emergency-routing` | `emergency-routing.tsx` (on Send) | `{ emergencyId, type, targetInstitution, status, fallbackUsed, timestamp }` |
| `circle:service-outage-report` | `service-outage-report.tsx` (on Submit) | `{ outageId, service, outageType, addedVoiceTo, reports, timestamp }` |

## Overlay-registry entries needed

Three new entries should be appended to `OVERLAY_REGISTRY` in
`src/lib/overlay-registry.ts` (NOT modified in this task per the file
ownership rules — the integrator should add these in a follow-up):

```ts
{
  id: "smart-routing",
  name: "I need help",
  description: "Smart Citizen Routing — describe what you need help with and CIRCLE routes you to the right institution: emergency, service, or integrity.",
  emoji: "🆘",
  category: "safety",
  event: "circle:smart-routing",
  keywords: ["help", "emergency", "police", "ambulance", "fire", "service", "complaint", "integrity", "aca", "route"],
},
{
  id: "emergency-routing",
  name: "Emergency Routing",
  description: "Send a minimum-info emergency packet to Police / EMS / Civil Protection / Traffic. SAFE-EVIDENCE MODE for reporting from a safe distance. Never fabricates dispatch.",
  emoji: "🚨",
  category: "safety",
  event: "circle:emergency-routing",
  keywords: ["emergency", "122", "123", "police", "ambulance", "ems", "fire", "civil protection", "traffic accident", "rescue"],
},
{
  id: "service-outage-report",
  name: "Report a Service Outage",
  description: "Report a government service outage (portal down, transaction failure, payment problem). Aggregated into the government digital health radar.",
  emoji: "📡",
  category: "safety",
  event: "circle:service-outage-report",
  keywords: ["outage", "down", "portal", "eta", "nafeza", "transaction", "payment", "service", "health radar"],
},
```

## Lint result

`bun run lint` — **EXIT 0**, no errors, no warnings.

## Runtime verification

The dev server compiled and served all new endpoints successfully (visible
in `dev.log`):

```
GET /api/emergency/route  200 in 1941ms (compile: 1795ms, proxy.ts: 99ms, render: 48ms)
GET /api/services/health  200 in 233ms  (compile: 220ms, proxy.ts: 5ms, render: 8ms)
GET /api/emergency/packet  200 in 268ms  (compile: 258ms, proxy.ts: 5ms, render: 5ms)
```

All four lib modules compile cleanly; all six API routes return their
self-documenting GET cards with `ok: true`; the health radar returns the
canonical 11-service registry with `integration: "Pending verification"`.

## Notes for the integrator

- The `ROUTE_STORE`, `AUTHORITY_STATUS_STORE`, and `OUTAGE_STORE` are
  in-memory. They are exposed on `globalThis` (`__CIRKLE_EMERGENCY_ROUTE_STORE__`,
  `__CIRKLE_AUTHORITY_STATUS_STORE__`, `__CIRKLE_SERVICE_OUTAGE_STORE__`)
  so the integrator can wire a Prisma-backed replacement without
  touching this task's files.
- The `deliver` adapter on `routeEmergency()` is the injection point for
  the real sovereign responder integration. Until verified registry
  entries exist (Chapter LXXXIX), the simulator returns
  `STATUS_UNAVAILABLE` for every electronic channel — the OFFLINE_QUEUE
  always records the packet.
- AI is consulted only as a tiebreaker in `routeCitizenRequest()`. When
  AI providers are unavailable, the classifier degrades to keyword-only
  and sets `degraded: true` on the result.

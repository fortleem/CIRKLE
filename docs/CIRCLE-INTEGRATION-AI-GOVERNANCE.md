# CIRCLE — Integration Health, AI Governance & Institutional Security
## Part III of the Federated Sovereign Government Architecture

> Amendment to the CIRCLE Universal Citizen Platform blueprint.
> Part III covers the integration control surface, AI governance separation,
> device trust, supply-chain integrity, and the institutional security boundary
> model required for a federated sovereign government deployment.
> Parts I (Federation substrate) and II (ACA evidence and accountability)
> precede this document. Part III is self-contained and references those Parts
> where appropriate.

---

## Table of Contents

1. [Part LI — Integration Health](#part-li--integration-health)
2. [Part LII — Integration Sandbox](#part-lii--integration-sandbox)
3. [Part LIII — Connector Certification](#part-liii--connector-certification)
4. [Part LIV — Automated Integration Discovery](#part-liv--automated-integration-discovery)
5. [Part LV — Missing-System Map](#part-lv--missing-system-map)
6. [Part LVI — Citizen Service Directory](#part-lvi--citizen-service-directory)
7. [Part LVII — Service Channel Health](#part-lvii--service-channel-health)
8. [Part LVIII — Service Outage Reporting](#part-lviii--service-outage-reporting)
9. [Part LIX — Government Digital Health Radar](#part-lix--government-digital-health-radar)
10. [Part LX — Citizen → Service → ACA](#part-lx--citizen--service--aca)
11. [Part LXI — Institutional AI Separation](#part-lxi--institutional-ai-separation)
12. [Part LXII — Universal Circle AI vs Institutional AI](#part-lxii--universal-circle-ai-vs-institutional-ai)
13. [Part LXIII — AI Data Firewall](#part-lxiii--ai-data-firewall)
14. [Part LXIV — Government Data Clean Room](#part-lxiv--government-data-clean-room)
15. [Part LXV — Pseudonymous Federated Linkage](#part-lxv--pseudonymous-federated-linkage)
16. [Part LXVI — Entity Resolution](#part-lxvi--entity-resolution)
17. [Part LXVII — Government Master Data](#part-lxvii--government-master-data)
18. [Part LXVIII — Government-Specific Data Planes](#part-lxviii--government-specific-data-planes)
19. [Part LXIX — Federation Does Not Mean Centralization](#part-lxix--federation-does-not-mean-centralization)
20. [Part LXX — Institutional Deployment Models](#part-lxx--institutional-deployment-models)
21. [Part LXXI — Institutional Security Boundary](#part-lxxi--institutional-security-boundary)
22. [Part LXXII — Government Device Trust](#part-lxxii--government-device-trust)
23. [Part LXXIII — Device Loss / Revocation](#part-lxxiii--device-loss--revocation)
24. [Part LXXIV — Offline Institutional Operations](#part-lxxiv--offline-institutional-operations)
25. [Part LXXV — Sync Conflict Engine](#part-lxxv--sync-conflict-engine)
26. [Part LXXVI — Security Supply Chain](#part-lxxvi--security-supply-chain)
27. [Part LXXVII — Government AI Model Supply Chain](#part-lxxvii--government-ai-model-supply-chain)
28. [Part LXXVIII — Model Change Control](#part-lxxviii--model-change-control)
29. [Part LXXIX — AI Shadow Testing](#part-lxxix--ai-shadow-testing)
30. [Part LXXX — AI Incident Management](#part-lxxx--ai-incident-management)
31. [Part LXXXI — AI Kill Switch](#part-lxxxi--ai-kill-switch)
32. [Part LXXXII — AI Automation Levels](#part-lxxxii--ai-automation-levels)
33. [Appendix A — Data Plane Reference Card](#appendix-a--data-plane-reference-card)
34. [Appendix B — AI Governance Provenance Record](#appendix-b--ai-governance-provenance-record)
35. [Appendix C — Cross-Part Dependency Matrix](#appendix-c--cross-part-dependency-matrix)

---

## PART LI — Integration Health

### LI.1 Purpose

The Government Integration Control Tower is the single operational surface that gives institutional administrators, ACA oversight officers, and authorized operations staff a live, authoritative view of every connector, every connected system, and every outstanding integration issue across the federated government deployment. It is not a cosmetic dashboard; it is the operational evidence surface from which integration-state assertions can be attested, audited, and — where necessary — escalated into ACA Signals under Part II.

### LI.2 Government Integration Control Tower

```
+======================================================================+
|                  GOVERNMENT INTEGRATION CONTROL TOWER                |
+======================================================================+
|  Connected Systems         [ N systems / N institutions / N domains ] |
|  Healthy                   [ N green ]                                |
|  Degraded                  [ N amber ]                                |
|  Unavailable               [ N red ]                                  |
|  Auth Errors               [ N items needing credential review ]      |
|  Schema Changes Detected   [ N items needing schema reconciliation ] |
|  Failed Synchronization    [ N batches needing operator intervention ]|
|  Pending Authorization     [ N connector requests awaiting signoff ] |
|  Overdue Information Reqs  [ N SLA breaches against external systems ]|
+======================================================================+
| [Drill-down per institution] [per system] [per domain] [per data plane]|
+======================================================================+
```

### LI.3 Required Display Fields

| Field | Source | Refresh | Purpose |
|---|---|---|---|
| Institution | System of Record Registry (Part XLVII) | On registry change | Establishes ownership and accountability |
| System | Connector manifest | On connector registration | Identifies the external system (e.g., ETA, NAFEZA) |
| Domain | Connector manifest | Static | Functional domain (tax, customs, civil registry) |
| Connected? | Health probe | Continuous (≤ 60s) | Liveness signal |
| Healthy / Degraded / Unavailable | Health probe + SLA engine | Continuous | Operational state classification |
| Auth Errors | Auth verifier | On error | Token expiry, credential revocation, cert mismatch |
| Schema Changes Detected | Schema Sentinel (Part L) | Continuous | Field/type/endpoint drift from baseline |
| Failed Synchronization | Sync engine | On batch failure | Number of records / batches affected |
| Pending Authorization | Authorization ledger | On request | Outstanding data-sharing or connector approvals |
| Overdue Information Requests | SLA engine | Continuous | Requests past SLA window against external systems |
| Last Verified | Probe ledger | Continuous | Freshness indicator per Part XLVIII |
| Data Plane | Connector manifest | Static | Identifies which data plane the connector feeds (Part LXVIII) |

### LI.4 Health State Taxonomy

| State | Definition | Color | Operator Action |
|---|---|---|---|
| `HEALTHY` | All probes pass; SLA within tolerance; no schema drift; no auth errors. | Green | Monitor only. |
| `DEGRADED` | Probes succeed partially; SLA breaches < threshold; minor schema drift flagged but auto-reconciled. | Amber | Investigate; continue with reduced confidence. |
| `UNAVAILABLE` | Probes fail; connector marked down; data plane fed by stale cache or unavailable. | Red | Escalate; switch to fallback procedures (Part LXXIV offline mode if applicable). |
| `AUTH_ERROR` | Connector reachable but auth rejected. | Red | Credential review required; do NOT brute-force retries. |

### LI.5 Pending Authorization

A connector may be technically healthy but blocked pending an institutional authorization signoff. The Control Tower MUST show both the technical health and the pending authorization, and the connector MUST NOT feed any operational workflow until authorization is granted and recorded in the authorization ledger.

### LI.6 Overdue Information Requests

Where Circle has issued a request against an external system (e.g., a civil registry lookup) and the external system has not responded within the SLA window recorded in the System of Record Registry, the Control Tower MUST surface the request as `OVERDUE`. Overdue requests are themselves audit evidence. A pattern of overdue requests against the same external system is admissible as service-health intelligence under Part LIX and may, where appropriate, escalate to an ACA Signal under Part LX.

### LI.7 Audit and Attestation

Every state transition visible on the Control Tower — every degradation, recovery, auth error, schema change — MUST be written to the audit ledger with: timestamp (institutional + UTC), operator identity (if a human action caused or acknowledged the transition), prior state, new state, probe or event that triggered the transition, and an evidence link (probe record, schema-diff artifact, auth-failure record). The Control Tower is itself subject to ACA oversight; ACA investigators may query the audit ledger to reconstruct integration state at any historical moment relevant to an investigation.

### LI.8 Non-Goals

The Control Tower does NOT execute unilateral changes to external systems, override institutional authorization, act as a single point of failure (it is itself federated and reads from per-plane health stores — see Part LXVIII), or conceal degraded or unavailable state from citizens where citizen-facing services depend on the affected connector (see Part LVII).

---

## PART LII — Integration Sandbox

### LII.1 Principle

No connector touches production data until it has been exercised in isolation. The Integration Sandbox is the mandatory pre-production environment in which every new connector — and every material modification to an existing connector — is tested before promotion.

### LII.2 Sandbox Properties

| Property | Requirement |
|---|---|
| Isolation | Network-isolated namespace with no production data plane access. |
| Test fixtures | Representative test fixtures, including sanitized fixtures derived from production where authorized. |
| Auth scope | Sandbox credentials scoped to sandbox-only test endpoints where the source system provides them; otherwise synthetic credentials. |
| Telemetry | Every call, response, error, timing, and probe result recorded for review. |
| Reset | Clean state between test runs without affecting production. |
| Audit | Sandbox runs are themselves audit evidence and retained per the connector's retention policy. |

### LII.3 Mandatory Test Surfaces

Every new connector MUST be tested across nine surfaces before certification (Part LIII):

1. **Authentication** — credential acquisition, token refresh, certificate validation, graceful handling of credential expiry.
2. **Schema** — conformance to the documented schema baseline (Part L); drift, missing fields, unexpected types detected.
3. **Data Mapping** — source fields map correctly to the canonical Circle schema used by the consuming data plane, including unit normalization, transliteration, and timezone handling.
4. **Authorization** — the connector respects institutional authorization boundaries and refuses unauthorized fetch or transmission.
5. **Provenance** — every record carries source institution, source system, fetch timestamp, schema version, and connector version in its provenance envelope.
6. **Error Handling** — graceful degradation under network errors, timeouts, malformed responses, partial responses, and source-system 4xx/5xx codes.
7. **Security** — transport security, credential storage, payload signing where required, and resistance to injection via inbound data.
8. **Performance** — throughput, latency, and concurrency within agreed SLA; backpressure behavior when the source system is slow.
9. **Recovery** — interrupted syncs resume without duplication, idempotency keys are respected, recovery from partial failure does not corrupt downstream state.

### LII.4 Sandbox Test Matrix

| Surface | Test Cases (minimum) | Pass Criterion |
|---|---|---|
| Authentication | happy-path token; expired token; revoked credential; cert mismatch; refresh-on-401 | All cases handled without exception leakage |
| Schema | baseline schema; field missing; field extra; type mismatch; version bump | Drift detected and surfaced; no silent acceptance |
| Data Mapping | null handling; Unicode; Arabic + transliteration; timezone; currency; unit conversion | All values canonicalize correctly |
| Authorization | authorized scope; unauthorized scope; scope revoked mid-fetch | Unauthorized fetch blocked and logged |
| Provenance | happy path; missing provenance field; manual override | Provenance envelope complete and signed |
| Error Handling | timeout; 5xx; 4xx; partial body; invalid JSON; connection reset | Errors surfaced with retry policy honored |
| Security | TLS verification; cert pinning; payload signature; injection attempt | All transport and integrity checks pass |
| Performance | nominal load; burst load; sustained load; degraded source | SLA window respected; backpressure engages |
| Recovery | mid-batch interruption; duplicate replay; partial failure; rollback | No duplication; no corruption; resume succeeds |

### LII.5 Promotion Gate

The Sandbox MUST refuse to issue a promotion recommendation to Part LIII certification unless every test surface has at least one passing recorded run against the current connector version. A surface with zero passing runs blocks promotion.

### LII.6 Sandbox Isolation from ACA

Sandbox runs are not, by default, visible to ACA. Sandbox artifacts become ACA-visible only if the connector is later implicated in an AI Incident (Part LXXX) or in an evidence-integrity investigation under Part II, and only through the formal ACA retrieval process.

---

## PART LIII — Connector Certification

### LIII.1 Principle

Certification is the formal attestation that a connector has been tested across all required surfaces, has passed every mandatory test class, and is authorized to operate against production systems within a defined policy envelope.

### LIII.2 Mandatory Certification Test Classes

| # | Test Class | Verifies | Owner | Result Format |
|---|---|---|---|---|
| 1 | Security | transport, credential storage, payload integrity, injection resistance | Institutional Security Officer | PASS / FAIL with evidence hash |
| 2 | Data Quality | field completeness, canonicalization, validation rules, referential integrity against master data (Part LXVII) | Data Steward | PASS / FAIL with sample audit |
| 3 | Provenance | source institution, source system, schema version, fetch timestamp, connector version attached to every record | Data Steward | PASS / FAIL with sample provenance envelope |
| 4 | Schema | baseline conformance, drift detection, version negotiation | Data Steward | PASS / FAIL with schema diff artifact |
| 5 | Failure | graceful failure under network, auth, source 4xx/5xx, malformed body, timeout | Reliability Engineer | PASS / FAIL with failure log |
| 6 | Recovery | resume after interruption; no duplication; idempotency; rollback integrity | Reliability Engineer | PASS / FAIL with recovery log |
| 7 | Audit | every fetch recorded in audit ledger; every state transition attested | Audit Officer | PASS / FAIL with audit sample |

### LIII.3 Certification Record

A Certification Record MUST be created for every connector version promoted to production, capturing: connector identifier, connector version, source institution, source system, target data plane (Part LXVIII), certification test class results (all seven), test artifact references (hashes to immutable test logs), certifying officers (per test class), certification date, certification validity window, and re-certification trigger conditions.

### LIII.4 Re-certification Triggers

Re-certification is mandatory whenever any of the following occurs: a schema change is detected in the source system (Part L); the connector code is materially modified; a security vulnerability is disclosed in a dependency; an AI Incident (Part LXXX) implicates the connector; the source system's authorization scope is changed; or the connector has been in production beyond its certification validity window (default 180 days, configurable per institution).

### LIII.5 Non-Negotiable Rule

> A connector that has not been certified MUST NOT appear in the production connector registry. A connector whose certification has expired MUST be treated as `UNAVAILABLE` by the Control Tower (Part LI) until re-certification completes.

There is no emergency override that bypasses certification. Emergency response that depends on an uncertified connector MUST fall back to manual procedures documented in the institution's business continuity plan, not silently activate an uncertified connector.

### LIII.6 ACA Visibility of Certification State

ACA investigators may inspect certification records as part of an investigation under Part II. A lapsed certification on a connector that fed evidence into an investigation is itself an investigative finding and may trigger an ACA Signal.

---

## PART LIV — Automated Integration Discovery

### LIV.1 Principle

When Circle detects that an institutional workflow requires data from a system that is not yet connected, it does NOT silently fail, fabricate data, or substitute another source. It records an INTEGRATION REQUIREMENT and surfaces it for institutional action.

### LIV.2 INTEGRATION REQUIREMENT Record

```
+======================================================================+
|                      INTEGRATION REQUIREMENT                          |
+======================================================================+
| Requirement ID        | IR-YYYY-NNNNN                                  |
| Detected At           | <timestamp>                                    |
| Detecting Workflow    | <workflow identifier>                          |
| Source Institution    | <institution>                                 |
| Source System         | <system>                                      |
| Required Data         | <canonical data description>                   |
| Purpose               | <workflow purpose, evidence-linked>            |
| Urgency               | BLOCKING / HIGH / NORMAL / LOW                 |
| Dependency            | <upstream workflow / case / decision depending on data> |
| Authorization Status  | NOT_REQUESTED / REQUESTED / GRANTED / DENIED   |
| Proposed Connector    | <proposed connector type and protocol>         |
| Status                | OPEN / IN_DESIGN / IN_SANDBOX / CERTIFIED / PRODUCTION |
+======================================================================+
```

### LIV.3 Discovery Triggers

An INTEGRATION REQUIREMENT may be raised by: a workflow that fails to resolve a required data field against the System of Record Registry; an institutional user attempting to refer to an external system not represented in the registry; a case or investigation listing a dependency on a non-connected source; a service-level agreement requiring lookup against an external system; or an audit finding identifying a missing authoritative source.

### LIV.4 Urgency Classification

| Urgency | Definition | Required Response Window |
|---|---|---|
| `BLOCKING` | Workflow cannot proceed without this data; case may be statutorily time-bound. | 24 hours acknowledgment; 7 days plan. |
| `HIGH` | Workflow materially degraded without this data; alternate manual path available but costly. | 72 hours acknowledgment; 14 days plan. |
| `NORMAL` | Workflow can proceed; integration improves quality or efficiency. | 7 days acknowledgment; 60 days plan. |
| `LOW` | Strategic integration; no immediate operational dependency. | 30 days acknowledgment; 180 days plan. |

### LIV.5 Authorization Path

An INTEGRATION REQUIREMENT does not authorize itself. The lifecycle is:

```
NOT_REQUESTED -> REQUESTED -> [GRANTED | DENIED] -> [CERTIFIED | RETIRED]
```

A requirement with status `REQUESTED` MUST NOT trigger any connector build. A requirement with status `GRANTED` enters the Integration Sandbox pipeline (Part LII) and proceeds toward certification (Part LIII). A requirement with status `DENIED` MUST be recorded with the denying authority and rationale, and the originating workflow MUST be marked `DATA_UNAVAILABLE` rather than silently substituting data.

### LIV.6 Visible to Operations

Open INTEGRATION REQUIREMENTs MUST appear on the Government Integration Control Tower (Part LI) under the Pending Authorization surface, with the originating workflow and dependency links visible to authorized operators.

---

## PART LV — Missing-System Map

### LV.1 Purpose

The Missing-System Map answers a single question for every active case and every active workflow: *which systems does this case depend on, and what is the operational state of each dependency?*

### LV.2 Required State Categories

For each case or workflow, the Missing-System Map MUST classify every dependency into one of exactly five states:

- **Connected** — source system is connected, healthy, authorized, within SLA. Data fetch is available.
- **Degraded** — source system is reachable but degraded (Part LI). Data fetch may succeed with reduced confidence, increased latency, or partial payload. Operators are warned.
- **Unavailable** — source system is unreachable or has explicitly failed health probes. Fallback procedures (manual or offline) must be invoked where available.
- **Not Integrated** — Circle has no connector for this system. The dependency is recorded as an INTEGRATION REQUIREMENT (Part LIV) but no live data path exists.
- **Authorization Required** — Circle has a connector, but the connector's authorization scope does not cover this case or workflow. Authorization must be requested and granted before the connector may be used.

### LV.3 Visualization

```
+==========================================================================+
|                    MISSING-SYSTEM MAP — Case #2025-0431                   |
+==========================================================================+
| Dependency                | Source System | State             | Action      |
|---------------------------|---------------|-------------------|-------------|
| Civil registry lookup     | CIVIL-REG     | Connected         | none        |
| Tax status verification   | ETA           | Degraded          | monitor     |
| Customs declaration pull  | NAFEZA        | Unavailable       | fallback    |
| Court docket              | COURTS-EG     | Not Integrated    | IR open     |
| Police report attachment  | POLICE-IMS    | Authorization Req | request auth|
+==========================================================================+
```

### LV.4 Per-Workflow Roll-Up

The Missing-System Map MUST roll up to workflow-level state. A workflow is `READY` if all dependencies are `Connected`; `PARTIAL` if any dependency is `Degraded`; `BLOCKED` if any dependency is `Unavailable`, `Not Integrated`, or `Authorization Required`. Workflow state MUST be visible to the operator before any irreversible action is taken on the workflow. A `BLOCKED` workflow MUST NOT be silently auto-proceeded; an explicit operator override is required, and the override is itself audit evidence.

### LV.5 Evidence Linkage

Each entry in the Missing-System Map is evidence-linked. The state of a dependency at the moment a workflow decision was made is retained as part of the workflow's audit trail and may be reviewed by ACA under Part II.

---

## PART LVI — Citizen Service Directory

### LVI.1 Principle

Citizens must be able to discover, with confidence, what official services exist, which institution is responsible, and through which channels those services may be accessed. Unofficial information MUST NOT be represented as official.

### LVI.2 Directory Schema

The Citizen Service Directory is a machine-readable directory. Each entry MUST carry, at minimum:

| Field | Type | Notes |
|---|---|---|
| Official Service | string | Canonical service name in Arabic and English |
| Responsible Institution | ref | Institution identifier from Government Master Data (Part LXVII) |
| Department | ref | Department within the institution |
| Channel | enum | Portal / Mobile App / Phone / In-Person / Mail / Kiosk / API |
| Phone | string | E.164 formatted where possible |
| Website | URI | Official domain only |
| Physical Location | geo + address | Geo coordinates plus structured address |
| Emergency Number | string | If applicable; distinct from general phone |
| Hours | schedule | Opening hours, including exceptions and holidays |
| Geographic Coverage | geo | National / Governorate / District / localized |
| Accessibility | enum set | Wheelchair / Sign language / TTY / Multilingual staff / Remote |
| Languages | enum set | Arabic / English / other supported languages |
| Last Verified Date | date | Per Part XLVIII |

### LVI.3 Provenance Requirement

Every directory entry MUST carry provenance: the institution that asserted the entry, the date of assertion, and the verification method (e.g., institutional API, signed manifest, manual attestation by an authorized officer). Entries without provenance MUST NOT be published as official.

### LVI.4 Non-Official Representation Rule

> No unofficial information may be represented as official.

Concretely: a directory entry marked official MUST have provenance from the responsible institution or its authorized delegate. Third-party information (e.g., a community-compiled list of clinics) may be shown but MUST be visually and structurally separated from official entries and labeled `UNOFFICIAL` or `COMMUNITY`. Citizen-submitted updates (Part LVIII) are routed to the responsible institution for verification and do not directly modify the official directory.

### LVI.5 Last Verified Surface

Every official entry surfaces a `Last Verified` date (per Part XLVIII). Entries whose Last Verified date is older than the institutional threshold (default 90 days) MUST be flagged for re-verification and visually marked as `Verification Overdue` to citizens.

### LVI.6 Machine-Readability

The directory is published as a machine-readable resource (canonical JSON-LD with stable IRIs) so that institutional systems, ACA, and authorized third-party integrations may consume it programmatically. The schema is versioned, and schema changes follow the Schema Change Sentinel process (Part L).

### LVI.7 Accessibility and Language

The directory MUST be accessible to citizens with disabilities and MUST be available in Arabic and English at minimum. Service entries that declare accessibility capabilities are themselves verified periodically; an institution claiming `Wheelchair` accessibility that fails citizen-reported verification triggers a service-health signal under Part LVIII and Part LIX.

---

## PART LVII — Service Channel Health

### LVII.1 Principle

Where technically possible, Circle surfaces the live health of each channel through which an official service is offered. This is the citizen-facing complement to the operator-facing Integration Control Tower (Part LI).

### LVII.2 Channel Health States

| State | Meaning | Citizen-Facing Display |
|---|---|---|
| `AVAILABLE` | Channel is operating normally; probes pass. | "Available" |
| `DEGRADED` | Channel is operating with reduced reliability or partial functionality. | "Degraded — may be slow or partial" |
| `UNAVAILABLE` | Channel is down; service cannot be completed through this channel. | "Unavailable — try alternate channel" |
| `REQUIRES_LOGIN` | Channel is up but requires citizen authentication. | "Available — sign-in required" |
| `MANUAL` | Channel is up but transaction requires manual processing (e.g., in-person). | "Available — manual processing" |
| `EMERGENCY_ONLY` | Channel restricted to emergency use only (e.g., during incident). | "Emergency use only" |

### LVII.3 Probe Sources

Channel health is derived from: institutional probes against the channel endpoint, where the institution exposes one; Control Tower (Part LI) integration state where the channel depends on a connected system; citizen reports (Part LVIII) corroborated against probe data; and the institution's own published status feed, where one exists.

### LVII.4 Where Not Technically Possible

Where a channel cannot be probed (e.g., an in-person counter with no digital presence), the directory entry MUST display `Last Verified` (Part XLVIII) and NOT fabricate a live state. Operators and citizens see the most recent verified state and the date of verification, not a misleading "green" status.

### LVII.5 Emergency Override

An institutional administrator may set a channel to `EMERGENCY_ONLY` to throttle non-essential traffic during an incident. This override is recorded in the audit ledger with the administrator identity, rationale, and expected duration. The override is visible to ACA under Part II.

---

## PART LVIII — Service Outage Reporting

### LVIII.1 Principle

Citizens are sensors. When a government digital service fails, the citizen who experiences the failure is often the first to know. Circle provides a structured channel for citizens to report outages, and routes those reports to the appropriate authority.

### LVIII.2 Report Categories

Citizens may report any of the following outage categories:

- `PORTAL_UNAVAILABLE` — government portal cannot be reached
- `SERVICE_FAILURE` — service reachable but did not complete
- `TRANSACTION_FAILURE` — transaction initiated but did not complete or confirm
- `QUEUE_MALFUNCTION` — physical or digital queue system not operating
- `PAYMENT_PROBLEM` — payment failed, double-charged, or refunded incorrectly
- `BROKEN_WEBSITE` — website rendering broken, links dead, forms non-functional
- `TECHNICAL_OUTAGE` — generalized technical outage, category unspecified

### LVIII.3 Report Schema

Each citizen report carries: category (from the list above); affected service (from the Citizen Service Directory, Part LVI); channel affected (Portal / App / Phone / In-person / Kiosk / API); observation timestamp; optional citizen identifier (reports may be pseudonymous); optional supporting evidence (screenshot, error code, reference number); severity as perceived by citizen (LOW / MEDIUM / HIGH / BLOCKING); routing target (resolved by the directory's responsible institution).

### LVIII.4 Routing

Reports are routed to the institution responsible for the affected service (per Part LVI), with a copy retained in the Circle audit ledger. The institutional operator receives the report on its operational surface and MUST acknowledge within the institutional SLA window. Acknowledgement and resolution status are visible to the reporting citizen where the citizen provided a contact channel.

### LVIII.5 Cross-Referencing

Citizen reports are cross-referenced against: Control Tower (Part LI) integration state at the reported time; Channel Health (Part LVII) probe data at the reported time; and other citizen reports within a time and geography window. A single report does not, by itself, constitute an outage. Multiple corroborated reports, or a report corroborated by probe data, escalate to a confirmed outage and feed the Government Digital Health Radar (Part LIX).

### LVIII.6 No Retaliation

Citizens reporting outages in good faith MUST NOT be subject to retaliatory action. Reports are pseudonymous by default; explicit citizen consent is required before identity is disclosed to the institution beyond the minimum necessary to investigate.

---

## PART LIX — Government Digital Health Radar

### LIX.1 Principle

The Government Digital Health Radar aggregates authorized data from the Control Tower, the Service Channel Health surface, the Citizen Outage Reporting stream, and institutional feeds to detect systemic patterns across the federated government digital estate.

### LIX.2 Detection Targets

The Radar is configured to detect, at minimum: repeated outages affecting the same service or institution; transaction failures clustering by channel, geography, or time; service abandonment patterns (e.g., citizens beginning but not completing transactions); complaint volume spikes; processing delays breaching SLA thresholds; and overdue information requests against external systems (Part LI).

### LIX.3 Intelligence Products

| Product | Trigger | Consumer | Sensitivity |
|---|---|---|---|
| Daily Service Health Briefing | scheduled | Institutional operations | Operational |
| Outage Pattern Alert | threshold breach | Institutional operations + ACA (summary) | Operational |
| Transaction Failure Cluster | spatial / temporal clustering | Institutional operations | Operational |
| Abandonment Trend Report | trend over rolling window | Institutional leadership | Operational |
| Complaint Volume Spike | threshold breach | Institutional operations + ACA (summary) | Operational |
| Processing Delay Breach | SLA breach | Institutional operations + ACA (summary) | Operational |
| Systemic Issue Candidate | repeated cross-institutional pattern | ACA | Investigative |

### LIX.4 Authorization Boundaries

The Radar operates strictly within institutional authorization boundaries. It does NOT receive raw citizen data. It receives aggregated, authorized signals: outage counts by service and channel; transaction failure counts (without citizen identifiers); SLA breach counts and durations; complaint counts (without complaint content); abandonment counts (without citizen identifiers). Where the Radar's aggregation would require access to citizen-identifying data, the aggregation MUST be performed inside the responsible institution's data plane (Part LXVIII) and only the resulting aggregate signal is exported to the Radar.

### LIX.5 Service-Health Intelligence

The Radar's outputs constitute service-health intelligence. They are retained per the institutional retention policy, are evidence-linked, and may be reviewed by ACA under Part II. They MAY also, where appropriate, escalate to a controlled ACA Signal under Part LX.

---

## PART LX — Citizen → Service → ACA

### LX.1 Principle

When a government service repeatedly fails, that is not merely an operational problem; it is a potential accountability problem. Part LX defines the controlled path by which service failure intelligence reaches ACA, while preserving citizen privacy and preventing the wholesale forwarding of citizen history.

### LX.2 Escalation Path

```
+======================================================================+
|                 CITIZEN -> SERVICE -> ACA ESCALATION                 |
+======================================================================+

  [Citizen experiences failure]
              |
              v
  [Citizen Shield records report]   <-- pseudonymous by default
              |
              v
  [Service Intelligence aggregates] <-- Radar (Part LIX) + reports (LVIII)
              |
              v
  [Repeated pattern detected?]
        |             |
        | NO          | YES
        v             v
   [Operational    [Systemic Issue Candidate generated]
    handling]
                      |
                      v
              [Controlled ACA Signal]
                      |
                      v
              [ACA investigation under Part II — receives only
               the systemic issue candidate record, NOT the
               underlying citizen histories]
```

### LX.3 Citizen Shield

The Citizen Shield is the protective layer between citizen reports and downstream consumers. It guarantees: citizen reports are pseudonymous by default; no citizen identifier crosses into ACA unless explicitly authorized; aggregate patterns are derived without exposing individual citizen histories; citizens may attach consent to share additional context, and absent that consent, only the systemic pattern reaches ACA.

### LX.4 Systemic Issue Candidate

A Systemic Issue Candidate is a structured record containing: the affected service(s) and institution(s); the failure pattern observed (categories, frequency, geography, time); the duration of the pattern; the affected citizen count (aggregate, not identifying); the originating reports (counts, not contents); the corroborating Radar intelligence products; and the proposed ACA investigation scope.

### LX.5 Controlled ACA Signal

The ACA Signal is the controlled transmission of a Systemic Issue Candidate from the operational plane to the ACA investigation plane. It carries only the systemic record. ACA does NOT automatically receive: the underlying citizen reports; citizen identifiers; citizen histories; any data outside the scope of the systemic issue candidate. If during investigation ACA determines that specific citizen records are required, ACA must invoke the formal retrieval process under Part II, with institutional authorization and citizen notice where required by law.

### LX.6 Non-Negotiable Rule

> ACA does NOT automatically receive the entire citizen history.

This rule is non-negotiable. Any architectural component, integration, or operator workflow that would result in automatic bulk forwarding of citizen data to ACA is a violation of Part LX and MUST be reported as an institutional incident under Part LXXX.

---

## PART LXI — Institutional AI Separation

### LXI.1 Principle

Circle does NOT create one universal government AI with unrestricted access to all institutional data. Such an AI would be a concentration of power incompatible with the federated sovereign architecture and with the institutional accountability model of Part II. Instead, each institution receives a policy-controlled AI scoped to its domain, with its own data boundary, policy envelope, and audit trail.

### LXI.2 Institutional AI Inventory

| AI | Scope | Permitted Domain | Data Boundary | Owner |
|---|---|---|---|---|
| ACA AI | Oversight and investigation | Anti-corruption investigation, evidence analysis, pattern detection across authorized institutional data | ACA Data Plane (Part LXVIII) | ACA |
| Police AI | Policing and investigation | Law enforcement investigation, case analytics, authorized policing operations | Police Data Plane | Police |
| EMS AI | Medical and emergency operations | Emergency medical dispatch, clinical decision support within scope, resource allocation | EMS Data Plane | EMS |
| Civil Protection AI | Civil protection and disaster response | Disaster response coordination, resource allocation, hazard modeling | Civil Protection Data Plane | Civil Protection |
| Health AI | Public health and healthcare | Public health analytics, authorized clinical support | Health Data Plane | Health Authority |
| Traffic AI | Traffic and transport | Traffic management, incident response, authorized enforcement | Traffic Data Plane | Transport Authority |
| Other Institutional AI | Respective institutional domain | Domain-specific operations per institutional charter | Respective data plane | Institution |

### LXI.3 Isolation by Policy and Data Boundary

Each institutional AI is isolated by two complementary mechanisms: **Policy isolation** — the AI's permitted actions, data access scope, and automation levels (Part LXXXII) are defined by institutional policy, enforced by the AI Data Access Broker (Part LXIII), and cannot be widened by the AI itself; **Data boundary isolation** — the AI's retrieval and training data are constrained to the institutional data plane (Part LXVIII). Cross-plane access requires explicit authorization through the AI Data Firewall (Part LXIII).

### LXI.4 No Universal AI

There is no `CIRCLE_GOVERNMENT_UNIVERSAL_AI` construct. There is no AI that combines policing, medical, tax, and civil registry data into a single reasoning surface. Cross-institutional intelligence products (e.g., the Radar, Part LIX) are aggregate, authorized, and policy-controlled; they are NOT a universal AI.

### LXI.5 Audit Separation

Each institutional AI maintains its own audit trail within its data plane. Audit records are accessible to ACA under Part II through formal retrieval; they are NOT pooled into a shared AI audit surface.

---

## PART LXII — Universal Circle AI vs Institutional AI

### LXII.1 Principle

The public-facing Circle AI that assists citizens in their daily lives is categorically separate from the government institutional AI that operates on institutional data, which is in turn categorically separate from the ACA investigation AI.

### LXII.2 Three Separate AI Tiers

- **PUBLIC CIRCLE AI** — Serves citizens in non-governmental contexts (general knowledge, lifestyle, utility, accessibility support). Does NOT have access to institutional data planes or to ACA investigation data. Trained on public, licensed, or citizen-consented data only. May answer citizen questions about official services by reading the Citizen Service Directory (Part LVI), but does NOT reason over institutional records.
- **GOVERNMENT INSTITUTIONAL AI** — Serves a specific institution within its domain (Part LXI). Has access to that institution's data plane only. May not exceed its institutional automation level (Part LXXXII). All accesses mediated by the AI Data Firewall (Part LXIII).
- **ACA INVESTIGATION AI** — Serves ACA in its oversight and investigation role. Has access to ACA Data Plane and to formally retrieved institutional records under Part II. Operates under the strictest automation level constraints; primarily Level 0–2 (Part LXXXII). Its outputs are evidence-linked and auditable; outputs may form part of an ACA investigation record.

### LXII.3 Non-Mixing Rule

> Training data, retrieval data, prompts, and model weights MUST NOT be shared across the three tiers without explicit authorization.

Concretely: Public Circle AI MUST NOT be fine-tuned on institutional data without institutional authorization AND citizen consent where applicable. Government Institutional AI MUST NOT be trained on ACA investigation data. ACA Investigation AI MUST NOT be trained on raw citizen data sourced from institutional planes; only formally retrieved, scoped investigation data may be used, and only where authorized.

### LXII.4 Operational Separation

The three tiers run in separate deployments, separate namespaces, separate model registries (Part LXXVII), and separate audit surfaces. There is no shared runtime, no shared inference cache, and no shared prompt history.

### LXII.5 Cross-Tier Communication

Where cross-tier communication is genuinely required (e.g., the Public Circle AI referring a citizen to an institutional service), it occurs through structured, audited, policy-controlled channels — not through shared model state. The referral itself is recorded; the underlying data contexts are not shared.

---

## PART LXIII — AI Data Firewall

### LXIII.1 Principle

Every institutional AI request traverses a deterministic, policy-enforced path. The AI never reads institutional data directly; it reads only what the AI Data Access Broker authorizes it to read, and every output it produces is evidence-linked.

### LXIII.2 Flow

```
+======================================================================+
|                   AI DATA FIREWALL — REQUEST FLOW                    |
+======================================================================+

  [Institutional User / Workflow]
              |
              |  AI request (with institution, purpose, scope)
              v
  +-------------------------+
  |  Policy Engine          |  <- institutional policy, automation level,
  |                         |     data plane authorization, purpose check
  +-------------------------+
              |
              |  authorized scope (or DENY)
              v
  +-------------------------+
  |  AI Data Access Broker  |  <- broker holds credentials, retrieves
  |                         |     only authorized records from the
  |                         |     institutional data plane
  +-------------------------+
              |
              |  authorized information (evidence-linked)
              v
  +-------------------------+
  |  Institutional AI       |  <- model reasons only over brokered data
  +-------------------------+
              |
              |  AI output (with provenance + citations)
              v
  +-------------------------+
  |  Evidence Linker        |  <- every claim in the output is linked
  |                         |     to a brokered evidence record
  +-------------------------+
              |
              v
  [Evidence-linked answer delivered to caller]
              |
              v
  [Audit ledger entry written]
```

### LXIII.3 Components

- **Policy Engine** — Holds institutional policy, automation level (Part LXXXII), data plane authorization, and purpose-bound rules. Every request MUST declare a purpose; the Policy Engine refuses requests that do not match an allowed purpose.
- **AI Data Access Broker** — The ONLY component with credentials to read from the institutional data plane. The AI itself does NOT have data plane credentials. The Broker retrieves only the records the Policy Engine authorizes, in the minimum scope necessary, and returns them to the AI as brokered context.
- **Institutional AI** — The model itself. Receives brokered context, reasons over it, and produces output. The AI MUST NOT be granted direct data plane access under any circumstance.
- **Evidence Linker** — Post-processes AI output to ensure that every material claim is linked to a brokered evidence record. Claims without evidence linkage are flagged as `UNVERIFIED` and MUST NOT be presented as authoritative.

### LXIII.4 Denial and Audit

If the Policy Engine denies a request, the denial is recorded with the requesting identity, purpose, and the policy rule that triggered the denial. Denials are themselves audit evidence and visible to ACA under Part II.

### LXIII.5 No Live Data Plane Access

The AI Data Firewall is the sole mechanism by which an institutional AI reaches institutional data. Any architectural component that attempts to grant an AI direct data plane access is in violation of Part LXIII and MUST be disabled via the AI Kill Switch (Part LXXXI).

---

## PART LXIV — Government Data Clean Room

### LXIV.1 Principle

Some institutional questions require reasoning across multiple institutions' data without exposing all underlying identity or records to any single party. The Government Data Clean Room supports these sensitive multi-party analytics.

### LXIV.2 Clean Room Architecture

```
+======================================================================+
|                  GOVERNMENT DATA CLEAN ROOM                          |
+======================================================================+

  +-------------------+   +-------------------+   +-------------------+
  | Institution A     |   | Institution B     |   | Institution C     |
  | Data Plane        |   | Data Plane        |   | Data Plane        |
  +-------------------+   +-------------------+   +-------------------+
            |                       |                       |
            | (a) authorized        | (a) authorized        | (a) authorized
            |     projection        |     projection        |     projection
            v                       v                       v
  +-------------------------------------------------------------------+
  |                  CLEAN ROOM (isolated compute)                    |
  |                                                                   |
  |  - pseudonymous identifiers (Part LXV)                            |
  |  - approved query set only                                        |
  |  - no raw identity leaves a plane                                  |
  |  - no individual records visible to other institutions            |
  |  - only aggregate results exit                                    |
  |                                                                   |
  +-------------------------------------------------------------------+
                                |
                                | (b) aggregate, authorized result
                                v
                       [Authorized consumers]
                                |
                                v
                       [Audit ledger: every query recorded]
```

### LXIV.3 Permitted Operations

Inside the Clean Room, only operations explicitly approved in the Clean Room Query Manifest are permitted. The manifest defines: which projections each institution contributes; which pseudonymous linkage keys (Part LXV) may be used for matching; which aggregate queries are permitted; minimum cohort sizes (to prevent re-identification through small cells); and output noise requirements where appropriate.

### LXIV.4 No Raw Identity Exit

Raw identity does NOT leave an institution's data plane into the Clean Room. Pseudonymous identifiers are used for cross-institutional matching where appropriate (Part LXV). Individual-level records visible to other institutions are NOT permitted; only aggregate results exit.

### LXIV.5 Audit

Every Clean Room query is recorded in the audit ledger with: the query identifier, the institutions whose projections were used, the requesting authority, the timestamp, the result cohort sizes (pre-noise), and the output delivered. ACA may review Clean Room audit records under Part II.

### LXIV.6 Authorization

Clean Room queries require explicit authorization from each contributing institution. The authorization is per-query or per-authorized-query-set; there is no standing authorization that allows arbitrary cross-institutional analytics.

---

## PART LXV — Pseudonymous Federated Linkage

### LXV.1 Principle

Cross-system matching of records about the same real-world entity is sometimes necessary (e.g., to detect that the same company appears in tax records and customs records under slightly different names). Where such matching is legally and technically appropriate, it MUST be performed using controlled, pseudonymous identifiers — not by silently merging identities.

### LXV.2 Pseudonymous Linkage Key

A Pseudonymous Linkage Key (PLK) is a controlled identifier derived from real-world identity attributes under a key-derivation function governed by institutional policy. The PLK: is derived from attributes agreed by the participating institutions; does NOT reveal the underlying identity attributes; is revocable and rotatable; is logged when used for matching; and is institution-specific (an ACA PLK is not the same as a Police PLK; cross-plane PLK sharing requires explicit authorization).

### LXV.3 Matching Process

```
  [Institution A record]            [Institution B record]
        |                                   |
        v                                   v
  [Derive PLK_A under policy A]   [Derive PLK_B under policy B]
        |                                   |
        +-------------+   +-----------------+
                      |   |
                      v   v
              [Controlled matching surface]
                      |
                      v
              [Match result: EXACT / HIGH / POSSIBLE / UNRESOLVED]
                      |
                      v
              [Linked record carries match result and provenance;
               does NOT silently merge identities]
```

### LXV.4 Non-Silent-Merge Rule

> Do NOT silently merge identities.

A match — even an EXACT match — does NOT cause Institution A and Institution B records to be merged into a single shared record. The match is recorded as a linkage assertion, with provenance, and is visible as a linkage rather than as a unified identity. Operators and downstream systems see "these two records likely refer to the same entity" rather than "this is one record."

### LXV.5 Re-Identification Prevention

Pseudonymous linkage is designed to support operational matching (e.g., entity resolution, Part LXVI) without enabling re-identification. The architecture MUST prevent reverse-derivation of identity attributes from PLKs except through the formal retrieval process governed by institutional policy and Part II.

### LXV.6 Audit

Every PLK derivation, every match, and every linkage assertion is recorded in the audit ledger. ACA may review linkage assertions under Part II.

---

## PART LXVI — Entity Resolution

### LXVI.1 Principle

Real-world entities — people, organizations — appear under different names, spellings, transliterations, and historical forms across different systems. Entity Resolution provides a structured, auditable way to determine whether two records refer to the same entity, without ever silently merging uncertain matches.

### LXVI.2 Variants Supported

The Entity Resolution engine MUST support: Arabic variants (different Arabic spellings of the same name); English transliterations (multiple valid transliterations of an Arabic name into Latin script); aliases (known aliases for individuals or organizations); company-name variations ("Acme", "Acme LLC", "Acme, LLC", "Acme Limited"); abbreviations ("UNDP" vs "United Nations Development Programme"); and historical names (a company that changed its name).

### LXVI.3 Output Classification

Every entity-resolution attempt produces one of exactly four outputs:

| Output | Definition | Action |
|---|---|---|
| `EXACT_MATCH` | Records provably refer to the same entity (e.g., same national identifier, same registered company number). | Linkage asserted; provenance recorded. |
| `HIGH_CONFIDENCE_MATCH` | Records very likely refer to the same entity based on multiple corroborating attributes. | Linkage asserted with confidence; provenance recorded; flagged for periodic re-verification. |
| `POSSIBLE_MATCH` | Records may refer to the same entity but uncertainty remains. | Linkage NOT asserted. Surface as a possible-match candidate to authorized operator. |
| `UNRESOLVED` | Records cannot be matched with any confidence. | No linkage. Records remain independent. |

### LXVI.4 Non-Silent-Merge Rule

> NEVER silently merge uncertain entities.

A `POSSIBLE_MATCH` MUST NOT result in records being merged or treated as the same entity by downstream systems. It MUST be surfaced to an authorized operator for human review, and the outcome of that review is recorded as audit evidence. An `UNRESOLVED` result MUST NOT trigger any default merge behavior. Records remain independent.

### LXVI.5 Audit and Provenance

Every entity-resolution decision carries: input records (with provenance); attributes compared; comparison method; output classification; confidence score (where applicable); reviewer identity (for `POSSIBLE_MATCH` resolutions); and timestamp.

### LXVI.6 Cross-Institutional Entity Resolution

Cross-institutional entity resolution uses pseudonymous linkage (Part LXV) where appropriate. It does NOT transmit raw identity attributes across institutional boundaries without explicit authorization.

---

## PART LXVII — Government Master Data

### LXVII.1 Principle

A federated government deployment requires a canonical reference for the real-world entities that government acts upon: people, organizations, agencies, offices, services, addresses, document types, and service names. The Government Master Data Engine provides this canonical reference, while preserving source ownership and provenance.

### LXVII.2 Master Data Domains

| Domain | Examples | Authority |
|---|---|---|
| People | Citizens, residents, officials (as institutional actors) | Civil registry; institutional HR where applicable |
| Organizations | Companies, NGOs, public-sector bodies | Company registry; NGO registry; institutional charter |
| Agencies | Government agencies, authorities, directorates | Establishment decree; institutional charter |
| Offices | Physical offices of agencies | Institution |
| Services | Official services offered to citizens | Responsible institution (Part LVI) |
| Addresses | Canonical addresses | Address authority |
| Document Types | Document types (e.g., national ID, passport, tax card) | Issuing authority |
| Service Names | Canonical names of services (Arabic + English) | Responsible institution |

### LXVII.3 Engine Properties

The Government Master Data Engine: holds canonical records for each domain; retains source ownership (every assertion in a master record carries the source institution that asserted it); retains provenance (every value carries the source system, source record, fetch timestamp, and schema version); supports version history (prior values are retained, not overwritten); and supports authoritative override (where multiple sources assert conflicting values, the authoritative source per the System of Record Registry, Part XLVII, takes precedence; conflicts are surfaced per Part XLIX, not silently resolved).

### LXVII.4 Source Ownership

Master data does NOT centralize authority. The Engine is a reference and reconciliation surface, not a new system of record. Each master record points back to its authoritative source. Updates flow from the source; the Engine reflects, it does not author.

### LXVII.5 Access

Access to the Engine is governed by institutional policy and the AI Data Firewall (Part LXIII). The Engine is the canonical reference used by the Citizen Service Directory (Part LVI), the Entity Resolution engine (Part LXVI), and the data planes (Part LXVIII).

### LXVII.6 Audit

Every read of a master record by an institutional system is recorded in the audit ledger with the reading system, the purpose declared, and the timestamp. Bulk reads and unusual access patterns are flagged per Part LXXXIII-style security monitoring.

---

## PART LXVIII — Government-Specific Data Planes

### LXVIII.1 Principle

Different institutions have fundamentally different data sensitivity, retention, identity, encryption, and audit requirements. A single shared data plane is neither appropriate nor permissible. The architecture MUST allow each institution to operate its own data plane with its own controls.

### LXVIII.2 Data Plane Catalog

| Data Plane | Owner | Primary Data Classes | Sensitivity | Example Retention |
|---|---|---|---|---|
| ACA Data Plane | ACA | Investigation records, evidence, findings, signals | Highest | Permanent (evidence retention) |
| Police Data Plane | Police | Case records, investigative data, operational policing data | Very High | Per criminal code |
| EMS Data Plane | EMS | Emergency medical dispatch, clinical records | Very High | Per health record law |
| Civil Protection Data Plane | Civil Protection | Disaster response, hazard data, resource allocation | High | Operational + statutory |
| Traffic Data Plane | Transport Authority | Traffic data, violations, vehicle data | Medium-High | Per transport law |
| Health Data Plane | Health Authority | Public health, clinical, population health | Very High | Per health record law |
| Other Institutional Data Planes | Respective institution | Domain-specific data | Per institution | Per institutional policy |

### LXVIII.3 Per-Plane Distinct Controls

Each data plane MAY have distinct configurations for:

| Control | Description | Why Plane-Local |
|---|---|---|
| Encryption | At-rest and in-transit encryption algorithms, key rotation policy | Different planes may use different HSMs / sovereign encryption stacks |
| Storage | Storage backend, region, replication policy | Sensitive planes may require in-country sovereign storage |
| Identity | Identity provider, MFA requirements, role definitions | Each institution operates its own identity regime |
| Policies | Access policies, purpose-bound rules | Institution-specific legal and operational mandates |
| Audit | Audit storage, retention, access rules | Plane-local audit prevents cross-plane leakage |
| Retention | Record retention schedules | Distinct statutory retention per domain |

### LXVIII.4 Plane Isolation

Data planes are isolated at the network, identity, encryption, and policy levels. A process running in one data plane does NOT have implicit access to another data plane. Cross-plane access requires explicit authorization through the AI Data Firewall (Part LXIII), the Clean Room (Part LXIV), or a formal ACA retrieval under Part II.

### LXVIII.5 Shared Services vs Plane-Local Services

Some services (e.g., the Government Master Data Engine, the Citizen Service Directory) are shared references. Shared services are themselves isolated from plane-local data; they hold canonical references, not plane-local records. Plane-local data is never replicated into shared services.

### LXVIII.6 Audit Plane Locality

Audit records for plane-local operations are stored plane-locally. ACA may retrieve audit records across planes under Part II, but the audit records are not pooled into a shared audit store by default.

---

## PART LXIX — Federation Does Not Mean Centralization

### LXIX.1 Principle

Federation is a model of controlled communication among sovereign systems. It is NOT a euphemism for centralization. Circle's federated architecture permits institutions to cooperate without surrendering their data, their authority, or their autonomy.

### LXIX.2 Statement

> Federation permits controlled communication among sovereign systems without requiring all data to be stored in one centralized system.

This statement is the architectural posture of Circle's federated sovereign government deployment. Every component, integration, and operator workflow MUST be consistent with this posture.

### LXIX.3 Implications

- No institution is required to surrender its data to a central store to participate in federation.
- No institution is required to adopt another institution's identity regime.
- Cross-institutional cooperation occurs through authorized, audited, policy-controlled channels — not through unified data lakes.
- Aggregate intelligence products (e.g., the Radar, Part LIX) operate on authorized aggregates, not on pooled raw data.
- ACA investigation access is formal retrieval under Part II, not standing bulk access.

### LXIX.4 Anti-Patterns

The following are explicit anti-patterns and MUST NOT be implemented: a central "government data lake" into which all institutional data is replicated; a universal AI with cross-plane data access (Part LXI); a shared identity provider that supersedes institutional identity regimes; a shared audit store that pools audit records across planes by default; or a "single pane of glass" operator surface that hides which institution's data is being viewed or acted upon.

### LXIX.5 Federation Boundary

The federation boundary is the controlled communication surface between sovereign institutional systems. Every interaction across the boundary is authorized, audited, and evidence-linked. The federation does NOT redefine institutional sovereignty; it enables it.

---

## PART LXX — Institutional Deployment Models

### LXX.1 Principle

Different institutions have different operational realities, capabilities, and legal constraints. Circle's federated architecture supports multiple deployment models so that each institution can choose the model appropriate to its sensitivity and capability — without forcing sensitive data into inappropriate environments.

### LXX.2 Supported Deployment Models

| Model | Description | Appropriate For | Not Appropriate For |
|---|---|---|---|
| Government Datacenter | Institution operates Circle components in its own government-operated datacenter | Sensitive institutional data; sovereign control requirements | Small institutions without datacenter capability |
| Sovereign / Private Cloud | Institution operates in a sovereign or private cloud environment meeting institutional security requirements | Institutions needing elasticity with sovereignty | Highly classified data requiring physical datacenter control |
| Isolated Kubernetes / Private Infrastructure | Institution operates isolated Kubernetes clusters or private infrastructure under its own control | Institutions with containerization capability needing isolation | Public multi-tenant cloud for sensitive data |
| Institutional Self-Hosting | Institution self-hosts Circle components on its own infrastructure where appropriate | Institutions with mature IT operations | Institutions without operational capability (consider assisted hosting) |
| Controlled Hybrid | Approved hybrid of the above, with explicit data classification governing placement | Institutions with mixed workloads | Hybrid arrangements without explicit data classification |

### LXX.3 Public Cloud Caveat

> Do NOT assume public cloud is acceptable for sensitive data.

Public cloud deployment for sensitive institutional data is permitted ONLY where: the institution has explicitly authorized public cloud for that data classification; the public cloud tenancy meets institutional security requirements (sovereign region, encryption, identity controls); a documented data classification process has confirmed the data is appropriate for public cloud; and the deployment model has been recorded in the deployment registry.

### LXX.4 Deployment Registry

Every institutional deployment is recorded in the Deployment Registry with: institution; deployment model; components deployed; data classification handled; region(s); security posture summary; certifying officer; last verification date; and linked security boundary definition (Part LXXI).

### LXX.5 Interoperability

Different deployment models MUST interoperate cleanly. Federation (Part LXIX) does NOT require identical deployment models across institutions. Cross-deployment communication uses the federation boundary's authorized, audited channels regardless of the underlying deployment model.

---

## PART LXXI — Institutional Security Boundary

### LXXI.1 Principle

For every institutional deployment, the security boundary MUST be explicitly defined. "We deployed it securely" is not sufficient; the specific boundaries and their enforcement mechanisms MUST be documented, attested, and auditable.

### LXXI.2 Required Boundary Definitions

For every institutional deployment, the following eight boundaries MUST be defined:

| # | Boundary | Definition Requirement |
|---|---|---|
| 1 | Identity Boundary | Which identities are recognized, how they are issued, what MFA is required, how they are revoked |
| 2 | Network Boundary | Network isolation, ingress/egress controls, allowed communication paths |
| 3 | Data Boundary | What data is held, where it is stored, how it is classified, what planes it belongs to |
| 4 | API Boundary | Which APIs are exposed, to whom, under what authorization, with what rate limiting |
| 5 | Evidence Boundary | How evidence is captured, sealed, retained, and retrieved (per Part II) |
| 6 | AI Boundary | Which AI components operate, with what data access scope, under what automation level (Part LXIII, LXXXII) |
| 7 | Audit Boundary | What is audited, where audit records are stored, who can read them, retention schedule |
| 8 | Administrative Boundary | Who has administrative authority, under what dual-control, with what attestation |

### LXXI.3 Boundary Document

Each boundary is documented in a Boundary Document, signed by the institution's Security Officer, and registered in the Deployment Registry (Part LXX). The Boundary Document includes: boundary scope; enforcement mechanism(s); monitoring and alerting; exception handling (and exception audit); review schedule (default: 90 days); and linked incident response procedures (Part LXXX).

### LXXI.4 Boundary Enforcement

Boundaries are enforced by combinations of: network controls (firewalls, segmentation, zero-trust policies); identity controls (MFA, role definitions, just-in-time access); cryptographic controls (encryption, signing, key custody); policy controls (Policy Engine, AI Data Firewall); audit controls (continuous audit logging, anomaly detection); and administrative controls (dual-control, separation of duties, attestation).

### LXXI.5 Boundary Violations

A boundary violation (e.g., an unauthorized cross-plane access attempt, a failed audit log, an AI attempt to bypass the AI Data Firewall) is itself an institutional incident under Part LXXX and MUST be reported, investigated, and remediated.

### LXXI.6 ACA Visibility

ACA may inspect Boundary Documents and boundary-enforcement evidence under Part II as part of an investigation. Boundary violations are admissible investigative evidence.

---

## PART LXXII — Government Device Trust

### LXXII.1 Principle

Official government apps and devices — used by institutional staff to capture evidence, execute workflows, or operate on institutional data — are themselves part of the institutional trust surface. They MUST be registered, certified, and continuously evaluated.

### LXXII.2 Device Trust Properties

For every official government device, the Device Trust Registry MUST record:

| Property | Description |
|---|---|
| Device Registration | Device identifier, ownership, assignment, enrollment date |
| Certificate | Device certificate, issuing authority, validity, revocation status |
| Trust Status | Current trust state (see LXXII.3) |
| Software Version | OS, app version, security patch level |
| Security Posture | Encrypted-at-rest, biometric enabled, remote-wipe capable, jailbreak/root status |
| Assignment | Assigned user / role / institution |
| Revocation | Revocation status, revocation reason, revocation timestamp |

### LXXII.3 Device Trust States

| Trust State | Definition | Permitted Actions |
|---|---|---|
| `TRUSTED` | Device registered, certificate valid, posture healthy, software current | Full institutional actions within role |
| `DEGRADED` | Posture partially compromised (e.g., outdated patch, biometric disabled) | Reduced actions; sensitive actions blocked |
| `UNTRUSTED` | Posture failed (e.g., jailbreak detected, cert expired) | No institutional actions |
| `REVOKED` | Device explicitly revoked (Part LXXIII) | No institutional actions; future evidence capture refused |
| `PENDING_ENROLLMENT` | Device in enrollment flow | No institutional actions until enrollment completes |

### LXXII.4 Continuous Evaluation

Device trust is NOT a one-time check at enrollment. Devices are continuously evaluated: certificate validity is checked on every institutional transaction; posture is re-evaluated on schedule (default: every 24 hours) and on sensitive-action attempt; software version is checked against the institutional minimum (outdated software triggers `DEGRADED`); and jailbreak / root detection runs on every institutional transaction.

### LXXII.5 Evidence Capture Constraint

Only `TRUSTED` devices may capture evidence that becomes part of an institutional or ACA investigation record. `DEGRADED` devices may continue operational actions but evidence captured is flagged `PROVISIONAL` and requires corroboration. `UNTRUSTED` and `REVOKED` devices may NOT capture evidence.

### LXXII.6 Audit

Device trust state transitions are recorded in the audit ledger with the device identifier, prior state, new state, trigger, and timestamp. ACA may review device trust history under Part II.

---

## PART LXXIII — Device Loss / Revocation

### LXXIII.1 Principle

Devices are lost, stolen, and compromised. The architecture MUST support rapid, auditable revocation of a compromised device's trust, including invalidation of its future evidence capture capability.

### LXXIII.2 Revocation Triggers

Revocation is mandatory when any of the following occurs: device reported lost or stolen; device posture compromised (e.g., jailbreak detected); device certificate compromised or issuing authority revokes; assigned user's institutional access revoked; evidence of device-side tampering detected; or institutional administrator initiates revocation for cause.

### LXXIII.3 Revocation Actions

Upon revocation, the following actions MUST be performed, in order:

1. **Revoke credentials** — invalidate device certificates, tokens, and any credentials stored on the device.
2. **Revoke device trust** — set Device Trust State to `REVOKED` in the Device Trust Registry (Part LXXII).
3. **Invalidate future evidence capture** — the device may NOT capture evidence that is accepted into any institutional or ACA record.
4. **Initiate preservation procedures** — preserve any local state, pending syncs, and outstanding evidence captured before revocation, per the institutional preservation procedure.
5. **Remote lock / wipe** — where policy and platform capability allow, remotely lock or wipe the device.

### LXXIII.4 Preservation

Revocation does NOT destroy evidence captured before revocation. Pending syncs from the device are quarantined and reviewed; evidence captured before revocation remains admissible but is flagged with the device's revocation status for evidentiary weighting.

### LXXIII.5 Audit

Every revocation is recorded in the audit ledger with the revoking authority, revocation reason, timestamp, device identifier, and the preservation actions taken. Revocations are visible to ACA under Part II.

### LXXIII.6 Recovery

A revoked device MAY be re-enrolled only through the full institutional enrollment process, with explicit authorization from the institutional Security Officer, and only after the cause for revocation has been remediated or formally accepted.

---

## PART LXXIV — Offline Institutional Operations

### LXXIV.1 Principle

Institutional operations cannot always assume connectivity. Field staff, emergency responders, and rural offices may need to operate offline. The architecture supports offline institutional operations, with strict controls to preserve integrity, prevent replay, and enable safe resynchronization.

### LXXIV.2 Offline Action Requirements

Offline actions MUST carry:

- **local encryption** — all offline-captured data is encrypted at rest on the device, with keys held in the device's secure hardware where available
- **sequence numbers** — monotonically increasing sequence numbers per device, per workflow, to support ordering and duplicate detection
- **signatures** — every offline action is signed by the device certificate (Part LXXII) and the operating user's institutional identity
- **replay protection** — sequence numbers and nonces prevent replay of captured actions during sync
- **integrity checks** — checksums and signatures detect tampering with offline-captured data
- **duplicate detection** — sync engine detects and refuses duplicate submissions, preserving the original
- **synchronization receipts** — once an offline action is synchronized, the device receives a signed synchronization receipt for audit and local cleanup

### LXXIV.3 Offline Trust Boundary

Offline operation requires the device to be `TRUSTED` (Part LXXII) at the moment of capture. A device that becomes `DEGRADED` while offline may continue capturing with `PROVISIONAL` evidence flagging; a device that becomes `UNTRUSTED` or `REVOKED` while offline MUST refuse further capture upon next sync, and any actions captured after the trust-loss event (as best determined by sequence number and timestamp) are quarantined.

### LXXIV.4 Sync Discipline

Synchronization is itself an audited operation. Every sync records: device identifier; user identity; sync timestamp; sequence range synchronized; records accepted; records rejected (with rejection reason); and conflicts raised (Part LXXV).

### LXXIV.5 Conflict Handling

Where offline-captured actions conflict with online state (e.g., another user updated the same record while this device was offline), the conflict MUST be raised per Part LXXV. Offline actions MUST NOT silently overwrite online state, and online changes MUST NOT silently overwrite offline actions.

### LXXIV.6 Retention of Offline State

Offline-captured data is retained on the device until a synchronization receipt is received. Devices with prolonged offline operation MUST enforce a maximum retention window; data exceeding the window without sync MUST be quarantined and surfaced to the institutional administrator.

---

## PART LXXV — Sync Conflict Engine

### LXXV.1 Principle

Offline and online changes MUST NEVER silently overwrite one another. When they conflict, the Sync Conflict Engine produces a structured SYNC CONFLICT record and requires policy-controlled resolution.

### LXXV.2 Conflict Detection

Conflicts are detected by comparing: record identifiers; sequence numbers; timestamps; signatures (to detect tampering); and field-level hashes (to detect partial updates). A conflict is raised when two operations target the same record with incompatible changes that cannot be merged deterministically.

### LXXV.3 SYNC CONFLICT Record

```
+======================================================================+
|                         SYNC CONFLICT                                 |
+======================================================================+
| Conflict ID            | SC-YYYY-NNNNN                                |
| Record Identifier      | <record id>                                  |
| Online Version         | <hash, timestamp, operator, device>          |
| Offline Version        | <hash, timestamp, operator, device>          |
| Conflict Type          | FIELD_OVERWRITE / DELETE_UPDATE /            |
|                        | SEQUENCE_GAP / SIGNATURE_MISMATCH / OTHER     |
| Detected At            | <timestamp>                                  |
| Detecting Component    | Sync Engine                                   |
| Status                 | OPEN / RESOLVED / ESCALATED                  |
| Resolution             | <human or policy resolution + operator>      |
| Evidence Linkage       | <audit hashes of both versions>             |
+======================================================================+
```

### LXXV.4 Conflict Resolution Flow

```
                  [Sync Engine detects conflict]
                              |
                              v
                  [SYNC CONFLICT record created]
                              |
                              +--------------------+
                              |                    |
                  [Auto-resolvable? ]               |
                       |          |                |
                      YES         NO               |
                       |          |                |
                       v          v                |
              [Policy-based    [Surface to         |
               auto-resolution] authorized         |
                       |          operator]         |
                       |          |                |
                       v          v                |
                  [Resolution recorded]            |
                       |                           |
                       v                           |
              [Both versions retained              |
               with resolution provenance]         |
                       |                           |
                       v                           |
              [Audit ledger entry written]         |
                       |                           |
                       v                           |
              [Sync continues with resolved state] |
                                                   v
                                  [If unresolved within SLA:
                                   escalate to institutional
                                   administrator and, if appropriate,
                                   ACA Signal under Part LX]
```

### LXXV.5 Auto-Resolution

A limited set of conflicts may be auto-resolved by policy, where the institution has explicitly authorized auto-resolution for that conflict class. Examples: a status field update from a more recent timestamp overrides an older one (where timestamps are trusted); a delete that supersedes an update (where the institution has authorized this rule). Auto-resolution is the exception, not the default. Every auto-resolution is recorded with the policy rule that authorized it.

### LXXV.6 Manual Resolution

For conflicts not auto-resolvable, an authorized operator reviews both versions and selects a resolution. The operator's identity, the resolution, and the rationale are recorded as audit evidence.

### LXXV.7 Escalation

Unresolved conflicts within the institutional SLA window escalate to the institutional administrator. Where the conflict implicates evidence integrity (e.g., `SIGNATURE_MISMATCH`), it MAY also escalate to a controlled ACA Signal under Part LX.

### LXXV.8 Non-Negotiable Rule

> Offline and online changes must never silently overwrite one another.

This is non-negotiable. Any component that performs silent overwrite is in violation of Part LXXV and MUST be remediated.

---

## PART LXXVI — Security Supply Chain

### LXXVI.1 Principle

The security of Circle's federated deployment depends not only on its own code but on the entire software supply chain that produces it. The SOFTWARE SUPPLY CHAIN SECURITY framework governs that chain end-to-end.

### LXXVI.2 Required Components

| # | Component | Description |
|---|---|---|
| 1 | SBOM | Software Bill of Materials for every Circle component, including transitive dependencies |
| 2 | Dependency Inventory | Current inventory of all dependencies, with versions, sources, and licenses |
| 3 | Vulnerability Monitoring | Continuous monitoring of dependency vulnerabilities against authoritative sources |
| 4 | Signed Builds | Every Circle build is signed; signatures are verified before deployment |
| 5 | Artifact Verification | Deployment artifacts are verified against signatures before installation |
| 6 | Secure CI/CD | CI/CD pipelines hardened, with controlled secrets, isolated runners, and audit logging |
| 7 | Approved Dependencies | Only dependencies on the approved-dependency list may be introduced; new dependencies require security review |

### LXXVI.3 SBOM Requirements

Every Circle component's SBOM MUST include: component identifier and version; direct dependencies (identifier, version, source); transitive dependencies (identifier, version, source) to the deepest available level; licenses; supplier / maintainer; known vulnerabilities at SBOM-generation time; SBOM generation timestamp; and SBOM hash.

### LXXVI.4 Vulnerability Handling

When a vulnerability is disclosed against a dependency in use: the vulnerability monitoring system raises an alert against every affected component (via SBOM lookup); the affected component is flagged `VULNERABLE` in the Deployment Registry; the institutional Security Officer is notified with severity, exposure assessment, and recommended remediation; remediation (patch, version bump, mitigation) is tracked to closure; and until remediation, affected deployments may be flagged `DEGRADED` or restricted per institutional policy.

### LXXVI.5 Approved Dependencies

The Approved Dependencies List is maintained by the institutional Security Officer (or a federated body where multiple institutions share the list). New dependencies require: security review; license review; supplier / maintainer review; and vulnerability history review. Dependencies not on the list MUST NOT be introduced into Circle components deployed to production.

### LXXVI.6 Sovereign Stance

Where commercial standards (e.g., SBOM formats like SPDX or CycloneDX) are referenced, they are candidate implementations; sovereign institutional supply-chain security tooling is always an acceptable substitute provided it meets the equivalent functional requirements.

### LXXVI.7 Audit

SBOMs, dependency inventories, vulnerability alerts, build signatures, and artifact verification records are retained as audit evidence. ACA may review supply-chain integrity records under Part II.

---

## PART LXXVII — Government AI Model Supply Chain

### LXXVII.1 Principle

AI models used by institutions are themselves part of the supply chain. Their provenance, licensing, vulnerabilities, and approval status MUST be governed with the same rigor as software components.

### LXXVII.2 Model Registry

The Model Registry is the authoritative record of every AI model used anywhere in the federated deployment. Each entry MUST carry:

| Property | Description |
|---|---|
| Model identifier | Unique identifier |
| Model origin | Source institution / vendor / training pipeline |
| Version | Model version |
| Hash / Signature | Cryptographic hash and signature of model weights |
| Evaluation | Evaluation results, datasets, metrics, evaluation date |
| License | Model license and usage restrictions |
| Vulnerabilities | Known vulnerabilities, including adversarial weaknesses |
| Approval status | APPROVED / RESTRICTED / RETIRED |
| Authorized uses | Permitted uses by institution and automation level |
| Training data summary | High-level summary of training data sources (no raw data) |
| Provenance chain | Training pipeline provenance, including any fine-tuning lineage |

### LXXVII.3 Model Origin

Model origin MUST be recorded with enough specificity to support accountability. A model's origin includes: who trained or supplied the model; the training pipeline; the training data class (without exposing the underlying raw data); any fine-tuning lineage; and any external dependencies (e.g., base models from external providers).

### LXXVII.4 Vulnerabilities

AI model vulnerabilities include both traditional software vulnerabilities (in the model runtime) and model-specific vulnerabilities: adversarial input weaknesses; prompt-injection susceptibility; data poisoning indicators; known bias issues; known failure modes; and known leakage of training data.

### LXXVII.5 Approval Status

A model's approval status is per-institution. A model approved by the Health Authority is NOT implicitly approved for Police use. Each institution's approval is recorded with: approving authority; approval scope (permitted uses); approval conditions (e.g., automation level cap); approval date; approval validity window; and re-approval trigger conditions.

### LXXVII.6 No Unregistered Models

> No institutional AI model may be deployed to production without a Model Registry entry and a current institutional approval.

This is non-negotiable. Any unregistered model detected in production is an institutional incident under Part LXXX and MUST be removed via the AI Kill Switch (Part LXXXI) pending registry and approval.

---

## PART LXXVIII — Model Change Control

### LXXVIII.1 Principle

AI models change. They are retrained, fine-tuned, replaced, and rolled back. Every material model change MUST follow a controlled pipeline. NO silent model changes are permitted.

### LXXVIII.2 Change Control Pipeline

| Stage | Description | Owner | Output |
|---|---|---|---|
| 1. Evaluation | New / updated model evaluated against authorized evaluation datasets and metrics | Model Steward + Evaluation Team | Evaluation report |
| 2. Security Review | Model reviewed for security vulnerabilities, prompt-injection resistance, data leakage, adversarial weakness | Institutional Security Officer | Security review report |
| 3. Approval | Approving authority approves (or rejects) the model for deployment, with scope and automation level | Approving Authority | Approval record |
| 4. Deployment | Model deployed through secure CI/CD with signed artifacts; deployment recorded in Model Registry | Deployment Engineering | Deployment record |
| 5. Monitoring | Model continuously monitored in production for performance drift, incident indicators, automation-level compliance | Operations | Monitoring feed |
| 6. Rollback | If monitoring indicates a problem, model rolled back to prior approved version; rollback recorded | Operations + Approving Authority | Rollback record |

### LXXVIII.3 Shadow Testing

Before a material model change is approved for full deployment, the new model MUST be shadow-tested against the current model per Part LXXIX. Shadow testing results feed the Evaluation stage of the change control pipeline.

### LXXVIII.4 No Silent Model Changes

> NO silent model changes.

Concretely: a model version change MUST be recorded in the Model Registry before deployment; a model deployment MUST be recorded in the Deployment Registry; a model rollback MUST be recorded in both registries; and operator workflows MUST NOT silently substitute one model version for another without traversing the change control pipeline.

### LXXVIII.5 Audit

Every stage of the change control pipeline produces audit evidence. The audit record includes the model identifier, version, prior version, stage, responsible party, timestamp, and decision (with rationale). ACA may review model change history under Part II.

### LXXVIII.6 Emergency Change Path

Where a model MUST be changed urgently (e.g., a critical vulnerability is discovered), an emergency change path exists but requires: explicit authorization from the institutional Security Officer; immediate post-change review through the full pipeline; recording of the emergency authorization as audit evidence; and notification to ACA where the model is implicated in an active investigation. The emergency path does NOT bypass recording; it only compresses the timeline and post-hoc completion of the pipeline stages.

---

## PART LXXIX — AI Shadow Testing

### LXXIX.1 Principle

Before a material institutional model is changed, the new model MUST be exercised against controlled evaluation data alongside the current model to detect regressions, biases, and unintended behavior changes.

### LXXIX.2 Shadow Test Setup

```
                [Production traffic sample]
                            |
                            v
              +---------------------------+
              |  Controlled evaluation    |
              |  data set (curated)       |
              +---------------------------+
                            |
              +-------------+-------------+
              |                           |
              v                           v
   [Current Model (baseline)]   [New Model (candidate)]
              |                           |
              v                           v
   [Baseline outputs]          [Candidate outputs]
              |                           |
              +-------------+-------------+
                            |
                            v
              +---------------------------+
              |  Diff & regression engine|
              +---------------------------+
                            |
                            v
              [Shadow Test Report:
                - regressions detected
                - improvements detected
                - behavior changes
                - bias indicators
                - performance delta
                - recommendation]
```

### LXXIX.3 Evaluation Data

The controlled evaluation dataset MUST be: representative of production traffic classes; sanitized of identifying data not authorized for evaluation use; versioned and retained for reproducibility; reviewed and approved by the institutional Data Steward; and protected against unauthorized access.

### LXXIX.4 Diff and Regression Analysis

The Diff and Regression Engine compares baseline outputs against candidate outputs and surfaces: regressions (cases where the candidate produces worse results than the baseline); improvements (cases where the candidate produces better results); behavior changes (cases where outputs differ materially but quality is ambiguous); bias indicators (cases where the candidate's behavior differs across protected categories); performance deltas (latency, throughput, resource usage); and a recommendation (PROCEED / PROCEED_WITH_CONDITIONS / REJECT / FURTHER_REVIEW).

### LXXIX.5 Approval Gate

The Shadow Test Report is a required input to the Approval stage of the Model Change Control pipeline (Part LXXVIII). A model change without a Shadow Test Report MUST NOT be approved, except through the Emergency Change Path with explicit Security Officer authorization and post-hoc shadow test completion.

### LXXIX.6 Audit

Shadow Test Reports are retained as audit evidence. The evaluation dataset version, baseline model version, candidate model version, diff results, and recommendation are all recorded. ACA may review Shadow Test Reports under Part II.

---

## PART LXXX — AI Incident Management

### LXXX.1 Principle

AI systems fail, behave unexpectedly, or produce harmful outputs. When they do, the architecture MUST capture a structured AI INCIDENT record, route it for review, and remediate it under the same governance as other institutional incidents.

### LXXX.2 AI INCIDENT Record

```
+======================================================================+
|                          AI INCIDENT                                  |
+======================================================================+
| Incident ID            | AI-INC-YYYY-NNNNN                            |
| Detected At            | <timestamp>                                   |
| Model                  | <model identifier>                            |
| Version                | <model version>                               |
| Input                  | <input that triggered the incident>           |
| Output                 | <output produced>                             |
| Source Data            | <source data the model reasoned over>         |
| Policy                 | <policy in effect at the time>                |
| Impact                 | <affected systems, workflows, citizens agg.>  |
| Reviewer               | <authorized reviewer identity>                |
| Correction             | <corrective action taken>                     |
| Root Cause             | <root cause analysis>                         |
| Remediation            | <remediation actions + status>                |
| Linked Evidence        | <audit hashes linking incident to records>    |
| Status                 | OPEN / UNDER_REVIEW / REMEDIATED / CLOSED     |
+======================================================================+
```

### LXXX.3 Required Fields

Every AI INCIDENT MUST capture, at minimum: **Model** — the model involved; **Version** — the specific model version; **Input** — the input that triggered the incident (sanitized where necessary to protect citizen data); **Output** — the output the model produced; **Source Data** — the source data the model reasoned over, with provenance; **Policy** — the institutional policy in effect at the time; **Impact** — the affected systems, workflows, and (in aggregate) citizens; **Reviewer** — the authorized reviewer assigned to investigate; **Correction** — the corrective action taken immediately to prevent recurrence (e.g., disable the model via Kill Switch); **Root Cause** — the root cause analysis; and **Remediation** — the remediation actions and their status.

### LXXX.4 Routing

AI INCIDENTs are routed to: the institution that owns the model; the institutional Security Officer; the institutional Data Steward (where data quality is implicated); and ACA, where the incident implicates evidence integrity or crosses an institutional boundary.

### LXXX.5 Correction Authority

The Reviewer MAY, in response to an AI INCIDENT: disable the model (via AI Kill Switch, Part LXXXI); reduce the model's automation level (Part LXXXII); restrict the model's data access scope; or initiate rollback to a prior approved model version. Correction actions are themselves audit evidence and are recorded with the reviewer's identity, the action, the rationale, and the timestamp.

### LXXX.6 Root Cause and Remediation

Root cause analysis MUST be performed for every AI INCIDENT. Remediation MUST address the root cause, not merely the symptoms. Remediation status is tracked to closure; an incident is `CLOSED` only when remediation is complete and verified.

### LXXX.7 ACA Visibility

ACA may review AI INCIDENT records under Part II. Patterns of incidents against the same model, the same institution, or the same data class MAY trigger a controlled ACA Signal under Part LX.

---

## PART LXXXI — AI Kill Switch

### LXXXI.1 Principle

ACA and each institutional administrator MUST be able to rapidly disable an AI model, AI feature, integration, or automation workflow without necessarily disabling the entire platform.

### LXXXI.2 Scope of Kill Switch

The AI Kill Switch operates at four levels of granularity:

| Level | Disables | Does NOT Disable |
|---|---|---|
| Model | A specific model version | Other models; the platform; non-AI workflows |
| AI Feature | A specific AI feature (e.g., "intelligent case triage") | Other AI features; non-AI features |
| Integration | A specific AI-related integration (e.g., AI-driven external summarization) | Other integrations; the underlying connector |
| Automation Workflow | A specific automated workflow that uses AI | Other workflows; the AI model itself (which remains available for other uses) |

### LXXXI.3 Authorized Operators

The following operators may invoke the AI Kill Switch: the institution's Security Officer (for that institution's AI components); the institution's Administrator (for that institution's AI components); ACA (for AI components implicated in an active investigation); and the Model Steward (for the models they steward, with notification to the Security Officer).

### LXXXI.4 Effect

When the Kill Switch is invoked: the affected AI component immediately stops accepting new requests; in-flight requests complete or are gracefully terminated per institutional policy; the affected component is marked `DISABLED` in the Model Registry (for models) or the Feature Registry (for features / integrations / workflows); downstream systems relying on the component receive a `DISABLED` signal and fall back to non-AI alternatives where available; and the platform as a whole remains operational.

### LXXXI.5 Audit

Every Kill Switch invocation is recorded in the audit ledger with: invoking operator identity; operator's institution; target (model / feature / integration / workflow); reason; timestamp; duration (if temporary); and notification list (who was notified). ACA may review Kill Switch history under Part II.

### LXXXI.6 Recovery

Re-enabling a disabled AI component requires: root cause remediation (if disabled due to an incident); re-approval through the Model Change Control pipeline (Part LXXVIII); explicit authorization from the institutional Security Officer or ACA (where ACA disabled it); and recording of the re-enablement in the audit ledger.

### LXXXI.7 Non-Disabling of the Platform

> The Kill Switch does NOT necessarily disable the entire platform.

This is by design. A platform-wide outage in response to a single model incident would itself be a serious operational failure. The Kill Switch enables surgical response.

---

## PART LXXXII — AI Automation Levels

### LXXXII.1 Principle

AI systems in institutional deployment MUST operate at a declared automation level. The level governs what the AI is permitted to do without human intervention. Levels are assigned by institutional policy and enforced by the AI Data Firewall (Part LXIII) and the Model Registry (Part LXXVII).

### LXXXII.2 Automation Level Definitions

| Level | Name | Definition | Permitted Actions | Prohibited Actions |
|---|---|---|---|---|
| 0 | Information Only | AI produces information for human consideration; takes no action | Generate information, summaries, retrieval | Any decision, recommendation presented as decision, automated action |
| 1 | Recommendation | AI produces explicit recommendations; humans decide whether to act | Recommendations with rationale and evidence | Any automated action; recommendations presented as decisions |
| 2 | Human Approval Required | AI may prepare actions but MUST obtain human approval before execution | Drafting, preparation, submission for approval | Executing any consequential action without explicit human approval |
| 3 | Low-Risk Automation Allowed by Explicit Policy | AI may execute explicitly permitted low-risk actions without per-action approval | Permitted low-risk actions per institutional policy | Any action not explicitly permitted; any high-risk action; any action affecting citizen rights without human review |
| 4 | Prohibited Autonomous Action | AI MUST NOT take autonomous action under any circumstance | None — by definition | Any autonomous action |

### LXXXII.3 Use Across Institutional Deployments

These levels are used uniformly across institutional deployments. Each institution assigns automation levels to its AI components per its own policy, within the constraints:

- ACA Investigation AI is capped at Level 2 by default; Level 3 permitted only by explicit ACA policy for narrowly-scoped, low-risk investigation automation.
- Police AI is capped at Level 2 for any action affecting citizen rights; Level 3 permitted only for explicitly defined low-risk operational automation.
- EMS AI may operate at Level 3 for explicitly defined low-risk operational automation (e.g., resource allocation within policy bounds); clinical decision support is Level 1.
- Health AI clinical decision support is Level 1; population-health analytics is Level 0 or Level 1.
- Traffic AI operational automation is Level 3 for explicitly permitted actions; enforcement actions affecting citizen rights are Level 2.
- Level 4 is the default for any action not explicitly assigned a level; that is, where policy is silent, the AI MUST NOT act autonomously.

### LXXXII.4 Enforcement

Automation levels are enforced by: the AI Data Firewall (Part LXIII) — which refuses requests that exceed the declared level; the Model Registry (Part LXXVII) — which records each model's maximum permitted level; the Audit Ledger — which records every action, its declared level, and the enforcing policy; and the AI Kill Switch (Part LXXXI) — which can disable any AI component found in violation.

### LXXXII.5 Level Changes

Changes to an AI component's automation level follow the Model Change Control pipeline (Part LXXVIII). A level increase (e.g., Level 1 → Level 2, or Level 2 → Level 3) requires explicit Security Officer approval and MUST be recorded in the audit ledger.

### LXXXII.6 Non-Negotiable Rule

> Level 4 is the default. Where policy is silent, the AI MUST NOT act autonomously.

This is non-negotiable. An AI component that takes autonomous action without an explicit Level 3 (or, in narrow cases, institutional policy explicitly permitting) authorization is in violation of Part LXXXII and MUST be disabled via the AI Kill Switch pending remediation.

---

## Appendix A — Data Plane Reference Card

A consolidated reference for the data planes defined in Part LXVIII.

| Plane | Owner | Sensitivity | Default Automation Level Cap | Audit Locality | Default Retention |
|---|---|---|---|---|---|
| ACA Data Plane | ACA | Highest | 2 | ACA-local | Permanent (evidence) |
| Police Data Plane | Police | Very High | 2 (rights-affecting) | Police-local | Per criminal code |
| EMS Data Plane | EMS | Very High | 3 (operational) / 1 (clinical) | EMS-local | Per health record law |
| Civil Protection Data Plane | Civil Protection | High | 3 (operational) | CP-local | Operational + statutory |
| Traffic Data Plane | Transport | Medium-High | 3 (operational) / 2 (enforcement) | Traffic-local | Per transport law |
| Health Data Plane | Health Authority | Very High | 1 (clinical) / 0–1 (population) | Health-local | Per health record law |
| Other Institutional Data Plane | Respective institution | Per institution | Per institution policy | Plane-local | Per institutional policy |

### Cross-Plane Access Rules

- Cross-plane read access requires explicit authorization via the AI Data Firewall (Part LXIII) or Clean Room (Part LXIV).
- Cross-plane write access is prohibited by default; permitted only via explicit institutional policy and dual-control.
- ACA cross-plane retrieval follows the formal retrieval process of Part II.
- Audit records do not pool across planes by default; ACA may retrieve plane-local audit records under Part II.

### Plane-Local Controls

Each plane governs its own: encryption (algorithm, key management, rotation); storage (backend, region, replication); identity (provider, MFA, roles); policies (access, purpose-bound, automation); audit (storage, retention, access rules); and retention (schedules, archival, disposal).

---

## Appendix B — AI Governance Provenance Record

A consolidated record format capturing the audit trail of an institutional AI invocation.

```
+======================================================================+
|              AI GOVERNANCE PROVENANCE RECORD                         |
+======================================================================+
| Record ID              | AIGP-YYYY-NNNNN                              |
| Timestamp              | <UTC + institutional time>                   |
| Institution            | <institution identifier>                     |
| Data Plane             | <plane identifier>                           |
| Requesting Identity    | <operator or workflow identifier>            |
| Declared Purpose       | <purpose code>                               |
| Policy Engine Decision | PERMIT / DENY                                |
| Policy Rule Applied   | <rule identifier>                            |
| Brokered Records       | <list of record identifiers + provenance>    |
| Model Identifier       | <model identifier>                           |
| Model Version          | <version>                                    |
| Automation Level       | 0 / 1 / 2 / 3                                |
| AI Output              | <output reference or hash>                   |
| Evidence Linkage       | <list of evidence record links>              |
| Unverified Claims      | <list of unverified claims, if any>          |
| Audit Ledger Entry     | <audit hash>                                 |
| Kill Switch Status     | <was the component disabled after?>           |
+======================================================================+
```

### Field Notes

- `Brokered Records` lists the records the AI Data Access Broker retrieved; the AI never sees raw data plane records outside this list.
- `Evidence Linkage` links every material claim in the AI output to a brokered evidence record; claims without linkage appear in `Unverified Claims`.
- `Kill Switch Status` records whether the AI component was later disabled via the Kill Switch, supporting retroactive incident investigation.

---

## Appendix C — Cross-Part Dependency Matrix

A summary of how the Parts in this document depend on one another and on prior Parts of the Federated Sovereign Government Architecture.

| This Part | Depends On | Supports | Notes |
|---|---|---|---|
| LI Integration Health | Part XLVII SoR; Part L Sentinel | LII; LIII; LV; LIX | Live operational state surface |
| LII Sandbox | LI | LIII | Mandatory pre-production testing |
| LIII Certification | LII | LIV; LXXVII | Gate to production |
| LIV Discovery | LIII; Part XLVII SoR | LV | Records unmet integration needs |
| LV Missing-System Map | LI; LIV | LIX; LX | Per-case dependency state |
| LVI Service Directory | Part LXVII Master Data | LVII; LVIII | Citizen-facing official directory |
| LVII Channel Health | LI; LVI | LVIII; LIX | Live channel status |
| LVIII Outage Reporting | LVI; LVII | LIX; LX | Citizen sensor channel |
| LIX Radar | LI; LVII; LVIII | LX | Aggregate health intelligence |
| LX Citizen→ACA | LIX; Part II ACA | Part II investigations | Controlled ACA Signal path |
| LXI Institutional AI Separation | LXVIII Data Planes | LXII; LXIII; LXXXII | Per-institution AI |
| LXII Universal vs Institutional AI | LXI; LXVIII | LXIII; LXXVII | Three AI tiers |
| LXIII AI Data Firewall | LXI; LXII; LXVIII | LXIV; LXXVII; LXXVIII; LXXXI; LXXXII | Mediates all AI access to data |
| LXIV Clean Room | LXV; LXVIII; LXIII | LIX | Multi-party analytics |
| LXV Pseudonymous Linkage | LXVI; LXVIII | LXIV; LXVI | Cross-system matching |
| LXVI Entity Resolution | LXV; LXVII | LXIV; cross-institutional analytics | No silent merges |
| LXVII Master Data | Part XLVII SoR; Part XLIX; Part L | LVI; LXVI; all planes | Canonical reference |
| LXVIII Data Planes | LXXI Security Boundary | All Parts using data | Plane-local controls |
| LXIX Federation Principle | All Parts | All Parts | Architectural posture |
| LXX Deployment Models | LXXI Security Boundary | LXXII; LXXIII; LXXIV | Per-institution deployment |
| LXXI Security Boundary | LXX Deployment Models | LXXII; LXXIII; LXXIV; LXXVI | Explicit boundary definitions |
| LXXII Device Trust | LXXI; LXXVII | LXXIII; LXXIV; LXXV | Device lifecycle |
| LXXIII Device Revocation | LXXII | LXXIV; LXXV; LXXX | Revocation procedures |
| LXXIV Offline Operations | LXXII; LXXIII | LXXV | Offline integrity |
| LXXV Sync Conflict Engine | LXXIV | LXXX | No silent overwrite |
| LXXVI Security Supply Chain | LXX Deployment | LXXVII; LXXVIII | Software supply chain |
| LXXVII Model Registry | LXXVI | LXXVIII; LXXIX; LXXX; LXXXI; LXXXII | AI model provenance |
| LXXVIII Model Change Control | LXXVII; LXXIX | LXXIX; LXXX | No silent changes |
| LXXIX Shadow Testing | LXXVIII | LXXVIII | Pre-change evaluation |
| LXXX AI Incident Management | LXXVIII; LXXXI | LXXXI; Part II ACA | Incident records |
| LXXXI Kill Switch | LXXVII; LXXX | LXXX; LXXXII | Surgical AI disablement |
| LXXXII Automation Levels | LXIII; LXXVII | LXXVIII; LXXX; LXXXI | Level-governed AI action |

### Notes on Federation Posture (Part LXIX)

Part LXIX is the architectural posture that permeates every other Part. It is not a single dependency; it is the lens through which the others are implemented. A reviewer evaluating any component of this architecture MUST ask: "Does this component respect federation without centralization?" If the answer is no, the component is in violation of Part LXIX regardless of which other Part it nominally implements.

### Notes on ACA Visibility

Multiple Parts reference ACA visibility under Part II. This is the accountability mechanism: institutional operations are not opaque to ACA, but ACA access is through formal retrieval, not standing bulk access. This balance — visible but not pre-shared — is core to the federated sovereign posture.

### Notes on Sovereign Stance

Throughout this document, commercial standards (e.g., SBOM formats, hardware security modules, encryption standards) are referenced as candidate implementations. Sovereign institutional security tooling is always an acceptable substitute provided it meets the equivalent functional requirements. No Part in this document mandates a specific commercial standard as the sole acceptable implementation.

---

*End of Part III — Integration Health, AI Governance & Institutional Security.*

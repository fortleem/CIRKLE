# CIRCLE ACA — Service & Financial Intelligence
## Part III of the ACA Sovereign Edition Blueprint

> **Scope.** Service Intelligence, Financial Intelligence, and Government
> Systems Integration capabilities of Circle under the **ACA Sovereign Edition**
> configuration. Covers source blueprint sections 27–55, 124–127, and 209.
>
> **Audience.** ACA product owners, integration architects, controls engineers,
> investigators, and accredited institutional partners.
>
> **Operating constraints.** Every capability is bounded by (a) the legal
> mandate of the host anti-corruption authority, (b) data-sharing authorizations
> recorded in the Circle Authorization Registry, and (c) the provenance,
> immutability, and auditability guarantees of Parts I and II. Where a
> capability cannot be exercised lawfully or technically, it degrades
> gracefully to a documented "request-and-await" mode rather than being
> silently disabled.

---

## Table of Contents

| Ch. | Title | § | Ch. | Title | § |
|-----|-------|---|-----|-------|---|
| 1 | Silent Service Failure Detector | 27 | 18 | Exception Economy | 44 |
| 2 | Citizen Drop-Off Analysis | 28 | 19 | Unowned Risk Detector | 45 |
| 3 | Service Desert Detector | 29 | 20 | Handoff Failure Detector | 46 |
| 4 | Service Friction Index | 30 | 21 | Control Effectiveness Engine | 47 |
| 5 | Government Service Knowledge Graph | 31 | 22 | Continuous Controls Monitoring | 48 |
| 6 | Automatic Service Discovery | 32 | 23 | Population-Wide Analytics | 49 |
| 7 | Case Information Dependency Map | 33 | 24 | Procurement Integrity Engine | 50 |
| 8 | Government System Dependency Engine | 34 | 25 | Public Funds Flow Map | 51 |
| 9 | "Get Missing Record" Workflow | 35 | 26 | Contract Lifecycle Intelligence | 52 |
| 10 | Request-Once / Reuse-With-Permission | 36 | 27 | Corporate Relationship Graph | 53 |
| 11 | No-Duplicate Investigation Detector | 37 | 28 | Asset Relationship Graph | 54 |
| 12 | Cross-Case Correlation | 38 | 29 | Financial Information Gateway | 55 |
| 13 | "One Case → Whole Government" Engine | 39 | 30 | Government Service Performance Observatory | 124 |
| 14 | Systemic Issue Escalator | 40 | 31 | Government Process Benchmarking | 125 |
| 15 | Case Blast Radius | 41 | 32 | Learn From the Best Office | 126 |
| 16 | Person vs Process vs System Analysis | 42 | 33 | Negative / Positive Balance | 127 |
| 17 | Control Bypass Radar | 43 | 34 | ACA Integration Control Tower Example | 209 |

---

## Document Conventions

1. **Authority tags** — each capability carries a minimum authorization class:
   `A0` (read-only on already-authorized, in-scope data); `A1` (per-case
   Authorization Record covering involved agencies/systems); `A2`
   (population-wide or cross-agency authorization, director-level or above);
   `A3` (touches regulated financial data; requires Financial Information
   Gateway token).

2. **Output classification** — every analytical output is stamped `OBSERVATION`,
   `OPERATIONAL ANOMALY`, `SYSTEMIC ISSUE CANDIDATE`, or
   `STRATEGIC INVESTIGATION LEAD`. No output is auto-classified `FRAUD` or
   `MISCONDUCT`; those labels require a human investigator and a case file.

3. **Diagrams & cross-references** — ASCII flow diagrams are illustrative;
   node names are generic (`Agency A`, `System B`) and bind to the GSKG (Ch. 5)
   in real deployments. `→ §N` refers to source blueprint sections;
   `→ Part II` and `→ Part I` refer to the companion ACA Sovereign Edition
   documents.

---

## Chapter 1 — Silent Service Failure Detector  *(§27 · Authority: A2)*

#### 1.1 Problem

A government service can fail silently. Low complaint volume is not evidence of
service health — it can equally indicate that citizens have given up, do not
know how to complain, fear retaliation, or have rerouted demand to informal
channels. Dashboards that rely on complaint counts under-report such failures
by design.

#### 1.2 Capability

Circle continuously computes a **Silent Service Failure Score** for every
(observed service × office × window) tuple using six orthogonal signals that do
not depend on complaints being filed:

| Signal | What is measured | Source |
|--------|------------------|--------|
| Demand | Application volume vs. baseline and peer offices | GSKG (Ch. 5) |
| Abandonment | Started-but-not-completed transactions; queue abandonment | Service telemetry |
| Repeat inquiries | Same citizen returning for the same service within SLA | Case Management System |
| Completion | Successful issuance / closure rate | Service outcome records |
| Service usage | Active users vs. eligible population | Population registry |
| Complaints | Filed complaints + whistleblower + ombudsman referrals | Complaint registry |

A service is flagged as a **silent failure candidate** when complaints remain
low but at least two of {demand drop, abandonment spike, repeat-inquiry spike,
completion drop} diverge negatively from peer offices by > 1.5 σ.

#### 1.3 Algorithm Sketch

```
Six signals → Normalize per office & window → Peer-baseline (z-score) → Score (0–100)
                                                                          │
              ┌──────────────────────────────────────────────────────────────┴───┐
              ▼                                                                ▼
   Complaints low + score ≥ 70                              Complaints high + score ≥ 70
              │                                                                │
              ▼                                                                ▼
   SILENT FAILURE CANDIDATE  (→ Ch. 14)                     OVERT FAILURE (standard triage)
```

#### 1.4 Output Record

```
{
  "service_id": "srv.land.title_transfer",
  "office_id":   "office.land.north_3",
  "window":      "2025-Q3",
  "score":       78,
  "classification": "OPERATIONAL ANOMALY",
  "signals": { "demand_z": -2.1, "abandonment_z": 2.8, "repeat_inquiry_z": 2.3,
               "completion_z": -1.9, "usage_z": -1.2, "complaint_z": -0.3 },
  "suppressed_demand_estimate": "11–18% of eligible population",
  "recommended_action": "Open service-integrity review; cross-reference Ch. 3."
}
```

#### 1.5 Guardrails

Never auto-opens a misconduct case; produces a *candidate* for Ch. 14.
Suppressed-demand estimates carry confidence intervals, never single numbers.
Outputs are retained for the statutory analytical-record period and are
auditable end-to-end.

---

## Chapter 2 — Citizen Drop-Off Analysis  *(§28 · Authority: A2)*

#### 2.1 Problem

Aggregate completion rates can hide the specific step at which citizens
abandon an administrative process. The aggregate hides the choke point.

#### 2.2 Capability

For each multi-step process in the GSKG, Circle renders a **drop-off funnel**
per step:

| Step | Started | Completed | Drop-off % | Median Dwell | Repeat-Reentry % |
|------|---------|-----------|------------|--------------|-------------------|
| 1. Identity verification | 12,418 | 11,907 | 4.1% | 6 min | 1.2% |
| 2. Document submission | 11,907 | 9,422 | 20.9% | 41 min | 7.8% |
| 3. Fee payment | 9,422 | 7,118 | 24.5% | 13 min | 3.1% |
| 4. Back-office review | 7,118 | 4,001 | 43.8% | 11 d | n/a |
| 5. Issuance | 4,001 | 3,884 | 2.9% | 2 d | n/a |

Steps with drop-off above peer-baseline threshold are surfaced as **friction
hotspots** and routed to the Service Friction Index (Ch. 4).

#### 2.3 Reentry vs. True Drop-off

A citizen who re-enters step 2 within 14 days is *re-entering*, not dropping
off. The distinction matters:

- High reentry → the step is *frictionful but recoverable*; high true drop-off → the step is *terminal-leaking*.

```
   started ──▶ completed
       │  ╲   ▲
       │   ╲  │   ← reentry (within 14d): friction, recoverable
       │    ╲ │
       │     ╲▼
       ▼      ✗   ← true drop-off: terminal leak
```

#### 2.4 Output

Each friction hotspot record contains `step_id`, `process_id`, `office_id`,
`drop_off_pct`, `reentry_pct`, `true_drop_off_pct`, `cohort_breakdown` (age
band, governorate, channel), and a `recommended_intervention` (process
redesign, staffing, system fix, fraud review). Cohort breakdowns respect
minimum-cohort-size rules to prevent re-identification. Outputs feed Ch. 14
but never auto-create individual misconduct cases.

---

## Chapter 3 — Service Desert Detector  *(§29 · Authority: A2)*

#### 3.1 Definition

A **service desert** is a geographic or demographic zone in which authorized
demand for a service is unmet by available supply. Per zone, five signals:

| Signal | Threshold for desert classification |
|--------|--------------------------------------|
| High demand | Per-capita demand ≥ peer-baseline × 1.2 |
| Low availability | Service points per 10k residents ≤ peer-baseline × 0.5 |
| Long travel burden | Median citizen travel time ≥ 60 min one-way (configurable) |
| High delays | Median processing time ≥ peer-baseline × 1.5 |
| Poor completion | Completion rate ≤ peer-baseline × 0.7 |

A zone is flagged as a service desert when ≥ 4 of 5 conditions hold.

#### 3.2 Geographic Unit

Default: census tract. Where unavailable, fallback to administrative district
with explicit `unit_confidence` flag.

#### 3.3 Output

```
Zone: TRACT-1904-N   Service: srv.civil.id_renewal
Classification: SERVICE DESERT   (5/5 signals)
  demand_z        +1.9 ✓   availability_z    -1.8 ✓
  travel_burden_z +2.4 ✓   delay_z           +1.6 ✓
  completion_z    -2.2 ✓
Estimated affected population: 31,400
Recommended action:
  → Re-route to Service Planning authority (operational, not ACA-investigative)
  → If coupled with Control Bypass signals (Ch. 17), consider investigative review.
```

#### 3.4 Disposition Rule

A service desert is an *operational* finding, not a corruption finding. It is
routed to the service-planning authority unless it co-occurs with control-bypass
patterns (Ch. 17) or unusual concentrations of exceptions (Ch. 18) — in which
case it is escalated via Ch. 14.

---

## Chapter 4 — Service Friction Index  *(§30 · Authority: A2)*

#### 4.1 Purpose

The Service Friction Index (SFI) is a single, explainable score per
(service × office × window) summarizing the friction a citizen encounters.
Every component is individually auditable.

#### 4.2 Components

| # | Component | Measurement | Weight |
|---|-----------|-------------|--------|
| 1 | Waiting | Median queue / appointment-wait time | 0.15 |
| 2 | Visits | Median number of physical visits required | 0.15 |
| 3 | Paperwork | Median number of distinct forms / documents | 0.10 |
| 4 | Handoffs | Median internal handoffs per case | 0.10 |
| 5 | Failures | Step-level failure rate (Ch. 2) | 0.15 |
| 6 | Repeat work | Reentry rate (Ch. 2) | 0.10 |
| 7 | Complaints | Complaint volume relative to throughput | 0.10 |
| 8 | Processing time | Median end-to-end processing time | 0.15 |

Weights are policy-configurable; defaults sum to 1.00.

#### 4.3 Score Construction

Each component is normalized to a 0–100 subscore via its peer-baseline z-score
(Ch. 31). The SFI is the weighted sum `SFI = Σ (wᵢ × subscoreᵢ)`, reported
alongside a **decomposition table**:

```
Service: srv.business.license_renewal   Office: office.commerce.east_2   Window: 2025-Q3
SFI: 68 / 100  (HIGH FRICTION)

  Waiting         78  ████████████░░░░  contribution: 11.7
  Visits          65  ██████████░░░░░░   contribution:  9.8
  Paperwork       71  ███████████░░░░░   contribution:  7.1
  Handoffs        60  █████████░░░░░░░   contribution:  6.0
  Failures        72  ███████████░░░░░   contribution: 10.8
  Repeat work     55  ████████░░░░░░░░   contribution:  5.5
  Complaints      40  ██████░░░░░░░░░░   contribution:  4.0
  Processing time 83  █████████████░░░   contribution: 12.5
                                       total: 67.4 → 68 (rounded)
```

#### 4.4 Explainability Contract

Drill from any SFI score back to raw signals, peer cohort, and observation
window. SFI is not a stand-alone misconduct indicator. Anomalously *low* SFI
may itself be a signal (see Part I §26 — "Too Perfect" Detector).

---

## Chapter 5 — Government Service Knowledge Graph  *(§31 · Authority: A1 read / A2 edit (dual-control))*

#### 5.1 Purpose

The Government Service Knowledge Graph (GSKG) is the canonical,
machine-readable description of how government actually operates. Every
analytical capability in this document ultimately traverses the GSKG.

#### 5.2 Node Hierarchy

```
Agency → Directorate → Office → Service → Process → System
                                              │
                                              ▼
                                Control → Responsible Role → SLA → Escalation Path
```

#### 5.3 Node Schema

| Node | Required attributes |
|------|---------------------|
| Agency | `agency_id`, `name`, `mandate_ref`, `jurisdiction` |
| Directorate | `directorate_id`, `parent_agency`, `head_role` |
| Office | `office_id`, `parent_directorate`, `geo_point`, `service_hours` |
| Service | `service_id`, `category`, `eligible_population_ref`, `service_owner_role` |
| Process | `process_id`, `service_id`, `version`, `effective_from`, `effective_to` |
| System | `system_id`, `system_class`, `vendor`, `integration_endpoint`, `data_classification` |
| Control | `control_id`, `control_class`, `frequency`, `evidence_type` |
| Responsible Role | `role_id`, `role_title`, `delegated_from` |
| SLA | `sla_id`, `metric`, `target`, `regulatory_basis` |
| Escalation Path | `path_id`, `step`, `actor_role`, `timeout`, `next_step` |

#### 5.4 Edge Semantics

| Edge | Meaning |
|------|---------|
| `BELONGS_TO` | Office → Directorate → Agency |
| `DELIVERS` | Office → Service |
| `REALIZED_BY` | Service → Process → System |
| `GOVERNED_BY` | Process → Control → SLA |
| `OWNED_BY` | Process/System/Control → Responsible Role |
| `ESCALATES_TO` | Office/Role → Escalation Path |
| `DEPENDS_ON` | System → System (cross-system integration chains) |
| `HANDOFF_TO` | Process → Process (inter-agency handoffs — Ch. 20) |

#### 5.5 Provenance and Versioning

Every node and edge carries `effective_from` / `effective_to`. Historical
queries return the graph as it existed at a given date (foundation for Part I
§57 — "Law at the Time"). Graph edits are append-only; corrections produce
new versions, not overwrites.

#### 5.6 Seeding

Seeded from: (1) official government organization register, (2) agency service
catalogues, (3) authoritative regulatory references (Part I §56), (4)
ACA-curated process inventories for high-risk services. Where sources disagree,
the conflict is recorded as a `CONFLICT` edge and surfaced through Part I §128.

---

## Chapter 6 — Automatic Service Discovery  *(§32 · Authority: A1)*

#### 6.1 Mandatory Behaviour

> When a case is opened, Circle **must** automatically identify the universe of
> relevant services, agencies, systems, records, workflows, regulations, and
> controls. This is mandatory, not optional.

#### 6.2 Discovery Inputs

Subjects (persons, entities, assets — Ch. 27, 28); allegation keywords (free text + structured taxonomy); documents already attached; geographic / jurisdictional scope; temporal scope (event dates).

#### 6.3 Discovery Outputs

| Class | Description |
|-------|-------------|
| Relevant services | GSKG services matching the allegation domain |
| Relevant agencies | Agencies owning those services |
| Relevant government systems | Systems realizing those services |
| Relevant records | Record types each service should have produced (Ch. 8) |
| Relevant workflows | Process definitions, versions effective on event dates |
| Relevant regulations | Laws, regulations, decisions, circulars effective on event dates |
| Relevant controls | Control points along those workflows |

#### 6.4 Pipeline

```
   Case-opening payload
        ▼
   Entity extraction  →  Allegation taxonomy matcher  →  GSKG traversal (Ch. 5)
        ▼
   Temporal filter (Part I §56)  →  Authorization filter  →  Discovery Report (attached to case)
```

#### 6.5 Non-Blocking Requirement

Discovery must complete within 15 s for the 95th-percentile case; sub-steps
that exceed budget return partial results and queue missing items for async
completion. Case creation is never blocked on discovery.

---

## Chapter 7 — Case Information Dependency Map  *(§33 · Authority: A1)*

#### 7.1 Purpose

Display at a glance what the investigation needs, where each dependency lives,
and the *current readiness state* of each dependency.

#### 7.2 Readiness States

| Symbol | State | Meaning |
|--------|-------|---------|
| ✓ | `CONNECTED` | System integrated; data streaming / queryable. |
| ⚠ | `REQUIRES_REQUEST` | System exists but not integrated; formal request required (Ch. 9). |
| ✕ | `UNAVAILABLE` | System unreachable (offline, contract expired, vendor-locked, jurisdiction-blocked). |
| ⏳ | `PENDING_AUTHORIZATION` | Request filed, awaiting authorization. |
| ↩ | `PARTIAL` | Connected but only a subset of record types returned. |

#### 7.3 Example Map

```
Case: ACA-2025-0418   Allegation: Procurement irregularity, Tender T-2024-118

[GSKG: srv.procurement.tender]               ✓ CONNECTED
[Agency: Ministry of Infrastructure]         ✓ CONNECTED
    ├─ System: TENDER-PORTAL v3              ✓ CONNECTED
    ├─ System: CONTRACT-REGISTRY             ✓ CONNECTED
    ├─ System: PAYMENT-LEDGER (Treasury)     ⚠ REQUIRES_REQUEST
    ├─ System: VENDOR-REGISTRY (Commerce)   ↩ PARTIAL (vendor name only)
    └─ System: AUDIT-TRAIL (Internal Audit) ⏳ PENDING_AUTHORIZATION

[GSKG: srv.land.right_of_way]                ✓ CONNECTED
[Agency: Municipal Land Authority]           ✓ CONNECTED
    ├─ System: GIS-PORTAL                    ✓ CONNECTED
    └─ System: LAND-REGISTRY                ✕ UNAVAILABLE  (offline since 2025-09-12)

Records expected (Part I §17): 31   Records found: 24   Records missing: 7  → Ch. 9
```

#### 7.4 Live Update

The map is a live view: every state transition (request acknowledged, system
offline, record received) updates the map and the case timeline.

---

## Chapter 8 — Government System Dependency Engine  *(§34 · Authority: A1)*

#### 8.1 Question

> Which systems should contain evidence about this case?

#### 8.2 Capability

Given a case, the engine produces a **System Evidence Map**: for each
candidate system, the set of record types that *should* exist there, given
the process definitions effective on the event dates.

Discovery (Ch. 6) answers "what is relevant"; the dependency engine answers
"where should the evidence live, and is it there?".

#### 8.3 Algorithm

```
For each Process P effective on event_date:
    For each Step S in P:
        Identify System(S) and RecordTypes(S)
        For each RecordType R:
            Emit expected_record(P, S, System(S), R, event_date)

For each expected_record, check (via Ch. 7 map):
    present?      → FOUND
    absent?       → MISSING   (route to Ch. 9)
    conflicting?  → CONTRADICTION  (route to Part I §18)
    too perfect?  → ANOMALY   (route to Part I §26)
```

#### 8.4 Output

| Process step | System | Expected record | State | Importance |
|--------------|--------|-----------------|-------|------------|
| Tender publication | TENDER-PORTAL | Tender notice + scope spec | FOUND | High |
| Bid submission | TENDER-PORTAL | Bid package × N | MISSING (2 of 5) | Critical |
| Technical evaluation | EVAL-MODULE | Scoring sheets | MISSING | Critical |
| Award decision | CONTRACT-REGISTRY | Award resolution | FOUND | High |
| Contract signing | CONTRACT-REGISTRY | Signed contract + amendments | PARTIAL | High |
| Payment disbursement | PAYMENT-LEDGER | Payment vouchers × 3 | UNAVAILABLE | High |

Missing / partial / unavailable records are routed to the Get Missing Record
Workflow (Ch. 9) and ranked by investigative importance (Part I §20).

---

## Chapter 9 — "Get Missing Record" Workflow  *(§35 · Authority: A1 per record / A2 batch)*

#### 9.1 Purpose

When Ch. 8 identifies a missing record, retrieve it through a single,
fully-tracked workflow rather than ad-hoc channels.

#### 9.2 Workflow Stages

```
 1. REQUEST             Investigator formally requests the record
        ▼                   (target system, agency, record type, justification)
 2. AUTHORIZATION       Authorization officer reviews (approves / denies / clarifies)
        ▼
 3. SUBMISSION          Approved request submitted to holding agency
        ▼
 4. ACKNOWLEDGEMENT     Holding agency acknowledges receipt (SLA attached)
        ▼
 5. REMINDER            If SLA approaches without response, auto-reminder fires
        ▼
 6. ESCALATION          If SLA breached, escalate via GSKG escalation path (Ch. 5)
        ▼
 7. RECEIPT             Record received (file, hash, metadata)
        ▼
 8. PROVENANCE          Chain-of-custody verification (Part II immutability rules)
   VERIFICATION
        ▼
 9. CASE ATTACHMENT     Record attached; Evidence Gap Engine (Part I §18) decrements
```

#### 9.3 State Machine

| From | To | Trigger |
|------|----|---------|
| `drafted` | `submitted` | Investigator confirms |
| `submitted` | `authorized` / `denied` / `clarification_requested` | Authorization officer |
| `authorized` | `acknowledged` | Holding agency acknowledges |
| `acknowledged` | `delivered` / `overdue` | Record received / SLA timer expires |
| `overdue` | `escalated` | Auto-escalator fires |
| `delivered` | `verified` / `verification_failed` | Provenance check |
| `verified` | `attached` | Attached to case |

Every transition is logged, immutable, and signed (Part II §61).

#### 9.4 Preservation

If the requested record is volatile (Part I §19), the workflow includes an
expedited preservation sub-flow with shorter SLAs and an automatic preservation
notice to the holding agency.

---

## Chapter 10 — Request-Once / Reuse-With-Permission  *(§36 · Authority: A1 reuse / A2 deposit)*

#### 10.1 Principle

> Once an authorized record has been legally obtained, Circle must allow
> authorized reuse without uncontrolled duplication.

#### 10.2 Problem

Without a reuse mechanism, two unrelated investigations needing the same tender
record request it twice, doubling administrative burden on the holding agency
and creating two divergent copies whose provenance may drift.

#### 10.3 Implementation

Every record obtained via Ch. 9 is registered in the **Authorized Record Vault** with a stable Record ID; subsequent case teams needing the same record are routed to the existing copy via a *reuse pointer*, not a duplicate fetch; reuse is conditional — the second case team must hold an authorization that covers the same record class.

#### 10.4 Reuse Decision Matrix

| Case B authorization covers record? | Record in vault? | Action |
|-------------------------------------|------------------|--------|
| Yes | Yes | Reuse (create pointer) |
| Yes | No  | New request (Ch. 9) |
| No  | Yes | Block reuse; require separate authorization |
| No  | No  | Block; require authorization + new request |

#### 10.5 Audit and Decay

Every reuse event is logged (who, what, which case, when, under which
authorization). Records carry an authorization-window; reuse after expiry
requires re-authorization. The vault never stores records longer than the
legal basis permits; on expiry, records are dispositioned per Part II rules
with full audit trail.

---

## Chapter 11 — No-Duplicate Investigation Detector  *(§37 · Authority: A1)*

#### 11.1 Rule

> Before case creation, Circle must identify possible related active
> investigations by ACA or authorized partner institutions. It must **not**
> automatically prevent creation; it must surface the relationship.

#### 11.2 Detection Vectors

The detector compares the new-case payload against active cases along:
subjects (persons, entities, assets); services and processes; documents and
record types; allegation taxonomy nodes; temporal overlap; geographic overlap;
and control failure patterns (Ch. 17).

#### 11.3 Output

```
Potential related investigations (do not block — surface only):

  Case ACA-2025-0387   overlap: 0.81   shared: 2 persons, 1 entity, 1 service
                      status: ACTIVE   owner: Unit North-2
  Case ACA-2025-0412   overlap: 0.62   shared: 1 process, 1 control failure
                      status: ACTIVE   owner: Unit East-1
  Case ACA-2024-2218   overlap: 0.58   shared: 1 entity, 1 contract
                      status: PAUSED   owner: Unit Central

Recommended action:
  → Coordinate with owners of ACA-2025-0387 and ACA-2025-0412 before independent progression.
  → Decision to proceed, merge, or hand off rests with the case-creating unit.
```

#### 11.4 Guardrails

Never blocks case creation (blocking could be abused to suppress legitimate investigations); overlap score is explainable — the investigator sees exactly which vectors contributed; partner-institution overlaps surfaced only where a data-sharing agreement exists.

---

## Chapter 12 — Cross-Case Correlation  *(§38 · Authority: A1)*

#### 12.1 Purpose

Once a case exists, continuously search the authorized case corpus for related
matters along ten dimensions.

#### 12.2 Correlation Dimensions

| # | Dimension | What it finds |
|---|-----------|---------------|
| 1 | Same person | Cases involving the same individual |
| 2 | Same entity | Same company / organization |
| 3 | Same office | Same office as origin/referral |
| 4 | Same service | Same service catalogue entry |
| 5 | Same process | Same workflow definition |
| 6 | Same document | Shared document hash or record ID |
| 7 | Same sequence | Same ordered event sequence |
| 8 | Same timing | Overlapping event windows |
| 9 | Same pattern | Recognized anomaly pattern |
| 10 | Same control failure | Shared control bypass signature (Ch. 17) |

#### 12.3 Continuous vs. Triggered

Correlation runs continuously: as each case evolves, the index is updated and
new matches surface. It is not a one-shot search at case opening.

#### 12.4 Output

Each hit includes the correlated case ID, matching dimension(s), match
strength per dimension (0–1), composite score, and a link to the related case
(subject to authorization).

#### 12.5 Guardrails

Respects authorization boundaries — investigators see only correlations to cases they are authorized to see. Correlation is **investigative support**, not evidence.

---

## Chapter 13 — "One Case → Whole Government" Engine  *(§39 · Authority: A2 / A3 if financial)*

#### 13.1 Flagship Action

> **FIND THIS PATTERN ELSEWHERE**

Given a pattern observed in one case, search the entire authorized ecosystem
for the same pattern across all agencies, services, systems, and time windows.

#### 13.2 What Constitutes a "Pattern"

A pattern is a parameterized query against the GSKG + case corpus. Examples:

Patterns include: the same person/entity acting in a specific role across multiple services; a specific control bypass signature recurring across offices; an exception-approval concentration around a specific role; a tender → award → amendment sequence shape; a handoff failure topology (Ch. 20); a drop-off anomaly at the same process step across offices.

#### 13.3 Execution Model

```
   Investigator defines pattern P (parameterized, scoped to current case)
        ▼
   Pattern compiler (translates P into a query plan)
        ▼
   Authorization scope resolver (determines which slice of ecosystem this query may touch)
        ▼
   Federated pattern search (fans out across authorized systems and case repositories)
        ▼
   Result aggregator + de-duplicator (Ch. 10 reuse rules apply)
        ▼
   Pattern Occurrence Report (every hit linked back to its source case / system)
```

#### 13.4 Output: Pattern Occurrence Report

| Hit # | Source | Service | Office | Time | Match | Linked case |
|-------|--------|---------|--------|------|-------|-------------|
| 1 | Ministry of Infrastructure | Tender | East-2 | 2024-Q2 | 0.93 | ACA-2024-2218 |
| 2 | Ministry of Health | Tender | Central-1 | 2024-Q4 | 0.88 | (new candidate) |
| 3 | Ministry of Education | Tender | North-3 | 2025-Q1 | 0.86 | (new candidate) |
| 4 | Ministry of Transport | Tender | West-1 | 2025-Q2 | 0.81 | ACA-2025-0412 |

Each "new candidate" hit is offered to the investigator as a candidate case
opening — never auto-opened.

#### 13.5 Guardrails

Every execution is logged at A2 authority and is reviewable by the audit function. Hits are *candidates*, never findings. The engine never reaches into systems outside the authorization scope; out-of-scope hits are recorded as `OUT_OF_SCOPE` for future authorization expansion.

---

## Chapter 14 — Systemic Issue Escalator  *(§40 · Authority: A2 (step 5) / A3 + director (step 6))*

#### 14.1 Progression

```
   (1) Single report
            ▼
   (2) Repeated report           ← same signal observed N times
            ▼
   (3) Repeated anomaly           ← analytical signal reproduces
            ▼
   (4) Cross-case cluster         ← Ch. 12 correlation finds a cluster
            ▼
   (5) Systemic issue candidate   ← Ch. 13 confirms pattern is widespread
            ▼
   (6) Strategic investigation    ← formally chartered, director-level
```

#### 14.2 Promotion Rules

| Step → Step | Promotion criterion | Default threshold |
|-------------|---------------------|-------------------|
| 1 → 2 | Same signal from same office/process within rolling 90d | ≥ 3 reports |
| 2 → 3 | Analytical signal (Ch. 1, 4, 17, 21) reproduces | z ≥ 1.5 on ≥ 2 windows |
| 3 → 4 | Cross-case correlation (Ch. 12) cluster size | ≥ 5 cases |
| 4 → 5 | FIND THIS PATTERN ELSEWHERE (Ch. 13) confirms | ≥ 3 agencies or ≥ 2 directorates |
| 5 → 6 | Strategic review committee decision | human gate |

#### 14.3 Demotion / Closure

A candidate that fails to gain evidence within a configurable window is
*demoted* (not deleted) with recorded rationale. Demotion is auditable;
silent closure is forbidden.

#### 14.4 Output

Each promoted item produces a **Systemic Issue Brief** containing: the signal
chain (1→6 evidence trail); the GSKG scope affected; the estimated blast
radius (Ch. 15); the recommended intervention target (Ch. 16); and the
authorization scope required to investigate further.

---

## Chapter 15 — Case Blast Radius  *(§41 · Authority: A1 estimate / A2 re-classify)*

#### 15.1 Classification

Every case carries a **blast radius** classification:

| Class | Definition |
|-------|------------|
| Individual | A single person; no process / system / organizational implication. |
| Office | Contained within one office's processes. |
| Directorate | Spans multiple offices under one directorate. |
| Agency | Spans multiple directorates within one agency. |
| Regional | Cross-agency within one administrative region. |
| Cross-agency | Spans multiple agencies nationally. |
| National | Potentially affects a national-scale service or programme. |

#### 15.2 Estimation

Blast radius is *estimated*, not declared. The estimator considers: number of
distinct offices / agencies implicated by discovery (Ch. 6); number of distinct
systems touched by the dependency engine (Ch. 8); cross-case correlation
cluster size (Ch. 12); population of citizens potentially affected (Ch. 3);
and estimated financial exposure (Ch. 24–26).

#### 15.3 Dynamic Re-classification

Blast radius is re-estimated at every case milestone. A case initially
classified `Office` may be re-classified `Cross-agency` when Ch. 13 surfaces
broader occurrences. The re-classification event is logged and notifies the
case owner and strategic review function.

#### 15.4 Use

Blast radius informs reporting cadence (larger radius → more frequent
executive review), authorization scope expansion requests, resource
allocation, and whether to escalate via Ch. 14.

---

## Chapter 16 — Person vs Process vs System Analysis  *(§42 · Authority: A1)*

#### 16.1 Requirement

> Every case must carry three parallel analyses: an Individual analysis, a
> Process analysis, and a System analysis.

This separation prevents the cognitive error of conflating "who did it" with
"what allowed it to happen".

#### 16.2 The Three Lenses

| Lens | Question | Output |
|------|----------|--------|
| Individual | Did a specific person act improperly? | Per-person assessment with supporting / contradicting evidence |
| Process | Did the process itself enable, fail to prevent, or require the outcome? | Process-design findings |
| System | Did the IT system, data, or automation contribute? | System-design findings |

#### 16.3 Intervention Target

| Primary lens | Typical intervention target |
|--------------|------------------------------|
| Individual | Person (sanction, referral, training, reassignment) |
| Process | Process redesign / control redesign |
| System | IT system fix / data fix / vendor action |
| Multiple | Multi-level intervention programme |

#### 16.4 Mandatory Format

Each case file has three named sections, regardless of whether the lens finds
anything:

```
INDIVIDUAL ANALYSIS   — persons of interest; acts/omissions; supporting &
                       contradicting evidence; hypotheses (Part I §22); conclusion.
PROCESS ANALYSIS      — process under review (GSKG node + version); control points;
                       process weaknesses; bypass signatures (Ch. 17); conclusion.
SYSTEM ANALYSIS       — systems involved (Ch. 8); data quality (Part I §128);
                       integration failures; volatility / preservation status; conclusion.
INTERVENTION TARGET   — primary; secondary; recommended programme.
```

#### 16.5 Guardrail

A case that concludes "Individual acted improperly" *without* a Process and
System analysis is non-compliant. The case cannot be closed until all three
lenses are documented (even if the conclusion is "no process / system
contribution identified").

---

## Chapter 17 — Control Bypass Radar  *(§43 · Authority: A2)*

#### 17.1 Detection Targets & Signal Sources

The radar continuously scans for **overrides** (a control was explicitly
overridden); **exceptions** (a documented exception was invoked); **missing
authorization** (an action occurred with no recorded authorization);
**segregation failures** (the same actor performed two duties that should be
segregated); **undocumented bypass** (evidence of the action exists, but no
control path explains how it was permitted); and **unusual concentrations**
(overrides / exceptions clustered around a specific actor, role, office, vendor,
or time window).

| Signal | Source |
|--------|--------|
| Override event | System audit trail |
| Exception invocation | Workflow engine exception log |
| Missing authorization | Cross-check of action log vs. authorization registry |
| Segregation failure | Role-assignment graph vs. action log |
| Undocumented bypass | Negative-space engine (Part I §25) |
| Unusual concentration | Statistical clustering over the above |

#### 17.2 Concentration Analysis

Concentration is computed along six axes simultaneously. The radar flags when
concentration exceeds peer-baseline by ≥ 1.5 σ on *any* axis: actor, role,
office, vendor, time window, service.

#### 17.3 Output

```
CONTROL BYPASS RADAR — weekly digest

Top concentrations (z-score vs peer baseline):
  Role: "Senior Procurement Officer, East-2"  override rate z = +3.1
  Vendor: "Acme Civil Works Ltd"             exception rate z = +2.7
  Office: "office.commerce.east_2"            undocumented bypass z = +2.4
  Window: 2025-W23 (national)                  override rate z = +1.9

Classification: OPERATIONAL ANOMALY
Recommended action:
  → Cross-reference Ch. 12 (cross-case correlation)
  → If ≥ 3 axes intersect → escalate via Ch. 14
```

#### 17.4 Guardrail

Override and exception events are legitimate governance tools. The radar never
auto-classifies an override as misconduct; it surfaces concentrations for
review. Reviewer disposition is logged.

---

## Chapter 18 — Exception Economy  *(§44 · Authority: A2)*

#### 18.1 Question

> Are exceptions becoming the *de facto* normal workflow?

#### 18.2 Concept

A process in which the exception path is used more often than the normal path
has, functionally, replaced its normal path. This is a strong signal that the
process as designed no longer matches reality — and a common precursor to
control failure.

#### 18.3 Metric

For each (process × office × window):

```
ExceptionRate = (cases processed via exception path) / (total cases processed)
```

Also computed as trend: is `ExceptionRate` increasing, stable, or decreasing
over rolling windows?

#### 18.4 Thresholds

| ExceptionRate | Trend | Classification |
|---------------|-------|----------------|
| < 5% | any | Normal |
| 5–15% | stable or ↓ | Watch |
| 5–15% | ↑ | Friction / redesign candidate |
| 15–30% | any | Exception Economy warning |
| > 30% | any | Exception Economy confirmed |

#### 18.5 Coupling

An Exception Economy warning that co-occurs with a concentration of exceptions
around a single actor or vendor (Ch. 17) is escalated via Ch. 14 with
elevated priority. Each warning includes the affected process and office, the
historical normal-path rate, the current exception rate and trend, and the top
exception reasons invoked.

---

## Chapter 19 — Unowned Risk Detector  *(§45 · Authority: A2)*

#### 19.1 Detection

Identify GSKG nodes that lack a defined owner of one of:

| Owner type | What it means when missing |
|------------|----------------------------|
| Process owner | No one is accountable for the process design and its outcomes. |
| Control owner | No one is accountable for a specific control point operating. |
| System owner | No one is accountable for the IT system's availability and integrity. |
| Escalation owner | No one is reachable when the process fails. |

#### 19.2 Why This Matters

Unowned risks are the most dangerous category in government: when something
goes wrong, there is no party to notify, no party to remediate, and no party
to learn from the failure. The detector exists to make this category *visible*
before failure, not after.

#### 19.3 Output

```
UNOWNED RISK DIGEST

  Process: srv.civil.id_renewal / step 4 (back-office review)
    Process owner:    MISSING       Escalation owner: MISSING
    Risk: high-traffic step with no accountable owner

  Control: ctrl.procurement.single_bid_approval
    Control owner:    MISSING
    Risk: control point cannot be certified as operating

  System: sys.legacy.land_registry_v2
    System owner:     MISSING (vendor contract expired 2024-11-30)
    Risk: system integrity cannot be assured

Recommended action:
  → Notify agency head of record for binding ownership assignment
  → Where ownership cannot be assigned, route to Ch. 14 escalator
```

#### 19.4 Guardrail

The detector does not assign ownership. Assignment is a governance decision;
the detector only exposes the gap.

---

## Chapter 20 — Handoff Failure Detector  *(§46 · Authority: A2)*

#### 20.1 Definition

A **handoff failure** is the breakdown of a process at the boundary between two
organizational units: Agency A → Agency B, or Department A → Department B.

#### 20.2 Detection

For each `HANDOFF_TO` edge in the GSKG (Ch. 5), Circle measures:

| Metric | Measurement |
|--------|-------------|
| Handoff latency | Time between sender completion and receiver acknowledgement |
| Handoff loss | Items sent but never received / acknowledged |
| Handoff rejection | Items received but rejected by receiver |
| Handoff rework | Items returned to sender for correction |
| Handoff exception rate | Frequency of exception paths at the handoff |

```
   Agency A — Process P1 ─── HANDOFF ───▶ Agency B — Process P2
                                            ├── latency?  ├── loss?
                                            ├── rejection?├── rework?
                                            └── exception?
```

A handoff edge is flagged when any two of the five metrics exceed peer baseline
by ≥ 1.5 σ.

#### 20.3 Output & Guardrail

Each flagged handoff is reported with sender and receiver GSKG nodes, the five
metric readings, the peer baseline used, recent case examples (linked, not
embedded), and a recommended coordination action. Handoff failures are usually
*organizational* issues, not individual misconduct. They are routed to the
inter-agency coordination function and only escalated to investigation when
coupled with control-bypass (Ch. 17) or concentration signals around the
handoff actor.

---

## Chapter 21 — Control Effectiveness Engine  *(§47 · Authority: A2)*

#### 21.1 Principle

> Do not assume that "control exists" equals "control works".

#### 21.2 Metrics

| Metric | Definition |
|--------|------------|
| Bypass rate | % of cases where the control was bypassed (legitimately or otherwise) |
| Override rate | % of cases where an explicit override was invoked |
| Failure rate | % of cases where the control executed but failed to detect / prevent |
| Effectiveness | 1 − (bypass + override + failure) normalized |
| Administrative burden | Median time / cost / steps the control adds to the process |

#### 21.3 Effectiveness ≠ Existence

A control can be 100% present in process documentation and 0% effective in
practice. The engine surfaces controls where `existence_rate = 100%` AND
`effectiveness < 50%` — these are **paper controls**.

#### 21.4 Burden / Effectiveness Trade-off

A control with high administrative burden and low effectiveness is a candidate
for redesign, not just enforcement. The engine computes:

```
Burden-to-Effectiveness Ratio = administrative_burden_score / effectiveness_score
```

A ratio > 2.0 (default) flags the control for redesign review.

#### 21.5 Output

```
CONTROL EFFECTIVENESS REPORT

Control: ctrl.procurement.bid_evaluation_segregation
Office:  office.commerce.east_2    Window: 2025-Q3

  existence_rate:       100%   (control defined for all 142 cases)
  bypass_rate:           18%   (25 cases bypassed)
  override_rate:          7%   (10 cases overridden)
  failure_rate:           4%   (6 cases: control ran, missed issue)
  effectiveness:         71%
  administrative burden: 78/100 (HIGH)
  burden-to-eff ratio:   1.10

Classification: WATCH (high burden, moderate effectiveness)
Recommended action:
  → Redesign segregation enforcement (system-supported) to reduce manual burden.
  → Investigate the 25 bypass cases for concentration (Ch. 17).
```

---

## Chapter 22 — Continuous Controls Monitoring  *(§48 · Authority: A2 / A3 financial)*

#### 22.1 Principle

> Where data is legally and technically available, continuously test controls
> instead of relying solely on periodic manual audits.

#### 22.2 What Changes vs. Traditional Audit

| Dimension | Periodic manual audit | Continuous controls monitoring |
|-----------|----------------------|-------------------------------|
| Frequency | Quarterly / annual | Continuous (event-driven or daily) |
| Coverage | Sample-based | Population (where authorized) |
| Latency | Weeks to months | Minutes to hours |
| Detection | After-the-fact | Near-real-time |
| Evidence | Manual working papers | System-captured, immutable |
| Cost profile | Labor-intensive per audit | Setup-intensive, low marginal cost |

#### 22.3 Test Library

For each control class, Circle maintains a library of executable assertions:

| Control class | Example test |
|---------------|--------------|
| Segregation of duties | `assert actor(approval) ≠ actor(request)` |
| Authorization required | `assert exists(authorization_record) for action in {payment, contract_signing}` |
| SLA adherence | `assert time_completed ≤ sla_target` |
| Document completeness | `assert exists(record_type) for each required_type in process` |
| Threshold compliance | `assert amount ≤ threshold OR exists(escalated_approval)` |
| Exception justification | `assert exists(justification_text) for each exception` |

#### 22.4 Execution Model

Tests run as events arrive — not on a schedule. A new payment posting triggers
the segregation test immediately; failure raises a Control Test Failure event
attached to the case (if any) or to the operational digest.

#### 22.5 Failure Handling

A failure is *not* an accusation. It triggers: (1) an immutable Control Test
Failure record; (2) notification to the control owner (Ch. 19 — must be
defined); (3) cross-reference to Ch. 17 (Bypass Radar); (4) inclusion in the
next Systemic Issue Escalator digest (Ch. 14).

#### 22.6 Where Continuous Monitoring Is Not Possible

Where data is not legally or technically available, the engine records the
gap and falls back to a documented periodic test, with the gap explicitly
visible in the control's effectiveness record (Ch. 21).

---

## Chapter 23 — Population-Wide Analytics  *(§49 · Authority: A2 / A3 financial)*

#### 23.1 Principle

> Allow analysis of complete authorized populations where feasible, not merely
> samples.

#### 23.2 Why Population, Not Sample

Sampling is appropriate for opinion research; it is rarely appropriate for
integrity monitoring. A 5% fraud rate in a sample of 200 is consistent with
0% fraud in the population *and* with 10% fraud in the population. With
population data, the answer is direct.

#### 23.3 Capabilities Enabled

True distribution of processing times; true exception-rate denominators;
complete concentration analysis (Ch. 17); complete pattern matching (Ch. 13);
complete control effectiveness (Ch. 21); complete corporate / asset
relationship graphs (Ch. 27, 28).

#### 23.4 Privacy and Authorization

Population analytics does not mean population surveillance. The engine operates
under: **purpose limitation** (analytics run only for an authorized purpose
stated in the Authorization Record); **minimum necessary fields** (only fields
strictly required for the test are accessed; identifiers tokenized where
possible); **aggregation by default** (outputs aggregated; individual records
surfaced only on per-case authorization); and **audit by default** (every
population query is logged and reviewable).

#### 23.5 Output Contract

Every population-wide analysis output is accompanied by: the exact query /
assertion executed; the authorization record under which it ran; the
population size covered; the number of records excluded and why; and the
aggregation level of the output.

---

## Chapter 24 — Procurement Integrity Engine  *(§50 · Authority: A2 / A3 drill-down)*

#### 24.1 Lifecycle Map

```
Tender → Bids → Supplier → Award → Contract → Amendment → Delivery → Invoice → Payment
```

Each node carries provenance, timestamp, and the GSKG office / system of
record. Edges carry causal / temporal semantics.

#### 24.2 Analytical Dimensions

| Dimension | What is analyzed |
|------------|------------------|
| Supplier concentration | Share of awards to top-N suppliers; HHI; trend |
| Repeat awards | Same supplier winning repeatedly without competition |
| Related entities | Suppliers sharing ownership / address / representatives / banking |
| Timing anomalies | Tender→award interval shorter than statutory minimum; invoice→payment acceleration |
| Unusual amendments | Material scope / price changes post-award without rebid |
| Price anomalies | Unit price vs. market benchmark; cross-tender price comparison |
| Unusual emergency procurement | Frequency of emergency exceptions; concentration by issuer |
| Suspicious patterns | Composite signals suggesting coordinated behavior |

#### 24.3 Composite Indicators

No single dimension auto-flags misconduct. The engine computes composite
indicators combining multiple dimensions. For example:

```
COMPOSITE: "Tailored Tender" indicator
  = (bid_window_shorter_than_statutory)
  × (winner_share ≥ 1.0 of qualifying bids)
  × (≤ 3 bidders)
  × (amendment_post_award_price_increase > 10%)
```

A composite that fires is classified `OPERATIONAL ANOMALY`, not `FRAUD`.

#### 24.4 Output

```
PROCUREMENT INTEGRITY DIGEST

Tender: T-2024-118 (road resurfacing, East-2)
  bid_window:             3 days  (statutory minimum: 14)  ⚠
  bidders:                 2  (of which 1 qualified)        ⚠
  winner:                  Acme Civil Works Ltd
  amendment_count:         3  post-award
  price_change:            +22% vs. original contract      ⚠
  delivery_delay:          +61 days
  supplier_concentration:   Acme holds 41% of regional road
                            contracts (12-month window)     ⚠

Composite indicator: "Tailored Tender" → FIRES
Classification: OPERATIONAL ANOMALY
Recommended action:
  → Open investigative review (Ch. 14 escalator)
  → Run Ch. 13: FIND THIS PATTERN ELSEWHERE
  → No automatic accusation. Human investigator required.
```

#### 24.5 Guardrail

> **No automatic accusation.**

Every output is a *lead*, not a *finding*. The engine never labels a person or
entity as fraudulent. Disposition rests with human investigators under
due-process rules.

---

## Chapter 25 — Public Funds Flow Map  *(§51 · Authority: A2 / A3 bank-account)*

#### 25.1 The Eight-Stage Funds Flow

```
   Budget → Allocation → Commitment → Procurement → Contract → Invoice → Payment → Recipient
```

#### 25.2 Node Schema

| Stage | Key attributes |
|-------|----------------|
| Budget | `fiscal_year`, `programme`, `amount`, `legal_basis` |
| Allocation | `agency`, `directorate`, `purpose`, `amount` |
| Commitment | `commitment_id`, `purpose`, `amount`, `date` |
| Procurement | `tender_id` (→ Ch. 24), `method`, `estimated_value` |
| Contract | `contract_id`, `supplier`, `value`, `duration` |
| Invoice | `invoice_id`, `amount`, `goods_received_date` |
| Payment | `payment_id`, `amount`, `date`, `bank_account` |
| Recipient | `beneficial_owner` (Ch. 27), `bank_account`, `jurisdiction` |

#### 25.3 Integrity Tests

| Test | What it asserts |
|------|-----------------|
| Budget exhausted | `sum(allocation) ≤ budget.amount` |
| Commitment within allocation | `commitment.amount ≤ remaining_allocation` |
| Procurement before commitment | `tender.date ≥ commitment.date` |
| Contract before payment | `contract.date < payment.date` |
| Invoice before payment | `invoice.date ≤ payment.date` |
| Payment to contracted party | `payment.recipient == contract.supplier` |
| Payment within contract value | `sum(payments) ≤ contract.value × (1 + amendment_delta)` |
| Beneficial owner resolvable | `recipient.beneficial_owner` non-null and matches Ch. 27 graph |

A failed integrity test is recorded as a Funds Flow Anomaly and routed to
Ch. 14 (escalator) and Ch. 24 (procurement integrity) as appropriate.

#### 25.4 Coupling

The Funds Flow Map is the spine that connects Procurement Integrity (Ch. 24,
joins on `tender_id` / `contract_id`); Contract Lifecycle Intelligence
(Ch. 26, joins on `contract_id`); Corporate Relationship Graph (Ch. 27, joins
on `supplier` / `recipient`); and Asset Relationship Graph (Ch. 28, joins on
`payment.bank_account`).

---

## Chapter 26 — Contract Lifecycle Intelligence  *(§52 · Authority: A2)*

#### 26.1 Lifecycle Map

```
Initiation → Drafting → Review → Signature → Activation → Execution
                                                            │
                                          ┌─────────────────┴────┐
                                          ▼                      ▼
                                     Amendment Loop       Milestone Tracking
                                          │                      │
                                          ▼                      ▼
                                     Re-baseline             Delivery
                                          │                      │
                                          └──────────┬───────────┘
                                                     ▼
                                                  Closure → Retention / Disposition
```

#### 26.2 Lifecycle Stages and Records

| Stage | Records expected |
|-------|------------------|
| Initiation | Need statement; procurement plan reference |
| Drafting | Draft contract; scope specification; risk assessment |
| Review | Legal review; technical review; financial review |
| Signature | Signed contract; signatory authority record |
| Activation | Notice to proceed; performance bond (where required) |
| Execution | Progress reports; inspection records; variation orders |
| Amendment | Amendment instruments; justification; re-approval |
| Milestone tracking | Milestone acceptance certificates |
| Delivery | Delivery certificates; commissioning records |
| Closure | Final acceptance; retention release; closeout report |
| Retention | Archival; disposition schedule |

Each stage links to its records via Ch. 8 and to its controls via the GSKG
(Ch. 5).

#### 26.3 Integrity Tests

| Test | What it asserts |
|------|-----------------|
| Review before signature | `signature.date > max(review.date)` |
| Amendment authorization | Every amendment has a recorded authorization |
| Milestone before payment | Payment against a milestone requires milestone acceptance |
| Delivery before closure | Closure requires delivery certificate |
| Retention compliance | Contract records retained for statutory period |

#### 26.4 Coupling with Cases

A contract node links to any case in which it appears (Ch. 12 correlation).
The reverse link is also visible: from a case, the investigator sees the full
contract lifecycle and the integrity-test results at each stage.

---

## Chapter 27 — Corporate Relationship Graph  *(§53 · Authority: A2 / A3 bank joins)*

#### 27.1 Boundaries

> Exercised **only where legally authorized**.

Not a public-data graph. Built from authorized sources (commercial registry,
procurement records, contract records, payment records, case records) under
the Authorization Registry rules.

#### 27.2 Graph Schema

```
              Person
                │
        ┌───────┼────────┐
        ▼       ▼        ▼
   Organization  Company  Representative
        │       │         │
        └───────┼─────────┘
                ▼
            Contract → Supplier → Payment → Case
```

#### 27.3 Edge Types

| Edge | Meaning |
|------|---------|
| `OWNS` | Person owns Company (with share %) |
| `CONTROLS` | Person controls Organization (voting / appointment power) |
| `REPRESENTS` | Person is a representative / signatory of Company |
| `AWARDED_TO` | Contract awarded to Supplier |
| `PAID_TO` | Payment made to Supplier / Recipient |
| `IMPLICATED_IN` | Entity implicated in Case |
| `RELATED_TO` | Entity related to another (shared ownership / address / banking) |

#### 27.4 Use Cases

Identify all contracts awarded to a supplier and its related entities;
identify all representatives of a company across the contract corpus;
identify common beneficial owners across seemingly unrelated suppliers;
identify payments received by a single bank account across multiple
suppliers (a strong indicator of shell-company structures).

#### 27.5 Guardrail

The graph surfaces *relationships*, not *conclusions*. A shared beneficial
owner across two suppliers is a relationship; whether it represents a conflict
of interest, a legitimate group structure, or a shell scheme is for the
investigator to determine, with due process.

---

## Chapter 28 — Asset Relationship Graph  *(§54 · Authority: A3)*

#### 28.1 Boundaries

> For authorized investigations only.

Extends Ch. 27 into the asset layer: real estate, vehicles, financial
instruments, and other registrable assets, where the asset registry is itself
authorized for ACA use.

#### 28.2 Graph Schema

```
   Person → Entity → Asset → Transaction → Jurisdiction → Evidence → Case
```

#### 28.3 Edge Types

| Edge | Meaning |
|------|---------|
| `OWNED_BY` | Asset owned by Person / Entity |
| `TRANSFERRED_TO` | Asset transferred (with date, value, consideration) |
| `LOCATED_IN` | Asset located in Jurisdiction |
| `EVIDENCED_BY` | Asset ownership / transfer evidenced by record |
| `IMPLICATED_IN` | Asset implicated in Case (subject of forfeiture, tracing, etc.) |

#### 28.4 Use Cases

Trace an asset across multiple transfers / jurisdictions; identify assets acquired by a person whose declared income does not support the acquisition; cross-reference asset transactions with payment flows (Ch. 25) to identify unexplained wealth patterns; support asset-recovery proceedings with an auditable evidence chain.

#### 28.5 Cross-Jurisdiction

Where the asset is in a jurisdiction outside ACA's direct authority, the graph
records the relationship and the *authorization gap*. The case team may then
issue a request through the Financial Information Gateway (Ch. 29) or
international cooperation channels.

#### 28.6 Guardrail

The Asset Relationship Graph is built for **tracing**, not **seizure**.
Seizure, freezing, and forfeiture are legal acts outside Circle's scope; the
graph only supports the evidentiary basis for them.

---

## Chapter 29 — Financial Information Gateway  *(§55 · Authority: A3)*

#### 29.1 Hard Constraint

> **Do not turn Circle into a bank.**

Circle is not a financial institution. It does not hold funds, execute
transfers, or settle obligations. It is an investigative platform.

#### 29.2 Capability

The Financial Information Gateway (FIG) implements secure, authorized
financial-information requests and evidence retrieval from regulated financial
institutions (banks, payment processors, financial-market infrastructures)
under the legal framework applicable to ACA.

#### 29.3 Request Types

| Request type | What is requested |
|---------------|-------------------|
| Account existence | Does an account exist for entity X? |
| Account metadata | Account opening date, signatories, beneficial owner |
| Transaction history | Transactions over a window meeting specified criteria |
| Counterparty lookup | Transactions involving a specified counterparty |
| Balance snapshot | Point-in-time balance (where authorized) |
| Wire / transfer trace | Cross-institution transfer trace |
| Linked accounts | Accounts sharing signatory / beneficial owner / device |

#### 29.4 Authorization Model

Every FIG request requires: (1) a per-case Authorization Record covering the
financial institution class; (2) a named investigator and supervisor; (3) a
stated investigative purpose tied to an open case; (4) a scoped request (no
fishing expeditions); and (5) a retention / disposition plan for the returned
data. Requests without all five elements are blocked at the gateway.

#### 29.5 Workflow

```
   Investigator defines scoped FIG request (per-case)
        ▼
   Authorization check (Authorization Registry)
        ▼
   Dual-approval (investigator + supervisor)
        ▼
   FIG request submission (signed, scoped, audit-logged)
        ▼
   Financial institution response handling
        ▼
   Provenance verification (Part II immutability rules)
        ▼
   Case attachment (via Ch. 9 + Ch. 10 reuse rules; joins Ch. 27, 28)
```

#### 29.6 Guardrails

The gateway **never** executes transfers, freezing orders, or asset seizures
itself (those are legal acts of the competent authority); **never** stores more
than the authorized scope of data; **never** exposes data outside the case team.
All requests and responses are immutable and audit-logged for the statutory
financial-investigation record period.

---

## Chapter 30 — Government Service Performance Observatory  *(§124 · Authority: A2)*

#### 30.1 Purpose

A continuous, population-level observatory of government service performance —
not for punitive purposes, but for systemic awareness. Where Ch. 1–4 are
*detection* capabilities, the Observatory is a *measurement* capability
looking at the whole system.

#### 30.2 Tracked Metrics

| Metric | Definition |
|--------|------------|
| SLA | Per-service SLA adherence (target vs. actual) |
| Median processing | Median end-to-end processing time per service |
| Worst cases | p95 and p99 processing time; named worst-case list |
| Queues | Active backlog per office; ageing distribution |
| Abandonment | Drop-off rate per service (Ch. 2) |
| Failure rate | Step-level failure rate per service |
| Geographic differences | Per-region performance breakdown |

#### 30.3 Dashboard Concept

```
GOVERNMENT SERVICE PERFORMANCE OBSERVATORY
Reporting window: 2025-Q3

Service                              SLA   Median  p95    Queue  Abandon Fail%  Geoσ
srv.civil.id_renewal                 87%   4.2d   11.8d   312    4.1%    1.8%   2.1
srv.business.license_new             72%  18.4d   47.2d  1184   24.5%    6.7%   3.4
srv.land.title_transfer              91%   6.1d   14.0d    78    2.9%    0.9%   1.2
srv.procurement.tender_publish       98%   2.1d    5.0d    11    0.4%    0.2%   0.8
srv.health.appointment_booking       64%   1.2d    9.1d   8412  31.2%   12.1%   4.2

Top alerts:
  - srv.health.appointment_booking: 64% SLA, 31% abandonment, geo-spread 4.2σ
    → Couple with Ch. 3 (Service Desert) and Ch. 17 (Bypass Radar)
  - srv.business.license_new: 72% SLA, 24.5% abandonment
    → Couple with Ch. 4 (Friction Index)

Observatory output is operational, not investigative, except where coupled
with anomaly signals from Ch. 1–4 and Ch. 17–18.
```

#### 30.4 Coupling

The Observatory provides the *context* against which detection engines
operate. An office showing low SLA in the Observatory *and* high override rate
in Ch. 17 is a stronger candidate for investigative review than either signal
alone.

---

## Chapter 31 — Government Process Benchmarking  *(§125 · Authority: A2)*

#### 31.1 Principle

Comparable offices and comparable services should produce comparable outcomes.
Where they do not, the divergence is itself a signal — sometimes of
misconduct, often of operational difference, occasionally of best practice.

#### 31.2 Cohort Construction

A cohort is a set of offices / services that are comparable on structural
dimensions:

| Dimension | Cohort criterion |
|-----------|------------------|
| Service | Same `service_id` |
| Office type | Same office class (regional, district, branch) |
| Demand profile | Similar per-capita demand |
| Resource profile | Similar staffing / budget per capita |
| Geography | Same urban / rural classification |

Offices that cannot be matched to a cohort of ≥ 5 are flagged
`LOW_COHORT_CONFIDENCE`.

#### 31.3 Benchmark Metrics

For each cohort member, Circle computes the cohort-relative position on: SLA
adherence (Ch. 30); median processing time; p95 / p99 processing time; drop-off
rate (Ch. 2); exception rate (Ch. 18); override / bypass rate (Ch. 17); Service
Friction Index (Ch. 4); and control effectiveness (Ch. 21).

#### 31.4 Output

| Office | SLA pct | Friction pct | Exception pct | Anomaly flags |
|--------|---------|--------------|---------------|---------------|
| office.commerce.east_2 | 23rd | 18th | 92nd | HIGH_EXCEPTION, HIGH_BYPASS |
| office.commerce.north_1 | 47th | 51st | 55th | — |
| office.commerce.west_3 | 88th | 79th | 12th | — |
| office.commerce.south_4 | 91st | 89th | 8th | BEST_PERFORMER |

Percentile ranks are explainable; the investigator can drill into the cohort
construction and underlying metrics.

---

## Chapter 32 — Learn From the Best Office  *(§126 · Authority: A2)*

#### 32.1 Principle

> Identify effective practices from high-performing units. This prevents the
> product from becoming purely punitive.

A platform that only ever detects problems will, over time, be perceived as
hostile by the very institutions it serves. Identifying and amplifying best
practice is a structural counterweight.

#### 32.2 Identification

A unit is identified as a **best performer** when it ranks in the top quartile
of its benchmark cohort (Ch. 31) on the majority of benchmark metrics *and*
shows no anomaly flags across Ch. 1, 4, 17, 18, 21.

#### 32.3 Practice Extraction

For each best performer, Circle supports a structured practice-extraction
workflow: (1) identify structural differences (staffing, tooling, process
variants); (2) identify behavioural differences (exception handling, escalation
cadence); (3) identify control-design differences (Ch. 21); (4) document the
practice as a candidate for replication.

#### 32.4 Replication Tracking

A documented practice becomes a **replication candidate**. Replication
candidates are tracked against the offices that adopt them, with
before/after metric comparisons. Successful replications are publicized
within the institutional partner network (subject to confidentiality).

#### 32.5 Guardrail

"Best performer" is not "perfect". A best-performing unit can still have
latent issues; the platform continues to monitor it under the same detection
engines as every other unit. Recognition is not exemption.

---

## Chapter 33 — Negative / Positive Balance  *(§127 · Authority: A2)*

#### 33.1 Principle

> Support both: detection of problems AND recognition of genuine improvement
> and good institutional performance.

#### 33.2 The Balance Requirement

Every periodic ACA report generated by Circle must include a **balance
section** recording, in comparable units:

| Side | Indicators |
|------|------------|
| Negative (problems detected) | Operational anomalies, systemic issue candidates, control failures, exception-economy warnings, unowned risks, handoff failures |
| Positive (improvements / good performance) | Best performers identified (Ch. 32), successful replications, declining exception rates, declining friction, improving SLA, control effectiveness gains |

#### 33.3 Why This Matters

Asymmetric reporting — only ever showing problems — produces three failure
modes: (1) **Institutional cynicism** — partner agencies stop engaging;
(2) **Defensive opacity** — agencies learn to withhold information;
(3) **Misallocated attention** — resources flow to visible failures while
quiet improvements go unsupported. The balance section corrects all three.

#### 33.4 Improvement Recognition

A unit that moves from `HIGH_EXCEPTION` to `WATCH` over four consecutive
quarters is recognized as a **Confirmed Improver**. Confirmed Improvers are
publicized within the institutional partner network; eligible for
practice-extraction (Ch. 32) where their improvement is attributable to a
transferable practice; and exempted from elevated scrutiny levels for a
defined cooling-off period (without losing baseline monitoring).

#### 33.5 Guardrail

Improvement recognition is **evidence-based**, not narrative. A unit cannot be
recognized as improving on the strength of self-reported narrative; the
metrics must support the claim, and the metrics must be drawn from the same
detection engines that flag problems.

---

## Chapter 34 — ACA Integration Control Tower Example  *(§209 · Authority: A1 view / A2 drill-down)*

#### 34.1 Purpose

A single, executive-level view of the state of the ACA sovereign integration
fabric. The Control Tower is the surface on which the strategic review
function reads the health of the platform at a glance.

#### 34.2 Demonstration Data

> **The figures below are demonstration data, not live readings. They
> illustrate the shape and resolution of the Control Tower; they are not a
> status report.**

```
ACA INTEGRATION CONTROL TOWER  (demonstration data)

  Systems                       Records                  Integrity
    Connected Systems:   37      Active Requests: 184     Sync Errors:      3
    Healthy:             34      Overdue:           11     Schema Changes:   1
    Degraded:              2      Missing Records:  613
    Offline:               1
                              Authorization
                                Pending Authorizations:  17
```

#### 34.3 Reading the Tower

| Tile | What it tells the reader |
|------|--------------------------|
| Connected Systems | Breadth of integration coverage (out of registered GSKG systems). |
| Healthy / Degraded / Offline | Operational posture of the integration fabric. |
| Active Requests | Outstanding Get-Missing-Record requests (Ch. 9) in flight. |
| Overdue | Requests past their SLA — direct candidates for Ch. 9 escalation. |
| Missing Records | Outstanding evidence gaps (Part I §18) across active cases. |
| Sync Errors | Integration-layer faults — feed Ch. 7 `UNAVAILABLE` states. |
| Schema Changes | Upstream schema drift — a GSKG / dependency-engine maintenance trigger. |
| Pending Authorizations | Authorization queue length — a process bottleneck indicator. |

#### 34.4 Drill-downs

Each tile drills to a detail view: **Degraded/Offline** → affected systems,
last-known-good timestamps, owning agency, current impact on active cases;
**Overdue requests** → list of overdue record requests, holding agency,
escalation step reached; **Missing records** → ranked by investigative
importance (Part I §20), with per-case linkage; **Sync errors** →
integration-layer log slice + suggested remediation; **Schema changes** → diff
view vs. last-known schema; affected processes / controls flagged via Ch. 5
GSKG impact analysis; **Pending authorizations** → queue with age, requester,
and authorization officer; ageing past threshold triggers escalation.

#### 34.5 Coupling & Banner

The Control Tower is not a stand-alone dashboard. It is the executive summary
view of the same data that drives Ch. 7 (Dependency Map), Ch. 9 (Missing Record
Workflow), Ch. 14 (Systemic Issue Escalator), and Ch. 19 (Unowned Risk
Detector). Every render carries a visible banner
(`DEMONSTRATION DATA — illustrative only; not a live status report.`); in
production the banner is replaced by a live-data provenance footer identifying
the data window, the authorization scope of the viewer, and the timestamp of
the last refresh.

---

## Appendix A — Cross-Capability Authorization Map (condensed)

| Authority | Capabilities |
|----------|--------------|
| **A1 only** | Ch. 6, 7, 8, 11, 12, 16 |
| **A1 read / A2 edit or batch** | Ch. 5 (edit), Ch. 9 (batch), Ch. 15 (estimate A1 / re-classify A2), Ch. 34 (A1 view / A2 drill-down) |
| **A2 only** | Ch. 1, 2, 3, 4, 17, 18, 19, 20, 21, 26, 30, 31, 32, 33 |
| **A2 / A3** (touches financial systems via A3 paths) | Ch. 13, 22, 23, 24, 25, 27 |
| **A3 only** (regulated financial data) | Ch. 28, 29 |
| **Indirectly touches financial systems** (no direct bank-data query) | Ch. 8, 9, 10, 14 |

> Each chapter header carries its own `*(§N · Authority: AN)*` tag; this appendix
> is a quick-scan summary only.

---

## Appendix B — Capability Coupling Diagram

```
GSKG (Ch. 5)
  ├─▶ Service analytics: Ch. 1, 2, 3, 4, 30, 31, 32, 33
  └─▶ Automatic Service Discovery (Ch. 6)
        ▼
      Case Information Dependency Map (Ch. 7)
        ▼
      System Dependency Engine (Ch. 8) → Get Missing Record (Ch. 9)
        ▼
      Request-Once / Reuse (Ch. 10)
        ▼
   ┌────────────────────────────────────────────────────────┐
   │  Cross-case engines: Ch. 11, 12, 13, 14                │
   └───────────────────────┬────────────────────────────────┘
                           ▼
   ┌────────────────────────────────────────────────────────┐
   │  Controls engines: Ch. 17, 18, 19, 20, 21, 22          │
   └───────────────────────┬────────────────────────────────┘
                           ▼
   ┌────────────────────────────────────────────────────────┐
   │  Financial engines: Ch. 24, 25, 26, 27, 28, 29          │
   └───────────────────────┬────────────────────────────────┘
                           ▼
   ┌────────────────────────────────────────────────────────┐
   │  Reporting: Ch. 30, 31, 32, 33, 34                      │
   └────────────────────────────────────────────────────────┘
```

---

## Closing Note

Part III completes the Service Intelligence, Financial Intelligence, and
Government Systems Integration layer of the ACA Sovereign Edition. With Part I
(Case & Evidence Intelligence) and Part II (Evidence Integrity, Provenance &
Immutability), it defines a platform that detects service failure even when
citizens are silent (Ch. 1–4); maps the entire government service topology
(Ch. 5–8); retrieves missing evidence through a tracked, audited, reusable
workflow (Ch. 9–10); correlates across cases and the whole ecosystem
(Ch. 11–13); distinguishes individual, process, and system contributions
(Ch. 16); measures control effectiveness continuously (Ch. 17–22); traces
public funds from budget to recipient and into corporate / asset relationships
without ever becoming a bank (Ch. 24–29); balances detection of problems
with recognition of genuine improvement (Ch. 30–33); and presents the whole
state on a single executive surface (Ch. 34).

Every capability is bounded by the legal mandate of the host ACA, the
Authorization Registry, and the provenance and immutability guarantees of
Parts I and II. Where data is unavailable or unauthorized, the platform
degrades gracefully to a documented request-and-await mode rather than
silently disabling the capability. Where analytical signals fire, they are
*leads*, never *findings*; disposition rests with human investigators under
due process.

> **Circle ACA — Sovereign Edition.** Service & Financial Intelligence.
> Part III of the Blueprint. End of document.

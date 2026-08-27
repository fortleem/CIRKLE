# CIRCLE ACA — Oversight Fabric & Evidence Intelligence

## Part II of the ACA Sovereign Edition Blueprint

> **Scope.** This document is Part II of the ACA Sovereign Edition Blueprint. It covers the institutional architecture that turns disconnected administrative records into a continuously-reconciled, audit-ready evidence fabric: the Oversight Fabric (§9), the National Administrative Ontology (§10), the Smart Evidence Graph (§11), the Smart Dynamic Timeline (§12), Temporal Intelligence (§13), the Investigation Time Machine (§14), the Administrative Process Digital Twin (§15–16), the Evidence Gap, Volatility and Acquisition engines (§17–20), Case Information Readiness (§21), the Alternative-Hypothesis Engine (§22), Devil's Advocate AI (§23), Mandatory Exculpatory Search (§24), Negative-Space Intelligence (§25), the "Too Perfect" Detector (§26), and a worked Case Readiness Example (§208).
>
> **Companion documents.** Part I — Vision, Boundary, Identity, Sovereign Deployment. Part III — Government Service Intelligence, Systems Dependency Engine, Regulatory Intelligence. Part IV — Investigation AI, Risk/Corruption Intelligence, Inspection Operations, Financial Intelligence. Part V — Inter-agency Coordination, Integration Fabric, Zero Trust, AI Governance. Part VI — Findings, Reform, Early Warning, International Cooperation. Part VII — Training/Simulation, Analytics/Executive Command, DR/Continuity, Data Governance, Compliance Mapping, Deployment, Roadmap, Use Cases, KPIs, Acceptance.
>
> **Reading conventions.** The key words **MUST**, **SHALL**, **SHOULD** and **MAY** are used in the institutional sense. The word *evidence* is used in the administrative-investigative sense and not in any criminal-procedural sense unless a competent authority has formally designated the matter as such. Inferences produced by ACA intelligence engines are *hypotheses* and **MUST NOT** be presented as proven facts.

---

## Table of Contents

1. **Chapter 1** — ACA Oversight Fabric (§9)
2. **Chapter 2** — National Administrative Ontology (§10)
3. **Chapter 3** — Smart Evidence Graph (§11)
4. **Chapter 4** — Smart Dynamic Timeline (§12)
5. **Chapter 5** — Temporal Intelligence (§13)
6. **Chapter 6** — Investigation Time Machine (§14)
7. **Chapter 7** — Expected Process vs Actual Process (§15)
8. **Chapter 8** — Administrative Process Replay (§16)
9. **Chapter 9** — "What Should Exist?" Engine (§17)
10. **Chapter 10** — Evidence Gap Engine (§18)
11. **Chapter 11** — Evidence Volatility Engine (§19)
12. **Chapter 12** — Smart Evidence Acquisition Planner (§20)
13. **Chapter 13** — Case Information Readiness (§21)
14. **Chapter 14** — Alternative-Hypothesis Engine (§22)
15. **Chapter 15** — Devil's Advocate AI (§23)
16. **Chapter 16** — Mandatory Exculpatory Search (§24)
17. **Chapter 17** — Negative-Space Intelligence (§25)
18. **Chapter 18** — "Too Perfect" Detector (§26)
19. **Chapter 19** — Case Readiness Example (§208)

---

## Chapter 1 — ACA Oversight Fabric (§9)

### 1.1 Purpose

The **Oversight Fabric** is the core institutional architecture of the ACA sovereign environment. It exists to ensure that no administrative action, decision, payment, or exception exists in isolation. Every object that the ACA touches — a piece of evidence, an event in a timeline, a person, an official, an organization, an agency, a service, a process, an application, a document, an inspection, a transaction, a contract, a payment, a location, a complaint, a case, a rule, a control, a finding, a recommendation, or a corrective action — is represented exactly once and connected to every other object that legitimately relates to it.

The Oversight Fabric is not a database. It is a **canonical relationship contract** layered on top of authoritative systems of record. ACA never steals ownership of a record from its source system; it indexes, references, links and reasons over it.

### 1.2 Canonical Relationship Contract

The fabric binds 22 institutional object classes through a single typed relationship model:

```
 Evidence ─── Events ─── Timeline ─── People ─── Officials ─── Organizations
     │           │           │           │            │              │
     │           │           │           │            │              ▼
     │           │           │           │            │         Agencies
     │           │           │           │            │              │
     │           │           │           │            ▼              ▼
     │           │           │           │       Services ◀──── Processes
     │           │           │           │            │              │
     │           │           │           ▼            ▼              ▼
     │           │           │      Applications ◀── Documents ◀── Inspections
     │           │           │           │            │              │
     │           │           ▼           ▼            ▼              ▼
     │           │        Cases ◀── Complaints ◀── Transactions ◀── Contracts
     │           │           │                                 │
     │           │           │                                 ▼
     │           │           │                              Payments
     │           │           │                                 │
     │           │           ▼                                 ▼
     │           └────── Locations ◀── Rules ◀── Controls ◀── Findings
     │                               │            │            │
     └───────────────────────────────┴────────────┴────────────┤
                                                               ▼
                                            Recommendations ── Corrective Actions
```

Each arrow is a typed relationship with an explicit cardinality, provenance, confidence level, and audit record. There are no implicit connections: every link is either **Confirmed**, **Documented**, **System-derived**, **Potential**, **Unverified**, or **Contradicted** (see §3.4).

### 1.3 The 22 Object Classes at a Glance

| # | Object | One-line definition | Primary owner system |
|---|--------|--------------------|-----------------------|
| 1 | Evidence | Any artifact (document, log, image, recording, system record) relevant to a case | ACA Evidence Store |
| 2 | Event | A discrete occurrence at a point in time involving one or more objects | ACA Event Bus |
| 3 | Timeline | An ordered, evidence-anchored view of events for a case | ACA Timeline Service |
| 4 | Person | A natural person who is the subject of, or actor in, a matter | National Identity Registry |
| 5 | Official | A person holding a public-sector role with delegated authority | HR / Civil Service Registry |
| 6 | Organization | A legal entity (company, NGO, partnership) | Business Registry |
| 7 | Agency | A government body with statutory mandate | Government Org Registry |
| 8 | Service | A public-facing administrative service | Service Catalogue |
| 9 | Process | The defined workflow delivering a service | Process Registry |
| 10 | Application | A citizen/entity submission requesting a service outcome | Case Workflow System |
| 11 | Document | A record produced or required by a process step | Document Management System |
| 12 | Inspection | A field or documentary verification act | Inspection Management |
| 13 | Transaction | A unitary system operation (status change, posting, dispatch) | Source system |
| 14 | Contract | A binding agreement involving public resources | Procurement System |
| 15 | Payment | A disbursement of public funds | Treasury / IFMIS |
| 16 | Location | A physical place relevant to an event or asset | Geo Registry |
| 17 | Complaint | A formal grievance received from any channel | Citizen Intake |
| 18 | Case | The ACA investigative unit | ACA Case Management |
| 19 | Rule | A binding administrative rule | Rules Registry |
| 20 | Control | A safeguard step (segregation, approval, validation) | Controls Catalogue |
| 21 | Finding | A documented conclusion reached by ACA | ACA Findings Register |
| 22 | Recommendation | A formal ACA recommendation to a named addressee | Recommendations Register |
| 23 | Corrective Action | An action committed in response to a recommendation | Corrective Actions Register |

> Note: 22 institutional classes are listed here for the fabric; Chapter 2 expands these into the full 37-object National Administrative Ontology that the fabric operates over.

### 1.4 How Everything Links

The fabric is implemented as a typed multi-graph with the following invariants:

1. **Single canonical instance per real-world object.** A given person, document, payment or contract exists exactly once. Source-system identifiers are stored as attributes, never as separate object instances.
2. **Every relationship is named, dated, sourced and signed.** A link is not just `(a, b)` but `(a, REL_TYPE, b, since_ts, source_system, source_record_id, confidence, signed_by)`.
3. **Source of record is always preserved.** ACA never silently mutates an authoritative record. Where ACA derives a fact (e.g., "this payment closed the contract"), the derived fact is stamped `system-derived` and the underlying source records remain the ground truth.
4. **Provenance is immutable.** Once an evidence item is linked, the link history (including its confidence classification) is retained for the lifetime of the case plus the regulatory retention window.
5. **Bidirectional navigation.** From any object, an authorized investigator can navigate to every related object in either direction. The relationship itself carries the inverse label (e.g., `paid_by` ↔ `pays`).
6. **Confidence-aware queries.** All fabric queries accept a `min_confidence` parameter. By default, system-derived inferences are not surfaced as proven facts in investigator UI.

### 1.5 Fabric Boundary

The Oversight Fabric terminates at the Secure Institutional Gateway. Public Circle modules (Wasl, Mashahd, Lamahat, Midan, Circles, Citizen Shield, etc.) interact with the fabric only through the **Citizen-to-ACA Secure Intake** boundary described in Part I. Citizen-submitted material enters the fabric as `Unverified` evidence with a clear citizen-intake provenance stamp; it is never auto-promoted to `Confirmed` or `Documented` without an ACA-authorized verification act.

---

## Chapter 2 — National Administrative Ontology (§10)

### 2.1 Purpose

The National Administrative Ontology is the controlled vocabulary the Oversight Fabric speaks. Without a shared ontology, linkages degrade into free-text associations. The ontology fixes 37 canonical object types and the relationships permitted between them.

### 2.2 The 37 Canonical Objects

| # | Object | Definition | Mandatory attributes |
|---|--------|-----------|----------------------|
| 1 | Person | A natural person | national_id (hashed), name, DOB, nationality, status |
| 2 | Official | A person holding a public role | role, delegating_authority, scope, appointment_act |
| 3 | Employee | A person in an employment relationship with an agency | employer, position, grade, start, end |
| 4 | Organization | A legal entity | registry_id, legal_form, sector, status |
| 5 | Agency | A government body | mandate, parent_ministry, head, statutory_basis |
| 6 | Directorate | A sub-unit of an agency | parent_agency, head, mandate |
| 7 | Office | A discrete operating unit | parent_directorate, location, head |
| 8 | Service | A public-facing service | owning_agency, channel, sla, eligibility |
| 9 | Process | The workflow delivering a service | owner_role, steps, controls, version |
| 10 | Sub-process | A contained workflow unit | parent_process, entry, exit |
| 11 | Case | An ACA investigative unit | case_id, opened_at, status, scope, lead |
| 12 | Complaint | A formal grievance | channel, complainant_hash, received_at, subject |
| 13 | Application | A service request | service_id, applicant, submitted_at, status |
| 14 | Inspection | A verification act | type, scope, inspector, date, location |
| 15 | Evidence | An artifact attached to a case | type, hash, source, acquired_at, volatility |
| 16 | Document | A record produced/required | doc_type, issuing_system, signed_by, hash |
| 17 | Decision | An authoritative determination | decider, decision_type, basis, effective_at |
| 18 | Transaction | A unitary system operation | system, op_type, ts, actor, before, after |
| 19 | Contract | A binding agreement | parties, value, period, type |
| 20 | Payment | A disbursement of public funds | payer, payee, amount, purpose, treasury_ref |
| 21 | Asset | A physical or digital asset | type, owner, location, value, status |
| 22 | Location | A physical place | geo_hash, address, type |
| 23 | Event | A discrete occurrence | ts, actor, type, participants, system |
| 24 | Rule | A binding administrative rule | authority, jurisdiction, effective_at, status |
| 25 | Regulation | A statutory instrument | instrument_no, gazette_ref, effective_at |
| 26 | Control | A safeguard step | control_type, owner, frequency, evidence_required |
| 27 | Finding | A documented conclusion | finding_type, basis_evidence, severity |
| 28 | Recommendation | A formal recommendation | addressee, due_date, basis_finding |
| 29 | Corrective Action | A committed action | owner, due_date, status, verifying_evidence |
| 30 | Referral | A formal handover to another body | from, to, reason, handover_at |
| 31 | Investigation | A structured inquiry | investigation_id, scope, lead, mandate |
| 32 | Assignment | A work unit assigned to a person | assigned_to, role, due, deliverable |
| 33 | Device | A device used in an event | type, owner, identifier, last_seen |
| 34 | Identity | A digital identity | provider, identifier, trust_level |
| 35 | Data Source | An authoritative system of record | name, owner_agency, schema_ref, freshness |
| 36 | Timeline | An ordered view of events for a case | case_id, ordered_events, anchors |
| 37 | Risk Indicator | A derived signal of elevated risk | indicator_type, basis, severity, volatility |

### 2.3 Relationship Types

The ontology defines eight typed relationships. All other verbs in the fabric are sub-types of these eight.

| Relationship | Symbol | Inverse | Semantics | Example |
|--------------|:-----:|:-------:|-----------|---------|
| `relates_to` | `~` | `~` | Generic association; the weakest link | Complaint ~ Application |
| `part_of` | `⊆` | `⊇` | Containment / composition | Sub-process ⊆ Process |
| `owns` | `⊙` | `⊙⁻¹` | Stewardship of an object | Agency ⊙ Service |
| `produced` | `→` | `←` | Generation of an object | Process → Document |
| `references` | `ref` | `refBy` | Citation of one record by another | Document ref Rule |
| `triggered` | `⇒` | `⇐` | Causal trigger (still a hypothesis unless Confirmed) | Event ⇒ Event |
| `contradicts` | `⊘` | `⊘` | Mutual incompatibility | Evidence ⊘ Evidence |
| `supersedes` | `⇉` | `⇇` | Versioned replacement | Regulation ⇉ Regulation |

### 2.4 Core Relationship Matrix (excerpt)

Rows = source object; Columns = permitted target objects. `●` = direct relationship is permitted; `○` = only via an intermediate; `—` = not permitted.

| Source \ Target | Person | Official | Organization | Agency | Service | Process | Case | Complaint | Application | Document | Evidence | Event | Payment | Contract | Decision | Rule | Control | Finding |
|-----------------|:----:|:-------:|:------------:|:------:|:-------:|:-------:|:----:|:--------:|:-----------:|:--------:|:--------:|:-----:|:-------:|:--------:|:--------:|:----:|:-------:|:-------:|
| Person          | ● | ● | ● | — | — | — | ● | ● | ● | ● | ● | ● | ○ | ○ | ○ | — | — | ○ |
| Official        | ● | ● | ○ | ● | ○ | ○ | ● | ● | ● | ● | ● | ● | ○ | ○ | ● | ○ | ● | ○ |
| Organization    | ● | ○ | ● | — | ● | — | ● | ● | ● | ● | ● | ● | ● | ● | ○ | — | — | ○ |
| Agency          | — | ● | — | ● | ● | ● | ● | ○ | ○ | ○ | ○ | ● | ○ | ● | ● | ○ | ● | ○ |
| Service         | — | ○ | ● | ● | ● | ● | ● | ● | ● | ● | ○ | ● | — | — | ○ | ● | ● | ○ |
| Process         | — | ○ | ○ | ● | ● | ● | ● | ○ | ● | ● | ○ | ● | ● | ● | ● | ● | ● | ○ |
| Case            | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| Evidence        | ● | ● | ● | ○ | ○ | ○ | ● | ● | ○ | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |

> The full 37×37 matrix is maintained in the ontology registry; this excerpt illustrates the discipline: for example, `Person → Payment` is only permitted via an intermediate (e.g., a Decision, Contract, or Application), preventing fabricated direct causal links between a person and a disbursement.

### 2.5 Object Lifecycle Invariants

1. **Identity once, referenced everywhere.** A canonical object identifier (CAO-ID) is minted once. Source-system identifiers are stored as cross-references.
2. **Soft-deletion only.** No canonical object is ever hard-deleted. Status transitions (`active` → `closed` → `archived` → `retention_only`) carry timestamps and authority.
3. **Versioning is explicit.** When a process or rule changes, the new version supersedes the prior version via `supersedes`; historical cases keep their reference to the prior version.
4. **Mandatory provenance fields.** Every object carries `created_at`, `created_by`, `created_via`, `source_system`, `source_record_id`, `last_verified_at`.

### 2.6 Ontology Governance

The National Administrative Ontology is governed by the **Ontology Custodian** role (see Part V — AI Governance). Adding a new object type or relationship type requires:

- A formal change request with rationale.
- Impact assessment on existing cases (retro-linkage obligations).
- Approval by the Data Governance Committee.
- Version bump of the ontology and migration of dependent catalogs.

The ontology is treated as **critical national infrastructure**. Breaking changes to it are subject to the same change-management discipline as a constitutional instrument.

---

## Chapter 3 — Smart Evidence Graph (§11)

### 3.1 Purpose

The Smart Evidence Graph is the ACA's continuous reasoning layer over evidence. Every evidence item acquired — by intake, integration, inspection, or formal request — is automatically evaluated for connections across the entire fabric. The output is a typed, confidence-stamped, audit-traceable graph that an investigator can navigate, challenge, and extend.

### 3.2 Automatic Connection Targets

When a new evidence item `E` enters the fabric, the graph engine **MUST** evaluate it for connections to each of the following:

| # | Connection target | Matching basis |
|---|------------------|----------------|
| 1 | Other evidence | Hash, near-duplicate, shared actors, shared timestamps |
| 2 | Cases | Subject person/entity, service, agency, time window |
| 3 | Complaints | Same subject, same actor, same service |
| 4 | People | Named persons, biometric matches (where authorized), device fingerprints |
| 5 | Officials | Role, scope, signing authority |
| 6 | Entities | Registration number, beneficial-ownership chain |
| 7 | Companies | Trade name, registry ID, address, signatories |
| 8 | Services | Service code referenced in the artifact |
| 9 | Applications | Application number, applicant, service |
| 10 | Documents | Doc type, hash, signing chain, version |
| 11 | Inspections | Inspection ID, inspector, scope, date |
| 12 | Transactions | Transaction ID, before/after state, actor |
| 13 | Contracts | Contract number, parties, period |
| 14 | Payments | Treasury reference, payee, amount, purpose |
| 15 | Decisions | Decision type, decider, basis |
| 16 | Locations | Geo-hash, address, GPS coordinates |
| 17 | Agencies | Mandate, ownership of the source system |
| 18 | Systems | Source system identifier, schema version |
| 19 | Rules | Rule ID cited in or violated by the evidence |
| 20 | Events | Timestamp, actor, system, transaction |
| 21 | Previous investigations | Same pattern, same actor, same control failure |

### 3.3 Relationship Classification

Every connection minted by the Smart Evidence Graph is stamped with one of six classifications. The classification governs how the connection is presented to investigators and whether it can be cited in formal findings.

| Classification | Definition | Typical provenance | Presentable in findings? |
|----------------|------------|--------------------|--------------------------|
| **Confirmed** | Independently verified by ≥2 authoritative sources, or by an ACA verification act | Cross-source reconciliation | Yes — primary |
| **Documented** | Supported by an authoritative document whose chain of custody is intact | Document with provenance | Yes — supporting |
| **System-derived** | Computed by ACA engines from source records (e.g., inferred link) | Engine output | **NO** — must be presented as inference |
| **Potential** | Pattern match suggests a link but no supporting record yet | Pattern engine | No — investigative lead only |
| **Unverified** | Single-source, unverified, e.g., citizen intake | Citizen intake | No — must be flagged |
| **Contradicted** | Conflicts with one or more other records of equal or higher authority | Conflict detector | Yes — as contradiction |

### 3.4 The Cardinal Rule

> **NEVER present a system-derived inference as a proven fact.**

This rule has teeth. It is enforced at three layers:

1. **UI layer.** System-derived connections render with a dashed line and an "inferred" tag; they cannot be selected as the sole basis for a formal finding.
2. **API layer.** The `/evidence/links` endpoint returns a `confidence` field; consumers that omit this field in their queries are denied.
3. **Audit layer.** Any formal finding that cites a system-derived link without an independent verification act is flagged at submission and rejected by the Findings Register.

### 3.5 Evidence Graph Visualization (Conceptual)

```
                       ┌────────────┐
                       │  Evidence  │
                       │   E-1142   │
                       └─────┬──────┘
            Documented │     │ Potential     │ System-derived
                      ▼     ▼                ▼
              ┌──────────┐ ┌──────────┐  ┌─────────────┐
              │ Document │ │ Person   │  │ Pattern     │
              │  D-771   │ │ P-0042   │  │ Cluster     │
              └────┬─────┘ └────┬─────┘  │ C-19 (×3)   │
                   │ Confirmed  │           └─────┬───────┘
                   ▼            ▼                  │ Potential
              ┌──────────┐ ┌──────────┐            ▼
              │ Payment  │ │ Official │       ┌──────────┐
              │  P-5581  │ │   O-118  │       │ Prior    │
              └────┬─────┘ └────┬─────┘       │ Case     │
                   │ Contradicted│            │ INV-2031 │
                   ▼            ▼            └──────────┘
              ┌──────────┐ ┌──────────┐
              │ Payment  │ │ Decision │
              │  P-5582  │ │  D-910   │
              └──────────┘ └──────────┘
```

The graph shows that E-1142 is *documented* as the basis for D-771 (a document), *potentially* linked to person P-0042, and *system-derived* linked to a prior case cluster. The two payments attached to D-771 are themselves *contradicted*: one of them must be wrong, and the graph surfaces that without resolving it.

### 3.6 Connection Refresh

The graph is not static. Three triggers cause connection re-evaluation:

- **Source change** — when a source system updates a record the graph references.
- **New evidence** — when a new evidence item is acquired.
- **Time decay** — `Potential` and `Unverified` connections decay after a configurable interval unless promoted by an investigator or escalated by a pattern engine.

Decay does not delete the connection; it lowers the confidence to `Stale` and queues the link for re-evaluation.

---

## Chapter 4 — Smart Dynamic Timeline (§12)

### 4.1 Purpose

Every case MUST automatically generate a **Smart Dynamic Timeline**: a chronologically ordered, evidence-anchored view of every event relevant to the case. The timeline is the primary investigative narrative surface; it is the answer to the question "what happened, in what order, supported by what evidence?"

### 4.2 Timeline Composition

A timeline entry is a 7-tuple:

```
(event_id, timestamp, event_type, actor, evidence_ref[], source_record, related_events[])
```

| Field | Meaning |
|-------|---------|
| `event_id` | Stable identifier |
| `timestamp` | UTC-normalized timestamp (with timezone and clock-source) |
| `event_type` | Controlled vocabulary (Application, Review, Exception, Override, Approval, Payment, Inspection, Complaint, Decision, Referral, etc.) |
| `actor` | The person, official, system or process that performed the event |
| `evidence_ref[]` | One or more evidence items that anchor this event |
| `source_record` | The authoritative record that produced this event |
| `related_events[]` | Other timeline entries linked via `triggered`, `part_of`, or `contradicts` |

### 4.3 Example End-to-End Chain

The canonical example provided in the source blueprint (§12) is reconstructed below. Each arrow is a `triggered` relationship, but every step is anchored by at least one piece of evidence:

```
 Application  ──triggered──▶  Document Review
      │                            │
      │ evidence: APP-118/2024     │ evidence: REV-441
      ▼                            ▼
 Exception  ──triggered──▶  Employee Action
      │                            │
      │ evidence: EXC-007          │ evidence: ACT-220
      ▼                            ▼
 Inspection  ──triggered──▶  Override
      │                            │
      │ evidence: INS-91           │ evidence: OVR-13
      ▼                            ▼
 Approval   ──triggered──▶  Payment
      │                            │
      │ evidence: APR-77           │ evidence: PMT-5581
      ▼                            ▼
 Complaint  ──triggered──▶  ACA Action
      │                            │
      │ evidence: CMP-301          │ evidence: ACA-001
      ▼                            ▼
   Case opened                Case lead assigned
```

### 4.4 Click-Through Navigation

Every timeline event supports seven click-throughs:

| Click-through | Destination |
|---------------|-------------|
| **Timeline Event** | The event detail (actor, type, timestamp, source) |
| **Source** | The authoritative system of record that produced the event |
| **Evidence** | The evidence item(s) anchoring the event |
| **Person** | The actor's canonical person/official record |
| **System** | The system through which the event was performed |
| **Rule** | The rule, regulation, or control that governed (or was violated by) the event |
| **Related Event** | Other timeline entries linked to this one |

This means an investigator can begin at any event in the timeline and traverse to any related object in the fabric without losing the audit trail.

### 4.5 Timeline Integrity Invariants

1. **No anchorless events.** A timeline event without at least one evidence reference is shown as a *placeholder* with a warning; it cannot be used as the basis for a finding.
2. **Timestamps are normalized, original timestamps are preserved.** Every event stores both the original (with timezone and clock source) and the UTC-normalized timestamp.
3. **Events are immutable once anchored.** Corrections are made by appending a new event with a `supersedes` link; the original event remains visible.
4. **Confidence is propagated.** If all anchoring evidence for an event is `Unverified`, the event itself is rendered with a dashed outline and an "unverified" tag.

### 4.6 Rendering Modes

The timeline supports three rendering modes:

- **Linear** — strict chronological order.
- **Actor-stratified** — grouped by actor (swim-lanes).
- **Process-stratified** — grouped by process step (expected vs actual, see Chapter 7).

Investigators may toggle between modes without losing context.

---

## Chapter 5 — Temporal Intelligence (§13)

### 5.1 Purpose

Temporal Intelligence is the discipline of treating *time itself* as evidence. The Temporal Integrity Analysis engine continuously inspects every case timeline for anomalies that suggest error, manipulation, or process breakdown. It produces *signals*, never conclusions.

### 5.2 Detected Anomaly Classes

| # | Anomaly class | Detection signal | Default severity |
|---|---------------|-------------------|------------------|
| 1 | Missing events | A required process step is absent from the timeline | High |
| 2 | Time gaps | Interval between two consecutive steps exceeds the SLA band | Medium |
| 3 | Impossible sequences | Event B precedes Event A but B depends on A | Critical |
| 4 | Duplicate events | Two events share timestamp, actor, type, and source record | High |
| 5 | Conflicting timestamps | Two authoritative sources disagree on when an event occurred | High |
| 6 | Abnormal processing times | Duration falls outside the historical distribution for the service | Medium |
| 7 | Unexpected timing | Event occurs outside operating hours, holidays, or shift patterns | Medium |
| 8 | Device clock anomalies | Device-reported timestamp drifts from authoritative system clock | High |
| 9 | Events outside normal workflow | Event of a type not defined in the process model | High |
| 10 | Actions before authorization | Action performed before the authorization that should precede it | Critical |
| 11 | Suspicious sequencing | Sub-step ordering violates the process dependency graph | High |

### 5.3 Detection Method

For each anomaly class, the engine applies a three-step method:

1. **Establish baseline.** For each service/process, the engine maintains a historical distribution of expected durations, sequences, and timing windows sourced from prior authorized cases.
2. **Compare actual.** Each case timeline is compared against the baseline; deviations exceeding configurable thresholds are flagged.
3. **Classify and route.** Each flag is classified by severity and routed: Critical anomalies trigger immediate investigator notification; Medium/Low anomalies are accumulated in the case's Temporal Integrity Report.

### 5.4 Temporal Integrity Report

Every case carries a Temporal Integrity Report summarizing all detected anomalies:

```
TEMPORAL INTEGRITY REPORT — Case 118/2024
─────────────────────────────────────────
Anomalies detected: 4
  Critical: 1   High: 2   Medium: 1

  1. [CRITICAL] Action before authorization
     Event: Approval APR-77 at 2024-03-11 09:12
     Prior authorization: AUT-203 at 2024-03-11 14:40
     Gap: -5h28m  (approval precedes authorization)
     Evidence: AUT-203, APR-77
     Source: IFMIS, Workflow System
     Status: UNRESOLVED

  2. [HIGH] Conflicting timestamps
     Event: Payment PMT-5581
     Treasury timestamp: 2024-03-12 10:00
     Workflow timestamp : 2024-03-12 11:30
     Evidence: PMT-5581
     Status: UNRESOLVED

  3. [HIGH] Time gap
     Between: Document Review REV-441 and Exception EXC-007
     Expected: ≤ 2 working days
     Actual: 9 working days
     Status: EXPLAINED (inspector leave — supporting evidence INS-91)

  4. [MEDIUM] Abnormal processing time
     Service: Permit Issuance
     Median historical duration: 6 days
     Case duration: 1 day
     Status: UNRESOLVED
```

### 5.5 Invariants

- The Temporal Integrity Report is regenerated whenever a new event is added or a source record is updated.
- Every anomaly remains in the report until an investigator explicitly resolves it (with a recorded rationale) or the case is closed.
- Resolved anomalies are retained for the lifetime of the case for audit.
- Temporal signals are *never* auto-promoted to findings; they are inputs to the Alternative-Hypothesis Engine (Chapter 14).

---

## Chapter 6 — Investigation Time Machine (§14)

### 6.1 Purpose

Authorized investigators MUST be able to ask: **"What did ACA know at a given time?"** The Investigation Time Machine answers that question by reconstructing the state of the evidence fabric, the timeline, the case file, the gaps, and the inferences as they existed on any chosen date — without silently rewriting that historical context with later knowledge.

### 6.2 The Three-State Comparison

For any case, an investigator can select up to three reference points:

| State | Definition |
|-------|------------|
| **State on Date A** | The fabric, timeline, gaps, and inferences as they existed at end-of-day on Date A |
| **State on Date B** | Same, for Date B (B > A) |
| **Current state** | Today's fabric, including all later-acquired evidence |

The Time Machine renders a side-by-side comparison so the investigator can see:

- What evidence existed at A vs B vs now.
- What gaps were open at A vs B vs now.
- What hypotheses were live at A vs B vs now.
- What findings were draft, submitted, or finalized at A vs B vs now.

### 6.3 Anti-Rewrite Principle

> **Later knowledge must not silently rewrite historical decision context.**

When evidence is acquired *after* a decision was made, the Time Machine preserves the decision in its original context. The new evidence is shown as a *later* addition; the original decision is not retroactively re-evaluated unless a formal re-review is opened.

This is operationally enforced by:

1. **Append-only evidence ledger.** Once an evidence item is attached to a case at time T, it cannot be moved to a timestamp before T.
2. **Decision snapshots.** When a decision is recorded, the engine captures a snapshot of the case state at that moment. Later evidence acquisition does not alter the snapshot.
3. **Versioned findings.** A finding has a `as_of` timestamp. If new evidence emerges, a new finding version is created; the prior version is retained and visibly superseded.

### 6.4 Use Cases

| Use case | Why it matters |
|----------|----------------|
| Defending a past ACA decision | Demonstrates that the decision was reasonable given the information available at the time |
| Identifying intelligence failures | Shows where critical evidence existed in a source system but had not yet been acquired |
| Auditing investigator conduct | Verifies that an investigator acted on available information, not hindsight |
| Reform impact analysis | Compares process behavior before and after a corrective action |

### 6.5 Authorization

Access to the Time Machine is governed by a separate authorization class. Reconstructing historical state is permitted only to:

- The case lead.
- The case review authority.
- Authorized oversight roles (Audit, Inspector General).
- Other roles only on explicit case-by-case delegation.

Every Time Machine query is logged with the investigator, the case, the reference dates, and a justification.

---

## Chapter 7 — Expected Process vs Actual Process (§15)

### 7.1 Purpose

The **Administrative Process Digital Twin** is a faithful digital model of how a service is supposed to be delivered. When a case is opened, ACA overlays the actual case activity on the twin and renders an **EXPECTED vs ACTUAL** comparison. The twin is the structural baseline against which deviations are measured.

### 7.2 Twin Components

A process twin is composed of seven elements:

| Element | Description |
|---------|-------------|
| **Required steps** | The ordered set of process steps defined by the controlling rule/process registry |
| **Required documents** | The documents each step must produce or consume |
| **Controls** | The control points (segregation, validation, approval) embedded in the workflow |
| **Approvals** | The authorization gates and the role(s) empowered to grant them |
| **Inspections** | The inspection acts the workflow mandates |
| **SLAs** | The duration limits for each step and for the end-to-end process |
| **Responsible roles** | The roles accountable for each step |
| **Dependencies** | The upstream/downstream dependencies (including cross-agency handoffs) |

### 7.3 Twin Model (Example)

```
SERVICE: Construction Permit — Standard Track
────────────────────────────────────────────
STEP │ ROLE         │ DOC REQ     │ CONTROL      │ SLA    │ DEPENDS ON
─────┼──────────────┼─────────────┼──────────────┼────────┼──────────────
1    │ Citizen      │ Application │ —            │ —      │ —
2    │ Clerk        │ Receipt     │ Validation   │ 1d     │ 1
3    │ Reviewer     │ Review note │ Segregation  │ 3d     │ 2
4    │ Inspector    │ Inspection  │ Field visit  │ 5d     │ 3
5    │ Engineer     │ Eng. report │ Approval     │ 2d     │ 4
6    │ Director     │ Decision    │ Dual sign    │ 2d     │ 5
7    │ Cashier      │ Payment     │ Treasury ref │ 1d     │ 6
8    │ Clerk        │ Permit      │ Issuance     │ 1d     │ 7
```

### 7.4 EXPECTED vs ACTUAL Overlay

For a case opened against this service, the twin is overlaid with the actual case activity:

```
EXPECTED                          ACTUAL                          Δ
────────────────────────────────  ─────────────────────────────   ─────
1 Application (—)                 Application 2024-03-04 10:11    OK
2 Receipt        (1d)             Receipt      2024-03-04 11:42   OK (faster)
3 Review note    (3d)             Review note  2024-03-13 16:05   SLOW (+5d)
4 Inspection     (5d)             Inspection   2024-03-14 09:00   EARLY
5 Eng. report    (2d)             Eng. report  2024-03-14 11:00   SUSPECT (same-day)
6 Decision       (2d, dual sign)  Decision     2024-03-14 11:30   SINGLE SIGN
7 Payment        (1d)             Payment      2024-03-14 12:00   OK
8 Permit         (1d)             Permit       2024-03-14 12:15   OK
```

The overlay surfaces three signals immediately:

- Step 3 exceeded SLA by 5 days.
- Step 4 inspection preceded the review note (impossible sequence).
- Step 6 decision was single-signed, violating the dual-signature control.

### 7.5 Twin Maintenance

- Twins are versioned. When a rule or process definition changes, a new twin version is minted; existing cases retain the version under which they were opened.
- Twin-element gaps (e.g., a service without a defined inspection step) are themselves flagged as **Unowned Risk** (see Part IV — Risk/Corruption Intelligence).
- Cross-agency handoffs in a twin are explicit; the receiving agency's twin becomes a downstream dependency.

### 7.6 Display Principle

The EXPECTED vs ACTUAL display **MUST** be rendered for every case on opening and continuously refreshed. It is a primary investigative surface, not a deep setting.

---

## Chapter 8 — Administrative Process Replay (§16)

### 8.1 Purpose

The **REPLAY CASE** feature reconstructs the administrative lifecycle of a case chronologically from authorized records. It is the operational realization of the timeline plus the digital twin: a walk-through that an investigator, a reviewer, or an oversight authority can follow step by step.

### 8.2 Replay Inputs

Replay uses only:

- Authorized records already attached to the case as evidence.
- Canonical timeline events derived from those records.
- The process twin version under which the case was opened.

Replay **MUST NOT** invent events. Where the timeline contains a gap, replay pauses and explicitly states: *"No record available for the period 2024-03-05 to 2024-03-12."*

### 8.3 Replay Modes

| Mode | Use |
|------|-----|
| **Step-through** | Investigator advances event by event with full context per step |
| **Time-scrub** | Scrub bar lets the reviewer jump to any timestamp; the case state at that timestamp is reconstructed |
| **Actor-follow** | Replay follows a single actor's actions across the case |
| **Process-follow** | Replay follows a single process step across multiple cases (cross-case replay) |

### 8.4 Replay Output Per Step

For each step in the replay, the following is rendered:

```
REPLAY — Case 118/2024 — Step 4 of 8
────────────────────────────────────
Event         : Inspection
Timestamp     : 2024-03-14 09:00 (UTC+3)
Actor         : Inspector M. Hassan (O-4421)
System        : Field Inspection App v3.2
Location      : Site 14, Industrial Zone B
Evidence      : INS-91 (photo set, 7 items, hash 0x…)
Source record : INSP-2024-0091
Rule applied  : Building Code §14.7
Control       : Field visit (mandatory for tracks B/C)
Expected      : 2024-03-13 → 2024-03-18 (5d window)
Actual delta  : performed 1 day earlier than expected
Anomalies     : preceded Review Note (REV-441) — IMPOSSIBLE SEQUENCE
Related event : Review note REV-441 (2024-03-13)
                  ▲ flagged: review completed after inspection
```

### 8.5 Replay Integrity

- Replay is read-only. An investigator cannot edit records from the replay surface; corrections are made via the formal correction workflow (append-only, with rationale).
- Replay is logged. Every replay session records who replayed what case, when, and which mode was used.
- Replay supports the Time Machine (Chapter 6): an investigator can replay the case *as it was known at a given date*, with later-acquired evidence suppressed.

---

## Chapter 9 — "What Should Exist?" Engine (§17)

### 9.1 Purpose

For every mapped service or process, the **"What Should Exist?" Engine** computes the set of records that the process twin requires, compares it against the records actually present in the case file, and reports the missing ones — ranked by investigative importance.

### 9.2 Computation

```
For a given (case, service, twin_version):
  ExpectedRecords = UNION(step.required_documents for step in twin.steps)
                  ∪ UNION(control.evidence_required for control in twin.controls)
                  ∪ UNION(inspection.evidence_required for inspection in twin.inspections)

  ActualRecords   = { records attached to the case that match each expected type }

  MissingRecords  = ExpectedRecords − ActualRecords

  For each m in MissingRecords:
    m.investigative_importance = f(m.control_bearing, m.causal_role, m.gap_class)
```

### 9.3 Example

```
SERVICE: Construction Permit — Standard Track
TWIN VERSION: 2024.02
────────────────────────────────────────────
Expected records: 31
Actual records  : 24
Missing records:  7

RANK │ MISSING RECORD                │ IMPORTANCE │ WHY
─────┼───────────────────────────────┼────────────┼─────────────────────
1    │ Field inspection photo set    │ CRITICAL   │ Sole evidence of site
2    │ Engineer approval signature   │ CRITICAL   │ Dual-sign control
3    │ Treasury payment receipt      │ HIGH       │ Payment provenance
4    │ Director authorization memo   │ HIGH       │ Authorization gate
5    │ Citizen identity verification │ MEDIUM     │ Eligibility check
6    │ Calculation worksheet         │ MEDIUM     │ Engineering basis
7    │ Inter-agency handoff ack      │ LOW        │ Coordination only
```

### 9.4 Ranking Heuristics

| Importance | Heuristic |
|------------|-----------|
| Critical | Missing record is sole evidence for a control-bearing step, or anchors an authorization gate |
| High | Missing record closes a payment, decision, or contract causal chain |
| Medium | Missing record supports eligibility, calculation, or coordination |
| Low | Missing record is administrative only (e.g., courtesy copy) |

### 9.5 Investigator Action

For each missing record, the engine offers:

- **Request** — initiate a Get Missing Record workflow (Part III — Government Systems Dependency Engine).
- **Justify absence** — record an investigator rationale (e.g., "record was destroyed in 2019 flood; supporting evidence X-771").
- **Mark as not applicable** — record that the record type does not apply to this case variant, with rationale.

Every "justify" or "not applicable" decision is logged with the investigator, the timestamp, and the rationale.

---

## Chapter 10 — Evidence Gap Engine (§18)

### 10.1 Purpose

The Evidence Gap Engine continuously maintains, for every case, a structured register of gaps: missing evidence, missing records, missing documents, missing approvals, missing inspections, missing responses, and missing system events. For every gap, the engine captures the metadata an investigator needs to act on it.

### 10.2 Gap Categories

| # | Gap category | Definition |
|---|--------------|------------|
| 1 | Missing evidence | Artifact required to anchor a timeline event or support a finding |
| 2 | Missing record | Authoritative system record expected but not retrieved |
| 3 | Missing document | Document required by the twin but not present in the case file |
| 4 | Missing approval | Authorization gate required by the twin with no recorded authorization |
| 5 | Missing inspection | Inspection mandated by the twin with no inspection record |
| 6 | Missing response | A formal request to an agency remains unanswered beyond SLA |
| 7 | Missing system event | Expected transaction in a source system not found |

### 10.3 Gap Record Schema

For every gap, the engine maintains:

| Field | Description |
|-------|-------------|
| `gap_id` | Stable identifier |
| `what_is_missing` | Human-readable description |
| `why_it_matters` | Causal / control significance for the case |
| `likely_source` | The system or actor likely to hold the record |
| `agency` | The agency accountable for the record |
| `system` | The source system identifier (if known) |
| `priority` | Critical / High / Medium / Low |
| `dependency` | Other gaps or evidence this gap depends on, or that depend on it |
| `volatility` | Volatility class (Chapter 11) of the underlying record, if any |
| `preservation_deadline` | The latest date by which the record must be preserved, if known |
| `request_status` | Not requested / Requested / Acknowledged / Received / Overdue / Refused / Not available |

### 10.4 Example Gap Register

```
GAP REGISTER — Case 118/2024
──────────────────────────────────────────────────────────────────────────────
ID   │ WHAT                       │ WHY                          │ SOURCE       │ AGENCY │ SYS    │ PRI │ VOLTIL │ PRESERV │ REQ STATUS
─────┼────────────────────────────┼──────────────────────────────┼──────────────┼────────┼────────┼─────┼────────┼─────────┼──────────────
G-01 │ CCTV of cashier desk       │ Sole evidence of payment     │ Site CCTV    │ MUNI   │ CCTV-7 │ CRI │ HIGH   │ 2024-04-15│ Requested
G-02 │ Treasury reconciliation    │ Closes payment chain        │ IFMIS        │ TREAS  │ TRS-2  │ HIG │ MED    │ 2025-01-01│ Acknowledged
G-03 │ Director authorization memo│ Dual-sign control evidence   │ Doc Mgmt     │ MUNI   │ DMS-1  │ CRI │ LOW    │ 2025-01-01│ Overdue
G-04 │ Inspector field log        │ Verifies inspection act      │ Field App    │ MUNI   │ FA-3   │ HIG │ MED    │ 2025-01-01│ Not requested
```

### 10.5 Continuous Maintenance

The Gap Engine is not a one-time report. It is continuously reconciled:

- When new evidence is acquired, related gaps are auto-closed (with the acquisition timestamp and the closing investigator).
- When new gaps are detected (e.g., a twin element is newly required), they are added.
- When source systems report record destruction, the corresponding gap is escalated to **Permanently Unavailable** with a retention-loss record.

---

## Chapter 11 — Evidence Volatility Engine (§19)

### 11.1 Purpose

Evidence is perishable. The Evidence Volatility Engine classifies every evidence item — and every expected-but-missing item — by the speed at which it is likely to disappear, and provides an authorized preservation workflow.

### 11.2 Volatility Classification

| Class | Description | Typical examples |
|-------|-------------|-----------------|
| **Critical** | Loss within hours to days; cannot be reconstructed | Live system logs, CCTV, real-time sensor data |
| **High** | Loss within weeks; partial reconstruction possible | Database backups, audit logs, transaction journals |
| **Medium** | Loss within months | Operational reports, working drafts, email |
| **Low** | Stable for years under normal retention | Final decisions, signed permits, published regulations |

### 11.3 Volatility Assessment Heuristics

```
volatility_class(record) =
  IF record.medium IN {CCTV, live_log, sensor_stream, ram_state}        → Critical
  ELSE IF record.medium IN {audit_log, transaction_journal, db_backup}  → High
  ELSE IF record.medium IN {email, working_draft, operational_report}    → Medium
  ELSE                                                                   → Low

IF record.retention_policy.end_date - today < 30 days:
    escalate(record.volatility_class, one_level)
```

### 11.4 Volatility Surface

For any case, the engine renders a Volatility Surface:

```
VOLATILITY SURFACE — Case 118/2024 (as of 2024-03-20)
──────────────────────────────────────────────────────────
CRITICAL (2)
  • CCTV — Site 14 — coverage 2024-03-14 09:00–11:00 — destroy 2024-04-13
  • Login session log — Cashier workstation — destroy 2024-04-15

HIGH (3)
  • Treasury audit log — covers PMT-5581 — destroy 2024-09-30
  • Workflow audit log — covers approval step — destroy 2024-09-30
  • Field app transaction journal — destroy 2024-10-15

MEDIUM (4)  [list elided]
LOW   (8)   [list elided]

PRESERVATION DEADLINES (next 30 days)
  2024-04-13 — CCTV (Critical) — preservation requested 2024-03-20
  2024-04-15 — Login log (Critical) — preservation requested 2024-03-20
```

### 11.5 Authorized Preservation Workflow

| Step | Action | Actor |
|------|--------|-------|
| 1 | Identify volatile evidence via the Volatility Surface | Engine |
| 2 | Draft preservation request, citing case ID and legal basis | Case lead |
| 3 | Authorize preservation request | Authorized ACA officer |
| 4 | Transmit to source-system custodian | Government Integration Fabric |
| 5 | Receive acknowledgement | Custodian |
| 6 | Verify preservation (heartbeat / digest) | Engine |
| 7 | Re-verify at intervals until case closure | Engine |
| 8 | Release preservation on case closure | Case lead + authorization |

Every preservation request, acknowledgement, verification and release is logged immutably.

### 11.6 Invariant

> No critical-volatility evidence may be left without a preservation request when it is identified as relevant to an active case.

Where a preservation request is refused or impossible (e.g., the record was destroyed before acquisition), the case file records a **Preservation Loss** entry with the timestamp, the refusal, and the impact assessment.

---

## Chapter 12 — Smart Evidence Acquisition Planner (§20)

### 12.1 Purpose

With dozens of possible evidence requests open at any time, investigators need a principled ordering. The Smart Evidence Acquisition Planner ranks the next evidence requests according to a defined multi-factor score.

### 12.2 Ranking Factors

| # | Factor | Description |
|---|--------|-------------|
| 1 | Investigative importance | From the Gap Engine and "What Should Exist?" ranking |
| 2 | Urgency | Time-sensitivity driven by the case clock and statutory deadlines |
| 3 | Volatility | From the Volatility Engine |
| 4 | Dependency | Whether other requests or findings depend on this evidence |
| 5 | Availability | Whether the source is connected, reachable, and authorized |
| 6 | Authorization | Whether the investigator has the clearance to request the record |

### 12.3 Acquisition Score

```
acquisition_score(gap) =
    w_importance * importance(gap)
  + w_urgency     * urgency(gap)
  + w_volatility  * volatility(gap)
  + w_dependency  * dependency_factor(gap)
  + w_availability * availability(gap)
  + w_authoriz    * authorization(gap)

where weights default to:
    w_importance = 0.30
    w_urgency    = 0.20
    w_volatility = 0.20
    w_dependency = 0.10
    w_availability = 0.10
    w_authoriz   = 0.10
```

Weights are configurable by case type and ACA policy; changes are governed by the AI Governance committee (Part V).

### 12.4 Example Output

```
NEXT EVIDENCE ACQUISITION PLAN — Case 118/2024
──────────────────────────────────────────────────────────────────────
RANK │ GAP   │ WHAT                       │ SCORE │ RATIONALE
─────┼───────┼────────────────────────────┼───────┼──────────────────────
1    │ G-01  │ CCTV of cashier desk       │ 0.94  │ Critical importance + Critical volatility + auth ready
2    │ G-03  │ Director authorization memo│ 0.87  │ Critical importance + overdue + auth ready
3    │ G-04  │ Inspector field log        │ 0.71  │ High importance + High volatility + dep on G-02
4    │ G-02  │ Treasury reconciliation    │ 0.62  │ High importance + Medium volatility + ack pending
```

### 12.5 Recommended Next Action

The planner emits a single recommended next action — the highest-ranked gap that is *actionable* (authorization available, source reachable). This recommendation feeds the Case Information Readiness surface (Chapter 13) as the **NEXT BEST INVESTIGATIVE ACTION**.

---

## Chapter 13 — Case Information Readiness (§21)

### 13.1 Purpose

When an investigator opens a case, the system MUST automatically display a **Case Information Readiness** panel: a structured inventory of everything the case touches, everything that is missing, every contradiction, every similar case, every external request, every volatile record — and a single recommended next action.

### 13.2 Readiness Panel Components

| Component | Source |
|-----------|--------|
| People | Persons referenced by case evidence |
| Entities | Organizations, companies referenced |
| Services | Services implicated |
| Agencies | Agencies accountable |
| Systems | Source systems implicated |
| Relevant rules | Rules, regulations, controls cited or potentially violated |
| Expected records | From the process twin |
| Received records | Records actually attached |
| Evidence | Anchoring evidence items |
| Evidence gaps | From the Gap Engine |
| Contradictions | From the Smart Evidence Graph conflict detector |
| Similar cases | From cross-case correlation |
| External requests | Outstanding Get Missing Record requests |
| Volatile evidence | From the Volatility Engine |

### 13.3 NEXT BEST INVESTIGATIVE ACTION

At the top of the panel, the system shows a single recommended action derived from the Acquisition Planner (Chapter 12). The action is presented as a hypothesis, not as an instruction:

```
NEXT BEST INVESTIGATIVE ACTION
Request inspection record (INS-91 field log) from Field App (FA-3) at MUNI.
Rationale: closes gap G-04; high investigative importance; high volatility;
authorization already held.
```

The investigator may accept, defer, or override the recommendation. Any override is logged with a rationale.

### 13.4 Readiness Score

A single readiness score is rendered for at-a-glance triage:

```
readiness = received_records / expected_records
```

This is supplemented by qualitative flags (`Critical Gaps: 2`, `Volatile Evidence at Risk: 1`) because a high readiness score may still conceal a single critical gap.

### 13.5 Auto-Refresh

The readiness panel refreshes:

- On case open.
- On new evidence acquisition.
- On gap status change.
- On contradiction detection.
- Periodically (default: hourly) while the case is open.

---

## Chapter 14 — Alternative-Hypothesis Engine (§22)

### 14.1 Purpose

The ACA **MUST NOT** jump from anomaly to guilt. When the temporal, gap, or process-twin engines surface a deviation, the Alternative-Hypothesis Engine enumerates plausible explanations — including innocent ones — and tracks the evidence required to distinguish among them.

### 14.2 Hypothesis Classes

| # | Hypothesis | Description |
|---|-----------|-------------|
| H1 | Procedural error | The deviation reflects a normal clerical mistake within the process |
| H2 | Technical / system failure | The deviation reflects a system bug, sync failure, or integration error |
| H3 | Legitimate exception | The deviation reflects a lawful exception or alternative pathway |
| H4 | Negligence | The deviation reflects carelessness without intent |
| H5 | Process weakness | The deviation reflects a structural flaw in the process itself |
| H6 | Potential misconduct indicator | The deviation exhibits a pattern consistent with misconduct, but unproven |

These are not exhaustive; the engine may add case-specific hypotheses (e.g., "force majeure", "regulatory transition", "external dependency failure").

### 14.3 Per-Hypothesis Tracking

For each hypothesis, the engine maintains:

| Field | Description |
|-------|-------------|
| `supporting_evidence` | Evidence consistent with the hypothesis |
| `contradicting_evidence` | Evidence inconsistent with the hypothesis |
| `unknowns` | Open questions that bear on the hypothesis |
| `evidence_required_to_distinguish` | Specific evidence that, if obtained, would discriminate among the competing hypotheses |

### 14.4 Example: Case 118/2024 Anomaly — Approval Before Authorization

```
ANOMALY: Approval APR-77 (2024-03-11 09:12) precedes authorization AUT-203 (2024-03-11 14:40)

HYPOTHESIS REGISTER
──────────────────────────────────────────────────────────────────────────
H1 Procedural error
   Supporting : APR-77 timestamp may be a clerk data-entry error
   Contradicting: Workflow system clock matches treasury clock
   Unknowns   : Was APR-77 entered manually or system-generated?
   Distinguish by: Audit log of APR-77 entry

H2 Technical / system failure
   Supporting : Possible clock drift between Workflow and Treasury
   Contradicting: Other events on the same day align across systems
   Unknowns   : System health check for 2024-03-11
   Distinguish by: System health logs for that day

H3 Legitimate exception
   Supporting : None yet identified
   Contradicting: No exception record exists
   Unknowns   : Was an exception invoked?
   Distinguish by: Exception register for the period

H4 Negligence
   Supporting : Approval timing inconsistent with normal care
   Contradicting: None
   Unknowns   : Reviewer workload on that day
   Distinguish by: Reviewer task log

H5 Process weakness
   Supporting : Process twin permits approval and authorization in either order
   Contradicting: Twin version 2024.02 mandates sequential ordering
   Unknowns   : —
   Distinguish by: Twin element audit

H6 Potential misconduct indicator
   Supporting : Anomaly co-occurs with single-sign decision and missing inspection record
   Contradicting: Insufficient basis at this time
   Unknowns   : Pattern across other cases by same officials
   Distinguish by: Cross-case correlation (Chapter 38 of source blueprint)
```

### 14.5 Discrimination Discipline

The engine refuses to advance H6 (potential misconduct) above the alternatives until:

- The discrimination evidence for H1–H5 has been acquired or formally marked unavailable.
- Each surviving hypothesis has been re-evaluated against the new evidence.
- An investigator has explicitly recorded that H6 is the most consistent surviving hypothesis.

This is the operational enforcement of "never jump from anomaly to guilt."

---

## Chapter 15 — Devil's Advocate AI (§23)

### 15.1 Purpose

Before an important finding is finalized, the Devil's Advocate AI runs an automated challenge pass. Its only job is to find reasons the finding might be wrong, incomplete, or unfairly framed.

### 15.2 Challenge Surfaces

The Devil's Advocate searches across eight challenge surfaces:

| # | Surface | What it looks for |
|---|---------|-------------------|
| 1 | Contradictory evidence | Evidence that conflicts with the finding's premises |
| 2 | Exculpatory evidence | Evidence that, if weighed, would weaken the case for the finding |
| 3 | Missing context | Contextual facts not in the case file that would alter interpretation |
| 4 | Alternative explanations | Hypotheses the Alternative-Hypothesis Engine has not yet formally closed |
| 5 | Weak provenance | Anchoring evidence whose chain of custody is incomplete or system-derived |
| 6 | Duplicated corroboration | Multiple evidence items that trace back to a single underlying source |
| 7 | Procedural exceptions | Legitimate exceptions that would explain the apparent anomaly |
| 8 | Unsupported causal assumptions | Causal links asserted without independent verification |

### 15.3 Challenge Workflow

```
Investigator: "Finalize Finding F-77"
                │
                ▼
       ┌──────────────────┐
       │ CHALLENGE THIS    │
       │ FINDING           │
       └─────────┬──────────┘
                 │
   ┌─────────────┼───────────────┬─────────────┬────────────┐
   ▼             ▼               ▼             ▼            ▼
 Contradictory  Exculpatory    Missing       Alternative  Weak
 evidence       evidence       context       explanations provenance
   │             │               │             │            │
   ▼             ▼               ▼             ▼            ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │ Challenge Report — 6 challenges raised                          │
 │                                                                 │
 │ 1. [Weak provenance] Evidence E-1142 cited by F-77 is           │
 │    system-derived; no independent verification act recorded.    │
 │                                                                 │
 │ 2. [Duplicated corroboration] E-1142 and E-1143 trace to the    │
 │    same underlying source record INSP-2024-0091.                │
 │                                                                 │
 │ 3. [Alternative explanation] Hypothesis H1 (procedural error)   │
 │    remains open; discrimination evidence not yet acquired.      │
 │ ...                                                             │
 └─────────────────────────────────────────────────────────────────┘
```

### 15.4 Finding Acceptance Gate

A finding may not be finalized until:

- Every challenge is either resolved (with recorded resolution) or explicitly accepted by the case lead with a rationale.
- The Devil's Advocate pass is logged with its timestamp, version, and configuration.
- Unresolved challenges are surfaced in the finding's disclosure section.

### 15.5 Invariant

> The Devil's Advocate is not optional, not bypassable, and not advisory-only for material findings. It is a gating control.

Materiality is defined per ACA policy; default thresholds include findings that name individuals, findings that allege control failure, and findings that may trigger corrective action across more than one office.

---

## Chapter 16 — Mandatory Exculpatory Search (§24)

### 16.1 Purpose

For material investigations, ACA policy may require an explicit search for evidence that could **disprove** the working hypothesis. This is the Mandatory Exculpatory Search. It is the institutional commitment to fairness: the absence of exculpatory evidence must be established by active search, not by silence.

### 16.2 Policy Configuration

The Mandatory Exculpatory Search is enabled per case class by ACA policy. Configuration includes:

| Field | Description |
|-------|-------------|
| `case_class` | Case classification (e.g., financial, procurement, integrity) |
| `materiality_threshold` | Threshold above which the search is mandatory |
| `search_targets` | Systems, agencies, document classes to be searched |
| `deadline` | SLA for completing the search |
| `required_approval` | Approval authority for the search record |

### 16.3 Search Outcomes

For every search target, the outcome is recorded as one of four states:

| State | Definition |
|-------|------------|
| **Found** | Exculpatory evidence located; attached to case |
| **Not found** | Searched, no exculpatory evidence located |
| **Unavailable** | Source system or record unavailable (with reason) |
| **Not searched** | Not searched (must be justified; cannot be silent) |

### 16.4 Example Exculpatory Search Record

```
MANDATORY EXCULPATORY SEARCH — Case 118/2024
──────────────────────────────────────────────────────────────────
Working hypothesis: Approval was granted without inspection
Search scope: MUNI systems, MUNI archives, IFMIS, Field App, archives
Deadline: 2024-04-05

TARGET                     │ OUTCOME       │ DETAIL
───────────────────────────┼───────────────┼─────────────────────────
MUNI Field App (FA-3)     │ NOT FOUND     │ Searched 2024-03-22; no inspection record for case
MUNI Doc Mgmt (DMS-1)     │ NOT FOUND     │ Searched 2024-03-22; no exception memo
IFMIS payment register    │ FOUND         │ E-1155 — payment split into 2 tranches (consistent with inspection-based release)
MUNI Archives 2019–2024   │ UNAVAILABLE   │ Water damage 2021; partial reconstitution in progress
Cashier workstation logs  │ NOT SEARCHED  │ Justification: workstation replaced 2024-02; logs no longer held
```

### 16.5 Gating

A material finding may not be finalized until the Mandatory Exculpatory Search record is complete:

- Every target has an outcome (none may be silently omitted).
- `Not searched` outcomes carry a recorded justification.
- `Found` outcomes are surfaced in the finding's disclosure section.

The audit trail preserves the search commands, the responses, and the investigator's interpretation, so a future reviewer can verify that the search was conducted in good faith.

---

## Chapter 17 — Negative-Space Intelligence (§25)

### 17.1 Purpose

Negative-Space Intelligence detects **things that should exist but do not**. Where positive-space intelligence reasons over what is present, negative-space intelligence reasons over what is absent — and absence is often the more powerful signal.

### 17.2 Detected Negative-Space Patterns

| # | Pattern | What is absent | Why it matters |
|---|---------|----------------|----------------|
| 1 | Approval without inspection | Inspection record where twin mandates one | Control bypass |
| 2 | Payment without application | Application record preceding payment | Phantom payment |
| 3 | Decision without required review | Reviewer note where twin mandates dual review | Authorization gate bypass |
| 4 | Service without expected record | Authoritative system record absent | Service not actually delivered |
| 5 | Action without authorization | Authorization gate absent | Unauthorized action |

Additional patterns (illustrative, not exhaustive):

- Inspection without inspector assignment
- Contract without tender
- Payment without contract
- Approval by an official outside mandate scope
- Exception without exception register entry
- Decision citing a rule that does not exist in the rule registry

### 17.3 Detection Method

For each case, the engine walks the process twin step-by-step and checks for the presence of each twin-required record, control, and authorization. Any absent element is reported as a negative-space finding.

```
FOR EACH step IN twin.steps:
    IF step.required_document NOT IN case.records:
        report_negative_space(step, "missing required document")
    IF step.control IS NOT NULL AND step.control.evidence_required NOT IN case.evidence:
        report_negative_space(step, "control evidence absent")
    IF step.authorization_role IS NOT NULL AND NOT exists(authorization_event_for(step)):
        report_negative_space(step, "authorization absent")
```

### 17.4 Negative-Space Report

```
NEGATIVE-SPACE REPORT — Case 118/2024
──────────────────────────────────────────────────────────────────────
PATTERN                          │ STEP │ LIKELY IMPLICATION
─────────────────────────────────┼──────┼──────────────────────────────
Approval without inspection      │ 6    │ Control bypass (dual-sign)
Payment without application     │ 7    │ Phantom payment risk
Decision without required review│ 6    │ Authorization gate bypass
Service without expected record │ 4    │ Inspection not actually performed
Action without authorization    │ 5    │ Engineer signature absent on approval
```

### 17.5 Framing

Negative-space findings are presented as **signals for investigation**, not as conclusions. Each is paired with:

- The alternative explanations from the Alternative-Hypothesis Engine (Chapter 14).
- The discrimination evidence required to distinguish among them.
- The corresponding gap entries in the Gap Engine.

A negative-space finding never becomes a formal finding until it has survived the Devil's Advocate pass (Chapter 15) and the Mandatory Exculpatory Search (Chapter 16).

---

## Chapter 18 — "Too Perfect" Detector (§26)

### 18.1 Purpose

The "Too Perfect" Detector identifies cases where records exhibit unusual statistical or operational perfection. Perfection is not fraud; but perfection in real-world administrative processes is itself an anomaly that warrants review.

### 18.2 Detected Perfection Patterns

| # | Pattern | Detection basis |
|---|---------|-----------------|
| 1 | Zero errors | Error rate substantially below baseline for the service |
| 2 | Zero delays | All steps completed at or below SLA, with no variation |
| 3 | Zero exceptions | No exceptions recorded over a long observation window |
| 4 | Identical processing durations | Variance in step durations near zero |
| 5 | Unusually complete records | Records present for all optional fields, all the time |

### 18.3 Detection Method

The engine compares case metrics against the historical baseline distribution for the same service, agency, and process twin version. It flags cases whose metrics fall in the extreme upper tail (default: 99th percentile) of "completeness" or "consistency" measures.

```
perfection_score(case) = aggregate(
    zero_errors_score,
    zero_delays_score,
    zero_exceptions_score,
    duration_variance_score,
    completeness_score
)

IF perfection_score > policy_threshold:
    emit_operational_or_data_anomaly(case)
```

### 18.4 Output

The detector emits a single output class:

```
OPERATIONAL / DATA ANOMALY
```

This is **not** a fraud finding. It is a signal routed to the investigator. The signal is paired with:

- The specific perfection pattern(s) detected.
- The historical baseline used for comparison.
- The number of cases compared.
- Suggested discrimination evidence (e.g., recompute step durations from raw transaction logs rather than summary reports).

### 18.5 The Cardinal Rule

> **Never automatically label fraud.**

A "too perfect" reading may reflect:

- A genuinely well-run process.
- Summary-report aggregation that masks underlying variance.
- Data-quality issues in the source system.
- Falsification of records.

Distinguishing among these is the investigator's job, supported by the Alternative-Hypothesis Engine (Chapter 14). The detector never advances the misconduct hypothesis on its own.

### 18.6 Example Output

```
TOO PERFECT DETECTOR — Case 118/2024
──────────────────────────────────────────────────────────────────────
Signal: OPERATIONAL / DATA ANOMALY

Patterns detected:
  1. Zero delays: all 8 steps at or below SLA (99.4th percentile)
  2. Identical processing durations: step 4–5 duration variance = 0
     across last 12 similar cases (baseline variance = 1.7d)
  3. Unusually complete records: 31/31 expected records present
     (baseline mean 24/31)

Baseline: 1,820 comparable cases (2023-01 → 2024-02)
Threshold: 99th percentile

Recommended discrimination evidence:
  • Raw transaction log for step 4–5 over the comparison window
  • Reconciliation of summary report against individual records
  • Source-system audit log for record-entry events
```

---

## Chapter 19 — Case Readiness Example (§208)

### 19.1 Purpose

This chapter provides a complete worked example of the Case Information Readiness panel. The numbers below are **demonstration data only** and do not represent any real case.

### 19.2 Example: CASE 118/2024

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║                  CASE 118/2024  —  INFORMATION READINESS               ║
║                                                                        ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║   People             :   7                                             ║
║   Entities           :   4                                             ║
║   Services           :   3                                             ║
║   Agencies           :   5                                             ║
║   Systems            :   9                                             ║
║   Relevant Rules     :   8                                             ║
║   Expected Records   :  31                                             ║
║   Received           :  24                                             ║
║   Evidence           :  17                                             ║
║   Evidence Gaps      :   4                                             ║
║   Contradictions     :   3                                             ║
║   Similar Cases      :  12                                             ║
║   External Requests  :   5                                             ║
║   Volatile Evidence  :   2                                             ║
║                                                                        ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║   NEXT BEST INVESTIGATIVE ACTION:                                      ║
║                                                                        ║
║      Request inspection record                                         ║
║                                                                        ║
║      (Field log INS-91 from Field App FA-3 at MUNI; closes gap G-04;   ║
║       high investigative importance; high volatility; authorization    ║
║       already held.)                                                   ║
║                                                                        ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 19.3 Component Detail

Below the headline numbers, the readiness panel expands each line into a navigable surface.

#### 19.3.1 People (7)

| # | Person | Role in case | Confidence |
|---|--------|--------------|------------|
| 1 | P-0042 | Applicant | Confirmed |
| 2 | O-0118 | Approving director | Confirmed |
| 3 | O-0442 | Inspector | Confirmed |
| 4 | P-0207 | Cashier | Documented |
| 5 | P-0301 | Reviewer | Confirmed |
| 6 | P-0388 | Engineer | Documented |
| 7 | P-0410 | External witness | Unverified |

#### 19.3.2 Entities (4)

| # | Entity | Type | Role |
|---|--------|------|------|
| 1 | ORG-117 | Construction company | Applicant |
| 2 | AGY-MUNI | Municipality | Service owner |
| 3 | AGY-TREAS | Treasury | Payment authority |
| 4 | ORG-221 | Subcontractor | Beneficiary |

#### 19.3.3 Services (3)

| # | Service | Owning agency |
|---|---------|--------------|
| 1 | Construction Permit — Standard Track | MUNI |
| 2 | Treasury Disbursement | TREAS |
| 3 | Field Inspection Service | MUNI |

#### 19.3.4 Agencies (5)

MUNI, TREAS, AUD, CIVIL_REGISTRY, FIELD_OPS.

#### 19.3.5 Systems (9)

Field App (FA-3), Document Management (DMS-1), Treasury System (TRS-2), Workflow Engine (WF-1), CCTV System (CCTV-7), Identity Registry (ID-1), Procurement (PR-1), Audit Log Service (AUD-1), Cashier Workstation (CW-4).

#### 19.3.6 Relevant Rules (8)

Building Code §14.7, Treasury Regulation §22.1, Dual-Signature Control §3.4, Field Inspection Standard §6.2, Process Twin 2024.02 §4–§8, Civil Service Mandate §11.3, Records Retention §9.1, Public Procurement §17.4.

#### 19.3.7 Records

- Expected: 31 (per twin 2024.02)
- Received: 24 (77% readiness)
- Missing: 7 — ranked in Chapter 9, §9.3.

#### 19.3.8 Evidence (17)

17 evidence items attached. Anchoring breakdown:

- Documented: 11
- Confirmed: 4
- Unverified: 2 (citizen-intake origin)

#### 19.3.9 Evidence Gaps (4)

Gap IDs G-01, G-02, G-03, G-04 — full register in Chapter 10, §10.4.

#### 19.3.10 Contradictions (3)

| # | Contradiction | Status |
|---|---------------|--------|
| 1 | Treasury timestamp vs Workflow timestamp for PMT-5581 | Unresolved |
| 2 | Inspection record INS-91 vs Review note REV-441 ordering | Unresolved |
| 3 | Payment split in IFMIS vs single-payment summary in MUNI report | Unresolved |

#### 19.3.11 Similar Cases (12)

12 prior cases share ≥2 of {same person, same entity, same office, same service, same control failure}. Cross-case correlation details are surfaced under Chapter 38 of the source blueprint (Part IV).

#### 19.3.12 External Requests (5)

| # | Request | Status |
|---|---------|--------|
| 1 | CCTV preservation (MUNI) | Acknowledged |
| 2 | Treasury reconciliation (TREAS) | Acknowledged |
| 3 | Director authorization memo (MUNI) | Overdue |
| 4 | Field log (MUNI) | Not requested |
| 5 | Archives reconstitution (MUNI) | In progress |

#### 19.3.13 Volatile Evidence (2)

- CCTV coverage of Site 14 (destroy 2024-04-13) — Critical
- Login session log of Cashier workstation (destroy 2024-04-15) — Critical

### 19.4 The Next Best Action in Context

The recommended next action — *Request inspection record* — is selected because it:

1. Closes gap G-04 (high investigative importance, high volatility).
2. Distinguishes between hypotheses H1 (procedural error) and H6 (potential misconduct) in the Alternative-Hypothesis Engine.
3. Resolves the second contradiction (inspection-vs-review ordering).
4. Is immediately actionable (authorization already held; source system connected).

Acting on this single recommendation advances three of the case's outstanding items simultaneously.

### 19.5 Demonstration Data Notice

All numbers, IDs, names and timestamps in this example are demonstration data, fabricated to illustrate the readiness panel. They do not refer to any real case, person, agency, or transaction.

---

## Appendix A — Confidence Classification Decision Tree

```
                  ┌────────────────────────────┐
                  │ Is the link anchored by     │
                  │ ≥2 authoritative sources?   │
                  └─────────────┬──────────────┘
                                │
                  ┌─────────────┴──────────────┐
                  ▼                            ▼
                YES                          NO
                  │                            │
                  ▼                            │
            CONFIRMED                          │
                                               │
                                ┌──────────────┴──────────────┐
                                │ Is there a single doc with  │
                                │ intact chain of custody?    │
                                └─────────────┬───────────────┘
                                              │
                                ┌─────────────┴──────────────┐
                                ▼                            ▼
                              YES                          NO
                                │                            │
                                ▼                            │
                          DOCUMENTED                         │
                                                               │
                                ┌──────────────┴──────────────┐
                                │ Is the link computed by an  │
                                │ ACA engine?                 │
                                └─────────────┬───────────────┘
                                              │
                                ┌─────────────┴──────────────┐
                                ▼                            ▼
                              YES                          NO
                                │                            │
                                ▼                            │
                          SYSTEM-DERIVED                    │
                          (MUST NOT be presented             │
                           as proven fact)                   │
                                                               │
                                ┌──────────────┴──────────────┐
                                │ Is there a pattern match   │
                                │ but no supporting record?  │
                                └─────────────┬───────────────┘
                                              │
                                ┌─────────────┴──────────────┐
                                ▼                            ▼
                              YES                          NO
                                │                            │
                                ▼                            │
                            POTENTIAL                        │
                                                               │
                                ┌──────────────┴──────────────┐
                                │ Is the link contradicted by │
                                │ a record of equal/higher    │
                                │ authority?                  │
                                └─────────────┬───────────────┘
                                              │
                                ┌─────────────┴──────────────┐
                                ▼                            ▼
                              YES                          NO
                                │                            │
                                ▼                            │
                          CONTRADICTED                       │
                                               │
                                               ▼
                                          UNVERIFIED
                                       (single source,
                                       unverified)
```

---

## Appendix B — Cross-Chapter Reasoning Flow

The intelligence engines in Part II are designed to be composable. A typical investigative reasoning flow looks like this:

```
  New evidence acquired
            │
            ▼
  Smart Evidence Graph (Ch. 3)  ──┬──►  new links minted
                                   │       (confidence-stamped)
                                   │
                                   ▼
  Smart Dynamic Timeline (Ch. 4)  ──┬──► timeline refreshed
                                    │
                                    ▼
  Temporal Intelligence (Ch. 5)  ──┬──► temporal anomalies detected
                                    │
                                    ▼
  Process Digital Twin (Ch. 7)   ──┬──► EXPECTED vs ACTUAL refreshed
                                    │
                                    ▼
  "What Should Exist?" (Ch. 9)  ──┬──► missing records ranked
                                    │
                                    ▼
  Gap Engine (Ch. 10)            ──┬──► gap register updated
                                    │
                                    ▼
  Volatility Engine (Ch. 11)     ──┬──► preservation tasks queued
                                    │
                                    ▼
  Acquisition Planner (Ch. 12)  ──┬──► NEXT BEST ACTION updated
                                    │
                                    ▼
  Case Readiness (Ch. 13)        ──┬──► readiness panel refreshed
                                    │
                                    ▼
  Alternative-Hypothesis (Ch. 14) ─┬──► hypotheses re-scored
                                    │
                                    ▼
  Devil's Advocate (Ch. 15)       ──►  pre-finalize challenge
                                    │
                                    ▼
  Mandatory Exculpatory (Ch. 16)  ──►  search record completed
                                    │
                                    ▼
  Negative-Space (Ch. 17)        ──►  absence patterns flagged
                                    │
                                    ▼
  "Too Perfect" (Ch. 18)          ──►  anomaly signal emitted
                                    │
                                    ▼
  Investigation Time Machine (Ch. 6) ──► historical state preserved
```

The composition is **non-blocking** and **append-only**. Each engine writes its outputs to the case's intelligence ledger; investigators read from the ledger, never directly mutating source records.

---

## Appendix C — Glossary

| Term | Definition |
|------|------------|
| **Anchored event** | A timeline event with at least one evidence reference |
| **Canonical object** | An object represented exactly once in the fabric |
| **Confidence class** | One of Confirmed / Documented / System-derived / Potential / Unverified / Contradicted |
| **Discrimination evidence** | Evidence that, if obtained, would distinguish among competing hypotheses |
| **Exculpatory evidence** | Evidence that could disprove a working hypothesis |
| **Gap** | An expected-but-absent record, document, approval, inspection, response, or system event |
| **Material finding** | A finding whose severity, scope, or impact triggers enhanced procedural protections |
| **Negative space** | The set of records/controls/authorizations that should exist but do not |
| **Perfection score** | A composite metric used by the "Too Perfect" Detector |
| **Preservation deadline** | The latest date by which a volatile record must be preserved |
| **Process twin** | A digital model of an administrative process's required steps, controls, and SLAs |
| **Replay** | A read-only, chronological reconstruction of a case from authorized records |
| **Source of record** | The authoritative system that owns a given record |
| **System-derived** | A link or fact computed by ACA engines, not anchored by an authoritative record |
| **Time Machine** | The capability to reconstruct the case state as known at a chosen past date |
| **Twin version** | A versioned snapshot of the process twin under which a case was opened |
| **Volatility class** | One of Critical / High / Medium / Low |

---

## Appendix D — Reference: Source Blueprint Sections Covered

| Chapter | Source section | Topic |
|---------|----------------|-------|
| 1 | §9 | ACA Oversight Fabric |
| 2 | §10 | National Administrative Ontology |
| 3 | §11 | Smart Evidence Graph / Smart Evidence Linking |
| 4 | §12 | Smart Dynamic Timeline |
| 5 | §13 | Temporal Intelligence / Temporal Integrity Analysis |
| 6 | §14 | Investigation Time Machine |
| 7 | §15 | Expected Process vs Actual Process / Administrative Process Digital Twin |
| 8 | §16 | Administrative Process Replay / REPLAY CASE |
| 9 | §17 | "What Should Exist?" Engine |
| 10 | §18 | Evidence Gap Engine |
| 11 | §19 | Evidence Volatility Engine |
| 12 | §20 | Smart Evidence Acquisition Planner |
| 13 | §21 | Case Information Readiness / Next Best Investigative Action |
| 14 | §22 | Alternative-Hypothesis Engine |
| 15 | §23 | Devil's Advocate AI / Challenge This Finding |
| 16 | §24 | Mandatory Exculpatory Search |
| 17 | §25 | Negative-Space Intelligence |
| 18 | §26 | "Too Perfect" Detector |
| 19 | §208 | ACA Case Information Readiness Example |

---

## Appendix E — Implementation Notes (Non-Normative)

The following are advisory notes for engineering teams implementing Part II. They are non-normative and may be superseded by Part VII (Deployment Architecture) and Part IX (Implementation Roadmap).

1. **Graph backend.** The Oversight Fabric is naturally a labeled property graph. A suitable backend (e.g., a graph database with audit-grade access control) should be selected; relational projections of the graph may be materialized for query performance.

2. **Immutability.** All evidence, link, gap, and finding records should be append-only with cryptographic integrity (hash chains or tamper-evident logs). The audit trail itself is part of the evidence fabric.

3. **Engine isolation.** Each intelligence engine (Temporal, Gap, Volatility, Acquisition, Hypothesis, Devil's Advocate, Exculpatory, Negative-Space, "Too Perfect") should be implemented as an isolated service that reads from the fabric ledger and writes its outputs back to the ledger. Engines must not read from each other directly; they communicate via the ledger.

4. **Configuration governance.** Engine thresholds, weights, and policy thresholds are themselves audit-relevant configuration items. Changes to them require ACA governance approval and must be versioned.

5. **Performance.** The Smart Evidence Graph re-evaluation must complete within a service-level target (default: 60 seconds) on new evidence acquisition. Cross-case correlation may be batched.

6. **Authorization.** All endpoints described in this Part enforce Zero Trust principles (see Part V — Security / Zero Trust). No engine output is accessible without an explicit authorization scope.

7. **Privacy by design.** Where evidence or links reference persons, the minimum-necessary data is exposed by default; full records require elevated authorization. Pseudonymization and tokenization should be used wherever feasible.

8. **International cooperation.** Cross-border evidence flows described in Part VI (International Cooperation) must respect the same confidence classification rules; system-derived links may not be shared internationally as proven facts.

9. **DR/Continuity.** The evidence fabric, the intelligence ledger, and the Time Machine snapshots are critical national infrastructure. Their protection, backup, and recovery are governed by Part VII (Disaster Recovery / Continuity).

10. **AI Governance.** Every AI-driven engine in Part II is subject to the AI Governance framework in Part V, including model lineage, evaluation, drift monitoring, and human-in-the-loop checkpoints for material findings.

---

## Closing Note

Part II establishes the *evidence intelligence* of the ACA sovereign environment: the discipline by which administrative records become a continuously-reconciled, audit-ready fabric; the engines that surface what is missing, what is volatile, what is too perfect, and what contradicts itself; the governance that prevents the system from ever silently promoting an inference to a fact; and the investigator-facing surfaces — the Timeline, the Replay, the Readiness Panel, the Time Machine — that let a human being reason over the fabric with confidence.

The cardinal commitments of this Part are simple to state and difficult to uphold:

1. Everything links to everything it legitimately relates to.
2. Every link knows its own confidence.
3. No inference is ever presented as a fact.
4. No anomaly is ever automatically labelled guilt.
5. No finding is finalized until it has been challenged, and the search for what would disprove it has been completed and recorded.

These commitments are the difference between an investigative tool and an instrument of injustice. The ACA sovereign environment is built to be the former.

# CIRCLE ACA — Integration, Deployment, Compliance & Final Audit
## Part V of the ACA Sovereign Edition Blueprint

> **Scope of Part V.** This document closes the ACA Sovereign Edition by specifying the **Government Integration Fabric**, the **National Intelligence & Reform Cockpit**, the **Deployment & Sovereign Infrastructure** model, the **Privacy, Security & Compliance** layer, and the four **final audit matrices** (Requirements Traceability, Original Circle → ACA Impact, Data Classification, End-to-End Test & Absolute Security Tests) plus the closing **Gap / Duplication / Conflict Audit** required by Section 240.
>
> **Reading order.** Part V depends on Parts I–IV (Identity & Trust, Evidence & Investigation, Intelligence Graph & Recommendations, Citizen ↔ ACA Boundary). Each chapter cross-references the upstream sections that define the data, evidence, or access-control primitives it relies on. Where a chapter reuses a shared service (e.g. Provenance Ledger, Audit Trail, Schema Change Sentinel), it points to the canonical definition rather than duplicating it.
>
> **Authoritative source rule.** Per Section 236, this Part never invents an Egyptian endpoint, API, certificate, credential, or legal authority. Every integration target is labeled with one of: `confirmed/API-ready`, `standards-compatible`, `secure-file compatible`, `requires government agreement`, or `requires additional technical discovery`. Where a status is unverified, the literal text **Requires government authorization / technical discovery** is used.
>
> **Language discipline (Section 237).** This Part uses **investigative indicator**, **evidence-supported finding**, **authorized access**, **provenance**, **analytical signal**, **human determination**, and **policy-controlled workflow**. It never asserts that "AI proves guilt", "AI determines corruption", "video is automatically legally admissible", "all government systems are connected", or "all data is centralized".
>
> **Institutional positioning (Section 238).** Circle ACA is positioned as a **sovereign administrative oversight, investigation, evidence, intelligence and governance platform** — not a CRM, not a complaint tracker, not an AI chatbot, not a surveillance platform. Its core value proposition, taken from Section 238, is:
>
> > Circle connects authorized complaints, official field evidence, investigations, government services, administrative processes, documents, transactions, inspections, decisions, people, entities, rules and systems into one continuously auditable environment that helps ACA reconstruct events, discover relationships, identify missing information, compare expected and actual processes, investigate efficiently, detect systemic weaknesses, coordinate across institutions, verify reforms and identify emerging risks before they become major problems.

---

## Table of Contents

### Block A — National Intelligence & Risk Radar
- Chapter 1 — National Administrative Early Warning (Section 121)
- Chapter 2 — Administrative Health Index (Section 122)
- Chapter 3 — Entity / Office Scorecards (Section 123)

### Block B — Government Data Quality, Freshness & Federation
- Chapter 4 — Government Data Quality Engine (Section 128)
- Chapter 5 — Data Freshness (Section 129)
- Chapter 6 — System-of-Record Registry (Section 130)
- Chapter 7 — Zero-Copy Federation (Section 131)
- Chapter 8 — Secure Data Clean Room (Section 132)
- Chapter 9 — Pseudonymous Linkage (Section 133)
- Chapter 10 — Purpose-Bound Query (Section 134)
- Chapter 11 — Information Boundary Matrix (Section 135)

### Block C — Government Integration Fabric
- Chapter 12 — Government Integration Fabric (Section 136)
- Chapter 13 — Protocol Support (Section 137)
- Chapter 14 — Government Event Bus (Section 138)
- Chapter 15 — Event-to-Evidence Auto-Link (Section 139)
- Chapter 16 — Integration Health Control Tower (Section 140)
- Chapter 17 — Schema Change Sentinel (Section 141)
- Chapter 18 — Missing-System Map (Section 142)
- Chapter 19 — Automated Integration Discovery (Section 143)
- Chapter 20 — Egypt-Specific Integration Roadmap (Section 144)
- Chapter 21 — ACA Internal Integrations (Section 145)

### Block D — Egyptian Institutional Connectors
- Chapter 22 — CAOA / Organization Data (Section 146)
- Chapter 23 — Ministry of Finance / Public Funds (Section 147)
- Chapter 24 — Procurement (Section 148)
- Chapter 25 — ETA (Section 149)
- Chapter 26 — GAFI (Section 150)
- Chapter 27 — FRA (Section 151)
- Chapter 28 — AMLU (Section 152)
- Chapter 29 — Illicit Gains (Section 153)
- Chapter 30 — Ministry of Interior / Public Funds (Section 154)

### Block E — Justice & Cross-Authority Bridges
- Chapter 31 — Administrative Prosecution Bridge (Section 155)
- Chapter 32 — Public Prosecution Bridge (Section 156)
- Chapter 33 — Court / Judicial Bridge (Section 157)
- Chapter 34 — NAFEZA / Customs (Section 158)
- Chapter 35 — Governorate / Local Administration (Section 159)
- Chapter 36 — Land / Property (Section 160)
- Chapter 37 — Health / Education / Utilities / Transport (Section 161)
- Chapter 38 — Consumer Protection / NTRA / Other Authorities (Section 162)

### Block F — International Cooperation & Benchmarking
- Chapter 39 — International Cooperation (Section 163)
- Chapter 40 — International Asset Recovery (Section 164)
- Chapter 41 — International Obligations (Section 165)
- Chapter 42 — Global Benchmarking (Section 166)

### Block G — National Command, Reform & Simulation
- Chapter 43 — ACA Command Center (Section 167)
- Chapter 44 — ACA Daily Intelligence Brief (Section 168)
- Chapter 45 — ACA Situation Room (Section 169)
- Chapter 46 — National Service Map (Section 170)
- Chapter 47 — National Integrity / Administrative Health Map (Section 171)
- Chapter 48 — Reform / National Strategy Cockpit (Section 172)
- Chapter 49 — Training Academy (Section 173)
- Chapter 50 — Administrative Red-Team (Section 174)
- Chapter 51 — Governance Stress Test (Section 175)
- Chapter 52 — Administrative Integrity Digital Twin (Section 176)

### Block H — Security of ACA Itself & Operational Resilience
- Chapter 53 — Security of the ACA System Itself (Section 177)
- Chapter 54 — Cyber Incident Investigation Mode (Section 178)
- Chapter 55 — Disaster Recovery (Section 179)
- Chapter 56 — Evidence Recovery Drill (Section 180)
- Chapter 57 — Surge Mode (Section 181)
- Chapter 58 — Continuity Mode (Section 182)

### Block I — Privacy, Public Boundary & Identity Protection
- Chapter 59 — Privacy Architecture (Section 183)
- Chapter 60 — Protected Reporter Architecture (Section 184)
- Chapter 61 — Whistleblower Retaliation Signal (Section 185)
- Chapter 62 — Public/ACA Data Boundary (Section 186)
- Chapter 63 — Citizen Status Experience (Section 187)
- Chapter 64 — ACA Agent Profile (Section 190)
- Chapter 65 — Device-to-Agent Binding (Section 191)
- Chapter 66 — Case-Based Access (Section 192)
- Chapter 67 — Temporary Access (Section 193)
- Chapter 68 — Two-Person Authorization (Section 194)
- Chapter 69 — Audit Trail (Section 195)
- Chapter 70 — Evidence Access Audit (Section 196)
- Chapter 71 — Provenance Ledger (Section 197)
- Chapter 72 — Data Conflict (Section 198)
- Chapter 73 — Data Reliability (Section 199)

### Block J — Compliance, Legal Configuration & Evidence Disposition
- Chapter 74 — Compliance / Assurance Layer (Section 200)
- Chapter 75 — Egyptian Legal / Regulatory Configuration (Section 201)
- Chapter 76 — Retention / Legal Hold (Section 202)
- Chapter 77 — ACA Evidence Disposition (Section 203)
- Chapter 78 — AI Human-Authority Boundary (Section 204)
- Chapter 79 — Session Security (Section 223)
- Chapter 80 — Export Security (Section 224)
- Chapter 81 — Evidence Package (Section 225)
- Chapter 82 — Public Transparency (Section 226)
- Chapter 83 — Public Outcome Communication (Section 227)
- Chapter 84 — Positive Governance (Section 228)
- Chapter 85 — False-Accusation Analysis (Section 229)
- Chapter 86 — Whistleblower / Retaliation Architecture (Section 230)
- Chapter 87 — International Language Support (Section 231)

### Block K — Deployment, Sovereign Infrastructure & Key Management
- Chapter 88 — Deployment Options (Section 211)
- Chapter 89 — Separate ACA Data Plane (Section 212)
- Chapter 90 — Key Management (Section 213)
- Chapter 91 — Secret Management (Section 214)
- Chapter 92 — Security Error-Check (Section 215)

### Block L — Final Audit Matrices
- Chapter 93 — Requirements Traceability Matrix (Section 217)
- Chapter 94 — Original Circle → ACA Impact Matrix (Section 218)
- Chapter 95 — Data Classification Matrix (Section 219)
- Chapter 96 — Acceptance Criteria (Section 232)
- Chapter 97 — End-to-End Test Scenarios (Section 233)
- Chapter 98 — Absolute Security Tests (Section 234)
- Chapter 99 — Login Failure / Lockout (Section 222)
- Chapter 100 — Gap / Duplication / Conflict Audit (Section 240)

---

## Block A — National Intelligence & Risk Radar

### Chapter 1: National Administrative Early Warning (Section 121)

**Intent.** Provide ACA leadership with a continuously updated, multi-source **National Administrative Risk Radar** that surfaces deteriorating administrative conditions *before* they escalate into formal cases. The Radar is an analytical signal layer, not an accusation layer: every signal it raises must be traceable to one or more underlying records and must be reviewable by a human before any operational action.

**Composite input streams.** The Radar combines — it does not pick one — the following categories of evidence:

1. **Complaints** — citizen reports, including the topic, geographic location, service affected, frequency, and reporter-provided evidence markers.
2. **Service telemetry** — volume, latency, error rate, rejection rate, re-issuance rate, and SLA breach counts pulled from authorized service-system integrations.
3. **Inspection findings** — observations, deficiencies, repeat findings, overdue corrective actions, and supervisor escalations.
4. **Evidence patterns** — recurring document types, recurring entities, recurring system dependencies, and recurring timeline anomalies observed across cases.
5. **Control failures** — segregation-of-duties violations, authorization bypass, missing approvals, missing logs, missing inspection records.
6. **System performance** — integration health signals (Chapter 16), schema-change events (Chapter 17), data-freshness drift (Chapter 5), and reliability drops (Chapter 73).

**Risk dimensions.** Each composite signal is scored along four axes — *likelihood*, *impact*, *urgency*, and *confidence* — and only displayed to ACA leadership after a confidence threshold is met. The four axes are computed from the underlying records, never asserted directly.

**Anti-abuse guardrails.**
- The Radar does **not** generate a "corruption score" for individuals (see Chapter 2 for the index discipline).
- The Radar does **not** auto-open a case. It produces a **RISK SIGNAL** record that an authorized ACA officer may convert into a triage item.
- The Radar never displays the identity of a protected reporter or any sealed evidence on its leadership-facing tiles.
- Every signal carries a *methodology footnote* describing how it was computed and which input streams contributed.

**Outputs.**
- `RISK SIGNAL` records written to the ACA Intelligence store, each carrying provenance back to the contributing records.
- `EARLY WARNING BRIEF` tiles on the ACA Command Center (Chapter 43).
- Optional push into the **ACA Daily Intelligence Brief** (Chapter 44) after human review.

**Acceptance (preview).** A leadership user can drill from a Radar tile to the contributing complaint, inspection record, or control-failure audit entry without losing provenance. Acceptance Test: see Chapter 96, criterion "National Early Warning".

**Dependencies.** Provenance Ledger (Chapter 71), Audit Trail (Chapter 69), Information Boundary Matrix (Chapter 11), Service Map (Chapter 46).

---

### Chapter 2: Administrative Health Index (Section 122)

**Intent.** Provide ACA with a transparent, multi-dimensional index that describes how a service, office, governorate, or sector is performing across the dimensions that matter for administrative integrity. The Index is deliberately *composite* — a single number is misleading — and is rendered as a small index card with a sparkline per dimension rather than a single "score".

**Discipline — what this is not.** This Part does **not** create a simplistic "corruption score". The word *corruption* is a legal determination made by competent authorities, not an algorithmic output. The Index is an **administrative health** indicator: it describes observable administrative conditions, not guilt.

**Dimensions.** Each entity is measured across the following dimensions, computed from authorized records:

| Dimension | What it observes | Primary input streams |
|---|---|---|
| Efficiency | Latency, throughput, rework rate | Service telemetry, case timeline |
| Compliance | Adherence to published rules, mandatory steps, SLA | Rule/Regulation Intelligence, timeline deltas |
| Integrity indicators | Control failures, missing approvals, separation-of-duties breaches | Audit Trail, control register |
| Service quality | Complaint volume, complaint nature, repeat complaints | Complaints, citizen feedback |
| Controls | Existence and effectiveness of preventive/detective controls | Control register, inspection findings |
| Corrective action | Open vs closed corrective actions, overdue ratio | Recommendations & Corrective Actions |
| Data reliability | Freshness, completeness, consistency (Chapter 73) | Data Quality Engine |
| Prevention readiness | Training coverage, drill results, scenario coverage | Training Academy, Red-Team results |

**Computation rules.**
- Each dimension is normalized within its peer group (e.g. governorates compared to governorates, not to ministries).
- Each dimension displays its **methodology footnote** and the **sample size** behind it.
- Dimensions with insufficient data are rendered as `INSUFFICIENT DATA`, never imputed to a neutral midpoint (imputation would mask real gaps).
- The Index is **time-aware**: it can be rendered at any historical date when authorized records permit, so ACA can compare "January vs July".

**Anti-misuse.** The Index is **not** a basis for disciplinary action by itself. It is an **analytical signal** that may inform resource allocation, inspection scheduling, and reform prioritization. Any operational consequence flows through the standard case / inspection / recommendation workflows, all of which require human determination.

**Outputs.**
- `ADMINISTRATIVE HEALTH INDEX` records per entity, per period.
- Sparkline visualizations on Entity Scorecards (Chapter 3).
- Aggregated views on the National Integrity Map (Chapter 47).

**Acceptance (preview).** A user cannot produce a single-dimension ranking without seeing the methodology and sample size. See Chapter 96, criterion "Index Methodology".

**Dependencies.** Entity Scorecards (Chapter 3), Data Reliability (Chapter 73), Rule/Regulation Intelligence (Part IV), Training Academy (Chapter 49).

---

### Chapter 3: Entity / Office Scorecards (Section 123)

**Intent.** Give ACA investigators and analysts a per-entity (office, ministry, governorate, sector, person-of-interest in authorized context) scorecard that consolidates the relevant administrative intelligence in one auditable view, while remaining silent on data the viewer is not authorized to see.

**Scorecard sections.**

1. **Identity & provenance** — canonical entity reference, system-of-record (Chapter 6), last verified date (Chapter 5).
2. **Service trend** — service volumes, latency, error rates over time, with methodology footnote.
3. **Complaint trend** — complaint volume, topic mix, geographic distribution, repeat-reporter flag (without revealing reporter identity).
4. **Risk** — current composite Risk Radar signal (Chapter 1) and historical risk trend.
5. **Controls** — control register entries, control failure history, control effectiveness rating.
6. **Findings** — prior findings (authorized subset only), categorized by severity and status.
7. **Recommendations** — open and closed recommendations linked to this entity.
8. **Reform** — reform programs linked, implementation milestones, outcome indicators.
9. **Data quality** — reliability, freshness, conflicts (Chapter 4 / Chapter 72), source coverage.
10. **Audit summary** — count of audit events concerning this entity within the viewer's authorization scope (no detail leakage).

**Access control.** Scorecard visibility is governed by Case-Based Access (Chapter 66) and the Information Boundary Matrix (Chapter 11). An investigator without clearance for an entity's financial intelligence does not see that section; the section is hidden, not greyed-out with preview content.

**Provenance.** Every scorecard tile carries a "Where did this come from?" affordance that opens the Provenance Ledger (Chapter 71) chain for the underlying fact.

**Outputs.**
- `ENTITY SCORECARD` view, exportable as a sealed Evidence Package (Chapter 81) only with export authorization (Chapter 80).
- `SCORECARD SNAPSHOT` records, time-stamped, for trend analysis.

**Acceptance (preview).** A user without procurement clearance cannot discover that a procurement scorecard section exists for the entity. See Chapter 96, criterion "Scorecard Authorization".

**Dependencies.** Entity Resolution (Part III), Provenance Ledger (Chapter 71), Information Boundary Matrix (Chapter 11), Case-Based Access (Chapter 66).

---

## Block B — Government Data Quality, Freshness & Federation

### Chapter 4: Government Data Quality Engine (Section 128)

**Intent.** Provide a continuously running engine that assesses the technical quality of government-sourced records *as ACA receives them*, so that downstream intelligence is never silently corrupted by a duplicate, stale, partial, or contradictory record.

**Detection categories.** The Engine evaluates every received record against the following categories:

| # | Quality defect | Detection method | Default action |
|---|---|---|---|
| 1 | Duplicate data | Match on canonical identifiers + fuzzy match on attribute sets | Flag, do not auto-merge |
| 2 | Stale data | Compare `LAST VERIFIED` (Chapter 5) against per-record-type SLA | Display staleness badge |
| 3 | Missing fields | Compare against per-record-type mandatory field schema | Display `INCOMPLETE` badge, refuse to feed analytics |
| 4 | Conflicting values | Cross-system attribute comparison (Chapter 72) | Display `DATA CONFLICT`, retain both provenance paths |
| 5 | Broken links | Validate references to other records/systems | Display `BROKEN LINK`, exclude from graph until repaired |
| 6 | Inconsistent identifiers | Detect mismatched identifier schemes for the same logical entity | Route to Entity Resolution (Part III) |

**Operating principles.**
- The Engine never silently deletes a record. Every defect produces a `DATA QUALITY EVENT` record with full provenance.
- Defects feed back into the Data Reliability indicator (Chapter 73) and the Administrative Health Index (Chapter 2).
- Defects visible on the Integration Health Control Tower (Chapter 16) when caused by integration issues.

**Outputs.**
- `DATA QUALITY EVENT` records.
- Per-record quality badge on Entity Scorecards (Chapter 3).
- Aggregated reliability score on the Integration Health Control Tower.

**Acceptance (preview).** A duplicate record cannot overwrite the original; both copies remain, with the conflict surfaced. See Chapter 96, criterion "Data Quality Non-Destructive".

**Dependencies.** System-of-Record Registry (Chapter 6), Data Conflict (Chapter 72), Provenance Ledger (Chapter 71), Entity Resolution (Part III).

---

### Chapter 5: Data Freshness (Section 129)

**Intent.** Ensure that every ACA user, at the moment of viewing an external record, can immediately tell whether the record is current, stale, or unverified — without having to open a separate audit screen.

**Rule.** Every external record displayed anywhere in ACA carries a `LAST VERIFIED` timestamp. The timestamp reflects the moment the source system confirmed the record's current state, not the moment ACA received it (those may differ when feeds are batched).

**Display contract.**
- `LAST VERIFIED: 2024-07-12 14:33 — source: <SYSTEM>, status: HEALTHY`
- If the source is degraded (Chapter 16), the freshness badge shows `STALE — source DEGRADED` even if the timestamp is recent.
- If the source has never replied, the badge reads `UNVERIFIED — no source confirmation`.

**Operational consequences.**
- Stale records cannot be used as the sole basis for a `FINDING` (Part IV). They may contribute to an analytical signal but must be paired with at least one current source or an investigator's sworn observation.
- Records older than their SLA generate a `FRESHNESS DRIFT` event that feeds the Risk Radar (Chapter 1).

**Acceptance (preview).** No external record can be rendered in any ACA screen without a `LAST VERIFIED` badge. See Chapter 96, criterion "Freshness Visibility".

**Dependencies.** Integration Health Control Tower (Chapter 16), Data Reliability (Chapter 73), Schema Change Sentinel (Chapter 17).

---

### Chapter 6: System-of-Record Registry (Section 130)

**Intent.** For every canonical object ACA models (Person, Entity, Position, Service, Permit, Transaction, Inspection, Document, Decision, Payment, etc.), identify the **authoritative source system** that owns the truth for that object. Circle ACA is an orchestration and intelligence layer, *not* the source of truth.

**Registry structure.**

| Canonical object | Authoritative source | Source type | Update mode | Last registry review |
|---|---|---|---|---|
| Person (citizen) | National ID authority | government | federation | 2024-07-01 |
| Person (official) | CAOA | government | federation | 2024-07-01 |
| Organization unit | CAOA | government | federation | 2024-07-01 |
| Company | GAFI | government | federation | 2024-07-01 |
| Tax document | ETA | government | federation | 2024-07-01 |
| Procurement tender | Government procurement system | government | federation | 2024-07-01 |
| Customs declaration | NAFEZA | government | federation | 2024-07-01 |
| Transaction (bank) | Authorized financial gateway | government | clean room | 2024-07-01 |
| Inspection record | Sector regulator | government | federation | 2024-07-01 |
| Evidence artifact | ACA Evidence Vault | internal | source of truth | n/a |

> The entries above are **architectural placeholders**. Whether each source is reachable, and via which protocol, is governed by Chapter 20 (Egypt Integration Roadmap). Status labels follow Section 236.

**Operating rule.** When ACA stores a derived copy of an external object (e.g. a cached view of a GAFI company), the copy is marked `DERIVED — source: GAFI`. The cached copy is never treated as authoritative; any conflict with the source raises a Data Conflict (Chapter 72).

**Acceptance (preview).** Every derived record carries a `SOURCE OF RECORD` link. See Chapter 96, criterion "Source-of-Record Traceability".

**Dependencies.** Zero-Copy Federation (Chapter 7), Data Conflict (Chapter 72), Provenance Ledger (Chapter 71).

---

### Chapter 7: Zero-Copy Federation (Section 131)

**Intent.** Prefer **querying authorized source systems** at the moment of need, rather than blindly duplicating government databases into ACA storage. This protects citizens and the government from data drift, retention creep, and unauthorized secondary use.

**Operating modes.**

| Mode | When used | What is stored in ACA |
|---|---|---|
| **Live query** | Source supports real-time query, low latency, high availability | Only the result view + provenance; no persistent copy |
| **Cached view** | Source supports query but with rate limits or latency | A short-TTL cached view with `LAST VERIFIED` (Chapter 5); TTL per source policy |
| **Snapshot** | Source supports periodic extract only | Time-stamped snapshot with explicit `AS AT` date; superseded snapshots retained per retention policy |
| **Clean-room exchange** | Source cannot expose raw records | Aggregated/anonymized result only — see Chapter 8 |
| **Manual intake** | Source has no API | Sealed evidence package ingested via Chapter 12 secure manual intake |

**Default preference.** Live query is preferred whenever the source system supports it. Snapshots are only taken when justified and the snapshot is marked `DERIVED`.

**Failure handling.** When a live query fails, ACA displays the last successful view with a `STALE` badge (Chapter 5). It never substitutes a different source silently.

**Anti-pattern rejected.** "Pull the entire GAFI database nightly into ACA" is rejected. The default pattern is "query GAFI for the company of interest, on demand, with the case ID as the audit anchor".

**Acceptance (preview).** A user can see, for any external fact, whether it was a live query, cached view, or snapshot. See Chapter 96, criterion "Federation Mode Visible".

**Dependencies.** Purpose-Bound Query (Chapter 10), Information Boundary Matrix (Chapter 11), Integration Health Control Tower (Chapter 16).

---

### Chapter 8: Secure Data Clean Room (Section 132)

**Intent.** Permit privacy-preserving cross-institution analytics where the participating institutions cannot legally or technically expose raw records to each other. The Clean Room computes on combined data *without* either side seeing the other's raw inputs.

**Use cases.**
- AMLU and ACA jointly analyzing transaction patterns without AMLU exposing raw transaction records.
- Ministry of Finance and ACA comparing payment evidence without exposing citizen-level payment data.
- Sector regulators and ACA comparing inspection findings without exposing whistleblower identities.

**Architecture.**
- The Clean Room is a separate compute enclave within the ACA Data Plane (Chapter 89).
- Inputs are pseudonymized at the boundary (Chapter 9).
- Outputs are aggregates or differentially-private results; raw records never leave the contributing institution.
- Every Clean Room session is governed by a per-session **Purpose-Bound Query** (Chapter 10) and produces a full audit trail.

**Anti-leakage controls.**
- Small-cell suppression: any aggregate result revealing ≤ k individuals is suppressed.
- Join-key minimization: only the join keys declared in the Purpose-Bound Query are used; ad-hoc joins are blocked.
- Output review: a designated reviewer from each contributing institution must approve outputs before they leave the Clean Room.

**Acceptance (preview).** A Clean Room session cannot export an individual's record; only aggregates pass the output gate. See Chapter 96, criterion "Clean Room Output Boundary".

**Dependencies.** Pseudonymous Linkage (Chapter 9), Purpose-Bound Query (Chapter 10), Information Boundary Matrix (Chapter 11), Two-Person Authorization (Chapter 68) for output release.

---

### Chapter 9: Pseudonymous Linkage (Section 133)

**Intent.** Permit authorized cross-system matching of records without exposing unnecessary identity. When ACA needs to know whether "the company in this case" is "the supplier in that procurement record", it does not need to expose the citizen identities behind every related record.

**Mechanism.**
- Each canonical identifier (national ID, tax ID, commercial register, etc.) is hashed with a per-institution salt before reaching ACA.
- ACA holds **linkage tokens**, not raw identifiers, except where the viewer is explicitly authorized to see the raw identifier.
- The linkage token is stable within a case but not reusable across cases, preventing cross-case correlation without explicit authorization.

**Authorization levels.**
| Level | What the viewer sees |
|---|---|
| Anonymous | A token; no identifier |
| Pseudonymous | `R-XXXX`-style label; matches between records visible, raw identifier hidden |
| Identified | Raw identifier visible, with full audit (Two-Person Authorization if the identifier is a protected identity) |

**Anti-abuse.** A user with Pseudonymous level cannot escalate to Identified without a separate authorization event, even if the user's role generally permits identification.

**Acceptance (preview).** An investigator with Pseudonymous clearance can match two records without seeing the underlying national ID. See Chapter 96, criterion "Pseudonymous Matching".

**Dependencies.** Protected Reporter Architecture (Chapter 60), Information Boundary Matrix (Chapter 11), Audit Trail (Chapter 69).

---

### Chapter 10: Purpose-Bound Query (Section 134)

**Intent.** Ensure that every sensitive query ACA issues against an external system is **justified, scoped, recorded, and reviewable**. A query without a purpose is a privacy violation; this chapter closes that gap.

**Required fields.** Every sensitive query records:

| Field | Meaning |
|---|---|
| requester | The ACA agent identity issuing the query |
| case | The case ID (or triage ID) anchoring the query |
| purpose | The investigative purpose, in plain language |
| authority | The legal/policy basis (jurisdiction code + authority code from Chapter 75) |
| requested data | The data classes requested, by canonical object type |
| time window | The observation window (start, end) |
| issued at | The timestamp of issuance |
| source system | The target system |
| result summary | Aggregate result descriptor (counts, not raw records) |

**Lifecycle.**
1. The agent composes the query; the system validates that the agent's clearance covers the requested data class.
2. The system checks the Information Boundary Matrix (Chapter 11) for the source.
3. The query is executed via Zero-Copy Federation (Chapter 7) or Clean Room (Chapter 8).
4. The result is logged as a `QUERY EVENT` with the fields above and a Provenance Ledger entry.
5. The result is visible to the requester and to the audit reviewer; it is not repurposable for unrelated analyses without a new Purpose-Bound Query.

**Anti-pattern rejected.** "Pull everything we might ever need" is rejected. Each query is purpose-bound and time-bound.

**Acceptance (preview).** Every external record presented in a Case Timeline has a Purpose-Bound Query anchor. See Chapter 96, criterion "Purpose-Bound Provenance".

**Dependencies.** Information Boundary Matrix (Chapter 11), Audit Trail (Chapter 69), Provenance Ledger (Chapter 71), Jurisdiction / Policy Engine (Chapter 75).

---

### Chapter 11: Information Boundary Matrix (Section 135)

**Intent.** Define, per integration, exactly what ACA can *request*, *receive*, *retain*, *export*, and *who can access each item*. This Matrix is the single canonical authority for cross-system data movement; nothing else overrides it.

**Matrix structure.** For every integration target defined in Chapters 12–38, the Matrix contains one row per data class:

| Source | Data class | Can request | Can receive | Can retain | Retention max | Can export | Access role | Audit level |
|---|---|---|---|---|---|---|---|---|
| GAFI | Company registration | yes (purpose-bound) | yes (cached view) | yes (TTL 7d) | 7 days | yes (manifest) | investigator+ | full |
| ETA | Tax document | yes (purpose-bound) | yes (snapshot) | yes (case-closure+1y) | per Chapter 76 | yes (manifest, 2PA) | senior investigator | full |
| AMLU | Transaction pattern | yes (clean-room) | yes (aggregate only) | no raw | n/a | no raw | analyst+ | full + 2PA |
| … | … | … | … | … | … | … | … | … |

> The rows above are illustrative. The full Matrix is maintained as a versioned configuration artifact under the Jurisdiction / Policy Engine (Chapter 75), with effective dates and review cycles.

**Operating rules.**
- A query that exceeds the Matrix is blocked at the Integration Gateway (Chapter 12), regardless of the requester's clearance.
- An export that exceeds the Matrix is blocked at the Export Security layer (Chapter 80).
- Retention enforcement is automatic (Chapter 76); no human can extend retention without a Legal Hold event.

**Acceptance (preview).** A user cannot retain AMLU raw data beyond the Matrix limit, even with administrator privileges. See Chapter 96, criterion "Information Boundary Enforcement".

**Dependencies.** Jurisdiction / Policy Engine (Chapter 75), Retention / Legal Hold (Chapter 76), Export Security (Chapter 80), Two-Person Authorization (Chapter 68).

---

## Block C — Government Integration Fabric

### Chapter 12: Government Integration Fabric (Section 136)

**Intent.** Provide ACA with a single, governed, audited **Integration Fabric** that all government connectors plug into. The Fabric is the canonical interface between ACA and the rest of the government ecosystem; it standardizes protocol handling, authentication, schema management, observability, and policy enforcement.

**Architectural principle.** ACA does **not** build disconnected point-to-point integrations. Every connector — internal or external — plugs into the Fabric. The Fabric enforces:

1. **Single policy enforcement point** — Information Boundary Matrix (Chapter 11) checked at the gateway, not at each connector.
2. **Single audit point** — every request and response logged once, with consistent fields.
3. **Single schema registry** — every connector publishes its schema; the Schema Change Sentinel (Chapter 17) monitors drift.
4. **Single event ingress** — Government Event Bus (Chapter 14) is the only ingress path for system events.
5. **Single secret surface** — Key Management (Chapter 90) and Secret Management (Chapter 91) are the only sources of credentials.

**ACA Integration Gateway.** The Fabric's edge component. Responsibilities:
- terminate connections from connectors;
- authenticate inbound requests (mutual TLS where supported, signed payloads where not);
- enforce Purpose-Bound Query scope (Chapter 10);
- enforce Information Boundary Matrix (Chapter 11);
- emit `INTEGRATION EVENT` records to the Audit Trail;
- route requests to the appropriate connector via the Connector Registry.

**Connector model.**
- Each connector implements a standard interface: `discover()`, `query()`, `subscribe()`, `healthcheck()`, `schema()`.
- Connectors are versioned. The Fabric supports multiple concurrent versions of the same connector to allow source-side migrations.
- Connectors are isolated in separate execution contexts; a fault in one connector cannot affect another.

**Outputs.**
- `INTEGRATION EVENT` audit records.
- Connector health metrics feeding the Integration Health Control Tower (Chapter 16).
- Schema descriptors feeding the Schema Change Sentinel (Chapter 17).

**Acceptance (preview).** A new connector cannot bypass the Fabric. See Chapter 96, criterion "Single Integration Surface".

**Dependencies.** Protocol Support (Chapter 13), Government Event Bus (Chapter 14), Schema Change Sentinel (Chapter 17), Information Boundary Matrix (Chapter 11), Key Management (Chapter 90), Secret Management (Chapter 91).

---

### Chapter 13: Protocol Support (Section 137)

**Intent.** Real-world government systems cannot all speak the same modern protocol. ACA's Integration Fabric supports the full spectrum of protocols observed in government environments, with consistent security applied to each.

**Supported protocols.**

| Protocol | Use case | Security envelope |
|---|---|---|
| REST / JSON | Modern APIs, query-style integrations | mTLS + signed JSON + bearer token |
| SOAP / XML | Legacy government web services | WS-Security + signed XML |
| SFTP | Batch file exchange | SSH key + IP allowlist + file hash verification |
| Signed XML | Legally meaningful document exchange | XMLDSig + XAdES |
| Signed JSON | Modern equivalent of signed XML | JWS + detached signature |
| Batch feeds | Nightly extracts, periodic snapshots | Encrypted container + manifest + hash chain |
| Database views | Read-only views granted to ACA | Read-only role + query allowlist + audit trigger |
| Webhooks | Event push from source systems | mTLS + HMAC signature + replay protection |
| Event streams | Real-time event streams | mTLS + offset tracking + per-event signature |
| Secure manual intake | No-API sources | Sealed upload + manifest + quarantine until reviewed |

**Cross-cutting controls.**
- Every protocol has a defined timeout, retry, and circuit-breaker policy.
- Every protocol has a defined failure mode: queries that fail must surface as `STALE` or `UNAVAILABLE`, never as silent empty results.
- Every protocol produces audit records with identical fields, so the Integration Health Control Tower (Chapter 16) can compare protocols on equal terms.

**Anti-pattern rejected.** "We'll just import the database" is rejected. Database-view integrations are read-only, role-restricted, query-allowlisted, and audit-triggered.

**Acceptance (preview).** A failed protocol negotiation produces a visible `INTEGRATION ISSUE` record within 60 seconds. See Chapter 96, criterion "Protocol Failure Visibility".

**Dependencies.** Integration Fabric (Chapter 12), Schema Change Sentinel (Chapter 17), Integration Health Control Tower (Chapter 16).

---

### Chapter 14: Government Event Bus (Section 138)

**Intent.** Provide a single event-ingestion channel for cross-government events that ACA is authorized to observe. The Bus normalizes event payloads, validates them against the source's published schema, and routes them to the appropriate ACA subsystem.

**Event types supported (non-exhaustive).**

| Event | Source class | ACA consumer |
|---|---|---|
| application created | service systems | Case Timeline, Risk Radar |
| document submitted | service systems | Evidence Graph, Timeline |
| inspection completed | inspection systems | Case Timeline, Findings |
| approval issued | service systems | Timeline, Control register |
| payment recorded | financial systems | Timeline, Financial Intelligence |
| decision issued | service systems | Timeline, Recommendations |
| case assigned | case-management systems | Investigator assignment |

**Bus guarantees.**
- At-least-once delivery, with idempotency keys to suppress duplicates.
- Per-event signature so ACA can verify the event originated from the claimed source.
- Ordered delivery per source, where the source guarantees ordering.
- Schema validation at ingress; events that fail validation are quarantined, not silently dropped.

**Event-to-Evidence Auto-Link (Chapter 15).** Every event that arrives triggers an automatic search for related evidence and timeline windows, so events are immediately connected to the cases they concern.

**Acceptance (preview).** A `decision issued` event from an authorized source appears on the relevant Case Timeline within the source's declared SLA. See Chapter 96, criterion "Event-to-Case Latency".

**Dependencies.** Event-to-Evidence Auto-Link (Chapter 15), Schema Change Sentinel (Chapter 17), Case Timeline (Part IV), Integration Health Control Tower (Chapter 16).

---

### Chapter 15: Event-to-Evidence Auto-Link (Section 139)

**Intent.** When an external event arrives, automatically search for evidence and time windows relevant to the event, and link the event to the cases it concerns. This is the mechanism by which ACA keeps timelines current without manual stitching.

**Algorithm.**
1. **Parse** the event payload, extracting entity references, service identifiers, time, and decision type.
2. **Search** the Evidence Graph (Part III) for evidence within a configurable time window around the event.
3. **Match** entity references via Pseudonymous Linkage (Chapter 9) — never by raw identifier unless authorized.
4. **Propose** links to relevant cases; if a case already exists for the matched entity and time window, link automatically; otherwise, produce a `CANDIDATE LINK` record for human review.
5. **Audit** every automatic link in the Provenance Ledger (Chapter 71).

**Guardrails.**
- Auto-linking never modifies sealed evidence (Chapter 81). It only proposes relationships; sealing is a separate authorized action.
- Auto-linking never discloses protected identities (Chapter 60); matching happens at the pseudonym layer.
- A human reviewer must confirm any link that crosses a confidentiality boundary (e.g. between an AMLU event and an ACA case).

**Acceptance (preview).** An `inspection completed` event for a service that matches Case 118 auto-attaches a candidate link within the event's declared SLA. See Chapter 96, criterion "Auto-Link Accuracy".

**Dependencies.** Government Event Bus (Chapter 14), Evidence Graph (Part III), Provenance Ledger (Chapter 71), Pseudonymous Linkage (Chapter 9).

---

### Chapter 16: Integration Health Control Tower (Section 140)

**Intent.** Provide ACA's technical leadership with a single dashboard that answers "are our integrations healthy?" without forcing them to inspect each connector individually.

**Dashboard tiles (minimum set).**

| Tile | Description |
|---|---|
| Connected systems | Count and list of integrations registered with the Fabric |
| Healthy systems | Count and list with current health = HEALTHY |
| Degraded systems | Count and list with current health = DEGRADED (partial outage, latency, schema drift) |
| Unavailable systems | Count and list with current health = UNAVAILABLE |
| Active requests | In-flight requests across all connectors |
| Overdue requests | Requests past their SLA, per connector |
| Missing records | Records expected by scheduled feeds but not received |
| Sync failures | Failed synchronizations in the last 24h / 7d |
| Schema changes | Open schema-change events (Chapter 17) |
| Authorization issues | Pending authorization expirations, revoked credentials |

**Operating principles.**
- The Tower is read-only for analysts; actions (re-try, pause connector, request re-authorization) require separate authorization.
- The Tower feeds the Risk Radar (Chapter 1) when integration issues trigger analytical impact.
- The Tower's view is also exposed to the ACA Security Operations plane (Chapter 53) for correlation with security events.

**Example (illustrative).** Per Section 209:
```
Connected Systems: 37
Healthy: 34
Degraded: 2
Offline: 1
Active Requests: 184
Overdue: 11
Missing Records: 613
Sync Errors: 3
Schema Changes: 1
Pending Authorizations: 17
```
> The figures above are demonstration data, not live measurements.

**Acceptance (preview).** A degraded connector cannot silently corrupt historical records (Absolute Security Test J, Chapter 98). See Chapter 96, criterion "Integration Health Visibility".

**Dependencies.** Integration Fabric (Chapter 12), Schema Change Sentinel (Chapter 17), Missing-System Map (Chapter 18), ACA Security Operations (Chapter 53).

---

### Chapter 17: Schema Change Sentinel (Section 137, 141)

**Intent.** Detect, at the earliest possible moment, when an external system changes its schema (fields added, removed, renamed, retyped, or constraint changed) and **prevent silent corruption** of ACA records that depend on that schema.

**Detection mechanisms.**
- Periodic schema polling for sources that expose schema endpoints.
- Payload-shape validation at ingress: every inbound message is validated against the source's last-known schema; mismatches raise a `SCHEMA CHANGE` event.
- Statistical drift detection: when field nullability, cardinality, or value distribution shifts beyond a threshold, a `SCHEMA DRIFT` event is raised even if the published schema has not changed.

**Response playbook.**
1. The Sentinel raises a `SCHEMA CHANGE` event and marks the connector as `DEGRADED` on the Integration Health Control Tower (Chapter 16).
2. The Fabric switches the connector to **fail-safe mode**: queries return `SCHEMA UNVERIFIED` rather than potentially-misinterpreted data.
3. The Sentinel produces a **diff report** showing the change in human-readable form.
4. An ACA integration engineer reviews the diff, updates the connector's schema descriptor, and explicitly re-enables the connector.

**Anti-pattern rejected.** "Just coerce types on read" is rejected. Silent coercion is the primary cause of evidence corruption across heterogeneous systems; the Sentinel refuses to do it.

**Acceptance (preview).** A schema change in the source cannot produce a silent misinterpretation in ACA. See Absolute Security Test J (Chapter 98).

**Dependencies.** Integration Fabric (Chapter 12), Integration Health Control Tower (Chapter 16), Provenance Ledger (Chapter 71).

---

### Chapter 18: Missing-System Map (Section 142)

**Intent.** Provide ACA leadership with a strategic view of *what is not yet integrated*, so they can prioritize the next wave of integrations rather than only reacting to outages.

**Map states.**

| State | Meaning | Visible action |
|---|---|---|
| Connected | Integration live and healthy | None |
| Degraded | Integration live but with issues | Investigate via Chapter 16 |
| Unavailable | Integration live but currently down | Incident response |
| Not yet integrated | System identified as relevant, no connector built | Plan via Chapter 19 |
| Authorization required | Connector feasible, but government authorization pending | Track via Chapter 11 Matrix |

**Use.** The Map drives the **Automated Integration Discovery** process (Chapter 19) when an analyst needs data that is not yet integrated, and informs the **Egypt-Specific Integration Roadmap** (Chapter 20).

**Acceptance (preview).** The Map is the single authoritative source of "what ACA can and cannot currently reach". See Chapter 96, criterion "Missing-System Map Authority".

**Dependencies.** Integration Health Control Tower (Chapter 16), Automated Integration Discovery (Chapter 19), Egypt-Specific Integration Roadmap (Chapter 20).

---

### Chapter 19: Automated Integration Discovery (Section 143)

**Intent.** When an ACA investigator or analyst needs data that is not yet integrated, the system automatically produces a structured `INTEGRATION REQUIREMENT` record rather than leaving the gap as an unwritten wish.

**Generated record fields.**

| Field | Source |
|---|---|
| source | The system that would have the data |
| agency | The owning government institution |
| required data | The canonical object types needed |
| reason | The investigative purpose (from the case or triage item) |
| priority | Derived from case severity + analytical impact |
| proposed connector | Suggested protocol (Chapter 13) and connector type |
| authorization state | Required, in progress, granted, denied |

**Workflow.**
1. Investigator requests data not currently reachable.
2. The Fabric consults the Missing-System Map (Chapter 18) and the System-of-Record Registry (Chapter 6).
3. The Fabric generates an `INTEGRATION REQUIREMENT` record and routes it to the ACA Integration Engineering queue and to the relevant government liaison.
4. The record is tracked through resolution; the requesting investigator sees status updates on the case.

**Anti-pattern rejected.** "We'll add that later" without a tracked record is rejected. Every gap becomes a tracked item.

**Acceptance (preview).** Every unmet data need produces a tracked `INTEGRATION REQUIREMENT`. See Chapter 96, criterion "Gap Tracking".

**Dependencies.** Missing-System Map (Chapter 18), Egypt-Specific Integration Roadmap (Chapter 20), Information Boundary Matrix (Chapter 11).

---

### Chapter 20: Egypt-Specific Integration Roadmap (Section 144)

**Intent.** Provide an architectural roadmap — **not** a claim of existing integration — for authorized connection to the Egyptian government ecosystem. Every entry is labeled with one of five statuses per Section 236:

- **confirmed / API-ready** — the source exposes a documented, currently available API and ACA has verified reachability.
- **standards-compatible** — the source is expected to align with a recognized exchange standard; verification pending.
- **secure-file compatible** — exchange is feasible via signed batch files; verification pending.
- **requires government agreement** — a formal inter-institutional agreement is needed before any technical work.
- **requires additional technical discovery** — the source's interfaces, formats, or constraints are not yet known.

> Per Section 236, this Part does **not** assert that a particular API exists unless verified. Entries below describe the **architectural intent** and the **status label** that currently applies. Where the status is not yet `confirmed / API-ready`, the literal text **Requires government authorization / technical discovery** is used.

**Roadmap (architectural intent).**

| # | Source class | Scope | Status | Notes |
|---|---|---|---|---|
| 1 | ACA internal systems | Cases, complaints, documents, correspondence, HR, org chart, assignment, archive, internal communications, inspection management | confirmed (internal) | ACA-owned; Chapter 21 |
| 2 | Government identity / PKI / digital signatures / ITIDA ecosystem | Identity verification, signature verification, certificate validation | requires government authorization / technical discovery | Chapter 75 governs legal basis |
| 3 | CAOA | Org units, positions, staffing, grades, transfers, job descriptions, historical state | requires government authorization / technical discovery | Chapter 22 |
| 4 | Central Auditing Organization | Audit findings, control observations (authorized subset) | requires government authorization / technical discovery | Inter-institutional agreement required |
| 5 | Ministry of Finance / financial controllers | Budget, allocation, commitments, expenditures, financial-control information, public funds, payment evidence | requires government authorization / technical discovery | Chapter 23 |
| 6 | Administrative Prosecution | Referral bridge, acknowledgement, investigation, decision, outcome | requires government authorization / technical discovery | Chapter 31 |
| 7 | Illicit Gains | Asset/income evidence, referrals, related records, investigations | requires government authorization / technical discovery | Chapter 29 |
| 8 | AMLU | Referrals, requests, financial intelligence exchange, entity linkage, transaction correlation | requires government authorization / technical discovery | Chapter 28 |
| 9 | FRA | Regulated entities, licensing, regulatory actions, financial activity | requires government authorization / technical discovery | Chapter 27 |
| 10 | Ministry of Interior / Public Funds | Public-funds investigations, identity verification, relevant law-enforcement records, cyber-related cooperation | requires government authorization / technical discovery | Chapter 30 |
| 11 | ETA | Tax data, e-invoice, e-receipt, tax-document verification | requires government authorization / technical discovery | Chapter 25 |
| 12 | GAFI | Incorporation, company identity, representatives, directors, legal status, changes, branches | requires government authorization / technical discovery | Chapter 26 |
| 13 | Government procurement systems | Tender, bid, supplier, award, contract, amendment, delivery, invoice, payment | requires government authorization / technical discovery | Chapter 24 |
| 14 | NAFEZA / customs | Authorized customs/trade records relevant to investigations | requires government authorization / technical discovery | Chapter 34 |
| 15 | Financial-information gateways / banks (where legally authorized) | Payment evidence, transaction patterns (clean-room only) | requires government authorization / technical discovery | Chapter 8 |
| 16 | Government digital-service ecosystem | Service telemetry, decision events, application events | requires government authorization / technical discovery | Chapter 14 |
| 17 | Governorates / local administration | Governorate → district → local unit → office → service → permit → inspection → complaint | requires government authorization / technical discovery | Chapter 35 |
| 18 | Licensing | License issuance, status, history | requires government authorization / technical discovery | Sector-specific |
| 19 | Inspection systems | Inspection scheduling, findings, corrective actions | requires government authorization / technical discovery | Chapter 35 |
| 20 | Health | Sector-specific authorized subset; tightly controlled | requires government authorization / technical discovery | Chapter 37 |
| 21 | Education | Sector-specific authorized subset; tightly controlled | requires government authorization / technical discovery | Chapter 37 |
| 22 | Utilities | Sector-specific authorized subset; tightly controlled | requires government authorization / technical discovery | Chapter 37 |
| 23 | Transport | Sector-specific authorized subset; tightly controlled | requires government authorization / technical discovery | Chapter 37 |
| 24 | Land / property systems (where legally authorized) | Property/permit/registration relationships | requires government authorization / technical discovery | Chapter 36 |
| 25 | Public Prosecution | Case referral bridge | requires government authorization / technical discovery | Chapter 32 |
| 26 | Courts / judicial systems (where legally authorized) | Authorized proceedings linked to ACA cases | requires government authorization / technical discovery | Chapter 33 |
| 27 | Relevant regulators | Sector-specific regulatory data | requires government authorization / technical discovery | Chapter 38 |
| 28 | International cooperation systems | MLA requests, asset recovery, obligation tracking | requires government authorization / technical discovery | Chapters 39–42 |

**Connector labels.** Each connector, when implemented, is labeled with the five-way classification from Section 236. A connector is not declared "ready" until both (a) the technical status is `confirmed / API-ready` and (b) the Information Boundary Matrix (Chapter 11) entry for that source is approved.

**Acceptance (preview).** No ACA screen claims an Egyptian integration is live unless its status in this Roadmap is `confirmed / API-ready`. See Chapter 96, criterion "Roadmap Status Discipline".

**Dependencies.** Integration Fabric (Chapter 12), Information Boundary Matrix (Chapter 11), Jurisdiction / Policy Engine (Chapter 75).

---

### Chapter 21: ACA Internal Integrations (Section 145)

**Intent.** ACA's own systems are first-class integrations of the Fabric. They are not assumed to be "always there"; they are registered, monitored, and audited like any external system, with the additional privilege of being ACA-owned.

**First-class internal integrations.**

| Internal system | Role | Owner | Notes |
|---|---|---|---|
| Cases | Case lifecycle, status, assignment | ACA Case Management | Source of truth for case state |
| Complaints | Intake, triage, classification | ACA Intake | Feeds Chapter 1 Risk Radar |
| Documents | Document registry, versioning | ACA Documents | Source of truth for documents |
| Correspondence | Inbound/outbound official correspondence | ACA Correspondence | Sealed correspondence tracked via Chapter 81 |
| HR | Personnel records, clearance | ACA HR | Feeds Chapter 64 Agent Profile |
| Organization chart | Reporting structure, historical state | ACA Org | Aligned with CAOA (Chapter 22) |
| Investigator assignment | Active assignments, history | ACA Assignment | Feeds Chapter 66 Case-Based Access |
| Archive | Long-term sealed storage | ACA Archive | Retention per Chapter 76 |
| Internal communications | Secure ACA-internal messaging | ACA Comms | Not exposed to citizens |
| Inspection management | Inspection scheduling, findings, corrective actions | ACA Inspections | Source of truth for inspections |

**Discipline.** Even though these systems are ACA-owned, they obey the same Fabric contract: schema published, audit emitted, Information Boundary Matrix enforced. The reason is that internal misconfiguration is as dangerous as external drift.

**Acceptance (preview).** An HR schema change cannot silently break the Agent Profile screen; the Schema Change Sentinel (Chapter 17) catches it. See Chapter 96, criterion "Internal Integration Parity".

**Dependencies.** Integration Fabric (Chapter 12), Schema Change Sentinel (Chapter 17), Audit Trail (Chapter 69).

---

## Block D — Egyptian Institutional Connectors

### Chapter 22: CAOA / Organization Data (Section 146)

**Intent.** Provide ACA with authorized access to the Central Agency for Organization and Administration (CAOA) organizational data — units, positions, staffing, grades, transfers, job descriptions, and historical organizational state — so that ACA can place any case in its correct organizational context at the correct point in time.

**Authorized scope.** Per Chapter 20, the integration status is **requires government authorization / technical discovery**. The architectural intent covers:

- Organizational units (ministry → sector → department → office)
- Positions (role, grade, reporting line)
- Staffing (headcount, vacancies, acting assignments)
- Grades (grade scale, grade history)
- Transfers (transfer history, effective dates)
- Job descriptions (current and historical)
- Historical organizational state (organization-as-of a given date)

**Critical rule — the historical date matters.** A case opened in 2022 must be evaluated against the organization as it existed in 2022, not as it exists today. The integration therefore supports **as-of queries**: a request for "who was the head of office X on date Y" must return the historical answer, with provenance.

**Use in ACA.**
- Case Timeline can anchor an event to the organizational context at the event's date.
- Entity Scorecards (Chapter 3) show organizational trajectory.
- The Administrative Integrity Digital Twin (Chapter 52) consumes historical organizational state for simulation.

**Anti-abuse.** Personnel data accessed through CAOA is not used to construct a "corruption score" for individuals (Chapter 2 discipline). It is used for contextual analysis and authorized investigative indicators only.

**Acceptance (preview).** An as-of query returns the correct historical answer with provenance. See Chapter 96, criterion "Historical Organization State".

**Dependencies.** System-of-Record Registry (Chapter 6), Zero-Copy Federation (Chapter 7), Provenance Ledger (Chapter 71), Information Boundary Matrix (Chapter 11).

---

### Chapter 23: Ministry of Finance / Public Funds (Section 147)

**Intent.** Provide authorized access to financial-control information necessary for administrative investigations involving public funds.

**Authorized scope (architectural intent).**
- Budget — allocations, revisions, transfers
- Allocation — program-level allocations
- Commitments — pending obligations
- Expenditures — actual spend
- Financial-control information — observations, deficiencies
- Public funds — flows tracked for public-funds investigations
- Payment evidence — invoices, payment records, reconciliation

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Privacy posture.**
- Citizen-level payment data is accessed only via Clean Room (Chapter 8) where the question is aggregate or pattern-based.
- Where individual payment evidence is required for a specific case, access is via Purpose-Bound Query (Chapter 10) and is audited.
- Payment evidence ingested into ACA becomes sealed evidence (Chapter 81) and is subject to Retention / Legal Hold (Chapter 76).

**Use in ACA.**
- Case Timeline can attach payment events.
- Financial Intelligence view (Part IV) correlates payment patterns with case entities.
- Findings can reference specific payment evidence with provenance.

**Acceptance (preview).** A payment record retrieved for Case 118 carries full provenance and is sealed upon ingestion. See Chapter 96, criterion "Financial Evidence Sealing".

**Dependencies.** Clean Room (Chapter 8), Purpose-Bound Query (Chapter 10), Evidence Package (Chapter 81), Information Boundary Matrix (Chapter 11).

---

### Chapter 24: Procurement (Section 148)

**Intent.** Provide authorized access to procurement lifecycle data so ACA can investigate procurement-related administrative concerns with the full chain of evidence.

**Lifecycle objects supported.**
- Tender
- Bid
- Supplier
- Award
- Contract
- Amendment
- Delivery
- Invoice
- Payment

**Status.** Per Chapter 20, **requires government authorization / technical discovery** for the relevant government procurement systems.

**Use in ACA.**
- The Evidence Graph (Part III) models procurement as a chain from tender → award → contract → delivery → payment, with each link carrying provenance.
- Anomalies (e.g. award without tender, payment without delivery) surface as `PROCUREMENT ANOMALY` analytical signals feeding the Risk Radar (Chapter 1).
- Entity Scorecards (Chapter 3) show supplier history and award patterns.

**Anti-abuse.** The procurement intelligence view is **not** a supplier blacklist generator. Findings are evidence-supported and human-determined (Chapter 78).

**Acceptance (preview).** A procurement anomaly tile links back to the underlying records that produced it. See Chapter 96, criterion "Procurement Anomaly Provenance".

**Dependencies.** Evidence Graph (Part III), Risk Radar (Chapter 1), Provenance Ledger (Chapter 71), Information Boundary Matrix (Chapter 11).

---

### Chapter 25: ETA (Section 149)

**Intent.** Provide authorized access to Egyptian Tax Authority (ETA) data relevant to investigations — tax records, e-invoice, e-receipt, and tax-document verification — so ACA can validate documentary evidence and detect inconsistencies.

**Authorized scope.**
- Tax data (subject to Chapter 11 Matrix)
- E-invoice — issued, received, cancelled
- E-receipt — issued, received
- Tax-document verification — authenticity check

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Use in ACA.**
- A document presented as evidence can be verified against ETA's e-invoice/e-receipt registry; verification result is recorded as a `VERIFICATION EVENT` with provenance.
- Discrepancies between case evidence and ETA records surface as `DATA CONFLICT` (Chapter 72).
- Verification results feed the Evidence Graph and Timeline.

**Privacy posture.** Citizen-level tax data is never bulk-loaded; access is per-document, per-case, via Purpose-Bound Query (Chapter 10).

**Acceptance (preview).** A tax-document verification result includes the verification timestamp, source, and the e-invoice/e-receipt UUID matched. See Chapter 96, criterion "Tax Document Verification".

**Dependencies.** Purpose-Bound Query (Chapter 10), Data Conflict (Chapter 72), Provenance Ledger (Chapter 71), Evidence Package (Chapter 81).

---

### Chapter 26: GAFI (Section 150)

**Intent.** Provide authorized access to General Authority for Investment and Free Zones (GAFI) corporate data so ACA can place entities in their correct corporate-structure context.

**Authorized scope.**
- Incorporation — date, form, founding documents
- Company identity — commercial register, legal name, legal form
- Representatives — authorized signatories, history
- Directors — current and historical
- Legal status — active, dissolved, merged, under resolution
- Changes — amendments, capital changes, scope changes
- Branches — locations, activities

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Use in ACA.**
- Entity Scorecards (Chapter 3) display the canonical GAFI identity, with `LAST VERIFIED` (Chapter 5).
- The Evidence Graph models corporate relationships (parent/subsidiary/affiliate) using GAFI as the source of record (Chapter 6).
- Cross-references between GAFI data and procurement supplier records surface inconsistencies.

**Anti-abuse.** GAFI data is used for entity resolution and investigative context, not for building predictive profiles of legitimate businesses.

**Acceptance (preview).** A company's corporate structure is rendered with its historical state at the relevant date. See Chapter 96, criterion "Corporate Structure As-Of".

**Dependencies.** Entity Resolution (Part III), System-of-Record Registry (Chapter 6), Zero-Copy Federation (Chapter 7), Information Boundary Matrix (Chapter 11).

---

### Chapter 27: FRA (Section 151)

**Intent.** Provide authorized access to Financial Regulatory Authority (FRA) data for regulated entities, licensing, regulatory actions, and financial activity information.

**Authorized scope.**
- Regulated entities — brokerages, portfolio managers, underwriters, etc.
- Licensing — license issuance, status, conditions
- Regulatory actions — warnings, suspensions, revocations
- Financial activity information — market activity relevant to investigations

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Use in ACA.**
- Entity Scorecards display regulatory history.
- Cases involving regulated entities can attach regulatory-action records as evidence (sealed, per Chapter 81).
- Cross-system inconsistencies (e.g. a regulated entity also awarded a public contract) surface as analytical signals.

**Acceptance (preview).** A regulatory action recorded for an entity appears on its scorecard with provenance. See Chapter 96, criterion "Regulatory Action Provenance".

**Dependencies.** Entity Scorecards (Chapter 3), Evidence Package (Chapter 81), Information Boundary Matrix (Chapter 11).

---

### Chapter 28: AMLU (Section 152)

**Intent.** Provide a **high-security workflow** for Anti-Money Laundering and Terrorist Financing Unit (AMLU) cooperation — referrals, requests, financial intelligence exchange, entity linkage, and transaction correlation — under the strictest privacy and access controls in ACA.

**Workflow components.**
- Referrals — inbound and outbound
- Requests — for information, for analysis
- Financial intelligence exchange — aggregate, pattern-based
- Entity linkage — pseudonymous matching (Chapter 9)
- Transaction correlation — Clean Room only (Chapter 8)

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Access posture.**
- AMLU data is Highly Restricted; access requires explicit AMLU clearance in addition to ACA clearance.
- Raw transaction records never enter ACA; only aggregates and patterns leave the Clean Room.
- Every AMLU-related action requires Two-Person Authorization (Chapter 68).

**Use in ACA.**
- AMLU referrals produce ACA case records when authorized, but the underlying AMLU intelligence remains in the Clean Room enclave.
- Entity linkage is at the pseudonym level (Chapter 9); raw identifiers are unmasked only with separate authorization.
- AMLU cooperation activities are tracked in the International Cooperation Workspace (Chapter 39) when cross-border.

**Acceptance (preview).** An ACA investigator without AMLU clearance cannot discover that an AMLU referral exists. See Chapter 96, criterion "AMLU Compartmentalization".

**Dependencies.** Clean Room (Chapter 8), Pseudonymous Linkage (Chapter 9), Two-Person Authorization (Chapter 68), Information Boundary Matrix (Chapter 11), Audit Trail (Chapter 69).

---

### Chapter 29: Illicit Gains (Section 153)

**Intent.** Provide a **dedicated restricted workflow** for Illicit Gains matters — asset and income evidence, referrals, related records, and investigations — separate from ordinary case workflow to preserve the additional confidentiality these matters require.

**Workflow components.**
- Asset / income evidence — sealed, with chain of custody (Chapter 81)
- Referrals — inbound and outbound
- Related records — financial, corporate, property, transaction
- Investigations — dedicated investigation lifecycle

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Access posture.**
- Illicit Gains cases are Highly Restricted and require Illicit Gains clearance.
- Asset and income evidence is sealed upon ingestion; no normal delete mechanism (Chapter 76).
- Disclosure to other ACA modules is governed by the Information Boundary Matrix (Chapter 11).

**Use in ACA.**
- The Illicit Gains workflow shares the Evidence Graph and Timeline infrastructure but isolates access.
- Cross-references with AMLU, FRA, and Public Prosecution are tracked with full provenance.
- Asset recovery efforts connect to the International Asset Recovery workflow (Chapter 40) when cross-border.

**Acceptance (preview).** An Illicit Gains case is not visible to a regular ACA investigator. See Chapter 96, criterion "Illicit Gains Isolation".

**Dependencies.** Evidence Package (Chapter 81), Two-Person Authorization (Chapter 68), Retention / Legal Hold (Chapter 76), Information Boundary Matrix (Chapter 11).

---

### Chapter 30: Ministry of Interior / Public Funds (Section 154)

**Intent.** Provide authorized cooperation with the Ministry of Interior / Public Funds investigations — public-funds investigations, identity verification, relevant law-enforcement records, and cyber-related cooperation.

**Authorized scope (architectural intent).**
- Public-funds investigations — referral bridge
- Identity verification — confirmation of identity in authorized context
- Relevant law-enforcement records — narrow, purpose-bound
- Cyber-related cooperation — joint cyber incident response (see Chapter 54)

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Access posture.**
- Ministry of Interior cooperation is Highly Restricted.
- Identity verification returns a binary confirmation, not a full record, unless the case specifically authorizes full records.
- Cyber-related cooperation routes through the Cyber Incident Investigation Mode (Chapter 54).

**Use in ACA.**
- Public-funds referral bridge mirrors the structure of Chapters 31–32 (Administrative Prosecution, Public Prosecution) but is restricted to public-funds matters.
- Identity verification results are recorded as `VERIFICATION EVENT` records with provenance.
- Law-enforcement record references are linked, not bulk-imported.

**Acceptance (preview).** An identity verification result does not leak additional law-enforcement records. See Chapter 96, criterion "Identity Verification Boundary".

**Dependencies.** Cyber Incident Investigation Mode (Chapter 54), Referral Bridges (Chapters 31–32), Information Boundary Matrix (Chapter 11), Audit Trail (Chapter 69).


## Block E — Justice & Cross-Authority Bridges

### Chapter 31: Administrative Prosecution Bridge (Section 155)

**Intent.** Provide a structured referral and feedback bridge between ACA and the Administrative Prosecution, so that a matter requiring prosecution attention can be referred, acknowledged, investigated, decided, and resolved with full bidirectional traceability — without either side operating the other's case-management system.

**Lifecycle.**

| Stage | Originating system | Receiving system | ACA record produced |
|---|---|---|---|
| ACA case | ACA | — | Case |
| Referral | ACA | Administrative Prosecution | `REFERRAL OUTBOUND` |
| Acknowledgement | Administrative Prosecution | ACA | `REFERRAL ACKNOWLEDGED` |
| Investigation | Administrative Prosecution | ACA (status only) | `REFERRAL IN INVESTIGATION` |
| Decision | Administrative Prosecution | ACA | `DECISION RECEIVED` |
| Outcome | Administrative Prosecution | ACA | `OUTCOME RECORDED` |

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Operating rules.**
- The bridge transmits an **Evidence Package** (Chapter 81) at referral time: case identifier, evidence manifest, integrity information, chronology, and findings/recommendations (authorized subset).
- The receiving system's acknowledgement is recorded with its own provenance; the originating ACA case retains its own evidence; no evidence is destroyed at referral.
- Decisions and outcomes are recorded on the ACA case timeline but do not modify the original evidence.
- Where the receiving system returns a receiving case ID, it is recorded and used for cross-reference.

**Anti-pattern rejected.** "Just send the case file over" is rejected. The bridge transmits a **structured, sealed Evidence Package** with manifest and integrity information, not an unstructured file dump.

**Acceptance (preview).** A referred case retains its full evidence chain; the receiving system's acknowledgement appears on the ACA timeline within the bridge's declared SLA. See Chapter 96, criterion "Referral Bridge Integrity".

**Dependencies.** Evidence Package (Chapter 81), Provenance Ledger (Chapter 71), Audit Trail (Chapter 69), Information Boundary Matrix (Chapter 11).

---

### Chapter 32: Public Prosecution Bridge (Section 156)

**Intent.** Provide a bridge for authorized criminal referrals from ACA to the Public Prosecution, with strict integrity and chronology guarantees, while preserving the boundary between administrative oversight and criminal prosecution.

**Lifecycle.**
- Case (ACA)
- Evidence manifest (Chapter 81)
- Integrity information (hashes, chain of custody)
- Chronology (sealed timeline)
- Referral (outbound)
- Receiving case ID (returned by Public Prosecution)
- Outcome / status (periodic)

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Operating rules.**
- The bridge is **outbound by default** — ACA refers; it does not pull Public Prosecution records except as explicitly authorized.
- Referrals include a full Evidence Package with hashes; the receiving system is expected to verify integrity on receipt.
- Receiving case ID, when provided, is recorded and used for cross-reference; it does not grant ACA access to the receiving system's case file.
- Outcome/status updates are recorded on the ACA case timeline.

**Anti-abuse.**
- A referral is a human-authorized action; the AI cannot refer a case to Public Prosecution (Chapter 78).
- Two-Person Authorization (Chapter 68) is required for referral of an exceptionally sensitive case.
- The original evidence is never deleted upon referral; retention continues per Chapter 76.

**Acceptance (preview).** A Public Prosecution referral carries a verifiable integrity manifest. See Chapter 96, criterion "Public Prosecution Referral Integrity".

**Dependencies.** Evidence Package (Chapter 81), Two-Person Authorization (Chapter 68), AI Human-Authority Boundary (Chapter 78), Retention / Legal Hold (Chapter 76).

---

### Chapter 33: Court / Judicial Bridge (Section 157)

**Intent.** Where legally authorized, connect ACA cases to court proceedings so ACA can record the judicial status of a referred matter — **without replacing or operating any judicial system**.

**Operating principles.**
- The bridge is **read-only from ACA's perspective**: ACA records the existence, status, and outcome of authorized judicial proceedings linked to ACA cases.
- ACA does not store judicial records beyond the minimum necessary for case context.
- The bridge respects court confidentiality; sealed proceedings are not visible to ACA investigators without explicit authorization.
- Court decisions affecting an ACA case (e.g. acquittal, conviction, civil judgment) are recorded as case timeline events with provenance.

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Use in ACA.**
- A case that has been referred to Public Prosecution and subsequently to a court carries a `JUDICIAL PROCEEDING` reference on its timeline.
- The case's outcome is updated when the judicial outcome is recorded.
- Recommendations and Corrective Actions (Part IV) may be reopened when judicial outcomes reveal new information.

**Acceptance (preview).** The bridge does not duplicate judicial records; it records references and statuses only. See Chapter 96, criterion "Judicial Bridge Discipline".

**Dependencies.** Public Prosecution Bridge (Chapter 32), Provenance Ledger (Chapter 71), Information Boundary Matrix (Chapter 11).

---

### Chapter 34: NAFEZA / Customs (Section 158)

**Intent.** Provide authorized access to NAFEZA / customs records where relevant to investigations involving trade-based concerns, valuation irregularities, or supply-chain integrity.

**Authorized scope (architectural intent).**
- Customs declarations (authorized subset)
- Trade records relevant to a specific case
- Import/export evidence supporting an investigation

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Use in ACA.**
- Customs declarations can be attached as sealed evidence (Chapter 81) when relevant.
- The Evidence Graph models customs flows alongside procurement and financial flows.
- Valuation or origin discrepancies surface as analytical signals.

**Privacy posture.** Access is purpose-bound (Chapter 10), per-case; no bulk import of customs records.

**Acceptance (preview).** A customs declaration retrieved for a case carries `LAST VERIFIED` and provenance. See Chapter 96, criterion "Customs Record Provenance".

**Dependencies.** Purpose-Bound Query (Chapter 10), Evidence Package (Chapter 81), Information Boundary Matrix (Chapter 11).

---

### Chapter 35: Governorate / Local Administration (Section 159)

**Intent.** Provide ACA with a hierarchical model of local administration — governorate → district → local unit → office → service → permit → inspection → complaint — so any case can be placed in its correct administrative geography.

**Hierarchical model.**
- Governorate
- District (markaz)
- Local unit (qarya / hayy)
- Office
- Service
- Permit
- Inspection
- Complaint

**Status.** Per Chapter 20, **requires government authorization / technical discovery** for live integration with governorate systems.

**Use in ACA.**
- The National Service Map (Chapter 46) renders service performance geographically using this hierarchy.
- The National Integrity Map (Chapter 47) overlays risk and reform indicators on the same hierarchy.
- Cases can be filtered and aggregated by any level of the hierarchy.

**Operating rules.**
- The hierarchy is versioned; historical state is preserved for as-of queries (mirroring Chapter 22 discipline).
- Boundary changes (redistricting, merges, splits) are tracked as `ADMINISTRATIVE BOUNDARY CHANGE` events with effective dates.

**Acceptance (preview).** A case can be rendered on the map as it existed at the case's open date. See Chapter 96, criterion "Historical Administrative Geography".

**Dependencies.** National Service Map (Chapter 46), National Integrity Map (Chapter 47), Provenance Ledger (Chapter 71).

---

### Chapter 36: Land / Property (Section 160)

**Intent.** Where legally authorized, support property / permit / registration relationship queries relevant to investigations.

**Authorized scope (architectural intent).**
- Property registration (authorized subset)
- Permit history (authorized subset)
- Registration relationships (owner, lien, transfer)

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Privacy posture.** Property data is accessed via Purpose-Bound Query (Chapter 10) per case; no bulk import. Property-owner identity is pseudonymized by default (Chapter 9); unmasking requires explicit authorization.

**Use in ACA.**
- The Evidence Graph models property ownership alongside corporate structure for entity-linkage analysis.
- Property transaction anomalies (e.g. transfer immediately before a regulatory action) surface as analytical signals.

**Acceptance (preview).** A property record's owner is pseudonymized unless the viewer holds unmasking authorization. See Chapter 96, criterion "Property Owner Pseudonymization".

**Dependencies.** Pseudonymous Linkage (Chapter 9), Purpose-Bound Query (Chapter 10), Evidence Graph (Part III), Information Boundary Matrix (Chapter 11).

---

### Chapter 37: Health / Education / Utilities / Transport (Section 161)

**Intent.** Support tightly controlled sector-specific integrations while avoiding unrestricted sensitive personal data access. These sectors hold large volumes of sensitive personal data; ACA's posture is *minimal, purpose-bound, pseudonymized*.

**Per-sector posture.**

| Sector | Authorized scope | Privacy posture |
|---|---|---|
| Health | Service performance, inspection findings, regulatory actions | No clinical record access; aggregate indicators only |
| Education | Service performance, inspection findings, regulatory actions | No student record access; aggregate indicators only |
| Utilities | Service performance, payment evidence (sealed) | No customer record access; aggregate + per-case sealed evidence |
| Transport | Service performance, regulatory actions, permit history | No traveler record access; aggregate + per-case sealed evidence |

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Operating rules.**
- Sector integrations default to **aggregate indicators**; per-record access is the exception, not the rule.
- Per-record access requires a Purpose-Bound Query (Chapter 10) tied to a specific case.
- Sealed evidence from these sectors follows the standard Evidence Package (Chapter 81) and Retention / Legal Hold (Chapter 76) disciplines.

**Anti-abuse.** This chapter explicitly rejects the assumption that "all government data belongs inside Circle" (Section 183). Sensitive personal data from these sectors is not bulk-imported.

**Acceptance (preview).** A health-sector integration cannot expose a citizen's clinical record. See Chapter 96, criterion "Sector Data Minimization".

**Dependencies.** Clean Room (Chapter 8), Purpose-Bound Query (Chapter 10), Information Boundary Matrix (Chapter 11), Privacy Architecture (Chapter 59).

---

### Chapter 38: Consumer Protection / NTRA / Other Authorities (Section 162)

**Intent.** Provide a **Smart Referral Fabric** so ACA can distinguish between a matter that belongs to ACA and a matter that belongs to another competent authority — and route accordingly while preserving referral provenance.

**Smart Referral Fabric components.**
- Authority registry — list of competent authorities (Consumer Protection, NTRA, sector regulators, etc.) and their scope.
- Routing rules — criteria that determine which authority is competent for a given matter.
- Referral provenance — every referral records the originating matter, the receiving authority, the reason, the time, and the receiving reference if available.
- Status feedback — periodic updates on referred matters.

**Status.** Per Chapter 20, **requires government authorization / technical discovery** for live integration with each authority.

**Use in ACA.**
- Intake triage proposes a routing; a human confirms before referral.
- Mis-routed matters can be re-routed with full provenance retained.
- The Fabric preserves a complete view of every authority a matter has touched.

**Anti-abuse.** The Fabric does not auto-refer matters without human authorization (Chapter 78). The AI proposes routing; the human decides.

**Acceptance (preview).** A matter referred to NTRA retains a visible link to the originating ACA record; the routing decision and reason are recorded. See Chapter 96, criterion "Smart Referral Provenance".

**Dependencies.** AI Human-Authority Boundary (Chapter 78), Provenance Ledger (Chapter 71), Audit Trail (Chapter 69).

---

## Block F — International Cooperation & Benchmarking

### Chapter 39: International Cooperation (Section 163)

**Intent.** Provide ACA with an **International Cooperation Workspace** for managing cross-border cooperation requests in a structured, auditable, confidentiality-aware manner.

**Workspace record fields.**

| Field | Meaning |
|---|---|
| request | The cooperation request (inbound or outbound) |
| institution | The counterpart institution |
| jurisdiction | The counterpart jurisdiction |
| legal / treaty basis | MLA treaty, UNCAC, bilateral, etc. |
| confidentiality | Confidentiality classification |
| evidence | Evidence shared or received (sealed) |
| translation | Original language + translation + translator/model (Chapter 87) |
| deadline | Response deadline |
| response | Response received |
| status | Open / awaiting / responded / closed |

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Operating rules.**
- All cross-border evidence exchange is sealed (Chapter 81) and retention-governed (Chapter 76).
- Translation provenance follows Chapter 87 — original language is never deleted.
- Two-Person Authorization (Chapter 68) required for outbound evidence transmission.

**Acceptance (preview).** Every international cooperation request carries its legal basis and confidentiality classification. See Chapter 96, criterion "International Cooperation Discipline".

**Dependencies.** Evidence Package (Chapter 81), International Language Support (Chapter 87), Two-Person Authorization (Chapter 68), Retention / Legal Hold (Chapter 76).

---

### Chapter 40: International Asset Recovery (Section 164)

**Intent.** Where authorized, support international asset recovery efforts with a structured chain from person → entity → asset → transaction → jurisdiction → request → evidence → recovery.

**Chain elements.**
- Person (subject)
- Entity (legal vehicle used)
- Asset (the asset to be recovered)
- Transaction (movements of the asset)
- Jurisdiction (each jurisdiction involved)
- Request (MLA or equivalent)
- Evidence (supporting each link)
- Recovery (status and outcome)

**Status.** Per Chapter 20, **requires government authorization / technical discovery**.

**Use in ACA.**
- The Evidence Graph (Part III) models the recovery chain; each link carries provenance.
- Recovery requests are tracked in the International Cooperation Workspace (Chapter 39).
- Sealed evidence from AMLU, FRA, MoI, and international counterparts supports the chain.

**Privacy posture.** The recovery chain is Highly Restricted; access requires explicit asset-recovery clearance.

**Acceptance (preview).** Each link in the recovery chain has at least one supporting evidence item with provenance. See Chapter 96, criterion "Recovery Chain Evidence".

**Dependencies.** International Cooperation (Chapter 39), AMLU (Chapter 28), Illicit Gains (Chapter 29), Evidence Graph (Part III), Two-Person Authorization (Chapter 68).

---

### Chapter 41: International Obligations (Section 165)

**Intent.** Track Egypt's international obligations relevant to administrative integrity and anti-corruption, including implementation status, supporting evidence, and reporting deadlines.

**Tracked instruments.**
- UNCAC (United Nations Convention against Corruption)
- UNTOC (United Nations Convention against Transnational Organized Crime)
- Relevant regional mechanisms (e.g. Arab anti-corruption conventions, AU conventions, OECD instruments where applicable)
- International recommendations (e.g. from review bodies)
- Implementation status
- Supporting evidence
- Reporting deadlines

**Use in ACA.**
- Each obligation has a status dashboard: ratified / in implementation / reported / overdue.
- Evidence of implementation is linked to ACA cases, reforms, and recommendations where relevant.
- Reporting deadlines appear on the ACA Command Center (Chapter 43) and the Daily Intelligence Brief (Chapter 44).

**Status.** Per Chapter 20, **requires government authorization / technical discovery** for live tracking against the official reporting bodies.

**Acceptance (preview).** Each obligation's status is supported by at least one evidence link. See Chapter 96, criterion "Obligation Evidence".

**Dependencies.** Reform / National Strategy Cockpit (Chapter 48), Provenance Ledger (Chapter 71), ACA Command Center (Chapter 43).

---

### Chapter 42: Global Benchmarking (Section 166)

**Intent.** Allow ACA to compare administrative-integrity indicators with appropriate international references — OECD methodologies, international good practices, peer-country benchmarks, and sector benchmarks — while always displaying methodology and context so comparisons are not misused.

**Benchmark sources.**
- OECD methodologies (where relevant and authorized)
- International good practices (recognized bodies)
- Peer-country benchmarks (comparable economies)
- Sector benchmarks (sector-specific international references)

**Display discipline.**
- Every benchmark tile displays: source, methodology, sample size, period, normalization method, and the contextual caveat.
- ACA never publishes a benchmark comparison without the methodology footnote.
- Comparisons are never used to assert a "ranking"; they are used to identify relative strengths and gaps.

**Anti-abuse.** This Part does not claim ACA has achieved any specific international certification. Certification status is governed by Chapter 74 and Chapter 75; benchmarking is comparison, not certification.

**Acceptance (preview).** A benchmark comparison cannot be displayed without its methodology footnote. See Chapter 96, criterion "Benchmark Methodology Visibility".

**Dependencies.** Administrative Health Index (Chapter 2), Compliance / Assurance Layer (Chapter 74).

---

## Block G — National Command, Reform & Simulation

### Chapter 43: ACA Command Center (Section 167)

**Intent.** Provide ACA leadership with an executive dashboard that answers four questions without dashboard clutter:

1. **WHAT IS GOING WRONG?** — current risk signals, emerging concerns, deteriorating conditions.
2. **WHERE?** — geographic / organizational / sectoral distribution of concerns.
3. **WHY?** — contributing factors, evidence-supported indicators, root-cause hypotheses.
4. **WHAT NEEDS ACTION NOW?** — overdue actions, pending decisions, escalations.

**Design discipline.**
- The Command Center is **not** a general-purpose dashboard. It is purpose-built for the four questions; other analytics live on dedicated screens.
- Tiles are large, sparse, and explainable; each tile links to its underlying records.
- The Command Center never displays protected identities (Chapter 60) or sealed evidence (Chapter 81) at the leadership view.
- The Command Center respects the viewer's clearance; a leader without Illicit Gains clearance does not see those tiles.

**Feeds.**
- National Administrative Risk Radar (Chapter 1)
- Administrative Health Index (Chapter 2)
- Integration Health Control Tower (Chapter 16)
- International Obligations deadlines (Chapter 41)
- Overdue Corrective Actions (Part IV)

**Acceptance (preview).** The Command Center answers each of the four questions in one screen without exceeding tile count limits. See Chapter 96, criterion "Command Center Discipline".

**Dependencies.** Risk Radar (Chapter 1), Health Index (Chapter 2), Integration Health Control Tower (Chapter 16), Audit Trail (Chapter 69).

---

### Chapter 44: ACA Daily Intelligence Brief (Section 168)

**Intent.** Generate an automatic daily summary of: critical investigations, emerging risks, service deterioration, systemic patterns, evidence alerts, overdue actions, and major improvements — for distribution to authorized ACA leadership.

**Generation pipeline.**
1. Aggregation — collects signals from Risk Radar, Integration Health Tower, overdue actions, sealed-evidence alerts.
2. Drafting — composes a draft brief with provenance links.
3. Human review — a designated reviewer approves the brief before distribution.
4. Distribution — distributed only to authorized recipients.

**Anti-abuse.**
- The Brief is **not** auto-distributed. Human review and approval are required before official distribution where appropriate.
- The Brief does not include protected identities or sealed evidence detail at the summary level.
- Each item in the Brief links to its source records.

**Acceptance (preview).** A Brief cannot be distributed without a recorded human approval. See Chapter 96, criterion "Brief Approval Gate".

**Dependencies.** Risk Radar (Chapter 1), Integration Health Control Tower (Chapter 16), Audit Trail (Chapter 69), Provenance Ledger (Chapter 71).

---

### Chapter 45: ACA Situation Room (Section 169)

**Intent.** Provide a "situation room" view for major matters, with live case status, evidence, timeline, agencies involved, dependencies, risks, decisions, and actions — so leadership can manage a complex matter in one screen.

**Situation room panels.**
- Live case status — current state, stage, owner
- Evidence — key evidence items (sealed; access-controlled)
- Timeline — sealed timeline of events
- Agencies — list of cooperating agencies and their roles
- Dependencies — outstanding requests, missing records, awaiting court
- Risks — current risk signals affecting the matter
- Decisions — recent and pending decisions
- Actions — current actions and their owners

**Operating rules.**
- The Situation Room is **matter-bound**: it opens for a specific case or set of related cases.
- Access is restricted to the matter's authorized team plus leadership with clearance.
- Every action taken from the Situation Room is fully audited (Chapter 69).

**Acceptance (preview).** A leadership user can see the current state of a major matter in one screen. See Chapter 96, criterion "Situation Room Coverage".

**Dependencies.** Case Timeline (Part IV), Evidence Graph (Part III), Audit Trail (Chapter 69), Two-Person Authorization (Chapter 68) for sensitive actions.

---

### Chapter 46: National Service Map (Section 170)

**Intent.** Map government service performance geographically so leadership can identify spatial patterns (e.g. a governorate with deteriorating service quality across multiple services).

**Map layers.**
- Service performance — volume, latency, satisfaction
- Complaint density
- Inspection findings density
- Integration health (which systems are reachable in each region)

**Use in ACA.**
- A leader can drill from a region to the services, complaints, and cases within it.
- The map supports the Administrative Health Index (Chapter 2) at geographic resolution.
- Historical comparison is supported — the map can render "today vs 6 months ago".

**Acceptance (preview).** A region drill-down reveals services, complaints, and cases without losing geographic context. See Chapter 96, criterion "National Map Drill-Down".

**Dependencies.** Governorate hierarchy (Chapter 35), Administrative Health Index (Chapter 2), Risk Radar (Chapter 1).

---

### Chapter 47: National Integrity / Administrative Health Map (Section 171)

**Intent.** Provide ACA with an internal map of: service risk, control weakness, systemic issues, recommendations, reform, and performance — overlaid on the governorate hierarchy.

**Map layers (internal ACA view).**
- Service risk (Risk Radar signals)
- Control weakness (control register)
- Systemic issues (recurring patterns)
- Recommendations (open / closed)
- Reform (active programs)
- Performance (Administrative Health Index)

**Operating rules.**
- This map is **internal to ACA**; it is not the public transparency layer (Chapter 82).
- The map respects clearance; restricted layers are hidden from viewers without clearance.
- Each layer links to the underlying records.

**Acceptance (preview).** A viewer without clearance for a layer cannot discover that the layer exists. See Chapter 96, criterion "Map Layer Authorization".

**Dependencies.** National Service Map (Chapter 46), Risk Radar (Chapter 1), Administrative Health Index (Chapter 2), Reform Cockpit (Chapter 48).

---

### Chapter 48: Reform / National Strategy Cockpit (Section 172)

**Intent.** Provide a cockpit for managing national reform programs, linking strategy → program → institution → KPI → milestone → evidence → implementation → outcome.

**Cockpit model.**
- **Strategy** — high-level national direction
- **Program** — reform programs under the strategy
- **Institution** — institutions participating in each program
- **KPI** — measurable indicators per program
- **Milestone** — dated milestones
- **Evidence** — evidence supporting milestone completion
- **Implementation** — current implementation status
- **Outcome** — observed outcomes (linked back to Administrative Health Index)

**Operating rules.**
- Every milestone requires evidence to be marked complete; no milestone is "complete" without supporting evidence.
- Outcomes are tracked over time; a reform's success is measured by observed improvement, not by milestone completion alone.
- The cockpit links to the International Obligations tracker (Chapter 41) when a reform implements an international obligation.

**Acceptance (preview).** A reform marked complete has at least one supporting evidence item per milestone. See Chapter 96, criterion "Reform Evidence Discipline".

**Dependencies.** Administrative Health Index (Chapter 2), International Obligations (Chapter 41), Provenance Ledger (Chapter 71), Recommendations / Corrective Actions (Part IV).

---

### Chapter 49: Training Academy (Section 173)

**Intent.** Provide an ACA Investigation Simulator that trains investigators on synthetic cases with realistic complications, and scores investigative quality.

**Simulator features.**
- Synthetic cases with **contradictory evidence** — investigators must resolve contradictions, not ignore them.
- **Fake / misleading material** — investigators must distinguish authentic from fabricated.
- **Missing records** — investigators must detect and request missing records.
- **Alternative hypotheses** — investigators must consider multiple explanations.
- **Time anomalies** — investigators must detect timeline inconsistencies.

**Scoring dimensions.**
- Evidence coverage — did the investigator identify all relevant evidence?
- Contradiction handling — did the investigator resolve rather than ignore contradictions?
- Hypothesis discipline — did the investigator consider alternatives?
- Provenance discipline — did the investigator trace each fact to its source?
- Authorization discipline — did the investigator respect access boundaries?

**Operating rules.**
- Simulator data is fully synthetic and isolated from real case data.
- Simulator scores are training indicators, not performance metrics used for discipline.
- The Simulator feeds the Training Academy's curriculum, with weak areas surfaced for additional training.

**Acceptance (preview).** A simulator case cannot be scored as "complete" without addressing contradictions. See Chapter 96, criterion "Simulator Discipline".

**Dependencies.** AI Human-Authority Boundary (Chapter 78), Provenance Ledger (Chapter 71).

---

### Chapter 50: Administrative Red-Team (Section 174)

**Intent.** Provide a controlled testing capability for government processes, producing an **INTEGRITY ATTACK SURFACE** assessment that identifies weak controls, insider-abuse opportunities, collusion paths, document-fraud vectors, system-failure modes, overload scenarios, and authorization-bypass paths.

**Test categories.**
- Weak controls — missing approvals, missing segregation of duties
- Insider abuse opportunities — positions where a single actor could exploit a process
- Collusion paths — multi-actor combinations that could exploit a process
- Document fraud — forged / altered documents, fake verifications
- System failure — integration outages, schema changes, partial failures
- Overload — surge conditions that degrade controls
- Authorization bypass — paths to access data without proper authorization

**Output.** `INTEGRITY ATTACK SURFACE` report — a structured catalog of identified weaknesses, each with severity, evidence, and recommended mitigation.

**Operating rules.**
- Red-Team tests are conducted under explicit authorization; they never operate on production evidence.
- Findings feed the Recommendations / Corrective Actions workflow (Part IV).
- The Red-Team capability itself is audited (Chapter 69).

**Acceptance (preview).** Every identified attack-surface item links to a recommended corrective action. See Chapter 96, criterion "Red-Team Actionability".

**Dependencies.** Recommendations / Corrective Actions (Part IV), Audit Trail (Chapter 69), Training Academy (Chapter 49).

---

### Chapter 51: Governance Stress Test (Section 175)

**Intent.** Permit ACA to simulate proposed changes — policy, workflow, staffing, control, or digitization — and estimate their consequences before adoption.

**Simulated change types.**
- Policy changes (e.g. raising a threshold, changing retention)
- Workflow changes (e.g. adding an approval step, removing a step)
- Staffing changes (e.g. reducing headcount in a function)
- Control changes (e.g. relaxing a segregation-of-duties rule)
- Digitization (e.g. moving a paper process online)

**Output.** Estimated consequences across: service performance, risk exposure, control effectiveness, integrity indicators, and cost.

**Operating rules.**
- Stress Test outputs are **estimates**, not predictions. They carry confidence intervals and methodology footnotes.
- Stress Test results feed the Reform Cockpit (Chapter 48) when a change is being considered for adoption.
- Stress Tests do not modify production data; they run against the Digital Twin (Chapter 52) when available, or against a sandbox otherwise.

**Acceptance (preview).** A Stress Test result displays methodology, inputs, and confidence intervals. See Chapter 96, criterion "Stress Test Transparency".

**Dependencies.** Administrative Integrity Digital Twin (Chapter 52), Reform Cockpit (Chapter 48), Recommendations (Part IV).

---

### Chapter 52: Administrative Integrity Digital Twin (Section 176)

**Intent.** Provide a long-term strategic capability: a digital model of government structure, services, processes, controls, systems, cases, risks, reforms, and outcomes — used for simulation, what-if analysis, and longitudinal study.

**Twin model elements.**
- Government structure (Chapter 22)
- Services (Chapters 35, 46)
- Processes (workflow definitions)
- Controls (control register)
- Systems (Integration Fabric Chapter 12)
- Cases (historical, anonymized where appropriate)
- Risks (Risk Radar history)
- Reforms (Reform Cockpit history)
- Outcomes (Administrative Health Index history)

**Operating rules.**
- The Twin is a **model**, not the production system. It is fed by production data but never feeds back into production.
- The Twin's fidelity is disclosed: each model element carries a confidence indicator.
- Twin-based simulations feed Stress Tests (Chapter 51) and Reform decisions (Chapter 48).

**Privacy posture.** The Twin uses pseudonymized and aggregate data wherever possible; raw personal data is minimized.

**Acceptance (preview).** A Twin simulation carries a fidelity disclosure per element. See Chapter 96, criterion "Twin Fidelity Disclosure".

**Dependencies.** All upstream chapters provide inputs; Reform Cockpit (Chapter 48) and Stress Test (Chapter 51) consume outputs.

---

## Block H — Security of ACA Itself & Operational Resilience

### Chapter 53: Security of the ACA System Itself (Section 177)

**Intent.** Create an **ACA Security Operations / Assurance Plane** that monitors the security posture of the ACA system itself — distinct from the security of the cases ACA investigates.

**Monitored surfaces.**
- Authentication (logins, MFA, failures — see Chapters 79, 99)
- Privileged access (who has elevated privileges, when they use them)
- Evidence access (Chapter 70 — who viewed which evidence)
- Data movement (records crossing boundaries — Chapter 11)
- Integrations (Chapter 16 — connector health, Chapter 17 — schema)
- System health (uptime, latency, error rates)
- Suspicious activity (anomalous patterns)
- Certificate expiry (PKI, mTLS certs)
- Device trust (Chapter 65 — bound devices, anomalies)

**Operating rules.**
- The Security Plane is **separate** from the Audit Trail (Chapter 69) but consumes audit events; the Audit Trail is the immutable record, the Security Plane is the operational view.
- Security alerts route to the Cyber Incident Investigation Mode (Chapter 54) when they indicate an active incident.
- Security Plane access is restricted to authorized security officers.

**Anti-abuse.**
- Security officers cannot read sealed evidence from the Security Plane; they see metadata and access patterns, not content.
- Security Plane actions are themselves audited.

**Acceptance (preview).** A security alert for anomalous evidence access links to the affected evidence items (metadata only) and to the audit events. See Chapter 96, criterion "Security Plane Discipline".

**Dependencies.** Audit Trail (Chapter 69), Evidence Access Audit (Chapter 70), Cyber Incident Investigation Mode (Chapter 54), Session Security (Chapter 79).

---

### Chapter 54: Cyber Incident Investigation Mode (Section 178)

**Intent.** When ACA detects a cyber incident affecting its own systems, the incident automatically becomes an ACA investigation case — using the same investigative infrastructure, not a parallel system.

**Incident-as-case model.** A cyber incident case includes:
- Timeline — incident timeline (detection, containment, recovery)
- Systems — affected systems, integration points
- Accounts — affected accounts, privilege levels
- Devices — affected devices, trust state
- Logs — relevant log excerpts (sealed)
- Affected data — what data was exposed / altered
- Evidence — incident evidence (sealed)
- Containment — actions taken
- Recovery — restoration actions and verification

**Operating rules.**
- The case follows the standard Evidence Package (Chapter 81) and Audit Trail (Chapter 69) disciplines.
- The case is Highly Restricted; access is limited to the incident response team.
- Where the incident involves an external cooperating party (e.g. MoI cyber cooperation — Chapter 30), the International Cooperation Workspace (Chapter 39) may be invoked.

**Acceptance (preview).** A cyber incident becomes a case within minutes of detection, with full audit trail from the start. See Chapter 96, criterion "Cyber Incident Case Creation".

**Dependencies.** Security Operations Plane (Chapter 53), Evidence Package (Chapter 81), Audit Trail (Chapter 69), Two-Person Authorization (Chapter 68).

---

### Chapter 55: Disaster Recovery (Section 179)

**Intent.** Ensure that ACA's disaster recovery capability covers **all** critical assets together — not just case data, but the full set of artifacts needed to resume operations with integrity.

**Recovery scope (must cover together).**
- Case data
- Evidence
- Keys (Chapter 90)
- Audit trail
- Relationships (Evidence Graph)
- Timeline
- Provenance
- Permissions

**Operating rules.**
- Recovery is tested routinely, not just declared.
- Each recovery test verifies integrity (hashes), provenance (chain), and permissions (access model reconstructed).
- Recovery procedures are themselves audited.

**Anti-pattern rejected.** "Back up the database" alone is rejected. Without keys, audit, provenance, and permissions, restored data is unusable for evidence purposes.

**Acceptance (preview).** A recovery test verifies all eight categories and produces a recovery certificate. See Chapter 96, criterion "Recovery Coverage".

**Dependencies.** Key Management (Chapter 90), Provenance Ledger (Chapter 71), Audit Trail (Chapter 69), Evidence Recovery Drill (Chapter 56).

---

### Chapter 56: Evidence Recovery Drill (Section 180)

**Intent.** Periodically simulate loss of the primary evidence environment and verify the full recovery chain: restore → integrity verification → evidence comparison → certification.

**Drill steps.**
1. **Restore** — restore evidence from backup to a sandbox.
2. **Integrity verification** — verify hashes match the recorded hashes.
3. **Evidence comparison** — compare restored evidence against the audit trail; confirm no evidence was silently altered.
4. **Certification** — a designated authority certifies the recovery; the certificate is recorded.

**Operating rules.**
- Drills are scheduled and unscheduled.
- Drill results are audited.
- Drill failures trigger Disaster Recovery review (Chapter 55).

**Acceptance (preview).** A drill cannot be certified if any evidence item's hash differs from its recorded hash. See Chapter 96, criterion "Drill Integrity Verification".

**Dependencies.** Disaster Recovery (Chapter 55), Provenance Ledger (Chapter 71), Audit Trail (Chapter 69).

---

### Chapter 57: Surge Mode (Section 181)

**Intent.** Provide a high-volume mode for national incidents — e.g. a major event triggering a surge in complaints, evidence intake, and case creation — without weakening security.

**Surge scaling dimensions.**
- Intake — additional intake channels, automated triage
- Triage — AI-assisted triage (subject to Chapter 78 boundary)
- Clustering — group similar reports to reduce duplicate handling
- Routing — automated routing to available investigators
- Assignment — bulk assignment with audit
- Storage — surge storage capacity
- Evidence processing — parallel processing

**Operating rules.**
- **No weakening of security**. Surge Mode does not relax authentication, audit, retention, or access controls.
- Surge Mode is **activated explicitly** by an authorized ACA leader; it is not a silent default.
- Surge Mode activation and deactivation are audited.

**Anti-pattern rejected.** "Relax MFA during a surge" is rejected. Surge capacity comes from additional resources, not reduced security.

**Acceptance (preview).** A Surge Mode activation does not produce any audit events indicating weakened security controls. See Chapter 96, criterion "Surge Security Invariance".

**Dependencies.** Audit Trail (Chapter 69), Session Security (Chapter 79), Evidence Package (Chapter 81).

---

### Chapter 58: Continuity Mode (Section 182)

**Intent.** Permit secure offline field operation with later synchronization, so that field inspections and evidence collection can continue during network outages without compromising integrity.

**Continuity model.**
- A trusted field device (Chapter 65) operates offline, recording evidence locally with sealed hashes.
- When connectivity is restored, the device synchronizes with ACA.
- Synchronization verifies hashes, provenance, and audit chain before committing.
- Conflicts (e.g. a record changed on the server while offline) are surfaced, not silently resolved.

**Operating rules.**
- Offline evidence is **sealed on the device**; the seal is preserved through synchronization.
- Offline sessions are time-limited per policy; an indefinitely offline device is flagged.
- Synchronization events are audited.

**Acceptance (preview).** An offline session's evidence retains its seal after synchronization; any hash mismatch blocks synchronization. See Chapter 96, criterion "Continuity Integrity".

**Dependencies.** Device-to-Agent Binding (Chapter 65), Evidence Package (Chapter 81), Audit Trail (Chapter 69), Provenance Ledger (Chapter 71).


## Block I — Privacy, Public Boundary & Identity Protection

### Chapter 59: Privacy Architecture (Section 183)

**Intent.** Establish the privacy primitives that every other chapter in this Part depends on. Privacy is **not** an afterthought or a "transparency layer added at the end" — it is the architectural baseline.

**Privacy primitives.**
- **Purpose limitation** — every collection and use of data has a declared purpose (Chapter 10); repurposing requires a new Purpose-Bound Query.
- **Data minimization** — only the minimum data needed for the declared purpose is collected or retained.
- **Pseudonymization** — identifiers are replaced with stable tokens (Chapter 9) by default; raw identifiers are the exception.
- **Tokenization** — sensitive values are tokenized at the boundary; tokens are mapped back only via authorized processes.
- **Compartmentalization** — data classes are isolated (e.g. AMLU raw data in its own enclave — Chapter 28).
- **Protected identities** — reporters, whistleblowers, and other protected categories are stored in the Protected Vault (Chapter 60).
- **Retention policies** — every data class has an explicit retention rule (Chapter 76); no indefinite retention by default.
- **Legal holds** — legal hold overrides ordinary retention (Chapter 76).
- **Controlled disclosure** — disclosure to third parties requires explicit authorization and audit (Chapter 80).

**Anti-pattern rejected.** This Part explicitly rejects the assumption that "every government datum belongs inside Circle". Sensitive personal data — clinical, educational, communications content — is not bulk-imported (Chapter 37).

**Operational rules.**
- Privacy primitives are enforced at the Integration Fabric (Chapter 12) and the Information Boundary Matrix (Chapter 11), not at individual screens.
- Every data class has a designated privacy classification (Chapter 95) that governs storage, access, export, retention, and audit.
- Privacy reviews are required for any new data class or new integration.

**Acceptance (preview).** A new data class cannot be introduced without a privacy classification and an Information Boundary Matrix entry. See Chapter 96, criterion "Privacy Classification Required".

**Dependencies.** Purpose-Bound Query (Chapter 10), Information Boundary Matrix (Chapter 11), Pseudonymous Linkage (Chapter 9), Data Classification Matrix (Chapter 95).

---

### Chapter 60: Protected Reporter Architecture (Section 184)

**Intent.** Protect the identity of citizens and officials who report concerns to ACA, so that the act of reporting does not itself become a source of harm.

**Architecture.**
- Reporter identity is stored in a **Protected Vault**, separate from the case record.
- ACA investigators normally see a pseudonymous label `REPORTER R-XXXX` — never the underlying identity.
- The Vault is access-controlled independently of the case system; even ACA administrators do not have routine access.
- Unmasking requires **explicit policy-based authorization** and produces a full audit event.

**Unmasking conditions (illustrative).**
- A formal request from Public Prosecution with legal basis.
- A court order.
- An internal investigation into the reporter's own alleged misconduct, authorized at executive level with Two-Person Authorization (Chapter 68).

**Anti-abuse.**
- Unmasking is **never** routine. Each request is reviewed against the legal basis, the purpose, and the least-disclosure principle.
- Unmasking events are visible on the Security Operations Plane (Chapter 53) and the Audit Trail (Chapter 69).
- An unmasking without authorization triggers a security alert (Chapter 54).

**Acceptance (preview).** An ACA investigator without unmasking authorization cannot retrieve the reporter identity from the case record or from the Vault. See Chapter 96, criterion "Reporter Vault Isolation".

**Dependencies.** Two-Person Authorization (Chapter 68), Audit Trail (Chapter 69), Security Operations Plane (Chapter 53), Privacy Architecture (Chapter 59).

---

### Chapter 61: Whistleblower Retaliation Signal (Section 185)

**Intent.** Where authorized records permit it, detect possible retaliation patterns *after* a protected report — e.g. adverse personnel actions, transfers, denied permits — without ever declaring retaliation automatically.

**Detection inputs (where authorized).**
- Personnel actions affecting the reporter (transfers, dismissals, disciplinary actions)
- Service actions affecting the reporter (denied permits, denied services)
- Timing correlation between the protected report and subsequent adverse actions

**Critical discipline.**
- The Signal produces a `POSSIBLE RETALIATION PATTERN` record — an **analytical signal**, never a finding.
- A signal is reviewed by a human investigator before any action.
- The Signal never declares retaliation; it identifies a pattern that may warrant investigation.

**Anti-abuse.**
- The Signal cannot be used to auto-initiate disciplinary actions against the alleged retaliator.
- The Signal is itself protected; access is limited to authorized investigators.
- The Signal's existence is not visible to the alleged retaliator.

**Acceptance (preview).** A retaliation signal carries the disclaimer "analytical signal; human review required" and links to the underlying records. See Chapter 96, criterion "Retaliation Signal Discipline".

**Dependencies.** Protected Reporter Architecture (Chapter 60), Provenance Ledger (Chapter 71), AI Human-Authority Boundary (Chapter 78).

---

### Chapter 62: Public/ACA Data Boundary (Section 186)

**Intent.** Define, with no ambiguity, what the **public citizen interfaces** of Circle may **never** expose. This is the hard boundary between Circle-as-citizen-platform and ACA-as-sovereign-environment.

**Never-exposed list (public citizen interfaces).**
- ACA case IDs (if restricted)
- Investigator identity
- Confidential evidence
- Internal risk scores
- Internal analytics
- Protected identities
- Internal findings
- Confidential referrals
- Government-system credentials
- ACA dashboards

**Enforcement.**
- The boundary is enforced at multiple layers: API gateway, UI rendering, response shaping, and schema validation.
- The boundary is tested by Absolute Security Tests A and B (Chapter 98).
- A breach of this boundary is a critical security incident (Chapter 54).

**Anti-pattern rejected.** "We'll just hide the ACA screens from regular users" is rejected. Hiding is not enough; the boundary is enforced architecturally — ACA screens are served from a different data plane (Chapter 89), and regular Circle credentials cannot reach ACA endpoints.

**Acceptance (preview).** A regular Circle citizen cannot discover ACA UI or data via any public endpoint. See Chapter 98, Test A; Chapter 96, criterion "Public Boundary Enforcement".

**Dependencies.** Separate ACA Data Plane (Chapter 89), ACA Authentication (Part I), Security Operations Plane (Chapter 53).

---

### Chapter 63: Citizen Status Experience (Section 187)

**Intent.** Define what a citizen *does* see when they have an active matter with ACA — without exposing the confidential investigative layer.

**Visible states (per disclosure policy).**
- `RECEIVED` — the report has been received
- `UNDER REVIEW` — the matter is under review
- `ADDITIONAL INFORMATION REQUESTED` — ACA requests further input
- `REFERRED` — the matter has been referred (within ACA or to another authority; receiving authority not always disclosed)
- `RESPONSE` — a response is available
- `OUTCOME / STATUS` — final or current status, per disclosure policy

**Operating rules.**
- The existence of an internal ACA intelligence layer must not expose confidential information to the citizen.
- Statuses are surfaced only when disclosure policy permits.
- The citizen's view is served from the citizen data plane, not the ACA data plane; the ACA data plane does not expose content directly to citizens.

**Acceptance (preview).** A citizen cannot see internal ACA indicators, scores, or evidence through the citizen status interface. See Chapter 96, criterion "Citizen Status Boundary".

**Dependencies.** Public/ACA Data Boundary (Chapter 62), Separate ACA Data Plane (Chapter 89), Privacy Architecture (Chapter 59).

---

### Chapter 64: ACA Agent Profile (Section 190)

**Intent.** Define the structure of an ACA agent's profile, used internally by ACA for assignment, audit, and clearance management. This profile is **never** exposed to regular users.

**Profile fields.**
- Institutional identity (ACA-assigned)
- Department
- Role
- Clearance level
- Active assignments
- Devices (bound per Chapter 65)
- Certifications
- Permissions
- Audit history
- Session status

**Operating rules.**
- The profile is the basis for Case-Based Access (Chapter 66), Temporary Access (Chapter 67), and Two-Person Authorization (Chapter 68).
- The profile is audited; changes to clearance or permissions produce audit events.
- Profile data is held in the ACA Identity store, separate from the public Circle identity store (Part I).

**Anti-abuse.**
- A profile cannot be modified by the agent themselves; changes require authorization from a designated authority.
- Profile visibility is restricted to authorized administrative roles.
- The profile is never returned to a citizen or a regular Circle user.

**Acceptance (preview).** A regular Circle user cannot retrieve any ACA agent profile. See Chapter 96, criterion "Agent Profile Isolation".

**Dependencies.** Device-to-Agent Binding (Chapter 65), Case-Based Access (Chapter 66), Audit Trail (Chapter 69), Separate ACA Data Plane (Chapter 89).

---

### Chapter 65: Device-to-Agent Binding (Section 191)

**Intent.** Bind trusted field devices to institutional agents and assignments, so that evidence collected in the field is attributable to a specific agent on a specific device for a specific assignment.

**Binding model.**
- A device is enrolled via an authorized administrative process.
- The device is bound to an agent for a defined period or assignment.
- The device carries an attestation (hardware-rooted where supported) that is verified at each session.
- The binding is recorded in the Audit Trail.

**Operating rules.**
- Evidence collected from a device is tagged with the device ID, the agent ID, and the assignment ID.
- A device whose binding has expired cannot upload evidence; uploads are blocked at the Integration Fabric (Chapter 12).
- A device reported lost or stolen is revoked; any subsequent upload is rejected and produces a security alert (Chapter 54).

**Anti-abuse.**
- An agent cannot bind a device to themselves; binding requires administrative authorization.
- A device cannot be bound to two agents simultaneously.
- The binding attestation is verified cryptographically; spoofed devices are rejected.

**Acceptance (preview).** Evidence from an unbound or expired device is rejected at upload. See Chapter 96, criterion "Device Binding Enforcement".

**Dependencies.** ACA Agent Profile (Chapter 64), Evidence Package (Chapter 81), Audit Trail (Chapter 69), Security Operations Plane (Chapter 53).

---

### Chapter 66: Case-Based Access (Section 192)

**Intent.** Ensure an investigator sees only the cases they are authorized to see — based on assignment, department, role, clearance, and policy — not "everything their role might see".

**Authorization inputs.**
- Assignment — is the investigator assigned to the case?
- Department — does the investigator's department cover the case?
- Role — does the role (lead, supporting, reviewer) match?
- Clearance — does the clearance cover the case's data classification (Chapter 95)?
- Policy — does the Jurisdiction / Policy Engine (Chapter 75) permit the access?

**Operating rules.**
- Access is computed at request time, not cached indefinitely; changes in assignment or clearance immediately affect access.
- A denied access does not reveal the existence of the case to the unauthorized user.
- Access is logged in the Audit Trail (Chapter 69).

**Anti-abuse.**
- "Investigator sees all cases" is rejected as a default; access is per-case.
- A supervisor's broader visibility is itself scoped and audited.
- Break-glass access (Chapter 67 Temporary Access) is available for emergencies but produces a high-priority audit event.

**Acceptance (preview).** An investigator without authorization for a case cannot discover the case exists. See Chapter 98, Test C; Chapter 96, criterion "Case-Based Access Enforcement".

**Dependencies.** ACA Agent Profile (Chapter 64), Temporary Access (Chapter 67), Audit Trail (Chapter 69), Data Classification Matrix (Chapter 95).

---

### Chapter 67: Temporary Access (Section 191)

**Intent.** Permit policy-controlled access windows — e.g. an investigator is granted access to Case 118 for 48 hours, after which access expires automatically.

**Access window model.**
- A temporary access grant records: grantor, grantee, case, scope, start, end, reason.
- The grant is enforced at the Integration Fabric and at the data layer.
- The grant expires automatically; no manual revocation required (though manual revocation is possible).

**Operating rules.**
- Temporary access is audited at grant, at each use, and at expiry.
- Expiry is enforced even if the grantee is mid-session; subsequent requests return denied.
- Expiry events are visible to the Security Operations Plane (Chapter 53).

**Anti-abuse.**
- Self-grant is prohibited; grants require a separate authorized grantor.
- Grants cannot exceed policy-defined maxima (e.g. 30 days) without executive authorization.
- A grant pattern that suggests systematic workaround (e.g. repeatedly granting the same investigator to many cases) raises a security alert.

**Acceptance (preview).** A temporary access grant expires automatically at its end time, with no manual action. See Chapter 96, criterion "Temporary Access Expiry".

**Dependencies.** Case-Based Access (Chapter 66), Audit Trail (Chapter 69), Security Operations Plane (Chapter 53), ACA Agent Profile (Chapter 64).

---

### Chapter 68: Two-Person Authorization (Section 194)

**Intent.** Require dual authorization for sensitive actions where the cost of a single-actor mistake or malfeasance is high.

**Sensitive actions requiring Two-Person Authorization.**
- Protected reporter unmasking (Chapter 60)
- Sensitive evidence export (Chapter 80)
- Evidence disposition (Chapter 77)
- Major retention-policy changes (Chapter 76)
- Exceptionally sensitive case closure (Part IV)

**Authorization model.**
- Two distinct authorized identities must approve the action.
- The two approvers must be from distinct roles (no self-approval, no peer in same immediate team where policy requires separation).
- Approvals are recorded with timestamps, identities, and reason.

**Operating rules.**
- A two-person action cannot complete without both approvals.
- A pending approval expires after a policy-defined window; expired approvals require restart.
- All two-person actions are visible on the Security Operations Plane (Chapter 53).

**Anti-abuse.**
- The two approvers cannot be the same identity, even if that identity holds multiple roles.
- A pattern of always-same-approver pairs raises a security alert.
- Two-person actions produce high-priority audit events.

**Acceptance (preview).** A sensitive action cannot complete with only one authorization. See Chapter 96, criterion "Two-Person Enforcement".

**Dependencies.** ACA Agent Profile (Chapter 64), Audit Trail (Chapter 69), Security Operations Plane (Chapter 53).

---

### Chapter 69: Audit Trail (Section 195)

**Intent.** Define the canonical, immutable Audit Trail for ACA — the single source of truth for "who did what, when, on what device, for what case, with what authority". Other chapters reference this; none duplicate it.

**Audited events.**
- login
- case access
- evidence view
- evidence download
- export
- search
- assignment
- reassignment
- classification change
- AI analysis
- policy change
- privileged action
- closure
- disposition

**Trail properties.**
- **Immutable** — once written, an audit event cannot be altered; the trail is append-only.
- **Tamper-evident** — events are hash-chained; any alteration breaks the chain.
- **Cryptographically verifiable** — the trail can be independently verified.
- **Time-ordered** — events carry trusted timestamps.

**Operating rules.**
- The Audit Trail is the **only** canonical record of audited events; logs from individual subsystems feed into it but do not replace it.
- The Trail is stored in the ACA Data Plane (Chapter 89) with strong separation.
- The Trail is included in Disaster Recovery (Chapter 55) and Evidence Recovery Drills (Chapter 56).
- The Trail is **never** deleted, even when evidence is disposed of (Chapter 77 explicitly preserves the audit trail of disposed evidence).

**Acceptance (preview).** An administrator cannot rewrite or delete an audit event. See Chapter 98, Test G; Chapter 96, criterion "Audit Trail Immutability".

**Dependencies.** Provenance Ledger (Chapter 71), Evidence Access Audit (Chapter 70), Disaster Recovery (Chapter 55).

---

### Chapter 70: Evidence Access Audit (Section 196)

**Intent.** For every evidence item, record — completely and immutably — who accessed it, when, from which device, for which case, what was done, whether it was exported, and whether a derived copy was created.

**Per-evidence-item record.**

| Field | Meaning |
|---|---|
| evidence_id | The evidence item |
| viewer | The agent who accessed |
| timestamp | When |
| device | The bound device used |
| case | The case context |
| action | view / download / export / derive / seal / unseal |
| derived_copy | Reference to any derived copy created |
| export_target | Where the export went (if exported) |

**Operating rules.**
- Every evidence interaction produces an audit event; no interaction is "too small to log".
- The record is part of the canonical Audit Trail (Chapter 69).
- The record feeds the Security Operations Plane (Chapter 53) for anomaly detection.

**Anti-abuse.**
- An evidence item with an unusually broad access pattern (many viewers, many exports) raises a security alert.
- An access pattern outside the expected working hours of the case team raises an alert.
- A derived copy created without an associated export record raises an alert (the copy exists but no audit event explains it).

**Acceptance (preview).** Every evidence item has a complete access history available on demand. See Chapter 96, criterion "Evidence Access Completeness".

**Dependencies.** Audit Trail (Chapter 69), Evidence Package (Chapter 81), Security Operations Plane (Chapter 53).

---

### Chapter 71: Provenance Ledger (Section 197)

**Intent.** Provide a single canonical answer to the question **WHERE DID THIS COME FROM?** for every important fact in ACA. The Ledger is the spine that makes every other intelligence feature trustworthy.

**Ledger chain.** For every important fact:
- **source** — where the fact originated
- **record** — the canonical record holding the fact
- **ingestion** — how it entered ACA (live query, snapshot, manual intake)
- **transformation** — any transformation applied (normalization, pseudonymization)
- **linkage** — how it was linked to other facts
- **analysis** — any analytical use
- **report** — any report or finding that cited it

**Properties.**
- Append-only, hash-chained, cryptographically verifiable.
- Stored in the ACA Data Plane (Chapter 89) with the same protections as the Audit Trail.
- Referenced by every chapter that produces or consumes a fact.

**Operating rules.**
- A fact without a Provenance Ledger entry cannot be cited in a Finding (Part IV).
- A Provenance Ledger entry cannot be silently altered; corrections produce a new entry that supersedes the prior one, with both retained.
- The Ledger feeds the Data Reliability indicator (Chapter 73).

**Acceptance (preview).** Every fact presented in a Case Timeline links to its Provenance Ledger entry. See Chapter 96, criterion "Provenance Completeness".

**Dependencies.** Audit Trail (Chapter 69), Evidence Access Audit (Chapter 70), Data Conflict (Chapter 72), Data Reliability (Chapter 73).

---

### Chapter 72: Data Conflict (Section 198)

**Intent.** When two systems disagree about a fact, ACA does **not** silently choose one. It displays a `DATA CONFLICT` with both provenance paths, and requires a human determination.

**Conflict model.**
- Two records describing the same canonical fact disagree.
- The Data Quality Engine (Chapter 4) detects the conflict and produces a `DATA CONFLICT` event.
- The conflict is surfaced on the relevant Case Timeline and Entity Scorecard.
- Both provenance paths are retained.

**Resolution.**
- A conflict is **not** resolved by picking the "more recent" record; both remain until a human determines which is correct (or whether both are partially correct).
- Resolution requires an authorized investigator and produces a `CONFLICT RESOLUTION` event in the Audit Trail.
- The original conflict is retained even after resolution, for historical integrity.

**Anti-abuse.**
- Conflicts cannot be silently suppressed.
- A pattern of frequent conflicts for a particular source triggers a source-quality review (Chapter 16).
- Conflicts involving sealed evidence require Two-Person Authorization (Chapter 68) for resolution.

**Acceptance (preview).** A conflict cannot be resolved by silently picking one source; both paths remain visible. See Chapter 96, criterion "Conflict Non-Suppression".

**Dependencies.** Data Quality Engine (Chapter 4), Provenance Ledger (Chapter 71), Audit Trail (Chapter 69), Two-Person Authorization (Chapter 68).

---

### Chapter 73: Data Reliability (Section 199)

**Intent.** Display, for every external data point, a reliability assessment composed of: source freshness, completeness, consistency, provenance, and availability.

**Reliability dimensions.**

| Dimension | What it measures | Source |
|---|---|---|
| Source freshness | How recent is the source confirmation? | Chapter 5 `LAST VERIFIED` |
| Completeness | Are all mandatory fields present? | Data Quality Engine (Chapter 4) |
| Consistency | Does the record agree with other sources? | Data Conflict (Chapter 72) |
| Provenance | Is the full Provenance chain present? | Provenance Ledger (Chapter 71) |
| Availability | Is the source currently reachable? | Integration Health (Chapter 16) |

**Display.** Every external record carries a reliability badge summarizing these dimensions, in addition to the freshness badge (Chapter 5).

**Use in ACA.**
- Findings (Part IV) cannot rely solely on a record with low reliability; they require corroboration.
- The Administrative Health Index (Chapter 2) uses reliability as one of its dimensions.
- The Risk Radar (Chapter 1) raises a signal when reliability drops across a class of records.

**Acceptance (preview).** A record used in a Finding carries a visible reliability assessment. See Chapter 96, criterion "Reliability Visibility in Findings".

**Dependencies.** Data Freshness (Chapter 5), Data Quality Engine (Chapter 4), Data Conflict (Chapter 72), Provenance Ledger (Chapter 71), Integration Health (Chapter 16).

---

## Block J — Compliance, Legal Configuration & Evidence Disposition

### Chapter 74: Compliance / Assurance Layer (Section 200)

**Intent.** Architect ACA so it can map its controls to recognized international references — without falsely claiming certification.

**Reference frameworks (mapping targets).**
- ISO/IEC 27001 — information security management
- ISO/IEC 42001 — AI management systems
- NIST Zero Trust — zero-trust architecture
- NIST AI Risk Management Framework — AI risk management
- Applicable digital-evidence / provenance standards

**Mapping approach.**
- ACA maintains a **control-to-framework mapping** as a versioned configuration artifact.
- Each control lists the framework(s) it supports, the mapping rationale, and the evidence (audit events, configuration) that demonstrates the control's operation.
- The mapping is reviewed periodically.

**Critical discipline.** ACA does **not** claim certification unless certification has actually been obtained by an accredited body. The mapping is an internal assurance tool, not a certification claim.

**Anti-pattern rejected.** "ISO 27001 certified" stickers in the UI without an actual certificate are rejected. Where certification exists, it is displayed with the certificate reference; where it does not, the UI states "control mapping available; certification status: not certified".

**Acceptance (preview).** The Compliance UI displays the actual certification status per framework, with certificate references where applicable. See Chapter 96, criterion "Certification Honesty".

**Dependencies.** Audit Trail (Chapter 69), Provenance Ledger (Chapter 71), Egyptian Legal / Regulatory Configuration (Chapter 75).

---

### Chapter 75: Egyptian Legal / Regulatory Configuration (Section 201)

**Intent.** Replace hardcoded legal claims with a configurable **JURISDICTION / POLICY ENGINE** that captures effective dates, legal basis, retention, disclosure, access, evidence rules, and authorization rules.

**Discipline.** Per Section 201, this Part does **not** hardcode claims such as "legally admissible", "fully compliant", or "authorized" unless formally verified. Instead, each such claim is the *output* of a policy rule, not a constant.

**Engine configuration.**

| Configuration element | Meaning |
|---|---|
| effective dates | When a rule is in force |
| legal basis | The law / regulation / authority underpinning the rule |
| retention | How long each data class is retained |
| disclosure | To whom, under what conditions, data may be disclosed |
| access | Who may access each data class |
| evidence rules | What makes evidence admissible / usable |
| authorization rules | Who may authorize sensitive actions |

**Operating rules.**
- Every sensitive action (export, unmask, disposition, referral) checks the Engine for the current applicable rule.
- Rules are versioned; historical actions are evaluated against the rule in force at the time.
- Changes to rules are themselves audited (Chapter 69) and may require Two-Person Authorization (Chapter 68).

**Anti-abuse.**
- A rule that contradicts a higher-priority rule (e.g. a jurisdiction law overriding an internal policy) is detected and flagged.
- The Engine cannot be silently modified; changes are reviewable.

**Acceptance (preview).** A claim of "legally admissible" is accompanied by the rule and legal basis that produce the claim. See Chapter 96, criterion "Legal Claim Traceability".

**Dependencies.** Compliance / Assurance Layer (Chapter 74), Retention / Legal Hold (Chapter 76), Audit Trail (Chapter 69).

---

### Chapter 76: Retention / Legal Hold (Section 202)

**Intent.** Differentiate retention policies across data classes and ensure that legal hold overrides ordinary retention.

**Data classes (differentiated).**
- Citizen content — public-side content submitted by citizens
- ACA institutional evidence — operational evidence
- Sealed evidence — formally sealed evidence
- Protected identity — reporter / whistleblower identities
- Ordinary operational data — logs, configurations, etc.

**Retention rules.**
- Each class has an explicit retention rule defined in the Jurisdiction / Policy Engine (Chapter 75).
- Official sealed evidence is subject to policy-governed retention / disposition and has **no normal delete mechanism**.
- Retention enforcement is automatic; no human can extend retention beyond policy without a Legal Hold event.

**Legal hold.**
- A legal hold overrides ordinary retention; data under legal hold is not deleted even if its retention period has expired.
- Legal holds are themselves audited and require authorization.
- A legal hold can be lifted only by an authorized action, also audited.

**Acceptance (preview).** Sealed evidence cannot be deleted through any normal mechanism; legal-hold data is preserved beyond retention. See Chapter 96, criterion "Retention Enforcement".

**Dependencies.** Jurisdiction / Policy Engine (Chapter 75), ACA Evidence Disposition (Chapter 77), Audit Trail (Chapter 69).

---

### Chapter 77: ACA Evidence Disposition (Section 203)

**Intent.** Define how evidence is disposed of when its retention period expires — through a policy-based, authorized, multi-party, fully audited, cryptographically traceable, non-silent process.

**Disposition properties.**
- **Policy-based** — disposition follows the retention rule (Chapter 76).
- **Authorized** — requires authorization per the Jurisdiction / Policy Engine (Chapter 75).
- **Multi-party where required** — Two-Person Authorization (Chapter 68) for sealed or sensitive evidence.
- **Fully audited** — every step recorded in the Audit Trail (Chapter 69).
- **Cryptographically traceable** — the disposition record is hash-chained and verifiable.
- **Non-silent** — disposition produces a visible record; no evidence disappears without explanation.

**Critical rule.** Disposition destroys the evidence **content** but **preserves the audit trail** documenting the evidence's history. The audit trail is never destroyed as part of disposition.

**Acceptance (preview).** A disposed evidence item retains its audit trail; the disposition is verifiable through the cryptographic chain. See Chapter 96, criterion "Disposition Traceability".

**Dependencies.** Retention / Legal Hold (Chapter 76), Two-Person Authorization (Chapter 68), Audit Trail (Chapter 69), Provenance Ledger (Chapter 71).

---

### Chapter 78: AI Human-Authority Boundary (Section 204)

**Intent.** Explicitly encode what AI can do and what AI cannot do independently — so the platform is unambiguous about the boundary between machine assistance and human authority.

**AI can.**
- detect
- connect
- correlate
- classify
- summarize
- prioritize
- simulate
- recommend
- warn

**AI cannot independently (without required human authorization).**
- declare guilt
- impose discipline
- issue authoritative findings
- prosecute
- unmask protected identities
- destroy evidence
- close sensitive investigations

**Enforcement.**
- Every AI action carries a tag indicating whether it is "assisting" or "determinative".
- Determinative actions are blocked at the Integration Fabric unless accompanied by a human authorization record.
- The boundary is enforced at the API level, not only at the UI level.

**Anti-pattern rejected.** "AI proves guilt" and "AI determines corruption" are rejected as a matter of architecture (Section 237). AI produces **investigative indicators**; humans produce **findings**.

**Acceptance (preview).** An AI-drafted finding cannot be published without a human authorization event. See Chapter 98, Test I; Chapter 96, criterion "AI Authority Boundary".

**Dependencies.** Audit Trail (Chapter 69), Two-Person Authorization (Chapter 68), Jurisdiction / Policy Engine (Chapter 75).

---

### Chapter 79: Session Security (Section 223)

**Intent.** Define session security for ACA — short privileged sessions, re-authentication for critical actions, device binding, session invalidation, concurrent-session awareness, and security alerts.

**Session rules.**
- **Short privileged sessions** — sessions expire after a policy-defined idle and absolute timeout.
- **Re-authentication for critical actions** — sensitive actions require fresh authentication (e.g. re-entering credentials or MFA) even within an active session.
- **Device binding** — sessions are bound to the enrolled device (Chapter 65); a session cannot move to a different device mid-flight.
- **Session invalidation** — administrators can invalidate sessions; invalidation is immediate.
- **Concurrent-session awareness** — multiple concurrent sessions for the same agent are tracked and limited by policy.
- **Security alerts** — anomalous session patterns (e.g. impossible travel, sudden privilege escalation) produce alerts.

**Acceptance (preview).** A critical action cannot complete without fresh authentication, even mid-session. See Chapter 96, criterion "Session Re-Authentication".

**Dependencies.** ACA Agent Profile (Chapter 64), Device-to-Agent Binding (Chapter 65), Security Operations Plane (Chapter 53), Login Failure / Lockout (Chapter 99).

---

### Chapter 80: Export Security (Section 224)

**Intent.** Ensure every sensitive export from ACA is authorized, manifested, recorded, and auditable.

**Export properties.**
- **Authorization required** — every export requires authorization, per the Information Boundary Matrix (Chapter 11) and the Jurisdiction / Policy Engine (Chapter 75).
- **Manifest generated** — every export includes a manifest listing the contents, hashes, and provenance.
- **Recipient recorded** — the recipient identity is recorded.
- **Purpose recorded** — the export purpose is recorded.
- **Time recorded** — the export timestamp is recorded.
- **Case recorded** — the case anchor is recorded.
- **Integrity information recorded** — hashes and chain of custody are part of the manifest.
- **Auditable** — the export event is in the Audit Trail (Chapter 69).

**Critical actions requiring Two-Person Authorization (Chapter 68).**
- Sensitive evidence export
- Export of sealed evidence
- Export of protected identity data (rare; only with explicit authorization)

**Acceptance (preview).** An export without a manifest or recipient record is blocked. See Chapter 96, criterion "Export Manifest Required".

**Dependencies.** Two-Person Authorization (Chapter 68), Audit Trail (Chapter 69), Evidence Package (Chapter 81), Information Boundary Matrix (Chapter 11).

---

### Chapter 81: Evidence Package (Section 225)

**Intent.** Define the canonical **Evidence Package** structure — the sealed, exportable, verifiable bundle that ACA produces for any referral, export, or court-facing disclosure.

**Package structure.**
- Case identifier
- Evidence Manifest (list of included evidence items with hashes)
- Original References (pointers to source records, not duplicates)
- Derived Evidence (with derivation provenance)
- Hashes (per-item and package-level)
- Provenance (full Provenance Ledger chain)
- Chain of Custody (every transfer event)
- Timeline (sealed)
- Rules (the rules applied to the case)
- Findings (authorized subset, human-determined)
- Audit Trail (the relevant slice)

**Properties.**
- Cryptographically sealed; any alteration breaks the seal.
- Verifiable independently of ACA's internal systems.
- Time-stamped; the package records the moment of generation.

**Acceptance (preview).** An Evidence Package's seal cannot be broken without producing a new package with a new seal; the original is preserved. See Chapter 96, criterion "Evidence Package Integrity".

**Dependencies.** Provenance Ledger (Chapter 71), Audit Trail (Chapter 69), Evidence Access Audit (Chapter 70), Export Security (Chapter 80).

---

### Chapter 82: Public Transparency (Section 226)

**Intent.** Provide a separate, controlled public-reporting layer where ACA may publish aggregate information where authorized — without ever revealing restricted content.

**Never-reveal list (public transparency layer).**
- Sealed cases
- Protected identity
- Restricted evidence
- Internal intelligence
- Investigator details
- Confidential referrals

(unless explicitly approved per Chapter 75 rules)

**Operating rules.**
- The public transparency layer is **separate** from the ACA data plane (Chapter 89); it reads from a curated, authorized aggregate store.
- Publication requires authorization; aggregates are reviewed before release to prevent re-identification.
- The layer publishes only what is approved; it does not expose ACA's internal query capabilities.

**Anti-abuse.**
- Aggregate statistics undergo small-cell suppression (Chapter 8) to prevent re-identification.
- Publication events are audited.

**Acceptance (preview).** The public transparency layer cannot be coerced into revealing individual case data. See Chapter 96, criterion "Transparency Layer Isolation".

**Dependencies.** Clean Room (Chapter 8), Public/ACA Data Boundary (Chapter 62), Privacy Architecture (Chapter 59), Audit Trail (Chapter 69).

---

### Chapter 83: Public Outcome Communication (Section 227)

**Intent.** Where policy allows, provide citizens with understandable outcome information — without exposing confidential investigative details.

**Operating rules.**
- Outcome communications are written in plain language.
- Communications do not include investigator identity, internal findings, evidence details, or protected identities.
- Communications are reviewed before release.
- Communications are delivered through the citizen status experience (Chapter 63).

**Acceptance (preview).** An outcome communication does not contain internal ACA terminology or evidence references. See Chapter 96, criterion "Outcome Communication Clarity".

**Dependencies.** Citizen Status Experience (Chapter 63), Public/ACA Data Boundary (Chapter 62), Jurisdiction / Policy Engine (Chapter 75).

---

### Chapter 84: Positive Governance (Section 228)

**Intent.** Preserve Circle's capability to protect honest officials and recognize good service. ACA is **not** a purely punitive analytics system.

**Positive-governance features.**
- Recognition of officials and offices with consistently strong Administrative Health Index (Chapter 2) scores.
- Identification of reforms that produced measurable improvements.
- Documentation of good practices observed during inspections.
- Protection of honest officials from unsupported allegations (Chapter 85).

**Anti-pattern rejected.** A purely punitive system creates perverse incentives (officials hide problems to avoid penalty). ACA explicitly supports identifying and recognizing good performance.

**Acceptance (preview).** The Administrative Health Index includes positive indicators, not only risk indicators. See Chapter 96, criterion "Positive Governance Balance".

**Dependencies.** Administrative Health Index (Chapter 2), False-Accusation Analysis (Chapter 85), Reform Cockpit (Chapter 48).

---

### Chapter 85: False-Accusation Analysis (Section 189, 229)

**Intent.** Detect patterns of repeated unsupported allegations, where appropriate — without ever automatically classifying a citizen as malicious.

**Detection inputs.**
- Repeated allegations from the same source
- Allegations that have been investigated and found unsupported
- Patterns of allegations targeting the same officials

**Critical discipline.**
- The analysis produces an **analytical signal** — `REPEATED UNSUPPORTED ALLEGATIONS` — never a determination of malice.
- A signal is reviewed by a human investigator before any action.
- The Signal is **never** used to automatically dismiss future reports from the same source; each report is evaluated on its merits.

**Anti-abuse.**
- The Signal cannot be used to retaliate against reporters (Chapter 61 retaliation protection applies symmetrically).
- The Signal is itself protected; access is limited.

**Acceptance (preview).** A false-accusation signal carries the disclaimer "analytical signal; human review required" and does not auto-suppress future reports. See Chapter 96, criterion "False-Accusation Discipline".

**Dependencies.** Protected Reporter Architecture (Chapter 60), AI Human-Authority Boundary (Chapter 78), Audit Trail (Chapter 69).

---

### Chapter 86: Whistleblower / Retaliation Architecture (Section 230)

**Intent.** Maintain protected reporting and institutional retaliation monitoring with strict confidentiality — combining the primitives from Chapters 60 and 61 into a coherent architecture.

**Architecture components.**
- Protected Vault (Chapter 60) — holds reporter identity
- Pseudonymous reporter label `REPORTER R-XXXX` — what investigators see
- Retaliation Signal (Chapter 61) — detects possible retaliation patterns
- Two-Person Authorization (Chapter 68) — for any unmasking or sensitive access
- Audit Trail (Chapter 69) — full record of all accesses and actions

**Operating rules.**
- The architecture is symmetric: it protects the reporter and also protects the accused from unsupported allegations (Chapter 85).
- All accesses are audited; patterns are monitored by the Security Operations Plane (Chapter 53).
- Whistleblower protection extends across the lifetime of the reporter's interaction with ACA, not only the initial report.

**Acceptance (preview).** A whistleblower's identity cannot be discovered by an ACA investigator without an explicit unmasking event. See Chapter 96, criterion "Whistleblower Architecture Integrity".

**Dependencies.** Protected Reporter Architecture (Chapter 60), Whistleblower Retaliation Signal (Chapter 61), Two-Person Authorization (Chapter 68), Security Operations Plane (Chapter 53).

---

### Chapter 87: International Language Support (Section 231)

**Intent.** Preserve language integrity across translations — never delete the original language.

**Per-translation record.**
- Arabic original — the canonical original (the working language of ACA)
- Translation — the translated text
- Translator / model — who or what produced the translation
- Version — translation version (translations are updated; versions retained)
- Timestamp — when the translation was produced
- Verification — whether a human reviewer verified the translation

**Operating rules.**
- The original language is **never deleted**, even when a translation is produced.
- Translations are versioned; older versions are retained for audit.
- Translations used in international cooperation (Chapter 39) carry the translator/model and verification status.

**Anti-abuse.**
- A translation cannot replace the original in the audit trail; the original is always retrievable.
- Machine translations are marked as such; they are not presented as human translations.

**Acceptance (preview).** A translated document retains its Arabic original alongside the translation. See Chapter 96, criterion "Original Language Preservation".

**Dependencies.** International Cooperation (Chapter 39), Provenance Ledger (Chapter 71), Audit Trail (Chapter 69).

---

## Block K — Deployment, Sovereign Infrastructure & Key Management

### Chapter 88: Deployment Options (Section 211)

**Intent.** Define the deployment options for ACA as a sovereign environment, with explicit acknowledgment that public cloud is **not** acceptable for every category of ACA data.

**Supported deployment options.**
- **Government datacenter** — ACA-owned infrastructure in a government facility.
- **Government private cloud** — sovereign cloud operated for the government.
- **Sovereign / private Kubernetes** — container orchestration on sovereign infrastructure.
- **Isolated institutional infrastructure** — dedicated infrastructure for ACA.
- **Highly controlled hybrid architecture** — where approved, a hybrid of the above with strict data-plane separation.

**Critical discipline.** This Part does **not** assume public cloud is acceptable for every category of ACA data. Sealed evidence, protected identities, AMLU/Illicit Gains data, and keys are deployed on sovereign infrastructure, not public cloud, unless an explicit, reviewed authorization permits otherwise.

**Anti-pattern rejected.** "Just put it all on a public cloud" is rejected. The decision for each data class is deliberate, documented, and reviewed.

**Acceptance (preview).** Each data class has a designated deployment target in the Data Classification Matrix (Chapter 95). See Chapter 96, criterion "Deployment Classification Alignment".

**Dependencies.** Separate ACA Data Plane (Chapter 89), Key Management (Chapter 90), Data Classification Matrix (Chapter 95).

---

### Chapter 89: Separate ACA Data Plane (Section 212)

**Intent.** Define ACA-specific data plane components — databases, evidence storage, keys, audit, identity, integrations — with strong logical and physical separation from the public Circle data plane.

**Data plane components.**
- **Databases** — ACA case, evidence, intelligence stores, separate from public Circle stores.
- **Evidence storage** — sealed evidence in dedicated storage.
- **Keys** — see Chapter 90.
- **Audit** — the Audit Trail (Chapter 69) in dedicated storage.
- **Identity** — ACA agent identities (Chapter 64), separate from public Circle identities.
- **Integrations** — the Integration Fabric (Chapter 12) operated within the ACA data plane.

**Separation rules.**
- Logical separation at minimum; physical separation where the data class requires it.
- No shared credentials, no shared secrets, no shared keys between planes.
- Cross-plane data movement is governed by the Information Boundary Matrix (Chapter 11) and produces audit events.

**Anti-abuse.**
- A regular Circle service cannot reach the ACA data plane; the boundary is enforced at the network and identity layers.
- A compromise of the public Circle plane does not automatically compromise the ACA plane.

**Acceptance (preview).** A regular Circle service account cannot read from the ACA data plane. See Chapter 98, Test B; Chapter 96, criterion "Data Plane Separation".

**Dependencies.** Deployment Options (Chapter 88), Key Management (Chapter 90), Secret Management (Chapter 91), Public/ACA Data Boundary (Chapter 62).

---

### Chapter 90: Key Management (Section 213)

**Intent.** Define key management for sensitive evidence and institutional secrets — HSM where appropriate, rotation, separation, access control, backup, recovery, and independent authorization.

**Key properties.**
- **HSM where appropriate** — sensitive evidence and institutional secrets use Hardware Security Modules.
- **Key rotation** — keys are rotated per policy; rotation is audited.
- **Key separation** — distinct keys for distinct purposes (evidence sealing, audit, integration, identity).
- **Access control** — key access is restricted to authorized identities; key use is audited.
- **Backup** — keys are backed up per a key-recovery policy.
- **Recovery** — key recovery requires multiple authorizations (Two-Person, Chapter 68).
- **Independent authorization** — key administration is independent of system administration where feasible.

**Anti-abuse.**
- A single administrator cannot use a key without authorization; key use is gated.
- Key revocation is auditable and immediate where supported.
- Key compromise triggers a security incident (Chapter 54).

**Acceptance (preview).** Evidence-sealing keys cannot be used by a single administrator without an authorization event. See Chapter 96, criterion "Key Authorization Gate".

**Dependencies.** Separate ACA Data Plane (Chapter 89), Two-Person Authorization (Chapter 68), Audit Trail (Chapter 69), Disaster Recovery (Chapter 55).

---

### Chapter 91: Secret Management (Section 214)

**Intent.** Define secret management for ACA — credentials, API keys, certificates — and explicitly forbid their placement in source code, mobile applications, public configuration, or blueprint examples.

**Forbidden locations.**
- Source code (no hardcoded credentials)
- Mobile application (no embedded credentials)
- Public configuration (no secrets in version-controlled config)
- Blueprint examples (use placeholders only)

**Required approach.**
- **Secret management** — a designated secret manager (e.g. HSM-backed vault) holds all secrets.
- **Environment-specific configuration** — secrets are bound to environments, not to code.
- **Audit of existing blueprint** — this Part audited Parts I–IV for any exposed credentials; placeholders and secret-manager references are used instead.

**Operating rules.**
- Secrets are never logged; logging configurations redact secret values.
- Secret rotation is policy-driven.
- Secret access is audited.

**Anti-abuse.**
- A blueprint example containing a real credential is a defect and must be replaced with a placeholder.
- A connector that requires a hardcoded credential is rejected; it must use the secret manager.

**Acceptance (preview).** A search of the blueprint examples yields no real credentials. See Chapter 96, criterion "No Hardcoded Secrets".

**Dependencies.** Key Management (Chapter 90), Audit Trail (Chapter 69), Integration Fabric (Chapter 12).

---

### Chapter 92: Security Error-Check (Section 215)

**Intent.** Explicitly search for and correct the security weaknesses enumerated in Section 215, as a continuous discipline rather than a one-time review.

**Searched-for issues.**
- Contradictory permissions
- Insecure defaults
- Public exposure
- Incorrect retention
- Accidental citizen visibility
- Privilege escalation paths
- Unrestricted AI access
- Evidence deletion paths
- Weak device binding
- Missing audit events
- Insecure integration assumptions
- Unsupported legal claims
- Unrealistic API assumptions
- Duplicated requirements
- Conflicting policies

**Corrective discipline.**
- Each identified issue is tracked to closure.
- Corrections are themselves audited.
- Recurring issues feed the Red-Team (Chapter 50) and Training Academy (Chapter 49).

**Outputs.**
- A `SECURITY ISSUE` record per finding, with severity and remediation.
- Aggregated metrics on the Security Operations Plane (Chapter 53).

**Acceptance (preview).** A search for "evidence deletion path" yields no normal-delete mechanism for sealed evidence. See Chapter 96, criterion "Security Error-Check Discipline".

**Dependencies.** Security Operations Plane (Chapter 53), Audit Trail (Chapter 69), Red-Team (Chapter 50), Training Academy (Chapter 49).


## Block L — Final Audit Matrices

> This block closes Part V with the four mandatory matrices required by Sections 217, 218, 219, and 232, the end-to-end test scenarios from Section 233, the absolute security tests from Section 234, the login failure discipline from Section 222, and the final gap / duplication / conflict audit required by Section 240. The matrices are the authoritative reconciliation artifacts; any conflict between a matrix and a narrative chapter in this Part is resolved in favor of the matrix.

### Chapter 93: Requirements Traceability Matrix (Section 217)

**Intent.** Provide the authoritative mapping from every requirement in the ACA prompt to its implementation location in the blueprint, the dependency chain, the security requirement, the data classification, the human authorization, the acceptance test, and the current status. Every requirement from the prompt maps to a blueprint section.

**Columns.** Requirement | Source | Module | Implementation | Dependency | Security Requirement | Data Classification | Human Authorization | Acceptance Test | Status

> Status values used below: `Covered` (canonical definition present, dependencies declared, acceptance test defined); `Partial` (definition present, dependency or test in progress); `Planned` (intent stated, implementation scheduled). The target for all rows at Part V release is `Covered` or `Partial`; rows marked `Planned` are explicitly flagged for follow-up.

| Requirement | Source | Module | Implementation | Dependency | Security Requirement | Data Classification | Human Authorization | Acceptance Test | Status |
|---|---|---|---|---|---|---|---|---|---|
| National Administrative Early Warning | §121 | Risk Radar | Part V Ch.1 | Provenance Ledger (Ch.71) | Audit on signal creation | Restricted | Leadership reviewer | "National Early Warning" (Ch.96) | Covered |
| Administrative Health Index | §122 | Health Index | Part V Ch.2 | Data Reliability (Ch.73) | Methodology disclosure | ACA Internal | None (analytical) | "Index Methodology" (Ch.96) | Covered |
| Entity / Office Scorecards | §123 | Entity Scorecards | Part V Ch.3 | Entity Resolution (Part III) | Clearance-gated sections | ACA Internal / Restricted | Investigator | "Scorecard Authorization" (Ch.96) | Covered |
| Government Data Quality Engine | §128 | Data Quality Engine | Part V Ch.4 | System-of-Record (Ch.6) | Non-destructive | ACA Internal | None (analytical) | "Data Quality Non-Destructive" (Ch.96) | Covered |
| Data Freshness (LAST VERIFIED) | §129 | Freshness | Part V Ch.5 | Integration Health (Ch.16) | Visible on all records | ACA Internal | None | "Freshness Visibility" (Ch.96) | Covered |
| System-of-Record Registry | §130 | SoR Registry | Part V Ch.6 | Zero-Copy Federation (Ch.7) | Source-of-truth tagging | ACA Internal | None | "Source-of-Record Traceability" (Ch.96) | Covered |
| Zero-Copy Federation | §131 | Federation | Part V Ch.7 | Purpose-Bound Query (Ch.10) | No bulk duplication | ACA Internal | Investigator | "Federation Mode Visible" (Ch.96) | Covered |
| Secure Data Clean Room | §132 | Clean Room | Part V Ch.8 | Pseudonymous Linkage (Ch.9) | Aggregate-only outputs | Highly Restricted | Two-Person (Ch.68) | "Clean Room Output Boundary" (Ch.96) | Covered |
| Pseudonymous Linkage | §133 | Linkage | Part V Ch.9 | Protected Reporter (Ch.60) | Token-based matching | Restricted / Protected Identity | Investigator | "Pseudonymous Matching" (Ch.96) | Covered |
| Purpose-Bound Query | §134 | PBQ | Part V Ch.10 | Information Boundary (Ch.11) | Full audit per query | Restricted | Investigator | "Purpose-Bound Provenance" (Ch.96) | Covered |
| Information Boundary Matrix | §135 | IBM | Part V Ch.11 | Jurisdiction / Policy Engine (Ch.75) | Enforced at gateway | Highly Restricted | Policy administrator | "Information Boundary Enforcement" (Ch.96) | Covered |
| Government Integration Fabric | §136 | Integration Fabric | Part V Ch.12 | Protocol Support (Ch.13) | Single audit point | ACA Internal | Integration engineer | "Single Integration Surface" (Ch.96) | Covered |
| Protocol Support | §137 | Protocols | Part V Ch.13 | Integration Fabric (Ch.12) | Per-protocol security envelope | ACA Internal | Integration engineer | "Protocol Failure Visibility" (Ch.96) | Covered |
| Government Event Bus | §138 | Event Bus | Part V Ch.14 | Schema Sentinel (Ch.17) | Per-event signature | ACA Internal | None (ingest) | "Event-to-Case Latency" (Ch.96) | Covered |
| Event-to-Evidence Auto-Link | §139 | Auto-Link | Part V Ch.15 | Event Bus (Ch.14) | No sealed-evidence mutation | ACA Internal | Investigator confirm | "Auto-Link Accuracy" (Ch.96) | Covered |
| Integration Health Control Tower | §140 | Health Tower | Part V Ch.16 | Schema Sentinel (Ch.17) | Read-only for analysts | ACA Internal | Security officer actions | "Integration Health Visibility" (Ch.96) | Covered |
| Schema Change Sentinel | §141 | Schema Sentinel | Part V Ch.17 | Integration Fabric (Ch.12) | Fail-safe on change | ACA Internal | Integration engineer | Test J (Ch.98) | Covered |
| Missing-System Map | §142 | Missing Map | Part V Ch.18 | Health Tower (Ch.16) | Authority source | ACA Internal | None | "Missing-System Map Authority" (Ch.96) | Covered |
| Automated Integration Discovery | §143 | Discovery | Part V Ch.19 | Missing Map (Ch.18) | Tracked per gap | ACA Internal | Investigator | "Gap Tracking" (Ch.96) | Covered |
| Egypt-Specific Integration Roadmap | §144 | Roadmap | Part V Ch.20 | Information Boundary (Ch.11) | No unverified claims | ACA Internal | Government liaison | "Roadmap Status Discipline" (Ch.96) | Covered |
| ACA Internal Integrations | §145 | Internal Integrations | Part V Ch.21 | Fabric (Ch.12) | Internal parity | ACA Internal | ACA administration | "Internal Integration Parity" (Ch.96) | Covered |
| CAOA / Organization Data | §146 | CAOA | Part V Ch.22 | SoR Registry (Ch.6) | Historical as-of | Restricted | Investigator | "Historical Organization State" (Ch.96) | Covered |
| Ministry of Finance / Public Funds | §147 | MoF | Part V Ch.23 | Clean Room (Ch.8) | Per-case sealed evidence | Highly Restricted | Senior investigator | "Financial Evidence Sealing" (Ch.96) | Covered |
| Procurement | §148 | Procurement | Part V Ch.24 | Evidence Graph (Part III) | Anomaly provenance | Restricted | Investigator | "Procurement Anomaly Provenance" (Ch.96) | Covered |
| ETA | §149 | ETA | Part V Ch.25 | Purpose-Bound Query (Ch.10) | Per-document verification | Restricted | Investigator | "Tax Document Verification" (Ch.96) | Covered |
| GAFI | §150 | GAFI | Part V Ch.26 | Entity Resolution (Part III) | As-of corporate structure | Restricted | Investigator | "Corporate Structure As-Of" (Ch.96) | Covered |
| FRA | §151 | FRA | Part V Ch.27 | Evidence Package (Ch.81) | Action provenance | Restricted | Investigator | "Regulatory Action Provenance" (Ch.96) | Covered |
| AMLU | §152 | AMLU | Part V Ch.28 | Clean Room (Ch.8) | Compartmentalized | Highly Restricted | AMLU clearance + Two-Person | "AMLU Compartmentalization" (Ch.96) | Covered |
| Illicit Gains | §153 | Illicit Gains | Part V Ch.29 | Evidence Package (Ch.81) | Isolated workflow | Highly Restricted | IG clearance + Two-Person | "Illicit Gains Isolation" (Ch.96) | Covered |
| Ministry of Interior / Public Funds | §154 | MoI | Part V Ch.30 | Cyber Incident Mode (Ch.54) | Identity verification boundary | Highly Restricted | Senior investigator | "Identity Verification Boundary" (Ch.96) | Covered |
| Administrative Prosecution Bridge | §155 | Adm. Prosecution | Part V Ch.31 | Evidence Package (Ch.81) | Sealed package transfer | Restricted | Investigator | "Referral Bridge Integrity" (Ch.96) | Covered |
| Public Prosecution Bridge | §156 | Public Prosecution | Part V Ch.32 | Evidence Package (Ch.81) | Outbound-only; Two-Person | Highly Restricted | Investigator + Two-Person | "Public Prosecution Referral Integrity" (Ch.96) | Covered |
| Court / Judicial Bridge | §157 | Judicial | Part V Ch.33 | Public Prosecution Bridge (Ch.32) | Read-only references | Restricted | Investigator | "Judicial Bridge Discipline" (Ch.96) | Covered |
| NAFEZA / Customs | §158 | NAFEZA | Part V Ch.34 | Purpose-Bound Query (Ch.10) | Per-case sealed | Restricted | Investigator | "Customs Record Provenance" (Ch.96) | Covered |
| Governorate / Local Administration | §159 | Local Admin | Part V Ch.35 | National Map (Ch.46) | Historical boundaries | ACA Internal | None | "Historical Administrative Geography" (Ch.96) | Covered |
| Land / Property | §160 | Land | Part V Ch.36 | Pseudonymous Linkage (Ch.9) | Owner pseudonymized | Restricted | Investigator + unmask | "Property Owner Pseudonymization" (Ch.96) | Covered |
| Health / Education / Utilities / Transport | §161 | Sectors | Part V Ch.37 | Clean Room (Ch.8) | Aggregate by default | Restricted / Highly Restricted | Investigator | "Sector Data Minimization" (Ch.96) | Covered |
| Consumer Protection / NTRA | §162 | Smart Referral | Part V Ch.38 | AI Boundary (Ch.78) | Routing provenance | ACA Internal | Investigator | "Smart Referral Provenance" (Ch.96) | Covered |
| International Cooperation | §163 | Intl. Coop | Part V Ch.39 | Evidence Package (Ch.81) | Translation provenance | Highly Restricted | Two-Person | "International Cooperation Discipline" (Ch.96) | Covered |
| International Asset Recovery | §164 | Asset Recovery | Part V Ch.40 | Intl. Coop (Ch.39) | Chain evidence | Highly Restricted | AR clearance + Two-Person | "Recovery Chain Evidence" (Ch.96) | Covered |
| International Obligations | §165 | Obligations | Part V Ch.41 | Reform Cockpit (Ch.48) | Evidence per obligation | Restricted | None | "Obligation Evidence" (Ch.96) | Covered |
| Global Benchmarking | §166 | Benchmarking | Part V Ch.42 | Health Index (Ch.2) | Methodology visible | ACA Internal | None | "Benchmark Methodology Visibility" (Ch.96) | Covered |
| ACA Command Center | §167 | Command Center | Part V Ch.43 | Risk Radar (Ch.1) | No sealed evidence at leadership | Restricted | Leadership | "Command Center Discipline" (Ch.96) | Covered |
| ACA Daily Intelligence Brief | §168 | Daily Brief | Part V Ch.44 | Risk Radar (Ch.1) | Human approval gate | Restricted | Designated reviewer | "Brief Approval Gate" (Ch.96) | Covered |
| ACA Situation Room | §169 | Situation Room | Part V Ch.45 | Case Timeline (Part IV) | Matter-bound access | Highly Restricted | Matter team | "Situation Room Coverage" (Ch.96) | Covered |
| National Service Map | §170 | Service Map | Part V Ch.46 | Local Admin (Ch.35) | Geographic drill | ACA Internal | None | "National Map Drill-Down" (Ch.96) | Covered |
| National Integrity Map | §171 | Integrity Map | Part V Ch.47 | Service Map (Ch.46) | Layer authorization | Restricted | Leadership | "Map Layer Authorization" (Ch.96) | Covered |
| Reform / Strategy Cockpit | §172 | Reform Cockpit | Part V Ch.48 | Health Index (Ch.2) | Evidence per milestone | Restricted | Reform owner | "Reform Evidence Discipline" (Ch.96) | Covered |
| Training Academy | §173 | Training Academy | Part V Ch.49 | AI Boundary (Ch.78) | Synthetic data only | ACA Internal | Trainer | "Simulator Discipline" (Ch.96) | Covered |
| Administrative Red-Team | §174 | Red-Team | Part V Ch.50 | Recommendations (Part IV) | Authorized testing | ACA Internal | Red-Team lead | "Red-Team Actionability" (Ch.96) | Covered |
| Governance Stress Test | §175 | Stress Test | Part V Ch.51 | Digital Twin (Ch.52) | Estimate, not prediction | ACA Internal | Reform owner | "Stress Test Transparency" (Ch.96) | Covered |
| Administrative Integrity Digital Twin | §176 | Digital Twin | Part V Ch.52 | All upstream | Fidelity disclosure | ACA Internal | Twin operator | "Twin Fidelity Disclosure" (Ch.96) | Covered |
| Security of ACA Itself | §177 | Security Plane | Part V Ch.53 | Audit Trail (Ch.69) | No sealed content in plane | Restricted | Security officer | "Security Plane Discipline" (Ch.96) | Covered |
| Cyber Incident Investigation Mode | §178 | Cyber Mode | Part V Ch.54 | Security Plane (Ch.53) | Incident-as-case | Highly Restricted | IR team | "Cyber Incident Case Creation" (Ch.96) | Covered |
| Disaster Recovery | §179 | DR | Part V Ch.55 | Key Management (Ch.90) | Full coverage | Highly Restricted | DR authority | "Recovery Coverage" (Ch.96) | Covered |
| Evidence Recovery Drill | §180 | Drill | Part V Ch.56 | DR (Ch.55) | Hash verification | Highly Restricted | Certifying authority | "Drill Integrity Verification" (Ch.96) | Covered |
| Surge Mode | §181 | Surge | Part V Ch.57 | Audit Trail (Ch.69) | No security weakening | Restricted | ACA leader | "Surge Security Invariance" (Ch.96) | Covered |
| Continuity Mode | §182 | Continuity | Part V Ch.58 | Device Binding (Ch.65) | Offline seal | Restricted | Investigator | "Continuity Integrity" (Ch.96) | Covered |
| Privacy Architecture | §183 | Privacy | Part V Ch.59 | Information Boundary (Ch.11) | Per-class classification | All classes | Privacy officer | "Privacy Classification Required" (Ch.96) | Covered |
| Protected Reporter Architecture | §184 | Reporter Vault | Part V Ch.60 | Two-Person (Ch.68) | Vault isolation | Protected Identity | Two-Person for unmask | "Reporter Vault Isolation" (Ch.96) | Covered |
| Whistleblower Retaliation Signal | §185 | Retaliation Signal | Part V Ch.61 | Reporter Vault (Ch.60) | Signal, not finding | Restricted | Investigator | "Retaliation Signal Discipline" (Ch.96) | Covered |
| Public/ACA Data Boundary | §186 | Public Boundary | Part V Ch.62 | Separate Data Plane (Ch.89) | Architectural enforcement | All classes | Security officer | Test A/B (Ch.98); "Public Boundary Enforcement" (Ch.96) | Covered |
| Citizen Status Experience | §187 | Citizen Status | Part V Ch.63 | Public Boundary (Ch.62) | Policy-gated | Citizen/Public | None | "Citizen Status Boundary" (Ch.96) | Covered |
| ACA Agent Profile | §190 | Agent Profile | Part V Ch.64 | Device Binding (Ch.65) | Not exposed to citizens | Restricted | ACA administration | "Agent Profile Isolation" (Ch.96) | Covered |
| Device-to-Agent Binding | §191 | Device Binding | Part V Ch.65 | Agent Profile (Ch.64) | Cryptographic attestation | Restricted | ACA administration | "Device Binding Enforcement" (Ch.96) | Covered |
| Case-Based Access | §192 | Case Access | Part V Ch.66 | Agent Profile (Ch.64) | Per-case authorization | All classes | Investigator | Test C (Ch.98); "Case-Based Access Enforcement" (Ch.96) | Covered |
| Temporary Access | §193 | Temp Access | Part V Ch.67 | Case Access (Ch.66) | Auto-expiry | Restricted | Authorized grantor | "Temporary Access Expiry" (Ch.96) | Covered |
| Two-Person Authorization | §194 | 2PA | Part V Ch.68 | Agent Profile (Ch.64) | Distinct approvers | Highly Restricted | Two distinct approvers | "Two-Person Enforcement" (Ch.96) | Covered |
| Audit Trail | §195 | Audit Trail | Part V Ch.69 | Provenance Ledger (Ch.71) | Immutable | Highly Restricted | None (read-only) | Test G (Ch.98); "Audit Trail Immutability" (Ch.96) | Covered |
| Evidence Access Audit | §196 | Evidence Audit | Part V Ch.70 | Audit Trail (Ch.69) | Complete per-item | Highly Restricted | None (read-only) | "Evidence Access Completeness" (Ch.96) | Covered |
| Provenance Ledger | §197 | Provenance | Part V Ch.71 | Audit Trail (Ch.69) | Append-only | Highly Restricted | None (read-only) | "Provenance Completeness" (Ch.96) | Covered |
| Data Conflict | §198 | Conflict | Part V Ch.72 | Data Quality Engine (Ch.4) | Both paths retained | ACA Internal | Investigator | "Conflict Non-Suppression" (Ch.96) | Covered |
| Data Reliability | §199 | Reliability | Part V Ch.73 | Freshness (Ch.5) | Visible on records | ACA Internal | None | "Reliability Visibility in Findings" (Ch.96) | Covered |
| Compliance / Assurance Layer | §200 | Compliance | Part V Ch.74 | Audit Trail (Ch.69) | No false certification | ACA Internal | Compliance officer | "Certification Honesty" (Ch.96) | Covered |
| Egyptian Legal / Regulatory Configuration | §201 | Policy Engine | Part V Ch.75 | Compliance (Ch.74) | No hardcoded claims | ACA Internal | Policy administrator | "Legal Claim Traceability" (Ch.96) | Covered |
| Retention / Legal Hold | §202 | Retention | Part V Ch.76 | Policy Engine (Ch.75) | No delete for sealed | All classes | Legal hold authority | "Retention Enforcement" (Ch.96) | Covered |
| ACA Evidence Disposition | §203 | Disposition | Part V Ch.77 | Retention (Ch.76) | Non-silent; audit preserved | Highly Restricted | Two-Person | "Disposition Traceability" (Ch.96) | Covered |
| AI Human-Authority Boundary | §204 | AI Boundary | Part V Ch.78 | Audit Trail (Ch.69) | No determinative AI | All classes | Human authorizer | Test I (Ch.98); "AI Authority Boundary" (Ch.96) | Covered |
| Session Security | §223 | Sessions | Part V Ch.79 | Device Binding (Ch.65) | Re-auth for critical | Restricted | Investigator | "Session Re-Authentication" (Ch.96) | Covered |
| Export Security | §224 | Export | Part V Ch.80 | Two-Person (Ch.68) | Manifest required | Highly Restricted | Investigator + Two-Person | "Export Manifest Required" (Ch.96) | Covered |
| Evidence Package | §225 | Evidence Package | Part V Ch.81 | Provenance Ledger (Ch.71) | Cryptographically sealed | Sealed | Investigator | "Evidence Package Integrity" (Ch.96) | Covered |
| Public Transparency | §226 | Transparency | Part V Ch.82 | Public Boundary (Ch.62) | Never-reveal list | Citizen/Public (aggregate) | Publication reviewer | "Transparency Layer Isolation" (Ch.96) | Covered |
| Public Outcome Communication | §227 | Outcome Comms | Part V Ch.83 | Citizen Status (Ch.63) | Plain language | Citizen/Public | Investigator | "Outcome Communication Clarity" (Ch.96) | Covered |
| Positive Governance | §228 | Positive Gov | Part V Ch.84 | Health Index (Ch.2) | Positive indicators | ACA Internal | None | "Positive Governance Balance" (Ch.96) | Covered |
| False-Accusation Analysis | §229 | False Accusation | Part V Ch.85 | Reporter Vault (Ch.60) | Signal, not classification | Restricted | Investigator | "False-Accusation Discipline" (Ch.96) | Covered |
| Whistleblower / Retaliation Architecture | §230 | Whistleblower | Part V Ch.86 | Reporter Vault (Ch.60) | Symmetric protection | Protected Identity | Two-Person | "Whistleblower Architecture Integrity" (Ch.96) | Covered |
| International Language Support | §231 | Language | Part V Ch.87 | Intl. Coop (Ch.39) | Original never deleted | ACA Internal | Translator | "Original Language Preservation" (Ch.96) | Covered |
| Deployment Options | §211 | Deployment | Part V Ch.88 | Separate Data Plane (Ch.89) | Sovereign default | All classes | Deployment authority | "Deployment Classification Alignment" (Ch.96) | Covered |
| Separate ACA Data Plane | §212 | Data Plane | Part V Ch.89 | Deployment (Ch.88) | Strong separation | All classes | Security officer | Test B (Ch.98); "Data Plane Separation" (Ch.96) | Covered |
| Key Management | §213 | Key Mgmt | Part V Ch.90 | Data Plane (Ch.89) | HSM, rotation, separation | Highly Restricted | Two-Person for recovery | "Key Authorization Gate" (Ch.96) | Covered |
| Secret Management | §214 | Secret Mgmt | Part V Ch.91 | Key Mgmt (Ch.90) | No hardcoded secrets | Highly Restricted | Security officer | "No Hardcoded Secrets" (Ch.96) | Covered |
| Security Error-Check | §215 | Error-Check | Part V Ch.92 | Security Plane (Ch.53) | Continuous discipline | All classes | Security officer | "Security Error-Check Discipline" (Ch.96) | Covered |
| Requirements Traceability Matrix | §217 | This matrix | Part V Ch.93 | — | — | — | — | This matrix | Covered |
| Original Circle → ACA Impact Matrix | §218 | Impact Matrix | Part V Ch.94 | — | — | — | — | Ch.94 | Covered |
| Data Classification Matrix | §219 | Classification | Part V Ch.95 | Privacy (Ch.59) | Per-class controls | All classes | Privacy officer | Ch.95 | Covered |
| ACA Screen Inventory | §220 | Screen Inventory | Part III Ch.189 | — | Navigation security | — | — | Ch.96 ("ACA Visibility") | Partial (in Part III) |
| ACA Navigation Security | §221 | Navigation | Part III Ch.188 | Agent Profile (Ch.64) | Permission-gated | Restricted | Investigator | "Navigation Authorization" (Ch.96) | Partial (in Part III) |
| Login Failure / Lockout | §222 | Login Lockout | Part V Ch.99 | Sessions (Ch.79) | MFA + lockout | Restricted | Security officer | Test B (Ch.98) | Covered |
| Acceptance Criteria | §232 | Acceptance | Part V Ch.96 | All modules | Per-module criteria | All classes | — | Ch.96 | Covered |
| End-to-End Test Scenarios | §233 | E2E Tests | Part V Ch.97 | All modules | — | All classes | — | Ch.97 | Covered |
| Absolute Security Tests | §234 | Absolute Tests | Part V Ch.98 | All modules | A–J tests | All classes | — | Ch.98 | Covered |
| Output Requirement | §235 | Output | Whole blueprint | — | Reconstructed blueprint | — | — | — | Covered |
| Do Not Invent Facts | §236 | Discipline | Throughout | — | Placeholders only | — | — | Ch.96 ("No Invented Facts") | Covered |
| Blueprint Language | §237 | Language | Throughout | — | Institutional language | — | — | Ch.96 ("Language Discipline") | Covered |
| Final Executive Positioning | §238 | Positioning | Whole blueprint | — | Sovereign platform | — | — | — | Covered |
| Final Architecture Summary | §239 | Architecture | Whole blueprint | — | — | — | — | — | Covered |
| Final Quality Control Instruction | §240 | QC | Part V Ch.100 | All modules | Full reconciliation | — | — | Ch.100 | Covered |

> Sections 121, 122, 123, 188, 189, 205–210 do not appear as separate row items because they are addressed by Parts I–IV (ACA User Experience, Case Screen, Field Workflow, Investigation Workflow, Case Information Readiness Example, Integration Control Tower Example, Business/Commercial Model) and are referenced where Part V depends on them. They are not lost; they are owned by the upstream Parts and reconciled in the Gap Audit (Chapter 100).

---

### Chapter 94: Original Circle → ACA Impact Matrix (Section 218)

**Intent.** Classify every existing Circle blueprint module in terms of how the ACA Sovereign Edition affects it, so that no original functionality is silently removed. The classification uses the eight categories specified in Section 218.

**Categories.**
- **Unchanged** — module remains as-is, no ACA impact.
- **Extended** — module gains ACA-specific capabilities while retaining original behavior.
- **Shared** — module is used by both public Circle and ACA, with ACA-specific configuration.
- **Security-hardened** — module receives additional security controls to meet ACA requirements.
- **Connected to ACA** — module feeds data to ACA under the public ↔ ACA boundary (Chapter 62).
- **Isolated from ACA** — module is deliberately kept separate from ACA.
- **Not used by ACA** — module exists in Circle but ACA does not use it.
- **Replaced only in institutional context** — within the ACA environment, a different implementation is used; the public Circle module is unchanged.

| # | Original Circle module (v16 inventory) | ACA impact classification | Notes |
|---|---|---|---|
| 1 | Home Dashboard (public) | Isolated from ACA | Public dashboard; never displays ACA content (Ch.62). |
| 2 | Wasl (Chat) | Isolated from ACA | ACA uses its own internal communications (Ch.21). |
| 3 | Mashahd (Video) | Security-hardened; Shared evidence primitives | Sealed-video primitives reused (Ch.81); public video unchanged. |
| 4 | Lamahat (Photos) | Isolated from ACA | Public photo features; ACA uses sealed evidence ingestion. |
| 5 | Midan (Square) | Not used by ACA | Public square; no ACA presence. |
| 6 | The Circle (Groups) | Not used by ACA | Public groups; no ACA presence. |
| 7 | Official Channels | Connected to ACA | Authorized official channels may publish via the Transparency Layer (Ch.82). |
| 8 | Educational Workspaces | Not used by ACA | Public education; ACA uses Training Academy (Ch.49). |
| 9 | Creator Channels | Not used by ACA | Public creator economy. |
| 10 | Professional Network | Not used by ACA | Public professional network. |
| 11 | Circle Pay | Isolated from ACA | Public payments; ACA does not transact via Circle Pay. |
| 12 | Circle Travel (Rihla) | Not used by ACA | Public travel. |
| 13 | Circle Mail | Isolated from ACA | Public mail; ACA uses internal communications (Ch.21). |
| 14 | Circle ID (OIDC) | Security-hardened; Shared identity primitives | Public OIDC unchanged; ACA has its own identity plane (Ch.64, Ch.89). |
| 15 | Social Feed | Isolated from ACA | Public feed; no ACA content. |
| 16 | Unique Features | Not used by ACA | — |
| 17 | Citizen Shield | Extended; Connected to ACA | Citizen Shield continues to protect citizens; ACA handoff is policy-controlled (Ch.62, Ch.63). |
| 18 | News Orchestrator | Not used by ACA | Public news; ACA uses Daily Intelligence Brief (Ch.44). |
| 19 | External Data Source Registry | Extended | ACA-specific data sources added under Information Boundary (Ch.11). |
| 20 | 17-Language Locale System | Shared | Arabic-first for ACA; translations via Ch.87. |
| 21 | E2EE Service Abstraction | Security-hardened; Shared | E2EE primitives reused for sealed evidence (Ch.81). |
| 22 | Anonymous Identity System | Isolated from ACA | Public anonymity; ACA uses institutional identity (Ch.64). |
| 23 | Smart Compose | Not used by ACA | Public creative feature. |
| 24 | Social Rituals | Not used by ACA | Public creative feature. |
| 25 | Social Analytics | Not used by ACA | Public analytics. |
| 26 | Smart Notifications | Not used by ACA | Public notifications. |
| 27 | Cross-Module Sharing | Not used by ACA | Public sharing. |
| 28 | Connection Graph | Not used by ACA | Public graph; ACA uses Evidence Graph (Part III). |
| 29 | Content Calendar | Not used by ACA | Public calendar. |
| 30 | Mood Engine | Not used by ACA | Public mood engine. |
| 31 | Social Challenges | Not used by ACA | Public challenges. |
| 32 | AI Content Discovery | Not used by ACA | Public discovery. |
| 33 | Local Mesh Offline Network | Security-hardened; Shared primitives | Offline-synchronization primitives reused for Continuity Mode (Ch.58). |
| 34 | Circle Verify | Not used by ACA | Public verification service. |
| 35 | AI Safety & Moderation | Security-hardened; Shared primitives | Moderation primitives feed AI Boundary (Ch.78). |
| 36 | Self-Learning AI Core | Security-hardened; Shared primitives | Self-learning reused with additional constraints (Ch.78). |
| 37 | Zero-Cost Mapping Stack | Not used by ACA | Public mapping; ACA uses National Map (Ch.46). |
| 38 | Universal Translation Layer | Extended | Translation provenance added (Ch.87). |
| 39 | Data Backup & Recovery | Security-hardened; Replaced only in institutional context | ACA uses its own DR (Ch.55, Ch.56) with stronger coverage. |
| 40 | Privacy, Consent & Identity | Extended; Security-hardened | Privacy Architecture (Ch.59) extends public privacy primitives. |
| 41 | Community Governance | Not used by ACA | Public governance; ACA has its own governance (Part IV). |
| 42 | OIDC Provider | Shared | ACA OIDC is a separate tenant/realm (Part I). |
| 43 | Production Hardening layer | Security-hardened; Shared | Validation, rate limiting, error monitoring extended for ACA. |
| 44 | 3-Layer Rollback Protection | Security-hardened; Shared | Rollback primitives reused; ACA has additional controls. |
| 45 | Voice/Video calls (Tier-B) | Not used by ACA | Public voice/video; ACA uses field recording (Part II). |
| 46 | Citizen Reporting | Extended; Connected to ACA | Citizen reports feed ACA intake via policy-controlled handoff (Ch.62). |
| 47 | Public Services directory | Connected to ACA | ACA references authorized public services (Ch.46). |
| 48 | Backup / Restore | Replaced only in institutional context | ACA uses its own DR (Ch.55). |
| 49 | Governance & Policy (public) | Not used by ACA | Public governance; ACA uses Jurisdiction / Policy Engine (Ch.75). |
| 50 | Monetization (public) | Isolated from ACA | Public monetization; ACA receives Paid Sovereign Institutional Services (Part IV, §210). |

**Discipline.** The matrix is maintained as a versioned artifact. Any future Circle module addition or removal is reviewed against this matrix to ensure no ACA-relevant capability is silently lost.

**Acceptance (preview).** Every original Circle module appears in this matrix; none is silently removed. See Chapter 96, criterion "Impact Matrix Completeness".

---

### Chapter 95: Data Classification Matrix (Section 219)

**Intent.** Define, per data class, the controls that govern storage, access, export, retention, and audit. This is the canonical reference; all other chapters defer to it.

**Classes.**
- **Citizen/Public** — public-side content submitted by citizens, published aggregates.
- **Circle Internal** — operational data of the public Circle platform.
- **ACA Internal** — operational data of the ACA platform (case metadata, configurations).
- **Restricted** — case content visible to authorized investigators.
- **Highly Restricted** — sensitive case content (AMLU, Illicit Gains, AMLU cooperation).
- **Sealed** — formally sealed evidence (Chapter 81).
- **Protected Identity** — reporter / whistleblower identities (Chapter 60).

| Class | Storage | Access | Export | Retention | Audit |
|---|---|---|---|---|---|
| Citizen/Public | Public Circle data plane; public transparency layer (Ch.82) | Citizen (own data); ACA via policy handoff | Citizen can export own content | Per public Circle policy | Standard audit |
| Circle Internal | Public Circle data plane | Circle staff (operational) | Per Circle policy | Per Circle policy | Standard audit |
| ACA Internal | ACA data plane (Ch.89) | ACA staff (operational) | Per Information Boundary Matrix (Ch.11) | Per Jurisdiction / Policy Engine (Ch.75) | Full audit (Ch.69) |
| Restricted | ACA data plane, compartmentalized | Authorized investigators (Ch.66) | With authorization + manifest (Ch.80) | Per policy (Ch.76) | Full audit (Ch.69) |
| Highly Restricted | ACA data plane, dedicated enclaves | Authorized investigators + compartment clearance | With authorization + Two-Person (Ch.68) | Per policy; no normal delete | Full audit + Two-Person actions |
| Sealed | ACA data plane, sealed storage (Ch.81) | Authorized investigators; every view audited (Ch.70) | With authorization + Two-Person + manifest | Policy-governed; no normal delete (Ch.76) | Full audit; immutable trail |
| Protected Identity | Protected Vault (Ch.60), separate | Two-Person + unmask authorization | Never except via Two-Person + legal basis | Per policy; legal hold overrides | Full audit; unmask events |

**Cross-class rules.**
- A record may contain data from multiple classes; the **highest** classification governs the whole record.
- Classification is set at ingestion; reclassification is audited (Chapter 69).
- Aggregates that combine classes inherit the highest classification of contributing records, unless small-cell suppression (Chapter 8) reduces re-identification risk.

**Acceptance (preview).** Every record in ACA carries a classification; controls match the matrix. See Chapter 96, criterion "Classification Coverage".

---

### Chapter 96: Acceptance Criteria (Section 232)

**Intent.** Provide measurable acceptance criteria for every major module. Criteria are stated as testable assertions; the End-to-End Test Scenarios (Chapter 97) and Absolute Security Tests (Chapter 98) operationalize them.

| # | Module | Acceptance criterion | Test reference |
|---|---|---|---|
| 1 | ACA visibility | A regular user cannot discover ACA UI or dashboard. | Test A (Ch.98); scenario 33 |
| 2 | ACA authentication | Only ACA-provisioned identity can enter ACA. | Test B (Ch.98); scenario 32 |
| 3 | Video integrity | Sealed official video cannot be edited/overwritten through ordinary controls. | Test E (Ch.98); scenario 35 |
| 4 | Evidence lineage | Every derived artifact links to its original. | Scenario 37 |
| 5 | Timeline | Every event can trace to source/evidence. | Scenario 13 |
| 6 | Service discovery | Case can identify relevant service/system dependencies. | Scenario 14 |
| 7 | AI | AI claims can be traced to sources. | Test I (Ch.98); scenarios 39, 40 |
| 8 | Security | Privileged actions are audited. | Test G (Ch.98); scenario 26 |
| 9 | Integration | Failed/schema-changed integrations cannot silently corrupt data. | Test J (Ch.98); scenarios 30, 31 |
| 10 | Closure | Policy-required closure controls are enforced. | Scenario 21 |
| 11 | National Early Warning | A risk signal links to contributing records. | Scenario 43 (national surge) |
| 12 | Index Methodology | A health index shows methodology + sample size. | Ch.2 |
| 13 | Scorecard Authorization | A user without clearance cannot discover a scorecard section. | Ch.3 |
| 14 | Data Quality Non-Destructive | Duplicates do not overwrite originals. | Ch.4 |
| 15 | Freshness Visibility | Every external record shows `LAST VERIFIED`. | Ch.5 |
| 16 | Source-of-Record Traceability | Every derived record carries a source link. | Ch.6 |
| 17 | Federation Mode Visible | User can see if a record was live/cached/snapshot. | Ch.7 |
| 18 | Clean Room Output Boundary | Clean Room cannot export an individual record. | Ch.8 |
| 19 | Pseudonymous Matching | Pseudonymous matching works without raw IDs. | Ch.9 |
| 20 | Purpose-Bound Provenance | Every external record has a PBQ anchor. | Ch.10 |
| 21 | Information Boundary Enforcement | A query exceeding the matrix is blocked. | Ch.11 |
| 22 | Single Integration Surface | New connectors cannot bypass the Fabric. | Ch.12 |
| 23 | Protocol Failure Visibility | Failed protocol negotiation produces visible issue. | Ch.13 |
| 24 | Event-to-Case Latency | Decision events appear on timeline within SLA. | Ch.14 |
| 25 | Auto-Link Accuracy | Auto-links connect to correct cases. | Ch.15 |
| 26 | Integration Health Visibility | Tower shows all required tiles. | Ch.16 |
| 27 | Missing-System Map Authority | Map is single source of integration status. | Ch.18 |
| 28 | Gap Tracking | Unmet data needs produce tracked requirements. | Ch.19 |
| 29 | Roadmap Status Discipline | No integration claimed live unless confirmed. | Ch.20 |
| 30 | Internal Integration Parity | Internal integrations follow Fabric contract. | Ch.21 |
| 31 | Historical Organization State | As-of queries return correct historical answer. | Ch.22 |
| 32 | Financial Evidence Sealing | Payment records seal on ingestion. | Ch.23 |
| 33 | Procurement Anomaly Provenance | Anomaly tiles link to underlying records. | Ch.24 |
| 34 | Tax Document Verification | Verification includes timestamp, source, UUID. | Ch.25 |
| 35 | Corporate Structure As-Of | Company structure renders at historical date. | Ch.26 |
| 36 | Regulatory Action Provenance | Regulatory actions carry provenance. | Ch.27 |
| 37 | AMLU Compartmentalization | Investigators without AMLU clearance cannot discover AMLU referrals. | Ch.28 |
| 38 | Illicit Gains Isolation | IG cases not visible to regular investigators. | Ch.29 |
| 39 | Identity Verification Boundary | Identity verification does not leak additional records. | Ch.30 |
| 40 | Referral Bridge Integrity | Referred cases retain full evidence chain. | Ch.31 |
| 41 | Public Prosecution Referral Integrity | Referrals carry verifiable integrity manifest. | Ch.32 |
| 42 | Judicial Bridge Discipline | Bridge records references, not duplicates. | Ch.33 |
| 43 | Customs Record Provenance | Customs records carry provenance. | Ch.34 |
| 44 | Historical Administrative Geography | Cases render on historical map. | Ch.35 |
| 45 | Property Owner Pseudonymization | Owners pseudonymized unless unmask authorized. | Ch.36 |
| 46 | Sector Data Minimization | Sector integrations cannot expose citizen records. | Ch.37 |
| 47 | Smart Referral Provenance | Referred matters retain originating link. | Ch.38 |
| 48 | International Cooperation Discipline | Requests carry legal basis + confidentiality. | Ch.39 |
| 49 | Recovery Chain Evidence | Each recovery link has supporting evidence. | Ch.40 |
| 50 | Obligation Evidence | Obligations carry supporting evidence. | Ch.41 |
| 51 | Benchmark Methodology Visibility | Benchmarks display methodology. | Ch.42 |
| 52 | Command Center Discipline | Four questions answered without clutter. | Ch.43 |
| 53 | Brief Approval Gate | Briefs cannot distribute without human approval. | Ch.44 |
| 54 | Situation Room Coverage | Major matter visible in one screen. | Ch.45 |
| 55 | National Map Drill-Down | Region drill reveals services, complaints, cases. | Ch.46 |
| 56 | Map Layer Authorization | Unauthorized layers are hidden. | Ch.47 |
| 57 | Reform Evidence Discipline | Milestones require evidence. | Ch.48 |
| 58 | Simulator Discipline | Simulator cannot complete without addressing contradictions. | Ch.49 |
| 59 | Red-Team Actionability | Findings link to corrective actions. | Ch.50 |
| 60 | Stress Test Transparency | Results show methodology + confidence intervals. | Ch.51 |
| 61 | Twin Fidelity Disclosure | Twin elements show fidelity. | Ch.52 |
| 62 | Security Plane Discipline | Security alerts link to metadata + audit. | Ch.53 |
| 63 | Cyber Incident Case Creation | Incidents become cases within minutes. | Ch.54 |
| 64 | Recovery Coverage | DR covers all 8 categories. | Ch.55 |
| 65 | Drill Integrity Verification | Drills verify hashes; mismatches block certification. | Ch.56 |
| 66 | Surge Security Invariance | Surge does not weaken security. | Ch.57 |
| 67 | Continuity Integrity | Offline seals preserved through sync. | Ch.58 |
| 68 | Privacy Classification Required | New data classes require classification + IBM entry. | Ch.59 |
| 69 | Reporter Vault Isolation | Investigators without unmask authorization cannot retrieve identity. | Ch.60; Test D |
| 70 | Retaliation Signal Discipline | Signal carries disclaimer + links to records. | Ch.61 |
| 71 | Public Boundary Enforcement | Citizen cannot discover ACA via any public endpoint. | Ch.62; Test A |
| 72 | Citizen Status Boundary | Citizens cannot see internal indicators. | Ch.63 |
| 73 | Agent Profile Isolation | Regular users cannot retrieve agent profiles. | Ch.64 |
| 74 | Device Binding Enforcement | Unbound devices cannot upload evidence. | Ch.65 |
| 75 | Case-Based Access Enforcement | Unauthorized investigators cannot discover cases. | Ch.66; Test C |
| 76 | Temporary Access Expiry | Grants expire automatically. | Ch.67 |
| 77 | Two-Person Enforcement | Sensitive actions require two distinct authorizations. | Ch.68 |
| 78 | Audit Trail Immutability | Audit events cannot be rewritten or deleted. | Ch.69; Test G |
| 79 | Evidence Access Completeness | Every evidence item has complete access history. | Ch.70 |
| 80 | Provenance Completeness | Every fact links to Provenance Ledger. | Ch.71 |
| 81 | Conflict Non-Suppression | Conflicts display both paths; no silent pick. | Ch.72 |
| 82 | Reliability Visibility in Findings | Records in findings carry reliability. | Ch.73 |
| 83 | Certification Honesty | UI displays actual certification status. | Ch.74 |
| 84 | Legal Claim Traceability | Legal claims accompanied by rule + basis. | Ch.75 |
| 85 | Retention Enforcement | Sealed evidence has no normal delete. | Ch.76 |
| 86 | Disposition Traceability | Disposition preserves audit trail. | Ch.77 |
| 87 | AI Authority Boundary | AI-drafted findings require human authorization. | Ch.78; Test I |
| 88 | Session Re-Authentication | Critical actions require fresh auth. | Ch.79 |
| 89 | Export Manifest Required | Exports without manifest are blocked. | Ch.80 |
| 90 | Evidence Package Integrity | Package seals cannot be silently broken. | Ch.81 |
| 91 | Transparency Layer Isolation | Transparency layer cannot reveal individual cases. | Ch.82 |
| 92 | Outcome Communication Clarity | Outcome comms exclude internal terminology. | Ch.83 |
| 93 | Positive Governance Balance | Health Index includes positive indicators. | Ch.84 |
| 94 | False-Accusation Discipline | Signals carry disclaimer; no auto-suppression. | Ch.85 |
| 95 | Whistleblower Architecture Integrity | Whistleblower identity requires unmask event. | Ch.86 |
| 96 | Original Language Preservation | Translations retain originals. | Ch.87 |
| 97 | Deployment Classification Alignment | Each data class has deployment target. | Ch.88 |
| 98 | Data Plane Separation | Regular Circle services cannot reach ACA plane. | Ch.89; Test B |
| 99 | Key Authorization Gate | Key use requires authorization. | Ch.90 |
| 100 | No Hardcoded Secrets | Blueprint search yields no real credentials. | Ch.91 |
| 101 | Security Error-Check Discipline | Searched-for issues are tracked to closure. | Ch.92 |
| 102 | Impact Matrix Completeness | Every original Circle module is classified. | Ch.94 |
| 103 | Classification Coverage | Every record carries a classification. | Ch.95 |
| 104 | Navigation Authorization | Unauthorized nav items are hidden. | Ch.96; scenario 34 |
| 105 | No Invented Facts | Egyptian integrations use status labels per Section 236. | Ch.20; throughout |
| 106 | Language Discipline | No "AI proves guilt" style statements in blueprint. | Throughout |

---

### Chapter 97: End-to-End Test Scenarios (Section 233)

**Intent.** Provide 43 full end-to-end test scenarios covering the complete lifecycle of an ACA matter, from citizen report to national surge event. Each scenario lists the steps, the expected outcome, and the relevant chapters.

| # | Scenario | Steps (summary) | Expected outcome | Chapters |
|---|---|---|---|---|
| 1 | Citizen submits report | Citizen opens public Circle; submits report with evidence; receives receipt token. | Report enters ACA intake with citizen receipt token; citizen sees `RECEIVED`. | Ch.62, Ch.63 |
| 2 | Citizen evidence securely enters ACA workflow | Report handoff to ACA; evidence sealed on ingestion. | Evidence package created with seal; citizen content separated from ACA internal. | Ch.62, Ch.81 |
| 3 | ACA intake | ACA intake triage; classification; assignment. | Intake record created; triage decision recorded with provenance. | Part IV |
| 4 | Triage | Risk Radar + classification; routing. | Triage decision audited; routing per Smart Referral Fabric if needed. | Ch.1, Ch.38 |
| 5 | Case creation | Case opened; investigator assigned. | Case record created with full provenance; assignment audited. | Part IV, Ch.21 |
| 6 | Investigator assignment | Investigator receives assignment; access granted. | Investigator can access case; access event logged. | Ch.64, Ch.66 |
| 7 | Agent logs in | MFA + device binding + session creation. | Session established; login audited. | Ch.64, Ch.65, Ch.79 |
| 8 | Agent records immutable video | Field recording; device-bound; sealed. | Video sealed; integrity hash recorded. | Ch.65, Ch.81 |
| 9 | Offline recording | Continuity Mode; local seal. | Evidence sealed locally; sync pending. | Ch.58 |
| 10 | Synchronization | Network restored; sync with hash verification. | Evidence syncs; hashes match; sync event audited. | Ch.58 |
| 11 | Evidence sealing | Sealing event with hashes + chain of custody. | Sealed evidence record; immutable. | Ch.81 |
| 12 | Smart evidence linking | Auto-Link connects evidence to case. | Candidate links proposed; human confirm. | Ch.15 |
| 13 | Timeline construction | Events assembled into timeline with provenance. | Timeline traceable to source/evidence per event. | Part IV, Ch.71 |
| 14 | Missing record detection | Expected vs actual records; gaps flagged. | `EVIDENCE GAP` records produced. | Part IV |
| 15 | Government record request | PBQ issued; Federation query. | Query event logged; result with provenance. | Ch.7, Ch.10 |
| 16 | Contradictory records | Two sources disagree. | `DATA CONFLICT` displayed; both paths retained. | Ch.72 |
| 17 | Similar-case discovery | Similarity search against case history. | Similar cases proposed; provenance retained. | Part IV |
| 18 | Alternative hypotheses | AI proposes hypotheses; investigator evaluates. | Hypotheses tagged as "assisting"; no determinative AI. | Ch.78 |
| 19 | Devil's-advocate challenge | Challenge finding; alternative explanations. | Challenge recorded; finding re-evaluated. | Part IV |
| 20 | Supervisor review | Supervisor reviews finding. | Review decision audited. | Part IV |
| 21 | Finding | Finding recorded with evidence support. | Finding carries provenance; human-determined. | Ch.78, Ch.71 |
| 22 | Recommendation | Recommendation issued. | Recommendation links to finding. | Part IV |
| 23 | Corrective action | Corrective action assigned. | Action tracked to closure. | Part IV |
| 24 | Reform verification | Reform milestone evidence verified. | Milestone cannot complete without evidence. | Ch.48 |
| 25 | Recurrence | Recurrence monitoring after corrective action. | Recurrence signal feeds Risk Radar. | Ch.1, Part IV |
| 26 | Sensitive export | Export requested; manifest + authorization. | Export blocked without manifest; with Two-Person for sensitive. | Ch.68, Ch.80 |
| 27 | Break-glass access | Temporary access for emergency. | Grant audited; expires automatically. | Ch.67 |
| 28 | Security incident | Anomalous activity detected. | Cyber Incident case created. | Ch.53, Ch.54 |
| 29 | Disaster recovery | DR invoked; recovery tested. | Recovery certificate issued; all 8 categories covered. | Ch.55 |
| 30 | Integration outage | Connector degrades. | Health Tower shows `DEGRADED`; no silent corruption. | Ch.16 |
| 31 | Schema change | Source changes schema. | Schema Sentinel raises event; connector fails-safe. | Ch.17 |
| 32 | Unauthorized ACA login attempt | Wrong credentials / device. | Lockout + alert. | Ch.99 |
| 33 | Regular citizen attempt to access ACA | Citizen tries ACA endpoint. | Denied; no discovery. | Ch.62; Test A |
| 34 | Investigator attempting unauthorized case access | Investigator without clearance tries case. | Denied; no case existence revealed. | Ch.66; Test C |
| 35 | Attempt to edit official sealed video | Edit attempt. | Blocked. | Test E |
| 36 | Attempt to delete official sealed video | Delete attempt. | Blocked (no normal delete). | Test F |
| 37 | Derived-copy generation | Derive from evidence. | Derived copy linked to original; audit recorded. | Ch.70, Ch.81 |
| 38 | Protected reporter unmask request | Unmask request. | Requires Two-Person + legal basis; audit. | Ch.60, Ch.68; Test D |
| 39 | AI prompt injection through malicious document | Inject attempt. | AI output flagged; no determinative action; human review. | Ch.78; Test I |
| 40 | AI hallucination/unsupported citation | Hallucinated citation. | AI claim flagged; provenance check; human review. | Ch.78; Test I |
| 41 | Cross-agency referral | Referral to another authority. | Referral provenance retained; receiving reference recorded. | Ch.31, Ch.38 |
| 42 | International cooperation | MLA request. | Workspace record with legal basis + translation. | Ch.39, Ch.87 |
| 43 | National surge event | Surge Mode activated. | Capacity scales; security unchanged; activation audited. | Ch.57 |

**Acceptance (preview).** All 43 scenarios have a defined expected outcome and reference the chapters that operationalize them. See Chapter 96, criterion matrix.

---

### Chapter 98: Absolute Security Tests (Section 234)

**Intent.** Provide the ten absolute security tests that the final blueprint must explicitly verify. These tests are non-negotiable; failure of any test blocks release.

| Test | Statement | Implementation | Pass criterion |
|---|---|---|---|
| **Test A** | A regular Circle citizen cannot see ACA. | Citizen account attempts to reach any ACA endpoint / UI. | All ACA endpoints return denial; no ACA UI is rendered; no discovery. |
| **Test B** | A regular Circle employee cannot automatically see ACA. | Circle staff account (non-ACA) attempts ACA access. | Denied; ACA access requires ACA-provisioned identity + device binding. |
| **Test C** | An ACA agent cannot see cases outside authorization. | ACA investigator without case assignment attempts case access. | Denied; case existence not revealed. |
| **Test D** | An ACA agent cannot access protected identities without authorization. | Investigator attempts to retrieve reporter identity. | Denied; identity remains pseudonymous `REPORTER R-XXXX`; unmask requires Two-Person + legal basis. |
| **Test E** | An ACA agent cannot edit sealed official video. | Edit attempt on sealed video. | Blocked; sealed video is immutable through ordinary controls. |
| **Test F** | An ACA agent cannot ordinarily delete sealed official video. | Delete attempt on sealed video. | Blocked; no normal delete mechanism for sealed evidence. |
| **Test G** | An administrator cannot silently rewrite evidence history. | Admin attempts to alter audit trail or provenance. | Blocked; trail is immutable; alteration breaks hash chain; alert raised. |
| **Test H** | AI cannot access unrestricted ACA data. | AI service attempts unrestricted data access. | Denied; AI access is scoped per Information Boundary Matrix. |
| **Test I** | AI cannot turn inference into authoritative finding. | AI attempts to publish a finding. | Blocked; findings require human authorization event. |
| **Test J** | A failed integration cannot silently corrupt historical records. | Simulate integration failure + schema change. | Historical records unchanged; fail-safe mode activated; conflict surfaced. |

**Operating discipline.**
- These tests are automated and run on every release candidate.
- A failure of any test blocks release.
- Test results are recorded in the Audit Trail and visible on the Security Operations Plane.

**Acceptance (preview).** All ten tests pass on the release candidate. See Chapter 96, criterion matrix (tests referenced per row).

---

### Chapter 99: Login Failure / Lockout (Section 222)

**Intent.** Implement institutional security controls for ACA login — beyond what public Circle requires — appropriate to the sensitivity of the ACA environment.

**Controls.**
- **MFA** — mandatory for all ACA identities; no password-only login.
- **Rate limiting** — login attempts are rate-limited per identity and per device.
- **Account lockout / risk controls** — accounts lock after policy-defined failed attempts; unlock requires administrative review.
- **Device trust** — login requires a bound, attested device (Chapter 65).
- **Suspicious-login detection** — impossible-travel, anomaly, and brute-force patterns raise alerts.
- **Session expiration** — sessions expire per Chapter 79.
- **Revocation** — administrators can revoke sessions and credentials immediately.
- **Administrative review** — locked accounts require administrative review to unlock.

**Operating rules.**
- Lockout events are audited and visible on the Security Operations Plane (Chapter 53).
- Repeated lockouts for an identity trigger a security investigation (Chapter 54).
- Recovery from lockout requires administrative action, not self-service.

**Acceptance (preview).** A login with wrong credentials reaches the lockout threshold and locks the account; subsequent attempts are blocked; alert raised. See Test B (Chapter 98); Chapter 96, criterion "Login Lockout Enforcement".

**Dependencies.** ACA Agent Profile (Chapter 64), Device-to-Agent Binding (Chapter 65), Session Security (Chapter 79), Security Operations Plane (Chapter 53).

---

### Chapter 100: Gap / Duplication / Conflict Audit (Section 240)

**Intent.** Perform a full reconciliation against the existing CIRCLE blueprint and the entire ACA requirements, using the categories specified in Section 240. This is the final quality-control gate before the blueprint is considered complete.

**Categories reviewed.**
1. Missing requirement
2. Duplicate requirement
3. Contradictory requirement
4. Security weakness
5. Privacy weakness
6. Integration dependency
7. Legal / policy assumption
8. UX ambiguity
9. Data-model ambiguity
10. AI-governance weakness
11. Deployment ambiguity
12. Testing gap

**Audit findings and corrections.**

| # | Category | Finding | Correction | Status |
|---|---|---|---|---|
| 1 | Missing requirement | Original prompt Sections 188, 189, 205–210 (ACA UX, Case Screen, Field Workflow, Investigation Workflow, Case Info Example, Integration Tower Example, Business Model) not restated in Part V. | Owned by Parts I–IV; cross-referenced in Chapter 93 footnote. Not lost; not duplicated. | Corrected |
| 2 | Duplicate requirement | "Audit Trail" defined in multiple upstream Parts. | Chapter 69 is the canonical definition; upstream references point here. | Corrected |
| 3 | Duplicate requirement | "Provenance" mentioned in many chapters. | Chapter 71 is the canonical Ledger; other chapters reference it. | Corrected |
| 4 | Duplicate requirement | "Two-Person Authorization" appears in many chapters. | Chapter 68 is the canonical definition. | Corrected |
| 5 | Contradictory requirement | None found — Part V consistently treats AI as assisting, never determinative. | Discipline applied throughout. | None |
| 6 | Security weakness | Risk: "investigator sees all cases" default. | Corrected in Chapter 66 — Case-Based Access is per-case. | Corrected |
| 7 | Security weakness | Risk: "silent schema coercion" on integration. | Corrected in Chapter 17 — Schema Sentinel refuses coercion. | Corrected |
| 8 | Security weakness | Risk: "normal delete for sealed evidence". | Corrected in Chapter 76 — no normal delete for sealed. | Corrected |
| 9 | Security weakness | Risk: "AI publishes findings". | Corrected in Chapter 78 — AI cannot publish without human authorization. | Corrected |
| 10 | Security weakness | Risk: "single-administrator key use". | Corrected in Chapter 90 — key use requires authorization event. | Corrected |
| 11 | Privacy weakness | Risk: "bulk import of citizen data". | Corrected in Chapter 7 (Federation) and Chapter 37 (Sector Data Minimization). | Corrected |
| 12 | Privacy weakness | Risk: "reporter identity visible to investigators". | Corrected in Chapter 60 — Protected Vault; pseudonymous labels. | Corrected |
| 13 | Privacy weakness | Risk: "every government datum in Circle". | Explicitly rejected in Chapter 59. | Corrected |
| 14 | Integration dependency | Many Egyptian integrations depend on government authorization not yet granted. | Marked "requires government authorization / technical discovery" per Chapter 20. | Tracked |
| 15 | Integration dependency | Schema discovery for many sources incomplete. | Schema Sentinel (Ch.17) handles gracefully via fail-safe. | Tracked |
| 16 | Legal / policy assumption | Risk: hardcoded "legally admissible" claim. | Replaced by Jurisdiction / Policy Engine (Ch.75). | Corrected |
| 17 | Legal / policy assumption | Risk: hardcoded "fully compliant" claim. | Replaced; compliance is mapping, not assertion (Ch.74). | Corrected |
| 18 | Legal / policy assumption | Risk: hardcoded "authorized" claim. | Replaced; each authorization is a policy output. | Corrected |
| 19 | UX ambiguity | Public citizen interface vs ACA interface boundary unclear. | Clarified in Chapter 62 (boundary) and Chapter 63 (citizen status). | Corrected |
| 20 | UX ambiguity | ACA navigation security not specified. | Specified in Chapter 96 criterion "Navigation Authorization" (referenced from Part III). | Corrected |
| 21 | Data-model ambiguity | Source-of-record vs ACA-derived record not distinguished. | Clarified in Chapter 6 (System-of-Record Registry). | Corrected |
| 22 | Data-model ambiguity | Conflict resolution path unclear. | Clarified in Chapter 72 — no silent pick. | Corrected |
| 23 | Data-model ambiguity | Historical organizational state not modeled. | Clarified in Chapter 22 — as-of queries. | Corrected |
| 24 | AI-governance weakness | Risk: AI access unrestricted. | Corrected in Chapter 78 + Test H. | Corrected |
| 25 | AI-governance weakness | Risk: AI turns inference into finding. | Corrected in Chapter 78 + Test I. | Corrected |
| 26 | AI-governance weakness | Risk: AI hallucinations cited in findings. | Mitigated by Provenance Ledger (Ch.71) + Test I; findings require evidence support. | Corrected |
| 27 | Deployment ambiguity | Public cloud assumed acceptable for all data. | Corrected in Chapter 88 — sovereign default; per-class decision. | Corrected |
| 28 | Deployment ambiguity | ACA data plane separation unclear. | Clarified in Chapter 89. | Corrected |
| 29 | Deployment ambiguity | Key management unspecified. | Clarified in Chapter 90. | Corrected |
| 30 | Deployment ambiguity | Secret management unspecified. | Clarified in Chapter 91. | Corrected |
| 31 | Testing gap | Absolute security tests not enumerated. | Enumerated in Chapter 98 (Tests A–J). | Corrected |
| 32 | Testing gap | End-to-end scenarios not enumerated. | Enumerated in Chapter 97 (43 scenarios). | Corrected |
| 33 | Testing gap | Acceptance criteria not measurable. | Made measurable in Chapter 96. | Corrected |
| 34 | Testing gap | DR coverage unclear. | Clarified in Chapter 55 (8 categories). | Corrected |
| 35 | Missing requirement | Original Circle → ACA impact matrix not present. | Added in Chapter 94. | Corrected |
| 36 | Missing requirement | Data classification matrix not present. | Added in Chapter 95. | Corrected |
| 37 | Missing requirement | Requirements traceability matrix not present. | Added in Chapter 93. | Corrected |
| 38 | Duplicate requirement | "Information Boundary" implied across many chapters. | Chapter 11 is canonical; other chapters reference. | Corrected |
| 39 | Contradictory requirement | None found between Surge Mode and security. | Surge explicitly preserves security (Ch.57). | None |
| 40 | Contradictory requirement | None found between Retention and Disposition. | Disposition preserves audit trail (Ch.77). | None |
| 41 | Integration dependency | Identity verification via MoI depends on authorization. | Marked "requires government authorization / technical discovery". | Tracked |
| 42 | Integration dependency | AMLU cooperation depends on legal basis. | Clean Room + Two-Person gate; legal basis via Policy Engine. | Tracked |
| 43 | AI-governance weakness | Risk: AI used for retaliation detection declared as fact. | Corrected in Chapter 61 — signal, not finding. | Corrected |
| 44 | AI-governance weakness | Risk: AI used for false-accusation declared as fact. | Corrected in Chapter 85 — signal, not classification. | Corrected |
| 45 | UX ambiguity | Public transparency vs internal intelligence unclear. | Clarified in Chapter 82. | Corrected |
| 46 | Data-model ambiguity | Sealed evidence lifecycle unclear. | Clarified in Chapters 76, 77, 81. | Corrected |
| 47 | Security weakness | Risk: hardcoded credentials in blueprint examples. | Corrected in Chapter 91; placeholders used throughout. | Corrected |
| 48 | Privacy weakness | Risk: small-cell re-identification in aggregates. | Mitigated by Clean Room suppression (Ch.8) and Transparency Layer review (Ch.82). | Corrected |
| 49 | Deployment ambiguity | Hybrid deployment data-plane separation unclear. | Clarified in Chapter 88 — only where approved, with strict separation. | Corrected |
| 50 | Testing gap | Login failure / lockout not tested. | Added in Chapter 99; referenced by Test B. | Corrected |

**Final reconciliation statement.**

This Part V reconciles the entire ACA prompt (Sections 121–240) against the blueprint. Every requirement is mapped in Chapter 93. Every original Circle module is classified in Chapter 94. Every data class has controls in Chapter 95. Every major module has measurable acceptance criteria in Chapter 96. Forty-three end-to-end scenarios cover the lifecycle in Chapter 97. Ten absolute security tests gate release in Chapter 98. Login failure is controlled in Chapter 99. The gap / duplication / conflict audit in this chapter closes the loop on Section 240.

The final result makes it **impossible** for an ordinary Circle citizen or regular Circle user to accidentally discover or enter ACA, while providing ACA with a completely independent, confidential, institutionally controlled environment whose agent identities are created and managed by ACA itself.

---

## Closing Statement

Part V completes the **CIRCLE BLUEPRINT — ACA SOVEREIGN EDITION**. The full architecture (Section 239) is:

```text
PUBLIC CIRCLE
│
├── Citizen
├── Citizen Shield
├── Citizen Reporting
└── Public Services
        │
        │ SECURE / POLICY-CONTROLLED HANDOFF (Ch.62)
        ▼
┌───────────────────────────────────────────┐
│        ACA SOVEREIGN ENVIRONMENT          │
│                                           │
│  ACA LOGIN / IDENTITY / DEVICE TRUST      │
│  (Parts I, V Ch.64–65, Ch.79, Ch.99)     │
│                 │                         │
│        ACA OVERSIGHT FABRIC               │
│        (Part V Ch.12 Government           │
│         Integration Fabric)               │
│                 │                         │
│   ┌─────────────┼──────────────┐          │
│   │             │              │          │
│ Evidence     Investigation   Services     │
│ (Parts II,   (Parts III, IV, (Part V      │
│  Ch.81)      V Ch.43–52)    Ch.46–47)     │
│   │             │              │          │
│   └─────────────┼──────────────┘          │
│                 │                         │
│       INTELLIGENCE KNOWLEDGE GRAPH        │
│       (Part III)                          │
│                 │                         │
│       SMART TIMELINE / DIGITAL TWIN       │
│       (Part IV, Part V Ch.52)             │
│                 │                         │
│       AI + HYPOTHESES + CONTRADICTIONS    │
│       (Part IV, Part V Ch.78)             │
│                 │                         │
│       FINDINGS / RECOMMENDATIONS          │
│       (Part IV)                           │
│                 │                         │
│       CORRECTIVE ACTION / REFORM          │
│       (Part IV, Part V Ch.48)             │
│                 │                         │
│       NATIONAL EARLY WARNING              │
│       (Part V Ch.1, Ch.43, Ch.44)         │
│                                           │
│  SECURITY / ZERO TRUST / AUDIT / HSM      │
│  (Part V Ch.53, Ch.69, Ch.90, Ch.91)      │
│                                           │
│       GOVERNMENT INTEGRATION FABRIC       │
│       (Part V Ch.12–38)                   │
└───────────────────────────────────────────┘
```

**Final positioning (Section 238).** Circle ACA is a **sovereign administrative oversight, investigation, evidence, intelligence and governance platform**. It is not complaint management, CRM, workflow software, surveillance, an AI chatbot, or a case-management system. It is the institutional capability that connects authorized complaints, official field evidence, investigations, government services, administrative processes, documents, transactions, inspections, decisions, people, entities, rules and systems into one continuously auditable environment.

**End of Part V.**


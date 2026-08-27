# CIRCLE — Security, Deployment, Commercial Model & Final Architecture

## Part IV of the Federated Sovereign Government Architecture

**Document type:** Blueprint amendment (final part).
**Scope:** Security testing, exfiltration monitoring, institutional audit plane, policy engine, government registry, service ownership, institutional workflow engine, shared-versus-institutional capability separation, public-to-government and government-to-government data flows, ACA data flow, case correlation, federated incident reference, multi-agency emergency, after-action federation, ACA systemic correlation, public transparency, institutional privacy, emergency privacy, government procurement positioning, deployment strategy, commercial model, ETA replacement prohibition, institution-specific contracts, consumer-services-free guarantee, final data ownership model, final architecture diagram, twenty final architectural rules, blueprint reconciliation, required final output structure, final executive statement, complete requirements traceability matrix, full security/architecture audit checklist, and end-to-end acceptance tests.
**Predecessors:** Part I (Citizen Shield & Government Federation Fabric), Part II (ACA Sovereign Environment & Institutional Workspace Framework), Part III (ACA Evidence, Intelligence, Timeline & AI Governance).
**Sovereignty statement:** Circle is an interoperability and institutional-intelligence platform. It does not replace, override, or subordinate any Egyptian government institution or system of record. Every architectural statement in this Part is subject to that sovereignty principle.

---

## Table of Contents

- PART LXXXIII — Security Testing
- PART LXXXIV — Data Exfiltration
- PART LXXXV — Institutional Audit
- PART LXXXVI — Independent Audit Plane
- PART LXXXVII — Government Service SLA
- PART LXXXVIII — Policy Engine
- PART LXXXIX — No Hard-Coded Government Assumptions
- PART XC — Government Registry
- PART XCI — Service Ownership
- PART XCII — Institutional Workflow Engine
- PART XCIII — Shared Circle Capabilities vs Institution-Specific Capabilities
- PART XCIV — Shared Infrastructure Does Not Mean Shared Data
- PART XCV — Shared Identity Foundation Does Not Mean Shared Privilege
- PART XCVI — Citizen Account ≠ Government Account
- PART XCVII — Public-to-Government Data Flow
- PART XCVIII — Government-to-Government Data Flow
- PART XCIX — ACA Data Flow
- PART C — Institutional Case Correlation
- PART CI — Federated Incident ID
- PART CII — Multi-Agency Emergency
- PART CIII — After-Action Federation
- PART CIV — ACA Systemic Correlation
- PART CV — Public Transparency
- PART CVI — Institutional Privacy
- PART CVII — Emergency Privacy
- PART CVIII — Government Procurement Positioning
- PART CIX — Government Deployment Strategy
- PART CX — Commercial Model
- PART CXI — No "ETA Replacement" Product
- PART CXII — Institution-Specific Commercial Contracts
- PART CXIII — Consumer Services Remain Free
- PART CXIV — Final Data Ownership Model
- PART CXV — Final Architecture Diagram
- PART CXVI — Final Architectural Rules
- PART CXVII — Blueprint Reconciliation
- PART CXVIII — Required Final Output
- PART CXIX — Final Executive Statement
- Requirements Traceability Matrix (PART I through CXIX)
- Security / Architecture Audit Checklist
- End-to-End Acceptance Tests

---

## PART LXXXIII — Security Testing

### LXXXIII.1 Mandatory test catalogue

Circle's institutional layer must be continuously and pre-release tested against the following threat classes. These tests are mandatory for every government-facing release, every integration with an Egyptian government system, every ACA release, and every change that touches routing, policy, identity federation, evidence handling, or inter-agency exchange.

| Test ID | Threat class | Description | Required negative result |
|---|---|---|---|
| ST-01 | Privilege escalation | An authenticated principal attempts to elevate its role beyond its provisioned scope (e.g., a citizen account attempts ACA agent actions; an EMS dispatcher attempts Police dispatch actions). | Elevation blocked; event flagged in institutional audit. |
| ST-02 | Authentication bypass | Tampered tokens, forged device assertions, expired session reuse, certificate spoofing, biometric spoofing, hardware-keystore bypass attempts. | All bypass attempts fail closed; security event raised. |
| ST-03 | Data boundary violation | A user in Institution A attempts to read or write data owned by Institution B without explicit authorization. | Boundary enforced; access denied; audit recorded. |
| ST-04 | Cross-tenant leakage | Shared infrastructure (storage, vector store, AI inference, queues) is probed to detect leakage between tenants, especially ACA, Police, EMS, Civil Protection, and citizen data. | Zero leakage; tenant isolation verified at storage, network, and inference layers. |
| ST-05 | API abuse | Rate-limit bypass, parameter tampering, batch enumeration, scraping, OAuth scope expansion attempts. | Abuse detected; throttled; flagged for institutional security review. |
| ST-06 | Prompt injection | Malicious instructions embedded in citizen messages, documents, evidence metadata, AI-extracted entities, or translated text. | Injection isolated by the Prompt-Injection Firewall; no privilege escalation through AI. |
| ST-07 | Malicious documents | Uploaded documents containing macros, embedded payloads, model-extraction payloads, or crafted metadata intended to corrupt extraction, evidence integrity, or downstream AI. | Documents sanitized; payloads neutralized; integrity preserved. |
| ST-08 | Evidence modification | Attempts to modify, delete, back-date, or re-seal sealed evidence; attempts to alter provenance chains, hash manifests, or HSM-attested timestamps. | Modification blocked; sealed evidence remains immutable; violation logged in the Independent Audit Plane. |
| ST-09 | Unauthorized export | Attempts to bulk-export citizen, institutional, or ACA data without an explicit export authorization signed by the data owner institution. | Export denied; attempted export recorded with full principal provenance. |
| ST-10 | Replay attacks | Replay of signed requests, identity assertions, federation referrals, or inter-agency exchange messages. | Nonces, timestamps, and short-lived assertions defeat replay; replay rejected. |
| ST-11 | Offline synchronization attacks | Forged offline edits, conflicting offline writes, replayed sync messages, device-clock manipulation, partial-sync tampering. | Conflict detection triggers; unauthenticated or tampered offline writes rejected; reconciliation controlled by institution policy. |
| ST-12 | Device compromise | Lost, rooted, jailbroken, or maliciously modified devices; compromised hardware keystores; cloned secure enclaves; side-channel attacks. | Device attestation fails; access revoked; institutional session terminated; audit trail preserved. |

### LXXXIII.2 Test cadence

- Pre-release: every test in the catalogue must pass against the candidate build.
- Continuous: tests ST-01 through ST-12 run on a recurring schedule against production-like environments.
- Integration-on-change: any change to routing, policy, identity, federation, evidence, or AI governance triggers the relevant subset.
- Adversarial: at least quarterly red-team exercises scoped to inter-agency exchange and ACA confidentiality.

### LXXXIII.3 Test artifacts

Each test produces: (a) a signed test plan, (b) an execution record with timestamps, (c) evidence of pass/fail, (d) artifact hashes, and (e) a reference in the institutional audit trail. Failed tests block release.

### LXXXIII.4 Sovereignty note

Security testing is institution-aware. A test that exercises Police data must not be permitted to touch ACA data, even in a test environment, unless the test is explicitly authorized by both institutions. Test environments themselves obey the same boundary rules as production.

---

## PART LXXXIV — Data Exfiltration

### LXXXIV.1 Mandatory monitoring surfaces

Circle must monitor, alert, and audit the following exfiltration-relevant signals across every institutional workspace, every citizen-facing surface, every integration gateway, and every federation exchange.

| Signal | Surface | Example indicators |
|---|---|---|
| Bulk export | Institutional workspaces, evidence vault, ACA environment | Export volume exceeding a policy threshold within a sliding window; export of records outside the user's authorized scope. |
| Bulk queries | Search, AI retrieval, timeline, entity resolution | Query cardinality beyond human-readable thresholds; systematic enumeration of identifiers. |
| Unusual download volume | Document infrastructure, evidence vault, institutional reports | Per-user download volume statistically anomalous versus baseline. |
| Abnormal API use | Integration gateway, federation fabric, AI services | Burst patterns; new endpoints; out-of-policy scopes; token reuse across institutions. |
| External transfer | Outbound network from institutional workspaces | Data movement to non-authorized destinations; encrypted tunnels to non-allowlisted egress; high-volume transfers to citizen devices outside policy. |

### LXXXIV.2 Response model

- Detection is mandatory; response is institution-owned.
- Circle surfaces the alert to the institution's security officer and to the Independent Audit Plane.
- Default containment actions (pause export, freeze session, revoke token) may be invoked only if explicitly authorized by the institution's policy; Circle does not auto-contain on behalf of an institution unless that institution has opted in.
- ACA exfiltration signals must never be visible to non-ACA institutional security officers.

### LXXXIV.3 Provenance of every export

Every export, whether single-record or bulk, produces a provenance record: principal, institution, scope, target, time, hash of the exported payload, policy decision, and audit reference. These provenance records are themselves sealed and are subject to the immutability rules of the Independent Audit Plane.

---

## PART LXXXV — Institutional Audit

### LXXXV.1 Per-institution audit environment

Every institution receives its own dedicated audit environment. An audit environment includes:

- An institution-owned audit log store.
- An institution-owned audit query interface.
- An institution-owned audit retention policy aligned with the institution's legal and operational requirements.
- An institution-owned audit access control, distinct from operational administrator access.
- An institution-owned audit export capability, restricted and authorized.

Circle does not collapse institutional audit environments into a single shared audit store. A shared infrastructure may host multiple stores, but the stores themselves are tenant-isolated and access-controlled per institution.

### LXXXV.2 INTER-AGENCY EXCHANGE AUDIT

In addition to per-institution audit, Circle maintains a separate, dedicated **INTER-AGENCY EXCHANGE AUDIT**. This audit captures, for every cross-institution exchange:

- Source institution.
- Target institution.
- Principal at source.
- Principal at target.
- Data classification of the exchanged object.
- Authorization basis (policy ID, signed approval if required).
- Time of exchange.
- Provenance chain reference.
- Outcome (accepted, rejected, partially accepted).
- Hash of the exchanged payload (where permitted).

The INTER-AGENCY EXCHANGE AUDIT is read-only for operational administrators. Read access is granted to: (a) the participating institutions' authorized audit officers, (b) the Independent Audit Plane, and (c) any legally authorized oversight authority under the controls defined in PART LXXXVI.

### LXXXV.3 No silent audit gaps

If an institution's audit environment is unreachable, the corresponding operational flows must degrade safely: they may queue, they may continue with elevated logging, but they must not silently proceed without producing an audit record. The audit gap itself must be audited at the Independent Audit Plane.

---

## PART LXXXVI — Independent Audit Plane

### LXXXVI.1 Principle

Operational administrators must not have unlimited power to alter historical audit evidence. Circle therefore implements an Independent Audit Plane whose integrity is independent of the operational administration of any single institution.

### LXXXVI.2 Properties of the Independent Audit Plane

- **Append-only**: audit records, once written, cannot be modified or deleted by operational administrators.
- **Sealed by hash chain**: each audit record is linked to the previous record by a hash pointer; tampering is detectable.
- **HSM-anchored**: the hash chain is periodically anchored to an HSM-backed attestation, so that even database-level administrators cannot retroactively alter the chain without detection.
- **Separate trust root**: the trust root for the Independent Audit Plane is distinct from the trust root used for operational administration. Compromise of operational credentials does not yield compromise of the audit plane.
- **Read-restricted**: read access is limited to authorized audit officers and legally authorized oversight authorities, governed by institution-owned policy.

### LXXXVI.3 What the Independent Audit Plane records

- All authentication and authorization decisions, including denials.
- All cross-institution exchanges.
- All evidence lifecycle events (creation, sealing, access, export, retention expiration).
- All policy decisions by the Policy Engine.
- All AI governance decisions (model used, prompt class, action level, override).
- All administrative actions on institutional workspaces.
- All audit-gap events.

### LXXXVI.4 Operational consequence

An operational administrator can rotate operational credentials, reconfigure operational policy, and manage operational personnel. An operational administrator cannot: rewrite an audit record, re-issue a sealed evidence event without a visible supersession record, or suppress a denial event. Supersession, when legally permitted, must itself produce a new audit record explaining the supersession, signed by the authorized supersession authority and recorded at the Independent Audit Plane.

---

## PART LXXXVII — Government Service SLA

### LXXXVII.1 Per-service SLA model

Each government service integrated with or surfaced through Circle may have its own:

- **SLA** — measured service-level objective, defined by the owning institution.
- **Escalation policy** — the chain of escalation when an SLA is at risk or breached.
- **Working hours** — the operational hours of the service, including regional variations.
- **Regional variation** — different targets in different regions, where applicable.
- **Temporary exceptions** — declared periods during which the SLA is adjusted (e.g., emergencies, maintenance, force majeure).

### LXXXVII.2 Circle must not impose a universal SLA

Circle does not impose a single universal SLA on government services. A universal SLA would contradict institutional sovereignty, because different institutions legitimately operate under different mandates, hours, capacities, and legal constraints. Circle routes to the competent institution; the competent institution owns its SLA.

### LXXXVII.3 What Circle does provide

Circle provides a **SLA Surface** — a registry-backed capability that:

- Stores each service's SLA definition (owner, target, escalation, hours, regional variation, exceptions).
- Surfaces SLA-relevant status to the citizen where authorized and operationally meaningful.
- Routes escalation requests through the institution's declared escalation policy.
- Records SLA-relevant events to the institutional audit environment.
- Does not fabricate SLAs where none exist; if a service has no declared SLA, Circle surfaces "no declared SLA" rather than inventing one.

### LXXXVII.4 SLA and citizen transparency

Where the institution authorizes it, the citizen may see: expected response windows, current service status, and a high-level escalation indicator. Where the institution does not authorize it, Circle surfaces only "service routed to the competent institution."

---

## PART LXXXVIII — Policy Engine

### LXXXVIII.1 Policy-configurable surfaces

Everything government-facing in Circle must be policy-configurable. The following surfaces must be governed by explicit policy, not by hard-coded defaults:

| Surface | Policy concerns |
|---|---|
| Institution | Which institutions exist, their authority, their status, their registry entries. |
| Region | Geographic scope of an institution, service, or rule. |
| Service | Service definition, owner, SLA, scope. |
| Law | The legal basis under which a rule, retention, or disclosure operates. |
| Authority | Which authority may sign, approve, override, or escalate. |
| Access | Who may read, write, export, or refer data within an institution. |
| Retention | How long each data class is retained and under what rule. |
| Escalation | How escalation flows inside an institution and across institutions. |
| Emergency | Emergency-specific rules, including temporary override of normal flow. |
| Disclosure | What may be disclosed to whom, under what authorization. |
| AI | Which AI actions are permitted, at what autonomy level, with what override. |
| Evidence | How evidence is created, sealed, accessed, exported, superseded. |

### LXXXVIII.2 Policy decision point

Every cross-boundary, cross-institution, evidence-touching, or AI-acting operation must pass through a Policy Decision Point (PDP). The PDP consumes policy from the Policy Engine, evaluates the request against the institution's policy and the inter-agency policy, and returns a decision: allow, deny, allow-with-conditions, or refer.

### LXXXVIII.3 Policy administration

Policy is administered per institution. Circle does not modify an institution's policy on that institution's behalf except where the institution has explicitly delegated a specific policy surface to Circle (e.g., default SLA Surface defaults, which the institution may override).

### LXXXVIII.4 Policy versioning and audit

Every policy has a version, an effective date, an authorizing principal, and an audit record. Every PDP decision records the policy version used, so that historical decisions can be re-evaluated against the policy that was in force at the time. This is essential for accountability, oversight, and dispute resolution.

---

## PART LXXXIX — No Hard-Coded Government Assumptions

### LXXXIX.1 Prohibition

Circle must not hard-code any of the following:

- **Legal authority** — Circle must not assume that it possesses a particular legal authority. Any authority Circle exercises must be explicitly granted by the relevant institution under a documented authorization.
- **Emergency API** — Circle must not hard-code a particular emergency dispatch API; emergency routing is configured via the Government Registry and integration gateway.
- **Government endpoint** — Circle must not hard-code URLs, certificates, or credentials of government systems; these are configured, versioned, and rotatable.
- **Access right** — Circle must not assume that any principal has a particular right; rights are derived from policy and provisioning.
- **Data-sharing permission** — Circle must not assume that two institutions may share data; every sharing path is explicitly authorized.
- **Institutional workflow** — Circle must not assume that all institutions follow the same workflow; each institution defines its own process engine (see PART XCII).

### LXXXIX.2 Configuration and explicit authorization

Where any of the above would otherwise be hard-coded, Circle uses configuration entries with explicit authorization. Every configuration entry has: owner, authorization basis, effective date, verification status, and audit trail.

### LXXXIX.3 Verification gate

A configuration entry that has not been verified must not be enabled in production. "Verified" means: (a) the institution that owns the configuration has confirmed it, (b) the configuration is consistent with the institution's published authority, and (c) the integration has been tested under the security testing catalogue of PART LXXXIII.

### LXXXIX.4 No silent fallback

Where a configuration is missing or unverifiable, Circle must fail closed. It must not fall back to a hard-coded default that assumes an authority Circle does not have. Failing closed produces a clear, audited error rather than an unauthorized action.

---

## PART XC — Government Registry

### XC.1 GOVERNMENT INSTITUTION REGISTRY

Circle maintains a configurable **GOVERNMENT INSTITUTION REGISTRY**. The registry is the authoritative source for "which institutions exist, with what authority, providing what services, through what channels, with what integration status."

### XC.2 Registry entry schema

Each registry entry contains:

| Field | Description |
|---|---|
| Institution | Official name and stable identifier of the institution. |
| Authority | The legal authority under which the institution operates. |
| Services | The services the institution owns and provides. |
| Official channels | The official contact, intake, and dispatch channels of the institution. |
| Integrations | The integrations Circle has with the institution's systems, with status. |
| Status | Active, suspended, deprecated, or pending verification. |
| Data classification | The default data classification of the institution's data. |
| Last verification | The timestamp of the most recent verification of the registry entry. |
| Effective date | The date from which the registry entry is in force. |

### XC.3 Registry governance

- The registry is administered jointly: Circle maintains the registry, institutions own their entries.
- An institution may update its own entry subject to verification by an authorized institutional officer.
- A registry entry may not be enabled for production routing until verified.
- The registry itself is audited at the Independent Audit Plane.

### XC.4 Use of the registry

The Policy Engine, the Routing layer, the Integration Gateway, and the SLA Surface all consume the registry. Routing decisions are made only against verified registry entries. Unverified entries may exist in the registry (for planning purposes) but cannot be used for live routing.

### XC.5 Examples (illustrative, not authoritative)

The following are illustrative entry shapes only. They are not authorizations; they are templates subject to verification per PART LXXXIX.

| Institution | Authority | Services | Official channels | Integrations | Status | Data classification |
|---|---|---|---|---|---|---|
| ACA | Statutory anti-corruption mandate | Integrity signals, investigations, findings | ACA secure intake | ACA sovereign workspace | Pending verification | Restricted |
| Police | Law enforcement mandate | Emergency response, investigations | Police dispatch | Police sovereign workspace | Pending verification | Restricted |
| EMS | Health emergency mandate | Medical dispatch and treatment | EMS dispatch | EMS sovereign workspace | Pending verification | Restricted health data |
| Civil Protection | Civil protection mandate | Disaster response | CP dispatch | CP sovereign workspace | Pending verification | Restricted |
| Traffic Authority | Transportation mandate | Traffic incidents | Traffic operations | Traffic sovereign workspace | Pending verification | Restricted |
| Tax Authority | Tax administration mandate | Tax processing | Tax portal | Tax integration | Pending verification | Restricted financial |
| Customs (NAFEZA) | Customs mandate | Customs operations | NAFEZA | NAFEZA integration | Pending verification | Restricted |
| Courts | Judicial mandate | Court proceedings | Court portal | Court integration | Pending verification | Restricted judicial |
| ETA | Digital-government authority | Digital-government services | ETA portal | ETA integration | Pending verification | Restricted |

These are illustrative and explicitly subject to verification. They do not constitute claims of existing integration; they describe the shape of registry entries once verified.

---

## PART XCI — Service Ownership

### XCI.1 Per-service ownership record

Each service integrated with or surfaced through Circle maps to:

| Field | Description |
|---|---|
| Owner institution | The institution that owns the service. |
| Responsible department | The specific department or unit within the institution. |
| Official system | The official system of record for the service (which may be the institution's own existing system, not Circle). |
| SLA | The service's SLA, per PART LXXXVII. |
| Escalation | The service's escalation policy. |
| Contact | The operational and security contact points for the service. |
| Integration state | The current state of Circle's integration with the official system (none, planned, in-test, live, suspended, deprecated). |

### XCI.2 Integration state machine

Integration states are explicit:

- `none` — no integration exists.
- `planned` — integration is intended but not yet started.
- `in-test` — integration is being tested under PART LXXXIII.
- `live` — integration is operational and verified.
- `suspended` — integration is temporarily disabled by the institution.
- `deprecated` — integration is being retired.

A service may not be routed through Circle while its integration state is not `live`. A `live` state requires verification under PART LXXXIX and successful security testing under PART LXXXIII.

### XCI.3 Ownership does not transfer to Circle

Service ownership, including ownership of the official system of record, does not transfer to Circle. Circle's role is to route, integrate, orchestrate, and provide intelligence around the official system. The official system remains authoritative (Rule 18, PART CXVI).

---

## PART XCII — Institutional Workflow Engine

### XCII.1 Prohibition of universal workflow

Circle must not impose a single universal workflow on all institutions. A universal workflow would contradict institutional sovereignty, because different institutions have legitimately different operational processes, legal mandates, and case structures.

### XCII.2 Per-institution workflow engines

Each institution defines its own process engine. Circle provides a workflow framework that institutions configure; it does not provide a fixed workflow that institutions must adopt.

### XCII.3 Illustrative workflow patterns

The following patterns are illustrative examples of institution-defined workflows. They are not defaults imposed by Circle; they are templates institutions may adopt or replace.

#### XCII.3.1 ACA

```text
Signal → Case → Investigation → Finding → Recommendation → Reform
```

- **Signal**: a permitted integrity signal received via secure intake.
- **Case**: an ACA case is opened; confidentiality applies immediately.
- **Investigation**: ACA investigators work the case within the ACA sovereign workspace.
- **Finding**: an evidence-backed finding is produced.
- **Recommendation**: a recommendation is issued to the competent authority.
- **Reform**: where authorized, a reform track is opened and tracked.

#### XCII.3.2 Police

```text
Emergency → Dispatch → Incident → Investigation → Case → Referral
```

- **Emergency**: an emergency call or signal is received.
- **Dispatch**: police units are dispatched.
- **Incident**: an incident is recorded in the Police system of record.
- **Investigation**: investigation proceeds within the Police sovereign workspace.
- **Case**: a case is opened where applicable.
- **Referral**: where required, the case is referred (e.g., to prosecution, or to ACA where integrity issues are suspected).

#### XCII.3.3 EMS

```text
Emergency → Dispatch → Response → Treatment → Handoff
```

- **Emergency**: a medical emergency is received.
- **Dispatch**: EMS units are dispatched.
- **Response**: on-scene response.
- **Treatment**: treatment provided.
- **Handoff**: handoff to a health facility, with appropriate health-data controls.

#### XCII.3.4 Utilities

```text
Fault → Work Order → Dispatch → Repair → Verification
```

- **Fault**: a fault is reported.
- **Work Order**: a work order is created in the utility's system.
- **Dispatch**: a crew is dispatched.
- **Repair**: repair is performed.
- **Verification**: repair is verified and the fault closed.

#### XCII.3.5 Government licensing

```text
Application → Review → Inspection → Decision → Issuance
```

- **Application**: an application is submitted.
- **Review**: the application is reviewed.
- **Inspection**: an inspection is conducted where applicable.
- **Decision**: a decision is made.
- **Issuance**: where the decision is positive, a license or permit is issued.

### XCII.4 Workflow isolation

An ACA case must never be visible in a Police workflow, an EMS workflow, or a citizen-facing workflow, except where ACA explicitly authorizes a referral. Likewise, a Police case must never be visible in an EMS workflow except through a controlled inter-agency exchange. The workflow engines are isolated by institutional boundary; correlation (PART C) is reference-only, not data fusion.

---

## PART XCIII — Shared Circle Capabilities vs Institution-Specific Capabilities

### XCIII.1 Separation principle

Circle's platform is composed of two layers: (a) **shared infrastructure**, which is common across institutions and supports the federation; and (b) **institution-specific capabilities**, which belong to individual institutions and must not be assumed or absorbed by Circle's shared layer. The two must not be blurred.

### XCIII.2 Shared infrastructure

The following capabilities are shared infrastructure:

| Shared capability | Description |
|---|---|
| Identity foundation | Federated identity services, including citizen identity and institutional identity federation. |
| Federation | The federation fabric connecting institutions. |
| Notifications | Cross-institution notification infrastructure. |
| Maps | Map and geospatial services. |
| Messaging infrastructure | Message transport between citizens, institutions, and systems. |
| Document infrastructure | Document storage, rendering, signing, and integrity services. |
| Security | Zero-trust enforcement, HSM, PKI, secure enclaves. |
| Audit | Per-institution audit environments and the Independent Audit Plane. |
| Translation | Multilingual translation across surfaces. |
| Integration gateway | The gateway through which institutions connect to their own systems. |

### XCIII.3 Institution-specific capabilities

The following capabilities are institution-specific and remain owned by their respective institutions:

| Institution-specific capability | Owner |
|---|---|
| ACA investigation | ACA |
| Police dispatch | Police |
| EMS medical workflow | EMS |
| Civil Protection response | Civil Protection |
| Tax processing | Tax Authority |
| Customs operations | NAFEZA |
| Court proceedings | Courts |

### XCIII.4 Prohibition of blurring

Circle's shared infrastructure must not implement an institution-specific capability as if it were shared. For example:

- Circle must not implement a Police dispatch engine in the shared layer; dispatch belongs to Police.
- Circle must not implement an EMS medical workflow in the shared layer; medical workflow belongs to EMS.
- Circle must not implement an ACA investigation engine in the shared layer; investigation belongs to ACA.

The shared layer provides infrastructure (identity, federation, notifications, maps, messaging, documents, security, audit, translation, integration gateway). The institution-specific layer provides the operational capability that runs on top of and beside that infrastructure.

### XCIII.5 Commercial implication

The separation has a direct commercial implication (developed in PART CX through PART CXII): Circle does not charge an institution for an institution-specific capability the institution already owns; Circle charges for shared infrastructure, integration, intelligence, orchestration, evidence, and governance layered around that capability.

---

## PART XCIV — Shared Infrastructure Does Not Mean Shared Data

### XCIV.1 Principle

A common Circle technology stack does not imply common database access. Shared infrastructure is shared at the level of platform services, not at the level of data access.

### XCIV.2 Hard-coded distinction

The distinction between shared infrastructure and shared data is hard-coded in the architecture:

- Storage is tenant-isolated per institution.
- AI inference is tenant-isolated; cross-tenant retrieval is explicit, authorized, and logged.
- Search indices are tenant-isolated; cross-institution search requires explicit authorization.
- Vector stores are tenant-isolated; cross-institution vector queries are prohibited unless explicitly authorized.
- Messaging is routed; routing is policy-controlled; payloads are not accessible to other tenants by default.
- Audit stores are per-institution (PART LXXXV).

### XCIV.3 Consequence

Even where two institutions run on the same Circle infrastructure, neither can access the other's data without an explicit, authorized, audited cross-institution exchange. Shared infrastructure is a platform convenience, not a data-sharing mandate.

### XCIV.4 Enforcement

This distinction is enforced at multiple layers: network isolation, storage encryption with institution-specific keys, identity-scoped authorization, policy decision points, and audit. Violations are detected by the security testing catalogue (ST-03, ST-04) and surfaced in the Independent Audit Plane.

---

## PART XCV — Shared Identity Foundation Does Not Mean Shared Privilege

### XCV.1 Principle

A federated identity system can authenticate a person across institutions, but authorization remains institution-specific. Authentication is shared; authorization is not.

### XCV.2 Authentication vs authorization

- **Authentication** establishes who the principal is. Circle's identity foundation may authenticate a citizen across multiple institutional surfaces.
- **Authorization** establishes what the principal may do in a given institution. Authorization is governed by each institution's policy, not by the shared identity foundation.

### XCV.3 Consequence

A principal authenticated by the shared identity foundation does not, by virtue of that authentication alone, gain any institutional privilege. Each institutional action requires a separate authorization decision by the institution's Policy Decision Point.

### XCV.4 Example

A citizen authenticated to Circle may submit a service request that is routed to the Tax Authority. The citizen's authentication does not grant the citizen any privilege inside the Tax Authority's systems. The Tax Authority's own policy governs what the citizen may do, what data the citizen may see, and what actions the citizen may initiate.

### XCV.5 ACA-specific reinforcement

For ACA, this principle is reinforced absolutely: a citizen authenticated to Circle gains no visibility into ACA whatsoever. ACA agents are provisioned by ACA (Rule 9); there is no path from Circle citizen authentication to ACA privilege.

---

## PART XCVI — Citizen Account ≠ Government Account

### XCVI.1 Explicit distinction

The following identities are distinct and must not be conflated:

- **Citizen Circle ID**: the identity a citizen uses to interact with Circle's public-facing surfaces.
- **Government institutional identity**: the identity an institution issues to its own personnel for use within that institution's systems.
- **ACA identity**: the identity ACA issues to ACA agents; distinct from other government institutional identities unless ACA provisions it.

### XCVI.2 Non-equivalence chain

```text
Citizen Circle ID
        ≠
Government institutional identity
        ≠
ACA identity (unless ACA provisions it)
```

### XCVI.3 Operational consequence

- A citizen Circle ID does not grant any institutional privilege.
- A government institutional identity does not grant ACA privilege unless ACA provisions it.
- An ACA agent identity is provisioned by ACA, scoped to ACA's sovereign workspace, and does not automatically grant privilege in other institutions.
- Identity federation may allow a single principal to hold multiple identities across multiple institutions; this does not collapse those identities into one.

### XCVI.4 Implementation

Identity federation is implemented such that:

- Each institutional identity is issued by the institution.
- Federation allows authenticated traversal where the institution authorizes it.
- No identity, however federated, grants cross-institutional privilege without that institution's explicit authorization.

---

## PART XCVII — Public-to-Government Data Flow

### XCVII.1 Standard flow

The standard public-to-government data flow is:

```text
Citizen
   │
   ▼
Circle
   │
   ▼
Classification / Routing
   │
   ▼
Authorized Institution
   │
   ▼
Official Institutional System
   │
   ▼
Response
   │
   ▼
Circle Citizen-Facing Status (where supported)
```

### XCVII.2 Stage requirements

- **Citizen → Circle**: the citizen interacts with Circle's public-facing surfaces using a Citizen Circle ID. Circle receives the request, signs it, and creates a provenance record.
- **Circle → Classification / Routing**: Circle classifies the request (emergency, service, integrity signal, etc.) and routes it. Classification does not grant privilege; it determines routing.
- **Classification / Routing → Authorized Institution**: routing delivers the request to the institution that owns the corresponding service, per the Government Registry. Mis-routed requests must not be silently retained by other institutions.
- **Authorized Institution → Official Institutional System**: the institution accepts the request into its own official system of record. From this point, the institution's own process governs.
- **Official Institutional System → Response**: the institution produces a response through its own processes.
- **Response → Circle Citizen-Facing Status (where supported)**: where the institution authorizes it, Circle surfaces a citizen-facing status. Where it does not, Circle surfaces only confirmation that the request was routed.

### XCVII.3 ACA exception

The public-to-government flow must not route a citizen directly into ACA's environment. ACA-bound signals follow the ACA data flow defined in PART XCIX, which is fundamentally different from this standard public-to-government flow.

### XCVII.4 Privacy constraint

Circle must not retain citizen-submitted data beyond what is necessary for routing, provenance, and the citizen-facing status surface. Retention follows purpose + policy + law + operational requirement (PART CVII).

---

## PART XCVIII — Government-to-Government Data Flow

### XCVIII.1 Standard flow

The standard government-to-government data flow is:

```text
Institution A
   │
   ▼
Authorized Request / Referral
   │
   ▼
Federation Gateway
   │
   ▼
Institution B
   │
   ▼
Permitted Response
   │
   ▼
Provenance
   │
   ▼
Institution A
```

### XCVIII.2 Stage requirements

- **Institution A → Authorized Request / Referral**: Institution A initiates a request or referral to Institution B. The request must be authorized under Institution A's policy and under the inter-agency policy.
- **Authorized Request / Referral → Federation Gateway**: the request passes through the Federation Gateway, which evaluates policy, signs the request, and records it in the INTER-AGENCY EXCHANGE AUDIT.
- **Federation Gateway → Institution B**: the gateway delivers the request to Institution B's sovereign workspace.
- **Institution B → Permitted Response**: Institution B evaluates the request under its own policy and produces a permitted response. Institution B may refuse; refusal is itself an audited event.
- **Permitted Response → Provenance**: the response is annotated with provenance: who responded, under what authorization, with what payload hash, at what time.
- **Provenance → Institution A**: Institution A receives the response with provenance. Institution A may use the response within its own processes; it may not redistribute it outside the authorization scope.

### XCVIII.3 Asymmetry

Government-to-government exchange is not symmetric by default. Institution A may be permitted to request something from Institution B that Institution B is not permitted to request from Institution A. Each direction is governed by its own policy.

### XCVIII.4 ACA-specific reinforcement

Where either Institution A or Institution B is ACA, additional constraints apply per PART XCIX. ACA is never a silent participant in a government-to-government exchange; ACA's involvement is always explicit, authorized, and audited at ACA confidentiality level.

---

## PART XCIX — ACA Data Flow

### XCIX.1 Permitted flow

The permitted ACA data flow is:

```text
Citizen / Other Authority
   │
   ▼
Permitted ACA Signal / Referral
   │
   ▼
ACA Secure Intake
   │
   ▼
ACA Case
   │
   ▼
ACA Intelligence
   │
   ▼
ACA Finding / Action
```

### XCIX.2 Stage requirements

- **Citizen / Other Authority → Permitted ACA Signal / Referral**: a citizen, another institution, or another competent authority may submit a permitted integrity signal or referral to ACA. The signal is permitted only if it falls within ACA's mandate and is submitted through an authorized channel.
- **Permitted ACA Signal / Referral → ACA Secure Intake**: the signal enters ACA's secure intake. From this point, ACA's confidentiality applies.
- **ACA Secure Intake → ACA Case**: ACA decides whether to open a case. The decision is recorded within ACA's sovereign workspace.
- **ACA Case → ACA Intelligence**: ACA develops intelligence within its sovereign workspace. Intelligence is not visible outside ACA except through ACA's authorized disclosure.
- **ACA Intelligence → ACA Finding / Action**: ACA produces a finding or takes an action within its mandate.

### XCIX.3 Prohibited flow

The following flow is prohibited:

```text
Citizen → Unrestricted ACA Database
```

A citizen must never have direct, indirect, or inferential access to ACA's database. This includes:

- No citizen-facing query of ACA cases.
- No citizen-facing visibility into ACA intelligence.
- No citizen-facing visibility into ACA findings before ACA authorizes disclosure.
- No inferential exposure (e.g., timing, error messages, presence indicators) that would reveal the existence or absence of an ACA case.

### XCIX.4 Referral out of ACA

Where ACA determines that a matter is not within its mandate, ACA may refer the matter to the competent institution (e.g., to Police, to EMS, to a service authority). Such referrals follow the government-to-government flow (PART XCVIII), with the additional constraint that ACA's involvement in the referred matter is not disclosed to the citizen unless ACA authorizes it.

### XCIX.5 Referral into ACA

Where another institution identifies a potential integrity issue within ACA's mandate, that institution may refer the matter to ACA. The referring institution does not retain visibility into the ACA case; ACA's confidentiality applies from the moment of intake.

---

## PART C — Institutional Case Correlation

### C.1 Correlation is reference-only

A common correlation/reference mechanism may identify that "these institutional records may refer to the same underlying event." This mechanism produces references, not data fusion. Each institution maintains its own case.

### C.2 Correlation identifier

Circle provides a **Correlation Reference** capability: a stable identifier that links records across institutions without merging the records. A Correlation Reference records:

- The set of institutional records it links.
- For each record: the institution that owns it, the record identifier within that institution, and a hash (not the contents).
- The provenance of the correlation (who proposed it, on what basis, at what time).
- The authorization under which the correlation was created.

### C.3 What correlation does not do

Correlation does not:

- Merge the linked records into a single record.
- Grant any institution access to another institution's record.
- Bypass institutional confidentiality (especially ACA's).
- Surface the existence of a confidential case to unauthorized parties.

### C.4 Example

A traffic incident, a Police incident, and an EMS incident may all refer to the same underlying event. A Correlation Reference links the three records. The Police officer sees the Police record; the EMS responder sees the EMS record; the Traffic operator sees the Traffic record. Each may, where authorized, see that a Correlation Reference exists; none automatically sees the contents of the others' records.

### C.5 ACA and correlation

ACA cases may participate in correlations only under ACA's explicit authorization. The existence of an ACA case is not visible through correlation to non-ACA principals.

---

## PART CI — Federated Incident ID

### CI.1 FEDERATED INCIDENT REFERENCE

Where useful, Circle provides a **FEDERATED INCIDENT REFERENCE** to connect related incidents across emergency institutions without forcing those systems to become one database.

### CI.2 Linked incident types

A Federated Incident Reference may connect:

```text
Police Incident  ↔  EMS Incident  ↔  Fire Incident  ↔  Traffic Incident
```

### CI.3 Properties

- A Federated Incident Reference is a reference, not a merged incident.
- Each institution retains its own incident record, its own investigators, its own confidentiality, and its own system of record.
- The reference is created only where authorized; it is not created automatically for every co-occurring incident.
- Access to the reference is governed by the same policy as the underlying incident records.

### CI.4 Operational use

A Federated Incident Reference supports:

- Coordinated dispatch decisions (e.g., where Police, EMS, and Fire all need to respond).
- After-action chronology assembly (PART CIII).
- Aggregate analytics where authorized (PART CV).

### CI.5 What it is not

A Federated Incident Reference is not:

- A merged case file.
- A shared database.
- A waiver of institutional confidentiality.
- An authorization for one institution to read another's incident record.

---

## PART CII — Multi-Agency Emergency

### CII.1 Multi-agency incidents

A major incident may involve multiple agencies simultaneously:

```text
        Police
          │
          ├─ EMS
          │
          ├─ Civil Protection
          │
          └─ Traffic
```

### CII.2 Operational sovereignty preserved

Each agency remains operationally sovereign in a multi-agency emergency:

- Police retain command of police operations.
- EMS retain command of medical operations.
- Civil Protection retain command of civil-protection operations.
- Traffic retain command of traffic operations.

Circle does not merge these commands. Circle does not impose a single unified command structure. Operational command belongs to the institutions.

### CII.3 Circle's role in multi-agency emergency

Circle provides:

- A Federated Incident Reference (PART CI) to link the per-agency incidents.
- Controlled information exchange (PART XCVIII) for authorized cross-agency data sharing.
- Coordinated routing of citizen signals so that a single citizen report does not need to be filed separately with each agency.
- After-action federation (PART CIII) to assemble authorized chronology.

### CII.4 Boundary preservation

Even in a multi-agency emergency:

- An EMS responder does not gain Police intelligence access.
- A Police officer does not gain Civil Protection operational command.
- A Traffic operator does not gain EMS health-data access.
- ACA, if involved, retains full confidentiality; ACA's involvement is not visible to non-ACA principals unless ACA authorizes disclosure.

### CII.5 Emergency override

Emergency override, where it exists, is institution-owned and policy-controlled. Circle does not grant itself emergency override authority. Any override must be declared, authorized, time-limited, audited, and reviewed after the emergency.

---

## PART CIII — After-Action Federation

### CIII.1 Per-authority official reports

After a major incident, each authority retains its own official report:

- Police produce the Police official report.
- EMS produce the EMS official report.
- Civil Protection produce the Civil Protection official report.
- Traffic produce the Traffic official report.
- ACA, if involved, produces the ACA official report, under ACA confidentiality.

Circle does not produce a single merged official report. Circle does not replace the authorities' official reports.

### CIII.2 Authorized cross-institution chronology

Where authorized by each participating authority, Circle may assemble a cross-institution chronology/analytics view that:

- Pulls together authorized excerpts from each authority's report.
- Preserves provenance for every excerpt.
- Respects each authority's confidentiality constraints.
- Is itself audited at the INTER-AGENCY EXCHANGE AUDIT.

### CIII.3 Authorization model

The chronology is assembled only where each participating authority explicitly authorizes its contribution. An authority may decline to contribute; declining does not block the chronology from being assembled from other authorities' authorized contributions, but the chronology must visibly indicate which authorities declined.

### CIII.4 Use of the chronology

The authorized chronology may be used for:

- Internal review and lessons-learned exercises.
- Aggregate analytics (PART CV) where authorized.
- ACA systemic correlation (PART CIV) where ACA receives a permitted signal.
- Oversight reviews under legally authorized oversight.

### CIII.5 ACA in chronologies

Where ACA participates in a chronology, ACA's contribution is governed by ACA's confidentiality. ACA's contribution, if any, is visible only where ACA authorizes it. ACA may decline to contribute; declining is itself an audited event recorded within ACA's audit environment, not in the cross-institution chronology.

---

## PART CIV — ACA Systemic Correlation

### CIV.1 Permitted systemic signal

ACA may receive a high-level systemic signal of the form:

> "Same government facility has repeated emergency/service issues."

This signal is permitted because it indicates a potential systemic integrity concern within ACA's mandate.

### CIV.2 What the signal does not expose

This signal does **not** automatically expose:

- The contents of unrelated emergency-system records.
- The identities of citizens involved in those emergency events.
- The contents of Police, EMS, Civil Protection, or Traffic case files.
- Any data not explicitly authorized for ACA intake.

The signal is a high-level reference, not a data transfer.

### CIV.3 Mechanism

The systemic signal is produced by an authorized aggregation process. That process:

- Operates under the policy of the source institution(s).
- Produces only an aggregate, referenced signal.
- Does not transfer underlying records to ACA.
- Records provenance: source institution, aggregation rule, time, authorization.

ACA receives the signal into its secure intake (PART XCIX). ACA decides whether to open a case. The decision is recorded within ACA's sovereign workspace.

### CIV.4 Boundary preservation

If ACA decides to investigate, ACA may request specific information through the government-to-government flow (PART XCVIII). Each such request is separately authorized and audited. The systemic signal does not grant ACA blanket access to the source institution's records.

### CIV.5 No automatic escalation

The systemic signal does not automatically escalate into an ACA case. ACA's intake, triage, and case-opening processes remain ACA's own. Circle does not push ACA into opening cases; Circle delivers permitted signals.

---

## PART CV — Public Transparency

### CV.1 Authorized aggregate transparency

Where authorized by the relevant institution(s), Circle may surface citizen-facing aggregate transparency, including:

- **Service performance** — aggregate indicators of service performance.
- **Response times** — aggregate response-time indicators.
- **Improvements** — declared improvement initiatives and their status.
- **Outcomes** — aggregate outcome indicators where publication is authorized.

### CV.2 What transparency must never expose

Transparency must never expose:

- Confidential institutional data.
- Personal data of citizens, beyond what they themselves submitted.
- ACA investigations, findings, intelligence, or protected identities.
- Police intelligence, ongoing investigations, or protected identities.
- EMS health data.
- Civil Protection operational data beyond authorized aggregates.
- Any data not explicitly authorized for publication.

### CV.3 Authorization model

Each transparency surface is authorized by the institution that owns the underlying data. Authorization is:

- Per-data-class.
- Per-aggregation-rule.
- Per-publication-target.
- Time-bounded and revocable.
- Audited.

### CV.4 Default state

The default state for any institutional data is non-publication. Publication requires explicit authorization; the absence of authorization means non-publication. There is no "transparency by default" for institutional data.

### CV.5 Differentially private aggregates

Where Circle produces aggregate analytics for transparency, the aggregation mechanism must apply differential-privacy or equivalent protection so that no individual can be re-identified from the aggregate. The aggregation mechanism is itself audited.

---

## PART CVI — Institutional Privacy

### CVI.1 What a citizen must not be able to determine

A citizen must not be able to determine, from Circle, any of the following:

- **Which confidential ACA investigation exists.**
- **Which Police intelligence case exists.**
- **Which restricted evidence exists.**
- **Which protected identity exists.**

### CVI.2 Inferential protection

The prohibition applies not only to direct queries but to inferential exposure. Circle must not permit:

- Timing-based inference (e.g., whether a request was processed faster or slower because of an ACA case).
- Error-message-based inference (e.g., differences in error messages that reveal the existence of a confidential case).
- Presence-based inference (e.g., a UI indicator that suggests a confidential case exists).
- Correlation-based inference (e.g., correlations that reveal the existence of a confidential case through side channels).
- Volume-based inference (e.g., aggregate metrics that allow a citizen to deduce a confidential case).

### CVI.3 Implementation

Institutional privacy is implemented through:

- Strict tenant isolation (PART XCIV).
- Identity-scoped authorization (PART XCV).
- Policy-controlled cross-institution exchange (PART XCVIII).
- Default non-disclosure (PART CV).
- Differential-privacy on any authorized aggregate (PART CV).
- Security testing against inference (ST-04 cross-tenant leakage).

### CVI.4 ACA absolute case

For ACA, this principle is absolute. No citizen-facing surface, no aggregate, no error message, no timing, no presence indicator may reveal the existence or absence of an ACA case. This is tested explicitly under ST-03 (data boundary violation) and ST-04 (cross-tenant leakage), with ACA-specific test cases.

---

## PART CVII — Emergency Privacy

### CVII.1 Prohibition on unnecessary retention

Circle must not retain unnecessary medical or emergency information simply because Circle transmitted it. Transmission does not justify retention.

### CVII.2 Retention rule

Retention follows:

> **purpose + policy + law + operational requirement**

- **Purpose**: the purpose for which the data was collected and transmitted. Retention must serve that purpose.
- **Policy**: the institution's retention policy. Retention must comply with it.
- **Law**: applicable legal retention requirements (e.g., health-data law, emergency-services law).
- **Operational requirement**: legitimate operational needs (e.g., after-action review, regulatory reporting), narrowly scoped.

Where any of these is absent, retention is not justified.

### CVII.3 Operational consequence

- A medical symptom reported to Circle for routing to EMS is retained only as long as needed for routing, provenance, and authorized status-surfacing, then deleted or anonymized according to EMS retention policy.
- An emergency location is retained only as long as needed for the emergency response, plus the after-action window authorized by EMS policy.
- A citizen's identity is retained according to citizen-account retention policy, separately from emergency-specific data.
- Health data must not be retained in citizen-account profiles unless the citizen explicitly authorizes a health-profile feature and the feature complies with health-data law.

### CVII.4 ACA and emergency privacy

Where ACA becomes aware of emergency data through a permitted systemic signal (PART CIV), ACA's retention follows ACA's own retention rules. ACA does not retain underlying emergency data; ACA retains the permitted signal and any authorized ACA-specific records it produces.

### CVII.5 Right to deletion

Where retention is not justified by purpose + policy + law + operational requirement, the data must be deleted or anonymized. The deletion event is recorded at the Independent Audit Plane. For sealed evidence, deletion follows the supersession rules of PART LXXXVI, not a normal delete operation.

---

## PART CVIII — Government Procurement Positioning

### CVIII.1 Core statement

The blueprint explicitly states:

> **Circle is an interoperability and institutional-intelligence platform, not a mandatory replacement for Egypt's existing digital-government systems.**

This is a core commercial and architecture statement. It governs how Circle is positioned for government procurement, how contracts are structured, and how Circle's role is described in institutional engagements.

### CVIII.2 Architectural implications

- Circle does not claim to replace ETA, NAFEZA, the Tax Authority's systems, the Courts' systems, Police systems, EMS systems, Civil Protection systems, or ACA systems.
- Circle's value to government is interoperability, citizen access, orchestration, intelligence, evidence, and governance layered around those existing systems.
- Existing systems remain authoritative (Rule 18).
- Existing systems remain operated by their institutions (Rule 2).

### CVIII.3 Commercial implications

- Circle does not charge an institution for replacing a system the institution already owns.
- Circle charges for the institutional layer: environment, integration, intelligence, orchestration, evidence, analytics, security, AI governance, support, training, continuity (PART CX).
- Circle's contracts are institution-specific (PART CXII).
- Citizen-facing services remain free (PART CXIII).

### CVIII.4 Communication discipline

In all procurement, sales, and partnership communications, Circle must describe itself as an interoperability and institutional-intelligence platform. Circle must not describe itself as a replacement for existing government systems, even where such a description might appear commercially convenient. Misrepresentation in this area is treated as a Rule 20 violation (no unsupported claims).

### CVIII.5 Sovereign context

This positioning reflects the sovereign context: Egypt's government institutions have their own systems, their own mandates, their own legal frameworks. Circle's role is to make the ecosystem easier for citizens to access and easier for institutions to interoperate, not to substitute for those institutions or their systems.

---

## PART CIX — Government Deployment Strategy

### CIX.1 Phased implementation

Government adoption of Circle is recommended in phases. Each phase produces value without requiring institutions to replace their existing systems.

#### CIX.1.1 Phase 1 — Directory + referral

- Deploy the Government Institution Registry (PART XC) as a verified directory of institutions, services, channels, and integration states.
- Enable referral: Circle can route a citizen signal to the competent institution, even where no deep integration exists.
- Outcome: citizens can find the right door; institutions gain visibility of inbound referrals.

#### CIX.1.2 Phase 2 — Citizen service routing

- Deploy citizen service routing on top of the registry.
- Enable classification (emergency, service, integrity signal) and routing.
- Outcome: a citizen's request is routed to the competent institution through the right channel.

#### CIX.1.3 Phase 3 — Operational integration

- Deploy the Integration Gateway.
- Connect to institutions that have agreed to operational integration.
- Enable authorized inter-institution exchange (PART XCVIII).
- Outcome: institutions can exchange authorized information through Circle's federation fabric.

#### CIX.1.4 Phase 4 — Institutional workspaces

- Deploy institutional sovereign workspaces for institutions that have contracted for them.
- Enable per-institution workflow engines (PART XCII).
- Outcome: each institution has its own secure workspace on Circle's shared infrastructure, with strict tenant isolation.

#### CIX.1.5 Phase 5 — Institutional intelligence

- Deploy intelligence capabilities (evidence, timeline, analytics) inside each institutional workspace.
- Enable AI governance (autonomy levels, prompt-injection firewall, provenance).
- Outcome: each institution gains intelligence capabilities within its own sovereign workspace.

#### CIX.1.6 Phase 6 — Federated analytics where authorized

- Deploy federated analytics where each participating institution authorizes it.
- Enable authorized cross-institution chronology (PART CIII) and authorized aggregate transparency (PART CV).
- Outcome: authorized analytics support oversight, lessons-learned, and citizen transparency without breaching institutional confidentiality.

### CIX.2 Non-replacement principle per phase

No phase requires an institution to replace its existing systems. An institution may adopt Phase 1 (directory + referral) without adopting Phase 4 (institutional workspace). An institution may adopt Phase 3 (operational integration) for a specific service without adopting Phase 5 (institutional intelligence) for that service. Adoption is per-institution and per-service.

### CIX.3 Phase gates

Each phase has entry and exit gates:

- Entry gate: institutions that will participate have signed the relevant contract scope; security testing for the phase is in place.
- Exit gate: phase outcomes are met; integration state for each participating institution is `live`; Independent Audit Plane records phase completion.

### CIX.4 No silent phase acceleration

A phase may not be silently accelerated. If Phase 3 is not yet complete, Phase 4 capabilities must not silently operate as if Phase 3 were complete. Phase boundaries are explicit and audited.

### CIX.5 Government adoption without replacement

This phased strategy allows government adoption of Circle without asking institutions to replace existing systems. An institution that wishes to retain its existing system of record may do so; Circle integrates around it, not in place of it.

---

## PART CX — Commercial Model

### CX.1 Non-duplication principle

Circle must not charge a government institution for functionality that merely duplicates a system the institution already owns. Charging for duplication would contradict the procurement positioning (PART CVIII) and would erode institutional trust.

### CX.2 Chargeable categories

Circle charges government institutions for the following categories of value:

| Category | Description |
|---|---|
| Circle institutional environment | The sovereign workspace per institution, including tenant isolation, audit, and policy enforcement. |
| Implementation | Deployment, configuration, verification, and integration services. |
| Integration | The Integration Gateway, including adapters to the institution's existing systems, where authorized. |
| Intelligence | Evidence, timeline, and analytics capabilities within the institutional workspace. |
| Orchestration | Cross-service, cross-institution orchestration where the institution authorizes it. |
| Evidence | Evidence lifecycle: capture, sealing, provenance, integrity, retention. |
| Analytics | Institutional analytics and authorized federated analytics. |
| Security | Zero-trust enforcement, HSM, PKI, secure enclaves, security testing. |
| AI governance | Autonomy levels, prompt-injection firewall, AI provenance, override controls. |
| Support | Operational support, incident response, integration support. |
| Training | Training of institutional personnel on Circle's institutional layer. |
| Continuity | Disaster recovery, business continuity, failover, and restoration services. |

### CX.3 Pricing principles

- Pricing is per institution and per scope (PART CXII).
- Pricing is transparent and documented in each institutional contract.
- Pricing does not include charges for duplicated functionality.
- Pricing may include usage-based components (e.g., evidence volume, integration volume) where the institution agrees.

### CX.4 No lock-in pricing

Circle does not impose lock-in pricing. An institution's data remains the institution's data (PART CXIV). Exit terms, including export of institutional data in usable form, must be specified in each contract.

### CX.5 Audit of charges

Charges are auditable. An institution may request an audit of the charges it has been billed, against the value delivered. Disputes are resolved under the contract's dispute-resolution terms, with reference to the Independent Audit Plane where relevant.

---

## PART CXI — No "ETA Replacement" Product

### CXI.1 Principle

If an institution already has a government system (e.g., ETA, NAFEZA, the Tax Authority's systems, the Courts' systems), Circle sells:

> **INTEGRATION + INTELLIGENCE + ORCHESTRATION**

not:

> **REPLACEMENT**

### CXI.2 What Circle sells around an existing system

- **Integration**: Circle's Integration Gateway connects to the existing system, with the existing system remaining authoritative.
- **Intelligence**: Circle provides evidence, timeline, and analytics capabilities around the existing system's data, within the institution's sovereign workspace.
- **Orchestration**: Circle orchestrates flows that span the existing system and other institutions or citizen surfaces, where authorized.

### CXI.3 What Circle does not sell

Circle does not sell a product that positions itself as a replacement for ETA, NAFEZA, or any other existing government system. Circle does not market itself as a "new ETA," "new NAFEZA," or "new [existing system]." Circle does not propose migrations that would make Circle the system of record for a function the existing system performs.

### CXI.4 Existing system remains authoritative

Where an existing system performs an official function (e.g., ETA performs digital-government services, NAFEZA performs customs operations), that existing system remains the authoritative system of record (Rule 18). Circle's role is to make that system easier for citizens to access and easier for institutions to interoperate with.

### CXI.5 Commercial consequence

The "no replacement" principle has a direct commercial consequence: an institution that already owns a system performing a function does not pay Circle to perform that function. The institution pays Circle for integration, intelligence, and orchestration around that function.

---

## PART CXII — Institution-Specific Commercial Contracts

### CXII.1 Per-institution contracting

Each institution is independently contracted. An institution's contract specifies:

- Scope of services Circle will provide to that institution.
- Integration scope (which existing systems Circle will integrate with, at what state).
- Intelligence scope (which intelligence capabilities will be deployed in the institutional workspace).
- Orchestration scope (which cross-institution flows the institution authorizes).
- SLA Surface configuration (PART LXXXVII).
- Retention and audit configuration.
- Pricing (per PART CX).
- Exit terms, including data export.
- Security and compliance commitments.

### CXII.2 Non-equivalence of contracts

Contracts are not equivalent across institutions:

```text
ACA contract   ≠   Police contract   ≠   EMS contract   ≠   Health contract
```

Each institution's contract reflects that institution's mandate, its data classification, its confidentiality requirements, its integration scope, and its authorized cross-institution exchanges.

### CXII.3 No automatic environment transfer

No institution automatically receives another institution's Circle environment. An institution's Circle environment is provisioned for that institution under that institution's contract. ACA's environment is not visible to Police; Police's environment is not visible to EMS; EMS's environment is not visible to Health.

### CXII.4 Cross-institution flow authorization

Where two institutions wish to exchange data through Circle's federation fabric, both institutions must authorize the exchange in their respective contracts (or via a contract addendum). The exchange is also subject to the inter-agency policy and the INTER-AGENCY EXCHANGE AUDIT (PART LXXXV).

### CXII.5 Contract audit

Each institutional contract is auditable. The Independent Audit Plane records: contract execution, scope changes, integration state changes, and termination. Contract terms themselves are not stored in the audit plane; only the operational events governed by the contract are recorded.

---

## PART CXIII — Consumer Services Remain Free

### CXIII.1 Free citizen-facing services

Citizen-facing Circle services remain free, according to Circle's existing business model. A citizen does not pay Circle to:

- Submit a service request.
- Route a signal to the competent institution.
- Track the citizen-facing status of a routed request.
- Use Circle's public-facing surfaces (social, service, citizen shield).

### CXIII.2 Government pays for the institutional layer

Government pays for the institutional layer: the sovereign workspaces, integration, intelligence, orchestration, evidence, analytics, security, AI governance, support, training, and continuity (PART CX). The institutional layer is the layer where institutions operate; the citizen-facing layer is the layer where citizens interact.

### CXIII.3 Boundary between free and paid

The boundary is clear:

- Citizen-facing surfaces: free.
- Institutional workspaces, integration, intelligence, orchestration, evidence, governance: paid by the institution.

A feature that spans both layers (e.g., citizen-facing status of a routed service request) is paid by the institution that authorizes the status-surfacing, not by the citizen.

### CXIII.4 No paywalls on citizen access

Circle must not introduce paywalls on citizen access to government services through Circle. Routing to the competent institution, status-surfacing where authorized, and basic transparency (PART CV) remain free to citizens.

### CXIII.5 Sustainability

The free citizen-facing layer is sustained by the institutional layer's commercial model. This is consistent with Circle's existing business model: the citizen-facing experience is supported by the value Circle provides to institutions.

---

## PART CXIV — Final Data Ownership Model

### CXIV.1 Per-data-object ownership record

For every data object in Circle's institutional layer, the following fields are defined:

| Field | Description |
|---|---|
| Source owner | The institution or principal that originally produced the data. |
| Operational system of record | The authoritative system that holds the official record (often an existing government system, not Circle). |
| Circle reference / derived data | The reference, derived, or aggregated data Circle holds (e.g., a routing record, a Correlation Reference, a federated incident reference). |
| Institutional user | The institutional principal(s) authorized to access the data within the institution. |
| Retention | The retention rule applied to the data, per PART CVII. |
| Export | The export rules and authorizations applicable to the data. |
| Legal basis | The legal basis under which the data is held, processed, and retained. |
| Audit | The audit environment(s) in which the data's lifecycle events are recorded. |

### CXIV.2 Examples

#### CXIV.2.1 Citizen service request

- Source owner: the citizen.
- Operational system of record: the competent institution's official system.
- Circle reference / derived data: the routing record, the citizen-facing status record.
- Institutional user: the institution's service-handling personnel.
- Retention: per the institution's retention policy.
- Export: subject to the institution's export authorization.
- Legal basis: the institution's service mandate and applicable citizen-data law.
- Audit: the institution's audit environment plus the INTER-AGENCY EXCHANGE AUDIT where applicable.

#### CXIV.2.2 Police incident

- Source owner: Police.
- Operational system of record: the Police system of record.
- Circle reference / derived data: any Correlation Reference, Federated Incident Reference, or authorized chronology excerpt.
- Institutional user: Police personnel authorized for the incident.
- Retention: per Police retention policy.
- Export: subject to Police export authorization.
- Legal basis: Police mandate and applicable law.
- Audit: Police audit environment; INTER-AGENCY EXCHANGE AUDIT for any cross-institution exchange.

#### CXIV.2.3 ACA case

- Source owner: ACA.
- Operational system of record: the ACA sovereign workspace.
- Circle reference / derived data: a permitted systemic signal reference (PART CIV), where authorized; no underlying case data leaves ACA.
- Institutional user: ACA agents provisioned by ACA.
- Retention: per ACA retention policy.
- Export: subject to ACA export authorization; default: no export.
- Legal basis: ACA mandate and applicable law.
- Audit: ACA audit environment; Independent Audit Plane for sealed evidence events.

#### CXIV.2.4 Federated Incident Reference

- Source owner: the institution that created the reference.
- Operational system of record: the reference itself (it is a reference, not a merged record).
- Circle reference / derived data: the reference and its provenance.
- Institutional user: each participating institution, scoped to its own incident record.
- Retention: per the participating institutions' retention policies.
- Export: subject to each participating institution's authorization.
- Legal basis: the legal basis of each underlying incident.
- Audit: INTER-AGENCY EXCHANGE AUDIT.

### CXIV.3 Default ownership

In the absence of an explicit ownership record, the default is: the institution that owns the operational system of record owns the data. Circle holds only references and derived data, and only as authorized. The default is conservative: when in doubt, the data belongs to the institution, not to Circle.

### CXIV.4 No silent ownership transfer

Ownership does not transfer to Circle merely because Circle processed, transmitted, or stored the data. Circle's processing of institutional data is governed by the institution's policy and contract; it does not confer ownership on Circle.

---

## PART CXV — Final Architecture Diagram

### CXV.1 The complete architecture

```text
                           CITIZENS
                              │
                              ▼
                     CIRCLE UNIVERSAL
                        PUBLIC LAYER
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
      SOCIAL                SERVICE            CITIZEN SHIELD
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    TRUST / IDENTITY LAYER
                              │
                 ROUTING / POLICY / CONSENT
                              │
               CIRCLE FEDERATION FABRIC
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
    GOVERNMENT             EMERGENCY             OVERSIGHT
     SERVICES             INSTITUTIONS            INSTITUTIONS
        │                     │                      │
        │          ┌──────────┼───────────┐          │
        │          │          │           │          │
        │        Police      EMS       Fire/Traffic  ACA
        │          │          │           │          │
        ▼          ▼          ▼           ▼          ▼
   THEIR OWN   THEIR OWN   THEIR OWN   THEIR OWN   ACA OWN
    SYSTEM      SYSTEM      SYSTEM      SYSTEM      SYSTEM
        │          │          │           │          │
        └──────────┴──────────┴───────────┴──────────┘
                              │
                  CONTROLLED INTER-AGENCY
                         EXCHANGE
                              │
                 GOVERNMENT SYSTEMS OF RECORD
```

### CXV.2 The foundational layer

Under everything:

```text
ZERO TRUST
+
INSTITUTIONAL DATA PLANES
+
IDENTITY
+
PKI
+
HSM
+
IMMUTABLE EVIDENCE
+
PROVENANCE
+
AI GOVERNANCE
+
AUDIT
+
PRIVACY
+
DISASTER RECOVERY
```

### CXV.3 How to read the diagram

- **CITIZENS** interact only with the **CIRCLE UNIVERSAL PUBLIC LAYER**. Citizens do not interact directly with institutional systems.
- The public layer fans out into **SOCIAL**, **SERVICE**, and **CITIZEN SHIELD** surfaces. Each surface has its own rules, but all share the Trust/Identity Layer.
- **TRUST / IDENTITY LAYER** authenticates the citizen (or institutional principal). Authentication does not grant privilege (PART XCV).
- **ROUTING / POLICY / CONSENT** classifies the request, evaluates policy via the PDP, and obtains consent where required.
- **CIRCLE FEDERATION FABRIC** carries the request to the competent institution. The fabric is policy-controlled and audited at the INTER-AGENCY EXCHANGE AUDIT.
- The fabric routes to **GOVERNMENT SERVICES**, **EMERGENCY INSTITUTIONS**, and **OVERSIGHT INSTITUTIONS**.
- Emergency institutions include **Police**, **EMS**, **Fire/Traffic**. Oversight institutions include **ACA**.
- Each institution connects to **THEIR OWN SYSTEM** (or **ACA OWN SYSTEM** for ACA). Circle does not replace those systems.
- **CONTROLLED INTER-AGENCY EXCHANGE** connects institutions to each other through the federation fabric, with policy and audit.
- **GOVERNMENT SYSTEMS OF RECORD** remain authoritative. They are the official systems; Circle is the interoperability layer around them.

### CXV.4 Foundational layer explanation

- **ZERO TRUST** governs every request: every request is authenticated, authorized, and audited; no implicit trust is granted based on network position.
- **INSTITUTIONAL DATA PLANES** keep each institution's data in its own plane; shared infrastructure does not mean shared data (PART XCIV).
- **IDENTITY** includes citizen identity, institutional identity federation, and ACA identity, kept distinct (PART XCVI).
- **PKI** and **HSM** provide the cryptographic backbone for signing, sealing, and attestation.
- **IMMUTABLE EVIDENCE** guarantees that sealed evidence cannot be altered by operational administrators (PART LXXXVI).
- **PROVENANCE** records the origin, transformation, and authorization of every data object.
- **AI GOVERNANCE** constrains AI action within autonomy levels, prompt-injection firewall, and provenance.
- **AUDIT** includes per-institution audit environments and the Independent Audit Plane.
- **PRIVACY** includes institutional privacy (PART CVI) and emergency privacy (PART CVII).
- **DISASTER RECOVERY** ensures continuity under partial failures, including failed integrations and offline operations.

---

## PART CXVI — Final Architectural Rules

The following twenty rules are hard requirements. They govern every architectural decision, every integration, every commercial engagement, and every release. Violations are blocking.

| Rule | Statement |
|---|---|
| Rule 1 | Circle does not replace government. |
| Rule 2 | Government institutions remain sovereign. |
| Rule 3 | Each institution has its own secure workspace. |
| Rule 4 | Each institution has its own system of record. |
| Rule 5 | Institutional permissions do not automatically cross boundaries. |
| Rule 6 | Government integrations require explicit authorization. |
| Rule 7 | Citizen Shield is the universal public-facing front door. |
| Rule 8 | ACA is confidential and invisible to ordinary users. |
| Rule 9 | ACA agents are provisioned by ACA. |
| Rule 10 | Emergency services are separate from ACA. |
| Rule 11 | Service authorities remain separate from ACA. |
| Rule 12 | Circle routes to the competent institution rather than absorbing its function. |
| Rule 13 | Federation does not mean centralization. |
| Rule 14 | Shared infrastructure does not imply shared data. |
| Rule 15 | AI does not inherit institutional authority. |
| Rule 16 | A government integration does not transfer ownership of the underlying government record to Circle. |
| Rule 17 | Every cross-boundary exchange is policy-controlled and audited. |
| Rule 18 | Existing Egyptian government systems remain authoritative where they already perform the official function. |
| Rule 19 | Circle adds interoperability, citizen access, orchestration, intelligence and evidence capabilities around those systems. |
| Rule 20 | No unsupported claim of legal authority, government API, certification or institutional integration may be inserted into the blueprint. |

### CXVI.1 Rule enforcement

- Each rule is enforced architecturally (in the design of the platform), operationally (in the deployment and operation of the platform), commercially (in the contracts and pricing), and auditably (in the audit environments and the Independent Audit Plane).
- A proposed change that violates a rule is rejected at design review.
- A release that violates a rule is blocked at security testing (PART LXXXIII).
- A contract that violates a rule is rejected at legal review.

### CXVI.2 Rule precedence

Where two rules appear to conflict, sovereignty and confidentiality take precedence. Specifically:

- Rule 2 (sovereignty) and Rule 8 (ACA confidentiality) take precedence over Rule 19 (Circle adds capabilities).
- Rule 14 (shared infrastructure does not imply shared data) and Rule 17 (cross-boundary exchange is policy-controlled and audited) take precedence over Rule 13 (federation).
- Rule 20 (no unsupported claims) is absolute: no claim of integration, certification, or authority may be made without verification.

### CXVI.3 Rule review

Rules are reviewed at least annually, and whenever a new institution is onboarded, a new integration is proposed, or a new AI capability is introduced. Rule changes require: institutional review where the rule affects that institution, security review, legal review, and an audit record at the Independent Audit Plane.

---

## PART CXVII — Blueprint Reconciliation

### CXVII.1 Mandatory audit

After integrating the changes in Parts I through IV of this federated sovereign government architecture amendment, a complete audit must be run against the existing Circle blueprint and all previous ACA requirements. The audit produces a reconciliation report.

### CXVII.2 Reconciliation checks

The audit checks for the following categories of issues:

| Check | Description |
|---|---|
| Duplicate features | Features that appear in more than one place in the blueprint, creating ambiguity about ownership or implementation. |
| Contradictory permissions | Permissions that grant and deny the same action under different rules, creating exploitable ambiguity. |
| Accidental ACA visibility | Any path that allows a non-ACA principal to infer or observe ACA data, cases, or agents. |
| Accidental cross-institution data sharing | Any path that allows one institution to access another's data without explicit authorization. |
| Duplicated government functionality | Any Circle feature that duplicates a function an existing government system already performs, contradicting PART CXI. |
| Replacement claims | Any statement that positions Circle as a replacement for an existing government system, contradicting PART CVIII and Rule 1. |
| Unsupported integration assumptions | Any assumption of an integration, API, or certification that has not been verified per PART LXXXIX. |
| Incorrect system-of-record ownership | Anywhere Circle is incorrectly described as the system of record for a function an institution owns. |
| Universal workflow assumptions | Anywhere a single workflow is assumed for all institutions, contradicting PART XCII. |
| Universal AI assumptions | Anywhere a single AI autonomy level or behavior is assumed for all institutions and all surfaces. |
| Security boundary failures | Anywhere a tenant boundary, identity boundary, or evidence boundary is not properly enforced. |
| Citizen/government identity confusion | Anywhere citizen identity is conflated with government institutional identity, contradicting PART XCVI. |
| Emergency/ACA confusion | Anywhere emergency routing is conflated with ACA intake, contradicting Rule 10 and PART XCIX. |
| Missing authorization controls | Anywhere an action that should be authorized is not gated by an explicit authorization. |

### CXVII.3 Reconciliation process

The reconciliation process is:

1. **Inventory** — enumerate every feature, every permission, every integration, every AI capability, every workflow, every audit surface mentioned in the integrated blueprint.
2. **Cross-reference** — cross-reference each inventory item against the reconciliation checks.
3. **Flag** — flag any item that matches a check.
4. **Resolve** — for each flag, either resolve the inconsistency by editing the blueprint, or document the resolution rationale.
5. **Re-audit** — re-run the audit after resolutions.
6. **Sign-off** — the reconciliation report is signed off by: the blueprint owner, the security lead, the legal/compliance lead, and (for ACA-affecting items) the ACA lead.

### CXVII.4 Reconciliation output

The reconciliation output includes:

- A list of every flagged item.
- For each flagged item: the check that flagged it, the location in the blueprint, the resolution, and the sign-off.
- A summary of remaining risks, if any, with mitigation plans.
- An audit record at the Independent Audit Plane.

### CXVII.5 Continuous reconciliation

Reconciliation is not a one-time event. It is run whenever the blueprint is amended, whenever a new institution is onboarded, whenever a new integration is added, and whenever a new AI capability is introduced. The most recent reconciliation report is the authoritative one; older reports are retained for historical accountability.

---

## PART CXVIII — Required Final Output

### CXVIII.1 The revised blueprint

After Parts I through IV are integrated, the revised blueprint is produced under the title:

> **CIRCLE — UNIVERSAL CITIZEN PLATFORM + FEDERATED SOVEREIGN GOVERNMENT ARCHITECTURE + ACA SOVEREIGN EDITION**

### CXVIII.2 Required sections

The revised blueprint must contain the following twenty-eight sections:

| Section | Title |
|---|---|
| 1 | Circle Universal Vision |
| 2 | Public Citizen Architecture |
| 3 | Citizen Shield |
| 4 | Government Federation Fabric |
| 5 | Institutional Sovereign Workspace Framework |
| 6 | Government System-of-Record Architecture |
| 7 | Government Identity Federation |
| 8 | Inter-Agency Exchange |
| 9 | Emergency Integration Architecture |
| 10 | Government Service Routing |
| 11 | ACA Sovereign Environment |
| 12 | Police Sovereign Environment |
| 13 | EMS Sovereign Environment |
| 14 | Other Institutional Environment Model |
| 15 | ACA Smart Evidence / Timeline / Intelligence |
| 16 | Government Integration Gateway |
| 17 | Data Governance |
| 18 | Zero Trust |
| 19 | AI Governance |
| 20 | Evidence Security |
| 21 | Institutional Privacy |
| 22 | Deployment |
| 23 | Commercial Model |
| 24 | Egyptian Government Integration Strategy |
| 25 | Implementation Roadmap |
| 26 | Full Requirements Traceability |
| 27 | Full Security / Architecture Audit |
| 28 | End-to-End Acceptance Tests |

### CXVIII.3 Section responsibilities

- Each section is responsible for the parts of the amendment that fall in its scope (see the Requirements Traceability Matrix below for the full mapping).
- Each section must explicitly reference the architectural rules it enforces (PART CXVI).
- Each section must explicitly reference the reconciliation checks it satisfies (PART CXVII).
- Each section must explicitly reference the acceptance tests that verify it (End-to-End Acceptance Tests, below).

### CXVIII.4 Cross-references

The revised blueprint uses cross-references rather than duplication. Where a topic is addressed in one section, other sections reference it rather than restating it. This avoids the "duplicate features" reconciliation flag.

### CXVIII.5 Sovereign Edition designation

The "ACA Sovereign Edition" designation reflects that ACA is treated as a fully sovereign, confidential institutional environment whose agents are provisioned by ACA, whose workspace is isolated, and whose data is never exposed outside ACA except through explicit ACA authorization. The designation does not elevate ACA above other institutions; it reinforces ACA's sovereignty and confidentiality.

---

## PART CXIX — Final Executive Statement

### CXIX.1 Architectural philosophy

The revised blueprint ends with this architectural philosophy:

> **Circle provides one simple civic experience without requiring one centralized government system. Citizens interact with Circle; institutions operate their own sovereign systems; Circle provides the controlled federation connecting them. ACA remains a completely separate, confidential institutional environment whose agents are provisioned by ACA. Police remains Police. Ambulance remains Ambulance. Civil Protection remains Civil Protection. ETA remains ETA. NAFEZA remains NAFEZA. Courts remain Courts. Circle does not replace their authority or systems of record. It makes the ecosystem easier for citizens to access and, where authorized, easier for institutions to interoperate, investigate, coordinate, analyze and improve.**

### CXIX.2 The core model

The core model is:

> **ONE CIVIC FRONT DOOR**
>
> **MANY SOVEREIGN INSTITUTIONS**
>
> **ONE CONTROLLED FEDERATION FABRIC**
>
> **NO UNAUTHORIZED CENTRALIZATION**
>
> **NO INSTITUTIONAL AUTHORITY TRANSFER**
>
> **NO REPLACEMENT OF EXISTING GOVERNMENT SYSTEMS**

### CXIX.3 What the core model means

- **ONE CIVIC FRONT DOOR** — citizens have a single, simple, free civic experience through Circle's universal public layer. They do not need to know which institution does what; Circle routes to the competent institution.
- **MANY SOVEREIGN INSTITUTIONS** — each institution retains its mandate, its systems, its personnel, its confidentiality, and its authority. Circle does not collapse institutions into one.
- **ONE CONTROLLED FEDERATION FABRIC** — Circle provides the federation that connects institutions, with policy and audit at every exchange. Federation is controlled, not open.
- **NO UNAUTHORIZED CENTRALIZATION** — Circle does not centralize data, authority, or operations without explicit authorization. Centralization requires authorization; default is decentralization.
- **NO INSTITUTIONAL AUTHORITY TRANSFER** — Circle does not transfer an institution's authority to itself or to another institution. Each institution's authority remains with that institution.
- **NO REPLACEMENT OF EXISTING GOVERNMENT SYSTEMS** — Circle does not replace ETA, NAFEZA, Police systems, EMS systems, Civil Protection systems, Court systems, Tax systems, or ACA systems. Circle integrates with them, orchestrates around them, and provides intelligence on top of them, where authorized.

### CXIX.4 Closing principle

Circle's value to Egypt's government is not in replacing what works. Circle's value is in making the ecosystem work better for citizens, and — where institutions authorize it — better for institutions. Every architectural, commercial, and operational decision in this blueprint is governed by that principle.

End of Part IV architectural amendment.

---

## Requirements Traceability Matrix

This matrix maps every PART (I through CXIX) of the federated sovereign government architecture amendment to: the section in the revised blueprint (per PART CXVIII), the implementation module, the security requirement, and the acceptance test. Parts I through LXXXII were addressed in Parts I, II, and III of the amendment; Parts LXXXIII through CXIX are addressed in this Part IV. Where a Part was addressed in an earlier part of the amendment, the section, module, security requirement, and acceptance test references are carried forward from that earlier treatment and made consistent with the final twenty-eight-section structure of PART CXVIII.

### Matrix conventions

- **Section**: the section number in the revised blueprint (1–28).
- **Module**: the implementation module responsible.
- **Security requirement**: the relevant architectural rule (R1–R20) or security testing catalogue entry (ST-01 through ST-12).
- **Acceptance test**: the end-to-end acceptance test (AET-01 through AET-10) below, or a referenced sub-test.

### Matrix

| PART | Title (abbreviated) | Section | Module | Security requirement | Acceptance test |
|---|---|---|---|---|---|
| I | Citizen Shield introduction | 3 | Citizen Shield | R7 | AET-01 |
| II | Universal civic front door | 1, 3 | Universal Public Layer, Citizen Shield | R1, R7 | AET-01 |
| III | Citizen identity foundation | 7 | Identity Federation | R5, R14 | AET-06 |
| IV | Government federation fabric | 4 | Federation Fabric | R13, R17 | AET-06 |
| V | Institutional sovereign workspace | 5 | Institutional Workspace Framework | R2, R3, R4 | AET-06 |
| VI | Government system of record | 6 | System-of-Record Architecture | R4, R16, R18 | AET-10 |
| VII | Inter-agency exchange | 8 | Inter-Agency Exchange | R5, R17 | AET-06 |
| VIII | Emergency integration | 9 | Emergency Integration | R10, R12 | AET-02 |
| IX | Government service routing | 10 | Service Routing | R12, R17 | AET-01 |
| X | ACA sovereign environment | 11 | ACA Sovereign Workspace | R8, R9 | AET-05 |
| XI | Police sovereign environment | 12 | Police Sovereign Workspace | R2, R10 | AET-04 |
| XII | EMS sovereign environment | 13 | EMS Sovereign Workspace | R2, R10 | AET-02 |
| XIII | Other institutional environment | 14 | Institutional Workspace Framework | R2, R3 | AET-06 |
| XIV | ACA smart evidence | 15 | ACA Evidence, Timeline, Intelligence | R8, R15, R16 | AET-03 |
| XV | Government integration gateway | 16 | Integration Gateway | R6, R18 | AET-10 |
| XVI | Data governance | 17 | Data Governance | R14, R16 | AET-08 |
| XVII | Zero trust | 18 | Zero Trust | R5, R14, R17 | AET-06 |
| XVIII | AI governance | 19 | AI Governance | R15 | AET-07 |
| XIX | Evidence security | 20 | Evidence Security | R8, R15, R16 | AET-08 |
| XX | Institutional privacy | 21 | Institutional Privacy | R8, R14 | AET-05 |
| XXI | Public-to-government flow | 10, 17 | Service Routing, Data Governance | R12, R14 | AET-01 |
| XXII | Government-to-government flow | 8 | Inter-Agency Exchange | R5, R17 | AET-06 |
| XXIII | ACA data flow | 11 | ACA Sovereign Workspace | R8, R9 | AET-03 |
| XXIV | Citizen account ≠ government account | 7 | Identity Federation | R5, R9 | AET-06 |
| XXV | Shared identity ≠ shared privilege | 7, 18 | Identity Federation, Zero Trust | R5, R14 | AET-06 |
| XXVI | Shared infrastructure ≠ shared data | 17, 18 | Data Governance, Zero Trust | R14 | AET-06 |
| XXVII | Institutional case correlation | 8 | Inter-Agency Exchange | R5, R17 | AET-04 |
| XXVIII | Federated incident reference | 8, 9 | Inter-Agency Exchange, Emergency Integration | R5, R13 | AET-04 |
| XXIX | Multi-agency emergency | 9 | Emergency Integration | R10, R12 | AET-02 |
| XXX | After-action federation | 8, 27 | Inter-Agency Exchange, Audit | R17 | AET-09 |
| XXXI | ACA systemic correlation | 11, 15 | ACA Sovereign Workspace, ACA Intelligence | R8, R15 | AET-03 |
| XXXII | Public transparency | 21, 27 | Institutional Privacy, Audit | R8, R14 | AET-05 |
| XXXIII | Institutional privacy | 21 | Institutional Privacy | R8, R14 | AET-05 |
| XXXIV | Emergency privacy | 21 | Institutional Privacy | R14 | AET-09 |
| XXXV | Government registry | 10 | Service Routing, Integration Gateway | R6, R18 | AET-10 |
| XXXVI | Service ownership | 6, 10 | System-of-Record Architecture, Service Routing | R4, R16 | AET-10 |
| XXXVII | Institutional workflow engine | 5 | Institutional Workspace Framework | R2, R3 | AET-09 |
| XXXVIII | Policy engine | 4, 17 | Federation Fabric, Data Governance | R5, R17 | AET-06 |
| XXXIX | SLA surface | 10, 22 | Service Routing, Deployment | R2 | AET-01 |
| XL | Independent audit plane | 27 | Audit | R17 | AET-09 |
| XLI | Inter-agency exchange audit | 8, 27 | Inter-Agency Exchange, Audit | R17 | AET-06 |
| XLII | Evidence integrity | 15, 20 | ACA Evidence, Evidence Security | R8, R16 | AET-08 |
| XLIII | AI autonomy levels | 19 | AI Governance | R15 | AET-07 |
| XLIV | Prompt-injection firewall | 19 | AI Governance | R15 | AET-07 |
| XLV | AI provenance | 15, 19 | ACA Intelligence, AI Governance | R15 | AET-07 |
| XLVI | Sovereign workspace isolation | 5, 18 | Institutional Workspace Framework, Zero Trust | R3, R14 | AET-06 |
| XLVII | ACA confidentiality | 11 | ACA Sovereign Workspace | R8, R9 | AET-05 |
| XLVIII | ACA agent provisioning | 7, 11 | Identity Federation, ACA Sovereign Workspace | R9 | AET-05 |
| XLIX | Emergency dispatch separation | 9 | Emergency Integration | R10, R12 | AET-02 |
| L | Service authority separation | 10, 11 | Service Routing, ACA Sovereign Workspace | R11 | AET-03 |
| LI | Routing to competent institution | 10 | Service Routing | R12 | AET-01 |
| LII | No silent fallback | 16, 18 | Integration Gateway, Zero Trust | R6, R20 | AET-08 |
| LIII | Failed integration handling | 16, 22 | Integration Gateway, Deployment | R18 | AET-08 |
| LIV | Offline institutional operations | 5, 22 | Institutional Workspace Framework, Deployment | R3 | AET-09 |
| LV | Conflict detection | 5, 16 | Institutional Workspace Framework, Integration Gateway | R5, R17 | AET-09 |
| LVI | Device attestation | 18 | Zero Trust | R5, R14 | AET-06 |
| LVII | Secure enclaves and HSM | 18, 20 | Zero Trust, Evidence Security | R16 | AET-08 |
| LVIII | Evidence sealing | 15, 20 | ACA Evidence, Evidence Security | R8, R16 | AET-08 |
| LIX | Provenance chains | 17, 20 | Data Governance, Evidence Security | R16 | AET-08 |
| LX | Cross-institution authorization | 8 | Inter-Agency Exchange | R5, R17 | AET-06 |
| LXI | Disclosure controls | 17, 21 | Data Governance, Institutional Privacy | R8, R14 | AET-05 |
| LXII | Retention rules | 17, 21 | Data Governance, Institutional Privacy | R14 | AET-09 |
| LXIII | Export authorization | 17, 27 | Data Governance, Audit | R5, R17 | AET-06 |
| LXIV | Differential privacy | 21 | Institutional Privacy | R14 | AET-05 |
| LXV | ACA non-visibility | 11, 21 | ACA Sovereign Workspace, Institutional Privacy | R8 | AET-05 |
| LXVI | Police-ACA separation | 11, 12 | ACA, Police Sovereign Workspaces | R10, R11 | AET-04 |
| LXVII | EMS-ACA separation | 11, 13 | ACA, EMS Sovereign Workspaces | R10, R11 | AET-03 |
| LXVIII | Civil Protection sovereignty | 9, 14 | Emergency Integration, Other Institutional | R2, R10 | AET-02 |
| LXIX | Courts sovereignty | 14 | Other Institutional | R2, R18 | AET-10 |
| LXX | Tax authority sovereignty | 14, 16 | Other Institutional, Integration Gateway | R2, R18 | AET-10 |
| LXXI | Customs (NAFEZA) sovereignty | 14, 16, 24 | Other Institutional, Integration Gateway, Egyptian Integration Strategy | R2, R18 | AET-10 |
| LXXII | ETA sovereignty | 16, 24 | Integration Gateway, Egyptian Integration Strategy | R18 | AET-10 |
| LXXIII | No replacement claims | 22, 23, 24 | Deployment, Commercial Model, Egyptian Integration Strategy | R1, R19, R20 | AET-10 |
| LXXIV | Commercial positioning | 23 | Commercial Model | R1, R19 | AET-10 |
| LXXV | No duplication charges | 23 | Commercial Model | R1, R19 | AET-10 |
| LXXVI | Institution-specific contracts | 23 | Commercial Model | R2 | AET-10 |
| LXXVII | Consumer services free | 23 | Commercial Model | R1 | AET-01 |
| LXXVIII | Integration + intelligence + orchestration | 16, 23 | Integration Gateway, Commercial Model | R19 | AET-10 |
| LXXIX | No ETA replacement product | 23, 24 | Commercial Model, Egyptian Integration Strategy | R1, R18 | AET-10 |
| LXXX | Egyptian integration strategy | 24 | Egyptian Integration Strategy | R18 | AET-10 |
| LXXXI | Implementation roadmap | 25 | Implementation Roadmap | R1, R19 | AET-10 |
| LXXXII | ACA sovereign edition designation | 11, 26 | ACA Sovereign Workspace, Requirements Traceability | R8, R9 | AET-05 |
| LXXXIII | Security testing | 27 | Audit | R5, R14, R17 | AET-06 |
| LXXXIV | Data exfiltration | 17, 27 | Data Governance, Audit | R5, R14, R17 | AET-06 |
| LXXXV | Institutional audit | 27 | Audit | R17 | AET-09 |
| LXXXVI | Independent audit plane | 27 | Audit | R17 | AET-09 |
| LXXXVII | Government service SLA | 10, 22 | Service Routing, Deployment | R2 | AET-01 |
| LXXXVIII | Policy engine | 4, 17 | Federation Fabric, Data Governance | R5, R17 | AET-06 |
| LXXXIX | No hard-coded assumptions | 16, 17, 18 | Integration Gateway, Data Governance, Zero Trust | R6, R20 | AET-08 |
| XC | Government registry | 10, 16 | Service Routing, Integration Gateway | R6, R18 | AET-10 |
| XCI | Service ownership | 6, 10 | System-of-Record Architecture, Service Routing | R4, R16 | AET-10 |
| XCII | Institutional workflow engine | 5 | Institutional Workspace Framework | R2, R3 | AET-09 |
| XCIII | Shared vs institution-specific | 4, 5, 16 | Federation Fabric, Workspace Framework, Integration Gateway | R14, R19 | AET-10 |
| XCIV | Shared infra ≠ shared data | 17, 18 | Data Governance, Zero Trust | R14 | AET-06 |
| XCV | Shared identity ≠ shared privilege | 7, 18 | Identity Federation, Zero Trust | R5, R14 | AET-06 |
| XCVI | Citizen account ≠ government account | 7 | Identity Federation | R5, R9 | AET-06 |
| XCVII | Public-to-government flow | 10, 17 | Service Routing, Data Governance | R12, R14 | AET-01 |
| XCVIII | Government-to-government flow | 8 | Inter-Agency Exchange | R5, R17 | AET-06 |
| XCIX | ACA data flow | 11 | ACA Sovereign Workspace | R8, R9 | AET-03 |
| C | Institutional case correlation | 8 | Inter-Agency Exchange | R5, R17 | AET-04 |
| CI | Federated incident ID | 8, 9 | Inter-Agency Exchange, Emergency Integration | R5, R13 | AET-04 |
| CII | Multi-agency emergency | 9 | Emergency Integration | R10, R12 | AET-02 |
| CIII | After-action federation | 8, 27 | Inter-Agency Exchange, Audit | R17 | AET-09 |
| CIV | ACA systemic correlation | 11, 15 | ACA Sovereign Workspace, ACA Intelligence | R8, R15 | AET-03 |
| CV | Public transparency | 21, 27 | Institutional Privacy, Audit | R8, R14 | AET-05 |
| CVI | Institutional privacy | 21 | Institutional Privacy | R8, R14 | AET-05 |
| CVII | Emergency privacy | 21 | Institutional Privacy | R14 | AET-09 |
| CVIII | Procurement positioning | 23, 24 | Commercial Model, Egyptian Integration Strategy | R1, R19, R20 | AET-10 |
| CIX | Deployment strategy | 22, 25 | Deployment, Implementation Roadmap | R1, R19 | AET-10 |
| CX | Commercial model | 23 | Commercial Model | R1, R19 | AET-10 |
| CXI | No ETA replacement | 23, 24 | Commercial Model, Egyptian Integration Strategy | R1, R18 | AET-10 |
| CXII | Institution-specific contracts | 23 | Commercial Model | R2 | AET-10 |
| CXIII | Consumer services free | 23 | Commercial Model | R1 | AET-01 |
| CXIV | Final data ownership | 6, 17 | System-of-Record Architecture, Data Governance | R4, R16 | AET-08 |
| CXV | Final architecture diagram | 1–28 (overview) | All modules | R1–R20 (overview) | AET-01 through AET-10 |
| CXVI | Final architectural rules | 1–28 (cross-cutting) | All modules | R1–R20 | AET-01 through AET-10 |
| CXVII | Blueprint reconciliation | 26, 27 | Requirements Traceability, Audit | R1–R20, all reconciliation checks | AET-01 through AET-10 |
| CXVIII | Required final output | 1–28 (structure) | All modules | R1–R20 | AET-01 through AET-10 |
| CXIX | Final executive statement | 1–28 (philosophy) | All modules | R1–R20 | AET-01 through AET-10 |

### Matrix usage

- The matrix is the authoritative traceability artifact. Any change to the blueprint must update the matrix.
- Any architectural rule, security requirement, or acceptance test referenced in the matrix must exist and be enforced.
- Any part not yet implemented must be marked as "pending implementation" in the matrix, with a target release.

---

## Security / Architecture Audit Checklist

This checklist is the operational form of the reconciliation (PART CXVII) and the architectural rules (PART CXVI). It is run before every release, before every new institutional onboarding, before every new integration, and before every new AI capability. A failure on any item blocks release.

### A. Architectural rules (R1–R20)

| Item | Check | Pass criterion |
|---|---|---|
| R1 | Does the release position Circle as replacing any government function? | No. |
| R2 | Are all institutions treated as sovereign in this release? | Yes. |
| R3 | Does each institution have its own secure workspace? | Yes, tenant-isolated. |
| R4 | Does each institution have its own system of record? | Yes; Circle is reference/derived only. |
| R5 | Are institutional permissions confined to their institution? | Yes; no auto-crossing. |
| R6 | Are all government integrations explicitly authorized? | Yes; verifiable authorization recorded. |
| R7 | Is Citizen Shield the universal public-facing front door? | Yes. |
| R8 | Is ACA confidential and invisible to ordinary users? | Yes; tested by ST-03 and ST-04 with ACA cases. |
| R9 | Are ACA agents provisioned by ACA? | Yes; no other provisioning path. |
| R10 | Are emergency services separate from ACA? | Yes; routing verified. |
| R11 | Are service authorities separate from ACA? | Yes. |
| R12 | Does Circle route to the competent institution rather than absorbing? | Yes; routing verified. |
| R13 | Is federation non-centralizing? | Yes; no unauthorized centralization. |
| R14 | Does shared infrastructure avoid shared data? | Yes; tenant isolation verified. |
| R15 | Does AI avoid inheriting institutional authority? | Yes; AI governance enforced. |
| R16 | Does integration avoid transferring record ownership to Circle? | Yes; ownership preserved at institution. |
| R17 | Is every cross-boundary exchange policy-controlled and audited? | Yes; PDP + INTER-AGENCY EXCHANGE AUDIT. |
| R18 | Are existing Egyptian systems authoritative where they perform the official function? | Yes; not replaced by Circle. |
| R19 | Does Circle add interoperability, citizen access, orchestration, intelligence, evidence? | Yes; positioned correctly. |
| R20 | Are there any unsupported claims of authority, API, certification, or integration? | No; all claims verified. |

### B. Security testing catalogue (ST-01 through ST-12)

| Item | Check | Pass criterion |
|---|---|---|
| ST-01 | Privilege escalation tests pass? | Yes. |
| ST-02 | Authentication bypass tests pass? | Yes. |
| ST-03 | Data boundary violation tests pass? | Yes, including ACA-specific cases. |
| ST-04 | Cross-tenant leakage tests pass? | Yes, including ACA, Police, EMS, Civil Protection. |
| ST-05 | API abuse tests pass? | Yes. |
| ST-06 | Prompt injection tests pass? | Yes; Prompt-Injection Firewall effective. |
| ST-07 | Malicious document tests pass? | Yes. |
| ST-08 | Evidence modification tests pass? | Yes; immutability preserved. |
| ST-09 | Unauthorized export tests pass? | Yes. |
| ST-10 | Replay attack tests pass? | Yes. |
| ST-11 | Offline synchronization attack tests pass? | Yes; conflict detection effective. |
| ST-12 | Device compromise tests pass? | Yes. |

### C. Reconciliation checks (PART CXVII)

| Item | Check | Pass criterion |
|---|---|---|
| C-01 | Any duplicate features? | No. |
| C-02 | Any contradictory permissions? | No. |
| C-03 | Any accidental ACA visibility? | No. |
| C-04 | Any accidental cross-institution data sharing? | No. |
| C-05 | Any duplicated government functionality? | No. |
| C-06 | Any replacement claims? | No. |
| C-07 | Any unsupported integration assumptions? | No. |
| C-08 | Any incorrect system-of-record ownership? | No. |
| C-09 | Any universal workflow assumptions? | No. |
| C-10 | Any universal AI assumptions? | No. |
| C-11 | Any security boundary failures? | No. |
| C-12 | Any citizen/government identity confusion? | No. |
| C-13 | Any emergency/ACA confusion? | No. |
| C-14 | Any missing authorization controls? | No. |

### D. Data exfiltration monitoring (PART LXXXIV)

| Item | Check | Pass criterion |
|---|---|---|
| D-01 | Bulk export monitored? | Yes. |
| D-02 | Bulk queries monitored? | Yes. |
| D-03 | Unusual download volume monitored? | Yes. |
| D-04 | Abnormal API use monitored? | Yes. |
| D-05 | External transfer monitored? | Yes. |
| D-06 | Exfiltration alerts routed to institution security officer? | Yes. |
| D-07 | Exfiltration alerts recorded at Independent Audit Plane? | Yes. |
| D-08 | ACA exfiltration alerts hidden from non-ACA officers? | Yes. |

### E. Audit integrity (PART LXXXV, PART LXXXVI)

| Item | Check | Pass criterion |
|---|---|---|
| E-01 | Each institution has its own audit environment? | Yes. |
| E-02 | INTER-AGENCY EXCHANGE AUDIT present? | Yes. |
| E-03 | Independent Audit Plane append-only? | Yes. |
| E-04 | Hash chain HSM-anchored? | Yes. |
| E-05 | Operational admins cannot alter historical audit? | Yes. |
| E-06 | Supersession produces new audit record? | Yes. |
| E-07 | Audit gaps themselves audited? | Yes. |

### F. Policy engine (PART LXXXVIII, PART LXXXIX)

| Item | Check | Pass criterion |
|---|---|---|
| F-01 | All government-facing surfaces policy-configurable? | Yes. |
| F-02 | PDP enforces all cross-boundary, evidence, AI actions? | Yes. |
| F-03 | Policy is institution-administered? | Yes. |
| F-04 | Policy versioning in place? | Yes. |
| F-05 | No hard-coded government assumptions? | Yes. |
| F-06 | Configuration verification gate enforced? | Yes. |
| F-07 | Missing config fails closed? | Yes. |

### G. Registry, ownership, workflow (PART XC through PART XCII)

| Item | Check | Pass criterion |
|---|---|---|
| G-01 | Government Institution Registry present and verified? | Yes. |
| G-02 | Service ownership records complete? | Yes. |
| G-03 | Integration state machine enforced? | Yes. |
| G-04 | No universal workflow imposed? | Yes. |
| G-05 | Institution-specific workflow engines configurable? | Yes. |

### H. Shared vs institution-specific (PART XCIII through PART XCVI)

| Item | Check | Pass criterion |
|---|---|---|
| H-01 | Shared infrastructure cleanly separated from institution-specific? | Yes. |
| H-02 | No institution-specific capability in shared layer? | Yes. |
| H-03 | Tenant isolation enforced at storage, AI, search, vectors, messaging, audit? | Yes. |
| H-04 | Authentication distinct from authorization? | Yes. |
| H-05 | Citizen ID distinct from government ID distinct from ACA ID? | Yes. |

### I. Data flows (PART XCVII through PART XCIX)

| Item | Check | Pass criterion |
|---|---|---|
| I-01 | Public-to-government flow correct? | Yes. |
| I-02 | Government-to-government flow correct? | Yes. |
| I-03 | ACA data flow correct and confidential? | Yes. |
| I-04 | No citizen → unrestricted ACA database path? | Yes. |

### J. Correlation, incident, after-action (PART C through PART CIII)

| Item | Check | Pass criterion |
|---|---|---|
| J-01 | Correlation is reference-only? | Yes. |
| J-02 | Federated Incident Reference is reference, not merge? | Yes. |
| J-03 | Multi-agency emergency preserves operational sovereignty? | Yes. |
| J-04 | After-action chronology is authorized per authority? | Yes. |

### K. Transparency, privacy, emergency privacy (PART CV through PART CVII)

| Item | Check | Pass criterion |
|---|---|---|
| K-01 | Public transparency is authorized and aggregate? | Yes. |
| K-02 | Institutional privacy prevents inference? | Yes. |
| K-03 | Emergency privacy follows purpose + policy + law + operational requirement? | Yes. |
| K-04 | ACA absolute non-visibility enforced? | Yes. |

### L. Commercial and deployment (PART CVIII through PART CXIII)

| Item | Check | Pass criterion |
|---|---|---|
| L-01 | Circle positioned as interoperability + intelligence, not replacement? | Yes. |
| L-02 | Phased deployment strategy in place? | Yes. |
| L-03 | No charges for duplicated functionality? | Yes. |
| L-04 | No "ETA replacement" product? | Yes. |
| L-05 | Institution-specific contracts? | Yes. |
| L-06 | Consumer services free? | Yes. |

### M. Data ownership (PART CXIV)

| Item | Check | Pass criterion |
|---|---|---|
| M-01 | Every data object has ownership record? | Yes. |
| M-02 | Source owner, system of record, Circle reference distinguished? | Yes. |
| M-03 | Retention, export, legal basis, audit specified? | Yes. |
| M-04 | No silent ownership transfer to Circle? | Yes. |

### N. Architecture and reconciliation (PART CXV through PART CXVII)

| Item | Check | Pass criterion |
|---|---|---|
| N-01 | Final architecture diagram consistent with all parts? | Yes. |
| N-02 | Foundational layer (Zero Trust, Data Planes, Identity, PKI, HSM, Evidence, Provenance, AI Governance, Audit, Privacy, DR) present? | Yes. |
| N-03 | Blueprint reconciliation run and signed off? | Yes. |
| N-04 | Reconciliation report recorded at Independent Audit Plane? | Yes. |

### O. Final output and executive statement (PART CXVIII, PART CXIX)

| Item | Check | Pass criterion |
|---|---|---|
| O-01 | Revised blueprint has all 28 sections? | Yes. |
| O-02 | Traceability matrix complete (PART I–CXIX)? | Yes. |
| O-03 | Final executive statement present and verbatim? | Yes. |
| O-04 | Core model (one front door, many institutions, one fabric, no centralization, no transfer, no replacement) present? | Yes. |

---

## End-to-End Acceptance Tests

The following ten end-to-end acceptance tests verify the integrated blueprint. Each test describes: the scenario, the preconditions, the steps, the expected outcome, and the failure indicators. A test fails if any failure indicator is observed.

### AET-01 — Citizen submits "I need help" → correctly routed

**Scenario:** A citizen submits an undifferentiated "I need help" signal through Circle's universal public layer.

**Preconditions:**
- Government Institution Registry is populated and verified.
- Service routing is configured for emergency, service, and integrity signal paths.
- Citizen Shield is the universal public-facing front door.

**Steps:**
1. Citizen authenticates with Citizen Circle ID.
2. Citizen submits "I need help" with minimal context.
3. Circle classifies the request (interactive clarification where permitted).
4. Circle routes to the competent institution.

**Expected outcome:**
- If the signal is an emergency, it is routed to the relevant emergency institution (Police, EMS, Fire/Traffic, Civil Protection) per the classification.
- If the signal is a service request, it is routed to the competent service authority.
- If the signal is an integrity signal, it is routed to ACA via the ACA data flow (PART XCIX), not via the standard public-to-government flow.
- Citizen receives a citizen-facing status where authorized.

**Failure indicators:**
- Emergency signal routed to ACA.
- Service signal routed to ACA.
- ACA signal routed to a non-ACA institution.
- No routing decision made.
- Citizen receives ACA-facing information.

### AET-02 — Emergency goes to correct institution (not ACA)

**Scenario:** A citizen reports an emergency (e.g., medical emergency, traffic incident, fire).

**Preconditions:**
- Emergency institutions are configured and live.
- ACA is configured and live, separately.

**Steps:**
1. Citizen reports an emergency through Citizen Shield.
2. Circle classifies as emergency.
3. Circle routes to the relevant emergency institution.
4. Emergency institution's system of record receives the routed signal.

**Expected outcome:**
- Medical emergency → EMS.
- Traffic incident → Traffic authority (and Police where applicable).
- Fire → Fire/Civil Protection.
- ACA is not the recipient.
- ACA is not notified unless a permitted integrity signal exists (PART CIV), and even then ACA receives only the systemic signal, not the emergency record.

**Failure indicators:**
- Emergency routed to ACA.
- Emergency record exposed to ACA.
- Emergency routed to a non-competent institution.
- No dispatch initiated.

### AET-03 — Citizen report does NOT auto-create ACA case

**Scenario:** A citizen submits a report that touches a topic that might be of interest to ACA (e.g., suspected corruption at a service point).

**Preconditions:**
- ACA is configured.
- ACA intake is configured.

**Steps:**
1. Citizen submits a report.
2. Circle classifies the report.
3. Circle routes the report.

**Expected outcome:**
- Where the report is an integrity signal within ACA's mandate, it is delivered to ACA secure intake as a permitted ACA signal (PART XCIX).
- ACA decides whether to open a case; the decision is ACA's, not Circle's.
- No ACA case is auto-created by Circle.
- The citizen does not see whether an ACA case was opened.
- The citizen sees, at most, "signal delivered to the competent authority."

**Failure indicators:**
- Circle auto-creates an ACA case.
- Citizen sees ACA case status.
- Citizen sees whether ACA accepted or rejected the signal.
- ACA case visible to non-ACA principals.

### AET-04 — Police and ACA cases remain separate but correlated

**Scenario:** A single underlying event generates both a Police incident and an ACA signal.

**Preconditions:**
- Police and ACA sovereign workspaces are configured.
- Correlation Reference capability is configured.

**Steps:**
1. Police open a Police incident.
2. A permitted ACA signal is delivered to ACA.
3. ACA opens an ACA case.
4. A Correlation Reference links the Police incident and the ACA case (where authorized by both).

**Expected outcome:**
- Police incident is in the Police system of record.
- ACA case is in the ACA sovereign workspace.
- Correlation Reference links them as references, not as merged data.
- Police cannot read the ACA case.
- ACA cannot read the Police incident record (unless authorized via inter-agency exchange).
- Citizen cannot determine that either case exists.

**Failure indicators:**
- Police gain visibility into ACA case.
- ACA gains visibility into Police incident without authorization.
- Correlation causes data fusion.
- Citizen infers the existence of either case.

### AET-05 — ACA is invisible to ordinary citizens

**Scenario:** An ordinary citizen attempts to discover whether an ACA investigation exists.

**Preconditions:**
- ACA is configured with at least one active case.

**Steps:**
1. Citizen authenticates with Citizen Circle ID.
2. Citizen attempts various discovery paths: search, status, profile, aggregate metrics, error-message probing, timing analysis.

**Expected outcome:**
- No path reveals the existence of an ACA case.
- No error message differentiates "ACA case exists" from "ACA case does not exist."
- No timing pattern reveals ACA activity.
- No aggregate metric reveals ACA activity in a re-identifiable way.
- No correlation side-channel reveals ACA activity.

**Failure indicators:**
- Any path reveals ACA case existence.
- Any error message differentiates ACA case existence.
- Any timing or volume pattern reveals ACA activity.

### AET-06 — Government institution cannot see another institution's data without authorization

**Scenario:** An authorized user in Institution A attempts to access data owned by Institution B.

**Preconditions:**
- Institutions A and B are both configured and live.
- No inter-agency exchange is authorized between A and B for the relevant data class.

**Steps:**
1. User in Institution A authenticates.
2. User attempts direct query of Institution B's data.
3. User attempts indirect query (correlation, aggregate, AI retrieval).
4. User attempts federation path.

**Expected outcome:**
- Direct query denied at PDP.
- Indirect query denied at PDP.
- Correlation reveals reference, not contents.
- Federation path requires explicit authorization; absent authorization, denied.
- All attempts recorded in INTER-AGENCY EXCHANGE AUDIT and at the Independent Audit Plane.

**Failure indicators:**
- Any data from B visible to A without authorization.
- Correlation leaks contents.
- AI retrieval leaks contents.
- Audit gaps.

### AET-07 — AI does not inherit cross-institution authority

**Scenario:** AI is asked to take an action that would, if performed by an institutional principal, require cross-institution authority.

**Preconditions:**
- AI governance is configured with autonomy levels.
- Prompt-Injection Firewall is active.
- No cross-institution authority has been granted to AI.

**Steps:**
1. AI receives a request (possibly prompt-injected) to act across institutions.
2. AI governance evaluates the request.
3. PDP evaluates the requested action.

**Expected outcome:**
- AI governance blocks cross-institution action.
- Prompt-Injection Firewall neutralizes injection attempts.
- No AI action grants cross-institution privilege.
- All AI decisions recorded with provenance.
- AI operates within its institution-scoped autonomy level.

**Failure indicators:**
- AI performs a cross-institution action.
- Prompt injection bypasses AI governance.
- AI provenance missing.
- AI autonomy level exceeded.

### AET-08 — Failed integration does not silently corrupt data

**Scenario:** An integration between Circle and an existing government system fails mid-operation.

**Preconditions:**
- Integration is live.
- Integration is mid-operation when failure occurs.

**Steps:**
1. Integration fails (network, target system, authentication, etc.).
2. Circle detects failure.
3. Circle records failure in audit.
4. Circle does not silently retry in a way that corrupts data.
5. Circle surfaces failure to the institution.
6. Institution resolves and retries where appropriate.

**Expected outcome:**
- Failure detected and recorded.
- No silent data corruption.
- No partial writes that appear complete.
- No unauthorized fallback that assumes authority Circle does not have.
- Institution informed; recovery path available.
- Independent Audit Plane records the failure event.

**Failure indicators:**
- Silent corruption.
- Partial writes that appear complete.
- Unauthorized fallback.
- Missing audit record.
- Institution not informed.

### AET-09 — Offline institutional operations sync correctly with conflict detection

**Scenario:** An institution operates offline (e.g., due to network partition) and later syncs.

**Preconditions:**
- Institutional workspace supports offline operations.
- Conflict detection is configured.

**Steps:**
1. Institution operates offline; local writes occur.
2. Other operations occur elsewhere (e.g., citizen submissions routed but queued).
3. Connectivity restored.
4. Sync begins.
5. Conflicts detected where they exist.
6. Conflicts resolved per institution policy.

**Expected outcome:**
- Offline writes preserved with provenance.
- Sync reconciles changes.
- Conflicts detected and surfaced.
- Conflicts resolved per institution policy, not silently overwritten.
- All sync events audited.
- Tampered offline writes rejected (ST-11).

**Failure indicators:**
- Silent overwrite of offline writes.
- Undetected conflicts.
- Tampered writes accepted.
- Missing audit of sync events.

### AET-10 — Existing Egyptian systems remain authoritative

**Scenario:** An operation involves an existing Egyptian government system (e.g., ETA, NAFEZA, Tax Authority, Courts).

**Preconditions:**
- Integration with the existing system is live.
- Existing system is the authoritative system of record for its function.

**Steps:**
1. Citizen or institution initiates an operation that involves the existing system.
2. Circle routes to the existing system via the Integration Gateway.
3. Existing system performs the official function.
4. Circle references the result; Circle does not become the system of record.
5. Status surfaced to citizen where authorized.

**Expected outcome:**
- Existing system performs the official function.
- Existing system remains the authoritative system of record.
- Circle holds references and derived data only.
- No claim that Circle replaces the existing system.
- No charge for duplicating the existing system's function.
- Ownership remains with the institution (PART CXIV).

**Failure indicators:**
- Circle claims to be the system of record.
- Circle charges for duplicating the existing function.
- Circle positions itself as replacing the existing system.
- Ownership transferred to Circle.
- Existing system bypassed or overridden.

---

### Acceptance test summary

| Test | Verifies | Related rules | Related parts |
|---|---|---|---|
| AET-01 | Correct routing of "I need help" | R7, R12 | PART XCVII, PART XCIX |
| AET-02 | Emergency routing excludes ACA | R10, R11 | PART XCIX, PART CIV |
| AET-03 | No auto-creation of ACA cases | R8, R9 | PART XCIX |
| AET-04 | Police and ACA cases separate but correlated | R5, R8 | PART C, PART LXVI |
| AET-05 | ACA invisible to citizens | R8 | PART CVI, PART LXV |
| AET-06 | No cross-institution data without authorization | R5, R14, R17 | PART XCIV, PART XCV, PART XCVIII |
| AET-07 | AI does not inherit cross-institution authority | R15 | PART LXXXVIII (AI), PART XLIV |
| AET-08 | Failed integration does not corrupt data | R6, R18, R20 | PART LXXXIX, PART LIII |
| AET-09 | Offline sync with conflict detection | R3, R17 | PART LIV, PART LV |
| AET-10 | Existing Egyptian systems authoritative | R1, R18, R19 | PART CVIII, PART CXI, PART CXIV |

---

### Test cadence

- All ten acceptance tests run pre-release.
- AET-01, AET-02, AET-05, AET-06, AET-07 run continuously in production-like environments.
- AET-03, AET-04, AET-08, AET-09, AET-10 run on every change to routing, federation, evidence, or integration.
- All ten tests run before any new institutional onboarding.

### Test artifacts

Each test produces: (a) a signed test plan, (b) an execution record with timestamps, (c) evidence of pass/fail, (d) artifact hashes, and (e) a reference in the institutional audit trail and the Independent Audit Plane. Failed tests block release.

---

End of Part IV — Security, Deployment, Commercial Model & Final Architecture.

End of the Federated Sovereign Government Architecture amendment (Parts I–IV).

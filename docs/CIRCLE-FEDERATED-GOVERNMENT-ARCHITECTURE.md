# CIRCLE — UNIVERSAL CITIZEN PLATFORM + FEDERATED SOVEREIGN GOVERNMENT ARCHITECTURE
## Part I: Two-World Principle, Citizen Vision & Sovereign Institutions

| Field | Value |
|---|---|
| **Document** | CIRCLE — UNIVERSAL CITIZEN PLATFORM + FEDERATED SOVEREIGN GOVERNMENT ARCHITECTURE, Part I |
| **Edition** | Federated Sovereign Government Architecture — Architectural Amendment (Post-ACA Parts I–V) |
| **Part** | I — Two-World Principle, Citizen Vision & Sovereign Institutions |
| **Audience** | Circle Architecture Council, Government Digital-Transformation Architects, Sovereign Platform Engineering Leads, Institutional Security Officers, Federation Fabric Operators |
| **Status** | Living document — authoritative for Part I scope (Parts I–XX of the federated government amendment) |
| **Owner** | Circle Architecture Council (cross-institutional stewardship) |
| **Related** | `CIRKLE-BLUEPRINT-v16.md` (public Circle), `CIRKLE-ACA-BLUEPRINT.md` (ACA Sovereign Edition, Parts I–V), `ACA-EVIDENCE-INTEGRITY-GOVERNANCE.md`, `ACA-INTEGRATION-DEPLOYMENT-COMPLIANCE.md`, `CIRKLE-BLUEPRINT-COMPLIANCE.md` |
| **Source requirements** | `Pasted Content_1787847269794.txt` — MASTER ARCHITECTURAL AMENDMENT PROMPT, Parts I–XX |
| **Confidentiality** | Institutional — restricted distribution. Contains no real credentials, certificates, or government endpoints. |

---

## Table of Contents

- **PART I — The Most Important Architectural Principle** — the two-worlds rule, the federation connector, and the anti-merge constitutional constraint
- **PART II — Circle Universal Citizen Vision Must Remain Intact** — preservation of all citizen-facing features and the citizen-obliviousness principle
- **PART III — Government Must Not Become One Centralized Circle Back Office** — constitutional rule: Circle does not become the government
- **PART IV — Each Government Institution Must Be Sovereign** — the Sovereign Institutional Workspace concept and the per-institution ownership inventory
- **PART V — ACA Must Be Completely Confidential and Invisible** — the hard invisibility requirement and the eight separations
- **PART VI — ACA Identity Model** — ACA-issued institutional identity, controls, device binding, and the no-parallel-national-identity rule
- **PART VII — Police Must Be Separate from ACA** — sovereign police domain, ownership inventory, and authorized inter-agency exchange
- **PART VIII — Ambulance / EMS Must Be Separate** — EMS sovereignty, hospital handoffs, and the medical-record ownership rule
- **PART IX — Fire / Civil Protection Must Be Separate** — dispatch, hazmat, rescue, inspections, and the separate institutional domain
- **PART X — Traffic Must Be Separate** — accidents, enforcement, evidence, and the traffic institutional model
- **PART XI — Other Government Services Must Remain Separate** — utilities, regulators, licensing, and the authority-of-record principle
- **PART XII — One Front Door, Many Sovereign Back Offices** — the civic front door / many sovereign institutions / one federation fabric principle
- **PART XIII — Circle Federated Government Fabric** — the federation and government integration layer and its non-centralization posture
- **PART XIV — Four/Five Level Government Integration Model** — Level 0 (Directory) through Level 4 (Federated Intelligence)
- **PART XV — System of Record Principle** — WHO OWNS THE ORIGINAL RECORD? for every integration
- **PART XVI — Zero-Copy / Federated Data Architecture** — authorized query, minimum necessary result, no silent bulk copy
- **PART XVII — Institutional Authority Matrix** — the mandatory connector descriptor that must exist before any integration is activated
- **PART XVIII — No Cross-Institution Privilege Inheritance** — the hard-coded independence rule between institutional boundaries
- **PART XIX — Institutional Identity = Institution + Role + Clearance + Assignment** — the composite identity model and the rejection of a universal "government employee" permission class
- **PART XX — Public Citizen Shield** — the public civic interface and the citizen-side abstraction over institutional complexity

### Cross-Part Map (for orientation)

| Part | Scope | Primary Sections |
|---|---|---|
| **Part I (this document)** | Two-world principle, citizen vision, sovereign institutions, federation fabric, integration levels, system-of-record, authority matrix, privilege isolation, composite identity, Citizen Shield | Amendment Parts I–XX |
| **Part II (forthcoming)** | Emergency Architecture & Service Routing — intake, triage, dispatch handoff, multi-agency orchestration for emergency events | (post-amendment) |
| **Part III (forthcoming)** | Inter-Agency Exchange & Evidence Handoff — authorized cross-boundary information exchange, evidence transfer, federated queries | (post-amendment) |
| **Part IV (forthcoming)** | Institutional Intelligence, Analytics & Federated AI Governance — Level 3/Level 4 intelligence, federated learning, AI authority boundary | (post-amendment) |
| **Part V (forthcoming)** | Deployment, Sovereignty, Compliance & Operating Model — sovereign data planes, jurisdictional deployment, compliance mapping, KPIs | (post-amendment) |

> Cross-references between parts use the form: *"See Part II: Emergency Architecture & Service Routing"* and *"See Part IV: Institutional Intelligence & Federated AI Governance."*

---

## PART I — The Most Important Architectural Principle

> *"Circle must remain two distinct worlds."* — Amendment Part I

This is the single most important architectural constraint introduced by this amendment. Every subsequent part inherits it. Violating it — even partially, even in the name of "convenience," "unified experience," or "operational efficiency" — invalidates the sovereign posture of the platform and forces a return to this principle before any further work proceeds.

### I.1 The two distinct worlds

The Circle platform must be architected as **two distinct, structurally separated worlds**, connected by a third, deliberately constrained layer.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   WORLD A — CIRCLE UNIVERSAL CITIZEN LAYER                              │
│   ────────────────────────────────────────                              │
│   Free, privacy-first, offline-first citizen platform.                  │
│   Citizen-oblivious to government structure.                            │
│   Citizen-sovereign identity (Circle ID).                               │
│   Citizen-facing services (Wasl, Mashahd, Mail, Payments, Citizen        │
│   Shield, Maps, Translation, Rihla, etc.).                              │
│                                                                         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     │  POLICY-CONTROLLED HANDOFF ONLY
                                     │  (defined intake / referral / event paths)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   CONNECTOR — CIRCLE FEDERATED GOVERNMENT FABRIC                         │
│   ────────────────────────────────────────                              │
│   Routing, interoperability, service discovery, federation,             │
│   controlled information exchange, evidence handoff, event              │
│   exchange, data translation, provenance, cross-system correlation.     │
│   NEVER a centralized master government database.                        │
│                                                                         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     │  SOVEREIGN-INSTITUTION BOUNDARY
                                     │  (per-institution identity, policy, audit)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   WORLD B — SOVEREIGN GOVERNMENT INSTITUTIONAL LAYER                    │
│   ────────────────────────────────────────                              │
│   Each institution: sovereign workspace, sovereign data plane,         │
│   sovereign identity domain, sovereign policy, sovereign audit.        │
│   Examples: ACA, Police, EMS, Fire/Civil Protection, Traffic,           │
│   Health, Local Government, Regulatory, Financial Oversight, etc.       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### I.2 The three architectural entities

| # | Entity | Nature | Sovereignty | Visibility to ordinary citizens |
|---|---|---|---|---|
| 1 | **Circle Universal Citizen Layer** | Citizen-facing super-app | Citizen-sovereign | Direct — this *is* the citizen experience |
| 2 | **Circle Federated Government Fabric** | Cross-institutional integration layer | Federation-sovereign (jointly governed by participating institutions) | Indirect — citizens encounter it only as "Circle routed my request" |
| 3 | **Sovereign Government Institutional Layer** | One Sovereign Institutional Workspace per institution | Institution-sovereign | Invisible by default — each institution controls its own visibility boundary |

### I.3 The constitutional architectural rule

The following rule is to be treated as a **constitutional architectural constraint** — a constraint that takes precedence over feature requests, integration requests, performance optimizations, and operational convenience.

> **Circle does not become the government, and the government does not become Circle.**
>
> The Circle Universal Citizen Layer and the Sovereign Government Institutional Layer are two distinct worlds. They are connected exclusively through the Circle Federated Government Fabric under explicit, per-institution, per-purpose policy control. No entity — including Circle itself — may merge, blur, route around, or unify these worlds without an explicit architectural amendment at this same constitutional level.

### I.4 Anti-patterns that violate the two-world principle

The following patterns are explicitly prohibited. Each one is a known historical failure mode for citizen-facing platforms that attempt to absorb government functions; this amendment names and rejects them in advance.

| # | Anti-pattern | Why it violates the principle |
|---|---|---|
| 1 | "Single sign-on to everything" — one Circle identity silently authenticates into every government institution | Merges World A identity with World B identity; eliminates the per-institution sovereignty boundary |
| 2 | "Unified citizen-government dashboard" — a single Circle screen shows citizen data alongside government case data | Merges World A surface with World B surface; exposes institutional data to citizen-side threat model |
| 3 | "Master government database inside Circle" — Circle becomes the system of record for government data | Replaces multiple sovereign systems of record with one centralized commercial platform |
| 4 | "Government as Circle feature" — ACA / Police / EMS appear as tabs inside the public Circle app | Collapses World B into World A; breaks confidentiality (Part V) |
| 5 | "Universal government employee permission" — any verified government employee sees all institutions | Violates privilege isolation (Part XVIII) and composite identity (Part XIX) |
| 6 | "Bulk copy into Circle for performance" — entire institutional databases replicated into Circle | Violates zero-copy principle (Part XVI) and system-of-record principle (Part XV) |
| 7 | "Auto-escalate everything to ACA" — any citizen report auto-routed to ACA | Breaks ACA invisibility (Part V) and ACA ↔ Police separation (Part VII) |
| 8 | "Institution-peeping" — one institution silently reads another institution's data via the fabric | Violates no cross-institution privilege inheritance (Part XVIII) and authorized inter-agency exchange (Part VII) |

### I.5 Why two worlds (rationale)

This separation is not aesthetic. It is structural and exists for the following reasons:

1. **Sovereignty of institutions.** Each government institution is a legal, operational, and accountability entity with its own authority, audit regime, and chain of command. A platform that absorbs them into a single back office erases their sovereignty and creates a single point of failure for the entire government.
2. **Citizen trust.** Citizens trust Circle because it is a citizen platform — not a government surveillance surface, not a ministry front-end, not a police tool. Keeping Circle visibly citizen-facing preserves that trust.
3. **Auditability.** When each institution owns its own data plane, audit trails are clean, attributable, and institutionally meaningful. A merged back office produces ambiguous audit trails and shared blame.
4. **Liability containment.** A breach of Circle does not become a breach of every government institution. A breach of one institution does not become a breach of Circle.
5. **Independent evolution.** Circle can iterate on citizen experience without destabilizing government systems. Government institutions can modernize at their own pace without breaking Circle.
6. **Legal jurisdiction.** Different institutions operate under different legal regimes (criminal procedure, medical privacy, customs law, tax law). A merged platform forces a single legal regime onto all of them; two worlds preserve jurisdictional correctness.

### I.6 What this part establishes for the rest of the amendment

Part I establishes:

1. The two-worlds architectural principle (this Part)
2. The preservation of the citizen-facing Circle vision (Part II)
3. The constitutional rule that Circle does not become the government (Part III)
4. The Sovereign Institutional Workspace concept (Part IV)
5. The ACA confidentiality and invisibility requirement (Part V)
6. The ACA identity model (Part VI)
7. The separation of each emergency / civic institution — Police (VII), EMS (VIII), Fire/Civil Protection (IX), Traffic (X), Other Services (XI)
8. The civic front door / sovereign back offices / federation fabric model (Part XII)
9. The Circle Federated Government Fabric and its responsibilities (Part XIII)
10. The four/five-level integration maturity model (Part XIV)
11. The system-of-record principle (Part XV)
12. The zero-copy / federated data architecture (Part XVI)
13. The Institutional Authority Matrix (Part XVII)
14. The no-cross-institution-privilege-inheritance rule (Part XVIII)
15. The composite institutional identity model (Part XIX)
16. The Public Citizen Shield interface (Part XX)

> Subsequent amendment parts (Part II: Emergency Architecture & Service Routing; Part III: Inter-Agency Exchange & Evidence Handoff; Part IV: Institutional Intelligence & Federated AI Governance; Part V: Deployment, Sovereignty, Compliance & Operating Model) build on these foundations and do not duplicate them.

---

## PART II — Circle Universal Citizen Vision Must Remain Intact

> *"Preserve Circle as the universal citizen-facing platform. Do not transform Circle into a government application."* — Amendment Part II

### II.1 The citizen-facing inventory that must be preserved

The amendment explicitly requires that every existing citizen-facing capability of Circle be preserved. The table below is the canonical inventory of citizen-facing capabilities. None of them may be removed, deprecated, hidden behind government authentication, or repurposed as a government surface.

| # | Capability | Purpose | Government-linkage posture |
|---|---|---|---|
| 1 | **Wasl** | Citizen-to-citizen and citizen-to-business messaging | Citizen-only; never becomes an institutional channel |
| 2 | **Mashahd** | Video sharing and viewing | Citizen-only; institutional video lives in sovereign evidence vaults |
| 3 | **Lamahat** | Photo moments and sharing | Citizen-only |
| 4 | **Midan** | Public square / civic discourse | Citizen-only; institutions may operate Official Channels but cannot moderate citizen Midan |
| 5 | **Groups / The Circle** | Community organization | Citizen-only |
| 6 | **Official Channels** | Verified institutional public communications | Public-side institution voice; does NOT grant institutional access (see Part IV) |
| 7 | **Creator Channels** | Creator economy and content | Citizen-only |
| 8 | **Professional Network** | Career, skills, professional identity | Citizen-only; institutional personnel records live in sovereign workspaces |
| 9 | **Educational / Institutional Workspaces** | Learning, structured work | Citizen-side workspaces; distinct from Sovereign Institutional Workspaces (see Part IV) |
| 10 | **Local Mesh** | Hyperlocal peer-to-peer mesh | Citizen-only |
| 11 | **Circle Verify** | Public verification of claims / people / entities | Citizen-side verification; institutional verification is a separate sovereign capability |
| 12 | **Circle ID** | Citizen OIDC-style digital identity | Citizen-sovereign identity; NOT a national identity authority (see Part VI) |
| 13 | **Mail** | Citizen messaging and notifications | Citizen-only |
| 14 | **Rihla** | Travel and mobility | Citizen-only |
| 15 | **Maps** | Geographic navigation and discovery | Citizen-only; institutional dispatch maps live in sovereign workspaces |
| 16 | **Universal Translation** | Cross-lingual communication | Citizen-facing; institutional translation is a sovereign capability |
| 17 | **Circle Payments** | Citizen payments and wallet | Citizen-side wallet; institutional financial systems remain sovereign (see Part III) |
| 18 | **AI** | Citizen AI assistance | Citizen-side AI; institutional AI policies are sovereign (see Part IV, Part XIX) |
| 19 | **Backup / Recovery** | Citizen data sovereignty and recovery | Citizen-only |
| 20 | **Privacy** | Citizen privacy controls | Citizen-only; institutional confidentiality is a separate sovereign capability |
| 21 | **Citizen Shield** | Citizen reporting, evidence capture, service discovery, government routing | Citizen-facing civic interface; see Part XX |
| 22 | **Other existing citizen features** | Any citizen-facing feature already in the v16 blueprint | Citizen-only; not repurposable as a government surface without architectural amendment |

### II.2 The citizen-obliviousness principle

Citizens must not be required to know how government is organized in order to use Circle or to receive a government service routed through Circle.

Concretely:

- A citizen reporting an incident should not need to know whether the responsible authority is Police, Traffic, Civil Protection, EMS, a municipality, or a regulator. **Citizen Shield (Part XX) abstracts this.**
- A citizen requesting a service should not need to know which ministry, authority, or directorate owns the service. **The Federation Fabric (Part XIII) routes by responsibility, not by citizen knowledge.**
- A citizen must not see institutional labels such as "ACA," "Police," "Customs," "Tax" in the ordinary Circle navigation, dashboards, or settings — unless they have explicitly entered a context (e.g., Citizen Shield routing) where such a label is the *result* of a routing decision, not a navigational choice.
- A citizen's Circle ID profile must not display "government employee" as a public attribute. Institutional identity is a separate sovereign concept (Part XIX).

### II.3 What must NOT happen

The following transformations are explicitly prohibited by this amendment:

1. **Do not transform Circle into a government application.** Circle remains a citizen platform. Government capabilities live in Sovereign Institutional Workspaces (Part IV), accessed through their own identity domains.
2. **Do not make government institutions the center of Circle's public identity.** Circle's brand, voice, and public communications remain citizen-facing. Government institutions may operate Official Channels, but those channels do not redefine Circle as a government brand.
3. **Do not require a citizen to know how government is organized.** Routing is the responsibility of the Federation Fabric (Part XIII), not the citizen.
4. **Do not gate citizen features behind government authentication.** Wasl, Mashahd, Mail, Payments, and all other citizen capabilities remain accessible to ordinary Circle accounts without any institutional affiliation.
5. **Do not surface institutional data in citizen surfaces.** No institutional case data, evidence, intelligence, or personnel data appears in any citizen-facing screen.
6. **Do not break the citizen privacy posture.** Citizen-side E2EE, privacy controls, data minimization, and offline-first behavior remain intact.

### II.4 The unchanged-vs-changed matrix

| Aspect | Unchanged (citizen-side) | Changed by this amendment |
|---|---|---|
| Citizen identity | Circle ID (citizen OIDC) | No change to citizen identity; institutional identity is added separately (Part VI, Part XIX) |
| Citizen data plane | Edge-replicated, citizen-sovereign | No change; institutional data planes are separate sovereign planes (Part IV) |
| Citizen UX | Home, Wasl, Mashahd, Midan, Mail, Payments, Maps, Rihla, Translation, Citizen Shield | No change to navigation; Citizen Shield gains *routing* intelligence but not institutional surfaces |
| Citizen privacy | E2EE where applicable, data minimization, citizen-owned | No change; institutional confidentiality is additive, not substitutive |
| Citizen commercial model | Free at point of use; monetization elsewhere | No change; institutional services are billed to institutions, never to citizens |
| Citizen governance | Community governance, Circle Verify | No change; institutional governance is separate and sovereign |

### II.5 Boundary contract with Parts III–XX

Part II establishes the **preservation contract**: every subsequent part of this amendment is constrained to operate *without* breaking any row of the inventory in §II.1 or any rule in §II.2–§II.3. If a subsequent part appears to require a change to a citizen-facing capability, that change must be raised as an explicit architectural amendment at the same constitutional level as Part I.

---

## PART III — Government Must Not Become One Centralized Circle Back Office

> *"Circle does not become the government."* — Amendment Part III (constitutional rule)

### III.1 The constitutional architectural rule

This part establishes a **constitutional architectural rule** that takes precedence over any feature, integration, or optimization that would otherwise merge the two worlds defined in Part I.

> **Circle does not become the government.**
>
> Circle is a citizen platform and a federation fabric. It is not the government's back office, not the government's master database, not the government's identity authority, and not the government's system of record. Each government function retains its own sovereign systems, and Circle's role is to connect citizens to those systems — not to absorb them.

### III.2 What Circle does NOT replace

The table below enumerates the government capabilities that Circle must **never** replace, absorb, or become. This list is illustrative, not exhaustive; the principle applies to any government system of record or authority, whether or not named here.

| # | Government capability | Sovereign owner | Circle's relationship |
|---|---|---|---|
| 1 | Ministries | The respective ministry | Circle connects citizens to ministry services; does not become the ministry's back office |
| 2 | Authorities / agencies | The respective authority | Circle routes to authority services; does not host the authority's authoritative records |
| 3 | Police | Police institution (see Part VII) | Citizen Shield routes reports; Police owns incidents, cases, evidence, dispatch |
| 4 | Ambulance / EMS | EMS institution (see Part VIII) | Citizen Shield routes emergency requests; EMS owns medical operational data and patient records |
| 5 | Fire / civil protection | Fire / Civil Protection institution (see Part IX) | Citizen Shield routes emergency requests; institution owns incidents and operational evidence |
| 6 | Traffic | Traffic institution (see Part X) | Citizen Shield routes traffic reports; institution owns enforcement and traffic records |
| 7 | Courts | Judiciary | Circle does not host court records, judgments, or case files |
| 8 | Tax authorities | Tax authority | Circle references tax invoices; the tax system owns them (Part XV) |
| 9 | Customs authorities | Customs authority | Circle references customs declarations; the customs system owns them |
| 10 | Regulators | Respective regulatory body | Circle routes regulatory inquiries; regulator owns regulatory records |
| 11 | Government financial systems | Ministry of Finance / Treasury | Circle Payments is a citizen wallet, not the government treasury |
| 12 | Government identity systems | National identity authority | Circle ID is citizen OIDC, not a national identity authority (see Part VI) |
| 13 | Government PKI | National PKI operator | Circle leverages government PKI where authorized; does not become the PKI |
| 14 | Government systems of record | Each respective institution | Each institution owns its own authoritative records (Part XV) |

### III.3 What Circle DOES provide

Circle's role in the government architecture is deliberately bounded. Circle provides the following capabilities — and only these — to the government layer:

| # | Circle capability | Description | Anti-pattern it avoids |
|---|---|---|---|
| 1 | **Citizen access** | A citizen-facing surface through which government services become reachable without forcing citizens to navigate institutional structure | Does NOT replace institutional service counters; provides an additional, citizen-friendly entry point |
| 2 | **Routing** | Determination of which institution is responsible for a given citizen request or report | Does NOT decide outcomes; only routes |
| 3 | **Federation** | A common connector pattern that institutions can adopt to interoperate | Does NOT mandate a single integration technology; per-institution connectors are sovereign (Part IV) |
| 4 | **Interoperability** | Data translation, schema mapping, and protocol bridging between heterogeneous institutional systems | Does NOT impose a single data model on all institutions |
| 5 | **Controlled information exchange** | Policy-gated, audited, minimum-necessary information sharing between institutions and between citizen-and-institution | Does NOT permit bulk data sharing; see Part XVI (Zero-Copy) and Part XVII (Authority Matrix) |
| 6 | **Orchestration** | Coordinated multi-step workflows across institutions (e.g., an emergency that requires Police + EMS + Fire) | Does NOT become a workflow engine that owns institutional processes; orchestration is consent-based and reversible |
| 7 | **Evidence handoff** | Structured transfer of citizen-captured evidence to the appropriate institutional evidence vault | Does NOT become the institutional evidence vault itself (see Part VII, Part VIII) |
| 8 | **Institutional intelligence (where contracted)** | Analytics, graph, timeline, predictive assistance offered to institutions at Level 3 / Level 4 integration (see Part XIV) | Does NOT impose intelligence; institutions opt in per integration |
| 9 | **Analytics** | Cross-institutional analytics offered at Level 3 (Institutional Intelligence) and Level 4 (Federated Intelligence) — never as a centralized master analytic database | Does NOT become the single government analytic store; federated queries respect each institution's data plane (Part XIII, Part XVI) |
| 10 | **Workflow augmentation** | Augmentation of institutional workflows with AI, automation, and intelligence — under per-institution AI policies | Does NOT replace institutional decision-making; AI outputs remain advisory with human authority boundary |

### III.4 The "Circle is not the government" boundary contract

The following invariants must hold at all times. Each is a testable architectural property:

1. **No institutional system of record lives inside Circle.** For every government record, there is an external authoritative system (Part XV). Circle stores references, not authoritative copies.
2. **No institutional identity authority is Circle.** Circle ID is a citizen identity provider, not a national identity authority (Part VI). Institutional identities are issued by their respective institutions.
3. **No institutional PKI is Circle.** Circle may consume government PKI where authorized; it does not issue government PKI.
4. **No institutional financial system is Circle.** Circle Payments is a citizen wallet; it is not the treasury, not the tax system, not the customs system.
5. **No institutional decision authority is Circle.** Circle routes, augments, and hands off; it does not decide outcomes, render judgments, issue penalties, or execute enforcement actions.
6. **No institutional audit authority is Circle.** Circle's audit covers the Federation Fabric itself; each institution audits its own domain (Part IV).
7. **No single Circle deployment hosts all institutional data.** Each institution operates its own Sovereign Institutional Workspace with its own data plane (Part IV).

### III.5 Boundary contract with Parts IV–XX

Part III establishes the **non-replacement contract**: every subsequent part of this amendment must operate within the bounded role defined in §III.3 and must not violate any invariant in §III.4. If a subsequent part appears to require Circle to assume an institutional authority, that requirement must be raised as an explicit architectural amendment at the constitutional level.

---

## PART IV — Each Government Institution Must Be Sovereign

> *"Every government institution is a separate security and operational domain."* — Amendment Part IV

### IV.1 The Sovereign Institutional Workspace concept

A **Sovereign Institutional Workspace** is the architectural unit of government participation in the Circle federation. Each government institution that participates in the federation operates exactly one Sovereign Institutional Workspace (or, where institutionally justified, a small number of compartmentalized sub-workspaces — for example, a Police workspace and a separate Police Internal Affairs workspace).

A Sovereign Institutional Workspace is **not** a Circle Workspace in the citizen sense. It is a fully separate, institutionally-controlled environment with its own identity domain, data plane, policy engine, audit regime, and administrative controls. It is connected to the Circle Federation Fabric through a per-institution connector, and through that connector it may interact with citizens (via Citizen Shield and routing) and with other institutions (via authorized inter-agency exchange).

### IV.2 Examples of Sovereign Institutional Workspaces

The following are **examples** of institutional deployments the architecture supports. They are not a deployment plan, not a guaranteed catalog, and not a list of institutions that automatically exist. An institution is present in the federation only when that institution has formally onboarded through the federation's authority-matrix process (Part XVII).

| # | Sovereign Institutional Workspace | Primary function | Owns (illustrative) |
|---|---|---|---|
| 1 | **Circle ACA** | Administrative oversight, investigation, evidence, intelligence, governance | ACA investigations, evidence vaults, institutional audit (see `CIRKLE-ACA-BLUEPRINT.md` and Parts V–VI below) |
| 2 | **Circle Police** | Public safety, criminal investigation, patrol, dispatch | Police incidents, cases, evidence, body cameras, investigations, personnel (see Part VII) |
| 3 | **Circle Ambulance / EMS** | Emergency medical response | EMS incidents, dispatch, units, medical operational data, hospital handoffs (see Part VIII) |
| 4 | **Circle Civil Protection / Fire** | Fire, rescue, hazmat, civil protection | Fire incidents, rescue operations, hazmat evidence, inspections (see Part IX) |
| 5 | **Circle Traffic** | Traffic safety, enforcement, accident response | Traffic accidents, traffic incidents, enforcement actions, traffic units (see Part X) |
| 6 | **Circle Health** | Public health services, health information exchange | Public-health records (where authorized), health program workflows |
| 7 | **Circle Local Government** | Municipal services, permits, local records | Municipal permits, local services, local records |
| 8 | **Circle Regulatory Institution** | Sectoral regulation (telecom, energy, financial conduct, etc.) | Regulatory records, licensing, enforcement |
| 9 | **Circle Financial Oversight** | Financial-system oversight, AML, financial intelligence | Financial intelligence records, suspicious-activity reports, oversight cases |
| 10 | **Other government institutions** | Any institution that onboards via the authority-matrix process | Per its own sovereign domain |

> These are **examples of institutional deployments** and **must not be assumed to exist merely because the architecture supports them.** Existence of a workspace requires an institutional onboarding decision, a defined authority matrix (Part XVII), and a per-institution data plane.

### IV.3 Per-institution ownership inventory

Each Sovereign Institutional Workspace owns the following components outright. Circle does not own them; the Federation Fabric does not own them; no other institution owns them. Ownership here means: control of configuration, control of access, control of audit, and accountability for the contents.

| # | Owned component | Owner | Circle's relationship | Federation Fabric's relationship |
|---|---|---|---|---|
| 1 | **Login** | Institution | Provides citizen-side entry only via routing; institutional login is sovereign | Routes authentication events; does not authenticate on the institution's behalf |
| 2 | **Identity domain** | Institution | Citizen Circle ID is separate; institutional identity is institution-issued (Part VI, Part XIX) | Federates identity across domains via SAML/OIDC trust; does not merge domains |
| 3 | **Users** | Institution | Institution provisions its own users; Circle does not | No opinion on user roster |
| 4 | **Roles** | Institution | Institution defines its own role catalog | Federates role assertions only where explicit trust is configured |
| 5 | **Permissions** | Institution | Institution enforces its own RBAC/ABAC | Federates permission *assertions*, never permission *definitions* |
| 6 | **Clearance** | Institution | Institution grants clearance per its own process | Never federates clearance between institutions (Part XVIII) |
| 7 | **Institutional policies** | Institution | Institution authors and enforces policies | May *reference* policies for routing decisions; never overrides |
| 8 | **Data plane** | Institution | Separate sovereign data plane; not co-hosted with citizen data | Routes data between planes under authority matrix; does not store centrally |
| 9 | **Cases** | Institution | Cases live in the institutional data plane | May receive case *references* (not case *contents*) for orchestration |
| 10 | **Workflows** | Institution | Workflows execute in the institutional engine | May *trigger* workflows via consented API; does not own workflow state |
| 11 | **Evidence** | Institution | Institutional evidence vault (e.g., ACA Preservation Vault, Police evidence locker) | Handoff via evidence-transfer protocol; never copies evidence centrally |
| 12 | **Documents** | Institution | Institutional document store | Reference-only; originals stay in the institution |
| 13 | **Audit logs** | Institution | Institutional audit plane (see `ACA-EVIDENCE-INTEGRITY-GOVERNANCE.md` Ch. 57) | Federation Fabric has its own audit plane; the two are correlated but never merged |
| 14 | **System integrations** | Institution | Institution owns its integrations with its own source systems | Fabric federates integrations via the institution's connector |
| 15 | **Dashboards** | Institution | Institutional dashboards are not exposed to citizens or to other institutions | Fabric-level dashboards show federation metadata only |
| 16 | **AI policies** | Institution | Per-institution AI governance (see `ACA-EVIDENCE-INTEGRITY-GOVERNANCE.md` Ch. 58–65) | Fabric never executes AI on institutional data without per-institution policy |
| 17 | **Administrative controls** | Institution | Institutional administrators only | Fabric administrators manage the fabric, not institutions |
| 18 | **Institutional branding / configuration** | Institution | Institutional look-and-feel, classification banners, clearance-aware UI | Fabric is brand-agnostic |

### IV.4 The Sovereign Institutional Workspace diagram

```
                    ┌──────────────────────────────────────────┐
                    │   CIRCLE FEDERATION GOVERNMENT FABRIC     │
                    │   (routing, interoperability, handoff)   │
                    └──────────────────┬───────────────────────┘
                                       │  per-institution CONNECTOR
                                       │  (authority matrix enforced)
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  ACA WORKSPACE  │         │  POLICE WORKSPACE│         │   EMS WORKSPACE  │
│  ─────────────  │         │  ─────────────   │         │  ─────────────   │
│  identity domain│         │  identity domain │         │  identity domain │
│  data plane     │         │  data plane      │         │  data plane      │
│  cases/evidence │         │  cases/evidence  │         │  cases/evidence  │
│  policy engine  │         │  policy engine   │         │  policy engine   │
│  audit plane    │         │  audit plane     │         │  audit plane     │
│  AI policies    │         │  AI policies     │         │  AI policies     │
│  admin controls │         │  admin controls  │         │  admin controls  │
│  branding       │         │  branding        │         │  branding        │
└─────────────────┘         └──────────────────┘         └──────────────────┘
        │                              │                              │
        │   INDEPENDENT SOVEREIGNTY    │   INDEPENDENT SOVEREIGNTY    │
        │   (no privilege inheritance  │   (no privilege inheritance   │
        │    across workspaces —       │    across workspaces —       │
        │    see Part XVIII)            │    see Part XVIII)           │
        ▼                              ▼                              ▼
   … (other sovereign workspaces: Fire / Civil Protection, Traffic, Health,
      Local Government, Regulatory, Financial Oversight, …) …
```

### IV.5 Onboarding, offboarding, and compartmentalization

Each Sovereign Institutional Workspace has a defined lifecycle:

1. **Onboarding.** The institution completes the authority-matrix process (Part XVII), provisions its identity domain, deploys its data plane, configures its connector to the Federation Fabric, and activates one or more integration levels (Part XIV).
2. **Compartmentalization.** An institution may operate multiple compartmentalized sub-workspaces (e.g., Police Patrol vs. Police Internal Affairs vs. Police Intelligence). Each compartment is itself a sovereign workspace with its own identity, data plane, and policy. Compartments do NOT inherit each other's privileges (Part XVIII).
3. **Offboarding.** An institution may offboard at any time. Offboarding terminates its connector, revokes its federation trust, and removes its data plane from the federation metadata. Offboarding does NOT delete the institution's own records, which remain in the institution's sovereign data plane.
4. **Suspension.** An institution may be suspended (e.g., pending investigation, security incident) without offboarding. Suspension pauses the connector and revokes active sessions; the institution's records remain intact.

### IV.6 Boundary contract with Parts V–XX

Part IV establishes the **sovereignty contract**: every subsequent part of this amendment respects the per-institution ownership inventory in §IV.3 and the lifecycle in §IV.5. Any feature that would require Circle or the Federation Fabric to assume ownership of an institutional component is out of scope for this amendment and must be raised as an explicit architectural amendment.

---

## PART V — ACA Must Be Completely Confidential and Invisible

> *"ACA must NOT appear in: ordinary Circle navigation, public menus, normal user dashboards, public search, regular user profiles, public service lists as an internal destination, ordinary Circle settings, consumer workspace lists."* — Amendment Part V

### V.1 The hard architectural requirement

ACA invisibility is a **hard architectural requirement**, not a soft preference, not a "default that can be overridden," and not a configuration option. It is structurally enforced at the navigation, routing, identity, and data-plane layers — not merely hidden behind a feature flag.

This requirement exists because ACA operates as an **administrative oversight and investigation authority**. Any visibility of ACA inside the ordinary Circle surface would:

- Reveal the existence, scope, or direction of ongoing administrative oversight work.
- Permit targeted interference, intimidation, or evidence tampering by subjects of oversight.
- Compromise protected reporter identities.
- Create a misleading impression that ACA is a routine citizen service, which it is not.

### V.2 Where ACA must NOT appear

The following surfaces must never contain ACA content, ACA navigation, ACA branding, ACA search results, ACA profiles, ACA settings, or ACA workspace entries.

| # | Surface | ACA presence | Required behavior |
|---|---|---|---|
| 1 | Ordinary Circle navigation (tabs, sidebars, bottom nav) | Prohibited | ACA is unreachable from any citizen-side navigation element |
| 2 | Public menus (overflow, "More," settings menus) | Prohibited | No "ACA" menu item, no "Report to ACA" shortcut, no "ACA Dashboard" link |
| 3 | Normal user dashboards (Home, citizen dashboard) | Prohibited | No ACA widget, no ACA notification card, no ACA suggestion |
| 4 | Public search | Prohibited | Searching "ACA," "Administrative Control," oversight-related terms returns no institutional results; only public Circle content |
| 5 | Regular user profiles | Prohibited | No "ACA agent" badge, no "government employee" attribute, no clearance indicator |
| 6 | Public service lists (as an internal destination) | Prohibited | ACA never appears as a service the citizen can "select"; routing to ACA, when it occurs, is non-selective and determined by the Fabric |
| 7 | Ordinary Circle settings | Prohibited | No ACA account setting, no ACA notification preference, no ACA data control |
| 8 | Consumer workspace lists | Prohibited | ACA is not a Circle Workspace in the consumer sense (see Part IV) |

### V.3 The eight separations

ACA must maintain the following eight separations from the public Circle surface. Each is independently enforceable and independently auditable.

| # | Separation | Public Circle | ACA Sovereign Environment |
|---|---|---|---|
| 1 | **Login** | Public login (phone/email/OIDC consumer) | ACA institutional login (agent ID + MFA + device trust + government PKI where applicable) |
| 2 | **Dashboard** | Citizen dashboard | ACA Command Center (cases, investigations, intelligence, integrations) — see `CIRKLE-ACA-BLUEPRINT.md` Ch. 10 |
| 3 | **Navigation** | Public navigation tree | ACA navigation tree (Command Center, Intake, Cases, Investigations, … Administration) — see `CIRKLE-ACA-BLUEPRINT.md` Ch. 10 |
| 4 | **Screens** | Public screens | ACA institutional screens (47-screen inventory) |
| 5 | **Data plane** | Citizen data plane (edge-replicated, citizen-sovereign) | ACA sovereign data plane (government datacenter / private cloud / sovereign K8s) |
| 6 | **Security policy** | Public security posture (E2EE where applicable, public privacy) | Zero-trust ACA architecture, HSM key management, dual authorization, legal hold |
| 7 | **Identity provisioning** | Citizen self-signup; Circle ID | ACA-issued institutional identity only (see Part VI) |
| 8 | **Institutional audit** | Community governance / Circle Verify | ACA institutional audit plane (every login, case access, evidence view, export, classification change, AI analysis) |

> The sixteen-separation table in `CIRKLE-ACA-BLUEPRINT.md` Ch. 2 enumerates the full set of separations at finer granularity. This part consolidates the eight separations mandated by the amendment and cross-references the more detailed treatment.

### V.4 ACA agent provisioning rule

ACA agents are created and provisioned **by ACA only**. The provisioning rule is:

1. **ACA-only provisioning.** Only ACA institutional administrators may create ACA agent identities. Circle cannot create ACA agents. The Federation Fabric cannot create ACA agents. No other institution can create ACA agents.
2. **No self-signup.** There is no public signup, no request form, no waitlist, no referral program for ACA access. There is no "Apply for ACA" button anywhere.
3. **No automatic promotion.** A normal Circle citizen does **not** become an ACA user merely by having a Circle account, by being a verified professional, by being a government employee, or by holding any other Circle-side credential.
4. **No discovery.** A regular Circle account cannot discover ACA's internal environment — its URLs, its subdomains, its API endpoints, its navigation tree, its screen inventory, its existence as an internal destination, or its user roster.
5. **No carry-over.** An ACA agent's Circle citizen identity (if they have one) is a separate identity from their ACA institutional identity. The two are correlated only inside ACA's own identity domain, under ACA's own policy, and only for purposes ACA explicitly authorizes (e.g., contacting a citizen reporter through a shielded channel). The Circle citizen identity does not gain ACA privileges.

### V.5 Boundary contract with Parts VI–XX

Part V establishes the **invisibility contract**: every subsequent part of this amendment respects the eight separations and the provisioning rule. Any feature that would surface ACA in a public Circle surface — even partially, even behind authentication — is out of scope and must be raised as an explicit constitutional amendment.

> ACA-specific architectural detail (login flow, navigation tree, screen inventory, identity federation, audit plane, evidence vault, AI governance) is treated in `CIRKLE-ACA-BLUEPRINT.md` (Parts I–V) and `ACA-EVIDENCE-INTEGRITY-GOVERNANCE.md`. This amendment does not duplicate that content; it constrains the *federated* relationship between ACA and other institutions.

---

## PART VI — ACA Identity Model

> *"ACA-ISSUED INSTITUTIONAL IDENTITY. ACA controls: agent creation, activation, role, department, clearance, assignment, device binding, revocation, temporary privileges."* — Amendment Part VI

### VI.1 The ACA-issued institutional identity

An ACA institutional identity is **issued by ACA**, not by Circle, not by the Federation Fabric, not by any national identity authority acting through Circle. The identity exists only inside the ACA identity domain, is recognized only by ACA-controlled systems and ACA-configured federation trusts, and confers no privileges outside the ACA domain.

```
┌──────────────────────────────────────────────────────────────────┐
│              ACA IDENTITY DOMAIN (sovereign)                      │
│                                                                  │
│   ┌────────────────┐    issues    ┌──────────────────────────┐   │
│   │  ACA Identity  │ ──────────▶  │  ACA Institutional Agent │   │
│   │  Authority     │              │  ──────────────────────  │   │
│   │  (ACA-only)    │              │  • agent ID              │   │
│   └────────────────┘              │  • department            │   │
│                                   │  • role                  │   │
│                                   │  • clearance             │   │
│                                   │  • assignment            │   │
│                                   │  • device binding        │   │
│                                   │  • MFA / PKI / HW key    │   │
│                                   │  • activation status     │   │
│                                   │  • revocation status    │   │
│                                   │  • temporary privileges  │   │
│                                   └──────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                  │
                  │  ACA-issued assertion (signed)
                  ▼
        ┌─────────────────────────────────────┐
        │  ACA Sovereign Workspace            │
        │  (data plane, cases, evidence,      │
        │   audit, AI policies)               │
        └─────────────────────────────────────┘
```

### VI.2 What ACA controls

The ACA Identity Authority controls the following attributes and lifecycle events for every ACA institutional agent. None of these are controllable by Circle, by the Federation Fabric, or by any other institution.

| # | Attribute / lifecycle event | ACA control | Notes |
|---|---|---|---|
| 1 | **Agent creation** | ACA-only | No public signup; no Circle-side request path |
| 2 | **Activation** | ACA-only | An agent record may exist in a "pending activation" state until ACA completes onboarding (background check, oath, device enrollment) |
| 3 | **Role** | ACA-only | Role catalog is ACA-defined; not federated |
| 4 | **Department** | ACA-only | Department structure is ACA-internal |
| 5 | **Clearance** | ACA-only | Clearance is granted per ACA process; not inherited from any other institution (Part XVIII) |
| 6 | **Assignment** | ACA-only | Case / investigation / unit assignments are ACA-internal |
| 7 | **Device binding** | ACA-only | Trusted device enrollment; hardware key binding; certificate issuance |
| 8 | **Revocation** | ACA-only | Immediate revocation possible; propagates to all ACA-controlled systems |
| 9 | **Temporary privileges** | ACA-only | Time-limited, purpose-limited privileges with automatic expiry and audit |

### VI.3 Supported authentication mechanisms

Where authorized, ACA institutional identity supports the following authentication and authorization mechanisms. Each is optional, configurable per role and clearance, and never required by Circle or the Federation Fabric.

| # | Mechanism | Purpose | Sovereignty note |
|---|---|---|---|
| 1 | **MFA** | Multi-factor authentication (TOTP, push, biometric) | ACA-controlled factors; Circle never holds the second factor |
| 2 | **Government PKI** | X.509 certificates issued by the national government PKI | ACA consumes PKI; does not issue it (Part III, Part VI §VI.4) |
| 3 | **Certificates** | Client certificates for device and user authentication | ACA-managed issuance via the national PKI where authorized |
| 4 | **Hardware security keys** | FIDO2 / WebAuthn hardware tokens | ACA-enrolled; sovereign substitution of any equivalent hardware acceptable |
| 5 | **Trusted devices** | Device-binding, attestation, jailbreak/root detection | ACA-managed device registry |
| 6 | **Institutional digital signatures** | Signed assertions, signed evidence, signed decisions | ACA signing keys; sovereign HSM acceptable |

> Sovereign substitution principle (carried from `ACA-EVIDENCE-INTEGRITY-GOVERNANCE.md`): commercial standards named here (FIDO2, WebAuthn, X.509) are candidate implementations. Sovereign institutional security hardware of equivalent assurance is always an acceptable substitute.

### VI.4 The no-parallel-national-identity rule

> **Do not create a parallel unofficial national identity authority.**

Circle must not — and ACA must not, through Circle — establish a competing national identity authority. Concretely:

1. **Circle ID is a citizen identity provider**, not a national identity authority. It does not issue national identity cards, does not assert citizenship, does not adjudicate identity disputes, and does not replace the official national identity system.
2. **ACA institutional identity is institutional**, not national. An ACA agent identity asserts "this person is an ACA agent with these attributes," not "this person is a citizen with these attributes."
3. **No parallel identity regime.** ACA's identity model does not create an alternative to the official national identity system. It operates within the existing national identity and PKI ecosystem, leveraging it where authorized and deferring to it where the official system is authoritative.

### VI.5 Leveraging official Egyptian identity / PKI systems

Where authorized, ACA institutional identity **leverages** official Egyptian identity and PKI systems rather than replicating them:

| Capability | Circle / ACA role | Official Egyptian system role |
|---|---|---|
| National identity verification (e.g., national ID number) | Consumes verification result | Authoritative issuer and verifier |
| Government PKI certificates | Consumes certificates; binds to ACA agent identity | Issuer and revocation authority |
| Government identity federation | Federates via government-controlled trust | Trust anchor and policy authority |
| National identity attributes | Consumes only what is authorized | Authoritative source |

ACA never replicates the national identity database, never issues national identity artifacts, and never asserts national identity facts that the official system does not assert.

### VI.6 Boundary contract with Parts VII–XX

Part VI establishes the **identity-sovereignty contract**: every subsequent part of this amendment respects that ACA identity is ACA-issued, that institutional identity is institution-issued, and that Circle ID is citizen-side only. The composite identity model (Part XIX) composes these identity classes without merging them.

---

## PART VII — Police Must Be Separate from ACA

> *"Police must have its own sovereign environment."* — Amendment Part VII

### VII.1 The sovereign Police environment

The Police institution operates its own **Sovereign Institutional Workspace** (see Part IV), distinct from the ACA workspace and from every other institutional workspace. The two are equal in sovereignty: neither is subordinate to the other, and neither has default visibility into the other.

### VII.2 What Police owns

The Police workspace owns the following components outright. ACA does not own them; Circle does not own them; the Federation Fabric does not own them.

| # | Police-owned component | Description |
|---|---|---|
| 1 | **Incidents** | Police incident records — creation, classification, status, linkage |
| 2 | **Dispatch** | Dispatch commands, unit assignments, dispatch audit trail |
| 3 | **Cases** | Criminal cases — opening, assignment, status, closure |
| 4 | **Evidence** | Police evidence locker — physical and digital evidence, chain of custody, evidence integrity (analogous to ACA Preservation Vault) |
| 5 | **Body cameras** | Body-worn camera footage, ingestion, redaction, retention |
| 6 | **Investigations** | Investigation files, hypotheses, suspect/witness records, investigative actions |
| 7 | **Personnel** | Police officer roster, ranks, assignments, internal affairs records |
| 8 | **Workflows** | Police investigation and patrol workflows |
| 9 | **Intelligence** | Police intelligence records, sources, methods — compartmentalized within Police |
| 10 | **Audit** | Police institutional audit plane — every login, case access, evidence view, dispatch action |

### VII.3 ACA ↔ Police boundary rules

The following rules govern the boundary between the ACA workspace and the Police workspace. They are symmetric: each rule applies in both directions.

| # | Rule | Direction |
|---|---|---|
| 1 | **No default visibility.** ACA does not automatically see Police information; Police does not automatically see ACA information. | ACA ↔ Police |
| 2 | **No privilege inheritance.** An ACA agent's clearance does not grant Police access; a Police officer's clearance does not grant ACA access. | ACA ↔ Police |
| 3 | **No shared identity.** ACA identities are not Police identities; the two identity domains are federated only where explicit trust is configured. | ACA ↔ Police |
| 4 | **No shared data plane.** ACA's data plane and Police's data plane are separate; no shared database, no shared table, no shared storage volume. | ACA ↔ Police |
| 5 | **No shared audit.** Each institution maintains its own audit plane; the two planes are correlated by the Federation Fabric but never merged. | ACA ↔ Police |
| 6 | **No silent routing.** Citizen Shield may route a report to ACA or to Police, but never to both simultaneously without an explicit inter-agency exchange authorization. | ACA ↔ Police |

### VII.4 Authorized inter-agency exchange

Cross-boundary access between ACA and Police — and between any two institutions in general — occurs only through **Authorized Inter-Agency Exchange**: a policy-gated, audited, minimum-necessary, purpose-bound information exchange governed by the Institutional Authority Matrix (Part XVII).

```
┌────────────────────┐                                 ┌────────────────────┐
│   ACA WORKSPACE    │                                 │  POLICE WORKSPACE  │
│                    │                                 │                    │
│  cases · evidence  │      AUTHORIZED                 │  incidents · cases │
│  intelligence      │      INTER-AGENCY               │  evidence · BWC    │
│  audit             │      EXCHANGE                   │  investigations   │
│                    │   (authority matrix,            │  intelligence     │
│                    │    minimum necessary,           │  audit            │
│                    │    purpose-bound,               │                    │
│                    │    audited, time-limited)       │                    │
└─────────┬──────────┘                                 └──────────┬─────────┘
          │                                                       │
          └─────────────────┬─────────────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────────┐
              │  CIRCLE FEDERATION FABRIC    │
              │  (mediates the exchange,     │
              │   enforces the authority     │
              │   matrix, records audit)     │
              └──────────────────────────────┘
```

Characteristics of an authorized inter-agency exchange:

1. **Authority matrix present.** An Institutional Authority Matrix entry (Part XVII) exists for the exchange, specifying purpose, legal/administrative basis, authorized actors, data fields, retention, and audit.
2. **Minimum necessary.** Only the fields and records required for the stated purpose are exchanged; no bulk transfer, no "while we're at it" expansion.
3. **Purpose-bound.** The exchanged information may be used only for the stated purpose; secondary use requires a new authority matrix entry.
4. **Time-limited.** Where applicable, the exchange has a defined expiry; continued access requires re-authorization.
5. **Audited on both sides.** Both institutions record the exchange in their own audit planes; the Federation Fabric records a third, federated audit entry.
6. **Revocable.** Either institution may revoke an active exchange; revocation propagates within theFabric's policy enforcement window.

### VII.5 Boundary contract

Part VII establishes the **ACA-Police separation contract**: every subsequent part of this amendment respects the sovereignty of the Police workspace, the no-default-visibility rule, and the authorized-inter-agency-exchange model. Emergency co-response (where Police, EMS, and Fire respond to a single incident) is treated in *Part II: Emergency Architecture & Service Routing* and respects each institution's sovereignty throughout the co-response.

---

## PART VIII — Ambulance / EMS Must Be Separate

> *"EMS owns: emergency incidents, dispatch, units, medical operational data, patient information where applicable, hospital handoffs, EMS workflows, fleet, audit. Circle may provide citizen access and routing. Circle must not become the medical system of record merely because Citizen Shield initiated the interaction."* — Amendment Part VIII

### VIII.1 The sovereign EMS environment

The Ambulance / EMS institution operates its own Sovereign Institutional Workspace (Part IV), with its own identity domain, data plane, policy engine, and audit plane. EMS is the **medical operational authority** for emergency medical response; Circle is the citizen access and routing surface that may initiate an EMS interaction.

### VIII.2 What EMS owns

| # | EMS-owned component | Description | Circle's relationship |
|---|---|---|---|
| 1 | **Emergency incidents** | EMS incident records — creation, classification, status, dispatch linkage | Citizen Shield routes the citizen request; EMS creates and owns the incident |
| 2 | **Dispatch** | EMS dispatch commands, unit assignments, dispatch audit | Circle does not dispatch; EMS does |
| 3 | **Units** | Ambulance units, crew, equipment, status, location (operational) | Circle does not own the unit roster; EMS does |
| 4 | **Medical operational data** | On-scene medical operational data captured by EMS crews | Sovereign to EMS; not shared with ACA, Police, or other institutions without authority matrix |
| 5 | **Patient information** | Patient records created or held by EMS for the duration of the emergency response | EMS is the operational holder; longitudinal patient records remain with the health system (see Part XI) |
| 6 | **Hospital handoffs** | Handoff records — which hospital, when, what was handed off, receiving clinician | Sovereign to EMS; the hospital's record of receipt is sovereign to the hospital |
| 7 | **EMS workflows** | EMS-specific clinical and operational workflows | Circle does not own EMS workflows; it may trigger them via routing |
| 8 | **Fleet** | Ambulance fleet — vehicles, maintenance, telemetry, dispatch eligibility | Sovereign to EMS |
| 9 | **Audit** | EMS institutional audit plane — every dispatch, every patient interaction, every handoff | Sovereign to EMS |

### VIII.3 The medical-system-of-record rule

> **Circle must not become the medical system of record merely because Citizen Shield initiated the interaction.**

Citizen Shield (Part XX) is the citizen-side capability that may receive an emergency request ("I need an ambulance") and route it to EMS. The act of routing does **not** transfer system-of-record ownership to Circle. EMS remains the medical system of record for everything that happens after the handoff — dispatch, response, on-scene care, transport, handoff to hospital.

This rule applies symmetrically to every institution: initiating a routing interaction through Citizen Shield does not transfer system-of-record ownership to Circle (see Part XV).

### VIII.4 Boundary contract with citizens and other institutions

| Boundary | Rule |
|---|---|
| Citizen ↔ EMS | Citizen provides minimum necessary information to enable routing (location, nature of emergency, contact); EMS collects additional clinical information from the patient on scene |
| Circle ↔ EMS | Circle routes; EMS owns the incident; Circle stores only the routing receipt and the citizen-side report metadata |
| EMS ↔ Hospital | EMS hands off to the hospital; the hospital creates its own encounter record; the two records are correlated by handoff identifiers but never merged |
| EMS ↔ Police | In a co-response (e.g., traffic accident with injuries), each institution owns its own records; cross-institutional visibility requires authorized inter-agency exchange (Part VII §VII.4) |
| EMS ↔ ACA | No default visibility in either direction; ACA oversight of EMS, where it occurs, is governed by ACA's own institutional authorities and the authority matrix (Part XVII) |

### VIII.5 Boundary contract

Part VIII establishes the **EMS-sovereignty contract**. Emergency co-response involving EMS, Police, and Fire is treated in *Part II: Emergency Architecture & Service Routing*; each institution's sovereignty is preserved throughout the co-response.

---

## PART IX — Fire / Civil Protection Must Be Separate

> *"Provide architecture for: emergency dispatch, fire incidents, rescue, hazardous-material incidents, operational evidence, field operations, inspections, reporting. Remain a separate institutional domain."* — Amendment Part IX

### IX.1 The sovereign Fire / Civil Protection environment

The Fire / Civil Protection institution operates its own Sovereign Institutional Workspace (Part IV). It is the operational authority for fire suppression, rescue, hazardous-material response, civil-protection operations, and related inspections and reporting.

### IX.2 Architecture elements

| # | Element | Description | Sovereignty |
|---|---|---|---|
| 1 | **Emergency dispatch** | Fire / Civil Protection dispatch — units, routes, assignments, status | Fire / Civil Protection |
| 2 | **Fire incidents** | Fire incident records — origin, scope, status, suppression actions, casualties | Fire / Civil Protection |
| 3 | **Rescue** | Rescue operations (structural collapse, water rescue, high-angle, confined space) | Fire / Civil Protection |
| 4 | **Hazardous-material incidents** | Hazmat response — substance, extent, containment, environmental impact, decontamination | Fire / Civil Protection; environmental data may also be the regulator's record (see Part XI) |
| 5 | **Operational evidence** | Scene evidence captured by Fire / Civil Protection crews — photographs, scene sketches, sensor data | Fire / Civil Protection; chain of custody analogous to ACA Preservation Vault |
| 6 | **Field operations** | Field unit operations — units, personnel, equipment, status | Fire / Civil Protection |
| 7 | **Inspections** | Fire safety inspections, code compliance inspections, building inspections | Fire / Civil Protection; the inspected entity's records are their own |
| 8 | **Reporting** | Fire / Civil Protection reports — incident reports, inspection reports, statistical reports | Fire / Civil Protection |

### IX.3 Separate institutional domain

Fire / Civil Protection is a separate institutional domain from Police, EMS, ACA, and all other institutions. The same boundary rules apply (no default visibility, no privilege inheritance, no shared identity, no shared data plane, no shared audit, no silent routing — see Part VII §VII.3).

### IX.4 Boundary contract with other institutions

| Boundary | Rule |
|---|---|
| Fire ↔ EMS | At a fire with casualties, each institution owns its own records; cross-visibility requires authorized inter-agency exchange |
| Fire ↔ Police | At a fire with suspected arson, Fire owns the fire investigation; Police owns the criminal investigation; each may exchange evidence via authorized inter-agency exchange |
| Fire ↔ Local Government | Building inspections are Fire's record; the building's permit and occupancy records are Local Government's record (Part XI); the two are correlated by building identifier |
| Fire ↔ Environmental Regulator | Hazmat environmental impact is shared jurisdiction; the authority matrix (Part XVII) specifies which field is owned by whom |

### IX.5 Boundary contract

Part IX establishes the **Fire/Civil-Protection-sovereignty contract**. Multi-agency emergency response involving Fire is treated in *Part II: Emergency Architecture & Service Routing*.

---

## PART X — Traffic Must Be Separate

> *"Provide a separate institutional model for: accidents, traffic incidents, enforcement, field operations, evidence, reports, traffic units."* — Amendment Part X

### X.1 The sovereign Traffic environment

The Traffic institution operates its own Sovereign Institutional Workspace (Part IV). It is the operational authority for traffic safety, traffic incident response, traffic enforcement, and traffic-unit management.

### X.2 Institutional model

| # | Element | Description | Sovereignty |
|---|---|---|---|
| 1 | **Accidents** | Traffic accident records — vehicles, parties, injuries, road conditions, fault determination (where applicable) | Traffic; cross-references to Police criminal investigation where criminal conduct is suspected |
| 2 | **Traffic incidents** | Non-accident traffic incidents — congestion, road hazards, signal failures, weather events | Traffic |
| 3 | **Enforcement** | Traffic enforcement actions — citations, violations, penalties, adjudication status | Traffic; the financial system of record for paid penalties is separate (Part III, Part XI) |
| 4 | **Field operations** | Traffic field units — patrols, checkpoints, escorts | Traffic |
| 5 | **Evidence** | Traffic evidence — dashcam footage, scene photographs, speed readings, sensor data | Traffic; chain of custody analogous to ACA Preservation Vault |
| 6 | **Reports** | Traffic reports — accident reports, enforcement reports, statistical reports | Traffic |
| 7 | **Traffic units** | Traffic unit roster — vehicles, equipment, personnel, status | Traffic |

### X.3 Boundary contract with other institutions

| Boundary | Rule |
|---|---|
| Traffic ↔ Police | A traffic accident with criminal conduct (e.g., hit-and-run, DUI) becomes a Police case; Traffic retains the accident record; cross-visibility via authorized inter-agency exchange |
| Traffic ↔ EMS | A traffic accident with injuries triggers EMS response; each institution owns its own records |
| Traffic ↔ Fire | A traffic accident involving fire or hazmat triggers Fire response; each institution owns its own records |
| Traffic ↔ ACA | No default visibility; ACA oversight of Traffic, where it occurs, is governed by ACA's authorities and the authority matrix (Part XVII) |
| Traffic ↔ Local Government | Road infrastructure records are Local Government's; traffic enforcement records are Traffic's; correlated by road identifier |

### X.4 Boundary contract

Part X establishes the **Traffic-sovereignty contract**.

---

## PART XI — Other Government Services Must Remain Separate

> *"Each remains the authority/system of record for its own function. Circle connects citizens to them."* — Amendment Part XI

### XI.1 The catalog of other government services

Beyond the emergency and oversight institutions (Parts V–X), a wide range of government services remain sovereign. Each is the authority and system of record for its own function. Circle connects citizens to them — it does not absorb them.

| # | Service / Institution | Authority / System of record | Circle's relationship |
|---|---|---|---|
| 1 | **Electricity** | Electricity utility / ministry | Routing, payments, outage reporting; utility owns the meter, billing, and grid records |
| 2 | **Water** | Water utility / authority | Routing, payments, quality inquiries; utility owns the meter, billing, and quality records |
| 3 | **Gas** | Gas utility / authority | Routing, payments, safety reporting; utility owns the meter, billing, and safety records |
| 4 | **Telecom** | National telecom regulator / operators | Routing, complaints; regulator owns regulatory records; operators own subscriber records |
| 5 | **Health** | Ministry of Health / health information exchange | Public-health routing; the longitudinal patient record belongs to the health system, not Circle |
| 6 | **Education** | Ministry of Education / institutions | Education records belong to the institution; Circle routes access to results and schedules |
| 7 | **Transport** | Transport authorities / operators | Ticketing, scheduling, and routing; the operational transport record belongs to the operator |
| 8 | **Local government** | Municipalities / governorates | Permits, local services, local records; the municipality owns the record |
| 9 | **Consumer protection** | Consumer protection authority | Complaint routing; the authority owns the case |
| 10 | **Regulators** | Sectoral regulators (telecom, energy, financial conduct, competition) | Regulatory records belong to the regulator |
| 11 | **Licensing** | Licensing authorities | License records belong to the licensing authority |
| 12 | **Permits** | Permitting authorities | Permit records belong to the permitting authority |
| 13 | **Environmental services** | Environmental authority / ministry | Environmental monitoring data belongs to the authority; cross-references to Fire hazmat data via authority matrix |

### XI.2 The authority-of-record principle

For every service listed above — and for any other government service added to the federation in the future — the following principle holds:

1. **The institution is the authority of record.** The official, authoritative record belongs to the institution's own system.
2. **Circle stores only what is legitimately required.** Routing metadata, payment receipts (where Circle Payments is used), and citizen-side report content may live in Circle; the authoritative service record does not (Part XV).
3. **Citizens connect, not redirect.** The citizen experience is a connection: a single Circle surface that routes to the right institution. The citizen should not be bounced to a separate portal, asked to re-authenticate, or forced to know the institution's name — unless the institution's own policy requires direct authentication for that service (e.g., a banking-grade financial service).
4. **No silent absorption.** No institution is "added to Circle" without going through the onboarding process (Part IV §IV.5) and the authority-matrix process (Part XVII).

### XI.3 Boundary contract

Part XI establishes the **plurality contract**: the federation supports many sovereign institutions, each remaining the authority of record for its function. The Federation Fabric (Part XIII) provides the routing and interconnection; it does not centralize any of these authorities.

---

## PART XII — One Front Door, Many Sovereign Back Offices

> *"ONE CIVIC FRONT DOOR / MANY SOVEREIGN INSTITUTIONS / ONE CONTROLLED FEDERATION FABRIC."* — Amendment Part XII

### XII.1 The three-part architectural principle

This part synthesizes Parts I–XI into a single architectural principle expressed in three lines:

```
# ONE CIVIC FRONT DOOR          — Circle (citizen-facing, Citizen Shield)
# MANY SOVEREIGN INSTITUTIONS   — Each institutional workspace (Part IV)
# ONE CONTROLLED FEDERATION FABRIC  — The Circle Federated Government Fabric (Part XIII)
```

### XII.2 The citizen experience

> **Citizen says:** *"I need help."*
>
> **Circle determines the appropriate path.**

The citizen does not need to know:

- Which institution is responsible
- Whether the matter is criminal, administrative, medical, or regulatory
- Whether the matter will be handled by one institution or several
- Whether the matter will require evidence handoff, dispatch, or simple referral

The citizen provides what they can (location, nature of the request, urgency, contact, optional evidence). Circle routes. The institution(s) that receive the routing handle the matter in their own sovereign workspace.

### XII.3 The government experience

> **Each institution receives only what belongs to its domain.**

The government experience is the inverse of the citizen experience. Where the citizen experience is "I don't need to know who handles this," the government experience is "I receive only what is mine to handle."

| Government experience | Rule |
|---|---|
| Routing relevance | An institution receives a routing only when the matter falls within its domain |
| Minimum necessary | The institution receives only the information needed to act on the routing — not the entire citizen profile, not unrelated reports, not other institutions' data |
| Sovereign handling | The institution creates its own case, incident, or service record in its own data plane |
| No cross-contamination | Other institutions do not automatically receive a copy of this institution's record |
| Auditable handoff | The handoff is recorded in both Circle's routing audit and the institution's intake audit |

### XII.4 The front-door / back-office diagram

```
                       CITIZEN
                         │
                         │  "I need help."
                         ▼
        ┌────────────────────────────────────────────┐
        │   ONE CIVIC FRONT DOOR                      │
        │   (Circle · Citizen Shield — Part XX)       │
        │   routing, intake, evidence capture,       │
        │   tracking, receipts, translation          │
        └───────────────────┬────────────────────────┘
                            │
                            │  routing decision
                            ▼
        ┌────────────────────────────────────────────┐
        │   ONE CONTROLLED FEDERATION FABRIC         │
        │   (Circle Federated Government Fabric      │
        │    — Part XIII)                            │
        │   routing · interoperability · handoff     │
        │   authority matrix enforcement             │
        └─────┬─────┬─────┬─────┬─────┬─────┬────────┘
              │     │     │     │     │     │
              ▼     ▼     ▼     ▼     ▼     ▼
            ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
            │ACA│ │PD │ │EMS│ │FIR│ │TRF│ │...│   ← MANY SOVEREIGN
            └───┘ └───┘ └───┘ └───┘ └───┘ └───┘     INSTITUTIONS
              │     │     │     │     │     │
              ▼     ▼     ▼     ▼     ▼     ▼
        Each institution creates/owns its own case in its own data plane.
        Citizen sees a tracking receipt; never sees the institutional case.
```

### XII.5 Boundary contract

Part XII establishes the **front-door contract**: the citizen experience is unified through one front door; the government experience remains sovereign across many institutions; the federation fabric is the sole controlled connector between them. Any feature that would either fragment the citizen front door (e.g., per-institution citizen portals) or centralize the back office (e.g., a unified institutional case database) is out of scope and must be raised as an explicit architectural amendment.

---

## PART XIII — Circle Federated Government Fabric

> *"CIRCLE FEDERATION & GOVERNMENT INTEGRATION FABRIC. It must NOT become a centralized master government database."* — Amendment Part XIII

### XIII.1 Definition

The **Circle Federated Government Fabric** (also referred to as "the Fabric") is the controlled connector between the Circle Universal Citizen Layer and the Sovereign Government Institutional Layer (see Part I). It is a federation and integration layer, not a data store, not a master database, and not an institutional system.

### XIII.2 Responsibilities

The Fabric's responsibilities are bounded and enumerated. The table below is the canonical list. The Fabric does not perform any function outside this list; any function not on this list belongs to the citizen layer (Part II), to an institution (Part IV), or to an external system.

| # | Responsibility | Description | Non-goal |
|---|---|---|---|
| 1 | **Routing** | Determine which institution(s) receive a given citizen request or report | Does not decide outcomes; does not adjudicate |
| 2 | **Interoperability** | Bridge heterogeneous institutional systems — schema mapping, protocol translation | Does not impose a single integration technology |
| 3 | **Service discovery** | Maintain a registry of available institutional services and their integration level (Part XIV) | Does not expose internal institutional details to citizens |
| 4 | **Authentication federation** | Federate identity across institutional identity domains via SAML/OIDC trust | Does not issue institutional identities; does not merge identity domains |
| 5 | **Controlled information exchange** | Mediate policy-gated, audited, minimum-necessary information exchange between institutions | Does not permit bulk data sharing; see Part XVI |
| 6 | **Referral** | Refer a citizen request from one institution to another when responsibility shifts | Does not own the referred case; the receiving institution does |
| 7 | **Evidence transfer** | Structured transfer of citizen-captured evidence to the appropriate institutional evidence vault | Does not store institutional evidence centrally |
| 8 | **Event exchange** | Pub/sub-style event exchange between institutions (e.g., "incident created," "case closed") for correlation and orchestration | Does not become a centralized event log; each institution owns its own events |
| 9 | **Data translation** | Translate data representations between institutional schemas | Does not impose a single canonical schema |
| 10 | **Provenance** | Record the provenance of every exchange — originator, recipient, purpose, authority matrix reference, timestamp | Does not alter institutional records; only records the exchange |
| 11 | **Cross-system correlation** | Where authorized, correlate identifiers across institutional systems to support orchestration and intelligence | Does not become a master correlation index; correlation is per-purpose and per-authority-matrix |

### XIII.3 The non-centralization rule

> **The Fabric must NOT become a centralized master government database.**

The Fabric is a connector, not a store. Concretely:

1. **No institutional records live in the Fabric.** The Fabric holds only the metadata required to mediate exchanges (routing slips, authority-matrix references, provenance entries, federation audit entries). It does not hold institutional case data, evidence, personnel records, or intelligence.
2. **No master citizen-government database.** The Fabric does not become a single database joining citizen data with government data. Joins are performed per-exchange, under authority-matrix control, with results delivered to the authorized recipient and not stored centrally.
3. **No master identity directory.** The Fabric federates identity across institutional identity domains; it does not become a single identity directory.
4. **No master audit log.** Each institution maintains its own audit plane; the Fabric maintains its own federation audit plane. The two are correlated but never merged (Part IV §IV.3, rows 13 and 17).

### XIII.4 Federation vs. centralization

| Property | Federation (the Fabric) | Centralization (anti-pattern) |
|---|---|---|
| Authoritative record | Lives in the institution | Lives in the central platform |
| Identity | Per-institution identity domain | Single identity directory |
| Audit | Per-institution audit plane + federation audit | Single audit log |
| Data storage | Per-institution data plane | Single data store |
| Decision authority | Per-institution | Centralized |
| Failure mode | One institution fails; others continue | Platform fails; entire government stalls |
| Trust model | Distributed, federated | Single trust anchor |
| Evolution | Per-institution | Single release train |
| Legal jurisdiction | Per-institution | Single jurisdiction forced on all |

### XIII.5 Fabric architecture diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CIRCLE FEDERATED GOVERNMENT FABRIC                    │
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │  Routing Engine      │  │  Service Registry   │  │  Authority Matrix   │ │
│  │  (citizen request →  │  │  (institutions,     │  │  Enforcer           │ │
│  │   institution path)  │  │   services, levels) │  │  (Part XVII)        │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │  Auth Federation    │  │  Exchange Mediator  │  │  Evidence Transfer  │ │
│  │  (SAML/OIDC trust,  │  │  (min-necessary,     │  │  (handoff protocol) │ │
│  │   per-domain)       │  │   purpose-bound)     │  │                     │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │  Event Bus          │  │  Data Translation    │  │  Provenance Ledger   │ │
│  │  (cross-institution  │  │  (schema mapping,   │  │  (every exchange     │ │
│  │   pub/sub)          │  │   protocol bridge)   │  │   is recorded)       │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│  ┌─────────────────────┐                                                    │
│  │  Federation Audit   │   ← separate from any institutional audit plane    │ │
│  │  Plane               │                                                    │ │
│  └─────────────────────┘                                                    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────────┐
              │                   │                       │
              ▼                   ▼                       ▼
       ACA WORKSPACE      POLICE WORKSPACE        EMS WORKSPACE
       (sovereign)         (sovereign)            (sovereign)
              │                   │                       │
              ▼                   ▼                       ▼
              … (other sovereign institutional workspaces) …
```

### XIII.6 Boundary contract

Part XIII establishes the **fabric-non-centralization contract**. The Fabric performs the eleven responsibilities in §XIII.2 and nothing else. Any feature that would require the Fabric to become a store, a master directory, a master audit log, or a centralized database is out of scope and must be raised as an explicit architectural amendment.

---

## PART XIV — Four/Five Level Government Integration Model

> *"Each institution/system should be able to integrate progressively. Do not require every institution to reach Level 4."* — Amendment Part XIV

### XIV.1 The five-level model

The Federation Fabric supports a progressive integration maturity model. Each institution may onboard at the level appropriate to its readiness and may mature over time. No institution is required to reach any particular level.

| Level | Name | Description | System exchange | Example |
|---|---|---|---|---|
| **0** | **DIRECTORY** | Citizen receives official contact and service information: telephone, website, office, address, channel, hours, service information | None | "The traffic authority's office is at X, opens at Y, phone Z" |
| **1** | **REFERRAL** | Circle collects information from the citizen and securely routes it to the institution; the institution creates and owns the official case | One-way: citizen → Circle → institution | Citizen reports a pothole; Circle routes the report to the municipality; the municipality creates its own service ticket |
| **2** | **TRANSACTION INTEGRATION** | Circle exchanges structured information with the institution's system — status updates, receipts, structured fields | Two-way, transactional | Citizen requests a permit; Circle submits the structured request; the institution's system returns a permit number and status updates |
| **3** | **INSTITUTIONAL INTELLIGENCE** | Circle provides analytics, evidence, workflow, intelligence, graph, timeline, and predictive assistance to the institution | Two-way + intelligence services | An institution subscribes to analytics over its own data through Circle's intelligence layer; Circle provides timeline reconstruction, evidence graph, predictive assistance |
| **4** | **FEDERATED INTELLIGENCE** | Authorized institutions perform controlled federated queries across other institutional systems — without unrestricted data centralization | Multi-party, federated, query-bounded | An authorized institution issues a federated query that touches Police, Traffic, and Local Government records; the query is policy-bounded, audited, and returns only minimum-necessary results |

### XIV.2 Progression characteristics

| Property | Level 0 | Level 1 | Level 2 | Level 3 | Level 4 |
|---|---|---|---|---|---|
| System exchange | None | One-way referral | Two-way transactional | Two-way + intelligence | Multi-party federated |
| Authority matrix required | Light (directory entry) | Yes (referral purpose) | Yes (transaction schema) | Yes (intelligence purpose, AI policy) | Yes (federated query purpose, all participating institutions) |
| Data centralization in Circle | None | Routing metadata only | Transaction receipts | Analytics context (per Part XVI) | None — federated queries return results, not copies |
| AI involvement | None | None | None | Per-institution AI policies | Federated query planning; no autonomous cross-institution AI action |
| Institutional effort | Low (publish contact info) | Medium (intake endpoint) | Medium-high (transactional API) | High (intelligence subscription, AI policy) | Very high (federation trust, query governance) |
| Citizen-facing change | Visible: citizen sees directory info | Visible: citizen sees routing receipt | Visible: citizen sees transaction status | Mostly invisible to citizen | Invisible to citizen |
| Reversible | Easily | Yes | Yes | Yes (intelligence subscription can be terminated) | Yes (federation trust can be revoked) |

### XIV.3 The level-maturity diagram

```
                          INSTITUTIONAL READINESS
                          ───────────────────────
   Level 0 DIRECTORY          ▲
   (publish contact info)      │
                               │   progressive maturity
   Level 1 REFERRAL            │   (no institution is required
   (intake endpoint)           │    to reach any particular level)
                               │
   Level 2 TRANSACTION         │
   (transactional API)         │
                               │
   Level 3 INSTITUTIONAL       │
   INTELLIGENCE                │
   (analytics, evidence,       │
    workflow, graph,           │
    timeline, predictive)      │
                               │
   Level 4 FEDERATED           │
   INTELLIGENCE                │
   (controlled federated       │
    queries across             │
    institutions)              │
                               │
                          ─────┴──────────────────────────
                          TIME / TRUST / AUTHORITY MATRIX MATURITY
```

### XIV.4 The non-coercion rule

> **Do not require every institution to reach Level 4.**

The model is progressive and per-institution. Each institution:

1. **Onboards at the level appropriate to its readiness.** A small municipality may onboard at Level 0 (directory) and remain there indefinitely.
2. **Matures at its own pace.** No institution is forced to mature; maturity is the institution's decision.
3. **May mature selectively.** An institution may operate at Level 2 for one service and Level 0 for another.
4. **May regress.** An institution may downgrade an integration level (e.g., from Level 2 to Level 1) at any time, subject to its own policy.

### XIV.5 Boundary contract

Part XIV establishes the **progression contract**. The Federation Fabric supports all five levels. An institution's current level for each of its services is recorded in the Service Registry (Part XIII §XIII.5). The Authority Matrix (Part XVII) is required for any integration at Level 1 or above.

---

## PART XV — System of Record Principle

> *"For every integration define: WHO OWNS THE ORIGINAL RECORD?"* — Amendment Part XV

### XV.1 The principle

For every integration between Circle and any institution — and between any two institutions through the Fabric — the following question must be answered explicitly, in writing, before the integration is activated:

> **WHO OWNS THE ORIGINAL RECORD?**

The answer must be a single, named authority. "Circle" is never an acceptable answer for an institutional record. "The Fabric" is never an acceptable answer. "Joint" is not an acceptable answer; ownership is singular.

### XV.2 Examples

| # | Record type | Owner of the original record | Circle's relationship |
|---|---|---|---|
| 1 | Tax invoice | Official tax system | Reference only |
| 2 | Customs declaration | Official customs environment | Reference only |
| 3 | Police incident | Police | Reference only (routing receipt) |
| 4 | EMS incident | EMS | Reference only |
| 5 | ACA investigation | ACA | Reference only |
| 6 | Fire incident | Fire / Civil Protection | Reference only |
| 7 | Traffic accident | Traffic | Reference only |
| 8 | Health record | Health system | Reference only; the longitudinal patient record belongs to the health system |
| 9 | Permit | Permitting authority | Reference only |
| 10 | License | Licensing authority | Reference only |
| 11 | Court judgment | Judiciary | Reference only |
| 12 | Government financial transaction | Treasury / Ministry of Finance | Reference only |

### XV.3 What Circle may store

Circle may store or reference only what is **legitimately required** for its bounded role (Part III §III.3). Specifically:

1. **Routing metadata.** That a routing event occurred, when, to which institution, for which citizen request. Not the contents of the institutional case.
2. **Citizen-side report content.** What the citizen submitted to Circle (e.g., a Citizen Shield report). This is citizen-owned data; Circle is the citizen's custodian, not the institution's.
3. **Receipts.** Confirmation that an institution received a routing, with the institution's tracking identifier (where the institution chooses to expose one).
4. **Transaction status.** At Level 2 integration (Part XIV), structured status updates from the institution's system — but only what the institution has explicitly authorized Circle to receive.
5. **Analytics context.** At Level 3 integration, analytical context derived from authorized data — under the per-institution AI policy and the zero-copy principle (Part XVI).

### XV.4 The non-competing-record rule

> **Circle must NEVER silently become a competing authoritative record.**

The following behaviors are explicitly prohibited:

1. **Silent authoritative copy.** Circle must not, without explicit institutional authorization, hold a copy of an institutional record that becomes de-facto authoritative (e.g., a copy of a tax invoice that citizens begin to treat as the official invoice).
2. **Shadow case file.** Circle must not maintain a "case file" for an institutional matter that competes with the institution's own case file. Circle may maintain a *routing file* (routing metadata, receipts, citizen-side content) but not an *institutional case file*.
3. **Silent merge.** Circle must not merge institutional records from multiple institutions into a unified record that becomes authoritative. Unified views are per-purpose, per-authority-matrix, and never become the official record.
4. **Silent replay.** If an institution corrects, amends, or deletes its record, Circle must not silently retain the old version as if it were authoritative. Circle's references must reflect the institution's authoritative state.

### XV.5 Boundary contract

Part XV establishes the **system-of-record contract**. The Authority Matrix (Part XVII) is the formal instrument by which the owner of the original record is declared for each integration.

---

## PART XVI — Zero-Copy / Federated Data Architecture

> *"Prefer: authorized query → source system → minimum necessary result → Circle analytical context. Instead of: source system → entire database copied into Circle."* — Amendment Part XVI

### XVI.1 The preferred pattern

The Fabric prefers the **zero-copy / federated query** pattern for institutional data access:

```
   AUTHORIZED QUERY          →    SOURCE SYSTEM          →    MINIMUM NECESSARY RESULT    →    CIRCLE ANALYTICAL CONTEXT
   ───────────────                ────────────                ────────────────────────         ──────────────────────────
   • purpose-bound                • institutional data        • only fields required by          • derived, transient, or
     per authority matrix            plane                       the purpose                        minimally retained
   • authorized actor                                                                         • never a competing
   • minimum necessary                                                                         authoritative record
     fields declared
```

### XVI.2 The anti-pattern

The Fabric explicitly rejects the **bulk-copy / master-database** pattern:

```
   SOURCE SYSTEM             →    ENTIRE DATABASE COPIED    →    CIRCLE MASTER DATABASE
   ────────────                   ───────────────────           ─────────────────────
   • institutional data          • bulk replication            • competing authoritative record
     plane                         • unbounded retention         • single point of failure
                                                                  • single jurisdiction forced
                                                                  • violates Part XV
```

### XVI.3 The decision matrix: copy vs. query

For each field that the Fabric might hold, the following decision determines whether the field may be copied or must be queried:

| Criterion | Copy allowed? | Notes |
|---|---|---|
| The field is needed for every routing decision the Fabric makes | Yes — but only the minimum-necessary identifier (e.g., institution ID, service ID) | Routing metadata, not institutional record content |
| The field is needed for transactional integration (Level 2) | Yes — receipts and status only | Receipts are Circle-owned; status is a reference to the institutional record |
| The field is part of an institutional record (case, evidence, personnel) | No — query the source system | Zero-copy pattern |
| The field is needed for analytics (Level 3) | Conditional — see §XVI.4 | Controlled copies only where operationally justified |
| The field is needed for federated intelligence (Level 4) | No — federated query the source system | Zero-copy pattern |

### XVI.4 Controlled copies: when they are justified

A controlled copy is permitted only when **all** of the following conditions hold:

1. **Operational justification.** The query latency, source-system availability, or cost of repeated queries makes zero-copy operationally infeasible.
2. **Institutional authorization.** The source institution explicitly authorizes the controlled copy via the Authority Matrix (Part XVII), specifying the fields, retention, purpose, and revocation policy.
3. **Minimum necessary.** Only the fields operationally required are copied; no "while we're at it" expansion.
4. **Bounded retention.** The copy has a defined retention period and a deletion / refresh policy.
5. **Provenance recorded.** The copy's provenance is recorded in the Fabric's provenance ledger; the source system remains the authoritative record.
6. **Source precedence.** If the source system and the copy disagree, the source system is authoritative; the copy is corrected or refreshed.
7. **Audit on both sides.** Both the source institution and the Fabric record the controlled-copy arrangement in their audit planes.
8. **No competing authority.** The copy must never become a competing authoritative record (Part XV §XV.4).

### XVI.5 Boundary contract

Part XVI establishes the **zero-copy contract**. The default pattern is zero-copy / federated query. Controlled copies are exceptions, justified per the eight conditions in §XVI.4, declared in the Authority Matrix (Part XVII), and never become authoritative.

---

## PART XVII — Institutional Authority Matrix

> *"Every connector specifies: institution, source system, data, purpose, legal/administrative basis, authorized actors, read, write, request, retain, export, audit, retention, confidentiality, geographic/jurisdiction scope. No integration active without defined authority matrix."* — Amendment Part XVII

### XVII.1 Definition

The **Institutional Authority Matrix** is the formal, mandatory descriptor for every connector between the Fabric and an institutional system, and for every inter-institutional exchange mediated by the Fabric. It is the contract that makes Parts III, XV, XVI, and XVIII enforceable.

### XVII.2 Required fields

Every authority matrix entry must specify all of the following fields. An entry is not valid — and the corresponding integration must not be active — until all fields are populated.

| # | Field | Description | Example |
|---|---|---|---|
| 1 | **Institution** | The sovereign institution that owns the source system | "Police" |
| 2 | **Source system** | The institutional system that is the authority of record (Part XV) | "Police Incident Management System" |
| 3 | **Data** | The specific data fields, records, or record-types covered by the entry | "incident summary, incident status, incident identifier" |
| 4 | **Purpose** | The bounded purpose for which the exchange is authorized | "Routing of citizen traffic-accident reports to Police; status updates to citizens" |
| 5 | **Legal / administrative basis** | The legal statute, regulation, administrative order, or institutional policy authorizing the exchange | "Police Act §X; Citizens' Reporting Regulation §Y" |
| 6 | **Authorized actors** | The roles, clearances, and assignment classes permitted to use the exchange | "Police dispatch operators; Circle routing service account" |
| 7 | **Read** | Whether read access is granted, and to which fields | "Read: incident status (only)" |
| 8 | **Write** | Whether write access is granted, and to which fields (write from Circle into the institutional system is rare and tightly controlled) | "Write: none" |
| 9 | **Request** | Whether the Fabric may request data from the source system, and under what conditions | "Request: by routing identifier; minimum-necessary fields only" |
| 10 | **Retain** | What the Fabric may retain, for how long, and under what conditions | "Retain: routing receipt (indefinite, audit-class); incident status (30 days, transactional)" |
| 11 | **Export** | Whether the exchanged data may be exported from the Fabric to a third party (default: no) | "Export: no" |
| 12 | **Audit** | What is audited, by whom, where the audit record lives, and how long it is retained | "Audit: every request, every response, every access; retained 7 years; audit record lives in Police audit plane AND Fabric audit plane" |
| 13 | **Retention** | The retention period for each retained category of data | "Routing receipt: indefinite; status: 30 days; analytical context: 90 days" |
| 14 | **Confidentiality** | The confidentiality classification of the exchanged data and the handling rules | "Confidential — Police operational; handling per Police Information Handling Policy §Z" |
| 15 | **Geographic / jurisdiction scope** | The geographic and jurisdictional boundaries within which the exchange is valid | "Egyptian jurisdiction only; data may not transit non-Egyptian cloud regions" |

### XVII.3 Example authority matrix entry (illustrative)

The following is an illustrative authority matrix entry for a Level 1 (Referral) integration between Circle Citizen Shield and a municipal pothole-report service.

| Field | Value |
|---|---|
| Institution | Municipality of X |
| Source system | Municipal Service Ticket System |
| Data | Pothole report (location, description, photo, citizen contact) |
| Purpose | Routing of citizen pothole reports to the municipality; status updates to citizens |
| Legal / administrative basis | Municipal Services Act §X; Citizen Reporting Regulation §Y |
| Authorized actors | Circle routing service account; municipal intake operators |
| Read | Read: ticket status (only) |
| Write | Write: pothole report intake payload (one-way, from Circle to municipality) |
| Request | Request: ticket status by ticket identifier |
| Retain | Retain: routing receipt (indefinite, audit-class); ticket status (30 days, transactional) |
| Export | Export: no |
| Audit | Audit: every routing, every status request; retained 5 years; municipal audit plane AND Fabric audit plane |
| Retention | Routing receipt: indefinite; status: 30 days |
| Confidentiality | Internal — municipal operational |
| Geographic / jurisdiction scope | Municipality of X jurisdiction; Egyptian data residency |

### XVII.4 The no-integration-without-authority-matrix rule

> **No integration is active without a defined authority matrix.**

This is a hard architectural rule, enforced at the Fabric's connector layer. Specifically:

1. **A connector without an authority matrix is dormant.** It exists in code but cannot route, exchange, or query.
2. **An authority matrix entry that is incomplete is not active.** All fifteen fields must be populated.
3. **An authority matrix entry that has expired is not active.** Entries have defined validity periods; expired entries must be re-authorized.
4. **An authority matrix entry that has been revoked is not active.** Revocation may be initiated by either the source institution or the Fabric operator; revocation propagates within the policy-enforcement window.
5. **An exchange that exceeds the authority matrix is blocked.** If a request would access data not declared in the matrix, or persist retention beyond the declared period, or be made by an unauthorized actor, the Fabric blocks the exchange and records a violation in the federation audit plane.

### XVII.5 Boundary contract

Part XVII establishes the **authority-matrix contract**. The matrix is the formal instrument by which Parts III, XV, XVI, and XVIII are made operational. Every connector and every inter-institutional exchange has a corresponding matrix entry; no matrix, no exchange.

---

## PART XVIII — No Cross-Institution Privilege Inheritance

> *"ACA permission does NOT grant Police/EMS/Health/Tax/Customs/Ministry access. Police permission does NOT grant ACA/Tax/Health access. Every institutional boundary is independent."* — Amendment Part XVIII (hard-coded rule)

### XVIII.1 The hard-coded rule

This is a **hard-coded rule** — enforced at the Fabric's authorization layer, not at the policy layer. Policies may grant privileges within an institution; they may never grant privileges across institutions. The rule is symmetric: it applies to every ordered pair of distinct institutions.

### XVIII.2 The independence table

| From ↓ \ To → | ACA | Police | EMS | Fire | Traffic | Health | Tax | Customs | Local Gov | Other |
|---|---|---|---|---|---|---|---|---|---|---|
| **ACA** | (same) | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance |
| **Police** | No inheritance | (same) | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance |
| **EMS** | No inheritance | No inheritance | (same) | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance |
| **Fire** | No inheritance | No inheritance | No inheritance | (same) | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance |
| **Traffic** | No inheritance | No inheritance | No inheritance | No inheritance | (same) | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance |
| **Health** | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | (same) | No inheritance | No inheritance | No inheritance | No inheritance |
| **Tax** | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | (same) | No inheritance | No inheritance | No inheritance |
| **Customs** | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | (same) | No inheritance | No inheritance |
| **Local Gov** | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | (same) | No inheritance |
| **Other** | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | No inheritance | (same) |

### XVIII.3 What "no inheritance" means in practice

For every ordered pair of distinct institutions (A, B):

1. **No privilege carry-over.** A privilege held by an actor in A does not grant any privilege in B.
2. **No clearance carry-over.** A clearance held in A does not grant access in B.
3. **No role carry-over.** A role in A does not map to a role in B. (An "investigator" in ACA is not an "investigator" in Police.)
4. **No assignment carry-over.** A case assignment in A does not grant access to a related case in B.
5. **No device carry-over.** A trusted device enrolled in A is not trusted in B. (A device may be enrolled in multiple institutions, but each enrollment is independent.)
6. **No identity carry-over.** An institutional identity in A is not an identity in B. (A single human may hold identities in multiple institutions, but each identity is independently issued and managed.)
7. **No audit carry-over.** An audit event in A is not an audit event in B. The two institutions' audit planes are independent; correlation is per-purpose, per-authority-matrix.

### XVIII.4 Authorized inter-institutional access (the only exception)

The **only** mechanism by which an actor in institution A may access data in institution B is **Authorized Inter-Agency Exchange** (Part VII §VII.4), governed by an Authority Matrix entry (Part XVII). Such access is:

- **Purpose-bound** — declared in the authority matrix
- **Minimum-necessary** — only the declared fields
- **Time-limited** — declared validity period
- **Audited on both sides** — recorded in both audit planes and the Fabric audit plane
- **Revocable** — by either institution

### XVIII.5 Enforcement

The rule is enforced at three layers:

1. **Identity layer.** Institutional identities are scoped to their identity domain; cross-domain assertions require explicit federation trust, configured per pair and per purpose.
2. **Authorization layer.** The Fabric's authorization engine rejects any request that would carry privileges across an institutional boundary without a corresponding authority-matrix entry.
3. **Audit layer.** Cross-institutional access events are recorded in the Fabric audit plane and surfaced for anomaly detection; any access pattern that suggests attempted privilege inheritance triggers an alert.

### XVIII.6 Boundary contract

Part XVIII establishes the **privilege-isolation contract**. Composite institutional identity (Part XIX) composes within-institution attributes without ever creating a cross-institution privilege class.

---

## PART XIX — Institutional Identity = Institution + Role + Clearance + Assignment

> *"Do NOT treat 'government employee' as a universal permission class. Use: Institution + Department + Role + Clearance + Assignment + Device + Purpose + Policy."* — Amendment Part XIX

### XIX.1 The rejection of a universal permission class

Circle must **not** treat "government employee" — or any analogous universal attribute — as a permission class. A government employee is not, by virtue of being a government employee, entitled to any Circle-side or Fabric-side privilege. Privilege is **composite**, not categorical.

### XIX.2 The composite identity model

An institutional identity is composed of the following attributes. All eight must be present and resolved for any privileged action; an action attempted with any attribute missing or expired is denied.

| # | Attribute | Description | Source of truth |
|---|---|---|---|
| 1 | **Institution** | Which sovereign institution the actor belongs to (Part IV) | Institutional identity domain |
| 2 | **Department** | Which department / unit within the institution | Institutional identity domain |
| 3 | **Role** | The role held (e.g., investigator, analyst, dispatch operator) | Institutional role catalog |
| 4 | **Clearance** | The clearance level held within the institution | Institutional clearance authority |
| 5 | **Assignment** | The specific case, investigation, unit, or function to which the actor is assigned | Institutional assignment authority |
| 6 | **Device** | The trusted device through which the actor is acting (Part VI §VI.3) | Institutional device registry |
| 7 | **Purpose** | The declared purpose for the action (must match an authority-matrix entry, Part XVII) | Authority matrix |
| 8 | **Policy** | The institutional policy under which the action is taken (e.g., AI governance policy, evidence handling policy) | Institutional policy engine |

### XIX.3 Worked example

Consider an ACA analyst requesting access to a sealed evidence file:

| Attribute | Value |
|---|---|
| Institution | ACA |
| Department | Investigation Department, Sector X |
| Role | Senior Analyst |
| Clearance | Secret-ACA |
| Assignment | Case ACA-2025-0123 |
| Device | ACA-enrolled workstation, hardware key #42 |
| Purpose | Evidence review for case ACA-2025-0123 (per Authority Matrix entry AM-ACA-EVID-2025-0123) |
| Policy | ACA Evidence Handling Policy v3.2; AI Governance Policy v2.1 |

If any attribute is missing or expired — for example, the assignment has been revoked, the device has been de-enrolled, or the authority matrix entry has expired — the access is denied, and the denial is recorded in the ACA audit plane and the Fabric audit plane.

### XIX.4 The composition diagram

```
                  INSTITUTIONAL IDENTITY (composite)
                  ──────────────────────────────────
                  ┌─────────────────────────────────┐
                  │                                 │
                  │   Institution (Part IV)         │
                  │        × Department             │
                  │        × Role                   │
                  │        × Clearance              │
                  │        × Assignment              │
                  │        × Device (Part VI)        │
                  │        × Purpose (Part XVII)     │
                  │        × Policy (institutional)  │
                  │                                 │
                  │   = resolved privilege token    │
                  │     (per-action, time-bounded,  │
                  │      audited)                   │
                  │                                 │
                  └─────────────────────────────────┘
                                  │
                                  │  evaluated at action time
                                  ▼
                  ┌─────────────────────────────────┐
                  │  AUTHORIZATION DECISION         │
                  │  • allow / deny / step-up       │
                  │  • audit entry written          │
                  └─────────────────────────────────┘
```

### XIX.5 Why composition, not categorization

Categorical identity ("government employee") fails on every dimension that matters for sovereign institutional architecture:

| Failure mode | Categorical identity | Composite identity |
|---|---|---|
| Over-privilege | A "government employee" attribute over-privileges everyone who holds it | Each attribute is bounded; missing or expired attributes deny |
| Stale privilege | Roles and assignments change; categorical attributes do not | Assignment and clearance have expiry; stale attributes deny |
| Cross-institution leakage | A categorical attribute may be honored across institutions | Institution is the first attribute; cross-institution requests require inter-agency exchange (Part VII §VII.4, Part XVIII) |
| Audit ambiguity | "Government employee did X" is uninformative | All eight attributes are recorded per action |
| Purpose drift | Categorical identity does not encode purpose | Purpose is a required attribute |
| Policy enforcement | Categorical identity cannot encode policy | Policy is a required attribute |

### XIX.6 Boundary contract

Part XIX establishes the **composite-identity contract**. The Circle citizen identity (Circle ID) is not part of this composite; institutional identity is institution-issued and institution-scoped (Part VI). The two identity classes (citizen and institutional) may be correlated inside an institution's own identity domain, under that institution's own policy, but are never merged.

---

## PART XX — Public Citizen Shield

> *"Citizen Shield remains public-facing civic interface. Citizens should NOT be forced to identify the responsible agency themselves."* — Amendment Part XX

### XX.1 The public civic interface

Citizen Shield is the **public-facing civic interface** of the Circle Universal Citizen Layer. It is the surface through which a citizen:

- Reports an issue (incident, hazard, complaint, request)
- Captures evidence (photo, video, audio, structured fields)
- Requests emergency assistance
- Discovers available government services
- Is routed to the appropriate institution
- Tracks the status of their report or request
- Receives notifications and receipts
- Communicates with institutions through shielded channels
- Accesses the civic interface in multiple languages and offline

Citizen Shield is **not** an institutional surface. It does not display institutional case data, institutional intelligence, or institutional dashboards. It is the citizen's side of the front door described in Part XII.

### XX.2 Capabilities

| # | Capability | Description | Institutional counterpart |
|---|---|---|---|
| 1 | **Reporting** | Citizen-side intake of reports — incident, hazard, complaint, request, emergency | Institution creates its own case in its own data plane (Part IV) |
| 2 | **Evidence capture** | Citizen-side evidence capture — photo, video, audio, structured fields, with provenance and integrity metadata | Institution's evidence vault (e.g., ACA Preservation Vault, Police evidence locker) receives evidence via the Fabric's evidence-transfer protocol (Part XIII §XIII.2) |
| 3 | **Emergency assistance** | One-tap emergency assistance that routes to the appropriate emergency institution(s) — Police, EMS, Fire, Traffic | Each institution owns its own dispatch (Parts VII–X) |
| 4 | **Service discovery** | Discovery of available government services at the citizen's location, in the citizen's language | Service Registry (Part XIII §XIII.5) supplies the catalog |
| 5 | **Government routing** | Determination of which institution receives the citizen's report or request, without requiring the citizen to know | Routing Engine (Part XIII §XIII.5) performs the routing |
| 6 | **Tracking** | Tracking of the citizen's report or request — receipt, status updates, expected next steps | Status updates are sourced from the institution under the authority matrix; the institution remains the system of record (Part XV) |
| 7 | **Notifications** | Notifications to the citizen — receipt confirmation, status changes, completion | Notifications reference the institution's tracking identifier; no institutional case data is exposed |
| 8 | **Receipts** | Cryptographic receipts for citizen reports and evidence submissions — proving submission, time, and integrity | Receipts live in the citizen's Circle account; the institution's authoritative record lives in its data plane |
| 9 | **Accessibility** | Accessibility — multiple languages, screen-reader support, low-bandwidth, low-literacy modes | Accessibility is citizen-side; institutional accessibility is each institution's responsibility |
| 10 | **Translation** | Universal translation of citizen input and institutional responses | Translation is citizen-side; institutional translation is a sovereign capability |
| 11 | **Offline** | Offline-first intake — reports captured without connectivity are queued and submitted when connectivity returns | Offline behavior is citizen-side; the institution's system receives the report when the Fabric delivers it |

### XX.3 The citizen-does-not-identify-the-agency principle

> **Citizens should NOT be forced to identify the responsible agency themselves.**

The citizen experience is:

1. **Citizen describes the need.** In their own words, in their own language, with optional evidence.
2. **Circle determines the path.** The Routing Engine (Part XIII) determines which institution(s) receive the routing, based on the citizen's description, location, and the Service Registry.
3. **Citizen receives a receipt.** A cryptographic receipt confirming submission, time, and integrity.
4. **Citizen receives status updates.** Without needing to know which institution is handling the matter.
5. **Citizen may, where appropriate, be informed of the responsible institution.** For example, "Your report has been routed to the traffic authority." This is the *result* of a routing decision, not a navigational choice.

### XX.4 Reporter protection

Citizen Shield protects reporters:

1. **Shielded channels.** Communication between a citizen and an institution may be shielded — the institution sees the report but not necessarily the citizen's identity, depending on the report type and the authority matrix.
2. **Protected identities.** Reporter identities are protected per the report type; ACA oversight reports, in particular, follow the confidentiality rules in Part V and in `CIRKLE-ACA-BLUEPRINT.md` Ch. 6.
3. **No retaliation surface.** Citizen Shield does not expose reporter identity to the subject of a report.
4. **Citizen-side control.** The citizen controls their own report content; Circle is the citizen's custodian, not the institution's (Part XV).

### XX.5 The citizen-shield flow

```
   CITIZEN
     │
     │  "I need help." / "I want to report X." / "I need service Y."
     │  (+ optional evidence: photo, video, audio, structured fields)
     ▼
   ┌──────────────────────────────────────────────────────────┐
   │  CITIZEN SHIELD (public civic interface — Part XX)       │
   │                                                          │
   │  • intake in citizen language                            │
   │  • evidence capture with provenance + integrity metadata │
   │  • accessibility / translation / offline                 │
   │  • cryptographic receipt issued                          │
   └────────────────────────┬─────────────────────────────────┘
                          │
                          │  routing request
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │  ROUTING ENGINE (Fabric — Part XIII)                     │
   │                                                          │
   │  • determines responsible institution(s)                 │
   │  • enforces authority matrix (Part XVII)                 │
   │  • creates routing receipt                               │
   └────────────────────────┬─────────────────────────────────┘
                          │
                          │  routing + evidence handoff
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │  SOVEREIGN INSTITUTIONAL WORKSPACE (Part IV)             │
   │                                                          │
   │  • creates its own case / incident / service ticket      │
   │  • owns the authoritative record (Part XV)               │
   │  • returns tracking identifier and status updates         │
   └────────────────────────┬─────────────────────────────────┘
                          │
                          │  status updates (per authority matrix)
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │  CITIZEN SHIELD (notifications to citizen)               │
   │                                                          │
   │  • receipt confirmation                                  │
   │  • status updates (no institutional case data exposed)   │
   │  • completion notification                               │
   └──────────────────────────────────────────────────────────┘
```

### XX.6 Boundary contract

Part XX establishes the **citizen-shield contract**. Citizen Shield is the public civic interface; it is not an institutional surface, not an institutional dashboard, not an institutional login. Institutional access is governed by Parts IV–VI; institutional data is never surfaced in Citizen Shield beyond what the authority matrix explicitly authorizes (status updates, tracking identifiers, receipt confirmations). Reporter protection follows Part V (for ACA-routed reports) and `CIRKLE-ACA-BLUEPRINT.md` Ch. 6 (for ACA-specific confidentiality).

### XX.7 Closing synthesis

Part XX closes Part I of the federated government amendment by re-stating the architectural whole:

```
   ┌─────────────────────────────────────────────────────────────────┐
   │                                                                 │
   │   WORLD A — CIRCLE UNIVERSAL CITIZEN LAYER                       │
   │   (Wasl · Mashahd · Lamahat · Midan · Groups · Official         │
   │    Channels · Creator Channels · Professional Network ·         │
   │    Workspaces · Local Mesh · Circle Verify · Circle ID ·        │
   │    Mail · Rihla · Maps · Translation · Payments · AI ·          │
   │    Backup · Privacy · CITIZEN SHIELD)                           │
   │                                                                 │
   │   PRESERVED INTACT (Part II)                                    │
   │                                                                 │
   └──────────────────────────────┬──────────────────────────────────┘
                                  │
                                  │  POLICY-CONTROLLED HANDOFF
                                  │  (Citizen Shield — Part XX)
                                  ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                                                                 │
   │   CONNECTOR — CIRCLE FEDERATED GOVERNMENT FABRIC (Part XIII)     │
   │   • routing · interoperability · service discovery             │
   │   • authentication federation · controlled information exchange │
   │   • referral · evidence transfer · event exchange              │
   │   • data translation · provenance · cross-system correlation   │
   │   • NOT a centralized master government database               │
   │                                                                 │
   │   ENFORCES:                                                    │
   │   • Authority Matrix (Part XVII) for every connector           │
   │   • System-of-Record (Part XV) for every record                │
   │   • Zero-Copy / Federated Data (Part XVI)                      │
   │   • No Cross-Institution Privilege Inheritance (Part XVIII)     │
   │   • Composite Institutional Identity (Part XIX)                 │
   │   • Five-Level Integration Maturity (Part XIV)                  │
   │                                                                 │
   └──────────────────────────────┬──────────────────────────────────┘
                                  │
                                  │  SOVEREIGN-INSTITUTION BOUNDARY
                                  ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                                                                 │
   │   WORLD B — SOVEREIGN GOVERNMENT INSTITUTIONAL LAYER            │
   │   (Part IV — Sovereign Institutional Workspace per institution) │
   │                                                                 │
   │   • Circle ACA   (Parts V, VI) — confidential, invisible        │
   │   • Circle Police (Part VII) — sovereign                         │
   │   • Circle EMS   (Part VIII) — sovereign                         │
   │   • Circle Fire / Civil Protection (Part IX) — sovereign         │
   │   • Circle Traffic (Part X) — sovereign                           │
   │   • Other government services (Part XI) — sovereign              │
   │                                                                 │
   │   EACH INSTITUTION:                                              │
   │   • owns its own identity domain, data plane, policy, audit      │
   │   • remains the system of record for its own function           │
   │   • exchanges with others only via authorized inter-agency        │
   │     exchange (Part VII §VII.4) under the authority matrix         │
   │                                                                 │
   └─────────────────────────────────────────────────────────────────┘
```

> **Constitutional reminder (Part I §I.3):** Circle does not become the government, and the government does not become Circle. Two worlds, one controlled federation fabric, many sovereign institutions.

---

## Appendix A — Glossary of Architectural Terms

| Term | Definition | Defined in |
|---|---|---|
| **Circle Universal Citizen Layer** | The citizen-facing Circle platform — World A in the two-worlds model | Part I §I.1 |
| **Sovereign Government Institutional Layer** | The set of all Sovereign Institutional Workspaces — World B in the two-worlds model | Part I §I.1 |
| **Circle Federated Government Fabric** | The controlled connector between World A and World B | Part I §I.1, Part XIII |
| **Sovereign Institutional Workspace** | The architectural unit of government participation; one per institution (with optional compartments) | Part IV §IV.1 |
| **ACA-Issued Institutional Identity** | An institutional identity issued by ACA, scoped to the ACA identity domain | Part VI §VI.1 |
| **Authorized Inter-Agency Exchange** | The only mechanism by which an actor in one institution may access data in another | Part VII §VII.4 |
| **Institutional Authority Matrix** | The mandatory connector descriptor that authorizes each integration or exchange | Part XVII §XVII.1 |
| **System of Record** | The authoritative owner of an original record | Part XV §XV.1 |
| **Zero-Copy / Federated Data** | The preferred pattern: query the source, return minimum necessary, retain nothing centrally | Part XVI §XVI.1 |
| **Composite Institutional Identity** | Identity composed of Institution + Department + Role + Clearance + Assignment + Device + Purpose + Policy | Part XIX §XIX.2 |
| **Citizen Shield** | The public civic interface of the Circle Universal Citizen Layer | Part XX §XX.1 |
| **Five-Level Integration Model** | The progressive integration maturity model: Directory, Referral, Transaction, Institutional Intelligence, Federated Intelligence | Part XIV §XIV.1 |

## Appendix B — Cross-Reference Map to Existing Blueprints

| This amendment (Part I) | Existing blueprint |
|---|---|
| Part I (two-worlds principle) | `CIRKLE-ACA-BLUEPRINT.md` Ch. 2 (non-negotiable architectural distinction) — extended from ACA-only to all institutions |
| Part II (citizen vision intact) | `CIRKLE-BLUEPRINT-v16.md` — preserved unchanged |
| Part III (Circle ≠ government) | `CIRKLE-ACA-BLUEPRINT.md` Ch. 2 §2.4 (public-vs-ACA architecture) — generalized |
| Part IV (sovereign institutional workspace) | `CIRKLE-ACA-BLUEPRINT.md` Ch. 3, Ch. 4 — generalized from ACA to all institutions |
| Part V (ACA confidential & invisible) | `CIRKLE-ACA-BLUEPRINT.md` Ch. 2 (sixteen separations), Ch. 6 (confidentiality boundary) — restated and constrained |
| Part VI (ACA identity model) | `CIRKLE-ACA-BLUEPRINT.md` Ch. 3, Ch. 4 — restated with sovereignty substitution principle |
| Part VII (Police separate from ACA) | New in this amendment — establishes Police sovereignty symmetric to ACA |
| Part VIII (EMS separate) | New in this amendment |
| Part IX (Fire / Civil Protection separate) | New in this amendment |
| Part X (Traffic separate) | New in this amendment |
| Part XI (other government services separate) | New in this amendment |
| Part XII (one front door, many back offices) | New in this amendment — synthesizes Parts I–XI |
| Part XIII (Federated Government Fabric) | `CIRKLE-ACA-BLUEPRINT.md` Ch. 21 (Integration Fabric) — extended from ACA-only to all institutions |
| Part XIV (five-level integration model) | New in this amendment — progressive maturity |
| Part XV (system of record) | New in this amendment — record-ownership contract |
| Part XVI (zero-copy / federated data) | `CIRKLE-ACA-BLUEPRINT.md` Ch. 5 (zero-trust ACA architecture) — extended to data architecture |
| Part XVII (Institutional Authority Matrix) | `CIRKLE-ACA-BLUEPRINT.md` Ch. 22 (integration contracts) — formalized as a mandatory matrix |
| Part XVIII (no cross-institution privilege inheritance) | `CIRKLE-ACA-BLUEPRINT.md` Ch. 2 §2.3 (separations), Ch. 4 (zero-trust) — generalized across institutions |
| Part XIX (composite institutional identity) | `CIRKLE-ACA-BLUEPRINT.md` Ch. 3, Ch. 4 — generalized from ACA to all institutions |
| Part XX (Public Citizen Shield) | `CIRKLE-BLUEPRINT-v16.md` Citizen Shield — extended with routing intelligence |

## Appendix C — Compliance Checklist

For any feature, integration, or change proposed under this amendment, the following checklist must be satisfied before activation. Failure on any item requires architectural review.

| # | Check | Source part | Pass criterion |
|---|---|---|---|
| 1 | Does the change preserve the two-worlds principle? | Part I | Circle and the government remain two distinct worlds |
| 2 | Does the change preserve all citizen-facing capabilities? | Part II | No row in the inventory (Part II §II.1) is removed, deprecated, or gated behind government authentication |
| 3 | Does the change respect "Circle does not become the government"? | Part III | No invariant in Part III §III.4 is violated |
| 4 | Does the change respect per-institution sovereignty? | Part IV | No Circle or Fabric component assumes ownership of an institutional component (Part IV §IV.3) |
| 5 | Does the change preserve ACA invisibility? | Part V | ACA does not appear in any surface listed in Part V §V.2 |
| 6 | Does the change respect ACA-issued institutional identity? | Part VI | ACA identity is ACA-issued; no parallel national identity authority is created |
| 7 | Does the change respect Police sovereignty? | Part VII | No default ACA-Police visibility; no privilege inheritance |
| 8 | Does the change respect EMS sovereignty? | Part VIII | Circle does not become the medical system of record |
| 9 | Does the change respect Fire / Civil Protection sovereignty? | Part IX | Separate institutional domain maintained |
| 10 | Does the change respect Traffic sovereignty? | Part X | Separate institutional model maintained |
| 11 | Does the change respect other institutions' sovereignty? | Part XI | Each remains the authority of record |
| 12 | Does the change preserve the one-front-door / many-back-offices model? | Part XII | Citizen experience remains unified; government experience remains sovereign |
| 13 | Does the change respect the Fabric's bounded responsibilities? | Part XIII | The Fabric performs only the eleven enumerated responsibilities; no centralization |
| 14 | Is the integration at an appropriate level of the maturity model? | Part XIV | Level is chosen by the institution; no coercion to Level 4 |
| 15 | Is the system of record declared? | Part XV | "WHO OWNS THE ORIGINAL RECORD?" is answered with a single, named authority |
| 16 | Is the zero-copy / federated-data pattern followed? | Part XVI | Default is query; controlled copy only if all eight conditions in Part XVI §XVI.4 hold |
| 17 | Is the Authority Matrix defined and complete? | Part XVII | All fifteen fields populated; entry not expired; entry not revoked |
| 18 | Is the no-cross-institution-privilege-inheritance rule respected? | Part XVIII | No privilege, clearance, role, assignment, device, identity, or audit carry-over across institutions |
| 19 | Is the institutional identity composite (all eight attributes)? | Part XIX | Institution + Department + Role + Clearance + Assignment + Device + Purpose + Policy |
| 20 | Does the change preserve Citizen Shield as the public civic interface? | Part XX | Citizens are not forced to identify the responsible agency; reporter protection maintained |

---

> **End of Part I — Federated Sovereign Government Architecture.**
> Subsequent parts (Part II: Emergency Architecture & Service Routing; Part III: Inter-Agency Exchange & Evidence Handoff; Part IV: Institutional Intelligence & Federated AI Governance; Part V: Deployment, Sovereignty, Compliance & Operating Model) build on the foundations established here and do not duplicate them.

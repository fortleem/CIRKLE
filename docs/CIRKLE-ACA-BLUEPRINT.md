# CIRCLE BLUEPRINT — ACA SOVEREIGN EDITION
## Part I: Foundation, Architecture & Confidentiality Boundary

| Field | Value |
|---|---|
| **Document** | CIRCLE BLUEPRINT — ACA SOVEREIGN EDITION, Part I |
| **Edition** | Sovereign Oversight, Investigation, Evidence, Intelligence & Governance Platform |
| **Part** | I of V (Foundation, Architecture & Confidentiality Boundary) |
| **Audience** | ACA Architecture Council, Government Digital-Transformation Architects, Sovereign Platform Engineering Leads |
| **Status** | Living document — authoritative for Part I scope |
| **Owner** | ACA Architecture Council (institutional stewardship) |
| **Related** | `CIRKLE-BLUEPRINT-v16.md` (public Circle), `CIRKLE-BLUEPRINT-COMPLIANCE.md`, `ADR-001-platform-strategy.md` |
| **Source requirements** | `Pasted Content_1787843211586.txt` sections 1–8, 188, 205–207, 210, 220, 221, 236, 237, 238, 239, 240 |
| **Confidentiality** | Institutional — restricted distribution. Contains no real credentials, certificates, or government endpoints. |

---

## Table of Contents (for Part I)

- Chapter 1: Executive Summary
- Chapter 2: Non-Negotiable Architectural Distinction (Section 1)
- Chapter 3: ACA Login Model (Section 2)
- Chapter 4: ACA Access Architecture (Section 3)
- Chapter 5: Zero-Trust ACA Architecture (Section 4)
- Chapter 6: ACA Confidentiality Boundary (Section 5)
- Chapter 7: Public Circle vs ACA Architecture (Section 6)
- Chapter 8: Do Not Break the Existing Circle Product (Section 7)
- Chapter 9: Blueprint Structure (Section 8)
- Chapter 10: ACA Navigation & Screen Inventory (Sections 188, 220, 221)
- Chapter 11: ACA UX & Form Factors (Sections 205, 206, 207)
- Chapter 12: Business & Commercial Model (Section 210)
- Chapter 13: Final Architecture Summary (Section 239)
- Chapter 14: Executive Positioning (Section 238)
- Chapter 15: Blueprint Language & Quality Rules (Sections 236, 237, 240)

### Cross-Part Map (for orientation)

| Part | Scope | Primary Sections |
|---|---|---|
| **Part I (this document)** | Foundation, Architecture & Confidentiality Boundary | 1–8, 188, 205–207, 210, 220, 221, 236–240 |
| **Part II** | Oversight Fabric, Evidence & Investigation Intelligence | 9–20 (Oversight Fabric, Ontology, Evidence Graph, Timeline, Temporal, Twin, Replay, Gaps) |
| **Part III** | Government Integration, Intelligence & AI Governance | 21–31 (Integration Fabric, Risk/Corruption, Procurement, Inter-agency, AI Governance, Early Warning, International) |
| **Part IV** | Governance, Reform, Deployment & Compliance | 24, 27–32 (Findings/Reform, Security, DR, Data Governance, Compliance Mapping, Deployment) |
| **Part V** | Implementation, Use Cases, KPIs & Testing | 33–36 (Roadmap, End-to-End Use Cases, KPIs, Testing/Validation/Acceptance Criteria) |

> Cross-references between parts use the form: *"See Part II: Oversight Fabric & Investigation Intelligence → Smart Evidence Graph."*

---

## Chapter 1: Executive Summary

### 1.1 What the ACA Sovereign Edition is

The **ACA Sovereign Edition** is a confidential, institutional extension of the Circle platform built specifically for the **Administrative Control Authority (ACA)** of the Arab Republic of Egypt. It is *not* a feature of the public Circle product, *not* a tab inside the citizen app, and *not* a privilege obtainable through ordinary Circle registration. It is a sovereign-grade oversight, investigation, evidence, intelligence and governance environment that runs above and behind the public Circle surface, accessible only to ACA-issued institutional identities under explicit policy control.

The Sovereign Edition preserves and reuses the technical foundations of Circle — its AI-native architecture, knowledge-graph capability, evidence handling, audit primitives, identity federation building blocks, and modular extension framework — but deploys them inside a fully separate, compartmentalized, audit-controlled environment with its own identity, data plane, policy engine, and trust boundary.

### 1.2 The core value proposition (from Section 238)

The ACA Sovereign Edition is positioned as:

> **A SOVEREIGN ADMINISTRATIVE OVERSIGHT, INVESTIGATION, EVIDENCE, INTELLIGENCE AND GOVERNANCE PLATFORM.**

Its core value proposition, taken verbatim from the source requirements (Section 238), is:

> *"Circle connects authorized complaints, official field evidence, investigations, government services, administrative processes, documents, transactions, inspections, decisions, people, entities, rules and systems into one continuously auditable environment that helps ACA reconstruct events, discover relationships, identify missing information, compare expected and actual processes, investigate efficiently, detect systemic weaknesses, coordinate across institutions, verify reforms and identify emerging risks before they become major problems."*

This paragraph is the canonical positioning statement of the entire blueprint. Every architectural choice in Parts I–V must support it; any element that does not support it must be challenged.

### 1.3 Positioning

The Sovereign Edition is **not**:

- A complaint-management product
- A CRM
- A generic workflow tool
- A surveillance platform
- An AI chatbot
- A conventional case-management system
- A replacement for the public Circle product

It is a **continuously auditable institutional environment** for administrative oversight, investigation, evidence preservation, intelligence analysis and reform verification, operating on a sovereign data plane with policy-controlled access, provenance tracking, and an explicit human-authority boundary over AI outputs.

### 1.4 Relationship to public Circle

The relationship between public Circle and the ACA Sovereign Edition is **strictly directional and policy-gated**:

```
PUBLIC CIRCLE (citizen-facing, free, sovereign-citizen trust surface)
        │
        │  SECURE / POLICY-CONTROLLED HANDOFF
        │  (defined intake/legal/policy pathways only)
        ▼
ACA SOVEREIGN ENVIRONMENT (institutional, confidential, ACA-issued identity)
```

Citizen-generated signals, reports, and evidence **may** enter the ACA environment *only* via explicitly defined intake pathways — never automatically, never by proximity, and never by virtue of simply existing in Circle. The reverse direction is **prohibited by default**: ACA case data, intelligence, hypotheses, findings, sealed evidence, protected reporter identities, and internal dashboards must never become visible to citizens or to regular Circle users.

Citizen Shield — the existing citizen-facing capability inside public Circle — remains the public surface for citizen reporting, citizen evidence recording, and public services. ACA sits above and behind it as the **confidential institutional layer**. They are linked by policy-controlled handoffs, not by shared UI, shared sessions, shared identities, or shared data visibility.

### 1.5 What Part I defines

Part I establishes the **non-negotiable foundations** on which Parts II–V build:

1. The architectural distinction between public Circle and ACA (Chapter 2)
2. The ACA institutional identity and login model (Chapter 3)
3. The ACA identity federation and access architecture (Chapter 4)
4. The zero-trust posture of every ACA request (Chapter 5)
5. The explicit confidentiality boundary that controls cross-plane data motion (Chapter 6)
6. The public-vs-ACA architecture diagram (Chapter 7)
7. The principle that the existing public Circle product must not be broken or downgraded (Chapter 8)
8. The structural placement of ACA inside the wider blueprint (Chapter 9)
9. The complete ACA navigation system and screen inventory (Chapter 10)
10. The ACA UX and form factors (Chapter 11)
11. The commercial model that keeps public Circle free while ACA receives paid sovereign institutional services (Chapter 12)
12. The final architecture summary (Chapter 13)
13. The executive positioning statement (Chapter 14)
14. The blueprint language and quality rules (Chapter 15)

Parts II–V are scoped to layers 9–36 of the ACA logical structure (see Chapter 9). Part I does not duplicate their content; it references them.

---

## Chapter 2: Non-Negotiable Architectural Distinction (Section 1)

> *"ACA MUST NOT be visible to ordinary citizens or regular Circle users."* — Section 1

This is the single most important architectural constraint of the entire blueprint. Every other chapter inherits this constraint. Violating it — even partially, even in a "preview" or "demo" mode — invalidates the sovereign posture of the platform.

### 2.1 The core constraint

The ACA environment must **not** be reachable, discoverable, or visible through any public Circle surface. Specifically, there must be:

- **No ACA tab** inside the public Circle app
- **No ACA button** anywhere in the citizen or regular-user UI
- **No ACA menu item** in any navigation surface of public Circle
- **No ACA public portal** discoverable by citizens
- **No ACA public dashboard** reachable without institutional authentication
- **No ACA public navigation item**, even hidden behind a "More" panel or settings page
- **No ACA public profile type** that an ordinary user could select, request, or impersonate
- **No ordinary-user shortcut** (URL, deep link, QR code, share payload) that exposes the ACA environment
- **No ACA capability placed inside the normal Citizen Shield UI** — Citizen Shield remains the citizen-facing capability; ACA is the institutional layer above/behind it

### 2.2 The fully separate, confidential, institutional application experience

The ACA environment is a **fully separate, confidential, institutional application experience**. It is presented, hosted, authenticated, navigated, audited and operated as a distinct institutional product. The distinction is not cosmetic — it is structural.

The platform must provide **sixteen** distinct separations between public Circle and ACA. These are listed in the table below. Each separation is itself a hard requirement: failing any one of them weakens the boundary and may expose ACA capability to non-institutional actors.

### 2.3 The sixteen "separate" requirements

| # | Separation | Public Circle | ACA Sovereign Environment |
|---|---|---|---|
| 1 | **Login** | Public login (phone/email/social/OIDC consumer) | ACA institutional login (agent ID + MFA + device trust + certificate where applicable) |
| 2 | **Authentication flow** | Consumer OIDC / passwordless / OTP | ACA Identity Federation with hardware/security-key auth, institutional certificates, device binding |
| 3 | **Dashboard** | Citizen dashboard (Home, Wasl, Mashahd, Lamahat, Midan, etc.) | ACA Command Center (cases, investigations, intelligence, integrations) |
| 4 | **Navigation** | Public navigation tabs and overlays | ACA navigation tree (Command Center, Intake, Cases, Investigations, … Administration — see Chapter 10) |
| 5 | **Screens** | Public screens (Home, Circles, Workspaces, Mail, etc.) | ACA institutional screens (47-screen inventory — see Chapter 10) |
| 6 | **Permissions** | Citizen-scoped permissions tied to Circle ID | RBAC + ABAC + clearance + assignment + case-based + device-trust + time-limited |
| 7 | **Sessions** | Long-lived consumer sessions with refresh tokens | Short privileged sessions, re-authentication for critical actions, device binding, concurrent-session awareness |
| 8 | **Data access** | Citizen-owned data, public content, Citizen Shield reports | ACA case data, evidence, intelligence, sealed records, protected identities — all compartmentalized |
| 9 | **Workspace** | Public Workspaces (Educational, Professional Network) | ACA Investigator/Analyst/Inspector institutional workspace |
| 10 | **Audit controls** | Public-side audit (community governance, Circle Verify) | Institutional audit (every login, case access, evidence view, export, classification change, AI analysis — see Section 195) |
| 11 | **Evidence environment** | Citizen-side evidence recording (Citizen Shield) | ACA Preservation Vault, sealed evidence, provenance ledger, evidence access audit, disposition controls |
| 12 | **Security policies** | Public security posture (E2EE where applicable, public privacy) | Zero-trust ACA architecture, HSM key management, dual authorization, legal hold |
| 13 | **Administrative controls** | Community governance, Circle ID administration | ACA institutional administration (provisioning, revocation, clearance, policy engine) |
| 14 | **Deployment / data plane** | Public Circle deployment (edge-replicated Turso, public CDN, public cloud as appropriate) | ACA-controlled sovereign data plane (government datacenter / private cloud / sovereign K8s — see Section 211) |
| 15 | **Branding / presentation** | Circle public brand and consumer aesthetic | ACA-determined institutional branding, classification banners, clearance-aware UI |
| 16 | **URLs / subdomains / entry point** | Public Circle URLs and subdomains | Separate ACA URLs / subdomains / application entry points, isolated from public Circle routing |

> **Acceptance criterion:** An ordinary citizen who registers for Circle, logs in, navigates every tab, opens every overlay, visits every public URL, and inspects every menu item must not encounter a single ACA surface. An ACA agent, by contrast, must not be able to reach ACA through any public Circle navigation — they must enter through the ACA entry point under ACA-controlled provisioning.

### 2.4 Citizen Shield vs ACA — placement of the boundary

Citizen Shield is the existing citizen-facing capability inside public Circle. It includes citizen reporting, citizen evidence recording, public service monitoring, and related public trust features. Citizen Shield is the **outward-facing** layer of trust between the state and the citizen.

ACA is the **inward-facing** institutional layer above and behind Citizen Shield. ACA consumes *authorized* signals from Citizen Shield through defined intake pathways; it does not own Citizen Shield and does not expose itself through Citizen Shield.

```
┌─────────────────────────────────────┐
│        CITIZEN (public user)        │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│       CITIZEN SHIELD (public)       │
│  citizen reporting, public services │
│  citizen evidence recording         │
└─────────────────────────────────────┘
                 │
                 │  POLICY-CONTROLLED
                 │  INTAKE HANDOFF
                 │  (defined legal/policy pathways)
                 ▼
┌─────────────────────────────────────┐
│   ACA SOVEREIGN ENVIRONMENT         │
│  (institutional, confidential,      │
│   ACA-issued identity only)         │
└─────────────────────────────────────┘
```

Citizen Shield is **not** downgraded by the existence of ACA. ACA does not absorb Citizen Shield's public-facing responsibilities. They are two distinct products with one directional, audited handoff between them.

### 2.5 What does *not* count as "separate"

The following do **not** satisfy the separation requirement, even if superficially attractive:

- A "hidden" admin tab visible only to admins of public Circle accounts (still exposes ACA inside the public app)
- A profile-type flag on ordinary Circle accounts (introduces a privilege-escalation path)
- A special URL under the same public subdomain (reveals ACA existence through DNS/routing discovery)
- A "request ACA access" link inside the public app (advertises ACA existence to citizens)
- Sharing the same session, workspace, or audit pipeline (collapses the separation at the data plane)
- Embedding ACA dashboards inside Citizen Shield with role-gating (places institutional data inside citizen UI)

Each of these is a separation failure and must be rejected at design review.

### 2.6 Acceptance criteria for Chapter 2

1. No ACA surface is reachable from any public Circle navigation path.
2. The 16 separations in §2.3 are each individually verified by an acceptance test that asserts non-visibility.
3. Citizen Shield remains fully functional for citizens; no public capability is removed, gated, or moved behind ACA.
4. The ACA entry point is reachable only via ACA-controlled provisioning (see Chapter 3) and uses a separate URL/subdomain/route namespace.
5. A security error-check (see Section 215) confirms no privilege-escalation path, no accidental citizen visibility, no insecure default.

> Cross-reference: implementation of each separation is verified in Part IV → Security & Zero-Trust layer; commercial implications are addressed in Chapter 12.

---

## Chapter 3: ACA Login Model (Section 2)

> *"ACA accounts MUST NOT be ordinary Circle consumer accounts."* — Section 2

### 3.1 The principle

The public Circle product admits users through ordinary consumer registration — phone number, email, social identity, OIDC consumer flow. That admission surface is *categorically different* from ACA admission. **No consumer-style registration — not even one performed by an ACA employee using their personal Circle identity — may produce ACA access.**

ACA agents are admitted only through **ACA-controlled provisioning**. The platform's role is to receive, enforce, and audit the institutional identity that ACA issues — never to mint ACA identity from consumer identity.

### 3.2 ACA-issued institutional identity

The platform must support an **ACA-issued institutional identity** record. Each ACA agent identity is composed of the following components, each of which is independently auditable:

| # | Component | Description |
|---|---|---|
| 1 | **ACA-issued agent ID** | A canonical identifier minted by ACA. Not derived from any Circle consumer ID. Not enumerable by citizens. |
| 2 | **Institutional identity** | Formal institutional affiliation (e.g., department, directorate, unit) — distinct from any personal identity the agent may also hold in Circle. |
| 3 | **Role** | Institutional role (e.g., Investigator, Inspector, Analyst, Supervisor, Senior Leadership, Administrator, Auditor). |
| 4 | **Department** | Department / directorate to which the agent is assigned. |
| 5 | **Unit** | Specific unit or team within the department. |
| 6 | **Clearance** | Clearance level (e.g., Public, Internal, Restricted, Highly Restricted, Sealed). Governs which classification tiers the agent may access. |
| 7 | **Assignment permissions** | Assignment-specific permissions — the case(s), service(s), system(s), geography, or temporal scope the agent is currently authorized for. |
| 8 | **Device trust** | The trusted field/institutional device(s) bound to the agent under Section 191. A non-trusted device cannot complete ACA login. |
| 9 | **Authentication credentials** | Institutional credentials — distinct from any consumer credential. Stored in ACA-controlled secret management, never in source code, mobile app, public configuration, or blueprint examples. |
| 10 | **MFA** | Multi-factor authentication on every ACA login (TOTP / push / biometric per ACA policy). |
| 11 | **Hardware / security-key authentication** | Hardware security key (e.g., FIDO2) where available, mandatory for highly restricted clearance. |
| 12 | **Institutional certificates** | X.509 / PKI certificates issued by ACA or by an authorized Egyptian government PKI — **Requires government authorization / technical discovery** for the specific PKI in use. |
| 13 | **Account activation / revocation** | Lifecycle states: Pending, Active, Suspended, Revoked, Expired. Revocation is immediate and propagates to all sessions. |
| 14 | **Temporary privileges** | Time-limited grants (e.g., surge support during a major investigation) with automatic expiry. |

### 3.3 The categorical separation of consumer registration from ACA access

The blueprint enforces the following invariant:

> **Regular Circle account creation MUST NOT automatically create ACA access. A citizen registering for Circle MUST NEVER gain ACA privileges. ACA agents are admitted only through ACA-controlled provisioning.**

This invariant is enforced at multiple layers:

1. **Schema separation** — ACA identity records live in the ACA data plane (Section 212), never in the public Circle user store. There is no foreign-key relationship that could leak ACA identity from a consumer account.
2. **Federation separation** — The ACA Identity Federation (Chapter 4) does not consume consumer OIDC tokens. It consumes ACA-issued institutional tokens.
3. **Routing separation** — ACA endpoints live under a separate URL/subdomain/route namespace. There is no ACA route reachable from the public Circle web app.
4. **Provisioning separation** — ACA identities are minted by an ACA institutional administrator through an institutional console. The public Circle app has no UI, button, or link that initiates ACA provisioning.
5. **Audit separation** — ACA provisioning events are recorded in the ACA institutional audit log, not in the public Circle audit log.

### 3.4 ACA-controlled provisioning

Provisioning is performed by an authorized ACA institutional administrator (or an automated, audited institutional workflow that the administrator has authorized). The provisioning flow:

1. **Authorization** — The administrator is authorized to provision identities for the target department/unit/clearance tier. Authorization itself requires dual authorization for high-clearance provisioning.
2. **Agent ID minting** — A canonical agent ID is issued. The ID format and minting authority are ACA-defined. Placeholder: `aca:agent:{ACA_MINTING_AUTHORITY}:{opaque-identifier}`.
3. **Identity record creation** — The institutional identity record is created in the ACA data plane with all 14 components from §3.2.
4. **Credential issuance** — Initial credentials and MFA factors are issued through a secure, out-of-band channel (e.g., in-person enrollment, sealed envelope). No credentials are sent through public Circle channels.
5. **Device binding** — Trusted device(s) are enrolled and bound to the agent identity under Section 191.
6. **Certificate issuance** — Institutional certificates are issued where applicable. **Requires government authorization / technical discovery** for the specific Egyptian PKI integration.
7. **Activation** — The account enters Pending state, then Active upon first successful ACA login with MFA and device verification.
8. **Audit** — Every step is recorded in the institutional audit log: who provisioned, when, with what authorization, for what scope.

### 3.5 Activation, revocation, and temporary privileges

| State | Meaning | Transitions |
|---|---|---|
| Pending | Provisioned but not yet activated by the agent. | → Active (first successful login) or → Revoked (never activated) |
| Active | Fully usable. | → Suspended, → Revoked, → Expired |
| Suspended | Temporarily inactive (e.g., pending review, security hold). | → Active (cleared), → Revoked |
| Revoked | Permanently disabled. Cannot be reactivated — a new identity must be provisioned. | Terminal state. |
| Expired | Time-limited grant reached its expiry. | → Revoked or → Renewed (re-provisioned). |

Temporary privileges (component 14) are an overlay on top of the base state. They grant additional case-based or time-windowed access without changing the base clearance. They expire automatically. Example: *"Case 118 → access → expires automatically"* (Section 193). When a temporary privilege expires, all sessions relying on it must be terminated or downscoped.

### 3.6 Acceptance criteria for Chapter 3

1. No consumer Circle registration flow can produce an ACA identity record.
2. All 14 identity components are present and auditable for every ACA agent.
3. ACA login requires MFA on every session; high-clearance login additionally requires hardware key.
4. Device binding is enforced: a non-trusted device cannot complete ACA login.
5. Revocation is immediate and propagates to all active sessions within policy-defined SLA.
6. Temporary privileges expire automatically; expired privileges do not remain usable.
7. No real credentials appear in source code, mobile app, public configuration, or blueprint examples (see Section 214).

> Cross-reference: identity federation and policy engine mechanics are defined in Chapter 4; session security in Section 223 (Part IV); login failure / lockout in Section 222 (Part IV).

---

## Chapter 4: ACA Access Architecture (Section 3)

> *"ACA Identity → Circle ACA Identity Broker → Policy Engine → Assigned permissions → ACA Workspace."* — Section 3

### 4.1 ACA Identity Federation

The ACA access architecture is structured as a five-stage federation. Each stage has a single canonical responsibility and is independently auditable.

```
┌──────────────────────┐
│   ACA IDENTITY       │  ACA-issued institutional identity (Chapter 3)
│   (agent ID, MFA,    │  minted by ACA-controlled provisioning
│    device, cert)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ CIRCLE ACA IDENTITY │  Validates institutional credentials, MFA,
│   BROKER             │  device trust, certificate. Issues a
│                      │  short-lived ACA session token.
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   POLICY ENGINE      │  Evaluates RBAC + ABAC + clearance + case +
│                      │  purpose + device + time + risk against
│                      │  the requested resource.
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ ASSIGNED PERMISSIONS │  The exact, minimal set of permissions
│                      │  granted for this request.
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   ACA WORKSPACE      │  The agent's institutional workspace —
│                      │  cases, evidence, tools, dashboards —
│                      │  scoped to the assigned permissions.
└──────────────────────┘
```

### 4.2 Stages in detail

#### 4.2.1 ACA Identity

Already specified in Chapter 3. The ACA identity is the canonical institutional record. It is the **only** acceptable input to the broker. Consumer Circle identities are not valid ACA identities and are rejected at this stage.

#### 4.2.2 Circle ACA Identity Broker

The broker is the institutional authentication gateway. Its responsibilities:

- Verify institutional credentials (password / hardware key / certificate — never consumer OIDC).
- Verify MFA (TOTP / push / biometric per ACA policy).
- Verify device trust (device is enrolled and bound under Section 191).
- Verify account state (Active only — Pending/Suspended/Revoked/Expired are rejected).
- Verify temporal grants (temporary privileges are still within their validity window).
- Issue a **short-lived ACA session token** scoped to the agent's current assignments and clearance.

The broker does not authorize data access — it authenticates the institutional identity. Authorization is the policy engine's responsibility.

#### 4.2.3 Policy Engine

The policy engine evaluates every sensitive request against eight access dimensions (Section 3):

| # | Dimension | Description |
|---|---|---|
| 1 | **RBAC (Role-Based Access Control)** | The agent's institutional role defines the baseline set of capabilities they may exercise. |
| 2 | **ABAC (Attribute-Based Access Control)** | Attributes of the resource, the request, the environment, and the agent (e.g., classification, jurisdiction, sensitivity, time of day) further constrain access. |
| 3 | **Least privilege** | The agent receives only the minimum permissions required to perform the current task — never the union of all permissions they could ever hold. |
| 4 | **Purpose-bound access** | Access is granted for a stated purpose (e.g., "investigate case 118"). Access for unrelated purposes, even by an authorized agent, is denied. |
| 5 | **Case-based access** | Investigators normally see only cases authorized by assignment, department, role, clearance, and policy (Section 192). Access to a case the agent is not assigned to is denied unless a temporary privilege is in force. |
| 6 | **Clearance-based access** | Access is bounded by the agent's clearance tier (Public, Internal, Restricted, Highly Restricted, Sealed). |
| 7 | **Device trust** | Access is bounded by the trust level of the device making the request. A non-trusted or compromised device cannot access sensitive resources even if the agent is fully authorized. |
| 8 | **Time-limited privileges** | Access is bounded by temporal grants. Expired privileges are revoked automatically (Section 193). |

The policy engine's output is the **assigned permissions** for this request — not a session-wide blanket grant.

#### 4.2.4 Assigned permissions

The assigned permissions are the minimal, request-scoped, time-bounded set of capabilities the agent may exercise for this specific request. They include:

- The set of resources the agent may access (cases, evidence items, dashboards, integrations)
- The set of operations the agent may perform (view, annotate, export, seal, refer)
- The temporal validity of the grant (short — typically minutes for sensitive operations)
- The purpose tag for the access (for audit)
- Any dual-authorization requirements (Section 194)

#### 4.2.5 ACA Workspace

The agent's institutional workspace is the surface they actually interact with — cases, evidence, intelligence, integrations, dashboards. The workspace is **dynamically scoped** to the assigned permissions: modules, screens, and controls the agent is not authorized for are not visible (Chapter 10, §10.4 navigation security).

### 4.3 Egyptian government authentication / PKI / digital signature

The platform supports appropriate Egyptian government authentication, PKI, and digital-signature mechanisms **where authorized**. Concretely:

- **PKI integration** — the broker accepts institutional certificates issued by ACA or by an authorized Egyptian government PKI. The specific PKI, certificate profile, and validation path are **Requires government authorization / technical discovery**.
- **Digital signatures** — institutional actions that require legal signature (e.g., sealing evidence, signing findings, issuing referrals) are signed using ACA-issued credentials. The signature algorithm, key length, and storage are ACA-defined and use HSM where appropriate (Section 213).
- **Government identity federation** — where ACA federates with other Egyptian government identity systems, the federation uses ACA-controlled trust agreements. Specific federated endpoints are placeholders: `{EGYPT_GOV_IDENTITY_ENDPOINT}` — **Requires government authorization / technical discovery**.

The blueprint does **not** assume any specific Egyptian government system is reachable, certified, or integrated until that integration has been formally verified. See Chapter 15 for the "do not invent facts" rule.

### 4.4 Failure handling

| Failure mode | Behavior |
|---|---|
| Broker cannot verify credentials | Login rejected. Event logged in institutional audit. Rate-limiting applies (Section 222). |
| Broker cannot verify device | Login rejected. Event logged. Agent cannot bypass device verification. |
| Account state not Active | Login rejected. Event logged. |
| Policy engine denies request | Request denied. Denial reason (which dimension failed) is logged for audit but **not** necessarily surfaced to the agent (to avoid leaking policy internals). |
| Policy engine cannot reach assignment data | Fail-closed: request denied. Fail-open is forbidden. |
| Dual authorization required but not satisfied | Request denied. Pending authorization remains visible to the second authorized party. |

### 4.5 Acceptance criteria for Chapter 4

1. Every ACA access traverses the five stages in order; no stage is bypassable.
2. The policy engine evaluates all eight access dimensions on every sensitive request.
3. Fail-closed behavior is verified for each failure mode in §4.4.
4. No request is authorized based on network location alone (zero-trust — Chapter 5).
5. All policy decisions are auditable with the full context (identity, role, assignment, case, clearance, purpose, device, time, risk).

> Cross-reference: the policy engine's runtime enforcement is the **ACA Data Access Broker** of Chapter 5. Identity lifecycle is in Chapter 3; audit requirements in Section 195 (Part IV).

---

## Chapter 5: Zero-Trust ACA Architecture (Section 4)

> *"ACA must use Zero Trust. Never assume trust because [of network location, role, prior auth, or admin status]."* — Section 4

### 5.1 The zero-trust posture

Zero Trust means: **no request is trusted because of where it came from, who previously authenticated it, or what role the requester holds.** Every sensitive request is re-evaluated, every time, against the full request context. There are no "trusted networks" inside the ACA environment — not the ACA-internal network, not a government intranet, not an administrator's workstation.

### 5.2 What zero-trust is not

Zero Trust is **not**:

- "We require MFA at login, therefore we trust the session."
- "The request comes from inside the ACA datacenter, therefore it is safe."
- "The user is an administrator, therefore they may access anything."
- "The user authenticated successfully five minutes ago, therefore they are still trusted."
- "The device was trusted at enrollment, therefore it is still trusted."

Each of these is a zero-trust failure. The platform must actively reject them.

### 5.3 What every sensitive request considers

Every sensitive request — every data fetch, every evidence view, every export, every policy change, every administrative action — must consider the following request context (Section 4):

| # | Dimension | Example question the platform answers |
|---|---|---|
| 1 | **Identity** | Which ACA agent identity is making this request? Is the identity Active and not Suspended/Revoked/Expired? |
| 2 | **Device** | Is the requesting device currently trusted? Is it the device bound to this agent? Has the device posture changed since last verification (e.g., compromised, jailbroken, missing patches)? |
| 3 | **Role** | What is the agent's institutional role? Does this role include the requested capability? |
| 4 | **Assignment** | Is the agent currently assigned to a case, service, system, or geography that includes the requested resource? |
| 5 | **Case** | If the request is case-scoped, is the agent authorized for this specific case (Section 192)? |
| 6 | **Clearance** | Does the agent's clearance tier meet the classification of the requested resource? |
| 7 | **Purpose** | Has a valid purpose been declared for this access (e.g., "investigate case 118")? Is the purpose consistent with the request? |
| 8 | **Requested data** | What is the sensitivity/classification of the data being requested? Does it require dual authorization (Section 194)? |
| 9 | **Current risk** | Are there active risk indicators (e.g., anomalous request pattern, prior failed authentications, device posture alerts) that should cause denial? |
| 10 | **Time** | Is the current time within the agent's authorized access window? Are temporary privileges still valid? Is the requested action permitted at this hour (e.g., off-hours access restrictions)? |
| 11 | **Policy** | What does the applicable institutional policy say about this type of request, for this resource, by this role, in this context? |

All eleven dimensions are evaluated by the policy engine (Chapter 4). A failure on any one dimension denies the request.

### 5.4 The ACA Data Access Broker

The runtime enforcement of zero-trust is the **ACA Data Access Broker**. The broker is the single chokepoint through which all sensitive data access must pass — whether the requester is a human agent or an AI service.

```
┌──────────────────────────┐
│   AGENT (human or AI)    │
└────────────┬─────────────┘
             │
             │  sensitive request
             ▼
┌──────────────────────────────────────────┐
│       ACA DATA ACCESS BROKER             │
│                                          │
│  1. Authenticates request provenance      │
│  2. Re-evaluates all 11 zero-trust       │
│     dimensions                           │
│  3. Applies policy engine decision        │
│  4. Applies dual-authorization rules     │
│  5. Applies audit and provenance ledger   │
│  6. Returns scoped, classified data       │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────┐
│   ACA DATA / EVIDENCE    │
│   (institutional store)  │
└──────────────────────────┘
```

The broker:

1. **Authenticates request provenance** — confirms the request originates from a currently-authenticated, currently-trusted agent (human or AI).
2. **Re-evaluates all eleven zero-trust dimensions** on every sensitive request — there is no "session-wide grant."
3. **Applies the policy engine decision** — what subset of the requested data may be returned, with what operations permitted.
4. **Applies dual-authorization rules** — for protected reporter unmasking, sensitive evidence export, evidence disposition, major retention changes, and sensitive case closure (Section 194), the broker requires dual authorization and refuses to complete the action until the second authorized party concurs.
5. **Applies audit and provenance ledger** — records who accessed what, when, from which device, for which case, and what was done (Section 195, 196, 197).
6. **Returns scoped, classified data** — the broker returns only the subset of data the agent is authorized to see, with classification banners and provenance intact. Derivative copies are tracked (Section 196).

### 5.5 Human vs AI access through the broker

Both human agents and AI services access institutional data through the broker. The broker does not distinguish between them at the trust level — an AI request is re-evaluated the same way a human request is. The AI's "identity" is the institutional service identity that authorized the AI's execution context, scoped to a specific case and purpose. The AI cannot elevate beyond the institutional service identity's clearance.

This is the architectural enforcement of the **AI human-authority boundary** (Section 204 — see Part IV → AI Governance): AI can detect, connect, correlate, classify, summarize, prioritize, simulate, recommend, and warn. AI cannot independently declare guilt, impose discipline, issue authoritative findings, unmask protected identities, destroy evidence, or close sensitive investigations. The broker refuses any AI request that would cross this boundary.

### 5.6 Failure handling

| Failure mode | Behavior |
|---|---|
| Any zero-trust dimension fails | Request denied. Denial is audited. |
| Broker cannot reach policy engine | Fail-closed: request denied. |
| Broker cannot reach assignment data | Fail-closed: request denied. |
| Dual-authorization required but only one party has authorized | Request held in pending state until the second party concurs or the request expires. |
| Device posture degrades mid-session | Subsequent requests denied; session may be downscoped or terminated. |
| AI request crosses human-authority boundary | Request denied. Event logged. AI service may be flagged for governance review. |

### 5.7 Acceptance criteria for Chapter 5

1. No sensitive data access bypasses the broker.
2. Every sensitive request is re-evaluated on all eleven dimensions.
3. Fail-closed behavior is verified for every failure mode.
4. Dual-authorization actions cannot complete with a single party's approval.
5. AI requests and human requests are subject to the same broker evaluation; the AI human-authority boundary is enforced at the broker.
6. Every broker decision is auditable with the full eleven-dimension context.

> Cross-reference: the broker's relationship to the policy engine is in Chapter 4; AI human-authority boundary is in Section 204 (Part IV); dual authorization in Section 194 (Part IV).

---

## Chapter 6: ACA Confidentiality Boundary (Section 5)

> *"Data cannot cross this boundary simply because it exists in Circle."* — Section 5

### 6.1 The boundary is explicit, not implicit

The ACA Confidentiality Boundary is an **explicit, enforced, audited boundary**. It is not a guideline; it is not a "best practice"; it is not a default that can be overridden by an administrator. Data does not flow from public Circle into ACA, or from ACA into public Circle, simply because it exists somewhere in the broader platform.

Every cross-boundary motion is:

1. **Defined** — there is a canonical pathway for this specific data type (intake, sealed-evidence motion, etc.).
2. **Authorized** — a specific policy controls this motion; unauthorized motion is blocked.
3. **Audited** — the motion is recorded in the institutional audit log with provenance.
4. **Compartmentalized** — the data does not become broadly visible on the other side of the boundary. It enters a specific compartment with a specific clearance tier and a specific set of authorized viewers.

### 6.2 The seven boundary rules

The boundary enforces the seven explicit rules from Section 5:

| # | Rule | Enforcement |
|---|---|---|
| 1 | **Citizen data does not automatically become visible to ACA.** | A citizen's Circle profile, messages, posts, locations, payment history, professional network, or any other public Circle data is **not** visible to ACA agents by default. Visibility requires an authorized intake pathway (Section 9 / Part II → Citizen-to-ACA Secure Intake) and a case-based, purpose-bound grant. |
| 2 | **Citizen evidence enters ACA only via defined intake / legal / policy pathways.** | Citizen-submitted evidence (e.g., a Citizen Shield recording) does not flow into ACA evidence storage automatically. It enters only through an explicitly defined intake workflow that records legal basis, retention class, and authorized viewers. The pathway is auditable end-to-end. |
| 3 | **ACA case data must never become visible to citizens.** | ACA case records, evidence, hypotheses, findings, recommendations, and intelligence are compartmentalized inside the ACA data plane. There is no path — direct or derivative — that surfaces them in the public Circle UI. |
| 4 | **Protected reporter identity remains compartmentalized.** | The identity of a protected reporter (e.g., a whistleblower) is stored in a sealed compartment. Unmasking requires dual authorization (Section 194). The unmasked identity is never exposed in the public Circle app and is visible only to specifically authorized ACA agents for a specific case and purpose. |
| 5 | **Sealed evidence remains restricted.** | Sealed evidence (e.g., evidence under legal hold, evidence with chain-of-custody restrictions) is stored in a sealed compartment. Access requires the agent's clearance to meet or exceed the seal tier, plus case-based authorization, plus purpose-bound access. Sealed evidence has no "normal delete" mechanism (Section 202). |
| 6 | **Internal intelligence remains institutional.** | ACA-generated intelligence — analytical signals, investigative indicators, hypotheses, similar-case correlations, risk-radar outputs — is institutional. It does not flow back to citizens, to public Circle dashboards, or to public Circle AI surfaces. |
| 7 | **ACA dashboards never appear in citizen UI.** | ACA dashboards (Command Center, Risk Radar, Integration Health, etc.) are institutional surfaces. They are never embedded in public Circle, never linked from public Circle, and never share rendering pipelines with public Circle dashboards. |

### 6.3 The boundary diagram

```
        ┌─────────────────────────────────────────────┐
        │              PUBLIC CIRCLE                  │
        │                                             │
        │   citizen data      citizen evidence        │
        │   citizen reports   public services         │
        │   ─────────────────────────────────         │
        │              CITIZEN SHIELD                 │
        └──────────────────┬──────────────────────────┘
                           │
   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┼─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                           │
        ACA CONFIDENTIALITY BOUNDARY
        (explicit, policy-controlled, audited)
                           │
        ┌──────────────────▼──────────────────────────┐
        │           ACA SOVEREIGN ENVIRONMENT         │
        │                                            │
        │   ACA case data ──── never returns ────────►│ (no path back to public)
        │   sealed evidence ── dual-auth access only  │
        │   protected identity ── sealed compartment  │
        │   internal intelligence ── institutional    │
        │   ACA dashboards ── institutional only     │
        └────────────────────────────────────────────┘
```

### 6.4 Cross-boundary data motion

Cross-boundary motion is allowed only through one of the following canonical pathways:

| Pathway | Direction | Authorization | Audit |
|---|---|---|---|
| **Citizen-to-ACA Intake** | Public → ACA | Citizen Shield report meets intake threshold (legal basis, intake policy). Triage / Intake module authorizes intake. | Full provenance from citizen submission through intake, classification, and case assignment. |
| **Sealed Evidence Motion** | ACA internal → ACA sealed | Agent requests seal; supervisor approves. Dual authorization where required. | Seal event, sealing authority, seal tier, viewers list. |
| **Protected Identity Unmask** | ACA sealed → ACA restricted | Dual authorization (Section 194). Time-limited. Purpose-bound. | Unmask event, both authorizing parties, purpose, expiry. |
| **Reform Verification Feedback** | ACA → Public (sanitized) | Sanitized, aggregate reform outcomes only (e.g., "service X improved by Y%"). No case data, no individual data. | Sanitization event, sanitization authority. |

Every other direction is prohibited by default. There is no "default allow" rule for cross-boundary motion.

### 6.5 Boundary enforcement mechanisms

The boundary is enforced by:

1. **Data-plane separation** (Section 212) — ACA data lives in a separate data plane with separate databases, evidence storage, keys, audit, identity, and integrations. There is no shared database table that contains both public Circle data and ACA data.
2. **Identity separation** (Chapter 3) — ACA agents have ACA-issued identities, not Circle consumer identities. There is no shared identity pool.
3. **Broker enforcement** (Chapter 5) — Every sensitive access traverses the ACA Data Access Broker, which enforces the boundary rules.
4. **Policy engine rules** (Chapter 4) — The policy engine includes boundary rules as first-class policy objects.
5. **Audit ledger** (Sections 195, 196, 197) — Every cross-boundary motion is recorded.
6. **Sanitization gates** — Any motion from ACA to public surfaces passes through a sanitization gate that strips institutional data, individual data, and case data before publishing aggregate, sanitized reform outcomes only.

### 6.6 Acceptance criteria for Chapter 6

1. No public Circle data is visible to ACA agents by default; visibility requires an authorized intake pathway.
2. No ACA case data, intelligence, or dashboard is visible in the public Circle UI under any condition.
3. Protected reporter identity is unmaskable only under dual authorization with time-limited, purpose-bound access.
4. Sealed evidence has no "normal delete" path; legal hold overrides ordinary retention.
5. Every cross-boundary motion is auditable end-to-end.
6. Reform-verification feedback from ACA to public Circle is sanitized, aggregate, and contains no case or individual data.

> Cross-reference: data-plane separation is in Section 212 (Part IV → Deployment Architecture); retention / legal hold in Section 202 (Part IV); evidence disposition in Section 203 (Part IV); protected identity unmasking in Section 194 (Part IV).

---

## Chapter 7: Public Circle vs ACA Architecture (Section 6)

> *"The public and ACA experiences must remain logically and visually distinct."* — Section 6

### 7.1 The three-zone architecture

The platform is structured into three logical zones, separated by explicit gateways. Each zone has its own identity, data plane, audit, and trust surface.

```
╔══════════════════════════════════════════════════════════════════╗
║                       PUBLIC CIRCLE                              ║
║                                                                  ║
║   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         ║
║   │ Citizens │  │ Normal   │  │ Citizen  │  │ Public   │         ║
║   │          │  │ Users    │  │ Shield   │  │ Services │         ║
║   └──────────┘  └──────────┘  └──────────┘  └──────────┘         ║
║                                                                  ║
║   ┌──────────────────────────────────────────────────────┐       ║
║   │   Normal Circle Modules (Wasl, Mashahd, Lamahat,      │       ║
║   │   Midan, Circles, Official Channels, Professional     │       ║
║   │   Network, Workspaces, Local Mesh, Circle Verify,     │       ║
║   │   Circle Pay, Circle Mail, Circle ID, Rihla, ...)     │       ║
║   └──────────────────────────────────────────────────────┘       ║
║                                                                  ║
║   citizen reporting · public services · normal Circle modules    ║
╚══════════════════════════════════════════════════════════════════╝
                                │
                                │  SECURE / POLICY-CONTROLLED HANDOFF
                                │  (defined intake / legal / policy
                                │   pathways — see Chapter 6)
                                ▼
╔══════════════════════════════════════════════════════════════════╗
║                  SECURE INSTITUTIONAL GATEWAY                    ║
║                                                                  ║
║   ACA Identity Broker · Policy Engine · Data Access Broker       ║
║   (Chapter 4 + Chapter 5)                                         ║
║                                                                  ║
║   · validates institutional credentials, MFA, device trust        ║
║   · re-evaluates zero-trust on every sensitive request            ║
║   · enforces ACA Confidentiality Boundary                         ║
║   · audits every motion                                          ║
╚══════════════════════════════════════════════════════════════════╝
                                │
                                ▼
╔══════════════════════════════════════════════════════════════════╗
║                   ACA SOVEREIGN ENVIRONMENT                      ║
║                                                                  ║
║   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        ║
║   │  ACA LOGIN    │  │  COMMAND      │  │  CASES        │        ║
║   │  IDENTITY     │  │  CENTER       │  │  INVESTIGATIONS│       ║
║   │  DEVICE TRUST │  │               │  │  INSPECTIONS  │        ║
║   └───────────────┘  └───────────────┘  └───────────────┘        ║
║                                                                  ║
║   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        ║
║   │  EVIDENCE      │  │  INTELLIGENCE │  │  GOVERNMENT   │        ║
║   │  PRESERVATION  │  │  KNOWLEDGE    │  │  INTEGRATIONS │        ║
║   │  VAULT         │  │  GRAPH        │  │               │        ║
║   └───────────────┘  └───────────────┘  └───────────────┘        ║
║                                                                  ║
║   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        ║
║   │  ANALYTICS     │  │  RECOMMEND-   │  │  REFORM        │        ║
║   │  RISK RADAR    │  │  ATIONS       │  │  MONITORING    │        ║
║   └───────────────┘  └───────────────┘  └───────────────┘        ║
║                                                                  ║
║   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        ║
║   │  SECURITY      │  │  AI           │  │  AUDIT         │        ║
║   │  ZERO TRUST    │  │  GOVERNANCE   │  │  TRAIL         │        ║
║   │  HSM           │  │               │  │               │        ║
║   └───────────────┘  └───────────────┘  └───────────────┘        ║
║                                                                  ║
║   aca login · command center · cases · investigations ·           ║
║   inspections · evidence · intelligence · government              ║
║   integrations · analytics · recommendations · reform             ║
║   monitoring · security audit                                     ║
╚══════════════════════════════════════════════════════════════════╝
```

### 7.2 The three zones in detail

#### 7.2.1 PUBLIC CIRCLE

The citizen-facing, free, sovereign-citizen trust surface. Contains:

- **Citizens** — ordinary users who register for Circle through consumer flows.
- **Normal users** — including professionals, creators, educators, public servants in their personal capacity.
- **Citizen Shield** — citizen reporting, citizen evidence recording, public service monitoring.
- **Citizen reporting** — complaints, service requests, public feedback.
- **Public services** — the public catalog of government and community services accessible through Circle.
- **Normal Circle modules** — Wasl, Mashahd, Lamahat, Midan, Circles/groups, Official Channels, Professional Network, Workspaces, Local Mesh, Circle Verify, AI safety, self-learning AI, Circle Pay, Circle Mail, Circle ID, Rihla, maps, translation, mini-apps, backups, privacy, community governance. These modules are enumerated in Chapter 8 and must not be removed or downgraded.

#### 7.2.2 SECURE INSTITUTIONAL GATEWAY

The policy-controlled handoff between public Circle and the ACA Sovereign Environment. This gateway is **not** a public feature — it is a control plane that:

- Validates ACA institutional credentials (ACA Identity Broker — Chapter 4)
- Re-evaluates zero-trust on every sensitive request (Data Access Broker — Chapter 5)
- Enforces the ACA Confidentiality Boundary (Chapter 6)
- Audits every motion (Section 195 — Part IV)

Citizen Shield feeds ACA through this gateway via defined intake pathways (Section 9 / Part II → Citizen-to-ACA Secure Intake). No data crosses the gateway outside these pathways.

#### 7.2.3 ACA SOVEREIGN ENVIRONMENT

The confidential institutional environment. Contains:

- **ACA login** — institutional authentication (Chapter 3)
- **ACA command center** — leadership and analyst dashboard (Chapter 11)
- **Cases** — case management and case screen (Chapter 10)
- **Investigations** — investigation workspace and workflow (Chapter 11, Part II)
- **Inspections** — field inspection and recording (Chapter 11, Part II)
- **Evidence** — preservation vault, evidence graph, provenance ledger (Part II)
- **Intelligence** — knowledge graph, analytical signals, risk radar (Part II / Part III)
- **Government integrations** — integration fabric, connected systems, integration health (Part III)
- **Analytics** — executive command analytics, national early warning (Part III / Part IV)
- **Recommendations** — recommendation engine, reform recommendations (Part IV)
- **Reform monitoring** — corrective action tracking, reform verification (Part IV)
- **Security audit** — institutional audit trail, security operations (Part IV)

### 7.3 Logical and visual distinction

The two zones are **logically and visually distinct**:

| Aspect | Public Circle | ACA Sovereign Environment |
|---|---|---|
| URL namespace | `*.circle.{tld}` (public) | `aca.{sovereign-tld}` (institutional) — **Requires government authorization / technical discovery** |
| Branding | Circle consumer brand | ACA-determined institutional brand |
| Aesthetic | Consumer-grade, social, friendly | Institutional, classification banners, clearance-aware |
| Authentication | Consumer OIDC, passwordless, OTP | ACA Identity Federation with MFA + device trust + certificates |
| Navigation | Public tabs and overlays | ACA navigation tree (Chapter 10) |
| Screens | Public screens (Home, Circles, Mail, etc.) | ACA screens (47-screen inventory — Chapter 10) |
| Data plane | Edge-replicated Turso, public CDN | Sovereign data plane (Section 212) |
| Audit | Public audit (community governance, Circle Verify) | Institutional audit (every sensitive action — Section 195) |

### 7.4 Acceptance criteria for Chapter 7

1. The three zones are physically and logically separated; there is no shared data plane, identity pool, or session store between Public Circle and ACA.
2. The Secure Institutional Gateway enforces the ACA Confidentiality Boundary; no data crosses outside defined pathways.
3. Public Circle and ACA are visually distinct: a user looking at either cannot mistake one for the other.
4. The ACA URL namespace is separate from the public Circle URL namespace.
5. No public Circle navigation reaches ACA; no ACA navigation reaches public Circle.

> Cross-reference: detailed module-by-module preservation rules are in Chapter 8; deployment architecture is in Section 211 (Part IV).

---

## Chapter 8: Do Not Break the Existing Circle Product (Section 7)

> *"ACA is an institutional extension. Where a public feature feeds ACA, define the secure handoff boundary."* — Section 7

### 8.1 The principle

The introduction of the ACA Sovereign Edition must not remove, downgrade, restrict, or compromise any existing public Circle capability. Public Circle remains the citizen-facing, free, full-featured product it is today. ACA is an **institutional extension** layered above and behind it — it consumes certain authorized signals from public Circle through defined handoff boundaries; it does not alter, gate, or repurpose public Circle for citizens.

### 8.2 The protected public features

The following existing public features must **not** be removed or downgraded. Each is listed with its ACA relationship (where one exists) and the secure handoff boundary (where one applies).

| # | Public Feature | ACA relationship | Secure handoff boundary |
|---|---|---|---|
| 1 | **Wasl (Chat)** | None direct. | — |
| 2 | **Mashahd (Video)** | None direct. | — |
| 3 | **Lamahat (Photos)** | None direct. | — |
| 4 | **Midan (Square)** | None direct. | — |
| 5 | **Circles/groups** | None direct. | — |
| 6 | **Official Channels** | ACA may consume officially published government content through authorized integration, not by reading citizen-side channels. | Official Channels content remains public; ACA does not alter it. |
| 7 | **Professional Network** | None direct. | — |
| 8 | **Workspaces (Educational)** | None direct. | — |
| 9 | **Local Mesh** | None direct. Local Mesh remains an offline citizen capability. | — |
| 10 | **Circle Verify** | Verification metadata may, under explicit intake, support ACA provenance. | Circle Verify remains citizen-facing; ACA does not surface verification results in citizen UI. |
| 11 | **AI safety** | ACA extends AI safety into the institutional context (AI Governance — Part III) but does not weaken public AI safety. | Public AI safety rules remain in force for all citizen-facing AI. |
| 12 | **Self-learning AI** | Self-learning remains citizen-side; ACA does not consume citizen-side self-learning state. | — |
| 13 | **Circle Pay (payments)** | None direct. | — |
| 14 | **Circle Mail** | None direct. | — |
| 15 | **Circle ID (OIDC)** | Consumer Circle ID is **never** an ACA identity (Chapter 3). | Hard separation — no federation path. |
| 16 | **Rihla (Travel)** | None direct. | — |
| 17 | **Maps** | ACA uses institutional mapping (National Map — Chapter 10); public maps remain unchanged. | — |
| 18 | **Translation** | Public translation layer remains unchanged; ACA may use the same engine for institutional translation. | Shared engine, separate context. |
| 19 | **Mini-apps** | None direct. | — |
| 20 | **Backups** | Public backups remain unchanged; ACA has separate DR (Part IV → DR/Continuity). | Separate backup domains. |
| 21 | **Privacy** | Public privacy posture is unchanged; ACA introduces additional compartmentalization for institutional data. | Citizen privacy is not weakened by the existence of ACA. |
| 22 | **Community governance** | Public community governance remains in force. | — |
| 23 | **Citizen Shield (existing functions)** | Citizen Shield feeds ACA through defined intake pathways only (Chapter 6). | Citizen Shield remains fully functional; intake is the only handoff. |

### 8.3 The secure handoff boundary

Where a public feature feeds ACA, the handoff is governed by the ACA Confidentiality Boundary (Chapter 6). The handoff is:

1. **Directional** — public → ACA only, never the reverse except through the Reform Verification Feedback pathway (sanitized, aggregate).
2. **Defined** — there is a specific intake workflow for each data type (e.g., citizen evidence → intake → triage → case assignment).
3. **Authorized** — each motion requires authorization per the policy engine (Chapter 4).
4. **Audited** — every motion is recorded in the institutional audit log.
5. **Compartmentalized** — once inside ACA, the data lives in a specific compartment with a specific clearance tier; it does not become broadly visible.

### 8.4 What "do not break" means concretely

| Constraint | Enforcement |
|---|---|
| No public feature is removed | Public Circle navigation, screens, and overlays remain unchanged. |
| No public feature is downgraded | Public features retain their current capability set; no functionality is reduced. |
| No public feature is gated behind ACA | No citizen-facing capability requires ACA access. |
| No public feature is repurposed for ACA | Public Circle modules are not retrofitted into ACA surfaces. |
| No public data is exposed to ACA by default | See Chapter 6 boundary rules. |
| No public identity becomes an ACA identity | See Chapter 3 separation. |
| No public session becomes an ACA session | See Chapter 4 federation. |
| No public audit pipeline is shared with ACA | ACA has its own institutional audit; public audit remains public. |
| No public URL exposes ACA | See Chapter 7 zone separation. |

### 8.5 Impact matrix (preview — full matrix in Part V → Requirements Traceability)

Each public Circle module is classified by its ACA impact:

| Classification | Meaning | Examples |
|---|---|---|
| **Unchanged** | The module is entirely unaffected by ACA. | Wasl, Mashahd, Lamahat, Midan, Circles, Professional Network, Workspaces, Local Mesh, Circle Pay, Circle Mail, Rihla, mini-apps. |
| **Extended** | The module gains institutional counterparts but the public module itself is unchanged. | Maps (ACA National Map), Translation (institutional translation context). |
| **Shared (engine)** | The module shares an underlying engine with ACA but operates in separate context. | AI safety (engine shared, context separated). |
| **Security-hardened** | The module's existing security posture is reinforced to support the boundary. | Circle ID (separation enforced), Circle Verify (provenance controls). |
| **Connected to ACA (intake only)** | The module feeds ACA through defined intake pathways. | Citizen Shield (citizen evidence intake). |
| **Isolated from ACA** | The module has no ACA relationship and must remain isolated. | Local Mesh, Circle Pay, Circle Mail. |
| **Not used by ACA** | ACA does not use this module. | Most creative-social modules (Smart Compose, Mood Engine, etc.). |
| **Replaced only in institutional context** | ACA has its own institutional equivalent; the public module is unchanged. | Navigation (public tabs vs ACA navigation tree), Dashboards (citizen vs Command Center). |

The full impact matrix is documented in Part V → Requirements Traceability → Original Circle → ACA Impact Matrix (Section 218).

### 8.6 Acceptance criteria for Chapter 8

1. Every public Circle module listed in §8.2 remains fully functional; no functionality is removed or downgraded.
2. Every ACA relationship in §8.2 is governed by a defined handoff boundary that complies with Chapter 6.
3. The full Original Circle → ACA Impact Matrix (Section 218) is produced in Part V.
4. A security error-check (Section 215) confirms no public feature has been silently repurposed, gated, or weakened.

> Cross-reference: full impact matrix in Part V → Requirements Traceability; security error-check rules in Chapter 15 and Section 215.

---

## Chapter 9: Blueprint Structure (Section 8)

> *"Do not simply append an enormous list of features at the end. Reorganize the blueprint into a coherent architecture."* — Section 8

### 9.1 The new major section

The blueprint introduces a new major section:

> **CIRCLE ACA — SOVEREIGN OVERSIGHT, INVESTIGATION & ADMINISTRATIVE INTELLIGENCE**

This section is structured into 36 logical layers. Each layer is a coherent architectural concern with its own inputs, outputs, permissions, security boundary, data ownership, human-vs-AI authority, integration requirements, failure handling, audit requirements, and acceptance criteria (Chapter 15 §15.4).

### 9.2 The 36 logical layers

The 36 ACA layers, with their part assignments in this 5-part blueprint:

| # | Layer | Part | Lead chapters |
|---|---|---|---|
| 1 | **ACA Product Vision** | I | Chapter 1, Chapter 14 |
| 2 | **ACA Boundary and Confidentiality Model** | I | Chapter 2, Chapter 6 |
| 3 | **ACA Identity and Access** | I | Chapter 3, Chapter 4 |
| 4 | **ACA Sovereign Deployment Model** | IV | (Section 211 — Deployment Options) |
| 5 | **ACA Oversight Fabric** | II | (Section 9 — Oversight Fabric) |
| 6 | **Citizen-to-ACA Secure Intake** | II | (Section 6 of source) |
| 7 | **ACA Case Management** | II | Chapter 10 (Case Screen) |
| 8 | **ACA Investigation Workspace** | II | Chapter 11 (Investigator Desktop) |
| 9 | **ACA Evidence & Provenance Fabric** | II | (Sections 197, 203) |
| 10 | **ACA Official Field Recording System** | II | Chapter 11 (Field Mobile, Trusted Evidence Device Mode) |
| 11 | **Smart Evidence Graph** | II | (Section 11) |
| 12 | **Smart Dynamic Timeline** | II | (Section 12) |
| 13 | **Government Service Intelligence** | III | (Section 13) |
| 14 | **Government Systems / Records Dependency Engine** | III | (Section 14) |
| 15 | **Regulatory & Legal Intelligence** | III | (Section 15) |
| 16 | **Investigation AI** | III | (Section 16) |
| 17 | **Risk / Corruption Intelligence** | III | (Section 17) |
| 18 | **Inspection & Field Operations** | II | Chapter 11 (Field Workflow) |
| 19 | **Financial / Procurement Intelligence** | III | (Section 19) |
| 20 | **Inter-agency Coordination** | III | (Section 20) |
| 21 | **Government Integration Fabric** | III | (Section 21) |
| 22 | **Security / Zero Trust** | IV | Chapter 5 (this Part), (Section 22) |
| 23 | **AI Governance** | III / IV | (Sections 23, 204) |
| 24 | **Governance / Findings / Reform** | IV | (Section 24) |
| 25 | **National Early Warning** | III / IV | (Section 25) |
| 26 | **International Cooperation** | III | (Section 26) |
| 27 | **Training / Simulation** | IV | (Section 27) |
| 28 | **Analytics / Executive Command** | IV | Chapter 11 (Command Center) |
| 29 | **Disaster Recovery / Continuity** | IV | (Section 29) |
| 30 | **Data Governance / Privacy** | IV | Chapter 6 (this Part), (Section 30) |
| 31 | **Compliance Mapping** | IV | (Section 200 — ISO 27001/42001, NIST ZT, NIST AI RMF) |
| 32 | **Deployment Architecture** | IV | Chapter 7 (this Part), (Section 211, 212) |
| 33 | **Implementation Roadmap** | V | (Section 33) |
| 34 | **End-to-End ACA Use Cases** | V | Chapter 11 (Workflows), (Section 34) |
| 35 | **KPIs** | V | (Section 35) |
| 36 | **Testing / Validation / Acceptance Criteria** | V | Chapter 15 (this Part), (Section 36) |

### 9.3 How Parts II–V map to these layers

| Part | Title | Layers covered | Notes |
|---|---|---|---|
| **Part I** (this document) | Foundation, Architecture & Confidentiality Boundary | 1, 2, 3, partial 22, partial 30, partial 32 | Establishes the non-negotiable foundations. |
| **Part II** | Oversight Fabric & Investigation Intelligence | 5, 6, 7, 8, 9, 10, 11, 12, 18 | The core institutional architecture: cases, evidence, timeline, investigation workspace, field recording. |
| **Part III** | Government Integration, Intelligence & AI Governance | 13, 14, 15, 16, 17, 19, 20, 21, 23, 25, 26 | The intelligence and integration layer. |
| **Part IV** | Governance, Reform, Security & Deployment | 4, 22 (full), 24, 27, 28, 29, 30 (full), 31, 32 (full) | Security, deployment, governance, DR, compliance. |
| **Part V** | Implementation, Use Cases, KPIs & Testing | 33, 34, 35, 36 | Roadmap, end-to-end use cases, KPIs, testing/acceptance. |

### 9.4 Structural rules for Parts II–V

To preserve the blueprint's coherence (Chapter 15 §15.4):

1. **Integrate into correct architectural sections** — each layer is placed in the part that owns its architectural concern.
2. **Eliminate duplicate features** — a capability appears in one canonical place; other parts reference it.
3. **One canonical definition** — each major capability has exactly one canonical definition.
4. **Reference shared services** — common services (audit, identity, broker) are referenced, not re-implemented.
5. **Identify dependencies** — each layer declares its dependencies on other layers.
6. **Define inputs/outputs** — each layer's data contract is explicit.
7. **Define permissions** — each layer's access model is explicit (Chapter 4).
8. **Define security boundaries** — each layer declares its security boundary (Chapter 6).
9. **Define data ownership** — each layer declares its data ownership (citizen vs ACA internal vs sealed vs protected).
10. **Define human-vs-AI authority** — each layer declares what AI may do vs what requires human authorization (Section 204).
11. **Define integration requirements** — each layer declares external integration dependencies and placeholders.
12. **Define failure handling** — each layer declares its failure modes and fail-closed behavior.
13. **Define audit requirements** — each layer declares its audit events (Section 195).
14. **Define acceptance criteria** — each layer declares verifiable acceptance criteria.

### 9.5 Acceptance criteria for Chapter 9

1. Every one of the 36 layers is assigned to a specific part and has a designated lead chapter.
2. No layer is duplicated across parts; cross-references are used instead.
3. Each part declares which layers it owns.
4. The 14 structural rules in §9.4 are applied uniformly across all parts.

> Cross-reference: quality rules in Chapter 15; traceability matrix in Part V → Requirements Traceability.

---

## Chapter 10: ACA Navigation & Screen Inventory (Sections 188, 220, 221)

> *"Create a completely different navigation system."* — Section 188

### 10.1 The ACA navigation system

The ACA environment uses a navigation system that is **completely different** from public Circle. There are no shared tabs, no shared overlays, no shared navigation patterns. The ACA navigation is institutional, role-scoped, clearance-aware, and permission-driven.

#### 10.1.1 The 24-item ACA navigation

| # | Navigation item | Description |
|---|---|---|
| 1 | **Command Center** | Executive command dashboard — leadership/analyst view (Chapter 11). |
| 2 | **Intake** | Triage and intake of authorized signals (citizen reports, official referrals, inter-agency signals). |
| 3 | **Cases** | Case list and case management. |
| 4 | **Investigations** | Active investigations workspace. |
| 5 | **Inspections** | Field inspection planning, execution, and review. |
| 6 | **Evidence** | Evidence catalog, preservation vault, provenance ledger. |
| 7 | **Timeline** | Smart dynamic timelines (Section 12). |
| 8 | **Intelligence Graph** | Smart evidence graph and institutional knowledge graph (Section 11). |
| 9 | **Services** | Government service intelligence (Section 13). |
| 10 | **Systems** | Government systems / records dependency engine (Section 14). |
| 11 | **Documents** | Institutional document management. |
| 12 | **People & Entities** | National Administrative Ontology — Person, Official, Organization, etc. (Section 10). |
| 13 | **Risks** | Risk / corruption intelligence (Section 17). |
| 14 | **Rules** | Regulatory & legal intelligence (Section 15). |
| 15 | **Findings** | Evidence-supported findings (human-authorized — Section 204). |
| 16 | **Recommendations** | Recommendation engine output (institutional). |
| 17 | **Corrective Actions** | Corrective action tracking and reform monitoring (Section 24). |
| 18 | **Referrals** | Inter-agency and prosecutorial referrals (Section 20). |
| 19 | **Integrations** | Government Integration Fabric + Integration Health (Section 21). |
| 20 | **AI Governance** | AI governance console (Sections 23, 204). |
| 21 | **Security** | Zero-trust controls, security operations, audit trail. |
| 22 | **Reports** | Institutional reporting. |
| 23 | **Administration** | ACA institutional administration — provisioning, revocation, policy engine. |
| — | (24th slot reserved for national-map and early-warning surfaces, accessed via Command Center) | National Map (Section 38 / Chapter 10 §10.3), National Early Warning (Section 25). |

> The 24-item list above corresponds to the navigation in Section 188, with the National Map and National Early Warning surfaces presented as Command Center–accessible widgets and dedicated screens rather than top-level tabs (their canonical screens appear in §10.3).

### 10.2 ACA Case Screen — 22 sub-tabs

Every case in the ACA environment presents the following 22 sub-tabs (Section 189). Each sub-tab is a distinct institutional surface with its own data contract, permissions, and audit requirements.

| # | Sub-tab | Description |
|---|---|---|
| 1 | **Overview** | Case summary: parties, scope, status, key indicators. Includes the Case Information Readiness panel (Section 208). |
| 2 | **Timeline** | Smart Dynamic Timeline (Section 12) — chronological reconstruction linked to supporting evidence. |
| 3 | **Evidence** | Evidence catalog for this case. |
| 4 | **Evidence Graph** | Smart Evidence Graph (Section 11) — visualized relationships between evidence, people, entities, services, systems, transactions. |
| 5 | **People** | People involved in the case (Person, Official, Employee — Section 10). |
| 6 | **Entities** | Organizations, agencies, companies, directorates involved. |
| 7 | **Services** | Government services implicated in the case (Section 13). |
| 8 | **Systems** | Government systems / records involved (Section 14). |
| 9 | **Documents** | Case documents. |
| 10 | **Inspections** | Inspections conducted for this case (Section 18). |
| 11 | **Transactions** | Transactions, contracts, payments implicated (Sections 19, 20). |
| 12 | **Locations** | Locations implicated, mapped on the National Map. |
| 13 | **Rules** | Rules, regulations, controls applicable to this case (Section 15). |
| 14 | **Controls** | Administrative controls (expected steps, required documents, SLAs, responsible roles — Section 15). |
| 15 | **Contradictions** | Data conflicts (Section 198) — both provenance paths shown. |
| 16 | **Evidence Gaps** | Evidence Gap Engine output (Section 18) — missing evidence, missing records, missing approvals, missing inspections. |
| 17 | **Similar Cases** | Similar-case correlations (analytical signals, not authoritative). |
| 18 | **Hypotheses** | Investigation hypotheses — clearly labeled as analytical, not findings. |
| 19 | **Findings** | Evidence-supported findings (human-authorized — Section 204). |
| 20 | **Recommendations** | Institutional recommendations. |
| 21 | **Corrective Actions** | Corrective actions and reform tracking. |
| 22 | **Audit Trail** | Full audit trail for this case (Section 195). |

#### 10.2.1 Case Information Readiness panel (Section 208)

The Overview sub-tab presents a Case Information Readiness panel. Example (demonstration data only):

```
CASE 118/2024

People:              7
Entities:            4
Services:            3
Agencies:            5
Systems:             9
Relevant Rules:      8
Expected Records:   31
Received:           24
Evidence:           17
Evidence Gaps:        4
Contradictions:      3
Similar Cases:      12
External Requests:    5
Volatile Evidence:    2

NEXT BEST ACTION: Request inspection record.
```

> The numbers above are demonstration data only (Section 209). The actual values are computed from case state.

### 10.3 ACA screen inventory — 47 screens (Section 220)

The ACA environment comprises at minimum the following 47 institutional screens. **These are separate ACA screens, not public Circle screens.** Each screen is reachable only through ACA-controlled navigation, scoped to the agent's assigned permissions, and audited.

| # | Screen | Description | Primary navigation |
|---|---|---|---|
| 1 | **ACA Login** | Institutional login (Chapter 3). | (entry point) |
| 2 | **MFA** | Multi-factor authentication challenge. | (entry point) |
| 3 | **Device Verification** | Trusted-device verification (Section 191). | (entry point) |
| 4 | **Command Center** | Executive command dashboard (Chapter 11). | Command Center |
| 5 | **Intake** | Intake of authorized signals. | Intake |
| 6 | **Triage** | Triage of intake items. | Intake |
| 7 | **Cases** | Case list. | Cases |
| 8 | **Case Overview** | Case Overview sub-tab (§10.2). | Cases → Case |
| 9 | **Timeline** | Case Timeline sub-tab. | Cases → Case → Timeline |
| 10 | **Evidence** | Case Evidence sub-tab. | Cases → Case → Evidence |
| 11 | **Evidence Graph** | Case Evidence Graph sub-tab. | Cases → Case → Evidence Graph |
| 12 | **People** | Case People sub-tab. | Cases → Case → People |
| 13 | **Entities** | Case Entities sub-tab. | Cases → Case → Entities |
| 14 | **Services** | Case Services sub-tab. | Cases → Case → Services |
| 15 | **Systems** | Case Systems sub-tab. | Cases → Case → Systems |
| 16 | **Documents** | Case Documents sub-tab. | Cases → Case → Documents |
| 17 | **Inspections** | Case Inspections sub-tab. | Cases → Case → Inspections |
| 18 | **Field Recording** | Trusted evidence device mode (Chapter 11). | Inspections → Field Recording |
| 19 | **Recording Review** | Review of field recordings. | Inspections → Recording Review |
| 20 | **Preservation Vault** | Sealed evidence preservation (Section 203). | Evidence → Preservation Vault |
| 21 | **Requests** | External data requests to other agencies. | Cases → Case → Requests |
| 22 | **Hypotheses** | Case Hypotheses sub-tab. | Cases → Case → Hypotheses |
| 23 | **Contradictions** | Case Contradictions sub-tab. | Cases → Case → Contradictions |
| 24 | **Evidence Gaps** | Case Evidence Gaps sub-tab. | Cases → Case → Evidence Gaps |
| 25 | **Similar Cases** | Case Similar Cases sub-tab. | Cases → Case → Similar Cases |
| 26 | **Investigation Plan** | Investigation planning surface. | Investigations → Plan |
| 27 | **Findings** | Case Findings sub-tab. | Cases → Case → Findings |
| 28 | **Recommendations** | Case Recommendations sub-tab. | Cases → Case → Recommendations |
| 29 | **Corrective Actions** | Case Corrective Actions sub-tab. | Cases → Case → Corrective Actions |
| 30 | **Risk Radar** | Risk / corruption intelligence (Section 17). | Risks |
| 31 | **Procurement Intelligence** | Procurement intelligence (Section 19). | Risks → Procurement |
| 32 | **Financial Intelligence** | Financial intelligence (Section 19). | Risks → Financial |
| 33 | **Rule / Regulation Intelligence** | Regulatory & legal intelligence (Section 15). | Rules |
| 34 | **Service Intelligence** | Government service intelligence (Section 13). | Services |
| 35 | **Digital Twin** | Administrative Process Digital Twin (Section 15). | Systems → Digital Twin |
| 36 | **National Map** | National map surface (locations, evidence markers, inspections). | Command Center → National Map |
| 37 | **Referrals** | Inter-agency and prosecutorial referrals (Section 20). | Referrals |
| 38 | **International Cooperation** | International cooperation surface (Section 26). | Referrals → International |
| 39 | **Integrations** | Integration Fabric console (Section 21). | Integrations |
| 40 | **Integration Health** | Integration Control Tower (Section 209). | Integrations → Health |
| 41 | **AI Governance** | AI governance console (Sections 23, 204). | AI Governance |
| 42 | **Security** | Zero-trust controls and security operations. | Security |
| 43 | **Audit** | Institutional audit trail (Section 195). | Security → Audit |
| 44 | **Reports** | Institutional reporting. | Reports |
| 45 | **Strategy** | Strategy / national early warning surface. | Command Center → Strategy |
| 46 | **Training** | Training / simulation (Section 27). | Administration → Training |
| 47 | **Administration** | ACA institutional administration (provisioning, revocation, policy engine). | Administration |

#### 10.3.1 Integration Control Tower example (Section 209)

The Integration Health screen presents an Integration Control Tower. Example (demonstration data only):

```
Connected Systems:    37
Healthy:              34
Degraded:              2
Offline:               1
Active Requests:     184
Overdue:              11
Missing Records:     613
Sync Errors:           3
Schema Changes:        1
Pending Authorizations: 17
```

> These are demonstration data only. The actual values are computed from live integration state. **Requires government authorization / technical discovery** for the specific connected government systems.

### 10.4 Navigation security (Section 221)

The navigation itself respects permissions. The principle (Section 221):

> *"An investigator without procurement clearance should not even see unauthorized procurement modules. An agent without evidence-export permission should not see unrestricted export controls."*

#### 10.4.1 Visibility is permission-driven

Each navigation item is visible only to agents whose assigned permissions include the corresponding capability. Concretely:

| If the agent lacks… | The navigation item is… |
|---|---|
| Procurement clearance | Procurement Intelligence module is **not visible**. |
| Evidence-export permission | Export controls in Evidence screens are **not visible**. |
| Case-based authorization for case 118 | Case 118 is **not visible** in the Cases list. |
| Clearance for sealed evidence | Sealed evidence items are **not visible** in the Evidence catalog. |
| Administration role | Administration module is **not visible**. |
| AI Governance role | AI Governance module is **not visible**. |

This is **hide-by-default**: unauthorized items are not rendered, not merely disabled. A disabled-but-visible item reveals its existence; a hidden item does not.

#### 10.4.2 The four navigation-security guarantees

1. **Hide-by-default** — unauthorized items are not rendered, not disabled.
2. **Permission-driven** — visibility is computed from the agent's current assigned permissions (Chapter 4), not from a static role assignment.
3. **Clearance-aware** — clearance-tier mismatches hide items, not just deny access.
4. **Case-scoped** — cases the agent is not authorized for are absent from the case list, not present-but-denied.

#### 10.4.3 Audit of navigation visibility

The navigation visibility computation itself is auditable. The institutional audit log records:

- Which navigation items were presented to which agent in which session
- Which items were hidden and why (clearance, role, case-assignment, policy)
- Whether the agent attempted to access a hidden item via direct URL (such attempts are denied and flagged)

### 10.5 Acceptance criteria for Chapter 10

1. The 24-item ACA navigation is fully implemented; no item is shared with public Circle.
2. Every case presents all 22 sub-tabs (subject to permission-based visibility — sub-tabs the agent is not authorized for are hidden, not disabled).
3. The 47-screen inventory is fully implemented; no screen is reachable from public Circle.
4. Navigation security enforces hide-by-default for all unauthorized items.
5. Direct-URL access to a hidden screen is denied and audited.
6. Navigation visibility is itself auditable.

> Cross-reference: form factors for each screen family in Chapter 11; case workflows in Part II → Case Management & Investigation Workspace.

---

## Chapter 11: ACA UX & Form Factors (Sections 205, 206, 207)

> *"Define: ACA Desktop Command Center, ACA Investigator Desktop, ACA Field Mobile, Trusted Evidence Device Mode, Secure Executive Mode."* — Section 205

### 11.1 The five ACA form factors

The ACA environment is delivered across five form factors, each tailored to a specific institutional role and operating context. All five share the same underlying data plane, identity, broker, and audit; they differ in surface, interaction model, and trusted-device posture.

| # | Form factor | Primary users | Primary devices | Trust posture |
|---|---|---|---|---|
| 1 | **ACA Desktop Command Center** | Leadership, senior analysts | Institutional desktops, large displays | High-trust workstation; full MFA + device trust |
| 2 | **ACA Investigator Desktop** | Investigators (deep investigation) | Institutional desktops, multi-monitor | High-trust workstation; full MFA + device trust |
| 3 | **ACA Field Mobile** | Inspectors, field agents | ACA-issued institutional mobile devices | Trusted mobile device; MFA + device binding + geolocation verification |
| 4 | **Trusted Evidence Device Mode** | Authorized recording personnel | ACA-issued trusted evidence devices (locked-down recorders) | Maximum-trust device; certificate-bound; tamper-evident |
| 5 | **Secure Executive Mode** | Senior authorized leadership | Sealed executive workstations | Maximum-trust workstation; hardware key required; isolated session |

### 11.2 Form factor specifications

#### 11.2.1 ACA Desktop Command Center

**Purpose:** Executive command dashboard for leadership and senior analysts. Provides aggregated, institutional-level visibility across cases, investigations, integrations, risk radar, and reform monitoring.

**Surface characteristics:**

- Large-display-optimized layout (multi-panel dashboards).
- Case Information Readiness panels (Section 208) at institutional and case level.
- Integration Control Tower (Section 209) — connected systems health.
- National Map with case/evidence/inspection overlays (Chapter 10 §10.3).
- National Early Warning surface (Section 25).
- Drill-through to case detail (Investigator Desktop surfaces on drill-down).
- No evidence-level editing here — leadership reads and directs; editing is performed in the Investigator Desktop.

**Trust posture:** high-trust institutional workstation with MFA + device trust. Sensitive actions (e.g., authorizing a reform recommendation) require re-authentication and, for the most sensitive, dual authorization (Section 194).

#### 11.2.2 ACA Investigator Desktop

**Purpose:** Deep investigation workspace for investigators. The primary surface for case-level work: evidence review, timeline analysis, evidence graph traversal, hypothesis development, finding drafting.

**Surface characteristics:**

- Multi-monitor-friendly layout with persistent case navigation.
- Full 22-sub-tab Case Screen (§10.2).
- Smart Evidence Graph (Section 11) — interactive, drill-through.
- Smart Dynamic Timeline (Section 12) — click-through to source, evidence, person, system, rule.
- Evidence Gap Engine (Section 18) and Contradictions (Section 198) panels.
- Investigation Plan surface (Chapter 10 §10.3 #26).
- Hypothesis drafting and challenge-finding workflow (Section 207).
- Finding drafting (human-authorized — Section 204).

**Trust posture:** high-trust institutional workstation. Evidence view, evidence download, export, and finding issuance are individually audited (Section 196). Sensitive exports require dual authorization.

#### 11.2.3 ACA Field Mobile

**Purpose:** Field operations for inspectors and agents. Mobile interface for assignment-driven inspections, field recording, evidence marker placement, checklist completion, findings capture, secure upload.

**Surface characteristics:**

- Mobile-optimized UI; large touch targets; offline-tolerant where policy permits.
- Assignment-driven: shows the agent's current assignments and tasks.
- Geolocation verification (Section 206 — Location/Device Verification step).
- Field recording capture (links to Trusted Evidence Device Mode where applicable).
- Evidence marker placement on National Map.
- Checklist completion; findings capture.
- Secure Upload: encrypted, audited upload of captured evidence to the Preservation Vault.
- Seal: after upload, evidence is sealed with provenance metadata.
- Supervisor handoff: completed inspection is routed to the supervisor for review.

**Trust posture:** trusted institutional mobile device (Section 191 — Device-to-Agent Binding). MFA on every session. Geolocation and device posture are re-evaluated continuously. If device posture degrades (e.g., jailbreak detected, location mismatch), subsequent sensitive actions are denied.

#### 11.2.4 Trusted Evidence Device Mode

**Purpose:** Official recording by authorized personnel using ACA-issued trusted evidence devices (locked-down, certificate-bound, tamper-evident recorders).

**Surface characteristics:**

- Locked-down device firmware; no general-purpose apps.
- Certificate-bound to an institutional service identity (the recorder's identity is institutional, not personal).
- Tamper-evident recording: every frame is hashed, signed, and timestamped at capture.
- Immediate secure upload to Preservation Vault (no local persistent storage beyond policy-defined buffer).
- Provenance metadata captured at recording time (device ID, location, operator, timestamp, hash chain).
- No editing capability — recording is immutable once sealed.

**Trust posture:** maximum-trust device. Used for the most evidentiarily significant captures. Provenance and integrity controls are designed to support institutional admissibility requirements — **without** claiming legal admissibility, which is a jurisdictional determination (Section 201 — Jurisdiction/Policy Engine).

#### 11.2.5 Secure Executive Mode

**Purpose:** Senior authorized leadership operating on the most sensitive matters (e.g., sealed cases, protected identity unmasking review, reform authorization).

**Surface characteristics:**

- Sealed executive workstation; isolated network session.
- Minimal surface: only the screens strictly required for the executive's role.
- Hardware security key mandatory for every action.
- Re-authentication for every sensitive action.
- Dual-authorization workflow: executive's authorization is one of two required for the most sensitive actions (Section 194).
- Full audit; every action recorded with executive identity, device, time, and purpose.

**Trust posture:** maximum-trust workstation. Hardware key required. Session is short and isolated; concurrent sessions are not permitted.

### 11.3 ACA Field Workflow (Section 206)

The field workflow defines the canonical sequence for an ACA field operation. Every step is auditable; every step has explicit inputs, outputs, and permissions.

```
┌──────────────────────┐
│  1. ASSIGNMENT       │  ← supervisor issues assignment; agent receives on
└──────────┬───────────┘     ACA Field Mobile
           │
           ▼
┌──────────────────────┐
│  2. AGENT            │  ← institutional MFA + device trust
│     AUTHENTICATION   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  3. LOCATION/DEVICE  │  ← geolocation + device posture verification
│     VERIFICATION    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  4. INSPECTION/TASK  │  ← agent performs inspection per assignment scope
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  5. RECORDING        │  ← optional: trusted evidence device records
└──────────┬───────────┘     (links to Trusted Evidence Device Mode)
           │
           ▼
┌──────────────────────┐
│  6. EVIDENCE MARKER  │  ← agent places markers on National Map /
│                      │     case timeline
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  7. DOCUMENTS        │  ← documents captured / referenced
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  8. CHECKLIST        │  ← institutional checklist completed
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  9. FINDINGS         │  ← agent records findings (human-authorized)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 10. SECURE UPLOAD    │  ← encrypted, audited upload to Preservation Vault
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 11. SEAL             │  ← evidence sealed with provenance metadata
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 12. CASE TIMELINE    │  ← events appended to case Smart Dynamic Timeline
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 13. SUPERVISOR       │  ← completed inspection routed to supervisor
│                     │     for review and acceptance
└──────────────────────┘
```

### 11.4 ACA End-to-End Investigation Workflow (Section 207)

The end-to-end investigation workflow defines the canonical lifecycle of an ACA investigation — from signal to institutional learning. This is the master workflow that Parts II–V elaborate.

| # | Stage | Description | AI authority (Section 204) |
|---|---|---|---|
| 1 | **Signal** | An authorized signal arrives (citizen intake, official referral, inter-agency signal, risk-radar trigger). | AI may detect signals and prioritize. |
| 2 | **Intake** | The signal is received, classified, and routed. | AI may classify and recommend routing. |
| 3 | **Jurisdiction** | Jurisdiction is determined (does ACA have authority?). | AI may recommend jurisdiction; human confirms. |
| 4 | **Service Identification** | The government service(s) implicated are identified. | AI may identify candidates. |
| 5 | **System Identification** | The government system(s) / records implicated are identified. | AI may identify candidates. |
| 6 | **Preservation** | Evidence preservation requests are issued (legal hold, retention overrides). | AI may recommend preservation; human authorizes. |
| 7 | **Evidence Graph** | The Smart Evidence Graph is constructed (Section 11). | AI connects and correlates. |
| 8 | **Timeline** | The Smart Dynamic Timeline is constructed (Section 12). | AI sequences events. |
| 9 | **Expected vs Actual** | Administrative Process Digital Twin overlays expected vs actual process (Section 15). | AI computes deltas. |
| 10 | **Gaps** | Evidence Gap Engine identifies missing evidence, records, approvals (Section 18). | AI identifies gaps. |
| 11 | **Contradictions** | Data conflicts are surfaced with both provenance paths (Section 198). | AI detects contradictions. |
| 12 | **Related Cases** | Similar-case correlations are surfaced as analytical signals. | AI correlates. |
| 13 | **Hypotheses** | Investigation hypotheses are developed — clearly labeled analytical. | AI may propose hypotheses. |
| 14 | **Investigation** | Active investigation proceeds. | AI assists; human directs. |
| 15 | **Challenge Finding** | Each prospective finding is challenged (adversarial review). | AI may surface counter-evidence. |
| 16 | **Human Review** | A human investigator reviews the challenged finding. | Human authority. |
| 17 | **Finding** | An evidence-supported finding is issued (human-authorized). | **Human determination — AI cannot issue authoritative findings.** |
| 18 | **Root Cause** | Root cause is identified. | AI may recommend; human confirms. |
| 19 | **Recommendation** | An institutional recommendation is drafted. | AI may draft; human authorizes. |
| 20 | **Corrective Action** | A corrective action is defined and assigned. | Human authority. |
| 21 | **Reform Verification** | Reform outcomes are verified over time. | AI may monitor; human verifies. |
| 22 | **Recurrence Monitoring** | The system monitors for recurrence of the original problem. | AI may detect recurrence signals. |
| 23 | **Institutional Learning** | Lessons are captured for institutional learning (training, simulation, policy update). | Human authority; AI assists. |

> The workflow above is the master lifecycle. Part II elaborates stages 7–17; Part IV elaborates stages 18–23; Part V provides end-to-end use cases.

### 11.5 Acceptance criteria for Chapter 11

1. All five form factors are implemented; each is reachable only through ACA-controlled authentication.
2. The Field Workflow's 13 stages are implemented and auditable end-to-end.
3. The End-to-End Investigation Workflow's 23 stages are implemented and auditable end-to-end.
4. AI authority is bounded at each stage per the table in §11.4 — AI cannot issue authoritative findings, impose discipline, unmask protected identities, or close sensitive investigations.
5. Every sensitive action across all form factors is audited (Section 195).
6. Trusted Evidence Device Mode enforces immutability after seal; tamper-evident recording is verified.

> Cross-reference: case screen and navigation in Chapter 10; AI human-authority boundary in Section 204 (Part IV); field recording and provenance in Part II → Evidence & Provenance Fabric.

---

## Chapter 12: Business & Commercial Model (Section 210)

> *"Do not change Circle's public free-service philosophy for citizens. Citizen-facing services remain FREE. ACA receives PAID SOVEREIGN INSTITUTIONAL SERVICES."* — Section 210

### 12.1 The two-tier commercial model

The platform operates a **two-tier commercial model**:

| Tier | Audience | Pricing | Surface |
|---|---|---|---|
| **Public Circle** | Citizens, normal users | **FREE** | Public Circle app |
| **ACA Sovereign Services** | ACA (institutional) | **PAID SOVEREIGN INSTITUTIONAL SERVICES** | ACA Sovereign Environment |

The two tiers are **commercially distinct** as well as architecturally distinct. Public Circle remains free for citizens; ACA receives paid institutional services. There is no cross-subsidy that degrades public Circle, and there is no paywall inserted into public Circle to fund ACA.

### 12.2 Public Circle remains FREE

Public Circle's free-service philosophy is unchanged by the introduction of ACA. Citizens continue to access:

- All public Circle modules (Chapter 8)
- Citizen Shield (citizen reporting, citizen evidence recording, public services)
- All existing creative-social features (v16.0 modules)
- All existing infrastructure (maps, translation, mini-apps, backups, privacy, community governance)

No public feature is paywalled to fund ACA. No public feature is downgraded to incentivize institutional upgrade. The existence of ACA imposes no cost on citizens.

### 12.3 ACA receives PAID SOVEREIGN INSTITUTIONAL SERVICES

The ACA Sovereign Environment is delivered as a paid institutional service to ACA. The commercial relationship is between the platform provider and ACA — it is **not** visible to citizens, **not** surfaced in public Circle, and **not** payable by individual users.

### 12.4 Institutional commercial categories (Section 210)

The institutional commercial relationship comprises the following categories (Section 210):

| # | Category | Description |
|---|---|---|
| 1 | **Sovereign deployment** | Deployment of the ACA Sovereign Environment on ACA-controlled infrastructure (government datacenter, government private cloud, sovereign K8s — Section 211). |
| 2 | **Customization** | Institutional customization of ACA modules, workflows, and policy engine to ACA's specific mandate and jurisdiction. |
| 3 | **Integration** | Authorized integration with Egyptian government systems (Integration Fabric — Section 21). **Requires government authorization / technical discovery** for each integration. |
| 4 | **Technical support** | Institutional support — incident response, institutional SLAs, dedicated support channels. |
| 5 | **Security assurance** | Security assurance — penetration testing, security audits, zero-trust verification, incident forensics. |
| 6 | **Maintenance** | Ongoing maintenance — patching, schema evolution, dependency updates, performance tuning. |
| 7 | **Training** | Institutional training — investigator training, inspector training, administrator training, simulation training (Section 27). |
| 8 | **AI / model governance** | AI governance services — model evaluation, bias testing, drift monitoring, AI human-authority boundary verification (Sections 23, 204). |
| 9 | **Disaster recovery** | DR and continuity services — sovereign backup, failover, RPO/RTO guarantees (Section 29). |
| 10 | **Managed updates** | Managed updates of the ACA Sovereign Environment — version rollout, compatibility verification, regression testing. |
| 11 | **Institutional implementation** | End-to-end institutional implementation — phased rollout, change management, institutional adoption support. |

### 12.5 No ACA pricing/paywalls inside public Circle

The commercial separation is enforced structurally:

1. **No ACA pricing in public Circle** — no price list, no upgrade prompt, no "contact sales" link, no institutional-offer banner.
2. **No ACA paywall in public Circle** — no public feature is gated behind an institutional upgrade.
3. **No ACA commercial messaging in public Circle** — no marketing of ACA capabilities to citizens.
4. **Separate commercial relationship** — the ACA commercial relationship is between the platform provider and ACA, governed by institutional contracts, not consumer transactions.

### 12.6 Acceptance criteria for Chapter 12

1. Public Circle remains free for all citizens; no public feature is paywalled to fund ACA.
2. ACA commercial categories are defined and contractable as institutional services.
3. No ACA pricing, paywall, or commercial messaging appears in public Circle.
4. The commercial relationship between the platform provider and ACA is institutional and is governed by institutional contracts.

> Cross-reference: deployment options in Section 211 (Part IV); DR in Section 29 (Part IV); AI governance in Sections 23, 204 (Part III / Part IV).

---

## Chapter 13: Final Architecture Summary (Section 239)

> *"The final blueprint should clearly show: PUBLIC CIRCLE → SECURE INSTITUTIONAL GATEWAY → ACA SOVEREIGN ENVIRONMENT."* — Section 239

### 13.1 The final architecture diagram

The complete, canonical architecture diagram (Section 239):

```text
PUBLIC CIRCLE
│
├── Citizen
├── Citizen Shield
├── Citizen Reporting
└── Public Services
        │
        │ SECURE / POLICY-CONTROLLED HANDOFF
        ▼
┌───────────────────────────────────────────┐
│        ACA SOVEREIGN ENVIRONMENT          │
│                                           │
│  ACA LOGIN / IDENTITY / DEVICE TRUST      │
│                 │                         │
│        ACA OVERSIGHT FABRIC               │
│                 │                         │
│   ┌─────────────┼──────────────┐          │
│   │             │              │          │
│ Evidence     Investigation   Services     │
│   │             │              │          │
│   └─────────────┼──────────────┘          │
│                 │                         │
│       INTELLIGENCE KNOWLEDGE GRAPH        │
│                 │                         │
│      SMART TIMELINE / DIGITAL TWIN        │
│                 │                         │
│      AI + HYPOTHESES + CONTRADICTIONS     │
│                 │                         │
│       FINDINGS / RECOMMENDATIONS          │
│                 │                         │
│       CORRECTIVE ACTION / REFORM          │
│                 │                         │
│       NATIONAL EARLY WARNING              │
│                                           │
│  SECURITY / ZERO TRUST / AUDIT / HSM      │
│                                           │
│       GOVERNMENT INTEGRATION FABRIC       │
└───────────────────────────────────────────┘
```

### 13.2 Reading the diagram

| Layer | Role | Reference |
|---|---|---|
| **PUBLIC CIRCLE** | Citizen-facing surface: Citizen, Citizen Shield, Citizen Reporting, Public Services. Free for citizens. | Chapter 7, Chapter 8 |
| **SECURE / POLICY-CONTROLLED HANDOFF** | The Secure Institutional Gateway. Data crosses only through defined intake/legal/policy pathways (Chapter 6). | Chapter 4, Chapter 5, Chapter 6 |
| **ACA LOGIN / IDENTITY / DEVICE TRUST** | Institutional authentication, MFA, device binding (Chapter 3). | Chapter 3 |
| **ACA OVERSIGHT FABRIC** | The core institutional architecture — canonical relationship model connecting evidence, events, timeline, people, organizations, services, processes, documents, inspections, transactions, contracts, payments, locations, complaints, cases, rules, controls, findings, recommendations, corrective actions (Section 9). | Part II → Oversight Fabric |
| **Evidence · Investigation · Services** | Three primary operational pillars: Evidence & Provenance Fabric, Investigation Workspace, Government Service Intelligence. | Part II / Part III |
| **INTELLIGENCE KNOWLEDGE GRAPH** | Smart Evidence Graph (Section 11) and National Administrative Ontology (Section 10). | Part II → Evidence Graph & Ontology |
| **SMART TIMELINE / DIGITAL TWIN** | Smart Dynamic Timeline (Section 12) and Administrative Process Digital Twin (Section 15). | Part II / Part III |
| **AI + HYPOTHESES + CONTRADICTIONS** | Investigation AI (Section 16), Hypotheses, Contradictions (Section 198). AI is bounded by the human-authority boundary (Section 204). | Part III → Investigation AI; Part IV → AI Governance |
| **FINDINGS / RECOMMENDATIONS** | Human-authorized findings and institutional recommendations. | Part IV → Governance/Findings/Reform |
| **CORRECTIVE ACTION / REFORM** | Corrective action tracking and reform verification (Section 24). | Part IV → Governance/Findings/Reform |
| **NATIONAL EARLY WARNING** | National Early Warning surface (Section 25). | Part III / Part IV |
| **SECURITY / ZERO TRUST / AUDIT / HSM** | Zero-trust architecture (Chapter 5), institutional audit (Section 195), HSM key management (Section 213). | Chapter 5; Part IV → Security |
| **GOVERNMENT INTEGRATION FABRIC** | Authorized integration with Egyptian government systems (Section 21). | Part III → Government Integration Fabric |

### 13.3 The three architectural invariants

The diagram expresses three architectural invariants that hold across the entire blueprint:

1. **Separation** — PUBLIC CIRCLE and ACA SOVEREIGN ENVIRONMENT are physically, logically, commercially, and visually separate (Chapters 2, 7, 8, 12).
2. **Controlled handoff** — the only motion between them is the SECURE / POLICY-CONTROLLED HANDOFF, governed by the ACA Confidentiality Boundary (Chapter 6) and enforced by the Secure Institutional Gateway (Chapter 4, Chapter 5).
3. **Sovereign layering** — within the ACA SOVEREIGN ENVIRONMENT, layers build upward from ACA LOGIN through the OVERSIGHT FABRIC, the operational pillars, the intelligence layer, the AI layer, the governance layer, to NATIONAL EARLY WARNING, all underpinned by SECURITY / ZERO TRUST / AUDIT / HSM and GOVERNMENT INTEGRATION FABRIC.

### 13.4 Acceptance criteria for Chapter 13

1. The diagram is the canonical architecture diagram of the ACA Sovereign Edition.
2. All three architectural invariants (separation, controlled handoff, sovereign layering) are enforced and auditable.
3. Each layer in the diagram is owned by a specific part of the blueprint (Parts I–V).

> Cross-reference: full layer-to-part mapping in Chapter 9; security/zero-trust in Chapter 5 and Part IV; integration fabric in Part III.

---

## Chapter 14: Executive Positioning (Section 238)

> *"The final blueprint should position ACA Circle as: A SOVEREIGN ADMINISTRATIVE OVERSIGHT, INVESTIGATION, EVIDENCE, INTELLIGENCE AND GOVERNANCE PLATFORM."* — Section 238

### 14.1 The positioning statement

The ACA Sovereign Edition is positioned as:

> **A SOVEREIGN ADMINISTRATIVE OVERSIGHT, INVESTIGATION, EVIDENCE, INTELLIGENCE AND GOVERNANCE PLATFORM.**

This is the canonical positioning statement. All communications about the platform — internal, inter-agency, governmental, and (where authorized) international — use this positioning.

### 14.2 What the platform is NOT

The platform is explicitly **not**:

| Mischaracterization | Why it is wrong |
|---|---|
| "Complaint management" | Complaints are an input, not the platform's purpose. The platform covers oversight, investigation, evidence, intelligence, and governance — far beyond complaint handling. |
| "CRM" | The platform is not a citizen-relationship manager. It is an institutional oversight and intelligence environment. |
| "Workflow software" | Workflows are a means, not the platform's identity. The platform's purpose is auditable institutional oversight. |
| "Surveillance platform" | The platform is not a surveillance system. It is a confidential institutional oversight environment operating under policy control, with an explicit human-authority boundary over AI. |
| "AI chatbot" | AI is one capability among many, bounded by the human-authority boundary (Section 204). The platform is not reducible to an AI assistant. |
| "Case-management system" | Case management is one layer (Chapter 10). The platform covers oversight, evidence, intelligence, reform, and governance in addition to cases. |

### 14.3 The core value proposition (canonical)

The platform's core value proposition, taken verbatim from Section 238, is the canonical statement and must not be paraphrased away in communications:

> *"Circle connects authorized complaints, official field evidence, investigations, government services, administrative processes, documents, transactions, inspections, decisions, people, entities, rules and systems into one continuously auditable environment that helps ACA reconstruct events, discover relationships, identify missing information, compare expected and actual processes, investigate efficiently, detect systemic weaknesses, coordinate across institutions, verify reforms and identify emerging risks before they become major problems."*

### 14.4 What the value proposition means

The value proposition contains ten distinct commitments, each of which maps to a part of the blueprint:

| # | Commitment | Mapping |
|---|---|---|
| 1 | Connect authorized complaints | Part II → Citizen-to-ACA Secure Intake |
| 2 | Connect official field evidence | Part II → Evidence & Provenance Fabric; Chapter 11 (Trusted Evidence Device Mode) |
| 3 | Connect investigations | Part II → Investigation Workspace |
| 4 | Connect government services | Part III → Government Service Intelligence |
| 5 | Connect administrative processes | Part III → Government Systems / Records Dependency Engine; Part II → Digital Twin |
| 6 | Connect documents, transactions, inspections, decisions, people, entities, rules, systems | Part II → Oversight Fabric; National Administrative Ontology (Section 10) |
| 7 | Continuously auditable environment | Chapter 5; Part IV → Security / Audit |
| 8 | Reconstruct events, discover relationships, identify missing information, compare expected vs actual | Part II → Smart Evidence Graph, Smart Dynamic Timeline, Evidence Gap Engine, Digital Twin |
| 9 | Investigate efficiently, detect systemic weaknesses, coordinate across institutions, verify reforms | Part II → Investigation Workspace; Part III → Risk/Corruption, Inter-agency; Part IV → Reform Monitoring |
| 10 | Identify emerging risks before they become major problems | Part III / Part IV → National Early Warning |

### 14.5 Acceptance criteria for Chapter 14

1. The canonical positioning statement is used in all official communications about the platform.
2. The platform is never described using the mischaracterizations in §14.2.
3. The core value proposition (§14.3) is preserved verbatim.
4. All ten commitments in §14.4 map to specific parts of the blueprint and are addressed in those parts.

> Cross-reference: blueprint language rules in Chapter 15; part assignments in Chapter 9.

---

## Chapter 15: Blueprint Language & Quality Rules (Sections 236, 237, 240)

> *"Do not invent facts. Use precise institutional language. Apply final quality control."* — Sections 236, 237, 240

This chapter defines the language and quality rules that govern all five parts of the blueprint. The rules are binding on Part I (this document) and on Parts II–V.

### 15.1 Do not invent facts (Section 236)

Where an Egyptian API, legal authority, technical capability, or integration has not been formally verified, the blueprint does **not** invent an endpoint, API, legal permission, or existing integration. Instead, it writes:

> **Requires government authorization / technical discovery.**

#### 15.1.1 Placeholders

The blueprint uses placeholders for the following, never real values:

| Placeholder type | Format | Example |
|---|---|---|
| API URLs | `{DESCRIPTIVE_NAME_ENDPOINT}` | `{EGYPT_GOV_IDENTITY_ENDPOINT}` |
| Credentials | `{ACA_CREDENTIAL_NAME}` | `{ACA_HSM_KEY_NAME}` |
| Certificates | `{ACA_CERTIFICATE_NAME}` | `{ACA_INSTITUTIONAL_CERT}` |
| Government endpoints | `{GOV_SYSTEM_NAME_ENDPOINT}` | `{GOV_PROCUREMENT_ENDPOINT}` |
| Secret keys | `{ACA_SECRET_NAME}` | `{ACA_EVIDENCE_SEAL_KEY}` |

Real credentials never appear in source code, mobile app, public configuration, or blueprint examples (Section 214). All credentials are managed through ACA-controlled secret management and environment-specific configuration.

#### 15.1.2 Compliance / assurance (Section 200)

The blueprint does **not** falsely claim compliance with:

- ISO/IEC 27001
- ISO/IEC 42001
- NIST Zero Trust
- NIST AI Risk Management Framework
- Applicable digital-evidence / provenance standards

Compliance is asserted only where certification has actually been obtained. Where it has not, the blueprint states the platform is **architected to map to** the standard, not that it is certified.

#### 15.1.3 Egyptian legal / regulatory (Section 201)

The blueprint does **not** hardcode claims such as:

- "legally admissible"
- "fully compliant"
- "authorized"

unless formally verified. Instead, the platform builds a configurable **Jurisdiction / Policy Engine** (Section 201) with: effective dates, legal basis, retention, disclosure, access, evidence rules, authorization rules. Whether a given recording meets legal admissibility in a specific Egyptian jurisdiction is a jurisdictional determination, not a platform assertion.

### 15.2 Blueprint language (Section 237)

The blueprint uses precise institutional language.

#### 15.2.1 Proscribed phrasings

The following phrasings are **prohibited** in the blueprint:

| Proscribed phrasing | Why prohibited | Acceptable alternative |
|---|---|---|
| "AI proves guilt" | AI cannot prove guilt — that is a human determination. | "AI surfaces investigative indicators" / "AI identifies evidence-supported signals" |
| "AI determines corruption" | AI cannot determine corruption — that is a human determination. | "AI surfaces analytical signals of risk" / "AI identifies investigative indicators" |
| "Video is automatically legally admissible" | Legal admissibility is a jurisdictional determination, not a platform assertion. | "Recording captures provenance metadata designed to support institutional admissibility requirements" |
| "All government systems are connected" | Not true; integrations are authorized individually. | "Authorized integrations connect specific government systems" |
| "All data is centralized" | Not true; data is compartmentalized by classification and clearance. | "Data is compartmentalized per classification and clearance tier" |

#### 15.2.2 Preferred phrasings

The blueprint prefers the following institutional terms:

| Preferred term | Usage |
|---|---|
| **Investigative indicator** | A signal, pattern, or anomaly that warrants investigation. Not a finding. |
| **Evidence-supported finding** | A finding issued by a human investigator on the basis of supporting evidence. Not an AI output. |
| **Authorized access** | Access granted under the policy engine (Chapter 4) and zero-trust broker (Chapter 5). Not access by default. |
| **Provenance** | The end-to-end traceability of a fact, evidence item, or decision (Section 197). |
| **Analytical signal** | An AI-derived signal — clearly labeled analytical, not authoritative. |
| **Human determination** | A determination made by a human under institutional authority. |
| **Policy-controlled workflow** | A workflow governed by the policy engine and ACA institutional policy. |
| **Authorized integration** | An integration with an external system that has been formally authorized. |

#### 15.2.3 AI human-authority boundary (Section 204)

The blueprint explicitly encodes the AI human-authority boundary:

| AI can | AI cannot (independently) |
|---|---|
| Detect | Declare guilt |
| Connect | Impose discipline |
| Correlate | Issue authoritative findings |
| Classify | Prosecute |
| Summarize | Unmask protected identities |
| Prioritize | Destroy evidence |
| Simulate | Close sensitive investigations without required human authorization |
| Recommend | |
| Warn | |

This boundary is enforced by the ACA Data Access Broker (Chapter 5) and is restated in every part of the blueprint where AI is discussed.

### 15.3 Final quality control instruction (Section 240)

Before any part of the blueprint is considered complete, a full line-by-line reconciliation is performed against (a) the existing CIRCLE blueprint (`CIRKLE-BLUEPRINT-v16.md` and the v12 baseline it derives from) and (b) the entire ACA requirements in the source prompt (`Pasted Content_1787843211586.txt`).

#### 15.3.1 Gap / duplication / conflict audit (Section 240)

The final audit produces a **Gap / Duplication / Conflict Audit** with the following categories:

| Category | Question |
|---|---|
| **Missing requirement** | Is a source requirement not addressed in any part of the blueprint? |
| **Duplicate requirement** | Is the same requirement defined in more than one place (without a single canonical definition)? |
| **Contradictory requirement** | Do two parts of the blueprint impose conflicting rules? |
| **Security weakness** | Is there a privilege-escalation path, insecure default, public exposure, evidence-deletion path, weak device binding, missing audit event, or insecure integration assumption? (Section 215) |
| **Privacy weakness** | Is there an accidental citizen-visibility path, an incorrect retention rule, or a protected-identity exposure? |
| **Integration dependency** | Is an integration assumed that has not been formally verified? (Placeholder required.) |
| **Legal/policy assumption** | Is a legal claim made that has not been formally verified? |
| **UX ambiguity** | Is a UX flow ambiguous (e.g., a navigation path that could lead to an unauthorized screen)? |
| **Data-model ambiguity** | Is a data model underspecified (e.g., a relationship type not classified)? |
| **AI-governance weakness** | Is there an AI action that crosses the human-authority boundary? |
| **Deployment ambiguity** | Is a deployment option underspecified (e.g., a data-plane separation that is not enforced)? |
| **Testing gap** | Is a layer or requirement missing an acceptance criterion? |

All material issues are corrected before the blueprint is considered complete.

### 15.4 Blueprint quality rules (Section 216)

The blueprint is constructed according to the following 14 quality rules (Section 216). These rules apply uniformly to Parts I–V.

| # | Rule | Application in Part I |
|---|---|---|
| 1 | **Integrate into correct architectural sections** | Each chapter is placed in its architectural concern (identity, boundary, architecture, etc.). |
| 2 | **Eliminate duplicate features** | Each capability has one canonical definition in Part I; Parts II–V cross-reference. |
| 3 | **One canonical definition of each major capability** | E.g., the ACA Confidentiality Boundary is defined once (Chapter 6) and referenced everywhere. |
| 4 | **Reference shared services rather than repeating implementations** | The ACA Data Access Broker (Chapter 5) is referenced by Chapters 6, 7, 8, 10, 11. |
| 5 | **Identify dependencies** | Each chapter declares its dependencies (see "Cross-reference" notes). |
| 6 | **Define inputs/outputs** | Each architectural component declares its inputs/outputs (e.g., the broker's six-step pipeline in Chapter 5). |
| 7 | **Define permissions** | Chapter 4 defines the eight access dimensions; Chapter 10 defines permission-driven navigation. |
| 8 | **Define security boundaries** | Chapter 6 defines the confidentiality boundary; Chapter 5 defines the zero-trust boundary. |
| 9 | **Define data ownership** | Chapter 6 defines data ownership (citizen vs ACA internal vs sealed vs protected). |
| 10 | **Define human-vs-AI authority** | Section 204 restated in Chapter 5, Chapter 11, Chapter 14, Chapter 15. |
| 11 | **Define integration requirements** | Placeholders used throughout (Chapter 4, Chapter 15). |
| 12 | **Define failure handling** | Chapter 4 §4.4, Chapter 5 §5.6 define failure modes and fail-closed behavior. |
| 13 | **Define audit requirements** | Each chapter declares audit events; Section 195 referenced. |
| 14 | **Define acceptance criteria** | Each chapter ends with acceptance criteria. |

### 15.5 Acceptance criteria for Chapter 15

1. No fact is invented; unverified integrations use the "Requires government authorization / technical discovery" marker.
2. No real credentials, API URLs, certificates, or government endpoints appear in the blueprint; placeholders are used.
3. No proscribed phrasing (§15.2.1) appears in Part I or in any subsequent part.
4. The preferred phrasings (§15.2.2) are used consistently.
5. The AI human-authority boundary (Section 204) is enforced in every part where AI is discussed.
6. The 14 blueprint quality rules (§15.4) are applied uniformly to Parts I–V.
7. A Gap / Duplication / Conflict Audit (§15.3.1) is produced as part of Part V (final part) before the blueprint is considered complete.

> Cross-reference: requirements traceability matrix in Part V → Requirements Traceability (Section 217); original Circle → ACA impact matrix in Part V (Section 218); data classification matrix in Part V (Section 219); final gap audit in Part V (Section 240).

---

## Part I Closing Notes

### A. Scope confirmation

Part I establishes the **foundation, architecture, and confidentiality boundary** of the ACA Sovereign Edition. It does not duplicate the content of Parts II–V; it references them. Specifically, Part I covers:

- Sections 1–8 (architectural distinction, login, access, zero-trust, boundary, public-vs-ACA, do-not-break, blueprint structure)
- Sections 188, 220, 221 (navigation, screen inventory, navigation security)
- Sections 205, 206, 207 (form factors, field workflow, end-to-end investigation workflow)
- Section 210 (business & commercial model)
- Sections 236, 237, 238, 239, 240 (do-not-invent-facts, blueprint language, executive positioning, final architecture summary, final quality control)

### B. Forward references

The following are defined in later parts and are referenced from Part I:

| Forward reference | Part | Section |
|---|---|---|
| Oversight Fabric | II | 9 |
| National Administrative Ontology | II | 10 |
| Smart Evidence Graph | II | 11 |
| Smart Dynamic Timeline | II | 12 |
| Temporal Intelligence | II | 13 |
| Investigation Time Machine | II | 14 |
| Administrative Process Digital Twin | III | 15 |
| Administrative Process Replay | III | 16 |
| "What Should Exist?" Engine | III | 17 |
| Evidence Gap Engine | II | 18 |
| Government Service Intelligence | III | 13 |
| Government Systems / Records Dependency Engine | III | 14 |
| Regulatory & Legal Intelligence | III | 15 |
| Investigation AI | III | 16 |
| Risk / Corruption Intelligence | III | 17 |
| Inspection & Field Operations | II | 18 |
| Financial / Procurement Intelligence | III | 19 |
| Inter-agency Coordination | III | 20 |
| Government Integration Fabric | III | 21 |
| Security / Zero Trust (full) | IV | 22 |
| AI Governance | III / IV | 23, 204 |
| Governance / Findings / Reform | IV | 24 |
| National Early Warning | III / IV | 25 |
| International Cooperation | III | 26 |
| Training / Simulation | IV | 27 |
| Analytics / Executive Command | IV | 28 |
| Disaster Recovery / Continuity | IV | 29 |
| Data Governance / Privacy (full) | IV | 30 |
| Compliance Mapping | IV | 31, 200 |
| Deployment Architecture (full) | IV | 32, 211, 212 |
| Implementation Roadmap | V | 33 |
| End-to-End ACA Use Cases | V | 34, 208, 209 |
| KPIs | V | 35 |
| Testing / Validation / Acceptance Criteria | V | 36 |
| Retention / Legal Hold | IV | 202 |
| Evidence Disposition | IV | 203 |
| AI Human-Authority Boundary | III / IV | 204 |
| Login Failure / Lockout | IV | 222 |
| Session Security | IV | 223 |
| Export Security | IV | 224 |
| Two-Person Authorization | IV | 194 |
| Audit Trail | IV | 195 |
| Evidence Access Audit | IV | 196 |
| Provenance Ledger | II | 197 |
| Data Conflict | II | 198 |
| Data Reliability | II | 199 |
| Jurisdiction / Policy Engine | IV | 201 |
| ACA Agent Profile | IV | 190 |
| Device-to-Agent Binding | IV | 191 |
| Case-Based Access | IV | 192 |
| Temporary Access | IV | 193 |
| Key Management | IV | 213 |
| Secret Management | IV | 214 |
| Security Error-Check | V | 215 |
| Blueprint Quality Rule | (this Part) | 216 |
| Requirements Traceability | V | 217 |
| Original Circle → ACA Impact Matrix | V | 218 |
| Data Classification Matrix | V | 219 |
| Deployment Options | IV | 211 |
| Separate ACA Data Plane | IV | 212 |

### C. Part I acceptance summary

Part I is considered complete when:

1. All 15 chapters are written and internally consistent.
2. All cross-references to Parts II–V are present and point to the correct section numbers.
3. The 16 separations (Chapter 2), the 14 identity components (Chapter 3), the 8 access dimensions (Chapter 4), the 11 zero-trust dimensions (Chapter 5), the 7 boundary rules (Chapter 6), the 24 navigation items (Chapter 10), the 22 case sub-tabs (Chapter 10), the 47 screens (Chapter 10), the 5 form factors (Chapter 11), the 13-stage field workflow (Chapter 11), the 23-stage investigation workflow (Chapter 11), the 11 institutional commercial categories (Chapter 12), and the 14 blueprint quality rules (Chapter 15) are all enumerated and acceptance-criteria-bound.
4. No fact is invented; all unverified integrations use the "Requires government authorization / technical discovery" marker (Chapter 15).
5. No real credentials, API URLs, certificates, or government endpoints appear; placeholders are used.
6. The proscribed phrasings (Chapter 15 §15.2.1) are absent; the preferred phrasings (§15.2.2) are used.
7. The AI human-authority boundary (Section 204) is restated wherever AI is discussed.
8. The final architecture diagram (Chapter 13) and the canonical positioning statement (Chapter 14) are present.

---

*End of Part I.*

# CIRCLE — Emergency Architecture, Service Routing & Referral Systems
## Part II of the Federated Sovereign Government Architecture

> **Scope of this Part.** Part II governs the way the CIRCLE platform routes a citizen's first words — *"I need help"* — into the correct institutional lane: an **emergency**, a **government service**, or a **potential integrity concern**. It defines how the platform integrates with Egypt's existing emergency, public-safety, customs, taxation, court, and digital-trust infrastructure without competing with any of it; how controlled referrals pass between sovereign institutions without creating a shared government case; how citizen reports may, under strict criteria, become a structured ACA Signal — but never automatically an ACA Case; and how the platform treats data freshness, conflicts, and external schema drift.
>
> **Sovereign stance.** Every chapter is written under the constraint that CIRCLE is operated by, and on behalf of, sovereign national institutions on sovereign infrastructure under sovereign law. The platform is a **routing, correlation, and referral layer** — never a competing dispatch system, never a competing system of record, never a competing government PKI, never a competing e-invoice platform, never a competing customs authority. Where this Part references specific Egyptian systems (ETA, NAFEZA, government complaints portals, civil-protection dispatch, police emergency lines, ambulance services, traffic authorities, court systems, law-enforcement databases), it does so as an **integration target**, not as a system to replace.
>
> **Non-negotiable rules.** Four rules govern this entire Part and may not be diluted by deployment pressure, partner demand, or product urgency:
>
> 1. **No fabricated dispatch.** The platform must never claim that an emergency was transmitted, acknowledged, or resolved when the authoritative responder has not confirmed it.
> 2. **No silent cross-institutional sharing.** A citizen submission does not become a shared government case. Each institution receives only what it is authorized to receive, in its own case namespace.
> 3. **No autonomous Signal-to-Case conversion.** An AI-generated ACA Signal is a reviewable intelligence object. Only the ACA, under its own institutional process, may convert a Signal into a formal Case.
> 4. **No replacement of existing sovereign systems.** CIRCLE integrates with existing Egyptian government infrastructure. It does not become the official e-invoice system, the official customs system, the official government PKI, the official emergency dispatch system, or the official court system.

---

## Table of Contents

| Chapter | Part | Title |
|---|---|---|
| 1 | XXI | Smart Citizen Routing |
| 2 | XXII | Emergency Path Must Not Be the ACA Path |
| 3 | XXIII | National Emergency Integration |
| 4 | XXIV | Emergency Fallback Hierarchy |
| 5 | XXV | Emergency Packet |
| 6 | XXVI | Emergency Status |
| 7 | XXVII | Silent Emergency |
| 8 | XXVIII | Citizen Safety |
| 9 | XXIX | Service Routing |
| 10 | XXX | Multi-Agency Referral |
| 11 | XXXI | No Shared Government Case by Default |
| 12 | XXXII | Institutional Case Separation |
| 13 | XXXIII | Inter-Agency Exchange Fabric |
| 14 | XXXIV | Information Request Object |
| 15 | XXXV | Inter-Agency Evidence Reuse |
| 16 | XXXVI | Government Referral Failure |
| 17 | XXXVII | Citizen Shield → ACA Signal |
| 18 | XXXVIII | ACA Signal ≠ ACA Case |
| 19 | XXXIX | Systemic Signal Detection |
| 20 | XL | Emergency / Service / Integrity Separation |
| 21 | XLI | Shared Citizen UX, Separate Institutional Back Office |
| 22 | XLII | Government Integration Should Be Adapter-Based |
| 23 | XLIII | Existing Egyptian Systems Are Not to Be Replaced |
| 24 | XLIV | ETA / E-Invoice Example |
| 25 | XLV | NAFEZA Example |
| 26 | XLVI | Digital Signature / PKI |
| 27 | XLVII | Government System of Record Registry |
| 28 | XLVIII | Data Freshness |
| 29 | XLIX | Data Conflict |
| 30 | L | Schema Change Sentinel |

### Appendices
- Appendix A — Emergency Fallback Hierarchy Reference Card
- Appendix B — CIRCLE Service Authority Graph Schema
- Appendix C — Information Request Object Schema
- Appendix D — ACA Signal Object Schema
- Appendix E — Government System of Record Registry Schema

---

## Chapter 1: Smart Citizen Routing (Part XXI)

### 1.1 Purpose

The first sentence a citizen types, speaks, or signals into CIRCLE — *"I need help"*, *"there's been an accident"*, *"my documents were refused"*, *"I think a public officer asked me for a bribe"* — must not require the citizen to know which of the dozens of sovereign institutions in Egypt has jurisdiction over their problem. Forcing a citizen in distress to identify the responsible agency before they can be helped is itself a failure of public service. Smart Citizen Routing is the platform layer that performs that identification on the citizen's behalf, classifies the request into one of three institutional lanes, and routes the request — and only the minimum necessary information — to the correct destination.

### 1.2 Three lanes

Every citizen submission is classified into exactly one of three primary lanes:

| Lane | Symbol | Meaning | Typical institutional destinations |
|---|---|---|---|
| **EMERGENCY** | `HELP` | Immediate danger to life, limb, property, public safety, or security requiring real-time intervention | Police, EMS / ambulance, Civil Protection, traffic / road-safety authority, public-safety operations centre |
| **GOVERNMENT SERVICE** | `SERVICE` | A non-emergency administrative or operational interaction with a government service — application, complaint, enquiry, status check, document issuance, payment, appointment | Ministry service windows, agencies, authorities, government complaints portal, sectoral service desks |
| **POTENTIAL INTEGRITY CONCERN** | `INTEGRITY` | A possible administrative, financial, or operational integrity concern that may warrant oversight review — without immediate emergency response | ACA (Administrative Control Authority) intake, sectoral oversight, internal audit of the receiving institution |

The classification is **triage**, not adjudication. Smart Citizen Routing does not determine whether an integrity concern is well-founded; it determines only whether the submission is shaped like an integrity concern and routes it accordingly. Determination of substance is performed by the receiving institution under its own process.

### 1.3 Routing decision flow

```
CITIZEN SUBMISSION ("I need help")
        │
        ▼
┌─────────────────────────────────────────┐
│  SMART CITIZEN ROUTING — TRIAGE ENGINE  │
│  (intent + context + safety classifier) │
└─────────────────────────────────────────┘
        │
        ├─► is_immediate_danger == TRUE  ─────► LANE: HELP
        │                                    (emergency path, Ch. 2–8)
        │
        ├─► is_service_interaction == TRUE ─► LANE: SERVICE
        │                                    (service routing, Ch. 9–16)
        │
        └─► is_possible_integrity_concern ──► LANE: INTEGRITY
             == TRUE                        (citizen shield → signal,
                                              Ch. 17–19)
        │
        ▼
  MINIMUM NECESSARY INFORMATION
  assembled per lane rules
        │
        ▼
  ROUTED TO AUTHORIZED DESTINATION(S)
  — emergency responder, OR
  — government service channel, OR
  — ACA intake / oversight
```

### 1.4 Triage inputs

The triage engine must consider, at minimum:

1. **Citizen free-text or voice input** — natural-language description of the problem.
2. **Structured citizen selections** — when the citizen uses a category picker, severity slider, or location tag.
3. **Device context** — location, motion, sensor hints (e.g., vehicle crash detected), with explicit citizen consent.
4. **Session context** — whether the citizen has an active case, an open service request, or a prior submission relevant to this one.
5. **Safety indicators** — keywords or signals suggesting immediate physical danger (fire, weapon, accident, collapse, medical distress).
6. **Institutional service graph** — the CIRCLE Service Authority Graph (Chapter 9) used to resolve service-lane requests to a specific service, institution, and department.

### 1.5 Routing authority and refusal

The triage engine may **route** a submission; it may not **refuse** a submission on substantive grounds. A submission that the engine cannot confidently classify must not be silently dropped. The fallback behavior for an unclassifiable submission is:

1. Present the citizen with a **clarifying question** to disambiguate the lane.
2. If the citizen cannot clarify, default to the **most conservative lane** consistent with safety — i.e., if there is any possibility of immediate danger, treat as `HELP` and proceed under the emergency path.
3. If no lane can be safely assigned, route to a **human review queue** with a guaranteed maximum response time, and provide the citizen with a tracking receipt.

### 1.6 Routing does not mean disclosure

Routing a submission to a lane does not authorize the platform to disclose the citizen's identity, location, or evidence to every institution in that lane. Lane selection determines the **default destination**. Disclosure is governed by the per-institution **Authority Matrix** (Part XVII of the parent blueprint) and the **minimum necessary information** rules of this Part.

### 1.7 Routing is reversible

A submission initially classified as `SERVICE` may, on further information from the citizen or the receiving institution, be reclassified as `HELP` (e.g., a service complaint that escalates to a safety incident) or `INTEGRITY` (e.g., a service interaction that reveals a possible integrity concern). Reclassification preserves the original submission record and adds a reclassification event with timestamp, actor, and reason.

### 1.8 Citizen-visible routing

The citizen must always be able to see, at minimum:

- The current lane of their submission.
- The destination institution(s) to which it has been routed.
- The status of delivery to each destination (transmitted / acknowledged / status unavailable / failed / fallback used — see Chapter 4).
- A tracking receipt that allows the citizen to return to the submission and check status without re-submitting.

---

## Chapter 2: Emergency Path Must Not Be the ACA Path (Part XXII)

### 2.1 Purpose

A central design rule of the CIRCLE federated architecture is that **the emergency response path and the integrity oversight path are not the same path**. A police emergency goes to the police. An ambulance emergency goes to EMS. A fire goes to Civil Protection. A traffic emergency goes to the traffic or emergency authority. None of these goes, by default, to the ACA. Conflating the two paths — for example, routing a real-time medical emergency into an administrative oversight workflow — would delay emergency response and pollute oversight intake with events that have nothing to do with integrity.

### 2.2 Emergency type → responder matrix

| Emergency type | Primary responder | Secondary / support | ACA? |
|---|---|---|---|
| Crime in progress / threat to person | Police | EMS if injured | No (default) |
| Medical emergency | EMS / ambulance | Police if scene unsafe | No (default) |
| Fire / collapse / rescue | Civil Protection | Police for cordon; EMS for casualties | No (default) |
| Road traffic accident | Traffic / road-safety authority | Police; EMS for casualties | No (default) |
| Hazardous material / environmental hazard | Civil Protection / environmental authority | Police; health authority | No (default) |
| Public-order disturbance | Police | Civil Protection if needed | No (default) |
| Critical infrastructure failure | Sectoral authority (electricity, water, gas, telecom) | Civil Protection if safety risk | No (default) |

The column "ACA?" is **No (default)** for every emergency type. Emergencies are routed to operational responders, not to the integrity oversight authority.

### 2.3 Separation flow

```
EMERGENCY EVENT (real-time)
        │
        ▼
┌─────────────────────────────────┐
│  EMERGENCY ROUTING              │
│  → POLICE / EMS /               │
│    CIVIL PROTECTION / TRAFFIC   │
│    / SECTORAL AUTHORITY         │
└─────────────────────────────────┘
        │
        ▼
   IMMEDIATE RESPONSE
   (real-time dispatch,
    on-scene action,
    status returned by responder)
        │
        │   ─── time passes ───
        │
        ▼
┌─────────────────────────────────┐
│  POST-INCIDENT REVIEW LAYER     │
│  (separate, optional, later)    │
│                                 │
│  If recurring / systemic /      │
│  integrity-bearing pattern ────┼──► ACA SIGNAL
│  is detected under Ch. 17–19    │    (structured intelligence object,
│                                 │     not the original emergency packet)
└─────────────────────────────────┘
```

### 2.4 Why the paths must not be merged

Merging emergency and integrity paths produces three predictable failures:

1. **Latency.** Integrity intake workflows are designed for considered review, not sub-minute response. Routing emergencies through them adds delay that may cost lives.
2. **Scope creep.** An integrity authority asked to triage every emergency will be overwhelmed by events outside its remit, degrading its capacity to investigate actual integrity concerns.
3. **Procedural confusion.** Evidence collected for emergency response (e.g., a 911-style call recording) is governed by emergency-response procedural law. Repurposing that evidence directly for an integrity investigation without proper referral, authorization, and chain-of-custody transformation risks procedural invalidation.

### 2.5 The only permitted bridge

The bridge between the emergency path and the integrity path is the **ACA Signal** mechanism described in Chapters 17–19. This bridge is:

- **Delayed** — only after the emergency is resolved or after sufficient recurrence has accumulated.
- **Authorized** — only where the law and the Authority Matrix permit the disclosure.
- **Structured** — the Signal is a curated intelligence object, not the raw emergency packet.
- **Discretionary** — the ACA decides whether to convert a Signal into a Case; the platform does not.

### 2.6 Hard rule

> An emergency event routed under Chapter 2 must never be delivered to ACA intake as if it were an integrity submission. The two paths are physically, procedurally, and contractually separate.

### 2.7 Exception handling

If an emergency event, during real-time response, appears to reveal a possible integrity concern (e.g., a citizen reports that an officer demanded a bribe to dispatch an ambulance), the platform must:

1. Continue the emergency response without interruption.
2. Open a **separate INTEGRITY lane submission** with its own submission ID, citing the emergency event by reference only.
3. Not share emergency-only evidence (e.g., real-time location, medical information) into the integrity lane without explicit authorization under the Authority Matrix.
4. Preserve the integrity submission separately for review under Chapters 17–19.

The two submissions — emergency and integrity — are linked by reference but remain two distinct records with two distinct destinations.

---

## Chapter 3: National Emergency Integration (Part XXIII)

### 3.1 Purpose

CIRCLE does not build a competing national emergency dispatch system. The sovereign Arab Republic of Egypt already operates emergency, public-safety, police, ambulance, fire / civil-protection, traffic, and related infrastructure. The platform's role is to integrate with this existing architecture through **adapters**, under sovereign authorization, so that a citizen's emergency submission on CIRCLE can be delivered to the correct sovereign emergency channel — not to substitute for it.

### 3.2 Integration target inventory

The platform must be capable of integrating, where authorized, with each of the following categories of sovereign emergency infrastructure. The list is **descriptive of capability**, not a claim that any specific system has been connected or that any specific API exists:

| # | Integration target | Typical domain | Adapter capability required |
|---|---|---|---|
| 1 | National emergency services (single-number emergency) | Public-safety intake | Structured submission, callback, status return |
| 2 | Police operations / dispatch | Law-enforcement | Incident packet, location, callback, status return |
| 3 | Ambulance / EMS dispatch | Medical emergency | Medical incident packet, location, callback, status return |
| 4 | Fire / Civil Protection dispatch | Fire, rescue, structural | Incident packet, hazards, access, callback, status return |
| 5 | Traffic / road-safety authority | Road traffic incidents | Accident packet, location, vehicles, callback, status return |
| 6 | Public-safety operations centres | Multi-agency coordination | Multi-target packet, status aggregation |
| 7 | Sectoral operations centres (electricity, water, gas, telecom) | Critical infrastructure failure | Outage packet, location, callback, status return |

### 3.3 Verification before activation

No integration target may be marked as active until the platform has verified, and recorded, the following:

1. **Existence** — that the sovereign system exists and is operational.
2. **Authorization** — that the institution operating it has authorized CIRCLE integration, with the legal / administrative basis recorded in the Authority Matrix.
3. **Integration mechanism** — the actual integration method used (direct API, alternative digital channel, SMS / data, telephone fallback, offline queue — see Chapter 4).
4. **Authentication** — the credentials, certificates, or trust mechanism used.
5. **Schema** — the message format agreed with the receiving authority.
6. **Status return** — whether the receiving authority returns status, and in what form.
7. **Test pass** — that the connector has passed sandbox certification (Part LII / LIII of the parent blueprint).

### 3.4 Hard rule on API claims

> The platform must never claim that an API exists for a sovereign emergency system without explicit verification, recorded in the System of Record Registry (Chapter 27). Marketing material, partner briefings, and citizen-facing text must reflect only verified integration status.

### 3.5 Fallback when direct integration is unavailable

Where direct API integration is unavailable — whether for technical, administrative, security, or policy reasons — the platform must support approved fallback mechanisms per Chapter 4. The fallback used must be disclosed to the citizen, recorded in the submission provenance, and reflected in any status returned to the citizen.

### 3.6 Adapter design principles

Emergency adapters must be designed to:

1. **Fail safe.** If an adapter cannot deliver, the submission is preserved locally, the citizen is notified, and the fallback hierarchy is invoked.
2. **Be replaceable.** Adapters are pluggable; a new integration method for the same target does not require platform re-architecture.
3. **Be observable.** Every adapter invocation is logged with timestamp, request payload summary, response status, and identifier of the operator or process invoking it.
4. **Be testable in isolation.** Each adapter can be exercised in a sandbox environment against a synthetic sovereign system before being promoted to production.
5. **Be revocable.** An adapter can be suspended or revoked by the sovereign operator at any time; suspension must not silently drop in-flight submissions.

### 3.7 Anti-displacement rule

The platform's emergency integration must not:

- Replace the sovereign emergency number or its operators.
- Re-route an emergency to a non-sovereign destination.
- Modify the operational decisions of the sovereign emergency system.
- Withhold emergency information from the sovereign responder.
- Cause the citizen to believe that CIRCLE itself is dispatching the response.

Citizen-facing text must be unambiguous: the platform routes the submission to the sovereign authority; the sovereign authority dispatches the response.

---

## Chapter 4: Emergency Fallback Hierarchy (Part XXIV)

### 4.1 Purpose

Electronic integration fails. Networks go down. Sovereign systems undergo maintenance. Authentication expires. When integration with an emergency target fails, the platform must not silently swallow the failure or fabricate successful dispatch. It must invoke a **fallback hierarchy** that attempts progressively more robust — but progressively lower-fidelity — delivery mechanisms, and it must clearly indicate to the citizen which delivery state was achieved.

### 4.2 The fallback hierarchy

The fallback hierarchy, in strict order of preference, is:

| Tier | Mechanism | Description | When used |
|---|---|---|---|
| 1 | **Approved digital government channel** | A direct, authorized API or digital service integration with the sovereign target system | First attempt, when integration is healthy |
| 2 | **Approved alternative digital mechanism** | An authorized alternative digital channel (e.g., government service bus, message broker, official webhook, alternative government portal) | When tier 1 is degraded or unavailable |
| 3 | **Approved SMS / data method** | A structured SMS or low-bandwidth data submission to an authorized receiving number or short code, with a structured payload format | When tiers 1–2 are unavailable and SMS/data is operationally viable |
| 4 | **Official telephone fallback** | An automated or assisted telephone call to the official emergency number, with the submission converted to a structured voice message or read by an operator-assisted service | When digital channels are unavailable or unviable |
| 5 | **Offline queue / record** | A locally preserved record with full provenance, queued for delivery when any higher tier becomes available, with explicit "pending delivery" status shown to the citizen | When all real-time tiers have failed; submission preserved for retry |

### 4.3 Delivery status indicators

For every emergency submission, the platform must indicate, at every moment, exactly one of the following delivery states:

| State | Symbol | Meaning |
|---|---|---|
| **Transmitted** | `TX` | Submission was successfully delivered to the target system or fallback channel |
| **Acknowledged** | `ACK` | The target system returned an explicit acknowledgement of receipt |
| **Status unavailable** | `UNAVAIL` | Submission was transmitted but no status was returned by the target; the platform cannot claim acknowledgement |
| **Failed** | `FAIL` | Submission could not be delivered through any tier; preserved in offline queue |
| **Fallback used** | `FBK` | A non-primary tier was used; the specific tier and reason are recorded |

A submission may move between states over time (e.g., `FBK` → `ACK` when a queued offline submission is later acknowledged).

### 4.4 Anti-fabrication rule

> The platform must never display `TX`, `ACK`, or any specific responder status (Chapter 6) that has not actually been returned by the authoritative responder or achieved by a verified fallback tier. A status that has not been confirmed is displayed as `UNAVAIL` or `FAIL`, never as a success state.

### 4.5 Fallback decision flow

```
EMERGENCY SUBMISSION READY
        │
        ▼
[ Tier 1: approved digital government channel ]
        │
   ├─► TX/ACK ────────────► DELIVERED → status monitoring (Ch. 6)
   │
   └─► FAIL / UNAVAIL
        │
        ▼
[ Tier 2: approved alternative digital mechanism ]
        │
   ├─► TX/ACK ────────────► DELIVERED (flag: FBK-tier-2)
   │
   └─► FAIL / UNAVAIL
        │
        ▼
[ Tier 3: approved SMS / data method ]
        │
   ├─► TX/ACK ────────────► DELIVERED (flag: FBK-tier-3)
   │
   └─► FAIL / UNAVAIL
        │
        ▼
[ Tier 4: official telephone fallback ]
        │
   ├─► TX/ACK ────────────► DELIVERED (flag: FBK-tier-4)
   │
   └─► FAIL / UNAVAIL
        │
        ▼
[ Tier 5: offline queue / record ]
        │
        ▼
   PENDING DELIVERY (status: FAIL-pending-retry)
   notify citizen, preserve provenance,
   schedule retry on tier recovery
```

### 4.6 Provenance requirements

Every tier transition and every state change must be recorded in the submission's provenance chain with:

- Timestamp (sovereign time service).
- Tier attempted.
- Mechanism used (channel identifier).
- Response received (or absence of response).
- Operator or process invoking the attempt.
- Reason for tier downgrade (if applicable).

Provenance is immutable once written and is auditable by the citizen, the receiving institution, and the sovereign oversight authority.

### 4.7 Citizen notification

The citizen must be notified, in real time where operationally possible, of:

- The current tier being attempted.
- Any tier downgrade.
- The current delivery state.
- Any fallback used and why.
- The expected retry schedule if all tiers have failed.

Notifications must be honest. A citizen waiting on an emergency submission must not be told "your report has been received by police" if the platform has only queued it offline.

### 4.8 Retry policy

Submissions that reach tier 5 (offline queue) must be retried according to a configurable retry policy that:

- Honours any operational priority assigned by the receiving authority.
- Does not silently retry beyond a configured maximum.
- Escalates to a human operator if all configured retries fail.
- Preserves the original submission timestamp for the receiving authority's SLA calculations.

---

## Chapter 5: Emergency Packet (Part XXV)

### 5.1 Purpose

When an emergency submission is delivered to a sovereign responder, the platform must assemble an **Emergency Packet** — a structured set of fields that gives the responder the information necessary to act, while disclosing only the **minimum information necessary** for the specific emergency type.

### 5.2 Packet fields

Where authorized by the receiving authority and the Authority Matrix, the Emergency Packet may include the following fields:

| # | Field | Description | Authorization required? |
|---|---|---|---|
| 1 | `incident_type` | Categorical type of emergency (medical, fire, crime, traffic, hazard, infrastructure) | Yes |
| 2 | `location` | Geographic coordinates of the incident | Yes |
| 3 | `gps_accuracy` | Accuracy estimate of the location, in metres | Yes |
| 4 | `address` | Civic address, where derivable from location or provided by citizen | Yes |
| 5 | `route_access` | Access notes — entry route, gate, floor, obstacles, landmarks | Yes |
| 6 | `persons_affected` | Estimated number of persons affected or at risk | Yes |
| 7 | `hazards` | Identified hazards (fire, smoke, weapon, chemical, structural, electrical) | Yes |
| 8 | `citizen_description` | Description of the reporting citizen (only where needed for responder safety or callback) | Yes, strictly minimized |
| 9 | `media` | Authorized media (photo, short video, audio) where operationally useful and consented | Yes |
| 10 | `callback` | Callback channel (phone, VoIP, in-app messaging) with consent | Yes |

### 5.3 Minimum necessary information

For every emergency submission, the platform must determine the **minimum necessary information** for the specific emergency type and responder, and disclose only that minimum. The minimum is determined by:

1. The responder's stated requirements (where the responder has published a schema or requirements).
2. The emergency type (e.g., a fire response needs `hazards` and `route_access`; a medical response needs `persons_affected` and any medical context the citizen has volunteered).
3. The Authority Matrix (which fields the responder is authorized to receive).
4. Citizen consent (for any field requiring consent under law or policy).

Fields not in the minimum set are **not** included in the packet, even if the platform holds them.

### 5.4 Packet construction flow

```
EMERGENCY SUBMISSION
        │
        ▼
┌──────────────────────────────────┐
│  DETERMINE MINIMUM NECESSARY SET │
│  (responder schema ∩ authority  │
│   matrix ∩ citizen consent)      │
└──────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│  ASSEMBLE EMERGENCY PACKET       │
│  - include only authorized fields│
│  - redact fields below threshold │
│  - sign packet (sovereign PKI)   │
│  - attach provenance             │
└──────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│  DELIVER VIA FALLBACK HIERARCHY  │
│  (Chapter 4)                     │
└──────────────────────────────────┘
```

### 5.5 Field-level authorization

Each field in the Emergency Packet is subject to field-level authorization. A responder authorized to receive `location` is not, by that fact alone, authorized to receive `media` or `citizen_description`. The Authority Matrix must specify, per responder and per emergency type, the authorized field set. The platform must refuse to include unauthorized fields even if it holds them.

### 5.6 Citizen consent and disclosure

For fields requiring citizen consent — typically `media`, `citizen_description`, and `callback` — the platform must obtain explicit, recorded consent before inclusion. Where the citizen declines consent, the field is omitted and the responder is informed that the field was available but consent was withheld.

### 5.7 Media handling

Where `media` is included:

- The media must be captured under citizen safety rules (Chapter 8).
- The media must be hashed and signed at the point of capture.
- The media must be transmitted in a form that preserves its provenance chain.
- The responder's permitted use of the media is governed by the responder's stated terms and the Authority Matrix; the platform does not authorize the responder's downstream use beyond delivery.

### 5.8 Redaction and minimization

The platform must apply automatic redaction or minimization to fields that could be over-disclosing:

- `citizen_description` should not include government identity numbers unless operationally required.
- `media` should be the shortest operationally useful segment.
- `address` should not include apartment or unit number unless required for access.
- `callback` should be a single authorized channel, not a full contact dossier.

### 5.9 Packet retention

The Emergency Packet, once assembled, is retained by the platform as part of the submission's provenance. Retention is governed by the platform's data retention policy and the sovereign authority's requirements. The platform must not retain fields beyond the authorized retention period, and must not reuse emergency packet data for any purpose other than the emergency for which it was assembled, absent further authorization.

---

## Chapter 6: Emergency Status (Part XXVI)

### 6.1 Purpose

Once an emergency submission has been delivered, the citizen and the platform need to know its operational status. The platform must display the **status returned by the authoritative responder** — not statuses invented by the platform to fill gaps.

### 6.2 Allowed status values

The following are **examples** of status values that an authoritative responder may return. They are not guaranteed; they are illustrative of what a sovereign emergency system *might* return:

| Status | Symbol | Meaning |
|---|---|---|
| Submitted | `SUBMITTED` | Responder has the submission in its intake queue |
| Received | `RECEIVED` | Responder has logged the submission in its operational system |
| Acknowledged | `ACK` | Responder has confirmed receipt to the platform |
| Dispatched | `DISPATCHED` | Response resource has been assigned and dispatched |
| En route | `EN_ROUTE` | Response resource is travelling to the incident |
| On scene | `ON_SCENE` | Response resource has arrived at the incident |
| Resolved | `RESOLVED` | Responder considers the incident closed |

### 6.3 Anti-invention rule

> The platform must not display any status value that has not actually been returned by the authoritative responder for the specific submission. If the responder does not return a status, the platform must display `STATUS_UNAVAILABLE` — not a fabricated status.

This rule applies even where the platform can infer, from indirect signals (e.g., a responder vehicle's GPS), that the response is en route. Inference is not authority. Inferred status may be displayed to the citizen as supplementary information — clearly labelled as inferred — but must not be presented as the responder's official status.

### 6.4 Status mapping

Where a responder returns status in its own terminology or schema, the platform must maintain a **status mapping table** that translates the responder's status to a CIRCLE display value. The mapping must:

- Be approved by the responder.
- Not lose information (e.g., if the responder returns `dispatched_car_42`, the platform may display `DISPATCHED` but must retain the original `dispatched_car_42` in provenance).
- Not invent new statuses.

### 6.5 Unknown status handling

If a responder returns a status value that the platform does not recognize, the platform must:

1. Display the raw status verbatim, with a "platform does not have an official mapping for this status" notice.
2. Record the unknown status in provenance.
3. Notify the integration operations team to update the mapping.
4. Not silently coerce the unknown status into a familiar value.

### 6.6 Status history

The platform must maintain a complete status history for every emergency submission, including:

- The timestamp of each status change.
- The source of each status (responder API, fallback channel, inferred).
- The mapping applied, if any.
- Any operator intervention.

Status history is part of the submission's provenance and is auditable.

### 6.7 Status display matrix

| Responder returns | Platform displays to citizen |
|---|---|
| `ACK` | "Acknowledged by {responder} at {time}" |
| `DISPATCHED` | "Dispatched by {responder} at {time}" |
| `EN_ROUTE` | "Response en route, per {responder}, at {time}" |
| `ON_SCENE` | "Response on scene, per {responder}, at {time}" |
| `RESOLVED` | "Incident resolved, per {responder}, at {time}" |
| (no response) | "Status unavailable — submission delivered at {time}; awaiting responder status" |
| (unknown value) | "{responder} returned: {raw_value}. Platform has no official mapping." |

---

## Chapter 7: Silent Emergency (Part XXVII)

### 7.1 Purpose

In some circumstances, a citizen cannot safely hold a voice conversation with an emergency operator — for example, during a home invasion, in a situation of domestic violence, or while hiding from an active threat. Where the receiving authority **legally and technically supports** silent emergency submission, CIRCLE must allow a citizen to transmit structured emergency information without voice.

### 7.2 Capability verification

Silent emergency functionality is **not guaranteed** by the platform. It depends entirely on whether the receiving sovereign authority has the technical and legal capacity to accept and act on a non-voice emergency submission. Before offering silent emergency to a citizen, the platform must verify:

1. **Technical capacity** — that the receiving authority can accept a structured data submission and act on it without a voice call.
2. **Legal authority** — that the legal framework permits silent emergency submission in the citizen's jurisdiction and situation.
3. **Operational protocol** — that the receiving authority has an operational protocol for handling silent submissions (e.g., a triage desk for silent submissions, an escalation path if the submission is unclear).

Where any of these conditions cannot be verified, the platform must **not** offer silent emergency for that responder, and must instead direct the citizen to the standard emergency path.

### 7.3 Silent emergency flow

```
CITIZEN INVOKES SILENT EMERGENCY
        │
        ▼
┌──────────────────────────────────┐
│  VERIFY CAPABILITY FOR RESPONDER │
│  (technical + legal + protocol) │
└──────────────────────────────────┘
        │
   ├─► SUPPORTED
   │      │
   │      ▼
   │   ASSEMBLE MINIMUM PACKET (Ch. 5)
   │      │
   │      ▼
   │   TRANSMIT VIA AUTHORIZED SILENT CHANNEL
   │      │
   │      ▼
   │   STATUS MONITORING (Ch. 6)
   │
   └─► NOT SUPPORTED
          │
          ▼
       INFORM CITIZEN:
       "Silent emergency not supported by {responder}.
        Voice channel required."
          │
          ▼
       OFFER OFFICIAL TELEPHONE FALLBACK (Ch. 4 tier 4)
       OR SAFE-EVIDENCE MODE (Ch. 8)
```

### 7.4 Structured silent submission

Where silent emergency is supported, the submission must be **structured** — not free-form text alone. The structure must, at minimum, allow the responder to determine:

- Type of emergency (from a constrained set agreed with the responder).
- Location (mandatory where derivable).
- Number of persons at risk.
- Whether the citizen can be called back (with binary consent flag).
- Any specific threat indicators (weapon, fire, medical) the citizen has selected.

### 7.5 Disclosure to citizen

The platform must disclose to the citizen, before silent submission:

1. Whether silent emergency is supported for the selected responder.
2. Whether the responder will be able to act on a silent submission alone.
3. The fallback path if silent submission does not produce a response.
4. That silent submission does not guarantee a faster response than voice where voice is feasible and safe.

### 7.6 Anti-guarantee rule

> The platform must not advertise or imply that silent emergency is universally available, universally supported by every responder, or guaranteed to produce a response. Silent emergency is a conditional capability, available only where the receiving authority has verified technical and legal support.

### 7.7 Safety of the silent path

The silent path must not, by its design, create new risks to the citizen. Specifically:

- The path must not generate audible notifications on the citizen's device during submission.
- The path must not display bright or attention-drawing UI on the citizen's device during submission.
- The path must allow the citizen to abort submission without leaving a visible trace on the device lock screen.
- The path must, where the device supports it, use the device's silent / vibrate-only mode during submission.

### 7.8 Callback discipline

Where the citizen has consented to callback, the responder's callback discipline must be respected. If the responder has agreed not to call back in silent-emergency situations (e.g., to avoid alerting a perpetrator), the platform must enforce that constraint and not surface callback contact information to the responder beyond what was agreed.

---

## Chapter 8: Citizen Safety (Part XXVIII)

### 8.1 Purpose

CIRCLE must never encourage a citizen to endanger themselves to gather evidence. A citizen reporting a fire is not a firefighter. A citizen reporting a crime in progress is not a police officer. A citizen reporting a hazardous situation is not a hazardous-materials specialist. The platform's role is to enable safe reporting and to route the report to the right authority — not to solicit evidence collection that puts the citizen at risk.

### 8.2 Safety guidance before recording

Before the citizen records any event that the platform identifies as potentially dangerous — fire, weapon, structural collapse, chemical presence, violence in progress, natural disaster, or any event where the platform's safety classifier returns an elevated risk score — the platform must display appropriate safety guidance. The guidance must, at minimum, communicate:

1. **Do not approach the danger.** Stay at a safe distance.
2. **Do not attempt to intervene.** Reporting is not response.
3. **If you are in immediate danger, prioritize your safety over recording.**
4. **Recording is optional.** A report without media is still a report.
5. **You may stop recording at any time.**

### 8.3 SAFE-EVIDENCE MODE

The platform provides a dedicated **SAFE-EVIDENCE MODE** for reporting from a safe distance. SAFE-EVIDENCE MODE is designed to:

- Capture only what is captureable from the citizen's current safe location.
- Avoid prompting the citizen to move closer, climb, enter, or approach.
- Limit recording duration to the minimum necessary.
- Apply automatic stabilization, zoom limits, and exposure limits to reduce the citizen's need to manipulate the device in unsafe ways.
- Sign and hash the captured media at the point of capture, preserving provenance.
- Refuse to capture media if the device sensors indicate the citizen is in motion toward the danger (e.g., accelerometer indicates running toward a fire).

### 8.4 Safe-evidence flow

```
CITIZEN INITIATES RECORDING OF DANGEROUS EVENT
        │
        ▼
┌──────────────────────────────────┐
│  DISPLAY SAFETY GUIDANCE          │
│  (full-screen, must acknowledge)  │
└──────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│  ENTER SAFE-EVIDENCE MODE         │
│  - locked to current safe location│
│  - zoom limited                   │
│  - duration limited               │
│  - device-motion safety guard on │
└──────────────────────────────────┘
        │
        ▼
CAPTURE (only from safe distance)
        │
        ▼
SIGN + HASH + PROVENANCE (at capture)
        │
        ▼
ATTACH TO EMERGENCY PACKET (Ch. 5)
```

### 8.5 Anti-encouragement rules

The platform's UX, copy, and AI assistants must not:

- Suggest that the citizen should approach, enter, or interfere with a dangerous scene.
- Gamify evidence collection (no leaderboards, badges, or rewards for "more" or "better" evidence of dangerous events).
- Use language implying that a citizen who does not record an event has failed.
- Pre-fill or recommend recording in contexts where the citizen has not initiated it.
- Nudge the citizen to extend a recording beyond the safe duration.

### 8.6 Risk-aware routing

When the platform detects that a citizen is reporting from within or near a dangerous event, the routing under Chapter 1 must prioritize the emergency lane, regardless of the citizen's stated intent. A citizen who types *"I want to report a service problem"* while device sensors indicate they are inside a burning building must be routed to the emergency lane, not to the service lane. The platform may inform the citizen of this routing and allow them to override only if they explicitly confirm they are not in danger.

### 8.7 Safety classifier

The platform must maintain a safety classifier that, given the citizen's input, device context, and event type, returns a risk score. The risk score governs:

- Whether safety guidance is displayed before recording.
- Whether SAFE-EVIDENCE MODE is enforced.
- Whether the routing defaults to the emergency lane.
- Whether silent emergency is offered (if the risk score indicates that voice is unsafe).

The classifier is a sovereign implementation and its weights, thresholds, and decision boundaries are governed by the sovereign operator.

### 8.8 Citizen overrides

A citizen may, with explicit confirmation, override a safety-driven routing or SAFE-EVIDENCE MODE restriction. The override is recorded in provenance with the citizen's confirmation. The platform must not, however, allow an override that would fabricate a status (Chapter 6) or fabricate a dispatch (Chapter 4).

### 8.9 Post-event citizen welfare

After an emergency submission, the platform may offer the citizen welfare resources — medical, psychological, or legal — appropriate to the event type. Welfare resources are sovereign-approved and are not a substitute for the emergency response itself.

---

## Chapter 9: Service Routing (Part XXIX)

### 9.1 Purpose

For submissions in the `SERVICE` lane — non-emergency government service interactions — the platform must route the citizen's problem to the correct service, institution, department, official channel, and SLA, with a defined escalation path. This routing is performed by the **CIRCLE Service Authority Graph** — a structured map of government service authority.

### 9.2 The CIRCLE Service Authority Graph

The Service Authority Graph is a directed graph in which a node represents a service authority unit, and edges represent routing relationships. The canonical node structure is:

```
Problem
  │
  ▼
Service
  │
  ▼
Institution
  │
  ▼
Department
  │
  ▼
Official Channel
  │
  ▼
SLA
  │
  ▼
Escalation
```

### 9.3 Node field schema

| Node | Field | Description |
|---|---|---|
| Problem | `problem_id`, `description`, `category`, `keywords` | The citizen's stated problem in canonical form |
| Service | `service_id`, `name`, `description`, `service_type` | The government service that addresses the problem |
| Institution | `institution_id`, `name`, `short_name`, `jurisdiction` | The sovereign institution responsible for the service |
| Department | `department_id`, `name`, `contact`, `operating_hours` | The specific department within the institution |
| Official Channel | `channel_id`, `channel_type`, `endpoint`, `auth_method` | The authorized channel for submitting to this service (per Chapter 22 adapters) |
| SLA | `sla_id`, `target_response`, `target_resolution`, `escalation_triggers` | The service-level agreement applicable to the service |
| Escalation | `escalation_id`, `next_department`, `next_institution`, `trigger_condition` | The escalation path when SLA is at risk or breached |

### 9.4 Graph traversal

When a citizen submits a service-lane request, the routing engine traverses the Service Authority Graph to resolve the submission to a specific (Problem, Service, Institution, Department, Official Channel, SLA, Escalation) tuple. The traversal may produce more than one candidate tuple; the engine must rank candidates by:

1. **Match score** between the citizen's input and the Problem node.
2. **Citizen location** (institutional jurisdiction may be geographic).
3. **Citizen context** (existing cases, prior submissions, registered identity attributes).
4. **Service availability** (operating hours, channel health per Chapter 4 / 23).
5. **Authority Matrix** authorization for the citizen to receive the service.

### 9.5 Convenience layer, not government replacement

The Service Authority Graph is a **citizen convenience layer**. It does not replace any sovereign institution's authority, workflow, case management system, or decision-making. Specifically:

- Routing a submission through the graph does not constitute a decision by CIRCLE on the merit of the submission.
- The graph's `Official Channel` node points to the sovereign institution's authorized channel; submission still occurs through that channel.
- The graph's `SLA` node reflects the institution's published SLA; CIRCLE does not impose SLAs on institutions.
- The graph's `Escalation` node reflects the institution's published escalation path; CIRCLE does not redefine escalation authority.

### 9.6 Graph maintenance

The Service Authority Graph must be maintained by the sovereign operator in collaboration with the sovereign institutions. Updates must:

- Be sourced from the institution that owns the node (the institution defines its own services, departments, channels, SLAs, and escalation paths).
- Be versioned with effective dates.
- Be reflected in the System of Record Registry (Chapter 27).
- Be reviewable by the institution at any time.

The platform must not unilaterally invent services, departments, channels, SLAs, or escalation paths for an institution.

### 9.7 Graph coverage and gaps

Where the Service Authority Graph does not contain a node matching the citizen's submission, the platform must:

1. Inform the citizen that an exact match was not found.
2. Offer the closest candidate tuples.
3. Allow the citizen to choose a destination or to escalate to a human routing review.
4. Preserve the submission and route to a human routing queue if no destination is selected.

The platform must not silently route to a default institution for which the citizen's problem is not actually in scope.

### 9.8 Routing receipt

For every service-lane submission, the citizen must receive a routing receipt containing:

- The submission ID.
- The (Problem, Service, Institution, Department, Official Channel) tuple selected.
- The SLA summary.
- The escalation path summary.
- The current delivery status (per Chapter 4 status taxonomy).
- A tracking reference to check status without re-submitting.

---

## Chapter 10: Multi-Agency Referral (Part XXX)

### 10.1 Purpose

A citizen who has reported a problem that touches multiple institutions — for example, a traffic accident that requires police, ambulance, and traffic authority response, or a service complaint that requires both the service institution and a sectoral regulator — should not have to repeat the same story to each authority. CIRCLE enables **controlled referrals** between authorities, while preserving each authority's separate record, separate authorization scope, and separate workflow.

### 10.2 Controlled referral definition

A **controlled referral** is a structured transfer of authorized information from one authority to another, in which:

1. The originating authority (Authority A) determines that another authority (Authority B) has a legitimate interest in the matter.
2. Authority A identifies the specific information authorized for disclosure to Authority B under the Authority Matrix.
3. Authority B receives only the authorized information, in its own case namespace, with its own case ID.
4. Authority B's workflow is independent; Authority A cannot direct Authority B's handling.
5. The referral is logged in both authorities' provenance chains.

### 10.3 Referral flow

```
CITIZEN SUBMISSION
        │
        ▼
AUTHORITY A (intake)
   - creates Authority A case
   - receives authorized information
   - identifies legitimate interest of Authority B
        │
        ▼
CONTROLLED REFERRAL
   - Authority A → Authority B
   - authorized fields only
   - signed by Authority A
   - recorded in Authority A provenance
        │
        ▼
AUTHORITY B (intake)
   - creates Authority B case (separate ID)
   - receives authorized information
   - independent workflow
   - records referral provenance
        │
        ▼
BIDIRECTIONAL STATUS (optional, where authorized)
   - status notifications between A and B
   - case reference (Ch. 12)
   - no shared case record
```

### 10.4 No story repetition

The platform's UX must be designed so that a citizen does not need to re-enter information already provided to Authority A when interacting with Authority B. Specifically:

- Where Authority B has been referred the citizen's submission context, the citizen-facing interface for Authority B may pre-populate fields from the referred data, with the citizen's confirmation.
- The citizen may add additional information specific to Authority B's remit.
- The citizen may redact or decline to share any referred field with Authority B, where the citizen's consent is required for that field.

### 10.5 Authority A retains its own record

Authority A's record is not modified by the referral. Authority A retains:

- The original submission, with original fields, timestamps, and provenance.
- A record of the referral (what was disclosed, to whom, when, under what authority).
- Its own case workflow and status.

### 10.6 Authority B receives only authorized information

Authority B does not receive Authority A's full case file. Authority B receives:

- The specific fields authorized for disclosure under the Authority Matrix.
- The referral metadata (referring authority, referral timestamp, referral authority basis).
- A reference to Authority A's case (per Chapter 12 institutional case separation), without access to Authority A's full case content.

### 10.7 Authority B maintains its own workflow

Authority B's handling of the referred matter is independent. Authority B may:

- Open its own case under its own institutional case management process.
- Assign its own case priority, owner, and workflow.
- Request additional information from Authority A through the Inter-Agency Exchange Fabric (Chapter 13), under a new Information Request (Chapter 14).
- Close its case independently of Authority A's case.

Authority B may not, however, modify Authority A's case or direct Authority A's workflow.

### 10.8 Referral authorization basis

Every controlled referral must record:

- The legal or administrative basis for the referral.
- The specific fields authorized for disclosure.
- The referring officer or process.
- The receiving institution and case ID.
- The referral timestamp.

This record is part of both authorities' provenance chains and is auditable.

---

## Chapter 11: No Shared Government Case by Default (Part XXXI)

### 11.1 Purpose

A foundational rule of the CIRCLE federated architecture is that **there is no shared government case by default**. A citizen submission does not become a single case visible to every government institution. Instead, the citizen submission spawns separate referral records, each of which becomes an institution-specific case, linked — where appropriate — by a neutral correlation or reference ID.

### 11.2 Anti-shared-case rule

> The platform must not, by default, make one Circle case visible to every government institution. A citizen submission creates separate referral records; each institution receives only the authorized information and creates its own case under its own process.

### 11.3 Submission-to-case flow

```
CITIZEN SUBMISSION (submission_id: S-001)
        │
        ▼
┌──────────────────────────────────┐
│  CIRCLE INTAKE (routing layer)   │
│  - classifies lane (Ch. 1)       │
│  - determines destinations       │
│  - assigns neutral correlation   │
│    ID: CORR-2024-0001            │
└──────────────────────────────────┘
        │
   ┌────┴─────┬──────────┬──────────┐
   ▼          ▼          ▼          ▼
REFERRAL   REFERRAL   REFERRAL   REFERRAL
R-001      R-002      R-003      R-004
(to Inst.A)(to Inst.B)(to Inst.C)(to Inst.D)
   │          │          │          │
   ▼          ▼          ▼          ▼
Inst.A     Inst.B     Inst.C     Inst.D
case       case       case       case
A-001      B-001      C-001      D-001
   │          │          │          │
   └────┬─────┴────┬─────┴──────────┘
        │          │
        ▼          ▼
   CORR-2024-0001 (neutral reference;
   not a case; visible only to platform
   routing layer + authorized audit)
```

### 11.4 Neutral correlation ID

The neutral correlation ID is a platform-level identifier that:

- Links the referrals derived from a single citizen submission.
- Is **not** itself a case.
- Is **not** visible to institutions by default.
- May be disclosed to an institution only under explicit authorization (e.g., for audit, for cross-institutional review under a tribunal or oversight body).
- Allows the platform to correlate referrals for the citizen's tracking, for systemic signal detection (Chapter 19), and for audit purposes — without exposing institutions to each other's case content.

### 11.5 Institution-specific cases

Each institution that receives a referral creates its own case under its own case management system, with its own case ID, its own case file, and its own workflow. The institution's case is the institution's record; the platform does not own it, modify it, or substitute for it.

### 11.6 What the citizen sees

The citizen sees a single submission with a single submission ID and a single tracking receipt (Chapter 1). The citizen may see, per referral, the receiving institution and the delivery status. The citizen does not see the internal case IDs of the receiving institutions unless those institutions choose to surface them through the platform.

### 11.7 Authorized case correlation

Where two or more institutions have legitimate operational need to know that they are each handling referrals from the same citizen submission, the platform may — under explicit authorization from each institution — surface the neutral correlation ID to those institutions. This enables them to coordinate where appropriate, without sharing case content. The authorization is recorded in the Authority Matrix.

### 11.8 Audit access

The sovereign oversight authority (e.g., ACA under its institutional mandate, or a designated audit body) may, under due process, access the neutral correlation ID and the referral graph for audit purposes. Audit access does not grant access to institution case content; it grants access to the platform's referral topology and provenance.

### 11.9 Prohibition

The platform must not, under any product or partner pressure:

- Make a citizen submission a single shared case across institutions.
- Disclose one institution's case content to another institution absent explicit authorization.
- Use the neutral correlation ID as a backdoor to bypass institutional separation.
- Allow an institution to query another institution's case by correlation ID alone.

---

## Chapter 12: Institutional Case Separation (Part XXXII)

### 12.1 Purpose

Two institutions handling related aspects of the same underlying matter — for example, the Police handling a criminal aspect and the ACA handling an administrative integrity aspect of the same incident — must each retain their own case. The two cases are **related but distinct**: they are linked by an authorized referral, not merged into a single case.

### 12.2 Two-case rule

> A Police case and an ACA case that arise from the same underlying matter remain **two different cases**. They are linked, where authorized, by a controlled referral relationship; they are not merged.

### 12.3 Controlled relationship model

```
POLICE CASE (P-001)
   - owned by: Police
   - scope: criminal aspect
   - workflow: Police criminal procedure
   - records: Police case file
        │
        │  (authorized referral;
        │   signed by Police;
        │   recorded in both
        │   provenance chains)
        ▼
AUTHORIZED REFERRAL (REF-P-A-0001)
   - referring: Police (P-001)
   - receiving: ACA
   - authorized fields: per Authority Matrix
   - legal/admin basis: recorded
   - timestamp: recorded
        │
        ▼
ACA CASE (A-001)
   - owned by: ACA
   - scope: administrative integrity aspect
   - workflow: ACA institutional process
   - records: ACA case file
```

### 12.4 Relationship characteristics

| Characteristic | Police Case P-001 | ACA Case A-001 |
|---|---|---|
| Owner | Police | ACA |
| Case ID namespace | Police | ACA |
| Case file | Police case management system | ACA case management system |
| Workflow | Police criminal procedure | ACA institutional process |
| Authorized viewers | Police-authorized actors | ACA-authorized actors |
| Status | Police-defined | ACA-defined |
| Closure | Police decision | ACA decision |
| Linked to | ACA Case A-001 via REF-P-A-0001 | Police Case P-001 via REF-P-A-0001 |

### 12.5 What the referral carries

The authorized referral between two institutional cases carries **only** the information authorized for cross-institutional disclosure:

- Specific fields from the referring case (e.g., incident summary, time, location, citizen identity where authorized).
- Referral metadata (referring institution, referring case ID, referring officer or process, legal basis).
- A reference to the referring case (so the receiving institution can request additional information through Chapter 14 if needed).

The referral does **not** carry:

- The referring institution's full case file.
- Information the referring institution is not authorized to disclose.
- The receiving institution's authorization to view the referring case directly.

### 12.6 Bidirectional updates

Where authorized, the referral relationship may support bidirectional status notifications (Chapter 13) — e.g., the Police case may notify the ACA case when the criminal aspect is closed; the ACA case may notify the Police case when the administrative aspect is closed. These notifications carry only status, not case content.

### 12.7 Independence preserved

Each institution's case-handling decisions remain its own:

- The Police may close P-001 without closing A-001.
- The ACA may close A-001 without closing P-001.
- The Police may not direct the ACA's handling of A-001.
- The ACA may not direct the Police's handling of P-001.

The referral enables coordination; it does not enable command.

### 12.8 Audit trail

The referral relationship is fully auditable:

- The referring institution's provenance records the referral.
- The receiving institution's provenance records the receipt.
- The platform records the referral in its routing provenance.
- All three records are immutable once written.

---

## Chapter 13: Inter-Agency Exchange Fabric (Part XXXIII)

### 13.1 Purpose

Beyond the basic referral mechanism of Chapter 10, the platform provides a **Controlled Inter-Agency Exchange Fabric** — a set of structured capabilities through which sovereign institutions may exchange authorized information in a governed, auditable manner. Each capability is a discrete, authorized interaction type, with its own schema, authorization, and provenance.

### 13.2 Capability catalog

| # | Capability | Symbol | Description |
|---|---|---|---|
| 1 | Referral | `REF` | One institution refers a matter, with authorized information, to another |
| 2 | Information request | `IREQ` | One institution requests specific information from another |
| 3 | Evidence request | `EREQ` | One institution requests specific evidence (documents, recordings, data) from another |
| 4 | Evidence response | `ERESP` | An institution responds to an evidence request with authorized evidence |
| 5 | Case reference | `CREF` | One institution cites another's case by reference, without disclosure of content |
| 6 | Status notification | `STAT` | One institution notifies another of a status change in its case |
| 7 | Official document transfer | `ODOC` | Transfer of an official document between institutions |
| 8 | Secure message | `SMSG` | A secure, signed inter-institutional message |
| 9 | Deadline | `DDL` | Communication of a deadline imposed by one institution on another (where legally authorized) |
| 10 | Acknowledgement | `ACK` | Acknowledgement of receipt of any of the above |

### 13.3 Exchange fabric topology

```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  INSTITUTION A │  │  INSTITUTION B │  │  INSTITUTION C │
│  (sovereign)   │  │  (sovereign)   │  │  (sovereign)   │
└───────┬────────┘  └───────┬────────┘  └───────┬────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│       CIRCLE INTER-AGENCY EXCHANGE FABRIC                │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐    │
│  │ REF │ IREQ│ EREQ│ ERESP│CREF │ STAT│ ODOC│ SMSG│    │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘    │
│  ┌─────────┬─────────┐                                  │
│  │   DDL   │   ACK   │                                  │
│  └─────────┴─────────┘                                  │
│                                                          │
│  Every exchange:                                         │
│   - signed by sending institution                        │
│   - authorized by Authority Matrix                       │
│   - logged in immutable provenance                        │
│   - subject to per-capability schema                     │
└─────────────────────────────────────────────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
   (delivered to each receiving institution's
    authorized intake endpoint, in its own
    case namespace, under its own workflow)
```

### 13.4 Per-capability authorization

Each capability requires explicit authorization in the Authority Matrix:

- Which institutions may invoke the capability.
- Which fields may be exchanged under the capability.
- Under what legal or administrative basis.
- With what confidentiality and retention constraints.
- With what export restrictions.

A capability not authorized for an institution-institution pair may not be invoked.

### 13.5 Exchange schema

Every exchange object carries, at minimum:

- `exchange_id` — unique identifier.
- `capability` — one of the 10 capabilities above.
- `from_institution` — sending institution.
- `to_institution` — receiving institution.
- `from_case` — sending institution's case ID (where applicable).
- `to_case` — receiving institution's case ID (where one exists or is being created).
- `legal_basis` — legal or administrative authority for the exchange.
- `payload` — capability-specific payload.
- `signature` — sending institution's cryptographic signature.
- `timestamp` — sovereign time service timestamp.

### 13.6 Acknowledgement discipline

Every exchange — except an `ACK` itself — must be acknowledged by the receiving institution within a configured window. If acknowledgement is not received, the sending institution is notified, and the exchange is recorded as `ACK_OVERDUE` in the Integration Control Tower (Part LI of the parent blueprint).

### 13.7 Anti-bypass

Institutions may not use the Exchange Fabric to bypass their own institutional authorization. An institution that is not authorized to disclose a field to another institution may not do so through the Exchange Fabric. The Authority Matrix governs every exchange; the Fabric is the conduit, not the authorization.

### 13.8 Audit

Every exchange is fully auditable by:

- The sending institution (its own outbound exchanges).
- The receiving institution (its own inbound exchanges).
- The sovereign oversight authority under due process.
- The platform's audit plane.

Exchanges are immutable once written; corrections are made by new exchanges (e.g., a corrective `SMSG` referencing the prior exchange), not by editing history.

---

## Chapter 14: Information Request Object (Part XXXIV)

### 14.1 Purpose

When one institution needs specific information held by another institution, it issues an **Information Request Object** through the Exchange Fabric. The Information Request is a structured object that specifies exactly what is being requested, under what authority, for what purpose, with what deadline, and under what confidentiality, retention, and export constraints.

### 14.2 Information Request schema

| # | Field | Description |
|---|---|---|
| 1 | `request_id` | Unique identifier for the request |
| 2 | `requesting_institution` | Institution issuing the request |
| 3 | `receiving_institution` | Institution from which information is requested |
| 4 | `case` | Requesting institution's case ID (where applicable) |
| 5 | `purpose` | Specific purpose for which the information is requested |
| 6 | `requested_records` | Specific records requested (record type, identifiers, date range) |
| 7 | `legal_administrative_authority` | Legal or administrative basis for the request |
| 8 | `deadline` | Date and time by which a response is requested |
| 9 | `confidentiality` | Confidentiality classification of the request and any response |
| 10 | `retention` | How long the receiving institution should retain the request and any response |
| 11 | `export_restriction` | Whether the response may be exported outside the receiving jurisdiction or institution |
| 12 | `response` | The response, when provided (record type, payload, signature, timestamp) |

### 14.3 Mandatory fields

Fields 1–11 are mandatory on issuance. Field 12 (`response`) is populated when the receiving institution responds. A request without fields 1–11 must be rejected by the Exchange Fabric as malformed.

### 14.4 Purpose specificity

The `purpose` field must be specific. Generic purposes such as *"general review"* or *"investigation"* are insufficient. The platform may require the requesting institution to select from a constrained purpose taxonomy maintained by the sovereign operator, with free-text elaboration permitted but not in lieu of a constrained purpose.

### 14.5 Legal or administrative authority

The `legal_administrative_authority` field must cite the specific legal provision, regulation, executive decision, or administrative instrument under which the request is made. A request without a cited authority may be refused by the receiving institution and must be flagged by the platform as `AUTHORITY_UNSPECIFIED`.

### 14.6 Deadline

The `deadline` field must be reasonable and consistent with the receiving institution's operational capacity. The platform may enforce maximum-deadline windows for specific request types to prevent indefinite information holds. A deadline that has passed without response is surfaced in the Integration Control Tower as `OVERDUE_INFORMATION_REQUEST`.

### 14.7 Confidentiality, retention, export restriction

These three fields govern the downstream handling of any response:

- `confidentiality` — the classification level of the response (e.g., restricted, confidential, secret) under the receiving institution's classification scheme.
- `retention` — the period for which the requesting institution may retain the response; beyond which the response must be deleted or returned.
- `export_restriction` — whether the response may be exported outside the requesting institution's jurisdiction or shared with third parties.

### 14.8 Response

The `response` field, when populated, contains:

- `response_records` — the records provided.
- `response_signature` — the receiving institution's signature.
- `response_timestamp` — sovereign time service timestamp.
- `response_notes` — any clarifying notes (e.g., partial response, redactions applied, refusal with legal basis).

A response may be partial; the receiving institution is not obligated to provide every requested record if some are not authorized for disclosure.

### 14.9 Refusal

A receiving institution may refuse an Information Request, in whole or in part. A refusal must cite the legal or administrative basis for refusal (e.g., the requested records are not authorized for disclosure to the requesting institution under the Authority Matrix; or the request lacks a sufficient purpose). The refusal is recorded as a response with a refusal payload.

### 14.10 Provenance

Every Information Request and its response are part of the Inter-Agency Exchange Fabric's immutable provenance. Requests and responses are auditable by both institutions and by the sovereign oversight authority under due process.

---

## Chapter 15: Inter-Agency Evidence Reuse (Part XXXV)

### 15.1 Purpose

A record legally obtained by one institution — for example, a signed contract held by a taxation authority, or an inspection report held by a sectoral regulator — may be relevant to another institution's authorized case. Rather than producing uncontrolled duplicate copies of such records across institutions, the platform enables **reference + authorization**: a second institution may reference the first institution's record under explicit authorization, without copying the underlying data.

### 15.2 Reference + Authorization model

```
INSTITUTION A (record owner)
   - holds Record R-001 (legally obtained)
   - record has provenance, signature, retention
        │
        │  INSTITUTION B (with authorized case)
        │  identifies R-001 as relevant
        │  requests reference under Ch. 14
        ▼
AUTHORIZED REFERENCE (REF-EV-0001)
   - referencing institution: B
   - record owner: A
   - authorized access: read-only
   - legal basis: recorded
   - expiry: recorded
   - watermark / access log: yes
        │
        ▼
INSTITUTION B's case cites R-001 by reference
   - B does not copy R-001
   - B accesses R-001 under reference terms
   - every access logged in A's provenance
   - B may not re-share R-001 absent new authorization
```

### 15.3 Anti-duplication rule

> A record legally obtained by one institution may be referenced by another authorized case without uncontrolled copying. The platform uses **reference + authorization**, not unrestricted duplicate copies.

This rule serves three purposes:

1. **Provenance preservation.** A record's provenance is intact when there is one authoritative copy; duplicates risk provenance drift.
2. **Confidentiality.** The owner institution retains control of access, watermarking, and revocation.
3. **Retention discipline.** The owner institution's retention policy governs the underlying record; the referencing institution's retention policy governs only its reference, not the record itself.

### 15.4 Reference record schema

A reference record contains:

| Field | Description |
|---|---|
| `reference_id` | Unique identifier for the reference |
| `record_owner` | Institution owning the underlying record |
| `record_id` | Identifier of the underlying record at the owner |
| `record_type` | Type of record (contract, report, recording, data set) |
| `referencing_institution` | Institution referencing the record |
| `referencing_case` | The case in which the reference is made |
| `legal_basis` | Legal or administrative basis for the reference |
| `access_terms` | Read-only, time-bound, watermarking, access log |
| `expiry` | When the reference expires |
| `access_log` | Every access to the underlying record under this reference |

### 15.5 Authorization

A reference requires authorization under the Authority Matrix:

- The owning institution must be authorized to disclose the record type to the referencing institution.
- The referencing institution must be authorized to receive the record type for the cited purpose.
- The reference must specify a constrained purpose, a constrained duration, and a constrained access mode (read-only; no redistribution).

### 15.6 Access logging

Every access to a referenced record is logged in the owning institution's provenance:

- Which referencing institution accessed it.
- Which case and which actor.
- When the access occurred.
- What view was rendered (full record, redacted view, summary).

The owning institution may revoke a reference at any time, in which case subsequent access by the referencing institution is denied and the revocation is recorded.

### 15.7 No redistribution

A referencing institution may not redistribute the referenced record to a third institution. A third institution wishing to access the record must obtain its own authorization and its own reference from the owning institution.

### 15.8 When duplication is justified

Where duplication is operationally justified — for example, where the referencing institution must operate offline, or where the record must be presented in a proceeding that requires a certified copy — the platform may permit a **controlled duplicate**, signed by the owning institution, with explicit provenance linking the duplicate to the original. Controlled duplication is the exception, not the default; reference is the default.

---

## Chapter 16: Government Referral Failure (Part XXXVI)

### 16.1 Purpose

A referral to a government institution may fail — the destination institution's intake is unavailable, the official channel is degraded, the integration adapter is in error, or the institution has not acknowledged receipt within the configured window. When a referral fails, the platform must **never silently drop the report**. It must preserve the submission, identify a fallback official channel, record the failure, notify the citizen, and allow retry.

### 16.2 Failure handling pipeline

```
REFERRAL DISPATCHED TO INSTITUTION
        │
        ▼
┌──────────────────────────────────┐
│  DELIVERY ATTEMPT                │
│  (per fallback hierarchy, Ch. 4)│
└──────────────────────────────────┘
        │
   ├─► SUCCESS (TX/ACK)
   │      → status monitoring
   │
   └─► FAILURE (FAIL / UNAVAIL)
          │
          ▼
       ┌─────────────────────────────┐
       │  FAILURE HANDLING PIPELINE  │
       │                             │
       │  1. PRESERVE the submission │
       │     (immutable, signed)     │
       │  2. IDENTIFY fallback       │
       │     official channel        │
       │  3. RECORD failure          │
       │     (timestamp, tier, err)  │
       │  4. NOTIFY citizen          │
       │     (per Ch. 4 §4.7)        │
       │  5. ALLOW retry             │
       │  6. MAINTAIN provenance     │
       └─────────────────────────────┘
          │
          ▼
       FALLBACK DISPATCH
       (or pending retry queue)
```

### 16.3 Submission preservation

The original submission is preserved immutably, with:

- Original submission content and metadata.
- Original submission timestamp.
- Signature (sovereign PKI).
- All delivery attempts and their outcomes.
- All failure records.

The submission is preserved even if all fallback tiers fail; it remains in the offline queue (Chapter 4 tier 5) until retry succeeds or until the retention period elapses.

### 16.4 Fallback official channel identification

When a referral fails, the platform identifies the next available fallback official channel for the destination institution, per the fallback hierarchy of Chapter 4. The identification considers:

- The institution's published channels (per the Service Authority Graph, Chapter 9).
- The health of each channel (per the Integration Control Tower).
- The Authority Matrix's authorization for each channel.

### 16.5 Failure recording

Each failure is recorded with:

- The submission ID and referral ID.
- The destination institution.
- The channel attempted.
- The tier attempted (Chapter 4).
- The error returned (or absence of response).
- The timestamp.
- The retry schedule.

Failures are immutable once recorded and are part of the referral's provenance.

### 16.6 Citizen notification

The citizen is notified of:

- The fact of the failure (without exposing internal system details beyond what is operationally useful).
- The fallback being attempted.
- The expected retry schedule.
- The platform's commitment to preservation (so the citizen knows their report is not lost).
- A tracking reference to check status.

### 16.7 Retry policy

Retries are scheduled per Chapter 4 §4.8. The citizen may, where operationally appropriate, manually trigger an early retry. The platform may also offer the citizen an alternative destination institution if the original destination remains unavailable beyond a configured threshold.

### 16.8 Provenance maintenance

Provenance is maintained across all failure handling:

- Original submission provenance.
- Each delivery attempt.
- Each failure.
- Each fallback.
- Each retry.
- Final outcome (success, continued failure, citizen withdrawal).

The complete provenance chain is auditable by the citizen, the destination institution, and the sovereign oversight authority.

### 16.9 Anti-drop rule

> The platform must never silently drop a report. A submission that cannot be delivered is preserved, the failure is recorded, the citizen is notified, and a retry path is defined. The submission remains in the platform's custody until either successful delivery or the citizen's explicit withdrawal.

### 16.10 Withdrawal

A citizen may explicitly withdraw a submission that has not been delivered. Withdrawal is recorded with timestamp and citizen confirmation. Withdrawal does not erase the submission's provenance (which is retained for audit), but it ends the active retry path.

---

## Chapter 17: Citizen Shield → ACA Signal (Part XXXVII)

### 17.1 Purpose

The Citizen Shield is the public-facing civic interface (Part XX of the parent blueprint). Through the Citizen Shield, citizens may report concerns that may, in some cases, indicate possible administrative, financial, or operational integrity issues. However, **not every citizen report goes to the ACA**. The platform must not flood ACA intake with every citizen submission. Instead, where authorized and where criteria are met, the platform may generate a structured **ACA Signal** — an intelligence object that the ACA may review to decide whether to open a formal case.

### 17.2 ACA Signal definition

An **ACA Signal** is a structured intelligence object, generated by the platform under configured criteria, that communicates to the ACA the existence of a possible integrity concern worthy of review. A Signal is **not** a case. A Signal does **not** assert that wrongdoing has occurred. A Signal is a reviewable intelligence object.

### 17.3 Signal content

Where authorized, an ACA Signal may contain only appropriate information, such as:

| # | Field | Description |
|---|---|---|
| 1 | `pattern` | The pattern observed (e.g., repeated service refusal at a specific facility) |
| 2 | `source_count` | Number of independent citizen submissions contributing to the Signal |
| 3 | `service` | The government service or services involved |
| 4 | `geography` | The geographic scope (facility, district, region) |
| 5 | `timeframe` | The time window over which the pattern was observed |
| 6 | `evidence_availability` | Whether evidence is held by the platform (without disclosing the evidence itself, absent separate authorization) |
| 7 | `repeated_failures` | Number and nature of repeated failures contributing to the pattern |
| 8 | `potential_integrity_indicators` | Specific indicators that may suggest an integrity concern (e.g., repeated demand for informal payment at a specific service window) |
| 9 | `reason_for_referral` | Plain-language statement of why the Signal is being referred to the ACA |

### 17.4 What a Signal does not contain

A Signal does **not** contain:

- Citizen identity unless the citizen has explicitly consented to identification.
- Raw evidence (e.g., recordings, documents) unless the ACA has been separately authorized to receive it.
- Conclusions of wrongdoing.
- A directive to the ACA to open a case.

### 17.5 Signal generation criteria

A Signal is generated only when configured criteria are met. Criteria may include:

- A minimum `source_count` (a Signal is not generated from a single uncorroborated submission, unless the submission is of sufficient gravity on its own).
- A minimum `pattern` consistency (the submissions contributing to the Signal must exhibit a consistent pattern).
- A minimum `timeframe` (the pattern must persist over a defined window).
- A threshold on `potential_integrity_indicators` (the indicators must meet a configured gravity threshold).
- Authorization in the Authority Matrix for Signal generation for the relevant service and geography.

Criteria are configured by the sovereign operator and may be reviewed by the ACA.

### 17.6 Signal routing

A Signal is routed to the ACA's authorized intake through the Inter-Agency Exchange Fabric (Chapter 13), as a capability invocation authorized for Signal delivery. The Signal is signed by the platform's sovereign operator key and includes provenance.

### 17.7 ACA discretion

The ACA receives the Signal and decides, under its own institutional process, whether to:

- Open a formal case.
- Request additional information through Chapter 14.
- Decline to open a case (with recorded reason).
- Hold the Signal for monitoring (without opening a case).

The platform does not direct the ACA's decision.

### 17.8 Anti-flooding

The platform must not generate Signals at a volume or frequency that overwhelms ACA intake. Signal generation is bounded by:

- Per-service, per-geography rate limits.
- A minimum interval between Signals on the same pattern.
- Deduplication (a new submission that matches an existing open Signal's pattern updates that Signal rather than creating a new one, where appropriate).

### 17.9 Citizen transparency

Where a citizen submission contributes to a Signal, the platform may, where authorized and where citizen safety permits, inform the citizen that their submission is being considered as part of a pattern review. The platform does not disclose the ACA's review status or any case that may or may not result.

### 17.10 Anti-retaliation

The platform must take reasonable measures to protect citizens whose submissions contribute to Signals from retaliation. This includes:

- Minimum-disclosure in the Signal itself (no citizen identity absent consent).
- Anonymization or pseudonymization of source submissions in the Signal.
- Restricting ACA access to underlying citizen identity absent separate due-process authorization.

---

## Chapter 18: ACA Signal ≠ ACA Case (Part XXXVIII)

### 18.1 Purpose

A foundational distinction in the CIRCLE architecture is the difference between an **ACA Signal** and an **ACA Case**. A Signal is a possible issue requiring review. A Case is a formal ACA institutional matter created under ACA process. AI must not autonomously convert every Signal into a formal Case.

### 18.2 Comparison

| Aspect | ACA Signal | ACA Case |
|---|---|---|
| What it is | A structured intelligence object indicating a possible integrity concern | A formal ACA institutional matter under ACA process |
| Who creates it | Platform, under configured criteria, where authorized | ACA, under its own institutional process |
| What it asserts | A pattern or indicator exists that may warrant review | A formal matter has been opened for institutional action |
| Procedural status | Pre-institutional | Institutional |
| Visibility | ACA intake and authorized ACA reviewers | ACA case file, ACA-authorized actors |
| Outcome | ACA decides whether to open a Case, request more info, decline, or hold | ACA investigation, findings, recommendations, reforms |
| AI autonomy | AI may assist in Signal generation under human-configured criteria | AI must not autonomously convert a Signal into a Case |

### 18.3 AI autonomy boundary

> AI must not autonomously convert every Signal into a formal Case. The Signal-to-Case conversion is a human, institutional decision by the ACA, under ACA process.

This boundary is non-negotiable. AI may:

- Detect patterns and propose Signals (under human-configured criteria).
- Assist ACA reviewers in evaluating Signals.
- Suggest that a Signal may warrant Case opening.

AI may not:

- Autonomously open a Case.
- Autonomously communicate Case-opening to citizens, institutions, or third parties.
- Use a Signal as the basis for direct action against an institution or individual.

### 18.4 Signal-to-Case conversion flow

```
ACA SIGNAL (generated under Ch. 17)
        │
        ▼
┌──────────────────────────────────┐
│  ACA INTAKE REVIEW               │
│  - human reviewer                │
│  - reviews Signal                │
│  - may request more info (Ch.14) │
│  - may decline (with reason)     │
│  - may hold for monitoring        │
└──────────────────────────────────┘
        │
   ├─► DECLINE  ─► Signal closed (recorded)
   │
   ├─► HOLD     ─► Signal held; further monitoring
   │
   └─► OPEN CASE
          │
          ▼
       ACA CASE (formal, under ACA process)
          │
          ▼
       Investigation, findings, recommendations
       (per parent blueprint Part IV)
```

### 18.5 Hard rule

> The platform, and any AI operating within the platform, must not represent a Signal as a Case. Citizen-facing, institution-facing, and oversight-facing communications must use the correct term: a Signal is a Signal; a Case is a Case. The two must not be conflated.

### 18.6 Audit

Signal-to-Case conversions are auditable:

- The Signal that led to the Case is referenced in the Case's provenance.
- The ACA reviewer who decided to open the Case is recorded.
- The reason for opening (or declining) is recorded.
- The decision timestamp is recorded.

Audit access is governed by the ACA's own institutional process and by the sovereign oversight authority under due process.

### 18.7 AI's permitted role

AI may assist the ACA reviewer by:

- Summarizing the Signal and its contributing submissions.
- Identifying related Signals or Cases.
- Suggesting investigative avenues (per parent blueprint Part IV Chapter 33 — Investigator Second Brain).
- Flagging procedural requirements.

AI may not substitute for the human reviewer's decision to open or decline a Case.

---

## Chapter 19: Systemic Signal Detection (Part XXXIX)

### 19.1 Purpose

Beyond individual Signals, the platform may detect **systemic** patterns — clusters of citizen reports across different government services that may indicate a systemic administrative issue. For example, repeated service failures at one government facility, across multiple citizens, across multiple services, may indicate a systemic administrative issue at that facility warranting ACA review.

### 19.2 Clustering

The platform maintains a systemic signal detection layer that clusters citizen submissions by:

- **Geography** — facility, district, region.
- **Service** — government service or services involved.
- **Pattern** — the nature of the reported issue.
- **Timeframe** — the window over which the pattern persists.
- **Severity** — the operational impact of the reported issues.

Clustering is performed under human-configured criteria and is subject to the same anti-flooding and minimum-discipline rules as individual Signals (Chapter 17).

### 19.3 Example

> A government facility in District X receives, over a 60-day window, 47 citizen reports across three services (civil documentation, licensing, and permit issuance) describing a consistent pattern: citizen is told the official system is "down," citizen is directed to an "expeditor" who offers faster processing for an informal fee. No single report is dispositive, but the clustering across services, citizens, and time, combined with the consistency of the pattern, indicates a possible systemic administrative issue.

### 19.4 Systemic Signal generation

When clustering meets configured criteria, the platform may generate a **Systemic Signal** — an ACA Signal (Chapter 17) whose `pattern` field describes the systemic pattern, whose `source_count` reflects the number of contributing submissions across services, and whose `potential_integrity_indicators` describe the systemic indicators observed.

### 19.5 ACA discretion (unchanged)

The ACA's discretion (Chapter 17 §17.7) applies unchanged. A Systemic Signal does not become a Case autonomously; the ACA decides whether to open a Case, request more information, decline, or hold for monitoring.

### 19.6 Configuration

Systemic signal detection criteria are configured by the sovereign operator in collaboration with the ACA. Criteria include:

- Minimum cluster size (number of submissions).
- Minimum cluster consistency (pattern similarity).
- Minimum cluster persistence (timeframe).
- Minimum cluster gravity (severity threshold).
- Per-service, per-geography rate limits.

Criteria are reviewable by the ACA and by the sovereign oversight authority.

### 19.7 Anti-discrimination

Systemic signal detection must not produce Signals that discriminate against institutions, services, or geographies on the basis of criteria unrelated to operational performance. Detection criteria must be operationally grounded and must be reviewed for bias by the sovereign operator.

### 19.8 Citizen privacy

Systemic Signal detection operates on submission metadata and patterns, not on citizen identity. Citizens contributing to a cluster are not identified in the Systemic Signal unless they have separately consented and the ACA has been separately authorized to receive their identity.

### 19.9 Provenance

Every Systemic Signal's provenance includes:

- The list of contributing submissions (by submission ID, not citizen identity).
- The clustering algorithm version and parameters.
- The configured criteria in effect at the time of clustering.
- The reviewer or process that authorized Signal generation.

Provenance is auditable by the ACA and the sovereign oversight authority.

### 19.10 Feedback loop

When the ACA opens a Case based on a Systemic Signal, the platform may, where authorized, receive feedback on the Case's eventual outcome (without disclosing ACA case content) to refine future clustering criteria. Feedback is governed by the Authority Matrix and the ACA's institutional process.

---

## Chapter 20: Emergency / Service / Integrity Separation (Part XL)

### 20.1 Purpose

The platform exposes three distinct public pathways: **HELP** (emergency), **SERVICE** (government service), and **INTEGRITY** (oversight concern). The three are connected by CIRCLE — a citizen's submission may move between them under reclassification (Chapter 1 §1.7) — but they have distinct institutional destinations, distinct operational protocols, and distinct procedural frameworks.

### 20.2 Three pathways

| Pathway | Symbol | Citizen intent | Institutional destination |
|---|---|---|---|
| **HELP** | `HELP` | Immediate danger to life, limb, property, public safety | Emergency responders: Police, EMS, Civil Protection, traffic, sectoral operations |
| **SERVICE** | `SERVICE` | Non-emergency government service interaction | Ministry / agency service windows, government complaints, sectoral service desks |
| **INTEGRITY** | `INTEGRITY` | Possible administrative, financial, or operational integrity concern | ACA intake (via Signal, Ch. 17–19) or sectoral oversight |

### 20.3 Pathway separation flow

```
                 ┌──────────────────────────┐
                 │   CITIZEN SUBMISSION     │
                 │   ("I need help")        │
                 └────────────┬─────────────┘
                              │
                              ▼
                 ┌──────────────────────────┐
                 │   SMART CITIZEN ROUTING  │
                 │   (triage, Ch. 1)        │
                 └────────────┬─────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐           ┌─────────┐           ┌───────────┐
   │  HELP   │           │ SERVICE │           │ INTEGRITY │
   │ ( emerg)│           │ (svc)   │           │ (oversight)│
   └────┬────┘           └────┬────┘           └─────┬─────┘
        │                     │                     │
        ▼                     ▼                     ▼
   POLICE / EMS         MINISTRY /          ACA SIGNAL
   / CIVIL PROT /        AGENCY /           (structured
   TRAFFIC /             COMPLAINTS         intelligence
   SECTORAL OPS          DESK                object, Ch. 17)
        │                     │                     │
        │                     │                     ▼
        │                     │              ACA REVIEW
        │                     │              (Ch. 18 — human
        │                     │               decides whether
        │                     │               to open Case)
        │                     │                     │
        ▼                     ▼                     ▼
   REAL-TIME             SERVICE              ACA CASE
   RESPONSE              WORKFLOW             (if opened)
```

### 20.4 Connection without merger

The three pathways are connected by CIRCLE — a citizen's submission may be reclassified between them (Chapter 1 §1.7), and a single underlying matter may produce submissions in multiple pathways (Chapter 2 §2.7). But the pathways remain institutionally distinct:

- A `HELP` submission does not become an ACA Case by virtue of being routed through CIRCLE.
- A `SERVICE` submission does not become a Police matter by virtue of being routed through CIRCLE.
- An `INTEGRITY` submission does not trigger emergency response by virtue of being routed through CIRCLE.

### 20.5 Distinct destinations

Each pathway has distinct institutional destinations, distinct procedural frameworks, and distinct SLAs. The platform's routing respects these distinctions; it does not blur them.

### 20.6 Distinct UX affordances

The citizen-facing UX presents three distinct affordances:

- An emergency button or gesture (clearly labelled, prominently available).
- A service request flow (clearly labelled as non-emergency).
- An integrity reporting flow (clearly labelled as oversight, not emergency).

The three affordances must not be conflated in the UI; a citizen must not, by UI design, accidentally submit an integrity report when they meant to request emergency help, or vice versa.

### 20.7 Safety defaults

Where the citizen's input is ambiguous between `HELP` and another pathway, the platform defaults to `HELP` (Chapter 1 §1.5). Where the citizen's input is ambiguous between `SERVICE` and `INTEGRITY`, the platform may clarify with the citizen; absent clarification, it routes to `SERVICE` (the lower-risk default) with the option for the citizen to reclassify.

---

## Chapter 21: Shared Citizen UX, Separate Institutional Back Office (Part XLI)

### 21.1 Purpose

A central CIRCLE differentiator is the separation of the citizen experience from the institutional back office. The citizen experiences **ONE SIMPLE CIRCLE** — a single, accessible, coherent interface for help, service, and integrity. The government experiences **MANY SOVEREIGN SYSTEMS** — each institution retains its own case management, its own workflow, its own authority, its own data, and its own procedural framework.

### 21.2 The separation

```
┌─────────────────────────────────────────────────────┐
│                    CITIZEN UX                       │
│                                                     │
│         ONE SIMPLE CIRCLE                           │
│  (single interface, single submission flow,         │
│   single tracking receipt, single identity,         │
│   single notification stream)                        │
│                                                     │
└───────────────────────┬─────────────────────────────┘
                        │
                        │  (controlled routing,
                        │   per Ch. 1–3, 9–16)
                        │
   ┌────────────────────┼────────────────────┐
   │                    │                    │
   ▼                    ▼                    ▼
┌──────────┐     ┌──────────┐         ┌──────────┐
│ INSTIT. A│     │ INSTIT. B│         │ INSTIT. C│
│ sovereign│     │ sovereign│         │ sovereign│
│ system   │     │ system   │         │ system   │
│          │     │          │         │          │
│ own case │     │ own case │         │ own case │
│ own wkflw│     │ own wkflw│         │ own wkflw│
│ own data │     │ own data │         │ own data │
│ own auth │     │ own auth │         │ own auth │
└──────────┘     └──────────┘         └──────────┘
```

### 21.3 Citizen experience

The citizen experiences CIRCLE as:

- A single entry point for help, service, and integrity.
- A single submission flow, regardless of the destination institution.
- A single tracking receipt, regardless of how many institutions are involved.
- A single notification stream, surfacing status from all involved institutions.
- A single identity, with the citizen's consent controlling disclosure to each institution.

The citizen does not need to know which institution is responsible for which problem; the platform routes on their behalf (Chapter 1).

### 21.4 Government experience

Each sovereign institution experiences CIRCLE as:

- A set of authorized inbound channels (per the Service Authority Graph, Chapter 9).
- A set of authorized referrals (per Chapter 10) and exchanges (per Chapter 13).
- A set of authorized information requests (per Chapter 14) and references (per Chapter 15).
- Its own case namespace, with its own case IDs and case files.
- Its own workflow, with its own decisions and procedures.
- Its own authority, with its own authorization matrix entries.
- Its own data, retained on its own infrastructure under its own retention policy.

The platform does not unify the back office. The platform unifies the front office.

### 21.5 Differentiator

This separation is a central CIRCLE differentiator. Competing approaches tend to either:

- **Unify the back office**, which requires institutions to surrender their systems and workflows — politically and operationally infeasible for sovereign institutions.
- **Unify the front office only at the cost of citizen confusion**, requiring the citizen to navigate each institution's interface separately.

CIRCLE's approach — **shared citizen UX, separate institutional back office** — gives citizens a single coherent experience while preserving institutional sovereignty. This is the differentiator: the citizen gets simplicity; the institutions get sovereignty.

### 21.6 Implications for design

This separation has design implications throughout the platform:

- The citizen identity model must support multiple institutional identities linked to a single citizen-facing identity, with consent controlling the linkage.
- The submission model must support a single citizen submission spawning multiple institutional referrals (Chapter 11).
- The status model must aggregate per-institution status into a single citizen-facing view (Chapter 6).
- The notification model must deliver a single coherent notification stream from multiple institutional sources.
- The audit model must allow per-institution audit alongside platform-level audit.

### 21.7 Anti-conflation rule

> The platform must not, in any citizen-facing communication, imply that it is the institution. The platform routes, refers, and correlates; the institution decides, acts, and owns the case. Citizen-facing text must distinguish "CIRCLE has routed your submission to {institution}" from "{institution} has acknowledged your submission."

### 21.8 Operational integrity

The separation preserves operational integrity on both sides:

- Citizens are not burdened with the institutional complexity of government.
- Institutions are not burdened with the citizen-experience complexity of a unified platform.

Each side interacts with the platform on its own terms; the platform mediates without merging.

---

## Chapter 22: Government Integration Should Be Adapter-Based (Part XXII)

### 22.1 Purpose

Government systems are heterogeneous. Some expose modern REST APIs. Others expose SOAP services. Others accept only SFTP batch uploads. Others expose database views. Others communicate through signed XML or signed JSON files. Others operate on webhook callbacks or event streams. Others expose only manual secure evidence intake channels. A platform that hard-codes a single integration model will fail to integrate with most sovereign systems. The platform must therefore provide **reusable adapters** for the full range of integration mechanisms sovereign systems actually use.

### 22.2 Adapter catalog

| # | Adapter type | Description | Typical use |
|---|---|---|---|
| 1 | **REST** | RESTful HTTP/HTTPS API integration with JSON or XML payloads | Modern government APIs, real-time service integration |
| 2 | **SOAP** | SOAP-based XML web services | Legacy government service buses, sectoral systems |
| 3 | **SFTP** | Secure file transfer for batch files | Batch-oriented reporting, end-of-day reconciliation |
| 4 | **Signed XML** | XML payloads with XMLDSig or equivalent sovereign signature | Official document transfer, regulatory filings |
| 5 | **Signed JSON** | JSON payloads with JWS or equivalent sovereign signature | Modern signed document transfer, webhook payloads |
| 6 | **Batch files** | Structured flat files, CSV, fixed-width, or custom formats | Legacy batch processing, end-of-period reconciliation |
| 7 | **Database views** | Authorized, read-only database views exposed to the platform | Reference data, master data, lookup data |
| 8 | **Webhooks** | Outbound HTTP callbacks to registered endpoints | Real-time status notifications, event callbacks |
| 9 | **Event streams** | Subscription to event streams (e.g., message broker topics) | High-throughput operational events |
| 10 | **Secure file exchange** | Sovereign secure file exchange platform | Large document transfers, evidence packages |
| 11 | **Manual secure evidence intake** | Assisted manual channel for evidence that cannot be transmitted electronically | Highly classified evidence, court-restricted material |

### 22.3 Adapter design

Each adapter must:

1. **Encapsulate the integration mechanism.** The platform's core routing, referral, and exchange logic is independent of the adapter type.
2. **Expose a uniform interface.** Adapters conform to a uniform platform interface (submit, query, status, ack) regardless of the underlying mechanism.
3. **Handle authentication.** Each adapter handles its own authentication (API key, certificate, OAuth, mutual TLS, sovereign PKI, etc.).
4. **Handle errors.** Each adapter translates underlying errors into the platform's error taxonomy.
5. **Handle retry.** Each adapter implements retry policy consistent with Chapter 4.
6. **Handle provenance.** Each adapter logs its invocations and outcomes in the platform's provenance.
7. **Be testable in isolation.** Each adapter can be exercised against a synthetic endpoint in the sandbox (Part LII of the parent blueprint).
8. **Be replaceable.** An adapter can be replaced with another adapter for the same target system without platform re-architecture.

### 22.4 Adapter lifecycle

Each adapter has a defined lifecycle:

1. **Definition.** The adapter's interface, authentication, schema, and error handling are defined.
2. **Sandbox testing.** The adapter is tested against synthetic endpoints.
3. **Certification.** The adapter passes certification (Part LIII of the parent blueprint).
4. **Production promotion.** The adapter is enabled for a specific target system in production.
5. **Operation.** The adapter operates with monitoring, logging, and health checks.
6. **Deprecation.** When the target system retires or replaces the integration, the adapter is deprecated.
7. **Retirement.** The adapter is removed from production after a clean retirement window.

### 22.5 Per-target authorization

An adapter is not, by being built, authorized for any specific target. Per-target authorization requires:

- A specific Authority Matrix entry for the institution, system, and data.
- An explicit operational authorization from the institution.
- Verification (Chapter 3 §3.3).
- A test pass against the specific target.

### 22.6 Anti-monoculture

The platform must not assume that all government systems will, eventually, expose REST APIs. Sovereign systems evolve at their own pace; some legacy systems will remain in operation for decades. The adapter catalog must continue to support the full range of integration mechanisms, even as modern mechanisms become more prevalent.

### 22.7 Adapter composition

Where a single integration requires multiple mechanisms (e.g., a SOAP service for submission plus an SFTP batch for status reconciliation), the platform composes adapters into an integration profile. The profile is the unit of authorization and monitoring, not the individual adapter.

---

## Chapter 23: Existing Egyptian Systems Are Not to Be Replaced (Part XLIII)

### 23.1 Purpose

The **No Replacement Principle** is a foundational rule of the CIRCLE architecture as it applies to the sovereign Arab Republic of Egypt. CIRCLE integrates with existing Egyptian government infrastructure. It does not compete with it. It does not replace it. It does not become a parallel system.

### 23.2 The No Replacement Principle

> CIRCLE must integrate with existing Egyptian government infrastructure rather than competing with it. For every category of existing sovereign system, CIRCLE's role is integration, correlation, referral, and intelligence — not replacement.

### 23.3 Existing Egyptian systems (illustrative, not exhaustive)

The No Replacement Principle applies to existing Egyptian systems for, among others:

| # | Category | Examples (illustrative) |
|---|---|---|
| 1 | E-invoicing | ETA (Egyptian Tax Authority) e-invoice system |
| 2 | E-receipts | ETA e-receipt system |
| 3 | Customs / foreign trade | NAFEZA single window for customs |
| 4 | Government digital signatures | Egyptian government PKI and trust services |
| 5 | Emergency / public safety | National emergency services, police, ambulance, civil protection |
| 6 | Government complaints | Unified government complaints portal |
| 7 | Institutional databases | Sectoral registers (civil registry, commercial register, real-estate register, vehicle register) |
| 8 | Court systems | Egyptian judiciary case management systems |
| 9 | Law-enforcement systems | Police operational systems, prosecution systems |

The list is illustrative; the principle applies to every existing Egyptian government system.

### 23.4 What integration means

Integration means:

- CIRCLE consumes from, or submits to, the existing system through authorized channels (Chapter 22 adapters).
- CIRCLE references the existing system's records by reference (Chapter 15) rather than duplicating them.
- CIRCLE surfaces the existing system's status to citizens and institutions under the existing system's terms.
- CIRCLE does not create a parallel record that competes with the existing system's authoritative record.

### 23.5 What integration does not mean

Integration does **not** mean:

- CIRCLE becomes the official system for any government function.
- CIRCLE's records displace the existing system's records.
- CIRCLE's workflows replace the existing system's workflows.
- CIRCLE's decisions override the existing system's decisions.
- Citizens are required to use CIRCLE instead of the existing system.

### 23.6 Anti-competition rule

> The platform must not market, position, or operate itself as a competitor to any existing Egyptian government system. Where the platform provides value-add (verification, linkage, analytics, intelligence, evidence correlation), it does so on top of the existing system's authoritative records, not in place of them.

### 23.7 Specific examples

The following chapters (Chapters 24 and 25) develop two specific examples in detail: the ETA e-invoice system and the NAFEZA customs single window. These examples illustrate the No Replacement Principle in operation.

### 23.8 When new systems emerge

When a new Egyptian government system is launched, the platform's integration target updates accordingly. The No Replacement Principle applies equally to new systems; the platform integrates with them, it does not compete with them.

### 23.9 Sovereign operator discretion

The sovereign operator may, at its discretion, decline to integrate with a specific existing system where integration is not authorized, not technically feasible, or not operationally appropriate. The platform's value does not depend on integrating with every existing system; it depends on integrating with the systems for which integration is authorized and operationally justified.

---

## Chapter 24: ETA / E-Invoice Example (Part XLIV)

### 24.1 Purpose

The Egyptian Tax Authority (ETA) operates the official Egyptian e-invoice system. This chapter illustrates the No Replacement Principle by showing how CIRCLE integrates with ETA's e-invoice system without becoming a competing e-invoice platform.

### 24.2 Anti-replacement rule

> CIRCLE must NOT become the official Egyptian e-invoice system. The official e-invoice system is operated by ETA. CIRCLE integrates with it; it does not replace it.

### 24.3 Correct integration flow

```
ETA
  │
  ▼
OFFICIAL E-INVOICE (ETA system of record)
  │
  ▼
AUTHORIZED INTEGRATION
  (adapter per Ch. 22; Authority Matrix per
   Part XVII; verification per Ch. 3)
  │
  ▼
CIRCLE
  │
  ├─► REFERENCE VERIFICATION
  │     (verify that an e-invoice reference
  │      corresponds to an ETA-issued invoice,
  │      without copying the invoice)
  │
  ├─► EVIDENCE LINKAGE
  │     (link an e-invoice reference to an
  │      authorized case that cites it)
  │
  ├─► DOCUMENT PROVENANCE
  │     (preserve the provenance of the
  │      e-invoice reference back to ETA)
  │
  ├─► CONTRACT CORRELATION
  │     (correlate an e-invoice reference
  │      with a contract reference, where
  │      authorized)
  │
  ├─► PAYMENT CORRELATION
  │     (correlate an e-invoice reference
  │      with a payment reference, where
  │      authorized)
  │
  └─► INVESTIGATION ANALYTICS
        (aggregate e-invoice references
         across authorized cases for
         investigative analytics, under
         ACA process)
  │
  ▼
AUTHORIZED INSTITUTIONAL USE
  (ACA, tax authority, or other
   authorized institution, under
   their own process)
```

### 24.4 What CIRCLE provides

| Capability | Description |
|---|---|
| Reference verification | Verify that an e-invoice reference cited in a case corresponds to an ETA-issued invoice, without copying the invoice |
| Evidence linkage | Link an e-invoice reference to an authorized case that cites it as evidence |
| Document provenance | Preserve the provenance chain from the e-invoice reference back to ETA |
| Contract correlation | Where authorized, correlate an e-invoice reference with a contract reference held by another institution |
| Payment correlation | Where authorized, correlate an e-invoice reference with a payment reference held by another institution |
| Investigation analytics | Aggregate e-invoice references across authorized cases for investigative analytics, under ACA process |

### 24.5 What CIRCLE does not provide

CIRCLE does **not**:

- Issue e-invoices.
- Validate e-invoices for tax purposes (ETA validates; CIRCLE references).
- Store full e-invoice content absent explicit authorization.
- Replace ETA's status as the official e-invoice system of record.
- Permit institutions to use CIRCLE in lieu of ETA for tax-relevant invoicing.

### 24.6 Reference discipline

Where CIRCLE references an ETA e-invoice, the reference is governed by Chapter 15 (Inter-Agency Evidence Reuse). CIRCLE holds a reference, not a duplicate. Access to the underlying e-invoice is governed by ETA's terms and the Authority Matrix.

### 24.7 Conflict handling

Where CIRCLE's referenced e-invoice data and ETA's live e-invoice data disagree (e.g., the e-invoice was amended or cancelled after CIRCLE's reference was made), the platform surfaces a Data Conflict (Chapter 29) rather than silently resolving. ETA's record is authoritative; CIRCLE's reference is updated to reflect ETA's authoritative state, with the conflict recorded in provenance.

### 24.8 Schema drift

If ETA changes its e-invoice schema, field definitions, authentication, version, or endpoint, the platform's Schema Change Sentinel (Chapter 30) detects the change and quarantines new submissions until the adapter is updated and re-certified.

---

## Chapter 25: NAFEZA Example (Part XLV)

### 25.1 Purpose

NAFEZA is Egypt's single window for customs and foreign trade. This chapter illustrates the No Replacement Principle by showing how CIRCLE integrates with NAFEZA without becoming a competing customs system.

### 25.2 Anti-replacement rule

> CIRCLE does NOT replace NAFEZA. NAFEZA is the official single window for customs and foreign trade in Egypt. CIRCLE integrates with it; it does not compete with it.

### 25.3 Correct integration flow

```
NAFEZA
  │
  ▼
OFFICIAL CUSTOMS / TRADE INFORMATION (NAFEZA system of record)
  │
  ▼
AUTHORIZED CONNECTOR
  (adapter per Ch. 22; Authority Matrix per
   Part XVII; verification per Ch. 3)
  │
  ▼
CIRCLE
  │
  ├─► CORRELATION
  │     (correlate NAFEZA customs references
  │      with other authorized references —
  │      e-invoice, contract, payment,
  │      shipping, regulatory permit)
  │
  ├─► INTELLIGENCE
  │     (aggregate customs references across
  │      authorized cases for investigative
  │      intelligence, under ACA process)
  │
  └─► EVIDENCE
        (preserve the provenance of customs
         references cited as evidence in
         authorized cases)
  │
  ▼
AUTHORIZED INSTITUTION
  (ACA, customs authority, tax authority,
   or other authorized institution,
   under their own process)
```

### 25.4 What CIRCLE provides

| Capability | Description |
|---|---|
| Correlation | Correlate NAFEZA customs references with other authorized references (e-invoice, contract, payment, shipping, regulatory permit) |
| Intelligence | Aggregate customs references across authorized cases for investigative intelligence, under ACA process |
| Evidence | Preserve the provenance of customs references cited as evidence in authorized cases |

### 25.5 What CIRCLE does not provide

CIRCLE does **not**:

- Issue customs declarations.
- Validate customs declarations for regulatory purposes (NAFEZA validates; CIRCLE references).
- Store full customs declaration content absent explicit authorization.
- Replace NAFEZA's status as the official customs single window.
- Permit institutions to use CIRCLE in lieu of NAFEZA for customs-relevant filings.

### 25.6 Reference discipline

Where CIRCLE references a NAFEZA customs declaration, the reference is governed by Chapter 15. CIRCLE holds a reference, not a duplicate. Access to the underlying declaration is governed by NAFEZA's terms and the Authority Matrix.

### 25.7 Conflict handling

Where CIRCLE's referenced customs data and NAFEZA's live customs data disagree, the platform surfaces a Data Conflict (Chapter 29) rather than silently resolving. NAFEZA's record is authoritative.

### 25.8 Schema drift

If NAFEZA changes its schema, field definitions, authentication, version, or endpoint, the platform's Schema Change Sentinel (Chapter 30) detects the change and quarantines new submissions until the connector is updated and re-certified.

### 25.9 Cross-system correlation example

A common use case: an authorized ACA case involves a shipment whose customs declaration is in NAFEZA, whose e-invoice is in ETA, whose payment is in a banking reference, and whose contract is held by a contracting institution. CIRCLE's value is in correlating these references — each held authoritatively by a different sovereign system — into a single investigative view for the ACA, without copying the underlying records. Each reference remains under its originating system's authority; CIRCLE provides the correlation.

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  NAFEZA  │   │   ETA    │   │  BANKING │   │CONTRACT- │
│ (customs)│   │ (e-invc) │   │ (payment)│   │  ING INST│
└────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
   REF           REF             REF             REF
     │              │              │              │
     └──────────┬───┴──────────────┴──────────────┘
                │
                ▼
         ┌───────────┐
         │  CIRCLE   │
         │ CORRELATION│
         │  VIEW     │
         └─────┬─────┘
               │
               ▼
        AUTHORIZED ACA CASE
        (under ACA process;
         references only;
         no underlying copies)
```

---

## Chapter 26: Digital Signature / PKI (Part XLVI)

### 26.1 Purpose

Egyptian government digital signature and PKI infrastructure is operated by sovereign trust services. CIRCLE integrates with this official trust infrastructure where authorized. CIRCLE does **not** create a competing government PKI.

### 26.2 Anti-competition rule

> CIRCLE must not create a competing government PKI. The official Egyptian government trust infrastructure is the authoritative PKI for government digital signatures. CIRCLE integrates with it; it does not replace it.

### 26.3 Supported capabilities

Where authorized, CIRCLE supports:

| # | Capability | Description |
|---|---|---|
| 1 | Certificate validation | Validate certificates issued by the official government trust infrastructure |
| 2 | Signatures | Apply and verify digital signatures using official government certificates |
| 3 | Institutional seals | Apply and verify institutional seals for official documents |
| 4 | Official document verification | Verify the authenticity of official documents signed under the government PKI |
| 5 | Signed referrals | Sign inter-institutional referrals (Chapter 10) and exchanges (Chapter 13) using the government PKI |

### 26.4 Integration model

CIRCLE's PKI integration follows the No Replacement Principle:

- The official government PKI is the system of record for government digital identities and certificates.
- CIRCLE references government certificates; it does not issue its own government-equivalent certificates.
- CIRCLE's signatures on inter-institutional exchanges use government-issued certificates for the signing institution, not platform-issued certificates.
- CIRCLE may issue platform-internal operational certificates (e.g., for adapter-to-adapter transport security), but these are not represented as government PKI and do not substitute for it.

### 26.5 Signing flow

```
INSTITUTION A (sovereign)
  - holds government-issued certificate (Gov-PKI-A)
        │
        ▼
CIRCLE EXCHANGE OBJECT (Chapter 13)
  - payload: capability-specific
  - signing_cert: Gov-PKI-A reference
  - signature: applied by Institution A under Gov-PKI-A
        │
        ▼
CIRCLE EXCHANGE FABRIC
  - transports signed object to Institution B
        │
        ▼
INSTITUTION B (sovereign)
  - validates signature under Gov-PKI-A
  - verifies Institution A's certificate status
  - records provenance
```

### 26.6 Anti-forgery rule

> The platform must never apply a signature on behalf of an institution without that institution's explicit authorization for the specific signature operation. The platform must never represent a platform-internal signature as an institutional signature.

### 26.7 Certificate lifecycle

The platform tracks the lifecycle of government-issued certificates used in integrations:

- Certificate issuance and renewal.
- Certificate revocation.
- Certificate expiry.

Where a certificate is revoked or expired, the platform refuses to apply signatures under that certificate and surfaces the issue in the Integration Control Tower.

### 26.8 Verification

The platform verifies government signatures on inbound documents and exchanges:

- Signature validity (cryptographic verification).
- Certificate validity (not expired, not revoked, issued by trusted government CA).
- Signer authorization (the signer is authorized by the originating institution for the document type).

A signature that fails verification is rejected, and the rejection is logged in provenance.

### 26.9 Sovereign stance on cryptographic implementations

Where this chapter references commercial cryptographic standards (X.509, PKCS, JWS, XMLDSig), they are named only as candidate implementations of sovereign trust infrastructure. Equivalent sovereign cryptographic implementations are always acceptable substitutes.

---

## Chapter 27: Government System of Record Registry (Part XLVII)

### 27.1 Purpose

CIRCLE integrates with multiple sovereign systems. For every connected system, the platform maintains a **System of Record Registry** — a structured registry of the system's identity, ownership, authority, integration type, schema version, and verification status. The Registry is the authoritative reference for what CIRCLE is connected to, how, and under what terms.

### 27.2 Registry schema

For every connected system, the Registry records:

| # | Field | Description |
|---|---|---|
| 1 | `institution` | The sovereign institution that owns the system |
| 2 | `system` | The name and identifier of the system |
| 3 | `domain` | The functional domain (e.g., taxation, customs, civil registry, courts, police operations) |
| 4 | `authoritative_objects` | The types of records for which this system is the authoritative source |
| 5 | `data_owner` | The institutional role or office that owns the data |
| 6 | `availability` | The system's availability profile (operating hours, maintenance windows, SLA) |
| 7 | `integration_type` | The adapter type used (Chapter 22) |
| 8 | `last_verification` | The date and time of the last successful verification (Chapter 3 §3.3) |
| 9 | `schema_version` | The schema version currently in effect for the integration |

### 27.3 Additional metadata

Beyond the core schema, the Registry may record:

- The Authority Matrix entry reference for this system.
- The integration profile (set of adapters used, Chapter 22 §22.7).
- The fallback channels configured (Chapter 4).
- The schema mapping (Chapter 6 §6.4).
- The status mapping (Chapter 6 §6.4).
- The certificate references (Chapter 26).
- The retention policy applied to records received from this system.

### 27.4 Verification discipline

A Registry entry is only as good as its last verification. The platform enforces:

- Periodic re-verification of every connected system (configurable per system).
- Re-verification on schema changes (Chapter 30).
- Re-verification on certificate lifecycle events (Chapter 26).
- Re-verification on integration incidents.

A system whose verification has lapsed beyond a configured threshold is marked `VERIFICATION_OVERDUE` in the Integration Control Tower and may be temporarily suspended pending re-verification.

### 27.5 Registry update flow

```
INSTITUTION PROPOSES INTEGRATION
        │
        ▼
AUTHORITY MATRIX ENTRY CREATED (Part XVII)
        │
        ▼
ADAPTER DEFINED + SANDBOX TESTED (Ch. 22, Part LII)
        │
        ▼
CERTIFICATION PASSED (Part LIII)
        │
        ▼
REGISTRY ENTRY CREATED
  - institution, system, domain
  - authoritative objects
  - data owner
  - availability
  - integration type
  - last verification: NOW
  - schema version
        │
        ▼
PRODUCTION PROMOTION
        │
        ▼
ONGOING MONITORING + RE-VERIFICATION
```

### 27.6 Single source of truth

The Registry is the single source of truth for what CIRCLE is connected to. All citizen-facing, institution-facing, and oversight-facing communications about integration status reflect the Registry. The platform must not, in any communication, claim integration with a system not in the Registry, or claim a higher level of integration than the Registry supports.

### 27.7 Audit

The Registry is auditable by:

- The owning institution (its own Registry entries).
- The sovereign oversight authority under due process.
- The platform's audit plane.

Registry changes are versioned; every change records the prior state, the new state, the actor, the timestamp, and the authorization basis.

### 27.8 Retirement

When an integration is retired — whether because the target system is decommissioned, the institution withdraws authorization, or the integration is no longer operationally justified — the Registry entry is marked `RETIRED` with a retirement timestamp and reason. Retired entries are retained for audit; the integration is disabled.

---

## Chapter 28: Data Freshness (Part XLVIII)

### 28.1 Purpose

External information displayed by CIRCLE — whether from an emergency responder, a government service, an institutional database, or any other connected system — must indicate when it was last verified. A citizen or institution relying on external information must know whether the information is current, recent, stale, or potentially stale.

### 28.2 LAST VERIFIED display

Where relevant, the platform displays a **LAST VERIFIED** indicator on external information. The indicator communicates:

- The timestamp of the last successful verification.
- The source of the verification (which system returned the data).
- The verification method (live query, cached response, reference, etc.).

### 28.3 Freshness tiers

| Tier | Symbol | Meaning | Display |
|---|---|---|---|
| Fresh | `FRESH` | Verified within the system's freshness SLA | "Last verified {time}, per {source}" |
| Recent | `RECENT` | Verified within an acceptable window, beyond freshness SLA | "Last verified {time}; beyond freshness SLA" |
| Stale | `STALE` | Verification window exceeded | "Stale; last verified {time}; verification overdue" |
| Unverified | `UNVERIFIED` | No successful verification in configured window | "Unverified; verification overdue" |
| Unavailable | `UNAVAIL` | Source system unavailable for verification | "Source unavailable; last verified {time}" |

### 28.4 What requires LAST VERIFIED

LAST VERIFIED applies to:

- Status displays from external systems (emergency status, service status, case status).
- Reference data displays (registry data, master data, lookup data).
- Evidence references (Chapter 15).
- Cross-system correlation views (Chapter 25 §25.9).

LAST VERIFIED does not necessarily apply to:

- The citizen's own submissions (which are platform-internal).
- The platform's own routing, referral, and provenance records.

### 28.5 Anti-staleness rule

> The platform must not display external information without a freshness indicator. Information that has not been verified within the configured window must be visibly flagged as stale or unverified; it must not be presented as current.

### 28.6 Cache discipline

Where the platform caches external information for performance, the cache must record:

- The original source timestamp.
- The cache timestamp.
- The cache expiry.

Cached information displayed to the citizen or to an institution must reflect the original source timestamp, not the cache timestamp. The citizen must not be misled into believing that cached information is fresher than it is.

### 28.7 Re-verification triggers

The platform re-verifies external information on:

- A configured schedule (per system, per data type).
- A citizen or institution request for fresh data.
- A schema change detection (Chapter 30).
- A conflict detection (Chapter 29).
- A certificate lifecycle event (Chapter 26).

### 28.8 Staleness escalation

Information that has been stale or unverified beyond a configured threshold is escalated:

- The Integration Control Tower flags the staleness.
- The owning institution is notified (where the staleness originates from the institution's system).
- The platform may pause dependent workflows until re-verification succeeds.

### 28.9 Citizen disclosure

Where a citizen is relying on stale or unverified external information for a decision, the platform must surface the staleness prominently. The citizen must not be allowed to act on stale information as if it were current.

---

## Chapter 29: Data Conflict (Part XLIX)

### 29.1 Purpose

When two connected systems disagree about a fact — for example, when System A says a citizen's address is X and System B says the citizen's address is Y, or when an e-invoice reference in ETA shows one amount and the same reference in another system shows a different amount — the platform must not silently resolve the conflict. The platform must display a **DATA CONFLICT**, surfacing the disagreement and its provenance.

### 29.2 Anti-silent-resolution rule

> If System A and System B disagree on a fact, the platform must not silently resolve the conflict by preferring one source over the other. The platform must display a DATA CONFLICT, showing the sources, timestamps, provenance, and discrepancy.

### 29.3 DATA CONFLICT display schema

| Field | Description |
|---|---|
| `conflict_id` | Unique identifier for the conflict |
| `fact` | The fact in disagreement (e.g., citizen address, invoice amount, status) |
| `source_a` | System A identifier |
| `value_a` | The value asserted by System A |
| `timestamp_a` | The timestamp of System A's assertion |
| `provenance_a` | System A's provenance for the assertion |
| `source_b` | System B identifier |
| `value_b` | The value asserted by System B |
| `timestamp_b` | The timestamp of System B's assertion |
| `provenance_b` | System B's provenance for the assertion |
| `discrepancy` | Plain-language description of the discrepancy |
| `displayed_to` | Who has been shown the conflict (citizen, institution, oversight) |

### 29.4 Conflict display flow

```
SYSTEM A assertion  ──►  CIRCLE
                              │
SYSTEM B assertion  ──►  CIRCLE
                              │
                              ▼
                      CONFLICT DETECTOR
                              │
                       (value_a ≠ value_b)
                              │
                              ▼
                      DATA CONFLICT OBJECT
                       (per §29.3 schema)
                              │
                              ▼
                      DISPLAY TO USER
                       - citizen: simplified
                         ("Conflicting information
                          from {A} and {B};
                          please verify with
                          the authoritative
                          source")
                       - institution: full
                         (schema fields)
                       - oversight: full + audit
                         trail
                              │
                              ▼
                      DO NOT SILENTLY RESOLVE
                       - flag for resolution
                         by authoritative
                         source
                       - record conflict in
                         provenance
```

### 29.5 Resolution authority

A DATA CONFLICT is resolved by the **authoritative source** for the fact in question, not by the platform. The Registry (Chapter 27) records, for each connected system, which types of records it is authoritative for. Where the conflict is between an authoritative source and a non-authoritative source, the authoritative source's value is presented as authoritative; the non-authoritative value is presented as possibly stale or in error, but the conflict is still displayed.

Where two systems are both authoritative for different aspects of the fact (e.g., one is authoritative for the citizen's registered address, another is authoritative for the citizen's mailing address), the conflict may reflect a real-world distinction rather than an error, and the platform surfaces the distinction.

### 29.6 Conflict escalation

A DATA CONFLICT that cannot be resolved by the authoritative source within a configured window is escalated:

- The Integration Control Tower flags the conflict.
- The owning institution(s) are notified.
- The platform may pause dependent workflows that rely on the conflicting fact.

### 29.7 Conflict provenance

A DATA CONFLICT, once detected, is part of the platform's provenance:

- The conflict's detection timestamp.
- The values, sources, timestamps, and provenance of each assertion.
- Any resolution (by authoritative source, by citizen correction, by institution correction).
- The resolution timestamp and actor.

Conflict provenance is immutable once written and is auditable.

### 29.8 Citizen-facing conflict

Where a DATA CONFLICT affects a citizen-facing display, the platform presents the conflict in plain language:

> "We're seeing conflicting information from two official sources about {fact}. Source A ({institution}) says {value_a}, as of {timestamp_a}. Source B ({institution}) says {value_b}, as of {timestamp_b}. Please verify with {authoritative source}."

The citizen is not asked to silently accept either value; they are informed of the conflict and directed to the authoritative source.

### 29.9 Institution-facing conflict

Where a DATA CONFLICT affects an institution-facing display, the platform presents the full conflict schema, including provenance, to the institution's authorized actors. The institution may initiate an Information Request (Chapter 14) to the other institution to clarify the discrepancy, under the Exchange Fabric.

### 29.10 Oversight-facing conflict

Where a DATA CONFLICT is persistent or systemic — for example, the same two systems repeatedly disagree on the same type of fact — the conflict may, under configured criteria, contribute to a Systemic Signal (Chapter 19) for ACA review.

---

## Chapter 30: Schema Change Sentinel (Part L)

### 30.1 Purpose

External sovereign systems change. They change their schemas (field names, structures, hierarchies). They change their field definitions (semantics, types, allowed values). They change their authentication mechanisms. They change their API versions. They change their endpoints. When an external system changes, the platform must detect the change, not silently accept malformed data that may corrupt downstream processing.

### 30.2 Sentinel scope

The Schema Change Sentinel monitors, for every connected system:

| # | Change type | Detection method |
|---|---|---|
| 1 | Schema change | Field added, removed, renamed, restructured, or type-changed in inbound messages |
| 2 | Field change | Field semantics, allowed values, validation rules change |
| 3 | Authentication change | Authentication mechanism, credentials, certificate, or token format changes |
| 4 | Version change | API version, schema version, or protocol version changes |
| 5 | Endpoint change | URL, port, host, or path changes |

### 30.3 Anti-silent-acceptance rule

> If an external system changes its schema, field definitions, authentication, version, or endpoint, the platform must detect the change. The platform must not silently accept malformed data. The platform must quarantine the data, flag the change, and require adapter re-certification before resuming normal processing.

### 30.4 Sentinel flow

```
EXTERNAL SYSTEM (sovereign)
        │
        ▼
ADAPTER INVOCATION (Chapter 22)
        │
        ▼
┌──────────────────────────────────┐
│  SCHEMA CHANGE SENTINEL           │
│  - compares inbound message       │
│    against registered schema      │
│    (Chapter 27 schema_version)   │
│  - checks authentication,         │
│    endpoint, version              │
└──────────────────────────────────┘
        │
   ├─► MATCHES REGISTERED SCHEMA
   │      → process normally
   │
   └─► MISMATCH DETECTED
          │
          ▼
       ┌──────────────────────────┐
       │  QUARANTINE              │
       │  - inbound data held     │
       │  - not delivered to      │
       │    downstream workflows │
       │  - alert raised in       │
       │    Integration Control  │
       │    Tower                 │
       └──────────────────────────┘
          │
          ▼
       ┌──────────────────────────┐
       │  RE-CERTIFICATION        │
       │  - adapter updated       │
       │  - sandbox tested        │
       │  - certified (Part LIII)  │
       │  - Registry updated      │
       │    (Ch. 27)              │
       └──────────────────────────┘
          │
          ▼
       RESUME NORMAL PROCESSING
       (quarantined data processed
        under new schema, where
        appropriate, or replayed
        under original schema if
        the change was a transient
        sender error)
```

### 30.5 Quarantine discipline

Quarantined data is held in a segregated store, with:

- The original message preserved.
- The mismatch detail recorded.
- The originating system and timestamp.
- The adapter that received the message.

Quarantined data is **not** delivered to downstream workflows until the mismatch is resolved. Downstream workflows that depend on the affected system are paused or degraded, with explicit status surfaced (Chapter 4 §4.3 `UNAVAIL` or `FAIL`).

### 30.6 Alerting

A schema change detection raises an alert in the Integration Control Tower (Part LI of the parent blueprint) with:

- The affected system (per Registry, Chapter 27).
- The change type (schema, field, authentication, version, endpoint).
- The detection timestamp.
- The quarantine count.
- The downstream workflows affected.

### 30.7 Re-certification

Resuming normal processing requires:

1. Adapter update (to handle the new schema / authentication / version / endpoint).
2. Sandbox testing (Part LII).
3. Certification (Part LIII).
4. Registry update (Chapter 27) with the new schema_version, last_verification timestamp, and integration metadata.
5. Authorization by the sovereign operator.

Until re-certification completes, the integration remains in `DEGRADED` or `UNAVAILABLE` status.

### 30.8 Backward compatibility

Where the external system supports backward compatibility (e.g., the new schema is a superset of the old, and old-format messages continue to be accepted), the platform may continue processing old-format messages while re-certifying for the new schema. Backward compatibility does not excuse the platform from re-certification; it only permits continued operation in the interim.

### 30.9 Forward compatibility

Where the external system does not support backward compatibility (e.g., the new schema is breaking), the platform must not attempt to coerce new-format messages into the old schema. Coercion risks silent data corruption. The platform quarantines new-format messages until re-certification.

### 30.10 Citizen and institution impact

Where a schema change affects a citizen-facing or institution-facing workflow, the platform surfaces the impact:

- Citizens are informed that an integration is degraded (without exposing internal schema details).
- Institutions are informed that inbound or outbound exchanges from a specific system are quarantined.
- The Integration Control Tower displays the impact for operations teams.

### 30.11 Audit

Schema change detections are auditable:

- The detection timestamp.
- The change type and detail.
- The quarantine duration.
- The re-certification path.
- The resolution timestamp and actor.

Audit records are immutable and reviewable by the sovereign oversight authority.

### 30.12 Anti-fabrication rule (restated)

The Schema Change Sentinel reinforces the broader anti-fabrication rule of this Part: the platform must not pretend that data is well-formed and current when it is not. Silent acceptance of malformed data is a form of fabrication — it presents as authoritative data that may, in fact, be corrupt. The Sentinel prevents this form of fabrication by refusing to silently accept what it cannot verify.

---

## Appendix A — Emergency Fallback Hierarchy Reference Card

```
EMERGENCY SUBMISSION DELIVERY — FALLBACK HIERARCHY

┌──────────────────────────────────────────────────┐
│ TIER 1 — APPROVED DIGITAL GOVERNMENT CHANNEL    │
│ Direct, authorized API or digital service       │
│ integration with the sovereign target system.   │
└──────────────────────────────────────────────────┘
       │ (on FAIL / UNAVAIL)
       ▼
┌──────────────────────────────────────────────────┐
│ TIER 2 — APPROVED ALTERNATIVE DIGITAL MECHANISM │
│ Government service bus, message broker,         │
│ official webhook, alternative portal.           │
└──────────────────────────────────────────────────┘
       │ (on FAIL / UNAVAIL)
       ▼
┌──────────────────────────────────────────────────┐
│ TIER 3 — APPROVED SMS / DATA METHOD             │
│ Structured SMS or low-bandwidth data submission │
│ to an authorized receiving number or short code.│
└──────────────────────────────────────────────────┘
       │ (on FAIL / UNAVAIL)
       ▼
┌──────────────────────────────────────────────────┐
│ TIER 4 — OFFICIAL TELEPHONE FALLBACK            │
│ Automated or assisted telephone call to the     │
│ official emergency number.                      │
└──────────────────────────────────────────────────┘
       │ (on FAIL / UNAVAIL)
       ▼
┌──────────────────────────────────────────────────┐
│ TIER 5 — OFFLINE QUEUE / RECORD                 │
│ Locally preserved record with full provenance,  │
│ pending retry on tier recovery.                 │
└──────────────────────────────────────────────────┘

DELIVERY STATUS:
  TX       — Transmitted
  ACK      — Acknowledged
  UNAVAIL  — Status unavailable
  FAIL     — Failed (preserved in queue)
  FBK      — Fallback used (tier and reason recorded)

NON-NEGOTIABLE: Never fabricate successful dispatch.
```

---

## Appendix B — CIRCLE Service Authority Graph Schema

```
NODE: Problem
  - problem_id
  - description
  - category
  - keywords
        │
        ▼
NODE: Service
  - service_id
  - name
  - description
  - service_type
        │
        ▼
NODE: Institution
  - institution_id
  - name
  - short_name
  - jurisdiction
        │
        ▼
NODE: Department
  - department_id
  - name
  - contact
  - operating_hours
        │
        ▼
NODE: Official Channel
  - channel_id
  - channel_type (Chapter 22 adapter)
  - endpoint
  - auth_method
        │
        ▼
NODE: SLA
  - sla_id
  - target_response
  - target_resolution
  - escalation_triggers
        │
        ▼
NODE: Escalation
  - escalation_id
  - next_department
  - next_institution
  - trigger_condition

EDGES:
  Problem → Service (1:N)
  Service → Institution (1:1, by jurisdiction)
  Institution → Department (1:N)
  Department → Official Channel (1:N)
  Official Channel → SLA (1:1)
  SLA → Escalation (1:N)

INVARIANTS:
  - Every node is owned by the sovereign institution.
  - The platform does not invent nodes.
  - The graph is versioned with effective dates.
  - All updates are reflected in the System of Record Registry.
```

---

## Appendix C — Information Request Object Schema

```
INFORMATION REQUEST OBJECT

  request_id                      UUID
  requesting_institution          Institution ID
  receiving_institution           Institution ID
  case                             Requesting institution's case ID
  purpose                          Constrained purpose + free-text elaboration
  requested_records                List of {record_type, identifiers, date_range}
  legal_administrative_authority   Cited legal provision / regulation / instrument
  deadline                         ISO-8601 timestamp
  confidentiality                  Classification level
  retention                        Retention period (ISO-8601 duration)
  export_restriction               Boolean + constraints
  response                         (populated on response)
    response_records               List of records provided
    response_signature             Receiving institution's signature
    response_timestamp              ISO-8601 timestamp
    response_notes                  Clarifying notes (partial, redacted, refused)

INVARIANTS:
  - Fields 1–11 are mandatory on issuance.
  - Field 12 (response) is populated on response.
  - Every request and response is signed and provenance-logged.
  - Refusals cite legal basis.
  - Overdue requests are surfaced in the Integration Control Tower.
```

---

## Appendix D — ACA Signal Object Schema

```
ACA SIGNAL OBJECT

  signal_id                       UUID
  signal_type                     INDIVIDUAL | SYSTEMIC
  pattern                         Structured pattern description
  source_count                    Number of contributing submissions
  service                         Government service(s) involved
  geography                       Facility / district / region
  timeframe                       Observation window (start, end)
  evidence_availability           Boolean + descriptor (without content)
  repeated_failures               Count + nature
  potential_integrity_indicators List of indicators
  reason_for_referral             Plain-language statement
  signal_generated_at             ISO-8601 timestamp
  signal_generated_by             Platform process + reviewer (if applicable)
  signal_delivered_to             ACA intake endpoint
  signal_acknowledged_at          ISO-8601 timestamp (or null)

INVARIANTS:
  - A Signal is NOT a Case.
  - A Signal does NOT contain citizen identity absent consent.
  - A Signal does NOT contain raw evidence absent separate authorization.
  - A Signal does NOT assert wrongdoing.
  - AI may NOT autonomously convert a Signal into a Case.
  - The ACA decides whether to open a Case, request more info, decline, or hold.
  - Signal generation is bounded by per-service, per-geography rate limits.
```

---

## Appendix E — Government System of Record Registry Schema

```
SYSTEM OF RECORD REGISTRY

Per connected system:

  institution                     Institution ID
  system                          System name and identifier
  domain                          Functional domain
  authoritative_objects           List of record types for which authoritative
  data_owner                      Institutional role / office
  availability                    Operating hours, maintenance windows, SLA
  integration_type                Chapter 22 adapter type
  last_verification               ISO-8601 timestamp
  schema_version                  Current schema version in effect

ADDITIONAL METADATA (optional):

  authority_matrix_reference      Part XVII entry ID
  integration_profile              Set of adapters used (Chapter 22 §22.7)
  fallback_channels               Chapter 4 fallback configuration
  schema_mapping                   Chapter 6 §6.4 mapping
  status_mapping                   Chapter 6 §6.4 mapping
  certificate_references           Chapter 26 certificate references
  retention_policy                 Retention policy for records received

LIFECYCLE:
  DEFINED → SANDBOX_TESTED → CERTIFIED → PRODUCTION → MONITORED
         → DEPRECATED → RETIRED

INVARIANTS:
  - The Registry is the single source of truth for connected systems.
  - No communication may claim integration absent a Registry entry.
  - Lapsed verification triggers VERIFICATION_OVERDUE.
  - Retirement is recorded with timestamp and reason; entry retained for audit.
  - All changes are versioned.
```

---

## Closing Note

This Part has defined the CIRCLE platform's role as a **routing, referral, and correlation layer** for the federated sovereign government architecture of the Arab Republic of Egypt. The platform routes citizens to the correct emergency responder, government service, or oversight intake; it enables controlled inter-agency referrals without creating a shared government case; it permits citizen reports to contribute, under strict criteria, to a structured ACA Signal that the ACA may review to decide whether to open a formal Case; and it integrates with existing Egyptian sovereign systems — ETA, NAFEZA, government PKI, emergency services, court systems, law-enforcement databases — without competing with any of them.

The four non-negotiable rules stated in the opening of this Part govern every chapter that follows:

1. **No fabricated dispatch.** Every status displayed reflects what an authoritative responder has actually returned.
2. **No silent cross-institutional sharing.** Each institution receives only what it is authorized to receive, in its own case namespace.
3. **No autonomous Signal-to-Case conversion.** AI may assist in Signal generation; only the ACA opens Cases.
4. **No replacement of existing sovereign systems.** CIRCLE integrates; it does not compete.

These rules are not constraints on the platform's value. They are the platform's value. A federated sovereign government architecture that respects institutional sovereignty, citizen safety, and procedural integrity is more useful — and more trustworthy — than any platform that attempts to unify, centralize, or replace sovereign systems in the name of convenience. The convenience is in the citizen's experience; the sovereignty is in the institutions' back office; the integrity is in the rules that connect them.

— End of Part II —

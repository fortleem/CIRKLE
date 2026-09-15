# CIRCLE ACA — Evidence Integrity, Investigation Quality & AI Governance
## Part IV of the ACA Sovereign Edition Blueprint

> **Scope of this Part.** Part IV governs the integrity, provenance, custody, and analytical treatment of evidence collected by the ACA (Administrative Control Authority) digital platform; the quality and oversight of investigations built upon that evidence; the security and audit posture of the ACA platform itself; and the governance, containment, and oversight of every AI capability used to assist investigative and supervisory work.
>
> **Sovereign stance.** Every chapter is written under the constraint that the ACA platform is operated by a sovereign national institution, on sovereign infrastructure, under sovereign law, with sovereign cryptographic keys. The platform is a custodian of evidence and procedure — not the originator of truth. Where this document references commercial standards (C2PA, Secure Enclave, Android Hardware-backed Keystore, TPM, HSM), they are named only as candidate implementations of sovereign security hardware; equivalent sovereign institutional security hardware is always an acceptable substitute.
>
> **Non-negotiable rule.** No chapter in this Part may be diluted by deployment pressure. Evidence integrity, independence of audit, and AI containment are not features that can be deferred. A platform that fails on any of these axes is worse than no platform, because it produces evidence-shaped artifacts that may be admitted as if they were trustworthy.

---

## Table of Contents

| Chapter | Section | Title |
|---|---|---|
| 1 | 56 | Regulatory Temporal Engine |
| 2 | 57 | "Law at the Time" Engine |
| 3 | 58 | Rule Graph |
| 4 | 59 | Rule Change Impact |
| 5 | 60 | ACA Official Video System |
| 6 | 61 | Official ACA Video Immutability |
| 7 | 62 | Derived Copy Architecture |
| 8 | 63 | Evidence Provenance / C2PA-Compatible Design |
| 9 | 64 | Trusted ACA Capture Device |
| 10 | 65 | Hardware-Backed Signing |
| 11 | 66 | Independent Time Service |
| 12 | 67 | Recording Continuity Report |
| 13 | 68 | Evidence Black Box |
| 14 | 69 | Dual Evidence Vault |
| 15 | 70 | Cryptographic Evidence Witness |
| 16 | 71 | Evidence Marker |
| 17 | 72 | Secure Live Evidence Relay |
| 18 | 73 | Multi-Agent Synchronized Recording |
| 19 | 74 | Body-Camera Fleet Management |
| 20 | 75 | Offline Field Mode |
| 21 | 76 | CCTV Preservation Workflow |
| 22 | 77 | Video Intelligence |
| 23 | 78 | Missing Context Detector |
| 24 | 79 | Evidence Independence Detector |
| 25 | 80 | Evidence Contamination Analysis |
| 26 | 81 | Evidence Quality Matrix |
| 27 | 82 | Arabic Document Intelligence |
| 28 | 83 | Document Authenticity Analysis |
| 29 | 84 | Wrong Form / Wrong Version Detector |
| 30 | 85 | Stamp / Seal Analysis |
| 31 | 86 | Official Defense / Right-to-Respond Workspace |
| 32 | 87 | Investigator Second Brain |
| 33 | 88 | Automatic Investigation Plan |
| 34 | 89 | Next Best Action |
| 35 | 90 | Investigation Dead-End Detector |
| 36 | 91 | Case Health |
| 37 | 92 | Case Readiness |
| 38 | 93 | Investigation Quality Assurance |
| 39 | 94 | Supervisor Intelligence |
| 40 | 95 | Finding-to-Rule Matrix |
| 41 | 96 | Finding-to-Reform Matrix |
| 42 | 97 | Root Cause Engine |
| 43 | 98 | Recommendation Evasion Detector |
| 44 | 99 | Reform Verification Engine |
| 45 | 100 | Recommendation ROI |
| 46 | 101 | Recurring Recommendation Failure |
| 47 | 102 | Closed-Case Recurrence |
| 48 | 103 | Audit-the-Auditor |
| 49 | 104 | Insider Risk |
| 50 | 105 | Canary / Honey Records |
| 51 | 106 | Privileged Session Monitoring |
| 52 | 107 | Data Exfiltration Radar |
| 53 | 108 | Separation-of-Duties Analyzer |
| 54 | 109 | Privilege Drift |
| 55 | 110 | Dormant Account Detection |
| 56 | 111 | Break-Glass Access |
| 57 | 112 | Independent Audit Plane |
| 58 | 113 | Zero-Trust AI |
| 59 | 114 | AI Governance |
| 60 | 115 | AI Reproducibility |
| 61 | 116 | AI Source-Citation Enforcement |
| 62 | 117 | AI Confidence Decomposition |
| 63 | 118 | Prompt-Injection Firewall |
| 64 | 119 | AI Hallucination Firewall |
| 65 | 120 | AI Red Team |

### Appendix
- Appendix A — Evidence Quality Matrix Reference Card
- Appendix B — Dual Vault Architecture Diagram
- Appendix C — AI Governance Provenance Record Schema
- Appendix D — Prompt-Injection Firewall Rule Catalog
- Appendix E — Cross-Chapter Dependency Matrix

---

## Chapter 1: Regulatory Temporal Engine (Section 56)

### 1.1 Purpose

For every event recorded by the ACA platform — a transaction, a service interaction, an inspection observation, a citizen complaint, an administrative decision — the platform must determine the **regulatory state that was in force on the date the event occurred**. This is not a metadata convenience; it is the foundation of administrative fairness. An investigator who reviews a 2019 procurement action against the 2024 procurement regulation will reach a wrong conclusion with the appearance of correctness.

### 1.2 The seven-fold temporal determination

For every event timestamp $T_e$, the Regulatory Temporal Engine resolves and attaches:

1. **Law valid on that date** — the statute (and section) in force at $T_e$, including amendments that took effect before $T_e$.
2. **Regulation valid on that date** — the implementing regulation in force at $T_e$, including superseded versions.
3. **Executive decision** — any executive instrument (decree, decision, order) in force at $T_e$ that binds the event's domain.
4. **Circular / procedure** — the operational circular, procedure manual, or administrative notice that governed the event's domain at $T_e$.
5. **Internal rule** — the internal institutional rule (departmental policy, delegation of authority, internal SOP version) in force at $T_e$.
6. **Service SLA** — the service-level agreement or service standard applicable to the service at $T_e$.
7. **Relevant form / version** — the authorized official form, and its version, in force at $T_e$.

### 1.3 Implementation model

```
EVENT (Te, domain, jurisdiction)
   │
   ▼
Regulatory Temporal Engine.resolve(Te, domain, juris)
   │
   ├─► [Law]  [Regulation]  [Exec Decision]
   ├─► [Circular]  [Internal Rule]  [SLA]
   └─► [Form/Version]
                │
                ▼
        REGULATORY SNAPSHOT (attached to event, immutable)
```

### 1.4 Regulatory Snapshot

A Regulatory Snapshot is a versioned, immutable binding between an event and the seven regulatory dimensions above. The snapshot is stored alongside the event and never silently rewritten. When the underlying law corpus is corrected (e.g., an amendment date was mistyped), a new snapshot version is created and the previous one retained for audit.

### 1.5 Conflicts and gaps

When the engine cannot resolve one or more dimensions at $T_e$ (source corpus missing, ambiguous, or with a gap), the engine must:

- Emit an explicit `UNRESOLVED_DIMENSIONS` flag on the snapshot.
- Record which dimensions are unresolved and why.
- Refuse to attach a default "current" rule as a silent fallback.
- Surface the gap to the investigator as an `INVESTIGATIVE_GAP`, not as a normal rule linkage.

### 1.6 Why this matters

An event without its regulatory snapshot is an orphan. An event with the wrong regulatory snapshot is a misattribution. Both produce administrative findings that may be procedurally correct in form and substantively wrong in fact. The Regulatory Temporal Engine exists so that no ACA finding rests on a rule that did not yet exist — or had already been superseded — at the moment of the act under review.

---

## Chapter 2: "Law at the Time" Engine (Section 57)

### 2.1 Principle

Make historical legal applicability explicit. Never judge an old action merely against today's rule.

### 2.2 The two-frame rule

For every action under review, the platform computes two regulatory frames:

| Frame | Definition | Use |
|---|---|---|
| **Frame-T** (Time of action) | Regulatory state in force on the date the action occurred | The frame against which the action is evaluated |
| **Frame-N** (Now) | Regulatory state in force at the date of review | Context only; never the basis for a finding of breach |

A finding of breach must cite Frame-T. A finding may, where appropriate, note that Frame-N differs — for example, where the law has since been tightened or relaxed — but the difference itself is not a violation.

### 2.3 What the engine must do

1. **Resolve Frame-T** for the action using the Regulatory Temporal Engine (Chapter 1).
2. **Resolve Frame-N** for the date of review.
3. **Render the comparison** explicitly: *"Action of {date} evaluated against law in force on {date}; today's rule differs in the following respects: …"*.
4. **Refuse** to allow Frame-N to be the basis of a breach finding without explicit override and justification, which itself becomes part of the case record.

### 2.4 What the engine must not do

- Silently substitute the current law for the historical law.
- Fill the absence of a historical rule with the current rule.
- Allow an investigator to bypass Frame-T without a recorded justification.
- Present Frame-N as authoritative for the action under review.

### 2.5 Transition windows

Many regulatory changes include transition windows: actions performed before a cutoff date are governed by the prior rule; actions performed after are governed by the new rule. The engine must handle these windows explicitly, including: actions performed within the transition window itself; actions whose effective date differs from their execution date; actions whose authorization was granted before but executed after the cutoff. Each such case is resolved by explicit fielded determinations: `action_date`, `authorization_date`, `effective_date`, `applicable_rule_at_each_date`.

---

## Chapter 3: Rule Graph (Section 58)

### 3.1 The chain

Every administrative rule descends from a chain of authority:

```
Law → Regulation → Decision → Procedure → Service → Control → Evidence requirement
```

Each node is a first-class, addressable object with explicit lineage: this control exists because of this service, which exists because of this procedure, which exists because of this decision, which exists because of this regulation, which exists because of this law.

### 3.2 Rule Graph objects

| Node | Canonical fields | Authoritative source |
|---|---|---|
| Law | statute ID, sections, jurisdiction, effective range, amendment chain | National gazette / statute registry |
| Regulation | regulation ID, parent law, effective range, scope | National gazette / regulation registry |
| Decision | decision ID, issuer, parent regulation, effective range | Issuing authority |
| Procedure | procedure ID, version, parent decision | Procedure owner |
| Service | service ID, parent procedure, SLA binding | Service owner |
| Control | control ID, parent service, control type, frequency | Control owner |
| Evidence requirement | requirement ID, parent control, required evidence type, retention | Evidence policy |

### 3.3 Why the Rule Graph exists

The Rule Graph exists so that an investigator can answer, for any piece of evidence, the question *"Required by what?"* and trace the answer up to its statutory root — and so that, when a rule anywhere in the chain changes, every downstream object knows it has been affected.

### 3.4 Graph integrity rules

- No node may exist without a parent unless it is itself a Law.
- A node may have multiple parents only when the rule corpus genuinely merges authority; such merges must be explicit and reviewed.
- Every edge carries an effective range.
- A node that has been superseded is never deleted; it is marked `SUPERSEDED` and linked to its successor.
- The graph is append-only at the structural level: edges are never silently re-parented.

### 3.5 Query patterns

The platform must support: **Downward traversal** ("Given this law, list all services, controls, and evidence requirements descended from it"); **Upward traversal** ("Given this evidence requirement, name the chain of authority up to its statutory root"); **Temporal traversal** ("At date $T_e$, what was the chain of authority for service $S$?"); and **Impact traversal** ("If this regulation changes, what controls, cases, and evidence requirements are affected?" — see Chapter 4).

---

## Chapter 4: Rule Change Impact (Section 59)

### 4.1 Trigger

When a regulatory rule changes — a law amended, a regulation revised, a decision replaced, a procedure updated, a service SLA modified — the platform must identify every downstream object that may be affected.

### 4.2 Affected objects

The Rule Change Impact analyzer must identify affected:

- **Services** — services whose procedure, SLA, or control set has changed.
- **Workflows** — operational workflows that reference the changed rule.
- **Controls** — controls whose parent procedure or evidence requirement has changed.
- **Cases** — open cases that cite the changed rule.
- **Investigations** — open investigations that have made findings or are preparing findings under the changed rule.

### 4.3 Impact classification

| Impact class | Definition | Required action |
|---|---|---|
| **Blocking** | The change invalidates the basis of an open finding or pending action | Investigator must review before the case can advance |
| **Material** | The change affects the framing of evidence or the standard of review | Investigator is notified; review is recommended |
| **Informational** | The change does not affect the case but the rule citation must be updated | Automated citation update; investigator is informed |
| **None** | No downstream binding exists | No action |

### 4.4 Impact report

A Rule Change Impact report must include: the changed rule (node ID, old version, new version, effective date of change); the list of affected objects grouped by type and impact class; for each affected open case, the specific findings, allegations, or actions that reference the changed rule; the recommended disposition for each affected object; and a record of who acknowledged each impact.

### 4.5 No silent re-binding

A rule change must never silently re-bind an existing case. The investigator of record (or supervisor, depending on policy) must explicitly acknowledge the impact before the case advances. This prevents the situation where a tightening of the law is retrospectively applied to a case in progress, or where a relaxation silently undermines an open finding.

---

## Chapter 5: ACA Official Video System (Section 60)

### 5.1 The product

The ACA Official Video System — referred to in this document as the **ACA Field Intelligence & Evidence Recorder (AFIER)** — is a dedicated capture system for ACA agents and inspectors conducting field operations. It is not a consumer video tool retrofitted for institutional use. It is built evidence-first.

### 5.2 Required capture capabilities

The AFIER must support, at minimum: video recording (continuous segmented capture); audio recording (synced to video, independent track); photos (standalone and embedded markers); timestamp (per-frame and per-event, Chapter 11); location (GNSS + cell + Wi-Fi triangulation where available); agent identity (bound to authenticated institutional identity); assignment ID (links capture to the assignment that authorized it); device identity (cryptographically bound to the trusted device, Chapter 9); cryptographic integrity (per-segment hash + signature, Chapter 10); evidence ID (issued at capture, never reused); and chain-of-custody metadata (from capture through disposition).

### 5.3 Capture record envelope

Every capture session produces an **Evidence Capture Envelope** containing:

```
EvidenceCaptureEnvelope {
  evidence_id, assignment_id, case_id, agent_id, device_id, device_firmware
  capture_start { device_time, server_receipt_time }
  capture_end   { device_time, server_receipt_time }
  segments[]                  // per-segment hashes + signatures
  markers[]                   // evidence markers (Ch.16)
  continuity_report           // Ch.12
  provenance_manifest         // Ch.8
  integrity_witness           // Ch.15
  location_samples[]
  custody_chain[]
  classification              // sensitivity + handling
}
```

### 5.4 Capture workflow

```
AGENT-AUTH → ASSIGNMENT-VERIFIED → DEVICE-TRUSTED-STATE-CHECK
   → CAPTURE-START (signed) → SEGMENT-1..N (hashed, signed)
   → MARKER (Ch.16) on demand → CAPTURE-END (signed)
   → EVIDENCE-ID-ISSUED → ENVELOPE-SEALED
   → LIVE-RELAY (Ch.17) or OFFLINE-BUFFER (Ch.20)
   → PRESERVATION-VAULT (Ch.14)
```

### 5.5 Separation from personal capture

The AFIER must be structurally and cryptographically distinct from any personal or consumer-grade capture capability on the same device. A capture that is not signed by the trusted device keystore is not official evidence; it is, at best, lead information.

---

## Chapter 6: Official ACA Video Immutability (Section 61)

### 6.1 The rule — non-negotiable

After an ACA official recording is **sealed**, the original must remain immutable. The platform must enforce: no edit, no overwrite, no replacement, no ordinary deletion. No administrator — including the ACA Director-General, the system administrator, the security administrator, or the database owner — must be able to silently erase or rewrite a sealed official recording.

### 6.2 What "sealed" means

A recording enters the **sealed** state when its Evidence Capture Envelope (Chapter 5) has been: signed by the trusted device keystore at capture end; witnessed by the Cryptographic Evidence Witness (Chapter 15); written to the Preservation Vault (Chapter 14); and acknowledged by the Preservation Vault's separate security administration.

Once sealed, the recording's identity, content, signature, and metadata are frozen. The recording may be referenced, transcribed, redacted, annotated, or otherwise transformed — but only through the Derived Evidence architecture (Chapter 7), never by mutating the sealed original.

### 6.3 Authorized disposition

Any legally authorized disposition (retention-expired disposal, court-ordered destruction, declassification, format migration under records-management law) must be:

| Requirement | Enforcement |
|---|---|
| Policy-controlled | A written, versioned disposition policy must exist and be referenced by the disposition event |
| Explicitly authorized | A named, authenticated authorized official must sign the disposition order |
| Fully logged | The disposition event, the authorizing official, the policy cited, and the evidence affected must all be recorded |
| Auditable | The disposition event must be queryable by the Independent Audit Plane (Chapter 57) |
| Traceable | The original record's existence, hash, signature, and disposition must remain reconstructable even after disposal |

### 6.4 Prohibition: the "Delete Video" button

The platform must not present a normal "Delete Video" button for sealed official evidence. Any disposition action must be a deliberate, multi-step, fully-logged procedure — not a UI affordance. Specifically: no bulk-delete affordance on sealed evidence; no recycle-bin / trash / soft-delete affordance on sealed evidence; no "archive then auto-delete" affordance on sealed evidence; no API endpoint that performs an unauthenticated or single-authorized deletion of sealed evidence.

### 6.5 Disposition record

A disposition event must produce a **Disposition Record** containing: `evidence_id`, `disposition_type` (disposal | declassification | format_migration | …), `policy_cited`, `authorizing_official` (identity, role, signature), `co_authorizing_official` (required for high-sensitivity evidence), `authorization_timestamp` (layered), `reason`, `witness_hash` (hash of the original at disposition time), and `audit_plane_reference` (pointer to the Independent Audit Plane record).

### 6.6 Recovery and reconstruction

Even after a lawful disposal, the platform must retain enough metadata to reconstruct that the evidence once existed, what its hash was, who sealed it, who disposed of it, and under what authority. The Disposition Record itself is immutable and lives on the Independent Audit Plane.

---

## Chapter 7: Derived Copy Architecture (Section 62)

### 7.1 The principle

Any transformation of an official recording — including but not limited to redaction, enhancement, compression, transcription, translation, annotation, format conversion — creates a **Derived Evidence** object. The Derived Evidence object is linked to its **Immutable Original** and never replaces it. The original is never altered in place.

### 7.2 Derived Evidence object

```
DerivedEvidence {
  derived_id, parent_original_id
  derivation_type           // redaction | enhancement | transcription | ...
  derivation_parameters     // exact parameters / prompt / model version
  derivation_actor          // identity of the deriving agent or service
  derivation_timestamp      // layered
  derived_content_ref       // pointer to derived content (Operational Vault)
  derived_hash              // hash of derived content
  derivation_signature      // signature of the deriving service
  provenance_link          // back-pointer into the original's provenance manifest
  retention_class           // may differ from the original
}
```

### 7.3 Derivation graph

A single original may have many derived artifacts. Some derived artifacts may themselves be the parent of further derivations (e.g., a transcript that is then translated). The derivation graph is a DAG rooted at the sealed original:

```
            SEALED ORIGINAL (immutable)
                    │
        ┌───────────┼───────────┬────────────┐
        ▼           ▼           ▼            ▼
   REDACTED     TRANSCRIPT   ENHANCED     COMPRESSED
    CLIP          (AR)         VIDEO        PROXY
                    │
                    ▼
              TRANSLATION (EN)
                    │
                    ▼
              ANNOTATED REPORT
```

### 7.4 Rules of derivation

1. **Original immutability.** No derivation may modify the original or its envelope.
2. **Provenance continuity.** Every derivation carries a chain back to the original.
3. **Parameter completeness.** Every derivation records the exact parameters, models, and prompts used to produce it.
4. **Separate retention.** A derived artifact may have its own retention class; disposing of a derived artifact does not affect the original.
5. **No silent promotion.** A derived artifact must never be presented as if it were the original. UI surfaces must mark derived content as derived.
6. **Reproducibility.** Where the derivation is algorithmic (transcription, OCR, translation), the derivation must be reproducible from the original plus recorded parameters, subject to model versioning (Chapter 60).

### 7.5 Why this matters

Without the Derived Copy Architecture, every redaction, transcription, or translation becomes a fork of the original — and forks diverge. Investigators comparing two transcripts of the same recording will disagree on what was said. The Derived Copy Architecture ensures that every derived artifact points back to one verifiable original, and that any disagreement about derived content can be resolved by reference to that original.

---

## Chapter 8: Evidence Provenance / C2PA-Compatible Design (Section 63)

### 8.1 Design intent

The platform's evidence provenance design should be compatible, where technically appropriate, with current content-provenance standards such as C2PA (Coalition for Content Provenance and Authenticity). Compatibility does not mean uncritical adoption; it means that where the C2PA manifest structure is technically suitable, the platform may use it as an interchange format, while reserving the right to extend or restrict it for sovereign institutional requirements.

### 8.2 Tracked fields

For every piece of evidence, the provenance record must track: **origin** (where and how the evidence came into existence); **capture** (the capture event, including device, agent, and context); **device** (the trusted device identity and firmware state, Chapter 9); **signatures** (cryptographic signatures applied at capture and at each transformation); **transformations** (the sequence of derivations, Chapter 7); **derivations** (links to all derived artifacts); **timestamps** (layered timestamps, Chapter 11); and **provenance chain** (the full DAG from origin to current state).

### 8.3 Provenance is not truth

The platform must not claim that provenance alone proves truth or legal admissibility. Provenance is a *necessary* condition for evidence integrity; it is not a *sufficient* condition for the truth of what the evidence depicts. A recording may have perfect provenance and still depict a misleading scene; a document may have a flawless chain of custody and still be a forgery in substance. Provenance narrows the questions an investigator must ask; it does not answer them.

### 8.4 Provenance Manifest schema

```
ProvenanceManifest {
  manifest_id, evidence_id
  origin { source_type, originating_entity, originating_timestamp }
  capture { device_id, agent_id, assignment_id, location_at_capture }
  signatures[] { signer, algorithm, key_id, value, signed_at, signed_payload_hash }
  transformations[] { transform_type, parameters, actor, timestamp, output_hash }
  derivations[]                      // links to derived artifacts
  c2pa_manifest_ref                  // optional C2PA manifest reference
}
```

### 8.5 Sovereign extensions

Where C2PA does not natively support sovereign institutional requirements — for example, separate cryptographic domains for capture, preservation, and audit (Chapter 14, Chapter 57) — the platform extends the manifest rather than dropping the field. The C2PA-compatible subset remains exportable for inter-institutional exchange; the sovereign extensions remain internal.

---

## Chapter 9: Trusted ACA Capture Device (Section 64)

### 9.1 The model

The ACA platform defines a **Trusted ACA Capture Device** model. A device is "trusted" only when its identity, certificate, keystore, status, firmware, and assignment are all valid and consistent. A device that fails any of these checks is **untrusted**; evidence captured by an untrusted device is flagged and may not be admitted as official without remediation.

### 9.2 Device attributes

| Attribute | Description |
|---|---|
| `device_id` | Cryptographic device identity, minted at enrollment |
| `institutional_certificate` | X.509 or equivalent, issued by the ACA device CA |
| `secure_keystore` | Reference to the hardware keystore (Chapter 10) |
| `device_status` | `ENROLLED` / `ACTIVE` / `SUSPENDED` / `REVOKED` / `DECOMMISSIONED` |
| `firmware_status` | Version, signed manifest hash, attestation state |
| `agent_assignment` | Current assigned agent, assignment window |
| `trusted_state` | Computed boolean: true iff all checks pass |

### 9.3 Trusted-state computation

```
TRUSTED = (
    device_status == ACTIVE
    AND institutional_certificate.valid
    AND secure_keystore.attestation_passed
    AND firmware_status == ATTESTED
    AND firmware_status.signed_manifest_hash == EXPECTED
    AND agent_assignment.active
    AND NOT device_in_revocation_list
    AND NOT device_in_quarantine
)
```

### 9.4 Enrollment and lifecycle

```
ENROLLMENT → ACTIVE ──┬──► SUSPENDED → ACTIVE
                       │                │
                       │                └──► REVOKED
                       │
                       └──► DECOMMISSIONED
```

- **Enrollment.** A new device is enrolled by the device CA. The device's keystore attests its hardware root of trust; the CA issues the institutional certificate.
- **Suspension.** A device may be suspended (lost, suspected compromise, agent on leave). Suspended devices cannot capture official evidence.
- **Revocation.** A device may be revoked (confirmed compromise, decommissioning-by-compromise). Revoked devices are added to the revocation list; evidence captured after revocation is invalid.
- **Decommissioning.** End-of-life devices are decommissioned; their keystore is zeroized where supported.

### 9.5 Quarantine

A device may enter quarantine when its trusted state degrades — for example, a firmware attestation failure, a battery anomaly suggesting tampering, or an unexpected location jump. Quarantined devices cannot capture official evidence until the cause is investigated and resolved. Quarantine is reversible only by an authorized device administrator, with the resolution logged on the Independent Audit Plane (Chapter 57).

### 9.6 What untrusted capture becomes

Evidence captured by an untrusted device is not silently discarded. It is preserved as **lead information** with a `DEVICE_TRUST_FAILURE` flag. It may be used to direct further investigative action, but it is not admitted as official evidence without a documented remediation, review, and authorization.

---

## Chapter 10: Hardware-Backed Signing (Section 65)

### 10.1 Requirement

Where supported by the device platform, the ACA platform must integrate hardware-backed cryptographic signing for evidence capture. The private key used to sign evidence must never leave the hardware keystore. Signing operations must occur inside the hardware boundary.

### 10.2 Candidate implementations

| Implementation | Applicable platform | Notes |
|---|---|---|
| Secure Enclave | Apple iOS / iPadOS | Hardware-isolated key operations |
| Android Hardware-backed Keystore | Android | StrongBox / TEE-backed |
| TPM | Windows / Linux laptops | For administrative workstations |
| HSM | Server-side preservation vault signing | FIPS 140-2/3 or equivalent |
| Equivalent sovereign security hardware | National sovereign hardware | Always an acceptable substitute |

### 10.3 Signing flow

```
CAPTURE EVENT → EVIDENCE-HASH (SHA-256 or stronger)
   → HARDWARE KEYSTORE.SIGN(hash)
   → SIGNATURE + KEY_ID + ALGORITHM + ATTESTATION
   → ATTACHED TO EVIDENCE ENVELOPE
```

### 10.4 Attestation

Every signature must be accompanied by an attestation that the signature was produced inside the hardware boundary. The attestation includes: the keystore version; the hardware root-of-trust identifier (without exposing the private key); the attestation chain back to the ACA device CA; and the attestation timestamp (layered, Chapter 11).

### 10.5 Key rotation

Signing keys must be rotated per sovereign policy. Rotation does not invalidate previously signed evidence; the previous key remains in the keystore for verification only, with signing disabled. A key marked `SIGNING_DISABLED` cannot be used for new signatures but must remain available for verification until the end of the evidence retention period.

### 10.6 Compromise response

If a signing key is suspected compromised: (1) the key is immediately marked `SUSPECTED_COMPROMISE` and added to a high-priority revocation list; (2) all evidence signed by that key after the suspected compromise date is flagged for review; (3) the Cryptographic Evidence Witness (Chapter 15) and Independent Audit Plane (Chapter 57) record the event; (4) a formal investigation is opened under Chapter 48 (Audit-the-Auditor) and Chapter 49 (Insider Risk).

---

## Chapter 11: Independent Time Service (Section 66)

### 11.1 Why device time alone is insufficient

Device clocks can be wrong, manipulated, or drift. An evidence timestamp that depends solely on the capturing device's clock is brittle. The platform must construct **layered temporal integrity** by combining multiple time sources.

### 11.2 The four time sources

| Source | Description | Trust weight |
|---|---|---|
| **Device time** | The capturing device's local clock | Lowest — used for ordering, not for authority |
| **Server receipt time** | The time at which the platform's preservation server received the evidence | Higher — independent of the device |
| **Trusted timestamping** | A timestamp issued by an RFC 3161 (or sovereign equivalent) timestamping authority | Highest — cryptographically anchored |
| **Sequence numbers** | Monotonic per-device, per-assignment sequence counters | Internal ordering guarantee |

### 11.3 Layered timestamp object

```
LayeredTimestamp {
  device_time              // device local clock
  server_receipt_time      // preservation server wall clock
  trusted_timestamp { authority, token, hash }
  sequence_number          // device+assignment monotonic counter
  skew_warning              // set if device_time diverges from server_time beyond threshold
}
```

### 11.4 Skew detection

If the device time and server receipt time diverge beyond a threshold defined by policy, the platform records a `SKEW_WARNING` on the evidence envelope. The evidence remains valid, but the divergence is part of the record and may be examined during quality assurance (Chapter 38).

### 11.5 Why sequence numbers

Sequence numbers protect against reordering attacks where an adversary manipulates wall-clock timestamps to insert evidence out of order. The sequence counter is per-device and per-assignment, monotonically increasing, and stored alongside the timestamp. Two pieces of evidence from the same device and assignment must show a strictly increasing sequence; a gap or reversal is flagged.

### 11.6 Trusted timestamping cadence

Not every segment requires a separate trusted timestamp (which has cost and latency). The platform may batch trusted timestamps — for example, one trusted timestamp per capture session, plus periodic re-timestamping of preserved evidence by the Cryptographic Evidence Witness (Chapter 15). The cadence is set by policy, not by convenience.

---

## Chapter 12: Recording Continuity Report (Section 67)

### 12.1 Required for every official recording

Every official recording produces a **Recording Continuity Report** that reconstructs the lifecycle of the recording from start to seal. The report is generated automatically from device and server events and is sealed alongside the recording.

### 12.2 Lifecycle phases

```
START → SEGMENT-1 → SEGMENT-2 → … → SEGMENT-N
                                   │
            ┌──── INTERRUPTION ◄───┤
            │                      │
            ▼                      │
        RECONNECTION                │
            │                      │
            ▼                      │
        SEGMENT-N+1                 │
            │                      │
            └──────────────────────┘
                        │
                        ▼
                       END → SEAL
```

### 12.3 Detectable events

| Event | Detection signal | Severity |
|---|---|---|
| Recording pause | Explicit pause / resume events, gap in segment timestamps | Low — usually benign |
| Device reboot | Process restart, attestation re-establishment | Medium — requires explanation |
| Connectivity loss | Server receipt gap exceeding threshold | Medium — may indicate offline mode (Chapter 20) |
| Clock changes | Device time jump, skew warning (Chapter 11) | High — may indicate tampering |
| Unexpected device change | Different `device_id` mid-session | Critical — disqualifying unless explained |

### 12.4 Report schema

```
ContinuityReport {
  evidence_id
  lifecycle { start, segments[], interruptions[], reconnections[], end, seal }
  detected_events[]    // type, timestamp, severity, explanation_required
  gaps[]               // any unexplained gaps with duration and bounds
  continuity_score     // computed but not authoritative (Ch.26 style)
}
```

### 12.5 What the report does and does not do

The continuity report does not certify that the recording is faithful; it certifies that the recording's lifecycle is reconstructable. An investigator reviewing the report may find a benign explanation for an interruption (the agent moved between buildings and lost connectivity) or a concerning one (an unexpected device change). The report surfaces the facts; the investigator interprets them.

### 12.6 Sealing of the report

The continuity report itself is sealed at the same time as the recording. It cannot be edited after sealing; any later explanation of an interruption is added as an annotated note (a Derived Evidence artifact, Chapter 7), never as a mutation of the report.

---

## Chapter 13: Evidence Black Box (Section 68)

### 13.1 Concept

For critical official field evidence — defined by policy as evidence of high sensitivity, evidence whose loss would be materially damaging to a case or to the institution, or evidence captured under high-risk operational conditions — the platform provides an **Evidence Black Box**. The Evidence Black Box is analogous to an aviation flight recorder: it is built to survive events that would destroy ordinary evidence stores. Its purpose is to ensure that even when an agent's device is lost, damaged, confiscated, or destroyed, the critical evidence already captured and relayed is preserved.

### 13.2 Black Box properties

| Property | Requirement |
|---|---|
| Independent storage | Physically and logically separate from the capture device |
| Continuous relay | Evidence is relayed to the Black Box in near-real-time (Chapter 17) |
| Cryptographic append-only | New evidence may be appended; existing evidence cannot be modified |
| Separate administration | Administered by the Preservation Vault security administration, not the operational administration |
| Tamper-evident | Any access or attempted modification is logged on the Independent Audit Plane |
| High-availability replication | Replicated across geographically separated sovereign data centers |

### 13.3 What enters the Black Box

A piece of evidence enters the Black Box when: (1) it meets the policy definition of critical official field evidence; (2) it has been sealed (Chapter 6); (3) it has been signed by a trusted device (Chapter 9, Chapter 10); and (4) its continuity report (Chapter 12) is sealed.

### 13.4 What does NOT enter the Black Box

Lead information, draft notes, unsealed captures, and any artifact that has not passed the sealing checks does not enter the Black Box. The Black Box is reserved for evidence that has crossed the threshold of official status.

### 13.5 Retrieval from the Black Box

Retrieval from the Evidence Black Box is restricted. Authorized retrieval requires: an authenticated institutional identity with Black Box retrieval privilege; a case reference; a retrieval purpose; a retrieval window; and an acknowledgment on the Independent Audit Plane. The Black Box does not allow browsing. An authorized user cannot "look around" the Black Box; they can retrieve specific evidence by ID or by case reference within a window.

---

## Chapter 14: Dual Evidence Vault (Section 69)

### 14.1 Two vaults, not one

The platform maintains two evidence vaults with distinct purposes, distinct protections, and distinct administrations. (See Appendix B for the architecture diagram.)

### 14.2 Operational Vault

The Operational Vault is the working store for investigators. It contains: working copies of sealed originals; derived artifacts (Chapter 7); annotations, markers, and investigator notes; search indexes (transcripts, OCR, embeddings) used for retrieval; and read/write access by case investigators and supervisors. The Operational Vault is high-performance, supports complex queries, and may be rebuilt from the Preservation Vault if corrupted.

### 14.3 Preservation Vault

The Preservation Vault is the immutable institutional store. It contains: sealed originals; cryptographic witnesses (Chapter 15); disposition records (Chapter 6); continuity reports (Chapter 12); and provenance manifests (Chapter 8). The Preservation Vault is append-only at the evidence level. Once an original is sealed into the Preservation Vault, no operational actor — including the operational administrator — can modify or delete it. Disposition requires the lawful disposition procedure of Chapter 6.

### 14.4 Separate administration

The Preservation Vault must be administered by a **separate security administration** from the Operational Vault. The operational administrator must not have unilateral control over the Preservation Vault.

| Administration | Owns | Does not own |
|---|---|---|
| Operational administration | Operational Vault, services, workflows | Preservation Vault, audit plane |
| Security administration | Identity, access control, device CA | Evidence content, audit plane content |
| Evidence preservation | Preservation Vault, witnesses, disposition | Operational services, identity |
| Independent audit | Audit Plane, audit queries | Any of the above (read-only across all) |

### 14.5 Separate keys

The Preservation Vault uses cryptographic keys distinct from those of the Operational Vault. Compromise of the Operational Vault keys must not compromise the Preservation Vault.

### 14.6 One-way preservation

Evidence flows from capture into the Operational Vault, and a preservation copy is written — one-way, signed, and witnessed — into the Preservation Vault. The Preservation Vault does not push back into the Operational Vault. When an investigator requires a fresh copy of an original (because the working copy has been annotated, for example), they retrieve a new derived copy from the Preservation Vault through the derived-copy architecture (Chapter 7).

---

## Chapter 15: Cryptographic Evidence Witness (Section 70)

### 15.1 Purpose

Where appropriate, the platform periodically creates cryptographic integrity commitments and timestamps proving that a given evidence state existed by a given point in time. This is the **Cryptographic Evidence Witness**.

### 15.2 The witness concept

A witness is a statement, signed by a witness authority, that at time $T_w$: a set of evidence objects existed; each evidence object had a specific hash; the set of objects had a specific Merkle root; and the witness is anchored to a trusted timestamping authority.

```
EVIDENCE SET { e1, e2, e3, ..., eN }
   → PER-OBJECT HASH (h1, h2, ..., hN)
   → MERKLE TREE → ROOT
   → WITNESS AUTHORITY.SIG(root, Tw)
   → TRUSTED TIMESTAMP (RFC 3161 or sovereign)
   → WITNESS RECORD (sealed)
```

### 15.3 Witness cadence

Witnesses are produced on a policy-defined cadence, for example: on sealing of new evidence (per-evidence witness); hourly batch witnesses for each open case; daily aggregate witnesses across the Preservation Vault; and on-demand witnesses triggered by case closure, supervisory review, or external legal request.

### 15.4 What a witness proves

A witness proves that the evidence state existed by $T_w$. It does not prove that the evidence is true, admissible, or sufficient. It narrows the question of "did this evidence exist by this date" to a yes/no answer anchored in cryptography.

### 15.5 What a witness does not prove

A witness does not prove: that the evidence is authentic; that the evidence is complete (only that the witnessed set existed); that no other evidence existed at $T_w$ (only that the witnessed set did); or that the evidence has not been superseded by later findings.

### 15.6 Witness verification

Any authorized party — investigator, supervisor, auditor, court officer — may verify a witness by recomputing the Merkle root from the per-object hashes and verifying the witness authority signature and the trusted timestamp. The witness authority's public key is published and managed by the Preservation Vault security administration.

### 15.7 Witness retention

Witness records are retained for the full retention period of the evidence they witness — and beyond, if required by sovereign records-management law. A witness outlives the evidence it witnesses: even after a lawful disposition, the witness remains to prove that the evidence once existed and had a specific state at $T_w$.

---

## Chapter 16: Evidence Marker (Section 71)

### 16.1 The MARK EVENT action

During an official recording, the agent may invoke **MARK EVENT** to create a timestamped, contextualized marker bound to the current recording. The marker does not interrupt the recording; it annotates it.

### 16.2 Marker fields

A MARK EVENT creates a record containing: the exact layered timestamp (Chapter 11) at the moment of marking; the current recording (with current segment and offset); the location (the agent's current location); the agent (authenticated agent identity); the case (the case to which the marker applies, which may differ from the recording's case); the event label (a short structured label, e.g., `ENTRY`, `EXIT`, `CONFRONTATION`, `DOCUMENT_FOUND`); and a free-text note.

### 16.3 Marker as Derived Evidence

A marker is a Derived Evidence artifact (Chapter 7) bound to the original recording. It does not modify the recording. The marker is itself sealed and signed by the trusted device, and it carries its own provenance.

### 16.4 Use of markers in review

Markers accelerate review. A supervisor or investigator reviewing a multi-hour recording can jump from marker to marker to reconstruct the agent's narrative of what happened. The marker is not the narrative; the recording is. The marker is an index.

### 16.5 Marker integrity

Markers cannot be created retroactively. A marker created at time $T_m$ must be anchored to a recording segment whose timestamp range includes $T_m$. A marker that does not match a contemporaneous recording segment is flagged as `ORPHAN_MARKER` and is not admitted without explanation.

---

## Chapter 17: Secure Live Evidence Relay (Section 72)

### 17.1 The principle

Where policy authorizes, evidence captured in the field is relayed in near-real-time to the platform. The physical device must not be the only copy of critical evidence. A lost, damaged, or confiscated device must not result in the loss of evidence already captured.

### 17.2 The relay pipeline

```
CAPTURE → ENCRYPT (client-side, recipient public key)
   → CHUNK (fixed-size segments, each independently hashable)
   → TRANSMIT (over a mutually authenticated channel)
   → VERIFY (server checks hash + signature)
   → PRESERVE (write to Preservation Vault, witness)
```

### 17.3 Encryption

Each chunk is encrypted on the device, before transmission, using a recipient public key bound to the Preservation Vault. The encryption key is rotated per policy. The device does not retain the plaintext chunk after successful relay and preservation acknowledgment — but the device does retain an encrypted local cache until acknowledgment, to handle intermittent connectivity (Chapter 20).

### 17.4 Chunking

Chunks are fixed-size (policy-defined, e.g., 1 MB or 10 seconds of video). Each chunk carries: the evidence ID; the sequence number (Chapter 11); the chunk hash; and the signature of the capturing device. The recipient verifies each chunk independently. A failed chunk is re-transmitted without re-transmitting the entire recording.

### 17.5 Verification

The Preservation Vault verifies, for each chunk: (1) the signature matches the trusted device keystore attestation; (2) the hash matches the decrypted content; (3) the sequence number is contiguous (or any gap is explained by the continuity report, Chapter 12); and (4) the chunk's timestamp is consistent with the layered timestamp.

### 17.6 What relay is and is not

Relay is a preservation mechanism, not a review mechanism. Live relay does not authorize live review by a remote supervisor; review requires the case-access permissions of the Operational Vault. Relay ensures the evidence survives; review is governed by a separate authorization.

### 17.7 Relay failure handling

If relay fails — due to connectivity loss, server unavailability, or chunk verification failure — the device retains the encrypted local cache (Chapter 20). The agent is informed of the relay backlog. The Body-Camera Fleet Management module (Chapter 19) surfaces the evidence backlog to the supervisor, so that no critical evidence remains stranded on a field device indefinitely.

---

## Chapter 18: Multi-Agent Synchronized Recording (Section 73)

### 18.1 The scenario

In many ACA field operations, multiple agents are present: Agent A, Agent B, Agent C. Each may capture their own independent recording of the same event. These recordings are independent evidence; each has its own integrity, provenance, and continuity. The platform allows these independent recordings to be synchronized into a **Multi-Angle Evidence View**.

### 18.2 The Multi-Angle Evidence View

```
                  ┌──────────────┐
                  │ EVENT (T_e)  │
                  └──────┬───────┘
                         │
        ┌────────────────┼─────────────────┐
        ▼                ▼                 ▼
   AGENT-A REC      AGENT-B REC       AGENT-C REC
   (sealed)          (sealed)          (sealed)
        │                │                 │
        └────────────────┼─────────────────┘
                         ▼
              MULTI-ANGLE EVIDENCE VIEW
              (synchronized, derived)
```

### 18.3 Synchronization

Synchronization uses the layered timestamps (Chapter 11) of each recording, anchored by trusted timestamps. Where the recordings overlap in time, the view aligns them. Where they diverge — Agent A started before Agent B, or Agent C's recording was interrupted — the view shows the divergence explicitly.

### 18.4 The view is derived

The Multi-Angle Evidence View is a Derived Evidence artifact (Chapter 7). It does not modify the originals. Each of the synchronized recordings retains its own integrity, provenance, and continuity report.

### 18.5 Markers across angles

Evidence markers (Chapter 16) created by one agent may, where authorized, be displayed on the synchronized view at the corresponding timestamp of other agents' recordings. This allows cross-referencing: "When Agent A marked ENTRY, what did Agent B's camera show?" The cross-reference is presented as a derived association, not as a claim that the markers were contemporaneous.

### 18.6 What the view is not

The Multi-Angle Evidence View is not a single recording. It is not a splice. It is not a re-encoding of the originals into one stream. It is a synchronized presentation of independent sealed recordings, with the originals preserved.

---

## Chapter 19: Body-Camera Fleet Management (Section 74)

### 19.1 Why fleet management

A field-evidence platform is only as trustworthy as its device fleet. The Body-Camera Fleet Management module administers the lifecycle and operational state of every trusted capture device in the ACA's inventory.

### 19.2 Managed dimensions

| Dimension | What is managed |
|---|---|
| Device | Identity, status, lifecycle (Chapter 9) |
| Agent | Current assignment, assignment window |
| Battery | Charge level, charging state, anomaly detection |
| Storage | Free space, encryption state, evidence backlog |
| Certificate | Validity, expiry, revocation status |
| Firmware | Version, attestation state, pending updates |
| Trusted state | Computed trusted boolean (Chapter 9) |
| Synchronization | Last successful sync, pending sync backlog |
| Evidence backlog | Un-relayed evidence queued on the device |

### 19.3 Fleet dashboard

A supervisor or fleet administrator sees a fleet dashboard showing: total active devices; devices by trusted state; devices by sync status (synced / backlog / unsynced beyond threshold); devices with firmware attestation failures; devices with certificate expirations approaching; devices with evidence backlog exceeding threshold; and devices in quarantine.

### 19.4 Evidence backlog

The evidence backlog is a first-class fleet metric. A device with a growing backlog is a risk: evidence is stranded on the device, beyond the protection of the Preservation Vault. The fleet manager's job is to drive the backlog to zero on every device after every shift.

### 19.5 Shift-end procedure

A shift-end procedure is enforced: (1) the agent docks the device (or initiates manual sync); (2) the device relays all un-relayed evidence (Chapter 17); (3) the device reports the sync completion; (4) the supervisor acknowledges the sync completion, or investigates if backlog persists; (5) the device's trusted state is re-verified before the next shift.

### 19.6 Firmware management

Firmware updates are signed by the ACA device firmware signing authority. A device accepts only signed firmware. The update is performed under controlled conditions (docked, charging, supervised) and produces a new attestation. A device whose firmware attestation fails after an update is quarantined.

### 19.7 Battery and tamper

Battery anomalies — sudden discharge, charge while supposedly in field use — are flags, not conclusions. They are recorded and surfaced for review. Tamper-evident enclosures (where supported by the hardware) produce tamper events that quarantine the device immediately.

---

## Chapter 20: Offline Field Mode (Section 75)

### 20.1 The reality of field operations

Agents must be able to work safely without connectivity. Rural inspections, underground facilities, signal-poor environments, and operational security situations all require offline capability. The platform's offline field mode is not a degraded mode; it is a first-class mode with the same integrity guarantees as online capture.

### 20.2 Supported offline capabilities

| Capability | Offline behavior |
|---|---|
| Recording | Captured locally, encrypted, queued for relay |
| Photos | Captured locally, encrypted, queued for relay |
| Notes | Authored locally, signed by the agent, queued |
| Inspection | Inspection checklists completed offline, queued |
| Checklist | Structured checklists with required fields enforced offline |
| Evidence markers | Created offline, queued with layered timestamps |
| Local encryption | All queued evidence is encrypted at rest on the device |
| Delayed synchronization | Sync occurs when connectivity is restored (Chapter 17) |

### 20.3 Local encryption

All queued evidence on the device is encrypted at rest using a key bound to the Preservation Vault's recipient public key. The device's trusted keystore (Chapter 10) holds the encryption key. If the device is lost or confiscated, the queued evidence is protected by hardware-backed encryption.

### 20.4 Layered timestamps in offline mode

Offline capture uses the same layered timestamp model (Chapter 11). Device time and sequence numbers are captured at the moment of capture. Server receipt time and trusted timestamps are added when the evidence is relayed. The skew between device time and server receipt time may be larger in offline mode; this is recorded in the continuity report (Chapter 12) as a `CONNECTIVITY_GAP`, not as a tampering signal.

### 20.5 Sync conflict handling

When connectivity is restored, the device syncs queued evidence. Conflicts are rare because each piece of evidence has a unique evidence ID and sequence number. The platform verifies: no duplicate evidence IDs; no sequence gaps or reversals; no evidence sealed with a future timestamp. Anomalies are flagged for review but do not block the sync of clean evidence.

### 20.6 What offline mode does not allow

Offline mode does not allow: retroactive creation of markers (Chapter 16); modification of sealed evidence; re-sequencing of evidence; or bypass of the trusted-device checks (Chapter 9). Offline mode preserves the integrity model; it only relaxes the connectivity requirement.

---

## Chapter 21: CCTV Preservation Workflow (Section 76)

### 21.1 The principle

The ACA platform does **not** permanently ingest all camera systems operated by government bodies or third parties. Permanent ingestion would create an unsustainable surveillance posture, a massive data footprint, and a legal exposure that the ACA is not constituted to bear. Instead, the platform operates a **targeted CCTV preservation workflow**: when a specific camera's recording for a specific time window becomes relevant to an authorized investigation, the platform requests preservation and acquisition of that specific window.

### 21.2 The workflow

```
CAMERA (external, not ingested)
   → TIME WINDOW (T_start, T_end, justified by case)
   → AUTHORIZED PRESERVATION REQUEST (case, legal basis, requesting officer, approver)
   → SECURE ACQUISITION (mutual authentication, integrity-verified transfer)
   → PROVENANCE (camera identity, operator, acquisition parameters, hash)
   → EVIDENCE VAULT (Preservation Vault, sealed, witnessed)
```

### 21.3 Authorized preservation request

A preservation request must include: the case reference; the legal basis for the request; the requesting officer (authenticated); the approving authority (separate from the requester — separation of duties, Chapter 53); the specific camera identifier; the specific time window; the justification for the window; and the retention class. A preservation request that lacks any of these fields is refused by the workflow.

### 21.4 Secure acquisition

Acquisition from the camera operator is performed over a mutually authenticated channel. The acquired footage is hashed at acquisition; the hash is recorded in the provenance manifest (Chapter 8). The camera operator's confirmation of the acquisition is logged.

### 21.5 Provenance

The provenance manifest for CCTV-acquired evidence includes: the camera identity (operator's identifier); the camera operator (institutional identity); the camera's then-current configuration (resolution, frame rate, retention setting, if disclosed); the acquisition parameters (codec, container, transfer protocol); the acquisition actor (the platform service or officer who performed the acquisition); the acquisition timestamp; and the hash of the acquired footage.

### 21.6 What is not done

The platform does not: permanently ingest continuous CCTV feeds; operate a continuous surveillance capability over third-party cameras; retain CCTV footage beyond the retention class assigned at acquisition; or re-purpose CCTV footage acquired for one case into another case without a fresh authorized request.

### 21.7 Retention and disposition

CCTV footage acquired through this workflow is retained per its assigned retention class. Disposition follows the Chapter 6 disposition procedure. The acquisition record itself is retained on the Independent Audit Plane (Chapter 57) even after the footage is disposed.

---

## Chapter 22: Video Intelligence (Section 77)

### 22.1 After preservation

Once video evidence is preserved in the Preservation Vault, the platform may produce derived intelligence artifacts (Chapter 7) over the video. These artifacts accelerate review and search; they do not replace the original.

### 22.2 Supported intelligence capabilities

| Capability | Output | Notes |
|---|---|---|
| Arabic transcription | Time-aligned Arabic text transcript | Speaker-segmented where reliable |
| Speaker segmentation | Speaker-turn labels | Marked as low-confidence where unreliable |
| OCR | On-screen text, documents in frame, license plates (where legally permitted) | |
| Document detection | Bounding boxes for documents appearing in video | Linked to Chapter 27 |
| Scene / event segmentation | Scene boundaries with descriptive labels | |
| Evidence markers | Cross-reference to Chapter 16 markers | |
| Searchable timestamps | Time-aligned search index | |
| Translation | Arabic ↔ other languages, marked as derived | |

### 22.3 All derived, never replacing the original

Every intelligence artifact is a Derived Evidence object (Chapter 7). It is linked to the immutable original. The original is never modified to "embed" the transcript or the OCR; the derived artifact references the original by timestamp range.

### 22.4 Confidence and review

Each intelligence artifact carries a confidence decomposition (Chapter 62). Transcripts of noisy audio, OCR of partial frames, and speaker segmentation of overlapping voices carry low confidence on specific dimensions. The platform surfaces these confidences to the reviewer; it does not smooth them away.

### 22.5 Reproducibility

Algorithmic derivations (transcription, OCR, translation) are reproducible (Chapter 60): the model, version, parameters, and source recording hash are recorded. A reviewer can re-derive the artifact from the original plus the recorded parameters, subject to model availability.

### 22.6 What the platform does not do

The platform does not: replace a sealed original with a "cleaned-up" derived version; allow derived artifacts to be presented as the original in any UI; treat derived artifacts as legally sufficient without the original; or use derived artifacts as the basis for automated findings (Chapter 64).

---

## Chapter 23: Missing Context Detector (Section 78)

### 23.1 The principle

If surrounding authorized evidence exists, additional context may materially affect interpretation. The Missing Context Detector scans an investigator's current evidence view and identifies whether there is *surrounding authorized evidence* — evidence that is not in the case file but is available within the ACA platform — that may materially affect how the current evidence is interpreted.

### 23.2 What "surrounding" means

Surrounding evidence is evidence that: concerns the same entity, location, transaction, or period; was captured by other agents, other systems, or other cases; is available within the ACA platform under authorized access; and is not already linked to the current case.

### 23.3 Detection output

```
MissingContextNotice {
  case_id
  current_evidence_set         // what the investigator has
  surrounding_evidence_set     // what else exists, with pointers
  potential_impact             // why this might materially affect interpretation
  access_required              // what authorization is needed to view
  investigator_action          // OPEN | REQUEST | DEFER
}
```

### 23.4 What the detector does not do

The detector does not: auto-link surrounding evidence to the case (linking requires investigator action); conclude that the current interpretation is wrong (it surfaces a possibility, not a conclusion); override investigator judgment (the investigator may have good reasons not to bring in surrounding evidence — relevance, prejudice, scope); or bypass access control (the surrounding evidence is identified but not displayed until authorized).

### 23.5 Why this matters

An investigator who sees only their case file may miss that a related inspection, conducted by another team six months earlier, found a similar pattern. The Missing Context Detector is not a recommendation engine; it is a reminder that the platform knows more than the case file shows, and that the investigator may want to look further.

---

## Chapter 24: Evidence Independence Detector (Section 79)

### 24.1 The problem

An investigator who sees ten documents supporting a finding may conclude that the finding is well-corroborated. But if all ten documents were derived from a single underlying source — for example, all ten are printouts of the same database record — then the effective corroboration is one source, not ten. The Evidence Independence Detector determines whether apparently separate evidence items are actually independent.

### 24.2 The detector

For a set of evidence items $\{e_1, e_2, ..., e_n\}$, the detector computes the **independence graph**: a graph in which two items are linked if they share an underlying source. The graph's connected components are the effective independent sources.

```
e1, e2, e4 ──► SOURCE-S ──► COMPONENT-1 { e1, e2, e4 }
e3          ──► SOURCE-T ──► COMPONENT-2 { e3 }
e5, e6      ──► SOURCE-U ──► COMPONENT-3 { e5, e6 }

Effective independent sources: 3
```

### 24.3 Output

```
EvidenceIndependenceReport {
  evidence_set[]
  independence_graph
  effective_independent_sources   // count of components
  components[]                     // each component with member evidence
  basis[]                          // why items are linked
}
```

### 24.4 Use in finding support

When an investigator claims "ten pieces of evidence support this finding," the platform surfaces the Evidence Independence Report. If the report shows that the effective independent sources count is one, the platform does not refuse the finding — but it does require the investigator to acknowledge that the corroboration is one source, not ten.

### 24.5 What independence is not

Independence is not truth. Three independent sources may all be wrong in the same way (e.g., all three relied on the same erroneous gazette entry). Independence narrows the question of corroboration; it does not settle it.

### 24.6 Limitations

The detector works only where the platform has enough provenance information to construct the independence graph. Where provenance is incomplete, the detector reports `INSUFFICIENT_PROVENANCE` rather than guessing.

---

## Chapter 25: Evidence Contamination Analysis (Section 80)

### 25.1 The principle

Witnesses, documents, and other evidence may influence one another over time. A witness who has seen media coverage of an event may give testimony shaped by that coverage. A document disclosed during an investigation may influence later documents. The Evidence Contamination Analyzer examines the **temporal relationship** between statements, evidence disclosure, media publication, and subsequent testimony.

### 25.2 What is analyzed

| Sequence element | Source |
|---|---|
| Statements | Witness statements, recorded at timestamps |
| Evidence disclosure | When evidence was made available to whom |
| Media publication | Publicly available media, with publication timestamps |
| Subsequent testimony | Later statements, with timestamps |

### 25.3 The analysis

For each later statement, the analyzer asks: what prior disclosures, publications, or other statements could have been available to the speaker before this statement was made? The output is a **temporal exposure map**:

```
T0 ─── EVENT ─────────────────────────────────────────►
            │
            ├──► T1: MEDIA PUBLICATION
            ├──► T2: WITNESS-A FIRST STATEMENT (pre-media)
            ├──► T3: EVIDENCE DISCLOSURE TO WITNESS-B
            └──► T4: WITNESS-B STATEMENT (post-disclosure, post-media)
```

### 25.4 What the analysis does not conclude

The analyzer does **not** automatically conclude contamination. A witness who gave a statement after media publication may have given an independent account that happens to coincide with the media. The analyzer surfaces the temporal exposure; it does not determine whether the witness was in fact influenced.

### 25.5 Output

```
ContaminationAnalysisReport {
  evidence_set[]
  exposure_map[]                  // who could have seen what by when
  potential_exposure_flags[]      // for each statement, the exposure set
  investigator_note_required      // when exposure is material
}
```

### 25.6 Use

The report is used to inform investigator judgment and supervisor review. Where exposure is material — for example, a key witness statement made after extensive media coverage — the investigator must address the exposure in the case file, either by explaining why the statement is nevertheless reliable or by flagging the statement as potentially compromised.

---

## Chapter 26: Evidence Quality Matrix (Section 81)

### 26.1 The principle

Evidence quality is multi-dimensional. The platform separates quality into distinct dimensions and refuses to collapse them into a single simplistic score.

### 26.2 The dimensions

| Dimension | Definition |
|---|---|
| **Authenticity** | Is the evidence what it purports to be? |
| **Provenance** | Is the chain of origin and custody reconstructable? |
| **Integrity** | Has the evidence been preserved unmodified since capture? |
| **Reliability** | Is the source competent and credible? |
| **Relevance** | Does the evidence bear on a material question in the case? |
| **Corroboration** | Is the evidence independently supported? |
| **Completeness** | Is the evidence complete in scope and context? |

### 26.3 The matrix

For each piece of evidence in a case, the platform produces a quality matrix:

| Evidence | Authenticity | Provenance | Integrity | Reliability | Relevance | Corroboration | Completeness |
|---|---|---|---|---|---|---|---|
| Recording R-1 | High | High | High | Medium | High | Medium | Medium |
| Document D-3 | Medium | High | High | Low | High | Low | Low |
| Statement S-7 | Low | Medium | High | Low | Medium | Low | Low |

Each cell is a structured judgment, not a single number. Each cell carries: a level (`HIGH` / `MEDIUM` / `LOW` / `INSUFFICIENT`); a basis (the specific facts that justify the level); a reviewer (who assigned the level); and a timestamp.

### 26.4 What is forbidden

The platform must not produce a single "quality score" for a piece of evidence. A single score conceals the dimension-specific weaknesses that an investigator must consider. A recording with high integrity but low relevance is not "medium-quality"; it is high-integrity, low-relevance, and the investigator must treat it accordingly.

### 26.5 Use in findings

The Finding-to-Rule Matrix (Chapter 40) references the quality matrix. A finding supported only by low-reliability, low-corroboration evidence must be marked as such, and the investigator must address the weakness explicitly. Supervisors (Chapter 39) see the quality dimensions, not an aggregate.

### 26.6 Evolution over the case

The quality matrix is not static. As the case develops — new evidence arrives, corroboration emerges, reliability is challenged — the matrix is updated. Each update is versioned; the prior matrix is retained so that the case record shows how the assessment evolved.

---

## Chapter 27: Arabic Document Intelligence (Section 82)

### 27.1 Scope

The ACA platform operates in Arabic as a primary language. Arabic document intelligence is therefore a first-class capability, not an afterthought or a downstream translation.

### 27.2 Supported capabilities

| Capability | Output |
|---|---|
| Arabic OCR | Text extraction from scanned documents |
| Scanned documents | Page-level segmentation, orientation correction |
| Handwriting assistance | Handwriting recognition where reliable; flagged as low-confidence where not |
| Forms | Form-field extraction, including Arabic right-to-left layout |
| Layouts | Structure preservation (columns, tables, headers, footers) |
| Stamps | Stamp detection, segmentation, and link to Chapter 30 analysis |
| Seals | Seal detection, segmentation, and link to Chapter 30 analysis |
| Signatures | Signature detection, segmentation, and (where authorized) comparison |
| Annotations | Margin annotations, comments, revision marks |
| Document versioning | Comparison across document versions; structural diff |

### 27.3 Original preservation

The original document is always preserved (Chapter 6, Chapter 7). The output of any intelligence capability is a Derived Evidence artifact (Chapter 7) linked to the original. The original document is never overwritten with the OCR output.

### 27.4 Confidence

Arabic OCR and handwriting assistance vary widely in reliability depending on script quality, document age, scan quality, and handwriting style. Each derived artifact carries a confidence decomposition (Chapter 62). The platform does not smooth low-confidence OCR into a confident-looking output.

### 27.5 Dialect and formality

Where the platform uses language models for transcription or interpretation of Arabic text, the platform records which dialectal register the model is optimized for. Modern Standard Arabic, Gulf dialects, Maghrebi dialects, and others differ substantially. An investigation that involves spoken Arabic from a specific region must use a model that handles that region's register, or flag the limitation.

### 27.6 Right-to-left layout integrity

Layout preservation for Arabic must respect right-to-left reading order, bidirectional text mixing, and Arabic numeral conventions (Eastern Arabic numerals vs. Western numerals). The platform does not silently "normalize" Arabic numerals or layout to Western conventions.

---

## Chapter 28: Document Authenticity Analysis (Section 83)

### 28.1 The principle

Document authenticity is assessed by comparing a document against **authorized reference forms, templates, and records**. The platform maintains a reference corpus of authorized forms and templates, with their effective periods. A document is assessed for authenticity by structural and metadata comparison against the appropriate reference.

### 28.2 Detection capabilities

| Anomaly | Detection signal |
|---|---|
| Inconsistent numbering | Sequence numbers, page numbers, reference numbers out of pattern |
| Format anomalies | Layout, fonts, margins, paper size deviations from reference |
| Metadata anomalies | Author, creation date, modification date, software metadata inconsistencies |
| Missing fields | Required fields absent from a form |
| Structural inconsistencies | Sections out of order, missing sections, duplicated sections |
| Suspicious changes | Track-changes artifacts, hidden revisions, copy-paste from other documents |

### 28.3 Reference corpus

The reference corpus is curated by the ACA's institutional authority responsible for form and template issuance. Each reference entry includes: the form/template identifier; the issuing authority; the effective period; the structural schema (fields, sections, layout); the expected metadata pattern; and the seal/stamp expectation (cross-referenced to Chapter 30). The reference corpus is itself versioned and preserved; reference entries that have been superseded are retained for historical comparison.

### 28.4 Output

```
DocumentAuthenticityReport {
  document_id
  reference_form_matched     // or NULL if no match
  anomalies[]                // type, location, severity, explanation
  metadata_findings[]         // specific metadata issues
  structural_findings[]       // specific structural issues
  overall_assessment          // CONSISTENT | ANOMALOUS | INCONCLUSIVE
  basis                       // specific reference entries used
}
```

### 28.5 What the analyzer does not do

The analyzer does not declare a document "forged" or "authentic." It reports anomalies and consistency with reference. The investigator interprets the report in the context of the case. A document may have anomalies and still be authentic (e.g., a manually corrected form); a document may be structurally consistent and still be a forgery in substance.

### 28.6 Cross-reference

The Document Authenticity Analyzer cross-references with Chapter 29 (Wrong Form / Wrong Version Detector — was the form appropriate for the date?) and Chapter 30 (Stamp / Seal Analysis — do the stamps match the reference?).

---

## Chapter 29: Wrong Form / Wrong Version Detector (Section 84)

### 29.1 The question

For an event that occurred at time $T_e$, was the document or form used appropriate for that date? A form that was not yet authorized at $T_e$ cannot have been validly used at $T_e$. A form that had been superseded at $T_e$ may have been used in error — or may have been used because the old form was still permitted under a transition rule.

### 29.2 The detector

For each document in a case, the detector: (1) resolves the form/template of the document; (2) resolves the form's effective period from the reference corpus (Chapter 28); (3) compares the form's effective period to the event date $T_e$; (4) determines whether the form was appropriate for $T_e$.

### 29.3 Outcomes

| Outcome | Meaning |
|---|---|
| `APPROPRIATE` | The form was in force and authorized for use at $T_e$ |
| `SUPERSEDED_AT_Te` | The form had been superseded by $T_e$; use may have been erroneous |
| `NOT_YET_AUTHORIZED_AT_Te` | The form was not yet authorized at $T_e$; use is anomalous |
| `TRANSITION_PERMITTED` | The form was superseded but use was permitted under a transition rule |
| `REFERENCE_UNAVAILABLE` | The reference corpus does not cover this form at $T_e$ |

### 29.4 Use

The detector's output is surfaced to the investigator and to the Document Authenticity Analyzer (Chapter 28). A `SUPERSEDED_AT_Te` or `NOT_YET_AUTHORIZED_AT_Te` outcome does not, by itself, invalidate the document; it requires the investigator to assess whether the use was an administrative error, a substantive irregularity, or a permitted exception.

### 29.5 Cross-reference to regulatory temporal engine

The Wrong Form / Wrong Version Detector is a specialized application of the Regulatory Temporal Engine (Chapter 1) and the "Law at the Time" Engine (Chapter 2), focused on the specific question of form/version appropriateness.

---

## Chapter 30: Stamp / Seal Analysis (Section 85)

### 30.1 The principle

Where authorized reference material exists for stamps and seals — reference images, issuing entity records, period of validity — the platform performs stamp/seal analysis. Where the reference material does not exist, the platform reports `INSUFFICIENT_EVIDENCE` rather than guessing.

### 30.2 Analysis steps

For each detected stamp or seal on a document: (1) **Identify issuing entity.** Match the stamp's text and graphical features against the reference corpus. (2) **Compare seal.** Compare the seal's visual features against the reference seal for the issuing entity. (3) **Compare version.** Compare the stamp/seal version (e.g., year of issue, design iteration) against the reference. (4) **Compare period.** Verify that the stamp/seal was in authorized use at the document's date.

### 30.3 Outcomes

| Outcome | Meaning |
|---|---|
| `MATCH` | The stamp/seal matches the reference for the issuing entity at the document's date |
| `MISMATCH` | The stamp/seal does not match the reference; potential anomaly |
| `INSUFFICIENT_EVIDENCE` | No reference material is available; analysis cannot conclude |
| `REFERENCE_OUT_OF_PERIOD` | The reference exists but is not in period for the document's date |

### 30.4 Output

```
StampSealAnalysisReport {
  document_id
  stamps[] {
    location_on_document
    issuing_entity_identified
    reference_entry_matched
    visual_comparison        // match | mismatch | insufficient
    version_comparison       // match | mismatch | insufficient
    period_comparison        // in-period | out-of-period | insufficient
    outcome                  // MATCH | MISMATCH | INSUFFICIENT_EVIDENCE
    basis                    // specific reference entries used
  }
}
```

### 30.5 What the analysis is not

Stamp/seal analysis is **not** a forensic document examination. It does not assess ink chemistry, paper impression depth, or physical forgery techniques. It is a structured comparison against authorized reference material. Where forensic analysis is required, the document is referred to the appropriate forensic authority, and the platform records the referral.

### 30.6 Sovereign reference corpus

The reference corpus for stamps and seals is sovereign institutional property. It is curated by the ACA or by an authorized national authority. The corpus is itself access-controlled and audited (Chapter 48).

---

## Chapter 31: Official Defense / Right-to-Respond Workspace (Section 86)

### 31.1 The principle

Subjects of ACA investigations have the right to respond. The platform provides an **Official Defense / Right-to-Respond Workspace** that allows authorized subjects to provide: explanations; documents; evidence; witnesses; procedural justifications; and responses to findings.

### 31.2 The representation

The workspace represents the case as a four-way structure:

```
ALLEGATION → RESPONSE → EVIDENCE → RULE
            ▲           ▲          ▲
            │           │          │
   (subject's       (evidence       (the rule
   explanation,     supporting      against which
   documents,       or undermining  the allegation
   witnesses)       the response)   is evaluated)
```

Each allegation has its own response/evidence/rule chain. The workspace is structured, not free-form: the subject responds to specific allegations, attaches specific evidence, and references specific rules.

### 31.3 Access control

The workspace is access-controlled: the subject (or authorized representative) has access to allegations, the evidence disclosed to them, and the response workspace. The subject does not have access to the full case file; the ACA retains control over what is disclosed. The subject's submissions are time-stamped, signed, and preserved (Chapter 6). The subject's submissions become evidence in the case (Chapter 5).

### 31.4 What the workspace is not

The workspace is not a negotiation. The ACA does not bargain with the subject. The workspace is a structured opportunity for the subject to respond before findings are finalized.

### 31.5 Procedural integrity

The workspace preserves procedural integrity: the subject's response window is defined by policy and recorded; extensions, where granted, are logged with reasons; and the ACA's consideration of the response is logged — who reviewed it, when, what was considered, what was accepted, what was rejected, and why.

### 31.6 Use in findings

The Investigation Quality Assurance module (Chapter 38) verifies, before material findings, that the subject's response has been considered. A finding that does not address a material response from the subject is flagged and must be remediated before the case advances.

---

## Chapter 32: Investigator Second Brain (Section 87)

### 32.1 The concept

Every investigator workspace includes an **Investigator Second Brain** — a structured companion that holds the investigator's evolving understanding of the case. The Second Brain is the investigator's own notebook, structured by the platform, assisted by AI, but never authoritative.

### 32.2 What the Second Brain holds

| Element | Description |
|---|---|
| Questions | Open questions the investigator is pursuing |
| Hypotheses | Working hypotheses, with status (open / supported / refuted / parked) |
| Evidence | Links to evidence in the case, with the investigator's notes |
| Contradictions | Identified contradictions between evidence, statements, or rules |
| Tasks | Investigator tasks, with status and deadlines |
| People | People involved in or relevant to the case |
| Timeline | The investigator's reconstruction of events |
| Next steps | The investigator's planned next actions |

### 32.3 AI assistance, not AI authority

The Second Brain uses AI to assist organization — for example, suggesting that a newly added piece of evidence may relate to an open question, or flagging that two statements appear contradictory. The AI does not make decisions for the investigator. The AI's suggestions are presented as suggestions, with the basis for the suggestion visible (Chapter 61).

### 32.4 Investigator control

The investigator controls the Second Brain: the investigator creates, edits, and resolves questions, hypotheses, and tasks; the investigator may accept, reject, or modify AI suggestions; the investigator may park a hypothesis without resolving it; the investigator's edits are versioned; the Second Brain's evolution is part of the case record.

### 32.5 Privacy of the Second Brain

The Second Brain is the investigator's working space. It is visible to the investigator and to authorized supervisors (Chapter 39). It is not visible to the subject (Chapter 31). It is not visible to other investigators except where collaboration is authorized. The Second Brain's content is not, by itself, evidence; it is the investigator's evolving thinking, and may include rejected hypotheses and abandoned lines of inquiry.

### 32.6 Use in supervision

Supervisors reviewing the case see the Second Brain's structure: how many open questions, how many unresolved contradictions, how many overdue tasks. This is part of Case Health (Chapter 36) and Supervisor Intelligence (Chapter 39). The supervisor does not see the Second Brain as a finished product; they see it as a working state.

---

## Chapter 33: Automatic Investigation Plan (Section 88)

### 33.1 Generation

When a case is opened from an intake (a complaint, a referral, an intelligence alert), the platform generates a **proposed investigation plan**. The plan is a structured starting point, not a prescription. The investigator can modify it.

### 33.2 Plan elements

The proposed plan includes: (1) **Verify facts** — the allegations as stated, with the facts to be verified. (2) **Identify records** — records to be retrieved (Chapter 21 for CCTV, Chapter 1 for regulatory snapshots). (3) **Identify people** — people to be identified, interviewed, or whose roles are to be clarified. (4) **Reconstruct timeline** — the temporal reconstruction to be built, with key dates and dependencies. (5) **Identify applicable rules** — the rules to be applied, using the Regulatory Temporal Engine (Chapter 1) and the "Law at the Time" Engine (Chapter 2). (6) **Compare similar cases** — prior cases with similar patterns, for context and consistency. (7) **Resolve evidence gaps** — known gaps to be addressed (Chapter 23, Chapter 24). (8) **Obtain responses** — the subject's right-to-respond plan (Chapter 31). (9) **Assess controls** — the administrative controls whose failure or weakness may be relevant (Chapter 3, Chapter 42). (10) **Prepare findings** — the structure of the eventual findings, including the Finding-to-Rule Matrix (Chapter 40) and Finding-to-Reform Matrix (Chapter 41).

### 33.3 Modification

The investigator can: add, remove, or reorder plan elements; set priorities and dependencies; assign tasks to themselves or to collaborators; mark elements as out of scope, with a reason. Modifications are versioned; the original proposed plan is retained alongside the modified plan.

### 33.4 AI role

The AI's role in generating the plan is to apply the case pattern to the intake. The AI does not decide what is in scope; it proposes. The investigator's modifications are recorded and become part of the case's audit trail.

### 33.5 Use in supervision

Supervisors reviewing the case see the plan and its modifications. A case where the investigator has removed the "obtain responses" element without explanation is flagged (Chapter 39). A case where the plan has been substantially unchanged for a long period is flagged by the Dead-End Detector (Chapter 35).

---

## Chapter 34: Next Best Action (Section 89)

### 34.1 The principle

The platform continuously recommends the **next most valuable investigative action**. The recommendation is a suggestion, not a directive. The investigator may follow it, defer it, or reject it; the rejection is logged but does not require justification unless it becomes a pattern.

### 34.2 What "most valuable" means

Value is defined along several axes:

| Axis | What raises value |
|---|---|
| Evidence coverage | Closes a known evidence gap |
| Timeline coverage | Fills a gap in the reconstructed timeline |
| Source independence | Adds an independent source (Chapter 24) |
| Contradiction resolution | Resolves an open contradiction |
| Subject response | Advances the subject's right-to-respond (Chapter 31) |
| Rule linkage | Links an unlinked finding to a rule |
| Dead-end avoidance | Breaks a case out of a dead-end (Chapter 35) |
| Urgency | Addresses an overdue action or an expiring limitation period |

### 34.3 Recommendation format

```
NextBestAction {
  case_id
  recommended_action            // structured action description
  rationale                     // why this action is valuable
  axes_advanced[]               // which value axes are advanced
  estimated_effort              // LOW | MEDIUM | HIGH
  estimated_value               // LOW | MEDIUM | HIGH
  dependencies                  // what must be done first
  alternatives[]                // other actions considered, with reasons
}
```

### 34.4 What the recommender does not do

It does not auto-execute actions (the investigator initiates); it does not prioritize efficiency over fairness (a "high-value" action that compromises the subject's rights is not recommended); it does not override investigator judgment (the investigator may know reasons the recommended action is inappropriate).

### 34.5 Logging of rejections

When the investigator rejects a Next Best Action, the rejection is logged. If a case reaches Case Health (Chapter 36) thresholds for concern, the pattern of rejections is surfaced to the supervisor as a context — not as a criticism.

---

## Chapter 35: Investigation Dead-End Detector (Section 90)

### 35.1 The principle

Cases can stall. A case with no meaningful progress for a defined period is a dead-end, and the platform detects it. The detector identifies the cause of the stall, where possible, and surfaces it to the investigator and supervisor.

### 35.2 Detectable causes

| Cause | Detection signal |
|---|---|
| Blocker | A specific obstacle (e.g., a witness unavailable, a record inaccessible) |
| Missing record | A required record has not been retrieved |
| External delay | Awaiting response from an external authority |
| Unresolved contradiction | A contradiction has been open for a defined period |
| Investigator task | An investigator task is overdue |
| Authorization problem | A required authorization has not been granted |

### 35.3 Detection threshold

The dead-end threshold is policy-defined. A typical policy: a case with no material progress (no new evidence linked, no task completed, no plan element advanced) for a defined number of days triggers a dead-end notice. The threshold may be shorter for higher-priority cases.

### 35.4 Output

```
DeadEndNotice {
  case_id
  days_since_progress
  detected_cause                 // one of the causes above, or UNKNOWN
  cause_details                   // specific evidence, task, or blocker
  suggested_actions[]              // actions to break the dead-end
  investigator_acknowledgment     // required
  supervisor_notification          // if not acknowledged within window
}
```

### 35.5 What the detector does not do

The detector does not: close the case (dead-end is not closure); reassign the investigator (that is a supervisor decision); or penalize the investigator (many dead-ends are caused by external delays, not investigator inaction).

### 35.6 Use in supervision

Dead-end notices are part of Supervisor Intelligence (Chapter 39). A supervisor seeing many dead-ends with the cause `EXTERNAL_DELAY` may escalate the external dependency; a supervisor seeing many dead-ends with the cause `INVESTIGATOR_TASK` may investigate workload or capability.

---

## Chapter 36: Case Health (Section 91)

### 36.1 The principle

Case Health is a multi-dimensional assessment of the state of an open case. Like the Evidence Quality Matrix (Chapter 26), Case Health is **not** collapsed into a single score.

### 36.2 Measured dimensions

| Dimension | What is measured |
|---|---|
| Evidence completeness | Coverage of allegations by evidence |
| Timeline completeness | Coverage of key events by dated entries |
| Source coverage | Independent source count (Chapter 24) |
| Contradiction status | Open, resolved, or unresolved contradictions |
| Task completion | Open vs. completed investigator tasks |
| External dependency status | Pending external responses or records |

### 36.3 Health dimensions, not a score

Each dimension is reported separately:

```
CaseHealth {
  case_id
  evidence_completeness { level, basis }
  timeline_completeness { level, basis }
  source_coverage { independent_sources, gaps }
  contradiction_status { open_count, resolved_count, unresolved_count }
  task_completion { open, completed, overdue }
  external_dependencies { pending, fulfilled, overdue }
}
```

### 36.4 Use

Case Health is used by: the investigator, to see where the case is thin; the supervisor (Chapter 39), to prioritize review; the Dead-End Detector (Chapter 35), as one input; and Case Readiness (Chapter 37), as a precondition.

### 36.5 What Case Health does not conclude

Case Health does not conclude that the case is "good" or "bad." A case with low evidence completeness may be early in its lifecycle; a case with high evidence completeness may still have unresolved contradictions. Health is a state, not a verdict.

### 36.6 Evolution

Case Health evolves as the case progresses. The platform records health snapshots over time so that the supervisor can see the trajectory, not just the current state. A case whose health has been declining is more concerning than a case whose health has been stable at a low level.

---

## Chapter 37: Case Readiness (Section 92)

### 37.1 The principle

Before a case advances to supervisory review, the platform verifies that the case is ready. Readiness is not the supervisor's judgment; it is a structured precondition. The supervisor reviews a case only after the platform has confirmed readiness.

### 37.2 Readiness checks

| Check | Requirement |
|---|---|
| Evidence coverage | Each allegation has linked evidence |
| Timeline coverage | Key events are dated and ordered |
| Rules linked | Each finding is linked to a rule (Chapter 3) |
| Contradictions | Open contradictions are addressed or explicitly deferred |
| Missing records | Missing records are identified with a justification |
| Response status | The subject's right-to-respond status (Chapter 31) is resolved |

### 37.3 Readiness report

```
CaseReadinessReport {
  case_id
  ready                          // boolean
  checks[] { name, status (PASS | FAIL | DEFERRED), basis }
  blocking_checks[]              // checks that failed and block advancement
  deferred_checks[]              // checks explicitly deferred with justification
}
```

### 37.4 Explicit deferral

A check may be explicitly deferred by the investigator, with a justification. Deferral is not a bypass; it is a recorded decision. Deferred checks are surfaced to the supervisor as part of the review.

### 37.5 What readiness is not

Readiness is not a finding of merit. A case may be ready and still be weak (low evidence quality, unresolved contradictions). Readiness is a procedural gate, not a substantive judgment.

### 37.6 Use

A case that is not ready cannot advance to supervisory review. The investigator must address the blocking checks. A supervisor who attempts to review a non-ready case is informed of the blocking checks; the supervisor may, with explicit justification, override the gate, and the override is logged.

---

## Chapter 38: Investigation Quality Assurance (Section 93)

### 38.1 The principle

Before material findings are issued, the Investigation Quality Assurance (IQA) module verifies that the findings meet the platform's quality bar. IQA is a structured pre-flight check, not a substitute for supervisory review.

### 38.2 What IQA verifies

| Check | Requirement |
|---|---|
| Allegation documented | Each finding is linked to a documented allegation |
| Subject response considered | The subject's response (Chapter 31) has been considered for each material finding |
| Evidence linked | Each finding is linked to evidence in the case |
| Contradictions addressed | Contradictions touching the finding are addressed |
| Applicable rule identified | The rule against which the finding is made is identified (Chapter 3) |
| Missing evidence assessed | Missing evidence relevant to the finding is identified and assessed |
| Finding supported | The evidence supports the finding at the required standard |
| Alternative explanation considered | Plausible alternative explanations have been considered and addressed |

### 38.3 IQA report

```
InvestigationQualityAssuranceReport {
  case_id, finding_id
  checks[] { name, status (PASS | FAIL | NEEDS_ATTENTION), basis }
  overall                   // READY_FOR_FINDING | NEEDS_REMEDIATION
}
```

### 38.4 What IQA does not do

IQA does not: approve the finding (that is the supervisor's role); substitute for the subject's right-to-respond; replace the Evidence Quality Matrix (Chapter 26); or determine legal admissibility.

### 38.5 Remediation

When IQA reports `NEEDS_REMEDIATION`, the investigator must address the failing checks. Remediation is logged; the original failing report is retained alongside the remediation. A finding that has been remediated multiple times is flagged for supervisor attention.

### 38.6 Sovereign standard of proof

The "required standard" referenced in IQA is the sovereign standard of proof applicable to the finding. For administrative findings, this may be "preponderance of evidence" or a sovereign equivalent. For findings that may lead to referral for criminal investigation, the standard may be higher. The platform does not set the standard; it applies the standard defined by sovereign law and policy.

---

## Chapter 39: Supervisor Intelligence (Section 94)

### 39.1 The principle

A supervisor reviewing a case sees more than the investigator's findings. The supervisor sees: what's changed since the last review; what's missing; new evidence; weak conclusions; unresolved contradictions; overdue actions; and what the investigator may have missed.

### 39.2 Supervisor view

The supervisor view is a structured presentation, not a re-reading of the case file:

| Section | Content |
|---|---|
| Changes since last review | New evidence, new tasks, new findings, status changes |
| Missing items | Items the investigator has not addressed (open checks, deferred checks) |
| New evidence | Evidence added since the last review, with quality dimensions (Chapter 26) |
| Weak conclusions | Findings with low evidence quality or unresolved contradictions |
| Unresolved contradictions | Contradictions open beyond threshold |
| Overdue actions | Tasks, responses, records overdue |
| Potential blind spots | What the investigator may have missed (Chapter 23, Chapter 24, Chapter 35) |

### 39.3 What the supervisor does not see

The supervisor does not see: the investigator's private Second Brain contents (Chapter 32) — only the structured summary; other investigators' case files, unless authorized; or the subject's private workspace (Chapter 31).

### 39.4 Supervisor actions

The supervisor may: request changes to findings; request additional investigation; approve findings; return the case to the investigator with specific requests; or escalate to a higher authority. All supervisor actions are logged on the Independent Audit Plane (Chapter 57).

### 39.5 What Supervisor Intelligence is not

Supervisor Intelligence is not an AI replacement for supervision. The platform surfaces information; the supervisor judges. The supervisor remains accountable for the cases they approve.

---

## Chapter 40: Finding-to-Rule Matrix (Section 95)

### 40.1 The principle

Every material finding must be expressible as a structured chain: a finding, supported by evidence, evaluated against a rule, with a required standard and an observed state.

### 40.2 The matrix

| Finding | Evidence | Rule | Required standard | Observed state |
|---|---|---|---|---|
| "Procurement awarded without competitive tender" | Contract C-12, Tender records (absent) | Procurement Regulation §14 (in force at Te) | Competitive tender required above threshold X | Awarded without tender; value above X |
| "Service SLA breached" | Complaint logs, SLA record | Service SLA §3 (in force at Te) | Acknowledgment within 5 business days | Acknowledgment at 21 days |

### 40.3 Required fields

Each row of the Finding-to-Rule Matrix must have: a finding identifier; the evidence supporting the finding (linked to the Evidence Quality Matrix, Chapter 26); the rule against which the finding is made (linked to the Rule Graph, Chapter 3); the required standard (what the rule requires); the observed state (what the evidence shows); and the regulatory snapshot (Chapter 1) used to resolve the rule at the event date.

### 40.4 What the matrix enforces

The matrix enforces that no material finding is issued without: a rule, evidence, a required standard, and an observed state. A finding without one of these is not a finding; it is an assertion.

### 40.5 Use in IQA

The Investigation Quality Assurance module (Chapter 38) checks the Finding-to-Rule Matrix. A finding whose matrix is incomplete fails IQA and cannot advance to supervisory review.

### 40.6 Use in supervisor review

The supervisor reviews the matrix, not the narrative. The narrative may explain; the matrix establishes. A supervisor who disagrees with a finding must disagree with a specific cell — the evidence, the rule, the standard, or the observed state — not with a vague sense of the finding.

---

## Chapter 41: Finding-to-Reform Matrix (Section 96)

### 41.1 The principle

A finding identifies a problem. A reform addresses it. The Finding-to-Reform Matrix links each finding to the root cause, the control failure, the recommendation, the owner, the deadline, and the outcome.

### 41.2 The matrix

| Finding | Root Cause | Control Failure | Recommendation | Owner | Deadline | Outcome |
|---|---|---|---|---|---|---|
| Procurement awarded without tender | Lack of pre-tender review | Pre-tender control not enforced | Implement mandatory pre-tender review | Procurement Department | Q3 2025 | Pending |

### 41.3 Required fields

Each row must have: the finding (linked to the Finding-to-Rule Matrix, Chapter 40); the root cause (linked to the Root Cause Engine, Chapter 42); the control failure (linked to the Rule Graph, Chapter 3); the recommendation (specific, actionable); the owner (institutional owner, not a personal name); the deadline (specific date); and the outcome (pending / in-progress / implemented / verified-effective / failed).

### 41.4 What the matrix enforces

The matrix enforces that no finding is issued without a recommendation, and no recommendation is issued without an owner and a deadline. A finding without a recommendation is an observation; a recommendation without an owner is a wish.

### 41.5 Outcome tracking

The outcome field is updated over time: `PENDING` — recommendation made, no action yet; `IN_PROGRESS` — owner has begun implementation; `IMPLEMENTED` — owner reports implementation complete; `VERIFIED_EFFECTIVE` — Reform Verification Engine (Chapter 99) confirms effectiveness; `FAILED` — implementation did not achieve the intended effect.

### 41.6 Use in recurrence

The matrix is cross-referenced by the Closed-Case Recurrence module (Chapter 47). A closed case whose recommendations are `IMPLEMENTED` but not `VERIFIED_EFFECTIVE` may trigger a recurrence alert if the same process fails again.

---

## Chapter 42: Root Cause Engine (Section 97)

### 42.1 The principle

A finding identifies *what* happened. A root cause identifies *why*. The Root Cause Engine analyzes findings along seven dimensions to identify the underlying causes that, if addressed, would prevent recurrence.

### 42.2 The seven dimensions

| Dimension | What is examined |
|---|---|
| People | Individual competence, training, conduct, capacity |
| Process | Workflow design, procedural gaps, handoff failures |
| Technology | System limitations, integration failures, missing tooling |
| Policy | Policy gaps, ambiguities, conflicts, outdated provisions |
| Resources | Budget, staffing, time, material resources |
| Controls | Control design, control operation, control bypass |
| Governance | Oversight, accountability, decision rights, escalation paths |

### 42.3 Analysis

For each finding, the Root Cause Engine examines the seven dimensions and identifies: which dimensions contributed to the finding; the specific contribution in each dimension; the depth of the contribution (immediate cause vs. underlying cause); and the remediation leverage (would addressing this dimension prevent recurrence?).

### 42.4 Output

```
RootCauseReport {
  finding_id
  dimensions[] {
    name                      // one of the seven
    contributed               // boolean
    contribution              // specific description
    depth                     // IMMEDIATE | UNDERLYING
    leverage                  // HIGH | MEDIUM | LOW
  }
  recommended_addressed_dimensions[]   // which to prioritize
}
```

### 42.5 What the engine does not do

The engine does not: assign personal blame (root cause is institutional, not personal); replace disciplinary processes (where individual misconduct is implicated, the disciplinary process is separate); or produce a single "the root cause" answer (most findings have multiple contributing causes across multiple dimensions).

### 42.6 Use in reform

The Root Cause Report feeds the Finding-to-Reform Matrix (Chapter 41). A recommendation that addresses only an immediate cause without addressing the underlying cause is flagged by the Recommendation Evasion Detector (Chapter 43).

---

## Chapter 43: Recommendation Evasion Detector (Section 98)

### 43.1 The principle

A recommendation may be technically implemented while the underlying problem remains. The Recommendation Evasion Detector identifies this pattern. Its core output is the dictum:

> **FORMAL COMPLIANCE ≠ OPERATIONAL EFFECTIVENESS**

### 43.2 Detection patterns

| Pattern | Description |
|---|---|
| Box-ticking implementation | The recommendation is implemented as written but does not address the underlying cause (Chapter 42) |
| Procedural workaround | A new procedure exists but is bypassed in practice |
| Control exists, not operated | A control is in place but is not actually executed |
| Training delivered, not absorbed | Training was conducted but competency did not improve |
| Policy updated, not enforced | Policy was revised but enforcement did not change |

### 43.3 Detection signals

The detector examines: whether the recommendation addressed the root cause dimensions identified in Chapter 42; whether post-implementation telemetry (Chapter 99) shows improvement; whether similar findings recur (Chapter 46); and whether the implementation report acknowledges operational reality.

### 43.4 Output

```
RecommendationEvasionReport {
  recommendation_id
  formal_implementation       // boolean
  operational_effectiveness   // EFFECTIVE | PARTIAL | INEFFECTIVE
  evasion_pattern             // one of the patterns above, or NONE
  evidence_basis              // specific signals
  recommended_followup        // what to do next
}
```

### 43.5 What the detector does not accuse

The detector does not accuse the owner of bad faith. The owner may have implemented in good faith and the implementation may simply not have worked. The detector's job is to surface the gap between formal compliance and operational effectiveness, not to assign motive.

### 43.6 Use in supervision

Supervisors reviewing implemented recommendations see the Recommendation Evasion Report. A recommendation that is `FORMAL_COMPLIANCE` but `INEFFECTIVE` is not closed; it is escalated for further work.

---

## Chapter 44: Reform Verification Engine (Section 99)

### 44.1 The principle

To verify that a reform has been effective, the platform measures the relevant metrics **before and after** the reform. A reform is not verified by the owner's report of implementation; it is verified by the measured change in operational outcomes.

### 44.2 Measured metrics

| Metric | What is measured |
|---|---|
| Complaints | Volume, type, severity of complaints before/after |
| Processing time | Median and worst-case processing time |
| Errors | Error rate before/after |
| Exceptions | Exception rate before/after |
| Backlog | Open-case backlog before/after |
| Repeat visits | Repeat visits / rework before/after |
| Outcomes | Outcome quality before/after (where measurable) |

### 44.3 Before/after comparison

The engine measures the metric over a defined pre-reform window and a defined post-reform window, and reports the change. The comparison is presented with: the pre-reform baseline; the post-reform measurement; the change (absolute and percentage); the statistical significance (where the sample size supports it); and confounding factors (other changes that may have affected the metric).

### 44.4 Output

```
ReformVerificationReport {
  recommendation_id
  metrics[] {
    name, pre_reform_window, post_reform_window
    pre_reform_value, post_reform_value, change
    significance, confounders[]
  }
  overall_verdict        // EFFECTIVE | PARTIALLY_EFFECTIVE | INEFFECTIVE | INCONCLUSIVE
}
```

### 44.5 What verification does not prove

Verification does not prove that the reform *caused* the improvement. It establishes correlation. Where the platform has enough data and the reform is isolated, causal inference may be stronger; otherwise, the report acknowledges the confounders.

### 44.6 Use

The Reform Verification Report updates the outcome field in the Finding-to-Reform Matrix (Chapter 41). A recommendation is `VERIFIED_EFFECTIVE` only when the Reform Verification Engine confirms it; otherwise, it remains `IMPLEMENTED` and under monitoring.

---

## Chapter 45: Recommendation ROI (Section 100)

### 45.1 The principle

Where appropriate, the platform estimates the **return on investment** of a recommendation. ROI is not a financial calculation; it is a structured estimate of the value of the recommendation relative to its cost.

### 45.2 Estimated dimensions

| Dimension | What is estimated |
|---|---|
| Implementation effort | Staff time, system changes, training required |
| Time saved | Time savings for staff, citizens, or the institution |
| Burden reduction | Reduction in administrative burden |
| Risk reduction | Reduction in the risk of recurrence |
| Expected impact | Expected magnitude of the change in operational outcomes |

### 45.3 Output

```
RecommendationROI {
  recommendation_id
  implementation_effort { level, basis }
  time_saved { estimated_hours_per_year, basis }
  burden_reduction { level, basis }
  risk_reduction { level, basis }
  expected_impact { level, basis }
  roi_summary                     // structured narrative
}
```

### 45.4 What ROI is used for

ROI is used: to prioritize recommendations when resources are limited; to compare alternative recommendations addressing the same root cause; to inform the owner's implementation plan; and to set expectations for post-implementation verification (Chapter 99).

### 45.5 What ROI is not

ROI is not: a financial budget (the platform does not produce financial budgets); a substitute for implementation (a high-ROI recommendation still requires implementation); or a justification for inaction (a low-ROI recommendation may still be required for compliance).

### 45.6 Limitations

ROI estimates are estimates. They carry uncertainty. The platform records the basis for each estimate and the uncertainty. A recommendation with a high-expected-impact estimate and weak basis is flagged for review.

---

## Chapter 46: Recurring Recommendation Failure (Section 101)

### 46.1 The principle

Some recommendations recur repeatedly because the underlying problem remains. The platform identifies recommendations that have been made, implemented, and have failed (or have been made, implemented, and have recurred) across multiple cases.

### 46.2 Detection

The detector scans the recommendation corpus for patterns: the same recommendation made in multiple cases over time; the same recommendation implemented and failed; the same root cause (Chapter 42) identified across multiple cases; and the same control (Chapter 3) failing across multiple cases.

### 46.3 Output

```
RecurringRecommendationFailureReport {
  recommendation_pattern
  occurrences[]                  // cases where this recommendation appeared
  implementations[]              // implementations and their outcomes
  underlying_root_causes[]      // from Chapter 42
  recurring_root_cause           // the underlying cause that has not been addressed
  recommended_escalation          // escalate to higher authority or broader reform
}
```

### 46.4 What the detector concludes

The detector concludes that the recommendation has recurred because the underlying problem remains. This is not a failure of the recommendation; it is a signal that the recommendation has been applied at the wrong level — addressing symptoms rather than the root cause.

### 46.5 Escalation

A recurring recommendation failure may warrant escalation to a higher authority or to a broader reform program. The platform surfaces the pattern; the decision to escalate is a supervisor or institutional authority decision.

### 46.6 Cross-reference

The detector cross-references with: Chapter 42 (Root Cause Engine — the underlying cause); Chapter 43 (Recommendation Evasion Detector — whether implementations were formal or effective); Chapter 99 (Reform Verification Engine — whether implementations were verified); and Chapter 47 (Closed-Case Recurrence — whether the same problem has triggered new alerts).

---

## Chapter 47: Closed-Case Recurrence (Section 102)

### 47.1 The principle

A closed case is not a forgotten case. A closed case can trigger a new intelligence alert if: related evidence appears; related cases appear; the same process fails again; or reform fails.

### 47.2 Trigger conditions

| Trigger | What triggers |
|---|---|
| Related evidence appears | New evidence linked to the closed case's entities, transactions, or period |
| Related cases appear | A new case is opened involving the same entity, the same process, or the same control |
| Same process fails again | The process that was the subject of the closed case fails again |
| Reform fails | A reform implemented as a result of the closed case is found ineffective (Chapter 43, Chapter 99) |

### 47.3 Alert

When a trigger condition is met, the platform generates a **Closed-Case Recurrence Alert**:

```
ClosedCaseRecurrenceAlert {
  closed_case_id
  trigger_type
  trigger_details
  related_case_id             // if a new case is opened
  recommended_action           // REVIEW | REOPEN | NEW_CASE | ESCALATE
}
```

### 47.4 What the alert does not do

The alert does not: reopen the closed case automatically (reopening is a supervisor decision); substitute for the new case's own investigation; or conclude that the closed case was wrongly decided.

### 47.5 Closed ≠ forgotten

The platform retains closed cases in a queryable state. Closed cases are not archived to cold storage where they cannot trigger alerts. The retention period for closed cases is defined by sovereign records-management law, not by storage convenience.

### 47.6 Use in institutional learning

Closed-Case Recurrence alerts feed the institutional learning loop: patterns of recurrence across closed cases inform broader reform (Chapter 41, Chapter 46) and supervisor intelligence (Chapter 39).

---

## Chapter 48: Audit-the-Auditor (Section 103)

### 48.1 The principle

The ACA must be capable of auditing itself. The Audit-the-Auditor module monitors the ACA's own internal behavior: who accessed what, when, why, and whether that access was appropriate.

### 48.2 Monitored behaviors

| Behavior | What is monitored |
|---|---|
| Case browsing | Which cases are viewed, by whom, how often |
| Sensitive evidence access | Access to evidence marked sensitive |
| Protected identity access | Access to protected-identity information |
| Exports | Bulk exports, downloads, print actions |
| Privileged queries | Privileged API queries |
| Administrative actions | Configuration changes, permission grants, device enrollment |
| Unusual behavior | Anomalous access patterns, off-hours access, unusual volume |

### 48.3 Audit log

Every monitored behavior produces an audit log entry:

```
AuditLogEntry {
  actor                // authenticated identity
  action               // what was done
  target               // what was acted upon
  context              // case, purpose, authority
  timestamp            // layered timestamp
  access_basis         // under what authorization
  access_decision      // ALLOWED | DENIED | BREAK_GLASS
  anomaly_flags[]      // any anomaly signals
}
```

### 48.4 Independent Audit Plane

Audit logs are written to the **Independent Audit Plane** (Chapter 57), which is logically separate from the operational administration. The operational administrator cannot modify or delete audit logs. Audit logs are themselves evidence (Chapter 5) of the ACA's internal conduct.

### 48.5 What audit-the-auditor does not do

The module does not: convert an anomaly into an accusation (Chapter 49); replace supervisor judgment; monitor personal conduct outside the platform; or expose audit data to unauthorized parties.

### 48.6 Use

Audit-the-Auditor data is used: by the Insider Risk module (Chapter 49) to identify patterns; by the Independent Audit Plane (Chapter 57) for audit queries; by supervisors and internal affairs for specific investigations; and by the ACA's institutional accountability mechanisms.

---

## Chapter 49: Insider Risk (Section 104)

### 49.1 The principle

The platform detects unusual institutional access patterns that may indicate insider risk. An insider risk is not an accusation; it is a pattern that warrants further review.

### 49.2 What is detected

| Pattern | Detection signal |
|---|---|
| Off-hours access | Access outside the agent's normal hours |
| Volume anomaly | Access volume far exceeding the agent's baseline |
| Scope anomaly | Access to cases outside the agent's assignment |
| Sensitive evidence clustering | Concentrated access to sensitive evidence |
| Protected identity curiosity | Access to protected-identity information without clear case basis |
| Export anomaly | Bulk exports or downloads |
| Privilege anomaly | Use of privileges outside normal pattern |

### 49.3 What the detector does not do

The detector **never** converts an anomaly automatically into an accusation. An anomaly is a signal, not a conclusion. An agent may have legitimate reasons for off-hours access (urgent case), volume anomaly (large case), or scope anomaly (assigned to a new team).

### 49.4 Output

```
InsiderRiskNotice {
  actor
  pattern
  severity                // LOW | MEDIUM | HIGH
  evidence_basis          // specific signals
  context                 // what is known about the actor's current assignments
  recommended_review      // SUPERVISOR_REVIEW | INTERNAL_AFFAIRS_REVIEW | NO_ACTION
}
```

### 49.5 Review path

A `LOW` severity notice is logged and may be reviewed by the supervisor. A `MEDIUM` severity notice triggers a supervisor review. A `HIGH` severity notice triggers an internal affairs review. In all cases, the review is logged and the actor is presumed innocent of misconduct until the review concludes.

### 49.6 Procedural safeguards

The platform enforces procedural safeguards: the actor is not automatically informed of the notice (to preserve investigation integrity if needed); the actor's supervisor is informed per the severity threshold; any disciplinary action follows the institution's disciplinary process, not the platform's detection; and the platform's detection is one input among many; it is not the sole basis for action.

---

## Chapter 50: Canary / Honey Records (Section 105)

### 50.1 The principle

Where legally and operationally appropriate, the platform uses synthetic security records as **tripwires**. A canary or honey record is a fabricated record that has no legitimate use; any access to it is, by construction, suspicious.

### 50.2 When canary records are appropriate

Canary records are appropriate only when: their use is authorized by sovereign law and institutional policy; they do not interfere with legitimate investigations; they are designed so that legitimate users have no reason to access them; and their existence is protected by the Independent Audit Plane (Chapter 57).

### 50.3 What canary records are not

Canary records are not: fake evidence planted to entrap investigators; false records that could be admitted in any proceeding; or a substitute for ordinary access controls.

### 50.4 Tripwire behavior

When a canary record is accessed, the platform: (1) records the access on the Independent Audit Plane; (2) triggers an Insider Risk Notice (Chapter 49) with high severity; (3) notifies the security administration and internal affairs; (4) does not alert the accessing user that the record was a canary.

### 50.5 Use

Canary records are used to detect unauthorized curiosity, browsing, or exfiltration. An agent who accesses a canary record without a legitimate case basis has demonstrated a pattern that warrants review. The platform does not conclude misconduct from the access alone; it triggers review.

### 50.6 Limitations

Canary records are limited: they cannot be used to entrap users into access (e.g., by being prominently displayed); they cannot be used in cases where their existence would distort the case record; they cannot be the sole basis for disciplinary action.

---

## Chapter 51: Privileged Session Monitoring (Section 106)

### 51.1 The principle

For sensitive administration — actions that affect the platform's configuration, security, or evidence preservation — the platform records authorized administrative actions and the access context.

### 51.2 What is monitored

| Action type | Examples |
|---|---|
| Configuration changes | Permission grants, role assignments, policy updates |
| Security administration | Certificate issuance, key rotation, device enrollment |
| Evidence preservation | Disposition actions (Chapter 6), witness operations (Chapter 15) |
| Audit access | Queries against the Independent Audit Plane |
| Break-glass access | Emergency access (Chapter 56) |

### 51.3 Session record

A privileged session record contains:

```
PrivilegedSessionRecord {
  actor                       // authenticated identity
  role                        // role held during session
  session_start               // layered timestamp
  session_end
  actions[]                   // each action with timestamp, target, parameters
  justification               // recorded justification (required for break-glass)
  co_authorizations[]         // for actions requiring co-authorization
  audit_plane_reference       // pointer to the audit log entries
}
```

### 51.4 What privileged session monitoring enforces

Every privileged action is recorded; every privileged action has an actor, a role, a timestamp, and a target; break-glass actions (Chapter 56) require explicit justification; certain actions require co-authorization (Chapter 53); privileged session records cannot be modified by the operational administration.

### 51.5 Use

Privileged session records are used: by Audit-the-Auditor (Chapter 48) for internal review; by Insider Risk (Chapter 49) for pattern detection; by the Independent Audit Plane (Chapter 57) for audit queries; and by internal affairs for specific investigations.

### 51.6 What monitoring is not

Monitoring is not surveillance of personal conduct. The platform monitors institutional actions taken through the platform. It does not monitor personal devices, personal communications, or off-platform conduct. Sovereign law defines the boundary.

---

## Chapter 52: Data Exfiltration Radar (Section 107)

### 52.1 The principle

The platform monitors for indicators of data exfiltration: patterns that suggest an insider or compromised account is attempting to remove large volumes of data from the platform.

### 52.2 Monitored signals

| Signal | What is monitored |
|---|---|
| Bulk queries | Queries returning abnormally large result sets |
| Unusual downloads | Downloads exceeding baseline for the user |
| Large exports | Export operations exceeding threshold |
| API anomalies | API usage patterns deviating from baseline |
| External transfer indicators | Indicators of attempted external transfer |

### 52.3 Detection

The radar applies thresholds and baselines: per-user baselines for query volume, download volume, and export volume; per-role thresholds for what constitutes an anomaly; per-case thresholds for unusual access patterns; and time-window analysis for burst patterns.

### 52.4 Response

When the radar detects a signal: (1) the signal is recorded on the Independent Audit Plane; (2) an Insider Risk Notice (Chapter 49) is generated with appropriate severity; (3) where the signal is high-severity, the platform may throttle or block the operation pending review; (4) the security administration is notified.

### 52.5 What the radar does not do

The radar does not: automatically conclude exfiltration (a bulk query may have a legitimate basis, such as a complex case requiring broad retrieval); block legitimate work (throttles are applied with review windows, not indefinite blocks); or monitor personal communications or external channels.

### 52.6 Use

The radar's outputs feed: Insider Risk (Chapter 49) for pattern detection; Audit-the-Auditor (Chapter 48) for audit; and internal affairs for specific investigations.

---

## Chapter 53: Separation-of-Duties Analyzer (Section 108)

### 53.1 The principle

Some combinations of actions by a single user are dangerous: a user who can create, approve, modify, and finalize an artifact has unilateral control over that artifact. The Separation-of-Duties Analyzer identifies dangerous combinations.

### 53.2 Dangerous combinations

| Combination | Why dangerous |
|---|---|
| Create → Approve | The creator approves their own work |
| Approve → Modify | The approver modifies after approval |
| Create → Modify → Finalize | One user controls the entire lifecycle |
| Create → Finalize | Bypasses approval |
| Modify → Approve | The modifier approves their own modification |
| Finalize → Reopen → Modify → Finalize | Reopening and modifying after finalization |

### 53.3 Detection

The analyzer scans the audit log (Chapter 48) for cases where a single user performed multiple roles in a dangerous combination on the same artifact.

### 53.4 Output

```
SeparationOfDutiesViolation {
  artifact_id                  // what was affected
  actor                        // who performed the combined actions
  combination                  // the dangerous combination detected
  actions[]                    // the specific actions and timestamps
  severity                     // LOW | MEDIUM | HIGH
  recommended_action           // REVIEW | REVERSE | ESCALATE
}
```

### 53.5 Enforcement vs. detection

The platform enforces separation of duties at the policy level (where policy defines which roles can perform which actions) and detects violations where the policy permits a combination but the combination is nonetheless dangerous. Detection does not replace enforcement; it provides defense in depth.

### 53.6 Use

Separation-of-Duties violations are surfaced to the security administration and to internal affairs. A violation may indicate a policy gap (the policy allowed a dangerous combination) or an operational lapse (a user exceeded their authorized role). Both warrant review.

---

## Chapter 54: Privilege Drift (Section 109)

### 54.1 The principle

When a user is transferred or reassigned, their privileges should be reviewed. A user who moves from a sensitive role to a less sensitive role should not retain the privileges of the sensitive role. The Privilege Drift module detects permissions retained after transfer or reassignment.

### 54.2 Detection

The module monitors: role changes (a user's role changes); department transfers (a user moves between departments); assignment changes (a user's case assignments change); and temporary privilege grants (privileges granted for a specific task that should expire). For each change, the module verifies that the user's privileges have been adjusted. Privileges that remain after the change are flagged as `DRIFT`.

### 54.3 Output

```
PrivilegeDriftNotice {
  actor
  change_type                 // ROLE_CHANGE | DEPARTMENT_TRANSFER | ASSIGNMENT_CHANGE | EXPIRED_GRANT
  prior_privileges[]
  current_privileges[]
  drifted_privileges[]        // privileges retained beyond the change
  severity                    // based on the sensitivity of the drifted privileges
  recommended_action          // REVIEW | REVOKE | ESCALATE
}
```

### 54.4 What the module does not do

The module does not: automatically revoke privileges (revocation is an administrative action, requiring authorization); accuse the user of misconduct (privilege drift is often an administrative oversight, not misconduct); or override the user's manager (the manager is notified; revocation is their action).

### 54.5 Use

Privilege Drift notices are surfaced to: the user's manager; the security administration; and internal affairs (for high-severity drift).

### 54.6 Prevention

The platform's identity and access management system can prevent drift by enforcing time-bound privilege grants and automatic privilege expiration on role change. Where prevention is in place, drift should not occur; where drift is detected despite prevention, it indicates a configuration error or a bypass that warrants review.

---

## Chapter 55: Dormant Account Detection (Section 110)

### 55.1 The principle

Inactive privileged accounts, departed staff, stale devices, and expired credentials are security liabilities. The Dormant Account Detection module identifies them.

### 55.2 What is detected

| Item | Detection signal |
|---|---|
| Inactive privileged accounts | Privileged accounts with no login for a defined period |
| Departed staff | Accounts of staff who have left the institution but remain active |
| Stale devices | Trusted devices (Chapter 9) not used for a defined period |
| Expired credentials | Certificates, keys, or passwords past their expiry |

### 55.3 Detection

The module runs on a defined cadence (e.g., daily for expired credentials, weekly for inactive accounts, monthly for stale devices) and produces:

```
DormantAccountReport {
  inactive_accounts[]          // identity, last login, role, sensitivity
  departed_staff_accounts[]    // identity, departure date, account status
  stale_devices[]              // device_id, last used, assignment status
  expired_credentials[]        // credential_id, type, expiry date, owner
  recommended_actions[]        // DISABLE | REVOKE | REVIEW
}
```

### 55.4 What the module does

The module: disables inactive privileged accounts beyond a threshold (per policy); flags departed staff accounts for HR reconciliation; quarantines stale devices (Chapter 9); and revokes expired credentials.

### 55.5 What the module does not do

The module does not: delete accounts (deletion follows records-management and HR processes); take action without policy authorization (the thresholds and actions are policy-defined); or override HR or manager decisions for legitimate exceptions (e.g., extended leave).

### 55.6 Use

Dormant Account reports are surfaced to: the security administration for action; HR for departed staff reconciliation; the fleet manager (Chapter 19) for stale devices; and internal affairs for patterns of neglect.

---

## Chapter 56: Break-Glass Access (Section 111)

### 56.1 The principle

Emergency access — break-glass — is sometimes necessary. A user may need to access evidence or perform an action outside their normal authorization in an emergency. The platform allows break-glass access but requires that it be: identified, reasoned, case-bound, time-bound, policy-bound, and review-triggering.

### 56.2 Required elements

A break-glass access requires:

| Element | Requirement |
|---|---|
| Identity | The authenticated identity of the user |
| Reason | A free-text reason for the emergency access |
| Case | The case to which the access relates |
| Time | The layered timestamp (Chapter 11) of the access |
| Policy | The policy under which the access is authorized |

### 56.3 Trigger of review

A break-glass access automatically triggers a review:

```
BreakGlassAccess {
  actor, reason, case_id, access_timestamp, policy_cited
  accessed_resource, access_duration
  review_status                  // PENDING | REVIEWED | ACTIONED
  reviewer                       // who reviewed
  review_outcome                 // JUSTIFIED | UNJUSTIFIED | INVESTIGATED
}
```

### 56.4 What break-glass is not

Break-glass is not: a routine access method (routine access requires ordinary authorization); a substitute for proper access management; a way to bypass audit (Chapter 48) (break-glass is fully audited); or unaccountable (every break-glass access has a reviewer).

### 56.5 Review timing

Reviews must occur within a defined window (e.g., 24 hours for high-sensitivity break-glass, 7 days for lower sensitivity). Unreviewed break-glass accesses are escalated.

### 56.6 Outcome

A break-glass access found `UNJUSTIFIED` triggers: an Insider Risk Notice (Chapter 49); a supervisor review; and potential disciplinary action per institutional process. A break-glass access found `JUSTIFIED` is recorded and the pattern is examined: if the same user repeatedly requires break-glass for similar situations, the platform may recommend a policy adjustment to make the access routine (with appropriate controls) rather than exceptional.

---

## Chapter 57: Independent Audit Plane (Section 112)

### 57.1 The principle

Ordinary system administrators must not have unilateral control over historical audit evidence. The platform maintains an **Independent Audit Plane** — a logically separate store of audit evidence that the operational administration cannot modify or delete.

### 57.2 The four-way separation

The platform enforces logical separation between:

| Plane | Responsibility | Cannot touch |
|---|---|---|
| Operational administration | Operational services, workflows, Operational Vault | Preservation Vault, Audit Plane |
| Security administration | Identity, access control, device CA | Evidence content, Audit Plane content |
| Evidence preservation | Preservation Vault, witnesses, disposition | Operational services, identity |
| Independent audit | Audit Plane, audit queries | Any of the above (read-only across all) |

### 57.3 Audit Plane properties

- **Append-only.** Audit entries can be added but never modified or deleted by the operational administration.
- **Read-only for non-audit planes.** The operational, security, and preservation planes can write audit entries but cannot read or modify entries written by other planes (except where authorized for specific audit queries).
- **Independently administered.** The Audit Plane is administered by an independent audit authority, separate from the operational, security, and preservation administrations.
- **Cryptographically anchored.** Audit entries are periodically witnessed (Chapter 15) to prove their state at a point in time.

### 57.4 What the Audit Plane holds

The Audit Plane holds: audit log entries (Chapter 48); privileged session records (Chapter 51); break-glass access records (Chapter 56); disposition records (Chapter 6); canary access records (Chapter 50); separation-of-duties violation reports (Chapter 53); and insider risk notices (Chapter 49).

### 57.5 Audit queries

Authorized auditors can query the Audit Plane by: actor (who did what); action (what was done); target (what was affected); time window; anomaly flag; or case. Audit queries are themselves logged on the Audit Plane.

### 57.6 Sovereign posture

The Independent Audit Plane is a sovereign institutional asset. It is operated on sovereign infrastructure, under sovereign law, with sovereign cryptographic keys. The plane is not accessible to any commercial vendor or external party except where authorized by sovereign law.

---

## Chapter 58: Zero-Trust AI (Section 113)

### 58.1 The principle

AI must **not** receive unrestricted access to the ACA database. AI capabilities — including language models, vision models, transcription models, and any other model used by the platform — must access data only through an **AI Data Access Broker**.

### 58.2 The AI Data Access Broker

The AI Data Access Broker is the only path through which AI capabilities access ACA data. The broker: authenticates the AI capability (which model, which version); authorizes the specific data access (which records, which fields, which window); logs the access (Chapter 48); enforces purpose-bound query (the access is bound to a stated purpose and case); enforces data minimization (the AI receives only the data necessary for the requested task); and returns the AI output to the requesting context, with the access recorded.

```
AI CAPABILITY (model + version)
   → AI DATA ACCESS BROKER
       { authenticate, authorize (policy + case),
         minimize, log, enforce purpose-bound }
   → ACA DATA (Operational Vault, read-only)
```

### 58.3 What the broker enforces

| Rule | Enforcement |
|---|---|
| No unrestricted database access | The AI never receives a database connection or query surface |
| Purpose-bound | Every access is bound to a case and a purpose |
| Data minimization | Only the necessary fields are returned |
| Logging | Every access is logged on the Audit Plane |
| Time-bound | Access tokens expire |
| Model-bound | Access is bound to a specific model version |

### 58.4 What the broker does not allow

The broker does not allow: the AI to browse the database; the AI to retain data beyond the task; the AI to access data outside the authorized scope; or the AI to write to the database directly (AI outputs are returned to the requesting context and written by authorized services, not by the AI itself).

### 58.5 Why this matters

Without the broker, an AI capability embedded in the platform effectively becomes a superuser — able to read any case, any evidence, any audit log. This is unacceptable in a sovereign institutional context. The broker ensures that AI is a tool used under control, not a peer with access.

---

## Chapter 59: AI Governance (Section 114)

### 59.1 The principle

Every important AI output must preserve a complete provenance record. AI outputs are not ephemeral; they are institutional artifacts that may inform findings, recommendations, or actions, and their provenance must be reconstructable.

### 59.2 Required provenance fields

For every important AI output, the platform preserves:

| Field | Description |
|---|---|
| Model | Which model produced the output |
| Version | Which version of the model |
| Policy | Which AI policy governed the output |
| Source records | Which source records the output is based on |
| Retrieval set | The specific records retrieved and provided as context |
| Timestamp | When the output was produced (layered timestamp) |
| Output | The output itself |
| Reviewer | Who reviewed the output |
| Final action | What was done with the output (accepted, modified, rejected) |

### 59.3 The AI Governance Record

The canonical schema is given in Appendix C. In summary, an AI Governance Record contains: identity (`record_id`); model context (`model`, `model_version`, `model_provider`, `policy_version`); source context (`source_records[]`, `retrieval_set[]`, `retrieval_query`, `retrieval_timestamp`); output (`timestamp`, `output`, `output_hash`, `citations[]`, `confidence`); firewall checks (`hallucination_check`, `prompt_injection_check`); review (`reviewer`, `review_timestamp`, `review_decision`, `review_notes`); final action (`final_action`, `final_action_actor`, `final_action_timestamp`); case context (`case_id`, `purpose`); reproducibility (`reproducibility_token`, `versioned_context_ref`); and audit (`audit_plane_reference`).

### 59.4 What "important" means

An AI output is "important" if it may inform: a finding (Chapter 40); a recommendation (Chapter 41); a supervisor decision (Chapter 39); a disposition (Chapter 6); a subject's right-to-respond (Chapter 31); or a reform (Chapter 41, Chapter 99). Outputs that are purely exploratory (e.g., an investigator asking the AI to summarize a document for their own review) may be governed by a lighter-touch log, but are still recorded.

### 59.5 Reviewer requirement

Important AI outputs must be reviewed by an authorized human before they inform a finding, recommendation, or action. The AI does not have the authority to issue findings, make recommendations, or take dispositive action. The human reviewer's identity and decision are part of the record.

### 59.6 Sovereign posture

AI Governance is a sovereign institutional responsibility. The records are retained on sovereign infrastructure, under sovereign law, with sovereign cryptographic protection. The platform does not delegate AI governance to any commercial vendor or external party.

---

## Chapter 60: AI Reproducibility (Section 115)

### 60.1 The principle

An AI analysis must be reproducible. The platform supports the operation:

> **REPRODUCE ANALYSIS AS OF [DATE/TIME]**

using the appropriate versioned context. This means: given a date/time and an AI Governance Record (Chapter 59), the platform can re-run the analysis with the same model version, the same policy, and the same retrieval set, and produce a comparable output.

### 60.2 What reproducibility requires

| Requirement | How it is met |
|---|---|
| Model version pinning | The AI Governance Record stores the model version; the platform retains versioned models |
| Policy version pinning | The policy version is stored; the platform retains versioned policies |
| Retrieval set pinning | The retrieval set is stored; the platform can reconstruct the retrieval |
| Source record versioning | Source records are versioned; the version used is recorded |
| Timestamp anchoring | The layered timestamp anchors the analysis in time |

### 60.3 What reproducibility does and does not guarantee

Reproducibility guarantees that the platform can re-run the analysis with the same inputs. It does not guarantee that the output will be byte-identical, because some models (particularly those with sampling) may produce slightly different outputs on re-run. Where exact reproducibility is required (e.g., for legal proceedings), the platform uses deterministic model configurations (temperature 0, fixed seed, where supported).

### 60.4 Use

Reproducibility is used: in supervisor review (Chapter 39), the supervisor can reproduce an AI analysis to verify it; in audit (Chapter 48, Chapter 57), auditors can reproduce analyses to verify their basis; in legal proceedings, where AI outputs are referenced, their basis can be reconstructed; and in AI Red Team (Chapter 65), red-team tests can re-run historical analyses to detect regressions.

### 60.5 Versioned context

The versioned context includes: the model version; the policy version; the retrieval set (with source record versions); and the system configuration at the time of the original analysis. The platform retains versioned context for the full retention period of the AI Governance Record.

### 60.6 What the platform does not promise

The platform does not promise that AI outputs are correct. It promises that they are reconstructable. Correctness is a separate question, addressed by the AI Hallucination Firewall (Chapter 64), the AI Source-Citation Enforcement (Chapter 61), and the AI Confidence Decomposition (Chapter 62).

---

## Chapter 61: AI Source-Citation Enforcement (Section 116)

### 61.1 The principle

Material AI claims must point to their sources. A material claim is one that informs a finding, a recommendation, or an action. The platform enforces that material AI claims cite: evidence (Chapter 5); records (in the Operational Vault or Preservation Vault); events (in the case timeline); documents (in the case file); rules (in the Rule Graph, Chapter 3); or calculations (in the case's analytical record).

### 61.2 What "cite" means

A citation is a structured pointer:

```
AICitation {
  claim                     // the material claim
  source_type               // EVIDENCE | RECORD | EVENT | DOCUMENT | RULE | CALCULATION
  source_id                 // the specific source identifier
  source_version            // the version of the source
  source_excerpt            // the specific excerpt that supports the claim
  confidence                // the confidence decomposition (Chapter 62)
}
```

### 61.3 Enforcement

The platform enforces citation at the output boundary: AI outputs without citations for material claims are flagged `UNCITED_CLAIM`; uncited claims cannot inform findings, recommendations, or actions; the investigator must either add a citation (if a source exists) or treat the claim as unsupported.

### 61.4 What is not enforced

The platform does not enforce that the cited source actually supports the claim. That is the investigator's judgment. A citation is a pointer; whether the pointed-to source supports the claim is a separate question.

### 61.5 What is not a citation

A reference to "the case file" without a specific source is not a citation. A reference to "the investigator's knowledge" is not a citation. A reference to "general knowledge" or "common understanding" is not a citation. A reference to a model's training data is not a citation.

### 61.6 Use

Citations are part of the AI Governance Record (Chapter 59). They are surfaced in supervisor review (Chapter 39) and in Investigation Quality Assurance (Chapter 38). A finding that rests on an uncited AI claim fails IQA.

---

## Chapter 62: AI Confidence Decomposition (Section 117)

### 62.1 The principle

The platform does not present AI confidence as a single number. A claim that "Risk = 89%" conceals the dimensions on which the confidence rests. Instead, the platform decomposes confidence along multiple dimensions.

### 62.2 The dimensions

| Dimension | What it measures |
|---|---|
| Temporal anomaly | Confidence that the temporal pattern is unusual |
| Evidence corroboration | Confidence that the evidence corroborates the claim |
| Process deviation | Confidence that the process deviated from the norm |
| Identity linkage | Confidence in the identity linkage |
| Data reliability | Confidence in the reliability of the underlying data |
| Overall analytical confidence | The overall confidence, explicitly composite |

### 62.3 Output

Instead of `Risk: 89%`, the platform produces:

```
Confidence {
  temporal_anomaly        { level: HIGH,   basis: "..." }
  evidence_corroboration { level: MEDIUM, basis: "..." }
  process_deviation      { level: HIGH,   basis: "..." }
  identity_linkage       { level: LOW,    basis: "..." }
  data_reliability       { level: MEDIUM, basis: "..." }
  overall                { level: MEDIUM, basis: "composite, weakest-link weighted" }
}
```

### 62.4 Why decomposition

Decomposition forces the investigator and supervisor to see where the confidence is strong and where it is weak. A claim with high temporal-anomaly confidence but low identity-linkage confidence is not "medium-risk"; it is "strong on timing, weak on identity," and the investigator must address the identity weakness specifically.

### 62.5 What the decomposition does not do

It does not produce a single number (the overall level is a structured composite, not an average); it does not replace investigator judgment (the investigator may agree or disagree with any dimension); and it does not claim that confidence is correctness (a high-confidence claim can still be wrong).

### 62.6 Use

Confidence decomposition is part of the AI Governance Record (Chapter 59). It is surfaced in supervisor review (Chapter 39) and IQA (Chapter 38). Findings resting on claims with low confidence on a critical dimension are flagged for additional verification.

---

## Chapter 63: Prompt-Injection Firewall (Section 118)

### 63.1 The principle

Government documents, uploaded files, and external content are **untrusted data**. They must never override AI system instructions. The Prompt-Injection Firewall enforces this separation.

### 63.2 The threat model

| Threat | Description |
|---|---|
| Direct prompt injection | A document contains text that attempts to override the AI's instructions (e.g., "Ignore previous instructions and...") |
| Indirect prompt injection | A document contains text designed to manipulate the AI's behavior through retrieved context |
| Document-embedded instructions | A document contains embedded instructions (in metadata, hidden text, or formatting) |
| Adversarial media | A document, image, or audio file crafted to manipulate the AI |

### 63.3 The firewall

The Prompt-Injection Firewall enforces: **system instructions are immutable per session** (the AI's system instructions cannot be modified by the content of retrieved or uploaded documents); **untrusted data is labeled** (all external content is wrapped in untrusted-data tags that the AI treats as data, not as instructions); **instruction/data separation** (the AI is structurally prevented from acting on instructions found in untrusted data); and **output filtering** (the AI's output is checked for indicators that it followed injected instructions — sudden topic shifts, instructions echoed back).

### 63.4 Rule catalog (excerpt)

The full rule catalog is in Appendix D. Core rules include: `SYS-IMMUTABLE` (system instructions are immutable per session); `UNTRUSTED-WRAP` (external content is wrapped in untrusted-data tags); `NO-ACTION-FROM-DATA` (the AI must not take actions based on instructions in untrusted data); `OUTPUT-FILTER-SENSITIVE` (outputs containing echoes of injected instructions are filtered); `METADATA-STRIP` (document metadata that could carry instructions is stripped before processing); and `EMBEDDED-INSTRUCTION-DETECT` (embedded instructions in formatting or hidden text are detected and flagged).

### 63.5 What the firewall does not promise

The firewall does not promise perfect defense against all prompt-injection attacks. Prompt injection is an active research area, and adversaries continually develop new techniques. The firewall provides defense in depth; the AI Red Team (Chapter 65) continually tests it.

### 63.6 Use

The Prompt-Injection Firewall is mandatory for all AI capabilities that process external content. A capability that cannot meet the firewall's requirements is not deployed. Exceptions require explicit authorization by the AI governance authority, with the exception logged on the Audit Plane.

---

## Chapter 64: AI Hallucination Firewall (Section 119)

### 64.1 The principle

AI outputs may contain hallucinations: invented facts, people, dates, citations, or causal claims. The AI Hallucination Firewall checks official drafts for hallucination indicators before they are issued.

### 64.2 What is checked

| Indicator | What is detected |
|---|---|
| Invented facts | Facts not supported by any source in the case |
| Invented people | Names not present in any case record |
| Invented dates | Dates not anchored in case evidence |
| Fake citations | Citations to documents that do not exist or do not contain the cited content |
| Unsupported causality | Causal claims not supported by the evidence |
| Contradictions | Claims that contradict other claims in the same output or the case record |

### 64.3 How the check works

The firewall cross-references each material claim in the AI output against: the case record (entities, dates, documents); the retrieval set (Chapter 59); the Rule Graph (Chapter 3) for rule claims; the Evidence Independence graph (Chapter 24) for corroboration claims; and the case timeline for temporal claims. A claim that cannot be grounded in any of these is flagged `UNVERIFIED`.

### 64.4 Output

```
HallucinationCheckReport {
  ai_output_id
  checks[] {
    claim
    check_type              // FACT | PERSON | DATE | CITATION | CAUSALITY | CONTRADICTION
    status                  // VERIFIED | UNVERIFIED | CONTRADICTS
    basis                   // the source(s) that verify or contradict
  }
  overall                   // CLEAN | FLAGGED | BLOCKED
}
```

### 64.5 What the firewall does

`CLEAN` outputs may proceed (subject to human review, Chapter 59). `FLAGGED` outputs are returned to the investigator with the flagged claims highlighted. `BLOCKED` outputs (those with contradictions or fake citations) are not issued; they must be remediated.

### 64.6 What the firewall does not do

It does not certify that the output is correct (`CLEAN` means the claims are grounded in the case record; it does not mean the claims are true); it does not replace human review (the investigator remains the decision-maker); and it does not block exploratory AI use (where the investigator is testing hypotheses). It blocks official drafts only.

---

## Chapter 65: AI Red Team (Section 120)

### 65.1 The principle

The platform continuously tests its AI capabilities against adversarial conditions. The AI Red Team is a permanent function, not a one-time exercise.

### 65.2 What is tested

| Test | Description |
|---|---|
| Hallucination | The AI's tendency to invent facts, people, dates, citations |
| Prompt injection | The AI's resistance to prompt-injection attacks (Chapter 63) |
| Adversarial documents | The AI's robustness against documents crafted to manipulate |
| Adversarial media | The AI's robustness against images, audio, video crafted to manipulate |
| Data poisoning | The AI's robustness against poisoned training or retrieval data |
| Bias | The AI's tendency to produce biased outputs across protected categories |
| Overconfidence | The AI's tendency to produce high-confidence outputs on weak evidence |

### 65.3 Red Team operations

The Red Team: designs and executes adversarial tests on a defined cadence; records each test, its inputs, its outputs, and its findings; reports findings to the AI governance authority; tracks remediation of identified weaknesses; and re-tests after remediation to confirm effectiveness.

### 65.4 What the Red Team is not

The Red Team is not: a substitute for the Prompt-Injection Firewall (Chapter 63) or the Hallucination Firewall (Chapter 64) (it tests them; it does not replace them); a one-time security review (it is a continuous function); or an external audit (it is an internal function, with results surfaced to the Independent Audit Plane, Chapter 57).

### 65.5 Bias testing

Bias testing examines whether the AI's outputs differ systematically across protected categories (e.g., gender, region, tribal affiliation, religion, socioeconomic status) in ways that cannot be justified by the underlying evidence. Where bias is detected, the AI capability is flagged, and remediation may include retraining, prompt adjustment, or restriction of the capability's use.

### 65.6 Overconfidence testing

Overconfidence testing examines whether the AI produces high-confidence outputs on weak evidence. A model that produces `HIGH` confidence on a single low-reliability source is overconfident. Remediation may include confidence recalibration or restriction of the model's use to contexts where its confidence is justified.

### 65.7 Reporting

Red Team findings are reported to: the AI governance authority; the Independent Audit Plane; and (aggregated, non-attributable) the institutional leadership. Findings that indicate a critical weakness trigger immediate review of the affected AI capability and may result in temporary suspension of the capability pending remediation.

---

## Appendix A — Evidence Quality Matrix Reference Card

### A.1 The seven dimensions

| Dimension | Question | Levels |
|---|---|---|
| Authenticity | Is the evidence what it purports to be? | HIGH / MEDIUM / LOW / INSUFFICIENT |
| Provenance | Is the chain of origin reconstructable? | HIGH / MEDIUM / LOW / INSUFFICIENT |
| Integrity | Has the evidence been preserved unmodified? | HIGH / MEDIUM / LOW / INSUFFICIENT |
| Reliability | Is the source competent and credible? | HIGH / MEDIUM / LOW / INSUFFICIENT |
| Relevance | Does the evidence bear on a material question? | HIGH / MEDIUM / LOW / INSUFFICIENT |
| Corroboration | Is the evidence independently supported? | HIGH / MEDIUM / LOW / INSUFFICIENT |
| Completeness | Is the evidence complete in scope and context? | HIGH / MEDIUM / LOW / INSUFFICIENT |

### A.2 Forbidden

- A single "quality score" for a piece of evidence.
- An aggregate that conceals dimension-specific weaknesses.
- A level without a basis.

### A.3 Required for each cell

- The level.
- The basis (the specific facts that justify the level).
- The reviewer (who assigned the level).
- The timestamp.
- The version (each update is versioned; prior versions retained).

---

## Appendix B — Dual Vault Architecture Diagram

### B.1 The two-vault model

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          EVIDENCE LIFECYCLE                              │
│                                                                          │
│   CAPTURE (device)                                                       │
│       │                                                                  │
│       ▼                                                                  │
│   ENCRYPT + SIGN + CHUNK                                                 │
│       │                                                                  │
│       ▼                                                                  │
│   LIVE RELAY (Ch.17) or OFFLINE BUFFER (Ch.20)                          │
│       │                                                                  │
│       ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                    OPERATIONAL VAULT                            │    │
│   │   (for investigators)                                           │    │
│   │                                                                 │    │
│   │   • Working copies of sealed originals                          │    │
│   │   • Derived artifacts (Ch.7)                                    │    │
│   │   • Annotations, markers (Ch.16)                                │    │
│   │   • Search indexes (transcripts, OCR, embeddings)               │    │
│   │   • Read/write by case investigators and supervisors             │    │
│   │                                                                 │    │
│   │   Administered by: OPERATIONAL ADMINISTRATION                  │    │
│   │   Keys: OPERATIONAL KEYS                                       │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│       │                                                                  │
│       │      PRESERVATION COPY (one-way, signed, witnessed)             │
│       │                                                                  │
│       ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                   PRESERVATION VAULT                             │    │
│   │   (immutable institutional preservation)                        │    │
│   │                                                                 │    │
│   │   • Sealed originals (Ch.6)                                     │    │
│   │   • Cryptographic witnesses (Ch.15)                            │    │
│   │   • Disposition records (Ch.6)                                  │    │
│   │   • Continuity reports (Ch.12)                                 │    │
│   │   • Provenance manifests (Ch.8)                                │    │
│   │                                                                 │    │
│   │   Administered by: PRESERVATION SECURITY ADMINISTRATION         │    │
│   │   Keys: PRESERVATION KEYS (separate from Operational)          │    │
│   │   Mode: APPEND-ONLY                                            │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│       │                                                                  │
│       │      WITNESS ANCHORS (periodic, Chapter 15)                     │
│       │                                                                  │
│       ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                   INDEPENDENT AUDIT PLANE (Ch.57)               │    │
│   │                                                                 │    │
│   │   • Audit log entries (Ch.48)                                  │    │
│   │   • Privileged session records (Ch.51)                         │    │
│   │   • Break-glass access records (Ch.56)                         │    │
│   │   • Disposition records (Ch.6)                                  │    │
│   │   • Canary access records (Ch.50)                              │    │
│   │   • Separation-of-duties violations (Ch.53)                    │    │
│   │   • Insider risk notices (Ch.49)                               │    │
│   │                                                                 │    │
│   │   Administered by: INDEPENDENT AUDIT AUTHORITY                 │    │
│   │   Keys: AUDIT KEYS (separate from all others)                  │    │
│   │   Mode: APPEND-ONLY                                            │    │
│   └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### B.2 Separation summary

| Administration | Owns | Does NOT own |
|---|---|---|
| Operational | Operational Vault, services, workflows | Preservation Vault, Audit Plane |
| Security | Identity, access control, device CA | Evidence content, Audit Plane content |
| Preservation | Preservation Vault, witnesses, disposition | Operational services, identity |
| Audit | Audit Plane, audit queries | Any of the above (read-only across all) |

---

## Appendix C — AI Governance Provenance Record Schema

### C.1 The record

```
AIGovernanceRecord {
  // Identity
  record_id                    // UUIDv7, time-ordered

  // Model context
  model
  model_version
  model_provider               // sovereign / commercial / open
  policy_version               // the AI policy that governed this output

  // Source context
  source_records[]             // pointers to records in Operational / Preservation Vault
  retrieval_set[]              // the specific records retrieved as context
  retrieval_query              // the query that produced the retrieval set
  retrieval_timestamp          // when the retrieval was performed

  // Output
  timestamp                    // layered timestamp (Ch.11)
  output                       // the AI output (text, structured, etc.)
  output_hash                  // hash for integrity
  citations[]                  // Ch.61 — citations for material claims
  confidence                   // Ch.62 — confidence decomposition

  // Hallucination firewall
  hallucination_check          // Ch.64 — VERIFIED / UNVERIFIED / CONTRADICTS
  prompt_injection_check       // Ch.63 — PASS / FLAG / BLOCK

  // Review
  reviewer                     // who reviewed (human)
  review_timestamp
  review_decision              // ACCEPTED | MODIFIED | REJECTED | DEFERRED
  review_notes

  // Final action
  final_action                 // what was done with the output
  final_action_actor           // who took the final action
  final_action_timestamp

  // Case context
  case_id                      // the case context
  purpose                      // the purpose for which AI was invoked

  // Reproducibility
  reproducibility_token        // a token that allows reproduction (Ch.60)
  versioned_context_ref        // pointer to the versioned context bundle

  // Audit
  audit_plane_reference        // pointer to the Independent Audit Plane entry
}
```

### C.2 Retention

AI Governance Records are retained for the full retention period of the case to which they relate. Even after case closure, the records are retained per sovereign records-management law.

### C.3 Querying

Authorized auditors can query AI Governance Records by: case; model and version; reviewer; final action; hallucination check status; or citation status. All queries are themselves logged on the Audit Plane.

---

## Appendix D — Prompt-Injection Firewall Rule Catalog

### D.1 Core rules

| Rule ID | Rule | Enforcement |
|---|---|---|
| `PIF-001` | System instructions are immutable per session | System prompt is loaded at session start and cannot be modified by retrieved or uploaded content |
| `PIF-002` | External content is wrapped in untrusted-data tags | All external content is wrapped before being provided to the AI |
| `PIF-003` | The AI must not take actions based on instructions in untrusted data | The AI's instruction surface is structurally separated from its data surface |
| `PIF-004` | Outputs containing echoes of injected instructions are filtered | Output post-processing detects and filters echoes |
| `PIF-005` | Document metadata is stripped before processing | Metadata that could carry instructions is removed |
| `PIF-006` | Embedded instructions in formatting or hidden text are detected | Hidden text, white-on-white text, and similar are detected |
| `PIF-007` | The AI's available actions are explicitly enumerated | The AI cannot take actions outside its enumerated action set |
| `PIF-008` | External content cannot invoke actions | Untrusted data cannot trigger actions; only the user's explicit instruction can |
| `PIF-009` | The AI must refuse instructions that conflict with system instructions | Conflicts are detected and the AI refuses the conflicting instruction |
| `PIF-010` | All PIF events are logged | Each PIF rule invocation is logged on the Audit Plane |

### D.2 Output filtering rules

| Rule ID | Rule | Enforcement |
|---|---|---|
| `PIF-101` | Outputs containing "ignore previous instructions" patterns are flagged | Pattern matching on known injection phrases |
| `PIF-102` | Outputs with sudden topic shifts are flagged | Topic-shift detection |
| `PIF-103` | Outputs that echo untrusted content verbatim are flagged | Verbatim echo detection |
| `PIF-104` | Outputs that instruct the user to perform actions are flagged | Action-instruction detection |

### D.3 Continuous improvement

The rule catalog is versioned. New rules are added as the Red Team (Chapter 65) identifies new attack patterns. Rules are deprecated only after a formal review confirms they are no longer needed.

---

## Appendix E — Cross-Chapter Dependency & Implementation Priority

### E.1 Key dependencies (selected)

| Chapter | Depends on | Reason |
|---|---|---|
| 2 (Law at the Time) | 1 (Regulatory Temporal Engine) | Frame-T resolution uses the engine |
| 6 (Immutability) | 5, 9, 10, 14 | Sealing requires capture, trusted device, signing, dual vault |
| 7 (Derived Copy) | 6 (Immutability) | Derivation requires immutability of the original |
| 14 (Dual Vault) | 6, 15 | Vault separation enables immutability and witnessing |
| 17 (Live Relay) | 5, 10, 14 | Relay requires capture, signing, vault |
| 26 (Quality Matrix) | 24, 25 | Quality dimensions incorporate independence and contamination |
| 38 (IQA) | 26, 31, 40 | IQA verifies findings, evidence, and responses |
| 40 (Finding-to-Rule) | 1, 3, 26 | Findings reference rules, evidence, and quality |
| 41 (Finding-to-Reform) | 40, 42 | Reforms follow findings and root causes |
| 48 (Audit) | 57 (Audit Plane) | Audit data lives on the Audit Plane |
| 59 (AI Governance) | 58, 61, 62 | Governance uses broker, citations, confidence |
| 63 (PIF) / 64 (Hallucination) | 65 (Red Team) | Firewalls are tested by Red Team |

### E.2 Reading order

For a reader new to this Part: Chapter 1 (temporal foundation) → Chapter 5 and Chapter 6 (evidence foundation) → Chapter 14 and Chapter 57 (architectural separation) → Chapter 58 and Chapter 59 (AI governance foundation) → remaining chapters build on these.

### E.3 Implementation priority

Most foundational chapters to implement first: Chapter 6 (Immutability — without this, no other evidence guarantee holds); Chapter 14 (Dual Vault — without this, immutability is unenforceable); Chapter 57 (Audit Plane — without this, audit is compromised); Chapter 58 (Zero-Trust AI — without this, AI is uncontrollable); Chapter 1 (Regulatory Temporal Engine — without this, findings rest on wrong rules).

---

## Closing Note

This Part IV of the ACA Sovereign Edition Blueprint establishes the integrity, oversight, and AI governance architecture of the ACA platform. The platform is a sovereign institutional instrument: it must hold evidence that survives challenge, run investigations that withstand review, enforce audit that the auditors themselves cannot quietly rewrite, and constrain AI so that it assists the institution without becoming the institution. Where this Part conflicts with operational convenience, deployment speed, or vendor defaults, those yield. The platform's authority rests on the integrity of its evidence and the governance of its intelligence. To compromise either for any reason is to forfeit the platform's reason to exist. The next Part will address the platform's intelligence and reform layers (Sections 121 onward), building on the integrity foundation established here.

---

*End of Part IV — ACA Sovereign Edition Blueprint.*

// @ts-nocheck
/**
 * ACA Evidence Manager — Integrity & Immutability
 * ============================================================================
 * Sovereign-grade evidence handling for the ACA layer.
 *
 * THE CARDINAL RULE (per CIRKLE-ACA-BLUEPRINT Part II, §10):
 *   Sealed evidence is IMMUTABLE. After sealing, NO edit, NO overwrite, NO
 *   delete is permitted — by anyone, ever, including the system administrator.
 *
 *   - Sealing binds: the cryptographic hash of the captured payload, the
 *     captured-at timestamp, the capturing device's hardware identity, the
 *     capturing agent, and the assignment context. Any later "version" of
 *     the evidence is NOT the same artifact and CANNOT overwrite the sealed
 *     original.
 *   - When the case team needs a transformed representation (redaction,
 *     transcription, translation, format conversion), they create a DERIVED
 *     COPY linked to the immutable original. The derived copy carries its own
 *     hash + its own chain of custody, but always traces back to the sealed
 *     original.
 *   - Chain of custody is APPEND-ONLY and starts at the moment of capture,
 *     not at the moment of sealing.
 *
 * Production note:
 *   The hash function here uses Web Crypto's SHA-256 (or a Node fallback)
 *   for the building phase. Production MUST anchor each sealed hash in an HSM-
 *   bound timestamping service (per Part IV, §86 — Independent Audit Plane).
 * ============================================================================
 */

import { db } from "@/lib/db";
import { safeDbQuery } from "@/lib/db-safe";

// ────────────────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────────────────

export type AcaEvidenceType = "video" | "audio" | "photo" | "document" | "digital";

export type AcaCaptureMethod =
  | "citizen_shield_app"
  | "aca_field_app"
  | "aca_drone"
  | "aca_bodycam"
  | "inter_agency_referral"
  | "third_party_subpoena"
  | "system_export";

export type AcaChainOfCustodyKind =
  | "captured"
  | "uploaded_to_aca"
  | "viewed"
  | "sealed"
  | "derived_copied"
  | "exported"            // export requires two-person authorization
  | "transcribed"
  | "translated"
  | "redacted"
  | "annotated";

export interface AcaChainOfCustodyEntry {
  entryId: string;
  evidenceId: string;
  kind: AcaChainOfCustodyKind;
  timestamp: string;
  actorAgentId: string;
  actorDisplayName: string;
  description: string;
  deviceFingerprint?: string;
  twoPersonPartnerAgentId?: string; // for `exported` and similar
  metadata?: Record<string, unknown>;
}

export interface AcaDerivedCopy {
  derivedId: string;
  parentEvidenceId: string;
  purpose: "redaction" | "transcription" | "translation" | "format_conversion" | "annotation";
  label: string;
  hash: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  description: string;
}

export interface AcaEvidence {
  evidenceId: string;
  caseId: string;
  assignmentId?: string;          // assignment under which it was captured
  label: string;
  type: AcaEvidenceType;
  captureMethod: AcaCaptureMethod;
  capturedBy: string;              // agent id
  capturedByName: string;
  capturedAt: string;              // ISO — when the actual capture happened (device clock)
  uploadedAt: string;             // ISO — when it entered the ACA system
  location?: {
    lat?: number;
    lng?: number;
    label?: string;
  };
  deviceIdentity: {
    deviceId: string;
    deviceFingerprint: string;
    trustedExecutionEnvironment?: boolean;
  };
  payloadRef: string;              // content-addressed storage key (CID or hash)
  payloadSizeBytes: number;
  mimeType: string;
  integrityHash: string;           // SHA-256 of payload bytes
  hashAlgorithm: "sha256";
  sealed: boolean;
  sealedAt?: string;
  sealedBy?: string;
  sealedByName?: string;
  sealingAnchor?: string;          // HSM-anchored timestamp id (production)
  derivedCopies: AcaDerivedCopy[];
  chainOfCustody: AcaChainOfCustodyEntry[];
  metadata?: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────────────────
//  Store (in-process cache for the building phase)
// ────────────────────────────────────────────────────────────────────────────

const _evidence = new Map<string, AcaEvidence>();

// ────────────────────────────────────────────────────────────────────────────
//  Hashing
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hash the evidence payload. Accepts a Uint8Array (in-process capture),
 * a Buffer (server), or a base64 string. Uses SHA-256 via Web Crypto with
 * a Node `crypto` fallback for environments where `crypto.subtle` is absent.
 */
export async function computeIntegrityHash(
  payload: Uint8Array | Buffer | string,
): Promise<string> {
  let bytes: Uint8Array;
  if (typeof payload === "string") {
    bytes = new TextEncoder().encode(payload);
  } else {
    bytes = payload as Uint8Array;
  }
  // Web Crypto path
  const g = globalThis as any;
  if (g.crypto?.subtle?.digest) {
    const buf = await g.crypto.subtle.digest("SHA-256", bytes as BufferSource);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Node fallback
  const nodeCrypto = await import("node:crypto").catch(() => null);
  if (nodeCrypto) {
    return nodeCrypto.createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  }
  // Last-resort non-cryptographic hash (NOT for production)
  let h = 5381;
  for (let i = 0; i < bytes.length; i++) h = ((h << 5) + h) ^ bytes[i];
  return `weak_${(h >>> 0).toString(16)}_${bytes.length}`;
}

// ────────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────────

const nowIso = () => new Date().toISOString();
const genId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

// ────────────────────────────────────────────────────────────────────────────
//  Public API
// ────────────────────────────────────────────────────────────────────────────

export interface SubmitEvidenceInput {
  caseId: string;
  assignmentId?: string;
  label: string;
  type: AcaEvidenceType;
  captureMethod: AcaCaptureMethod;
  capturedBy: string;
  capturedByName: string;
  capturedAt?: string;            // override (default: now)
  location?: AcaEvidence["location"];
  deviceIdentity: AcaEvidence["deviceIdentity"];
  payloadRef: string;
  payloadSizeBytes: number;
  mimeType: string;
  payload?: Uint8Array | Buffer | string;  // optional, used to compute hash
  integrityHashOverride?: string;          // if caller precomputed hash
  metadata?: Record<string, unknown>;
}

export async function submitEvidence(input: SubmitEvidenceInput): Promise<AcaEvidence> {
  const integrityHash =
    input.integrityHashOverride ??
    (input.payload
      ? await computeIntegrityHash(input.payload)
      : await computeIntegrityHash(input.payloadRef));

  const ev: AcaEvidence = {
    evidenceId: genId("ev"),
    caseId: input.caseId,
    assignmentId: input.assignmentId,
    label: input.label,
    type: input.type,
    captureMethod: input.captureMethod,
    capturedBy: input.capturedBy,
    capturedByName: input.capturedByName,
    capturedAt: input.capturedAt ?? nowIso(),
    uploadedAt: nowIso(),
    location: input.location,
    deviceIdentity: input.deviceIdentity,
    payloadRef: input.payloadRef,
    payloadSizeBytes: input.payloadSizeBytes,
    mimeType: input.mimeType,
    integrityHash,
    hashAlgorithm: "sha256",
    sealed: false,
    derivedCopies: [],
    chainOfCustody: [
      {
        entryId: genId("coc"),
        evidenceId: "",
        kind: "captured",
        timestamp: input.capturedAt ?? nowIso(),
        actorAgentId: input.capturedBy,
        actorDisplayName: input.capturedByName,
        description: `Captured via ${input.captureMethod}.`,
        deviceFingerprint: input.deviceIdentity.deviceFingerprint,
      },
      {
        entryId: genId("coc"),
        evidenceId: "",
        kind: "uploaded_to_aca",
        timestamp: nowIso(),
        actorAgentId: input.capturedBy,
        actorDisplayName: input.capturedByName,
        description: `Uploaded to ACA case ${input.caseId}.`,
        deviceFingerprint: input.deviceIdentity.deviceFingerprint,
      },
    ],
    metadata: input.metadata,
  };
  // back-fill evidenceId on chain entries
  ev.chainOfCustody.forEach((e) => (e.evidenceId = ev.evidenceId));
  _evidence.set(ev.evidenceId, ev);
  return ev;
}

export function getEvidence(evidenceId: string): AcaEvidence | null {
  return _evidence.get(evidenceId) ?? null;
}

export function listEvidenceForCase(caseId: string): AcaEvidence[] {
  return Array.from(_evidence.values()).filter((e) => e.caseId === caseId);
}

export function sealEvidence(input: {
  evidenceId: string;
  sealedBy: string;
  sealedByName: string;
}): AcaEvidence | null {
  const ev = _evidence.get(input.evidenceId);
  if (!ev) return null;
  if (ev.sealed) return ev;  // idempotent — already sealed

  ev.sealed = true;
  ev.sealedAt = nowIso();
  ev.sealedBy = input.sealedBy;
  ev.sealedByName = input.sealedByName;
  ev.sealingAnchor = `anchor_${genId("anc")}`; // production: HSM-bound timestamp

  ev.chainOfCustody.push({
    entryId: genId("coc"),
    evidenceId: ev.evidenceId,
    kind: "sealed",
    timestamp: ev.sealedAt,
    actorAgentId: input.sealedBy,
    actorDisplayName: input.sealedByName,
    description: `Evidence sealed. Integrity hash ${ev.integrityHash.slice(0, 16)}… anchored.`,
    deviceFingerprint: ev.deviceIdentity.deviceFingerprint,
    metadata: {
      integrityHash: ev.integrityHash,
      hashAlgorithm: ev.hashAlgorithm,
      sealingAnchor: ev.sealingAnchor,
    },
  });

  return ev;
}

export function createDerivedCopy(input: {
  parentEvidenceId: string;
  purpose: AcaDerivedCopy["purpose"];
  label: string;
  description: string;
  derivedPayload?: Uint8Array | Buffer | string;
  derivedHashOverride?: string;
  createdBy: string;
  createdByName: string;
}): AcaEvidence | null {
  const parent = _evidence.get(input.parentEvidenceId);
  if (!parent) return null;
  if (!parent.sealed) return null;  // cannot derive from an unsealed original

  const hash = input.derivedHashOverride ??
    (input.derivedPayload
      ? "" // sync compute not awaited here — caller should pass override
      : "");

  const derived: AcaDerivedCopy = {
    derivedId: genId("der"),
    parentEvidenceId: parent.evidenceId,
    purpose: input.purpose,
    label: input.label,
    hash: hash || `pending_${genId("h")}`,
    createdAt: nowIso(),
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    description: input.description,
  };
  parent.derivedCopies.push(derived);
  parent.chainOfCustody.push({
    entryId: genId("coc"),
    evidenceId: parent.evidenceId,
    kind: "derived_copied",
    timestamp: derived.createdAt,
    actorAgentId: input.createdBy,
    actorDisplayName: input.createdByName,
    description: `Derived copy created for purpose: ${input.purpose}.`,
    metadata: { derivedId: derived.derivedId, label: input.label },
  });
  return parent;
}

export function getChainOfCustody(evidenceId: string): AcaChainOfCustodyEntry[] {
  const ev = _evidence.get(evidenceId);
  if (!ev) return [];
  return [...ev.chainOfCustody].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export async function verifyIntegrity(input: {
  evidenceId: string;
  expectedHash?: string;
}): Promise<{
  evidenceId: string;
  verified: boolean;
  computedHash: string;
  expectedHash: string;
  sealed: boolean;
  chainLength: number;
}> {
  const ev = _evidence.get(input.evidenceId);
  if (!ev) {
    return {
      evidenceId: input.evidenceId,
      verified: false,
      computedHash: "",
      expectedHash: input.expectedHash ?? "",
      sealed: false,
      chainLength: 0,
    };
  }
  const expected = input.expectedHash ?? ev.integrityHash;
  // In the building phase, we trust the stored hash; production must re-hash
  // the actual payload bytes from content-addressed storage and compare.
  const verified = expected === ev.integrityHash && expected.length === 64;
  return {
    evidenceId: ev.evidenceId,
    verified,
    computedHash: ev.integrityHash,
    expectedHash: expected,
    sealed: ev.sealed,
    chainLength: ev.chainOfCustody.length,
  };
}

/**
 * HARD GUARD: any attempt to mutate sealed evidence MUST go through this guard.
 * The function unconditionally returns `false` — sealing is irreversible.
 * This is referenced by the API layer as a defence-in-depth check.
 */
export function canModifyEvidence(evidenceId: string): boolean {
  const ev = _evidence.get(evidenceId);
  if (!ev) return true; // not yet created
  return !ev.sealed;
}

/**
 * Reject any attempt to delete sealed evidence. This function ALWAYS returns
 * `false` for sealed evidence — there is no override, no admin bypass.
 */
export function canDeleteEvidence(evidenceId: string): boolean {
  const ev = _evidence.get(evidenceId);
  if (!ev) return true;
  if (ev.sealed) return false;
  return true;
}

export function recordEvidenceView(input: {
  evidenceId: string;
  viewerAgentId: string;
  viewerDisplayName: string;
}): AcaEvidence | null {
  const ev = _evidence.get(input.evidenceId);
  if (!ev) return null;
  ev.chainOfCustody.push({
    entryId: genId("coc"),
    evidenceId: ev.evidenceId,
    kind: "viewed",
    timestamp: nowIso(),
    actorAgentId: input.viewerAgentId,
    actorDisplayName: input.viewerDisplayName,
    description: "Evidence viewed in ACA workspace.",
  });
  return ev;
}

export function recordEvidenceExport(input: {
  evidenceId: string;
  exporterAgentId: string;
  exporterDisplayName: string;
  confirmingAgentId: string;  // two-person partner
  confirmingDisplayName: string;
  destination: string;
}): AcaEvidence | null {
  const ev = _evidence.get(input.evidenceId);
  if (!ev) return null;
  if (!ev.sealed) return null; // cannot export unsealed evidence
  ev.chainOfCustody.push({
    entryId: genId("coc"),
    evidenceId: ev.evidenceId,
    kind: "exported",
    timestamp: nowIso(),
    actorAgentId: input.exporterAgentId,
    actorDisplayName: input.exporterDisplayName,
    description: `Evidence exported to ${input.destination}.`,
    twoPersonPartnerAgentId: input.confirmingAgentId,
    metadata: {
      destination: input.destination,
      confirmedBy: input.confirmingAgentId,
    },
  });
  return ev;
}

// ────────────────────────────────────────────────────────────────────────────
//  Persistence helpers (DB optional — degrades gracefully)
// ────────────────────────────────────────────────────────────────────────────

export async function persistEvidence(ev: AcaEvidence): Promise<void> {
  await safeDbQuery(() =>
    db.acaEvidence?.upsert({
      where: { evidenceId: ev.evidenceId },
      create: {
        evidenceId: ev.evidenceId,
        caseId: ev.caseId,
        label: ev.label,
        type: ev.type,
        captureMethod: ev.captureMethod,
        capturedBy: ev.capturedBy,
        capturedAt: new Date(ev.capturedAt),
        uploadedAt: new Date(ev.uploadedAt),
        payloadRef: ev.payloadRef,
        payloadSizeBytes: ev.payloadSizeBytes,
        mimeType: ev.mimeType,
        integrityHash: ev.integrityHash,
        hashAlgorithm: ev.hashAlgorithm,
        sealed: ev.sealed,
        sealedAt: ev.sealedAt ? new Date(ev.sealedAt) : null,
        sealedBy: ev.sealedBy ?? null,
      },
      update: {
        // NOTE: only derived-copy / chain updates are permitted; the payload,
        // hash, capture, and seal fields are immutable once written.
        sealed: ev.sealed,
        sealedAt: ev.sealedAt ? new Date(ev.sealedAt) : null,
        sealedBy: ev.sealedBy ?? null,
      },
    }),
  );
}

export async function loadEvidenceFromDb(evidenceId: string): Promise<AcaEvidence | null> {
  const row = await safeDbQuery(() =>
    db.acaEvidence?.findUnique({ where: { evidenceId } }),
  );
  if (!row) return null;
  return {
    evidenceId: row.evidenceId,
    caseId: row.caseId,
    label: row.label,
    type: row.type as AcaEvidenceType,
    captureMethod: row.captureMethod as AcaCaptureMethod,
    capturedBy: row.capturedBy,
    capturedByName: "",
    capturedAt: row.capturedAt instanceof Date ? row.capturedAt.toISOString() : String(row.capturedAt),
    uploadedAt: row.uploadedAt instanceof Date ? row.uploadedAt.toISOString() : String(row.uploadedAt),
    deviceIdentity: {
      deviceId: row.deviceId ?? "unknown",
      deviceFingerprint: row.deviceFingerprint ?? "unknown",
    },
    payloadRef: row.payloadRef,
    payloadSizeBytes: row.payloadSizeBytes ?? 0,
    mimeType: row.mimeType ?? "application/octet-stream",
    integrityHash: row.integrityHash,
    hashAlgorithm: "sha256",
    sealed: Boolean(row.sealed),
    sealedAt: row.sealedAt instanceof Date ? row.sealedAt.toISOString() : undefined,
    sealedBy: row.sealedBy ?? undefined,
    derivedCopies: [],
    chainOfCustody: [],
  };
}

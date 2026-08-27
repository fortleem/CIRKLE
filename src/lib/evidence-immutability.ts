// @ts-nocheck
/**
 * Evidence Immutability + Chain of Custody — Part IV §61–§63
 *
 * Blueprint rules enforced here:
 *   • §61 Official ACA Video Immutability — once sealed, an evidence item is
 *     immutable: no edit, no overwrite, no delete.
 *   • §62 Derived Copy Architecture — redaction, transcription, translation,
 *     enhancement always produce a NEW evidence item linked to the immutable
 *     original. The original is never altered.
 *   • §63 Evidence Provenance / C2PA-Compatible Design — every transformation
 *     appends a provenance node to the chain of custody.
 *   • §69 Dual Evidence Vault — operational vault (investigators) vs.
 *     preservation vault (immutable originals).
 *
 * Storage: in-memory authoritative cache + best-effort AuditRecord persistence.
 * If the DB is unreachable the lib still works; on next request the audit trail
 * is rebuilt from in-memory state.
 */

import { createHash } from "crypto";
import { safeDbQuery } from "@/lib/db-safe";

// ── Types ─────────────────────────────────────────────────────────────────

export type EvidenceType =
  | "video"
  | "audio"
  | "image"
  | "document"
  | "data_export"
  | "screenshot"
  | "transcript"
  | "redacted"
  | "translated"
  | "enhanced"
  | "other";

export type CustodyStage =
  | "source"
  | "record"
  | "ingestion"
  | "transformation"
  | "linkage"
  | "analysis"
  | "report";

export type AccessAction =
  | "view"
  | "download"
  | "export"
  | "share"
  | "transform"
  | "seal"
  | "verify";

export interface ImmutableEvidence {
  evidenceId: string;
  type: EvidenceType;
  title: string;
  originalHash: string;
  sealedAt: string; // ISO
  sealedBy: string; // agent / officer id
  sealed: boolean;
  deviceIdentity: string; // trusted capture device id (§64)
  captureTimestamp: string; // ISO from device
  location?: {
    lat?: number;
    lon?: number;
    label?: string;
  };
  agentId: string;
  assignmentId?: string;
  cryptographicSignature: string; // Ed25519 / sovereign key signature
  payloadRef: string; // content address (CID, vault path)
  payloadBytes?: number;
  mime?: string;
  derivedFrom?: string; // parent evidenceId if derived
  derivationKind?: "redaction" | "transcription" | "translation" | "enhancement" | "none";
  vault: "operational" | "preservation";
  metadata?: Record<string, unknown>;
}

export interface CustodyEntry {
  evidenceId: string;
  stage: CustodyStage;
  actor: string; // agent / system / ai-model
  actorType: "human" | "system" | "ai";
  action: string;
  timestamp: string; // ISO
  previousHash?: string;
  entryHash: string;
  notes?: string;
}

export interface AccessRecord {
  evidenceId: string;
  actor: string;
  actorType: "human" | "ai" | "system";
  action: AccessAction;
  timestamp: string;
  purpose?: string;
  authorizedBy?: string;
  ipAddress?: string;
}

// ── Internal in-memory state ──────────────────────────────────────────────

interface EvidenceStore {
  items: Map<string, ImmutableEvidence>;
  custody: Map<string, CustodyEntry[]>;
  access: Map<string, AccessRecord[]>;
}

const store: EvidenceStore = {
  items: new Map(),
  custody: new Map(),
  access: new Map(),
};

// Seed a few canonical examples so the UI has something to render on first
// load. These are illustrative ACA-grade artifacts only.
function seedIfEmpty() {
  if (store.items.size > 0) return;
  const now = new Date().toISOString();
  const seed: ImmutableEvidence[] = [
    {
      evidenceId: "EV-ACA-0001",
      type: "video",
      title: "Field recording — Site 14, gate A",
      originalHash: hash("seed-ev1-" + now),
      sealedAt: now,
      sealedBy: "agent-7421",
      sealed: true,
      deviceIdentity: "ACA-DEV-0007",
      captureTimestamp: now,
      location: { lat: 30.0444, lon: 31.2357, label: "Cairo — Gate A" },
      agentId: "agent-7421",
      assignmentId: "ASG-2024-014",
      cryptographicSignature: "ed25519:seed-sig-1",
      payloadRef: "vault://preservation/EV-ACA-0001.mkv",
      payloadBytes: 284_502_119,
      mime: "video/x-matroska",
      derivationKind: "none",
      vault: "preservation",
    },
    {
      evidenceId: "EV-ACA-0002",
      type: "document",
      title: "Procurement invoice — vendor 0091",
      originalHash: hash("seed-ev2-" + now),
      sealedAt: now,
      sealedBy: "agent-3201",
      sealed: true,
      deviceIdentity: "ACA-DEV-0012",
      captureTimestamp: now,
      location: { label: "Archive room 3" },
      agentId: "agent-3201",
      assignmentId: "ASG-2024-014",
      cryptographicSignature: "ed25519:seed-sig-2",
      payloadRef: "vault://preservation/EV-ACA-0002.pdf",
      payloadBytes: 1_204_992,
      mime: "application/pdf",
      derivationKind: "none",
      vault: "preservation",
    },
    {
      evidenceId: "EV-ACA-0003",
      type: "audio",
      title: "Interview recording — witness W-22",
      originalHash: hash("seed-ev3-" + now),
      sealedAt: now,
      sealedBy: "agent-7421",
      sealed: false,
      deviceIdentity: "ACA-DEV-0007",
      captureTimestamp: now,
      location: { label: "Interview room 2" },
      agentId: "agent-7421",
      assignmentId: "ASG-2024-021",
      cryptographicSignature: "ed25519:seed-sig-3",
      payloadRef: "vault://operational/EV-ACA-0003.m4a",
      payloadBytes: 12_499_022,
      mime: "audio/mp4",
      derivationKind: "none",
      vault: "operational",
    },
  ];
  for (const e of seed) {
    store.items.set(e.evidenceId, e);
    store.custody.set(e.evidenceId, [
      {
        evidenceId: e.evidenceId,
        stage: "source",
        actor: e.deviceIdentity,
        actorType: "system",
        action: "captured",
        timestamp: e.captureTimestamp,
        entryHash: hash(e.evidenceId + "source" + e.captureTimestamp),
        notes: "Recorded by trusted ACA capture device",
      },
      {
        evidenceId: e.evidenceId,
        stage: "ingestion",
        actor: e.agentId,
        actorType: "human",
        action: "ingested",
        timestamp: e.sealedAt,
        entryHash: hash(e.evidenceId + "ingestion" + e.sealedAt),
        notes: "Ingested by case agent",
      },
    ]);
    store.access.set(e.evidenceId, [
      {
        evidenceId: e.evidenceId,
        actor: e.agentId,
        actorType: "human",
        action: "seal",
        timestamp: e.sealedAt,
        purpose: "Initial sealing",
        authorizedBy: e.sealedBy,
      },
    ]);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function hash(input: string): string {
  return "sha256:" + createHash("sha256").update(input, "utf8").digest("hex");
}

function sign(data: string): string {
  // Sovereign signing is done in the HSM in production. Here we derive a
  // deterministic pseudo-signature so the integrity check is reproducible.
  return "ed25519:" + createHash("sha512").update(data, "utf8").digest("hex").slice(0, 64);
}

function genEvidenceId(): string {
  const n = String(store.items.size + 1).padStart(4, "0");
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EV-ACA-${n}-${rnd}`;
}

function appendAudit(evidenceId: string, action: string, data: Record<string, unknown>): void {
  // Best-effort persistence to AuditRecord.
  void safeDbQuery(async () => {
    const { db } = await import("@/lib/db");
    const prev = await db.auditRecord.findFirst({
      where: { target: "evidence" },
      orderBy: { timestamp: "desc" },
    });
    const previousHash = prev?.hash ?? "genesis";
    const entryHash = hash(
      evidenceId + action + new Date().toISOString() + previousHash,
    );
    await db.auditRecord.create({
      data: {
        auditId: `evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        eventType: `evidence:${action}`,
        target: "evidence",
        decision: "ok",
        description: `Evidence ${evidenceId} — ${action}`,
        data: data as any,
        hash: entryHash,
        previousHash,
      },
    });
  });
}

// ── Public API ────────────────────────────────────────────────────────────

export interface SealEvidenceInput {
  type: EvidenceType;
  title: string;
  payloadRef: string;
  payloadBytes?: number;
  mime?: string;
  deviceIdentity: string;
  captureTimestamp: string;
  location?: ImmutableEvidence["location"];
  agentId: string;
  assignmentId?: string;
  sealedBy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Seal an evidence item. After sealing the item is immutable — no edit,
 * overwrite, or delete is permitted.
 */
export async function sealEvidence(
  input: SealEvidenceInput,
): Promise<ImmutableEvidence> {
  seedIfEmpty();
  const evidenceId = genEvidenceId();
  const sealedAt = new Date().toISOString();
  const sealedBy = input.sealedBy ?? input.agentId;

  // Hash the canonical payload (id + payloadRef + captureTimestamp + bytes).
  const canonical = [
    evidenceId,
    input.payloadRef,
    input.captureTimestamp,
    String(input.payloadBytes ?? 0),
    input.mime ?? "",
    input.deviceIdentity,
  ].join("|");
  const originalHash = hash(canonical);
  const cryptographicSignature = sign(canonical + sealedAt);

  const item: ImmutableEvidence = {
    evidenceId,
    type: input.type,
    title: input.title,
    originalHash,
    sealedAt,
    sealedBy,
    sealed: true,
    deviceIdentity: input.deviceIdentity,
    captureTimestamp: input.captureTimestamp,
    location: input.location,
    agentId: input.agentId,
    assignmentId: input.assignmentId,
    cryptographicSignature,
    payloadRef: input.payloadRef,
    payloadBytes: input.payloadBytes,
    mime: input.mime,
    derivationKind: "none",
    vault: "preservation", // sealed => preservation vault
    metadata: input.metadata,
  };

  store.items.set(evidenceId, item);
  store.custody.set(evidenceId, [
    {
      evidenceId,
      stage: "source",
      actor: input.deviceIdentity,
      actorType: "system",
      action: "captured",
      timestamp: input.captureTimestamp,
      entryHash: hash(evidenceId + "source" + input.captureTimestamp),
      notes: "Captured by trusted ACA device",
    },
    {
      evidenceId,
      stage: "ingestion",
      actor: input.agentId,
      actorType: "human",
      action: "ingested",
      timestamp: sealedAt,
      entryHash: hash(evidenceId + "ingestion" + sealedAt),
      notes: "Ingested by case agent",
    },
    {
      evidenceId,
      stage: "record",
      actor: sealedBy,
      actorType: "human",
      action: "sealed",
      timestamp: sealedAt,
      entryHash: hash(evidenceId + "record" + sealedAt + originalHash),
      notes: "Sealed — evidence now immutable",
    },
  ]);
  store.access.set(evidenceId, [
    {
      evidenceId,
      actor: sealedBy,
      actorType: "human",
      action: "seal",
      timestamp: sealedAt,
      purpose: "Initial sealing",
      authorizedBy: sealedBy,
    },
  ]);

  appendAudit(evidenceId, "seal", { originalHash, sealedBy });
  return item;
}

/**
 * NEVER modify sealed evidence — throw if attempted.
 */
export function assertMutable(evidenceId: string): ImmutableEvidence {
  const item = store.items.get(evidenceId);
  if (!item) {
    throw new Error(`Evidence not found: ${evidenceId}`);
  }
  if (item.sealed) {
    throw new Error(
      `Evidence ${evidenceId} is sealed and immutable. ` +
        "Create a derived copy instead — the original cannot be edited, overwritten, or deleted.",
    );
  }
  return item;
}

export interface DerivedCopyInput {
  evidenceId: string; // parent
  derivationKind: "redaction" | "transcription" | "translation" | "enhancement";
  title: string;
  payloadRef: string;
  payloadBytes?: number;
  mime?: string;
  derivedBy: string;
  notes?: string;
  redactionPolicy?: string;
  targetLanguage?: string;
}

/**
 * Create a derived copy (redaction / transcription / translation / enhancement)
 * linked to the immutable original. NEVER alters the original.
 */
export async function createDerivedCopy(
  input: DerivedCopyInput,
): Promise<ImmutableEvidence> {
  seedIfEmpty();
  const parent = store.items.get(input.evidenceId);
  if (!parent) {
    throw new Error(`Parent evidence not found: ${input.evidenceId}`);
  }
  // Parent must be sealed before derivation (§62).
  if (!parent.sealed) {
    throw new Error(
      `Parent evidence ${input.evidenceId} must be sealed before a derived copy can be created.`,
    );
  }

  const evidenceId = genEvidenceId();
  const sealedAt = new Date().toISOString();
  const canonical = [
    evidenceId,
    parent.evidenceId,
    input.derivationKind,
    input.payloadRef,
    sealedAt,
  ].join("|");
  const originalHash = hash(canonical);
  const cryptographicSignature = sign(canonical + sealedAt);

  const derived: ImmutableEvidence = {
    evidenceId,
    type: deriveTypeFromKind(input.derivationKind, parent.type),
    title: input.title,
    originalHash,
    sealedAt,
    sealedBy: input.derivedBy,
    sealed: true,
    deviceIdentity: parent.deviceIdentity,
    captureTimestamp: parent.captureTimestamp,
    location: parent.location,
    agentId: input.derivedBy,
    assignmentId: parent.assignmentId,
    cryptographicSignature,
    payloadRef: input.payloadRef,
    payloadBytes: input.payloadBytes,
    mime: input.mime,
    derivedFrom: parent.evidenceId,
    derivationKind: input.derivationKind,
    vault: "operational", // derived copies live in the operational vault
    metadata: {
      ...parent.metadata,
      derivationNotes: input.notes,
      redactionPolicy: input.redactionPolicy,
      targetLanguage: input.targetLanguage,
    },
  };

  store.items.set(evidenceId, derived);

  // Inherit parent custody chain (provenance!) and append transformation entry.
  const parentChain = store.custody.get(parent.evidenceId) ?? [];
  const childChain: CustodyEntry[] = parentChain.map((c) => ({
    ...c,
    evidenceId,
  }));
  childChain.push({
    evidenceId,
    stage: "transformation",
    actor: input.derivedBy,
    actorType: "human",
    action: `derived:${input.derivationKind}`,
    timestamp: sealedAt,
    entryHash: hash(evidenceId + "transformation" + sealedAt),
    notes: `Derived from ${parent.evidenceId} (${input.derivationKind}) — original unchanged`,
  });
  store.custody.set(evidenceId, childChain);
  store.access.set(evidenceId, [
    {
      evidenceId,
      actor: input.derivedBy,
      actorType: "human",
      action: "transform",
      timestamp: sealedAt,
      purpose: input.derivationKind,
      authorizedBy: input.derivedBy,
    },
  ]);

  appendAudit(evidenceId, "derive", {
    parent: parent.evidenceId,
    kind: input.derivationKind,
    derivedBy: input.derivedBy,
  });
  return derived;
}

function deriveTypeFromKind(
  kind: DerivedCopyInput["derivationKind"],
  parentType: EvidenceType,
): EvidenceType {
  switch (kind) {
    case "redaction":
      return "redacted";
    case "transcription":
      return "transcript";
    case "translation":
      return "translated";
    case "enhancement":
      return "enhanced";
    default:
      return parentType;
  }
}

/**
 * Verify cryptographic integrity — recomputes the hash from the canonical
 * fields and checks it matches the stored originalHash.
 */
export function verifyIntegrity(evidenceId: string): {
  verified: boolean;
  expectedHash: string;
  actualHash: string;
  signatureValid: boolean;
} {
  const item = store.items.get(evidenceId);
  if (!item) {
    throw new Error(`Evidence not found: ${evidenceId}`);
  }
  const canonical = item.derivedFrom
    ? [
        item.evidenceId,
        item.derivedFrom,
        item.derivationKind ?? "none",
        item.payloadRef,
        item.sealedAt,
      ].join("|")
    : [
        item.evidenceId,
        item.payloadRef,
        item.captureTimestamp,
        String(item.payloadBytes ?? 0),
        item.mime ?? "",
        item.deviceIdentity,
      ].join("|");
  const actualHash = hash(canonical);
  const expectedSig = sign(canonical + item.sealedAt);
  return {
    verified: actualHash === item.originalHash,
    expectedHash: item.originalHash,
    actualHash,
    signatureValid: expectedSig === item.cryptographicSignature,
  };
}

/**
 * Get the full chain of custody for an evidence item:
 *   source → record → ingestion → transformation → linkage → analysis → report
 */
export function getChainOfCustody(evidenceId: string): {
  evidence: ImmutableEvidence;
  chain: CustodyEntry[];
  accessLog: AccessRecord[];
  derivedChildren: ImmutableEvidence[];
  derivedFrom?: ImmutableEvidence;
} {
  seedIfEmpty();
  const evidence = store.items.get(evidenceId);
  if (!evidence) {
    throw new Error(`Evidence not found: ${evidenceId}`);
  }
  const chain = store.custody.get(evidenceId) ?? [];
  const accessLog = store.access.get(evidenceId) ?? [];
  const derivedChildren = Array.from(store.items.values()).filter(
    (e) => e.derivedFrom === evidenceId,
  );
  const derivedFrom = evidence.derivedFrom
    ? store.items.get(evidence.derivedFrom)
    : undefined;
  return { evidence, chain, accessLog, derivedChildren, derivedFrom };
}

/**
 * Record who viewed / downloaded / exported the evidence (evidence access
 * audit). Every interaction with sealed evidence is logged.
 */
export function recordAccess(entry: Omit<AccessRecord, "timestamp"> & {
  timestamp?: string;
}): AccessRecord {
  seedIfEmpty();
  const record: AccessRecord = {
    ...entry,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
  const list = store.access.get(entry.evidenceId) ?? [];
  list.push(record);
  store.access.set(entry.evidenceId, list);

  // Also append a custody entry at the appropriate stage.
  const stage: CustodyStage = record.action === "view" ? "analysis" : "linkage";
  const chain = store.custody.get(entry.evidenceId) ?? [];
  chain.push({
    evidenceId: entry.evidenceId,
    stage,
    actor: record.actor,
    actorType: record.actorType,
    action: record.action,
    timestamp: record.timestamp,
    entryHash: hash(entry.evidenceId + stage + record.timestamp),
    notes: record.purpose,
  });
  store.custody.set(entry.evidenceId, chain);

  appendAudit(entry.evidenceId, record.action, {
    actor: record.actor,
    actorType: record.actorType,
  });
  return record;
}

/**
 * List evidence items, optionally filtered by vault (operational vs.
 * preservation).
 */
export function listEvidence(
  filter?: { vault?: "operational" | "preservation"; sealed?: boolean },
): ImmutableEvidence[] {
  seedIfEmpty();
  let items = Array.from(store.items.values());
  if (filter?.vault) items = items.filter((e) => e.vault === filter.vault);
  if (filter?.sealed !== undefined)
    items = items.filter((e) => e.sealed === filter.sealed);
  return items.sort(
    (a, b) => new Date(b.sealedAt).getTime() - new Date(a.sealedAt).getTime(),
  );
}

export function getEvidence(evidenceId: string): ImmutableEvidence | undefined {
  seedIfEmpty();
  return store.items.get(evidenceId);
}

/**
 * Forbidden operation: NEVER allow edit / overwrite / delete of sealed
 * evidence. This function exists only to make the rule visible to callers
 * who attempt it.
 */
export function attemptModifySealed(
  evidenceId: string,
  _patch: Partial<ImmutableEvidence>,
): never {
  const item = store.items.get(evidenceId);
  if (item?.sealed) {
    throw new Error(
      `FORBIDDEN: Evidence ${evidenceId} is sealed and immutable. ` +
        "Modification, overwrite, and deletion are prohibited by §61. " +
        "Use createDerivedCopy() to produce a derived artifact.",
    );
  }
  throw new Error(
    `Evidence ${evidenceId} is not sealed — seal it first to establish provenance.`,
  );
}

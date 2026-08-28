// @ts-nocheck
// P0 FIX: Now persists to Prisma DB with in-memory fallback
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
 * P0 FIX Storage strategy:
 *   • AcaEvidence rows are the durable source of truth across restarts.
 *   • EvidenceChainOfCustody rows persist the provenance graph.
 *   • EvidenceAccessLog rows persist the access audit trail.
 *   • An in-memory cache (`store`) is kept in sync with every write so the
 *     synchronous public surface (getEvidence / getChainOfCustody /
 *     verifyIntegrity / listEvidence) continues to work without await.
 *   • Every DB write is wrapped in safeDbQuery — if the DB is unavailable
 *     (tables not yet created, env var missing, serverless cold start), the
 *     in-memory cache remains authoritative and a warning is logged.
 */

import { createHash } from "crypto";
import { db } from "@/lib/db";
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

// ── Internal in-memory cache (fallback + low-latency read cache) ──────────

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

let _seeded = false;

// Seed a few canonical examples so the UI has something to render on first
// load. These are illustrative ACA-grade artifacts only.
function seedIfEmpty() {
  if (_seeded) return;
  _seeded = true;
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
  // Best-effort: mirror the seed into the DB so a fresh install has the same
  // canonical examples available across restarts. Failures are non-fatal.
  for (const e of seed) {
    void dbCreateEvidence(e).catch(() => {});
    for (const c of store.custody.get(e.evidenceId) ?? []) {
      void dbAppendCustody(c).catch(() => {});
    }
    for (const a of store.access.get(e.evidenceId) ?? []) {
      void dbAppendAccess(a).catch(() => {});
    }
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
  }).catch(() => {
    /* AuditRecord table may not exist yet — non-fatal */
  });
}

// ── DB persistence helpers (P0 FIX) ───────────────────────────────────────
//
// The AcaEvidence schema stores a subset of ImmutableEvidence fields directly
// (evidenceId, type, captureMethod, capturedBy, capturedAt, location,
// deviceIdentity, assignmentId, integrityHash, sealed, sealedAt, sealedBy).
// The remaining fields (title, originalHash, cryptographicSignature,
// payloadRef, payloadBytes, mime, derivedFrom, derivationKind, vault,
// metadata) are persisted as JSON inside the `derivedCopies` column (which is
// a JSON string in the schema) so they survive DB round-trips. On read, the
// JSON is unpacked back into the ImmutableEvidence shape.
//
// All DB calls are wrapped in safeDbQuery — if the DB is unavailable, the
// caller sees no error and the in-memory cache remains authoritative.

function packExtraFields(item: ImmutableEvidence): string {
  return JSON.stringify({
    title: item.title,
    originalHash: item.originalHash,
    cryptographicSignature: item.cryptographicSignature,
    payloadRef: item.payloadRef,
    payloadBytes: item.payloadBytes ?? null,
    mime: item.mime ?? null,
    derivedFrom: item.derivedFrom ?? null,
    derivationKind: item.derivationKind ?? "none",
    vault: item.vault,
    metadata: item.metadata ?? null,
    agentId: item.agentId,
  });
}

function unpackExtraFields(row: any): Partial<ImmutableEvidence> {
  let extra: any = {};
  try {
    extra = row.derivedCopies ? JSON.parse(row.derivedCopies) : {};
  } catch {
    extra = {};
  }
  return {
    title: extra.title ?? "(untitled)",
    originalHash: row.integrityHash ?? extra.originalHash ?? "",
    cryptographicSignature: extra.cryptographicSignature ?? "",
    payloadRef: extra.payloadRef ?? "",
    payloadBytes: extra.payloadBytes ?? undefined,
    mime: extra.mime ?? undefined,
    derivedFrom: extra.derivedFrom ?? undefined,
    derivationKind: extra.derivationKind ?? "none",
    vault: extra.vault ?? "operational",
    metadata: extra.metadata ?? undefined,
    agentId: extra.agentId ?? row.capturedBy ?? "",
  };
}

function rowToEvidence(row: any): ImmutableEvidence | null {
  if (!row) return null;
  let location: ImmutableEvidence["location"];
  try {
    location = row.location ? JSON.parse(row.location) : undefined;
  } catch {
    location = undefined;
  }
  const extra = unpackExtraFields(row);
  return {
    evidenceId: row.evidenceId,
    type: row.type as EvidenceType,
    title: extra.title ?? "(untitled)",
    originalHash: row.integrityHash ?? extra.originalHash ?? "",
    sealedAt: row.sealedAt instanceof Date ? row.sealedAt.toISOString() : (row.sealedAt ?? new Date().toISOString()),
    sealedBy: row.sealedBy ?? "",
    sealed: Boolean(row.sealed),
    deviceIdentity: row.deviceIdentity ?? "",
    captureTimestamp: row.capturedAt instanceof Date ? row.capturedAt.toISOString() : (row.capturedAt ?? new Date().toISOString()),
    location,
    agentId: extra.agentId,
    assignmentId: row.assignmentId ?? undefined,
    cryptographicSignature: extra.cryptographicSignature,
    payloadRef: extra.payloadRef,
    payloadBytes: extra.payloadBytes,
    mime: extra.mime,
    derivedFrom: extra.derivedFrom,
    derivationKind: extra.derivationKind,
    vault: extra.vault,
    metadata: extra.metadata,
  };
}

/** Upsert an evidence item into the AcaEvidence table (best-effort). */
export async function dbCreateEvidence(item: ImmutableEvidence): Promise<void> {
  const result = await safeDbQuery(() =>
    db.acaEvidence.upsert({
      where: { evidenceId: item.evidenceId },
      create: {
        evidenceId: item.evidenceId,
        type: item.type,
        captureMethod: "device_capture",
        capturedBy: item.agentId,
        capturedAt: new Date(item.captureTimestamp),
        location: item.location ? JSON.stringify(item.location) : null,
        deviceIdentity: item.deviceIdentity,
        assignmentId: item.assignmentId ?? null,
        integrityHash: item.originalHash,
        sealed: item.sealed,
        sealedAt: item.sealedAt ? new Date(item.sealedAt) : null,
        sealedBy: item.sealedBy ?? null,
        derivedCopies: packExtraFields(item),
        chainOfCustody: "[]",
      },
      update: {
        sealed: item.sealed,
        sealedAt: item.sealedAt ? new Date(item.sealedAt) : null,
        sealedBy: item.sealedBy ?? null,
        integrityHash: item.originalHash,
        derivedCopies: packExtraFields(item),
      },
    }),
  );
  if (result === null) {
    console.warn(
      `[evidence-immutability] DB unavailable for evidence ${item.evidenceId} — falling back to in-memory only`,
    );
  }
}

/** Append a custody entry to the EvidenceChainOfCustody table (best-effort). */
export async function dbAppendCustody(entry: CustodyEntry): Promise<void> {
  const result = await safeDbQuery(() =>
    db.evidenceChainOfCustody.create({
      data: {
        evidenceId: entry.evidenceId,
        stage: entry.stage,
        actor: entry.actor,
        actorType: entry.actorType,
        action: entry.action,
        timestamp: new Date(entry.timestamp),
        entryHash: entry.entryHash,
        previousHash: entry.previousHash ?? null,
      },
    }),
  );
  if (result === null) {
    console.warn(
      `[evidence-immutability] DB unavailable for custody entry on ${entry.evidenceId} — in-memory only`,
    );
  }
}

/** Append an access record to the EvidenceAccessLog table (best-effort). */
export async function dbAppendAccess(rec: AccessRecord): Promise<void> {
  const result = await safeDbQuery(() =>
    db.evidenceAccessLog.create({
      data: {
        evidenceId: rec.evidenceId,
        actor: rec.actor,
        actorType: rec.actorType,
        action: rec.action,
        timestamp: new Date(rec.timestamp),
        purpose: rec.purpose ?? null,
        authorizedBy: rec.authorizedBy ?? null,
        ipAddress: rec.ipAddress ?? null,
      },
    }),
  );
  if (result === null) {
    console.warn(
      `[evidence-immutability] DB unavailable for access log on ${rec.evidenceId} — in-memory only`,
    );
  }
}

/** Load a single evidence item from the DB into the in-memory cache. */
export async function dbLoadEvidence(evidenceId: string): Promise<ImmutableEvidence | null> {
  const row = await safeDbQuery(() =>
    db.acaEvidence.findUnique({ where: { evidenceId } }),
  );
  if (!row) return null;
  const item = rowToEvidence(row);
  if (item) {
    store.items.set(evidenceId, item);
    // Refresh custody + access in the same pass so callers see fresh data.
    const chain = await dbLoadChain(evidenceId);
    if (chain.length > 0) store.custody.set(evidenceId, chain);
    const access = await dbLoadAccess(evidenceId);
    if (access.length > 0) store.access.set(evidenceId, access);
  }
  return item ?? null;
}

/** Load the full chain of custody for an evidence item from the DB. */
export async function dbLoadChain(evidenceId: string): Promise<CustodyEntry[]> {
  const rows = await safeDbQuery(() =>
    db.evidenceChainOfCustody.findMany({
      where: { evidenceId },
      orderBy: { timestamp: "asc" },
    }),
  );
  if (!rows) return [];
  return rows.map((r: any) => ({
    evidenceId: r.evidenceId,
    stage: r.stage as CustodyStage,
    actor: r.actor,
    actorType: r.actorType as CustodyEntry["actorType"],
    action: r.action,
    timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp),
    entryHash: r.entryHash,
    previousHash: r.previousHash ?? undefined,
  }));
}

/** Load the access log for an evidence item from the DB. */
export async function dbLoadAccess(evidenceId: string): Promise<AccessRecord[]> {
  const rows = await safeDbQuery(() =>
    db.evidenceAccessLog.findMany({
      where: { evidenceId },
      orderBy: { timestamp: "asc" },
    }),
  );
  if (!rows) return [];
  return rows.map((r: any) => ({
    evidenceId: r.evidenceId,
    actor: r.actor,
    actorType: r.actorType as AccessRecord["actorType"],
    action: r.action as AccessAction,
    timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp),
    purpose: r.purpose ?? undefined,
    authorizedBy: r.authorizedBy ?? undefined,
    ipAddress: r.ipAddress ?? undefined,
  }));
}

/** Load ALL evidence items from the DB into the in-memory cache. */
export async function dbLoadAllEvidence(): Promise<ImmutableEvidence[]> {
  const rows = await safeDbQuery(() => db.acaEvidence.findMany());
  if (!rows) return [];
  const items: ImmutableEvidence[] = [];
  for (const row of rows) {
    const item = rowToEvidence(row);
    if (item) {
      store.items.set(item.evidenceId, item);
      items.push(item);
    }
  }
  return items;
}

/** Fire-and-forget prefetch — used by sync read paths to keep the cache fresh. */
function prefetchEvidence(evidenceId: string): void {
  void dbLoadEvidence(evidenceId).catch(() => {});
}

function prefetchAllEvidence(): void {
  void (async () => {
    try {
      const items = await dbLoadAllEvidence();
      // Update custody + access caches for each item in the background.
      for (const item of items) {
        const chain = await dbLoadChain(item.evidenceId);
        if (chain.length > 0) store.custody.set(item.evidenceId, chain);
        const access = await dbLoadAccess(item.evidenceId);
        if (access.length > 0) store.access.set(item.evidenceId, access);
      }
    } catch {
      /* DB unavailable — non-fatal */
    }
  })();
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

  // 1. In-memory write (synchronous, immediate).
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

  // 2. DB persistence (P0 FIX — durable across restarts).
  //    `db.acaEvidence.update({ where: { evidenceId }, data: { sealed: true,
  //    sealedAt, sealedBy } })` semantically — implemented as upsert here
  //    because we are also creating the row.
  await dbCreateEvidence(item);
  for (const c of store.custody.get(evidenceId) ?? []) {
    await dbAppendCustody(c);
  }
  for (const a of store.access.get(evidenceId) ?? []) {
    await dbAppendAccess(a);
  }

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

  // 1. In-memory write.
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

  // 2. DB persistence (P0 FIX — durable derived copy + chain entries).
  await dbCreateEvidence(derived);
  for (const c of childChain) {
    await dbAppendCustody(c);
  }
  for (const a of store.access.get(evidenceId) ?? []) {
    await dbAppendAccess(a);
  }

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
 *
 * Sync surface preserved: reads from the in-memory cache. If the evidence is
 * not in the cache, a fire-and-forget DB prefetch is triggered so a subsequent
 * call sees fresh data.
 */
export function verifyIntegrity(evidenceId: string): {
  verified: boolean;
  expectedHash: string;
  actualHash: string;
  signatureValid: boolean;
} {
  seedIfEmpty();
  const item = store.items.get(evidenceId);
  if (!item) {
    prefetchEvidence(evidenceId);
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
 * Async variant — reads the evidence + chain + access log from the DB and
 * returns a fresh view. Use this when callers can await and need the most
 * up-to-date data (e.g. cross-process scenarios).
 */
export async function verifyIntegrityAsync(evidenceId: string): Promise<{
  verified: boolean;
  expectedHash: string;
  actualHash: string;
  signatureValid: boolean;
}> {
  const item = (await dbLoadEvidence(evidenceId)) ?? store.items.get(evidenceId);
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
 *
 * Sync surface preserved: reads from the in-memory cache; a fire-and-forget
 * DB refresh keeps the cache fresh across calls.
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
    prefetchEvidence(evidenceId);
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
  // Fire-and-forget refresh from DB so the next call sees fresh data.
  void (async () => {
    try {
      const dbChain = await dbLoadChain(evidenceId);
      if (dbChain.length > 0) store.custody.set(evidenceId, dbChain);
      const dbAccess = await dbLoadAccess(evidenceId);
      if (dbAccess.length > 0) store.access.set(evidenceId, dbAccess);
    } catch {
      /* DB unavailable — non-fatal */
    }
  })();
  return { evidence, chain, accessLog, derivedChildren, derivedFrom };
}

/**
 * Async variant — queries `db.evidenceChainOfCustody.findMany({ where:
 * { evidenceId }, orderBy: { timestamp: "asc" } })` and returns the fresh
 * chain from the DB (with in-memory fallback).
 */
export async function getChainOfCustodyAsync(evidenceId: string): Promise<{
  evidence: ImmutableEvidence;
  chain: CustodyEntry[];
  accessLog: AccessRecord[];
  derivedChildren: ImmutableEvidence[];
  derivedFrom?: ImmutableEvidence;
}> {
  seedIfEmpty();
  const evidence = (await dbLoadEvidence(evidenceId)) ?? store.items.get(evidenceId);
  if (!evidence) {
    throw new Error(`Evidence not found: ${evidenceId}`);
  }
  const chain = (await dbLoadChain(evidenceId)) || store.custody.get(evidenceId) || [];
  const accessLog = (await dbLoadAccess(evidenceId)) || store.access.get(evidenceId) || [];
  const allItems = (await dbLoadAllEvidence()) || Array.from(store.items.values());
  const derivedChildren = allItems.filter((e) => e.derivedFrom === evidenceId);
  const derivedFrom = evidence.derivedFrom
    ? allItems.find((e) => e.evidenceId === evidence.derivedFrom) ??
      store.items.get(evidence.derivedFrom)
    : undefined;
  // Keep in-memory cache in sync.
  store.items.set(evidenceId, evidence);
  store.custody.set(evidenceId, chain);
  store.access.set(evidenceId, accessLog);
  return { evidence, chain, accessLog, derivedChildren, derivedFrom };
}

/**
 * Record who viewed / downloaded / exported the evidence (evidence access
 * audit). Every interaction with sealed evidence is logged.
 *
 * Sync surface preserved: writes to the in-memory cache immediately and fires
 * off best-effort DB writes (EvidenceAccessLog + EvidenceChainOfCustody) so
 * the audit trail survives restarts.
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
  const custodyEntry: CustodyEntry = {
    evidenceId: entry.evidenceId,
    stage,
    actor: record.actor,
    actorType: record.actorType,
    action: record.action,
    timestamp: record.timestamp,
    entryHash: hash(entry.evidenceId + stage + record.timestamp),
    notes: record.purpose,
  };
  chain.push(custodyEntry);
  store.custody.set(entry.evidenceId, chain);

  // P0 FIX — persist to EvidenceAccessLog + EvidenceChainOfCustody tables.
  void dbAppendAccess(record).catch(() => {});
  void dbAppendCustody(custodyEntry).catch(() => {});

  appendAudit(entry.evidenceId, record.action, {
    actor: record.actor,
    actorType: record.actorType,
  });
  return record;
}

/**
 * List evidence items, optionally filtered by vault (operational vs.
 * preservation).
 *
 * Sync surface preserved: returns the in-memory cache; a fire-and-forget DB
 * refresh keeps the cache fresh across calls.
 */
export function listEvidence(
  filter?: { vault?: "operational" | "preservation"; sealed?: boolean },
): ImmutableEvidence[] {
  seedIfEmpty();
  let items = Array.from(store.items.values());
  if (filter?.vault) items = items.filter((e) => e.vault === filter.vault);
  if (filter?.sealed !== undefined)
    items = items.filter((e) => e.sealed === filter.sealed);
  // Fire-and-forget refresh from DB so the next call sees fresh data.
  prefetchAllEvidence();
  return items.sort(
    (a, b) => new Date(b.sealedAt).getTime() - new Date(a.sealedAt).getTime(),
  );
}

/** Async variant — queries `db.acaEvidence.findMany(...)` directly. */
export async function listEvidenceAsync(
  filter?: { vault?: "operational" | "preservation"; sealed?: boolean },
): Promise<ImmutableEvidence[]> {
  seedIfEmpty();
  const rows = await safeDbQuery(() =>
    db.acaEvidence.findMany({
      where: filter?.sealed !== undefined ? { sealed: filter.sealed } : undefined,
      orderBy: { sealedAt: "desc" },
    }),
  );
  let items: ImmutableEvidence[];
  if (rows && rows.length > 0) {
    items = rows.map(rowToEvidence).filter(Boolean) as ImmutableEvidence[];
    // Keep in-memory cache in sync.
    for (const it of items) store.items.set(it.evidenceId, it);
  } else {
    items = Array.from(store.items.values());
  }
  if (filter?.vault) items = items.filter((e) => e.vault === filter.vault);
  if (filter?.sealed !== undefined)
    items = items.filter((e) => e.sealed === filter.sealed);
  return items.sort(
    (a, b) => new Date(b.sealedAt).getTime() - new Date(a.sealedAt).getTime(),
  );
}

export function getEvidence(evidenceId: string): ImmutableEvidence | undefined {
  seedIfEmpty();
  const item = store.items.get(evidenceId);
  if (!item) {
    // Fire-and-forget DB prefetch so the next call sees fresh data.
    prefetchEvidence(evidenceId);
  }
  return item;
}

/** Async variant — reads from DB and falls back to in-memory. */
export async function getEvidenceAsync(
  evidenceId: string,
): Promise<ImmutableEvidence | undefined> {
  seedIfEmpty();
  const fromDb = await dbLoadEvidence(evidenceId);
  return fromDb ?? store.items.get(evidenceId);
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

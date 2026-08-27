// @ts-nocheck
/**
 * Federated Incident Reference
 * ============================================================================
 * Source architectural authority:
 *   • docs/CIRCLE-EMERGENCY-SERVICE-ROUTING.md — PART XXX (Multi-Agency
 *     Referral), PART XXXI (No Shared Government Case by Default),
 *     PART XXXII (Institutional Case Separation), PART CII
 *     (multi-agency emergency tree).
 *   • docs/CIRCLE-FEDERATED-GOVERNMENT-ARCHITECTURE.md — PART XVIII (No
 *     Cross-Institution Privilege Inheritance), PART XVI (Zero-Copy /
 *     Federated Data Architecture).
 *
 * Non-negotiable principle (PART XXXI, PART XXXII):
 *
 *   FEDERATION ≠ CENTRALIZATION.
 *
 * A federated incident is a *reference object* that links together
 * multiple institutions' independent cases WITHOUT merging them. Each
 * participating institution retains its own case under its own
 * namespace (e.g. Police Case P-001, EMS Case E-001, Fire Case F-001).
 * The federated incident only stores:
 *
 *   • a stable `federatedId`
 *   • the list of participating institutions
 *   • each institution's own case reference (`institutionCaseRefs`)
 *   • a unified timeline (correlation events only — never case-internal
 *     events)
 *   • the coordinator institution
 *   • an aggregate status derived from the participating cases
 *
 * It NEVER stores:
 *   • the case files themselves
 *   • evidence payloads (those remain at their owning institution)
 *   • cross-institution privilege claims (PART XVIII)
 *
 * Typical lifecycle:
 *   1. A multi-agency emergency is detected by the federation router
 *      (Police + EMS, etc.). The Citizen Shield or the originating
 *      institution calls `createFederatedIncident` with the first
 *      institution's case reference.
 *   2. As each additional institution opens its own case, it (or its
 *      adapter) calls `addInstitutionCase` to link that case into the
 *      federated incident.
 *   3. The coordinator institution may close the federated incident
 *      when all participating institutions have closed their own cases.
 * ============================================================================
 */

import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

export type FederatedIncidentType =
  | "multi_agency_emergency"
  | "mass_casualty"
  | "public_safety"
  | "disaster_response"
  | "cross_jurisdiction_investigation"
  | "other";

export type FederatedIncidentStatus =
  | "active"
  | "stabilized"
  | "monitoring"
  | "closed"
  | "archived";

export interface InstitutionCaseRef {
  /** The institution that owns this case. */
  institutionId: string;
  /** The institution's own case id (under its own namespace). */
  caseId: string;
  /** The case type at the institution (e.g. "police_incident", "ems_dispatch"). */
  caseType: string;
  /** When this institution's case was linked into the federated incident. */
  linkedAt: string;
  /** The status of this institution's case as reported by the institution. */
  caseStatus: "open" | "in_progress" | "closed" | "unknown";
}

export interface FederatedTimelineEntry {
  at: string;
  actor: string;
  /** The institution that recorded the event. May be "circle" for federation-level events. */
  institution: string;
  event: string;
  /** Optional cross-reference to the originating case. */
  caseRef?: string;
}

export interface FederatedIncident {
  federatedId: string;
  incidentType: FederatedIncidentType;
  participatingInstitutions: string[];
  institutionCaseRefs: InstitutionCaseRef[];
  timeline: FederatedTimelineEntry[];
  status: FederatedIncidentStatus;
  /** The institution coordinating the federated response. */
  coordinatedBy: string;
  /** Cross-institution correlation id, shared with inter-agency referrals. */
  correlationId: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  In-memory store
// ─────────────────────────────────────────────────────────────────────────────

const INCIDENTS = new Map<string, FederatedIncident>();

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  DB helpers (best-effort; model may not be migrated)
// ─────────────────────────────────────────────────────────────────────────────

async function dbCreate(fi: FederatedIncident): Promise<FederatedIncident | null> {
  try {
    const row = await (db as any).federatedIncident.create({
      data: {
        federatedId: fi.federatedId,
        incidentType: fi.incidentType,
        participatingInstitutions: JSON.stringify(fi.participatingInstitutions),
        institutionCaseRefs: JSON.stringify(fi.institutionCaseRefs),
        timeline: JSON.stringify(fi.timeline),
        status: fi.status,
        coordinatedBy: fi.coordinatedBy,
        correlationId: fi.correlationId,
      },
    });
    return rowToIncident(row);
  } catch {
    return null;
  }
}

async function dbGet(id: string): Promise<FederatedIncident | null> {
  try {
    const row = await (db as any).federatedIncident.findUnique({
      where: { federatedId: id },
    });
    return row ? rowToIncident(row) : null;
  } catch {
    return null;
  }
}

async function dbList(): Promise<FederatedIncident[] | null> {
  try {
    const rows = await (db as any).federatedIncident.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    if (!Array.isArray(rows)) return null;
    return rows.map(rowToIncident);
  } catch {
    return null;
  }
}

async function dbUpdate(fi: FederatedIncident): Promise<FederatedIncident | null> {
  try {
    const row = await (db as any).federatedIncident.update({
      where: { federatedId: fi.federatedId },
      data: {
        participatingInstitutions: JSON.stringify(fi.participatingInstitutions),
        institutionCaseRefs: JSON.stringify(fi.institutionCaseRefs),
        timeline: JSON.stringify(fi.timeline),
        status: fi.status,
        coordinatedBy: fi.coordinatedBy,
      },
    });
    return row ? rowToIncident(row) : null;
  } catch {
    return null;
  }
}

function rowToIncident(row: any): FederatedIncident {
  return {
    federatedId: row.federatedId,
    incidentType: row.incidentType as FederatedIncidentType,
    participatingInstitutions: safeParseArr(row.participatingInstitutions),
    institutionCaseRefs: safeParseArr(row.institutionCaseRefs),
    timeline: safeParseArr(row.timeline),
    status: row.status as FederatedIncidentStatus,
    coordinatedBy: row.coordinatedBy,
    correlationId: row.correlationId,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : nowIso(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : nowIso(),
    closedAt: row.closedAt ? new Date(row.closedAt).toISOString() : undefined,
  };
}

function safeParseArr<T = any>(s: any): T[] {
  if (Array.isArray(s)) return s as T[];
  if (typeof s !== "string") return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateFederatedIncidentInput {
  incidentType: FederatedIncidentType;
  coordinatedBy: string;
  /** The first institution's case reference (optional — `addInstitutionCase` can add later). */
  initialCaseRef?: InstitutionCaseRef;
  correlationId?: string;
  /** Optional federation-level opening note recorded in the timeline. */
  openingNote?: string;
}

/**
 * Create a new federated incident. The incident is created with the
 * coordinating institution and (optionally) the first participating
 * institution's case reference. Each subsequent institution's case is
 * linked via `addInstitutionCase`.
 *
 * The federated incident does NOT contain a case file. Each institution
 * retains its own case under its own namespace — the federated incident
 * only carries references and the cross-institution correlation id.
 */
export async function createFederatedIncident(
  input: CreateFederatedIncidentInput,
): Promise<FederatedIncident> {
  const now = nowIso();
  const correlationId = input.correlationId || uid("CORR");
  const caseRefs: InstitutionCaseRef[] = input.initialCaseRef
    ? [{ ...input.initialCaseRef, linkedAt: now }]
    : [];
  const participating = caseRefs.map((c) => c.institutionId);
  if (!participating.includes(input.coordinatedBy)) {
    participating.push(input.coordinatedBy);
  }

  const fi: FederatedIncident = {
    federatedId: uid("FED"),
    incidentType: input.incidentType,
    participatingInstitutions: participating,
    institutionCaseRefs: caseRefs,
    timeline: [
      {
        at: now,
        actor: input.coordinatedBy,
        institution: input.coordinatedBy,
        event: "federated_incident_opened",
        detail: input.openingNote || "Federated incident opened.",
      },
    ],
    status: "active",
    coordinatedBy: input.coordinatedBy,
    correlationId,
    createdAt: now,
    updatedAt: now,
  };

  const persisted = await dbCreate(fi);
  if (persisted) {
    INCIDENTS.set(persisted.federatedId, persisted);
    return persisted;
  }
  INCIDENTS.set(fi.federatedId, fi);
  return fi;
}

/**
 * Link an institution's own case into an existing federated incident.
 * This does NOT transfer any case file — it only records the
 * institution's case id under the federated incident's `institutionCaseRefs`.
 *
 * If the institution is already linked with the same caseId, the call is
 * a no-op. If the institution is linked with a different caseId, the
 * new caseId is appended (an institution may have multiple cases
 * contributing to a single federated incident — e.g. a traffic case and
 * a criminal investigation case at the same Police authority).
 */
export async function addInstitutionCase(
  federatedId: string,
  ref: Omit<InstitutionCaseRef, "linkedAt">,
  note?: string,
): Promise<FederatedIncident | null> {
  const existing =
    INCIDENTS.get(federatedId) || (await dbGet(federatedId));
  if (!existing) return null;

  const now = nowIso();
  const alreadyLinked = existing.institutionCaseRefs.some(
    (c) => c.institutionId === ref.institutionId && c.caseId === ref.caseId,
  );
  if (alreadyLinked) return existing;

  const newRef: InstitutionCaseRef = { ...ref, linkedAt: now };
  const next: FederatedIncident = {
    ...existing,
    institutionCaseRefs: [...existing.institutionCaseRefs, newRef],
    participatingInstitutions: Array.from(
      new Set([...existing.participatingInstitutions, ref.institutionId]),
    ),
    timeline: [
      ...existing.timeline,
      {
        at: now,
        actor: ref.institutionId,
        institution: ref.institutionId,
        event: "institution_case_linked",
        caseRef: ref.caseId,
        detail: note || `Linked ${ref.institutionId} case ${ref.caseId} (${ref.caseType}).`,
      },
    ],
    updatedAt: now,
  };

  const persisted = await dbUpdate(next);
  if (persisted) {
    INCIDENTS.set(persisted.federatedId, persisted);
    return persisted;
  }
  INCIDENTS.set(federatedId, next);
  return next;
}

export async function getFederatedIncident(
  federatedId: string,
): Promise<FederatedIncident | null> {
  const fromMem = INCIDENTS.get(federatedId);
  if (fromMem) return fromMem;
  const fromDb = await dbGet(federatedId);
  if (fromDb) {
    INCIDENTS.set(fromDb.federatedId, fromDb);
    return fromDb;
  }
  return null;
}

export async function listFederatedIncidents(): Promise<FederatedIncident[]> {
  const fromDb = await dbList();
  if (fromDb && fromDb.length > 0) {
    for (const i of fromDb) INCIDENTS.set(i.federatedId, i);
    return fromDb;
  }
  return Array.from(INCIDENTS.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

/**
 * Append a federation-level timeline event. Used by the coordinator to
 * record correlation observations (e.g. "all agencies confirm dispatch
 * acknowledged") without writing into any institution's case file.
 */
export async function appendTimelineEvent(
  federatedId: string,
  entry: Omit<FederatedTimelineEntry, "at">,
): Promise<FederatedIncident | null> {
  const existing =
    INCIDENTS.get(federatedId) || (await dbGet(federatedId));
  if (!existing) return null;
  const now = nowIso();
  const next: FederatedIncident = {
    ...existing,
    timeline: [...existing.timeline, { ...entry, at: now }],
    updatedAt: now,
  };
  const persisted = await dbUpdate(next);
  if (persisted) {
    INCIDENTS.set(persisted.federatedId, persisted);
    return persisted;
  }
  INCIDENTS.set(federatedId, next);
  return next;
}

/**
 * Close a federated incident. The federated incident can only be closed
 * when every participating institution's case is `closed` (or
 * `unknown`). Closing the federated incident does NOT close any
 * institution's case — each institution closes its own case under its
 * own process.
 */
export async function closeFederatedIncident(
  federatedId: string,
  closedBy: string,
  note?: string,
): Promise<FederatedIncident | null> {
  const existing =
    INCIDENTS.get(federatedId) || (await dbGet(federatedId));
  if (!existing) return null;
  const openCases = existing.institutionCaseRefs.filter(
    (c) => c.caseStatus === "open" || c.caseStatus === "in_progress",
  );
  if (openCases.length > 0) {
    throw new Error(
      `cannot_close: ${openCases.length} institution case(s) are still open`,
    );
  }
  const now = nowIso();
  const next: FederatedIncident = {
    ...existing,
    status: "closed",
    closedAt: now,
    timeline: [
      ...existing.timeline,
      {
        at: now,
        actor: closedBy,
        institution: closedBy,
        event: "federated_incident_closed",
        detail: note || "Federated incident closed by coordinator.",
      },
    ],
    updatedAt: now,
  };
  const persisted = await dbUpdate(next);
  if (persisted) {
    INCIDENTS.set(persisted.federatedId, persisted);
    return persisted;
  }
  INCIDENTS.set(federatedId, next);
  return next;
}

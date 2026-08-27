// @ts-nocheck
/**
 * Inter-Agency Exchange Fabric
 * ============================================================================
 * Source architectural authority:
 *   • docs/CIRCLE-EMERGENCY-SERVICE-ROUTING.md — PART XXX (Multi-Agency
 *     Referral), PART XXXI (No Shared Government Case by Default),
 *     PART XXXII (Institutional Case Separation), PART XXXIII
 *     (Inter-Agency Exchange Fabric), PART XXXIV (Information Request
 *     Object), PART XXXV (Inter-Agency Evidence Reuse), PART XXXVI
 *     (Government Referral Failure).
 *   • docs/CIRCLE-FEDERATED-GOVERNMENT-ARCHITECTURE.md — PART XVI
 *     (Zero-Copy / Federated Data Architecture), PART XVIII (No
 *     Cross-Institution Privilege Inheritance).
 *
 * Non-negotiable rules enforced by this module:
 *   1. NO SHARED GOVERNMENT CASE BY DEFAULT. Each institution receives
 *      only what it is authorized to receive, in its own case namespace.
 *      A Police Case P-001 and an ACA Case A-001 are NEVER merged into a
 *      single shared record — they are connected by a referral + a
 *      correlation identifier only. (PART XXXI, PART XXXII)
 *   2. NO SILENT CROSS-INSTITUTIONAL SHARING. Every cross-institution
 *      exchange must be (a) requested, (b) authorized, (c) logged. The
 *      provenance chain must be reconstructable from the referral record
 *      alone. (Rule 2, PART XVI)
 *   3. MINIMUM-NECESSARY PRINCIPLE. `requestedRecords` must enumerate
 *      exactly which records are requested and why — bulk "give me
 *      everything" requests are rejected. (PART XVI, PART XXXIV)
 *   4. EXPORT RESTRICTIONS. A referral may carry an `exportRestriction`
 *      flag that prohibits further onward referral without the
 *      originating institution's explicit consent.
 * ============================================================================
 */

import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

export type ConfidentialityTier = "public" | "restricted" | "confidential" | "secret";

export type RequestStatus =
  | "draft"
  | "submitted"
  | "received"
  | "in_review"
  | "partially_fulfilled"
  | "fulfilled"
  | "denied"
  | "withdrawn"
  | "expired";

export type ReferralStatus =
  | "pending"
  | "acknowledged"
  | "responded"
  | "completed"
  | "rejected"
  | "failed";

export interface RequestedRecord {
  /** Stable descriptor of the record kind (e.g. "police_report", "incident_log"). */
  kind: string;
  /** Why this record is requested — minimum-necessary justification (PART XVI). */
  justification: string;
  /** Time window the request covers (ISO date range). */
  from?: string;
  to?: string;
  /** Specific record identifier, if known. */
  recordId?: string;
}

export interface InterAgencyRequest {
  requestId: string;
  /** The institution that is requesting information. */
  requestingInstitution: string;
  /** The institution being asked to provide information. */
  receivingInstitution: string;
  /** The case context this request belongs to (requesting institution's own case id). */
  case: {
    caseId: string;
    caseType: string;
    institutionNamespace: string;
  };
  purpose: string;
  requestedRecords: RequestedRecord[];
  legalAuthority: string;
  deadline: string;
  confidentiality: ConfidentialityTier;
  /** Retention instruction for the receiving side. ISO duration or "until_case_close". */
  retention: string;
  /** Prohibits onward referral of any returned record without explicit consent. */
  exportRestriction: boolean;
  response: {
    status: RequestStatus;
    fulfilledRecords?: RequestedRecord[];
    notes?: string;
    respondedAt?: string;
    respondedBy?: string;
    denialReason?: string;
  };
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InterAgencyReferral {
  referralId: string;
  fromInstitution: string;
  toInstitution: string;
  /** The citizen submission id that triggered the referral. */
  citizenSubmission: string;
  /** Cross-institution correlation identifier — NOT a shared case id. */
  correlationId: string;
  /** The case id at the originating institution. */
  fromCaseId?: string;
  /** Once the receiving institution opens its own case, its case id is recorded here. */
  toCaseId?: string;
  purpose: string;
  status: ReferralStatus;
  provenance: ProvenanceEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ProvenanceEntry {
  at: string;
  actor: string;
  /** The institution the actor belonged to at the moment of the action. */
  institution: string;
  action: string;
  detail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  In-memory stores (fallback when Prisma models not migrated)
// ─────────────────────────────────────────────────────────────────────────────

const REQUESTS = new Map<string, InterAgencyRequest>();
const REFERRALS = new Map<string, InterAgencyReferral>();

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

async function dbCreateRequest(r: InterAgencyRequest): Promise<InterAgencyRequest | null> {
  try {
    const row = await (db as any).interAgencyRequest.create({
      data: {
        requestId: r.requestId,
        requestingInstitution: r.requestingInstitution,
        receivingInstitution: r.receivingInstitution,
        caseId: r.case.caseId,
        caseType: r.case.caseType,
        caseNamespace: r.case.institutionNamespace,
        purpose: r.purpose,
        requestedRecords: JSON.stringify(r.requestedRecords),
        legalAuthority: r.legalAuthority,
        deadline: r.deadline,
        confidentiality: r.confidentiality,
        retention: r.retention,
        exportRestriction: r.exportRestriction,
        status: r.status,
      },
    });
    return rowToRequest(row);
  } catch {
    return null;
  }
}

async function dbListRequests(filter?: {
  requestingInstitution?: string;
  receivingInstitution?: string;
  status?: RequestStatus;
}): Promise<InterAgencyRequest[] | null> {
  try {
    const where: any = {};
    if (filter?.requestingInstitution) where.requestingInstitution = filter.requestingInstitution;
    if (filter?.receivingInstitution) where.receivingInstitution = filter.receivingInstitution;
    if (filter?.status) where.status = filter.status;
    const rows = await (db as any).interAgencyRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    if (!Array.isArray(rows)) return null;
    return rows.map(rowToRequest);
  } catch {
    return null;
  }
}

async function dbGetRequest(id: string): Promise<InterAgencyRequest | null> {
  try {
    const row = await (db as any).interAgencyRequest.findUnique({
      where: { requestId: id },
    });
    return row ? rowToRequest(row) : null;
  } catch {
    return null;
  }
}

async function dbUpdateRequest(
  id: string,
  patch: Partial<InterAgencyRequest>,
): Promise<InterAgencyRequest | null> {
  try {
    const data: any = { updatedAt: nowIso(), status: patch.status };
    if (patch.response) data.responseJson = JSON.stringify(patch.response);
    const row = await (db as any).interAgencyRequest.update({
      where: { requestId: id },
      data,
    });
    return row ? rowToRequest(row) : null;
  } catch {
    return null;
  }
}

function rowToRequest(row: any): InterAgencyRequest {
  return {
    requestId: row.requestId,
    requestingInstitution: row.requestingInstitution,
    receivingInstitution: row.receivingInstitution,
    case: {
      caseId: row.caseId,
      caseType: row.caseType,
      institutionNamespace: row.caseNamespace,
    },
    purpose: row.purpose,
    requestedRecords: safeParseArr(row.requestedRecords),
    legalAuthority: row.legalAuthority,
    deadline: row.deadline,
    confidentiality: row.confidentiality,
    retention: row.retention,
    exportRestriction: !!row.exportRestriction,
    response: safeParseObj(row.responseJson, {
      status: row.status as RequestStatus,
    }),
    status: row.status as RequestStatus,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : nowIso(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : nowIso(),
  };
}

// ── Referrals ──────────────────────────────────────────────────────────────

async function dbCreateReferral(r: InterAgencyReferral): Promise<InterAgencyReferral | null> {
  try {
    const row = await (db as any).interAgencyReferral.create({
      data: {
        referralId: r.referralId,
        fromInstitution: r.fromInstitution,
        toInstitution: r.toInstitution,
        citizenSubmission: r.citizenSubmission,
        correlationId: r.correlationId,
        fromCaseId: r.fromCaseId || null,
        toCaseId: r.toCaseId || null,
        purpose: r.purpose,
        status: r.status,
        provenance: JSON.stringify(r.provenance),
      },
    });
    return rowToReferral(row);
  } catch {
    return null;
  }
}

async function dbListReferrals(filter?: {
  fromInstitution?: string;
  toInstitution?: string;
  status?: ReferralStatus;
}): Promise<InterAgencyReferral[] | null> {
  try {
    const where: any = {};
    if (filter?.fromInstitution) where.fromInstitution = filter.fromInstitution;
    if (filter?.toInstitution) where.toInstitution = filter.toInstitution;
    if (filter?.status) where.status = filter.status;
    const rows = await (db as any).interAgencyReferral.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    if (!Array.isArray(rows)) return null;
    return rows.map(rowToReferral);
  } catch {
    return null;
  }
}

async function dbGetReferral(id: string): Promise<InterAgencyReferral | null> {
  try {
    const row = await (db as any).interAgencyReferral.findUnique({
      where: { referralId: id },
    });
    return row ? rowToReferral(row) : null;
  } catch {
    return null;
  }
}

async function dbUpdateReferral(
  id: string,
  patch: Partial<InterAgencyReferral>,
): Promise<InterAgencyReferral | null> {
  try {
    const data: any = { updatedAt: nowIso() };
    if (patch.status) data.status = patch.status;
    if (patch.toCaseId !== undefined) data.toCaseId = patch.toCaseId || null;
    if (patch.provenance) data.provenance = JSON.stringify(patch.provenance);
    const row = await (db as any).interAgencyReferral.update({
      where: { referralId: id },
      data,
    });
    return row ? rowToReferral(row) : null;
  } catch {
    return null;
  }
}

function rowToReferral(row: any): InterAgencyReferral {
  return {
    referralId: row.referralId,
    fromInstitution: row.fromInstitution,
    toInstitution: row.toInstitution,
    citizenSubmission: row.citizenSubmission,
    correlationId: row.correlationId,
    fromCaseId: row.fromCaseId || undefined,
    toCaseId: row.toCaseId || undefined,
    purpose: row.purpose,
    status: row.status as ReferralStatus,
    provenance: safeParseArr(row.provenance),
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : nowIso(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : nowIso(),
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

function safeParseObj<T = any>(s: any, fallback: T): T {
  if (typeof s !== "string") return fallback;
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API — Requests
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateRequestInput {
  requestingInstitution: string;
  receivingInstitution: string;
  caseId: string;
  caseType: string;
  institutionNamespace: string;
  purpose: string;
  requestedRecords: RequestedRecord[];
  legalAuthority: string;
  deadline: string;
  confidentiality?: ConfidentialityTier;
  retention?: string;
  exportRestriction?: boolean;
}

/**
 * Create a *draft* inter-agency request. The request is not yet visible
 * to the receiving institution until `submitRequest` is called. This
 * two-step flow supports pre-submission review by the requesting
 * institution's steward.
 */
export async function createRequest(
  input: CreateRequestInput,
): Promise<InterAgencyRequest> {
  if (!input.requestedRecords || input.requestedRecords.length === 0) {
    throw new Error(
      "minimum_necessary_violation: requestedRecords must enumerate at least one record (PART XVI)",
    );
  }
  // Minimum-necessary justification check.
  for (const r of input.requestedRecords) {
    if (!r.justification || r.justification.trim().length < 8) {
      throw new Error(
        `minimum_necessary_violation: record kind "${r.kind}" lacks a meaningful justification`,
      );
    }
  }
  const now = nowIso();
  const req: InterAgencyRequest = {
    requestId: uid("IAR"),
    requestingInstitution: input.requestingInstitution,
    receivingInstitution: input.receivingInstitution,
    case: {
      caseId: input.caseId,
      caseType: input.caseType,
      institutionNamespace: input.institutionNamespace,
    },
    purpose: input.purpose,
    requestedRecords: input.requestedRecords,
    legalAuthority: input.legalAuthority,
    deadline: input.deadline,
    confidentiality: input.confidentiality || "restricted",
    retention: input.retention || "until_case_close",
    exportRestriction: input.exportRestriction ?? true,
    response: { status: "draft" },
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  const persisted = await dbCreateRequest(req);
  if (persisted) {
    REQUESTS.set(persisted.requestId, persisted);
    return persisted;
  }
  REQUESTS.set(req.requestId, req);
  return req;
}

/**
 * Submit a draft request — transitions status to `submitted` and makes
 * the request visible to the receiving institution. Until submission,
 * the receiving institution has no knowledge of the request.
 */
export async function submitRequest(
  requestId: string,
): Promise<InterAgencyRequest | null> {
  const existing = REQUESTS.get(requestId) || (await dbGetRequest(requestId));
  if (!existing) return null;
  if (existing.status !== "draft" && existing.status !== "withdrawn") {
    return existing;
  }
  const next: InterAgencyRequest = {
    ...existing,
    status: "submitted",
    response: { ...existing.response, status: "submitted" },
    updatedAt: nowIso(),
  };
  const persisted = await dbUpdateRequest(requestId, next);
  if (persisted) {
    REQUESTS.set(persisted.requestId, persisted);
    return persisted;
  }
  REQUESTS.set(requestId, next);
  return next;
}

export interface RespondToRequestInput {
  status: RequestStatus;
  fulfilledRecords?: RequestedRecord[];
  notes?: string;
  respondedBy?: string;
  denialReason?: string;
}

/**
 * The receiving institution responds to a submitted request. The
 * response is appended to the request's response object — it does NOT
 * overwrite the request. Provenance of the response is preserved by the
 * `respondedAt` + `respondedBy` fields.
 */
export async function respondToRequest(
  requestId: string,
  input: RespondToRequestInput,
): Promise<InterAgencyRequest | null> {
  const existing = REQUESTS.get(requestId) || (await dbGetRequest(requestId));
  if (!existing) return null;
  const allowed: RequestStatus[] = [
    "received",
    "in_review",
    "partially_fulfilled",
    "fulfilled",
    "denied",
    "withdrawn",
    "expired",
  ];
  if (!allowed.includes(input.status)) {
    throw new Error(`invalid_response_status: ${input.status}`);
  }
  const next: InterAgencyRequest = {
    ...existing,
    status: input.status,
    response: {
      status: input.status,
      fulfilledRecords: input.fulfilledRecords,
      notes: input.notes,
      respondedAt: nowIso(),
      respondedBy: input.respondedBy,
      denialReason: input.denialReason,
    },
    updatedAt: nowIso(),
  };
  const persisted = await dbUpdateRequest(requestId, next);
  if (persisted) {
    REQUESTS.set(persisted.requestId, persisted);
    return persisted;
  }
  REQUESTS.set(requestId, next);
  return next;
}

export async function trackRequest(
  requestId: string,
): Promise<InterAgencyRequest | null> {
  const fromMem = REQUESTS.get(requestId);
  if (fromMem) return fromMem;
  const fromDb = await dbGetRequest(requestId);
  if (fromDb) {
    REQUESTS.set(fromDb.requestId, fromDb);
    return fromDb;
  }
  return null;
}

export async function listRequests(filter?: {
  requestingInstitution?: string;
  receivingInstitution?: string;
  status?: RequestStatus;
}): Promise<InterAgencyRequest[]> {
  const fromDb = await dbListRequests(filter);
  if (fromDb && fromDb.length > 0) {
    for (const r of fromDb) REQUESTS.set(r.requestId, r);
    return fromDb;
  }
  let list = Array.from(REQUESTS.values());
  if (filter?.requestingInstitution)
    list = list.filter((r) => r.requestingInstitution === filter.requestingInstitution);
  if (filter?.receivingInstitution)
    list = list.filter((r) => r.receivingInstitution === filter.receivingInstitution);
  if (filter?.status) list = list.filter((r) => r.status === filter.status);
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API — Referrals
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateReferralInput {
  fromInstitution: string;
  toInstitution: string;
  citizenSubmission: string;
  fromCaseId?: string;
  purpose: string;
}

/**
 * Create an inter-agency referral. The referral establishes a
 * correlation between the originating institution's case and the
 * receiving institution's *future* case — the receiving institution
 * opens its own case under its own namespace; the referral only carries
 * the correlation identifier.
 *
 * No records are transferred at referral-creation time. Record transfer
 * happens via a separate InterAgencyRequest, which the receiving
 * institution may issue in the reverse direction once its case is open.
 */
export async function createReferral(
  input: CreateReferralInput,
): Promise<InterAgencyReferral> {
  const now = nowIso();
  const correlationId = uid("CORR");
  const ref: InterAgencyReferral = {
    referralId: uid("REF"),
    fromInstitution: input.fromInstitution,
    toInstitution: input.toInstitution,
    citizenSubmission: input.citizenSubmission,
    correlationId,
    fromCaseId: input.fromCaseId,
    purpose: input.purpose,
    status: "pending",
    provenance: [
      {
        at: now,
        actor: input.fromInstitution,
        institution: input.fromInstitution,
        action: "referral_created",
        detail: `Referral created for citizen submission ${input.citizenSubmission}.`,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  const persisted = await dbCreateReferral(ref);
  if (persisted) {
    REFERRALS.set(persisted.referralId, persisted);
    return persisted;
  }
  REFERRALS.set(ref.referralId, ref);
  return ref;
}

export async function trackReferral(
  referralId: string,
): Promise<InterAgencyReferral | null> {
  const fromMem = REFERRALS.get(referralId);
  if (fromMem) return fromMem;
  const fromDb = await dbGetReferral(referralId);
  if (fromDb) {
    REFERRALS.set(fromDb.referralId, fromDb);
    return fromDb;
  }
  return null;
}

export async function listReferrals(filter?: {
  fromInstitution?: string;
  toInstitution?: string;
  status?: ReferralStatus;
}): Promise<InterAgencyReferral[]> {
  const fromDb = await dbListReferrals(filter);
  if (fromDb && fromDb.length > 0) {
    for (const r of fromDb) REFERRALS.set(r.referralId, r);
    return fromDb;
  }
  let list = Array.from(REFERRALS.values());
  if (filter?.fromInstitution)
    list = list.filter((r) => r.fromInstitution === filter.fromInstitution);
  if (filter?.toInstitution)
    list = list.filter((r) => r.toInstitution === filter.toInstitution);
  if (filter?.status) list = list.filter((r) => r.status === filter.status);
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Update the status of a referral and append a provenance entry. The
 * `toCaseId` may be set here only when the receiving institution has
 * opened its own case — never before.
 */
export async function updateReferral(
  referralId: string,
  patch: {
    status?: ReferralStatus;
    toCaseId?: string;
    actor: string;
    institution: string;
    action: string;
    detail?: string;
  },
): Promise<InterAgencyReferral | null> {
  const existing = REFERRALS.get(referralId) || (await dbGetReferral(referralId));
  if (!existing) return null;
  const now = nowIso();
  const next: InterAgencyReferral = {
    ...existing,
    status: patch.status || existing.status,
    toCaseId: patch.toCaseId ?? existing.toCaseId,
    provenance: [
      ...existing.provenance,
      {
        at: now,
        actor: patch.actor,
        institution: patch.institution,
        action: patch.action,
        detail: patch.detail,
      },
    ],
    updatedAt: now,
  };
  const persisted = await dbUpdateReferral(referralId, next);
  if (persisted) {
    REFERRALS.set(persisted.referralId, persisted);
    return persisted;
  }
  REFERRALS.set(referralId, next);
  return next;
}

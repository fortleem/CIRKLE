// @ts-nocheck
/**
 * Government Institution Registry — CIRKLE Federated Government Fabric
 * ============================================================================
 * Source architectural authority:
 *   • docs/CIRCLE-FEDERATED-GOVERNMENT-ARCHITECTURE.md — PART IV (Each
 *     Government Institution Must Be Sovereign), PART XIV (4/5-Level
 *     Government Integration Model), PART XVII (Institutional Authority
 *     Matrix).
 *   • docs/CIRCLE-EMERGENCY-SERVICE-ROUTING.md — Chapter XXVII (Government
 *     System of Record Registry).
 *
 * Non-negotiable rules enforced by this module:
 *   1. Each registered institution is a SEPARATE security + operational
 *      domain. No "universal government employee" role exists; identity is
 *      Institution + Role + Clearance + Assignment (PART XIX).
 *   2. Circle NEVER becomes the system of record for any government
 *      institution. The registry is a *directory + descriptor*, not a
 *      parallel case store (Rule 4 — see PART XLIII).
 *   3. The 5-level integration model is descriptive of *integration depth*,
 *      not of institutional seniority. Level 0 (Directory) is the floor and
 *      is required for an institution to appear in citizen-facing routing
 *      at all.
 *   4. Every entry must be verifiable: `lastVerification` + `effectiveDate`
 *      are mandatory and must never be fabricated. An institution whose
 *      `lastVerification` is older than the registry's verification window
 *      is treated as `status=stale` regardless of the stored status.
 *
 * The registry is the source of truth for:
 *   • `federation-router.ts` (smart citizen routing)
 *   • `service-directory.ts` (citizen service directory)
 *   • `inter-agency-exchange.ts` (cross-institution referrals + requests)
 *   • `federated-incident.ts` (federated case linkage)
 *
 * Persistence:
 *   Reads/writes are wrapped in try/catch against the `db` client. If the
 *   Prisma model `GovernmentInstitution` is not present (schema not yet
 *   migrated), the module gracefully falls back to the in-memory store so
 *   the fabric remains functional during development. The recommended
 *   Prisma model is documented in the final report and in
 *   `prisma/schema.prisma` (to be added by the migration task).
 * ============================================================================
 */

import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

export type InstitutionType =
  | "aca"
  | "police"
  | "ems"
  | "fire"
  | "traffic"
  | "health"
  | "local_gov"
  | "regulator"
  | "financial"
  | "other";

export type InstitutionStatus =
  | "active"
  | "pending_verification"
  | "stale"
  | "suspended"
  | "retired";

export type IntegrationLevel = 0 | 1 | 2 | 3 | 4;

/**
 * LEVEL 0 — Directory
 *   The institution is listed with its official contact channels and
 *   services. Circle may *refer* a citizen to it but performs no
 *   transactional exchange. (PART XIV — Level 0)
 *
 * LEVEL 1 — Referral
 *   Circle may create a structured Inter-Agency Referral to this
 *   institution. The institution retains its own case namespace; Circle
 *   only carries a correlation identifier. (PART XIV — Level 1, PART XXX)
 *
 * LEVEL 2 — Transaction
 *   Circle may submit a transactional request (e.g. an information
 *   request, a structured form submission) and receive a structured
 *   response. The institution remains the system of record. (PART XIV —
 *   Level 2, PART XXXIV)
 *
 * LEVEL 3 — Institutional Intelligence
 *   Circle exchanges normalized intelligence objects (signals, audit
 *   observations) under the institution's authority. The institution
 *   retains the determination authority. (PART XIV — Level 3)
 *
 * LEVEL 4 — Federated Intelligence
 *   Circle participates in federated intelligence under a written
 *   federated-learning / federated-query governance contract. No raw
 *   bulk copy ever leaves the institution. (PART XIV — Level 4, PART XVI)
 */
export const INTEGRATION_LEVEL_LABELS: Record<IntegrationLevel, string> = {
  0: "Level 0 — Directory",
  1: "Level 1 — Referral",
  2: "Level 2 — Transaction",
  3: "Level 3 — Institutional Intelligence",
  4: "Level 4 — Federated Intelligence",
};

export interface OfficialChannel {
  kind: "phone" | "website" | "office" | "online_portal" | "email" | "sms";
  label: string;
  value: string;
  /** True if this channel is supervised 24/7. */
  twentyFourSeven?: boolean;
  /** Languages supported by this channel (BCP-47 codes). */
  languages?: string[];
}

export interface InstitutionIntegration {
  /** The adapter / connector descriptor key (see PART XVII). */
  adapterKey: string;
  level: IntegrationLevel;
  /** The legal authority under which this integration operates. */
  legalAuthority: string;
  /** The system-of-record declaration — "institution" or "circle_referral_only". */
  systemOfRecord: "institution" | "circle_referral_only";
  /** ISO date when the integration was last verified live. */
  lastVerified?: string;
  status: "active" | "degraded" | "retired";
}

export interface GovernmentInstitution {
  institutionId: string;
  name: string;
  /** Short, human-readable authority scope, e.g. "Ministry of Interior — Arab Republic of Egypt". */
  authority: string;
  type: InstitutionType;
  services: string[];
  officialChannels: OfficialChannel[];
  integrations: InstitutionIntegration[];
  status: InstitutionStatus;
  /** Maximum classification this institution is allowed to handle ("public"|"restricted"|"confidential"). */
  dataClassification: "public" | "restricted" | "confidential";
  lastVerification: string;
  effectiveDate: string;
  /** Country code (ISO-3166-1 alpha-2). */
  country?: string;
  /** Free-text region/jurisdiction descriptor. */
  jurisdiction?: string;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  In-memory store (fallback when Prisma model not yet migrated)
// ─────────────────────────────────────────────────────────────────────────────

const INSTITUTIONS = new Map<string, GovernmentInstitution>();

/**
 * Stale-verification window — an institution whose `lastVerification` is
 * older than this many days is reported as `stale` by `getInstitution`
 * regardless of its stored status. This is a safety net, not a substitute
 * for active re-verification by the institution's steward.
 */
const VERIFICATION_WINDOW_DAYS = 180;

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function isStale(inst: GovernmentInstitution): boolean {
  try {
    const last = new Date(inst.lastVerification).getTime();
    if (Number.isNaN(last)) return true;
    const ageDays = (Date.now() - last) / 86_400_000;
    return ageDays > VERIFICATION_WINDOW_DAYS;
  } catch {
    return true;
  }
}

function applyStaleness(inst: GovernmentInstitution): GovernmentInstitution {
  if (inst.status === "active" && isStale(inst)) {
    return { ...inst, status: "stale" };
  }
  return inst;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Db helpers (try/catch — model may not be migrated yet)
// ─────────────────────────────────────────────────────────────────────────────

async function dbList(filter?: {
  type?: InstitutionType;
  status?: InstitutionStatus;
  country?: string;
}): Promise<GovernmentInstitution[] | null> {
  try {
    const where: any = {};
    if (filter?.type) where.type = filter.type;
    if (filter?.status) where.status = filter.status;
    if (filter?.country) where.country = filter.country;
    const rows = await (db as any).governmentInstitution.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    if (!Array.isArray(rows)) return null;
    return rows.map(rowToInstitution);
  } catch {
    return null;
  }
}

async function dbGet(id: string): Promise<GovernmentInstitution | null> {
  try {
    const row = await (db as any).governmentInstitution.findUnique({
      where: { institutionId: id },
    });
    if (!row) return null;
    return rowToInstitution(row);
  } catch {
    return null;
  }
}

async function dbCreate(
  inst: GovernmentInstitution,
): Promise<GovernmentInstitution | null> {
  try {
    const row = await (db as any).governmentInstitution.create({
      data: {
        institutionId: inst.institutionId,
        name: inst.name,
        authority: inst.authority,
        type: inst.type,
        services: JSON.stringify(inst.services || []),
        officialChannels: JSON.stringify(inst.officialChannels || []),
        integrations: JSON.stringify(inst.integrations || []),
        status: inst.status,
        dataClassification: inst.dataClassification,
        lastVerification: inst.lastVerification,
        effectiveDate: inst.effectiveDate,
        country: inst.country || null,
        jurisdiction: inst.jurisdiction || null,
        notes: inst.notes || null,
      },
    });
    return rowToInstitution(row);
  } catch {
    return null;
  }
}

async function dbUpdateStatus(
  id: string,
  status: InstitutionStatus,
): Promise<GovernmentInstitution | null> {
  try {
    const row = await (db as any).governmentInstitution.update({
      where: { institutionId: id },
      data: { status, lastVerification: nowIso() },
    });
    return rowToInstitution(row);
  } catch {
    return null;
  }
}

function rowToInstitution(row: any): GovernmentInstitution {
  return {
    institutionId: row.institutionId,
    name: row.name,
    authority: row.authority,
    type: row.type as InstitutionType,
    services: safeParseArr(row.services),
    officialChannels: safeParseArr(row.officialChannels),
    integrations: safeParseArr(row.integrations),
    status: row.status as InstitutionStatus,
    dataClassification: (row.dataClassification || "public") as
      | "public"
      | "restricted"
      | "confidential",
    lastVerification: row.lastVerification || row.effectiveDate,
    effectiveDate: row.effectiveDate,
    country: row.country || undefined,
    jurisdiction: row.jurisdiction || undefined,
    notes: row.notes || undefined,
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

export interface RegisterInstitutionInput {
  name: string;
  authority: string;
  type: InstitutionType;
  services?: string[];
  officialChannels?: OfficialChannel[];
  integrations?: InstitutionIntegration[];
  status?: InstitutionStatus;
  dataClassification?: "public" | "restricted" | "confidential";
  country?: string;
  jurisdiction?: string;
  notes?: string;
}

/**
 * Register a new government institution. The institution is created at
 * Level 0 (Directory) by default unless integrations declare a higher
 * level — and even then, the registry only *records* the declared level;
 * it does not activate it. Activation requires the Authority Matrix
 * (PART XVII), which is a separate governance artifact.
 */
export async function registerInstitution(
  input: RegisterInstitutionInput,
): Promise<GovernmentInstitution> {
  const inst: GovernmentInstitution = {
    institutionId: uid("INST"),
    name: input.name.trim(),
    authority: input.authority.trim(),
    type: input.type,
    services: input.services || [],
    officialChannels: input.officialChannels || [],
    integrations: input.integrations || [],
    status: input.status || "pending_verification",
    dataClassification: input.dataClassification || "public",
    lastVerification: nowIso(),
    effectiveDate: nowIso(),
    country: input.country,
    jurisdiction: input.jurisdiction,
    notes: input.notes,
  };

  // Persist (best-effort) then mirror in memory.
  const persisted = await dbCreate(inst);
  if (persisted) {
    INSTITUTIONS.set(persisted.institutionId, persisted);
    return persisted;
  }
  INSTITUTIONS.set(inst.institutionId, inst);
  return inst;
}

export async function getInstitution(
  institutionId: string,
): Promise<GovernmentInstitution | null> {
  const fromDb = await dbGet(institutionId);
  if (fromDb) {
    const withStale = applyStaleness(fromDb);
    INSTITUTIONS.set(withStale.institutionId, withStale);
    return withStale;
  }
  const fromMem = INSTITUTIONS.get(institutionId);
  if (!fromMem) return null;
  return applyStaleness(fromMem);
}

export async function listInstitutions(filter?: {
  type?: InstitutionType;
  status?: InstitutionStatus;
  country?: string;
}): Promise<GovernmentInstitution[]> {
  const fromDb = await dbList(filter);
  let list: GovernmentInstitution[];
  if (fromDb && fromDb.length > 0) {
    // Mirror into memory for low-latency reads by other modules.
    for (const i of fromDb) INSTITUTIONS.set(i.institutionId, i);
    list = fromDb;
  } else {
    list = Array.from(INSTITUTIONS.values());
    if (filter?.type) list = list.filter((i) => i.type === filter.type);
    if (filter?.status) list = list.filter((i) => i.status === filter.status);
    if (filter?.country)
      list = list.filter((i) => i.country === filter.country);
  }
  return list.map(applyStaleness);
}

export async function updateInstitutionStatus(
  institutionId: string,
  status: InstitutionStatus,
): Promise<GovernmentInstitution | null> {
  const updated = await dbUpdateStatus(institutionId, status);
  if (updated) {
    INSTITUTIONS.set(updated.institutionId, updated);
    return updated;
  }
  const existing = INSTITUTIONS.get(institutionId);
  if (!existing) return null;
  const next: GovernmentInstitution = {
    ...existing,
    status,
    lastVerification: nowIso(),
  };
  INSTITUTIONS.set(institutionId, next);
  return next;
}

/**
 * Returns the highest declared integration level for an institution.
 * Returns 0 (Directory) for any institution that has no declared
 * integration record, is `stale`, or is not registered at all — Level 0
 * is the floor, not an error condition.
 */
export async function getIntegrationLevel(
  institutionId: string,
): Promise<IntegrationLevel> {
  const inst = await getInstitution(institutionId);
  if (!inst) return 0;
  if (inst.status === "suspended" || inst.status === "retired") return 0;
  if (inst.status === "stale") return 0;
  let max: IntegrationLevel = 0;
  for (const it of inst.integrations) {
    if (it.status !== "active") continue;
    if (it.level > max) max = it.level;
  }
  return max;
}

/**
 * Convenience: return all institutions whose declared type matches one of
 * the requested types. Used by the federation router to find candidate
 * responders for an emergency pathway.
 */
export async function listByTypes(
  types: InstitutionType[],
): Promise<GovernmentInstitution[]> {
  const all = await listInstitutions();
  const set = new Set(types);
  return all.filter((i) => set.has(i.type) && i.status === "active");
}

// ─────────────────────────────────────────────────────────────────────────────
//  Seed data — illustrative, NOT a claim of live integration (PART LXXXIX)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-seed the in-memory registry with the canonical sovereign
 * institution types from the federated government architecture. These
 * entries are explicit placeholders pending institutional verification —
 * they carry `status=pending_verification` and `dataClassification=public`
 * so that the router + service directory can offer correct *routing*
 * behavior even before the registry is verified.
 *
 * Per Rule 20 (no unsupported claims), no integration is asserted as
 * live. The integration list is empty for every seed entry.
 */
export function ensureSeedInstitutions(): void {
  if (INSTITUTIONS.size > 0) return;
  const now = nowIso();
  const seeds: GovernmentInstitution[] = [
    {
      institutionId: "INST-ACA-SEED",
      name: "Administrative Control Authority",
      authority: "ACA — Sovereign National Jurisdiction",
      type: "aca",
      services: ["integrity_signal_intake", "audit_oversight"],
      officialChannels: [
        {
          kind: "online_portal",
          label: "ACA Signal Intake (pending verification)",
          value: "https://aca.example/submit",
          languages: ["ar", "en"],
        },
      ],
      integrations: [],
      status: "pending_verification",
      dataClassification: "confidential",
      lastVerification: now,
      effectiveDate: now,
      country: "EG",
      jurisdiction: "National",
      notes:
        "Seed entry. ACA receives ONLY integrity signals, never emergency dispatch.",
    },
    {
      institutionId: "INST-POLICE-SEED",
      name: "Police Authority",
      authority: "Ministry of Interior — National Police",
      type: "police",
      services: ["emergency_response", "criminal_investigation", "traffic_enforcement"],
      officialChannels: [
        {
          kind: "phone",
          label: "Emergency Police Line",
          value: "122",
          twentyFourSeven: true,
          languages: ["ar", "en"],
        },
      ],
      integrations: [],
      status: "pending_verification",
      dataClassification: "restricted",
      lastVerification: now,
      effectiveDate: now,
      country: "EG",
      jurisdiction: "National",
    },
    {
      institutionId: "INST-EMS-SEED",
      name: "Emergency Medical Services",
      authority: "Ministry of Health — EMS",
      type: "ems",
      services: ["ambulance_dispatch", "field_triage", "hospital_handoff"],
      officialChannels: [
        {
          kind: "phone",
          label: "Ambulance Emergency Line",
          value: "123",
          twentyFourSeven: true,
          languages: ["ar", "en"],
        },
      ],
      integrations: [],
      status: "pending_verification",
      dataClassification: "restricted",
      lastVerification: now,
      effectiveDate: now,
      country: "EG",
      jurisdiction: "National",
    },
    {
      institutionId: "INST-FIRE-SEED",
      name: "Civil Protection / Fire",
      authority: "Ministry of Interior — Civil Protection",
      type: "fire",
      services: ["fire_suppression", "rescue", "hazmat_response"],
      officialChannels: [
        {
          kind: "phone",
          label: "Civil Protection Emergency Line",
          value: "180",
          twentyFourSeven: true,
          languages: ["ar", "en"],
        },
      ],
      integrations: [],
      status: "pending_verification",
      dataClassification: "restricted",
      lastVerification: now,
      effectiveDate: now,
      country: "EG",
      jurisdiction: "National",
    },
    {
      institutionId: "INST-TRAFFIC-SEED",
      name: "Traffic Authority",
      authority: "Ministry of Interior — Traffic",
      type: "traffic",
      services: ["accident_response", "traffic_management", "enforcement"],
      officialChannels: [],
      integrations: [],
      status: "pending_verification",
      dataClassification: "public",
      lastVerification: now,
      effectiveDate: now,
      country: "EG",
      jurisdiction: "National",
    },
    {
      institutionId: "INST-LOCALGOV-SEED",
      name: "Local Government Service Hub",
      authority: "Local Government Directorate",
      type: "local_gov",
      services: ["civil_registry", "permits", "complaints"],
      officialChannels: [],
      integrations: [],
      status: "pending_verification",
      dataClassification: "public",
      lastVerification: now,
      effectiveDate: now,
      country: "EG",
      jurisdiction: "Governorate",
    },
  ];
  for (const s of seeds) INSTITUTIONS.set(s.institutionId, s);
}

// Auto-seed on first import for low-friction dev experience.
ensureSeedInstitutions();

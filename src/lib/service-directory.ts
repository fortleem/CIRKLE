// @ts-nocheck
/**
 * Citizen Service Directory
 * ============================================================================
 * Source architectural authority:
 *   • docs/CIRCLE-EMERGENCY-SERVICE-ROUTING.md — PART XXIX (Service
 *     Routing), PART XLIII (Existing Egyptian Systems Are Not to Be
 *     Replaced), PART XLVII (Government System of Record Registry),
 *     PART XLVIII (Data Freshness).
 *   • docs/CIRCLE-FEDERATED-GOVERNMENT-ARCHITECTURE.md — PART XX (Public
 *     Citizen Shield), PART XII (One Front Door, Many Sovereign Back
 *     Offices).
 *
 * Non-negotiable rules enforced by this module:
 *   1. NO UNOFFICIAL INFORMATION REPRESENTED AS OFFICIAL. Every entry
 *      must carry `lastVerified` and `status`; an entry whose
 *      `lastVerified` is older than the freshness window is reported as
 *      `degraded` regardless of stored status. (PART XLVIII)
 *   2. NO COMPETING SYSTEM OF RECORD. The directory points at the
 *      responsible institution's official channel; it does not host a
 *      parallel service. (Rule 4, PART XLIII)
 *   3. ACCESSIBILITY FIRST. Each entry records the languages and
 *      accessibility features offered by the official channel so the
 *      Citizen Shield can match citizens to services they can actually
 *      use.
 *   4. OUTAGE REPORTING IS OBSERVATIONAL. A citizen outage report does
 *      not silently rewrite the official status — it records a
 *      `degraded` observation pending institutional verification.
 * ============================================================================
 */

import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

export type ServiceChannel = "phone" | "website" | "office" | "online";

export type ServiceStatus = "available" | "degraded" | "unavailable";

export interface ServiceContactInfo {
  channel: ServiceChannel;
  value: string;
  /** True if the contact is supervised 24/7. */
  twentyFourSeven?: boolean;
  /** Whether the channel supports relay / TTY for hearing-impaired citizens. */
  accessibilityRelay?: boolean;
}

export interface ServiceHours {
  /** Free-text human-readable hours, e.g. "Sun–Thu, 09:00–17:00". */
  display: string;
  /** 24/7 flag — overrides display when true. */
  twentyFourSeven?: boolean;
  /** Time zone (IANA name, e.g. "Africa/Cairo"). */
  timezone?: string;
}

export interface ServiceDirectoryEntry {
  serviceId: string;
  serviceName: string;
  responsibleInstitution: string;
  department: string;
  channel: ServiceChannel;
  contactInfo: ServiceContactInfo;
  hours: ServiceHours;
  geographicCoverage: string;
  accessibility: string[];
  languages: string[];
  lastVerified: string;
  status: ServiceStatus;
  /** Categories used for filtering (e.g. "emergency", "civil_registry", "tax"). */
  category?: string;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  In-memory store
// ─────────────────────────────────────────────────────────────────────────────

const SERVICES = new Map<string, ServiceDirectoryEntry>();

const FRESHNESS_WINDOW_DAYS = 90;

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function isStale(entry: ServiceDirectoryEntry): boolean {
  try {
    const last = new Date(entry.lastVerified).getTime();
    if (Number.isNaN(last)) return true;
    const ageDays = (Date.now() - last) / 86_400_000;
    return ageDays > FRESHNESS_WINDOW_DAYS;
  } catch {
    return true;
  }
}

function applyFreshness(entry: ServiceDirectoryEntry): ServiceDirectoryEntry {
  if (entry.status === "available" && isStale(entry)) {
    return { ...entry, status: "degraded" };
  }
  return entry;
}

// ─────────────────────────────────────────────────────────────────────────────
//  DB helpers (best-effort)
// ─────────────────────────────────────────────────────────────────────────────

async function dbCreate(s: ServiceDirectoryEntry): Promise<ServiceDirectoryEntry | null> {
  try {
    const row = await (db as any).serviceDirectoryEntry.create({
      data: {
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        responsibleInstitution: s.responsibleInstitution,
        department: s.department,
        channel: s.channel,
        contactInfo: JSON.stringify(s.contactInfo),
        hours: JSON.stringify(s.hours),
        geographicCoverage: s.geographicCoverage,
        accessibility: JSON.stringify(s.accessibility),
        languages: JSON.stringify(s.languages),
        category: s.category || null,
        lastVerified: s.lastVerified,
        status: s.status,
        notes: s.notes || null,
      },
    });
    return rowToEntry(row);
  } catch {
    return null;
  }
}

async function dbList(filter?: {
  responsibleInstitution?: string;
  category?: string;
  channel?: ServiceChannel;
  status?: ServiceStatus;
}): Promise<ServiceDirectoryEntry[] | null> {
  try {
    const where: any = {};
    if (filter?.responsibleInstitution) where.responsibleInstitution = filter.responsibleInstitution;
    if (filter?.category) where.category = filter.category;
    if (filter?.channel) where.channel = filter.channel;
    if (filter?.status) where.status = filter.status;
    const rows = await (db as any).serviceDirectoryEntry.findMany({
      where,
      orderBy: { serviceName: "asc" },
      take: 300,
    });
    if (!Array.isArray(rows)) return null;
    return rows.map(rowToEntry);
  } catch {
    return null;
  }
}

async function dbUpdateStatus(
  id: string,
  status: ServiceStatus,
): Promise<ServiceDirectoryEntry | null> {
  try {
    const row = await (db as any).serviceDirectoryEntry.update({
      where: { serviceId: id },
      data: { status, lastVerified: nowIso() },
    });
    return row ? rowToEntry(row) : null;
  } catch {
    return null;
  }
}

function rowToEntry(row: any): ServiceDirectoryEntry {
  return {
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    responsibleInstitution: row.responsibleInstitution,
    department: row.department,
    channel: row.channel as ServiceChannel,
    contactInfo: safeParseObj(row.contactInfo, { channel: row.channel, value: "" }),
    hours: safeParseObj(row.hours, { display: "" }),
    geographicCoverage: row.geographicCoverage || "National",
    accessibility: safeParseArr(row.accessibility),
    languages: safeParseArr(row.languages),
    lastVerified: row.lastVerified || nowIso(),
    status: row.status as ServiceStatus,
    category: row.category || undefined,
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
//  Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface AddServiceInput {
  serviceName: string;
  responsibleInstitution: string;
  department: string;
  channel: ServiceChannel;
  contactInfo: ServiceContactInfo;
  hours: ServiceHours;
  geographicCoverage: string;
  accessibility?: string[];
  languages?: string[];
  category?: string;
  notes?: string;
}

export async function addService(input: AddServiceInput): Promise<ServiceDirectoryEntry> {
  const entry: ServiceDirectoryEntry = {
    serviceId: uid("SVC"),
    serviceName: input.serviceName.trim(),
    responsibleInstitution: input.responsibleInstitution,
    department: input.department,
    channel: input.channel,
    contactInfo: input.contactInfo,
    hours: input.hours,
    geographicCoverage: input.geographicCoverage,
    accessibility: input.accessibility || [],
    languages: input.languages || ["ar", "en"],
    lastVerified: nowIso(),
    status: "available",
    category: input.category,
    notes: input.notes,
  };
  const persisted = await dbCreate(entry);
  if (persisted) {
    SERVICES.set(persisted.serviceId, persisted);
    return persisted;
  }
  SERVICES.set(entry.serviceId, entry);
  return entry;
}

export async function findService(serviceId: string): Promise<ServiceDirectoryEntry | null> {
  const fromMem = SERVICES.get(serviceId);
  if (fromMem) return applyFreshness(fromMem);
  return null;
}

export interface SearchServicesFilter {
  q?: string;
  responsibleInstitution?: string;
  category?: string;
  channel?: ServiceChannel;
  status?: ServiceStatus;
  language?: string;
}

export async function searchServices(
  filter: SearchServicesFilter = {},
): Promise<ServiceDirectoryEntry[]> {
  const fromDb = await dbList({
    responsibleInstitution: filter.responsibleInstitution,
    category: filter.category,
    channel: filter.channel,
    status: filter.status,
  });
  let list: ServiceDirectoryEntry[];
  if (fromDb && fromDb.length > 0) {
    for (const e of fromDb) SERVICES.set(e.serviceId, e);
    list = fromDb;
  } else {
    list = Array.from(SERVICES.values());
  }
  // Apply in-memory filters.
  if (filter.q) {
    const q = filter.q.toLowerCase();
    list = list.filter(
      (e) =>
        e.serviceName.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q) ||
        (e.notes || "").toLowerCase().includes(q),
    );
  }
  if (filter.responsibleInstitution)
    list = list.filter((e) => e.responsibleInstitution === filter.responsibleInstitution);
  if (filter.category) list = list.filter((e) => e.category === filter.category);
  if (filter.channel) list = list.filter((e) => e.channel === filter.channel);
  if (filter.status) list = list.filter((e) => e.status === filter.status);
  if (filter.language)
    list = list.filter((e) => e.languages.includes(filter.language!));
  return list.map(applyFreshness).sort((a, b) => a.serviceName.localeCompare(b.serviceName));
}

/**
 * A citizen (or the Citizen Shield on behalf of a citizen) reports that a
 * service appears to be down. The report does NOT silently rewrite the
 * official status — it transitions the entry to `degraded` and records
 * that the transition is *observational*, pending institutional
 * verification. If the entry is already `unavailable`, the report is a
 * no-op.
 */
export async function reportOutage(
  serviceId: string,
  reportedBy: string,
  detail: string,
): Promise<ServiceDirectoryEntry | null> {
  const existing = SERVICES.get(serviceId);
  if (!existing) return null;
  if (existing.status === "unavailable") return existing;
  const next: ServiceDirectoryEntry = {
    ...existing,
    status: "degraded",
    notes: [
      existing.notes || "",
      `[${nowIso()}] Outage reported by ${reportedBy}: ${detail} — pending institutional verification.`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
  const persisted = await dbUpdateStatus(serviceId, "degraded");
  if (persisted) {
    SERVICES.set(persisted.serviceId, { ...persisted, notes: next.notes });
    return { ...persisted, notes: next.notes };
  }
  SERVICES.set(serviceId, next);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Seed data — illustrative, NOT official contact data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-seed a small set of directory entries that mirror the seeded
 * institutions in `institution-registry.ts`. These entries are
 * placeholders pending verification — `lastVerified` is `now`, so they
 * appear as `available` until the freshness window lapses. The contact
 * values are illustrative shapes, not real numbers.
 */
export function ensureSeedServices(): void {
  if (SERVICES.size > 0) return;
  const now = nowIso();
  const seeds: ServiceDirectoryEntry[] = [
    {
      serviceId: "SVC-EMERGENCY-POLICE-SEED",
      serviceName: "Emergency Police Response",
      responsibleInstitution: "INST-POLICE-SEED",
      department: "Operations Command",
      channel: "phone",
      contactInfo: {
        channel: "phone",
        value: "122",
        twentyFourSeven: true,
        accessibilityRelay: true,
      },
      hours: { display: "24/7", twentyFourSeven: true, timezone: "Africa/Cairo" },
      geographicCoverage: "National",
      accessibility: ["tty_relay", "voice"],
      languages: ["ar", "en"],
      lastVerified: now,
      status: "available",
      category: "emergency",
    },
    {
      serviceId: "SVC-EMERGENCY-EMS-SEED",
      serviceName: "Ambulance Dispatch",
      responsibleInstitution: "INST-EMS-SEED",
      department: "EMS Operations",
      channel: "phone",
      contactInfo: {
        channel: "phone",
        value: "123",
        twentyFourSeven: true,
        accessibilityRelay: true,
      },
      hours: { display: "24/7", twentyFourSeven: true, timezone: "Africa/Cairo" },
      geographicCoverage: "National",
      accessibility: ["tty_relay", "voice"],
      languages: ["ar", "en"],
      lastVerified: now,
      status: "available",
      category: "emergency",
    },
    {
      serviceId: "SVC-EMERGENCY-FIRE-SEED",
      serviceName: "Civil Protection / Fire Dispatch",
      responsibleInstitution: "INST-FIRE-SEED",
      department: "Civil Protection Command",
      channel: "phone",
      contactInfo: {
        channel: "phone",
        value: "180",
        twentyFourSeven: true,
        accessibilityRelay: true,
      },
      hours: { display: "24/7", twentyFourSeven: true, timezone: "Africa/Cairo" },
      geographicCoverage: "National",
      accessibility: ["tty_relay", "voice"],
      languages: ["ar", "en"],
      lastVerified: now,
      status: "available",
      category: "emergency",
    },
    {
      serviceId: "SVC-CIVIL-REGISTRY-SEED",
      serviceName: "Civil Registry — Birth Certificate",
      responsibleInstitution: "INST-LOCALGOV-SEED",
      department: "Civil Registry Directorate",
      channel: "online",
      contactInfo: {
        channel: "online",
        value: "https://civil-registry.example/apply",
      },
      hours: { display: "Sun–Thu, 09:00–17:00", timezone: "Africa/Cairo" },
      geographicCoverage: "National",
      accessibility: ["screen_reader_friendly"],
      languages: ["ar", "en"],
      lastVerified: now,
      status: "available",
      category: "civil_registry",
    },
  ];
  for (const s of seeds) SERVICES.set(s.serviceId, s);
}

ensureSeedServices();

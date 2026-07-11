/**
 * Regional data localization configuration for Cirkle (دواير).
 *
 * Each Cirkle user's data is routed to their *home region* database so we
 * comply with:
 *   • PDPL       — Saudi Personal Data Protection Law (SDAIA)
 *   • Egypt DP   — Egyptian Data Protection Law (NTRA)
 *   • UAE PDPL   — UAE Personal Data Protection Law
 *   • PIPL       — China Personal Information Protection Law (CAC)
 *   • FZ-242     — Russia Federal Law 242-FZ (Roskomnadzor)
 *   • GDPR       — EU General Data Protection Regulation
 *   • CCPA/LGPD  — US/Latin America
 *
 * This module is intentionally **client-safe** (no top-level Prisma import)
 * so it can be consumed by `src/proxy.ts` (Edge middleware) and by server
 * routes alike. The only async, DB-backed function — `getRegionForUser` —
 * lazy-imports the global Prisma client so the module stays Edge-compatible.
 */

export interface Region {
  code: string; // "KSA", "EG", "UAE", "CN", "RU", "EU", "US", "GLOBAL"
  name: string;
  countries: string[]; // ISO-2 codes that route to this region
  dbUrl: string; // database connection URL (env var reference)
  compliance: string[]; // ["PDPL", "GDPR", "PIPL", "FZ-242"]
  dpo: string; // DPO contact email
  breachAuthority: string; // "SDAIA" | "NTRA" | "CAC" | "Roskomnadzor"
}

export const REGIONS: Region[] = [
  {
    code: "KSA",
    name: "Saudi Arabia",
    countries: ["SA"],
    dbUrl: process.env.SA_DATABASE_URL || "",
    compliance: ["PDPL"],
    dpo: "dpo-sa@cirkle.app",
    breachAuthority: "SDAIA",
  },
  {
    code: "EG",
    name: "Egypt",
    countries: ["EG"],
    dbUrl: process.env.EG_DATABASE_URL || "",
    compliance: ["EgyptDP"],
    dpo: "dpo-eg@cirkle.app",
    breachAuthority: "NTRA",
  },
  {
    code: "UAE",
    name: "UAE",
    countries: ["AE"],
    dbUrl: process.env.UAE_DATABASE_URL || "",
    compliance: ["UAE_PDPL"],
    dpo: "dpo-ae@cirkle.app",
    breachAuthority: "UAE_Data_Office",
  },
  {
    code: "CN",
    name: "China",
    countries: ["CN", "HK", "TW"],
    dbUrl: process.env.CN_DATABASE_URL || "",
    compliance: ["PIPL"],
    dpo: "dpo-cn@cirkle.app",
    breachAuthority: "CAC",
  },
  {
    code: "RU",
    name: "Russia",
    countries: ["RU", "BY", "KZ"],
    dbUrl: process.env.RU_DATABASE_URL || "",
    compliance: ["FZ-242"],
    dpo: "dpo-ru@cirkle.app",
    breachAuthority: "Roskomnadzor",
  },
  {
    code: "EU",
    name: "European Union",
    countries: [
      "DE", "FR", "IT", "ES", "NL", "BE", "AT", "IE", "PT", "FI", "SE", "DK",
      "PL", "CZ", "RO", "BG", "HR", "SK", "LT", "LV", "EE", "SI", "HU", "LU",
      "MT", "CY", "GR",
    ],
    dbUrl: process.env.EU_DATABASE_URL || "",
    compliance: ["GDPR"],
    dpo: "dpo-eu@cirkle.app",
    breachAuthority: "DPC_Ireland",
  },
  {
    code: "US",
    name: "United States",
    countries: ["US", "CA", "MX", "BR", "AR", "CO", "CL", "PE"],
    dbUrl: process.env.US_DATABASE_URL || "",
    compliance: ["CCPA", "LGPD"],
    dpo: "dpo-us@cirkle.app",
    breachAuthority: "OPC_Canada",
  },
  {
    code: "GLOBAL",
    name: "Global",
    countries: [],
    dbUrl: process.env.DATABASE_URL || "",
    compliance: [],
    dpo: "dpo@cirkle.app",
    breachAuthority: "local",
  },
];

/** The fallback region when a country is unknown or unmapped. */
export const GLOBAL_REGION: Region =
  REGIONS.find((r) => r.code === "GLOBAL") ?? REGIONS[REGIONS.length - 1];

/**
 * Resolve a region for an ISO-2 country code (case-insensitive).
 * Falls back to the GLOBAL region when no mapping exists.
 */
export function getRegionForCountry(countryCode: string | null | undefined): Region {
  if (!countryCode) return GLOBAL_REGION;
  const cc = countryCode.trim().toUpperCase();
  if (!cc) return GLOBAL_REGION;
  for (const r of REGIONS) {
    if (r.countries.includes(cc)) return r;
  }
  return GLOBAL_REGION;
}

/**
 * Look up a user's home region by their username.
 *
 * In production this reads the user's registered country from a *global index*
 * table (a tiny, replicated lookup that maps username → home country) and then
 * resolves the region. In dev (single SQLite) we read the `region` column on
 * the User model (which stores the ISO-2 country code) from the default DB.
 *
 * On any failure (user not found, DB unreachable, dev fallback) we return the
 * GLOBAL region so callers always get a usable `Region`.
 */
export async function getRegionForUser(username: string): Promise<Region> {
  const handle = username?.trim();
  if (!handle) return GLOBAL_REGION;
  try {
    // Lazy import so this module stays Edge-runtime compatible.
    const { db } = await import("./db");
    // The Prisma User model uses `circleId` as the unique handle
    // (e.g. "@layla:matrix.circle.app"). We construct it from the bare
    // username so callers can pass either form.
    const circleId = handle.startsWith("@") ? handle : `@${handle}:matrix.circle.app`;
    const user = await db.user.findUnique({
      where: { circleId },
      select: { region: true },
    });
    if (user?.region) return getRegionForCountry(user.region);
    return GLOBAL_REGION;
  } catch {
    // Dev mode: single SQLite, user may not be persisted, or DB unreachable.
    // Graceful fallback — never throw from region resolution.
    return GLOBAL_REGION;
  }
}

/**
 * Serialize a region for JSON responses (strips the dbUrl so we never leak
 * connection strings to the client).
 */
export function regionToPublic(r: Region): Omit<Region, "dbUrl"> & { dbUrl: string } {
  return {
    ...r,
    // Mask the URL — return only a boolean-ish presence flag, never the value.
    dbUrl: r.dbUrl ? "[configured]" : "[default]",
  };
}

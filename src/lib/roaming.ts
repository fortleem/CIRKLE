/**
 * Travelers / Roaming — Blueprint §4.7.
 *
 * When a Cirkle user travels across borders, two distinct concerns
 * surface:
 *
 *   1. **Feature continuity** — the user signed up in Saudi Arabia and
 *      expects the Saudi plane of features (Arabic UI, Mada/STC Pay
 *      payment methods, Citizen Shield routed to SDAIA). They should
 *      NOT suddenly lose access to those features just because they
 *      landed in Beijing. Feature flags are therefore resolved against
 *      the user's HOME region, not their current location.
 *
 *   2. **Data residency** — new data created while roaming is subject
 *      to the LOCAL region's compliance regime (PIPL in China, GDPR in
 *      the EU, etc.). So a Saudi user posting from Paris must have
 *      that post stored in the EU region, not the Saudi region — but
 *      they still see their Saudi feature plane.
 *
 * This module encodes the helpers that callers (home-screen, /api/feed,
 * /api/payments, etc.) use to resolve "am I roaming?" and "what config
 * applies while I'm roaming?".
 *
 * Storage: the user's home region is the `region` column on the User
 * model — set once at registration (Blueprint §4.7 covenant: "home
 * region is the user's registration country and never changes
 * silently"). The current region is derived per-request from headers
 * or the `country` query param.
 *
 * Isomorphic: this module lazy-imports Prisma only inside the async
 * `getHomeRegion` function so the module itself can be imported from
 * Edge middleware and client components.
 */

import {
  REGIONS,
  GLOBAL_REGION,
  getRegionForCountry,
  getRegionForUser,
  type Region,
} from "@/lib/regions";
import {
  featureManager,
  type FeatureFlag,
} from "@/lib/feature-manager";
import {
  dataTypesLockedToRegion,
  portableDataTypes,
  canCrossBorder,
  getResidencyRule,
  type DataType,
  type DataResidencyRule,
} from "@/lib/data-residency";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RoamingConfig {
  /** User's stable home region (set at registration). */
  homeRegion: Region;
  /** Region the user is currently in (detected per-request). */
  currentRegion: Region;
  /** True when the two regions differ. */
  isRoaming: boolean;
  /** Feature flags resolved against the HOME region (continuity). */
  homeFeatures: FeatureFlag[];
  /** Data-residency rules resolved against the CURRENT region (compliance). */
  currentResidencyRules: DataResidencyRule[];
  /** Data types that must stay inside the current region. */
  lockedDataTypes: DataType[];
  /** Data types the user may freely carry across borders. */
  portableDataTypes: DataType[];
  /** Convenience: list of (dataType, mayTransfer) decisions for the
   *  home→current transfer direction. Used by sync / backup engines. */
  crossBorderTransfers: Array<{
    dataType: DataType;
    homeRegion: string;
    currentRegion: string;
    mayTransfer: boolean;
    reason: string;
  }>;
  /** Locale hint for the home region (so the UI keeps the user's
   *  preferred language while abroad). */
  homeLocale: string;
  /** Locale hint for the current region (so the UI can surface local
   *  content in the local language when the user opts in). */
  currentLocale: string;
  /** ISO timestamp the roaming config was resolved. */
  resolvedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Home region
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a user's home region. The home region is set at registration
 * (stored as the ISO-2 country code on the User.region column) and never
 * changes silently — users can only change it via an explicit
 * "relocate home region" flow that re-verifies their identity.
 *
 * Resolution order:
 *   1. Look up the user by their `username` (handle) via the global
 *      index (Prisma User model).
 *   2. Fall back to {@link GLOBAL_REGION} when the user is unknown or
 *      the DB is unreachable. NEVER throw — callers depend on this
 *      returning a usable `Region`.
 *
 * @param userId The user's bare username (e.g. "yousef") or full
 *               circleId (e.g. "@yousef:matrix.circle.app"). Both are
 *               accepted — the function normalizes.
 */
export async function getHomeRegion(userId: string | null | undefined): Promise<Region> {
  const handle = userId?.trim();
  if (!handle) return GLOBAL_REGION;
  // `getRegionForUser` (in regions.ts) already implements the
  // username → circleId normalization + Prisma lookup + graceful
  // fallback. Delegate to it so we keep a single source of truth.
  return getRegionForUser(handle);
}

/**
 * Synchronous variant — resolves the home region from an explicit
 * country code (no DB lookup). Useful for client components that
 * already have the user's country code in memory (e.g. from the
 * auth-store) and don't want to await a server round-trip.
 */
export function getHomeRegionFromCountry(countryCode: string | null | undefined): Region {
  return getRegionForCountry(countryCode);
}

// ─────────────────────────────────────────────────────────────────────────────
// Current region
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect the user's current region from request context. Best-effort:
 * falls back to {@link GLOBAL_REGION} when no signal is available.
 *
 * Detection order:
 *   1. Explicit `country` hint (e.g. from a `?country=SA` query param
 *      or a manually-set preference).
 *   2. `CF-IPCountry` header (Cloudflare).
 *   3. `x-vercel-ip-country` header (Vercel).
 *   4. `x-country` header (custom reverse proxy).
 *   5. {@link GLOBAL_REGION}.
 *
 * @param opts.country    Explicit ISO-2 country code.
 * @param opts.headers    A Headers object (or Record) to read geo headers from.
 */
export function getCurrentRegion(opts: {
  country?: string | null;
  headers?: Headers | Record<string, string | string[] | undefined> | null;
} = {}): Region {
  if (opts.country && opts.country.trim()) {
    return getRegionForCountry(opts.country);
  }
  const h = opts.headers as Record<string, string | undefined> | null | undefined;
  if (h) {
    const lookup = (key: string): string | undefined => {
      const v = h[key];
      return typeof v === "string" ? v : undefined;
    };
    const headerCountry =
      lookup("CF-IPCountry") ||
      lookup("x-vercel-ip-country") ||
      lookup("x-country") ||
      lookup("cf-ipcountry");
    if (headerCountry) return getRegionForCountry(headerCountry);
  }
  return GLOBAL_REGION;
}

// ─────────────────────────────────────────────────────────────────────────────
// Roaming detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns `true` when the user's current region differs from their
 * home region. This is the "am I roaming?" predicate — callers use it
 * to decide whether to surface the roaming banner, apply the roaming
 * config, etc.
 *
 * Equality is by region CODE (e.g. "KSA" === "KSA"), not by country —
 * so a user whose home region is "EU" (e.g. registered in France) who
 * travels to Germany is NOT considered roaming (both are "EU"). But
 * the same user traveling to Switzerland (which is NOT in the EU
 * region set) IS roaming.
 *
 * A user whose home region is GLOBAL is never considered roaming
 * (GLOBAL is the catch-all).
 */
export async function isRoaming(
  userId: string | null | undefined,
  currentRequest?: {
    country?: string | null;
    headers?: Headers | Record<string, string | string[] | undefined> | null;
  },
): Promise<boolean> {
  const home = await getHomeRegion(userId);
  if (home.code === GLOBAL_REGION.code) return false;
  const current = getCurrentRegion(currentRequest);
  if (current.code === GLOBAL_REGION.code) return false;
  return home.code !== current.code;
}

/**
 * Synchronous variant — useful when the caller already has the home
 * country code (no DB round-trip needed).
 */
export function isRoamingSync(
  homeCountryCode: string | null | undefined,
  currentRequest?: {
    country?: string | null;
    headers?: Headers | Record<string, string | string[] | undefined> | null;
  },
): boolean {
  const home = getHomeRegionFromCountry(homeCountryCode);
  if (home.code === GLOBAL_REGION.code) return false;
  const current = getCurrentRegion(currentRequest);
  if (current.code === GLOBAL_REGION.code) return false;
  return home.code !== current.code;
}

// ─────────────────────────────────────────────────────────────────────────────
// Roaming config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the full roaming config for a user. This is the single object
 * callers consume when rendering the roaming banner, deciding feature
 * availability, or enforcing residency rules.
 *
 * Blueprint §4.7 covenants encoded here:
 *   • **Feature continuity** — `homeFeatures` is resolved against the
 *     HOME region's country code, so a Saudi user in Beijing keeps
 *     their Saudi feature plane.
 *   • **Residency compliance** — `currentResidencyRules` and
 *     `lockedDataTypes` are resolved against the CURRENT region, so
 *     new data created while roaming obeys local law.
 *   • **Cross-border transfer matrix** — for each DataType, we tell
 *     the caller whether the user's home data may be transferred to
 *     the current region (and why / why not). This drives the sync
 *     engine and the "your data is staying home" transparency overlay.
 */
export async function getRoamingConfig(
  userId: string | null | undefined,
  currentRequest?: {
    country?: string | null;
    headers?: Headers | Record<string, string | string[] | undefined> | null;
  },
): Promise<RoamingConfig> {
  const homeRegion = await getHomeRegion(userId);
  const currentRegion = getCurrentRegion(currentRequest);
  const roaming = homeRegion.code !== currentRegion.code
    && homeRegion.code !== GLOBAL_REGION.code
    && currentRegion.code !== GLOBAL_REGION.code;

  // Home country code (first one in the region's countries list, or
  // the region code itself for GLOBAL).
  const homeCountry = homeRegion.countries[0] ?? "";
  const currentCountry = currentRegion.countries[0] ?? "";

  // Feature continuity: resolve against the home country.
  const homeFeatures = featureManager.getAllFeatures(homeCountry || null);

  // Residency compliance: resolve against the current region.
  const currentResidencyRules = RESIDENCY_RULES_SNAPSHOT;
  const lockedDataTypes = dataTypesLockedToRegion(currentRegion.code);
  const portable = portableDataTypes();

  // Cross-border transfer matrix: for each DataType, can home data
  // follow the user into the current region?
  const allDataTypes: DataType[] = [
    "user_profile",
    "messages",
    "payments",
    "shield_reports",
    "verify_claims",
    "posts",
  ];
  const crossBorderTransfers = allDataTypes.map((dataType) => {
    const rule = getResidencyRule(dataType);
    const mayTransfer = canCrossBorder(dataType, homeRegion.code, currentRegion.code);
    let reason: string;
    if (homeRegion.code === currentRegion.code) {
      reason = "Same region — no cross-border transfer occurs.";
    } else if (!rule.crossBorderAllowed) {
      reason = `${dataType} is marked non-portable by Cirkle policy and may not cross borders.`;
    } else if (rule.mustStayInRegion && rule.regions.includes(homeRegion.code)) {
      reason = `${dataType} is locked to the ${homeRegion.code} region by ${rule.regions.join(", ")} compliance law.`;
    } else {
      reason = `${dataType} is portable and may follow the user from ${homeRegion.code} to ${currentRegion.code}.`;
    }
    return {
      dataType,
      homeRegion: homeRegion.code,
      currentRegion: currentRegion.code,
      mayTransfer,
      reason,
    };
  });

  // Locale hints (resolve via the i18n-loader — lazy import so the
  // module stays Edge-compatible even when the loader grows).
  let homeLocale = "en";
  let currentLocale = "en";
  try {
    const { resolveLocaleFromCountry } = await import("@/lib/i18n-loader");
    homeLocale = resolveLocaleFromCountry(homeCountry);
    currentLocale = resolveLocaleFromCountry(currentCountry);
  } catch {
    // i18n-loader is isomorphic so this should never fail; if it does,
    // fall back to "en" for both.
  }

  return {
    homeRegion,
    currentRegion,
    isRoaming: roaming,
    homeFeatures,
    currentResidencyRules,
    lockedDataTypes,
    portableDataTypes: portable,
    crossBorderTransfers,
    homeLocale,
    currentLocale,
    resolvedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Snapshot of the residency rules from `data-residency.ts`. Re-exported
 * here so the roaming config response includes the rules without a
 * second import on the caller side.
 */
const RESIDENCY_RULES_SNAPSHOT: DataResidencyRule[] = [
  {
    dataType: "user_profile",
    mustStayInRegion: true,
    regions: ["KSA", "CN", "RU"],
    crossBorderAllowed: false,
    retention: "until deletion",
  },
  {
    dataType: "messages",
    mustStayInRegion: true,
    regions: ["KSA", "CN", "RU"],
    crossBorderAllowed: false,
    retention: "until deletion",
  },
  {
    dataType: "payments",
    mustStayInRegion: true,
    regions: ["KSA", "CN", "RU", "EU"],
    crossBorderAllowed: false,
    retention: "7 years",
  },
  {
    dataType: "shield_reports",
    mustStayInRegion: false,
    regions: [],
    crossBorderAllowed: true,
    retention: "until deletion",
  },
  {
    dataType: "verify_claims",
    mustStayInRegion: true,
    regions: ["KSA", "CN", "RU"],
    crossBorderAllowed: false,
    retention: "until deletion",
  },
  {
    dataType: "posts",
    mustStayInRegion: false,
    regions: [],
    crossBorderAllowed: true,
    retention: "until deletion",
  },
];

/**
 * Convenience: list every region code Cirkle recognizes. Surfaces the
 * underlying REGIONS array for callers (e.g. a region picker) without
 * needing a second import.
 */
export function listAllRegions(): Region[] {
  return REGIONS;
}

/**
 * Convenience: returns a short human-readable label for the roaming
 * state, suitable for the top-bar banner ("Roaming in France · Home
 * region Saudi Arabia").
 */
export function roamingLabel(config: RoamingConfig): string {
  if (!config.isRoaming) return `Home region: ${config.homeRegion.name}`;
  return `Roaming in ${config.currentRegion.name} · Home region: ${config.homeRegion.name}`;
}

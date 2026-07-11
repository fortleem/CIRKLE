/**
 * Data residency rules — per-data-type storage + cross-border transfer policy.
 *
 * These rules encode *where* each class of personal data is allowed to live
 * and *whether* it may leave the user's home region. They drive:
 *   • The `data-residency` overlay (transparency to the user).
 *   • Server-side guards before any cross-region replication or backup.
 *   • DSR / breach-notification routing (which authority gets pinged).
 *
 * The model is conservative: when a data type is marked `mustStayInRegion`
 * for a region in `regions[]`, the data MUST NOT be written, replicated, or
 * backed up outside that region. `crossBorderAllowed: false` means even
 * transient cross-border reads (e.g. for aggregation) are prohibited.
 */

export type DataType =
  | "user_profile"
  | "messages"
  | "payments"
  | "shield_reports"
  | "verify_claims"
  | "posts";

export interface DataResidencyRule {
  dataType: DataType;
  mustStayInRegion: boolean;
  /** Region codes that require local storage. Empty = no strict residency. */
  regions: string[];
  crossBorderAllowed: boolean;
  retention: string; // "7 years" | "90 days" | "until deletion"
}

export const RESIDENCY_RULES: DataResidencyRule[] = [
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
    // Shield reports are anonymous by design — no PII, can be global.
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
    // Posts are public broadcasts — can be globally replicated / CDN-cached.
    dataType: "posts",
    mustStayInRegion: false,
    regions: [],
    crossBorderAllowed: true,
    retention: "until deletion",
  },
];

const RULE_BY_TYPE = new Map<DataType, DataResidencyRule>(
  RESIDENCY_RULES.map((r) => [r.dataType, r]),
);

/**
 * Resolve the residency rule for a data type. Returns a permissive default
 * (must-stay = false, cross-border = true) for unknown types so unknown
 * categories never accidentally block a request.
 */
export function getResidencyRule(
  dataType: DataType | string,
): DataResidencyRule {
  const rule = RULE_BY_TYPE.get(dataType as DataType);
  if (rule) return rule;
  return {
    dataType: dataType as DataType,
    mustStayInRegion: false,
    regions: [],
    crossBorderAllowed: true,
    retention: "until deletion",
  };
}

/**
 * Decide whether `dataType` may be transferred from `fromRegion` to
 * `toRegion`.
 *
 * Rules:
 *   1. Same region → always allowed.
 *   2. If the data type forbids cross-border transfer → denied.
 *   3. If the source region requires local residency and the destination is
 *      different → denied (the data must not leave its home region).
 *   4. Otherwise → allowed.
 */
export function canCrossBorder(
  dataType: string,
  fromRegion: string,
  toRegion: string,
): boolean {
  if (!fromRegion || !toRegion) return true;
  if (fromRegion === toRegion) return true;

  const rule = getResidencyRule(dataType);
  if (!rule.crossBorderAllowed) return false;
  if (rule.mustStayInRegion && rule.regions.includes(fromRegion)) return false;
  return true;
}

/**
 * Returns the list of data types that must stay inside `regionCode`.
 * Useful for the residency overlay ("your region locks: profile, messages…").
 */
export function dataTypesLockedToRegion(regionCode: string): DataType[] {
  return RESIDENCY_RULES.filter(
    (r) => r.mustStayInRegion && r.regions.includes(regionCode),
  ).map((r) => r.dataType);
}

/**
 * Returns the list of data types that may freely cross borders (public /
 * anonymous content).
 */
export function portableDataTypes(): DataType[] {
  return RESIDENCY_RULES.filter((r) => r.crossBorderAllowed).map((r) => r.dataType);
}

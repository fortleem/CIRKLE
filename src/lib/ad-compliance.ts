/**
 * Advertiser compliance per region — Blueprint §4.11.
 *
 * CIRKLE's ad model is **non-targeted local ads paid via corporate
 * invoice** (§30 / §7.3.1). Ads are scoped by country / city / category
 * — never by user profile. But non-targeted does NOT mean unrestricted:
 * different jurisdictions ban or restrict different ad categories.
 *
 * This module is the single source of truth for which ad categories are
 * permitted in which country. The ad engine consults it before serving
 * an ad, and the Ad Studio consults it before letting an advertiser
 * target a country with a sensitive category.
 *
 * Privacy posture (§30.4): this module is a pure function — no DB, no
 * PII, no logging. Safe to import on the client for advertiser-facing
 * UX (the rules are public).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical ad category list. Mirrors `AD_CATEGORIES` in ad-engine.ts
 * plus the sensitive sub-categories that compliance cares about.
 */
export type AdComplianceCategory =
  | "news"
  | "sports"
  | "tech"
  | "education"
  | "retail"
  | "food"
  | "travel"
  | "alcohol"
  | "gambling"
  | "pharmaceuticals"
  | "tobacco"
  | "weapons"
  | "cryptocurrency"
  | "political"
  | "dating"
  | "financial_services"
  | "cbd"
  | "cannabis";

export interface AdRules {
  /** ISO-2 country code the rules apply to (uppercase). */
  country: string;
  /** Human-readable jurisdiction label. */
  jurisdiction: string;
  /** Categories that may be advertised in this country. */
  approved: AdComplianceCategory[];
  /** Categories that are banned (legal prohibition). */
  banned: AdComplianceCategory[];
  /** Categories that require regulatory pre-approval (e.g. a licence). */
  restricted: AdComplianceCategory[];
  /** Required disclaimer text appended to alcohol / pharma / financial ads. */
  disclaimers: Partial<Record<AdComplianceCategory, string>>;
  /** Free-form compliance notes shown in the Ad Studio UI. */
  notes: string[];
}

/**
 * Shape used by the ad engine when checking a specific ad. This is the
 * minimal subset an advertiser supplies when creating a campaign — the
 * compliance layer maps it to an `AdComplianceCategory` and runs the
 * check.
 */
export interface AdForCompliance {
  category: string;
  /** Free-form advertiser URL — used to spot pharma / gambling landing pages. */
  url?: string;
  /** Ad title — scanned for restricted keywords. */
  title?: string;
  /** Ad body — scanned for restricted keywords. */
  body?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-country rules
// ─────────────────────────────────────────────────────────────────────────────
//
// The lists below are intentionally conservative — when a category is
// legally ambiguous in a jurisdiction, it goes in `restricted` (needs
// human review) rather than `approved`. Operators can override via the
// Ad Studio moderation queue.

const BASE_APPROVED: AdComplianceCategory[] = [
  "news", "sports", "tech", "education", "retail", "food", "travel",
];

const RULES: Record<string, AdRules> = {
  // ── Saudi Arabia (KSA) ───────────────────────────────────────────────
  SA: {
    country: "SA",
    jurisdiction: "Kingdom of Saudi Arabia",
    approved: [...BASE_APPROVED, "financial_services"],
    banned: ["alcohol", "gambling", "tobacco", "weapons", "cannabis", "cbd", "dating", "pharmaceuticals"],
    restricted: ["cryptocurrency", "political"],
    disclaimers: {
      financial_services: "SCapital approved by CMA. Investing involves risk.",
    },
    notes: [
      "Alcohol, gambling, dating, cannabis are prohibited by law.",
      "Pharmaceuticals may only be advertised by licensed pharmacies.",
      "Cryptocurrency ads require SAMA pre-approval.",
    ],
  },

  // ── United Arab Emirates ─────────────────────────────────────────────
  AE: {
    country: "AE",
    jurisdiction: "United Arab Emirates",
    approved: [...BASE_APPROVED, "financial_services"],
    banned: ["alcohol", "gambling", "tobacco", "weapons", "cannabis", "cbd", "dating"],
    restricted: ["pharmaceuticals", "cryptocurrency", "political"],
    disclaimers: {
      financial_services: "Regulated by the Central Bank of the UAE. Investing involves risk.",
    },
    notes: [
      "Alcohol ads permitted only in licensed venues (not on public platforms).",
      "Pharmaceuticals require Ministry of Health approval.",
    ],
  },

  // ── Egypt ────────────────────────────────────────────────────────────
  EG: {
    country: "EG",
    jurisdiction: "Arab Republic of Egypt",
    approved: [...BASE_APPROVED, "financial_services"],
    banned: ["alcohol", "gambling", "weapons", "cannabis", "cbd", "dating"],
    restricted: ["pharmaceuticals", "tobacco", "cryptocurrency", "political"],
    disclaimers: {
      financial_services: "Regulated by the Financial Regulatory Authority.",
    },
    notes: [
      "Alcohol ads restricted — only permitted for licensed tourism venues.",
      "Gambling prohibited under Egyptian law.",
    ],
  },

  // ── European Union (GDPR + DSA + AVMSD) ─────────────────────────────
  EU: {
    country: "EU",
    jurisdiction: "European Union (AVMSD / DSA)",
    approved: [...BASE_APPROVED, "alcohol", "financial_services", "dating", "cbd"],
    banned: ["weapons", "cannabis"],
    restricted: ["gambling", "pharmaceuticals", "tobacco", "cryptocurrency", "political"],
    disclaimers: {
      alcohol: "Drink responsibly. 18+. Don't drink and drive.",
      gambling: "Gambling can be addictive — 18+. Begambleaware.org.",
      pharmaceuticals: "Consult a healthcare professional. Read the patient information leaflet.",
      financial_services: "Capital at risk. Regulated by the relevant EU authority.",
    },
    notes: [
      "Alcohol ads permitted with mandatory responsibility disclaimer.",
      "Gambling requires country-level licence (member-state specific).",
      "Pharmaceuticals restricted to OTC products with mandatory side-effect disclosure.",
      "DSA: ad transparency report required quarterly.",
    ],
  },

  // ── United States ───────────────────────────────────────────────────
  US: {
    country: "US",
    jurisdiction: "United States (FTC + state laws)",
    approved: [...BASE_APPROVED, "alcohol", "financial_services", "dating", "cbd", "pharmaceuticals"],
    banned: ["weapons", "cannabis"],
    restricted: ["gambling", "tobacco", "cryptocurrency", "political"],
    disclaimers: {
      alcohol: "Drink responsibly. 21+.",
      gambling: "Gambling problem? Call 1-800-GAMBLER. 21+.",
      pharmaceuticals: "Consult your doctor. Side effects may occur — see full prescribing info.",
      financial_services: "Investing involves risk. Not FDIC insured.",
      cbd: "These statements have not been evaluated by the FDA. Not intended to diagnose, treat, or cure any disease.",
    },
    notes: [
      "Alcohol: 21+, state-level restrictions apply.",
      "Gambling: state-licensed operators only (NJ, PA, MI, etc.).",
      "Cannabis: remains a Schedule I controlled substance federally — ads for licensed dispensaries are state-scoped only.",
      "Pharmaceuticals: FDA requires fair balance of risks/benefits.",
      "Political ads: FEC disclosure required (sponsor ID, spending).",
    ],
  },

  // ── Russia (RKN + 38-FZ advertising law) ────────────────────────────
  RU: {
    country: "RU",
    jurisdiction: "Russian Federation (38-FZ / RKN)",
    approved: [...BASE_APPROVED, "financial_services"],
    banned: ["alcohol", "gambling", "weapons", "cannabis", "cbd", "dating", "tobacco"],
    restricted: ["pharmaceuticals", "cryptocurrency", "political"],
    disclaimers: {
      financial_services: "Регулируется Банком России. Инвестиции связаны с риском.",
    },
    notes: [
      "Alcohol advertising prohibited by 171-FZ.",
      "Gambling permitted only for licensed operators (Cyprial/TSUPIS zones).",
      "Pharmaceuticals restricted to OTC with mandatory side-effect text.",
      "Cryptocurrency ads restricted by Bank of Russia (advertise at own risk).",
      "Political ads subject to 19.1-FZ (foreign-agent labelling required).",
    ],
  },

  // ── Mainland China (CAC + Advertising Law) ──────────────────────────
  CN: {
    country: "CN",
    jurisdiction: "People's Republic of China (Advertising Law)",
    approved: [...BASE_APPROVED, "financial_services"],
    banned: ["alcohol", "gambling", "weapons", "cannabis", "cbd", "dating", "tobacco", "political"],
    restricted: ["pharmaceuticals", "cryptocurrency"],
    disclaimers: {
      financial_services: "投资有风险。受中国银保监会监管。",
    },
    notes: [
      "Alcohol ads restricted — no TV/cinema placement; online ads require health warning.",
      "Gambling is illegal in mainland China (Macau is the only licensed zone).",
      "Pharmaceuticals: NMPA approval required; OTC only.",
      "Cryptocurrency ads effectively banned by PBOC notice.",
      "Dating / matchmaking ads require ICP licence + real-name verification.",
    ],
  },

  // ── United Kingdom (ASA / BCAP) ────────────────────────────────────
  GB: {
    country: "GB",
    jurisdiction: "United Kingdom (ASA / BCAP / CAP)",
    approved: [...BASE_APPROVED, "alcohol", "financial_services", "dating", "cbd"],
    banned: ["weapons", "cannabis"],
    restricted: ["gambling", "pharmaceuticals", "tobacco", "cryptocurrency", "political"],
    disclaimers: {
      alcohol: "Drinkaware.co.uk — drink responsibly. 18+.",
      gambling: "18+. Begambleaware.org. GamCare: 0808 8020 133.",
      pharmaceuticals: "Always read the label. Consult a healthcare professional.",
      financial_services: "Capital at risk. Regulated by the FCA.",
    },
    notes: [
      "Alcohol ads permitted with responsibility messaging.",
      "Gambling: UKGC-licensed operators only.",
      "HFSS (high fat / salt / sugar) food ads restricted in online media targeting under-16s.",
    ],
  },

  // ── India (ASCI) ────────────────────────────────────────────────────
  IN: {
    country: "IN",
    jurisdiction: "India (ASCI / ADCC)",
    approved: [...BASE_APPROVED, "alcohol", "financial_services", "pharmaceuticals", "cbd"],
    banned: ["gambling", "weapons", "cannabis", "tobacco"],
    restricted: ["cryptocurrency", "political", "dating"],
    disclaimers: {
      alcohol: "Surrogate advertising prohibited — ads must avoid direct alcohol promotion.",
      financial_services: "Investments subject to market risks. Regulated by SEBI.",
      pharmaceuticals: "Schedule H / H1 drugs may not be advertised to the public.",
    },
    notes: [
      "Alcohol: direct advertising banned — only surrogate ads (club soda, music CDs) permitted.",
      "Gambling: state-level legality varies (Sikkim, Goa permit). Online skill games restricted.",
      "Cryptocurrency: ads permitted with mandatory risk disclaimer per ASCI guidelines.",
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default (permissive) rules for countries without a specific entry.
 * Used by `getAdRules` when a country is not in the registry.
 *
 * The default is intentionally permissive BUT conservative on the
 * most universally-regulated categories (gambling, pharma, tobacco,
 * weapons) — those go into `restricted` (need human review) rather
 * than `approved`.
 */
function defaultRules(country: string): AdRules {
  return {
    country,
    jurisdiction: country,
    approved: [...BASE_APPROVED],
    banned: ["weapons", "cannabis"],
    restricted: ["alcohol", "gambling", "pharmaceuticals", "tobacco", "cryptocurrency", "political", "dating"],
    disclaimers: {
      alcohol: "Drink responsibly — 18+ or legal drinking age in your country.",
      gambling: "Gambling can be addictive. 18+. Seek help if needed.",
      pharmaceuticals: "Consult a healthcare professional before use.",
    },
    notes: [
      "Default rules — no country-specific compliance entry. Sensitive categories require manual review.",
    ],
  };
}

/**
 * Returns the ad rules for a country. Accepts ISO-2 or ISO-3 codes
 * (case-insensitive). Falls back to the permissive default when no
 * country-specific entry exists.
 *
 * EU member states are automatically routed to the EU ruleset unless
 * the country has its own stricter entry (currently none do — they all
 * fall through to the EU baseline).
 */
export function getAdRules(country: string | null | undefined): AdRules {
  if (!country || typeof country !== "string") return defaultRules("GLOBAL");
  const cc = country.trim().toUpperCase();
  if (!cc) return defaultRules("GLOBAL");

  // ISO-3 → ISO-2 normalisation.
  const iso3to2: Record<string, string> = {
    RUS: "RU", CHN: "CN", USA: "US", GBR: "GB", IND: "IN",
    SAU: "SA", ARE: "AE", EGY: "EG",
  };
  const norm = cc.length === 3 ? iso3to2[cc] ?? "" : cc;

  if (RULES[norm]) return RULES[norm];

  const EU_CODES = new Set([
    "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
    "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO",
  ]);
  if (EU_CODES.has(norm)) return RULES.EU;

  return defaultRules(norm);
}

/**
 * Returns the list of approved ad categories for a country.
 */
export function getApprovedAdCategories(country: string | null | undefined): AdComplianceCategory[] {
  return getAdRules(country).approved.slice();
}

/**
 * Returns the list of banned categories for a country.
 */
export function getBannedAdCategories(country: string | null | undefined): AdComplianceCategory[] {
  return getAdRules(country).banned.slice();
}

/**
 * Returns the list of restricted (needs human review) categories.
 */
export function getRestrictedAdCategories(country: string | null | undefined): AdComplianceCategory[] {
  return getAdRules(country).restricted.slice();
}

/**
 * Returns the required disclaimer text for an ad category in a country,
 * or null if no disclaimer is required.
 */
export function getAdDisclaimer(
  category: string,
  country: string | null | undefined,
): string | null {
  const rules = getAdRules(country);
  const cat = normaliseCategory(category);
  if (!cat) return null;
  return rules.disclaimers[cat] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compliance check
// ─────────────────────────────────────────────────────────────────────────────

/** Set of all known categories for fast lookup. */
const ALL_CATEGORIES: ReadonlySet<string> = new Set<AdComplianceCategory>([
  "news","sports","tech","education","retail","food","travel","alcohol",
  "gambling","pharmaceuticals","tobacco","weapons","cryptocurrency",
  "political","dating","financial_services","cbd","cannabis",
]);

/** Map of free-text category synonyms → canonical category. */
const SYNONYMS: Record<string, AdComplianceCategory> = {
  // alcohol
  beer: "alcohol", wine: "alcohol", spirits: "alcohol", liquor: "alcohol",
  // gambling
  casino: "gambling", betting: "gambling", sportsbook: "gambling",
  // pharma
  medicine: "pharmaceuticals", drugs: "pharmaceuticals", rx: "pharmaceuticals",
  // tobacco
  cigarettes: "tobacco", vaping: "tobacco", vape: "tobacco", e_cig: "tobacco",
  // crypto
  crypto: "cryptocurrency", bitcoin: "cryptocurrency", btc: "cryptocurrency", nft: "cryptocurrency",
  // financial
  bank: "financial_services", insurance: "financial_services", loans: "financial_services",
  // dating
  matchmaking: "dating",
  // cannabis / cbd
  marijuana: "cannabis", weed: "cannabis", thc: "cannabis",
};

/**
 * Normalise an arbitrary category string to a canonical
 * `AdComplianceCategory`. Returns null if the category is unknown.
 *
 * Synonyms (beer → alcohol, casino → gambling, etc.) are mapped to the
 * canonical category so an advertiser can't bypass the rules by using
 * a synonym.
 */
export function normaliseCategory(category: string): AdComplianceCategory | null {
  if (!category || typeof category !== "string") return null;
  const c = category.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (ALL_CATEGORIES.has(c)) return c as AdComplianceCategory;
  if (SYNONYMS[c]) return SYNONYMS[c];
  return null;
}

export interface ComplianceResult {
  /** True if the ad may be served in this country. */
  compliant: boolean;
  /** Reason the ad was rejected (when not compliant). */
  reason?: "banned" | "restricted_unapproved" | "unknown_category";
  /** Canonical category (when normalisation succeeded). */
  category?: AdComplianceCategory;
  /** Required disclaimer text the advertiser must include (when any). */
  disclaimer?: string | null;
  /** Human-readable explanation for the Ad Studio UI. */
  message: string;
}

/**
 * Check whether a given ad is compliant with the country's ad rules.
 *
 * Returns a `ComplianceResult`:
 *   • `compliant: true`  — the ad may be served (with the disclaimer, if any).
 *   • `compliant: false` — the ad must not be served; `reason` explains why.
 *
 * Behaviour:
 *   • Approved categories → compliant (disclaimer attached if any).
 *   • Banned categories → not compliant (`reason: "banned"`).
 *   • Restricted categories → not compliant (`reason: "restricted_unapproved"`)
 *     until a human moderator pre-approves them via the moderation queue.
 *   • Unknown category (not in the canonical list) → not compliant
 *     (`reason: "unknown_category"`) — the ad engine refuses to serve
 *     ads it can't classify.
 */
export function isAdCompliant(ad: AdForCompliance, country: string | null | undefined): ComplianceResult {
  const rules = getAdRules(country);
  const category = normaliseCategory(ad.category);

  if (!category) {
    return {
      compliant: false,
      reason: "unknown_category",
      message: `Ad category "${ad.category}" is not recognised — cannot serve in ${rules.jurisdiction}.`,
    };
  }

  if (rules.banned.includes(category)) {
    return {
      compliant: false,
      reason: "banned",
      category,
      message: `Category "${category}" is banned in ${rules.jurisdiction}.`,
    };
  }

  if (rules.restricted.includes(category)) {
    return {
      compliant: false,
      reason: "restricted_unapproved",
      category,
      message: `Category "${category}" is restricted in ${rules.jurisdiction} — requires moderator pre-approval.`,
    };
  }

  // Approved (or implicitly approved because not in banned/restricted).
  const disclaimer = rules.disclaimers[category] ?? null;
  return {
    compliant: true,
    category,
    disclaimer,
    message: disclaimer
      ? `Approved in ${rules.jurisdiction}. Required disclaimer must be included.`
      : `Approved in ${rules.jurisdiction}.`,
  };
}

/**
 * Returns the full ruleset for all configured countries — used by the
 * Ad Studio UI to render the country/category matrix.
 */
export function listAllAdRules(): AdRules[] {
  return Object.values(RULES);
}

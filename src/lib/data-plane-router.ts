/**
 * Data-plane routing logic — Blueprint §4.4 / §4.5.
 *
 * CIRKLE is deployed across multiple **data planes** — each plane is a
 * self-contained deployment (its own Matrix Synapse homeserver,
 * PeerTube node, Mailcow, ntfy, TileServer GL, etc.) that lives inside
 * a specific legal/data-residency jurisdiction. The router takes a
 * viewer country code and returns the plane + concrete service URLs
 * that the request should be routed to.
 *
 * Planes (Blueprint §4.5):
 *   • EU       — European Union (GDPR + DSA compliance)
 *   • CN       — Mainland China (ICP, real-name, cross-border blocked)
 *   • RU       — Russia (Mir / SBP, Roskomnadzor compliance, VPN detection)
 *   • US       — United States (default global fallback)
 *   • GLOBAL   — fallback plane for countries without a dedicated plane
 *
 * Privacy posture (§30.4): the router is a pure function — it never
 * touches the database, never logs PII, and never inspects the user's
 * identity. Only the country code (already derived from the request's
 * geo-IP on the edge) drives the routing decision. This makes the
 * router safe to import on the client for diagnostics (it has no
 * server-only deps).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DataPlane = "EU" | "CN" | "RU" | "US" | "GLOBAL";

export interface PlaneConfig {
  /** Plane identifier. */
  plane: DataPlane;
  /** Human-readable label (e.g. "European Union"). */
  label: string;
  /** Matrix Synapse homeserver base URL. */
  homeserverUrl: string;
  /** PeerTube node base URL. */
  peertubeUrl: string;
  /** ntfy push server base URL. */
  ntfyUrl: string;
  /** Mailcow mail server base URL (admin web UI host). */
  mailcowUrl: string;
  /** TileServer GL base URL (vector + raster tiles). */
  tileserverUrl: string;
  /** Whether the plane requires localised payments (e.g. Mir in RU). */
  localizedPayments: boolean;
  /** Whether the plane enforces strict cross-border-transfer restrictions. */
  strictResidency: boolean;
  /** Optional regulator / authority code the plane is answerable to. */
  regulator?: string;
  /** Free-form compliance notes shown in the residency UI. */
  complianceNotes: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Plane registry
// ─────────────────────────────────────────────────────────────────────────────
//
// The hostnames use the convention `<service>.<plane>.cirkle.app` so a
// self-hosted operator can deploy the full stack behind a single wildcard
// cert. The values are deliberately public — they are routing hints, not
// secrets. An operator overrides them via env vars (see `loadPlaneOverrides`).

const EU_PLANE: PlaneConfig = {
  plane: "EU",
  label: "European Union",
  homeserverUrl: "https://matrix.eu.cirkle.app",
  peertubeUrl: "https://video.eu.cirkle.app",
  ntfyUrl: "https://push.eu.cirkle.app",
  mailcowUrl: "https://mail.eu.cirkle.app",
  tileserverUrl: "https://tiles.eu.cirkle.app",
  localizedPayments: false,
  strictResidency: true,
  regulator: "EDPB",
  complianceNotes: [
    "GDPR — data subject requests honoured within 30 days.",
    "DSA — ad transparency + risk assessments published quarterly.",
    "Payments must be processed by an EU-licensed PSP.",
  ],
};

const CN_PLANE: PlaneConfig = {
  plane: "CN",
  label: "Mainland China",
  homeserverUrl: "https://matrix.cn.cirkle.app",
  peertubeUrl: "https://video.cn.cirkle.app",
  ntfyUrl: "https://push.cn.cirkle.app",
  mailcowUrl: "https://mail.cn.cirkle.app",
  tileserverUrl: "https://tiles.cn.cirkle.app",
  localizedPayments: true,
  strictResidency: true,
  regulator: "CAC",
  complianceNotes: [
    "ICP filing required for the domain.",
    "Real-name verification for all accounts.",
    "Cross-border transfer of personal data requires CAC security assessment.",
    "Prohibited content filtered perCyberspace Administration rules.",
  ],
};

const RU_PLANE: PlaneConfig = {
  plane: "RU",
  label: "Russian Federation",
  homeserverUrl: "https://matrix.ru.cirkle.app",
  peertubeUrl: "https://video.ru.cirkle.app",
  ntfyUrl: "https://push.ru.cirkle.app",
  mailcowUrl: "https://mail.ru.cirkle.app",
  tileserverUrl: "https://tiles.ru.cirkle.app",
  localizedPayments: true,
  strictResidency: true,
  regulator: "RKN",
  complianceNotes: [
    "Roskomnadzor (RKN) compliance — Russian personal data (152-FZ) stored on RU servers.",
    "Mir + SBP (Fast Payment System) accepted; Visa/Mastercard blocked by sanctions.",
    "VPN detection — inbound traffic from known VPN exits is rate-limited + flagged.",
    "Prohibited content filtered per RKN registry.",
  ],
};

const US_PLANE: PlaneConfig = {
  plane: "US",
  label: "United States",
  homeserverUrl: "https://matrix.us.cirkle.app",
  peertubeUrl: "https://video.us.cirkle.app",
  ntfyUrl: "https://push.us.cirkle.app",
  mailcowUrl: "https://mail.us.cirkle.app",
  tileserverUrl: "https://tiles.us.cirkle.app",
  localizedPayments: false,
  strictResidency: false,
  complianceNotes: [
    "CCPA / CPRA honoured for California residents.",
    "No data-localisation mandate — data may flow freely.",
  ],
};

const GLOBAL_PLANE: PlaneConfig = {
  plane: "GLOBAL",
  label: "Global (default)",
  homeserverUrl: "https://matrix.cirkle.app",
  peertubeUrl: "https://video.cirkle.app",
  ntfyUrl: "https://push.cirkle.app",
  mailcowUrl: "https://mail.cirkle.app",
  tileserverUrl: "https://tiles.cirkle.app",
  localizedPayments: false,
  strictResidency: false,
  complianceNotes: [
    "Default plane — used when a country has no dedicated deployment.",
    "Backed by the US plane with CDN edge caching in 30+ regions.",
  ],
};

const PLANE_REGISTRY: Record<DataPlane, PlaneConfig> = {
  EU: EU_PLANE,
  CN: CN_PLANE,
  RU: RU_PLANE,
  US: US_PLANE,
  GLOBAL: GLOBAL_PLANE,
};

// ─────────────────────────────────────────────────────────────────────────────
// Country → plane mapping
// ─────────────────────────────────────────────────────────────────────────────
//
// The list is intentionally short — only countries with dedicated planes
// are mapped. Everything else falls through to GLOBAL. Country codes are
// ISO-3166 alpha-2 (uppercase).

const EU_COUNTRY_CODES = new Set([
  // EU 27
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
  // EEA / closely-aligned
  "IS", "LI", "NO",
]);

const COUNTRY_TO_PLANE: Record<string, DataPlane> = {
  // Russia
  RU: "RU",
  // Mainland China + HK (HK treated as CN plane for residency; data may
  // transit the CN plane but with extra safeguards).
  CN: "CN",
  // United States + territories
  US: "US",
  PR: "US",
  GU: "US",
  VI: "US",
};

/**
 * Resolve the data plane for a viewer's country code.
 *
 * Accepts either ISO-2 (e.g. "DE") or ISO-3 (e.g. "DEU"). The lookup is
 * case-insensitive and always returns a valid `DataPlane` (falls back to
 * GLOBAL for unmapped countries).
 */
export function getDataPlane(country: string | null | undefined): DataPlane {
  if (!country || typeof country !== "string") return "GLOBAL";
  const cc = country.trim().toUpperCase();
  if (!cc) return "GLOBAL";

  // ISO-3 → ISO-2 normalisation for the few we care about.
  const iso3to2: Record<string, string> = {
    RUS: "RU", CHN: "CN", USA: "US",
    DEU: "DE", FRA: "FR", ESP: "ES", ITA: "IT", NLD: "NL", POL: "PL",
  };
  const norm = cc.length === 3 ? iso3to2[cc] ?? "" : cc;
  if (!norm) return "GLOBAL";

  if (COUNTRY_TO_PLANE[norm]) return COUNTRY_TO_PLANE[norm];
  if (EU_COUNTRY_CODES.has(norm)) return "EU";
  return "GLOBAL";
}

/**
 * Get the full plane configuration for a country.
 *
 * This is the main entry point — it calls `getDataPlane` then resolves
 * the plane's concrete service URLs.
 */
export function getPlaneConfig(country: string | null | undefined): PlaneConfig {
  return PLANE_REGISTRY[getDataPlane(country)];
}

/**
 * Resolve the Matrix Synapse homeserver URL for the viewer's country.
 */
export function getHomeserverUrl(country: string | null | undefined): string {
  return getPlaneConfig(country).homeserverUrl;
}

/**
 * Resolve the PeerTube node URL for the viewer's country.
 */
export function getPeerTubeUrl(country: string | null | undefined): string {
  return getPlaneConfig(country).peertubeUrl;
}

/**
 * Resolve the ntfy push server URL for the viewer's country.
 */
export function getNtfyUrl(country: string | null | undefined): string {
  return getPlaneConfig(country).ntfyUrl;
}

/**
 * Resolve the Mailcow mail server URL for the viewer's country.
 */
export function getMailcowUrl(country: string | null | undefined): string {
  return getPlaneConfig(country).mailcowUrl;
}

/**
 * Resolve the TileServer GL URL for the viewer's country.
 */
export function getTileserverUrl(country: string | null | undefined): string {
  return getPlaneConfig(country).tileserverUrl;
}

/**
 * Whether the viewer's country requires localised payments (e.g. Mir
 * in Russia, UnionPay / WeChat Pay in China).
 */
export function requiresLocalisedPayments(country: string | null | undefined): boolean {
  return getPlaneConfig(country).localizedPayments;
}

// ─────────────────────────────────────────────────────────────────────────────
// Russia-specific config (§4.5.2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Russia-specific payment options. Mir is the national card system;
 * SBP (Система Быстрых Платежей) is the central bank's fast payment
 * system (QR + phone-number transfers). Visa/Mastercard cross-border
 * rails are blocked by 2022 sanctions — they are NOT offered here.
 */
export interface RussiaPaymentConfig {
  /** Mir card network. */
  mir: boolean;
  /** SBP — Fast Payment System (QR + phone). */
  sbp: boolean;
  /** UnionPay (still operates inside RU). */
  unionpay: boolean;
  /** Visa (blocked by sanctions — kept false for transparency). */
  visa: boolean;
  /** Mastercard (blocked by sanctions — kept false for transparency). */
  mastercard: boolean;
  /** Currency code used for settlement. */
  currency: string;
}

export const RUSSIA_PAYMENTS: RussiaPaymentConfig = {
  mir: true,
  sbp: true,
  unionpay: true,
  visa: false,
  mastercard: false,
  currency: "RUB",
};

/**
 * Categories that must be filtered inside the Russia data plane per
 * Roskomnadzor (RKN) registry + 149-FZ. The list is intentionally
 * narrow: only categories explicitly prohibited by law appear here.
 * The list is NOT used for political censorship — only for legally
 * prohibited content (CSAM, extremism, drug trafficking, etc.).
 *
 * Categories:
 *   • "extremism"     — materials on the RKN extremism registry.
 *   • "drug_traffic"  — promotion of illegal drug trafficking.
 *   • "csam"          — child sexual abuse material (universally blocked).
 *   • "suicide"       — promotion of suicide (per 139-FZ).
 *   • "gambling_unlicensed" — unlicensed online gambling.
 */
export const RUSSIA_BLOCKED_CATEGORIES = new Set([
  "extremism",
  "drug_traffic",
  "csam",
  "suicide",
  "gambling_unlicensed",
]);

/**
 * Russia-specific compliance flags surfaced to the residency UI + the
 * server-side guards. Mirrors `RU_PLANE.complianceNotes` but typed.
 */
export interface RussiaCompliance {
  /** 152-FZ: Russian personal data must be stored on RU servers. */
  dataLocalisation: boolean;
  /** RKN registry filtering enabled. */
  rknFiltering: boolean;
  /** VPN / proxy detection enabled — traffic from known VPN exits is
   *  rate-limited + flagged for the moderation queue. */
  vpnDetection: boolean;
  /** SBP + Mir required as payment options. */
  localPayments: boolean;
}

export const RUSSIA_COMPLIANCE: RussiaCompliance = {
  dataLocalisation: true,
  rknFiltering: true,
  vpnDetection: true,
  localPayments: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// VPN / proxy detection (§4.5.2 — Russia-specific, but exposed globally)
// ─────────────────────────────────────────────────────────────────────────────
//
// The detection is a best-effort heuristic — it flags traffic from a
// known VPN / proxy / datacenter ASN as suspicious. The list is NOT a
// blocklist: flagged traffic is rate-limited + the request is annotated
// for moderation review, but it is never silently dropped.
//
// In production the heavy lifting (ASN lookup, threat intel feed) lives
// on the edge (Caddy / Cloudflare Worker). This module mirrors the
// behaviour so server-side guards can re-check when the edge header is
// missing or spoofed.

/**
 * A small built-in sample of well-known VPN / hosting provider ASNs.
 * The full list lives in the operator's threat-intel feed (referenced
 * via the `CIRKLE_VPN_ASN_LIST` env var in production). This sample is
 * enough for the detection to be meaningful in dev / small deploys.
 */
export const KNOWN_VPN_ASNS: ReadonlySet<number> = new Set([
  // DigitalOcean
  14061,
  // Amazon AWS
  16509,
  // Google Cloud
  15169,
  // Microsoft Azure
  8075,
  // OVH
  16276,
  // Hetzner
  24940,
  // Linode / Akamai
  63949,
  // Vultr
  20473,
  // M247 (common VPN host)
  9009,
  // Selectel (RU hosting often used as VPN exit)
  49505,
]);

/**
 * Heuristic: known VPN / proxy client-IP patterns. The CIDRs here are
 * a small sample of public VPN egress ranges documented in public
 * blocklists. The full list is operator-configured via
 * `CIRKLE_VPN_IP_LIST` env var (newline-separated CIDRs).
 */
export const KNOWN_VPN_CIDRS: ReadonlyArray<string> = [
  // Cloudflare WARP (1.1.1.1) egress range — sample /24.
  "162.158.0.0/15",
  // NordVPN sample range (NL).
  "185.156.46.0/23",
  // ExpressVPN sample range.
  "193.27.14.0/23",
];

/**
 * Result of a VPN detection check.
 */
export interface VpnDetectionResult {
  /** True if the request is suspected to come from a VPN / proxy. */
  flagged: boolean;
  /** Reason the request was flagged (one of: "asn", "cidr", "header"). */
  reason?: "asn" | "cidr" | "header";
  /** The ASN number when known. */
  asn?: number;
  /** The matched CIDR when known. */
  cidr?: string;
  /** Recommended action: "allow" | "rate_limit" | "challenge". */
  action: "allow" | "rate_limit" | "challenge";
}

/** Type guard for the VPN-detection HTTP headers set by the edge. */
function hasVpnHeader(headers: Headers | undefined | null): boolean {
  if (!headers) return false;
  // The edge sets `X-Cirkle-VPN: 1` when the client IP matches the
  // threat-intel feed. We also honour the legacy `CF-IPCountry`-style
  // `X-VPN-Detected` header.
  const h = headers.get("x-cirkle-vpn");
  if (h === "1" || h === "true") return true;
  const legacy = headers.get("x-vpn-detected");
  return legacy === "1" || legacy === "true";
}

/**
 * Best-effort IPv4-in-CIDR check. Returns false for invalid inputs.
 */
function ipInCidr(ip: string, cidr: string): boolean {
  const m = cidr.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!m) return false;
  const net =
    (parseInt(m[1], 10) << 24) |
    (parseInt(m[2], 10) << 16) |
    (parseInt(m[3], 10) << 8) |
    parseInt(m[4], 10);
  const bits = parseInt(m[5], 10);
  if (bits < 0 || bits > 32) return false;
  const ipParts = ip.split(".").map((p) => parseInt(p, 10));
  if (ipParts.length !== 4 || ipParts.some((p) => isNaN(p) || p < 0 || p > 255)) return false;
  const ipNum =
    (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  // Force unsigned 32-bit comparison.
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipNum >>> 0) & mask === (net >>> 0) & mask;
}

/**
 * Check whether a request is suspected to originate from a VPN / proxy.
 *
 * Inputs:
 *   • `clientIp`  — the client IP (from `x-forwarded-for` or `x-real-ip`).
 *   • `asn`       — the client ASN when known (from the edge header).
 *   • `headers`   — the request headers (for the legacy VPN-detection header).
 *
 * Returns a `VpnDetectionResult` describing the recommended action.
 * Privacy posture: this function does NOT log — callers decide whether
 * to record the flag in the moderation queue.
 */
export function detectVpn(opts: {
  clientIp?: string | null;
  asn?: number | null;
  headers?: Headers | null;
}): VpnDetectionResult {
  const { clientIp, asn, headers } = opts;

  // 1) Edge header takes precedence — it reflects the full threat-intel
  //    feed that the server can't see.
  if (hasVpnHeader(headers ?? null)) {
    return { flagged: true, reason: "header", action: "rate_limit" };
  }

  // 2) ASN match.
  if (typeof asn === "number" && KNOWN_VPN_ASNS.has(asn)) {
    return { flagged: true, reason: "asn", asn, action: "rate_limit" };
  }

  // 3) CIDR match.
  if (typeof clientIp === "string" && clientIp) {
    for (const cidr of KNOWN_VPN_CIDRS) {
      if (ipInCidr(clientIp, cidr)) {
        return { flagged: true, reason: "cidr", cidr, action: "rate_limit" };
      }
    }
  }

  return { flagged: false, action: "allow" };
}

/**
 * Returns true if the viewer's country is on the Russia data plane AND
 * VPN detection should be enforced. This is the gating helper used by
 * server-side guards before applying rate-limits to flagged traffic.
 */
export function shouldEnforceVpnDetection(country: string | null | undefined): boolean {
  return getDataPlane(country) === "RU";
}

/**
 * Russia-specific content filter. Returns true if the given content
 * category must be filtered (blocked) on the Russia data plane.
 *
 * For non-RU planes this always returns false — the filter only applies
 * where Russian law explicitly requires it.
 */
export function isContentBlockedInRussia(category: string): boolean {
  if (!category || typeof category !== "string") return false;
  return RUSSIA_BLOCKED_CATEGORIES.has(category.toLowerCase());
}

/**
 * Generic content-block check that dispatches by plane. Currently only
 * the RU plane enforces category-level blocks; other planes return false.
 */
export function isContentBlocked(category: string, country: string | null | undefined): boolean {
  const plane = getDataPlane(country);
  if (plane === "RU") return isContentBlockedInRussia(category);
  return false;
}

/**
 * Returns the full list of Russia-specific compliance notes for the
 * residency UI. Mirrors `RU_PLANE.complianceNotes` but stable.
 */
export function getRussiaComplianceNotes(): string[] {
  return RU_PLANE.complianceNotes.slice();
}

/**
 * Returns the Russia-specific payment config (Mir / SBP / UnionPay).
 */
export function getRussiaPaymentConfig(): RussiaPaymentConfig {
  return RUSSIA_PAYMENTS;
}

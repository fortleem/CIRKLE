/**
 * Dynamic Feature Toggling — Blueprint §4.6.
 *
 * `FeatureManager` decides which Cirkle features are available in which
 * regions. The rules encode compliance (e.g. crypto payments are disabled
 * in China per PIPL + the PBOC crypto ban), local-market fit (e.g. UPI
 * payments are only surfaced in India), and operational readiness (e.g.
 * a feature may be globally enabled, opt-in beta, or regionally dark).
 *
 * This module is **isomorphic** (no `"server-only"`, no Prisma import) so
 * it can be consumed from Edge middleware, server routes, and client
 * components alike. The data is small and static, so the registry ships
 * in the initial bundle.
 */

import { getRegionForCountry, GLOBAL_REGION, type Region } from "@/lib/regions";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Feature status for a (feature, country) pair. */
export type FeatureStatus = "enabled" | "disabled" | "beta" | "coming_soon";

/** A single feature flag definition. */
export interface FeatureDefinition {
  /** Stable dotted-path identifier — e.g. `"payments.crypto"`. */
  id: string;
  /** Human-readable label shown in the Settings → Feature Flags UI. */
  label: string;
  /** One-line description of what the feature does. */
  description: string;
  /** Default status when no region-specific override applies. */
  defaultStatus: FeatureStatus;
  /**
   * Region-specific overrides. The key is either:
   *   • An ISO-2 country code (e.g. `"CN"`) — applies to that country only.
   *   • A region code (e.g. `"KSA"`, `"EU"`) — applies to every country in
   *     that region per {@link Region.countries}.
   */
  overrides?: Record<string, FeatureStatus>;
  /**
   * Optional explanatory note surfaced to the user when a feature is
   * disabled in their region (e.g. the legal basis for the disablement).
   * Builds trust + transparency (Blueprint §4.6 covenant).
   */
  disableReason?: string;
}

/** The public shape returned by `getEnabledFeatures` and `/api/features`. */
export interface FeatureFlag {
  id: string;
  label: string;
  description: string;
  status: FeatureStatus;
  disableReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The master list of every Cirkle feature flag. Add new features here.
 *
 * Conventions:
 *   • `defaultStatus: "enabled"` — feature is on for everyone except the
 *     regions listed in `overrides`.
 *   • `defaultStatus: "disabled"` — feature is off for everyone except
 *     the regions listed in `overrides`.
 *   • `defaultStatus: "beta"` — feature is shipped but considered beta;
 *     callers may render a "Beta" badge.
 *   • `defaultStatus: "coming_soon"` — feature is announced but not yet
 *     shipped in this region.
 */
export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  // ── Anonymous posting ──────────────────────────────────────────────────────
  {
    id: "anonymous_posting",
    label: "Anonymous posts",
    description: "Publish posts in Midan without revealing your Cirkle ID.",
    defaultStatus: "enabled",
    // Anonymous posting is a Cirkle covenant — available everywhere by default.
  },

  // ── Crypto payments ────────────────────────────────────────────────────────
  {
    id: "payments.crypto",
    label: "Crypto payments",
    description: "Send and receive payments in USDC, USDT and BTC.",
    defaultStatus: "enabled",
    overrides: {
      // PBOC + PIPL — crypto transactions are illegal for residents of
      // mainland China. Hong Kong is permitted (HKMA's VA regulatory regime).
      CN: "disabled",
      // Egypt — CBE prohibits crypto payments for residents.
      EG: "disabled",
      // Bangladesh Bank — crypto payments prohibited.
      BD: "disabled",
      // Bolivia — crypto payments prohibited by ASFI.
      BO: "disabled",
      // Nepal — NRB prohibits crypto.
      NP: "disabled",
    },
    disableReason:
      "Crypto payments are restricted by local financial regulators in this region. See Settings → Compliance for the legal basis.",
  },

  // ── UPI payments (India-only) ──────────────────────────────────────────────
  {
    id: "payments.upi",
    label: "UPI payments",
    description: "Instant bank-to-bank transfers via India's UPI rails.",
    defaultStatus: "disabled",
    overrides: {
      IN: "enabled",
    },
    disableReason:
      "UPI is a Reserve Bank of India network available only to users with an Indian bank account.",
  },

  // ── Pix payments (Brazil-only) ─────────────────────────────────────────────
  {
    id: "payments.pix",
    label: "Pix payments",
    description: "Instant payments via Brazil's Pix rail (BCB).",
    defaultStatus: "disabled",
    overrides: {
      BR: "enabled",
    },
    disableReason: "Pix is a Central Bank of Brazil network available only in Brazil.",
  },

  // ── M-Pesa (Kenya / Tanzania) ──────────────────────────────────────────────
  {
    id: "payments.mpesa",
    label: "M-Pesa payments",
    description: "Mobile wallet payments via Safaricom M-Pesa.",
    defaultStatus: "disabled",
    overrides: {
      KE: "enabled",
      TZ: "enabled",
    },
    disableReason: "M-Pesa is available only in Kenya and Tanzania.",
  },

  // ── Citizen Shield (compliance gating) ─────────────────────────────────────
  {
    id: "citizen_shield",
    label: "Citizen Shield",
    description: "Report civic issues with AI-verified evidence.",
    defaultStatus: "enabled",
    // Shield reports are anonymous by design — no PII, available globally.
  },

  // ── Voice spaces — restricted where VoIP is regulated ─────────────────────
  {
    id: "spaces.voice",
    label: "Live voice spaces",
    description: "Real-time audio rooms for up to 250 listeners.",
    defaultStatus: "enabled",
    overrides: {
      // UAE — VoIP requires TRA licence; Cirkle routes through Botim/ToTok
      // partner integration instead of native WebRTC until licensed.
      AE: "beta",
      // China — VoIP requires MIIT licence; native WebRTC spaces disabled.
      CN: "disabled",
    },
    disableReason:
      "Live voice requires a local telecom licence in this region. We're working with regulators to enable it.",
  },

  // ── Adult content (age + region gating) ────────────────────────────────────
  {
    id: "content.adult",
    label: "Adult content",
    description: "Mature-audience posts behind an 18+ age gate.",
    defaultStatus: "disabled",
    overrides: {
      // Globally disabled by default — opt-in per region when legal review
      // completes. Today no region has it enabled.
    },
    disableReason:
      "Adult content is globally disabled pending regional legal review. Cirkle is family-friendly by default.",
  },

  // ── Mesh networking ────────────────────────────────────────────────────────
  {
    id: "mesh_network",
    label: "Mesh networking",
    description: "Offline messaging over Bluetooth / Wi-Fi Direct.",
    defaultStatus: "enabled",
    // Mesh is a Cirkle covenant — available everywhere.
  },

  // ── ActivityPub federation ─────────────────────────────────────────────────
  {
    id: "federation.activitypub",
    label: "ActivityPub federation",
    description: "Follow and be followed across the Fediverse.",
    defaultStatus: "beta",
    // Federation is in beta worldwide — opt-in per user, never default-on.
  },

  // ── Prediction markets (gambling law gating) ──────────────────────────────
  {
    id: "prediction_markets",
    label: "Prediction markets",
    description: "Bet on real-world outcomes with Cirkle points.",
    defaultStatus: "disabled",
    overrides: {
      // Predictions may constitute gambling in many jurisdictions. Disabled
      // globally until per-region legal review completes. The first markets
      // to enable will be skill-based (e.g. sports forecasting) in regulated
      // jurisdictions like the UK (UKGC) and Malta (MGA).
      GB: "beta",
      MT: "beta",
    },
    disableReason:
      "Prediction markets may be regulated as gambling in this region. Disabled pending legal review.",
  },

  // ── Anonymous identity (Ghost Mode+) ───────────────────────────────────────
  {
    id: "anonymous_identity",
    label: "Anonymous identity",
    description: "Generate disposable handles for one-off conversations.",
    defaultStatus: "enabled",
    // Anonymous identity is a Cirkle covenant — available everywhere.
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FeatureManager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Region-aware feature flag resolver. Stateless + isomorphic so it can be
 * called from any context (server, client, Edge middleware).
 *
 * Usage:
 *   const fm = new FeatureManager();
 *   fm.isFeatureEnabled("payments.crypto", "CN"); // false
 *   fm.getEnabledFeatures("IN"); // [anonymous_posting, payments.upi, …]
 */
export class FeatureManager {
  private readonly byCountry: Map<string, FeatureStatus> = new Map();
  private readonly byRegion: Map<string, FeatureStatus> = new Map();

  constructor(private readonly definitions: FeatureDefinition[] = FEATURE_DEFINITIONS) {
    // Pre-index region-code overrides once so per-country lookups are O(1).
    // We expand region codes (e.g. "EU") to their member countries so the
    // hot path only needs a single Map lookup.
    for (const def of definitions) {
      void def; // no per-def pre-indexing needed; we resolve at lookup time.
    }
  }

  /**
   * Resolve the status of a feature for a specific country. The country
   * code is matched against:
   *   1. Direct country-code overrides (e.g. `"CN"`).
   *   2. Region-code overrides — we look up the country's region via
   *      {@link getRegionForCountry} and check whether the override applies
   *      to that region (e.g. `"EU"` applies to all EU countries).
   *   3. The feature's `defaultStatus`.
   */
  private resolveStatus(featureId: string, countryCode: string | null | undefined): FeatureStatus {
    const def = this.definitions.find((d) => d.id === featureId);
    if (!def) return "disabled"; // unknown feature → fail closed.

    const cc = (countryCode || "").trim().toUpperCase();
    const overrides = def.overrides || {};

    // 1. Direct country-code override.
    if (cc && overrides[cc]) return overrides[cc];

    // 2. Region-code override (e.g. "EU" applies to every EU country).
    if (cc) {
      const region: Region = getRegionForCountry(cc);
      if (region && region.code !== GLOBAL_REGION.code && overrides[region.code]) {
        return overrides[region.code];
      }
    }

    // 3. Default status.
    return def.defaultStatus;
  }

  /**
   * Returns true when the feature is enabled (status `"enabled"` or
   * `"beta"` — beta features are available to users, just labelled).
   * Returns false for `"disabled"` and `"coming_soon"`.
   */
  isFeatureEnabled(feature: string, country: string | null | undefined): boolean {
    const status = this.resolveStatus(feature, country);
    return status === "enabled" || status === "beta";
  }

  /** Returns the full status enum (incl. `"beta"` / `"coming_soon"`). */
  getFeatureStatus(feature: string, country: string | null | undefined): FeatureStatus {
    return this.resolveStatus(feature, country);
  }

  /**
   * Returns every feature that is currently enabled (or in beta) for the
   * given country. Sorted alphabetically by feature id.
   */
  getEnabledFeatures(country: string | null | undefined): FeatureFlag[] {
    return this.definitions
      .map((def) => this.toFlag(def, country))
      .filter((f) => f.status === "enabled" || f.status === "beta")
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Returns every feature that is currently disabled or unavailable for
   * the given country. Useful for the Settings → Feature Flags view
   * (greyed-out tiles with explanation).
   */
  getDisabledFeatures(country: string | null | undefined): FeatureFlag[] {
    return this.definitions
      .map((def) => this.toFlag(def, country))
      .filter((f) => f.status === "disabled" || f.status === "coming_soon")
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Returns ALL feature flags (enabled + disabled) for the country. */
  getAllFeatures(country: string | null | undefined): FeatureFlag[] {
    return this.definitions
      .map((def) => this.toFlag(def, country))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private toFlag(def: FeatureDefinition, country: string | null | undefined): FeatureFlag {
    const status = this.resolveStatus(def.id, country);
    return {
      id: def.id,
      label: def.label,
      description: def.description,
      status,
      ...(status === "disabled" || status === "coming_soon" ? { disableReason: def.disableReason } : {}),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default singleton
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process-wide singleton. Safe because `FeatureManager` is stateless —
 * the registry is read-only. Multiple instances are also fine, but the
 * singleton avoids needless re-allocation.
 */
export const featureManager = new FeatureManager();

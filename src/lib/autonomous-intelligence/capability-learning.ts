// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Capability Learning Engine
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Continuously discovers new capabilities the platform COULD integrate:
 *   - New APIs
 *   - New AI models
 *   - New plugins
 *   - New government integrations
 *   - New payment providers
 *   - New mapping providers
 *   - New travel providers
 *
 * Each discovered capability is scored on 4 axes:
 *   - coverage              (countries / regions supported)
 *   - integrationDifficulty (0 = easy, 1 = hard)
 *   - estimatedValue        (0 = low, 1 = high)
 *   - trustScore            (0-100, provider reputation)
 *
 * Composite recommendation score:
 *   0.35 × estimatedValue
 *   0.25 × coverageBreadth
 *   0.25 × trustScore / 100
 *   0.15 × (1 - integrationDifficulty)
 *
 * Lifecycle:
 *   discovered → evaluating → approved | rejected → integrated
 *
 * The engine NEVER auto-integrates — it surfaces a ranked list of approved
 * capabilities to the platform integrator. Integration is gated by the
 * governance pipeline (TGSE, Phase 6).
 * ============================================================================
 */

import "server-only";

import type { DiscoveredCapability } from "./types";

// ── Type definitions ─────────────────────────────────────────────────────

type CapabilityType = DiscoveredCapability["type"];

interface DomainCatalog {
  domain: string;
  capabilities: Array<Omit<DiscoveredCapability, "discoveryId" | "discoveredAt" | "status">>;
}

// ── Seed catalogs (simulated discovery sources) ──────────────────────────

const SEED_CATALOGS: DomainCatalog[] = [
  {
    domain: "government",
    capabilities: [
      { capabilityId: "gov_sa_absher", type: "government_integration", description: "Absher (Saudi gov) identity + document services", provider: "Saudi MOI", coverage: ["SA"], integrationDifficulty: 0.8, estimatedValue: 0.95, trustScore: 98 },
      { capabilityId: "gov_uk_govuk", type: "government_integration", description: "GOV.UK Notify + Verify APIs", provider: "UK GDS", coverage: ["UK"], integrationDifficulty: 0.5, estimatedValue: 0.75, trustScore: 95 },
    ],
  },
  {
    domain: "payment",
    capabilities: [
      { capabilityId: "pay_mada", type: "payment_provider", description: "Mada (Saudi national debit network)", provider: "Saudi Arabian Monetary Authority", coverage: ["SA"], integrationDifficulty: 0.6, estimatedValue: 0.92, trustScore: 95 },
      { capabilityId: "pay_stripe", type: "payment_provider", description: "Stripe global payments", provider: "Stripe", coverage: ["global"], integrationDifficulty: 0.3, estimatedValue: 0.85, trustScore: 90 },
      { capabilityId: "pay_tabby", type: "payment_provider", description: "Tabby BNPL — MENA focus", provider: "Tabby", coverage: ["SA", "AE", "KW", "BH"], integrationDifficulty: 0.4, estimatedValue: 0.78, trustScore: 82 },
    ],
  },
  {
    domain: "mapping",
    capabilities: [
      { capabilityId: "map_google", type: "mapping_provider", description: "Google Maps Platform — places + directions", provider: "Google", coverage: ["global"], integrationDifficulty: 0.2, estimatedValue: 0.95, trustScore: 92 },
      { capabilityId: "map_mapbox", type: "mapping_provider", description: "Mapbox — vector tiles + geocoding", provider: "Mapbox", coverage: ["global"], integrationDifficulty: 0.35, estimatedValue: 0.82, trustScore: 85 },
      { capabilityId: "map_osm", type: "mapping_provider", description: "OpenStreetMap — open geodata", provider: "OSM Foundation", coverage: ["global"], integrationDifficulty: 0.5, estimatedValue: 0.7, trustScore: 80 },
    ],
  },
  {
    domain: "travel",
    capabilities: [
      { capabilityId: "travel_amadeus", type: "travel_provider", description: "Amadeus flights + hotels GDS", provider: "Amadeus", coverage: ["global"], integrationDifficulty: 0.7, estimatedValue: 0.95, trustScore: 92 },
      { capabilityId: "travel_sabre", type: "travel_provider", description: "Sabre GDS — flights + cars", provider: "Sabre", coverage: ["global"], integrationDifficulty: 0.7, estimatedValue: 0.9, trustScore: 90 },
      { capabilityId: "travel_booking", type: "travel_provider", description: "Booking.com affiliate API", provider: "Booking.com", coverage: ["global"], integrationDifficulty: 0.4, estimatedValue: 0.85, trustScore: 85 },
    ],
  },
  {
    domain: "ai",
    capabilities: [
      { capabilityId: "ai_claude_3_5", type: "model", description: "Anthropic Claude 3.5 Sonnet — reasoning + code", provider: "Anthropic", coverage: ["global"], integrationDifficulty: 0.25, estimatedValue: 0.92, trustScore: 92 },
      { capabilityId: "ai_llama_3_70b", type: "model", description: "Meta Llama 3 70B — open-weights", provider: "Meta", coverage: ["global"], integrationDifficulty: 0.4, estimatedValue: 0.78, trustScore: 78 },
    ],
  },
  {
    domain: "plugin",
    capabilities: [
      { capabilityId: "plugin_calendar_caldav", type: "plugin", description: "CalDAV calendar sync plugin", provider: "Community", coverage: ["global"], integrationDifficulty: 0.45, estimatedValue: 0.6, trustScore: 65 },
      { capabilityId: "plugin_zatca_invoice", type: "plugin", description: "ZATCA e-invoice compliance plugin", provider: "ZATCA", coverage: ["SA"], integrationDifficulty: 0.55, estimatedValue: 0.9, trustScore: 95 },
    ],
  },
];

// ── Capability Learning Engine ───────────────────────────────────────────

export class CapabilityLearningEngine {
  /** All discovered capabilities keyed by capabilityId. */
  private capabilities = new Map<string, DiscoveredCapability>();
  /** Domains already scanned (avoid re-discovering on every call). */
  private scannedDomains = new Set<string>();
  /** Sequence for discovery id generation. */
  private seq = 0;

  constructor() {
    // Pre-seed every catalog so capabilities are immediately available for
    // evaluate/approve/reject even before discover(domain) is explicitly
    // called. Subsequent discover() calls return only newly-added entries.
    for (const catalog of SEED_CATALOGS) {
      this.scannedDomains.add(catalog.domain);
      const now = new Date().toISOString();
      for (const cap of catalog.capabilities) {
        const entry: DiscoveredCapability = {
          ...cap,
          discoveryId: `dc_${this.seq++}_${cap.capabilityId}`,
          discoveredAt: now,
          status: "discovered",
        };
        this.capabilities.set(cap.capabilityId, entry);
      }
    }
  }

  /**
   * Discover new capabilities in a domain. Returns the list of newly
   * discovered capabilities (existing ones are skipped). Idempotent —
   * subsequent calls for the same domain return [] unless the catalog has
   * been extended at runtime via registerCapability.
   */
  async discover(domain: string): Promise<DiscoveredCapability[]> {
    try {
      const catalog = SEED_CATALOGS.find((c) => c.domain === domain);
      if (!catalog || this.scannedDomains.has(domain)) return [];
      this.scannedDomains.add(domain);
      const discovered: DiscoveredCapability[] = [];
      const now = new Date().toISOString();
      for (const cap of catalog.capabilities) {
        if (this.capabilities.has(cap.capabilityId)) continue;
        const entry: DiscoveredCapability = {
          ...cap,
          discoveryId: `dc_${this.seq++}_${cap.capabilityId}`,
          discoveredAt: now,
          status: "discovered",
        };
        this.capabilities.set(cap.capabilityId, entry);
        discovered.push(entry);
      }
      return discovered;
    } catch {
      return [];
    }
  }

  /**
   * Evaluate a discovered capability — re-score it and flip its status to
   * "evaluating". Returns the updated entry or null if not found.
   */
  async evaluate(capabilityId: string): Promise<DiscoveredCapability | null> {
    try {
      const cap = this.capabilities.get(capabilityId);
      if (!cap) return null;
      cap.status = "evaluating";
      // Re-score (in production this would query the provider's live docs).
      const score = this.score(cap);
      cap.estimatedValue = Math.max(cap.estimatedValue, Math.min(1, score + 0.05));
      this.capabilities.set(capabilityId, cap);
      return cap;
    } catch {
      return null;
    }
  }

  /**
   * Approve a capability for integration. Only capabilities whose composite
   * score crosses the threshold (≥0.6) can be approved; otherwise the call
   * is a no-op (returns the unchanged entry). Approved capabilities are
   * eligible for the integrator to pick up.
   */
  async approve(capabilityId: string): Promise<DiscoveredCapability | null> {
    try {
      const cap = this.capabilities.get(capabilityId);
      if (!cap) return null;
      const score = this.score(cap);
      if (score < 0.6) return cap;
      cap.status = "approved";
      this.capabilities.set(capabilityId, cap);
      return cap;
    } catch {
      return null;
    }
  }

  /**
   * Reject a capability — marks it as rejected so it won't be re-evaluated.
   */
  async reject(capabilityId: string): Promise<DiscoveredCapability | null> {
    try {
      const cap = this.capabilities.get(capabilityId);
      if (!cap) return null;
      cap.status = "rejected";
      this.capabilities.set(capabilityId, cap);
      return cap;
    } catch {
      return null;
    }
  }

  /** All discovered capabilities, optionally filtered by type. */
  getDiscovered(type?: CapabilityType): DiscoveredCapability[] {
    try {
      const all = Array.from(this.capabilities.values());
      return type ? all.filter((c) => c.type === type) : all;
    } catch {
      return [];
    }
  }

  /**
   * Return capabilities that are approved (or already integrated) and
   * therefore integratable — sorted by composite score (highest first).
   */
  getIntegratable(limit = 50): DiscoveredCapability[] {
    try {
      return Array.from(this.capabilities.values())
        .filter((c) => c.status === "approved" || c.status === "integrated")
        .sort((a, b) => this.score(b) - this.score(a))
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  /** Stats for the learning orchestrator. */
  stats(): {
    total: number;
    discovered: number;
    evaluating: number;
    approved: number;
    rejected: number;
    integrated: number;
    domainsScanned: number;
  } {
    try {
      let discovered = 0, evaluating = 0, approved = 0, rejected = 0, integrated = 0;
      for (const c of this.capabilities.values()) {
        if (c.status === "discovered") discovered++;
        else if (c.status === "evaluating") evaluating++;
        else if (c.status === "approved") approved++;
        else if (c.status === "rejected") rejected++;
        else if (c.status === "integrated") integrated++;
      }
      return {
        total: this.capabilities.size,
        discovered, evaluating, approved, rejected, integrated,
        domainsScanned: this.scannedDomains.size,
      };
    } catch {
      return {
        total: 0, discovered: 0, evaluating: 0, approved: 0, rejected: 0, integrated: 0,
        domainsScanned: 0,
      };
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  /**
   * Composite recommendation score in [0, 1].
   */
  score(cap: DiscoveredCapability): number {
    try {
      const coverageBreadth = Math.min(1, cap.coverage.length / 5); // 5+ regions = max
      return (
        0.35 * cap.estimatedValue +
        0.25 * coverageBreadth +
        0.25 * (cap.trustScore / 100) +
        0.15 * (1 - cap.integrationDifficulty)
      );
    } catch {
      return 0;
    }
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalCapabilityLearningEngine = new CapabilityLearningEngine();

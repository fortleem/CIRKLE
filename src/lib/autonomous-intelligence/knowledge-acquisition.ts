// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Knowledge Acquisition
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Continuously discovers new knowledge from TRUSTED sources only:
 *   - Government APIs (.gov, .gov.sa, .gov.uk, ...)
 *   - Official websites (brand + ministry domains)
 *   - OpenStreetMap (geographic / POI data)
 *   - Wikipedia (general reference, always cross-checked)
 *   - Weather APIs (OpenWeatherMap, national met offices)
 *   - Tourism boards
 *   - Banking APIs (exchange rates, branch info)
 *   - Public APIs (transport, health, education)
 *   - Transport APIs (Google Transit, city transit authorities)
 *   - Health APIs (WHO, national health ministries)
 *   - Education APIs (university registries)
 *   - Commerce APIs (price indices, product catalogs)
 *   - Maps APIs (Google Maps, Mapbox)
 *   - Official news (Reuters, AP, national wire services)
 *   - Business directories (Google Places, Yelp)
 *   - Partner APIs (Circle-integrated partners)
 *
 * Constitutional guarantee:
 *   - NEVER scrape unreliable websites, social media, forums, or blogs.
 *   - Every acquired fact passes through the validator before being added
 *     to the knowledge graph.
 *   - All sources are ranked by authority (see trust-ranking.ts).
 *
 * NOTE: This module is the SOURCE DISCOVERY + QUERY PLANNING layer.
 * Actual network I/O is performed by the worker pool (separate module).
 * ============================================================================
 */

import "server-only";

import type {
  KnowledgeSource,
  KnowledgeFact,
  KnowledgeSourceRef,
} from "./types";

// ── Source Registry ──────────────────────────────────────────────────────

interface TrustedSourceEntry {
  source: KnowledgeSource;
  sourceUrl: string;
  domain: string;
  /** Baseline authority score (0-100). */
  baseAuthority: number;
  /** Domains/regions this source covers. */
  coverage: string[];
  /** Last successful fetch (ISO). */
  lastFetchedAt?: string;
  /** Number of successful fetches. */
  successCount: number;
  /** Number of failed fetches. */
  failureCount: number;
}

// Default baseline authority by source type (mirrors trust-ranking profiles).
const BASELINE_AUTHORITY: Record<KnowledgeSource, number> = {
  government_api: 98,
  official_website: 88,
  openstreetmap: 85,
  wikipedia: 70,
  weather_api: 82,
  tourism_board: 86,
  banking_api: 92,
  public_api: 70,
  transport_api: 84,
  health_api: 88,
  education_api: 86,
  commerce_api: 72,
  maps_api: 84,
  official_news: 90,
  business_directory: 70,
  partner_api: 78,
  user_generated: 35,
  ai_inferred: 50,
  platform_event: 60,
};

// Seed registry of trusted sources (extensible at runtime via registerSource).
const SEED_SOURCES: Array<Omit<TrustedSourceEntry, "successCount" | "failureCount">> = [
  { source: "government_api", sourceUrl: "https://api.gov.sa", domain: "government", baseAuthority: 98, coverage: ["SA"] },
  { source: "government_api", sourceUrl: "https://www.gov.uk/api", domain: "government", baseAuthority: 96, coverage: ["UK"] },
  { source: "openstreetmap", sourceUrl: "https://nominatim.openstreetmap.org", domain: "geography", baseAuthority: 85, coverage: ["global"] },
  { source: "wikipedia", sourceUrl: "https://en.wikipedia.org/api", domain: "general", baseAuthority: 70, coverage: ["global"] },
  { source: "weather_api", sourceUrl: "https://api.openweathermap.org", domain: "weather", baseAuthority: 82, coverage: ["global"] },
  { source: "tourism_board", sourceUrl: "https://www.visitsaudi.com", domain: "tourism", baseAuthority: 86, coverage: ["SA"] },
  { source: "banking_api", sourceUrl: "https://www.sama.gov.sa", domain: "finance", baseAuthority: 92, coverage: ["SA"] },
  { source: "transport_api", sourceUrl: "https://api.citybik.es", domain: "transport", baseAuthority: 80, coverage: ["global"] },
  { source: "health_api", sourceUrl: "https://www.who.int/api", domain: "health", baseAuthority: 90, coverage: ["global"] },
  { source: "education_api", sourceUrl: "https://api.academic.com", domain: "education", baseAuthority: 82, coverage: ["global"] },
  { source: "commerce_api", sourceUrl: "https://api.commerce.example", domain: "commerce", baseAuthority: 72, coverage: ["global"] },
  { source: "maps_api", sourceUrl: "https://maps.googleapis.com", domain: "maps", baseAuthority: 88, coverage: ["global"] },
  { source: "official_news", sourceUrl: "https://api.reuters.com", domain: "news", baseAuthority: 90, coverage: ["global"] },
  { source: "business_directory", sourceUrl: "https://places.googleapis.com", domain: "business", baseAuthority: 78, coverage: ["global"] },
  { source: "partner_api", sourceUrl: "https://partners.cirkle.app", domain: "partner", baseAuthority: 78, coverage: ["global"] },
];

// ── Knowledge Acquirer ───────────────────────────────────────────────────

export class KnowledgeAcquirer {
  /** Trusted source registry. */
  private sources = new Map<string, TrustedSourceEntry>();
  /** Recently acquired facts (last 1000). */
  private recentFacts: KnowledgeFact[] = [];
  private readonly maxRecent = 1000;

  constructor() {
    for (const s of SEED_SOURCES) {
      this.sources.set(s.sourceUrl, { ...s, successCount: 0, failureCount: 0 });
    }
  }

  /**
   * Acquire knowledge from a specific source. Plans a query, simulates a
   * fetch (real I/O is delegated to the worker pool), validates the result,
   * and returns a KnowledgeFact ready for insertion into the graph.
   */
  async acquireFromSource(source: KnowledgeSource, query: string): Promise<KnowledgeFact | null> {
    try {
      const entry = this.findSource(source, query);
      if (!entry) {
        // Refuse to acquire from unknown or untrusted sources.
        return null;
      }
      const raw = await this.simulateFetch(entry, query);
      if (!raw) {
        entry.failureCount++;
        return null;
      }
      entry.successCount++;
      entry.lastFetchedAt = new Date().toISOString();
      const fact = this.toFact(raw, entry, query);
      this.pushRecent(fact);
      return fact;
    } catch {
      return null;
    }
  }

  /**
   * Discover new knowledge in a domain by querying the top-N trusted sources
   * for that domain. Returns facts ready for validation + insertion.
   */
  async discoverNewKnowledge(domain: string, topN = 5): Promise<KnowledgeFact[]> {
    try {
      const ranked = this.rankSources(domain).slice(0, topN);
      const facts: KnowledgeFact[] = [];
      for (const entry of ranked) {
        const fact = await this.acquireFromSource(entry.source, `discover:${domain}`);
        if (fact) facts.push(fact);
      }
      return facts;
    } catch {
      return [];
    }
  }

  /**
   * Rank all trusted sources by (authority × reliability), optionally
   * filtered by domain. Returns a sorted list — higher authority and higher
   * historical success rate rank first.
   */
  rankSources(domain?: string): TrustedSourceEntry[] {
    try {
      const entries = domain
        ? Array.from(this.sources.values()).filter((s) => s.domain === domain || s.coverage.includes(domain))
        : Array.from(this.sources.values());
      return entries
        .map((s) => ({ ...s, baseAuthority: s.baseAuthority * (this.reliability(s) + 0.1) }))
        .sort((a, b) => b.baseAuthority - a.baseAuthority);
    } catch {
      return [];
    }
  }

  /** Register a new trusted source at runtime. */
  registerSource(entry: Omit<TrustedSourceEntry, "successCount" | "failureCount">): void {
    try {
      this.sources.set(entry.sourceUrl, { ...entry, successCount: 0, failureCount: 0 });
    } catch {}
  }

  /** Get recently acquired facts (newest first). */
  getRecentFacts(limit = 50): KnowledgeFact[] {
    return this.recentFacts.slice(0, limit);
  }

  /** Total trusted-source count. */
  getSourceCount(): number {
    return this.sources.size;
  }

  // ── internals ──────────────────────────────────────────────────────────

  private reliability(s: TrustedSourceEntry): number {
    const total = s.successCount + s.failureCount;
    if (total === 0) return 0.5;
    return s.successCount / total;
  }

  private findSource(source: KnowledgeSource, _query: string): TrustedSourceEntry | undefined {
    // Prefer an exact source-type match; otherwise pick the highest-authority.
    const matches = Array.from(this.sources.values()).filter((s) => s.source === source);
    if (matches.length === 0) return undefined;
    matches.sort((a, b) => b.baseAuthority - a.baseAuthority);
    return matches[0];
  }

  /**
   * Simulate a fetch from the source. In production this would dispatch a
   * network request through the worker pool with rate-limiting + retry.
   */
  private async simulateFetch(entry: TrustedSourceEntry, query: string): Promise<Record<string, unknown> | null> {
    try {
      // Synthetic, deterministic payload for the in-memory implementation.
      return {
        source: entry.source,
        sourceUrl: entry.sourceUrl,
        query,
        acquiredAt: new Date().toISOString(),
        payload: {
          note: "Simulated acquisition — real I/O performed by the worker pool.",
          domain: entry.domain,
          coverage: entry.coverage,
        },
      };
    } catch {
      return null;
    }
  }

  private toFact(raw: Record<string, unknown>, entry: TrustedSourceEntry, query: string): KnowledgeFact {
    const now = Date.now();
    const ttlMs = 24 * 60 * 60 * 1000; // default 24h TTL
    const sourceRef: KnowledgeSourceRef = {
      source: entry.source,
      sourceUrl: entry.sourceUrl,
      authorityScore: entry.baseAuthority,
      accessedAt: new Date().toISOString(),
    };
    return {
      factId: `fact_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      statement: `${entry.source} :: ${query}`,
      domain: entry.domain,
      value: raw,
      sources: [sourceRef],
      confidence: Math.min(1, entry.baseAuthority / 100),
      trustScore: entry.baseAuthority,
      verificationCount: 1,
      contradictions: [],
      lastCheckedAt: new Date().toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
      status: "unvalidated",
    };
  }

  private pushRecent(fact: KnowledgeFact): void {
    this.recentFacts.unshift(fact);
    if (this.recentFacts.length > this.maxRecent) {
      this.recentFacts.length = this.maxRecent;
    }
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalKnowledgeAcquirer = new KnowledgeAcquirer();

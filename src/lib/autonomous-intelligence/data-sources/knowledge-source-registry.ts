// @ts-nocheck
/**
 * CIRKLE Brain AI — Knowledge Source Registry
 * ============================================================================
 *
 * Phase 7.5 AIKE — Central registry that connects all 136 external data sources
 * to the AIKE knowledge acquisition, trust ranking, validation, and research
 * scheduling subsystems.
 *
 * This registry is the bridge between the static data-source configurations
 * (data-sources/*.ts) and the runtime AIKE engine. It:
 *   1. Registers all sources with their trust scores
 *   2. Provides source selection by domain/capability/coverage
 *   3. Feeds trust scores into the AIKE TrustRanker
 *   4. Routes research tasks to the appropriate sources
 *   5. Tracks which sources are actually available (API keys present)
 *
 * Import convention:
 *   import { globalKnowledgeSourceRegistry } from "@/lib/autonomous-intelligence/data-sources/knowledge-source-registry";
 * ============================================================================
 */

import "server-only";

import { ALL_DATA_SOURCES, getSourcesByCapability, getSourcesByCoverage, getRegistryStats, type DataSourceConfig } from "./index";

export interface RegisteredSource extends DataSourceConfig {
  /** Whether this source is currently available (API key present, if required). */
  available: boolean;
  /** Last time this source was queried. */
  lastQueriedAt?: string;
  /** Total queries made to this source. */
  totalQueries: number;
  /** Successful queries. */
  successfulQueries: number;
  /** Failed queries. */
  failedQueries: number;
  /** Average response time (ms). */
  avgResponseMs: number;
}

export interface SourceSelectionCriteria {
  /** The domain to find sources for (e.g., "travel", "weather", "government"). */
  domain?: string;
  /** Required capabilities. */
  capabilities?: string[];
  /** Required coverage (country code or "global"). */
  coverage?: string;
  /** Minimum trust score (0-100). */
  minTrustScore?: number;
  /** Only free sources (no API key required). */
  freeOnly?: boolean;
  /** Only sources that don't require an API key. */
  noApiKeyRequired?: boolean;
  /** Maximum number of sources to return. */
  limit?: number;
}

/**
 * Knowledge Source Registry — the central source-of-truth for all external
 * data sources the Brain can learn from.
 */
export class KnowledgeSourceRegistry {
  private sources: Map<string, RegisteredSource> = new Map();
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /** Initialize the registry with all 136 data sources. */
  private initialize(): void {
    if (this.initialized) return;
    for (const source of ALL_DATA_SOURCES) {
      this.sources.set(source.id, {
        ...source,
        available: this.checkAvailability(source),
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        avgResponseMs: 0,
      });
    }
    this.initialized = true;
  }

  /** Check if a source is available (API key present if required). */
  private checkAvailability(source: DataSourceConfig): boolean {
    if (!source.requiresApiKey) return true;
    // Check if the corresponding env var exists
    const envVarMap: Record<string, string> = {
      iata: "IATA_API_KEY",
      openai_moderation: "OPENAI_API_KEY",
      jigsaw: "JIGSAW_API_KEY",
      eventbrite: "EVENTBRITE_API_KEY",
      meetup: "MEETUP_API_KEY",
      openagenda: "OPENAGENDA_API_KEY",
      ecmwf: "ECMWF_API_KEY",
      nasa_earth_data: "NASA_API_KEY",
      openrouteservice: "OPENROUTESERVICE_API_KEY",
      opencorporates: "OPENCORPORATES_API_KEY",
      openmenu: "OPENMENU_API_KEY",
      geonames: "GEONAMES_USERNAME",
      github: "GITHUB_TOKEN",
      gitlab: "GITLAB_TOKEN",
      huggingface_hub: "HUGGINGFACE_API_KEY",
    };
    const envVar = envVarMap[source.id];
    if (!envVar) return true; // Unknown key requirement — assume available
    return !!process.env[envVar];
  }

  /** Get all registered sources. */
  getAllSources(): RegisteredSource[] {
    return Array.from(this.sources.values());
  }

  /** Get a source by id. */
  getSource(sourceId: string): RegisteredSource | undefined {
    return this.sources.get(sourceId);
  }

  /** Select sources matching the given criteria, sorted by trust score. */
  selectSources(criteria: SourceSelectionCriteria): RegisteredSource[] {
    let candidates = this.getAllSources();

    if (criteria.domain) {
      candidates = candidates.filter((s) =>
        s.capabilities.some((c) => c.includes(criteria.domain!)) ||
        s.id.includes(criteria.domain!) ||
        s.name.toLowerCase().includes(criteria.domain!.toLowerCase()),
      );
    }

    if (criteria.capabilities && criteria.capabilities.length > 0) {
      candidates = candidates.filter((s) =>
        criteria.capabilities!.every((cap) => s.capabilities.includes(cap)),
      );
    }

    if (criteria.coverage) {
      candidates = candidates.filter(
        (s) =>
          s.coverage.includes("global") ||
          s.coverage.includes(criteria.coverage!.toUpperCase()) ||
          s.coverage.includes(criteria.coverage!.toLowerCase()),
      );
    }

    if (criteria.minTrustScore !== undefined) {
      candidates = candidates.filter((s) => s.trustScore >= criteria.minTrustScore!);
    }

    if (criteria.freeOnly) {
      candidates = candidates.filter((s) => s.free);
    }

    if (criteria.noApiKeyRequired) {
      candidates = candidates.filter((s) => !s.requiresApiKey);
    }

    // Sort by trust score (highest first), then by availability (available first)
    candidates.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return b.trustScore - a.trustScore;
    });

    if (criteria.limit) {
      candidates = candidates.slice(0, criteria.limit);
    }

    return candidates;
  }

  /** Get the top sources for a given domain. */
  getTopSourcesForDomain(domain: string, limit: number = 5): RegisteredSource[] {
    return this.selectSources({ domain, limit, noApiKeyRequired: false });
  }

  /** Get sources that can provide a specific capability. */
  getSourcesForCapability(capability: string, limit?: number): RegisteredSource[] {
    return this.selectSources({ capabilities: [capability], limit });
  }

  /** Record a query result for a source (for tracking reliability). */
  recordQuery(sourceId: string, success: boolean, responseMs: number): void {
    const source = this.sources.get(sourceId);
    if (!source) return;
    source.totalQueries++;
    source.lastQueriedAt = new Date().toISOString();
    if (success) {
      source.successfulQueries++;
    } else {
      source.failedQueries++;
    }
    // Update rolling average response time
    const totalTime = source.avgResponseMs * (source.totalQueries - 1) + responseMs;
    source.avgResponseMs = Math.round(totalTime / source.totalQueries);
    // Update availability based on recent failures
    if (source.totalQueries > 10 && source.successfulQueries / source.totalQueries < 0.3) {
      source.available = false;
    }
  }

  /** Get the reliability score (0-1) for a source. */
  getReliabilityScore(sourceId: string): number {
    const source = this.sources.get(sourceId);
    if (!source || source.totalQueries === 0) return 0.5; // unknown — neutral
    return source.successfulQueries / source.totalQueries;
  }

  /** Get registry statistics. */
  getStats(): {
    totalSources: number;
    availableSources: number;
    unavailableSources: number;
    totalQueries: number;
    successRate: number;
    avgTrustScore: number;
    byCategory: Record<string, number>;
    topSources: Array<{ id: string; name: string; trustScore: number; queries: number; successRate: number }>;
  } {
    const all = this.getAllSources();
    const totalQueries = all.reduce((sum, s) => sum + s.totalQueries, 0);
    const successfulQueries = all.reduce((sum, s) => sum + s.successfulQueries, 0);

    const byCategory: Record<string, number> = {};
    for (const s of all) {
      byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    }

    const topSources = all
      .filter((s) => s.totalQueries > 0)
      .sort((a, b) => b.totalQueries - a.totalQueries)
      .slice(0, 10)
      .map((s) => ({
        id: s.id,
        name: s.name,
        trustScore: s.trustScore,
        queries: s.totalQueries,
        successRate: s.totalQueries > 0 ? s.successfulQueries / s.totalQueries : 0,
      }));

    return {
      totalSources: all.length,
      availableSources: all.filter((s) => s.available).length,
      unavailableSources: all.filter((s) => !s.available).length,
      totalQueries,
      successRate: totalQueries > 0 ? successfulQueries / totalQueries : 0,
      avgTrustScore: Math.round(all.reduce((sum, s) => sum + s.trustScore, 0) / all.length),
      byCategory,
      topSources,
    };
  }

  /** Export all source trust scores for integration with AIKE TrustRanker. */
  exportTrustScores(): Array<{ sourceId: string; trustScore: number; reliability: number; combinedScore: number }> {
    return this.getAllSources().map((s) => {
      const reliability = this.getReliabilityScore(s.id);
      // Combined score: 70% trust + 30% observed reliability
      const combinedScore = s.trustScore * 0.7 + reliability * 100 * 0.3;
      return {
        sourceId: s.id,
        trustScore: s.trustScore,
        reliability,
        combinedScore: Math.round(combinedScore),
      };
    });
  }
}

/** Global singleton — the single source of truth for all external data sources. */
export const globalKnowledgeSourceRegistry = new KnowledgeSourceRegistry();

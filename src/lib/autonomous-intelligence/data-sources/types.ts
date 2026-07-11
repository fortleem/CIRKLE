// @ts-nocheck
import "server-only";

/**
 * AIKE Data Source Registry — Shared Types
 * ============================================================================
 *
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * This file defines the `DataSourceConfig` shape used by every domain-specific
 * data source registry under `src/lib/autonomous-intelligence/data-sources/`.
 *
 * Each `DataSourceConfig` describes an EXTERNAL source of truth that the Brain
 * can consult to acquire, validate, or refresh knowledge. Sources are sorted by
 * trust: government > official > community > commercial. The Brain's
 * Knowledge Validator (`knowledge-validator.ts`) and Research Scheduler
 * (`research-scheduler.ts`) consume these configs to decide which sources to
 * query for a given knowledge gap and how to weight the answers.
 *
 * Constitutional rules:
 *   - Every source MUST declare a `trustScore` so the validator can fuse facts
 *     from multiple sources with weighted confidence.
 *   - Every source MUST declare `requiresApiKey` and `free` so the Brain can
 *     respect rate limits, billing caps, and procurement gates.
 *   - Sources that require API keys MUST NOT be queried until the key is
 *     provisioned by the operator — there is NO implicit key fallback.
 *   - All configs are server-only. They are NEVER shipped to the client.
 * ============================================================================
 */

/**
 * The category of a data source. Mirrors the `KnowledgeSource` union from
 * `src/lib/autonomous-intelligence/types.ts` (excluding the three platform-
 * internal categories `user_generated`, `ai_inferred`, `platform_event` which
 * are not external data sources).
 */
export type DataSourceCategory =
  | "government_api"
  | "official_website"
  | "openstreetmap"
  | "wikipedia"
  | "weather_api"
  | "tourism_board"
  | "banking_api"
  | "public_api"
  | "transport_api"
  | "health_api"
  | "education_api"
  | "commerce_api"
  | "maps_api"
  | "official_news"
  | "business_directory"
  | "partner_api";

/** On-the-wire format of the source's primary payload. */
export type DataSourceFormat =
  | "json"
  | "xml"
  | "csv"
  | "sql"
  | "parquet"
  | "dump"
  | "rdf"
  | "geojson"
  | "protobuf";

/** How often the source refreshes its data (best-effort). */
export type DataSourceFrequency =
  | "realtime"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "on_demand";

/** How the Brain ingests data from this source. */
export type DataSourceIntegrationMethod =
  | "api_call"
  | "dump_download"
  | "stream"
  | "webhook"
  | "federation";

/**
 * A single external data source that the AIKE Brain can consult.
 *
 * Fields are deliberately flat so the registry can be serialized, indexed,
 * and diffed across releases without nested traversal.
 */
export interface DataSourceConfig {
  /** Unique source id (stable across releases; kebab-case). */
  id: string;
  /** Human-readable source name. */
  name: string;
  /** Category — matches the `KnowledgeSource` union from `types.ts`. */
  category: DataSourceCategory;
  /** What this source provides, in one sentence. */
  description: string;
  /** Download / API / docs URLs. Any subset may be present. */
  urls: { download?: string; api?: string; docs?: string };
  /**
   * Trust score 0-100 (higher = more authoritative).
   *
   * Heuristic:
   *   - Government / IGO        : 90-95
   *   - Official / institutional: 80-90
   *   - Community-curated       : 70-85
   *   - Commercial              : 60-80
   */
  trustScore: number;
  /** Primary data format the Brain should expect to parse. */
  format: DataSourceFormat;
  /** How often the source refreshes its data. */
  updateFrequency: DataSourceFrequency;
  /** How the Brain ingests this source. */
  integrationMethod: DataSourceIntegrationMethod;
  /** What the Brain can learn from this source (capability tags). */
  capabilities: string[];
  /** Coverage — ISO country codes, region names, or ["global"]. */
  coverage: string[];
  /** Whether this source requires an API key / bearer token. */
  requiresApiKey: boolean;
  /** Whether this source is free (no per-call billing). */
  free: boolean;
  /** Rate limit (requests per minute). Optional. */
  rateLimitPerMin?: number;
}

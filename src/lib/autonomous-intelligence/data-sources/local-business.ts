// @ts-nocheck
import "server-only";

/**
 * Local Business Intelligence Sources
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * Business-registry and local-commerce data feeds for the Brain's business
 * knowledge graph: legal entities, registered addresses, sectors, schemas,
 * and contact metadata. Feeds the `business_openings` World State metric
 * and the business node type. These sources give the Brain verified
 * "does this business legally exist?" answers; subjective reputation data
 * is owned by LIEE feedback, not this registry.
 *
 * Trust heuristic: government registries (85), official schema (80),
 * commercial directories (60).
 */
import type { DataSourceConfig } from "./types";

/** OpenCorporates — aggregates official company registries from 140+ jurisdictions. */
export const openCorporates: DataSourceConfig = {
  id: "opencorporates",
  name: "OpenCorporates Company Register",
  category: "business_directory",
  description:
    "Aggregates official company registries from 140+ jurisdictions into a normalised, queryable graph of legal entities, officers, and filings.",
  urls: { api: "https://api.opencorporates.com", docs: "https://api.opencorporates.com/documentation/API-Reference" },
  trustScore: 85,
  format: "json",
  updateFrequency: "daily",
  integrationMethod: "api_call",
  capabilities: ["legal_entity_lookup", "officer_directors", "corporate_ownership_graph", "registered_addresses", "filings_history", "industry_codes"],
  coverage: ["global"],
  requiresApiKey: true,
  free: true,
  rateLimitPerMin: 500,
};

/** Google public business schemas — structured LocalBusiness schemas (hours, prices, categories). */
export const googleBusinessSchemas: DataSourceConfig = {
  id: "google-public-business-schemas",
  name: "Google Public Business Schemas",
  category: "commerce_api",
  description:
    "Structured LocalBusiness schemas surfaced through Google Business Profile — opening hours, price ranges, and category taxonomy. Reviews excluded by policy.",
  urls: { api: "https://schema.org/LocalBusiness", docs: "https://developers.google.com/maps/documentation/business" },
  trustScore: 80,
  format: "json",
  updateFrequency: "weekly",
  integrationMethod: "api_call",
  capabilities: ["business_opening_hours", "price_ranges", "category_taxonomy", "service_areas", "geocoded_addresses", "phone_website_contacts"],
  coverage: ["global"],
  requiresApiKey: true,
  free: false,
  rateLimitPerMin: 60,
};

/** Yellow Pages dumps — periodic CSV/SQL exports from regional Yellow Pages publishers. */
export const yellowPagesDumps: DataSourceConfig = {
  id: "yellow-pages-dumps",
  name: "Yellow Pages Business Dumps",
  category: "business_directory",
  description:
    "Periodic CSV/SQL exports from regional Yellow Pages publishers — tertiary signal for markets lacking an open business registry.",
  urls: { download: "https://www.yellowpages.com", docs: "https://www.yellowpages.com/products/business-listings" },
  trustScore: 60,
  format: "csv",
  updateFrequency: "quarterly",
  integrationMethod: "dump_download",
  capabilities: ["business_listings", "phone_numbers", "category_codes", "address_normalization", "regional_coverage"],
  coverage: ["US", "EU", "MENA"],
  requiresApiKey: false,
  free: false,
};

/** National business registries — per-country official company / commercial registries. */
export const businessRegistries: DataSourceConfig = {
  id: "national-business-registries",
  name: "National Business Registries (per country)",
  category: "government_api",
  description:
    "Official per-country company and commercial registries (Companies House UK, Reg Imprese IT, SIRENE FR, UAE Trade License, KSA Maroof, etc.).",
  urls: { api: "https://www.gov.uk/government/organisations/companies-house", docs: "https://developer.company-information.service.gov.uk/" },
  trustScore: 85,
  format: "json",
  updateFrequency: "weekly",
  integrationMethod: "api_call",
  capabilities: ["legal_entity_verification", "registration_numbers", "registered_offices", "industry_classification", "company_status_active_dissolved", "annual_filings"],
  coverage: ["global"],
  requiresApiKey: true,
  free: true,
  rateLimitPerMin: 60,
};

/** All local-business sources, in descending trust order. */
export const localBusinessSources: DataSourceConfig[] = [
  openCorporates, businessRegistries, googleBusinessSchemas, yellowPagesDumps,
];

export default localBusinessSources;

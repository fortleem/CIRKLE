// @ts-nocheck
import "server-only";

/**
 * Government Open-Data Sources — Phase 7.5 AIKE
 * ============================================================================
 * Official national & supranational open-data portals. These are the Brain's
 * highest-trust sources for population statistics, public infrastructure,
 * health & education indicators, regulatory frameworks, transportation
 * networks, and civic services. Every government that publishes an open-data
 * catalogue is registered here; the 246 countries enumerated in
 * `src/lib/countries.ts` are mirrored as a single bulk source so the Brain
 * can locate a country's portal without an out-of-band lookup.
 *
 * Backs the AIKE Civic Intelligence module and the Knowledge Validator's
 * government-fact fusion path (statistical claims always defer to the
 * relevant national portal). Trust heuristic: government / IGO = 90-95.
 */
import type { DataSourceConfig } from "./types";

/** USA data.gov — federal open-data catalogue spanning every U.S. agency. */
export const dataGovUS: DataSourceConfig = {
  id: "data-gov-us", name: "USA data.gov", category: "government_api",
  description: "United States federal open-data catalogue — datasets from every cabinet-level agency and independent commission (Census, BLS, NOAA, DOT, HHS, DOE) covering population, infrastructure, health, education, crime, and transportation.",
  urls: { api: "https://data.gov", docs: "https://data.gov/developers/" },
  trustScore: 95, format: "json", updateFrequency: "daily", integrationMethod: "api_call",
  capabilities: ["government-statistics", "demographic-data", "public-services", "regulatory-compliance", "civic-intelligence"],
  coverage: ["US"], requiresApiKey: false, free: true, rateLimitPerMin: 60,
};

/** EU data.europa.eu — pan-European open-data portal aggregating all 27 member states + institutions. */
export const dataEuropaEU: DataSourceConfig = {
  id: "data-europa-eu", name: "EU data.europa.eu", category: "government_api",
  description: "Pan-European open-data portal aggregating catalogues from the 27 EU member states plus EU institutions (Eurostat, ECB, EEA, JRC) — single access point for cross-border statistical, regulatory, and infrastructure datasets.",
  urls: { api: "https://data.europa.eu", docs: "https://data.europa.eu/en/about-us" },
  trustScore: 95, format: "json", updateFrequency: "daily", integrationMethod: "api_call",
  capabilities: ["government-statistics", "demographic-data", "public-services", "regulatory-compliance", "civic-intelligence"],
  coverage: ["EU"], requiresApiKey: false, free: true, rateLimitPerMin: 60,
};

/** UK data.gov.uk — United Kingdom national open-data portal. */
export const dataGovUK: DataSourceConfig = {
  id: "data-gov-uk", name: "UK data.gov.uk", category: "government_api",
  description: "United Kingdom open-data portal — ONS statistics, Ordnance Survey open products, NHS health indicators, Department for Transport networks, HM Treasury fiscal data, all under the Open Government Licence.",
  urls: { api: "https://data.gov.uk", docs: "https://www.gov.uk/government/statistics" },
  trustScore: 95, format: "json", updateFrequency: "daily", integrationMethod: "api_call",
  capabilities: ["government-statistics", "demographic-data", "public-services", "regulatory-compliance", "civic-intelligence"],
  coverage: ["GB"], requiresApiKey: false, free: true, rateLimitPerMin: 60,
};

/** Egypt data.gov.eg — Arab Republic of Egypt national open-data portal. */
export const dataGovEG: DataSourceConfig = {
  id: "data-gov-eg", name: "Egypt data.gov.eg", category: "government_api",
  description: "Arab Republic of Egypt national open-data portal — CAPMAS statistics, road and transport networks, health and education indicators, and ministry-level datasets covering all governorates.",
  urls: { api: "https://data.gov.eg", docs: "https://data.gov.eg" },
  trustScore: 90, format: "json", updateFrequency: "daily", integrationMethod: "api_call",
  capabilities: ["government-statistics", "demographic-data", "public-services", "regulatory-compliance", "civic-intelligence"],
  coverage: ["EG"], requiresApiKey: false, free: true, rateLimitPerMin: 60,
};

/** Saudi Arabia data.gov.sa — Kingdom of Saudi Arabia national open-data portal. */
export const dataGovSA: DataSourceConfig = {
  id: "data-gov-sa", name: "Saudi Arabia data.gov.sa", category: "government_api",
  description: "Kingdom of Saudi Arabia national open-data portal — GASTAT statistics, Vision 2030 KPIs, transport and roads, health and education datasets, and ministry-level open data.",
  urls: { api: "https://data.gov.sa", docs: "https://data.gov.sa" },
  trustScore: 90, format: "json", updateFrequency: "daily", integrationMethod: "api_call",
  capabilities: ["government-statistics", "demographic-data", "public-services", "regulatory-compliance", "civic-intelligence"],
  coverage: ["SA"], requiresApiKey: false, free: true, rateLimitPerMin: 60,
};

/** UAE data.gov.ae — United Arab Emirates federal open-data portal. */
export const dataGovAE: DataSourceConfig = {
  id: "data-gov-ae", name: "UAE data.gov.ae", category: "government_api",
  description: "United Arab Emirates federal open-data portal — FCSC statistics, demographic and economic indicators, federal ministry datasets spanning all seven emirates.",
  urls: { api: "https://data.gov.ae", docs: "https://data.gov.ae" },
  trustScore: 90, format: "json", updateFrequency: "daily", integrationMethod: "api_call",
  capabilities: ["government-statistics", "demographic-data", "public-services", "regulatory-compliance", "civic-intelligence"],
  coverage: ["AE"], requiresApiKey: false, free: true, rateLimitPerMin: 60,
};

/** UAE Bayanat — UAE national geospatial & AI-ready data platform. */
export const bayanatAE: DataSourceConfig = {
  id: "bayanat-ae", name: "UAE Bayanat", category: "government_api",
  description: "UAE national geospatial and AI-ready open-data platform — high-resolution spatial datasets, satellite imagery derivatives, mobility traces, and ML-ready corpora aligned with the UAE National AI Strategy.",
  urls: { api: "https://www.bayanat.ae", docs: "https://www.bayanat.ae" },
  trustScore: 90, format: "geojson", updateFrequency: "daily", integrationMethod: "api_call",
  capabilities: ["government-statistics", "demographic-data", "public-services", "civic-intelligence", "geospatial-data", "mobility-data"],
  coverage: ["AE"], requiresApiKey: false, free: true, rateLimitPerMin: 60,
};

/**
 * Global Open-Data Portals — 246 countries.
 *
 * Bulk reference to the 246 countries enumerated in `src/lib/countries.ts`
 * (CountryInfo[]). The Brain uses the country code from that knowledge base
 * to resolve each nation's national open-data portal on demand; only the
 * primary portals above are listed individually because they account for
 * the overwhelming majority of queries.
 */
export const globalOpenDataPortals: DataSourceConfig = {
  id: "global-open-data-portals", name: "Global Open-Data Portals (246 Countries)", category: "government_api",
  description: "Federated registry of national open-data portals for all 246 countries enumerated in src/lib/countries.ts — the Brain resolves a country's portal from its ISO code and queries it on demand for civic intelligence, statistics, and regulatory data.",
  urls: { api: "https://dataportals.org", docs: "https://dataportals.org/" },
  trustScore: 85, format: "json", updateFrequency: "daily", integrationMethod: "api_call",
  capabilities: ["government-statistics", "demographic-data", "public-services", "regulatory-compliance", "civic-intelligence"],
  coverage: ["global"], requiresApiKey: false, free: true, rateLimitPerMin: 30,
};

/** All government open-data sources, in descending trust order. */
export const governmentDataSources: DataSourceConfig[] = [
  dataGovUS, dataEuropaEU, dataGovUK, dataGovEG, dataGovSA, dataGovAE, bayanatAE, globalOpenDataPortals,
];

export default governmentDataSources;

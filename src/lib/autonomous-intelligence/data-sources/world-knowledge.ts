// @ts-nocheck
import "server-only";

/**
 * World Knowledge Sources
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * General-purpose encyclopedic, bibliographic, and web-crawl corpora that
 * anchor the Brain's semantic memory with cross-domain facts: people, places,
 * organisations, scholarly works, historical events, and archived web content.
 *
 * Backs the AIKE Semantic Memory Builder and feeds the Knowledge Validator
 * when a fact's domain is broad or interdisciplinary.
 * Trust heuristic: encyclopedic & curated (70-90), archival (70-85).
 */
import type { DataSourceConfig } from "./types";

/** Wikipedia full-encyclopedia dump — periodic XML/SQL dumps of every article. */
export const wikipedia: DataSourceConfig = {
  id: "wikipedia-dump",
  name: "Wikipedia Encyclopedia Dumps",
  category: "wikipedia",
  description:
    "Periodic full-database dumps of every Wikipedia article, in wikitext XML and SQL forms, across all language editions.",
  urls: { download: "https://dumps.wikimedia.org", docs: "https://meta.wikimedia.org/wiki/Data_dumps" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "monthly",
  integrationMethod: "dump_download",
  capabilities: ["encyclopedic_facts", "entity_descriptions", "biographies", "historical_events", "cross_language_linkage", "category_taxonomies"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 60,
};

/** Wikidata — CC0 structured knowledge graph (Q-items + P-properties), the entity spine. */
export const wikidata: DataSourceConfig = {
  id: "wikidata-dump",
  name: "Wikidata Knowledge Graph",
  category: "wikipedia",
  description:
    "Structured, machine-readable knowledge graph (Q-items + P-properties) — the canonical spine for cross-domain entity disambiguation.",
  urls: {
    download: "https://www.wikidata.org/wiki/Wikidata:Database_download",
    api: "https://www.wikidata.org/w/api.php",
    docs: "https://www.wikidata.org/wiki/Wikidata:Data_access",
  },
  trustScore: 90,
  format: "dump",
  updateFrequency: "weekly",
  integrationMethod: "dump_download",
  capabilities: ["entity_graph", "property_statements", "identifiers_isni_orcid_viaf", "taxonomy_species", "geocoordinates", "temporal_dates"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 60,
};

/** DBpedia — Wikipedia-derived RDF triple store; secondary mirror for entity attributes. */
export const dbpedia: DataSourceConfig = {
  id: "dbpedia",
  name: "DBpedia RDF Knowledge Base",
  category: "public_api",
  description:
    "RDF triple store extracted from Wikipedia infoboxes — a structured, queryable secondary mirror for entity attributes and relations.",
  urls: { download: "https://wiki.dbpedia.org/downloads", api: "https://dbpedia.org/sparql", docs: "https://wiki.dbpedia.org/" },
  trustScore: 75,
  format: "rdf",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["infobox_attributes", "rdf_triples", "sparql_queryable", "ontology_classes", "abstract_summaries"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** Common Crawl — monthly petabyte-scale WARC archive of the public web (long-tail & emerging topics). */
export const commonCrawl: DataSourceConfig = {
  id: "common-crawl",
  name: "Common Crawl Web Archive",
  category: "public_api",
  description:
    "Petabyte-scale open archive of the public web, refreshed monthly as WARC files on S3 — used for long-tail and emerging-topic retrieval.",
  urls: { download: "https://commoncrawl.org", api: "https://index.commoncrawl.org", docs: "https://commoncrawl.org/get-started" },
  trustScore: 70,
  format: "dump",
  updateFrequency: "monthly",
  integrationMethod: "dump_download",
  capabilities: ["web_page_text", "emerging_topics", "long_tail_facts", "link_structure", "language_coverage"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** OpenAlex — open scholarly graph (works, authors, institutions, venues, concepts, funders). */
export const openAlex: DataSourceConfig = {
  id: "openalex",
  name: "OpenAlex Scholarly Works Graph",
  category: "education_api",
  description:
    "Open replacement for Microsoft Academic Graph — covers works, authors, institutions, venues, concepts, and funders across all disciplines.",
  urls: { api: "https://openalex.org", docs: "https://docs.openalex.org" },
  trustScore: 85,
  format: "json",
  updateFrequency: "daily",
  integrationMethod: "api_call",
  capabilities: ["scholarly_works", "author_profiles", "institution_metadata", "concept_taxonomy", "citation_graph", "funding_data"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 100,
};

/** Internet Archive — public digital library (books, films, software, audio, Wayback). */
export const internetArchive: DataSourceConfig = {
  id: "internet-archive",
  name: "Internet Archive Digital Library",
  category: "public_api",
  description:
    "Public digital library of books, films, software, audio, and archived web pages (Wayback Machine) — consulted on-demand for primary historical sources.",
  urls: { api: "https://archive.org", docs: "https://archive.org/developers/index.php" },
  trustScore: 80,
  format: "json",
  updateFrequency: "on_demand",
  integrationMethod: "api_call",
  capabilities: ["archived_web_pages", "public_domain_books", "audio_video_archives", "software_history", "wayback_snapshots"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 30,
};

/** All world-knowledge sources, in descending trust order. */
export const worldKnowledgeSources: DataSourceConfig[] = [
  wikidata, wikipedia, openAlex, internetArchive, dbpedia, commonCrawl,
];

export default worldKnowledgeSources;

// @ts-nocheck
import "server-only";

/**
 * Knowledge Graph Sources — Phase 7.5 AIKE
 * ============================================================================
 * Structured, machine-readable knowledge graphs that the Brain ingests to
 * build its own internal "Brain Graph" — the entity/relationship backbone
 * used for semantic reasoning, entity disambiguation, and ontology-aligned
 * fact fusion. These are the most important sources in the entire registry:
 * the Brain Graph is the connective tissue that lets every other source's
 * facts be linked, traced, and validated.
 *
 * Backs the AIKE Brain Graph Builder, the Entity Linker, and the Semantic
 * Reasoner. Feeds the Knowledge Validator when a claim needs ontological
 * grounding (e.g. "is X a subclass of Y?").
 * Trust heuristic: official / institutional (75-90).
 */
import type { DataSourceConfig } from "./types";

/** Wikidata — CC0 structured knowledge graph (Q-items + P-properties); the entity spine of the Brain Graph. */
export const wikidata: DataSourceConfig = {
  id: "wikidata-kg",
  name: "Wikidata Knowledge Graph",
  category: "wikipedia",
  description:
    "Structured, machine-readable knowledge graph of Q-items and P-properties — the canonical spine for cross-domain entity disambiguation, identifier linkage, and Brain Graph construction.",
  urls: {
    download: "https://www.wikidata.org/wiki/Wikidata:Database_download",
    api: "https://www.wikidata.org/w/api.php",
    docs: "https://www.wikidata.org/wiki/Wikidata:Data_access",
  },
  trustScore: 90,
  format: "dump",
  updateFrequency: "weekly",
  integrationMethod: "dump_download",
  capabilities: ["entity-linking", "relationship-extraction", "ontology", "semantic-reasoning", "knowledge-graph-construction"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 60,
};

/** Schema.org — shared vocabulary of types and properties that the Brain uses to align its ontology with the web. */
export const schemaOrg: DataSourceConfig = {
  id: "schema-org",
  name: "Schema.org Vocabulary",
  category: "public_api",
  description:
    "Cross-industry vocabulary of types (Person, Place, Event, Product, …) and properties maintained by Google, Microsoft, Yahoo, and Yandex — the Brain's reference ontology for aligning structured data on the open web.",
  urls: { api: "https://schema.org", docs: "https://schema.org/docs/developers.html" },
  trustScore: 90,
  format: "rdf",
  updateFrequency: "on_demand",
  integrationMethod: "api_call",
  capabilities: ["entity-linking", "ontology", "semantic-reasoning", "knowledge-graph-construction", "structured-data-mapping"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** WordNet — Princeton lexical database of English synsets; teaches the Brain synonymy, hypernymy, and meronymy. */
export const wordNet: DataSourceConfig = {
  id: "wordnet",
  name: "Princeton WordNet",
  category: "education_api",
  description:
    "Princeton's lexical database of English — synsets (cognitive synonyms) linked by hypernymy, hyponymy, meronymy, and holonymy — gives the Brain the linguistic scaffolding for semantic similarity and word-sense disambiguation.",
  urls: { download: "https://wordnet.princeton.edu/", docs: "https://wordnet.princeton.edu/documentation" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["entity-linking", "ontology", "semantic-reasoning", "synonymy", "word-sense-disambiguation"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** ConceptNet — open commonsense knowledge graph connecting words/phrases by everyday relations. */
export const conceptNet: DataSourceConfig = {
  id: "conceptnet",
  name: "ConceptNet Commonsense Graph",
  category: "public_api",
  description:
    "Open commonsense knowledge graph linking words and short phrases via everyday relations (IsA, UsedFor, PartOf, CapableOf, …) — gives the Brain the everyday reasoning that pure ontology graphs lack.",
  urls: { download: "https://conceptnet.io/downloads/", api: "https://api.conceptnet.io", docs: "https://github.com/commonsense/conceptnet5" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["entity-linking", "relationship-extraction", "ontology", "semantic-reasoning", "commonsense-knowledge"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** YAGO — Wikipedia/WordNet/GeoNames-derived knowledge graph with high-precision type assertions. */
export const yago: DataSourceConfig = {
  id: "yago",
  name: "YAGO Knowledge Base",
  category: "public_api",
  description:
    "Knowledge graph derived from Wikipedia, WordNet, and GeoNames with high-precision type assignments and temporal facts — a quality-controlled complement to Wikidata for entity classification.",
  urls: { download: "https://yago-knowledge.org/", docs: "https://yago-knowledge.org/downloads/" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["entity-linking", "relationship-extraction", "ontology", "semantic-reasoning", "knowledge-graph-construction"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** Freebase dump — deprecated but still referenced mid-2014 MID/Graph snapshot; useful for legacy entity IDs. */
export const freebaseDump: DataSourceConfig = {
  id: "freebase-dump",
  name: "Freebase Data Dump (Archive)",
  category: "public_api",
  description:
    "Final mid-2014 Wikimedia-published Freebase dump (MIDs + graph triples) — deprecated and no longer updated, but still referenced by legacy systems and useful for resolving historical machine IDs to Wikidata Q-items.",
  urls: { download: "https://developers.google.com/freebase/", docs: "https://wiki.dbpedia.org/" },
  trustScore: 75,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["entity-linking", "relationship-extraction", "knowledge-graph-construction", "legacy-id-mapping"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** All knowledge-graph sources, in descending trust order. */
export const knowledgeGraphSources: DataSourceConfig[] = [
  wikidata, schemaOrg, wordNet, conceptNet, yago, freebaseDump,
];

export default knowledgeGraphSources;

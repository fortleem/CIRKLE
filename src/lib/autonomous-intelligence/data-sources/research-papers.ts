// @ts-nocheck
import "server-only";

/**
 * Research Paper Sources — Phase 7.5 AIKE
 * ============================================================================
 * Scholarly literature APIs and pre-print servers that the Brain consults to
 * keep its knowledge current and evidence-graded. The Brain tracks the
 * state-of-the-art across every CIRKLE-relevant discipline (ML, distributed
 * systems, security, cryptography, HCI, urban planning, public health),
 * extracts methodologies, and compares CIRKLE's own implementations against
 * published benchmarks.
 *
 * Backs the AIKE Research Scheduler, the State-of-Art Tracker, and the
 * Knowledge Validator's citation-fusion path (a claim backed by ≥3
 * peer-reviewed sources outranks an unindexed claim).
 * Trust heuristic: academic / institutional = 80-90.
 */
import type { DataSourceConfig } from "./types";

/** CrossRef — DOI registration agency; canonical bibliographic metadata for every registered DOI. */
export const crossRef: DataSourceConfig = {
  id: "crossref",
  name: "CrossRef Metadata API",
  category: "education_api",
  description:
    "Canonical bibliographic metadata for every DOI-registered scholarly work — the Brain's authority for citation graphs, reference lists, and persistent work identifiers across all publishers.",
  urls: { api: "https://api.crossref.org", docs: "https://www.crossref.org" },
  trustScore: 90,
  format: "json",
  updateFrequency: "realtime",
  integrationMethod: "api_call",
  capabilities: ["research-trends", "citation-analysis", "state-of-art-tracking", "methodology-extraction", "benchmark-comparison"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 50,
};

/** PubMed — NLM citation database spanning biomedicine, public health, and life sciences. */
export const pubMed: DataSourceConfig = {
  id: "pubmed",
  name: "PubMed (NLM)",
  category: "health_api",
  description:
    "U.S. National Library of Medicine citation database spanning biomedicine, public health, nursing, dentistry, and the life sciences — the Brain's primary source for health-claim validation and evidence-grade medical knowledge.",
  urls: { api: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/", docs: "https://pubmed.ncbi.nlm.nih.gov" },
  trustScore: 90,
  format: "json",
  updateFrequency: "daily",
  integrationMethod: "api_call",
  capabilities: ["research-trends", "citation-analysis", "state-of-art-tracking", "methodology-extraction", "benchmark-comparison", "evidence-based-medicine"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 100,
};

/** arXiv — open pre-print server for physics, math, CS, Q-bio, Q-fin, and statistics. */
export const arXiv: DataSourceConfig = {
  id: "arxiv",
  name: "arXiv Pre-print Server",
  category: "education_api",
  description:
    "Open-access pre-print server for physics, mathematics, computer science, quantitative biology, quantitative finance, statistics, and electrical engineering — earliest public release venue for most ML/CS breakthroughs that the Brain must track.",
  urls: { api: "https://export.arxiv.org/api/query", docs: "https://arxiv.org" },
  trustScore: 85,
  format: "xml",
  updateFrequency: "daily",
  integrationMethod: "api_call",
  capabilities: ["research-trends", "citation-analysis", "state-of-art-tracking", "methodology-extraction", "benchmark-comparison", "pre-print-tracking"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 30,
};

/** Semantic Scholar — AI2 academic search engine with SPECTER embeddings and TLDRs. */
export const semanticScholar: DataSourceConfig = {
  id: "semantic-scholar",
  name: "Semantic Scholar Graph",
  category: "education_api",
  description:
    "Allen Institute academic search engine indexing 200M+ papers with SPECTER embeddings, auto-generated TLDRs, and influence-weighted citation graphs — the Brain's primary interface for semantic literature search and influential-citation detection.",
  urls: { api: "https://api.semanticscholar.org", docs: "https://www.semanticscholar.org" },
  trustScore: 85,
  format: "json",
  updateFrequency: "daily",
  integrationMethod: "api_call",
  capabilities: ["research-trends", "citation-analysis", "state-of-art-tracking", "methodology-extraction", "benchmark-comparison", "semantic-search"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 100,
};

/** OpenAlex — open scholarly graph (works, authors, institutions, venues, concepts, funders). */
export const openAlex: DataSourceConfig = {
  id: "openalex",
  name: "OpenAlex Scholarly Works Graph",
  category: "education_api",
  description:
    "Open replacement for Microsoft Academic Graph — covers works, authors, institutions, venues, concepts, and funders across all disciplines, with linked open-data identifiers the Brain can reconcile against Wikidata.",
  urls: { api: "https://openalex.org", docs: "https://docs.openalex.org" },
  trustScore: 85,
  format: "json",
  updateFrequency: "daily",
  integrationMethod: "api_call",
  capabilities: ["research-trends", "citation-analysis", "state-of-art-tracking", "methodology-extraction", "benchmark-comparison"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 100,
};

/** Papers With Code — papers linked to their code repos, evaluation benchmarks, and leaderboards. */
export const papersWithCode: DataSourceConfig = {
  id: "papers-with-code",
  name: "Papers With Code",
  category: "education_api",
  description:
    "Curated linkage between research papers, their public code repositories, the evaluation benchmarks they report, and up-to-date leaderboards — the Brain's primary source for benchmark-comparison grounding and reproducible-method extraction.",
  urls: { api: "https://paperswithcode.com/api/v1/", docs: "https://paperswithcode.com" },
  trustScore: 80,
  format: "json",
  updateFrequency: "weekly",
  integrationMethod: "api_call",
  capabilities: ["research-trends", "citation-analysis", "state-of-art-tracking", "methodology-extraction", "benchmark-comparison", "reproducible-code"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
  rateLimitPerMin: 60,
};

/** All research-paper sources, in descending trust order. */
export const researchPaperSources: DataSourceConfig[] = [
  crossRef, pubMed, arXiv, semanticScholar, openAlex, papersWithCode,
];

export default researchPaperSources;

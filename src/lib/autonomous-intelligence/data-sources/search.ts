// @ts-nocheck
import "server-only";

/**
 * Search Intelligence Datasets
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * Information-retrieval benchmarks that teach the Brain's Retriever how
 * to rank passages, answer open-domain questions, and evaluate embedding
 * quality. Powers Circle's internal semantic search across Wasl messages,
 * Lamahat photos, Educational Workspaces, and the Creator Channel library.
 *
 * Backs the AIKE Retriever & Ranking module and the embedding-evaluation harness.
 * Trust heuristic: institutionally curated IR benchmarks (80-90).
 */
import type { DataSourceConfig } from "./types";

/** MS MARCO — Microsoft's large-scale question-passage dataset for passage retrieval. */
export const msMarco: DataSourceConfig = {
  id: "ms-marco",
  name: "MS MARCO Passage & Document Ranking",
  category: "public_api",
  description:
    "Microsoft MS MARCO — 1 million anonymised Bing queries with ~8.8M passages and human-judged relevance labels; the canonical benchmark for passage ranking, neural IR, and dense-retrieval pretraining.",
  urls: { download: "https://microsoft.github.io/msmarco/", docs: "https://microsoft.github.io/MSMARCO-Passage-Ranking/" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["passage-retrieval", "search-ranking", "neural-ir", "dense-retrieval", "query-understanding", "relevance-judgements"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** BEIR — heterogeneous zero-shot IR evaluation benchmark across 18 datasets. */
export const beir: DataSourceConfig = {
  id: "beir",
  name: "BEIR Benchmark (Zero-Shot IR)",
  category: "public_api",
  description:
    "BEIR — heterogeneous zero-shot information-retrieval benchmark spanning 18 datasets across 9 domains (news, science, biomedical, finance, etc.); the standard held-out evaluation for cross-domain dense retrievers.",
  urls: { download: "https://github.com/beir-cellar/beir", docs: "https://arxiv.org/abs/2104.08663" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["passage-retrieval", "search-ranking", "zero-shot-ir", "cross-domain-evaluation", "embedding-evaluation"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** MTEB — Massive Text Embedding Benchmark; 56 tasks across 8 categories. */
export const mteb: DataSourceConfig = {
  id: "mteb",
  name: "MTEB (Massive Text Embedding Benchmark)",
  category: "public_api",
  description:
    "MTEB — 58 datasets across 8 task categories (classification, clustering, pair classification, reranking, retrieval, STS, summarisation, bitext mining); the comprehensive harness for evaluating text-embedding models used by Circle's semantic search.",
  urls: { download: "https://github.com/embeddings-benchmark/mteb", docs: "https://arxiv.org/abs/2210.07316" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["embedding-evaluation", "semantic-similarity", "clustering", "reranking", "retrieval", "multilingual-embeddings"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** Natural Questions — Google's 300k real user questions with Wikipedia passages. */
export const naturalQuestions: DataSourceConfig = {
  id: "natural-questions",
  name: "Google Natural Questions",
  category: "public_api",
  description:
    "Natural Questions — 307,373 real anonymousised Google search queries with long-answer and short-answer annotations over Wikipedia passages; the canonical open-domain QA benchmark for end-to-end retrieval + reading.",
  urls: { download: "https://ai.google.com/research/NaturalQuestions", docs: "https://github.com/google-research-datasets/natural-questions" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["question-answering", "open-domain-qa", "long-answer-extraction", "short-answer-extraction", "passage-retrieval"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** HotpotQA — multi-hop question answering requiring reasoning across passages. */
export const hotpotQA: DataSourceConfig = {
  id: "hotpot-qa",
  name: "HotpotQA Multi-Hop QA",
  category: "public_api",
  description:
    "HotpotQA — 113k Wikipedia questions that require multi-hop reasoning across two or more supporting passages, with sentence-level supporting-fact labels; the standard benchmark for explainable multi-step retrieval and reasoning.",
  urls: { download: "https://hotpotqa.github.io", docs: "https://hotpotqa.github.io/" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["question-answering", "multi-hop-reasoning", "passage-retrieval", "supporting-fact-extraction", "explainable-qa"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** All search-intelligence sources, in descending trust order. */
export const searchSources: DataSourceConfig[] = [
  msMarco, beir, mteb, naturalQuestions, hotpotQA,
];

export default searchSources;

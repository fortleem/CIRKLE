// @ts-nocheck
import "server-only";

/**
 * Translation & Multilingual Datasets
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * Parallel-text corpora that teach the Brain's Translation Engine to
 * translate across 200+ languages — including low-resource African,
 * South-Asian, and indigenous languages that commercial engines often
 * skip. Powers the Circle Translation module (Mashahd auto-dubbing, Wasl
 * message translation, document translation).
 *
 * Backs the AIKE Translation Engine and the multilingual embedding layer.
 * Trust heuristic: institutional research corpora (85-95),
 * community-collected / mined corpora (70-85).
 */
import type { DataSourceConfig } from "./types";

/** NLLB — Meta's No Language Left Behind; 200+ languages, fully open & free. */
export const nllb: DataSourceConfig = {
  id: "nllb",
  name: "Meta NLLB-200 (No Language Left Behind)",
  category: "public_api",
  description:
    "Meta's No Language Left Behind — parallel training data and pre-trained models covering 200+ languages, including many low-resource languages. Released fully open under CC-BY-NC 4.0; the Brain treats NLLB as the canonical long-tail translation reference.",
  urls: { download: "https://github.com/facebookresearch/fairseq/tree/nllb", docs: "https://ai.facebook.com/research/no-language-left-behind/" },
  trustScore: 90,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["machine-translation", "200-languages", "low-resource-languages", "multilingual", "sentence-level-translation"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** OPUS — open parallel corpus collection across hundreds of language pairs. */
export const opus: DataSourceConfig = {
  id: "opus",
  name: "OPUS Open Parallel Corpus",
  category: "public_api",
  description:
    "OPUS — open collection of translated texts from the web (TED, OpenSubtitles, EU law, Tatoeba, Wikipedia, etc.) covering 500+ language pairs; the largest free aggregate of parallel sentences for MT training.",
  urls: { download: "https://opus.nlpl.eu", docs: "https://opus.nlpl.eu/opus4/" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["machine-translation", "multilingual", "parallel-sentences", "domain-diverse-translation", "low-resource-languages"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** CCMatrix — mined parallel sentences from CommonCrawl (CC) at scale. */
export const ccMatrix: DataSourceConfig = {
  id: "ccmatrix",
  name: "CCMatrix Mined Parallel Corpus",
  category: "public_api",
  description:
    "CCMatrix — parallel sentence pairs mined from Common Crawl at scale using LASER sentence embeddings, covering 576 language pairs. Larger and more diverse than OPUS for web-domain translation, at the cost of higher noise.",
  urls: { download: "https://github.com/facebookresearch/LASER/tree/main/data/cc-matrix", docs: "https://aclanthology.org/2021.acl-long.507/" },
  trustScore: 75,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["machine-translation", "multilingual", "mined-parallel-text", "web-domain-translation", "low-resource-languages"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** FLORES-200 — human-translated evaluation benchmark across 200 languages. */
export const flores: DataSourceConfig = {
  id: "flores-200",
  name: "Meta FLORES-200 Evaluation Benchmark",
  category: "public_api",
  description:
    "FLORES-200 — human-translated evaluation set of 3,001 sentences from Wikimedia news/wiki, translated into 200 languages including many low-resource ones; the standard held-out benchmark for NLLB and other 200-language MT systems.",
  urls: { download: "https://github.com/facebookresearch/flores", docs: "https://ai.facebook.com/blog/flores200-the-first-many-to-many-benchmark-for-200-languages/" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["machine-translation", "200-languages", "mt-evaluation", "multilingual", "low-resource-languages", "held-out-benchmark"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** MADLAD — Google's multilingual-adaptive data, 450+ languages, 250B tokens. */
export const madlad: DataSourceConfig = {
  id: "madlad-400",
  name: "Google MADLAD-400 Multilingual Corpus",
  category: "public_api",
  description:
    "MADLAD-400 — Massive Multilingual Dataset with 400+ languages and 250B tokens, mined and filtered from the web. Released by Google to support research on long-tail language models and translation.",
  urls: { download: "https://github.com/google-research-datasets/madlad-400", docs: "https://aclanthology.org/2023.findings-acl.812/" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["machine-translation", "200-languages", "multilingual", "low-resource-languages", "monolingual-pretraining", "language-modeling"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** All translation / multilingual sources, in descending trust order. */
export const translationSources: DataSourceConfig[] = [
  nllb, flores, madlad, opus, ccMatrix,
];

export default translationSources;

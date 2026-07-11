// @ts-nocheck
import "server-only";

/**
 * AI Safety & Moderation Datasets — Phase 7.5 AIKE
 * ============================================================================
 * Toxicity, hate-speech, harassment, self-harm, and violence corpora that
 * teach the Brain's Safety Layer (Circle Safe) how to recognise and route
 * harmful content. These describe PATTERNS OF HARM, not protected groups —
 * the Brain learns the lexical/semantic signatures of abuse so it can shield
 * users without ever amplifying the underlying hate.
 *
 * Backs the AIKE Safety Classifier and the Content Moderation Validator.
 */
import type { DataSourceConfig } from "./types";

/** Civil Comments — large-scale community-labelled toxicity corpus (Jigsaw lineage). */
export const civilComments: DataSourceConfig = {
  id: "civil-comments",
  name: "Civil Comments Dataset",
  category: "public_api",
  description: "Large-scale corpus of online news comments annotated by community raters for toxicity, severe toxicity, obscenity, identity attack, insult, and threat — the public successor to the Jigsaw Civil Comments platform.",
  urls: { download: "https://www.kaggle.com/c/jigsaw-unintended-bias-toxicity-classification", docs: "https://figshare.com/articles/dataset/Civil_Comments_dataset/7376747" },
  trustScore: 75,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["toxicity-detection", "hate-speech", "harassment", "insult-classification", "threat-detection", "identity-attack"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** Jigsaw (Google) — multi-year family of toxicity datasets (Toxic Comment, Unintended Bias, Multilingual). */
export const jigsaw: DataSourceConfig = {
  id: "jigsaw-toxicity",
  name: "Google Jigsaw Toxicity Datasets",
  category: "partner_api",
  description:
    "Google Jigsaw / Perspective API family of toxicity datasets — Toxic Comment Classification, Unintended Bias, and Multilingual Toxic Comment corpora — plus the live Perspective API for on-demand scoring.",
  urls: { api: "https://www.perspectiveapi.com", docs: "https://developers.perspectiveapi.com/s/" },
  trustScore: 85,
  format: "json",
  updateFrequency: "on_demand",
  integrationMethod: "api_call",
  capabilities: ["toxicity-detection", "severe-toxicity", "identity-attack", "insult", "threat", "profanity", "sexually-explicit"],
  coverage: ["global"],
  requiresApiKey: true,
  free: true,
  rateLimitPerMin: 60,
};

/** HateXplain — academic hate-speech corpus with token-level rationales across three annotators. */
export const hateXplain: DataSourceConfig = {
  id: "hatexplain",
  name: "HateXplain Dataset",
  category: "public_api",
  description:
    "Academically published hate-speech dataset with token-level rationales annotated by three independent reviewers per post — teaches the Brain not only WHAT is hateful but WHY, supporting explainable moderation.",
  urls: { download: "https://huggingface.co/datasets/hatexplain", docs: "https://arxiv.org/abs/2012.10289" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["hate-speech", "rationale-extraction", "explainable-moderation", "target-group-detection", "multi-annotator-agreement"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** Detoxify — open-source toxicity classifier + its training corpora (3 model variants). */
export const detoxify: DataSourceConfig = {
  id: "detoxify",
  name: "Detoxify Training Corpora",
  category: "public_api",
  description:
    "Open-source Detoxify model family (original, unbiased, multilingual) with the underlying training corpora — pre-trained weights + data so the Brain can fine-tune on Circle-specific moderation signal.",
  urls: { download: "https://github.com/unitaryai/detoxify", docs: "https://github.com/unitaryai/detoxify#data" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["toxicity-detection", "severe-toxicity", "identity-attack", "insult", "threat", "multilingual-toxicity"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** LAION Moderation — large-scale image-text pair labels for visual safety filtering. */
export const laionModeration: DataSourceConfig = {
  id: "laion-moderation",
  name: "LAION Moderation Subset",
  category: "public_api",
  description:
    "Moderation-labelled subset of LAION-5B image-text pairs tagged for unsafe content (NSFW, violence, disturbing imagery) — used to train the Brain's visual safety classifier for Circle Photos / Mashahd.",
  urls: { download: "https://laion.ai/blog/laion-5b/", docs: "https://github.com/LAION-AI/LAION-5B-WatermarkDetection" },
  trustScore: 75,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["nsfw-detection", "violence-detection", "visual-safety-filtering", "image-text-pair-moderation"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** OpenAI Moderation Taxonomy — reference categories + live moderation endpoint. */
export const openAIModeration: DataSourceConfig = {
  id: "openai-moderation",
  name: "OpenAI Moderation Taxonomy & API",
  category: "partner_api",
  description: "OpenAI's published moderation taxonomy (hate, harassment, self-harm, sexual, violence) with sub-classes, plus the live moderation endpoint — the reference schema for Circle's Safety Layer.",
  urls: { api: "https://api.openai.com/v1/moderations", docs: "https://platform.openai.com/docs/guides/moderation" },
  trustScore: 90,
  format: "json",
  updateFrequency: "on_demand",
  integrationMethod: "api_call",
  capabilities: ["hate-speech", "harassment", "self-harm", "violence", "sexual-content", "minors-safety", "moderation-taxonomy"],
  coverage: ["global"],
  requiresApiKey: true,
  free: true,
  rateLimitPerMin: 60,
};

/** All AI-safety / moderation sources, in descending trust order. */
export const aiSafetySources: DataSourceConfig[] = [
  openAIModeration, jigsaw, hateXplain, detoxify, civilComments, laionModeration,
];

export default aiSafetySources;

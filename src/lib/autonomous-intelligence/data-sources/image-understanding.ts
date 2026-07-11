// @ts-nocheck
import "server-only";

/**
 * Image Understanding Datasets — Phase 7.5 AIKE
 * ============================================================================
 * Vision corpora that teach the Brain's Visual Cortex how to recognise
 * objects, scenes, relationships, and layouts inside photos and video
 * frames. Used by Circle Photos (Lamahat), Mashahd (video), and the
 * visual-safety filter for AI Safety. Datasets describe SCENES and
 * OBJECTS — never identities of private individuals.
 *
 * Backs the AIKE Visual Reasoner and the Image Captioning pipeline.
 */
import type { DataSourceConfig } from "./types";

/** LAION-5B / LAION-400M — petabyte-scale open image-alt-text pair corpus. */
export const laion: DataSourceConfig = {
  id: "laion-5b",
  name: "LAION-5B & LAION-400M Image-Text Pairs",
  category: "public_api",
  description:
    "Open datasets of 5 billion (LAION-5B) and 400 million (LAION-400M) image-alt-text pairs scraped from the web — the foundation corpus for open clip-style vision-language pretraining and image captioning.",
  urls: { download: "https://laion.ai/blog/laion-5b/", docs: "https://github.com/LAION-AI/laion-datasets" },
  trustScore: 75,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["image-captioning", "visual-reasoning", "scene-understanding", "clip-pretraining", "multimodal-embeddings"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** COCO — Common Objects in Context; 330k images with 80 thing classes + 5 captions each. */
export const coco: DataSourceConfig = {
  id: "coco",
  name: "Microsoft COCO (Common Objects in Context)",
  category: "public_api",
  description: "Microsoft COCO — 330k images with instance segmentation, panoptic segmentation, keypoints, and five free-form captions per image across 80 object classes; the canonical benchmark for detection and captioning.",
  urls: { download: "https://cocodataset.org", docs: "https://cocodataset.org/#download" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["object-detection", "instance-segmentation", "panoptic-segmentation", "image-captioning", "keypoint-detection"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** Open Images — Google's 9M-image dataset with 600 box classes + segmentation. */
export const openImages: DataSourceConfig = {
  id: "open-images",
  name: "Google Open Images Dataset V7",
  category: "public_api",
  description: "Google Open Images V7 — ~9 million images annotated with bounding boxes across 600 classes, plus segmentation masks, relationships, and localized narratives; the largest open detection corpus.",
  urls: { download: "https://storage.googleapis.com/openimages", docs: "https://storage.googleapis.com/openimages/web/index.html" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["object-detection", "bounding-boxes", "instance-segmentation", "visual-relationships", "localized-narratives"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** LVIS — long-tail vocabulary built on COCO images (1,200 fine-grained categories). */
export const lvis: DataSourceConfig = {
  id: "lvis",
  name: "LVIS (Large Vocabulary Instance Segmentation)",
  category: "public_api",
  description:
    "LVIS — long-tail instance-segmentation dataset built on COCO images with 1,200 fine-grained categories sampled by frequency head/torso/tail; teaches the Brain to recognise rare and rare-ish objects.",
  urls: { download: "https://www.lvisdataset.org", docs: "https://www.lvisdataset.org/dataset" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["object-detection", "instance-segmentation", "long-tail-recognition", "fine-grained-classification"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** Visual Genome — dense scene graphs (objects, attributes, relationships) over 108k images. */
export const visualGenome: DataSourceConfig = {
  id: "visual-genome",
  name: "Visual Genome Scene Graphs",
  category: "public_api",
  description:
    "Visual Genome — 108k images densely annotated with objects, attributes, pairwise relationships, region descriptions, and QA pairs; the canonical corpus for visual reasoning and scene-graph generation.",
  urls: { download: "https://visualgenome.org", docs: "https://visualgenome.org/api" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["visual-reasoning", "scene-graphs", "object-attributes", "visual-relationships", "region-descriptions", "visual-question-answering"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** Conceptual Captions — Google's 3.3M web-harvested image-caption pairs, auto-cleaned. */
export const conceptualCaptions: DataSourceConfig = {
  id: "conceptual-captions",
  name: "Google Conceptual Captions 3M",
  category: "public_api",
  description:
    "Google Conceptual Captions — ~3.3 million image-caption pairs harvested from the web and automatically filtered/normalized; larger and more diverse than COCO Captions for vision-language pretraining.",
  urls: { download: "https://ai.google.com/research/ConceptualCaptions", docs: "https://github.com/google-research-datasets/conceptual-captions" },
  trustScore: 75,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["image-captioning", "scene-understanding", "vision-language-pretraining", "diverse-vocabulary"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** All image-understanding sources, in descending trust order. */
export const imageUnderstandingSources: DataSourceConfig[] = [
  coco, openImages, lvis, visualGenome, laion, conceptualCaptions,
];

export default imageUnderstandingSources;

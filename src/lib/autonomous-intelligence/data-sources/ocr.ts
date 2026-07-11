// @ts-nocheck
import "server-only";

/**
 * OCR & Document Intelligence Datasets
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * Datasets that teach the Brain's Document Reader how to recognise
 * handwriting, parse document layouts, and extract text from scanned
 * pages, receipts, and forms. Powers Circle's receipt scanner, contract
 * uploader, and educational worksheet parser.
 *
 * Backs the AIKE Document Understanding module and the receipt-scanning
 * microservice for Circle Payments.
 * Trust heuristic: institutionally curated academic benchmarks (80-90),
 * synthetic / community-built corpora (70-80).
 */
import type { DataSourceConfig } from "./types";

/** IAM Handwriting — offline English handwriting forms with line/word labels. */
export const iamHandwriting: DataSourceConfig = {
  id: "iam-handwriting",
  name: "IAM Handwriting Database",
  category: "public_api",
  description:
    "IAM Handwriting Database — 1,539 scanned pages of English handwriting from 657 writers, fully labelled at page, line, and word level; the canonical benchmark for offline handwriting recognition (HTR).",
  urls: { download: "https://fki.tic.heia-fr.ch/databases/iam-handwriting-database", docs: "https://fki.tic.heia-fr.ch/databases/iam-handwriting-database" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["handwriting-recognition", "offline-htr", "writer-variation", "line-segmentation", "word-transcription"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** SynthText — synthetically rendered text over natural image backgrounds. */
export const synthText: DataSourceConfig = {
  id: "synthtext",
  name: "SynthText Synthetic Scene-Text Dataset",
  category: "public_api",
  description:
    "SynthText — ~800k images with text rendered synthetically onto natural scene backgrounds, with pixel-level word and character masks; pretraining corpus for scene-text detection before real-data fine-tuning.",
  urls: { download: "https://github.com/ankush-me/SynthText", docs: "https://www.robots.ox.ac.uk/~vgg/data/scenetext/" },
  trustScore: 75,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["text-extraction", "scene-text-detection", "ocr-pretraining", "synthetic-data-augmentation", "word-segmentation"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** DocLayNet — 80k+ human-annotated document pages with 11 layout classes. */
export const docLayNet: DataSourceConfig = {
  id: "doclaynet",
  name: "IBM DocLayNet Document Layout Dataset",
  category: "public_api",
  description:
    "IBM DocLayNet — 80,863 uniquely annotated document pages from financial reports, manuals, patents, tenders, laws, and scientific papers, labelled with 11 layout classes at pixel-level segmentation masks; the benchmark for document layout analysis.",
  urls: { download: "https://huggingface.co/datasets/DSLR/DocLayNet", docs: "https://arxiv.org/abs/2206.01062" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["document-layout", "layout-segmentation", "page-structure", "region-classification", "scientific-paper-parsing", "financial-document-parsing"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** RVL-CDIP — 400k scanned document images across 16 document classes. */
export const rvlCdip: DataSourceConfig = {
  id: "rvl-cdip",
  name: "RVL-CDIP Document Image Dataset",
  category: "public_api",
  description:
    "RVL-CDIP — 400,000 grayscale scanned document images evenly distributed across 16 classes (letter, form, email, handwritten, advertisement, scientific report, manual, invoice, news, presentation, specification, questionnaire, budget, memo, file-folder, spreadsheet); the canonical document-classification benchmark.",
  urls: { download: "https://www.cs.cmu.edu/~aharley/rvl-cdip/", docs: "https://www.cs.cmu.edu/~aharley/rvl-cdip/" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["document-layout", "document-classification", "receipt-scanning", "form-detection", "invoice-detection", "scanned-page-understanding"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** All OCR / document-intelligence sources, in descending trust order. */
export const ocrSources: DataSourceConfig[] = [
  docLayNet, iamHandwriting, rvlCdip, synthText,
];

export default ocrSources;

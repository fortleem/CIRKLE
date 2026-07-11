// @ts-nocheck
import "server-only";

/**
 * Voice Intelligence Datasets
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * Speech corpora that teach the Brain's Voice Engine how to transcribe,
 * recognise speakers, verify identity by voice, and identify spoken
 * languages. Powers Wasl voice messages, Circle Verify voice challenge,
 * and the multi-language speech-to-text layer for Mashahd auto-captions.
 *
 * Backs the AIKE Voice Engine and the ASR/STT pipeline.
 * Trust heuristic: institutionally curated academic benchmarks (80-90),
 * community-collected corpora (75-85).
 */
import type { DataSourceConfig } from "./types";

/** Mozilla Common Voice — open, multilingual crowd-sourced speech corpus (CC0). */
export const mozillaCommonVoice: DataSourceConfig = {
  id: "mozilla-common-voice",
  name: "Mozilla Common Voice",
  category: "public_api",
  description:
    "Mozilla Common Voice — open, multilingual crowd-sourced speech corpus released under CC0, with validated clips in 100+ languages and demographic metadata volunteered by speakers; the canonical open ASR training set.",
  urls: { download: "https://commonvoice.mozilla.org", docs: "https://commonvoice.mozilla.org/en/datasets" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "monthly",
  integrationMethod: "dump_download",
  capabilities: ["speech-to-text", "multilingual-asr", "low-resource-languages", "speaker-demographics", "accent-variation"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** LibriSpeech — 1,000h of clean read English speech from public-domain audiobooks. */
export const libriSpeech: DataSourceConfig = {
  id: "librispeech",
  name: "LibriSpeech ASR Corpus",
  category: "public_api",
  description:
    "LibriSpeech — ~1,000 hours of read English speech sampled at 16kHz, derived from public-domain LibriVox audiobooks and force-aligned at the sentence level; the most widely used academic ASR benchmark.",
  urls: { download: "https://www.openslr.org/12", docs: "http://www.openslr.org/12" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["speech-to-text", "english-asr", "audiobook-transcription", "speaker-variation", "force-aligned-text"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** VoxCeleb — 1M+ real-world speaker-utterance clips from YouTube interviews. */
export const voxCeleb: DataSourceConfig = {
  id: "voxceleb",
  name: "VoxCeleb Audio-Visual Speaker Datasets",
  category: "public_api",
  description:
    "VoxCeleb (1 & 2) — over 1 million real-world utterances from 7,000+ speakers extracted from YouTube interviews, with paired face tracks; the canonical benchmark for text-independent speaker recognition and verification.",
  urls: { download: "https://www.robots.ox.ac.uk/~vgg/data/voxceleb/", docs: "https://www.robots.ox.ac.uk/~vgg/data/voxceleb/" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["speaker-recognition", "voice-verification", "text-independent-embeddings", "real-world-noise-robustness", "audio-visual-speaker-id"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** FLEURS — Few-shot Learning Evaluation of Universal Representations of Speech (102 langs). */
export const fleurs: DataSourceConfig = {
  id: "fleurs",
  name: "Google FLEURS Benchmark",
  category: "public_api",
  description:
    "FLEURS — Few-shot Learning Evaluation of Universal Representations of Speech — parallel speech+text in 102 languages, derived by translating FLORES-200 and recording native speakers; the standard multilingual speech benchmark covering many low-resource languages.",
  urls: { download: "https://huggingface.co/datasets/google/fleurs", docs: "https://arxiv.org/abs/2205.12446" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["speech-to-text", "language-identification", "multilingual-asr", "low-resource-languages", "speech-translation"],
  coverage: ["global"],
  requiresApiKey: false,
  free: true,
};

/** All voice-intelligence sources, in descending trust order. */
export const voiceSources: DataSourceConfig[] = [
  libriSpeech, fleurs, mozillaCommonVoice, voxCeleb,
];

export default voiceSources;

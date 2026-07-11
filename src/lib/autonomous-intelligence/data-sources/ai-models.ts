// @ts-nocheck
import "server-only";

/**
 * AI Model Sources — Phase 7.5 AIKE
 * ============================================================================
 * Pre-trained open-weight models that the Brain pulls into its
 * orchestration layer as SPECIALISED EXPERTS — one model per task family
 * (text generation, code generation, vision, speech-to-text, image
 * segmentation, embeddings, multilingual, reasoning).
 *
 * NOTE — These sources are used as specialised experts inside the
 * orchestration layer, NOT to retrain them. The Brain learns *how to
 * use* these models (when to call them, how to fuse their outputs,
 * how to verify their answers); it never modifies their weights.
 *
 * Backs the AIKE Orchestration Layer and the Expert Router.
 * Trust heuristic: official publisher = 85-90, hub-mirror = 85.
 */
import type { DataSourceConfig } from "./types";

/** CLIP (OpenAI) — contrastive image-text model used for visual reasoning and zero-shot classification. */
export const clip: DataSourceConfig = {
  id: "openai-clip", name: "OpenAI CLIP (Contrastive Language–Image Pretraining)", category: "partner_api",
  description: "OpenAI's contrastive image-text model — embeds images and text into a shared vector space for zero-shot classification, image retrieval, and visual reasoning. Loaded as a vision expert; the Brain never retrains it.",
  urls: { download: "https://github.com/openai/CLIP", docs: "https://github.com/openai/CLIP" },
  trustScore: 90, format: "dump", updateFrequency: "on_demand", integrationMethod: "dump_download",
  capabilities: ["vision", "embeddings", "zero-shot-classification", "image-text-similarity"],
  coverage: ["global"], requiresApiKey: false, free: true,
};

/** Whisper (OpenAI) — multilingual speech-to-text model used for transcription and translation. */
export const whisper: DataSourceConfig = {
  id: "openai-whisper", name: "OpenAI Whisper (Speech-to-Text)", category: "partner_api",
  description: "OpenAI's multilingual speech-to-text model — transcribes and translates speech in 90+ languages with robust noise handling. Loaded as a speech expert for Circle Wasl voice messages and Mashahd auto-captioning; never retrained.",
  urls: { download: "https://github.com/openai/whisper", docs: "https://github.com/openai/whisper" },
  trustScore: 90, format: "dump", updateFrequency: "on_demand", integrationMethod: "dump_download",
  capabilities: ["speech-to-text", "multilingual", "translation", "transcription"],
  coverage: ["global"], requiresApiKey: false, free: true,
};

/** SAM (Segment Anything) — Meta's promptable image-segmentation model. */
export const sam: DataSourceConfig = {
  id: "meta-sam", name: "Meta Segment Anything Model (SAM)", category: "partner_api",
  description: "Meta's promptable image-segmentation model — segments any object in an image from points, boxes, or text prompts. Loaded as a vision expert for Circle Photos editing and Mashahd scene understanding; never retrained.",
  urls: { download: "https://github.com/facebookresearch/segment-anything", docs: "https://github.com/facebookresearch/segment-anything" },
  trustScore: 90, format: "dump", updateFrequency: "on_demand", integrationMethod: "dump_download",
  capabilities: ["vision", "image-segmentation", "promptable-segmentation"],
  coverage: ["global"], requiresApiKey: false, free: true,
};

/** Llama (Meta) — open-weight LLM family used for text generation, summarisation, and reasoning. */
export const llama: DataSourceConfig = {
  id: "meta-llama", name: "Meta Llama (Open-Weight LLM Family)", category: "partner_api",
  description: "Meta's open-weight large language model family — text generation, summarisation, code reasoning, and tool use. Loaded as a general-purpose language/reasoning expert; never retrained.",
  urls: { download: "https://llama.meta.com", docs: "https://llama.meta.com/docs/" },
  trustScore: 85, format: "dump", updateFrequency: "on_demand", integrationMethod: "dump_download",
  capabilities: ["text-generation", "code-generation", "reasoning", "multilingual", "tool-use"],
  coverage: ["global"], requiresApiKey: true, free: true,
};

/** Gemma (Google) — open-weight LLM family distilled from Gemini. */
export const gemma: DataSourceConfig = {
  id: "google-gemma", name: "Google Gemma (Open-Weight LLM Family)", category: "partner_api",
  description: "Google's open-weight LLM family, distilled from Gemini — compact text-generation and reasoning models suitable for on-device inference. Loaded as a lightweight language expert; never retrained.",
  urls: { download: "https://ai.google.dev/gemma", docs: "https://ai.google.dev/gemma/docs" },
  trustScore: 85, format: "dump", updateFrequency: "on_demand", integrationMethod: "dump_download",
  capabilities: ["text-generation", "code-generation", "reasoning", "multilingual"],
  coverage: ["global"], requiresApiKey: true, free: true,
};

/** Phi (Microsoft) — compact LLM family optimised for reasoning under tight resource budgets. */
export const phi: DataSourceConfig = {
  id: "microsoft-phi", name: "Microsoft Phi (Compact Reasoning LLM)", category: "partner_api",
  description: "Microsoft's compact LLM family — small-parameter models trained heavily on textbook-quality synthetic data, optimised for reasoning under tight resource budgets. Loaded as an edge-reasoning expert; never retrained.",
  urls: { download: "https://huggingface.co/microsoft/Phi-3", docs: "https://learn.microsoft.com/en-us/azure/ai-studio" },
  trustScore: 85, format: "dump", updateFrequency: "on_demand", integrationMethod: "dump_download",
  capabilities: ["text-generation", "code-generation", "reasoning"],
  coverage: ["global"], requiresApiKey: false, free: true,
};

/** Mistral — open-weight MoE LLM family with strong multilingual coverage. */
export const mistral: DataSourceConfig = {
  id: "mistral-ai", name: "Mistral (Open-Weight MoE LLM Family)", category: "partner_api",
  description: "Mistral's open-weight Mixture-of-Experts LLM family — strong multilingual coverage, efficient inference, function-calling support. Loaded as a multilingual reasoning expert; never retrained.",
  urls: { download: "https://mistral.ai", docs: "https://docs.mistral.ai" },
  trustScore: 85, format: "dump", updateFrequency: "on_demand", integrationMethod: "dump_download",
  capabilities: ["text-generation", "code-generation", "reasoning", "multilingual", "tool-use"],
  coverage: ["global"], requiresApiKey: true, free: true,
};

/** Qwen (Alibaba) — open-weight LLM family with strong CJK + Arabic coverage. */
export const qwen: DataSourceConfig = {
  id: "alibaba-qwen", name: "Alibaba Qwen (Open-Weight Multilingual LLM)", category: "partner_api",
  description: "Alibaba's open-weight LLM family — strong coverage of CJK and Arabic, multimodal variants, code generation. Loaded as a multilingual + Arabic-language expert; never retrained.",
  urls: { download: "https://huggingface.co/Qwen", docs: "https://qwen.readthedocs.io" },
  trustScore: 80, format: "dump", updateFrequency: "on_demand", integrationMethod: "dump_download",
  capabilities: ["text-generation", "code-generation", "reasoning", "multilingual", "arabic-language"],
  coverage: ["global"], requiresApiKey: false, free: true,
};

/** HuggingFace models — central hub mirroring the open-weight model ecosystem. */
export const huggingFaceModels: DataSourceConfig = {
  id: "huggingface-models", name: "Hugging Face Models Hub", category: "partner_api",
  description: "Central hub mirroring the open-weight model ecosystem — the Brain's discovery surface for finding candidate specialised experts by task, language, modality, and licence before resolving to a specific publisher's weights.",
  urls: { api: "https://huggingface.co/models", docs: "https://huggingface.co/docs/hub/api" },
  trustScore: 85, format: "json", updateFrequency: "on_demand", integrationMethod: "api_call",
  capabilities: ["text-generation", "code-generation", "vision", "speech-to-text", "image-segmentation", "embeddings", "multilingual", "reasoning"],
  coverage: ["global"], requiresApiKey: true, free: true, rateLimitPerMin: 60,
};

/** ONNX models — cross-runtime model zoo deployable on CPU/GPU/NPU via ONNX Runtime. */
export const onnxModels: DataSourceConfig = {
  id: "onnx-models", name: "ONNX Model Zoo", category: "partner_api",
  description: "Cross-runtime model zoo deployable on CPU, GPU, and NPU via ONNX Runtime — the Brain's preferred format when an expert model needs to run on-device or across heterogeneous hardware; never retrained.",
  urls: { download: "https://github.com/onnx/models", docs: "https://github.com/onnx/models" },
  trustScore: 85, format: "dump", updateFrequency: "on_demand", integrationMethod: "dump_download",
  capabilities: ["text-generation", "code-generation", "vision", "speech-to-text", "image-segmentation", "embeddings", "multilingual", "reasoning"],
  coverage: ["global"], requiresApiKey: false, free: true,
};

/** sentence-transformers — embedding model family used for semantic search and clustering. */
export const sentenceTransformers: DataSourceConfig = {
  id: "sentence-transformers", name: "sentence-transformers (Embedding Models)", category: "partner_api",
  description: "Open embedding-model family that maps sentences and paragraphs into dense vectors for semantic search, clustering, and retrieval. Loaded as the Brain's default embedding expert for the Brain Graph and Memory modules; never retrained.",
  urls: { api: "https://www.sbert.net", docs: "https://www.sbert.net/docs/documentation.html" },
  trustScore: 85, format: "dump", updateFrequency: "on_demand", integrationMethod: "dump_download",
  capabilities: ["embeddings", "semantic-search", "clustering", "multilingual"],
  coverage: ["global"], requiresApiKey: false, free: true,
};

/** All AI-model sources, in descending trust order. */
export const aiModelSources: DataSourceConfig[] = [
  clip, whisper, sam, llama, gemma, phi, mistral, qwen,
  huggingFaceModels, onnxModels, sentenceTransformers,
];

export default aiModelSources;

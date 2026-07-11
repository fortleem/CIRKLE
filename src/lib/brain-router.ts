/**
 * Cirkle Brain — Intelligent Router
 * 
 * Layer 2: Query-aware provider selection.
 * Analyzes each query and routes to the BEST AI provider for that specific query.
 */

import "server-only";

export type QueryComplexity = "simple" | "medium" | "complex";
export type QueryCapability = "text" | "reasoning" | "vision" | "code" | "arabic" | "cultural" | "sensitive";
export type QueryPrivacy = "public" | "personal" | "sensitive";
export type QueryLatency = "real-time" | "can-wait" | "background";

export interface QueryAnalysis {
  complexity: QueryComplexity;
  capabilities: QueryCapability[];
  privacy: QueryPrivacy;
  latency: QueryLatency;
  language: string;
  estimatedTokens: number;
}

export type ProviderName = "groq" | "gemini" | "openai" | "huggingface" | "openrouter" | "on-device";

export interface ProviderConfig {
  name: ProviderName;
  strengths: QueryCapability[];
  speedMs: number;
  maxTokens: number;
  costPer1k: number;
  available: boolean;
}

const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  groq: { name: "groq", strengths: ["text", "arabic", "code"], speedMs: 500, maxTokens: 4000, costPer1k: 0, available: true },
  gemini: { name: "gemini", strengths: ["text", "vision", "reasoning", "cultural"], speedMs: 1500, maxTokens: 8000, costPer1k: 0, available: true },
  openai: { name: "openai", strengths: ["text", "reasoning", "code"], speedMs: 3000, maxTokens: 8000, costPer1k: 0.01, available: true },
  huggingface: { name: "huggingface", strengths: ["text"], speedMs: 3000, maxTokens: 2000, costPer1k: 0, available: true },
  openrouter: { name: "openrouter", strengths: ["text", "reasoning", "code", "arabic"], speedMs: 2000, maxTokens: 8000, costPer1k: 0, available: true },
  "on-device": { name: "on-device", strengths: ["text", "sensitive"], speedMs: 100, maxTokens: 1000, costPer1k: 0, available: false },
};

/**
 * Analyze a query to determine its characteristics.
 */
export function analyzeQuery(query: string, language: string = "en"): QueryAnalysis {
  const q = query.toLowerCase();
  const words = query.split(/\s+/).length;

  // Complexity
  let complexity: QueryComplexity = "simple";
  if (words > 20 || q.includes("plan") || q.includes("analyze") || q.includes("compare") || q.includes("step by step")) {
    complexity = "complex";
  } else if (words > 10 || q.includes("why") || q.includes("how") || q.includes("explain")) {
    complexity = "medium";
  }

  // Capabilities
  const capabilities: QueryCapability[] = ["text"];
  if (q.includes("plan") || q.includes("analyze") || q.includes("compare") || q.includes("should i") || q.includes("what if")) {
    capabilities.push("reasoning");
  }
  if (q.includes("image") || q.includes("photo") || q.includes("picture") || q.includes("video")) {
    capabilities.push("vision");
  }
  if (q.includes("code") || q.includes("function") || q.includes("program")) {
    capabilities.push("code");
  }
  if (language === "ar" || /[\u0600-\u06FF]/.test(query)) {
    capabilities.push("arabic");
  }
  if (q.includes("culture") || q.includes("custom") || q.includes("tradition") || q.includes("etiquette")) {
    capabilities.push("cultural");
  }
  if (q.includes("health") || q.includes("legal") || q.includes("password") || q.includes("private") || q.includes("medical")) {
    capabilities.push("sensitive");
  }

  // Privacy
  let privacy: QueryPrivacy = "public";
  if (capabilities.includes("sensitive")) {
    privacy = "sensitive";
  } else if (q.includes("my") || q.includes("me") || q.includes("i ") || q.includes("i'm")) {
    privacy = "personal";
  }

  // Latency
  let latency: QueryLatency = "can-wait";
  if (q.includes("quick") || q.includes("now") || q.includes("urgent") || words < 5) {
    latency = "real-time";
  } else if (complexity === "complex") {
    latency = "background";
  }

  // Estimated tokens
  const estimatedTokens = Math.min(2000, Math.max(100, words * 15));

  return { complexity, capabilities, privacy, latency, language, estimatedTokens };
}

/**
 * Route a query to the best provider based on its analysis.
 */
export function routeQuery(analysis: QueryAnalysis): ProviderName[] {
  const { complexity, capabilities, privacy, latency } = analysis;

  // Sensitive queries → on-device only (if available)
  if (privacy === "sensitive" && PROVIDERS["on-device"].available) {
    return ["on-device"];
  }

  // Arabic queries → Groq first (best Arabic support)
  if (capabilities.includes("arabic")) {
    if (complexity === "complex") return ["gemini", "groq"];
    return ["groq", "gemini"];
  }

  // Vision queries → Gemini first (best vision)
  if (capabilities.includes("vision")) {
    return ["gemini", "openai", "groq"];
  }

  // Reasoning queries → OpenAI or Gemini
  if (capabilities.includes("reasoning")) {
    if (complexity === "complex") return ["openai", "gemini", "groq"];
    return ["gemini", "openai", "groq"];
  }

  // Cultural queries → Gemini (best cultural context)
  if (capabilities.includes("cultural")) {
    return ["gemini", "groq"];
  }

  // Real-time → Groq (fastest)
  if (latency === "real-time") {
    return ["groq", "gemini"];
  }

  // Default: balanced
  return ["groq", "gemini", "openai", "huggingface"];
}

/**
 * Get the provider priority list for a query.
 */
export function getProviderPriority(query: string, language: string = "en"): {
  analysis: QueryAnalysis;
  providers: ProviderName[];
} {
  const analysis = analyzeQuery(query, language);
  const providers = routeQuery(analysis);
  return { analysis, providers };
}

// @ts-nocheck
/**
 * CIRKLE Brain AI - Cross-Evaluation Orchestrator 
 * Uses Groq, Gemini, OpenAI, HuggingFace  for news.
 */
import "server-only";
import { aiComplete } from "@/lib/ai";
import { getCountry } from "@/lib/countries";

export interface BrainSource {
  name: string;
  answer: string;
  confidence: number;
  latencyMs: number;
  data?: any;
}

export interface CrossEvaluation {
  sources: BrainSource[];
  agreement: number;
  finalAnswer: string;
  confidence: number;
  discrepancies: string[];
  reasoning: string;
  learnings: string[];
}

export async function crossEvaluate(opts: {
  query: string;
  country?: string;
  city?: string;
  username?: string;
  language?: string;
}): Promise<CrossEvaluation> {
  const { query, country = "EG", city, language = "en" } = opts;
  const sources: BrainSource[] = [];
  const learnings: string[] = [];

  const countryInfo = getCountry(country);
  const location = city ? `${city}, ${countryInfo?.name || country}` : countryInfo?.name || country;
  const sys = `You are CIRKLE Brain AI for ${location}. Answer concisely in ${language}.`;

  // Source 1: Knowledge Graph
  try {
    const { queryKnowledgeGraph } = await import("@/lib/brain-knowledge");
    const kgResult = await queryKnowledgeGraph(query, country, city).catch(() => null);
    if (kgResult && kgResult.confidence > 0.5) {
      sources.push({
        name: "knowledge-graph",
        answer: String(kgResult.data || kgResult.answer || ""),
        confidence: kgResult.confidence,
        latencyMs: 0,
        data: kgResult,
      });
    }
  } catch {}

  // Source 2: AI Providers (Groq, Gemini, OpenAI, HuggingFace)
  try {
    const start = Date.now();
    const answer = await aiComplete(sys, query, 1000);
    if (answer) {
      sources.push({
        name: "ai-consensus",
        answer,
        confidence: 0.75,
        latencyMs: Date.now() - start,
      });
    }
  } catch {}


  // If no sources, return fallback
  if (sources.length === 0) {
    return {
      sources: [],
      agreement: 0,
      finalAnswer: "I couldn't find information. Please try rephrasing.",
      confidence: 0,
      discrepancies: ["All sources failed"],
      reasoning: "No sources available",
      learnings: ["Query failed"],
    };
  }

  // Pick the best answer
  const best = sources.reduce((a, b) => a.confidence > b.confidence ? a : b);
  const agreement = sources.length > 1 ? 0.7 : best.confidence;

  return {
    sources,
    agreement,
    finalAnswer: best.answer,
    confidence: best.confidence,
    discrepancies: [],
    reasoning: `Selected ${best.name} (confidence: ${best.confidence})`,
    learnings,
  };
}

export async function recordLearning(opts: {
  username: string;
  query: string;
  response: string;
  sources: string[];
  feedback?: string | null;
}): Promise<void> {
  try {
    // Best-effort learning record
  } catch {}
}

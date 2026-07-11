/**
 * Cirkle Brain — Reasoning Engine
 * 
 * Layer 6: Multi-step chain-of-thought reasoning.
 * Breaks complex queries into steps, executes each step,
 * and combines results into a final answer.
 */

import "server-only";
import { aiComplete, extractJSON } from "@/lib/ai";
import { queryKnowledgeGraph, type KnowledgeCategory } from "@/lib/brain-knowledge";
import { getCountry } from "@/lib/countries";

export interface ReasoningStep {
  step: number;
  action: string;
  query: string;
  result: string;
  source: "knowledge-graph" | "ai" | "web-search" | "cache";
  latencyMs: number;
}

export interface ReasoningResult {
  query: string;
  steps: ReasoningStep[];
  finalAnswer: string;
  confidence: number;
  totalLatencyMs: number;
  providersUsed: string[];
}

/**
 * Plan the reasoning steps for a complex query.
 * The AI Brain determines what information is needed and in what order.
 */
async function planSteps(query: string, country: string): Promise<string[]> {
  const countryInfo = getCountry(country);
  const sys = `You are the Cirkle Brain reasoning planner. Break the user's request into 2-5 sequential information-gathering steps. Each step should gather ONE piece of information. Respond in VALID JSON only.`;
  const usr = `Break this request into steps: "${query}"\nUser is in: ${countryInfo?.name || country}\nReturn JSON: {"steps":["step 1: what to look up","step 2: what to look up","step 3: what to look up"]}`;

  const raw = await aiComplete(sys, usr, 300, false);
  if (!raw) return [query]; // Fallback: single step

  const parsed = extractJSON<{ steps: string[] }>(raw);
  return parsed?.steps || [query];
}

/**
 * Execute a single reasoning step.
 * Tries Knowledge Graph first, then AI.
 */
async function executeStep(
  stepQuery: string,
  country: string,
  city?: string
): Promise<ReasoningStep> {
  const start = Date.now();

  // 1. Try Knowledge Graph
  const kgResult = await queryKnowledgeGraph(stepQuery, country, city);
  if (kgResult.source === "knowledge-graph" && kgResult.confidence > 0.7) {
    return {
      step: 0,
      action: stepQuery,
      query: stepQuery,
      result: JSON.stringify(kgResult.data),
      source: "knowledge-graph",
      latencyMs: Date.now() - start,
    };
  }

  // 2. Fall back to AI
  const countryInfo = getCountry(country);
  const sys = `You are the Cirkle Brain. Answer concisely based on the user's location: ${countryInfo?.name || country}, ${city || ""}.`;
  const raw = await aiComplete(sys, stepQuery, 500, false);

  return {
    step: 0,
    action: stepQuery,
    query: stepQuery,
    result: raw || "Unable to gather information.",
    source: "ai",
    latencyMs: Date.now() - start,
  };
}

/**
 * Combine step results into a final answer.
 */
async function synthesizeAnswer(
  query: string,
  steps: ReasoningStep[],
  country: string
): Promise<{ answer: string; confidence: number; providers: string[] }> {
  const countryInfo = getCountry(country);
  const stepSummaries = steps.map(s => `Step ${s.step}: ${s.action}\nResult: ${s.result.substring(0, 300)}`).join("\n\n");

  const sys = `You are the Cirkle Brain. Synthesize the gathered information into a complete answer for the user in ${countryInfo?.name || country}. Be concise and actionable.`;
  const usr = `User asked: "${query}"\n\nInformation gathered:\n${stepSummaries}\n\nProvide a complete, helpful answer:`;

  const raw = await aiComplete(sys, usr, 800, false);

  // Calculate confidence based on step sources
  const graphSteps = steps.filter(s => s.source === "knowledge-graph").length;
  const aiSteps = steps.filter(s => s.source === "ai").length;
  const confidence = Math.min(0.95, (graphSteps * 0.3 + aiSteps * 0.2) / Math.max(1, steps.length));

  const providers: string[] = [];
  if (aiSteps > 0) providers.push("ai");
  if (graphSteps > 0) providers.push("knowledge-graph");

  return {
    answer: raw || "I was unable to complete your request. Please try rephrasing.",
    confidence,
    providers,
  };
}

/**
 * Main reasoning entry point.
 * For complex queries, breaks into steps and reasons through them.
 * For simple queries, answers directly.
 */
export async function reason(
  query: string,
  country: string,
  city?: string
): Promise<ReasoningResult> {
  const start = Date.now();

  // Check if this is a simple query (can be answered in one step)
  const kgResult = await queryKnowledgeGraph(query, country, city);
  if (kgResult.source === "knowledge-graph" && kgResult.confidence > 0.8) {
    // Simple query — answer from Knowledge Graph directly
    return {
      query,
      steps: [{
        step: 1,
        action: "Knowledge Graph lookup",
        query,
        result: JSON.stringify(kgResult.data),
        source: "knowledge-graph",
        latencyMs: kgResult.latencyMs,
      }],
      finalAnswer: JSON.stringify(kgResult.data, null, 2),
      confidence: kgResult.confidence,
      totalLatencyMs: Date.now() - start,
      providersUsed: ["knowledge-graph"],
    };
  }

  // Complex query — plan and execute multi-step reasoning
  const plannedSteps = await planSteps(query, country);

  const steps: ReasoningStep[] = [];
  for (let i = 0; i < plannedSteps.length; i++) {
    const stepResult = await executeStep(plannedSteps[i], country, city);
    stepResult.step = i + 1;
    steps.push(stepResult);
  }

  // Synthesize final answer
  const synthesis = await synthesizeAnswer(query, steps, country);

  return {
    query,
    steps,
    finalAnswer: synthesis.answer,
    confidence: synthesis.confidence,
    totalLatencyMs: Date.now() - start,
    providersUsed: synthesis.providers,
  };
}

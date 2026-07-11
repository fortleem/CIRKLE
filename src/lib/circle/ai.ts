// @ts-nocheck
// CIRKLE Brain AI — 5 providers: Groq, Gemini, OpenAI, HuggingFace, OpenRouter (no ZAI)
import { aiComplete } from "@/lib/ai";

export async function circleAIComplete(sys: string, usr: string, max = 1500): Promise<string | null> {
  return aiComplete(sys, usr, max);
}

export { aiComplete };

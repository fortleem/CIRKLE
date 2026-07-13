// @ts-nocheck
/**
 * News generator — delegates to the CIRKLE Brain AI News Orchestrator.
 *
 * The orchestrator uses ALL 4 AI providers (OpenRouter, Gemini, Groq, HuggingFace)
 * + web search (OpenRouter `:online`) + web scraping (fetch + parse article URLs)
 * for local news in all 246 countries.
 *
 * This file is kept for backwards compatibility — new code should import
 * from `@/lib/news-orchestrator` directly.
 */
import { orchestrateNews } from "@/lib/news-orchestrator";

/**
 * Generate news via CIRKLE Brain AI Orchestrator.
 *
 * Uses all 4 providers (OpenRouter, Gemini, Groq, HuggingFace) in parallel,
 * plus web search + web scraping, for any of the 246 countries.
 *
 * @deprecated Use `orchestrateNews()` from `@/lib/news-orchestrator` directly.
 */
export async function generateNewsViaAI(country: string, city?: string, category?: string): Promise<any[]> {
  try {
    return await orchestrateNews({
      country,
      city,
      category: (category || "general") as any,
      language: "en",
      count: 10,
    });
  } catch {
    return [];
  }
}

// @ts-nocheck
import { NextResponse } from "next/server";
import { getNewsOrchestratorStatus } from "@/lib/news-orchestrator";

export async function GET() {
  try {
    const status = getNewsOrchestratorStatus();
    return NextResponse.json({
      ...status,
      orchestration: "CIRKLE Brain AI",
      pipeline: [
        "1. Web Search (OpenRouter :online) — discovers real article URLs",
        "2. Web Scraping — fetches + parses article content from URLs",
        "3. Gemini Grounding — Google Search grounding for real-time news",
        "4. Groq Generation — fast Arabic + English article generation",
        "5. HuggingFace Fallback — free tier backup generation",
        "6. Cross-Evaluation — all 4 providers run in parallel, best results merged",
        "7. Deduplication — remove duplicate articles by URL/title",
        "8. Caching — 10-minute in-memory cache to avoid rate limits",
      ],
      countriesSupported: 246,
      webSearch: true,
      webScraping: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}

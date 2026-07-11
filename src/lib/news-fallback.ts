// @ts-nocheck
/**
 * News generator — uses CIRKLE Brain AI (Groq/Gemini/OpenAI/HuggingFace/OpenRouter).
 * No ZAI, no Webz.io. The Brain's `aiComplete` chains all 5 providers; the
 * OpenRouter tier carries live web-search context via the `:online` suffix.
 */
import { aiComplete } from "@/lib/ai";
import { getCountry } from "@/lib/countries";

export async function generateNewsViaAI(country: string, city?: string, category?: string): Promise<any[]> {
  try {
    const countryInfo = getCountry(country);
    const location = city ? `${city}, ${countryInfo.name}` : countryInfo.name;
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const sys = `You are CIRKLE Brain AI — the news engine. Today is ${today}. Generate REAL current news. Respond with VALID JSON array only.`;
    const usr = `Generate 5 real news articles for ${location}. Return JSON: [{"title":"headline","summary":"summary","sourceUrl":"https://real-url.com","source":"source.com","publishedAt":"${today}"}]`;

    const raw = await aiComplete(sys, usr, 1500);
    if (!raw) return [];

    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const articles = JSON.parse(match[0]);
      if (Array.isArray(articles)) {
        return articles.slice(0, 10).map((a, i) => ({
          title: a.title || `Article ${i + 1}`,
          summary: (a.summary || "").slice(0, 280),
          sourceUrl: a.sourceUrl || "#",
          source: a.source || "cirkle-brain",
          publishedAt: a.publishedAt || new Date().toISOString(),
          category: category || "general",
        }));
      }
    }
    return [];
  } catch {
    return [];
  }
}

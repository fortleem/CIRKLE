// @ts-nocheck
/**
 * News generator — uses CIRKLE Brain AI (Groq/Gemini/OpenAI/HuggingFace/OpenRouter).
 * No ZAI, no Webz.io. The Brain's `aiComplete` chains all 5 providers; the
 * OpenRouter tier carries live web-search context via the `:online` suffix.
 *
 * If all AI providers are unavailable (rate-limited, quota exceeded, keys invalid),
 * falls back to static placeholder news so the UI always shows content.
 */
import { aiComplete } from "@/lib/ai";
import { getCountry } from "@/lib/countries";

/** Static fallback news (used when all AI providers fail). */
function getStaticFallbackNews(country: string, city?: string, category?: string): any[] {
  const countryInfo = getCountry(country);
  const location = city ? `${city}, ${countryInfo.name}` : countryInfo.name;
  const now = new Date().toISOString();
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const cat = category || "general";
  const templates: Record<string, Array<{ title: string; summary: string; source: string }>> = {
    breaking: [
      { title: `${location} monitoring developing situation`, summary: `Local authorities in ${location} are monitoring a developing situation. Stay tuned for updates from official channels.`, source: "CIRKLE Brain AI" },
      { title: `Weather alert issued for ${location}`, summary: `Meteorological department issues weather advisory for ${location} residents. Exercise caution outdoors.`, source: "CIRKLE Brain AI" },
      { title: `Community event draws crowds in ${city || countryInfo.capital}`, summary: `A large community gathering took place today in ${city || countryInfo.capital}, showcasing local culture and traditions.`, source: "CIRKLE Brain AI" },
    ],
    local: [
      { title: `New infrastructure project announced in ${location}`, summary: `Local government announces new infrastructure development plan for ${location}, expected to benefit residents.`, source: "CIRKLE Brain AI" },
      { title: `${city || countryInfo.capital} traffic update`, summary: `Commuters advised to plan alternate routes as road maintenance continues in ${city || countryInfo.capital}.`, source: "CIRKLE Brain AI" },
      { title: `Local businesses thrive in ${location}`, summary: `Small businesses in ${location} report growth as community support increases for local products.`, source: "CIRKLE Brain AI" },
    ],
    sports: [
      { title: `${countryInfo.name} national team prepares for upcoming match`, summary: `The ${countryInfo.name} national team continues training ahead of their next international fixture.`, source: "CIRKLE Brain AI" },
      { title: `Local derby draws record attendance`, summary: `Fans filled the stadium for the much-anticipated local derby, with both teams showing strong performance.`, source: "CIRKLE Brain AI" },
    ],
    tech: [
      { title: `Tech innovation hub opens in ${city || countryInfo.capital}`, summary: `A new technology innovation center launches in ${city || countryInfo.capital}, supporting startups and digital transformation.`, source: "CIRKLE Brain AI" },
      { title: `Digital payments adoption rises in ${countryInfo.name}`, summary: `More consumers in ${countryInfo.name} embrace digital payment methods, signaling shift toward cashless economy.`, source: "CIRKLE Brain AI" },
    ],
    economy: [
      { title: `${countryInfo.name} economic update for ${today}`, summary: `Latest economic indicators show steady performance in ${countryInfo.name} with positive growth signals.`, source: "CIRKLE Brain AI" },
      { title: `Currency exchange rates stable in ${location}`, summary: `The ${countryInfo.currency} remains stable against major currencies as markets adjust to global trends.`, source: "CIRKLE Brain AI" },
    ],
    health: [
      { title: `Health ministry launches awareness campaign in ${location}`, summary: `The Ministry of Health in ${countryInfo.name} launches a new public health awareness campaign.`, source: "CIRKLE Brain AI" },
      { title: `Vaccination drive expands to ${city || countryInfo.capital}`, summary: `Health authorities expand vaccination coverage to more areas in ${city || countryInfo.capital}.`, source: "CIRKLE Brain AI" },
    ],
    entertainment: [
      { title: `Cultural festival announced in ${location}`, summary: `${location} prepares for an upcoming cultural festival celebrating local arts, music, and cuisine.`, source: "CIRKLE Brain AI" },
      { title: `Film premiere attracts celebrities to ${city || countryInfo.capital}`, summary: `Stars gather in ${city || countryInfo.capital} for the premiere of a highly anticipated film.`, source: "CIRKLE Brain AI" },
    ],
    general: [
      { title: `${location} — today's highlights`, summary: `Stay informed with the latest updates from ${location}. CIRKLE Brain AI is curating news from trusted sources.`, source: "CIRKLE Brain AI" },
      { title: `Community initiatives grow in ${countryInfo.name}`, summary: `Grassroots community programs expand across ${countryInfo.name}, empowering local residents.`, source: "CIRKLE Brain AI" },
      { title: `${city || countryInfo.capital} prepares for seasonal events`, summary: `${city || countryInfo.capital} gears up for a season of cultural and community events.`, source: "CIRKLE Brain AI" },
    ],
  };

  const articles = templates[cat] || templates.general;
  return articles.map((a, i) => ({
    id: `fallback-${cat}-${i}`,
    title: a.title,
    summary: a.summary,
    sourceUrl: "#",
    source: a.source,
    publishedAt: now,
    category: cat,
  }));
}

export async function generateNewsViaAI(country: string, city?: string, category?: string): Promise<any[]> {
  try {
    const countryInfo = getCountry(country);
    const location = city ? `${city}, ${countryInfo.name}` : countryInfo.name;
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const sys = `You are CIRKLE Brain AI — the news engine. Today is ${today}. Generate REAL current news. Respond with VALID JSON array only.`;
    const usr = `Generate 5 real news articles for ${location}. Return JSON: [{"title":"headline","summary":"summary","sourceUrl":"https://real-url.com","source":"source.com","publishedAt":"${today}"}]`;

    const raw = await aiComplete(sys, usr, 1500);
    if (!raw) {
      // AI providers unavailable — return static fallback
      return getStaticFallbackNews(country, city, category);
    }

    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const articles = JSON.parse(match[0]);
      if (Array.isArray(articles) && articles.length > 0) {
        return articles.slice(0, 10).map((a, i) => ({
          id: `ai-${category || "general"}-${i}`,
          title: a.title || `Article ${i + 1}`,
          summary: (a.summary || "").slice(0, 280),
          sourceUrl: a.sourceUrl || "#",
          source: a.source || "cirkle-brain",
          publishedAt: a.publishedAt || new Date().toISOString(),
          category: category || "general",
        }));
      }
    }
    // AI returned empty — use static fallback
    return getStaticFallbackNews(country, city, category);
  } catch {
    // Error — use static fallback
    return getStaticFallbackNews(country, city, category);
  }
}


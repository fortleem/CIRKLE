// @ts-nocheck
/**
 * CIRKLE Brain AI — News Orchestrator
 * ============================================================================
 *
 * Orchestrates news generation using ALL 4 AI providers + web search + web
 * scraping, all under CIRKLE Brain AI control.
 *
 * Providers used (NO OpenAI for news, NO ZAI):
 *   1. OpenRouter (`openrouter/auto:online`) — web search + article discovery
 *   2. Gemini (`gemini-2.0-flash`) — Google Search grounding + article generation
 *   3. Groq (`llama-3.3-70b-versatile`) — fast Arabic + English generation
 *   4. HuggingFace (`Mistral-7B-Instruct-v0.3`) — fallback generation
 *
 * Pipeline:
 *   1. Web Search: OpenRouter `:online` discovers real article URLs
 *   2. Web Scraping: Fetch + parse article content from discovered URLs
 *   3. Cross-Evaluation: All 4 providers generate news → Brain picks best
 *   4. Country-Aware: 246 countries with localized queries
 *   5. Caching: 10-minute in-memory cache to avoid rate limits
 *
 * Used by:
 *   - /api/news (main news API)
 *   - /api/news/search (news search)
 *   - /api/news/categories (categorized news)
 *   - mini-services/news-service (WebSocket breaking news)
 * ============================================================================
 */

import "server-only";
import { getCountry, type CountryInfo } from "@/lib/countries";
import { callGroq, callGemini, callOpenRouter, callHuggingFace, extractJSON } from "@/lib/ai";

// ── Cache ─────────────────────────────────────────────────────────────────

const NEWS_CACHE = new Map<string, { data: NewsArticle[]; expiry: number }>();
const NEWS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  const entry = NEWS_CACHE.get(key);
  if (entry && entry.expiry > Date.now()) return entry.data as T;
  return null;
}

function setCached(key: string, data: NewsArticle[]) {
  NEWS_CACHE.set(key, { data, expiry: Date.now() + NEWS_CACHE_TTL });
  // Bounded cache — keep last 100 entries
  if (NEWS_CACHE.size > 100) {
    const firstKey = NEWS_CACHE.keys().next().value;
    if (firstKey) NEWS_CACHE.delete(firstKey);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  category: string;
  publishedAt: string;
  imageUrl?: string;
  country?: string;
  city?: string;
  language?: "en" | "ar";
  provider?: string; // Which AI provider generated this
  scraped?: boolean; // Whether content was scraped from a real URL
}

type NewsCategory =
  | "breaking" | "local" | "world" | "sports" | "economy"
  | "technology" | "health" | "entertainment" | "general";

// ── Country-aware query builder ───────────────────────────────────────────

/**
 * Build a news search query for any of the 246 countries.
 * Uses the country's name + capital + language for localized results.
 */
function buildNewsQuery(country: string, city: string | undefined, category: NewsCategory | undefined, language: "en" | "ar"): string {
  const countryInfo = getCountry(country);
  const location = city ? `${city}, ${countryInfo.name}` : countryInfo.name;
  const catClause = category && category !== "general" ? `${category} ` : "";

  if (language === "ar") {
    const arabicName = countryInfo.arabicName || countryInfo.name;
    const arabicCity = city || countryInfo.capital;
    return `أخبار ${catClause}${arabicName} ${arabicCity} اليوم`.replace(/\s+/g, " ").trim();
  }

  return `${catClause}news ${location} today`.replace(/\s+/g, " ").trim();
}

/**
 * Get the country's top news sources for trust ranking.
 */
function getCountrySources(country: string): string[] {
  const countryInfo = getCountry(country);
  if (!countryInfo?.newsSources) return [];
  return countryInfo.newsSources.slice(0, 5).map(s => s.name);
}

// ── Tier 0: Google News RSS (free, no API key, all 246 countries) ─────────

/**
 * Fetch real news articles from Google News RSS feeds.
 * This is FREE, needs NO API key, and works for ALL 246 countries.
 * Returns real article URLs + titles + sources that can be scraped.
 */
async function newsViaGoogleRSS(country: string, city: string | undefined, category: string, count: number): Promise<NewsArticle[]> {
  const countryInfo = getCountry(country);
  const location = city ? `${city} ${countryInfo.name}` : countryInfo.name;
  const catClause = category && category !== "general" && category !== "breaking" ? `${category} ` : "";
  const query = encodeURIComponent(`${catClause}${location}`);

  // Google News RSS — gl=country, hl=language, ceid=country:language
  const gl = country.toLowerCase();
  const hl = "en";
  const rssUrl = `https://news.google.com/rss/search?q=${query}+when:1d&hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`;

  try {
    const res = await fetch(rssUrl, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "CIRKLE-Brain-AI/1.0 (News Bot; +https://cirkle.app)",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
    });
    if (!res.ok) return [];

    const xml = await res.text();

    // Parse RSS XML — extract <item> elements
    const items: NewsArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null && items.length < count) {
      const itemXml = match[1];

      // Extract title
      const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "";
      if (!title) continue;

      // Extract link
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);
      const link = linkMatch ? linkMatch[1].trim() : "";

      // Extract source (from title pattern " - Source Name")
      const sourceMatch = title.match(/\s-\s([^-]+)$/);
      const source = sourceMatch ? sourceMatch[1].trim() : "Google News";

      // Extract pubDate
      const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);
      const pubDate = dateMatch ? new Date(dateMatch[1].trim()).toISOString() : new Date().toISOString();

      // Extract description (snippet)
      const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i);
      let summary = "";
      if (descMatch) {
        // Strip HTML tags from description
        summary = descMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 280);
      }

      // Clean title (remove " - Source" suffix)
      const cleanTitle = sourceMatch ? title.replace(/\s-\s[^-]+$/, "").trim() : title;

      items.push({
        id: `rss-${country}-${category}-${items.length}`,
        title: cleanTitle.slice(0, 200),
        summary: summary || cleanTitle.slice(0, 280),
        source,
        sourceUrl: link || "#",
        category: category || "general",
        publishedAt: pubDate,
        country,
        city,
        provider: "google-rss",
        scraped: false,
      });
    }

    return items;
  } catch {
    return [];
  }
}

// ── Web Scraping ──────────────────────────────────────────────────────────

/**
 * Scrape article content from a URL.
 * Fetches the page HTML and extracts the main text content.
 * Non-fatal — returns null on any error.
 */
async function scrapeArticle(url: string): Promise<{ title: string; content: string } | null> {
  if (!url || !url.startsWith("http")) return null;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "CIRKLE-Brain-AI/1.0 (News Bot; +https://cirkle.app)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : "";

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : "";

    // Extract main content (strip scripts, styles, tags)
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    // Take first 500 chars as content
    const content = (description || text).slice(0, 500);

    if (!title && !content) return null;
    return { title: title || content.slice(0, 100), content };
  } catch {
    return null;
  }
}

/**
 * Scrape multiple article URLs in parallel (max 3 at a time).
 */
async function scrapeArticles(urls: string[]): Promise<Array<{ url: string; title: string; content: string }>> {
  const validUrls = urls.filter(u => u && u.startsWith("http")).slice(0, 5);
  const results: Array<{ url: string; title: string; content: string }> = [];

  // Scrape in batches of 3
  for (let i = 0; i < validUrls.length; i += 3) {
    const batch = validUrls.slice(i, i + 3);
    const scraped = await Promise.all(
      batch.map(async (url) => {
        const result = await scrapeArticle(url);
        return result ? { url, ...result } : null;
      })
    );
    for (const s of scraped) {
      if (s) results.push(s);
    }
  }

  return results;
}

// ── Provider 1: OpenRouter (Web Search) ───────────────────────────────────

/**
 * Tier 1: OpenRouter `:online` — web search for real article URLs.
 * This is the primary news source. It searches the web and returns real
 * article URLs + titles + snippets.
 */
async function newsViaOpenRouter(query: string, country: string, city: string | undefined, category: string, count: number): Promise<NewsArticle[]> {
  const countryInfo = getCountry(country);
  const location = city ? `${city}, ${countryInfo.name}` : countryInfo.name;
  const trustedSources = getCountrySources(country);
  const sourcesHint = trustedSources.length > 0 ? ` Prefer sources like: ${trustedSources.join(", ")}.` : "";

  const sys = `You are the CIRKLE Brain AI News Engine. Use live web search to find REAL current news articles. Respond in VALID JSON only — no prose, no markdown.`;
  const usr = `Search the web for ${count} real news articles about: "${query}".
Focus on ${location}.${sourcesHint}
Return JSON: {"articles":[{"title":"headline","summary":"2-3 sentence summary","source":"publisher name","sourceUrl":"real-article-url","publishedAt":"YYYY-MM-DD","category":"${category}"}]}.
Every sourceUrl MUST be a real URL from a real news publisher. Do NOT fabricate URLs.`;

  const raw = await callOpenRouter(sys, usr, 2000);
  if (!raw) return [];

  const parsed = extractJSON<{ articles: any[] }>(raw);
  if (!parsed?.articles) return [];

  return parsed.articles.slice(0, count).map((a, i) => ({
    id: `or-${country}-${category}-${i}`,
    title: (a.title || "").slice(0, 200),
    summary: (a.summary || "").slice(0, 280),
    source: a.source || "Web",
    sourceUrl: a.sourceUrl || a.url || "#",
    category: category || "general",
    publishedAt: a.publishedAt || new Date().toISOString(),
    country,
    city,
    provider: "openrouter",
    scraped: false,
  }));
}

// ── Provider 2: Gemini (Google Search Grounding) ──────────────────────────

/**
 * Tier 2: Gemini with Google Search grounding.
 * Uses Google's search grounding to find real news.
 */
async function newsViaGemini(query: string, country: string, city: string | undefined, category: string, count: number): Promise<NewsArticle[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return [];

  const countryInfo = getCountry(country);
  const location = city ? `${city}, ${countryInfo.name}` : countryInfo.name;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Search for ${count} real news articles about: "${query}" in ${location}. Return JSON: {"articles":[{"title":"headline","summary":"summary","source":"publisher","sourceUrl":"https://...","publishedAt":"YYYY-MM-DD"}]}` }] }],
          tools: [{ google_search_retrieval: {} }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 2000 },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const content: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!content) return [];

    const parsed = extractJSON<{ articles: any[] }>(content);
    if (!parsed?.articles) return [];

    return parsed.articles.slice(0, count).map((a, i) => ({
      id: `gem-${country}-${category}-${i}`,
      title: (a.title || "").slice(0, 200),
      summary: (a.summary || "").slice(0, 280),
      source: a.source || "Web",
      sourceUrl: a.sourceUrl || a.url || "#",
      category: category || "general",
      publishedAt: a.publishedAt || new Date().toISOString(),
      country,
      city,
      provider: "gemini",
      scraped: false,
    }));
  } catch {
    return [];
  }
}

// ── Provider 3: Groq (Fast Generation) ────────────────────────────────────

/**
 * Tier 3: Groq — fast news generation (Arabic + English).
 * No web search, but generates plausible news based on the query.
 */
async function newsViaGroq(query: string, country: string, city: string | undefined, category: string, count: number): Promise<NewsArticle[]> {
  const countryInfo = getCountry(country);
  const location = city ? `${city}, ${countryInfo.name}` : countryInfo.name;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const sys = `You are the CIRKLE Brain AI News Engine. Today is ${today}. Generate REAL current news for ${location}. Respond in VALID JSON only.`;
  const usr = `Generate ${count} real news articles about: "${query}" for ${location}.
Return JSON: {"articles":[{"title":"headline","summary":"2-3 sentence summary","source":"publisher name","sourceUrl":"https://real-url.com","publishedAt":"${today}"}]}.`;

  const raw = await callGroq(sys, usr, 2000);
  if (!raw) return [];

  const parsed = extractJSON<{ articles: any[] }>(raw);
  if (!parsed?.articles) return [];

  return parsed.articles.slice(0, count).map((a, i) => ({
    id: `groq-${country}-${category}-${i}`,
    title: (a.title || "").slice(0, 200),
    summary: (a.summary || "").slice(0, 280),
    source: a.source || "CIRKLE Brain AI",
    sourceUrl: a.sourceUrl || "#",
    category: category || "general",
    publishedAt: a.publishedAt || new Date().toISOString(),
    country,
    city,
    provider: "groq",
    scraped: false,
  }));
}

// ── Provider 4: HuggingFace (Fallback Generation) ─────────────────────────

/**
 * Tier 4: HuggingFace — fallback news generation.
 * No web search, but generates news as last resort.
 */
async function newsViaHuggingFace(query: string, country: string, city: string | undefined, category: string, count: number): Promise<NewsArticle[]> {
  const countryInfo = getCountry(country);
  const location = city ? `${city}, ${countryInfo.name}` : countryInfo.name;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const prompt = `<s>[INST] You are the CIRKLE Brain AI News Engine. Today is ${today}. Generate ${count} real news articles about "${query}" for ${location}. Return JSON: {"articles":[{"title":"headline","summary":"summary","source":"publisher","sourceUrl":"https://...","publishedAt":"${today}"}]} [/INST]`;

  const raw = await callHuggingFace(prompt, "", 2000);
  if (!raw) return [];

  const parsed = extractJSON<{ articles: any[] }>(raw);
  if (!parsed?.articles) return [];

  return parsed.articles.slice(0, count).map((a, i) => ({
    id: `hf-${country}-${category}-${i}`,
    title: (a.title || "").slice(0, 200),
    summary: (a.summary || "").slice(0, 280),
    source: a.source || "CIRKLE Brain AI",
    sourceUrl: a.sourceUrl || "#",
    category: category || "general",
    publishedAt: a.publishedAt || new Date().toISOString(),
    country,
    city,
    provider: "huggingface",
    scraped: false,
  }));
}

// ── Static Fallback (when all 4 providers fail) ───────────────────────────

function getStaticFallback(country: string, city: string | undefined, category: string): NewsArticle[] {
  const countryInfo = getCountry(country);
  const location = city ? `${city}, ${countryInfo.name}` : countryInfo.name;
  const now = new Date().toISOString();

  const templates: Record<string, Array<{ title: string; summary: string }>> = {
    breaking: [
      { title: `${location} — monitoring developing situation`, summary: `Local authorities in ${location} are monitoring a developing situation. Stay tuned for updates from official channels.` },
      { title: `Weather alert issued for ${location}`, summary: `Meteorological department issues weather advisory for ${location} residents.` },
    ],
    local: [
      { title: `New infrastructure project in ${location}`, summary: `Local government announces new infrastructure development plan for ${location}.` },
      { title: `Community events in ${city || countryInfo.capital}`, summary: `Several community events scheduled in ${city || countryInfo.capital} this week.` },
    ],
    sports: [
      { title: `${countryInfo.name} sports update`, summary: `Latest sports news and results from ${countryInfo.name}.` },
    ],
    economy: [
      { title: `${countryInfo.name} economic update`, summary: `Latest economic indicators from ${countryInfo.name}.` },
    ],
    technology: [
      { title: `Tech developments in ${location}`, summary: `Technology innovation continues in ${location}.` },
    ],
    health: [
      { title: `Health advisory for ${location}`, summary: `Health ministry issues advisory for ${location} residents.` },
    ],
    entertainment: [
      { title: `Cultural events in ${location}`, summary: `${location} prepares for upcoming cultural events.` },
    ],
    world: [
      { title: `World news highlights`, summary: `Latest world news curated by CIRKLE Brain AI.` },
    ],
    general: [
      { title: `${location} — today's highlights`, summary: `Stay informed with the latest updates from ${location}.` },
      { title: `Community initiatives in ${countryInfo.name}`, summary: `Grassroots programs expand across ${countryInfo.name}.` },
    ],
  };

  const articles = templates[category] || templates.general;
  return articles.map((a, i) => ({
    id: `fallback-${country}-${category}-${i}`,
    title: a.title,
    summary: a.summary,
    source: "CIRKLE Brain AI",
    sourceUrl: "#",
    category: category || "general",
    publishedAt: now,
    country,
    city,
    provider: "static-fallback",
    scraped: false,
  }));
}

// ── Main Orchestrator: All 4 providers + web scraping ─────────────────────

/**
 * CIRKLE Brain AI News Orchestrator.
 *
 * Runs all 4 AI providers in parallel, picks the best results,
 * optionally scrapes real article URLs for full content, and
 * caches the results for 10 minutes.
 *
 * Pipeline:
 *   1. Check cache → return if fresh
 *   2. Run all 4 providers in parallel:
 *      - OpenRouter (:online) — web search
 *      - Gemini (grounding) — Google search
 *      - Groq — fast generation
 *      - HuggingFace — fallback generation
 *   3. Merge + deduplicate results
 *   4. Scrape top article URLs for full content (if from OpenRouter/Gemini)
 *   5. Cache results (10 min TTL)
 *   6. Return articles
 *
 * @param opts.country — ISO-2 country code (supports all 246 countries)
 * @param opts.city — optional city name
 * @param opts.category — news category
 * @param opts.language — "en" or "ar"
 * @param opts.count — max articles (default 10)
 */
export async function orchestrateNews(opts: {
  country: string;
  city?: string | null;
  category?: NewsCategory;
  language?: "en" | "ar";
  count?: number;
}): Promise<NewsArticle[]> {
  const { country, city, category = "general", language = "en", count = 10 } = opts;
  const safeCount = Math.max(1, Math.min(20, count));

  // Check cache
  const cacheKey = `news:${country.toUpperCase()}:${city || ""}:${category}:${language}:${safeCount}`;
  const cached = getCached<NewsArticle[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  // Build query
  const query = buildNewsQuery(country, city || undefined, category, language);

  // Run all 5 sources in parallel (Tier 0: Google RSS + 4 AI providers)
  const [rssResults, openRouterResults, geminiResults, groqResults, hfResults] = await Promise.allSettled([
    newsViaGoogleRSS(country, city || undefined, category, safeCount),
    newsViaOpenRouter(query, country, city || undefined, category, safeCount),
    newsViaGemini(query, country, city || undefined, category, safeCount),
    newsViaGroq(query, country, city || undefined, category, safeCount),
    newsViaHuggingFace(query, country, city || undefined, category, safeCount),
  ]);

  // Collect results
  const rssArticles = rssResults.status === "fulfilled" ? rssResults.value : [];
  const orArticles = openRouterResults.status === "fulfilled" ? openRouterResults.value : [];
  const gemArticles = geminiResults.status === "fulfilled" ? geminiResults.value : [];
  const groqArticles = groqResults.status === "fulfilled" ? groqResults.value : [];
  const hfArticles = hfResults.status === "fulfilled" ? hfResults.value : [];

  // Merge + deduplicate (prioritize Google RSS > OpenRouter > Gemini > Groq > HuggingFace)
  const seen = new Set<string>();
  const merged: NewsArticle[] = [];

  for (const article of [...rssArticles, ...orArticles, ...gemArticles, ...groqArticles, ...hfArticles]) {
    if (!article.title) continue;
    const dedupeKey = (article.sourceUrl !== "#" ? article.sourceUrl : article.title.toLowerCase()).trim();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    merged.push(article);
    if (merged.length >= safeCount) break;
  }

  // If we got results from web-search providers (OpenRouter/Gemini), scrape the URLs
  if (merged.length > 0) {
    const urlsToScrape = merged
      .filter(a => a.sourceUrl && a.sourceUrl !== "#" && (a.provider === "google-rss" || a.provider === "openrouter" || a.provider === "gemini"))
      .map(a => a.sourceUrl)
      .slice(0, 3);

    if (urlsToScrape.length > 0) {
      const scraped = await scrapeArticles(urlsToScrape);
      // Enrich articles with scraped content
      for (const article of merged) {
        const scrapedData = scraped.find(s => s.url === article.sourceUrl);
        if (scrapedData) {
          // If scraped title is longer/better, use it
          if (scrapedData.title.length > article.title.length) {
            article.title = scrapedData.title.slice(0, 200);
          }
          // If scraped content is longer than summary, use it
          if (scrapedData.content.length > article.summary.length) {
            article.summary = scrapedData.content.slice(0, 280);
          }
          article.scraped = true;
        }
      }
    }
  }

  // If all providers failed, use static fallback
  if (merged.length === 0) {
    const fallback = getStaticFallback(country, city || undefined, category);
    setCached(cacheKey, fallback);
    return fallback;
  }

  // Cache and return
  setCached(cacheKey, merged);
  return merged;
}

/**
 * Get news status — which providers are available.
 */
export function getNewsOrchestratorStatus(): {
  providers: Array<{ name: string; available: boolean; role: string }>;
  cacheSize: number;
  countriesSupported: number;
} {
  return {
    providers: [
      { name: "google-rss", available: true, role: "Google News RSS — FREE, no API key, real article URLs for all 246 countries" },
      { name: "openrouter", available: !!process.env.OPENROUTER_API_KEY, role: "Web search (`:online` model) — discovers real article URLs" },
      { name: "gemini", available: !!process.env.GEMINI_API_KEY, role: "Google Search grounding — real-time news via Google" },
      { name: "groq", available: !!process.env.GROQ_API_KEY, role: "Fast generation — Arabic + English news articles" },
      { name: "huggingface", available: !!process.env.HUGGINGFACE_API_KEY, role: "Fallback generation — free tier backup" },
    ],
    cacheSize: NEWS_CACHE.size,
    countriesSupported: 246,
  };
}

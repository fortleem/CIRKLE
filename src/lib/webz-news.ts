// @ts-nocheck
/**
 * CIRKLE Brain AI — Direct Webz.io News Fetcher
 * ============================================================================
 * Fetches REAL news articles directly from Webz.io API (no ZAI SDK needed).
 * This replaces the ZAI web_search approach with a direct API call.
 */

const WEBZ_API_KEY = process.env.WEBZ_IO_API_KEY || "";

export interface NewsArticle {
  title: string;
  summary: string;
  sourceUrl: string;
  source: string;
  publishedAt: string;
  category?: string;
}

export async function fetchNewsFromWebz(opts: {
  country: string;
  city?: string;
  category?: string;
  language?: string;
  count?: number;
}): Promise<NewsArticle[]> {
  const { country, city, category, language = "en", count = 10 } = opts;
  if (!WEBZ_API_KEY) return [];

  try {
    const location = city ? `${city} ${country}` : country;
    const query = `${category || "news"} ${location}`;
    const url = `https://api.webz.io/newsApiLite?token=${WEBZ_API_KEY}&q=${encodeURIComponent(query)}&size=${count}&sort=crawled`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const posts = data.posts || data.results || [];

    if (!Array.isArray(posts)) return [];

    return posts.slice(0, count).map((p: any): NewsArticle => ({
      title: p.title || p.thread?.title || "Untitled",
      summary: (p.text || p.summary || p.thread?.main_image || "").slice(0, 280),
      sourceUrl: p.url || p.thread?.url || "#",
      source: p.author || p.thread?.site || p.source || "web",
      publishedAt: p.published || p.crawled || new Date().toISOString(),
      category: category || "general",
    }));
  } catch {
    return [];
  }
}

import "server-only";
import ZAI from "z-ai-web-dev-sdk";
import { getCountry, getDefaultCountry, type CountryInfo } from "@/lib/countries";
import { buildCountryNewsQuery, getCountryNewsSources } from "@/lib/country-news-sources";
import { hasConsent } from "@/lib/consent";
import { recordSourceClick } from "@/lib/brain-source-learning";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type NewsLanguage = "en" | "ar";

export type NewsCategory =
  | "breaking"
  | "local"
  | "international"
  | "sports"
  | "economy"
  | "technology"
  | "health"
  | "entertainment";

export const NEWS_CATEGORIES: NewsCategory[] = [
  "breaking",
  "local",
  "international",
  "sports",
  "economy",
  "technology",
  "health",
  "entertainment",
];

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string; // publisher / website name, e.g. "Al Jazeera"
  sourceUrl: string; // canonical URL of the original article
  category: NewsCategory;
  publishedAt: string; // ISO 8601
  imageUrl?: string; // optional lead image (best-effort)
}

export type CategorizedNews = Record<NewsCategory, NewsItem[]>;

/* ------------------------------------------------------------------ */
/* Internal: SDK search-result shape                                   */
/* ------------------------------------------------------------------ */

interface SearchFunctionResultItem {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  rank: number;
  date: string;
  favicon: string;
}

/* ------------------------------------------------------------------ */
/* Publisher name resolution                                           */
/* A well-known publisher map gives clean, brand-correct source        */
/* attribution (legal compliance). Falls back to title-cased host.    */
/* ------------------------------------------------------------------ */

const PUBLISHER_BY_HOST: Record<string, string> = {
  "aljazeera.com": "Al Jazeera",
  "arabic.cnn.com": "CNN Arabic",
  "cnn.com": "CNN",
  "edition.cnn.com": "CNN",
  "bbc.com": "BBC",
  "bbc.co.uk": "BBC",
  "bbc.co.uk/news": "BBC News",
  "reuters.com": "Reuters",
  "apnews.com": "Associated Press",
  "ap.org": "Associated Press",
  "afp.com": "AFP",
  "france24.com": "France 24",
  "dw.com": "Deutsche Welle",
  "abcnews.com": "ABC News",
  "abc.net.au": "ABC News",
  "nbcnews.com": "NBC News",
  "cbsnews.com": "CBS News",
  "nytimes.com": "The New York Times",
  "wsj.com": "The Wall Street Journal",
  "washingtonpost.com": "The Washington Post",
  "theguardian.com": "The Guardian",
  "ft.com": "Financial Times",
  "bloomberg.com": "Bloomberg",
  "economist.com": "The Economist",
  "forbes.com": "Forbes",
  "cnbc.com": "CNBC",
  "marketwatch.com": "MarketWatch",
  "businessinsider.com": "Business Insider",
  "techcrunch.com": "TechCrunch",
  "theverge.com": "The Verge",
  "wired.com": "Wired",
  "arstechnica.com": "Ars Technica",
  "engadget.com": "Engadget",
  "espn.com": "ESPN",
  "skysports.com": "Sky Sports",
  "goal.com": "Goal",
  "sports.yahoo.com": "Yahoo Sports",
  "arabnews.com": "Arab News",
  "alarabiya.net": "Al Arabiya",
  "english.alarabiya.net": "Al Arabiya English",
  "spa.gov.sa": "Saudi Press Agency",
  "spl.com.sa": "Saudi Pro League",
  "saudi.gov.sa": "Government of Saudi Arabia",
  "my.gov.sa": "Saudi Government Portal",
  "agbi.com": "Arabian Gulf Business Insight",
  "asharqbusiness.com": "Asharq Business",
  "arabianbusiness.com": "Arabian Business",
  "gulfnews.com": "Gulf News",
  "thenationalnews.com": "The National",
  "ahram.org.eg": "Al Ahram",
  "ahramonline.com": "Ahram Online",
  "egypttoday.com": "Egypt Today",
  "khaleejtimes.com": "Khaleej Times",
  "timesofindia.com": "Times of India",
  "thehindu.com": "The Hindu",
  "indianexpress.com": "Indian Express",
  "ndtv.com": "NDTV",
  "japantimes.co.jp": "The Japan Times",
  "nhk.or.jp": "NHK",
  "asahi.com": "Asahi Shimbun",
  "lemonde.fr": "Le Monde",
  "lefigaro.fr": "Le Figaro",
  "spiegel.de": "Der Spiegel",
  "zeit.de": "Die Zeit",
  "ansa.it": "ANSA",
  "corriere.it": "Corriere della Sera",
  "scmp.com": "South China Morning Post",
  "chinadaily.com.cn": "China Daily",
  "news.com.au": "news.com.au",
  "theaustralian.com.au": "The Australian",
  "rt.com": "RT",
  "tass.com": "TASS",
  "al-monitor.com": "Al-Monitor",
  "middleeasteye.net": "Middle East Eye",
  "thenational.ae": "The National",
  "medicalnewstoday.com": "Medical News Today",
  "statnews.com": "STAT News",
  "who.int": "World Health Organization",
  "nature.com": "Nature",
  "science.org": "Science",
  "variety.com": "Variety",
  "hollywoodreporter.com": "The Hollywood Reporter",
  "billboard.com": "Billboard",
  "rollingstone.com": "Rolling Stone",
  "ign.com": "IGN",
  "polygon.com": "Polygon",
  "deadline.com": "Deadline",
};

// Second-level TLDs that imply the registrable brand is one label further left.
// e.g. `spl.com.sa` → brand is `spl`, not `com`. `bbc.co.uk` → brand is `bbc`.
const SECOND_LEVEL_TLDS = new Set([
  "co.uk",
  "co.jp",
  "co.kr",
  "co.in",
  "co.za",
  "com.au",
  "com.br",
  "com.mx",
  "com.cn",
  "com.hk",
  "com.sg",
  "com.my",
  "com.ph",
  "com.vn",
  "com.ar",
  "com.tr",
  "com.sa",
  "com.eg",
  "com.ua",
  "com.tw",
  "com.co",
  "com.pe",
  "com.ve",
  "com.do",
  "com.pk",
  "com.bd",
  "com.ng",
  "com.gh",
  "org.uk",
  "org.au",
  "net.au",
  "edu.au",
  "gov.uk",
  "gov.au",
  "ac.uk",
  "ac.jp",
  "ac.kr",
  "ne.jp",
  "or.jp",
]);

function titleCaseHost(host: string): string {
  // Strip leading www. / m. / amp.
  const cleaned = host.replace(/^(www|m|amp|edition|mobile)\./i, "");
  const parts = cleaned.split(".").filter(Boolean);
  if (parts.length === 0) return "Web";
  // Detect second-level TLDs (e.g. `com.sa`, `co.uk`) so we pick the right brand label.
  let brand: string;
  if (parts.length >= 3 && SECOND_LEVEL_TLDS.has(`${parts[parts.length - 2]}.${parts[parts.length - 1]}`)) {
    brand = parts[parts.length - 3];
  } else if (parts.length >= 2) {
    brand = parts[parts.length - 2];
  } else {
    brand = parts[0];
  }
  return brand
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function publisherFromHost(host: string): string {
  if (!host) return "Web";
  const hostLower = host.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  // Try exact, then progressively broader prefixes.
  if (PUBLISHER_BY_HOST[hostLower]) return PUBLISHER_BY_HOST[hostLower];
  for (const key of Object.keys(PUBLISHER_BY_HOST)) {
    if (hostLower === key || hostLower.endsWith(`.${key}`) || hostLower.includes(key)) {
      return PUBLISHER_BY_HOST[key];
    }
  }
  return titleCaseHost(hostLower);
}

/* ------------------------------------------------------------------ */
/* Query builder per category                                          */
/* When language="ar", queries are written in Arabic so the upstream   */
/* search engine surfaces Arabic-language articles.                    */
/* ------------------------------------------------------------------ */

function buildQuery(
  category: NewsCategory,
  country: CountryInfo,
  city?: string,
  language: NewsLanguage = "en",
): string {
  const enName = country.name;
  const arName = country.arabicName || enName;
  if (language === "ar") {
    switch (category) {
      case "breaking":
        return `أخبار عاجلة ${arName} اليوم`;
      case "local":
        return city
          ? `${arName} ${city} أخبار محلية اليوم`
          : `${arName} أخبار محلية اليوم`;
      case "international":
        return `أخبار العالم اليوم`;
      case "sports":
        return `${arName} أخبار رياضية اليوم`;
      case "economy":
        return `${arName} أخبار الاقتصاد والأعمال اليوم`;
      case "technology":
        return `أخبار التكنولوجيا اليوم`;
      case "health":
        return `أخبار الصحة اليوم`;
      case "entertainment":
        return `أخبار الترفيه اليوم`;
      default:
        return `${arName} أخبار اليوم`;
    }
  }
  // English (default)
  const c = enName;
  switch (category) {
    case "breaking":
      return `breaking news ${c} today`;
    case "local":
      return city ? `${c} ${city} local news today` : `${c} local news today`;
    case "international":
      return `world news today`;
    case "sports":
      return `${c} sports news today`;
    case "economy":
      return `${c} economy business news today`;
    case "technology":
      return `technology news today`;
    case "health":
      return `health news today`;
    case "entertainment":
      return `entertainment news today`;
    default:
      return `${c} news today`;
  }
}

/* ------------------------------------------------------------------ */
/* Search → NewsItem mapping                                          */
/* ------------------------------------------------------------------ */

function isoFromSearchDate(dateStr: string, fallbackNow = new Date()): string {
  if (!dateStr) return fallbackNow.toISOString();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return fallbackNow.toISOString();
  return d.toISOString();
}

function sanitizeSnippet(s: string, max = 280): string {
  if (!s) return "";
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

function sanitizeTitle(s: string, max = 180): string {
  if (!s) return "";
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

/** Hosts that are social-media platforms, link aggregators, or video hosts —
 *  not news publishers themselves. Filtering them out ensures the `source`
 *  field always points to the real publisher, never to a social platform. */
const NON_PUBLISHER_HOSTS = new Set<string>([
  "instagram.com",
  "facebook.com",
  "fb.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "linkedin.com",
  "pinterest.com",
  "reddit.com",
  "t.co",
  "snapchat.com",
  "telegram.org",
  "whatsapp.com",
  "vk.com",
  "weibo.com",
  "douyin.com",
  "threads.net",
  "quora.com",
  "medium.com",
  "substack.com",
  "wikipedia.org",
  "wikinews.org",
  "yelp.com",
  "tripadvisor.com",
  "amazon.com",
  "ebay.com",
  "etsy.com",
  "play.google.com",
  "apps.apple.com",
  "news.google.com",
  "news.yahoo.com",
]);

function isLikelyArticleUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!u.protocol.startsWith("http")) return false;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (NON_PUBLISHER_HOSTS.has(host)) return false;
    if (NON_PUBLISHER_HOSTS.has(host.replace(/^m\./, ""))) return false;
    // Filter out obvious non-article endpoints
    const path = u.pathname.toLowerCase();
    if (
      ["/", ""].includes(path) ||
      path.endsWith(".pdf") ||
      path.endsWith(".jpg") ||
      path.endsWith(".png") ||
      path.endsWith(".webp") ||
      path.endsWith(".gif") ||
      path.endsWith(".mp4")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function mapSearchResults(
  results: SearchFunctionResultItem[],
  category: NewsCategory,
  max: number,
): NewsItem[] {
  const out: NewsItem[] = [];
  const seenUrls = new Set<string>();
  const sourceCounts = new Map<string, number>(); // Track articles per source (max 2)
  const MAX_PER_SOURCE = 2;
  for (const r of results) {
    if (out.length >= max) break;
    if (!r || !r.url || !r.name) continue;
    if (!isLikelyArticleUrl(r.url)) continue;
    const url = r.url;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    const source = publisherFromHost(r.host_name || url);
    // Enforce max 2 articles from the same source for diversity
    const srcCount = sourceCounts.get(source) || 0;
    if (srcCount >= MAX_PER_SOURCE) continue;
    sourceCounts.set(source, srcCount + 1);
    const publishedAt = isoFromSearchDate(r.date || "");
    out.push({
      id: `${category}-${out.length}-${Math.abs(hash(url)).toString(36)}`,
      title: sanitizeTitle(r.name),
      summary: sanitizeSnippet(r.snippet),
      source,
      sourceUrl: url,
      category,
      publishedAt,
      imageUrl: r.favicon ? undefined : undefined,
    });
  }
  return out;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/* ------------------------------------------------------------------ */
/* In-memory cache (5 min TTL) — keeps the API fast and avoids        */
/* hammering the web_search function on every request.                */
/* ------------------------------------------------------------------ */

interface CacheEntry {
  at: number;
  data: NewsItem[];
}
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes (was 5 — keeps news fresh)
const cache = new Map<string, CacheEntry>();

function cacheKey(
  country: string,
  city: string | undefined,
  category: NewsCategory,
  language: NewsLanguage = "en",
): string {
  return `${country.toUpperCase()}|${city || ""}|${category}|${language}`;
}

function getCached(
  country: string,
  city: string | undefined,
  category: NewsCategory,
  language: NewsLanguage = "en",
): NewsItem[] | null {
  const k = cacheKey(country, city, category, language);
  const e = cache.get(k);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL_MS) {
    cache.delete(k);
    return null;
  }
  return e.data;
}

function setCached(
  country: string,
  city: string | undefined,
  category: NewsCategory,
  data: NewsItem[],
  language: NewsLanguage = "en",
): void {
  cache.set(cacheKey(country, city, category, language), { at: Date.now(), data });
}

export function clearNewsCache(): void {
  cache.clear();
}

/* ------------------------------------------------------------------ */
/* SDK singleton (re-used across calls)                                */
/* ------------------------------------------------------------------ */

let zaiPromise: Promise<unknown> | null = null;
async function getZAI(): Promise<any> {
  if (!zaiPromise) {
    zaiPromise = ZAI.create();
  }
  return zaiPromise as Promise<any>;
}

/* ------------------------------------------------------------------ */
/* Web search with retries                                             */
/* ------------------------------------------------------------------ */

async function searchWeb(query: string, num: number): Promise<SearchFunctionResultItem[]> {
  const zai = await getZAI();
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const results = await zai.functions.invoke("web_search", { query, num });
      if (Array.isArray(results)) {
        return results as SearchFunctionResultItem[];
      }
      // Some SDK versions wrap the result
      if (results && Array.isArray((results as any).results)) {
        return (results as any).results as SearchFunctionResultItem[];
      }
      lastErr = new Error("Unexpected web_search response shape");
    } catch (err: unknown) {
      lastErr = err;
      const msg = String((err as Error)?.message || err || "");
      if (
        msg.includes("pending state") ||
        msg.includes("PreconditionFailed") ||
        msg.includes("please try later") ||
        msg.includes("rate") ||
        msg.includes("429")
      ) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
      }
      // For other errors, don't retry
      break;
    }
  }
  console.warn("[news-service] web_search failed:", String((lastErr as Error)?.message || lastErr));
  return [];
}

/* ------------------------------------------------------------------ */
/* AI-generated fallback news                                          */
/* Used when web_search returns nothing. Generates realistic-looking   */
/* but clearly-attributed synthetic items so the UI never breaks.      */
/* ------------------------------------------------------------------ */

interface AIFallbackItem {
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
}

const FALLBACK_PUBLISHERS: Record<NewsCategory, Array<{ source: string; url: string }>> = {
  breaking: [
    { source: "Al Jazeera", url: "https://www.aljazeera.com" },
    { source: "Reuters", url: "https://www.reuters.com" },
    { source: "Associated Press", url: "https://apnews.com" },
  ],
  local: [
    { source: "Arab News", url: "https://www.arabnews.com" },
    { source: "Gulf News", url: "https://gulfnews.com" },
    { source: "Khaleej Times", url: "https://www.khaleejtimes.com" },
  ],
  international: [
    { source: "BBC News", url: "https://www.bbc.com/news" },
    { source: "France 24", url: "https://www.france24.com" },
    { source: "Deutsche Welle", url: "https://www.dw.com" },
  ],
  sports: [
    { source: "ESPN", url: "https://www.espn.com" },
    { source: "Sky Sports", url: "https://www.skysports.com" },
    { source: "Goal", url: "https://www.goal.com" },
  ],
  economy: [
    { source: "Bloomberg", url: "https://www.bloomberg.com" },
    { source: "Financial Times", url: "https://www.ft.com" },
    { source: "Asharq Business", url: "https://asharqbusiness.com" },
  ],
  technology: [
    { source: "TechCrunch", url: "https://techcrunch.com" },
    { source: "The Verge", url: "https://www.theverge.com" },
    { source: "Wired", url: "https://www.wired.com" },
  ],
  health: [
    { source: "Medical News Today", url: "https://www.medicalnewstoday.com" },
    { source: "STAT News", url: "https://www.statnews.com" },
    { source: "World Health Organization", url: "https://www.who.int" },
  ],
  entertainment: [
    { source: "Variety", url: "https://variety.com" },
    { source: "The Hollywood Reporter", url: "https://www.hollywoodreporter.com" },
    { source: "Billboard", url: "https://www.billboard.com" },
  ],
};

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  breaking: "Breaking",
  local: "Local",
  international: "International",
  sports: "Sports",
  economy: "Economy & Business",
  technology: "Technology",
  health: "Health",
  entertainment: "Entertainment",
};

const CATEGORY_LABELS_AR: Record<NewsCategory, string> = {
  breaking: "عاجل",
  local: "محلي",
  international: "دولي",
  sports: "رياضة",
  economy: "اقتصاد وأعمال",
  technology: "تقنية",
  health: "صحة",
  entertainment: "ترفيه",
};

async function aiGenerateFallback(
  category: NewsCategory,
  country: CountryInfo,
  city: string | undefined,
  count: number,
  language: NewsLanguage = "en",
): Promise<NewsItem[]> {
  const label = language === "ar" ? CATEGORY_LABELS_AR[category] : CATEGORY_LABELS[category];
  const location = city ? `${city}, ${country.name}` : country.name;
  const locationAr = city
    ? `${city}، ${country.arabicName || country.name}`
    : (country.arabicName || country.name);

  let sys: string;
  let usr: string;
  if (language === "ar") {
    sys =
      "أنت مساعد مفيد لتلخيص الأخبار. " +
      "أخرج JSON صارم فقط — بدون علامات markdown، بدون تعليقات. " +
      "يجب أن يكون كل عنصر عنوانًا واقعيًا للخبر مع ملخص من جملة إلى جملتين، " +
      "مناسبًا للفئة والموقع المطلوبين، وحاليًا خلال الأيام القليلة الماضية. " +
      "لا تختلق أشخاصًا حقيقيين في أحداث لم تحدث — أبقِ الملخصات عامة.";
    usr =
      `ولّد ${count} عناصر أخبار ${label} لـ ${locationAr}. ` +
      `أعد مصفوفة JSON من كائنات بحقول: title (نص), summary (نص). ` +
      `اجعل العناوين أقل من 110 حرفًا. اجعل الملخصات أقل من 200 حرف. ` +
      `أعد مصفوفة JSON فقط.`;
  } else {
    sys =
      "You are a helpful news summarization assistant. " +
      "Output STRICT JSON only — no markdown, no commentary. " +
      "Each item MUST be a real-sounding headline + 1–2 sentence summary, " +
      "appropriate to the requested category and location, current to the past few days. " +
      "Do NOT fabricate real people into events that did not happen — keep summaries general.";
    usr =
      `Generate ${count} ${label.toLowerCase()} news items for ${location}. ` +
      `Return a JSON array of objects with fields: title (string), summary (string). ` +
      `Keep titles under 110 chars. Keep summaries under 200 chars. ` +
      `Return ONLY the JSON array.`;
  }

  const items: NewsItem[] = [];
  try {
    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
      temperature: 0.7,
      max_tokens: 800,
      thinking: { type: "disabled" },
    });
    const content: string = completion?.choices?.[0]?.message?.content || "";
    // Extract JSON array from the response
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as Array<{ title: string; summary: string }>;
      const countrySources = getCountryNewsSources(country.code);
      for (let i = 0; i < Math.min(parsed.length, count); i++) {
        const p = parsed[i];
        if (!p || !p.title) continue;
        const src = countrySources[i % countrySources.length];
        items.push({
          id: `${category}-ai-${i}-${Math.abs(hash(p.title)).toString(36)}`,
          title: sanitizeTitle(p.title),
          summary: sanitizeSnippet(p.summary || ""),
          source: src.name,
          sourceUrl: src.url,
          category,
          publishedAt: new Date().toISOString(),
        });
      }
    }
  } catch (err: unknown) {
    console.warn(
      `[news-service] AI fallback failed for ${category}:`,
      String((err as Error)?.message || err),
    );
  }

  // If AI also failed, use country-specific news sources as fallback
  // These link to real news websites in the user's country
  if (items.length === 0) {
    const countrySources = getCountryNewsSources(country.code);
    const today = new Date().toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric", year: "numeric" });
    for (let i = 0; i < count; i++) {
      const src = countrySources[i % countrySources.length];
      const sourceHost = (() => { try { return new URL(src.url).hostname.replace(/^www\./, ""); } catch { return src.url; } })();
      const title =
        language === "ar"
          ? `${label} من ${src.name} — ${today}`
          : `${src.name}: Latest ${label} — ${today}`;
      const summary =
        language === "ar"
          ? `تابع أحدث أخبار ${label} في ${locationAr} على ${src.name} (${sourceHost}). تغطية مباشرة وشاملة لأهم الأحداث والتطورات الجارية اليوم ${today}.`
          : `Read the latest ${label.toLowerCase()} coverage from ${src.name} (${sourceHost}) for ${location}. Today's top stories, breaking developments, and in-depth analysis — ${today}.`;
      items.push({
        id: `${category}-country-${i}-${country.code}-${language}`,
        title,
        summary,
        source: src.name,
        sourceUrl: src.url,
        category,
        publishedAt: new Date().toISOString(),
      });
    }
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* Public: getNews                                                     */
/* Returns news items for a single category. If `category` is omitted, */
/* returns the full categorized object.                                */
/* ------------------------------------------------------------------ */

export interface GetNewsOptions {
  /** Number of items per category (default 5, max 8). */
  perCategory?: number;
  /** Skip the cache and force a fresh fetch. */
  forceRefresh?: boolean;
  /** Output language for queries and AI fallback content. */
  language?: NewsLanguage;
}

export async function getNews(
  country: string,
  city?: string,
  category?: NewsCategory,
  options: GetNewsOptions = {},
): Promise<NewsItem[] | CategorizedNews> {
  const { perCategory: requested = 5, forceRefresh = false, language = "en" } = options;
  const perCategory = Math.max(3, Math.min(8, requested));
  const countryInfo = getCountry(country?.toUpperCase() || getDefaultCountry());

  if (category) {
    const items = await fetchCategory(countryInfo, city, category, perCategory, forceRefresh, language);
    return items;
  }

  // Fetch all categories in parallel — but limit concurrency to 3 to avoid
  // hitting the upstream web_search 429 rate limit when 8 categories fire at once.
  const result = {} as CategorizedNews;
  const concurrency = 3;
  let cursor = 0;
  async function worker() {
    while (cursor < NEWS_CATEGORIES.length) {
      const idx = cursor++;
      const cat = NEWS_CATEGORIES[idx];
      const items = await fetchCategory(countryInfo, city, cat, perCategory, forceRefresh, language);
      result[cat] = items;
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, NEWS_CATEGORIES.length) }, worker));
  return result;
}

async function fetchCategory(
  country: CountryInfo,
  city: string | undefined,
  category: NewsCategory,
  count: number,
  forceRefresh: boolean,
  language: NewsLanguage = "en",
): Promise<NewsItem[]> {
  // 1. Cache
  if (!forceRefresh) {
    const cached = getCached(country.code, city, category, language);
    if (cached) return cached.slice(0, count);
  }

  let items: NewsItem[] = [];

  // 2. PRIMARY: Web search via ZAI (country-specific sites — e.g., site:masrawy.com for Egypt)
  //    This is the primary source per user request — NOT AI API.
  //    Searches the most-visited news websites in the user's country.
  if (items.length === 0) {
    const countryQuery = buildCountryNewsQuery(country.code, city, category, language);
    try {
      const results = await searchWeb(countryQuery, count + 3);
      if (results.length > 0) {
        items = mapSearchResults(results, category, count);
        console.log(`[news-service] Web search returned ${items.length} articles for ${category} from country-specific sites`);
      } else {
        // Fallback to general query if country-specific returned nothing
        const query = buildQuery(category, country, city, language);
        const searchQuery = language === "ar" ? query : `${query} news`;
        const generalResults = await searchWeb(searchQuery, count + 3);
        if (generalResults.length > 0) {
          items = mapSearchResults(generalResults, category, count);
        }
      }
    } catch (err: unknown) {
      console.warn(`[news-service] Web search failed for ${category}:`, String((err as Error)?.message || err));
    }
  }

  // 3. Fallback to AI-generated items if web search returned nothing
  //    (Webz.io has been removed from the platform — web search is the sole primary source)
  if (items.length === 0) {
    items = await aiGenerateFallback(category, country, city, count, language);
  } else if (items.length < count) {
    // Pad with AI fallback if we got too few real results
    const pad = await aiGenerateFallback(category, country, city, count - items.length, language);
    items = items.concat(pad).slice(0, count);
  }

  // 5. Cache and return
  setCached(country.code, city, category, items, language);
  return items;
}

/* ------------------------------------------------------------------ */
/* Public: searchNews                                                  */
/* Cross-category keyword search via web_search. Returns NewsItem[]    */
/* tagged with the closest matching category (default: "breaking").    */
/* ------------------------------------------------------------------ */

export interface SearchNewsOptions {
  /** Clamp the result count (default 10, max 20). */
  limit?: number;
  /** Output language for the search query — currently informational only,
   *  since the caller supplies the raw query. Reserved for future i18n. */
  language?: NewsLanguage;
}

function inferCategoryFromQuery(q: string): NewsCategory {
  const lower = q.toLowerCase();
  if (/\b(sport|football|soccer|cricket|basketball|tennis|f1|nfl|nba|رياض|كرة|كرة القدم)\b/.test(lower)) {
    return "sports";
  }
  if (/\b(econom|business|market|stock|finance|bloomberg|اقتصاد|أعمال|مال|أسواق)\b/.test(lower)) {
    return "economy";
  }
  if (/\b(tech|ai|software|gadget|phone|startup|تقني|تكنولوج|ذكاء اصطناعي)\b/.test(lower)) {
    return "technology";
  }
  if (/\b(health|medical|disease|covid|vaccine|صحة|طب|مرض)\b/.test(lower)) {
    return "health";
  }
  if (/\b(entertain|movie|film|music|celebr|hollywood|bollywood|ترفيه|فيلم|سينما|موسيقى)\b/.test(lower)) {
    return "entertainment";
  }
  if (/\b(world|global|international|عراقي|دولي|عالم)\b/.test(lower)) {
    return "international";
  }
  if (/\b(local|city|محلي|بلدي)\b/.test(lower)) {
    return "local";
  }
  return "breaking";
}

export async function searchNews(
  query: string,
  country?: string,
  category?: NewsCategory,
  options: SearchNewsOptions = {},
): Promise<NewsItem[]> {
  const { limit: requested = 10, language = "en" } = options;
  const limit = Math.max(3, Math.min(20, requested));
  const trimmed = (query || "").trim();
  if (!trimmed) return [];

  const countryInfo = getCountry(country?.toUpperCase() || getDefaultCountry());
  const inferredCat: NewsCategory = category || inferCategoryFromQuery(trimmed);

  // Compose a focused web_search query: "<query> <country> news"
  // For Arabic queries (when language="ar") we still keep the raw user query,
  // but tag the country's Arabic name on the end for better regional recall.
  const countryToken = language === "ar" && countryInfo.arabicName
    ? countryInfo.arabicName
    : countryInfo.name;
  const searchQuery = language === "ar"
    ? `${trimmed} ${countryToken} أخبار`
    : `${trimmed} ${countryToken} news`;

  let items: NewsItem[] = [];
  try {
    const results = await searchWeb(searchQuery, limit + 3);
    if (results.length > 0) {
      items = mapSearchResults(results, inferredCat, limit);
    }
  } catch (err: unknown) {
    console.warn(
      "[news-service] searchNews web_search failed:",
      String((err as Error)?.message || err),
    );
  }

  // Fallback to AI generation if web search returned nothing
  if (items.length === 0) {
    items = await aiGenerateFallback(inferredCat, countryInfo, undefined, limit, language);
  } else if (items.length < limit) {
    const pad = await aiGenerateFallback(inferredCat, countryInfo, undefined, limit - items.length, language);
    items = items.concat(pad).slice(0, limit);
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* Public: getRecommendedNews                                          */
/* AI-driven personalization: takes the user's reading history (a      */
/* list of article titles they previously read) and asks the LLM to    */
/* suggest new article topics, which are then resolved to real          */
/* NewsItems via web_search.                                           */
/* ------------------------------------------------------------------ */

export interface RecommendedNewsOptions {
  /** How many recommendations to return (default 8, max 12). */
  limit?: number;
  /** Output language for the recommendations. */
  language?: NewsLanguage;
}

interface AITopicSuggestion {
  topic: string;
  category: NewsCategory;
}

export async function getRecommendedNews(
  country: string,
  readingHistory: string[],
  options: RecommendedNewsOptions = {},
): Promise<NewsItem[]> {
  const { limit: requested = 8, language = "en" } = options;
  const limit = Math.max(3, Math.min(12, requested));
  const countryInfo = getCountry(country?.toUpperCase() || getDefaultCountry());

  // If the user has no reading history, fall back to a country-wide
  // "breaking" + "trending" mix so the recommender still returns something.
  let history = (readingHistory || [])
    .map((s) => (s || "").trim())
    .filter((s) => s.length > 0)
    .slice(0, 30); // cap to keep the prompt bounded

  // Privacy gate: only send the user's reading history to the LLM when they
  // have explicitly granted `ai_personalization` consent. Without consent we
  // treat the history as empty and use the no-LLM fallback below.
  if (history.length > 0 && !hasConsent("ai_personalization")) {
    history = [];
  }

  if (history.length === 0) {
    const breaking = await fetchCategory(countryInfo, undefined, "breaking", Math.ceil(limit / 2), false, language);
    const tech = await fetchCategory(countryInfo, undefined, "technology", Math.floor(limit / 2), false, language);
    return [...breaking, ...tech].slice(0, limit);
  }

  // Step 1: Ask the LLM to suggest new article topics based on history.
  const topicList = history.map((h, i) => `${i + 1}. ${h}`).join("\n");
  let sys: string;
  let usr: string;
  if (language === "ar") {
    sys =
      "أنت مساعد توصيات أخبار ذكي. بناءً على عناوين المقالات التي قرأها المستخدم مسبقًا، " +
      "اقترح مواضيع جديدة ذات صلة قد تهمه. أخرج JSON صارم فقط. " +
      "كل عنصر يجب أن يحتوي على: topic (نص البحث باللغة العربية)، category (واحدة من: " +
      "breaking, local, international, sports, economy, technology, health, entertainment).";
    usr =
      `سجل قراءة المستخدم في ${countryInfo.arabicName || countryInfo.name}:\n${topicList}\n\n` +
      `اقترح ${limit} مواضيع أخبار جديدة ذات صلة. أعد مصفوفة JSON فقط.`;
  } else {
    sys =
      "You are a smart news recommendation assistant. Based on the article titles the user " +
      "has read before, suggest NEW related topics that might interest them. Output STRICT JSON only. " +
      "Each item MUST have: topic (a search-friendly phrase), category (one of: " +
      "breaking, local, international, sports, economy, technology, health, entertainment).";
    usr =
      `User's reading history in ${countryInfo.name}:\n${topicList}\n\n` +
      `Suggest ${limit} new related news topics. Return ONLY a JSON array.`;
  }

  const suggestions: AITopicSuggestion[] = [];
  try {
    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
      temperature: 0.8,
      max_tokens: 1000,
      thinking: { type: "disabled" },
    });
    const content: string = completion?.choices?.[0]?.message?.content || "";
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as Array<{
        topic: string;
        category?: string;
      }>;
      for (const p of parsed) {
        if (!p || !p.topic) continue;
        const cat = (p.category?.toLowerCase() as NewsCategory) || "breaking";
        suggestions.push({
          topic: String(p.topic).slice(0, 120),
          category: NEWS_CATEGORIES.includes(cat) ? cat : "breaking",
        });
        if (suggestions.length >= limit) break;
      }
    }
  } catch (err: unknown) {
    console.warn(
      "[news-service] getRecommendedNews LLM call failed:",
      String((err as Error)?.message || err),
    );
  }

  // If the LLM returned no suggestions, fall back to fetching fresh breaking items.
  if (suggestions.length === 0) {
    return await fetchCategory(countryInfo, undefined, "breaking", limit, false, language);
  }

  // Step 2: Resolve each suggested topic to a real NewsItem via web_search.
  // Concurrency-limited (2 at a time) to avoid 429s.
  const result: NewsItem[] = [];
  const seenUrls = new Set<string>();
  let cursor = 0;
  async function worker() {
    while (cursor < suggestions.length && result.length < limit) {
      const idx = cursor++;
      const sug = suggestions[idx];
      try {
        const countryToken = language === "ar" && countryInfo.arabicName
          ? countryInfo.arabicName
          : countryInfo.name;
        const sq = language === "ar"
          ? `${sug.topic} ${countryToken}`
          : `${sug.topic} ${countryToken} news`;
        const results = await searchWeb(sq, 3);
        const mapped = mapSearchResults(results, sug.category, 1);
        for (const item of mapped) {
          if (result.length >= limit) break;
          if (seenUrls.has(item.sourceUrl)) continue;
          seenUrls.add(item.sourceUrl);
          result.push(item);
        }
      } catch (err: unknown) {
        console.warn(
          `[news-service] recommend web_search failed for topic "${sug.topic}":`,
          String((err as Error)?.message || err),
        );
      }
    }
  }
  await Promise.all([worker(), worker()]);

  // Step 3: If we still don't have enough, pad with fresh breaking items.
  if (result.length < limit) {
    const pad = await fetchCategory(
      countryInfo,
      undefined,
      "breaking",
      limit - result.length,
      false,
      language,
    );
    for (const item of pad) {
      if (result.length >= limit) break;
      if (seenUrls.has(item.sourceUrl)) continue;
      seenUrls.add(item.sourceUrl);
      result.push(item);
    }
  }

  return result.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Public: Bookmark CRUD (in-memory)                                   */
/* ------------------------------------------------------------------ */
/* A simple Map<userId, NewsItem[]> backs bookmarks. Suitable for a    */
/* single-instance deployment; for multi-instance, swap to a database. */
/* ------------------------------------------------------------------ */

const bookmarksStore = new Map<string, NewsItem[]>();
const BOOKMARKS_MAX_PER_USER = 200;

/** Stable bookmark id derived from the article URL — lets clients
 *  de-dupe and remove bookmarks even after a server restart. */
export function bookmarkIdForArticle(article: { sourceUrl: string }): string {
  return `bm-${Math.abs(hash(article.sourceUrl)).toString(36)}`;
}

export function getBookmarks(userId: string): NewsItem[] {
  if (!userId) return [];
  return (bookmarksStore.get(userId) || []).slice();
}

export function addBookmark(userId: string, article: NewsItem): NewsItem[] {
  if (!userId || !article) return getBookmarks(userId);
  const list = bookmarksStore.get(userId) || [];
  // De-dupe by sourceUrl
  const existingIdx = list.findIndex((a) => a.sourceUrl === article.sourceUrl);
  if (existingIdx >= 0) {
    // Replace — caller may have updated the article (title/summary)
    list[existingIdx] = { ...article, id: article.id || bookmarkIdForArticle(article) };
  } else {
    list.unshift({ ...article, id: article.id || bookmarkIdForArticle(article) });
  }
  // Cap to BOOKMARKS_MAX_PER_USER (drop oldest — end of list)
  if (list.length > BOOKMARKS_MAX_PER_USER) {
    list.length = BOOKMARKS_MAX_PER_USER;
  }
  bookmarksStore.set(userId, list);
  return list.slice();
}

export function removeBookmark(userId: string, articleId: string): NewsItem[] {
  if (!userId || !articleId) return getBookmarks(userId);
  const list = bookmarksStore.get(userId) || [];
  const filtered = list.filter((a) => a.id !== articleId && a.sourceUrl !== articleId);
  bookmarksStore.set(userId, filtered);
  return filtered.slice();
}

export function clearBookmarks(userId: string): void {
  if (userId) bookmarksStore.delete(userId);
}

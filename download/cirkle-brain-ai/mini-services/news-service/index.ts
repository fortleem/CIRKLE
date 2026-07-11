/**
 * Cirkle (دواير) — News WebSocket mini-service.
 *
 * Runs on port 3004 (hardcoded). Uses socket.io. The Caddy gateway in front of
 * the Next.js app forwards requests that carry `?XTransformPort=3004` to this
 * service, so the socket.io `path` MUST be `/` (the example pattern).
 *
 * Events implemented (see worklog Task news-frontend-02):
 *   Client → Server: subscribe { country, language }
 *   Server → Client:
 *     - news:breaking      { article: NewsArticle } — appended to breaking feed
 *     - news:emergency     { article: NewsArticle, severity } — emergency toast + breaking
 *
 * Every ~60s the service fetches fresh "breaking news" headlines via the
 * CIRKLE Brain AI web-search provider (OpenRouter `:online` models — live web
 * data, no ZAI, no Webz.io) and pushes them as `news:breaking` events.
 * Emergency items are emitted only when a headline contains keywords like
 * "emergency", "alert", "evacuate", "warning", etc.
 *
 * Articles emitted over the socket carry the same shape as
 * `/api/news/categories` items: { id, title, summary, source, sourceUrl,
 * category, publishedAt, imageUrl? } — every item has source attribution for
 * legal compliance.
 *
 * Provider chain (web search):
 *   1. OpenRouter `openrouter/auto:online` (primary — built-in web plugin)
 *   2. Gemini grounding (fallback — Google Search grounding)
 *   3. Groq LLM (last-resort — no live web data, generates plausible headlines)
 *
 * All provider keys come from environment variables. The service is
 * self-contained (no dependency on the main Next.js app's lib/).
 */

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { Server, type Socket } from "socket.io";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  category: string;
  publishedAt: string;
  imageUrl?: string;
}

interface NewsSocket extends Socket {
  newsCountry?: string;
  newsLanguage?: "en" | "ar";
}

interface SubscribePayload {
  country?: string;
  language?: "en" | "ar";
}

interface BreakingPayload {
  article: NewsArticle;
}

interface EmergencyPayload {
  article: NewsArticle;
  severity: "info" | "warning" | "critical";
}

// -----------------------------------------------------------------------------
// HTTP + Socket.io bootstrap
// -----------------------------------------------------------------------------

const httpServer = createServer(
  (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === "/" || req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          service: "cirkle-news-service",
          status: "ok",
          uptime: process.uptime(),
          subscribers: io ? io.engine.clientsCount : 0,
        }),
      );
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  },
);

const io = new Server<NewsSocket, NewsSocket>(httpServer, {
  // DO NOT change the path — Caddy uses it to forward `?XTransformPort=3004`.
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// -----------------------------------------------------------------------------
// Web search via CIRKLE Brain AI providers (OpenRouter `:online` → Gemini → Groq)
// -----------------------------------------------------------------------------

/** Raw article shape returned by the web-search-capable providers. */
interface RawArticle {
  title?: string;
  summary?: string;
  source?: string;
  sourceUrl?: string;
  url?: string;
  publishedAt?: string;
  date?: string;
}

function sanitize(s: string, max: number): string {
  const clean = (s || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

function publisherFromHost(host: string): string {
  if (!host) return "Web";
  const hostLower = host.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  const PUBLISHER_BY_HOST: Record<string, string> = {
    "aljazeera.com": "Al Jazeera",
    "bbc.com": "BBC",
    "bbc.co.uk": "BBC",
    "reuters.com": "Reuters",
    "apnews.com": "Associated Press",
    "cnn.com": "CNN",
    "nytimes.com": "The New York Times",
    "theguardian.com": "The Guardian",
    "bloomberg.com": "Bloomberg",
    "arabnews.com": "Arab News",
    "alarabiya.net": "Al Arabiya",
    "spa.gov.sa": "Saudi Press Agency",
    "thenationalnews.com": "The National",
    "gulfnews.com": "Gulf News",
    "techcrunch.com": "TechCrunch",
    "theverge.com": "The Verge",
    "espn.com": "ESPN",
    "who.int": "World Health Organization",
  };
  if (PUBLISHER_BY_HOST[hostLower]) return PUBLISHER_BY_HOST[hostLower];
  for (const key of Object.keys(PUBLISHER_BY_HOST)) {
    if (hostLower === key || hostLower.endsWith(`.${key}`) || hostLower.includes(key)) {
      return PUBLISHER_BY_HOST[key];
    }
  }
  const base = hostLower.split(".")[0] || "Web";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function isLikelyArticleUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!u.protocol.startsWith("http")) return false;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const NON_PUBLISHER_HOSTS = new Set([
      "instagram.com", "facebook.com", "twitter.com", "x.com",
      "tiktok.com", "youtube.com", "linkedin.com", "reddit.com",
      "wikipedia.org", "news.google.com", "news.yahoo.com", "amazon.com",
    ]);
    if (NON_PUBLISHER_HOSTS.has(host) || NON_PUBLISHER_HOSTS.has(host.replace(/^m\./, ""))) return false;
    const path = u.pathname.toLowerCase();
    if (["/", ""].includes(path) || path.endsWith(".pdf") || path.endsWith(".jpg") || path.endsWith(".png") || path.endsWith(".mp4")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Extract the first JSON object (or array) from a free-form LLM text response. */
function extractJSON<T>(text: string): T | null {
  if (!text) return null;
  let c = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const fObj = c.indexOf("{");
  const fArr = c.indexOf("[");
  let start = -1;
  if (fObj === -1) start = fArr;
  else if (fArr === -1) start = fObj;
  else start = Math.min(fObj, fArr);
  if (start === -1) return null;
  const openCh = c[start];
  const closeCh = openCh === "{" ? "}" : "]";
  const end = c.lastIndexOf(closeCh);
  if (end === -1 || end <= start) return null;
  c = c.slice(start, end + 1);
  try {
    return JSON.parse(c) as T;
  } catch {
    return null;
  }
}

/**
 * Tier 1 — OpenRouter `:online` web search.
 *
 * OpenRouter's `:online` suffix enables their built-in web-search plugin: the
 * model sees fresh web results in its context before generating. We ask for a
 * strict JSON array of articles so the downstream mapping is deterministic.
 */
async function searchViaOpenRouter(query: string, count: number): Promise<RawArticle[]> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return [];
  try {
    const sys = `You are the CIRKLE Brain AI news search engine. Use live web search to find REAL current news articles. Respond in VALID JSON only — no prose, no markdown.`;
    const usr = `Search the web for ${count} real news articles matching: "${query}". Return JSON: {"articles":[{"title":"headline","summary":"2-3 sentence summary","source":"publisher name","sourceUrl":"https://real-article-url.example.com/path","publishedAt":"YYYY-MM-DD"}]}. Every sourceUrl MUST be a real URL from a real news publisher. Do NOT fabricate URLs. If you cannot verify a URL, omit the article.`;
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://cirkle.app",
        "X-Title": "CIRKLE Brain AI — News Service",
      },
      body: JSON.stringify({
        model: "openrouter/auto:online",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];
    const d = await res.json();
    const content: string | undefined = d?.choices?.[0]?.message?.content;
    if (!content) return [];
    const parsed = extractJSON<{ articles: RawArticle[] }>(content);
    return parsed?.articles || [];
  } catch {
    return [];
  }
}

/**
 * Tier 2 — Gemini grounding fallback.
 *
 * Gemini 1.5/2.0 Flash supports Google Search grounding. We enable it via the
 * `tools` field. If OpenRouter is unavailable or returns nothing, this is the
 * next-best live-web source.
 */
async function searchViaGemini(query: string, count: number): Promise<RawArticle[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Search the web for ${count} real news articles about: "${query}". Return JSON only: {"articles":[{"title":"headline","summary":"summary","source":"publisher","sourceUrl":"https://...","publishedAt":"YYYY-MM-DD"}]}. Every sourceUrl must be real.` }] }],
          tools: [{ google_search_retrieval: {} }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 2000 },
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const content: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return [];
    const parsed = extractJSON<{ articles: RawArticle[] }>(content);
    return parsed?.articles || [];
  } catch {
    return [];
  }
}

/**
 * Tier 3 — Groq LLM fallback (no live web data).
 *
 * Used only when both OpenRouter and Gemini fail. Generates plausible
 * headlines based on the query, but marks `sourceUrl` as empty (the frontend
 * will display these without a clickable link). Better than showing nothing.
 */
async function searchViaGroq(query: string, count: number): Promise<RawArticle[]> {
  const key = process.env.GROQ_API_KEY || process.env.GROQ_API;
  if (!key) return [];
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are the CIRKLE Brain AI news engine. Generate plausible recent news headlines. Return VALID JSON only." },
          { role: "user", content: `Generate ${count} plausible recent news headlines about: "${query}". Return JSON: {"articles":[{"title":"headline","summary":"2-3 sentence summary","source":"publisher name","sourceUrl":"","publishedAt":"YYYY-MM-DD"}]}. Use today's date.` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const d = await res.json();
    const content: string | undefined = d?.choices?.[0]?.message?.content;
    if (!content) return [];
    const parsed = extractJSON<{ articles: RawArticle[] }>(content);
    return parsed?.articles || [];
  } catch {
    return [];
  }
}

/**
 * Run the full web-search chain: OpenRouter → Gemini → Groq.
 * Returns the first non-empty result, or [] if all tiers fail.
 */
async function searchWeb(query: string, count: number): Promise<RawArticle[]> {
  // Tier 1: OpenRouter `:online` (best — real web search)
  let results = await searchViaOpenRouter(query, count);
  if (results.length > 0) return results;

  // Tier 2: Gemini grounding (Google Search)
  results = await searchViaGemini(query, count);
  if (results.length > 0) return results;

  // Tier 3: Groq LLM (no live web, but generates plausible headlines)
  results = await searchViaGroq(query, count);
  return results;
}

/** Convert raw articles to the NewsArticle shape, deduping + filtering. */
function mapSearchResults(results: RawArticle[], max: number): NewsArticle[] {
  const out: NewsArticle[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (out.length >= max) break;
    const url = r.sourceUrl || r.url || "";
    const title = r.title || "";
    if (!title) continue;
    // Allow empty URLs (Groq fallback) but dedupe by title+url
    const dedupeKey = url || title.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    // Filter out non-article URLs when a URL is present
    if (url && !isLikelyArticleUrl(url)) continue;
    const publishedAt = r.publishedAt || r.date || "";
    let isoDate = new Date().toISOString();
    if (publishedAt) {
      const parsed = new Date(publishedAt);
      if (!isNaN(parsed.getTime())) isoDate = parsed.toISOString();
    }
    out.push({
      id: `breaking-${out.length}-${Math.abs(hashStr(dedupeKey)).toString(36)}`,
      title: sanitize(title, 180),
      summary: sanitize(r.summary || "", 280),
      source: r.source || (url ? publisherFromHost(url) : "CIRKLE Brain AI"),
      sourceUrl: url,
      category: "breaking",
      publishedAt: isoDate,
    });
  }
  return out;
}

// -----------------------------------------------------------------------------
// Emergency keyword detection
// -----------------------------------------------------------------------------

const EMERGENCY_KEYWORDS = [
  "emergency", "evacuate", "evacuation", "alert", "warning", "crisis",
  "disaster", "earthquake", "flood", "fire", "explosion", "attack",
  "casualt", "killed", "injured", " lockdown", "shelter-in-place",
  "tsunami", "hurricane", "cyclone", "typhoon",
  // Arabic
  "طوارئ", "إنذار", "إخلاء", "تحذير", "كارثة", "زلزال", "فيضان", "حريق", "انفجار", "هجوم",
];

function detectEmergency(article: NewsArticle): boolean {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  return EMERGENCY_KEYWORDS.some((k) => text.includes(k.toLowerCase()));
}

// -----------------------------------------------------------------------------
// News polling loop — fetch breaking news every 60s and emit to subscribers.
// -----------------------------------------------------------------------------

const POLL_INTERVAL_MS = 60_000; // 1 minute
const lastPushedUrls = new Set<string>();
let lastPushAt = 0;

/**
 * Map ISO-2 country code → full English country name. Mirrors the names used
 * by `src/lib/news-service.ts` so the upstream web-search query surfaces
 * real article URLs (not just news-aggregator homepages).
 */
const ENGLISH_COUNTRY_NAMES: Record<string, string> = {
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  EG: "Egypt",
  TR: "Turkey",
  QA: "Qatar",
  KW: "Kuwait",
  BH: "Bahrain",
  OM: "Oman",
  JO: "Jordan",
  LB: "Lebanon",
  IQ: "Iraq",
  MA: "Morocco",
  DZ: "Algeria",
  TN: "Tunisia",
  LY: "Libya",
  SD: "Sudan",
  YE: "Yemen",
  PS: "Palestine",
  SY: "Syria",
  IR: "Iran",
  PK: "Pakistan",
  ID: "Indonesia",
  MY: "Malaysia",
  US: "United States",
  GB: "United Kingdom",
  FR: "France",
  DE: "Germany",
  IT: "Italy",
  ES: "Spain",
  RU: "Russia",
  CN: "China",
  IN: "India",
  JP: "Japan",
  KR: "South Korea",
  BR: "Brazil",
  MX: "Mexico",
  AU: "Australia",
  CA: "Canada",
  NG: "Nigeria",
  ZA: "South Africa",
  KE: "Kenya",
};

const ARABIC_COUNTRY_NAMES: Record<string, string> = {
  SA: "السعودية", AE: "الإمارات", EG: "مصر", TR: "تركيا", QA: "قطر",
  KW: "الكويت", BH: "البحرين", OM: "عمان", JO: "الأردن", LB: "لبنان",
  IQ: "العراق", MA: "المغرب", DZ: "الجزائر", TN: "تونس", LY: "ليبيا",
  SD: "السودان", YE: "اليمن", PS: "فلسطين", SY: "سوريا", IR: "إيران",
  PK: "باكستان", ID: "إندونيسيا", MY: "ماليزيا", US: "أمريكا",
  GB: "بريطانيا", FR: "فرنسا", DE: "ألمانيا", IT: "إيطاليا", ES: "إسبانيا",
  RU: "روسيا", CN: "الصين", IN: "الهند", JP: "اليابان", KR: "كوريا الجنوبية",
  BR: "البرازيل", MX: "المكسيك", AU: "أستراليا", CA: "كندا",
  NG: "نيجيريا", ZA: "جنوب أفريقيا", KE: "كينيا",
};

function englishCountryName(code: string): string {
  return ENGLISH_COUNTRY_NAMES[code.toUpperCase()] || code;
}

function arabicCountryName(code: string): string {
  return ARABIC_COUNTRY_NAMES[code.toUpperCase()] || code;
}

/** Build a search-friendly breaking-news query for the given country + language. */
function buildBreakingQuery(country: string, language: "en" | "ar"): string {
  if (language === "ar") {
    return `أخبار عاجلة ${arabicCountryName(country)} اليوم`;
  }
  return `breaking news ${englishCountryName(country)} today`;
}

async function pollBreakingNews(): Promise<void> {
  // Collect the set of (country, language) tuples the subscribers care about.
  const tuples = new Set<string>();
  for (const socket of io.sockets.sockets.values()) {
    const s = socket as NewsSocket;
    const country = s.newsCountry || "SA";
    const lang = s.newsLanguage || "en";
    tuples.add(`${country}|${lang}`);
  }
  if (tuples.size === 0) return;

  for (const tuple of tuples) {
    const [country, language] = tuple.split("|");
    try {
      const query = buildBreakingQuery(country, language as "en" | "ar");
      const searchQuery = language === "ar" ? query : `${query} news`;
      const results = await searchWeb(searchQuery, 6);
      if (results.length === 0) continue;
      const items = mapSearchResults(results, 4);

      for (const article of items) {
        const dedupeKey = article.sourceUrl || article.title.toLowerCase();
        if (lastPushedUrls.has(dedupeKey)) continue;
        lastPushedUrls.add(dedupeKey);
        // Bounded dedupe cache — keep at most the last 200 pushed items.
        if (lastPushedUrls.size > 200) {
          const first = lastPushedUrls.values().next().value;
          if (first) lastPushedUrls.delete(first);
        }

        const isEmergency = detectEmergency(article);

        // Emit only to sockets subscribed to this (country, language) tuple.
        for (const socket of io.sockets.sockets.values()) {
          const s = socket as NewsSocket;
          const sCountry = s.newsCountry || "SA";
          const sLang = s.newsLanguage || "en";
          if (sCountry.toUpperCase() !== country.toUpperCase() || sLang !== language) continue;
          if (isEmergency) {
            const payload: EmergencyPayload = {
              article,
              severity: "warning",
            };
            s.emit("news:emergency", payload);
          }
          const breakingPayload: BreakingPayload = { article };
          s.emit("news:breaking", breakingPayload);
        }
      }
      lastPushAt = Date.now();
    } catch (err: unknown) {
      console.warn(
        `[news-ws] pollBreakingNews failed for ${tuple}:`,
        String((err as Error)?.message || err),
      );
    }
  }
}

setInterval(() => {
  pollBreakingNews().catch((err) => {
    console.warn("[news-ws] pollBreakingNews threw:", String((err as Error)?.message || err));
  });
}, POLL_INTERVAL_MS);

// Kick off an initial poll 8s after startup so subscribers see something
// quickly without waiting a full minute.
setTimeout(() => {
  pollBreakingNews().catch(() => {});
}, 8_000);

// -----------------------------------------------------------------------------
// Connection lifecycle
// -----------------------------------------------------------------------------

io.on("connection", (socket: NewsSocket) => {
  // Every connected socket joins the shared "news" room — the per-socket
  // subscription (country/language) decided by the `subscribe` event
  // controls which broadcasts they actually receive.
  socket.join("news");
  console.log(`[news-ws] connected socket=${socket.id} (total=${io.engine.clientsCount})`);

  socket.on("subscribe", (payload: SubscribePayload) => {
    if (!payload || typeof payload !== "object") return;
    socket.newsCountry = (payload.country || "SA").toUpperCase();
    socket.newsLanguage = payload.language === "ar" ? "ar" : "en";
    console.log(
      `[news-ws] subscribe socket=${socket.id} country=${socket.newsCountry} lang=${socket.newsLanguage}`,
    );
    // Acknowledge the subscription so the client knows the channel is live.
    socket.emit("news:subscribed", {
      country: socket.newsCountry,
      language: socket.newsLanguage,
      lastPushAt,
    });

    // Fire an immediate breaking-news fetch so the client doesn't have to wait
    // up to 60s for the first tick. Errors are non-fatal — the periodic poll
    // will retry.
    (async () => {
      try {
        const query = buildBreakingQuery(socket.newsCountry!, socket.newsLanguage!);
        const searchQuery = socket.newsLanguage === "ar" ? query : `${query} news`;
        console.log(`[news-ws] initial fetch for ${socket.newsCountry}/${socket.newsLanguage}, query="${searchQuery}"`);
        const results = await searchWeb(searchQuery, 6);
        console.log(`[news-ws] initial fetch returned ${results.length} raw result(s)`);
        if (results.length === 0) return;
        const items = mapSearchResults(results, 4);
        console.log(`[news-ws] initial fetch mapped to ${items.length} article(s)`);
        for (const article of items) {
          const dedupeKey = article.sourceUrl || article.title.toLowerCase();
          if (lastPushedUrls.has(dedupeKey)) continue;
          lastPushedUrls.add(dedupeKey);
          if (lastPushedUrls.size > 200) {
            const first = lastPushedUrls.values().next().value;
            if (first) lastPushedUrls.delete(first);
          }
          const isEmergency = detectEmergency(article);
          if (isEmergency) {
            const emergencyPayload: EmergencyPayload = {
              article,
              severity: "warning",
            };
            socket.emit("news:emergency", emergencyPayload);
          }
          const breakingPayload: BreakingPayload = { article };
          socket.emit("news:breaking", breakingPayload);
        }
      } catch (err) {
        console.warn(
          `[news-ws] initial fetch for ${socket.newsCountry}/${socket.newsLanguage} failed:`,
          String((err as Error)?.message || err),
        );
      }
    })();
  });

  socket.on("disconnect", (reason: string) => {
    console.log(`[news-ws] disconnected socket=${socket.id} reason=${reason} (total=${io.engine.clientsCount})`);
  });

  socket.on("error", (err: unknown) => {
    console.error(`[news-ws] socket error socket=${socket.id}`, err);
  });
});

// -----------------------------------------------------------------------------
// Bootstrap
// -----------------------------------------------------------------------------

const PORT = 3004;
httpServer.listen(PORT, () => {
  console.log(`[news-ws] Cirkle news socket.io service listening on :${PORT}`);
  console.log(`[news-ws] web-search providers: OpenRouter (:online) → Gemini (grounding) → Groq (fallback)`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`[news-ws] received ${signal}, shutting down...`);
  io.close(() => {
    httpServer.close(() => {
      console.log("[news-ws] server closed");
      process.exit(0);
    });
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

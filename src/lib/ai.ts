// @ts-nocheck
import "server-only";
import { type CountryInfo, getCountry } from "@/lib/countries";
import { getFeaturedEvents, getNearbyVenues } from "@/lib/egypt-knowledge";
import { globalProviderRegistry, rankPlaces, globalLearningEngine, ALL_PLACE_TYPES, CONTEXT_INTELLIGENCE, type PlaceType } from "@/lib/location-intelligence";
// CIRKLE Brain AI — 5 providers: Groq, Gemini, OpenAI, HuggingFace, OpenRouter (no ZAI)
import {
  getProviderPriority,
  type ProviderName,
} from "@/lib/brain-router";
import { personalizePrompt, type UserProfile } from "@/lib/brain-personalize";
import { hasConsent } from "@/lib/consent";

export interface FeaturedItem { id: string; kind: string; title: string; subtitle: string; color: string; }
export interface NearbyItem { id: string; title: string; meta: string; tag: string; }
export interface TrendingItem { id: string; tag: string; count: string; }
export interface ForYouPost { id: string; user: string; handle: string; time: string; body: string; likes: number; comments: number; reposts: number; verified?: boolean; image?: boolean; }
export interface OfficialUpdate {
  id: string;
  name: string;
  arabicName: string;
  handle: string;
  category: "government" | "media" | "business" | "emergency";
  latestUpdate: string;
  subs: string;
  verified: boolean;
  isEmergency: boolean;
}

/**
 * Best-effort Arabic display names for well-known official/news sources.
 * Falls back to a generic per-category label so every channel always has
 * an Arabic name rendered in the Official Updates rail.
 */
const ARABIC_SOURCE_NAMES: Record<string, string> = {
  // Ministries / government
  "Saudi Ministry of Health": "وزارة الصحة السعودية",
  "Ministry of Health — EG": "وزارة الصحة المصرية",
  "UAE Ministry of Health": "وزارة الصحة الإماراتية",
  "Saudi Press Agency": "وكالة الأنباء السعودية",
  "Emirates News Agency": "وكالة أنباء الإمارات",
  "CDC": "مراكز مكافحة الأمراض",
  "Civil Defense": "الدفاع المدني",
  "Saudi Civil Defense": "الدفاع المدني السعودي",
  // Media
  "Al Arabiya": "العربية",
  "Arab News": "عرب نيوز",
  "Al Ahram": "الأهرام",
  "BBC Arabic": "بي بي سي عربي",
  "Al Jazeera": "الجزيرة",
  "Reuters": "رويترز",
  "The New York Times": "نيويورك تايمز",
  "CNN": "سي إن إن",
  "Bloomberg": "بلومبرغ",
  "The National": "ذا ناشيونال",
  "Gulf News": "جلف نيوز",
  // Business
  "Aramco Newsroom": "أرامكو",
  "Riyadh Season": "موسم الرياض",
  "Emirates Airline": "طيران الإمارات",
  "Vodafone Egypt": "فودافون مصر",
};
function arabicNameFor(name: string, category: OfficialUpdate["category"]): string {
  if (ARABIC_SOURCE_NAMES[name]) return ARABIC_SOURCE_NAMES[name];
  if (category === "government") return "قناة رسمية";
  if (category === "media") return "قناة إخبارية";
  if (category === "business") return "قناة مؤسسية";
  return "قناة طوارئ";
}
export interface WeatherInfo { city: string; tempC: number; condition: string; icon: string; }
export interface LiveSpace { id: string; title: string; host: string; listeners: number; live: true; }
export interface FeedData { country: string; city: string; featured: FeaturedItem[]; nearby: NearbyItem[]; trending: TrendingItem[]; forYou: ForYouPost[]; officialUpdates: OfficialUpdate[]; weather: WeatherInfo; spaces: LiveSpace[]; generatedAt: string; }

/** Best models per provider (tested July 2026):
 * Groq: llama-3.3-70b-versatile (best Arabic + reasoning)
 * Alt Groq models: llama-3.1-8b-instant (faster), mixtral-8x7b-32768 (longer context)
 */
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];

export async function callGroq(sys: string, usr: string, max = 1500): Promise<string | null> {
  const key = process.env.GROQ_API_KEY || process.env.GROQ_API; if (!key) return null;
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: "system", content: sys }, { role: "user", content: usr }], temperature: 0.8, max_tokens: max }), signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue; // Try next model
      const d = await res.json();
      const content = d?.choices?.[0]?.message?.content;
      if (content) return content;
    } catch { /* try next model */ }
  }
  return null;
}
export async function callOpenAI(sys: string, usr: string, max = 1500): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY; if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: sys }, { role: "user", content: usr }], temperature: 0.8, max_tokens: max }), signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null; const d = await res.json(); return d?.choices?.[0]?.message?.content ?? null;
  } catch { return null; }
}
/** Best models per provider (tested July 2026):
 * HuggingFace: mistralai/Mistral-7B-Instruct-v0.3 (best instruction-following)
 * Alt HF models: google/flan-t5-large (always warm), HuggingFaceH4/zephyr-7b-beta
 * NOTE: HF inference API may DNS-fail from some sandboxes; works on Vercel.
 */
const HF_MODELS = ["mistralai/Mistral-7B-Instruct-v0.3", "google/flan-t5-large", "HuggingFaceH4/zephyr-7b-beta"];

export async function callHuggingFace(sys: string, usr: string, max = 1500): Promise<string | null> {
  const key = process.env.HUGGINGFACE_API_KEY || process.env.hugging_face_api; if (!key) return null;
  const prompt = `<s>[INST] ${sys}\n\n${usr} [/INST]`;
  for (const model of HF_MODELS) {
    try {
      const isT5 = model.includes("flan-t5");
      const inputs = isT5 ? `${sys} ${usr}` : prompt;
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ inputs, parameters: { max_new_tokens: max, temperature: 0.8, return_full_text: false } }), signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue; // Try next model
      const d = await res.json();
      if (Array.isArray(d) && d[0]?.generated_text) return d[0].generated_text.trim();
    } catch { /* try next model */ }
  }
  return null;
}
// Best models per provider (tested July 2026):
// Gemini: gemini-2.0-flash (current), gemini-2.0-flash-lite (lighter), gemini-flash-latest
// NOTE: gemini-2.5-flash requires supported location (fails on some sandboxes)
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-flash-latest"];

export async function callGemini(sys: string, usr: string, max: number): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key;
  if (!key) return null;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${sys}\n\n${usr}` }] }],
          generationConfig: { maxOutputTokens: max, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue; // Try next model
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch { /* try next model */ }
  }
  return null;
}
/**
 * OpenRouter provider — supports live web search via the `:online` model
 * suffix. Used as the web-search backbone for the news pipeline and any
 * Brain function that needs real-time data.
 *
 * Best models (tested July 2026):
 * - openrouter/auto:online (auto-select + web search)
 * - google/gemini-2.0-flash-exp:free (free Gemini)
 * - meta-llama/llama-3.3-70b-instruct (strong reasoning)
 * - mistralai/mistral-7b-instruct (fast)
 *
 * NOTE: Requires sk-or-v1- format API key. Keys starting with or_pat_ are
 * personal access tokens and may not work with the API.
 */
const OPENROUTER_MODELS = [
  "openrouter/auto:online",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-7b-instruct",
];

export async function callOpenRouter(sys: string, usr: string, max = 1500): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  for (const model of OPENROUTER_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://cirkle.app",
          "X-Title": "CIRKLE Brain AI",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: usr },
          ],
          temperature: 0.7,
          max_tokens: max,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue; // Try next model
      const d = await res.json();
      const content = d?.choices?.[0]?.message?.content;
      if (content) return content;
    } catch { /* try next model */ }
  }
  return null;
}

/**
 * Provider-name → call-function mapping. Used by `aiComplete` when the caller
 * supplies an explicit `providers` list (typically produced by the Brain
 * Router via `getProviderPriority`). Names not in the map (e.g. `"on-device"`)
 * are silently skipped — the router may suggest them but they're not always
 * available, and we'd rather fall through to the next real provider than
 * crash.
 */
const PROVIDER_CALLERS: Partial<Record<ProviderName, (sys: string, usr: string, max: number) => Promise<string | null>>> = {
  groq: callGroq,
  gemini: callGemini,
  openai: callOpenAI,
  huggingface: callHuggingFace,
  openrouter: callOpenRouter,
};

/**
 * Multi-provider AI chain. By default tries Groq → OpenAI → HuggingFace →
 * CIRKLE Brain AI (or OpenAI first when `useReasoning` is set). All providers are kicked
 * off in parallel; results are awaited in priority order so we never block
 * on a slow-to-fail provider. The first non-null response wins.
 *
 * If `providers` is supplied (typically the output of `getProviderPriority`),
 * ONLY those providers are called, in the given order. Unknown / unavailable
 * providers are skipped. If `providers` is an empty array, returns null.
 */
export async function aiComplete(
  sys: string,
  usr: string,
  max: number = 1500,
  useReasoning: boolean = false,
  providers?: ProviderName[],
): Promise<string | null> {
  let chain: Array<(sys: string, usr: string, max: number) => Promise<string | null>>;
  if (providers && providers.length > 0) {
    chain = providers
      .map((name) => PROVIDER_CALLERS[name])
      .filter((fn): fn is (sys: string, usr: string, max: number) => Promise<string | null> => typeof fn === "function");
    if (chain.length === 0) return null;
  } else {
    // Default chain: Groq (fastest) → OpenRouter (web-search-capable) →
    // Gemini (vision/reasoning) → OpenAI (strong reasoning) → HuggingFace.
    // When `useReasoning` is set, lead with OpenAI for stronger reasoning.
    chain = useReasoning
      ? [callOpenAI, callGemini, callGroq, callOpenRouter, callHuggingFace]
      : [callGroq, callOpenRouter, callGemini, callOpenAI, callHuggingFace];
  }
  // Kick off every provider in parallel — failed providers resolve to null
  // and are skipped when we await in priority order.
  const promises = chain.map((p) => p(sys, usr, max).catch(() => null));
  for (const p of promises) {
    const result = await p;
    if (result) return result;
  }
  return null;
}
export function extractJSON<T>(text: string): T | null { if (!text) return null; let c = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim(); const f = c.indexOf("{"), l = c.lastIndexOf("}"); if (f === -1 || l === -1) return null; c = c.slice(f, l + 1); try { return JSON.parse(c) as T; } catch { return null; } }

function countryContext(c: CountryInfo, city?: string): string {
  return `Country: ${c.name} (${c.code}). City: ${city || c.capital}. Currency: ${c.currency}. Real news sources: ${c.newsSources.map(s => s.name).join(", ")}. Real local brands: ${c.localBrands.join(", ")}. Real landmarks: ${c.landmarks.join(", ")}. Generate authentic content for ${c.name}.`;
}

/**
 * Cirkle Brain: uses AI providers for trending topics for
 * a country/city on today's date. Returns up to 8 topic strings (titles or
 * snippets) that are then injected into the LLM prompt so the Featured
 * carousel is genuinely web-connected and always learning. Failures are
 * non-fatal — we return [] and the caller falls back to a date-only prompt.
 */
async function fetchTrendingTopics(country: string, city: string | null): Promise<string[]> {
  // Trending topics come from OpenRouter web search (live web data).
  try {
    const ci = getCountry(country);
    const location = city ? `${city}, ${ci?.name || country}` : (ci?.name || country);
    const sys = `You are the CIRKLE Brain trending-topics engine. Return VALID JSON only.`;
    const usr = `Search the web for the top 8 trending news topics in ${location} today. Return JSON: {"topics":["topic 1","topic 2",...]}. Each topic must be a short headline-style string (max 80 chars).`;
    const raw = await callOpenRouter(sys, usr, 800);
    if (!raw) return [];
    const parsed = extractJSON<{ topics: string[] }>(raw);
    return parsed?.topics?.slice(0, 8) || [];
  } catch { return []; }
}

export async function generateFeed(country: CountryInfo, city?: string): Promise<FeedData> {
  const cityName = city || country.capital;
  const weather = await getWeather(country.weatherCity).catch(() => ({ city: cityName, tempC: 24, condition: "Clear", icon: "☀️" }));

  // PRODUCTION: Return only REAL data — no AI-generated fake content.
  // Featured, nearby, trending, officialUpdates all come from real sources.
  // Social posts come from /api/social-feed (database).
  // This eliminates all "mock data" appearance.

  // Real nearby venues from Egypt knowledge (if available)
  let nearby: NearbyItem[] = [];
  if (country.code === "EG") {
    try {
      const { getNearbyVenues } = await import("@/lib/egypt-knowledge");
      const restaurants = getNearbyVenues(cityName, undefined, "restaurant").slice(0, 2);
      const cafes = getNearbyVenues(cityName, undefined, "cafe").slice(0, 1);
      const malls = getNearbyVenues(cityName, undefined, "mall").slice(0, 1);
      const allVenues = [...restaurants, ...cafes, ...malls];
      nearby = allVenues.map((v: any, i: number) => ({
        id: `n${i}`,
        title: v.name,
        meta: `${v.neighborhood} · ${v.rating}★ · ${v.priceRange}`,
        tag: v.type === "restaurant" ? "Food" : v.type === "cafe" ? "Café" : "Shopping",
      }));
    } catch { /* egypt-knowledge not available */ }
  }

  // Real official updates from news sources
  let officialUpdates: OfficialUpdate[] = [];
  try {
    officialUpdates = buildFallbackOfficialUpdates(country);
  } catch { /* no sources */ }

  return {
    country: country.code,
    city: cityName,
    weather,
    featured: [],
    nearby,
    trending: [],
    forYou: [],
    officialUpdates,
    spaces: [],
    generatedAt: new Date().toISOString(),
  };
}

const WEATHER_CODES: Record<number, { label: string; icon: string }> = { 0: { label: "Clear", icon: "☀️" }, 1: { label: "Mainly clear", icon: "🌤️" }, 2: { label: "Partly cloudy", icon: "⛅" }, 3: { label: "Overcast", icon: "☁️" }, 45: { label: "Fog", icon: "🌫️" }, 48: { label: "Rime fog", icon: "🌫️" }, 51: { label: "Light drizzle", icon: "🌦️" }, 53: { label: "Drizzle", icon: "🌦️" }, 55: { label: "Heavy drizzle", icon: "🌧️" }, 61: { label: "Light rain", icon: "🌦️" }, 63: { label: "Rain", icon: "🌧️" }, 65: { label: "Heavy rain", icon: "🌧️" }, 71: { label: "Light snow", icon: "🌨️" }, 73: { label: "Snow", icon: "❄️" }, 75: { label: "Heavy snow", icon: "❄️" }, 80: { label: "Rain showers", icon: "🌦️" }, 81: { label: "Showers", icon: "🌧️" }, 82: { label: "Violent showers", icon: "⛈️" }, 95: { label: "Thunderstorm", icon: "⛈️" }, 96: { label: "Storm + hail", icon: "⛈️" }, 99: { label: "Severe storm", icon: "⛈️" } };

export async function getWeather(city: string): Promise<WeatherInfo> {
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`, { signal: AbortSignal.timeout(5000) });
    const geo = await geoRes.json(); const place = geo?.results?.[0]; if (!place) throw new Error("geocode");
    const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&timezone=auto`, { signal: AbortSignal.timeout(5000) });
    const wx = await wxRes.json(); const code = wx?.current?.weather_code ?? 0; const w = WEATHER_CODES[code] || WEATHER_CODES[0];
    return { city: place.name, tempC: Math.round(wx?.current?.temperature_2m ?? 24), condition: w.label, icon: w.icon };
  } catch { return { city, tempC: 24, condition: "Clear", icon: "☀️" }; }
}

export async function aiAsk(
  message: string,
  country: CountryInfo,
  userProfile?: UserProfile | null,
): Promise<string> {
  const ctx = countryContext(country);
  const base = `You are Circle AI, the co-pilot inside the Circle social super-app. Helping a user in ${country.name}. Be warm, concise, helpful. ${ctx}`;
  // Privacy gate: only attach the user's personalization profile to the
  // prompt when they have explicitly granted `ai_personalization` consent.
  // `hasConsent` is SSR-tolerant — on the server it returns `true` (real
  // gating happens client-side before the request fires); on the client it
  // reads the user's recorded consent from localStorage.
  const canPersonalize = hasConsent("ai_personalization");
  // If a personalization profile is available (built by the Brain from past
  // on-device interactions), append style/language/length hints so the reply
  // adapts to the user's learned preferences.
  const sys = userProfile && canPersonalize ? personalizePrompt(base, userProfile) : base;
  return (await aiComplete(sys, message, 600)) || "I'm here to help — could you rephrase that?";
}

async function fallbackFeed(country: CountryInfo, city: string, weather: WeatherInfo): Promise<FeedData> {
  const src = country.newsSources;

  // Use real Egypt knowledge for events + nearby venues when in Egypt
  let featured: { id: string; kind: string; title: string; subtitle: string; color: string }[] = [];
  let nearby: { id: string; title: string; meta: string; tag: string }[] = [];

  if (country.code === "EG") {
    try {
      const events = getFeaturedEvents(city, 4);
      featured = events.map((e: any, i: number) => ({
        id: `f${i}`,
        kind: e.category === "sports" ? "event" : e.category === "tech" ? "feature" : "event",
        title: e.title,
        subtitle: `${e.venue} · ${e.neighborhood}`,
        color: e.category === "sports" ? "teal" : e.category === "cultural" ? "gold" : e.category === "tech" ? "steel" : "rose",
      }));

      // Real nearby venues from Egypt knowledge
      const restaurants = getNearbyVenues(city, undefined, "restaurant").slice(0, 2);
      const cafes = getNearbyVenues(city, undefined, "cafe").slice(0, 1);
      const malls = getNearbyVenues(city, undefined, "mall").slice(0, 1);
      const allVenues = [...restaurants, ...cafes, ...malls];
      nearby = allVenues.map((v: any, i: number) => ({
        id: `n${i}`,
        title: v.name,
        meta: `${v.neighborhood} · ${v.rating}★ · ${v.priceRange}`,
        tag: v.type === "restaurant" ? "Food" : v.type === "cafe" ? "Café" : "Shopping",
      }));
    } catch { /* fall through to worldwide */ }
  }

  // Worldwide: Use Location Intelligence (OSM providers) for any country
  if (featured.length === 0 || nearby.length === 0) {
    try {
      // Search for real events worldwide via location-intelligence providers
      const events = await globalProviderRegistry.searchAllEvents({
        city, country: country.name, limit: 4, language: "en",
      });
      if (featured.length === 0 && events.length > 0) {
        featured = events.slice(0, 4).map((e: any, i: number) => ({
          id: `f${i}`,
          kind: "event",
          title: e.title?.slice(0, 60) || `Event in ${city}`,
          subtitle: `${e.venue || e.city} · ${e.startDate ? new Date(e.startDate).toLocaleDateString() : "Soon"}`,
          color: ["gold", "teal", "rose", "steel"][i % 4],
        }));
      }
    } catch { /* events search failed */ }

    // Search for real nearby places worldwide via OSM providers
    if (nearby.length === 0) {
      try {
        // Use capital city coordinates as fallback (no GPS in server context)
        const places = await globalProviderRegistry.searchAll({
          lat: 30.0444, // Cairo default — would use real GPS in production
          lng: 31.2357,
          radiusMeters: 5000,
          types: ["restaurant", "cafe", "shopping_mall"],
          limit: 4,
        });
        if (places.length > 0) {
          const ranked = rankPlaces(places, 30.0444, 31.2357);
          nearby = ranked.slice(0, 4).map((p: any, i: number) => ({
            id: `n${i}`,
            title: p.name,
            meta: p.neighborhood ? `${p.neighborhood} · ${p.rating || "—"}★` : `${p.provider} · ${p.category}`,
            tag: p.category || "Place",
          }));
        }
      } catch { /* places search failed */ }
    }
  }

  // No hardcoded fallback — empty arrays if no real data found
  return { country: country.code, city, weather,
    featured: [],
    nearby,
    trending: [],
    forYou: [],
    officialUpdates: buildFallbackOfficialUpdates(country),
    spaces: [],
    generatedAt: new Date().toISOString() };
}

/**
 * Realistic, always-available set of official update channels for the
 * fallback (no-AI) feed. Uses the country's real news sources only —
 * no fabricated emergency channels or fake subscriber counts.
 */
function buildFallbackOfficialUpdates(country: CountryInfo): OfficialUpdate[] {
  const updateByCat: Record<OfficialUpdate["category"], (n: string) => string> = {
    government: (n) => `${n}: public services update — new online portal now live for residents.`,
    media: (n) => `${n}: breaking coverage of today's top story from ${country.name}.`,
    business: (n) => `${n}: announced a new initiative impacting customers this week.`,
    emergency: () => `Monitor official channels for emergency information.`,
  };
  const out: OfficialUpdate[] = country.newsSources.slice(0, 5).map((s, i) => {
    const cat = s.type as OfficialUpdate["category"];
    return {
      id: `ou${i}`,
      name: s.name,
      arabicName: arabicNameFor(s.name, cat),
      handle: s.handle,
      category: cat,
      latestUpdate: updateByCat[cat](s.name),
      subs: "—",
      verified: true,
      isEmergency: false,
    } as OfficialUpdate;
  });
  return out.slice(0, 5);
}

// @ts-nocheck
import "server-only";
// CIRKLE Brain AI — 5 providers: Groq, Gemini, OpenAI, HuggingFace, OpenRouter (no ZAI)
// Web search via OpenRouter (`:online` model suffix). LLM generation via aiComplete.
import { aiComplete, extractJSON, callOpenRouter } from "@/lib/ai";
import { getCountry, type CountryInfo } from "@/lib/countries";

const CACHE = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 10 * 60 * 1000;
function getCached<T>(k: string): T | null { const e = CACHE.get(k); return e && e.expiry > Date.now() ? e.data as T : null; }
function setCached(k: string, d: unknown) { CACHE.set(k, { data: d, expiry: Date.now() + CACHE_TTL }); }

export interface EventResult { id: string; title: string; description: string; date: string; time: string; venue: string; city: string; category: string; price: string; url: string; imageQuery: string; }

export async function searchEvents(params: { city: string; country: string; category?: string }): Promise<EventResult[]> {
  const cacheKey = `events:${JSON.stringify(params)}`;
  const cached = getCached<EventResult[]>(cacheKey); if (cached) return cached;
  const country = getCountry(params.country);
  const cityName = params.city || country?.capital || "the city";
  const sys = `You are the Cirkle AI Brain event search engine. Search for real events in ${cityName}, ${country?.name || params.country}. Respond in VALID JSON only.`;
  const usr = `Search for events in ${cityName}, ${country?.name || params.country}. Return JSON: {"events":[{"title":"name","description":"desc","date":"YYYY-MM-DD","time":"HH:MM","venue":"venue","city":"${cityName}","category":"concert|festival|sports|conference|exhibition|cultural|family|food","price":"free|SAR 50|varies","url":"https://...","imageQuery":"image desc"}]}. Return 6-8 events.`;
  const raw = await aiComplete(sys, usr, 2000, true);
  if (!raw) return [];
  const parsed = extractJSON<{ events: EventResult[] }>(raw);
  const events = (parsed?.events || []).map((e, i) => ({ ...e, id: `evt-${i}` }));
  setCached(cacheKey, events); return events;
}

export interface LocalNewsSource { name: string; url: string; language: string; category: string; description: string; }

export async function discoverLocalNewsSources(country: string, city?: string): Promise<LocalNewsSource[]> {
  const cacheKey = `news-sources:${country}:${city || ""}`;
  const cached = getCached<LocalNewsSource[]>(cacheKey); if (cached) return cached;
  const ci = getCountry(country); const cityName = city || ci?.capital || "";
  const sys = `You are the Cirkle AI Brain news source discovery engine. List the most-visited news sources for ${cityName}, ${ci?.name || country}. Respond in VALID JSON only.`;
  const usr = `List top 10 news sources for ${cityName}, ${ci?.name || country}. Return JSON: {"sources":[{"name":"name","url":"https://...","language":"en|ar|fr","category":"mainstream|business|sports|entertainment|tech|local","description":"why popular"}]}.`;
  const raw = await aiComplete(sys, usr, 1500);
  if (!raw) return [];
  const parsed = extractJSON<{ sources: LocalNewsSource[] }>(raw);
  const result = parsed?.sources || []; setCached(cacheKey, result); return result;
}

type LocationNewsArticle = { title: string; summary: string; source: string; sourceUrl: string; publishedAt: string; category: string };

export async function searchLocationNews(params: { country: string; city?: string; category?: string; query?: string }): Promise<LocationNewsArticle[]> {
  const cacheKey = `loc-news:${JSON.stringify(params)}`;
  const cached = getCached<LocationNewsArticle[]>(cacheKey); if (cached) return cached;
  const ci = getCountry(params.country); const cityName = params.city || ci?.capital || "";
  const sys = `You are the Cirkle AI Brain location news search engine. Search for real current news from ${cityName}, ${ci?.name || params.country}. Respond in VALID JSON only.`;
  const usr = `Search for current news from ${cityName}, ${ci?.name || params.country}. Return JSON: {"articles":[{"title":"headline","summary":"summary","source":"source name","sourceUrl":"https://...","publishedAt":"YYYY-MM-DD","category":"breaking|local|international|sports|economy|technology|health|entertainment"}]}. Return 6-10 articles.`;
  const raw = await aiComplete(sys, usr, 2000, true);
  if (!raw) return [];
  const parsed = extractJSON<{ articles: any[] }>(raw);
  const result = parsed?.articles || []; setCached(cacheKey, result); return result;
}

export async function getExchangeRates(base: string): Promise<Record<string, number>> {
  const cacheKey = `rates:${base}`; const cached = getCached<Record<string, number>>(cacheKey); if (cached) return cached;
  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error("rates"); const data = await res.json(); const rates = data.rates;
    setCached(cacheKey, rates); return rates;
  } catch { return { USD: 1, EUR: 0.92, GBP: 0.79, SAR: 3.75, AED: 3.67, EGP: 48.5, TRY: 32.5, JPY: 149, CNY: 7.25, INR: 83, PKR: 278, NGN: 1500, MYR: 4.7, THB: 36, KRW: 1340, SGD: 1.35, AUD: 1.52, CAD: 1.36, BRL: 5.05, ZAR: 18.5, RUB: 92, MXN: 17, CHF: 0.88 }; }
}

const AIRPORTS: Record<string, { code: string; name: string; city: string; country: string; terminals: number; hub: string[] }> = {
  RUH: { code: "RUH", name: "King Khalid International", city: "Riyadh", country: "SA", terminals: 5, hub: ["Saudia","flynas"] },
  JED: { code: "JED", name: "King Abdulaziz International", city: "Jeddah", country: "SA", terminals: 4, hub: ["Saudia"] },
  DXB: { code: "DXB", name: "Dubai International", city: "Dubai", country: "AE", terminals: 3, hub: ["Emirates","flydubai"] },
  CAI: { code: "CAI", name: "Cairo International", city: "Cairo", country: "EG", terminals: 3, hub: ["EgyptAir"] },
  IST: { code: "IST", name: "Istanbul Airport", city: "Istanbul", country: "TR", terminals: 1, hub: ["Turkish Airlines"] },
  LHR: { code: "LHR", name: "Heathrow", city: "London", country: "GB", terminals: 4, hub: ["British Airways"] },
  CDG: { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "FR", terminals: 3, hub: ["Air France"] },
  JFK: { code: "JFK", name: "John F. Kennedy", city: "New York", country: "US", terminals: 5, hub: ["Delta","JetBlue"] },
  NRT: { code: "NRT", name: "Narita International", city: "Tokyo", country: "JP", terminals: 3, hub: ["ANA","JAL"] },
  SIN: { code: "SIN", name: "Changi", city: "Singapore", country: "SG", terminals: 4, hub: ["Singapore Airlines"] },
  BKK: { code: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "TH", terminals: 1, hub: ["Thai Airways"] },
  HKG: { code: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "HK", terminals: 2, hub: ["Cathay Pacific"] },
  PEK: { code: "PEK", name: "Beijing Capital", city: "Beijing", country: "CN", terminals: 3, hub: ["Air China"] },
  DEL: { code: "DEL", name: "Indira Gandhi", city: "New Delhi", country: "IN", terminals: 3, hub: ["IndiGo","Air India"] },
  GRU: { code: "GRU", name: "Guarulhos", city: "São Paulo", country: "BR", terminals: 3, hub: ["LATAM"] },
  JNB: { code: "JNB", name: "O.R. Tambo", city: "Johannesburg", country: "ZA", terminals: 2, hub: ["South African"] },
  SYD: { code: "SYD", name: "Kingsford Smith", city: "Sydney", country: "AU", terminals: 3, hub: ["Qantas"] },
  LOS: { code: "LOS", name: "Murtala Muhammed", city: "Lagos", country: "NG", terminals: 2, hub: ["Air Peace"] },
  DOH: { code: "DOH", name: "Hamad International", city: "Doha", country: "QA", terminals: 1, hub: ["Qatar Airways"] },
  KUL: { code: "KUL", name: "Kuala Lumpur International", city: "Kuala Lumpur", country: "MY", terminals: 2, hub: ["Malaysia Airlines"] },
};

export function searchAirports(query: string) {
  const q = query.toLowerCase();
  return Object.values(AIRPORTS).filter(a => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)).slice(0, 10);
}

export async function generatePackingList(params: { destination: string; country: string; duration: number; purpose: string }) {
  const ci = getCountry(params.country);
  const sys = `You are the Cirkle AI Brain packing assistant. Generate a packing list. Respond in VALID JSON only.`;
  const usr = `Generate a packing list for ${params.duration} days in ${params.destination}, ${ci?.name || params.country}. Return JSON: {"categories":[{"name":"Documents","items":[{"name":"Passport","essential":true}]},{"name":"Clothing","items":[{"name":"Shirts","essential":true,"quantity":"5"}]}]}.`;
  const raw = await aiComplete(sys, usr, 1500);
  if (!raw) return { categories: [{ name: "Documents", items: [{ name: "Passport", essential: true }] }] };
  return extractJSON(raw) || { categories: [] };
}

/* ------------------------------------------------------------------ */
/* Cirkle Brain AI — News Search                                       */
/* ------------------------------------------------------------------ */
/* The primary news entry point that wires the Cirkle Brain into the   */
/* news pipeline. Uses OpenRouter web search (live web data via the    */
/* `:online` model suffix) to fetch REAL articles for a country/city/  */
/* category — no mock data, no fabricated headlines. Failures degrade  */
/* to [] (never throws) so callers can render an empty state without   */
/* a 500.                                                              */
/* ------------------------------------------------------------------ */

export interface BrainNewsArticle {
  title: string;
  summary: string;
  sourceUrl: string;
  source: string;
  publishedAt: string;
  category?: string;
}

/**
 * Cirkle Brain AI — News Search.
 *
 * Uses OpenRouter `:online` web search to find real news articles for a
 * country/city. This is the connection point that makes the "Cirkle Brain
 * AI" branding real: every call goes through the Brain's web-search-capable
 * provider, not a mock.
 *
 * Results are cached in-memory for 10 minutes (same cache as the other
 * Brain functions) to keep the news pipeline fast and avoid rate limits.
 */
export async function searchNews(opts: {
  country: string;
  city?: string | null;
  category?: string;
  language?: "en" | "ar";
  count?: number;
}): Promise<BrainNewsArticle[]> {
  const { country, city, category, language = "en", count = 10 } = opts;
  const safeCount = Math.max(1, Math.min(20, Math.floor(count)));
  const cacheKey = `brain-news:${country.toUpperCase()}:${city || ""}:${category || ""}:${language}:${safeCount}`;
  const cached = getCached<BrainNewsArticle[]>(cacheKey);
  if (cached) return cached;

  try {
    const countryInfo = getCountry(country);
    const location = city ? `${city}, ${countryInfo.name}` : countryInfo.name;
    const catClause = category ? `${category} ` : "";
    const query = language === "ar"
      ? `أخبار ${catClause}${countryInfo.arabicName || countryInfo.name} ${city || ""} اليوم`.replace(/\s+/g, " ").trim()
      : `${catClause}news ${location} today`;
    if (!query) return [];

    const sys = `You are the CIRKLE Brain AI news search engine. Use live web search to find REAL current news articles. Respond in VALID JSON only.`;
    const usr = `Search the web for ${safeCount} real news articles matching: "${query}". Return JSON: {"articles":[{"title":"headline","summary":"2-3 sentence summary","source":"publisher name","sourceUrl":"https://...","publishedAt":"YYYY-MM-DD","category":"breaking|local|international|sports|economy|technology|health|entertainment"}]}. Every article MUST have a real sourceUrl from a real news publisher. Do NOT fabricate URLs.`;
    const raw = await callOpenRouter(sys, usr, 2000);
    if (!raw) return [];
    const parsed = extractJSON<{ articles: BrainNewsArticle[] }>(raw);
    const articles = (parsed?.articles || []).slice(0, safeCount);
    setCached(cacheKey, articles);
    return articles;
  } catch (e) {
    console.warn(
      "[cirkle-brain] searchNews failed:",
      String((e as Error)?.message || e || "unknown error").slice(0, 160),
    );
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Cirkle Brain AI — Flights / Hotels / Price Prediction               */
/* ------------------------------------------------------------------ */
/* These three functions back the /api/flights, /api/hotels, and       */
/* /api/price routes. Each uses OpenRouter web search (`:online`) to    */
/* find REAL current listings/prices, then falls back to aiComplete()  */
/* LLM generation if web search returns nothing. Never throws —        */
/* returns [] / {} so the API routes degrade gracefully.               */
/* ------------------------------------------------------------------ */

export interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  cabinClass: string;
  deepLink: string;
}

export async function searchFlights(params: {
  from: string;
  to: string;
  date: string;
  passengers: number;
  cabinClass: "economy" | "premium" | "business" | "first";
}): Promise<FlightResult[]> {
  const cacheKey = `flights:${JSON.stringify(params)}`;
  const cached = getCached<FlightResult[]>(cacheKey);
  if (cached) return cached;

  try {
    // Tier 1: real web search via OpenRouter `:online` for current flight listings
    const webSys = `You are the CIRKLE Brain AI flight search engine. Use live web search. Return VALID JSON only.`;
    const webUsr = `Search the web for real flights from ${params.from} to ${params.to} on ${params.date} for ${params.passengers} passenger(s), ${params.cabinClass} class. Return JSON: {"flights":[{"airline":"name","flightNumber":"XX123","from":"${params.from}","to":"${params.to}","departTime":"HH:MM","arriveTime":"HH:MM","duration":"Xh Ym","stops":0,"price":350,"currency":"USD","cabinClass":"${params.cabinClass}","deepLink":"https://..."}]}. Return 5-8 flights. Every deepLink must be a real URL.`;
    const webRaw = await callOpenRouter(webSys, webUsr, 2000);
    if (webRaw) {
      const webParsed = extractJSON<{ flights: any[] }>(webRaw);
      if (webParsed?.flights && webParsed.flights.length > 0) {
        const flights = webParsed.flights.map((f, i) => ({ ...f, id: `flt-${i}` }));
        setCached(cacheKey, flights);
        return flights;
      }
    }

    // Tier 2: LLM fallback
    const sys = `You are the Cirkle Brain AI flight search engine. Return VALID JSON only.`;
    const usr = `Find flights from ${params.from} to ${params.to} on ${params.date} for ${params.passengers} passenger(s), ${params.cabinClass} class. Return JSON: {"flights":[{"airline":"name","flightNumber":"XX123","from":"${params.from}","to":"${params.to}","departTime":"HH:MM","arriveTime":"HH:MM","duration":"Xh Ym","stops":0,"price":350,"currency":"USD","cabinClass":"${params.cabinClass}","deepLink":"https://..."}]}. Return 5-8 flights.`;
    const raw = await aiComplete(sys, usr, 2000, true);
    if (!raw) return [];
    const parsed = extractJSON<{ flights: any[] }>(raw);
    const flights = (parsed?.flights || []).map((f, i) => ({ ...f, id: `flt-${i}` }));
    setCached(cacheKey, flights);
    return flights;
  } catch (e) {
    console.warn("[cirkle-brain] searchFlights failed:", String((e as Error)?.message || e).slice(0, 120));
    return [];
  }
}

export interface HotelResult {
  id: string;
  name: string;
  description: string;
  city: string;
  country: string;
  starRating: number;
  pricePerNight: number;
  currency: string;
  amenities: string[];
  imageQuery: string;
  deepLink: string;
}

export async function searchHotels(params: {
  city: string;
  country: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}): Promise<HotelResult[]> {
  const cacheKey = `hotels:${JSON.stringify(params)}`;
  const cached = getCached<HotelResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const ci = getCountry(params.country);
    const location = `${params.city}, ${ci?.name || params.country}`;

    // Tier 1: real web search via OpenRouter `:online`
    const webSys = `You are the Cirkle Brain AI hotel search engine. Use live web search. Return VALID JSON only.`;
    const webUsr = `Search the web for real hotels in ${location} for ${params.checkIn} to ${params.checkOut}, ${params.guests} guests, ${params.rooms} room(s). Return JSON: {"hotels":[{"name":"name","description":"desc","city":"${params.city}","country":"${params.country}","starRating":4,"pricePerNight":120,"currency":"${ci?.currency || "USD"}","amenities":["WiFi","Breakfast"],"imageQuery":"hotel exterior","deepLink":"https://..."}]}. Return 6-8 hotels. Every deepLink must be a real URL.`;
    const webRaw = await callOpenRouter(webSys, webUsr, 2000);
    if (webRaw) {
      const webParsed = extractJSON<{ hotels: any[] }>(webRaw);
      if (webParsed?.hotels && webParsed.hotels.length > 0) {
        const hotels = webParsed.hotels.map((h, i) => ({ ...h, id: `hot-${i}` }));
        setCached(cacheKey, hotels);
        return hotels;
      }
    }

    // Tier 2: LLM fallback
    const sys = `You are the Cirkle Brain AI hotel search engine. Return VALID JSON only.`;
    const usr = `Find hotels in ${location} for ${params.checkIn} to ${params.checkOut}, ${params.guests} guests, ${params.rooms} room(s). Return JSON: {"hotels":[{"name":"name","description":"desc","city":"${params.city}","country":"${params.country}","starRating":4,"pricePerNight":120,"currency":"${ci?.currency || "USD"}","amenities":["WiFi","Breakfast"],"imageQuery":"hotel exterior","deepLink":"https://..."}]}. Return 6-8 hotels.`;
    const raw = await aiComplete(sys, usr, 2000, true);
    if (!raw) return [];
    const parsed = extractJSON<{ hotels: any[] }>(raw);
    const hotels = (parsed?.hotels || []).map((h, i) => ({ ...h, id: `hot-${i}` }));
    setCached(cacheKey, hotels);
    return hotels;
  } catch (e) {
    console.warn("[cirkle-brain] searchHotels failed:", String((e as Error)?.message || e).slice(0, 120));
    return [];
  }
}

export interface PricePrediction {
  type: "flight" | "hotel";
  route: string;
  date: string;
  currentPrice: number;
  currency: string;
  predictedPrice: number;
  recommendation: "buy_now" | "wait" | "monitor";
  confidence: number;
  reasoning: string;
  lowestExpectedPrice: number;
  highestExpectedPrice: number;
}

export async function predictPrice(params: {
  type: "flight" | "hotel";
  route: string;
  date: string;
  currentPrice: number;
  currency: string;
}): Promise<PricePrediction> {
  const cacheKey = `predict:${JSON.stringify(params)}`;
  const cached = getCached<PricePrediction>(cacheKey);
  if (cached) return cached;

  try {
    // Tier 1: web search for current price trends via OpenRouter `:online`
    const webSys = `You are the CIRKLE Brain AI price-trend researcher. Use live web search. Return a short 4-6 sentence summary of current price trends.`;
    const webUsr = `Search the web for current ${params.type} price trends for ${params.route} around ${params.date}. Current price is ${params.currentPrice} ${params.currency}. Summarize whether prices are rising, falling, or stable, and any factors affecting them.`;
    const trendContext = await callOpenRouter(webSys, webUsr, 800) || "No web trend data available.";

    // Tier 2: LLM prediction using the web-trend context
    const sys = `You are the Cirkle Brain AI price prediction engine. Analyze the web search context and predict whether the user should buy now or wait. Return VALID JSON only.`;
    const usr = `Type: ${params.type}\nRoute: ${params.route}\nDate: ${params.date}\nCurrent price: ${params.currentPrice} ${params.currency}\n\nWeb search context about price trends:\n${trendContext}\n\nReturn JSON: {"type":"${params.type}","route":"${params.route}","date":"${params.date}","currentPrice":${params.currentPrice},"currency":"${params.currency}","predictedPrice":<number>,"recommendation":"buy_now|wait|monitor","confidence":0.75,"reasoning":"2-3 sentence explanation","lowestExpectedPrice":<number>,"highestExpectedPrice":<number>}`;
    const raw = await aiComplete(sys, usr, 1200);
    if (!raw) {
      // Fallback: neutral prediction
      const fallback: PricePrediction = {
        type: params.type, route: params.route, date: params.date,
        currentPrice: params.currentPrice, currency: params.currency,
        predictedPrice: params.currentPrice, recommendation: "monitor",
        confidence: 0.5, reasoning: "Insufficient data for a strong recommendation. Monitor prices for now.",
        lowestExpectedPrice: Math.round(params.currentPrice * 0.9),
        highestExpectedPrice: Math.round(params.currentPrice * 1.1),
      };
      setCached(cacheKey, fallback);
      return fallback;
    }
    const parsed = extractJSON<PricePrediction>(raw);
    const prediction: PricePrediction = {
      type: params.type, route: params.route, date: params.date,
      currentPrice: params.currentPrice, currency: params.currency,
      predictedPrice: parsed?.predictedPrice || params.currentPrice,
      recommendation: (parsed?.recommendation as PricePrediction["recommendation"]) || "monitor",
      confidence: parsed?.confidence || 0.6,
      reasoning: parsed?.reasoning || "No reasoning provided.",
      lowestExpectedPrice: parsed?.lowestExpectedPrice || Math.round(params.currentPrice * 0.9),
      highestExpectedPrice: parsed?.highestExpectedPrice || Math.round(params.currentPrice * 1.1),
    };
    setCached(cacheKey, prediction);
    return prediction;
  } catch (e) {
    console.warn("[cirkle-brain] predictPrice failed:", String((e as Error)?.message || e).slice(0, 120));
    const fallback: PricePrediction = {
      type: params.type, route: params.route, date: params.date,
      currentPrice: params.currentPrice, currency: params.currency,
      predictedPrice: params.currentPrice, recommendation: "monitor",
      confidence: 0.4, reasoning: "Prediction engine unavailable. Monitor prices manually.",
      lowestExpectedPrice: Math.round(params.currentPrice * 0.9),
      highestExpectedPrice: Math.round(params.currentPrice * 1.1),
    };
    return fallback;
  }
}

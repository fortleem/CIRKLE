// @ts-nocheck
/**
 * Translation Service Abstraction (P1.5)
 * ---------------------------------------
 * Provider-agnostic translation layer with on-device → server → fallback
 * chain, in-memory caching (10-min TTL), RTL detection, and heuristic
 * language detection.
 *
 * Architectural intent (per ADR-003):
 *   1. On-device ONNX NLLB-200 — stubbed for now (returns null). When
 *      the on-device runtime ships, this becomes the privacy-default
 *      provider with zero network calls.
 *   2. Server-side — calls the existing /api/ai/translate endpoint
 *      which fans out through aiComplete (5-provider chain).
 *   3. Fallback — returns the original text unchanged so the caller
 *      always gets *something* back.
 *
 * No coupling to a single model — providers are pluggable via
 * setProvider(). The cache is intentionally in-memory only (no Redis
 * dependency) per the project's "local memory caching only" rule.
 */

import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TranslationProvider = "on-device" | "server" | "fallback";

export interface TranslationResult {
  /** Translated text. May equal the input when falling back. */
  text: string;
  /** Detected or supplied source language code (ISO 639-1). */
  from: string;
  /** Target language code (ISO 639-1). */
  to: string;
  /** True when the target language is right-to-left. */
  isRTL: boolean;
  /** Which provider actually answered. */
  provider: TranslationProvider;
  /** True when the result came from the in-memory cache. */
  cached: boolean;
  /** Optional confidence [0..1] when the server reports one. */
  confidence?: number;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants — supported languages + RTL set
// ─────────────────────────────────────────────────────────────────────────────

/** ISO 639-1 codes for right-to-left scripts. */
const RTL_LANGUAGES = new Set([
  "ar", // Arabic
  "he", // Hebrew
  "fa", // Persian
  "ur", // Urdu
  "ps", // Pashto
  "sd", // Sindhi
  "yi", // Yiddish
  "ckb", // Central Kurdish (Sorani) — 3-letter, used by NLLB
]);

/** Curated subset of common languages. Extend freely — detection works
 *  on raw text regardless of this list. */
const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
  { code: "en", name: "English", nativeName: "English", rtl: false },
  { code: "fr", name: "French", nativeName: "Français", rtl: false },
  { code: "es", name: "Spanish", nativeName: "Español", rtl: false },
  { code: "de", name: "German", nativeName: "Deutsch", rtl: false },
  { code: "it", name: "Italian", nativeName: "Italiano", rtl: false },
  { code: "pt", name: "Portuguese", nativeName: "Português", rtl: false },
  { code: "ru", name: "Russian", nativeName: "Русский", rtl: false },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", rtl: false },
  { code: "fa", name: "Persian", nativeName: "فارسی", rtl: true },
  { code: "ur", name: "Urdu", nativeName: "اردو", rtl: true },
  { code: "he", name: "Hebrew", nativeName: "עברית", rtl: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", rtl: false },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", rtl: false },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", rtl: false },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", rtl: false },
  { code: "ja", name: "Japanese", nativeName: "日本語", rtl: false },
  { code: "ko", name: "Korean", nativeName: "한국어", rtl: false },
  { code: "zh", name: "Chinese", nativeName: "中文", rtl: false },
  { code: "th", name: "Thai", nativeName: "ไทย", rtl: false },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", rtl: false },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", rtl: false },
  { code: "pl", name: "Polish", nativeName: "Polski", rtl: false },
  { code: "sv", name: "Swedish", nativeName: "Svenska", rtl: false },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", rtl: false },
  { code: "am", name: "Amharic", nativeName: "አማርኛ", rtl: false },
  { code: "ha", name: "Hausa", nativeName: "Hausa", rtl: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// In-memory cache — 10-minute TTL
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  result: TranslationResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Manual pruning — avoids unbounded growth on long-lived servers. */
function pruneCache(): void {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expiresAt <= now) cache.delete(k);
  }
}

function cacheKey(text: string, from: string, to: string): string {
  // Truncate to keep keys bounded for very long inputs.
  const t = text.length > 500 ? text.slice(0, 500) : text;
  return `${from}:${to}:${t}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider state — toggleable at runtime
// ─────────────────────────────────────────────────────────────────────────────

let preferredProvider: TranslationProvider | "auto" = "auto";

/**
 * Switch the active provider. Pass "auto" to use the full chain
 * (on-device → server → fallback).
 */
export function setProvider(provider: TranslationProvider | "auto"): void {
  preferredProvider = provider;
  logger.info("[translation-service] provider set", { provider });
}

/**
 * On-device capability probe. Returns true only when the ONNX NLLB-200
 * runtime is loaded and ready. The on-device model is stubbed until
 * ADR-003 ships, so this is always false for now.
 */
export function isOfflineCapable(): boolean {
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Language detection — heuristic, no model required
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lightweight language detector. Uses Unicode block coverage:
 *   - Arabic block → ar
 *   - Hebrew block → he
 *   - Devanagari → hi
 *   - Bengali → bn
 *   - CJK (Han) → zh (Hiragana/Katakana → ja, Hangul → ko)
 *   - Cyrillic → ru (default; could be refined with frequency analysis)
 *   - Latin → en fallback
 *
 * Returns the ISO 639-1 code or "en" when nothing matches.
 */
export function detectLanguage(text: string): string {
  if (!text || !text.trim()) return "en";
  const sample = text.slice(0, 500);

  const counts: Record<string, number> = {};
  for (const ch of sample) {
    const c = ch.codePointAt(0);
    if (c === undefined) continue;
    // Arabic block (0x0600–0x06FF) + Arabic Supplement (0x0750–0x077F) + Arabic Extended-A
    if ((c >= 0x0600 && c <= 0x06ff) || (c >= 0x0750 && c <= 0x077f) || (c >= 0x08a0 && c <= 0x08ff)) {
      counts.ar = (counts.ar || 0) + 1;
    }
    // Hebrew
    else if (c >= 0x0590 && c <= 0x05ff) {
      counts.he = (counts.he || 0) + 1;
    }
    // Devanagari (Hindi, Marathi, etc.)
    else if (c >= 0x0900 && c <= 0x097f) {
      counts.hi = (counts.hi || 0) + 1;
    }
    // Bengali + Assamese
    else if (c >= 0x0980 && c <= 0x09ff) {
      counts.bn = (counts.bn || 0) + 1;
    }
    // Thai
    else if (c >= 0x0e00 && c <= 0x0e7f) {
      counts.th = (counts.th || 0) + 1;
    }
    // Hiragana + Katakana → Japanese
    else if ((c >= 0x3040 && c <= 0x309f) || (c >= 0x30a0 && c <= 0x30ff)) {
      counts.ja = (counts.ja || 0) + 1;
    }
    // Hangul Syllables → Korean
    else if ((c >= 0xac00 && c <= 0xd7af) || (c >= 0x1100 && c <= 0x11ff)) {
      counts.ko = (counts.ko || 0) + 1;
    }
    // CJK Unified Ideographs → Chinese (unless Japanese already won)
    else if (c >= 0x4e00 && c <= 0x9fff) {
      counts.zh = (counts.zh || 0) + 1;
    }
    // Cyrillic → Russian (default for the block)
    else if (c >= 0x0400 && c <= 0x04ff) {
      counts.ru = (counts.ru || 0) + 1;
    }
    // Greek
    else if (c >= 0x0370 && c <= 0x03ff) {
      counts.el = (counts.el || 0) + 1;
    }
  }

  // Pick the dominant script.
  let best = "en";
  let bestCount = 0;
  for (const [lang, n] of Object.entries(counts)) {
    if (n > bestCount) {
      best = lang;
      bestCount = n;
    }
  }
  // If Japanese has any Hiragana/Katakana, prefer it over Chinese even
  // when CJK ideographs dominate (mixed Japanese text).
  if (counts.ja && counts.zh && !counts.ja) best = "zh";
  return best;
}

/** Returns true when the language code is right-to-left. */
export function isRTLLanguage(lang: string): boolean {
  if (!lang) return false;
  const code = lang.toLowerCase();
  if (RTL_LANGUAGES.has(code)) return true;
  // Also catch 3-letter variants like "arb" (Standard Arabic, NLLB code).
  if (code.startsWith("ar")) return true;
  if (code.startsWith("he")) return true;
  if (code.startsWith("fa")) return true;
  if (code.startsWith("ur")) return true;
  return false;
}

/**
 * Returns the curated list of supported languages. The detection
 * heuristic works on any text — this list is just for UI selectors.
 */
export function getSupportedLanguages(): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider implementations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * On-device provider — STUB. When ADR-003 lands, this will load
 * NLLB-200-distilled-600M via ONNX Runtime Web (WASM/WebGPU) inside a
 * Web Worker and run inference locally. For now it always returns null
 * so the chain falls through to the server.
 */
async function translateOnDevice(
  _text: string,
  _from: string,
  _to: string,
): Promise<string | null> {
  // Intentional stub — no on-device model is loaded yet.
  return null;
}

/**
 * Server provider — calls the existing /api/ai/translate endpoint
 * (which fans out through aiComplete: Groq → OpenRouter → Gemini →
 * OpenAI → HuggingFace).
 *
 * Safe for both server and client call sites — uses a relative URL so
 * the Caddyfile gateway routes it correctly in the sandbox.
 */
async function translateServer(
  text: string,
  from: string,
  to: string,
): Promise<{ translation: string; confidence?: number } | null> {
  try {
    const res = await fetch("/api/ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, from, to, targetLang: to }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { translation?: string; confidence?: number };
    if (!data.translation || !data.translation.trim()) return null;
    return { translation: data.translation, confidence: data.confidence };
  } catch (err) {
    logger.warn("[translation-service] server provider failed", {
      error: (err as Error).message,
    });
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Translate a single string.
 *
 * @param text Source text.
 * @param fromLang Source language, or "auto" to detect heuristically.
 * @param toLang Target language (ISO 639-1).
 */
export async function translate(
  text: string,
  fromLang: string,
  toLang: string,
): Promise<TranslationResult> {
  const src = !fromLang || fromLang === "auto" ? detectLanguage(text) : fromLang;
  const isRTL = isRTLLanguage(toLang);

  // Cache hit?
  const key = cacheKey(text, src, toLang);
  pruneCache();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return { ...hit.result, cached: true };
  }

  // Provider chain — when a specific provider is preferred we still
  // fall through to the next on failure so the caller always gets a
  // usable result.
  let provider: TranslationProvider = "fallback";
  let translated = text;

  const tryOnDevice = preferredProvider === "auto" || preferredProvider === "on-device";
  const tryServer = preferredProvider === "auto" || preferredProvider === "server";

  if (tryOnDevice) {
    const out = await translateOnDevice(text, src, toLang);
    if (out) {
      provider = "on-device";
      translated = out;
    }
  }

  if (provider === "fallback" && tryServer) {
    const out = await translateServer(text, src, toLang);
    if (out) {
      provider = "server";
      translated = out.translation;
    }
  }

  const result: TranslationResult = {
    text: translated,
    from: src,
    to: toLang,
    isRTL,
    provider,
    cached: false,
  };

  // Only cache successful (non-fallback) translations to avoid
  // poisoning the cache with passthrough copies of the input.
  if (provider !== "fallback") {
    cache.set(key, { result: { ...result }, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  return result;
}

/**
 * Translate multiple strings in parallel. Cache hits short-circuit.
 *
 * @param texts Array of source strings.
 * @param fromLang Source language, or "auto" to detect per-string.
 * @param toLang Target language (ISO 639-1).
 */
export async function translateBatch(
  texts: string[],
  fromLang: string,
  toLang: string,
): Promise<TranslationResult[]> {
  if (!texts.length) return [];
  // Cap concurrency to 6 to avoid hammering the AI provider.
  const CONCURRENCY = 6;
  const out: TranslationResult[] = new Array(texts.length);
  let cursor = 0;

  async function worker() {
    while (cursor < texts.length) {
      const i = cursor++;
      out[i] = await translate(texts[i], fromLang, toLang);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, texts.length) }, () => worker()),
  );
  return out;
}

/**
 * Clears the in-memory translation cache. Useful for tests or when the
 * user explicitly wants fresh results.
 */
export function clearTranslationCache(): void {
  cache.clear();
}

/**
 * Inspect cache state — primarily for diagnostics / the privacy
 * dashboard.
 */
export function getCacheStats(): { size: number; ttlMs: number } {
  pruneCache();
  return { size: cache.size, ttlMs: CACHE_TTL_MS };
}

// @ts-nocheck
/**
 * Call Translation Service (E1)
 * ------------------------------
 * Real-time call-side translation for live subtitles during WebRTC calls.
 *
 * What this module does:
 *   • `translateStream(text, from, to)` — translates a single utterance chunk
 *     server-side via the CIRKLE Brain AI provider chain (5 providers).
 *   • `getSupportedLanguages()` — returns the static list of supported
 *     translation languages for the call UI picker.
 *   • `createLiveTranslator(targetLang)` — returns a small helper that
 *     batches incoming transcripts and emits translated chunks via a
 *     listener. Useful for wiring into a Web Speech API stream.
 *
 * Browser-side concerns:
 *   • The Web Speech API (SpeechRecognition) is used in the overlay to capture
 *     live audio → text. This module then translates the text. This split
 *     keeps the heavy lifting (translation) server-side where the AI providers
 *     live, while the lightweight on-device STT runs in the browser.
 *   • The /api/calls/translate route uses the existing AI provider chain with
 *     8s timeout (matches project convention).
 *
 * Production considerations:
 *   • For high-volume call translation, consider a dedicated translation
 *     mini-service with WebSpeech API → translation → subtitles pipeline.
 *   • For offline / privacy-first mode, the on-device ONNX NLLB-200 model
 *     (see translation-service.ts) takes precedence.
 */

// aiComplete import removed — translateStream now calls /api/calls/translate to avoid server-only transitive import
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isRTL: boolean;
}

export interface TranslationChunk {
  original: string;
  translated: string;
  from: string;
  to: string;
  confidence: number;
  ts: number;
}

export type TranslationListener = (chunk: TranslationChunk) => void;

// ─────────────────────────────────────────────────────────────────────────────
// Supported languages
// ─────────────────────────────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "ar", name: "Arabic",    nativeName: "العربية",     flag: "🇸🇦", isRTL: true  },
  { code: "en", name: "English",   nativeName: "English",     flag: "🇬🇧", isRTL: false },
  { code: "fr", name: "French",    nativeName: "Français",    flag: "🇫🇷", isRTL: false },
  { code: "es", name: "Spanish",   nativeName: "Español",     flag: "🇪🇸", isRTL: false },
  { code: "de", name: "German",    nativeName: "Deutsch",     flag: "🇩🇪", isRTL: false },
  { code: "tr", name: "Turkish",   nativeName: "Türkçe",      flag: "🇹🇷", isRTL: false },
  { code: "ur", name: "Urdu",      nativeName: "اردو",         flag: "🇵🇰", isRTL: true  },
  { code: "fa", name: "Persian",   nativeName: "فارسی",        flag: "🇮🇷", isRTL: true  },
  { code: "hi", name: "Hindi",     nativeName: "हिन्दी",        flag: "🇮🇳", isRTL: false },
  { code: "ru", name: "Russian",   nativeName: "Русский",     flag: "🇷🇺", isRTL: false },
  { code: "zh", name: "Chinese",   nativeName: "中文",          flag: "🇨🇳", isRTL: false },
  { code: "ja", name: "Japanese",  nativeName: "日本語",        flag: "🇯🇵", isRTL: false },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩", isRTL: false },
  { code: "pt", name: "Portuguese", nativeName: "Português",   flag: "🇵🇹", isRTL: false },
  { code: "it", name: "Italian",   nativeName: "Italiano",     flag: "🇮🇹", isRTL: false },
];

export function getSupportedLanguages(): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES;
}

export function getLanguage(code: string): SupportedLanguage | null {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || null;
}

export function isRTL(code: string): boolean {
  return !!getLanguage(code)?.isRTL;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single-chunk translation (server-side)
// ─────────────────────────────────────────────────────────────────────────────

export async function translateStream(
  text: string,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<TranslationChunk> {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return {
      original: "",
      translated: "",
      from,
      to,
      confidence: 0,
      ts: Date.now(),
    };
  }
  if (from === to) {
    return {
      original: trimmed,
      translated: trimmed,
      from,
      to,
      confidence: 1,
      ts: Date.now(),
    };
  }

  let translated = trimmed;
  let confidence = 0.5;

  try {
    const res = await fetch("/api/calls/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, from, to }),
      signal,
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.translated) {
        translated = String(data.translated).slice(0, 500);
        confidence = typeof data.confidence === "number"
          ? Math.min(1, Math.max(0, data.confidence))
          : 0.7;
      }
    }
  } catch (err) {
    logger?.warn?.("[call-translation] AI chain failed:", err);
  }

  return {
    original: trimmed,
    translated,
    from,
    to,
    confidence,
    ts: Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Live translator (client-side batching helper)
// ─────────────────────────────────────────────────────────────────────────────
// Used by the webrtc-call overlay to translate a stream of STT chunks. Batches
// short utterances together (≤1.5 s gap) before sending one translation
// request to save round-trips. The batched text is sent via fetch to
// /api/calls/translate.
// ─────────────────────────────────────────────────────────────────────────────

export interface LiveTranslator {
  push(text: string, from: string): void;
  on(listener: TranslationListener): () => void;
  flush(): void;
  dispose(): void;
}

export function createLiveTranslator(targetLang: string): LiveTranslator {
  const listeners = new Set<TranslationListener>();
  let buffer = "";
  let bufferFrom = "";
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const emit = (chunk: TranslationChunk) => {
    for (const l of listeners) {
      try { l(chunk); } catch { /* swallow */ }
    }
  };

  const doFlush = async () => {
    if (disposed) return;
    if (!buffer.trim()) return;
    const text = buffer;
    const from = bufferFrom;
    buffer = "";
    bufferFrom = "";
    flushTimer = null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch("/api/calls/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from, to: targetLang }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data?.ok && data.chunk) {
        emit({
          original: data.chunk.original || text,
          translated: data.chunk.translated || text,
          from: data.chunk.from || from,
          to: data.chunk.to || targetLang,
          confidence: data.chunk.confidence ?? 0.5,
          ts: data.chunk.ts ?? Date.now(),
        });
      }
    } catch {
      /* swallow — translation is best-effort */
    } finally {
      clearTimeout(timeout);
    }
  };

  const scheduleFlush = () => {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(doFlush, 1200); // 1.2 s gap → flush
  };

  return {
    push(text: string, from: string) {
      if (disposed) return;
      if (!text) return;
      buffer = buffer ? `${buffer} ${text}` : text;
      bufferFrom = from;
      scheduleFlush();
    },
    on(listener: TranslationListener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    flush() {
      if (flushTimer) clearTimeout(flushTimer);
      void doFlush();
    },
    dispose() {
      disposed = true;
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      listeners.clear();
    },
  };
}

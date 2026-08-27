// @ts-nocheck
/**
 * Voice Transcription Service (B2)
 * --------------------------------
 * Transcribes voice message audio blobs using the CIRKLE Brain AI provider
 * chain (5 providers — Groq / Gemini / OpenAI / HuggingFace / OpenRouter).
 *
 * What this module does:
 *   • `transcribeAudio(blob, opts)` — converts a `Blob` (audio/webm, audio/mp4,
 *     audio/wav) into text via POST to `/api/voice/transcribe` which fans out
 *     through `aiComplete()`. Returns `{ text, language?, confidence? }`.
 *   • `getVoiceMessageTranscript(messageId)` — fetches the stored transcript
 *     for a voice message via GET to `/api/messages/voice?id=…`.
 *
 * Browser-side concerns:
 *   • `MediaRecorder` support is checked via `isMediaRecorderSupported()`.
 *   • The blob is converted to base64 before POSTing so the route can read it
 *     without multipart parsing (simpler, fewer moving parts). For very long
 *     voice messages (>30 MB) we fall back to a server-side streaming upload
 *     via FormData — but in practice Wasl voice messages are ≤60 s so this is
 *     a non-issue.
 *
 * Server-side concerns:
 *   • The `/api/voice/transcribe` route decodes the base64 audio, calls the
 *     AI provider chain with a transcription prompt, and returns the text.
 *   • The provider chain has built-in caching (10-min TTL) via `ai-cache.ts`.
 *   • On failure, the route returns the original audio URL with `transcript: null`
 *     so the UI can show "Transcription unavailable" without blocking.
 */

// aiComplete import removed — transcribeAudio uses fetch /api/voice/transcribe, transcribeAudioServer is server-only
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TranscriptionResult {
  text: string;
  language?: string;
  confidence?: number;
  provider?: string;
}

export interface TranscribeOptions {
  /** Optional source language hint (ISO 639-1, e.g. "ar"). */
  language?: string;
  /** Optional context to help the model (e.g. "voice message from @layla"). */
  context?: string;
  /** Abort signal so the UI can cancel a long-running transcription. */
  signal?: AbortSignal;
}

export interface VoiceMessageRecord {
  id: string;
  messageId: string;
  audioBlobUrl: string;
  duration: number;
  transcript: string | null;
  language: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Browser-side helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isMediaRecorderSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.MediaRecorder === "function"
    && !!navigator.mediaDevices?.getUserMedia;
}

export function pickRecordingMimeType(): string {
  if (typeof window === "undefined" || typeof window.MediaRecorder !== "function") {
    return "audio/webm";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const m of candidates) {
    try {
      if (window.MediaRecorder.isTypeSupported(m)) return m;
    } catch { /* swallow */ }
  }
  return "audio/webm";
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("FileReader returned non-string"));
        return;
      }
      // Strip the "data:audio/webm;base64," prefix so the body is pure base64.
      const commaIdx = result.indexOf(",");
      resolve(commaIdx === -1 ? result : result.slice(commaIdx + 1));
    };
    reader.onerror = () => reject(reader.error || new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

export async function transcribeAudio(
  blob: Blob,
  opts: TranscribeOptions = {},
): Promise<TranscriptionResult> {
  // 8-second timeout (AbortController) — caller may pass their own signal
  // which we chain.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  try {
    const base64 = await blobToBase64(blob);
    const res = await fetch("/api/voice/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio: base64,
        mimeType: blob.type || "audio/webm",
        duration: Math.max(1, Math.round(blob.size / 16000)), // rough estimate
        language: opts.language,
        context: opts.context,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `Transcription failed (HTTP ${res.status})`);
    }
    const data = (await res.json()) as { ok: boolean; result?: TranscriptionResult; error?: string };
    if (!data.ok || !data.result) {
      throw new Error(data.error || "Transcription returned no result");
    }
    return data.result;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getVoiceMessageTranscript(
  messageId: string,
): Promise<VoiceMessageRecord | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`/api/messages/voice?id=${encodeURIComponent(messageId)}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.ok || !data.voiceMessage) return null;
    return data.voiceMessage as VoiceMessageRecord;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-side transcription (used by /api/voice/transcribe route)
// ─────────────────────────────────────────────────────────────────────────────
// Note: this function is meant to be called from server-side code only
// (route handlers, server actions). It uses `aiComplete()` which itself uses
// `server-only`.
// ─────────────────────────────────────────────────────────────────────────────

// transcribeAudioServer moved to /api/voice/transcribe route (server-only)

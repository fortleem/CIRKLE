// @ts-nocheck
/**
 * Voice Cloning Service (E9)
 * ---------------------------
 * Voice cloning for text-to-speech — lets users record a 30-second voice
 * sample, train a cloned voice, and use it to generate outgoing voice messages.
 *
 * What this module does:
 *   • `cloneVoice(sampleBlob, opts)` — accepts a 30-second audio sample (Blob),
 *     base64-encodes it, POSTs to `/api/voice/clone` which records a VoiceClone
 *     row in the DB and (in production) sends the sample to a real voice
 *     cloning provider. Returns `{ voiceId, status }`.
 *   • `speakWithClonedVoice(voiceId, text)` — POSTs text + voiceId to
 *     `/api/voice/speak` which synthesizes audio. Returns a Blob URL.
 *   • `getVoiceCloneStatus(userId)` — fetches the current user's voice clone
 *     training status.
 *
 * ⚠️  PRODUCTION REQUIREMENT:
 *   This implementation is a MOCK. Real voice cloning requires a provider
 *   such as:
 *     • ElevenLabs (https://elevenlabs.io) — best quality, $0.30/1k chars
 *     • Coqui TTS (https://github.com/coqui-ai/TTS) — open-source, self-hosted
 *     • PlayHT (https://play.ht) — fast cloning
 *     • Resemble.AI (https://www.resemble.ai) — enterprise
 *   The /api/voice/clone route's header documents where to plug in a real
 *   provider. The mock returns a deterministic voiceId so the rest of the
 *   system can function in demo mode.
 *
 * Permission-denial handling: `getUserMedia` failures are wrapped in a typed
 * `VoiceCloneError` with `.code` so the UI can render the right message.
 */

import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type VoiceCloneStatus = "training" | "ready" | "failed";

export interface VoiceCloneError extends Error {
  code: "permission-denied" | "no-device" | "not-supported" | "server" | "unknown";
}

export interface CloneVoiceResult {
  voiceId: string;
  status: VoiceCloneStatus;
  sampleUrl: string;
}

export interface SpeakResult {
  audioUrl: string;
  duration: number;
  provider: string;
}

export interface VoiceCloneRecord {
  id: string;
  userId: string;
  voiceId: string;
  sampleUrl: string;
  status: VoiceCloneStatus;
  createdAt: string;
}

export interface CloneVoiceOptions {
  userId: string;
  /** Recommended ≥30 s, ≤60 s. */
  durationSec?: number;
  /** Optional name for the cloned voice. */
  name?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

function makeError(code: VoiceCloneError["code"], message: string): VoiceCloneError {
  const err = new Error(message) as VoiceCloneError;
  err.code = code;
  err.name = "VoiceCloneError";
  return err;
}

export function classifyMediaError(err: unknown): VoiceCloneError {
  const name = (err as DOMException)?.name || (err as Error)?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return makeError("permission-denied",
      "Microphone permission denied. Please grant access and try again.");
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return makeError("no-device", "No microphone device found.");
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return makeError("no-device", "Microphone is in use by another app.");
  }
  if (name === "NotSupportedError" || name === "TypeError") {
    return makeError("not-supported", "MediaRecorder is not supported in this browser.");
  }
  return makeError("unknown", String((err as Error)?.message || err || "unknown error"));
}

// ─────────────────────────────────────────────────────────────────────────────
// Browser-side helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isVoiceCloneSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.MediaRecorder === "function"
    && !!navigator.mediaDevices?.getUserMedia;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("FileReader returned non-string"));
        return;
      }
      const commaIdx = result.indexOf(",");
      resolve(commaIdx === -1 ? result : result.slice(commaIdx + 1));
    };
    reader.onerror = () => reject(reader.error || new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

// Deterministic voiceId from userId (so mock returns the same ID for the
// same user across reloads). Real providers return a unique server-assigned ID.
function mockVoiceId(userId: string): string {
  let h = 5381;
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) + h + userId.charCodeAt(i)) | 0;
  }
  return `vc_${(h >>> 0).toString(36)}_${userId.slice(0, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API (client-side)
// ─────────────────────────────────────────────────────────────────────────────

export async function cloneVoice(
  sampleBlob: Blob,
  opts: CloneVoiceOptions,
): Promise<CloneVoiceResult> {
  if (!opts.userId) throw makeError("unknown", "userId is required.");
  if (sampleBlob.size < 1024) {
    throw makeError("unknown", "Voice sample too short — please record at least 10 seconds.");
  }

  const base64 = await blobToBase64(sampleBlob);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("/api/voice/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: opts.userId,
        audio: base64,
        mimeType: sampleBlob.type || "audio/webm",
        duration: opts.durationSec || 30,
        name: opts.name,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw makeError("server", err?.error || `Clone failed (HTTP ${res.status})`);
    }
    const data = await res.json().catch(() => null);
    if (!data?.ok) throw makeError("server", data?.error || "Clone failed.");
    return {
      voiceId: String(data.voiceId),
      status: data.status as VoiceCloneStatus,
      sampleUrl: String(data.sampleUrl || ""),
    };
  } catch (err) {
    if ((err as VoiceCloneError)?.code) throw err;
    throw makeError("server", (err as Error)?.message || "Clone request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function speakWithClonedVoice(
  voiceId: string,
  text: string,
): Promise<SpeakResult> {
  if (!voiceId) throw makeError("unknown", "voiceId is required.");
  if (!text?.trim()) throw makeError("unknown", "text is required.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voiceId,
        text: String(text).slice(0, 1000),
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw makeError("server", err?.error || `Speak failed (HTTP ${res.status})`);
    }
    const data = await res.json().catch(() => null);
    if (!data?.ok) throw makeError("server", data?.error || "Speak failed.");
    return {
      audioUrl: String(data.audioUrl),
      duration: Number(data.duration || 0),
      provider: String(data.provider || "mock"),
    };
  } catch (err) {
    if ((err as VoiceCloneError)?.code) throw err;
    throw makeError("server", (err as Error)?.message || "Speak request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function getVoiceCloneStatus(userId: string): Promise<VoiceCloneRecord | null> {
  if (!userId) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`/api/voice/clone?userId=${encodeURIComponent(userId)}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.ok || !data.voiceClone) return null;
    return {
      id: String(data.voiceClone.id),
      userId: String(data.voiceClone.userId),
      voiceId: String(data.voiceClone.voiceId),
      sampleUrl: String(data.voiceClone.sampleUrl || ""),
      status: data.voiceClone.status as VoiceCloneStatus,
      createdAt: String(data.voiceClone.createdAt),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-side helpers (used by /api/voice/clone + /api/voice/speak routes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ MOCK — production must call a real voice cloning provider here.
 *
 * Real implementation outline (ElevenLabs):
 *
 *   const formData = new FormData();
 *   formData.append("name", name || `clone_${userId}`);
 *   formData.append("files", audioBlob, "sample.webm");
 *   const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
 *     method: "POST",
 *     headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
 *     body: formData,
 *   });
 *   const json = await res.json();
 *   return { voiceId: json.voice_id, status: "ready" };
 *
 * The mock below returns a deterministic voiceId so the rest of the system
 * works in demo mode. Real training takes 30-60s; the mock marks the voice as
 * "ready" immediately.
 */
export async function cloneVoiceServer(
  userId: string,
  _base64Audio: string,
  _mimeType: string,
  opts: { duration?: number; name?: string } = {},
): Promise<CloneVoiceResult> {
  const voiceId = mockVoiceId(userId);
  logger?.info?.(`[voice-cloning] MOCK clone for ${userId} → ${voiceId}`);
  // Simulate training latency (100-300ms).
  await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
  return {
    voiceId,
    status: "ready", // mock — real providers go training → ready
    sampleUrl: `data:${_mimeType};base64,${_base64Audio.slice(0, 64)}…`,
  };
}

/**
 * ⚠️ MOCK — production must call a real TTS provider with the cloned voice.
 *
 * Real implementation outline (ElevenLabs):
 *
 *   const res = await fetch(
 *     `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
 *     {
 *       method: "POST",
 *       headers: {
 *         "xi-api-key": process.env.ELEVENLABS_API_KEY!,
 *         "Content-Type": "application/json",
 *         "Accept": "audio/mpeg",
 *       },
 *       body: JSON.stringify({
 *         text,
 *         model_id: "eleven_multilingual_v2",
 *         voice_settings: { stability: 0.5, similarity_boost: 0.75 },
 *       }),
 *     },
 *   );
 *   const blob = await res.blob();
 *   const audioUrl = URL.createObjectURL(blob);
 *
 * The mock returns a tiny silent WAV so the UI's <audio> element still works.
 */
export async function speakWithClonedVoiceServer(
  voiceId: string,
  text: string,
): Promise<SpeakResult> {
  logger?.info?.(`[voice-cloning] MOCK speak with voice=${voiceId}, text="${text.slice(0, 40)}…"`);

  // Generate a minimal silent WAV (44-byte header + ~1s of silence).
  // 8000 samples/s × 1s = 8000 bytes of audio + 44-byte header.
  const sampleRate = 8000;
  const durationSec = Math.min(30, Math.max(1, Math.ceil(text.length / 15)));
  const numSamples = sampleRate * durationSec;
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);
  // RIFF header
  view.setUint32(0, 0x52494646, false);   // "RIFF"
  view.setUint32(4, 36 + numSamples, true);
  view.setUint32(8, 0x57415645, false);   // "WAVE"
  // fmt sub-chunk
  view.setUint32(12, 0x666d7420, false);  // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);             // PCM
  view.setUint16(22, 1, true);            // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);   // byte rate
  view.setUint16(32, 1, true);            // block align
  view.setUint16(34, 8, true);           // bits per sample
  // data sub-chunk
  view.setUint32(36, 0x64617461, false);  // "data"
  view.setUint32(40, numSamples, true);
  // Fill with silence (0x80 = silence in 8-bit unsigned PCM).
  for (let i = 0; i < numSamples; i++) {
    view.setUint8(44 + i, 0x80);
  }

  // Convert ArrayBuffer to base64 string for transport.
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    audioUrl: `data:audio/wav;base64,${base64}`,
    duration: durationSec,
    provider: "mock-tts",
  };
}

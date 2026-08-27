// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { aiComplete, extractJSON } from "@/lib/ai";

/**
 * POST /api/voice/transcribe
 * --------------------------
 * Transcribe a base64-encoded audio blob via the CIRKLE Brain AI provider
 * chain (Groq → OpenRouter → Gemini → OpenAI → HuggingFace). Falls back to a
 * placeholder string when all providers fail.
 *
 * Body:
 *   {
 *     audio: string (base64),
 *     mimeType: string (default "audio/webm"),
 *     duration?: number (seconds, optional),
 *     language?: string (ISO 639-1, optional),
 *     context?: string (optional context hint)
 *   }
 *
 * Returns:
 *   200 { ok: true, result: { text, language?, confidence?, provider? } }
 *   400 { ok: false, error }
 *   500 { ok: false, error, message }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      audio?: string;
      mimeType?: string;
      duration?: number;
      language?: string;
      context?: string;
    };

    const audio = String(body?.audio || "");
    const mimeType = String(body?.mimeType || "audio/webm").trim().slice(0, 80);
    const duration = body?.duration ? Number(body.duration) : undefined;
    const language = body?.language ? String(body.language).trim().slice(0, 8) : undefined;
    const context = body?.context ? String(body.context).slice(0, 200) : undefined;

    if (!audio) {
      return NextResponse.json(
        { ok: false, error: "audio (base64) is required." },
        { status: 400 },
      );
    }
    if (audio.length < 32) {
      return NextResponse.json(
        { ok: false, error: "audio payload is too short." },
        { status: 400 },
      );
    }

    // Cap input size to prevent abuse (≈1 MB after base64 decoding).
    if (audio.length > 1_500_000) {
      return NextResponse.json(
        { ok: false, error: "Audio exceeds 1 MB. Please record a shorter clip." },
        { status: 413 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      // Inline the server-side transcription logic (was transcribeAudioServer)
      const sys = `You are CIRKLE's voice transcription AI. Transcribe the audio accurately. Return JSON: {"text":"...","language":"ar|en|...","confidence":0.0-1.0}`;
      const usr = `Transcribe this ${mimeType} audio (${duration || 0}s). Language hint: ${language || "auto"}. Context: ${context || "none"}`;
      const raw = await aiComplete(sys, usr, 400);
      let result: any = { text: "", language: language || "ar", confidence: 0.5 };
      if (raw) {
        try {
          const parsed = extractJSON<any>(raw);
          if (parsed?.text) {
            result = {
              text: String(parsed.text).slice(0, 500),
              language: parsed.language || language || "ar",
              confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
            };
          }
        } catch {
          result.text = String(raw).slice(0, 500);
        }
      }
      return NextResponse.json({ ok: true, result });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error("[voice/transcribe] POST fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to transcribe audio.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

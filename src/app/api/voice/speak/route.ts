// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { speakWithClonedVoiceServer } from "@/lib/voice-cloning";

/**
 * POST /api/voice/speak
 * ---------------------
 * Synthesize audio from text using a cloned voice.
 *
 * Body:
 *   { voiceId: string, text: string }
 *
 * Returns:
 *   200 { ok: true, audioUrl, duration, provider }
 *   400 { ok: false, error }
 *   500 { ok: false, error, message }
 *
 * ⚠️ MOCK: `speakWithClonedVoiceServer()` returns a silent WAV so the
 * client's <audio> element can play it end-to-end. Real implementation must
 * call a real TTS provider (ElevenLabs / Coqui / PlayHT / Resemble) — see
 * voice-cloning.ts.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      voiceId?: string;
      text?: string;
    };
    const voiceId = String(body?.voiceId || "").trim();
    const text = String(body?.text || "").trim();

    if (!voiceId || !text) {
      return NextResponse.json(
        { ok: false, error: "voiceId and text are required." },
        { status: 400 },
      );
    }
    if (text.length > 1000) {
      return NextResponse.json(
        { ok: false, error: "text exceeds 1000 characters." },
        { status: 413 },
      );
    }

    const result = await speakWithClonedVoiceServer(voiceId, text);
    return NextResponse.json({
      ok: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      provider: result.provider,
    });
  } catch (err) {
    console.error("[voice/speak] POST fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to synthesize speech.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

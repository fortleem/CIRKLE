// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { translateStream } from "@/lib/call-translation";

/**
 * POST /api/calls/translate
 * -------------------------
 * Translate a single text chunk during a call. Used by the WebRTC call
 * overlay's "Live Translate" toggle to render translated subtitles.
 *
 * Body:
 *   { text: string, from: string, to: string }
 *
 * Returns:
 *   200 { ok: true, chunk: { original, translated, from, to, confidence, ts } }
 *   400 { ok: false, error }
 *   500 { ok: false, error, message }
 *
 * The translation runs through the CIRKLE Brain AI provider chain (5
 * providers: Groq → OpenRouter → Gemini → OpenAI → HuggingFace). On failure
 * the route returns the original text with confidence=0 so the UI never
 * blocks on translation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      text?: string;
      from?: string;
      to?: string;
    };
    const text = String(body?.text || "");
    const from = String(body?.from || "ar").trim().slice(0, 8) || "ar";
    const to = String(body?.to || "en").trim().slice(0, 8) || "en";

    if (!text.trim()) {
      return NextResponse.json(
        { ok: false, error: "text is required." },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const chunk = await translateStream(text, from, to, controller.signal);
      return NextResponse.json({ ok: true, chunk });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error("[calls/translate] POST fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to translate.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

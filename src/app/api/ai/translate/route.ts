// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

/**
 * POST /api/ai/translate
 * Body: {text, from?, to?, targetLang?}
 *   - `to` is the canonical target language code.
 *   - `targetLang` is accepted as a convenience alias for `to`.
 * Returns {translation, from, to, isRTL, provider} after a 200ms delay.
 *
 * The route is the "server" provider used by `src/lib/translation-service.ts`.
 * It delegates the actual translation to `aiComplete` (5-provider chain:
 * Groq → OpenRouter → Gemini → OpenAI → HuggingFace) and falls back to
 * the original text on any failure so the caller always gets a usable
 * result. The 200ms delay smooths out provider latency spikes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      text?: string;
      from?: string;
      to?: string;
      targetLang?: string;
    };

    const text = body.text ?? "";
    const from = body.from ?? "auto";
    const to = body.targetLang ?? body.to ?? "en";

    await new Promise((r) => setTimeout(r, 200));

    let translation: string;
    let provider: "server" | "fallback" = "server";
    try {
      const out = await aiComplete(text, from, to);
      translation = (out ?? "").trim();
      if (!translation) {
        translation = text;
        provider = "fallback";
      }
    } catch (aiErr) {
      console.warn("[/api/ai/translate] AI failed, echoing input", aiErr);
      translation = text;
      provider = "fallback";
    }

    return NextResponse.json({
      translation,
      from,
      to,
      provider,
    });
  } catch (err) {
    logger.error("[/api/ai/translate] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "translation failed" },
      { status: 500 },
    );
  }
}

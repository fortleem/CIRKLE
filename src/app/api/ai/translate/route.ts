// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

/**
 * POST /api/ai/translate
 * Body: {text, from?, to?, targetLang?}
 *   - `to` is the canonical target language code.
 *   - `targetLang` is accepted as a convenience alias for `to`.
 * Returns {translation} after a 200ms delay.
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
    try {
      translation = await aiComplete(text, from, to);
      if (!translation.trim()) translation = text;
    } catch (aiErr) {
      console.warn("[/api/ai/translate] AI failed, echoing input", aiErr);
      translation = text;
    }

    return NextResponse.json({ translation });
  } catch (err) {
    logger.error("[/api/ai/translate] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "translation failed" },
      { status: 500 },
    );
  }
}

// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

const FALLBACK_MEMOIR =
  "Today was quiet. I helped Layla plan a trip, summarized a long thread, and translated a message of love. The Circle turns. 💛";

/**
 * POST /api/ai/memoir
 * Body: {prompt}
 * Returns {memoir}.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { prompt?: string };
    const prompt = body.prompt?.trim() || "Reflect on today.";

    let memoir: string;
    try {
      memoir = await aiComplete(prompt);
      if (!memoir.trim()) memoir = FALLBACK_MEMOIR;
    } catch (aiErr) {
      console.warn("[/api/ai/memoir] AI failed, returning fallback", aiErr);
      memoir = FALLBACK_MEMOIR;
    }

    return NextResponse.json({ memoir });
  } catch (err) {
    logger.error("[/api/ai/memoir] error", { error: (err as Error).message });
    return NextResponse.json({ memoir: FALLBACK_MEMOIR });
  }
}

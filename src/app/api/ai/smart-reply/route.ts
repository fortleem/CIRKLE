// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

const FALLBACK_REPLIES = ["💛", "On my way!", "See you soon"];

/**
 * POST /api/ai/smart-reply
 * Body: {message, context}
 * Returns {replies: string[]} after a short artificial delay.
 * Gracefully falls back if the AI SDK throws.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      message?: string;
      context?: string;
    };

    const message = body.message ?? "";
    const context = body.context ?? "";

    // 300ms artificial delay so the UI shows the thinking state.
    await new Promise((r) => setTimeout(r, 300));

    let replies: string[];
    try {
      replies = await aiComplete(message, context);
      if (!replies.length) replies = FALLBACK_REPLIES;
    } catch (aiErr) {
      console.warn("[/api/ai/smart-reply] AI failed, returning fallback", aiErr);
      replies = FALLBACK_REPLIES;
    }

    return NextResponse.json({ replies });
  } catch (err) {
    logger.error("[/api/ai/smart-reply] error", { error: (err as Error).message });
    return NextResponse.json({ replies: FALLBACK_REPLIES });
  }
}

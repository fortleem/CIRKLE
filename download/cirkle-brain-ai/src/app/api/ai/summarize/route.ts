// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

const FALLBACK_SUMMARY =
  "• Thread is busy — try again in a moment.\n• Multiple people are weighing in.\n• No clear consensus yet.";

/**
 * POST /api/ai/summarize
 * Body: {posts?: string[], text?: string}
 *   - `posts` is the canonical shape (array of post bodies).
 *   - `text` is accepted as a convenience alias: a single string is split
 *     into paragraphs / sentences and treated as the thread.
 * Returns {summary} after a 400ms delay.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      posts?: unknown;
      text?: unknown;
    };

    let posts: string[] = [];
    if (Array.isArray(body.posts)) {
      posts = body.posts.filter((p) => typeof p === "string").map((p) => p as string);
    } else if (typeof body.text === "string" && body.text.trim()) {
      // Split a single `text` blob into ~sentence-sized chunks so the
      // summarizer sees multiple "posts" — falls back to a single chunk
      // when no sentence boundaries are present.
      const chunks = body.text
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      posts = chunks.length ? chunks : [body.text.trim()];
    }
    if (posts.length === 0) {
      return NextResponse.json({ summary: FALLBACK_SUMMARY });
    }

    await new Promise((r) => setTimeout(r, 400));

    let summary: string;
    try {
      summary = await aiComplete(posts);
      if (!summary.trim()) summary = FALLBACK_SUMMARY;
    } catch (aiErr) {
      console.warn("[/api/ai/summarize] AI failed, returning fallback", aiErr);
      summary = FALLBACK_SUMMARY;
    }

    return NextResponse.json({ summary });
  } catch (err) {
    logger.error("[/api/ai/summarize] error", { error: (err as Error).message });
    return NextResponse.json({ summary: FALLBACK_SUMMARY });
  }
}

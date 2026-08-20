// @ts-nocheck
/**
 * POST /api/chats/summarize
 * ============================================================================
 * AI-powered topic-based chat summarization for Wasl conversations.
 *
 * Body:
 *   { conversationId: string, scope: "today" | "all" }
 *
 * Returns:
 *   { conversationId, scope, totalMessages, topics: [...], generatedAt }
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { summarizeChat } from "@/lib/chat-summarization";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const conversationId = typeof body?.conversationId === "string" ? body.conversationId : "";
    const scope = body?.scope === "all" ? "all" : "today";

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    const result = await summarizeChat(conversationId, scope);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "summarization_failed", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

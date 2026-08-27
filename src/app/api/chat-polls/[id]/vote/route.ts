// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { votePoll, getPollResults } from "@/lib/chat-polls";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/chat-polls/[id]/vote
 * Body: { optionIds: string[], voterId }
 * Casts a vote (or replaces a prior vote). Returns the updated poll results.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const result = await votePoll({
      pollId: id,
      optionIds: Array.isArray(body.optionIds) ? (body.optionIds as string[]) : [],
      voterId: typeof body.voterId === "string" ? body.voterId : "",
    });
    logger.info("[/api/chat-polls/[id]/vote POST] voted", { pollId: id });
    return NextResponse.json({ result });
  } catch (err) {
    logger.error("[/api/chat-polls/[id]/vote POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to vote" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/chat-polls/[id]/vote?voterId=...
 * Returns the current results + the viewer's choice.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const voterId = req.nextUrl.searchParams.get("voterId") || undefined;
    const result = await getPollResults(id, voterId);
    return NextResponse.json({ result });
  } catch (err) {
    logger.error("[/api/chat-polls/[id]/vote GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch results" },
      { status: 500 },
    );
  }
}

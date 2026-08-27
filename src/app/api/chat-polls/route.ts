// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createPoll, listPollsInConversation, listPollsByCreator } from "@/lib/chat-polls";
import { logger } from "@/lib/logger";

/**
 * GET /api/chat-polls?conversationId=... OR ?createdBy=...
 * Lists polls in a conversation or by creator.
 */
export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get("conversationId") || "";
    const createdBy = req.nextUrl.searchParams.get("createdBy") || "";
    let polls;
    if (conversationId) {
      polls = await listPollsInConversation(conversationId);
    } else if (createdBy) {
      polls = await listPollsByCreator(createdBy);
    } else {
      return NextResponse.json({ error: "conversationId or createdBy is required" }, { status: 400 });
    }
    return NextResponse.json({ polls });
  } catch (err) {
    logger.error("[/api/chat-polls GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list polls" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/chat-polls
 * Body: { conversationId, question, options: string[], multiChoice?, anonymous?, createdBy }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const poll = await createPoll({
      conversationId: typeof body.conversationId === "string" ? body.conversationId : "",
      question: typeof body.question === "string" ? body.question : "",
      options: Array.isArray(body.options) ? (body.options as string[]) : [],
      multiChoice: typeof body.multiChoice === "boolean" ? body.multiChoice : false,
      anonymous: typeof body.anonymous === "boolean" ? body.anonymous : false,
      createdBy: typeof body.createdBy === "string" ? body.createdBy : "",
    });
    logger.info("[/api/chat-polls POST] created", { id: poll.id, conversationId: poll.conversationId });
    return NextResponse.json({ poll }, { status: 201 });
  } catch (err) {
    logger.error("[/api/chat-polls POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create poll" },
      { status: 500 },
    );
  }
}

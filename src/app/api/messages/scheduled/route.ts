// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  scheduleMessage,
  getScheduledMessages,
  cancelScheduled,
  getOptimalTimes,
} from "@/lib/scheduled-messages";

/**
 * /api/messages/scheduled
 *
 *   POST    { conversationId, body, scheduledFor }   → schedule a new message
 *   GET     ?conversationId=&status=&limit=          → list scheduled messages
 *   DELETE  ?id=                                      → cancel a scheduled message
 *
 * Query params for GET:
 *   conversationId  optional filter
 *   status          optional filter (pending | sent | cancelled)
 *   limit           optional, default 100, capped at 500
 *
 * Query params for DELETE:
 *   id              the ScheduledMessage.id to cancel
 */
export async function POST(
  req: NextRequest,
) {
  try {
    const body = await req.json();
    const { conversationId, body: messageBody, scheduledFor } = body;
    if (!conversationId || !messageBody || !scheduledFor) {
      return NextResponse.json(
        { error: "conversationId, body, and scheduledFor are required." },
        { status: 400 },
      );
    }
    const result = await scheduleMessage({
      conversationId,
      body: messageBody,
      scheduledFor,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "scheduleMessage failed";
    const status = /required|empty|valid date|exceeds|future|year/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const limitStr = searchParams.get("limit");
    const limit = limitStr ? Number.parseInt(limitStr, 10) : undefined;

    const [scheduled, optimalTimes] = await Promise.all([
      getScheduledMessages({
        conversationId,
        status: status as any,
        limit: Number.isFinite(limit) ? limit : undefined,
      }),
      // Always return AI-suggested optimal times so the overlay can render
      // the suggestion rail in one round-trip.
      getOptimalTimes(conversationId),
    ]);
    return NextResponse.json({ scheduled, optimalTimes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "id query param is required." },
        { status: 400 },
      );
    }
    const result = await cancelScheduled(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "cancelScheduled failed";
    const status = /not found/i.test(msg) ? 404 : /required/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

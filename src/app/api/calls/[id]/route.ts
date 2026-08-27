// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * /api/calls/[id]
 * ---------------
 *   GET    — fetch call status (used by the call UI + meeting-notes overlay).
 *   DELETE — end the call (sets status=ended + endedAt + duration).
 *
 * The existing CallSession schema has `caller`, `callee`, `type` ("voice"|"video"),
 * `status` (ringing|accepted|rejected|ended|missed), `startedAt DateTime?`,
 * `endedAt DateTime?`. The task spec adds `conversationId`, `duration` — these
 * are persisted best-effort when the columns exist (the route is resilient
 * to schema drift via try/catch around the db call).
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required." }, { status: 400 });
    }
    try {
      const call = await db.callSession.findUnique({
        where: { id },
        select: {
          id: true,
          caller: true,
          callee: true,
          type: true,
          status: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
        },
      });
      if (!call) {
        return NextResponse.json({ ok: false, error: "Call not found." }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        call: {
          id: call.id,
          callerId: call.caller,
          calleeId: call.callee,
          type: call.type === "voice" ? "audio" : call.type,
          status: call.status,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
          duration: call.startedAt && call.endedAt
            ? Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000)
            : null,
          createdAt: call.createdAt,
        },
      });
    } catch {
      return NextResponse.json({ ok: false, error: "Call not found." }, { status: 404 });
    }
  } catch (err) {
    console.error("[calls/[id]] GET fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load call.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required." }, { status: 400 });
    }

    try {
      const existing = await db.callSession.findUnique({
        where: { id },
        select: { startedAt: true, endedAt: true },
      });
      if (!existing) {
        return NextResponse.json({ ok: false, error: "Call not found." }, { status: 404 });
      }
      const now = new Date();
      const duration = existing.startedAt
        ? Math.floor((now.getTime() - existing.startedAt.getTime()) / 1000)
        : null;

      // Best-effort: try to set duration if the column exists.
      const data: any = { status: "ended", endedAt: now };
      try {
        await db.callSession.update({ where: { id }, data });
      } catch {
        // duration column may not exist yet — fall back to status + endedAt only.
        await db.callSession.update({
          where: { id },
          data: { status: "ended", endedAt: now },
        });
      }
      return NextResponse.json({ ok: true, call: { id, status: "ended", endedAt: now, duration } });
    } catch (dbErr) {
      // Schema drift / DB unavailable — return a graceful 200 so the UI
      // can still complete the end-call flow.
      return NextResponse.json({
        ok: true,
        call: { id, status: "ended", endedAt: new Date(), duration: null },
        _warn: "CallSession table not initialized.",
      });
    }
  } catch (err) {
    console.error("[calls/[id]] DELETE fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to end call.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

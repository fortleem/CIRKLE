import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Cirkle Call — REST API for CallSession records.
 *
 * The actual WebRTC signaling (SDP offer/answer + ICE candidates) flows
 * through the chat-service socket.io on port 3003 — never persisted here.
 * This route only stores call metadata so the user has a history.
 *
 * Endpoints:
 *   POST   /api/calls          — create a call session (status: ringing)
 *   PATCH  /api/calls          — update status (accepted | rejected | ended)
 *   GET    /api/calls          — list the user's call history (caller OR callee)
 *
 * Body shapes:
 *   POST   { caller, callee, type: "voice" | "video" }
 *   PATCH  { id, status, startedAt?, endedAt? }
 */

interface CreateBody {
  caller?: string;
  callee?: string;
  type?: string;
}

interface PatchBody {
  id?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string;
}

const ALLOWED_TYPES = new Set(["voice", "video"]);
const ALLOWED_STATUSES = new Set([
  "ringing",
  "accepted",
  "rejected",
  "ended",
  "missed",
]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as CreateBody;
    const caller = String(body?.caller || "").trim().slice(0, 60);
    const callee = String(body?.callee || "").trim().slice(0, 60);
    const type = ALLOWED_TYPES.has(body?.type || "")
      ? (body!.type as string)
      : "voice";

    if (!caller || !callee) {
      return NextResponse.json(
        { ok: false, error: "caller and callee are required." },
        { status: 400 },
      );
    }
    if (caller === callee) {
      return NextResponse.json(
        { ok: false, error: "caller and callee must differ." },
        { status: 400 },
      );
    }

    const created = await db.callSession.create({
      data: {
        caller,
        callee,
        type,
        status: "ringing",
      },
      select: {
        id: true,
        caller: true,
        callee: true,
        type: true,
        status: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, call: created }, { status: 201 });
  } catch (err) {
    console.error("[calls] POST fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create call session.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as PatchBody;
    const id = String(body?.id || "").trim();
    const status = String(body?.status || "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id is required." },
        { status: 400 },
      );
    }
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        {
          ok: false,
          error: `status must be one of: ${[...ALLOWED_STATUSES].join(", ")}.`,
        },
        { status: 400 },
      );
    }

    // Set timestamps based on the transition.
    const now = new Date();
    const data: {
      status: string;
      startedAt?: Date;
      endedAt?: Date;
    } = { status };

    if (status === "accepted") {
      // Only set startedAt if it isn't already.
      const existing = await db.callSession.findUnique({
        where: { id },
        select: { startedAt: true },
      });
      if (existing && !existing.startedAt) {
        data.startedAt = now;
      }
    }
    if (status === "ended" || status === "rejected" || status === "missed") {
      const existing = await db.callSession.findUnique({
        where: { id },
        select: { startedAt: true, endedAt: true },
      });
      if (existing && !existing.startedAt && status === "ended") {
        data.startedAt = now;
      }
      if (existing && !existing.endedAt) {
        data.endedAt = now;
      }
    }

    const updated = await db.callSession.update({
      where: { id },
      data,
      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,
      },
    });
    return NextResponse.json({ ok: true, call: updated });
  } catch (err) {
    console.error("[calls] PATCH fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to update call session.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const user = url.searchParams.get("user")?.trim().slice(0, 60) || "";
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") || "50")),
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "user query param is required." },
        { status: 400 },
      );
    }

    const calls = await db.callSession.findMany({
      where: {
        OR: [{ caller: user }, { callee: user }],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
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
    return NextResponse.json({ ok: true, calls });
  } catch (err) {
    console.error("[calls] GET fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load call history.",
        message: String((err as Error)?.message || err || "unknown"),
        calls: [],
      },
      { status: 500 },
    );
  }
}

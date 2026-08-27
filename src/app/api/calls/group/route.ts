// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

/**
 * /api/calls/group
 * ----------------
 *   POST — create a group call session (returns a callId + the host as the
 *          first participant). Body:
 *     {
 *       conversationId: string,
 *       type: "audio" | "video" (default "audio"),
 *       hostId: string,
 *       hostName: string,
 *       maxParticipants?: number (default 8, cap 16)
 *     }
 *   GET  — list participants of an in-progress group call.
 *     Query: ?callId=… → returns { ok, participants[] }
 *
 * Implementation notes:
 *   • Group calls use an in-memory map keyed by callId for participant state.
 *     This is sufficient because real group calls are SFU-backed (mediasoup /
 *     janus / livekit) and the SFU is the source of truth. The HTTP layer
 *     only needs to bookkeep who joined via the API.
 *   • When the SFU is wired up, the POST should also create the room on the
 *     SFU and return the SFU room token so the client can connect.
 */

interface Participant {
  id: string;
  displayName: string;
  isHost: boolean;
  muted: boolean;
  videoOff: boolean;
  handRaised: boolean;
  joinedAt: string;
}

interface GroupCall {
  id: string;
  conversationId: string;
  type: "audio" | "video";
  hostId: string;
  maxParticipants: number;
  startedAt: string;
  participants: Map<string, Participant>;
}

// ── In-memory store (per server instance) ─────────────────────────────────────
const activeGroupCalls = new Map<string, GroupCall>();

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      conversationId?: string;
      type?: string;
      hostId?: string;
      hostName?: string;
      maxParticipants?: number;
    };
    const conversationId = String(body?.conversationId || "").trim().slice(0, 80);
    const type = body?.type === "video" ? "video" : "audio";
    const hostId = String(body?.hostId || "").trim().slice(0, 60);
    const hostName = String(body?.hostName || "Host").trim().slice(0, 80) || "Host";
    const max = Math.min(16, Math.max(2, Number(body?.maxParticipants || 8)));

    if (!conversationId || !hostId) {
      return NextResponse.json(
        { ok: false, error: "conversationId and hostId are required." },
        { status: 400 },
      );
    }

    const id = `gcall_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const call: GroupCall = {
      id,
      conversationId,
      type,
      hostId,
      maxParticipants: max,
      startedAt: new Date().toISOString(),
      participants: new Map(),
    };
    call.participants.set(hostId, {
      id: hostId,
      displayName: hostName,
      isHost: true,
      muted: false,
      videoOff: type === "audio",
      handRaised: false,
      joinedAt: call.startedAt,
    });
    activeGroupCalls.set(id, call);

    return NextResponse.json({
      ok: true,
      call: {
        id,
        conversationId,
        type,
        hostId,
        maxParticipants: max,
        startedAt: call.startedAt,
        participantCount: 1,
        participants: [...call.participants.values()],
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[calls/group] POST fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create group call.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const callId = url.searchParams.get("callId")?.trim().slice(0, 60) || "";
    if (!callId) {
      return NextResponse.json(
        { ok: false, error: "callId query parameter is required." },
        { status: 400 },
      );
    }
    const call = activeGroupCalls.get(callId);
    if (!call) {
      return NextResponse.json(
        { ok: false, error: "Group call not found or has ended." },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ok: true,
      call: {
        id: call.id,
        conversationId: call.conversationId,
        type: call.type,
        hostId: call.hostId,
        maxParticipants: call.maxParticipants,
        startedAt: call.startedAt,
        participantCount: call.participants.size,
        participants: [...call.participants.values()],
      },
    });
  } catch (err) {
    console.error("[calls/group] GET fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch group call.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

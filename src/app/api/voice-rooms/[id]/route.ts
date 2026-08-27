// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  getRoom,
  joinRoom,
  leaveRoom,
  raiseHand,
  inviteToSpeaker,
  endRoom,
} from "@/lib/voice-rooms";

/**
 * /api/voice-rooms/[id]
 * ---------------------
 *   GET  — fetch room details (status, host, participants, counts).
 *   POST — perform an action on the room. Body shape:
 *     {
 *       action: "join" | "leave" | "raise-hand" | "invite-to-speaker" | "end",
 *       userId: string,
 *       displayName?: string (for "join"),
 *       avatarColor?: string,
 *       asSpeaker?: boolean,
 *       raised?: boolean,
 *       targetUserId?: string (for "invite-to-speaker")
 *     }
 *
 * Returns:
 *   200 { ok: true, room?: VoiceRoomDetails, ended?: boolean }
 *   400 { ok: false, error }
 *   404 { ok: false, error: "Room not found." }
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
    const room = await getRoom(id);
    if (!room) {
      return NextResponse.json({ ok: false, error: "Room not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, room });
  } catch (err) {
    console.error("[voice-rooms/[id]] GET fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load room.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id: roomId } = await ctx.params;
    if (!roomId) {
      return NextResponse.json({ ok: false, error: "id is required." }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      userId?: string;
      displayName?: string;
      avatarColor?: string;
      asSpeaker?: boolean;
      raised?: boolean;
      targetUserId?: string;
    };

    const action = String(body?.action || "").trim() as
      | "join" | "leave" | "raise-hand" | "invite-to-speaker" | "end";
    const userId = String(body?.userId || "").trim();

    if (!action || !userId) {
      return NextResponse.json(
        { ok: false, error: "action and userId are required." },
        { status: 400 },
      );
    }

    switch (action) {
      case "join": {
        const room = await joinRoom({
          roomId,
          userId,
          displayName: String(body?.displayName || "Guest").slice(0, 80),
          avatarColor: body?.avatarColor ? String(body.avatarColor) : undefined,
          asSpeaker: !!body?.asSpeaker,
        });
        return NextResponse.json({ ok: true, room });
      }
      case "leave": {
        const result = await leaveRoom(roomId, userId);
        return NextResponse.json({ ok: true, ...result });
      }
      case "raise-hand": {
        const raised = body?.raised === undefined ? true : !!body.raised;
        const room = await raiseHand(roomId, userId, raised);
        return NextResponse.json({ ok: true, room });
      }
      case "invite-to-speaker": {
        const targetUserId = String(body?.targetUserId || "").trim();
        if (!targetUserId) {
          return NextResponse.json(
            { ok: false, error: "targetUserId is required for invite-to-speaker." },
            { status: 400 },
          );
        }
        const room = await inviteToSpeaker(roomId, targetUserId);
        return NextResponse.json({ ok: true, room });
      }
      case "end": {
        await endRoom(roomId, userId);
        return NextResponse.json({ ok: true, ended: true });
      }
      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}.` },
          { status: 400 },
        );
    }
  } catch (err) {
    const message = String((err as Error)?.message || err || "unknown");
    console.error("[voice-rooms/[id]] POST fatal:", err);
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json(
      { ok: false, error: message || "Failed to perform action." },
      { status },
    );
  }
}

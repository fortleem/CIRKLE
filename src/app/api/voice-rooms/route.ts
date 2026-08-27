// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  createRoom,
  listActiveRooms,
  type CreateRoomInput,
} from "@/lib/voice-rooms";

/**
 * /api/voice-rooms
 * ----------------
 *   POST — create a new voice room (Clubhouse-style). Returns the room + the
 *          host as the first speaker. Body shape matches `CreateRoomInput`:
 *     {
 *       name: string,
 *       hostId: string,
 *       hostDisplayName: string,
 *       hostAvatarColor?: string,
 *       topic?: string
 *     }
 *   GET  — list active (status="live") rooms. Optional query: ?limit=20.
 *
 * The route delegates to `src/lib/voice-rooms.ts` which has graceful fallback
 * to an in-memory store when the VoiceRoom / VoiceRoomParticipant Prisma
 * models don't exist yet.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as CreateRoomInput;
    const name = String(body?.name || "").trim();
    const hostId = String(body?.hostId || "").trim();
    const hostDisplayName = String(body?.hostDisplayName || "").trim() || "Host";
    const topic = body?.topic ? String(body.topic).trim() : undefined;
    const hostAvatarColor = body?.hostAvatarColor ? String(body.hostAvatarColor) : undefined;

    if (!name || !hostId) {
      return NextResponse.json(
        { ok: false, error: "name and hostId are required." },
        { status: 400 },
      );
    }

    const room = await createRoom({
      name: name.slice(0, 120),
      hostId: hostId.slice(0, 60),
      hostDisplayName: hostDisplayName.slice(0, 80),
      hostAvatarColor,
      topic,
    });
    return NextResponse.json({ ok: true, room }, { status: 201 });
  } catch (err) {
    console.error("[voice-rooms] POST fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create voice room.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || "20")));
    const rooms = await listActiveRooms(limit);
    return NextResponse.json({ ok: true, rooms });
  } catch (err) {
    console.error("[voice-rooms] GET fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to list voice rooms.",
        message: String((err as Error)?.message || err || "unknown"),
        rooms: [],
      },
      { status: 500 },
    );
  }
}

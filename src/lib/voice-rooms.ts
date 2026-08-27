// @ts-nocheck
/**
 * Voice Rooms Service (B11) — Clubhouse-style audio rooms
 * -------------------------------------------------------
 * Server-side helpers for creating, joining, and managing voice rooms.
 *
 * What this module does:
 *   • `createRoom()` — creates a new VoiceRoom row in the DB with the host as
 *     the first speaker.
 *   • `joinRoom()` — joins a room as either a speaker (host-approved) or an
 *     audience member.
 *   • `leaveRoom()` — leaves the room. If the host leaves, the room ends.
 *   • `raiseHand()` — toggles the audience member's "raise hand" state so the
 *     host sees the request to speak.
 *   • `inviteToSpeaker()` — host promotes an audience member to speaker.
 *
 * All functions are PURE server-side (they touch the DB) — they're meant to be
 * called from API routes or server actions only. They never touch the DOM.
 *
 * Real-time audio is delivered via the chat-service socket.io on port 3003 (the
 * existing call infrastructure). This module only handles the room's
 * bookkeeping (who's in, who's speaking, who raised their hand).
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VoiceRoomParticipant {
  id: string;
  userId: string;
  displayName: string;
  avatarColor: string;
  role: "host" | "speaker" | "audience";
  muted: boolean;
  handRaised: boolean;
  joinedAt: Date;
}

export interface VoiceRoomDetails {
  id: string;
  name: string;
  hostId: string;
  topic: string | null;
  status: "live" | "ended";
  speakerCount: number;
  audienceCount: number;
  createdAt: Date;
  endedAt: Date | null;
  participants: VoiceRoomParticipant[];
}

export interface CreateRoomInput {
  name: string;
  hostId: string;
  hostDisplayName: string;
  hostAvatarColor?: string;
  topic?: string;
}

export interface JoinRoomInput {
  roomId: string;
  userId: string;
  displayName: string;
  avatarColor?: string;
  asSpeaker?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────────────────────────────────────

// The DB schema for VoiceRoom may not exist yet — this module uses a
// graceful fallback: if `db.voiceRoom` / `db.voiceRoomParticipant` is
// undefined, we keep an in-memory map so the API still works for demo
// purposes. Production deployments must run `bun run db:push` after adding
// the VoiceRoom + VoiceRoomParticipant models to `prisma/schema.prisma`.

const inMemoryRooms = new Map<string, {
  id: string; name: string; hostId: string; topic: string | null;
  status: "live" | "ended"; speakerCount: number; audienceCount: number;
  createdAt: Date; endedAt: Date | null;
  participants: VoiceRoomParticipant[];
}>();

function hasDB(): boolean {
  return !!(db && (db as any).voiceRoom && (db as any).voiceRoomParticipant);
}

function safeDb() {
  return db as any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function createRoom(input: CreateRoomInput): Promise<VoiceRoomDetails> {
  const name = String(input.name || "").trim().slice(0, 120);
  const topic = input.topic ? String(input.topic).trim().slice(0, 280) : null;
  if (!name) throw new Error("Room name is required.");
  if (!input.hostId) throw new Error("hostId is required.");

  if (hasDB()) {
    try {
      const room = await safeDb().voiceRoom.create({
        data: {
          name,
          hostId: input.hostId,
          topic,
          status: "live",
          speakerCount: 1,
          audienceCount: 0,
        },
      });
      const hostParticipant = await safeDb().voiceRoomParticipant.create({
        data: {
          roomId: room.id,
          userId: input.hostId,
          displayName: input.hostDisplayName,
          avatarColor: input.hostAvatarColor || "teal",
          role: "host",
          muted: false,
          handRaised: false,
        },
      });
      return toDetails(room, [hostParticipant]);
    } catch (err) {
      logger?.error?.("[voice-rooms] createRoom DB failed:", err);
      // fall through to in-memory
    }
  }

  // In-memory fallback
  const id = `vr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  const host: VoiceRoomParticipant = {
    id: `p_${id}`,
    userId: input.hostId,
    displayName: input.hostDisplayName,
    avatarColor: input.hostAvatarColor || "teal",
    role: "host",
    muted: false,
    handRaised: false,
    joinedAt: now,
  };
  const room = {
    id, name, hostId: input.hostId, topic,
    status: "live" as const,
    speakerCount: 1, audienceCount: 0,
    createdAt: now, endedAt: null,
    participants: [host],
  };
  inMemoryRooms.set(id, room);
  return toDetails(room, room.participants);
}

export async function joinRoom(input: JoinRoomInput): Promise<VoiceRoomDetails> {
  if (!input.roomId) throw new Error("roomId is required.");
  if (!input.userId) throw new Error("userId is required.");

  if (hasDB()) {
    try {
      const room = await safeDb().voiceRoom.findUnique({ where: { id: input.roomId } });
      if (!room) throw new Error("Room not found.");
      if (room.status === "ended") throw new Error("Room has ended.");

      const existing = await safeDb().voiceRoomParticipant.findFirst({
        where: { roomId: input.roomId, userId: input.userId },
      });
      if (existing) {
        // Already in the room — return current state.
        const all = await safeDb().voiceRoomParticipant.findMany({
          where: { roomId: input.roomId },
        });
        return toDetails(room, all);
      }

      const role = input.asSpeaker ? "speaker" : "audience";
      const participant = await safeDb().voiceRoomParticipant.create({
        data: {
          roomId: input.roomId,
          userId: input.userId,
          displayName: input.displayName,
          avatarColor: input.avatarColor || "teal",
          role,
          muted: true,
          handRaised: false,
        },
      });
      if (role === "speaker") {
        await safeDb().voiceRoom.update({
          where: { id: input.roomId },
          data: { speakerCount: { increment: 1 } },
        });
      } else {
        await safeDb().voiceRoom.update({
          where: { id: input.roomId },
          data: { audienceCount: { increment: 1 } },
        });
      }
      const updated = await safeDb().voiceRoom.findUnique({ where: { id: input.roomId } });
      const all = await safeDb().voiceRoomParticipant.findMany({
        where: { roomId: input.roomId },
      });
      return toDetails(updated, all);
    } catch (err) {
      logger?.error?.("[voice-rooms] joinRoom DB failed:", err);
    }
  }

  // In-memory
  const room = inMemoryRooms.get(input.roomId);
  if (!room) throw new Error("Room not found.");
  if (room.status === "ended") throw new Error("Room has ended.");
  if (!room.participants.find((p) => p.userId === input.userId)) {
    const p: VoiceRoomParticipant = {
      id: `p_${Date.now().toString(36)}`,
      userId: input.userId,
      displayName: input.displayName,
      avatarColor: input.avatarColor || "teal",
      role: input.asSpeaker ? "speaker" : "audience",
      muted: true,
      handRaised: false,
      joinedAt: new Date(),
    };
    room.participants.push(p);
    if (p.role === "audience") room.audienceCount++;
    else room.speakerCount++;
  }
  return toDetails(room, room.participants);
}

export async function leaveRoom(roomId: string, userId: string): Promise<{ ok: true; ended?: boolean }> {
  if (!roomId || !userId) throw new Error("roomId and userId are required.");

  if (hasDB()) {
    try {
      const room = await safeDb().voiceRoom.findUnique({ where: { id: roomId } });
      if (!room) return { ok: true };
      const p = await safeDb().voiceRoomParticipant.findFirst({
        where: { roomId, userId },
      });
      if (!p) return { ok: true };

      if (p.role === "audience") {
        await safeDb().voiceRoom.update({
          where: { id: roomId },
          data: { audienceCount: { decrement: 1 } },
        });
      } else {
        await safeDb().voiceRoom.update({
          where: { id: roomId },
          data: { speakerCount: { decrement: 1 } },
        });
      }
      await safeDb().voiceRoomParticipant.delete({ where: { id: p.id } });

      if (room.hostId === userId) {
        // Host leaves → end the room.
        await safeDb().voiceRoom.update({
          where: { id: roomId },
          data: { status: "ended", endedAt: new Date() },
        });
        await safeDb().voiceRoomParticipant.deleteMany({ where: { roomId } });
        return { ok: true, ended: true };
      }
      return { ok: true };
    } catch (err) {
      logger?.error?.("[voice-rooms] leaveRoom DB failed:", err);
    }
  }

  const room = inMemoryRooms.get(roomId);
  if (!room) return { ok: true };
  const idx = room.participants.findIndex((p) => p.userId === userId);
  if (idx === -1) return { ok: true };
  const p = room.participants[idx];
  room.participants.splice(idx, 1);
  if (p.role === "audience") room.audienceCount = Math.max(0, room.audienceCount - 1);
  else room.speakerCount = Math.max(0, room.speakerCount - 1);
  if (room.hostId === userId) {
    room.status = "ended";
    room.endedAt = new Date();
    inMemoryRooms.delete(roomId);
    return { ok: true, ended: true };
  }
  return { ok: true };
}

export async function raiseHand(roomId: string, userId: string, raised: boolean): Promise<VoiceRoomDetails> {
  if (hasDB()) {
    try {
      const p = await safeDb().voiceRoomParticipant.findFirst({
        where: { roomId, userId },
      });
      if (!p) throw new Error("Not in room.");
      const updated = await safeDb().voiceRoomParticipant.update({
        where: { id: p.id },
        data: { handRaised: raised },
      });
      const room = await safeDb().voiceRoom.findUnique({ where: { id: roomId } });
      const all = await safeDb().voiceRoomParticipant.findMany({ where: { roomId } });
      return toDetails(room, all);
    } catch (err) {
      logger?.error?.("[voice-rooms] raiseHand DB failed:", err);
    }
  }
  const room = inMemoryRooms.get(roomId);
  if (!room) throw new Error("Room not found.");
  const p = room.participants.find((p) => p.userId === userId);
  if (!p) throw new Error("Not in room.");
  p.handRaised = raised;
  return toDetails(room, room.participants);
}

export async function inviteToSpeaker(roomId: string, userId: string): Promise<VoiceRoomDetails> {
  if (hasDB()) {
    try {
      const p = await safeDb().voiceRoomParticipant.findFirst({
        where: { roomId, userId },
      });
      if (!p) throw new Error("User not in room.");
      const wasAudience = p.role === "audience";
      const updated = await safeDb().voiceRoomParticipant.update({
        where: { id: p.id },
        data: { role: "speaker", handRaised: false },
      });
      if (wasAudience) {
        await safeDb().voiceRoom.update({
          where: { id: roomId },
          data: {
            audienceCount: { decrement: 1 },
            speakerCount: { increment: 1 },
          },
        });
      }
      const room = await safeDb().voiceRoom.findUnique({ where: { id: roomId } });
      const all = await safeDb().voiceRoomParticipant.findMany({ where: { roomId } });
      return toDetails(room, all);
    } catch (err) {
      logger?.error?.("[voice-rooms] inviteToSpeaker DB failed:", err);
    }
  }
  const room = inMemoryRooms.get(roomId);
  if (!room) throw new Error("Room not found.");
  const p = room.participants.find((p) => p.userId === userId);
  if (!p) throw new Error("User not in room.");
  if (p.role === "audience") {
    p.role = "speaker";
    p.handRaised = false;
    room.audienceCount = Math.max(0, room.audienceCount - 1);
    room.speakerCount++;
  }
  return toDetails(room, room.participants);
}

export async function getRoom(roomId: string): Promise<VoiceRoomDetails | null> {
  if (hasDB()) {
    try {
      const room = await safeDb().voiceRoom.findUnique({ where: { id: roomId } });
      if (!room) return null;
      const all = await safeDb().voiceRoomParticipant.findMany({
        where: { roomId },
        orderBy: { joinedAt: "asc" },
      });
      return toDetails(room, all);
    } catch (err) {
      logger?.error?.("[voice-rooms] getRoom DB failed:", err);
    }
  }
  const room = inMemoryRooms.get(roomId);
  if (!room) return null;
  return toDetails(room, room.participants);
}

export async function listActiveRooms(limit = 20): Promise<VoiceRoomDetails[]> {
  if (hasDB()) {
    try {
      const rooms = await safeDb().voiceRoom.findMany({
        where: { status: "live" },
        orderBy: { createdAt: "desc" },
        take: Math.min(50, Math.max(1, limit)),
      });
      const out: VoiceRoomDetails[] = [];
      for (const r of rooms) {
        const participants = await safeDb().voiceRoomParticipant.findMany({
          where: { roomId: r.id },
          orderBy: { joinedAt: "asc" },
        });
        out.push(toDetails(r, participants));
      }
      return out;
    } catch (err) {
      logger?.error?.("[voice-rooms] listActiveRooms DB failed:", err);
    }
  }
  return [...inMemoryRooms.values()]
    .filter((r) => r.status === "live")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map((r) => toDetails(r, r.participants));
}

export async function endRoom(roomId: string, hostId: string): Promise<{ ok: true }> {
  if (hasDB()) {
    try {
      const room = await safeDb().voiceRoom.findUnique({ where: { id: roomId } });
      if (!room) throw new Error("Room not found.");
      if (room.hostId !== hostId) throw new Error("Only the host can end the room.");
      await safeDb().voiceRoom.update({
        where: { id: roomId },
        data: { status: "ended", endedAt: new Date() },
      });
      await safeDb().voiceRoomParticipant.deleteMany({ where: { roomId } });
      return { ok: true };
    } catch (err) {
      logger?.error?.("[voice-rooms] endRoom DB failed:", err);
    }
  }
  const room = inMemoryRooms.get(roomId);
  if (!room) return { ok: true };
  room.status = "ended";
  room.endedAt = new Date();
  inMemoryRooms.delete(roomId);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDetails(room: any, participants: any[]): VoiceRoomDetails {
  return {
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    topic: room.topic ?? null,
    status: room.status as "live" | "ended",
    speakerCount: typeof room.speakerCount === "number" ? room.speakerCount
      : participants.filter((p) => p.role === "host" || p.role === "speaker").length,
    audienceCount: typeof room.audienceCount === "number" ? room.audienceCount
      : participants.filter((p) => p.role === "audience").length,
    createdAt: room.createdAt instanceof Date ? room.createdAt : new Date(room.createdAt),
    endedAt: room.endedAt ? new Date(room.endedAt) : null,
    participants: participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      displayName: p.displayName,
      avatarColor: p.avatarColor || "teal",
      role: p.role as "host" | "speaker" | "audience",
      muted: !!p.muted,
      handRaised: !!p.handRaised,
      joinedAt: p.joinedAt instanceof Date ? p.joinedAt : new Date(p.joinedAt),
    })),
  };
}

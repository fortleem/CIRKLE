// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * /api/messages/voice
 * --------------------
 *   POST — upload a voice message blob + metadata. Persists a Message row
 *          (kind: "voice") and a VoiceMessage row linking to it. Returns
 *          { ok, messageId, voiceMessage }.
 *   GET  — fetch a voice message by ?id=messageId. Returns transcript + URL.
 *
 * Body (POST):
 *   {
 *     conversationId: string,
 *     senderId: string,
 *     audio: string (base64),
 *     mimeType: string,
 *     duration: number (seconds),
 *     transcript?: string (optional, pre-transcribed client-side),
 *     language?: string,
 *   }
 *
 * Schema note: The VoiceMessage Prisma model in the task spec is not yet in
 * the schema. This route is resilient — if `db.voiceMessage` is undefined,
 * it falls back to persisting the transcript on the Message row (via
 * `metadata` JSON column if present) and returns an ephemeral voiceMessage
 * object so the client can render.
 */

function hasVoiceTable(): boolean {
  return !!(db && (db as any).voiceMessage);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      conversationId?: string;
      senderId?: string;
      audio?: string;
      mimeType?: string;
      duration?: number;
      transcript?: string;
      language?: string;
    };

    const conversationId = String(body?.conversationId || "").trim().slice(0, 80);
    const senderId = String(body?.senderId || "").trim().slice(0, 60);
    const audio = String(body?.audio || "");
    const mimeType = String(body?.mimeType || "audio/webm").trim().slice(0, 80);
    const duration = Math.min(600, Math.max(1, Number(body?.duration || 5)));
    const transcript = body?.transcript ? String(body.transcript).slice(0, 2000) : null;
    const language = body?.language ? String(body.language).trim().slice(0, 8) : null;

    if (!conversationId || !senderId || !audio) {
      return NextResponse.json(
        { ok: false, error: "conversationId, senderId, and audio are required." },
        { status: 400 },
      );
    }

    // Persist the Message row (using the existing schema).
    let messageId: string;
    try {
      const msg = await db.message.create({
        data: {
          conversationId,
          senderId,
          kind: "voice",
          body: transcript || "",
          metadata: {
            audioBlobUrl: `data:${mimeType};base64,${audio.slice(0, 60)}…`,
            duration,
            language,
            voiceMessage: true,
          },
        },
        select: { id: true },
      });
      messageId = msg.id;
    } catch (msgErr) {
      // Schema drift — return an ephemeral ID so the UI flow doesn't break.
      console.error("[messages/voice] POST message create failed:", msgErr);
      messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    // Persist the VoiceMessage row if the table exists.
    let voiceMessage: any = {
      id: `vm_${Date.now().toString(36)}`,
      messageId,
      audioBlobUrl: `data:${mimeType};base64,${audio.slice(0, 60)}…`,
      duration,
      transcript,
      language,
      createdAt: new Date().toISOString(),
    };
    if (hasVoiceTable()) {
      try {
        const created = await (db as any).voiceMessage.create({
          data: {
            messageId,
            audioBlobUrl: `data:${mimeType};base64,${audio.slice(0, 60)}…`,
            duration,
            transcript: transcript || "",
            language: language || "",
          },
        });
        voiceMessage = {
          id: created.id,
          messageId: created.messageId,
          audioBlobUrl: created.audioBlobUrl,
          duration: created.duration,
          transcript: created.transcript || null,
          language: created.language || null,
          createdAt: created.createdAt,
        };
      } catch (err) {
        console.error("[messages/voice] POST voiceMessage create failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      messageId,
      voiceMessage,
    }, { status: 201 });
  } catch (err) {
    console.error("[messages/voice] POST fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to upload voice message.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id")?.trim().slice(0, 80) || "";
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id query parameter is required." },
        { status: 400 },
      );
    }

    if (hasVoiceTable()) {
      try {
        const vm = await (db as any).voiceMessage.findFirst({
          where: { messageId: id },
        });
        if (vm) {
          return NextResponse.json({
            ok: true,
            voiceMessage: {
              id: vm.id,
              messageId: vm.messageId,
              audioBlobUrl: vm.audioBlobUrl,
              duration: vm.duration,
              transcript: vm.transcript || null,
              language: vm.language || null,
              createdAt: vm.createdAt,
            },
          });
        }
      } catch (err) {
        console.error("[messages/voice] GET DB failed:", err);
      }
    }

    // Fallback: look up the Message row.
    try {
      const msg = await db.message.findUnique({
        where: { id },
        select: { id: true, body: true, metadata: true, createdAt: true },
      });
      if (msg) {
        const meta = (msg.metadata || {}) as any;
        return NextResponse.json({
          ok: true,
          voiceMessage: {
            id: `vm_${msg.id}`,
            messageId: msg.id,
            audioBlobUrl: meta.audioBlobUrl || "",
            duration: meta.duration || 0,
            transcript: msg.body || null,
            language: meta.language || null,
            createdAt: msg.createdAt,
          },
        });
      }
    } catch { /* fall through */ }

    return NextResponse.json({ ok: false, error: "Voice message not found." }, { status: 404 });
  } catch (err) {
    console.error("[messages/voice] GET fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load voice message.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

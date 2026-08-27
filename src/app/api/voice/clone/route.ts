// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cloneVoiceServer } from "@/lib/voice-cloning";

/**
 * /api/voice/clone
 * ----------------
 *   POST — accept a 30-second voice sample (base64), persist a VoiceClone row,
 *          and return the assigned voiceId. The actual cloning runs through
 *          `cloneVoiceServer()` which is a MOCK (see voice-cloning.ts for
 *          the production outline using ElevenLabs / Coqui / PlayHT).
 *   GET  — fetch the current user's voice clone status. Query: ?userId=…
 *
 * Body (POST):
 *   {
 *     userId: string,
 *     audio: string (base64),
 *     mimeType: string,
 *     duration?: number,
 *     name?: string
 *   }
 */
function hasVoiceCloneTable(): boolean {
  return !!(db && (db as any).voiceClone);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      audio?: string;
      mimeType?: string;
      duration?: number;
      name?: string;
    };

    const userId = String(body?.userId || "").trim().slice(0, 60);
    const audio = String(body?.audio || "");
    const mimeType = String(body?.mimeType || "audio/webm").trim().slice(0, 80);
    const duration = Math.min(120, Math.max(1, Number(body?.duration || 30)));
    const name = body?.name ? String(body.name).trim().slice(0, 80) : undefined;

    if (!userId || !audio) {
      return NextResponse.json(
        { ok: false, error: "userId and audio (base64) are required." },
        { status: 400 },
      );
    }
    if (audio.length < 1024) {
      return NextResponse.json(
        { ok: false, error: "Voice sample too short — please record at least 10 seconds." },
        { status: 400 },
      );
    }
    // Cap at ~2 MB.
    if (audio.length > 3_000_000) {
      return NextResponse.json(
        { ok: false, error: "Voice sample exceeds 2 MB. Please record a shorter clip." },
        { status: 413 },
      );
    }

    // Run the (mock) voice cloning.
    const result = await cloneVoiceServer(userId, audio, mimeType, { duration, name });

    // Persist (best-effort).
    if (hasVoiceCloneTable()) {
      try {
        const existing = await (db as any).voiceClone.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        if (existing) {
          // Re-train: update the existing record.
          const updated = await (db as any).voiceClone.update({
            where: { id: existing.id },
            data: {
              voiceId: result.voiceId,
              sampleUrl: result.sampleUrl,
              status: result.status,
            },
          });
          return NextResponse.json({
            ok: true,
            voiceId: updated.voiceId,
            status: updated.status,
            sampleUrl: updated.sampleUrl,
            id: updated.id,
          }, { status: 201 });
        }
        const created = await (db as any).voiceClone.create({
          data: {
            userId,
            voiceId: result.voiceId,
            sampleUrl: result.sampleUrl,
            status: result.status,
          },
        });
        return NextResponse.json({
          ok: true,
          voiceId: created.voiceId,
          status: created.status,
          sampleUrl: created.sampleUrl,
          id: created.id,
        }, { status: 201 });
      } catch (err) {
        console.error("[voice/clone] POST DB persist failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      voiceId: result.voiceId,
      status: result.status,
      sampleUrl: result.sampleUrl,
      _warn: hasVoiceCloneTable()
        ? undefined
        : "VoiceClone table not initialized — voice ID is ephemeral. Run `bun run db:push` after adding the model.",
    }, { status: 201 });
  } catch (err) {
    console.error("[voice/clone] POST fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to clone voice.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId")?.trim().slice(0, 60) || "";
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "userId query parameter is required." },
        { status: 400 },
      );
    }

    if (hasVoiceCloneTable()) {
      try {
        const vc = await (db as any).voiceClone.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        if (vc) {
          return NextResponse.json({
            ok: true,
            voiceClone: {
              id: vc.id,
              userId: vc.userId,
              voiceId: vc.voiceId,
              sampleUrl: vc.sampleUrl,
              status: vc.status,
              createdAt: vc.createdAt,
            },
          });
        }
      } catch (err) {
        console.error("[voice/clone] GET DB failed:", err);
      }
    }
    return NextResponse.json({ ok: true, voiceClone: null });
  } catch (err) {
    console.error("[voice/clone] GET fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch voice clone status.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

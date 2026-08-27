// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMeetingNotes, type TranscriptSegment } from "@/lib/meeting-notes";

/**
 * /api/calls/[id]/notes
 * ---------------------
 *   GET  — load the saved meeting notes for a call (or null if not yet
 *          generated). The caller should fall back to a "Generate notes"
 *          button.
 *   POST — (re)generate notes from the call's transcript. Body:
 *     {
 *       transcript?: TranscriptSegment[],  // optional; falls back to mock
 *       participants?: {id, displayName}[],
 *       callDuration?: number,             // seconds
 *       force?: boolean                    // force regeneration even if cached
 *     }
 *
 * The notes are stored in the `CallMeetingNotes` Prisma model. If the model
 * doesn't exist yet, the route returns the notes ephemerally (no persistence)
 * with a `_warn` so the caller knows they won't survive a server restart.
 *
 * Returns:
 *   200 { ok: true, notes: MeetingNotes }
 *   404 { ok: false, error: "Call not found." }
 *   500 { ok: false, error, message }
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

function hasNotesTable(): boolean {
  return !!(db && (db as any).callMeetingNotes);
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id: callId } = await ctx.params;
    if (!callId) {
      return NextResponse.json({ ok: false, error: "call id is required." }, { status: 400 });
    }

    // Confirm the call exists (best-effort — schema may not have conversationId).
    try {
      const call = await db.callSession.findUnique({
        where: { id: callId },
        select: { id: true, type: true, status: true, startedAt: true, endedAt: true },
      });
      if (!call) {
        return NextResponse.json({ ok: false, error: "Call not found." }, { status: 404 });
      }
    } catch {
      // Schema drift — continue with an empty state.
    }

    if (hasNotesTable()) {
      try {
        const notes = await (db as any).callMeetingNotes.findFirst({
          where: { callId },
          orderBy: { generatedAt: "desc" },
        });
        if (notes) {
          return NextResponse.json({
            ok: true,
            notes: {
              id: notes.id,
              callId: notes.callId,
              summary: notes.summary,
              actionItems: safeParseJSON(notes.actionItems, []),
              decisions: safeParseJSON(notes.decisions, []),
              participants: safeParseJSON(notes.participants, []),
              generatedAt: notes.generatedAt,
            },
          });
        }
      } catch (err) {
        console.error("[calls/[id]/notes] GET DB failed:", err);
      }
    }

    return NextResponse.json({ ok: true, notes: null });
  } catch (err) {
    console.error("[calls/[id]/notes] GET fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load notes.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id: callId } = await ctx.params;
    if (!callId) {
      return NextResponse.json({ ok: false, error: "call id is required." }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      transcript?: TranscriptSegment[];
      participants?: { id: string; displayName: string; spokeCount?: number }[];
      callDuration?: number;
      force?: boolean;
    };

    // Load existing notes (unless force=true).
    if (hasNotesTable() && !body?.force) {
      try {
        const existing = await (db as any).callMeetingNotes.findFirst({
          where: { callId },
          orderBy: { generatedAt: "desc" },
        });
        if (existing) {
          return NextResponse.json({
            ok: true,
            notes: {
              id: existing.id,
              callId: existing.callId,
              summary: existing.summary,
              actionItems: safeParseJSON(existing.actionItems, []),
              decisions: safeParseJSON(existing.decisions, []),
              participants: safeParseJSON(existing.participants, []),
              generatedAt: existing.generatedAt,
            },
          });
        }
      } catch { /* fall through to regeneration */ }
    }

    // Build a default transcript if the caller didn't provide one.
    const transcript: TranscriptSegment[] = body?.transcript && body.transcript.length > 0
      ? body.transcript
      : [
          { speaker: "Caller", text: "Hi, are you ready to discuss the proposal?" },
          { speaker: "Callee", text: "Yes — let's go over the timeline." },
          { speaker: "Caller", text: "We agreed to ship by next Friday. I'll send the contract today." },
          { speaker: "Callee", text: "Sounds good. I'll review it tonight." },
        ];

    const notes = await generateMeetingNotes({
      callId,
      transcript,
      participants: body?.participants,
      callDuration: body?.callDuration,
    });

    // Persist (best-effort).
    if (hasNotesTable()) {
      try {
        const created = await (db as any).callMeetingNotes.create({
          data: {
            callId,
            summary: notes.summary,
            actionItems: JSON.stringify(notes.actionItems),
            decisions: JSON.stringify(notes.decisions),
            participants: JSON.stringify(notes.participants),
          },
        });
        return NextResponse.json({
          ok: true,
          notes: { ...notes, id: created.id, callId },
        });
      } catch (err) {
        console.error("[calls/[id]/notes] POST DB persist failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      notes,
      _warn: hasNotesTable()
        ? undefined
        : "CallMeetingNotes table not initialized — notes are ephemeral. Run `bun run db:push` after adding the model to schema.prisma.",
    });
  } catch (err) {
    console.error("[calls/[id]/notes] POST fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to generate notes.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

function safeParseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

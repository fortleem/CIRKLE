// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordCircleAudit } from "@/lib/circle-audit";

/**
 * POST /api/circles/[id]/events/[eventId]/rsvp
 * Body: { user, status }
 *   status: "going" | "maybe" | "not_going"
 *
 * Upserts the caller's RSVP for the event. Returns the new RSVP state
 * + the updated counts.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  try {
    const { id, eventId } = await params;
    if (!id || !eventId) {
      return NextResponse.json({ error: "id and eventId are required" }, { status: 400 });
    }

    const event = await db.circleEvent.findUnique({ where: { id: eventId } });
    if (!event || event.circleId !== id) {
      return NextResponse.json({ error: "event not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as {
      user?: string;
      status?: string;
    } | null;

    const user = (body?.user ?? "").trim().toLowerCase().replace(/^@/, "");
    if (!user) {
      return NextResponse.json({ error: "user is required" }, { status: 400 });
    }
    const valid = ["going", "maybe", "not_going"];
    const status = body?.status && valid.includes(body.status) ? body.status : "going";

    // Upsert the RSVP — circle membership is NOT required to RSVP (so
    // public-circle non-members can express interest), but we still
    // record the userLabel for analytics.
    await db.eventRSVP.upsert({
      where: { eventId_userLabel: { eventId, userLabel: user } },
      create: { eventId, userLabel: user, status },
      update: { status },
    });

    const rsvps = await db.eventRSVP.findMany({ where: { eventId } });
    const counts = { going: 0, maybe: 0, not_going: 0 };
    for (const r of rsvps) {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    }

    return NextResponse.json(
      { status, myRsvp: status, rsvpCounts: counts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    logger.error("[/api/circles/[id]/events/[eventId]/rsvp POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to record RSVP" },
      { status: 500 },
    );
  }
}

// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordCircleAudit } from "@/lib/circle-audit";

/**
 * GET /api/circles/[id]/events?from=ISO&to=ISO
 * Returns all events for the circle, optionally bounded by a date range.
 *
 * Response shape (each event):
 *   { id, title, description, location, startsAt, endsAt,
 *     createdBy, rsvpCounts: { going, maybe, not_going },
 *     myRsvp: "going"|"maybe"|"not_going"|null }
 *
 * The `myRsvp` field requires a `?user=<handle>` query param.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const circle = await db.circleGroup.findUnique({ where: { id }, select: { id: true } });
    if (!circle) return NextResponse.json({ error: "circle not found" }, { status: 404 });

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const user = req.nextUrl.searchParams.get("user")?.trim().toLowerCase().replace(/^@/, "") || null;

    const where: any = { circleId: id };
    if (from || to) {
      where.startsAt = {};
      if (from) where.startsAt.gte = new Date(from);
      if (to) where.startsAt.lte = new Date(to);
    }

    const events = await db.circleEvent.findMany({
      where,
      orderBy: { startsAt: "asc" },
      include: { rsvps: true },
    });

    const out = events.map((e) => {
      const counts = { going: 0, maybe: 0, not_going: 0 };
      let myRsvp: string | null = null;
      for (const r of e.rsvps) {
        if (counts[r.status] !== undefined) counts[r.status] += 1;
        if (user && r.userLabel === user) myRsvp = r.status;
      }
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt ? e.endsAt.toISOString() : null,
        createdBy: e.createdBy,
        rsvpCounts: counts,
        myRsvp,
      };
    });

    return NextResponse.json({ events: out }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error("[/api/circles/[id]/events GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load events" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/circles/[id]/events
 * Body: { title, description?, location?, startsAt, endsAt?, createdBy }
 *
 * Creates a new CircleEvent and records an audit log entry. The creator
 * must be a member of the circle with `membersCanCreateEvents` permission
 * (or be an owner/admin/moderator).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const circle = await db.circleGroup.findUnique({ where: { id } });
    if (!circle) return NextResponse.json({ error: "circle not found" }, { status: 404 });

    const body = (await req.json().catch(() => null)) as {
      title?: string;
      description?: string;
      location?: string;
      startsAt?: string;
      endsAt?: string;
      createdBy?: string;
    } | null;

    const title = (body?.title ?? "").trim();
    if (title.length < 2 || title.length > 140) {
      return NextResponse.json({ error: "title must be 2-140 chars" }, { status: 400 });
    }
    const createdBy = (body?.createdBy ?? "u_current").trim().toLowerCase().replace(/^@/, "");
    if (!createdBy) {
      return NextResponse.json({ error: "createdBy is required" }, { status: 400 });
    }
    if (!body?.startsAt) {
      return NextResponse.json({ error: "startsAt is required" }, { status: 400 });
    }
    const startsAt = new Date(body.startsAt);
    if (!isFinite(startsAt.getTime())) {
      return NextResponse.json({ error: "startsAt is invalid" }, { status: 400 });
    }
    let endsAt: Date | null = null;
    if (body?.endsAt) {
      endsAt = new Date(body.endsAt);
      if (!isFinite(endsAt.getTime())) {
        return NextResponse.json({ error: "endsAt is invalid" }, { status: 400 });
      }
      if (endsAt <= startsAt) {
        return NextResponse.json({ error: "endsAt must be after startsAt" }, { status: 400 });
      }
    }

    // Permission check: owner/admin/moderator always allowed; members
    // only when `membersCanCreateEvents` flag is set.
    const flags = circle.settings.split(/\s+/).filter(Boolean);
    const membersCanCreateEvents = flags.includes("membersCanCreateEvents");
    const membership = await db.circleMember.findUnique({
      where: { circleId_userLabel: { circleId: id, userLabel: createdBy } },
    });
    if (!membership) {
      return NextResponse.json({ error: "you are not a member of this circle" }, { status: 403 });
    }
    const privileged = membership.role === "owner" || membership.role === "admin" || membership.role === "moderator";
    if (!privileged && !membersCanCreateEvents) {
      return NextResponse.json(
        { error: "members are not allowed to create events in this circle" },
        { status: 403 },
      );
    }

    const created = await db.circleEvent.create({
      data: {
        circleId: id,
        createdBy,
        title,
        description: (body?.description ?? "").trim().slice(0, 600),
        location: body?.location?.trim().slice(0, 140) || null,
        startsAt,
        endsAt,
      },
    });

    await recordCircleAudit({
      circleId: id,
      action: "event_created",
      actor: createdBy,
      target: null,
      summary: `Event "${title}" scheduled for ${startsAt.toISOString()}`,
    });

    return NextResponse.json(
      {
        id: created.id,
        title: created.title,
        description: created.description,
        location: created.location,
        startsAt: created.startsAt.toISOString(),
        endsAt: created.endsAt?.toISOString() ?? null,
        createdBy: created.createdBy,
        rsvpCounts: { going: 0, maybe: 0, not_going: 0 },
        myRsvp: null,
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error("[/api/circles/[id]/events POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create event" },
      { status: 500 },
    );
  }
}

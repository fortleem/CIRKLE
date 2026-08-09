// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CIRCLE_GROUPS } from "@/lib/circle/mock-data";

/**
 * GET /api/circles
 *   ?owner=<handle>     → list circles owned by <handle>
 *   ?member=<handle>    → list circles <handle> belongs to
 *   (default)            → list ALL circles (legacy mock dataset merged
 *                         with DB-backed circles) so the discovery feed
 *                         still has seed content while real Circles
 *                         are being created.
 *
 * Each circle row is enriched with:
 *   • memberCount  — current roster size
 *   • lastActivity — ISO timestamp of the most recent post in that
 *                    Circle's `circle` module feed (null when no posts)
 *
 * The legacy mock dataset (CIRCLE_GROUPS from circle/mock-data.ts) is
 * returned alongside DB-backed circles so existing UIs keep working
 * during the migration. Mock rows are tagged `mock: true` so the
 * detail view can hide admin actions on them.
 */
export async function GET(req: NextRequest) {
  try {
    const owner = req.nextUrl.searchParams.get("owner")?.trim().toLowerCase().replace(/^@/, "");
    const member = req.nextUrl.searchParams.get("member")?.trim().toLowerCase().replace(/^@/, "");

    const where: any = {};
    if (owner) where.ownerLabel = owner;
    if (member) where.members = { some: { userLabel: member } };

    const dbCircles = await db.circleGroup.findMany({
      where,
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Enrich with member count + last activity (best-effort — fail
    // open with null when the lookup throws so the list still renders).
    const enriched = await Promise.all(
      dbCircles.map(async (c) => {
        let lastActivity: string | null = null;
        try {
          const last = await db.post.findFirst({
            where: { module: "circle", visibility: "circle" },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          });
          if (last) lastActivity = last.createdAt.toISOString();
        } catch {
          /* ignore — fail open */
        }
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          mode: c.mode,
          category: c.category,
          avatarColor: c.avatarColor,
          avatarInitials: c.avatarInitials,
          encrypted: c.encrypted,
          role: "owner", // GET endpoint default — refine when caller passes their handle
          members: c._count.members,
          online: 0,
          upcomingEvent: undefined,
          unread: 0,
          ownerLabel: c.ownerLabel,
          settings: c.settings,
          lastActivity,
          createdAt: c.createdAt.toISOString(),
          mock: false,
        };
      }),
    );

    // Merge with mock dataset (kept for backward-compat with discovery).
    const mockRows = CIRCLE_GROUPS.map((g) => ({ ...g, mock: true, lastActivity: null }));
    const merged = [...enriched, ...mockRows];

    return NextResponse.json(merged, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    logger.error("[/api/circles GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load circles" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/circles
 * Body: {
 *   name, description, mode, category,
 *   avatarColor, avatarInitials, ownerLabel,
 *   settings,           // space-separated flags
 *   invitees: [{ handle, role }]
 * }
 *
 * Creates a CircleGroup row + CircleMember rows for the owner (role
 * "owner") and every invitee (role from the request, default "member").
 * Invitee handles that don't have a User row yet are still added —
 * they'll claim their membership when they sign up with that handle.
 *
 * Returns the created circle (enriched with memberCount + lastActivity).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      name?: string;
      description?: string;
      mode?: string;
      category?: string;
      avatarColor?: string;
      avatarInitials?: string;
      ownerLabel?: string;
      settings?: string;
      invitees?: { handle: string; role?: string }[];
    } | null;

    const name = (body?.name ?? "").trim();
    if (name.length < 2 || name.length > 60) {
      return NextResponse.json(
        { error: "name must be 2-60 characters" },
        { status: 400 },
      );
    }
    const ownerLabel = (body?.ownerLabel ?? "u_current").trim().toLowerCase().replace(/^@/, "");
    if (!ownerLabel) {
      return NextResponse.json({ error: "ownerLabel is required" }, { status: 400 });
    }

    const validModes = ["private", "public", "anonymous"];
    const mode = body?.mode && validModes.includes(body.mode) ? body.mode : "private";
    const validCategories = ["Social", "Professional", "Hobby", "Community", "Study", "Sports"];
    const category =
      body?.category && validCategories.includes(body.category) ? body.category : "Social";

    // Compose the settings flag string. We accept either an already-
    // composed string OR an array of booleans from the client — but
    // the client (circle-create.tsx) sends a space-separated string.
    const settings = body?.settings ?? "joinApprovalRequired membersCanPost membersCanShareMedia";

    const avatarColor = body?.avatarColor ?? "teal";
    const avatarInitials = body?.avatarInitials ?? name.slice(0, 2).toUpperCase();

    // Create the circle + owner membership in one transaction.
    const created = await db.$transaction(async (tx) => {
      const circle = await tx.circleGroup.create({
        data: {
          name,
          description: (body?.description ?? "").trim().slice(0, 280),
          mode,
          category,
          avatarColor,
          avatarInitials,
          encrypted: mode === "private",
          ownerLabel,
          settings,
        },
      });

      // Owner row — role="owner".
      await tx.circleMember.create({
        data: { circleId: circle.id, userLabel: ownerLabel, role: "owner" },
      });

      // Invitee rows — dedup against the owner.
      const invitees = (body?.invitees ?? [])
        .map((i) => ({
          handle: (i.handle || "").trim().toLowerCase().replace(/^@/, ""),
          role: i.role || "member",
        }))
        .filter((i) => i.handle && i.handle !== ownerLabel);

      const validRoles = ["admin", "moderator", "member"];
      const seen = new Set<string>([ownerLabel]);
      for (const inv of invitees) {
        if (seen.has(inv.handle)) continue;
        seen.add(inv.handle);
        await tx.circleMember.create({
          data: {
            circleId: circle.id,
            userLabel: inv.handle,
            role: validRoles.includes(inv.role) ? inv.role : "member",
          },
        });
      }

      return circle;
    });

    // Re-fetch with member count + lastActivity for the response.
    const enriched = await db.circleGroup.findUnique({
      where: { id: created.id },
      include: { _count: { select: { members: true } } },
    });

    return NextResponse.json(
      {
        id: enriched!.id,
        name: enriched!.name,
        description: enriched!.description,
        mode: enriched!.mode,
        category: enriched!.category,
        avatarColor: enriched!.avatarColor,
        avatarInitials: enriched!.avatarInitials,
        encrypted: enriched!.encrypted,
        role: "owner",
        members: enriched!._count.members,
        online: 0,
        ownerLabel: enriched!.ownerLabel,
        settings: enriched!.settings,
        lastActivity: null,
        createdAt: enriched!.createdAt.toISOString(),
        mock: false,
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error("[/api/circles POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create circle" },
      { status: 500 },
    );
  }
}

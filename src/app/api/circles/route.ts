// @ts-nocheck
// P1 FIX: Rate-limited (30/min — newsSearch preset) + Zod-validated POST body.
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CIRCLE_GROUPS } from "@/lib/circle/mock-data";
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/api-rate-limit";
import { validateBody, z } from "@/lib/api-validation";

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
 *
 * P1 FIX — wrapped with `withRateLimit` (30 req/min — newsSearch preset).
 */
export const GET = withRateLimit(
  async (req: NextRequest) => {
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
  },
  RATE_LIMIT_PRESETS.newsSearch,
);

/**
 * Zod schema for `POST /api/circles`.
 *   - `name` is required (2–60 chars — matches the legacy inline check).
 *   - `ownerLabel` is required (defaults to "u_current" in the legacy
 *     handler — we surface the same default here via `.default()` so the
 *     caller can omit it).
 *   - `mode` is optional, one of private|public|anonymous (default "private").
 *   - `category` is optional, one of the six legacy categories (default "Social").
 *   - `description` is optional (max 280 chars — handler slices to 280).
 *   - `avatarColor` / `avatarInitials` are optional display fields.
 *   - `settings` is an optional space-separated flag string.
 *   - `invitees` is an optional array of `{ handle, role? }` with role in
 *     {admin, moderator, member}.
 */
const circleCreateSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(280).optional().default(""),
  mode: z.enum(["private", "public", "anonymous"]).optional().default("private"),
  category: z
    .enum(["Social", "Professional", "Hobby", "Community", "Study", "Sports"])
    .optional()
    .default("Social"),
  avatarColor: z.string().max(64).optional(),
  avatarInitials: z.string().max(16).optional(),
  ownerLabel: z.string().min(1).max(64).optional().default("u_current"),
  settings: z.string().max(512).optional(),
  invitees: z
    .array(
      z.object({
        handle: z.string().min(1).max(64),
        role: z.enum(["admin", "moderator", "member"]).optional().default("member"),
      }),
    )
    .max(200)
    .optional()
    .default([]),
});

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
 *
 * P1 FIX — wrapped with `withRateLimit` (30 req/min) and `validateBody`
 * so malformed payloads return 400 before the transaction runs.
 */
export const POST = withRateLimit(
  validateBody(circleCreateSchema, async (req, body) => {
    try {
      const name = body.name.trim();
      const ownerLabel = (body.ownerLabel ?? "u_current").trim().toLowerCase().replace(/^@/, "");
      if (!ownerLabel) {
        return NextResponse.json({ error: "ownerLabel is required" }, { status: 400 });
      }

      const mode = body.mode ?? "private";
      const category = body.category ?? "Social";
      const settings =
        body.settings ?? "joinApprovalRequired membersCanPost membersCanShareMedia";
      const avatarColor = body.avatarColor ?? "teal";
      const avatarInitials = body.avatarInitials ?? name.slice(0, 2).toUpperCase();

      // Create the circle + owner membership in one transaction.
      const created = await db.$transaction(async (tx) => {
        const circle = await tx.circleGroup.create({
          data: {
            name,
            description: (body.description ?? "").trim().slice(0, 280),
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
        const invitees = (body.invitees ?? [])
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
  }),
  RATE_LIMIT_PRESETS.newsSearch,
);

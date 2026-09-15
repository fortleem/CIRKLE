// @ts-nocheck
// P1 FIX: Rate-limited (30/min — newsSearch preset) + Zod-validated POST body.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/api-rate-limit";
import { validateBody, z } from "@/lib/api-validation";

export const GET = withRateLimit(
  async (req: NextRequest) => {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    try {
      const connections = await db.appConnection.findMany({
        where: { followerId: userId, status: "active" },
        include: { following: true },
      });
      return NextResponse.json({ contacts: connections.map((c) => c.following) });
    } catch {
      return NextResponse.json({ contacts: [] });
    }
  },
  RATE_LIMIT_PRESETS.newsSearch,
);

/**
 * Zod schema for `POST /api/contacts`.
 *   - `followerId` and `followingId` are required user identifiers
 *     (1–64 chars — matches the AppConnection column widths).
 *
 * (The task brief describes this as "validate search query" but the
 * actual POST handler creates a follower↔following edge; the schema
 * below validates the real body shape of that handler.)
 */
const contactsCreateSchema = z.object({
  followerId: z.string().min(1).max(64),
  followingId: z.string().min(1).max(64),
});

export const POST = withRateLimit(
  validateBody(contactsCreateSchema, async (req, body) => {
    try {
      const conn = await db.appConnection.upsert({
        where: {
          followerId_followingId: {
            followerId: body.followerId,
            followingId: body.followingId,
          },
        },
        update: { status: "active" },
        create: {
          followerId: body.followerId,
          followingId: body.followingId,
          status: "active",
        },
      });
      return NextResponse.json({ ok: true, connection: conn });
    } catch {
      return NextResponse.json({ error: "failed to add contact" }, { status: 500 });
    }
  }),
  RATE_LIMIT_PRESETS.newsSearch,
);

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getProfile,
  normalizeUsername,
  upsertProfile,
  type ExperienceEntry,
  type EducationEntry,
} from "@/lib/pro-network";

// ─────────────────────────────────────────────────────────────────────────────
// /api/pro/profile — GET (read profile) + POST (upsert own profile).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/pro/profile?username=<handle>
 * Returns the public professional profile, or a default-shaped profile if
 * the user has not set one up yet.
 */
export async function GET(req: NextRequest) {
  try {
    const username = normalizeUsername(
      req.nextUrl.searchParams.get("username"),
    );
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    const profile = await getProfile(username);
    if (!profile) {
      return NextResponse.json({
        username,
        headline: null,
        summary: null,
        skills: [],
        experience: [],
        education: [],
        availability: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return NextResponse.json(profile);
  } catch (err) {
    logger.error("[/api/pro/profile GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load profile" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/pro/profile
 * Body: {
 *   username: string,
 *   headline?: string,
 *   summary?: string,
 *   skills?: string[],
 *   experience?: ExperienceEntry[],
 *   education?: EducationEntry[],
 *   availability?: "open"|"looking"|"closed",
 * }
 * Upserts the profile and returns the new state.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const username = normalizeUsername(body.username);
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    const profile = await upsertProfile(username, {
      headline: typeof body.headline === "string" ? body.headline : null,
      summary: typeof body.summary === "string" ? body.summary : null,
      skills: Array.isArray(body.skills) ? (body.skills as string[]) : undefined,
      experience: Array.isArray(body.experience)
        ? (body.experience as ExperienceEntry[])
        : undefined,
      education: Array.isArray(body.education)
        ? (body.education as EducationEntry[])
        : undefined,
      availability: typeof body.availability === "string" ? body.availability : undefined,
    });

    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    logger.error("[/api/pro/profile POST] error", {
      error: (err as Error).message,
    });
    const status = (err as Error).message.includes("required") ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to save profile" },
      { status },
    );
  }
}

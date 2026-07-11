import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  createJob,
  listJobs,
  normalizeUsername,
  VALID_JOB_TYPES,
} from "@/lib/pro-network";

// ─────────────────────────────────────────────────────────────────────────────
// /api/jobs — list (GET) + create (POST) job postings.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/jobs?country=SA&type=full-time&q=engineer&limit=50
 * Returns up to `limit` (default 50, max 200) jobs, newest first.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const country = sp.get("country") || undefined;
    const type = sp.get("type") || undefined;
    const q = sp.get("q") || undefined;
    const limitRaw = sp.get("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

    const jobs = await listJobs({
      country,
      type:
        type && (VALID_JOB_TYPES as readonly string[]).includes(type)
          ? type
          : undefined,
      q,
      limit: isFinite(limit as number) ? limit : undefined,
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    logger.error("[/api/jobs GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list jobs" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/jobs
 * Body: {
 *   title, company, location, country, type,
 *   salaryMin?, salaryMax?, currency?,
 *   description, requirements, postedBy
 * }
 * Creates a new job posting and returns it.
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

    const postedBy = normalizeUsername(body.postedBy);
    if (!postedBy) {
      return NextResponse.json({ error: "postedBy is required" }, { status: 400 });
    }

    const job = await createJob({
      title: String(body.title || ""),
      company: String(body.company || ""),
      location: String(body.location || ""),
      country: String(body.country || ""),
      type: typeof body.type === "string" ? body.type : "full-time",
      salaryMin: typeof body.salaryMin === "number" ? body.salaryMin : null,
      salaryMax: typeof body.salaryMax === "number" ? body.salaryMax : null,
      currency: typeof body.currency === "string" ? body.currency : null,
      description: String(body.description || ""),
      requirements: String(body.requirements || ""),
      postedBy,
    });

    return NextResponse.json({ ok: true, job }, { status: 201 });
  } catch (err) {
    logger.error("[/api/jobs POST] error", {
      error: (err as Error).message,
    });
    const status = (err as Error).message.includes("required") ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create job" },
      { status },
    );
  }
}

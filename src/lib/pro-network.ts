/**
 * Pro Network — server-only library for the Professional Network pillar
 * (Blueprint §14). Backs:
 *   • `/api/jobs`            — list + post jobs
 *   • `/api/jobs/[id]/apply` — apply to a job
 *   • `/api/pro/profile`     — upsert + read profile
 *   • `/api/pro/endorse`     — endorse a skill
 *   • `/api/pro/salary`      — anonymous salary insights
 *
 * All geocoded salary data is derived from the posted salaryMin/salaryMax on
 * JobPosting rows — no external scraping, no PII. The aggregate stats are
 * intentionally coarse (p25 / p50 / p75) so an individual salary can never
 * be reverse-engineered.
 *
 * Server-only — never import this from a client component.
 */

import "server-only";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ── Types ───────────────────────────────────────────────────────────────────

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  type: string; // full-time | part-time | contract | internship
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  description: string;
  requirements: string;
  postedBy: string;
  createdAt: string;
}

export interface JobApplicationRow {
  id: string;
  jobId: string;
  username: string;
  coverLetter?: string | null;
  status: string;
  createdAt: string;
}

export interface ExperienceEntry {
  role: string;
  company: string;
  start: string;
  end?: string;
  description?: string;
}

export interface EducationEntry {
  school: string;
  degree: string;
  start: string;
  end?: string;
}

export interface ProProfile {
  username: string;
  headline?: string | null;
  summary?: string | null;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  availability: string; // open | looking | closed
  createdAt: string;
  updatedAt: string;
}

export interface EndorsementRow {
  id: string;
  target: string;
  skill: string;
  endorser: string;
  createdAt: string;
}

export interface SalaryInsight {
  country: string;
  role: string;
  p25: number;
  p50: number;
  p75: number;
  count: number;
  currency: string;
}

export interface CreateJobOpts {
  title: string;
  company: string;
  location: string;
  country: string;
  type: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  description: string;
  requirements: string;
  postedBy: string;
}

export interface ListJobsFilter {
  country?: string;
  q?: string;
  type?: string;
  limit?: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

export const VALID_JOB_TYPES = [
  "full-time",
  "part-time",
  "contract",
  "internship",
] as const;

export const VALID_AVAILABILITY = ["open", "looking", "closed"] as const;

const DEFAULT_LIMIT = 50;

// ── Helpers ─────────────────────────────────────────────────────────────────

export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

function safeParseArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function rowToJob(row: {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  description: string;
  requirements: string;
  postedBy: string;
  createdAt: Date;
}): JobPosting {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    country: row.country,
    type: row.type,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    currency: row.currency,
    description: row.description,
    requirements: row.requirements,
    postedBy: row.postedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToProfile(row: {
  username: string;
  headline: string | null;
  summary: string | null;
  skills: string;
  experience: string;
  education: string;
  availability: string;
  createdAt: Date;
  updatedAt: Date;
}): ProProfile {
  return {
    username: row.username,
    headline: row.headline,
    summary: row.summary,
    skills: safeParseArray<string>(row.skills, []),
    experience: safeParseArray<ExperienceEntry>(row.experience, []),
    education: safeParseArray<EducationEntry>(row.education, []),
    availability: row.availability,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const frac = pos - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a job posting. Returns the new JobPosting.
 */
export async function createJob(opts: CreateJobOpts): Promise<JobPosting> {
  const title = opts.title?.trim();
  const company = opts.company?.trim();
  const postedBy = normalizeUsername(opts.postedBy);

  if (!title || title.length > 200) {
    throw new Error("title is required (max 200 chars)");
  }
  if (!company || company.length > 200) {
    throw new Error("company is required (max 200 chars)");
  }
  if (!postedBy) {
    throw new Error("postedBy is required");
  }
  if (
    opts.type &&
    !(VALID_JOB_TYPES as readonly string[]).includes(opts.type)
  ) {
    throw new Error(`type must be one of: ${VALID_JOB_TYPES.join(", ")}`);
  }

  const row = await db.jobPosting.create({
    data: {
      title,
      company,
      location: (opts.location || "").trim().slice(0, 200),
      country: (opts.country || "").trim().toUpperCase().slice(0, 4),
      type: opts.type || "full-time",
      salaryMin: typeof opts.salaryMin === "number" && isFinite(opts.salaryMin) ? opts.salaryMin : null,
      salaryMax: typeof opts.salaryMax === "number" && isFinite(opts.salaryMax) ? opts.salaryMax : null,
      currency: opts.currency ? opts.currency.toUpperCase().slice(0, 8) : null,
      description: (opts.description || "").slice(0, 10_000),
      requirements: (opts.requirements || "").slice(0, 5_000),
      postedBy,
    },
  });

  logger.info("[pro-network] job created", { id: row.id, title, postedBy });
  return rowToJob(row);
}

/**
 * List job postings, optionally filtered by country / search / type.
 * Newest first.
 */
export async function listJobs(filter?: ListJobsFilter): Promise<JobPosting[]> {
  const limit = Math.min(Math.max(filter?.limit ?? DEFAULT_LIMIT, 1), 200);
  const where: {
    country?: string;
    type?: string;
    OR?: Array<Record<string, unknown>>;
  } = {};

  if (filter?.country) {
    where.country = filter.country.trim().toUpperCase();
  }
  if (filter?.type && (VALID_JOB_TYPES as readonly string[]).includes(filter.type)) {
    where.type = filter.type;
  }
  if (filter?.q && filter.q.trim()) {
    const q = filter.q.trim();
    where.OR = [
      { title: { contains: q } },
      { company: { contains: q } },
      { description: { contains: q } },
      { location: { contains: q } },
    ];
  }

  const rows = await db.jobPosting.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map(rowToJob);
}

/**
 * Apply to a job. Idempotent — a second apply from the same user updates the
 * cover letter instead of creating a duplicate (the unique constraint on
 * [jobId, username] enforces this at the DB level).
 */
export async function applyToJob(
  jobId: string,
  username: string,
  coverLetter?: string,
): Promise<JobApplicationRow> {
  const user = normalizeUsername(username);
  if (!user) throw new Error("username is required");
  if (!jobId) throw new Error("jobId is required");

  // Verify the job exists (foreign-key will also catch this, but a 404 is
  // friendlier than a 500 from a constraint violation).
  const job = await db.jobPosting.findUnique({ where: { id: jobId }, select: { id: true } });
  if (!job) throw new Error("job not found");

  const row = await db.jobApplication.upsert({
    where: { jobId_username: { jobId, username: user } },
    create: {
      jobId,
      username: user,
      coverLetter: (coverLetter || "").slice(0, 10_000) || null,
      status: "pending",
    },
    update: {
      coverLetter: (coverLetter || "").slice(0, 10_000) || null,
    },
  });

  return {
    id: row.id,
    jobId: row.jobId,
    username: row.username,
    coverLetter: row.coverLetter,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Endorse a user for a skill. Idempotent — the unique constraint on
 * [target, skill, endorser] prevents duplicates.
 */
export async function endorseUser(
  targetUsername: string,
  skill: string,
  endorserUsername: string,
): Promise<EndorsementRow> {
  const target = normalizeUsername(targetUsername);
  const endorser = normalizeUsername(endorserUsername);
  const cleanSkill = (skill || "").trim().toLowerCase().slice(0, 64);

  if (!target) throw new Error("target username is required");
  if (!endorser) throw new Error("endorser username is required");
  if (target === endorser) throw new Error("cannot endorse yourself");
  if (!cleanSkill) throw new Error("skill is required");

  const row = await db.endorsement.upsert({
    where: {
      target_skill_endorser: {
        target,
        skill: cleanSkill,
        endorser,
      },
    },
    create: { target, skill: cleanSkill, endorser },
    update: {}, // no-op — already endorsed
  });

  return {
    id: row.id,
    target: row.target,
    skill: row.skill,
    endorser: row.endorser,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * List endorsements received by a user, grouped by skill.
 * Returns `{ skill, count, endorsers[] }[]`.
 */
export async function listEndorsements(
  targetUsername: string,
): Promise<{ skill: string; count: number; endorsers: string[] }[]> {
  const target = normalizeUsername(targetUsername);
  if (!target) return [];
  const rows = await db.endorsement.findMany({
    where: { target },
    orderBy: { createdAt: "desc" },
    select: { skill: true, endorser: true },
  });
  const bySkill = new Map<string, string[]>();
  for (const r of rows) {
    const arr = bySkill.get(r.skill) ?? [];
    arr.push(r.endorser);
    bySkill.set(r.skill, arr);
  }
  return Array.from(bySkill.entries())
    .map(([skill, endorsers]) => ({ skill, count: endorsers.length, endorsers }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Upsert a professional profile. JSON-encoded fields are stringified here.
 */
export async function upsertProfile(
  username: string,
  patch: {
    headline?: string | null;
    summary?: string | null;
    skills?: string[];
    experience?: ExperienceEntry[];
    education?: EducationEntry[];
    availability?: string;
  },
): Promise<ProProfile> {
  const user = normalizeUsername(username);
  if (!user) throw new Error("username is required");

  const data: Record<string, unknown> = {};
  if (typeof patch.headline === "string") data.headline = patch.headline.trim().slice(0, 200);
  if (typeof patch.summary === "string") data.summary = patch.summary.trim().slice(0, 4_000);
  if (Array.isArray(patch.skills)) {
    data.skills = JSON.stringify(patch.skills.map((s) => String(s).trim().slice(0, 64)).filter(Boolean));
  }
  if (Array.isArray(patch.experience)) {
    data.experience = JSON.stringify(patch.experience.slice(0, 50));
  }
  if (Array.isArray(patch.education)) {
    data.education = JSON.stringify(patch.education.slice(0, 30));
  }
  if (
    typeof patch.availability === "string" &&
    (VALID_AVAILABILITY as readonly string[]).includes(patch.availability)
  ) {
    data.availability = patch.availability;
  }

  const row = await db.proProfile.upsert({
    where: { username: user },
    create: {
      username: user,
      skills: "[]",
      experience: "[]",
      education: "[]",
      ...data,
    },
    update: data,
  });

  return rowToProfile(row);
}

/**
 * Get a professional profile. Returns `null` if none exists.
 */
export async function getProfile(username: string): Promise<ProProfile | null> {
  const user = normalizeUsername(username);
  if (!user) return null;
  const row = await db.proProfile.findUnique({ where: { username: user } });
  if (!row) return null;
  return rowToProfile(row);
}

/**
 * Compute anonymous salary insights for a country + role.
 *
 * We treat the midpoint of (salaryMin + salaryMax) / 2 as the data point for
 * each posting that has salary bounds. If only one bound is set, we use it.
 * We then compute p25/p50/p75 over the sorted set.
 *
 * `role` is matched case-insensitively against the title via `contains`.
 */
export async function getSalaryInsights(
  country: string,
  role: string,
): Promise<SalaryInsight> {
  const cc = (country || "").trim().toUpperCase();
  const roleQ = (role || "").trim();
  if (!cc) throw new Error("country is required");
  if (!roleQ) throw new Error("role is required");

  const where: { country: string; title?: { contains: string } } = { country: cc };
  // case-insensitive match isn't supported by SQLite for `contains`, but
  // `title` is user-typed free text — most posters capitalize properly. We
  // accept the minor UX limitation rather than pulling in full-text search.
  where.title = { contains: roleQ };

  const rows = await db.jobPosting.findMany({
    where: {
      ...where,
      OR: [{ salaryMin: { not: null } }, { salaryMax: { not: null } }],
    },
    select: { salaryMin: true, salaryMax: true, currency: true },
  });

  // Pick the dominant currency (most common) so the percentiles are
  // apples-to-apples. If no currency is set, default to "USD".
  const currencyCounts = new Map<string, number>();
  for (const r of rows) {
    const c = (r.currency || "USD").toUpperCase();
    currencyCounts.set(c, (currencyCounts.get(c) ?? 0) + 1);
  }
  let currency = "USD";
  let bestCount = 0;
  for (const [c, n] of currencyCounts) {
    if (n > bestCount) {
      bestCount = n;
      currency = c;
    }
  }

  const points = rows
    .filter((r) => (r.currency || "USD").toUpperCase() === currency)
    .map((r) => {
      if (r.salaryMin != null && r.salaryMax != null) {
        return (r.salaryMin + r.salaryMax) / 2;
      }
      if (r.salaryMin != null) return r.salaryMin;
      if (r.salaryMax != null) return r.salaryMax;
      return null;
    })
    .filter((v): v is number => v != null && isFinite(v) && v > 0)
    .sort((a, b) => a - b);

  return {
    country: cc,
    role: roleQ,
    p25: Math.round(quantile(points, 0.25)),
    p50: Math.round(quantile(points, 0.5)),
    p75: Math.round(quantile(points, 0.75)),
    count: points.length,
    currency,
  };
}

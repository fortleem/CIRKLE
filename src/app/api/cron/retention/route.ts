// @ts-nocheck
/**
 * CIRKLE — Retention Cron Endpoint (Production Recommendation §3 / §26)
 * ============================================================================
 *
 * GET / POST /api/cron/retention
 *
 * Triggers a best-effort sweep over ephemeral rows whose `expiresAt`
 * has elapsed. Designed to be called by an external cron scheduler
 * (Vercel Cron, systemd, k8s CronJob) at a low-frequency cadence
 * (e.g. every 5–15 minutes).
 *
 * Auth: an optional `Authorization: Bearer <CRON_SECRET>` header. When
 * `CRON_SECRET` is set in the environment, requests without a matching
 * header are rejected with 401. When `CRON_SECRET` is unset (e.g. local
 * dev) the endpoint is open so manual testing is friction-free.
 *
 * Response: 200 `{ success: true, deleted: { messages, stories } }`.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { runRetentionCleanup } from "@/lib/data-retention";

export const dynamic = "force-dynamic";

/**
 * Verify the caller is permitted to invoke the cron. Returns `true`
 * when `CRON_SECRET` is unset (open in dev) or when the request's
 * `Authorization: Bearer` token matches it.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode — no auth required.

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  // Constant-time-ish compare to avoid trivial timing leaks.
  if (token.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return mismatch === 0;
}

async function runCleanup(): Promise<Response> {
  try {
    const result = await runRetentionCleanup();
    logger.info("[/api/cron/retention] sweep complete", result);
    return NextResponse.json({
      success: true,
      deleted: {
        messages: result.messages,
        stories: result.stories,
      },
    });
  } catch (err) {
    logger.error("[/api/cron/retention] sweep failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "retention sweep failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return runCleanup();
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return runCleanup();
}

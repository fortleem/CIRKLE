// @ts-nocheck
/**
 * GET /api/_production-test
 * ============================================================================
 * Dev-only comprehensive production test runner. Executes the full test
 * suite defined in `src/lib/production-tests.ts` (20+ tests covering auth,
 * api, security, data, ui, performance) against the running server and
 * returns a `{ total, passed, failed, results }` payload.
 *
 * In production (`NODE_ENV=production`) the endpoint returns 404 so it is
 * impossible to trigger the test suite from a public deploy — the tests
 * make real HTTP requests back to the server which would amplify load.
 *
 * This endpoint mirrors the existing `/api/_test` route (which runs the
 * 5-test smoke suite) but invokes the larger production-readiness suite.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { runProductionTests } from "@/lib/production-tests";
import { captureMessage } from "@/lib/error-monitoring";

export const dynamic = "force-dynamic";

function baseURL(): string {
  // Prefer the explicit BASE_URL env var (lets us point at staging).
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/+$/, "");
  // Vercel — use the deployment URL.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Local dev.
  return "http://localhost:3000";
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const suite = await runProductionTests(baseURL());
    captureMessage(
      `production tests ran: ${suite.passed}/${suite.total} passed`,
      suite.failed > 0 ? "warning" : "info",
      {
        total: suite.total,
        passed: suite.passed,
        failed: suite.failed,
        durationMs: suite.durationMs,
      },
    );
    return NextResponse.json(suite, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        total: 0,
        passed: 0,
        failed: 0,
        results: [],
        durationMs: 0,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

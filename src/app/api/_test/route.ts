/**
 * GET /api/_test
 * ============================================================================
 * Dev-only smoke-test runner. Executes the 5 critical API tests defined in
 * `src/lib/api-tests.ts` and returns a `{ total, passed, failed, results }`
 * payload suitable for rendering on a production-readiness dashboard.
 *
 * In production (`NODE_ENV=production`) the endpoint returns 404 so it is
 * impossible to trigger the test suite from a public deploy — the tests
 * make real HTTP requests back to the server which would amplify load.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { runApiTests } from "@/lib/api-tests";
import { captureMessage } from "@/lib/error-monitoring";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const suite = await runApiTests();
    captureMessage(
      `api smoke tests ran: ${suite.passed}/${suite.total} passed`,
      suite.failed > 0 ? "warning" : "info",
      { suite },
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
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

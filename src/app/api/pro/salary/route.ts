import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSalaryInsights } from "@/lib/pro-network";

// ─────────────────────────────────────────────────────────────────────────────
// /api/pro/salary — GET anonymous salary insights by country + role.
// Returns { p25, p50, p75, count, currency } derived from posted salaries.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/pro/salary?country=SA&role=engineer
 * Returns percentile bands over posted salaries for the given role+country.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const country = (sp.get("country") || "").trim().toUpperCase();
    const role = (sp.get("role") || "").trim();

    if (!country) {
      return NextResponse.json({ error: "country is required" }, { status: 400 });
    }
    if (!role) {
      return NextResponse.json({ error: "role is required" }, { status: 400 });
    }

    const insight = await getSalaryInsights(country, role);
    return NextResponse.json(insight);
  } catch (err) {
    logger.error("[/api/pro/salary GET] error", {
      error: (err as Error).message,
    });
    const status = (err as Error).message.includes("required") ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to compute insights" },
      { status },
    );
  }
}

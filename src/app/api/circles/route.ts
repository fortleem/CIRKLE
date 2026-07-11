import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { CIRCLE_GROUPS } from "@/lib/circle/mock-data";

/**
 * GET /api/circles
 * Returns all Circle groups (read-only for the demo).
 * Persistence is optional, so we return the mock dataset directly.
 */
export async function GET() {
  try {
    return NextResponse.json(CIRCLE_GROUPS);
  } catch (err) {
    logger.error("[/api/circles] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load circles" },
      { status: 500 },
    );
  }
}

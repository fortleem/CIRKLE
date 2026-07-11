import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { VERIFY_CLAIMS } from "@/lib/circle/mock-data";

/**
 * GET /api/verify/claims
 * Returns the user's Circle Verify attestations.
 */
export async function GET() {
  try {
    return NextResponse.json(VERIFY_CLAIMS);
  } catch (err) {
    logger.error("[/api/verify/claims] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load claims" },
      { status: 500 },
    );
  }
}

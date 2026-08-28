// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getTrustCenterData, type TrustCenterData } from "@/lib/trust-center";
import { logger } from "@/lib/logger";

/**
 * GET /api/trust-center?userId=...
 *
 * Returns the unified security/privacy/identity dashboard payload for the
 * current user.
 *
 * Query params:
 *   - userId  (optional) — User.id or circle handle. When omitted, the
 *                          endpoint returns deterministic mock data so the
 *                          dashboard is demoable in dev mode.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;

    const data: TrustCenterData = await getTrustCenterData(userId);

    return NextResponse.json({
      data,
      // Surfaced so the overlay can show whether it's live or mock data.
      source: userId ? "db" : "mock",
    });
  } catch (err) {
    logger.error("[/api/trust-center] GET error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "failed to load trust center",
        data: null,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/trust-center
 * Body: { action: "revoke_device" | "revoke_session" | "revoke_app", id }
 *
 * Stub action endpoint — currently returns 200 OK without persistence,
 * since CIRKLE does not yet track live sessions in the DB. The overlay
 * treats this as success and updates its UI optimistically.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const id = body?.id as string | undefined;

    if (!action || !id) {
      return NextResponse.json(
        { error: "missing action or id" },
        { status: 400 },
      );
    }

    logger.info("[/api/trust-center] action", { action, id });

    return NextResponse.json({
      ok: true,
      action,
      id,
      revokedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("[/api/trust-center] POST error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "action failed" },
      { status: 500 },
    );
  }
}

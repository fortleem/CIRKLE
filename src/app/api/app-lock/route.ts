// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings, shouldRequireUnlock } from "@/lib/app-lock";
import { logger } from "@/lib/logger";

/**
 * GET /api/app-lock?userId=...&webAuthn=true
 * Returns the user's app-lock settings + whether an unlock is required.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || "";
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const webAuthn = req.nextUrl.searchParams.get("webAuthn") === "true";
    const [settings, should] = await Promise.all([
      getSettings(userId),
      shouldRequireUnlock(userId, webAuthn),
    ]);
    return NextResponse.json({ settings, should });
  } catch (err) {
    logger.error("[/api/app-lock GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch app-lock settings" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/app-lock
 * Body: { userId, enabled?, lockAfterSec?, biometricEnabled? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const settings = await updateSettings({
      userId,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      lockAfterSec: typeof body.lockAfterSec === "number" ? body.lockAfterSec : undefined,
      biometricEnabled: typeof body.biometricEnabled === "boolean" ? body.biometricEnabled : undefined,
    });
    logger.info("[/api/app-lock POST] updated", { userId, enabled: settings.enabled });
    return NextResponse.json({ settings });
  } catch (err) {
    logger.error("[/api/app-lock POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update app-lock settings" },
      { status: 500 },
    );
  }
}

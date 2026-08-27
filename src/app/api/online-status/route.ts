// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getOnlineStatus, setOnline, setOffline, setAway, getLastSeen } from "@/lib/online-status";
import { logger } from "@/lib/logger";

/**
 * GET /api/online-status?userId=... OR ?userIds=a,b,c
 * Returns the online status for one or many users.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || "";
    const userIdsRaw = req.nextUrl.searchParams.get("userIds") || "";
    if (userIdsRaw) {
      const ids = userIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);
      const statuses = await Promise.all(ids.map((id) => getOnlineStatus(id)));
      return NextResponse.json({ statuses });
    }
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const status = await getOnlineStatus(userId);
    return NextResponse.json({ status });
  } catch (err) {
    logger.error("[/api/online-status GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch status" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/online-status
 * Body: { userId, status: 'online'|'offline'|'away' }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const userId = typeof body.userId === "string" ? body.userId : "";
    const status = typeof body.status === "string" ? body.status : "online";
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    let result;
    if (status === "online") result = await setOnline(userId);
    else if (status === "offline") result = await setOffline(userId);
    else if (status === "away") result = await setAway(userId);
    else return NextResponse.json({ error: "invalid status" }, { status: 400 });
    return NextResponse.json({ status: result });
  } catch (err) {
    logger.error("[/api/online-status POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update status" },
      { status: 500 },
    );
  }
}

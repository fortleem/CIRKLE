import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/federation/followers — GET returns the followers collection of a
// local user (remote actors that follow them).
//   GET /api/federation/followers?username=layla
// ─────────────────────────────────────────────────────────────────────────────

function origin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "circle.app";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const username = (sp.get("username") || "").toLowerCase().replace(/^@/, "").trim();
    if (!username) {
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }
    const base = origin(req);
    const followersUri = `${base}/api/federation/followers?username=${username}`;

    const rows = await db.federatedFollow.findMany({
      where: { direction: "inbound", localUser: username },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(
      {
        "@context": "https://www.w3.org/ns/activitystreams",
        id: followersUri,
        type: "OrderedCollection",
        totalItems: rows.length,
        orderedItems: rows.map((r) => ({
          id: r.remoteActor,
          type: "Person",
          preferredUsername: r.remoteHandle || r.remoteActor,
        })),
      },
      { headers: { "content-type": "application/activity+json; charset=utf-8" } },
    );
  } catch (err) {
    logger.error("[/api/federation/followers GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "followers fetch failed" },
      { status: 500 },
    );
  }
}

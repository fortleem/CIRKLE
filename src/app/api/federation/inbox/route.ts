import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/federation/inbox — GET returns activities addressed to a local user.
//                          POST receives an activity from a remote server.
//
// GET  /api/federation/inbox?username=layla&page=1
// POST /api/federation/inbox   body: { activity }   (ActivityPub activity)
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
    const page = Number(sp.get("page") || "1");
    const pageSize = 20;
    const base = origin(req);
    const inboxUri = `${base}/api/federation/inbox?username=${username}`;

    const where = { owner: username, direction: "inbound" };
    const [total, rows] = await Promise.all([
      db.federatedActivity.count({ where }),
      db.federatedActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (Math.max(1, page) - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    if (!sp.get("page")) {
      return NextResponse.json(
        {
          "@context": "https://www.w3.org/ns/activitystreams",
          id: inboxUri,
          type: "OrderedCollection",
          totalItems: total,
          first: `${inboxUri}&page=1`,
        },
        { headers: { "content-type": "application/activity+json; charset=utf-8" } },
      );
    }

    return NextResponse.json(
      {
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `${inboxUri}&page=${page}`,
        type: "OrderedCollectionPage",
        partOf: inboxUri,
        totalItems: total,
        orderedItems: rows.map((r) => JSON.parse(r.payload)),
      },
      { headers: { "content-type": "application/activity+json; charset=utf-8" } },
    );
  } catch (err) {
    logger.error("[/api/federation/inbox GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "inbox fetch failed" },
      { status: 500 },
    );
  }
}

/**
 * POST — receive an activity from a remote ActivityPub server.
 *
 * Per the ActivityPub spec, this endpoint accepts ANY activity type and
 * stores it in the FederatedActivity table for later processing. HTTP
 * signature verification SHOULD happen here in production — for the
 * sandbox abstraction, we accept all activities (the FederatedActor
 * table is the trust root in the upgrade path).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      type?: string;
      actor?: string;
      object?: unknown;
      id?: string;
      published?: string;
    } | null;
    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    const type = (body.type || "Unknown").trim();
    const actorUri = (body.actor || "").trim();
    if (!actorUri) {
      return NextResponse.json({ error: "actor required" }, { status: 400 });
    }

    // Determine the local recipient. For now we use a query param or
    // default to "inbox" (shared inbox pattern).
    const recipient = req.nextUrl.searchParams.get("username") || "shared";
    const activityId = body.id || `${origin(req)}/api/federation/activities/inbox/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await db.federatedActivity.create({
      data: {
        activityUri: activityId,
        owner: recipient,
        direction: "inbound",
        type,
        payload: JSON.stringify(body),
        delivered: true,
      },
    });

    // If it's a Follow activity, record the inbound follow relationship.
    if (type === "Follow" && typeof body.object === "string") {
      try {
        await db.federatedFollow.upsert({
          where: {
            direction_localUser_remoteActor: {
              direction: "inbound",
              localUser: recipient,
              remoteActor: body.object,
            },
          },
          create: {
            direction: "inbound",
            localUser: recipient,
            remoteActor: body.object,
            remoteHandle: actorUri,
            accepted: true,
          },
          update: { accepted: true },
        });
      } catch (e) {
        logger.warn("[/api/federation/inbox POST] follow record failed", {
          error: (e as Error).message,
        });
      }
    }

    return NextResponse.json(
      { ok: true, id: activityId },
      { status: 202, headers: { "content-type": "application/activity+json; charset=utf-8" } },
    );
  } catch (err) {
    logger.error("[/api/federation/inbox POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "inbox post failed" },
      { status: 500 },
    );
  }
}

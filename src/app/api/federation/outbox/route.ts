import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/federation/outbox — GET returns the user's outbox (OrderedCollection).
//                          POST appends a new activity to the outbox.
//
// GET  /api/federation/outbox?username=layla&page=1
// POST /api/federation/outbox   body: { type, object, to?, cc? }
//
// The outbox IS the user's Post table (module=midan|lamahat|mashahd). Every
// Post is exposed as a Create activity wrapping a Note object. The
// `published` field is the post's createdAt.
// ─────────────────────────────────────────────────────────────────────────────

function origin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "circle.app";
  return `${proto}://${host}`;
}

function postToCreateActivity(
  base: string,
  p: {
    id: string;
    authorHandle: string;
    body: string;
    createdAt: Date;
    visibility: string;
    module: string;
  },
) {
  const actorUri = `${base}/api/federation/actor/${p.authorHandle || "anonymous"}`;
  const noteUri = `${base}/api/posts/${p.id}`;
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `${noteUri}/activity`,
    type: "Create",
    actor: actorUri,
    published: p.createdAt.toISOString(),
    to:
      p.visibility === "public"
        ? ["https://www.w3.org/ns/activitystreams#Public"]
        : [`${actorUri}/followers`],
    object: {
      id: noteUri,
      type: "Note",
      attributedTo: actorUri,
      content: p.body,
      published: p.createdAt.toISOString(),
      to:
        p.visibility === "public"
          ? ["https://www.w3.org/ns/activitystreams#Public"]
          : [`${actorUri}/followers`],
      // Cirkle-specific extension — surfaces the originating module so
      // federated clients can render the post in the right context.
      "cirkle:module": p.module,
    },
  };
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
    const outboxUri = `${base}/api/federation/outbox?username=${username}`;

    const where = { authorHandle: username, module: { in: ["midan", "lamahat", "mashahd"] } };
    const [total, rows] = await Promise.all([
      db.post.count({ where }),
      db.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (Math.max(1, page) - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // When `page` is omitted, return the collection root (no items).
    if (!sp.get("page")) {
      return NextResponse.json(
        {
          "@context": "https://www.w3.org/ns/activitystreams",
          id: outboxUri,
          type: "OrderedCollection",
          totalItems: total,
          first: `${outboxUri}&page=1`,
          last: `${outboxUri}&page=${Math.max(1, Math.ceil(total / pageSize))}`,
        },
        { headers: { "content-type": "application/activity+json; charset=utf-8" } },
      );
    }

    return NextResponse.json(
      {
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `${outboxUri}&page=${page}`,
        type: "OrderedCollectionPage",
        partOf: outboxUri,
        totalItems: total,
        orderedItems: rows.map((p) => postToCreateActivity(base, p)),
      },
      { headers: { "content-type": "application/activity+json; charset=utf-8" } },
    );
  } catch (err) {
    logger.error("[/api/federation/outbox GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "outbox fetch failed" },
      { status: 500 },
    );
  }
}

/**
 * POST — submit a new activity to the outbox. The activity is persisted to
 * the FederatedActivity table and (best-effort) delivered to remote inboxes.
 *
 * For Create activities, the `object` field should be a Note. The server
 * also creates a Post row so the activity is discoverable via /api/posts.
 *
 * Outgoing HTTP delivery uses HTTP Signatures signed with the user's E2EE
 * signing key (the FederatedActor.publicKeyJwk is the verifying half).
 * The actual private-key signing happens client-side per ADR-002 — the
 * server stores the activity and the client queues the delivery via the
 * mesh layer for direct delivery.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      type?: string;
      actor?: string;
      object?: unknown;
      to?: string[];
      cc?: string[];
      username?: string;
    } | null;
    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    const type = (body.type || "Create").trim();
    const username = (body.username || body.actor || "").toLowerCase().replace(/^@/, "").trim();
    if (!username) {
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }

    const base = origin(req);
    const activityId = `${base}/api/federation/activities/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // For Create activities, also persist the object as a Post so it shows
    // up in the Midan/Mashahd feeds.
    let postId: string | null = null;
    if (type === "Create" && body.object && typeof body.object === "object") {
      const obj = body.object as { content?: string; attributedTo?: string };
      const content = String(obj.content || "").slice(0, 5000);
      if (content) {
        const created = await db.post.create({
          data: {
            authorId: null,
            authorName: username.charAt(0).toUpperCase() + username.slice(1),
            authorHandle: username,
            authorInitials: username.slice(0, 2).toUpperCase(),
            authorColor: "teal",
            authorVerified: false,
            body: content,
            module: "midan",
            visibility: "public",
            language: "en",
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
          },
        });
        postId = created.id;
      }
    }

    const activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: activityId,
      type,
      actor: `${base}/api/federation/actor/${username}`,
      object: body.object ?? {},
      published: now,
      to: body.to,
      cc: body.cc,
    };

    await db.federatedActivity.create({
      data: {
        activityUri: activityId,
        owner: username,
        direction: "outbound",
        type,
        payload: JSON.stringify(activity),
        postId,
        delivered: false, // delivery is the client's job per ADR-002
      },
    });

    return NextResponse.json(
      { id: activityId, delivered: 0, postId },
      { status: 201, headers: { "content-type": "application/activity+json; charset=utf-8" } },
    );
  } catch (err) {
    logger.error("[/api/federation/outbox POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "outbox post failed" },
      { status: 500 },
    );
  }
}

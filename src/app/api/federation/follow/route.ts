import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// /api/federation/follow — POST sends a Follow activity (local → remote).
//                          DELETE undoes a follow (Undo Follow).
//
// body: { from, target }
//   • from   — local username (e.g. "layla")
//   • target — remote actor URI or handle "user@domain"
// ─────────────────────────────────────────────────────────────────────────────

function origin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "circle.app";
  return `${proto}://${host}`;
}

async function resolveActorUri(target: string, base: string): Promise<string> {
  // Already a URL?
  if (/^https?:\/\//i.test(target)) return target;
  // user@domain → WebFinger
  const atIdx = target.indexOf("@");
  if (atIdx > 0) {
    const user = target.slice(0, atIdx).replace(/^@/, "");
    const domain = target.slice(atIdx + 1);
    try {
      const wfRes = await fetch(
        `https://${domain}/.well-known/webfinger?resource=acct:${user}@${domain}`,
        { headers: { accept: "application/jrd+json" } },
      );
      if (wfRes.ok) {
        const wf = (await wfRes.json()) as { links?: Array<{ rel: string; type?: string; href?: string }> };
        const selfLink = wf.links?.find(
          (l) => l.rel === "self" && l.type === "application/activity+json",
        );
        if (selfLink?.href) return selfLink.href;
      }
    } catch {
      // fall through
    }
  }
  // Local user fallback.
  return `${base}/api/federation/actor/${target.toLowerCase().replace(/^@/, "")}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      from?: string;
      target?: string;
    } | null;
    if (!body?.from || !body?.target) {
      return NextResponse.json({ error: "from and target required" }, { status: 400 });
    }
    const from = body.from.toLowerCase().replace(/^@/, "").trim();
    const base = origin(req);
    const targetUri = await resolveActorUri(body.target, base);

    // Record the outbound follow (pending until Accept is received).
    const follow = await db.federatedFollow.upsert({
      where: {
        direction_localUser_remoteActor: {
          direction: "outbound",
          localUser: from,
          remoteActor: targetUri,
        },
      },
      create: {
        direction: "outbound",
        localUser: from,
        remoteActor: targetUri,
        remoteHandle: body.target,
        accepted: false,
      },
      update: {},
    });

    // Record the Follow activity in the outbox.
    const activityId = `${base}/api/federation/activities/follow-${follow.id}`;
    const activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: activityId,
      type: "Follow",
      actor: `${base}/api/federation/actor/${from}`,
      object: targetUri,
      published: new Date().toISOString(),
    };
    await db.federatedActivity.create({
      data: {
        activityUri: activityId,
        owner: from,
        direction: "outbound",
        type: "Follow",
        payload: JSON.stringify(activity),
        delivered: false, // client delivers per ADR-002
      },
    });

    return NextResponse.json({ ok: true, activityId, followId: follow.id });
  } catch (err) {
    logger.error("[/api/federation/follow POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "follow failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      from?: string;
      target?: string;
    } | null;
    if (!body?.from || !body?.target) {
      return NextResponse.json({ error: "from and target required" }, { status: 400 });
    }
    const from = body.from.toLowerCase().replace(/^@/, "").trim();
    const base = origin(req);
    const targetUri = await resolveActorUri(body.target, base);

    // Remove the outbound follow.
    await db.federatedFollow.deleteMany({
      where: {
        direction: "outbound",
        localUser: from,
        remoteActor: targetUri,
      },
    });

    // Record the Undo Follow activity in the outbox.
    const activityId = `${base}/api/federation/activities/undo-follow-${Date.now()}`;
    const activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: activityId,
      type: "Undo",
      actor: `${base}/api/federation/actor/${from}`,
      object: {
        type: "Follow",
        actor: `${base}/api/federation/actor/${from}`,
        object: targetUri,
      },
      published: new Date().toISOString(),
    };
    await db.federatedActivity.create({
      data: {
        activityUri: activityId,
        owner: from,
        direction: "outbound",
        type: "Undo",
        payload: JSON.stringify(activity),
        delivered: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[/api/federation/follow DELETE] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unfollow failed" },
      { status: 500 },
    );
  }
}

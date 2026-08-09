import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// /api/federation/webfinger — RFC 7033 WebFinger endpoint.
//
//   GET /.well-known/webfinger?resource=acct:layla@circle.app
//
// Returns the JRD with a "self" link pointing to the ActivityPub actor
// document. This is what allows Mastodon et al. to discover our users.
// ─────────────────────────────────────────────────────────────────────────────

function origin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "circle.app";
  return `${proto}://${host}`;
}

function parseAcct(resource: string): { user: string; host: string } | null {
  // Accept "acct:user@host", "user@host", or just "user".
  let r = resource.trim();
  if (r.startsWith("acct:")) r = r.slice(5);
  if (r.includes("@")) {
    const [user, host] = r.split("@");
    if (!user || !host) return null;
    return { user: user.toLowerCase(), host: host.toLowerCase() };
  }
  return { user: r.toLowerCase(), host: "" };
}

export async function GET(req: NextRequest) {
  try {
    const resource = req.nextUrl.searchParams.get("resource");
    if (!resource) {
      return NextResponse.json(
        { error: "resource query parameter required" },
        { status: 400 },
      );
    }
    const parsed = parseAcct(resource);
    if (!parsed || !parsed.user) {
      return NextResponse.json({ error: "invalid resource" }, { status: 400 });
    }

    const base = origin(req);
    const ownHost = new URL(base).host.toLowerCase();

    // If the request specifies a different host, it's a misroute — return 404.
    if (parsed.host && parsed.host !== ownHost) {
      return NextResponse.json(
        { error: "host mismatch" },
        { status: 404 },
      );
    }

    if (!/^[a-z0-9_]+$/.test(parsed.user)) {
      return NextResponse.json({ error: "invalid username" }, { status: 400 });
    }

    const actorUri = `${base}/api/federation/actor/${parsed.user}`;
    const jrd = {
      subject: `acct:${parsed.user}@${ownHost}`,
      aliases: [actorUri, `${base}/?u=${parsed.user}`],
      links: [
        {
          rel: "self",
          type: "application/activity+json",
          href: actorUri,
        },
        {
          rel: "http://webfinger.net/rel/profile-page",
          type: "text/html",
          href: `${base}/?u=${parsed.user}`,
        },
        {
          rel: "http://ostatus.org/schema/1.0/subscribe",
          template: `${base}/api/federation/follow?uri={uri}`,
        },
      ],
    };

    return NextResponse.json(jrd, {
      headers: {
        "content-type": "application/jrd+json; charset=utf-8",
        "cache-control": "public, max-age=300",
        "access-control-allow-origin": "*",
      },
    });
  } catch (err) {
    logger.error("[/api/federation/webfinger GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "webfinger failed" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { introspectAccessToken, OIDC_ISSUER } from "@/lib/oidc-provider";

/**
 * POST /api/oidc/introspect
 *
 * OAuth 2.0 Token Introspection (RFC 7662). Lets a resource server
 * (or the RP itself) check whether an opaque access token is still
 * active and what scopes it carries.
 *
 * Body (form-encoded or JSON):
 *   token: string,                 // required
 *   client_id?: string,            // or Basic auth
 *   client_secret?: string
 *
 * Returns `{ active: true, ... }` or `{ active: false }`.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let form: URLSearchParams;
    if (contentType.includes("application/json")) {
      const json = await req.json().catch(() => ({}));
      form = new URLSearchParams();
      for (const [k, v] of Object.entries(json)) {
        if (typeof v === "string") form.set(k, v);
      }
    } else {
      const text = await req.text();
      form = new URLSearchParams(text);
    }

    const token = form.get("token");
    if (!token) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "token is required" },
        { status: 400 },
      );
    }

    // Note: in production, this endpoint should require client auth.
    // We leave it open here for dev — the Caddyfile gateway rate-limits.
    void OIDC_ISSUER;

    const result = await introspectAccessToken(token);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store", "Pragma": "no-cache" },
    });
  } catch (err) {
    logger.error("[/api/oidc/introspect] error", { error: (err as Error).message });
    return NextResponse.json({ active: false }, { status: 200 });
  }
}

export const dynamic = "force-dynamic";

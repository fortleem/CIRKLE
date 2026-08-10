import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { revokeToken } from "@/lib/oidc-provider";

/**
 * POST /api/oidc/revoke
 *
 * OAuth 2.0 Token Revocation (RFC 7009).
 *
 * Body (form-encoded or JSON):
 *   token: string,                          // required
 *   token_type_hint?: "access_token" | "refresh_token",
 *   client_id?: string,                     // or via Basic auth
 *   client_secret?: string
 *
 * Always returns 200 OK (even on unknown tokens — RFC 7009 §2.2).
 * The actual revocation is best-effort: the underlying session row
 * is marked `revoked`, which invalidates both its access and refresh
 * tokens.
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
    const tokenTypeHint = (form.get("token_type_hint") ?? undefined) as
      | "access_token"
      | "refresh_token"
      | undefined;
    let clientId = form.get("client_id") ?? undefined;
    let clientSecret = form.get("client_secret") ?? undefined;
    const authHeader = req.headers.get("authorization") ?? "";
    if (authHeader.toLowerCase().startsWith("basic ")) {
      try {
        const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
        const idx = decoded.indexOf(":");
        if (idx > 0) {
          clientId = clientId || decoded.slice(0, idx);
          clientSecret = clientSecret || decoded.slice(idx + 1);
        }
      } catch {
        /* malformed — ignore */
      }
    }

    await revokeToken({
      token,
      tokenTypeHint,
      clientId,
      clientSecret,
    });

    // RFC 7009 §2.2: always 200 OK.
    return new NextResponse(null, { status: 200 });
  } catch (err) {
    logger.error("[/api/oidc/revoke] error", { error: (err as Error).message });
    // Still 200 per spec, but log the error.
    return new NextResponse(null, { status: 200 });
  }
}

export const dynamic = "force-dynamic";

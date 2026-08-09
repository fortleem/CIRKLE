import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getUserInfo } from "@/lib/oidc-provider";

/**
 * GET /api/oidc/userinfo
 *
 * OIDC UserInfo endpoint (OIDC Core §5.3). Returns the claims for the
 * user identified by the bearer access token.
 *
 * Auth: `Authorization: Bearer <access_token>` header.
 *
 * Returns 200 with the claims on success, or:
 *   - 401 `invalid_token` — token missing, unknown, expired, or revoked.
 *   - 403 `insufficient_scope` — (not used here; we return whatever
 *     claims the granted scopes allow).
 */
export async function GET(req: NextRequest) {
  return handleUserInfo(req);
}

/**
 * POST /api/oidc/userinfo
 *
 * Same semantics — OIDC Core §5.3 allows both GET and POST. Some RPs
 * prefer POST to avoid logging tokens in proxy access logs.
 */
export async function POST(req: NextRequest) {
  return handleUserInfo(req);
}

async function handleUserInfo(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json(
      { error: "invalid_token", error_description: "Bearer token required" },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
      },
    );
  }
  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) {
    return NextResponse.json(
      { error: "invalid_token", error_description: "Empty access token" },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
      },
    );
  }
  try {
    const result = await getUserInfo(accessToken);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        {
          status: 401,
          headers: { "WWW-Authenticate": `Bearer error="${result.error}"` },
        },
      );
    }
    return NextResponse.json(result.claims, {
      headers: {
        "Cache-Control": "no-store",
        "Pragma": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    logger.error("[/api/oidc/userinfo] error", {
      error: (err as Error).message,
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

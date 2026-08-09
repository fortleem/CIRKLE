import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  exchangeCode,
  refreshWithToken,
  OIDC_ISSUER,
} from "@/lib/oidc-provider";

/**
 * POST /api/oidc/token
 *
 * OAuth2 token endpoint (RFC 6749 §3.2 + OIDC Core §3.1.3).
 *
 * Supports two grant types:
 *   - `authorization_code`: body params `code`, `redirect_uri`,
 *     `client_id`, `client_secret?`, `code_verifier?` (PKCE).
 *   - `refresh_token`: body params `refresh_token`, `client_id`,
 *     `client_secret?`.
 *
 * Client authentication:
 *   - `client_secret_post`: client_id + client_secret in the body.
 *   - `client_secret_basic`: HTTP Basic auth header (Authorization:
 *     Basic base64(client_id:client_secret)).
 *   - `none`: for public clients (must use PKCE).
 *
 * Returns `{ access_token, token_type, expires_in, id_token, scope,
 * refresh_token? }` on success, or an OAuth2 error object on failure
 * (RFC 6749 §5.2).
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

    const grantType = form.get("grant_type");

    // Extract client credentials — prefer Basic auth header, fall back
    // to body params (client_secret_post).
    let clientId = form.get("client_id") ?? "";
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
        return oauthError("invalid_client", "Malformed Basic auth header", 401);
      }
    }

    if (grantType === "authorization_code") {
      const code = form.get("code");
      const redirectUri = form.get("redirect_uri") ?? "";
      const codeVerifier = form.get("code_verifier") ?? undefined;
      if (!code) return oauthError("invalid_request", "code is required", 400);
      if (!clientId) return oauthError("invalid_request", "client_id is required", 400);

      const result = await exchangeCode({
        code,
        redirectUri,
        clientId,
        clientSecret,
        codeVerifier,
      });
      if (!result.ok) {
        // invalid_client → 401, everything else → 400.
        const status = result.error === "invalid_client" ? 401 : 400;
        return oauthError(result.error, undefined, status);
      }
      return NextResponse.json({
        ...result.tokens,
        // OIDC Core §3.1.3.3: include `id_token` only for the
        // authorization_code grant (it's already in `result.tokens`).
      });
    }

    if (grantType === "refresh_token") {
      const refreshToken = form.get("refresh_token");
      if (!refreshToken) return oauthError("invalid_request", "refresh_token is required", 400);
      if (!clientId) return oauthError("invalid_request", "client_id is required", 400);

      const result = await refreshWithToken({
        refreshToken,
        clientId,
        clientSecret,
      });
      if (!result.ok) {
        const status = result.error === "invalid_client" ? 401 : 400;
        return oauthError(result.error, undefined, status);
      }
      // Refresh-token response does NOT include a new id_token by default
      // (OIDC Core §12); but many RPs expect one. We include it because
      // our `issueTokensForSession` always mints a fresh id_token. If
      // the RP doesn't want it, they can ignore it.
      return NextResponse.json(result.tokens);
    }

    return oauthError("unsupported_grant_type", undefined, 400);
  } catch (err) {
    logger.error("[/api/oidc/token] error", { error: (err as Error).message });
    return oauthError("server_error", (err as Error).message, 500);
  }
}

function oauthError(error: string, description?: string, status = 400) {
  const body: Record<string, unknown> = { error };
  if (description) body.error_description = description;
  // Per OIDC Core §3.1.3.4 — include WWW-Authenticate on invalid_client
  // when using Basic auth.
  const headers: Record<string, string> = {};
  if (error === "invalid_client" && status === 401) {
    headers["WWW-Authenticate"] = `Basic realm="${OIDC_ISSUER}"`;
  }
  return NextResponse.json(body, { status, headers });
}

export const dynamic = "force-dynamic";

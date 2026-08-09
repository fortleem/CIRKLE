import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  validateAuthorizeRequest,
  getExistingConsent,
  recordConsent,
  revokeConsent,
  issueAuthorizationCode,
  type AuthorizeParams,
} from "@/lib/oidc-provider";

/**
 * GET /api/oidc/authorize
 *
 * Authorization endpoint (RFC 6749 §3.1 + OIDC Core §3.1.2).
 *
 * This endpoint is hit by the RP redirecting the user agent here. We:
 *   1. Validate the request (client_id, redirect_uri, response_type,
 *      scope, PKCE).
 *   2. If valid, check whether the user has a prior consent on file
 *      for this (client, scope) tuple.
 *   3. Return either:
 *        - { ok, redirectUrl } — consent already on file, code minted,
 *          caller redirects the user agent to `redirectUrl`.
 *        - { ok, requiresConsent: true, client, scopes, request } —
 *          the caller (frontend) must render a consent UI and POST
 *          back to /api/oidc/authorize with the user's decision.
 *        - { ok: false, error, errorDescription, redirectUrl? } —
 *          an OAuth2 error. If `redirectUrl` is present the caller
 *          should redirect there with `?error=...&state=...` per
 *          OIDC §3.1.2.6 (redirect-only error mode).
 *
 * NOTE on user identity: this implementation runs ALONGSIDE the
 * existing localStorage auth. The frontend is expected to pass the
 * authenticated `userLabel` (the Cirkle username from `useAuth`) when
 * it has one. If `userLabel` is omitted, the endpoint returns a
 * `requiresLogin: true` flag so the frontend can render the legacy
 * auth-screen first.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const params = extractAuthorizeParams(sp);

  // Spec: missing or invalid client_id / redirect_uri → DO NOT redirect.
  // Just return a 400.
  if (!params.clientId) {
    return NextResponse.json(
      { ok: false, error: "invalid_request", errorDescription: "client_id is required" },
      { status: 400 },
    );
  }
  if (!params.redirectUri) {
    return NextResponse.json(
      { ok: false, error: "invalid_request", errorDescription: "redirect_uri is required" },
      { status: 400 },
    );
  }

  const validation = await validateAuthorizeRequest(params);
  if (!validation.ok) {
    // If the client + redirect_uri are known, we MUST redirect with the
    // error rather than show a 400 (OIDC §3.1.2.6). Only invalid_client
    // or unknown redirect_uri should short-circuit.
    if (
      validation.client &&
      validation.client.redirectUris.includes(params.redirectUri)
    ) {
      const url = buildErrorRedirect(
        params.redirectUri,
        validation.error ?? "invalid_request",
        validation.errorDescription,
        params.state,
      );
      return NextResponse.json({
        ok: false,
        error: validation.error,
        errorDescription: validation.errorDescription,
        redirectUrl: url.toString(),
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: validation.error,
        errorDescription: validation.errorDescription,
      },
      { status: 400 },
    );
  }

  // Valid request. Check if the user is already authenticated (via the
  // legacy auth-store — the frontend passes their username along).
  const userLabel = sp.get("userLabel")?.trim();
  if (!userLabel) {
    // Frontend must render the auth screen, then re-POST here.
    return NextResponse.json({
      ok: true,
      requiresLogin: true,
      client: {
        clientId: validation.client!.clientId,
        name: validation.client!.name,
        logoUri: validation.client!.logoUri,
        policyUri: validation.client!.policyUri,
      },
      scopes: validation.scopes,
      request: params,
    });
  }

  // Check for existing consent.
  const existing = await getExistingConsent(params.clientId, userLabel);
  const consentScopes = existing && existing.status === "granted"
    ? existing.scope.split(/\s+/).filter(Boolean)
    : [];
  const requiredScopes = validation.scopes!;
  const hasAllScopes = requiredScopes.every((s) => consentScopes.includes(s));

  if (existing && existing.status === "granted" && hasAllScopes) {
    // Auto-issue the code — consent already on file.
    try {
      const { redirectUrl } = await issueAuthorizationCode({
        clientId: params.clientId,
        redirectUri: params.redirectUri,
        userLabel,
        scopes: requiredScopes,
        nonce: params.nonce,
        state: params.state,
        codeChallenge: params.codeChallenge,
        codeChallengeMethod: params.codeChallengeMethod,
      });
      return NextResponse.json({ ok: true, redirectUrl });
    } catch (err) {
      logger.error("[/api/oidc/authorize GET] issueCode error", {
        error: (err as Error).message,
      });
      return NextResponse.json(
        { ok: false, error: "server_error" },
        { status: 500 },
      );
    }
  }

  // Need consent — return metadata for the consent UI.
  return NextResponse.json({
    ok: true,
    requiresConsent: true,
    client: {
      clientId: validation.client!.clientId,
      name: validation.client!.name,
      logoUri: validation.client!.logoUri,
      policyUri: validation.client!.policyUri,
    },
    scopes: requiredScopes,
    userLabel,
    existingConsentScopes: consentScopes,
    request: params,
  });
}

/**
 * POST /api/oidc/authorize
 *
 * Submit the user's consent decision. The body must echo back the
 * original authorize params (so the server doesn't have to maintain
 * a session for the in-flight request) plus:
 *
 *   {
 *     ...authorizeParams,
 *     userLabel: string,
 *     decision: "accept" | "deny"
 *   }
 *
 * On accept: records the consent, mints the code, returns `{ redirectUrl }`.
 * On deny:  revokes any prior consent, returns `{ redirectUrl }` with
 *           `?error=access_denied` for the RP to handle.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const {
      decision,
      userLabel,
      ...rest
    } = body as {
      decision?: string;
      userLabel?: string;
    } & Partial<AuthorizeParams>;

    if (!userLabel || typeof userLabel !== "string") {
      return NextResponse.json(
        { ok: false, error: "invalid_request", errorDescription: "userLabel is required" },
        { status: 400 },
      );
    }
    if (decision !== "accept" && decision !== "deny") {
      return NextResponse.json(
        { ok: false, error: "invalid_request", errorDescription: "decision must be accept|deny" },
        { status: 400 },
      );
    }

    const params = extractAuthorizeParamsFromObject(rest);
    const validation = await validateAuthorizeRequest(params);
    if (!validation.ok || !validation.client || !validation.scopes) {
      return NextResponse.json(
        {
          ok: false,
          error: validation.error ?? "invalid_request",
          errorDescription: validation.errorDescription,
        },
        { status: 400 },
      );
    }

    if (decision === "deny") {
      // Revoke any prior consent + redirect with access_denied.
      await revokeConsent(params.clientId, userLabel);
      const url = buildErrorRedirect(
        params.redirectUri,
        "access_denied",
        "The user denied the consent request",
        params.state,
      );
      return NextResponse.json({ ok: true, redirectUrl: url.toString() });
    }

    // accept — record consent + issue code.
    await recordConsent(params.clientId, userLabel, validation.scopes);
    const { redirectUrl } = await issueAuthorizationCode({
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      userLabel,
      scopes: validation.scopes,
      nonce: params.nonce,
      state: params.state,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
    });
    return NextResponse.json({ ok: true, redirectUrl });
  } catch (err) {
    logger.error("[/api/oidc/authorize POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}

// ── helpers ──────────────────────────────────────────────────────

function extractAuthorizeParams(sp: URLSearchParams): AuthorizeParams {
  return {
    clientId: sp.get("client_id") ?? "",
    redirectUri: sp.get("redirect_uri") ?? "",
    responseType: sp.get("response_type") ?? "",
    scope: sp.get("scope") ?? "openid",
    state: sp.get("state") ?? undefined,
    nonce: sp.get("nonce") ?? undefined,
    codeChallenge: sp.get("code_challenge") ?? undefined,
    codeChallengeMethod: sp.get("code_challenge_method") ?? undefined,
  };
}

function extractAuthorizeParamsFromObject(o: Partial<AuthorizeParams>): AuthorizeParams {
  return {
    clientId: o.clientId ?? "",
    redirectUri: o.redirectUri ?? "",
    responseType: o.responseType ?? "",
    scope: o.scope ?? "openid",
    state: o.state,
    nonce: o.nonce,
    codeChallenge: o.codeChallenge,
    codeChallengeMethod: o.codeChallengeMethod,
  };
}

function buildErrorRedirect(
  redirectUri: string,
  error: string,
  description: string | undefined,
  state: string | undefined,
): URL {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (description) url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return url;
}

export const dynamic = "force-dynamic";

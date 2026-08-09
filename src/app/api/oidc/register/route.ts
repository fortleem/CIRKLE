import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { registerClient, listClients } from "@/lib/oidc-provider";

/**
 * POST /api/oidc/register
 *
 * RFC 7591 — OAuth 2.0 Dynamic Client Registration.
 *
 * Body:
 *   {
 *     client_name: string,            // required
 *     redirect_uris: string[],        // required (https or http://localhost)
 *     grant_types?: string[],         // default ["authorization_code"]
 *     response_types?: string[],      // default ["code"]
 *     scope?: string,                 // default "openid profile email"
 *     token_endpoint_auth_method?: "client_secret_basic" |
 *                                   "client_secret_post" | "none",
 *     logo_uri?: string,
 *     policy_uri?: string
 *   }
 *
 * Returns the registered client (with `client_id` + `client_secret`
 * for confidential clients). In a production deployment this endpoint
 * would be gated by an initial access token — here we leave it open
 * for development use; the gateway (Caddyfile) should rate-limit it.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_client_metadata", error_description: "JSON body required" }, { status: 400 });
    }
    const {
      client_name,
      redirect_uris,
      grant_types,
      response_types,
      scope,
      token_endpoint_auth_method,
      logo_uri,
      policy_uri,
    } = body as {
      client_name?: string;
      redirect_uris?: string[];
      grant_types?: string[];
      response_types?: string[];
      scope?: string;
      token_endpoint_auth_method?: string;
      logo_uri?: string;
      policy_uri?: string;
    };

    if (!client_name || typeof client_name !== "string") {
      return NextResponse.json(
        { error: "invalid_client_metadata", error_description: "client_name is required" },
        { status: 400 },
      );
    }
    if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
      return NextResponse.json(
        { error: "invalid_client_metadata", error_description: "redirect_uris (string[]) is required" },
        { status: 400 },
      );
    }

    const clientType: "confidential" | "public" =
      token_endpoint_auth_method === "none" ? "public" : "confidential";

    const record = await registerClient({
      name: client_name,
      redirectUris: redirect_uris,
      grantTypes: grant_types,
      responseTypes: response_types,
      scope,
      clientType,
      logoUri: logo_uri,
      policyUri: policy_uri,
    });

    // RFC 7591 response shape.
    const response: Record<string, unknown> = {
      client_id: record.clientId,
      client_name: record.name,
      redirect_uris: record.redirectUris,
      grant_types: record.grantTypes,
      response_types: record.responseTypes,
      scope: record.scope,
      token_endpoint_auth_method:
        clientType === "public" ? "none" : "client_secret_basic",
      client_id_issued_at: Math.floor(record.createdAt.getTime() / 1000),
    };
    if (record.clientSecret) {
      response.client_secret = record.clientSecret;
      response.client_secret_expires_at = 0; // never expires
    }
    if (record.logoUri) response.logo_uri = record.logoUri;
    if (record.policyUri) response.policy_uri = record.policyUri;

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    logger.error("[/api/oidc/register] error", { error: (err as Error).message });
    return NextResponse.json(
      {
        error: "invalid_client_metadata",
        error_description: err instanceof Error ? err.message : "registration failed",
      },
      { status: 400 },
    );
  }
}

/**
 * GET /api/oidc/register
 *
 * Convenience: list all registered clients. Intended for the Cirkle
 * admin / developer dashboard. In production this should be gated by
 * an admin scope — left open here for dev.
 */
export async function GET() {
  try {
    const clients = await listClients();
    // Strip secrets from list view.
    return NextResponse.json({
      clients: clients.map((c) => ({
        client_id: c.clientId,
        client_name: c.name,
        redirect_uris: c.redirectUris,
        grant_types: c.grantTypes,
        response_types: c.responseTypes,
        scope: c.scope,
        client_type: c.clientType,
        logo_uri: c.logoUri,
        policy_uri: c.policyUri,
        created_at: c.createdAt,
      })),
    });
  } catch (err) {
    logger.error("[/api/oidc/register GET] error", { error: (err as Error).message });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

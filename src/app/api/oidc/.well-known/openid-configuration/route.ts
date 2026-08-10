import { NextResponse } from "next/server";
import { discoveryMetadata } from "@/lib/oidc-provider";

/**
 * GET /api/oidc/.well-known/openid-configuration
 *
 * OIDC Discovery (RFC 8414) metadata document. RPs fetch this once
 * at startup to learn the issuer's endpoints, supported scopes, and
 * signing algorithms.
 *
 * Public — no authentication required.
 */
export async function GET() {
  return NextResponse.json(discoveryMetadata(), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export const dynamic = "force-dynamic";

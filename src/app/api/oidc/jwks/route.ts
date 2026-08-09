import { NextResponse } from "next/server";
import { jwksResponse } from "@/lib/oidc-provider";

/**
 * GET /api/oidc/jwks
 *
 * JSON Web Key Set (RFC 7517) — exposes the provider's RSA public key
 * (with kid, alg=RS256) so RPs can verify ID token signatures.
 *
 * Public — no authentication. Cached for 1 hour.
 */
export async function GET() {
  return NextResponse.json(jwksResponse(), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export const dynamic = "force-dynamic";

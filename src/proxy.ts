import { NextRequest, NextResponse } from "next/server";
import { getRegionForCountry } from "@/lib/regions";

/**
 * Cirkle API proxy (Next.js middleware replacement).
 *
 * Responsibilities:
 *   1. CORS — reflect the request origin for cross-origin API calls.
 *   2. Region detection — read the caller's country from the
 *      `x-cirkle-country` cookie (or header) and stamp it onto the *request*
 *      as `x-cirkle-country` so downstream API routes can resolve the
 *      serving region via `getRegionForCountry(...)`.
 *   3. `X-Data-Region` response header — the resolved region code for every
 *      API response, so clients/proxies can see which region answered.
 *   4. Authentication — API routes require session, API key, or Bearer token.
 *      Public status endpoints are whitelisted.
 */

// Routes that don't require authentication.
const PUBLIC_ROUTES = [
  "/api/brain/status",
  "/api/cognitive/status",
  "/api/uob/status",
  "/api/tee/status",
  "/api/liee/status",
  "/api/cie/status",
  "/api/tgse/status",
  "/api/pcpf/status",
  "/api/health",
  "/api/docs",
  "/api/feed",
  "/api/news",
  "/api/currency",
  "/api/weather",
  "/api/nearby",
  "/api/recommendations",
];

export function proxy(req: NextRequest) {
  // ── Region detection ───────────────────────────────────────────
  const countryHeader = req.headers.get("x-cirkle-country") || "";
  const countryCookie =
    req.cookies.get("x-cirkle-country")?.value || "";
  const countryQuery = req.nextUrl.searchParams.get("country") || "";
  const country = (countryHeader || countryCookie || countryQuery || "")
    .trim()
    .toUpperCase()
    .slice(0, 2);

  const region = getRegionForCountry(country);

  // Clone the request headers so downstream routes see the resolved country.
  const requestHeaders = new Headers(req.headers);
  if (country) {
    requestHeaders.set("x-cirkle-country", country);
    requestHeaders.set("x-cirkle-region", region.code);
  }

  // ── Authentication ─────────────────────────────────────────────
  const path = req.nextUrl.pathname;

  // Check if route is public (exact match or starts with + /).
  const isPublic = PUBLIC_ROUTES.some(
    (r) => path === r || path.startsWith(r + "/"),
  );

  if (!isPublic) {
    // Check for API key.
    const apiKey = req.headers.get("x-api-key");
    // Check for session cookie.
    const sessionToken =
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value;
    // Check for Bearer token.
    const authHeader = req.headers.get("authorization");

    if (apiKey || sessionToken || (authHeader && authHeader.startsWith("Bearer "))) {
      // Authenticated — set auth method header.
      if (apiKey) requestHeaders.set("x-auth-method", "api-key");
      else if (sessionToken) requestHeaders.set("x-auth-method", "session");
      else requestHeaders.set("x-auth-method", "bearer");
    } else {
      // No auth found — allow in development, reject in production.
      // For now, we allow all requests (development mode).
      // In production, uncomment the following:
      // return NextResponse.json(
      //   { error: "Authentication required", code: "UNAUTHORIZED" },
      //   { status: 401 },
      // );
    }
  }

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // ── CORS ───────────────────────────────────────────────────────
  const origin = req.headers.get("origin");
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-cirkle-country, x-api-key",
    );
    res.headers.set("Access-Control-Expose-Headers", "X-Data-Region");
    res.headers.set("Access-Control-Max-Age", "86400");
  }

  // ── Region stamp on every API response ─────────────────────────
  res.headers.set("X-Data-Region", region.code);

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: res.headers });
  }
  return res;
}

export const config = { matcher: "/api/:path*" };

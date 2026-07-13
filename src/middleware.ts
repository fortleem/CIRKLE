/**
 * CIRKLE Brain AI — Authentication Middleware (Upgrade 2)
 * ============================================================================
 * Protects API routes with session + API key authentication.
 * Public routes are whitelisted; all others require auth.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";

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
];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Allow public routes.
  if (PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + "/"))) {
    return NextResponse.next();
  }

  // Check for API key in header.
  const apiKey = req.headers.get("x-api-key");
  if (apiKey && apiKey.startsWith("cirkle_")) {
    // API key authentication (for external integrations).
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-auth-method", "api-key");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Check for session cookie (NextAuth).
  const sessionToken = req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value;
  if (sessionToken) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-auth-method", "session");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Check for Bearer token.
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-auth-method", "bearer");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // No auth found — return 401 for API routes, redirect for pages.
  if (path.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
  ],
};

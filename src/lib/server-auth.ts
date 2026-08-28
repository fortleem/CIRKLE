// @ts-nocheck
/**
 * CIRKLE — Server-side authentication helpers (P0-AUTH-IDOR)
 * ============================================================================
 * Implements JWT-based session management for the CIRKLE platform.
 *
 * Why this exists:
 *   The pre-P0 architecture stored bcrypt-hashed passwords in `localStorage`
 *   on the client and never validated identity server-side. Every API route
 *   was therefore unauthenticated and accepted any `username` field in the
 *   request body — a textbook IDOR/BOLA surface. This module replaces that
 *   posture with stateless httpOnly-cookie sessions signed with a server
 *   secret.
 *
 * Tokens are HS256 JWTs containing `{ sub, username, isAdmin, isAca }` and
 * expire after `SESSION_TTL_SECONDS` (default 7 days). The cookie is named
 * `cirkle-session` and is flagged `httpOnly`, `secure` (prod), `sameSite=strict`.
 *
 * Two clearance flags are stored on the JWT (P0 stop-gap):
 *   - `isAdmin`  — gates `/api/admin/*`
 *   - `isAca`     — gates `/api/aca/*`     (Circle-citizen + ACA clearance)
 *
 * In dev (no `CIRKLE_JWT_SECRET` env var) we fall back to a deterministic
 * secret and emit a single `console.warn`. This is intentional so the dev
 * server still works out-of-the-box, but production MUST set the env var.
 * ============================================================================
 */
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

export const SESSION_COOKIE_NAME = "cirkle-session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const ISSUER = "cirkle.app";
const AUDIENCE = "cirkle.app";

/* ------------------------------------------------------------------ */
/* Secret resolution                                                  */
/* ------------------------------------------------------------------ */

let __devSecretWarned = false;
const DEV_FALLBACK_SECRET =
  "cirkle-dev-fallback-secret-do-not-use-in-production-9f3a2c7e1b4d8a5f6c2e9b7a3d1f8c4e";

/**
 * Resolve the JWT signing secret.
 *
 * Resolution order:
 *   1. `process.env.CIRKLE_JWT_SECRET` (production path).
 *   2. A deterministic dev fallback (with a one-time console.warn).
 *
 * We intentionally do NOT randomize the dev fallback — that would invalidate
 * all sessions on every dev-server restart. The fallback is unique enough to
 * prevent trivially guessing it on a remote machine that happens to share
 * the same source code, and dev boxes are not exposed publicly.
 */
function getJwtSecret(): Uint8Array {
  const raw = process.env.CIRKLE_JWT_SECRET;
  if (raw && raw.length >= 16) {
    return new TextEncoder().encode(raw);
  }
  if (!__devSecretWarned && process.env.NODE_ENV !== "production") {
    console.warn(
      "[server-auth] CIRKLE_JWT_SECRET is not set — using deterministic dev fallback. " +
        "Set CIRKLE_JWT_SECRET in production to a strong random string (>= 32 chars).",
    );
    __devSecretWarned = true;
  }
  return new TextEncoder().encode(DEV_FALLBACK_SECRET);
}

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface SessionPayload {
  userId: string;
  username: string;
  /** Display name snapshot at login time (may be stale if user edits it). */
  displayName?: string;
  /** True if this user may access /api/admin/* (P0 stop-gap). */
  isAdmin?: boolean;
  /** True if this user may access /api/aca/* (P0 stop-gap). */
  isAca?: boolean;
}

export interface VerifiedSession extends SessionPayload {
  /** Raw JWT string (useful for re-issuing / refreshing). */
  token: string;
  /** Unix epoch seconds at which the token expires. */
  expiresAt: number;
}

/* ------------------------------------------------------------------ */
/* Clearance helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Resolve clearance flags for a user at login time.
 *
 * P0 stop-gap: we read comma-separated env vars to decide which Circle users
 * are also admins or ACA agents. This is intentionally simple — a real
 * deployment will eventually move these into a DB-backed role table. The env
 * var path keeps the P0 fix self-contained and reversible.
 *
 *   CIRKLE_ADMIN_USERNAMES=alice,bob
 *   CIRKLE_ACA_USERNAMES=carol
 */
function resolveClearance(username: string): { isAdmin: boolean; isAca: boolean } {
  const norm = username.trim().toLowerCase();
  const isAdmin = listEnvUsernames("CIRKLE_ADMIN_USERNAMES").includes(norm);
  const isAca = listEnvUsernames("CIRKLE_ACA_USERNAMES").includes(norm);
  return { isAdmin, isAca };
}

function listEnvUsernames(name: string): string[] {
  const v = process.env[name] || "";
  return v
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Token lifecycle                                                    */
/* ------------------------------------------------------------------ */

/**
 * Create a signed session JWT for the given user.
 *
 * Returns the compact JWT string. The caller is responsible for setting it
 * on the response cookie via {@link setSessionCookie}.
 */
export async function createSessionToken(
  userId: string,
  username: string,
  extra?: { displayName?: string; isAdmin?: boolean; isAca?: boolean },
): Promise<string> {
  const clearance =
    extra?.isAdmin !== undefined || extra?.isAca !== undefined
      ? {
          isAdmin: extra?.isAdmin ?? false,
          isAca: extra?.isAca ?? false,
        }
      : resolveClearance(username);

  const now = Date.now();
  const expiresAt = now + SESSION_TTL_SECONDS * 1000;

  const jwt = await new SignJWT({
    username,
    displayName: extra?.displayName,
    isAdmin: clearance.isAdmin,
    isAca: clearance.isAca,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(getJwtSecret());

  return jwt;
}

/**
 * Verify a session JWT.
 *
 * Returns the decoded session payload (plus `token` + `expiresAt`) on success
 * or `null` on any verification failure (bad signature, expired, malformed).
 *
 * Never throws — callers can use a simple truthiness check.
 */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<VerifiedSession | null> {
  if (!token || typeof token !== "string" || token.length < 10) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const username =
      typeof payload.username === "string" ? payload.username : null;
    if (!sub || !username) return null;

    const expiresAt =
      typeof payload.exp === "number" ? payload.exp * 1000 : 0;

    return {
      userId: sub,
      username,
      displayName:
        typeof payload.displayName === "string"
          ? payload.displayName
          : undefined,
      isAdmin: payload.isAdmin === true,
      isAca: payload.isAca === true,
      token,
      expiresAt,
    };
  } catch {
    // Expired, bad signature, malformed — treat all the same: not authed.
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Request-side helpers                                               */
/* ------------------------------------------------------------------ */

/**
 * Extract the session from an incoming Next.js request.
 *
 * Reads the `cirkle-session` cookie (preferred) and falls back to an
 * `Authorization: Bearer <jwt>` header for non-browser clients (CLI tools,
 * curl scripts). Returns `null` if no valid session is present.
 *
 * Never throws.
 */
export async function getSessionFromRequest(
  req: NextRequest | Request,
): Promise<VerifiedSession | null> {
  // Cookie path (browser clients).
  let token: string | undefined;
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
    if (match) {
      token = decodeURIComponent(match.slice(SESSION_COOKIE_NAME.length + 1));
    }
  } catch {
    /* fall through */
  }

  // NextRequest.cookies (preferred when available).
  if (!token) {
    try {
      const anyReq = req as any;
      const cookieVal = anyReq?.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
      if (cookieVal) token = cookieVal;
    } catch {
      /* no-op */
    }
  }

  // Authorization: Bearer <jwt> fallback (non-browser clients).
  if (!token) {
    try {
      const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      if (auth.toLowerCase().startsWith("bearer ")) {
        token = auth.slice(7).trim();
      }
    } catch {
      /* no-op */
    }
  }

  return verifySessionToken(token);
}

/* ------------------------------------------------------------------ */
/* Response-side helpers                                              */
/* ------------------------------------------------------------------ */

/**
 * Set the `cirkle-session` httpOnly cookie on a NextResponse.
 *
 * Flags: httpOnly, secure (prod), sameSite=strict, path=/
 */
export function setSessionCookie(
  res: NextResponse,
  token: string,
  opts?: { maxAgeSeconds?: number },
): void {
  const maxAge = opts?.maxAgeSeconds ?? SESSION_TTL_SECONDS;
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
}

/**
 * Clear the `cirkle-session` cookie.
 */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

/* ------------------------------------------------------------------ */
/* Route-handler wrappers                                             */
/* ------------------------------------------------------------------ */

/**
 * Shape of an authed route handler.
 *
 * The wrapper passes the verified session as the 3rd argument so handlers
 * can read `session.userId` / `session.username` / `session.isAdmin` /
 * `session.isAca` without re-parsing the cookie.
 */
export type AuthedHandler<
  TReq = NextRequest | Request,
  TCtx = { params: Promise<Record<string, string>> | Record<string, string> },
> = (
  req: TReq,
  ctx: TCtx,
  session: VerifiedSession,
) => Promise<Response> | Response;

/**
 * Wrap an API route handler with a session requirement.
 *
 * - If no valid session, returns `{ error: "unauthorized" }` with status 401.
 * - If session is valid, calls the inner handler with `{ user: session }` as
 *   the 3rd argument.
 *
 * Usage:
 *   export const GET = requireAuth(async (req, ctx, session) => { ... });
 */
export function requireAuth<
  TReq = NextRequest | Request,
  TCtx = { params: Promise<Record<string, string>> | Record<string, string> },
>(handler: AuthedHandler<TReq, TCtx>) {
  return async (
    req: TReq,
    ctx: TCtx,
  ): Promise<Response> => {
    const session = await getSessionFromRequest(req as unknown as NextRequest);
    if (!session) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return handler(req, ctx, session);
  };
}

/**
 * Wrap an API route handler with an admin-session requirement.
 *
 * - If no valid session, returns `{ error: "unauthorized" }` with 401.
 * - If session is valid but `isAdmin !== true`, returns `{ error: "forbidden" }` with 403.
 * - Otherwise calls the inner handler with the session as 3rd arg.
 */
export function requireAdmin<
  TReq = NextRequest | Request,
  TCtx = { params: Promise<Record<string, string>> | Record<string, string> },
>(handler: AuthedHandler<TReq, TCtx>) {
  return async (
    req: TReq,
    ctx: TCtx,
  ): Promise<Response> => {
    const session = await getSessionFromRequest(req as unknown as NextRequest);
    if (!session) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    if (!session.isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    return handler(req, ctx, session);
  };
}

/**
 * Wrap an API route handler with an ACA-clearance requirement.
 *
 * - If no valid session, returns `{ error: "unauthorized" }` with 401.
 * - If session is valid but `isAca !== true`, returns `{ error: "forbidden" }` with 403.
 * - Otherwise calls the inner handler with the session as 3rd arg.
 */
export function requireAcaAuth<
  TReq = NextRequest | Request,
  TCtx = { params: Promise<Record<string, string>> | Record<string, string> },
>(handler: AuthedHandler<TReq, TCtx>) {
  return async (
    req: TReq,
    ctx: TCtx,
  ): Promise<Response> => {
    const session = await getSessionFromRequest(req as unknown as NextRequest);
    if (!session) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    if (!session.isAca) {
      return new Response(
        JSON.stringify({ error: "forbidden", details: "ACA clearance required" }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        },
      );
    }
    return handler(req, ctx, session);
  };
}

/* ------------------------------------------------------------------ */
/* Utility exports                                                    */
/* ------------------------------------------------------------------ */

/**
 * Return a 401 JSON Response with a standard shape. Useful in handlers that
 * need to bail out manually before they could be wrapped by `requireAuth`
 * (e.g. handlers that already take a context object and don't fit the simple
 * wrapper signature).
 */
export function unauthorizedResponse(
  message = "unauthorized",
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Return a 403 JSON Response with a standard shape.
 */
export function forbiddenResponse(
  message = "forbidden",
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}

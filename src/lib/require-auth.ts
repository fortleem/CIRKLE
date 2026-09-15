// @ts-nocheck
/**
 * CIRKLE — Re-export auth wrappers for easy import (P1-SECURITY).
 * ============================================================================
 * Single-import convenience surface for API route handlers that need
 * authentication, admin, or ACA clearance gating.
 *
 * Usage:
 *   import { requireAuth, requireAdmin, adminGate } from "@/lib/require-auth";
 *
 *   export const GET = requireAuth(async (req, ctx, session) => { ... });
 *   export const GET = requireAdmin(async (req, ctx, session) => { ... });
 *
 *   // Or inline (preferred for routes that already have a custom signature):
 *   export async function GET(req: NextRequest) {
 *     const fail = await adminGate(req);
 *     if (fail) return fail;
 *     // ...existing handler body
 *   }
 * ============================================================================
 */
import { NextRequest } from "next/server";
import {
  requireAuth,
  requireAdmin,
  requireAcaAuth,
  getSessionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from "./server-auth";

export {
  requireAuth,
  requireAdmin,
  requireAcaAuth,
  getSessionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
  setSessionCookie,
  clearSessionCookie,
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "./server-auth";

export type {
  SessionPayload,
  VerifiedSession,
  AuthedHandler,
} from "./server-auth";

/**
 * Inline admin gate.
 *
 * Returns `null` if the caller is an authenticated admin (passes the gate),
 * or a 401/403 Response otherwise. Designed to be called as the first line
 * of an admin route handler:
 *
 *   // P1 FIX: Route is now auth-gated
 *   const fail = await adminGate(req);
 *   if (fail) return fail;
 *
 * Admin clearance is resolved from `CIRKLE_ADMIN_USERNAMES` (comma-separated)
 * at JWT signing time, then re-verified on each request via the JWT's
 * `isAdmin` claim.
 */
export async function adminGate(
  req: NextRequest | Request,
): Promise<Response | null> {
  const session = await getSessionFromRequest(req as NextRequest);
  if (!session) {
    return unauthorizedResponse("unauthorized");
  }
  if (!session.isAdmin) {
    return forbiddenResponse("forbidden");
  }
  return null;
}

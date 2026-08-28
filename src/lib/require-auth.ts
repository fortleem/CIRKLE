// @ts-nocheck
/**
 * CIRKLE — Route-handler auth wrappers (P0-AUTH-IDOR)
 * ============================================================================
 * Re-exports the `requireAuth`, `requireAcaAuth`, and `requireAdmin` route
 * wrappers from `src/lib/server-auth.ts` so route files can import them from
 * a single dedicated entry point.
 *
 * The wrappers can be applied to ANY Next.js App Router route handler:
 *
 *   import { requireAuth } from "@/lib/require-auth";
 *
 *   export const GET = requireAuth(async (req, ctx, session) => {
 *     return Response.json({ hello: session.username });
 *   });
 *
 * For routes with a `params` context:
 *
 *   export const GET = requireAuth(async (req, ctx, session) => {
 *     const { id } = await ctx.params;
 *     ...
 *   });
 *
 * For admin-only or ACA-only routes, swap in `requireAdmin` or `requireAcaAuth`.
 * ============================================================================
 */
export {
  requireAuth,
  requireAdmin,
  requireAcaAuth,
  unauthorizedResponse,
  forbiddenResponse,
  getSessionFromRequest,
  type AuthedHandler,
  type VerifiedSession,
} from "@/lib/server-auth";

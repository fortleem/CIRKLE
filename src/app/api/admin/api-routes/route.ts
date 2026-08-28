// @ts-nocheck
/**
 * GET /api/admin/api-routes
 * ============================================================================
 * API route inventory + rate-limit configuration for the admin panel.
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAdmin` clearance on the session. Returns 401 / 403 otherwise.
 *
 * This route introspects the filesystem under src/app/api to enumerate every
 * route.ts file (237 routes as of v16.0) and groups them by top-level
 * folder. It also returns the rate-limit presets from src/lib/api-rate-limit.ts.
 *
 * Returns:
 *   { totalRoutes, byFolder: [...], routes: [...],
 *     rateLimitPresets: {...}, validationWrappedCount }
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { RATE_LIMIT_PRESETS } from "@/lib/api-rate-limit";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function listRoutes(dir: string, basePath = "/api"): { path: string; folder: string }[] {
  const routes: { path: string; folder: string }[] = [];
  if (!existsSync(dir)) return routes;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories. Map [id] and [param] to :param.
      const segment = entry.name.replace(/^\[(.+)\]$/, ":$1");
      routes.push(...listRoutes(fullPath, `${basePath}/${segment}`));
    } else if (entry.name === "route.ts" || entry.name === "route.js") {
      // Top-level folder name (first segment after /api)
      const folder = basePath.split("/")[2] || "root";
      routes.push({ path: basePath, folder });
    }
  }
  return routes;
}

export async function GET(req: Request) {
  // ── P0 FIX: auth-gate ─────────────────────────────────────────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const apiRoot = join(process.cwd(), "src", "app", "api");
  const routes = listRoutes(apiRoot);

  // ── Group by top-level folder ──────────────────────────────────────────
  const byFolder: Record<string, number> = {};
  for (const r of routes) {
    byFolder[r.folder] = (byFolder[r.folder] || 0) + 1;
  }
  const byFolderArr = Object.entries(byFolder)
    .map(([folder, count]) => ({ folder, count }))
    .sort((a, b) => b.count - a.count);

  // ── Rate-limit presets (statically known) ──────────────────────────────
  const rateLimitPresets = {
    ai: { maxRequests: RATE_LIMIT_PRESETS.ai.maxRequests, windowMs: RATE_LIMIT_PRESETS.ai.windowMs },
    newsSearch: { maxRequests: RATE_LIMIT_PRESETS.newsSearch.maxRequests, windowMs: RATE_LIMIT_PRESETS.newsSearch.windowMs },
    posts: { maxRequests: RATE_LIMIT_PRESETS.posts.maxRequests, windowMs: RATE_LIMIT_PRESETS.posts.windowMs },
    news: { maxRequests: RATE_LIMIT_PRESETS.news.maxRequests, windowMs: RATE_LIMIT_PRESETS.news.windowMs },
  };

  // ── Validation-wrapped routes (known from src/lib/api-validation.ts usage) ──
  const validationWrapped = [
    "POST /api/conversations/[id]/messages",
    "POST /api/posts",
    "POST /api/payments/send",
    "POST /api/news/search",
    "POST /api/ai/translate",
  ];

  return NextResponse.json(
    {
      totalRoutes: routes.length,
      byFolder: byFolderArr,
      rateLimitPresets,
      validationWrappedCount: validationWrapped.length,
      validationWrapped,
      routes: routes
        .map(r => ({ path: r.path, folder: r.folder }))
        .sort((a, b) => a.path.localeCompare(b.path)),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

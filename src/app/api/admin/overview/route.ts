// @ts-nocheck
/**
 * GET /api/admin/overview
 * ============================================================================
 * Aggregated top-level dashboard for the CIRKLE Platform Admin Panel.
 *
 * Pulls from:
 *   - /api/health           (system health, uptime, memory, version)
 *   - /api/brain/status     (AI providers, knowledge graph, features)
 *   - /api/aike/status      (Phase 7.5 autonomous intelligence)
 *   - /api/monitoring/errors (error stats)
 *   - Turso DB              (User / Post / CircleGroup / Transaction counts)
 *
 * Returns a single JSON blob the admin "Overview" section can render in one
 * fetch. All sub-fetches are fault-tolerant — if one source is down, the
 * overview still returns with that field nulled out.
 *
 * NOTE: This endpoint is NOT auth-gated during the admin panel building
 * phase. A future iteration will gate it behind an OIDC admin role.
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getErrorStats } from "@/lib/error-monitoring";
import { getEnvStatus } from "@/lib/env-validation";

export const dynamic = "force-dynamic";

async function safeCount<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

const BASE = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export async function GET() {
  const startedAt = Date.now();

  // ── Parallel data fetch ─────────────────────────────────────────────────
  const [
    healthRes, brainRes, aikeRes,
    userCount, postCount, circleCount, transactionCount, memberCount,
    verifiedUsers, anonymousPosts, pendingTransactions,
    errorStats, envStatus,
  ] = await Promise.all([
    fetch(`${BASE}/api/health`).then(r => r.json()).catch(() => null),
    fetch(`${BASE}/api/brain/status`).then(r => r.json()).catch(() => null),
    fetch(`${BASE}/api/aike/status`).then(r => r.json()).catch(() => null),
    safeCount(() => db.user.count()),
    safeCount(() => db.post.count()),
    safeCount(() => db.circleGroup.count()),
    safeCount(() => db.transaction.count()),
    safeCount(() => db.circleMember.count()),
    safeCount(() => db.user.count({ where: { verified: true } })),
    safeCount(() => db.post.count({ where: { NOT: { anonymousId: null } } })),
    safeCount(() => db.transaction.count({ where: { status: "pending" } })),
    Promise.resolve(getErrorStats()),
    Promise.resolve(getEnvStatus()),
  ]);

  // ── Recent signups (last 7 days) ────────────────────────────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentUsers = await safeCount(() =>
    db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  );

  // ── Recent posts (last 24h) ─────────────────────────────────────────────
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentPosts = await safeCount(() =>
    db.post.count({ where: { createdAt: { gte: oneDayAgo } } }),
  );

  // ── Transaction volume (last 30 days, settled only) ─────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const volumeAgg = await safeCount(() =>
    db.transaction.aggregate({
      where: { status: "settled", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
      _avg: { amount: true },
    }),
  );

  // ── Top 5 regions by user count ─────────────────────────────────────────
  const topRegionsRaw = await safeCount(() =>
    db.user.groupBy({
      by: ["region"],
      _count: { _all: true },
      orderBy: { _count: { region: "desc" } },
      take: 5,
    }),
  );

  // ── Top 5 post modules ──────────────────────────────────────────────────
  const topModulesRaw = await safeCount(() =>
    db.post.groupBy({
      by: ["module"],
      _count: { _all: true },
      orderBy: { _count: { module: "desc" } },
      take: 5,
    }),
  );

  const elapsedMs = Date.now() - startedAt;

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      elapsedMs,
      platform: {
        name: "CIRKLE",
        nameAr: "دوائر",
        version: healthRes?.version || "9.0.0",
        tag: "production-stable-2026-08-12",
      },
      health: healthRes
        ? {
            status: healthRes.status,
            uptime: healthRes.uptime,
            memory: healthRes.memory,
          }
        : null,
      brain: brainRes
        ? {
            online: brainRes.online,
            providers: brainRes.providers?.length || 0,
            availableProviders: (brainRes.providers || [])
              .filter((p: any) => p.available)
              .map((p: any) => p.name),
            knowledgeGraph: brainRes.knowledgeGraph,
            features: brainRes.features?.length || 0,
            actions: brainRes.actions?.length || 0,
          }
        : null,
      aike: aikeRes
        ? {
            status: aikeRes.status,
            phase: aikeRes.phase,
            openGaps: aikeRes.openGaps,
            pendingResearch: aikeRes.pendingResearch,
            worldStateEntries: aikeRes.worldStateEntries,
            capabilities: aikeRes.orchestrator?.capabilityStats?.total || 0,
          }
        : null,
      counts: {
        users: userCount,
        posts: postCount,
        circles: circleCount,
        transactions: transactionCount,
        circleMembers: memberCount,
        verifiedUsers,
        anonymousPosts,
        pendingTransactions,
        recentUsers7d: recentUsers,
        recentPosts24h: recentPosts,
      },
      payments: volumeAgg
        ? {
            volume30d: volumeAgg._sum?.amount || 0,
            avgTx30d: volumeAgg._avg?.amount || 0,
            currency: "mixed",
          }
        : null,
      topRegions: (topRegionsRaw || []).map((r: any) => ({
        region: r.region,
        count: r._count?._all || 0,
      })),
      topModules: (topModulesRaw || []).map((m: any) => ({
        module: m.module,
        count: m._count?._all || 0,
      })),
      errors: errorStats,
      env: {
        total: envStatus.total,
        set: envStatus.set,
        missing: envStatus.missing.length,
        missingRequired: envStatus.missingRequired.length,
        allRequiredPresent: envStatus.allRequiredPresent,
        details: envStatus.details,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

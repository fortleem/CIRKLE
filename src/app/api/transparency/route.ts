/**
 * GET /api/transparency — Public transparency / cost dashboard (§3.10).
 *
 * Returns CIRKLE's platform cost + revenue stats + non-targeted ad
 * statistics. Everything returned here is PUBLIC — the blueprint's
 * transparency covenant requires that anyone can see where the money
 * comes from and where it goes.
 *
 * The cost figures are derived from the running platform's actual
 * spend (env-configured budgets + DB-backed ad spend). Revenue is
 * derived from the AdCampaign table (settled spend = revenue) plus
 * workspace fees + affiliate commissions.
 *
 * Privacy posture (§30.4): no user-identifying data. Only aggregates.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Static cost model — operator-configurable via env vars
// ─────────────────────────────────────────────────────────────────────────────
//
// These figures are the platform's monthly cost budget. They're public
// because the transparency covenant requires it — but they're also
// estimates: actual invoices live in the operator's accounting system.
// An operator overrides the defaults via env vars so the dashboard
// reflects their real deployment.

interface CostLine {
  category: string;
  label: string;
  /** Monthly cost in USD. */
  amount: number;
  /** Free-form note for the UI. */
  note: string;
}

interface RevenueLine {
  category: string;
  label: string;
  /** Monthly revenue in USD. */
  amount: number;
  note: string;
}

function envNumber(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return isFinite(n) && n >= 0 ? n : fallback;
}

function costLines(): CostLine[] {
  return [
    { category: "servers", label: "Server costs (VPS + edge)", amount: envNumber("CIRKLE_COST_SERVERS", 4200), note: "Edge nodes + app servers across 5 regions." },
    { category: "ai", label: "AI provider costs", amount: envNumber("CIRKLE_COST_AI", 1800), note: "On-device model fine-tuning + cloud inference fallback." },
    { category: "storage", label: "Object storage + CDN", amount: envNumber("CIRKLE_COST_STORAGE", 950), note: "Media (PeerTube + Lamahat) + WASM bundle CDN." },
    { category: "mail", label: "Mailcow + transactional email", amount: envNumber("CIRKLE_COST_MAIL", 320), note: "Self-hosted Mailcow cluster + SMTP relay." },
    { category: "maps", label: "TileServer GL + OSM tiles", amount: envNumber("CIRKLE_COST_MAPS", 280), note: "Self-hosted vector tiles + OSM data updates." },
    { category: "push", label: "ntfy push server", amount: envNumber("CIRKLE_COST_PUSH", 180), note: "Self-hosted ntfy + FCM/APNs relay." },
    { category: "federation", label: "Matrix Synapse federation", amount: envNumber("CIRKLE_COST_MATRIX", 640), note: "Synapse homeservers across data planes." },
    { category: "compliance", label: "Compliance + legal", amount: envNumber("CIRKLE_COST_COMPLIANCE", 1200), note: "GDPR/DSA filings, DPO retainer, audits." },
    { category: "bandwidth", label: "Bandwidth + egress", amount: envNumber("CIRKLE_COST_BANDWIDTH", 1100), note: "Cloud egress + DDoS scrubbing." },
  ];
}

export async function GET() {
  try {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM

    // ── Cost ──────────────────────────────────────────────────────────
    const costs = costLines();
    const totalCosts = costs.reduce((s, c) => s + c.amount, 0);

    // ── User count ────────────────────────────────────────────────────
    let totalUsers = 0;
    let totalPosts = 0;
    let activeCampaigns = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let adRevenue = 0;
    let workspaceFees = 0;
    let affiliateCommissions = 0;

    try {
      const [userCount, postCount, campaignAgg, affiliateAgg] = await Promise.all([
        db.user.count().catch(() => 0),
        db.post.count().catch(() => 0),
        db.adCampaign.aggregate({
          _sum: { impressions: true, clicks: true, spent: true },
          _count: { _all: true },
        }).catch(() => null),
        db.affiliateSale.aggregate({
          _sum: { commission: true },
          _count: { _all: true },
        }).catch(() => null),
      ]);

      totalUsers = userCount;
      totalPosts = postCount;
      activeCampaigns = campaignAgg?._count?._all ?? 0;
      totalImpressions = campaignAgg?._sum?.impressions ?? 0;
      totalClicks = campaignAgg?._sum?.clicks ?? 0;
      adRevenue = campaignAgg?._sum?.spent ?? 0;
      affiliateCommissions = affiliateAgg?._sum?.commission ?? 0;
    } catch (err) {
      // If the DB is unreachable we still return the static cost model —
      // transparency shouldn't fail because the DB is down.
      logger.warn("[/api/transparency] DB aggregation failed — returning static costs", {
        error: (err as Error).message,
      });
    }

    // ── Revenue ───────────────────────────────────────────────────────
    // Workspace fees (Pro tier) are env-configured — actual invoices
    // live in the operator's Stripe/bank account. We surface the
    // configured estimate so the dashboard always has a number.
    workspaceFees = envNumber("CIRKLE_REV_WORKSPACE", 0);

    const revenue: RevenueLine[] = [
      { category: "ads", label: "Non-targeted local ad revenue", amount: Math.round(adRevenue * 100) / 100, note: "CPM-settled local ads (corporate invoice). No behavioural targeting." },
      { category: "workspace", label: "Workspace / Pro fees", amount: workspaceFees, note: "Optional Pro tier for power users + teams." },
      { category: "affiliate", label: "Affiliate commissions", amount: Math.round(affiliateCommissions * 100) / 100, note: "Creator-attributed affiliate sales (5% default commission)." },
    ];
    const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);

    // ── Non-targeted ad statistics ────────────────────────────────────
    const adStats = {
      model: "non_targeted_local",
      targeting: "country + city + category only",
      profiling: false,
      cookies: false,
      activeCampaigns,
      totalImpressions,
      totalClicks,
      ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
      averageCpm: totalImpressions > 0 ? Math.round((adRevenue / totalImpressions) * 1000 * 100) / 100 : 0,
      disclosure: "All ads are clearly labelled 'Sponsored' + advertiser name. No personalised retargeting.",
    };

    // ── Cost per user ─────────────────────────────────────────────────
    const costPerUser = totalUsers > 0 ? Math.round((totalCosts / totalUsers) * 100) / 100 : 0;
    const revenuePerUser = totalUsers > 0 ? Math.round((totalRevenue / totalUsers) * 100) / 100 : 0;
    const netPerUser = Math.round((revenuePerUser - costPerUser) * 100) / 100;

    // ── Reinvestment ratio (clamp to 0..100) ──────────────────────────
    const reinvestPct = costPerUser > 0
      ? Math.max(0, Math.min(100, Math.round((revenuePerUser / costPerUser) * 100)))
      : 100;

    // ── Public financial report (quarterly summary) ───────────────────
    const quarter = Math.floor(new Date().getMonth() / 3) + 1;
    const year = new Date().getFullYear();
    const financialReport = {
      period: `${year}-Q${quarter}`,
      publishedAt: new Date().toISOString(),
      summary: `CIRKLE is a non-profit-aligned open platform. ${100 - reinvestPct}% of revenue reinvested into infrastructure. No external investors. No data sales.`,
      totals: {
        costs: totalCosts,
        revenue: totalRevenue,
        net: Math.round((totalRevenue - totalCosts) * 100) / 100,
      },
      principles: [
        "No behavioural tracking — ads are non-targeted local context only.",
        "No data sales to third parties — ever.",
        "Financial reports published quarterly with full cost + revenue breakdown.",
        "Surplus revenue is reinvested into infrastructure + creator rewards pool.",
      ],
    };

    return NextResponse.json(
      {
        period,
        generatedAt: new Date().toISOString(),
        costs: { lines: costs, total: totalCosts },
        revenue: { lines: revenue, total: totalRevenue },
        users: { total: totalUsers, posts: totalPosts, costPerUser, revenuePerUser, netPerUser },
        adStats,
        affiliateStats: {
          totalCommissions: affiliateCommissions,
          note: "Affiliate commissions are paid to creators — CIRKLE takes 0% cut.",
        },
        financialReport,
      },
      {
        headers: {
          // 5-minute cache — the numbers don't change fast, and caching
          // keeps the dashboard cheap for the public transparency page.
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      },
    );
  } catch (err) {
    logger.error("[/api/transparency] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to generate transparency report" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Creator earnings dashboard — aggregates CreatorSupport + Subscription rows
// for the calling creator. Returns total earnings, this-month earnings,
// supporters count, top supporters leaderboard, and active subscribers.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * GET /api/creator/earnings?username=<handle>
 *
 * Returns:
 *  {
 *    profile:        CreatorProfile (full, including payoutMethod/Details for owner),
 *    totals:         { allTime, thisMonth, last30d, currency, subscribers, supporters },
 *    topSupporters:  [{ supporter, totalAmount, count, lastAt }],
 *    monthlySubs:    [{ tier, amount, currency, subscriber, status, createdAt }],
 *    recentSupport:  [{ supporter, amount, currency, message, createdAt }],
 *  }
 */
export async function GET(req: NextRequest) {
  try {
    const username = normalizeUsername(req.nextUrl.searchParams.get("username"));
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    // ── Load profile (or build a default stub) ────────────────────────────
    const profile = await db.creatorProfile.upsert({
      where: { username },
      create: { username },
      update: {},
    });

    // ── Aggregate support ledger ──────────────────────────────────────────
    const supportRows = await db.creatorSupport.findMany({
      where: { creator: username },
      orderBy: { createdAt: "desc" },
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOf30d = new Date();
    startOf30d.setDate(startOf30d.getDate() - 30);

    let allTime = 0;
    let thisMonth = 0;
    let last30d = 0;
    const bySupporter = new Map<string, { total: number; count: number; lastAt: Date }>();

    for (const s of supportRows) {
      allTime += s.amount;
      if (s.createdAt >= startOfMonth) thisMonth += s.amount;
      if (s.createdAt >= startOf30d) last30d += s.amount;
      const prev = bySupporter.get(s.supporter);
      if (prev) {
        prev.total += s.amount;
        prev.count += 1;
        if (s.createdAt > prev.lastAt) prev.lastAt = s.createdAt;
      } else {
        bySupporter.set(s.supporter, { total: s.amount, count: 1, lastAt: s.createdAt });
      }
    }

    const topSupporters = Array.from(bySupporter.entries())
      .map(([supporter, v]) => ({
        supporter,
        totalAmount: v.total,
        count: v.count,
        lastAt: v.lastAt.toISOString(),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    // ── Load active subscriptions ─────────────────────────────────────────
    const subs = await db.subscription.findMany({
      where: { creator: username, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    const monthlyRecurring = subs.reduce((sum, s) => sum + s.amount, 0);

    return NextResponse.json({
      profile: {
        username: profile.username,
        verified: profile.verified,
        monetized: profile.monetized,
        tier: profile.tier,
        totalEarnings: profile.totalEarnings,
        totalSupporters: profile.totalSupporters,
        payoutMethod: profile.payoutMethod,
        payoutDetails: profile.payoutDetails,
        basicAmount: profile.basicAmount,
        premiumAmount: profile.premiumAmount,
        vipAmount: profile.vipAmount,
        currency: profile.currency,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      totals: {
        allTime,
        thisMonth,
        last30d,
        currency: profile.currency,
        supporters: bySupporter.size,
        subscribers: subs.length,
        monthlyRecurring,
      },
      topSupporters,
      monthlySubs: subs.map((s) => ({
        id: s.id,
        tier: s.tier,
        amount: s.amount,
        currency: s.currency,
        subscriber: s.subscriber,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      recentSupport: supportRows.slice(0, 20).map((s) => ({
        id: s.id,
        supporter: s.supporter,
        amount: s.amount,
        currency: s.currency,
        message: s.message,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error("[/api/creator/earnings GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load earnings" },
      { status: 500 },
    );
  }
}

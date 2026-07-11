import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Creator subscriptions — POST to subscribe / change tier, GET to list.
// A subscription is a recurring monthly payment from a subscriber to a
// creator. We track the ledger row; a real billing cron would debit monthly.
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TIERS = ["basic", "premium", "vip"] as const;
const VALID_STATUSES = ["active", "cancelled", "expired"] as const;

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * GET /api/creator/subscribe?username=<handle>&direction=subscriber|creator
 * Lists subscriptions. Default direction=subscriber (subscriptions the user
 * pays for). direction=creator returns paying subscribers of the user.
 */
export async function GET(req: NextRequest) {
  try {
    const username = normalizeUsername(req.nextUrl.searchParams.get("username"));
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }
    const direction = req.nextUrl.searchParams.get("direction") === "creator" ? "creator" : "subscriber";

    const where = direction === "creator" ? { creator: username } : { subscriber: username };
    const rows = await db.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      direction,
      subscriptions: rows.map((s) => ({
        id: s.id,
        creator: s.creator,
        subscriber: s.subscriber,
        tier: s.tier,
        amount: s.amount,
        currency: s.currency,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error("[/api/creator/subscribe GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list subscriptions" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/creator/subscribe
 * Body: {
 *   creator: string,
 *   subscriber: string,
 *   tier?: "basic"|"premium"|"vip",  // default basic
 *   amount: number,                   // monthly
 *   currency?: string,                // default SAR
 *   action?: "subscribe"|"cancel",    // default subscribe
 * }
 *
 * - subscribe: upserts the subscription row (active). Changing tier on an
 *   existing sub updates amount + tier in place.
 * - cancel: marks the subscription as cancelled (preserves the ledger row).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const creator = normalizeUsername(body.creator);
    const subscriber = normalizeUsername(body.subscriber);
    if (!creator) return NextResponse.json({ error: "creator is required" }, { status: 400 });
    if (!subscriber) return NextResponse.json({ error: "subscriber is required" }, { status: 400 });
    if (creator === subscriber) {
      return NextResponse.json({ error: "cannot subscribe to yourself" }, { status: 400 });
    }

    const action = body.action === "cancel" ? "cancel" : "subscribe";

    const tier =
      typeof body.tier === "string" && (VALID_TIERS as readonly string[]).includes(body.tier)
        ? body.tier
        : "basic";

    const currency =
      typeof body.currency === "string" && body.currency.length <= 8
        ? body.currency.toUpperCase()
        : "SAR";

    if (action === "cancel") {
      const updated = await db.subscription.updateMany({
        where: { creator, subscriber, status: "active" },
        data: { status: "cancelled" },
      });
      return NextResponse.json({
        ok: true,
        action: "cancel",
        cancelledCount: updated.count,
      });
    }

    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    }
    if (amount > 100_000) {
      return NextResponse.json({ error: "amount too large" }, { status: 400 });
    }

    const sub = await db.subscription.upsert({
      where: { creator_subscriber: { creator, subscriber } },
      create: {
        creator,
        subscriber,
        tier,
        amount,
        currency,
        status: "active",
      },
      update: {
        tier,
        amount,
        currency,
        status: "active",
      },
    });

    return NextResponse.json(
      {
        ok: true,
        subscription: {
          id: sub.id,
          creator: sub.creator,
          subscriber: sub.subscriber,
          tier: sub.tier,
          amount: sub.amount,
          currency: sub.currency,
          status: sub.status,
          createdAt: sub.createdAt.toISOString(),
          updatedAt: sub.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error("[/api/creator/subscribe POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update subscription" },
      { status: 500 },
    );
  }
}

// Helper export for callers that need the valid set.
export const SUBSCRIPTION_TIERS = VALID_TIERS;
export const SUBSCRIPTION_STATUSES = VALID_STATUSES;

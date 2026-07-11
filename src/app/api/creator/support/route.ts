import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Creator support — POST a one-off Commit micropayment from a supporter to a
// creator. The "Commit" link is conceptual: we record the support ledger entry
// and bump the creator's running totals. A real implementation would also
// record the escrow transaction via /api/payments/send — left as a hook here.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * POST /api/creator/support
 * Body: {
 *   creator: string,         // username
 *   supporter: string,       // username
 *   amount: number,          // > 0
 *   currency?: string,       // default SAR
 *   message?: string,        // optional note (≤ 280 chars)
 * }
 *
 * Response: { ok, support: {...}, creator: { updated totals } }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const creator = normalizeUsername(body.creator);
    const supporter = normalizeUsername(body.supporter);

    if (!creator) return NextResponse.json({ error: "creator is required" }, { status: 400 });
    if (!supporter) return NextResponse.json({ error: "supporter is required" }, { status: 400 });
    if (creator === supporter) {
      return NextResponse.json({ error: "cannot support yourself" }, { status: 400 });
    }

    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    }
    if (amount > 1_000_000) {
      return NextResponse.json({ error: "amount too large" }, { status: 400 });
    }

    const currency =
      typeof body.currency === "string" && body.currency.length <= 8
        ? body.currency.toUpperCase()
        : "SAR";

    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim().slice(0, 280)
        : null;

    // Record the support ledger entry.
    const support = await db.creatorSupport.create({
      data: { creator, supporter, amount, currency, message },
    });

    // Bump the creator's running totals. If the creator has no profile yet,
    // we create a stub so the totals have somewhere to live.
    const profile = await db.creatorProfile.upsert({
      where: { username: creator },
      create: {
        username: creator,
        totalEarnings: amount,
        totalSupporters: 1,
        currency,
      },
      update: {
        totalEarnings: { increment: amount },
        totalSupporters: { increment: 1 },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        support: {
          id: support.id,
          creator: support.creator,
          supporter: support.supporter,
          amount: support.amount,
          currency: support.currency,
          message: support.message,
          createdAt: support.createdAt.toISOString(),
        },
        creator: {
          username: profile.username,
          totalEarnings: profile.totalEarnings,
          totalSupporters: profile.totalSupporters,
          tier: profile.tier,
          monetized: profile.monetized,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error("[/api/creator/support POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to record support" },
      { status: 500 },
    );
  }
}

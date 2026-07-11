import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Creator profile — GET any creator's public profile, POST create/update own.
// All amounts are stored as floats; the client renders them with the chosen
// currency. We treat `payoutDetails` as opaque — the server never inspects it.
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TIERS = ["bronze", "silver", "gold", "platinum"] as const;
const VALID_PAYOUT_METHODS = ["cirkle_pay", "bank", "crypto"] as const;

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * GET /api/creator/profile?username=<handle>
 * Returns the public creator profile. If the creator has no profile row yet,
 * returns a default-shaped profile (monetized=false, tier="bronze") so the
 * client can render the Support sheet without a 404.
 */
export async function GET(req: NextRequest) {
  try {
    const username = normalizeUsername(req.nextUrl.searchParams.get("username"));
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    const profile = await db.creatorProfile.findUnique({ where: { username } });

    if (!profile) {
      // Return a sensible default so the client can render the Support sheet
      // even for creators who haven't opted in yet.
      return NextResponse.json({
        username,
        verified: false,
        monetized: false,
        tier: "bronze",
        totalEarnings: 0,
        totalSupporters: 0,
        payoutMethod: null,
        basicAmount: 5,
        premiumAmount: 20,
        vipAmount: 100,
        currency: "SAR",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Strip payoutDetails from the public response (treat as private).
    return NextResponse.json({
      username: profile.username,
      verified: profile.verified,
      monetized: profile.monetized,
      tier: profile.tier,
      totalEarnings: profile.totalEarnings,
      totalSupporters: profile.totalSupporters,
      payoutMethod: profile.payoutMethod,
      // For the owner, the client can call /api/creator/earnings to get the
      // full payout setup. For other viewers, only the method is exposed.
      basicAmount: profile.basicAmount,
      premiumAmount: profile.premiumAmount,
      vipAmount: profile.vipAmount,
      currency: profile.currency,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    });
  } catch (err) {
    logger.error("[/api/creator/profile GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load creator profile" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/creator/profile
 * Body: {
 *   username: string,           // the creator's own username
 *   monetized?: boolean,
 *   tier?: "bronze"|"silver"|"gold"|"platinum",
 *   verified?: boolean,         // only true→true is honored (mock verify)
 *   basicAmount?, premiumAmount?, vipAmount?: number,
 *   currency?: string,
 *   payoutMethod?: "cirkle_pay"|"bank"|"crypto"|null,
 *   payoutDetails?: string|null, // opaque JSON blob (encrypted at rest by client)
 * }
 * Creates or updates the creator profile.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const username = normalizeUsername(body.username);
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    // ── Build the update payload ──────────────────────────────────────────
    const data: Record<string, unknown> = {};

    if (typeof body.monetized === "boolean") data.monetized = body.monetized;

    if (typeof body.tier === "string" && (VALID_TIERS as readonly string[]).includes(body.tier)) {
      data.tier = body.tier;
    }

    // Allow turning verification ON but never OFF via this route (mock).
    if (body.verified === true) data.verified = true;

    for (const field of ["basicAmount", "premiumAmount", "vipAmount"] as const) {
      const v = body[field];
      if (typeof v === "number" && isFinite(v) && v >= 0) data[field] = v;
    }

    if (typeof body.currency === "string" && body.currency.length <= 8) {
      data.currency = body.currency.toUpperCase();
    }

    if (body.payoutMethod === null || (typeof body.payoutMethod === "string" && (VALID_PAYOUT_METHODS as readonly string[]).includes(body.payoutMethod))) {
      data.payoutMethod = body.payoutMethod;
    }

    if (typeof body.payoutDetails === "string" && body.payoutDetails.length <= 4096) {
      data.payoutDetails = body.payoutDetails;
    } else if (body.payoutDetails === null) {
      data.payoutDetails = null;
    }

    // Upsert so first-time setup just works.
    const profile = await db.creatorProfile.upsert({
      where: { username },
      create: {
        username,
        ...(data as Record<string, never>),
      },
      update: data as Record<string, never>,
    });

    return NextResponse.json({
      ok: true,
      profile: {
        username: profile.username,
        verified: profile.verified,
        monetized: profile.monetized,
        tier: profile.tier,
        totalEarnings: profile.totalEarnings,
        totalSupporters: profile.totalSupporters,
        payoutMethod: profile.payoutMethod,
        basicAmount: profile.basicAmount,
        premiumAmount: profile.premiumAmount,
        vipAmount: profile.vipAmount,
        currency: profile.currency,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    logger.error("[/api/creator/profile POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update creator profile" },
      { status: 500 },
    );
  }
}

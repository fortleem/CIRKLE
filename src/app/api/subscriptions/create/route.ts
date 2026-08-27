// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createSubscriptionTier } from "@/lib/creator-subscriptions";
import { logger } from "@/lib/logger";

/**
 * POST /api/subscriptions/create
 * Body: { creatorId, name, price, currency?, perks?: string[] }
 * Creates a new subscription tier for a creator.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const tier = await createSubscriptionTier({
      creatorId: typeof body.creatorId === "string" ? body.creatorId : "",
      name: typeof body.name === "string" ? body.name : "",
      price: typeof body.price === "number" ? body.price : 0,
      currency: typeof body.currency === "string" ? body.currency : "USD",
      perks: Array.isArray(body.perks) ? (body.perks as string[]) : [],
    });
    logger.info("[/api/subscriptions/create POST] tier created", { id: tier.id, creatorId: tier.creatorId });
    return NextResponse.json({ tier }, { status: 201 });
  } catch (err) {
    logger.error("[/api/subscriptions/create POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create subscription tier" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { verifyTicket } from "@/lib/ticketing";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Decentralised Ticketing — verify a ticket signature. Blueprint §26.7.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/tickets/verify
 * Body: {
 *   signature: string (hex),
 *   ticket: { eventName, eventDate, venue, seat, holder, price, currency, issuer }
 * }
 *
 * Returns `{ valid: boolean }`. Verification is offline — it only checks the
 * Ed25519 signature against the issuer's public key, never touches the DB.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const signature = typeof body.signature === "string" ? body.signature.trim() : "";
    if (!signature) return NextResponse.json({ error: "signature is required" }, { status: 400 });

    const t = body.ticket as Record<string, unknown> | undefined;
    if (!t || typeof t !== "object") {
      return NextResponse.json({ error: "ticket is required" }, { status: 400 });
    }

    const ticketData = {
      eventName: typeof t.eventName === "string" ? t.eventName : "",
      eventDate: typeof t.eventDate === "string" ? t.eventDate : "",
      venue: typeof t.venue === "string" ? t.venue : "",
      seat: typeof t.seat === "string" ? t.seat : "",
      holder: typeof t.holder === "string" ? t.holder : "",
      price: typeof t.price === "number" ? t.price : Number(t.price),
      currency: typeof t.currency === "string" ? t.currency : "SAR",
      issuer: typeof t.issuer === "string" ? t.issuer : "",
    };

    const valid = await verifyTicket(signature, ticketData);
    return NextResponse.json({ valid });
  } catch (err) {
    logger.error("[/api/tickets/verify POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to verify ticket" },
      { status: 500 },
    );
  }
}

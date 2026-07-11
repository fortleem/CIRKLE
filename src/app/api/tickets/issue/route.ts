import { NextRequest, NextResponse } from "next/server";
import { issueTicket, getIssuerPublicKey } from "@/lib/ticketing";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Decentralised Ticketing — issue a signed Ed25519 ticket. Blueprint §26.7.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * POST /api/tickets/issue
 * Body: {
 *   eventName, eventDate (ISO), venue, seat, holder, price, currency, issuer
 * }
 *
 * Returns the signed ticket. The signature is Ed25519 over the canonical
 * ticket payload — verifiable offline by anyone holding the issuer's public
 * key (returned by GET /api/tickets/issue).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const eventName = typeof body.eventName === "string" ? body.eventName : "";
    const venue = typeof body.venue === "string" ? body.venue : "";
    const seat = typeof body.seat === "string" ? body.seat : "";
    const eventDate = typeof body.eventDate === "string" ? body.eventDate : "";
    const holder = normalizeUsername(body.holder);
    const issuer = normalizeUsername(body.issuer);
    const price = typeof body.price === "number" ? body.price : Number(body.price);
    const currency = typeof body.currency === "string" ? body.currency : "SAR";

    if (!holder) return NextResponse.json({ error: "holder is required" }, { status: 400 });
    if (!issuer) return NextResponse.json({ error: "issuer is required" }, { status: 400 });

    const ticket = await issueTicket({
      eventName,
      eventDate,
      venue,
      seat,
      holder,
      price,
      currency,
      issuer,
    });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to issue ticket";
    logger.error("[/api/tickets/issue POST] error", { error: msg });
    const isUserError = msg.includes("must be") || msg.includes("required") || msg.includes("valid");
    return NextResponse.json({ error: msg }, { status: isUserError ? 400 : 500 });
  }
}

/**
 * GET /api/tickets/issue
 * Returns the issuer's Ed25519 public key (SPKI DER, base64) so external
 * verifiers can validate tickets without a DB lookup.
 */
export async function GET() {
  try {
    const publicKey = getIssuerPublicKey();
    return NextResponse.json({ algorithm: "ed25519", publicKey });
  } catch (err) {
    logger.error("[/api/tickets/issue GET] error", { error: (err as Error).message });
    return NextResponse.json({ error: "failed to read issuer key" }, { status: 500 });
  }
}

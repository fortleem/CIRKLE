import { NextRequest, NextResponse } from "next/server";
import { listMyTickets, getIssuerPublicKey } from "@/lib/ticketing";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Decentralised Ticketing — list the requesting user's tickets. Blueprint §26.7.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * GET /api/tickets/my?username=<handle>
 * Returns the user's tickets + the issuer's public key (so the wallet can
 * show a "verified" badge locally).
 */
export async function GET(req: NextRequest) {
  try {
    const username = normalizeUsername(req.nextUrl.searchParams.get("username"));
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }
    const [tickets, issuerPublicKey] = await Promise.all([
      listMyTickets(username),
      Promise.resolve(getIssuerPublicKey()),
    ]);
    return NextResponse.json({ tickets, issuerPublicKey });
  } catch (err) {
    logger.error("[/api/tickets/my GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list tickets" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { generateMigrationQR } from "@/lib/backup-migrate";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Phone Migration — generate a one-time migration QR token. Blueprint §27.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * POST /api/backup/migrate
 * Body: { username: string }
 * Returns: { qrData: string, expiresAt: string }
 *
 * The QR token is an HMAC-signed `cirkle://migrate?payload=…&sig=…` URL
 * valid for 10 minutes. The new phone scans it, the migration handshake
 * follows.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const username = normalizeUsername(body.username);
    if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });

    const result = await generateMigrationQR(username);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to generate migration QR";
    logger.error("[/api/backup/migrate POST] error", { error: msg });
    const isUserError = msg.includes("required");
    return NextResponse.json({ error: msg }, { status: isUserError ? 400 : 500 });
  }
}

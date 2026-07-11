import { NextRequest, NextResponse } from "next/server";
import { createBackup } from "@/lib/backup-migrate";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Phone Migration & Encrypted Backup — create an encrypted backup blob.
// Blueprint §27.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * POST /api/backup/create
 * Body: { username: string, passphrase: string }
 * Returns: { encrypted: string, size: number }
 *
 * The server only ever holds the ciphertext — without the passphrase the
 * data is unrecoverable. The client should download the blob and store it
 * offline (or post it to a new phone via the migration QR flow).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const username = normalizeUsername(body.username);
    if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });
    const passphrase = typeof body.passphrase === "string" ? body.passphrase : "";
    if (!passphrase) return NextResponse.json({ error: "passphrase is required" }, { status: 400 });

    const result = await createBackup(username, passphrase);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to create backup";
    logger.error("[/api/backup/create POST] error", { error: msg });
    const isUserError = msg.includes("must be") || msg.includes("required");
    return NextResponse.json({ error: msg }, { status: isUserError ? 400 : 500 });
  }
}

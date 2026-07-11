import { NextRequest, NextResponse } from "next/server";
import { restoreBackup } from "@/lib/backup-migrate";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Phone Migration & Encrypted Backup — decrypt + restore a backup blob.
// Blueprint §27.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/backup/restore
 * Body: { encrypted: string, passphrase: string }
 * Returns: { payload: BackupPayload }
 *
 * Decryption happens entirely server-side using the passphrase supplied in
 * the request — the server never stores the passphrase. A wrong passphrase
 * or tampered blob fails the GCM auth tag check and returns 400.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const encrypted = typeof body.encrypted === "string" ? body.encrypted : "";
    if (!encrypted) return NextResponse.json({ error: "encrypted blob is required" }, { status: 400 });
    const passphrase = typeof body.passphrase === "string" ? body.passphrase : "";
    if (!passphrase) return NextResponse.json({ error: "passphrase is required" }, { status: 400 });

    const payload = await restoreBackup(encrypted, passphrase);
    return NextResponse.json({ payload });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to restore backup";
    logger.error("[/api/backup/restore POST] error", { error: msg });
    const isUserError =
      msg.includes("required") ||
      msg.includes("Malformed") ||
      msg.includes("wrong passphrase") ||
      msg.includes("checksum") ||
      msg.includes("Unrecognised");
    return NextResponse.json({ error: msg }, { status: isUserError ? 400 : 500 });
  }
}

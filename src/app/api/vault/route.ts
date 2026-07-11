import { NextRequest, NextResponse } from "next/server";
import { createVaultItem, listVaultItems } from "@/lib/family-vault";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Family Vault — list + upload encrypted items. Blueprint §26.6.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * GET /api/vault?familyId=<id>
 * Lists encrypted vault items for a family.
 */
export async function GET(req: NextRequest) {
  try {
    const familyId = req.nextUrl.searchParams.get("familyId");
    if (!familyId) {
      return NextResponse.json({ error: "familyId is required" }, { status: 400 });
    }
    const items = await listVaultItems(familyId);
    return NextResponse.json({ items });
  } catch (err) {
    logger.error("[/api/vault GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list vault items" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/vault
 * Body: { familyId, type, title, encryptedData, uploadedBy }
 *
 * `encryptedData` is AES-256-GCM ciphertext produced on the client. The
 * server never sees the plaintext or the family passphrase.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const familyId = typeof body.familyId === "string" ? body.familyId.trim() : "";
    const type = typeof body.type === "string" ? body.type : "";
    const title = typeof body.title === "string" ? body.title : "";
    const encryptedData = typeof body.encryptedData === "string" ? body.encryptedData : "";
    const uploadedBy = normalizeUsername(body.uploadedBy);
    if (!uploadedBy) return NextResponse.json({ error: "uploadedBy is required" }, { status: 400 });

    const item = await createVaultItem({ familyId, type, title, encryptedData, uploadedBy });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to upload vault item";
    logger.error("[/api/vault POST] error", { error: msg });
    const isUserError =
      msg.includes("must be") || msg.includes("required") || msg.includes("not a member") || msg.includes("not found");
    return NextResponse.json({ error: msg }, { status: isUserError ? 400 : 500 });
  }
}

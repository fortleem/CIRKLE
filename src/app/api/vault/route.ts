// @ts-nocheck
// P1 FIX: Rate-limited (10/min — posts preset) + Zod-validated POST body.
import { NextRequest, NextResponse } from "next/server";
import { createVaultItem, listVaultItems } from "@/lib/family-vault";
import { logger } from "@/lib/logger";
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/api-rate-limit";
import { validateBody, z } from "@/lib/api-validation";

// ─────────────────────────────────────────────────────────────────────────────
// Family Vault — list + upload encrypted items. Blueprint §26.6.
//
// P1 FIX — both handlers wrapped with `withRateLimit` (10 req/min — posts
// preset, anti-abuse on encrypted-blob uploads) and `validateBody` on
// POST so malformed vault items return 400 before `createVaultItem` runs.
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
 *
 * P1 FIX — wrapped with `withRateLimit` (10 req/min — posts preset).
 */
export const GET = withRateLimit(
  async (req: NextRequest) => {
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
  },
  RATE_LIMIT_PRESETS.posts,
);

/**
 * Zod schema for `POST /api/vault`.
 *   - `familyId` is required (1–128 chars).
 *   - `type` is required (1–64 chars — content-type label).
 *   - `title` is required (1–256 chars).
 *   - `encryptedData` is required ciphertext (1–1_000_000 chars — AES-256-GCM
 *     blobs can be sizeable).
 *   - `uploadedBy` is required (1–64 chars — owner handle).
 */
const vaultUploadSchema = z.object({
  familyId: z.string().min(1).max(128),
  type: z.string().min(1).max(64),
  title: z.string().min(1).max(256),
  encryptedData: z.string().min(1).max(1_000_000),
  uploadedBy: z.string().min(1).max(64),
});

/**
 * POST /api/vault
 * Body: { familyId, type, title, encryptedData, uploadedBy }
 *
 * `encryptedData` is AES-256-GCM ciphertext produced on the client. The
 * server never sees the plaintext or the family passphrase.
 *
 * P1 FIX — wrapped with `withRateLimit` (10 req/min — posts preset) and
 * `validateBody` so malformed uploads return 400 before persisting.
 */
export const POST = withRateLimit(
  validateBody(vaultUploadSchema, async (req, body) => {
    try {
      const uploadedBy = normalizeUsername(body.uploadedBy);
      if (!uploadedBy) {
        return NextResponse.json({ error: "uploadedBy is required" }, { status: 400 });
      }

      const item = await createVaultItem({
        familyId: body.familyId,
        type: body.type,
        title: body.title,
        encryptedData: body.encryptedData,
        uploadedBy,
      });
      return NextResponse.json({ item }, { status: 201 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "failed to upload vault item";
      logger.error("[/api/vault POST] error", { error: msg });
      const isUserError =
        msg.includes("must be") || msg.includes("required") || msg.includes("not a member") || msg.includes("not found");
      return NextResponse.json({ error: msg }, { status: isUserError ? 400 : 500 });
    }
  }),
  RATE_LIMIT_PRESETS.posts,
);

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getAttestations, revokeAttestation, exportAttestation } from "@/lib/identity";

/**
 * GET /api/identity/list?username=<username>
 *
 * List all attestations for a user (verified + revoked). Sorted by
 * issuedAt desc. Used by the Cirkle Identity wallet UI.
 *
 * Query:
 *   username: string (required) — the Cirkle username (without @cirkle).
 *
 * Response: { attestations: Attestation[] }
 */
export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get("username");
    if (!username) {
      return NextResponse.json({ error: "username query parameter is required" }, { status: 400 });
    }
    const attestations = await getAttestations(username);
    return NextResponse.json({ ok: true, attestations });
  } catch (err) {
    logger.error("[/api/identity/list] error", { error: (err as Error).message });
    return NextResponse.json(
      { ok: false, attestations: [], error: err instanceof Error ? err.message : "failed to list" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/identity/list?id=<attestationId>
 *
 * Revoke an attestation (mark as revoked — chain of custody preserved).
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
    }
    await revokeAttestation(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[/api/identity/list DELETE] error", { error: (err as Error).message });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed to revoke" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/identity/list
 *
 * Export an attestation as a signed JWT (for third-party presentation).
 * Body: { id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const exported = await exportAttestation(id);
    if (!exported) {
      return NextResponse.json(
        { ok: false, error: "Attestation not found, revoked, or expired" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, ...exported });
  } catch (err) {
    logger.error("[/api/identity/list POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed to export" },
      { status: 500 },
    );
  }
}

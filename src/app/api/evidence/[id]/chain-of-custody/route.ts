// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getChainOfCustody } from "@/lib/evidence-immutability";

/**
 * GET /api/evidence/[id]/chain-of-custody
 *
 * Returns the full chain of custody for an evidence item:
 *   source → record → ingestion → transformation → linkage → analysis → report
 *
 * Also returns the access audit log (who viewed / downloaded / exported) and
 * the parent / children derived evidence relationships.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const data = getChainOfCustody(id);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

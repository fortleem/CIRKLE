/** GET /api/cie/discover — discovery queries for UOB/TEE/LIEE/admin. */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { globalCIEEngine } = await import("@/lib/cie");
  const { searchParams } = new URL(req.url);
  const result = await globalCIEEngine.discovery.discover({
    text: searchParams.get("q") || undefined,
    type: (searchParams.get("type") as never) || undefined,
    category: searchParams.get("category") || undefined,
    country: searchParams.get("country") || undefined,
    partner: searchParams.get("partner") || undefined,
    status: searchParams.get("status") || undefined,
    limit: parseInt(searchParams.get("limit") || "50", 10),
  });
  return NextResponse.json(result);
}

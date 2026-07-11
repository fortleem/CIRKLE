import { NextRequest, NextResponse } from "next/server";
import { discoverLocalNewsSources } from "@/lib/cirkle-brain";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") || "EG";
  const city = searchParams.get("city") || undefined;
  try { const sources = await discoverLocalNewsSources(country, city); return NextResponse.json({ sources }); }
  catch { return NextResponse.json({ sources: [] }); }
}

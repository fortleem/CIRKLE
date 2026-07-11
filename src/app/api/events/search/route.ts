import { NextRequest, NextResponse } from "next/server";
import { searchEvents } from "@/lib/cirkle-brain";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "";
  const country = searchParams.get("country") || "EG";
  const category = searchParams.get("category") || undefined;
  try { const events = await searchEvents({ city, country, category }); return NextResponse.json({ events }); }
  catch { return NextResponse.json({ error: "event search failed" }, { status: 500 }); }
}

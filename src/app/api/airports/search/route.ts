import { NextRequest, NextResponse } from "next/server";
import { searchAirports } from "@/lib/cirkle-brain";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q) return NextResponse.json({ airports: [] });
  try { const airports = searchAirports(q); return NextResponse.json({ airports }); }
  catch { return NextResponse.json({ airports: [] }); }
}

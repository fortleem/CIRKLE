import { NextRequest, NextResponse } from "next/server";
import { searchFlights } from "@/lib/cirkle-brain";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || ""; const to = searchParams.get("to") || "";
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const passengers = parseInt(searchParams.get("passengers") || "1");
  const cabinClass = (searchParams.get("cabinClass") || "economy") as "economy" | "premium" | "business" | "first";
  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });
  try { const flights = await searchFlights({ from, to, date, passengers, cabinClass }); return NextResponse.json({ flights }); }
  catch { return NextResponse.json({ error: "flight search failed" }, { status: 500 }); }
}

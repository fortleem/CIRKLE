import { NextRequest, NextResponse } from "next/server";
import { searchHotels } from "@/lib/cirkle-brain";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || ""; const country = searchParams.get("country") || "EG";
  const checkIn = searchParams.get("checkIn") || new Date().toISOString().slice(0, 10);
  const checkOut = searchParams.get("checkOut") || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const guests = parseInt(searchParams.get("guests") || "2"); const rooms = parseInt(searchParams.get("rooms") || "1");
  if (!city) return NextResponse.json({ error: "city required" }, { status: 400 });
  try { const hotels = await searchHotels({ city, country, checkIn, checkOut, guests, rooms }); return NextResponse.json({ hotels }); }
  catch { return NextResponse.json({ error: "hotel search failed" }, { status: 500 }); }
}

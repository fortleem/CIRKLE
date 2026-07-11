import { NextRequest, NextResponse } from "next/server";
import { generatePackingList } from "@/lib/cirkle-brain";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const destination = searchParams.get("destination") || ""; const country = searchParams.get("country") || "EG";
  const duration = parseInt(searchParams.get("duration") || "5");
  const purpose = (searchParams.get("purpose") || "leisure") as "leisure" | "business" | "religious" | "adventure";
  try { const list = await generatePackingList({ destination, country, duration, purpose }); return NextResponse.json(list); }
  catch { return NextResponse.json({ error: "packing list failed" }, { status: 500 }); }
}

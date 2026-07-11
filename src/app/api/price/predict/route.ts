import { NextRequest, NextResponse } from "next/server";
import { predictPrice } from "@/lib/cirkle-brain";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "flight") as "flight" | "hotel";
  const route = searchParams.get("route") || ""; const date = searchParams.get("date") || "";
  const currentPrice = parseInt(searchParams.get("currentPrice") || "0"); const currency = searchParams.get("currency") || "USD";
  try { const prediction = await predictPrice({ type, route, date, currentPrice, currency }); return NextResponse.json(prediction); }
  catch { return NextResponse.json({ error: "prediction failed" }, { status: 500 }); }
}

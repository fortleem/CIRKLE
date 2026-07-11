import { NextRequest, NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/cirkle-brain";
export async function GET(req: NextRequest) {
  const base = req.nextUrl.searchParams.get("base") || "USD";
  try { const rates = await getExchangeRates(base); return NextResponse.json({ base, rates }); }
  catch { return NextResponse.json({ error: "currency fetch failed" }, { status: 500 }); }
}

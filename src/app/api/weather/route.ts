import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/ai";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  if (!city) return NextResponse.json({ error: "city required" }, { status: 400 });
  return NextResponse.json(await getWeather(city));
}

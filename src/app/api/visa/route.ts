import { NextRequest, NextResponse } from "next/server";
import { checkVisaRequirement } from "@/lib/visa-service";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const passport = (searchParams.get("passport") || "SA").toUpperCase();
  const destination = (searchParams.get("destination") || "").toUpperCase();
  if (!destination) return NextResponse.json({ error: "destination required" }, { status: 400 });
  try { const result = await checkVisaRequirement(passport, destination); return NextResponse.json(result); }
  catch { return NextResponse.json({ error: "visa lookup failed" }, { status: 500 }); }
}

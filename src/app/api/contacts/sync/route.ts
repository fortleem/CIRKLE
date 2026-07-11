import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  try { const { phones } = await req.json(); if (!phones || !Array.isArray(phones)) return NextResponse.json({ error: "phones array required" }, { status: 400 });
  return NextResponse.json({ matched: [], message: "Contact sync not yet available — no phone numbers stored in Cirkle" }); }
  catch { return NextResponse.json({ error: "sync failed" }, { status: 500 }); }
}

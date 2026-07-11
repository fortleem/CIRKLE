import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function POST(req: NextRequest) {
  try {
    const { caseId } = await req.json();
    if (!caseId) return NextResponse.json({ error: "caseId required" }, { status: 400 });
    await db.shieldReport.update({ where: { id: caseId }, data: { deadManLastCheckIn: new Date() } });
    return NextResponse.json({ ok: true, message: "Check-in received. Dead man's switch reset." });
  } catch {
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  }
}

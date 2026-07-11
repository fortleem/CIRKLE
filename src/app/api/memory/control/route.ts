import { NextRequest, NextResponse } from "next/server";
import { globalPMB } from "@/lib/personal-memory-brain";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, action } = body;
  if (!userId || !action) return NextResponse.json({ error: "userId and action required" }, { status: 400 });

  if (action === "pause") { globalPMB.pauseCollection(userId); return NextResponse.json({ ok: true, paused: true }); }
  if (action === "resume") { globalPMB.resumeCollection(userId); return NextResponse.json({ ok: true, paused: false }); }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { checkDeadManSwitches } from "@/lib/shield-engine";
export async function GET() {
  try {
    const triggered = await checkDeadManSwitches();
    return NextResponse.json({ triggered, count: triggered.length });
  } catch {
    return NextResponse.json({ triggered: [], count: 0 });
  }
}

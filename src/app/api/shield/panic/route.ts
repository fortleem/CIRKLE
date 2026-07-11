import { NextRequest, NextResponse } from "next/server";
import { triggerPanicWipe } from "@/lib/shield-engine";
export async function POST(req: NextRequest) {
  try {
    const { caseId } = await req.json();
    const panic = triggerPanicWipe();
    // Mark all reports from this session as auto-published
    if (caseId) {
      try {
        const { db } = await import("@/lib/db");
        await db.shieldReport.update({
          where: { id: caseId },
          data: { status: "auto-published", deadManTriggered: true },
        });
      } catch {}
    }
    return NextResponse.json(panic);
  } catch {
    return NextResponse.json({ error: "Panic mode failed" }, { status: 500 });
  }
}

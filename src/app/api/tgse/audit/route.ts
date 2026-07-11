/** GET /api/tgse/audit — query audit records (recent, by target, by event). */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { globalTGSEEngine } = await import("@/lib/tgse");
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "recent";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 500);

  if (action === "recent") {
    return NextResponse.json({ records: globalTGSEEngine.audit.getRecent(limit) });
  }
  if (action === "stats") {
    return NextResponse.json(globalTGSEEngine.audit.getStats());
  }
  if (action === "integrity") {
    return NextResponse.json(globalTGSEEngine.audit.verifyIntegrity());
  }
  if (action === "by-target") {
    const target = searchParams.get("target");
    if (!target) return NextResponse.json({ error: "target parameter required" }, { status: 400 });
    return NextResponse.json({ records: globalTGSEEngine.audit.getByTarget(target as never) });
  }
  if (action === "by-event") {
    const eventType = searchParams.get("event");
    if (!eventType) return NextResponse.json({ error: "event parameter required" }, { status: 400 });
    return NextResponse.json({ records: globalTGSEEngine.audit.getByEvent(eventType as never) });
  }
  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

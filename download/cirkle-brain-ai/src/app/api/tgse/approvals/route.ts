/**
 * GET /api/tgse/approvals — list pending approvals + stats.
 * POST /api/tgse/approvals — approve/reject/escalate an approval request.
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { globalTGSEEngine } = await import("@/lib/tgse");
  return NextResponse.json({
    pending: globalTGSEEngine.approval.listPending(),
    stats: globalTGSEEngine.approval.getStats(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { globalTGSEEngine } = await import("@/lib/tgse");
    const action = body.action as string;
    const requestId = body.requestId as string;
    const approver = body.approver as string;
    const notes = body.notes as string | undefined;

    if (!action || !requestId) {
      return NextResponse.json({ error: "action and requestId required" }, { status: 400 });
    }

    let result;
    switch (action) {
      case "approve":
        if (!approver) return NextResponse.json({ error: "approver required" }, { status: 400 });
        result = globalTGSEEngine.approval.approve(requestId, approver, notes);
        break;
      case "reject":
        if (!approver) return NextResponse.json({ error: "approver required" }, { status: 400 });
        result = globalTGSEEngine.approval.reject(requestId, approver, notes);
        break;
      case "escalate":
        result = globalTGSEEngine.approval.escalate(requestId);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ error: "Approval request not found or not pending" }, { status: 404 });
    }

    // Audit the approval decision.
    globalTGSEEngine.audit.record({
      eventType: "approval-decided",
      target: result.target,
      decision: result.status === "approved" ? "approve" : result.status === "rejected" ? "deny" : undefined,
      description: `Approval ${result.status} for ${result.target} by ${approver || "system"}: ${notes || "(no notes)"}`,
      data: { requestId, action, approver, notes },
    });

    return NextResponse.json({ success: true, approval: result });
  } catch (err) {
    return NextResponse.json(
      { error: "Approval action failed", detail: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}

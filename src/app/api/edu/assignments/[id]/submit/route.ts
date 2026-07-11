import { NextRequest, NextResponse } from "next/server";
import { submitWork, listSubmissionsForAssignment, getAssignment } from "@/lib/education";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/edu/assignments/[id]/submit
// Returns the assignment + all submissions for it (teacher view).
// Optional `?student=<user>` returns just that student's submission.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "assignment id is required" }, { status: 400 });

    const assignment = await getAssignment(id);
    if (!assignment) return NextResponse.json({ error: "assignment not found" }, { status: 404 });

    const submissions = await listSubmissionsForAssignment(id);
    return NextResponse.json({ assignment, submissions });
  } catch (err) {
    logger.error("[/api/edu/assignments/[id]/submit GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load submissions" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/edu/assignments/[id]/submit
// Body: { studentUsername: string, content: string }
// Submits (or updates) the student's work for the assignment.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "assignment id is required" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const submission = await submitWork({
      assignmentId: id,
      studentUsername: String(body.studentUsername || ""),
      content: String(body.content || ""),
    });
    return NextResponse.json({ ok: true, submission }, { status: 201 });
  } catch (err) {
    logger.error("[/api/edu/assignments/[id]/submit POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to submit work" },
      { status: 500 },
    );
  }
}

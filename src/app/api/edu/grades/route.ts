import { NextRequest, NextResponse } from "next/server";
import { publishGrade, listStudentSubmissions, listSubmissionsForAssignment } from "@/lib/education";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/edu/grades
//   ?student=<user>            → all graded submissions for the student
//   ?assignmentId=<id>         → all submissions (with grades) for an assignment
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const student = req.nextUrl.searchParams.get("student");
    const assignmentId = req.nextUrl.searchParams.get("assignmentId");

    if (student) {
      const submissions = await listStudentSubmissions(student);
      return NextResponse.json({ submissions });
    }
    if (assignmentId) {
      const submissions = await listSubmissionsForAssignment(assignmentId);
      return NextResponse.json({ submissions });
    }
    return NextResponse.json(
      { error: "student or assignmentId is required" },
      { status: 400 },
    );
  } catch (err) {
    logger.error("[/api/edu/grades GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load grades" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/edu/grades
// Body: { assignmentId, studentUsername, grade: number, feedback?: string, gradedBy }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const submission = await publishGrade({
      assignmentId: String(body.assignmentId || ""),
      studentUsername: String(body.studentUsername || ""),
      grade: Number(body.grade),
      feedback: typeof body.feedback === "string" ? body.feedback : undefined,
      gradedBy: String(body.gradedBy || ""),
    });
    return NextResponse.json({ ok: true, submission }, { status: 201 });
  } catch (err) {
    logger.error("[/api/edu/grades POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to publish grade" },
      { status: 500 },
    );
  }
}

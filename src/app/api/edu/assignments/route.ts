import { NextRequest, NextResponse } from "next/server";
import {
  createAssignment,
  listAssignmentsForClass,
  listTeacherClasses,
  listStudentClasses,
  createClass,
  getClass,
  type CreateClassOpts,
} from "@/lib/education";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/edu/assignments
//
// Three modes (mutually exclusive — first match wins):
//   ?classId=<id>     → { assignments: [...] }  for one class
//   ?teacher=<user>   → { classes: [...] }      teacher's classes
//   ?student=<user>   → { classes: [...] }      student's enrolled classes
//
// This overload keeps the gradebook overlay's class list + assignment list
// behind a single endpoint, so the screen only needs one fetch hook.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const classId = sp.get("classId");
    const teacher = sp.get("teacher");
    const student = sp.get("student");

    if (classId) {
      const cls = await getClass(classId);
      const assignments = await listAssignmentsForClass(classId);
      return NextResponse.json({ class: cls, assignments });
    }
    if (teacher) {
      const classes = await listTeacherClasses(teacher);
      return NextResponse.json({ classes });
    }
    if (student) {
      const classes = await listStudentClasses(student);
      return NextResponse.json({ classes });
    }
    return NextResponse.json(
      { error: "classId, teacher, or student is required" },
      { status: 400 },
    );
  } catch (err) {
    logger.error("[/api/edu/assignments GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load assignments" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/edu/assignments
//
// Body for creating an assignment:
//   { mode: "create-assignment", classId, title, description, dueDate, createdBy }
//
// Body for creating a class:
//   { mode: "create-class", name, institution, teacher, students?: string[] }
//
// `mode` defaults to "create-assignment" for backwards compatibility.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const mode = typeof body.mode === "string" ? body.mode : "create-assignment";

    if (mode === "create-class") {
      const opts: CreateClassOpts = {
        name: String(body.name || ""),
        institution: String(body.institution || ""),
        teacher: String(body.teacher || ""),
        students: Array.isArray(body.students)
          ? body.students.filter((x): x is string => typeof x === "string")
          : [],
      };
      const cls = await createClass(opts);
      return NextResponse.json({ ok: true, class: cls }, { status: 201 });
    }

    // Default: create-assignment
    const assignment = await createAssignment({
      classId: String(body.classId || ""),
      title: String(body.title || ""),
      description: String(body.description || ""),
      dueDate: String(body.dueDate || new Date(Date.now() + 7 * 86400000).toISOString()),
      createdBy: String(body.createdBy || ""),
    });
    return NextResponse.json({ ok: true, assignment }, { status: 201 });
  } catch (err) {
    logger.error("[/api/edu/assignments POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create assignment" },
      { status: 500 },
    );
  }
}

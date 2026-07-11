import { NextRequest, NextResponse } from "next/server";
import {
  markAttendance,
  getClassAttendanceForDate,
  getStudentAttendance,
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@/lib/education";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/edu/attendance
//   ?classId=<id>&date=<ISO>     → attendance for the whole class on that date
//   ?classId=<id>&student=<user> → attendance history for one student in a class
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const classId = req.nextUrl.searchParams.get("classId");
    const date = req.nextUrl.searchParams.get("date");
    const student = req.nextUrl.searchParams.get("student");

    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    if (student) {
      const records = await getStudentAttendance(classId, student);
      return NextResponse.json({ records });
    }

    const day = date ? new Date(date) : new Date();
    const records = await getClassAttendanceForDate(classId, day);
    return NextResponse.json({ records, date: day.toISOString() });
  } catch (err) {
    logger.error("[/api/edu/attendance GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load attendance" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/edu/attendance
// Body: { classId, studentUsername, date: ISO, status, recordedBy }
// Marks (or updates) a single attendance record.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const status = String(body.status || "");
    if (!(ATTENDANCE_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${ATTENDANCE_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const record = await markAttendance({
      classId: String(body.classId || ""),
      studentUsername: String(body.studentUsername || ""),
      date: String(body.date || new Date().toISOString()),
      status: status as AttendanceStatus,
      recordedBy: String(body.recordedBy || ""),
    });
    return NextResponse.json({ ok: true, record }, { status: 201 });
  } catch (err) {
    logger.error("[/api/edu/attendance POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to mark attendance" },
      { status: 500 },
    );
  }
}

/**
 * Educational Workspaces — Blueprint §12.
 *
 * Server-only library powering Cirkle Gradebook. Free for schools, K-12,
 * and universities. Teachers create classes, post assignments, grade
 * submissions, and mark attendance. Students submit work and view grades.
 *
 * The interface lives in `src/components/overlays/cirkle-gradebook.tsx`.
 * API routes live under `src/app/api/edu/`.
 *
 * Data model:
 *   • EduClass        — a class (teacher + JSON array of student usernames)
 *   • Assignment      — a homework / quiz / project with a due date
 *   • Submission      — a student's submission for an assignment (+grade)
 *   • AttendanceRecord — per-student per-day status (unique constraint)
 */

import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EduClass {
  id: string;
  name: string;
  institution: string;
  teacher: string;
  students: string[];
  createdAt: string;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  createdBy: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentUsername: string;
  content: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  studentUsername: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  recordedBy: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

function isAttendanceStatus(s: string): s is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(s);
}

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

function toIso(d: Date): string {
  return d.toISOString();
}

function serializeClass(row: {
  id: string;
  name: string;
  institution: string;
  teacher: string;
  students: string;
  createdAt: Date;
}): EduClass {
  let students: string[] = [];
  try {
    const parsed = JSON.parse(row.students || "[]");
    if (Array.isArray(parsed)) {
      students = parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    students = [];
  }
  return {
    id: row.id,
    name: row.name,
    institution: row.institution,
    teacher: row.teacher,
    students,
    createdAt: toIso(row.createdAt),
  };
}

function serializeAssignment(row: {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: Date;
  createdBy: string;
  createdAt: Date;
}): Assignment {
  return {
    id: row.id,
    classId: row.classId,
    title: row.title,
    description: row.description,
    dueDate: toIso(row.dueDate),
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt),
  };
}

function serializeSubmission(row: {
  id: string;
  assignmentId: string;
  studentUsername: string;
  content: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: Date;
}): Submission {
  return {
    id: row.id,
    assignmentId: row.assignmentId,
    studentUsername: row.studentUsername,
    content: row.content,
    grade: row.grade,
    feedback: row.feedback,
    submittedAt: toIso(row.submittedAt),
  };
}

function serializeAttendance(row: {
  id: string;
  classId: string;
  studentUsername: string;
  date: Date;
  status: string;
  recordedBy: string;
  createdAt: Date;
}): AttendanceRecord {
  return {
    id: row.id,
    classId: row.classId,
    studentUsername: row.studentUsername,
    date: toIso(row.date),
    status: isAttendanceStatus(row.status) ? row.status : "absent",
    recordedBy: row.recordedBy,
    createdAt: toIso(row.createdAt),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Classes
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateClassOpts {
  name: string;
  institution: string;
  teacher: string;
  students?: string[];
}

export async function createClass(opts: CreateClassOpts): Promise<EduClass> {
  const teacher = normalizeUsername(opts.teacher);
  if (!teacher) throw new Error("teacher is required");
  if (typeof opts.name !== "string" || !opts.name.trim() || opts.name.length > 140) {
    throw new Error("name is required (≤140 chars)");
  }
  if (typeof opts.institution !== "string" || !opts.institution.trim() || opts.institution.length > 140) {
    throw new Error("institution is required (≤140 chars)");
  }
  const students = Array.isArray(opts.students)
    ? opts.students.map(normalizeUsername).filter((s): s is string => !!s)
    : [];

  const row = await db.eduClass.create({
    data: {
      name: opts.name.trim(),
      institution: opts.institution.trim(),
      teacher,
      students: JSON.stringify(students),
    },
  });
  logger.info("[education] class created", { id: row.id, teacher });
  return serializeClass(row);
}

export async function listTeacherClasses(teacher: string): Promise<EduClass[]> {
  const t = normalizeUsername(teacher);
  if (!t) return [];
  const rows = await db.eduClass.findMany({
    where: { teacher: t },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeClass);
}

export async function listStudentClasses(student: string): Promise<EduClass[]> {
  const s = normalizeUsername(student);
  if (!s) return [];
  // SQLite JSON contains is awkward via Prisma; pull all and filter in JS.
  // Class volumes per student is small.
  const rows = await db.eduClass.findMany({ orderBy: { createdAt: "desc" } });
  return rows
    .map(serializeClass)
    .filter((c) => c.students.includes(s));
}

export async function getClass(classId: string): Promise<EduClass | null> {
  if (typeof classId !== "string" || !classId) return null;
  const row = await db.eduClass.findUnique({ where: { id: classId } });
  return row ? serializeClass(row) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignments
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateAssignmentOpts {
  classId: string;
  title: string;
  description: string;
  dueDate: Date | string;
  createdBy: string;
}

export async function createAssignment(opts: CreateAssignmentOpts): Promise<Assignment> {
  const createdBy = normalizeUsername(opts.createdBy);
  if (!createdBy) throw new Error("createdBy is required");
  if (typeof opts.classId !== "string" || !opts.classId) {
    throw new Error("classId is required");
  }
  if (typeof opts.title !== "string" || !opts.title.trim() || opts.title.length > 200) {
    throw new Error("title is required (≤200 chars)");
  }
  if (typeof opts.description !== "string" || opts.description.length > 4000) {
    throw new Error("description too long (≤4000 chars)");
  }
  const dueDate = opts.dueDate instanceof Date ? opts.dueDate : new Date(opts.dueDate);
  if (!isFinite(dueDate.getTime())) throw new Error("dueDate is invalid");

  // Verify the class exists + createdBy is the teacher.
  const cls = await db.eduClass.findUnique({ where: { id: opts.classId } });
  if (!cls) throw new Error("class not found");
  if (cls.teacher !== createdBy) throw new Error("only the class teacher can create assignments");

  const row = await db.assignment.create({
    data: {
      classId: opts.classId,
      title: opts.title.trim(),
      description: opts.description,
      dueDate,
      createdBy,
    },
  });
  logger.info("[education] assignment created", { id: row.id, classId: opts.classId });
  return serializeAssignment(row);
}

export async function listAssignmentsForClass(classId: string): Promise<Assignment[]> {
  if (typeof classId !== "string" || !classId) return [];
  const rows = await db.assignment.findMany({
    where: { classId },
    orderBy: { dueDate: "asc" },
  });
  return rows.map(serializeAssignment);
}

export async function getAssignment(id: string): Promise<Assignment | null> {
  if (typeof id !== "string" || !id) return null;
  const row = await db.assignment.findUnique({ where: { id } });
  return row ? serializeAssignment(row) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Submissions
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmitWorkOpts {
  assignmentId: string;
  studentUsername: string;
  content: string;
}

/**
 * Submit (or update) a student's work for an assignment.
 * The unique constraint (assignmentId, studentUsername) means re-submitting
 * replaces the prior content + resets grade/feedback to null.
 */
export async function submitWork(opts: SubmitWorkOpts): Promise<Submission> {
  const studentUsername = normalizeUsername(opts.studentUsername);
  if (!studentUsername) throw new Error("studentUsername is required");
  if (typeof opts.assignmentId !== "string" || !opts.assignmentId) {
    throw new Error("assignmentId is required");
  }
  if (typeof opts.content !== "string" || !opts.content.trim()) {
    throw new Error("content is required");
  }
  if (opts.content.length > 20000) {
    throw new Error("content too long (≤20000 chars)");
  }

  // Verify the assignment exists + student is enrolled.
  const assignment = await db.assignment.findUnique({ where: { id: opts.assignmentId } });
  if (!assignment) throw new Error("assignment not found");
  const cls = await db.eduClass.findUnique({ where: { id: assignment.classId } });
  if (!cls) throw new Error("class not found");
  let enrolled: string[] = [];
  try {
    const parsed = JSON.parse(cls.students || "[]");
    if (Array.isArray(parsed)) enrolled = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    enrolled = [];
  }
  // Teacher can also submit (e.g., sample answer) — allow if teacher OR enrolled.
  if (cls.teacher !== studentUsername && !enrolled.includes(studentUsername)) {
    throw new Error("student is not enrolled in this class");
  }

  const row = await db.submission.upsert({
    where: {
      assignmentId_studentUsername: {
        assignmentId: opts.assignmentId,
        studentUsername,
      },
    },
    create: {
      assignmentId: opts.assignmentId,
      studentUsername,
      content: opts.content,
    },
    update: {
      content: opts.content,
      grade: null,
      feedback: null,
    },
  });
  return serializeSubmission(row);
}

export async function listSubmissionsForAssignment(assignmentId: string): Promise<Submission[]> {
  if (typeof assignmentId !== "string" || !assignmentId) return [];
  const rows = await db.submission.findMany({
    where: { assignmentId },
    orderBy: { submittedAt: "desc" },
  });
  return rows.map(serializeSubmission);
}

export async function getStudentSubmission(
  assignmentId: string,
  studentUsername: string,
): Promise<Submission | null> {
  const s = normalizeUsername(studentUsername);
  if (!s) return null;
  const row = await db.submission.findUnique({
    where: {
      assignmentId_studentUsername: { assignmentId, studentUsername: s },
    },
  });
  return row ? serializeSubmission(row) : null;
}

export async function listStudentSubmissions(studentUsername: string): Promise<Submission[]> {
  const s = normalizeUsername(studentUsername);
  if (!s) return [];
  const rows = await db.submission.findMany({
    where: { studentUsername: s },
    orderBy: { submittedAt: "desc" },
  });
  return rows.map(serializeSubmission);
}

// ─────────────────────────────────────────────────────────────────────────────
// Grades
// ─────────────────────────────────────────────────────────────────────────────

export interface PublishGradeOpts {
  assignmentId: string;
  studentUsername: string;
  grade: number;
  feedback?: string;
  gradedBy: string;
}

/**
 * Publish a grade for a student's submission.
 * Only the class teacher can grade. Grade is on a 0–100 scale (validated).
 */
export async function publishGrade(opts: PublishGradeOpts): Promise<Submission> {
  const gradedBy = normalizeUsername(opts.gradedBy);
  if (!gradedBy) throw new Error("gradedBy is required");
  const studentUsername = normalizeUsername(opts.studentUsername);
  if (!studentUsername) throw new Error("studentUsername is required");
  if (typeof opts.assignmentId !== "string" || !opts.assignmentId) {
    throw new Error("assignmentId is required");
  }
  const grade = Number(opts.grade);
  if (!isFinite(grade) || grade < 0 || grade > 100) {
    throw new Error("grade must be between 0 and 100");
  }
  const feedback =
    typeof opts.feedback === "string" && opts.feedback.trim()
      ? opts.feedback.trim().slice(0, 2000)
      : null;

  // Verify teacher owns the class.
  const assignment = await db.assignment.findUnique({ where: { id: opts.assignmentId } });
  if (!assignment) throw new Error("assignment not found");
  const cls = await db.eduClass.findUnique({ where: { id: assignment.classId } });
  if (!cls) throw new Error("class not found");
  if (cls.teacher !== gradedBy) throw new Error("only the class teacher can publish grades");

  // Make sure the submission exists; if not, create an empty one to attach the grade to.
  const existing = await db.submission.findUnique({
    where: {
      assignmentId_studentUsername: { assignmentId: opts.assignmentId, studentUsername },
    },
  });
  if (!existing) {
    const created = await db.submission.create({
      data: {
        assignmentId: opts.assignmentId,
        studentUsername,
        content: "",
        grade,
        feedback,
      },
    });
    return serializeSubmission(created);
  }
  const row = await db.submission.update({
    where: { id: existing.id },
    data: { grade, feedback },
  });
  return serializeSubmission(row);
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────────────────────────────────────

export interface MarkAttendanceOpts {
  classId: string;
  studentUsername: string;
  date: Date | string;
  status: AttendanceStatus;
  recordedBy: string;
}

/**
 * Mark (or update) attendance for a student on a given date.
 * Unique constraint (classId, studentUsername, date) means re-marking the
 * same day updates the existing record.
 */
export async function markAttendance(opts: MarkAttendanceOpts): Promise<AttendanceRecord> {
  const recordedBy = normalizeUsername(opts.recordedBy);
  if (!recordedBy) throw new Error("recordedBy is required");
  const studentUsername = normalizeUsername(opts.studentUsername);
  if (!studentUsername) throw new Error("studentUsername is required");
  if (typeof opts.classId !== "string" || !opts.classId) {
    throw new Error("classId is required");
  }
  if (!isAttendanceStatus(opts.status)) {
    throw new Error(`status must be one of: ${ATTENDANCE_STATUSES.join(", ")}`);
  }
  const date = opts.date instanceof Date ? opts.date : new Date(opts.date);
  if (!isFinite(date.getTime())) throw new Error("date is invalid");

  // Verify teacher owns the class.
  const cls = await db.eduClass.findUnique({ where: { id: opts.classId } });
  if (!cls) throw new Error("class not found");
  if (cls.teacher !== recordedBy) throw new Error("only the class teacher can mark attendance");

  // Normalize the date to UTC midnight so unique constraints match across a day.
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  const row = await db.attendanceRecord.upsert({
    where: {
      classId_studentUsername_date: {
        classId: opts.classId,
        studentUsername,
        date: day,
      },
    },
    create: {
      classId: opts.classId,
      studentUsername,
      date: day,
      status: opts.status,
      recordedBy,
    },
    update: {
      status: opts.status,
      recordedBy,
    },
  });
  return serializeAttendance(row);
}

/**
 * Get attendance for a class on a specific date (UTC day).
 */
export async function getClassAttendanceForDate(
  classId: string,
  date: Date | string,
): Promise<AttendanceRecord[]> {
  if (typeof classId !== "string" || !classId) return [];
  const d = date instanceof Date ? date : new Date(date);
  if (!isFinite(d.getTime())) return [];
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
  const rows = await db.attendanceRecord.findMany({
    where: {
      classId,
      date: { gte: day, lt: nextDay },
    },
    orderBy: { studentUsername: "asc" },
  });
  return rows.map(serializeAttendance);
}

/**
 * Get all attendance records for a student in a class (chronological).
 */
export async function getStudentAttendance(
  classId: string,
  studentUsername: string,
): Promise<AttendanceRecord[]> {
  const s = normalizeUsername(studentUsername);
  if (!s) return [];
  const rows = await db.attendanceRecord.findMany({
    where: { classId, studentUsername: s },
    orderBy: { date: "asc" },
  });
  return rows.map(serializeAttendance);
}

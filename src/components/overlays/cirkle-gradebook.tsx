"use client";

/**
 * Cirkle Gradebook — Blueprint §12.
 *
 * Educational Workspaces dashboard. Free for schools, K-12, and universities.
 *
 * Tabs:
 *   1. Classes      — list teacher's classes (teacher view) or enrolled
 *                     classes (student view). Teachers can create a new class.
 *   2. Assignments  — create assignment (teacher) / view + submit (student).
 *   3. Gradebook    — view all grades for a class (teacher) or your grades
 *                     (student).
 *   4. Attendance   — mark attendance (teacher) / view attendance (student).
 *
 * Open via the `circle:cirkle-gradebook` event (registered in page.tsx +
 * overlay-registry.ts).
 *
 * Role detection: if the current user is the teacher of a class, they get
 * the teacher view; otherwise they get the student view. A user can be a
 * teacher of one class and a student in another — the role is per-class.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  GraduationCap,
  ClipboardList,
  BookOpen,
  CalendarCheck,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette ONLY — gold / teal / rose / steel / charcoal / cream.
// ─────────────────────────────────────────────────────────────────────────────

type TabView = "classes" | "assignments" | "gradebook" | "attendance";
const TABS: { id: TabView; label: string; icon: LucideIcon }[] = [
  { id: "classes", label: "Classes", icon: BookOpen },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "gradebook", label: "Gradebook", icon: GraduationCap },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
];

const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

const ATTENDANCE_META: Record<
  AttendanceStatus,
  { emoji: string; icon: LucideIcon; tint: string; label: string }
> = {
  present: { emoji: "✅", icon: CheckCircle2, tint: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", label: "Present" },
  absent: { emoji: "❌", icon: XCircle, tint: "bg-accent/15 text-accent border-accent/40", label: "Absent" },
  late: { emoji: "🕒", icon: Clock, tint: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", label: "Late" },
  excused: { emoji: "📝", icon: FileText, tint: "bg-steel/15 text-steel border-steel/40", label: "Excused" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirror the engine's interfaces)
// ─────────────────────────────────────────────────────────────────────────────

interface EduClass {
  id: string;
  name: string;
  institution: string;
  teacher: string;
  students: string[];
  createdAt: string;
}

interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  createdBy: string;
  createdAt: string;
}

interface Submission {
  id: string;
  assignmentId: string;
  studentUsername: string;
  content: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
}

interface AttendanceRecord {
  id: string;
  classId: string;
  studentUsername: string;
  date: string;
  status: AttendanceStatus;
  recordedBy: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function daysUntil(iso: string): { label: string; overdue: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(ms / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { label: "due today", overdue: false };
  if (days === 1) return { label: "due tomorrow", overdue: false };
  return { label: `${days}d left`, overdue: false };
}

function gradeColor(grade: number): string {
  if (grade >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (grade >= 70) return "text-secondary";
  if (grade >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-accent";
}

function toInputDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function CirkleGradebook({ open, onClose }: Props) {
  const { user } = useAuth();
  const me = user?.username || "guest";

  const [tab, setTab] = useState<TabView>("classes");
  const [classes, setClasses] = useState<EduClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Selected class context
  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId],
  );
  const isTeacher = useMemo(
    () => !!selectedClass && selectedClass.teacher === me,
    [selectedClass, me],
  );

  // ── Loaders ───────────────────────────────────────────────────────────
  const loadClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      // Fetch both teacher + student views and merge — a user can be both.
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/edu/assignments?teacher=${encodeURIComponent(me)}`, { cache: "no-store" }),
        fetch(`/api/edu/assignments?student=${encodeURIComponent(me)}`, { cache: "no-store" }),
      ]);
      const tData = (await tRes.json()) as { classes?: EduClass[] };
      const sData = (await sRes.json()) as { classes?: EduClass[] };
      const merged = new Map<string, EduClass>();
      for (const c of [...(tData.classes || []), ...(sData.classes || [])]) {
        merged.set(c.id, c);
      }
      const list = Array.from(merged.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setClasses(list);
      // Auto-select first class if none selected
      if (list.length > 0) {
        setSelectedClassId((cur) => cur || list[0].id);
      } else {
        setSelectedClassId(null);
      }
    } catch (err) {
      toast.error("Couldn't load classes", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setClassesLoading(false);
    }
  }, [me]);

  useEffect(() => {
    if (!open) return;
    loadClasses();
  }, [open, loadClasses]);

  // ── Create class ──────────────────────────────────────────────────────
  const [newClass, setNewClass] = useState({ name: "", institution: "", students: "" });
  const [creatingClass, setCreatingClass] = useState(false);

  const createClass = useCallback(async () => {
    if (!newClass.name.trim() || !newClass.institution.trim()) {
      toast.error("Class name + institution are required");
      return;
    }
    setCreatingClass(true);
    try {
      const students = newClass.students
        .split(/[,\n\s]+/)
        .map((s) => s.trim().toLowerCase().replace(/^@/, ""))
        .filter(Boolean);
      const res = await fetch("/api/edu/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "create-class",
          name: newClass.name.trim(),
          institution: newClass.institution.trim(),
          teacher: me,
          students,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "failed to create class");
      }
      toast.success("Class created", {
        description: `${newClass.name.trim()} is ready. ${students.length} student${students.length === 1 ? "" : "s"} enrolled.`,
      });
      setNewClass({ name: "", institution: "", students: "" });
      await loadClasses();
      setTab("assignments");
    } catch (err) {
      toast.error("Couldn't create class", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreatingClass(false);
    }
  }, [newClass, me, loadClasses]);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Cirkle Gradebook — assignments, grades, attendance. Free for schools, K-12, universities."
    >
      {/* Aurora background — brand palette only */}
      <div className="pointer-events-none absolute inset-0 aurora-bg opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background"
        aria-hidden
      />

      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="relative px-4 sm:px-6 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 glass-strong z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/40 to-accent/20 border border-secondary/40 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight flex items-center gap-2">
              Cirkle Gradebook
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-secondary/15 text-secondary border-secondary/40">
                Free for schools
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {me} · Assignments, grades, attendance · K-12 + universities
            </p>
          </div>
          <button
            onClick={loadClasses}
            disabled={classesLoading}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0 disabled:opacity-50"
            aria-label="Refresh"
          >
            {classesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto mt-3 flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/60 w-fit">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5",
                  tab === t.id
                    ? "bg-gradient-hero text-cream shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ───────────────────────── Body ─────────────────────────── */}
      <div className="relative max-w-4xl mx-auto w-full px-4 sm:px-6 py-5 pb-32 overflow-y-auto z-10">
        {/* Class selector (always visible so context is clear) */}
        {classes.length > 0 && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground">Class:</span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1">
              {classes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClassId(c.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap",
                    c.id === selectedClassId
                      ? "bg-gradient-hero text-cream border-transparent shadow-soft"
                      : "bg-card border-border/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={tab + (selectedClassId || "none")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "classes" && (
              <ClassesTab
                classes={classes}
                loading={classesLoading}
                me={me}
                newClass={newClass}
                setNewClass={setNewClass}
                creatingClass={creatingClass}
                onCreateClass={createClass}
                onSelectClass={(id) => {
                  setSelectedClassId(id);
                  setTab("assignments");
                }}
              />
            )}

            {tab === "assignments" && selectedClass && (
              <AssignmentsTab cls={selectedClass} isTeacher={isTeacher} me={me} />
            )}

            {tab === "gradebook" && selectedClass && (
              <GradebookTab cls={selectedClass} isTeacher={isTeacher} me={me} />
            )}

            {tab === "attendance" && selectedClass && (
              <AttendanceTab cls={selectedClass} isTeacher={isTeacher} me={me} />
            )}

            {tab !== "classes" && !selectedClass && (
              <EmptyState
                icon={BookOpen}
                title="No class selected"
                description="Create or join a class on the Classes tab first."
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </OverlayShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Classes tab
// ─────────────────────────────────────────────────────────────────────────────

function ClassesTab({
  classes,
  loading,
  me,
  newClass,
  setNewClass,
  creatingClass,
  onCreateClass,
  onSelectClass,
}: {
  classes: EduClass[];
  loading: boolean;
  me: string;
  newClass: { name: string; institution: string; students: string };
  setNewClass: React.Dispatch<React.SetStateAction<{ name: string; institution: string; students: string }>>;
  creatingClass: boolean;
  onCreateClass: () => void;
  onSelectClass: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  if (loading && classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-secondary" />
        <p className="text-xs">Loading classes…</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {/* Create class form */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h3 className="font-display text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4 text-secondary" />
              Create a new class
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              You become the teacher. Add students by @username.
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground">{showForm ? "Cancel" : "Open"}</span>
        </button>
        {showForm && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium">Class name</Label>
                <Input
                  value={newClass.name}
                  onChange={(e) => setNewClass((f) => ({ ...f, name: e.target.value }))}
                  maxLength={140}
                  placeholder="Grade 10 — Algebra II"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium">Institution</Label>
                <Input
                  value={newClass.institution}
                  onChange={(e) => setNewClass((f) => ({ ...f, institution: e.target.value }))}
                  maxLength={140}
                  placeholder="Cairo American College"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Students (comma-separated @usernames)</Label>
              <Textarea
                value={newClass.students}
                onChange={(e) => setNewClass((f) => ({ ...f, students: e.target.value }))}
                rows={2}
                placeholder="@layla @khaled @omar @yara"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCreateClass}
                disabled={creatingClass}
                className="px-4 py-2 rounded-full bg-gradient-hero text-cream shadow-soft hover:opacity-90 disabled:opacity-50 text-xs font-medium flex items-center gap-1.5"
              >
                {creatingClass ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create class
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Class list */}
      {classes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No classes yet"
          description="Create a class above to start posting assignments and tracking grades."
        />
      ) : (
        <div className="space-y-2">
          {classes.map((c) => {
            const isTeacher = c.teacher === me;
            return (
              <article
                key={c.id}
                className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-sm font-semibold truncate">{c.name}</h3>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                        isTeacher
                          ? "bg-secondary/15 text-secondary border-secondary/40"
                          : "bg-steel/15 text-steel border-steel/40",
                      )}
                    >
                      {isTeacher ? "Teacher" : "Student"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{c.institution}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {c.students.length} student{c.students.length === 1 ? "" : "s"}
                    </span>
                    <span>·</span>
                    <span>teacher @{c.teacher}</span>
                  </div>
                </div>
                <button
                  onClick={() => onSelectClass(c.id)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-muted hover:bg-muted/70"
                >
                  Open
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignments tab
// ─────────────────────────────────────────────────────────────────────────────

function AssignmentsTab({
  cls,
  isTeacher,
  me,
}: {
  cls: EduClass;
  isTeacher: boolean;
  me: string;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [studentWork, setStudentWork] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/edu/assignments?classId=${cls.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("failed to load assignments");
      const data = (await res.json()) as { assignments: Assignment[] };
      setAssignments(data.assignments);
    } catch (err) {
      toast.error("Couldn't load assignments", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [cls.id]);

  const loadSubmissions = useCallback(
    async (assignmentId: string) => {
      setSubLoading(true);
      try {
        const res = await fetch(`/api/edu/assignments/${assignmentId}/submit`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("failed to load submissions");
        const data = (await res.json()) as { submissions: Submission[] };
        setSubmissions(data.submissions);
      } catch {
        setSubmissions([]);
      } finally {
        setSubLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const createAssignment = useCallback(async () => {
    if (!newAssignment.title.trim()) {
      toast.error("Assignment title is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/edu/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "create-assignment",
          classId: cls.id,
          title: newAssignment.title.trim(),
          description: newAssignment.description,
          dueDate: new Date(newAssignment.dueDate).toISOString(),
          createdBy: me,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "failed to create assignment");
      }
      toast.success("Assignment posted");
      setNewAssignment({ title: "", description: "", dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) });
      await loadAssignments();
    } catch (err) {
      toast.error("Couldn't post assignment", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  }, [cls.id, me, newAssignment, loadAssignments]);

  const submitWork = useCallback(
    async (assignmentId: string) => {
      if (!studentWork.trim()) {
        toast.error("Cannot submit empty work");
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch(`/api/edu/assignments/${assignmentId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentUsername: me, content: studentWork }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error || "failed to submit");
        }
        toast.success("Submitted!");
        setStudentWork("");
        // Refresh submissions if expanded
        if (expandedId === assignmentId) {
          await loadSubmissions(assignmentId);
        }
      } catch (err) {
        toast.error("Couldn't submit", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [me, studentWork, expandedId, loadSubmissions],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-secondary" />
        <p className="text-xs">Loading assignments…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create assignment (teacher only) */}
      {isTeacher && (
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 space-y-3">
          <h3 className="font-display text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-secondary" />
            Post new assignment
          </h3>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium">Title</Label>
            <Input
              value={newAssignment.title}
              onChange={(e) => setNewAssignment((f) => ({ ...f, title: e.target.value }))}
              maxLength={200}
              placeholder="Chapter 5 exercises — Quadratic equations"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium">Description</Label>
            <Textarea
              value={newAssignment.description}
              onChange={(e) => setNewAssignment((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              maxLength={4000}
              placeholder="Solve problems 1–12 on page 87. Show your working."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Due date</Label>
              <Input
                type="date"
                value={newAssignment.dueDate}
                onChange={(e) => setNewAssignment((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="flex items-end justify-end">
              <button
                onClick={createAssignment}
                disabled={creating}
                className="px-4 py-2 rounded-full bg-gradient-hero text-cream shadow-soft hover:opacity-90 disabled:opacity-50 text-xs font-medium flex items-center gap-1.5"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Post assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment list */}
      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assignments yet"
          description={isTeacher ? "Post the first assignment above." : "Your teacher hasn't posted any assignments yet."}
        />
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const due = daysUntil(a.dueDate);
            const expanded = expandedId === a.id;
            const mySub = submissions.find((s) => s.studentUsername === me);
            return (
              <article
                key={a.id}
                className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4"
              >
                <button
                  onClick={() => {
                    if (expanded) {
                      setExpandedId(null);
                    } else {
                      setExpandedId(a.id);
                      setStudentWork("");
                      void loadSubmissions(a.id);
                    }
                  }}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-semibold">{a.title}</h3>
                      {a.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {a.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                        due.overdue
                          ? "bg-accent/15 text-accent border-accent/40"
                          : "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      {due.label}
                    </span>
                  </div>
                </button>

                {expanded && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-border/60">
                    {subLoading ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                      </div>
                    ) : (
                      <>
                        {/* Student: submit work */}
                        {!isTeacher && (
                          <div className="space-y-2">
                            <Label className="text-[11px] font-medium">Your submission</Label>
                            <Textarea
                              value={studentWork}
                              onChange={(e) => setStudentWork(e.target.value)}
                              rows={4}
                              placeholder="Type or paste your answer here…"
                              maxLength={20000}
                            />
                            {mySub && (
                              <p className="text-[10px] text-muted-foreground">
                                Last submitted {fmtDateTime(mySub.submittedAt)}
                                {mySub.grade !== null && (
                                  <> · grade: <span className={cn("font-medium", gradeColor(mySub.grade))}>{mySub.grade}/100</span></>
                                )}
                              </p>
                            )}
                            <div className="flex justify-end">
                              <button
                                onClick={() => submitWork(a.id)}
                                disabled={submitting || !studentWork.trim()}
                                className="px-3 py-1.5 rounded-full bg-gradient-hero text-cream shadow-soft hover:opacity-90 disabled:opacity-50 text-xs font-medium flex items-center gap-1.5"
                              >
                                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                {mySub ? "Re-submit" : "Submit"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Teacher: list submissions */}
                        {isTeacher && (
                          <div className="space-y-2">
                            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                              Submissions ({submissions.length})
                            </div>
                            {submissions.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground py-2">
                                No submissions yet.
                              </p>
                            ) : (
                              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                {submissions.map((s) => (
                                  <div
                                    key={s.id}
                                    className="rounded-lg border border-border/60 bg-background/60 p-2.5"
                                  >
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-medium">@{s.studentUsername}</span>
                                      {s.grade !== null ? (
                                        <span className={cn("font-bold", gradeColor(s.grade))}>
                                          {s.grade}/100
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">ungraded</span>
                                      )}
                                    </div>
                                    {s.content && (
                                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3">
                                        {s.content}
                                      </p>
                                    )}
                                    {s.feedback && (
                                      <p className="text-[11px] italic mt-1 text-secondary">
                                        “{s.feedback}”
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gradebook tab
// ─────────────────────────────────────────────────────────────────────────────

function GradebookTab({
  cls,
  isTeacher,
  me,
}: {
  cls: EduClass;
  isTeacher: boolean;
  me: string;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [gradeForm, setGradeForm] = useState<{ student: string; assignmentId: string; grade: string; feedback: string } | null>(null);
  const [savingGrade, setSavingGrade] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        fetch(`/api/edu/assignments?classId=${cls.id}`, { cache: "no-store" }),
        fetch(`/api/edu/grades?assignmentId=${assignments.length > 0 ? assignments[0].id : ""}`, { cache: "no-store" }).catch(() => null),
      ]);
      const aData = (await aRes.json()) as { assignments: Assignment[] };
      setAssignments(aData.assignments);

      // Load all submissions across all assignments for the class.
      if (aData.assignments.length > 0) {
        const allSubs = await Promise.all(
          aData.assignments.map(async (a) => {
            const r = await fetch(`/api/edu/assignments/${a.id}/submit`, { cache: "no-store" });
            if (!r.ok) return [] as Submission[];
            const d = (await r.json()) as { submissions: Submission[] };
            return d.submissions;
          }),
        );
        setSubmissions(allSubs.flat());
      } else {
        setSubmissions([]);
      }
      void sRes;
    } catch (err) {
      toast.error("Couldn't load gradebook", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [cls.id, assignments.length]);

  useEffect(() => {
    load();
  }, [cls.id]);

  // Build a per-student grade matrix.
  const roster = useMemo(() => {
    const set = new Set<string>();
    if (isTeacher) {
      for (const s of cls.students) set.add(s);
    } else {
      set.add(me);
    }
    return Array.from(set).sort();
  }, [cls.students, me, isTeacher]);

  const gradeFor = (student: string, assignmentId: string) =>
    submissions.find((s) => s.studentUsername === student && s.assignmentId === assignmentId);

  const publishGrade = useCallback(async () => {
    if (!gradeForm) return;
    const g = Number(gradeForm.grade);
    if (!isFinite(g) || g < 0 || g > 100) {
      toast.error("Grade must be 0–100");
      return;
    }
    setSavingGrade(true);
    try {
      const res = await fetch("/api/edu/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: gradeForm.assignmentId,
          studentUsername: gradeForm.student,
          grade: g,
          feedback: gradeForm.feedback.trim() || undefined,
          gradedBy: me,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "failed to publish grade");
      }
      toast.success(`Grade published for @${gradeForm.student}`);
      setGradeForm(null);
      await load();
    } catch (err) {
      toast.error("Couldn't publish grade", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingGrade(false);
    }
  }, [gradeForm, me, load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-secondary" />
        <p className="text-xs">Loading gradebook…</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No assignments to grade"
        description="Post an assignment on the Assignments tab first."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border/60">
                <th className="text-left p-2 font-medium min-w-[120px]">Student</th>
                {assignments.map((a) => (
                  <th key={a.id} className="text-center p-2 font-medium min-w-[80px]">
                    <div className="line-clamp-2" title={a.title}>
                      {a.title}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-normal">
                      {fmtDate(a.dueDate)}
                    </div>
                  </th>
                ))}
                <th className="text-center p-2 font-medium">Avg</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((student) => {
                const grades = assignments.map((a) => gradeFor(student, a.id)?.grade ?? null);
                const valid = grades.filter((g): g is number => g !== null);
                const avg =
                  valid.length > 0 ? valid.reduce((s, g) => s + g, 0) / valid.length : null;
                return (
                  <tr key={student} className="border-b border-border/40">
                    <td className="p-2 font-medium">@{student}</td>
                    {assignments.map((a) => {
                      const sub = gradeFor(student, a.id);
                      return (
                        <td key={a.id} className="text-center p-2">
                          {sub ? (
                            <button
                              onClick={() =>
                                isTeacher &&
                                setGradeForm({
                                  student,
                                  assignmentId: a.id,
                                  grade: String(sub.grade ?? ""),
                                  feedback: sub.feedback ?? "",
                                })
                              }
                              className={cn(
                                "inline-block px-1.5 py-0.5 rounded-md font-medium",
                                sub.grade !== null
                                  ? cn("bg-muted", gradeColor(sub.grade))
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                                isTeacher && "hover:ring-2 ring-secondary/40",
                              )}
                              title={isTeacher ? "Click to grade" : undefined}
                            >
                              {sub.grade !== null ? sub.grade : "—"}
                            </button>
                          ) : isTeacher ? (
                            <button
                              onClick={() =>
                                setGradeForm({
                                  student,
                                  assignmentId: a.id,
                                  grade: "",
                                  feedback: "",
                                })
                              }
                              className="text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded-md hover:bg-muted/60"
                            >
                              +
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center p-2">
                      {avg !== null ? (
                        <span className={cn("font-bold", gradeColor(avg))}>
                          {avg.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grade entry modal (teacher only) */}
      {gradeForm && isTeacher && (
        <div className="fixed inset-0 z-[160] bg-charcoal/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border/60 shadow-float p-5 space-y-3">
            <h3 className="font-display text-base font-semibold">
              Grade @{gradeForm.student}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {assignments.find((a) => a.id === gradeForm.assignmentId)?.title}
            </p>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Grade (0–100)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={gradeForm.grade}
                onChange={(e) =>
                  setGradeForm((f) => (f ? { ...f, grade: e.target.value } : f))
                }
                placeholder="85"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Feedback (optional)</Label>
              <Textarea
                value={gradeForm.feedback}
                onChange={(e) =>
                  setGradeForm((f) => (f ? { ...f, feedback: e.target.value } : f))
                }
                rows={3}
                maxLength={2000}
                placeholder="Strong work — watch your algebra on question 7."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setGradeForm(null)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted hover:bg-muted/70"
              >
                Cancel
              </button>
              <button
                onClick={publishGrade}
                disabled={savingGrade}
                className="px-4 py-1.5 rounded-full text-xs font-medium bg-gradient-hero text-cream shadow-soft hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingGrade ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Publish grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance tab
// ─────────────────────────────────────────────────────────────────────────────

function AttendanceTab({
  cls,
  isTeacher,
  me,
}: {
  cls: EduClass;
  isTeacher: boolean;
  me: string;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState<string | null>(null); // studentUsername being marked

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/edu/attendance?classId=${cls.id}&date=${encodeURIComponent(date)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("failed to load attendance");
      const data = (await res.json()) as { records: AttendanceRecord[] };
      setRecords(data.records);
    } catch (err) {
      toast.error("Couldn't load attendance", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [cls.id, date]);

  useEffect(() => {
    load();
  }, [load]);

  const statusFor = (student: string) =>
    records.find((r) => r.studentUsername === student)?.status;

  const markStatus = useCallback(
    async (student: string, status: AttendanceStatus) => {
      setMarking(student);
      try {
        const res = await fetch("/api/edu/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId: cls.id,
            studentUsername: student,
            date: new Date(date).toISOString(),
            status,
            recordedBy: me,
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error || "failed to mark attendance");
        }
        await load();
      } catch (err) {
        toast.error("Couldn't mark attendance", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setMarking(null);
      }
    },
    [cls.id, me, date, load],
  );

  const roster = isTeacher ? cls.students : [me];
  const presentCount = records.filter((r) => r.status === "present").length;
  const totalCount = roster.length;

  return (
    <div className="space-y-4">
      {/* Date picker + summary */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-secondary" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto h-8 text-xs"
          />
        </div>
        <div className="text-[11px] text-muted-foreground">
          {isTeacher ? (
            <>
              <span className="font-medium text-foreground">{presentCount}/{totalCount}</span> present
            </>
          ) : (
            <span>
              Your status:{" "}
              <span className="font-medium">
                {statusFor(me) || "not marked"}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Attendance list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-secondary" />
          <p className="text-xs">Loading attendance…</p>
        </div>
      ) : roster.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No students enrolled"
          description="Add students on the Classes tab to start tracking attendance."
        />
      ) : (
        <div className="space-y-2">
          {roster.map((student) => {
            const status = statusFor(student);
            return (
              <article
                key={student}
                className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary/15 border border-secondary/30 flex items-center justify-center text-xs font-semibold">
                    {student.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-display text-sm font-medium">@{student}</div>
                    {status ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border",
                          ATTENDANCE_META[status].tint,
                        )}
                      >
                        {ATTENDANCE_META[status].emoji} {ATTENDANCE_META[status].label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">not marked</span>
                    )}
                  </div>
                </div>
                {isTeacher && (
                  <div className="flex items-center gap-1">
                    {ATTENDANCE_STATUSES.map((s) => {
                      const meta = ATTENDANCE_META[s];
                      const Icon = meta.icon;
                      const active = status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => markStatus(student, s)}
                          disabled={marking === student}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border text-xs transition",
                            active
                              ? meta.tint
                              : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted",
                          )}
                          title={meta.label}
                          aria-label={`Mark ${student} as ${meta.label}`}
                        >
                          {marking === student ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Icon className="w-3.5 h-3.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <Icon className="w-6 h-6 text-secondary" />
      <p className="text-xs font-medium text-foreground">{title}</p>
      <p className="text-[11px] text-center max-w-xs">{description}</p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Calendar, Plus, Clock, Flame,
  Sparkles, Trash2, GripVertical, AlertCircle, Loader2, RefreshCw,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Types ──────────────────────────────────────────────────────────────────

type CalendarModule = "midan" | "lamahat" | "mashahd" | "wasl";

interface ScheduledItem {
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Module the post is destined for. */
  module: CalendarModule;
  /** Time HH:MM (24h). */
  time: string;
  /** Post title / preview. */
  title: string;
  /** Optional longer notes. */
  notes?: string;
  /** Whether this is at an "optimal" posting time. */
  optimal?: boolean;
}

interface CalendarResponse {
  items: ScheduledItem[];
  streak: number;
  longestStreak: number;
  daysSinceLastPost: number;
  aiHint: string | null;
}

// ── Module metadata ────────────────────────────────────────────────────────

const MODULE_META: Record<CalendarModule, { label: string; emoji: string; tint: string; dot: string }> = {
  midan:   { label: "Midan",   emoji: "📢", tint: "from-primary/20 to-transparent",     dot: "bg-primary"   },
  lamahat: { label: "Lamahat", emoji: "📸", tint: "from-rose-400/20 to-transparent",    dot: "bg-rose-400"  },
  mashahd: { label: "Mashahd", emoji: "🎬", tint: "from-teal-500/20 to-transparent",    dot: "bg-teal-500"  },
  wasl:    { label: "Wasl",    emoji: "💬", tint: "from-amber-400/20 to-transparent",   dot: "bg-amber-400" },
};

const MODULES = Object.keys(MODULE_META) as CalendarModule[];

// ── localStorage ───────────────────────────────────────────────────────────

const STORAGE_KEY = "cirkle-content-calendar";
const STREAK_KEY = "cirkle-content-calendar-streak";

function loadItems(): ScheduledItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is ScheduledItem =>
      x && typeof x.id === "string" && typeof x.date === "string" && typeof x.module === "string" && typeof x.title === "string"
    );
  } catch {
    return [];
  }
}

function saveItems(items: ScheduledItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

function loadStreak(): { current: number; longest: number; lastPostDate: string | null } {
  if (typeof window === "undefined") return { current: 0, longest: 0, lastPostDate: null };
  try {
    const raw = window.localStorage.getItem(STREAK_KEY);
    if (!raw) return { current: 0, longest: 0, lastPostDate: null };
    const parsed = JSON.parse(raw);
    return {
      current: typeof parsed.current === "number" ? parsed.current : 0,
      longest: typeof parsed.longest === "number" ? parsed.longest : 0,
      lastPostDate: typeof parsed.lastPostDate === "string" ? parsed.lastPostDate : null,
    };
  } catch {
    return { current: 0, longest: 0, lastPostDate: null };
  }
}

function saveStreak(s: { current: number; longest: number; lastPostDate: string | null }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STREAK_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

// ── Seed data (used on first open so the calendar isn't empty) ──────────────

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function seedItems(): ScheduledItem[] {
  const today = new Date();
  const mk = (offset: number, module: CalendarModule, time: string, title: string, optimal = false): ScheduledItem => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    return {
      id: `seed-${offset}-${module}-${time}`,
      date: isoDate(d),
      module, time, title, optimal,
    };
  };
  return [
    mk(0,  "midan",   "19:30", "Coffee shop micro-review — that new place on Tahrir St.", true),
    mk(0,  "lamahat", "08:00", "Morning golden-hour photo of the Nile bridge"),
    mk(1,  "mashahd", "21:00", "30-second walking tour of downtown Cairo", true),
    mk(2,  "wasl",    "12:00", "Voice note reply to Layla — overdue!"),
    mk(3,  "midan",   "20:00", "Weekly hot-take: regional cinema is having a moment", true),
    mk(5,  "lamahat", "17:30", "Sunset series — 3 frames from the balcony"),
    mk(-1, "midan",   "18:00", "Yesterday's coffee post performed well — repost to Lamahat?"),
    mk(-2, "lamahat", "07:30", "Sky series — day 12"),
  ];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function todayKey(): string {
  return isoDate(new Date());
}

function dayOffsetKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return isoDate(d);
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00`);
  const b = new Date(`${bIso}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// ── Component ──────────────────────────────────────────────────────────────

export function ContentCalendar({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username ?? "you";

  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [composer, setComposer] = useState<{ open: boolean; date: string | null }>({ open: false, date: null });
  const [draftModule, setDraftModule] = useState<CalendarModule>("midan");
  const [draftTime, setDraftTime] = useState("19:00");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // ── Hydrate from localStorage on open ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    // Simulate API latency so the loading state is visible. Both setState
    // calls are inside the async setTimeout callback so we don't trigger
    // synchronous setState-in-effect cascading renders.
    const t = setTimeout(() => {
      let stored = loadItems();
      if (stored.length === 0) {
        stored = seedItems();
        saveItems(stored);
      }
      setItems(stored);
      setSelectedDate(todayKey());
    }, 350);
    return () => clearTimeout(t);
  }, [open, refreshTick]);

  // Derived loading state — true whenever the overlay is open but we haven't
  // received items yet (initial mount, or after a refresh).
  const loading = open && items.length === 0;

  const refresh = () => {
    setItems([]);
    setRefreshTick((t) => t + 1);
  };

  const persist = useCallback((next: ScheduledItem[]) => {
    setItems(next);
    saveItems(next);
  }, []);

  // ── Streak computation ─────────────────────────────────────────────────
  const streakInfo = useMemo(() => {
    // Look at all past dates with at least one scheduled item OR recorded post.
    // For simplicity we treat scheduled items as "posted" for the streak — the
    // streak is about consistency of intent.
    const dateSet = new Set(items.map((i) => i.date));
    const today = todayKey();
    let streak = 0;
    let longest = 0;
    const sortedDates = Array.from(dateSet).sort();
    if (sortedDates.length === 0) {
      const s = loadStreak();
      return { current: s.current, longest: s.longest, lastPostDate: s.lastPostDate, daysSinceLastPost: s.lastPostDate ? Math.max(0, daysBetween(s.lastPostDate, today)) : 999 };
    }
    // Walk backwards from today (or yesterday) — count consecutive days with content.
    let cursor = new Date();
    // If today has no content, start from yesterday.
    if (!dateSet.has(today)) cursor.setDate(cursor.getDate() - 1);
    while (dateSet.has(isoDate(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    // Longest run from sorted dates.
    let run = 0;
    let prev: string | null = null;
    for (const d of sortedDates) {
      if (prev && daysBetween(prev, d) === 1) run += 1;
      else run = 1;
      longest = Math.max(longest, run);
      prev = d;
    }
    longest = Math.max(longest, streak);
    const last = sortedDates[sortedDates.length - 1]!;
    return {
      current: streak,
      longest,
      lastPostDate: last,
      daysSinceLastPost: Math.max(0, daysBetween(last, today)),
    };
  }, [items]);

  // Persist streak for cross-session continuity.
  useEffect(() => {
    if (streakInfo.lastPostDate) {
      saveStreak({ current: streakInfo.current, longest: streakInfo.longest, lastPostDate: streakInfo.lastPostDate });
    }
  }, [streakInfo]);

  // ── AI hint ────────────────────────────────────────────────────────────
  const aiHint = useMemo(() => {
    if (streakInfo.daysSinceLastPost >= 3) {
      return `You haven't posted in ${streakInfo.daysSinceLastPost} days. Try sharing something in Midan.`;
    }
    if (streakInfo.current === 0) {
      return "Kick off your streak today — even a small Lamahat photo counts.";
    }
    if (streakInfo.current >= 5) {
      return `🔥 ${streakInfo.current}-day streak! Keep it going — schedule tomorrow's post now.`;
    }
    return null;
  }, [streakInfo]);

  // ── Calendar grid ──────────────────────────────────────────────────────
  const grid = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const startDay = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: string | null; day: number | null }[] = [];
    for (let i = 0; i < startDay; i++) cells.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date, day: d });
    }
    // pad to a multiple of 7
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    return cells;
  }, [viewMonth]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, ScheduledItem[]> = {};
    for (const it of items) {
      if (!map[it.date]) map[it.date] = [];
      map[it.date].push(it);
    }
    for (const k of Object.keys(map)) {
      map[k]!.sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [items]);

  const today = todayKey();
  const monthLabel = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const selectedItems = selectedDate ? (itemsByDate[selectedDate] ?? []) : [];

  // ── Item CRUD ──────────────────────────────────────────────────────────
  const addItem = () => {
    if (!composer.date) return;
    if (!draftTitle.trim()) {
      toast.error("Add a title first");
      return;
    }
    const newItem: ScheduledItem = {
      id: `c-${Date.now()}`,
      date: composer.date,
      module: draftModule,
      time: draftTime,
      title: draftTitle.trim(),
      notes: draftNotes.trim() || undefined,
      optimal: ["08:00", "12:00", "17:30", "19:00", "20:00", "21:00"].includes(draftTime),
    };
    persist([...items, newItem]);
    setDraftTitle("");
    setDraftNotes("");
    setComposer({ open: false, date: null });
    toast.success("Scheduled", { description: `${MODULE_META[newItem.module].label} · ${newItem.date} ${newItem.time}` });
  };

  const removeItem = (id: string) => {
    persist(items.filter((x) => x.id !== id));
    toast.success("Removed");
  };

  const moveItem = (id: string, newDate: string) => {
    persist(items.map((x) => (x.id === id ? { ...x, date: newDate } : x)));
    toast.success("Rescheduled", { description: `Moved to ${newDate}` });
  };

  // ── Drag and drop (basic) ──────────────────────────────────────────────
  const onItemDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const onDayDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDayDrop = (e: React.DragEvent<HTMLDivElement>, date: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    moveItem(id, date);
    setDraggingId(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-5xl" ariaLabel="Content Calendar">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Content Calendar</h2>
              <p className="text-xs text-muted-foreground">Cross-module scheduler · @{username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading} aria-label="Refresh">
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} /> Refresh
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ── Streak tracker + AI hint ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/40 bg-gradient-to-br from-amber-500/10 to-transparent p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Current streak
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums text-foreground">{streakInfo.current}</span>
                <span className="text-xs text-muted-foreground">day{streakInfo.current === 1 ? "" : "s"}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Flame className="w-3.5 h-3.5 text-rose-500" /> Longest streak
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums text-foreground">{streakInfo.longest}</span>
                <span className="text-xs text-muted-foreground">day{streakInfo.longest === 1 ? "" : "s"}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-secondary" /> Days since last post
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {streakInfo.daysSinceLastPost >= 999 ? "—" : streakInfo.daysSinceLastPost}
                </span>
                <span className="text-xs text-muted-foreground">day{streakInfo.daysSinceLastPost === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>

          {aiHint && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-secondary/30 bg-gradient-to-r from-secondary/10 to-transparent p-3 flex items-start gap-2"
            >
              <Sparkles className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80">{aiHint}</p>
            </motion.div>
          )}

          {/* ── Month nav + legend ──────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Previous month">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-semibold text-foreground min-w-[140px] text-center">{monthLabel}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Next month">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 ml-1" onClick={() => { const n = new Date(); setViewMonth(new Date(n.getFullYear(), n.getMonth(), 1)); setSelectedDate(today); }}>
                Today
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {MODULES.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className={cn("w-2 h-2 rounded-full", MODULE_META[m].dot)} />
                  {MODULE_META[m].label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Optimal time
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading your calendar…</p>
            </div>
          ) : (
            <>
              {/* ── Calendar grid ─────────────────────────────────────────── */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="text-[10px] uppercase tracking-wide text-muted-foreground py-1">{d}</div>
                ))}
                {grid.map((cell, idx) => {
                  if (!cell.date) return <div key={`empty-${idx}`} />;
                  const dayItems = itemsByDate[cell.date] ?? [];
                  const isToday = cell.date === today;
                  const isSelected = cell.date === selectedDate;
                  return (
                    <div
                      key={cell.date}
                      onDragOver={onDayDragOver}
                      onDrop={(e) => onDayDrop(e, cell.date!)}
                      onClick={() => setSelectedDate(cell.date)}
                      className={cn(
                        "min-h-[78px] rounded-lg border p-1.5 cursor-pointer transition-colors text-left",
                        isSelected ? "border-secondary bg-secondary/10" : "border-border/40 bg-muted/10 hover:bg-muted/30",
                        isToday && !isSelected && "ring-1 ring-secondary/50",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[11px] font-medium tabular-nums",
                          isToday ? "text-secondary" : "text-foreground/80",
                        )}>{cell.day}</span>
                        {dayItems.length > 0 && (
                          <span className="text-[9px] text-muted-foreground">{dayItems.length}</span>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {dayItems.slice(0, 3).map((it) => (
                          <div
                            key={it.id}
                            draggable
                            onDragStart={(e) => onItemDragStart(e, it.id)}
                            onDragEnd={() => setDraggingId(null)}
                            className={cn(
                              "group rounded px-1 py-0.5 text-[9px] flex items-center gap-0.5 cursor-grab active:cursor-grabbing",
                              "bg-gradient-to-r", MODULE_META[it.module].tint,
                              "border border-border/30",
                            )}
                            title={`${it.time} · ${it.title}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedDate(cell.date); }}
                          >
                            <GripVertical className="w-2 h-2 opacity-40 group-hover:opacity-80" />
                            {it.optimal && <span className="w-1 h-1 rounded-full bg-amber-500" />}
                            <span className="font-medium text-foreground/80">{it.time}</span>
                            <span className="truncate text-foreground/70">{it.title}</span>
                          </div>
                        ))}
                        {dayItems.length > 3 && (
                          <div className="text-[9px] text-muted-foreground pl-1">+{dayItems.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Selected day detail ──────────────────────────────────── */}
              <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Selected day</div>
                    <div className="text-sm font-semibold text-foreground">
                      {selectedDate
                        ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                        : "—"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!selectedDate}
                    onClick={() => {
                      if (!selectedDate) return;
                      setComposer({ open: true, date: selectedDate });
                      setDraftTime("19:00");
                      setDraftModule("midan");
                      setDraftTitle("");
                      setDraftNotes("");
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Schedule new
                  </Button>
                </div>

                {selectedDate && selectedItems.length === 0 && (
                  <p className="text-xs text-muted-foreground py-3 text-center">Nothing scheduled. Click "Schedule new" to add a post.</p>
                )}

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {selectedItems.map((it) => (
                    <motion.div
                      key={it.id}
                      layout
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      className={cn(
                        "rounded-lg border border-border/40 bg-gradient-to-r p-3",
                        MODULE_META[it.module].tint,
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-base">{MODULE_META[it.module].emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-foreground">{it.time}</span>
                            {it.optimal && (
                              <span className="inline-flex items-center gap-1 text-[9px] px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                <span className="w-1 h-1 rounded-full bg-amber-500" /> Optimal
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">{MODULE_META[it.module].label}</span>
                          </div>
                          <div className="text-sm text-foreground mt-0.5 line-clamp-2">{it.title}</div>
                          {it.notes && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{it.notes}</div>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeItem(it.id)} aria-label="Delete scheduled item">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Best-time legend */}
              <div className="rounded-xl border border-border/40 bg-muted/10 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">Best posting times</span> (gold dots): 08:00, 12:00, 17:30, 19:00, 20:00, 21:00 — based on your historical engagement. Drag a scheduled item to a different day to reschedule.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Schedule-new sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {composer.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-sm"
            onClick={() => setComposer({ open: false, date: null })}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-border/60 bg-card shadow-float p-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground">Schedule new post</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setComposer({ open: false, date: null })} aria-label="Close">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                {composer.date ? new Date(`${composer.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : ""}
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Module</Label>
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {MODULES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDraftModule(m)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-lg border p-2 text-[10px] transition-colors",
                          draftModule === m
                            ? "border-secondary bg-secondary/10 text-foreground"
                            : "border-border/40 bg-muted/10 text-muted-foreground hover:bg-muted/30",
                        )}
                        aria-pressed={draftModule === m}
                      >
                        <span className="text-base">{MODULE_META[m].emoji}</span>
                        {MODULE_META[m].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="cc-time" className="text-xs">Time</Label>
                  <Input
                    id="cc-time"
                    type="time"
                    value={draftTime}
                    onChange={(e) => setDraftTime(e.target.value)}
                    className="mt-1"
                  />
                  {["08:00", "12:00", "17:30", "19:00", "20:00", "21:00"].includes(draftTime) && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-amber-500" /> Optimal posting window
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="cc-title" className="text-xs">Title / preview</Label>
                  <Input
                    id="cc-title"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="e.g. Coffee shop micro-review"
                    className="mt-1"
                    maxLength={140}
                  />
                </div>
                <div>
                  <Label htmlFor="cc-notes" className="text-xs">Notes (optional)</Label>
                  <Textarea
                    id="cc-notes"
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="Talking points, attachments, links…"
                    className="mt-1"
                    rows={3}
                    maxLength={500}
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="ghost" className="flex-1" onClick={() => setComposer({ open: false, date: null })}>Cancel</Button>
                  <Button variant="secondary" className="flex-1" onClick={addItem}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Schedule
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </OverlayShell>
  );
}

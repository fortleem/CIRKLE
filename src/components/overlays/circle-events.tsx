"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  X, Calendar, Clock, MapPin, Plus, ChevronLeft, ChevronRight,
  Check, HelpCircle, X as XIcon, Loader2, Users,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CircleEventApi {
  id: string;
  title: string;
  description: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  createdBy: string;
  rsvpCounts: { going: number; maybe: number; not_going: number };
  myRsvp: "going" | "maybe" | "not_going" | null;
}

interface EventsResponse { events: CircleEventApi[] }

type RsvpStatus = "going" | "maybe" | "not_going";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  } catch { return ""; }
}

// ─────────────────────────────────────────────────────────────────────────────
// CircleEvents — overlay with a month-grid calendar + event list + RSVP.
// ─────────────────────────────────────────────────────────────────────────────

export function CircleEvents({
  open, circleId, userLabel, canCreate, onClose,
}: {
  open: boolean;
  circleId: string | null;
  userLabel?: string;
  canCreate: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<EventsResponse>({
    queryKey: ["circle-events", circleId],
    queryFn: async () => {
      if (!circleId) return { events: [] };
      const url = new URL(`/api/circles/${encodeURIComponent(circleId)}/events`, window.location.origin);
      if (userLabel) url.searchParams.set("user", userLabel);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e?.error || `Failed to load events (${res.status})`);
      }
      return (await res.json()) as EventsResponse;
    },
    enabled: open && !!circleId,
    staleTime: 15_000,
  });

  const events = data?.events ?? [];

  // Build a map: day-of-month -> events on that day (for the current cursor month).
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CircleEventApi[]>();
    for (const e of events) {
      const d = new Date(e.startsAt);
      if (d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth()) {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const arr = map.get(key) || [];
        arr.push(e);
        map.set(key, arr);
      }
    }
    return map;
  }, [events, cursor]);

  // Calendar grid: 6 weeks (42 cells) starting from the Sunday before the 1st.
  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDay = first.getDay(); // 0=Sun
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - startDay + i);
      cells.push(d);
    }
    return cells;
  }, [cursor]);

  const today = new Date();

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: RsvpStatus }) => {
      if (!circleId) throw new Error("circle not loaded");
      const res = await fetch(
        `/api/circles/${encodeURIComponent(circleId)}/events/${encodeURIComponent(eventId)}/rsvp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: userLabel || "u_current", status }),
        },
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e?.error || `Failed to RSVP (${res.status})`);
      }
      return (await res.json()) as { status: RsvpStatus; rsvpCounts: { going: number; maybe: number; not_going: number } };
    },
    onSuccess: (_data, vars) => {
      toast.success(`RSVP updated: ${vars.status.replace("_", " ")}`);
      queryClient.invalidateQueries({ queryKey: ["circle-events", circleId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[160]"
            style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            role="dialog" aria-label="Circle events"
            className="fixed inset-x-0 bottom-0 top-[5vh] z-[170] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            {/* Header */}
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-lg leading-tight">Events</h2>
                <p className="text-[11px] text-muted-foreground">
                  Schedule meetups and track who&apos;s coming.
                </p>
              </div>
              {canCreate && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center gap-1 hover:opacity-90"
                >
                  <Plus className="w-3.5 h-3.5" /> New
                </button>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Calendar header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                  className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="font-display text-base">
                  {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
                </div>
                <button
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                  className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday labels */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                    {d.slice(0, 2)}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {grid.map((d, i) => {
                  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                  const dayEvents = eventsByDay.get(key) || [];
                  const inMonth = d.getMonth() === cursor.getMonth();
                  const isToday = sameDay(d, today);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (dayEvents.length > 0) {
                          setSelectedEventId(dayEvents[0].id);
                        }
                      }}
                      className={`aspect-square rounded-lg text-[11px] flex flex-col items-center justify-center gap-0.5 transition ${
                        inMonth ? "glass hover:bg-muted/60" : "opacity-30"
                      } ${isToday ? "ring-1 ring-secondary" : ""}`}
                    >
                      <span className={isToday ? "font-bold text-secondary" : ""}>{d.getDate()}</span>
                      {dayEvents.length > 0 && (
                        <span className="w-1 h-1 rounded-full bg-secondary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Event list */}
              <div className="mt-6">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Upcoming events
                </div>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="ml-2 text-sm">Loading events…</span>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto opacity-50 mb-2" />
                    <div className="text-sm">No events scheduled</div>
                    {canCreate ? (
                      <div className="text-[11px] mt-1">Tap “New” to schedule the first one.</div>
                    ) : (
                      <div className="text-[11px] mt-1">Only admins/moderators can create events.</div>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {events.map((e) => (
                      <li key={e.id}>
                        <button
                          onClick={() => setSelectedEventId(e.id)}
                          className="w-full text-start rounded-2xl glass p-3 hover:bg-muted/60 transition"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-hero flex flex-col items-center justify-center text-cream shrink-0">
                              <span className="text-[9px] uppercase leading-none">
                                {new Date(e.startsAt).toLocaleDateString([], { month: "short" })}
                              </span>
                              <span className="text-base font-bold leading-none mt-0.5">
                                {new Date(e.startsAt).getDate()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{e.title}</div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {fmtTime(e.startsAt)}
                                </span>
                                {e.location && (
                                  <span className="inline-flex items-center gap-1 truncate">
                                    <MapPin className="w-3 h-3" /> {e.location}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-3">
                                <span className="inline-flex items-center gap-1">
                                  <Check className="w-3 h-3 text-secondary" /> {e.rsvpCounts.going} going
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <HelpCircle className="w-3 h-3" /> {e.rsvpCounts.maybe} maybe
                                </span>
                              </div>
                            </div>
                            {e.myRsvp && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary capitalize">
                                {e.myRsvp.replace("_", " ")}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>

          {/* Event detail sheet */}
          <AnimatePresence>
            {selectedEvent && (
              <EventDetailSheet
                event={selectedEvent}
                onClose={() => setSelectedEventId(null)}
                onRsvp={(status) => {
                  rsvpMutation.mutate({ eventId: selectedEvent.id, status });
                }}
                rsvpPending={rsvpMutation.isPending}
              />
            )}
          </AnimatePresence>

          {/* Create event sheet */}
          <AnimatePresence>
            {showCreate && circleId && (
              <CreateEventSheet
                circleId={circleId}
                userLabel={userLabel}
                onClose={() => setShowCreate(false)}
                onCreated={() => {
                  setShowCreate(false);
                  queryClient.invalidateQueries({ queryKey: ["circle-events", circleId] });
                  toast.success("Event scheduled");
                }}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EventDetailSheet — shows full event details + RSVP buttons.
// ─────────────────────────────────────────────────────────────────────────────

function EventDetailSheet({
  event, onClose, onRsvp, rsvpPending,
}: {
  event: CircleEventApi;
  onClose: () => void;
  onRsvp: (status: RsvpStatus) => void;
  rsvpPending: boolean;
}) {
  const RSVP_OPTIONS: { status: RsvpStatus; label: string; icon: typeof Check }[] = [
    { status: "going", label: "Going", icon: Check },
    { status: "maybe", label: "Maybe", icon: HelpCircle },
    { status: "not_going", label: "Not going", icon: XIcon },
  ];
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[180]"
        style={{ background: "hsl(var(--charcoal) / 0.6)", backdropFilter: "blur(8px)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 bottom-0 z-[190] glass-strong rounded-t-3xl shadow-float max-w-2xl mx-auto p-5 pb-8"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-hero flex flex-col items-center justify-center text-cream shrink-0">
            <span className="text-[9px] uppercase leading-none">
              {new Date(event.startsAt).toLocaleDateString([], { month: "short" })}
            </span>
            <span className="text-base font-bold leading-none mt-0.5">
              {new Date(event.startsAt).getDate()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg leading-tight">{event.title}</h3>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {fmtDate(event.startsAt)} · {fmtTime(event.startsAt)}
              {event.endsAt && ` → ${fmtTime(event.endsAt)}`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {event.description && (
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap mb-3">
            {event.description}
          </p>
        )}
        {event.location && (
          <div className="rounded-2xl glass p-3 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-secondary shrink-0" />
            <span className="text-sm truncate">{event.location}</span>
          </div>
        )}

        <div className="rounded-2xl glass p-3 mb-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" /> Attendees
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-secondary" /> {event.rsvpCounts.going} going
            </span>
            <span className="inline-flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> {event.rsvpCounts.maybe} maybe
            </span>
            <span className="inline-flex items-center gap-1">
              <XIcon className="w-3.5 h-3.5 text-muted-foreground" /> {event.rsvpCounts.not_going} not going
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {RSVP_OPTIONS.map((opt) => {
            const active = event.myRsvp === opt.status;
            const Ic = opt.icon;
            return (
              <button
                key={opt.status}
                disabled={rsvpPending}
                onClick={() => onRsvp(opt.status)}
                className={`py-2.5 rounded-full text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 ${
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "glass hover:bg-muted/60"
                }`}
              >
                <Ic className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateEventSheet — title/date/time/location/description form.
// ─────────────────────────────────────────────────────────────────────────────

function CreateEventSheet({
  circleId, userLabel, onClose, onCreated,
}: {
  circleId: string;
  userLabel?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("19:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (title.trim().length < 2) {
      toast.error("Title must be at least 2 characters");
      return;
    }
    setBusy(true);
    try {
      const startsAt = new Date(`${date}T${time}:00`);
      if (!isFinite(startsAt.getTime())) {
        toast.error("Invalid date/time");
        setBusy(false);
        return;
      }
      const res = await fetch(`/api/circles/${encodeURIComponent(circleId)}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          location: location.trim() || undefined,
          startsAt: startsAt.toISOString(),
          createdBy: userLabel || "u_current",
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e?.error || `Failed (${res.status})`);
      }
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[180]"
        style={{ background: "hsl(var(--charcoal) / 0.6)", backdropFilter: "blur(8px)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 bottom-0 z-[190] glass-strong rounded-t-3xl shadow-float max-w-2xl mx-auto p-5 pb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg">Schedule event</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              placeholder="Weekly coffee meetup"
              className="w-full mt-1 px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Location (optional)</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={140}
              placeholder="Café X, downtown"
              className="w-full mt-1 px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={600}
              rows={3}
              placeholder="What to expect, what to bring…"
              className="w-full mt-1 px-3 py-2 rounded-xl glass text-sm outline-none focus:ring-1 focus:ring-secondary resize-none"
            />
          </div>

          <button
            onClick={submit}
            disabled={busy}
            className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Schedule event
          </button>
        </div>
      </motion.div>
    </>
  );
}

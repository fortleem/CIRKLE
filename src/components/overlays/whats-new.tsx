"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Search, X, Sparkles, ChevronRight, Check, Filter, RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { OverlayShell } from "@/components/ui/overlay-shell";
import {
  OVERLAY_REGISTRY,
  CATEGORY_META,
  type OverlayCategory,
  type OverlayEntry,
} from "@/lib/overlay-registry";

/**
 * localStorage key — a single JSON array of overlay IDs the user has
 * already seen in the What's New panel. Whenever new features ship,
 * their IDs are absent here and therefore show the "NEW" badge.
 */
export const WHATS_NEW_SEEN_KEY = "cirkle-whats-new-seen";

/** Event name dispatched to open this overlay from anywhere in the app. */
export const WHATS_NEW_EVENT = "circle:whats-new";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Shape persisted to localStorage. */
type SeenMap = Record<string, true>;

function readSeen(): SeenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WHATS_NEW_SEEN_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: SeenMap = {};
    for (const k of Object.keys(parsed as Record<string, unknown>)) {
      if (typeof (parsed as Record<string, unknown>)[k] === "boolean" ||
          typeof (parsed as Record<string, unknown>)[k] === "number" ||
          (parsed as Record<string, unknown>)[k] === true) {
        out[k] = true;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeSeen(map: SeenMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WHATS_NEW_SEEN_KEY, JSON.stringify(map));
  } catch {
    /* private mode / quota — ignore */
  }
}

/**
 * What's New — feature-discoverability overlay.
 *
 * Surfaces EVERY Cirkle overlay sourced from the live overlay registry,
 * not a hardcoded list. Each card dispatches its `circle:*` event and
 * opens the corresponding screen. Features the user hasn't seen yet
 * show a "NEW" badge and are sorted to the top.
 */
export function WhatsNew({ open, onClose }: Props) {
  const [seen, setSeen] = useState<SeenMap>({});
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<OverlayCategory | "all">("all");
  const [showOnlyNew, setShowOnlyNew] = useState(false);

  // Track prevOpen to reset transient state when the overlay re-opens,
  // and re-hydrate the seen map from localStorage so newly learned
  // overlays from a parallel tab are reflected. (Same prevOpen pattern
  // used by LamahatViewer / FirstLaunchTour to avoid the
  // react-hooks/set-state-in-effect lint rule — derived state, no effect.)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQ("");
      setActiveCat("all");
      setShowOnlyNew(false);
      setSeen(readSeen());
    }
  }

  // Sort: NEW (unseen) first, then by category, then by registry order.
  const sorted = useMemo(() => {
    return [...OVERLAY_REGISTRY].sort((a, b) => {
      const aNew = !seen[a.id];
      const bNew = !seen[b.id];
      if (aNew && !bNew) return -1;
      if (!aNew && bNew) return 1;
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return 0;
    });
  }, [seen]);

  const filtered = useMemo(() => {
    const lower = q.trim().toLowerCase();
    return sorted.filter((entry) => {
      if (activeCat !== "all" && entry.category !== activeCat) return false;
      if (showOnlyNew && seen[entry.id]) return false;
      if (!lower) return true;
      const haystack = [
        entry.name,
        entry.description,
        entry.emoji,
        entry.category,
        ...(entry.keywords ?? []),
      ].join(" ").toLowerCase();
      return haystack.includes(lower);
    });
  }, [sorted, q, activeCat, showOnlyNew, seen]);

  const newCount = useMemo(
    () => OVERLAY_REGISTRY.reduce((n, e) => (seen[e.id] ? n : n + 1), 0),
    [seen],
  );

  const grouped = useMemo(() => {
    const acc: Record<OverlayCategory, OverlayEntry[]> = {
      safety: [], social: [], media: [], ai: [], travel: [],
      finance: [], privacy: [], productivity: [], health: [],
    };
    for (const e of filtered) acc[e.category].push(e);
    return acc;
  }, [filtered]);

  const launch = useCallback((entry: OverlayEntry) => {
    // Mark as seen immediately so the badge disappears on next open.
    setSeen((prev) => {
      if (prev[entry.id]) return prev;
      const next = { ...prev, [entry.id]: true as const };
      writeSeen(next);
      return next;
    });
    window.dispatchEvent(new CustomEvent(entry.event));
    onClose();
  }, [onClose]);

  const markAllSeen = useCallback(() => {
    const next: SeenMap = {};
    for (const e of OVERLAY_REGISTRY) next[e.id] = true;
    writeSeen(next);
    setSeen(next);
  }, []);

  const resetSeen = useCallback(() => {
    writeSeen({});
    setSeen({});
  }, []);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="sheet"
      maxWidth="md:max-w-3xl"
      ariaLabel="What's new in Cirkle"
      titleId="whats-new-title"
    >
      {/* Header */}
      <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/10 border border-border/40 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Discover Cirkle
          </div>
          <h2 id="whats-new-title" className="font-display text-xl truncate">
            What&apos;s New
          </h2>
        </div>
        {newCount > 0 && (
          <span
            className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-secondary text-charcoal"
            aria-label={`${newCount} new features`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-charcoal/70 animate-pulse" />
            {newCount} NEW
          </span>
        )}
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Close What's New"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Search + filters */}
      <div className="px-5 py-3 border-b border-border/50 space-y-3">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full glass">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search features by name, keyword, or category…"
            className="flex-1 bg-transparent outline-none text-sm md:text-base placeholder:text-muted-foreground"
            aria-label="Search features"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="text-[10px] text-muted-foreground hover:text-foreground transition px-1.5 py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
            {filtered.length} / {OVERLAY_REGISTRY.length}
          </kbd>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          <button
            onClick={() => setActiveCat("all")}
            aria-pressed={activeCat === "all"}
            className={`shrink-0 text-[11px] px-3 py-1.5 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeCat === "all"
                ? "bg-foreground text-background border-foreground"
                : "bg-card border-border/60 text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <Filter className="w-3 h-3 inline -mt-0.5 mr-1" aria-hidden />
            All
          </button>
          {(Object.keys(CATEGORY_META) as OverlayCategory[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            const active = activeCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCat(active ? "all" : cat)}
                aria-pressed={active}
                className={`shrink-0 text-[11px] px-3 py-1.5 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border/60 text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <span aria-hidden>{meta.emoji}</span> {meta.label}
              </button>
            );
          })}
          <div className="w-px h-5 bg-border/60 shrink-0 mx-1" aria-hidden />
          <button
            onClick={() => setShowOnlyNew((v) => !v)}
            aria-pressed={showOnlyNew}
            className={`shrink-0 text-[11px] px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              showOnlyNew
                ? "bg-secondary text-charcoal border-secondary"
                : "bg-card border-border/60 text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <span className="relative flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
              {newCount > 0 && !showOnlyNew && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" aria-hidden />
              )}
            </span>
            New only · {newCount}
          </button>
        </div>
      </div>

      {/* Body — grouped by category, NEW badges on unseen items */}
      <div className="flex-1 overflow-y-auto px-5 py-4 max-h-[80vh]">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-3 text-secondary" aria-hidden />
            <p className="text-sm text-muted-foreground">
              No features match your filters.
            </p>
            <button
              onClick={() => { setQ(""); setActiveCat("all"); setShowOnlyNew(false); }}
              className="mt-3 text-xs px-3 py-1.5 rounded-full glass hover:bg-muted/60 transition inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCcw className="w-3 h-3" aria-hidden /> Reset filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {(Object.keys(CATEGORY_META) as OverlayCategory[])
                .filter((cat) => grouped[cat]?.length > 0)
                .map((cat) => {
                  const meta = CATEGORY_META[cat];
                  return (
                    <motion.section
                      key={cat}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="text-base" aria-hidden>{meta.emoji}</span>
                        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                          {meta.label}
                        </h3>
                        <span className="text-[10px] text-muted-foreground/70">
                          · {grouped[cat].length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {grouped[cat].map((entry, i) => {
                          const isNew = !seen[entry.id];
                          return (
                            <motion.button
                              key={entry.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(i * 0.025, 0.3), duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                              onClick={() => launch(entry)}
                              className="relative text-start rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3 hover:scale-[1.02] hover:border-secondary/40 transition overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              aria-label={`Open ${entry.name}${isNew ? ", new feature" : ""}`}
                            >
                              {isNew && (
                                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-secondary/25 to-primary/5 blur-2xl opacity-70 group-hover:opacity-100 transition pointer-events-none" aria-hidden />
                              )}
                              <div className="relative w-10 h-10 rounded-xl glass border border-border/40 flex items-center justify-center shrink-0 text-lg">
                                {entry.emoji}
                              </div>
                              <div className="relative flex-1 min-w-0">
                                <div className="font-display text-sm leading-tight truncate flex items-center gap-1.5">
                                  {entry.name}
                                  {isNew && (
                                    <span
                                      className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-secondary text-charcoal"
                                      aria-label="New feature"
                                    >
                                      NEW
                                    </span>
                                  )}
                                  {seen[entry.id] && (
                                    <span
                                      className="opacity-0 group-hover:opacity-100 text-emerald-500 transition"
                                      aria-label="Seen"
                                      title="Seen"
                                    >
                                      <Check className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] md:text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
                                  {entry.description}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-[10px] text-secondary flex items-center gap-1">
                                    Open <ChevronRight className="w-3 h-3" aria-hidden />
                                  </span>
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.section>
                  );
                })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer — mark all seen / reset */}
      <footer className="px-5 py-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground gap-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted">ESC</kbd>
          close
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={resetSeen}
            className="hover:text-foreground transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 py-0.5"
            aria-label="Reset seen features — show all as new"
          >
            <RotateCcw className="w-3 h-3" aria-hidden /> Reset
          </button>
          {newCount > 0 && (
            <button
              onClick={markAllSeen}
              className="hover:text-foreground transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 py-0.5"
              aria-label={`Mark all ${newCount} new features as seen`}
            >
              <Check className="w-3 h-3" aria-hidden /> Mark all {newCount} seen
            </button>
          )}
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-secondary" aria-hidden />
            {OVERLAY_REGISTRY.length} features · 9 categories
          </span>
        </div>
      </footer>
    </OverlayShell>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, Sparkles, CornerDownLeft } from "lucide-react";
import { getCommandEntries, type CommandEntry } from "@/lib/overlay-registry";
import { useApp } from "@/lib/app-store";
import { dict } from "@/lib/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const COMMANDS: CommandEntry[] = getCommandEntries();

/** Display group for a command entry, derived from its `type`. */
function groupOf(entry: CommandEntry): string {
  if (entry.type === "action") return "Quick Actions";
  if (entry.type === "tab") return "Navigate";
  return "Features";
}

/**
 * Command Palette — ⌘K launcher.
 * Searches `getCommandEntries()` (8 tabs + 4 quick actions + every overlay)
 * and dispatches the right `circle:*` CustomEvent per entry. For tabs /
 * scan-pay, fires `circle:navigate` with the tab id as detail. Ghost mode
 * toggles the app store directly. Supports ↑/↓/Enter/ESC keyboard nav.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale, setGhostMode } = useApp();
  const t = dict[locale];
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // R3: Track recent + frequent commands via localStorage
  const trackUsage = (entry: CommandEntry) => {
    try {
      const recentRaw = localStorage.getItem("cirkle-cmd-recent");
      const recent: string[] = recentRaw ? JSON.parse(recentRaw) : [];
      // Remove if already present, add to front, cap at 5
      const updated = [entry.id, ...recent.filter(id => id !== entry.id)].slice(0, 5);
      localStorage.setItem("cirkle-cmd-recent", JSON.stringify(updated));
      // Increment frequent count
      const freqRaw = localStorage.getItem("cirkle-cmd-freq");
      const freq: Record<string, number> = freqRaw ? JSON.parse(freqRaw) : {};
      freq[entry.id] = (freq[entry.id] || 0) + 1;
      localStorage.setItem("cirkle-cmd-freq", JSON.stringify(freq));
    } catch { /* ignore */ }
  };

  const recentEntries = useMemo(() => {
    if (q) return []; // Only show when no search query
    try {
      const recentRaw = localStorage.getItem("cirkle-cmd-recent");
      const recent: string[] = recentRaw ? JSON.parse(recentRaw) : [];
      return recent.map(id => COMMANDS.find(c => c.id === id)).filter(Boolean) as CommandEntry[];
    } catch { return []; }
  }, [q, open]);

  const frequentEntries = useMemo(() => {
    if (q) return []; // Only show when no search query
    try {
      const freqRaw = localStorage.getItem("cirkle-cmd-freq");
      const freq: Record<string, number> = freqRaw ? JSON.parse(freqRaw) : {};
      return Object.entries(freq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => COMMANDS.find(c => c.id === id))
        .filter(Boolean) as CommandEntry[];
    } catch { return []; }
  }, [q, open]);

  // Combined list: recent + frequent (deduped) + all commands
  const filtered = useMemo(() => {
    if (!q) {
      // No search: show recent/frequent first, then all
      const seen = new Set<string>();
      const top: { entry: CommandEntry; section: string }[] = [];
      recentEntries.forEach(e => { if (!seen.has(e.id)) { seen.add(e.id); top.push({ entry: e, section: "Recent" }); } });
      frequentEntries.forEach(e => { if (!seen.has(e.id)) { seen.add(e.id); top.push({ entry: e, section: "Frequent" }); } });
      return { top, rest: COMMANDS.filter(c => !seen.has(c.id)) };
    }
    const lower = q.toLowerCase();
    const results = COMMANDS.filter((c) => {
      const label = c.label.toLowerCase();
      const keywords = (c.keywords ?? []).join(" ").toLowerCase();
      return label.includes(lower) || keywords.includes(lower);
    });
    return { top: [], rest: results };
  }, [q, recentEntries, frequentEntries]);

  // reset query + active whenever the palette opens
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQ("");
      setActive(0);
    }
  }

  // focus input when opened
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [open]);

  // Flatten for keyboard nav + rendering
  const flatFiltered = [...filtered.top.map(t => t.entry), ...filtered.rest];
  const flatSections = [
    ...filtered.top.map(t => ({ label: t.section, count: 1 })),
    { label: q ? "Results" : "All", count: filtered.rest.length },
  ].filter(s => s.count > 0);

  // clamp active index when filter changes
  const [prevLen, setPrevLen] = useState(flatFiltered.length);
  if (flatFiltered.length !== prevLen) {
    setPrevLen(flatFiltered.length);
    setActive((a) => Math.min(a, Math.max(0, flatFiltered.length - 1)));
  }

  const dispatch = (entry: CommandEntry) => {
    // Special action: ghost mode toggles the app store directly (no event).
    if (entry.id === "act-ghost-mode") {
      setGhostMode(true);
      toast.success("Ghost mode enabled", { description: "You are now invisible everywhere." });
    } else if (entry.tab) {
      // Tab navigation (covers all "tab" entries + the scan-pay action).
      window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: entry.tab } }));
      if (entry.id === "act-scan-pay") {
        toast.success("Scan & Pay ready", { description: "Hold your phone near any QR code." });
      }
    } else if (entry.event) {
      // Overlay / generic action: dispatch the entry's circle:* event.
      window.dispatchEvent(new CustomEvent(entry.event));
    }
    trackUsage(entry); // R3: record for recent/frequent
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = flatFiltered[active];
      if (c) dispatch(c);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // group filtered results preserving order
  const grouped = useMemo(() => {
    const acc: Record<string, CommandEntry[]> = {};
    flatFiltered.forEach((c) => {
      const g = groupOf(c);
      (acc[g] = acc[g] || []).push(c);
    });
    return acc;
  }, [flatFiltered]);

  const flatIds = flatFiltered.map((c) => c.id);

  // scroll active into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140]"
            style={{ background: "hsl(var(--charcoal) / 0.6)", backdropFilter: "blur(8px)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Command palette"
            className="fixed top-[12vh] inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[560px] z-[150] glass-strong rounded-2xl shadow-float overflow-hidden flex flex-col max-h-[70vh]"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder={t.palette.placeholder}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                aria-label="Search commands"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {flatFiltered.length}
              </kbd>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">ESC</kbd>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto py-2">
              {flatFiltered.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Sparkles className="w-5 h-5 mx-auto mb-2 text-secondary" />
                  <p className="text-sm text-muted-foreground">No commands match.</p>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("circle:ai"));
                      onClose();
                    }}
                    className="mt-3 text-xs px-3 py-1.5 rounded-full glass hover:bg-muted/60 transition inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-secondary" /> Ask Cirkle AI instead
                  </button>
                </div>
              ) : (
                Object.entries(grouped).map(([group, items]) => (
                  <div key={group} className="px-2 mb-2">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {group}
                    </div>
                    {items.map((c) => {
                      const idx = flatIds.indexOf(c.id);
                      const isActive = idx === active;
                      return (
                        <button
                          key={c.id}
                          data-cmd-idx={idx}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => dispatch(c)}
                          className={`w-full text-start px-3 py-2.5 rounded-xl flex items-center gap-3 group transition ${
                            isActive ? "bg-muted/80" : "hover:bg-muted/40"
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition text-sm ${
                              isActive ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {c.icon ?? <ArrowRight className="w-3.5 h-3.5" />}
                          </span>
                          <span className="text-sm flex-1">{c.label}</span>
                          {c.type === "tab" && (
                            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              tab
                            </kbd>
                          )}
                          {c.type === "action" && (
                            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              action
                            </kbd>
                          )}
                          {isActive && <CornerDownLeft className="w-3 h-3 text-muted-foreground" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-muted">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-muted">↓</kbd>
                navigate
                <kbd className="ms-1 px-1.5 py-0.5 rounded bg-muted">↵</kbd>
                run
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-secondary" /> {COMMANDS.length} commands · On-device AI
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState, useCallback } from "react";
import { X, Search, ChevronRight, Sparkles, Brain } from "lucide-react";
import { toast } from "sonner";
import {
  OVERLAY_REGISTRY,
  CATEGORY_META,
  getOverlaysByCategory,
  type OverlayCategory,
  type OverlayEntry,
} from "@/lib/overlay-registry";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * OverlayBrowser — full-screen launcher for ALL 65 Cirkle overlays.
 *
 * • Searchable (name + description + keywords).
 * • Grouped by category, with each card dispatching its `circle:*` event.
 * • Same backdrop pattern as CircleHub / CommandPalette.
 */
export function OverlayBrowser({ open, onClose }: Props) {
  const [q, setQ] = useState("");
  const [brainLoading, setBrainLoading] = useState(false);

  // Brain-powered overlay search: ask the Brain to suggest overlays for a query.
  const brainSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setBrainLoading(true);
    try {
      const res = await fetch("/api/brain/cross-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: "feed",
          action: "search",
          query: `Which Cirkle overlay should I use for: ${query}?`,
          language: "en",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Brain AI suggests", {
          description: data.answer?.slice(0, 200) || "Search the overlays below.",
          duration: 5000,
        });
      }
    } catch {
      // Brain search is best-effort — don't block the user.
    } finally {
      setBrainLoading(false);
    }
  }, []);

  // Ask the Brain about a specific overlay.
  const askBrainAboutOverlay = useCallback(async (entry: OverlayEntry) => {
    setBrainLoading(true);
    try {
      const res = await fetch("/api/brain/cross-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: entry.category === "ai" ? "chat" : (entry.category as never),
          action: "analyze",
          query: `Tell me about the ${entry.name} feature: ${entry.description}`,
          language: "en",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Brain AI · ${entry.name}`, {
          description: data.answer?.slice(0, 250) || entry.description,
          duration: 6000,
        });
      }
    } catch {
      toast.error("Brain AI unavailable");
    } finally {
      setBrainLoading(false);
    }
  }, []);

  // Reset search every time the browser is opened.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setQ("");
  }

  const grouped = useMemo(() => getOverlaysByCategory(), []);

  // Filter overlays across every field. If the query is empty, return the
  // full grouped map so the grid renders every category by default.
  const filtered = useMemo(() => {
    if (!q.trim()) return grouped;
    const lower = q.toLowerCase();
    const acc = {} as Record<OverlayCategory, OverlayEntry[]>;
    for (const cat of Object.keys(CATEGORY_META) as OverlayCategory[]) acc[cat] = [];
    for (const entry of OVERLAY_REGISTRY) {
      const haystack = [
        entry.name,
        entry.description,
        entry.emoji,
        entry.category,
        ...(entry.keywords ?? []),
      ].join(" ").toLowerCase();
      if (haystack.includes(lower)) acc[entry.category].push(entry);
    }
    return acc;
  }, [q, grouped]);

  const totalShown = useMemo(
    () => Object.values(filtered).reduce((n, arr) => n + arr.length, 0),
    [filtered]
  );

  const launch = (entry: OverlayEntry) => {
    window.dispatchEvent(new CustomEvent(entry.event));
    onClose();
  };

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
            style={{ background: "hsl(var(--charcoal) / 0.6)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="All Cirkle features"
            className="fixed inset-x-0 top-[5vh] bottom-[5vh] z-[150] glass-strong rounded-3xl shadow-float overflow-hidden flex flex-col max-w-4xl mx-auto"
          >
            {/* Header — title + search */}
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/10 border border-border/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Cirkle Overlay Browser
                </div>
                <div className="font-display text-xl truncate">
                  All {OVERLAY_REGISTRY.length} Cirkle overlays
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Search bar */}
            <div className="px-5 py-3 border-b border-border/50">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-full glass">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search overlays by name, description, or keyword…"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  aria-label="Search overlays"
                />
                {q && (
                  <>
                    <button
                      onClick={() => brainSearch(q)}
                      disabled={brainLoading}
                      className="text-[10px] text-secondary hover:text-secondary/80 transition flex items-center gap-1 disabled:opacity-50"
                      aria-label="Ask Brain AI"
                    >
                      <Brain className="w-3 h-3" /> {brainLoading ? "..." : "Ask Brain"}
                    </button>
                    <button
                      onClick={() => setQ("")}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition"
                      aria-label="Clear search"
                    >
                      Clear
                    </button>
                  </>
                )}
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {totalShown} / {OVERLAY_REGISTRY.length}
                </kbd>
              </div>
            </div>

            {/* Grid body — grouped by category */}
            <div className="flex-1 overflow-y-auto px-5 py-4 max-h-[80vh]">
              {totalShown === 0 ? (
                <div className="py-16 text-center">
                  <Sparkles className="w-6 h-6 mx-auto mb-3 text-secondary" />
                  <p className="text-sm text-muted-foreground">
                    No overlays match &quot;{q}&quot;.
                  </p>
                  <button
                    onClick={() => setQ("")}
                    className="mt-3 text-xs px-3 py-1.5 rounded-full glass hover:bg-muted/60 transition inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-secondary" /> Show all
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {(Object.keys(CATEGORY_META) as OverlayCategory[])
                    .filter((cat) => filtered[cat]?.length > 0)
                    .map((cat) => {
                      const meta = CATEGORY_META[cat];
                      return (
                        <section key={cat}>
                          <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="text-base">{meta.emoji}</span>
                            <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                              {meta.label}
                            </h3>
                            <span className="text-[10px] text-muted-foreground/70">
                              · {filtered[cat].length}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filtered[cat].map((entry, i) => (
                              <motion.button
                                key={entry.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                onClick={() => launch(entry)}
                                className="relative text-start rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3 hover:scale-[1.02] hover:border-secondary/40 transition overflow-hidden group"
                              >
                                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-secondary/20 to-primary/5 blur-2xl opacity-50 group-hover:opacity-100 transition" />
                                <div className="relative w-10 h-10 rounded-xl glass border border-border/40 flex items-center justify-center shrink-0 text-lg">
                                  {entry.emoji}
                                </div>
                                <div className="relative flex-1 min-w-0">
                                  <div className="font-display text-sm leading-tight truncate flex items-center gap-1.5">
                                    {entry.name}
                                    {/* R6: NEW badge for recently added overlays */}
                                    {["broadcast-channel", "gif-picker", "work-mode", "device-verify", "brain-orchestrator", "pro-network", "cirkle-maps", "circle-mail", "ad-studio", "cirkle-gradebook", "knowledge-wiki", "poll-creator", "bullet-comments", "family-vault", "ticket-mint", "phone-migrate", "data-residency", "creator-studio", "call-screen", "bot-developer", "personal-ai-os", "mesh-dashboard", "oracle-markets", "cirkle-identity", "shield-dashboard"].includes(entry.id) && (
                                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-secondary text-charcoal">NEW</span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                                    {entry.description}
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="text-[10px] text-secondary flex items-center gap-1">
                                      Open <ChevronRight className="w-3 h-3" />
                                    </span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); askBrainAboutOverlay(entry); }}
                                      disabled={brainLoading}
                                      className="text-[9px] text-muted-foreground hover:text-secondary flex items-center gap-0.5 transition disabled:opacity-50"
                                      aria-label={`Ask Brain about ${entry.name}`}
                                    >
                                      <Brain className="w-2.5 h-2.5" /> AI
                                    </button>
                                  </div>
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-muted">ESC</kbd>
                close
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-secondary" /> {OVERLAY_REGISTRY.length} overlays · 9 categories
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

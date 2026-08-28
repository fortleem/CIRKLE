// @ts-nocheck
"use client";

/**
 * Universal Search Overlay — searches across EVERY CIRKLE module.
 *
 * A fullscreen glass-aesthetic search surface that runs the user's query
 * against posts, messages, conversations, users, circles, services,
 * photo collections, events, and documents in parallel.
 *
 * Behaviour:
 *   • Large search input at the top
 *   • Module filter chips (All / Messages / Posts / People / Circles /
 *     Photos / Videos / News / Services)
 *   • Results grouped by type with type-icon, title, snippet, module badge
 *   • Click result → dispatches the appropriate navigation event
 *   • Loading state with spinner, empty state with prompt
 *   • Aria-complete (role=dialog, aria-modal, labelled inputs)
 *
 * Events dispatched:
 *   • circle:universal-search  (announces that the search overlay is open)
 *   • circle:circle-detail     (when a `circle` result is clicked)
 *   • circle:circle-event-detail (when an `event` result is clicked)
 *   • circle:navigate           (when a post / message / conversation /
 *                                 photo / video / news / service /
 *                                 document result is clicked — payload
 *                                 includes target tab + result id)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X, Search, Loader2, MessageSquare, FileText, Users as UsersIcon,
  Circle as CircleIcon, Image as ImageIcon, Video as VideoIcon,
  Newspaper, Building2, Calendar, Sparkles, Hash, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the API response shape.
// ─────────────────────────────────────────────────────────────────────────────

type SearchResultType =
  | "post" | "message" | "conversation" | "user" | "circle"
  | "photo" | "video" | "news" | "service" | "document" | "place" | "event";

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  snippet: string;
  module: string;
  url?: string;
  score: number;
  metadata?: Record<string, any>;
}

interface SearchResponse {
  query: string;
  modules: string[];
  count: number;
  results: SearchResult[];
  error?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module filter chips
// ─────────────────────────────────────────────────────────────────────────────

type ChipId =
  | "all" | "wasl" | "midan" | "federation" | "circles"
  | "lamahat" | "mashahd" | "news" | "service";

interface Chip {
  id: ChipId;
  label: string;
  /** Modules passed to the API when this chip is active. */
  modules?: string[];
}

const CHIPS: Chip[] = [
  { id: "all", label: "All" },
  { id: "wasl", label: "Messages", modules: ["wasl"] },
  { id: "midan", label: "Posts", modules: ["midan"] },
  { id: "federation", label: "People", modules: ["federation"] },
  { id: "circles", label: "Circles", modules: ["circles"] },
  { id: "lamahat", label: "Photos", modules: ["lamahat"] },
  { id: "mashahd", label: "Videos", modules: ["mashahd"] },
  { id: "news", label: "News", modules: ["news"] },
  { id: "service", label: "Services", modules: ["midan"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Type metadata — icon, label, accent classes per result type.
// ─────────────────────────────────────────────────────────────────────────────

interface TypeMeta {
  label: string;
  icon: LucideIcon;
  tint: string; // gradient + border classes
  badge: string; // badge color classes
}

const TYPE_META: Record<SearchResultType, TypeMeta> = {
  post: {
    label: "Post",
    icon: FileText,
    tint: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/40",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  message: {
    label: "Message",
    icon: MessageSquare,
    tint: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/40",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  conversation: {
    label: "Conversation",
    icon: Hash,
    tint: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/40",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  user: {
    label: "Person",
    icon: UsersIcon,
    tint: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/40",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  circle: {
    label: "Circle",
    icon: CircleIcon,
    tint: "from-emerald-500/25 to-emerald-500/5 border-emerald-500/40",
    badge: "bg-emerald-500/20 text-emerald-700 border-emerald-500/40",
  },
  photo: {
    label: "Photo",
    icon: ImageIcon,
    tint: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  video: {
    label: "Video",
    icon: VideoIcon,
    tint: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  news: {
    label: "News",
    icon: Newspaper,
    tint: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  service: {
    label: "Service",
    icon: Building2,
    tint: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/40",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  document: {
    label: "Document",
    icon: FileText,
    tint: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  place: {
    label: "Place",
    icon: ImageIcon,
    tint: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  event: {
    label: "Event",
    icon: Calendar,
    tint: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/40",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
};

// Display order of groups (undefined types are skipped).
const TYPE_ORDER: SearchResultType[] = [
  "user", "circle", "conversation", "post", "message", "photo",
  "video", "news", "event", "service", "document", "place",
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

/** Group results by their `type` for section rendering. */
function groupByType(results: SearchResult[]): Record<string, SearchResult[]> {
  const acc: Record<string, SearchResult[]> = {};
  for (const r of results) {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
  }
  return acc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function UniversalSearchOverlay({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState<ChipId>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Announce the search overlay being open. Other CIRKLE components can
  // listen for this event to, e.g., pause their own background polls.
  useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent("circle:universal-search", { detail: { open: true } }));
      // Focus the search input shortly after mount.
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Reset state when overlay closes.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setQuery("");
        setResults([]);
        setLoading(false);
        setError(null);
        setHasSearched(false);
        setActiveChip("all");
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Debounced search runner — fires when query/chip changes.
  const runSearch = useCallback(async (q: string, chip: ChipId) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      params.set("q", trimmed);
      const chipDef = CHIPS.find((c) => c.id === chip);
      if (chipDef?.modules && chipDef.modules.length > 0) {
        params.set("modules", chipDef.modules.join(","));
      }
      params.set("limit", "40");
      const res = await fetchWithTimeout(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = (await res.json()) as SearchResponse;
      setResults(data.results || []);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setError("Search timed out. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Search failed");
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced trigger — 280ms after typing stops.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query, activeChip);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, activeChip, open, runSearch]);

  // Keyboard shortcut — Esc handled by OverlayShell; Cmd/Ctrl+K → focus input.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ── Result click → dispatch the right navigation event ────────────────
  const launchResult = useCallback((r: SearchResult) => {
    switch (r.type) {
      case "circle":
        window.dispatchEvent(
          new CustomEvent("circle:circle-detail", { detail: { circleId: r.id } }),
        );
        onClose();
        break;
      case "event":
        window.dispatchEvent(
          new CustomEvent("circle:circle-event-detail", {
            detail: { eventId: r.id, circleId: r.metadata?.circleId },
          }),
        );
        onClose();
        break;
      case "user":
        window.dispatchEvent(
          new CustomEvent("circle:navigate", {
            detail: { tab: "profile", userId: r.id, circleId: r.metadata?.circleId },
          }),
        );
        onClose();
        break;
      case "conversation":
      case "message":
        window.dispatchEvent(
          new CustomEvent("circle:navigate", {
            detail: { tab: "wasl", conversationId: r.metadata?.conversationId || r.id },
          }),
        );
        onClose();
        break;
      case "post":
      case "news":
        window.dispatchEvent(
          new CustomEvent("circle:navigate", {
            detail: { tab: r.module === "news" ? "midan" : r.module || "midan", postId: r.id },
          }),
        );
        onClose();
        break;
      case "photo":
      case "document":
        window.dispatchEvent(
          new CustomEvent("circle:navigate", {
            detail: { tab: "lamahat", id: r.id },
          }),
        );
        onClose();
        break;
      case "video":
        window.dispatchEvent(
          new CustomEvent("circle:navigate", {
            detail: { tab: "mashahd", id: r.id },
          }),
        );
        onClose();
        break;
      case "service":
        window.dispatchEvent(
          new CustomEvent("circle:service-directory", {
            detail: { serviceId: r.metadata?.serviceId || r.id },
          }),
        );
        onClose();
        break;
      default:
        // Unknown type — just close the overlay.
        onClose();
    }
  }, [onClose]);

  // ── Derived view model ──────────────────────────────────────────────────
  const grouped = useMemo(() => groupByType(results), [results]);
  const visibleTypes = TYPE_ORDER.filter((t) => (grouped[t]?.length ?? 0) > 0);
  const totalResults = results.length;

  const showEmpty = !loading && hasSearched && totalResults === 0 && !error;
  const showInitial = !loading && !hasSearched && totalResults === 0 && !error;

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Universal Search — search across all of CIRKLE"
      titleId="universal-search-title"
    >
      {/* Aurora background — emerald accent only */}
      <div className="pointer-events-none absolute inset-0 aurora-bg opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background"
        aria-hidden
      />

      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="relative px-4 sm:px-6 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 glass-strong z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-500/5 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              CIRKLE · Universal Search
            </div>
            <h2 id="universal-search-title" className="font-display text-xl truncate">
              Search across all of CIRKLE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
            aria-label="Close search"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* Search input row */}
        <div className="max-w-3xl mx-auto mt-3">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, messages, people, circles, photos, services…"
              className="pl-11 pr-24 h-12 text-base rounded-full glass border-emerald-500/30 focus-visible:border-emerald-500/60"
              aria-label="Search query"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-full hover:bg-muted/60"
                  aria-label="Clear search query"
                >
                  Clear
                </button>
              )}
              <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Module filter chips */}
          <div
            className="mt-3 flex flex-wrap gap-2 max-h-96 overflow-y-auto cirkle-scrollbar"
            role="group"
            aria-label="Filter search by module"
          >
            {CHIPS.map((chip) => {
              const isActive = activeChip === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveChip(chip.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition border",
                    isActive
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50"
                      : "bg-card/60 text-muted-foreground border-border/50 hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ───────────────────────── Body ───────────────────────── */}
      <main className="relative flex-1 overflow-y-auto cirkle-scrollbar z-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 pb-[env(safe-area-inset-bottom)]">
          {/* Loading state */}
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-center" role="status" aria-live="polite">
              <Loader2 className="w-7 h-7 text-emerald-500 animate-spin mb-3" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Searching {activeChip === "all" ? "every module" : activeChip} for &quot;{query}&quot;…
              </p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="py-12 text-center" role="alert">
              <p className="text-sm text-destructive mb-2">{error}</p>
              <button
                onClick={() => runSearch(query, activeChip)}
                className="text-xs px-3 py-1.5 rounded-full glass hover:bg-muted/60 transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Initial empty state */}
          {showInitial && (
            <div className="py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
              </div>
              <p className="text-sm font-medium text-foreground">Search across all of CIRKLE</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                Find posts, conversations, people, circles, photos, videos, news, services, events,
                and saved documents — all in one place.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 justify-center">
                {["Cairo", "verified", "open circle", "police report", "photo album"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-card/60 border border-border/50 hover:bg-muted/60 hover:text-foreground text-muted-foreground transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {showEmpty && (
            <div className="py-16 text-center">
              <Search className="w-6 h-6 mx-auto mb-3 text-muted-foreground/60" aria-hidden />
              <p className="text-sm text-foreground">No results for &quot;{query}&quot;</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different keyword or remove the module filter.
              </p>
              {activeChip !== "all" && (
                <button
                  onClick={() => setActiveChip("all")}
                  className="mt-3 text-xs px-3 py-1.5 rounded-full glass hover:bg-muted/60 transition"
                >
                  Search all modules
                </button>
              )}
            </div>
          )}

          {/* Grouped results */}
          {!loading && !error && totalResults > 0 && (
            <div className="space-y-6">
              {/* Result count summary */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {totalResults} {totalResults === 1 ? "result" : "results"}
                  {activeChip !== "all" && (
                    <> in {CHIPS.find((c) => c.id === activeChip)?.label}</>
                  )}
                </span>
                <span className="text-[10px] uppercase tracking-widest">
                  sorted by relevance
                </span>
              </div>

              {visibleTypes.map((type) => {
                const meta = TYPE_META[type];
                const groupResults = grouped[type] ?? [];
                const Icon = meta.icon;
                return (
                  <section key={type} aria-labelledby={`group-${type}`}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      <h3
                        id={`group-${type}`}
                        className="text-xs uppercase tracking-widest text-muted-foreground font-medium"
                      >
                        {meta.label}
                      </h3>
                      <span className="text-[10px] text-muted-foreground/70">
                        · {groupResults.length}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {groupResults.map((r) => {
                        const Icon2 = TYPE_META[r.type].icon;
                        return (
                          <li key={`${r.type}-${r.id}`}>
                            <button
                              onClick={() => launchResult(r)}
                              className={cn(
                                "w-full text-start rounded-2xl border bg-gradient-to-br p-3 sm:p-4 flex items-start gap-3 hover:scale-[1.01] transition",
                                "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                                TYPE_META[r.type].tint,
                              )}
                            >
                              <div className="w-9 h-9 rounded-xl bg-background/80 border border-border/40 flex items-center justify-center shrink-0">
                                <Icon2
                                  className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                                  aria-hidden
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="font-medium text-sm leading-tight truncate flex-1 min-w-0">
                                    {r.title}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={cn("shrink-0 text-[10px] uppercase tracking-wide", TYPE_META[r.type].badge)}
                                  >
                                    {r.module}
                                  </Badge>
                                </div>
                                {r.snippet && (
                                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                    {r.snippet}
                                  </p>
                                )}
                                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground/80">
                                  {r.metadata?.createdAt && (
                                    <time dateTime={String(r.metadata.createdAt)}>
                                      {new Date(r.metadata.createdAt).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </time>
                                  )}
                                  {typeof r.metadata?.likes === "number" && (
                                    <span>♥ {r.metadata.likes}</span>
                                  )}
                                  {typeof r.metadata?.comments === "number" && (
                                    <span>💬 {r.metadata.comments}</span>
                                  )}
                                  <span className="ml-auto opacity-50">↵ open</span>
                                </div>
                              </div>
                              <ChevronRight
                                className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-1"
                                aria-hidden
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </OverlayShell>
  );
}

export default UniversalSearchOverlay;

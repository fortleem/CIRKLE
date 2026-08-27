// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Loader2, Clock, BookmarkPlus, Bookmark, Trash2, History,
  Sparkles, ChevronRight, Filter,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface RankedResult {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  type: string;
  snippet: string;
  score: number;
}

interface HistoryEntry {
  id: string;
  rawQuery: string;
  resultCount: number;
  executedAt: string;
}

interface SavedSearch {
  id: string;
  name: string;
  rawQuery: string;
  createdAt: string;
}

const OPERATORS = [
  { op: "from:", desc: "Filter by sender (e.g. from:alice)" },
  { op: "in:", desc: "Filter by conversation (e.g. in:family)" },
  { op: "has:", desc: "Filter by media type (image, video, audio, link)" },
  { op: "before:", desc: "Before a date (e.g. before:2025-01-01)" },
  { op: "after:", desc: "After a date (e.g. after:2025-01-01)" },
];

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export function MessageSearchPlus({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RankedResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [showOperators, setShowOperators] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveName, setSaveName] = useState("");

  const fetchMeta = useCallback(async () => {
    if (!userId) return;
    try {
      const [hRes, sRes] = await Promise.all([
        fetchWithTimeout(`/api/search/messages-plus?userId=${encodeURIComponent(userId)}&history=1`, { cache: "no-store" }),
        fetchWithTimeout(`/api/search/messages-plus?userId=${encodeURIComponent(userId)}&saved=1`, { cache: "no-store" }),
      ]);
      if (hRes.ok) setHistory((await hRes.json()).history ?? []);
      if (sRes.ok) setSaved((await sRes.json()).saved ?? []);
    } catch {
      /* swallow */
    }
  }, [userId]);

  useEffect(() => {
    if (open) fetchMeta();
  }, [open, fetchMeta]);

  const runSearch = useCallback(async (q: string) => {
    if (!userId || !q.trim()) return;
    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `/api/search/messages-plus?userId=${encodeURIComponent(userId)}&q=${encodeURIComponent(q)}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
        setTotal(data.total ?? 0);
        await fetchMeta();
        window.dispatchEvent(new CustomEvent("circle:message-search-plus", {
          detail: { query: q, resultCount: data.total ?? 0 },
        }));
      }
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [userId, fetchMeta]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }
    const t = setTimeout(() => runSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const handleSave = async () => {
    if (!userId || !saveName.trim() || !query.trim()) return;
    setSavingSearch(true);
    try {
      const res = await fetchWithTimeout("/api/search/messages-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", userId, name: saveName.trim(), q: query.trim() }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "save failed");
      }
      toast.success(`Saved search "${saveName}"`);
      setSaveName("");
      await fetchMeta();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingSearch(false);
    }
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      await fetchWithTimeout("/api/search/messages-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteSaved", searchId: id }),
      });
      setSaved((cur) => cur.filter((s) => s.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleClearHistory = async () => {
    if (!userId) return;
    try {
      await fetchWithTimeout("/api/search/messages-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clearHistory", userId }),
      });
      setHistory([]);
      toast.success("History cleared");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-2xl" ariaLabel="Message Search — Plus">
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-gradient-to-r from-emerald-500/10 via-transparent to-sky-500/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/30">
              <Search className="size-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                Search <Sparkles className="size-4 text-emerald-500" />
              </h2>
              <p className="text-xs text-muted-foreground">
                Use operators: from:, in:, has:, before:, after:
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='e.g. "invoice" from:alice has:image after:2025-01-01'
              className="pl-9 pr-10"
              autoFocus
              aria-label="Search messages"
            />
            <button
              onClick={() => setShowOperators((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-600"
              aria-label="Operators help"
            >
              <Filter className="size-4" />
            </button>
          </div>

          {showOperators && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-xl border border-border/60 bg-card/40 p-3"
            >
              <Label className="text-xs mb-2 block">Query operators</Label>
              <ul className="space-y-1">
                {OPERATORS.map((o) => (
                  <li key={o.op} className="text-xs flex items-start gap-2">
                    <code className="text-emerald-600 dark:text-emerald-400 font-mono">{o.op}</code>
                    <span className="text-muted-foreground">{o.desc}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Save search */}
          {query.trim() && (
            <div className="flex gap-2">
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Save this search as…"
                className="flex-1"
              />
              <Button onClick={handleSave} disabled={savingSearch || !saveName.trim()} variant="outline">
                {savingSearch ? <Loader2 className="size-4 animate-spin" /> : <BookmarkPlus className="size-4" />}
                Save
              </Button>
            </div>
          )}

          {/* Results */}
          {loading && (
            <div className="flex items-center justify-center py-8" role="status">
              <Loader2 className="size-5 animate-spin text-emerald-500" />
              <span className="ml-2 text-sm text-muted-foreground">Searching…</span>
            </div>
          )}

          {!loading && query.trim() && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                {total} result{total !== 1 ? "s" : ""}
              </p>
              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <Search className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No matches.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((r) => (
                    <motion.button
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-left w-full rounded-xl border border-border/60 bg-card/40 p-3 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">
                            @{r.senderId} · {new Date(r.createdAt).toLocaleString()}
                          </p>
                          <p className="text-sm mt-1 line-clamp-3" dangerouslySetInnerHTML={{ __html: r.snippet }} />
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          score {r.score}
                        </Badge>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Saved + History when no active query */}
          {!query.trim() && (
            <div className="space-y-4">
              {saved.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Bookmark className="size-4 text-emerald-500" />
                    <Label>Saved searches</Label>
                  </div>
                  <div className="space-y-1.5">
                    {saved.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-card/40 p-2">
                        <button
                          onClick={() => setQuery(s.rawQuery)}
                          className="flex-1 text-left text-sm hover:text-emerald-600"
                        >
                          <span className="font-medium">{s.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{s.rawQuery}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSaved(s.id)}
                          className="text-muted-foreground hover:text-rose-600"
                          aria-label="Delete saved search"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {history.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <History className="size-4 text-muted-foreground" />
                      <Label>Recent searches</Label>
                    </div>
                    <button
                      onClick={handleClearHistory}
                      className="text-xs text-muted-foreground hover:text-rose-600"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {history.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => setQuery(h.rawQuery)}
                        className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-muted/40 flex items-center justify-between"
                      >
                        <span className="truncate">{h.rawQuery}</span>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {h.resultCount} hits · {new Date(h.executedAt).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {saved.length === 0 && history.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Search className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Start typing to search across all conversations.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try: <code className="text-emerald-600">"invoice" from:alice has:image</code>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}

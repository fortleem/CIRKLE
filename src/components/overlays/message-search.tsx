// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Loader2, Calendar, User, FileText, MessageSquare, Filter,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface MessageSearchResult {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  type: string;
  snippet: string;
}

interface SearchResult {
  results: MessageSearchResult[];
  total: number;
}

const FILE_TYPES = [
  { value: "all", label: "All types" },
  { value: "text", label: "Text" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
  { value: "document", label: "Documents" },
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

function highlightHtml(snippet: string, query: string): { __html: string } {
  if (!query.trim()) return { __html: snippet };
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    const re = new RegExp(`(${escaped})`, "ig");
    const safe = snippet
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return { __html: safe.replace(re, '<mark class="bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded px-0.5">$1</mark>') };
  } catch {
    return { __html: snippet };
  }
}

export function MessageSearch({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";

  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sender, setSender] = useState("");
  const [fileType, setFileType] = useState("all");
  const [conversationId, setConversationId] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const canSearch = useMemo(() => {
    return (
      !!userId &&
      !!(query.trim() || fromDate || toDate || sender || fileType !== "all" || conversationId)
    );
  }, [userId, query, fromDate, toDate, sender, fileType, conversationId]);

  const doSearch = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ userId });
      if (query.trim()) params.set("query", query.trim());
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (sender.trim()) params.set("sender", sender.trim());
      if (fileType !== "all") params.set("fileType", fileType);
      if (conversationId.trim()) params.set("conversationId", conversationId.trim());
      const res = await fetchWithTimeout(`/api/search/messages?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as SearchResult;
      setResult(data);
      window.dispatchEvent(new CustomEvent("circle:message-search"));
    } catch {
      setResult({ results: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [canSearch, userId, query, fromDate, toDate, sender, fileType, conversationId]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setFromDate("");
      setToDate("");
      setSender("");
      setFileType("all");
      setConversationId("");
      setResult(null);
      setHasSearched(false);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open || !canSearch) return;
    const t = setTimeout(doSearch, 400);
    return () => clearTimeout(t);
  }, [open, canSearch, doSearch]);

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-3xl" ariaLabel="Message search">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <Search className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Message Search</h2>
              <p className="text-xs text-muted-foreground">Keyword · date range · sender · file type</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Search inputs */}
          <section aria-label="Search filters" className="glass backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
              <Input
                placeholder="Search by keyword…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                aria-label="Search keyword"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="from-date" className="text-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-500" aria-hidden /> From date
                </Label>
                <Input id="from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="to-date" className="text-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-500" aria-hidden /> To date
                </Label>
                <Input id="to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sender" className="text-xs flex items-center gap-1">
                  <User className="w-3 h-3 text-emerald-500" aria-hidden /> Sender
                </Label>
                <Input id="sender" placeholder="@username" value={sender} onChange={(e) => setSender(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="file-type" className="text-xs flex items-center gap-1">
                  <Filter className="w-3 h-3 text-emerald-500" aria-hidden /> File type
                </Label>
                <Select value={fileType} onValueChange={setFileType}>
                  <SelectTrigger id="file-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="conv-id" className="text-xs">Conversation ID (optional)</Label>
              <Input id="conv-id" placeholder="Leave empty for global search" value={conversationId} onChange={(e) => setConversationId(e.target.value)} />
            </div>
            <Button onClick={doSearch} disabled={!canSearch || loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Searching…</>
              ) : (
                <><Search className="w-4 h-4 mr-2" aria-hidden /> Search</>
              )}
            </Button>
          </section>

          {/* Results */}
          {hasSearched && (
            <section aria-label="Search results" className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">
                  Results {result ? `(${result.total})` : ""}
                </Label>
                {result && result.total > result.results.length && (
                  <span className="text-xs text-muted-foreground">
                    Showing first {result.results.length}
                  </span>
                )}
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground" aria-live="polite">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden /> Searching…
                </div>
              ) : !result || result.results.length === 0 ? (
                <div className="glass backdrop-blur-xl border border-dashed border-white/20 rounded-xl p-8 text-center">
                  <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden />
                  <p className="text-sm text-muted-foreground">No messages found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try different keywords or broaden your filters.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto" role="list">
                  {result.results.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="listitem"
                      className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3"
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                          <FileText className="w-2.5 h-2.5 inline mr-1" aria-hidden />
                          {m.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">@{m.senderId}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                        <p
                          className="text-sm text-foreground flex-1"
                          dangerouslySetInnerHTML={highlightHtml(m.snippet, query)}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                        in {m.conversationId}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}

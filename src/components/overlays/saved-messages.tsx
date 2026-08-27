// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bookmark, Loader2, Search, Trash2, StickyNote, MessageSquare, Filter,
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

interface SavedMessage {
  id: string;
  userId: string;
  messageId: string;
  conversationId: string;
  note: string | null;
  createdAt: string;
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export function SavedMessages({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [conversationFilter, setConversationFilter] = useState("");

  const fetchSaved = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId });
      if (query) params.set("query", query);
      if (conversationFilter) params.set("conversationId", conversationFilter);
      const res = await fetchWithTimeout(`/api/saved-messages?${params}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [userId, query, conversationFilter]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setConversationFilter("");
      fetchSaved();
    }
  }, [open, fetchSaved]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(fetchSaved, 300);
    return () => clearTimeout(t);
  }, [open, query, conversationFilter, fetchSaved]);

  const handleUnsave = async (id: string) => {
    try {
      const res = await fetchWithTimeout(`/api/saved-messages?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unsave");
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success("Removed from Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unsave failed");
    }
  };

  const conversationOptions = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((m) => set.add(m.conversationId));
    return Array.from(set);
  }, [messages]);

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-2xl" ariaLabel="Saved messages — personal Saved channel">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <Bookmark className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Saved Messages</h2>
              <p className="text-xs text-muted-foreground">{total} saved · searchable · filterable</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Search + filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
              <Input
                placeholder="Search saved messages…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                aria-label="Search saved messages"
              />
            </div>
            {conversationOptions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3 h-3 text-muted-foreground" aria-hidden />
                <button
                  type="button"
                  onClick={() => setConversationFilter("")}
                  aria-pressed={!conversationFilter}
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[11px] font-medium transition border",
                    !conversationFilter
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border-transparent",
                  )}
                >
                  All
                </button>
                {conversationOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setConversationFilter(c)}
                    aria-pressed={conversationFilter === c}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-mono transition border",
                      conversationFilter === c
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border-transparent",
                    )}
                  >
                    {c.length > 12 ? c.slice(0, 10) + "…" : c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground" aria-live="polite">
              <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden /> Loading…
            </div>
          ) : messages.length === 0 ? (
            <div className="glass backdrop-blur-xl border border-dashed border-white/20 rounded-xl p-8 text-center">
              <Bookmark className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {query || conversationFilter ? "No saved messages match your filters" : "No saved messages yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Long-press any message in a chat and tap the bookmark icon to save it here.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto" role="list" aria-label="Saved messages">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    role="listitem"
                    className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0" aria-hidden>
                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className="bg-muted/40 text-muted-foreground border-transparent font-mono text-[10px]">
                            {m.conversationId.length > 14 ? m.conversationId.slice(0, 12) + "…" : m.conversationId}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(m.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mb-1">{m.messageId}</p>
                        {m.note && (
                          <div className="flex items-start gap-1.5 mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <StickyNote className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" aria-hidden />
                            <p className="text-xs text-amber-600 dark:text-amber-400">{m.note}</p>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        aria-label={`Remove saved message ${m.id}`}
                        onClick={() => handleUnsave(m.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}

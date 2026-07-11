"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Search, Trash2, Archive, Check, Clock, Download, Pause, Play, FileText, Network, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { FeedbackButton } from "@/components/ui/feedback-button";

interface Memory {
  uuid: string;
  type: string;
  title: string;
  summary: string;
  content: string;
  importanceScore: number;
  lifecycle: string;
  source: string;
  createdTime: string;
  tags: string[];
}

const CATEGORIES = [
  { id: "all", label: "All", emoji: "🧠" },
  { id: "identity", label: "Identity", emoji: "🪪" },
  { id: "relationship", label: "People", emoji: "👥" },
  { id: "preference", label: "Preferences", emoji: "❤️" },
  { id: "routine", label: "Routines", emoji: "⏰" },
  { id: "goal", label: "Goals", emoji: "🎯" },
  { id: "project", label: "Projects", emoji: "📁" },
  { id: "conversation", label: "Conversations", emoji: "💬" },
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "location_relationship", label: "Places", emoji: "📍" },
  { id: "learning", label: "Learning", emoji: "📚" },
  { id: "wellness", label: "Wellness", emoji: "❤️‍🩹" },
];

export function MemoryDashboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const userId = user?.username || "anonymous";
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState({ total: 0, byCategory: {} as Record<string, number>, byLifecycle: {}, byPrivacy: {} });
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [paused, setPaused] = useState(false);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const cat = activeCategory !== "all" ? `&category=${activeCategory}` : "";
      const res = await fetch(`/api/memory?userId=${userId}${cat}`);
      const data = await res.json();
      setMemories(data.memories || []);
    } catch { setMemories([]); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/memory?userId=${userId}&action=stats`);
      const data = await res.json();
      setStats(data);
    } catch {}
  };

  useEffect(() => {
    if (open) { fetchMemories(); fetchStats(); }
  }, [open, activeCategory]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) { fetchMemories(); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/memory?userId=${userId}&q=${encodeURIComponent(searchQuery)}&limit=20`);
      const data = await res.json();
      setMemories(data.results?.map((r: any) => r.memory) || []);
    } catch { setMemories([]); }
    finally { setLoading(false); }
  };

  const handleAction = async (memoryId: string, action: string) => {
    try {
      await fetch("/api/memory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, memoryId }),
      });
      toast.success(`Memory ${action}d`);
      fetchMemories();
    } catch { toast.error(`Failed to ${action}`); }
  };

  const handlePauseToggle = async () => {
    try {
      const res = await fetch("/api/memory/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: paused ? "resume" : "pause" }),
      });
      const data = await res.json();
      setPaused(data.paused);
      toast.success(paused ? "Memory collection resumed" : "Memory collection paused");
    } catch {}
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/memory?userId=${userId}&action=export`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.memories, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `cirkle-memories-${userId}.json`; a.click();
      toast.success("Memories exported");
    } catch { toast.error("Export failed"); }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Delete ALL memories? This cannot be undone.")) return;
    try {
      await fetch(`/api/memory?userId=${userId}`, { method: "DELETE" });
      toast.success("All memories deleted");
      fetchMemories(); fetchStats();
    } catch { toast.error("Delete failed"); }
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="fullscreen" ariaLabel="Memory Dashboard">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <Brain className="w-6 h-6 text-charcoal" />
            </div>
            <div>
              <h2 className="font-display text-2xl">Personal Memory Brain</h2>
              <p className="text-xs text-muted-foreground">Your permanent cognitive memory · Privacy-first · Encrypted</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FeedbackButton overlayName="Memory Dashboard" />
            <button onClick={onClose} className="min-w-[44px] min-h-[44px] rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="glass rounded-xl p-3 text-center">
            <div className="text-2xl font-display">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Memories</div>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <div className="text-2xl font-display">{Object.keys(stats.byCategory || {}).length}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Categories</div>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <div className="text-2xl font-display">{(stats.byLifecycle as any)?.frequently_used || 0}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Frequently Used</div>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <div className="text-2xl font-display">{(stats.byPrivacy as any)?.encrypted || 0}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Encrypted</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search memories semantically..."
              className="w-full glass rounded-full pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button onClick={handlePauseToggle} className="px-4 py-2 rounded-full glass text-xs font-medium hover:bg-muted/40 flex items-center gap-2">
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button onClick={handleExport} className="px-4 py-2 rounded-full glass text-xs font-medium hover:bg-muted/40 flex items-center gap-2">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={handleDeleteAll} className="px-4 py-2 rounded-full bg-accent/15 text-accent text-xs font-medium hover:bg-accent/25 flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5" /> Delete All
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4 pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${activeCategory === cat.id ? "bg-primary text-primary-foreground" : "glass hover:bg-muted/40"}`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Memories list */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground mt-2">Loading memories...</p>
          </div>
        ) : memories.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Brain className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No memories yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">The Brain AI will learn about you as you use Cirkle. Everything is encrypted and user-controlled.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {memories.map((mem) => (
              <motion.div
                key={mem.uuid}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-4 border border-border/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary">{mem.type}</span>
                      {mem.lifecycle === "candidate" && <span className="text-[9px] text-yellow-500">⏳ Pending confirmation</span>}
                      {mem.lifecycle === "frequently_used" && <span className="text-[9px] text-green-500">⭐ Frequently used</span>}
                      <span className="text-[9px] text-muted-foreground">{mem.importanceScore}/100 importance</span>
                    </div>
                    <h3 className="text-sm font-medium truncate">{mem.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{mem.summary}</p>
                    {mem.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {mem.tags.slice(0, 4).map(tag => <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>)}
                      </div>
                    )}
                    <p className="text-[9px] text-muted-foreground/60 mt-1">
                      {new Date(mem.createdTime).toLocaleDateString()} · Source: {mem.source}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {mem.lifecycle === "candidate" && (
                      <button onClick={() => handleAction(mem.uuid, "confirm")} className="w-8 h-8 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center hover:bg-green-500/25" title="Confirm">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleAction(mem.uuid, "archive")} className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center" title="Archive">
                      <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleAction(mem.uuid, "delete")} className="w-8 h-8 rounded-full hover:bg-accent/15 flex items-center justify-center" title="Delete">
                      <Trash2 className="w-3.5 h-3.5 text-accent" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Privacy footer */}
        <div className="mt-6 glass rounded-xl p-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-secondary shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Your memories are yours.</p>
            <p>End-to-end encrypted · User-controlled · GDPR/CCPA compliant · Export or delete anytime · No inference without consent.</p>
          </div>
        </div>
      </div>
    </OverlayShell>
  );
}

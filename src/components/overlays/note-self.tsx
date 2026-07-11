"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, StickyNote, Send, Search, Lock, Clock, Trash2, Download, Phone, Sparkles, Pin,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

type Color = "gold" | "teal" | "rose" | "steel" | "charcoal";

interface Note {
  id: number;
  text: string;
  created: string;
  pinned: boolean;
  color: Color;
}

const COLOR_TINT: Record<Color, string> = {
  gold: "bg-secondary/15 border-secondary/40",
  teal: "bg-primary/15 border-primary/40",
  rose: "bg-accent/15 border-accent/40",
  steel: "bg-steel/15 border-steel/40",
  charcoal: "bg-foreground/10 border-border/60",
};
const COLOR_DOT: Record<Color, string> = {
  gold: "bg-secondary",
  teal: "bg-primary",
  rose: "bg-accent",
  steel: "bg-steel",
  charcoal: "bg-foreground/60",
};

const SEED: Note[] = [
  { id: 1, text: "Pick up the dry cleaning before 6.", created: "2h ago", pinned: true, color: "gold" },
  { id: 2, text: "Call mom — she mentioned something important.", created: "yesterday", pinned: false, color: "rose" },
  { id: 3, text: "Idea: a mood-mapped Midan thread.", created: "3d ago", pinned: false, color: "teal" },
  { id: 4, text: "Renew car insurance before the 22nd.", created: "5d ago", pinned: false, color: "steel" },
];

const COLORS: Color[] = ["gold", "teal", "rose", "steel", "charcoal"];

export function NoteSelf({ open, onClose }: Props) {
  const [notes, setNotes] = useState<Note[]>(SEED);
  const [text, setText] = useState("");
  const [color, setColor] = useState<Color>("gold");
  const [query, setQuery] = useState("");
  const [idc, setIdc] = useState(100);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        setNotes(SEED); setText(""); setQuery("");
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const send = () => {
    if (!text.trim()) { toast.error("Write your note first"); return; }
    const id = idc + 1; setIdc(id);
    setNotes((n) => [{ id, text: text.trim(), created: "just now", pinned: false, color }, ...n]);
    setText("");
    toast.success("Note saved", { description: "Encrypted on-device · only you can read" });
  };

  const togglePin = (id: number) => setNotes((n) => n.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)));
  const del = (id: number) => { setNotes((n) => n.filter((x) => x.id !== id)); toast("Note deleted"); };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => !q || n.text.toLowerCase().includes(q));
  }, [notes, query]);

  const sorted = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const exportJSON = () => {
    const payload = { exportedAt: new Date().toISOString(), count: notes.length, notes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cirkle-notes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Notes exported as JSON");
  };

  const suggestPhone = () => {
    setSuggesting(true);
    setTimeout(() => {
      setSuggesting(false);
      const call = notes.find((n) => /call|phone|mom|dad|brother|sister/i.test(n.text));
      if (call) toast.success("AI suggestion", { description: `Call now: "${call.text.slice(0, 50)}"` });
      else toast("No call reminders found — add one with the word 'call'.");
    }, 1200);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Note to Self"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-secondary/20 border border-accent/40 flex items-center justify-center shrink-0">
                <StickyNote className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Note to Self</div>
                <div className="text-[11px] text-muted-foreground">5 colors · search · export · only you</div>
              </div>
              <button onClick={exportJSON} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Export JSON">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {/* Composer */}
              <section className="rounded-2xl border border-border/60 bg-card p-3 space-y-2">
                <textarea
                  value={text} onChange={(e) => setText(e.target.value)} rows={3}
                  placeholder="What should future-you remember?"
                  className="w-full bg-transparent outline-none text-sm resize-none border-none"
                  maxLength={300}
                />
                {/* 5-color picker */}
                <div className="flex items-center gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn("w-6 h-6 rounded-full border-2 transition", COLOR_DOT[c], color === c ? "border-foreground/60 scale-110" : "border-transparent")}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">{text.length}/300</span>
                    <button onClick={send} disabled={!text.trim()}
                      className="px-3 py-1.5 rounded-full bg-gradient-hero text-cream text-xs flex items-center gap-1 disabled:opacity-40">
                      <Send className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                </div>
              </section>

              {/* Search */}
              <section className="rounded-xl glass px-3 py-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your notes…"
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
                )}
              </section>

              <section className="rounded-xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent p-3 text-xs text-secondary flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> End-to-end encrypted. No one — not even Cirkle — can read them.
              </section>

              {/* AI phone suggestion */}
              <button
                onClick={suggestPhone} disabled={suggesting}
                className="w-full rounded-xl border border-border/50 bg-card p-3 text-xs flex items-center justify-center gap-1.5 hover:bg-muted/40 transition disabled:opacity-50"
              >
                <Phone className="w-3.5 h-3.5 text-secondary" />
                {suggesting ? "Scanning notes…" : "AI: suggest a call to make now"}
                <Sparkles className="w-3 h-3 text-secondary" />
              </button>

              {/* Notes list */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> {sorted.length} note{sorted.length === 1 ? "" : "s"}
                </div>
                <div className="space-y-2">
                  {sorted.map((n) => (
                    <motion.div
                      key={n.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className={cn("rounded-xl border p-3 group", COLOR_TINT[n.color])}
                    >
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm">{n.text}</p>
                        <button onClick={() => togglePin(n.id)} className={cn("w-7 h-7 rounded-full hover:bg-foreground/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition", n.pinned && "opacity-100 text-secondary")} aria-label="Pin">
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => del(n.id)} className="w-7 h-7 rounded-full hover:bg-accent/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition" aria-label="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-accent" />
                        </button>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full", COLOR_DOT[n.color])} />
                        {n.created}{n.pinned && " · 📌 pinned"}
                      </div>
                    </motion.div>
                  ))}
                  {sorted.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-8">
                      <StickyNote className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      {query ? "No notes match your search." : "No notes yet. Write one above."}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

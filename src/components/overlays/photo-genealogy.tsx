"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, GitBranch, Sparkles, ChevronRight, Clock, Share2, Heart, Eye,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface Node {
  id: string; label: string; kind: "origin" | "edit" | "remix" | "version" | "share" | "current";
  x: number; y: number; parent?: string; date: string; note: string; tint: string;
}

const NODES: Node[] = [
  { id: "n1", label: "Original capture", kind: "origin", x: 50, y: 12, date: "Mar 2", note: "Shot on Cirkle Pro · 12 MP · no edits", tint: "from-secondary/40 to-secondary/10 border-secondary/50" },
  { id: "n2", label: "Auto-enhance", kind: "edit", x: 25, y: 32, parent: "n1", date: "Mar 2", note: "AI auto-balance · +0.4 EV · slight crop", tint: "from-primary/40 to-primary/10 border-primary/50" },
  { id: "n3", label: "Golden hour grade", kind: "version", x: 75, y: 32, parent: "n1", date: "Mar 4", note: "Warm highlights · lifted shadows", tint: "from-accent/40 to-accent/10 border-accent/50" },
  { id: "n4", label: "Cropped square", kind: "version", x: 15, y: 52, parent: "n2", date: "Mar 5", note: "1:1 for Lamahat grid", tint: "from-steel/40 to-steel/10 border-steel/50" },
  { id: "n5", label: "User's remix", kind: "remix", x: 55, y: 52, parent: "n3", date: "Mar 6", note: "Added text overlay · shared to Midan", tint: "from-secondary/40 to-accent/10 border-secondary/50" },
  { id: "n6", label: "User's remix", kind: "remix", x: 85, y: 52, parent: "n3", date: "Mar 7", note: "Cropped 9:16 · story format", tint: "from-primary/40 to-accent/10 border-primary/50" },
  { id: "n7", label: "Shared to Circle", kind: "share", x: 35, y: 72, parent: "n4", date: "Mar 8", note: "Cairo Book Club · 12 members", tint: "from-rose/40 to-rose/10 border-rose/50" },
  { id: "n8", label: "Current version", kind: "current", x: 65, y: 72, parent: "n5", date: "Today", note: "Your library · 4 edits · 2 remixes", tint: "from-secondary/50 to-accent/20 border-secondary/60" },
];

const INSIGHTS = [
  { icon: Eye, label: "Total reach", value: "1,284 views", tint: "text-secondary" },
  { icon: Heart, label: "Reactions", value: "92 ❤", tint: "text-accent" },
  { icon: GitBranch, label: "Derivatives", value: "2 remixes", tint: "text-primary" },
];

export function PhotoGenealogy({ open, onClose }: Props) {
  const [active, setActive] = useState<string | null>("n8");
  const activeNode = NODES.find((n) => n.id === active);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.7)", backdropFilter: "blur(12px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Photo Genealogy"
            className="fixed inset-0 z-[150] glass-strong shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/20 border border-secondary/40 flex items-center justify-center shrink-0">
                <GitBranch className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg leading-tight">Photo Genealogy</div>
                <div className="text-[11px] text-muted-foreground">8 nodes · trace every edit, remix &amp; share</div>
              </div>
              <button onClick={() => toast.success("Genealogy shared as link")} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Share"><Share2 className="w-4 h-4" /></button>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* SVG tree */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-secondary" /> Family tree
                </div>
                <div className="rounded-2xl border border-border/60 bg-card p-2">
                  <svg viewBox="0 0 100 88" className="w-full h-auto" role="img" aria-label="Photo genealogy tree">
                    {/* edges */}
                    {NODES.filter((n) => n.parent).map((n) => {
                      const p = NODES.find((x) => x.id === n.parent);
                      if (!p) return null;
                      const midY = (p.y + n.y) / 2;
                      return (
                        <path key={`${p.id}-${n.id}`}
                          d={`M ${p.x} ${p.y} C ${p.x} ${midY}, ${n.x} ${midY}, ${n.x} ${n.y}`}
                          fill="none" stroke="hsl(var(--border))" strokeWidth="0.4"
                          strokeDasharray="1.5 1.2" />
                      );
                    })}
                    {/* nodes */}
                    {NODES.map((n) => (
                      <g key={n.id} onClick={() => setActive(n.id)} style={{ cursor: "pointer" }}>
                        <circle cx={n.x} cy={n.y} r={active === n.id ? 4.5 : 3.5}
                          fill={n.kind === "origin" ? "hsl(var(--secondary))" : n.kind === "current" ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                          opacity={active === n.id ? 1 : 0.7} />
                        {active === n.id && (
                          <circle cx={n.x} cy={n.y} r={6.5} fill="none" stroke="hsl(var(--secondary))" strokeWidth="0.3" />
                        )}
                        <text x={n.x} y={n.y - 5} textAnchor="middle" fontSize="2.4" fill="hsl(var(--foreground))" fontWeight="600">{n.label}</text>
                        <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize="2" fill="hsl(var(--muted-foreground))">{n.date}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </section>

              {/* Active node detail */}
              <AnimatePresence mode="wait">
                {activeNode && (
                  <motion.section key={activeNode.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className={cn("rounded-2xl border bg-gradient-to-br p-4 space-y-2", activeNode.tint)}>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {activeNode.date}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 capitalize">{activeNode.kind}</span>
                    </div>
                    <div className="font-display text-lg">{activeNode.label}</div>
                    <p className="text-xs text-muted-foreground italic">{activeNode.note}</p>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Insights */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Insights</div>
                <div className="grid grid-cols-3 gap-2">
                  {INSIGHTS.map((ins) => (
                    <div key={ins.label} className="rounded-xl border border-border/60 bg-card p-3 text-center">
                      <ins.icon className={cn("w-4 h-4 mx-auto mb-1", ins.tint)} />
                      <div className="text-[10px] text-muted-foreground">{ins.label}</div>
                      <div className="text-sm font-medium">{ins.value}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Timeline */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Timeline</div>
                <div className="relative pl-4 space-y-2 before:absolute before:left-1 before:top-1 before:bottom-1 before:w-px before:bg-border">
                  {NODES.map((n) => (
                    <button key={n.id} onClick={() => setActive(n.id)}
                      className={cn("relative w-full text-start rounded-xl border p-2 transition",
                        active === n.id ? "border-secondary/60 bg-secondary/5" : "border-border/50 bg-card hover:bg-muted/40")}>
                      <span className={cn("absolute -left-3 top-3 w-2 h-2 rounded-full",
                        n.kind === "origin" ? "bg-secondary" : n.kind === "current" ? "bg-accent" : "bg-primary")} />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-mono w-10">{n.date}</span>
                        <span className="text-xs font-medium flex-1 truncate">{n.label}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-foreground/10 capitalize">{n.kind}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <button onClick={() => { toast.success("Saved to your photo's audit log"); onClose(); }}
                className="w-full rounded-xl bg-gradient-gold text-charcoal py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                Save audit log <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

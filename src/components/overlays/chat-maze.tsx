"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Network, ChevronRight, Clock, Sparkles, Download, Lock, Play,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface Node {
  id: string;
  label: string;
  x: number; y: number; // SVG percent
  size: number;
  tint: string;
}

interface Edge { from: string; to: string; weight: number; }

const NODES: Node[] = [
  { id: "intro", label: "Intro: project kickoff", x: 18, y: 30, size: 7, tint: "fill-secondary" },
  { id: "scope", label: "Scope freeze", x: 42, y: 18, size: 8, tint: "fill-primary" },
  { id: "design", label: "Design sprint", x: 64, y: 28, size: 9, tint: "fill-secondary" },
  { id: "build", label: "Build phase", x: 84, y: 38, size: 10, tint: "fill-accent" },
  { id: "test", label: "QA + reviews", x: 70, y: 60, size: 8, tint: "fill-steel" },
  { id: "ship", label: "Ship 🎉", x: 50, y: 74, size: 9, tint: "fill-secondary" },
  { id: "retro", label: "Retro + learnings", x: 26, y: 62, size: 7, tint: "fill-primary" },
  { id: "next", label: "Plan v2", x: 12, y: 48, size: 6, tint: "fill-steel" },
];

const EDGES: Edge[] = [
  { from: "intro", to: "scope", weight: 0.8 },
  { from: "scope", to: "design", weight: 0.9 },
  { from: "design", to: "build", weight: 1.0 },
  { from: "build", to: "test", weight: 0.95 },
  { from: "test", to: "ship", weight: 0.85 },
  { from: "ship", to: "retro", weight: 0.7 },
  { from: "retro", to: "next", weight: 0.6 },
  { from: "next", to: "intro", weight: 0.5 },
];

const INSIGHTS = [
  "Build phase carried the highest message density — 312 messages across 4 days.",
  "Scope freeze took 2 days longer than estimated — convo forked into 3 sub-threads.",
  "Retro surfaced 5 action items; 3 closed within a week. Healthy cadence.",
];

export function ChatMaze({ open, onClose }: Props) {
  const [selected, setSelected] = useState<string>("intro");
  const [scrub, setScrub] = useState(50);

  const node = NODES.find((n) => n.id === selected)!;
  const connected = EDGES.filter((e) => e.from === selected || e.to === selected);

  const exportMap = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      nodes: NODES.map((n) => ({ id: n.id, label: n.label })),
      edges: EDGES.map((e) => ({ from: e.from, to: e.to, weight: e.weight })),
      insights: INSIGHTS,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `chat-maze-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Map exported as JSON");
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
            role="dialog" aria-label="Chat Maze"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-steel/20 border border-primary/40 flex items-center justify-center shrink-0">
                <Network className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Chat Maze</div>
                <div className="text-[11px] text-muted-foreground">8-node mind-map · timeline scrubber · insights</div>
              </div>
              <button onClick={exportMap} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Export">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* SVG mind-map */}
              <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                <svg viewBox="0 0 100 90" className="w-full h-72" preserveAspectRatio="xMidYMid meet">
                  {/* Edges */}
                  {EDGES.map((e, i) => {
                    const a = NODES.find((n) => n.id === e.from)!;
                    const b = NODES.find((n) => n.id === e.to)!;
                    const isActive = selected === e.from || selected === e.to;
                    return (
                      <line
                        key={i}
                        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                        className={isActive ? "stroke-secondary" : "stroke-muted-foreground"}
                        strokeWidth={isActive ? 0.7 : 0.3}
                        opacity={isActive ? 0.9 : 0.4}
                        strokeDasharray={isActive ? "0" : "1.5 1.5"}
                      />
                    );
                  })}
                  {/* Nodes */}
                  {NODES.map((n) => {
                    const isActive = selected === n.id;
                    return (
                      <g key={n.id} onClick={() => setSelected(n.id)} className="cursor-pointer">
                        <circle cx={n.x} cy={n.y} r={n.size + 2} className={cn(n.tint, "opacity-20")} />
                        <circle
                          cx={n.x} cy={n.y} r={n.size}
                          className={cn(n.tint, isActive ? "stroke-foreground stroke-1" : "")}
                          fill={isActive ? "currentColor" : undefined}
                        />
                        <text
                          x={n.x} y={n.y - n.size - 2}
                          fontSize="2.6"
                          className={cn(isActive ? "fill-foreground font-bold" : "fill-muted-foreground")}
                          textAnchor="middle"
                        >
                          {n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </section>

              {/* Timeline scrubber */}
              <section className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Timeline scrubber
                  </div>
                  <span className="text-[11px] text-secondary tabular-nums">Day {Math.max(1, Math.ceil((scrub / 100) * 14))} of 14</span>
                </div>
                <Slider value={[scrub]} onValueChange={(v) => setScrub(v[0] ?? 50)} min={0} max={100} step={1} aria-label="Timeline" />
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5">
                  <span>Kickoff</span>
                  <span>Design</span>
                  <span>Build</span>
                  <span>Ship</span>
                  <span>Retro</span>
                </div>
              </section>

              {/* Selected node detail */}
              <section className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent p-4">
                <div className="text-[10px] uppercase tracking-widest text-secondary flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3" /> Selected node
                </div>
                <div className="font-display text-lg">{node.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {connected.length} connection{connected.length === 1 ? "" : "s"} · day {Math.ceil((NODES.findIndex((n) => n.id === selected) + 1) * 14 / NODES.length)} of project
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {connected.map((c) => {
                    const other = c.from === selected ? c.to : c.from;
                    const meta = NODES.find((n) => n.id === other)!;
                    return (
                      <button
                        key={other}
                        onClick={() => setSelected(other)}
                        className="text-[11px] px-2 py-1 rounded-full border border-border/50 bg-card hover:bg-muted/60 flex items-center gap-1"
                      >
                        {meta.label} <ChevronRight className="w-3 h-3" />
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Insights */}
              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Play className="w-3 h-3" /> AI insights
                </div>
                {INSIGHTS.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className="rounded-xl border border-border/60 bg-card p-3 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">{s}</div>
                  </motion.div>
                ))}
              </section>

              <section className="rounded-xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">Map generated on-device from your conversation graph. No content leaves your phone.</p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

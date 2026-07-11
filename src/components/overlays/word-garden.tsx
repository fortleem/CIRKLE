"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Flower2, Share2, Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface Plant {
  id: number; word: string; count: number; x: number; y: number;
  stem: string; bloom: string; size: number; petals: number;
}

const SPRING: Plant[] = [
  { id: 1, word: "صباح", count: 142, x: 15, y: 35, stem: "#3A5A40", bloom: "#E5A04A", size: 1.2, petals: 6 },
  { id: 2, word: "rain", count: 88, x: 32, y: 22, stem: "#3A5A40", bloom: "#C06070", size: 0.9, petals: 5 },
  { id: 3, word: "friend", count: 76, x: 48, y: 45, stem: "#3A5A40", bloom: "#C2A060", size: 1.0, petals: 7 },
  { id: 4, word: "كتاب", count: 64, x: 65, y: 28, stem: "#3A5A40", bloom: "#4A8A9A", size: 0.85, petals: 5 },
  { id: 5, word: "ride", count: 52, x: 80, y: 50, stem: "#3A5A40", bloom: "#E5C46E", size: 0.95, petals: 6 },
  { id: 6, word: "coffee", count: 41, x: 22, y: 65, stem: "#3A5A40", bloom: "#7B3F00", size: 0.8, petals: 5 },
  { id: 7, word: "moon", count: 38, x: 42, y: 72, stem: "#3A5A40", bloom: "#F0EBD8", size: 1.1, petals: 8 },
  { id: 8, word: "نجوم", count: 29, x: 62, y: 78, stem: "#3A5A40", bloom: "#E5C46E", size: 0.9, petals: 6 },
  { id: 9, word: "home", count: 22, x: 85, y: 70, stem: "#3A5A40", bloom: "#C2A060", size: 0.75, petals: 5 },
];

const SUMMER: Plant[] = SPRING.map((p) => ({ ...p, bloom: ["#E57363", "#F4D35E", "#E5A04A", "#C06070"][p.id % 4], stem: "#3D5A40", size: p.size * 1.15 }));
const AUTUMN: Plant[] = SPRING.map((p) => ({ ...p, bloom: ["#7B3F00", "#C06070", "#C2A060", "#A07080"][p.id % 4], stem: "#8B6B3A", size: p.size * 0.9 }));

const SEASONS = [
  { k: "spring", label: "Spring", emoji: "🌱", plants: SPRING, sky: "from-secondary/30 via-cream/20 to-background" },
  { k: "summer", label: "Summer", emoji: "☀️", plants: SUMMER, sky: "from-accent/30 via-secondary/20 to-background" },
  { k: "autumn", label: "Autumn", emoji: "🍂", plants: AUTUMN, sky: "from-rose/30 via-secondary/20 to-background" },
];

function PlantShape({ p, season }: { p: Plant; season: string }) {
  return (
    <g style={{ cursor: "pointer" }}>
      {/* stem */}
      <motion.line
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }}
        x1={p.x} y1={p.y + 12 * p.size} x2={p.x} y2={p.y} stroke={p.stem} strokeWidth={0.6 * p.size} />
      {/* leaves */}
      <ellipse cx={p.x - 2 * p.size} cy={p.y + 6 * p.size} rx={2 * p.size} ry={1 * p.size} fill={p.stem} opacity={0.7} transform={`rotate(-30 ${p.x - 2 * p.size} ${p.y + 6 * p.size})`} />
      <ellipse cx={p.x + 2 * p.size} cy={p.y + 8 * p.size} rx={2 * p.size} ry={1 * p.size} fill={p.stem} opacity={0.7} transform={`rotate(30 ${p.x + 2 * p.size} ${p.y + 8 * p.size})`} />
      {/* bloom petals */}
      {Array.from({ length: p.petals }).map((_, i) => {
        const angle = (i / p.petals) * Math.PI * 2;
        const px = p.x + Math.cos(angle) * 2.5 * p.size;
        const py = p.y + Math.sin(angle) * 2.5 * p.size;
        return (
          <motion.ellipse
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.85 }}
            transition={{ delay: 0.5 + i * 0.05, type: "spring" }}
            cx={px} cy={py} rx={2 * p.size} ry={1.2 * p.size}
            fill={p.bloom}
            transform={`rotate(${(angle * 180) / Math.PI} ${px} ${py})`} />
        );
      })}
      {/* center */}
      <circle cx={p.x} cy={p.y} r={1.5 * p.size} fill={p.stem} />
    </g>
  );
}

export function WordGarden({ open, onClose }: Props) {
  const [season, setSeason] = useState(SEASONS[0]);
  const [hovered, setHovered] = useState<Plant | null>(null);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.75)", backdropFilter: "blur(12px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Word Garden"
            className={cn("fixed inset-0 z-[150] bg-gradient-to-b shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto transition-colors duration-700", season.sky)}
          >
            <header className="px-4 py-3 border-b border-foreground/10 flex items-center gap-3 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl glass-strong border border-foreground/10 flex items-center justify-center shrink-0">
                <Flower2 className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg leading-tight">Word Garden</div>
                <div className="text-[11px] text-muted-foreground">9 plants · grown from your words</div>
              </div>
              <button onClick={() => toast.success("Word Garden shared to Lamahat")} className="w-9 h-9 rounded-full hover:bg-foreground/10 flex items-center justify-center" aria-label="Share"><Share2 className="w-4 h-4" /></button>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-foreground/10 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            {/* SVG garden */}
            <div className="flex-1 relative overflow-hidden">
              {/* ground */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-charcoal/30 to-transparent" />
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <radialGradient id="sun">
                    <stop offset="0%" stopColor="hsl(39 45% 70%)" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="hsl(39 45% 70%)" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {/* sun */}
                <circle cx="85" cy="15" r="12" fill="url(#sun)" />
                <circle cx="85" cy="15" r="3" fill="hsl(39 45% 65%)" opacity="0.5" />
                {/* soil */}
                <path d="M 0 85 Q 50 80 100 85 L 100 100 L 0 100 Z" fill="hsl(30 30% 20%)" opacity="0.5" />
                {season.plants.map((p) => (
                  <g key={p.id} onMouseEnter={() => setHovered(p)} onMouseLeave={() => setHovered(null)}>
                    <PlantShape p={p} season={season.k} />
                  </g>
                ))}
              </svg>

              {/* hover card */}
              <AnimatePresence>
                {hovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute glass-strong rounded-xl px-3 py-2 border border-foreground/10 pointer-events-none"
                    style={{
                      left: `${hovered.x}%`, top: `${hovered.y - 12}%`,
                      transform: "translate(-50%, -100%)",
                    }}>
                    <div className="font-display text-base text-foreground">{hovered.word}</div>
                    <div className="text-[10px] text-muted-foreground">{hovered.count} mentions</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Season tabs */}
            <div className="px-4 py-3 border-t border-foreground/10 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-1.5 mb-3">
                {SEASONS.map((s) => (
                  <button key={s.k} onClick={() => { setSeason(s); toast.success(`${s.label} garden grown`); }}
                    className={cn("px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 border transition",
                      season.k === s.k ? "bg-cream text-charcoal border-cream" : "glass-strong text-foreground/80 border-foreground/10")}>
                    <span>{s.emoji}</span> {s.label}
                  </button>
                ))}
              </div>

              {/* Top words list */}
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-secondary" /> Top words · {season.label}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {season.plants.slice().sort((a, b) => b.count - a.count).map((p) => (
                  <button key={p.id} onClick={() => setHovered(p)}
                    className="text-[11px] px-2 py-0.5 rounded-full glass-strong border border-foreground/10 hover:scale-105 transition">
                    {p.word} <span className="text-muted-foreground font-mono">·{p.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

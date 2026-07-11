"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Aperture, Camera, Eye, EyeOff, Sparkles, ShieldCheck, Check,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Filter {
  id: string;
  name: string;
  emoji: string;
  /** CSS overlay style for the filter preview */
  style: React.CSSProperties;
  /** Pattern overlay (SVG) */
  pattern?: React.ReactNode;
  tint: string;
}

const FILTERS: Filter[] = [
  {
    id: "none",
    name: "None",
    emoji: "🚫",
    tint: "from-muted/40 to-muted/10",
    style: {},
  },
  {
    id: "golden",
    name: "Golden Hour",
    emoji: "🌅",
    tint: "from-secondary/40 to-accent/10",
    style: {
      background:
        "linear-gradient(135deg, hsl(39 80% 60% / 0.35) 0%, hsl(20 70% 55% / 0.25) 100%)",
      mixBlendMode: "overlay",
    },
  },
  {
    id: "geometric",
    name: "Islamic Geometric",
    emoji: "✦",
    tint: "from-primary/40 to-secondary/10",
    style: { background: "hsl(195 56% 23% / 0.18)", mixBlendMode: "multiply" },
    pattern: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <pattern id="geo" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M30 0 L60 30 L30 60 L0 30 Z M15 15 L45 15 L45 45 L15 45 Z"
              fill="none"
              stroke="hsl(39 45% 67% / 0.45)"
              strokeWidth="1"
            />
            <circle cx="30" cy="30" r="6" fill="none" stroke="hsl(39 45% 67% / 0.4)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#geo)" />
      </svg>
    ),
  },
  {
    id: "calligraphy",
    name: "Calligraphy",
    emoji: "✍",
    tint: "from-charcoal/40 to-secondary/10",
    style: { background: "hsl(60 8% 9% / 0.25)", mixBlendMode: "soft-light" },
    pattern: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <pattern id="cal" width="120" height="60" patternUnits="userSpaceOnUse">
            <text x="10" y="40" fontFamily="serif" fontSize="32" fill="hsl(39 45% 67% / 0.3)" fontStyle="italic">
              ﷲ
            </text>
            <text x="70" y="50" fontFamily="serif" fontSize="22" fill="hsl(39 45% 67% / 0.2)" fontStyle="italic">
              ﷲ
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cal)" />
      </svg>
    ),
  },
  {
    id: "mirage",
    name: "Desert Mirage",
    emoji: "🏜",
    tint: "from-secondary/40 to-accent/20",
    style: {
      background:
        "radial-gradient(ellipse at center, hsl(351 41% 56% / 0.25), hsl(39 60% 70% / 0.2))",
      mixBlendMode: "screen",
    },
  },
  {
    id: "nile",
    name: "Nile Blue",
    emoji: "🌊",
    tint: "from-primary/40 to-steel/20",
    style: {
      background:
        "linear-gradient(180deg, hsl(195 56% 30% / 0.4) 0%, hsl(211 30% 45% / 0.25) 100%)",
      mixBlendMode: "color",
    },
  },
  {
    id: "lantern",
    name: "Lantern Glow",
    emoji: "🏮",
    tint: "from-accent/40 to-secondary/20",
    style: {
      background:
        "radial-gradient(circle at 50% 30%, hsl(351 60% 55% / 0.45), hsl(25 80% 50% / 0.2) 60%, transparent 80%)",
      mixBlendMode: "soft-light",
    },
  },
  {
    id: "mosaic",
    name: "Mosaic",
    emoji: "🟦",
    tint: "from-steel/40 to-primary/20",
    style: { background: "hsl(211 30% 45% / 0.15)", mixBlendMode: "overlay" },
    pattern: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <pattern id="mos" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="20" height="20" fill="hsl(351 41% 56% / 0.25)" />
            <rect x="20" y="20" width="20" height="20" fill="hsl(195 56% 33% / 0.3)" />
            <rect x="20" y="0" width="20" height="20" fill="hsl(39 45% 57% / 0.25)" />
            <rect x="0" y="20" width="20" height="20" fill="hsl(211 30% 42% / 0.3)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mos)" />
      </svg>
    ),
  },
];

export function CircleLens({ open, onClose }: Props) {
  const [filterIdx, setFilterIdx] = useState(0);
  const [intensity, setIntensity] = useState(80);
  const [showOriginal, setShowOriginal] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = FILTERS[filterIdx];

  const capture = () => {
    setCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 320);
    setTimeout(() => {
      setCapturing(false);
      toast.success(`Captured with ${current.name}`, {
        description: "Saved to Lamahat · processed on-device.",
      });
      onClose();
    }, 700);
  };

  const shift = (dir: -1 | 1) => {
    setFilterIdx((i) => (i + dir + FILTERS.length) % FILTERS.length);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140]"
            style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Cirkle Lens"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 90, 180, 270, 360] }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-secondary/20 border border-accent/40 flex items-center justify-center shrink-0"
              >
                <Aperture className="w-5 h-5 text-accent" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Cirkle Lens</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  Cultural AR filters · processed on-device
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Viewfinder */}
              <section>
                <div
                  className="relative aspect-square w-full rounded-3xl overflow-hidden border border-border/60"
                  onMouseDown={() => { holdRef.current = setTimeout(() => setShowOriginal(true), 80); }}
                  onMouseUp={() => { if (holdRef.current) clearTimeout(holdRef.current); setShowOriginal(false); }}
                  onMouseLeave={() => { if (holdRef.current) clearTimeout(holdRef.current); setShowOriginal(false); }}
                  onTouchStart={() => { holdRef.current = setTimeout(() => setShowOriginal(true), 80); }}
                  onTouchEnd={() => { if (holdRef.current) clearTimeout(holdRef.current); setShowOriginal(false); }}
                >
                  {/* Base viewfinder gradient (mock camera feed) */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(ellipse at 50% 30%, hsl(39 60% 70% / 0.6), hsl(195 40% 35% / 0.7) 60%, hsl(351 41% 40% / 0.7) 100%)",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-primary/20" />

                  {/* Filter overlay */}
                  <AnimatePresence mode="popLayout">
                    {!showOriginal && current.id !== "none" && (
                      <motion.div
                        key={current.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: intensity / 100 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 pointer-events-none"
                        style={current.style}
                      >
                        {current.pattern}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Flash */}
                  <AnimatePresence>
                    {flash && (
                      <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.32 }}
                        className="absolute inset-0 bg-white z-30"
                      />
                    )}
                  </AnimatePresence>

                  {/* Capture overlay HUD */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20">
                    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full glass-strong">
                      {showOriginal ? "Original" : current.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full glass-strong flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> LIVE
                    </span>
                  </div>

                  {/* Hold-to-see-original hint */}
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center z-20">
                    <span className="text-[10px] px-2.5 py-1 rounded-full glass-strong flex items-center gap-1.5">
                      {showOriginal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      Hold to compare with original
                    </span>
                  </div>

                  {/* Rule-of-thirds grid */}
                  <div className="absolute inset-0 pointer-events-none opacity-25">
                    <div className="absolute inset-y-0 left-1/3 w-px bg-cream" />
                    <div className="absolute inset-y-0 left-2/3 w-px bg-cream" />
                    <div className="absolute inset-x-0 top-1/3 h-px bg-cream" />
                    <div className="absolute inset-x-0 top-2/3 h-px bg-cream" />
                  </div>
                </div>

                {/* Capture button */}
                <div className="mt-4 flex items-center justify-center gap-6">
                  <button
                    onClick={() => shift(-1)}
                    className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-muted/60 transition"
                    aria-label="Previous filter"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={capture}
                    disabled={capturing}
                    className="relative w-16 h-16 rounded-full border-4 border-cream flex items-center justify-center disabled:opacity-60"
                    aria-label="Capture"
                  >
                    <span className="absolute inset-1.5 rounded-full bg-accent" />
                    <Camera className="relative w-6 h-6 text-accent-foreground" />
                  </motion.button>
                  <button
                    onClick={() => shift(1)}
                    className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-muted/60 transition"
                    aria-label="Next filter"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {capturing && (
                  <div className="mt-2 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-secondary" /> Processing on-device…
                  </div>
                )}
              </section>

              {/* Intensity slider */}
              <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Intensity
                  </span>
                  <span className="text-xs font-medium tabular-nums">{intensity}%</span>
                </div>
                <Slider
                  value={[intensity]}
                  onValueChange={(v) => setIntensity(v[0])}
                  min={0}
                  max={100}
                  step={1}
                  aria-label="Filter intensity"
                />
                <p className="text-[11px] text-muted-foreground">
                  Adjust how strongly the filter is applied to your photo or video.
                </p>
              </section>

              {/* Filter carousel */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Cultural filters
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                  {FILTERS.map((f, i) => (
                    <button
                      key={f.id}
                      onClick={() => setFilterIdx(i)}
                      className={cn(
                        "shrink-0 w-20 rounded-2xl border p-2 flex flex-col items-center gap-1.5 transition",
                        i === filterIdx
                          ? "border-secondary/60 bg-secondary/10"
                          : "border-border/50 bg-card hover:bg-muted/40"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-xl",
                        f.tint
                      )}>
                        {f.emoji}
                      </div>
                      <span className="text-[10px] text-center leading-tight line-clamp-1">{f.name}</span>
                      {i === filterIdx && (
                        <span className="text-[9px] text-secondary flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* Privacy note */}
              <section className="rounded-2xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  All filters run on-device. No photos uploaded.
                </p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

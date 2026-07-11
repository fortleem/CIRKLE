"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Share2, MessageCircle, Play, Image as ImageIcon, Hash,
  Sparkles, Shield, TrendingUp, type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Pillar {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;       // hsl color for the pulse
  glow: string;        // rgba for glow
  activity: number;    // 0..100
}

const PILLARS: Pillar[] = [
  { id: "wasl", name: "Wasl", icon: MessageCircle, color: "hsl(var(--teal))", glow: "hsl(var(--teal) / 0.6)", activity: 82 },
  { id: "mashahd", name: "Mashahd", icon: Play, color: "hsl(var(--gold))", glow: "hsl(var(--gold) / 0.6)", activity: 64 },
  { id: "lamahat", name: "Lamahat", icon: ImageIcon, color: "hsl(var(--rose))", glow: "hsl(var(--rose) / 0.6)", activity: 71 },
  { id: "midan", name: "Midan", icon: Hash, color: "hsl(var(--steel))", glow: "hsl(var(--steel) / 0.6)", activity: 55 },
  { id: "rihla", name: "Rihla", icon: TrendingUp, color: "hsl(var(--gold))", glow: "hsl(var(--gold) / 0.6)", activity: 38 },
  { id: "pay", name: "Pay", icon: Sparkles, color: "hsl(var(--rose))", glow: "hsl(var(--rose) / 0.6)", activity: 47 },
  { id: "mail", name: "Mail", icon: MessageCircle, color: "hsl(var(--teal))", glow: "hsl(var(--teal) / 0.6)", activity: 28 },
  { id: "midan2", name: "Spaces", icon: Hash, color: "hsl(var(--steel))", glow: "hsl(var(--steel) / 0.6)", activity: 33 },
];

interface Stat {
  label: string;
  value: number;
  icon: LucideIcon;
  tint: string;
}

const STATS: Stat[] = [
  { label: "Messages today", value: 47, icon: MessageCircle, tint: "text-teal" },
  { label: "Videos watched", value: 12, icon: Play, tint: "text-gold" },
  { label: "Photos liked", value: 23, icon: ImageIcon, tint: "text-rose" },
  { label: "Posts shared", value: 5, icon: Hash, tint: "text-steel" },
];

function strengthLevel(activity: number): { label: string; emoji: string; color: string } {
  if (activity < 25) return { label: "Calm", emoji: "🌙", color: "text-muted-foreground" };
  if (activity < 50) return { label: "Active", emoji: "✨", color: "text-secondary" };
  if (activity < 75) return { label: "Radiant", emoji: "🔥", color: "text-accent" };
  return { label: "Blazing", emoji: "⚡", color: "text-rose" };
}

export function CircleAura({ open, onClose }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const totalActivity = useMemo(
    () => Math.round(PILLARS.reduce((s, p) => s + p.activity, 0) / PILLARS.length),
    []
  );
  const dominant = useMemo(
    () => [...PILLARS].sort((a, b) => b.activity - a.activity)[0],
    []
  );
  const strength = strengthLevel(totalActivity);

  // Orbit positions for 8 pillars (in degrees around the center)
  const orbit = PILLARS.map((p, i) => {
    const angle = (i / PILLARS.length) * Math.PI * 2 - Math.PI / 2; // start at top
    return { ...p, angle };
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[160] overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at center, hsl(var(--charcoal)) 0%, hsl(var(--background)) 100%)",
          }}
        >
          {/* Aurora background */}
          <div className="absolute inset-0 aurora-bg opacity-60 pointer-events-none" />
          <motion.div
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-1/2 opacity-30 pointer-events-none"
            style={{
              background: `conic-gradient(from 0deg at 50% 50%, ${dominant.glow}, transparent 25%, ${dominant.glow} 50%, transparent 75%, ${dominant.glow})`,
              filter: "blur(60px)",
            }}
          />

          {/* Header */}
          <header className="absolute top-0 inset-x-0 z-10 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-accent/20 border border-secondary/40 flex items-center justify-center"
              >
                <Sparkles className="w-5 h-5 text-secondary" />
              </motion.div>
              <div>
                <div className="font-display text-xl">Cirkle Aura</div>
                <div className="text-[11px] text-muted-foreground">A live signature of your activity</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-muted/60 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Main aura stage */}
          <div className="absolute inset-0 flex items-center justify-center pt-16 pb-44">
            <div className="relative w-[min(86vw,420px)] aspect-square">
              {/* Outer pulsing rings */}
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  aria-hidden
                  animate={{ scale: [1, 1.5 + i * 0.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                  className="absolute inset-0 rounded-full border"
                  style={{ borderColor: dominant.color, opacity: 0.3 }}
                />
              ))}

              {/* Radial aura glow */}
              <motion.div
                aria-hidden
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-8 rounded-full"
                style={{
                  background: `radial-gradient(circle at center, ${dominant.glow} 0%, transparent 70%)`,
                  filter: "blur(20px)",
                }}
              />

              {/* Conic shimmer ring */}
              <motion.div
                aria-hidden
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute inset-12 rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, transparent, ${dominant.color}, transparent, ${dominant.color}, transparent)`,
                  WebkitMask: "radial-gradient(transparent 58%, black 60%, transparent 72%)",
                  mask: "radial-gradient(transparent 58%, black 60%, transparent 72%)",
                  opacity: 0.8,
                }}
              />

              {/* Center CircleMark */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative w-32 h-32 rounded-full glass-strong border border-secondary/40 flex items-center justify-center shadow-float"
                  style={{ boxShadow: `0 0 60px ${dominant.glow}` }}
                >
                  {/* 3 interlocking circles, hand-drawn */}
                  <svg width="72" height="72" viewBox="0 0 100 100" fill="none" aria-hidden>
                    <defs>
                      <linearGradient id="auraGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--gold))" />
                        <stop offset="50%" stopColor="hsl(var(--rose))" />
                        <stop offset="100%" stopColor="hsl(var(--teal))" />
                      </linearGradient>
                    </defs>
                    <motion.circle
                      cx="50" cy="32" r="22"
                      stroke="url(#auraGrad)" strokeWidth="1.8" opacity="0.95"
                      animate={{ pathLength: [0, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.circle
                      cx="32" cy="60" r="22"
                      stroke="url(#auraGrad)" strokeWidth="1.8" opacity="0.95"
                      animate={{ pathLength: [0, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                    />
                    <motion.circle
                      cx="68" cy="60" r="22"
                      stroke="url(#auraGrad)" strokeWidth="1.8" opacity="0.95"
                      animate={{ pathLength: [0, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                    />
                    <motion.circle
                      cx="50" cy="50" r="6"
                      fill="url(#auraGrad)"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </svg>

                  {/* Inner ring tracker */}
                  <motion.div
                    aria-hidden
                    animate={{ rotate: -360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-1 rounded-full"
                    style={{
                      background: `conic-gradient(from 0deg, transparent 0deg, ${dominant.color} 30deg, transparent 60deg)`,
                      WebkitMask: "radial-gradient(transparent 78%, black 80%, transparent 92%)",
                      mask: "radial-gradient(transparent 78%, black 80%, transparent 92%)",
                      opacity: 0.6,
                    }}
                  />
                </motion.div>
              </div>

              {/* Orbiting pillar dots */}
              {orbit.map((p, i) => {
                const radius = 46; // percent of container
                const x = 50 + radius * Math.cos(p.angle);
                const y = 50 + radius * Math.sin(p.angle);
                const size = 14 + (p.activity / 100) * 22; // 14..36px
                const isHover = hovered === p.id;
                return (
                  <div
                    key={p.id}
                    className="absolute"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <motion.button
                      onHoverStart={() => setHovered(p.id)}
                      onHoverEnd={() => setHovered(null)}
                      onFocus={() => setHovered(p.id)}
                      onBlur={() => setHovered(null)}
                      animate={{
                        scale: isHover ? 1.25 : 1,
                        boxShadow: isHover
                          ? `0 0 28px ${p.glow}`
                          : `0 0 14px ${p.glow}`,
                      }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-full flex items-center justify-center"
                      style={{
                        width: size,
                        height: size,
                        background: p.color,
                        color: "hsl(var(--cream))",
                      }}
                      aria-label={`${p.name} · ${p.activity}% active`}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 2 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full"
                        style={{ background: p.color, filter: "blur(8px)", opacity: 0.5, zIndex: -1 }}
                      />
                      <p.icon className="w-3 h-3 sm:w-4 sm:h-4 relative" />
                      <AnimatePresence>
                        {isHover && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap glass-strong rounded-full px-2.5 py-1 text-[10px] font-medium shadow-soft z-20"
                          >
                            {p.name} · {p.activity}%
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aura strength meter */}
          <div className="absolute top-24 inset-x-0 z-10 px-5">
            <div className="max-w-md mx-auto glass-strong rounded-2xl px-4 py-2.5 flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Your aura is</span>
              <span className={cn("font-display text-lg", strength.color)}>{strength.label} {strength.emoji}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalActivity}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full"
                  style={{ background: `linear-gradient(90deg, ${dominant.color}, hsl(var(--rose)))` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">{totalActivity}%</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="absolute bottom-28 inset-x-0 z-10 px-5">
            <div className="max-w-md mx-auto grid grid-cols-4 gap-2">
              {STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-2xl glass-strong p-2.5 text-center"
                >
                  <s.icon className={cn("w-4 h-4 mx-auto mb-1", s.tint)} />
                  <div className="font-display text-lg gradient-text-gold leading-none">{s.value}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1 leading-tight">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div
            className="absolute bottom-0 inset-x-0 z-10 px-5 py-4 flex items-center gap-2"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
          >
            <button
              onClick={() => {
                toast.success("Aura snapshot shared", { description: "Posted to Lamahat — your friends can see today's aura." });
                onClose();
              }}
              className="flex-1 px-4 py-3 rounded-full bg-gradient-hero text-cream text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition shadow-float"
            >
              <Share2 className="w-4 h-4" /> Share my aura
            </button>
            <button
              onClick={() => toast("Dominant pillar: " + dominant.name, { description: "Tap any orbiting dot for details." })}
              className="px-4 py-3 rounded-full glass text-sm flex items-center gap-1.5 hover:bg-muted/60 transition"
            >
              <Sparkles className="w-4 h-4" /> Insights
            </button>
          </div>

          {/* Privacy note (bottom, above footer) */}
          <div className="absolute bottom-20 inset-x-0 z-10 px-5">
            <div className="max-w-md mx-auto flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
              <Shield className="w-3 h-3" /> Your aura is computed on-device from your activity. No data leaves your phone.
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

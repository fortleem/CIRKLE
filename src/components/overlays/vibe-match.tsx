"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Users, MapPin, ShieldCheck, RefreshCw, Loader2, MessageCircle,
  Check, XCircle, ShieldAlert, Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Match {
  id: string;
  name: string;
  initials: string;
  tint: string;
  shared: string[];
  distance: string;
  vibe: number;
  angle: number; // 0..360
  radius: number; // 0..1 (fraction of radar radius)
}

const INTERESTS = ["Coffee", "Cairo", "Jazz", "Books", "Cycling", "Open Source"];

const POOL: Omit<Match, "angle" | "radius">[] = [
  { id: "p1", name: "Maya", initials: "M", tint: "from-accent/60 to-secondary/30", shared: ["Coffee", "Jazz", "Cairo"], distance: "400m away", vibe: 87 },
  { id: "p2", name: "Yara", initials: "Y", tint: "from-secondary/60 to-accent/30", shared: ["Books", "Cairo", "Open Source"], distance: "650m away", vibe: 81 },
  { id: "p3", name: "Sami", initials: "S", tint: "from-primary/60 to-steel/30", shared: ["Cycling", "Coffee"], distance: "1.1 km away", vibe: 73 },
  { id: "p4", name: "Rana", initials: "R", tint: "from-steel/60 to-primary/30", shared: ["Jazz", "Books", "Cairo"], distance: "1.8 km away", vibe: 68 },
  { id: "p5", name: "Tarek", initials: "T", tint: "from-accent/60 to-primary/30", shared: ["Open Source", "Cycling", "Coffee"], distance: "2.4 km away", vibe: 64 },
  { id: "p6", name: "Lina", initials: "L", tint: "from-secondary/60 to-primary/30", shared: ["Cairo", "Jazz"], distance: "900m away", vibe: 78 },
  { id: "p7", name: "User", initials: "O", tint: "from-primary/60 to-accent/30", shared: ["Cycling", "Books"], distance: "1.5 km away", vibe: 70 },
  { id: "p8", name: "Dana", initials: "D", tint: "from-steel/60 to-accent/30", shared: ["Coffee", "Open Source", "Jazz"], distance: "1.2 km away", vibe: 76 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function withRadar(matches: Omit<Match, "angle" | "radius">[]): Match[] {
  return matches.slice(0, 5).map((m, i) => ({
    ...m,
    angle: (i / 5) * 360 + Math.random() * 30,
    radius: 0.35 + (i / 5) * 0.55,
  }));
}

export function VibeMatch({ open, onClose }: Props) {
  const [visible, setVisible] = useState(true);
  const [interestsVisible, setInterestsVisible] = useState(true);
  const [precision, setPrecision] = useState("coarse");
  const [refreshing, setRefreshing] = useState(false);
  const [matches, setMatches] = useState<Match[]>(() => withRadar(POOL.slice(0, 5)));
  const [passed, setPassed] = useState<Record<string, boolean>>({});

  // Derived-state pattern: reset matches when the overlay opens.
  // (Avoids set-state-in-effect — same pattern as mashahd-player.tsx.)
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setMatches(withRadar(POOL.slice(0, 5)));
      setPassed({});
      setRefreshing(false);
    }
  }

  const refresh = () => {
    setRefreshing(true);
    setMatches([]);
    setTimeout(() => {
      setMatches(withRadar(shuffle(POOL)));
      setPassed({});
      setRefreshing(false);
      toast.success("New vibes nearby", { description: "Refreshed on-device." });
    }, 2000);
  };

  const sayHi = (m: Match) => {
    toast.success(`Opening Wasl…`, { description: `Saying hi to ${m.name}.` });
    setTimeout(onClose, 600);
  };

  const pass = (m: Match) => {
    setPassed((p) => ({ ...p, [m.id]: true }));
    toast(`Passed on ${m.name}`);
    setTimeout(() => {
      setMatches((cs) => cs.filter((x) => x.id !== m.id));
    }, 400);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[160] overflow-hidden flex flex-col bg-background"
        >
          {/* Aurora background */}
          <div className="absolute inset-0 aurora-bg opacity-30 pointer-events-none" />

          {/* Header */}
          <header className="relative z-10 px-5 pt-5 pb-3 flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-primary/40 flex items-center justify-center shrink-0"
            >
              <Users className="w-5 h-5 text-primary" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl">Vibe Match</div>
              <div className="text-[11px] text-muted-foreground truncate">
                Find people nearby who share your vibe · privacy-preserving
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

          <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-6 space-y-5">
            {/* Radar */}
            <section className="flex flex-col items-center">
              <div className="relative w-[min(80vw,340px)] aspect-square">
                {/* Concentric rings */}
                {[1, 0.75, 0.5, 0.25].map((r, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full border border-primary/20"
                    style={{
                      inset: `${(1 - r) * 50}%`,
                    }}
                  />
                ))}
                {/* Cross hairs */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/15" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/15" />

                {/* Rotating sweep */}
                <motion.div
                  aria-hidden
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 0deg, hsl(var(--secondary) / 0.35), transparent 25%)",
                  }}
                />

                {/* Center dot (you) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -inset-3 rounded-full bg-secondary/30 blur-md"
                  />
                  <div className="relative w-4 h-4 rounded-full bg-gradient-gold border-2 border-background shadow-glow" />
                </div>

                {/* Match dots */}
                {matches.map((m) => {
                  const rad = (m.angle * Math.PI) / 180;
                  const x = 50 + Math.cos(rad) * m.radius * 42;
                  const y = 50 + Math.sin(rad) * m.radius * 42;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: passed[m.id] ? 0 : 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 240, damping: 18 }}
                      className="absolute"
                      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.18, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        className={cn(
                          "w-7 h-7 rounded-full bg-gradient-to-br border-2 border-background flex items-center justify-center text-[10px] font-medium",
                          m.tint
                        )}
                      >
                        {m.initials}
                      </motion.div>
                    </motion.div>
                  );
                })}

                {refreshing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-full">
                    <Loader2 className="w-7 h-7 animate-spin text-secondary" />
                  </div>
                )}
              </div>

              {/* Interest chips */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                {INTERESTS.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/30 flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> {tag}
                  </span>
                ))}
              </div>

              <button
                onClick={refresh}
                disabled={refreshing}
                className="mt-4 px-4 py-2 rounded-full bg-gradient-hero text-cream text-sm flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Find new vibes
              </button>
            </section>

            {/* Match list */}
            <section>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> {matches.length} match{matches.length === 1 ? "" : "es"} nearby
              </div>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                <AnimatePresence mode="popLayout">
                  {matches.map((m) => (
                    <motion.div
                      key={m.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{
                        opacity: passed[m.id] ? 0 : 1,
                        y: 0,
                        x: passed[m.id] ? 60 : 0,
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-2xl border border-border/60 bg-card p-3 flex items-center gap-3"
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center font-medium shrink-0",
                        m.tint
                      )}>
                        {m.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium truncate">{m.name}</div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-medium shrink-0">
                            {m.vibe}% vibe
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {m.distance}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {m.shared.map((s) => (
                            <span
                              key={s}
                              className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded-full border",
                                INTERESTS.includes(s)
                                  ? "bg-secondary/15 border-secondary/40 text-secondary"
                                  : "bg-foreground/5 border-border/50"
                              )}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => sayHi(m)}
                          className="text-[10px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground flex items-center gap-1 hover:opacity-90 transition"
                        >
                          <MessageCircle className="w-3 h-3" /> Say hi
                        </button>
                        <button
                          onClick={() => pass(m)}
                          className="text-[10px] px-2.5 py-1 rounded-full bg-muted/40 border border-border/50 flex items-center gap-1 hover:bg-muted/60 transition"
                        >
                          <XCircle className="w-3 h-3" /> Pass
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {matches.length === 0 && !refreshing && (
                  <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                    No more matches nearby. Try “Find new vibes”.
                  </div>
                )}
              </div>
            </section>

            {/* Privacy controls */}
            <section className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Visible to nearby</div>
                  <div className="text-[11px] text-muted-foreground">Let others discover you on the radar</div>
                </div>
                <Switch checked={visible} onCheckedChange={setVisible} aria-label="Visible to nearby" />
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Location precision</div>
                  <div className="text-[11px] text-muted-foreground">Coarse only · never precise</div>
                </div>
                <Select value={precision} onValueChange={setPrecision}>
                  <SelectTrigger className="w-[140px] h-8 bg-muted/40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coarse">Coarse only</SelectItem>
                    <SelectItem value="neighborhood">Neighborhood</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Interests visible</div>
                  <div className="text-[11px] text-muted-foreground">Show your interests on the radar</div>
                </div>
                <Switch checked={interestsVisible} onCheckedChange={setInterestsVisible} aria-label="Interests visible" />
              </div>
            </section>

            {/* Safety note */}
            <section className="rounded-2xl border border-secondary/30 bg-secondary/10 p-3 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Vibe Match only uses coarse location. Your precise location is never shared.
                Matches are computed on-device.
              </p>
            </section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

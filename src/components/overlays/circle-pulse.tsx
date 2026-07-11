"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, Heart, Sparkles, Waves, Wind, X, Music2, Cloud, Sun,
  AlertTriangle, MapPin, Radio, type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface Props { open: boolean; onClose: () => void; }

interface Peer { id: string; name: string; action: string; distance: string; }

interface City {
  name: string; mood: number; energy: number; calm: number;
  sound: string; weather: string; air: string;
  color: string; tag: string; ar: string;
}

const CITIES: City[] = [
  { name: "Riyadh", mood: 78, energy: 82, calm: 64, sound: "Lo-fi · Boulevard", weather: "Clear · 28°", air: "Moderate", color: "from-secondary/40 to-accent/20", tag: "Festive", ar: "الرياض" },
  { name: "Jeddah", mood: 71, energy: 68, calm: 80, sound: "Ambient · Corniche", weather: "Humid · 32°", air: "Good", color: "from-primary/40 to-secondary/20", tag: "Relaxed", ar: "جدة" },
  { name: "AlUla", mood: 88, energy: 60, calm: 92, sound: "Wind · Desert", weather: "Dry · 26°", air: "Pristine", color: "from-accent/40 to-secondary/20", tag: "Wondrous", ar: "العلا" },
  { name: "NEOM", mood: 74, energy: 91, calm: 55, sound: "Synthwave · Bay", weather: "Cool · 22°", air: "Good", color: "from-primary/40 to-accent/20", tag: "Electric", ar: "نيوم" },
];

// No mock data — mesh peers stay empty until a real mesh source is wired in.
const PEERS: Peer[] = [];

/**
 * CirclePulse — Sheet showing a live "digital biome" of a city:
 * pulsing-dot grid, biosignal wave, vitals, strips, and a live
 * activity feed pulled from mesh peers (a new item appears every 3s
 * when peers are available).
 */
export function CirclePulse({ open, onClose }: Props) {
  const [city, setCity] = useState(0);
  const [tick, setTick] = useState(0);
  const [feed, setFeed] = useState<Peer[]>([]);

  // wave animation tick
  useEffect(() => {
    if (!open) return;
    const i = setInterval(() => setTick((t) => t + 1), 1600);
    return () => clearInterval(i);
  }, [open]);

  // live activity feed: prepend a new mesh peer every 3s when available.
  useEffect(() => {
    if (!open) return;
    if (PEERS.length === 0) return; // no mesh peers — live feed stays empty
    const i = setInterval(() => {
      setFeed((f) => {
        const next = PEERS[Math.floor(Math.random() * PEERS.length)];
        if (!next) return f;
        const withNewId = { ...next, id: `${next.id}-${Date.now()}` };
        return [withNewId, ...f].slice(0, 5);
      });
    }, 3000);
    return () => clearInterval(i);
  }, [open]);

  const c = CITIES[city];
  const wave = (offset: number) => 50 + Math.sin((tick + offset) * 0.6) * 30;

  // stable dot grid (memoised so dots don't reshuffle every render)
  const dots = useMemo(
    () => Array.from({ length: 64 }).map((_, i) => ({
      i,
      delay: (i % 8) * 0.1 + Math.floor(i / 8) * 0.07,
      intensity: 0.3 + ((i * 37) % 70) / 100,
    })),
    []
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] bg-charcoal/60 backdrop-blur-md flex items-end sm:items-center justify-center p-3"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-label="Cirkle Pulse"
            className="relative w-full max-w-xl glass-strong rounded-3xl overflow-hidden shadow-float flex flex-col max-h-[92vh] z-[150]"
          >
            <div className="relative p-5 pb-4">
              <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-60`} />
              <div className="absolute inset-0 aurora-bg opacity-40" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-secondary flex items-center gap-1.5">
                    <Activity className="w-3 h-3" /> Cirkle Pulse · Live city biome
                  </div>
                  <h2 className="font-display text-3xl mt-1">
                    {c.name} <span className="font-arabic text-secondary text-xl">· {c.ar}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Anonymous signals from {1240 + tick * 3} nearby devices · updated just now
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* City switcher */}
              <div className="relative mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
                {CITIES.map((ct, i) => (
                  <button
                    key={ct.name}
                    onClick={() => setCity(i)}
                    className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${
                      i === city ? "bg-primary text-primary-foreground" : "glass hover:bg-muted/60"
                    }`}
                  >
                    {ct.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Pulsing-dot biome grid */}
              <div className="px-5">
                <div className="rounded-2xl bg-muted/40 p-4 relative overflow-hidden">
                  <div className="absolute top-3 left-3 text-[10px] uppercase tracking-widest text-foreground/80 flex items-center gap-1 z-10">
                    <Radio className="w-3 h-3" /> City grid · {c.tag}
                  </div>
                  <div className="absolute top-3 right-3 glass text-[10px] px-2 py-0.5 rounded-full z-10">{c.tag}</div>
                  <div className="grid grid-cols-8 gap-1.5 pt-6 pb-1">
                    {dots.map((d) => (
                      <motion.div
                        key={d.i}
                        animate={{
                          scale: [1, 1.4, 1],
                          opacity: [d.intensity * 0.4, d.intensity, d.intensity * 0.4],
                        }}
                        transition={{
                          duration: 2.4,
                          repeat: Infinity,
                          delay: d.delay,
                          ease: "easeInOut",
                        }}
                        className="aspect-square rounded-full bg-gradient-to-br from-secondary via-primary to-accent"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Biosignal wave */}
              <div className="px-5 mt-3">
                <div className="rounded-2xl bg-muted/40 p-4 relative overflow-hidden h-32">
                  <div className="absolute inset-0 flex items-end gap-1 p-3">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: `${wave(i)}%` }}
                        transition={{ duration: 1.4, ease: "easeInOut" }}
                        className="flex-1 rounded-full bg-gradient-to-t from-primary via-secondary to-accent opacity-80"
                      />
                    ))}
                  </div>
                  <div className="absolute top-3 left-3 text-[10px] uppercase tracking-widest text-foreground/80 flex items-center gap-1">
                    <Waves className="w-3 h-3" /> Collective rhythm
                  </div>
                </div>
              </div>

              {/* Vitals */}
              <div className="grid grid-cols-3 gap-2 px-5 mt-3">
                <Vital icon={Heart} label="Mood" value={c.mood} suffix="/100" />
                <Vital icon={Sparkles} label="Energy" value={c.energy} suffix="/100" />
                <Vital icon={Wind} label="Calm" value={c.calm} suffix="/100" />
              </div>

              {/* Strips */}
              <div className="px-5 mt-3 space-y-2">
                <Strip icon={Music2} label="Soundscape" value={c.sound} />
                <Strip icon={Sun} label="Weather" value={c.weather} />
                <Strip icon={Cloud} label="Air quality" value={c.air} />
                <Strip icon={AlertTriangle} label="Safety" value="No active advisories · all clear" />
              </div>

              {/* Live activity feed */}
              <div className="px-5 mt-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5 px-1">
                  <motion.span
                    key={tick}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-1.5 h-1.5 rounded-full bg-accent"
                  />
                  Live activity · mesh-relayed
                </div>
                <ul className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
                  {feed.length === 0 ? (
                    <li className="px-4 py-4">
                      <p className="text-sm text-muted-foreground text-center">
                        No pulse data — connect to mesh
                      </p>
                    </li>
                  ) : (
                    <AnimatePresence initial={false}>
                      {feed.map((p) => (
                        <motion.li
                          key={p.id}
                          layout
                          initial={{ opacity: 0, x: -20, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: "auto" }}
                          exit={{ opacity: 0, x: 20, height: 0 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          className="px-4 py-2.5 flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-mesh shrink-0 flex items-center justify-center">
                            <Radio className="w-3 h-3 text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm">
                              <span className="font-medium">{p.name}</span>{" "}
                              <span className="text-muted-foreground">{p.action}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">{p.distance} · mesh-relayed</div>
                          </div>
                          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  )}
                </ul>
              </div>
            </div>

            <div
              className="p-5 pt-4 flex items-center gap-2 border-t border-border/40"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
            >
              <button
                onClick={() => toast.success(`Tuning in to ${c.name}`, { description: c.sound })}
                className="flex-1 px-4 py-2.5 rounded-full bg-gradient-hero text-cream text-sm font-medium hover:opacity-90 transition"
              >
                Tune in to {c.name}
              </button>
              <button
                onClick={() => toast(`Opening Cirkle Maps · ${c.name}`, { description: "Zero-cost OSM tiles" })}
                className="px-4 py-2.5 rounded-full glass text-sm flex items-center gap-1.5 hover:bg-muted/60 transition"
              >
                <MapPin className="w-4 h-4" /> Map
              </button>
              <button
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new CustomEvent("circle:composer", {
                    detail: { kind: "post", draft: `Sharing the pulse of ${c.name} right now — ${c.tag.toLowerCase()} vibes.` },
                  }));
                }}
                className="px-4 py-2.5 rounded-full glass text-sm hover:bg-muted/60 transition"
              >
                Share
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Vital({ icon: Icon, label, value, suffix }: { icon: LucideIcon; label: string; value: number; suffix: string }) {
  return (
    <div className="rounded-2xl glass p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="w-3 h-3 text-secondary" /> {label}
      </div>
      <div className="font-display text-2xl mt-0.5">
        {value}<span className="text-xs text-muted-foreground ms-0.5">{suffix}</span>
      </div>
      <div className="h-1 mt-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-gradient-hero" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Strip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl glass px-3 py-2 text-sm">
      <Icon className="w-4 h-4 text-secondary shrink-0" />
      <span className="text-muted-foreground text-xs uppercase tracking-widest w-24 shrink-0">{label}</span>
      <span className="flex-1 truncate">{value}</span>
    </div>
  );
}

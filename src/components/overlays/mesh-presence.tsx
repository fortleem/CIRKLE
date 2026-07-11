"use client";

import { motion } from "framer-motion";
import { Radio, Wifi, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * MeshPresence — inline radar component (not an overlay).
 * Shows live mesh peers with pulsing dots and a synced-spaces rail.
 *
 * NOTE: This component must NOT cause page layout shifts. All animations
 * are transform/opacity only (no layout reflow). The peer list has a
 * fixed height so rotation doesn't change the page height.
 */

interface Peer { id: string; name: string; action: string; distance: string; }
interface Space { id: string; title: string; host: string; listeners: number; live: boolean; }

// No mock data — peers/spaces stay empty until a real mesh source is wired in.
const peers: Peer[] = [];
const spaces: Space[] = [];

export function MeshPresence() {
  const [tick, setTick] = useState(0);

  // Gentle visual pulse only (no data rotation = no layout shift)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="px-5">
      <div className="flex items-center gap-2 mb-3">
        <Wifi className="w-4 h-4 text-secondary" />
        <h2 className="font-display text-xl flex-1">Mesh presence</h2>
        <span className="text-[10px] uppercase tracking-widest text-secondary flex items-center gap-1.5 glass px-2 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
          {peers.length} peers nearby
        </span>
      </div>

      <div className="rounded-3xl glass overflow-hidden relative">
        {/* Radar visual — fixed height, no layout shift */}
        <div className="relative h-36 overflow-hidden border-b border-border/60 shrink-0">
          <div className="absolute inset-0 aurora-bg opacity-50" />
          {/* Expanding radar rings — pure transform animation, no reflow */}
          {[0, 1, 2].map((idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0.3, opacity: 0.6 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 3, repeat: Infinity, delay: idx * 1, ease: "easeOut" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-secondary/50 pointer-events-none"
            />
          ))}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-mesh flex items-center justify-center pointer-events-none">
            <Radio className="w-4 h-4 text-primary-foreground" />
          </div>
          {/* Peer dots — fixed positions, only opacity pulses (no layout shift) */}
          {peers.slice(0, 4).map((p, idx) => {
            const angle = (idx / 4) * Math.PI * 2;
            const r = 56 + (idx % 2) * 12;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            return (
              <motion.button
                key={p.id}
                onClick={() => toast(`${p.name} · ${p.action}`, { description: `${p.distance} · mesh-relayed` })}
                className="absolute left-1/2 top-1/2 w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-secondary shadow-glow hover:scale-150 transition"
                style={{ x, y }} // static position via style, not animate
                aria-label={`Peer ${p.name}`}
              />
            );
          })}
          <div className="absolute bottom-2 left-3 text-[10px] flex items-center gap-1 text-secondary pointer-events-none">
            <Users className="w-3 h-3" /> {peers.length} peers within 150m
          </div>
        </div>

        {/* Activity stream — fixed height, no AnimatePresence layout shifts */}
        {peers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No peers nearby — open Mesh Dashboard to discover
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {peers.slice(0, 3).map((p) => (
              <li
                key={p.id}
                onClick={() => toast(`${p.name} · ${p.action}`, { description: `${p.distance} · mesh-relayed` })}
                className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition"
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
                <motion.span
                  key={`${p.id}-${tick}`}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"
                />
              </li>
            ))}
          </ul>
        )}

        {/* Synced spaces */}
        <div className="p-3 border-t border-border/60 bg-muted/20">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1">Spaces syncing in realtime</div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {spaces.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3 w-full">
                No live spaces — start one!
              </p>
            ) : spaces.map((s) => (
              <motion.button
                key={s.id}
                whileHover={{ y: -2 }}
                onClick={() => toast.success(`Joining ${s.title}`, { description: `Hosted by ${s.host} · ${s.listeners.toLocaleString()} live` })}
                className="shrink-0 rounded-2xl border border-secondary/30 bg-card px-3 py-2 flex items-center gap-2 text-left hover:border-secondary/60 transition"
              >
                <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-gradient-hero text-cream">
                  <Radio className="w-3 h-3" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
                </span>
                <div className="leading-tight">
                  <div className="text-xs font-medium truncate max-w-[140px]">{s.title}</div>
                  <div className="text-[10px] text-muted-foreground">{s.listeners.toLocaleString()} live</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

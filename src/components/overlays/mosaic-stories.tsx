// @ts-nocheck
"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, LayoutGrid, Plus, Share2, Sparkles, Users, Wand2,
} from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface Tile {
  id: number; author: string; initial: string; tint: string; kind: "photo" | "text" | "audio";
  caption: string;
}

const INITIAL_TILES: Tile[] = [
  
  
  
  
  
  
  
  
];

const CONTRIBUTORS = [
  
  
  
  
  { name: "You", count: 1, tint: "text-secondary" },
  { name: "Noura", count: 1, tint: "text-rose" },
  
  { name: "Aisha", count: 1, tint: "text-accent" },
];

export function MosaicStories({ open, onClose }: Props) {
  const [tiles, setTiles] = useState<Tile[]>(INITIAL_TILES);
  const [autoCreate, setAutoCreate] = useState(true);
  const [adding, setAdding] = useState(false);

  const addTile = (kind: Tile["kind"]) => {
    const colors = ["from-secondary/40 to-secondary/10 border-secondary/40", "from-accent/40 to-accent/10 border-accent/40", "from-primary/40 to-primary/10 border-primary/40"];
    const captions: Record<Tile["kind"], string> = {
      photo: "Just added a photo",
      text: "A note from the moment",
      audio: "Captured a sound",
    };
    const newTile: Tile = {
      id: Date.now(), author: "You", initial: "Y",
      tint: colors[tiles.length % colors.length], kind,
      caption: captions[kind],
    };
    setTiles((t) => {
      if (t.length >= 16) {
        toast.error("Mosaic is full · 16/16");
        return t;
      }
      const next = [...t];
      const emptySlot = next.findIndex((_, i) => !next[i]);
      next[emptySlot === -1 ? next.length : emptySlot] = newTile;
      return next;
    });
    setAdding(false);
    toast.success(`${kind === "photo" ? "Photo" : kind === "text" ? "Note" : "Audio"} added to mosaic`);
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
            role="dialog" aria-label="Mosaic Stories"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-secondary/20 border border-accent/40 flex items-center justify-center shrink-0">
                <LayoutGrid className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Mosaic Stories</div>
                <div className="text-[11px] text-muted-foreground">{tiles.length}/16 tiles · 8 contributors · collaborative</div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Auto-create</span>
                <Switch checked={autoCreate} onCheckedChange={(v) => { setAutoCreate(v); toast(v ? "Auto-create on" : "Auto-create off"); }} aria-label="Auto-create mosaic" />
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* 4×4 grid */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Mosaic · {tiles.length}/16 tiles</span>
                  <span className="text-secondary">Friday Café Crawlers</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const tile = tiles[i];
                    if (!tile) {
                      return (
                        <button key={i} onClick={() => setAdding(true)}
                          className="aspect-square rounded-xl border-2 border-dashed border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition">
                          <Plus className="w-4 h-4" />
                        </button>
                      );
                    }
                    return (
                      <motion.button key={tile.id} layout
                        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toast(`${tile.author}: ${tile.caption}`)}
                        className={cn("aspect-square rounded-xl border bg-gradient-to-br relative overflow-hidden flex flex-col items-center justify-center text-center p-1", tile.tint)}>
                        <span className="text-[9px] uppercase tracking-widest text-foreground/60">{tile.kind}</span>
                        <span className="text-base font-display text-foreground/70">{tile.initial}</span>
                        <span className="text-[8px] text-muted-foreground line-clamp-1 mt-0.5">{tile.caption}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              {/* Add-tile menu */}
              <AnimatePresence>
                {adding && (
                  <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-2xl border border-border/60 bg-card p-3 space-y-2">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Add a tile</div>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => addTile("photo")} className="rounded-xl px-2 py-2.5 text-[11px] flex flex-col items-center gap-1 border bg-muted/30 border-border/50 hover:bg-muted/60">
                          <LayoutGrid className="w-4 h-4 text-secondary" /> Photo
                        </button>
                        <button onClick={() => addTile("text")} className="rounded-xl px-2 py-2.5 text-[11px] flex flex-col items-center gap-1 border bg-muted/30 border-border/50 hover:bg-muted/60">
                          <Plus className="w-4 h-4 text-accent" /> Note
                        </button>
                        <button onClick={() => addTile("audio")} className="rounded-xl px-2 py-2.5 text-[11px] flex flex-col items-center gap-1 border bg-muted/30 border-border/50 hover:bg-muted/60">
                          <Sparkles className="w-4 h-4 text-primary" /> Audio
                        </button>
                      </div>
                      {autoCreate && (
                        <button onClick={() => { toast.success("Cirkle AI suggested a tile from yesterday's café visit"); setAdding(false); }}
                          className="w-full rounded-xl bg-gradient-to-br from-secondary/15 to-transparent border border-secondary/40 py-2 text-xs flex items-center justify-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-secondary" /> Let Cirkle AI suggest a tile
                        </button>
                      )}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Contributors */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> 8 contributors
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CONTRIBUTORS.map((c) => (
                    <div key={c.name} className="rounded-xl border border-border/60 bg-card px-3 py-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-mesh text-primary-foreground flex items-center justify-center text-[10px]">{c.name[0]}</div>
                      <span className="text-xs flex-1 truncate">{c.name}</span>
                      <span className={cn("text-[11px] font-medium", c.tint)}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex gap-2">
                <button onClick={() => setAdding(true)} className="flex-1 rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Add tile
                </button>
                <button onClick={() => { toast.success("Mosaic shared to your Circle"); onClose(); }}
                  className="px-4 rounded-xl bg-gradient-gold text-charcoal py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

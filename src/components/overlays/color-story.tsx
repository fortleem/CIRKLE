"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Palette, Sparkles, Copy, Download, RefreshCw, Upload, Heart, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface Swatch { name: string; hex: string; }

const PALETTES: { name: string; mood: string; swatches: Swatch[] }[] = [
  { name: "Golden Dunes", mood: "Warm · earthy", swatches: [
    { name: "Sand", hex: "#C2A060" }, { name: "Ember", hex: "#C06070" }, { name: "Date", hex: "#7B3F00" }, { name: "Sky", hex: "#4A6A8A" }, { name: "Cream", hex: "#FDFCF9" },
  ]},
  { name: "Desert Night", mood: "Calm · mysterious", swatches: [
    { name: "Midnight", hex: "#1A1A14" }, { name: "Plum", hex: "#4A2A3A" }, { name: "Gold Star", hex: "#E5C46E" }, { name: "Rose Dust", hex: "#A07080" }, { name: "Moon", hex: "#F0EBD8" },
  ]},
  { name: "Oasis", mood: "Fresh · serene", swatches: [
    { name: "Palm", hex: "#3A5A40" }, { name: "Spring", hex: "#1A4A5A" }, { name: "Citrus", hex: "#E5A04A" }, { name: "Reed", hex: "#8B9D77" }, { name: "Sandbar", hex: "#E8DCC4" },
  ]},
  { name: "Coral Reef", mood: "Vibrant · playful", swatches: [
    { name: "Coral", hex: "#E57363" }, { name: "Tide", hex: "#4A8A9A" }, { name: "Sunlight", hex: "#F4D35E" }, { name: "Kelp", hex: "#3D5A40" }, { name: "Foam", hex: "#FDFCF9" },
  ]},
];

const TEMPLATES = [
  { k: "story", label: "Story", emoji: "📱", desc: "9:16 with palette gradient top + bottom bar" },
  { k: "grid", label: "Grid", emoji: "🔲", desc: "3×3 grid · each cell a swatch with caption" },
  { k: "poster", label: "Poster", emoji: "🖼️", desc: "Centered hero text · swatches as accent strip" },
];

export function ColorStory({ open, onClose }: Props) {
  const [stage, setStage] = useState<"upload" | "palette" | "template" | "publish">("upload");
  const [selected, setSelected] = useState(0);
  const [template, setTemplate] = useState("story");
  const [generating, setGenerating] = useState(false);
  const [customizing, setCustomizing] = useState(false);

  const regenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setSelected((s) => (s + 1) % PALETTES.length);
      setGenerating(false);
      toast.success("Palette extracted", { description: PALETTES[(selected + 1) % PALETTES.length].name });
    }, 900);
  };

  const palette = PALETTES[selected];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Color Story"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-secondary/20 border border-accent/40 flex items-center justify-center shrink-0">
                <Palette className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Color Story</div>
                <div className="text-[11px] text-muted-foreground">{stage === "upload" ? "Upload a photo" : stage === "palette" ? "AI palette extraction" : stage === "template" ? "Pick a template" : "Publish"} · on-device</div>
              </div>
              {stage === "palette" && (
                <button onClick={regenerate} disabled={generating} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Regenerate"><RefreshCw className={cn("w-4 h-4", generating && "animate-spin")} /></button>
              )}
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Stage chips */}
              <div className="flex items-center gap-1.5 text-[10px]">
                {(["upload", "palette", "template", "publish"] as const).map((s, i) => (
                  <div key={s} className="flex-1 flex items-center gap-1.5">
                    <span className={cn("w-5 h-5 rounded-full flex items-center justify-center border text-[9px]",
                      stage === s ? "bg-accent text-accent-foreground border-accent" : "bg-muted/40 border-border/50 text-muted-foreground")}>{i + 1}</span>
                    <span className={cn("capitalize", stage === s ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                  </div>
                ))}
              </div>

              {stage === "upload" && (
                <section className="rounded-2xl border border-border/60 bg-card p-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent/30 to-secondary/20 border border-accent/40 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-accent" />
                  </div>
                  <div className="font-display text-lg">Upload a photo</div>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">Cirkle AI extracts a 5-color palette from your photo on-device. The image never leaves your phone.</p>
                  <div className="grid grid-cols-4 gap-1.5 max-w-xs mx-auto">
                    {[0, 1, 2, 3].map((i) => (
                      <button key={i} onClick={() => { setSelected(i % PALETTES.length); setStage("palette"); }}
                        className={cn("aspect-square rounded-lg border bg-gradient-to-br", PALETTES[i % PALETTES.length].swatches.map((s) => `bg-["${s.hex}"]`).join(" "))}>
                        <div className={cn("w-full h-full rounded-lg bg-gradient-to-br opacity-90",
                          i === 0 ? "from-secondary to-accent" : i === 1 ? "from-charcoal to-secondary" : i === 2 ? "from-emerald to-secondary" : "from-accent to-secondary")} />
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setGenerating(true); setTimeout(() => { setGenerating(false); setStage("palette"); }, 800); }}
                    className="px-4 py-2 rounded-full bg-gradient-hero text-cream text-sm flex items-center gap-2 mx-auto">
                    <Sparkles className="w-4 h-4" /> Extract palette
                  </button>
                </section>
              )}

              {stage === "palette" && (
                <motion.section key={selected} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-lg">{palette.name}</div>
                      <div className="text-xs text-muted-foreground">{palette.mood}</div>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-secondary flex items-center gap-1"><Sparkles className="w-3 h-3" /> 5 colors</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {palette.swatches.map((sw) => (
                      <button key={sw.hex} onClick={() => { navigator.clipboard?.writeText(sw.hex); toast.success(`Copied ${sw.hex}`); }}
                        className="aspect-square rounded-xl relative group overflow-hidden border border-foreground/10" style={{ background: sw.hex }}>
                        <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-charcoal/70 text-cream text-[9px] font-mono opacity-0 group-hover:opacity-100 transition">
                          {sw.hex}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {palette.swatches.map((sw) => (
                      <div key={sw.name} className="flex items-center gap-2 text-xs">
                        <div className="w-4 h-4 rounded shrink-0 border border-foreground/10" style={{ background: sw.hex }} />
                        <span className="flex-1">{sw.name}</span>
                        <span className="font-mono text-muted-foreground">{sw.hex}</span>
                        <button onClick={() => { navigator.clipboard?.writeText(sw.hex); toast.success(`Copied ${sw.hex}`); }} className="w-6 h-6 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Copy"><Copy className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setStage("template")} className="w-full rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                    Pick a template <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.section>
              )}

              {stage === "template" && (
                <section className="space-y-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">3 templates</div>
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPLATES.map((t) => (
                      <button key={t.k} onClick={() => setTemplate(t.k)}
                        className={cn("rounded-xl px-2 py-2.5 text-[10px] flex flex-col items-center gap-1 border transition text-start",
                          template === t.k ? "bg-accent/15 border-accent/60 text-accent" : "bg-muted/30 border-border/50 hover:bg-muted/60")}>
                        <span className="text-lg">{t.emoji}</span> {t.label}
                      </button>
                    ))}
                  </div>
                  {/* Template preview */}
                  <div className="rounded-2xl border border-border/60 bg-card p-4">
                    {template === "story" && (
                      <div className="aspect-[9/16] max-w-[200px] mx-auto rounded-xl overflow-hidden relative flex flex-col"
                        style={{ background: `linear-gradient(180deg, ${palette.swatches[0].hex} 0%, ${palette.swatches[2].hex} 100%)` }}>
                        <div className="h-2" style={{ background: palette.swatches[1].hex }} />
                        <div className="flex-1 flex items-center justify-center text-cream font-display">{palette.name}</div>
                        <div className="flex h-3">
                          {palette.swatches.map((s) => <div key={s.hex} className="flex-1" style={{ background: s.hex }} />)}
                        </div>
                      </div>
                    )}
                    {template === "grid" && (
                      <div className="grid grid-cols-3 gap-1 max-w-[200px] mx-auto">
                        {palette.swatches.concat(palette.swatches.slice(0, 4)).map((s, i) => (
                          <div key={i} className="aspect-square rounded" style={{ background: s.hex }}>
                            <div className="text-[8px] text-cream/80 p-1 font-mono">{s.hex.slice(1)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {template === "poster" && (
                      <div className="aspect-video rounded-xl overflow-hidden relative flex flex-col"
                        style={{ background: palette.swatches[1].hex }}>
                        <div className="flex-1 flex items-center justify-center font-display text-xl text-cream">{palette.name}</div>
                        <div className="flex h-3">
                          {palette.swatches.map((s) => <div key={s.hex} className="flex-1" style={{ background: s.hex }} />)}
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setCustomizing(true)} className="w-full rounded-xl glass py-2.5 text-sm flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> Customize
                  </button>
                  <button onClick={() => setStage("publish")} className="w-full rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </section>
              )}

              {stage === "publish" && (
                <section className="space-y-3">
                  <div className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/15 to-transparent p-4 text-center">
                    <Heart className="w-8 h-8 mx-auto text-accent mb-2 fill-current" />
                    <div className="font-display text-lg">{palette.name}</div>
                    <div className="text-xs text-muted-foreground">{palette.mood} · {template} template</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => toast.success("Published to Lamahat")} className="px-3 py-2 rounded-full bg-gradient-gold text-charcoal text-xs flex items-center justify-center gap-1"><Heart className="w-3.5 h-3.5" /> Publish</button>
                    <button onClick={() => toast.success("Exported as .ase · .svg · .json")} className="px-3 py-2 rounded-full glass text-xs flex items-center justify-center gap-1"><Download className="w-3.5 h-3.5" /> Export</button>
                  </div>
                </section>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

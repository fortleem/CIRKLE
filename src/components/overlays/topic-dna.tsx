"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Dna, Sparkles, Share2, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface Trait {
  k: string; label: string; weight: number; color: string;
}

interface Post {
  id: number; author: string; handle: string; body: string; traits: Trait[];
}

const TRAIT_COLORS: Record<string, string> = {
  reflective: "hsl(195 56% 33%)",
  playful: "hsl(351 41% 56%)",
  analytical: "hsl(211 30% 42%)",
  nostalgic: "hsl(39 45% 57%)",
  contrarian: "hsl(60 8% 30%)",
  poetic: "hsl(351 41% 46%)",
};

const SAMPLE_POSTS: Post[] = [
  { id: 1, author: "User", handle: "@layla", body: "Drove past the old house today. The palm tree is taller than I remember.",
    traits: [
      { k: "reflective", label: "Reflective", weight: 80, color: TRAIT_COLORS.reflective },
      { k: "nostalgic", label: "Nostalgic", weight: 70, color: TRAIT_COLORS.nostalgic },
      { k: "poetic", label: "Poetic", weight: 50, color: TRAIT_COLORS.poetic },
    ]},
  { id: 2, author: "User", handle: "@omar", body: "Hot take: shawarma > kabsa and I will die on this hill.",
    traits: [
      { k: "contrarian", label: "Contrarian", weight: 90, color: TRAIT_COLORS.contrarian },
      { k: "playful", label: "Playful", weight: 70, color: TRAIT_COLORS.playful },
    ]},
  { id: 3, author: "User", handle: "@sara", body: "Spent 3h reading the new privacy policy. Section 4.2 is doing something interesting with federated attestation.",
    traits: [
      { k: "analytical", label: "Analytical", weight: 95, color: TRAIT_COLORS.analytical },
      { k: "reflective", label: "Reflective", weight: 40, color: TRAIT_COLORS.reflective },
    ]},
  { id: 4, author: "User", handle: "@khalid", body: "Friday ride along the Corniche. The wind smelled like salt and cardamom.",
    traits: [
      { k: "poetic", label: "Poetic", weight: 85, color: TRAIT_COLORS.poetic },
      { k: "nostalgic", label: "Nostalgic", weight: 60, color: TRAIT_COLORS.nostalgic },
      { k: "reflective", label: "Reflective", weight: 50, color: TRAIT_COLORS.reflective },
    ]},
  { id: 5, author: "Noura", handle: "@noura", body: "Counterpoint: hybrid work only works if you trust your team. Most managers don't.",
    traits: [
      { k: "contrarian", label: "Contrarian", weight: 80, color: TRAIT_COLORS.contrarian },
      { k: "analytical", label: "Analytical", weight: 70, color: TRAIT_COLORS.analytical },
    ]},
];

const YOUR_DNA: Trait[] = [
  { k: "reflective", label: "Reflective", weight: 72, color: TRAIT_COLORS.reflective },
  { k: "nostalgic", label: "Nostalgic", weight: 65, color: TRAIT_COLORS.nostalgic },
  { k: "poetic", label: "Poetic", weight: 58, color: TRAIT_COLORS.poetic },
  { k: "playful", label: "Playful", weight: 45, color: TRAIT_COLORS.playful },
  { k: "analytical", label: "Analytical", weight: 40, color: TRAIT_COLORS.analytical },
  { k: "contrarian", label: "Contrarian", weight: 22, color: TRAIT_COLORS.contrarian },
];

function DNAHelix({ traits, side }: { traits: Trait[]; side: "left" | "right" }) {
  const total = traits.reduce((s, t) => s + t.weight, 0) || 1;
  const segments = traits.length;
  return (
    <div className="flex flex-col gap-1 h-full">
      {traits.map((t, i) => (
        <motion.div key={t.k}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          style={{ background: t.color, height: `${(t.weight / total) * 100}%`, transformOrigin: side === "left" ? "left" : "right" }}
          className={cn("rounded-sm relative", side === "right" && "self-end")}
          aria-label={`${t.label} ${t.weight}%`}>
          <span className={cn("absolute top-1 text-[8px] text-cream/90 font-mono whitespace-nowrap", side === "left" ? "left-1" : "right-1")}>
            {t.label}
          </span>
        </motion.div>
      ))}
      {/* connector rungs */}
      <div className="absolute inset-y-0 right-0 w-px bg-border" />
      {Array.from({ length: segments - 1 }).map((_, i) => (
        <div key={i} className="h-px bg-border/40" style={{ marginTop: `${100 / segments}%` }} />
      ))}
    </div>
  );
}

export function TopicDNA({ open, onClose }: Props) {
  const [active, setActive] = useState<number>(0);
  const post = SAMPLE_POSTS[active];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Topic DNA"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-primary/40 flex items-center justify-center shrink-0">
                <Dna className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Topic DNA</div>
                <div className="text-[11px] text-muted-foreground">Each post has a DNA · your feed has its own · you have yours</div>
              </div>
              <button onClick={() => toast.success("DNA profile shared to your profile")} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Share"><Share2 className="w-4 h-4" /></button>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Vertical DNA strands */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary" /> Sample post DNA strands
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {SAMPLE_POSTS.map((p, i) => (
                    <button key={p.id} onClick={() => setActive(i)}
                      className={cn("rounded-xl border p-1.5 transition flex flex-col items-center gap-1",
                        active === i ? "border-primary/60 bg-primary/5" : "border-border/50 bg-card hover:bg-muted/40")}>
                      <div className="flex gap-0.5 h-12">
                        <div className="flex flex-col gap-0.5">
                          {p.traits.slice(0, 3).map((t) => (
                            <div key={t.k} className="w-1.5 rounded-sm" style={{ background: t.color, height: `${t.weight * 0.4}px` }} />
                          ))}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {p.traits.slice(0, 3).map((t) => (
                            <div key={t.k} className="w-1.5 rounded-sm self-end" style={{ background: t.color, height: `${t.weight * 0.4}px`, opacity: 0.6 }} />
                          ))}
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground truncate w-full text-center">{p.author}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Active post detail */}
              <AnimatePresence mode="wait">
                <motion.section key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-mesh text-primary-foreground flex items-center justify-center text-xs">{post.author[0]}</div>
                    <span className="text-sm font-medium">{post.author}</span>
                    <span className="text-[11px] text-muted-foreground">{post.handle}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{post.body}</p>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
                    {post.traits.map((t) => (
                      <span key={t.k} className="text-[10px] px-2 py-0.5 rounded-full text-cream font-medium"
                        style={{ background: t.color }}>
                        {t.label} · {t.weight}%
                      </span>
                    ))}
                  </div>
                </motion.section>
              </AnimatePresence>

              {/* Feed DNA strip */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Feed DNA strip · last 7 days</div>
                <div className="rounded-2xl border border-border/60 bg-card p-3">
                  <div className="flex gap-0.5 h-8">
                    {SAMPLE_POSTS.concat(SAMPLE_POSTS).slice(0, 14).map((p, i) => (
                      <motion.div key={i}
                        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.05 }}
                        className="flex-1 rounded-sm relative"
                        style={{ background: p.traits[0].color, opacity: 0.6 + (p.traits[0].weight / 200) }}>
                        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] text-muted-foreground">{p.author[0]}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-6 text-[10px] text-muted-foreground">
                    Feed dominant: <span className="text-secondary">Reflective 38%</span> · <span className="text-accent">Nostalgic 24%</span> · <span className="text-primary">Analytical 18%</span>
                  </div>
                </div>
              </section>

              {/* Your DNA profile */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Your DNA profile</span>
                  <button onClick={() => toast.success("DNA profile rebuilt from your last 50 posts")} className="text-secondary flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Rebuild
                  </button>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                    <div className="flex flex-col gap-1">
                      {YOUR_DNA.map((t, i) => (
                        <motion.div key={t.k}
                          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.08 }}
                          style={{ background: t.color, height: "14px", transformOrigin: "left" }}
                          className="rounded-sm flex items-center pl-1.5">
                          <span className="text-[9px] text-cream/90 font-mono">{t.label}</span>
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-0.5 h-full justify-center">
                      {YOUR_DNA.map((_, i) => <div key={i} className="w-3 h-px bg-border" />)}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {YOUR_DNA.map((t, i) => (
                        <motion.div key={t.k}
                          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.08 }}
                          style={{ background: t.color, height: "14px", transformOrigin: "right", opacity: 0.6 }}
                          className="rounded-sm flex items-center justify-end pr-1.5">
                          <span className="text-[9px] text-cream/90 font-mono">{t.weight}%</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <button onClick={() => { toast.success("DNA filter applied to your feed"); onClose(); }}
                className="w-full rounded-xl bg-gradient-gold text-charcoal py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                Apply DNA filter to my feed <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

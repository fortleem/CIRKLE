"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Sparkles, Coins, TrendingUp, Heart, Bookmark } from "lucide-react";
import { CircleMark } from "@/components/brand/circle-mark";
import { toast } from "sonner";
interface Props { open: boolean; onClose: () => void; }
const CREATIONS = [
  { emoji: "🌅", title: "Golden Hour at AlUla", creator: "Dunes Studio", price: 5, collectors: 142, earned: 710, tint: "from-secondary/30 to-accent/20" },
  { emoji: "🎬", title: "Riyadh Season Journey", creator: "Riyadh Daily", price: 12, collectors: 89, earned: 1068, tint: "from-accent/30 to-secondary/20" },
  { emoji: "📄", title: "Future of Saudi Tech", creator: "Tech Oasis", price: 3, collectors: 234, earned: 702, tint: "from-steel/30 to-secondary/20" },
];
export function CirkleMint({ open, onClose }: Props) {
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [earnings] = useState(2480);
  return (
    <AnimatePresence>{open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-background overflow-y-auto">
        <div className="fixed inset-0 aurora-bg opacity-25 pointer-events-none" />
        <div className="sticky top-0 z-20 glass-strong border-b border-border/40 px-6 pt-[env(safe-area-inset-top)] pb-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-3"><CircleMark size={36} /><div><h2 className="font-display text-xl gradient-text-gold">CirkleMint</h2><p className="text-[10px] text-muted-foreground uppercase tracking-widest">Creator economy · 0% fees</p></div></div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-6 py-6 pb-32">
          <div className="glass-strong rounded-3xl p-6 mb-6"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Your earnings</p><p className="font-display text-4xl gradient-text-gold mt-1">{earnings.toLocaleString()} <span className="text-lg">SAR</span></p></div><div className="glass rounded-full px-3 py-1.5 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs">+18%</span></div></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CREATIONS.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-strong rounded-2xl overflow-hidden border border-border/40">
                <div className={`aspect-video bg-gradient-to-br ${c.tint} flex items-center justify-center`}><span className="text-5xl">{c.emoji}</span><div className="absolute top-2 right-2 glass rounded-full px-2 py-0.5"><span className="text-[10px] font-bold flex items-center gap-1"><Coins className="w-3 h-3 text-secondary" />{c.price} SAR</span></div></div>
                <div className="p-4"><h3 className="font-display text-base">{c.title}</h3><div className="flex items-center gap-2 mt-2"><div className="w-7 h-7 rounded-full bg-gradient-hero flex items-center justify-center text-[10px] text-primary-foreground">{c.creator[0]}</div><span className="text-xs text-muted-foreground">{c.creator}</span></div>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><Heart className="w-3 h-3" />{c.collectors}</span><span className="flex items-center gap-1"><Coins className="w-3 h-3 text-secondary" />{c.earned} SAR</span></div>
                  <button onClick={() => { const n = new Set(collected); if (n.has(c.title)) { n.delete(c.title); } else { n.add(c.title); } setCollected(n); if (!collected.has(c.title)) toast.success(`Collected "${c.title}"`, { description: `${c.price} SAR sent to ${c.creator}` }); }} className={`w-full mt-3 py-2.5 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition ${collected.has(c.title) ? "bg-secondary/20 text-secondary border border-secondary/40" : "bg-gradient-gold text-charcoal hover:scale-105"}`}>{collected.has(c.title) ? <><Bookmark className="w-3.5 h-3.5" /> Collected</> : <><Coins className="w-3.5 h-3.5" /> Collect for {c.price} SAR</>}</button>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 glass rounded-2xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center shrink-0"><Coins className="w-5 h-5 text-primary-foreground" /></div><div><p className="text-xs font-medium">How CirkleMint works</p><p className="text-[10px] text-muted-foreground">Creators mint content. Fans collect. 0% platform fees. Ever.</p></div></div>
        </div>
      </motion.div>
    )}</AnimatePresence>
  );
}

"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Users, Sparkles, RefreshCw, Check } from "lucide-react";
import { CircleMark } from "@/components/brand/circle-mark";
import { toast } from "sonner";
interface Props { open: boolean; onClose: () => void; }
const STRANDS = [
  { name: "Interests", score: 87, color: "from-secondary to-secondary/60" },
  { name: "Communication", score: 72, color: "from-accent to-accent/60" },
  { name: "Emotional", score: 65, color: "from-primary to-primary/60" },
  { name: "Social Reach", score: 91, color: "from-secondary to-accent/60" },
  { name: "Content Taste", score: 78, color: "from-steel to-steel/60" },
  { name: "Trust Score", score: 95, color: "from-secondary to-primary/60" },
];
export function CirkleDNA({ open, onClose }: Props) {
  return (
    <AnimatePresence>{open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-background overflow-y-auto">
        <div className="fixed inset-0 aurora-bg opacity-20 pointer-events-none" />
        <div className="sticky top-0 z-20 glass-strong border-b border-border/40 px-6 pt-[env(safe-area-inset-top)] pb-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-3"><CircleMark size={36} /><div><h2 className="font-display text-xl gradient-text-gold">CirkleDNA</h2><p className="text-[10px] text-muted-foreground uppercase tracking-widest">Your living social genome</p></div></div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="relative max-w-2xl mx-auto px-6 py-6 pb-32">
          <div className="text-center mb-6">
            <p className="text-2xl font-display gradient-text-gold">Genome Integrity: 94%</p>
            <p className="text-[10px] text-muted-foreground mt-1">Based on 247 interactions · Updates daily · 100% on-device</p>
          </div>
          <div className="space-y-3 mb-6">
            {STRANDS.map((s, i) => (
              <motion.div key={s.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="glass-strong rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">{s.name}</span><span className="text-lg font-display gradient-text-gold">{s.score}%</span></div>
                <div className="h-2 rounded-full bg-muted overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${s.score}%` }} transition={{ delay: i * 0.1 + 0.3, duration: 0.8 }} className={`h-full rounded-full bg-gradient-to-r ${s.color}`} /></div>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => toast.success("DNA card saved to photos")} className="py-3 rounded-full bg-gradient-gold text-charcoal text-sm font-medium flex items-center justify-center gap-2 hover:scale-105 transition"><Share2 className="w-4 h-4" /> Share DNA Card</button>
            <button onClick={() => toast.info("Select a friend to compare DNA")} className="py-3 rounded-full bg-gradient-hero text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:scale-105 transition"><Users className="w-4 h-4" /> Compare</button>
          </div>
        </div>
      </motion.div>
    )}</AnimatePresence>
  );
}

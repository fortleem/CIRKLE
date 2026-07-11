"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Check, Sparkles } from "lucide-react";
import { CircleMark } from "@/components/brand/circle-mark";
import { toast } from "sonner";
interface Props { open: boolean; onClose: () => void; }
const MOODS = [
  { emoji: "😊", name: "Happy", desc: "Brighten your feed with joy", tint: "from-secondary/30 to-secondary/5" },
  { emoji: "😌", name: "Calm", desc: "Soft, slow, gentle content", tint: "from-primary/30 to-primary/5" },
  { emoji: "🤩", name: "Excited", desc: "High energy, bold visuals", tint: "from-accent/30 to-accent/5" },
  { emoji: "😔", name: "Reflective", desc: "Thoughtful, deep reads", tint: "from-steel/30 to-steel/5" },
  { emoji: "😴", name: "Tired", desc: "Easy scroll, no heavy news", tint: "from-charcoal/30 to-charcoal/5" },
  { emoji: "🎉", name: "Social", desc: "Connect with friends", tint: "from-secondary/30 to-accent/5" },
];
export function CirkleMood({ open, onClose }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <AnimatePresence>{open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-background overflow-y-auto">
        <div className="fixed inset-0 aurora-bg opacity-20 pointer-events-none" />
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"><X className="w-5 h-5" /></button>
        <div className="max-w-lg mx-auto px-6 py-12">
          <div className="text-center mb-8"><CircleMark size={56} /><h2 className="font-display text-2xl mt-4">How are you feeling?</h2></div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {MOODS.map((m, i) => (
              <motion.button key={m.name} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => setSelected(i)}
                className={`relative rounded-2xl p-5 border transition ${selected === i ? "border-secondary/60 bg-secondary/10" : "border-border/60 bg-card hover:bg-muted/40"}`}>
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${m.tint} opacity-50`} />
                <div className="relative"><div className="text-4xl mb-2">{m.emoji}</div><div className="text-sm font-medium">{m.name}</div><div className="text-[10px] text-muted-foreground mt-1">{m.desc}</div></div>
                {selected === i && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-secondary flex items-center justify-center"><Check className="w-4 h-4 text-secondary-foreground" /></div>}
              </motion.button>
            ))}
          </div>
          {selected !== null && (
            <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => { toast.success(`${MOODS[selected].name} mood applied`, { description: MOODS[selected].desc }); onClose(); }}
              className="w-full py-3.5 rounded-full bg-gradient-gold text-charcoal text-sm font-medium flex items-center justify-center gap-2 hover:scale-105 transition shadow-glow">
              <Sparkles className="w-4 h-4" /> Apply to Cirkle
            </motion.button>
          )}
        </div>
      </motion.div>
    )}</AnimatePresence>
  );
}

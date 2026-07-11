"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Clock, Send, Sun, CloudRain, ChevronLeft } from "lucide-react";
import { CircleMark } from "@/components/brand/circle-mark";
import { toast } from "sonner";
interface Props { open: boolean; onClose: () => void; }
const SAMPLE = [
  { id: "t1", to: "User 🌙", preview: "Read this when you wake up...", arrival: "Arrives in 8h", condition: "☀️ Only if sunny" },
  { id: "t2", to: "User", preview: "Tomorrow's brief — see you at 9", arrival: "Arrives in 18h", condition: "No condition" },
  { id: "t3", to: "Noura", preview: "Happy birthday! 🎉", arrival: "Arrived 2d ago", condition: "Delivered ✓" },
];
export function CirkleTime({ open, onClose }: Props) {
  const [view, setView] = useState<"scheduled" | "compose">("scheduled");
  return (
    <AnimatePresence>{open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-background overflow-y-auto">
        <div className="fixed inset-0 aurora-bg opacity-20 pointer-events-none" />
        <div className="sticky top-0 z-20 glass-strong border-b border-border/40 px-6 pt-[env(safe-area-inset-top)] pb-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-3"><CircleMark size={36} /><div><h2 className="font-display text-xl gradient-text-gold">CirkleTime</h2><p className="text-[10px] text-muted-foreground uppercase tracking-widest">Time-shifted messaging</p></div></div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-6 py-6 pb-32">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setView("scheduled")} className={`px-4 py-2 rounded-full text-xs font-medium ${view === "scheduled" ? "bg-gradient-hero text-primary-foreground" : "glass text-muted-foreground"}`}>⏰ Scheduled ({SAMPLE.length})</button>
            <button onClick={() => setView("compose")} className={`px-4 py-2 rounded-full text-xs font-medium ${view === "compose" ? "bg-gradient-hero text-primary-foreground" : "glass text-muted-foreground"}`}>✨ Compose</button>
          </div>
          {view === "scheduled" ? (
            <div className="space-y-3">{SAMPLE.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-strong rounded-2xl p-4">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-sm text-primary-foreground">{m.to[0]}</div><div className="flex-1 min-w-0"><div className="text-sm font-medium">{m.to}</div><div className="text-xs text-muted-foreground italic">"{m.preview}"</div></div></div>
                <div className="flex items-center gap-2 mt-2"><span className="text-[10px] glass px-2 py-0.5 rounded-full">{m.arrival}</span><span className="text-[10px] glass px-2 py-0.5 rounded-full">{m.condition}</span></div>
              </motion.div>
            ))}</div>
          ) : (
            <div className="space-y-4">
              <textarea placeholder="Write your message..." className="w-full glass rounded-2xl p-4 text-sm outline-none focus:ring-1 focus:ring-secondary/40 min-h-[120px]" />
              <input type="datetime-local" className="w-full glass rounded-xl px-3 py-2.5 text-sm outline-none" />
              <div className="grid grid-cols-4 gap-2">
                {[{ icon: Sun, label: "☀️ Sunny" }, { icon: CloudRain, label: "🌧️ Raining" }, { icon: Clock, label: "No condition" }].map(c => (
                  <button key={c.label} className="glass rounded-xl p-2 text-[10px] flex flex-col items-center gap-1 hover:bg-muted/40 transition"><c.icon className="w-4 h-4 text-secondary" />{c.label}</button>
                ))}
              </div>
              <button onClick={() => { toast.success("Message scheduled!"); setView("scheduled"); }} className="w-full py-3 rounded-full bg-gradient-gold text-charcoal text-sm font-medium flex items-center justify-center gap-2 hover:scale-105 transition"><Send className="w-4 h-4" /> Schedule Message</button>
            </div>
          )}
        </div>
      </motion.div>
    )}</AnimatePresence>
  );
}

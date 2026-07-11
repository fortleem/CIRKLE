"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Shield, ShieldCheck, MapPin, Clock, AlertTriangle, Navigation } from "lucide-react";
import { CircleMark } from "@/components/brand/circle-mark";
import { toast } from "sonner";
interface Props { open: boolean; onClose: () => void; }
const ALERTS = [
  { type: "incident", icon: AlertTriangle, title: "Traffic incident on King Fahd Rd", loc: "Riyadh · 10m ago", severity: "high" },
  { type: "hazard", icon: AlertTriangle, title: "Pothole causing accidents", loc: "Jeddah · 1h ago", severity: "medium" },
  { type: "weather", icon: Clock, title: "Dust storm advisory", loc: "Riyadh · 2h ago", severity: "high" },
];
export function CirkleShield({ open, onClose }: Props) {
  const [walking, setWalking] = useState(false);
  return (
    <AnimatePresence>{open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-background overflow-y-auto">
        <div className="fixed inset-0 aurora-bg opacity-20 pointer-events-none" />
        <div className="sticky top-0 z-20 glass-strong border-b border-border/40 px-6 pt-[env(safe-area-inset-top)] pb-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-3"><CircleMark size={36} /><div><h2 className="font-display text-xl gradient-text-gold">CirkleShield</h2><p className="text-[10px] text-muted-foreground uppercase tracking-widest">Community safety network</p></div></div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-6 py-6 pb-32 space-y-4">
          <button onClick={() => toast.success("Safety broadcast sent to your Circle")} className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:scale-105 transition"><ShieldCheck className="w-5 h-5" /> I'm Safe — Broadcast to Circle</button>
          <div className="glass-strong rounded-2xl p-4">
            <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2"><Navigation className="w-4 h-4 text-secondary" /> Walk With Me</h3>
            {walking ? (
              <div className="text-center py-4"><div className="text-3xl mb-2">🟢</div><div className="text-sm font-medium">Your Circle is watching over you</div><div className="text-xs text-muted-foreground mt-1">Timer: 00:15:32</div><button onClick={() => { setWalking(false); toast.success("Arrived safely!"); }} className="mt-3 px-4 py-2 rounded-full bg-emerald-500 text-white text-xs">Arrived Safely</button></div>
            ) : (
              <div className="space-y-2"><input placeholder="Destination..." className="w-full glass rounded-xl px-3 py-2 text-sm outline-none" /><button onClick={() => { setWalking(true); toast.success("Your Circle is watching over you"); }} className="w-full py-2.5 rounded-full bg-gradient-hero text-primary-foreground text-xs font-medium">Start Safe Walk</button></div>
            )}
          </div>
          <div><h3 className="font-display text-sm font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-accent" /> Community Alerts</h3>{ALERTS.map((a, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`glass rounded-xl p-3 mb-2 border-l-2 ${a.severity === "high" ? "border-l-accent" : "border-l-secondary"}`}>
              <div className="flex items-center gap-2"><a.icon className={`w-4 h-4 ${a.severity === "high" ? "text-accent" : "text-secondary"}`} /><div className="flex-1"><div className="text-xs font-medium">{a.title}</div><div className="text-[10px] text-muted-foreground">{a.loc}</div></div></div>
            </motion.div>
          ))}</div>
        </div>
      </motion.div>
    )}</AnimatePresence>
  );
}

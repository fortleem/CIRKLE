"use client";
import { motion } from "framer-motion";
import { CircleMark } from "@/components/brand/circle-mark";

export function Splash() {
  return (
    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, filter: "blur(20px)" }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 aurora-bg opacity-70" />
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} className="absolute w-[140vw] h-[140vw] rounded-full opacity-30" style={{ background: "var(--gradient-mesh)", filter: "blur(100px)" } as any} />
      <motion.div initial={{ scale: 0.4, opacity: 0, filter: "blur(30px)" }} animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} className="relative"><CircleMark size={140} /></motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }} className="mt-10 text-center relative">
        <div className="font-display text-5xl gradient-text">Cirkle</div>
        <div className="text-[10px] tracking-[0.5em] uppercase text-muted-foreground mt-3">دواير · A new social OS</div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.5 }} className="absolute bottom-10 text-[10px] tracking-widest uppercase text-muted-foreground">free for everyone · forever</motion.div>
    </motion.div>
  );
}

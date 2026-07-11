"use client";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function AIOrb({ onClick }: { onClick?: () => void }) {
  return (
    <motion.button onClick={onClick} drag dragConstraints={{ top: -200, bottom: 0, left: -100, right: 100 }} whileTap={{ scale: 0.92 }} className="fixed bottom-24 right-4 z-40 group" aria-label="AI Assistant">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-mesh rounded-full blur-xl opacity-70 animate-spin-slow" />
        <div className="relative w-14 h-14 rounded-full bg-gradient-mesh animate-orb-float flex items-center justify-center shadow-float">
          <div className="absolute inset-0.5 rounded-full bg-background/30 backdrop-blur-md" />
          <Sparkles className="relative w-6 h-6 text-primary-foreground drop-shadow" />
        </div>
      </div>
    </motion.button>
  );
}

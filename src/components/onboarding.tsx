"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { CircleMark } from "@/components/brand/circle-mark";
import { useApp } from "@/lib/app-store";
import { dict } from "@/lib/i18n";
import { ChevronRight } from "lucide-react";

const slides = ["slide1", "slide2", "slide3", "slide4", "slide5"] as const;

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { locale, toggleLocale } = useApp();
  const t = dict[locale].onboarding;
  const [i, setI] = useState(0);
  const next = () => (i < slides.length - 1 ? setI(i + 1) : onDone());
  const slide = t[slides[i]];
  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-hidden">
      <div className="absolute inset-0 aurora-bg" />
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 80, repeat: Infinity, ease: "linear" }} className="absolute -top-32 -left-32 w-[120vw] h-[120vw] rounded-full opacity-20" style={{ background: "var(--gradient-mesh)", filter: "blur(80px)" } as any} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
      <div className="absolute top-0 inset-x-0 p-5 pt-[env(safe-area-inset-top)] flex items-center justify-between z-10">
        <button onClick={toggleLocale} className="text-xs glass px-3 py-1.5 rounded-full">{locale === "en" ? "العربية" : "English"}</button>
        <button onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground transition">{t.skip}</button>
      </div>
      <div className="relative h-full flex flex-col items-center justify-center px-8 text-center">
        <motion.div animate={{ scale: [1, 1.04, 1], rotate: [0, 4, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}><CircleMark size={140} /></motion.div>
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, y: 20, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -20, filter: "blur(10px)" }} transition={{ duration: 0.5 }} className="mt-10 max-w-md">
            <h2 className="font-display text-3xl leading-tight">{slide.title}</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
        <div className="absolute bottom-12 inset-x-0 flex flex-col items-center gap-6">
          <div className="flex gap-1.5">
            {slides.map((_, idx) => <button key={idx} onClick={() => setI(idx)} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-gold" : "w-1.5 bg-muted-foreground/30"}`} />)}
          </div>
          <button onClick={next} className="px-8 py-3 rounded-full bg-gradient-hero text-cream text-sm font-medium flex items-center gap-2 shadow-float">{i === slides.length - 1 ? t.cta : t.next}<ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

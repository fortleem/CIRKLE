"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Languages, Globe } from "lucide-react";
import { CircleMark } from "@/components/brand/circle-mark";
import { toast } from "sonner";
interface Props { open: boolean; onClose: () => void; }
const MSGS = [
  { flag: "🇸🇦", original: "السلام عليكم، كيف حالك؟", translated: "Peace be upon you, how are you?", source: "User", context: "Standard Arabic greeting used in formal and casual settings" },
  { flag: "🇨🇳", original: "你好，吃饭了吗？", translated: "Hello, have you eaten?", source: "Wei", context: "A common Chinese greeting showing care, not literally about food" },
  { flag: "🇪🇸", original: "¡Qué guay!", translated: "How cool!", source: "Carlos", context: "Spanish slang for 'awesome', used casually in Spain" },
  { flag: "🇫🇷", original: "Je suis au septième ciel", translated: "I'm in seventh heaven", source: "Marie", context: "French idiom meaning extremely happy" },
  { flag: "🇯🇵", original: "お疲れ様でした", translated: "Thank you for your hard work", source: "Yuki", context: "Japanese workplace phrase showing respect for effort" },
];
export function CirkleVerse({ open, onClose }: Props) {
  const [lang, setLang] = useState("English");
  return (
    <AnimatePresence>{open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-background overflow-y-auto">
        <div className="fixed inset-0 aurora-bg opacity-20 pointer-events-none" />
        <div className="sticky top-0 z-20 glass-strong border-b border-border/40 px-6 pt-[env(safe-area-inset-top)] pb-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-3"><CircleMark size={36} /><div><h2 className="font-display text-xl gradient-text-gold">CirkleVerse</h2><p className="text-[10px] text-muted-foreground uppercase tracking-widest">One universe · every language</p></div></div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-6 py-6 pb-32">
          <div className="flex items-center justify-between mb-4"><div className="text-xs text-muted-foreground">142 languages · 246 countries · 0 barriers</div><button onClick={() => setLang(lang === "English" ? "العربية" : "English")} className="text-xs glass rounded-full px-3 py-1.5 flex items-center gap-1"><Languages className="w-3 h-3" /> {lang}</button></div>
          <div className="space-y-3">{MSGS.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-strong rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><span className="text-xl">{m.flag}</span><span className="text-xs font-medium">{m.source}</span></div>
              <div className="text-sm font-arabic mb-1" dir="auto">{m.original}</div>
              <div className="flex items-center gap-1 text-[10px] text-secondary mb-1"><Languages className="w-3 h-3" /> → {lang}</div>
              <div className="text-sm text-muted-foreground">{m.translated}</div>
              <div className="mt-2 text-[10px] text-muted-foreground/70 italic border-t border-border/30 pt-2">💡 {m.context}</div>
            </motion.div>
          ))}</div>
        </div>
      </motion.div>
    )}</AnimatePresence>
  );
}

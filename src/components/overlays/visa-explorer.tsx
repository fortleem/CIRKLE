"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { X, Search, Globe, ChevronRight, Loader2 } from "lucide-react";
import { CircleMark } from "@/components/brand/circle-mark";
import { toast } from "sonner";
interface Props { open: boolean; onClose: () => void; passportCountry: string; }
interface Dest { code: string; name: string; flag: string; arabicName?: string; maxStayDays?: number; notes?: string; }
export function VisaExplorer({ open, onClose, passportCountry }: Props) {
  const [tab, setTab] = useState<"free" | "arrival" | "evisa">("free");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ visaFree: Dest[]; visaOnArrival: Dest[]; eVisa: Dest[] }>({ visaFree: [], visaOnArrival: [], eVisa: [] });
  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => setLoading(true));
    fetch(`/api/visa/free-destinations?passport=${passportCountry}`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [open, passportCountry]);
  const current = tab === "free" ? data.visaFree : tab === "arrival" ? data.visaOnArrival : data.eVisa;
  const filtered = search ? current.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase())) : current;
  return (
    <AnimatePresence>{open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-background overflow-y-auto">
        <div className="fixed inset-0 aurora-bg opacity-20 pointer-events-none" />
        <div className="sticky top-0 z-20 glass-strong border-b border-border/40 px-6 pt-[env(safe-area-inset-top)] pb-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-3"><CircleMark size={36} /><div><h2 className="font-display text-xl gradient-text-gold">Where can you go?</h2><p className="text-[10px] text-muted-foreground uppercase tracking-widest">Passport: {passportCountry}</p></div></div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-6 py-6 pb-32">
          <div className="flex gap-2 mb-4">
            {[{ k: "free" as const, label: "Visa Free", count: data.visaFree.length, color: "text-emerald-500" }, { k: "arrival" as const, label: "On Arrival", count: data.visaOnArrival.length, color: "text-secondary" }, { k: "evisa" as const, label: "E-Visa", count: data.eVisa.length, color: "text-accent" }].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-2 rounded-full text-xs font-medium transition ${tab === t.k ? "bg-gradient-hero text-primary-foreground" : "glass text-muted-foreground"}`}>{t.label} ({t.count})</button>
            ))}
          </div>
          <div className="relative mb-4"><Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search countries..." className="w-full glass rounded-full pl-9 pr-4 py-2 text-sm outline-none" /></div>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((d, i) => (
                <motion.button key={d.code} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }} onClick={() => toast.info(`${d.flag} ${d.name} — ${d.maxStayDays || 30} days max stay`)} className="glass-strong rounded-2xl p-4 text-center hover:scale-105 transition border border-border/40">
                  <div className="text-3xl mb-1">{d.flag}</div><div className="text-xs font-medium truncate">{d.name}</div>{d.arabicName && <div className="text-[9px] text-muted-foreground" dir="rtl">{d.arabicName}</div>}{d.maxStayDays && <div className="text-[9px] text-secondary mt-1">Up to {d.maxStayDays} days</div>}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    )}</AnimatePresence>
  );
}

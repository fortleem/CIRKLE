"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Search, ScanLine, Phone, Loader2, Check, UserPlus } from "lucide-react";
import { CircleMark } from "@/components/brand/circle-mark";
import { toast } from "sonner";
interface Props { open: boolean; onClose: () => void; }
export function AddContact({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const search = async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    try { const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(query)}`); if (res.ok) { const d = await res.json(); setResults(d.users || []); } } catch {}
    setLoading(false);
  };
  return (
    <AnimatePresence>{open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-background overflow-y-auto">
        <div className="fixed inset-0 aurora-bg opacity-20 pointer-events-none" />
        <div className="sticky top-0 z-20 glass-strong border-b border-border/40 px-6 pt-[env(safe-area-inset-top)] pb-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-3"><CircleMark size={36} /><div><h2 className="font-display text-xl gradient-text-gold">Add Contact</h2><p className="text-[10px] text-muted-foreground uppercase tracking-widest">Find people on Cirkle</p></div></div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="relative max-w-2xl mx-auto px-6 py-6 pb-32">
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search by @cirkle ID or name..." className="w-full glass rounded-full pl-10 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-secondary/40" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => toast.info("QR Scanner", { description: "Opening camera..." })} className="glass-strong rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-muted/30 transition border border-border/40">
              <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center"><ScanLine className="w-6 h-6 text-primary-foreground" /></div>
              <span className="text-xs font-medium">Scan QR Code</span><span className="text-[10px] text-muted-foreground">Scan a friend's code</span>
            </button>
            <button onClick={() => toast.info("Contact Sync", { description: "Syncing contacts..." })} className="glass-strong rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-muted/30 transition border border-border/40">
              <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center"><Phone className="w-6 h-6 text-charcoal" /></div>
              <span className="text-xs font-medium">Sync Contacts</span><span className="text-[10px] text-muted-foreground">Find friends by phone</span>
            </button>
          </div>
          {loading ? <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          : results.length > 0 ? <div className="space-y-2">{results.map((u) => (
            <div key={u.id || u.circleId} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-sm font-display text-primary-foreground">{u.displayName?.[0] || "?"}</div>
              <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{u.displayName}</div><div className="text-[10px] text-muted-foreground truncate">{u.circleId}</div></div>
              <button onClick={() => { setAdded(prev => new Set(prev).add(u.id)); toast.success(`Added ${u.displayName}`); }} disabled={added.has(u.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 shrink-0 ${added.has(u.id) ? "bg-emerald-500/15 text-emerald-500" : "bg-gradient-hero text-primary-foreground"}`}>
                {added.has(u.id) ? <><Check className="w-3 h-3" /> Added</> : <><UserPlus className="w-3 h-3" /> Add</>}
              </button>
            </div>))}</div>
          : <div className="glass rounded-2xl p-6 text-center"><p className="text-sm font-medium mb-1">Find your friends on Cirkle</p><p className="text-xs text-muted-foreground">Search by @cirkle ID, scan a QR code, or sync contacts.</p></div>}
        </div>
      </motion.div>
    )}</AnimatePresence>
  );
}

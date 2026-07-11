"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Swords, Sparkles, Check, ThumbsUp, ThumbsDown, Handshake, ChevronRight, Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface Arg { id: number; text: string; votes: number; }

const PRO_SEED: Arg[] = [
  { id: 1, text: "Remote work lets us hire across the region, not just one city.", votes: 142 },
  { id: 2, text: "No commute = 8 hours back per week for family.", votes: 88 },
  { id: 3, text: "Quiet focus time is easier at home for deep work.", votes: 64 },
];

const CON_SEED: Arg[] = [
  { id: 1, text: "Office serendipity — hallway chats don't happen on Zoom.", votes: 121 },
  { id: 2, text: "Onboarding new hires is harder without in-person shadowing.", votes: 79 },
  { id: 3, text: "Home internet in rural regions can't sustain video calls.", votes: 52 },
];

export function DebateArena({ open, onClose }: Props) {
  const [pro, setPro] = useState<Arg[]>(PRO_SEED);
  const [con, setCon] = useState<Arg[]>(CON_SEED);
  const [proInput, setProInput] = useState("");
  const [conInput, setConInput] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [compromise, setCompromise] = useState<string | null>(null);
  const [voted, setVoted] = useState<"pro" | "con" | "middle" | null>(null);

  const totalPro = pro.reduce((s, a) => s + a.votes, 0);
  const totalCon = con.reduce((s, a) => s + a.votes, 0);
  const total = totalPro + totalCon;
  const proPct = total > 0 ? Math.round((totalPro / total) * 100) : 50;
  const conPct = 100 - proPct;

  const addPro = () => {
    if (!proInput.trim()) return;
    setPro((p) => [...p, { id: Date.now(), text: proInput.trim(), votes: 1 }]);
    setProInput("");
    toast.success("Pro argument added");
  };
  const addCon = () => {
    if (!conInput.trim()) return;
    setCon((c) => [...c, { id: Date.now(), text: conInput.trim(), votes: 1 }]);
    setConInput("");
    toast.success("Con argument added");
  };

  const vote = (a: Arg, side: "pro" | "con") => {
    if (side === "pro") setPro((ps) => ps.map((x) => x.id === a.id ? { ...x, votes: x.votes + 1 } : x));
    else setCon((cs) => cs.map((x) => x.id === a.id ? { ...x, votes: x.votes + 1 } : x));
    toast.success("Vote registered");
  };

  const summarize = () => {
    setSummarizing(true); setSummary(null); setCompromise(null);
    setTimeout(() => {
      setSummarizing(false);
      setSummary("Both sides value flexibility AND connection. Pros emphasize time reclaimed and broader hiring; cons emphasize serendipity, onboarding, and infrastructure limits.");
      setCompromise("Hybrid: 2 anchor days in-office for collaboration/onboarding, 3 flex days remote. Subsidize home internet. Quarterly in-person retreats for serendipity.");
      toast.success("AI summary ready", { description: "Compromise path proposed" });
    }, 1500);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Debate Arena"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-primary/20 border border-accent/40 flex items-center justify-center shrink-0">
                <Swords className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Debate Arena</div>
                <div className="text-[11px] text-muted-foreground">Should remote work become the regional default?</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Split Pro/Con */}
              <div className="grid grid-cols-2 gap-3">
                {/* Pro */}
                <section className="rounded-2xl border border-secondary/40 bg-gradient-to-br from-secondary/15 to-transparent p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-secondary flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> Pro</span>
                    <span className="text-[11px] font-mono text-secondary">{totalPro}</span>
                  </div>
                  <div className="space-y-1.5">
                    {pro.map((a) => (
                      <button key={a.id} onClick={() => vote(a, "pro")}
                        className="w-full text-start rounded-lg bg-foreground/5 hover:bg-foreground/10 px-2 py-1.5 transition">
                        <div className="text-[11px] leading-snug">{a.text}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">+{a.votes} votes</div>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input value={proInput} onChange={(e) => setProInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addPro(); }}
                      placeholder="Add a pro…"
                      className="flex-1 bg-muted/40 rounded-lg px-2 py-1.5 text-[11px] outline-none border border-border/50" />
                    <button onClick={addPro} className="px-2 rounded-lg bg-secondary/20 text-secondary text-[11px]">+</button>
                  </div>
                </section>
                {/* Con */}
                <section className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/15 to-transparent p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-accent flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> Con</span>
                    <span className="text-[11px] font-mono text-accent">{totalCon}</span>
                  </div>
                  <div className="space-y-1.5">
                    {con.map((a) => (
                      <button key={a.id} onClick={() => vote(a, "con")}
                        className="w-full text-start rounded-lg bg-foreground/5 hover:bg-foreground/10 px-2 py-1.5 transition">
                        <div className="text-[11px] leading-snug">{a.text}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">+{a.votes} votes</div>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input value={conInput} onChange={(e) => setConInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addCon(); }}
                      placeholder="Add a con…"
                      className="flex-1 bg-muted/40 rounded-lg px-2 py-1.5 text-[11px] outline-none border border-border/50" />
                    <button onClick={addCon} className="px-2 rounded-lg bg-accent/20 text-accent text-[11px]">+</button>
                  </div>
                </section>
              </div>

              {/* Vote bar */}
              <section className="rounded-2xl border border-border/60 bg-card p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Live vote bar</span>
                  <span>{total} votes</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden flex">
                  <motion.div animate={{ width: `${proPct}%` }} className="bg-secondary flex items-center justify-end pr-1.5">
                    <span className="text-[9px] text-secondary-foreground font-mono">{proPct}%</span>
                  </motion.div>
                  <motion.div animate={{ width: `${conPct}%` }} className="bg-accent flex items-center justify-start pl-1.5">
                    <span className="text-[9px] text-accent-foreground font-mono">{conPct}%</span>
                  </motion.div>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => { setVoted("pro"); toast.success("Voted Pro"); }}
                    className={cn("flex-1 text-[11px] py-1.5 rounded-full border transition", voted === "pro" ? "bg-secondary text-secondary-foreground border-secondary" : "border-border/50 hover:bg-muted/40")}>
                    <ThumbsUp className="w-3 h-3 inline mr-1" /> Pro
                  </button>
                  <button onClick={() => { setVoted("middle"); toast.success("Voted compromise"); }}
                    className={cn("flex-1 text-[11px] py-1.5 rounded-full border transition", voted === "middle" ? "bg-gradient-to-r from-secondary to-accent text-secondary-foreground border-transparent" : "border-border/50 hover:bg-muted/40")}>
                    <Handshake className="w-3 h-3 inline mr-1" /> Compromise
                  </button>
                  <button onClick={() => { setVoted("con"); toast.success("Voted Con"); }}
                    className={cn("flex-1 text-[11px] py-1.5 rounded-full border transition", voted === "con" ? "bg-accent text-accent-foreground border-accent" : "border-border/50 hover:bg-muted/40")}>
                    <ThumbsDown className="w-3 h-3 inline mr-1" /> Con
                  </button>
                </div>
              </section>

              {/* AI summary */}
              <section className="space-y-2">
                <button onClick={summarize} disabled={summarizing}
                  className="w-full rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  {summarizing ? <><Loader2 className="w-4 h-4 animate-spin" /> Summarizing…</> : <><Sparkles className="w-4 h-4" /> AI summarize & propose compromise</>}
                </button>
                <AnimatePresence>
                  {summary && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent p-3 space-y-2">
                      <div className="text-[10px] uppercase tracking-widest text-secondary">AI summary</div>
                      <p className="text-xs leading-relaxed">{summary}</p>
                    </motion.div>
                  )}
                  {compromise && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-transparent p-3 space-y-2">
                      <div className="text-[10px] uppercase tracking-widest text-accent flex items-center gap-1"><Handshake className="w-3 h-3" /> Compromise path</div>
                      <p className="text-xs leading-relaxed">{compromise}</p>
                      <button onClick={() => { toast.success("Compromise posted to Midan as a thread"); onClose(); }}
                        className="w-full rounded-full bg-gradient-gold text-charcoal py-1.5 text-xs font-medium flex items-center justify-center gap-1">
                        Post to Midan <ChevronRight className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Create from thread */}
              <button onClick={() => toast.success("Pulling 5 posts from Midan to seed a new debate…")}
                className="w-full rounded-xl glass py-2.5 text-sm flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-secondary" /> Create debate from Midan thread
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

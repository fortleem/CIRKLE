"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Scale, Sparkles, Send, Loader2, CheckCircle2, AlertCircle, Clock, Activity, Timer,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }
type Action = "summarize" | "compromise" | "fairness";

interface Mediation {
  action: Action;
  result: string;
}

interface HistoryPoint { label: string; value: number; }

const HISTORY: HistoryPoint[] = [
  { label: "Mon", value: 22 },
  { label: "Tue", value: 38 },
  { label: "Wed", value: 55 },
  { label: "Thu", value: 41 },
  { label: "Fri", value: 70 },
  { label: "Sat", value: 48 },
  { label: "Sun", value: 33 },
];

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

export function AIMediator({ open, onClose }: Props) {
  const [partyA, setPartyA] = useState("");
  const [partyB, setPartyB] = useState("");
  const [analyzing, setAnalyzing] = useState<null | Action>(null);
  const [results, setResults] = useState<Mediation[]>([]);
  const [tension, setTension] = useState(45);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (!open) return;
    if (lastRun === null) return;
    const tick = () => {
      const left = Math.max(0, COOLDOWN_MS - (Date.now() - lastRun));
      setCooldownLeft(left);
      if (left <= 0) clearInterval(id);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [open, lastRun]);

  const onCooldown = cooldownLeft > 0;

  const run = (action: Action) => {
    if (onCooldown) {
      toast.error("Mediation on cooldown", { description: `Try again in ${Math.ceil(cooldownLeft / 60000)} min.` });
      return;
    }
    if (!partyA.trim() || !partyB.trim()) {
      toast.error("Add both sides of the story");
      return;
    }
    setAnalyzing(action);
    setTimeout(() => {
      let result = "";
      let nextTension = tension;
      if (action === "summarize") {
        result = "A: User wants Friday hard-stop. B: User needs 2 more days for QA. Shared value: quality.";
        nextTension = Math.max(10, tension - 8);
      } else if (action === "compromise") {
        result = "Ship a beta Friday for stakeholders. Full release Tuesday after QA. Document the gap explicitly.";
        nextTension = Math.max(10, tension - 18);
      } else {
        result = "Fairness 87% — balanced on time, scope, and impact symmetry. Both parties concede equally.";
        nextTension = Math.max(10, tension - 12);
      }
      setResults((r) => [{ action, result }, ...r].slice(0, 6));
      setTension(nextTension);
      setAnalyzing(null);
      setLastRun(Date.now());
      toast.success(`${action[0].toUpperCase() + action.slice(1)} ready`, { description: "On-device · private to your Circle" });
    }, 1600);
  };

  const tensionPct = tension;
  const tensionColor = tension > 66 ? "text-accent" : tension > 33 ? "text-secondary" : "text-primary";

  const fmt = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${String(sec).padStart(2, "0")}`;
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
            role="dialog" aria-label="AI Mediator"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-steel/20 border border-primary/40 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">AI Mediator</div>
                <div className="text-[11px] text-muted-foreground">Resolve disputes fairly · on-device</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Tension indicator */}
              <section className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Activity className="w-3 h-3" /> Tension indicator
                  </div>
                  <div className={cn("font-display text-lg", tensionColor)}>{tensionPct}%</div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    animate={{ width: `${tensionPct}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className={cn("h-full",
                      tension > 66 ? "bg-accent" : tension > 33 ? "bg-secondary" : "bg-primary")}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  {tension > 66 ? "High — de-escalate first." : tension > 33 ? "Moderate — compromise likely." : "Low — both parties are calm."}
                </div>
              </section>

              {/* 7-day tension history chart */}
              <section className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> 7-day history
                </div>
                <div className="flex items-end justify-between gap-1.5 h-24">
                  {HISTORY.map((h) => (
                    <div key={h.label} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: `${h.value}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className={cn("w-full rounded-t-md", h.value > 66 ? "bg-accent/70" : h.value > 33 ? "bg-secondary/70" : "bg-primary/70")}
                      />
                      <span className="text-[9px] text-muted-foreground">{h.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Party inputs */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-secondary/40 bg-gradient-to-br from-secondary/10 to-transparent p-3 space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-secondary">Party A</div>
                  <textarea value={partyA} onChange={(e) => setPartyA(e.target.value)} rows={4}
                    placeholder="User's perspective…"
                    className="w-full bg-muted/40 rounded-xl p-3 text-sm outline-none resize-none border border-border/50 focus:border-secondary/60 transition" />
                </div>
                <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 to-transparent p-3 space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-accent">Party B</div>
                  <textarea value={partyB} onChange={(e) => setPartyB(e.target.value)} rows={4}
                    placeholder="User's perspective…"
                    className="w-full bg-muted/40 rounded-xl p-3 text-sm outline-none resize-none border border-border/50 focus:border-accent/60 transition" />
                </div>
              </section>

              {/* 3 mediation actions */}
              <section className="grid grid-cols-3 gap-2">
                {([
                  { k: "summarize" as Action, label: "Summarize", icon: Sparkles, tint: "from-secondary/15 to-transparent border-secondary/40" },
                  { k: "compromise" as Action, label: "Compromise", icon: Scale, tint: "from-accent/15 to-transparent border-accent/40" },
                  { k: "fairness" as Action, label: "Fairness", icon: CheckCircle2, tint: "from-primary/15 to-transparent border-primary/40" },
                ]).map((a) => (
                  <button
                    key={a.k}
                    onClick={() => run(a.k)} disabled={!!analyzing || onCooldown}
                    className={cn("rounded-xl border bg-gradient-to-br p-3 text-center transition disabled:opacity-50", a.tint)}
                  >
                    <a.icon className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-[11px] font-medium">{a.label}</div>
                    {analyzing === a.k && <Loader2 className="w-3 h-3 mt-1 mx-auto animate-spin text-secondary" />}
                  </button>
                ))}
              </section>

              {/* Cooldown notice */}
              <div className="rounded-xl border border-border/50 bg-muted/30 p-3 flex items-center gap-2 text-[11px]">
                <Timer className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {onCooldown ? (
                  <span>Cooldown active — next mediation in <span className="font-medium text-secondary tabular-nums">{fmt(cooldownLeft)}</span></span>
                ) : (
                  <span className="text-muted-foreground">Each action triggers a 30-min cooldown to prevent overuse.</span>
                )}
              </div>

              {/* Results */}
              {results.length > 0 && (
                <section className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Mediation history
                  </div>
                  {results.map((r, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border/60 bg-card p-3 flex items-start gap-2">
                      {r.action === "fairness" ? <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{r.action}</div>
                        <div className="text-xs leading-relaxed">{r.result}</div>
                      </div>
                    </motion.div>
                  ))}
                </section>
              )}
            </div>

            <div className="border-t border-border/50 px-5 py-3">
              <button
                onClick={() => { navigator.clipboard?.writeText(results.map((r) => `[${r.action}] ${r.result}`).join("\n")); toast.success("Mediation log copied"); }}
                disabled={results.length === 0}
                className="w-full rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Send log to both parties
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

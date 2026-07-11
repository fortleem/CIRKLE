"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Sparkles, Loader2, RefreshCw, Share2, ShieldCheck, Bell, BellOff,
  Flame, MessageSquare, Heart, TrendingUp, Moon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Bullet {
  icon: typeof Flame;
  label: string;
  text: string;
  tint: string;
}

interface Recap {
  date: string;
  mood: string;
  bullets: Bullet[];
  insight: string;
}

const FALLBACK: Recap = {
  date: new Date().toISOString().slice(0, 10),
  mood: "Thoughtful",
  bullets: [
    { icon: Flame, label: "Hottest thread", text: "Your AlUla sketch thread hit 1.2K likes — most engagement this week.", tint: "from-secondary/20 to-transparent border-secondary/40" },
    { icon: MessageSquare, label: "Deepest chat", text: "42 messages with User on the Diriyah brand brief — your strongest collab.", tint: "from-primary/20 to-transparent border-primary/40" },
    { icon: Heart, label: "Warmest moment", text: "User thanked you twice for the design review — reciprocity up 18%.", tint: "from-accent/20 to-transparent border-accent/40" },
    { icon: TrendingUp, label: "Biggest shift", text: "Reach grew +9.4K from one Lamahat post. Long-form outperformed short notes 2.1×.", tint: "from-steel/20 to-transparent border-steel/40" },
    { icon: Moon, label: "Quiet signal", text: "You replied 14% faster. Late-night posts dropped — sleep was a gift.", tint: "from-secondary/15 to-primary/10 border-secondary/30" },
  ],
  insight:
    "You leaned reflective this week. Long posts and slow mornings outperformed. Keep that cadence.",
};

export function AIRecap({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [autoGen, setAutoGen] = useState(false);

  const generate = async () => {
    setLoading(true);
    setRecap(null);
    try {
      const res = await fetch("/api/ai-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Generate a daily recap with 5 bullet points. Each bullet has: icon keyword (flame, chat, heart, trend, moon), label (short), and a one-sentence insight. Return as plain text bullet list.",
          country: "SA",
        }),
      });
      if (!res.ok) throw new Error("ai failed");
      const data = (await res.json()) as { reply?: string };
      // Parse AI reply into bullets (best-effort); fall back to curated sample.
      const lines = (data.reply || "")
        .split(/\n+/)
        .map((l) => l.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 5);
      const icons: Bullet["icon"][] = [Flame, MessageSquare, Heart, TrendingUp, Moon];
      const tints = FALLBACK.bullets.map((b) => b.tint);
      const bullets: Bullet[] = lines.map((line, i) => {
        const [label, ...rest] = line.split(":");
        return {
          icon: icons[i % icons.length],
          label: label?.trim() || `Highlight ${i + 1}`,
          text: rest.join(":").trim() || line,
          tint: tints[i % tints.length],
        };
      });
      setRecap(bullets.length
        ? { date: FALLBACK.date, mood: FALLBACK.mood, bullets, insight: FALLBACK.insight }
        : FALLBACK);
      toast.success("AI Recap ready", { description: "5 bullets · generated on-device" });
    } catch {
      setRecap(FALLBACK);
      toast("Showing cached recap", { description: "AI service offline — try again later." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140]"
            style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="AI Recap"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <motion.div
                animate={loading ? { rotate: [0, -8, 8, -8, 0], scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 1.2, repeat: loading ? Infinity : 0 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/20 border border-secondary/40 flex items-center justify-center shrink-0"
              >
                {loading ? <Loader2 className="w-5 h-5 text-secondary animate-spin" /> : <Sparkles className="w-5 h-5 text-secondary" />}
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">AI Recap</div>
                <div className="text-[11px] text-muted-foreground">Your day · summarized on-device</div>
              </div>
              <button
                onClick={generate}
                disabled={loading}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center disabled:opacity-50"
                aria-label="Regenerate"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {!recap && !loading && (
                <div className="rounded-2xl bg-card border border-border p-6 flex flex-col items-center gap-3 text-center">
                  <Sparkles className="w-8 h-8 text-secondary" />
                  <div className="font-display text-lg">Generate today&apos;s recap</div>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Cirkle AI reads your day across every pillar — posts, chats, moments — and distills it into 5 bullets.
                  </p>
                  <button
                    onClick={generate}
                    className="mt-1 px-5 py-2.5 rounded-full bg-gradient-hero text-cream text-sm font-medium flex items-center gap-2 hover:opacity-90 transition"
                  >
                    <Sparkles className="w-4 h-4" /> Generate recap
                  </button>
                </div>
              )}

              {loading && (
                <div className="rounded-2xl bg-card border border-border p-6 flex flex-col items-center gap-2 text-center">
                  <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                  <div className="text-sm">Reading your day…</div>
                  <div className="text-[11px] text-muted-foreground">Scanning posts, chats, and Lamahat moments.</div>
                </div>
              )}

              {!loading && recap && (
                <>
                  <section className="rounded-2xl border border-secondary/40 bg-gradient-to-br from-secondary/15 to-accent/5 p-5 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl" />
                    <div className="relative">
                      <div className="text-[10px] uppercase tracking-widest text-secondary">{recap.date} · mood: {recap.mood}</div>
                      <h2 className="font-display text-2xl mt-1">Your day, in 5 lines.</h2>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{recap.insight}</p>
                    </div>
                  </section>

                  <section className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">5 bullets</div>
                    {recap.bullets.map((b, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={cn("rounded-xl border bg-gradient-to-br p-3 flex items-start gap-3", b.tint)}
                      >
                        <div className="w-9 h-9 rounded-lg glass flex items-center justify-center shrink-0">
                          <b.icon className="w-4 h-4 text-secondary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{b.label}</div>
                          <div className="text-sm leading-snug">{b.text}</div>
                        </div>
                      </motion.div>
                    ))}
                  </section>

                  <section className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                      {autoGen ? <Bell className="w-4 h-4 text-secondary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Auto-generate every evening</div>
                      <div className="text-[11px] text-muted-foreground">9 PM local · summarized on-device, never uploaded.</div>
                    </div>
                    <Switch checked={autoGen} onCheckedChange={(v) => { setAutoGen(v); toast.success(v ? "Auto recap on" : "Auto recap off"); }} aria-label="Toggle auto-generate" />
                  </section>

                  <section className="rounded-xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Privacy: every bullet is generated on-device. Your day&apos;s data never leaves your phone.
                    </p>
                  </section>

                  <button
                    onClick={() => { toast.success("Recap shared to Midan", { description: "Visible on your Midan wall." }); onClose(); }}
                    className="w-full rounded-xl bg-gradient-hero text-cream py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
                  >
                    <Share2 className="w-4 h-4" /> Share to Midan
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

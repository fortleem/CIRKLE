"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Send, X, Mic, ThumbsUp, ThumbsDown, Dna, Plus } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useAuth } from "@/lib/auth-store";
import { dict } from "@/lib/i18n";
import { getCountry } from "@/lib/countries";
import { CircleMark } from "@/components/brand/circle-mark";
import { toast } from "sonner";
import { useBrainLearning, type BrainUserProfile } from "@/hooks/use-brain-learning";
import { usePersonalAI } from "@/hooks/use-personal-ai";
import {
  getPersonalAIConsent,
  type CirkleMood,
} from "@/lib/personal-ai";

const MOOD_EMOJI: Record<CirkleMood["current"], string> = {
  joyful: "😄",
  calm: "😌",
  focused: "🎯",
  excited: "🤩",
  tired: "😴",
  stressed: "😣",
  neutral: "😐",
};

export interface AIAction {
  type:
    | "open-composer"
    | "open-governance"
    | "navigate"
    | "scan-pay"
    | "toggle-ghost";
  kind?: "post" | "poll" | "media";
  draft?: string;
  tab?: string;
}

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  /** Brain interaction id (from logInteraction) — used to attach 👍/👎 feedback. */
  interactionId?: number | null;
  /** Current feedback state for this AI message (null = no feedback yet). */
  feedback?: "up" | "down" | null;
  /** Sources that contributed to this answer (cross-evaluation) */
  sources?: string[];
  /** Confidence score (0-1) from cross-evaluation */
  confidence?: number;
}

const SUGGESTIONS = [
  "Summarize today",
  "Plan my trip",
  "Reply in my tone",
  "Draft a polite no",
];

export function AIAssistant({
  open,
  onClose,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  onAction: (a: AIAction) => void;
}) {
  const { locale, country } = useApp();
  const { user } = useAuth();
  const t = dict[locale].ai;
  const userName = user?.displayName?.split(" ")[0] || "there";
  const userHandle = user?.username || "friend";
  const [messages, setMessages] = useState<Message[]>([
    { id: "s1", role: "ai", text: `Hi ${userName} — I'm your Cirkle Brain AI. I can help with travel, news, payments, predictions, and more. What would you like to do?` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { trackInteraction, trackFeedback, getUserProfile } = useBrainLearning();
  // Cache the most recently-built user profile so we can attach it to every
  // /api/ai-ask request without rebuilding it per send (the server rebuilds
  // it lazily through the build-profile mode when this is null).
  const profileRef = useRef<BrainUserProfile | null>(null);
  // Personal AI OS (Feature 5) — DNA + Mood state for the assistant badge +
  // the personalizationContext we forward to /api/ai-ask.
  const { dna, mood, rebuildDNA, personalAI: personalAIInstance } = usePersonalAI();
  const [consent, setConsent] = useState(false);

  // Whenever the overlay opens, opportunistically refresh the user profile
  // so the first reply of the session is already personalized. Failures are
  // non-fatal — the API still works without a profile.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getUserProfile()
      .then((p) => {
        if (!cancelled) profileRef.current = p;
      })
      .catch(() => {});
    // Also re-hydrate the consent flag from IndexedDB so the badge reflects
    // the current state on every open.
    getPersonalAIConsent()
      .then((c) => { if (!cancelled) setConsent(c); })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, getUserProfile]);

  // After every tracked interaction, opportunistically rebuild the profile
  // in the background so subsequent replies pick up the latest style.
  const refreshProfileQuietly = () => {
    getUserProfile()
      .then((p) => {
        if (p) profileRef.current = p;
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: `u${Date.now()}`, role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const c = getCountry(country);
      // Build the on-device personalization context (Feature 5). The string
      // already factors in the user's consent state — when consent is off,
      // it returns a minimal style hint. We forward the consent flag too so
      // the server can decide whether to use the full context.
      let personalizationContext: string | undefined;
      try {
        personalizationContext = await personalAIInstance.getPersonalizationContext();
      } catch {
        personalizationContext = undefined;
      }
      // Use the Cirkle Brain cross-evaluation engine — queries multiple sources
      // (AI + web search + knowledge graph), cross-checks them, and produces
      // a consensus answer with confidence + source agreement.
      const crossRes = await fetch("/api/brain/cross-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          country: c.code,
          city: c.capital,
          username: user?.username,
          language: locale === "ar" ? "ar" : "en",
        }),
      }).catch(() => null);

      let reply: string;
      let sources: string[] = [];
      let confidence = 0;

      if (crossRes && crossRes.ok) {
        const crossData = await crossRes.json().catch(() => ({}));
        reply = crossData?.finalAnswer || "I'm here — could you rephrase that?";
        sources = (crossData?.sources || []).map((s: any) => s.name);
        confidence = crossData?.confidence || 0;
      } else {
        // Fallback to /api/ai-ask if cross-evaluation fails
        const res = await fetch("/api/ai-ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            country: c.code,
            city: c.capital,
            userProfile: profileRef.current,
            personalizationContext,
            personalAIConsent: consent,
          }),
        });
        const data = await res.json().catch(() => ({}));
        reply = data?.reply || data?.answer || data?.text || "I'm here — could you rephrase that?";
        sources = ["ai-provider"];
      }
      // Persist the exchange to the Brain's on-device memory. The returned
      // id lets us later attach 👍/👎 feedback to this exact interaction.
      const interactionId = await trackInteraction(text, reply);
      setMessages((m) => [
        ...m,
        {
          id: `a${Date.now()}`,
          role: "ai",
          text: reply,
          interactionId,
          feedback: null,
          sources,
          confidence,
        },
      ]);
      // Rebuild the user profile in the background so the NEXT reply is
      // already informed by this exchange. Non-blocking.
      refreshProfileQuietly();
    } catch {
      setMessages((m) => [
        ...m,
        { id: `a${Date.now()}`, role: "ai", text: "I'm here — could you rephrase that?" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (msgId: string, feedback: "up" | "down") => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || msg.interactionId == null) return;
    // Toggle: clicking the same thumb again clears the feedback.
    const next = msg.feedback === feedback ? null : feedback;
    setMessages((m) =>
      m.map((x) => (x.id === msgId ? { ...x, feedback: next } : x)),
    );
    if (next) {
      await trackFeedback(msg.interactionId, next);
      toast(
        next === "up" ? "Thanks — noted as helpful" : "Got it — we'll do better",
      );
    }
  };

  const handleBuildDNA = async () => {
    toast.info("Building your DNA…", { description: "Reading your on-device interactions." });
    try {
      await rebuildDNA();
      toast.success("DNA built", { description: "Your personal AI is now personalized." });
    } catch {
      toast.error("Couldn't build DNA — try again later.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] bg-charcoal/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 inset-x-0 sm:inset-0 sm:m-auto sm:max-w-lg sm:h-[80vh] z-[150] glass-strong rounded-t-3xl sm:rounded-3xl shadow-float flex flex-col overflow-hidden"
          >
            <header className="p-4 flex items-center gap-3 border-b border-border/60">
              <CircleMark size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg leading-tight flex items-center gap-2">
                  {t.title}
                  {mood && (
                    <span
                      title={`Current mood: ${mood.current} (energy ${mood.energy}/100)`}
                      aria-label={`Current mood: ${mood.current}`}
                      className="text-base leading-none"
                    >
                      {MOOD_EMOJI[mood.current]}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground tracking-widest uppercase">
                  {t.sub}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[85%] ${
                    m.role === "user"
                      ? "ms-auto bg-gradient-hero text-cream rounded-2xl rounded-br-md"
                      : "me-auto glass rounded-2xl rounded-bl-md"
                  }`}
                >
                  <div className="px-4 py-2.5 text-sm">{m.text}</div>
                  {m.role === "ai" && (
                    <div className="flex items-center gap-1 px-3 pb-1.5 pt-0.5 border-t border-border/30 flex-wrap">
                      <span
                        title="Powered by your on-device Cirkle DNA + Mood"
                        className="text-[9px] uppercase tracking-widest text-secondary/80 flex items-center gap-0.5 mr-1"
                      >
                        <Dna className="w-2.5 h-2.5" /> DNA + Mood
                      </span>
                      {m.sources && m.sources.length > 0 && (
                        <span
                          title={`Cross-evaluated by: ${m.sources.join(" + ")}`}
                          className="text-[9px] uppercase tracking-widest text-primary/80 flex items-center gap-0.5 mr-1"
                        >
                          <Sparkles className="w-2.5 h-2.5" /> {m.sources.join(" + ")}
                        </span>
                      )}
                      {m.confidence != null && m.confidence > 0 && (
                        <span
                          title={`Confidence: ${Math.round(m.confidence * 100)}%`}
                          className={`text-[9px] uppercase tracking-widest flex items-center gap-0.5 mr-1 ${
                            m.confidence > 0.7 ? "text-emerald-500" : m.confidence > 0.4 ? "text-secondary" : "text-accent"
                          }`}
                        >
                          {Math.round(m.confidence * 100)}%
                        </span>
                      )}
                      {m.interactionId != null && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleFeedback(m.id, "up")}
                            aria-label="Helpful"
                            aria-pressed={m.feedback === "up"}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                              m.feedback === "up"
                                ? "bg-emerald-500/20 text-emerald-500"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(m.id, "down")}
                            aria-label="Not helpful"
                            aria-pressed={m.feedback === "down"}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                              m.feedback === "down"
                                ? "bg-rose-500/20 text-rose-500"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
              {/* Build-my-DNA CTA — only when DNA is null and there are no
                  messages beyond the seed. Clicking it triggers rebuildDNA()
                  in the background; the badge then shows on every reply. */}
              {!dna && messages.length <= 1 && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleBuildDNA}
                  className="me-auto glass rounded-2xl rounded-bl-md px-4 py-3 text-sm flex items-center gap-2 hover:scale-[1.02] transition w-[85%]"
                >
                  <Plus className="w-4 h-4 text-secondary shrink-0" />
                  <span className="text-left">
                    <span className="block font-medium">Build my DNA</span>
                    <span className="block text-[11px] text-muted-foreground">
                      Personalize every reply — 100% on-device, takes a second.
                    </span>
                  </span>
                </motion.button>
              )}
              {loading && (
                <div className="me-auto glass rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1.5 h-1.5 rounded-full bg-secondary"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 pb-2 flex gap-2 flex-wrap">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full glass border-secondary/30 hover:bg-secondary/10 transition"
                >
                  {s}
                </button>
              ))}
              <button
                onClick={() =>
                  onAction({ type: "open-composer", kind: "post" })
                }
                className="text-xs px-3 py-1.5 rounded-full glass border-secondary/30 hover:bg-secondary/10 transition"
              >
                Compose a post
              </button>
              <button
                onClick={() => {
                  onAction({ type: "scan-pay" });
                  onClose();
                }}
                className="text-xs px-3 py-1.5 rounded-full glass border-secondary/30 hover:bg-secondary/10 transition"
              >
                Scan & pay
              </button>
            </div>

            <div className="p-3 border-t border-border/60">
              <div className="glass rounded-full px-3 py-2 flex items-center gap-2 shadow-soft">
                <button
                  onClick={() => toast("Voice input coming soon")}
                  className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                  aria-label="Voice"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send(input);
                  }}
                  className="flex-1 bg-transparent outline-none text-sm"
                  placeholder={t.placeholder}
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-full bg-gradient-hero text-cream flex items-center justify-center disabled:opacity-40"
                  aria-label={t.send}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AiButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-full bg-gradient-mesh flex items-center justify-center"
      aria-label="AI"
    >
      <Sparkles className="w-4 h-4 text-primary-foreground" />
    </button>
  );
}

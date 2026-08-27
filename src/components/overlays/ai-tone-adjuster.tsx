// @ts-nocheck
/**
 * AI Tone Adjuster overlay (Tier E, E5).
 *
 * Inline tone picker with live preview. The user pastes/types text, picks a
 * tone (Formal / Friendly / Apologetic / Assertive / Diplomatic), and sees the
 * AI-rewritten text streamed into the preview pane. The "Apply" button
 * dispatches `circle:ai-tone-adjuster` with `{ text }` so the host can fill
 * the composer with the rewritten text.
 */
"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Sparkles, Loader2, RefreshCw, AlertCircle, Wand2, Copy, Check,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tone = "formal" | "friendly" | "apologetic" | "assertive" | "diplomatic";

interface ToneMeta {
  id: Tone;
  label: string;
  emoji: string;
  tint: string;
}

const TONES: ToneMeta[] = [
  { id: "formal", label: "Formal", emoji: "🎩", tint: "bg-slate-500/15 border-slate-500/30 text-slate-100" },
  { id: "friendly", label: "Friendly", emoji: "👋", tint: "bg-emerald-500/15 border-emerald-500/30 text-emerald-100" },
  { id: "apologetic", label: "Apologetic", emoji: "🙏", tint: "bg-rose-500/15 border-rose-500/30 text-rose-100" },
  { id: "assertive", label: "Assertive", emoji: "⚡", tint: "bg-amber-500/15 border-amber-500/30 text-amber-100" },
  { id: "diplomatic", label: "Diplomatic", emoji: "🤝", tint: "bg-sky-500/15 border-sky-500/30 text-sky-100" },
];

interface ToneResult {
  original: string;
  tone: Tone;
  rewritten: string;
  provider: string;
  elapsedMs: number;
  fallback: boolean;
}

export function AIToneAdjuster({ open, onClose }: Props) {
  const [text, setText] = useState("");
  const [tone, setTone] = useState<Tone>("friendly");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ToneResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fetchSeq = useRef<number>(0);

  const adjust = useCallback(
    async (overrideText?: string, overrideTone?: Tone) => {
      const t = (overrideText ?? text).trim();
      const tn = overrideTone ?? tone;
      if (!t) {
        toast.error("Type something first");
        return;
      }
      const seq = ++fetchSeq.current;
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 8000);
        try {
          const res = await fetch("/api/ai/tone-adjust", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: t, tone: tn }),
            signal: ctrl.signal,
          });
          if (!res.ok) {
            const errBody = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(errBody.error ?? `HTTP ${res.status}`);
          }
          const data = (await res.json()) as ToneResult;
          if (seq !== fetchSeq.current) return;
          setResult(data);
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        if (seq !== fetchSeq.current) return;
        const msg = err instanceof Error ? err.message : "Failed to adjust tone";
        setError(msg);
        toast.error("Tone adjustment failed", { description: msg });
      } finally {
        if (seq === fetchSeq.current) setLoading(false);
      }
    },
    [text, tone],
  );

  const handleToneChange = (newTone: Tone) => {
    setTone(newTone);
    if (text.trim()) adjust(text, newTone);
  };

  const handleApply = () => {
    if (!result?.rewritten) return;
    window.dispatchEvent(
      new CustomEvent("circle:ai-tone-adjuster", {
        detail: { text: result.rewritten, tone: result.tone },
      }),
    );
    toast.success("Applied", { description: `Tone: ${result.tone}` });
    onClose();
  };

  const handleCopy = async () => {
    if (!result?.rewritten) return;
    try {
      await navigator.clipboard.writeText(result.rewritten);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  // Reset on close.
  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setText("");
      setTone("friendly");
      setResult(null);
      setError(null);
    }, 300);
  };

  return (
    <OverlayShell open={open} onClose={handleClose} variant="dialog" maxWidth="max-w-xl" ariaLabel="AI tone adjuster">
      <div className="glass backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-emerald-400" aria-hidden />
            </div>
            <div>
              <h2 id="tone-title" className="text-sm font-semibold text-white">
                Tone Adjuster
              </h2>
              <p className="text-[11px] text-white/50">ضبط النبرة</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white"
            onClick={handleClose}
            aria-label="Close tone adjuster"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Input */}
        <div>
          <label htmlFor="tone-input" className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">
            Your message
          </label>
          <Textarea
            id="tone-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste a message…"
            rows={3}
            maxLength={5000}
            className="resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-emerald-400/40"
            aria-label="Message to adjust"
          />
          <div className="flex justify-between mt-1 text-[10px] text-white/40">
            <span>Up to 5,000 chars</span>
            <span>{text.length}/5000</span>
          </div>
        </div>

        {/* Tone picker */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">
            Pick a tone
          </p>
          <div
            role="radiogroup"
            aria-label="Tone"
            className="grid grid-cols-2 sm:grid-cols-5 gap-1.5"
          >
            {TONES.map((t) => {
              const isSelected = tone === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleToneChange(t.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-[11px] font-medium transition-all",
                    isSelected
                      ? cn(t.tint, "ring-2 ring-emerald-400/40")
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                  )}
                >
                  <span className="text-base leading-none" aria-hidden>{t.emoji}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action button */}
        <Button
          onClick={() => adjust()}
          disabled={loading || !text.trim()}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Rewrite in selected tone"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
              Adjusting…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" aria-hidden />
              Rewrite in {TONES.find((t) => t.id === tone)?.label}
            </>
          )}
        </Button>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" aria-hidden />
              <div className="flex-1">
                <p className="text-xs text-rose-200">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 mt-2 px-2 text-xs text-rose-100 hover:text-white"
                  onClick={() => adjust()}
                >
                  <RefreshCw className="w-3 h-3 mr-1" aria-hidden />
                  Retry
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.tone + result.rewritten.slice(0, 30)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[10px]">
                    {result.tone}
                  </Badge>
                  {result.fallback && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px]">
                      unchanged
                    </Badge>
                  )}
                  <span className="text-[10px] text-white/40">{result.elapsedMs}ms</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-white"
                  onClick={handleCopy}
                  aria-label="Copy rewritten text"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-white/90 whitespace-pre-wrap break-words leading-relaxed">
                {result.rewritten}
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs flex-1"
                  onClick={handleApply}
                  aria-label="Apply rewritten text to composer"
                >
                  Apply to composer
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </OverlayShell>
  );
}

export default AIToneAdjuster;

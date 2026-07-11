"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useAuth } from "@/lib/auth-store";

interface Insight {
  emoji: string;
  text: string;
  action?: string; // circle:* event to dispatch
  overlay?: string; // overlay name for display
}

const INSIGHTS: Insight[] = [
  { emoji: "💡", text: "Ask Cirkle Brain anything — I learn from every question", action: "circle:ai", overlay: "AI Assistant" },
  { emoji: "📊", text: "Check Oracle Markets — predict the future, earn reputation", action: "circle:oracle-markets", overlay: "Oracle Markets" },
  { emoji: "🧬", text: "Build your Personal AI OS — DNA + Mood + Topic DNA on-device", action: "circle:personal-ai", overlay: "Personal AI" },
  { emoji: "🛂", text: "Explore visa-free destinations for your passport", action: "circle:visa-explorer", overlay: "Visa Explorer" },
  { emoji: "🤝", text: "Create an AI-verified agreement with CirkleCommit", action: "circle:commit", overlay: "CirkleCommit" },
  { emoji: "📡", text: "Mesh Network is online — works without internet", action: "circle:mesh-dashboard", overlay: "Mesh Dashboard" },
  { emoji: "🪪", text: "Get verified with Cirkle ID — zero-knowledge attestations", action: "circle:identity", overlay: "Cirkle ID" },
  { emoji: "🏛️", text: "Shield Dashboard — civic infrastructure for your safety", action: "circle:shield-dashboard", overlay: "Shield Dashboard" },
  { emoji: "🧠", text: "Brain Orchestrator connects all features — try a workflow", action: "circle:orchestrator", overlay: "Brain Orchestrator" },
  { emoji: "🌍", text: "Your data stays in your region — PDPL/GDPR/PIPL compliant", action: "circle:data-residency", overlay: "Data Residency" },
];

export function FloatingInsightBar({ onOpenAI }: { onOpenAI?: () => void }) {
  const { country, city } = useApp();
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  // Rotate insights every 12 seconds
  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setIndex(i => (i + 1) % INSIGHTS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [dismissed]);

  // Re-show after 60s if dismissed
  const dismiss = useCallback(() => {
    setDismissed(true);
    setVisible(false);
    setTimeout(() => { setDismissed(false); setVisible(true); }, 60000);
  }, []);

  if (!visible || dismissed) return null;

  const insight = INSIGHTS[index];

  return (
    <AnimatePresence>
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] sm:max-w-md"
      >
        <button
          onClick={() => {
            if (insight.action) {
              window.dispatchEvent(new CustomEvent(insight.action));
            } else {
              onOpenAI?.();
            }
          }}
          className="glass-strong rounded-full pl-3 pr-2 py-2 flex items-center gap-2 shadow-float border border-secondary/20 hover:border-secondary/40 transition group w-full"
        >
          <span className="text-lg shrink-0">{insight.emoji}</span>
          <span className="text-xs text-foreground/90 flex-1 text-start truncate">
            {insight.text}
          </span>
          <span className="text-[10px] text-secondary flex items-center gap-0.5 shrink-0 group-hover:gap-1 transition-all">
            Open <ChevronRight className="w-3 h-3" />
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); dismiss(); } }}
            className="w-5 h-5 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground"
            aria-label="Dismiss insight"
          >
            <X className="w-3 h-3" />
          </span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Brain, Zap, ArrowRight, Check, Loader2 } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  trigger: string;
  title: string;
  description: string;
  actions: { label: string; overlay?: string; apiCall?: string; description: string }[];
  confidence: number;
  category: string;
  createdAt: string;
}

interface WorkflowStep {
  name: string;
  status: "done" | "pending" | "error";
  result?: string;
}

export function BrainOrchestrator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { country, city } = useApp();
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [workflow, setWorkflow] = useState<{ name: string; steps: WorkflowStep[] } | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  // Set loading when overlay opens (derived-state pattern avoids set-state-in-effect lint)
  if (open && !prevOpen) {
    setPrevOpen(true);
    setLoading(true);
    setSuggestions([]);
  }
  if (!open && prevOpen) {
    setPrevOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(`/api/orchestrator?username=${user?.username || "anonymous"}&country=${country}&city=${city || ""}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setSuggestions(data.suggestions || []); })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, country, city, user]);

  const runWorkflow = async (wf: string, params: Record<string, string>) => {
    setWorkflow({ name: wf.replace("_", " "), steps: [] });
    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: wf, params, context: { username: user?.username, country, city } }),
      });
      const data = await res.json();
      setWorkflow({ name: wf.replace("_", " "), steps: data.steps || [] });
      toast.success("Workflow complete!");
    } catch {
      toast.error("Workflow failed");
    }
  };

  const dispatchAction = (action: { overlay?: string; apiCall?: string }) => {
    if (action.overlay) {
      window.dispatchEvent(new CustomEvent(action.overlay));
      onClose();
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[140] bg-charcoal/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ stiffness: 240, damping: 26 }}
          className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl z-[150]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="glass-strong rounded-t-3xl sm:rounded-3xl shadow-float max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 glass-strong z-10 px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                  <Brain className="w-5 h-5 text-charcoal" />
                </div>
                <div>
                  <h2 className="font-display text-xl">Cirkle Brain Orchestrator</h2>
                  <p className="text-xs text-muted-foreground">AI connecting all your features</p>
                </div>
              </div>
              <button onClick={onClose} className="min-w-[44px] min-h-[44px] rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Quick Workflows */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Quick Workflows
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: "plan_trip", label: "Plan a trip", icon: "✈️", params: { destination: "Istanbul" } },
                    { id: "split_payment", label: "Split a payment", icon: "💸", params: {} },
                    { id: "share_moment", label: "Share a moment", icon: "📸", params: {} },
                    { id: "wellness_check", label: "Wellness check", icon: "❤️", params: {} },
                    { id: "discover_city", label: "Discover my city", icon: "🏙️", params: {} },
                  ].map(wf => (
                    <button
                      key={wf.id}
                      onClick={() => runWorkflow(wf.id, wf.params)}
                      className="glass rounded-xl p-3 text-left hover:bg-muted/40 transition flex items-center gap-3"
                    >
                      <span className="text-2xl">{wf.icon}</span>
                      <span className="text-sm font-medium">{wf.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Workflow results */}
              {workflow && (
                <div className="glass rounded-2xl p-4">
                  <h3 className="text-sm font-medium mb-3 capitalize">{workflow.name} workflow</h3>
                  <div className="space-y-2">
                    {workflow.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        {step.status === "done" ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : step.status === "pending" ? (
                          <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                        ) : (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                        <span className="flex-1">{step.name}</span>
                        {step.result && <span className="text-xs text-muted-foreground">{step.result}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Suggestions */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> AI Suggestions for You
                </h3>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No suggestions right now. Keep using Cirkle and I'll learn what you need.</p>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map(sugg => (
                      <motion.div
                        key={sugg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-2xl p-4"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <p className="text-[10px] uppercase tracking-widest text-secondary mb-1">{sugg.trigger}</p>
                            <h4 className="font-medium">{sugg.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{sugg.description}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{Math.round(sugg.confidence * 100)}%</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {sugg.actions.map((action, i) => (
                            <button
                              key={i}
                              onClick={() => dispatchAction(action)}
                              className="text-xs px-3 py-1.5 rounded-full bg-primary/15 text-primary hover:bg-primary/25 transition flex items-center gap-1"
                            >
                              {action.label} <ArrowRight className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

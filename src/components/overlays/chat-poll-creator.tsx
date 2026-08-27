// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, BarChart3, Loader2, Plus, Trash2, Check, Users, Clock, Eye, EyeOff,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
  conversationId?: string;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  conversationId: string;
  question: string;
  options: PollOption[];
  multiChoice: boolean;
  anonymous: boolean;
  createdBy: string;
  createdAt: string;
}

interface VoteResult {
  poll: Poll;
  options: (PollOption & { votes: number })[];
  totalVotes: number;
  voterChoice: string[];
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

const OPTION_TINTS = [
  "bg-emerald-500/70",
  "bg-amber-500/70",
  "bg-rose-500/70",
  "bg-violet-500/70",
  "bg-sky-500/70",
  "bg-orange-500/70",
];

export function ChatPollCreator({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";
  const [conversationId, setConversationId] = useState("");
  const [mode, setMode] = useState<"create" | "browse">("create");

  // Create-form
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multiChoice, setMultiChoice] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [creating, setCreating] = useState(false);

  // Browse
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [activePoll, setActivePoll] = useState<VoteResult | null>(null);
  const [voting, setVoting] = useState<string | null>(null);

  const fetchPolls = useCallback(async () => {
    if (!conversationId) return;
    setLoadingPolls(true);
    try {
      const res = await fetchWithTimeout(
        `/api/chat-polls?conversationId=${encodeURIComponent(conversationId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setPolls(data.polls ?? []);
    } catch {
      setPolls([]);
    } finally {
      setLoadingPolls(false);
    }
  }, [conversationId]);

  const refreshActive = useCallback(async (pollId: string) => {
    try {
      const res = await fetchWithTimeout(
        `/api/chat-polls/${pollId}/vote?voterId=${encodeURIComponent(userId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setActivePoll(data.result);
    } catch {
      /* no-op */
    }
  }, [userId]);

  useEffect(() => {
    if (open) {
      setConversationId("");
      setMode("create");
      setQuestion("");
      setOptions(["", ""]);
      setMultiChoice(false);
      setAnonymous(false);
      setPolls([]);
      setActivePoll(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && mode === "browse" && conversationId) fetchPolls();
  }, [open, mode, conversationId, fetchPolls]);

  useEffect(() => {
    if (!open || !activePoll) return;
    const id = setInterval(() => refreshActive(activePoll.poll.id), 5000);
    return () => clearInterval(id);
  }, [open, activePoll, refreshActive]);

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, ""]);
  };
  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };
  const handleOptionChange = (idx: number, val: string) => {
    setOptions(options.map((o, i) => (i === idx ? val : o)));
  };

  const handleCreate = async () => {
    if (!conversationId.trim()) {
      toast.error("Conversation ID is required");
      return;
    }
    if (!userId) {
      toast.error("Sign in to create a poll");
      return;
    }
    if (question.trim().length < 3) {
      toast.error("Question must be at least 3 characters");
      return;
    }
    const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOpts.length < 2) {
      toast.error("At least 2 options are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetchWithTimeout("/api/chat-polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId.trim(),
          question: question.trim(),
          options: cleanOpts,
          multiChoice,
          anonymous,
          createdBy: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create poll");
      toast.success("Poll published");
      window.dispatchEvent(new CustomEvent("circle:poll-creator", { detail: { conversationId } }));
      await refreshActive(data.poll.id);
      setMode("browse");
      setQuestion("");
      setOptions(["", ""]);
      setMultiChoice(false);
      setAnonymous(false);
      await fetchPolls();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setCreating(false);
    }
  };

  const handleVote = async (pollId: string, optionIds: string[]) => {
    if (!userId) {
      toast.error("Sign in to vote");
      return;
    }
    if (optionIds.length === 0) return;
    setVoting(optionIds[0]);
    try {
      const res = await fetchWithTimeout(`/api/chat-polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds, voterId: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to vote");
      toast.success("Vote recorded");
      setActivePoll(data.result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVoting(null);
    }
  };

  const totalVotes = useMemo(
    () => activePoll?.options.reduce((s, o) => s + o.votes, 0) ?? 0,
    [activePoll],
  );

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-2xl" ariaLabel="Polls & quizzes for group chats">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <BarChart3 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Group Polls</h2>
              <p className="text-xs text-muted-foreground">2–6 options · single or multi-choice · anonymous</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Conversation picker */}
        <div className="px-5 pt-4 space-y-2">
          <Label htmlFor="conv-id">Conversation ID</Label>
          <Input
            id="conv-id"
            placeholder="e.g. conv_xyz123"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4">
          <button
            onClick={() => setMode("create")}
            aria-pressed={mode === "create"}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition",
              mode === "create"
                ? "bg-emerald-500 text-white"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
            )}
          >
            <Plus className="w-3.5 h-3.5 inline mr-1.5" aria-hidden /> Create
          </button>
          <button
            onClick={() => { setMode("browse"); fetchPolls(); }}
            aria-pressed={mode === "browse"}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition",
              mode === "browse"
                ? "bg-emerald-500 text-white"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
            )}
          >
            <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" aria-hidden /> My polls ({polls.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {mode === "create" && !activePoll ? (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="poll-q">Question</Label>
                  <Textarea
                    id="poll-q"
                    placeholder="Ask something — e.g. Where should we iftar this Friday?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    maxLength={280}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground text-right">{question.length}/280</p>
                </div>

                <div className="space-y-2">
                  <Label>Options ({options.length}/6)</Label>
                  <div className="space-y-2">
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          maxLength={80}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOption(idx)}
                          disabled={options.length <= 2}
                          aria-label={`Remove option ${idx + 1}`}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddOption} disabled={options.length >= 6} className="mt-1">
                    <Plus className="w-3.5 h-3.5 mr-1.5" aria-hidden /> Add option
                  </Button>
                </div>

                <div className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="multi" className="text-sm font-medium text-foreground cursor-pointer">Multi-choice</Label>
                    </div>
                    <Switch id="multi" checked={multiChoice} onCheckedChange={setMultiChoice} aria-label="Toggle multi-choice" />
                  </div>
                  <p className="text-xs text-muted-foreground">Allow users to select multiple options</p>
                </div>

                <div className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="anon" className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-1.5">
                        {anonymous ? <EyeOff className="w-3.5 h-3.5 text-emerald-500" aria-hidden /> : <Eye className="w-3.5 h-3.5 text-emerald-500" aria-hidden />}
                        Anonymous
                      </Label>
                    </div>
                    <Switch id="anon" checked={anonymous} onCheckedChange={setAnonymous} aria-label="Toggle anonymous voting" />
                  </div>
                  <p className="text-xs text-muted-foreground">{anonymous ? "Voter identities are hashed — even you can't see them" : "You can see who voted for what"}</p>
                </div>

                <Button onClick={handleCreate} disabled={creating || !conversationId.trim()} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                  {creating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Publishing…</>
                  ) : (
                    <><BarChart3 className="w-4 h-4 mr-2" aria-hidden /> Publish poll</>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="browse" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                {activePoll && (
                  <div className="space-y-3 mb-4">
                    <button
                      onClick={() => setActivePoll(null)}
                      className="text-xs text-muted-foreground hover:text-foreground transition"
                    >
                      ← Back to list
                    </button>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{activePoll.poll.question}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" aria-hidden /> {totalVotes} votes</span>
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          Live
                        </Badge>
                        {activePoll.poll.anonymous && (
                          <Badge className="bg-muted/40 text-muted-foreground border-transparent">
                            <EyeOff className="w-2.5 h-2.5 inline mr-1" aria-hidden /> Anonymous
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {activePoll.options.map((opt, idx) => {
                        const pct = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
                        const voted = activePoll.voterChoice.includes(opt.id);
                        const canVote = activePoll.voterChoice.length === 0 || activePoll.poll.multiChoice;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => canVote && handleVote(activePoll.poll.id, [opt.id])}
                            disabled={!canVote || voting !== null}
                            className={cn(
                              "relative w-full text-left p-3 rounded-xl border overflow-hidden transition",
                              canVote ? "border-border/60 hover:border-emerald-500/50 cursor-pointer" : "border-border/40 cursor-default",
                              voted && "border-emerald-500 ring-1 ring-emerald-500/40",
                            )}
                          >
                            <div
                              className={cn(
                                "absolute inset-y-0 left-0 transition-all duration-700 ease-out opacity-25",
                                OPTION_TINTS[idx % OPTION_TINTS.length],
                              )}
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative flex items-center justify-between">
                              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                                {voted && <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden />}
                                {opt.text}
                              </span>
                              <span className="text-sm font-semibold text-foreground tabular-nums">
                                {pct.toFixed(0)}%
                                <span className="text-xs text-muted-foreground ml-1.5">({opt.votes})</span>
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!activePoll && (
                  loadingPolls ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground" aria-live="polite">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden /> Loading…
                    </div>
                  ) : polls.length === 0 ? (
                    <div className="glass backdrop-blur-xl border border-dashed border-white/20 rounded-xl p-8 text-center">
                      <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden />
                      <p className="text-sm text-muted-foreground">No polls in this conversation yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Switch to Create and publish your first poll.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {polls.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => refreshActive(p.id)}
                          className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3 hover:border-emerald-500/40 transition w-full text-left"
                        >
                          <h4 className="font-medium text-foreground text-sm mb-1">{p.question}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" aria-hidden /> {p.options.reduce((s, o) => s + o.votes, 0)} votes</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden /> {new Date(p.createdAt).toLocaleDateString()}</span>
                            <span>{p.options.length} options</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </OverlayShell>
  );
}

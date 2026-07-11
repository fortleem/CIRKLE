"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Trash2, BarChart3, Check, Loader2, Clock, Users,
  TrendingUp,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── API response shapes ────────────────────────────────────────────────────

interface PollOption {
  id: string;
  text: string;
  votes: number;
}
interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  duration: number;
  createdAt: string;
  expiresAt: string;
  postId?: string | null;
  totalVotes: number;
  hasVoted?: string | null;
  expired: boolean;
}

const DURATIONS = [
  { value: "1h", label: "1 hour" },
  { value: "6h", label: "6 hours" },
  { value: "24h", label: "24 hours" },
  { value: "3d", label: "3 days" },
  { value: "7d", label: "7 days" },
];

const OPTION_TINTS = [
  "bg-primary/70",
  "bg-secondary/70",
  "bg-accent/70",
  "bg-steel/70",
  "bg-emerald-500/70",
  "bg-violet-500/70",
];

export function PollCreator({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username ?? "anonymous";

  const [mode, setMode] = useState<"create" | "browse">("create");

  // ── Create-form state ──
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [duration, setDuration] = useState("24h");
  const [creating, setCreating] = useState(false);

  // ── Browse state ──
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loadingPolls, setLoadingPolls] = useState(false);

  // ── Active poll (voting/results view) ──
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [voting, setVoting] = useState<string | null>(null);

  const fetchPolls = useCallback(async () => {
    setLoadingPolls(true);
    try {
      const res = await fetch(`/api/polls?username=${encodeURIComponent(username)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { polls: Poll[] };
      setPolls(data.polls);
    } catch {
      setPolls([]);
    } finally {
      setLoadingPolls(false);
    }
  }, [username]);

  const refreshActive = useCallback(async (pollId: string) => {
    try {
      const res = await fetch(`/api/polls/${pollId}/results?username=${encodeURIComponent(username)}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { poll: Poll };
      setActivePoll(data.poll);
    } catch {
      /* no-op */
    }
  }, [username]);

  useEffect(() => {
    if (open && mode === "browse") {
      fetchPolls();
    }
  }, [open, mode, fetchPolls]);

  // Live-refresh the active poll every 4s so the bar chart animates as
  // votes come in.
  useEffect(() => {
    if (!open || !activePoll) return;
    const id = setInterval(() => refreshActive(activePoll.id), 4000);
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
    const cleanQuestion = question.trim();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanQuestion.length < 3) {
      toast.error("Question must be at least 3 characters");
      return;
    }
    if (cleanOptions.length < 2) {
      toast.error("At least 2 options are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          options: cleanOptions,
          createdBy: username,
          duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create poll");
      toast.success("Poll published");
      setActivePoll(data.poll as Poll);
      setMode("browse");
      setQuestion("");
      setOptions(["", ""]);
      setDuration("24h");
      await fetchPolls();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create poll");
    } finally {
      setCreating(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    setVoting(optionId);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to vote");
      toast.success("Vote recorded");
      await refreshActive(pollId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to vote");
    } finally {
      setVoting(null);
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-2xl" ariaLabel="Polls & Quizzes">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Polls & Quizzes</h2>
              <p className="text-xs text-muted-foreground">Live results · 1h–7d durations · one vote per user</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4">
          <button
            onClick={() => setMode("create")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition",
              mode === "create"
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
            )}
          >
            <Plus className="w-3.5 h-3.5 inline mr-1.5" /> Create
          </button>
          <button
            onClick={() => { setMode("browse"); fetchPolls(); }}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition",
              mode === "browse"
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
            )}
          >
            <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" /> My polls ({polls.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {mode === "create" && !activePoll && (
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    disabled={options.length >= 6}
                    className="mt-1"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add option
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          <Clock className="w-3.5 h-3.5 inline mr-2 text-muted-foreground" />
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full bg-gradient-gold text-charcoal hover:opacity-90"
                >
                  {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                  Publish poll
                </Button>
              </motion.div>
            )}

            {mode === "browse" && !activePoll && (
              <motion.div
                key="browse"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {loadingPolls ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : polls.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No polls yet. Create one to see it here.</p>
                  </div>
                ) : (
                  polls.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setActivePoll(p); refreshActive(p.id); }}
                      className="w-full text-left p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="font-medium text-foreground line-clamp-2">{p.question}</p>
                        <span className={cn(
                          "shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium",
                          p.expired
                            ? "bg-muted text-muted-foreground"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                        )}>
                          {p.expired ? "Closed" : "Live"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.totalVotes} votes</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {DURATIONS.find((d) => d.value === "24h")?.label}</span>
                        <span>{p.options.length} options</span>
                      </div>
                    </button>
                  ))
                )}
              </motion.div>
            )}

            {activePoll && (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <button
                  onClick={() => setActivePoll(null)}
                  className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1"
                >
                  ← Back to list
                </button>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{activePoll.question}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {activePoll.totalVotes} votes</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full font-medium",
                      activePoll.expired
                        ? "bg-muted text-muted-foreground"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                    )}>
                      {activePoll.expired ? "Closed" : "Live · auto-refreshes every 4s"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {activePoll.options.map((opt, idx) => {
                    const pct = activePoll.totalVotes > 0 ? (opt.votes / activePoll.totalVotes) * 100 : 0;
                    const voted = activePoll.hasVoted === opt.id;
                    const canVote = !activePoll.hasVoted && !activePoll.expired;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => canVote && handleVote(activePoll.id, opt.id)}
                        disabled={!canVote || voting !== null}
                        className={cn(
                          "relative w-full text-left p-3 rounded-xl border overflow-hidden transition",
                          canVote
                            ? "border-border/60 hover:border-secondary/50 cursor-pointer"
                            : "border-border/40 cursor-default",
                          voted && "border-secondary ring-1 ring-secondary/40",
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
                            {voted && <Check className="w-3.5 h-3.5 text-secondary" />}
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

                {activePoll.hasVoted && (
                  <p className="text-xs text-center text-muted-foreground">
                    You voted. Results update live as others vote.
                  </p>
                )}
                {activePoll.expired && (
                  <p className="text-xs text-center text-muted-foreground">This poll has closed.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </OverlayShell>
  );
}

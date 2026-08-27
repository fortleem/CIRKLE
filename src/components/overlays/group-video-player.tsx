// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Pause, Loader2, Users, Volume2, SkipForward, SkipBack, MessageSquare,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Playback {
  id: string;
  videoId: string;
  conversationId: string;
  startedBy: string;
  state: "playing" | "paused" | "ended";
  currentTimeSec: number;
  updatedAt: string;
  participants: string;
  createdAt: string;
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

function parseParticipants(p: string): string[] {
  try {
    const v = JSON.parse(p);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GroupVideoPlayer({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";
  const [conversationId, setConversationId] = useState("");
  const [videoId, setVideoId] = useState("");
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<Array<{ id: string; user: string; text: string; at: string }>>([]);
  const [chatInput, setChatInput] = useState("");

  // Local playback time (projected)
  const [localTime, setLocalTime] = useState(0);

  const fetchPlayback = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `/api/synced-playback?playbackId=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setPlayback(data.playback);
    } catch {
      setPlayback(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll playback state every 3s when active
  useEffect(() => {
    if (!open || !playback) return;
    const id = setInterval(() => fetchPlayback(playback.id), 3000);
    return () => clearInterval(id);
  }, [open, playback?.id, fetchPlayback]);

  // Project local time when playing
  useEffect(() => {
    if (!playback || playback.state !== "playing") return;
    const id = setInterval(() => {
      setLocalTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [playback?.id, playback?.state, playback?.updatedAt]);

  useEffect(() => {
    if (playback) {
      const baseTime = playback.currentTimeSec;
      const elapsedSec = playback.state === "playing"
        ? (Date.now() - new Date(playback.updatedAt).getTime()) / 1000
        : 0;
      setLocalTime(baseTime + elapsedSec);
    }
  }, [playback]);

  useEffect(() => {
    if (open) {
      setConversationId("");
      setVideoId("");
      setPlayback(null);
      setChatMsgs([]);
      setChatInput("");
    }
  }, [open]);

  const handleStart = async () => {
    if (!conversationId.trim() || !videoId.trim()) {
      toast.error("Conversation ID and Video ID are required");
      return;
    }
    if (!userId) {
      toast.error("Sign in to start a synced playback");
      return;
    }
    setStarting(true);
    try {
      const res = await fetchWithTimeout("/api/synced-playback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          conversationId: conversationId.trim(),
          videoId: videoId.trim(),
          startedBy: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start playback");
      toast.success("Watch party started");
      window.dispatchEvent(new CustomEvent("circle:group-video-player", {
        detail: { videoId: videoId.trim(), conversationId: conversationId.trim() },
      }));
      setPlayback(data.playback);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Start failed");
    } finally {
      setStarting(false);
    }
  };

  const handleSync = async (newState: "playing" | "paused" | "ended", newTime?: number) => {
    if (!playback) return;
    setSyncing(true);
    try {
      const res = await fetchWithTimeout("/api/synced-playback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          playbackId: playback.id,
          state: newState,
          currentTimeSec: typeof newTime === "number" ? newTime : Math.floor(localTime),
          userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync");
      setPlayback(data.playback);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleSeek = (delta: number) => {
    const newTime = Math.max(0, localTime + delta);
    setLocalTime(newTime);
    handleSync(playback?.state ?? "playing", newTime);
  };

  const handleSendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMsgs((prev) => [
      ...prev,
      { id: `c_${Date.now()}`, user: userId, text, at: new Date().toISOString() },
    ]);
    setChatInput("");
  };

  const participants = playback ? parseParticipants(playback.participants) : [];

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-4xl" ariaLabel="Group video player — synced watch party">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <Play className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Watch Party</h2>
              <p className="text-xs text-muted-foreground">Synced video controls + group chat sidebar</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden p-5">
          {!playback ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass backdrop-blur-xl border border-white/10 rounded-xl p-6 max-w-md mx-auto space-y-4"
            >
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-500" aria-hidden />
                <h3 className="font-semibold text-foreground text-sm">Start a watch party</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conv-id">Conversation ID</Label>
                <Input
                  id="conv-id"
                  placeholder="e.g. conv_xyz123"
                  value={conversationId}
                  onChange={(e) => setConversationId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vid-id">Video ID</Label>
                <Input
                  id="vid-id"
                  placeholder="e.g. vid_demo_001"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                />
              </div>
              <Button
                onClick={handleStart}
                disabled={starting || !conversationId.trim() || !videoId.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {starting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Starting…</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" aria-hidden /> Start synced playback</>
                )}
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              {/* Video player */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                <div
                  className="relative aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center"
                  aria-label={`Video ${playback.videoId}`}
                  role="region"
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-black to-violet-500/10"
                    aria-hidden
                  />
                  <div className="relative text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                      {playback.state === "playing" ? (
                        <Play className="w-7 h-7 text-emerald-500" aria-hidden />
                      ) : (
                        <Pause className="w-7 h-7 text-emerald-500" aria-hidden />
                      )}
                    </div>
                    <p className="text-white font-mono text-sm">{playback.videoId}</p>
                    <p className="text-white/60 text-xs mt-1">
                      {playback.state === "playing" ? "Now playing" : playback.state === "paused" ? "Paused" : "Ended"}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3 space-y-3" role="group" aria-label="Playback controls">
                  {/* Timeline */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{fmtTime(localTime)}</span>
                      <span className="font-mono">Synced with {participants.length} viewer{participants.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="relative h-2 bg-muted/40 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuenow={Math.floor(localTime)} aria-valuemax={7200}>
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-emerald-500"
                        animate={{ width: `${Math.min(100, (localTime / 7200) * 100)}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      onClick={() => handleSeek(-10)}
                      disabled={syncing}
                      variant="outline"
                      size="icon"
                      aria-label="Rewind 10 seconds"
                    >
                      <SkipBack className="w-4 h-4" aria-hidden />
                    </Button>
                    <Button
                      onClick={() => handleSync(playback.state === "playing" ? "paused" : "playing")}
                      disabled={syncing}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      aria-label={playback.state === "playing" ? "Pause" : "Play"}
                    >
                      {syncing ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      ) : playback.state === "playing" ? (
                        <Pause className="w-4 h-4" aria-hidden />
                      ) : (
                        <Play className="w-4 h-4" aria-hidden />
                      )}
                    </Button>
                    <Button
                      onClick={() => handleSeek(10)}
                      disabled={syncing}
                      variant="outline"
                      size="icon"
                      aria-label="Skip 10 seconds"
                    >
                      <SkipForward className="w-4 h-4" aria-hidden />
                    </Button>
                    <Button
                      onClick={() => handleSync("ended")}
                      variant="ghost"
                      size="sm"
                      aria-label="End playback"
                      className="ml-2 text-rose-500 hover:text-rose-600"
                    >
                      End
                    </Button>
                  </div>

                  {/* Participants */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Users className="w-3.5 h-3.5 text-emerald-500" aria-hidden />
                    <div className="flex flex-wrap gap-1.5">
                      {participants.map((p) => (
                        <Badge
                          key={p}
                          className={cn(
                            "border",
                            p === userId
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-muted/40 text-muted-foreground border-transparent",
                          )}
                        >
                          @{p}{p === userId && " (you)"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat sidebar */}
              <aside aria-label="Watch party chat" className="glass backdrop-blur-xl border border-white/10 rounded-xl flex flex-col h-full min-h-[400px]">
                <div className="p-3 border-b border-border/40 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-500" aria-hidden />
                  <h3 className="text-sm font-semibold text-foreground">Watch chat</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[50vh] lg:max-h-none" role="log" aria-live="polite">
                  {chatMsgs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Chat with your watch party here — messages are local-only in this demo.
                    </p>
                  ) : (
                    <AnimatePresence initial={false}>
                      {chatMsgs.map((m) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs"
                        >
                          <span className="font-medium text-emerald-500">@{m.user}</span>
                          <span className="text-muted-foreground ml-1.5">{m.text}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
                <div className="p-3 border-t border-border/40 flex gap-2">
                  <Input
                    placeholder="Type a message…"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSendChat(); } }}
                    aria-label="Send chat message"
                  />
                  <Button onClick={handleSendChat} size="icon" aria-label="Send">
                    <Volume2 className="w-4 h-4" aria-hidden />
                  </Button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}

// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Camera, Loader2, Plus, Eye, Clock, Image as ImageIcon, Video, Type,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Story {
  id: string;
  authorId: string;
  type: "photo" | "video" | "text";
  mediaUrl: string | null;
  caption: string | null;
  bgColor: string | null;
  viewers: string;
  expiresAt: string;
  createdAt: string;
}

interface StoryFeed {
  stories: Story[];
}

const BG_COLORS = ["#14b8a6", "#f59e0b", "#8b5cf6", "#ec4899", "#0ea5e9", "#10b981"];

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

function parseViewers(viewers: string): string[] {
  try {
    const v = JSON.parse(viewers);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function StoryStatus({ open, onClose }: Props) {
  const { user } = useAuth();
  const viewerId = user?.username ?? "";
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"feed" | "create">("feed");

  // Create form
  const [type, setType] = useState<"photo" | "video" | "text">("text");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [creating, setCreating] = useState(false);

  // Viewer
  const [viewing, setViewing] = useState<Story | null>(null);
  const [viewers, setViewers] = useState<string[]>([]);
  const [viewIdx, setViewIdx] = useState(0);

  const fetchStories = useCallback(async () => {
    if (!viewerId) return;
    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `/api/stories?viewerId=${encodeURIComponent(viewerId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as StoryFeed;
      setStories(data.stories ?? []);
    } catch {
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [viewerId]);

  useEffect(() => {
    if (open) {
      setMode("feed");
      setType("text");
      setCaption("");
      setMediaUrl("");
      setBgColor(BG_COLORS[0]);
      setViewing(null);
      fetchStories();
    }
  }, [open, fetchStories]);

  const handleCreate = async () => {
    if (!viewerId) {
      toast.error("Sign in to post a story");
      return;
    }
    if (type === "text" && caption.trim().length < 1) {
      toast.error("Caption is required for text stories");
      return;
    }
    if (type !== "text" && !mediaUrl.trim()) {
      toast.error("Media URL is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetchWithTimeout("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: viewerId,
          type,
          mediaUrl: type !== "text" ? mediaUrl.trim() : null,
          caption: caption.trim() || null,
          bgColor: type === "text" ? bgColor : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create story");
      toast.success("Story posted", {
        description: "Auto-expires in 24 hours",
      });
      setCaption("");
      setMediaUrl("");
      setMode("feed");
      window.dispatchEvent(new CustomEvent("circle:story-status"));
      await fetchStories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenStory = async (story: Story, idx: number) => {
    setViewing(story);
    setViewIdx(idx);
    setViewers(parseViewers(story.viewers));
    // Mark as viewed
    try {
      const res = await fetchWithTimeout(`/api/stories/${story.id}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.story) {
          setViewing(data.story);
          setViewers(parseViewers(data.story.viewers));
        }
      }
    } catch {
      /* no-op */
    }
  };

  const handleNext = () => {
    if (!viewing) return;
    const next = viewIdx + 1;
    if (next < stories.length) {
      handleOpenStory(stories[next], next);
    } else {
      setViewing(null);
    }
  };

  const handlePrev = () => {
    if (!viewing) return;
    const prev = viewIdx - 1;
    if (prev >= 0) {
      handleOpenStory(stories[prev], prev);
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-2xl" ariaLabel="Stories — 24h disappearing status">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <Camera className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Stories</h2>
              <p className="text-xs text-muted-foreground">24h disappearing · like WhatsApp Status</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4">
          <button
            onClick={() => setMode("feed")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition",
              mode === "feed"
                ? "bg-emerald-500 text-white"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
            )}
            aria-pressed={mode === "feed"}
          >
            Feed
          </button>
          <button
            onClick={() => setMode("create")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition",
              mode === "create"
                ? "bg-emerald-500 text-white"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
            )}
            aria-pressed={mode === "create"}
          >
            <Plus className="w-3.5 h-3.5 inline mr-1.5" aria-hidden /> New story
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {mode === "create" ? (
              <motion.div key="create" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Story type</Label>
                  <div className="flex gap-2" role="radiogroup" aria-label="Story type">
                    {[
                      { v: "text", icon: Type, label: "Text" },
                      { v: "photo", icon: ImageIcon, label: "Photo" },
                      { v: "video", icon: Video, label: "Video" },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          role="radio"
                          aria-checked={type === opt.v}
                          onClick={() => setType(opt.v as any)}
                          className={cn(
                            "flex-1 p-3 rounded-xl border transition flex flex-col items-center gap-1",
                            type === opt.v
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border-border/60 hover:border-emerald-500/40 bg-card/40",
                          )}
                        >
                          <Icon className="w-4 h-4" aria-hidden />
                          <span className="text-xs">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {type === "text" && (
                  <div className="space-y-2">
                    <Label>Background color</Label>
                    <div className="flex gap-2">
                      {BG_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Background ${c}`}
                          aria-checked={bgColor === c}
                          role="radio"
                          onClick={() => setBgColor(c)}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition",
                            bgColor === c ? "ring-2 ring-offset-2 ring-offset-background border-white" : "border-transparent",
                          )}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {type !== "text" && (
                  <div className="space-y-2">
                    <Label htmlFor="media-url">Media URL</Label>
                    <Input
                      id="media-url"
                      placeholder="https://…"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="caption">
                    Caption {type === "text" && <span className="text-rose-500">*</span>}
                    <span className="ml-2 text-xs text-muted-foreground">{caption.length}/280</span>
                  </Label>
                  <Textarea
                    id="caption"
                    placeholder={type === "text" ? "Write your status…" : "Add a caption (optional)"}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    maxLength={280}
                  />
                </div>

                {type === "text" && (
                  <div
                    className="rounded-xl p-6 text-center text-foreground font-medium"
                    style={{ background: bgColor, color: "#fff" }}
                    aria-label="Story preview"
                  >
                    {caption || "Your story preview will appear here…"}
                  </div>
                )}

                <Button onClick={handleCreate} disabled={creating} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                  {creating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Posting…</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" aria-hidden /> Post story</>
                  )}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  Stories auto-expire after 24 hours. You can see who viewed them.
                </p>
              </motion.div>
            ) : (
              <motion.div key="feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground" aria-live="polite">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden /> Loading stories…
                  </div>
                ) : stories.length === 0 ? (
                  <div className="glass backdrop-blur-xl border border-dashed border-white/20 rounded-xl p-8 text-center">
                    <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden />
                    <p className="text-sm text-muted-foreground">No active stories</p>
                    <p className="text-xs text-muted-foreground mt-1">Be the first to share a story!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="list" aria-label="Stories feed">
                    {stories.map((s, idx) => {
                      const v = parseViewers(s.viewers);
                      const seen = v.includes(viewerId);
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleOpenStory(s, idx)}
                          role="listitem"
                          className={cn(
                            "relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition group",
                            seen
                              ? "border-border/40 hover:border-emerald-500/40"
                              : "border-emerald-500 hover:border-emerald-500",
                          )}
                          style={s.type === "text" && s.bgColor ? { background: s.bgColor } : { background: "#1f2937" }}
                          aria-label={`Open story from @${s.authorId}`}
                        >
                          {s.type !== "text" && s.mediaUrl && (
                            <img src={s.mediaUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
                          <div className="absolute bottom-2 left-2 right-2 text-left">
                            <p className="text-xs font-medium text-white truncate">@{s.authorId}</p>
                            <div className="flex items-center gap-1 text-[10px] text-white/80 mt-0.5">
                              <Clock className="w-2.5 h-2.5" aria-hidden />
                              <span>{Math.max(0, Math.ceil((new Date(s.expiresAt).getTime() - Date.now()) / 3600000))}h left</span>
                            </div>
                          </div>
                          {!seen && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Story viewer modal */}
      <AnimatePresence>
        {viewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label={`Story from @${viewing.authorId}`}
            onClick={() => setViewing(null)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setViewing(null); }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              aria-label="Close story"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              disabled={viewIdx === 0}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white"
              aria-label="Previous story"
            >
              ←
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              disabled={viewIdx >= stories.length - 1}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white"
              aria-label="Next story"
            >
              →
            </button>

            <motion.div
              key={viewing.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full mx-4 aspect-[9/16] rounded-2xl overflow-hidden relative flex flex-col justify-end p-5"
              style={{ background: viewing.type === "text" ? (viewing.bgColor ?? "#14b8a6") : "#000" }}
              onClick={(e) => e.stopPropagation()}
            >
              {viewing.type !== "text" && viewing.mediaUrl && (
                <img src={viewing.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {viewing.caption && (
                <div className="relative">
                  <p className="text-white text-lg font-medium drop-shadow-lg">{viewing.caption}</p>
                </div>
              )}
              <div className="relative mt-4 flex items-center justify-between text-white/90">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center" aria-hidden>
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">@{viewing.authorId}</p>
                    <p className="text-[10px] opacity-80">
                      {Math.max(0, Math.ceil((new Date(viewing.expiresAt).getTime() - Date.now()) / 3600000))}h left
                    </p>
                  </div>
                </div>
                <Badge className="bg-black/40 text-white border-white/20">
                  <Eye className="w-2.5 h-2.5 inline mr-1" aria-hidden />
                  {viewers.length} {viewers.length === 1 ? "view" : "views"}
                </Badge>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </OverlayShell>
  );
}

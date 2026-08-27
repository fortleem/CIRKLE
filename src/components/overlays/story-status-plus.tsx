// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, Plus, Star, Trash2, Send, Heart, Eye, MessageCircle,
  Sparkles, Archive, Camera, Type, ChevronLeft, ChevronRight,
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

interface StoryGroup {
  id: string;
  createdAt: string;
  expiresAt: string;
  frameCount: number;
}

interface StoryFrame {
  id: string;
  storyGroupId: string;
  authorId: string;
  order: number;
  type: "photo" | "video" | "text";
  mediaUrl: string | null;
  caption: string | null;
  bgColor: string | null;
  createdAt: string;
  expiresAt: string;
}

interface StoryHighlight {
  id: string;
  authorId: string;
  name: string;
  emoji: string;
  coverColor: string;
  storyIds: string[];
}

interface ArchiveEntry {
  id: string;
  storyId: string;
  type: "photo" | "video" | "text";
  mediaUrl: string | null;
  caption: string | null;
  bgColor: string | null;
  archivedAt: string;
  originalCreatedAt: string;
}

interface ReplyRecord {
  id: string;
  storyFrameId: string;
  authorId: string;
  reactorId: string;
  body: string;
  createdAt: string;
}

interface ReactionSummary {
  emoji: string;
  count: number;
  users: string[];
}

const EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥", "👏", "🙏"];
const BG_COLORS = ["#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#0ea5e9", "#14b8a6"];

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export function StoryStatusPlus({ open, onClose }: Props) {
  const { user } = useAuth();
  const authorId = user?.username ?? "";

  const [tab, setTab] = useState<"create" | "groups" | "highlights" | "archive" | "replies">("groups");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [replies, setReplies] = useState<ReplyRecord[]>([]);

  // Create form
  const [frames, setFrames] = useState<Array<{ type: "text" | "photo"; caption: string; bgColor: string }>>([
    { type: "text", caption: "", bgColor: "#10b981" },
  ]);
  const [creating, setCreating] = useState(false);

  // New highlight form
  const [highlightName, setHighlightName] = useState("");
  const [highlightEmoji, setHighlightEmoji] = useState("⭐");
  const [creatingHighlight, setCreatingHighlight] = useState(false);

  // Viewer state (for an opened group)
  const [viewerGroup, setViewerGroup] = useState<{ frames: StoryFrame[]; index: number } | null>(null);
  const [frameReactions, setFrameReactions] = useState<ReactionSummary[]>([]);
  const [replyText, setReplyText] = useState("");

  const fetchMeta = useCallback(async () => {
    if (!authorId) return;
    setLoading(true);
    try {
      const [gRes, hRes, aRes, rRes] = await Promise.all([
        fetchWithTimeout(`/api/stories-plus?authorId=${encodeURIComponent(authorId)}&groups=1`, { cache: "no-store" }),
        fetchWithTimeout(`/api/stories-plus?authorId=${encodeURIComponent(authorId)}&highlights=1`, { cache: "no-store" }),
        fetchWithTimeout(`/api/stories-plus?authorId=${encodeURIComponent(authorId)}&archive=1`, { cache: "no-store" }),
        fetchWithTimeout(`/api/stories-plus?authorId=${encodeURIComponent(authorId)}&authorReplies=1`, { cache: "no-store" }),
      ]);
      if (gRes.ok) setGroups((await gRes.json()).groups ?? []);
      if (hRes.ok) setHighlights((await hRes.json()).highlights ?? []);
      if (aRes.ok) setArchive((await aRes.json()).archive ?? []);
      if (rRes.ok) setReplies((await rRes.json()).replies ?? []);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [authorId]);

  useEffect(() => {
    if (open) fetchMeta();
  }, [open, fetchMeta]);

  const openGroup = useCallback(async (groupId: string) => {
    try {
      const res = await fetchWithTimeout(`/api/stories-plus?groupId=${groupId}&group=1`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const frames = (data.frames ?? []) as StoryFrame[];
        if (frames.length > 0) {
          setViewerGroup({ frames, index: 0 });
          // Load reactions for the first frame
          const rRes = await fetchWithTimeout(`/api/stories-plus?frameId=${frames[0].id}&reactions=1`, { cache: "no-store" });
          if (rRes.ok) setFrameReactions((await rRes.json()).reactions ?? []);
        }
      }
    } catch {
      /* swallow */
    }
  }, []);

  const nextFrame = useCallback(async () => {
    if (!viewerGroup) return;
    const next = Math.min(viewerGroup.index + 1, viewerGroup.frames.length - 1);
    setViewerGroup({ ...viewerGroup, index: next });
    const frameId = viewerGroup.frames[next].id;
    try {
      const rRes = await fetchWithTimeout(`/api/stories-plus?frameId=${frameId}&reactions=1`, { cache: "no-store" });
      if (rRes.ok) setFrameReactions((await rRes.json()).reactions ?? []);
    } catch {
      /* swallow */
    }
  }, [viewerGroup]);

  const prevFrame = useCallback(async () => {
    if (!viewerGroup) return;
    const prev = Math.max(viewerGroup.index - 1, 0);
    setViewerGroup({ ...viewerGroup, index: prev });
    const frameId = viewerGroup.frames[prev].id;
    try {
      const rRes = await fetchWithTimeout(`/api/stories-plus?frameId=${frameId}&reactions=1`, { cache: "no-store" });
      if (rRes.ok) setFrameReactions((await rRes.json()).reactions ?? []);
    } catch {
      /* swallow */
    }
  }, [viewerGroup]);

  const handleReact = async (emoji: string) => {
    if (!viewerGroup || !authorId) return;
    const frame = viewerGroup.frames[viewerGroup.index];
    try {
      await fetchWithTimeout("/api/stories-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", frameId: frame.id, reactorId: authorId, emoji }),
      });
      toast.success("Reaction sent");
      const rRes = await fetchWithTimeout(`/api/stories-plus?frameId=${frame.id}&reactions=1`, { cache: "no-store" });
      if (rRes.ok) setFrameReactions((await rRes.json()).reactions ?? []);
      window.dispatchEvent(new CustomEvent("circle:story-status-plus", {
        detail: { action: "react", frameId: frame.id, emoji },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleReply = async () => {
    if (!viewerGroup || !authorId || !replyText.trim()) return;
    const frame = viewerGroup.frames[viewerGroup.index];
    try {
      const res = await fetchWithTimeout("/api/stories-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", frameId: frame.id, senderId: authorId, body: replyText.trim() }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "reply failed");
      }
      toast.success("Reply sent");
      setReplyText("");
      await fetchMeta();
      window.dispatchEvent(new CustomEvent("circle:story-status-plus", {
        detail: { action: "reply", frameId: frame.id },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleCreateMultiFrame = async () => {
    if (!authorId) return;
    if (frames.length === 0) {
      toast.error("Add at least one frame");
      return;
    }
    if (frames.some((f) => f.type === "text" && !f.caption.trim())) {
      toast.error("Text frames require a caption");
      return;
    }
    setCreating(true);
    try {
      const res = await fetchWithTimeout("/api/stories-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createMultiFrame",
          authorId,
          frames: frames.map((f) => ({
            type: f.type,
            caption: f.caption,
            bgColor: f.bgColor,
            mediaUrl: f.type === "photo" ? "https://images.unsplash.com/photo-1500673922987-e212871b226c?w=800" : null,
          })),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "create failed");
      }
      toast.success(`Story with ${frames.length} frame${frames.length > 1 ? "s" : ""} created`);
      setFrames([{ type: "text", caption: "", bgColor: "#10b981" }]);
      await fetchMeta();
      setTab("groups");
      window.dispatchEvent(new CustomEvent("circle:story-status-plus", {
        detail: { action: "createMultiFrame", frameCount: frames.length },
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateHighlight = async () => {
    if (!authorId || !highlightName.trim()) return;
    setCreatingHighlight(true);
    try {
      const res = await fetchWithTimeout("/api/stories-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createHighlight",
          authorId,
          name: highlightName.trim(),
          emoji: highlightEmoji,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "create failed");
      }
      toast.success("Highlight created");
      setHighlightName("");
      await fetchMeta();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreatingHighlight(false);
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    try {
      await fetchWithTimeout("/api/stories-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteHighlight", highlightId: id }),
      });
      setHighlights((cur) => cur.filter((h) => h.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleArchive = async (storyId: string) => {
    try {
      const res = await fetchWithTimeout("/api/stories-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archiveStory", storyId }),
      });
      if (res.ok) {
        toast.success("Story archived");
        await fetchMeta();
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDeleteArchive = async (entryId: string) => {
    try {
      await fetchWithTimeout("/api/stories-plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteArchiveEntry", entryId }),
      });
      setArchive((cur) => cur.filter((a) => a.id !== entryId));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const addFrame = () => {
    if (frames.length >= 10) return;
    setFrames([...frames, { type: "text", caption: "", bgColor: BG_COLORS[frames.length % BG_COLORS.length] }]);
  };

  const removeFrame = (i: number) => {
    setFrames(frames.filter((_, idx) => idx !== i));
  };

  const updateFrame = (i: number, patch: Partial<typeof frames[0]>) => {
    setFrames(frames.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  };

  // Viewer (frame-by-frame carousel)
  if (viewerGroup) {
    const frame = viewerGroup.frames[viewerGroup.index];
    return (
      <OverlayShell open={open} onClose={() => { setViewerGroup(null); onClose(); }} variant="fullscreen" ariaLabel="Story viewer">
        <div className="relative w-full h-full flex flex-col bg-black">
          {/* Progress bars */}
          <div className="flex gap-1 p-2">
            {viewerGroup.frames.map((_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
                {i === viewerGroup.index && (
                  <motion.div
                    className="h-full bg-emerald-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 5, linear: true }}
                  />
                )}
                {i < viewerGroup.index && <div className="h-full bg-emerald-500" style={{ width: "100%" }} />}
              </div>
            ))}
          </div>

          {/* Frame content */}
          <div className="flex-1 flex items-center justify-center relative" style={{ backgroundColor: frame.bgColor ?? "#0a0a0a" }}>
            {frame.type === "text" && (
              <p className="text-center text-white text-2xl px-6 font-display">{frame.caption}</p>
            )}
            {frame.type === "photo" && (
              <img src={frame.mediaUrl ?? ""} alt={frame.caption ?? "Story"} className="max-w-full max-h-full object-contain" />
            )}
            {frame.caption && frame.type !== "text" && (
              <div className="absolute bottom-20 left-0 right-0 text-center text-white px-6 text-sm font-medium">
                {frame.caption}
              </div>
            )}
            <button
              onClick={prevFrame}
              disabled={viewerGroup.index === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white disabled:opacity-30"
              aria-label="Previous frame"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={nextFrame}
              disabled={viewerGroup.index === viewerGroup.frames.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white disabled:opacity-30"
              aria-label="Next frame"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Reactions row */}
          <div className="px-4 py-3 flex items-center gap-2 justify-center bg-black/80">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => handleReact(e)}
                className="text-2xl hover:scale-110 transition-transform"
                aria-label={`React ${e}`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Reactions summary */}
          {frameReactions.length > 0 && (
            <div className="px-4 py-2 flex flex-wrap gap-2 justify-center bg-black/60">
              {frameReactions.map((r) => (
                <Badge key={r.emoji} className="bg-white/10 text-white border-white/20">
                  {r.emoji} {r.count}
                </Badge>
              ))}
            </div>
          )}

          {/* Reply input */}
          <div className="px-4 py-3 flex items-center gap-2 bg-black/80">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to @${frame.authorId}…`}
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleReply();
              }}
            />
            <Button onClick={handleReply} disabled={!replyText.trim()} size="icon" className="bg-emerald-500 hover:bg-emerald-600">
              <Send className="size-4" />
            </Button>
            <Button onClick={() => setViewerGroup(null)} variant="ghost" size="icon" className="text-white">
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </OverlayShell>
    );
  }

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-2xl" ariaLabel="Story Status — Plus">
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-gradient-to-r from-emerald-500/10 via-transparent to-rose-500/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/30">
              <Sparkles className="size-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">My Stories</h2>
              <p className="text-xs text-muted-foreground">Multi-frame, highlights, reactions, archive</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>

        <nav className="flex items-center gap-1 px-4 py-2 border-b border-border/40 overflow-x-auto" aria-label="Sections">
          {(["create", "groups", "highlights", "archive", "replies"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap capitalize",
                tab === t ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:bg-muted/40",
              )}
              aria-pressed={tab === t}
            >
              {t === "create" && "Create"}
              {t === "groups" && "Stories"}
              {t === "highlights" && "Highlights"}
              {t === "archive" && "Archive"}
              {t === "replies" && `Replies ${replies.length > 0 ? `(${replies.length})` : ""}`}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12" role="status">
              <Loader2 className="size-5 animate-spin text-emerald-500" />
            </div>
          )}

          {!loading && tab === "create" && (
            <div className="space-y-3">
              <Label>Create a multi-frame story (max 10 frames)</Label>
              {frames.map((f, i) => (
                <div key={i} className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Frame {i + 1}</Badge>
                    <button
                      onClick={() => updateFrame(i, { type: "text" })}
                      className={cn("px-2 py-1 text-xs rounded-md", f.type === "text" ? "bg-emerald-500/15 text-emerald-600" : "text-muted-foreground")}
                    >
                      <Type className="size-3 inline mr-1" /> Text
                    </button>
                    <button
                      onClick={() => updateFrame(i, { type: "photo" })}
                      className={cn("px-2 py-1 text-xs rounded-md", f.type === "photo" ? "bg-emerald-500/15 text-emerald-600" : "text-muted-foreground")}
                    >
                      <Camera className="size-3 inline mr-1" /> Photo
                    </button>
                    <div className="flex-1" />
                    {frames.length > 1 && (
                      <button onClick={() => removeFrame(i)} className="text-muted-foreground hover:text-rose-600" aria-label="Remove frame">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <Textarea
                    value={f.caption}
                    onChange={(e) => updateFrame(i, { caption: e.target.value })}
                    placeholder="Caption (max 280 chars)"
                    rows={2}
                  />
                  <div className="flex gap-1">
                    {BG_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateFrame(i, { bgColor: c })}
                        className={cn("size-5 rounded-md", f.bgColor === c && "ring-2 ring-offset-1 ring-offset-background")}
                        style={{ backgroundColor: c }}
                        aria-label={`Bg color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button onClick={addFrame} disabled={frames.length >= 10} variant="outline" size="sm">
                  <Plus className="size-3" /> Add frame
                </Button>
                <Button
                  onClick={handleCreateMultiFrame}
                  disabled={creating || !authorId}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Post Story
                </Button>
              </div>
            </div>
          )}

          {!loading && tab === "groups" && (
            <div className="space-y-2">
              {groups.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Sparkles className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No active story groups. Create one!</p>
                </div>
              )}
              {groups.map((g) => (
                <motion.button
                  key={g.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => openGroup(g.id)}
                  className="w-full text-left rounded-xl border border-border/60 bg-card/40 p-3 hover:border-emerald-500/40"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{g.frameCount} frame{g.frameCount !== 1 ? "s" : ""}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(g.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Eye className="size-4 text-muted-foreground" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {!loading && tab === "highlights" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2">
                <Label>Create highlight</Label>
                <div className="flex gap-2">
                  <select
                    value={highlightEmoji}
                    onChange={(e) => setHighlightEmoji(e.target.value)}
                    className="px-2 py-1 rounded-md border border-border bg-background text-sm"
                  >
                    {["⭐", "📍", "❤️", "🎯", "🏆", "📚", "🎵", "✈️"].map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                  <Input
                    value={highlightName}
                    onChange={(e) => setHighlightName(e.target.value)}
                    placeholder="Highlight name (e.g. Summer Trip)"
                    className="flex-1"
                  />
                  <Button onClick={handleCreateHighlight} disabled={creatingHighlight || !highlightName.trim() || !authorId} size="sm">
                    {creatingHighlight ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {highlights.map((h) => (
                  <div key={h.id} className="rounded-xl border border-border/60 bg-card/40 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{h.emoji}</span>
                      <button onClick={() => handleDeleteHighlight(h.id)} className="text-muted-foreground hover:text-rose-600" aria-label="Delete">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <p className="font-medium text-sm">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.storyIds.length} stories</p>
                  </div>
                ))}
                {highlights.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <Star className="size-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No highlights yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && tab === "archive" && (
            <div className="space-y-2">
              {archive.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Archive className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Archived stories will appear here.</p>
                </div>
              )}
              {archive.map((a) => (
                <div key={a.id} className="rounded-xl border border-border/60 bg-card/40 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="capitalize">{a.type}</Badge>
                      {a.caption && <p className="text-sm mt-1">{a.caption}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Original: {new Date(a.originalCreatedAt).toLocaleString()}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteArchive(a.id)} className="text-muted-foreground hover:text-rose-600" aria-label="Delete">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === "replies" && (
            <div className="space-y-2">
              {replies.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <MessageCircle className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No replies to your stories yet.</p>
                </div>
              )}
              {replies.map((r) => (
                <div key={r.id} className="rounded-xl border border-border/60 bg-card/40 p-3">
                  <p className="text-xs text-muted-foreground">@{r.reactorId} replied:</p>
                  <p className="text-sm mt-1">{r.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}

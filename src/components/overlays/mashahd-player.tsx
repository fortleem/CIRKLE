"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Heart, MessageCircle, Share2, Bookmark, Play, Pause, Volume2, VolumeX,
  Maximize2, Minimize2, Subtitles, Settings, Gift, Bell, ListVideo,
  ThumbsUp, ThumbsDown, Scissors, Languages, ChevronUp, ChevronDown,
  Send, type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Quality = "Auto" | "1080p" | "4K";

/** Inactivity delay before controls auto-hide (YouTube-style). */
const HIDE_DELAY_MS = 3000;
/** Shared easing for control show/hide transitions. */
const EASE = "easeOut" as const;

/**
 * Reel shape — kept compatible with the previous mock so the player UI
 * keeps rendering while a real `/api/posts?module=mashahd` source is wired
 * in. Until then `reels` is empty and the stage shows a "No video
 * selected" placeholder.
 */
interface Reel {
  id: string;
  creator: string;
  caption: string;
  likes: string;
  music: string;
}

const PLACEHOLDER_REEL: Reel = {
  id: "empty",
  creator: "@cirkle",
  caption: "No video selected",
  likes: "0",
  music: "—",
};

// No mock data — reels stay empty until a real source is wired in.
const reels: Reel[] = [];

/**
 * MashahdPlayer — full-screen cinema overlay for short-form video (reels).
 *
 * YouTube-style auto-hide: while playing, every control surface
 * (top bar, bottom controls, prev/next, side rail, badges) fades out
 * 3s after the last mousemove / touchstart / click. Paused state and
 * open settings popover keep controls pinned. A 2px progress strip
 * stays on screen while controls are hidden so the user still sees
 * playback position. Clicking the video while controls are hidden
 * both reveals controls AND toggles play/pause (YouTube's behavior).
 *
 * Comments side rail: togglable via a MessageCircle button in the
 * bottom controls bar (defaults open on desktop, closed on mobile).
 * Hiding it makes the video stage expand to full width with a
 * framer-motion slide-right exit animation.
 */
export function MashahdPlayer({ open, index, onClose }: { open: boolean; index: number; onClose: () => void }) {
  // --- Player state ---
  const [i, setI] = useState(index);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [theater, setTheater] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState<Quality>("Auto");
  const [showSettings, setShowSettings] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comment, setComment] = useState("");
  const [commentFocused, setCommentFocused] = useState(false);
  const [comments, setComments] = useState([
    { u: "@noura", t: "Cinema-grade. The 3:40 ridge shot is unreal." },
    { u: "@majidf", t: "Need the gear list — what stabilizer?" },
    { u: "@layla", t: "Saved for our AlUla trip ✨" },
  ]);

  // --- YouTube-style auto-hide controls ---
  const [controlsVisible, setControlsVisible] = useState(true);
  // Comments side rail: open on desktop, closed on mobile by default.
  const [commentsVisible, setCommentsVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Paused state, open settings popover, or focused comment input force
  // controls to stay visible (no auto-hide). Derived during render.
  const forceShow = !playing || showSettings || commentFocused;
  // Effective visibility = force-show OR the timer-driven visibility.
  const effectiveControlsVisible = forceShow || controlsVisible;

  // Ref mirror of forceShow so the stable resetHideTimer can read the latest
  // value without re-creating on every state change.
  const forceShowRef = useRef(forceShow);
  useEffect(() => { forceShowRef.current = forceShow; }, [forceShow]);

  // When forceShow flips to false (e.g., user resumes playing after pausing
  // with controls hidden), reveal controls so they stay visible for 3s before
  // auto-hiding. (Derived-state-during-render pattern using state — avoids
  // both set-state-in-effect and refs-during-render lint rules.)
  const [prevForceShow, setPrevForceShow] = useState(forceShow);
  if (prevForceShow !== forceShow) {
    setPrevForceShow(forceShow);
    if (!forceShow) {
      setControlsVisible(true);
    }
  }

  /**
   * Reset the 3s auto-hide timer. Called on ANY user activity
   * (mousemove / touchstart / click / wheel — attached below) and on
   * every in-component interaction (seek, toggle, etc).
   * Stable (empty deps) — reads forceShow from a ref so it never goes stale.
   */
  const resetHideTimer = useCallback(() => {
    if (forceShowRef.current) return; // paused / settings / typing — no auto-hide
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, HIDE_DELAY_MS);
  }, []);

  // Derived-state pattern: reset transient state when the player opens or index changes.
  const [prevKey, setPrevKey] = useState(`${open}-${index}`);
  const key = `${open}-${index}`;
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setI(index);
      setProgress(0);
      setLiked(false);
      setDisliked(false);
      setSaved(false);
      setControlsVisible(true);
    }
  }

  // Window-level activity listeners: mousemove / touchstart / click / wheel
  // reset the auto-hide timer. Attached while the player is open.
  // resetHideTimer is stable so listeners are added once per open.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("mousemove", resetHideTimer);
    window.addEventListener("touchstart", resetHideTimer, { passive: true });
    window.addEventListener("click", resetHideTimer);
    window.addEventListener("wheel", resetHideTimer, { passive: true });
    return () => {
      window.removeEventListener("mousemove", resetHideTimer);
      window.removeEventListener("touchstart", resetHideTimer);
      window.removeEventListener("click", resetHideTimer);
      window.removeEventListener("wheel", resetHideTimer);
    };
  }, [open, resetHideTimer]);

  // Manage the auto-hide timer based on forceShow.
  // forceShow=true  → clear the timer (controls pinned visible).
  // forceShow=false → schedule a fresh 3s hide. setControlsVisible lives in
  //                  the setTimeout callback (async), so this effect body
  //                  contains no synchronous setState — passes set-state-in-effect.
  useEffect(() => {
    if (!open) return;
    if (forceShow) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, HIDE_DELAY_MS);
    }
  }, [forceShow, open]);

  // Cleanup timer on close (controlsVisible is reset via the derived-state
  // pattern on reopen — no setState needed here).
  useEffect(() => {
    if (open) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, [open]);

  // Auto-advance progress.
  useEffect(() => {
    if (!open || !playing) return;
    const t = setInterval(() => setProgress((p) => (p + 0.6) % 100), 120);
    return () => clearInterval(t);
  }, [open, playing]);

  // Keyboard shortcuts.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key.toLowerCase() === "m") setMuted((m) => !m);
      else if (e.key.toLowerCase() === "t") setTheater((t) => !t);
      else if (e.key.toLowerCase() === "c") setCommentsVisible((c) => !c);
      else if (e.key === "ArrowDown" && reels.length > 0) { setI((v) => Math.min(v + 1, reels.length - 1)); setProgress(0); }
      else if (e.key === "ArrowUp") { setI((v) => Math.max(v - 1, 0)); setProgress(0); }
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const r = reels[i] ?? reels[0] ?? PLACEHOLDER_REEL;
  // No mock imagery — the cover renders as a gradient placeholder.

  const prev = () => {
    setI((v) => Math.max(0, v - 1));
    setProgress(0);
    setLiked(false);
    setDisliked(false);
  };
  const next = () => {
    if (reels.length === 0) return;
    setI((v) => Math.min(reels.length - 1, v + 1));
    setProgress(0);
    setLiked(false);
    setDisliked(false);
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setComments((c) => [{ u: "@you", t: comment }, ...c]);
    setComment("");
    toast.success("Comment posted");
  };

  /**
   * Video click: toggle play/pause AND reset the auto-hide timer.
   * When controls are hidden, this both reveals them and toggles
   * playback — the YouTube "first click shows controls + toggles"
   * behavior. Controls then stay visible for another 3s.
   */
  const handleVideoClick = () => {
    setPlaying((p) => !p);
    resetHideTimer();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "dark fixed inset-0 z-[140] bg-charcoal text-cream flex flex-col overflow-hidden",
            // Hide the cursor entirely when controls are hidden (cinema mode).
            !effectiveControlsVisible && "cursor-none"
          )}
        >
          {/* ─── Top bar — slides up when controls hidden ─── */}
          <motion.div
            initial={false}
            animate={{ y: effectiveControlsVisible ? 0 : -80, opacity: effectiveControlsVisible ? 1 : 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="absolute top-0 inset-x-0 z-30 flex items-center gap-2 p-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none"
          >
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full glass-strong flex items-center justify-center pointer-events-auto"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-xs opacity-80">Mashahd · Cinema mode</div>
            <div className="flex-1" />
            <button
              onClick={() => setCaptions((c) => !c)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center pointer-events-auto transition",
                captions ? "bg-secondary text-secondary-foreground" : "glass-strong"
              )}
              aria-label={captions ? "Hide captions" : "Show captions"}
              aria-pressed={captions}
            >
              <Subtitles className="w-4 h-4" />
            </button>
            <button
              onClick={() => toast("AI dubbing: Arabic ⇄ English ready")}
              className="w-10 h-10 rounded-full glass-strong flex items-center justify-center pointer-events-auto"
              aria-label="Translate"
            >
              <Languages className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center pointer-events-auto transition",
                showSettings && "bg-secondary text-secondary-foreground"
              )}
              aria-label="Settings"
              aria-pressed={showSettings}
            >
              <Settings className="w-4 h-4" />
            </button>
          </motion.div>

          <div className={cn("flex-1 flex overflow-hidden", theater ? "flex-col" : "lg:flex-row flex-col")}>
            {/* ─── Video stage ─── */}
            <div
              className={cn(
                "relative bg-black flex items-center justify-center group",
                theater ? "w-full flex-1" : "lg:flex-1 w-full aspect-video lg:aspect-auto"
              )}
              onClick={handleVideoClick}
            >
              <motion.div
                key={`cover-${i}`}
                initial={{ scale: 1.05, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-secondary/10"
              />
              {reels.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <span className="text-cream/70 text-sm glass-strong px-4 py-2 rounded-full">
                    No video selected
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-accent/20" />

              {/* P2P + AI Captions badges — fade with controls */}
              <motion.div
                initial={false}
                animate={{ opacity: effectiveControlsVisible ? 1 : 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="absolute top-16 left-3 z-20 flex flex-col gap-2 pointer-events-none"
              >
                <span className="text-[10px] glass-strong px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> P2P · Mesh
                </span>
                <span className="text-[10px] glass-strong px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                  <Subtitles className="w-2.5 h-2.5" /> AI Captions
                </span>
              </motion.div>

              {/* prev / next reel — fade + slide when controls hidden */}
              <motion.button
                type="button"
                initial={false}
                animate={{ opacity: effectiveControlsVisible ? 1 : 0, x: effectiveControlsVisible ? 0 : -12 }}
                transition={{ duration: 0.3, ease: EASE }}
                onClick={(e) => { e.stopPropagation(); prev(); }}
                disabled={i === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass-strong flex items-center justify-center disabled:opacity-30 z-20"
                aria-label="Previous reel"
              >
                <ChevronUp className="w-5 h-5" />
              </motion.button>
              <motion.button
                type="button"
                initial={false}
                animate={{ opacity: effectiveControlsVisible ? 1 : 0, x: effectiveControlsVisible ? 0 : 12 }}
                transition={{ duration: 0.3, ease: EASE }}
                onClick={(e) => { e.stopPropagation(); next(); }}
                disabled={reels.length === 0 || i === reels.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass-strong flex items-center justify-center disabled:opacity-30 z-20"
                aria-label="Next reel"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.button>

              {/* Big play overlay — only when paused (controls are always visible when paused) */}
              <AnimatePresence>
                {!playing && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    onClick={(e) => { e.stopPropagation(); setPlaying(true); resetHideTimer(); }}
                    className="relative z-20 w-20 h-20 rounded-full bg-gradient-hero shadow-float flex items-center justify-center"
                    aria-label="Play"
                  >
                    <Play className="w-9 h-9 ml-1 text-primary-foreground" fill="currentColor" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Captions — always visible when captions on, even when controls are hidden */}
              {captions && (
                <div className="absolute bottom-24 inset-x-0 flex justify-center px-6 pointer-events-none z-10">
                  <span className="text-sm md:text-base bg-black/60 backdrop-blur px-3 py-1.5 rounded text-center">
                    {r.caption}
                  </span>
                </div>
              )}

              {/* Thin "always-on" progress strip — only visible when controls are hidden (YouTube-style) */}
              <AnimatePresence>
                {!effectiveControlsVisible && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-white/15 z-30 pointer-events-none"
                  >
                    <div className="h-full bg-gradient-gold" style={{ width: `${progress}%` }} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Full bottom controls — slides down when controls hidden ─── */}
              <motion.div
                initial={false}
                animate={{ y: effectiveControlsVisible ? 0 : 100, opacity: effectiveControlsVisible ? 1 : 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className={cn(
                  "absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-30",
                  // Let clicks pass through to the video when controls are hidden.
                  !effectiveControlsVisible && "pointer-events-none"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Scrubber — click-to-seek, hover-reveal handle */}
                <div
                  className="relative h-1.5 rounded-full bg-white/15 mb-3 cursor-pointer group/seek"
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setProgress(((e.clientX - rect.left) / rect.width) * 100);
                    resetHideTimer();
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-gold"
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cream shadow-float opacity-0 group-hover/seek:opacity-100 transition-opacity"
                    style={{ left: `calc(${progress}% - 6px)` }}
                  />
                </div>

                {/* Buttons row */}
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => { setPlaying((p) => !p); resetHideTimer(); }}
                    className="w-10 h-10 rounded-full glass-strong flex items-center justify-center"
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setMuted((m) => !m); resetHideTimer(); }}
                    className="w-10 h-10 rounded-full glass-strong flex items-center justify-center"
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-xs opacity-80 tabular-nums">
                    {Math.floor(progress * 0.06)}:{String(Math.floor(progress * 3.6) % 60).padStart(2, "0")} / 6:00
                  </span>
                  <div className="flex-1" />

                  {/* Comments toggle (MessageCircle) — shows/hides the side rail */}
                  <button
                    onClick={() => {
                      setCommentsVisible((c) => !c);
                      resetHideTimer();
                      toast.success(commentsVisible ? "Comments hidden" : "Comments shown");
                    }}
                    className={cn(
                      "flex items-center gap-1 text-xs px-3 py-2 rounded-full transition",
                      commentsVisible ? "bg-secondary text-secondary-foreground" : "glass-strong"
                    )}
                    aria-label={commentsVisible ? "Hide comments" : "Show comments"}
                    aria-pressed={commentsVisible}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Comments</span>
                  </button>

                  <button
                    onClick={() => {
                      toast.success("Clip exported", { description: "15s clip saved to your device" });
                      resetHideTimer();
                    }}
                    className="hidden sm:flex items-center gap-1 text-xs glass-strong px-3 py-2 rounded-full"
                  >
                    <Scissors className="w-3.5 h-3.5" /> Clip
                  </button>
                  <button
                    onClick={() => { setTheater((t) => !t); resetHideTimer(); }}
                    className="w-10 h-10 rounded-full glass-strong flex items-center justify-center"
                    aria-label="Theater mode"
                    aria-pressed={theater}
                  >
                    {theater ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>

              {/* Settings popover — keeps controls pinned while open */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="absolute top-16 right-3 z-40 glass-strong rounded-2xl p-2 min-w-[180px] text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 pt-1">Quality</div>
                    {(["Auto", "1080p", "4K"] as Quality[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => { setQuality(q); setShowSettings(false); toast.success(`Quality set to ${q}`); }}
                        className={cn(
                          "w-full text-left text-sm px-2 py-1.5 rounded-lg transition",
                          quality === q ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"
                        )}
                      >
                        {q}
                      </button>
                    ))}
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 pt-2">Speed</div>
                    <div className="flex gap-1 px-2 pb-1">
                      {["0.5x", "1x", "1.5x", "2x"].map((s) => (
                        <button
                          key={s}
                          onClick={() => toast(`Playback speed: ${s}`)}
                          className="text-xs px-2 py-1 rounded-md glass hover:bg-muted/60 transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── Side rail — slides right out when commentsVisible is false,
                     fades when controls auto-hide (layout preserved) ─── */}
            <AnimatePresence>
              {commentsVisible && (
                <motion.aside
                  initial={{ x: 60, opacity: 0 }}
                  animate={{ x: 0, opacity: effectiveControlsVisible ? 1 : 0 }}
                  exit={{ x: 60, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className={cn(
                    "overflow-y-auto p-4 space-y-4 bg-charcoal/95",
                    // Don't intercept clicks while invisible (auto-hidden).
                    !effectiveControlsVisible && "pointer-events-none",
                    theater
                      ? "w-full border-t border-white/10"
                      : "lg:w-[380px] lg:border-l lg:border-white/10"
                  )}
                >
                  {/* Creator + actions */}
                  <div>
                    <h2 className="font-display text-xl leading-tight">{r.caption}</h2>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-gold shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.creator}</div>
                        <div className="text-[11px] opacity-70">1.2M followers · {r.music}</div>
                      </div>
                      <button
                        onClick={() => {
                          setSubscribed((s) => !s);
                          toast.success(subscribed ? "Unfollowed" : `Following ${r.creator}`);
                        }}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition shrink-0",
                          subscribed ? "glass-strong" : "bg-gradient-hero text-cream"
                        )}
                        aria-pressed={subscribed}
                      >
                        <Bell className="w-3.5 h-3.5" /> {subscribed ? "Following" : "Follow"}
                      </button>
                    </div>

                    {/* Action pills */}
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <Pill
                        icon={ThumbsUp}
                        label={liked ? "1" : ""}
                        active={liked}
                        onClick={() => {
                          setLiked((l) => !l);
                          if (!liked) setDisliked(false);
                          toast.success(liked ? "Like removed" : "Liked!");
                        }}
                      />
                      <Pill
                        icon={ThumbsDown}
                        label=""
                        active={disliked}
                        onClick={() => {
                          setDisliked((d) => !d);
                          if (!disliked) setLiked(false);
                          toast(disliked ? "Removed" : "Not for me — noted");
                        }}
                      />
                      <Pill icon={Share2} label="Share" onClick={() => toast("Share sheet opened")} />
                      <Pill
                        icon={Bookmark}
                        label={saved ? "Saved" : "Save"}
                        active={saved}
                        onClick={() => {
                          setSaved((s) => !s);
                          toast.success(saved ? "Removed from saved" : "Saved to Watch Later");
                        }}
                      />
                      <Pill icon={Gift} label="Tip" onClick={() => toast("Tip jar opened · Cirkle Pay")} />
                      <Pill icon={MessageCircle} label="2.1K" onClick={() => toast("Jumping to comments")} />
                    </div>

                    {/* AI Chapters — click-to-seek */}
                    <div className="mt-4 glass-strong rounded-2xl p-3 text-xs">
                      <div className="flex items-center gap-1.5 text-secondary">
                        <ListVideo className="w-3.5 h-3.5" /> AI Chapters
                      </div>
                      <ul className="mt-2 space-y-1.5">
                        {[
                          { t: "00:00", l: "Opening dunes", p: 0 },
                          { t: "01:12", l: "Old town", p: 12 },
                          { t: "03:40", l: "Sunset ridge", p: 37 },
                          { t: "05:20", l: "Lantern finale", p: 87 },
                        ].map((c) => (
                          <li key={c.t}>
                            <button
                              onClick={() => { setProgress(c.p); toast(`Jumped to ${c.t}`); }}
                              className="text-left hover:text-secondary transition"
                            >
                              {c.t} · {c.l}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Up next */}
                  <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-70 mb-2">
                      <ListVideo className="w-3.5 h-3.5" /> Up next
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {reels.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No videos yet
                        </p>
                      ) : reels.map((x, idx) => idx !== i && (
                        <button
                          key={x.id}
                          onClick={() => { setI(idx); setProgress(0); setLiked(false); setDisliked(false); }}
                          className="w-full flex gap-3 text-left hover:bg-white/5 p-2 rounded-xl transition"
                        >
                          <div className="w-28 aspect-video rounded-lg overflow-hidden shrink-0 relative">
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/10" />
                            <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 px-1 rounded">6:00</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm line-clamp-2">{x.caption}</div>
                            <div className="text-[11px] opacity-60 mt-0.5">{x.creator} · {x.likes} views</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <div className="text-xs uppercase tracking-widest opacity-70 mb-2 flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5" /> {comments.length.toLocaleString()} comments
                    </div>
                    <form onSubmit={submitComment} className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-hero shrink-0" />
                      <input
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onFocus={() => setCommentFocused(true)}
                        onBlur={() => setCommentFocused(false)}
                        placeholder="Add a comment…"
                        className="flex-1 glass rounded-full px-3 py-2 text-sm outline-none text-foreground placeholder:text-muted-foreground"
                      />
                      <button
                        type="submit"
                        disabled={!comment.trim()}
                        className="w-9 h-9 rounded-full bg-gradient-hero text-cream flex items-center justify-center disabled:opacity-50"
                        aria-label="Post comment"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                    <div className="max-h-96 overflow-y-auto pr-1">
                      {comments.map((cmt, idx) => (
                        <div key={idx} className="flex gap-2 py-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-mesh shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium">{cmt.u}</div>
                            <div className="text-sm opacity-90 break-words">{cmt.t}</div>
                          </div>
                          <button
                            onClick={() => toast("Liked ❤️")}
                            aria-label="Like comment"
                            className="w-7 h-7 flex items-center justify-center opacity-60 hover:opacity-100 transition"
                          >
                            <Heart className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Pill({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition",
        active ? "bg-secondary text-secondary-foreground" : "glass-strong hover:bg-muted/40"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label && <span>{label}</span>}
    </button>
  );
}

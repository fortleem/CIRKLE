"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Heart, MessageCircle, Send, Bookmark, Smile, Sparkles, MapPin,
  MoreHorizontal, Volume2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Mode = "post" | "story";

interface Comment { u: string; t: string; }

// No mock imagery — covers render as gradient placeholders and the
// author avatar uses a generated initial. PHOTO_COUNT preserves carousel
// paging while real photos are wired in.
const PHOTO_COUNT = 6;
const AUTHOR_INITIAL = "L"; // @layla.studio

/**
 * LamahatViewer — full-screen photo/story overlay.
 * Story: auto-advance 5s, progress bars, tap left/right, reply, swipe-down to close.
 * Post: large photo, caption, like/comment/share, prev/next, comments.
 */
export function LamahatViewer({ open, mode, index, onClose }: { open: boolean; mode: Mode; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reply, setReply] = useState("");
  const [comment, setComment] = useState("");
  const [following, setFollowing] = useState(false);
  const [comments, setComments] = useState<Comment[]>([
    { u: "@noura", t: "This is unreal 😍" },
    { u: "@majidf", t: "Which lens? Sigma?" },
    { u: "@khalid", t: "Saved for inspiration." },
    { u: "@sara_h", t: "Took my breath away ✨" },
  ]);
  const dragStartY = useRef<number | null>(null);

  // Reset state when the viewer opens or the index changes (derived-state pattern).
  const [prevKey, setPrevKey] = useState(`${open}-${index}`);
  const key = `${open}-${index}`;
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setI(index);
      setProgress(0);
      setLiked(false);
      setSaved(false);
    }
  }

  // story auto-advance (5s total, 100ms tick, +2 = 50 ticks)
  useEffect(() => {
    if (!open || mode !== "story") return;
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setI((v) => (v + 1) % PHOTO_COUNT);
          return 0;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(t);
  }, [open, mode]);

  // keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { setI((v) => (v + 1) % PHOTO_COUNT); setProgress(0); }
      else if (e.key === "ArrowLeft") { setI((v) => (v - 1 + PHOTO_COUNT) % PHOTO_COUNT); setProgress(0); }
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // No mock imagery — covers render as gradient placeholders and the
  // author avatar uses a generated initial (AUTHOR_INITIAL).
  const prev = () => { setI((v) => (v - 1 + PHOTO_COUNT) % PHOTO_COUNT); setProgress(0); };
  const next = () => { setI((v) => (v + 1) % PHOTO_COUNT); setProgress(0); };

  const postReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    toast.success("Reply sent");
    setReply("");
  };

  const postComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setComments((c) => [{ u: "@you", t: comment }, ...c]);
    setComment("");
    toast.success("Comment posted");
  };

  // swipe-down to close (story mode)
  const onDragEnd = (_: unknown, info: { offset: { y: number } }) => {
    if (info.offset.y > 120) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="dark fixed inset-0 z-[140] bg-charcoal/95 backdrop-blur-xl flex items-center justify-center p-3"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full glass-strong flex items-center justify-center text-cream"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {mode === "story" ? (
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragStart={() => { dragStartY.current = 0; }}
              onDragEnd={onDragEnd}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="relative w-full max-w-md aspect-[9/16] rounded-3xl overflow-hidden shadow-float cursor-grab active:cursor-grabbing"
            >
              <motion.div
                key={`cover-${i}`}
                initial={{ scale: 1.05, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-secondary/10 pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

              {/* story progress bars */}
              <div className="absolute top-3 inset-x-3 flex gap-1 z-10">
                {Array.from({ length: PHOTO_COUNT }).map((_, idx) => (
                  <div key={idx} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                    <div
                      className="h-full bg-cream transition-all duration-100"
                      style={{ width: `${idx < i ? 100 : idx === i ? progress : 0}%` }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute top-7 inset-x-3 flex items-center gap-2 text-cream z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-cream bg-gradient-mesh shrink-0">
                  {AUTHOR_INITIAL}
                </div>
                <div className="text-sm font-medium">@layla.studio</div>
                <span className="text-[11px] opacity-70">· 2h</span>
                <div className="flex-1" />
                <button
                  onClick={() => toast("Story options")}
                  className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center"
                  aria-label="More"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="absolute bottom-20 inset-x-4 text-cream text-sm leading-relaxed z-10 pointer-events-none">
                Golden hour in AlUla — third roll on the new lens 📷
              </div>

              <form
                onSubmit={postReply}
                className="absolute bottom-4 inset-x-3 flex items-center gap-2 z-10"
              >
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply to story…"
                  className="flex-1 glass-strong rounded-full px-4 py-2.5 text-sm outline-none text-cream placeholder:text-cream/60"
                />
                <button
                  type="button"
                  onClick={() => { setLiked((l) => !l); toast.success(liked ? "Reaction removed" : "❤️ Reaction sent"); }}
                  className="w-10 h-10 rounded-full glass-strong text-cream flex items-center justify-center shrink-0"
                  aria-label="React"
                >
                  <Heart className={`w-5 h-5 ${liked ? "fill-current text-rose" : ""}`} />
                </button>
                <button
                  type="submit"
                  disabled={!reply.trim()}
                  className="w-10 h-10 rounded-full bg-gradient-hero text-cream flex items-center justify-center disabled:opacity-50 shrink-0"
                  aria-label="Send reply"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* tap zones */}
              <button
                onClick={prev}
                className="absolute left-0 top-1/4 bottom-1/4 w-1/3 z-0"
                aria-label="Previous story"
              />
              <button
                onClick={next}
                className="absolute right-0 top-1/4 bottom-1/4 w-1/3 z-0"
                aria-label="Next story"
              />
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-[10px] text-cream/40 pointer-events-none">
                Swipe down to close
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="w-full max-w-5xl grid md:grid-cols-[1.4fr_1fr] gap-0 bg-card rounded-3xl overflow-hidden shadow-float max-h-[90vh]"
            >
              <div className="relative bg-black aspect-square md:aspect-auto">
                <motion.div
                  key={`cover-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-secondary/10"
                />
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass-strong flex items-center justify-center text-cream"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass-strong flex items-center justify-center text-cream"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <span key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === i % 4 ? "bg-cream" : "bg-cream/40"}`} />
                  ))}
                </div>
              </div>

              <div className="flex flex-col min-h-0">
                <div className="p-3 flex items-center gap-3 border-b border-border">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-cream bg-gradient-mesh shrink-0">
                    {AUTHOR_INITIAL}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">@layla.studio</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> AlUla, Saudi Arabia
                    </div>
                  </div>
                  <button
                    onClick={() => { setFollowing((f) => !f); toast.success(following ? "Unfollowed" : "Following @layla.studio"); }}
                    className={`text-xs px-3 py-1.5 rounded-full transition ${following ? "glass" : "bg-gradient-hero text-cream"}`}
                  >
                    {following ? "Following" : "Follow"}
                  </button>
                  <button
                    onClick={() => toast("Photo options")}
                    aria-label="More"
                    className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium text-cream bg-gradient-mesh shrink-0">
                      {AUTHOR_INITIAL}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">@layla.studio</span> Golden hour in AlUla — third roll on the new lens.{" "}
                      <span className="text-secondary">#lamahat</span> <span className="text-secondary">#alula</span>
                    </div>
                  </div>
                  {comments.map((cmt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-mesh shrink-0" />
                      <div className="flex-1 text-sm">
                        <span className="font-medium">{cmt.u}</span> {cmt.t}
                      </div>
                      <button
                        onClick={() => toast("Liked ❤️")}
                        aria-label="Like comment"
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-rose transition"
                      >
                        <Heart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => toast.success("Memory remix created", { description: "AI made a 12s reel from this collection." })}
                    className="w-full glass rounded-2xl p-3 text-left text-xs flex items-center gap-2 hover:bg-muted/40 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-secondary" /> Remix this into a Mashahd reel with AI
                  </button>
                </div>

                <div className="border-t border-border p-3">
                  <div className="flex items-center gap-1 mb-2">
                    <button
                      onClick={() => { setLiked((l) => !l); toast.success(liked ? "Like removed" : "Liked!"); }}
                      aria-label="Like"
                      className="w-9 h-9 flex items-center justify-center hover:scale-110 transition"
                    >
                      <Heart className={`w-5 h-5 ${liked ? "fill-current text-rose" : ""}`} />
                    </button>
                    <button
                      onClick={() => {
                        const input = document.getElementById("lamahat-comment-input") as HTMLInputElement | null;
                        input?.focus();
                      }}
                      aria-label="Comment"
                      className="w-9 h-9 flex items-center justify-center hover:scale-110 transition"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button
                      aria-label="Share"
                      onClick={() => toast("Shared to Wasl")}
                      className="w-9 h-9 flex items-center justify-center hover:scale-110 transition"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                    <button
                      aria-label="Audio"
                      onClick={() => toast("Audio: ambient desert wind")}
                      className="w-9 h-9 flex items-center justify-center hover:scale-110 transition"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => { setSaved((s) => !s); toast.success(saved ? "Removed from saved" : "Saved"); }}
                      aria-label="Save"
                      className="w-9 h-9 flex items-center justify-center hover:scale-110 transition"
                    >
                      <Bookmark className={`w-5 h-5 ${saved ? "fill-current text-secondary" : ""}`} />
                    </button>
                  </div>
                  <div className="text-xs font-medium">{liked ? "1,249" : "1,248"} likes</div>
                  <div className="text-[11px] text-muted-foreground">2 hours ago</div>
                  <form onSubmit={postComment} className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toast("Emoji picker")}
                      aria-label="Emoji"
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    <input
                      id="lamahat-comment-input"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment…"
                      className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                    />
                    <button
                      type="submit"
                      disabled={!comment.trim()}
                      className="text-xs font-medium text-secondary disabled:opacity-50"
                    >
                      Post
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

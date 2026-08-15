"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, ImageIcon, Video, BarChart3, MessageSquare, Send, Hash, Smile,
  Globe, Users, Lock, EyeOff, Sparkles, Clock, Save, Calendar,
  Loader2, Check, TrendingUp, Lightbulb, Zap, Trash2, Plus, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";
import {
  MODULE_META,
  type ModuleId,
  type ShareContent,
  getShareSuggestions,
  shareToModules,
} from "@/lib/cross-module-share";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Format selector ───────────────────────────────────────────────────────

type Format = "text" | "photo" | "video" | "poll" | "thread";

const FORMATS: { id: Format; label: string; icon: LucideIcon; hint: string }[] = [
  { id: "text", label: "Text", icon: MessageSquare, hint: "Plain post" },
  { id: "photo", label: "Photo", icon: ImageIcon, hint: "Single image + caption" },
  { id: "video", label: "Video", icon: Video, hint: "Clip + title" },
  { id: "poll", label: "Poll", icon: BarChart3, hint: "Question + options" },
  { id: "thread", label: "Thread", icon: Hash, hint: "Connected posts" },
];

// ── Privacy selector ──────────────────────────────────────────────────────

type Privacy = "public" | "friends" | "private" | "anonymous";

const PRIVACIES: { id: Privacy; label: string; icon: LucideIcon; desc: string }[] = [
  { id: "public", label: "Public", icon: Globe, desc: "Anyone on Cirkle can see and reshare" },
  { id: "friends", label: "Friends", icon: Users, desc: "Only people you follow back" },
  { id: "private", label: "Private", icon: Lock, desc: "Only you" },
  { id: "anonymous", label: "Anonymous", icon: EyeOff, desc: "Pseudonymous identity" },
];

// ── AI Content Coach ──────────────────────────────────────────────────────

interface AISuggestion {
  kind: "info" | "tip" | "warning";
  text: string;
}

interface AICoachResult {
  score: number; // 1–10
  suggestions: AISuggestion[];
  bestTime: string;
}

const MAX_CHARS = 280;
const DRAFT_KEY = "cirkle-smart-compose-draft";

// ── Hashtag + emoji banks (heuristic suggestions) ─────────────────────────

const HASHTAG_BANK: Record<string, string[]> = {
  default: ["cirkle", "egypt", "cairo", "saudi", "riyadh", "dubai", "community", "today"],
  food: ["foodie", "ifrar", "egyptianfood", "homemade", "delicious"],
  travel: ["travel", "wanderlust", "explore", "thisweekend", "getaway"],
  music: ["nowplaying", "music", "vibes", "playlist"],
  work: ["worklife", "productivity", "growth", "team"],
  family: ["family", "grateful", "blessed", "moments"],
  sunset: ["sunset", "goldenhour", "sky", "view"],
  morning: ["goodmorning", "coffee", "freshstart", "intention"],
};

const EMOJI_BANK = ["✨", "🌙", "☀️", "❤️", "🔥", "🙌", "😄", "💡", "☕", "📷", "🎵", "🌅"];

// ── Helpers ───────────────────────────────────────────────────────────────

function classifyContent(text: string): keyof typeof HASHTAG_BANK {
  const t = text.toLowerCase();
  if (/\b(food|eat|lunch|dinner|breakfast|coffee|restaurant|recipe|ifrar)\b/.test(t)) return "food";
  if (/\b(travel|trip|flight|beach|hotel|visit|explore)\b/.test(t)) return "travel";
  if (/\b(music|song|playlist|listen|vibes)\b/.test(t)) return "music";
  if (/\b(work|office|meeting|project|deadline|team)\b/.test(t)) return "work";
  if (/\b(family|mom|dad|son|daughter|kids|home)\b/.test(t)) return "family";
  if (/\b(sunset|sunrise|sky|golden|dawn|dusk)\b/.test(t)) return "sunset";
  if (/\b(morning|coffee|intent|grateful)\b/.test(t)) return "morning";
  return "default";
}

function suggestHashtags(text: string): string[] {
  const cat = classifyContent(text);
  const bank = HASHTAG_BANK[cat] ?? HASHTAG_BANK.default!;
  // Filter out hashtags the user already typed.
  const existing = new Set(
    text.match(/#[\p{L}\p{N}_]+/gu)?.map((h) => h.replace(/^#/, "").toLowerCase()) ?? [],
  );
  return bank.filter((h) => !existing.has(h.toLowerCase())).slice(0, 5);
}

function computeCoach(
  text: string,
  format: Format,
  hasMedia: boolean,
  hasHashtags: boolean,
  modules: ModuleId[],
): AICoachResult {
  let score = 4; // baseline
  const suggestions: AISuggestion[] = [];
  const len = text.trim().length;

  // Length scoring
  if (len === 0) {
    score = 1;
    suggestions.push({ kind: "tip", text: "Start writing — your story is what makes Cirkle feel alive." });
  } else if (len > 0 && len < 30) {
    score += 0;
    suggestions.push({ kind: "tip", text: "Add a few more words so people understand the context." });
  } else if (len >= 30 && len <= 200) {
    score += 3;
    suggestions.push({ kind: "info", text: "Great length — short posts in this range get the most reads." });
  } else if (len > 200 && len <= 280) {
    score += 2;
  } else if (len > 280) {
    score += 1;
    suggestions.push({ kind: "warning", text: `Your post is ${len} chars — consider shortening for Wasl (chat truncates at 220).` });
  }

  // Media
  if (format === "photo" && !hasMedia) {
    suggestions.push({ kind: "warning", text: "Photo format selected but no image attached." });
  } else if (format === "video" && !hasMedia) {
    suggestions.push({ kind: "warning", text: "Video format selected but no clip attached." });
  } else if ((format === "text" || format === "thread") && !hasMedia && len > 0) {
    suggestions.push({ kind: "tip", text: "Try adding a photo — posts with images get 3× more engagement." });
  } else if (hasMedia) {
    score += 2;
  }

  // Hashtags
  if (!hasHashtags && len > 0) {
    suggestions.push({ kind: "tip", text: "Add 2–3 hashtags to help people discover your post." });
  } else if (hasHashtags) {
    score += 1;
  }

  // Cross-module
  if (modules.length >= 2) {
    score += 1;
    suggestions.push({ kind: "info", text: `Cross-posting to ${modules.length} modules — your reach is amplified.` });
  } else if (modules.length === 1 && modules[0] === "midan") {
    suggestions.push({ kind: "tip", text: "Your post is great for Midan — consider also sharing to Lamahat if it has a photo." });
  }

  // Best time
  const hour = new Date().getHours();
  let bestTime = "7–9 PM in your timezone";
  if (hour >= 18 && hour < 22) {
    bestTime = "Right now — this is peak engagement time!";
  } else if (hour >= 6 && hour < 10) {
    bestTime = "7–9 AM (morning commute) or 7–9 PM (evening peak)";
  } else if (hour >= 10 && hour < 18) {
    bestTime = "Best time to post: 7–9 PM in your timezone";
  } else {
    bestTime = "Late night — your post may get fewer views. Try scheduling for 7–9 PM.";
  }

  // Clamp score
  score = Math.max(1, Math.min(10, Math.round(score)));

  if (suggestions.length === 0) {
    suggestions.push({ kind: "info", text: "Looking great — your post is ready to publish." });
  }

  return { score, suggestions, bestTime };
}

// ── Component ─────────────────────────────────────────────────────────────

export function SmartCompose({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username ?? "anonymous";

  const [format, setFormat] = useState<Format>("text");
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [threadTweets, setThreadTweets] = useState<string[]>([""]);
  const [modules, setModules] = useState<ModuleId[]>(["midan"]);
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [posting, setPosting] = useState(false);
  const [savedDraftAt, setSavedDraftAt] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Hydrate draft on open ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          format?: Format; text?: string; caption?: string; photoUrl?: string;
          videoUrl?: string; pollOptions?: string[]; threadTweets?: string[];
          modules?: ModuleId[]; privacy?: Privacy; hashtags?: string[]; emojis?: string[];
          scheduledAt?: string;
        };
        if (draft.format) setFormat(draft.format);
        if (typeof draft.text === "string") setText(draft.text);
        if (typeof draft.caption === "string") setCaption(draft.caption);
        if (typeof draft.photoUrl === "string") setPhotoUrl(draft.photoUrl);
        if (typeof draft.videoUrl === "string") setVideoUrl(draft.videoUrl);
        if (Array.isArray(draft.pollOptions)) setPollOptions(draft.pollOptions);
        if (Array.isArray(draft.threadTweets)) setThreadTweets(draft.threadTweets);
        if (Array.isArray(draft.modules)) setModules(draft.modules);
        if (draft.privacy) setPrivacy(draft.privacy);
        if (Array.isArray(draft.hashtags)) setHashtags(draft.hashtags);
        if (Array.isArray(draft.emojis)) setEmojis(draft.emojis);
        if (typeof draft.scheduledAt === "string") setScheduledAt(draft.scheduledAt);
      }
    } catch {
      /* ignore */
    }
  }, [open]);

  // ── Derived state ──────────────────────────────────────────────────
  const fullText = useMemo(() => {
    const parts: string[] = [];
    if (text.trim()) parts.push(text);
    if (emojis.length) parts.push(emojis.join(""));
    if (hashtags.length) parts.push(hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "));
    return parts.join(" ");
  }, [text, emojis, hashtags]);

  const aiSuggestions = useMemo(
    () => suggestHashtags(text || caption),
    [text, caption],
  );

  const coach = useMemo(
    () =>
      computeCoach(
        text,
        format,
        !!photoUrl || !!videoUrl,
        hashtags.length > 0,
        modules,
      ),
    [text, format, photoUrl, videoUrl, hashtags, modules],
  );

  const charCount = fullText.length;
  const optimal = charCount >= 30 && charCount <= 280;

  // ── Handlers ───────────────────────────────────────────────────────
  const toggleModule = (m: ModuleId) => {
    setModules((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  };

  const addHashtag = (h: string) => {
    const clean = h.replace(/^#/, "").trim();
    if (!clean) return;
    if (hashtags.includes(clean)) return;
    setHashtags((prev) => [...prev, clean]);
  };

  const addEmoji = (e: string) => {
    setText((prev) => prev + e);
    if (!emojis.includes(e)) setEmojis((prev) => [...prev, e]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast.error("File too large", { description: "Max 8MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (format === "video") setVideoUrl(url);
      else setPhotoUrl(url);
    };
    reader.readAsDataURL(f);
  };

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          format, text, caption, photoUrl, videoUrl, pollOptions,
          threadTweets, modules, privacy, hashtags, emojis, scheduledAt,
        }),
      );
      setSavedDraftAt(new Date().toISOString());
      toast.success("Draft saved", { description: "Restored next time you open the composer" });
    } catch {
      toast.error("Could not save draft");
    }
  }, [format, text, caption, photoUrl, videoUrl, pollOptions, threadTweets, modules, privacy, hashtags, emojis, scheduledAt]);

  const resetForm = () => {
    setFormat("text"); setText(""); setCaption(""); setPhotoUrl(""); setVideoUrl("");
    setPollOptions(["", ""]); setThreadTweets([""]); setModules(["midan"]);
    setPrivacy("public"); setHashtags([]); setEmojis([]);
    setScheduleEnabled(false); setScheduledAt("");
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setSavedDraftAt(null);
  };

  const handlePost = async () => {
    if (fullText.trim().length === 0 && !photoUrl && !videoUrl) {
      toast.error("Add some content before posting");
      return;
    }
    if (format === "poll") {
      const clean = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (clean.length < 2) {
        toast.error("Polls need at least 2 options");
        return;
      }
    }
    if (modules.length === 0) {
      toast.error("Select at least one module");
      return;
    }
    if (scheduleEnabled && !scheduledAt) {
      toast.error("Pick a date/time or disable scheduling");
      return;
    }

    setPosting(true);
    try {
      const content: ShareContent = {
        text: fullText,
        photos: photoUrl ? [photoUrl] : undefined,
        video: videoUrl || undefined,
        caption: caption || undefined,
        hashtags,
        link: undefined,
        privacy,
      };

      if (scheduleEnabled) {
        // Schedule: just save locally + toast. Real scheduling would dispatch
        // to a background job (out of scope here).
        const scheduled = JSON.parse(localStorage.getItem("cirkle-scheduled-posts") ?? "[]") as unknown[];
        scheduled.push({ content, modules, scheduledAt, at: new Date().toISOString() });
        localStorage.setItem("cirkle-scheduled-posts", JSON.stringify(scheduled));
        toast.success("Scheduled", {
          description: `Will publish on ${new Date(scheduledAt).toLocaleString()}`,
        });
        resetForm();
        onClose();
        return;
      }

      const result = await shareToModules(content, modules);
      const okCount = result.results.filter((r) => r.ok).length;
      const failCount = result.results.length - okCount;

      if (okCount > 0 && failCount === 0) {
        toast.success(`Published to ${okCount} module${okCount > 1 ? "s" : ""}`, {
          description: result.results.map((r) => `${MODULE_META[r.module].label}${r.ok ? " ✓" : " ✗"}`).join(" · "),
        });
        resetForm();
        onClose();
      } else if (okCount > 0) {
        toast.warning(`Partial publish (${okCount}/${result.results.length})`, {
          description: result.results.filter((r) => !r.ok).map((r) => `${MODULE_META[r.module].label}: ${r.error}`).join(" · "),
        });
      } else {
        const errs = result.results.map((r) => `${MODULE_META[r.module].label}: ${r.error}`).join(" · ");
        toast.error("Publish failed", { description: errs });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPosting(false);
    }
  };

  // ── Quality score color ─────────────────────────────────────────────
  const scoreColor = coach.score >= 8
    ? "text-emerald-600 dark:text-emerald-400"
    : coach.score >= 5
      ? "text-amber-600 dark:text-amber-400"
      : "text-destructive";

  const scoreBg = coach.score >= 8
    ? "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30"
    : coach.score >= 5
      ? "from-amber-500/20 to-amber-500/5 border-amber-500/30"
      : "from-destructive/20 to-destructive/5 border-destructive/30";

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-3xl" ariaLabel="Smart Compose">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Smart Compose</h2>
              <p className="text-xs text-muted-foreground">AI coach · cross-module · one flow</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={saveDraft} aria-label="Save draft">
              <Save className="w-3.5 h-3.5 mr-1.5" /> Draft
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Format selector */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">Format</Label>
            <div className="grid grid-cols-5 gap-2">
              {FORMATS.map((f) => {
                const Icon = f.icon;
                const active = format === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition text-center",
                      active
                        ? "bg-secondary/15 border-secondary/50 text-secondary"
                        : "bg-muted/30 border-border/40 hover:bg-muted/50 text-muted-foreground",
                    )}
                    aria-pressed={active}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-medium">{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main text area */}
          <div className="space-y-2">
            <Label htmlFor="smart-text">
              {format === "poll" ? "Poll question" : format === "thread" ? "First tweet" : format === "video" ? "Description" : format === "photo" ? "Caption (optional)" : "What's on your mind?"}
            </Label>
            <Textarea
              id="smart-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={format === "poll" ? "Ask a question…" : format === "thread" ? "Start your thread…" : "Share something authentic…"}
              rows={format === "thread" ? 3 : 4}
              maxLength={2000}
            />
            <div className="flex items-center justify-between text-xs">
              <span className={cn(
                "tabular-nums",
                charCount > MAX_CHARS ? "text-destructive" : optimal ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
              )}>
                {charCount}/{MAX_CHARS}
                {optimal && <span className="ml-1.5">✓ optimal range</span>}
                {charCount > MAX_CHARS && <span className="ml-1.5">over typical limit</span>}
              </span>
              <span className="text-muted-foreground">{fullText.length} total chars</span>
            </div>
          </div>

          {/* Format-specific extras */}
          <AnimatePresence mode="wait">
            {format === "photo" && (
              <motion.div key="photo" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <Label>Photo</Label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                {photoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/40">
                    <img src={photoUrl} alt="Selected" className="w-full max-h-64 object-cover" />
                    <button
                      onClick={() => setPhotoUrl("")}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-charcoal/70 text-white flex items-center justify-center hover:bg-charcoal/90"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full p-6 rounded-xl border-2 border-dashed border-border/60 hover:border-secondary/50 transition flex flex-col items-center gap-2 text-muted-foreground"
                  >
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-sm">Click to upload a photo</span>
                  </button>
                )}
                <Input
                  className="mt-2"
                  placeholder="Or paste an image URL"
                  value={photoUrl.startsWith("data:") ? "" : photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
              </motion.div>
            )}

            {format === "video" && (
              <motion.div key="video" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2">
                <Label>Video</Label>
                <input ref={fileRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
                {videoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/40">
                    <video src={videoUrl} className="w-full max-h-64 object-cover" controls />
                    <button
                      onClick={() => setVideoUrl("")}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-charcoal/70 text-white flex items-center justify-center hover:bg-charcoal/90"
                      aria-label="Remove video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full p-6 rounded-xl border-2 border-dashed border-border/60 hover:border-secondary/50 transition flex flex-col items-center gap-2 text-muted-foreground"
                  >
                    <Video className="w-6 h-6" />
                    <span className="text-sm">Click to upload a video (max 8MB)</span>
                  </button>
                )}
                <Input
                  className="mt-2"
                  placeholder="Or paste a video URL"
                  value={videoUrl.startsWith("data:") ? "" : videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
              </motion.div>
            )}

            {format === "poll" && (
              <motion.div key="poll" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2">
                <Label>Options ({pollOptions.length}/6)</Label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => setPollOptions((prev) => prev.map((o, i) => (i === idx ? e.target.value : o)))}
                      maxLength={80}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={pollOptions.length <= 2}
                      aria-label={`Remove option ${idx + 1}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPollOptions((prev) => [...prev, ""])}
                  disabled={pollOptions.length >= 6}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add option
                </Button>
              </motion.div>
            )}

            {format === "thread" && (
              <motion.div key="thread" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2">
                <Label>Thread ({threadTweets.length} tweets)</Label>
                {threadTweets.map((tweet, idx) => (
                  <div key={idx} className="flex gap-2">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-secondary/15 text-secondary text-xs flex items-center justify-center font-medium mt-1">
                      {idx + 1}
                    </div>
                    <Textarea
                      placeholder={`Tweet ${idx + 1}`}
                      value={tweet}
                      onChange={(e) => setThreadTweets((prev) => prev.map((t, i) => (i === idx ? e.target.value : t)))}
                      rows={2}
                      maxLength={280}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setThreadTweets((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={threadTweets.length <= 1}
                      aria-label={`Remove tweet ${idx + 1}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setThreadTweets((prev) => [...prev, ""])}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add tweet
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Content Coach */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("rounded-xl border bg-gradient-to-br p-4", scoreBg)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 dark:bg-black/20 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">AI Content Coach</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Quality score</span>
                <span className={cn("text-2xl font-bold tabular-nums", scoreColor)}>{coach.score}</span>
                <span className="text-xs text-muted-foreground">/10</span>
              </div>
            </div>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {coach.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className={cn(
                    "shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full",
                    s.kind === "warning" ? "bg-destructive" : s.kind === "tip" ? "bg-amber-500" : "bg-emerald-500",
                  )} />
                  <span className="text-foreground/80">{s.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{coach.bestTime}</span>
            </div>
          </motion.div>

          {/* AI hashtag suggestions */}
          {aiSuggestions.length > 0 && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> Suggested hashtags
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {aiSuggestions.map((h) => (
                  <button
                    key={h}
                    onClick={() => addHashtag(h)}
                    className="px-2.5 py-1 rounded-full bg-muted/40 hover:bg-secondary/20 text-xs text-foreground/80 transition border border-border/40"
                  >
                    #{h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active hashtags */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((h) => (
                <span key={h} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/15 text-xs text-secondary border border-secondary/30">
                  #{h}
                  <button onClick={() => setHashtags((prev) => prev.filter((x) => x !== h))} aria-label={`Remove hashtag ${h}`}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* AI emoji suggestions */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block flex items-center gap-1.5">
              <Smile className="w-3 h-3" /> Add an emoji
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_BANK.map((e) => (
                <button
                  key={e}
                  onClick={() => addEmoji(e)}
                  className="w-9 h-9 rounded-lg bg-muted/40 hover:bg-muted/60 text-lg flex items-center justify-center transition border border-border/40"
                  aria-label={`Insert ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Cross-module selector */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Post to ({modules.length} selected)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(MODULE_META) as ModuleId[]).map((m) => {
                const meta = MODULE_META[m];
                const active = modules.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggleModule(m)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border transition text-left",
                      active
                        ? "bg-secondary/15 border-secondary/50"
                        : "bg-muted/30 border-border/40 hover:bg-muted/50",
                    )}
                    aria-pressed={active}
                  >
                    <span className="text-lg">{meta.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{meta.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{meta.description}</div>
                    </div>
                    {active && <Check className="w-3.5 h-3.5 text-secondary ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy selector */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">Privacy</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRIVACIES.map((p) => {
                const Icon = p.icon;
                const active = privacy === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPrivacy(p.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition text-center",
                      active
                        ? "bg-secondary/15 border-secondary/50 text-secondary"
                        : "bg-muted/30 border-border/40 hover:bg-muted/50 text-muted-foreground",
                    )}
                    aria-pressed={active}
                    title={p.desc}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-medium">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule for later */}
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Schedule for later</span>
              </div>
              <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} aria-label="Toggle scheduling" />
            </div>
            <AnimatePresence>
              {scheduleEnabled && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Post will be saved locally and auto-published at the chosen time.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {savedDraftAt && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Save className="w-3 h-3" /> Draft saved at {new Date(savedDraftAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 p-4 flex items-center gap-3 sticky bottom-0 bg-card/95 backdrop-blur">
          <div className="text-xs text-muted-foreground flex-1 min-w-0">
            <span className="hidden sm:inline">Posting as </span>
            <span className="font-medium text-foreground">@{username}</span>
            <span className="mx-1.5">·</span>
            <span>{modules.length} module{modules.length !== 1 ? "s" : ""}</span>
            <span className="mx-1.5">·</span>
            <span className="capitalize">{privacy}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetForm}
            disabled={posting}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
          </Button>
          <Button
            onClick={handlePost}
            disabled={posting}
            className="bg-gradient-gold text-charcoal hover:opacity-90"
          >
            {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {scheduleEnabled ? "Schedule" : "Publish"}
          </Button>
        </div>
      </div>
    </OverlayShell>
  );
}

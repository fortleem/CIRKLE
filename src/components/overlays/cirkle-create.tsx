"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ChevronLeft,
  Palette,
  Clapperboard,
  PenLine,
  Music,
  Sparkles,
  RefreshCw,
  Wand2,
  ChevronRight,
  Image as ImageIcon,
  Captions,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";

interface Props {
  open: boolean;
  onClose: () => void;
}

type ToolId = "image" | "video" | "writing" | "music";

interface Tool {
  id: ToolId;
  name: string;
  tagline: string;
  icon: typeof Palette;
  emoji: string;
  tint: string;
  accent: string;
}

const TOOLS: Tool[] = [
  {
    id: "image",
    name: "AI Image",
    tagline: "Generate images from text",
    icon: Palette,
    emoji: "🎨",
    tint: "from-rose/30 to-transparent",
    accent: "text-rose",
  },
  {
    id: "video",
    name: "AI Video Edit",
    tagline: "Auto-cut, add music, subtitles",
    icon: Clapperboard,
    emoji: "🎬",
    tint: "from-teal/30 to-transparent",
    accent: "text-teal",
  },
  {
    id: "writing",
    name: "AI Writing",
    tagline: "Drafts posts, captions, emails",
    icon: PenLine,
    emoji: "✍️",
    tint: "from-gold/30 to-transparent",
    accent: "text-gold",
  },
  {
    id: "music",
    name: "AI Music",
    tagline: "Generate background music",
    icon: Music,
    emoji: "🎵",
    tint: "from-steel/30 to-transparent",
    accent: "text-steel",
  },
];

export function CirkleCreate({ open, onClose }: Props) {
  const [active, setActive] = useState<ToolId | null>(null);
  const tool = TOOLS.find((t) => t.id === active);

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-2xl" ariaLabel="CirkleCreate — AI Creative Studio">
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              {active && (
                <button
                  onClick={() => setActive(null)}
                  aria-label="Back"
                  className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose/40 to-gold/30 flex items-center justify-center shrink-0 shadow-soft">
                <Wand2 className="w-5 h-5 text-cream" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  CirkleCreate
                </div>
                <div className="font-display text-xl truncate">
                  {tool ? tool.name : "AI Creative Studio"}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-24">
              <AnimatePresence mode="wait">
                {!active ? (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-rose/15 via-gold/10 to-transparent p-4">
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        Pick a creative tool and let the AI do the heavy lifting.
                        Everything runs on-device — your prompts never leave the
                        phone.
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {TOOLS.map((t, i) => (
                        <motion.button
                          key={t.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.3 }}
                          onClick={() => setActive(t.id)}
                          className={`relative text-start rounded-2xl border border-border/50 bg-gradient-to-br ${t.tint} p-4 min-h-[140px] hover:scale-[1.02] transition overflow-hidden group`}
                        >
                          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-foreground/5 blur-2xl group-hover:bg-foreground/10 transition" />
                          <div className="relative flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                              <t.icon className={`w-5 h-5 ${t.accent}`} />
                            </div>
                            <span className="text-2xl" aria-hidden>
                              {t.emoji}
                            </span>
                          </div>
                          <div className="relative mt-4">
                            <div className="font-display text-base leading-tight">
                              {t.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
                              {t.tagline}
                            </div>
                          </div>
                          <div className="relative mt-3 flex items-center gap-1 text-[10px] text-rose">
                            Open <ChevronRight className="w-3 h-3" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {active === "image" && <ImageStudio />}
                    {active === "video" && <VideoStudio />}
                    {active === "writing" && <WritingStudio />}
                    {active === "music" && <MusicStudio />}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
    </OverlayShell>
  );
}

/* ---------- AI Image ---------- */
function ImageStudio() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<"realistic" | "artistic" | "minimal">(
    "realistic"
  );
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  const generate = () => {
    if (!prompt.trim()) {
      toast("Add a prompt first", {
        description: "Describe the image you want to create.",
      });
      return;
    }
    setLoading(true);
    setPreview(false);
    window.setTimeout(() => {
      setLoading(false);
      setPreview(true);
      toast.success("Image generated", {
        description: `Style: ${style} · saved to Lamahat.`,
      });
    }, 1300);
  };

  const styles: { id: typeof style; label: string }[] = [
    { id: "realistic", label: "Realistic" },
    { id: "artistic", label: "Artistic" },
    { id: "minimal", label: "Minimal" },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-rose" />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Prompt
          </div>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setPreview(false);
          }}
          placeholder="A golden desert sunset over the dunes near Riyadh, cinematic, warm light…"
          className="w-full bg-transparent outline-none text-sm leading-relaxed min-h-[80px] resize-none placeholder:text-muted-foreground"
        />

        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Style
          </div>
          <div className="grid grid-cols-3 gap-2">
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setStyle(s.id);
                  setPreview(false);
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  style === s.id
                    ? "border-rose/60 bg-rose/15 text-rose"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-rose to-gold text-cream py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loading ? "Generating…" : "Generate image"}
        </button>
      </section>

      <div className="rounded-3xl border border-border/60 bg-card overflow-hidden">
        <div className="aspect-[4/3] relative bg-gradient-to-br from-rose/20 via-gold/15 to-steel/20 flex items-center justify-center">
          {preview ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <ImageIcon className="w-10 h-10 text-rose mx-auto" />
              <div className="text-xs text-muted-foreground mt-2 px-6">
                Generated preview · {style}
              </div>
            </motion.div>
          ) : loading ? (
            <div className="text-center text-xs text-muted-foreground">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-rose" />
              <div className="mt-2">Painting pixels…</div>
            </div>
          ) : (
            <div className="text-center text-xs text-muted-foreground px-6">
              Your generated image will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- AI Video Edit ---------- */
function VideoStudio() {
  const [brief, setBrief] = useState("");
  const [options, setOptions] = useState({
    autocut: true,
    subtitles: true,
    music: false,
  });
  const [loading, setLoading] = useState(false);

  const generate = () => {
    if (!brief.trim()) {
      toast("Describe your video", {
        description: "Tell the AI what footage you have and the mood.",
      });
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      toast.success("Video edit queued", {
        description: "Auto-cut, subtitles, and music will be ready shortly.",
      });
    }, 1200);
  };

  const toggles: { id: keyof typeof options; label: string; icon: typeof Scissors }[] = [
    { id: "autocut", label: "Auto-cut highlights", icon: Scissors },
    { id: "subtitles", label: "Add subtitles", icon: Captions },
    { id: "music", label: "Add background music", icon: Music },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-teal" />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Footage brief
          </div>
        </div>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="5 clips from the Diriyah walk, ~40 seconds total. Mood: calm, golden hour, slight nostalgia…"
          className="w-full bg-transparent outline-none text-sm leading-relaxed min-h-[90px] resize-none placeholder:text-muted-foreground"
        />

        <div className="space-y-2">
          {toggles.map((t) => (
            <button
              key={t.id}
              onClick={() => setOptions((s) => ({ ...s, [t.id]: !s[t.id] }))}
              className={`w-full flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition text-start ${
                options[t.id]
                  ? "border-teal/50 bg-teal/10"
                  : "border-border/60 bg-muted/30"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  options[t.id] ? "bg-teal/20" : "bg-muted"
                }`}
              >
                <t.icon
                  className={`w-4 h-4 ${options[t.id] ? "text-teal" : "text-muted-foreground"}`}
                />
              </div>
              <div className="flex-1 text-sm font-medium">{t.label}</div>
              <div
                className={`relative w-10 h-5 rounded-full transition ${
                  options[t.id] ? "bg-teal" : "bg-muted border border-border/60"
                }`}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-cream shadow-md ${
                    options[t.id] ? "left-5" : "left-0.5"
                  }`}
                />
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-teal to-steel text-cream py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loading ? "Editing…" : "Generate edit"}
        </button>
      </section>
    </div>
  );
}

/* ---------- AI Writing ---------- */
function WritingStudio() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<"professional" | "casual" | "witty" | "formal">(
    "professional"
  );
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  const generate = () => {
    if (!topic.trim()) {
      toast("What should I write?", {
        description: "A post, a caption, an email — just describe it.",
      });
      return;
    }
    setLoading(true);
    setOutput(null);
    window.setTimeout(() => {
      const sample = `${topic.trim()}\n\n— Drafted in a ${tone} tone. Cirkle AI structured this with a hook, three beats, and a clear call-to-action. Edit freely before posting.`;
      setOutput(sample);
      setLoading(false);
      toast.success("Draft ready", {
        description: `Tone: ${tone} · tap to copy or edit.`,
      });
    }, 1100);
  };

  const tones: { id: typeof tone; label: string }[] = [
    { id: "professional", label: "Professional" },
    { id: "casual", label: "Casual" },
    { id: "witty", label: "Witty" },
    { id: "formal", label: "Formal" },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-gold" />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            What do you want to write?
          </div>
        </div>
        <textarea
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            setOutput(null);
          }}
          placeholder="A LinkedIn post announcing my new role at Aramco, mentioning gratitude for my mentors…"
          className="w-full bg-transparent outline-none text-sm leading-relaxed min-h-[100px] resize-none placeholder:text-muted-foreground"
        />

        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Tone
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {tones.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTone(t.id);
                  setOutput(null);
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  tone === t.id
                    ? "border-gold/60 bg-gold/15 text-gold"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-gold to-rose text-charcoal py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loading ? "Drafting…" : "Generate draft"}
        </button>
      </section>

      {output && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border/60 bg-card p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Draft · {tone}
            </div>
            <button
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  void navigator.clipboard.writeText(output);
                }
                toast("Copied to clipboard");
              }}
              className="text-[10px] uppercase tracking-widest text-gold hover:opacity-80"
            >
              Copy
            </button>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{output}</div>
        </motion.div>
      )}
    </div>
  );
}

/* ---------- AI Music ---------- */
function MusicStudio() {
  const [mood, setMood] = useState<"calm" | "upbeat" | "melancholic" | "epic">(
    "calm"
  );
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      toast.success("Music generated", {
        description: `${mood} · ${duration}s · saved to your library.`,
      });
    }, 1200);
  };

  const moods: { id: typeof mood; label: string; emoji: string }[] = [
    { id: "calm", label: "Calm", emoji: "🌙" },
    { id: "upbeat", label: "Upbeat", emoji: "⚡" },
    { id: "melancholic", label: "Melancholic", emoji: "🌧️" },
    { id: "epic", label: "Epic", emoji: "🏔️" },
  ];
  const durations: (typeof duration)[] = [15, 30, 60];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border/60 bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-steel" />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Mood
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {moods.map((m) => (
            <button
              key={m.id}
              onClick={() => setMood(m.id)}
              className={`rounded-2xl border px-3 py-3 flex flex-col items-center gap-1 transition ${
                mood === m.id
                  ? "border-steel/60 bg-steel/15"
                  : "border-border/60 bg-muted/30 hover:bg-muted/60"
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {m.emoji}
              </span>
              <span className={`text-xs font-medium ${mood === m.id ? "text-steel" : ""}`}>
                {m.label}
              </span>
            </button>
          ))}
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Duration
          </div>
          <div className="grid grid-cols-3 gap-2">
            {durations.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  duration === d
                    ? "border-steel/60 bg-steel/15 text-steel"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-steel to-teal text-cream py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loading ? "Composing…" : "Generate music"}
        </button>
      </section>

      <div className="rounded-3xl border border-border/60 bg-card p-4">
        <div className="flex items-end gap-1 h-16">
          {Array.from({ length: 28 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ height: 4 }}
              animate={{
                height: loading
                  ? [4, 8 + Math.abs(Math.sin(i * 0.6)) * 36, 4]
                  : 4 + Math.abs(Math.sin(i * 0.5)) * 28,
              }}
              transition={{
                duration: loading ? 0.6 : 0.5,
                repeat: loading ? Infinity : 0,
                delay: i * 0.04,
              }}
              className="flex-1 rounded-full bg-gradient-to-t from-steel/40 to-steel"
            />
          ))}
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground text-center">
          {loading ? "Composing your track…" : `${mood} · ${duration}s preview`}
        </div>
      </div>
    </div>
  );
}

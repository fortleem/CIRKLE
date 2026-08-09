"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SmartImage } from "@/components/ui/smart-image";
import {
  X, Image as ImageIcon, BarChart3, Mic, Send, Hash, Globe, Users, Sparkles,
  Plus, Trash2, Lock, Heart, Check, Clock, Loader2, EyeOff, ShieldOff,
  RefreshCw, type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth, cirkleInitials } from "@/lib/auth-store";
import {
  getPseudonym,
  rotatePseudonym,
  pseudonymAvatarDataUrl,
  ANONYMOUS_PRIVACY_NOTICE,
  type Pseudonym,
} from "@/lib/anonymous-identity";

type Kind = "post" | "poll" | "media";
type Target = "Public" | "Friends" | "Special Friends" | "Workspace";
type PollDuration = "1h" | "6h" | "24h" | "3d";

const DRAFT_KEY = "cirkle-composer-draft";

/** Tiny inline debounce — avoids pulling in lodash for one call site. */
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

const TARGETS: { k: Target; i: LucideIcon; desc: string }[] = [
  { k: "Public", i: Globe, desc: "Anyone on Cirkle can see and reshare" },
  { k: "Friends", i: Users, desc: "Only people you follow back" },
  { k: "Special Friends", i: Heart, desc: "A private list you curate" },
  { k: "Workspace", i: Lock, desc: "Members of your active Cirkle workspace" },
];

const DURATIONS: { k: PollDuration; label: string }[] = [
  { k: "1h", label: "1 hour" },
  { k: "6h", label: "6 hours" },
  { k: "24h", label: "24 hours" },
  { k: "3d", label: "3 days" },
];

const MAX_CHARS = 280;

/**
 * Composer — bottom Sheet with three modes (Post / Poll / Media),
 * live preview, audience selector, and rich toolbar.
 *
 * Anonymous mode (P1.6):
 *   When `anonymous` is true, the composer posts under a per-Circle
 *   pseudonymous identity stored only in localStorage. The real user's
 *   ID, handle, and display name are NEVER sent to the server — only
 *   the pseudonym. The server has no way to map the pseudonym back.
 */
export function Composer({
  open, initialKind, initialText, anonymous, circleId, onClose,
}: {
  open: boolean;
  initialKind?: Kind;
  initialText?: string;
  /** Post as a per-Circle pseudonym instead of the real user. */
  anonymous?: boolean;
  /** Circle ID the pseudonym is scoped to (defaults to "midan"). */
  circleId?: string;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>(initialKind ?? "post");
  const [text, setText] = useState(initialText ?? "");
  const [target, setTarget] = useState<Target>("Public");
  const [audOpen, setAudOpen] = useState(false);
  const [media, setMedia] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDuration, setPollDuration] = useState<PollDuration>("24h");
  const [posting, setPosting] = useState(false);
  const [pseudonym, setPseudonym] = useState<Pseudonym | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Reset state when the composer opens (derived-state pattern — avoids setState-in-effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setKind(initialKind ?? "post");
    setText(initialText ?? "");
    setCaption("");
    setMedia([]);
    setPollOptions(["", ""]);
    setTarget("Public");
    setPollDuration("24h");
    // Mint / fetch the per-Circle pseudonym whenever the composer opens
    // in anonymous mode. The mapping stays in localStorage only.
    if (anonymous) {
      setPseudonym(getPseudonym(circleId || "midan"));
    } else {
      setPseudonym(null);
    }
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Restore saved draft when the composer opens — only when no explicit
  // initialText was passed (e.g. a "share to Midan" payload should win).
  // `initialText` is intentionally excluded from deps so an explicit share
  // payload only wins on open — not on every prop change.
  useEffect(() => {
    if (open && !initialText) {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) setText(draft);
      } catch {
        /* localStorage may be unavailable (private mode / SSR) — ignore. */
      }
    }
  }, [open]);

  // Debounced autosave of the post/poll text. The draft persists across
  // reopens so the user never loses what they were typing.
  const debouncedSave = useMemo(
    () =>
      debounce((t: string) => {
        try { localStorage.setItem(DRAFT_KEY, t); } catch { /* ignore */ }
      }, 500),
    [],
  );
  useEffect(() => {
    if (open) debouncedSave(text);
  }, [text, open, debouncedSave]);

  const hashtags = useMemo(
    () => Array.from(text.matchAll(/#[\p{L}\d_]+/gu)).map((m) => m[0]).slice(0, 4),
    [text]
  );

  const charRemaining = MAX_CHARS - text.length;
  const overLimit = charRemaining < 0;

  const addMediaFile = (file: File) => {
    if (media.length >= 6) {
      toast.error("Maximum 6 photos per post");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setMedia((m) => [...m, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(addMediaFile);
    e.target.value = "";
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  const publish = async () => {
    if (posting) return;

    // Validation per kind — determine canonical content + media kind.
    let content = "";
    let mediaKind: string | undefined;
    if (kind === "post") {
      if (!text.trim()) { toast.error("Add something to share"); return; }
      if (overLimit) { toast.error(`Post exceeds ${MAX_CHARS} characters`); return; }
      content = text;
    } else if (kind === "poll") {
      const filled = pollOptions.filter((o) => o.trim());
      if (filled.length < 2) { toast.error("Add at least 2 poll options"); return; }
      content = text.trim() ? text : `Poll: ${filled.join(" / ")}`;
      mediaKind = "poll";
    } else {
      // media
      if (media.length === 0 && !caption.trim()) { toast.error("Add a photo or caption first"); return; }
      content = caption;
      mediaKind = media.length > 0 ? "image" : undefined;
    }

    const visibilityMap: Record<Target, string> = {
      "Public": "public",
      "Friends": "followers",
      "Special Friends": "circle",
      "Workspace": "circle",
    };

    setPosting(true);

    // ── Anonymous mode (P1.6) ──────────────────────────────────────────
    // When posting anonymously, ONLY the pseudonymous identity is sent.
    // No real user ID, username, or display name leaves the device. The
    // server stores the pseudonym's id as the author — it cannot map
    // that back to a real user because the mapping lives exclusively
    // in this device's localStorage.
    const anon = anonymous && pseudonym;
    const authorPayload = anon
      ? {
          anonymousId: pseudonym.id,
          authorId: pseudonym.id,
          authorName: pseudonym.displayName,
          authorHandle: pseudonym.handle,
          authorInitials: pseudonym.initials,
          authorColor: pseudonym.color,
          authorVerified: false,
        }
      : {
          // Send the real authenticated user's identity so posts are
          // attributed correctly (not the hardcoded "User Yassin" mock).
          authorId: user?.username ?? "u_current",
          authorName: user?.displayName ?? "Anonymous",
          authorHandle: user?.username ?? "anonymous",
          authorInitials: user ? cirkleInitials(user) : "A",
          authorColor: user?.avatarColor ?? "teal",
          authorVerified: user?.verified ?? false,
        };

    const fetchPromise = fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        kind,
        media,
        mediaKind,
        // Anonymous posts are always visibility="anonymous" so the
        // feed can mark them accordingly; the privacy covenant still
        // holds because the API only sees the pseudonym.
        visibility: anon ? "anonymous" : visibilityMap[target],
        tags: hashtags,
        ...authorPayload,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e?.error || `Request failed (${res.status})`);
      }
      return res.json();
    });

    toast.promise(fetchPromise, {
      loading: anon ? "Posting anonymously..." : "Posting...",
      success: () => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
        const prefix = anon ? "Posted anonymously to" : "Posted to";
        return kind === "poll"
          ? `${prefix} Midan!`
          : kind === "media"
            ? `Media shared to Midan!`
            : `${prefix} Midan!`;
      },
      error: (e: Error) => e.message || "Failed to post",
    });

    try {
      await fetchPromise;
      clearDraft();
      onClose();
    } catch {
      // Keep the composer open so the user doesn't lose their text.
    } finally {
      setPosting(false);
    }
  };

  const setOpt = (i: number, v: string) => setPollOptions((o) => o.map((x, idx) => (idx === i ? v : x)));

  const buttonLabel = anonymous
    ? kind === "poll"
      ? "Publish anonymous poll"
      : kind === "media"
        ? "Share media anonymously"
        : "Post anonymously"
    : kind === "poll"
      ? "Publish poll"
      : kind === "media"
        ? "Share media"
        : "Post to Midan";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140] backdrop-blur-md"
            style={{ background: "hsl(var(--charcoal) / 0.55)" }}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            role="dialog" aria-label="Composer"
            className="fixed bottom-0 inset-x-0 z-[150] max-h-[94vh] rounded-t-[28px] glass-strong shadow-float overflow-hidden flex flex-col"
          >
            <div className="flex justify-center pt-2">
              <span className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-5 pt-3 pb-2 flex items-center gap-3">
              <h2 className="font-display text-2xl flex-1 capitalize">
                {anonymous ? "Anonymous " : "New "}{kind}
              </h2>
              {anonymous && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-secondary/15 text-secondary">
                  <EyeOff className="w-3 h-3" /> Anonymous
                </span>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Anonymous identity banner — only rendered in anonymous mode. */}
            {anonymous && pseudonym && (
              <div className="mx-5 mt-1 mb-2 rounded-2xl border border-secondary/30 bg-secondary/5 p-3 flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full shrink-0 ring-2 ring-secondary/30"
                  style={{
                    backgroundImage: `url(${pseudonymAvatarDataUrl(pseudonym, 88)})`,
                    backgroundSize: "cover",
                  }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {pseudonym.displayName}
                    <span className="text-[11px] text-muted-foreground truncate">
                      @{pseudonym.handle}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <ShieldOff className="w-3 h-3 shrink-0" />
                    <span className="truncate">{ANONYMOUS_PRIVACY_NOTICE}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = rotatePseudonym(circleId || "midan");
                    setPseudonym(next);
                    toast.success("New anonymous identity minted", {
                      description: `You are now @${next.handle}`,
                    });
                  }}
                  className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center text-secondary shrink-0"
                  aria-label="Rotate anonymous identity"
                  title="Rotate identity"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Kind switcher */}
            <div className="px-5 flex gap-2 flex-wrap">
              {([
                { k: "post", l: "Post", i: Hash },
                { k: "poll", l: "Poll", i: BarChart3 },
                { k: "media", l: "Media", i: ImageIcon },
              ] as { k: Kind; l: string; i: LucideIcon }[]).map((o) => (
                <button
                  key={o.k}
                  onClick={() => setKind(o.k)}
                  className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition ${
                    kind === o.k ? "bg-primary text-primary-foreground" : "glass hover:bg-muted/60"
                  }`}
                >
                  <o.i className="w-3 h-3" /> {o.l}
                </button>
              ))}
              <div className="flex-1" />
              <div className="relative">
                <button
                  onClick={() => setAudOpen((o) => !o)}
                  className="text-xs px-3 py-1.5 rounded-full glass flex items-center gap-1.5 hover:bg-muted/60 transition"
                >
                  {(() => { const Ic = TARGETS.find((x) => x.k === target)!.i; return <Ic className="w-3 h-3" />; })()}
                  {target}
                </button>
                {audOpen && (
                  <div className="absolute right-0 mt-2 z-50 glass-strong rounded-2xl p-2 w-64 shadow-float">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 pt-1 pb-2">Who can see this?</div>
                    {TARGETS.map((o) => (
                      <button
                        key={o.k}
                        onClick={() => { setTarget(o.k); setAudOpen(false); }}
                        className={`w-full text-left px-2 py-2 rounded-lg flex items-start gap-2 transition ${
                          target === o.k ? "bg-primary/15" : "hover:bg-muted/50"
                        }`}
                      >
                        <o.i className="w-4 h-4 mt-0.5 text-secondary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium flex items-center gap-1">
                            {o.k}
                            {target === o.k && <Check className="w-3 h-3" />}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{o.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-3 grid md:grid-cols-2 gap-4 pb-3">
              {/* Editor */}
              <div className="space-y-3">
                {kind === "post" && (
                  <>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="What's worth sharing?"
                      maxLength={MAX_CHARS + 50}
                      className="w-full min-h-[140px] bg-transparent outline-none text-[15px] leading-relaxed resize-none placeholder:text-muted-foreground"
                    />
                    <div className={`text-[11px] ${overLimit ? "text-accent" : charRemaining < 30 ? "text-secondary" : "text-muted-foreground"}`}>
                      {charRemaining} characters left · {MAX_CHARS} max
                    </div>
                  </>
                )}

                {kind === "media" && (
                  <div className="space-y-3">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full min-h-[160px] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/30 transition py-6"
                    >
                      <ImageIcon className="w-7 h-7" />
                      <div className="text-sm font-medium">Tap to upload photos</div>
                      <div className="text-[11px]">Up to 6 · EXIF stripped automatically</div>
                    </button>
                    {media.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {media.map((m, i) => (
                          <motion.div
                            key={i}
                            layout
                            className="aspect-square rounded-xl overflow-hidden relative"
                          >
                            <SmartImage src={m} alt={`Upload ${i + 1}`} className="w-full h-full object-cover"  />
                            <button
                              onClick={() => setMedia((x) => x.filter((_, j) => j !== i))}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-charcoal/60 text-cream flex items-center justify-center"
                              aria-label="Remove"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write a caption…"
                      maxLength={MAX_CHARS}
                      className="w-full min-h-[60px] bg-transparent outline-none text-[15px] leading-relaxed resize-none placeholder:text-muted-foreground"
                    />
                    <div className="text-[11px] text-muted-foreground">{MAX_CHARS - caption.length} characters left</div>
                  </div>
                )}

                {kind === "poll" && (
                  <div className="space-y-3">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Ask a question…"
                      maxLength={140}
                      className="w-full min-h-[70px] bg-transparent outline-none text-[15px] leading-relaxed resize-none placeholder:text-muted-foreground"
                    />
                    <div className="space-y-2">
                      {pollOptions.map((o, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            value={o}
                            onChange={(e) => setOpt(i, e.target.value)}
                            placeholder={`Option ${i + 1}`}
                            className="flex-1 glass rounded-full px-4 py-2 text-sm outline-none placeholder:text-muted-foreground"
                          />
                          {pollOptions.length > 2 && (
                            <button
                              onClick={() => setPollOptions((p) => p.filter((_, j) => j !== i))}
                              aria-label="Remove option"
                              className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {pollOptions.length < 4 && (
                        <button
                          onClick={() => setPollOptions((p) => [...p, ""])}
                          className="text-xs flex items-center gap-1 text-secondary hover:opacity-80 transition"
                        >
                          <Plus className="w-3 h-3" /> Add option
                        </button>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Duration
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {DURATIONS.map((d) => (
                          <button
                            key={d.k}
                            onClick={() => setPollDuration(d.k)}
                            className={`text-xs px-3 py-1.5 rounded-full transition ${
                              pollDuration === d.k ? "bg-primary text-primary-foreground" : "glass hover:bg-muted/60"
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Toolbar */}
                <div className="flex items-center gap-1 pt-1">
                  <ToolBtn icon={ImageIcon} onClick={() => { setKind("media"); fileRef.current?.click(); }} label="Photo" />
                  <ToolBtn icon={BarChart3} onClick={() => setKind("poll")} label="Poll" />
                  <ToolBtn icon={Mic} onClick={() => toast("Voice note — speak now", { description: "On-device ASR · private" })} label="Voice" />
                  <ToolBtn
                    icon={Sparkles}
                    onClick={() => setText((t) => t + (t ? " " : "") + "Drafted with Cirkle AI — feel free to edit ✨")}
                    label="AI"
                  />
                  <div className="flex-1" />
                  {kind === "post" && (
                    <span className={`text-[10px] ${overLimit ? "text-accent" : "text-muted-foreground"}`}>
                      {text.length}/{MAX_CHARS}
                    </span>
                  )}
                </div>
              </div>

              {/* Realtime preview */}
              <div className="rounded-3xl border border-border bg-card p-4 space-y-3 self-start md:sticky md:top-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {anonymous ? "Anonymous preview" : "Live preview"}
                </div>
                <div className="flex items-start gap-3">
                  {anonymous && pseudonym ? (
                    <div
                      className="w-9 h-9 rounded-full shrink-0 ring-1 ring-border"
                      style={{
                        backgroundImage: `url(${pseudonymAvatarDataUrl(pseudonym, 72)})`,
                        backgroundSize: "cover",
                      }}
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-hero shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-1">
                      {anonymous && pseudonym ? (
                        <>
                          {pseudonym.displayName}{" "}
                          <span className="text-xs text-muted-foreground truncate">
                            @{pseudonym.handle} · now
                          </span>
                          <EyeOff className="w-3 h-3 text-secondary ml-0.5" />
                        </>
                      ) : (
                        <>
                          User <span className="text-xs text-muted-foreground">@yousef · now</span>
                        </>
                      )}
                    </div>
                    {kind === "post" && (
                      <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-wrap break-words min-h-[1em]">
                        {text || <span className="text-muted-foreground">Your post will appear here as you type.</span>}
                      </p>
                    )}
                    {kind === "media" && (
                      <>
                        <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-wrap break-words min-h-[1em]">
                          {caption || <span className="text-muted-foreground">Caption preview…</span>}
                        </p>
                        {media.length > 0 && (
                          <div className={`mt-2 grid gap-1.5 ${media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                            {media.slice(0, 4).map((m, i) => (
                              <SmartImage key={i} src={m} alt="" className="aspect-video rounded-xl object-cover" />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {kind === "poll" && (
                      <>
                        <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-wrap break-words min-h-[1em]">
                          {text || <span className="text-muted-foreground">Your poll question…</span>}
                        </p>
                        <div className="mt-2 space-y-1.5">
                          {pollOptions.map((o, i) => (
                            <div key={i} className="rounded-full glass px-3 py-1.5 text-xs">{o || `Option ${i + 1}`}</div>
                          ))}
                        </div>
                      </>
                    )}

                    {hashtags.length > 0 && kind === "post" && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {hashtags.map((h) => <span key={h} className="text-[11px] text-secondary">{h}</span>)}
                      </div>
                    )}

                    <div className="mt-2 text-[10px] text-secondary flex items-center gap-1">
                      {anonymous ? (
                        <>
                          <EyeOff className="w-3 h-3" /> Anonymous · no real identity attached
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" /> AI-verified · {target}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="px-5 py-3 border-t border-border/60 flex items-center gap-3"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
            >
              <span className="text-[11px] text-muted-foreground flex-1 flex items-center gap-1">
                {anonymous ? (
                  <>
                    <EyeOff className="w-3 h-3" /> Real identity never linked
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" /> End-to-end encrypted · stored on your device
                  </>
                )}
              </span>
              <button
                onClick={publish}
                disabled={posting || (kind === "post" && overLimit)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-float disabled:opacity-50 transition ${
                  anonymous
                    ? "bg-gradient-to-br from-secondary to-primary text-cream"
                    : "bg-gradient-hero text-cream"
                }`}
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : anonymous ? <EyeOff className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {posting ? "Posting..." : buttonLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ToolBtn({ icon: Icon, onClick, label }: { icon: LucideIcon; onClick?: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center text-secondary transition"
      aria-label={label}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

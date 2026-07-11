"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Languages, Mic, MicOff, Video, VideoOff, Volume2, VolumeX,
  PhoneOff, ArrowLeftRight, Type, Subtitles, ShieldCheck, Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Utterance {
  id: number;
  speaker: "them" | "me";
  original: string;
  translation: string;
  rtl: boolean;
}

const SCRIPT: Utterance[] = [
  { id: 1, speaker: "them", original: "السلام عليكم، كيف حالك اليوم؟", translation: "Peace be upon you, how are you today?", rtl: true },
  { id: 2, speaker: "me", original: "I'm great, thanks!", translation: "أنا بخير، شكراً!", rtl: false },
];

const LANGS = [
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "ur", name: "Urdu", flag: "🇵🇰" },
  { code: "fa", name: "Persian", flag: "🇮🇷" },
];

type FontSize = "S" | "M" | "L";
type Position = "top" | "bottom";

export function LiveTranslate({ open, onClose }: Props) {
  const [theirLang, setTheirLang] = useState("ar");
  const [myLang, setMyLang] = useState("en");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [fontSize, setFontSize] = useState<FontSize>("M");
  const [position, setPosition] = useState<Position>("bottom");
  const [showOriginal, setShowOriginal] = useState(true);
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(0); // words revealed in current utterance
  const [confidence, setConfidence] = useState(94);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived-state pattern: reset subtitle state when the call opens.
  // (Avoids set-state-in-effect — same pattern as mashahd-player.tsx.)
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setCurrent(0);
      setRevealed(0);
      setConfidence(94);
    }
  }

  // Word-by-word reveal logic
  useEffect(() => {
    if (!open) return;
    let uIdx = 0;
    let wIdx = 0;
    const tick = () => {
      const u = SCRIPT[uIdx];
      if (!u) return;
      const words = u.original.split(/\s+/);
      wIdx += 1;
      if (wIdx > words.length) {
        // Pause then move to next utterance
        setTimeout(() => {
          uIdx = (uIdx + 1) % SCRIPT.length;
          setCurrent(uIdx);
          setRevealed(0);
          wIdx = 0;
          setConfidence(88 + Math.floor(Math.random() * 11));
        }, 1400);
        wIdx = 0;
      } else {
        setRevealed(wIdx);
      }
    };
    intervalRef.current = setInterval(tick, 380);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open]);

  const swap = () => {
    setTheirLang(myLang);
    setMyLang(theirLang);
  };

  const endCall = () => {
    toast("Call ended", { description: "Live Translate stopped." });
    onClose();
  };

  const fontClass = fontSize === "S" ? "text-sm" : fontSize === "M" ? "text-base" : "text-xl";

  const subtitle = SCRIPT[current];
  const visibleWords = subtitle.original.split(/\s+/).slice(0, revealed).join(" ");
  const remaining = subtitle.original.split(/\s+/).slice(revealed).join(" ");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="dark fixed inset-0 z-[160] bg-charcoal overflow-hidden flex flex-col"
        >
          {/* Remote video */}
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, hsl(195 56% 23%), hsl(211 30% 42%) 60%, hsl(351 41% 45%))`,
              }}
            />
            {/* Faux remote scene */}
            <div className="absolute inset-0 opacity-60"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 30%, hsl(39 60% 70% / 0.6), transparent 60%)",
              }}
            />
            <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-gradient-to-br from-primary/20 to-secondary/10" />
          </div>

          {/* Aurora subtle */}
          <div className="absolute inset-0 aurora-bg opacity-20 pointer-events-none" />

          {/* Header */}
          <header className="relative z-10 px-5 pt-5 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-steel/40 to-primary/30 border border-steel/40 flex items-center justify-center shrink-0 glass">
              <Languages className="w-5 h-5 text-cream" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl text-cream">Live Translate</div>
              <div className="text-[11px] text-cream/70 truncate">
                Real-time subtitles · translated on-device
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-accent/30 border border-accent/50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-cream">LIVE · translating</span>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-cream/10 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-cream" />
            </button>
          </header>

          {/* Language pair */}
          <div className="relative z-10 px-5 pb-3 flex items-center gap-2">
            <div className="flex-1 glass rounded-xl px-3 py-2">
              <div className="text-[9px] uppercase tracking-widest text-cream/60">They speak</div>
              <Select value={theirLang} onValueChange={setTheirLang}>
                <SelectTrigger className="bg-transparent border-0 p-0 h-6 text-cream shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={swap}
              className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-cream/10 transition shrink-0"
              aria-label="Swap languages"
            >
              <ArrowLeftRight className="w-4 h-4 text-cream" />
            </button>
            <div className="flex-1 glass rounded-xl px-3 py-2">
              <div className="text-[9px] uppercase tracking-widest text-cream/60">I speak</div>
              <Select value={myLang} onValueChange={setMyLang}>
                <SelectTrigger className="bg-transparent border-0 p-0 h-6 text-cream shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Confidence meter */}
          <div className="relative z-10 px-5 pb-2 flex items-center justify-between">
            <span className="text-[10px] text-cream/70 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              AI confidence: <span className="font-medium text-cream">{confidence}%</span>
            </span>
            <span className="text-[10px] text-cream/70 tabular-nums">
              Utterance {current + 1}/{SCRIPT.length}
            </span>
          </div>

          {/* Spacer for video area */}
          <div className="relative z-10 flex-1 flex items-end justify-end p-5">
            {/* PiP self-preview */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-28 h-40 rounded-2xl overflow-hidden border-2 border-cream/30 glass-strong relative"
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(351 41% 50% / 0.7), hsl(39 60% 60% / 0.5))",
                }}
              />
              <div className="absolute bottom-1.5 left-1.5 text-[9px] text-cream/80 uppercase tracking-widest">
                You
              </div>
              {!camOn && (
                <div className="absolute inset-0 bg-charcoal/80 flex items-center justify-center">
                  <VideoOff className="w-5 h-5 text-cream/70" />
                </div>
              )}
            </motion.div>
          </div>

          {/* Subtitles */}
          {position === "top" && (
            <SubtitleBlock
              visibleWords={visibleWords}
              remaining={remaining}
              subtitle={subtitle}
              showOriginal={showOriginal}
              fontClass={fontClass}
            />
          )}

          {/* Bottom control bar */}
          <div className="relative z-10 px-5 pb-6 pt-3 space-y-3">
            {position === "bottom" && (
              <SubtitleBlock
                visibleWords={visibleWords}
                remaining={remaining}
                subtitle={subtitle}
                showOriginal={showOriginal}
                fontClass={fontClass}
              />
            )}

            {/* Subtitle settings row */}
            <div className="glass rounded-2xl p-3 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-widest text-cream/60 flex items-center gap-1 mr-1">
                  <Type className="w-3 h-3" /> Font
                </span>
                {(["S", "M", "L"] as FontSize[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFontSize(s)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-medium transition",
                      fontSize === s
                        ? "bg-cream text-charcoal"
                        : "bg-cream/10 text-cream/80 hover:bg-cream/20"
                    )}
                  >
                    {s}
                  </button>
                ))}
                <span className="text-[10px] uppercase tracking-widest text-cream/60 flex items-center gap-1 ml-3 mr-1">
                  <Subtitles className="w-3 h-3" /> Position
                </span>
                {(["top", "bottom"] as Position[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPosition(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-medium capitalize transition",
                      position === p
                        ? "bg-cream text-charcoal"
                        : "bg-cream/10 text-cream/80 hover:bg-cream/20"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[11px] text-cream/80 cursor-pointer">
                  <span className="relative">
                    <input
                      type="checkbox"
                      checked={showOriginal}
                      onChange={(e) => setShowOriginal(e.target.checked)}
                      className="sr-only peer"
                    />
                    <span className="w-9 h-5 rounded-full bg-cream/15 peer-checked:bg-secondary transition" />
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-cream transition peer-checked:translate-x-4" />
                  </span>
                  Show original text
                </label>
              </div>
            </div>

            {/* Call controls */}
            <div className="flex items-center justify-center gap-3">
              <CallToggle on={micOn} onClick={() => setMicOn((v) => !v)} onIcon={Mic} offIcon={MicOff} label="Mic" />
              <CallToggle on={camOn} onClick={() => setCamOn((v) => !v)} onIcon={Video} offIcon={VideoOff} label="Camera" />
              <CallToggle on={speakerOn} onClick={() => setSpeakerOn((v) => !v)} onIcon={Volume2} offIcon={VolumeX} label="Speaker" />
              <button
                onClick={endCall}
                className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center hover:opacity-90 transition shadow-float"
                aria-label="End call"
              >
                <PhoneOff className="w-5 h-5 text-destructive-foreground" />
              </button>
            </div>

            {/* Privacy */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-cream/60">
              <ShieldCheck className="w-3 h-3" />
              Translation runs on-device. Your call audio is never sent to servers.
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SubtitleBlock({
  visibleWords,
  remaining,
  subtitle,
  showOriginal,
  fontClass,
}: {
  visibleWords: string;
  remaining: string;
  subtitle: Utterance;
  showOriginal: boolean;
  fontClass: string;
}) {
  return (
    <motion.div
      key={subtitle.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-4 space-y-2 max-w-2xl mx-auto"
    >
      <div className="text-[9px] uppercase tracking-widest text-cream/60">
        {subtitle.speaker === "them" ? "Them" : "You"} · speaking
      </div>
      <p
        dir={subtitle.rtl ? "rtl" : "ltr"}
        className={cn("font-arabic leading-relaxed text-cream", fontClass)}
      >
        <span className="text-cream font-medium">{visibleWords}</span>
        {remaining && <span className="text-cream/30"> {remaining}</span>}
      </p>
      {showOriginal && (
        <p
          dir={subtitle.rtl ? "ltr" : "rtl"}
          className={cn("font-arabic leading-relaxed text-cream/70 text-[13px] pt-1.5 border-t border-cream/10", fontClass)}
        >
          {subtitle.translation}
        </p>
      )}
    </motion.div>
  );
}

function CallToggle({
  on, onClick, onIcon: OnIcon, offIcon: OffIcon, label,
}: {
  on: boolean;
  onClick: () => void;
  onIcon: typeof Mic;
  offIcon: typeof MicOff;
  label: string;
}) {
  const Icon = on ? OnIcon : OffIcon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center transition shadow-soft",
        on ? "glass text-cream hover:bg-cream/10" : "bg-cream text-charcoal"
      )}
      aria-label={`${label} ${on ? "on" : "off"}`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

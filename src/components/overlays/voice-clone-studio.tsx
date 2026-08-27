// @ts-nocheck
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  X, Mic, Play, Pause, Square, Loader2, CheckCircle2, AlertTriangle,
  AudioWaveform, Sparkles, Settings2, Volume2, RotateCcw, Wand2,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  isVoiceCloneSupported,
  cloneVoice,
  speakWithClonedVoice,
  getVoiceCloneStatus,
  classifyMediaError,
  type VoiceCloneStatus,
} from "@/lib/voice-cloning";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface StartDetail {
  userId?: string;
}

type Step = "intro" | "record" | "training" | "ready" | "test";

const TARGET_DURATION = 30; // seconds — recommended sample length
const MIN_DURATION = 10;    // minimum acceptable sample length
const MAX_DURATION = 60;    // hard cap

const TEST_PHRASES = [
  "Hey — this is my voice clone speaking.",
  "Reading this back to you in my exact tone. Wild, right?",
  "Welcome to Cirkle. This message was AI-spoken.",
];

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Deterministic pseudo-waveform from a string (no external assets).
function fingerprint(seed: string, bars = 48): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    out.push(0.2 + (h % 1000) / 1000 * 0.8);
  }
  return out;
}

/**
 * Voice Clone Studio overlay (E9).
 *
 * NOTE: There is an existing minimal `voice-clone.tsx` overlay in the codebase.
 * This is the FULL implementation as required by the task spec — it's named
 * `voice-clone-studio.tsx` so it doesn't collide with the existing file.
 *
 * Opens via `circle:voice-clone-studio` event with `{ userId }`.
 *
 * Flow:
 *   1. Intro screen (if no existing clone).
 *   2. Record 30-second sample via MediaRecorder.
 *   3. POST to /api/voice/clone → returns voiceId.
 *   4. "Ready" screen with sample playback.
 *   5. Test tab — enter text, POST to /api/voice/speak, play synthesized audio.
 *   6. Settings — toggle "Use cloned voice for outgoing voice messages".
 *
 * ⚠️ MOCK: the backend uses `cloneVoiceServer` / `speakWithClonedVoiceServer`
 * which return deterministic mock data. Production must wire in ElevenLabs /
 * Coqui / PlayHT — see `src/lib/voice-cloning.ts` header.
 */
export function VoiceCloneStudio({ open, onClose }: Props) {
  const supported = isVoiceCloneSupported();
  const [step, setStep] = useState<Step>("intro");
  const [userId, setUserId] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [training, setTraining] = useState(false);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [cloneStatus, setCloneStatus] = useState<VoiceCloneStatus | null>(null);

  // Test tab
  const [testText, setTestText] = useState(TEST_PHRASES[0]);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthAudioUrl, setSynthAudioUrl] = useState<string | null>(null);
  const [synthPlaying, setSynthPlaying] = useState(false);
  const synthAudioRef = useRef<HTMLAudioElement | null>(null);

  // Settings
  const [useForVoiceMessages, setUseForVoiceMessages] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset on close ──────────────────────────────────────────────────────
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setTimeout(() => {
        cleanupRecording();
        setStep("intro");
        setRecording(false);
        setPaused(false);
        setSeconds(0);
        setError(null);
        setBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setTraining(false);
        setVoiceId(null);
        setCloneStatus(null);
        setSynthAudioUrl(null);
        setSynthPlaying(false);
        setShowSettings(false);
      }, 0);
    }
  }

  function cleanupRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) {
        try { t.stop(); } catch { /* */ }
      }
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }
  useEffect(() => () => cleanupRecording(), []);

  // ── Event listener ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent<StartDetail>).detail || {};
      const uid = detail.userId || `u_${Date.now().toString(36)}`;
      setUserId(uid);
      // Check if there's already a clone for this user.
      void checkExistingClone(uid);
    };
    window.addEventListener("circle:voice-clone-studio", onStart as EventListener);
    return () => {
      window.removeEventListener("circle:voice-clone-studio", onStart as EventListener);
    };
  }, [open]);

  // ── Check existing clone ─────────────────────────────────────────────────
  const checkExistingClone = async (uid: string) => {
    const existing = await getVoiceCloneStatus(uid);
    if (existing && existing.status === "ready") {
      setVoiceId(existing.voiceId);
      setCloneStatus("ready");
      setStep("ready");
    } else {
      setStep("intro");
    }
  };

  // ── Recording ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    setError(null);
    if (!supported) {
      setError("MediaRecorder is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: mimeType });
        setBlob(finalBlob);
        setAudioUrl(URL.createObjectURL(finalBlob));
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setPaused(false);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_DURATION) {
            void stopRecording();
            return MAX_DURATION;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      setError(classifyMediaError(err).message);
    }
  };

  const pauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setPaused(false);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_DURATION) {
            void stopRecording();
            return MAX_DURATION;
          }
          return s + 1;
        });
      }, 1000);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) {
        try { t.stop(); } catch { /* */ }
      }
      streamRef.current = null;
    }
  };

  const resetRecording = () => {
    cleanupRecording();
    setRecording(false);
    setPaused(false);
    setSeconds(0);
    setBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  };

  // ── Submit for cloning ───────────────────────────────────────────────────
  const submitForCloning = async () => {
    if (!blob || !userId) return;
    if (seconds < MIN_DURATION) {
      toast.error(`Sample too short — please record at least ${MIN_DURATION}s.`);
      return;
    }
    setTraining(true);
    setStep("training");
    try {
      const result = await cloneVoice(blob, { userId, durationSec: seconds });
      setVoiceId(result.voiceId);
      setCloneStatus(result.status);
      setStep("ready");
      toast.success("Voice clone ready! You can now test it below.");
    } catch (err) {
      setError((err as Error)?.message || "Failed to clone voice.");
      setStep("record");
    } finally {
      setTraining(false);
    }
  };

  // ── Test synthesis ────────────────────────────────────────────────────────
  const synthesize = async () => {
    if (!voiceId) return;
    if (!testText.trim()) {
      toast.error("Please enter some text to synthesize.");
      return;
    }
    setSynthesizing(true);
    setError(null);
    try {
      const result = await speakWithClonedVoice(voiceId, testText);
      if (synthAudioUrl) URL.revokeObjectURL(synthAudioUrl);
      // The mock returns a data: URL directly. For real providers we'd convert
      // the binary blob to an object URL.
      setSynthAudioUrl(result.audioUrl);
      toast.success(`Synthesized ${result.duration}s of audio (${result.provider}).`);
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to synthesize speech.");
    } finally {
      setSynthesizing(false);
    }
  };

  const playSynth = () => {
    if (!synthAudioUrl || !synthAudioRef.current) return;
    if (synthPlaying) {
      synthAudioRef.current.pause();
      setSynthPlaying(false);
    } else {
      void synthAudioRef.current.play().catch(() => {});
      setSynthPlaying(true);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const progress = Math.min(100, (seconds / TARGET_DURATION) * 100);
  const bars = fingerprint(userId || "default", 32);

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" ariaLabel="Voice clone studio" maxWidth="max-w-lg">
      <div className="flex flex-col h-full bg-card">
        {/* Header */}
        <header className="px-5 py-4 flex items-center gap-3 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-primary/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Wand2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg">Voice Clone Studio</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {voiceId ? `voice ID: ${voiceId.slice(0, 16)}…` : "Clone your voice for outgoing messages"}
            </div>
          </div>
          <button
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Toggle settings"
            aria-pressed={showSettings}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition",
              showSettings ? "bg-emerald-500/20 text-emerald-700" : "hover:bg-accent",
            )}
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            aria-label="Close voice clone studio"
            className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Settings panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="px-5 py-3 space-y-3 bg-accent/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">Use cloned voice for outgoing voice messages</div>
                    <div className="text-[11px] text-muted-foreground">
                      When on, voice messages you send will be re-synthesized in your cloned voice.
                    </div>
                  </div>
                  <Switch
                    checked={useForVoiceMessages}
                    onCheckedChange={setUseForVoiceMessages}
                    aria-label="Toggle cloned voice for outgoing voice messages"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!supported ? (
            <div className="glass rounded-2xl p-6 text-center border border-rose-500/30">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <div className="font-display text-lg mb-2">Browser not supported</div>
              <p className="text-sm text-muted-foreground">
                Voice cloning requires the MediaRecorder API.
              </p>
            </div>
          ) : error && step === "record" ? (
            <div className="glass rounded-2xl p-6 text-center border border-rose-500/30">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <div className="font-display text-lg mb-2">Recording failed</div>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button
                onClick={() => { setError(null); resetRecording(); }}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="w-4 h-4" /> Try again
              </Button>
            </div>
          ) : (
            <>
              {/* Step: intro */}
              {step === "intro" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-primary/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                    <Mic className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="font-display text-xl mb-2">Clone your voice</div>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                    Record a {TARGET_DURATION}-second sample reading any text. Cirkle AI will create a
                    synthetic clone you can use for outgoing voice messages.
                  </p>
                  <Button
                    onClick={() => setStep("record")}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    aria-label="Start recording voice sample"
                  >
                    <Mic className="w-4 h-4" /> Start recording
                  </Button>
                  <div className="text-[10px] text-muted-foreground mt-4 max-w-xs mx-auto">
                    ⚠️ Your sample never leaves your device unencrypted. In production, it's
                    sent to a voice cloning provider (ElevenLabs / Coqui / PlayHT) over TLS.
                  </div>
                </motion.div>
              )}

              {/* Step: record */}
              {step === "record" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="glass rounded-2xl p-5 text-center">
                    <div className="font-display text-3xl tabular-nums mb-3">
                      {formatDuration(seconds)}
                      <span className="text-xs text-muted-foreground ml-2">/ {formatDuration(TARGET_DURATION)}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-[2px] h-16" aria-hidden="true">
                      {bars.map((h, i) => (
                        <motion.div
                          key={i}
                          className={cn(
                            "w-1.5 rounded-full",
                            recording && !paused ? "bg-emerald-500" : "bg-muted-foreground/30",
                          )}
                          animate={recording && !paused ? { height: [`${h * 30}%`, `${h * 80}%`, `${h * 40}%`] } : { height: `${h * 30}%` }}
                          transition={recording && !paused ? { duration: 0.6, repeat: Infinity, delay: i * 0.02 } : { duration: 0.2 }}
                          style={{ height: `${h * 30}%` }}
                        />
                      ))}
                    </div>
                    <div className="mt-3 text-[11px] text-muted-foreground flex items-center justify-center gap-2">
                      {recording ? (
                        paused ? (
                          <><Pause className="w-3 h-3" /> Paused</>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Recording… speak clearly and naturally
                          </>
                        )
                      ) : (
                        <><AudioWaveform className="w-3 h-3" /> Tap the mic to start</>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    {!recording && !blob && (
                      <button
                        onClick={() => void startRecording()}
                        aria-label="Start recording 30-second sample"
                        className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-float transition active:scale-95"
                      >
                        <Mic className="w-8 h-8" />
                      </button>
                    )}
                    {recording && (
                      <>
                        {paused ? (
                          <button
                            onClick={resumeRecording}
                            aria-label="Resume recording"
                            className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-float transition active:scale-95"
                          >
                            <Play className="w-8 h-8" />
                          </button>
                        ) : (
                          <button
                            onClick={pauseRecording}
                            aria-label="Pause recording"
                            className="w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-float transition active:scale-95"
                          >
                            <Pause className="w-8 h-8" />
                          </button>
                        )}
                        <button
                          onClick={() => void stopRecording()}
                          aria-label="Stop recording"
                          className="w-14 h-14 rounded-full bg-charcoal/80 hover:bg-charcoal text-cream border border-cream/30 flex items-center justify-center transition"
                        >
                          <Square className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    {blob && !recording && (
                      <>
                        <Button variant="outline" onClick={resetRecording}>
                          <RotateCcw className="w-4 h-4" /> Re-record
                        </Button>
                        <Button
                          onClick={() => void submitForCloning()}
                          disabled={seconds < MIN_DURATION}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          <Sparkles className="w-4 h-4" /> Build my clone
                        </Button>
                      </>
                    )}
                  </div>

                  {blob && audioUrl && (
                    <div className="glass rounded-xl p-3 border border-emerald-500/20">
                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                        Preview sample
                      </div>
                      <audio src={audioUrl} controls className="w-full" aria-label="Sample playback" />
                      <div className="text-[11px] text-muted-foreground mt-2">
                        {seconds >= MIN_DURATION ? (
                          <span className="text-emerald-700">✓ {seconds}s recorded — ready to clone</span>
                        ) : (
                          <span className="text-amber-700">
                            Need {MIN_DURATION - seconds}s more to proceed
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step: training */}
              {step === "training" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
                  <div className="font-display text-lg mb-2">Training your voice clone…</div>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Analyzing your sample, building a synthetic voice model. This usually takes a few seconds.
                  </p>
                </motion.div>
              )}

              {/* Step: ready / test */}
              {(step === "ready" || step === "test") && voiceId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="glass rounded-2xl p-5 text-center border border-emerald-500/30">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                    <div className="font-display text-lg mb-1">Your clone is ready!</div>
                    <div className="text-[11px] text-muted-foreground font-mono break-all">
                      {voiceId}
                    </div>
                  </div>

                  {/* Test synthesis */}
                  <div className="glass rounded-2xl p-4 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                      <Sparkles className="w-3 h-3 text-emerald-500" /> Test your clone
                    </div>
                    <Textarea
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      placeholder="Enter text to synthesize…"
                      className="mb-3 min-h-[60px]"
                      aria-label="Text to synthesize"
                    />
                    <div className="flex items-center gap-2 mb-3">
                      <Button
                        onClick={() => void synthesize()}
                        disabled={synthesizing}
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        {synthesizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {synthesizing ? "Synthesizing…" : "Synthesize"}
                      </Button>
                      <select
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                        className="text-xs bg-background border border-border rounded-md px-2 py-1.5"
                        aria-label="Pick a test phrase"
                      >
                        {TEST_PHRASES.map((p, i) => (
                          <option key={i} value={p}>{`Phrase ${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                    {synthAudioUrl && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={playSynth}
                          aria-label={synthPlaying ? "Pause synthesis" : "Play synthesis"}
                          className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shrink-0"
                        >
                          {synthPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <audio
                          ref={synthAudioRef}
                          src={synthAudioUrl}
                          onEnded={() => setSynthPlaying(false)}
                          className="flex-1"
                          aria-label="Synthesized audio"
                        />
                        <Volume2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => { resetRecording(); setStep("record"); setVoiceId(null); setCloneStatus(null); }}
                    className="w-full"
                    aria-label="Re-record voice sample"
                  >
                    <RotateCcw className="w-4 h-4" /> Re-record sample
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}

/**
 * Trigger the voice clone studio overlay from anywhere.
 * Usage:
 *   window.dispatchEvent(new CustomEvent("circle:voice-clone-studio", {
 *     detail: { userId: "u_abc123" }
 *   }));
 */
export function dispatchVoiceCloneStudioEvent(userId?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("circle:voice-clone-studio", { detail: { userId } }),
  );
}

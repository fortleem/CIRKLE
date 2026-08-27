// @ts-nocheck
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  X, Mic, Pause, Play, Square, Send, Loader2, AlertTriangle,
  Check, AudioWaveform, Trash2, Sparkles, RotateCcw,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  isMediaRecorderSupported,
  pickRecordingMimeType,
  transcribeAudio,
  type TranscriptionResult,
} from "@/lib/voice-transcription";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface StartDetail {
  conversationId?: string;
  senderId?: string;
}

const MAX_DURATION = 180; // 3 min cap

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Deterministic pseudo-waveform bar heights — purely cosmetic so the UI feels
// alive without an external audio analyzer.
function pseudoWaveform(seed: number, bars = 32): number[] {
  let h = seed || 1;
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    out.push(0.25 + (h % 1000) / 1000 * 0.75);
  }
  return out;
}

/**
 * Voice Message Recorder overlay (B2).
 *
 * Opens via `circle:voice-recorder` event with `{ conversationId }`.
 *
 * Flow:
 *   1. Tap the mic to start recording (MediaRecorder).
 *   2. Waveform animates while recording; timer ticks up.
 *   3. Pause / resume / cancel.
 *   4. On stop, a transcription is requested in the background and shown
 *      as a preview chip ("AI heard: …"). User can edit the text before send.
 *   5. Send → POST /api/messages/voice with the audio blob + transcript.
 *
 * Browser compatibility:
 *   • MediaRecorder unsupported → shows a clear "browser not supported" card.
 *   • Microphone permission denied → shows a clear actionable error.
 */
export function VoiceMessageRecorder({ open, onClose }: Props) {
  const supported = isMediaRecorderSupported();
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [editableText, setEditableText] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");

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
        setRecording(false);
        setPaused(false);
        setSeconds(0);
        setError(null);
        setBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setTranscription(null);
        setTranscribing(false);
        setEditableText("");
        setSending(false);
      }, 0);
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────
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

  // ── Event subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent<StartDetail>).detail || {};
      if (detail.conversationId) setConversationId(detail.conversationId);
    };
    window.addEventListener("circle:voice-recorder", onStart as EventListener);
    return () => {
      window.removeEventListener("circle:voice-recorder", onStart as EventListener);
    };
  }, [open]);

  // ── Start recording ──────────────────────────────────────────────────────
  const startRecording = async () => {
    setError(null);
    if (!supported) {
      setError("MediaRecorder is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecordingMimeType();
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: mimeType });
        setBlob(finalBlob);
        setAudioUrl(URL.createObjectURL(finalBlob));
        void transcribeNow(finalBlob);
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
      const name = (err as DOMException)?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("Microphone permission denied. Please grant access in your browser settings.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No microphone device found.");
      } else if (name === "NotReadableError") {
        setError("Microphone is in use by another app. Close it and try again.");
      } else {
        setError((err as Error)?.message || "Failed to start recording.");
      }
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

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch { /* */ }
    }
    cleanupRecording();
    setRecording(false);
    setPaused(false);
    setSeconds(0);
    setBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscription(null);
    setEditableText("");
  };

  // ── Transcription ──────────────────────────────────────────────────────────
  const transcribeNow = async (b: Blob) => {
    setTranscribing(true);
    try {
      const result = await transcribeAudio(b, {
        context: conversationId ? `voice message in conversation ${conversationId}` : undefined,
      });
      setTranscription(result);
      setEditableText(result.text);
    } catch (err) {
      toast.error((err as Error)?.message || "Transcription failed.");
    } finally {
      setTranscribing(false);
    }
  };

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!blob || !conversationId) {
      setError("No recording to send.");
      return;
    }
    setSending(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      // Convert blob to base64 for transport.
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const r = reader.result;
          if (typeof r !== "string") return reject(new Error("FileReader failed"));
          const i = r.indexOf(",");
          resolve(i === -1 ? r : r.slice(i + 1));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      const res = await fetch("/api/messages/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          senderId: "me",
          audio: base64,
          mimeType: blob.type,
          duration: seconds,
          transcript: editableText || transcription?.text,
          language: transcription?.language,
        }),
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Send failed (HTTP ${res.status})`);
      }
      toast.success("Voice message sent.", {
        description: transcription?.text ? `Transcript: ${transcription.text.slice(0, 60)}…` : undefined,
      });
      onClose();
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to send voice message.");
    } finally {
      setSending(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const bars = pseudoWaveform(seconds + 1, 32);
  const hasRecording = !!blob && !recording;

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" ariaLabel="Voice message recorder" maxWidth="max-w-lg">
      <div className="flex flex-col h-full bg-card">
        {/* Header */}
        <header className="px-5 py-4 flex items-center gap-3 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-primary/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg">Voice Message</div>
            <div className="text-[11px] text-muted-foreground">
              {conversationId ? `Conversation ${conversationId.slice(0, 12)}…` : "Auto-transcribed by Cirkle AI"}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close voice recorder"
            className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!supported ? (
            <div className="glass rounded-2xl p-6 text-center border border-rose-500/30">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <div className="font-display text-lg mb-2">Browser not supported</div>
              <p className="text-sm text-muted-foreground">
                Voice recording requires the MediaRecorder API. Please use the
                latest Chrome, Firefox, or Safari.
              </p>
            </div>
          ) : error ? (
            <div className="glass rounded-2xl p-6 text-center border border-rose-500/30">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <div className="font-display text-lg mb-2">Recording failed</div>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button
                onClick={() => { setError(null); void startRecording(); }}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="w-4 h-4" /> Try again
              </Button>
            </div>
          ) : (
            <>
              {/* Timer + waveform */}
              <div className="glass rounded-2xl p-5 text-center">
                <div className="font-display text-3xl tabular-nums mb-3">
                  {formatDuration(seconds)}
                  <span className="text-xs text-muted-foreground ml-2">/ {formatDuration(MAX_DURATION)}</span>
                </div>
                <div className="flex items-center justify-center gap-[2px] h-16" aria-hidden="true">
                  {bars.map((h, i) => (
                    <motion.div
                      key={i}
                      className={cn(
                        "w-1.5 rounded-full",
                        recording && !paused
                          ? "bg-emerald-500"
                          : hasRecording
                            ? "bg-emerald-500/50"
                            : "bg-muted-foreground/30",
                      )}
                      animate={recording && !paused ? { height: [`${h * 30}%`, `${h * 80}%`, `${h * 40}%`] } : { height: `${h * 30}%` }}
                      transition={recording && !paused ? { duration: 0.6, repeat: Infinity, delay: i * 0.02 } : { duration: 0.2 }}
                      style={{ height: `${h * 30}%` }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                  {recording ? (
                    paused ? (
                      <><Pause className="w-3 h-3" /> Paused</>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Recording…
                      </>
                    )
                  ) : hasRecording ? (
                    <><AudioWaveform className="w-3 h-3" /> Recording ready · {seconds}s</>
                  ) : (
                    <><Sparkles className="w-3 h-3" /> Tap the mic to start recording</>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                {!recording && !hasRecording && (
                  <button
                    onClick={() => void startRecording()}
                    aria-label="Start recording"
                    className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-float transition active:scale-95"
                  >
                    <Mic className="w-8 h-8" />
                  </button>
                )}
                {recording && (
                  <>
                    <button
                      onClick={cancelRecording}
                      aria-label="Cancel recording"
                      className="w-14 h-14 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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
                {hasRecording && (
                  <>
                    <Button
                      onClick={cancelRecording}
                      variant="outline"
                      aria-label="Discard and re-record"
                    >
                      <RotateCcw className="w-4 h-4" /> Re-record
                    </Button>
                  </>
                )}
              </div>

              {/* Playback + transcription preview */}
              {hasRecording && audioUrl && (
                <div className="space-y-3">
                  <audio
                    src={audioUrl}
                    controls
                    className="w-full"
                    aria-label="Recording playback"
                  />
                  <div className="glass rounded-xl p-3 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        AI Transcript {transcription?.language ? `· ${transcription.language.toUpperCase()}` : ""}
                      </span>
                      {transcribing && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                    </div>
                    {transcribing ? (
                      <div className="text-sm text-muted-foreground italic">
                        Transcribing with Cirkle Brain AI…
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={editableText}
                          onChange={(e) => setEditableText(e.target.value)}
                          className="w-full bg-transparent border border-border/40 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 min-h-[80px]"
                          placeholder="Edit transcript before sending…"
                          aria-label="Edit AI transcript"
                        />
                        {transcription?.confidence !== undefined && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Confidence: {Math.round(transcription.confidence * 100)}% · Provider: {transcription.provider}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {supported && hasRecording && (
          <footer className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose} aria-label="Cancel and close">
              Cancel
            </Button>
            <Button
              onClick={() => void handleSend()}
              disabled={sending || !blob}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              aria-label="Send voice message"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Sending…" : "Send voice message"}
            </Button>
          </footer>
        )}
      </div>
    </OverlayShell>
  );
}

/**
 * Trigger the voice message recorder from anywhere in the app.
 * Usage:
 *   window.dispatchEvent(new CustomEvent("circle:voice-recorder", {
 *     detail: { conversationId: "abc" }
 *   }));
 */
export function dispatchVoiceRecorderEvent(conversationId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("circle:voice-recorder", { detail: { conversationId } }),
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Loader2, MessageSquare, Eye, EyeOff, Gauge, Play, Pause,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Bullet {
  id: string;
  postId: string;
  username: string;
  text: string;
  color: string;
  timestamp: number;
  createdAt: string;
}

const COLOR_SWATCHES = [
  { id: "white", hex: "#ffffff", label: "White" },
  { id: "yellow", hex: "#ffd60a", label: "Yellow" },
  { id: "cyan", hex: "#22d3ee", label: "Cyan" },
  { id: "red", hex: "#ef4444", label: "Red" },
  { id: "green", hex: "#22c55e", label: "Green" },
  { id: "magenta", hex: "#ec4899", label: "Magenta" },
  { id: "gold", hex: "#C2A060", label: "Gold" },
  { id: "rose", hex: "#C06070", label: "Rose" },
];

function colorToHex(id: string): string {
  return COLOR_SWATCHES.find((c) => c.id === id)?.hex ?? "#ffffff";
}

export function BulletComments({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username ?? "anonymous";

  // Demo post ID — in a real integration this would be the active video's ID.
  // The overlay is a self-contained manager; the player would pass its postId.
  const [postId, setPostId] = useState("demo-video-001");

  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [color, setColor] = useState("white");
  const [timestamp, setTimestamp] = useState(0);
  const [posting, setPosting] = useState(false);

  // Overlay display state
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [density, setDensity] = useState(8); // max simultaneous bullets on screen
  const [playing, setPlaying] = useState(true);

  const overlayRef = useRef<HTMLDivElement | null>(null);

  const fetchBullets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/bullets`, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { bullets: Bullet[] };
      setBullets(data.bullets);
    } catch {
      setBullets([]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (open) fetchBullets();
  }, [open, fetchBullets]);

  // Simulated video playback clock — advances the timestamp so bullets at the
  // right moment enter the overlay. A real integration would sync to the
  // <video> element's currentTime.
  useEffect(() => {
    if (!open || !playing) return;
    const id = setInterval(() => setTimestamp((t) => t + 0.1), 100);
    return () => clearInterval(id);
  }, [open, playing]);

  const handlePost = async () => {
    const clean = text.trim();
    if (clean.length < 1) {
      toast.error("Bullet text is empty");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/bullets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, text: clean, color, timestamp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post bullet");
      setBullets((prev) => [...prev, data.bullet as Bullet].sort((a, b) => a.timestamp - b.timestamp));
      setText("");
      toast.success("Bullet sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post bullet");
    } finally {
      setPosting(false);
    }
  };

  // Bullets visible on the overlay right now — those within a small window
  // of the current timestamp, capped by the density slider.
  const visibleBullets = useMemo(() => {
    if (!overlayEnabled) return [];
    const window = 2.0; // 2-second window
    return bullets
      .filter((b) => b.timestamp <= timestamp && b.timestamp > timestamp - window)
      .slice(-density);
  }, [bullets, timestamp, overlayEnabled, density]);

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-3xl" ariaLabel="Bullet Comments">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Bullet Comments</h2>
              <p className="text-xs text-muted-foreground">Bilibili-style scrolling overlay · real-time</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ── Video overlay preview ── */}
          <div className="space-y-2">
            <Label>Video overlay preview</Label>
            <div
              ref={overlayRef}
              className="relative w-full aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-charcoal via-steel/40 to-charcoal border border-border/60"
            >
              {/* Simulated video background */}
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-xs">
                <Play className="w-8 h-8" />
              </div>

              {/* Bullet overlay */}
              {overlayEnabled && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <AnimatePresence>
                    {visibleBullets.map((b, idx) => (
                      <motion.div
                        key={b.id}
                        initial={{ x: "110%" }}
                        animate={{ x: "-110%" }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 8,
                          ease: "linear",
                          delay: idx * 0.05,
                        }}
                        className="absolute whitespace-nowrap text-sm font-medium drop-shadow-lg"
                        style={{
                          top: `${10 + (idx * 70) % 70}%`,
                          color: colorToHex(b.color),
                          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                        }}
                      >
                        {b.text}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Player controls */}
              <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-charcoal/80 to-transparent flex items-center gap-2 text-xs text-white">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="p-1.5 rounded-md hover:bg-white/10 transition"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <span className="tabular-nums">{Math.floor(timestamp / 60)}:{String(Math.floor(timestamp % 60)).padStart(2, "0")}</span>
                <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${(timestamp % 60) / 60 * 100}%` }} />
                </div>
                <span className="text-white/60">{bullets.length} bullets</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Simulated playback — in the real player, bullets sync to the video&apos;s <code>currentTime</code>.
            </p>
          </div>

          {/* ── Controls ── */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex items-center gap-2">
                {overlayEnabled ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">Overlay</p>
                  <p className="text-xs text-muted-foreground">Toggle scrolling display</p>
                </div>
              </div>
              <Switch checked={overlayEnabled} onCheckedChange={setOverlayEnabled} aria-label="Toggle overlay" />
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-secondary" />
                  <div>
                    <p className="text-sm font-medium">Density</p>
                    <p className="text-xs text-muted-foreground">Max bullets on screen</p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums">{density}</span>
              </div>
              <Slider
                value={[density]}
                onValueChange={(v) => setDensity(v[0])}
                min={1}
                max={20}
                step={1}
                aria-label="Density"
              />
            </div>
          </div>

          {/* ── Post ID ── */}
          <div className="space-y-2">
            <Label htmlFor="post-id">Video post ID</Label>
            <Input
              id="post-id"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              onBlur={fetchBullets}
              placeholder="e.g. cuid of the Mashahd video"
            />
          </div>

          {/* ── Compose ── */}
          <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/40">
            <Label>Compose bullet</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  aria-label={`Color ${c.label}`}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition",
                    color === c.id ? "border-foreground scale-110" : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type a bullet comment…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={140}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !posting) handlePost();
                }}
              />
              <Button
                onClick={handlePost}
                disabled={posting || text.trim().length === 0}
                className="bg-gradient-gold text-charcoal hover:opacity-90"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Posts at <span className="tabular-nums">{timestamp.toFixed(1)}s</span> · max 140 chars
            </p>
          </div>

          {/* ── Feed ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Live feed</Label>
              <button
                onClick={fetchBullets}
                className="text-xs text-muted-foreground hover:text-foreground transition"
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-border/40 divide-y divide-border/30">
              {loading && bullets.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading…
                </div>
              ) : bullets.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No bullets yet. Be the first to comment.
                </div>
              ) : (
                bullets.map((b) => (
                  <div key={b.id} className="p-3 flex items-start gap-3 hover:bg-muted/20 transition">
                    <span
                      className="mt-1 w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: colorToHex(b.color) }}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground break-words">
                        <span className="text-muted-foreground text-xs mr-2">@{b.username}</span>
                        {b.text}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                        @{b.timestamp.toFixed(1)}s · {new Date(b.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </OverlayShell>
  );
}

// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Loader2, Play, Square, Clock, Navigation, Users,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface LiveLocationShare {
  id: string;
  conversationId: string;
  userId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  expiresAt: string;
  createdAt: string;
}

const DURATIONS = [
  { value: "900", label: "15 minutes" },
  { value: "3600", label: "1 hour" },
  { value: "28800", label: "8 hours" },
];

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export function LiveLocation({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";
  const [conversationId, setConversationId] = useState("");
  const [shares, setShares] = useState<LiveLocationShare[]>([]);
  const [loading, setLoading] = useState(false);

  // Start form
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [duration, setDuration] = useState("3600");
  const [starting, setStarting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [myShare, setMyShare] = useState<LiveLocationShare | null>(null);

  const fetchShares = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `/api/location/share?conversationId=${encodeURIComponent(conversationId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      const list: LiveLocationShare[] = data.shares ?? [];
      setShares(list);
      setMyShare(list.find((s) => s.userId === userId) ?? null);
    } catch {
      setShares([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId]);

  useEffect(() => {
    if (open) {
      setConversationId("");
      setLat("");
      setLng("");
      setDuration("3600");
      setShares([]);
      setMyShare(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && conversationId) fetchShares();
    // Poll every 15s
    if (open && conversationId) {
      const t = setInterval(fetchShares, 15000);
      return () => clearInterval(t);
    }
  }, [open, conversationId, fetchShares]);

  const detectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation unavailable");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setLocating(false);
        toast.success("Location detected");
      },
      (err) => {
        setLocating(false);
        toast.error(err.message || "Failed to detect location");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  };

  const handleStart = async () => {
    if (!conversationId.trim()) {
      toast.error("Conversation ID is required");
      return;
    }
    if (!userId) {
      toast.error("Sign in to share your location");
      return;
    }
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isFinite(latNum) || latNum < -90 || latNum > 90) {
      toast.error("Latitude must be between -90 and 90");
      return;
    }
    if (!isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      toast.error("Longitude must be between -180 and 180");
      return;
    }
    setStarting(true);
    try {
      const res = await fetchWithTimeout("/api/location/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId.trim(),
          userId,
          lat: latNum,
          lng: lngNum,
          durationSec: parseInt(duration, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to share location");
      toast.success("Live location shared", {
        description: `Expires in ${DURATIONS.find((d) => d.value === duration)?.label}`,
      });
      window.dispatchEvent(new CustomEvent("circle:live-location", { detail: { conversationId } }));
      await fetchShares();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Share failed");
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!conversationId || !userId) return;
    try {
      const res = await fetchWithTimeout(
        `/api/location/share?conversationId=${encodeURIComponent(conversationId)}&userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to stop");
      toast.success("Location sharing stopped");
      setMyShare(null);
      await fetchShares();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stop failed");
    }
  };

  // Openstreetmap static preview
  const mapUrl = (lat: number, lng: number) =>
    `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=13&size=600x200&markers=${lat},${lng},red-pushpin`;

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-2xl" ariaLabel="Live location sharing">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <MapPin className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Live Location</h2>
              <p className="text-xs text-muted-foreground">Time-boxed sharing · 15min · 1h · 8h</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Conversation selector */}
          <div className="space-y-2">
            <Label htmlFor="conv-id">Conversation ID</Label>
            <Input
              id="conv-id"
              placeholder="e.g. conv_xyz123"
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
            />
          </div>

          {/* Start form */}
          <section aria-label="Start sharing" className="glass backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-500" aria-hidden />
              <h3 className="font-semibold text-foreground text-sm">Start sharing</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input id="lat" type="number" step="0.000001" min={-90} max={90} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="30.0444" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input id="lng" type="number" step="0.000001" min={-180} max={180} value={lng} onChange={(e) => setLng(e.target.value)} placeholder="31.2357" />
              </div>
            </div>

            <Button onClick={detectLocation} variant="outline" className="w-full" disabled={locating}>
              {locating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Detecting…</>
              ) : (
                <><Navigation className="w-4 h-4 mr-2" aria-hidden /> Use my current location</>
              )}
            </Button>

            <div className="space-y-2">
              <Label htmlFor="duration">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-emerald-500" aria-hidden /> Duration
              </Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {myShare ? (
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <MapPin className="w-4 h-4 shrink-0" aria-hidden />
                  <span>You are sharing — expires {new Date(myShare.expiresAt).toLocaleTimeString()}</span>
                </div>
                <Button onClick={handleStop} variant="outline" className="w-full border-rose-500/40 text-rose-600 hover:bg-rose-500/10">
                  <Square className="w-4 h-4 mr-2" aria-hidden /> Stop sharing
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleStart}
                disabled={starting || !conversationId.trim() || !lat || !lng}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {starting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Starting…</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" aria-hidden /> Share live location</>
                )}
              </Button>
            )}
          </section>

          {/* Active shares map */}
          {conversationId && (
            <section aria-label="Active shares" className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-500" aria-hidden /> Active shares ({shares.length})
                </Label>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Live · refreshes every 15s
                </Badge>
              </div>
              {loading && shares.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground" aria-live="polite">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden /> Loading…
                </div>
              ) : shares.length === 0 ? (
                <div className="glass backdrop-blur-xl border border-dashed border-white/20 rounded-xl p-8 text-center">
                  <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden />
                  <p className="text-sm text-muted-foreground">No active shares in this conversation</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shares.map((s) => (
                    <motion.div
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center" aria-hidden>
                            <MapPin className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">@{s.userId}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                              {s.accuracy ? ` · ±${Math.round(s.accuracy)}m` : ""}
                            </p>
                          </div>
                        </div>
                        <Badge className={cn(
                          "border",
                          s.userId === userId
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-muted/40 text-muted-foreground border-transparent",
                        )}>
                          {s.userId === userId ? "You" : "Friend"}
                        </Badge>
                      </div>
                      <div className="rounded-lg overflow-hidden bg-muted/20" aria-hidden>
                        <img
                          src={mapUrl(s.lat, s.lng)}
                          alt={`Map preview of @${s.userId}'s location`}
                          className="w-full h-32 object-cover"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" aria-hidden />
                        <span>Expires {new Date(s.expiresAt).toLocaleTimeString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}

// @ts-nocheck
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  X, Mic, MicOff, Hand, Users, Volume2, PhoneOff, Crown, Plus,
  Loader2, AlertTriangle, LogOut, Radio, Search,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface StartDetail {
  roomId?: string;
  create?: boolean;
  name?: string;
  topic?: string;
}

interface VoiceRoomParticipant {
  id: string;
  userId: string;
  displayName: string;
  avatarColor: string;
  role: "host" | "speaker" | "audience";
  muted: boolean;
  handRaised: boolean;
  joinedAt: string;
}

interface VoiceRoom {
  id: string;
  name: string;
  hostId: string;
  topic: string | null;
  status: "live" | "ended";
  speakerCount: number;
  audienceCount: number;
  createdAt: string;
  endedAt: string | null;
  participants: VoiceRoomParticipant[];
}

const AVATAR_GRADIENTS: Record<string, string> = {
  teal:    "from-teal-500/40 to-emerald-500/30",
  rose:    "from-rose-500/40 to-pink-500/30",
  gold:    "from-amber-500/40 to-yellow-500/30",
  steel:   "from-sky-500/40 to-slate-500/30",
  charcoal:"from-slate-700/40 to-slate-900/30",
};

function initials(name: string): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

function gradient(color: string): string {
  return AVATAR_GRADIENTS[color] || AVATAR_GRADIENTS.teal;
}

async function fetch8s(url: string, opts: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, { ...opts, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Voice Room overlay (B11) — Clubhouse-style audio rooms.
 *
 * Opens via `circle:voice-room` event with `{ roomId }` (to join) or
 * `{ create: true, name, topic }` (to create + host).
 *
 * Layout:
 *   • Stage (speakers) — pill row of speaker avatars with mute indicators.
 *   • Audience list — compact list with raise-hand buttons.
 *   • Bottom bar: mute (speaker only), raise hand (audience), leave, end
 *     (host only).
 *
 * API contract:
 *   • POST /api/voice-rooms (create)
 *   • GET  /api/voice-rooms (list)
 *   • GET  /api/voice-rooms/[id] (details)
 *   • POST /api/voice-rooms/[id] (action: join | leave | raise-hand |
 *                                 invite-to-speaker | end)
 */
export function VoiceRoom({ open, onClose }: Props) {
  const [view, setView] = useState<"browse" | "room">("browse");
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [search, setSearch] = useState("");
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [myUserId] = useState(() => `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
  const [myDisplayName] = useState(() => `Guest ${Math.floor(Math.random() * 999)}`);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomTopic, setNewRoomTopic] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset on close ──────────────────────────────────────────────────────
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setTimeout(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setView("browse");
        setCurrentRoom(null);
        setError(null);
        setShowCreate(false);
        setNewRoomName("");
        setNewRoomTopic("");
        setSearch("");
      }, 0);
    }
  }

  // ── Event listener ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent<StartDetail>).detail || {};
      if (detail.create) {
        setShowCreate(true);
        setView("browse");
      } else if (detail.roomId) {
        void joinRoom(detail.roomId);
      } else {
        void loadRooms();
      }
    };
    window.addEventListener("circle:voice-room", onStart as EventListener);
    return () => {
      window.removeEventListener("circle:voice-room", onStart as EventListener);
    };
  }, [open]);

  // ── Auto-load rooms on open ──────────────────────────────────────────────
  useEffect(() => {
    if (open && view === "browse" && rooms.length === 0 && !loadingRooms) {
      void loadRooms();
    }
  }, [open, view]);

  // ── Poll current room ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentRoom) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch8s(`/api/voice-rooms/${currentRoom.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data.room) {
            setCurrentRoom(data.room);
            return;
          }
        }
        // Room ended or not found — go back to browse.
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setView("browse");
        setCurrentRoom(null);
      } catch { /* swallow */ }
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [currentRoom?.id]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const loadRooms = async () => {
    setLoadingRooms(true);
    setError(null);
    try {
      const res = await fetch8s("/api/voice-rooms?limit=20");
      const data = await res.json().catch(() => null);
      if (data?.ok && Array.isArray(data.rooms)) {
        setRooms(data.rooms);
      } else {
        setRooms([]);
      }
    } catch (err) {
      setError((err as Error)?.message || "Failed to load voice rooms.");
    } finally {
      setLoadingRooms(false);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error("Please enter a room name.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch8s("/api/voice-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoomName,
          hostId: myUserId,
          hostDisplayName: myDisplayName,
          hostAvatarColor: "teal",
          topic: newRoomTopic || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok || !data.room) {
        throw new Error(data?.error || "Failed to create room.");
      }
      setCurrentRoom(data.room);
      setView("room");
      setShowCreate(false);
      setNewRoomName("");
      setNewRoomTopic("");
      toast.success(`Room "${data.room.name}" created.`);
    } catch (err) {
      setError((err as Error)?.message || "Failed to create room.");
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async (roomId: string) => {
    setError(null);
    try {
      const res = await fetch8s(`/api/voice-rooms/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          userId: myUserId,
          displayName: myDisplayName,
          avatarColor: "teal",
          asSpeaker: false,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok || !data.room) {
        throw new Error(data?.error || "Failed to join room.");
      }
      setCurrentRoom(data.room);
      setView("room");
    } catch (err) {
      setError((err as Error)?.message || "Failed to join room.");
    }
  };

  const raiseHand = async () => {
    if (!currentRoom) return;
    const me = currentRoom.participants.find((p) => p.userId === myUserId);
    const raised = me?.handRaised ? false : true;
    try {
      const res = await fetch8s(`/api/voice-rooms/${currentRoom.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "raise-hand",
          userId: myUserId,
          raised,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && data.room) {
        setCurrentRoom(data.room);
        toast.success(raised ? "Hand raised — host will be notified." : "Hand lowered.");
      }
    } catch (err) {
      toast.error("Failed to raise hand.");
    }
  };

  const inviteToSpeaker = async (userId: string) => {
    if (!currentRoom) return;
    try {
      const res = await fetch8s(`/api/voice-rooms/${currentRoom.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite-to-speaker",
          userId: myUserId,
          targetUserId: userId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && data.room) {
        setCurrentRoom(data.room);
        toast.success("Promoted to speaker.");
      }
    } catch (err) {
      toast.error("Failed to invite to speaker.");
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom) return;
    try {
      await fetch8s(`/api/voice-rooms/${currentRoom.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", userId: myUserId }),
      });
    } catch { /* ignore */ }
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setCurrentRoom(null);
    setView("browse");
    void loadRooms();
  };

  const endRoom = async () => {
    if (!currentRoom) return;
    try {
      await fetch8s(`/api/voice-rooms/${currentRoom.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", userId: myUserId }),
      });
      toast.success("Room ended.");
    } catch { /* ignore */ }
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setCurrentRoom(null);
    setView("browse");
    void loadRooms();
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const me = currentRoom?.participants.find((p) => p.userId === myUserId);
  const isHost = me?.role === "host";
  const isSpeaker = me?.role === "host" || me?.role === "speaker";
  const myHandRaised = !!me?.handRaised;
  const speakers = currentRoom?.participants.filter((p) => p.role === "host" || p.role === "speaker") || [];
  const audience = currentRoom?.participants.filter((p) => p.role === "audience") || [];
  const filteredRooms = rooms.filter((r) =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.topic || "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" ariaLabel="Voice rooms" maxWidth="max-w-xl">
      <div className="flex flex-col h-full bg-card">
        {/* Header */}
        <header className="px-5 py-4 flex items-center gap-3 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-primary/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg">
              {view === "browse" ? "Voice Rooms" : currentRoom?.name || "Room"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {view === "browse"
                ? "Clubhouse-style live audio"
                : `${speakers.length} speakers · ${audience.length} listening`}
            </div>
          </div>
          {view === "room" && (
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/30 border border-emerald-500/50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-emerald-700">LIVE</span>
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close voice rooms"
            className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="glass rounded-xl p-3 border border-rose-500/30 text-sm text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {view === "browse" ? (
            <>
              {/* Search + create */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search rooms…"
                    className="pl-9"
                    aria-label="Search voice rooms"
                  />
                </div>
                <Button
                  onClick={() => setShowCreate(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                  aria-label="Create new voice room"
                >
                  <Plus className="w-4 h-4" /> Create
                </Button>
              </div>

              {/* Create form */}
              <AnimatePresence>
                {showCreate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass rounded-2xl p-4 border border-emerald-500/30 space-y-3 overflow-hidden"
                  >
                    <div className="text-sm font-medium">Start a new room</div>
                    <Input
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="Room name (e.g. Cairo Tech Founders)"
                      aria-label="Room name"
                    />
                    <Input
                      value={newRoomTopic}
                      onChange={(e) => setNewRoomTopic(e.target.value)}
                      placeholder="Topic (optional)"
                      aria-label="Room topic"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void createRoom()}
                        disabled={creating || !newRoomName.trim()}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                        Start
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Rooms list */}
              {loadingRooms ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading rooms…
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">No active rooms right now.</div>
                  <div className="text-xs mt-1">Be the first to start a conversation.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRooms.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => void joinRoom(r.id)}
                      className="w-full glass rounded-2xl p-4 border border-border/40 hover:border-emerald-500/40 transition text-left group"
                      aria-label={`Join room ${r.name}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <Radio className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{r.name}</div>
                          {r.topic && (
                            <div className="text-[11px] text-muted-foreground truncate">{r.topic}</div>
                          )}
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Mic className="w-3 h-3" /> {r.speakerCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {r.audienceCount + r.speakerCount}
                            </span>
                          </div>
                        </div>
                        <Volume2 className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : currentRoom ? (
            <>
              {/* Stage — speakers */}
              <section aria-label="Speakers on stage">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Stage</div>
                {speakers.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">No speakers yet.</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {speakers.map((p, i) => (
                      <div
                        key={p.id}
                        className="flex flex-col items-center text-center"
                        aria-label={`${p.displayName} — ${p.role}${p.muted ? " (muted)" : ""}`}
                      >
                        <div className={cn(
                          "relative w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-display text-base border-2",
                          gradient(p.avatarColor),
                          p.role === "host" ? "border-amber-400" : p.muted ? "border-rose-500/50" : "border-emerald-500/40",
                        )}>
                          {initials(p.displayName)}
                          {p.role === "host" && (
                            <Crown className="w-3.5 h-3.5 absolute -top-1 -right-1 text-amber-500 bg-card rounded-full p-0.5 box-content" />
                          )}
                          {p.muted ? (
                            <MicOff className="w-3 h-3 absolute -bottom-1 -right-1 text-rose-500 bg-card rounded-full p-0.5 box-content" />
                          ) : (
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                              <Volume2 className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] mt-1.5 truncate w-full">{p.displayName}</div>
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                          {p.role === "host" ? "Host" : "Speaker"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Audience */}
              {audience.length > 0 && (
                <section aria-label="Audience">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                    Audience ({audience.length})
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                    {audience.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-medium",
                          gradient(p.avatarColor),
                        )}>
                          {initials(p.displayName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{p.displayName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.handRaised ? "✋ Raised hand" : "Listening"}
                          </div>
                        </div>
                        {isHost && p.handRaised && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void inviteToSpeaker(p.userId)}
                            aria-label={`Invite ${p.displayName} to speak`}
                          >
                            <Mic className="w-3 h-3" /> Invite
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : null}
        </div>

        {/* Footer (room view only) */}
        {view === "room" && currentRoom && (
          <footer className="px-5 py-4 border-t border-border flex items-center justify-center gap-3">
            {isSpeaker && (
              <button
                onClick={() => toast.success("Mic toggle is mocked — real audio via SFU.")}
                aria-label="Toggle mute (mock)"
                className="w-14 h-14 rounded-full glass border border-cream/20 text-cream hover:bg-cream/10 flex items-center justify-center transition"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
            {!isSpeaker && (
              <button
                onClick={() => void raiseHand()}
                aria-label={myHandRaised ? "Lower hand" : "Raise hand to speak"}
                aria-pressed={myHandRaised}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition border",
                  myHandRaised
                    ? "bg-amber-500 border-amber-400 text-white"
                    : "glass border-cream/20 text-cream hover:bg-cream/10",
                )}
              >
                <Hand className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => void leaveRoom()}
              aria-label="Leave room"
              className="w-14 h-14 rounded-full bg-cream/15 border border-cream/20 text-cream hover:bg-cream/25 flex items-center justify-center transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
            {isHost && (
              <button
                onClick={() => void endRoom()}
                aria-label="End room (host only)"
                className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center hover:opacity-90 transition shadow-float"
              >
                <PhoneOff className="w-5 h-5 text-destructive-foreground" />
              </button>
            )}
          </footer>
        )}
      </div>
    </OverlayShell>
  );
}

/**
 * Trigger the voice room overlay from anywhere.
 * Usage:
 *   window.dispatchEvent(new CustomEvent("circle:voice-room", {
 *     detail: { roomId: "abc" }            // join existing
 *     // OR
 *     detail: { create: true, name: "...", topic: "..." }  // create new
 *   }));
 */
export function dispatchVoiceRoomEvent(detail: { roomId?: string; create?: boolean; name?: string; topic?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("circle:voice-room", { detail }));
}

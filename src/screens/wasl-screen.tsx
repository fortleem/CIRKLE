// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Sparkles, Mic, Send, Image as ImageIcon, Phone, Video, Ghost,
  Users, BadgeCheck, Radio, ArrowLeft, Check, CheckCheck, Clock, Reply, Edit3,
  Trash2, Forward, Star, Pin, Copy, Smile, MoreVertical, X, Play, Pause, Timer,
  Shield, Crown, Ban, MicOff, ChevronRight, Archive, Bell, BellOff, ScanLine,
  StopCircle, AlertCircle, ShieldCheck, Briefcase,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useApp } from "@/lib/app-store";
import { useAuth, cirkleInitials } from "@/lib/auth-store";
import { CURRENT_USER } from "@/lib/circle/mock-data";
import type { Conversation, ChatMessage, MessageStatus } from "@/lib/circle/types";
import {
  useCircleSocket,
  type CircleSocketUser,
  type ReceivedMessagePayload,
  type TypingUpdatePayload,
  type MessageStatusPayload,
  type ReactionUpdatePayload,
  type PresenceUpdatePayload,
} from "@/hooks/use-circle-socket";

// ============================================================================
// Constants
// ============================================================================

const FOLDERS = ["All", "Unread", "AI", "Channels"] as const;
type Folder = (typeof FOLDERS)[number];

const STORIES: string[] = ["You"]; // Real contacts loaded from API

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const TTL_PRESETS: { label: string; seconds: number | null }[] = [
  { label: "Off", seconds: null },
  { label: "1 hour", seconds: 60 * 60 },
  { label: "24 hours", seconds: 60 * 60 * 24 },
  { label: "7 days", seconds: 60 * 60 * 24 * 7 },
];

const EDIT_WINDOW_MS = 15 * 60 * 1000;

const SOCKET_USER: CircleSocketUser = {
  id: CURRENT_USER.id,
  name: CURRENT_USER.displayName,
  senderInitials: CURRENT_USER.avatarInitials,
  senderColor: CURRENT_USER.avatarColor,
};

/**
 * Returns the REAL authenticated user (from the auth store) in a CircleUser-
 * compatible shape, falling back to CURRENT_USER during SSR / pre-hydration /
 * preview. This replaces direct CURRENT_USER references inside component bodies
 * so messages are attributed to the logged-in user, not a placeholder.
 */
function getMe() {
  const u = useAuth.getState().user;
  if (u) {
    return {
      id: u.username,
      circleId: `@${u.username}:circle.app`,
      displayName: u.displayName,
      arabicName: u.displayName,
      avatarColor: u.avatarColor,
      avatarInitials: cirkleInitials(u),
      verified: u.verified,
      proProfile: false,
      region: u.country || "EG",
      joinedAt: u.joinedAt,
    };
  }
  return CURRENT_USER;
}

const AVATAR_BG: Record<string, string> = {
  rose: "bg-accent/90",
  teal: "bg-primary/90",
  gold: "bg-secondary/90",
  steel: "bg-steel/90",
  charcoal: "bg-charcoal/90",
};

// ============================================================================
// Utilities
// ============================================================================

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`;
  return new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Parse @mentions in a message body and return an array of text + mention spans. */
function renderBody(body: string): Array<{ text: string; mention?: boolean }> {
  const parts: Array<{ text: string; mention?: boolean }> = [];
  const regex = /(@[A-Za-z][A-Za-z0-9_.-]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(body)) !== null) {
    if (m.index > last) parts.push({ text: body.slice(last, m.index) });
    parts.push({ text: m[0], mention: true });
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last) });
  return parts.length === 0 ? [{ text: body }] : parts;
}

/** Deterministic pseudo-random bar heights for the audio waveform visual. */
function waveformBars(seed: string, n = 24): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    out.push(0.25 + (h / 0x7fffffff) * 0.75);
  }
  return out;
}

// ============================================================================
// Extended ChatMessage (includes fields the REST API returns beyond the
// canonical type — e.g. editedAt, isPinned, isStarred).
// ============================================================================

type WaslMessage = ChatMessage & {
  editedAt?: string;
  deletedAt?: string;
  isDeleted?: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
  ttlSeconds?: number | null;
  expiresAt?: string | null;
};

// ============================================================================
// Main screen
// ============================================================================

export function WaslScreen() {
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<Folder>("All");
  const [searching, setSearching] = useState(false);

  // Derive the current user from the auth store (real logged-in account).
  // Falls back to getMe() only during SSR / pre-hydration / preview.
  const auth = useAuth();
  const me: CircleSocketUser = useMemo(() => {
    const u = auth.user;
    if (u) {
      return {
        id: u.username,           // use username as socket id
        name: u.displayName,
        senderInitials: cirkleInitials(u),
        senderColor: u.avatarColor,
      };
    }
    return {
      id: getMe().id,
      name: getMe().displayName,
      senderInitials: getMe().avatarInitials,
      senderColor: getMe().avatarColor,
    };
  }, [auth.user]);

  // Mount the socket ONCE here so it stays connected across conversation
  // switches. ChatView subscribes to events via the returned `socket`.
  const socket = useCircleSocket({ user: me, enabled: true });

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const r = await fetch("/api/conversations", { cache: "no-store" });
      if (!r.ok) throw new Error("failed to load conversations");
      return r.json();
    },
  });

  const queryClient = useQueryClient();

  // Invalidate the conversation list when a presence or message:received event
  // arrives (so unread counts + last-message preview stay fresh).
  // Also track typing state per conversation so list previews can show the
  // animated "typing…" indicator in real time.
  const [convTyping, setConvTyping] = useState<
    Record<string, { name: string; at: number } | undefined>
  >({});
  useEffect(() => {
    if (!socket.socket) return;
    const onPresence = (_p: PresenceUpdatePayload) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };
    const onTyping = (p: TypingUpdatePayload) => {
      // Don't surface typing echoes for the current user — only show when
      // the *other* party is typing.
      if (p.userId === me.id) return;
      setConvTyping((prev) => {
        const next = { ...prev };
        if (p.isTyping) {
          next[p.conversationId] = { name: p.senderName, at: Date.now() };
        } else {
          delete next[p.conversationId];
        }
        return next;
      });
    };
    socket.socket.on("presence:update", onPresence);
    socket.socket.on("typing:update", onTyping);
    return () => {
      socket.socket?.off("presence:update", onPresence);
      socket.socket?.off("typing:update", onTyping);
    };
  }, [socket.socket, queryClient, me.id]);

  // Expire stale typing indicators (peer never sent a typing:stop).
  useEffect(() => {
    const id = setInterval(() => {
      setConvTyping((prev) => {
        const now = Date.now();
        let changed = false;
        const next: typeof prev = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v && now - v.at < 6_000) {
            next[k] = v;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 3_000);
    return () => clearInterval(id);
  }, []);

  // ── Incoming call listener ────────────────────────────────────────────
  // When the callManager fires onIncomingCall (a `call:incoming` socket
  // event arrived), open the call-screen overlay by dispatching a DOM
  // event that page.tsx listens for. The overlay itself reads the buffered
  // incoming payload from the callManager on mount.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;
    // Lazy import the call manager so this screen doesn't pull WebRTC code
    // until the user actually opens Wasl.
    void import("@/lib/call-manager").then(({ callManager }) => {
      if (cancelled) return;
      unsub = callManager.onIncomingCall(() => {
        window.dispatchEvent(new CustomEvent("circle:open-call-screen"));
      });
    });
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  const filtered = useMemo(() => {
    let list = conversations ?? [];
    if (folder === "Unread") list = list.filter((c) => (c.unread ?? 0) > 0);
    else if (folder === "AI") list = list.filter((c) => c.isCircle);
    else if (folder === "Channels") list = list.filter((c) => c.type === "channel");
    else if (folder === "Personal") list = list.filter((c) => c.type === "direct");
    else if (folder === "Work") list = list.filter((c) => c.type === "group");
    if (query.trim() && !searching) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.lastMessage ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [conversations, folder, query, searching]);

  const channels = useMemo(
    () => (conversations ?? []).filter((c) => c.type === "channel"),
    [conversations],
  );

  const activeConv = useMemo(
    () => (conversations ?? []).find((c) => c.id === active) ?? null,
    [conversations, active],
  );

  return (
    <div className="pb-32 lg:pb-8 lg:flex lg:gap-4 lg:px-4 lg:max-w-7xl lg:mx-auto">
      {/* LEFT: list */}
      <section
        className={`flex-1 lg:flex-[0_0_360px] lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto ${
          active ? "hidden lg:block" : "block"
        }`}
      >
        <div className="px-5 pt-2 flex items-center justify-between">
          <h1 className="font-display text-4xl">
            Wasl <span className="gradient-text-gold">·</span>{" "}
            <span className="text-base text-muted-foreground tracking-widest uppercase">
              وصل
            </span>
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-10 h-10 rounded-full bg-gradient-hero text-cream flex items-center justify-center hover:scale-105 transition"
                aria-label="New chat or group"
              >
                <Plus className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Create</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("circle:add-contact"))}>
                <Plus className="w-4 h-4 me-2" /> New chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { toast.success("Creating group…", { description: "Select members from your contacts" }); window.dispatchEvent(new CustomEvent("circle:add-contact", { detail: { mode: "group" } })); }}>
                <Users className="w-4 h-4 me-2" /> Create group
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("circle:broadcast-channel"))}>
                <Radio className="w-4 h-4 me-2" /> Create channel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("circle:contact-qr"))}>
                <ScanLine className="w-4 h-4 me-2" /> Scan QR code
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="px-5 mt-4">
          <div className="glass rounded-full px-4 py-2.5 flex items-center gap-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearching(e.target.value.trim().length >= 2);
              }}
              onFocus={() => query.trim().length >= 2 && setSearching(true)}
              className="bg-transparent flex-1 outline-none text-sm"
              placeholder="Search messages, people, files"
            />
            {searching && (
              <button
                onClick={() => {
                  setQuery("");
                  setSearching(false);
                }}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Sparkles className="w-4 h-4 text-secondary" />
          </div>
        </div>

        {/* Smart folders */}
        <div className="flex gap-2 px-5 mt-4 overflow-x-auto scrollbar-hide">
          {FOLDERS.map((f) => (
            <button
              key={f}
              onClick={() => setFolder(f)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${
                folder === f
                  ? "bg-primary text-primary-foreground"
                  : "glass hover:bg-muted/60"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {searching ? (
          <SearchResults query={query} onPick={(convId) => {
            setActive(convId);
            setSearching(false);
            setQuery("");
          }} />
        ) : (
          <>
            {/* Stories */}
            <div className="flex gap-3 px-5 mt-5 overflow-x-auto scrollbar-hide">
              {STORIES.map((s, i) => (
                <button
                  key={s}
                  onClick={() =>
                    i === 0
                      ? toast("Post a story — Coming soon")
                      : toast(`Viewing ${s}'s story`)
                  }
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <div
                    className={`w-16 h-16 rounded-full p-[2px] ${
                      i === 0 ? "bg-muted" : "bg-gradient-mesh"
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center font-display text-lg">
                      {s[0]}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{s}</span>
                </button>
              ))}
            </div>

            {/* Official channels strip */}
            {channels.length > 0 && (
              <div className="px-5 mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-display text-lg flex items-center gap-2">
                    <Radio className="w-4 h-4 text-secondary" /> Official channels
                  </h2>
                  <button
                    onClick={() => toast("Discover channels — Coming soon")}
                    className="text-[11px] text-secondary"
                  >
                    Discover
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5">
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setActive(ch.id)}
                      className="shrink-0 w-64 glass rounded-2xl p-3 text-start hover:bg-muted/50 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground font-display ${
                            AVATAR_BG[ch.avatarColor] ?? "bg-primary"
                          }`}
                        >
                          {ch.avatarInitials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 text-sm font-medium truncate">
                            {ch.name}{" "}
                            <BadgeCheck className="w-3.5 h-3.5 text-secondary shrink-0" />
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {ch.participants.toLocaleString()} subscribers
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {ch.lastMessage ?? "No recent updates"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation list */}
            <ul className="mt-5 space-y-1">
              {isLoading && (
                <li className="text-center text-xs text-muted-foreground py-8">
                  Loading conversations…
                </li>
              )}
              {!isLoading && filtered.length === 0 && (
                <li className="text-center text-xs text-muted-foreground py-12">
                  No conversations match.
                </li>
              )}
              {filtered.map((c, i) => (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                >
                  <ConversationListItem
                    conversation={c}
                    active={c.id === active}
                    onClick={() => setActive(c.id)}
                    onArchive={() => toast.success("Archived")}
                    onPin={() => toast.success("Pinned")}
                    typingName={convTyping[c.id]?.name}
                    currentUserId={me.id}
                  />
                </motion.li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* RIGHT: chat */}
      <section
        className={`lg:flex-1 ${active ? "block" : "hidden lg:block"}`}
      >
        {activeConv ? (
          <ChatView
            key={activeConv.id}
            conversation={activeConv}
            socket={socket}
            onBack={() => setActive(null)}
          />
        ) : (
          <div className="hidden lg:flex h-[calc(100vh-2rem)] items-center justify-center text-center px-8">
            <div className="space-y-2">
              <div className="w-20 h-20 rounded-3xl bg-gradient-hero mx-auto flex items-center justify-center">
                <Ghost className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="font-display text-2xl mt-3">Select a conversation</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                End-to-end encrypted. Ghost mode and disappearing messages keep
                your conversations private.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// ConversationListItem — WhatsApp-grade preview card
// ============================================================================
//
// Visual hierarchy per card (left → right):
//   [Avatar + presence dot]   [Name + meta icons / status+preview or typing]
//                              [Timestamp / unread badge or muted dot]
//
// Features:
//   • Last-message preview (truncated, sender-prefixed in groups)
//   • WhatsApp-style status icons: clock / ✓ / ✓✓ / blue ✓✓
//   • Animated "typing…" indicator (3 bouncing dots)
//   • Pulse-animated online dot (emerald) + steel dot for away
//   • Gradient gold unread badge (with 99+ cap) or dim dot for muted
//   • Pinned pin + muted bell-off in the name row
//   • ShieldCheck icon for E2EE indicator
//   • Active highlight + swipe-to-archive / swipe-to-pin (preserved)

function MessageStatusIcon({ status }: { status?: MessageStatus }) {
  if (!status) return null;
  if (status === "pending")
    return <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  if (status === "sent")
    return <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  if (status === "delivered")
    return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  // "read" — blue double-check (use brand secondary/gold for premium tint)
  return <CheckCheck className="w-3.5 h-3.5 text-secondary shrink-0" />;
}

function ConversationListItem({
  conversation,
  active,
  onClick,
  onArchive,
  onPin,
  typingName,
  currentUserId,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
  onArchive: () => void;
  onPin: () => void;
  /** Display name of whoever is currently typing in this conversation
   * (undefined when nobody is). Drives the animated "typing…" preview. */
  typingName?: string;
  /** Authenticated user id — used to detect outgoing last messages so we can
   * show the WhatsApp-style status icon next to the preview. */
  currentUserId?: string;
}) {
  const unread = conversation.unread ?? 0;
  const isMuted = !!conversation.muted;
  const isPinned = !!conversation.pinned;
  const isOnline = conversation.presence === "online";
  const isAway = conversation.presence === "away";
  const isTyping = !!typingName;
  const isOutgoing = !!conversation.lastSenderId && conversation.lastSenderId === currentUserId;
  const lastStatus = conversation.lastMessageStatus;
  const isGroupLike = conversation.type === "group" || conversation.type === "channel";
  const hasUnread = unread > 0;

  // Sender prefix for group/channel previews ("Ahmed: hello"), mirroring
  // WhatsApp. Skipped for DMs and for outgoing messages (where the prefix
  // would be "You:" — the status icon already conveys that).
  const previewBody = conversation.lastMessage ?? "No messages yet";
  const senderPrefix =
    !isOutgoing && isGroupLike && conversation.lastSender
      ? `${conversation.lastSender.split(" ")[0]}: `
      : "";

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -160, right: 160 }}
      dragElastic={0.5}
      onDragEnd={(_e, info) => {
        if (info.offset.x < -80) {
          // Swipe left → Archive + Mute
          onArchive();
        } else if (info.offset.x > 80) {
          // Swipe right → Pin + Star
          onPin();
        }
      }}
      className="relative w-full"
    >
      {/* Left swipe actions (red background) */}
      <div className="absolute inset-y-0 right-0 flex items-center bg-red-500/20 rounded-2xl pr-4 gap-2">
        <Archive className="w-5 h-5 text-red-400" />
        <BellOff className="w-5 h-5 text-red-400" />
      </div>
      {/* Right swipe actions (gold background) */}
      <div className="absolute inset-y-0 left-0 flex items-center bg-yellow-500/20 rounded-2xl pl-4 gap-2">
        <Pin className="w-5 h-5 text-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400" />
      </div>
      <button
        onClick={onClick}
        className={`relative z-10 w-full text-start px-5 py-3 hover:bg-muted/40 transition flex items-center gap-3 rounded-2xl ${
          active ? "bg-muted/60 ring-1 ring-secondary/30" : ""
        }`}
      >
        {/* ── Avatar + presence dot ─────────────────────────────────── */}
        <div className="relative shrink-0">
          {conversation.isCircle ? (
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display text-lg text-primary-foreground ${
                AVATAR_BG[conversation.avatarColor] ?? "bg-primary"
              }`}
            >
              <Users className="w-5 h-5" />
            </div>
          ) : (
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display text-lg text-primary-foreground ${
                AVATAR_BG[conversation.avatarColor] ?? "bg-primary"
              }`}
            >
              {conversation.avatarInitials}
            </div>
          )}
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-background flex items-center justify-center">
              <motion.span
                className="w-2.5 h-2.5 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.18, 1], opacity: [1, 0.75, 1] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </span>
          )}
          {isAway && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-steel border-2 border-background" />
          )}
        </div>

        {/* ── Main column: name + meta / preview or typing ─────────── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`truncate ${
                hasUnread ? "font-semibold text-foreground" : "font-medium"
              }`}
            >
              {conversation.name}
            </span>
            {isPinned && (
              <Pin
                className="w-3 h-3 text-secondary shrink-0"
                aria-label="Pinned"
              />
            )}
            {isMuted && (
              <BellOff
                className="w-3 h-3 text-muted-foreground shrink-0"
                aria-label="Muted"
              />
            )}
            {conversation.encrypted && (
              <ShieldCheck
                className="w-3 h-3 text-secondary/80 shrink-0"
                aria-label="End-to-end encrypted"
              />
            )}
          </div>

          {isTyping ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="flex items-center gap-[2px]" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1 h-1 rounded-full bg-secondary"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -1.5, 0] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.18,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </span>
              <span className="text-xs text-secondary font-medium">
                {typingName?.split(" ")[0]
                  ? `${typingName.split(" ")[0]} is typing…`
                  : "typing…"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-0.5 min-w-0">
              {isOutgoing && <MessageStatusIcon status={lastStatus} />}
              <p
                className={`text-sm truncate ${
                  hasUnread
                    ? "text-foreground/85 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {senderPrefix}
                {previewBody}
              </p>
            </div>
          )}
        </div>

        {/* ── Right column: timestamp + unread badge ───────────────── */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className={`text-[10px] ${
              hasUnread
                ? "text-secondary font-semibold"
                : "text-muted-foreground"
            }`}
          >
            {relativeTime(conversation.lastTimestamp)}
          </span>
          {hasUnread ? (
            isMuted ? (
              // Muted conversations get a discreet dim dot — no noisy badge.
              <span
                className="w-2.5 h-2.5 rounded-full bg-muted-foreground/60"
                aria-label={`${unread} unread (muted)`}
              />
            ) : (
              <span
                className="text-[10px] min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-gold text-secondary-foreground flex items-center justify-center font-semibold shadow-sm ring-1 ring-secondary/30"
                aria-label={`${unread} unread`}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )
          ) : isPinned ? (
            <Pin
              className="w-3 h-3 text-muted-foreground/70"
              aria-label="Pinned"
            />
          ) : null}
        </div>
      </button>
    </motion.div>
  );
}

// ============================================================================
// SearchResults — full-text message search via /api/conversations/search
// ============================================================================

interface SearchHit {
  messageId: string;
  conversationId: string;
  conversationName: string;
  conversationAvatarColor: string;
  conversationAvatarInitials: string;
  senderName: string;
  body: string;
  timestamp: string;
  snippet: string;
}

interface SearchResponse {
  q: string;
  total: number;
  hits: SearchHit[];
  grouped: Array<{
    conversationId: string;
    conversation: { name: string; avatarColor: string; avatarInitials: string };
    hits: SearchHit[];
  }>;
}

function SearchResults({
  query,
  onPick,
}: {
  query: string;
  onPick: (convId: string) => void;
}) {
  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ["conversations", "search", query],
    queryFn: async () => {
      const r = await fetch(
        `/api/conversations/search?q=${encodeURIComponent(query)}&limit=50`,
        { cache: "no-store" },
      );
      if (!r.ok) throw new Error("search failed");
      return r.json();
    },
    enabled: query.trim().length >= 2,
  });

  if (isLoading) {
    return (
      <div className="text-center text-xs text-muted-foreground py-12">
        Searching…
      </div>
    );
  }

  if (!data || data.hits.length === 0) {
    return (
      <div className="text-center text-xs text-muted-foreground py-12 px-5">
        No messages found for “{query}”.
      </div>
    );
  }

  return (
    <div className="px-5 mt-4 space-y-4">
      <p className="text-[11px] text-muted-foreground">
        {data.total} message{data.total === 1 ? "" : "s"} found
      </p>
      {data.grouped.map((g) => (
        <div key={g.conversationId} className="space-y-1.5">
          <button
            onClick={() => onPick(g.conversationId)}
            className="flex items-center gap-2.5 w-full text-start group"
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-display text-xs text-primary-foreground ${
                AVATAR_BG[g.conversation.avatarColor] ?? "bg-primary"
              }`}
            >
              {g.conversation.avatarInitials}
            </div>
            <span className="text-sm font-medium group-hover:text-secondary transition">
              {g.conversation.name}
            </span>
            <ChevronRight className="w-3 h-3 text-muted-foreground ms-auto" />
          </button>
          <ul className="space-y-1 ms-10">
            {g.hits.slice(0, 3).map((h) => (
              <li key={h.messageId}>
                <button
                  onClick={() => onPick(g.conversationId)}
                  className="w-full text-start text-xs glass rounded-xl px-3 py-2 hover:bg-muted/50 transition"
                >
                  <div className="text-[10px] text-muted-foreground mb-0.5">
                    {h.senderName} · {formatTime(h.timestamp)}
                  </div>
                  <div className="text-muted-foreground line-clamp-2">
                    {h.snippet}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ChatView
// ============================================================================

interface ChatViewProps {
  conversation: Conversation;
  socket: ReturnType<typeof useCircleSocket>;
  onBack: () => void;
}

function ChatView({ conversation, socket, onBack }: ChatViewProps) {
  const ghostMode = useApp((s) => s.ghostMode);
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<WaslMessage[]>([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; at: number }>>({});
  const [replyTo, setReplyTo] = useState<WaslMessage | null>(null);
  const [editing, setEditing] = useState<WaslMessage | null>(null);
  const [actionTarget, setActionTarget] = useState<WaslMessage | null>(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [starredOpen, setStarredOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [forwardTarget, setForwardTarget] = useState<WaslMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WaslMessage | null>(null);
  const [ttlSeconds, setTtlSeconds] = useState<number | null>(null);
  const [presence, setPresence] = useState<Conversation["presence"]>(conversation.presence ?? "offline");
  const [screenshotConsent, setScreenshotConsent] = useState<null | { onAllow: () => void; onDeny: () => void }>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingEmit = useRef<number>(0);
  const typingActive = useRef(false);
  const readIdsRef = useRef<Set<string>>(new Set());

  // --- Fetch persisted messages ---
  const { data, isLoading } = useQuery<WaslMessage[]>({
    queryKey: ["conversations", conversation.id, "messages"],
    queryFn: async () => {
      const r = await fetch(`/api/conversations/${conversation.id}/messages`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("failed to load messages");
      return r.json();
    },
  });

  // --- Sync REST data → local state. Using the "derived state during render"
  // pattern (React docs) so we don't trigger set-state-in-effect warnings.
  // The component is keyed by conversation.id in the parent, so a fresh
  // `messages` state is created on every conversation switch.
  const [lastSyncedData, setLastSyncedData] = useState<WaslMessage[] | undefined>(undefined);
  if (data !== lastSyncedData) {
    setLastSyncedData(data);
    if (data) {
      setMessages(data);
    }
  }

  // --- Side effects when persisted data loads: mark-as-read + auto-scroll ---
  useEffect(() => {
    if (!data) return;
    // Mark all loaded messages as read (we're viewing them right now).
    // Skip in ghost mode — no read receipts leaked.
    if (!ghostMode) {
      for (const m of data) {
        if (
          m.senderId !== getMe().id &&
          m.status !== "read" &&
          !readIdsRef.current.has(m.id)
        ) {
          readIdsRef.current.add(m.id);
          socket.markRead(m.id, conversation.id);
        }
      }
    }
    // Auto-scroll to bottom on data load.
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [data, ghostMode, socket]);

  // --- Socket lifecycle: join on mount, leave on unmount ---
  useEffect(() => {
    socket.joinConversation(conversation.id);
    return () => {
      socket.leaveConversation(conversation.id);
    };
    // socket.joinConversation/leaveConversation are stable (useCallback in the
    // hook). We only re-run when the conversation id changes.
  }, [conversation.id]);

  // --- Listen for cross-pillar share-to-Wasl prefill events ---
  // Dispatched by page.tsx when a user shares a news article to Wasl.
  // Sets the shared text as the input so the user can review + send.
  useEffect(() => {
    const onPrefill = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string }>).detail;
      if (detail?.text) {
        setInput(detail.text);
        toast.success("Article ready to send", { description: "Review and tap send" });
      }
    };
    window.addEventListener("wasl:prefill", onPrefill as EventListener);
    return () => window.removeEventListener("wasl:prefill", onPrefill as EventListener);
  }, []);

  // --- Screenshot detection + consent flow (blueprint §6.3) ---
  // Detects screenshot attempts via key shortcut (Ctrl+PrtScn / Cmd+Shift+3)
  // and shows a consent dialog: "X will be notified. Continue?"
  useEffect(() => {
    const onScreenshotKey = (e: KeyboardEvent) => {
      // PrtScn (Print Screen) on Windows/Linux, Cmd+Shift+3/4 on macOS
      const isPrtScn = e.key === "PrintScreen";
      const isMacShot = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "3" || e.key === "4");
      if (isPrtScn || isMacShot) {
        setScreenshotConsent({
          onAllow: () => {
            toast.success("Screenshot allowed", { description: `${conversation.name} will be notified` });
            setScreenshotConsent(null);
          },
          onDeny: () => {
            toast.error("Screenshot blocked", { description: "Consent denied — screenshot not captured" });
            setScreenshotConsent(null);
          },
        });
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onScreenshotKey);
    return () => window.removeEventListener("keydown", onScreenshotKey);
  }, [conversation.name]);

  // --- Socket event listeners ---
  useEffect(() => {
    const s = socket.socket;
    if (!s) return;

    const onReceived = (p: ReceivedMessagePayload) => {
      if (p.conversationId !== conversation.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === p.id)) return prev;
        const msg: WaslMessage = {
          id: p.id,
          conversationId: p.conversationId,
          senderId: p.senderId,
          senderName: p.senderName,
          senderInitials: p.senderInitials,
          senderColor: p.senderColor,
          body: p.body,
          timestamp: p.timestamp,
          status: p.status,
          encrypted: p.encrypted,
          replyTo: p.replyTo,
          attachment: ((p as unknown as Record<string, unknown>).attachment ?? null) as ChatMessage["attachment"],
          forwardedFrom: ((p as unknown as Record<string, unknown>).forwardedFrom ?? null) as ChatMessage["forwardedFrom"],
          ttlSeconds: ((p as unknown as Record<string, unknown>).ttlSeconds ?? null) as ChatMessage["ttlSeconds"],
          expiresAt: ((p as unknown as Record<string, unknown>).expiresAt ?? null) as ChatMessage["expiresAt"],
        };
        return [...prev, msg];
      });
      // Mark as read immediately (we're viewing the conversation). Skip in ghost mode.
      if (!ghostMode && p.senderId !== getMe().id) {
        socket.markRead(p.id, conversation.id);
      }
      // Bump conversation list (unread + last message).
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const onTyping = (p: TypingUpdatePayload) => {
      if (p.conversationId !== conversation.id) return;
      if (p.userId === getMe().id) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (p.isTyping) {
          next[p.userId] = { name: p.senderName, at: Date.now() };
        } else {
          delete next[p.userId];
        }
        return next;
      });
    };

    const onStatus = (p: MessageStatusPayload) => {
      if (p.conversationId !== conversation.id) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === p.messageId ? { ...m, status: p.status } : m)),
      );
    };

    const onReaction = (p: ReactionUpdatePayload) => {
      if (p.conversationId !== conversation.id) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== p.messageId) return m;
          const reactions = { ...(m.reactions ?? {}) };
          reactions[p.emoji] = p.count;
          if (reactions[p.emoji] <= 0) delete reactions[p.emoji];
          return { ...m, reactions };
        }),
      );
    };

    const onEdited = (p: { messageId: string; body: string; editedAt: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === p.messageId
            ? { ...m, body: p.body, edited: true, editedAt: p.editedAt }
            : m,
        ),
      );
    };

    const onDeleted = (p: { messageId: string; body: string; deletedAt: string; scope: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === p.messageId
            ? {
                ...m,
                body: p.body,
                isDeleted: true,
                deletedAt: p.deletedAt,
                attachment: null,
                replyTo: null,
              }
            : m,
        ),
      );
    };

    const onPinned = (p: { messageId: string; isPinned: boolean; pinnedBy: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === p.messageId ? { ...m, isPinned: p.isPinned } : m)),
      );
      toast.success(p.isPinned ? `Pinned by ${p.pinnedBy}` : "Message unpinned");
    };

    const onStarred = (p: { messageId: string; isStarred: boolean }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === p.messageId ? { ...m, isStarred: p.isStarred } : m)),
      );
    };

    const onPresence = (p: PresenceUpdatePayload) => {
      if (p.conversationId !== conversation.id) return;
      setPresence(p.presence);
    };

    s.on("message:received", onReceived);
    s.on("typing:update", onTyping);
    s.on("message:status", onStatus);
    s.on("reaction:update", onReaction);
    s.on("message:edited", onEdited);
    s.on("message:deleted", onDeleted);
    s.on("message:pinned", onPinned);
    s.on("message:starred", onStarred);
    s.on("presence:update", onPresence);

    return () => {
      s.off("message:received", onReceived);
      s.off("typing:update", onTyping);
      s.off("message:status", onStatus);
      s.off("reaction:update", onReaction);
      s.off("message:edited", onEdited);
      s.off("message:deleted", onDeleted);
      s.off("message:pinned", onPinned);
      s.off("message:starred", onStarred);
      s.off("presence:update", onPresence);
    };
    // The callbacks close over `ghostMode`, `socket.markRead`, `conversation.id`
    // — we re-subscribe whenever any of them change.
  }, [socket.socket, conversation.id, ghostMode]);

  // --- Typing indicator auto-clear (5s of no updates) ---
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        let changed = false;
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.at < 5000) {
            next[k] = v;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // --- Auto-scroll on new message or typing ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, typingUsers]);

  // --- Send message ---
  const sendMutation = useMutation({
    mutationFn: async (input: {
      body: string;
      replyToId?: string;
      attachment?: {
        kind: "image" | "audio" | "file" | "location" | "payment";
        name: string;
        url?: string;
        mime?: string;
        size?: number;
      };
    }) => {
      const r = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: input.body,
          senderId: getMe().id,
          senderName: getMe().displayName,
          senderInitials: getMe().avatarInitials,
          senderColor: getMe().avatarColor,
          replyToId: input.replyToId,
          attachmentKind: input.attachment?.kind ?? null,
          attachmentName: input.attachment?.name ?? null,
          attachmentUrl: input.attachment?.url ?? null,
          attachmentMime: input.attachment?.mime ?? null,
          attachmentSize: input.attachment?.size ?? null,
          ttlSeconds: ttlSeconds,
        }),
      });
      if (!r.ok) throw new Error("failed to send");
      return r.json() as Promise<WaslMessage>;
    },
    onMutate: async (input) => {
      // Optimistic insert.
      const optimistic: WaslMessage = {
        id: `pending-${Date.now()}`,
        conversationId: conversation.id,
        senderId: getMe().id,
        senderName: getMe().displayName,
        senderInitials: getMe().avatarInitials,
        senderColor: getMe().avatarColor,
        body: input.body,
        timestamp: new Date().toISOString(),
        status: "pending",
        encrypted: true,
        replyTo: input.replyToId
          ? (() => {
              const found = messages.find((m) => m.id === input.replyToId);
              return found
                ? { id: found.id, senderName: found.senderName, body: found.body }
                : null;
            })()
          : null,
        attachment: input.attachment
          ? {
              kind: input.attachment.kind,
              name: input.attachment.name,
              url: input.attachment.url,
              size: input.attachment.size,
              meta: input.attachment.mime,
            }
          : null,
        ttlSeconds,
        expiresAt: ttlSeconds
          ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
          : null,
      };
      setMessages((prev) => [...prev, optimistic]);
      setInput("");
      setReplyTo(null);
      // Stop typing indicator.
      if (typingActive.current) {
        typingActive.current = false;
        socket.setTyping(conversation.id, false);
      }
      return { optimistic };
    },
    onSuccess: (persisted, _vars, ctx) => {
      // Replace optimistic with persisted + emit socket event for other clients.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === ctx?.optimistic.id
            ? { ...persisted, status: ghostMode ? "sent" : "sent" }
            : m,
        ),
      );
      socket.sendMessage({
        id: persisted.id,
        conversationId: conversation.id,
        body: persisted.body,
        replyToId: persisted.replyTo?.id,
        attachment: persisted.attachment
          ? {
              kind: persisted.attachment.kind,
              name: persisted.attachment.name,
              url: persisted.attachment.url,
              mime: persisted.attachment.meta,
              size: persisted.attachment.size,
            }
          : null,
        ttlSeconds,
        expiresAt: persisted.expiresAt ?? null,
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.optimistic) {
        setMessages((prev) => prev.filter((m) => m.id !== ctx.optimistic.id));
      }
      toast.error("Failed to send message");
    },
  });

  // --- Edit message ---
  const editMutation = useMutation({
    mutationFn: async ({ msgId, body }: { msgId: string; body: string }) => {
      const r = await fetch(
        `/api/conversations/${conversation.id}/messages/${msgId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "failed to edit");
      }
      return r.json();
    },
    onSuccess: (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.id
            ? { ...m, body: data.body, editedAt: data.editedAt, edited: true }
            : m,
        ),
      );
      socket.editMessage({
        conversationId: conversation.id,
        messageId: data.id,
        body: data.body,
      });
      toast.success("Message edited");
    },
    onError: (err) => toast.error(err.message),
  });

  // --- Delete message ---
  const deleteMutation = useMutation({
    mutationFn: async ({
      msgId,
      scope,
      snapshot,
    }: {
      msgId: string;
      scope: "everyone" | "me";
      /** Captured pre-deletion so the Undo toast can restore local state. */
      snapshot?: WaslMessage;
    }) => {
      const r = await fetch(
        `/api/conversations/${conversation.id}/messages/${msgId}?scope=${scope}`,
        { method: "DELETE" },
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "failed to delete");
      }
      return r.json();
    },
    onSuccess: (data, vars) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.id
            ? {
                ...m,
                body: data.body,
                isDeleted: true,
                deletedAt: data.deletedAt,
                attachment: null,
                replyTo: null,
              }
            : m,
        ),
      );
      socket.deleteMessage({
        conversationId: conversation.id,
        messageId: data.id,
        scope: data.scope,
      });
      const snapshot = vars.snapshot;
      toast.success("Message deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            if (!snapshot) return;
            // Local-only restore — there's no server-side undelete endpoint,
            // so we surface that the change is device-local for now.
            setMessages((prev) =>
              prev.map((m) =>
                m.id === snapshot.id
                  ? { ...snapshot, isDeleted: false, deletedAt: undefined }
                  : m,
              ),
            );
            toast.success("Restored — will sync when online");
          },
        },
      });
    },
    onError: (err) => toast.error(err.message),
  });

  // --- Toggle reaction ---
  const reactMutation = useMutation({
    mutationFn: async ({
      msgId,
      emoji,
    }: {
      msgId: string;
      emoji: string;
    }) => {
      const r = await fetch(
        `/api/conversations/${conversation.id}/messages/${msgId}/reactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emoji,
            userId: getMe().id,
            displayName: getMe().displayName,
          }),
        },
      );
      if (!r.ok) throw new Error("failed to react");
      return r.json();
    },
    onSuccess: (data) => {
      socket.toggleReaction({
        conversationId: conversation.id,
        messageId: data.messageId,
        emoji: data.emoji,
        count: data.count,
        displayName: getMe().displayName,
      });
    },
  });

  // --- Pin / star toggle ---
  const pinStarMutation = useMutation({
    mutationFn: async ({
      msgId,
      isPinned,
      isStarred,
    }: {
      msgId: string;
      isPinned?: boolean;
      isStarred?: boolean;
    }) => {
      const r = await fetch(
        `/api/conversations/${conversation.id}/messages/${msgId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned, isStarred }),
        },
      );
      if (!r.ok) throw new Error("failed to update");
      return r.json();
    },
    onSuccess: (data, vars) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.id
            ? {
                ...m,
                isPinned: data.isPinned,
                isStarred: data.isStarred,
              }
            : m,
        ),
      );
      if (vars.isPinned !== undefined) {
        socket.pinMessage({
          conversationId: conversation.id,
          messageId: data.id,
          isPinned: data.isPinned,
          pinnedBy: getMe().displayName,
        });
        toast.success(data.isPinned ? "Message pinned" : "Message unpinned");
      }
      if (vars.isStarred !== undefined) {
        socket.starMessage({
          conversationId: conversation.id,
          messageId: data.id,
          isStarred: data.isStarred,
        });
        toast.success(data.isStarred ? "Message starred" : "Unstarred");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  // --- Forward message ---
  const forwardMutation = useMutation({
    mutationFn: async ({
      targetId,
      msg,
    }: {
      targetId: string;
      msg: WaslMessage;
    }) => {
      const r = await fetch(`/api/conversations/${targetId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: msg.body,
          senderId: getMe().id,
          senderName: getMe().displayName,
          senderInitials: getMe().avatarInitials,
          senderColor: getMe().avatarColor,
          forwardedFromId: msg.id,
          attachmentKind: msg.attachment?.kind ?? null,
          attachmentName: msg.attachment?.name ?? null,
          attachmentUrl: msg.attachment?.url ?? null,
          attachmentMime: msg.attachment?.meta ?? null,
          attachmentSize: msg.attachment?.size ?? null,
        }),
      });
      if (!r.ok) throw new Error("failed to forward");
      return r.json();
    },
    onSuccess: (persisted, vars) => {
      // Emit to the target conversation's socket room.
      socket.sendMessage({
        id: persisted.id,
        conversationId: vars.targetId,
        body: persisted.body,
        attachment: persisted.attachment
          ? {
              kind: persisted.attachment.kind,
              name: persisted.attachment.name,
              url: persisted.attachment.url,
              mime: persisted.attachment.meta,
              size: persisted.attachment.size,
            }
          : null,
        forwardedFrom: {
          senderName: vars.msg.senderName,
          body: vars.msg.body,
        },
      });
      toast.success("Message forwarded");
      setForwardTarget(null);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => toast.error("Failed to forward"),
  });

  // --- Voice message send (separate from text send) ---
  const sendVoiceMutation = useMutation({
    mutationFn: async ({
      dataUrl,
      duration,
      mime,
      size,
    }: {
      dataUrl: string;
      duration: number;
      mime: string;
      size: number;
    }) => {
      const r = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: `🎙️ Voice message · ${formatDuration(duration)}`,
          senderId: getMe().id,
          senderName: getMe().displayName,
          senderInitials: getMe().avatarInitials,
          senderColor: getMe().avatarColor,
          attachmentKind: "audio",
          attachmentName: `voice-${Date.now()}.webm`,
          attachmentUrl: dataUrl,
          attachmentMime: mime,
          attachmentSize: size,
          ttlSeconds,
        }),
      });
      if (!r.ok) throw new Error("failed to send voice");
      return r.json();
    },
    onSuccess: (persisted) => {
      setMessages((prev) => [...prev, persisted]);
      socket.sendMessage({
        id: persisted.id,
        conversationId: conversation.id,
        body: persisted.body,
        attachment: persisted.attachment
          ? {
              kind: "audio",
              name: persisted.attachment.name,
              url: persisted.attachment.url,
              mime: persisted.attachment.meta,
              size: persisted.attachment.size,
            }
          : null,
        ttlSeconds,
        expiresAt: persisted.expiresAt ?? null,
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => toast.error("Failed to send voice message"),
  });

  // --- Typing emit on input change ---
  const handleInputChange = (val: string) => {
    setInput(val);
    if (editing) return; // no typing indicator while editing
    const now = Date.now();
    if (val && !typingActive.current) {
      typingActive.current = true;
      socket.setTyping(conversation.id, true);
      lastTypingEmit.current = now;
    } else if (val && typingActive.current && now - lastTypingEmit.current > 3000) {
      // Re-emit every 3s while still typing.
      socket.setTyping(conversation.id, true);
      lastTypingEmit.current = now;
    } else if (!val && typingActive.current) {
      typingActive.current = false;
      socket.setTyping(conversation.id, false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    if (editing) {
      editMutation.mutate({ msgId: editing.id, body: text });
      setEditing(null);
      setInput("");
      return;
    }
    sendMutation.mutate({
      body: text,
      replyToId: replyTo?.id,
    });
  };

  const handleCancelReply = () => {
    setReplyTo(null);
    setInput("");
  };

  const handleStartEdit = (m: WaslMessage) => {
    setEditing(m);
    setInput(m.body);
    setReplyTo(null);
    setActionTarget(null);
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setInput("");
  };

  // --- Pinned message (most recent) ---
  const pinnedMessage = useMemo(
    () => messages.filter((m) => m.isPinned && !m.isDeleted).slice(-1)[0] ?? null,
    [messages],
  );

  // --- In-chat search filter ---
  const filteredMessages = useMemo(() => {
    if (!searchMode || !searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => m.body.toLowerCase().includes(q));
  }, [messages, searchMode, searchQuery]);

  const typingNames = Object.values(typingUsers).map((t) => t.name);

  return (
    <div className="pb-24 lg:pb-4 min-h-screen lg:min-h-0 lg:h-[calc(100vh-2rem)] flex flex-col lg:rounded-3xl lg:border lg:border-border lg:overflow-hidden lg:bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 glass px-3 py-2.5 lg:rounded-t-3xl flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition lg:hidden"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground font-display ${
            AVATAR_BG[conversation.avatarColor] ?? "bg-primary"
          }`}
        >
          {conversation.type === "group" ? (
            <Users className="w-4 h-4" />
          ) : conversation.type === "channel" ? (
            <Radio className="w-4 h-4" />
          ) : conversation.isCircle ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            conversation.avatarInitials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-1.5">
            {conversation.name}
            {conversation.encrypted && (
              <Shield className="w-3 h-3 text-secondary/70" />
            )}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            {ghostMode ? (
              <>
                <Ghost className="w-3 h-3" /> Ghost mode · E2E encrypted
              </>
            ) : typingNames.length > 0 ? (
              <span className="text-secondary">
                {typingNames.length === 1
                  ? `${typingNames[0]} is typing…`
                  : `${typingNames.length} people typing…`}
              </span>
            ) : presence === "online" ? (
              <span className="text-secondary">online</span>
            ) : presence === "away" ? (
              <span>away</span>
            ) : (
              <>
                <Shield className="w-3 h-3" /> E2E encrypted
              </>
            )}
          </div>
        </div>

        {/* In-chat search toggle */}
        <button
          onClick={() => {
            setSearchMode((v) => !v);
            setSearchQuery("");
          }}
          className={`w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition ${
            searchMode ? "bg-secondary/20 text-secondary" : ""
          }`}
          aria-label="Search in conversation"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Starred messages */}
        <button
          onClick={() => setStarredOpen(true)}
          className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition"
          aria-label="Starred messages"
        >
          <Star className="w-4 h-4" />
        </button>

        {/* Settings / overflow */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Conversation</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Timer className="w-4 h-4 me-2" /> Disappearing messages
              {ttlSeconds && (
                <span className="ms-auto text-[10px] text-secondary">
                  {TTL_PRESETS.find((p) => p.seconds === ttlSeconds)?.label}
                </span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("circle:start-call", {
                    detail: { callee: conversation.name, type: "voice" },
                  }),
                )
              }
            >
              <Phone className="w-4 h-4 me-2" /> Voice call
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("circle:start-call", {
                    detail: { callee: conversation.name, type: "video" },
                  }),
                )
              }
            >
              <Video className="w-4 h-4 me-2" /> Video call
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.success("Marked as read")}
            >
              <CheckCheck className="w-4 h-4 me-2" /> Mark as read
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                toast(conversation.muted ? "Unmuted" : "Muted", {
                  description: conversation.name,
                })
              }
            >
              {conversation.muted ? (
                <>
                  <Bell className="w-4 h-4 me-2" /> Unmute
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 me-2" /> Mute
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast("Conversation archived")}
            >
              <Archive className="w-4 h-4 me-2" /> Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("circle:device-verify"))}>
              <ShieldCheck className="w-4 h-4 me-2" /> Verify device (E2EE)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("circle:work-mode"))}>
              <Briefcase className="w-4 h-4 me-2" /> Work mode (Maktab)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("circle:broadcast-channel"))}>
              <Radio className="w-4 h-4 me-2" /> Create broadcast channel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("circle:commit"))}>
              <ShieldCheck className="w-4 h-4 me-2" /> Create agreement (Commit)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* In-chat search bar */}
      <AnimatePresence>
        {searchMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-card/50"
          >
            <div className="px-3 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in this conversation"
                className="flex-1 bg-transparent outline-none text-sm"
              />
              {searchQuery && (
                <span className="text-[10px] text-muted-foreground">
                  {filteredMessages.length} match
                  {filteredMessages.length === 1 ? "" : "es"}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchMode(false);
                  setSearchQuery("");
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned message bar */}
      <AnimatePresence>
        {pinnedMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-secondary/10"
          >
            <button
              onClick={() => {
                const el = document.getElementById(`msg-${pinnedMessage.id}`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                el?.classList.add("ring-2", "ring-secondary");
                setTimeout(() => el?.classList.remove("ring-2", "ring-secondary"), 2000);
              }}
              className="w-full text-start px-3 py-2 flex items-start gap-2 hover:bg-secondary/15 transition"
            >
              <Pin className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-secondary font-medium uppercase tracking-widest">
                  Pinned
                </div>
                <div className="text-xs truncate">
                  <span className="text-muted-foreground">
                    {pinnedMessage.senderName}:
                  </span>{" "}
                  {pinnedMessage.body}
                </div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 px-3 lg:px-5 py-4 space-y-2 overflow-y-auto max-h-[60vh] lg:max-h-none"
        style={{ scrollBehavior: "smooth" }}
      >
        {isLoading && (
          <div className="text-center text-xs text-muted-foreground py-8">
            Loading messages…
          </div>
        )}
        {!isLoading && filteredMessages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-12">
            {searchMode && searchQuery
              ? "No messages match your search."
              : "No messages yet. Say salam 👋"}
          </div>
        )}
        {filteredMessages.map((m, idx) => {
          const prev = filteredMessages[idx - 1];
          const showSenderHeader =
            !prev ||
            prev.senderId !== m.senderId ||
            Date.parse(m.timestamp) - Date.parse(prev.timestamp) > 5 * 60 * 1000;
          return (
            <MessageBubble
              key={m.id}
              message={m}
              showHeader={showSenderHeader}
              isGroup={conversation.type === "group" || conversation.type === "channel"}
              ghostMode={ghostMode}
              onAction={(msg) => setActionTarget(msg)}
              onReply={(msg) => {
                setReplyTo(msg);
                setEditing(null);
                setInput("");
              }}
              onReact={(msg, emoji) =>
                reactMutation.mutate({ msgId: msg.id, emoji })
              }
              searchQuery={searchMode ? searchQuery : ""}
            />
          );
        })}

        {/* Typing preview bubble */}
        {Object.keys(typingUsers).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="me-auto w-fit flex items-center gap-2 px-4 py-2 bg-muted rounded-2xl rounded-bl-md"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 rounded-full bg-muted-foreground"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {Object.values(typingUsers)[0]?.name} is typing
              {Object.keys(typingUsers).length > 1
                ? ` + ${Object.keys(typingUsers).length - 1} more`
                : ""}
            </span>
          </motion.div>
        )}
      </div>

      {/* Reply preview bar */}
      <AnimatePresence>
        {(replyTo || editing) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border bg-card/50"
          >
            <div className="px-3 py-2 flex items-center gap-2">
              <div className="w-1 self-stretch bg-secondary rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-secondary font-medium uppercase tracking-widest">
                  {editing ? "Editing" : "Replying to"}
                </div>
                <div className="text-xs truncate text-muted-foreground">
                  {editing ? editing.body : `${replyTo?.senderName}: ${replyTo?.body}`}
                </div>
              </div>
              <button
                onClick={editing ? handleCancelEdit : handleCancelReply}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer */}
      <Composer
        value={input}
        onChange={handleInputChange}
        onSend={handleSend}
        onVoice={(blob, duration) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            sendVoiceMutation.mutate({
              dataUrl,
              duration,
              mime: blob.type,
              size: blob.size,
            });
          };
          reader.readAsDataURL(blob);
        }}
        disabled={sendMutation.isPending}
        isEditing={!!editing}
        ttlLabel={
          ttlSeconds
            ? TTL_PRESETS.find((p) => p.seconds === ttlSeconds)?.label ?? null
            : null
        }
      />

      {/* Action sheet (long-press / right-click) */}
      <MessageActionsSheet
        message={actionTarget}
        open={!!actionTarget}
        onOpenChange={(v) => {
          if (!v) setActionTarget(null);
        }}
        isOwner={(m) => m.senderId === getMe().id}
        canEdit={(m) => {
          if (m.senderId !== getMe().id) return false;
          const age = Date.now() - Date.parse(m.timestamp);
          return age < EDIT_WINDOW_MS && !m.isDeleted;
        }}
        onReact={(m, emoji) => {
          reactMutation.mutate({ msgId: m.id, emoji });
          setActionTarget(null);
        }}
        onReply={(m) => {
          setReplyTo(m);
          setEditing(null);
          setActionTarget(null);
        }}
        onEdit={(m) => handleStartEdit(m)}
        onDelete={(m) => {
          setDeleteTarget(m);
          setActionTarget(null);
        }}
        onForward={(m) => {
          setForwardTarget(m);
          setActionTarget(null);
        }}
        onStar={(m) => {
          pinStarMutation.mutate({
            msgId: m.id,
            isStarred: !m.isStarred,
          });
          setActionTarget(null);
        }}
        onPin={(m) => {
          pinStarMutation.mutate({
            msgId: m.id,
            isPinned: !m.isPinned,
          });
          setActionTarget(null);
        }}
        onCopy={(m) => {
          navigator.clipboard?.writeText(m.body);
          toast.success("Copied to clipboard");
          setActionTarget(null);
        }}
      />

      {/* Delete confirmation dialog (lifted out of the action sheet so the
          sheet stays stateless and we avoid setState-in-effect). */}
      <DeleteConfirmDialog
        message={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(m, scope) => {
          deleteMutation.mutate({ msgId: m.id, scope, snapshot: m });
          setDeleteTarget(null);
        }}
      />

      {/* Screenshot consent dialog (blueprint §6.3 — screenshot blocked till other person accepts) */}
      {screenshotConsent && (
        <div className="fixed inset-0 z-[200] bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-6 max-w-sm w-full shadow-float">
            <div className="w-14 h-14 mx-auto rounded-full bg-accent/20 flex items-center justify-center mb-4">
              <ScanLine className="w-7 h-7 text-accent" />
            </div>
            <h3 className="font-display text-lg text-center mb-2">Screenshot detected</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              <b>{conversation.name}</b> requires screenshot consent. They will be notified if you proceed.
              Continue?
            </p>
            <div className="flex gap-2">
              <button
                onClick={screenshotConsent.onDeny}
                className="flex-1 py-3 rounded-xl glass text-sm font-medium hover:bg-muted/40"
              >
                Deny
              </button>
              <button
                onClick={screenshotConsent.onAllow}
                className="flex-1 py-3 rounded-xl bg-gradient-gold text-charcoal text-sm font-medium"
              >
                Allow & notify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Starred messages sheet */}
      <StarredMessagesSheet
        open={starredOpen}
        onOpenChange={setStarredOpen}
        messages={messages.filter((m) => m.isStarred && !m.isDeleted)}
        onJump={(m) => {
          setStarredOpen(false);
          const el = document.getElementById(`msg-${m.id}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          el?.classList.add("ring-2", "ring-secondary");
          setTimeout(() => el?.classList.remove("ring-2", "ring-secondary"), 2000);
        }}
      />

      {/* Conversation settings sheet */}
      <ConversationSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        conversation={conversation}
        ttlSeconds={ttlSeconds}
        onTtlChange={setTtlSeconds}
      />

      {/* Forward dialog */}
      <ForwardDialog
        message={forwardTarget}
        onClose={() => setForwardTarget(null)}
        onForward={(targetId) => {
          if (!forwardTarget) return;
          forwardMutation.mutate({ targetId, msg: forwardTarget });
        }}
      />
    </div>
  );
}

// ============================================================================
// MessageBubble
// ============================================================================

interface MessageBubbleProps {
  message: WaslMessage;
  showHeader: boolean;
  isGroup: boolean;
  ghostMode: boolean;
  searchQuery: string;
  onAction: (m: WaslMessage) => void;
  onReply: (m: WaslMessage) => void;
  onReact: (m: WaslMessage, emoji: string) => void;
}

function MessageBubble({
  message,
  showHeader,
  isGroup,
  ghostMode,
  searchQuery,
  onAction,
  onReply,
  onReact,
}: MessageBubbleProps) {
  const isMine = message.senderId === getMe().id;
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const startLongPress = () => {
    const t = setTimeout(() => onAction(message), 500);
    setLongPressTimer(t);
  };
  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleReactQuick = (emoji: string) => {
    onReact(message, emoji);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onAction(message);
  };

  // Highlight body matches when search query is set.
  const renderHighlightedBody = (body: string) => {
    if (!searchQuery) return renderBody(body).map((part, i) =>
      part.mention ? (
        <span key={i} className="text-secondary font-medium bg-secondary/10 px-0.5 rounded">
          {part.text}
        </span>
      ) : (
        <span key={i}>{part.text}</span>
      ),
    );
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return body.split(regex).map((chunk, i) =>
      regex.test(chunk) && chunk.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-400/40 text-foreground px-0.5 rounded">
          {chunk}
        </mark>
      ) : (
        <span key={i}>{chunk}</span>
      ),
    );
  };

  if (message.isDeleted) {
    return (
      <div
        id={`msg-${message.id}`}
        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm italic text-muted-foreground ${
            isMine
              ? "bg-muted/60 rounded-br-md"
              : "bg-muted/40 rounded-bl-md"
          }`}
        >
          <Trash2 className="w-3 h-3 inline me-1.5 opacity-60" />
          {message.body || "This message was deleted"}
          <div className="text-[10px] mt-1 opacity-70">{formatTime(message.timestamp)}</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`flex flex-col ${isMine ? "items-end" : "items-start"} group`}
    >
      {showHeader && !isMine && isGroup && (
        <div className="flex items-center gap-1.5 px-2 mb-0.5">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-primary-foreground font-medium ${
              AVATAR_BG[message.senderColor] ?? "bg-primary"
            }`}
          >
            {message.senderInitials}
          </div>
          <span className="text-[11px] font-medium">{message.senderName}</span>
        </div>
      )}

      <div
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
        onContextMenu={handleContextMenu}
        className={`relative max-w-[80%] sm:max-w-[70%] ${
          isMine ? "self-end" : "self-start"
        }`}
      >
        {/* Forwarded indicator */}
        {message.forwardedFrom && (
          <div
            className={`text-[10px] text-muted-foreground mb-1 flex items-center gap-1 ${
              isMine ? "text-right justify-end" : ""
            }`}
          >
            <Forward className="w-3 h-3" /> Forwarded from{" "}
            {message.forwardedFrom.senderName}
          </div>
        )}

        {/* Reply quote */}
        {message.replyTo && (
          <div
            className={`mb-1.5 px-2.5 py-1.5 rounded-lg border-l-2 border-secondary/60 bg-secondary/5 text-xs ${
              isMine ? "rounded-tr-md" : "rounded-tl-md"
            }`}
          >
            <div className="text-[10px] font-medium text-secondary">
              {message.replyTo.senderName}
            </div>
            <div className="text-muted-foreground line-clamp-2">
              {message.replyTo.body}
            </div>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm break-words ${
            isMine
              ? "bg-gradient-hero text-cream rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md"
          }`}
        >
          {message.attachment?.kind === "audio" ? (
            <AudioPlayer
              url={message.attachment.url}
              durationLabel={message.body.replace(/^🎙️ Voice message · /, "")}
              mine={isMine}
              seed={message.id}
            />
          ) : message.attachment?.kind === "image" ? (
            <div className="space-y-1">
              {message.attachment.url && (
                <img
                  src={message.attachment.url}
                  alt={message.attachment.name}
                  className="rounded-lg max-w-full max-h-64 object-cover"
                />
              )}
              {message.body && (
                <div>{renderHighlightedBody(message.body)}</div>
              )}
            </div>
          ) : message.attachment?.kind === "file" ? (
            <div className="flex items-center gap-2 py-0.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isMine ? "bg-primary-foreground/15" : "bg-secondary/15"
                }`}
              >
                <Archive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">
                  {message.attachment.name}
                </div>
                <div className={`text-[10px] ${isMine ? "opacity-70" : "text-muted-foreground"}`}>
                  {message.attachment.meta ?? "file"}
                </div>
              </div>
            </div>
          ) : message.attachment?.kind === "payment" ? (
            <div className="flex items-center gap-2 py-0.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isMine ? "bg-primary-foreground/15" : "bg-secondary/15"
                }`}
              >
                <span className="text-base">💸</span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">
                  {message.attachment.name}
                </div>
                {message.attachment.meta && (
                  <div className={`text-[10px] ${isMine ? "opacity-70" : "text-muted-foreground"}`}>
                    {message.attachment.meta}
                  </div>
                )}
              </div>
            </div>
          ) : message.attachment?.kind === "location" ? (
            <div className="flex items-center gap-2 py-0.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isMine ? "bg-primary-foreground/15" : "bg-secondary/15"
                }`}
              >
                <ScanLine className="w-4 h-4" />
              </div>
              <div className="text-xs font-medium">{message.attachment.name}</div>
            </div>
          ) : (
            <div>{renderHighlightedBody(message.body)}</div>
          )}

          {/* Footer: time, edited, ttl, status ticks */}
          <div
            className={`flex items-center gap-1.5 mt-1 text-[10px] ${
              isMine ? "text-primary-foreground/70" : "text-muted-foreground"
            }`}
          >
            {message.ttlSeconds && (
              <Timer className="w-3 h-3" aria-label="Disappearing message" />
            )}
            {message.isStarred && <Star className="w-3 h-3 text-secondary" fill="currentColor" />}
            {message.edited && <span className="italic">edited</span>}
            <span>{formatTime(message.timestamp)}</span>
            {isMine && !ghostMode && !message.isDeleted && (
              <StatusTicks status={message.status} />
            )}
            {isMine && ghostMode && !message.isDeleted && (
              <Ghost className="w-3 h-3" aria-label="Ghost mode" />
            )}
          </div>
        </div>

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-1 ${
              isMine ? "justify-end" : "justify-start"
            }`}
          >
            {Object.entries(message.reactions).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReactQuick(emoji)}
                className="text-xs px-1.5 py-0.5 rounded-full bg-secondary/15 hover:bg-secondary/25 transition flex items-center gap-1"
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hover quick reactions (desktop) */}
        <div
          className={`absolute -top-3 ${isMine ? "right-2" : "left-2"} hidden group-hover:flex bg-background border border-border rounded-full shadow-float px-1 py-0.5 gap-0.5 z-10`}
        >
          {QUICK_REACTIONS.map((e) => (
            <button
              key={e}
              onClick={() => handleReactQuick(e)}
              className="w-6 h-6 rounded-full hover:bg-muted/60 flex items-center justify-center text-xs transition"
              aria-label={`React ${e}`}
            >
              {e}
            </button>
          ))}
          <button
            onClick={() => onAction(message)}
            className="w-6 h-6 rounded-full hover:bg-muted/60 flex items-center justify-center transition"
            aria-label="More actions"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Reply shortcut (visible on hover) */}
      <div className={`hidden group-hover:flex ${isMine ? "self-end" : "self-start"} -mt-1`}>
        <button
          onClick={() => onReply(message)}
          className="text-[10px] text-muted-foreground hover:text-secondary flex items-center gap-1 px-2 py-0.5"
        >
          <Reply className="w-3 h-3" /> Reply
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// StatusTicks — message status icons
// ============================================================================

function StatusTicks({ status }: { status: MessageStatus }) {
  if (status === "pending") {
    return <Clock className="w-3 h-3" aria-label="Pending" />;
  }
  if (status === "sent") {
    return <Check className="w-3 h-3" aria-label="Sent" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="w-3 h-3" aria-label="Delivered" />;
  }
  // read
  return (
    <CheckCheck className="w-3 h-3 text-secondary" aria-label="Read" />
  );
}

// ============================================================================
// AudioPlayer — for voice message bubbles
// ============================================================================

function AudioPlayer({
  url,
  durationLabel,
  mine,
  seed,
}: {
  url?: string;
  durationLabel: string;
  mine: boolean;
  seed: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const bars = useMemo(() => waveformBars(seed, 28), [seed]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      void a.play();
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-[200px] py-0.5">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setProgress(a.currentTime / a.duration);
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        preload="metadata"
      />
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          mine ? "bg-primary-foreground/15" : "bg-secondary/15"
        }`}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ms-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-0.5 h-6">
          {bars.map((h, i) => {
            const played = i / bars.length <= progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${
                  played
                    ? mine
                      ? "bg-primary-foreground"
                      : "bg-secondary"
                    : mine
                      ? "bg-primary-foreground/30"
                      : "bg-muted-foreground/30"
                }`}
                style={{ height: `${Math.max(2, h * 100)}%` }}
              />
            );
          })}
        </div>
        <div
          className={`text-[10px] mt-0.5 ${mine ? "opacity-70" : "text-muted-foreground"}`}
        >
          {durationLabel}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Composer — text input + voice recorder + send
// ============================================================================

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onVoice: (blob: Blob, durationSec: number) => void;
  disabled?: boolean;
  isEditing: boolean;
  ttlLabel: string | null;
}

function Composer({
  value,
  onChange,
  onSend,
  onVoice,
  disabled,
  isEditing,
  ttlLabel,
}: ComposerProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [flying, setFlying] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        const dur = (Date.now() - startTimeRef.current) / 1000;
        if (dur > 0.5 && blob.size > 0) {
          onVoice(blob, dur);
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      startTimeRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      animRef.current = setInterval(() => {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = (send: boolean) => {
    if (animRef.current) {
      clearInterval(animRef.current);
      animRef.current = null;
    }
    const mr = mediaRef.current;
    setRecording(false);
    if (!mr) return;
    if (!send) {
      // Cancel: stop without invoking ondataavailable callback chain.
      mr.ondataavailable = null;
      mr.onstop = () => {
        mr.stream.getTracks().forEach((t) => t.stop());
      };
    }
    mr.stop();
    mediaRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, []);

  const triggerSend = () => {
    if (flying) return;
    // Haptic feedback (guarded for unsupported devices)
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(8);
      } catch {
        /* no-op */
      }
    }
    // Trigger fly-away micro-interaction
    setFlying(true);
    onSend();
  };

  if (recording) {
    return (
      <div className="sticky bottom-20 lg:bottom-4 px-3">
        <div className="glass-strong rounded-full px-4 py-2.5 flex items-center gap-3 shadow-float border border-accent/40">
          <div className="flex items-center gap-1.5">
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-2.5 h-2.5 rounded-full bg-accent"
            />
            <span className="text-xs text-accent font-medium">REC</span>
          </div>
          <span className="text-sm tabular-nums">{formatDuration(elapsed)}</span>
          {/* Live waveform — animated bars */}
          <div className="flex-1 flex items-center gap-0.5 h-6">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [`${20 + Math.random() * 30}%`, `${50 + Math.random() * 50}%`, `${20 + Math.random() * 30}%`] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.05 }}
                className="flex-1 rounded-full bg-accent/60"
              />
            ))}
          </div>
          <button
            onClick={() => stopRecording(false)}
            className="text-xs text-muted-foreground hover:text-foreground px-2"
            aria-label="Cancel recording"
          >
            Cancel
          </button>
          <button
            onClick={() => stopRecording(true)}
            className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center"
            aria-label="Send voice message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-20 lg:bottom-4 px-3">
      {ttlLabel && (
        <div className="text-center mb-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
            <Timer className="w-3 h-3" /> Disappearing: {ttlLabel}
          </span>
        </div>
      )}
      {/* R4: Quick action toolbar — always visible, one-tap access to top attachments */}
      <div className="flex gap-1.5 px-3 pb-1 overflow-x-auto scrollbar-hide">
        {[
          { icon: ImageIcon, label: "Photo", action: () => { const i = document.createElement("input"); i.type="file"; i.accept="image/*"; i.onchange=()=>toast.success("Photo attached"); i.click(); } },
          { icon: Sparkles, label: "GIF", evt: "circle:gif-picker" },
          { icon: ShieldCheck, label: "Commit", evt: "circle:commit" },
          { icon: ScanLine, label: "Location", action: () => { if(navigator.geolocation){navigator.geolocation.getCurrentPosition(()=>toast.success("Location shared"),()=>toast.error("Location denied"))} } },
          { icon: Radio, label: "Broadcast", evt: "circle:broadcast-channel" },
        ].map(qa => (
          <button
            key={qa.label}
            onClick={() => qa.evt ? window.dispatchEvent(new CustomEvent(qa.evt)) : qa.action?.()}
            className="text-xs px-3 py-1.5 rounded-full glass hover:bg-muted/40 flex items-center gap-1.5 whitespace-nowrap transition"
          >
            <qa.icon className="w-3.5 h-3.5 text-secondary" />
            {qa.label}
          </button>
        ))}
      </div>
      <div className="glass-strong rounded-full px-3 py-2 flex items-center gap-2 shadow-float">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
              aria-label="Add attachment"
            >
              <Plus className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem onClick={() => {
              const input = document.createElement("input");
              input.type = "file"; input.accept = "image/*"; input.multiple = true;
              input.onchange = () => {
                const files = Array.from(input.files || []);
                if (files.length) toast.success(`Photo attached`, { description: `${files.length} image(s) ready to send` });
              };
              input.click();
            }}>
              <ImageIcon className="w-4 h-4 me-2" /> Photo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const input = document.createElement("input");
              input.type = "file"; input.multiple = true;
              input.onchange = () => {
                const files = Array.from(input.files || []);
                if (files.length) toast.success(`Document attached`, { description: `${files.length} file(s) ready to send` });
              };
              input.click();
            }}>
              <Archive className="w-4 h-4 me-2" /> Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (!navigator.geolocation) { toast.error("Location not available"); return; }
              toast.promise(
                new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
                  pos => { toast.success("Location shared", { description: `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}` }); resolve(pos); },
                  err => { toast.error("Location denied"); reject(err); }
                )),
                { loading: "Getting location...", success: "Location shared", error: "Location denied" }
              );
            }}>
              <ScanLine className="w-4 h-4 me-2" /> Location
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: "pay" } }));
              toast.success("Opening Cirkle Pay", { description: "Send money from the Pay tab" });
            }}>
              <span className="me-2">💸</span> Send payment
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("circle:gif-picker"))}>
              <span className="me-2">🎞️</span> GIF & Sticker
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("circle:broadcast-channel"))}>
              <span className="me-2">📢</span> Broadcast channel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("circle:commit"))}>
              <span className="me-2">🤝</span> Create agreement
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              triggerSend();
            }
          }}
          className="flex-1 bg-transparent outline-none text-sm py-1.5"
          placeholder={isEditing ? "Edit your message…" : "Message"}
        />
        <button
          onClick={() => {
            // Simple emoji picker — inserts a random emoji from a curated set
            const emojis = ["😀","😂","🥰","😍","🤔","😎","🤗","🙏","👍","❤️","🔥","✨","🎉","💯","🤝","👋","😇","🥳","😊","😉","😋","😜","🤩","😴"];
            const random = emojis[Math.floor(Math.random() * emojis.length)];
            onChange(value + random);
          }}
          className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
          aria-label="Emoji"
        >
          <Smile className="w-4 h-4" />
        </button>
        {value.trim() || flying ? (
          <motion.button
            onClick={triggerSend}
            disabled={disabled}
            whileTap={{ scale: 0.85, rotate: -8 }}
            transition={{ duration: 0.12 }}
            className="w-9 h-9 rounded-full bg-gradient-hero text-cream flex items-center justify-center disabled:opacity-40"
            aria-label={isEditing ? "Save edit" : "Send"}
          >
            <motion.span
              animate={
                flying
                  ? { y: -160, opacity: 0, scale: 0.6 }
                  : { y: 0, opacity: 1, scale: 1 }
              }
              transition={
                flying
                  ? { duration: 0.38, ease: [0.16, 1, 0.3, 1] }
                  : { duration: 0 }
              }
              onAnimationComplete={() => {
                if (flying) setFlying(false);
              }}
              className="flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </motion.span>
          </motion.button>
        ) : (
          <button
            onClick={startRecording}
            className="w-9 h-9 rounded-full bg-gradient-gold text-charcoal flex items-center justify-center hover:scale-105 transition"
            aria-label="Record voice message"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MessageActionsSheet — long-press / right-click menu
// ============================================================================

interface MessageActionsSheetProps {
  message: WaslMessage | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isOwner: (m: WaslMessage) => boolean;
  canEdit: (m: WaslMessage) => boolean;
  onReact: (m: WaslMessage, emoji: string) => void;
  onReply: (m: WaslMessage) => void;
  onEdit: (m: WaslMessage) => void;
  onDelete: (m: WaslMessage) => void;
  onForward: (m: WaslMessage) => void;
  onStar: (m: WaslMessage) => void;
  onPin: (m: WaslMessage) => void;
  onCopy: (m: WaslMessage) => void;
}

function MessageActionsSheet({
  message,
  open,
  onOpenChange,
  isOwner,
  canEdit,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onStar,
  onPin,
  onCopy,
}: MessageActionsSheetProps) {
  if (!message) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-6">
        <SheetHeader className="px-4">
          <SheetTitle className="text-sm font-normal text-muted-foreground truncate">
            {message.body.slice(0, 100)}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Message actions
          </SheetDescription>
        </SheetHeader>

        {/* Quick reactions */}
        <div className="flex justify-around py-3 border-b border-border">
          {QUICK_REACTIONS.map((e) => (
            <button
              key={e}
              onClick={() => onReact(message, e)}
              className="w-12 h-12 rounded-full hover:bg-muted/60 flex items-center justify-center text-2xl transition active:scale-90"
              aria-label={`React ${e}`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="px-2 py-2 grid grid-cols-2 gap-1">
          <ActionItem icon={<Reply className="w-4 h-4" />} label="Reply" onClick={() => onReply(message)} />
          {isOwner(message) && canEdit(message) && (
            <ActionItem icon={<Edit3 className="w-4 h-4" />} label="Edit" onClick={() => onEdit(message)} />
          )}
          <ActionItem icon={<Forward className="w-4 h-4" />} label="Forward" onClick={() => onForward(message)} />
          <ActionItem
            icon={<Star className={`w-4 h-4 ${message.isStarred ? "fill-current text-secondary" : ""}`} />}
            label={message.isStarred ? "Unstar" : "Star"}
            onClick={() => onStar(message)}
          />
          <ActionItem
            icon={<Pin className={`w-4 h-4 ${message.isPinned ? "fill-current text-secondary" : ""}`} />}
            label={message.isPinned ? "Unpin" : "Pin"}
            onClick={() => onPin(message)}
          />
          <ActionItem icon={<Copy className="w-4 h-4" />} label="Copy" onClick={() => onCopy(message)} />
          {isOwner(message) && (
            <ActionItem
              icon={<Trash2 className="w-4 h-4 text-accent" />}
              label={<span className="text-accent">Delete</span>}
              onClick={() => onDelete(message)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// DeleteConfirmDialog — second-step scope picker (kept separate so the action
// sheet stays fully stateless — avoids setState-in-effect for sheet reset).
// ============================================================================

function DeleteConfirmDialog({
  message,
  onClose,
  onConfirm,
}: {
  message: WaslMessage | null;
  onClose: () => void;
  onConfirm: (m: WaslMessage, scope: "everyone" | "me") => void;
}) {
  return (
    <Dialog open={!!message} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-accent" />
            Delete message?
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Choose who should see the deletion.
          </DialogDescription>
        </DialogHeader>
        {message && (
          <div className="rounded-xl bg-muted/50 p-3 mb-2 text-xs text-muted-foreground line-clamp-2">
            {message.body}
          </div>
        )}
        <div className="space-y-1.5">
          <ActionItem
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete for everyone"
            onClick={() => message && onConfirm(message, "everyone")}
            full
          />
          <ActionItem
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete for me only"
            onClick={() => message && onConfirm(message, "me")}
            full
          />
          <button
            onClick={onClose}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2 mt-1"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionItem({
  icon,
  label,
  onClick,
  full,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition text-sm ${
        full ? "w-full" : ""
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// StarredMessagesSheet
// ============================================================================

function StarredMessagesSheet({
  open,
  onOpenChange,
  messages,
  onJump,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  messages: WaslMessage[];
  onJump: (m: WaslMessage) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl flex items-center gap-2">
            <Star className="w-5 h-5 text-secondary fill-current" />
            Starred messages
          </SheetTitle>
          <SheetDescription>
            {messages.length} starred message{messages.length === 1 ? "" : "s"}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-8 space-y-2 max-h-[70vh] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-12">
              No starred messages yet. Long-press a message to star it.
            </div>
          ) : (
            messages.map((m) => (
              <button
                key={m.id}
                onClick={() => onJump(m)}
                className="w-full text-start glass rounded-2xl p-3 hover:bg-muted/50 transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-primary-foreground ${
                      AVATAR_BG[m.senderColor] ?? "bg-primary"
                    }`}
                  >
                    {m.senderInitials}
                  </div>
                  <span className="text-xs font-medium">{m.senderName}</span>
                  <span className="text-[10px] text-muted-foreground ms-auto">
                    {formatTime(m.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{m.body}</p>
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// ConversationSettingsSheet — TTL, members, admin controls
// ============================================================================

interface ConversationDetail extends Conversation {
  members?: Array<{
    id: string;
    userId: string | null;
    displayName: string;
    avatarColor: string;
    initials: string;
    presence: string;
    joinedAt: string;
  }>;
}

function ConversationSettingsSheet({
  open,
  onOpenChange,
  conversation,
  ttlSeconds,
  onTtlChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversation: Conversation;
  ttlSeconds: number | null;
  onTtlChange: (s: number | null) => void;
}) {
  const { data, isLoading } = useQuery<ConversationDetail>({
    queryKey: ["conversations", conversation.id, "detail"],
    queryFn: async () => {
      const r = await fetch(`/api/conversations/${conversation.id}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("failed to load conversation");
      return r.json();
    },
    enabled: open,
  });

  const isGroup = conversation.type === "group" || conversation.type === "channel";
  const isAdmin = conversation.isCircle; // demo: Circle groups → admin

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground font-display ${
                AVATAR_BG[conversation.avatarColor] ?? "bg-primary"
              }`}
            >
              {conversation.type === "group" ? (
                <Users className="w-4 h-4" />
              ) : (
                conversation.avatarInitials
              )}
            </div>
            {conversation.name}
          </SheetTitle>
          <SheetDescription>
            {conversation.encrypted && "End-to-end encrypted · "}
            {conversation.participants}{" "}
            {conversation.participants === 1 ? "participant" : "participants"}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Disappearing messages */}
          <section className="space-y-2">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Timer className="w-3 h-3" /> Disappearing messages
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {TTL_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    onTtlChange(p.seconds);
                    toast.success(
                      p.seconds
                        ? `Disappearing messages: ${p.label}`
                        : "Disappearing messages off",
                    );
                  }}
                  className={`px-3 py-2 rounded-xl text-sm transition border ${
                    ttlSeconds === p.seconds
                      ? "bg-secondary text-charcoal border-secondary"
                      : "border-border hover:bg-muted/60"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              New messages will disappear after the selected duration. Existing
              messages are not affected.
            </p>
          </section>

          {/* Privacy */}
          <section className="space-y-2">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Privacy
            </h4>
            <PrivacyToggle
              icon={<Bell className="w-4 h-4" />}
              label="Mute notifications"
              defaultOn={!!conversation.muted}
            />
            <PrivacyToggle
              icon={<ScanLine className="w-4 h-4" />}
              label="Block screenshots"
              defaultOn={true}
            />
            <PrivacyToggle
              icon={<Forward className="w-4 h-4" />}
              label="Require screenshot consent"
              defaultOn={true}
            />
            <PrivacyToggle
              icon={<Forward className="w-4 h-4" />}
              label="Allow forwarding"
              defaultOn={true}
            />
          </section>

          {/* Members (groups only) */}
          {isGroup && (
            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Members
                {isAdmin && (
                  <span className="ms-auto text-[10px] flex items-center gap-1 text-secondary">
                    <Crown className="w-3 h-3" /> Admin
                  </span>
                )}
              </h4>
              {isLoading ? (
                <div className="text-xs text-muted-foreground py-2">Loading members…</div>
              ) : (
                <ul className="space-y-1">
                  {(data?.members ?? []).map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/40"
                    >
                      <div className="relative shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-primary-foreground ${
                            AVATAR_BG[m.avatarColor] ?? "bg-primary"
                          }`}
                        >
                          {m.initials}
                        </div>
                        {m.presence === "online" && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-secondary border border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">
                          {m.displayName}
                          {m.userId === getMe().id && (
                            <span className="ms-1.5 text-[10px] text-muted-foreground">(you)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {m.presence === "online"
                            ? "online"
                            : m.presence === "away"
                              ? "away"
                              : "offline"}
                        </div>
                      </div>
                      {isAdmin && m.userId !== getMe().id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="text-muted-foreground hover:text-foreground p-1"
                              aria-label="Member actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => toast.success(`${m.displayName} muted`)}
                            >
                              <MicOff className="w-4 h-4 me-2" /> Mute
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toast.success(`${m.displayName} promoted`)}
                            >
                              <Crown className="w-4 h-4 me-2" /> Make admin
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-accent"
                              onClick={() => toast.success(`${m.displayName} removed`)}
                            >
                              <Ban className="w-4 h-4 me-2" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {isAdmin && (
                <>
                  <PrivacyToggle
                    icon={<MicOff className="w-4 h-4" />}
                    label="Only admins can post"
                    defaultOn={false}
                  />
                  <PrivacyToggle
                    icon={<Edit3 className="w-4 h-4" />}
                    label="Only admins can edit info"
                    defaultOn={false}
                  />
                </>
              )}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PrivacyToggle({
  icon,
  label,
  defaultOn,
}: {
  icon: React.ReactNode;
  label: string;
  defaultOn: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm flex-1">{label}</span>
      <Switch checked={on} onCheckedChange={(v) => {
        setOn(v);
        toast.success(`${label}: ${v ? "on" : "off"}`);
      }} />
    </div>
  );
}

// ============================================================================
// ForwardDialog — conversation picker
// ============================================================================

function ForwardDialog({
  message,
  onClose,
  onForward,
}: {
  message: WaslMessage | null;
  onClose: () => void;
  onForward: (targetId: string) => void;
}) {
  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const r = await fetch("/api/conversations", { cache: "no-store" });
      if (!r.ok) throw new Error("failed to load conversations");
      return r.json();
    },
  });

  return (
    <Dialog open={!!message} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Forward className="w-5 h-5 text-secondary" />
            Forward message
          </DialogTitle>
          <DialogDescription>
            Choose a conversation to forward this message to.
          </DialogDescription>
        </DialogHeader>

        {message && (
          <div className="rounded-xl bg-muted/50 p-3 mb-2 text-xs text-muted-foreground line-clamp-2">
            {message.body}
          </div>
        )}

        <ul className="max-h-80 overflow-y-auto space-y-1">
          {(conversations ?? []).map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onForward(c.id)}
                className="w-full text-start px-2 py-2 rounded-lg hover:bg-muted/60 transition flex items-center gap-2.5"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-display text-sm text-primary-foreground ${
                    AVATAR_BG[c.avatarColor] ?? "bg-primary"
                  }`}
                >
                  {c.type === "group" ? <Users className="w-4 h-4" /> : c.avatarInitials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {c.lastMessage ?? "No messages yet"}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 ms-auto text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

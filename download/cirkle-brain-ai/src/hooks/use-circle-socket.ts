"use client";

/**
 * Circle (دواير) — Wasl (Chat) socket.io hook.
 *
 * Connects to the chat mini-service (port 3003) through the Caddy gateway.
 * Per gateway rules we MUST NOT use an absolute URL with a port — instead we
 * connect to "/" and pass `XTransformPort=3003` as a query param so Caddy
 * forwards the request to the chat mini-service.
 *
 * Exposes a small, ergonomic API on top of the raw socket:
 *   - `socket`           raw socket.io-client instance (for `.on(...)` listeners)
 *   - `isConnected`      boolean connection state
 *   - `joinConversation(id)`
 *   - `leaveConversation(id)`
 *   - `sendMessage({ conversationId, body, replyToId? })`
 *   - `setTyping(conversationId, isTyping)`
 *   - `markRead(messageId, conversationId)`
 *   - `toggleReaction(messageId, emoji)`
 *
 * The current user's identity (id, name, initials, color) is supplied via
 * `options.user` so the hook can populate the `*Id` / `*Name` / `senderInitials`
 * / `senderColor` fields required by the server events.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessage, ID, MessageStatus } from "@/lib/circle/types";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface CircleSocketUser {
  id: ID;
  name: string;
  senderInitials: string;
  senderColor: string;
}

export interface ReceivedMessagePayload {
  id: ID;
  conversationId: ID;
  senderId: ID;
  senderName: string;
  senderInitials: string;
  senderColor: string;
  body: string;
  timestamp: string;
  status: Extract<MessageStatus, "delivered" | "read">;
  encrypted: true;
  replyTo?: { id: ID; senderName: string; body: string } | null;
}

export interface PresenceUpdatePayload {
  conversationId: ID;
  userId: ID;
  presence: "online" | "away" | "offline" | "ghost";
}

export interface TypingUpdatePayload {
  conversationId: ID;
  userId: ID;
  senderName: string;
  isTyping: boolean;
}

export interface MessageStatusPayload {
  messageId: ID;
  conversationId: ID;
  status: "delivered" | "read";
}

export interface ReactionUpdatePayload {
  messageId: ID;
  conversationId: ID;
  emoji: string;
  count: number;
}

export interface SendMessageInput {
  conversationId: ID;
  body: string;
  /** Persisted message id from the REST POST. If provided, the broadcast
   * uses this id so all clients share the same id (otherwise the server
   * generates one). */
  id?: ID;
  replyToId?: ID;
  attachment?: {
    kind: "image" | "audio" | "file" | "location" | "payment";
    name: string;
    url?: string;
    mime?: string;
    size?: number;
    meta?: string;
  } | null;
  forwardedFrom?: { senderName: string; body: string } | null;
  ttlSeconds?: number | null;
  expiresAt?: string | null;
}

export interface EditMessageInput {
  conversationId: ID;
  messageId: ID;
  body: string;
}

export interface DeleteMessageInput {
  conversationId: ID;
  messageId: ID;
  scope: "everyone" | "me";
}

export interface PinMessageInput {
  conversationId: ID;
  messageId: ID;
  isPinned: boolean;
  pinnedBy: string;
}

export interface StarMessageInput {
  conversationId: ID;
  messageId: ID;
  isStarred: boolean;
}

export interface ToggleReactionInput {
  conversationId: ID;
  messageId: ID;
  emoji: string;
  displayName: string;
  count: number;
}

export interface UseCircleSocketOptions {
  /** Current user identity. Required for join/leave/send/typing events. */
  user?: CircleSocketUser;
  /** Disable the auto-connect on mount (e.g. until the user is logged in). */
  enabled?: boolean;
}

export interface UseCircleSocketResult {
  socket: Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: ID) => void;
  leaveConversation: (conversationId: ID) => void;
  sendMessage: (input: SendMessageInput) => void;
  setTyping: (conversationId: ID, isTyping: boolean) => void;
  markRead: (messageId: ID, conversationId: ID) => void;
  toggleReaction: (input: ToggleReactionInput) => void;
  editMessage: (input: EditMessageInput) => void;
  deleteMessage: (input: DeleteMessageInput) => void;
  pinMessage: (input: PinMessageInput) => void;
  starMessage: (input: StarMessageInput) => void;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

const CHAT_PORT = 3003;

export function useCircleSocket(
  options: UseCircleSocketOptions = {},
): UseCircleSocketResult {
  const { user, enabled = true } = options;

  // Keep the latest user in a ref so the socket callbacks always see the
  // current identity without re-creating the socket on every render.
  const userRef = useRef<CircleSocketUser | undefined>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // `socketRef` is used inside the stable `useCallback` action wrappers so
  // they don't need to be recreated when the socket instance changes.
  // `socketState` mirrors the instance so the returned `socket` value is
  // reactive (consumers re-render when the socket becomes available).
  const socketRef = useRef<Socket | null>(null);
  const [socketState, setSocketState] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // Per Caddy gateway rules: connect to "/" with XTransformPort in the
    // query string. NEVER use an absolute URL with a port.
    const instance = io("/", {
      query: { XTransformPort: CHAT_PORT },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    socketRef.current = instance;

    const onConnect = () => {
      // `setSocketState` is called from the async connect handler (not the
      // effect body) so the returned `socket` becomes available to consumers
      // right when it is actually usable.
      setSocketState(instance);
      setIsConnected(true);
      // console.log("[circle-socket] connected", instance.id);
    };
    const onDisconnect = (reason: string) => {
      setIsConnected(false);
      // console.log("[circle-socket] disconnected:", reason);
    };
    const onConnectError = (err: Error) => {
      console.warn("[circle-socket] connect_error:", err.message);
    };

    instance.on("connect", onConnect);
    instance.on("disconnect", onDisconnect);
    instance.on("connect_error", onConnectError);

    return () => {
      instance.off("connect", onConnect);
      instance.off("disconnect", onDisconnect);
      instance.off("connect_error", onConnectError);
      instance.disconnect();
      socketRef.current = null;
      setSocketState(null);
      setIsConnected(false);
    };
  }, [enabled]);

  // ---------------------------------------------------------------------------
  // Action wrappers
  // ---------------------------------------------------------------------------

  const joinConversation = useCallback((conversationId: ID) => {
    const u = userRef.current;
    const socket = socketRef.current;
    if (!socket || !u) return;
    socket.emit("conversation:join", {
      conversationId,
      userId: u.id,
      senderName: u.name,
    });
  }, []);

  const leaveConversation = useCallback((conversationId: ID) => {
    const u = userRef.current;
    const socket = socketRef.current;
    if (!socket || !u) return;
    socket.emit("conversation:leave", {
      conversationId,
      userId: u.id,
    });
  }, []);

  const sendMessage = useCallback((input: SendMessageInput) => {
    const u = userRef.current;
    const socket = socketRef.current;
    if (!socket || !u) return;
    const {
      conversationId,
      body,
      id,
      replyToId,
      attachment,
      forwardedFrom,
      ttlSeconds,
      expiresAt,
    } = input;
    socket.emit("message:send", {
      id,
      conversationId,
      senderId: u.id,
      senderName: u.name,
      senderInitials: u.senderInitials,
      senderColor: u.senderColor,
      body,
      replyToId,
      attachment,
      forwardedFrom,
      ttlSeconds,
      expiresAt,
    });
  }, []);

  const setTyping = useCallback((conversationId: ID, isTyping: boolean) => {
    const u = userRef.current;
    const socket = socketRef.current;
    if (!socket || !u) return;
    socket.emit(isTyping ? "typing:start" : "typing:stop", {
      conversationId,
      userId: u.id,
      senderName: u.name,
    });
  }, []);

  const markRead = useCallback((messageId: ID, conversationId: ID) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("message:read", { messageId, conversationId });
  }, []);

  const toggleReaction = useCallback((input: ToggleReactionInput) => {
    const u = userRef.current;
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("reaction:toggle", {
      messageId: input.messageId,
      conversationId: input.conversationId,
      emoji: input.emoji,
      count: input.count,
      displayName: input.displayName,
      userId: u?.id,
    });
  }, []);

  const editMessage = useCallback((input: EditMessageInput) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("message:edit", {
      messageId: input.messageId,
      conversationId: input.conversationId,
      body: input.body,
      editedAt: new Date().toISOString(),
    });
  }, []);

  const deleteMessage = useCallback((input: DeleteMessageInput) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("message:delete", {
      messageId: input.messageId,
      conversationId: input.conversationId,
      scope: input.scope,
      deletedAt: new Date().toISOString(),
    });
  }, []);

  const pinMessage = useCallback((input: PinMessageInput) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("message:pin", {
      messageId: input.messageId,
      conversationId: input.conversationId,
      isPinned: input.isPinned,
      pinnedBy: input.pinnedBy,
    });
  }, []);

  const starMessage = useCallback((input: StarMessageInput) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("message:star", {
      messageId: input.messageId,
      conversationId: input.conversationId,
      isStarred: input.isStarred,
    });
  }, []);

  return useMemo<UseCircleSocketResult>(
    () => ({
      socket: socketState,
      isConnected,
      joinConversation,
      leaveConversation,
      sendMessage,
      setTyping,
      markRead,
      toggleReaction,
      editMessage,
      deleteMessage,
      pinMessage,
      starMessage,
    }),
    [
      socketState,
      isConnected,
      joinConversation,
      leaveConversation,
      sendMessage,
      setTyping,
      markRead,
      toggleReaction,
      editMessage,
      deleteMessage,
      pinMessage,
      starMessage,
    ],
  );
}

// -----------------------------------------------------------------------------
// Convenience: a typed alias for the persisted message shape (used by the REST
// API for chat history). Re-exported here so consumers can import everything
// chat-related from one place.
// -----------------------------------------------------------------------------

export type { ChatMessage };

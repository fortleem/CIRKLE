/**
 * Circle (دواير) — Wasl (Chat) WebSocket mini-service.
 *
 * Runs on port 3003 (hardcoded). Uses socket.io. The Caddy gateway in front of
 * the Next.js app forwards requests that carry `?XTransformPort=3003` to this
 * service, so the socket.io `path` MUST be `/` (the example pattern).
 *
 * Events implemented (see worklog Task 3):
 *   Server → Client: message:received, presence:update, typing:update,
 *                    message:status, reaction:update, connect, disconnect
 *   Client → Server: conversation:join, conversation:leave, message:send,
 *                    typing:start, typing:stop, message:read, reaction:toggle
 *
 * Messages are kept in memory only — the Next.js REST API is the source of
 * truth for persisted chat history.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { Server, type Socket } from "socket.io";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Presence = "online" | "away" | "offline" | "ghost";
type MessageStatus = "delivered" | "read";

interface CircleSocket extends Socket {
  circleUserId?: string;
  circleUserName?: string;
  circleConversations?: Set<string>;
}

interface JoinPayload {
  conversationId: string;
  userId: string;
  senderName: string;
}

interface LeavePayload {
  conversationId: string;
  userId: string;
}

interface AttachmentPayload {
  kind: "image" | "audio" | "file" | "location" | "payment";
  name: string;
  url?: string | null;
  mime?: string | null;
  size?: number | null;
  meta?: string | null;
}

interface MessageSendPayload {
  id?: string; // persisted id from REST (preferred so all clients share the same id)
  conversationId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderColor: string;
  body: string;
  replyToId?: string;
  attachment?: AttachmentPayload | null;
  forwardedFrom?: { senderName: string; body: string } | null;
  ttlSeconds?: number | null;
  expiresAt?: string | null;
}

interface MessageEditPayload {
  messageId: string;
  conversationId: string;
  body: string;
  editedAt: string;
}

interface MessageDeletePayload {
  messageId: string;
  conversationId: string;
  scope: "everyone" | "me";
  deletedAt: string;
}

interface MessagePinPayload {
  messageId: string;
  conversationId: string;
  isPinned: boolean;
  pinnedBy: string;
}

interface MessageStarPayload {
  messageId: string;
  conversationId: string;
  isStarred: boolean;
}

interface MessageReactionPayload {
  messageId: string;
  conversationId: string;
  emoji: string;
  userId?: string;
  displayName: string;
  count: number;
}

interface TypingPayload {
  conversationId: string;
  userId: string;
  senderName: string;
}

interface ReadPayload {
  messageId: string;
  conversationId: string;
}

interface ReceivedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderColor: string;
  body: string;
  timestamp: string;
  status: MessageStatus;
  encrypted: true;
  replyTo?: { id: string; senderName: string; body: string } | null;
  attachment?: AttachmentPayload | null;
  forwardedFrom?: { senderName: string; body: string } | null;
  ttlSeconds?: number | null;
  expiresAt?: string | null;
}

interface PresenceUpdate {
  conversationId: string;
  userId: string;
  presence: Presence;
}

interface TypingUpdate {
  conversationId: string;
  userId: string;
  senderName: string;
  isTyping: boolean;
}

interface MessageStatusUpdate {
  messageId: string;
  conversationId: string;
  status: MessageStatus;
}

interface ReactionUpdate {
  messageId: string;
  conversationId: string;
  emoji: string;
  count: number;
  displayName: string;
}

interface MessageEditedUpdate {
  messageId: string;
  conversationId: string;
  body: string;
  editedAt: string;
}

interface MessageDeletedUpdate {
  messageId: string;
  conversationId: string;
  scope: "everyone" | "me";
  deletedAt: string;
}

interface MessagePinnedUpdate {
  messageId: string;
  conversationId: string;
  isPinned: boolean;
  pinnedBy: string;
}

interface MessageStarredUpdate {
  messageId: string;
  conversationId: string;
  isStarred: boolean;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const roomName = (conversationId: string) => `conv:${conversationId}`;

/**
 * Minimal in-memory store of the last reply body for a given message id, so
 * `message:send` with `replyToId` can attach a `{ id, senderName, body }`
 * reply snapshot to the broadcast (the spec only sends `replyToId`).
 */
const replySnapshots = new Map<
  string,
  { id: string; senderName: string; body: string }
>();

// -----------------------------------------------------------------------------
// HTTP + Socket.io bootstrap
// -----------------------------------------------------------------------------

const httpServer = createServer(
  (req: IncomingMessage, res: ServerResponse) => {
    // Tiny health-check endpoint so `curl http://127.0.0.1:3003/` returns 200.
    if (req.url === "/" || req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          service: "circle-chat-service",
          status: "ok",
          uptime: process.uptime(),
        }),
      );
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  },
);

const io = new Server<CircleSocket, CircleSocket>(httpServer, {
  // DO NOT change the path — Caddy uses it to forward `?XTransformPort=3003`.
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// -----------------------------------------------------------------------------
// Connection lifecycle
// -----------------------------------------------------------------------------

io.on("connection", (socket: CircleSocket) => {
  socket.circleConversations = new Set();
  console.log(`[chat] connected socket=${socket.id}`);

  // -------------------------------------------------------------------------
  // conversation:join
  // -------------------------------------------------------------------------
  socket.on("conversation:join", (payload: JoinPayload) => {
    if (!payload?.conversationId || !payload?.userId) return;
    const { conversationId, userId, senderName } = payload;

    const room = roomName(conversationId);
    socket.join(room);
    socket.circleUserId = userId;
    socket.circleUserName = senderName ?? socket.circleUserName;
    socket.circleConversations?.add(conversationId);

    const update: PresenceUpdate = {
      conversationId,
      userId,
      presence: "online",
    };
    // Broadcast to everyone in the room (including the newcomer) so they see
    // the presence list refresh.
    io.to(room).emit("presence:update", update);
    console.log(
      `[chat] join socket=${socket.id} user=${userId} room=${room} name=${senderName ?? "?"}`,
    );
  });

  // -------------------------------------------------------------------------
  // conversation:leave
  // -------------------------------------------------------------------------
  socket.on("conversation:leave", (payload: LeavePayload) => {
    if (!payload?.conversationId || !payload?.userId) return;
    const { conversationId, userId } = payload;
    const room = roomName(conversationId);

    const update: PresenceUpdate = {
      conversationId,
      userId,
      presence: "offline",
    };
    io.to(room).emit("presence:update", update);

    socket.leave(room);
    socket.circleConversations?.delete(conversationId);
    console.log(`[chat] leave socket=${socket.id} user=${userId} room=${room}`);
  });

  // -------------------------------------------------------------------------
  // message:send
  // -------------------------------------------------------------------------
  socket.on("message:send", (payload: MessageSendPayload) => {
    if (!payload?.conversationId || !payload?.senderId || !payload?.body) {
      return;
    }
    const {
      id,
      conversationId,
      senderId,
      senderName,
      senderInitials,
      senderColor,
      body,
      replyToId,
      attachment,
      forwardedFrom,
      ttlSeconds,
      expiresAt,
    } = payload;

    const messageId = id ?? crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const room = roomName(conversationId);

    const replyTo = replyToId
      ? (replySnapshots.get(replyToId) ?? null)
      : null;

    const message: ReceivedMessage = {
      id: messageId,
      conversationId,
      senderId,
      senderName,
      senderInitials,
      senderColor,
      body,
      timestamp,
      status: "delivered",
      encrypted: true,
      replyTo,
      attachment: attachment ?? null,
      forwardedFrom: forwardedFrom ?? null,
      ttlSeconds: ttlSeconds ?? null,
      expiresAt: expiresAt ?? null,
    };

    // Cache the reply snapshot so future replies can reference this message.
    replySnapshots.set(messageId, {
      id: messageId,
      senderName,
      body,
    });
    // Bounded cleanup — keep at most the last 500 snapshots.
    if (replySnapshots.size > 500) {
      const firstKey = replySnapshots.keys().next().value;
      if (firstKey) replySnapshots.delete(firstKey);
    }

    // Broadcast to everyone in the room (including sender for confirmation).
    io.to(room).emit("message:received", message);
    console.log(
      `[chat] message socket=${socket.id} conv=${conversationId} msg=${messageId} from=${senderName}`,
    );
  });

  // -------------------------------------------------------------------------
  // message:edit
  // -------------------------------------------------------------------------
  socket.on("message:edit", (payload: MessageEditPayload) => {
    if (!payload?.messageId || !payload?.conversationId || !payload?.body) {
      return;
    }
    const room = roomName(payload.conversationId);
    const update: MessageEditedUpdate = {
      messageId: payload.messageId,
      conversationId: payload.conversationId,
      body: payload.body,
      editedAt: payload.editedAt,
    };
    // Update the reply snapshot so future replies quote the edited body.
    const existing = replySnapshots.get(payload.messageId);
    if (existing) {
      replySnapshots.set(payload.messageId, { ...existing, body: payload.body });
    }
    io.to(room).emit("message:edited", update);
    console.log(
      `[chat] edit socket=${socket.id} msg=${payload.messageId}`,
    );
  });

  // -------------------------------------------------------------------------
  // message:delete
  // -------------------------------------------------------------------------
  socket.on("message:delete", (payload: MessageDeletePayload) => {
    if (!payload?.messageId || !payload?.conversationId) return;
    const room = roomName(payload.conversationId);
    const update: MessageDeletedUpdate = {
      messageId: payload.messageId,
      conversationId: payload.conversationId,
      scope: payload.scope,
      deletedAt: payload.deletedAt,
    };
    io.to(room).emit("message:deleted", update);
    console.log(
      `[chat] delete socket=${socket.id} msg=${payload.messageId} scope=${payload.scope}`,
    );
  });

  // -------------------------------------------------------------------------
  // message:pin
  // -------------------------------------------------------------------------
  socket.on("message:pin", (payload: MessagePinPayload) => {
    if (!payload?.messageId || !payload?.conversationId) return;
    const room = roomName(payload.conversationId);
    const update: MessagePinnedUpdate = {
      messageId: payload.messageId,
      conversationId: payload.conversationId,
      isPinned: payload.isPinned,
      pinnedBy: payload.pinnedBy,
    };
    io.to(room).emit("message:pinned", update);
    console.log(
      `[chat] pin socket=${socket.id} msg=${payload.messageId} pinned=${payload.isPinned}`,
    );
  });

  // -------------------------------------------------------------------------
  // message:star
  // -------------------------------------------------------------------------
  socket.on("message:star", (payload: MessageStarPayload) => {
    if (!payload?.messageId || !payload?.conversationId) return;
    const room = roomName(payload.conversationId);
    const update: MessageStarredUpdate = {
      messageId: payload.messageId,
      conversationId: payload.conversationId,
      isStarred: payload.isStarred,
    };
    // Broadcast to the user's other devices too — io.to(room) covers everyone
    // in the conversation, which is correct for per-user starring UX.
    io.to(room).emit("message:starred", update);
    console.log(
      `[chat] star socket=${socket.id} msg=${payload.messageId} starred=${payload.isStarred}`,
    );
  });

  // -------------------------------------------------------------------------
  // typing:start / typing:stop
  // -------------------------------------------------------------------------
  const emitTyping = (payload: TypingPayload, isTyping: boolean) => {
    if (!payload?.conversationId || !payload?.userId) return;
    const room = roomName(payload.conversationId);
    const update: TypingUpdate = {
      conversationId: payload.conversationId,
      userId: payload.userId,
      senderName: payload.senderName,
      isTyping,
    };
    // Broadcast to OTHERS in the room (sender already knows they're typing).
    socket.to(room).emit("typing:update", update);
  };

  socket.on("typing:start", (payload: TypingPayload) =>
    emitTyping(payload, true),
  );
  socket.on("typing:stop", (payload: TypingPayload) =>
    emitTyping(payload, false),
  );

  // -------------------------------------------------------------------------
  // message:read
  // -------------------------------------------------------------------------
  socket.on("message:read", (payload: ReadPayload) => {
    if (!payload?.messageId || !payload?.conversationId) return;
    const room = roomName(payload.conversationId);
    const update: MessageStatusUpdate = {
      messageId: payload.messageId,
      conversationId: payload.conversationId,
      status: "read",
    };
    // Broadcast to others so their UI ticks turn blue.
    socket.to(room).emit("message:status", update);
    console.log(
      `[chat] read socket=${socket.id} msg=${payload.messageId} conv=${payload.conversationId}`,
    );
  });

  // -------------------------------------------------------------------------
  // reaction:toggle
  // -------------------------------------------------------------------------
  socket.on("reaction:toggle", (payload: MessageReactionPayload) => {
    if (!payload?.messageId || !payload?.conversationId || !payload?.emoji) {
      return;
    }
    const room = roomName(payload.conversationId);
    const update: ReactionUpdate = {
      messageId: payload.messageId,
      conversationId: payload.conversationId,
      emoji: payload.emoji,
      count: payload.count,
      displayName: payload.displayName,
    };
    io.to(room).emit("reaction:update", update);
    console.log(
      `[chat] reaction socket=${socket.id} msg=${payload.messageId} emoji=${payload.emoji} count=${payload.count}`,
    );
  });

  // -------------------------------------------------------------------------
  // disconnect
  // -------------------------------------------------------------------------
  socket.on("disconnect", (reason: string) => {
    const userId = socket.circleUserId;
    const conversations = socket.circleConversations ?? new Set<string>();
    if (userId) {
      for (const conversationId of conversations) {
        const update: PresenceUpdate = {
          conversationId,
          userId,
          presence: "offline",
        };
        socket.to(roomName(conversationId)).emit("presence:update", update);
      }
    }
    console.log(
      `[chat] disconnected socket=${socket.id} reason=${reason} user=${userId ?? "?"}`,
    );
  });

  socket.on("error", (err: unknown) => {
    console.error(`[chat] socket error socket=${socket.id}`, err);
  });
});

// -----------------------------------------------------------------------------
// Bootstrap
// -----------------------------------------------------------------------------

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[chat] Circle Wasl socket.io service listening on :${PORT}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`[chat] received ${signal}, shutting down...`);
  io.close(() => {
    httpServer.close(() => {
      console.log("[chat] server closed");
      process.exit(0);
    });
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

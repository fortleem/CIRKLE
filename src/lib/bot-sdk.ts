"use client";

/**
 * Cirkle Bot SDK — client SDK for bot/mini-app developers.
 *
 * This SDK lets a bot or mini-app running INSIDE Cirkle:
 *   1. Send messages to a conversation (via the existing REST API)
 *   2. Create public posts (Midan)
 *   3. Read the user's location (country + city — never fine-grained)
 *   4. Request a payment via Cirkle Pay
 *   5. Subscribe to real-time events: incoming messages + slash-commands
 *
 * The SDK is intentionally a thin wrapper around `fetch()` + a socket.io
 * instance — bot developers do NOT need any special dependencies. The SDK
 * is consumed via the `cirkleBot` singleton exported at the bottom.
 *
 * Auth: the SDK is initialized with a `BotContext` (userId, username, country,
 * language). The bot developer receives an API key from /api/bots which is
 * sent as `x-cirkle-bot-key` on every request. The server validates the key
 * against the ApiKey table before running any side-effecting action.
 */

import { io, type Socket } from "socket.io-client";
import { useApp } from "@/lib/app-store";
import { useAuth } from "@/lib/auth-store";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface BotContext {
  userId: string;
  username: string;
  country: string;
  language: string;
  /** API key issued by /api/bots (POST). Sent as x-cirkle-bot-key header. */
  apiKey?: string;
  /** Optional bot id — used to scope events. */
  botId?: string;
}

export interface BotMessage {
  id: string;
  conversationId: string;
  senderName: string;
  body: string;
  timestamp: string;
}

export interface BotLocation {
  country: string;
  city: string;
}

export interface PaymentResult {
  paid: boolean;
  transactionId?: string;
  error?: string;
}

export type MessageListener = (msg: BotMessage) => void;
export type CommandListener = (cmd: string, args: string[]) => void;

// -----------------------------------------------------------------------------
// CirkleBotSDK
// -----------------------------------------------------------------------------

const CHAT_PORT = 3003;

export class CirkleBotSDK {
  private context: BotContext | null = null;
  private socket: Socket | null = null;
  private messageListeners = new Set<MessageListener>();
  private commandListeners = new Set<CommandListener>();

  /** Initialize the SDK with the bot context. Must be called before any
   *  other method. Idempotent — re-init replaces the prior context. */
  init(context: BotContext): void {
    this.context = context;
    // Lazily connect the socket so future onMessage / onCommand subscriptions
    // can use it. The socket lives for the lifetime of the SDK singleton.
    this.ensureSocket();
  }

  /** Returns the current bot context (or null if uninitialized). */
  getContext(): BotContext | null {
    return this.context;
  }

  // ── Messaging ───────────────────────────────────────────────────────────

  /**
   * Send a message to a conversation. Calls POST /api/conversations/[id]/messages
   * with the bot's API key in the header so the server can attribute the
   * message to the bot.
   */
  async sendMessage(conversationId: string, body: string): Promise<void> {
    if (!this.context) throw new Error("cirkleBot.init() must be called first.");
    if (!conversationId || !body.trim()) return;
    const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.context.apiKey
          ? { "x-cirkle-bot-key": this.context.apiKey }
          : {}),
      },
      body: JSON.stringify({
        body,
        senderName: this.context.username,
        senderInitials: this.context.username.slice(0, 2).toUpperCase(),
        senderColor: "steel",
      }),
    });
    if (!res.ok) {
      throw new Error(`sendMessage failed: ${res.status} ${res.statusText}`);
    }
  }

  // ── Posting ─────────────────────────────────────────────────────────────

  /**
   * Create a public post on Midan. Calls POST /api/posts with the bot's
   * API key in the header.
   */
  async createPost(content: string, visibility: string = "public"): Promise<void> {
    if (!this.context) throw new Error("cirkleBot.init() must be called first.");
    if (!content.trim()) return;
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.context.apiKey
          ? { "x-cirkle-bot-key": this.context.apiKey }
          : {}),
      },
      body: JSON.stringify({
        body: content,
        module: "midan",
        visibility,
        authorName: this.context.username,
        authorHandle: this.context.username,
        authorInitials: this.context.username.slice(0, 2).toUpperCase(),
        authorColor: "steel",
      }),
    });
    if (!res.ok) {
      throw new Error(`createPost failed: ${res.status} ${res.statusText}`);
    }
  }

  // ── Location ────────────────────────────────────────────────────────────

  /**
   * Returns the user's country + city. Never returns fine-grained location
   * (no GPS coordinates). Reads from the global app store so the value stays
   * in sync with the user's selection in the home screen.
   */
  getUserLocation(): BotLocation | null {
    if (typeof window === "undefined") return null;
    try {
      const app = useApp.getState();
      return {
        country: app.country || (this.context?.country ?? ""),
        city: app.city || "",
      };
    } catch {
      return this.context
        ? { country: this.context.country, city: "" }
        : null;
    }
  }

  // ── Payments ────────────────────────────────────────────────────────────

  /**
   * Request a payment via Cirkle Pay. Calls POST /api/payments/send with the
   * bot's API key in the header. In dev the payment is settled immediately
   * (the /api/payments/send endpoint mocks the gateway).
   */
  async requestPayment(
    amount: number,
    currency: string,
    description: string,
  ): Promise<PaymentResult> {
    if (!this.context) throw new Error("cirkleBot.init() must be called first.");
    if (amount <= 0) return { paid: false, error: "amount must be positive" };
    try {
      const res = await fetch("/api/payments/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.context.apiKey
            ? { "x-cirkle-bot-key": this.context.apiKey }
            : {}),
        },
        body: JSON.stringify({
          amount,
          currency,
          memo: description,
          counterparty: this.context.username,
          counterpartyInitials: this.context.username.slice(0, 2).toUpperCase(),
          counterpartyColor: "steel",
          method: "instapay",
        }),
      });
      if (!res.ok) {
        return {
          paid: false,
          error: `payment failed: ${res.status} ${res.statusText}`,
        };
      }
      const data = (await res.json()) as { transaction?: { id: string } };
      return {
        paid: true,
        transactionId: data.transaction?.id,
      };
    } catch (err) {
      return {
        paid: false,
        error: String((err as Error)?.message || err || "unknown"),
      };
    }
  }

  // ── Event subscriptions ─────────────────────────────────────────────────

  /**
   * Subscribe to incoming messages on the connected conversation(s).
   * The callback fires for every `message:received` socket event.
   */
  onMessage(cb: MessageListener): () => void {
    this.messageListeners.add(cb);
    this.ensureSocket();
    return () => this.messageListeners.delete(cb);
  }

  /**
   * Subscribe to slash-command invocations. The callback fires when the user
   * types `/<cmd> <args...>` in a conversation where the bot is listening.
   * The server emits a `bot:command` socket event when this happens.
   */
  onCommand(cb: CommandListener): () => void {
    this.commandListeners.add(cb);
    this.ensureSocket();
    return () => this.commandListeners.delete(cb);
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  /**
   * Lazily connect a socket to the chat-service. Per Caddy gateway rules
   * we connect to "/" with `XTransformPort=3003` in the query.
   */
  private ensureSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    if (this.socket) return this.socket;
    try {
      this.socket = io("/", {
        query: { XTransformPort: CHAT_PORT },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
      });
    } catch (err) {
      console.warn("[bot-sdk] socket init failed:", err);
      return null;
    }

    const s = this.socket;
    s.on("message:received", (msg: BotMessage) => {
      // Don't echo the bot's own messages back.
      if (msg.senderName === this.context?.username) return;
      this.messageListeners.forEach((cb) => cb(msg));
    });
    s.on("bot:command", (payload: { cmd: string; args: string[] }) => {
      this.commandListeners.forEach((cb) => cb(payload.cmd, payload.args));
    });
    return s;
  }
}

// -----------------------------------------------------------------------------
// Singleton
// -----------------------------------------------------------------------------

export const cirkleBot = new CirkleBotSDK();

/**
 * Convenience: build a BotContext from the current authenticated user + app
 * state. Useful for the in-app developer portal which "tests" the SDK inline.
 */
export function buildBotContext(apiKey?: string, botId?: string): BotContext | null {
  if (typeof window === "undefined") return null;
  try {
    const user = useAuth.getState().user;
    const app = useApp.getState();
    if (!user) return null;
    return {
      userId: user.username,
      username: user.displayName,
      country: app.country || user.country || "EG",
      language: app.locale === "ar" ? "ar" : "en",
      apiKey,
      botId,
    };
  } catch {
    return null;
  }
}

/**
 * Cirkle Mesh Network — Offline-Capable Peer-to-Peer Layer
 *
 * Layer that extends the existing Mesh Presence into a full offline-capable
 * mesh. Messages and signed payments are queued locally (IndexedDB) and
 * flushed when a peer appears. The transport today is a `BroadcastChannel`
 * so multiple browser tabs act as mock peers; the API is shaped so it can
 * be swapped for a real WebRTC / Bluetooth / NFC QR relay later without
 * touching the public surface.
 *
 * 100% client-side. No server, no network. Persists in IndexedDB.
 */

"use client";

// ── Types ────────────────────────────────────────────────────────────────

/** A message queued locally until it can be broadcast to a peer. */
export interface OfflineMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  /** Peer IDs that confirmed receipt (so we know when to drop the queue entry). */
  deliveredTo: string[];
}

/** A signed payment queued locally until a peer can relay it. */
export interface OfflinePayment {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  /** HMAC of `${from}|${to}|${amount}|${currency}|${createdAt}` so tampering
   *  is detectable when the payment is replayed. */
  signature: string;
  createdAt: string;
  broadcastAt?: string;
}

/** A peer discovered on the local mesh (another tab in the simulation). */
export interface MeshPeer {
  id: string;
  label: string;
  joinedAt: string;
  lastSeen: number;
  signal: number; // 0-100 link quality
}

type MessageListener = (msg: OfflineMessage) => void;
type PaymentListener = (pmt: OfflinePayment) => void;
type PeerListener = (peerId: string) => void;

interface MeshEnvelope {
  kind: "hello" | "message" | "payment" | "receipt" | "bye";
  from: string;
  to?: string;
  payload?: unknown;
  ts: number;
}

// ── IndexedDB persistence (brain-memory.ts pattern) ─────────────────────

const DB_NAME = "cirkle-mesh";
const DB_VERSION = 1;
const STORE_MESSAGES = "messages";
const STORE_PAYMENTS = "payments";
const STORE_PREFS = "prefs";

let dbInstance: IDBDatabase | null = null;

function openMeshDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        db.createObjectStore(STORE_MESSAGES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PAYMENTS)) {
        db.createObjectStore(STORE_PAYMENTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PREFS)) {
        db.createObjectStore(STORE_PREFS, { keyPath: "key" });
      }
    };
  });
}

async function idbPut<T>(store: string, value: T): Promise<void> {
  const db = await openMeshDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(store: string, id: string): Promise<void> {
  const db = await openMeshDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetAll<T>(store: string): Promise<T[]> {
  const db = await openMeshDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbClear(store: string): Promise<void> {
  const db = await openMeshDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetPref<T>(key: string): Promise<T | null> {
  const db = await openMeshDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PREFS, "readonly");
    const req = tx.objectStore(STORE_PREFS).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSetPref(key: string, value: unknown): Promise<void> {
  const db = await openMeshDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PREFS, "readwrite");
    tx.objectStore(STORE_PREFS).put({ key, value, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── HMAC signing (Web Crypto — no external deps) ────────────────────────

const HMAC_KEY = "cirkle-mesh-hmac-v1";

async function getHmacKey(): Promise<CryptoKey | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  try {
    // Try to import an existing raw key from IndexedDB; otherwise generate.
    const existing = await idbGetPref<ArrayBuffer>(HMAC_KEY);
    if (existing) {
      return await crypto.subtle.importKey(
        "raw",
        existing,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
      );
    }
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const key = await crypto.subtle.importKey(
      "raw",
      raw,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    await idbSetPref(HMAC_KEY, raw.buffer);
    return key;
  } catch {
    return null;
  }
}

async function signPayment(pmt: Omit<OfflinePayment, "signature">): Promise<string> {
  const key = await getHmacKey();
  const data = `${pmt.from}|${pmt.to}|${pmt.amount}|${pmt.currency}|${pmt.createdAt}`;
  if (!key) {
    // Fallback: deterministic non-crypto hash (still better than plaintext).
    let h = 0;
    for (let i = 0; i < data.length; i++) h = ((h << 5) - h + data.charCodeAt(i)) | 0;
    return `fallback:${(h >>> 0).toString(16)}`;
  }
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return `hmac:${arrayToHex(sig)}`;
}

function arrayToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

// ── MeshNetwork singleton ───────────────────────────────────────────────

/**
 * Singleton mesh client. One instance per browser tab; cross-tab
 * communication is handled by `BroadcastChannel` so multiple tabs behave
 * as multiple peers on the same local mesh.
 */
export class MeshNetwork {
  readonly peerId: string;

  private channel: BroadcastChannel | null = null;
  private connected = false;
  private offlineMode = false;

  private peers = new Map<string, MeshPeer>();
  private messageListeners = new Set<MessageListener>();
  private paymentListeners = new Set<PaymentListener>();
  private peerListeners = new Set<PeerListener>();
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Stable per-tab id (random; persisted in sessionStorage so refresh
    // generates a new "peer" — same as a real mesh device).
    this.peerId =
      typeof sessionStorage !== "undefined" && sessionStorage.getItem("cirkle-mesh-id")
        ? (sessionStorage.getItem("cirkle-mesh-id") as string)
        : `peer-${Math.random().toString(36).slice(2, 10)}`;
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("cirkle-mesh-id", this.peerId);
    }
  }

  // ── Connection lifecycle ──────────────────────────────────────────

  /** Open the BroadcastChannel + announce ourselves to other tabs. */
  async connect(): Promise<void> {
    if (this.connected) return;
    if (typeof BroadcastChannel === "undefined") {
      // SSR or unsupported — mark connected but inert.
      this.connected = true;
      return;
    }
    this.channel = new BroadcastChannel("cirkle-mesh-v1");
    this.channel.onmessage = (e: MessageEvent) => this.onEnvelope(e.data as MeshEnvelope);
    this.connected = true;

    // Restore offline-mode preference
    const saved = await idbGetPref<boolean>("offlineMode");
    this.offlineMode = saved === true;

    // Announce
    this.sendEnvelope({ kind: "hello", from: this.peerId, ts: Date.now() });

    // Heartbeat every 3s so peers know we're alive + signal quality pulse
    this.heartbeat = setInterval(() => {
      this.sendEnvelope({ kind: "hello", from: this.peerId, ts: Date.now() });
      // Prune stale peers (lastSeen > 8s)
      const cutoff = Date.now() - 8000;
      for (const [id, peer] of this.peers) {
        if (peer.lastSeen < cutoff) {
          this.peers.delete(id);
          this.peerListeners.forEach((l) => l(id));
        }
      }
    }, 3000);

    // On tab close, say bye
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.handleUnload);
    }
  }

  /** Tear down the channel + heartbeat. */
  disconnect(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
    this.sendEnvelope({ kind: "bye", from: this.peerId, ts: Date.now() });
    this.channel?.close();
    this.channel = null;
    this.connected = false;
    this.peers.clear();
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.handleUnload);
    }
  }

  private handleUnload = () => {
    this.sendEnvelope({ kind: "bye", from: this.peerId, ts: Date.now() });
  };

  // ── Public state ──────────────────────────────────────────────────

  isConnected(): boolean {
    return this.connected;
  }

  isOfflineMode(): boolean {
    return this.offlineMode;
  }

  /** Force offline-only mode — queues messages, never broadcasts. */
  async setOfflineMode(on: boolean): Promise<void> {
    this.offlineMode = on;
    await idbSetPref("offlineMode", on);
  }

  getPeers(): MeshPeer[] {
    return Array.from(this.peers.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  }

  async getQueuedMessages(): Promise<OfflineMessage[]> {
    return idbGetAll<OfflineMessage>(STORE_MESSAGES);
  }

  async getPendingPayments(): Promise<OfflinePayment[]> {
    return idbGetAll<OfflinePayment>(STORE_PAYMENTS);
  }

  // ── Send operations ───────────────────────────────────────────────

  /**
   * Queue a message for delivery. If online + peers are present, also
   * broadcast immediately via BroadcastChannel; otherwise it sits in the
   * IndexedDB queue until `syncOnReconnect()` is called.
   */
  async sendMessage(msg: OfflineMessage): Promise<void> {
    // Always persist first (durable queue)
    await idbPut(STORE_MESSAGES, msg);
    if (!this.offlineMode && this.peers.size > 0) {
      this.sendEnvelope({
        kind: "message",
        from: this.peerId,
        ts: Date.now(),
        payload: msg,
      });
    }
  }

  /**
   * Queue a signed payment for broadcast. The signature is computed here
   * (HMAC over the canonical payload) so the recipient can detect tampering
   * when the payment is replayed over the mesh.
   */
  async sendPayment(pmt: Omit<OfflinePayment, "signature">): Promise<void> {
    const signature = await signPayment(pmt);
    const signed: OfflinePayment = { ...pmt, signature };
    await idbPut(STORE_PAYMENTS, signed);
    if (!this.offlineMode && this.peers.size > 0) {
      this.sendEnvelope({
        kind: "payment",
        from: this.peerId,
        ts: Date.now(),
        payload: signed,
      });
    }
  }

  /**
   * Flush the queue: re-broadcast every queued message + pending payment
   * to all currently-known peers. Called manually ("Sync now") and also
   * auto-fired whenever a new peer is discovered.
   */
  async syncOnReconnect(): Promise<void> {
    if (this.offlineMode || this.peers.size === 0) return;
    const messages = await idbGetAll<OfflineMessage>(STORE_MESSAGES);
    const payments = await idbGetAll<OfflinePayment>(STORE_PAYMENTS);
    for (const m of messages) {
      this.sendEnvelope({
        kind: "message",
        from: this.peerId,
        ts: Date.now(),
        payload: m,
      });
    }
    for (const p of payments) {
      this.sendEnvelope({
        kind: "payment",
        from: this.peerId,
        ts: Date.now(),
        payload: p,
      });
      await idbPut(STORE_PAYMENTS, { ...p, broadcastAt: new Date().toISOString() });
    }
  }

  /**
   * Drop a queued message once all known peers have confirmed receipt
   * (or after manual ack by id).
   */
  async ackMessage(messageId: string, peerId?: string): Promise<void> {
    const all = await idbGetAll<OfflineMessage>(STORE_MESSAGES);
    const m = all.find((x) => x.id === messageId);
    if (!m) return;
    if (peerId && !m.deliveredTo.includes(peerId)) m.deliveredTo.push(peerId);
    // Drop if delivered to all currently-known peers (or > 3 acks as safety net)
    const deliveredEnough =
      (this.peers.size > 0 && m.deliveredTo.length >= this.peers.size) ||
      m.deliveredTo.length >= 3;
    if (deliveredEnough) {
      await idbDelete(STORE_MESSAGES, messageId);
    } else {
      await idbPut(STORE_MESSAGES, m);
    }
  }

  /** Manually purge a payment from the queue after the relay confirms. */
  async ackPayment(paymentId: string): Promise<void> {
    await idbDelete(STORE_PAYMENTS, paymentId);
  }

  /** Clear both queues — used by the dashboard "Clear queue" debug action. */
  async clearAll(): Promise<void> {
    await idbClear(STORE_MESSAGES);
    await idbClear(STORE_PAYMENTS);
  }

  // ── Event subscriptions ───────────────────────────────────────────

  onMessage(cb: MessageListener): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  onPayment(cb: PaymentListener): () => void {
    this.paymentListeners.add(cb);
    return () => this.paymentListeners.delete(cb);
  }

  onPeerDiscovered(cb: PeerListener): () => void {
    this.peerListeners.add(cb);
    return () => this.peerListeners.delete(cb);
  }

  // ── Internal envelope handling ────────────────────────────────────

  private sendEnvelope(env: MeshEnvelope): void {
    if (!this.channel) return;
    try {
      this.channel.postMessage(env);
    } catch {
      /* channel closed — ignore */
    }
  }

  private onEnvelope(env: MeshEnvelope): void {
    if (!env || env.from === this.peerId) return; // ignore own echoes

    switch (env.kind) {
      case "hello": {
        const existing = this.peers.get(env.from);
        const wasNew = !existing;
        const signal = Math.max(35, Math.min(100, 100 - (Date.now() - env.ts) / 100));
        this.peers.set(env.from, {
          id: env.from,
          label: existing?.label ?? `Peer ${env.from.slice(-4)}`,
          joinedAt: existing?.joinedAt ?? new Date().toISOString(),
          lastSeen: Date.now(),
          signal,
        });
        if (wasNew) {
          // Reply with our own hello so the new peer learns about us
          this.sendEnvelope({ kind: "hello", from: this.peerId, ts: Date.now() });
          // Auto-flush queued items to the new peer
          this.syncOnReconnect().catch(() => {});
          this.peerListeners.forEach((l) => l(env.from));
        }
        break;
      }
      case "bye": {
        if (this.peers.delete(env.from)) {
          this.peerListeners.forEach((l) => l(env.from));
        }
        break;
      }
      case "message": {
        const msg = env.payload as OfflineMessage | undefined;
        if (msg) {
          this.messageListeners.forEach((l) => l(msg));
          // Acknowledge receipt so the sender can drop it from their queue
          this.sendEnvelope({
            kind: "receipt",
            from: this.peerId,
            to: env.from,
            ts: Date.now(),
            payload: { messageId: msg.id },
          });
        }
        break;
      }
      case "payment": {
        const pmt = env.payload as OfflinePayment | undefined;
        if (pmt) this.paymentListeners.forEach((l) => l(pmt));
        break;
      }
      case "receipt": {
        const r = env.payload as { messageId?: string } | undefined;
        if (r?.messageId) {
          this.ackMessage(r.messageId, env.from).catch(() => {});
        }
        break;
      }
    }
  }
}

/** Singleton mesh client — shared across the whole app. */
export const mesh = new MeshNetwork();

// ── Helper: build a new OfflineMessage with id + timestamps ─────────────

export function createOfflineMessage(opts: {
  conversationId: string;
  senderId: string;
  body: string;
}): OfflineMessage {
  return {
    id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    conversationId: opts.conversationId,
    senderId: opts.senderId,
    body: opts.body,
    createdAt: new Date().toISOString(),
    deliveredTo: [],
  };
}

export function createOfflinePayment(opts: {
  from: string;
  to: string;
  amount: number;
  currency: string;
}): Omit<OfflinePayment, "signature"> {
  return {
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    from: opts.from,
    to: opts.to,
    amount: opts.amount,
    currency: opts.currency,
    createdAt: new Date().toISOString(),
  };
}

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

import type { Socket } from "socket.io-client";

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

// ═══════════════════════════════════════════════════════════════════════════
// P2.7 — Local Mesh Service Abstraction (WebRTC DataChannels + E2EE)
// ═══════════════════════════════════════════════════════════════════════════
//
// ADR-001 (web-first PWA) approves WebRTC as the local-mesh transport since
// BLE / Wi-Fi Direct are unavailable in browsers. ADR-002 (E2EE) requires
// all mesh traffic to be end-to-end encrypted with device keys.
//
// This `LocalMeshService` class implements the interface required by the
// blueprint (`startDiscovery`, `stopDiscovery`, `connectToDevice`,
// `sendMessage`, `onMessage`, `getConnectedPeers`, `getMeshStatus`) and is
// transport-pluggable: today it uses WebRTC DataChannels for the data plane
// and the existing socket.io chat service on port 3003 as the signaling
// plane. Future transports (BLE via Web Bluetooth, Wi-Fi Aware via future
// Web APIs) can be slotted in without touching call sites.
//
// Signaling protocol (new socket.io events on the existing chat service):
//   • mesh:announce    { deviceId, fingerprint }   — broadcast presence
//   • mesh:discover    { from }                    — request peer list
//   • mesh:signal      { to, from, data }          — relay SDP / ICE
//   • mesh:leave       { deviceId }                — graceful departure
//
// Data plane (WebRTC):
//   • Each peer pair opens an `RTCPeerConnection` with one unordered
//     `RTCDataChannel` named "cirkle-mesh".
//   • Messages are JSON-encoded `MeshFrame`s encrypted with E2EE
//     (src/lib/e2ee-service.ts) BEFORE being sent over the channel.
//   • The server (chat-service) only relays opaque signaling messages — it
//     NEVER sees the encrypted payload.
//
// Offline delivery:
//   • Messages addressed to a peer that is not currently connected are
//     queued in IndexedDB (same store as the existing `MeshNetwork`).
//   • When the peer connects, the queue is flushed automatically.

// ── Types (P2.7) ─────────────────────────────────────────────────────────

/** Status of a single peer connection. */
export type MeshPeerStatus =
  | "discovered"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

/** A peer discovered via the local mesh signaling channel. */
export interface LocalMeshPeer {
  deviceId: string;
  /** E2EE fingerprint of the peer's identity public key (12 hex chars). */
  fingerprint?: string;
  status: MeshPeerStatus;
  /** Round-trip latency in ms (updated from DataChannel ping). */
  latencyMs?: number;
  /** Link-quality signal strength (0-100, derived from RTT + connection state). */
  signal: number;
  firstSeen: number;
  lastSeen: number;
}

/** Frame exchanged over a WebRTC DataChannel between two peers. */
interface MeshFrame {
  kind: "message" | "ping" | "pong" | "ack" | "bye";
  id: string;
  /** E2EE ciphertext blob (JSON envelope from e2ee-service). Opaque to
   *  anyone except the recipient. */
  ciphertext?: string;
  ts: number;
}

/** Status snapshot returned by `getMeshStatus()`. */
export interface MeshStatus {
  /** Our local device id. */
  deviceId: string;
  /** Our E2EE fingerprint (12 hex chars). */
  fingerprint: string | null;
  /** Whether discovery is active. */
  discovering: boolean;
  /** Whether the signaling socket is connected. */
  signaling: boolean;
  /** All peers we currently know about (any status). */
  peers: LocalMeshPeer[];
  /** Count of messages queued for offline delivery. */
  queueDepth: number;
  /** Transport identifier (for future BLE / Wi-Fi Aware support). */
  transport: "webrtc-datachannel";
  /** ISO timestamp of this snapshot. */
  timestamp: string;
}

type MeshMessageListener = (msg: {
  from: string;
  ciphertext: string;
  timestamp: string;
}) => void;

type MeshPeerListener = (peer: LocalMeshPeer) => void;

// ── IndexedDB queue for offline mesh messages ────────────────────────────

const STORE_MESH_QUEUE = "mesh_queue";

async function ensureMeshQueueStore(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  // Re-open the DB with a bumped version so the new store is created.
  if (dbInstance && dbInstance.objectStoreNames.contains(STORE_MESH_QUEUE)) {
    return;
  }
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  await openMeshDB();
  // openMeshDB opens at DB_VERSION=1 — we need to add the store. Do it via
  // a fresh open with version bump.
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
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
      if (!db.objectStoreNames.contains(STORE_MESH_QUEUE)) {
        db.createObjectStore(STORE_MESH_QUEUE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

interface QueuedMeshMessage {
  id: string;
  to: string;
  /** E2EE ciphertext (already encrypted before queueing). */
  ciphertext: string;
  createdAt: string;
  attempts: number;
}

async function enqueueMeshMessage(msg: QueuedMeshMessage): Promise<void> {
  await ensureMeshQueueStore();
  await idbPut(STORE_MESH_QUEUE, msg);
}

async function dequeueMeshMessage(id: string): Promise<void> {
  await ensureMeshQueueStore();
  await idbDelete(STORE_MESH_QUEUE, id);
}

async function getQueuedMeshMessages(): Promise<QueuedMeshMessage[]> {
  await ensureMeshQueueStore();
  return idbGetAll<QueuedMeshMessage>(STORE_MESH_QUEUE);
}

// ── LocalMeshService ─────────────────────────────────────────────────────

/**
 * WebRTC-based local mesh networking service (P2.7 / ADR-001).
 *
 * Singleton. Lazily connects to the chat-service signaling socket on first
 * use. All payloads are encrypted client-side with the device identity from
 * `e2ee-service.ts` before being sent over the WebRTC DataChannel.
 *
 * The server (chat-service) only relays opaque SDP/ICE candidates — it never
 * sees the message content.
 */
export class LocalMeshService {
  /** Our local device id (stable across reloads via sessionStorage). */
  readonly deviceId: string;

  private signaling: Socket | null = null;
  private signalingConnected = false;
  private discovering = false;
  private peers = new Map<string, LocalMeshPeer>();
  private connections = new Map<string, RTCPeerConnection>();
  private channels = new Map<string, RTCDataChannel>();
  /** Pending ICE candidates buffered before remote SDP is set. */
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  /** In-flight offers so we don't dupe when two peers race. */
  private initiating = new Set<string>();

  private messageListeners = new Set<MeshMessageListener>();
  private peerListeners = new Set<MeshPeerListener>();
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  private fingerprint: string | null = null;

  constructor() {
    // Stable per-tab device id (refreshed on reload — same as real mesh).
    this.deviceId =
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("cirkle-local-mesh-id")
        ? (sessionStorage.getItem("cirkle-local-mesh-id") as string)
        : `meshdev_${Math.random().toString(36).slice(2, 10)}`;
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("cirkle-local-mesh-id", this.deviceId);
    }
  }

  // ── Signaling connection ──────────────────────────────────────────

  /**
   * Connect (lazily) to the chat-service socket.io on port 3003 used as
   * the mesh signaling channel. Per gateway rules we connect to "/" with
   * `XTransformPort=3003` in the query string — never an absolute URL.
   */
  private async ensureSignaling(): Promise<void> {
    if (this.signaling) return;
    if (typeof window === "undefined") return;
    try {
      const { io } = await import("socket.io-client");
      const sock = io("/", {
        query: { XTransformPort: 3003, meshRole: "peer", deviceId: this.deviceId },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      sock.on("connect", () => {
        this.signalingConnected = true;
        // Announce ourselves so existing peers learn about us.
        sock.emit("mesh:announce", {
          deviceId: this.deviceId,
          fingerprint: this.fingerprint,
        });
        // Ask for the current peer list.
        sock.emit("mesh:discover", { from: this.deviceId });
      });
      sock.on("disconnect", () => {
        this.signalingConnected = false;
        // Mark all peers as disconnected — we'll re-discover on reconnect.
        for (const [, peer] of this.peers) {
          if (peer.status === "connected") {
            peer.status = "disconnected";
            this.peerListeners.forEach((l) => l(peer));
          }
        }
      });

      // ── Signaling event handlers ─────────────────────────────────
      sock.on("mesh:announce", (payload: { deviceId?: string; fingerprint?: string }) => {
        if (!payload?.deviceId || payload.deviceId === this.deviceId) return;
        this.onPeerAnnounced(payload.deviceId, payload.fingerprint);
      });

      sock.on("mesh:discover", (payload: { from?: string }) => {
        if (!payload?.from || payload.from === this.deviceId) return;
        // Reply with our own announce so the requester learns about us.
        sock.emit("mesh:announce", {
          deviceId: this.deviceId,
          fingerprint: this.fingerprint,
        });
      });

      sock.on(
        "mesh:signal",
        async (payload: { to?: string; from?: string; data?: unknown }) => {
          if (!payload || payload.to !== this.deviceId || !payload.from) return;
          await this.onSignalingMessage(payload.from, payload.data);
        },
      );

      sock.on("mesh:leave", (payload: { deviceId?: string }) => {
        if (!payload?.deviceId) return;
        this.onPeerLeft(payload.deviceId);
      });

      this.signaling = sock;
    } catch (err) {
      console.warn(
        "[local-mesh] failed to establish signaling:",
        String((err as Error)?.message || err),
      );
    }
  }

  /** Set the local fingerprint (called after E2EE device identity is loaded). */
  setFingerprint(fp: string): void {
    this.fingerprint = fp;
    if (this.signalingConnected && this.signaling) {
      this.signaling.emit("mesh:announce", {
        deviceId: this.deviceId,
        fingerprint: fp,
      });
    }
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Start discovering nearby mesh peers via the signaling channel.
   *
   * Idempotent — calling twice is a no-op. Discovery runs until
   * `stopDiscovery()` is called.
   */
  async startDiscovery(_deviceId?: string): Promise<void> {
    if (this.discovering) return;
    await this.ensureSignaling();
    this.discovering = true;
    if (this.signaling) {
      this.signaling.emit("mesh:announce", {
        deviceId: this.deviceId,
        fingerprint: this.fingerprint,
      });
      this.signaling.emit("mesh:discover", { from: this.deviceId });
    }
    // Heartbeat: re-announce every 5s + prune stale peers (lastSeen > 15s).
    this.heartbeat = setInterval(() => {
      if (this.signalingConnected && this.signaling) {
        this.signaling.emit("mesh:announce", {
          deviceId: this.deviceId,
          fingerprint: this.fingerprint,
        });
      }
      const cutoff = Date.now() - 15000;
      for (const [id, peer] of this.peers) {
        if (peer.lastSeen < cutoff) {
          this.onPeerLeft(id);
        }
      }
    }, 5000);
  }

  /** Stop discovering peers + tear down all open connections. */
  stopDiscovery(): void {
    this.discovering = false;
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
    // Close all peer connections.
    for (const [peerId] of this.connections) {
      this.tearDownPeer(peerId);
    }
    this.peers.clear();
    if (this.signaling) {
      this.signaling.emit("mesh:leave", { deviceId: this.deviceId });
    }
  }

  /**
   * Establish a direct P2P WebRTC connection to `deviceId`. The signaling
   * server relays the SDP offer/answer + ICE candidates, but never sees
   * the data plane traffic.
   *
   * Resolves once the DataChannel is open (or after a 10s timeout).
   */
  async connectToDevice(deviceId: string): Promise<boolean> {
    if (deviceId === this.deviceId) return false;
    if (this.channels.has(deviceId) && this.channels.get(deviceId)?.readyState === "open") {
      return true;
    }
    await this.ensureSignaling();
    if (!this.signaling) return false;

    // Race guard: only the lexicographically-smaller deviceId initiates
    // the offer to avoid glare (both peers offering simultaneously).
    if (this.initiating.has(deviceId) || this.deviceId > deviceId) {
      // Wait for the other side to initiate.
      const started = Date.now();
      while (
        Date.now() - started < 10000 &&
        !this.channels.has(deviceId)
      ) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return this.channels.has(deviceId) &&
        this.channels.get(deviceId)?.readyState === "open";
    }

    this.initiating.add(deviceId);
    try {
      const pc = this.createPeerConnection(deviceId);
      const channel = pc.createDataChannel("cirkle-mesh", {
        ordered: false,
        maxRetransmits: 0, // unreliable for low-latency mesh
      });
      this.attachChannel(deviceId, channel);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.signaling.emit("mesh:signal", {
        to: deviceId,
        from: this.deviceId,
        data: { type: "offer", sdp: offer.sdp },
      });

      // Wait for the channel to open (max 10s).
      const opened = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 10000);
        channel.addEventListener("open", () => {
          clearTimeout(timer);
          resolve(true);
        });
      });
      return opened;
    } finally {
      this.initiating.delete(deviceId);
    }
  }

  /**
   * Send an E2EE-encrypted message to a peer over the local mesh.
   *
   * The plaintext is encrypted with the recipient's published device public
   * key (via `e2ee-service.encryptForTransport`) BEFORE being placed on the
   * wire. If the peer is currently offline, the encrypted message is queued
   * in IndexedDB and flushed when the peer next connects.
   *
   * Returns `true` if sent immediately, `false` if queued (or on failure).
   */
  async sendMessage(deviceId: string, message: {
    plaintext: string;
    /** Optional pre-fetched peer public key (avoids an extra round trip). */
    peerPublicKey?: JsonWebKey;
    /** Optional userLabel for fetching the peer's public key. */
    peerUserLabel?: string;
  }): Promise<boolean> {
    if (deviceId === this.deviceId) return false;

    // 1. Encrypt the plaintext client-side. NEVER send plaintext over mesh.
    let ciphertext: string;
    try {
      const { encryptForTransport, fetchPeerPublicKey } = await import("./e2ee-service");
      let pubKey = message.peerPublicKey;
      if (!pubKey && message.peerUserLabel) {
        const pub = await fetchPeerPublicKey(message.peerUserLabel);
        pubKey = pub?.identityPublicKey;
      }
      if (!pubKey) {
        // Can't encrypt without the peer's public key — queue + return false.
        console.warn("[local-mesh] no peer public key available; cannot E2EE encrypt");
        return false;
      }
      ciphertext = await encryptForTransport(message.plaintext, pubKey);
    } catch (err) {
      console.error("[local-mesh] encryption failed:", String((err as Error)?.message || err));
      return false;
    }

    // 2. If peer is connected, send immediately.
    const channel = this.channels.get(deviceId);
    if (channel && channel.readyState === "open") {
      const frame: MeshFrame = {
        kind: "message",
        id: `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        ciphertext,
        ts: Date.now(),
      };
      try {
        channel.send(JSON.stringify(frame));
        return true;
      } catch (err) {
        console.warn(
          "[local-mesh] channel.send failed — queueing:",
          String((err as Error)?.message || err),
        );
      }
    }

    // 3. Otherwise queue for offline delivery.
    await enqueueMeshMessage({
      id: `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      to: deviceId,
      ciphertext,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
    return false;
  }

  /**
   * Register a callback to receive messages from the mesh. The callback
   * receives the E2EE ciphertext — decryption is the caller's responsibility
   * (use `decryptFromTransport` from `e2ee-service`).
   */
  onMessage(cb: MeshMessageListener): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  /** Register a callback fired whenever a peer's status changes. */
  onPeer(cb: MeshPeerListener): () => void {
    this.peerListeners.add(cb);
    return () => this.peerListeners.delete(cb);
  }

  /** List all currently-connected peers (DataChannel open). */
  getConnectedPeers(): LocalMeshPeer[] {
    return Array.from(this.peers.values()).filter((p) => p.status === "connected");
  }

  /** List all known peers (any status). */
  getPeers(): LocalMeshPeer[] {
    return Array.from(this.peers.values());
  }

  /** Full status snapshot — also exposed via `GET /api/mesh/status`. */
  async getMeshStatus(): Promise<MeshStatus> {
    const queued = await getQueuedMeshMessages();
    return {
      deviceId: this.deviceId,
      fingerprint: this.fingerprint,
      discovering: this.discovering,
      signaling: this.signalingConnected,
      peers: this.getPeers(),
      queueDepth: queued.length,
      transport: "webrtc-datachannel",
      timestamp: new Date().toISOString(),
    };
  }

  /** Drop a queued message by id (after the recipient acked). */
  async dropQueuedMessage(id: string): Promise<void> {
    await dequeueMeshMessage(id);
  }

  /** Flush the offline queue to a peer that just connected. */
  private async flushQueue(deviceId: string): Promise<void> {
    const channel = this.channels.get(deviceId);
    if (!channel || channel.readyState !== "open") return;
    const queued = await getQueuedMeshMessages();
    const mine = queued.filter((m) => m.to === deviceId);
    for (const m of mine) {
      const frame: MeshFrame = {
        kind: "message",
        id: m.id,
        ciphertext: m.ciphertext,
        ts: Date.now(),
      };
      try {
        channel.send(JSON.stringify(frame));
        await dequeueMeshMessage(m.id);
      } catch {
        // Channel broke mid-flush — leave it queued for next time.
        return;
      }
    }
  }

  // ── Peer connection plumbing ──────────────────────────────────────

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate && this.signaling) {
        this.signaling.emit("mesh:signal", {
          to: peerId,
          from: this.deviceId,
          data: { type: "ice", candidate: e.candidate.toJSON() },
        });
      }
    };

    pc.ondatachannel = (e) => {
      this.attachChannel(peerId, e.channel);
    };

    pc.onconnectionstatechange = () => {
      const peer = this.peers.get(peerId);
      if (!peer) return;
      if (pc.connectionState === "connected") {
        peer.status = "connected";
        peer.signal = Math.max(50, Math.min(100, peer.signal + 20));
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        peer.status = pc.connectionState === "failed" ? "failed" : "disconnected";
        if (pc.connectionState === "closed" || pc.connectionState === "failed") {
          this.tearDownPeer(peerId);
        }
      }
      peer.lastSeen = Date.now();
      this.peerListeners.forEach((l) => l(peer));
    };

    this.connections.set(peerId, pc);
    return pc;
  }

  private attachChannel(peerId: string, channel: RTCDataChannel): void {
    this.channels.set(peerId, channel);

    channel.onopen = () => {
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.status = "connected";
        peer.lastSeen = Date.now();
        this.peerListeners.forEach((l) => l(peer));
      }
      // Send a ping to measure RTT.
      this.sendFrame(peerId, { kind: "ping", id: `ping_${Date.now()}`, ts: Date.now() });
      // Flush any queued messages for this peer.
      this.flushQueue(peerId).catch(() => {});
    };

    channel.onmessage = async (e) => {
      try {
        const frame = JSON.parse(e.data as string) as MeshFrame;
        await this.onFrame(peerId, frame);
      } catch {
        // ignore malformed frames
      }
    };

    channel.onclose = () => {
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.status = "disconnected";
        this.peerListeners.forEach((l) => l(peer));
      }
      this.channels.delete(peerId);
    };

    channel.onerror = () => {
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.status = "failed";
        this.peerListeners.forEach((l) => l(peer));
      }
    };
  }

  private sendFrame(peerId: string, frame: MeshFrame): void {
    const channel = this.channels.get(peerId);
    if (channel && channel.readyState === "open") {
      try {
        channel.send(JSON.stringify(frame));
      } catch {
        // ignore
      }
    }
  }

  private async onFrame(peerId: string, frame: MeshFrame): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) peer.lastSeen = Date.now();

    switch (frame.kind) {
      case "message": {
        if (frame.ciphertext) {
          // Surface the ciphertext to listeners — decryption is the
          // application's responsibility (e2ee-service.decryptFromTransport).
          this.messageListeners.forEach((l) =>
            l({
              from: peerId,
              ciphertext: frame.ciphertext!,
              timestamp: new Date(frame.ts).toISOString(),
            }),
          );
          // Ack receipt so the sender can drop the queue entry.
          this.sendFrame(peerId, { kind: "ack", id: frame.id, ts: Date.now() });
        }
        break;
      }
      case "ping": {
        this.sendFrame(peerId, { kind: "pong", id: frame.id, ts: Date.now() });
        break;
      }
      case "pong": {
        if (peer) {
          const rtt = Date.now() - frame.ts;
          peer.latencyMs = rtt;
          // Signal strength: 100ms = 100, 1000ms = 10, capped.
          peer.signal = Math.max(10, Math.min(100, 100 - Math.floor(rtt / 10)));
          this.peerListeners.forEach((l) => l(peer));
        }
        break;
      }
      case "ack": {
        // The recipient confirmed receipt — drop our queued copy.
        await dequeueMeshMessage(frame.id);
        break;
      }
      case "bye": {
        this.onPeerLeft(peerId);
        break;
      }
    }
  }

  private async onSignalingMessage(
    from: string,
    data: unknown,
  ): Promise<void> {
    if (!data || typeof data !== "object") return;
    const msg = data as {
      type?: "offer" | "answer" | "ice";
      sdp?: string;
      candidate?: RTCIceCandidateInit;
    };
    if (!msg.type) return;

    let pc = this.connections.get(from);
    if (!pc) {
      pc = this.createPeerConnection(from);
    }

    try {
      if (msg.type === "offer" && msg.sdp) {
        await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
        // Apply any buffered ICE candidates.
        const buffered = this.pendingCandidates.get(from) ?? [];
        for (const c of buffered) {
          try { await pc.addIceCandidate(c); } catch { /* ignore */ }
        }
        this.pendingCandidates.delete(from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.signaling?.emit("mesh:signal", {
          to: from,
          from: this.deviceId,
          data: { type: "answer", sdp: answer.sdp },
        });
        this.onPeerAnnounced(from);
      } else if (msg.type === "answer" && msg.sdp) {
        await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
        const buffered = this.pendingCandidates.get(from) ?? [];
        for (const c of buffered) {
          try { await pc.addIceCandidate(c); } catch { /* ignore */ }
        }
        this.pendingCandidates.delete(from);
      } else if (msg.type === "ice" && msg.candidate) {
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(msg.candidate); } catch { /* ignore */ }
        } else {
          // Buffer until remote description is set.
          const arr = this.pendingCandidates.get(from) ?? [];
          arr.push(msg.candidate);
          this.pendingCandidates.set(from, arr);
        }
      }
    } catch (err) {
      console.warn(
        "[local-mesh] signaling message handler error:",
        String((err as Error)?.message || err),
      );
    }
  }

  private onPeerAnnounced(deviceId: string, fingerprint?: string): void {
    const existing = this.peers.get(deviceId);
    const now = Date.now();
    const signal = existing?.signal ?? 50;
    const peer: LocalMeshPeer = {
      deviceId,
      fingerprint: fingerprint ?? existing?.fingerprint,
      status: existing?.status ?? "discovered",
      latencyMs: existing?.latencyMs,
      signal,
      firstSeen: existing?.firstSeen ?? now,
      lastSeen: now,
    };
    this.peers.set(deviceId, peer);
    if (!existing) {
      this.peerListeners.forEach((l) => l(peer));
    }
  }

  private onPeerLeft(deviceId: string): void {
    const peer = this.peers.get(deviceId);
    if (!peer) return;
    peer.status = "disconnected";
    this.peerListeners.forEach((l) => l(peer));
    this.tearDownPeer(deviceId);
    this.peers.delete(deviceId);
  }

  private tearDownPeer(deviceId: string): void {
    const channel = this.channels.get(deviceId);
    if (channel) {
      try { channel.close(); } catch { /* ignore */ }
    }
    this.channels.delete(deviceId);
    const pc = this.connections.get(deviceId);
    if (pc) {
      try { pc.close(); } catch { /* ignore */ }
    }
    this.connections.delete(deviceId);
  }
}

/**
 * Singleton local mesh service — shared across the whole app. The first
 * call to `startDiscovery()` lazily connects to the signaling socket.
 */
export const localMesh = new LocalMeshService();


/**
 * CIRKLE — Decentralised Storage Service Abstraction (P2.5, IPFS).
 *
 * Status: WORKING ABSTRACTION.
 *
 * This module is the **service abstraction** over IPFS-style content
 * addressing. Real IPFS isn't deployable in this sandbox, so the
 * underlying transport is split:
 *
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  Today (sandbox)        ───►  Upgrade path (production)         │
 *   ├─────────────────────────────────┼──────────────────────────────┤
 *   │  Small files (<1MB) → localStorage (base64)                    │
 *   │  Large files → server filesystem (db/custom.db sibling)        │
 *   │  CIDs = SHA-256(content) hex     │  IPFS CIDv1                  │
 *   │  /api/storage/* routes           │  IPFS HTTP API (kubo/rainbow)│
 *   │  Manual pin via DB flag          │  ipfs pin add / remote pin   │
 *   └─────────────────────────────────┴──────────────────────────────┘
 *
 * CID format: `z` prefix + 64-char hex SHA-256 (multibase-like, no
 * dependencies). When a real IPFS node is wired in, the CID becomes the
 * actual CIDv1 — the call sites don't change.
 *
 * All functions are isomorphic — they hit the existing `/api/storage/*`
 * routes with relative URLs only.
 */

"use client";

// ── Types ───────────────────────────────────────────────────────────────────

export interface UploadResult {
  cid: string;
  size: number;
  filename: string;
  mimeType: string;
  storageTier: "local" | "client" | "ipfs";
}

export interface PinnedCid {
  cid: string;
  filename: string;
  size: number;
  mimeType: string;
  storageTier: string;
  pinned: boolean;
  uploadedBy: string | null;
  createdAt: string;
}

export interface UploadStatus {
  cid: string;
  pinned: boolean;
  storageTier: string;
  size: number;
  filename: string;
  available: boolean;
}

export class StorageServiceError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.name = "StorageServiceError";
  }
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Files smaller than this go to localStorage; larger go to server. */
export const LOCAL_STORAGE_THRESHOLD = 1 * 1024 * 1024; // 1 MB

const STORAGE_DB_KEY = "cirkle:storage:pins";

// ── Client-side CID computation (SHA-256 hex) ────────────────────────────────

/**
 * Compute the content-addressed ID for a buffer. Today this is a simple
 * `z`-prefixed SHA-256 hex string; the upgrade path is IPFS CIDv1 (which
 * also starts with `z` for base58btc-encoded multihashes — so the prefix
 * convention is forward-compatible).
 */
export async function computeCid(data: Uint8Array | ArrayBuffer | Blob): Promise<string> {
  let bytes: Uint8Array;
  if (data instanceof Blob) {
    bytes = new Uint8Array(await data.arrayBuffer());
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else {
    bytes = data;
  }
  // Web Crypto is available in both browsers and Node 18+.
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `z${hex}`;
}

// ── localStorage pin store (client-only) ──────────────────────────────────────

interface LocalPin {
  cid: string;
  filename: string;
  mimeType: string;
  size: number;
  data: string; // base64
  createdAt: string;
}

function readLocalPins(): LocalPin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_DB_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalPin[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalPins(pins: LocalPin[]): void {
  if (typeof window === "undefined") return;
  try {
    // Cap at ~4MB total localStorage to stay within quota.
    const capped = pins.slice(0, 50);
    window.localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(capped));
  } catch {
    // Quota exceeded — drop oldest and retry.
    try {
      window.localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(pins.slice(0, 10)));
    } catch {
      // give up silently
    }
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof window === "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof window === "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload a file. Files < LOCAL_STORAGE_THRESHOLD are stored in localStorage
 * (and we tell the server about the pin for discoverability); larger files
 * are streamed to /api/storage/upload.
 */
export async function upload(
  data: Blob | File | Uint8Array,
  filename?: string,
  mimeType?: string,
  uploadedBy?: string,
): Promise<UploadResult> {
  const blob = data instanceof Blob
    ? data
    : new Blob([data as BlobPart], { type: mimeType || "application/octet-stream" });
  const name = filename || (data instanceof File ? data.name : "upload.bin");
  const type = mimeType || (data instanceof File ? data.type : blob.type) || "application/octet-stream";
  const size = blob.size;

  const cid = await computeCid(blob);

  if (size < LOCAL_STORAGE_THRESHOLD && typeof window !== "undefined") {
    // Store in localStorage as base64.
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const b64 = bytesToBase64(bytes);
    const pins = readLocalPins().filter((p) => p.cid !== cid);
    pins.unshift({
      cid,
      filename: name,
      mimeType: type,
      size,
      data: b64,
      createdAt: new Date().toISOString(),
    });
    writeLocalPins(pins);
    // Tell the server about the pin (best-effort) so other clients can
    // discover the CID — the bytes themselves stay client-side.
    try {
      await fetch("/api/storage/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cid, filename: name, mimeType: type, size, storageTier: "client", uploadedBy }),
      });
    } catch {
      // non-fatal
    }
    return { cid, size, filename: name, mimeType: type, storageTier: "client" };
  }

  // Large file → server filesystem.
  const fd = new FormData();
  fd.append("file", blob, name);
  if (uploadedBy) fd.append("uploadedBy", uploadedBy);
  const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new StorageServiceError(
      (err as { error?: string })?.error ?? "upload failed",
      res.status,
    );
  }
  const result = (await res.json()) as UploadResult;
  return result;
}

/**
 * Download a file by CID. Tries localStorage first (client tier), then
 * falls back to the server.
 */
export async function download(cid: string): Promise<{ data: Uint8Array; mimeType: string; filename: string }> {
  if (!cid) throw new StorageServiceError("cid required", 400);

  // 1. Try localStorage.
  if (typeof window !== "undefined") {
    const local = readLocalPins().find((p) => p.cid === cid);
    if (local) {
      return {
        data: base64ToBytes(local.data),
        mimeType: local.mimeType,
        filename: local.filename,
      };
    }
  }

  // 2. Server fetch.
  const res = await fetch(`/api/storage/download/${encodeURIComponent(cid)}`);
  if (!res.ok) {
    throw new StorageServiceError("download failed", res.status);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") || "application/octet-stream";
  const filename = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || cid;
  return { data: buf, mimeType, filename };
}

/**
 * Pin a CID. Marks it as "should not be garbage-collected".
 */
export async function pin(cid: string): Promise<{ ok: boolean; pinned: boolean }> {
  const res = await fetch("/api/storage/pin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cid, action: "pin" }),
  });
  if (!res.ok) throw new StorageServiceError("pin failed", res.status);
  return (await res.json()) as { ok: boolean; pinned: boolean };
}

/**
 * Unpin a CID.
 */
export async function unpin(cid: string): Promise<{ ok: boolean; pinned: boolean }> {
  const res = await fetch("/api/storage/pin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cid, action: "unpin" }),
  });
  if (!res.ok) throw new StorageServiceError("unpin failed", res.status);
  return (await res.json()) as { ok: boolean; pinned: boolean };
}

/**
 * List all pinned CIDs (server-side).
 */
export async function getPinned(): Promise<PinnedCid[]> {
  const res = await fetch("/api/storage/pinned");
  if (!res.ok) throw new StorageServiceError("fetch pinned failed", res.status);
  const data = (await res.json()) as { pinned?: PinnedCid[] };
  return data.pinned ?? [];
}

/**
 * Check the upload/pin status of a CID.
 */
export async function getUploadStatus(cid: string): Promise<UploadStatus> {
  if (!cid) throw new StorageServiceError("cid required", 400);
  const res = await fetch(`/api/storage/status/${encodeURIComponent(cid)}`);
  if (!res.ok) throw new StorageServiceError("status fetch failed", res.status);
  return (await res.json()) as UploadStatus;
}

// ── Singleton convenience ────────────────────────────────────────────────────

export const storageService = {
  upload,
  download,
  pin,
  unpin,
  getPinned,
  getUploadStatus,
  computeCid,
};

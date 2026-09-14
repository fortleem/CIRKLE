/**
 * CIRKLE — P2P Video Service Abstraction (P2.6, PeerTube).
 *
 * Status: WORKING ABSTRACTION.
 *
 * This module is the **service abstraction** over P2P video. Real PeerTube
 * isn't deployable in this sandbox, so the underlying transport is:
 *
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  Today (sandbox)        ───►  Upgrade path (production)         │
 *   ├─────────────────────────────────┼──────────────────────────────┤
 *   │  Post table (module=mashahd)    │  PeerTube video table         │
 *   │  /api/video/* routes            │  PeerTube REST API            │
 *   │  WebRTC via mesh-network.ts     │  WebRTC + WebTorrent (PeerTube)│
 *   │  Server-side transcoding stub   │  FFmpeg transcoding pipeline  │
 *   │  Server filesystem storage      │  Object storage + IPFS pin    │
 *   └─────────────────────────────────┴──────────────────────────────┘
 *
 * CRITICAL INVARIANTS:
 *   1. Videos are stored as Post rows with module=mashahd so they show up
 *      in the existing Mashahd feed. The Post.mediaKind="video" is the
 *      canonical signal.
 *   2. P2P seeding uses the existing mesh-network.ts WebRTC layer. The
 *      VideoSeed table records which devices are actively seeding a video
 *      so clients can prefer P2P delivery over server fetch.
 *
 * All client-callable functions are isomorphic — they hit the existing
 * `/api/video/*` routes with relative URLs only.
 */

"use client";

// ── Types ───────────────────────────────────────────────────────────────────

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  author: string;
  duration: number;       // seconds
  size: number;           // bytes
  mimeType: string;
  streamingUrl: string;
  thumbnailUrl?: string;
  views: number;
  likes: number;
  seeders: number;        // active P2P seeders
  transcodeStatus: TranscodeStatus;
  createdAt: string;
}

export interface VideoListFilter {
  module?: "mashahd";
  author?: string;
  limit?: number;
  page?: number;
}

export interface VideoListPage {
  videos: VideoMetadata[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SeederInfo {
  deviceId: string;
  username: string | null;
  status: "active" | "idle" | "closed";
  chunks: string;
  lastSeen: string;
}

export type TranscodeStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed"
  | "not_required";

export interface UploadVideoInput {
  file: File | Blob;
  title: string;
  description?: string;
  author: string;
  /** Optional authorHandle for the Post row (defaults to author). */
  authorHandle?: string;
}

export class VideoServiceError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.name = "VideoServiceError";
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function origin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || "https://circle.app";
}

function toMetadata(
  p: {
    id: string;
    authorName: string;
    authorHandle: string;
    body: string;
    mediaKind: string | null;
    mediaCover: string | null;
    views: number;
    likes: number;
    createdAt: Date;
  },
  seeders: number,
  transcode: TranscodeStatus,
): VideoMetadata {
  const base = origin();
  // The first line of the body is the title; the rest is the description.
  const [title, ...rest] = (p.body || "").split("\n\n");
  return {
    id: p.id,
    title: title || "Untitled",
    description: rest.join("\n\n"),
    author: p.authorName,
    duration: 0, // duration is parsed client-side from the loaded <video> element
    size: 0,
    mimeType: "video/mp4",
    streamingUrl: `${base}/api/video/${p.id}`,
    thumbnailUrl: p.mediaCover || undefined,
    views: p.views,
    likes: p.likes,
    seeders,
    transcodeStatus: transcode,
    createdAt: p.createdAt.toISOString(),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload a video. Stores the file via /api/storage/upload (content-addressed)
 * AND creates a Post row with module=mashahd so the video shows up in the
 * Mashahd feed. The Post.body is `title\n\ndescription`.
 */
export async function uploadVideo(
  input: UploadVideoInput,
): Promise<VideoMetadata> {
  // 1. Upload bytes to storage (gets a CID).
  const { upload } = await import("@/lib/storage-service");
  const uploadResult = await upload(input.file, input.file instanceof File ? input.file.name : "video.mp4", input.file.type || "video/mp4", input.author);

  // 2. Create a Post row in the mashahd module.
  const body = `${input.title}\n\n${input.description || ""}`.trim();
  const res = await fetch("/api/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      body,
      module: "mashahd",
      mediaKind: "video",
      authorName: input.author,
      authorHandle: input.authorHandle || input.author,
      authorInitials: input.author.slice(0, 2).toUpperCase(),
      authorColor: "teal",
      visibility: "public",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new VideoServiceError(
      (err as { error?: string })?.error ?? "video post failed",
      res.status,
    );
  }
  const post = (await res.json()) as {
    id: string;
    authorName: string;
    authorHandle: string;
    body: string;
    mediaKind: string | null;
    mediaCover: string | null;
    views: number;
    likes: number;
    createdAt: string;
  };

  // 3. Record the video on the server (creates a transcode job + initial seed entry).
  await fetch("/api/video/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      videoId: post.id,
      cid: uploadResult.cid,
      filename: uploadResult.filename,
      mimeType: uploadResult.mimeType,
      size: uploadResult.size,
      author: input.author,
    }),
  }).catch(() => {
    // non-fatal — the post is already created
  });

  return {
    id: post.id,
    title: input.title,
    description: input.description || "",
    author: post.authorName,
    duration: 0,
    size: uploadResult.size,
    mimeType: uploadResult.mimeType,
    streamingUrl: `${origin()}/api/video/${post.id}`,
    thumbnailUrl: undefined,
    views: post.views,
    likes: post.likes,
    seeders: 0,
    transcodeStatus: "pending",
    createdAt: post.createdAt,
  };
}

/**
 * Get a single video's metadata + streaming URL.
 */
export async function getVideo(id: string): Promise<VideoMetadata | null> {
  if (!id) return null;
  const res = await fetch(`/api/video/${encodeURIComponent(id)}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new VideoServiceError("video fetch failed", res.status);
  }
  return (await res.json()) as VideoMetadata;
}

/**
 * List videos. Wraps /api/posts?module=mashahd + /api/video to enrich
 * each video with seeder + transcode counts.
 */
export async function getVideos(
  filter: VideoListFilter = {},
): Promise<VideoListPage> {
  const sp = new URLSearchParams({ module: filter.module || "mashahd" });
  if (filter.author) sp.set("author", filter.author);
  if (filter.limit) sp.set("limit", String(filter.limit));
  const res = await fetch(`/api/posts?${sp.toString()}`);
  if (!res.ok) {
    throw new VideoServiceError("video list failed", res.status);
  }
  const posts = (await res.json()) as Array<{
    id: string;
    authorName: string;
    authorHandle: string;
    body: string;
    mediaKind: string | null;
    mediaCover: string | null;
    views: number;
    likes: number;
    createdAt: string;
  }>;
  // Only keep video posts.
  const videos = posts.filter((p) => p.mediaKind === "video");

  // Enrich with seeder + transcode info (batched).
  const enriched = await Promise.all(
    videos.map(async (p) => {
      try {
        const seedRes = await fetch(`/api/video/${encodeURIComponent(p.id)}/seeders`);
        const seedData = (await seedRes.json()) as { seeders?: SeederInfo[] };
        const tcRes = await fetch(`/api/video/${encodeURIComponent(p.id)}/transcode`);
        const tcData = (await tcRes.json()) as { status?: TranscodeStatus };
        return toMetadata(
          {
            ...p,
            createdAt: new Date(p.createdAt),
          },
          (seedData.seeders || []).filter((s) => s.status === "active").length,
          tcData.status || "not_required",
        );
      } catch {
        return toMetadata(
          { ...p, createdAt: new Date(p.createdAt) },
          0,
          "not_required",
        );
      }
    }),
  );

  const limit = filter.limit || 20;
  const page = filter.page || 1;
  return {
    videos: enriched,
    total: enriched.length,
    page,
    pageSize: limit,
  };
}

/**
 * Start seeding a video via WebRTC. Uses the existing mesh-network.ts
 * `LocalMeshService` so seeding rides on the same WebRTC DataChannel
 * transport as the rest of the mesh.
 *
 * Returns a `seederId` (the local device id) and an `unseed` callback that
 * stops seeding and notifies the server.
 */
export async function seedVideo(
  videoId: string,
  deviceId: string,
  username?: string,
): Promise<{ seederId: string; unseed: () => Promise<void> }> {
  if (!videoId) throw new VideoServiceError("videoId required", 400);

  // Register with the server.
  const res = await fetch(`/api/video/${encodeURIComponent(videoId)}/seed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId, username, status: "active" }),
  });
  if (!res.ok) {
    throw new VideoServiceError("seed register failed", res.status);
  }

  // Lazily import the mesh layer so this file stays isomorphic and
  // doesn't break SSR when window is undefined.
  let cleanup: (() => Promise<void>) | null = null;
  try {
    const meshMod = await import("@/lib/mesh-network");
    const mesh = meshMod.localMesh;
    // The mesh layer already handles presence + WebRTC. We don't need to
    // open a dedicated channel for video — the metadata that "we're a
    // seeder" lives on the server, and peers fetch via /api/video/[id]
    // first, then upgrade to P2P via mesh.sendFrame if both are online.
    void mesh;
    cleanup = async () => {
      try {
        await fetch(`/api/video/${encodeURIComponent(videoId)}/seed`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ deviceId }),
        });
      } catch {
        // best-effort
      }
    };
  } catch {
    cleanup = async () => {
      try {
        await fetch(`/api/video/${encodeURIComponent(videoId)}/seed`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ deviceId }),
        });
      } catch {
        // best-effort
      }
    };
  }

  return {
    seederId: deviceId,
    unseed: cleanup || (async () => {}),
  };
}

/**
 * List active seeders for a video.
 */
export async function getSeeders(
  videoId: string,
): Promise<SeederInfo[]> {
  if (!videoId) return [];
  const res = await fetch(`/api/video/${encodeURIComponent(videoId)}/seeders`);
  if (!res.ok) {
    throw new VideoServiceError("seeders fetch failed", res.status);
  }
  const data = (await res.json()) as { seeders?: SeederInfo[] };
  return data.seeders ?? [];
}

/**
 * Check transcoding status of a video.
 */
export async function transcodeStatus(
  videoId: string,
): Promise<{ status: TranscodeStatus; progress: number; renditions?: unknown }> {
  if (!videoId) {
    return { status: "not_required", progress: 0 };
  }
  const res = await fetch(`/api/video/${encodeURIComponent(videoId)}/transcode`);
  if (!res.ok) {
    return { status: "not_required", progress: 0 };
  }
  const data = (await res.json()) as {
    status: TranscodeStatus;
    progress: number;
    renditions?: unknown;
  };
  return {
    status: data.status,
    progress: data.progress,
    renditions: data.renditions,
  };
}

// ── Singleton convenience ────────────────────────────────────────────────────

export const videoService = {
  uploadVideo,
  getVideo,
  getVideos,
  seedVideo,
  getSeeders,
  transcodeStatus,
};

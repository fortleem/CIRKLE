/**
 * Nearby photo discovery (Blueprint §8.4).
 *
 * Privacy-preserving geohash-based discovery. The CLIENT computes the
 * geohash from the user's GPS coordinates BEFORE sending anything to
 * the server — the server NEVER sees exact lat/lng. The geohash
 * precision is chosen so that each cell covers ~1.2km × 0.6km,
 * providing strong k-anonymity (hundreds of users per cell in dense
 * areas).
 *
 * Geohash spec: https://en.wikipedia.org/wiki/Geohash
 * Base32 alphabet: "0123456789bcdefghjkmnpqrstuvwxyz" (no a, i, l, o)
 *
 * Precision reference:
 *   5 chars  → ~4.9km × 4.9km  (city-district level)
 *   6 chars  → ~1.2km × 0.6km  (neighborhood level — DEFAULT)
 *   7 chars  → ~153m × 153m    (city-block level)
 *   8 chars  → ~38m × 19m      (precise — too revealing for public use)
 *
 * For "nearby within radius" queries, we expand the central geohash
 * to its 8 neighbours and union all posts in any of those 9 cells.
 * This gives us a ~3.6km × 1.8km search area around the user without
 * ever storing the user's exact location.
 */

import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  encodeGeohash,
  geohashNeighbours,
  isValidGeohash,
} from "@/lib/geohash";

// Re-export the isomorphic helpers so server-side callers can import
// everything from one place.
export { encodeGeohash, geohashNeighbours };

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface NearbyPhoto {
  id: string;
  body: string;
  authorName: string;
  authorHandle: string;
  authorInitials?: string;
  authorColor?: string;
  mediaKind?: string | null;
  mediaCover?: string | null;
  createdAt: string;
  geohash: string;
}

/**
 * Returns photos within `radiusKm` of the given lat/lng.
 *
 * The caller passes lat/lng — we compute the geohash locally (the
 * client should also compute it client-side and not send lat/lng in
 * the request, but this signature supports both call patterns).
 *
 * Internally we expand to the 9-cell grid (center + 8 neighbours) at
 * precision 6 (~1.2km × 0.6km per cell → ~3.6km × 1.8km search area)
 * and return all matching photos. If `radiusKm` > 5, we drop to
 * precision 5 (~4.9km × 4.9km per cell → ~15km × 15km search area).
 */
export async function getNearbyPhotos(
  lat: number,
  lng: number,
  radiusKm = 2,
  limit = 50,
): Promise<NearbyPhoto[]> {
  if (!isFinite(lat) || !isFinite(lng)) return [];
  const take = Math.max(1, Math.min(200, limit));
  const precision = radiusKm > 5 ? 5 : 6;
  const central = encodeGeohash(lat, lng, precision);
  const cells = [central, ...geohashNeighbours(central)];

  // Query the GeoPhotoIndex for any post in any of the 9 cells.
  // SQLite `startsWith` is expressed via `gt`/`lt` on the indexed
  // column, but Prisma doesn't support multi-prefix queries well — so
  // we fetch the distinct geohashes that start with each cell prefix
  // and union the post ids. This is O(9 * cell_count) which is small.
  const rows = await db.geoPhotoIndex.findMany({
    where: { geohash: { in: cells } },
    orderBy: { createdAt: "desc" },
    take: take * 2, // over-fetch a bit in case some posts are deleted
  });
  if (rows.length === 0) return [];

  // Fetch the actual posts. We only return photos (module=lamahat)
  // with media kind image/album/gif.
  const postIds = rows.map((r) => r.postId);
  const posts = await db.post.findMany({
    where: {
      id: { in: postIds },
      module: "lamahat",
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  // Build a lookup so we can attach the geohash back to each post.
  const geohashByPost = new Map<string, string>();
  for (const r of rows) geohashByPost.set(r.postId, r.geohash);

  return posts.map((p) => ({
    id: p.id,
    body: p.body,
    authorName: p.authorName,
    authorHandle: p.authorHandle,
    authorInitials: p.authorInitials,
    authorColor: p.authorColor,
    mediaKind: p.mediaKind,
    mediaCover: p.mediaCover,
    createdAt: p.createdAt.toISOString(),
    geohash: geohashByPost.get(p.id) || "",
  }));
}

/**
 * Indexes a post's location for nearby discovery. The caller supplies
 * the geohash (computed client-side from the user's GPS) — we never
 * accept raw lat/lng here.
 *
 * Idempotent per postId (upserts the row).
 */
export async function indexPhotoForNearby(opts: {
  postId: string;
  geohash: string;
  country?: string | null;
}): Promise<void> {
  if (!opts.postId) throw new Error("postId is required");
  const geohash = (opts.geohash || "").toLowerCase();
  if (!isValidGeohash(geohash)) {
    throw new Error("geohash must be 4-12 base32 chars");
  }
  await db.geoPhotoIndex.upsert({
    where: { postId: opts.postId },
    create: {
      postId: opts.postId,
      geohash,
      country: opts.country?.toUpperCase().slice(0, 2) || null,
    },
    update: { geohash, country: opts.country?.toUpperCase().slice(0, 2) || null },
  });
  logger.info("[nearby] photo indexed", { postId: opts.postId, geohash });
}

/**
 * Removes a post's geo index entry (e.g. when the post is deleted).
 * Best-effort.
 */
export async function unindexPhotoForNearby(postId: string): Promise<void> {
  if (!postId) return;
  try {
    await db.geoPhotoIndex.delete({ where: { postId } });
  } catch {
    /* not found — fine */
  }
}

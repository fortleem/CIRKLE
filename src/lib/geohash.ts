/**
 * Isomorphic geohash encoder (Blueprint §8.4).
 *
 * Pure-function — no DB, no server-only. Used by:
 *   • Client: encode the user's GPS coordinates into a geohash BEFORE
 *     sending anything to the server (privacy: the server never sees
 *     the exact lat/lng of the viewer).
 *   • Server (nearby-discovery.ts): re-imports these functions so the
 *     encoding logic is shared and stays in sync.
 *
 * Geohash spec: https://en.wikipedia.org/wiki/Geohash
 * Base32 alphabet: "0123456789bcdefghjkmnpqrstuvwxyz" (no a, i, l, o)
 *
 * Precision reference:
 *   5 chars  → ~4.9km × 4.9km  (city-district level)
 *   6 chars  → ~1.2km × 0.6km  (neighborhood level — DEFAULT)
 *   7 chars  → ~153m × 153m    (city-block level)
 */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  if (!isFinite(lat) || !isFinite(lng)) {
    throw new Error("lat and lng must be finite numbers");
  }
  if (lat < -90 || lat > 90) throw new Error("lat must be in [-90, 90]");
  if (lng < -180 || lng > 180) throw new Error("lng must be in [-180, 180]");
  const p = Math.max(1, Math.min(12, Math.floor(precision)));
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = "";
  let bit = 0;
  let ch = 0;
  let even = true;
  while (hash.length < p) {
    if (even) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch = (ch << 1) | 1;
        minLng = mid;
      } else {
        ch = ch << 1;
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch = (ch << 1) | 1;
        minLat = mid;
      } else {
        ch = ch << 1;
        maxLat = mid;
      }
    }
    even = !even;
    bit += 1;
    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

export function decodeGeohashLat(hash: string): number | null {
  if (!hash) return null;
  let minLat = -90, maxLat = 90;
  let even = false;
  for (const c of hash) {
    const cd = BASE32.indexOf(c);
    if (cd < 0) return null;
    for (let i = 4; i >= 0; i--) {
      const bit = (cd >> i) & 1;
      if (even) {
        const mid = (minLat + maxLat) / 2;
        if (bit) minLat = mid;
        else maxLat = mid;
      }
      even = !even;
    }
  }
  return (minLat + maxLat) / 2;
}

export function decodeGeohashLng(hash: string): number | null {
  if (!hash) return null;
  let minLng = -180, maxLng = 180;
  let even = true;
  for (const c of hash) {
    const cd = BASE32.indexOf(c);
    if (cd < 0) return null;
    for (let i = 4; i >= 0; i--) {
      const bit = (cd >> i) & 1;
      if (even) {
        const mid = (minLng + maxLng) / 2;
        if (bit) minLng = mid;
        else maxLng = mid;
      }
      even = !even;
    }
  }
  return (minLng + maxLng) / 2;
}

/**
 * Returns the 8 neighbours of a geohash (N, NE, E, SE, S, SW, W, NW).
 */
export function geohashNeighbours(hash: string): string[] {
  if (!hash) return [];
  const precision = hash.length;
  const lat = decodeGeohashLat(hash);
  const lng = decodeGeohashLng(hash);
  if (lat == null || lng == null) return [];
  const { latErr, lngErr } = cellSize(precision);
  const offsets: Array<[number, number]> = [
    [lat + latErr, lng],
    [lat + latErr, lng + lngErr],
    [lat, lng + lngErr],
    [lat - latErr, lng + lngErr],
    [lat - latErr, lng],
    [lat - latErr, lng - lngErr],
    [lat, lng - lngErr],
    [lat + latErr, lng - lngErr],
  ];
  return offsets
    .map(([la, ln]) => encodeGeohash(clampLat(la), wrapLng(ln), precision))
    .filter((h, i, arr) => arr.indexOf(h) === i);
}

export function cellSize(precision: number): { latErr: number; lngErr: number } {
  const latBits = Math.floor((precision * 5) / 2);
  const lngBits = Math.ceil((precision * 5) / 2);
  return {
    latErr: 180 / Math.pow(2, latBits),
    lngErr: 360 / Math.pow(2, lngBits),
  };
}

function clampLat(lat: number): number {
  return Math.max(-89.999, Math.min(89.999, lat));
}
function wrapLng(lng: number): number {
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  return lng;
}

/** Validates a geohash string (4-12 base32 chars). */
export function isValidGeohash(hash: string): boolean {
  return typeof hash === "string" && /^[0-9b-hjkmnp-z]{4,12}$/.test(hash.toLowerCase());
}

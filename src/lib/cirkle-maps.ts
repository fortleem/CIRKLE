/**
 * Cirkle Maps — server-only library for the Circle Maps pillar
 * (Blueprint §23). Uses 100% free, open-source mapping infrastructure:
 *
 *   • OpenStreetMap Nominatim  — forward + reverse geocoding
 *   • OSRM (router.project-osrm.org) — driving/walking/cycling routing
 *   • OpenStreetMap embed iframe — interactive map view (no API key)
 *
 * Privacy-first: no tracking, no telemetry, no API keys. Every request
 * includes a descriptive User-Agent so Nominatim's usage policy is honoured.
 *
 * Server-only — never import this from a client component.
 */

import "server-only";

import { logger } from "@/lib/logger";

// ── Types ───────────────────────────────────────────────────────────────────

export interface GeoResult {
  lat: number;
  lon: number;
  display_name: string;
}

export interface ReverseGeoResult {
  displayName: string;
  city?: string;
  country?: string;
  countryCode?: string;
  road?: string;
  neighbourhood?: string;
}

export type RouteMode = "driving" | "walking" | "cycling";

export interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  geometry: {
    type: "LineString";
    coordinates: [number, number][]; // [lon, lat] pairs (GeoJSON)
  };
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  distance: number; // meters from the search origin
  tags?: Record<string, string>;
}

// ── Constants ───────────────────────────────────────────────────────────────

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OSRM_BASE = "https://router.project-osrm.org/route/v1";
const OVERPASS_BASE = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "Cirkle/1.0 (circle-maps; contact@cirkle.app)";
const REQUEST_TIMEOUT_MS = 8_000;
const ROUTE_TIMEOUT_MS = 12_000;
const NEARBY_TIMEOUT_MS = 14_000;

// ── Helpers ─────────────────────────────────────────────────────────────────

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Forward geocode a free-text query into up to 5 OSM results.
 * Returns `[]` on any failure (network, parse, timeout).
 */
export async function geocode(query: string): Promise<GeoResult[]> {
  const q = (query || "").trim();
  if (!q) return [];
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(
    q,
  )}&format=json&limit=5&addressdetails=1`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      logger.warn("[cirkle-maps] geocode non-OK", {
        status: res.status,
        query: q,
      });
      return [];
    }
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
    }>;
    if (!Array.isArray(data)) return [];
    return data
      .map((d) => {
        const lat = parseFloat(d.lat);
        const lon = parseFloat(d.lon);
        if (!isFinite(lat) || !isFinite(lon)) return null;
        return {
          lat,
          lon,
          display_name: d.display_name || q,
        };
      })
      .filter((x): x is GeoResult => x !== null);
  } catch (err) {
    logger.warn("[cirkle-maps] geocode failed", {
      error: (err as Error).message,
      query: q,
    });
    return [];
  }
}

/**
 * Reverse geocode a lat/lon into a human-readable address.
 * Returns a default "Unknown location" object on any failure.
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<ReverseGeoResult> {
  if (!isFinite(lat) || !isFinite(lon)) {
    return { displayName: "Unknown location" };
  }
  const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=en`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      return { displayName: "Unknown location" };
    }
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address || {};
    return {
      displayName: data.display_name || "Unknown location",
      city: a.city || a.town || a.village || a.hamlet,
      country: a.country,
      countryCode: a.country_code?.toUpperCase(),
      road: a.road,
      neighbourhood: a.neighbourhood,
    };
  } catch (err) {
    logger.warn("[cirkle-maps] reverse geocode failed", {
      error: (err as Error).message,
      lat,
      lon,
    });
    return { displayName: "Unknown location" };
  }
}

/**
 * Compute a route between two coordinates via OSRM (free, public demo server).
 * `mode` is "driving" | "walking" | "cycling".
 * Returns `null` on any failure (network, parse, no route).
 */
export async function route(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  mode: RouteMode = "driving",
): Promise<RouteResult | null> {
  if (
    !isFinite(from.lat) || !isFinite(from.lon) ||
    !isFinite(to.lat) || !isFinite(to.lon)
  ) {
    return null;
  }
  const url =
    `${OSRM_BASE}/${mode}/${from.lon},${from.lat};${to.lon},${to.lat}` +
    `?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      logger.warn("[cirkle-maps] route non-OK", {
        status: res.status,
        mode,
      });
      return null;
    }
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { type: string; coordinates: [number, number][] };
      }>;
    };
    const r = data.routes?.[0];
    if (!r || !r.geometry || !Array.isArray(r.geometry.coordinates)) {
      return null;
    }
    return {
      distance: typeof r.distance === "number" ? r.distance : 0,
      duration: typeof r.duration === "number" ? r.duration : 0,
      geometry: {
        type: "LineString",
        coordinates: r.geometry.coordinates,
      },
    };
  } catch (err) {
    logger.warn("[cirkle-maps] route failed", {
      error: (err as Error).message,
      mode,
    });
    return null;
  }
}

/**
 * Find nearby points-of-interest around a lat/lon via the Overpass API.
 *
 * `category` is an OSM key=value pair like "amenity=cafe" or "shop=supermarket".
 * Returns up to 20 places sorted by distance, with `distance` pre-computed.
 *
 * Returns `[]` on any failure (network, parse, timeout).
 */
export async function findNearbyPlaces(
  lat: number,
  lon: number,
  radiusMeters: number,
  category: string,
): Promise<NearbyPlace[]> {
  const [k, v] = category.split("=");
  if (!k || !v) return [];
  if (!isFinite(lat) || !isFinite(lon)) return [];
  const radius = Math.min(Math.max(Math.floor(radiusMeters), 100), 10_000);
  const query = `[out:json][timeout:10];(${k}["${k}"="${v}"](around:${radius},${lat},${lon}););out body 20;`;
  try {
    const res = await fetch(OVERPASS_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: "data=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(NEARBY_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      elements?: Array<{
        type: string;
        id: number;
        lat?: number;
        lon?: number;
        tags?: Record<string, string>;
      }>;
    };
    const els = Array.isArray(data.elements) ? data.elements : [];
    return els
      .filter((e) => typeof e.lat === "number" && typeof e.lon === "number")
      .map((e) => ({
        id: `${e.type}-${e.id}`,
        name:
          e.tags?.name ||
          e.tags?.["name:en"] ||
          `${v} ${e.id}`,
        category: k,
        lat: e.lat as number,
        lon: e.lon as number,
        distance: haversine(lat, lon, e.lat as number, e.lon as number),
        tags: e.tags,
      }))
      .sort((a, b) => a.distance - b.distance);
  } catch (err) {
    logger.warn("[cirkle-maps] nearby places failed", {
      error: (err as Error).message,
      category,
    });
    return [];
  }
}

// ── Formatting helpers (also used by the API routes) ────────────────────────

export function formatDistance(meters: number): string {
  if (!isFinite(meters) || meters < 0) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} h` : `${h} h ${rem} m`;
}

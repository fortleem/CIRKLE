"use client";
export interface GeoPoint { lat: number; lon: number; displayName?: string; }
export interface NearbyPlace { id: string; name: string; category: string; lat: number; lon: number; distance?: number; tags?: Record<string, string>; }
export async function geocodeAddress(query: string, countryCode?: string): Promise<GeoPoint[]> {
  const params = new URLSearchParams({ format: "json", q: query, limit: "5", addressdetails: "1" });
  if (countryCode) params.set("countrycodes", countryCode.toLowerCase());
  try { const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "Accept-Language": "en", "User-Agent": "Cirkle/1.0" }, signal: AbortSignal.timeout(8000) }); if (!res.ok) return []; const data = await res.json(); return (data as any[]).map((d) => ({ lat: parseFloat(d.lat), lon: parseFloat(d.lon), displayName: d.display_name })); } catch { return []; }
}
export async function reverseGeocode(lat: number, lon: number) {
  try { const params = new URLSearchParams({ format: "json", lat: String(lat), lon: String(lon), "accept-language": "en", addressdetails: "1" }); const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: { "User-Agent": "Cirkle/1.0" }, signal: AbortSignal.timeout(8000) }); if (!res.ok) return { displayName: "Unknown location" }; const data = await res.json(); const a = data.address || {}; return { displayName: data.display_name || "Unknown", city: a.city || a.town || a.village, country: a.country, countryCode: a.country_code?.toUpperCase(), road: a.road, neighbourhood: a.neighbourhood }; } catch { return { displayName: "Unknown location" }; }
}
export async function findNearbyPlaces(lat: number, lon: number, radiusMeters: number, category: string): Promise<NearbyPlace[]> {
  const [k, v] = category.split("="); if (!k || !v) return [];
  const query = `[out:json][timeout:10];(${k}["${k}"="${v}"](around:${radiusMeters},${lat},${lon}););out body 20;`;
  try { const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Cirkle/1.0" }, body: "data=" + encodeURIComponent(query), signal: AbortSignal.timeout(12000) }); if (!res.ok) return []; const data = await res.json(); return ((data.elements || []) as any[]).filter((e) => e.lat && e.lon).map((e) => ({ id: `${e.type}-${e.id}`, name: e.tags?.name || e.tags?.["name:en"] || `${v} ${e.id}`, category: k, lat: e.lat, lon: e.lon, distance: haversineDistance(lat, lon, e.lat, e.lon), tags: e.tags })).sort((a, b) => (a.distance || 0) - (b.distance || 0)); } catch { return []; }
}
export async function getRoute(fromLat: number, fromLon: number, toLat: number, toLon: number) {
  try { const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(10000) }); if (!res.ok) return null; const data = await res.json(); const route = data.routes?.[0]; if (!route) return null; return { coordinates: (route.geometry.coordinates || []).map((c: [number, number]) => [c[1], c[0]] as [number, number]), distanceMeters: route.distance, durationSeconds: route.duration }; } catch { return null; }
}
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number { const R = 6371000; const dLat = ((lat2 - lat1) * Math.PI) / 180; const dLon = ((lon2 - lon1) * Math.PI) / 180; const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2); return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
export function formatDistance(meters: number): string { return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)} km`; }
export function formatDuration(seconds: number): string { if (seconds < 60) return `${Math.round(seconds)}s`; const m = Math.round(seconds / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`; }

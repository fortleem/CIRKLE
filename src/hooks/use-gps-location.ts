"use client";
import { useCallback, useEffect, useState } from "react";
import { reverseGeocode } from "@/lib/osm";
export interface GpsLocation { lat: number; lon: number; accuracy: number; displayName?: string; city?: string; country?: string; countryCode?: string; road?: string; neighbourhood?: string; }
export function useGpsLocation(options?: { watch?: boolean; enableHighAccuracy?: boolean; maximumAge?: number; timeout?: number }) {
  const { watch = false, enableHighAccuracy = false, maximumAge = 300000, timeout = 10000 } = options || {};
  const [location, setLocation] = useState<GpsLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchLocation = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setError("Geolocation not supported"); return; }
    setLoading(true); setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => { navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy, maximumAge, timeout }); });
      const { latitude, longitude, accuracy } = pos.coords;
      const base: GpsLocation = { lat: latitude, lon: longitude, accuracy };
      try { const rev = await reverseGeocode(latitude, longitude); setLocation({ ...base, ...rev }); } catch { setLocation(base); }
    } catch (err: unknown) { if ((err as GeolocationPositionError)?.code === 1) setError("Location permission denied"); else if ((err as GeolocationPositionError)?.code === 2) setError("Position unavailable"); else if ((err as GeolocationPositionError)?.code === 3) setError("Location request timed out"); else setError((err as Error)?.message || "Failed to get location"); }
    finally { setLoading(false); }
  }, [enableHighAccuracy, maximumAge, timeout]);
  useEffect(() => { if (!watch || typeof navigator === "undefined" || !navigator.geolocation) return; const id = navigator.geolocation.watchPosition((pos) => { setLocation((prev) => ({ ...prev, lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy })); }, (err) => setError(err.message), { enableHighAccuracy, maximumAge, timeout }); return () => navigator.geolocation.clearWatch(id); }, [watch, enableHighAccuracy, maximumAge, timeout]);
  return { location, loading, error, fetch: fetchLocation };
}

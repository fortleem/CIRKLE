"use client";

/**
 * Cirkle Maps overlay — Blueprint §23 (OSM-based, privacy-first, no tracking).
 *
 * Layout:
 *   • Search bar (forward geocode via /api/maps/geocode)
 *   • Interactive map view (OpenStreetMap embed iframe — no API key, no
 *     tracking cookies)
 *   • Route planner (from / to inputs, mode selector, distance / duration)
 *     powered by OSRM via /api/maps/route
 *   • Nearby places (uses the existing regional services data — landmarks,
 *     major cities, and local brands for the user's country, sourced from
 *     src/lib/countries.ts)
 *
 * Open via the `circle:cirkle-maps` event (registered in page.tsx +
 * overlay-registry.ts).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Map as MapIcon,
  Search,
  Navigation,
  Loader2,
  MapPin,
  Compass,
  Clock,
  Route as RouteIcon,
  Car,
  Footprints,
  Bike,
  Building2,
  Landmark,
  Store,
  RefreshCw,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-store";
import { getCountry } from "@/lib/countries";
import { FeedbackButton } from "@/components/ui/feedback-button";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GeoResult {
  lat: number;
  lon: number;
  display_name: string;
}

interface RouteResult {
  mode: string;
  distance: number;
  duration: number;
  distanceLabel: string;
  durationLabel: string;
  from: { lat: number; lon: number };
  to: { lat: number; lon: number };
}

type RouteMode = "driving" | "walking" | "cycling";

const MODE_META: Record<RouteMode, { label: string; icon: LucideIcon }> = {
  driving: { label: "Driving", icon: Car },
  walking: { label: "Walking", icon: Footprints },
  cycling: { label: "Cycling", icon: Bike },
};

const DEFAULT_CENTER = { lat: 24.7136, lon: 46.6753 }; // Riyadh

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CirkleMaps({ open, onClose }: Props) {
  const { country } = useApp();
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [from, setFrom] = useState<GeoResult | null>(null);
  const [to, setTo] = useState<GeoResult | null>(null);
  const [mode, setMode] = useState<RouteMode>("driving");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  // ── Search ──────────────────────────────────────────────────────────────
  const runSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/maps/geocode?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { results?: GeoResult[] };
      setSearchResults(data.results || []);
      setShowResults(true);
      if ((data.results || []).length === 0) {
        toast("No results", { description: `No matches for "${q}".` });
      }
    } catch (e) {
      toast.error("Search failed", {
        description: String((e as Error).message || e),
      });
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Debounced search — fire when the user pauses typing for 400ms.
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const t = setTimeout(() => void runSearch(), 400);
    return () => clearTimeout(t);
  }, [searchQuery, runSearch]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!showResults) return;
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [showResults]);

  const pickResult = (r: GeoResult) => {
    setCenter(r);
    setShowResults(false);
    setSearchQuery(r.display_name);
  };

  // ── Route ──────────────────────────────────────────────────────────────
  const computeRoute = useCallback(async () => {
    if (!from || !to) {
      toast.error("Pick both a start and end point.");
      return;
    }
    setRouting(true);
    setRouteError(null);
    try {
      const url =
        `/api/maps/route?from=${from.lat},${from.lon}&to=${to.lat},${to.lon}` +
        `&mode=${mode}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as RouteResult;
      setRoute(data);
      // Pan the map to fit the midpoint so both endpoints are visible-ish.
      const midLat = (from.lat + to.lat) / 2;
      const midLon = (from.lon + to.lon) / 2;
      setCenter({ lat: midLat, lon: midLon });
    } catch (e) {
      const msg = String((e as Error).message || e);
      setRouteError(msg);
      toast.error("Couldn't compute route", { description: msg });
    } finally {
      setRouting(false);
    }
  }, [from, to, mode]);

  // ── Map embed URL ────────────────────────────────────────────────────────
  const mapEmbedUrl = useMemo(() => {
    const d = 0.05; // bbox delta in degrees
    const bbox = `${center.lon - d},${center.lat - d},${center.lon + d},${center.lat + d}`;
    const marker = `&marker=${center.lat},${center.lon}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${marker}`;
  }, [center]);

  // ── Nearby places — sourced from the regional services data ──────────────
  // Uses the existing COUNTRIES landmark / city / brand catalogue so we don't
  // need an extra Overpass round-trip in the common case.
  const nearby = useMemo(() => {
    const c = getCountry(country || "SA");
    const landmarks = (c?.landmarks || []).slice(0, 6).map((name) => ({
      id: `lm-${name}`,
      name,
      kind: "Landmark",
      icon: Landmark,
    }));
    const cities = (c?.majorCities || []).slice(0, 4).map((name) => ({
      id: `city-${name}`,
      name,
      kind: "City",
      icon: Building2,
    }));
    const brands = (c?.localBrands || []).slice(0, 4).map((name) => ({
      id: `brand-${name}`,
      name,
      kind: "Local brand",
      icon: Store,
    }));
    return [...landmarks, ...cities, ...brands];
  }, [country]);

  const countryInfo = useMemo(() => getCountry(country || "SA"), [country]);

  // Click a nearby place → geocode it → set as center.
  const focusPlace = useCallback(async (name: string) => {
    setSearchQuery(name);
    setSearching(true);
    try {
      const res = await fetch(
        `/api/maps/geocode?q=${encodeURIComponent(name)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { results?: GeoResult[] };
      const first = data.results?.[0];
      if (first) {
        setCenter(first);
        setSearchQuery(first.display_name);
      }
    } catch {
      /* best-effort */
    } finally {
      setSearching(false);
    }
  }, []);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Cirkle Maps — free OSM maps, routing, geocoding"
    >
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 backdrop-blur-xl bg-background/80 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/15 border border-border/40 flex items-center justify-center shrink-0">
            <MapIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight">Cirkle Maps</h1>
            <p className="text-[11px] text-muted-foreground">
              Free OSM maps · routing · geocoding. Privacy-first, no tracking.
            </p>
          </div>
          <FeedbackButton overlayName="Cirkle Maps" />
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search box */}
        <div className="max-w-5xl mx-auto mt-3" ref={searchBoxRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runSearch();
                }
              }}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="Search any address, city, or place…"
              className="pl-9 pr-9"
              aria-label="Search places"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-border/60 bg-popover shadow-float overflow-hidden max-h-72 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button
                    key={`${r.lat},${r.lon},${i}`}
                    onClick={() => pickResult(r)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/60 transition flex items-start gap-2"
                  >
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm leading-tight line-clamp-2">
                      {r.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-w-5xl mx-auto w-full px-5 py-5 space-y-4">
        {/* Map iframe */}
        <div className="rounded-2xl overflow-hidden border border-border/60 bg-card/40">
          <div className="relative w-full" style={{ aspectRatio: "16 / 10" }}>
            <iframe
              title="Cirkle Maps — OpenStreetMap"
              src={mapEmbedUrl}
              className="absolute inset-0 w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="absolute bottom-2 right-2 text-[10px] bg-background/80 backdrop-blur px-2 py-1 rounded-full border border-border/40">
              © OpenStreetMap contributors
            </div>
          </div>
          <div className="p-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono">
              {center.lat.toFixed(4)}, {center.lon.toFixed(4)}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span>Center of the visible map</span>
          </div>
        </div>

        {/* Route planner */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <RouteIcon className="w-4 h-4 text-primary" />
            <h2 className="font-display text-base">Route planner</h2>
            <span className="text-[11px] text-muted-foreground">
              Powered by OSRM (free, no API key)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <GeoPicker
              label="From"
              value={from}
              onChange={setFrom}
              placeholder="Pick a start point…"
            />
            <GeoPicker
              label="To"
              value={to}
              onChange={setTo}
              placeholder="Pick a destination…"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="space-y-1 flex-1">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Mode
              </span>
              <Select value={mode} onValueChange={(v) => setMode(v as RouteMode)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MODE_META) as RouteMode[]).map((m) => {
                    const M = MODE_META[m].icon;
                    return (
                      <SelectItem key={m} value={m}>
                        <span className="inline-flex items-center gap-2">
                          <M className="w-4 h-4" />
                          {MODE_META[m].label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={computeRoute} disabled={routing || !from || !to}>
              {routing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4 mr-1" />
              )}
              Compute route
            </Button>
          </div>

          {routeError && (
            <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{routeError}</span>
            </div>
          )}

          {route && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
              <RouteStat icon={RouteIcon} label="Distance" value={route.distanceLabel} />
              <RouteStat icon={Clock} label="Duration" value={route.durationLabel} />
              <RouteStat
                icon={MODE_META[route.mode as RouteMode]?.icon || Car}
                label="Mode"
                value={MODE_META[route.mode as RouteMode]?.label || route.mode}
              />
              <RouteStat
                icon={Compass}
                label="Direct"
                value={`${haversineKm(route.from, route.to).toFixed(1)} km`}
              />
            </div>
          )}
        </section>

        {/* Nearby places — from existing regional services data */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-secondary" />
              <h2 className="font-display text-base">
                Nearby in {countryInfo?.name || "your region"}
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground">
              From Cirkle&apos;s regional catalogue
            </span>
          </div>
          {nearby.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No regional data for your country yet.
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {nearby.map((p) => {
                const Icon = p.icon;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => void focusPlace(p.name)}
                      className="w-full text-left rounded-xl border border-border/40 hover:border-border/80 hover:bg-muted/40 transition p-3 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-secondary/20 to-primary/10 border border-border/40 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.kind}</p>
                      </div>
                      <MapPin className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground">
            Tap any place to center the map on it. Routing + geocoding run via
            free OpenStreetMap & OSRM servers — no API key, no tracking.
          </p>
        </section>
      </div>
    </OverlayShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GeoPicker — a search-as-you-type input that turns into a chip once a place
// is chosen.
// ─────────────────────────────────────────────────────────────────────────────

function GeoPicker({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: GeoResult | null;
  onChange: (v: GeoResult | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/maps/geocode?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { results?: GeoResult[] };
          setResults(data.results || []);
        }
      } catch {
        /* best-effort */
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="space-y-1" ref={boxRef}>
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {value ? (
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm flex-1 truncate">{value.display_name}</span>
          <button
            onClick={() => {
              onChange(null);
              setQ("");
            }}
            className="text-muted-foreground hover:text-accent"
            aria-label={`Clear ${label}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className="pl-9 pr-9"
            aria-label={label}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
          {open && results.length > 0 && (
            <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-border/60 bg-popover shadow-float overflow-hidden max-h-60 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={`${r.lat},${r.lon},${i}`}
                  onClick={() => {
                    onChange(r);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted/60 transition flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm leading-tight line-clamp-2">
                    {r.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small bits
// ─────────────────────────────────────────────────────────────────────────────

function RouteStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-gradient-to-br from-primary/10 to-secondary/5 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      <p className="font-display text-lg mt-0.5">{value}</p>
    </div>
  );
}

function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6_371; // km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

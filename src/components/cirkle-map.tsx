"use client";
import { useEffect, useRef } from "react";
import type LType from "leaflet";
import "leaflet/dist/leaflet.css";
export interface MapMarker { lat: number; lon: number; label?: string; emoji?: string; color?: string; }
export interface CirkleMapProps { center: [number, number]; zoom?: number; markers?: MapMarker[]; showUserLocation?: boolean; userLocation?: [number, number] | null; route?: Array<[number, number]> | null; onLocationSelect?: (lat: number, lon: number) => void; className?: string; height?: string; }
export function CirkleMap({ center, zoom = 13, markers = [], showUserLocation = false, userLocation = null, route = null, onLocationSelect, className = "", height = "300px" }: CirkleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const layerRef = useRef<LType.LayerGroup | null>(null);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default as typeof LType;
      if (cancelled || !containerRef.current) return;
      const map = L.map(containerRef.current, { center, zoom, zoomControl: true, attributionControl: true });
      const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
      L.tileLayer(isDark ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      if (onLocationSelect) map.on("click", (e: { latlng: { lat: number; lng: number } }) => onLocationSelect(e.latlng.lat, e.latlng.lng));
      mapRef.current = map;
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; layerRef.current = null; } };
  }, []);
  useEffect(() => {
    if (!layerRef.current || !mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default as typeof LType;
      if (!layerRef.current) return;
      layerRef.current.clearLayers();
      for (const m of markers) {
        const icon = m.emoji ? L.divIcon({ html: `<div style="font-size:24px;transform:translateY(-12px);">${m.emoji}</div>`, className: "", iconSize: [30, 30], iconAnchor: [15, 15] }) : undefined;
        const marker = L.marker([m.lat, m.lon], icon ? { icon } : {}).addTo(layerRef.current);
        if (m.label) marker.bindPopup(m.label);
      }
      if (showUserLocation && userLocation) { const icon = L.divIcon({ html: `<div style="width:16px;height:16px;border-radius:50%;background:hsl(var(--gold));border:3px solid white;box-shadow:0 0 12px hsl(var(--gold)/0.6);"></div>`, className: "", iconSize: [22, 22], iconAnchor: [11, 11] }); L.marker(userLocation, { icon }).addTo(layerRef.current).bindPopup("Your location"); }
      if (route && route.length > 1) L.polyline(route, { color: "hsl(var(--gold))", weight: 4, opacity: 0.8, dashArray: "8, 6" }).addTo(layerRef.current);
    })();
  }, [markers, showUserLocation, userLocation, route]);
  useEffect(() => { if (mapRef.current) mapRef.current.setView(center, zoom); }, [center, zoom]);
  return <div ref={containerRef} className={`rounded-2xl overflow-hidden border border-border ${className}`} style={{ height, width: "100%" }} />;
}

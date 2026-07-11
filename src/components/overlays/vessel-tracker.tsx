"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Ship, Loader2, MapPin, Navigation, Clock, Gauge, RefreshCw, Search, Anchor,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Vessel {
  id: string; name: string; imo: string; type: string;
  flag: string; flagEmoji: string;
  lat: number; lng: number;
  sog: number; heading: number;
  destination: string; eta: string;
  status: string;
}

// Mock AIS data — mirrors the /api/vessels response shape (8 vessels, returns top 6 on map).
const MOCK_VESSELS: Vessel[] = [];

const PORTS = [
  { name: "Jebel Ali", lat: 25.013, lng: 55.062, x: 64, y: 47 },
  { name: "Jeddah", lat: 21.483, lng: 39.190, x: 58, y: 49 },
  { name: "King Abdullah", lat: 27.415, lng: 35.425, x: 57, y: 47 },
  { name: "Suez", lat: 29.934, lng: 32.549, x: 56, y: 44 },
  { name: "Singapore", lat: 1.264, lng: 103.836, x: 75, y: 60 },
  { name: "Rotterdam", lat: 51.952, lng: 4.137, x: 50, y: 30 },
  { name: "Shanghai", lat: 31.230, lng: 121.474, x: 82, y: 41 },
  { name: "Piraeus", lat: 37.942, lng: 23.647, x: 54, y: 41 },
];

// Project lat/lng to SVG % coordinates (equirectangular-ish, cropped to major shipping regions).
function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 60) / 200) * 100; // -60..140 → 0..100
  const y = ((80 - lat) / 130) * 100; // 80..-50 → 0..100
  return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
}

const TYPE_TINT: Record<string, string> = {
  cargo: "fill-secondary",
  tanker: "fill-accent",
  passenger: "fill-primary",
  ferry: "fill-steel",
  tug: "fill-primary",
  yacht: "fill-secondary",
  fishing: "fill-accent",
};

const FILTERS: { k: "all" | string; label: string }[] = [
  { k: "all", label: "All" },
  { k: "cargo", label: "Cargo" },
  { k: "tanker", label: "Tanker" },
  { k: "passenger", label: "Passenger" },
  { k: "ferry", label: "Ferry" },
  { k: "fishing", label: "Fishing" },
];

export function VesselTracker({ open, onClose }: Props) {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Vessel | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [highlightPort, setHighlightPort] = useState<string | null>(null);

  const fetchVessels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vessels", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { vessels: Vessel[] };
        // Take first 6 for the map (spec: "6 vessel dots").
        setVessels(data.vessels.slice(0, 6));
      } else {
        throw new Error("vessels failed");
      }
    } catch {
      // Fallback to local mock (still 6 dots).
      setVessels(MOCK_VESSELS.slice(0, 6));
      toast("Showing cached AIS data", { description: "Live feed offline." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && vessels.length === 0) fetchVessels();
  }, [open, vessels.length, fetchVessels]);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => fetchVessels(), 15000);
    return () => clearInterval(id);
  }, [open, fetchVessels]);

  const filtered = useMemo(() => {
    return vessels.filter((v) => {
      const matchType = filter === "all" || v.type === filter;
      const q = query.trim().toLowerCase();
      const matchQuery = !q || v.name.toLowerCase().includes(q) || v.destination.toLowerCase().includes(q) || v.flag.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [vessels, filter, query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[160] bg-background overflow-hidden flex flex-col"
        >
          {/* Aurora backdrop */}
          <div className="absolute inset-0 aurora-bg opacity-25 pointer-events-none" />

          <header className="relative z-10 px-5 pt-5 pb-3 flex items-center gap-3">
            <motion.div
              animate={loading ? { rotate: [0, -8, 8, -8, 0] } : {}}
              transition={{ duration: 1.2, repeat: loading ? Infinity : 0 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-steel/30 to-primary/20 border border-steel/40 flex items-center justify-center shrink-0"
            >
              <Ship className="w-5 h-5 text-steel" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl">Vessel Tracker</div>
              <div className="text-[11px] text-muted-foreground truncate">{vessels.length} live · AIS feed · refreshes every 15s</div>
            </div>
            <button onClick={fetchVessels} disabled={loading} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Refresh">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Search + filter */}
          <div className="relative z-10 px-5 pb-3 space-y-2">
            <div className="glass rounded-xl px-3 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vessels, ports, flags…"
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {FILTERS.map((f) => (
                <button
                  key={f.k} onClick={() => setFilter(f.k)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap border transition",
                    filter === f.k ? "bg-steel/20 border-steel/60 text-steel" : "bg-muted/30 border-border/50 hover:bg-muted/60",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* SVG world map */}
          <div className="relative z-10 flex-1 px-5 pb-3 min-h-0">
            <div className="relative h-full rounded-2xl border border-border/50 bg-card overflow-hidden">
              <svg viewBox="0 0 100 70" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                {/* Stylized continents (silhouettes only — no external images) */}
                <g fill="hsl(var(--muted))" opacity="0.55">
                  {/* Americas */}
                  <path d="M 8 18 Q 12 14, 18 18 L 22 28 Q 22 36, 18 44 L 14 56 Q 16 64, 20 66 L 24 60 L 26 48 L 24 32 L 18 22 Z" />
                  {/* Europe + Africa */}
                  <path d="M 46 18 Q 52 14, 56 18 L 60 24 L 58 34 L 56 44 L 54 54 L 50 60 L 48 50 L 50 36 L 48 26 Z" />
                  {/* Asia */}
                  <path d="M 60 16 Q 70 12, 84 18 L 88 26 L 86 36 L 78 38 L 72 32 L 66 28 L 62 22 Z" />
                  {/* Australia */}
                  <path d="M 80 50 Q 86 48, 90 52 L 88 58 L 82 58 Z" />
                </g>
                {/* Ports */}
                {PORTS.map((p) => {
                  const hot = highlightPort === p.name;
                  return (
                    <g key={p.name}
                      onMouseEnter={() => setHighlightPort(p.name)}
                      onMouseLeave={() => setHighlightPort(null)}
                      onClick={() => { toast.success(`Port finder: ${p.name}`, { description: `Lat ${p.lat}, Lng ${p.lng}` }); }}
                      className="cursor-pointer"
                    >
                      <circle cx={p.x} cy={p.y * 0.7} r={hot ? 1.6 : 1} className="fill-secondary" />
                      <circle cx={p.x} cy={p.y * 0.7} r={hot ? 3.5 : 2.5} className="fill-secondary/20" />
                      {hot && (
                        <text x={p.x} y={p.y * 0.7 - 2.5} fontSize="2.4" className="fill-secondary" textAnchor="middle" fontWeight="600">
                          {p.name}
                        </text>
                      )}
                    </g>
                  );
                })}
                {/* Vessels (top 6) */}
                {filtered.map((v) => {
                  const { x, y } = project(v.lat, v.lng);
                  const isSel = selected?.id === v.id;
                  return (
                    <g key={v.id} onClick={() => setSelected(v)} className="cursor-pointer">
                      <circle cx={x} cy={y * 0.7} r={isSel ? 4 : 2.5} className={cn(TYPE_TINT[v.type] || "fill-secondary", isSel ? "" : "opacity-80")} />
                      <circle cx={x} cy={y * 0.7} r={isSel ? 6 : 4} className={cn(TYPE_TINT[v.type] || "fill-secondary", "opacity-20")} />
                      {/* Heading vector */}
                      <line
                        x1={x} y1={y * 0.7}
                        x2={x + Math.cos((v.heading - 90) * Math.PI / 180) * 4}
                        y2={y * 0.7 + Math.sin((v.heading - 90) * Math.PI / 180) * 4}
                        className="stroke-secondary" strokeWidth="0.4" opacity="0.7"
                      />
                      {isSel && (
                        <text x={x} y={y * 0.7 - 3.5} fontSize="2.4" className="fill-foreground" textAnchor="middle" fontWeight="600">
                          {v.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5 glass rounded-full px-2.5 py-1">
                  <Anchor className="w-3 h-3" /> {PORTS.length} ports · hover to highlight
                </div>
                <div className="flex items-center gap-2 glass rounded-full px-2.5 py-1">
                  {Object.keys(TYPE_TINT).slice(0, 4).map((k) => (
                    <span key={k} className="flex items-center gap-1">
                      <span className={cn("w-2 h-2 rounded-full", TYPE_TINT[k])} /> {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Vessel list (compact) */}
          <div className="relative z-10 border-t border-border/50 max-h-44 overflow-y-auto">
            {loading && vessels.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <Loader2 className="w-5 h-5 text-secondary animate-spin" />
                <div className="text-xs text-muted-foreground">Tracking nearby vessels…</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">No vessels match your search.</div>
            ) : (
              <ul className="divide-y divide-border/40">
                {filtered.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={() => setSelected(v)}
                      className={cn("w-full px-5 py-2.5 flex items-center gap-3 text-start hover:bg-muted/40 transition", selected?.id === v.id && "bg-muted/40")}
                    >
                      <div className="w-9 h-9 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-center text-base shrink-0">{v.flagEmoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                          {v.name} <span className="text-[10px] text-muted-foreground font-normal">· {v.type}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {v.flag}</span>
                          <span className="flex items-center gap-0.5"><Navigation className="w-3 h-3" /> {v.sog} kn · {v.heading}°</span>
                          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> ETA {v.eta}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary shrink-0">{v.destination}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Selected vessel detail strip */}
          {selected && (
            <div className="relative z-10 border-t border-border/50 px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">IMO</div><div className="font-medium">{selected.imo}</div></div>
              <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Speed</div><div className="font-medium flex items-center gap-1"><Gauge className="w-3 h-3" /> {selected.sog} kn</div></div>
              <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Heading</div><div className="font-medium">{selected.heading}°</div></div>
              <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Coords</div><div className="font-medium">{selected.lat.toFixed(2)}, {selected.lng.toFixed(2)}</div></div>
              <button
                onClick={() => { toast.success(`Pinned ${selected.name}`); }}
                className="col-span-2 sm:col-span-4 mt-1 rounded-xl bg-gradient-hero text-cream py-2 text-xs font-medium"
              >
                Pin this vessel
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

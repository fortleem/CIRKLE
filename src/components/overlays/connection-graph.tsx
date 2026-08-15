"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  X, Sparkles, Users, ZoomIn, ZoomOut, Maximize2, ArrowLeft,
  MapPin, Hash, MessageCircle, UserPlus, Check, Network,
  Loader2, RefreshCw, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { CircleAvatar } from "@/components/brand/circle-avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Node / Edge model ──────────────────────────────────────────────────────

type ModuleTint = "teal" | "gold" | "rose" | "steel" | "charcoal";

interface GraphNode {
  id: string;
  label: string;
  /** Module association — drives node color. */
  module: "wasl" | "midan" | "lamahat" | "mashahd" | "rihla" | "self";
  /** Interaction frequency 0..100 — drives node radius. */
  weight: number;
  /** Node type for the legend. */
  kind: "self" | "friend" | "circle" | "creator";
  /** Avatar initials. */
  initials: string;
  /** Sub-text shown in the contact card. */
  subtitle: string;
  /** Optional mutual circles count for the contact card. */
  mutualCircles?: number;
  /** Optional shared interests. */
  sharedInterests?: string[];
  /** Optional location. */
  location?: string;
  /** Whether the user is already following this node. */
  following?: boolean;
  /** Position in normalized [-1, 1] x [-1, 1] space. */
  x: number;
  y: number;
}

interface GraphEdge {
  source: string;
  target: string;
  /** Edge type — drives stroke style. */
  kind: "follow" | "mutual-circle" | "shared-interest";
  /** Strength 0..1 — drives opacity. */
  strength: number;
}

// ── Mock graph ─────────────────────────────────────────────────────────────

const NODES: GraphNode[] = [
  { id: "self", label: "You", module: "self", weight: 100, kind: "self", initials: "ME", subtitle: "@you · Cairo, Egypt", location: "Cairo, Egypt", x: 0, y: 0 },

  // ── Wasl (teal) ──
  { id: "layla", label: "Layla Hassan", module: "wasl", weight: 82, kind: "friend", initials: "LH", subtitle: "@layla.h · 1.2k followers", mutualCircles: 3, sharedInterests: ["coffee", "design"], location: "Cairo, Egypt", following: true, x: -0.55, y: -0.35 },
  { id: "omar", label: "Omar Khalil", module: "wasl", weight: 65, kind: "friend", initials: "OK", subtitle: "@omar.k · 540 followers", mutualCircles: 2, sharedInterests: ["football"], location: "Giza, Egypt", following: true, x: 0.5, y: -0.5 },
  { id: "hassan", label: "Hassan Maged", module: "wasl", weight: 38, kind: "friend", initials: "HM", subtitle: "@hassan.m · 230 followers", mutualCircles: 1, sharedInterests: [], location: "Alexandria, Egypt", following: true, x: -0.4, y: 0.55 },

  // ── Midan (gold) ──
  { id: "yasmin", label: "Yasmin Adel", module: "midan", weight: 71, kind: "creator", initials: "YA", subtitle: "@yasmin.a · 8.4k followers", mutualCircles: 1, sharedInterests: ["writing", "books"], location: "Cairo, Egypt", following: true, x: 0.7, y: 0.15 },
  { id: "karim", label: "Karim Nabil", module: "midan", weight: 44, kind: "creator", initials: "KN", subtitle: "@karim.n · 2.1k followers", mutualCircles: 0, sharedInterests: ["startups"], location: "Dubai, UAE", following: false, x: 0.62, y: 0.65 },

  // ── Lamahat (rose) ──
  { id: "nour", label: "Nour Hany", module: "lamahat", weight: 58, kind: "friend", initials: "NH", subtitle: "@nour.h · 980 followers", mutualCircles: 2, sharedInterests: ["photography"], location: "Cairo, Egypt", following: true, x: -0.78, y: 0.1 },

  // ── Mashahd (steel) ──
  { id: "mariam", label: "Mariam Sami", module: "mashahd", weight: 33, kind: "creator", initials: "MS", subtitle: "@mariam.s · 15k followers", mutualCircles: 0, sharedInterests: ["travel", "video"], location: "Riyadh, KSA", following: false, x: 0.18, y: -0.78 },

  // ── Circles (charcoal) ──
  { id: "circle-cairo", label: "Cairo Foodies", module: "midan", weight: 52, kind: "circle", initials: "CF", subtitle: "184 members · 4 weekly posts", mutualCircles: undefined, sharedInterests: ["food"], location: "Cairo, Egypt", x: -0.2, y: -0.7 },
  { id: "circle-dev", label: "Cairo Devs", module: "wasl", weight: 47, kind: "circle", initials: "CD", subtitle: "92 members · active chat", mutualCircles: undefined, sharedInterests: ["code", "startups"], location: "Cairo, Egypt", x: 0.32, y: 0.8 },
  { id: "circle-photo", label: "Lens & Light", module: "lamahat", weight: 29, kind: "circle", initials: "LL", subtitle: "67 members · weekly photo walk", mutualCircles: undefined, sharedInterests: ["photography"], location: "Cairo, Egypt", x: -0.85, y: -0.65 },
];

const EDGES: GraphEdge[] = [
  // self ↔ friends
  { source: "self", target: "layla",   kind: "follow",         strength: 0.9 },
  { source: "self", target: "omar",    kind: "follow",         strength: 0.8 },
  { source: "self", target: "hassan",  kind: "follow",         strength: 0.5 },
  { source: "self", target: "nour",    kind: "follow",         strength: 0.7 },
  // self ↔ creators
  { source: "self", target: "yasmin",  kind: "follow",         strength: 0.75 },
  { source: "self", target: "karim",   kind: "follow",         strength: 0.4 },
  { source: "self", target: "mariam",  kind: "follow",         strength: 0.3 },
  // self ↔ circles
  { source: "self", target: "circle-cairo", kind: "mutual-circle", strength: 0.6 },
  { source: "self", target: "circle-dev",   kind: "mutual-circle", strength: 0.55 },
  { source: "self", target: "circle-photo", kind: "mutual-circle", strength: 0.4 },
  // friend ↔ friend (mutual circles)
  { source: "layla",   target: "nour", kind: "mutual-circle",  strength: 0.7 },
  { source: "layla",   target: "omar", kind: "shared-interest", strength: 0.5 },
  { source: "omar",    target: "yasmin", kind: "shared-interest", strength: 0.4 },
  { source: "hassan",  target: "nour", kind: "shared-interest", strength: 0.3 },
  // friend ↔ circle
  { source: "layla",   target: "circle-cairo", kind: "mutual-circle", strength: 0.65 },
  { source: "nour",    target: "circle-photo", kind: "mutual-circle", strength: 0.7 },
  { source: "omar",    target: "circle-dev",   kind: "mutual-circle", strength: 0.55 },
  { source: "yasmin",  target: "circle-cairo", kind: "mutual-circle", strength: 0.5 },
];

// ── Module colors ──────────────────────────────────────────────────────────

const MODULE_COLOR: Record<GraphNode["module"], { fill: string; stroke: string; label: string; tint: ModuleTint }> = {
  wasl:    { fill: "#5b9aa0", stroke: "#3e7178", label: "Wasl",    tint: "teal" },
  midan:   { fill: "#f5b324", stroke: "#b5840c", label: "Midan",   tint: "gold" },
  lamahat: { fill: "#d98a8a", stroke: "#a35f5f", label: "Lamahat", tint: "rose" },
  mashahd: { fill: "#6b7c8c", stroke: "#445363", label: "Mashahd", tint: "steel" },
  rihla:   { fill: "#8a9a5b", stroke: "#5e6e3a", label: "Rihla",   tint: "charcoal" },
  self:    { fill: "#2f3437", stroke: "#1f2326", label: "You",     tint: "charcoal" },
};

const EDGE_COLOR: Record<GraphEdge["kind"], string> = {
  follow: "#94a3b8",
  "mutual-circle": "#5b9aa0",
  "shared-interest": "#d98a8a",
};

const EDGE_DASH: Record<GraphEdge["kind"], string | undefined> = {
  follow: undefined,
  "mutual-circle": "3 3",
  "shared-interest": "1 4",
};

// ── Suggestions ────────────────────────────────────────────────────────────

interface Suggestion {
  id: string;
  label: string;
  subtitle: string;
  reason: string;
  initials: string;
  tint: ModuleTint;
}

const SUGGESTIONS: Suggestion[] = [
  { id: "salma", label: "Salma Wagdy", subtitle: "@salma.w · 1.8k followers", reason: "In 2 of your circles · Same city (Cairo)", initials: "SW", tint: "rose" },
  { id: "tarek", label: "Tarek Fouad", subtitle: "@tarek.f · 720 followers",  reason: "Mutual friend: Layla Hassan", initials: "TF", tint: "teal" },
  { id: "aya",   label: "Aya Reda",    subtitle: "@aya.r · 3.4k followers",   reason: "Shares your interest in photography", initials: "AR", tint: "gold" },
  { id: "faris", label: "Faris Adel",  subtitle: "@faris.a · 920 followers",  reason: "In Lens & Light circle · Same city", initials: "FA", tint: "steel" },
];

// ── Component ──────────────────────────────────────────────────────────────

export function ConnectionGraph({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username ?? "you";

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [followedSuggestions, setFollowedSuggestions] = useState<Set<string>>(new Set());
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  // Simulate latency so the loading state is visible. setState is called
  // inside the async setTimeout so we don't trigger synchronous
  // setState-in-effect cascading renders.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setHydrated(true), 600);
    return () => clearTimeout(t);
  }, [open, refreshTick]);

  // Derived loading state — true whenever the overlay is open but we haven't
  // hydrated yet (initial mount, or after a refresh).
  const loading = open && !hydrated;

  const selected = useMemo(
    () => NODES.find((n) => n.id === selectedId) ?? null,
    [selectedId],
  );

  // ── Pan + zoom helpers ─────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).tagName === "circle") return; // node click handled separately
    draggingRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - draggingRef.current.startX;
    const dy = e.clientY - draggingRef.current.startY;
    setPan({ x: draggingRef.current.panX + dx, y: draggingRef.current.panY + dy });
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    draggingRef.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };
  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    // Pinch / scroll-to-zoom — keep it bounded.
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.max(0.5, Math.min(2.5, z + delta)));
  };

  const refresh = () => {
    setHydrated(false);
    setRefreshTick((t) => t + 1);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedId(null);
  };

  // ── Layout ─────────────────────────────────────────────────────────────
  // We render the graph in an SVG that uses a 0..600 x 0..600 viewBox.
  // Node positions are normalized [-1, 1] → mapped to [50, 550].
  const SIZE = 600;
  const PAD = 60;
  const toSvg = (v: number) => PAD + ((v + 1) / 2) * (SIZE - 2 * PAD);
  const radiusFor = (w: number) => 8 + (w / 100) * 28; // 8..36

  const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-6xl" ariaLabel="Connection Graph">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Network className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Your Connection Graph</h2>
              <p className="text-xs text-muted-foreground">Visual network · @{username} · {NODES.length - 1} connections</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading} aria-label="Refresh">
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} /> Refresh
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_320px]">
          {/* ── Left: graph ───────────────────────────────────────────── */}
          <div className="relative bg-muted/10 border-b md:border-b-0 md:border-r border-border/40">
            {/* Zoom controls */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg shadow-sm" onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))} aria-label="Zoom in">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg shadow-sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))} aria-label="Zoom out">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg shadow-sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Reset view">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 max-w-[60%]">
              {(Object.keys(MODULE_COLOR) as GraphNode["module"][]).map((m) => (
                <span key={m} className="inline-flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur px-2 py-1 text-[10px] border border-border/40">
                  <span className="w-2 h-2 rounded-full" style={{ background: MODULE_COLOR[m].fill }} />
                  {MODULE_COLOR[m].label}
                </span>
              ))}
            </div>

            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Mapping your connections…</p>
              </div>
            ) : (
              <svg
                ref={svgRef}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="w-full h-full min-h-[420px] md:min-h-[560px] touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onWheel={onWheel}
                role="img"
                aria-label="Connection graph — drag to pan, scroll to zoom, click a node for details"
              >
                <g transform={transform}>
                  {/* Edges first so nodes render on top */}
                  <g>
                    {EDGES.map((e, i) => {
                      const s = NODES.find((n) => n.id === e.source);
                      const t = NODES.find((n) => n.id === e.target);
                      if (!s || !t) return null;
                      const isActive = selectedId && (e.source === selectedId || e.target === selectedId);
                      return (
                        <line
                          key={`e-${i}`}
                          x1={toSvg(s.x)} y1={toSvg(s.y)}
                          x2={toSvg(t.x)} y2={toSvg(t.y)}
                          stroke={EDGE_COLOR[e.kind]}
                          strokeOpacity={isActive ? 0.85 : 0.25 + e.strength * 0.25}
                          strokeWidth={isActive ? 2 : 1}
                          strokeDasharray={EDGE_DASH[e.kind]}
                        />
                      );
                    })}
                  </g>

                  {/* Nodes */}
                  <g>
                    {NODES.map((n) => {
                      const r = radiusFor(n.weight);
                      const isSelected = selectedId === n.id;
                      const isHover = hoverId === n.id;
                      const color = MODULE_COLOR[n.module];
                      return (
                        <g
                          key={n.id}
                          transform={`translate(${toSvg(n.x)}, ${toSvg(n.y)})`}
                          className="cursor-pointer"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedId(n.id === selectedId ? null : n.id);
                          }}
                          onPointerEnter={() => setHoverId(n.id)}
                          onPointerLeave={() => setHoverId(null)}
                          role="button"
                          aria-label={`${n.label} — ${color.label} — click for details`}
                          tabIndex={0}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              setSelectedId(n.id === selectedId ? null : n.id);
                            }
                          }}
                        >
                          {/* halo for self / selected / hover */}
                          {(n.kind === "self" || isSelected || isHover) && (
                            <circle
                              r={r + 6}
                              fill="none"
                              stroke={color.stroke}
                              strokeOpacity={isSelected ? 0.6 : 0.3}
                              strokeWidth={isSelected ? 2 : 1}
                              strokeDasharray={isSelected ? undefined : "2 3"}
                            />
                          )}
                          <circle
                            r={r}
                            fill={color.fill}
                            stroke={color.stroke}
                            strokeWidth={1.5}
                            className="transition-all"
                            style={{
                              filter: isSelected ? `drop-shadow(0 0 8px ${color.fill})` : undefined,
                            }}
                          />
                          {/* Node initials — only on bigger nodes */}
                          {r >= 16 && (
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={Math.max(9, r * 0.45)}
                              fill="#fff"
                              fontWeight="600"
                              style={{ pointerEvents: "none", userSelect: "none" }}
                            >
                              {n.initials}
                            </text>
                          )}
                          {/* Label below the node */}
                          <text
                            y={r + 12}
                            textAnchor="middle"
                            fontSize={10}
                            fill="currentColor"
                            className="fill-foreground"
                            style={{ pointerEvents: "none", userSelect: "none" }}
                          >
                            {n.kind === "self" ? "You" : n.label.split(" ")[0]}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </g>
              </svg>
            )}
          </div>

          {/* ── Right: details + suggestions ──────────────────────────── */}
          <div className="flex flex-col overflow-y-auto p-4 gap-4 max-h-[60vh] md:max-h-none">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-start gap-3">
                  <Button variant="ghost" size="sm" className="h-7 px-2 -ml-2" onClick={() => setSelectedId(null)} aria-label="Back">
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Button>
                  <div className="flex-1">
                    {selected.kind === "circle" ? (
                      <div className="w-12 h-12 rounded-xl grid place-items-center text-base font-bold text-cream" style={{ background: MODULE_COLOR[selected.module].fill }}>
                        {selected.initials}
                      </div>
                    ) : (
                      <CircleAvatar
                        initials={selected.initials}
                        color={MODULE_COLOR[selected.module].tint}
                        size="lg"
                        ring={selected.kind === "self"}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">{selected.label}</h3>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: MODULE_COLOR[selected.module].fill }}
                    >
                      {MODULE_COLOR[selected.module].label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{selected.subtitle}</p>
                </div>

                {selected.location && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {selected.location}
                  </div>
                )}

                {selected.sharedInterests && selected.sharedInterests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.sharedInterests.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-foreground/80 border border-border/40">
                        <Hash className="w-2.5 h-2.5" /> {tag}
                      </span>
                    ))}
                  </div>
                )}

                {typeof selected.mutualCircles === "number" && selected.mutualCircles > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" /> {selected.mutualCircles} mutual circle{selected.mutualCircles > 1 ? "s" : ""}
                  </div>
                )}

                {selected.kind !== "self" && selected.kind !== "circle" && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant={selected.following ? "outline" : "secondary"}
                      onClick={() => {
                        toast.success(selected.following ? `Unfollowed ${selected.label}` : `Following ${selected.label}`);
                      }}
                      className="flex-1"
                    >
                      {selected.following ? (
                        <><Check className="w-3.5 h-3.5 mr-1.5" /> Following</>
                      ) : (
                        <><UserPlus className="w-3.5 h-3.5 mr-1.5" /> Follow</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: "wasl" } }));
                        toast.success(`Opening chat with ${selected.label.split(" ")[0]}`);
                        onClose();
                      }}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                {selected.kind === "circle" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("circle:circle-detail", { detail: { circleId: selected.id } }));
                      onClose();
                    }}
                  >
                    Open circle
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-secondary" />
                  Suggested connections
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  AI suggests people you might know based on shared circles, contacts, location, and interests.
                </p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => {
                    const followed = followedSuggestions.has(s.id);
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-border/40 bg-muted/20 p-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <CircleAvatar initials={s.initials} color={s.tint} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{s.label}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{s.subtitle}</div>
                            <div className="text-[10px] text-foreground/70 mt-1 line-clamp-2">{s.reason}</div>
                          </div>
                          <Button
                            size="sm"
                            variant={followed ? "outline" : "secondary"}
                            className="h-7 px-2 shrink-0"
                            onClick={() => {
                              setFollowedSuggestions((prev) => {
                                const next = new Set(prev);
                                if (next.has(s.id)) next.delete(s.id);
                                else next.add(s.id);
                                return next;
                              });
                              toast.success(followed ? `Unfollowed ${s.label}` : `Following ${s.label}`);
                            }}
                          >
                            {followed ? <Check className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </OverlayShell>
  );
}

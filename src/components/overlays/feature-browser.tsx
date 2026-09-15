// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, ChevronRight, ArrowLeft, Sparkles, Link2, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  OVERLAY_REGISTRY,
  FEATURE_DOMAINS,
  getOverlaysByDomain,
  getDomainEntryPoint,
  type FeatureDomain,
  type FeatureDomainMeta,
} from "@/lib/overlay-registry";
import { getConnectionsForDomain, type FeatureConnection } from "@/lib/feature-connections";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FeatureBrowser({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<FeatureDomain | null>(null);

  // Filter overlays by search query
  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return OVERLAY_REGISTRY.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      o.keywords?.some(k => k.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [query]);

  const openOverlay = (eventId: string) => {
    window.dispatchEvent(new CustomEvent(eventId));
  };

  const openDomain = (domain: FeatureDomainMeta) => {
    // Always show the domain detail view first (with Works With + features)
    setSelectedDomain(domain.id);
  };

  const domainOverlays = selectedDomain
    ? getOverlaysByDomain(selectedDomain)
    : [];

  const selectedDomainMeta = selectedDomain
    ? FEATURE_DOMAINS.find(d => d.id === selectedDomain)
    : null;

  return (
    <OverlayShell open={open} onClose={onClose} variant="fullscreen" ariaLabel="Feature Browser">
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 glass-strong border-b border-border/40 px-4 py-3 flex items-center gap-3">
          {selectedDomain && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDomain(null)}
              aria-label="Back to domains"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="font-display text-lg font-bold flex-1">
            {selectedDomainMeta ? selectedDomainMeta.label : "Cirkle Features"}
          </h1>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 glass border-b border-border/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 134 features…"
              className="pl-10 h-10 rounded-full bg-background/50"
              aria-label="Search features"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search results */}
          {searchResults ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </p>
              {searchResults.map((overlay) => {
                const domain = FEATURE_DOMAINS.find(d => d.overlayIds.includes(overlay.id));
                return (
                  <button
                    key={overlay.id}
                    onClick={() => openOverlay(overlay.event)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl glass hover:bg-muted/40 transition text-left"
                  >
                    <span className="text-2xl">{overlay.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{overlay.name}</span>
                        {domain && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {domain.emoji} {domain.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{overlay.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
              {searchResults.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No features found for "{query}"</p>
                </div>
              )}
            </div>
          ) : selectedDomain ? (
            /* Domain detail view */
            <div className="space-y-3">
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{selectedDomainMeta?.emoji}</span>
                  <div>
                    <h2 className="font-display text-base font-bold">{selectedDomainMeta?.label}</h2>
                    <p className="text-xs text-muted-foreground">{selectedDomainMeta?.description}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {domainOverlays.length} features in this collection
                </p>
                {selectedDomainMeta?.entryPointOverlayId && (() => {
                  const entry = getDomainEntryPoint(selectedDomain!);
                  if (!entry) return null;
                  return (
                    <Button
                      size="sm"
                      onClick={() => openOverlay(entry.event)}
                      className="mt-3 bg-gradient-to-r from-secondary/30 to-primary/20 border border-secondary/30 text-foreground hover:from-secondary/40"
                    >
                      <span className="mr-1">{entry.emoji}</span>
                      Open {entry.name}
                    </Button>
                  );
                })()}
              </div>

              {/* Cross-feature connections */}
              {(() => {
                const connections = selectedDomain ? getConnectionsForDomain(selectedDomain) : [];
                if (connections.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase tracking-wide text-muted-foreground px-1 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Works With
                    </h3>
                    {connections.slice(0, 6).map((conn) => {
                      const otherDomain = conn.fromDomain === selectedDomain ? conn.toDomain : conn.fromDomain;
                      const otherMeta = FEATURE_DOMAINS.find(d => d.id === otherDomain);
                      return (
                        <button
                          key={conn.id}
                          onClick={() => openOverlay(conn.triggerEvent)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl glass hover:bg-muted/40 transition text-left group"
                        >
                          <span className="text-xl shrink-0">{conn.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{conn.title}</span>
                              {otherMeta && (
                                <Badge variant="outline" className="text-[9px] shrink-0">
                                  {otherMeta.emoji} {otherMeta.label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{conn.description}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {conn.status === "wired" ? (
                              <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30">✓ Live</Badge>
                            ) : conn.status === "partial" ? (
                              <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-500/30">◐ Partial</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] text-muted-foreground">○ Planned</Badge>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Primary features */}
              {selectedDomainMeta?.primaryIds && selectedDomainMeta.primaryIds.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground px-1">
                    ⭐ Primary Features
                  </h3>
                  {domainOverlays
                    .filter(o => selectedDomainMeta.primaryIds.includes(o.id))
                    .map((overlay) => (
                      <FeatureCard
                        key={overlay.id}
                        emoji={overlay.emoji}
                        name={overlay.name}
                        description={overlay.description}
                        onClick={() => openOverlay(overlay.event)}
                        primary
                      />
                    ))}
                </div>
              )}

              {/* All features */}
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground px-1">
                  All Features
                </h3>
                {domainOverlays.map((overlay) => (
                  <FeatureCard
                    key={overlay.id}
                    emoji={overlay.emoji}
                    name={overlay.name}
                    description={overlay.description}
                    onClick={() => openOverlay(overlay.event)}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Domain grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FEATURE_DOMAINS.map((domain) => {
                const overlays = getOverlaysByDomain(domain.id);
                const primaryCount = domain.primaryIds.length;
                const connections = getConnectionsForDomain(domain.id);
                const liveConnections = connections.filter(c => c.status === "wired").length;
                return (
                  <button
                    key={domain.id}
                    onClick={() => openDomain(domain)}
                    className="glass rounded-2xl p-4 hover:bg-muted/40 transition text-left group"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-3xl group-hover:scale-110 transition">{domain.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-sm font-bold">{domain.label}</div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {domain.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="outline" className="text-[10px]">
                        {overlays.length} features
                      </Badge>
                      {liveConnections > 0 && (
                        <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                          <Link2 className="w-2.5 h-2.5 mr-1" /> {liveConnections} linked
                        </Badge>
                      )}
                      {primaryCount > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {primaryCount} primary
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}

function FeatureCard({
  emoji,
  name,
  description,
  onClick,
  primary,
}: {
  emoji: string;
  name: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition text-left",
        primary
          ? "bg-gradient-to-r from-secondary/15 to-transparent border border-secondary/30 hover:from-secondary/25"
          : "glass hover:bg-muted/40",
      )}
    >
      <span className="text-xl shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{name}</span>
          {primary && <Sparkles className="w-3 h-3 text-secondary shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

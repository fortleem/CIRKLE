"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, Globe2, ShieldCheck, RefreshCw, Loader2, Mail, Building2,
  Lock, Unlock, ArrowLeftRight, Clock, MapPin, AlertTriangle,
  CheckCircle2, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── API shape (mirrors /api/regions) ──────────────────────────────

interface PublicRegion {
  code: string;
  name: string;
  countries: string[];
  dbUrl: string; // masked: "[configured]" | "[default]"
  compliance: string[];
  dpo: string;
  breachAuthority: string;
}

interface ResidencyRule {
  dataType: string;
  mustStayInRegion: boolean;
  regions: string[];
  crossBorderAllowed: boolean;
  retention: string;
}

interface RegionsPayload {
  regions: PublicRegion[];
  residencyRules: ResidencyRule[];
  resolvedRegion: PublicRegion | null;
  lockedByRegion: Record<string, string[]>;
  portableTypes: string[];
  generatedAt: string;
}

// ── Region visual metadata ────────────────────────────────────────
// A rough geographical band layout so the cards read left→right like a map.

const REGION_LAYOUT: Record<
  string,
  { emoji: string; band: string; blurb: string }
> = {
  US: { emoji: "🌎", band: "Americas", blurb: "US · CA · LATAM — CCPA & LGPD" },
  EU: { emoji: "🇪🇺", band: "Europe", blurb: "27 EU states — GDPR" },
  KSA: { emoji: "🇸🇦", band: "MENA", blurb: "Saudi Arabia — PDPL · SDAIA" },
  EG: { emoji: "🇪🇬", band: "MENA", blurb: "Egypt — Egypt DP · NTRA" },
  UAE: { emoji: "🇦🇪", band: "MENA", blurb: "UAE — UAE PDPL" },
  RU: { emoji: "🇷🇺", band: "Eurasia", blurb: "RU · BY · KZ — FZ-242 · Roskomnadzor" },
  CN: { emoji: "🇨🇳", band: "Asia", blurb: "CN · HK · TW — PIPL · CAC" },
  GLOBAL: { emoji: "🌍", band: "Fallback", blurb: "Default region for unmapped countries" },
};

const COMPLIANCE_COLOR: Record<string, string> = {
  PDPL: "bg-secondary/20 text-secondary border-secondary/40",
  EgyptDP: "bg-primary/20 text-primary border-primary/40",
  UAE_PDPL: "bg-primary/20 text-primary border-primary/40",
  PIPL: "bg-accent/20 text-accent-foreground border-accent/40",
  "FZ-242": "bg-steel/20 text-steel border-steel/40",
  GDPR: "bg-primary/20 text-primary border-primary/40",
  CCPA: "bg-secondary/20 text-secondary border-secondary/40",
  LGPD: "bg-secondary/20 text-secondary border-secondary/40",
};

const DATA_TYPE_LABEL: Record<string, string> = {
  user_profile: "User Profile",
  messages: "Messages",
  payments: "Payments",
  shield_reports: "Shield Reports",
  verify_claims: "Verify Claims",
  posts: "Posts",
};

const DATA_TYPE_ICON: Record<string, LucideIcon> = {
  user_profile: ShieldCheck,
  messages: Mail,
  payments: Building2,
  shield_reports: ShieldCheck,
  verify_claims: CheckCircle2,
  posts: Globe2,
};

// ── Component ─────────────────────────────────────────────────────

export function DataResidency({ open, onClose }: Props) {
  const { country } = useApp();
  const [data, setData] = useState<RegionsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRegions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/regions${country ? `?country=${encodeURIComponent(country)}` : ""}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as RegionsPayload;
      setData(payload);
    } catch (e) {
      const msg = String((e as Error)?.message || e || "Failed to load regions.");
      setError(msg);
      toast.error("Couldn't load region data", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [country]);

  useEffect(() => {
    if (open && !data) void fetchRegions();
  }, [open, data, fetchRegions]);

  const userRegion = useMemo(() => {
    if (!data?.resolvedRegion) return null;
    return data.resolvedRegion;
  }, [data]);

  const regionsByBand = useMemo(() => {
    if (!data) return [] as { band: string; regions: PublicRegion[] }[];
    const order = ["Americas", "Europe", "MENA", "Eurasia", "Asia", "Fallback"];
    const grouped = new Map<string, PublicRegion[]>();
    for (const r of data.regions) {
      const band = REGION_LAYOUT[r.code]?.band ?? "Other";
      if (!grouped.has(band)) grouped.set(band, []);
      grouped.get(band)!.push(r);
    }
    return order
      .filter((b) => grouped.has(b))
      .map((b) => ({ band: b, regions: grouped.get(b)! }));
  }, [data]);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Data Residency — where your data lives"
    >
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 backdrop-blur-xl bg-background/80 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-border/40 flex items-center justify-center shrink-0">
            <Globe2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight">Data Residency</h1>
            <p className="text-[11px] text-muted-foreground">
              Your data stays in your region · PDPL · GDPR · PIPL · FZ-242 compliant
            </p>
          </div>
          <button
            onClick={fetchRegions}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center disabled:opacity-50"
            aria-label="Refresh regions"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-5 py-5 space-y-6">
        {loading && !data && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading region configuration…</span>
          </div>
        )}

        {error && !data && (
          <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Couldn&apos;t reach the regions service.</p>
              <p className="text-muted-foreground mt-1">{error}</p>
              <button
                onClick={fetchRegions}
                className="mt-2 text-xs px-3 py-1 rounded-full bg-accent/20 hover:bg-accent/30 border border-accent/40"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* "Your data lives in" banner */}
            <section
              className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/15 via-secondary/5 to-transparent p-5"
              aria-live="polite"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Your data lives in
                  </p>
                  <p className="font-display text-2xl mt-0.5 flex items-center gap-2">
                    <span>{REGION_LAYOUT[userRegion?.code ?? "GLOBAL"]?.emoji ?? "🌍"}</span>
                    <span>{userRegion?.name ?? "Global (default)"}</span>
                    <span className="ms-1 text-xs font-mono px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary">
                      {userRegion?.code ?? "GLOBAL"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {country ? (
                      <>Detected from your country <span className="font-mono">{country}</span>. </>
                    ) : (
                      <>No country detected — using the global default. </>
                    )}
                    {userRegion?.compliance.length
                      ? `Governed by ${userRegion.compliance.join(", ")}.`
                      : "No region-specific compliance regime applies."}
                  </p>
                </div>
              </div>
            </section>

            {/* Region grid (stylized world map) */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Globe2 className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-display text-base">Cirkle Regions</h2>
                <span className="text-[11px] text-muted-foreground">
                  {data.regions.length} regions · {data.regions.reduce((n, r) => n + r.countries.length, 0)} countries
                </span>
              </div>
              <div className="space-y-4">
                {regionsByBand.map(({ band, regions }) => (
                  <div key={band}>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1">
                      {band}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {regions.map((r) => (
                        <RegionCard
                          key={r.code}
                          region={r}
                          isUser={userRegion?.code === r.code}
                          lockedTypes={data.lockedByRegion[r.code] ?? []}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Residency rules per data type */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-display text-base">Residency Rules by Data Type</h2>
              </div>
              <div className="rounded-2xl border border-border/60 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-4 sm:col-span-3">Data type</div>
                  <div className="col-span-3 sm:col-span-2">Residency</div>
                  <div className="col-span-3 sm:col-span-3">Locked regions</div>
                  <div className="col-span-2 sm:col-span-2">Cross-border</div>
                  <div className="hidden sm:block sm:col-span-2">Retention</div>
                </div>
                <div className="divide-y divide-border/40">
                  {data.residencyRules.map((rule) => {
                    const Icon = DATA_TYPE_ICON[rule.dataType] ?? Globe2;
                    const label = DATA_TYPE_LABEL[rule.dataType] ?? rule.dataType;
                    return (
                      <div
                        key={rule.dataType}
                        className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-muted/20 transition"
                      >
                        <div className="col-span-4 sm:col-span-3 flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 text-secondary shrink-0" />
                          <span className="truncate">{label}</span>
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          {rule.mustStayInRegion ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground border border-accent/30">
                              <Lock className="w-3 h-3" /> Local
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                              <Unlock className="w-3 h-3" /> Free
                            </span>
                          )}
                        </div>
                        <div className="col-span-3 sm:col-span-3 flex flex-wrap gap-1">
                          {rule.regions.length ? (
                            rule.regions.map((rc) => (
                              <span
                                key={rc}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 border border-border/40"
                              >
                                {rc}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </div>
                        <div className="col-span-2 sm:col-span-2">
                          {rule.crossBorderAllowed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                              <ArrowLeftRight className="w-3 h-3" /> Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-accent-foreground">
                              <Lock className="w-3 h-3" /> No
                            </span>
                          )}
                        </div>
                        <div className="hidden sm:flex sm:col-span-2 items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {rule.retention}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 px-1">
                &ldquo;Local&rdquo; data types must be stored only inside the user&apos;s home region
                and never replicated cross-border. &ldquo;Free&rdquo; types (anonymous or public
                content) may be cached globally via CDN.
              </p>
            </section>

            {/* Breach authority + DPO contacts */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-display text-base">Authorities &amp; DPO Contacts</h2>
              </div>
              <div className="rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/40">
                {data.regions
                  .filter((r) => r.code !== "GLOBAL")
                  .map((r) => (
                    <div
                      key={r.code}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-muted/20 transition"
                    >
                      <div className="flex items-center gap-2 sm:w-40 shrink-0">
                        <span className="text-base">{REGION_LAYOUT[r.code]?.emoji ?? "🌍"}</span>
                        <div>
                          <p className="text-sm font-medium leading-tight">{r.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{r.code}</p>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Authority:</span>{" "}
                          <span className="font-medium">{r.breachAuthority}</span>
                        </span>
                        <a
                          href={`mailto:${r.dpo}`}
                          className="inline-flex items-center gap-1 text-secondary hover:underline"
                        >
                          <Mail className="w-3 h-3" />
                          <span className="font-mono">{r.dpo}</span>
                        </a>
                      </div>
                      <div className="flex flex-wrap gap-1 sm:justify-end">
                        {r.compliance.map((c) => (
                          <span
                            key={c}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full border",
                              COMPLIANCE_COLOR[c] ??
                                "bg-muted/40 text-muted-foreground border-border/40",
                            )}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 px-1">
                In the event of a personal-data breach, Cirkle notifies the relevant
                supervisory authority within 72 hours and contacts affected users via
                in-app banner + push. Reach out to your region&apos;s DPO anytime.
              </p>
            </section>
          </>
        )}
      </div>
    </OverlayShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function RegionCard({
  region,
  isUser,
  lockedTypes,
}: {
  region: PublicRegion;
  isUser: boolean;
  lockedTypes: string[];
}) {
  const meta = REGION_LAYOUT[region.code];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-2xl border p-4 flex flex-col gap-2 transition",
        isUser
          ? "border-primary/60 bg-primary/10 shadow-lg"
          : "border-border/60 bg-card hover:border-border",
      )}
    >
      {isUser && (
        <span className="absolute -top-2 -right-2 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary text-primary-foreground border border-primary/60">
          Your region
        </span>
      )}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{meta?.emoji ?? "🌍"}</span>
        <div className="min-w-0">
          <p className="font-display text-base leading-tight truncate">{region.name}</p>
          <p className="text-[10px] font-mono text-muted-foreground">{region.code}</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug min-h-[28px]">
        {meta?.blurb}
      </p>
      <div className="flex flex-wrap gap-1">
        {region.compliance.length ? (
          region.compliance.map((c) => (
            <span
              key={c}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full border",
                COMPLIANCE_COLOR[c] ??
                  "bg-muted/40 text-muted-foreground border-border/40",
              )}
            >
              {c}
            </span>
          ))
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-muted/40 text-muted-foreground border-border/40">
            default
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {region.countries.length
            ? `${region.countries.length} countries`
            : "fallback"}
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              region.dbUrl === "[configured]"
                ? "bg-primary"
                : "bg-muted-foreground/40",
            )}
            aria-hidden
          />
          {region.dbUrl === "[configured]" ? "regional DB" : "default DB"}
        </span>
      </div>
      {lockedTypes.length > 0 && (
        <div className="mt-1 pt-2 border-t border-border/40">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
            Locked data types
          </p>
          <div className="flex flex-wrap gap-1">
            {lockedTypes.map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent-foreground border border-accent/30"
              >
                {DATA_TYPE_LABEL[t] ?? t}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

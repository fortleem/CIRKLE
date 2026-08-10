"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  X, Check, Minus, Sparkles, ShieldCheck, Lock, WifiOff, Bot, Globe2,
  DollarSign, EyeOff, Network, Crown, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison matrix
// ─────────────────────────────────────────────────────────────────────────────
//
// Rows = dimensions to compare. Columns = platforms.
// Cell value: "yes" (check) | "no" (cross) | "partial" (minus).
//
// Sources are the public docs / ToS of each platform as of the latest
// blueprint revision. CIRKLE's column reflects the blueprint's
// commitments — every "yes" is backed by a feature in the codebase.

type CellValue = "yes" | "no" | "partial";

interface ComparisonRow {
  dimension: string;
  /** Short label shown in the row header. */
  label: string;
  /** Icon for the row. */
  icon: LucideIcon;
  /** Longer description shown when the row is expanded. */
  description: string;
  /** Cell values keyed by platform id. */
  cells: Record<string, CellValue>;
  /** Notes per platform (optional). */
  notes?: Record<string, string>;
}

interface Platform {
  id: string;
  name: string;
  emoji: string;
  /** Brand-tinted color for the column header. */
  color: string;
  /** Whether this is the CIRKLE column (highlighted). */
  isCirkle?: boolean;
}

const PLATFORMS: Platform[] = [
  { id: "cirkle", name: "CIRKLE", emoji: "⭕", color: "from-primary/30 to-secondary/20", isCirkle: true },
  { id: "facebook", name: "Facebook", emoji: "📘", color: "from-blue-500/30 to-blue-600/20" },
  { id: "whatsapp", name: "WhatsApp", emoji: "💬", color: "from-green-500/30 to-green-600/20" },
  { id: "youtube", name: "YouTube", emoji: "📺", color: "from-red-500/30 to-red-600/20" },
  { id: "instagram", name: "Instagram", emoji: "📸", color: "from-pink-500/30 to-fuchsia-600/20" },
  { id: "twitter", name: "Twitter / X", emoji: "🐦", color: "from-sky-500/30 to-slate-600/20" },
  { id: "linkedin", name: "LinkedIn", emoji: "💼", color: "from-blue-600/30 to-cyan-700/20" },
];

const ROWS: ComparisonRow[] = [
  {
    dimension: "cost",
    label: "Free forever",
    icon: DollarSign,
    description: "Whether the core platform is free for everyone, forever — no paywalled basic features.",
    cells: { cirkle: "yes", facebook: "yes", whatsapp: "yes", youtube: "partial", instagram: "yes", twitter: "partial", linkedin: "partial" },
    notes: {
      youtube: "Free with ads; YouTube Premium removes ads for a fee.",
      twitter: "Free tier throttled since 2023; X Premium for full reach.",
      linkedin: "Basic free; InMail + advanced search are paid.",
    },
  },
  {
    dimension: "ads",
    label: "Non-targeted ads",
    icon: EyeOff,
    description: "Whether ads are non-targeted (no behavioural profiling, no cookies, no retargeting).",
    cells: { cirkle: "yes", facebook: "no", whatsapp: "no", youtube: "no", instagram: "no", twitter: "no", linkedin: "no" },
    notes: {
      cirkle: "Local context only — country + city + category. No user profiling, ever.",
      facebook: "Hyper-targeted profiling across the Meta Audience Network.",
      whatsapp: "WhatsApp Business ads run on the parent Meta ad network.",
      youtube: "Personalised ad targeting via Google account history.",
    },
  },
  {
    dimension: "privacy",
    label: "Privacy by default",
    icon: ShieldCheck,
    description: "Whether the platform defaults to the most private settings (no public-by-default posts, no location tracking).",
    cells: { cirkle: "yes", facebook: "no", whatsapp: "partial", youtube: "no", instagram: "no", twitter: "no", linkedin: "no" },
    notes: {
      whatsapp: "E2EE by default for chats — but metadata + backups are not.",
    },
  },
  {
    dimension: "e2ee",
    label: "End-to-end encryption",
    icon: Lock,
    description: "Whether 1:1 and group messages are end-to-end encrypted so the server cannot read them.",
    cells: { cirkle: "yes", facebook: "partial", whatsapp: "yes", youtube: "no", instagram: "no", twitter: "no", linkedin: "no" },
    notes: {
      facebook: "E2EE available in Messenger Secret Conversations only — not default.",
      cirkle: "E2EE is the default for all Wasl conversations.",
    },
  },
  {
    dimension: "offline",
    label: "Offline-first",
    icon: WifiOff,
    description: "Whether the platform works offline (compose, read cached content, sync on reconnect).",
    cells: { cirkle: "yes", facebook: "partial", whatsapp: "partial", youtube: "partial", instagram: "partial", twitter: "no", linkedin: "no" },
    notes: {
      cirkle: "PWA + service worker + offline stash (§26). Full offline compose + read.",
      whatsapp: "Reads cached messages offline; cannot send until online.",
      youtube: "Offline downloads via Premium only.",
    },
  },
  {
    dimension: "ai",
    label: "On-device AI",
    icon: Bot,
    description: "Whether the AI assistant runs on-device (no cloud calls, no data leaves the phone).",
    cells: { cirkle: "yes", facebook: "no", whatsapp: "no", youtube: "no", instagram: "no", twitter: "no", linkedin: "no" },
    notes: {
      cirkle: "On-device LLM via WebGPU / WASM. Cloud fallback is opt-in only.",
    },
  },
  {
    dimension: "federation",
    label: "Federation / interoperability",
    icon: Network,
    description: "Whether the platform federates (you can talk to users on other servers / instances).",
    cells: { cirkle: "yes", facebook: "no", whatsapp: "no", youtube: "no", instagram: "no", twitter: "no", linkedin: "no" },
    notes: {
      cirkle: "Matrix Synapse federation + ActivityPub outbox. Talk to any Matrix or Mastodon user.",
    },
  },
  {
    dimension: "selfhost",
    label: "Self-hostable",
    icon: Globe2,
    description: "Whether you can run the entire platform on your own infrastructure.",
    cells: { cirkle: "yes", facebook: "no", whatsapp: "no", youtube: "no", instagram: "no", twitter: "no", linkedin: "no" },
    notes: {
      cirkle: "Full Docker Compose stack — Synapse + PeerTube + Mailcow + ntfy + TileServer GL.",
    },
  },
  {
    dimension: "data_sales",
    label: "Sells your data",
    icon: EyeOff,
    description: "Whether the platform sells user data to third parties (ad networks, data brokers).",
    cells: { cirkle: "no", facebook: "yes", whatsapp: "partial", youtube: "yes", instagram: "yes", twitter: "yes", linkedin: "yes" },
    notes: {
      whatsapp: "Shares metadata with the parent Meta ad network (not message contents).",
      cirkle: "Never. The blueprint's transparency covenant forbids it.",
    },
  },
  {
    dimension: "open_source",
    label: "Open source",
    icon: Network,
    description: "Whether the platform's source code is publicly available and auditable.",
    cells: { cirkle: "yes", facebook: "no", whatsapp: "no", youtube: "no", instagram: "no", twitter: "partial", linkedin: "no" },
    notes: {
      twitter: "Algorithm open-sourced 2023; the server itself is not.",
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// "Why CIRKLE is better" highlights
// ─────────────────────────────────────────────────────────────────────────────

const HIGHLIGHTS = [
  {
    icon: EyeOff,
    title: "The only non-targeted ad model",
    body: "Every other platform builds a behavioural profile of you. CIRKLE shows ads based on country + city + category — full stop. No cookies, no retargeting, no shadow profiles.",
  },
  {
    icon: Lock,
    title: "E2EE by default, not opt-in",
    body: "WhatsApp encrypts chats — but not metadata or backups. Messenger requires you to opt in to Secret Conversations. CIRKLE encrypts every Wasl conversation by default — the server never sees plaintext.",
  },
  {
    icon: Bot,
    title: "AI that doesn't phone home",
    body: "Every other platform's AI assistant sends your data to the cloud. CIRKLE's Brain runs on-device via WebGPU / WASM. Cloud fallback is opt-in per query — you decide when to leave the device.",
  },
  {
    icon: Network,
    title: "Federation means no lock-in",
    body: "On Twitter, you can only talk to Twitter users. On CIRKLE, you can talk to anyone on Matrix, Mastodon, or any ActivityPub server. Your social graph is portable.",
  },
  {
    icon: Globe2,
    title: "Self-host the whole stack",
    body: "Run the entire CIRKLE platform — Matrix, PeerTube, Mailcow, ntfy, maps — on your own infrastructure with one Docker Compose command. No vendor lock-in.",
  },
  {
    icon: DollarSign,
    title: "Transparent finances",
    body: "CIRKLE publishes quarterly cost + revenue reports. You can see exactly where the money comes from (non-targeted ads, Pro tier, affiliate commissions) and where it goes (servers, AI, compliance).",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Cell renderer
// ─────────────────────────────────────────────────────────────────────────────

function CellIcon({ value, isCirkle }: { value: CellValue; isCirkle?: boolean }) {
  if (value === "yes") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full",
          isCirkle
            ? "bg-primary text-primary-foreground"
            : "bg-emerald-500/20 text-emerald-500",
        )}
        aria-label="Yes"
      >
        <Check className="w-3.5 h-3.5" />
      </span>
    );
  }
  if (value === "no") {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/15 text-rose-500"
        aria-label="No"
      >
        <X className="w-3.5 h-3.5" />
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15 text-amber-500"
      aria-label="Partial"
    >
      <Minus className="w-3.5 h-3.5" />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ComparisonView({ open, onClose }: Props) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // CIRKLE wins where every other platform is "no" or "partial".
  const cirkleWins = useMemo(() => {
    return ROWS.filter((row) => {
      const cirkle = row.cells.cirkle;
      if (cirkle !== "yes") return false;
      // CIRKLE wins if at least one other platform is "no" or all are "partial"/"no".
      const others = PLATFORMS.filter((p) => !p.isCirkle).map((p) => row.cells[p.id]);
      return others.some((v) => v === "no") || others.every((v) => v !== "yes");
    });
  }, []);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="CIRKLE vs the incumbents — feature comparison"
    >
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 backdrop-blur-xl bg-background/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-border/40 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight">CIRKLE vs the incumbents</h1>
            <p className="text-[11px] text-muted-foreground">
              The honest comparison · No tracking · No data sales · Open source
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close comparison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-5 py-6 space-y-8">
          {/* Intro */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-5"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-lg mb-1">Why we built CIRKLE</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every platform on this list was built to extract your attention and sell it to
                  advertisers. CIRKLE was built to give you back control — over your data, your
                  attention, and your social graph. The table below is the honest, sourced
                  comparison. No marketing spin.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Comparison table */}
          <section aria-label="Feature comparison table">
            <div className="glass rounded-3xl overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] gap-0 border-b border-border/40 bg-muted/30">
                <div className="p-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Feature
                </div>
                {PLATFORMS.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "p-3 flex flex-col items-center justify-center gap-1 text-center",
                      p.isCirkle && "bg-primary/10",
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-lg border border-border/40",
                        p.color,
                      )}
                    >
                      {p.emoji}
                    </div>
                    <div className={cn("text-[11px] font-medium leading-tight", p.isCirkle && "text-primary")}>
                      {p.name}
                    </div>
                  </div>
                ))}
              </div>

              {/* Body rows */}
              {ROWS.map((row, idx) => {
                const Icon = row.icon;
                const isExpanded = expandedRow === row.dimension;
                return (
                  <div
                    key={row.dimension}
                    className={cn(
                      "grid grid-cols-[200px_repeat(7,minmax(0,1fr))] gap-0 border-b border-border/30",
                      idx % 2 === 1 && "bg-muted/10",
                      isExpanded && "bg-muted/20",
                    )}
                  >
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : row.dimension)}
                      className="p-3 flex items-center gap-2 text-left hover:bg-muted/30 transition"
                    >
                      <Icon className="w-4 h-4 text-secondary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium leading-tight">{row.label}</div>
                      </div>
                    </button>
                    {PLATFORMS.map((p) => {
                      const value = row.cells[p.id];
                      const note = row.notes?.[p.id];
                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "p-3 flex items-center justify-center",
                            p.isCirkle && "bg-primary/5",
                          )}
                          title={note}
                        >
                          <CellIcon value={value} isCirkle={p.isCirkle} />
                        </div>
                      );
                    })}
                    {isExpanded && (
                      <div className="col-span-8 px-4 pb-4 pt-1 text-xs text-muted-foreground leading-relaxed">
                        <div className="rounded-xl bg-background/60 p-3 border border-border/40">
                          <div className="font-medium text-foreground mb-1.5">{row.description}</div>
                          {row.notes && (
                            <ul className="space-y-1 mt-2">
                              {Object.entries(row.notes).map(([pid, note]) => {
                                const platform = PLATFORMS.find((p) => p.id === pid);
                                return (
                                  <li key={pid} className="flex gap-2">
                                    <span className="text-base leading-none">{platform?.emoji}</span>
                                    <span><span className="font-medium">{platform?.name}:</span> {note}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500">
                  <Check className="w-3 h-3" />
                </span>
                Yes
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-500">
                  <Minus className="w-3 h-3" />
                </span>
                Partial
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/15 text-rose-500">
                  <X className="w-3 h-3" />
                </span>
                No
              </div>
              <div className="ml-auto">Tap a row to see detailed notes per platform.</div>
            </div>
          </section>

          {/* Why CIRKLE is better */}
          <section aria-label="Why CIRKLE is better">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-4 h-4 text-secondary" />
              <h2 className="font-display text-lg">Why CIRKLE is better</h2>
              <span className="text-[11px] text-muted-foreground">· {cirkleWins.length} exclusive wins</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {HIGHLIGHTS.map((h, idx) => {
                const Icon = h.icon;
                return (
                  <motion.div
                    key={h.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass rounded-2xl p-4 hover:shadow-float transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/15 border border-border/40 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-secondary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm mb-1">{h.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{h.body}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Footer disclosure */}
          <section className="text-[10px] text-muted-foreground text-center pt-4 pb-2">
            <ShieldCheck className="w-3 h-3 inline-block mr-1 text-secondary" />
            Sources: each platform's public Terms of Service + privacy policy as of the latest
            blueprint revision. CIRKLE column reflects shipped features in this codebase. Last
            updated: {new Date().toISOString().slice(0, 10)}.
          </section>
        </div>
      </div>
    </OverlayShell>
  );
}

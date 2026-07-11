"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import {
  X, ChevronRight, ChevronLeft, Mail, KeyRound, BadgeCheck, Radio, Grid3x3,
  HardDriveDownload, ShieldCheck, Brain, Languages, MapPin, Megaphone,
  Briefcase, GraduationCap, Sparkles, Users, Network, Lock, Cloud, Plug,
  CircleDollarSign, FileCheck2, Globe2, EyeOff, Fingerprint, Server,
  Search, type LucideIcon,
} from "lucide-react";
import type { TabId } from "@/lib/tabs";
import { toast } from "sonner";

type PillarId =
  | "mail" | "id" | "verify" | "mesh" | "miniapps" | "backup" | "privacy"
  | "aisafety" | "translate" | "maps" | "ads" | "workspaces" | "education"
  | "creators" | "professional" | "groups" | "selflearn" | "federation";

interface Pillar {
  id: PillarId;
  name: string;
  tagline: string;
  icon: LucideIcon;
  tint: string;
  badge?: string;
  tab?: TabId; // if it maps to a main tab, navigate; otherwise toast
}

const PILLARS: Pillar[] = [
  { id: "mail", name: "Cirkle Mail", tagline: "Free @cirkle inbox", icon: Mail, tint: "from-secondary/30 to-secondary/5", badge: "3 new" },
  { id: "id", name: "Cirkle ID", tagline: "OIDC across every service", icon: KeyRound, tint: "from-primary/30 to-primary/5" },
  { id: "verify", name: "Cirkle Verify", tagline: "One account per real identity", icon: BadgeCheck, tint: "from-accent/30 to-accent/5", badge: "Verified" },
  { id: "mesh", name: "Mesh Network", tagline: "Offline-first BLE + Wi-Fi Direct", icon: Radio, tint: "from-teal/30 to-teal/5", badge: "4 peers" },
  { id: "miniapps", name: "Mini-App Hub", tagline: "Careem, Absher, Fawry & more", icon: Grid3x3, tint: "from-gold/30 to-gold/5" },
  { id: "backup", name: "Backup & Migrate", tagline: "Encrypted, user-held key", icon: HardDriveDownload, tint: "from-steel/30 to-steel/5" },
  { id: "privacy", name: "Privacy Dashboard", tagline: "Self-audit & risk simulation", icon: ShieldCheck, tint: "from-primary/30 to-primary/5" },
  { id: "aisafety", name: "AI Safety", tagline: "On-device moderation models", icon: Brain, tint: "from-accent/30 to-accent/5" },
  { id: "translate", name: "Universal Translate", tagline: "120 languages, on-device", icon: Languages, tint: "from-secondary/30 to-secondary/5" },
  { id: "maps", name: "Cirkle Maps", tagline: "Zero-cost OSM + Valhalla", icon: MapPin, tint: "from-teal/30 to-teal/5" },
  { id: "ads", name: "Ads Transparency", tagline: "Local, non-targeted, opt-out", icon: Megaphone, tint: "from-rose/30 to-rose/5" },
  { id: "workspaces", name: "Workspaces", tagline: "Notion-class team OS", icon: Briefcase, tint: "from-gold/30 to-gold/5", badge: "12" },
  { id: "education", name: "Education", tagline: "Schools & universities", icon: GraduationCap, tint: "from-primary/30 to-primary/5" },
  { id: "creators", name: "Creator Channels", tagline: "Monetisation, gifts, super-fans", icon: Sparkles, tint: "from-secondary/30 to-secondary/5", tab: "mashahd" },
  { id: "professional", name: "Professional Network", tagline: "Your career graph", icon: Users, tint: "from-steel/30 to-steel/5", tab: "wasl" },
  { id: "groups", name: "The Circle (Groups)", tagline: "Public & private circles", icon: Network, tint: "from-accent/30 to-accent/5", tab: "midan" },
  { id: "selflearn", name: "Self-Learning AI", tagline: "Federated, on-device tuning", icon: Brain, tint: "from-teal/30 to-teal/5" },
  { id: "federation", name: "Federation", tagline: "Matrix · ActivityPub · IPFS", icon: Server, tint: "from-steel/30 to-steel/5" },
];

/**
 * CircleHub — Sheet listing all 18 Cirkle pillars in a grid with a
 * searchable list and detail view. Clicking "Open" navigates to a main
 * tab (if mapped) or fires a "launching" toast.
 */
export function CircleHub({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState<PillarId | null>(null);
  const [q, setQ] = useState("");
  const pillar = PILLARS.find((p) => p.id === active);

  const filtered = q
    ? PILLARS.filter((p) => (p.name + " " + p.tagline).toLowerCase().includes(q.toLowerCase()))
    : PILLARS;

  const openPillar = (p: Pillar) => {
    if (p.tab) {
      window.dispatchEvent(new CustomEvent("circle:navigate", { detail: { tab: p.tab } }));
      toast.success(`Opening ${p.name}`, { description: "Switched to the main tab." });
      onClose();
    } else {
      toast(`Launching ${p.name}…`, { description: p.tagline });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140]"
            style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            role="dialog" aria-label="Cirkle Hub"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              {active && (
                <button
                  onClick={() => setActive(null)}
                  className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cirkle Hub</div>
                <div className="font-display text-xl truncate">{pillar ? pillar.name : "Every pillar of Cirkle"}</div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {!active ? (
                <div className="p-4 space-y-3">
                  {/* Search */}
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-full glass">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search pillars…"
                      className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                      aria-label="Search pillars"
                    />
                    {q && (
                      <button
                        onClick={() => setQ("")}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition"
                        aria-label="Clear search"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {filtered.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      No pillars match &quot;{q}&quot;.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {filtered.map((p, i) => (
                        <motion.button
                          key={p.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.025, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          onClick={() => setActive(p.id)}
                          className={`relative text-start rounded-2xl border border-border/50 bg-gradient-to-br ${p.tint} p-4 min-h-[120px] hover:scale-[1.02] transition overflow-hidden group`}
                        >
                          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-foreground/5 blur-2xl group-hover:bg-foreground/10 transition" />
                          <div className="relative flex items-start justify-between">
                            <div className="w-9 h-9 rounded-xl glass flex items-center justify-center">
                              <p.icon className="w-4 h-4 text-secondary" />
                            </div>
                            {p.badge && (
                              <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/80">{p.badge}</span>
                            )}
                          </div>
                          <div className="relative mt-3">
                            <div className="font-display text-base leading-tight">{p.name}</div>
                            <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{p.tagline}</div>
                          </div>
                          <div className="relative mt-3 flex items-center gap-1 text-[10px] text-secondary">
                            Open <ChevronRight className="w-3 h-3" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <PillarDetail pillar={pillar!} onOpen={openPillar} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PillarDetail({ pillar, onOpen }: { pillar: Pillar; onOpen: (p: Pillar) => void }) {
  const content = DETAILS[pillar.id];
  return (
    <motion.div
      key={pillar.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="p-5 space-y-5 pb-24"
    >
      <div className={`rounded-3xl border border-border/50 bg-gradient-to-br ${pillar.tint} p-5 relative overflow-hidden`}>
        <div className="absolute -top-16 -right-10 w-40 h-40 rounded-full bg-foreground/5 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl glass-strong flex items-center justify-center shadow-soft">
            <pillar.icon className="w-6 h-6 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl leading-tight">{pillar.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{pillar.tagline}</p>
          </div>
        </div>
      </div>

      {content.metrics && (
        <div className="grid grid-cols-3 gap-2">
          {content.metrics.map((m, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-3 text-center">
              <div className="font-display text-xl gradient-text-gold">{m.v}</div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{m.l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {content.rows.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl bg-card border border-border/60 p-4 flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <r.icon className="w-4 h-4 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{r.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.body}</div>
            </div>
            {r.tag && (
              <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-accent/15 text-accent shrink-0">{r.tag}</span>
            )}
          </motion.div>
        ))}
      </div>

      <button
        onClick={() => onOpen(pillar)}
        className="w-full rounded-2xl bg-gradient-hero text-cream py-3 text-sm font-medium flex items-center justify-center gap-2 shadow-float hover:opacity-90 transition"
      >
        Open {pillar.name} <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

type Row = { icon: LucideIcon; title: string; body: string; tag?: string };
type Detail = { metrics?: { v: string; l: string }[]; rows: Row[] };

const DETAILS: Record<PillarId, Detail> = {
  mail: {
    metrics: [{ v: "3", l: "Unread" }, { v: "12 GB", l: "Storage" }, { v: "0$", l: "Forever" }],
    rows: [
      { icon: Mail, title: "yousef@cirkle", body: "Permanent address tied to your Cirkle ID. No ads, no scanning, no upsell.", tag: "Free" },
      { icon: Lock, title: "E2EE between Cirkle users", body: "Outside SMTP falls back to TLS + warning labels.", tag: "Secure" },
      { icon: Sparkles, title: "Inbox AI", body: "On-device triage, smart replies, and summary digests every morning." },
    ],
  },
  id: {
    metrics: [{ v: "1", l: "Identity" }, { v: "47", l: "Apps signed-in" }, { v: "OIDC", l: "Standard" }],
    rows: [
      { icon: KeyRound, title: "Single sign-on", body: "Use Cirkle ID to log in to any OIDC-compatible service — no passwords." },
      { icon: Fingerprint, title: "Passkeys + biometrics", body: "FIDO2 on every device, recovery through community-key Shamir splits." },
      { icon: ShieldCheck, title: "Granular scopes", body: "Approve exactly what each app sees — and revoke any time." },
    ],
  },
  verify: {
    rows: [
      { icon: BadgeCheck, title: "Real-identity verification", body: "Government ID + liveness, processed on-device — Cirkle never stores the photo.", tag: "Live" },
      { icon: FileCheck2, title: "One account per ID", body: "Cryptographic uniqueness via blind-signed attestations from community verifiers." },
      { icon: Users, title: "Trust score", body: "Earned through verified actions, peer endorsements, and governance participation." },
    ],
  },
  mesh: {
    metrics: [{ v: "4", l: "Peers" }, { v: "8.2 MB/s", l: "Local" }, { v: "100%", l: "Offline" }],
    rows: [
      { icon: Radio, title: "Bluetooth LE + Wi-Fi Direct", body: "Auto-relay messages and content through nearby Circles — no internet required." },
      { icon: Network, title: "libp2p backbone", body: "Falls back to IPFS gossipsub when one peer is online." },
      { icon: EyeOff, title: "Ghost mode aware", body: "Mesh respects invisibility — you stay dark but still receive." },
    ],
  },
  miniapps: {
    rows: [
      { icon: Grid3x3, title: "8 connected today", body: "Careem, Absher, Fawry, STC Pay, Tabby, Jahez, Tawakkalna, Mawid." },
      { icon: Plug, title: "Universal App Hub", body: "Lightweight WASM mini-apps — install in 1 second, never leave Cirkle." },
      { icon: ShieldCheck, title: "Sandboxed", body: "Mini-apps see nothing about you unless you explicitly grant a scope." },
    ],
  },
  backup: {
    metrics: [{ v: "Last", l: "2 min ago" }, { v: "AES-256", l: "Cipher" }, { v: "You", l: "Holds key" }],
    rows: [
      { icon: HardDriveDownload, title: "Encrypted backup", body: "Stored on IPFS or your own NAS — only your seed unlocks it." },
      { icon: Cloud, title: "Phone migration", body: "Scan a QR from the new device; restore takes under 60 seconds." },
      { icon: Lock, title: "Zero-knowledge", body: "Cirkle servers never see your keys, messages, or media." },
    ],
  },
  privacy: {
    metrics: [{ v: "A+", l: "Privacy grade" }, { v: "0", l: "Trackers" }, { v: "12", l: "Active scopes" }],
    rows: [
      { icon: ShieldCheck, title: "Risk simulation", body: "See exactly what each contact, channel, or mini-app can infer about you." },
      { icon: EyeOff, title: "Ghost mode", body: "Vanish from presence, last-seen and typing indicators app-wide." },
      { icon: Globe2, title: "Anti-trace metadata", body: "All outgoing media is stripped of EXIF, location and device fingerprints." },
    ],
  },
  aisafety: {
    rows: [
      { icon: Brain, title: "On-device moderation", body: "CSAM, hate, and scam classifiers run locally — content never leaves your phone for safety checks.", tag: "Local" },
      { icon: ShieldCheck, title: "Community appeals", body: "Every moderation action is appealable to elected community jurors." },
      { icon: FileCheck2, title: "Transparent policy", body: "All rules + model weights are open-source and versioned in the governance ledger." },
    ],
  },
  translate: {
    metrics: [{ v: "120", l: "Languages" }, { v: "<80ms", l: "Latency" }, { v: "On-device", l: "Privacy" }],
    rows: [
      { icon: Languages, title: "Live conversation mode", body: "Speak Arabic, hear English — across Wasl voice rooms and Spaces." },
      { icon: Sparkles, title: "Cultural tone", body: "Adapt translation register: formal, casual, gulf-dialect, levantine, MSA." },
    ],
  },
  maps: {
    rows: [
      { icon: MapPin, title: "OpenStreetMap tiles", body: "Self-hosted, vector tiles cached offline by city." },
      { icon: Network, title: "Valhalla routing", body: "Free turn-by-turn navigation — walking, driving, transit." },
      { icon: Users, title: "Community POIs", body: "Verified locals add and curate places — no Google fees." },
    ],
  },
  ads: {
    metrics: [{ v: "City-level", l: "Targeting" }, { v: "0", l: "Profiles sold" }, { v: "100%", l: "Opt-out" }],
    rows: [
      { icon: Megaphone, title: "Local ads only", body: "Businesses buy a city + category. Cirkle never shares user data." },
      { icon: FileCheck2, title: "Corporate-invoice billing", body: "Advertisers pay by invoice, not by user action — no incentive to track." },
      { icon: EyeOff, title: "One-tap opt-out", body: "Turn off all sponsorship slots and keep every feature." },
    ],
  },
  workspaces: {
    metrics: [{ v: "12", l: "Workspaces" }, { v: "47", l: "Members" }, { v: "3", l: "Pending" }],
    rows: [
      { icon: Briefcase, title: "Docs · Boards · Calls", body: "Notion-class blocks, Kanban, video calls — all encrypted, all free." },
      { icon: Users, title: "Roles & permissions", body: "Org-charts, scoped access, audit logs out of the box." },
    ],
  },
  education: {
    rows: [
      { icon: GraduationCap, title: "Classrooms", body: "Assignments, attendance, parent-channels — built for ministries of education." },
      { icon: ShieldCheck, title: "Student safety mode", body: "Hardened moderation and screen-time controls under 18." },
    ],
  },
  creators: {
    metrics: [{ v: "$0", l: "Platform cut" }, { v: "Gifts", l: "& Tips" }, { v: "Super", l: "Fans" }],
    rows: [
      { icon: Sparkles, title: "Direct support", body: "Tips, gifts, paid posts via Cirkle Pay — creators keep 100%." },
      { icon: Users, title: "Super-fan tiers", body: "Subscriber-only channels, polls, and live rooms." },
    ],
  },
  professional: {
    rows: [
      { icon: Users, title: "Career graph", body: "Verified employers, skills, and endorsements — without LinkedIn's noise." },
      { icon: Briefcase, title: "Hiring rooms", body: "Recruiters post; you control who sees your status." },
    ],
  },
  groups: {
    rows: [
      { icon: Network, title: "Public & private circles", body: "From neighbourhoods to fandoms — federated rooms with shared timelines." },
      { icon: ShieldCheck, title: "Local moderation", body: "Each circle elects its own moderators, transparent to all members." },
    ],
  },
  selflearn: {
    rows: [
      { icon: Brain, title: "Federated learning", body: "Your phone improves the global model with gradient updates — never raw data.", tag: "On-device" },
      { icon: Sparkles, title: "Personal Co-Pilot", body: "Tone, schedule, and taste learned locally — synced encrypted across your devices." },
    ],
  },
  federation: {
    rows: [
      { icon: Server, title: "Matrix homeservers", body: "Chat federates with any Matrix server — yours, your school's, your country's." },
      { icon: Globe2, title: "ActivityPub", body: "Midan posts federate to Mastodon, Lemmy, PeerTube and the wider Fediverse." },
      { icon: CircleDollarSign, title: "Self-hosting", body: "Organisations run their own node — full data sovereignty, $0 vendor lock-in." },
    ],
  },
};

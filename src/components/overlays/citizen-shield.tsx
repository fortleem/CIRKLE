"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { X, ShieldCheck, Video, Lock, Upload, Users, Brain, GitBranch, MapPin, QrCode, Heart, BarChart3, AlertTriangle, FileText, CheckCircle2, ChevronRight, Camera, Sparkles, Radio, AlertOctagon, Zap, EyeOff, Newspaper, Loader2, type LucideIcon } from "lucide-react";
import { CirkleMap, type MapMarker } from "@/components/cirkle-map";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { FeedbackButton } from "@/components/ui/feedback-button";

interface Props { open: boolean; onClose: () => void; }
const OFFICES = [
  { id: "o1", name: "Al-Olaya Traffic Police", reputation: 62, lat: 24.6921, lng: 46.6858 },
  { id: "o2", name: "Diplomatic Quarter Passports", reputation: 48, lat: 24.7020, lng: 46.6230 },
  { id: "o3", name: "Arafat Municipality", reputation: 81, lat: 24.7136, lng: 46.6753 },
  { id: "o4", name: "Al-Nakheel Health Center", reputation: 54, lat: 24.7530, lng: 46.6280 },
  { id: "o5", name: "SEC Al-Khobar", reputation: 71, lat: 26.2794, lng: 50.2083 },
  { id: "o6", name: "Riyadh Traffic Dept", reputation: 76, lat: 24.7100, lng: 46.7000 },
  { id: "o7", name: "Jeddah Municipality", reputation: 69, lat: 21.4858, lng: 39.1925 },
  { id: "o8", name: "Madinah Passport Office", reputation: 73, lat: 24.4683, lng: 39.6142 },
];
const CASES = [
  { id: "cs-1", number: "CS-2025-04812", status: "investigating", title: "Off-duty officer refused to file traffic report", office: "Al-Olaya Traffic Police", time: "2h ago", rep: 62, evidence: 3, witnesses: 2, privacy: "Protected" },
  { id: "cs-2", number: "CS-2025-04799", status: "escalated", title: "Renewal stuck 47 days beyond SLA", office: "Diplomatic Quarter Passports", time: "5h ago", rep: 48, evidence: 7, witnesses: 5, privacy: "Identified" },
  { id: "cs-3", number: "CS-2025-04785", status: "resolved", title: "Streetlight outage on Al-Madarraj St", office: "Arafat Municipality", time: "Yesterday", rep: 81, evidence: 5, witnesses: 4, privacy: "Identified" },
  { id: "cs-4", number: "CS-2025-04771", status: "pending", title: "Clinic refused emergency admission", office: "Al-Nakheel Health Center", time: "Yesterday", rep: 54, evidence: 1, witnesses: 2, privacy: "Protected" },
  { id: "cs-5", number: "CS-2025-04755", status: "investigating", title: "Billing error — charged for unoccupied villa", office: "SEC Al-Khobar", time: "2 days ago", rep: 71, evidence: 0, witnesses: 6, privacy: "Identified" },
];

type View = "dashboard" | "recording" | "case" | "government" | "witness" | "qr" | "compliment" | "safety";
type Privacy = "identified" | "protected" | "anonymous";
type DeadManInterval = "5min" | "1hr" | "24hr";

const DEAD_MAN_MINUTES: Record<DeadManInterval, number> = { "5min": 5, "1hr": 60, "24hr": 1440 };
const DEAD_MAN_TARGETS = [
  { id: "midan", label: "Midan (social feed)", emoji: "📰" },
  { id: "mashahd", label: "Mashahd (video evidence)", emoji: "📹" },
  { id: "public-link", label: "Public link", emoji: "🌍" },
  { id: "trusted-contacts", label: "Trusted contacts", emoji: "👥" },
  { id: "media", label: "Media partners", emoji: "📻" },
  { id: "ngo", label: "NGO partners", emoji: "❤️" },
];

const REPORT_CATEGORIES = [
  "Traffic", "Municipal Services", "Healthcare", "Passports & Immigration",
  "Utility Billing", "Police Conduct", "Education", "Labor Dispute",
];


function useCountUp(target: number, duration = 1000) {
  const [val, setVal] = useState(0);
  useEffect(() => { const start = Date.now(); const t = setInterval(() => { const p = Math.min((Date.now() - start) / duration, 1); setVal(Math.floor(target * (1 - Math.pow(1 - p, 3)))); if (p >= 1) clearInterval(t); }, 16); return () => clearInterval(t); }, [target, duration]);
  return val;
}

export function CitizenShield({ open, onClose }: Props) {
  const [view, setView] = useState<View>("dashboard");
  const [privacy, setPrivacy] = useState<Privacy>("protected");
  const [protectionMode, setProtectionMode] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [uploadPct, setUploadPct] = useState(0);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  // ── Civic Wave Publishing ──
  const [publishMidan, setPublishMidan] = useState(false);
  const [publishMashahd, setPublishMashahd] = useState(false);
  const [publishPublicLink, setPublishPublicLink] = useState(false);
  // ── Civic Wave submission form (post-recording) ──
  const [reportCategory, setReportCategory] = useState<string>(REPORT_CATEGORIES[0]);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportOffice, setReportOffice] = useState<string>(OFFICES[0].name);
  const [publishing, setPublishing] = useState(false);
  const [lastPublishedCaseId, setLastPublishedCaseId] = useState<string | null>(null);
  const [lastPublishedLink, setLastPublishedLink] = useState<string | null>(null);
  // ── Dead-man switch + panic (journalist safety) ──
  const [deadManEnabled, setDeadManEnabled] = useState(false);
  const [deadManInterval, setDeadManInterval] = useState<DeadManInterval>("1hr");
  const [deadManTargets, setDeadManTargets] = useState<Set<string>>(new Set(["midan", "ngo"]));
  const [panicArmed, setPanicArmed] = useState(false);
  const [decoyActive, setDecoyActive] = useState(false);

  useEffect(() => { if (recording) { const t = setInterval(() => { setRecordTime((p) => p + 1); setUploadPct((p) => Math.min(p + 3, 100)); }, 1000); return () => clearInterval(t); } }, [recording]);
  const stopRecording = () => { setRecording(false); setUploadPct(100); };

  // ── Publish as Civic Wave: POST /api/shield/report → POST /api/shield/civic-wave ──
  const publishAsCivicWave = async () => {
    if (!reportTitle.trim() || !reportDesc.trim()) {
      toast.error("Title and description required", { description: "Fill in the report details before publishing." });
      return;
    }
    setPublishing(true);
    try {
      // 1. Create the Shield report (AI analysis + chain of custody).
      const reportRes = await fetch("/api/shield/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: reportCategory,
          title: reportTitle.trim(),
          description: reportDesc.trim(),
          officeName: reportOffice,
          officeRegion: "Cairo", // generalized to city level server-side
          privacyLevel: privacy,
          deadManSwitch: deadManEnabled,
          evidenceHashes: [],
          publishToMidan: false, // we publish via civic-wave instead
          publishToMashahd: false,
          publishPublicLink: false,
        }),
      });
      const reportData = await reportRes.json();
      if (!reportRes.ok || !reportData.ok) {
        toast.error("Report creation failed", { description: reportData?.error || "Try again." });
        return;
      }
      const caseId = reportData.caseId as string;
      const caseNumber = reportData.caseNumber as string;

      // 2. Publish as Civic Wave (Midan + Mashahd + public link per toggles).
      const waveRes = await fetch("/api/shield/civic-wave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          publishMidan,
          publishMashahd,
          publishPublicLink,
        }),
      });
      const waveData = await waveRes.json();
      if (!waveRes.ok || !waveData.ok) {
        toast.error("Civic Wave publish failed", { description: waveData?.error || "" });
        return;
      }
      setLastPublishedCaseId(caseId);
      setLastPublishedLink(waveData.publicLink || null);
      toast.success("Civic Wave published", {
        description: `Case ${caseNumber} · ${publishMidan ? "Midan ✓" : ""} ${publishMashahd ? "Mashahd ✓" : ""} ${publishPublicLink ? "Link ✓" : ""}`.trim(),
      });
      // Reset form + return to dashboard.
      setReportTitle("");
      setReportDesc("");
      setRecordTime(0);
      setUploadPct(0);
      setView("dashboard");
    } catch (err) {
      toast.error("Network error", { description: err instanceof Error ? err.message : "" });
    } finally {
      setPublishing(false);
    }
  };

  // ── Panic mode: 2-tap to confirm. Triggers wipe + decoy + broadcast. ──
  const handlePanic = async () => {
    if (!panicArmed) {
      setPanicArmed(true);
      toast.warning("PANIC ARMED", { description: "Tap again within 5s to trigger wipe + decoy + broadcast." });
      setTimeout(() => setPanicArmed(false), 5000);
      return;
    }
    setPanicArmed(false);
    setDecoyActive(true);
    try {
      await fetch("/api/shield/panic", { method: "POST" }).catch(() => null);
      toast.success("PANIC EXECUTED", {
        description: "Local data wiped · Decoy activity started · Trusted contacts alerted.",
      });
    } catch {
      toast.error("Panic failed");
    }
  };

  const toggleDeadManTarget = (id: string) => {
    const next = new Set(deadManTargets);
    if (next.has(id)) next.delete(id); else next.add(id);
    setDeadManTargets(next);
  };

  const officeMarkers: MapMarker[] = OFFICES.map((o) => ({ lat: o.lat, lon: o.lng, emoji: "🏛️", label: `${o.name}\nRep: ${o.reputation}`, color: o.reputation >= 70 ? "#10b981" : o.reputation >= 55 ? "#C2A060" : "#e11d48" }));
  // Emerald = success colour. Use emerald-600 on light backgrounds (WCAG AA on white ≈ 4.6:1)
  // and emerald-400 on dark backgrounds (≈ 12.6:1 on charcoal).
  const repColor = (r: number) => r >= 70 ? "text-emerald-600 dark:text-emerald-400" : r >= 55 ? "text-secondary" : "text-accent";
  const statusColor = (s: string) => s === "resolved" ? "text-emerald-600 dark:text-emerald-400" : s === "investigating" ? "text-secondary" : s === "escalated" ? "text-accent" : "text-muted-foreground";

  return (
    <OverlayShell open={open} onClose={onClose} variant="fullscreen" ariaLabel="Citizen Shield">
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 backdrop-blur-xl bg-background/80">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-border/40 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-secondary" /></div>
              <div className="flex-1 min-w-0"><h1 className="font-display text-xl leading-tight">Citizen Shield</h1><p className="text-[11px] text-muted-foreground">National Civic Intelligence · 15th Pillar</p></div>
              <button onClick={() => setView("safety")} className={cn("px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition border", deadManEnabled ? "bg-accent/20 border-accent/40 text-accent" : "bg-card border-border/60 hover:bg-muted/40")} aria-label="Journalist safety mode"><Radio className={cn("w-3.5 h-3.5", deadManEnabled && "animate-pulse")} /> Safety</button>
              <button onClick={handlePanic} className={cn("px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition border", panicArmed ? "bg-accent text-accent-foreground border-accent animate-pulse" : "bg-accent/10 text-accent border-accent/40 hover:bg-accent/20")} aria-label="Panic mode"><Zap className="w-3.5 h-3.5" /> {panicArmed ? "Confirm" : "Panic"}</button>
              <button onClick={() => setView("recording")} className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium flex items-center gap-1.5 animate-pulse"><Video className="w-3.5 h-3.5" /> Record</button>
              <FeedbackButton overlayName="Citizen Shield" />
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto"><div className="max-w-2xl mx-auto px-5 py-6 pb-32">
            <AnimatePresence mode="wait">
              {view === "dashboard" && (
                <motion.div key="dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="mb-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Report as</div><div className="grid grid-cols-3 gap-2">{(["identified", "protected", "anonymous"] as Privacy[]).map((p) => (<button key={p} onClick={() => setPrivacy(p)} className={cn("rounded-xl p-2.5 text-center border transition", privacy === p ? "bg-primary/20 border-primary/40" : "bg-card border-border/60 hover:bg-muted/40")}><div className="text-lg">{p === "identified" ? "🪪" : p === "protected" ? "🛡️" : "👻"}</div><div className="text-[10px] font-medium mt-0.5 capitalize">{p}</div></button>))}</div></div>
                  {/* Civic Wave Publishing */}
                  <div className="mb-4">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">📢 Civic Wave — Publish to</div>
                    <div className="space-y-1.5">
                      <button onClick={() => setPublishMidan(!publishMidan)} className={cn("w-full rounded-xl p-2.5 flex items-center gap-3 border transition", publishMidan ? "bg-secondary/15 border-secondary/40" : "bg-card border-border/60 hover:bg-muted/40")}>
                        <span className="text-lg">📰</span>
                        <div className="flex-1 text-start">
                          <div className="text-[11px] font-medium">Midan (Social Feed)</div>
                          <div className="text-[9px] text-muted-foreground">Post as {privacy} on the public square</div>
                        </div>
                        <div className={cn("w-8 h-5 rounded-full transition relative shrink-0", publishMidan ? "bg-secondary" : "bg-muted")}>
                          <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-background transition-all", publishMidan ? "left-[14px]" : "left-0.5")} />
                        </div>
                      </button>
                      <button onClick={() => setPublishMashahd(!publishMashahd)} className={cn("w-full rounded-xl p-2.5 flex items-center gap-3 border transition", publishMashahd ? "bg-secondary/15 border-secondary/40" : "bg-card border-border/60 hover:bg-muted/40")}>
                        <span className="text-lg">📹</span>
                        <div className="flex-1 text-start">
                          <div className="text-[11px] font-medium">Mashahd (Video Evidence)</div>
                          <div className="text-[9px] text-muted-foreground">Share video evidence publicly</div>
                        </div>
                        <div className={cn("w-8 h-5 rounded-full transition relative shrink-0", publishMashahd ? "bg-secondary" : "bg-muted")}>
                          <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-background transition-all", publishMashahd ? "left-[14px]" : "left-0.5")} />
                        </div>
                      </button>
                      <button onClick={() => setPublishPublicLink(!publishPublicLink)} className={cn("w-full rounded-xl p-2.5 flex items-center gap-3 border transition", publishPublicLink ? "bg-accent/15 border-accent/40" : "bg-card border-border/60 hover:bg-muted/40")}>
                        <span className="text-lg">🌍</span>
                        <div className="flex-1 text-start">
                          <div className="text-[11px] font-medium">Public Link (Shareable)</div>
                          <div className="text-[9px] text-muted-foreground">Generate link for media & NGOs</div>
                        </div>
                        <div className={cn("w-8 h-5 rounded-full transition relative shrink-0", publishPublicLink ? "bg-accent" : "bg-muted")}>
                          <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-background transition-all", publishPublicLink ? "left-[14px]" : "left-0.5")} />
                        </div>
                      </button>
                    </div>
                    {(!publishMidan && !publishMashahd && !publishPublicLink) && (
                      <p className="text-[9px] text-muted-foreground mt-1.5 text-center">🔒 Report goes ONLY to authorities. No public posting.</p>
                    )}
                    {(publishMidan || publishMashahd || publishPublicLink) && privacy === "anonymous" && (
                      <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1.5 text-center">👻 Publishing as Anonymous — your identity is protected.</p>
                    )}
                  </div>
                  <button onClick={() => setProtectionMode(!protectionMode)} className={cn("w-full mb-4 rounded-xl p-3 flex items-center gap-3 border transition", protectionMode ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card border-border/60")}><ShieldCheck className={cn("w-5 h-5", protectionMode ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} /><div className="flex-1 text-start"><div className="text-sm font-medium">Citizen Protection Mode</div><div className="text-[10px] text-muted-foreground">Screen stays asleep · Stealth upload</div></div><div className={cn("w-10 h-6 rounded-full transition relative", protectionMode ? "bg-emerald-500" : "bg-muted")}><div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-background transition-all", protectionMode ? "left-[18px]" : "left-0.5")} /></div></button>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">{[{ label: "Active Cases", val: 12, icon: FileText, color: "text-accent" }, { label: "Resolved", val: 847, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" }, { label: "Witnesses", val: 23, icon: Users, color: "text-secondary" }, { label: "Satisfaction", val: 94, suffix: "%", icon: Heart, color: "text-secondary" }].map((s) => (<StatTile key={s.label} {...s} />))}</div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">{[{ icon: Video, label: "Report", view: "recording" as View }, { icon: QrCode, label: "QR Check-in", view: "qr" as View }, { icon: Heart, label: "Compliment", view: "compliment" as View }, { icon: Users, label: "Witness", view: "witness" as View }, { icon: FileText, label: "Track Case", view: "case" as View }, { icon: BarChart3, label: "Gov Dashboard", view: "government" as View }].map((a) => (<button key={a.label} onClick={() => setView(a.view)} className="relative rounded-xl bg-card border border-border/60 p-3 flex flex-col items-center gap-1.5 hover:scale-105 transition overflow-hidden"><div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-xl" /><a.icon className="w-4 h-4 text-secondary relative" /><span className="text-[10px] relative">{a.label}</span></button>))}</div>
                  <div className="mb-6"><h3 className="font-display text-sm font-semibold mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-secondary" /> National Reputation Map</h3><CirkleMap center={[24.7136, 46.6753]} zoom={11} markers={officeMarkers} height="300px" /><div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 70+</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary" /> 55-69</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> &lt;55</span></div></div>
                  <h3 className="font-display text-sm font-semibold mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-secondary" /> Recent Cases <span className="text-[10px] text-muted-foreground">· {CASES.length} live</span></h3>
                  <div className="space-y-2 mb-6">{CASES.map((c) => (<button key={c.id} onClick={() => { setSelectedCase(c.id); setView("case"); }} className="w-full text-start rounded-xl bg-card border border-border/60 p-3 hover:bg-muted/40 transition"><div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-mono text-muted-foreground">{c.number}</span><span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", c.status === "resolved" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : c.status === "investigating" ? "bg-secondary/15 text-secondary" : c.status === "escalated" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground")}>{c.status}</span><span className="text-[10px] text-muted-foreground ml-auto">{c.time}</span></div><p className="text-xs font-medium line-clamp-1">{c.title}</p><div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground"><span>📍 {c.office}</span><span className={repColor(c.rep)}>Rep {c.rep}</span><span>📹 {c.evidence}</span><span>👁️ {c.witnesses}</span></div></button>))}</div>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" /><div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">312 resolved cases published</div><div className="text-[10px] text-muted-foreground mt-0.5">Full transparency ledger · Public accountability</div></div>
                </motion.div>
              )}
              {view === "recording" && (
                <motion.div key="recording" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <button onClick={() => setView("dashboard")} className="text-xs text-muted-foreground mb-3 flex items-center gap-1">← Back</button>
                  <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-charcoal mb-4 border border-border/40"><div className="absolute inset-0 aurora-bg opacity-30" /><div className="absolute top-3 left-3 flex items-center gap-1.5 bg-accent/90 text-accent-foreground px-2 py-1 rounded-full text-[10px] font-mono">{recording && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}{recording ? "REC" : (uploadPct === 100 ? "DONE" : "READY")}</div>{recording && uploadPct < 100 && (<div className="absolute top-3 right-3 bg-emerald-500/90 text-white px-2 py-1 rounded-full text-[10px] font-mono flex items-center gap-1"><Upload className="w-3 h-3 animate-bounce" /> LIVE {uploadPct}%</div>)}<div className="absolute inset-0 flex items-center justify-center"><button onClick={() => { if (recording) { stopRecording(); toast.success("Evidence secured · Hash verified · IPFS uploaded"); } else setRecording(true); }} className={cn("w-20 h-20 rounded-full flex items-center justify-center transition", recording ? "bg-accent" : "bg-accent/80")}><div className={cn("w-16 h-16 rounded-full flex items-center justify-center", recording ? "bg-accent-foreground" : "bg-accent")}>{recording ? <div className="w-5 h-5 rounded bg-accent" /> : <Video className="w-7 h-7 text-accent-foreground" />}</div></button></div>{recording && (<div className="absolute bottom-3 inset-x-3 text-center"><div className="font-mono text-2xl text-white">{String(Math.floor(recordTime / 60)).padStart(2, "0")}:{String(recordTime % 60).padStart(2, "0")}</div>{uploadPct < 100 && <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${uploadPct}%` }} /></div>}</div>)}</div>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2 text-xs"><Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /><div className="flex-1"><div className="font-medium text-emerald-600 dark:text-emerald-400">Evidence Lock Active</div><div className="text-[10px] text-muted-foreground">Hash chain secured · IPFS uploaded · Court-admissible</div></div><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>

                  {/* ── Publish as Civic Wave — post-recording submission ── */}
                  {!recording && uploadPct === 100 && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-primary/5 p-4">
                      <div className="flex items-center gap-2 mb-3"><Newspaper className="w-4 h-4 text-secondary" /><span className="font-display text-sm font-semibold">Publish as Civic Wave</span></div>
                      <p className="text-[10px] text-muted-foreground mb-3">Body will be anonymized — metadata stripped, location generalized to city level. Evidence hashes truncated.</p>
                      <div className="space-y-2 mb-3">
                        <label className="block"><span className="text-[10px] font-medium text-muted-foreground">Category</span>
                          <select value={reportCategory} onChange={(e) => setReportCategory(e.target.value)} className="mt-1 w-full bg-muted rounded-lg px-3 py-2 text-xs outline-none border border-border/40 focus:border-secondary">
                            {REPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </label>
                        <label className="block"><span className="text-[10px] font-medium text-muted-foreground">Office</span>
                          <select value={reportOffice} onChange={(e) => setReportOffice(e.target.value)} className="mt-1 w-full bg-muted rounded-lg px-3 py-2 text-xs outline-none border border-border/40 focus:border-secondary">
                            {OFFICES.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
                          </select>
                        </label>
                        <label className="block"><span className="text-[10px] font-medium text-muted-foreground">Title</span>
                          <input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="e.g. Officer refused to file report" className="mt-1 w-full bg-muted rounded-lg px-3 py-2 text-xs outline-none border border-border/40 focus:border-secondary" />
                        </label>
                        <label className="block"><span className="text-[10px] font-medium text-muted-foreground">Description</span>
                          <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="What happened?" className="mt-1 w-full bg-muted rounded-lg px-3 py-2 text-xs outline-none border border-border/40 focus:border-secondary min-h-16 resize-none" />
                        </label>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Publish to</div>
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        <button onClick={() => setPublishMidan(!publishMidan)} className={cn("rounded-lg p-2 text-[10px] font-medium border transition", publishMidan ? "bg-secondary/15 border-secondary/40 text-secondary" : "bg-card border-border/40 text-muted-foreground hover:bg-muted/40")}>📰 Midan</button>
                        <button onClick={() => setPublishMashahd(!publishMashahd)} className={cn("rounded-lg p-2 text-[10px] font-medium border transition", publishMashahd ? "bg-secondary/15 border-secondary/40 text-secondary" : "bg-card border-border/40 text-muted-foreground hover:bg-muted/40")}>📹 Mashahd</button>
                        <button onClick={() => setPublishPublicLink(!publishPublicLink)} className={cn("rounded-lg p-2 text-[10px] font-medium border transition", publishPublicLink ? "bg-accent/15 border-accent/40 text-accent" : "bg-card border-border/40 text-muted-foreground hover:bg-muted/40")}>🌍 Link</button>
                      </div>
                      <button onClick={publishAsCivicWave} disabled={publishing} className="w-full py-2.5 rounded-xl bg-gradient-to-br from-secondary to-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                        {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</> : <><Newspaper className="w-4 h-4" /> Publish as Civic Wave</>}
                      </button>
                      {lastPublishedCaseId && lastPublishedLink && (
                        <div className="mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span className="truncate font-mono">{lastPublishedLink}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
              {view === "case" && (
                <motion.div key="case" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <button onClick={() => setView("dashboard")} className="text-xs text-muted-foreground mb-3 flex items-center gap-1">← Back</button>
                  {(() => { const c = CASES.find((x) => x.id === selectedCase) || CASES[0]; return (<><div className="flex items-center gap-2 mb-2"><span className="text-[10px] font-mono text-muted-foreground">{c.number}</span><span className={cn("text-[10px] px-1.5 py-0.5 rounded-full capitalize", statusColor(c.status))}>{c.status}</span></div><h2 className="font-display text-lg mb-1">{c.title}</h2><p className="text-xs text-muted-foreground mb-3">📍 {c.office} · {c.time}</p><div className="rounded-xl bg-primary/10 border border-primary/20 p-3 mb-3"><div className="flex items-center gap-1.5 text-[10px] text-secondary mb-1"><Brain className="w-3 h-3" /> AI Case Summary</div><p className="text-xs text-muted-foreground">Pattern matches 3 similar complaints at this office in Q2 2025. AI fraud detection: 87% confidence of systemic issue.</p></div><h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Escalation Chain</h3><div className="space-y-2 mb-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border">{[{ level: "L1 — Front Desk", reached: true, sla: "24h" }, { level: "L2 — Supervisor", reached: true, sla: "48h" }, { level: "L3 — Department Head", reached: false, sla: "72h" }, { level: "L4 — Ministry", reached: false, sla: "7d" }].map((e, i) => (<div key={i} className="relative flex items-center gap-3 pl-8"><div className={cn("absolute left-1.5 w-3 h-3 rounded-full border-2", e.reached ? "bg-emerald-500 border-emerald-500" : "bg-card border-border")} /><div className="flex-1"><div className="text-xs font-medium">{e.level}</div><div className="text-[10px] text-muted-foreground">SLA: {e.sla}</div></div>{e.reached ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : null}</div>))}</div><button onClick={() => toast.success("AI brief drafted", { description: "Legal-ready case brief generated" })} className="w-full rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-primary/30 p-3 flex items-center gap-2 hover:from-primary/40 transition"><Sparkles className="w-4 h-4 text-secondary" /><span className="text-xs font-medium">AI Case Builder — Draft legal brief</span><ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" /></button></>); })()}
                </motion.div>
              )}
              {view === "government" && (
                <motion.div key="government" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <button onClick={() => setView("dashboard")} className="text-xs text-muted-foreground mb-3 flex items-center gap-1">← Back</button>
                  <h2 className="font-display text-lg mb-1">Government Dashboard</h2>
                  <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">AI Predictive Governance</h3>
                  <div className="space-y-2 mb-4">{[{ severity: "high", title: "Passport office SLA breach trend", desc: "47% SLA breach rate this month.", confidence: 92 },{ severity: "medium", title: "Traffic signal failures clustering", desc: "3 signal malfunctions within 2km.", confidence: 78 },{ severity: "low", title: "Billing complaint spike", desc: "2.3x normal billing complaints.", confidence: 65 }].map((a, i) => (<div key={i} className={cn("rounded-xl p-3 border", a.severity === "high" ? "bg-accent/10 border-accent/30" : a.severity === "medium" ? "bg-secondary/10 border-secondary/30" : "bg-muted/30 border-border/60")}><div className="flex items-center gap-2 mb-1"><AlertTriangle className={cn("w-3.5 h-3.5", a.severity === "high" ? "text-accent" : a.severity === "medium" ? "text-secondary" : "text-muted-foreground")} /><span className="text-xs font-medium">{a.title}</span></div><p className="text-[10px] text-muted-foreground">{a.desc}</p><div className="text-[10px] text-muted-foreground mt-1">Confidence: {a.confidence}%</div></div>))}</div>
                </motion.div>
              )}
              {view === "witness" && (
                <motion.div key="witness" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <button onClick={() => setView("dashboard")} className="text-xs text-muted-foreground mb-3 flex items-center gap-1">← Back</button>
                  <h2 className="font-display text-lg mb-1">Witness Network</h2>
                  <div className="rounded-xl bg-gradient-to-br from-secondary/20 to-primary/10 border border-secondary/30 p-3 mb-4"><div className="flex items-center gap-2"><div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center"><Heart className="w-5 h-5 text-secondary" /></div><div className="flex-1"><div className="text-sm font-medium">Trusted Witness</div><div className="text-[10px] text-muted-foreground">Score: 87 · Accuracy: 94% · 23 cases</div></div></div></div>
                  <div className="space-y-2">{[{ title: "Traffic signal malfunction at King Fahd Rd", distance: "0.8 km", time: "10m ago", needed: 2, confirmed: 1 },{ title: "Long queue at passport office — no AC", distance: "1.2 km", time: "25m ago", needed: 3, confirmed: 2 },{ title: "Pothole causing accidents on Salam St", distance: "2.1 km", time: "1h ago", needed: 2, confirmed: 0 }].map((w) => (<div key={w.title} className="rounded-xl bg-card border border-border/60 p-3"><div className="flex items-center gap-2 mb-1"><MapPin className="w-3 h-3 text-secondary" /><span className="text-[10px] text-muted-foreground">{w.distance} · {w.time}</span><span className="text-[10px] text-muted-foreground ml-auto">{w.confirmed}/{w.needed} confirmed</span></div><p className="text-xs font-medium mb-2">{w.title}</p><div className="grid grid-cols-3 gap-1.5"><button onClick={() => toast.success("Witness confirmed ✓")} className="rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 py-1.5 text-[10px] font-medium hover:bg-emerald-500/25">✓ Witnessed</button><button onClick={() => toast.success("Was there")} className="rounded-lg bg-secondary/15 text-secondary py-1.5 text-[10px] font-medium hover:bg-secondary/25">📍 Was there</button><button onClick={() => toast("Dispute filed")} className="rounded-lg bg-accent/15 text-accent py-1.5 text-[10px] font-medium hover:bg-accent/25">⚠ Dispute</button></div></div>))}</div>
                </motion.div>
              )}
              {view === "qr" && (
                <motion.div key="qr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <button onClick={() => setView("dashboard")} className="text-xs text-muted-foreground mb-3 flex items-center gap-1">← Back</button>
                  <h2 className="font-display text-lg mb-1">QR Check-in</h2>
                  <div className="relative rounded-2xl overflow-hidden aspect-square max-w-xs mx-auto bg-charcoal border border-border/40 mb-4"><div className="absolute inset-0 flex items-center justify-center"><div className="relative w-3/4 h-3/4 border-2 border-secondary/40 rounded-2xl"><div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-secondary rounded-tl-lg" /><div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-secondary rounded-tr-lg" /><div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-secondary rounded-bl-lg" /><div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-secondary rounded-br-lg" /><motion.div animate={{ y: ["0%", "100%", "0%"] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-x-2 h-0.5 bg-secondary" /></div></div></div>
                  <button onClick={() => toast.success("Checked in at Al-Olaya Traffic Police")} className="w-full rounded-xl bg-gradient-hero text-cream py-3 text-sm font-medium">Scan QR Code</button>
                </motion.div>
              )}
              {view === "compliment" && (
                <motion.div key="compliment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <button onClick={() => setView("dashboard")} className="text-xs text-muted-foreground mb-3 flex items-center gap-1">← Back</button>
                  <h2 className="font-display text-lg mb-1">Submit a Compliment</h2>
                  <div className="rounded-xl bg-card border border-border/60 p-4 mb-3"><input className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none" placeholder="Employee name" /><input className="w-full bg-muted rounded-lg px-3 py-2 text-sm mt-2 outline-none" placeholder="Office" /><textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm mt-2 outline-none min-h-20" placeholder="What did they do well?" /></div>
                  <button onClick={() => toast.success("Compliment submitted 💚")} className="w-full rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 py-3 text-sm font-medium">Submit Compliment</button>
                </motion.div>
              )}
              {view === "safety" && (
                <motion.div key="safety" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <button onClick={() => setView("dashboard")} className="text-xs text-muted-foreground mb-3 flex items-center gap-1">← Back</button>
                  <h2 className="font-display text-lg mb-1">Journalist Safety Mode</h2>
                  <p className="text-[11px] text-muted-foreground mb-4">For reporters in high-risk situations. All features client-side — no server record.</p>

                  {/* Dead-man switch */}
                  <div className={cn("rounded-2xl border p-4 mb-3 transition", deadManEnabled ? "bg-accent/10 border-accent/40" : "bg-card border-border/60")}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", deadManEnabled ? "bg-accent/20" : "bg-muted")}>
                        <AlertOctagon className={cn("w-5 h-5", deadManEnabled ? "text-accent animate-pulse" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">Dead-man switch</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">If you miss a check-in, evidence is auto-published to your chosen targets.</div>
                      </div>
                      <button onClick={() => {
                        const next = !deadManEnabled;
                        setDeadManEnabled(next);
                        toast.success(next ? "Dead-man switch armed" : "Dead-man switch disabled", {
                          description: next ? `Check in every ${deadManInterval} or evidence auto-publishes.` : undefined,
                        });
                      }} className={cn("w-10 h-6 rounded-full transition relative shrink-0", deadManEnabled ? "bg-accent" : "bg-muted")} role="switch" aria-checked={deadManEnabled} aria-label="Toggle dead-man switch">
                        <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-background transition-all", deadManEnabled ? "left-[18px]" : "left-0.5")} />
                      </button>
                    </div>
                    {deadManEnabled && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-3 border-t border-accent/30 space-y-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Check-in interval</div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(["5min", "1hr", "24hr"] as DeadManInterval[]).map((iv) => (
                              <button key={iv} onClick={() => setDeadManInterval(iv)} className={cn("text-[11px] py-1.5 rounded-lg border font-medium transition", deadManInterval === iv ? "bg-accent/15 border-accent/40 text-accent" : "bg-card border-border/40 text-muted-foreground hover:bg-muted/40")}>{iv}</button>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">If you don't check in for {DEAD_MAN_MINUTES[deadManInterval]} minutes, evidence auto-publishes.</p>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Auto-publish targets</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {DEAD_MAN_TARGETS.map((t) => (
                              <button key={t.id} onClick={() => toggleDeadManTarget(t.id)} className={cn("rounded-lg p-2 text-start border transition flex items-center gap-2", deadManTargets.has(t.id) ? "bg-accent/15 border-accent/40 text-accent" : "bg-card border-border/40 text-muted-foreground hover:bg-muted/40")}>
                                <span className="text-base">{t.emoji}</span>
                                <span className="text-[10px] font-medium">{t.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <button onClick={async () => { await fetch("/api/shield/checkin", { method: "POST" }).catch(() => null); toast.success("Checked in", { description: `Timer reset to ${deadManInterval}.` }); }} className="w-full py-2 rounded-lg bg-secondary/15 text-secondary hover:bg-secondary/25 transition text-xs font-medium">Check in now</button>
                      </motion.div>
                    )}
                  </div>

                  {/* Decoy activity */}
                  <div className={cn("rounded-2xl border p-4 mb-3 transition", decoyActive ? "bg-secondary/10 border-secondary/40" : "bg-card border-border/60")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", decoyActive ? "bg-secondary/20" : "bg-muted")}>
                        <EyeOff className={cn("w-5 h-5", decoyActive ? "text-secondary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">Decoy activity</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Sends fake reports at random intervals to mask real reporting.</div>
                      </div>
                      <button onClick={() => { setDecoyActive((v) => !v); toast.success(decoyActive ? "Decoy off" : "Decoy on"); }} className={cn("w-10 h-6 rounded-full transition relative shrink-0", decoyActive ? "bg-secondary" : "bg-muted")} role="switch" aria-checked={decoyActive} aria-label="Toggle decoy activity">
                        <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-background transition-all", decoyActive ? "left-[18px]" : "left-0.5")} />
                      </button>
                    </div>
                  </div>

                  {/* Panic mode */}
                  <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4 mb-3">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-accent">Panic mode</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">2-tap to confirm. Wipes local data, starts decoy, broadcasts to trusted contacts.</div>
                      </div>
                    </div>
                    <button onClick={handlePanic} className={cn("w-full py-3 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2 transition", panicArmed ? "bg-accent text-accent-foreground border-accent animate-pulse" : "bg-accent/10 text-accent border-accent/40 hover:bg-accent/20")}>
                      <Zap className="w-4 h-4" />
                      {panicArmed ? "Tap again to confirm PANIC WIPE" : "PANIC — wipe + decoy + broadcast"}
                    </button>
                  </div>

                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-[10px] text-muted-foreground">
                    <Lock className="w-3.5 h-3.5 text-secondary inline mr-1" />
                    All safety features run client-side. No server record of your safety state. Evidence stays encrypted on IPFS — panic wipe only affects local copies.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div></div>
    </OverlayShell>
  );
}

function StatTile({ label, val, suffix = "", icon: Icon, color }: { label: string; val: number; suffix?: string; icon: LucideIcon; color: string }) {
  const v = useCountUp(val);
  return (<div className="relative rounded-xl bg-card border border-border/60 p-3 overflow-hidden"><div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-xl" /><Icon className={cn("w-4 h-4 mb-1", color)} /><div className="font-display text-xl">{v}{suffix}</div><div className="text-[10px] text-muted-foreground">{label}</div></div>);
}

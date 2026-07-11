"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, ShieldCheck, Fingerprint, Globe2, Briefcase, Smartphone,
  BadgeCheck, Ban, Download, Copy, RefreshCw, Loader2, KeyRound,
  CheckCircle2, AlertCircle, type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props { open: boolean; onClose: () => void; }

// ── Attestation shape (mirrors src/lib/identity.ts Attestation) ──
interface Attestation {
  id: string;
  claimType: "over_18" | "nationality" | "professional" | "unique_human";
  claimValue: string;
  subject: string;
  attestedAt: string;
  attester: string;
  signature: string;
  nullifier: string;
  status: "verified" | "pending" | "revoked";
  expiresAt?: string | null;
}

type ClaimType = Attestation["claimType"];

interface ClaimMeta {
  type: ClaimType;
  label: string;
  emoji: string;
  icon: LucideIcon;
  tint: string;
  description: string;
  cta: string;
}

const CLAIM_META: ClaimMeta[] = [
  {
    type: "over_18",
    label: "Age",
    emoji: "🎂",
    icon: Fingerprint,
    tint: "from-secondary/30 to-accent/15 border-secondary/30",
    description: "Prove you're over 18 without revealing your DOB.",
    cta: "Verify age",
  },
  {
    type: "nationality",
    label: "Nationality",
    emoji: "🌍",
    icon: Globe2,
    tint: "from-primary/30 to-secondary/15 border-primary/30",
    description: "Prove your nationality without revealing your passport number.",
    cta: "Verify nationality",
  },
  {
    type: "professional",
    label: "Profession",
    emoji: "💼",
    icon: Briefcase,
    tint: "from-steel/30 to-primary/15 border-steel/30",
    description: "Self-attest your profession. Verified later by your employer.",
    cta: "Self-attest",
  },
  {
    type: "unique_human",
    label: "Unique Human",
    emoji: "🆔",
    icon: Smartphone,
    tint: "from-accent/30 to-steel/15 border-accent/30",
    description: "One human, one account. Device-attested proof of personhood.",
    cta: "Device attest",
  },
];

const CLAIM_LABELS: Record<ClaimType, string> = {
  over_18: "Over 18",
  nationality: "Nationality",
  professional: "Profession",
  unique_human: "Unique Human",
};

function claimDisplay(a: Attestation): { label: string; value: string } {
  switch (a.claimType) {
    case "over_18":
      return { label: "Over 18", value: a.claimValue === "true" ? "Yes" : "No" };
    case "nationality":
      return { label: "Nationality", value: a.claimValue };
    case "professional":
      return { label: "Profession", value: a.claimValue };
    case "unique_human":
      return { label: "Unique Human", value: "Device-attested" };
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return iso; }
}

function shortHash(h: string, head = 8, tail = 6): string {
  if (!h) return "—";
  if (h.length <= head + tail + 1) return h;
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

export function CirkleIdentity({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username || "guest";

  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeClaim, setActiveClaim] = useState<ClaimMeta | null>(null);
  const [issuing, setIssuing] = useState(false);
  // Per-claim form state for the modal
  const [dob, setDob] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [profession, setProfession] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [exportedJwt, setExportedJwt] = useState<{ id: string; jwt: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/identity/list?username=${encodeURIComponent(username)}`, { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.attestations)) {
        setAttestations(data.attestations);
      } else {
        setAttestations([]);
      }
    } catch {
      setAttestations([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const verifiedCount = useMemo(
    () => attestations.filter((a) => a.status === "verified").length,
    [attestations],
  );

  const hasActiveClaim = useCallback(
    (type: ClaimType) =>
      attestations.some((a) => a.claimType === type && a.status === "verified"),
    [attestations],
  );

  const handleIssue = async () => {
    if (!activeClaim) return;
    setIssuing(true);
    try {
      const body: Record<string, unknown> = {
        username,
        claimType: activeClaim.type,
        attester: activeClaim.type === "professional" ? "self" : "cirkle-authority",
      };
      if (activeClaim.type === "over_18") body.dob = dob;
      if (activeClaim.type === "nationality") body.documentNumber = documentNumber;
      if (activeClaim.type === "professional") body.claimValue = profession;
      if (activeClaim.type === "unique_human") body.deviceId = deviceId || `cirkle-${Math.random().toString(36).slice(2, 14)}`;

      const res = await fetch("/api/identity/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error("Verification failed", { description: data?.error || "Try again." });
        return;
      }
      toast.success(`${activeClaim.label} attested`, {
        description: "Signed by Cirkle Authority. ZK — no underlying data revealed.",
      });
      setActiveClaim(null);
      setDob(""); setDocumentNumber(""); setProfession(""); setDeviceId("");
      await refresh();
    } catch (err) {
      toast.error("Network error", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIssuing(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/identity/list?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error("Revoke failed", { description: data?.error || "" });
        return;
      }
      toast.success("Attestation revoked", {
        description: "Signature invalidated. Third parties can no longer verify it.",
      });
      await refresh();
    } catch {
      toast.error("Network error");
    }
  };

  const handleExport = async (id: string) => {
    setExporting(true);
    try {
      const res = await fetch("/api/identity/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error("Export failed", { description: data?.error || "" });
        return;
      }
      setExportedJwt({ id, jwt: data.jwt });
      toast.success("Attestation exported", {
        description: "Signed JWT ready. Present to any third party.",
      });
    } catch {
      toast.error("Network error");
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} variant="fullscreen" ariaLabel="Cirkle Identity — Zero-knowledge attestations">
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 backdrop-blur-xl bg-background/80">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/20 border border-border/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight">Cirkle ID</h1>
            <p className="text-[11px] text-muted-foreground">Zero-knowledge identity attestations · OIDC-style</p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-6 pb-32">
          {/* Stats card */}
          <div className="rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/10 border border-secondary/30 p-4 mb-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Your identity wallet</div>
                <div className="font-display text-2xl mt-0.5">
                  {verifiedCount} <span className="text-base text-muted-foreground">verified</span>
                  <span className="mx-2 text-border">·</span>
                  <span className="text-base text-muted-foreground">{attestations.length} total</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                  <KeyRound className="w-3 h-3 text-secondary" />
                  Signed by Cirkle Authority · HMAC-SHA256
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Subject</div>
                <div className="font-mono text-sm">{username}@cirkle</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Claims never reveal PII</div>
              </div>
            </div>
          </div>

          {/* Get verified grid */}
          <h2 className="font-display text-sm font-semibold mb-2 flex items-center gap-1.5">
            <BadgeCheck className="w-4 h-4 text-secondary" /> Get verified
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
            {CLAIM_META.map((c) => {
              const active = hasActiveClaim(c.type);
              return (
                <button
                  key={c.type}
                  onClick={() => { setActiveClaim(c); setExportedJwt(null); }}
                  className={cn(
                    "text-start rounded-2xl p-3.5 border bg-gradient-to-br transition relative overflow-hidden",
                    c.tint,
                    "hover:scale-[1.02]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-background/70 flex items-center justify-center text-xl shrink-0">
                      {c.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">{c.label}</span>
                        {active && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                      <div className="text-[11px] font-medium mt-1.5 flex items-center gap-1">
                        {active ? "Re-attest" : c.cta}
                        <span aria-hidden>→</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Attestations list */}
          <h2 className="font-display text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Fingerprint className="w-4 h-4 text-secondary" /> Your attestations
            <span className="text-[10px] text-muted-foreground font-normal">· {attestations.length}</span>
          </h2>

          {loading && attestations.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : attestations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-8 text-center">
              <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">No attestations yet</p>
              <p className="text-[11px] text-muted-foreground mt-1">Tap “Get verified” above to issue your first claim.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[28rem] overflow-y-auto pr-1 -mr-1">
              {attestations.map((a) => {
                const meta = CLAIM_META.find((m) => m.type === a.claimType);
                const display = claimDisplay(a);
                const isRevoked = a.status === "revoked";
                const isExpired = a.expiresAt ? new Date(a.expiresAt).getTime() < Date.now() : false;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "rounded-2xl border bg-card p-3.5",
                      isRevoked ? "border-border/40 opacity-60" : "border-border/60",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-background/70 border border-border/40 flex items-center justify-center text-lg shrink-0">
                        {meta?.emoji ?? "🪪"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{display.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary font-mono">
                            {display.value}
                          </span>
                          {a.status === "verified" && !isExpired && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                            </span>
                          )}
                          {isRevoked && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
                              <Ban className="w-2.5 h-2.5" /> Revoked
                            </span>
                          )}
                          {isExpired && !isRevoked && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                              Expired
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                          <span>by <span className="font-mono">{a.attester}</span></span>
                          <span>·</span>
                          <span>{formatDate(a.attestedAt)}</span>
                          {a.expiresAt && (<><span>·</span><span>exp {formatDate(a.expiresAt)}</span></>)}
                        </div>
                        <div className="text-[9px] text-muted-foreground/80 mt-1 font-mono truncate">
                          nullifier: {shortHash(a.nullifier)}
                        </div>
                      </div>
                    </div>
                    {!isRevoked && (
                      <div className="flex items-center gap-1.5 mt-3">
                        <button
                          onClick={() => handleExport(a.id)}
                          disabled={exporting}
                          className="flex-1 text-[11px] py-1.5 rounded-lg bg-secondary/15 text-secondary hover:bg-secondary/25 transition flex items-center justify-center gap-1.5 font-medium disabled:opacity-50"
                        >
                          {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                          Export
                        </button>
                        <button
                          onClick={() => handleRevoke(a.id)}
                          className="flex-1 text-[11px] py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition flex items-center justify-center gap-1.5 font-medium"
                        >
                          <Ban className="w-3 h-3" /> Revoke
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Footer explainer */}
          <div className="mt-6 rounded-2xl bg-primary/10 border border-primary/20 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-secondary" />
              <span className="text-xs font-semibold">How ZK attestations work</span>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
              <li>You submit source data (DOB, passport, device id) — the server validates it and <span className="text-foreground">immediately discards it</span>.</li>
              <li>Only the derived claim (“over_18: true”, “nationality: EG”) is HMAC-signed and persisted.</li>
              <li>The signature is verifiable by any third party via <code className="font-mono text-[10px] bg-muted/60 px-1 rounded">/api/identity/verify</code> without revealing PII.</li>
              <li>A <span className="text-foreground">nullifier</span> (SHA256 of username + claimType) prevents duplicate attestations without exposing the username.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Issue modal */}
      <AnimatePresence>
        {activeClaim && (
          <IssueModal
            claim={activeClaim}
            issuing={issuing}
            onClose={() => setActiveClaim(null)}
            onIssue={handleIssue}
            dob={dob}
            setDob={setDob}
            documentNumber={documentNumber}
            setDocumentNumber={setDocumentNumber}
            profession={profession}
            setProfession={setProfession}
            deviceId={deviceId}
            setDeviceId={setDeviceId}
          />
        )}
      </AnimatePresence>

      {/* Export modal */}
      <AnimatePresence>
        {exportedJwt && (
          <ExportModal
            jwt={exportedJwt.jwt}
            onClose={() => setExportedJwt(null)}
            onCopy={() => copyToClipboard(exportedJwt.jwt, "JWT")}
          />
        )}
      </AnimatePresence>
    </OverlayShell>
  );
}

// ── Issue modal ───────────────────────────────────────────────────

interface IssueModalProps {
  claim: ClaimMeta;
  issuing: boolean;
  onClose: () => void;
  onIssue: () => void;
  dob: string;
  setDob: (v: string) => void;
  documentNumber: string;
  setDocumentNumber: (v: string) => void;
  profession: string;
  setProfession: (v: string) => void;
  deviceId: string;
  setDeviceId: (v: string) => void;
}

function IssueModal(props: IssueModalProps) {
  const { claim, issuing, onClose, onIssue } = props;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[160] bg-charcoal/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-float overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={`Attest ${claim.label}`}
      >
        <div className="px-4 pt-4 pb-2 flex items-center gap-3 border-b border-border/40">
          <div className="w-10 h-10 rounded-xl bg-background/70 border border-border/40 flex items-center justify-center text-xl">
            {claim.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base">{claim.label}</h3>
            <p className="text-[10px] text-muted-foreground">{claim.description}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          {claim.type === "over_18" && (
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Date of birth</span>
              <input
                type="date"
                value={props.dob}
                onChange={(e) => props.setDob(e.target.value)}
                className="mt-1 w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border/40 focus:border-secondary"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">Never persisted. Only the boolean claim is signed.</span>
            </label>
          )}
          {claim.type === "nationality" && (
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Passport / ID number</span>
              <input
                type="text"
                value={props.documentNumber}
                onChange={(e) => props.setDocumentNumber(e.target.value)}
                placeholder="e.g. EG1234567"
                className="mt-1 w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border/40 focus:border-secondary font-mono"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">Mock: first 2 letters → ISO country code. Never persisted.</span>
            </label>
          )}
          {claim.type === "professional" && (
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Profession</span>
              <input
                type="text"
                value={props.profession}
                onChange={(e) => props.setProfession(e.target.value)}
                placeholder="e.g. engineer, doctor, teacher"
                className="mt-1 w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border/40 focus:border-secondary"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">Self-attested. Employer-verifyable later.</span>
            </label>
          )}
          {claim.type === "unique_human" && (
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">Device ID (optional)</span>
              <input
                type="text"
                value={props.deviceId}
                onChange={(e) => props.setDeviceId(e.target.value)}
                placeholder="auto-generated if empty"
                className="mt-1 w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border/40 focus:border-secondary font-mono"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">A device-attested proof of personhood — one human, one account.</span>
            </label>
          )}

          <button
            onClick={onIssue}
            disabled={issuing}
            className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-br from-secondary to-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {issuing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Signing…</>
            ) : (
              <><ShieldCheck className="w-4 h-4" /> Issue attestation</>
            )}
          </button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            By issuing, you consent to Cirkle Authority signing this claim.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Export modal ──────────────────────────────────────────────────

function ExportModal({ jwt, onClose, onCopy }: { jwt: string; onClose: () => void; onCopy: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[160] bg-charcoal/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-float overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Exported attestation"
      >
        <div className="px-4 pt-4 pb-2 flex items-center gap-3 border-b border-border/40">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center">
            <Download className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base">Exported attestation</h3>
            <p className="text-[10px] text-muted-foreground">Signed JWT · present to any third party</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <div className="rounded-lg bg-charcoal text-cream/90 p-3 text-[10px] font-mono break-all max-h-48 overflow-y-auto border border-border/40">
            {jwt}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={onCopy}
              className="flex-1 py-2 rounded-lg bg-secondary/15 text-secondary hover:bg-secondary/25 transition flex items-center justify-center gap-1.5 text-xs font-medium"
            >
              <Copy className="w-3.5 h-3.5" /> Copy JWT
            </button>
            <a
              href={`https://cirkle.app/verify?jwt=${encodeURIComponent(jwt)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition flex items-center justify-center gap-1.5 text-xs font-medium"
              onClick={(e) => { e.preventDefault(); onCopy(); }}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Verify link
            </a>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Third parties verify at <code className="font-mono text-[10px] bg-muted/60 px-1 rounded">POST /api/identity/verify</code> with <code className="font-mono text-[10px] bg-muted/60 px-1 rounded">{"{ jwt }"}</code>.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

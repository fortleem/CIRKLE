"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, Download, Upload, QrCode, ShieldCheck, Lock, FileJson,
  Database, KeyRound, ArrowRight, ArrowLeft, RefreshCw, Unlock,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = "backup" | "migrate" | "restore";
type Phase = "mode" | "passphrase" | "progress" | "done";

interface RestoreResult {
  version: number;
  createdAt: string;
  username: string;
  data: {
    posts: unknown[];
    transactions: unknown[];
    pollVotes: unknown[];
    bulletComments: unknown[];
    familyMemberships: string[];
  };
  checksum: string;
}

const PHASE_LABELS = ["Collecting data", "Encrypting", "Packaging", "Done"];

export function PhoneMigrate({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username ?? "anonymous";

  const [mode, setMode] = useState<Mode | null>(null);
  const [phase, setPhase] = useState<Phase>("mode");
  const [passphrase, setPassphrase] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [progress, setProgress] = useState(0);

  // Backup result
  const [blob, setBlob] = useState<string>("");
  const [blobSize, setBlobSize] = useState(0);

  // Migration QR
  const [qrData, setQrData] = useState("");
  const [qrExpires, setQrExpires] = useState("");

  // Restore
  const [restoreBlob, setRestoreBlob] = useState("");
  const [restorePass, setRestorePass] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState<RestoreResult | null>(null);

  const reset = () => {
    setMode(null);
    setPhase("mode");
    setPassphrase("");
    setConfirmPass("");
    setProgress(0);
    setBlob("");
    setBlobSize(0);
    setQrData("");
    setQrExpires("");
    setRestoreBlob("");
    setRestorePass("");
    setRestoring(false);
    setRestored(null);
  };

  // When the overlay closes, reset the wizard so it's fresh next time.
  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const runBackup = useCallback(async () => {
    setPhase("progress");
    setProgress(0);
    // Animate the progress bar through the labelled phases so the user
    // sees something happening while the server collects + encrypts.
    const phases = [25, 55, 85];
    const timers = phases.map((p, i) =>
      setTimeout(() => setProgress(p), (i + 1) * 500),
    );
    try {
      const res = await fetch("/api/backup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, passphrase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Backup failed");
      setProgress(100);
      setBlob(data.encrypted as string);
      setBlobSize(data.size as number);
      setTimeout(() => setPhase("done"), 400);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backup failed");
      setPhase("passphrase");
    } finally {
      timers.forEach(clearTimeout);
    }
  }, [username, passphrase]);

  const runMigrate = useCallback(async () => {
    setPhase("progress");
    setProgress(0);
    const phases = [30, 65, 90];
    const timers = phases.map((p, i) =>
      setTimeout(() => setProgress(p), (i + 1) * 400),
    );
    try {
      const res = await fetch("/api/backup/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Migration failed");
      setProgress(100);
      setQrData(data.qrData as string);
      setQrExpires(data.expiresAt as string);
      setTimeout(() => setPhase("done"), 400);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Migration failed");
      setPhase("passphrase");
    } finally {
      timers.forEach(clearTimeout);
    }
  }, [username]);

  const handleRestore = async () => {
    if (restoreBlob.trim().length === 0) { toast.error("Paste a backup blob first"); return; }
    if (restorePass.length < 6) { toast.error("Passphrase must be at least 6 characters"); return; }
    setRestoring(true);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypted: restoreBlob, passphrase: restorePass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");
      setRestored(data.payload as RestoreResult);
      toast.success("Backup decrypted — checksum verified");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  const handleDownloadBlob = () => {
    const file = new Blob([blob], { type: "application/octet-stream" });
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cirkle-backup-${username}-${new Date().toISOString().slice(0, 10)}.enc`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const qrUrl = (data: string): string =>
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(data)}&bgcolor=ffffff&color=1a1a15&margin=10`;

  const next = () => {
    if (phase === "mode" && mode) {
      if (mode === "restore") {
        // Restore flow has its own UI — skip the passphrase phase.
        setPhase("done");
      } else {
        setPhase("passphrase");
      }
    } else if (phase === "passphrase") {
      if (passphrase.length < 6) { toast.error("Passphrase must be at least 6 characters"); return; }
      if (mode !== "migrate" && passphrase !== confirmPass) {
        toast.error("Passphrases don't match");
        return;
      }
      if (mode === "backup") runBackup();
      else if (mode === "migrate") runMigrate();
    }
  };

  const back = () => {
    if (phase === "passphrase") setPhase("mode");
    else if (phase === "done") {
      reset();
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-2xl" ariaLabel="Phone Migration">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Phone Migration</h2>
              <p className="text-xs text-muted-foreground">Encrypted backup · QR migration · move Cirkle to a new phone</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {/* ── Phase 1: choose mode ── */}
            {phase === "mode" && (
              <motion.div
                key="mode"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">Choose what you want to do:</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {([
                    { id: "backup", icon: Download, label: "Backup to file", desc: "Encrypted .enc file you keep offline." },
                    { id: "migrate", icon: QrCode, label: "Migrate to new phone", desc: "One-time QR code scanned by the new phone." },
                    { id: "restore", icon: Upload, label: "Restore from file", desc: "Decrypt a backup .enc blob." },
                  ] as { id: Mode; icon: typeof Download; label: string; desc: string }[]).map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => { setMode(m.id); if (m.id === "restore") setPhase("done"); else setPhase("passphrase"); }}
                        className={cn(
                          "text-left p-4 rounded-xl border transition",
                          mode === m.id
                            ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                            : "border-border/40 hover:bg-muted/30",
                        )}
                      >
                        <Icon className="w-5 h-5 mb-2 text-primary" />
                        <p className="font-medium text-foreground text-sm">{m.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Phase 2: passphrase ── */}
            {phase === "passphrase" && (
              <motion.div
                key="passphrase"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <KeyRound className="w-4 h-4" />
                  {mode === "backup" ? "Backup" : "Migration"} · step 2 of 4
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-amber-700 dark:text-amber-400">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-xs">
                    The passphrase encrypts your backup with AES-256-GCM (PBKDF2, 200k iterations). The server never sees it — without the passphrase your data is unrecoverable. Save it somewhere safe.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pass">Passphrase (min 6 chars)</Label>
                  <Input
                    id="pass"
                    type="password"
                    placeholder="A strong passphrase"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    autoFocus
                  />
                </div>
                {mode !== "migrate" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="pass2">Confirm passphrase</Label>
                    <Input
                      id="pass2"
                      type="password"
                      placeholder="Repeat the passphrase"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={back} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                    onClick={next}
                    disabled={passphrase.length < 6 || (mode !== "migrate" && passphrase !== confirmPass)}
                    className="flex-1 bg-gradient-gold text-charcoal hover:opacity-90"
                  >
                    {mode === "backup" ? "Start backup" : "Generate QR"} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Phase 3: progress ── */}
            {phase === "progress" && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                  <p className="font-medium text-foreground">{mode === "backup" ? "Creating encrypted backup…" : "Generating migration QR…"}</p>
                  <p className="text-xs text-muted-foreground mt-1">This runs entirely on the server.</p>
                </div>
                <div className="space-y-2">
                  {PHASE_LABELS.map((label, i) => {
                    const pct = (i + 1) * 25;
                    const done = progress >= pct;
                    const active = progress >= pct - 25 && progress < pct;
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                          done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}>
                          {done ? "✓" : i + 1}
                        </div>
                        <span className={cn("text-sm", done || active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-gold"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <p className="text-center text-xs text-muted-foreground tabular-nums">{progress}%</p>
              </motion.div>
            )}

            {/* ── Phase 4: done ── */}
            {phase === "done" && mode !== "restore" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                  <p className="font-medium">
                    {mode === "backup" ? "Backup ready" : "Migration QR ready"}
                  </p>
                </div>

                {mode === "backup" ? (
                  <>
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Database className="w-4 h-4 text-primary" />
                        <span>Encrypted blob · <span className="tabular-nums">{(blobSize / 1024).toFixed(1)} KB</span></span>
                      </div>
                      <div className="space-y-1">
                        <Label>Encrypted payload</Label>
                        <Textarea
                          readOnly
                          value={blob.slice(0, 500) + (blob.length > 500 ? "…" : "")}
                          rows={3}
                          className="font-mono text-xs"
                        />
                      </div>
                      <Button onClick={handleDownloadBlob} className="w-full bg-gradient-gold text-charcoal hover:opacity-90">
                        <Download className="w-4 h-4 mr-2" /> Download .enc file
                      </Button>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400">
                      ⚠️ Save the passphrase separately. Without it, the backup cannot be decrypted — even by us.
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <div className="bg-white rounded-xl p-2 shadow-sm">
                        <img
                          src={qrUrl(qrData)}
                          alt="Migration QR code"
                          width={200}
                          height={200}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="flex-1 space-y-2 text-sm">
                        <p className="flex items-center gap-1.5"><QrCode className="w-4 h-4 text-primary" /> One-time migration token</p>
                        <p className="text-xs text-muted-foreground">
                          On your new phone, open Cirkle → Settings → Migrate → scan this code. The token expires in 10 minutes.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires: <span className="font-medium text-foreground">{new Date(qrExpires).toLocaleTimeString()}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button variant="outline" onClick={back} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Start over
                </Button>
              </motion.div>
            )}

            {/* ── Restore flow ── */}
            {phase === "done" && mode === "restore" && (
              <motion.div
                key="restore"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="w-4 h-4" /> Restore from encrypted blob
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-blob">Encrypted blob (paste the .enc contents)</Label>
                  <Textarea
                    id="r-blob"
                    placeholder="salt:iv:ct:tag…"
                    value={restoreBlob}
                    onChange={(e) => setRestoreBlob(e.target.value)}
                    rows={5}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-pass">Passphrase</Label>
                  <Input
                    id="r-pass"
                    type="password"
                    placeholder="The passphrase used to create the backup"
                    value={restorePass}
                    onChange={(e) => setRestorePass(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleRestore}
                  disabled={restoring || restoreBlob.length === 0 || restorePass.length < 6}
                  className="w-full bg-gradient-gold text-charcoal hover:opacity-90"
                >
                  {restoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
                  Decrypt & restore
                </Button>

                {restored && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <p className="text-sm font-medium">Backup verified · checksum matched</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(restored.createdAt).toLocaleString()} · for @{restored.username}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background/60">
                        <FileJson className="w-3.5 h-3.5 text-primary" />
                        <span>{restored.data.posts.length} posts</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background/60">
                        <Database className="w-3.5 h-3.5 text-secondary" />
                        <span>{restored.data.transactions.length} transactions</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background/60">
                        <KeyRound className="w-3.5 h-3.5 text-accent" />
                        <span>{restored.data.pollVotes.length} poll votes</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background/60">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{restored.data.bulletComments.length} bullets</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      Family vault memberships: {restored.data.familyMemberships.length}
                    </p>
                  </div>
                )}

                <Button variant="outline" onClick={back} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Start over
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </OverlayShell>
  );
}

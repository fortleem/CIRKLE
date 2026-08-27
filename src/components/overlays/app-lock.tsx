// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Lock, Fingerprint, Loader2, Shield, Clock, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface AppLockSettings {
  id: string;
  userId: string;
  enabled: boolean;
  lockAfterSec: number;
  biometricEnabled: boolean;
  updatedAt: string;
}

interface ShouldUnlock {
  shouldUnlock: boolean;
  reason?: string;
  settings?: AppLockSettings;
}

const LOCK_OPTIONS = [
  { value: "60", label: "1 minute" },
  { value: "300", label: "5 minutes" },
  { value: "1800", label: "30 minutes" },
  { value: "3600", label: "1 hour" },
];

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export function AppLock({ open, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.username ?? "";
  const [settings, setSettings] = useState<AppLockSettings | null>(null);
  const [should, setShould] = useState<ShouldUnlock | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<"enabled" | "biometric" | "interval" | null>(null);
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);

  useEffect(() => {
    // Detect WebAuthn support on the client
    if (typeof window !== "undefined") {
      const supported = !!(window.PublicKeyCredential);
      setWebAuthnSupported(supported);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `/api/app-lock?userId=${encodeURIComponent(userId)}&webAuthn=${webAuthnSupported}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setSettings(data.settings);
      setShould(data.should);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [userId, webAuthnSupported]);

  useEffect(() => {
    if (open && webAuthnSupported !== undefined) fetchSettings();
  }, [open, webAuthnSupported, fetchSettings]);

  const updateSetting = async (
    field: "enabled" | "biometricEnabled" | "lockAfterSec",
    value: boolean | number,
  ) => {
    if (!userId) {
      toast.error("Sign in to configure app lock");
      return;
    }
    setSaving(field === "lockAfterSec" ? "interval" : field);
    try {
      const res = await fetchWithTimeout("/api/app-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setSettings(data.settings);
      toast.success("App lock updated");
      window.dispatchEvent(new CustomEvent("circle:app-lock"));
      // Refetch should
      await fetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(null);
    }
  };

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-lg" ariaLabel="App lock — biometric + auto-lock settings">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <Lock className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">App Lock</h2>
              <p className="text-xs text-muted-foreground">Biometric + auto-lock · keeps your chats private</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && !settings ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground" aria-live="polite">
              <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden /> Loading…
            </div>
          ) : settings ? (
            <>
              {/* Status banner */}
              <div
                className={cn(
                  "glass backdrop-blur-xl border rounded-xl p-4 flex items-center gap-3",
                  settings.enabled
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-amber-500/30 bg-amber-500/5",
                )}
                role="status"
                aria-live="polite"
              >
                {settings.enabled ? (
                  <Shield className="w-5 h-5 text-emerald-500 shrink-0" aria-hidden />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" aria-hidden />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {settings.enabled ? "App lock is active" : "App lock is off"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {settings.enabled
                      ? `Will require unlock after ${settings.lockAfterSec / 60} min of inactivity`
                      : "Enable app lock to protect your chats when you step away"}
                  </p>
                </div>
              </div>

              {/* Toggle app lock */}
              <section aria-label="Enable app lock" className="glass backdrop-blur-xl border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Lock className="w-4 h-4 text-emerald-500" aria-hidden />
                    <div>
                      <Label htmlFor="lock-toggle" className="text-sm font-medium text-foreground cursor-pointer">
                        Enable app lock
                      </Label>
                      <p className="text-xs text-muted-foreground">Require unlock after inactivity</p>
                    </div>
                  </div>
                  <Switch
                    id="lock-toggle"
                    checked={settings.enabled}
                    onCheckedChange={(v) => updateSetting("enabled", v)}
                    disabled={saving !== null}
                    aria-label="Toggle app lock"
                  />
                </div>
                {saving === "enabled" && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground" aria-live="polite">
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> Saving…
                  </div>
                )}
              </section>

              {/* Lock interval */}
              <section aria-label="Lock interval" className="glass backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-3">
                <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-500" aria-hidden /> Lock after
                </Label>
                <Select
                  value={String(settings.lockAfterSec)}
                  onValueChange={(v) => updateSetting("lockAfterSec", parseInt(v, 10))}
                  disabled={!settings.enabled || saving !== null}
                >
                  <SelectTrigger className="w-full" aria-label="Lock interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCK_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {saving === "interval" && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> Saving…
                  </div>
                )}
              </section>

              {/* Biometric */}
              <section aria-label="Biometric unlock" className="glass backdrop-blur-xl border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Fingerprint className="w-4 h-4 text-emerald-500" aria-hidden />
                    <div>
                      <Label htmlFor="biometric-toggle" className="text-sm font-medium text-foreground cursor-pointer">
                        Biometric unlock
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {webAuthnSupported ? "Use fingerprint or Face ID via WebAuthn" : "WebAuthn not available on this device"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="biometric-toggle"
                    checked={settings.biometricEnabled}
                    onCheckedChange={(v) => updateSetting("biometricEnabled", v)}
                    disabled={!settings.enabled || !webAuthnSupported || saving !== null}
                    aria-label="Toggle biometric unlock"
                  />
                </div>
                {!webAuthnSupported && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                    <span>Biometric unlock requires WebAuthn support. Try Chrome on Android or Safari on iOS.</span>
                  </div>
                )}
              </section>

              {/* What happens when locked */}
              <section aria-label="What app lock protects" className="glass backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-2">
                <Label className="text-sm font-medium text-foreground">What gets protected</Label>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {[
                    "Wasl chat previews and notifications",
                    "Cirkle Pay balance and transactions",
                    "Commit drafts and signed agreements",
                    "Personal AI memory and saved messages",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Diagnostic info */}
              {should && (
                <div className="text-xs text-muted-foreground text-center">
                  <Badge variant="outline" className="bg-muted/40">
                    Status: {should.shouldUnlock ? "locked" : "unlocked"}
                    {should.reason ? ` · ${should.reason}` : ""}
                  </Badge>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Lock className="w-8 h-8 mx-auto mb-2" aria-hidden />
              <p className="text-sm">Sign in to configure app lock</p>
            </div>
          )}
        </div>
      </div>
    </OverlayShell>
  );
}

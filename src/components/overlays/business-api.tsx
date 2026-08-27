// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Key, Loader2, Plus, Copy, Check, Trash2, Zap, Activity, AlertTriangle,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ApiKey {
  id: string;
  label: string;
  rateLimitPerMin: number;
  totalCalls: number;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  keyPreview: string;
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export function BusinessApi({ open, onClose }: Props) {
  const [institutionId, setInstitutionId] = useState("");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCalls, setTotalCalls] = useState(0);
  const [activeKeys, setActiveKeys] = useState(0);

  // Create form
  const [label, setLabel] = useState("");
  const [rateLimit, setRateLimit] = useState("60");
  const [creating, setCreating] = useState(false);
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetchWithTimeout(
        `/api/business/api-keys?institutionId=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setKeys(data.keys ?? []);
      setTotalCalls(data.totalCalls ?? 0);
      setActiveKeys(data.activeKeys ?? 0);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLabel("");
      setRateLimit("60");
      setNewPlaintext(null);
      setCopied(false);
      fetchKeys(institutionId);
    }
  }, [open, institutionId, fetchKeys]);

  const handleCreate = async () => {
    if (!institutionId.trim()) {
      toast.error("Institution ID is required");
      return;
    }
    if (label.trim().length < 2) {
      toast.error("Label must be at least 2 characters");
      return;
    }
    setCreating(true);
    try {
      const res = await fetchWithTimeout("/api/business/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId,
          label: label.trim(),
          rateLimitPerMin: parseInt(rateLimit, 10) || 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");
      toast.success("API key created", {
        description: "Copy it now — the plaintext won't be shown again.",
      });
      setNewPlaintext(data.plaintext);
      setLabel("");
      window.dispatchEvent(new CustomEvent("circle:business-api"));
      await fetchKeys(institutionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetchWithTimeout("/api/business/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revokeId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke key");
      toast.success("API key revoked");
      await fetchKeys(institutionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Revoke failed");
    }
  };

  const copyPlaintext = () => {
    if (!newPlaintext) return;
    navigator.clipboard?.writeText(newPlaintext).then(
      () => {
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error("Clipboard unavailable"),
    );
  };

  return (
    <OverlayShell open={open} onClose={onClose} maxWidth="max-w-3xl" ariaLabel="Business API key management">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" aria-hidden>
              <Key className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Business API</h2>
              <p className="text-xs text-muted-foreground">API keys · Rate limits · Usage tracking</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Institution selector */}
          <div className="space-y-2">
            <Label htmlFor="inst-id">Institution ID</Label>
            <Input
              id="inst-id"
              placeholder="e.g. inst_yousef-bakery-eg"
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
            />
          </div>

          {/* Stats */}
          {keys.length > 0 && (
            <div className="grid grid-cols-3 gap-3" role="region" aria-label="API usage stats">
              <div className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3 text-center">
                <Key className="w-4 h-4 text-emerald-500 mx-auto mb-1" aria-hidden />
                <div className="text-xl font-bold text-foreground">{activeKeys}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Active keys</div>
              </div>
              <div className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3 text-center">
                <Activity className="w-4 h-4 text-emerald-500 mx-auto mb-1" aria-hidden />
                <div className="text-xl font-bold text-foreground">{totalCalls.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total calls</div>
              </div>
              <div className="glass backdrop-blur-xl border border-white/10 rounded-xl p-3 text-center">
                <Zap className="w-4 h-4 text-emerald-500 mx-auto mb-1" aria-hidden />
                <div className="text-xl font-bold text-foreground">{keys.reduce((s, k) => s + k.rateLimitPerMin, 0)}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Calls/min</div>
              </div>
            </div>
          )}

          {/* Create new key */}
          <section aria-label="Create new API key" className="glass backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" aria-hidden />
              <h3 className="font-semibold text-foreground text-sm">Issue a new API key</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="key-label">Label</Label>
                <Input
                  id="key-label"
                  placeholder="e.g. Production webhook"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={60}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate-limit">Rate limit (per minute)</Label>
                <Select value={rateLimit} onValueChange={setRateLimit}>
                  <SelectTrigger id="rate-limit" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[30, 60, 120, 300, 600].map((r) => (
                      <SelectItem key={r} value={String(r)}>{r} / min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={creating || !institutionId.trim() || label.trim().length < 2}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Generating…</>
              ) : (
                <><Key className="w-4 h-4 mr-2" aria-hidden /> Generate API key</>
              )}
            </Button>
          </section>

          {/* New plaintext reveal */}
          <AnimatePresence>
            {newPlaintext && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="glass backdrop-blur-xl border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 space-y-3"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" aria-hidden />
                  <span className="text-sm font-medium">Copy your key now — it won't be shown again</span>
                </div>
                <div className="flex gap-2">
                  <Input readOnly value={newPlaintext} className="font-mono text-xs" aria-label="API key plaintext" />
                  <Button onClick={copyPlaintext} variant="outline" size="icon" aria-label="Copy key">
                    {copied ? <Check className="w-4 h-4 text-emerald-500" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
                  </Button>
                </div>
                <Button onClick={() => setNewPlaintext(null)} variant="ghost" size="sm" className="w-full">
                  I've saved my key
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Existing keys */}
          <section aria-label="Existing API keys" className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Your keys</Label>
            {loading && keys.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground" aria-live="polite">
                <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden /> Loading…
              </div>
            ) : keys.length === 0 ? (
              <div className="glass backdrop-blur-xl border border-dashed border-white/20 rounded-xl p-8 text-center">
                <Key className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden />
                <p className="text-sm text-muted-foreground">No API keys yet — generate your first key above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <motion.div
                    key={k.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "glass backdrop-blur-xl border rounded-xl p-3",
                      k.revokedAt ? "border-rose-500/30 opacity-60" : "border-white/10",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground text-sm truncate">{k.label}</h4>
                          {k.revokedAt ? (
                            <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">Revoked</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Active</Badge>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground">{k.keyPreview}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                          <span>{k.totalCalls.toLocaleString()} calls</span>
                          <span>·</span>
                          <span>{k.rateLimitPerMin}/min</span>
                          <span>·</span>
                          <span>Last used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "never"}</span>
                        </div>
                      </div>
                      {!k.revokedAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevoke(k.id)}
                          aria-label={`Revoke key ${k.label}`}
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </OverlayShell>
  );
}

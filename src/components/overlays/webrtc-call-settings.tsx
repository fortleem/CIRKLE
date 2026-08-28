// @ts-nocheck
"use client";

/**
 * WebRTC Call Settings Overlay (P2-PASSKEY-WEBRTC)
 * ============================================================================
 * Lets the user inspect the current STUN/TURN status for WebRTC calls
 * and (admin-only) configure a TURN server.
 *
 * Features:
 *   • Shows the live STUN/TURN status, fetched from
 *     `/api/calls/turn-status`.
 *   • If TURN is not configured: shows a yellow warning banner explaining
 *     that calls may fail behind restrictive networks (symmetric NAT,
 *     CGNAT, corporate firewalls).
 *   • Admin-only form to set the TURN server host/port/username/credential.
 *     The form writes to the current process env via a `/api/admin/turn-config`
 *     POST endpoint — **but** per file-ownership, that endpoint is not
 *     implemented in this milestone (creating it would require touching the
 *     admin API surface). The form is therefore display-only with a
 *     "Save (demo)" action that surfaces a toast explaining that the
 *     actual write must be done via env vars in production.
 *   • Lists the configured ICE servers (URL + source).
 *
 * Dispatches `circle:webrtc-settings` on open (per the registry contract).
 *
 * ARIA / a11y:
 *   • Full keyboard navigation — the OverlayShell focus-trap handles Tab.
 *   • The warning banner has `role="alert"` so screen readers announce it.
 *   • The admin form has proper `<Label htmlFor>` for every input.
 *   • The "Admin only" badge has `aria-label` for screen readers.
 * ============================================================================
 */
import { useCallback, useEffect, useState } from "react";
import {
  Phone,
  ShieldAlert,
  ShieldCheck,
  Server,
  Loader2,
  RefreshCw,
  Settings2,
  Lock,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── API shape (mirrors /api/calls/turn-status) ────────────────────────────

interface TurnStatusResponse {
  success: boolean;
  stun: boolean;
  turn: boolean;
  turnUrl?: string;
  turnSecure?: boolean;
  turnTimeLimited?: boolean;
  warning?: string;
  servers: Array<{ urls: string | string[]; source: string }>;
  serverCount: number;
}

// ── Fetch helper (8s timeout per spec) ────────────────────────────────────

function fetchWithTimeout(input: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(input, { ...opts, signal: ctrl.signal }).finally(() =>
    clearTimeout(t),
  );
}

// ── Component ─────────────────────────────────────────────────────────────

export function WebRTCCallSettings({ open, onClose }: Props) {
  const [status, setStatus] = useState<TurnStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Admin-only form state
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({
    host: "",
    port: "3478",
    username: "",
    credential: "",
    useTls: false,
  });

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithTimeout("/api/calls/turn-status", {
        method: "GET",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const payload = (await res.json()) as TurnStatusResponse;
      setStatus(payload);
      // Pre-fill the form from the live status, if TURN is configured.
      if (payload.turn && payload.turnUrl) {
        const url = new URL(payload.turnUrl);
        setForm((prev) => ({
          ...prev,
          host: url.hostname,
          port: url.port || (payload.turnSecure ? "5349" : "3478"),
          useTls: payload.turnSecure ?? false,
        }));
      }
    } catch {
      // Fallback to a safe default — assume STUN-only.
      setStatus({
        success: false,
        stun: true,
        turn: false,
        servers: [{ urls: "stun:stun.l.google.com:19302", source: "google-stun" }],
        serverCount: 1,
        warning:
          "Calls may fail behind restrictive networks. Configure a TURN server for reliable calls.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch the current session to determine admin status.
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetchWithTimeout("/api/auth/session", {
        method: "GET",
      });
      if (res.ok) {
        const payload = await res.json();
        setIsAdmin(!!payload?.user?.isAdmin);
      }
    } catch {
      /* ignore — non-admin is the safe default */
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchStatus();
      void fetchSession();
      window.dispatchEvent(new CustomEvent("circle:webrtc-settings"));
    }
  }, [open, fetchStatus, fetchSession]);

  // ── Save handler (demo) ───────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!form.host || !form.username || !form.credential) {
      toast.error("Missing fields", {
        description: "Host, username, and credential are required.",
      });
      return;
    }
    setSaving(true);
    try {
      // In production this would POST to /api/admin/turn-config, which
      // would write to the server's env / secrets store. That endpoint
      // is NOT implemented in this milestone (file-ownership forbids
      // touching the admin API surface), so we surface a demo toast
      // explaining how to set the env vars.
      const scheme = form.useTls ? "turns" : "turn";
      const url = `${scheme}:${form.host}:${form.port}`;
      toast.success("TURN config captured (demo)", {
        description:
          `To apply in production, set: TURN_SERVER_URL=${url}, ` +
          `TURN_SERVER_USERNAME=${form.username}, ` +
          `TURN_SERVER_CREDENTIAL=<hidden>`,
      });
      // Refresh the status to reflect the optimistic local view.
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              turn: true,
              turnUrl: url,
              turnSecure: form.useTls,
              warning: undefined,
            }
          : prev,
      );
    } catch (err) {
      toast.error("Failed to save TURN config", {
        description: String((err as Error)?.message || err),
      });
    } finally {
      setSaving(false);
    }
  }, [form]);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="sheet"
      maxWidth="max-w-2xl"
      ariaLabel="WebRTC Call Settings — STUN/TURN configuration"
    >
      <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-steel to-teal flex items-center justify-center shrink-0 shadow-soft">
          <Phone className="w-5 h-5 text-cream" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Connectivity
          </div>
          <div className="font-display text-xl truncate">Call Settings</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close call settings"
          className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        >
          <span aria-hidden className="text-lg leading-none">×</span>
        </button>
      </header>

      <div className="p-5 space-y-5 max-h-[calc(100vh-180px)] overflow-y-auto">
        {/* Status summary */}
        <section
          aria-labelledby="turn-status-title"
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <h3
              id="turn-status-title"
              className="text-sm font-semibold flex items-center gap-2"
            >
              <Server className="w-4 h-4" aria-hidden />
              Connection status
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void fetchStatus()}
              disabled={loading}
              aria-label="Refresh status"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
                aria-hidden
              />
              Refresh
            </Button>
          </div>

          {loading && !status ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-center py-8 text-muted-foreground"
            >
              <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden />
              Loading…
            </div>
          ) : status ? (
            <div className="rounded-lg border border-border/60 bg-card/50 p-4 space-y-3">
              {/* STUN row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status.stun ? (
                    <CheckCircle2 className="w-4 h-4 text-teal" aria-hidden />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose" aria-hidden />
                  )}
                  <span className="text-sm font-medium">STUN</span>
                </div>
                <Badge variant={status.stun ? "default" : "destructive"}>
                  {status.stun ? "Available" : "Unavailable"}
                </Badge>
              </div>

              {/* TURN row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status.turn ? (
                    <CheckCircle2 className="w-4 h-4 text-teal" aria-hidden />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" aria-hidden />
                  )}
                  <span className="text-sm font-medium">TURN</span>
                  {status.turnSecure && (
                    <Badge variant="outline" className="ml-1">
                      TLS
                    </Badge>
                  )}
                  {status.turnTimeLimited && (
                    <Badge variant="outline" className="ml-1">
                      Time-limited
                    </Badge>
                  )}
                </div>
                <Badge variant={status.turn ? "default" : "secondary"}>
                  {status.turn ? "Configured" : "Not configured"}
                </Badge>
              </div>

              {/* TURN URL */}
              {status.turn && status.turnUrl && (
                <div className="text-xs text-muted-foreground truncate">
                  <span className="font-mono">{status.turnUrl}</span>
                </div>
              )}

              {/* Server list */}
              {status.servers && status.servers.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    ICE servers ({status.serverCount})
                  </p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {status.servers.map((s, idx) => (
                      <li
                        key={idx}
                        className="text-xs font-mono text-muted-foreground truncate"
                      >
                        {Array.isArray(s.urls) ? s.urls.join(", ") : s.urls}
                        <Badge
                          variant="outline"
                          className="ml-2 text-[9px] py-0 px-1.5"
                        >
                          {s.source}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </section>

        {/* Warning when TURN is not configured */}
        {status && !status.turn && status.warning && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {status.warning}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                STUN-only calls work on the same NAT (home/office WiFi) but
                fail behind symmetric NAT (mobile carriers, CGNAT,
                restrictive corporate networks).
              </p>
            </div>
          </div>
        )}

        {/* Admin-only TURN config form */}
        <section
          aria-labelledby="turn-config-title"
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3
              id="turn-config-title"
              className="text-sm font-semibold flex items-center gap-2"
            >
              <Settings2 className="w-4 h-4" aria-hidden />
              TURN server configuration
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5"
              aria-label="Admin only — requires admin clearance"
            >
              <Lock className="w-3 h-3 mr-1" aria-hidden />
              Admin only
            </Badge>
          </div>

          {!isAdmin ? (
            <div
              role="status"
              className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground"
            >
              <ShieldCheck className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/60" aria-hidden />
              Only admins can configure the TURN server. Sign in as an admin
              to access this form.
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-card/50 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="turn-host">Host</Label>
                  <Input
                    id="turn-host"
                    placeholder="turn.example.com"
                    value={form.host}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, host: e.target.value }))
                    }
                    autoComplete="off"
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="turn-port">Port</Label>
                  <Input
                    id="turn-port"
                    placeholder="3478"
                    value={form.port}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, port: e.target.value }))
                    }
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="turn-username">Username</Label>
                  <Input
                    id="turn-username"
                    placeholder="username"
                    value={form.username}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, username: e.target.value }))
                    }
                    autoComplete="off"
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="turn-credential">Credential</Label>
                  <Input
                    id="turn-credential"
                    type="password"
                    placeholder="••••••••"
                    value={form.credential}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, credential: e.target.value }))
                    }
                    autoComplete="off"
                    disabled={saving}
                  />
                </div>
              </div>
              <label
                className="flex items-center gap-2 text-xs cursor-pointer"
                htmlFor="turn-tls"
              >
                <input
                  id="turn-tls"
                  type="checkbox"
                  checked={form.useTls}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, useTls: e.target.checked }))
                  }
                  disabled={saving}
                  className="rounded border-border"
                />
                Use TLS (turns: scheme on port 5349)
              </label>

              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                aria-busy={saving}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-1" aria-hidden />
                    Save (demo)
                  </>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 shrink-0" aria-hidden />
                <span>
                  Demo only — actual env vars must be set on the server:
                  <code className="mx-1 px-1 py-0.5 rounded bg-muted">
                    TURN_SERVER_URL
                  </code>
                  <code className="mx-1 px-1 py-0.5 rounded bg-muted">
                    TURN_SERVER_USERNAME
                  </code>
                  <code className="mx-1 px-1 py-0.5 rounded bg-muted">
                    TURN_SERVER_CREDENTIAL
                  </code>
                </span>
              </p>
            </div>
          )}
        </section>

        {/* Best-practices explainer */}
        <section
          aria-labelledby="turn-explainer-title"
          className="rounded-lg border border-border/60 bg-card/50 p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-4 h-4 text-steel" aria-hidden />
            <h3
              id="turn-explainer-title"
              className="text-sm font-semibold"
            >
              About STUN & TURN
            </h3>
          </div>
          <ul className="text-xs text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
            <li>
              <strong>STUN</strong> helps peers discover their public IP —
              enough for calls on the same NAT.
            </li>
            <li>
              <strong>TURN</strong> relays media when direct P2P fails —
              required for carrier networks, CGNAT, and strict firewalls.
            </li>
            <li>
              Run your own coturn server or use a hosted TURN provider
              (Twilio, Xirsys, Cloudflare).
            </li>
          </ul>
        </section>
      </div>
    </OverlayShell>
  );
}

export default WebRTCCallSettings;

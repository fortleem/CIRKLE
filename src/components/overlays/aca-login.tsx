// @ts-nocheck
"use client";

/**
 * ACA Institutional Login Overlay
 * ============================================================================
 * Fullscreen overlay with a completely different visual style from the public
 * Circle product. Dark, institutional aesthetic — charcoal/slate, NOT the
 * gold/teal public theme.
 *
 * Branded as "ACA — Administrative Control Authority" — the confidential
 * institutional layer of CIRKLE.
 *
 * Inputs:
 *   - Agent ID       (ACA-issued identifier; NOT a Circle user id)
 *   - Password       (mock passphrase — production MUST use hardware-bound
 *                    challenge-response)
 *   - MFA Code       (6-digit TOTP — mock; production MUST use PKI / FIDO2)
 *
 * On successful login, dispatches `circle:aca-dashboard` (the dashboard opens
 * in its own overlay). The login overlay then calls `onClose`.
 *
 * Accessible via the `circle:aca-login` event — triggered from the admin panel
 * (NOT visible to regular citizens). The admin panel dispatches this event;
 * the page-level handler is a TODO (file is read-only during this task).
 *
 * BUILDING PHASE — NO AUTH. A prominent amber "DEV MODE — NO AUTH" banner is
 * shown above the form. The mock MFA accepts any 6-digit code.
 *
 * Accessibility:
 *   - role="dialog" aria-modal (from <OverlayShell>)
 *   - All inputs have <Label> + aria-describedby for hints/errors
 *   - Show/hide password toggle is aria-pressed
 *   - Form submits on Enter; submit button shows loading state
 *   - Esc-to-close handled by <OverlayShell>
 * ============================================================================
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Lock, Shield, ShieldAlert, Loader2, X, Eye, EyeOff, KeyRound,
  Fingerprint, AlertTriangle, Building2,
} from "lucide-react";

import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AcaLoginProps {
  open: boolean;
  onClose: () => void;
}

interface LoginResponse {
  sessionId: string;
  agent: {
    agentId: string;
    institutionalIdentity: string;
    displayName: string;
    role: string;
    department: string;
    clearance: string;
    permissions: string[];
    sessionStatus: string;
  };
  expiresAt: string;
  devMode: boolean;
  notice?: string;
}

export function AcaLogin({ open, onClose }: AcaLoginProps) {
  const [agentId, setAgentId] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentIdRef = useRef<HTMLInputElement | null>(null);

  // Focus the first field when the overlay opens.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => agentIdRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  // Clear the form on close.
  useEffect(() => {
    if (open) return;
    setError(null);
    // Intentionally keep the entered agentId so the user can retry quickly.
  }, [open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!agentId.trim()) {
        setError("Agent ID is required.");
        return;
      }
      if (!password) {
        setError("Password is required.");
        return;
      }
      if (!/^\d{6}$/.test(mfaCode)) {
        setError("MFA code must be 6 digits.");
        return;
      }

      setSubmitting(true);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch("/api/aca/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agentId.trim(),
            credentials: password,
            mfaCode,
          }),
          signal: controller.signal,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.sessionId) {
          const msg = json?.error || `Login failed (HTTP ${res.status})`;
          setError(msg);
          return;
        }
        const data = json as LoginResponse;

        // Persist the session id so subsequent API calls can include it.
        try {
          window.sessionStorage.setItem("aca:sessionId", data.sessionId);
          window.sessionStorage.setItem("aca:agentId", data.agent.agentId);
          window.sessionStorage.setItem("aca:expiresAt", data.expiresAt);
        } catch {
          /* sessionStorage may be unavailable in some embedded contexts */
        }

        toast.success("ACA session established", {
          description: `Welcome, ${data.agent.displayName} — clearance ${data.agent.clearance}.`,
        });

        // Close the login overlay first, then open the dashboard.
        onClose();
        window.dispatchEvent(
          new CustomEvent("circle:aca-dashboard", {
            detail: {
              sessionId: data.sessionId,
              agentId: data.agent.agentId,
            },
          }),
        );
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name;
        const msg = (err as { message?: string })?.message || "Login failed.";
        setError(name === "AbortError" ? "Request timed out (8s)." : msg);
      } finally {
        window.clearTimeout(timeout);
        setSubmitting(false);
      }
    },
    [agentId, password, mfaCode, onClose],
  );

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="ACA — Administrative Control Authority institutional login"
      className="bg-gradient-to-br from-slate-950 via-charcoal to-slate-950 text-slate-100"
    >
      <div className="flex flex-col min-h-screen w-full overflow-y-auto">
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-slate-200" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm md:text-base font-semibold tracking-tight text-slate-100">
                  ACA
                </span>
                <span className="text-[10px] md:text-xs uppercase tracking-wider text-slate-500">
                  Administrative Control Authority
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Sovereign institutional layer of CIRKLE — confidential
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-300 hover:text-slate-100 hover:bg-slate-800/60"
            aria-label="Close ACA login"
          >
            <X className="w-4 h-4" aria-hidden />
            <span className="hidden sm:inline ml-1.5">Exit</span>
          </Button>
        </header>

        {/* ── DEV MODE banner ──────────────────────────────────────────── */}
        <div
          role="alert"
          aria-live="polite"
          className="w-full bg-amber-500/15 border-b border-amber-500/40 text-amber-200 px-5 md:px-8 py-2.5 flex items-center gap-2.5 text-xs md:text-sm"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
          <span className="font-semibold uppercase tracking-wide">DEV MODE — NO AUTH</span>
          <span className="text-amber-200/80 hidden md:inline">
            Credentials are NOT verified. MFA accepts any 6-digit code. Production MUST use PKI / hardware keys.
          </span>
          <span className="text-amber-200/80 md:hidden">Mock auth — for building phase only.</span>
        </div>

        {/* ── Main login card ──────────────────────────────────────────── */}
        <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md"
          >
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl shadow-2xl overflow-hidden">
              {/* Header strip */}
              <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-200" aria-hidden />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-slate-100 leading-tight">
                      ACA Institutional Access
                    </h1>
                    <p className="text-[11px] text-slate-400">
                      Restricted — institutional identities only
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Agent ID */}
                <div className="space-y-1.5">
                  <Label htmlFor="aca-agent-id" className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    Agent ID
                  </Label>
                  <div className="relative">
                    <Fingerprint
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                      aria-hidden
                    />
                    <Input
                      ref={agentIdRef}
                      id="aca-agent-id"
                      type="text"
                      autoComplete="username"
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      placeholder="aca_xxxxxxxxxxxx"
                      className="pl-9 bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-slate-500"
                      aria-describedby="aca-agent-id-hint"
                      disabled={submitting}
                    />
                  </div>
                  <p id="aca-agent-id-hint" className="text-[11px] text-slate-500">
                    Issued by ACA only — NOT your Circle user id.
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="aca-password" className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    Password / Challenge Response
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                      aria-hidden
                    />
                    <Input
                      id="aca-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="pl-9 pr-10 bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-slate-500"
                      aria-describedby="aca-password-hint"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p id="aca-password-hint" className="text-[11px] text-slate-500">
                    Production: hardware-bound challenge-response, never a static passphrase.
                  </p>
                </div>

                {/* MFA */}
                <div className="space-y-1.5">
                  <Label htmlFor="aca-mfa" className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    MFA Code
                  </Label>
                  <div className="relative">
                    <KeyRound
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                      aria-hidden
                    />
                    <Input
                      id="aca-mfa"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(e) =>
                        setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="000000"
                      className="pl-9 tracking-[0.3em] font-mono bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-600 placeholder:tracking-[0.2em] focus:border-slate-500"
                      aria-describedby="aca-mfa-hint"
                      disabled={submitting}
                    />
                  </div>
                  <p id="aca-mfa-hint" className="text-[11px] text-slate-500">
                    6-digit TOTP — mock accepts any code. Production MUST verify a real TOTP or hardware-key signature.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-rose-700/50 bg-rose-950/50 px-3 py-2.5 flex items-start gap-2 text-rose-200 text-xs"
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                    <span className="break-words">{error}</span>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "w-full bg-slate-200 hover:bg-white text-slate-900",
                    "border border-slate-300 font-medium",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                      Authenticating…
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" aria-hidden />
                      Authenticate to ACA
                    </>
                  )}
                </Button>

                {/* Session notice */}
                <div className="pt-2 border-t border-slate-800/80">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Sessions are short-lived (15 minutes) for read actions. Critical actions
                    (case closure, evidence export, agent provisioning) require step-up
                    re-authentication.
                  </p>
                </div>
              </form>

              {/* Footer of card */}
              <div className="bg-slate-950/50 px-6 py-3 border-t border-slate-800 flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="border-slate-700 text-slate-400 text-[10px]"
                >
                  CONFIDENTIAL — INSTITUTIONAL
                </Badge>
                <span className="text-[10px] text-slate-600 font-mono">
                  ACA-SOVEREIGN-IMPL
                </span>
              </div>
            </div>

            <p className="mt-4 text-center text-[11px] text-slate-600 px-4">
              By accessing ACA you confirm you hold a valid institutional
              identity issued by the Administrative Control Authority. All
              access is logged to an append-only audit trail.
            </p>
          </motion.div>
        </main>
      </div>
    </OverlayShell>
  );
}

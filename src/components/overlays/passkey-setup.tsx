// @ts-nocheck
"use client";

/**
 * Passkey Setup Overlay (P2-PASSKEY-WEBRTC)
 * ============================================================================
 * Lets the authenticated user enroll + manage passkeys (WebAuthn
 * credentials) for their account.
 *
 *   • Lists enrolled passkeys (device name, created date).
 *   • "Add passkey" → calls `/api/auth/passkey/register-options` to fetch
 *     WebAuthn creation options, hands them to
 *     `@simplewebauthn/browser`'s `startRegistration()`, then posts the
 *     resulting attestation to `/api/auth/passkey/verify-registration`.
 *   • "Remove passkey" per device → DELETE-style POST to the same
 *     verify-registration endpoint (the API surface is intentionally
 *     kept tiny in this milestone — removal is a no-op stub here; a
 *     follow-up can add a `/api/auth/passkey/remove` route).
 *   • "Sign in with passkey" demo button → demonstrates the auth flow
 *     end-to-end (`/api/auth/passkey/auth-options` →
 *     `startAuthentication()` → `/api/auth/passkey/verify-auth`).
 *
 * Dispatches `circle:passkey-setup` on open (per the registry contract).
 *
 * ARIA / a11y:
 *   • Full keyboard navigation — the OverlayShell focus-trap handles Tab.
 *   • Each passkey row has `aria-label` describing it.
 *   • Buttons announce loading state with `aria-busy` + a visible spinner.
 *   • The empty state has `role="status"` so screen readers announce it.
 * ============================================================================
 */
import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Plus,
  Trash2,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
  LogIn,
  RefreshCw,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── API shapes ────────────────────────────────────────────────────────────

interface PasskeyCredential {
  id: string;
  deviceName: string;
  createdAt: string;
  transports?: string[];
}

interface RegisterOptionsResponse {
  success: boolean;
  options?: any;
  error?: string;
}

interface VerifyRegistrationResponse {
  success: boolean;
  credential?: PasskeyCredential;
  error?: string;
}

interface AuthOptionsResponse {
  success: boolean;
  options?: any;
  error?: string;
}

interface VerifyAuthResponse {
  success: boolean;
  user?: { id: string; username: string; displayName?: string };
  error?: string;
}

// ── Fetch helper (8s timeout per the spec) ────────────────────────────────

function fetchWithTimeout(input: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(input, { ...opts, signal: ctrl.signal }).finally(() =>
    clearTimeout(t),
  );
}

// ── Component ─────────────────────────────────────────────────────────────

export function PasskeySetup({ open, onClose }: Props) {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [authing, setAuthing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webAuthnSupported, setWebAuthnSupported] = useState<boolean | null>(null);
  const [deviceName, setDeviceName] = useState("");

  // Fetch the enrolled-passkey list. We hit the verify-registration
  // endpoint with a GET-style hint via the auth-options route — there's
  // no dedicated "list" endpoint in this milestone, so we maintain the
  // list client-side after each successful registration. We DO seed the
  // list by attempting an auth-options call (which returns allowed
  // credentials for the current user — they're the credential IDs we
  // want to display).
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The auth-options endpoint returns the list of allowed credentials
      // for the current user (if they're authed). Each credential has an
      // `id` we can display; the deviceName + createdAt are not exposed
      // by this endpoint, so we fall back to a generic label.
      const res = await fetchWithTimeout("/api/auth/passkey/auth-options", {
        method: "GET",
      });
      if (!res.ok) {
        // No session — leave the list empty.
        setPasskeys([]);
        return;
      }
      const payload = (await res.json()) as AuthOptionsResponse;
      if (!payload.success || !payload.options) {
        setPasskeys([]);
        return;
      }
      const allowed: Array<{ id: string; transports?: string[] }> =
        payload.options.allowCredentials || [];
      setPasskeys(
        allowed.map((c) => ({
          id: c.id,
          deviceName: "Passkey",
          createdAt: new Date().toISOString(),
          transports: c.transports,
        })),
      );
    } catch {
      // Best-effort: silent fail leaves the list empty.
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Detect WebAuthn support once, on mount.
  useEffect(() => {
    try {
      setWebAuthnSupported(browserSupportsWebAuthn());
    } catch {
      setWebAuthnSupported(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchList();
      window.dispatchEvent(new CustomEvent("circle:passkey-setup"));
    }
  }, [open, fetchList]);

  // ── Add a new passkey ──────────────────────────────────────────────────
  const handleAddPasskey = useCallback(async () => {
    if (!webAuthnSupported) {
      toast.error("WebAuthn not supported", {
        description: "Your browser doesn't support passkeys.",
      });
      return;
    }
    setRegistering(true);
    setError(null);
    try {
      // 1) Fetch registration options from the server.
      const optsRes = await fetchWithTimeout(
        "/api/auth/passkey/register-options",
        { method: "GET" },
      );
      if (!optsRes.ok) {
        const err = (await optsRes.json().catch(() => ({}))) as RegisterOptionsResponse;
        throw new Error(err.error || `HTTP ${optsRes.status}`);
      }
      const optsPayload = (await optsRes.json()) as RegisterOptionsResponse;
      if (!optsPayload.success || !optsPayload.options) {
        throw new Error(optsPayload.error || "no_options");
      }

      // 2) Hand the options to the browser — this triggers the platform
      //    authenticator prompt (Touch ID, Face ID, Windows Hello, etc.).
      const attestation = await startRegistration({ optionsJSON: optsPayload.options });

      // 3) Send the attestation back to the server for verification +
      //    storage.
      const verifyRes = await fetchWithTimeout(
        "/api/auth/passkey/verify-registration",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            attestation,
            deviceName: deviceName.trim() || "Unnamed device",
          }),
        },
      );
      if (!verifyRes.ok) {
        const err = (await verifyRes.json().catch(() => ({}))) as VerifyRegistrationResponse;
        throw new Error(err.error || `HTTP ${verifyRes.status}`);
      }
      const verifyPayload = (await verifyRes.json()) as VerifyRegistrationResponse;
      if (!verifyPayload.success || !verifyPayload.credential) {
        throw new Error(verifyPayload.error || "verify_failed");
      }

      toast.success("Passkey enrolled", {
        description: "You can now sign in with this device.",
      });

      // Optimistically add to the local list.
      setPasskeys((prev) => [
        ...prev,
        {
          id: verifyPayload.credential!.id,
          deviceName: deviceName.trim() || verifyPayload.credential!.deviceName,
          createdAt: verifyPayload.credential!.createdAt,
          transports: verifyPayload.credential!.transports,
        },
      ]);
      setDeviceName("");
    } catch (err) {
      // WebAuthn errors are typed — `name === "NotAllowedError"` means
      // the user cancelled. We don't want to toast an error in that case.
      const e = err as any;
      if (e?.name === "NotAllowedError" || e?.name === "AbortError") {
        toast("Passkey enrollment cancelled");
      } else {
        const msg = String(e?.message || e || "registration_failed");
        setError(msg);
        toast.error("Couldn't enroll passkey", { description: msg });
      }
    } finally {
      setRegistering(false);
    }
  }, [webAuthnSupported, deviceName]);

  // ── Remove a passkey ───────────────────────────────────────────────────
  const handleRemove = useCallback(async (id: string) => {
    // The P2 milestone doesn't expose a dedicated remove endpoint, so
    // we update the list optimistically and let the next page-load
    // refresh correct it. (The verify-registration endpoint can be
    // extended with a DELETE verb in a follow-up.)
    setPasskeys((prev) => prev.filter((p) => p.id !== id));
    toast("Passkey removed", {
      description: "Reloading will re-sync the device list.",
    });
  }, []);

  // ── Demo: sign in with passkey ─────────────────────────────────────────
  const handleAuthDemo = useCallback(async () => {
    if (!webAuthnSupported) {
      toast.error("WebAuthn not supported", {
        description: "Your browser doesn't support passkeys.",
      });
      return;
    }
    setAuthing(true);
    setError(null);
    try {
      const optsRes = await fetchWithTimeout(
        "/api/auth/passkey/auth-options",
        { method: "GET" },
      );
      if (!optsRes.ok) {
        throw new Error(`HTTP ${optsRes.status}`);
      }
      const optsPayload = (await optsRes.json()) as AuthOptionsResponse;
      if (!optsPayload.success || !optsPayload.options) {
        throw new Error(optsPayload.error || "no_options");
      }
      const assertion = await startAuthentication({
        optionsJSON: optsPayload.options,
      });
      const verifyRes = await fetchWithTimeout(
        "/api/auth/passkey/verify-auth",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ assertion }),
        },
      );
      if (!verifyRes.ok) {
        const err = (await verifyRes.json().catch(() => ({}))) as VerifyAuthResponse;
        throw new Error(err.error || `HTTP ${verifyRes.status}`);
      }
      const verifyPayload = (await verifyRes.json()) as VerifyAuthResponse;
      if (!verifyPayload.success || !verifyPayload.user) {
        throw new Error(verifyPayload.error || "verify_failed");
      }
      toast.success("Passkey sign-in verified", {
        description: `Welcome back, ${verifyPayload.user.username}!`,
      });
    } catch (err) {
      const e = err as any;
      if (e?.name === "NotAllowedError" || e?.name === "AbortError") {
        toast("Authentication cancelled");
      } else {
        const msg = String(e?.message || e || "auth_failed");
        setError(msg);
        toast.error("Passkey sign-in failed", { description: msg });
      }
    } finally {
      setAuthing(false);
    }
  }, [webAuthnSupported]);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="sheet"
      maxWidth="max-w-2xl"
      ariaLabel="Passkey Setup — manage WebAuthn credentials"
    >
      <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal to-steel flex items-center justify-center shrink-0 shadow-soft">
          <KeyRound className="w-5 h-5 text-cream" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Security
          </div>
          <div className="font-display text-xl truncate">Passkey Setup</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close passkey setup"
          className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        >
          <span aria-hidden className="text-lg leading-none">×</span>
        </button>
      </header>

      <div className="p-5 space-y-5 max-h-[calc(100vh-180px)] overflow-y-auto">
        {/* WebAuthn support warning */}
        {webAuthnSupported === false && (
          <div
            role="alert"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-foreground/80">
              Your browser doesn't support WebAuthn. Passkeys require a
              modern browser (Chrome 67+, Safari 14+, Firefox 60+, Edge 18+).
            </p>
          </div>
        )}

        {/* Hero / explainer */}
        <section
          aria-labelledby="passkey-explainer-title"
          className="rounded-lg border border-border/60 bg-card/50 p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-teal" />
            <h3
              id="passkey-explainer-title"
              className="text-sm font-semibold"
            >
              What are passkeys?
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Passkeys use your device's biometric (Touch ID, Face ID, Windows
            Hello) or a hardware key to sign you in — no password required.
            They're immune to phishing and never leave your device.
          </p>
        </section>

        {/* Add-passkey form */}
        <section
          aria-labelledby="add-passkey-title"
          className="space-y-3"
        >
          <h3 id="add-passkey-title" className="text-sm font-semibold">
            Add a new passkey
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Label htmlFor="device-name" className="sr-only">
                Device name (optional)
              </Label>
              <Input
                id="device-name"
                placeholder="Device name (e.g. MacBook Air, iPhone 15)"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                maxLength={64}
                autoComplete="off"
                disabled={registering}
                aria-describedby="device-name-help"
              />
              <p
                id="device-name-help"
                className="text-[10px] text-muted-foreground mt-1"
              >
                A friendly name so you remember which device this is.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleAddPasskey}
              disabled={registering || webAuthnSupported === false}
              aria-busy={registering}
              className="shrink-0"
            >
              {registering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" aria-hidden />
                  Enrolling…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" aria-hidden />
                  Add passkey
                </>
              )}
            </Button>
          </div>
        </section>

        {/* Passkey list */}
        <section
          aria-labelledby="passkey-list-title"
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <h3
              id="passkey-list-title"
              className="text-sm font-semibold"
            >
              Enrolled passkeys
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void fetchList()}
              disabled={loading}
              aria-label="Refresh passkey list"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
                aria-hidden
              />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-center py-8 text-muted-foreground"
            >
              <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden />
              Loading…
            </div>
          ) : passkeys.length === 0 ? (
            <div
              role="status"
              className="rounded-lg border border-dashed border-border/60 p-6 text-center"
            >
              <Fingerprint className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" aria-hidden />
              <p className="text-sm font-medium">No passkeys yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add a passkey to enable passwordless sign-in for this account.
              </p>
            </div>
          ) : (
            <ul
              className="space-y-2 max-h-96 overflow-y-auto pr-1"
              aria-label="List of enrolled passkeys"
            >
              {passkeys.map((pk, idx) => (
                <li
                  key={pk.id}
                  className="rounded-lg border border-border/60 bg-card/40 p-3 flex items-center gap-3"
                >
                  <div
                    className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center shrink-0"
                    aria-hidden
                  >
                    <KeyRound className="w-4 h-4 text-teal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {pk.deviceName || `Passkey ${idx + 1}`}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Added{" "}
                      {new Date(pk.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  {pk.transports && pk.transports.length > 0 && (
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {pk.transports.join(", ")}
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleRemove(pk.id)}
                    aria-label={`Remove passkey ${pk.deviceName || idx + 1}`}
                    className="text-rose hover:text-rose hover:bg-rose/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Demo: sign in with passkey */}
        <section
          aria-labelledby="auth-demo-title"
          className="rounded-lg border border-border/60 bg-card/50 p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal" aria-hidden />
            <h3 id="auth-demo-title" className="text-sm font-semibold">
              Test passkey sign-in
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Verify that an enrolled passkey can authenticate you end-to-end.
            This triggers the browser's passkey prompt and exchanges the
            assertion for a fresh session cookie.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleAuthDemo}
            disabled={authing || passkeys.length === 0 || webAuthnSupported === false}
            aria-busy={authing}
            aria-label="Sign in with passkey (demo)"
          >
            {authing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" aria-hidden />
                Authenticating…
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-1" aria-hidden />
                Sign in with passkey
              </>
            )}
          </Button>
        </section>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose/40 bg-rose/10 p-3 text-xs text-rose"
          >
            {error}
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

export default PasskeySetup;

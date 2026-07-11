"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, Eye, EyeOff,
  Fingerprint, Loader2, Lock, Mail, MapPin, ShieldCheck, Sparkles,
  Search, ChevronDown, User as UserIcon, Calendar, Baby,
} from "lucide-react";

import { CircleMark } from "@/components/brand/circle-mark";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { COUNTRIES, getCountry, detectCountry } from "@/lib/countries";
import { useAuth, ageBand, computeAge, type AuthView, type RegisterData } from "@/lib/auth-store";

/* ------------------------------------------------------------------ */
/* Small visual helpers                                                */
/* ------------------------------------------------------------------ */

/** Animated luxury background: aurora + slow-rotating mesh + film grain overlay. */
function AuthBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 aurora-bg opacity-80" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        className="absolute -top-1/2 -left-1/2 w-[200vw] h-[200vw] rounded-full opacity-25"
        style={{ background: "var(--gradient-mesh)", filter: "blur(120px)" } as React.CSSProperties}
      />
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/60" />
    </div>
  );
}

/** Floating CirkleMark used on every view. */
function FloatingMark({ size = 96 }: { size?: number }) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0], scale: [1, 1.03, 1] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="relative"
    >
      <div className="absolute inset-0 -z-10 blur-2xl opacity-60 bg-[hsl(var(--gold)/0.35)] rounded-full" />
      <CircleMark size={size} />
    </motion.div>
  );
}

/** Shimmering gold gradient button used for primary CTAs. */
function GoldButton({
  children, onClick, disabled, loading, className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "relative w-full overflow-hidden rounded-full px-6 py-3.5 text-sm font-medium text-charcoal",
        "bg-gradient-gold shadow-[0_8px_30px_-8px_hsl(var(--gold)/0.55)]",
        "transition-all duration-300 hover:shadow-[0_12px_40px_-8px_hsl(var(--gold)/0.7)] hover:-translate-y-0.5",
        "disabled:opacity-60 disabled:pointer-events-none",
        "group",
        className,
      )}
    >
      {/* shimmer line */}
      <span
        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
        style={{
          background:
            "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.45), transparent)",
          width: "60%",
        }}
      />
      <span className="relative flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </span>
    </button>
  );
}

/** Glass-outline secondary button. */
function GlassButton({
  children, onClick, className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full overflow-hidden rounded-full px-6 py-3.5 text-sm font-medium text-foreground",
        "glass hover:bg-muted/50 transition-all duration-300 hover:-translate-y-0.5",
        "border border-border/80",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Wrapper that gives the inner Input a soft gold focus ring. */
function GoldField({
  id, label, hint, error, icon: Icon, children,
}: {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label htmlFor={id} className="text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </Label>
      )}
      <div
        className={cn(
          "group relative flex items-center rounded-xl border bg-background/60 backdrop-blur-sm",
          "border-border/70 transition-all duration-300",
          "focus-within:border-[hsl(var(--gold)/0.6)] focus-within:shadow-[0_0_0_3px_hsl(var(--gold)/0.18)]",
          error && "border-destructive/60 focus-within:border-destructive focus-within:shadow-[0_0_0_3px_hsl(var(--destructive)/0.18)]",
        )}
      >
        {Icon && (
          <Icon className="absolute left-3 w-4 h-4 text-muted-foreground group-focus-within:text-[hsl(var(--gold))] transition-colors" />
        )}
        <div className={cn("w-full", Icon && "pl-9")}>{children}</div>
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Stepper dots at the top of the register flow. */
function Stepper({ total, current }: { total: number; current: number }) {
  // Framer Motion cannot interpolate between CSS variable references like
  // `hsl(var(--gold))` (it sees them as opaque strings, not colors). We avoid
  // the resulting "not an animatable value" warning by only animating `width`
  // and letting the className swap drive the color via CSS transitions.
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {Array.from({ length: total }).map((_, i) => {
        const active = i <= current;
        return (
          <motion.div
            key={i}
            initial={false}
            animate={{ width: i === current ? 28 : 8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`h-2 rounded-full transition-colors duration-300 ${
              active ? "bg-[hsl(var(--gold))]" : "bg-muted-foreground/30"
            }`}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Password strength meter                                             */
/* ------------------------------------------------------------------ */

function scorePassword(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { score: 0, label: "" };
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  return { score: Math.min(s, 4) as 0 | 1 | 2 | 3 | 4, label: labels[Math.min(s, 4)] };
}

const STRENGTH_COLOR: Record<number, string> = {
  0: "bg-muted-foreground/30",
  1: "bg-destructive",
  2: "bg-accent",
  3: "bg-secondary",
  4: "bg-emerald-500",
};

/* ------------------------------------------------------------------ */
/* View: Splash                                                        */
/* ------------------------------------------------------------------ */

function SplashView() {
  const setAuthView = useAuth((s) => s.setAuthView);
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.5 }}
      className="relative flex flex-col items-center justify-center min-h-[88vh] text-center px-8"
    >
      <FloatingMark size={120} />

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="font-display text-6xl gradient-text-gold mt-8 tracking-tight"
      >
        Cirkle
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="font-arabic text-2xl text-muted-foreground mt-2"
      >
        دواير
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.6 }}
        className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mt-4"
      >
        A new social operating system
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="w-full max-w-sm space-y-3 mt-10"
      >
        <GoldButton onClick={() => setAuthView("login")}>
          Sign in <ArrowRight className="w-4 h-4" />
        </GoldButton>
        <GlassButton onClick={() => setAuthView("register")}>
          Create account
        </GlassButton>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.6 }}
        className="absolute bottom-8 inset-x-0 text-[10px] text-muted-foreground/80 max-w-xs mx-auto px-6 leading-relaxed pointer-events-none"
      >
        By continuing, you agree to the{" "}
        <span className="text-foreground/80 font-medium">Cirkle Covenant</span>:
        $0, privacy-first, forever free.
      </motion.p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* View: Sign in                                                       */
/* ------------------------------------------------------------------ */

function LoginView() {
  const { login, setAuthView } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Auto-append @cirkle preview when the user hasn't typed it themselves.
  const displayHandle = useMemo(() => {
    const t = username.trim();
    if (!t) return "";
    if (t.endsWith("@cirkle")) return t;
    if (t.includes("@")) return t;
    return `${t}@cirkle`;
  }, [username]);

  const submit = async () => {
    setError(undefined);
    if (!username.trim()) {
      setError("Enter your @cirkle username.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setLoading(true);
    // Simulate network latency for the cinematic feel.
    await new Promise((r) => setTimeout(r, 700));
    const res = await login(username, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success("Welcome back to Cirkle", {
      description: "Signed in locally · zero bytes left this device.",
    });
  };

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-sm mx-auto pt-6 pb-12 px-1"
    >
      <BackButton onClick={() => setAuthView("splash")} />

      <div className="flex flex-col items-center text-center mb-6">
        <FloatingMark size={64} />
        <h2 className="font-display text-3xl mt-4">Welcome back</h2>
        <p className="text-xs text-muted-foreground mt-1">Sign in to your Cirkle</p>
      </div>

      <div className="glass rounded-2xl p-5 space-y-4 shadow-glass">
        <GoldField id="login-username" label="Username" icon={UserIcon} error={error}>
          <Input
            id="login-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="username@cirkle"
            autoComplete="username"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 h-11"
          />
          {displayHandle && displayHandle !== username && (
            <div className="px-2 pb-1 text-[10px] text-[hsl(var(--gold))] font-mono">
              {displayHandle}
            </div>
          )}
        </GoldField>

        <GoldField id="login-password" label="Password" icon={Lock}>
          <Input
            id="login-password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="••••••••"
            autoComplete="current-password"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 h-11 pr-9"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </GoldField>

        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => {
              setAuthView("forgot");
              toast("Reset link sent to your email", {
                description: "If an account exists, a recovery link is on its way.",
              });
            }}
            className="text-muted-foreground hover:text-foreground transition"
          >
            Forgot password?
          </button>
          <span className="text-muted-foreground">
            Don&apos;t have an account?{" "}
            <button
              onClick={() => setAuthView("register")}
              className="text-[hsl(var(--gold))] hover:underline font-medium"
            >
              Create one
            </button>
          </span>
        </div>

        <GoldButton onClick={submit} loading={loading}>
          Sign in
        </GoldButton>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      <GlassButton
        onClick={() => toast("Cirkle ID integration coming soon", { description: "OIDC single sign-on · in development" })}
      >
        <Fingerprint className="w-4 h-4 mr-2 inline" />
        Continue with Cirkle ID
      </GlassButton>

      <p className="text-[10px] text-muted-foreground/80 text-center mt-6 max-w-xs mx-auto leading-relaxed">
        <ShieldCheck className="inline w-3 h-3 mr-1 align-text-bottom" />
        Your data stays on your device. Cirkle never sees your password.
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* View: Forgot password                                               */
/* ------------------------------------------------------------------ */

function ForgotView() {
  const setAuthView = useAuth((s) => s.setAuthView);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <motion.div
      key="forgot"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-sm mx-auto pt-6 pb-12 px-1"
    >
      <BackButton onClick={() => setAuthView("login")} />

      <div className="flex flex-col items-center text-center mb-6">
        <FloatingMark size={64} />
        <h2 className="font-display text-3xl mt-4">Reset password</h2>
        <p className="text-xs text-muted-foreground mt-1">
          We&apos;ll email a recovery link to your inbox.
        </p>
      </div>

      <div className="glass rounded-2xl p-5 space-y-4 shadow-glass">
        <GoldField id="forgot-email" label="Recovery email" icon={Mail}>
          <Input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 h-11"
          />
        </GoldField>

        <GoldButton
          onClick={() => {
            if (!email.trim()) {
              toast.error("Enter your recovery email");
              return;
            }
            setSent(true);
            toast.success("Reset link sent", {
              description: `Check ${email.trim()} for instructions.`,
            });
          }}
        >
          Send reset link
        </GoldButton>

        {sent && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.08)] p-3 text-xs text-muted-foreground text-center"
          >
            <Check className="inline w-3.5 h-3.5 mr-1 text-[hsl(var(--gold))]" />
            If an account exists for{" "}
            <span className="text-foreground font-mono">{email.trim()}</span>, a reset link is on its way.
          </motion.div>
        )}

        <button
          onClick={() => setAuthView("login")}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition text-center"
        >
          Back to sign in
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* View: Register (multi-step)                                         */
/* ------------------------------------------------------------------ */

const REGISTER_STEPS = ["Username", "Display name", "Password", "Date of birth", "Email", "Region"] as const;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function RegisterView() {
  const { register, setAuthView } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegisterData>({
    username: "",
    displayName: "",
    password: "",
    email: "",
    country: "EG",
    dob: "",
    parentalEmail: "",
  });
  const [error, setError] = useState<string | undefined>();
  const [showPw, setShowPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof RegisterData>(k: K, v: RegisterData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const usernameValid = USERNAME_RE.test(form.username.trim().toLowerCase());

  const strength = scorePassword(form.password);

  const cInfo = getCountry(form.country);

  // Age gate — computed from the DOB field so we can show inline feedback.
  const band = ageBand(form.dob);
  const age = computeAge(form.dob);

  const next = () => {
    setError(undefined);
    if (step === 0 && !usernameValid) {
      setError("3–20 chars: lowercase letters, numbers, underscore.");
      return;
    }
    if (step === 1 && !form.displayName.trim()) {
      setError("Tell us your name (or a nickname).");
      return;
    }
    if (step === 2 && form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (step === 3) {
      // DOB step — age gate validation.
      if (band === "unknown") {
        setError("Please enter a valid date of birth.");
        return;
      }
      if (band === "child") {
        // COPPA — block registration entirely.
        setError(
          "We're sorry, but Cirkle is not available for users under 13. (COPPA)",
        );
        return;
      }
      if (band === "teen") {
        // 13–15: parental email required.
        const pe = (form.parentalEmail || "").trim();
        if (!pe || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pe)) {
          setError("A parent or guardian's email is required for users under 16.");
          return;
        }
      }
    }
    if (step === REGISTER_STEPS.length - 1) {
      void submit();
    } else {
      setStep((s) => s + 1);
    }
  };

  const back = () => {
    setError(undefined);
    if (step === 0) {
      setAuthView("splash");
    } else {
      setStep((s) => s - 1);
    }
  };

  const submit = async () => {
    setCreating(true);
    await new Promise((r) => setTimeout(r, 900));
    const res = await register(form);
    setCreating(false);
    if (!res.ok) {
      setError(res.error);
      // Jump back to the username step if it was a username conflict.
      if (res.error?.includes("already taken")) setStep(0);
      return;
    }
    setDone(true);
  };

  /* --- Success bloom --- */
  if (done) {
    return (
      <motion.div
        key="register-done"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative flex flex-col items-center justify-center min-h-[80vh] text-center px-8"
      >
        <motion.div
          initial={{ scale: 0.3, opacity: 0, filter: "blur(20px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute inset-0 -z-10 blur-3xl opacity-70 bg-[hsl(var(--gold)/0.45)] rounded-full scale-150" />
          <CircleMark size={140} />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="font-display text-4xl gradient-text-gold mt-8"
        >
          Welcome to Cirkle
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-sm text-muted-foreground mt-3"
        >
          Your handle is{" "}
          <span className="font-mono text-[hsl(var(--gold))]">
            {form.username.trim().toLowerCase()}@cirkle
          </span>
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="mt-6"
        >
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground inline mr-2" />
          <span className="text-xs text-muted-foreground">Entering Cirkle…</span>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="register"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-sm mx-auto pt-6 pb-12 px-1"
    >
      <BackButton onClick={back} />

      <div className="flex flex-col items-center text-center mb-5">
        <FloatingMark size={56} />
        <h2 className="font-display text-2xl mt-3">Create your Cirkle</h2>
        <p className="text-xs text-muted-foreground mt-1">Step {step + 1} of {REGISTER_STEPS.length} · {REGISTER_STEPS[step]}</p>
      </div>

      <div className="mb-5">
        <Stepper total={REGISTER_STEPS.length} current={step} />
      </div>

      <div className="glass rounded-2xl p-5 shadow-glass min-h-[260px] flex flex-col">
        <AnimatePresence mode="wait">
          {/* Step 1: Username */}
          {step === 0 && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 flex-1"
            >
              <div>
                <h3 className="font-display text-lg">Choose your @cirkle username</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  This is how friends find you. Lowercase letters, numbers, underscore · 3–20 chars.
                </p>
              </div>
              <GoldField
                id="reg-username"
                icon={UserIcon}
                error={error}
                hint={usernameValid ? "Looks great." : undefined}
              >
                <Input
                  id="reg-username"
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                  placeholder="yousef"
                  autoComplete="username"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 h-11"
                />
                {usernameValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <BadgeCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                )}
              </GoldField>
              {form.username.trim() && (
                <div className="rounded-xl bg-[hsl(var(--gold)/0.08)] border border-[hsl(var(--gold)/0.3)] p-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Your handle</div>
                  <div className="font-mono text-lg text-[hsl(var(--gold))] mt-1">
                    {form.username.trim().toLowerCase()}@cirkle
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Display name */}
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 flex-1"
            >
              <div>
                <h3 className="font-display text-lg">What should we call you?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Your display name appears on your profile and posts. You can change it later.
                </p>
              </div>
              <GoldField id="reg-name" icon={Sparkles} error={error}>
                <Input
                  id="reg-name"
                  value={form.displayName}
                  onChange={(e) => set("displayName", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                  placeholder="Yousef Al-Harbi"
                  autoComplete="name"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 h-11"
                />
              </GoldField>
              {form.displayName.trim() && (
                <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center text-charcoal font-display">
                    {form.displayName.trim()[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{form.displayName.trim()}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">@{form.username || "username"}@cirkle</div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Password */}
          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 flex-1"
            >
              <div>
                <h3 className="font-display text-lg">Set a password</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 6 characters. Stored only on your device — Cirkle never sees it.
                </p>
              </div>
              <GoldField id="reg-pw" icon={Lock} error={error}>
                <Input
                  id="reg-pw"
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 h-11 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </GoldField>

              {form.password && (
                <div className="space-y-2">
                  <Progress
                    value={(strength.score / 4) * 100}
                    className="h-1.5 bg-muted-foreground/20"
                  />
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                    <span className="text-muted-foreground">Strength</span>
                    <span className={cn(
                      "font-medium",
                      strength.score <= 1 && "text-destructive",
                      strength.score === 2 && "text-accent",
                      strength.score === 3 && "text-secondary",
                      strength.score === 4 && "text-emerald-500",
                    )}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i <= strength.score ? STRENGTH_COLOR[strength.score] : "bg-muted-foreground/20",
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Date of birth (age gate) */}
          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 flex-1"
            >
              <div>
                <h3 className="font-display text-lg">When were you born?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  We use your date of birth only to verify age — required by children&apos;s
                  privacy law (COPPA). It&apos;s stored on your device and never shared.
                </p>
              </div>
              <GoldField id="reg-dob" icon={Calendar} error={error}>
                <Input
                  id="reg-dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => set("dob", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                  max={new Date().toISOString().slice(0, 10)}
                  min="1900-01-01"
                  autoComplete="bday"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 h-11"
                />
              </GoldField>

              {/* Inline age-gate feedback */}
              {band === "child" && (
                <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs text-accent flex items-start gap-2">
                  <Baby className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    We&apos;re sorry — Cirkle is not available for users under 13.
                    This is required by U.S. children&apos;s privacy law (COPPA).
                  </span>
                </div>
              )}
              {band === "teen" && (
                <>
                  <div className="rounded-xl border border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.06)] p-3 text-xs text-muted-foreground flex items-start gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[hsl(var(--gold))]" />
                    <span>
                      You&apos;re <b>{age}</b>. We need a parent or guardian&apos;s
                      email to confirm consent before your account goes live. The
                      account is created in a <b>pending</b> state until they verify.
                    </span>
                  </div>
                  <GoldField
                    id="reg-parental-email"
                    icon={Mail}
                    hint="We'll send a verification link to this address."
                  >
                    <Input
                      id="reg-parental-email"
                      type="email"
                      value={form.parentalEmail || ""}
                      onChange={(e) => set("parentalEmail", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && next()}
                      placeholder="parent@example.com"
                      autoComplete="email"
                      className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 h-11"
                    />
                  </GoldField>
                </>
              )}
              {band === "adult" && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
                  <span>You&apos;re <b>{age}</b> — no parental consent needed.</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 5: Email */}
          {step === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 flex-1"
            >
              <div>
                <h3 className="font-display text-lg">Email for recovery <span className="text-muted-foreground text-sm">(optional)</span></h3>
                <p className="text-xs text-muted-foreground mt-1">
                  We&apos;ll only use this if you ever forget your password. You can skip this step.
                </p>
              </div>
              <GoldField id="reg-email" icon={Mail} hint="Skip ahead if you'd rather not.">
                <Input
                  id="reg-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 h-11"
                />
              </GoldField>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[hsl(var(--gold))]" />
                <span>
                  Your email (if provided) is stored locally on your device. We never send marketing email.
                </span>
              </div>
            </motion.div>
          )}

          {/* Step 6: Region */}
          {step === 5 && (
            <motion.div
              key="s5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 flex-1"
            >
              <div>
                <h3 className="font-display text-lg">Pick your region</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Sets your default data plane, news sources, and nearby happenings.
                </p>
              </div>
              {/* Auto-detect location */}
              <AutoDetectCountry onDetect={(code) => set("country", code)} currentCode={form.country} />
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Or choose manually</Label>
                <CountryPicker
                  value={form.country}
                  onChange={(v) => set("country", v)}
                />
              </div>
              <div className="rounded-xl bg-muted/40 p-3 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[hsl(var(--gold))]" />
                <div className="text-xs">
                  <div className="font-medium">{cInfo.flag} {cInfo.name}</div>
                  <div className="text-muted-foreground">Capital: {cInfo.capital} · {cInfo.currency}</div>
                </div>
              </div>

              {/* Review summary */}
              <div className="rounded-xl border border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.06)] p-3 space-y-1.5 text-xs">
                <div className="text-[10px] uppercase tracking-widest text-[hsl(var(--gold))] mb-1">Review</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Handle</span><span className="font-mono">{form.username.trim().toLowerCase()}@cirkle</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{form.displayName || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">DOB</span><span className="font-mono">{form.dob || "—"}</span></div>
                {form.parentalEmail && <div className="flex justify-between"><span className="text-muted-foreground">Parent</span><span className="font-mono text-[10px]">{form.parentalEmail}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-mono">{form.email || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Region</span><span>{cInfo.flag} {cInfo.name}</span></div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step controls */}
        <div className="pt-4 mt-2 space-y-3">
          {step === REGISTER_STEPS.length - 1 ? (
            <GoldButton onClick={next} loading={creating}>
              <Sparkles className="w-4 h-4" />
              Create my Cirkle
            </GoldButton>
          ) : (
            <GoldButton onClick={next}>
              Continue <ArrowRight className="w-4 h-4" />
            </GoldButton>
          )}
          <div className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => setAuthView("login")}
              className="text-[hsl(var(--gold))] hover:underline font-medium"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* View: OTP (mock — kept simple for the authView enum)                 */
/* ------------------------------------------------------------------ */

function OtpView() {
  const setAuthView = useAuth((s) => s.setAuthView);
  return (
    <motion.div
      key="otp"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative w-full max-w-sm mx-auto pt-6 pb-12 px-1 text-center"
    >
      <BackButton onClick={() => setAuthView("login")} />
      <FloatingMark size={56} />
      <h2 className="font-display text-2xl mt-3">Verify it&apos;s you</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        We sent a 6-digit code to your email. Enter it below.
      </p>
      <GlassButton onClick={() => toast.success("Verified — coming soon", { description: "OTP flow is a demo placeholder." })}>
        Verify
      </GlassButton>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared back button                                                  */
/* ------------------------------------------------------------------ */

/* Searchable country picker — uses Dialog for high z-index + search filter */
function CountryPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = getCountry(value);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.arabicName || "").includes(q)
    );
  }, [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setQuery(""); }}
        className="w-full h-11 bg-background/60 border border-border/70 rounded-md px-3 flex items-center justify-between text-sm hover:bg-muted/30 transition"
      >
        <span className="flex items-center gap-2">
          <span className="text-base">{selected.flag}</span>
          <span>{selected.name}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md z-[400]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Choose your country</DialogTitle>
            <DialogDescription className="sr-only">
              Search and select your country to localize your Cirkle experience.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search countries..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-background/60"
            />
          </div>
          <div className="max-h-72 overflow-y-auto -mx-2 px-2 scrollbar-hide">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No countries found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onChange(c.code); setOpen(false); }}
                  className={`w-full text-start px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm hover:bg-muted/40 transition ${
                    c.code === value ? "bg-secondary/10 text-secondary font-medium" : ""
                  }`}
                >
                  <span className="text-xl">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{c.name}</div>
                    {c.arabicName && (
                      <div className="text-[10px] text-muted-foreground" dir="rtl">{c.arabicName}</div>
                    )}
                  </div>
                  {c.code === value && <Check className="w-4 h-4 text-secondary shrink-0" />}
                </button>
              ))
            )}
          </div>
          <div className="text-[10px] text-muted-foreground text-center pt-1">
            {filtered.length} of {COUNTRIES.length} countries
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* Auto-detect country using geolocation + timezone */
function AutoDetectCountry({ onDetect, currentCode }: { onDetect: (code: string) => void; currentCode: string }) {
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(false);
  const cInfo = getCountry(currentCode);

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const code = await detectCountry();
      onDetect(code);
      setDetected(true);
      toast.success(`Location detected: ${getCountry(code).flag} ${getCountry(code).name}`);
    } catch {
      toast.error("Couldn't detect your location. Please choose manually.");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[hsl(var(--gold))]/30 bg-gradient-to-br from-[hsl(var(--gold))]/10 to-transparent p-4">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(39_55%_67%)] to-[hsl(39_45%_47%)] text-charcoal shrink-0">
          {detecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Auto-detect my location</div>
          <div className="text-[11px] text-muted-foreground">
            {detected ? `Detected: ${cInfo.flag} ${cInfo.name}` : "Uses your device GPS + timezone. Privacy: only country level."}
          </div>
        </div>
        <button
          onClick={handleDetect}
          disabled={detecting}
          className="text-xs px-4 py-2 rounded-full bg-gradient-to-br from-[hsl(39_55%_67%)] to-[hsl(39_45%_47%)] text-charcoal font-medium disabled:opacity-50 shimmer-line relative overflow-hidden"
        >
          {detecting ? "Detecting…" : detected ? "Re-detect" : "Detect"}
        </button>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute -top-1 left-0 w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-muted/60 transition"
      aria-label="Back"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Top-level screen                                                    */
/* ------------------------------------------------------------------ */

export function AuthScreen() {
  const authView = useAuth((s) => s.authView);
  const setAuthView = useAuth((s) => s.setAuthView);

  // The CinematicEntrance landing page is now the ONLY splash screen.
  // If AuthScreen mounts with view="splash" (e.g. after logout), redirect to login.
  useEffect(() => {
    if (authView === "splash") {
      setAuthView("login");
    }
  }, [authView, setAuthView]);

  // Escape key goes back to login (not splash — splash is handled by CinematicEntrance).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && authView !== "login") {
        setAuthView("login");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [authView, setAuthView]);

  return (
    <div className="fixed inset-0 z-[300] bg-background overflow-y-auto">
      <AuthBackground />
      <div className="relative min-h-screen flex flex-col items-center justify-start sm:justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <AnimatePresence mode="wait">
          {authView === "login" && <LoginView key="login" />}
          {authView === "register" && <RegisterView key="register" />}
          {authView === "forgot" && <ForgotView key="forgot" />}
          {authView === "otp" && <OtpView key="otp" />}
        </AnimatePresence>
      </div>

      {/* Subtle bottom credit */}
      <div className="absolute bottom-2 inset-x-0 text-center text-[9px] uppercase tracking-[0.3em] text-muted-foreground/40 pointer-events-none">
        Cirkle · دواير
      </div>
    </div>
  );
}

/* Re-export the type so consumers can import from this file if they want. */
export type { AuthView };

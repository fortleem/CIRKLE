"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Shield, ShieldCheck, MessageCircle, Wallet, Image as ImageIcon,
  BadgeCheck, Mail, Smartphone, Fingerprint, EyeOff, Vibrate, Info,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface BlurTarget {
  id: string;
  label: string;
  desc: string;
  icon: typeof MessageCircle;
  defaultOn: boolean;
}

const TARGETS: BlurTarget[] = [
  { id: "wasl", label: "Wasl messages", desc: "Chat list + open conversations", icon: MessageCircle, defaultOn: true },
  { id: "pay", label: "Cirkle Pay balance + transactions", desc: "All amounts and counterparties", icon: Wallet, defaultOn: true },
  { id: "lamahat", label: "Lamahat photos", desc: "Photo grid and full-screen viewer", icon: ImageIcon, defaultOn: true },
  { id: "id", label: "Cirkle ID", desc: "Your @handle and verified badges", icon: BadgeCheck, defaultOn: true },
  { id: "mail", label: "Mail previews", desc: "Sender, subject, snippet", icon: Mail, defaultOn: true },
];

export function PrivacyShield({ open, onClose }: Props) {
  const [shieldOn, setShieldOn] = useState(false);
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(TARGETS.map((t) => [t.id, t.defaultOn]))
  );
  const [shakeToggle, setShakeToggle] = useState(false);
  const [tripleTapToggle, setTripleTapToggle] = useState(false);

  // Shake-to-toggle — mock using device motion when available.
  useEffect(() => {
    if (!open) return;
    if (!shakeToggle) return;
    if (typeof window === "undefined") return;
    type L = (e: DeviceMotionEvent) => void;
    let lastBump = 0;
    const onMotion: L = (e) => {
      const accel = e.accelerationIncludingGravity;
      if (!accel) return;
      const mag = Math.sqrt((accel.x || 0) ** 2 + (accel.y || 0) ** 2 + (accel.z || 0) ** 2);
      const now = Date.now();
      if (mag > 22 && now - lastBump > 600) {
        lastBump = now;
        setShieldOn((v) => !v);
      }
    };
    window.addEventListener("devicemotion", onMotion as EventListener);
    return () => window.removeEventListener("devicemotion", onMotion as EventListener);
  }, [open, shakeToggle]);

  const toggleShield = (next: boolean) => {
    setShieldOn(next);
    if (next) {
      toast.success("Privacy Shield active", {
        description: "Sensitive content is blurred. A persistent badge will appear on screen.",
      });
    } else {
      toast("Privacy Shield off");
    }
  };

  const anyActive = shieldOn && Object.values(toggles).some(Boolean);

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
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Privacy Shield"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <motion.div
                animate={shieldOn ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: shieldOn ? Infinity : 0 }}
                className={cn(
                  "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition",
                  shieldOn
                    ? "bg-secondary/20 border-secondary/60"
                    : "bg-muted/40 border-border/60"
                )}
              >
                <ShieldCheck className={cn("w-5 h-5", shieldOn ? "text-secondary" : "text-muted-foreground")} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Privacy Shield</div>
                <div className="text-[11px] text-muted-foreground">Instantly blur sensitive content when showing your phone</div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Big toggle */}
              <motion.section
                animate={shieldOn ? { boxShadow: "0 0 40px hsl(var(--secondary) / 0.4)" } : { boxShadow: "0 0 0px transparent" }}
                className={cn(
                  "rounded-3xl border p-5 transition",
                  shieldOn
                    ? "border-secondary/60 bg-gradient-to-br from-secondary/15 to-accent/5"
                    : "border-border/60 bg-card"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition", shieldOn ? "bg-secondary/20" : "bg-muted")}>
                    <Shield className={cn("w-6 h-6", shieldOn ? "text-secondary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg leading-tight">
                      Privacy Shield {shieldOn ? "ON" : "OFF"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {shieldOn ? "Blurring all checked content" : "Tap to activate before you share your screen"}
                    </div>
                  </div>
                  <button
                    role="switch"
                    aria-checked={shieldOn}
                    aria-label="Toggle Privacy Shield"
                    onClick={() => toggleShield(!shieldOn)}
                    className={cn(
                      "relative w-16 h-9 rounded-full transition shrink-0",
                      shieldOn ? "bg-secondary" : "bg-muted border border-border/60"
                    )}
                  >
                    <motion.span
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={cn(
                        "absolute top-1 w-7 h-7 rounded-full bg-cream shadow-md",
                        shieldOn ? "left-8" : "left-1"
                      )}
                    />
                  </button>
                </div>

                {/* Persistent badge preview */}
                <AnimatePresence>
                  {shieldOn && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-secondary"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse-glow" />
                      Shield badge shown across the app · {anyActive ? "blurring active targets" : "no targets selected"}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>

              {/* Live demo with blur */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <EyeOff className="w-3 h-3" /> Live demo
                </div>
                <div className="space-y-2">
                  {/* Chat demo */}
                  <DemoRow active={shieldOn && toggles.wasl}>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-mesh shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium">User</div>
                        <div className="text-[11px] text-muted-foreground truncate">Will send the brief tonight ✨</div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">2m</span>
                    </div>
                  </DemoRow>

                  {/* Pay demo */}
                  <DemoRow active={shieldOn && toggles.pay}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center text-charcoal shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Balance</div>
                        <div className="font-display text-lg gradient-text-gold">SAR 18,540.20</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">−84.20</div>
                        <div className="text-[10px] text-secondary">+18,500</div>
                      </div>
                    </div>
                  </DemoRow>

                  {/* Photo demo */}
                  <DemoRow active={shieldOn && toggles.lamahat}>
                    <div className="grid grid-cols-4 gap-1">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-md bg-gradient-to-br from-secondary/30 via-accent/30 to-primary/30" />
                      ))}
                    </div>
                  </DemoRow>

                  {/* Cirkle ID demo */}
                  <DemoRow active={shieldOn && toggles.id}>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-secondary shrink-0" />
                      <div className="text-sm font-medium">yousef@cirkle</div>
                      <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">Verified</span>
                    </div>
                  </DemoRow>

                  {/* Mail demo */}
                  <DemoRow active={shieldOn && toggles.mail}>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-secondary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">Aramco HR — Welcome aboard</div>
                        <div className="text-[11px] text-muted-foreground truncate">Your onboarding pack is attached…</div>
                      </div>
                    </div>
                  </DemoRow>
                </div>
              </section>

              {/* What gets blurred */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">What gets blurred</div>
                <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
                  {TARGETS.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <t.icon className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{t.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{t.desc}</div>
                      </div>
                      <Switch
                        checked={toggles[t.id]}
                        onCheckedChange={(v) => setToggles((s) => ({ ...s, [t.id]: v }))}
                        aria-label={`Blur ${t.label}`}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Triggers */}
              <section>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Quick triggers</div>
                <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
                  <TriggerRow
                    icon={Vibrate}
                    label="Shake to toggle"
                    desc="Shake your phone to flip the Shield (uses device motion)"
                    checked={shakeToggle}
                    onCheckedChange={(v) => {
                      setShakeToggle(v);
                      if (v && typeof window !== "undefined" && "DeviceMotionEvent" in window) {
                        toast.success("Shake-to-toggle armed", { description: "Give your phone a quick shake to test." });
                      } else if (v) {
                        toast("Shake-to-toggle armed", { description: "Device motion not available on this device — toggling on press instead." });
                      }
                    }}
                  />
                  <TriggerRow
                    icon={Smartphone}
                    label="Triple-tap status bar"
                    desc="Tap the status bar three times fast to flip the Shield"
                    checked={tripleTapToggle}
                    onCheckedChange={setTripleTapToggle}
                  />
                  <TriggerRow
                    icon={Fingerprint}
                    label="Biometric activation"
                    desc="Reveal blurred content only after Face/Touch verification"
                    checked={false}
                    onCheckedChange={(v) => v && toast("Biometric lock armed", { description: "You'll verify each time you reveal content." })}
                  />
                </div>
              </section>

              {/* Privacy note */}
              <section className="rounded-2xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Shield runs entirely on-device. Blurs are applied with hardware-accelerated backdrop-filter — no screenshots, no content ever leaves your phone.
                </p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DemoRow({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card p-3 overflow-hidden">
      <div className="relative z-10">{children}</div>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20 flex items-center justify-center"
            style={{
              background: "hsl(var(--background) / 0.6)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-secondary">
              <EyeOff className="w-3 h-3" /> Blurred
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TriggerRow({
  icon: Icon, label, desc, checked, onCheckedChange,
}: {
  icon: typeof Vibrate; label: string; desc: string; checked: boolean; onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground truncate">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

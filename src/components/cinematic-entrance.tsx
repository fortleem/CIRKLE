"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { CircleMark } from "@/components/brand/circle-mark";
import { ChevronRight, UserPlus, LogIn, Sparkles, Shield, Globe, Heart } from "lucide-react";

interface CinematicEntranceProps {
  isAuthenticated: boolean;
  onContinue: () => void;
  onRegister: () => void;
  onSignIn: () => void;
}

export function CinematicEntrance({ isAuthenticated, onContinue, onRegister, onSignIn }: CinematicEntranceProps) {
  const [phase, setPhase] = useState<"cinematic" | "landing">("cinematic");

  // 15-second cinematic experience — allows all animations to play
  // + privacy statement to appear at the right moment
  useEffect(() => {
    const t = setTimeout(() => setPhase("landing"), 15000);
    return () => clearTimeout(t);
  }, []);

  const skipToLanding = () => setPhase("landing");

  return (
    <div
      className="fixed inset-0 z-[200] bg-background overflow-hidden cursor-pointer"
      onClick={phase === "cinematic" ? skipToLanding : undefined}
    >
      <AnimatePresence mode="wait">
        {phase === "cinematic" ? (
          <CinematicScreen key="cinematic" onSkip={skipToLanding} />
        ) : (
          <LandingScreen
            key="landing"
            isAuthenticated={isAuthenticated}
            onContinue={onContinue}
            onRegister={onRegister}
            onSignIn={onSignIn}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Phase 1: Pure cinematic animation — its own full screen ─────────────
function CinematicScreen({ onSkip }: { onSkip: () => void }) {
  // "Tap to continue" hint appears after 600ms
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(30px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 flex flex-col items-center justify-center"
      onClick={onSkip}
    >
      {/* Background */}
      <div className="absolute inset-0 aurora-bg opacity-70" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute w-[140vw] h-[140vw] rounded-full opacity-30"
        style={{ background: "var(--gradient-mesh)", filter: "blur(100px)" } as React.CSSProperties}
      />

      {/* Logo */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0, filter: "blur(40px)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <CircleMark size={140} />
      </motion.div>

      {/* Brand name */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="mt-10 text-center relative"
      >
        <div className="font-display text-5xl gradient-text-gold">Cirkle</div>
        <div className="text-[10px] tracking-[0.5em] uppercase text-muted-foreground mt-3">
          دواير · A new social OS
        </div>
      </motion.div>

      {/* Privacy Statement — the big plus for Cirkle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3, duration: 1 }}
        className="mt-12 max-w-md mx-auto text-center relative px-6"
      >
        <div className="glass-strong rounded-2xl p-5 border border-secondary/20">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-secondary" />
            <span className="font-display text-sm text-secondary">Privacy First. Always.</span>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 4, duration: 0.6 }}
              className="flex items-center gap-2"
            >
              <span className="text-green-500">✓</span> Your data lives on your device — never on our servers
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 5, duration: 0.6 }}
              className="flex items-center gap-2"
            >
              <span className="text-green-500">✓</span> No ads. No tracking. No selling your data. Ever.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 6, duration: 0.6 }}
              className="flex items-center gap-2"
            >
              <span className="text-green-500">✓</span> AI runs on-device — we never see your conversations
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 7, duration: 0.6 }}
              className="flex items-center gap-2"
            >
              <span className="text-green-500">✓</span> Zero-knowledge identity — prove without revealing
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 8, duration: 0.6 }}
              className="flex items-center gap-2"
            >
              <span className="text-green-500">✓</span> Free for everyone · Forever · $0
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-16 left-1/2 -translate-x-1/2"
      >
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              className="w-1.5 h-1.5 rounded-full bg-secondary"
            />
          ))}
        </div>
      </motion.div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.6 }}
        className="absolute bottom-8 text-[10px] tracking-widest uppercase text-muted-foreground"
      >
        free for everyone · forever
      </motion.div>

      {/* Tap to continue hint (appears after 600ms) */}
      <AnimatePresence>
        {showHint && (
          <motion.button
            key="tap-hint"
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            onClick={onSkip}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 text-[11px] tracking-wide uppercase text-muted-foreground/80 hover:text-foreground transition flex items-center gap-1.5 select-none"
            aria-label="Tap to continue"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            Tap to continue
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Phase 2: Landing page — completely separate full screen ─────────────
function LandingScreen({
  isAuthenticated,
  onContinue,
  onRegister,
  onSignIn,
}: {
  isAuthenticated: boolean;
  onContinue: () => void;
  onRegister: () => void;
  onSignIn: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto"
    >
      {/* Background — same aurora but subtler */}
      <div className="absolute inset-0 aurora-bg opacity-40" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="absolute w-[120vw] h-[120vw] rounded-full opacity-20"
        style={{ background: "var(--gradient-mesh)", filter: "blur(100px)" } as React.CSSProperties}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center max-w-md w-full px-6 py-12">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-5"
        >
          <CircleMark size={80} />
        </motion.div>

        {/* Brand name */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="font-display text-4xl gradient-text-gold text-center"
        >
          Cirkle
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground mt-2 text-center"
        >
          دواير · A New Social Operating System
        </motion.p>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-8 grid grid-cols-3 gap-3 w-full"
        >
          {[
            { icon: Sparkles, label: "AI-Native", desc: "5 AI providers" },
            { icon: Shield, label: "Privacy-First", desc: "Data on device" },
            { icon: Globe, label: "242 Countries", desc: "Location-aware" },
            { icon: Heart, label: "Free Forever", desc: "$0 for everyone" },
            { icon: Globe, label: "8 Pillars", desc: "One super app" },
            { icon: Sparkles, label: "48 Features", desc: "All included" },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.07, duration: 0.4 }}
              className="glass rounded-xl p-3 text-center border border-border/40"
            >
              <f.icon className="w-4 h-4 text-secondary mx-auto mb-1" />
              <div className="text-[10px] font-medium">{f.label}</div>
              <div className="text-[9px] text-muted-foreground">{f.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-8 w-full space-y-3"
        >
          {isAuthenticated ? (
            <button
              onClick={onContinue}
              className="w-full rounded-full bg-gradient-hero text-cream py-3.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition shadow-float"
            >
              Continue to your Cirkle <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={onRegister}
                className="w-full rounded-full bg-gradient-hero text-cream py-3.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition shadow-float"
              >
                <UserPlus className="w-4 h-4" /> Create your Cirkle
              </button>
              <button
                onClick={onSignIn}
                className="w-full rounded-full glass-strong text-foreground py-3.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted/60 transition border border-border/60"
              >
                <LogIn className="w-4 h-4" /> Sign in to your account
              </button>
            </>
          )}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
          className="mt-6 text-[10px] text-muted-foreground text-center"
        >
          By continuing, you agree to the Cirkle Covenant: $0, privacy-first, forever free.
        </motion.p>
      </div>
    </motion.div>
  );
}

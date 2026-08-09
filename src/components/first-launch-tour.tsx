"use client";

/**
 * First-Launch Tour — interactive, skippable, accessible walkthrough.
 *
 * Renders a step-based overlay covering 8 tabs + 4 flagship features.
 * Persists completion / skip state in localStorage under
 * `cirkle-onboarding-completed`. Uses Framer Motion for transitions,
 * `glass-strong` cards for tooltips, and a full focus trap + keyboard
 * navigation (Esc / ← / → / Enter / Tab cycle).
 *
 * Task ID: P0-3-ONBOARDING
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  MessageCircle,
  Play,
  Image as ImageIcon,
  Hash,
  Plane,
  Wallet,
  User,
  Shield,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { CircleMark } from "@/components/brand/circle-mark";
import type { TabId } from "@/lib/tabs";

export const TOUR_STORAGE_KEY = "cirkle-onboarding-completed";

type Accent = "gold" | "rose" | "teal" | "accent";
type StepIconKind =
  | "welcome"
  | "home"
  | "wasl"
  | "mashahd"
  | "lamahat"
  | "midan"
  | "rihla"
  | "pay"
  | "profile"
  | "shield"
  | "brain"
  | "done";

interface TourStep {
  id: string;
  /** Optional tab to switch to when this step is active. */
  tab?: TabId;
  icon: StepIconKind;
  accent: Accent;
  title: string;
  description: string;
  tip: string;
  /** Short label for screen-readers (without marketing flair). */
  srLabel: string;
}

const STEPS: TourStep[] = [
  {
    id: "welcome",
    icon: "welcome",
    accent: "gold",
    title: "Welcome to CIRKLE",
    description:
      "Your sovereign social platform — 8 apps in one circle. Ad-free, end-to-end encrypted, and built around your circles of trust.",
    tip: "Take the 60-second tour, or skip anytime. You can always restart it from Settings → Help.",
    srLabel: "Welcome to CIRKLE. Overview of the platform.",
  },
  {
    id: "home",
    tab: "home",
    icon: "home",
    accent: "gold",
    title: "Home Dashboard",
    description:
      "Your unified feed across all circles. Compose once, share anywhere. Trending topics and AI-curated insights live at the top.",
    tip: "Tap the gold + button to compose. Long-press any post to react with mood-based emojis.",
    srLabel: "Home Dashboard. Unified feed, composer, trending topics.",
  },
  {
    id: "wasl",
    tab: "wasl",
    icon: "wasl",
    accent: "teal",
    title: "Wasl — Chat",
    description:
      "End-to-end encrypted messaging with disappearing messages, voice notes, and group circles. No server ever sees your chats.",
    tip: "Swipe right on any chat to mute, archive, or pin. Tap the lock icon to verify keys.",
    srLabel: "Wasl chat. End-to-end encrypted messaging with privacy controls.",
  },
  {
    id: "mashahd",
    tab: "mashahd",
    icon: "mashahd",
    accent: "rose",
    title: "Mashahd — Video",
    description:
      "Ad-free video with peer-to-peer streaming. Creators keep 90% of revenue. Watch offline, share without tracking.",
    tip: "Tap any video to enter full-screen with chapters. Pull down for related reels.",
    srLabel: "Mashahd video. Ad-free, peer-to-peer streaming, offline viewing.",
  },
  {
    id: "lamahat",
    tab: "lamahat",
    icon: "lamahat",
    accent: "gold",
    title: "Lamahat — Photos",
    description:
      "Stories that disappear in 24h, permanent Moments, and shared Collections. AI organizes by place and people — locally.",
    tip: "Long-press a photo to add to a Collection. Swipe up on stories to reply privately.",
    srLabel: "Lamahat photos. Stories, moments, and shared collections.",
  },
  {
    id: "midan",
    tab: "midan",
    icon: "midan",
    accent: "accent",
    title: "Midan — Square",
    description:
      "Microblogging without the noise. 500-char posts, threaded debates, and built-in fact-checking. Your reach, your rules.",
    tip: "Tap the # icon in any post to follow a topic. Pull to refresh trending tags.",
    srLabel: "Midan square. Microblogging with fact-checking and threads.",
  },
  {
    id: "rihla",
    tab: "rihla",
    icon: "rihla",
    accent: "teal",
    title: "Rihla — Travel",
    description:
      "Destinations, deals, and itineraries curated by your circles. Visa explorer, local SIM guides, and offline maps built in.",
    tip: "Tap any destination card to see itineraries. Tap the plane icon to plan a trip with AI.",
    srLabel: "Rihla travel. Destinations, deals, visa explorer, offline maps.",
  },
  {
    id: "pay",
    tab: "pay",
    icon: "pay",
    accent: "gold",
    title: "Cirkle Pay — Payments",
    description:
      "0% fees, non-custodial. Send money to any contact instantly. Split receipts with circles. Stake and earn in EGP, SAR, AED.",
    tip: "Tap Scan to pay any QR code. Long-press a transaction to dispute or export receipt.",
    srLabel: "Cirkle Pay. Zero fees, non-custodial payments and receipts.",
  },
  {
    id: "profile",
    tab: "profile",
    icon: "profile",
    accent: "rose",
    title: "Your Profile",
    description:
      "Verified human badge, privacy shields, and full control over who sees what. Export or delete your data anytime.",
    tip: "Tap any badge to learn what it means. Tap the shield icon to audit your privacy settings.",
    srLabel: "Profile. Verified human badge, privacy shields, data controls.",
  },
  {
    id: "shield",
    icon: "shield",
    accent: "accent",
    title: "Citizen Shield",
    description:
      "Government accountability built in. Report issues, track resolutions, and see real-time service quality in your district.",
    tip: "Open from the dock or command palette (⌘K). Reports are pseudonymous by default.",
    srLabel: "Citizen Shield. Government accountability and issue tracking.",
  },
  {
    id: "brain",
    icon: "brain",
    accent: "teal",
    title: "Brain AI",
    description:
      "A 9-phase cognitive architecture running locally. Summarizes feeds, drafts replies, translates live, and learns your style.",
    tip: "Tap the floating AI orb anytime. Hold to speak. All processing stays on-device when possible.",
    srLabel: "Brain AI. 9-phase cognitive architecture with on-device processing.",
  },
  {
    id: "done",
    icon: "done",
    accent: "gold",
    title: "You're all set!",
    description:
      "You've completed the tour. CIRKLE is yours — explore freely, and remember: your data, your rules, your circle.",
    tip: "Replay this tour anytime from Settings → Help. Welcome aboard.",
    srLabel: "Tour complete. You are all set to use CIRKLE.",
  },
];

const ACCENT_TEXT: Record<Accent, string> = {
  gold: "text-gold",
  rose: "text-rose",
  teal: "text-teal",
  accent: "text-accent",
};

const ACCENT_GRADIENT: Record<Accent, string> = {
  gold: "from-gold/25 via-gold/10 to-transparent",
  rose: "from-rose/25 via-rose/10 to-transparent",
  teal: "from-teal/40 via-teal/15 to-transparent",
  accent: "from-accent/25 via-accent/10 to-transparent",
};

const ACCENT_GLOW: Record<Accent, string> = {
  gold: "hsl(var(--gold) / 0.45)",
  rose: "hsl(var(--rose) / 0.45)",
  teal: "hsl(var(--teal) / 0.55)",
  accent: "hsl(var(--accent) / 0.45)",
};

const ACCENT_DOT: Record<Accent, string> = {
  gold: "bg-gold",
  rose: "bg-rose",
  teal: "bg-teal",
  accent: "bg-accent",
};

// Static class strings (Tailwind JIT cannot see interpolation).
const ACCENT_TIP_BOX: Record<Accent, string> = {
  gold: "border-gold/20 bg-gold/5",
  rose: "border-rose/20 bg-rose/5",
  teal: "border-teal/20 bg-teal/5",
  accent: "border-accent/20 bg-accent/5",
};

const ICON_MAP: Record<StepIconKind, LucideIcon | "circle-mark"> = {
  welcome: "circle-mark",
  home: Home,
  wasl: MessageCircle,
  mashahd: Play,
  lamahat: ImageIcon,
  midan: Hash,
  rihla: Plane,
  pay: Wallet,
  profile: User,
  shield: Shield,
  brain: Brain,
  done: CheckCircle2,
};

function StepIcon({ kind, accent }: { kind: StepIconKind; accent: Accent }) {
  const Comp = ICON_MAP[kind];
  return (
    <div
      className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT[accent]} flex items-center justify-center ${ACCENT_TEXT[accent]} ring-1 ring-current/20`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-2xl opacity-30 blur-md" style={{ background: ACCENT_GLOW[accent] }} />
      {Comp === "circle-mark" ? (
        <CircleMark size={56} />
      ) : (
        <Comp className="w-10 h-10 relative" strokeWidth={1.5} />
      )}
    </div>
  );
}

interface FirstLaunchTourProps {
  /** When true, the tour overlay is rendered. */
  open: boolean;
  /** Called when the user finishes the tour (last step "Done"). */
  onComplete: () => void;
  /** Called when the user skips (any step). */
  onSkip: () => void;
  /** Optional: switch the active app tab when a step targets a tab. */
  onNavigateTab?: (tab: TabId) => void;
}

export function FirstLaunchTour({ open, onComplete, onSkip, onNavigateTab }: FirstLaunchTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Track previous `open` so we can reset step state when the tour is
  // (re)opened. This is the React-recommended "adjust state during render
  // when a prop changes" pattern (avoids setState-in-effect lint).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStepIndex(0);
      setDirection(1);
    }
  }
  const cardRef = useRef<HTMLDivElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();
  const liveRegionId = useId();

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  // Navigate to the step's tab when it changes (so the actual screen is
  // visible behind the spotlight during the tour).
  useEffect(() => {
    if (!open || !step.tab) return;
    onNavigateTab?.(step.tab);
  }, [open, step, onNavigateTab]);

  // Focus the primary CTA when the step changes.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      nextBtnRef.current?.focus();
    }, 80);
    return () => clearTimeout(t);
  }, [open, stepIndex]);

  // Lock background scroll while the tour is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete();
      return;
    }
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, [isLast, onComplete]);

  const goBack = useCallback(() => {
    if (isFirst) return;
    setDirection(-1);
    setStepIndex((i) => Math.max(i - 1, 0));
  }, [isFirst]);

  // Global keyboard navigation + focus trap.
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      // Escape → skip the entire tour.
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onSkip();
        return;
      }
      // ArrowRight / Enter → next.
      if (e.key === "ArrowRight" || (e.key === "Enter" && !e.shiftKey)) {
        // Don't hijack Enter when focus is on the Skip button (let it
        // activate naturally).
        const active = document.activeElement as HTMLElement | null;
        if (active?.dataset.tourRole === "skip") return;
        e.preventDefault();
        goNext();
        return;
      }
      // ArrowLeft → back.
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
        return;
      }
      // Focus trap: cycle Tab within the card.
      if (e.key === "Tab") {
        const card = cardRef.current;
        if (!card) return;
        const focusables = Array.from(
          card.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open, goNext, goBack, onSkip]);

  const cardVariants = useMemo(
    () => ({
      enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40, scale: 0.97 }),
      center: { opacity: 1, x: 0, scale: 1 },
      exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40, scale: 0.97 }),
    }),
    [],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="presentation"
        >
          {/* Dimmed backdrop — semi-transparent overlay with cutout via the
              card's own giant box-shadow (the card stays bright while the
              rest of the screen is dimmed). */}
          <div
            className="absolute inset-0 bg-charcoal/75 backdrop-blur-sm"
            aria-hidden="true"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Decorative animated glow behind the card matching the step's accent. */}
          <motion.div
            key={`glow-${step.id}`}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full blur-3xl opacity-40"
            style={{ background: ACCENT_GLOW[step.accent] }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.4, scale: 1 }}
            transition={{ duration: 0.6 }}
            aria-hidden="true"
          />

          {/* sr-only live region — announces step changes for screen readers. */}
          <div id={liveRegionId} className="sr-only" aria-live="polite" aria-atomic="true">
            {`Step ${stepIndex + 1} of ${STEPS.length}. ${step.srLabel}`}
          </div>

          {/* Tour card */}
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={step.id}
              ref={cardRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descId}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="glass-strong rounded-3xl w-full max-w-lg p-5 sm:p-7 relative overflow-hidden"
              style={{
                boxShadow: `0 0 0 100vmax hsl(var(--charcoal) / 0.55), 0 25px 60px -15px hsl(var(--charcoal) / 0.6), 0 0 80px -10px ${ACCENT_GLOW[step.accent]}`,
              }}
            >
              {/* Top progress bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-muted/40" aria-hidden="true">
                <motion.div
                  className={`h-full ${ACCENT_DOT[step.accent]}`}
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>

              {/* Header: step counter + skip */}
              <div className="flex items-center justify-between mb-4 pt-2">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-3.5 h-3.5 ${ACCENT_TEXT[step.accent]}`} aria-hidden="true" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Step {stepIndex + 1} of {STEPS.length}
                  </span>
                </div>
                <button
                  type="button"
                  data-tour-role="skip"
                  onClick={onSkip}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  aria-label="Skip tour"
                >
                  Skip
                  <X className="inline-block w-3 h-3 ml-1 -mt-0.5" aria-hidden="true" />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                <div className="flex-shrink-0 flex sm:block justify-center">
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <StepIcon kind={step.icon} accent={step.accent} />
                  </motion.div>
                </div>

                <div className="flex-1 min-w-0">
                  <h2
                    id={titleId}
                    className="font-display text-xl sm:text-2xl leading-tight text-foreground"
                  >
                    {step.title}
                  </h2>
                  <p
                    id={descId}
                    className="mt-2 text-sm sm:text-[0.95rem] leading-relaxed text-muted-foreground"
                  >
                    {step.description}
                  </p>
                  <div
                    className={`mt-3 rounded-xl border px-3 py-2 ${ACCENT_TIP_BOX[step.accent]}`}
                  >
                    <p className="text-xs leading-relaxed text-foreground/80">
                      <span className="font-semibold text-foreground/90">Tip: </span>
                      {step.tip}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress dots */}
              <div
                className="flex items-center gap-1.5 mt-5 flex-wrap"
                role="group"
                aria-label="Tour progress"
              >
                {STEPS.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setDirection(idx > stepIndex ? 1 : -1);
                      setStepIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                      idx === stepIndex
                        ? `w-6 ${ACCENT_DOT[s.accent]}`
                        : idx < stepIndex
                          ? "w-1.5 bg-foreground/40"
                          : "w-1.5 bg-foreground/15"
                    }`}
                    aria-label={`Go to step ${idx + 1}: ${s.srLabel}`}
                    aria-current={idx === stepIndex ? "step" : undefined}
                  />
                ))}
              </div>

              {/* Footer: Back / Next */}
              <div className="flex items-center justify-between gap-3 mt-5">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={isFirst}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  Back
                </button>

                <button
                  type="button"
                  ref={nextBtnRef}
                  onClick={goNext}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-gradient-hero text-cream text-sm font-medium shadow-float hover:shadow-glass hover:scale-[1.02] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={isLast ? "Finish tour" : "Next step"}
                >
                  {isLast ? "Get started" : "Next"}
                  {!isLast && <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                  {isLast && <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

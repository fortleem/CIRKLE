"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Cookie, ShieldCheck, ChevronDown, ChevronUp, Check, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  ALL_PURPOSES,
  CONSENT_VERSION,
  DEFAULT_CONSENT,
  PURPOSE_META,
  getConsent,
  hasRecordedConsent,
  setConsentBulk,
  type ConsentPurpose,
  type ConsentState,
} from "@/lib/consent";

/**
 * Cookie consent bottom-sheet. Shows on first visit (or whenever the policy
 * version bumps). User can Accept All, Reject All, or Customize per purpose.
 *
 * Persists choice in localStorage["cirkle-consent-v1"] (with version tag) so
 * future visits honour the choice. Re-shows when CONSENT_VERSION bumps.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  // SSR-safe defaults (only necessary on). Real values load after mount.
  const [draft, setDraft] = useState<ConsentState>({ ...DEFAULT_CONSENT });

  // After mount, check whether to show the banner.
  useEffect(() => {
    // Don't show during SSR or before the user has even seen the splash.
    if (typeof window === "undefined") return;
    // Defer so the banner doesn't fight the splash screen for first paint.
    const t = window.setTimeout(() => {
      // Re-show if (a) no consent recorded yet, OR (b) recorded at a different
      // version (the storage key changes when CONSENT_VERSION bumps, so the
      // old key reads as missing — effectively re-showing on policy changes).
      if (!hasRecordedConsent()) {
        // Seed draft with defaults so the customize view starts sensible.
        setDraft({ ...DEFAULT_CONSENT });
        setVisible(true);
      } else {
        // Hydrate draft from stored consent so re-opening the panel shows the
        // current choices. (Used when the user opens Customize from settings.)
        setDraft(getConsent());
      }
    }, 1500);
    return () => window.clearTimeout(t);
  }, []);

  // Allow other parts of the app (e.g. Profile → Privacy center) to re-open
  // the banner by dispatching a `circle:cookie-consent` event.
  useEffect(() => {
    const onReopen = () => {
      setDraft(getConsent());
      setCustomizeOpen(true);
      setVisible(true);
    };
    window.addEventListener("circle:cookie-consent", onReopen);
    return () => window.removeEventListener("circle:cookie-consent", onReopen);
  }, []);

  const acceptAll = () => {
    const all: ConsentState = ALL_PURPOSES.reduce((acc, p) => {
      acc[p] = true;
      return acc;
    }, {} as ConsentState);
    setConsentBulk(all);
    setVisible(false);
    setCustomizeOpen(false);
  };

  const rejectAll = () => {
    // Necessary is always on; everything else off.
    setConsentBulk({ ...DEFAULT_CONSENT });
    setVisible(false);
    setCustomizeOpen(false);
  };

  const saveCustomized = () => {
    setConsentBulk(draft);
    setVisible(false);
    setCustomizeOpen(false);
  };

  const togglePurpose = (p: ConsentPurpose, v: boolean) => {
    if (p === "necessary") return; // immutably granted
    setDraft((d) => ({ ...d, [p]: v }));
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          role="dialog"
          aria-modal="false"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-[230] px-3 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="mx-auto max-w-2xl rounded-t-3xl glass-strong shadow-float border border-border/60 overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-4 pb-2 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/40 flex items-center justify-center shrink-0">
                <Cookie className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg flex items-center gap-2">
                  Your privacy, your choice
                  <span className="text-[10px] font-mono text-muted-foreground/70 px-1.5 py-0.5 rounded bg-muted/60">
                    v{CONSENT_VERSION}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Cirkle only loads non-essential cookies and AI features with your
                  permission. You can change these any time in Settings → Privacy.
                </p>
              </div>
              <button
                onClick={() => setVisible(false)}
                className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
                aria-label="Dismiss for now"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick actions */}
            {!customizeOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-5 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                <button
                  onClick={acceptAll}
                  className="rounded-full bg-gradient-gold text-charcoal py-2.5 text-sm font-medium hover:shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Accept all
                </button>
                <button
                  onClick={rejectAll}
                  className="rounded-full glass border border-border/60 py-2.5 text-sm hover:bg-muted/50 transition"
                >
                  Reject all
                </button>
                <button
                  onClick={() => setCustomizeOpen(true)}
                  className="rounded-full glass border border-border/60 py-2.5 text-sm hover:bg-muted/50 transition flex items-center justify-center gap-1.5"
                >
                  Customize
                  <ChevronUp className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Customize panel */}
            <AnimatePresence initial={false}>
              {customizeOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-2 pt-1 max-h-[40vh] overflow-y-auto">
                    {ALL_PURPOSES.map((p) => {
                      const meta = PURPOSE_META[p];
                      const required = p === "necessary";
                      const checked = !!draft[p];
                      return (
                        <div
                          key={p}
                          className="py-2.5 border-b border-border/40 last:border-0 flex items-start gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium flex items-center gap-1.5">
                              {meta.title}
                              {required && (
                                <span className="text-[9px] uppercase tracking-widest text-secondary/80 px-1.5 py-0.5 rounded bg-secondary/15">
                                  Always on
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {meta.description}
                            </div>
                          </div>
                          <Switch
                            checked={checked}
                            disabled={required}
                            onCheckedChange={(v) => togglePurpose(p, v)}
                            aria-label={`Toggle ${meta.title}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-5 pb-4 pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={saveCustomized}
                      className="flex-1 rounded-full bg-gradient-gold text-charcoal py-2.5 text-sm font-medium hover:shadow-lg transition flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Save my preferences
                    </button>
                    <button
                      onClick={() => setCustomizeOpen(false)}
                      className="sm:px-4 rounded-full glass border border-border/60 py-2.5 text-sm hover:bg-muted/50 transition flex items-center justify-center gap-1"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Collapse
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="px-5 pb-3 pt-1 border-t border-border/40 bg-background/30">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Strictly Necessary cookies (auth, security) cannot be disabled.
                See our{" "}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("circle:privacy-policy"))}
                  className="text-secondary underline underline-offset-2 hover:text-secondary/80"
                >
                  Privacy Policy
                </button>{" "}
                for details.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Convenience hook used by the settings panel to re-open the banner. */
export function reopenCookieConsent() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("circle:cookie-consent"));
}

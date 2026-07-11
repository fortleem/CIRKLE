"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, FileText, Loader2, Check, AlertCircle, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

type DSRType = "access" | "correction" | "deletion" | "portability" | "objection";

interface DSRMeta {
  label: string;
  blurb: string;
}

const TYPE_META: Record<DSRType, DSRMeta> = {
  access: {
    label: "Access",
    blurb: "Receive a copy of all personal data we hold about you.",
  },
  correction: {
    label: "Correction",
    blurb: "Fix inaccurate or incomplete personal data.",
  },
  deletion: {
    label: "Deletion",
    blurb: "Permanently erase your account and all associated data (right to be forgotten).",
  },
  portability: {
    label: "Portability",
    blurb: "Receive your data in a structured, machine-readable JSON format.",
  },
  objection: {
    label: "Objection",
    blurb: "Object to processing based on legitimate interests or for direct marketing.",
  },
};

const TYPES: DSRType[] = ["access", "correction", "deletion", "portability", "objection"];

export function DSRRequest({ open, onClose }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<DSRType>("access");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!user?.username) {
      setError("You must be signed in to submit a data request.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/dsr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          type,
          details: details.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Request failed.");
      }
      setSubmitted({ id: data.id as string });
      toast.success("Request submitted", {
        description: `Reference ${data.id}. Our DPO will respond within 30 days.`,
      });
    } catch (err) {
      const msg = String((err as Error)?.message || err || "Submission failed.");
      setError(msg);
      toast.error("Couldn't submit request", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    setSubmitted(null);
    setDetails("");
    setType("access");
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[200]"
            style={{ background: "hsl(var(--charcoal) / 0.6)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog"
            aria-modal="true"
            aria-label="Submit a data subject request"
            className="fixed inset-x-0 bottom-0 top-[8vh] z-[210] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/40 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Data Subject Request</div>
                <div className="text-[11px] text-muted-foreground">
                  GDPR Art. 15–21 · PDPL · CCPA · Response within 30 days
                </div>
              </div>
              <button
                onClick={close}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center space-y-3"
                >
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h3 className="font-display text-xl">Request received</h3>
                  <p className="text-sm text-muted-foreground">
                    Your <b>{TYPE_META[type].label}</b> request has been logged. Our Data Protection
                    Officer will respond within 30 days via in-app notification and your recovery email
                    (if provided).
                  </p>
                  <div className="rounded-xl bg-background/60 border border-border p-3 font-mono text-xs break-all">
                    Reference: {submitted.id}
                  </div>
                  <button
                    onClick={close}
                    className="mt-2 w-full py-3 rounded-full bg-gradient-gold text-charcoal font-medium text-sm hover:shadow-lg transition"
                  >
                    Done
                  </button>
                </motion.div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-4">
                    Submit a formal data request under GDPR, PDPL, or CCPA. Our DPO will
                    respond within 30 days. For urgent matters, email{" "}
                    <span className="font-mono text-secondary">dpo@cirkle.app</span>.
                  </p>

                  {/* Request type */}
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    Request type
                  </div>
                  <div className="space-y-2 mb-5">
                    {TYPES.map((t) => {
                      const selected = t === type;
                      return (
                        <button
                          key={t}
                          onClick={() => setType(t)}
                          className={cn(
                            "w-full text-start rounded-xl border p-3 transition flex items-start gap-3",
                            selected
                              ? "border-secondary/60 bg-secondary/10"
                              : "border-border/60 bg-card/60 hover:bg-muted/40",
                          )}
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center",
                              selected ? "border-secondary bg-secondary" : "border-muted-foreground/40",
                            )}
                          >
                            {selected && <Check className="w-3 h-3 text-background" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{TYPE_META[t].label}</div>
                            <div className="text-xs text-muted-foreground">{TYPE_META[t].blurb}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Details */}
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    Details <span className="text-muted-foreground/60 normal-case">(optional)</span>
                  </div>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={4}
                    placeholder={
                      type === "correction"
                        ? "What needs correcting? E.g. 'My display name is misspelled.'"
                        : type === "deletion"
                          ? "Reason for deletion (helps us improve). E.g. 'No longer using Cirkle.'"
                          : type === "objection"
                            ? "What processing do you object to and why?"
                            : "Anything we should know to fulfil your request?"
                    }
                    className="w-full rounded-xl bg-card/60 border border-border/70 px-3 py-2.5 text-sm outline-none focus:border-secondary/60 focus:shadow-[0_0_0_3px_hsl(var(--secondary)/0.18)] transition resize-none"
                  />

                  {error && (
                    <div className="mt-3 rounded-xl bg-accent/10 border border-accent/40 p-3 text-xs text-accent flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="mt-5 w-full py-3 rounded-full bg-gradient-gold text-charcoal font-medium text-sm hover:shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit request
                      </>
                    )}
                  </button>

                  <p className="mt-3 text-[10px] text-muted-foreground text-center leading-relaxed">
                    By submitting, you authorize Cirkle to process this request under applicable data
                    protection law. False requests may result in account restrictions.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

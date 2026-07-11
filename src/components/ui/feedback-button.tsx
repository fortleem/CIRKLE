"use client";

import { useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * `<FeedbackButton>` — a small "Feedback" pill rendered next to an overlay's
 * Close button. Clicking opens a modal that posts the user's message to
 * `/api/feedback` (R10). Identifies the overlay via `overlayName` so the
 * backend can route/triage feedback per surface.
 */
export function FeedbackButton({ overlayName }: { overlayName: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overlay: overlayName, message: msg.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Feedback sent — thank you!");
      setMsg("");
      setOpen(false);
    } catch {
      toast.error("Could not send feedback", { description: "Please try again later." });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1.5 rounded-full hover:bg-muted/40 flex items-center gap-1 text-muted-foreground transition shrink-0"
        aria-label={`Send feedback for ${overlayName}`}
      >
        <MessageSquare className="w-3 h-3" /> Feedback
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[200] bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !sending && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Feedback for ${overlayName}`}
        >
          <div
            className="glass-strong rounded-3xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg mb-1">Feedback for {overlayName}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              What went wrong? What could be better?
            </p>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Tell us anything…"
              rows={4}
              className="w-full glass rounded-xl p-3 text-sm outline-none mb-3 resize-none focus:ring-1 focus:ring-primary/40"
              aria-label="Feedback message"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={sending}
                className="flex-1 py-2 rounded-xl glass text-sm hover:bg-muted/40 transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!msg.trim() || sending}
                className="flex-1 py-2 rounded-xl bg-gradient-gold text-charcoal text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-60 transition"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…
                  </>
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

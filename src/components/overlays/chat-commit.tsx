// @ts-nocheck
"use client";

/**
 * ChatCommitSheet — Commit-in-chat with AI auto-detection + email sending.
 * ============================================================================
 * Opens from the Wasl composer "Commit" button. Three-step flow:
 *
 *  1) AI auto-detect: take the last N messages (or the long-pressed
 *     selected message) and POST to /api/commit/detect. Show detected type
 *     badge + confidence + rationale + extracted fields. Editable "Commit
 *     Title" (auto-filled from first few words) + "Commit Description"
 *     (auto-filled with original text).
 *
 *  2) Email confirmation (optional): "Send formal confirmation email"
 *     checkbox. If checked:
 *       - For personal chats: show "Recipient email" input.
 *       - For institution chats: auto-detect company emails from
 *         /api/institutions?founderHandle=… and show dropdowns for both
 *         sender and receiver.
 *
 *  3) Send: if email checked, POST to /api/commit/send-email with the full
 *     payload (including isFromInstitution, senderEmail, receiverEmail).
 *     Show success toast. Dispatch `circle:cirkle-commit` to optionally open
 *     the Commit overlay.
 *
 * Mobile: full-width Sheet (side="bottom"). Desktop: max-w-lg (side="right").
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShieldCheck,
  Gavel,
  Sparkles,
  Loader2,
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Coins,
  Package,
  Users,
  Clock,
  FileText,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror /api/commit/detect response (see /lib/commit-detection.ts)
// ─────────────────────────────────────────────────────────────────────────────

type CommitDetectedType = "price" | "commodity" | "agreement" | "all";

interface CommitDetection {
  type: CommitDetectedType;
  detectedTypes: CommitDetectedType[];
  amount?: number;
  currency?: string;
  commodity?: string;
  quantity?: string;
  parties: string[];
  deadline?: string;
  keyTerms: string[];
  confidence: number;
  rationale: string;
}

interface InstitutionEmail {
  id: string;
  name: string;
  handle: string;
  emails: string[];
  verificationStatus?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MESSAGE_BATCH_FOR_DETECTION = 12;

const TYPE_META: Record<
  CommitDetectedType,
  { label: string; className: string; emoji: string }
> = {
  price: {
    label: "Price",
    className:
      "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    emoji: "💰",
  },
  commodity: {
    label: "Commodity",
    className:
      "bg-amber-500/15 text-amber-300 border-amber-500/30",
    emoji: "📦",
  },
  agreement: {
    label: "Agreement",
    className:
      "bg-sky-500/15 text-sky-300 border-sky-500/30",
    emoji: "🤝",
  },
  all: {
    label: "All",
    className:
      "bg-purple-500/15 text-purple-300 border-purple-500/30",
    emoji: "✨",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a single text blob from the last N messages (or a selected one). */
function buildCommitText(
  messages: Array<{ body: string; senderName?: string; timestamp?: string }>,
  selected?: { body: string; senderName?: string } | null,
): { text: string; senderName?: string; recipientName?: string } {
  if (selected && selected.body) {
    return {
      text: selected.body,
      senderName: selected.senderName,
    };
  }
  const last = messages.slice(-MESSAGE_BATCH_FOR_DETECTION);
  const text = last
    .map((m) => {
      const name = m.senderName ? `${m.senderName}: ` : "";
      return `${name}${m.body || ""}`;
    })
    .join("\n");
  // Sender = first message author; recipient = first DIFFERENT author.
  const senderName = last[0]?.senderName;
  let recipientName: string | undefined;
  for (const m of last) {
    if (m.senderName && m.senderName !== senderName) {
      recipientName = m.senderName;
      break;
    }
  }
  return { text, senderName, recipientName };
}

/** Auto-fill the commit title from the first few words of the text. */
function deriveTitle(text: string): string {
  const clean = (text || "").trim().replace(/\s+/g, " ");
  if (!clean) return "Chat Commit";
  const words = clean.split(" ").slice(0, 6).join(" ");
  return words.length > 60 ? words.slice(0, 57) + "…" : words;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatCommitMessage {
  id: string;
  body: string;
  senderName?: string;
  senderId?: string;
  timestamp?: string;
}

interface ChatCommitSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Conversation name (used for toast). */
  conversationName: string;
  /** Conversation type — drives email field rendering. */
  conversationType: "direct" | "group" | "channel";
  /** All loaded messages — we take the last N for detection. */
  messages: ChatCommitMessage[];
  /** If the user long-pressed a specific message, that message is committed
   * alone instead of the last N. */
  selectedMessage?: ChatCommitMessage | null;
  /** Current user's display name (sender). */
  meName: string;
  /** Current user's circle handle (e.g. "@yousef:circle.app") — used to fetch
   * their registered institutions. */
  meCircleId?: string;
  /** Current user's recovery email (default for sender email if no
   * institutions are registered). */
  meEmail?: string;
}

export function ChatCommitSheet({
  open,
  onOpenChange,
  conversationName,
  conversationType,
  messages,
  selectedMessage,
  meName,
  meCircleId,
  meEmail,
}: ChatCommitSheetProps) {
  // ── Detection state ──
  const [detection, setDetection] = useState<CommitDetection | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  // ── Editable fields ──
  const [commitTitle, setCommitTitle] = useState("");
  const [commitDescription, setCommitDescription] = useState("");
  const [sourceText, setSourceText] = useState("");

  // ── Email confirmation state ──
  const [sendEmail, setSendEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [institutions, setInstitutions] = useState<InstitutionEmail[]>([]);
  const [isFromInstitution, setIsFromInstitution] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  // ── Send state ──
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const detectSeqRef = useRef(0);

  // ── Step 1: run detection on open ──
  const runDetection = useCallback(async () => {
    const seq = ++detectSeqRef.current;
    setDetecting(true);
    setDetectError(null);
    setSent(false);

    const { text, senderName, recipientName } = buildCommitText(
      messages,
      selectedMessage,
    );
    setSourceText(text);
    setCommitTitle(deriveTitle(text));
    setCommitDescription(text.slice(0, 800));

    if (!text.trim()) {
      setDetecting(false);
      setDetectError("No message content to analyze.");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const r = await fetch("/api/commit/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          senderName: senderName ?? meName,
          recipientName,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (seq !== detectSeqRef.current) return;

      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${r.status}`);
      }

      const json = (await r.json()) as CommitDetection;
      if (seq !== detectSeqRef.current) return;
      setDetection(json);
    } catch (err) {
      if (seq !== detectSeqRef.current) return;
      if ((err as Error).name === "AbortError") {
        setDetectError("Detection timed out. Please try again.");
      } else {
        setDetectError(
          (err as Error).message || "Failed to analyze the conversation.",
        );
      }
    } finally {
      clearTimeout(timeout);
      if (seq === detectSeqRef.current) setDetecting(false);
    }
  }, [messages, selectedMessage, meName]);

  // Trigger detection when the sheet opens.
  useEffect(() => {
    if (!open) return;
    void runDetection();
  }, [open, runDetection]);

  // Reset all state when the sheet closes.
  const handleClose = useCallback(
    (next: boolean) => {
      if (next) return;
      onOpenChange(false);
      // Defer reset so the close animation doesn't flash empty content.
      setTimeout(() => {
        setDetection(null);
        setDetectError(null);
        setCommitTitle("");
        setCommitDescription("");
        setSendEmail(false);
        setRecipientEmail("");
        setSenderEmail("");
        setIsFromInstitution(false);
        setSent(false);
      }, 300);
    },
    [onOpenChange],
  );

  // ── Fetch my registered institutions (for sender email dropdown) ──
  useEffect(() => {
    if (!open || !sendEmail || !meCircleId) return;
    let cancelled = false;
    setLoadingInstitutions(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    (async () => {
      try {
        const r = await fetch(
          `/api/institutions?founderHandle=${encodeURIComponent(meCircleId)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (cancelled) return;
        if (!r.ok) return;
        const json = await r.json();
        if (cancelled) return;
        const list: InstitutionEmail[] = (json?.institutions ?? []).filter(
          (i: InstitutionEmail) =>
            Array.isArray(i.emails) && i.emails.length > 0,
        );
        setInstitutions(list);
        // Default sender email: first institution's first email (if any),
        // otherwise the user's recovery email.
        if (list.length > 0) {
          const firstEmail = list[0].emails[0];
          setSenderEmail(firstEmail);
          setIsFromInstitution(true);
        } else if (meEmail) {
          setSenderEmail(meEmail);
        }
      } catch {
        /* no-op — institutions are optional */
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoadingInstitutions(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, sendEmail, meCircleId, meEmail]);

  // ── Step 3: send ──
  const handleSend = useCallback(async () => {
    if (!detection) return;
    if (!commitTitle.trim()) {
      toast.error("Please add a commit title");
      return;
    }
    if (sendEmail && !recipientEmail.trim()) {
      toast.error("Please enter a recipient email");
      return;
    }
    if (sendEmail && !senderEmail.trim()) {
      toast.error("Please enter a sender email");
      return;
    }

    setSending(true);

    // Always dispatch the commit event so the Commit overlay opens (local
    // confirmation step). This makes the commit visible in the Commit list.
    const parties = (detection.parties ?? []).map((name, i) => ({
      name: name || (i === 0 ? meName : conversationName),
      role: i === 0 ? "initiator" : "counterparty",
    }));
    // Ensure at least 2 parties (sender + recipient).
    if (parties.length < 2) {
      parties.length = 0;
      parties.push({ name: meName, role: "initiator" });
      parties.push({ name: conversationName, role: "counterparty" });
    }

    // If email is checked, call /api/commit/send-email.
    if (sendEmail) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const r = await fetch("/api/commit/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipientEmail,
            toName: conversationName,
            commitTitle: commitTitle.trim(),
            commitDescription: commitDescription.trim() || sourceText,
            commitType: detection.type,
            parties,
            amount: detection.amount,
            currency: detection.currency,
            deadline: detection.deadline,
            conditions: detection.keyTerms,
            isFromInstitution,
            senderEmail,
            receiverEmail: recipientEmail,
          }),
          signal: controller.signal,
          cache: "no-store",
        });

        clearTimeout(timeout);

        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${r.status}`);
        }

        const result = await r.json();
        toast.success("Commit created!", {
          description: `Email sent to ${recipientEmail}`,
          action: {
            label: "View",
            onClick: () =>
              window.dispatchEvent(
                new CustomEvent("circle:cirkle-commit"),
              ),
          },
        });
        setSent(true);
        // Open the Commit overlay as a follow-up.
        window.dispatchEvent(new CustomEvent("circle:cirkle-commit"));
      } catch (err) {
        clearTimeout(timeout);
        if ((err as Error).name === "AbortError") {
          toast.error("Email send timed out. Please try again.");
        } else {
          toast.error("Failed to send commit email", {
            description: (err as Error).message,
          });
        }
        setSending(false);
        return;
      }
    } else {
      // No email — just confirm locally + open the Commit overlay.
      toast.success("Commit created!", {
        description: commitTitle.trim(),
        action: {
          label: "View",
          onClick: () =>
            window.dispatchEvent(new CustomEvent("circle:cirkle-commit")),
        },
      });
      setSent(true);
      window.dispatchEvent(new CustomEvent("circle:cirkle-commit"));
    }

    setSending(false);
  }, [
    detection,
    commitTitle,
    commitDescription,
    sourceText,
    sendEmail,
    recipientEmail,
    senderEmail,
    isFromInstitution,
    meName,
    conversationName,
  ]);

  // ── Render ──
  const typeMeta = detection ? TYPE_META[detection.type] : null;
  const isGroupChat = conversationType === "group" || conversationType === "channel";

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col"
        aria-label="Create commit"
        role="dialog"
      >
        <SheetHeader>
          <SheetTitle className="font-display text-2xl flex items-center gap-2">
            <Gavel className="w-5 h-5 text-secondary" />
            Create Commit
          </SheetTitle>
          <SheetDescription>
            AI will analyze the conversation and draft a formal commitment.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* Source preview */}
          <section>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
              {selectedMessage ? "Selected message" : `Last ${Math.min(
                MESSAGE_BATCH_FOR_DETECTION,
                messages.length,
              )} messages`}
            </Label>
            <div className="glass rounded-xl p-3 text-xs text-muted-foreground max-h-24 overflow-y-auto whitespace-pre-wrap break-words">
              {sourceText || "—"}
            </div>
          </section>

          {/* Step 1: Detection */}
          {detecting && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="w-8 h-8 text-secondary animate-spin mb-3" />
              <p className="text-sm font-medium">
                AI is analyzing the conversation…
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Detecting commit type, parties, and key terms
              </p>
            </div>
          )}

          {!detecting && detectError && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6 text-accent" />
              </div>
              <p className="text-sm font-medium">{detectError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runDetection()}
                className="mt-3 h-8"
              >
                Retry detection
              </Button>
            </div>
          )}

          {!detecting && !detectError && detection && typeMeta && (
            <>
              {/* Detection result */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${typeMeta.className} text-xs gap-1 px-2 py-1`}>
                    <span>{typeMeta.emoji}</span>
                    {typeMeta.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(detection.confidence * 100)}% confidence
                  </span>
                </div>

                {detection.rationale && (
                  <div className="glass rounded-xl p-3 text-xs leading-relaxed">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-secondary" />
                      AI rationale
                    </div>
                    {detection.rationale}
                  </div>
                )}

                {/* Extracted fields grid */}
                <div className="grid grid-cols-2 gap-2">
                  {typeof detection.amount === "number" && (
                    <ExtractedField
                      icon={<Coins className="w-3.5 h-3.5" />}
                      label="Amount"
                      value={`${detection.amount.toLocaleString()} ${
                        detection.currency || ""
                      }`.trim()}
                      accent="emerald"
                    />
                  )}
                  {detection.commodity && (
                    <ExtractedField
                      icon={<Package className="w-3.5 h-3.5" />}
                      label="Commodity"
                      value={detection.commodity}
                      accent="amber"
                    />
                  )}
                  {detection.quantity && (
                    <ExtractedField
                      icon={<Package className="w-3.5 h-3.5" />}
                      label="Quantity"
                      value={detection.quantity}
                      accent="amber"
                    />
                  )}
                  {detection.deadline && (
                    <ExtractedField
                      icon={<Clock className="w-3.5 h-3.5" />}
                      label="Deadline"
                      value={detection.deadline}
                      accent="rose"
                    />
                  )}
                </div>

                {/* Parties */}
                {detection.parties.length > 0 && (
                  <div className="glass rounded-xl p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Parties
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {detection.parties.map((p, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs"
                        >
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key terms */}
                {detection.keyTerms.length > 0 && (
                  <div className="glass rounded-xl p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Key terms
                    </div>
                    <ul className="space-y-1">
                      {detection.keyTerms.map((term, i) => (
                        <li
                          key={i}
                          className="text-xs text-foreground/85 flex items-start gap-1.5"
                        >
                          <span className="w-1 h-1 rounded-full bg-secondary mt-1.5 shrink-0" />
                          <span>{term}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {/* Editable commit fields */}
              <section className="space-y-3">
                <h4 className="text-xs uppercase tracking-widest text-muted-foreground">
                  Commit details
                </h4>
                <div className="space-y-1.5">
                  <Label htmlFor="commit-title">Commit title</Label>
                  <Input
                    id="commit-title"
                    value={commitTitle}
                    onChange={(e) => setCommitTitle(e.target.value)}
                    placeholder="e.g. Laptop sale agreement"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="commit-desc">Commit description</Label>
                  <Textarea
                    id="commit-desc"
                    value={commitDescription}
                    onChange={(e) => setCommitDescription(e.target.value)}
                    placeholder="Describe the agreement terms…"
                    rows={4}
                  />
                </div>
              </section>

              {/* Step 2: Email confirmation */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3 glass rounded-xl p-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Mail className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        Send formal confirmation email
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Optional — Cirkle Brain AI will draft a formal email.
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={sendEmail}
                    onCheckedChange={setSendEmail}
                    aria-label="Send formal confirmation email"
                  />
                </div>

                {sendEmail && (
                  <div className="space-y-3 pl-1">
                    {/* Sender email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="sender-email">
                        Sender email
                        {isFromInstitution && (
                          <Badge
                            variant="outline"
                            className="ml-2 text-[10px] h-4 px-1"
                          >
                            Institution
                          </Badge>
                        )}
                      </Label>
                      {institutions.length > 0 ? (
                        <select
                          id="sender-email"
                          value={senderEmail}
                          onChange={(e) => {
                            setSenderEmail(e.target.value);
                            // If the chosen email belongs to an institution,
                            // mark isFromInstitution = true.
                            const belongs = institutions.some((inst) =>
                              inst.emails.includes(e.target.value),
                            );
                            setIsFromInstitution(belongs);
                          }}
                          className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                        >
                          {institutions.flatMap((inst) =>
                            inst.emails.map((email) => (
                              <option key={email} value={email}>
                                {email} · {inst.name}
                              </option>
                            )),
                          )}
                          {meEmail &&
                            !institutions.some((inst) =>
                              inst.emails.includes(meEmail),
                            ) && (
                              <option value={meEmail}>
                                {meEmail} · (personal)
                              </option>
                            )}
                        </select>
                      ) : (
                        <Input
                          id="sender-email"
                          type="email"
                          value={senderEmail}
                          onChange={(e) => {
                            setSenderEmail(e.target.value);
                            setIsFromInstitution(false);
                          }}
                          placeholder="your@email.com"
                        />
                      )}
                      {loadingInstitutions && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          Loading your institutions…
                        </div>
                      )}
                    </div>

                    {/* Recipient email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="recipient-email">
                        Recipient email
                      </Label>
                      <Input
                        id="recipient-email"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) =>
                          setRecipientEmail(e.target.value)
                        }
                        placeholder={
                          isGroupChat
                            ? "recipient@company.com"
                            : "recipient@email.com"
                        }
                      />
                      <p className="text-[10px] text-muted-foreground">
                        A formal confirmation will be sent to this address.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Success state */}
              {sent && (
                <div className="flex flex-col items-center justify-center py-8 text-center glass rounded-2xl">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-medium">
                    {sendEmail
                      ? "Commit created! Email sent."
                      : "Commit created!"}
                  </p>
                  {sendEmail && recipientEmail && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Confirmation sent to {recipientEmail}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("circle:cirkle-commit"),
                      )
                    }
                    className="mt-3 h-8 gap-1"
                  >
                    Open Commit overlay
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <SheetFooter className="border-t border-border pt-3">
          <div className="flex gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => handleClose(false)}
              className="flex-1"
              disabled={sending}
            >
              {sent ? "Close" : "Cancel"}
            </Button>
            {!sent && detection && (
              <Button
                onClick={handleSend}
                disabled={sending || !commitTitle.trim()}
                className="flex-1 gap-1.5"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {sendEmail ? "Send Commit" : "Create Commit"}
                  </>
                )}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ExtractedField({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "emerald" | "amber" | "rose" | "secondary";
}) {
  const accentMap: Record<string, string> = {
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    secondary: "text-secondary",
  };
  return (
    <div className="glass rounded-xl p-2.5">
      <div
        className={`text-[10px] uppercase tracking-widest flex items-center gap-1 ${
          accentMap[accent] ?? "text-muted-foreground"
        }`}
      >
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium mt-0.5 truncate" title={value}>
        {value}
      </div>
    </div>
  );
}

export default ChatCommitSheet;

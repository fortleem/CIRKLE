"use client";

/**
 * Circle Mail overlay — Blueprint §20 (@cirkle.app email client).
 *
 * Layout:
 *   • Sidebar: Inbox / Sent / Drafts / Trash + Compose button
 *   • Message list: sender, subject, preview, time, read/unread dot
 *   • Message view: full subject, sender, body, AI triage button
 *   • Star + delete (trash) actions per message
 *   • AI triage: "Summarize this email" calls /api/ai/summarize
 *
 * Open via the `circle:circle-mail` event (registered in page.tsx +
 * overlay-registry.ts).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Mail as MailIcon,
  Inbox as InboxIcon,
  Send as SendIcon,
  FileText,
  Trash2,
  Star,
  StarOff,
  PenSquare,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  MailOpen,
  Mail as MailUnread,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { FeedbackButton } from "@/components/ui/feedback-button";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MailMessage {
  id: string;
  toUsername: string;
  fromUsername: string;
  fromEmail: string;
  subject: string;
  body: string;
  read: boolean;
  starred: boolean;
  folder: string;
  createdAt: string;
}

type Folder = "inbox" | "sent" | "draft" | "trash";

const FOLDERS: { id: Folder; label: string; icon: LucideIcon }[] = [
  { id: "inbox", label: "Inbox", icon: InboxIcon },
  { id: "sent", label: "Sent", icon: SendIcon },
  { id: "draft", label: "Drafts", icon: FileText },
  { id: "trash", label: "Trash", icon: Trash2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CircleMail({ open, onClose }: Props) {
  const { user } = useAuth();
  const username = user?.username || "guest";
  const emailAddress = useMemo(() => `${username}@cirkle.app`, [username]);

  const [folder, setFolder] = useState<Folder>("inbox");
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MailMessage | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  // ── Fetch folder ──────────────────────────────────────────────────────────
  const fetchFolder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/mail/inbox?username=${encodeURIComponent(username)}&folder=${folder}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { messages?: MailMessage[] };
      setMessages(data.messages || []);
    } catch (e) {
      const msg = String((e as Error).message || e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [username, folder]);

  useEffect(() => {
    if (!open) return;
    void fetchFolder();
  }, [open, fetchFolder]);

  // Reset selection when the folder changes.
  useEffect(() => {
    setSelected(null);
    setSummary(null);
  }, [folder]);

  const unreadCount = useMemo(
    () => messages.filter((m) => !m.read).length,
    [messages],
  );

  const openMessage = useCallback(
    async (m: MailMessage) => {
      setSelected(m);
      setSummary(null);
      // Mark as read on the server if not already.
      if (!m.read) {
        try {
          await fetch(`/api/mail/${m.id}/read`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ read: true }),
          });
          setMessages((prev) =>
            prev.map((x) => (x.id === m.id ? { ...x, read: true } : x)),
          );
          setSelected({ ...m, read: true });
        } catch {
          /* best-effort — the local state still updates */
        }
      }
    },
    [],
  );

  const toggleStar = useCallback(async (m: MailMessage) => {
    try {
      const res = await fetch(`/api/mail/${m.id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "star" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { message: MailMessage };
      const updated = data.message;
      setMessages((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x)),
      );
      setSelected((prev) => (prev?.id === updated.id ? updated : prev));
    } catch (e) {
      toast.error("Couldn't update star", {
        description: String((e as Error).message || e),
      });
    }
  }, []);

  const trashMessage = useCallback(
    async (m: MailMessage) => {
      try {
        const res = await fetch(`/api/mail/${m.id}/read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "trash" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { message: MailMessage };
        // If we trashed a message from the inbox, remove it locally. If we
        // restored from trash, the next fetch will pick it up.
        if (folder === "inbox" && data.message.folder === "trash") {
          setMessages((prev) => prev.filter((x) => x.id !== m.id));
        } else if (folder === "trash" && data.message.folder === "inbox") {
          setMessages((prev) => prev.filter((x) => x.id !== m.id));
        } else {
          setMessages((prev) =>
            prev.map((x) => (x.id === data.message.id ? data.message : x)),
          );
        }
        setSelected(null);
        toast.success(
          data.message.folder === "trash" ? "Moved to trash" : "Restored",
        );
      } catch (e) {
        toast.error("Couldn't trash message", {
          description: String((e as Error).message || e),
        });
      }
    },
    [folder],
  );

  // ── AI triage ──────────────────────────────────────────────────────────────
  const summarize = useCallback(async () => {
    if (!selected) return;
    setSummarizing(true);
    setSummary(null);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${selected.subject}\n\n${selected.body}` }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { summary?: string };
      setSummary(data.summary || "No summary available.");
    } catch (e) {
      setSummary("Couldn't summarize this email right now.");
      toast.error("AI triage failed", {
        description: String((e as Error).message || e),
      });
    } finally {
      setSummarizing(false);
    }
  }, [selected]);

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Cirkle Mail — @cirkle.app email client"
    >
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 backdrop-blur-xl bg-background/80 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/15 border border-border/40 flex items-center justify-center shrink-0">
            <MailIcon className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight">Cirkle Mail</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              <span className="font-mono">{emailAddress}</span> · AI triage · on-device privacy
            </p>
          </div>
          <button
            onClick={fetchFolder}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <FeedbackButton overlayName="Circle Mail" />
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body — two-pane layout on desktop, single-pane on mobile */}
      <div className="flex-1 overflow-hidden max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] lg:grid-cols-[220px_360px_1fr] h-full">
          {/* Sidebar */}
          <aside className="border-b sm:border-b-0 sm:border-r border-border/60 p-3 space-y-1 sm:max-h-[calc(100vh-120px)] sm:overflow-y-auto">
            <Button
              className="w-full justify-start mb-2"
              onClick={() => setComposerOpen(true)}
            >
              <PenSquare className="w-4 h-4 mr-1" />
              Compose
            </Button>
            {FOLDERS.map((f) => {
              const Icon = f.icon;
              const active = folder === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFolder(f.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition",
                    active
                      ? "bg-primary/15 border border-primary/30 text-primary"
                      : "hover:bg-muted/60 border border-transparent",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{f.label}</span>
                  {f.id === "inbox" && unreadCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-accent-foreground">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="mt-4 p-3 rounded-xl border border-border/40 bg-muted/30 text-[11px] text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Free @cirkle.app</p>
              <p>
                Every Cirkle user gets a free internal email address. Messages
                never leave the Cirkle network — no SMTP, no third parties.
              </p>
            </div>
          </aside>

          {/* Message list */}
          <section className="border-b sm:border-b-0 lg:border-r border-border/60 sm:max-h-[calc(100vh-120px)] sm:overflow-y-auto">
            {error && (
              <div className="m-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Couldn&apos;t load {folder}.</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">{error}</p>
                </div>
              </div>
            )}
            {loading && messages.length === 0 && (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            )}
            {!loading && !error && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <MailIcon className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">No messages in {folder}.</p>
              </div>
            )}
            <ul className="divide-y divide-border/40">
              {messages.map((m) => {
                const isSel = selected?.id === m.id;
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => void openMessage(m)}
                      className={cn(
                        "w-full text-left p-3 hover:bg-muted/40 transition flex items-start gap-2",
                        isSel && "bg-muted/60",
                        !m.read && "font-medium",
                      )}
                    >
                      <span className="shrink-0 mt-0.5">
                        {m.read ? (
                          <MailOpen className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <MailUnread className="w-4 h-4 text-secondary" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate">
                            {folder === "sent"
                              ? `To: @${m.toUsername}`
                              : `@${m.fromUsername}`}
                          </span>
                          {m.starred && (
                            <Star className="w-3 h-3 text-secondary fill-secondary shrink-0" />
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                            {timeShort(m.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm truncate">{m.subject || "(no subject)"}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {previewText(m.body)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Message view */}
          <section className="hidden lg:block sm:max-h-[calc(100vh-120px)] sm:overflow-y-auto">
            <MessageView
              message={selected}
              folder={folder}
              onStar={toggleStar}
              onTrash={trashMessage}
              onBack={() => setSelected(null)}
              summary={summary}
              summarizing={summarizing}
              onSummarize={summarize}
            />
          </section>
        </div>
      </div>

      {/* Mobile message view (overlay) */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            className="lg:hidden fixed inset-0 z-[180] bg-background flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Email message"
          >
            <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2">
              <button
                onClick={() => setSelected(null)}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Back to list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">Message</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MessageView
                message={selected}
                folder={folder}
                onStar={toggleStar}
                onTrash={trashMessage}
                onBack={() => setSelected(null)}
                summary={summary}
                summarizing={summarizing}
                onSummarize={summarize}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer */}
      <AnimatePresence>
        {composerOpen && (
          <Composer
            username={username}
            defaultRecipient=""
            onClose={() => setComposerOpen(false)}
            onSent={() => {
              setComposerOpen(false);
              setFolder("sent");
              void fetchFolder();
              toast.success("Mail sent", {
                description: "Your message is on its way.",
              });
            }}
          />
        )}
      </AnimatePresence>
    </OverlayShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MessageView — the right pane. Renders an empty state when no message is
// selected.
// ─────────────────────────────────────────────────────────────────────────────

function MessageView({
  message,
  folder,
  onStar,
  onTrash,
  onBack,
  summary,
  summarizing,
  onSummarize,
}: {
  message: MailMessage | null;
  folder: Folder;
  onStar: (m: MailMessage) => void;
  onTrash: (m: MailMessage) => void;
  onBack: () => void;
  summary: string | null;
  summarizing: boolean;
  onSummarize: () => void;
}) {
  if (!message) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
        <MailOpen className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">Select a message to read.</p>
      </div>
    );
  }

  return (
    <article className="p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-2">
        <button
          onClick={onBack}
          className="lg:hidden w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-lg leading-tight">
            {message.subject || "(no subject)"}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {folder === "sent" ? "To" : "From"}:
              <span className="font-mono text-foreground">
                {folder === "sent"
                  ? `${message.toUsername}@cirkle.app`
                  : message.fromEmail}
              </span>
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span>{timeLong(message.createdAt)}</span>
          </div>
        </div>
        <button
          onClick={() => onStar(message)}
          className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
          aria-label={message.starred ? "Unstar" : "Star"}
        >
          {message.starred ? (
            <Star className="w-4 h-4 text-secondary fill-secondary" />
          ) : (
            <StarOff className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={() => onTrash(message)}
          className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
          aria-label="Move to trash"
        >
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* AI triage */}
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            AI triage
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={onSummarize}
            disabled={summarizing}
          >
            {summarizing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1" />
            )}
            Summarize this email
          </Button>
        </div>
        {summary && (
          <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
            {summary}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-4">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {message.body || "(empty body)"}
        </p>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composer
// ─────────────────────────────────────────────────────────────────────────────

function Composer({
  username,
  defaultRecipient,
  onClose,
  onSent,
}: {
  username: string;
  defaultRecipient: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [to, setTo] = useState(defaultRecipient);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const submit = useCallback(async () => {
    if (!to.trim()) {
      toast.error("Recipient is required.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          from: username,
          subject,
          body,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      onSent();
    } catch (e) {
      toast.error("Couldn't send mail", {
        description: String((e as Error).message || e),
      });
    } finally {
      setSending(false);
    }
  }, [to, subject, body, username, onSent]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-charcoal/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border/60 rounded-t-3xl sm:rounded-2xl shadow-float w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Compose email"
      >
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between sticky top-0 bg-card z-10">
          <h2 className="font-display text-lg">Compose</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              From
            </span>
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm font-mono">
              {username}@cirkle.app
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              To
            </span>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="username (e.g. layla) or layla@cirkle.app"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Subject
            </span>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick note about…"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Body
            </span>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
              rows={8}
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border/60 flex items-center justify-end gap-2 sticky bottom-0 bg-card">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={sending}>
            {sending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <SendIcon className="w-4 h-4 mr-1" />
            )}
            Send
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small bits
// ─────────────────────────────────────────────────────────────────────────────

function previewText(body: string): string {
  if (!body) return "(empty)";
  // Collapse whitespace and trim to ~120 chars for the list preview.
  const collapsed = body.replace(/\s+/g, " ").trim();
  return collapsed.length > 120 ? `${collapsed.slice(0, 120)}…` : collapsed;
}

function timeShort(iso: string): string {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function timeLong(iso: string): string {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

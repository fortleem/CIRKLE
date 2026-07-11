"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, Bot, Plus, Copy, Check, Loader2, KeyRound, Webhook, Code2,
  RefreshCw, AlertCircle, ShieldCheck,
  MessageSquare, Send, FileText, CreditCard, MapPin,
  type LucideIcon,
} from "lucide-react";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── API response shapes ────────────────────────────────────────────────────

interface BotKey {
  keyId: string;
  name: string;
  status: string;
  lastUsedAt?: string | null;
  createdAt: string;
}

interface Bot {
  id: string;
  appId: string;
  name: string;
  description: string;
  developer: string;
  logoEmoji: string;
  category: string;
  status: string;
  scopes: string;
  webhookUrl: string | null;
  createdAt: string;
  apiKeys?: BotKey[];
}

interface NewApiKey {
  keyId: string;
  key: string;
  scopes: string;
  createdAt: string;
}

// ── Static metadata ────────────────────────────────────────────────────────

const SCOPE_LIST: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "messages:read", label: "Read messages", icon: MessageSquare },
  { id: "messages:send", label: "Send messages", icon: Send },
  { id: "posts:create", label: "Create posts", icon: FileText },
  { id: "payments:request", label: "Request payments", icon: CreditCard },
  { id: "location:read", label: "Read location", icon: MapPin },
];

const WEBHOOK_EVENTS: { event: string; desc: string; payload: string }[] = [
  {
    event: "message.received",
    desc: "A new message arrived in a conversation the bot is listening to.",
    payload: '{ "event": "message.received", "botId": "…", "message": { "id": "…", "conversationId": "…", "senderName": "…", "body": "Hello!" } }',
  },
  {
    event: "command.invoked",
    desc: "The user typed /<command> <args> in a conversation where the bot is listening.",
    payload: '{ "event": "command.invoked", "botId": "…", "command": "weather", "args": ["Riyadh"], "conversationId": "…" }',
  },
  {
    event: "payment.completed",
    desc: "A payment the bot requested has been settled.",
    payload: '{ "event": "payment.completed", "botId": "…", "transactionId": "…", "amount": 25.0, "currency": "SAR" }',
  },
  {
    event: "bot.installed",
    desc: "A user installed the bot into a new conversation.",
    payload: '{ "event": "bot.installed", "botId": "…", "conversationId": "…", "userId": "…" }',
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export function BotDeveloper({ open, onClose }: Props) {
  const { user } = useAuth();
  const developer = user?.username ?? "anonymous";

  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<NewApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    webhookUrl: "",
    scopes: new Set<string>(["messages:read", "messages:send", "posts:create"]),
  });
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bots?developer=${encodeURIComponent(developer)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { ok: boolean; bots?: Bot[] };
      setBots(data.bots ?? []);
    } catch (err) {
      console.warn("[bot-developer] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [developer]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  // ── Create bot ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Bot name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          webhookUrl: form.webhookUrl || undefined,
          scopes: [...form.scopes].join(","),
          developer,
          logoEmoji: "🤖",
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        bot?: Bot;
        apiKey?: NewApiKey;
        error?: string;
      };
      if (!data.ok) {
        toast.error(data.error || "Failed to create bot");
        return;
      }
      toast.success(`Bot "${data.bot?.name}" created`);
      setNewKey(data.apiKey ?? null);
      setForm({
        name: "",
        description: "",
        webhookUrl: "",
        scopes: new Set(["messages:read", "messages:send", "posts:create"]),
      });
      setShowCreate(false);
      refresh();
    } catch (err) {
      toast.error("Failed to create bot", {
        description: String((err as Error)?.message || err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Copy API key ────────────────────────────────────────────────────────
  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      toast.success("API key copied", {
        description: "Store it securely — you won't see it again.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — select the text manually.");
    }
  };

  const toggleScope = (id: string) => {
    setForm((f) => {
      const next = new Set(f.scopes);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...f, scopes: next };
    });
  };

  // ── SDK code sample (uses the bot's name) ───────────────────────────────
  const sampleBot = bots[0];
  const sdkSnippet = useMemo(() => {
    const name = sampleBot?.name ?? "MyBot";
    const key = newKey?.key ?? "cirkle_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    return `import { cirkleBot } from "@cirkle/bot-sdk";

// 1. Initialize with your bot context + API key
cirkleBot.init({
  userId: "<recipient-username>",
  username: "${name}",
  country: "SA",
  language: "ar",
  apiKey: "${key}",
  botId: "${sampleBot?.appId ?? "bot-xxxxxx"}",
});

// 2. Listen for incoming messages
cirkleBot.onMessage((msg) => {
  console.log("Received:", msg.body);
  // Echo it back
  cirkleBot.sendMessage(msg.conversationId, "Got it 👍");
});

// 3. Listen for slash-commands
cirkleBot.onCommand((cmd, args) => {
  if (cmd === "weather") {
    cirkleBot.createPost(\`Weather in \${args[0] ?? "Riyadh"}: ☀️ 32°C\`, "public");
  }
});

// 4. Request a payment via Cirkle Pay
await cirkleBot.requestPayment(25, "SAR", "Premium subscription");

// 5. Read the user's country + city (no GPS)
const loc = cirkleBot.getUserLocation();
console.log(loc); // { country: "SA", city: "Riyadh" }
`;
  }, [sampleBot, newKey]);

  return (
    <OverlayShell open={open} onClose={onClose} variant="sheet" maxWidth="max-w-4xl" ariaLabel="Bot Developer Portal">
      <div className="flex flex-col h-full">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="px-6 pt-6 pb-4 border-b border-border/60 flex items-start gap-3 shrink-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-steel/30 to-primary/20 border border-steel/30 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl tracking-tight">Bot Developer</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Build bots and mini-apps for Cirkle. API keys, webhooks, SDK.
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition disabled:opacity-50"
            aria-label="Refresh bots"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition"
          >
            <Plus className="w-3.5 h-3.5" /> New Bot
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* ── Body (scrollable) ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* ── New API key banner ─────────────────────────────────────── */}
          <AnimatePresence>
            {newKey && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border-2 border-secondary/40 bg-secondary/10 p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      Your new API key — copy it now
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      For security, the plaintext is only shown once. Store it
                      securely; you won&apos;t be able to retrieve it again.
                    </div>
                  </div>
                  <button
                    onClick={() => setNewKey(null)}
                    className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-charcoal/80 text-cream text-[12px] font-mono break-all">
                    {newKey.key}
                  </code>
                  <button
                    onClick={() => copyKey(newKey.key)}
                    className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition flex items-center gap-1.5 shrink-0"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>key id: <code className="font-mono">{newKey.keyId}</code></span>
                  <span>·</span>
                  <span>scopes: {newKey.scopes}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Your Bots ──────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" /> Your Bots
              </h3>
              <button
                onClick={() => setShowCreate(true)}
                className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            {loading && bots.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin me-2" /> Loading…
              </div>
            ) : bots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
                <Bot className="w-10 h-10 mx-auto text-muted-foreground/50" />
                <div className="font-medium mt-3">No bots yet</div>
                <div className="text-[12px] text-muted-foreground mt-1">
                  Create your first bot to get an API key and webhook URL.
                </div>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Create your first bot
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {bots.map((bot) => (
                  <BotCard key={bot.id} bot={bot} />
                ))}
              </div>
            )}
          </section>

          {/* ── SDK code sample ────────────────────────────────────────── */}
          <section>
            <h3 className="font-display text-lg flex items-center gap-2 mb-3">
              <Code2 className="w-4 h-4 text-primary" /> SDK Quickstart
            </h3>
            <div className="rounded-2xl border border-border/60 overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/50 border-b border-border/60 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  cirkle-bot-sdk · TypeScript
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard
                      .writeText(sdkSnippet)
                      .then(() => toast.success("Snippet copied"))
                      .catch(() => toast.error("Copy failed"));
                  }}
                  className="text-[11px] flex items-center gap-1 text-muted-foreground hover:text-foreground transition"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <pre className="p-4 bg-charcoal text-cream text-[12px] font-mono leading-relaxed overflow-x-auto max-h-80">
                <code>{sdkSnippet}</code>
              </pre>
            </div>
          </section>

          {/* ── Webhook events ─────────────────────────────────────────── */}
          <section>
            <h3 className="font-display text-lg flex items-center gap-2 mb-3">
              <Webhook className="w-4 h-4 text-primary" /> Webhook Events
            </h3>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map((ev) => (
                <div
                  key={ev.event}
                  className="rounded-xl border border-border/60 p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-[12px] font-mono text-primary font-medium">
                      {ev.event}
                    </code>
                  </div>
                  <p className="text-[12px] text-muted-foreground mb-2">
                    {ev.desc}
                  </p>
                  <pre className="bg-muted/40 px-3 py-2 rounded-lg text-[11px] font-mono overflow-x-auto">
                    <code>{ev.payload}</code>
                  </pre>
                </div>
              ))}
            </div>
          </section>

          {/* ── Permissions reference ─────────────────────────────────── */}
          <section>
            <h3 className="font-display text-lg flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-primary" /> Permission Scopes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SCOPE_LIST.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.id}
                    className="rounded-xl border border-border/60 p-3 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-mono">{s.id}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {s.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ── Create bot modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-charcoal/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !submitting && setShowCreate(false)}
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border/60 rounded-2xl shadow-float max-w-md w-full max-h-[90vh] overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-label="Create a new bot"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl">Create a new bot</h3>
                  <button
                    onClick={() => setShowCreate(false)}
                    disabled={submitting}
                    className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium" htmlFor="bot-name">
                    Bot name
                  </label>
                  <input
                    id="bot-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Weather Bot"
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    maxLength={80}
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium" htmlFor="bot-desc">
                    Description
                  </label>
                  <textarea
                    id="bot-desc"
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="What does your bot do?"
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    rows={3}
                    maxLength={1000}
                  />
                </div>

                {/* Webhook URL */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium flex items-center gap-1.5" htmlFor="bot-webhook">
                    <Webhook className="w-3 h-3" /> Webhook URL (optional)
                  </label>
                  <input
                    id="bot-webhook"
                    type="url"
                    value={form.webhookUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, webhookUrl: e.target.value }))
                    }
                    placeholder="https://your-server.com/cirkle/webhook"
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Cirkle will POST events (message.received, command.invoked,
                    payment.completed) to this URL.
                  </p>
                </div>

                {/* Scopes */}
                <div className="space-y-2">
                  <label className="text-[12px] font-medium">Permissions</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SCOPE_LIST.map((s) => {
                      const checked = form.scopes.has(s.id);
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleScope(s.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] transition",
                            checked
                              ? "border-primary bg-primary/10"
                              : "border-border/60 hover:bg-muted/40",
                          )}
                          aria-pressed={checked}
                        >
                          <span
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                              checked
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border/60",
                            )}
                          >
                            {checked && <Check className="w-3 h-3" />}
                          </span>
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-mono text-[11px] truncate">{s.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 rounded-full border border-border/60 text-[12px] font-medium hover:bg-muted transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={submitting || !form.name.trim()}
                    className="flex-1 px-4 py-2 rounded-full bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Create bot
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </OverlayShell>
  );
}

// ── BotCard ────────────────────────────────────────────────────────────────

function BotCard({ bot }: { bot: Bot }) {
  const [expanded, setExpanded] = useState(false);
  const scopes = bot.scopes.split(",").filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-steel/30 to-primary/20 flex items-center justify-center text-xl shrink-0">
          {bot.logoEmoji || "🤖"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{bot.name}</div>
          <div className="text-[11px] text-muted-foreground font-mono truncate">
            {bot.appId}
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-widest">
          {bot.status}
        </span>
      </div>

      {bot.description && (
        <p className="text-[12px] text-muted-foreground line-clamp-2">
          {bot.description}
        </p>
      )}

      {/* Scopes */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {scopes.slice(0, 3).map((s) => (
          <span
            key={s}
            className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono"
          >
            {s}
          </span>
        ))}
        {scopes.length > 3 && (
          <span className="text-[10px] text-muted-foreground">
            +{scopes.length - 3} more
          </span>
        )}
      </div>

      {/* Webhook URL */}
      {bot.webhookUrl && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
          <Webhook className="w-3 h-3 shrink-0" />
          <span className="truncate font-mono">{bot.webhookUrl}</span>
        </div>
      )}

      {/* API keys (expandable) */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-[11px] text-primary hover:underline flex items-center gap-1"
      >
        <KeyRound className="w-3 h-3" />
        {bot.apiKeys?.length ?? 0} API key{(bot.apiKeys?.length ?? 0) === 1 ? "" : "s"}
        <span className="text-muted-foreground">
          {expanded ? "(hide)" : "(show)"}
        </span>
      </button>
      {expanded && bot.apiKeys && bot.apiKeys.length > 0 && (
        <div className="space-y-1 pt-1">
          {bot.apiKeys.map((k) => (
            <div
              key={k.keyId}
              className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground"
            >
              <span className="px-1.5 py-0.5 rounded bg-muted">{k.keyId}</span>
              <span>{k.name}</span>
              <span>·</span>
              <span>{k.status}</span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Plaintext keys are only shown once at creation.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <span className="text-[10px] text-muted-foreground">
          Created {new Date(bot.createdAt).toLocaleDateString()}
        </span>
      </div>
    </motion.div>
  );
}

// ── Unused import shim (kept for future "delete bot" feature) ──────────────


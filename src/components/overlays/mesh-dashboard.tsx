"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  Radio,
  Wifi,
  WifiOff,
  Users,
  Send,
  Coins,
  RefreshCw,
  Trash2,
  Activity,
  Plus,
  Check,
  Cpu,
  Circle as CircleIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OverlayShell } from "@/components/ui/overlay-shell";
import {
  mesh,
  createOfflineMessage,
  createOfflinePayment,
  type OfflineMessage,
  type OfflinePayment,
  type MeshPeer,
} from "@/lib/mesh-network";
import { useAuth } from "@/lib/auth-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette ONLY — gold / teal / rose / steel / charcoal / cream.
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { id: TabView; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: Radio },
  { id: "messages", label: "Messages", icon: Send },
  { id: "payments", label: "Payments", icon: Coins },
];

type TabView = "overview" | "messages" | "payments";

export function MeshDashboard({ open, onClose }: Props) {
  const { user } = useAuth();
  const senderId = user?.username || "you";

  const [tab, setTab] = useState<TabView>("overview");
  const [connected, setConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [messages, setMessages] = useState<OfflineMessage[]>([]);
  const [payments, setPayments] = useState<OfflinePayment[]>([]);
  const [incoming, setIncoming] = useState<{ kind: "message" | "payment"; id: string; ts: number }[]>([]);
  const [syncing, setSyncing] = useState(false);

  // ── Compose-form state (so the dashboard can also enqueue new items) ──
  const [msgRecipient, setMsgRecipient] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [payTo, setPayTo] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState("EGP");

  // ── Boot the mesh on open + subscribe to events ───────────────────────
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        await mesh.connect();
        if (!mounted) return;
        setConnected(mesh.isConnected());
        setOfflineMode(mesh.isOfflineMode());
        setPeers(mesh.getPeers());
        setMessages(await mesh.getQueuedMessages());
        setPayments(await mesh.getPendingPayments());
      } catch {
        /* ignore */
      }
    })();

    const offPeer = mesh.onPeerDiscovered(() => {
      setPeers(mesh.getPeers());
    });
    const offMsg = mesh.onMessage((m) => {
      setIncoming((prev) =>
        [{ kind: "message" as const, id: m.id, ts: Date.now() }, ...prev].slice(0, 8),
      );
      toast.success("Mesh message received", { description: m.body.slice(0, 80) });
    });
    const offPay = mesh.onPayment((p) => {
      setIncoming((prev) =>
        [{ kind: "payment" as const, id: p.id, ts: Date.now() }, ...prev].slice(0, 8),
      );
      toast.success("Mesh payment received", {
        description: `${p.amount} ${p.currency} from ${p.from}`,
      });
    });

    // Refresh queue counts every 2s while open
    const refreshId = setInterval(async () => {
      setPeers(mesh.getPeers());
      setMessages(await mesh.getQueuedMessages());
      setPayments(await mesh.getPendingPayments());
      setOfflineMode(mesh.isOfflineMode());
    }, 2000);

    return () => {
      mounted = false;
      offPeer();
      offMsg();
      offPay();
      clearInterval(refreshId);
    };
  }, [open]);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await mesh.syncOnReconnect();
      setMessages(await mesh.getQueuedMessages());
      setPayments(await mesh.getPendingPayments());
      const peerCount = mesh.getPeers().length;
      if (peerCount === 0) {
        toast.info("No peers in range", {
          description: "Open another browser tab to simulate a peer.",
        });
      } else {
        toast.success(`Synced with ${peerCount} peer${peerCount === 1 ? "" : "s"}`, {
          description: "Queue broadcast over the mesh.",
        });
      }
    } finally {
      setTimeout(() => setSyncing(false), 600);
    }
  }, []);

  const handleToggleOffline = useCallback(async (next: boolean) => {
    await mesh.setOfflineMode(next);
    setOfflineMode(next);
    toast.success(next ? "Offline mode on" : "Back online", {
      description: next
        ? "Outbound items queue locally only."
        : "Queued items will broadcast on next sync.",
    });
  }, []);

  const handleSendMsg = useCallback(async () => {
    if (!msgBody.trim()) {
      toast.error("Enter a message body");
      return;
    }
    const msg = createOfflineMessage({
      conversationId: msgRecipient.trim() || "mesh-general",
      senderId,
      body: msgBody.trim(),
    });
    await mesh.sendMessage(msg);
    setMessages(await mesh.getQueuedMessages());
    setMsgBody("");
    setMsgRecipient("");
    toast.success("Message queued", {
      description: mesh.getPeers().length > 0 && !offlineMode
        ? "Broadcasting to nearby peers…"
        : "Will send when a peer appears.",
    });
  }, [msgBody, msgRecipient, senderId, offlineMode]);

  const handleSendPay = useCallback(async () => {
    const amt = Number(payAmount);
    if (!payTo.trim() || !Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter recipient + amount");
      return;
    }
    const pmt = createOfflinePayment({
      from: senderId,
      to: payTo.trim(),
      amount: amt,
      currency: payCurrency,
    });
    await mesh.sendPayment(pmt);
    setPayments(await mesh.getPendingPayments());
    setPayTo("");
    setPayAmount("");
    toast.success("Payment signed + queued", {
      description: "HMAC signature prevents tampering on relay.",
    });
  }, [payTo, payAmount, payCurrency, senderId]);

  const handleClear = useCallback(async () => {
    await mesh.clearAll();
    setMessages([]);
    setPayments([]);
    toast.success("Queue cleared");
  }, []);

  const ackMsg = useCallback(async (id: string) => {
    await mesh.ackMessage(id, "manual");
    setMessages(await mesh.getQueuedMessages());
  }, []);

  const ackPay = useCallback(async (id: string) => {
    await mesh.ackPayment(id);
    setPayments(await mesh.getPendingPayments());
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      peers: peers.length,
      messages: messages.length,
      payments: payments.length,
      pendingBroadcast:
        messages.filter((m) => m.deliveredTo.length === 0).length +
        payments.filter((p) => !p.broadcastAt).length,
    }),
    [peers, messages, payments],
  );

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Cirkle Mesh Network — offline messages, payments, and peer discovery"
    >
      {/* Aurora background — brand palette only */}
      <div className="pointer-events-none absolute inset-0 aurora-bg opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background"
        aria-hidden
      />

      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="relative px-4 sm:px-6 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 glass-strong z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/40 to-secondary/20 border border-primary/40 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight flex items-center gap-2">
              Cirkle Mesh
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                  connected && !offlineMode
                    ? "bg-primary/15 text-primary border-primary/40"
                    : offlineMode
                      ? "bg-accent/15 text-accent border-accent/40"
                      : "bg-muted text-muted-foreground border-border/60",
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    connected && !offlineMode
                      ? "bg-primary animate-pulse"
                      : offlineMode
                        ? "bg-accent"
                        : "bg-muted-foreground",
                  )}
                />
                {connected && !offlineMode ? "Online" : offlineMode ? "Offline" : "Idle"}
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              Offline messages · Signed payments · Peer-to-peer relay
            </p>
          </div>

          {/* Offline mode toggle */}
          <button
            onClick={() => handleToggleOffline(!offlineMode)}
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition shrink-0",
              offlineMode
                ? "bg-accent/15 text-accent border-accent/40"
                : "bg-card text-muted-foreground border-border/60 hover:bg-muted/40",
            )}
            aria-pressed={offlineMode}
            aria-label="Toggle offline mode"
          >
            {offlineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            {offlineMode ? "Offline" : "Online"}
          </button>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto mt-3 flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/60 w-fit">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count =
              t.id === "messages" ? stats.messages : t.id === "payments" ? stats.payments : 0;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5",
                  tab === t.id
                    ? "bg-gradient-hero text-cream shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-0.5 px-1.5 py-0 rounded-full text-[10px] font-semibold",
                      tab === t.id ? "bg-cream/20" : "bg-secondary/20 text-secondary",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ───────────────────────── Body ───────────────────────── */}
      <div className="relative flex-1 overflow-y-auto z-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 pb-24">
          <AnimatePresence mode="wait">
            {/* ─────────────── Overview ─────────────── */}
            {tab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Peers in range" value={stats.peers} icon={Users} tint="text-primary" />
                  <StatCard label="Queued messages" value={stats.messages} icon={Send} tint="text-secondary" />
                  <StatCard label="Pending payments" value={stats.payments} icon={Coins} tint="text-accent" />
                </div>

                {/* Topology */}
                <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <h2 className="font-display text-sm flex-1">Network topology</h2>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {peers.length + 1} nodes
                    </span>
                  </div>
                  <TopologyView peers={peers} selfId={mesh.peerId} offlineMode={offlineMode} />
                </section>

                {/* Peer list */}
                <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h2 className="font-display text-sm flex-1">Connected peers</h2>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {peers.length} live
                    </span>
                  </div>
                  {peers.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center mx-auto mb-3">
                        <Wifi className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">No peers in range</p>
                      <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
                        Open Cirkle in another browser tab to simulate a second mesh
                        device — both peers will discover each other automatically.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/60 max-h-72 overflow-y-auto">
                      {peers.map((p) => (
                        <li
                          key={p.id}
                          className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 border border-primary/40 flex items-center justify-center shrink-0">
                            <Radio className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{p.label}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {p.id} · seen {Math.max(1, Math.round((Date.now() - p.lastSeen) / 1000))}s ago
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <SignalBars signal={p.signal} />
                            <span className="text-[10px] text-muted-foreground w-8 text-right">
                              {p.signal}%
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Sync / clear actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSync}
                    disabled={syncing || offlineMode}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition",
                      offlineMode
                        ? "border-accent/30 bg-accent/10 text-accent/60 cursor-not-allowed"
                        : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
                    )}
                  >
                    <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                    {syncing ? "Syncing…" : "Sync now"}
                  </button>
                  <button
                    onClick={handleClear}
                    className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted/40 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear queue
                  </button>
                </div>

                {offlineMode && (
                  <div className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 flex items-start gap-2">
                    <WifiOff className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <div className="text-[11px] text-accent">
                      <span className="font-medium">Offline mode is on.</span> Messages
                      and payments are stored locally and never broadcast. Toggle it off
                      (top-right) to relay queued items to nearby peers.
                    </div>
                  </div>
                )}

                {/* Incoming activity feed */}
                {incoming.length > 0 && (
                  <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-secondary" />
                      <h2 className="font-display text-sm flex-1">Incoming activity</h2>
                      <button
                        onClick={() => setIncoming([])}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>
                    <ul className="divide-y divide-border/60">
                      {incoming.map((a) => (
                        <li key={`${a.id}-${a.ts}`} className="px-4 py-2.5 flex items-center gap-3">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                              a.kind === "message"
                                ? "bg-secondary/15 text-secondary"
                                : "bg-accent/15 text-accent",
                            )}
                          >
                            {a.kind === "message" ? (
                              <Send className="w-3.5 h-3.5" />
                            ) : (
                              <Coins className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs">
                              <span className="font-medium capitalize">{a.kind}</span>{" "}
                              <span className="text-muted-foreground">received</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate">
                              {a.id}
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(a.ts).toLocaleTimeString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </motion.div>
            )}

            {/* ─────────────── Messages ─────────────── */}
            {tab === "messages" && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Compose */}
                <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" />
                    <h2 className="font-display text-sm flex-1">Queue a message</h2>
                  </div>
                  <input
                    value={msgRecipient}
                    onChange={(e) => setMsgRecipient(e.target.value)}
                    placeholder="Conversation / recipient (optional)"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <textarea
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    placeholder="Message body — will be encrypted + queued locally…"
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      Stored in IndexedDB · {messages.length} queued
                    </span>
                    <button
                      onClick={handleSendMsg}
                      className="px-4 py-2 rounded-xl bg-gradient-hero text-cream text-xs font-medium flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Queue message
                    </button>
                  </div>
                </section>

                {/* Queue list */}
                <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                    <Send className="w-4 h-4 text-secondary" />
                    <h2 className="font-display text-sm flex-1">Queued messages</h2>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {messages.length}
                    </span>
                  </div>
                  {messages.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-muted-foreground">
                      Queue empty. Send a message above to see it stored here.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/60 max-h-96 overflow-y-auto">
                      {messages.map((m) => (
                        <li key={m.id} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-secondary/15 text-secondary flex items-center justify-center shrink-0 mt-0.5">
                              <Send className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs">
                                <span className="font-medium">{m.senderId}</span>
                                <span className="text-muted-foreground"> · </span>
                                <span className="text-muted-foreground">{m.conversationId}</span>
                              </div>
                              <p className="text-sm mt-0.5 break-words">{m.body}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(m.createdAt).toLocaleTimeString()}
                                </span>
                                {m.deliveredTo.length > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                                    <Check className="w-3 h-3" />
                                    Delivered to {m.deliveredTo.length}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-accent">Pending delivery</span>
                                )}
                                <button
                                  onClick={() => ackMsg(m.id)}
                                  className="ml-auto text-[10px] text-muted-foreground hover:text-foreground underline"
                                >
                                  Mark delivered
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </motion.div>
            )}

            {/* ─────────────── Payments ─────────────── */}
            {tab === "payments" && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Compose payment */}
                <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-accent" />
                    <h2 className="font-display text-sm flex-1">Queue a signed payment</h2>
                  </div>
                  <input
                    value={payTo}
                    onChange={(e) => setPayTo(e.target.value)}
                    placeholder="Recipient (username or @handle)"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="col-span-2 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <select
                      value={payCurrency}
                      onChange={(e) => setPayCurrency(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    >
                      <option value="EGP">EGP</option>
                      <option value="SAR">SAR</option>
                      <option value="AED">AED</option>
                      <option value="USD">USD</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      HMAC-signed · tamper-evident on relay
                    </span>
                    <button
                      onClick={handleSendPay}
                      className="px-4 py-2 rounded-xl bg-gradient-to-br from-accent/80 to-accent text-cream text-xs font-medium flex items-center gap-1.5"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      Sign + queue
                    </button>
                  </div>
                </section>

                {/* Pending payments */}
                <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-accent" />
                    <h2 className="font-display text-sm flex-1">Pending payments</h2>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {payments.length}
                    </span>
                  </div>
                  {payments.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-muted-foreground">
                      No pending payments. Sign one above to see it queued here.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/60 max-h-96 overflow-y-auto">
                      {payments.map((p) => (
                        <li key={p.id} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5">
                              <Coins className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">
                                {p.amount} {p.currency}
                                <span className="text-muted-foreground font-normal">
                                  {" → "}
                                  {p.to}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                                {p.signature.slice(0, 24)}…
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(p.createdAt).toLocaleTimeString()}
                                </span>
                                {p.broadcastAt ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                                    <Check className="w-3 h-3" />
                                    Broadcast
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-accent">Awaiting relay</span>
                                )}
                                <button
                                  onClick={() => ackPay(p.id)}
                                  className="ml-auto text-[10px] text-muted-foreground hover:text-foreground underline"
                                >
                                  Confirm relayed
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </OverlayShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tint: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-3 py-2.5 text-center">
      <Icon className={cn("w-4 h-4 mx-auto mb-1", tint)} />
      <div className={cn("font-display text-2xl leading-none", tint)}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide truncate">
        {label}
      </div>
    </div>
  );
}

function SignalBars({ signal }: { signal: number }) {
  const bars = signal >= 75 ? 4 : signal >= 50 ? 3 : signal >= 25 ? 2 : 1;
  return (
    <div className="flex items-end gap-0.5" aria-label={`Signal ${signal}%`}>
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={cn(
            "w-1 rounded-sm",
            n <= bars ? "bg-primary" : "bg-muted-foreground/30",
            n === 1 ? "h-1.5" : n === 2 ? "h-2" : n === 3 ? "h-2.5" : "h-3",
          )}
        />
      ))}
    </div>
  );
}

/**
 * TopologyView — a simple radial visualization.
 * Self at the centre; peers orbit at a fixed radius with edge lines.
 */
function TopologyView({
  peers,
  selfId,
  offlineMode,
}: {
  peers: MeshPeer[];
  selfId: string;
  offlineMode: boolean;
}) {
  const radius = 88;
  const center = 130;
  const size = 260;

  return (
    <div className="relative w-full" style={{ height: size }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {/* Concentric range rings */}
          {[40, 70, 100, 130].map((r) => (
            <circle
              key={r}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeDasharray="2 4"
            />
          ))}

          {/* Edges to each peer */}
          {peers.map((p, i) => {
            const angle = (i / Math.max(1, peers.length)) * Math.PI * 2 - Math.PI / 2;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            return (
              <line
                key={`edge-${p.id}`}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="currentColor"
                strokeOpacity={offlineMode ? 0.1 : 0.25}
                strokeWidth={offlineMode ? 1 : 1.5}
                strokeDasharray={offlineMode ? "3 4" : "none"}
              />
            );
          })}
        </svg>
      </div>

      {/* Self node (centre) */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ left: center, top: center }}
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "w-14 h-14 rounded-2xl flex flex-col items-center justify-center border shadow-soft",
            offlineMode
              ? "bg-accent/20 border-accent/40 text-accent"
              : "bg-gradient-to-br from-primary/50 to-secondary/30 border-primary/40 text-primary",
          )}
        >
          <Cpu className="w-4 h-4" />
          <span className="text-[9px] font-medium mt-0.5">You</span>
        </motion.div>
        <div className="text-[9px] text-muted-foreground font-mono text-center mt-1 max-w-[100px] truncate">
          {selfId}
        </div>
      </div>

      {/* Peer nodes */}
      {peers.map((p, i) => {
        const angle = (i / Math.max(1, peers.length)) * Math.PI * 2 - Math.PI / 2;
        const x = center + Math.cos(angle) * radius - 28;
        const y = center + Math.sin(angle) * radius - 28;
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="absolute z-10"
            style={{ left: x, top: y }}
          >
            <div className="w-14 h-14 rounded-2xl bg-card border border-border/60 flex flex-col items-center justify-center">
              <CircleIcon className="w-4 h-4 text-secondary" />
              <span className="text-[9px] font-medium mt-0.5 truncate max-w-[44px]">
                {p.label}
              </span>
            </div>
            <div className="text-[9px] text-muted-foreground text-center mt-0.5">{p.signal}%</div>
          </motion.div>
        );
      })}

      {peers.length === 0 && (
        <div className="absolute inset-x-0 bottom-2 text-center text-[11px] text-muted-foreground">
          Waiting for peers to discover…
        </div>
      )}
    </div>
  );
}

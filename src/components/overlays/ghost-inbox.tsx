"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Ghost, Send, Lock, Clock, Trash2, Delete, Eye, EyeOff, AlertOctagon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface GhostChat {
  id: string;
  name: string;
  emoji: string;
  lastMsg: string;
  ttl: number; // seconds remaining
  unread: number;
  messages: { id: number; me: boolean; text: string }[];
}

const SEED_CHATS: GhostChat[] = [];

const CORRECT_PIN = "2025";

export function GhostInbox({ open, onClose }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [decoy, setDecoy] = useState(false);
  const [chats, setChats] = useState<GhostChat[]>(SEED_CHATS);
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [idc, setIdc] = useState(100);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setUnlocked(false); setPin(""); setPinError(false); setDecoy(false);
        setChats(SEED_CHATS); setActive(null); setInput("");
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Tick down TTLs while unlocked
  useEffect(() => {
    if (!open || !unlocked) return;
    const id = setInterval(() => {
      setChats((cs) => cs.map((c) => ({ ...c, ttl: Math.max(0, c.ttl - 1) })).filter((c) => c.ttl > 0));
    }, 1000);
    return () => clearInterval(id);
  }, [open, unlocked]);

  const submitPin = () => {
    if (pin === CORRECT_PIN) {
      setUnlocked(true);
      setPinError(false);
      toast.success("Ghost inbox unlocked", { description: "Encrypted · ephemeral · no backups" });
    } else {
      setPinError(true);
      setPin("");
      toast.error("Wrong PIN");
    }
  };

  const wipeAll = () => {
    setChats([]);
    setActive(null);
    toast.success("All ghosts wiped", { description: "No trace remains." });
  };

  const send = () => {
    if (!input.trim() || !active) return;
    const chat = chats.find((c) => c.id === active);
    if (!chat) return;
    const id = idc + 1; setIdc(id);
    setChats((cs) => cs.map((c) => c.id === active
      ? { ...c, messages: [...c.messages, { id, me: true, text: input.trim() }], lastMsg: input.trim(), ttl: Math.max(c.ttl, 30) }
      : c));
    setInput("");
    toast.success("Ghost sent", { description: "Self-destructs after read." });
  };

  const activeChat = chats.find((c) => c.id === active);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="dark fixed inset-0 z-[160] bg-charcoal text-cream overflow-hidden flex flex-col"
        >
          {/* Dark aurora */}
          <div className="absolute inset-0 aurora-bg opacity-15 pointer-events-none" />
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-steel/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-accent/15 blur-3xl pointer-events-none" />

          {/* PIN gate */}
          <AnimatePresence>
            {!unlocked && !decoy && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 gap-5"
              >
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.4, repeat: Infinity }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-steel/40 to-accent/30 border border-steel/50 flex items-center justify-center"
                >
                  <Lock className="w-7 h-7 text-cream" />
                </motion.div>
                <div className="text-center">
                  <div className="font-display text-2xl">Ghost Inbox</div>
                  <div className="text-[11px] text-cream/60 mt-1">Enter your 4-digit PIN to unlock</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric" pattern="[0-9]*" maxLength={4}
                    value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && pin.length === 4) submitPin(); }}
                    placeholder="••••"
                    autoFocus
                    className={cn(
                      "w-44 text-center text-3xl tracking-[0.5em] bg-cream/5 border rounded-xl px-3 py-3 outline-none transition",
                      pinError ? "border-accent/70 text-accent" : "border-cream/20 focus:border-steel/60",
                    )}
                  />
                  <button onClick={() => setShowPin((s) => !s)} className="w-10 h-10 rounded-full bg-cream/5 border border-cream/20 flex items-center justify-center" aria-label="Toggle PIN visibility">
                    {showPin ? <EyeOff className="w-4 h-4 text-cream/70" /> : <Eye className="w-4 h-4 text-cream/70" />}
                  </button>
                </div>
                <button
                  onClick={submitPin} disabled={pin.length < 4}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-br from-steel/60 to-accent/50 border border-cream/20 text-cream text-sm font-medium disabled:opacity-40"
                >
                  Unlock
                </button>
                <button
                  onClick={() => { setDecoy(true); toast("Decoy mode activated", { description: "Inbox looks empty to anyone watching." }); }}
                  className="text-[11px] text-cream/40 underline underline-offset-4 hover:text-cream/70"
                >
                  Activate decoy mode
                </button>
                <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 rounded-full bg-cream/5 border border-cream/20 flex items-center justify-center" aria-label="Close">
                  <X className="w-4 h-4 text-cream/70" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decoy mode */}
          <AnimatePresence>
            {decoy && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="relative z-10 flex-1 flex flex-col items-center justify-center gap-3 text-center px-5">
                <Ghost className="w-10 h-10 text-cream/40" />
                <div className="font-display text-lg text-cream/60">Inbox empty</div>
                <div className="text-[11px] text-cream/40 max-w-xs">No messages yet. When contacts send ghost messages, they&apos;ll appear here.</div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setDecoy(false)} className="text-[11px] px-3 py-1.5 rounded-full bg-cream/5 border border-cream/20 text-cream/60">Back to PIN</button>
                  <button onClick={onClose} className="text-[11px] px-3 py-1.5 rounded-full bg-cream/5 border border-cream/20 text-cream/60">Close</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Unlocked inbox */}
          <AnimatePresence>
            {unlocked && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-10 flex-1 flex flex-col">
                <header className="px-5 pt-5 pb-3 flex items-center gap-3">
                  <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-steel/40 to-accent/30 border border-steel/50 flex items-center justify-center shrink-0">
                    <Ghost className="w-5 h-5 text-cream" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-xl text-cream">Ghost Inbox</div>
                    <div className="text-[11px] text-cream/60">{chats.length} active chat{chats.length === 1 ? "" : "s"} · all self-destruct</div>
                  </div>
                  <button onClick={wipeAll} className="w-9 h-9 rounded-full bg-cream/5 border border-cream/20 flex items-center justify-center" aria-label="Wipe all">
                    <Delete className="w-4 h-4 text-accent" />
                  </button>
                  <button onClick={onClose} className="w-9 h-9 rounded-full bg-cream/5 border border-cream/20 flex items-center justify-center" aria-label="Close">
                    <X className="w-4 h-4 text-cream/70" />
                  </button>
                </header>

                {/* Active chat view */}
                {activeChat ? (
                  <>
                    <div className="px-5 pb-2 flex items-center gap-2 border-b border-cream/10">
                      <button onClick={() => setActive(null)} className="text-[11px] text-cream/60 hover:text-cream">← Back</button>
                      <div className="flex-1 text-center text-sm font-medium text-cream">{activeChat.emoji} {activeChat.name}</div>
                      <div className="text-[10px] text-accent flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {activeChat.ttl}s
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                      {activeChat.messages.map((m) => (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className={cn("max-w-[80%] px-3.5 py-2 rounded-2xl text-sm",
                            m.me ? "ms-auto bg-gradient-to-br from-steel/60 to-accent/50 text-cream rounded-br-md" : "me-auto bg-cream/5 border border-cream/15 text-cream rounded-bl-md")}>
                          {m.text}
                        </motion.div>
                      ))}
                    </div>
                    <div className="border-t border-cream/10 px-3 py-2.5">
                      <div className="bg-cream/5 border border-cream/15 rounded-full px-3 py-2 flex items-center gap-2">
                        <input
                          value={input} onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                          className="flex-1 bg-transparent outline-none text-sm text-cream py-1.5 placeholder:text-cream/40"
                          placeholder="Send a ghost…"
                        />
                        <button onClick={send} disabled={!input.trim()} className="w-9 h-9 rounded-full bg-gradient-to-br from-steel/60 to-accent/50 text-cream flex items-center justify-center disabled:opacity-40" aria-label="Send">
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                    <div className="rounded-xl border border-steel/40 bg-gradient-to-br from-steel/15 to-transparent p-3 text-xs text-cream/80 flex items-start gap-1.5">
                      <AlertOctagon className="w-3 h-3 mt-0.5 shrink-0 text-accent" /> Ghost messages are end-to-end encrypted on-device. Once read, they vanish — no backups, no servers, no trace.
                    </div>

                    {chats.length === 0 ? (
                      <div className="text-center text-xs text-cream/40 py-12">
                        <Ghost className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No active ghosts. All wiped.
                      </div>
                    ) : chats.map((c) => (
                      <motion.button
                        key={c.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => setActive(c.id)}
                        className="w-full text-start rounded-2xl border border-cream/15 bg-cream/5 p-3 hover:bg-cream/10 transition"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm font-medium text-cream">{c.emoji} {c.name}</div>
                          <div className="text-[10px] text-accent flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {c.ttl}s
                          </div>
                        </div>
                        <p className="text-xs text-cream/70 truncate">{c.lastMsg}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-cream/40">{c.unread > 0 ? `${c.unread} unread` : "Read"}</span>
                          <motion.div initial={{ width: "100%" }} animate={{ width: `${(c.ttl / 60) * 100}%` }} transition={{ duration: 1, ease: "linear" }}
                            className="h-0.5 bg-steel/50 rounded-full" style={{ width: `${Math.min(100, (c.ttl / 60) * 100)}%` }} />
                        </div>
                      </motion.button>
                    ))}

                    <button
                      onClick={wipeAll}
                      className="w-full mt-3 rounded-xl border border-accent/40 bg-accent/10 py-2.5 text-xs text-accent flex items-center justify-center gap-1.5 hover:bg-accent/20 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Wipe all ghosts
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

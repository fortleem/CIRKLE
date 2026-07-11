"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Users, ChevronDown, Plus, Sparkles, Send, Crown, Hash,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onClose: () => void; }

interface Tribe {
  id: string;
  name: string;
  emoji: string;
  members: number;
  tint: string;
  desc: string;
  preview: string;
}

interface Msg { id: number; user: string; text: string; tribe: string; you?: boolean; }

const INITIAL_TRIBES: Tribe[] = [
  { id: "design", name: "Design Studio", emoji: "🎨", members: 142, tint: "from-secondary/30 to-secondary/5 border-secondary/40", desc: "Designers, illustrators, type nerds", preview: "User: Anyone up for the design sync at 6?" },
  { id: "dev", name: "Dev Circle", emoji: "💻", members: 88, tint: "from-steel/30 to-steel/5 border-steel/40", desc: "Full-stack, mobile, infra", preview: "User: shipped the new build — reviews welcome" },
  { id: "food", name: "Food Lovers", emoji: "🍽", members: 256, tint: "from-accent/30 to-accent/5 border-accent/40", desc: "Recipes, restaurant recs, foodie trips", preview: "User: Just landed in Jeddah — koshary recs?" },
  { id: "music", name: "Music Makers", emoji: "🎵", members: 74, tint: "from-primary/30 to-primary/5 border-primary/40", desc: "Producers, players, listeners", preview: "User: new oud loop — feedback please" },
  { id: "travel", name: "Slow Travel", emoji: "✈️", members: 198, tint: "from-secondary/30 to-accent/10 border-secondary/40", desc: "Off-the-grid trips, slow stays", preview: "Yara: 3 days in AlUla — itinerary shared" },
];

const SEED: Msg[] = [
  { id: 1, user: "User", text: "Anyone up for the design sync at 6?", tribe: "design" },
  { id: 2, user: "User", text: "Yes! Bringing the new sketches.", tribe: "design" },
  { id: 3, user: "User", text: "Just landed in Jeddah — recs for koshary?", tribe: "food" },
  { id: 4, user: "User", text: "Abou Tarek, no contest 🤤", tribe: "food" },
];

export function TribeChat({ open, onClose }: Props) {
  const [tribes, setTribes] = useState<Tribe[]>(INITIAL_TRIBES);
  const [openTribes, setOpenTribes] = useState<Record<string, boolean>>({ design: true });
  const [activeTribe, setActiveTribe] = useState<string>("design");
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [idc, setIdc] = useState(100);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🌟");
  const [newDesc, setNewDesc] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  const toggle = (id: string) => setOpenTribes((o) => ({ ...o, [id]: !o[id] }));

  const send = () => {
    if (!input.trim()) return;
    const id = idc + 1; setIdc(id);
    setMessages((m) => [...m, { id, user: "You", text: input.trim(), tribe: activeTribe, you: true }]);
    setInput("");
    toast.success(`Posted in ${tribes.find((t) => t.id === activeTribe)?.name}`);
  };

  const suggestTribe = () => {
    setSuggesting(true);
    setTimeout(() => {
      setSuggesting(false);
      const ideas = [
        { name: "Book Club", emoji: "📚", desc: "Slow reads, monthly picks" },
        { name: "Photo Walks", emoji: "📷", desc: "Weekend photowalks across the city" },
        { name: "Founder Circle", emoji: "🚀", desc: "Early-stage founders, peer mentoring" },
      ];
      const pick = ideas[Math.floor(Math.random() * ideas.length)];
      setNewName(pick.name); setNewEmoji(pick.emoji); setNewDesc(pick.desc);
      toast.success("AI suggested a tribe", { description: `${pick.emoji} ${pick.name}` });
    }, 1200);
  };

  const createTribe = () => {
    if (!newName.trim()) { toast.error("Pick a name"); return; }
    const id = `t${Date.now()}`;
    setTribes((t) => [...t, {
      id, name: newName.trim(), emoji: newEmoji, members: 1,
      tint: "from-secondary/30 to-accent/10 border-secondary/40", desc: newDesc || "Your new tribe",
      preview: "Say hi to your tribe 👋",
    }]);
    setOpenTribes((o) => ({ ...o, [id]: true }));
    setActiveTribe(id);
    setCreating(false); setNewName(""); setNewDesc("");
    toast.success("Tribe created", { description: `${newEmoji} ${newName}` });
  };

  const activeMeta = tribes.find((t) => t.id === activeTribe);
  const tribeMsgs = messages.filter((m) => m.tribe === activeTribe);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 z-[140]" style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Tribe Chat"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br border flex items-center justify-center shrink-0", activeMeta?.tint || "from-secondary/30 to-accent/10 border-secondary/40")}>
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Tribe Chat</div>
                <div className="text-[11px] text-muted-foreground truncate">{activeMeta?.emoji} {activeMeta?.name} · {activeMeta?.members} members</div>
              </div>
              <button onClick={() => setCreating((c) => !c)} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="New tribe">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </header>

            {/* 5 collapsible tribes */}
            <div className="px-5 py-2 border-b border-border/40 space-y-1.5 max-h-56 overflow-y-auto">
              {tribes.map((t) => {
                const isOpen = openTribes[t.id];
                const isActive = activeTribe === t.id;
                return (
                  <div key={t.id} className={cn("rounded-xl border bg-gradient-to-br overflow-hidden", t.tint, isActive && "ring-1 ring-secondary/40")}>
                    <button
                      onClick={() => { toggle(t.id); setActiveTribe(t.id); }}
                      className="w-full px-3 py-2 flex items-center gap-2 text-start"
                      aria-expanded={isOpen}
                    >
                      <span className="text-base">{t.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{t.name} <span className="text-[10px] text-muted-foreground font-normal">· {t.members}</span></div>
                        <div className="text-[10px] text-muted-foreground truncate">{t.desc}</div>
                      </div>
                      <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-2 text-[11px] text-muted-foreground italic">&quot;{t.preview}&quot;</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {/* Custom creator */}
              {creating && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-dashed border-border/60 bg-card p-3 space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Create a tribe</div>
                  <div className="flex items-center gap-2">
                    <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value.slice(0, 2))} className="w-10 text-center bg-muted/40 rounded-lg py-1.5 text-base outline-none" aria-label="Emoji" />
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tribe name" className="flex-1 bg-muted/40 rounded-lg px-2 py-1.5 text-sm outline-none" />
                  </div>
                  <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="One-line description" className="w-full bg-muted/40 rounded-lg px-2 py-1.5 text-xs outline-none" />
                  <div className="flex items-center gap-2">
                    <button onClick={suggestTribe} disabled={suggesting} className="text-[10px] px-2 py-1 rounded-full glass hover:bg-muted/60 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-secondary" /> {suggesting ? "Thinking…" : "AI suggest"}
                    </button>
                    <button onClick={createTribe} className="ml-auto px-3 py-1 rounded-full bg-gradient-hero text-cream text-[10px] flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Create
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Active tribe messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="rounded-xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent p-2.5 text-[11px] text-secondary flex items-start gap-1.5">
                <Crown className="w-3 h-3 mt-0.5 shrink-0" /> Tribe rules: kind, on-topic, no spam. AI moderates on-device.
              </div>
              {tribeMsgs.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("flex items-start gap-2.5", m.you && "flex-row-reverse")}>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0",
                    m.you ? "bg-gradient-gold text-brand-charcoal" : "bg-gradient-to-br from-steel/30 to-primary/20 text-foreground")}>
                    {m.user[0]}
                  </div>
                  <div className={cn("max-w-[80%] px-3.5 py-2 rounded-2xl text-sm",
                    m.you ? "bg-gradient-hero text-cream rounded-br-md" : "bg-card border border-border/50 rounded-bl-md")}>
                    <div className="text-[10px] opacity-70 mb-0.5">{m.user}</div>
                    {m.text}
                  </div>
                </motion.div>
              ))}
              {tribeMsgs.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">No messages yet. Start the conversation.</div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-border/40 px-3 py-2.5">
              <div className="glass-strong rounded-full px-3 py-2 flex items-center gap-2 shadow-float">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <input
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  className="flex-1 bg-transparent outline-none text-sm py-1.5"
                  placeholder={`Message ${activeMeta?.name || "tribe"}`}
                />
                <button onClick={send} disabled={!input.trim()} className="w-9 h-9 rounded-full bg-gradient-hero text-cream flex items-center justify-center disabled:opacity-40" aria-label="Send">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => { toast.success("AI summary ready", { description: `${tribeMsgs.length} messages · key points extracted` }); }}
                className="mt-2 w-full text-[11px] text-secondary flex items-center justify-center gap-1 py-1"
              >
                <Sparkles className="w-3 h-3" /> Summarize this tribe
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

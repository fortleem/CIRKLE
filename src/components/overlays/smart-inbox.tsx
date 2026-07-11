"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Inbox, Sparkles, ChevronDown, Loader2, Reply, Send, Pin, Archive,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Item {
  id: string;
  from: string;
  subject: string;
  preview: string;
  time: string;
}

interface Category {
  id: string;
  label: string;
  icon: typeof Reply;
  tint: string;
  items: Item[];
}

const INITIAL: Category[] = [
  {
    id: "urgent",
    label: "Urgent",
    icon: Reply,
    tint: "from-accent/20 to-transparent border-accent/40",
    items: [
      { id: "u1", from: "User", subject: "Brand brief — final call", preview: "Will send tonight. Can we tighten the intro?", time: "2m" },
      { id: "u2", from: "Cirkle Governance", subject: "Vote closes in 2d", preview: "Proposal: open-source the moderation rubric.", time: "1h" },
    ],
  },
  {
    id: "action",
    label: "Action",
    icon: Pin,
    tint: "from-secondary/20 to-transparent border-secondary/40",
    items: [
      { id: "a1", from: "User", subject: "4 mockups shared", preview: "Feedback welcome before Friday.", time: "3h" },
      { id: "a2", from: "Design Workspace", subject: "Sprint review Thursday", preview: "Add your slides by Wed EOD.", time: "5h" },
    ],
  },
  {
    id: "group",
    label: "Group",
    icon: Inbox,
    tint: "from-primary/20 to-transparent border-primary/40",
    items: [
      { id: "g1", from: "Riyadh Designers", subject: "12 new messages", preview: "User: anyone up for the Diriyah meetup?", time: "20m" },
      { id: "g2", from: "Family", subject: "8 new messages", preview: "Mom: dinner Friday, bring dessert.", time: "1h" },
    ],
  },
  {
    id: "channels",
    label: "Channels",
    icon: Sparkles,
    tint: "from-steel/20 to-transparent border-steel/40",
    items: [
      { id: "c1", from: "Riyadh Daily", subject: "Diriyah Light Festival opens", preview: "Threads of gold return for the 4th season.", time: "1h" },
      { id: "c2", from: "Cirkle Updates", subject: "v12.1 ships tonight", preview: "Privacy Shield gets a new triple-tap trigger.", time: "Yesterday" },
    ],
  },
  {
    id: "later",
    label: "Read later",
    icon: Archive,
    tint: "from-muted to-transparent border-border/50",
    items: [
      { id: "l1", from: "Bank Statement", subject: "May statement available", preview: "Your monthly statement is ready.", time: "6h" },
      { id: "l2", from: "Newsletter", subject: "Calm tech — 12-min read", preview: "Curated for your morning coffee.", time: "Yesterday" },
    ],
  },
];

const AI_SUMMARY = "You have 2 urgent items needing decisions today. User is waiting on design feedback by Friday. Family dinner is locked in for Friday evening — you're bringing dessert.";

const AUTO_REPLIES = [
  "Got it — I'll review tonight.",
  "Thanks! On it now.",
  "Can we sync at 4 PM?",
  "Approved ✅",
];

export function SmartInbox({ open, onClose }: Props) {
  const [cats, setCats] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({
    urgent: true, action: true, group: false, channels: false, later: false,
  });
  const [active, setActive] = useState<Item | null>(null);
  const loading = open && !loaded;

  useEffect(() => {
    if (open && !loaded) {
      const t = setTimeout(() => {
        setCats(INITIAL);
        setLoaded(true);
        toast.success("Inbox prioritized", { description: "5 categories · 10 items" });
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [open, loaded]);

  const toggleCat = (id: string) => setOpenCats((o) => ({ ...o, [id]: !o[id] }));

  const archive = (catId: string, itemId: string) => {
    setCats((cs) => cs.map((c) => c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c));
    setActive(null);
    toast.success("Archived");
  };

  const sendReply = (text: string) => {
    if (!active) return;
    toast.success("Auto-reply sent", { description: `"${text}"` });
    setActive(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140]"
            style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Smart Inbox"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-accent/20 border border-secondary/40 flex items-center justify-center shrink-0">
                {loading ? <Loader2 className="w-5 h-5 text-secondary animate-spin" /> : <Inbox className="w-5 h-5 text-secondary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Smart Inbox</div>
                <div className="text-[11px] text-muted-foreground">5 categories · AI-prioritized</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-center py-12">
                  <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                  <div className="text-sm">Cirkle AI is sorting your inbox…</div>
                </div>
              ) : (
                <div className="px-5 py-4 space-y-4">
                  {/* AI 3-sentence summary */}
                  <section className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent p-4">
                    <div className="text-[10px] uppercase tracking-widest text-secondary flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3 h-3" /> AI summary · 3 sentences
                    </div>
                    <p className="text-sm leading-relaxed">{AI_SUMMARY}</p>
                  </section>

                  {/* 5 collapsible categories */}
                  {cats.map((c) => {
                    const isOpen = openCats[c.id];
                    return (
                      <section key={c.id} className={cn("rounded-2xl border bg-gradient-to-br overflow-hidden", c.tint)}>
                        <button
                          onClick={() => toggleCat(c.id)}
                          className="w-full px-4 py-3 flex items-center gap-3 text-start"
                          aria-expanded={isOpen}
                        >
                          <div className="w-8 h-8 rounded-lg glass flex items-center justify-center shrink-0">
                            <c.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{c.label}</div>
                            <div className="text-[10px] text-muted-foreground">{c.items.length} item{c.items.length === 1 ? "" : "s"}</div>
                          </div>
                          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="w-4 h-4" />
                          </motion.span>
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="px-2 pb-2 space-y-1">
                                {c.items.length === 0 ? (
                                  <div className="text-center text-xs text-muted-foreground py-4">All clear ✨</div>
                                ) : c.items.map((it) => (
                                  <button
                                    key={it.id}
                                    onClick={() => setActive(it)}
                                    className="w-full rounded-xl px-3 py-2.5 text-start bg-card/80 hover:bg-card transition border border-border/40"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium truncate flex-1">{it.from}</span>
                                      <span className="text-[10px] text-muted-foreground shrink-0">{it.time}</span>
                                    </div>
                                    <div className="text-xs truncate">{it.subject}</div>
                                    <div className="text-[11px] text-muted-foreground truncate">{it.preview}</div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active item + auto-reply chips */}
            <AnimatePresence>
              {active && (
                <motion.div
                  initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 240, damping: 26 }}
                  className="border-t border-border/60 glass-strong px-5 py-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{active.from}</div>
                      <div className="font-display text-lg">{active.subject}</div>
                      <p className="text-sm text-muted-foreground mt-1">{active.preview}</p>
                    </div>
                    <button onClick={() => archive("urgent", active.id)} className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0" aria-label="Archive">
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {AUTO_REPLIES.map((r) => (
                      <button
                        key={r}
                        onClick={() => sendReply(r)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-border/50 bg-card hover:bg-muted/60 transition flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-secondary" /> {r}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => sendReply("On it 👍")} className="px-3 py-2 rounded-full bg-gradient-hero text-cream text-xs flex items-center justify-center gap-1">
                      <Send className="w-3.5 h-3.5" /> Quick reply
                    </button>
                    <button onClick={() => { toast("Opening full thread…"); }} className="px-3 py-2 rounded-full glass text-xs flex items-center justify-center gap-1">
                      <Reply className="w-3.5 h-3.5" /> Open thread
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

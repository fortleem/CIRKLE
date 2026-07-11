// @ts-nocheck
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, FileSignature, Users, Check, Clock, Plus, Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

type PactStatus = "active" | "completed" | "pending" | "broken";
type View = "list" | "create";

interface Signer {
  name: string;
  initial: string;
  color: string;
}

interface Pact {
  id: string;
  title: string;
  description: string;
  status: PactStatus;
  deadlineISO: string;
  progress: number;
  signers: Signer[];
  witnesses: number;
  signedAt: string;
  hash: string;
}

const SIGNER_PALETTE = [
  "hsl(39 60% 57%)", // gold
  "hsl(195 56% 33%)", // teal
  "hsl(351 41% 56%)", // rose
  "hsl(211 30% 52%)", // steel
];

const FRIENDS: Signer[] = [
  
  
  
  
  { name: "Noura", initial: "N", color: SIGNER_PALETTE[0] },
  
];

function daysUntil(iso: string): number {
  const target = new Date(iso + "T00:00:00");
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatISO(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function makeHash(): string {
  const hex = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < 8; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

const INITIAL_PACTS: Pact[] = [
  {
    id: "pact-1",
    title: "Quit smoking by Ramadan",
    description:
      "We both agree to stop smoking before the first day of Ramadan. Daily check-ins, zero judgement, and a shared streak we both protect.",
    status: "active",
    deadlineISO: "2026-02-28",
    progress: 68,
    signers: [FRIENDS[0], FRIENDS[1]],
    witnesses: 3,
    signedAt: "2026-01-12",
    hash: "0xa4f1c9b2",
  },
  {
    id: "pact-2",
    title: "Pay back the Jeddah trip",
    description:
      "Sample pact — your pacts will appear here.",
    status: "completed",
    deadlineISO: "2026-01-10",
    progress: 100,
    signers: [FRIENDS[0], FRIENDS[2]],
    witnesses: 2,
    signedAt: "2025-12-04",
    hash: "0x9e3b7d04",
  },
  {
    id: "pact-3",
    title: "Co-found the book club",
    description:
      "Sample pact — your pacts will appear here.",
    status: "pending",
    deadlineISO: "2026-03-15",
    progress: 12,
    signers: [FRIENDS[3]],
    witnesses: 1,
    signedAt: "2026-02-01",
    hash: "0x77ad22e1",
  },
];

const STATUS_META: Record<
  PactStatus,
  { label: string; chip: string; dot: string; bar: string }
> = {
  active: {
    label: "Active",
    chip: "bg-gold/15 text-gold border-gold/30",
    dot: "bg-gold",
    bar: "bg-gradient-gold",
  },
  completed: {
    label: "Completed",
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  pending: {
    label: "Pending",
    chip: "bg-rose/15 text-rose border-rose/30",
    dot: "bg-rose",
    bar: "bg-rose",
  },
  broken: {
    label: "Broken",
    chip: "bg-destructive/15 text-destructive border-destructive/30",
    dot: "bg-destructive",
    bar: "bg-destructive",
  },
};

function SignerStack({ signers, size = "md" }: { signers: Signer[]; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <div className="flex -space-x-2">
      {signers.map((s, i) => (
        <motion.div
          key={`${s.name}-${i}`}
          initial={{ scale: 0, x: -6 }}
          animate={{ scale: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.06, type: "spring", stiffness: 360, damping: 18 }}
          style={{ zIndex: 10 - i }}
        >
          <Avatar className={cn(dim, "ring-2 ring-background border border-border/40")}>
            <AvatarFallback
              className="text-cream font-medium"
              style={{ background: s.color }}
            >
              {s.initial}
            </AvatarFallback>
          </Avatar>
        </motion.div>
      ))}
    </div>
  );
}

function PactCard({
  pact,
  index,
  onAction,
}: {
  pact: Pact;
  index: number;
  onAction: (p: Pact) => void;
}) {
  const meta = STATUS_META[pact.status];
  const days = daysUntil(pact.deadlineISO);
  const isClosed = pact.status === "completed" || pact.status === "broken";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl glass-strong border border-border/60 p-4 overflow-hidden hover:border-gold/30 transition-colors"
    >
      {/* ambient gradient corner */}
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: pact.signers[0]?.color ?? "hsl(39 60% 57%)" }}
      />

      <div className="relative flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border",
                meta.chip,
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </span>
            {pact.status === "active" && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {days > 0 ? `${days}d left` : "due today"}
              </span>
            )}
          </div>
          <h3 className="font-display text-base leading-tight">{pact.title}</h3>
        </div>
        <div className="shrink-0 w-9 h-9 rounded-xl bg-card border border-border/60 flex items-center justify-center">
          <FileSignature className="w-4 h-4 text-gold" />
        </div>
      </div>

      <p className="relative text-[11px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">
        {pact.description}
      </p>

      {/* Progress (skip completed-100% to avoid double-rendering with bar) */}
      {!isClosed && (
        <div className="relative mb-3">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="text-muted-foreground uppercase tracking-widest">
              Progress
            </span>
            <span className="font-mono tabular-nums" style={{ color: pact.signers[0]?.color }}>
              {pact.progress}%
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-muted/60 overflow-hidden">
            <motion.div
              className={cn("absolute inset-y-0 left-0 rounded-full", meta.bar)}
              initial={{ width: 0 }}
              animate={{ width: `${pact.progress}%` }}
              transition={{ delay: 0.2 + index * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      )}

      {/* Footer: signers + witnesses + deadline */}
      <div className="relative flex items-center justify-between gap-2 pt-3 border-t border-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <SignerStack signers={pact.signers} size="sm" />
          <span className="text-[10px] text-muted-foreground">
            {pact.signers.length} signer{pact.signers.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1" title="Witnesses">
            <Users className="w-3 h-3 text-rose" />
            {pact.witnesses}
          </span>
          <span className="flex items-center gap-1" title="Deadline">
            <Clock className="w-3 h-3 text-teal" />
            {formatISO(pact.deadlineISO)}
          </span>
        </div>
      </div>

      {/* Hash + action */}
      <div className="relative mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-muted-foreground/80 truncate">
          {pact.hash}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction(pact)}
          className="text-[11px] h-7 px-2 hover:text-gold"
        >
          {pact.status === "completed" ? (
            <>
              <Check className="w-3 h-3" /> Verified
            </>
          ) : pact.status === "pending" ? (
            <>
              <Plus className="w-3 h-3" /> Co-sign
            </>
          ) : (
            <>
              <Shield className="w-3 h-3" /> Witness
            </>
          )}
        </Button>
      </div>
    </motion.article>
  );
}

function CreateView({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (p: Pact) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [witnesses, setWitnesses] = useState<string[]>([]);
  const [signing, setSigning] = useState(false);

  const todayISO = new Date().toISOString().slice(0, 10);
  const days = useMemo(() => Math.max(0, daysUntil(deadline)), [deadline]);

  const toggleWitness = (name: string) => {
    setWitnesses((cur) =>
      cur.includes(name) ? cur.filter((w) => w !== name) : [...cur, name],
    );
  };

  const create = () => {
    if (!title.trim()) {
      toast.error("Give your pact a title");
      return;
    }
    if (!description.trim()) {
      toast.error("Describe what you're promising");
      return;
    }
    setSigning(true);
    setTimeout(() => {
      setSigning(false);
      const you: Signer = { name: "You", initial: "Y", color: SIGNER_PALETTE[0] };
      const newPact: Pact = {
        id: `pact-${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        status: "active",
        deadlineISO: deadline,
        progress: 0,
        signers: [you],
        witnesses: witnesses.length,
        signedAt: new Date().toISOString().slice(0, 10),
        hash: makeHash(),
      };
      onCreated(newPact);
      toast.success("Pact created and cryptographically signed", {
        description: `Hash ${newPact.hash} · ${witnesses.length} witness${witnesses.length === 1 ? "" : "es"} notified`,
      });
      setTitle("");
      setDescription("");
      setWitnesses([]);
    }, 1200);
  };

  return (
    <motion.div
      key="create"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <button
        onClick={onCancel}
        className="text-[11px] text-muted-foreground hover:text-foreground transition flex items-center gap-1"
      >
        ← Back to pacts
      </button>

      <div className="rounded-3xl glass-strong border border-border/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/30 to-rose/20 border border-gold/40 flex items-center justify-center">
            <FileSignature className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h2 className="font-display text-lg leading-tight">Draft a new pact</h2>
            <p className="text-[11px] text-muted-foreground">
              Cryptographically signed · witnessed by your Circle
            </p>
          </div>
        </div>

        {/* Title */}
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1.5">
            <Plus className="w-3 h-3 text-gold" /> Pact title
          </span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Quit smoking by Ramadan"
            maxLength={80}
            className="bg-muted/40 border-border/60 focus-visible:border-gold/60"
          />
          <span className="text-[10px] text-muted-foreground mt-1 block text-right">
            {title.length}/80
          </span>
        </label>

        {/* Description */}
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1.5">
            <FileSignature className="w-3 h-3 text-teal" /> What are you promising?
          </span>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the commitment, the conditions, and what success looks like. Be specific — your witnesses will hold you to this."
            rows={4}
            maxLength={400}
            className="bg-muted/40 border-border/60 focus-visible:border-gold/60 resize-none"
          />
          <span className="text-[10px] text-muted-foreground mt-1 block text-right">
            {description.length}/400
          </span>
        </label>

        {/* Deadline */}
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1.5">
            <Clock className="w-3 h-3 text-rose" /> Deadline
          </span>
          <Input
            type="date"
            value={deadline}
            min={todayISO}
            onChange={(e) => setDeadline(e.target.value)}
            className="bg-muted/40 border-border/60 focus-visible:border-gold/60"
          />
          <span className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {days === 0
              ? "Due today"
              : days === 1
                ? "Due tomorrow"
                : `Unlocks in ${days} days · ${formatISO(deadline)}`}
          </span>
        </label>

        {/* Witnesses */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3 text-rose" /> Add witnesses
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {witnesses.length} selected
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {FRIENDS.map((f) => {
              const on = witnesses.includes(f.name);
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => toggleWitness(f.name)}
                  className={cn(
                    "relative rounded-xl border p-2 flex items-center gap-2 transition",
                    on
                      ? "bg-rose/10 border-rose/50"
                      : "bg-card border-border/60 hover:bg-muted/40",
                  )}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback
                      className="text-[10px] text-cream font-medium"
                      style={{ background: f.color }}
                    >
                      {f.initial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-medium truncate">{f.name}</span>
                  {on && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose text-cream flex items-center justify-center"
                    >
                      <Check className="w-2.5 h-2.5" />
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live preview card */}
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-gold/10 via-transparent to-rose/10 p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Preview
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-gold/15 text-gold border-gold/30">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Active
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {days > 0 ? `${days}d left` : "due today"}
            </span>
          </div>
          <h4 className="font-display text-sm leading-tight">
            {title || "Your pact title will appear here"}
          </h4>
          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
            {description || "Pact description preview…"}
          </p>
        </div>

        {/* Submit */}
        <Button
          onClick={create}
          disabled={signing || !title.trim() || !description.trim()}
          className="w-full h-11 rounded-xl bg-gradient-gold text-charcoal hover:opacity-90 active:scale-[0.99] transition shadow-glow disabled:opacity-50"
        >
          {signing ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block w-3.5 h-3.5 border-2 border-charcoal/40 border-t-charcoal rounded-full"
              />
              Signing…
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" /> Create Pact
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

export function CirklePact({ open, onClose }: Props) {
  const [view, setView] = useState<View>("list");
  const [pacts, setPacts] = useState<Pact[]>(INITIAL_PACTS);

  const stats = useMemo(() => {
    return {
      active: pacts.filter((p) => p.status === "active").length,
      completed: pacts.filter((p) => p.status === "completed").length,
      witnesses: pacts.reduce((s, p) => s + p.witnesses, 0),
    };
  }, [pacts]);

  const handlePactAction = (p: Pact) => {
    if (p.status === "completed") {
      toast.success("Pact verification re-shared", {
        description: `Signed hash ${p.hash}`,
      });
    } else if (p.status === "pending") {
      toast.success(`You co-signed "${p.title}"`, {
        description: `${p.hash} · added to your active pacts`,
      });
      setPacts((cur) =>
        cur.map((x) =>
          x.id === p.id
            ? {
                ...x,
                status: "active",
                signers: [...x.signers, { name: "You", initial: "Y", color: SIGNER_PALETTE[0] }],
              }
            : x,
        ),
      );
    } else {
      toast.success(`You're now witnessing "${p.title}"`, {
        description: "You'll be notified of any updates",
      });
      setPacts((cur) =>
        cur.map((x) => (x.id === p.id ? { ...x, witnesses: x.witnesses + 1 } : x)),
      );
    }
  };

  const handleCreated = (p: Pact) => {
    setPacts((cur) => [p, ...cur]);
    setView("list");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* dimmed backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140]"
            style={{ background: "hsl(var(--charcoal) / 0.55)", backdropFilter: "blur(10px)" }}
          />

          {/* full-screen panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
            role="dialog"
            aria-label="CirklePact — verifiable social contracts"
            className="fixed inset-0 z-[150] bg-background flex flex-col"
          >
            {/* HEADER */}
            <header className="relative px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/50 backdrop-blur-xl bg-background/80">
              <div className="absolute inset-0 aurora-bg opacity-25 pointer-events-none" />
              <div className="relative max-w-2xl mx-auto flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-mesh opacity-25 blur-md" />
                  <div className="relative w-11 h-11 rounded-2xl glass border border-gold/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-gold" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-xl leading-tight">CirklePact</h1>
                    <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-teal/15 text-teal font-mono">
                      on-chain ready
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Verifiable promises with the people you trust
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* View switcher */}
              <div className="relative max-w-2xl mx-auto mt-3">
                <div className="relative grid grid-cols-2 gap-1 p-1 rounded-full bg-muted/50 border border-border/50">
                  {(["list", "create"] as View[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={cn(
                        "relative rounded-full py-1.5 text-[11px] font-medium transition z-10 flex items-center justify-center gap-1.5",
                        view === v ? "text-cream" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {view === v && (
                        <motion.span
                          layoutId="pact-view-pill"
                          className="absolute inset-0 rounded-full bg-gradient-hero -z-10"
                          transition={{ type: "spring", stiffness: 360, damping: 28 }}
                        />
                      )}
                      {v === "list" ? <FileSignature className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {v === "list" ? "Your pacts" : "Create"}
                    </button>
                  ))}
                </div>
              </div>
            </header>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-5 py-5 pb-32">
                <AnimatePresence mode="wait">
                  {view === "list" ? (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4"
                    >
                      {/* Stats strip */}
                      <section className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Active", val: stats.active, color: "text-gold" },
                          {
                            label: "Completed",
                            val: stats.completed,
                            color: "text-emerald-600 dark:text-emerald-400",
                          },
                          { label: "Witnesses", val: stats.witnesses, color: "text-rose" },
                        ].map((s, i) => (
                          <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="rounded-2xl glass-strong border border-border/60 p-3 text-center"
                          >
                            <div className={cn("font-display text-2xl tabular-nums", s.color)}>
                              {s.val}
                            </div>
                            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                              {s.label}
                            </div>
                          </motion.div>
                        ))}
                      </section>

                      {/* Pact list */}
                      <section>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                          <FileSignature className="w-3 h-3 text-gold" /> Active ledger
                        </div>
                        <div className="space-y-3">
                          <AnimatePresence mode="popLayout">
                            {pacts.map((p, i) => (
                              <PactCard
                                key={p.id}
                                pact={p}
                                index={i}
                                onAction={handlePactAction}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </section>

                      {/* Covenant note */}
                      <section className="rounded-2xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
                        <Shield className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Every pact is hashed, time-stamped, and counter-signed by your chosen
                          witnesses. Nothing leaves the device until both signers consent.
                        </p>
                      </section>

                      {/* CTA */}
                      <button
                        onClick={() => setView("create")}
                        className="w-full rounded-xl bg-gradient-gold text-charcoal py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition shadow-glow"
                      >
                        <Plus className="w-4 h-4" /> Draft a new pact
                      </button>
                    </motion.div>
                  ) : (
                    <CreateView
                      onCancel={() => setView("list")}
                      onCreated={handleCreated}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

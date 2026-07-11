"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, ScanLine, Camera, Upload, Loader2, Check, ChevronRight, ChevronLeft,
  Plus, Minus, Wallet, Sparkles, Pencil, type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4;

interface Item {
  id: string;
  name: string;
  qty: number;
  price: number;
  selected: boolean;
  assignedTo: string[]; // friend ids
}

interface Friend {
  id: string;
  name: string;
  color: string;
}

const FRIENDS: Friend[] = [
  { id: "f1", name: "User", color: "from-accent/40 to-accent/10" },
  { id: "f2", name: "User", color: "from-secondary/40 to-secondary/10" },
  { id: "f3", name: "User", color: "from-primary/40 to-primary/10" },
  { id: "f4", name: "User", color: "from-steel/40 to-steel/10" },
];

const INITIAL_ITEMS: Item[] = [
  { id: "i1", name: "Espresso", qty: 2, price: 18, selected: true, assignedTo: [] },
  { id: "i2", name: "Cappuccino", qty: 3, price: 18, selected: true, assignedTo: [] },
  { id: "i3", name: "Croissant", qty: 2, price: 14, selected: true, assignedTo: [] },
  { id: "i4", name: "Cheesecake", qty: 1, price: 24, selected: true, assignedTo: [] },
];

const TIPS = [
  { pct: 0, label: "None" },
  { pct: 10, label: "10%" },
  { pct: 15, label: "15%" },
  { pct: 18, label: "18%" },
];

const STEP_LABELS = ["Upload", "Review", "Split", "Request"] as const;

export function ReceiptSplit({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [splitMode, setSplitMode] = useState<"even" | "item">("even");
  const [includedFriends, setIncludedFriends] = useState<Record<string, boolean>>(
    Object.fromEntries(FRIENDS.map((f) => [f.id, true]))
  );
  const [tipPct, setTipPct] = useState(10);
  const [customTip, setCustomTip] = useState("");
  const [editTip, setEditTip] = useState(false);

  const startScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setStep(2);
    }, 2000);
  };

  const enterManually = () => {
    setItems(INITIAL_ITEMS);
    setStep(2);
  };

  const updateItem = (id: string, patch: Partial<Item>) => {
    setItems((cs) => cs.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const toggleAssign = (itemId: string, friendId: string) => {
    setItems((cs) =>
      cs.map((it) => {
        if (it.id !== itemId) return it;
        const has = it.assignedTo.includes(friendId);
        return { ...it, assignedTo: has ? it.assignedTo.filter((x) => x !== friendId) : [...it.assignedTo, friendId] };
      })
    );
  };

  const assignAll = (itemId: string) => {
    setItems((cs) =>
      cs.map((it) =>
        it.id === itemId ? { ...it, assignedTo: FRIENDS.filter((f) => includedFriends[f.id]).map((f) => f.id) } : it
      )
    );
  };

  const selectedItems = items.filter((i) => i.selected);
  const subtotal = selectedItems.reduce((s, i) => s + i.price * i.qty, 0);
  const vat = subtotal * 0.15;
  const includedCount = FRIENDS.filter((f) => includedFriends[f.id]).length;
  const tipPctNum = editTip && customTip ? Math.max(0, parseFloat(customTip) || 0) : tipPct;
  const tip = subtotal * (tipPctNum / 100);
  const total = subtotal + vat + tip;
  const perPerson = includedCount > 0 ? total / includedCount : 0;

  const itemShares: Record<string, number> = (() => {
    if (splitMode !== "item") return {};
    const shares: Record<string, number> = {};
    FRIENDS.forEach((f) => { if (includedFriends[f.id]) shares[f.id] = 0; });
    const perFriendItems: Record<string, number> = {};
    FRIENDS.forEach((f) => { if (includedFriends[f.id]) perFriendItems[f.id] = 0; });
    let unassigned = 0;
    selectedItems.forEach((it) => {
      const lineTotal = it.price * it.qty + (it.price * it.qty * 0.15) + (it.price * it.qty * (tipPctNum / 100));
      if (it.assignedTo.length === 0 || it.assignedTo.every((id) => !includedFriends[id])) {
        unassigned += lineTotal;
      } else {
        const splitBetween = it.assignedTo.filter((id) => includedFriends[id]);
        splitBetween.forEach((id) => {
          perFriendItems[id] = (perFriendItems[id] || 0) + lineTotal / splitBetween.length;
        });
      }
    });
    if (unassigned > 0 && includedCount > 0) {
      FRIENDS.forEach((f) => {
        if (includedFriends[f.id]) perFriendItems[f.id] += unassigned / includedCount;
      });
    }
    Object.keys(perFriendItems).forEach((k) => { shares[k] = perFriendItems[k]; });
    return shares;
  })();

  const request = () => {
    const names = FRIENDS.filter((f) => includedFriends[f.id]).map((f) => f.name).join(", ");
    toast.success("Split request sent", {
      description: `${includedCount} friends · ${names} · via Cirkle Pay`,
    });
    setTimeout(() => {
      setStep(1);
      setItems(INITIAL_ITEMS);
      setSplitMode("even");
      onClose();
    }, 600);
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
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog" aria-label="Receipt Split"
            className="fixed inset-x-0 bottom-0 top-[6vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            <header className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/20 border border-secondary/40 flex items-center justify-center shrink-0">
                <ScanLine className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl">Receipt Split</div>
                <div className="text-[11px] text-muted-foreground">AI-powered bill splitting</div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Stepper */}
            <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
              {STEP_LABELS.map((label, i) => {
                const idx = (i + 1) as Step;
                const active = step === idx;
                const done = step > idx;
                return (
                  <div key={label} className="flex-1 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <motion.div
                        animate={active ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 1.4, repeat: active ? Infinity : 0 }}
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 transition",
                          done ? "bg-secondary text-secondary-foreground" : active ? "bg-gradient-hero text-cream" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {done ? <Check className="w-3.5 h-3.5" /> : idx}
                      </motion.div>
                      <span className={cn("text-[11px] hidden sm:block truncate", active ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</span>
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                      <div className={cn("flex-1 h-0.5 rounded-full transition", done ? "bg-secondary" : "bg-border")} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <AnimatePresence mode="wait">
                {/* Step 1: Upload */}
                {step === 1 && (
                  <motion.section
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-3"
                  >
                    <button
                      onClick={startScan}
                      disabled={scanning}
                      className="w-full rounded-3xl border-2 border-dashed border-border hover:border-secondary/60 transition p-8 flex flex-col items-center justify-center gap-3 min-h-[260px] relative overflow-hidden"
                    >
                      <AnimatePresence mode="wait">
                        {scanning ? (
                          <motion.div
                            key="scanning"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-3"
                          >
                            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-secondary/30 to-accent/20 flex items-center justify-center">
                              <ScanLine className="w-8 h-8 text-secondary" />
                              <motion.div
                                animate={{ y: [-32, 32, -32] }}
                                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute left-1/2 -translate-x-1/2 w-12 h-0.5 bg-secondary shadow-[0_0_12px_hsl(var(--secondary))]"
                              />
                            </div>
                            <div className="text-sm font-medium flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning receipt…
                            </div>
                            <div className="text-[11px] text-muted-foreground">AI is reading items, prices &amp; tax</div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-3"
                          >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-accent/10 border border-secondary/40 flex items-center justify-center">
                              <Camera className="w-7 h-7 text-secondary" />
                            </div>
                            <div className="font-display text-lg">Snap or upload a receipt</div>
                            <div className="text-[11px] text-muted-foreground text-center max-w-xs">Point your camera at the bill. Cirkle AI extracts every line, tax, and tip in seconds.</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] px-2 py-1 rounded-full glass flex items-center gap-1"><Camera className="w-3 h-3" /> Camera</span>
                              <span className="text-[10px] px-2 py-1 rounded-full glass flex items-center gap-1"><Upload className="w-3 h-3" /> Gallery</span>
                              <span className="text-[10px] px-2 py-1 rounded-full glass flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI parsed</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                    <button
                      onClick={enterManually}
                      className="w-full text-xs text-secondary hover:text-accent transition flex items-center justify-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Enter manually
                    </button>
                  </motion.section>
                )}

                {/* Step 2: Review */}
                {step === 2 && (
                  <motion.section
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-3"
                  >
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-secondary" /> AI extracted · review &amp; edit
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/60">
                      {items.map((it) => (
                        <div key={it.id} className="flex items-center gap-3 px-3 py-2.5">
                          <button
                            onClick={() => updateItem(it.id, { selected: !it.selected })}
                            className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition",
                              it.selected ? "bg-secondary border-secondary text-secondary-foreground" : "border-border bg-muted"
                            )}
                            aria-label={`Select ${it.name}`}
                          >
                            {it.selected && <Check className="w-3 h-3" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{it.name}</div>
                            <div className="text-[11px] text-muted-foreground">× {it.qty}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground">SAR</span>
                            <input
                              type="number"
                              value={it.price}
                              onChange={(e) => updateItem(it.id, { price: parseFloat(e.target.value) || 0 })}
                              className="w-16 bg-muted/40 rounded-lg px-2 py-1 text-sm text-right outline-none border border-border/50 focus:border-secondary/60"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 space-y-1.5 text-sm">
                      <Row label="Subtotal" value={`SAR ${subtotal.toFixed(2)}`} />
                      <Row label="VAT (15%)" value={`SAR ${vat.toFixed(2)}`} muted />
                      <div className="border-t border-border/50 pt-1.5">
                        <Row label="Total" value={`SAR ${(subtotal + vat).toFixed(2)}`} bold />
                      </div>
                    </div>
                  </motion.section>
                )}

                {/* Step 3: Split */}
                {step === 3 && (
                  <motion.section
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-3"
                  >
                    {/* Split mode toggle */}
                    <div className="rounded-2xl border border-border/60 bg-card p-1 flex">
                      {(["even", "item"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setSplitMode(m)}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-medium transition capitalize",
                            splitMode === m ? "bg-gradient-hero text-cream" : "text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          Split {m === "even" ? "evenly" : "by item"}
                        </button>
                      ))}
                    </div>

                    {/* Friends */}
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Who's included?</div>
                    <div className="grid grid-cols-2 gap-2">
                      {FRIENDS.map((f) => {
                        const on = includedFriends[f.id];
                        const share = splitMode === "item" ? (itemShares[f.id] || 0) : perPerson;
                        return (
                          <button
                            key={f.id}
                            onClick={() => setIncludedFriends((s) => ({ ...s, [f.id]: !s[f.id] }))}
                            className={cn(
                              "rounded-2xl border p-2.5 flex items-center gap-2 transition text-start",
                              on ? "border-secondary/60 bg-secondary/10" : "border-border/60 bg-card opacity-60"
                            )}
                          >
                            <div className={cn("w-9 h-9 rounded-full bg-gradient-to-br overflow-hidden shrink-0", f.color)}>
                              <div className="w-full h-full flex items-center justify-center text-sm font-medium text-cream">
                                {f.name.charAt(0)}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium truncate">{f.name}</div>
                              {on && (
                                <div className="text-[10px] text-secondary">
                                  SAR {(splitMode === "item" ? share : perPerson).toFixed(2)}
                                </div>
                              )}
                            </div>
                            {on && <Check className="w-3.5 h-3.5 text-secondary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Per-item assignment */}
                    {splitMode === "item" && (
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">Assign each item</div>
                        {selectedItems.map((it) => (
                          <div key={it.id} className="rounded-2xl border border-border/60 bg-card p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-medium">{it.name} × {it.qty}</div>
                              <div className="text-xs text-muted-foreground">SAR {(it.price * it.qty).toFixed(2)}</div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                onClick={() => assignAll(it.id)}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 hover:bg-foreground/15"
                              >
                                Everyone
                              </button>
                              {FRIENDS.map((f) => {
                                const on = it.assignedTo.includes(f.id);
                                const allowed = includedFriends[f.id];
                                if (!allowed) return null;
                                return (
                                  <button
                                    key={f.id}
                                    onClick={() => toggleAssign(it.id, f.id)}
                                    className={cn(
                                      "text-[10px] px-2 py-0.5 rounded-full border transition",
                                      on ? "bg-secondary text-secondary-foreground border-secondary" : "border-border/60 hover:bg-muted/50"
                                    )}
                                  >
                                    {f.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tip */}
                    <div className="rounded-2xl border border-border/60 bg-card p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium">Add tip</div>
                        {editTip ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={customTip}
                              onChange={(e) => setCustomTip(e.target.value)}
                              placeholder="0"
                              className="w-12 bg-muted/40 rounded-lg px-2 py-1 text-xs text-right outline-none border border-border/50"
                            />
                            <span className="text-[10px] text-muted-foreground">%</span>
                            <button
                              onClick={() => { setEditTip(false); setTipPct(customTip ? parseFloat(customTip) || 0 : 0); }}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                            >OK</button>
                          </div>
                        ) : (
                          <button onClick={() => setEditTip(true)} className="text-[10px] text-secondary">Custom</button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {TIPS.map((t) => (
                          <button
                            key={t.pct}
                            onClick={() => { setTipPct(t.pct); setCustomTip(""); setEditTip(false); }}
                            className={cn(
                              "rounded-lg py-1.5 text-[11px] font-medium transition",
                              !editTip && tipPct === t.pct ? "bg-gradient-hero text-cream" : "bg-muted/40 hover:bg-muted/60"
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live calculation */}
                    <div className="rounded-2xl border border-secondary/40 bg-gradient-to-br from-secondary/10 to-transparent p-4 space-y-1.5">
                      <Row label="Subtotal" value={`SAR ${subtotal.toFixed(2)}`} muted />
                      <Row label="VAT (15%)" value={`SAR ${vat.toFixed(2)}`} muted />
                      <Row label={`Tip (${tipPctNum}%)`} value={`SAR ${tip.toFixed(2)}`} muted />
                      <div className="border-t border-border/50 pt-1.5">
                        <Row label="Total" value={`SAR ${total.toFixed(2)}`} bold />
                      </div>
                      <div className="rounded-xl bg-foreground/5 px-3 py-2 mt-1 flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Each pays ({includedCount})</span>
                        <span className="font-display text-lg gradient-text-gold">
                          SAR {(splitMode === "item"
                            ? (Object.values(itemShares).reduce((s, v) => s + v, 0) / Math.max(1, includedCount))
                            : perPerson
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </motion.section>
                )}

                {/* Step 4: Request */}
                {step === 4 && (
                  <motion.section
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-3"
                  >
                    <div className="rounded-3xl border border-secondary/40 bg-gradient-to-br from-secondary/10 to-accent/5 p-5 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 220, damping: 16 }}
                        className="w-14 h-14 rounded-2xl bg-gradient-hero text-cream mx-auto flex items-center justify-center shadow-float"
                      >
                        <Wallet className="w-6 h-6" />
                      </motion.div>
                      <div className="font-display text-2xl mt-3">SAR {total.toFixed(2)}</div>
                      <div className="text-[11px] text-muted-foreground">Total · split between {includedCount} friends</div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
                      {FRIENDS.filter((f) => includedFriends[f.id]).map((f) => {
                        const owes = splitMode === "item" ? (itemShares[f.id] || 0) : perPerson;
                        return (
                          <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className={cn("w-9 h-9 rounded-full bg-gradient-to-br overflow-hidden shrink-0", f.color)}>
                              <div className="w-full h-full flex items-center justify-center text-sm font-medium text-cream">
                                {f.name.charAt(0)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{f.name}</div>
                              <div className="text-[11px] text-muted-foreground">via Cirkle Pay · instant</div>
                            </div>
                            <div className="text-right">
                              <div className="font-display text-base gradient-text-gold">SAR {owes.toFixed(2)}</div>
                              <div className="text-[10px] text-secondary">requests</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Settles instantly between Cirkle users. Non-Cirkle contacts get a payment link via SMS — funds land in your Cirkle Pay within 24h.
                      </p>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>

            {/* Footer nav */}
            <div
              className="px-5 py-3 border-t border-border/50 flex items-center gap-2"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
            >
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  className="px-4 py-2.5 rounded-full glass text-sm flex items-center gap-1.5 hover:bg-muted/60 transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
              {step < 4 && step > 1 && (
                <button
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  disabled={step === 3 && includedCount === 0}
                  className="flex-1 px-4 py-2.5 rounded-full bg-gradient-hero text-cream text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {step === 4 && (
                <button
                  onClick={request}
                  className="flex-1 px-4 py-2.5 rounded-full bg-gradient-gold text-charcoal text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
                >
                  <Wallet className="w-4 h-4" /> Request {includedCount} payments
                </button>
              )}
              {step === 1 && !scanning && (
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-4 py-2.5 rounded-full bg-gradient-hero text-cream text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
                >
                  Use sample receipt <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-xs", muted ? "text-muted-foreground" : "text-foreground", bold && "font-medium")}>{label}</span>
      <span className={cn("text-xs tabular-nums", muted ? "text-muted-foreground" : "text-foreground", bold && "font-display text-base")}>{value}</span>
    </div>
  );
}

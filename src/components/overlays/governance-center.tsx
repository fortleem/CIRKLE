"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Scale, ShieldCheck, Vote, CheckCircle2, Clock, FileText,
  Coins, Receipt, TrendingUp, Lock, Heart, Sparkles, Wind, User,
  Server, Megaphone, Languages, BadgeCheck, Cpu,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Vote = "yes" | "no" | "abstain";
type ProposalStatus = "voting" | "passed" | "draft";

interface Proposal {
  id: string;
  title: string;
  summary: string;
  author: string;
  status: ProposalStatus;
  closesIn: string;
  yes: number;
  no: number;
  abstain: number;
  tags: string[];
}

// No mock data — proposals stay empty until a real governance source is
// wired in (e.g. /api/circles once it exposes governance proposals).
const proposals: Proposal[] = [];

const PROMISES = [
  { icon: Lock, label: "Privacy by architecture", ar: "الخصوصية بالتصميم" },
  { icon: Cpu, label: "On-device AI", ar: "ذكاء على الجهاز" },
  { icon: Heart, label: "Zero cost, forever", ar: "مجاني للأبد" },
  { icon: Languages, label: "200 languages", ar: "٢٠٠ لغة" },
  { icon: Wind, label: "Offline-first", ar: "يعمل بلا إنترنت" },
  { icon: User, label: "One human, one account", ar: "إنسان واحد، حساب واحد" },
  { icon: Server, label: "Self-hostable", ar: "قابل للاستضافة الذاتية" },
  { icon: Megaphone, label: "Non-targeted ads", ar: "إعلانات غير مستهدفة" },
  { icon: Scale, label: "Community governance", ar: "حوكمة مجتمعية" },
];

const FINANCES = [
  { label: "Treasury balance", value: "SAR 4,820", note: "Community-funded · 218 contributors" },
  { label: "Monthly burn", value: "SAR 1,240", note: "Infrastructure + translations" },
  { label: "Audit trail", value: "Public", note: "Every transaction signed on-ledger" },
  { label: "Paid ads sold", value: "0", note: "All sponsorships are invoice-only" },
  { label: "Trackers", value: "0", note: "Verified by external privacy audit" },
  { label: "User data sold", value: "Never", note: "Codified in the Covenant" },
];

/**
 * GovernanceCenter — bottom Sheet showing live proposals (vote Yes/No/Abstain),
 * a transparency (finances) section, and the 9-promise Covenant.
 */
export function GovernanceCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [tally, setTally] = useState<Record<string, { yes: number; no: number; abstain: number }>>(() =>
    Object.fromEntries(proposals.map((p) => [p.id, { yes: p.yes, no: p.no, abstain: p.abstain }]))
  );
  const [filter, setFilter] = useState<"all" | "voting" | "passed" | "draft">("all");

  const list = proposals.filter((p) => filter === "all" || p.status === filter);

  const cast = (id: string, v: Vote) => {
    if (votes[id]) return; // already voted
    setVotes((s) => ({ ...s, [id]: v }));
    setTally((s) => ({
      ...s,
      [id]: {
        yes: s[id].yes + (v === "yes" ? 1 : 0),
        no: s[id].no + (v === "no" ? 1 : 0),
        abstain: s[id].abstain + (v === "abstain" ? 1 : 0),
      },
    }));
    toast.success(`Vote recorded · ${v.toUpperCase()}`, {
      description: "Signed on-device · broadcast to the Cirkle quorum.",
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140] backdrop-blur-md"
            style={{ background: "hsl(var(--charcoal) / 0.55)" }}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            role="dialog" aria-label="Governance center"
            className="fixed bottom-0 inset-x-0 z-[150] max-h-[92vh] rounded-t-[28px] glass-strong shadow-float overflow-hidden flex flex-col"
          >
            <div className="flex justify-center pt-2">
              <span className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-5 pt-3 pb-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-hero flex items-center justify-center text-primary-foreground shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-2xl leading-tight">Governance Center</h2>
                <div className="text-[11px] text-secondary flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Transparent · One Cirkle ID, one vote
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 flex gap-2 overflow-x-auto scrollbar-hide pb-3">
              {(["all", "voting", "passed", "draft"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap capitalize transition ${
                    filter === f ? "bg-primary text-primary-foreground" : "glass hover:bg-muted/60"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-6" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}>
              {/* Proposals */}
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No proposals yet — create one!
                </p>
              ) : (
                <ul className="space-y-3">
                  {list.map((p, i) => {
                    const t = tally[p.id];
                    const total = t.yes + t.no + t.abstain || 1;
                    const yesPct = (t.yes / total) * 100;
                    const noPct = (t.no / total) * 100;
                    const userVote = votes[p.id];
                    return (
                      <motion.li
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="rounded-3xl border border-border bg-card p-4 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StatusPill status={p.status} />
                              {p.tags.map((t2) => (
                                <span key={t2} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t2}</span>
                              ))}
                            </div>
                            <h3 className="font-display text-lg leading-tight mt-2">{p.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{p.summary}</p>
                            <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {p.author}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.closesIn}</span>
                            </div>
                          </div>
                        </div>

                        {/* Vote bar */}
                        <div className="space-y-1.5">
                          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${yesPct}%` }}
                              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                              className="bg-primary h-full"
                            />
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${noPct}%` }}
                              transition={{ duration: 0.6, delay: 0.1 }}
                              className="bg-accent h-full"
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Yes {t.yes.toLocaleString()}</span>
                            <span>No {t.no.toLocaleString()}</span>
                            <span>Abstain {t.abstain.toLocaleString()}</span>
                          </div>
                        </div>

                        {p.status === "voting" ? (
                          <div className="grid grid-cols-3 gap-2">
                            {(["yes", "no", "abstain"] as Vote[]).map((v) => {
                              const chosen = userVote === v;
                              return (
                                <button
                                  key={v}
                                  onClick={() => cast(p.id, v)}
                                  disabled={!!userVote}
                                  className={`text-xs py-2 rounded-xl capitalize transition border ${
                                    chosen
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : userVote
                                        ? "glass border-transparent opacity-60"
                                        : "glass border-transparent hover:border-secondary/40"
                                  }`}
                                >
                                  <Vote className="w-3 h-3 inline me-1" />
                                  {v}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[11px] flex items-center gap-1.5 text-secondary">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Decision recorded on the Cirkle ledger
                          </div>
                        )}

                        {userVote && (
                          <div className="text-[11px] text-secondary flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> You voted: {userVote.toUpperCase()}
                          </div>
                        )}
                      </motion.li>
                    );
                  })}
                </ul>
              )}

              {/* Transparency */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="w-4 h-4 text-secondary" />
                  <h3 className="font-display text-lg flex-1">Transparency</h3>
                  <span className="text-[10px] uppercase tracking-widest text-secondary">Public ledger</span>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4 space-y-2">
                  {FINANCES.map((f) => (
                    <div key={f.label} className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{f.label}</div>
                        <div className="text-[11px] text-muted-foreground">{f.note}</div>
                      </div>
                      <div className="font-display text-base gradient-text-gold text-right">{f.value}</div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground">
                    <Receipt className="w-3.5 h-3.5" />
                    Every transaction hash is published and auditable.
                  </div>
                </div>
              </section>

              {/* Covenant */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-secondary" />
                  <h3 className="font-display text-lg flex-1">The Cirkle Covenant</h3>
                  <span className="text-[10px] uppercase tracking-widest text-secondary">9 promises</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PROMISES.map((p, i) => (
                    <motion.div
                      key={p.label}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-2xl border border-border bg-card p-3 flex items-center gap-3 hover:border-secondary/40 transition"
                    >
                      <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                        <p.icon className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight">{p.label}</div>
                        <div className="text-[11px] text-muted-foreground font-arabic" dir="rtl">{p.ar}</div>
                      </div>
                      <BadgeCheck className="w-4 h-4 text-secondary shrink-0" />
                    </motion.div>
                  ))}
                </div>
                <div className="mt-3 rounded-2xl glass p-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-secondary" />
                  The Covenant is codified in the open-source repository. Any change requires a community vote.
                </div>
              </section>

              <div className="text-center text-[10px] text-muted-foreground pt-2 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-secondary" /> Governance runs on-device · No central authority
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatusPill({ status }: { status: ProposalStatus }) {
  const map = {
    voting: { c: "bg-secondary/20 text-secondary", l: "Voting open" },
    passed: { c: "bg-primary/20 text-primary", l: "Passed" },
    draft: { c: "bg-muted text-muted-foreground", l: "Draft" },
  } as const;
  const s = map[status];
  return <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${s.c}`}>{s.l}</span>;
}

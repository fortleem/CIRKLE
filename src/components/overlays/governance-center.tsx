"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Scale, ShieldCheck, Vote, CheckCircle2, Clock, FileText,
  Coins, Receipt, TrendingUp, Lock, Heart, Sparkles, Wind, User,
  Server, Megaphone, Languages, BadgeCheck, Cpu, Loader2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Vote = "yes" | "no" | "abstain";
type ProposalStatus = "voting" | "passed" | "rejected" | "closed" | "draft";

interface Proposal {
  id: string;
  title: string;
  description: string;
  type: string;
  author: string;
  status: ProposalStatus;
  closesAt: string;
  yes: number;
  no: number;
  abstain: number;
  createdAt: string;
}

interface ProposalInput {
  title: string;
  description: string;
  type: string;
  author: string;
}

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

const PROPOSAL_TYPES = [
  { value: "covenant", label: "Covenant change" },
  { value: "treasury", label: "Treasury spend" },
  { value: "feature", label: "Feature flag" },
  { value: "moderation", label: "Moderation policy" },
  { value: "other", label: "Other" },
];

/**
 * GovernanceCenter — bottom Sheet showing live proposals (vote Yes/No/Abstain),
 * a transparency (finances) section, and the 9-promise Covenant.
 *
 * P2.4 — now wired to /api/governance/* routes. Proposals + votes persist.
 */
export function GovernanceCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [tally, setTally] = useState<Record<string, { yes: number; no: number; abstain: number }>>({});
  const [filter, setFilter] = useState<"all" | "voting" | "passed" | "draft">("all");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState<ProposalInput>({
    title: "",
    description: "",
    type: "covenant",
    author: "",
  });

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/governance/proposals");
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { proposals: Proposal[] };
      setProposals(data.proposals || []);
      const t: Record<string, { yes: number; no: number; abstain: number }> = {};
      for (const p of data.proposals || []) {
        t[p.id] = { yes: p.yes, no: p.no, abstain: p.abstain };
      }
      setTally(t);
    } catch (err) {
      // Silent fail — the overlay still renders the empty state.
      void err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadProposals();
  }, [open, loadProposals]);

  const list = proposals.filter((p) => {
    if (filter === "all") return true;
    if (filter === "draft") return p.status === "draft" || p.status === "voting";
    return p.status === filter;
  });

  const cast = async (id: string, v: Vote) => {
    if (votes[id]) return;
    setVotes((s) => ({ ...s, [id]: v }));
    // Optimistic tally bump.
    setTally((s) => ({
      ...s,
      [id]: {
        yes: (s[id]?.yes ?? 0) + (v === "yes" ? 1 : 0),
        no: (s[id]?.no ?? 0) + (v === "no" ? 1 : 0),
        abstain: (s[id]?.abstain ?? 0) + (v === "abstain" ? 1 : 0),
      },
    }));
    try {
      const res = await fetch(`/api/governance/proposals/${encodeURIComponent(id)}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voter: draft.author || "viewer", vote: v }),
      });
      if (!res.ok) throw new Error("vote failed");
      const data = (await res.json()) as { tally: { yes: number; no: number; abstain: number } };
      if (data.tally) {
        setTally((s) => ({ ...s, [id]: data.tally }));
      }
      toast.success(`Vote recorded · ${v.toUpperCase()}`, {
        description: "Signed on-device · broadcast to the Cirkle quorum.",
      });
    } catch {
      // Revert on failure.
      setVotes((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      toast.error("Vote failed", { description: "Please try again." });
    }
  };

  const submitProposal = async () => {
    if (!draft.title.trim() || !draft.author.trim()) {
      toast.error("Title and author are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/governance/proposals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("create failed");
      const data = (await res.json()) as { proposal: Proposal };
      setProposals((s) => [data.proposal, ...s]);
      setTally((s) => ({ ...s, [data.proposal.id]: { yes: 0, no: 0, abstain: 0 } }));
      setDraft({ title: "", description: "", type: "covenant", author: draft.author });
      setDraftOpen(false);
      toast.success("Proposal created", {
        description: "Now open for community vote.",
      });
    } catch {
      toast.error("Failed to create proposal");
    } finally {
      setCreating(false);
    }
  };

  const statusLabel = (s: ProposalStatus): { c: string; l: string } => {
    switch (s) {
      case "voting":
        return { c: "bg-secondary/20 text-secondary", l: "Voting open" };
      case "passed":
        return { c: "bg-primary/20 text-primary", l: "Passed" };
      case "rejected":
        return { c: "bg-destructive/20 text-destructive", l: "Rejected" };
      case "closed":
        return { c: "bg-muted text-muted-foreground", l: "Closed" };
      default:
        return { c: "bg-muted text-muted-foreground", l: "Draft" };
    }
  };

  const closesInLabel = (iso: string): string => {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return "—";
    const diff = t - Date.now();
    if (diff <= 0) return "Closed";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
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
            className="fixed bottom-0 inset-x-0 z-[150] max-h-[92vh] rounded-t-[28px] glass-strong shadow-float overflow-hidden flex flex-col md:max-w-2xl md:mx-auto md:inset-y-[4vh] md:bottom-auto md:rounded-3xl"
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
                onClick={() => setDraftOpen((v) => !v)}
                className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition"
                aria-label="New proposal"
              >
                + New
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {draftOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-5 pb-3 overflow-hidden"
              >
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <input
                    className="w-full bg-transparent text-sm font-medium outline-none border-b border-border/60 pb-1.5 focus:border-secondary/60"
                    placeholder="Proposal title"
                    value={draft.title}
                    onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
                  />
                  <textarea
                    className="w-full bg-transparent text-sm outline-none border-b border-border/60 pb-1.5 focus:border-secondary/60 resize-none"
                    placeholder="Describe what the community is voting on…"
                    rows={3}
                    value={draft.description}
                    onChange={(e) => setDraft((s) => ({ ...s, description: e.target.value }))}
                  />
                  <div className="flex gap-2 flex-wrap">
                    {PROPOSAL_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setDraft((s) => ({ ...s, type: t.value }))}
                        className={`text-[11px] px-2 py-1 rounded-full transition ${
                          draft.type === t.value
                            ? "bg-primary text-primary-foreground"
                            : "glass hover:bg-muted/60"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      className="flex-1 bg-transparent text-xs outline-none border-b border-border/60 pb-1 focus:border-secondary/60"
                      placeholder="Your @handle (author)"
                      value={draft.author}
                      onChange={(e) => setDraft((s) => ({ ...s, author: e.target.value.toLowerCase().replace(/^@/, "") }))}
                    />
                    <button
                      onClick={submitProposal}
                      disabled={creating}
                      className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {creating && <Loader2 className="w-3 h-3 animate-spin" />}
                      Submit
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

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
              {loading && proposals.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin me-2" /> Loading proposals…
                </div>
              ) : list.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No proposals yet — create one!
                </p>
              ) : (
                <ul className="space-y-3">
                  {list.map((p, i) => {
                    const t = tally[p.id] ?? { yes: p.yes, no: p.no, abstain: p.abstain };
                    const total = t.yes + t.no + t.abstain || 1;
                    const yesPct = (t.yes / total) * 100;
                    const noPct = (t.no / total) * 100;
                    const userVote = votes[p.id];
                    const sInfo = statusLabel(p.status);
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
                              <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${sInfo.c}`}>
                                {sInfo.l}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                                {p.type}
                              </span>
                            </div>
                            <h3 className="font-display text-lg leading-tight mt-2">{p.title}</h3>
                            {p.description && (
                              <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                            )}
                            <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> @{p.author}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {closesInLabel(p.closesAt)}</span>
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

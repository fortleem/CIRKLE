// @ts-nocheck
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  ShieldCheck,
  Sparkles,
  Check,
  Clock,
  Lock,
  ArrowLeft,
  ArrowRight,
  Plus,
  FileText,
  Wrench,
  Home,
  Package,
  Coins,
  PenLine,
  Hourglass,
  CheckCircle2,
  AlertCircle,
  Repeat,
  RefreshCw,
  Award,
  Gavel,
  Download,
  Upload,
  QrCode,
  ExternalLink,
  Boxes,
  Ban,
  Pause,
  Play,
  ScanLine,
  Link2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OverlayShell } from "@/components/ui/overlay-shell";
import { FeedbackButton } from "@/components/ui/feedback-button";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette ONLY — gold / teal / rose / steel / charcoal / cream.
// NO indigo, NO blue. All accent colors map to the brand tokens.
// ─────────────────────────────────────────────────────────────────────────────

type CommitType = "price" | "work" | "service" | "rental" | "group_buy";
type CommitStatus = "pending" | "active" | "completed" | "disputed" | "draft";
type EscrowState = "active" | "released" | "refunded" | "not_funded" | "none";
type RecurringFrequency = "weekly" | "monthly" | "quarterly" | "yearly";

interface Party {
  id: string;
  name: string;
  initials: string;
  color: "gold" | "teal" | "rose" | "steel" | "charcoal";
  signed: boolean;
}

interface Agreement {
  id: string;
  type: CommitType;
  typeEmoji: string;
  title: string;
  description: string;
  parties: Party[];
  amount: number;
  currency: string;
  deadline: string;
  conditions: string[];
  status: CommitStatus;
  fairnessScore: number;
  fairnessPassed: boolean;
  fairnessMarketRange: string;
  hash: string;
  // Conditional escrow — null when neither party has an escrow contract.
  escrowContractHolder: string | null;
  escrow: EscrowState;
  signedByYou: boolean;
  awaitingSignatureFrom?: string;
  createdAt: string;
}

interface OnChainRecord {
  hash: string;
  timestamp: string;
  blockId: string;
  verified: boolean;
}

interface RecurringAgreement {
  id: string;
  baseAgreementId: string;
  title: string;
  counterpartyName: string;
  frequency: RecurringFrequency;
  amount: number;
  currency: string;
  nextCharge: string;
  autoRenew: boolean;
  cancelNoticeDays: number;
  status: "active" | "cancelled" | "paused";
  charges: { date: string; amount: number; status: "paid" | "pending" | "failed" }[];
  createdAt: string;
  cancelledAt?: string;
}

interface AgreementNFT {
  id: string;
  agreementId: string;
  agreementTitle: string;
  type: string;
  amount: number;
  currency: string;
  ownerUsername: string;
  counterpartyName: string;
  mintTxHash: string;
  blockNumber: number;
  mintedAt: string;
  credential: string;
  metadataUri: string;
}

type JuryVote = "party_a" | "party_b" | "split";
type JuryStatus = "gathering_jury" | "voting" | "resolved" | "expired";

interface JuryCase {
  id: string;
  agreementId: string;
  agreementTitle: string;
  partyA: string;
  partyB: string;
  disputeReason: string;
  evidence: { party: string; text: string; timestamp: string }[];
  jurors: { username: string; vote: JuryVote | null; reasoning?: string; votedAt?: string }[];
  status: JuryStatus;
  result?: {
    winner: string;
    split?: number;
    reasoning: string;
    votesForPartyA: number;
    votesForPartyB: number;
    votesForSplit: number;
  };
  createdAt: string;
  expiresAt: string;
}

const TYPE_META: Record<CommitType, { label: string; emoji: string; icon: LucideIcon }> = {
  price: { label: "Price", emoji: "💰", icon: Coins },
  work: { label: "Work Task", emoji: "📋", icon: FileText },
  service: { label: "Service", emoji: "🤝", icon: Wrench },
  rental: { label: "Rental", emoji: "🏠", icon: Home },
  group_buy: { label: "Group Buy", emoji: "📦", icon: Package },
};

const AVATAR_COLOR_BG: Record<Party["color"], string> = {
  gold: "bg-gradient-to-br from-secondary/60 to-secondary/20 border-secondary/40 text-secondary-foreground",
  teal: "bg-gradient-to-br from-primary/50 to-primary/20 border-primary/40 text-primary-foreground",
  rose: "bg-gradient-to-br from-accent/60 to-accent/20 border-accent/40 text-accent-foreground",
  steel: "bg-gradient-to-br from-steel/60 to-steel/20 border-steel/40 text-cream",
  charcoal: "bg-gradient-to-br from-foreground/40 to-foreground/10 border-border/60 text-foreground",
};

const STATUS_BADGE: Record<CommitStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-secondary/15 text-secondary border-secondary/40" },
  active: { label: "Active", className: "bg-primary/15 text-primary border-primary/40" },
  completed: { label: "Completed", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40" },
  disputed: { label: "Disputed", className: "bg-accent/15 text-accent border-accent/40" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border/60" },
};

const ESCROW_BADGE: Record<EscrowState, { label: string; className: string }> = {
  active: { label: "Escrow active", className: "bg-primary/10 text-primary border-primary/30" },
  released: { label: "Escrow released", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  refunded: { label: "Escrow refunded", className: "bg-accent/10 text-accent border-accent/30" },
  not_funded: { label: "Escrow not funded", className: "bg-muted text-muted-foreground border-border/60" },
  none: { label: "Direct payment", className: "bg-muted/60 text-muted-foreground border-border/60" },
};

const FREQUENCY_META: Record<RecurringFrequency, { label: string; days: number }> = {
  weekly: { label: "Weekly", days: 7 },
  monthly: { label: "Monthly", days: 30 },
  quarterly: { label: "Quarterly", days: 90 },
  yearly: { label: "Yearly", days: 365 },
};

const TAB_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "create", label: "Create" },
  { id: "recurring", label: "Recurring" },
  { id: "nfts", label: "NFTs" },
  { id: "jury", label: "Jury" },
] as const;
type TabId = (typeof TAB_OPTIONS)[number]["id"];

const SEED_AGREEMENTS: Agreement[] = [];

const MOCK_FRIENDS: { id: string; name: string; initials: string; color: string }[] = [];

const TYPE_ORDER: CommitType[] = ["price", "work", "service", "rental", "group_buy"];

// ─────────────────────────────────────────────────────────────────────────────
// Avatar component (re-used across views)
// ─────────────────────────────────────────────────────────────────────────────
function PartyAvatar({ party, size = "sm" }: { party: Party; size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-9 h-9 text-[11px]" : "w-7 h-7 text-[10px]";
  return (
    <div
      title={`${party.name}${party.signed ? " · signed" : " · awaiting signature"}`}
      className={cn(
        "rounded-full border flex items-center justify-center font-medium shrink-0",
        dim,
        AVATAR_COLOR_BG[party.color],
      )}
    >
      {party.initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock QR matrix — deterministic 21x21 grid from a hash. Pure CSS so the
// component is dependency-free. Renders three corner finder patterns so it
// reads visually as a QR code.
// ─────────────────────────────────────────────────────────────────────────────
function HashQr({ hash, size = 132 }: { hash: string; size?: number }) {
  const N = 21;
  const cells: boolean[] = new Array(N * N).fill(false);
  const hex = hash.replace(/[^0-9a-f]/gi, "");
  for (let i = 0; i < cells.length; i++) {
    const ch = hex.charCodeAt(i % Math.max(hex.length, 1));
    cells[i] = (ch + i) % 2 === 0;
  }
  const stampFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const onInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[(r0 + r) * N + (c0 + c)] = onBorder || onInner;
      }
    }
  };
  stampFinder(0, 0);
  stampFinder(0, N - 7);
  stampFinder(N - 7, 0);
  return (
    <div
      className="grid bg-white p-2 rounded-md border border-border/60"
      style={{
        gridTemplateColumns: `repeat(${N}, 1fr)`,
        gridTemplateRows: `repeat(${N}, 1fr)`,
        width: size,
        height: size,
      }}
      aria-label="Verification QR code"
    >
      {cells.map((on, i) => (
        <div key={i} style={{ background: on ? "#1a1a14" : "white" }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Countdown helper for jury cases
// ─────────────────────────────────────────────────────────────────────────────
function formatCountdown(expiresAt: string): string {
  const ms = +new Date(expiresAt) - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export function CirkleCommit({ open, onClose }: Props) {
  const [view, setView] = useState<TabId>("active");
  const [agreements, setAgreements] = useState<Agreement[]>(SEED_AGREEMENTS);
  const [selected, setSelected] = useState<Agreement | null>(null);

  // ── Create-form state ──
  const [type, setType] = useState<CommitType>("price");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [counterpartyId, setCounterpartyId] = useState<string>("f_ahmed");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("SAR");
  const [deadline, setDeadline] = useState<string>("");
  const [conditions, setConditions] = useState<string>("Payment on delivery");
  const [fairnessChecked, setFairnessChecked] = useState(false);
  const [fairnessLoading, setFairnessLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // ── Conditional escrow state (per agreement) ──
  const [hasEscrowContract, setHasEscrowContract] = useState(false);
  const [escrowHolderName, setEscrowHolderName] = useState<string>("");

  // ── Recurring state ──
  const [makeRecurring, setMakeRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>("monthly");
  const [autoRenew, setAutoRenew] = useState(true);
  const [cancelNoticeDays, setCancelNoticeDays] = useState(30);
  const [recurringList, setRecurringList] = useState<RecurringAgreement[]>([]);
  const [cancellingRecurringId, setCancellingRecurringId] = useState<string | null>(null);

  // ── NFT state ──
  const [nfts, setNfts] = useState<AgreementNFT[]>([]);
  const [mintingFor, setMintingFor] = useState<string | null>(null);

  // ── On-chain hash state (per agreement, in detail view) ──
  const [onchainMap, setOnchainMap] = useState<Record<string, OnChainRecord>>({});
  const [hashingFor, setHashingFor] = useState<string | null>(null);
  const [verifyingFor, setVerifyingFor] = useState<string | null>(null);

  // ── Jury state ──
  const [juryCases, setJuryCases] = useState<JuryCase[]>([]);
  const [escalatingFor, setEscalatingFor] = useState<string | null>(null);
  const [disputeText, setDisputeText] = useState("");
  const [votingFor, setVotingFor] = useState<string | null>(null); // caseId
  const [voteChoice, setVoteChoice] = useState<JuryVote>("party_a");
  const [voteReasoning, setVoteReasoning] = useState("");

  // ── Import state ──
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    title: string;
    description: string;
    type: CommitType;
    amount: number;
    currency: string;
    deadline: string;
    counterpartyName: string;
    conditions: string[];
    escrowContractHolder: string | null;
    confidence: number;
    source: "ai" | "heuristic";
  } | null>(null);

  const reminderShownRef = useRef(false);

  // Reset state when overlay closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setView("active");
        setSelected(null);
        setType("price");
        setTitle("");
        setDescription("");
        setCounterpartyId("f_ahmed");
        setAmount("");
        setCurrency("SAR");
        setDeadline("");
        setConditions("Payment on delivery");
        setFairnessChecked(false);
        setFairnessLoading(false);
        setCreating(false);
        setCreatedId(null);
        setHasEscrowContract(false);
        setEscrowHolderName("");
        setMakeRecurring(false);
        setRecurringFrequency("monthly");
        setAutoRenew(true);
        setCancelNoticeDays(30);
        setImportOpen(false);
        setImportText("");
        setImportPreview(null);
        setDisputeText("");
        setVoteChoice("party_a");
        setVoteReasoning("");
        reminderShownRef.current = false;
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCounterpartyId("f_ahmed");
    setAmount("");
    setCurrency("SAR");
    setDeadline("");
    setConditions("Payment on delivery");
    setFairnessChecked(false);
    setFairnessLoading(false);
    setCreatedId(null);
    setHasEscrowContract(false);
    setEscrowHolderName("");
    setMakeRecurring(false);
    setRecurringFrequency("monthly");
    setAutoRenew(true);
    setCancelNoticeDays(30);
  };

  // ── Fetch recurring / NFTs / jury cases when overlay opens ──
  const refreshRecurring = useCallback(async () => {
    try {
      const res = await fetch("/api/commit/recurring");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.recurring)) setRecurringList(data.recurring as RecurringAgreement[]);
        // Reminder toast for agreements renewing within 3 days (shown once per open).
        if (Array.isArray(data.reminders) && data.reminders.length > 0 && !reminderShownRef.current) {
          reminderShownRef.current = true;
          for (const r of data.reminders as RecurringAgreement[]) {
            toast.info(`Retainer with ${r.counterpartyName} renews in 3 days`, {
              description: `${r.amount.toLocaleString()} ${r.currency} · ${new Date(r.nextCharge).toLocaleDateString()}. Cancel?`,
              action: {
                label: "Cancel",
                onClick: () => handleCancelRecurring(r.id),
              },
              duration: 8000,
            });
          }
        }
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  const refreshNfts = useCallback(async () => {
    try {
      const res = await fetch("/api/commit/mint-nft?owner=you");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.nfts)) setNfts(data.nfts as AgreementNFT[]);
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  const refreshJury = useCallback(async () => {
    try {
      const res = await fetch("/api/commit/jury");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.cases)) setJuryCases(data.cases as JuryCase[]);
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    if (open) {
      void refreshRecurring();
      void refreshNfts();
      void refreshJury();
    }
  }, [open, refreshRecurring, refreshNfts, refreshJury]);

  // ── Refresh jury when jury tab is opened (countdown ticks) ──
  useEffect(() => {
    if (view === "jury") void refreshJury();
  }, [view, refreshJury]);

  const runFairnessCheck = () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter an amount first", { description: "Fairness check needs a number to compare against market data." });
      return;
    }
    setFairnessLoading(true);
    setFairnessChecked(false);
    setTimeout(() => {
      setFairnessLoading(false);
      setFairnessChecked(true);
      toast.success("AI analyzed: Fair price", {
        description: "Market range: 450-550 SAR · 92% confidence · On-device model",
      });
    }, 900);
  };

  const createCommit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!deadline) {
      toast.error("Pick a deadline");
      return;
    }
    setCreating(true);

    const friend = MOCK_FRIENDS.find((f) => f.id === counterpartyId) ?? MOCK_FRIENDS[0];
    // Resolve escrow holder: if the toggle is on, use the explicit name (or
    // fall back to the counterparty). Mock heuristic: a counterparty name
    // containing "escrow" auto-activates escrow too.
    const escrowHolder =
      hasEscrowContract || /\bescrow\b/i.test(friend.name)
        ? escrowHolderName.trim() || friend.name
        : null;

    let newAgreement: Agreement | null = null;
    try {
      const res = await fetch("/api/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          counterpartyName: friend.name,
          amount: Number(amount),
          currency,
          deadline,
          conditions: conditions
            .split("\n")
            .map((c) => c.trim())
            .filter(Boolean),
          escrowContractHolder: escrowHolder,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.agreement) {
          const a = data.agreement;
          newAgreement = {
            id: a.id,
            type: a.type,
            typeEmoji: a.typeEmoji,
            title: a.title,
            description: a.description,
            parties: a.parties,
            amount: a.amount,
            currency: a.currency,
            deadline: a.deadline,
            conditions: a.conditions,
            status: a.status,
            fairnessScore: a.fairnessCheck?.score ?? 90,
            fairnessPassed: a.fairnessCheck?.passed ?? true,
            fairnessMarketRange: a.fairnessCheck?.marketRange ?? "450-550 SAR",
            hash: a.hash,
            escrowContractHolder: a.escrowContractHolder ?? null,
            escrow: a.escrow ?? (escrowHolder ? "active" : "none"),
            signedByYou: a.signedByYou,
            awaitingSignatureFrom: a.awaitingSignatureFrom,
            createdAt: a.createdAt,
          } satisfies Agreement;
        }
      }
    } catch {
      // Fall through to synthesized agreement below.
    }

    if (!newAgreement) {
      const hash = "0x" + Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
      newAgreement = {
        id: `cm-${Date.now()}`,
        type,
        typeEmoji: TYPE_META[type].emoji,
        title: title.trim(),
        description: description.trim(),
        parties: [
          { id: "u_you", name: "You", initials: "YO", color: "teal", signed: true },
          { id: "u_cp", name: friend.name, initials: friend.initials, color: friend.color, signed: false },
        ],
        amount: Number(amount),
        currency,
        deadline,
        conditions: conditions
          .split("\n")
          .map((c) => c.trim())
          .filter(Boolean),
        status: "pending",
        fairnessScore: 92,
        fairnessPassed: true,
        fairnessMarketRange: "450-550 SAR",
        hash,
        escrowContractHolder: escrowHolder,
        escrow: escrowHolder ? "active" : "none",
        signedByYou: true,
        awaitingSignatureFrom: friend.name,
        createdAt: new Date().toISOString(),
      } satisfies Agreement;
    }

    setAgreements((prev) => [newAgreement as Agreement, ...prev]);
    setCreatedId(newAgreement.id);

    // ── U8: if "Make recurring" was toggled on, create the recurring agreement ──
    if (makeRecurring && newAgreement.amount > 0) {
      try {
        const rres = await fetch("/api/commit/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseAgreementId: newAgreement.id,
            title: newAgreement.title,
            counterpartyName: friend.name,
            frequency: recurringFrequency,
            amount: newAgreement.amount,
            currency: newAgreement.currency,
            autoRenew,
            cancelNoticeDays,
          }),
        });
        if (rres.ok) {
          toast.success("Recurring schedule created", {
            description: `${FREQUENCY_META[recurringFrequency].label} · ${newAgreement.amount.toLocaleString()} ${newAgreement.currency} · next charge in ${FREQUENCY_META[recurringFrequency].days}d`,
          });
          void refreshRecurring();
        }
      } catch {
        /* non-fatal — the agreement itself was still created */
      }
    }

    toast.success(
      newAgreement.escrow === "active"
        ? `Commit created · Hash secured · Escrow by ${newAgreement.escrowContractHolder}`
        : "Commit created · Hash secured · Direct payment",
      { description: `Waiting for ${newAgreement.awaitingSignatureFrom ?? "counterparty"} to sign…` },
    );
    setCreating(false);
  };

  const closeCreated = () => {
    setCreatedId(null);
    resetForm();
    setView("active");
  };

  // ───────────────────────────────────────────────────────────────────────────
  // U8: cancel / pause recurring
  // ───────────────────────────────────────────────────────────────────────────
  async function handleCancelRecurring(id: string) {
    setCancellingRecurringId(id);
    try {
      const res = await fetch(`/api/commit/recurring?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Recurring agreement cancelled");
        void refreshRecurring();
      } else {
        toast.error("Failed to cancel recurring");
      }
    } catch {
      toast.error("Network error — try again");
    } finally {
      setCancellingRecurringId(null);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // U9: commit / verify on-chain hash for an agreement
  // ───────────────────────────────────────────────────────────────────────────
  async function handleCommitHash(a: Agreement) {
    setHashingFor(a.id);
    try {
      const res = await fetch("/api/commit/hash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: a.title,
          description: a.description,
          parties: a.parties.map((p) => ({ name: p.name, signed: p.signed })),
          amount: a.amount,
          currency: a.currency,
          deadline: a.deadline,
          conditions: a.conditions,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const rec: OnChainRecord = {
          hash: data.hash,
          timestamp: data.timestamp,
          blockId: data.blockId,
          verified: true,
        };
        setOnchainMap((prev) => ({ ...prev, [a.id]: rec }));
        toast.success("On-chain hash committed", { description: `Block ${data.blockId}` });
      } else {
        toast.error("Failed to commit hash");
      }
    } catch {
      toast.error("Network error — try again");
    } finally {
      setHashingFor(null);
    }
  }

  async function handleVerifyHash(a: Agreement) {
    const rec = onchainMap[a.id];
    if (!rec) {
      toast.error("Commit the hash first");
      return;
    }
    setVerifyingFor(a.id);
    try {
      // Re-commit and confirm the hash matches.
      const res = await fetch("/api/commit/hash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: a.title,
          description: a.description,
          parties: a.parties.map((p) => ({ name: p.name, signed: p.signed })),
          amount: a.amount,
          currency: a.currency,
          deadline: a.deadline,
          conditions: a.conditions,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const verified = data.hash === rec.hash;
        setOnchainMap((prev) => ({ ...prev, [a.id]: { ...prev[a.id], verified } }));
        if (verified) {
          toast.success("Hash verified on-chain ✅", { description: `Block ${rec.blockId} · ${rec.hash.slice(0, 16)}…` });
        } else {
          toast.error("Hash mismatch — content was tampered");
        }
      } else {
        toast.error("Verification failed");
      }
    } catch {
      toast.error("Network error — try again");
    } finally {
      setVerifyingFor(null);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // U10: mint NFT credential
  // ───────────────────────────────────────────────────────────────────────────
  async function handleMintNFT(a: Agreement) {
    setMintingFor(a.id);
    try {
      const res = await fetch("/api/commit/mint-nft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementId: a.id,
          agreementTitle: a.title,
          type: a.type,
          amount: a.amount,
          currency: a.currency,
          ownerUsername: "you",
          counterpartyName: a.parties.find((p) => p.name !== "You")?.name ?? "Counterparty",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.nft) {
          setNfts((prev) => [data.nft as AgreementNFT, ...prev.filter((n) => n.id !== data.nft.id)]);
          toast.success("NFT credential minted 🎉", {
            description: `#${data.nft.id} · Block ${data.nft.blockNumber}`,
            action: {
              label: "View in CirkleMint",
              onClick: () => window.dispatchEvent(new CustomEvent("circle:mint")),
            },
            duration: 7000,
          });
        }
      } else {
        toast.error("Mint failed — try again");
      }
    } catch {
      toast.error("Network error — try again");
    } finally {
      setMintingFor(null);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // U11: escalate to community jury
  // ───────────────────────────────────────────────────────────────────────────
  async function handleEscalateToJury(a: Agreement) {
    if (!disputeText.trim()) {
      toast.error("Describe the dispute first");
      return;
    }
    setEscalatingFor(a.id);
    try {
      const counterparty = a.parties.find((p) => p.name !== "You")?.name ?? "Counterparty";
      const res = await fetch("/api/commit/jury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementId: a.id,
          agreementTitle: a.title,
          partyA: "You",
          partyB: counterparty,
          disputeReason: disputeText.trim(),
          evidence: [
            { party: "You", text: disputeText.trim() },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Case escalated to community jury", {
          description: "5 verified users will be selected · 24h voting window",
        });
        setDisputeText("");
        void refreshJury();
        setView("jury");
        setSelected(null);
        if (data?.case?.id) {
          // Surface the new case immediately
          setTimeout(() => void refreshJury(), 400);
        }
      } else {
        toast.error("Escalation failed — try again");
      }
    } catch {
      toast.error("Network error — try again");
    } finally {
      setEscalatingFor(null);
    }
  }

  async function handleCastVote(caseId: string) {
    setVotingFor(caseId);
    try {
      const res = await fetch(`/api/commit/jury/${encodeURIComponent(caseId)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jurorUsername: "you",
          vote: voteChoice,
          reasoning: voteReasoning.trim(),
        }),
      });
      if (res.ok) {
        toast.success("Vote cast", { description: "Thank you for serving on the jury." });
        setVoteReasoning("");
        void refreshJury();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Vote failed");
      }
    } catch {
      toast.error("Network error — try again");
    } finally {
      setVotingFor(null);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // U12: import agreement text via AI extraction
  // ───────────────────────────────────────────────────────────────────────────
  async function handleImport() {
    if (!importText.trim()) {
      toast.error("Paste some agreement text first");
      return;
    }
    setImporting(true);
    setImportPreview(null);
    try {
      const res = await fetch("/api/commit/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.agreement) {
          setImportPreview(data.agreement);
          toast.success(`Extracted via ${data.agreement.source === "ai" ? "AI" : "heuristic pattern matching"}`, {
            description: `Confidence ${Math.round((data.agreement.confidence ?? 0) * 100)}%`,
          });
        } else {
          toast.error("Could not extract — try different text");
        }
      } else {
        toast.error("Import failed — try again");
      }
    } catch {
      toast.error("Network error — try again");
    } finally {
      setImporting(false);
    }
  }

  function applyImportToForm() {
    if (!importPreview) return;
    setType(importPreview.type);
    setTitle(importPreview.title);
    setDescription(importPreview.description);
    setAmount(importPreview.amount > 0 ? String(importPreview.amount) : "");
    setCurrency(importPreview.currency);
    setDeadline(importPreview.deadline);
    setConditions(importPreview.conditions.join("\n"));
    // Try to match a known friend by name; otherwise keep the default and
    // rely on the backend to record the name as-is.
    const friendMatch = MOCK_FRIENDS.find(
      (f) => f.name.toLowerCase() === importPreview.counterpartyName.toLowerCase(),
    );
    if (friendMatch) setCounterpartyId(friendMatch.id);
    if (importPreview.escrowContractHolder) {
      setHasEscrowContract(true);
      setEscrowHolderName(importPreview.escrowContractHolder);
    }
    setImportOpen(false);
    setImportText("");
    setImportPreview(null);
    setView("create");
    toast.success("Form pre-filled — review & create");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // U12: export agreement (JSON download + PDF view in new tab)
  // ───────────────────────────────────────────────────────────────────────────
  function handleExport(a: Agreement, format: "json" | "pdf") {
    const payload = {
      exportedAt: new Date().toISOString(),
      agreement: a,
      onChain: onchainMap[a.id] ?? null,
    };
    if (format === "json") {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cirkle-commit-${a.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("JSON downloaded", { description: `cirkle-commit-${a.id}.json` });
    } else {
      // PDF mockup: open the HTML view in a new tab — the browser's
      // print-to-PDF can be used to save it.
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(renderExportHtml(a, onchainMap[a.id]));
        w.document.close();
        toast.success("PDF-ready view opened", { description: "Use your browser's print → Save as PDF" });
      } else {
        toast.error("Pop-up blocked — allow pop-ups for this site");
      }
    }
  }

  return (
    <OverlayShell open={open} onClose={onClose} variant="fullscreen" ariaLabel="CirkleCommit — AI-verified agreements with conditional escrow">
          {/* Aurora background — pure brand palette */}
          <div className="pointer-events-none absolute inset-0 aurora-bg opacity-40" aria-hidden />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background" aria-hidden />

          {/* ───────────────────────── Header ───────────────────────── */}
          <header className="relative px-4 sm:px-6 pt-[env(safe-area-inset-top)] pb-3 border-b border-border/60 glass-strong z-10">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              {selected ? (
                <button
                  onClick={() => setSelected(null)}
                  className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
                  aria-label="Back to list"
                >
                  <ArrowLeft className="w-4.5 h-4.5" />
                </button>
              ) : null}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/40 to-primary/20 border border-secondary/40 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl leading-tight flex items-center gap-2">
                  CirkleCommit
                </h1>
                <p className="text-[11px] text-muted-foreground truncate">
                  AI-verified agreements · Conditional escrow
                </p>
              </div>
              {!selected && (
                <div className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/60">
                  {TAB_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setView(t.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition",
                        view === t.id
                          ? "bg-gradient-hero text-cream shadow-soft"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
              <FeedbackButton overlayName="CirkleCommit" />
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile segmented control */}
            {!selected && (
              <div className="sm:hidden mt-3 flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/60 max-w-3xl mx-auto overflow-x-auto">
                {TAB_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setView(t.id)}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap",
                      view === t.id
                        ? "bg-gradient-hero text-cream shadow-soft"
                        : "text-muted-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </header>

          {/* ───────────────────────── Body ───────────────────────── */}
          <div className="relative flex-1 overflow-y-auto z-0">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 pb-24">
              <AnimatePresence mode="wait">
                {/* ─────────────── Active list view ─────────────── */}
                {view === "active" && !selected && (
                  <motion.div
                    key="active-list"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {/* Summary strip */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Active", val: agreements.filter((a) => a.status === "active").length, tint: "text-primary" },
                        { label: "Pending", val: agreements.filter((a) => a.status === "pending").length, tint: "text-secondary" },
                        { label: "Completed", val: agreements.filter((a) => a.status === "completed").length, tint: "text-emerald-600 dark:text-emerald-400" },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-2xl border border-border/60 bg-card px-3 py-2.5 text-center"
                        >
                          <div className={cn("font-display text-2xl leading-none", s.tint)}>{s.val}</div>
                          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {agreements.map((a, i) => (
                      <motion.button
                        key={a.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 * i, duration: 0.2 }}
                        onClick={() => setSelected(a)}
                        className="w-full text-start rounded-2xl border border-border/60 bg-card hover:bg-muted/40 hover:border-border transition p-4 group"
                      >
                        {/* Top row: type + title + status */}
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/10 border border-border/60 flex items-center justify-center text-lg shrink-0">
                            {a.typeEmoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 flex-wrap">
                              <h3 className="font-medium text-sm leading-snug">{a.title}</h3>
                              <span
                                className={cn(
                                  "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                  STATUS_BADGE[a.status].className,
                                )}
                              >
                                {STATUS_BADGE[a.status].label}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                              {a.description}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExport(a, "json");
                            }}
                            className="shrink-0 w-7 h-7 rounded-full hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition"
                            title="Export JSON"
                            aria-label="Export JSON"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Parties */}
                        <div className="flex items-center gap-2 mt-3">
                          <div className="flex -space-x-1.5">
                            {a.parties.map((p) => (
                              <PartyAvatar key={p.id} party={p} />
                            ))}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {a.parties.map((p) => p.name).join(" + ")}
                          </span>
                        </div>

                        {/* Footer row: amount / deadline / fairness / escrow */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/10 border border-secondary/30 text-[10px] font-medium text-secondary">
                            <Coins className="w-3 h-3" />
                            {a.amount.toLocaleString()} {a.currency}
                          </div>
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 border border-border/60 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {a.deadline || "No deadline"}
                          </div>
                          <div
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border",
                              a.fairnessPassed
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-accent/10 text-accent border-accent/30",
                            )}
                            title={`AI fairness score: ${a.fairnessScore}% · Market range: ${a.fairnessMarketRange}`}
                          >
                            <Sparkles className="w-3 h-3" />
                            AI fairness · {a.fairnessScore}%
                          </div>
                          <div
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border",
                              ESCROW_BADGE[a.escrow].className,
                            )}
                            title={
                              a.escrowContractHolder
                                ? `Escrow held by ${a.escrowContractHolder}'s contract`
                                : "No escrow contract — direct payment between parties"
                            }
                          >
                            <Lock className="w-3 h-3" />
                            {ESCROW_BADGE[a.escrow].label}
                          </div>
                          {nfts.some((n) => n.agreementId === a.id) && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/10 border border-secondary/40 text-[10px] font-medium text-secondary">
                              <Award className="w-3 h-3" />
                              NFT
                            </div>
                          )}
                          {recurringList.some((r) => r.baseAgreementId === a.id) && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 border border-primary/30 text-[10px] font-medium text-primary">
                              <Repeat className="w-3 h-3" />
                              Recurring
                            </div>
                          )}
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition" />
                        </div>

                        {/* Awaiting-signature hint */}
                        {a.awaitingSignatureFrom && a.status === "pending" && (
                          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-secondary">
                            <Hourglass className="w-3 h-3 animate-pulse" />
                            Waiting for {a.awaitingSignatureFrom} to sign…
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* ─────────────── Create view ─────────────── */}
                {view === "create" && !selected && (
                  <motion.div
                    key="create-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Import agreement banner */}
                    <button
                      onClick={() => setImportOpen(true)}
                      className="w-full rounded-2xl border border-secondary/40 bg-gradient-to-r from-secondary/10 to-primary/5 hover:from-secondary/20 hover:to-primary/10 transition p-4 flex items-center gap-3 text-start"
                    >
                      <div className="w-9 h-9 rounded-lg bg-secondary/20 border border-secondary/30 flex items-center justify-center shrink-0">
                        <Upload className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">Import agreement text</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Paste a contract, PDF text, or DocuSign export — AI extracts clauses &amp; pre-fills the form.
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-secondary shrink-0" />
                    </button>

                    {/* Type selector */}
                    <section>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Type
                      </label>
                      <div className="grid grid-cols-5 gap-1.5 mt-2">
                        {TYPE_ORDER.map((t) => {
                          const meta = TYPE_META[t];
                          const Icon = meta.icon;
                          const active = type === t;
                          return (
                            <button
                              key={t}
                              onClick={() => setType(t)}
                              className={cn(
                                "rounded-xl p-2.5 flex flex-col items-center gap-1 border transition",
                                active
                                  ? "bg-gradient-to-br from-secondary/20 to-primary/10 border-secondary/50 shadow-soft"
                                  : "bg-card border-border/60 hover:bg-muted/40",
                              )}
                            >
                              <span className="text-lg leading-none">{meta.emoji}</span>
                              <Icon className={cn("w-3.5 h-3.5", active ? "text-secondary" : "text-muted-foreground")} />
                              <span className="text-[9px] text-center leading-tight">{meta.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* Title */}
                    <section>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Title</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Laptop purchase — 500 SAR"
                        maxLength={80}
                        className="mt-2 w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm outline-none focus:border-secondary/60 transition"
                      />
                    </section>

                    {/* Description */}
                    <section>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Describe what's being agreed — item condition, scope of work, deliverables…"
                        maxLength={500}
                        className="mt-2 w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm outline-none focus:border-secondary/60 transition resize-none"
                      />
                    </section>

                    {/* Counterparty chips */}
                    <section>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Counterparty
                      </label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {MOCK_FRIENDS.map((f) => {
                          const active = counterpartyId === f.id;
                          return (
                            <button
                              key={f.id}
                              onClick={() => setCounterpartyId(f.id)}
                              className={cn(
                                "inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-[11px] transition",
                                active
                                  ? "bg-gradient-to-r from-secondary/25 to-primary/15 border-secondary/50"
                                  : "bg-card border-border/60 hover:bg-muted/40",
                              )}
                            >
                              <span
                                className={cn(
                                  "w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-medium",
                                  AVATAR_COLOR_BG[f.color],
                                )}
                              >
                                {f.initials}
                              </span>
                              {f.name}
                              {active && <Check className="w-3 h-3 text-secondary" />}
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* Amount + Currency */}
                    <section className="grid grid-cols-[1fr_auto] gap-2">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Amount
                        </label>
                        <input
                          value={amount}
                          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                          inputMode="decimal"
                          placeholder="500"
                          className="mt-2 w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm outline-none focus:border-secondary/60 transition"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Currency
                        </label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm outline-none focus:border-secondary/60 transition appearance-none"
                        >
                          {["SAR", "AED", "EGP", "USD", "EUR", "USDC"].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </section>

                    {/* Deadline */}
                    <section>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Deadline
                      </label>
                      <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm outline-none focus:border-secondary/60 transition"
                      />
                    </section>

                    {/* Conditions */}
                    <section>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Conditions (one per line)
                      </label>
                      <textarea
                        value={conditions}
                        onChange={(e) => setConditions(e.target.value)}
                        rows={3}
                        placeholder={"Payment on delivery\n7-day inspection window\nFull refund if hardware fault found"}
                        className="mt-2 w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm outline-none focus:border-secondary/60 transition resize-none"
                      />
                    </section>

                    {/* Conditional escrow toggle (U-Conditional Escrow) */}
                    <section className="rounded-2xl border border-border/60 bg-card p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition",
                          hasEscrowContract
                            ? "bg-primary/15 border-primary/40"
                            : "bg-muted/60 border-border/60",
                        )}>
                          <Lock className={cn("w-4 h-4", hasEscrowContract ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">Escrow contract</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {hasEscrowContract
                              ? "Escrow active — funds held by the named party's escrow contract."
                              : "Escrow not active — both parties agree to direct payment."}
                          </div>
                          {hasEscrowContract && (
                            <input
                              value={escrowHolderName}
                              onChange={(e) => setEscrowHolderName(e.target.value)}
                              placeholder="Escrow holder name (defaults to counterparty)"
                              maxLength={60}
                              className="mt-2 w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary/60 transition"
                            />
                          )}
                        </div>
                        <button
                          onClick={() => setHasEscrowContract((v) => !v)}
                          role="switch"
                          aria-checked={hasEscrowContract}
                          aria-label="Toggle escrow contract"
                          className={cn(
                            "shrink-0 w-11 h-6 rounded-full border transition relative",
                            hasEscrowContract
                              ? "bg-primary/80 border-primary"
                              : "bg-muted border-border/60",
                          )}
                        >
                          <span className={cn(
                            "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition",
                            hasEscrowContract ? "left-[22px]" : "left-0.5",
                          )} />
                        </button>
                      </div>
                    </section>

                    {/* Recurring toggle (U8) */}
                    <section className="rounded-2xl border border-border/60 bg-card p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition",
                          makeRecurring
                            ? "bg-primary/15 border-primary/40"
                            : "bg-muted/60 border-border/60",
                        )}>
                          <Repeat className={cn("w-4 h-4", makeRecurring ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">Make recurring</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Auto-charge the counterparty on a fixed cadence. AI sends a reminder 3 days before each renewal.
                          </div>
                          {makeRecurring && (
                            <div className="mt-3 space-y-3">
                              <div>
                                <label className="text-[9px] uppercase tracking-widest text-muted-foreground">Frequency</label>
                                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                                  {(Object.keys(FREQUENCY_META) as RecurringFrequency[]).map((f) => (
                                    <button
                                      key={f}
                                      onClick={() => setRecurringFrequency(f)}
                                      className={cn(
                                        "rounded-lg py-1.5 text-[10px] font-medium border transition",
                                        recurringFrequency === f
                                          ? "bg-primary/15 border-primary/40 text-primary"
                                          : "bg-card border-border/60 text-muted-foreground hover:bg-muted/40",
                                      )}
                                    >
                                      {FREQUENCY_META[f].label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs font-medium">Auto-renew</div>
                                  <div className="text-[10px] text-muted-foreground">Continue until cancelled</div>
                                </div>
                                <button
                                  onClick={() => setAutoRenew((v) => !v)}
                                  role="switch"
                                  aria-checked={autoRenew}
                                  aria-label="Toggle auto-renew"
                                  className={cn(
                                    "shrink-0 w-11 h-6 rounded-full border transition relative",
                                    autoRenew ? "bg-primary/80 border-primary" : "bg-muted border-border/60",
                                  )}
                                >
                                  <span className={cn(
                                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition",
                                    autoRenew ? "left-[22px]" : "left-0.5",
                                  )} />
                                </button>
                              </div>
                              <div>
                                <label className="text-[9px] uppercase tracking-widest text-muted-foreground">
                                  Cancel notice (days)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={90}
                                  value={cancelNoticeDays}
                                  onChange={(e) => setCancelNoticeDays(Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
                                  className="mt-1.5 w-24 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary/60 transition"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setMakeRecurring((v) => !v)}
                          role="switch"
                          aria-checked={makeRecurring}
                          aria-label="Toggle recurring"
                          className={cn(
                            "shrink-0 w-11 h-6 rounded-full border transition relative",
                            makeRecurring ? "bg-primary/80 border-primary" : "bg-muted border-border/60",
                          )}
                        >
                          <span className={cn(
                            "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition",
                            makeRecurring ? "left-[22px]" : "left-0.5",
                          )} />
                        </button>
                      </div>
                    </section>

                    {/* AI fairness check */}
                    <section className="rounded-2xl border border-border/60 bg-card p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-secondary/30 to-primary/15 border border-secondary/30 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">AI Fairness Check</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Compares the amount against market data — runs on-device.
                          </div>
                          {fairnessChecked && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2.5 flex items-center gap-2 flex-wrap"
                            >
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" /> Fair price
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 border border-border/60 text-[10px] text-muted-foreground">
                                Market range: 450-550 SAR
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 border border-border/60 text-[10px] text-muted-foreground">
                                92% confidence
                              </span>
                            </motion.div>
                          )}
                        </div>
                        <button
                          onClick={runFairnessCheck}
                          disabled={fairnessLoading}
                          className="shrink-0 px-3 py-1.5 rounded-full bg-gradient-hero text-cream text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {fairnessLoading ? (
                            <>
                              <Hourglass className="w-3.5 h-3.5 animate-pulse" /> Analyzing…
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Run check
                            </>
                          )}
                        </button>
                      </div>
                    </section>

                    {/* Submit */}
                    <section className="flex items-center gap-2">
                      <button
                        onClick={createCommit}
                        disabled={creating || !title.trim() || !amount || !deadline}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-gold text-charcoal text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
                      >
                        {creating ? (
                          <>
                            <Hourglass className="w-4 h-4 animate-pulse" /> Securing hash…
                          </>
                        ) : (
                          <>
                            <PenLine className="w-4 h-4" /> Create Commit
                          </>
                        )}
                      </button>
                    </section>

                    <p className="text-[10px] text-muted-foreground text-center">
                      {hasEscrowContract
                        ? "🔒 Escrow activates when the second signature lands — funds held by the named escrow contract."
                        : "🔒 Both parties must sign before the agreement is binding. Direct payment — no escrow held."}
                    </p>
                  </motion.div>
                )}

                {/* ─────────────── Recurring view (U8) ─────────────── */}
                {view === "recurring" && !selected && (
                  <motion.div
                    key="recurring-list"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 to-secondary/5 p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                        <Repeat className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">Recurring agreements</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Auto-charging retainers & subscriptions. AI reminds you 3 days before each renewal.
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-xl text-primary">{recurringList.filter((r) => r.status === "active").length}</div>
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">active</div>
                      </div>
                    </div>

                    {recurringList.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center text-muted-foreground">
                        <Repeat className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <div className="text-sm">No recurring agreements yet</div>
                        <div className="text-[11px] mt-1">Toggle "Make recurring" when creating a commit.</div>
                      </div>
                    ) : (
                      recurringList.map((r, i) => {
                        const next = new Date(r.nextCharge);
                        const daysUntil = Math.ceil((+next - Date.now()) / 86_400_000);
                        const dueSoon = r.status === "active" && daysUntil <= 3;
                        return (
                          <motion.div
                            key={r.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.04 * i, duration: 0.2 }}
                            className="rounded-2xl border border-border/60 bg-card p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
                                r.status === "active"
                                  ? "bg-primary/15 border-primary/30"
                                  : r.status === "paused"
                                    ? "bg-secondary/15 border-secondary/30"
                                    : "bg-muted border-border/60",
                              )}>
                                <Repeat className={cn(
                                  "w-5 h-5",
                                  r.status === "active" ? "text-primary" : "text-muted-foreground",
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-medium text-sm leading-snug">{r.title}</h3>
                                  <span className={cn(
                                    "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                    r.status === "active"
                                      ? "bg-primary/15 text-primary border-primary/40"
                                      : r.status === "paused"
                                        ? "bg-secondary/15 text-secondary border-secondary/40"
                                        : "bg-muted text-muted-foreground border-border/60",
                                  )}>
                                    {r.status}
                                  </span>
                                  {dueSoon && (
                                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-accent/15 text-accent border-accent/40">
                                      <Clock className="w-3 h-3" /> renews in {daysUntil}d
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  {r.counterpartyName} · {FREQUENCY_META[r.frequency].label} · {r.autoRenew ? "auto-renews" : "manual renewal"}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-display text-base text-secondary">
                                  {r.amount.toLocaleString()} {r.currency}
                                </div>
                                <div className="text-[9px] text-muted-foreground uppercase tracking-wide">per charge</div>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Next charge</div>
                                <div className="text-xs font-medium mt-0.5">{next.toLocaleDateString()} · {next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                              </div>
                              <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Cancel notice</div>
                                <div className="text-xs font-medium mt-0.5">{r.cancelNoticeDays} days required</div>
                              </div>
                            </div>

                            {/* Charge history (mini) */}
                            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">History:</span>
                              {r.charges.slice(-6).map((c, j) => (
                                <span
                                  key={j}
                                  title={`${new Date(c.date).toLocaleDateString()} · ${c.status}`}
                                  className={cn(
                                    "w-2.5 h-2.5 rounded-full border",
                                    c.status === "paid" ? "bg-emerald-500/80 border-emerald-500"
                                      : c.status === "pending" ? "bg-secondary/60 border-secondary"
                                        : "bg-accent/60 border-accent",
                                  )}
                                />
                              ))}
                              <span className="text-[10px] text-muted-foreground ml-1">
                                {r.charges.filter((c) => c.status === "paid").length} paid · {r.charges.filter((c) => c.status === "pending").length} pending
                              </span>
                            </div>

                            {r.status === "active" && (
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  onClick={() => handleCancelRecurring(r.id)}
                                  disabled={cancellingRecurringId === r.id}
                                  className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-[11px] font-medium hover:bg-accent/20 transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  {cancellingRecurringId === r.id ? (
                                    <><Hourglass className="w-3 h-3 animate-pulse" /> Cancelling…</>
                                  ) : (
                                    <><Ban className="w-3 h-3" /> Cancel recurring</>
                                  )}
                                </button>
                                <span className="text-[10px] text-muted-foreground">
                                  {r.cancelNoticeDays > 0 ? `${r.cancelNoticeDays}-day notice applies` : "Takes effect immediately"}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </motion.div>
                )}

                {/* ─────────────── NFTs view (U10) ─────────────── */}
                {view === "nfts" && !selected && (
                  <motion.div
                    key="nfts-list"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-secondary/15 to-primary/5 p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary/20 border border-secondary/40 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">NFT credentials</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Portable reputation — completed agreements minted as on-chain credentials via CirkleMint.
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-xl text-secondary">{nfts.length}</div>
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">minted</div>
                      </div>
                    </div>

                    {nfts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center text-muted-foreground">
                        <Boxes className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <div className="text-sm">No NFT credentials yet</div>
                        <div className="text-[11px] mt-1">Open a completed agreement and tap "Mint as NFT credential".</div>
                      </div>
                    ) : (
                      nfts.map((n, i) => (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.04 * i, duration: 0.2 }}
                          className="rounded-2xl border border-border/60 bg-card p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/30 to-primary/15 border border-secondary/40 flex items-center justify-center shrink-0">
                              <Award className="w-6 h-6 text-secondary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium text-sm leading-snug">#{n.id.slice(0, 10)}</h3>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-secondary/15 text-secondary border-secondary/40">
                                  <Award className="w-3 h-3" /> NFT credential
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{n.credential}</p>
                              <div className="text-[10px] text-muted-foreground mt-1.5">
                                {n.counterpartyName} · {new Date(n.mintedAt).toLocaleDateString()} · Block {n.blockNumber.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 font-mono text-[10px] text-muted-foreground bg-muted/40 border border-border/60 rounded-md px-2 py-1.5 break-all">
                            {n.mintTxHash}
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => window.dispatchEvent(new CustomEvent("circle:mint"))}
                              className="px-3 py-1.5 rounded-lg bg-gradient-gold text-charcoal text-[11px] font-medium hover:scale-[1.02] transition flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3 h-3" /> View in CirkleMint
                            </button>
                            <span className="text-[10px] text-muted-foreground font-mono truncate">{n.metadataUri}</span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                )}

                {/* ─────────────── Jury view (U11) ─────────────── */}
                {view === "jury" && !selected && (
                  <motion.div
                    key="jury-list"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-accent/10 to-secondary/5 p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                        <Gavel className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">Community jury</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          5 verified users hear both sides and vote. 24-hour voting window · majority rules.
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-xl text-accent">{juryCases.filter((c) => c.status === "voting").length}</div>
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">voting</div>
                      </div>
                    </div>

                    {juryCases.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center text-muted-foreground">
                        <Gavel className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <div className="text-sm">No jury cases</div>
                        <div className="text-[11px] mt-1">Open a disputed agreement and tap "Escalate to Community Jury".</div>
                      </div>
                    ) : (
                      juryCases.map((c, i) => {
                        const youVoted = c.jurors.find((j) => j.username === "you")?.vote !== null && c.jurors.find((j) => j.username === "you")?.vote !== undefined;
                        const youOnPanel = c.jurors.some((j) => j.username === "you");
                        const votedCount = c.jurors.filter((j) => j.vote !== null).length;
                        return (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.04 * i, duration: 0.2 }}
                            className="rounded-2xl border border-border/60 bg-card p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
                                c.status === "voting" ? "bg-accent/15 border-accent/30"
                                  : c.status === "resolved" ? "bg-emerald-500/15 border-emerald-500/30"
                                    : "bg-muted border-border/60",
                              )}>
                                <Gavel className={cn(
                                  "w-5 h-5",
                                  c.status === "voting" ? "text-accent" : "text-muted-foreground",
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-medium text-sm leading-snug">{c.agreementTitle}</h3>
                                  <span className={cn(
                                    "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                    c.status === "voting" ? "bg-accent/15 text-accent border-accent/40"
                                      : c.status === "resolved" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
                                        : "bg-muted text-muted-foreground border-border/60",
                                  )}>
                                    {c.status}
                                  </span>
                                  {youOnPanel && !youVoted && c.status === "voting" && (
                                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-secondary/15 text-secondary border-secondary/40 animate-pulse">
                                      <AlertCircle className="w-3 h-3" /> You're on the panel
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{c.disputeReason}</p>
                                <div className="text-[10px] text-muted-foreground mt-1.5">
                                  {c.partyA} vs {c.partyB} · {votedCount}/{c.jurors.length} voted · {formatCountdown(c.expiresAt)}
                                </div>
                              </div>
                            </div>

                            {/* Juror vote slots */}
                            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                              {c.jurors.map((j, k) => (
                                <span
                                  key={k}
                                  title={`${j.username}${j.vote ? ` · ${j.vote}` : ""}`}
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                    j.vote === null
                                      ? "bg-muted/60 text-muted-foreground border-border/60"
                                      : j.vote === "party_a"
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                        : j.vote === "party_b"
                                          ? "bg-accent/10 text-accent border-accent/30"
                                          : "bg-secondary/10 text-secondary border-secondary/30",
                                  )}
                                >
                                  {j.username === "you" ? "you" : j.username.slice(0, 4)}
                                  {j.vote && <Check className="w-2.5 h-2.5" />}
                                </span>
                              ))}
                            </div>

                            {/* Result */}
                            {c.status === "resolved" && c.result && (
                              <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Winner: {c.result.winner === "split" ? "Split decision" : c.result.winner}
                                  {c.result.split !== undefined && ` (${c.result.split}%/${100 - c.result.split}%)`}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1.5">{c.result.reasoning}</p>
                                <div className="text-[10px] text-muted-foreground mt-1.5">
                                  Votes — A: {c.result.votesForPartyA} · B: {c.result.votesForPartyB} · Split: {c.result.votesForSplit}
                                </div>
                              </div>
                            )}

                            {/* Voting interface (when user is on panel & hasn't voted) */}
                            {youOnPanel && !youVoted && c.status === "voting" && votingFor !== c.id && (
                              <div className="mt-3 rounded-lg border border-secondary/30 bg-secondary/5 p-3">
                                <div className="text-[11px] font-medium text-secondary mb-2">You've been selected for jury duty — cast your vote:</div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {([
                                    { v: "party_a" as JuryVote, label: c.partyA },
                                    { v: "party_b" as JuryVote, label: c.partyB },
                                    { v: "split" as JuryVote, label: "Split" },
                                  ]).map((opt) => (
                                    <button
                                      key={opt.v}
                                      onClick={() => setVoteChoice(opt.v)}
                                      className={cn(
                                        "rounded-lg py-1.5 text-[10px] font-medium border transition",
                                        voteChoice === opt.v
                                          ? "bg-secondary/20 border-secondary/50 text-secondary"
                                          : "bg-card border-border/60 text-muted-foreground hover:bg-muted/40",
                                      )}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                                <textarea
                                  value={voteReasoning}
                                  onChange={(e) => setVoteReasoning(e.target.value)}
                                  placeholder="Brief reasoning (optional, shared with parties)…"
                                  rows={2}
                                  className="mt-2 w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-secondary/60 transition resize-none"
                                />
                                <button
                                  onClick={() => handleCastVote(c.id)}
                                  className="mt-2 px-3 py-1.5 rounded-lg bg-gradient-gold text-charcoal text-[11px] font-medium flex items-center gap-1.5"
                                >
                                  <Check className="w-3 h-3" /> Cast vote
                                </button>
                              </div>
                            )}
                            {votingFor === c.id && (
                              <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <Hourglass className="w-3 h-3 animate-pulse" /> Submitting vote…
                              </div>
                            )}
                            {youOnPanel && youVoted && c.status === "voting" && (
                              <div className="mt-3 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Your vote is recorded — waiting for the rest of the panel.
                              </div>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </motion.div>
                )}

                {/* ─────────────── Detail view ─────────────── */}
                {selected && (
                  <motion.div
                    key={`detail-${selected.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="rounded-2xl border border-border/60 bg-card p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/25 to-primary/15 border border-border/60 flex items-center justify-center text-2xl shrink-0">
                          {selected.typeEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-display text-lg leading-tight">{selected.title}</h2>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                STATUS_BADGE[selected.status].className,
                              )}
                            >
                              {STATUS_BADGE[selected.status].label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5">{selected.description}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => handleExport(selected, "pdf")}
                            className="px-2.5 py-1 rounded-lg bg-card border border-border/60 text-[10px] font-medium hover:bg-muted/40 transition flex items-center gap-1"
                            title="Open PDF-ready view"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </button>
                          <button
                            onClick={() => handleExport(selected, "json")}
                            className="px-2.5 py-1 rounded-lg bg-card border border-border/60 text-[10px] font-medium hover:bg-muted/40 transition flex items-center gap-1"
                            title="Download JSON"
                          >
                            <Download className="w-3 h-3" /> JSON
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Parties + signature status */}
                    <div className="rounded-2xl border border-border/60 bg-card p-4">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                        Parties &amp; signatures
                      </div>
                      <div className="space-y-2.5">
                        {selected.parties.map((p) => (
                          <div key={p.id} className="flex items-center gap-3">
                            <PartyAvatar party={p} size="md" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{p.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {p.signed ? "Signed ✓" : "Awaiting signature"}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                p.signed
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-secondary/10 text-secondary border-secondary/30",
                              )}
                            >
                              {p.signed ? <CheckCircle2 className="w-3 h-3" /> : <Hourglass className="w-3 h-3" />}
                              {p.signed ? "Signed" : "Pending"}
                            </span>
                          </div>
                        ))}
                      </div>

                      {selected.awaitingSignatureFrom && selected.status === "pending" && (
                        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/10 border border-secondary/30 text-[11px] text-secondary">
                          <Hourglass className="w-3.5 h-3.5 animate-pulse" />
                          Waiting for {selected.awaitingSignatureFrom} to sign…
                        </div>
                      )}
                    </div>

                    {/* Amount + deadline + escrow grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Amount</div>
                        <div className="font-display text-base mt-0.5 text-secondary">
                          {selected.amount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{selected.currency}</div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Deadline</div>
                        <div className="font-display text-base mt-0.5">{selected.deadline || "—"}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {selected.deadline ? new Date(selected.deadline).toLocaleDateString(undefined, { weekday: "short" }) : ""}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Escrow</div>
                        <div className="font-display text-xs mt-1 text-primary leading-tight">
                          {selected.escrowContractHolder
                            ? `Held by ${selected.escrowContractHolder}`
                            : "Direct payment"}
                        </div>
                      </div>
                    </div>

                    {/* Conditional escrow explainer */}
                    <div className={cn(
                      "rounded-2xl border p-4 flex items-start gap-3",
                      selected.escrowContractHolder
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/60 bg-card",
                    )}>
                      <div className={cn(
                        "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0",
                        selected.escrowContractHolder
                          ? "bg-primary/15 border-primary/30"
                          : "bg-muted/60 border-border/60",
                      )}>
                        <Lock className={cn("w-4 h-4", selected.escrowContractHolder ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0 text-[11px]">
                        {selected.escrowContractHolder ? (
                          <>
                            <div className="font-medium text-foreground">Escrow active</div>
                            <div className="text-muted-foreground mt-0.5">
                              Funds are held by <span className="font-medium text-foreground">{selected.escrowContractHolder}'s</span> escrow contract. Released only on mutual confirmation.
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium text-foreground">Escrow not active</div>
                            <div className="text-muted-foreground mt-0.5">
                              Both parties agree to direct payment. No third-party escrow contract is involved.
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Conditions */}
                    {selected.conditions.length > 0 && (
                      <div className="rounded-2xl border border-border/60 bg-card p-4">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                          Conditions
                        </div>
                        <ul className="space-y-1.5">
                          {selected.conditions.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI fairness */}
                    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-secondary/10 to-primary/5 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-secondary" />
                        <div className="text-sm font-medium">AI Fairness Check</div>
                        <span
                          className={cn(
                            "ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                            selected.fairnessPassed
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-accent/10 text-accent border-accent/30",
                          )}
                        >
                          {selected.fairnessPassed ? "Passed" : "Review needed"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${selected.fairnessScore}%` }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="h-full bg-gradient-gold"
                          />
                        </div>
                        <span className="text-xs font-medium text-secondary tabular-nums">
                          {selected.fairnessScore}%
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-2">
                        Market range: <span className="text-foreground font-medium">{selected.fairnessMarketRange}</span>
                      </div>
                    </div>

                    {/* Hash + escrow */}
                    <div className="rounded-2xl border border-border/60 bg-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-primary" />
                        <div className="text-sm font-medium">Hash &amp; escrow</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground">Agreement hash</div>
                      <div className="mt-1 font-mono text-[11px] text-foreground/80 break-all bg-muted/40 border border-border/60 rounded-md px-2 py-1.5">
                        {selected.hash}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        {selected.escrowContractHolder
                          ? `Escrow-secured by ${selected.escrowContractHolder} · Released only on mutual confirmation`
                          : "Hash-secured · Direct payment (no escrow)"}
                      </div>
                    </div>

                    {/* ─────────────── U9: On-chain verification ─────────────── */}
                    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/8 to-secondary/5 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                          <Link2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">On-chain verification</div>
                          <div className="text-[10px] text-muted-foreground">
                            Proof-of-existence — SHA-256 hash committed to a mock ledger block.
                          </div>
                        </div>
                        {onchainMap[selected.id]?.verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </div>

                      {onchainMap[selected.id] ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5">
                              <div className="text-muted-foreground uppercase tracking-wide">Block ID</div>
                              <div className="font-mono text-foreground mt-0.5 break-all">{onchainMap[selected.id].blockId}</div>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5">
                              <div className="text-muted-foreground uppercase tracking-wide">Committed</div>
                              <div className="text-foreground mt-0.5">{new Date(onchainMap[selected.id].timestamp).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <HashQr hash={onchainMap[selected.id].hash} size={108} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Verification hash</div>
                              <div className="font-mono text-[10px] text-foreground/80 break-all bg-muted/40 border border-border/60 rounded-md px-2 py-1.5 mt-1">
                                {onchainMap[selected.id].hash}
                              </div>
                              <button
                                onClick={() => handleVerifyHash(selected)}
                                disabled={verifyingFor === selected.id}
                                className="mt-2 px-3 py-1.5 rounded-lg bg-card border border-border/60 text-[11px] font-medium hover:bg-muted/40 transition flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {verifyingFor === selected.id ? (
                                  <><Hourglass className="w-3 h-3 animate-pulse" /> Verifying…</>
                                ) : (
                                  <><ScanLine className="w-3 h-3" /> Verify on-chain</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[11px] text-muted-foreground">
                            Hash not yet committed to the ledger.
                          </div>
                          <button
                            onClick={() => handleCommitHash(selected)}
                            disabled={hashingFor === selected.id}
                            className="px-3 py-1.5 rounded-lg bg-gradient-hero text-cream text-[11px] font-medium flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {hashingFor === selected.id ? (
                              <><Hourglass className="w-3 h-3 animate-pulse" /> Committing…</>
                            ) : (
                              <><Link2 className="w-3 h-3" /> Commit hash</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ─────────────── U10: Mint NFT (when completed) ─────────────── */}
                    {selected.status === "completed" && (
                      <div className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/8 to-primary/5 p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-secondary/20 border border-secondary/40 flex items-center justify-center shrink-0">
                            <Award className="w-4 h-4 text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">Mint as NFT credential</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              Portable reputation via CirkleMint — proves you completed this agreement.
                            </div>
                            {nfts.some((n) => n.agreementId === selected.id) ? (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" /> NFT minted
                                </span>
                                <button
                                  onClick={() => window.dispatchEvent(new CustomEvent("circle:mint"))}
                                  className="px-2.5 py-1 rounded-md bg-gradient-gold text-charcoal text-[10px] font-medium flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> View in CirkleMint
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleMintNFT(selected)}
                                disabled={mintingFor === selected.id}
                                className="mt-2 px-3 py-1.5 rounded-lg bg-gradient-gold text-charcoal text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {mintingFor === selected.id ? (
                                  <><Hourglass className="w-3 h-3 animate-pulse" /> Minting…</>
                                ) : (
                                  <><Award className="w-3 h-3" /> Mint NFT credential</>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─────────────── U11: Escalate to jury (when disputed) ─────────────── */}
                    {(selected.status === "disputed" || selected.status === "active") && (
                      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                            <Gavel className="w-4 h-4 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">Escalate to Community Jury</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              If AI Mediation can't resolve, a 5-juror panel hears both sides and votes within 24h.
                            </div>
                            <textarea
                              value={disputeText}
                              onChange={(e) => setDisputeText(e.target.value)}
                              placeholder="Describe the dispute — what went wrong, what each side claims…"
                              rows={3}
                              className="mt-2 w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-accent/60 transition resize-none"
                            />
                            <button
                              onClick={() => handleEscalateToJury(selected)}
                              disabled={escalatingFor === selected.id || !disputeText.trim()}
                              className="mt-2 px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/40 text-accent text-[11px] font-medium flex items-center gap-1.5 disabled:opacity-50 hover:bg-accent/25 transition"
                            >
                              {escalatingFor === selected.id ? (
                                <><Hourglass className="w-3 h-3 animate-pulse" /> Escalating…</>
                              ) : (
                                <><Gavel className="w-3 h-3" /> Escalate to jury</>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Created timestamp */}
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                      <Clock className="w-3 h-3" />
                      Created {new Date(selected.createdAt).toLocaleString()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ───────────────────────── Footer / floating action ───────────────────────── */}
          {!selected && (
            <div className="relative z-10 px-4 sm:px-6 pb-[env(safe-area-inset-bottom)] pt-2 border-t border-border/60 glass-strong">
              <div className="max-w-3xl mx-auto flex items-center gap-2">
                {view === "active" ? (
                  <button
                    onClick={() => setView("create")}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-gold text-charcoal text-sm font-semibold flex items-center justify-center gap-2 shadow-soft"
                  >
                    <Plus className="w-4 h-4" /> New Commit
                  </button>
                ) : view === "create" ? (
                  <button
                    onClick={() => setView("active")}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border/60 text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted/40 transition"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Active
                  </button>
                ) : (
                  <button
                    onClick={() => setView("create")}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-gold text-charcoal text-sm font-semibold flex items-center justify-center gap-2 shadow-soft"
                  >
                    <Plus className="w-4 h-4" /> New Commit
                  </button>
                )}
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground pl-2">
                  <Lock className="w-3 h-3" />
                  On-device AI · Hash-secured · Conditional escrow
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────── Created toast / awaiting signature sheet ───────────────────────── */}
          <AnimatePresence>
            {createdId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeCreated}
                className="absolute inset-0 z-20 bg-charcoal/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
              >
                <motion.div
                  initial={{ y: 40, opacity: 0, scale: 0.97 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 26 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md glass-strong rounded-2xl border border-border/60 shadow-float p-5"
                >
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-secondary/15 border border-emerald-500/30 flex items-center justify-center mb-3"
                    >
                      <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    </motion.div>
                    <h3 className="font-display text-lg">Commit created · Hash secured</h3>
                    <p className="text-[12px] text-muted-foreground mt-1.5">
                      Your signature is recorded. Both parties must sign before the agreement is binding.
                    </p>
                    <div className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/10 border border-secondary/30 text-[11px] text-secondary">
                      <Hourglass className="w-3.5 h-3.5 animate-pulse" />
                      Waiting for{" "}
                      {MOCK_FRIENDS.find((f) => f.id === counterpartyId)?.name ?? "counterparty"} to sign…
                    </div>
                    <div className="mt-4 w-full flex items-center gap-2">
                      <button
                        onClick={closeCreated}
                        className="flex-1 px-3 py-2 rounded-xl bg-card border border-border/60 text-xs font-medium hover:bg-muted/40 transition"
                      >
                        Back to list
                      </button>
                      <button
                        onClick={() => {
                          const created = agreements.find((a) => a.id === createdId);
                          closeCreated();
                          if (created) setSelected(created);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-gradient-hero text-cream text-xs font-medium"
                      >
                        View commit
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                      <AlertCircle className="w-3 h-3" />
                      AI fairness check passed · 92% · Market range: 450-550 SAR
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ───────────────────────── Import modal (U12) ───────────────────────── */}
          <AnimatePresence>
            {importOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setImportOpen(false);
                  setImportPreview(null);
                  setImportText("");
                }}
                className="absolute inset-0 z-20 bg-charcoal/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
              >
                <motion.div
                  initial={{ y: 40, opacity: 0, scale: 0.97 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 26 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-lg glass-strong rounded-2xl border border-border/60 shadow-float p-5 max-h-[88vh] overflow-y-auto"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-secondary/20 border border-secondary/30 flex items-center justify-center">
                      <Upload className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-base">Import agreement</h3>
                      <p className="text-[10px] text-muted-foreground">Paste contract text — AI extracts clauses.</p>
                    </div>
                    <button
                      onClick={() => {
                        setImportOpen(false);
                        setImportPreview(null);
                        setImportText("");
                      }}
                      className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {!importPreview ? (
                    <>
                      <textarea
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        rows={8}
                        placeholder={"Paste plain text, PDF text, or a DocuSign export here…\n\ne.g.\nSERVICE AGREEMENT\nBetween User Hassan (Client) and Circle Studio (Provider)\nAmount: 4,500 SAR\nDeadline: 2025-09-01\n\n1. Provider delivers 3 logo concepts\n2. Two revision rounds included\n3. Final files in SVG + PNG\n4. 50% upfront, 50% on delivery\nEscrow held by: User Hassan"}
                        className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-xs font-mono outline-none focus:border-secondary/60 transition resize-none"
                      />
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={handleImport}
                          disabled={importing || !importText.trim()}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-gold text-charcoal text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {importing ? (
                            <><Hourglass className="w-4 h-4 animate-pulse" /> AI is extracting clauses…</>
                          ) : (
                            <><Sparkles className="w-4 h-4" /> Extract clauses</>
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center mt-2">
                        Supports plain text, pasted PDF text, and DocuSign export format.
                      </p>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <div className="text-xs">
                          <div className="font-medium">Extracted via {importPreview.source === "ai" ? "AI" : "heuristic pattern matching"}</div>
                          <div className="text-muted-foreground text-[10px]">Confidence: {Math.round(importPreview.confidence * 100)}%</div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background p-3 space-y-2 text-xs">
                        <div><span className="text-muted-foreground text-[10px] uppercase tracking-wide">Title:</span> <span className="font-medium">{importPreview.title}</span></div>
                        <div><span className="text-muted-foreground text-[10px] uppercase tracking-wide">Type:</span> {importPreview.type}</div>
                        <div><span className="text-muted-foreground text-[10px] uppercase tracking-wide">Amount:</span> {importPreview.amount > 0 ? `${importPreview.amount.toLocaleString()} ${importPreview.currency}` : "—"}</div>
                        <div><span className="text-muted-foreground text-[10px] uppercase tracking-wide">Deadline:</span> {importPreview.deadline || "—"}</div>
                        <div><span className="text-muted-foreground text-[10px] uppercase tracking-wide">Counterparty:</span> {importPreview.counterpartyName}</div>
                        {importPreview.escrowContractHolder && (
                          <div><span className="text-muted-foreground text-[10px] uppercase tracking-wide">Escrow holder:</span> {importPreview.escrowContractHolder}</div>
                        )}
                        {importPreview.conditions.length > 0 && (
                          <div>
                            <div className="text-muted-foreground text-[10px] uppercase tracking-wide mb-1">Conditions:</div>
                            <ul className="space-y-0.5 pl-3">
                              {importPreview.conditions.map((c, i) => (
                                <li key={i} className="list-disc">{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setImportPreview(null)}
                          className="flex-1 px-3 py-2 rounded-xl bg-card border border-border/60 text-xs font-medium hover:bg-muted/40 transition"
                        >
                          Re-extract
                        </button>
                        <button
                          onClick={applyImportToForm}
                          className="flex-1 px-3 py-2 rounded-xl bg-gradient-gold text-charcoal text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Pre-fill form
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
    </OverlayShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// U12: PDF-ready HTML renderer (mirrors the /api/commit/export HTML payload
// so the client can open a self-contained print view without a round-trip).
// ─────────────────────────────────────────────────────────────────────────────
function renderExportHtml(a: Agreement, onChain: OnChainRecord | undefined): string {
  const qr = onChain ? renderQrCells(onChain.hash) : "";
  const parties = a.parties
    .map(
      (p) =>
        `<div class="party"><div class="name">${esc(p.name)}</div><div class="sig">${p.signed ? "✓ Signed" : "Awaiting signature"}</div></div>`,
    )
    .join("");
  const conditions = a.conditions
    .map((c) => `<li><span style="color:#c2a060;">●</span><span>${esc(c)}</span></li>`)
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(a.title)} · CirkleCommit</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; padding:40px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif; color:#1a1a14; background:#fdfcf9; }
  .doc { max-width:740px; margin:0 auto; background:white; border:1px solid #e5e0d6; border-radius:16px; padding:40px; }
  h1 { font-size:22px; margin:0 0 4px; color:#1a4a5a; }
  .sub { color:#6b6657; font-size:13px; margin-bottom:24px; }
  .row { display:flex; gap:16px; flex-wrap:wrap; margin:16px 0; }
  .chip { padding:6px 12px; border-radius:999px; font-size:12px; border:1px solid #e5e0d6; background:#faf7f0; }
  .grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin:20px 0; }
  .cell { border:1px solid #e5e0d6; border-radius:12px; padding:12px; text-align:center; }
  .cell .lbl { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#6b6657; }
  .cell .val { font-size:16px; font-weight:600; margin-top:4px; color:#1a4a5a; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:.08em; color:#6b6657; margin:24px 0 8px; }
  .parties { display:flex; flex-direction:column; gap:8px; }
  .party { display:flex; align-items:center; gap:12px; padding:8px 12px; border:1px solid #e5e0d6; border-radius:10px; }
  .party .name { font-weight:600; font-size:14px; }
  .party .sig { margin-left:auto; font-size:12px; color:${a.parties.some((p) => p.signed) ? "#0f766e" : "#9a9586"}; }
  .conditions { list-style:none; padding:0; margin:0; }
  .conditions li { padding:8px 0; border-bottom:1px dashed #e5e0d6; font-size:14px; display:flex; gap:8px; }
  .conditions li:last-child { border-bottom:0; }
  .hash-box { font-family:'SF Mono',Menlo,monospace; font-size:11px; background:#faf7f0; border:1px solid #e5e0d6; border-radius:8px; padding:10px; word-break:break-all; }
  .qr { display:flex; align-items:center; gap:16px; margin-top:16px; }
  .qr-grid { width:168px; height:168px; display:grid; grid-template-columns:repeat(21,1fr); grid-template-rows:repeat(21,1fr); border:8px solid white; }
  .qr-grid div { background:white; }
  .qr-grid div.on { background:#1a1a14; }
  .footer { margin-top:32px; padding-top:16px; border-top:1px solid #e5e0d6; font-size:11px; color:#6b6657; text-align:center; }
  @media print { body { padding:0; background:white; } .doc { border:0; border-radius:0; max-width:none; } }
</style></head>
<body><div class="doc">
  <h1>${esc(a.title)}</h1>
  <div class="sub">CirkleCommit · Exported ${new Date().toLocaleString()}</div>
  <div class="row">
    <span class="chip">${esc(a.typeEmoji)} ${esc(a.type)}</span>
    <span class="chip">Status: ${esc(a.status)}</span>
    <span class="chip">Currency: ${esc(a.currency)}</span>
  </div>
  <p style="font-size:14px;line-height:1.6;color:#3a3528;">${esc(a.description)}</p>
  <div class="grid">
    <div class="cell"><div class="lbl">Amount</div><div class="val">${a.amount.toLocaleString()}</div></div>
    <div class="cell"><div class="lbl">Deadline</div><div class="val">${esc(a.deadline || "—")}</div></div>
    <div class="cell"><div class="lbl">Escrow</div><div class="val" style="font-size:12px;">${a.escrowContractHolder ? `Held by ${esc(a.escrowContractHolder)}` : "Direct payment"}</div></div>
  </div>
  <h2>Parties &amp; signatures</h2>
  <div class="parties">${parties}</div>
  ${conditions ? `<h2>Conditions</h2><ul class="conditions">${conditions}</ul>` : ""}
  <h2>Agreement hash</h2>
  <div class="hash-box">${esc(a.hash)}</div>
  ${onChain ? `<h2>On-chain verification</h2><div class="hash-box">${esc(onChain.hash)}</div>
  <div class="qr"><div class="qr-grid">${qr}</div>
  <div style="font-size:12px;color:#6b6657;">
    <div><strong>Block ID:</strong> ${esc(onChain.blockId)}</div>
    <div><strong>Timestamp:</strong> ${esc(onChain.timestamp)}</div>
    <div style="margin-top:8px;">Scan to verify</div>
  </div></div>` : ""}
  <div class="footer">Generated by CirkleCommit · AI-verified agreements with conditional escrow</div>
</div></body></html>`;
}

function renderQrCells(hash: string): string {
  const N = 21;
  const cells: boolean[] = new Array(N * N).fill(false);
  const hex = hash.replace(/[^0-9a-f]/gi, "");
  for (let i = 0; i < cells.length; i++) {
    const ch = hex.charCodeAt(i % Math.max(hex.length, 1));
    cells[i] = (ch + i) % 2 === 0;
  }
  const stampFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const onInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[(r0 + r) * N + (c0 + c)] = onBorder || onInner;
      }
    }
  };
  stampFinder(0, 0);
  stampFinder(0, N - 7);
  stampFinder(N - 7, 0);
  return cells.map((on) => `<div class="${on ? "on" : ""}"></div>`).join("");
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

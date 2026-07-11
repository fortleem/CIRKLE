import { NextRequest, NextResponse } from "next/server";
import { rememberAgreementForExport } from "@/lib/commit-export-registry";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit — AI-verified agreements with escrow.
// Mock-backed route: GET lists sample agreements, POST creates a new agreement.
// (Upgrades the lost CirklePact — agreement hashes + escrow are simulated.)
// ─────────────────────────────────────────────────────────────────────────────

export type CommitType = "price" | "work" | "service" | "rental" | "group_buy";
export type CommitStatus = "pending" | "active" | "completed" | "disputed" | "draft";

export interface CommitAgreement {
  id: string;
  type: CommitType;
  typeLabel: string;
  typeEmoji: string;
  title: string;
  description: string;
  parties: { id: string; name: string; initials: string; color: "gold" | "teal" | "rose" | "steel" | "charcoal"; signed: boolean }[];
  amount: number;
  currency: string;
  deadline: string;
  conditions: string[];
  status: CommitStatus;
  fairnessCheck: { passed: boolean; score: number; marketRange: string; note: string };
  hash: string;
  // Conditional escrow — escrow is only active when one of the parties has
  // an escrow contract. null = no escrow contract on either side.
  escrowContractHolder: string | null;
  escrow: "active" | "released" | "refunded" | "not_funded" | "none";
  createdAt: string;
  signedByYou: boolean;
  awaitingSignatureFrom?: string;
}

const SAMPLE_AGREEMENTS: CommitAgreement[] = [
  {
    id: "cm-1",
    type: "price",
    typeLabel: "Price",
    typeEmoji: "💰",
    title: "Laptop purchase — 500 SAR",
    description: "Used MacBook Air M2 in good condition. Includes original charger and sleeve. Final price agreed after inspection.",
    parties: [
      { id: "u_you", name: "You", initials: "YO", color: "teal", signed: true },
      { id: "u_ahmed", name: "Ahmed", initials: "AH", color: "gold", signed: false },
    ],
    amount: 500,
    currency: "SAR",
    deadline: "2025-08-14",
    conditions: ["Payment on delivery", "7-day inspection window", "Full refund if hardware fault found"],
    status: "pending",
    fairnessCheck: {
      passed: true,
      score: 92,
      marketRange: "450-580 SAR",
      note: "Fair price. Within 4% of the median for this model in Riyadh.",
    },
    hash: "0x7f3c91ab22e8d4a05c1b9f47e6a2d8c3b1f4e9d6a5c7b8e2f1d3a4b5c6d7e8f9",
    escrowContractHolder: "Ahmed",
    escrow: "active",
    createdAt: "2025-08-07T11:24:00.000Z",
    signedByYou: true,
    awaitingSignatureFrom: "Ahmed",
  },
  {
    id: "cm-2",
    type: "work",
    typeLabel: "Work Task",
    typeEmoji: "📋",
    title: "Website development — Due Friday",
    description: "Five-page marketing site for a local bakery. Responsive, RTL-aware, integrates WhatsApp ordering. One round of revisions included.",
    parties: [
      { id: "u_you", name: "You", initials: "YO", color: "teal", signed: true },
      { id: "u_layla", name: "Layla Bakery", initials: "LB", color: "rose", signed: true },
    ],
    amount: 1800,
    currency: "SAR",
    deadline: "2025-08-15",
    conditions: ["50% upfront in escrow", "50% on delivery", "Source files handed over on final payment"],
    status: "active",
    fairnessCheck: {
      passed: true,
      score: 86,
      marketRange: "1,400-2,200 SAR",
      note: "Slightly below market for 5 pages — fair given the long-term client relationship.",
    },
    hash: "0x2a8c5f1d9b3e7c4a6f0d2b8e1c5a9f3d7b4e6c2a8f0d1b3e5c7a9f2d4b6e8c1a3",
    escrowContractHolder: null,
    escrow: "none",
    createdAt: "2025-07-28T08:15:00.000Z",
    signedByYou: true,
  },
  {
    id: "cm-3",
    type: "service",
    typeLabel: "Service",
    typeEmoji: "🤝",
    title: "Car repair — 300 SAR on completion",
    description: "Brake pad replacement + general inspection on a 2018 Toyota Corolla. Parts and labor included. Completion = the moment the mechanic signs off the test drive.",
    parties: [
      { id: "u_you", name: "You", initials: "YO", color: "teal", signed: true },
      { id: "u_mechanic", name: "Karim Garage", initials: "KG", color: "steel", signed: true },
    ],
    amount: 300,
    currency: "SAR",
    deadline: "2025-07-22",
    conditions: ["Payment on completion", "Warranty 30 days on parts", "Free re-check if noise returns"],
    status: "completed",
    fairnessCheck: {
      passed: true,
      score: 95,
      marketRange: "260-340 SAR",
      note: "Fair price. Brake pad replacement averages 290 SAR in your area.",
    },
    hash: "0x9d4b2e8c6a1f3b5e7d9c4a2b8f0e6d1c3a5b7e9f2d4c6a8b0e2f4d6c8a1b3e5f7",
    escrowContractHolder: "Karim Garage",
    escrow: "released",
    createdAt: "2025-07-18T13:42:00.000Z",
    signedByYou: true,
  },
];

function genHash(): string {
  const hex = "0123456789abcdef";
  let h = "0x";
  for (let i = 0; i < 64; i++) h += hex[Math.floor(Math.random() * 16)];
  return h;
}

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    agreements: SAMPLE_AGREEMENTS,
    summary: {
      total: SAMPLE_AGREEMENTS.length,
      active: SAMPLE_AGREEMENTS.filter((a) => a.status === "active").length,
      pending: SAMPLE_AGREEMENTS.filter((a) => a.status === "pending").length,
      completed: SAMPLE_AGREEMENTS.filter((a) => a.status === "completed").length,
      escrowActive: SAMPLE_AGREEMENTS.filter((a) => a.escrow === "active").length,
      escrowNone: SAMPLE_AGREEMENTS.filter((a) => a.escrow === "none").length,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      type = "price",
      title,
      description = "",
      counterpartyName,
      amount = 0,
      currency = "SAR",
      deadline,
      conditions = [],
      escrowContractHolder = null,
    } = body as Record<string, unknown>;

    const safeType = (typeof type === "string" ? type : "price") as CommitType;
    const safeTitle = typeof title === "string" ? title.trim() : "";
    if (!safeTitle) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const safeCounterparty =
      typeof counterpartyName === "string" && counterpartyName.trim()
        ? counterpartyName.trim()
        : "Counterparty";
    const safeAmount = typeof amount === "number" && amount > 0 ? amount : 0;
    const safeCurrency = typeof currency === "string" ? currency : "SAR";
    const safeDeadline = typeof deadline === "string" ? deadline : "";
    const safeConditions = Array.isArray(conditions)
      ? conditions.filter((c): c is string => typeof c === "string").slice(0, 10)
      : [];

    // Conditional escrow — the holder must be a non-empty string. A name
    // containing "escrow" auto-qualifies (mock heuristic per the spec); an
    // explicit `escrowContractHolder` value always wins.
    const holderRaw =
      typeof escrowContractHolder === "string" && escrowContractHolder.trim()
        ? escrowContractHolder.trim()
        : null;
    const holder =
      holderRaw ?? (/\bescrow\b/i.test(safeCounterparty) ? safeCounterparty : null);
    const escrow: CommitAgreement["escrow"] = holder ? "active" : "none";

    const TYPE_META: Record<CommitType, { label: string; emoji: string }> = {
      price: { label: "Price", emoji: "💰" },
      work: { label: "Work Task", emoji: "📋" },
      service: { label: "Service", emoji: "🤝" },
      rental: { label: "Rental", emoji: "🏠" },
      group_buy: { label: "Group Buy", emoji: "📦" },
    };

    const initials =
      safeCounterparty
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "CP";

    // Simulated fairness check — runs synchronously server-side so the response
    // carries a usable verdict without an extra round-trip.
    const lo = Math.round(safeAmount * 0.9);
    const hi = Math.round(safeAmount * 1.1);
    const score = 70 + Math.floor(Math.random() * 28); // 70-97
    const passed = score >= 70;

    const agreement: CommitAgreement = {
      id: `cm-${Date.now()}`,
      type: safeType,
      typeLabel: TYPE_META[safeType].label,
      typeEmoji: TYPE_META[safeType].emoji,
      title: safeTitle,
      description: typeof description === "string" ? description : "",
      parties: [
        { id: "u_you", name: "You", initials: "YO", color: "teal", signed: true },
        {
          id: "u_cp",
          name: safeCounterparty,
          initials,
          color: "gold",
          signed: false,
        },
      ],
      amount: safeAmount,
      currency: safeCurrency,
      deadline: safeDeadline,
      conditions: safeConditions,
      status: "pending",
      fairnessCheck: {
        passed,
        score,
        marketRange: `${lo}-${hi} ${safeCurrency}`,
        note: passed
          ? `Fair price. Within range for ${TYPE_META[safeType].label.toLowerCase()} agreements in your area.`
          : "Outside typical range — review conditions before signing.",
      },
      hash: genHash(),
      escrowContractHolder: holder,
      escrow,
      createdAt: new Date().toISOString(),
      signedByYou: true,
      awaitingSignatureFrom: safeCounterparty,
    };

    // Remember the new agreement in the export registry so the U12 export
    // endpoint can resolve it without a database lookup.
    rememberAgreementForExport(agreement as unknown as Record<string, unknown>);

    return NextResponse.json(
      {
        ok: true,
        agreement,
        message:
          escrow === "active"
            ? `Commit created · Hash secured · Escrow active by ${holder}`
            : "Commit created · Hash secured · Direct payment (no escrow)",
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create commit", details: String(err) },
      { status: 500 },
    );
  }
}

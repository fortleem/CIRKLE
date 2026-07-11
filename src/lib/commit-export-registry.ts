import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U12 — In-memory registry for export lookups.
// The export route needs to resolve an agreement by id; this module keeps the
// last N agreements created via POST /api/commit so the GET /api/commit/export
// endpoint can find them without a real database. In production this would be
// a Prisma lookup.
// ─────────────────────────────────────────────────────────────────────────────

const MAX = 200;
const registry = new Map<string, Record<string, unknown>>();

export function rememberAgreementForExport(agreement: Record<string, unknown>): void {
  if (typeof agreement.id !== "string") return;
  registry.set(agreement.id, agreement);
  // Cap the registry size — drop the oldest entries.
  if (registry.size > MAX) {
    const firstKey = registry.keys().next().value;
    if (firstKey) registry.delete(firstKey);
  }
}

export function lookupAgreementForExport(id: string): Record<string, unknown> | null {
  return registry.get(id) ?? null;
}

/** Seed the registry with sample agreements on first import. */
function seedSamples(): void {
  const now = new Date().toISOString();
  const samples: Array<Record<string, unknown>> = [
    {
      id: "cm-1",
      type: "price",
      typeLabel: "Price",
      typeEmoji: "💰",
      title: "Laptop purchase — 500 SAR",
      description:
        "Used MacBook Air M2 in good condition. Includes original charger and sleeve. Final price agreed after inspection.",
      parties: [
        { id: "u_you", name: "You", initials: "YO", color: "teal", signed: true },
        { id: "u_ahmed", name: "Ahmed", initials: "AH", color: "gold", signed: false },
      ],
      amount: 500,
      currency: "SAR",
      deadline: "2025-08-14",
      conditions: ["Payment on delivery", "7-day inspection window", "Full refund if hardware fault found"],
      status: "pending",
      escrowContractHolder: "Ahmed",
      escrow: "active",
      createdAt: "2025-08-07T11:24:00.000Z",
    },
    {
      id: "cm-2",
      type: "work",
      typeLabel: "Work Task",
      typeEmoji: "📋",
      title: "Website development — Due Friday",
      description:
        "Five-page marketing site for a local bakery. Responsive, RTL-aware, integrates WhatsApp ordering. One round of revisions included.",
      parties: [
        { id: "u_you", name: "You", initials: "YO", color: "teal", signed: true },
        { id: "u_layla", name: "Layla Bakery", initials: "LB", color: "rose", signed: true },
      ],
      amount: 1800,
      currency: "SAR",
      deadline: "2025-08-15",
      conditions: ["50% upfront in escrow", "50% on delivery", "Source files handed over on final payment"],
      status: "active",
      escrowContractHolder: null,
      escrow: "none",
      createdAt: "2025-07-28T08:15:00.000Z",
    },
    {
      id: "cm-3",
      type: "service",
      typeLabel: "Service",
      typeEmoji: "🤝",
      title: "Car repair — 300 SAR on completion",
      description:
        "Brake pad replacement + general inspection on a 2018 Toyota Corolla. Parts and labor included. Completion = the moment the mechanic signs off the test drive.",
      parties: [
        { id: "u_you", name: "You", initials: "YO", color: "teal", signed: true },
        { id: "u_mechanic", name: "Karim Garage", initials: "KG", color: "steel", signed: true },
      ],
      amount: 300,
      currency: "SAR",
      deadline: "2025-07-22",
      conditions: ["Payment on completion", "Warranty 30 days on parts", "Free re-check if noise returns"],
      status: "completed",
      escrowContractHolder: "Karim Garage",
      escrow: "released",
      createdAt: "2025-07-18T13:42:00.000Z",
    },
  ];
  for (const s of samples) {
    if (!registry.has(s.id as string)) registry.set(s.id as string, { ...s, _seededAt: now });
  }
}

seedSamples();

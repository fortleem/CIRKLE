import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U8 — Recurring Agreements
// In-memory store (mirrors the mock-backed /api/commit pattern). A recurring
// agreement wraps a base agreement and re-charges on a fixed cadence with a
// cancel-notice window. In production this would be backed by a Prisma model
// + a scheduled job; here we keep it server-only and synchronous.
// ─────────────────────────────────────────────────────────────────────────────

export type RecurringFrequency = "weekly" | "monthly" | "quarterly" | "yearly";
export type RecurringStatus = "active" | "cancelled" | "paused";
export type ChargeStatus = "paid" | "pending" | "failed";

export interface RecurringCharge {
  date: string; // ISO date
  amount: number;
  status: ChargeStatus;
}

export interface RecurringAgreement {
  id: string;
  baseAgreementId: string;
  title: string;
  counterpartyName: string;
  frequency: RecurringFrequency;
  amount: number;
  currency: string;
  nextCharge: string; // ISO date
  autoRenew: boolean;
  cancelNoticeDays: number; // e.g. 30
  status: RecurringStatus;
  charges: RecurringCharge[];
  createdAt: string;
  cancelledAt?: string;
}

// In-memory store keyed by id. Survives across requests within the same
// dev-server process — exactly what the mock /api/commit route does.
const store = new Map<string, RecurringAgreement>();

// Seed a couple of sample recurring agreements so the UI has something to
// render on first load.
const NOW = new Date();
function isoDaysFromNow(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const SEED_RECURRING: RecurringAgreement[] = [
  {
    id: "rcr-1",
    baseAgreementId: "cm-2",
    title: "Bakery website retainer",
    counterpartyName: "Layla Bakery",
    frequency: "monthly",
    amount: 600,
    currency: "SAR",
    nextCharge: isoDaysFromNow(3),
    autoRenew: true,
    cancelNoticeDays: 30,
    status: "active",
    charges: [
      { date: isoDaysFromNow(-27), amount: 600, status: "paid" },
      { date: isoDaysFromNow(3), amount: 600, status: "pending" },
    ],
    createdAt: isoDaysFromNow(-57),
  },
  {
    id: "rcr-2",
    baseAgreementId: "cm-3",
    title: "Car maintenance plan",
    counterpartyName: "Karim Garage",
    frequency: "quarterly",
    amount: 180,
    currency: "SAR",
    nextCharge: isoDaysFromNow(21),
    autoRenew: false,
    cancelNoticeDays: 14,
    status: "active",
    charges: [
      { date: isoDaysFromNow(-69), amount: 180, status: "paid" },
      { date: isoDaysFromNow(21), amount: 180, status: "pending" },
    ],
    createdAt: isoDaysFromNow(-90),
  },
];

for (const r of SEED_RECURRING) store.set(r.id, r);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const FREQUENCY_DAYS: Record<RecurringFrequency, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export function nextChargeDate(from: Date, frequency: RecurringFrequency): string {
  const d = new Date(from);
  d.setDate(d.getDate() + FREQUENCY_DAYS[frequency]);
  return d.toISOString();
}

export interface CreateRecurringInput {
  baseAgreementId: string;
  title: string;
  counterpartyName: string;
  frequency: RecurringFrequency;
  amount: number;
  currency: string;
  autoRenew: boolean;
  cancelNoticeDays: number;
}

export async function createRecurring(input: CreateRecurringInput): Promise<RecurringAgreement> {
  const id = `rcr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();
  const firstCharge = nextChargeDate(now, input.frequency);
  const recurring: RecurringAgreement = {
    id,
    baseAgreementId: input.baseAgreementId,
    title: input.title,
    counterpartyName: input.counterpartyName,
    frequency: input.frequency,
    amount: input.amount,
    currency: input.currency,
    nextCharge: firstCharge,
    autoRenew: input.autoRenew,
    cancelNoticeDays: input.cancelNoticeDays,
    status: "active",
    charges: [{ date: firstCharge, amount: input.amount, status: "pending" }],
    createdAt: now.toISOString(),
  };
  store.set(id, recurring);
  return recurring;
}

export async function listRecurring(): Promise<RecurringAgreement[]> {
  return Array.from(store.values()).sort((a, b) => +new Date(a.nextCharge) - +new Date(b.nextCharge));
}

export async function cancelRecurring(id: string): Promise<RecurringAgreement | null> {
  const r = store.get(id);
  if (!r) return null;
  r.status = "cancelled";
  r.cancelledAt = new Date().toISOString();
  store.set(id, r);
  return r;
}

export async function pauseRecurring(id: string): Promise<RecurringAgreement | null> {
  const r = store.get(id);
  if (!r) return null;
  r.status = r.status === "paused" ? "active" : "paused";
  store.set(id, r);
  return r;
}

/**
 * Sweep all active recurring agreements whose nextCharge is within the
 * reminder window (3 days). Returns the list that should trigger a reminder
 * toast on the client. Called by the recurring GET endpoint so the client
 * can show "renews in 3 days" notifications.
 */
export async function dueReminders(daysWindow = 3): Promise<RecurringAgreement[]> {
  const now = Date.now();
  const horizon = now + daysWindow * 24 * 60 * 60 * 1000;
  return Array.from(store.values()).filter((r) => {
    if (r.status !== "active") return false;
    const t = +new Date(r.nextCharge);
    return t >= now && t <= horizon;
  });
}

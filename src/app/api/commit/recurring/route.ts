import { NextRequest, NextResponse } from "next/server";
import {
  cancelRecurring,
  createRecurring,
  dueReminders,
  listRecurring,
  type RecurringFrequency,
} from "@/lib/commit-recurring";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U8 — Recurring Agreements API
//   GET    → list user's recurring agreements (+ due-in-3-days reminders)
//   POST   → create a recurring agreement from a base agreement
//   DELETE → cancel a recurring agreement by id
// ─────────────────────────────────────────────────────────────────────────────

const VALID_FREQ: RecurringFrequency[] = ["weekly", "monthly", "quarterly", "yearly"];

export async function GET() {
  const [recurring, reminders] = await Promise.all([listRecurring(), dueReminders(3)]);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    recurring,
    reminders, // agreements whose next charge is within 3 days
    summary: {
      total: recurring.length,
      active: recurring.filter((r) => r.status === "active").length,
      cancelled: recurring.filter((r) => r.status === "cancelled").length,
      paused: recurring.filter((r) => r.status === "paused").length,
      dueIn3Days: reminders.length,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      baseAgreementId,
      title,
      counterpartyName,
      frequency = "monthly",
      amount,
      currency = "SAR",
      autoRenew = true,
      cancelNoticeDays = 30,
    } = body as Record<string, unknown>;

    if (typeof baseAgreementId !== "string" || !baseAgreementId.trim()) {
      return NextResponse.json({ error: "baseAgreementId is required" }, { status: 400 });
    }
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const freq = (typeof frequency === "string" && VALID_FREQ.includes(frequency as RecurringFrequency)
      ? frequency
      : "monthly") as RecurringFrequency;
    const amt = typeof amount === "number" && amount > 0 ? amount : 0;
    if (amt <= 0) {
      return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    }
    const ccy = typeof currency === "string" ? currency : "SAR";
    const cp = typeof counterpartyName === "string" && counterpartyName.trim() ? counterpartyName.trim() : "Counterparty";
    const ar = typeof autoRenew === "boolean" ? autoRenew : true;
    const notice = typeof cancelNoticeDays === "number" && cancelNoticeDays >= 0 ? Math.min(cancelNoticeDays, 90) : 30;

    const recurring = await createRecurring({
      baseAgreementId,
      title: title.trim(),
      counterpartyName: cp,
      frequency: freq,
      amount: amt,
      currency: ccy,
      autoRenew: ar,
      cancelNoticeDays: notice,
    });

    return NextResponse.json({ ok: true, recurring }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create recurring", details: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query param is required" }, { status: 400 });
    }
    const cancelled = await cancelRecurring(id);
    if (!cancelled) {
      return NextResponse.json({ error: "Recurring agreement not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, recurring: cancelled });
  } catch (err) {
    return NextResponse.json({ error: "Failed to cancel recurring", details: String(err) }, { status: 500 });
  }
}

/**
 * Tipping service (Blueprint §7.4).
 *
 * Cirkle's creator-tipping model: any user can send a tip to any creator
 * via the creator's preferred local payment method. The platform takes
 * a small processing fee (varies by method) and pays out the net to the
 * creator. The on-the-wire payment itself is handled by the upstream
 * processor (Fawry, InstaPay, Stripe, USDC, etc.) — this service records
 * the intent + outcome and aggregates the creator's earnings.
 *
 * Country → methods matrix (per §7.4):
 *   Egypt  → Fawry, InstaPay, Vodafone Cash
 *   Saudi  → Mada, STC Pay, Apple Pay
 *   US     → Stripe, PayPal, Cash App
 *   Global → USDC, USDT (stablecoins, available everywhere)
 *
 * Privacy posture: tips are NOT anonymous by default (the sender's
 * username is recorded so the creator can thank them). A future
 * "anonymous tip" mode would record only a pseudonymous id.
 */

import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TipMethodId =
  | "fawry"
  | "instapay"
  | "vodafone_cash"
  | "mada"
  | "stc_pay"
  | "apple_pay"
  | "stripe"
  | "paypal"
  | "cash_app"
  | "usdc"
  | "usdt";

export interface TippingMethod {
  id: TipMethodId;
  name: string;
  /** Processing fee as a fraction of `amount` (0.02 = 2%). */
  feeRate: number;
  /** Flat fee in the tip's currency, in addition to the percentage. */
  flatFee: number;
  /** Human-readable estimated processing time. */
  processingTime: string;
  /** Icon/emoji for UI display. */
  icon: string;
  /** Countries where this method is available. ["*"] = global. */
  countries: string[];
}

export interface TippingOptions {
  country: string;
  methods: TippingMethod[];
}

export interface TipCalculation {
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  method: TippingMethod;
  processingTime: string;
}

export interface ProcessTipResult {
  id: string;
  status: "pending" | "completed" | "failed" | "refunded";
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  method: TipMethodId;
  createdAt: string;
}

export interface CreatorEarnings {
  creator: string;
  totalGross: number;
  totalNet: number;
  totalFees: number;
  pending: number;
  completed: number;
  byMethod: Record<string, { count: number; gross: number; net: number }>;
  recentTips: Array<{
    id: string;
    fromUser: string;
    amount: number;
    currency: string;
    method: TipMethodId;
    status: string;
    message: string | null;
    createdAt: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Method catalogue
// ─────────────────────────────────────────────────────────────────────────────

const METHODS: Record<TipMethodId, TippingMethod> = {
  fawry: {
    id: "fawry",
    name: "Fawry",
    feeRate: 0.025,
    flatFee: 2,
    processingTime: "1-2 business days",
    icon: "🏪",
    countries: ["EG"],
  },
  instapay: {
    id: "instapay",
    name: "InstaPay",
    feeRate: 0.01,
    flatFee: 0,
    processingTime: "Instant",
    icon: "⚡",
    countries: ["EG"],
  },
  vodafone_cash: {
    id: "vodafone_cash",
    name: "Vodafone Cash",
    feeRate: 0.02,
    flatFee: 0,
    processingTime: "Instant",
    icon: "📱",
    countries: ["EG"],
  },
  mada: {
    id: "mada",
    name: "Mada",
    feeRate: 0.015,
    flatFee: 0.5,
    processingTime: "Instant",
    icon: "💳",
    countries: ["SA"],
  },
  stc_pay: {
    id: "stc_pay",
    name: "STC Pay",
    feeRate: 0.01,
    flatFee: 0,
    processingTime: "Instant",
    icon: "📲",
    countries: ["SA"],
  },
  apple_pay: {
    id: "apple_pay",
    name: "Apple Pay",
    feeRate: 0.015,
    flatFee: 0,
    processingTime: "Instant",
    icon: "🍎",
    countries: ["SA", "US", "AE", "GB", "EG"],
  },
  stripe: {
    id: "stripe",
    name: "Stripe (Card)",
    feeRate: 0.029,
    flatFee: 0.3,
    processingTime: "2-7 business days",
    icon: "💳",
    countries: ["US"],
  },
  paypal: {
    id: "paypal",
    name: "PayPal",
    feeRate: 0.029,
    flatFee: 0.49,
    processingTime: "Instant",
    icon: "🅿️",
    countries: ["US"],
  },
  cash_app: {
    id: "cash_app",
    name: "Cash App",
    feeRate: 0.015,
    flatFee: 0,
    processingTime: "Instant",
    icon: "💲",
    countries: ["US"],
  },
  usdc: {
    id: "usdc",
    name: "USDC",
    feeRate: 0.001,
    flatFee: 0,
    processingTime: "~10 seconds (on-chain)",
    icon: "🪙",
    countries: ["*"],
  },
  usdt: {
    id: "usdt",
    name: "USDT",
    feeRate: 0.001,
    flatFee: 0,
    processingTime: "~10 seconds (on-chain)",
    icon: "🪙",
    countries: ["*"],
  },
};

const COUNTRY_CURRENCY: Record<string, string> = {
  EG: "EGP",
  SA: "SAR",
  AE: "AED",
  US: "USD",
  GB: "GBP",
  EU: "EUR",
};

const ALL_METHOD_IDS = Object.keys(METHODS) as TipMethodId[];

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the tipping methods available in the user's country.
 *
 * Always includes the global stablecoin methods (USDC, USDT) so users in
 * unsupported regions still have a way to tip.
 */
export function getTippingOptions(
  _userId: string | null,
  country: string,
): TippingOptions {
  const cc = (country || "US").toUpperCase();
  const methods = ALL_METHOD_IDS
    .filter((id) => {
      const m = METHODS[id];
      return m.countries.includes("*") || m.countries.includes(cc);
    })
    .map((id) => METHODS[id]);
  return { country: cc, methods };
}

/**
 * Returns the canonical method definition by id (or null if unknown).
 */
export function getMethod(id: string): TippingMethod | null {
  return METHODS[id as TipMethodId] ?? null;
}

/**
 * Calculates the fee + net amount for a tip of the given amount via
 * the given method. Currency defaults to USD; the caller can pass the
 * user's local currency.
 *
 * Returns null when the method is unknown or the amount is invalid.
 */
export function calculateTip(
  amount: number,
  methodId: string,
  country: string,
): TipCalculation | null {
  if (!isFinite(amount) || amount <= 0) return null;
  const method = getMethod(methodId);
  if (!method) return null;
  const currency = COUNTRY_CURRENCY[(country || "US").toUpperCase()] || "USD";
  const fee = Math.round((amount * method.feeRate + method.flatFee) * 100) / 100;
  const netAmount = Math.max(0, Math.round((amount - fee) * 100) / 100);
  return {
    amount: Math.round(amount * 100) / 100,
    fee,
    netAmount,
    currency,
    method,
    processingTime: method.processingTime,
  };
}

/**
 * Processes a tip from one user to a creator.
 *
 * In the sandbox this is a no-op on the actual payment rail — we record
 * the tip as `completed` immediately. The upgrade path is to call out
 * to the upstream processor (Fawry/Stripe/etc.) here and update the
 * row when the processor confirms.
 *
 * Throws on invalid input (unknown method, negative amount, etc.).
 */
export async function processTip(opts: {
  fromUser: string;
  toCreator: string;
  amount: number;
  method: string;
  country?: string;
  currency?: string;
  message?: string;
}): Promise<ProcessTipResult> {
  const fromUser = (opts.fromUser || "").trim().toLowerCase().replace(/^@/, "");
  const toCreator = (opts.toCreator || "").trim().toLowerCase().replace(/^@/, "");
  if (!fromUser) throw new Error("fromUser is required");
  if (!toCreator) throw new Error("toCreator is required");
  if (fromUser === toCreator) throw new Error("cannot tip yourself");
  if (!isFinite(opts.amount) || opts.amount <= 0) {
    throw new Error("amount must be > 0");
  }
  if (opts.amount > 1_000_000) {
    throw new Error("amount exceeds the per-tip cap of 1,000,000");
  }

  const country = (opts.country || "US").toUpperCase();
  const calc = calculateTip(opts.amount, opts.method, country);
  if (!calc) {
    throw new Error(`unknown tipping method: ${opts.method}`);
  }
  // Verify the method is available in the user's country.
  const options = getTippingOptions(fromUser, country);
  const available = options.methods.some((m) => m.id === opts.method);
  if (!available) {
    throw new Error(`method ${opts.method} is not available in ${country}`);
  }

  const message = opts.message ? opts.message.trim().slice(0, 280) : null;

  // Sandbox: mark as completed immediately. Real processor upgrade
  // would set status="pending" here, then a webhook would flip it.
  const row = await db.creatorTip.create({
    data: {
      fromUser,
      toCreator,
      amount: calc.amount,
      currency: opts.currency || calc.currency,
      method: opts.method,
      fee: calc.fee,
      netAmount: calc.netAmount,
      status: "completed",
      message,
    },
  });
  logger.info("[tipping] tip processed", {
    id: row.id,
    fromUser,
    toCreator,
    amount: calc.amount,
    method: opts.method,
  });

  return {
    id: row.id,
    status: row.status as ProcessTipResult["status"],
    amount: row.amount,
    fee: row.fee,
    netAmount: row.netAmount,
    currency: row.currency,
    method: row.method as TipMethodId,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Returns a creator's aggregated earnings across all tips they've
 * received.
 */
export async function getCreatorEarnings(userId: string): Promise<CreatorEarnings> {
  const creator = (userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!creator) {
    return {
      creator: "",
      totalGross: 0,
      totalNet: 0,
      totalFees: 0,
      pending: 0,
      completed: 0,
      byMethod: {},
      recentTips: [],
    };
  }

  const rows = await db.creatorTip.findMany({
    where: { toCreator: creator },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  let totalGross = 0;
  let totalNet = 0;
  let totalFees = 0;
  let pending = 0;
  let completed = 0;
  const byMethod: Record<string, { count: number; gross: number; net: number }> = {};

  for (const r of rows) {
    totalGross += r.amount;
    totalNet += r.netAmount;
    totalFees += r.fee;
    if (r.status === "pending") pending += r.amount;
    if (r.status === "completed") completed += r.amount;
    const bucket = byMethod[r.method] || { count: 0, gross: 0, net: 0 };
    bucket.count += 1;
    bucket.gross += r.amount;
    bucket.net += r.netAmount;
    byMethod[r.method] = bucket;
  }

  return {
    creator,
    totalGross: Math.round(totalGross * 100) / 100,
    totalNet: Math.round(totalNet * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    pending: Math.round(pending * 100) / 100,
    completed: Math.round(completed * 100) / 100,
    byMethod,
    recentTips: rows.slice(0, 20).map((r) => ({
      id: r.id,
      fromUser: r.fromUser,
      amount: r.amount,
      currency: r.currency,
      method: r.method as TipMethodId,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

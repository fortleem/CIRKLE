// @ts-nocheck
/**
 * Circle Pay Merchant Fees (D8).
 *
 * Business payments processed via Cirkle Pay incur a 1.5% merchant fee
 * (vs 0% for personal P2P transfers). This lib identifies whether a
 * payment is to a verified institution/merchant and computes the fee.
 *
 * Pure calculation library — no storage needed.
 */
import "server-only";

export const MERCHANT_FEE_RATE = 0.015; // 1.5%
export const MERCHANT_FEE_MIN = 0.25; // minimum $0.25
export const MERCHANT_FEE_MAX = 1000; // maximum $1000
export const MERCHANT_FEE_CAP_AMOUNT = 50_000; // cap kicks in above $50k

export interface MerchantFeeResult {
  amount: number;
  fee: number;
  netToMerchant: number;
  currency: string;
  rate: number;
  isMerchant: boolean;
}

export function isMerchantPayment(recipientHandle: string | null | undefined): boolean {
  // Convention: institution/merchant handles carry a "@<name>.cirkle" suffix
  // (vs personal "@name@cirkle"). The presence of a "." before "cirkle"
  // indicates a verified merchant. The actual verification lives in
  // `verified-badge.ts` — this is a heuristic pre-check.
  if (!recipientHandle) return false;
  const h = recipientHandle.trim().toLowerCase();
  if (!h) return false;
  // Merchants use the ".cirkle" suffix; individuals use "@cirkle".
  return h.endsWith(".cirkle") || h.includes(".merchant@") || h.includes(".biz@");
}

export function calculateMerchantFee(
  amount: number,
  recipientHandle: string | null,
  currency = "USD",
): MerchantFeeResult {
  if (!isFinite(amount) || amount < 0) {
    throw new Error("amount must be a non-negative number");
  }
  if (amount > 1_000_000) {
    throw new Error("amount exceeds the per-payment cap of 1,000,000");
  }
  const merchant = isMerchantPayment(recipientHandle);
  if (!merchant) {
    return {
      amount: Math.round(amount * 100) / 100,
      fee: 0,
      netToMerchant: Math.round(amount * 100) / 100,
      currency: (currency || "USD").toUpperCase().slice(0, 3),
      rate: 0,
      isMerchant: false,
    };
  }
  // Sliding scale: 1.5% under $50k, 1% over $50k (incentive for large merchants)
  let rate = MERCHANT_FEE_RATE;
  if (amount > MERCHANT_FEE_CAP_AMOUNT) rate = 0.01;
  const rawFee = amount * rate;
  const fee = Math.round(Math.min(Math.max(rawFee, MERCHANT_FEE_MIN), MERCHANT_FEE_MAX) * 100) / 100;
  const netToMerchant = Math.round((amount - fee) * 100) / 100;
  return {
    amount: Math.round(amount * 100) / 100,
    fee,
    netToMerchant,
    currency: (currency || "USD").toUpperCase().slice(0, 3),
    rate,
    isMerchant: true,
  };
}
